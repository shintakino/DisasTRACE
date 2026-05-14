import { pgTable, text, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.id).notNull(),
  action: text('action').notNull(), // e.g., "USER_APPROVED", "INCIDENT_VERIFIED"
  entityType: text('entity_type').notNull(), // e.g., "USER", "INCIDENT"
  entityId: varchar('entity_id', { length: 255 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
