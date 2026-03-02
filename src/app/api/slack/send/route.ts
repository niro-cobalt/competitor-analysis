import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { getUserOrganization } from '@/lib/utils';
import connectToDatabase from '@/lib/db';
import EmailLog from '@/models/EmailLog';
import Settings from '@/models/Settings';
import { buildSlackBlocks, sendSlackMessage } from '@/lib/slack';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!user || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get the user's configured Slack channel
    const settings = await Settings.findOne({ userId: user.id });
    if (!settings?.slackChannelId) {
      return NextResponse.json(
        { error: 'No Slack channel configured. Go to Settings to pick a channel.' },
        { status: 400 }
      );
    }

    // Fetch the latest successful email log for this org (it has structuredData)
    const latestLog = await EmailLog.findOne({
      organizationId: orgId,
      status: 'sent',
      structuredData: { $exists: true, $ne: null },
    }).sort({ sentAt: -1 });

    if (!latestLog?.structuredData || latestLog.structuredData.length === 0) {
      return NextResponse.json(
        { error: 'No recent report found. Run a scan first.' },
        { status: 404 }
      );
    }

    const blocks = buildSlackBlocks(latestLog.structuredData);
    const fallbackText = `Competitor Intelligence Report: ${latestLog.structuredData.length} competitors`;

    await sendSlackMessage(orgId, settings.slackChannelId, fallbackText, blocks);

    return NextResponse.json({ success: true, channel: settings.slackChannelName || settings.slackChannelId });
  } catch (error: any) {
    console.error('Slack send failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send to Slack' },
      { status: 500 }
    );
  }
}
