import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import { scanCompetitor } from '@/lib/scanner';
import { generateEmailReport } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';
import EmailLog from '@/models/EmailLog';
import pLimit from 'p-limit';

export async function POST() {
  try {
    await connectToDatabase();
    const competitors = await Competitor.find({});
    
    if (competitors.length === 0) {
      return NextResponse.json({ message: 'No competitors found to scan' });
    }

    // Limit concurrency to 5
    const limit = pLimit(5);

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
                    impactScore: result.impactScore || 0
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
        
        const subject = `Competitor Update - ${new Date().toLocaleDateString()}`;
        const emailRes = await sendEmail(subject, emailHtml);
        
        emailStatus = emailRes.success ? 'sent' : 'failed';

        // Log to DB
        await EmailLog.create({
            subject: subject,
            recipient: process.env.EMAIL_TO || 'unknown',
            content: emailHtml,
            status: emailStatus,
            error: emailRes.error ? String(emailRes.error) : undefined
        });
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
