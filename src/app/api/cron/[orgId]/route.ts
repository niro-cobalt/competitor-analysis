import { NextRequest, NextResponse } from 'next/server';
import { runOrgScan } from '@/lib/scan-service';

// Keep a simple protection
const CRON_SECRET = process.env.CRON_SECRET;

// Explicitly handle GET (or POST)
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ orgId: string }> } // Params are Promises in Next.js 15+, assuming we might be on that or 14. 
  // Safety: check next.config or types. Usually in 14 it's just params object. 
  // But wait, the user's types earlier seemed standard.
  // Let's assume params is just { orgId: string } or similar.
  // Actually, 'params' as second argument is usually correct.
) {
    const { orgId } = await params; // Next.js 15+ standard, safe for 14 too if awaited usually.

    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // simple check
    if (CRON_SECRET && secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!orgId) {
        return NextResponse.json({ error: 'Missing Org ID' }, { status: 400 });
    }

    console.log(`[Cron] Triggered for org: ${orgId}`);

    try {
        const result = await runOrgScan(orgId);
        return NextResponse.json(result);
    } catch (error) {
         console.error('[Cron] Failed:', error);
         return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
