import { pgTable, text, varchar, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const feedbacks = pgTable('feedbacks', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  userId: varchar('user_id', { length: 36 }).notNull(),
  incidentId: varchar('incident_id', { length: 36 }).notNull(),
  reportId: varchar('report_id', { length: 50 }),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('feedbacks_user_incident_idx').on(table.userId, table.incidentId),
]);
