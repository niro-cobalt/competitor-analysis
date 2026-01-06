import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import Subscriber from '@/models/Subscriber';
import EmailLog from '@/models/EmailLog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Default organization for backfilling
    const TARGET_ORG = 'toqen';

    // 1. Update Competitors
    // We use updateMany to find docs where organizationId is missing or null
    // Note: organizationId is required now, but old docs won't have it.
    // However, Mongoose might enforce schema on save, but updateMany bypasses validaton unless runValidators: true.
    // For raw query, we look for { organizationId: { $exists: false } }
    
    const competitorsResult = await Competitor.updateMany(
        { organizationId: { $exists: false } },
        { $set: { organizationId: TARGET_ORG } }
    );

    // 2. Update Subscribers
    const subscribersResult = await Subscriber.updateMany(
        { organizationId: { $exists: false } },
        { $set: { organizationId: TARGET_ORG } }
    );

    // 3. Update EmailLogs
    const emailLogsResult = await EmailLog.updateMany(
        { organizationId: { $exists: false } },
        { $set: { organizationId: TARGET_ORG } }
    );

    return NextResponse.json({
        message: 'Migration completed successfully',
        results: {
            organizationAssigned: TARGET_ORG,
            competitorsUpdated: competitorsResult.modifiedCount,
            subscribersUpdated: subscribersResult.modifiedCount,
            emailLogsUpdated: emailLogsResult.modifiedCount
        }
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ 
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
