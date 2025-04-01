'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '@/types/product';
import { formatPrice } from '@/utils/priceChecker';
import { requestNotificationPermission, sendPriceDropNotification, shouldNotifyPriceDrop } from '@/utils/notifications';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Load products from localStorage
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    }

    // Request notification permission
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    // Save products to localStorage whenever they change
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/check-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodarilo sa pridať produkt');
      }

      const data = await response.json();
      const { name, price, currency } = data;
      const now = new Date().toISOString();
      
      const newProduct: Product = {
        id: uuidv4(),
        url,
        name,
        price,
        currency,
        lastChecked: now,
        priceHistory: [
          { price, date: now }
        ],
        createdAt: now
      };

      setProducts(prevProducts => [...prevProducts, newProduct]);
      setUrl('');
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nepodarilo sa pridať produkt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Sledovanie cien produktov
          </h1>
          <p className="text-lg text-gray-600">
            Pridajte URL produktu a budeme sledovať jeho cenu
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-12">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="sr-only">
                URL produktu
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Zadajte URL produktu"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Pridávam...' : 'Pridať produkt'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {products.length > 0 ? (
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
        ) : (
          <div className="text-center text-gray-500">
            <p>Zatiaľ nie sú pridané žiadne produkty</p>
          </div>
        )}
      </div>
    </main>
  );
}
