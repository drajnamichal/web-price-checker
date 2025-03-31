export interface Product {
  id: string;
  url: string;
  priceSelector: string;
  name: string;
  currentPrice: number;
  previousPrice: number | null;
  lastChecked: string;
}

export interface PriceHistory {
  price: number;
  timestamp: string;
} 