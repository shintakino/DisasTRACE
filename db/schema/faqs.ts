import { pgTable, text, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const faqs = pgTable('faqs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
