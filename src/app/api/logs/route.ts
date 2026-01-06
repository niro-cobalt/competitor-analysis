import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Scan from '@/models/Scan';
import Competitor from '@/models/Competitor'; // Ensure model is registered
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
    
    // 1. Find all competitors for this org
    const orgCompetitors = await Competitor.find({ organizationId: orgId }).select('_id');
    const competitorIds = orgCompetitors.map(c => c._id);

    // 2. Find scans only for these competitors
    const scans = await Scan.find({ competitorId: { $in: competitorIds } })
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
