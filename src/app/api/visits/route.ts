import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const VISITS_KEY = 'total_visits';

export async function GET() {
  try {
    // Get current visits count
    let visits = await kv.get<number>(VISITS_KEY);
    
    // Initialize if not exists
    if (typeof visits !== 'number') {
      visits = 0;
    }
    
    // Increment visits
    visits++;
    
    // Store new count
    await kv.set(VISITS_KEY, visits);
    
    // Log for debugging
    console.log('Current visits count:', visits);
    
    return NextResponse.json({ visits });
  } catch (error) {
    console.error('Error tracking visits:', error);
    return NextResponse.json(
      { error: 'Failed to track visit', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 