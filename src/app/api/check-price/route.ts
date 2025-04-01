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
  // First try to find prices with currency symbols
  const pricePattern = /(\d+(?:[\s,.]\d+)*)\s*(?:€|Kč)/i;
  let lowestPrice: { price: number; currency: 'EUR' | 'CZK' } | null = null;

  // Helper function to process text and update lowest price
  const processText = (text: string) => {
    text = text.trim();
    if (!text) return;
    
    // Skip secondary currency in parentheses
    if (text.startsWith('(') && text.endsWith(')')) return;
    
    const match = text.match(pricePattern);
    if (!match) return;

    const priceText = match[1];
    const currency = text.includes('€') ? 'EUR' : 'CZK';
    
    // Clean and parse the price
    const cleanPrice = priceText.replace(/\s/g, '');
    let price: number;
    
    if (cleanPrice.includes(',')) {
      // Handle European format (1.809,80 or 1809,80)
      price = parseFloat(cleanPrice.replace(/\./g, '').replace(',', '.'));
    } else {
      price = parseFloat(cleanPrice);
    }

    if (!isNaN(price) && price > 0 && price < 1000000) {
      if (!lowestPrice || price < lowestPrice.price) {
        lowestPrice = { price, currency };
        console.log('Found price:', { text, price, currency });
      }
    }
  };

  // Check specific price-related elements first in priority order
  const priceSelectors = [
    '.cena',
    '[id^="variant_price"]',
    '[itemprop="price"]',
    '.product-price',
    '.current-price',
    '.price',
    'strong',
    'h2',
    'span:not(.secmena)' // Exclude secondary currency spans
  ];

  // First try exact price elements
  for (const selector of priceSelectors) {
    const elements = $(selector);
    if (elements.length) {
      elements.each((_, el) => {
        const element = $(el);
        // Skip if this is a container with multiple prices
        if (element.find('.price, .cena, [itemprop="price"]').length > 0) return;
        
        const text = element.text();
        processText(text);
      });
      
      // If we found a price in a primary price element, return it
      if (lowestPrice) {
        return lowestPrice;
      }
    }
  }

  // If still no price found, try broader search but exclude secondary currency spans
  if (!lowestPrice) {
    $('*').each((_, el) => {
      const element = $(el);
      if (element.hasClass('secmena')) return; // Skip secondary currency elements
      
      const text = element.text();
      if (text.includes('€') || text.includes('Kč')) {
        processText(text);
      }
    });
  }

  return lowestPrice;
}

function isValidPrice(price: number): boolean {
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