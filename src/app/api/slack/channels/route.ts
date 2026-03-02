import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { getUserOrganization } from '@/lib/utils';
import { fetchChannels } from '@/lib/slack';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!user || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channels = await fetchChannels(orgId);
    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Failed to fetch Slack channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}
