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

type PriceInfo = {
  price: number;
  currency: 'EUR' | 'CZK';
  text: string;
};

function findPrice($: cheerio.CheerioAPI): { price: number; currency: 'EUR' | 'CZK' } | null {
  // First try to find the price in strong elements containing currency
  const strongPrices = $('strong').filter((_, el) => {
    const text = $(el).text().trim();
    return text.includes('Kč') || text.includes('€');
  });

  let lowestPrice: { price: number; currency: 'EUR' | 'CZK' } | null = null;

  strongPrices.each((_, el) => {
    const text = $(el).text().trim();
    const priceInfo = extractPriceFromText(text);
    if (priceInfo && priceInfo.price > 0) {
      if (!lowestPrice || priceInfo.price < lowestPrice.price) {
        lowestPrice = priceInfo;
        console.log('Found price in strong:', { text, price: priceInfo.price, currency: priceInfo.currency });
      }
    }
  });

  if (lowestPrice) {
    return lowestPrice;
  }

  // If no price found in strong elements, try other common selectors
  const priceSelectors = [
    '[itemprop="price"]',
    '.price',
    '.product-price',
    '.current-price',
    '#price',
    '.price-wrapper'
  ];

  for (const selector of priceSelectors) {
    const elements = $(selector);
    elements.each((_, el) => {
      const text = $(el).text().trim();
      const priceInfo = extractPriceFromText(text);
      if (priceInfo && priceInfo.price > 0) {
        if (!lowestPrice || priceInfo.price < lowestPrice.price) {
          lowestPrice = priceInfo;
          console.log('Found price with selector:', { selector, text, price: priceInfo.price, currency: priceInfo.currency });
        }
      }
    });
  }

  if (lowestPrice) {
    return lowestPrice;
  }

  // If still no price found, try to find any price-like pattern
  const pricePattern = /\d+[\s,.]?\d+[\s,.]?\d+\s*(?:Kč|€)?|\€?\s*\d+[\s,.]?\d+[\s,.]?\d+/;
  
  $('*').each((_, element) => {
    const text = $(element).text().trim();
    if (pricePattern.test(text) && !text.includes('/ ks') && !text.includes('od') && !text.includes('do')) {
      const priceInfo = extractPriceFromText(text);
      if (priceInfo && priceInfo.price > 0) {
        if (!lowestPrice || priceInfo.price < lowestPrice.price) {
          lowestPrice = priceInfo;
          console.log('Found price in general search:', { text, price: priceInfo.price, currency: priceInfo.currency });
        }
      }
    }
  });

  return lowestPrice;
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
    const cleanText = text.replace(/\s+/g, ' ').trim();
    // Extract numbers with optional spaces, commas, or dots
    const matches = cleanText.match(/\d+(?:[\s,.]\d+)*/);
    if (!matches) return null;
    
    const cleanPrice = matches[0].replace(/\s/g, '');
    
    // Handle European price format (1 792,61 or 1.792,61)
    let price: number;
    if (cleanPrice.includes(',')) {
      // Remove thousands separators and replace comma with dot
      price = parseFloat(cleanPrice.replace(/\./g, '').replace(',', '.'));
    } else {
      price = parseFloat(cleanPrice);
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