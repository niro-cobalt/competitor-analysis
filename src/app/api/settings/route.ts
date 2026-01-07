import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserOrganization } from '@/lib/utils';
import { updateCronJob, createCronJob, getDailySchedule } from '@/lib/cron-org';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!user || !orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Find settings for this user
    let settings = await Settings.findOne({ userId: user.id });
    
    // Return default structure if not found (don't create yet, just return default)
    if (!settings) {
        return NextResponse.json({
            organizationId: orgId,
            userId: user.id,
            userEmail: user.email,
            userName: `${user.given_name} ${user.family_name}`.trim(),
            userAvatar: user.picture,
            emailFrequency: 'weekly',
            emailStyle: 'informative',
            includeTldr: true
        });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!user || !orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    await connectToDatabase();

    // Check if frequency changed or if we need to ensure cron exists
    const existingSettings = await Settings.findOne({ userId: user.id });
    
    // Only touch cron if frequency changed OR we have no cronJobId yet
    if (existingSettings && (existingSettings.emailFrequency !== body.emailFrequency || !existingSettings.cronJobId)) {
        try {
            const frequency = body.emailFrequency || existingSettings.emailFrequency || 'weekly';
            let schedule;

            // Simple mapping: 9am UTC
            // Weekly: Mondays at 9am
            // Monthly: 1st at 9am
            if (frequency === 'daily') {
                schedule = getDailySchedule(9, 0);
            } else if (frequency === 'weekly') {
                schedule = { timezone: 'UTC', hours: [9], minutes: [0], mdays: [-1], months: [-1], wdays: [1] }; // Monday
            } else if (frequency === 'monthly') {
                schedule = { timezone: 'UTC', hours: [9], minutes: [0], mdays: [1], months: [-1], wdays: [-1] }; // 1st of month
            }

            if (process.env.CRON_JOB_ORG_API_KEY) {
                if (existingSettings.cronJobId) {
                    console.log(`[Settings] Updating cron job ${existingSettings.cronJobId} to ${frequency}`);
                    await updateCronJob(orgId, existingSettings.cronJobId, { schedule });
                } else {
                    // Create if missing (legacy user)
                     const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
                     const targetUrl = `${baseUrl}/api/emails`;
                     
                     console.log(`[Settings] Creating missing cron job for ${frequency}`);
                     const newJobId = await createCronJob(orgId, {
                         title: 'Daily Email Report', // Title might need adjustment if freq changes, but keeping generic is safer or update title too
                         url: targetUrl,
                         schedule: schedule
                     });
                     
                     // We need to make sure this gets saved to the DB update below
                     // We'll return it in the update call
                     // Use a variable to merge into update
                     // But wait, the update happens below. We should likely pass it there.
                     // Let's attach it to body for now so it falls through? 
                     // No, let's explicitly add it to the $set object below.
                     // Using a local variable 'cronIdToSave'
                }
            }
        } catch (cronError) {
            console.error('[Settings] Cron update failed:', cronError);
            // Don't fail the settings save? Or do we? 
            // Better to log and continue for now.
        }
    }

    // Capture the cron ID if we created a new one? 
    // Actually, splitting the update logic is tricky because we need the ID *before* we save if we want to save it.
    // Let's refine the flow.
    
    // 1. Determine Cron ID update
    let cronJobIdToSave = undefined;
    
    if (process.env.CRON_JOB_ORG_API_KEY) {
         try {
            const frequency = body.emailFrequency || (existingSettings?.emailFrequency) || 'weekly';
            // Only act if changed or missing ID
            const frequencyChanged = existingSettings && existingSettings.emailFrequency !== frequency;
            const missingId = existingSettings && !existingSettings.cronJobId;
            
            if (frequencyChanged || missingId) {
                let schedule;
                if (frequency === 'daily') schedule = getDailySchedule(9, 0);
                else if (frequency === 'weekly') schedule = { timezone: 'UTC', hours: [9], minutes: [0], mdays: [-1], months: [-1], wdays: [1] };
                else if (frequency === 'monthly') schedule = { timezone: 'UTC', hours: [9], minutes: [0], mdays: [1], months: [-1], wdays: [-1] };

                if (existingSettings && existingSettings.cronJobId) {
                     await updateCronJob(orgId, existingSettings.cronJobId, { schedule });
                } else {
                     const vercelUrl = process.env.VERCEL_URL ? process.env.VERCEL_URL.replace(/^https?:\/\//, '') : null;
                     const baseUrl = vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000';
                     const targetUrl = `${baseUrl}/api/emails`;
                     const newJobId = await createCronJob(orgId, {
                         title: 'Daily Email Report', 
                         url: targetUrl,
                         schedule: schedule
                     });
                     cronJobIdToSave = newJobId;
                }
            }
         } catch (e) {
             console.error('Cron sync failed', e);
         }
    }

    const settings = await Settings.findOneAndUpdate(
        { userId: user.id },
        { 
            $set: { 
                organizationId: orgId,
                userId: user.id,
                userEmail: user.email,
                userName: `${user.given_name} ${user.family_name}`.trim(),
                userAvatar: user.picture,
                emailFrequency: body.emailFrequency || 'weekly',
                emailStyle: body.emailStyle || 'informative',
                includeTldr: body.includeTldr !== undefined ? body.includeTldr : true,
                ...(cronJobIdToSave ? { cronJobId: cronJobIdToSave } : {})
            } 
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ 
        error: `Failed to update settings: ${error.message}`,
        details: error 
    }, { status: 500 });
  }
}
