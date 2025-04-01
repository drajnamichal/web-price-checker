import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';

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
  // First try the main product price element
  const mainPriceElement = $('.cena[id^="variant_price"]');
  if (mainPriceElement.length) {
    const text = mainPriceElement.contents().first().text().trim();
    if (text) {
      const match = text.match(/(\d+(?:[\s,.]\d+)*)\s*(?:€|Kč)/);
      if (match) {
        const priceText = match[1];
        const currency = text.includes('€') ? 'EUR' : 'CZK';
        const cleanPrice = priceText.replace(/\s/g, '');
        let price: number;
        
        if (cleanPrice.includes(',')) {
          price = parseFloat(cleanPrice.replace(/\./g, '').replace(',', '.'));
        } else {
          price = parseFloat(cleanPrice);
        }

        if (!isNaN(price) && price > 0 && price < 1000000) {
          console.log('Found main price:', { text, price, currency });
          return { price, currency };
        }
      }
    }
  }

  // Fallback to other price elements only if main price not found
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
    
    const cleanPrice = priceText.replace(/\s/g, '');
    let price: number;
    
    if (cleanPrice.includes(',')) {
      price = parseFloat(cleanPrice.replace(/\./g, '').replace(',', '.'));
    } else {
      price = parseFloat(cleanPrice);
    }

    if (!isNaN(price) && price > 0 && price < 1000000) {
      if (!lowestPrice || price < lowestPrice.price) {
        lowestPrice = { price, currency };
        console.log('Found fallback price:', { text, price, currency });
      }
    }
  };

  // Only check other elements if main price was not found
  const priceSelectors = [
    '[itemprop="price"]',
    '.product-price',
    '.current-price',
    '.price',
    'strong',
    'span:not(.secmena)'
  ];

  for (const selector of priceSelectors) {
    $(selector).each((_, el) => {
      const element = $(el);
      if (element.find('.price, [itemprop="price"]').length > 0) return;
      const text = element.text();
      processText(text);
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

      const now = new Date().toISOString();
      const product: Product = {
        id: uuidv4(),
        name,
        url,
        price: priceInfo.price,
        currency: priceInfo.currency,
        lastChecked: now,
        priceHistory: [
          { price: priceInfo.price, date: now }
        ],
        createdAt: now
      };

      // Save to KV store
      await kv.set(`product:${product.id}`, JSON.stringify(product));

      return NextResponse.json(product);

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