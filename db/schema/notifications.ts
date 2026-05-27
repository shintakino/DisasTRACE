import { pgTable, text, varchar, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'new_incident', 'incident_verified', 'ambulance_dispatched', 'responder_arrived', 'incident_resolved', 'registration_pending', 'registration_approved'
  title: text('title').notNull(),
  body: text('body').notNull(),
  unread: boolean('unread').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
});
