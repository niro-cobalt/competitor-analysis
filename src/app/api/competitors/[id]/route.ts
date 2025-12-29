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
