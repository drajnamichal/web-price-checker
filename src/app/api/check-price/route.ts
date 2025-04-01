import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url, selector } = await request.json();

    if (!url || !selector) {
      return NextResponse.json(
        { error: 'URL a selektor sú povinné' },
        { status: 400 }
      );
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      let priceText = $(selector).text().trim();
      
      if (!priceText) {
        // Try common price selectors if the provided one doesn't work
        const commonSelectors = [
          '[itemprop="price"]',
          '.price',
          '.product-price',
          '.current-price',
          '#price'
        ];
        
        for (const commonSelector of commonSelectors) {
          priceText = $(commonSelector).text().trim();
          if (priceText) break;
        }
      }

      if (!priceText) {
        return NextResponse.json(
          { error: 'Cena nebola nájdená. Prosím, overte selektor.' },
          { status: 404 }
        );
      }

      // Clean up the price text and convert to number
      const cleanPrice = priceText.replace(/[^0-9,\.]/g, '');
      const price = cleanPrice.includes(',') && /,\d{2}$/.test(cleanPrice)
        ? parseFloat(cleanPrice.replace(',', '.'))
        : parseFloat(cleanPrice.replace(/,/g, ''));

      if (isNaN(price)) {
        return NextResponse.json(
          { error: `Nepodarilo sa spracovať cenu z textu: "${priceText}"` },
          { status: 400 }
        );
      }

      return NextResponse.json({ price });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return NextResponse.json(
            { error: 'Vypršal časový limit požiadavky. Webová stránka môže byť pomalá alebo blokuje naše požiadavky.' },
            { status: 408 }
          );
        }
        return NextResponse.json(
          { error: 'Nepodarilo sa načítať webovú stránku. Stránka môže blokovať naše požiadavky.' },
          { status: error.response?.status || 500 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa spracovať požiadavku.' },
      { status: 500 }
    );
  }
} 