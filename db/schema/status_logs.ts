import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const statusLogs = pgTable('status_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.id).notNull(),
  status: text('status', { enum: ['DISPATCHED', 'STANDBY', 'ON-SCENE', 'OFF-DUTY'] }).notNull(),
  action: text('action', { enum: ['DISPATCHED', 'COMPLETED', 'ARRIVED', 'STARTED', 'ENDED', 'NONE'] }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
