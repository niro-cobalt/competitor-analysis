import mongoose from 'mongoose';
import connectToDatabase from '../src/lib/db';
import User from '../src/models/User';
import Settings from '../src/models/Settings';
import { createCronJob, updateCronJob, getDailySchedule } from '../src/lib/cron-org';

const CRON_SECRET = process.env.CRON_SECRET;

async function main() {
    console.log('--- Starting Cron Backfill/Fix ---');

    // Allow passing base URL as argument (e.g. bun scripts/backfill.ts https://my-app.vercel.app)
    const args = process.argv.slice(2);
    let overrideUrl = args[0];

    // Basic validation of override URL
    if (overrideUrl && !overrideUrl.startsWith('http')) {
        console.warn('⚠️  Provided URL does not start with http/https. Assuming it is a value to be ignored or fixed.');
        // If it looks like a flag, ignore it? 
        // Let's simplified parsing: if arg provided, use it.
    }

    // Simplified Base URL Logic
    // If overrideUrl is provided, use it.
    // If not, check VERCEL_URL. VERCEL_URL usually comes WITHOUT protocol (e.g. app.vercel.app).
    
    let baseUrl = overrideUrl;
    if (!baseUrl) {
        if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
        } else {
            baseUrl = 'http://localhost:3000';
        }
    }
    
    console.log(`ℹ️  Using Base URL: ${baseUrl}`);
    
    if (baseUrl.includes('localhost') && !overrideUrl) {
         console.warn('⚠️  WARNING: Defaulting to localhost. external cron-job.org service CANNOT reach this.');
    }

    if (!process.env.CRON_JOB_ORG_API_KEY) {
        console.error('❌ CRON_JOB_ORG_API_KEY not set.');
        process.exit(1);
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

        // Construct target URL
        const secretParam = CRON_SECRET ? `?secret=${CRON_SECRET}` : '';
        const targetUrl = `${baseUrl}/api/cron/${user.organizationId}${secretParam}`;

        // Check for cron job
        if (!settings.cronJobId) {
            console.log(`Creating cron job for ${user.email} (Org: ${user.organizationId})...`);
            try {
                const cronJobId = await createCronJob(user.organizationId, {
                    title: `Daily Email Report`,
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
            console.log(`User ${user.email} has job ${settings.cronJobId}. Updating URL...`);
            try {
                 await updateCronJob(user.organizationId, settings.cronJobId, {
                     url: targetUrl,
                     // We can also ensure title is correct or other params, but URL is the main fix
                 });
                 console.log(`✅ Updated job ${settings.cronJobId} target to: ${targetUrl}`);
            } catch (err) {
                console.error(`❌ Failed to update cron ${settings.cronJobId}:`, err);
            }
        }
    }

    console.log('--- Backfill/Fix Complete ---');
    process.exit(0);
}

main();
