import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const competitor = await Competitor.findById(id);
    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }
    return NextResponse.json(competitor);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch competitor' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    // console.log("PATCH Body:", JSON.stringify(body));
    
    // Whitelist allowed fields for update
    const { name, url, linkedinUrl, twitterUrl, instructions, tags, additionalUrls } = body;
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;
    if (twitterUrl !== undefined) updateData.twitterUrl = twitterUrl;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (tags !== undefined) updateData.tags = tags;
    if (additionalUrls !== undefined) updateData.additionalUrls = additionalUrls;

    await connectToDatabase();
    
    // If URL changes, maybe update logo? skipping for simplicity/safety to avoid overwriting custom logos if any, 
    // unless explicit logo update logic is desired. For now just update fields.

    const competitor = await Competitor.findByIdAndUpdate(
        id, 
        { $set: updateData },
        { new: true } // return updated doc
    );

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    return NextResponse.json(competitor);
  } catch (error) {
    console.error("Update failed", error);
    return NextResponse.json({ error: 'Failed to update competitor' }, { status: 500 });
  }
}
