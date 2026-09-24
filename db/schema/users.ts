import { pgTable, text, varchar, timestamp, doublePrecision, index, uniqueIndex, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom PostGIS Geometry Point Type definition for Drizzle
const geometryPoint = customType<{ data: string }>({
  dataType() {
    return 'geometry(Point, 4326)';
  },
});

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Supabase Auth ID (UUID)
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  employeeId: varchar('employee_id', { length: 50 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  role: text('role', { enum: ['public_user', 'ambulance_responder', 'pacc_admin', 'cdrrmo_super_admin'] }).notNull(),
  status: text('status', { enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING'] }).default('PENDING').notNull(),
  verificationStatus: text('verification_status', { enum: ['PENDING', 'APPROVED', 'REJECTED'] }).default('PENDING').notNull(),
  rejectionReason: text('rejection_reason'),
  idType: text('id_type'),
  idImageUrl: text('id_image_url'),
  privacyConsentAt: timestamp('privacy_consent_at', { withTimezone: true }),
  privacyPolicyVersion: varchar('privacy_policy_version', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Integration Additions
  dutyStatus: text('duty_status', { enum: ['OFF_DUTY', 'ON_DUTY', 'ACTIVE_DISPATCH'] }).default('OFF_DUTY').notNull(),
  lastLatitude: doublePrecision('last_latitude'),
  lastLongitude: doublePrecision('last_longitude'),
  lastLocationAccuracy: doublePrecision('last_location_accuracy'),
  lastLocationUpdatedAt: timestamp('last_location_updated_at', { withTimezone: true }),
  locationGeom: geometryPoint('location_geom'),
  otpCode: varchar('otp_code', { length: 255 }),
  otpExpiresAt: timestamp('otp_expires_at', { withTimezone: true }),
  responderType: text('responder_type', { enum: ['barangay', 'cdrrmo_hq'] }),
  barangay: varchar('barangay', { length: 255 }),
  unitId: varchar('unit_id', { length: 50 }),
}, (table) => ({
  locationGeomGistIdx: index('users_location_geom_gist_idx').using('gist', table.locationGeom),
  unitIdUnique: uniqueIndex('users_unit_id_unique')
    .on(table.unitId)
    .where(sql`${table.unitId} IS NOT NULL`),
}));
