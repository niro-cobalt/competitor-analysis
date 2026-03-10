import { WebClient } from '@slack/web-api';
import connectToDatabase from '@/lib/db';
import SlackInstallation from '@/models/SlackInstallation';

export async function getSlackClient(orgId: string): Promise<WebClient | null> {
  await connectToDatabase();
  const installation = await SlackInstallation.findOne({ organizationId: orgId });
  if (!installation) return null;
  return new WebClient(installation.botToken);
}

export async function fetchChannels(orgId: string): Promise<{ id: string; name: string; isPrivate: boolean }[]> {
  const client = await getSlackClient(orgId);
  if (!client) return [];

  const channels: { id: string; name: string; isPrivate: boolean }[] = [];
  let cursor: string | undefined;

  do {
    const res = await client.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 200,
      cursor,
    });

    for (const ch of res.channels || []) {
      if (ch.id && ch.name) {
        channels.push({ id: ch.id, name: ch.name, isPrivate: !!ch.is_private });
      }
    }

    cursor = res.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return channels.sort((a, b) => a.name.localeCompare(b.name));
}

export async function sendSlackMessage(
  orgId: string,
  channelId: string,
  text: string,
  blocks?: any[]
) {
  const client = await getSlackClient(orgId);
  if (!client) throw new Error('Slack not installed for this organization');

  return client.chat.postMessage({
    channel: channelId,
    text,
    blocks,
    unfurl_links: false,
  });
}

export function buildSlackBlocks(emailData: any[]): any[] {
  const blocks: any[] = [];

  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: 'Competitor Intelligence Report', emoji: true },
  });

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: dateStr }],
  });

  blocks.push({ type: 'divider' });

  for (const item of emailData) {
    const impactEmoji = item.impactScore >= 7 ? ':red_circle:' : item.impactScore >= 4 ? ':large_orange_circle:' : ':large_green_circle:';
    const changes = item.changes && item.changes.length > 0
      ? item.changes.map((c: string) => `  - ${c}`).join('\n')
      : '_No major changes detected._';

    let section = `*${item.competitor}* ${impactEmoji} Impact: ${item.impactScore}/10\n\n${item.summary || ''}\n\n*Changes:*\n${changes}`;

    if (item.newsSummary) {
      section += `\n\n*News:* ${item.newsSummary}`;
    }

    if (item.newsItems && item.newsItems.length > 0) {
      const newsLinks = item.newsItems
        .slice(0, 3)
        .map((n: any) => typeof n === 'string' ? `  - ${n}` : `  - <${n.sourceUrl}|${n.title}>`)
        .join('\n');
      section += `\n${newsLinks}`;
    }

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: section.slice(0, 3000) },
    });

    if (item.links && item.links.length > 0) {
      const linkText = item.links
        .slice(0, 5)
        .map((l: any) => `<${l.url || l}|${l.label || l.url || l}>`)
        .join('  ');
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: linkText }],
      });
    }

    blocks.push({ type: 'divider' });
  }

  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}` : 'http://localhost:3000';
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `<${vercelUrl}/dashboard|View full dashboard>` }],
  });

  return blocks;
}
