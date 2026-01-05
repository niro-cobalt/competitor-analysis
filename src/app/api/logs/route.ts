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
      .populate('competitorId', 'name');

    const logs = scans.map((scan: any) => ({
        _id: scan._id,
        competitorName: scan.competitorId ? scan.competitorId.name : 'Unknown Competitor',
        status: scan.status || 'success', // Backfill default
        scannedAt: scan.scannedAt,
        durationMs: scan.durationMs || 0,
        changesDetected: scan.changesDetected ? scan.changesDetected.length : 0,
        error: scan.error
    }));

    return NextResponse.json(logs);

  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json({ 
      error: `Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
