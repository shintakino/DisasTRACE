import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const supportMessages = pgTable('support_messages', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  userId: varchar('user_id', { length: 255 }).references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['UNREAD', 'READ', 'RESOLVED'] }).default('UNREAD').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
