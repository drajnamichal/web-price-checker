import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '@/types/product';

export async function checkPrice(url: string, selector: string): Promise<number> {
  try {
    console.log(`Fetching price from URL: ${url} with selector: ${selector}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
          '.price',
          '[data-price]',
          '[itemprop="price"]',
          '.product-price',
          '.current-price',
          selector.replace('#', '.'), // Try class instead of id
        ];
        
        for (const commonSelector of commonSelectors) {
          const element = $(commonSelector);
          if (element.length > 0) {
            priceText = element.text() || element.attr('data-price') || '';
            if (priceText) {
              console.log(`Found price using common selector "${commonSelector}": "${priceText}"`);
              break;
            }
          }
        }
      }
    }

    if (!priceText) {
      console.log('HTML content preview:', response.data.slice(0, 500));
      throw new Error('Price element not found. Please verify the selector or try a different one.');
    }

    // Clean up the price text
    console.log(`Raw price text before cleanup: "${priceText}"`);
    const cleanPrice = priceText.replace(/[^0-9,\.]/g, '');
    console.log(`Cleaned price text: "${cleanPrice}"`);
    
    // Handle European number format (comma as decimal separator)
    // If there's a comma and it's followed by exactly 2 digits, treat it as decimal separator
    const price = cleanPrice.includes(',') && /,\d{2}$/.test(cleanPrice)
      ? parseFloat(cleanPrice.replace(',', '.'))
      : parseFloat(cleanPrice.replace(/,/g, ''));
    
    if (isNaN(price)) {
      throw new Error(`Could not parse price from text: "${priceText}"`);
    }
    
    console.log(`Successfully extracted price: ${price}`);
    return price;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Network error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url,
        message: error.message
      });
      throw new Error(`Failed to fetch the page: ${error.message}`);
    }
    console.error('Error checking price:', error);
    throw error;
  }
}

export function shouldNotifyPriceDrop(currentPrice: number, previousPrice: number | null): boolean {
  if (!previousPrice) return false;
  return currentPrice < previousPrice;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function sendPriceDropNotification(product: Product): void {
  if (Notification.permission === 'granted' && product.previousPrice) {
    new Notification('Price Drop Alert!', {
      body: `${product.name} price dropped from ${formatPrice(product.previousPrice)} to ${formatPrice(product.currentPrice)}!`,
      icon: '/notification-icon.png'
    });
  }
} 