import { connect } from '@planetscale/database';
import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { products, priceHistory } from './schema';
import { eq } from 'drizzle-orm';

// Initialize PlanetScale client
const connection = connect({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
});

// Initialize Drizzle ORM
export const db = drizzle(connection);

// Helper functions for database operations
export async function addProduct(product: typeof products.$inferInsert) {
  return db.insert(products).values(product);
}

export async function updateProduct(id: string, data: Partial<typeof products.$inferInsert>) {
  return db.update(products)
    .set(data)
    .where(eq(products.id, id));
}

export async function deleteProduct(id: string) {
  return db.delete(products).where(eq(products.id, id));
}

export async function getProducts() {
  return db.select().from(products);
}

export async function addPriceHistory(data: typeof priceHistory.$inferInsert) {
  return db.insert(priceHistory).values(data);
}

export async function getPriceHistory(productId: string) {
  return db.select()
    .from(priceHistory)
    .where(eq(priceHistory.productId, productId))
    .orderBy(priceHistory.timestamp);
} 