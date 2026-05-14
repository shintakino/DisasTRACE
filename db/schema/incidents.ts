import { pgTable, text, varchar, timestamp, integer, doublePrecision } from 'drizzle-orm/pg-core';
import { users } from './users';

export const incidents = pgTable('incidents', {
  id: varchar('id', { length: 255 }).primaryKey(), // e.g., REQ-2026-0047
  reporterId: varchar('reporter_id', { length: 255 }).references(() => users.id).notNull(),
  type: text('type', { enum: ['Fire Emergency', 'Vehicular Collision', 'Medical Emergency', 'Structural Failure', 'Flood/Water', 'Unknown Cause'] }).notNull(),
  nature: text('nature', { enum: ['EMERGENCY', 'NON-EMERGENCY'] }).notNull(),
  status: text('status', { enum: ['PENDING', 'VERIFIED', 'REJECTED', 'DISPATCHED', 'ON-SCENE', 'COMPLETED'] }).default('PENDING').notNull(),
  location: text('location').notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  peopleInvolved: integer('people_involved').default(1),
  description: text('description'),
  imageUrl: text('image_url'),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: varchar('verified_by', { length: 255 }).references(() => users.id),
});
