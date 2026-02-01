import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import EmailLog from '@/models/EmailLog';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserOrganization } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    let orgId = getUserOrganization(user);

    // Fallback: Check query params if no session orgId
    if (!orgId) {
        const searchParams = req.nextUrl.searchParams;
        orgId = searchParams.get('orgId');
    }

    await connectToDatabase();
    
    // If orgId exists, filter by it. Otherwise, return all logs (Public Access)
    const query = orgId ? { organizationId: orgId } : {};
    
    const logs = await EmailLog.find(query).sort({ sentAt: -1 });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch email logs:', error);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}
