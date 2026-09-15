import { index, pgTable, text, varchar, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { incidents } from './incidents';
import { users } from './users';
import { sql } from 'drizzle-orm';

export const reports = pgTable('reports', {
  id: varchar('id', { length: 255 }).primaryKey(), // e.g., REP-2026-0047
  incidentId: varchar('incident_id', { length: 255 }).references(() => incidents.id).notNull(),
  responderId: varchar('responder_id', { length: 255 }).references(() => users.id).notNull(),
  status: text('status', { enum: ['DRAFT', 'SUBMITTED'] }).default('DRAFT').notNull(),
  description: text('description'),
  scenePhotos: jsonb('scene_photos').default([]), // Array of URLs
  participants: jsonb('participants').default([]), // Array of objects
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  responderArchiveCreatedIndex: index('reports_responder_archive_created_idx')
    .on(table.responderId, table.archivedAt, table.createdAt),
  oneResponderReportPerIncident: uniqueIndex('reports_incident_id_unique')
    .on(table.incidentId)
    .where(sql`${table.createdAt} >= '2026-09-15 00:00:00'::timestamp`),
}));
