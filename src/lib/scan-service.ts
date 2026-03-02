import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import { scanCompetitor } from '@/lib/scanner';
import { generateEmailReport } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';
import EmailLog from '@/models/EmailLog';
import Subscriber from '@/models/Subscriber';
import SlackInstallation from '@/models/SlackInstallation';
import Settings from '@/models/Settings';
import { buildSlackBlocks, sendSlackMessage } from '@/lib/slack';
import pLimit from 'p-limit';

export async function runOrgScan(orgId: string) {
    await connectToDatabase();
    
    // Only fetch competitors for this org
    const competitors = await Competitor.find({ organizationId: orgId });
    
    if (competitors.length === 0) {
      return { status: 'skipped', message: 'No competitors found to scan', results: [], errors: [] };
    }

    const limit = pLimit(3);
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
    let slackStatus = 'skipped';

    if (emailData.length > 0) {
        console.log("Generating email report...");
        const emailHtml = await generateEmailReport(emailData);
        console.log("Sending email...");
        
        const changedCount = emailData.filter(d => d.changes && d.changes.length > 0).length;
        const totalCount = emailData.length;
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const subject = changedCount > 0
            ? `Competitor Intel: ${changedCount} of ${totalCount} competitors had updates — ${dateStr}`
            : `Competitor Intel: No major changes detected — ${dateStr}`;
        
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

        // Send to Slack channels
        try {
            const slackInstall = await SlackInstallation.findOne({ organizationId: orgId });
            if (slackInstall) {
                const settingsWithSlack = await Settings.find({
                    organizationId: orgId,
                    slackChannelId: { $ne: null, $exists: true },
                });

                // Deduplicate channels
                const channelMap = new Map<string, string>();
                for (const s of settingsWithSlack) {
                    if (s.slackChannelId) {
                        channelMap.set(s.slackChannelId, s.slackChannelName || s.slackChannelId);
                    }
                }

                if (channelMap.size > 0) {
                    const blocks = buildSlackBlocks(emailData);
                    const fallbackText = `Competitor Intelligence Report: ${emailData.length} competitors scanned`;

                    for (const [channelId] of channelMap) {
                        try {
                            await sendSlackMessage(orgId, channelId, fallbackText, blocks);
                            slackStatus = 'sent';
                        } catch (slackErr) {
                            console.error(`Failed to send Slack message to ${channelId}:`, slackErr);
                            slackStatus = 'partial';
                        }
                    }
                }
            }
        } catch (slackErr) {
            console.error('Slack delivery failed:', slackErr);
            slackStatus = 'failed';
        }
    }

    return {
        status: 'completed',
        summary: `Scanned ${results.length} successfully, ${errors.length} failed. Email: ${emailStatus}. Slack: ${slackStatus}`,
        results,
        errors
    };
}
