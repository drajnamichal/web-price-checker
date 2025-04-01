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

async function switchCurrency(url: string): Promise<string> {
  try {
    // First, try to get the page with EUR currency parameter
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Find the EUR currency switch link
    const eurLink = $('a:contains("EUR")').attr('href');
    
    if (eurLink) {
      // Get the base URL
      const baseUrl = new URL(url).origin;
      const fullEurLink = eurLink.startsWith('http') ? eurLink : `${baseUrl}${eurLink}`;
      
      // Make the currency switch request
      const switchResponse = await axios.get(fullEurLink, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        maxRedirects: 5,
        timeout: 10000
      });
      
      return switchResponse.data;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error switching currency:', error);
    throw error;
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
      // Switch to EUR currency and get the updated page content
      const pageContent = await switchCurrency(url);
      const $ = cheerio.load(pageContent);
      
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
          'strong:contains("€")',  // Add selector for strong elements containing €
          'strong.price',
          '.our-price strong',     // Add selector for "Naše cena" strong element
          '//strong[contains(text(), "€")]',  // XPath for strong elements with €
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
        const pricePattern = /\d+[\s,.]?\d+[\s,.]?\d+\s*€|\€\s*\d+[\s,.]?\d+[\s,.]?\d+/;
        $('*').each((_, element) => {
          const text = $(element).text().trim();
          if (pricePattern.test(text)) {
            priceText = text;
            return false; // break the loop
          }
        });
      }

      if (!priceText) {
        return NextResponse.json(
          { 
            error: 'Cena nebola nájdená. Prosím, overte selektor alebo XPath.',
            debug: { html: $.html() }
          },
          { status: 404 }
        );
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