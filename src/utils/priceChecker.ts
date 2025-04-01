import axios from 'axios';
import { Product } from '@/types/product';

export async function checkPrice(url: string): Promise<{ price: number; currency: 'EUR' | 'CZK' }> {
  try {
    const response = await axios.post('/api/check-price', { url });
    
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

export function shouldNotifyPriceDrop(product: Product): boolean {
  if (product.priceHistory.length < 2) return false;
  
  // Get the last two prices
  const sortedHistory = [...product.priceHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const currentPrice = sortedHistory[0].price;
  const previousPrice = sortedHistory[1].price;
  
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
  if (Notification.permission !== 'granted' || product.priceHistory.length < 2) return;

  const sortedHistory = [...product.priceHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const currentPrice = sortedHistory[0].price;
  const previousPrice = sortedHistory[1].price;

  if (currentPrice < previousPrice) {
    new Notification('Zníženie ceny!', {
      body: `${product.name} - cena klesla z ${formatPrice(previousPrice, product.currency)} na ${formatPrice(currentPrice, product.currency)}!`,
      icon: '/notification-icon.png'
    });
  }
} 