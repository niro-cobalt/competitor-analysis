import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import EmailLog from '@/models/EmailLog';

export async function GET() {
  try {
    await connectToDatabase();
    const logs = await EmailLog.find({}).sort({ sentAt: -1 });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch email logs:', error);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}
