import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '@/types/product';

export async function checkPrice(url: string, selector: string): Promise<{ price: number; currency: 'EUR' | 'CZK' }> {
  try {
    const response = await axios.post('/api/check-price', {
      url,
      selector
    });
    
    if (!response.data || typeof response.data.price !== 'number' || !response.data.currency) {
      throw new Error('Neplatné údaje o cene prijaté zo servera');
    }
    
    return {
      price: response.data.price,
      currency: response.data.currency
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || 'Nepodarilo sa skontrolovať cenu';
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export function shouldNotifyPriceDrop(currentPrice: number, previousPrice: number | null): boolean {
  if (!previousPrice) return false;
  return currentPrice < previousPrice;
}

export function formatPrice(price: number, currency: 'EUR' | 'CZK'): string {
  const formatter = new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(price);
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
      body: `${product.name} price dropped from ${formatPrice(product.previousPrice, product.currency)} to ${formatPrice(product.currentPrice, product.currency)}!`,
      icon: '/notification-icon.png'
    });
  }
} 