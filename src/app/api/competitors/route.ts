import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserOrganization } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const competitors = await Competitor.find({ organizationId: orgId }).sort({ updatedAt: -1 });
    return NextResponse.json(competitors);
  } catch (error) {
    console.error('Failed to fetch competitors:', error);
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, url, linkedinUrl, twitterUrl, instructions, tags, additionalUrls } = await req.json();
    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    await connectToDatabase();
    
    let logo = '';
    try {
        const hostname = new URL(url).hostname;
        logo = `https://logo.clearbit.com/${hostname}`;
    } catch (e) {
        console.warn('Could not parse hostname for logo', e);
    }

    const competitor = await Competitor.create({ 
        name, 
        url, 
        linkedinUrl, 
        twitterUrl, 
        logo, 
        instructions,
        tags,
        additionalUrls,
        organizationId: orgId
    });
    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error('Failed to create competitor:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
