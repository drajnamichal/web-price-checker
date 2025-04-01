import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

function isXPath(selector: string): boolean {
  // Simple check for XPath - starts with / or //
  return selector.startsWith('/');
}

function extractPriceWithXPath($: cheerio.CheerioAPI, selector: string): string {
  try {
    // Convert HTML to string to use with XPath
    const html = $.html();
    // Use evaluate-xpath npm package if you need more complex XPath support
    // For now, we'll use a simple conversion to CSS selector for basic XPath
    const cssSelector = selector
      .replace('//', '')
      .replace(/\[@/g, '[')
      .replace(/\]/g, ']')
      .replace(/\//g, ' > ');
    
    return $(cssSelector).text().trim();
  } catch (error) {
    console.error('XPath extraction error:', error);
    return '';
  }
}

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
      let priceText = isXPath(selector) 
        ? extractPriceWithXPath($, selector)
        : $(selector).text().trim();
      
      if (!priceText) {
        // Try common price selectors if the provided one doesn't work
        const commonSelectors = [
          '[itemprop="price"]',
          '.price',
          '.product-price',
          '.current-price',
          '#price',
          '//span[@class="price"]',
          '//div[contains(@class, "price")]',
          '//span[@itemprop="price"]'
        ];
        
        for (const commonSelector of commonSelectors) {
          priceText = isXPath(commonSelector)
            ? extractPriceWithXPath($, commonSelector)
            : $(commonSelector).text().trim();
          if (priceText) break;
        }
      }

      if (!priceText) {
        return NextResponse.json(
          { error: 'Cena nebola nájdená. Prosím, overte selektor alebo XPath.' },
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