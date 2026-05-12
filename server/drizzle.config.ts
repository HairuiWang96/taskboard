import { defineConfig } from 'drizzle-kit';

// drizzle-kit reads this to know where your schema is and how to connect to Postgres
export default defineConfig({
  schema: './src/db/schema.ts',   // where your table definitions live
  out: './drizzle',               // where generated migration SQL files go
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/taskboard',
  },
});
