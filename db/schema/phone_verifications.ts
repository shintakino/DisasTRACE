import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const phoneVerifications = pgTable('phone_verifications', {
  phone: varchar('phone', { length: 20 }).primaryKey(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
