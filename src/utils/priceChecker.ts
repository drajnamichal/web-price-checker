import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '@/types/product';

export async function checkPrice(url: string, selector: string): Promise<number> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
      throw new Error('Price element not found. Please verify the selector.');
    }

    // Clean up the price text and convert to number
    const cleanPrice = priceText.replace(/[^0-9,\.]/g, '');
    const price = cleanPrice.includes(',') && /,\d{2}$/.test(cleanPrice)
      ? parseFloat(cleanPrice.replace(',', '.'))
      : parseFloat(cleanPrice.replace(/,/g, ''));

    if (isNaN(price)) {
      throw new Error(`Could not parse price from text: "${priceText}"`);
    }

    return price;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error('Failed to fetch the webpage. The website might be blocking our requests.');
    }
    throw error;
  }
}

export function shouldNotifyPriceDrop(currentPrice: number, previousPrice: number | null): boolean {
  if (!previousPrice) return false;
  return currentPrice < previousPrice;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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