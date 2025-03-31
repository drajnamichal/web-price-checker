import { connect } from '@planetscale/database';
import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { products, priceHistory } from './schema';
import { eq } from 'drizzle-orm';
import { Product } from '@/types/product';

// Initialize PlanetScale client
const connection = connect({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
});

// Initialize Drizzle ORM
export const db = drizzle(connection.connection);

// Helper functions for database operations
export async function addProduct(product: typeof products.$inferInsert) {
  return db.insert(products).values({
    ...product,
    currentPrice: Number(product.currentPrice),
    previousPrice: product.previousPrice ? Number(product.previousPrice) : null
  });
}

export async function updateProduct(id: string, data: Partial<typeof products.$inferInsert>) {
  return db.update(products)
    .set({
      ...data,
      currentPrice: data.currentPrice ? Number(data.currentPrice) : undefined,
      previousPrice: data.previousPrice ? Number(data.previousPrice) : undefined
    })
    .where(eq(products.id, id));
}

export async function deleteProduct(id: string) {
  return db.delete(products).where(eq(products.id, id));
}

export async function getProducts(): Promise<Product[]> {
  const results = await db.select().from(products);
  return results.map(product => ({
    ...product,
    currentPrice: Number(product.currentPrice),
    previousPrice: product.previousPrice ? Number(product.previousPrice) : null
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
    price: Number(record.price)
  }));
} 