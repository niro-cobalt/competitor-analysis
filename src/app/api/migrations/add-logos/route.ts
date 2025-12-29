import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';

export async function GET() {
  try {
    await connectToDatabase();
    const competitors = await Competitor.find({ logo: { $exists: false } });
    
    let updatedCount = 0;
    
    for (const comp of competitors) {
        try {
            const hostname = new URL(comp.url).hostname;
            comp.logo = `https://logo.clearbit.com/${hostname}`;
            await comp.save();
            updatedCount++;
        } catch (e) {
            console.warn(`Skipping ${comp.name} - invalid URL`, e);
        }
    }

    return NextResponse.json({ message: `Backfilled logos for ${updatedCount} competitors.` });

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ 
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
