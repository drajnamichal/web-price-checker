import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

function findProductName($: cheerio.CheerioAPI): string {
  // Common selectors for product names
  const nameSelectors = [
    'h1',
    '[itemprop="name"]',
    '.product-name',
    '.product-title',
    '#product-title',
    '.product_title',
    'title'
  ];

  for (const selector of nameSelectors) {
    const element = $(selector).first();
    if (element.length) {
      const text = element.text().trim();
      if (text && text.length > 3) { // Ensure we have a meaningful name
        return text;
      }
    }
  }

  return '';
}

function findPrice($: cheerio.CheerioAPI): { price: number; currency: 'EUR' | 'CZK' } | null {
  // Common selectors for prices
  const priceSelectors = [
    'strong:contains("Kč"), strong:contains("€")',
    '[itemprop="price"]',
    '.price',
    '.product-price',
    '.current-price',
    '#price',
    'strong.price',
    '.our-price strong',
    '.price-wrapper'
  ];

  for (const selector of priceSelectors) {
    const elements = $(selector);
    if (elements.length) {
      let foundPrice: { price: number; currency: 'EUR' | 'CZK' } | null = null;
      elements.each((_, element) => {
        if (foundPrice) return false; // Stop if we found a valid price
        const text = $(element).text().trim();
        const priceInfo = extractPriceFromText(text);
        if (priceInfo) {
          foundPrice = priceInfo;
          return false; // Stop iteration
        }
      });
      if (foundPrice) return foundPrice;
    }
  }

  // If no price found with common selectors, try to find any price-like pattern
  let bestPrice: { price: number; currency: 'EUR' | 'CZK' } | null = null;
  const pricePattern = /\d+[\s,.]?\d+[\s,.]?\d+\s*(?:Kč|€)?|\€?\s*\d+[\s,.]?\d+[\s,.]?\d+/;
  
  $('*').each((_, element) => {
    const text = $(element).text().trim();
    if (pricePattern.test(text) && !text.includes('/ ks')) {
      const priceInfo = extractPriceFromText(text);
      if (priceInfo && (!bestPrice || priceInfo.price < bestPrice.price)) {
        bestPrice = priceInfo;
      }
    }
  });

  return bestPrice;
}

function extractPriceFromText(text: string): { price: number; currency: 'EUR' | 'CZK' } | null {
  try {
    // Determine currency
    let currency: 'EUR' | 'CZK';
    if (text.includes('Kč')) {
      currency = 'CZK';
    } else if (text.includes('€')) {
      currency = 'EUR';
    } else {
      return null; // Skip if no currency found
    }

    // Clean up the price text
    const cleanPrice = text.replace(/[^0-9,\.]/g, '');
    
    // Handle European price format (1 792,61 or 1.792,61)
    let price: number;
    if (cleanPrice.includes(',') && /,\d{2}$/.test(cleanPrice)) {
      // Remove thousands separators and replace comma with dot
      price = parseFloat(cleanPrice.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
    } else {
      price = parseFloat(cleanPrice.replace(/,/g, ''));
    }

    if (!isNaN(price) && isValidPrice(price)) {
      return { price, currency };
    }
  } catch (error) {
    console.error('Error extracting price:', error);
  }
  return null;
}

function isValidPrice(price: number): boolean {
  // Prices should be reasonable - between 1 and 1,000,000
  return price > 0 && price < 1000000;
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL je povinná' },
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
      
      // Extract product name
      const name = findProductName($);
      if (!name) {
        return NextResponse.json(
          { 
            error: 'Nepodarilo sa nájsť názov produktu',
            debug: { url }
          },
          { status: 404 }
        );
      }

      // Extract price
      const priceInfo = findPrice($);
      if (!priceInfo) {
        return NextResponse.json(
          { 
            error: 'Nepodarilo sa nájsť cenu produktu',
            debug: { url, name }
          },
          { status: 404 }
        );
      }

      return NextResponse.json({ 
        name,
        price: priceInfo.price,
        currency: priceInfo.currency
      });

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