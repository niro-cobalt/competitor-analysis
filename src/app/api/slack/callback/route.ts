import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import SlackInstallation from '@/models/SlackInstallation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`
    : 'http://localhost:3000';

  if (error) {
    console.error('Slack OAuth error:', error);
    return NextResponse.redirect(`${vercelUrl}/settings?slack=error`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${vercelUrl}/settings?slack=error`);
  }

  let state: { orgId: string; userId: string; userEmail: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return NextResponse.redirect(`${vercelUrl}/settings?slack=error`);
  }

  try {
    const redirectUri = `${vercelUrl}/api/slack/callback`;

    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      console.error('Slack token exchange failed:', tokenData.error);
      return NextResponse.redirect(`${vercelUrl}/settings?slack=error`);
    }

    await connectToDatabase();

    await SlackInstallation.findOneAndUpdate(
      { organizationId: state.orgId },
      {
        $set: {
          organizationId: state.orgId,
          teamId: tokenData.team?.id || '',
          teamName: tokenData.team?.name || '',
          botToken: tokenData.access_token,
          botUserId: tokenData.bot_user_id || '',
          installedBy: state.userId,
          installedByEmail: state.userEmail,
          installedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(`${vercelUrl}/settings?slack=connected`);
  } catch (err) {
    console.error('Slack callback error:', err);
    return NextResponse.redirect(`${vercelUrl}/settings?slack=error`);
  }
}
