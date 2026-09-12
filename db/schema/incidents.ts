import { pgTable, text, varchar, timestamp, integer, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { verificationRequests } from './verification_requests';
import { hospitals } from './hospitals';

export const incidents = pgTable('incidents', {
  id: varchar('id', { length: 255 }).primaryKey(), // Server-generated UUID
  requestId: varchar('request_id', { length: 255 }).references(() => verificationRequests.id).notNull(),
  responderId: varchar('responder_id', { length: 255 }).references(() => users.id), // Nullable during negotiation
  status: text('status', { enum: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED'] }).default('DISPATCHED').notNull(),
  assignedAmbulance: varchar('assigned_ambulance', { length: 50 }),
  etaMinutes: integer('eta_minutes'),
  transportStatus: text('transport_status', { enum: ['NONE', 'TO_HOSPITAL'] }).default('NONE').notNull(),
  transportHospitalId: varchar('transport_hospital_id', { length: 50 }).references(() => hospitals.id),
  transportStartedAt: timestamp('transport_started_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  
  // Cascading Offer State Columns (Auto-Dispatch Engine)
  currentOfferResponderId: varchar('current_offer_responder_id', { length: 255 }).references(() => users.id),
  skippedResponderIds: uuid('skipped_responder_ids').array().default([]),
  offerExpiresAt: timestamp('offer_expires_at', { withTimezone: true }),
  dispatchMethod: varchar('dispatch_method', { length: 20, enum: ['AUTO_1KM', 'PACC_MANUAL'] }),
  dispatchOfferDurationSeconds: integer('dispatch_offer_duration_seconds').default(30).notNull(),
});
