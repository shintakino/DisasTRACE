import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const systemSettings = pgTable('system_settings', {
  id: varchar('id', { length: 50 }).primaryKey(), // Usually 'current' to hold the single active configuration
  dispatchOfferTimeoutSeconds: integer('dispatch_offer_timeout_seconds').default(30).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
