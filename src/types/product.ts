export type Product = {
  id: string;
  url: string;
  name: string;
  currentPrice: number;
  previousPrice: number | null;
  lastChecked: string;
  currency: 'EUR' | 'CZK';
};

export interface PriceHistory {
  id?: number;
  productId: string;
  price: number;
  timestamp: string;
} 