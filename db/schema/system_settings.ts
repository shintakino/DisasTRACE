import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const systemSettings = pgTable('system_settings', {
  id: varchar('id', { length: 50 }).primaryKey(), // Usually 'current' to hold the single active configuration
  dispatchOfferTimeoutSeconds: integer('dispatch_offer_timeout_seconds').default(30).notNull(),
  // The legacy daily aggregate cap remains in the database for compatibility,
  // but Guest Mode enforcement now uses this phone-scoped lifetime limit.
  guestRequestsPerDay: integer('guest_requests_per_day').default(50).notNull(),
  guestReportsPerPhoneLimit: integer('guest_reports_per_phone_limit').default(3).notNull(),
  deduplicationRadiusMeters: integer('deduplication_radius_meters').default(250).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
