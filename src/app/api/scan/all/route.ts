import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import { scanCompetitor } from '@/lib/scanner';
import { generateEmailReport } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';
import EmailLog from '@/models/EmailLog';
import pLimit from 'p-limit';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserOrganization } from '@/lib/utils';

// Increase max duration to 5 minutes (300 seconds)
export const maxDuration = 300; 
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Only fetch competitors for this org
    const competitors = await Competitor.find({ organizationId: orgId });
    
    if (competitors.length === 0) {
      return NextResponse.json({ message: 'No competitors found to scan' });
    }

    // Limit concurrency to 1 to avoid ETXTBSY errors with Puppeteer binary download
    // This effectively makes it sequential but cleaner than a for loop refactor
    const limit = pLimit(1);

    const emailData: any[] = [];
    
    // Create promises for all scans
    const scanPromises = competitors.map(competitor => 
        limit(async () => {
            try {
                console.log(`Starting scan for ${competitor.name}...`);
                const result = await scanCompetitor(competitor._id.toString());
                
                // Add to email data safely
                emailData.push({
                    competitor: competitor.name,
                    summary: result.summary,
                    changes: result.changesDetected || [],
                    impactScore: result.impactScore || 0,
                    newsSummary: result.newsSummary,
                    newsItems: result.newsItems,
                    links: result.links || []
                });

                return { competitor: competitor.name, status: 'success', scanId: result._id };
            } catch (err) {
                console.error(`Failed to scan ${competitor.name}:`, err);
                return { competitor: competitor.name, status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' };
            }
        })
    );

    // Wait for all to complete
    const scanResults = await Promise.all(scanPromises);
    
    const results = scanResults.filter(r => r.status === 'success');
    const errors = scanResults.filter(r => r.status === 'failed');

    let emailStatus = 'skipped';
    
    // Always log sending attempt if there were results, even without changes if that fits use case.
    // Here we only send if we scanned something successfully.
    if (emailData.length > 0) {
        console.log("Generating email report...");
        const emailHtml = await generateEmailReport(emailData);
        console.log("Sending email...");
        
        const subject = `Competitor Update - ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        
        // Fetch subscribers FOR THIS ORG ONLY
        const Subscriber = (await import('@/models/Subscriber')).default;
        const subscribers = await Subscriber.find({ organizationId: orgId });
        
        const recipients = subscribers.map(s => s.email);
        
        // Fallback to Env var if LIST IS EMPTY but ONLY IF ENV VAR IS RELEVANT (Usually strictly test env behavior)
        // In multi-tenancy we might disable this or strictly check if env email belongs to org.
        // For safety, let's only send to DB subscribers to prevent cross-leakage.
        // if (process.env.EMAIL_TO && !recipients.includes(process.env.EMAIL_TO)) {
        //     recipients.push(process.env.EMAIL_TO);
        // }

        if (recipients.length === 0) {
             console.log("No subscribers to send to.");
        } else {
            console.log(`Sending to ${recipients.length} recipients...`);
            
            for (const recipient of recipients) {
                 const emailRes = await sendEmail(recipient, subject, emailHtml);
                 
                 // Log to DB with Org ID
                  await EmailLog.create({
                    subject: subject,
                    recipient: recipient,
                    content: emailHtml,
                    structuredData: emailData,
                    status: emailRes.success ? 'sent' : 'failed',
                    error: emailRes.error ? String(emailRes.error) : undefined,
                    organizationId: orgId
                 });
                 
                 // Update global status just to indicate activity
                 emailStatus = 'processed';

                 // Avoid Resend rate limit (2 req/sec)
                 await new Promise(resolve => setTimeout(resolve, 600));
            }
        }
    }

    return NextResponse.json({ 
      summary: `Scanned ${results.length} successfully, ${errors.length} failed. Email: ${emailStatus}`,
      results,
      errors 
    });

  } catch (error) {
    console.error('Bulk scan failed:', error);
    return NextResponse.json({ 
      error: `Bulk scan failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

export async function GET() {
    return POST();
}
