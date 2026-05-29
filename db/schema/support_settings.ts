import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';

export const supportSettings = pgTable('support_settings', {
  id: varchar('id', { length: 50 }).primaryKey(), // 'current'
  phone: varchar('phone', { length: 50 }).default('(044) 761-0000').notNull(),
  email: varchar('email', { length: 255 }).default('cdrrmobaliwag@gmail.com').notNull(),
  address: text('address').default('Baliwag Government Center, Brgy. Bagong Nayon, Baliwag City, Bulacan').notNull(),
  privacyPolicy: text('privacy_policy').default('Your data is secured and managed in accordance with the Data Privacy Act of 2012. We only collect information necessary for emergency response dispatching.').notNull(),
  privacyPolicyFull: text('privacy_policy_full').default('DisasTRACE collects only the minimum data necessary for emergency response operations, including your name, contact number, location coordinates, and incident imagery. This data is used exclusively for dispatching ambulance responders and maintaining city-wide safety records.\n\nAll personal information is encrypted in transit and at rest using industry-standard TLS and AES-256 protocols. Access to your data is restricted to authorized CDRRMO personnel only. We do not sell, share, or distribute your personal information to any third parties.\n\nUnder the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to access, correct, and request deletion of your personal data. For any concerns, contact the CDRRMO Data Protection Officer through the Help & Support section.').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

