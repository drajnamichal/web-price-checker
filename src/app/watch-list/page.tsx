'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types/product';
import { formatPrice } from '@/utils/priceChecker';
import Link from 'next/link';

export default function WatchList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
      try {
        setProducts(JSON.parse(storedProducts));
      } catch (err) {
        setError('Failed to load products');
        console.error('Error parsing products:', err);
      }
    }
    setLoading(false);
  }, []);

  const removeProduct = (url: string) => {
    const updatedProducts = products.filter(product => product.url !== url);
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    setProducts(updatedProducts);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-red-600">Error: {error}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900">Your Watch List</h2>
          <p className="mt-4 text-lg text-gray-600">
            Track your favorite products and their price changes
          </p>
          <Link 
            href="/"
            className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add New Product
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products in your watch list yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.url}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {product.name}
                  </h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">Current Price</p>
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
                  </div>
                  <div className="flex justify-between items-center">
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Visit Website
                    </a>
                    <button
                      onClick={() => removeProduct(product.url)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 