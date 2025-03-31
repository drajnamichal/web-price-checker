import { NextResponse } from 'next/server';
import { checkPrice } from '@/utils/priceChecker';

export async function POST(request: Request) {
  try {
    const { url, selector } = await request.json();
    
    if (!url || !selector) {
      return NextResponse.json(
        { error: 'URL and selector are required' },
        { status: 400 }
      );
    }

    const price = await checkPrice(url, selector);
    return NextResponse.json({ price });
  } catch (error) {
    console.error('Error checking price:', error);
    return NextResponse.json(
      { error: 'Failed to check price' },
      { status: 500 }
    );
  }
} 