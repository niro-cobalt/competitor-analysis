import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserOrganization } from '@/lib/utils';

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
                includeTldr: body.includeTldr !== undefined ? body.includeTldr : true
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
