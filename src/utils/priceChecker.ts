import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '@/types/product';

export async function checkPrice(url: string, selector: string): Promise<number> {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Try CSS selector first
    let priceText = $(selector).text();
    
    // If no result with CSS selector and it looks like XPath, try data-price attribute
    if (!priceText) {
      priceText = $(selector).attr('data-price') || '';
    }

    if (!priceText) {
      throw new Error('Price element not found');
    }

    // Clean up the price text
    // Remove all non-numeric characters except dots and commas
    const cleanPrice = priceText.replace(/[^0-9,\.]/g, '');
    
    // Handle European number format (comma as decimal separator)
    // If there's a comma and it's followed by exactly 2 digits, treat it as decimal separator
    const price = cleanPrice.includes(',') && /,\d{2}$/.test(cleanPrice)
      ? parseFloat(cleanPrice.replace(',', '.'))
      : parseFloat(cleanPrice.replace(/,/g, ''));
    
    if (isNaN(price)) {
      throw new Error('Could not parse price');
    }
    
    return price;
  } catch (error) {
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