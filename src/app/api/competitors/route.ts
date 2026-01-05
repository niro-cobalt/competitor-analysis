import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const competitors = await Competitor.find({}).sort({ updatedAt: -1 });
    return NextResponse.json(competitors);
  } catch (error) {
    console.error('Failed to fetch competitors:', error);
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, url, linkedinUrl, twitterUrl, instructions } = await req.json();
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

    const competitor = await Competitor.create({ name, url, linkedinUrl, twitterUrl, logo, instructions });
    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error('Failed to create competitor:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
