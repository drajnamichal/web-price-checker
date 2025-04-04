import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    // Get visitor info from headers
    const country = request.headers.get('x-vercel-ip-country') || 'unknown';
    const city = request.headers.get('x-vercel-ip-city') || 'unknown';
    const referrer = request.headers.get('referer') || 'direct';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert visit data into Supabase
    const { error: insertError } = await supabase
      .from('visits')
      .insert({
        timestamp: new Date().toISOString(),
        referrer: referrer,
        country: country,
        city: city,
        user_agent: userAgent
      });

    if (insertError) {
      console.error('Error inserting visit:', insertError);
    }

    // Get total visit count
    const { count, error: countError } = await supabase
      .from('visits')
      .select('*', { count: 'exact' });

    if (countError) {
      throw countError;
    }

    return NextResponse.json({ visits: count });
  } catch (error) {
    console.error('Error tracking visit:', error);
    return NextResponse.json(
      { error: 'Failed to track visit' },
      { status: 500 }
    );
  }
} 