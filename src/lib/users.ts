import User from '@/models/User';
import Settings from '@/models/Settings';
import { getUserOrganization } from '@/lib/utils';
import { createCronJob, getDailySchedule } from '@/lib/cron-org';
import connectToDatabase from '@/lib/db';

// Accept any for the generic to match what getKindeServerSession returns
export async function syncKindeUser(kindeUser: any): Promise<void> {
    if (!kindeUser) {
        console.log('[SyncUser] No user to sync.');
        return;
    }

    try {
        console.log('[SyncUser] Connecting to DB...');
        await connectToDatabase();
        console.log('[SyncUser] DB Connected.');
        
        const orgId = getUserOrganization(kindeUser);
        console.log('[SyncUser] Syncing user:', kindeUser.id, kindeUser.email, 'Org:', orgId);
        
        // Upsert user
        const result = await User.findOneAndUpdate(
            { kindeId: kindeUser.id },
            {
                $set: {
                    email: kindeUser.email,
                    firstName: kindeUser.given_name,
                    lastName: kindeUser.family_name,
                    picture: kindeUser.picture,
                    organizationId: orgId,
                    lastSeenAt: new Date()
                },
                $setOnInsert: {
                    // Any fields to set only on creation
                }
            },
            { upsert: true, new: true, lean: true }
        );
        console.log('[SyncUser] User synced successfully:', result?._id);
        
        if (!orgId) {
            console.warn('[SyncUser] No Org ID found for user, skipping settings/cron creation.');
            return;
        }

        // Check if settings exist, if not create default settings AND cron job
        const existingSettings = await Settings.findOne({ userId: kindeUser.id });
        if (!existingSettings) {
            console.log('[SyncUser] No settings found, creating defaults...');
            
            // 1. Create Cron Job
            let cronJobId: number | undefined;
            try {
                // Default: Daily at 9am UTC
                const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
                const targetUrl = `${baseUrl}/api/emails`; 
                
                console.log(`[SyncUser] Creating default cron job targeting: ${targetUrl}`);
                
                if (process.env.CRON_JOB_ORG_API_KEY) {
                    cronJobId = await createCronJob(orgId, {
                        title: 'Daily Email Report',
                        url: targetUrl,
                        schedule: getDailySchedule(9, 0)
                    });
                    console.log('[SyncUser] Cron job created:', cronJobId);
                } else {
                    console.warn('[SyncUser] CRON_JOB_ORG_API_KEY missing, skipping cron creation.');
                }

            } catch (cronError) {
                console.error('[SyncUser] Failed to create cron job:', cronError);
            }

            // 2. Create Settings
            await Settings.create({
                organizationId: orgId,
                userId: kindeUser.id as string,
                userEmail: kindeUser.email as string,
                userName: `${kindeUser.given_name} ${kindeUser.family_name}`.trim(),
                userAvatar: kindeUser.picture as string,
                emailFrequency: 'daily',
                emailStyle: 'informative',
                includeTldr: true,
                cronJobId: cronJobId
            });
            console.log('[SyncUser] Default settings created.');
        }
        
    } catch (error) {
        // Log but don't crash app flow
        console.error('[SyncUser] Failed to sync user to DB:', error);
    }
}
