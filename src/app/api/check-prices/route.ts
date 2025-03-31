import { NextResponse } from 'next/server';
import { getProducts, updateProduct, addPriceHistory } from '@/db';
import { checkPrice } from '@/utils/priceChecker';

export async function POST() {
  try {
    const products = await getProducts();
    
    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        try {
          const newPrice = await checkPrice(product.url, product.priceSelector);
          
          if (newPrice !== product.currentPrice) {
            // Update product in database
            await updateProduct(product.id, {
              previousPrice: product.currentPrice,
              currentPrice: newPrice,
              lastChecked: new Date().toISOString()
            });

            // Add price history entry
            await addPriceHistory({
              productId: product.id,
              price: newPrice,
              timestamp: new Date().toISOString()
            });

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

    return NextResponse.json(updatedProducts);
  } catch (error) {
    console.error('Error checking prices:', error);
    return NextResponse.json(
      { error: 'Failed to check prices' },
      { status: 500 }
    );
  }
} 