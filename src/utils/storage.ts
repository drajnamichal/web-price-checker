import { Product } from '@/types/product';

const STORAGE_KEY = 'price-checker-products';

export function getStoredProducts(): Product[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function storeProducts(products: Product[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function addProduct(product: Product): void {
  const products = getStoredProducts();
  products.push(product);
  storeProducts(products);
}

export function updateProduct(updatedProduct: Product): void {
  const products = getStoredProducts();
  const index = products.findIndex(p => p.id === updatedProduct.id);
  if (index !== -1) {
    products[index] = updatedProduct;
    storeProducts(products);
  }
}

export function deleteProduct(id: string): void {
  const products = getStoredProducts();
  const filtered = products.filter(p => p.id !== id);
  storeProducts(filtered);
} 