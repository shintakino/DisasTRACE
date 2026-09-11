import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

/** The current Expo push token for the account's single active mobile device. */
export const mobilePushTokens = pgTable('mobile_push_tokens', {
  userId: varchar('user_id', { length: 255 })
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  pushToken: text('push_token').notNull().unique(),
  sessionId: uuid('session_id').notNull(),
  platform: varchar('platform', { length: 32 }).notNull().default('android'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
