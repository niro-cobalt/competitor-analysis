import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Subscriber from '@/models/Subscriber';

export async function GET() {
  try {
    await connectToDatabase();
    const subscribers = await Subscriber.find({}).sort({ createdAt: -1 });
    return NextResponse.json(subscribers);
  } catch (error) {
    console.error('Failed to fetch subscribers:', error);
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Check if exists
    const existing = await Subscriber.findOne({ email });
    if (existing) {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 200 });
    }

    const subscriber = await Subscriber.create({ email });
    return NextResponse.json(subscriber, { status: 201 });

  } catch (error) {
    console.error('Failed to add subscriber:', error);
    return NextResponse.json({ error: 'Failed to add subscriber' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectToDatabase();
    await Subscriber.deleteOne({ email });
    
    return NextResponse.json({ message: 'Subscriber removed' });
  } catch (error) {
    console.error('Failed to remove subscriber:', error);
    return NextResponse.json({ error: 'Failed to remove subscriber' }, { status: 500 });
  }
}
