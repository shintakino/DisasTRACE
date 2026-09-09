import { pgTable, text, varchar, timestamp, doublePrecision, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { users } from './users';

export const verificationRequests = pgTable('verification_requests', {
  id: varchar('id', { length: 255 }).primaryKey(), // Server-generated UUID
  requestId: varchar('request_id', { length: 20 }).notNull().unique(), // e.g., REQ-2026-0047
  residentId: varchar('resident_id', { length: 255 }).references(() => users.id),
  reporterType: text('reporter_type', { enum: ['REGISTERED', 'GUEST'] }).default('REGISTERED').notNull(),
  contactNumber: varchar('contact_number', { length: 32 }),
  guestAccessToken: varchar('guest_access_token', { length: 128 }).unique(),
  status: text('status', { enum: ['PENDING', 'VERIFIED', 'REJECTED', 'DUPLICATE'] }).default('PENDING').notNull(),
  parentRequestId: varchar('parent_request_id', { length: 255 }).references((): AnyPgColumn => verificationRequests.id),
  nature: text('nature', { enum: ['EMERGENCY', 'NON-EMERGENCY'] }).default('EMERGENCY').notNull(),
  type: text('type', { enum: ['Medical Emergency', 'Vehicular Collision', 'Fire Emergency', 'Structural Failure', 'Flood/Water', 'Unknown Cause'] }).notNull(),
  peopleInvolved: text('people_involved').default('None').notNull(),
  severity: text('severity', { enum: ['Low', 'Medium', 'High', 'Critical'] }).default('Medium').notNull(),
  locationDescription: text('location_description'),
  barangay: varchar('barangay', { length: 100 }),
  barangayPsgcCode: varchar('barangay_psgc_code', { length: 10 }),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  photoLatitude: doublePrecision('photo_latitude'),
  photoLongitude: doublePrecision('photo_longitude'),
  imageUrl: text('image_url'),
  triageClassification: text('triage_classification', { enum: ['HIGH_CONFIDENCE_EMERGENCY', 'HIGH_CONFIDENCE_NON_EMERGENCY', 'UNCERTAIN_INCOMPLETE', 'SUSPICIOUS_POSSIBLE_PRANK'] }).default('UNCERTAIN_INCOMPLETE').notNull(),
  triageReasons: text('triage_reasons').array().default([]).notNull(),
  coordinationAgencies: text('coordination_agencies').array().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

import { relations } from 'drizzle-orm';

export const verificationRequestsRelations = relations(verificationRequests, ({ one }) => ({
  resident: one(users, {
    fields: [verificationRequests.residentId],
    references: [users.id],
  }),
  parentRequest: one(verificationRequests, {
    fields: [verificationRequests.parentRequestId],
    references: [verificationRequests.id],
  }),
}));
