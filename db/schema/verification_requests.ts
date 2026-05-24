import { pgTable, text, varchar, timestamp, doublePrecision } from 'drizzle-orm/pg-core';
import { users } from './users';

export const verificationRequests = pgTable('verification_requests', {
  id: varchar('id', { length: 255 }).primaryKey(), // Server-generated UUID
  requestId: varchar('request_id', { length: 20 }).notNull().unique(), // e.g., REQ-2026-0047
  residentId: varchar('resident_id', { length: 255 }).references(() => users.id).notNull(),
  status: text('status', { enum: ['PENDING', 'VERIFIED', 'REJECTED'] }).default('PENDING').notNull(),
  nature: text('nature', { enum: ['EMERGENCY', 'NON-EMERGENCY'] }).default('EMERGENCY').notNull(),
  type: text('type', { enum: ['Medical Emergency', 'Vehicular Collision', 'Fire Emergency', 'Structural Failure', 'Flood/Water', 'Unknown Cause'] }).notNull(),
  peopleInvolved: text('people_involved', { enum: ['None', '1-2 Persons', '3-5 Persons', '6+ Persons'] }).default('None').notNull(),
  locationDescription: text('location_description'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  imageUrl: text('image_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

import { relations } from 'drizzle-orm';

export const verificationRequestsRelations = relations(verificationRequests, ({ one }) => ({
  resident: one(users, {
    fields: [verificationRequests.residentId],
    references: [users.id],
  }),
}));
