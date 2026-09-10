import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * One active mobile device per public user or ambulance responder. The raw
 * platform identifier never reaches this table; only its SHA-256 digest does.
 */
export const mobileDeviceSessions = pgTable('mobile_device_sessions', {
  userId: varchar('user_id', { length: 255 })
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  deviceHash: varchar('device_hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
