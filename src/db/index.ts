import { Client } from '@planetscale/database';
import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { products, priceHistory } from './schema';
import { eq } from 'drizzle-orm';
import { Product } from '@/types/product';

// Initialize PlanetScale client
const client = new Client({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  fetch: (url: string, init: any) => {
    delete init['cache']; // Remove cache header
    return fetch(url, init);
  }
});

// Initialize Drizzle ORM
export const db = drizzle(client);

// Helper functions for database operations
export async function addProduct(product: typeof products.$inferInsert) {
  try {
    await db.insert(products).values({
      ...product,
      currentPrice: Number(product.currentPrice),
      previousPrice: product.previousPrice ? Number(product.previousPrice) : null,
      lastChecked: new Date(product.lastChecked),
      createdAt: new Date(product.createdAt)
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

export async function updateProduct(id: string, data: Partial<typeof products.$inferInsert>) {
  try {
    await db.update(products)
      .set({
        ...data,
        currentPrice: data.currentPrice ? Number(data.currentPrice) : undefined,
        previousPrice: data.previousPrice ? Number(data.previousPrice) : undefined,
        lastChecked: data.lastChecked ? new Date(data.lastChecked) : undefined,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined
      })
      .where(eq(products.id, id));
    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(id: string) {
  return db.delete(products).where(eq(products.id, id));
}

export async function getProducts(): Promise<Product[]> {
  const results = await db.select().from(products);
  return results.map(product => ({
    ...product,
    currentPrice: Number(product.currentPrice),
    previousPrice: product.previousPrice ? Number(product.previousPrice) : null,
    lastChecked: product.lastChecked.toISOString(),
    createdAt: product.createdAt.toISOString()
  }));
}

export async function addPriceHistory(data: typeof priceHistory.$inferInsert) {
  return db.insert(priceHistory).values({
    ...data,
    price: Number(data.price)
  });
}

export async function getPriceHistory(productId: string) {
  const results = await db.select()
    .from(priceHistory)
    .where(eq(priceHistory.productId, productId))
    .orderBy(priceHistory.timestamp);
  
  return results.map(record => ({
    ...record,
    price: Number(record.price),
    timestamp: record.timestamp.toISOString()
  }));
} 