import { pgTable, varchar, timestamp, doublePrecision, boolean } from 'drizzle-orm/pg-core';

export const hospitals = pgTable('hospitals', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  caters: boolean('caters').default(true).notNull(),
  phone: varchar('phone', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
