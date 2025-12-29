import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import { scanCompetitor } from '@/lib/scanner';

export async function POST() {
  try {
    await connectToDatabase();
    const competitors = await Competitor.find({});
    
    if (competitors.length === 0) {
      return NextResponse.json({ message: 'No competitors found to scan' });
    }

    const results = [];
    const errors = [];

    // Process sequentially to avoid overwhelming Puppeteer/Browser resources
    // or run in limited parallel batches if needed. Sequential is safer for now.
    for (const competitor of competitors) {
      try {
        console.log(`Starting scan for ${competitor.name}...`);
        const result = await scanCompetitor(competitor._id.toString());
        results.push({ competitor: competitor.name, status: 'success', scanId: result._id });
      } catch (err) {
        console.error(`Failed to scan ${competitor.name}:`, err);
        errors.push({ competitor: competitor.name, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return NextResponse.json({ 
      summary: `Scanned ${results.length} successfully, ${errors.length} failed.`,
      results,
      errors 
    });

  } catch (error) {
    console.error('Bulk scan failed:', error);
    return NextResponse.json({ 
      error: `Bulk scan failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
