'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '@/types/product';
import { requestNotificationPermission, sendPriceDropNotification, shouldNotifyPriceDrop, formatPrice } from '@/utils/notifications';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [checkingPrices, setCheckingPrices] = useState(false);
  const [visits, setVisits] = useState<number>(0);

  useEffect(() => {
    // Track visit
    const fetchVisits = async () => {
      try {
        const response = await fetch('/api/visits');
        if (!response.ok) {
          throw new Error('Failed to fetch visits');
        }
        const data = await response.json();
        if (typeof data.visits === 'number') {
          setVisits(data.visits);
        }
      } catch (error) {
        console.error('Error fetching visits:', error);
      }
    };

    fetchVisits();

    // Load products from localStorage
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    }

    // Request notification permission
    requestNotificationPermission();

    // Set up periodic price checking
    const checkPrices = async () => {
      try {
        setCheckingPrices(true);
        const response = await fetch('/api/check-prices');
        if (!response.ok) {
          throw new Error('Failed to check prices');
        }
        const data = await response.json();
        
        // Update products with new prices
        setProducts(prevProducts => {
          const updatedProducts = [...prevProducts];
          data.updatedProducts.forEach((updatedProduct: Product) => {
            const index = updatedProducts.findIndex(p => p.id === updatedProduct.id);
            if (index !== -1) {
              // Check if price dropped and send notification
              if (shouldNotifyPriceDrop(updatedProduct)) {
                sendPriceDropNotification(updatedProduct);
              }
              updatedProducts[index] = updatedProduct;
            }
          });
          return updatedProducts;
        });
      } catch (error) {
        console.error('Error checking prices:', error);
      } finally {
        setCheckingPrices(false);
      }
    };

    // Check prices immediately and then every 30 minutes
    checkPrices();
    const interval = setInterval(checkPrices, 30 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
            Sledovanie cien produktov
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Pridajte URL produktu a my budeme automaticky sledovať jeho cenu a upozorníme vás na zmeny
          </p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            {checkingPrices && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Kontrolujem ceny...
              </p>
            )}
            <div className="flex items-center bg-white/50 dark:bg-gray-800/50 rounded-full py-1 px-3 shadow-sm">
              <svg className="h-4 w-4 text-blue-500 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {visits.toLocaleString('sk-SK')} návštevníkov
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="url" className="sr-only">URL produktu</label>
                <div className="relative rounded-lg shadow-sm">
                  <input
                    type="url"
                    name="url"
                    id="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Vložte URL produktu"
                    className="block w-full px-4 py-3 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Pridávam produkt...
                  </>
                ) : (
                  'Pridať produkt'
                )}
              </button>

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="relative mt-16">
          {products.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2">{product.name}</h3>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-full"
                        aria-label="Odstrániť produkt"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex-grow">
                      <a 
                        href={product.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors mb-4"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Zobraziť produkt
                      </a>
                      
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 mb-4">
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {formatPrice(product.price, product.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Aktualizované: {new Date(product.lastChecked).toLocaleString('sk-SK')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-xl font-medium text-gray-600 dark:text-gray-300">
                Zatiaľ nie sú pridané žiadne produkty
              </p>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Začnite pridaním URL produktu, ktorého cenu chcete sledovať
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
