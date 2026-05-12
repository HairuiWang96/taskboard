import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Pool manages multiple Postgres connections — Drizzle wraps it to add type-safe query builder
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/taskboard',
});

// Pass schema so db.query.* (relational API) knows about your tables
export const db = drizzle(pool, { schema });
