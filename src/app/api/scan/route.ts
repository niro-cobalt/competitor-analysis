import { NextResponse } from 'next/server';
import { scanCompetitor } from '@/lib/scanner';

export async function POST(req: Request) {
  try {
    const { competitorId } = await req.json();
    if (!competitorId) {
      return NextResponse.json({ error: 'Competitor ID is required' }, { status: 400 });
    }

    const newScan = await scanCompetitor(competitorId);
    return NextResponse.json(newScan);

  } catch (error) {
    console.error('Scan failed:', error);
    return NextResponse.json({ 
      error: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
