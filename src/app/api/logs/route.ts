import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Scan from '@/models/Scan';
import Competitor from '@/models/Competitor'; // Ensure model is registered

export async function GET() {
  try {
    await connectToDatabase();
    
    // Sort by newest first
    const scans = await Scan.find({})
      .sort({ createdAt: -1 })
      .populate('competitorId', 'name url'); // Populate competitor details

    return NextResponse.json(scans);

  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json({ 
      error: `Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
