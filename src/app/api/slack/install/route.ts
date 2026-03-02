import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { getUserOrganization } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!user || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'Slack integration not configured' }, { status: 500 });
    }

    const baseUrl = process.env.APP_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}` : null)
      || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/slack/callback`;

    const state = Buffer.from(
      JSON.stringify({ orgId, userId: user.id, userEmail: user.email })
    ).toString('base64url');

    const scopes = 'chat:write,channels:read,groups:read,chat:write.public';

    const slackUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackUrl.searchParams.set('client_id', clientId);
    slackUrl.searchParams.set('scope', scopes);
    slackUrl.searchParams.set('redirect_uri', redirectUri);
    slackUrl.searchParams.set('state', state);

    return NextResponse.redirect(slackUrl.toString());
  } catch (error) {
    console.error('Slack install error:', error);
    return NextResponse.json({ error: 'Failed to start Slack install' }, { status: 500 });
  }
}
