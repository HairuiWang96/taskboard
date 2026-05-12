import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

// pgTable() defines a Postgres table — columns are typed with helpers like uuid(), text(), boolean()
export const tasks = pgTable('tasks', {
  id:        uuid('id').primaryKey().defaultRandom(),       // UUID PK, auto-generated
  title:     text('title').notNull(),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// $inferSelect infers the TypeScript type from the schema — no manual duplication
export type Task    = typeof tasks.$inferSelect;  // what you get back from SELECT
export type NewTask = typeof tasks.$inferInsert;  // what you need to INSERT (id/createdAt are optional)
