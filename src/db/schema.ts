import { mysqlTable, varchar, int, decimal, timestamp } from 'drizzle-orm/mysql-core';

export const products = mysqlTable('products', {
  id: varchar('id', { length: 255 }).primaryKey(),
  url: varchar('url', { length: 2048 }).notNull(),
  priceSelector: varchar('price_selector', { length: 1024 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  currentPrice: decimal('current_price', { precision: 10, scale: 2 }).notNull(),
  previousPrice: decimal('previous_price', { precision: 10, scale: 2 }),
  lastChecked: timestamp('last_checked').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const priceHistory = mysqlTable('price_history', {
  id: int('id').primaryKey().autoincrement(),
  productId: varchar('product_id', { length: 255 }).notNull().references(() => products.id),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow()
}); 