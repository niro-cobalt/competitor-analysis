import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Scan from '@/models/Scan';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const scans = await Scan.find({ competitorId: id }).sort({ scannedAt: -1 });
    return NextResponse.json(scans);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
  }
}
