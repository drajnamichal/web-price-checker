import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { products, priceHistory } from './schema';

// Initialize SQLite database
const sqlite = new Database('sqlite.db');

// Initialize Drizzle ORM
export const db = drizzle(sqlite);

// Create tables if they don't exist
const createTables = () => {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      price_selector TEXT NOT NULL,
      name TEXT NOT NULL,
      current_price REAL NOT NULL,
      previous_price REAL,
      last_checked TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      price REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
};

// Create tables on startup
createTables();

// Helper functions for database operations
export async function addProduct(product: typeof products.$inferInsert) {
  return db.insert(products).values(product);
}

export async function updateProduct(id: string, data: Partial<typeof products.$inferInsert>) {
  return db.update(products)
    .set(data)
    .where(sql`id = ${id}`);
}

export async function deleteProduct(id: string) {
  return db.delete(products).where(sql`id = ${id}`);
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
    .where(sql`product_id = ${productId}`)
    .orderBy(sql`timestamp DESC`);
} 