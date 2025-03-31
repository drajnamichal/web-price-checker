import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  priceSelector: text('price_selector').notNull(),
  name: text('name').notNull(),
  currentPrice: real('current_price').notNull(),
  previousPrice: real('previous_price'),
  lastChecked: text('last_checked').notNull(),
  createdAt: text('created_at').notNull()
});

export const priceHistory = sqliteTable('price_history', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  productId: text('product_id').notNull().references(() => products.id),
  price: real('price').notNull(),
  timestamp: text('timestamp').notNull()
}); 