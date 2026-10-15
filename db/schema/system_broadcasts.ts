import { integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Immutable audit record for a CDRRMO/PACC system announcement. Individual
 * inbox rows remain the delivery source of truth; this table captures the
 * intended audience and the actual persistence/push result for operators.
 */
export const systemBroadcasts = pgTable('system_broadcasts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  senderId: varchar('sender_id', { length: 255 })
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  targetRole: text('target_role', { enum: ['all', 'ambulance_responder', 'public_user'] }).notNull(),
  eligibleCount: integer('eligible_count').notNull().default(0),
  persistedCount: integer('persisted_count').notNull().default(0),
  optedOutCount: integer('opted_out_count').notNull().default(0),
  inactiveCount: integer('inactive_count').notNull().default(0),
  missingAuthCount: integer('missing_auth_count').notNull().default(0),
  pushEligibleCount: integer('push_eligible_count').notNull().default(0),
  pushAcceptedCount: integer('push_accepted_count').notNull().default(0),
  pushFailedCount: integer('push_failed_count').notNull().default(0),
  pushFailureReason: jsonb('push_failure_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
