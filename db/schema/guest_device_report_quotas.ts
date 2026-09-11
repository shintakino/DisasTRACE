import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Atomic lifetime allowance for Guest Mode devices. The primary key is a
 * SHA-256 digest, never the device identifier sent by the Android app.
 */
export const guestDeviceReportQuotas = pgTable('guest_device_report_quotas', {
  deviceHash: varchar('device_hash', { length: 64 }).primaryKey(),
  reportCount: integer('report_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
