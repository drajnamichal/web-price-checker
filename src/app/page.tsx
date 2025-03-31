'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { requestNotificationPermission, sendPriceDropNotification, shouldNotifyPriceDrop } from '@/utils/priceChecker';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [url, setUrl] = useState('');
  const [priceSelector, setPriceSelector] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load products from API on mount
    fetchProducts();

    // Request notification permission
    requestNotificationPermission();
  }, []);

  // Separate useEffect for price checking to properly handle products dependency
  useEffect(() => {
    // Define checkAllPrices inside useEffect to include it in the closure
    const checkAllPrices = async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const updatedProducts = await response.json();
        setProducts(updatedProducts);
      } catch (error) {
        console.error('Error checking prices:', error);
      }
    };

    // Set up price checking interval
    const interval = setInterval(checkAllPrices, 3600000); // Every hour
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const products = await response.json();
      setProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          priceSelector,
          name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add product');
      }

      const newProduct = await response.json();
      setProducts([...products, newProduct]);
      
      setUrl('');
      setPriceSelector('');
      setName('');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product. Please check the URL and price selector.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900">Price Checker</h2>
          <p className="mt-4 text-lg text-gray-600">
            Add products to track their prices
          </p>
          <Link 
            href="/watch-list"
            className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            View Watch List ({products.length})
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="mb-8 space-y-4 max-w-xl">
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
              Price Selector (CSS or XPath)
              <span className="ml-1 text-gray-500 hover:text-gray-700 cursor-help" title="Enter a CSS selector (e.g., #price, .price-actual) or XPath (e.g., //span[@id=&apos;price&apos;]). The selector should target the element containing the price.">
                ⓘ
              </span>
            </label>
            <input
              type="text"
              value={priceSelector}
              onChange={(e) => setPriceSelector(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="e.g., #JS_price, .price-actual, //span[@data-price]"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Tip: Use browser&apos;s inspect element to find the correct selector
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      </div>
    </main>
  );
}
