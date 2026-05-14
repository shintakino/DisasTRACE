import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerk ID
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  role: text('role', { enum: ['public_user', 'ambulance_responder', 'pacc_admin', 'cdrrmo_super_admin'] }).notNull(),
  status: text('status', { enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING'] }).default('PENDING').notNull(),
  verificationStatus: text('verification_status', { enum: ['PENDING', 'APPROVED', 'REJECTED'] }).default('PENDING').notNull(),
  rejectionReason: text('rejection_reason'),
  idType: text('id_type'),
  idImageUrl: text('id_image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
