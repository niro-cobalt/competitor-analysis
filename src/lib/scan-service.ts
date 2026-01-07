import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import { scanCompetitor } from '@/lib/scanner';
import { generateEmailReport } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';
import EmailLog from '@/models/EmailLog';
import Subscriber from '@/models/Subscriber';
import pLimit from 'p-limit';

export async function runOrgScan(orgId: string) {
    await connectToDatabase();
    
    // Only fetch competitors for this org
    const competitors = await Competitor.find({ organizationId: orgId });
    
    if (competitors.length === 0) {
      return { status: 'skipped', message: 'No competitors found to scan', results: [], errors: [] };
    }

    // Limit concurrency to 1
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
    
    if (emailData.length > 0) {
        console.log("Generating email report...");
        const emailHtml = await generateEmailReport(emailData);
        console.log("Sending email...");
        
        const subject = `Competitor Update - ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        
        // Fetch subscribers FOR THIS ORG ONLY
        const subscribers = await Subscriber.find({ organizationId: orgId });
        const recipients = subscribers.map(s => s.email);

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
                 
                 emailStatus = 'processed';

                 // Avoid Resend rate limit
                 await new Promise(resolve => setTimeout(resolve, 600));
            }
        }
    }

    return { 
        status: 'completed',
        summary: `Scanned ${results.length} successfully, ${errors.length} failed. Email: ${emailStatus}`,
        results,
        errors 
    };
}
