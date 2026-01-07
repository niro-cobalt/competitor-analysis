import mongoose from 'mongoose';
import connectToDatabase from '../src/lib/db';
import User from '../src/models/User';
import Settings from '../src/models/Settings';
import { createCronJob, getDailySchedule } from '../src/lib/cron-org';

const CRON_SECRET = process.env.CRON_SECRET;

async function main() {
    console.log('--- Starting Cron Backfill ---');

    if (!process.env.CRON_JOB_ORG_API_KEY) {
        console.error('❌ CRON_JOB_ORG_API_KEY not set.');
        process.exit(1);
    }

    if (!CRON_SECRET) {
        console.warn('⚠️ CRON_SECRET not set. Created jobs might be unauthorized if endpoint enforces it.');
    }

    await connectToDatabase();

    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        if (!user.organizationId) {
            console.log(`Skipping user ${user.email} (No Org ID)`);
            continue;
        }

        let settings = await Settings.findOne({ userId: user.kindeId });
        
        // If no settings, create them
        if (!settings) {
            console.log(`Creating default settings for ${user.email}...`);
            settings = await Settings.create({
                organizationId: user.organizationId,
                userId: user.kindeId,
                userEmail: user.email,
                userName: `${user.firstName} ${user.lastName}`.trim(),
                userAvatar: user.picture,
                emailFrequency: 'daily',
                emailStyle: 'informative',
                includeTldr: true
            });
        }

        // Check for cron job
        if (!settings.cronJobId) {
            console.log(`Creating cron job for ${user.email} (Org: ${user.organizationId})...`);
            try {
                const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
                
                // Construct URL with secret
                const secretParam = CRON_SECRET ? `?secret=${CRON_SECRET}` : '';
                const targetUrl = `${baseUrl}/api/cron/${user.organizationId}${secretParam}`;

                const cronJobId = await createCronJob(user.organizationId, {
                    title: `Daily Email Report`, // Naming convention? maybe just "Daily Email Report" relying on [OrgId] prefix
                    url: targetUrl,
                    schedule: getDailySchedule(9, 0)
                });

                // Update settings
                settings.cronJobId = cronJobId;
                await settings.save();
                console.log(`✅ Created job ${cronJobId} for ${user.email}`);
            } catch (err) {
                console.error(`❌ Failed to create cron for ${user.email}:`, err);
            }
        } else {
            console.log(`User ${user.email} already has cron job ${settings.cronJobId}. Skipping.`);
        }
    }

    console.log('--- Backfill Complete ---');
    process.exit(0);
}

main();
