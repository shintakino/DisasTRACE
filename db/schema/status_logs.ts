import { index, pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { incidents } from './incidents';

export const statusLogs = pgTable('status_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.id).notNull(),
  incidentId: varchar('incident_id', { length: 255 }).references(() => incidents.id),
  status: text('status', { enum: ['DISPATCHED', 'STANDBY', 'ON-SCENE', 'OFF-DUTY'] }).notNull(),
  action: text('action', { enum: ['DISPATCHED', 'COMPLETED', 'ARRIVED', 'STARTED', 'ENDED', 'NONE'] }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  incidentActionCreatedIndex: index('status_logs_incident_action_created_idx')
    .on(table.incidentId, table.action, table.createdAt),
}));
