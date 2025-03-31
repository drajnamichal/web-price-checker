'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { checkPrice, formatPrice, requestNotificationPermission, sendPriceDropNotification, shouldNotifyPriceDrop } from '@/utils/priceChecker';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [url, setUrl] = useState('');
  const [priceSelector, setPriceSelector] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load products from localStorage on mount
    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }

    // Request notification permission
    requestNotificationPermission();

    // Define checkAllPrices inside useEffect to include it in the closure
    const checkAllPrices = async () => {
      const updatedProducts = await Promise.all(
        products.map(async (product) => {
          try {
            const newPrice = await checkPrice(product.url, product.priceSelector);
            if (newPrice !== product.currentPrice) {
              if (shouldNotifyPriceDrop(newPrice, product.currentPrice)) {
                sendPriceDropNotification({
                  ...product,
                  previousPrice: product.currentPrice,
                  currentPrice: newPrice
                });
              }
              return {
                ...product,
                previousPrice: product.currentPrice,
                currentPrice: newPrice,
                lastChecked: new Date().toISOString()
              };
            }
            return product;
          } catch (error) {
            console.error(`Error checking price for ${product.name}:`, error);
            return product;
          }
        })
      );
      setProducts(updatedProducts);
    };

    // Set up price checking interval
    const interval = setInterval(checkAllPrices, 3600000); // Every hour
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [products]); // Add products as dependency since it's used in checkAllPrices

  useEffect(() => {
    // Save products to localStorage whenever they change
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentPrice = await checkPrice(url, priceSelector);
      const newProduct: Product = {
        id: Date.now().toString(),
        url,
        priceSelector,
        name,
        currentPrice,
        previousPrice: null,
        lastChecked: new Date().toISOString()
      };

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

  const handleDelete = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Web Price Checker</h1>

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
            <span className="ml-1 text-gray-500 hover:text-gray-700 cursor-help" title="Enter a CSS selector (e.g., #price, .price-actual) or XPath (e.g., //span[@id='price']). The selector should target the element containing the price.">
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
            Tip: Use browser's inspect element to find the correct selector
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

      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="border p-4 rounded shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.url}</p>
                <p className="mt-2">
                  Current Price: <span className="font-bold">{formatPrice(product.currentPrice)}</span>
                  {product.previousPrice && (
                    <span className="ml-2 text-sm text-gray-600">
                      Previous: {formatPrice(product.previousPrice)}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  Last checked: {new Date(product.lastChecked).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(product.id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
