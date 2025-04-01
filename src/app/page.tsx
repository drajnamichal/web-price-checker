'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { formatPrice } from '@/utils/priceChecker';
import { getStoredProducts, addProduct as storeProduct, deleteProduct } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load products from storage on mount
    setProducts(getStoredProducts());
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;

    if (!url) {
      setError('URL je povinná');
      setLoading(false);
      return;
    }

    try {
      // Check initial price
      const response = await fetch('/api/check-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Nepodarilo sa pridať produkt');
      }

      const data = await response.json();
      const { name, price, currency } = data;
      const newProduct: Product = {
        id: uuidv4(),
        url,
        name,
        price,
        currency,
        lastChecked: new Date().toISOString(),
        priceHistory: [
          { price, date: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString()
      };

      // Store the product
      storeProduct(newProduct);
      setProducts([...products, newProduct]);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error adding product:', error);
      setError(error instanceof Error ? error.message : 'Nepodarilo sa pridať produkt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setProducts(products.filter(p => p.id !== id));
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900">Sledovač cien</h2>
          <p className="mt-4 text-lg text-gray-600">
            Pridajte produkty na sledovanie ich cien
          </p>
        </div>

        {error && (
          <div className="max-w-7xl mx-auto mb-4">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                URL produktu
              </label>
              <input
                type="url"
                id="url"
                name="url"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                placeholder="https://example.com/product"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300"
            >
              {loading ? 'Pridávam...' : 'Pridať produkt'}
            </button>
          </form>

          {products.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Vaše produkty</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <div key={product.id} className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                        <p className="text-gray-600 mb-4">
                          <a 
                            href={product.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Zobraziť produkt ↗
                          </a>
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatPrice(product.price, product.currency)}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Naposledy kontrolované: {new Date(product.lastChecked).toLocaleString('sk-SK')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        aria-label="Odstrániť produkt"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
