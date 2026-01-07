
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import CompetitorSummary from '@/models/CompetitorSummary';
import Scan from '@/models/Scan';
import { generateWeeklyReport } from '@/lib/gemini';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserOrganization } from '@/lib/utils';
import { startOfWeek, endOfWeek, subDays } from 'date-fns';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!user || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch the latest summary
    const latestSummary = await CompetitorSummary.findOne({ 
        competitorId: id as any,
        organizationId: orgId
    }).sort({ createdAt: -1 });

    return NextResponse.json(latestSummary || { summary: null });

  } catch (error) {
    console.error('Failed to fetch summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!user || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Calculate dates: Last 7 days
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    // Fetch scans for the last 7 days
    const scans = await Scan.find({
        competitorId: id,
        createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: 1 });

    if (!scans || scans.length === 0) {
        return NextResponse.json({ message: 'No scans found for the period' });
    }

    // Fetch user settings to customize the report
    const settings = await import('@/models/Settings').then(m => m.default.findOne({ userId: user.id }));
    const style = settings?.emailStyle || 'informative';
    const includeTldr = settings?.includeTldr !== undefined ? settings.includeTldr : true;

    // Generate summary with user preferences
    const summaryText = await generateWeeklyReport(
        scans.map((s: any) => ({
            summary: s.summary,
            changes: s.changes,
            date: s.createdAt
        })),
        { style, includeTldr }
    );

    // Save summary
    const newSummary = await CompetitorSummary.create({
        competitorId: id as any,
        organizationId: orgId,
        summary: summaryText,
        weekStart: sevenDaysAgo,
        weekEnd: now
    });

    return NextResponse.json(newSummary);

  } catch (error) {
    console.error('Failed to generate summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
