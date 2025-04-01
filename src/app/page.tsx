'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { checkPrice, formatPrice } from '@/utils/priceChecker';
import { getStoredProducts, addProduct as storeProduct, deleteProduct } from '@/utils/storage';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [url, setUrl] = useState('');
  const [priceSelector, setPriceSelector] = useState('');
  const [name, setName] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check initial price
      const initialPrice = await checkPrice(url, priceSelector);

      // Create new product
      const newProduct: Product = {
        id: crypto.randomUUID(),
        url,
        priceSelector,
        name,
        currentPrice: initialPrice,
        previousPrice: null,
        lastChecked: new Date().toISOString()
      };

      // Store the product
      storeProduct(newProduct);
      setProducts([...products, newProduct]);

      // Reset form
      setUrl('');
      setPriceSelector('');
      setName('');
    } catch (error) {
      console.error('Error adding product:', error);
      setError(error instanceof Error ? error.message : 'Failed to add product');
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
          <h2 className="text-3xl font-extrabold text-gray-900">Price Checker</h2>
          <p className="mt-4 text-lg text-gray-600">
            Add products to track their prices
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
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 max-w-xl mx-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Product URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Price Selector (CSS)
                <span className="ml-1 text-gray-500 hover:text-gray-700 cursor-help" title="Enter a CSS selector (e.g., #price, .price-actual) that targets the element containing the price.">
                  ⓘ
                </span>
              </label>
              <input
                type="text"
                value={priceSelector}
                onChange={(e) => setPriceSelector(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., #price, .price-actual"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Tip: Use browser&apos;s inspect element to find the correct selector
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </form>

          {products.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Your Products</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500 truncate">{product.url}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl font-bold text-green-600">
                        {formatPrice(product.currentPrice)}
                      </p>
                      {product.previousPrice && (
                        <p className="text-sm text-gray-500">
                          Previous: {formatPrice(product.previousPrice)}
                          {product.currentPrice < product.previousPrice && (
                            <span className="ml-2 text-green-600">
                              ↓ {((1 - product.currentPrice / product.previousPrice) * 100).toFixed(1)}%
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Last checked: {new Date(product.lastChecked).toLocaleString()}
                      </p>
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
