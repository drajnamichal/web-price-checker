'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { checkPrice, formatPrice } from '@/utils/priceChecker';
import { getStoredProducts, addProduct as storeProduct, deleteProduct } from '@/utils/storage';

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
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 max-w-xl mx-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Názov produktu</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL produktu</label>
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
                Selektor ceny (CSS alebo XPath)
                <span className="ml-1 text-gray-500 hover:text-gray-700 cursor-help" title="Zadajte CSS selektor (napr. #price, .price-actual) alebo XPath výraz (napr. //span[@class='price'])">
                  ⓘ
                </span>
              </label>
              <input
                type="text"
                value={priceSelector}
                onChange={(e) => setPriceSelector(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="napr. #price, .price-actual, //span[@class='price']"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Tip: Použite nástroj prehliadača &quot;Preskúmať element&quot; na nájdenie správneho selektora. Pre XPath začnite s // alebo /.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Pridávam...' : 'Pridať produkt'}
            </button>
          </form>

          {products.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Vaše produkty</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{product.name}</h4>
                        <a 
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:text-blue-700 hover:underline"
                        >
                          Zobraziť produkt ↗
                        </a>
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
                          Predchádzajúca: {formatPrice(product.previousPrice)}
                          {product.currentPrice < product.previousPrice && (
                            <span className="ml-2 text-green-600">
                              ↓ {((1 - product.currentPrice / product.previousPrice) * 100).toFixed(1)}%
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Naposledy kontrolované: {new Date(product.lastChecked).toLocaleString('sk')}
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
