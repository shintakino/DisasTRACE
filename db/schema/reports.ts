import { pgTable, text, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { incidents } from './incidents';
import { users } from './users';

export const reports = pgTable('reports', {
  id: varchar('id', { length: 255 }).primaryKey(), // e.g., REP-2026-0047
  incidentId: varchar('incident_id', { length: 255 }).references(() => incidents.id).notNull(),
  responderId: varchar('responder_id', { length: 255 }).references(() => users.id).notNull(),
  status: text('status', { enum: ['DRAFT', 'SUBMITTED'] }).default('DRAFT').notNull(),
  description: text('description'),
  scenePhotos: jsonb('scene_photos').default([]), // Array of URLs
  participants: jsonb('participants').default([]), // Array of objects
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
