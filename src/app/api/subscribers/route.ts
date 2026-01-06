import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Subscriber from '@/models/Subscriber';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserOrganization } from '@/lib/utils';

export async function GET() {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const subscribers = await Subscriber.find({ organizationId: orgId }).sort({ createdAt: -1 });
    return NextResponse.json(subscribers);
  } catch (error) {
    console.error('Failed to fetch subscribers:', error);
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Check if exists in this org
    const existing = await Subscriber.findOne({ email, organizationId: orgId });
    if (existing) {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 200 });
    }

    const subscriber = await Subscriber.create({ email, organizationId: orgId });
    return NextResponse.json(subscriber, { status: 201 });

  } catch (error) {
    console.error('Failed to add subscriber:', error);
    return NextResponse.json({ error: 'Failed to add subscriber' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const orgId = getUserOrganization(user);

    if (!orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectToDatabase();
    await Subscriber.deleteOne({ email, organizationId: orgId });
    
    return NextResponse.json({ message: 'Subscriber removed' });
  } catch (error) {
    console.error('Failed to remove subscriber:', error);
    return NextResponse.json({ error: 'Failed to remove subscriber' }, { status: 500 });
  }
}
