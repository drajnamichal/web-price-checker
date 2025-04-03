import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const VISITS_KEY = 'total_visits';

export async function GET() {
  try {
    // Get current visits count
    let visits = await kv.get<number>(VISITS_KEY) || 0;
    
    // Increment visits
    visits++;
    
    // Store new count
    await kv.set(VISITS_KEY, visits);
    
    return NextResponse.json({ visits });
  } catch (error) {
    console.error('Error tracking visits:', error);
    return NextResponse.json(
      { error: 'Failed to track visit' },
      { status: 500 }
    );
  }
} 