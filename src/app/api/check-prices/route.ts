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
          
          // Convert both to numbers for comparison
          const currentPriceNum = Number(product.currentPrice);
          if (newPrice !== currentPriceNum) {
            const now = new Date();
            // Update product in database
            await updateProduct(product.id, {
              previousPrice: currentPriceNum,
              currentPrice: newPrice,
              lastChecked: now
            });

            // Add price history entry
            await addPriceHistory({
              productId: product.id,
              price: newPrice,
              timestamp: now
            });

            return {
              ...product,
              previousPrice: currentPriceNum,
              currentPrice: newPrice,
              lastChecked: now.toISOString()
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