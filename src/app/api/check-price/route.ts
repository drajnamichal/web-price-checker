import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

function isXPath(selector: string): boolean {
  // XPath can start with /, //, or (
  return selector.startsWith('/') || selector.startsWith('(');
}

function extractPriceWithXPath($: cheerio.CheerioAPI, selector: string): string {
  try {
    // Convert HTML to string to use with XPath
    const html = $.html();
    
    // Handle different XPath patterns
    let cssSelector = selector;
    
    // Handle indexed XPath expressions
    if (selector.includes(')[')) {
      cssSelector = selector
        .replace(/\)\[(\d+)\]/g, ':eq($1-1)'); // Convert [n] to :eq(n-1) for 1-based to 0-based indexing
    }
    
    // Basic XPath to CSS conversion
    cssSelector = cssSelector
      .replace(/^\(\/\/|\(\/|\/\/|\/|\)$/g, '') // Remove XPath prefixes and trailing parenthesis
      .replace(/\[@/g, '[')
      .replace(/\]/g, ']')
      .replace(/\//g, ' > ');
    
    const result = $(cssSelector).text().trim();
    console.log('XPath conversion:', { original: selector, converted: cssSelector, result });
    return result;
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
          'strong:contains("Kč"), strong:contains("€")',  // Look for price in strong elements
          '[itemprop="price"]',
          '.price',
          '.product-price',
          '.current-price',
          '#price',
          'strong.price',
          '.our-price strong',
          '//strong[contains(text(), "Kč") or contains(text(), "€")]',
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
        // Try to find any element containing a price-like pattern
        const pricePattern = /\d+[\s,.]?\d+[\s,.]?\d+\s*(?:Kč|€)?|\€?\s*\d+[\s,.]?\d+[\s,.]?\d+/;
        $('*').each((_, element) => {
          const text = $(element).text().trim();
          if (pricePattern.test(text) && !text.includes('/ ks')) {
            priceText = text;
            return false; // break the loop
          }
        });
      }

      if (!priceText) {
        return NextResponse.json(
          { 
            error: 'Cena nebola nájdená. Prosím, overte selektor alebo XPath.',
            debug: { selector, html: $.html() }
          },
          { status: 404 }
        );
      }

      // Determine currency based on text or amount
      let currency: 'EUR' | 'CZK';
      if (priceText.includes('Kč')) {
        currency = 'CZK';
      } else if (priceText.includes('€')) {
        currency = 'EUR';
      } else {
        // Clean up the price text and convert to number first
        const cleanPrice = priceText.replace(/[^0-9,\.]/g, '');
        
        // Handle European price format (1 792,61 or 1.792,61)
        let price: number;
        if (cleanPrice.includes(',') && /,\d{2}$/.test(cleanPrice)) {
          // Remove thousands separators and replace comma with dot
          price = parseFloat(cleanPrice.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
        } else {
          price = parseFloat(cleanPrice.replace(/,/g, ''));
        }

        // Determine currency based on amount
        currency = price < 2000 ? 'EUR' : 'CZK';
        console.log('No currency symbol found, determined currency based on amount:', { price, currency });
      }
      
      // Clean up the price text and convert to number
      const cleanPrice = priceText.replace(/[^0-9,\.]/g, '');
      
      // Handle European price format (1 792,61 or 1.792,61)
      let price: number;
      if (cleanPrice.includes(',') && /,\d{2}$/.test(cleanPrice)) {
        // Remove thousands separators and replace comma with dot
        price = parseFloat(cleanPrice.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
      } else {
        price = parseFloat(cleanPrice.replace(/,/g, ''));
      }

      if (isNaN(price)) {
        return NextResponse.json(
          { 
            error: `Nepodarilo sa spracovať cenu z textu: "${priceText}"`,
            debug: { priceText, cleanPrice }
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ price, currency });
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