import axios from 'axios';
import { Product } from '@/types/product';

export async function checkPrice(url: string, selector: string): Promise<number> {
  try {
    const response = await axios.post('/api/check-price', {
      url,
      selector
    });
    
    return response.data.price;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Network error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url,
        message: error.message
      });
      throw new Error(error.response?.data?.error || `Failed to fetch the price: ${error.message}`);
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