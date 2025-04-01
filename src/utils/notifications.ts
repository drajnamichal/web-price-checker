import { Product } from '@/types/product';

export function formatPrice(price: number, currency: 'EUR' | 'CZK'): string {
  const formatter = new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(price);
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