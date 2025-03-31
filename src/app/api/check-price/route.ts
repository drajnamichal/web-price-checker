import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url, selector } = await request.json();

    if (!url || !selector) {
      return NextResponse.json(
        { error: 'URL and selector are required' },
        { status: 400 }
      );
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    const $ = cheerio.load(response.data);
    
    // Try CSS selector first
    let priceText = $(selector).text();
    console.log(`Initial price text from CSS selector: "${priceText}"`);
    
    // If no result with CSS selector, try alternative selectors
    if (!priceText) {
      console.log('No price found with CSS selector, trying data-price attribute...');
      priceText = $(selector).attr('data-price') || '';
      
      // If still no price, try some common price selectors
      if (!priceText) {
        console.log('Trying common price selectors...');
        const commonSelectors = [
          // Schema.org price attribute
          '[itemprop="price"]',
          // Common price classes
          '.price span[itemprop="price"]',
          '.final-price span[itemprop="price"]',
          '.price-table span[itemprop="price"]',
          '.price',
          '[data-price]',
          '.product-price',
          '.current-price',
          selector.replace('#', '.'),
          '.js-price',
          '#price',
          '.price-wrapper',
          '.product__price'
        ];
        
        for (const commonSelector of commonSelectors) {
          const elements = $(commonSelector);
          if (elements.length > 0) {
            // If multiple elements found, try to find the main price
            elements.each((_, element) => {
              const elementText = $(element).text() || $(element).attr('data-price') || $(element).attr('content') || '';
              const cleanedPrice = elementText.replace(/[^0-9,\.]/g, '');
              const price = cleanedPrice.includes(',') && /,\d{2}$/.test(cleanedPrice)
                ? parseFloat(cleanedPrice.replace(',', '.'))
                : parseFloat(cleanedPrice.replace(/,/g, ''));
              
              if (!isNaN(price) && (!priceText || price > parseFloat(priceText.replace(/[^0-9,\.]/g, '').replace(',', '.')))) {
                priceText = elementText;
                console.log(`Found price using common selector "${commonSelector}": "${priceText}" (${price})`);
              }
            });
            
            if (priceText) break;
          }
        }
      }
    }

    if (!priceText) {
      console.log('HTML content preview:', response.data.slice(0, 500));
      return NextResponse.json(
        { error: 'Price element not found. Please verify the selector or try a different one.' },
        { status: 404 }
      );
    }

    // Clean up the price text
    console.log(`Raw price text before cleanup: "${priceText}"`);
    const cleanPrice = priceText.replace(/[^0-9,\.]/g, '');
    console.log(`Cleaned price text: "${cleanPrice}"`);
    
    // Handle European number format (comma as decimal separator)
    const price = cleanPrice.includes(',') && /,\d{2}$/.test(cleanPrice)
      ? parseFloat(cleanPrice.replace(',', '.'))
      : parseFloat(cleanPrice.replace(/,/g, ''));
    
    if (isNaN(price)) {
      return NextResponse.json(
        { error: `Could not parse price from text: "${priceText}"` },
        { status: 400 }
      );
    }
    
    console.log(`Successfully extracted price: ${price}`);
    return NextResponse.json({ price });
  } catch (error) {
    console.error('Error checking price:', error);
    if (axios.isAxiosError(error)) {
      console.error('Network error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    return NextResponse.json(
      { error: 'Failed to check price. The website might be blocking our requests.' },
      { status: 500 }
    );
  }
} 