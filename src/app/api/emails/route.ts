import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import EmailLog from '@/models/EmailLog';
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
    // Filter by organizationId
    const logs = await EmailLog.find({ organizationId: orgId }).sort({ sentAt: -1 });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch email logs:', error);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}
