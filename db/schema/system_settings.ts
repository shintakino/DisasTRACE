import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const systemSettings = pgTable('system_settings', {
  id: varchar('id', { length: 50 }).primaryKey(), // Usually 'current' to hold the single active configuration
  dispatchOfferTimeoutSeconds: integer('dispatch_offer_timeout_seconds').default(30).notNull(),
  guestRequestsPerDay: integer('guest_requests_per_day').default(50).notNull(),
  deduplicationRadiusMeters: integer('deduplication_radius_meters').default(250).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
