import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserOrganization } from '@/lib/utils';
import { runOrgScan } from '@/lib/scan-service';

// Increase max duration to 5 minutes (300 seconds)
export const maxDuration = 300; 
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    let orgId = getUserOrganization(user);

    // Fallback: Check query params if no session orgId
    if (!orgId) {
        const searchParams = req.nextUrl.searchParams;
        orgId = searchParams.get('orgId');
    }

    if (!orgId) {
        return NextResponse.json({ error: 'Unauthorized: Missing Org ID' }, { status: 401 });
    }

    const result = await runOrgScan(orgId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Bulk scan failed:', error);
    return NextResponse.json({ 
      error: `Bulk scan failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    return POST(req);
}
