export type Product = {
  id: string;
  name: string;
  url: string;
  price: number;
  currency: 'EUR' | 'CZK';
  lastChecked: string; // ISO date string
  priceHistory: {
    price: number;
    date: string; // ISO date string
  }[];
  createdAt: string; // ISO date string
};

export interface PriceHistory {
  id?: number;
  productId: string;
  price: number;
  timestamp: string;
} 