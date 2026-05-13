# Database Design — Deep Reference

## Schema Design Fundamentals

### Data Types — Choose Carefully

```sql
-- ✓ Use the most specific type that fits
id          UUID DEFAULT gen_random_uuid()  -- globally unique, no coordination needed
            SERIAL / BIGSERIAL              -- auto-increment, simpler but sequential
created_at  TIMESTAMPTZ                     -- always store with timezone (UTC)
price       NUMERIC(10, 2)                  -- exact decimal (never FLOAT for money!)
status      TEXT with CHECK constraint      -- or an ENUM type
is_active   BOOLEAN
metadata    JSONB                           -- binary JSON, indexable (Postgres)

-- ✗ Common mistakes:
VARCHAR(255) -- arbitrary limit; use TEXT in Postgres (same storage, no limit)
FLOAT/DOUBLE -- imprecise for money (0.1 + 0.2 ≠ 0.3)
DATETIME without timezone -- ambiguous when server moves or DST changes
storing arrays as comma-separated strings -- use array type or junction table
```

---

### Relationships

```sql
-- One-to-Many (most common): one user has many tasks
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    done BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ON DELETE CASCADE: deleting a user deletes all their tasks
-- ON DELETE RESTRICT: prevents deleting a user if they have tasks (default)
-- ON DELETE SET NULL: sets user_id to NULL (requires nullable column)

-- Many-to-Many: tasks can have many tags, tags can have many tasks
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE task_tags (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id  UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)  -- composite PK prevents duplicates
);

-- One-to-One: user has one profile (separate table for lazy loading / optional data)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    avatar_url TEXT
);
```

---

### Indexes — When and What to Index

```sql
-- Always index:
-- 1. Foreign keys (Postgres does NOT auto-index FKs — MySQL does)
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- 2. Columns frequently in WHERE clauses
CREATE INDEX idx_tasks_status ON tasks(status);

-- 3. Columns in ORDER BY / GROUP BY on large tables
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Composite indexes — column order matters
-- Rule: most selective / most commonly filtered column first
-- (user_id, status) helps queries filtering by user_id alone OR user_id + status
-- But NOT status alone
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);

-- Partial index — index only a subset of rows (smaller, faster)
CREATE INDEX idx_tasks_pending ON tasks(user_id)
WHERE done = false;  -- only indexes incomplete tasks

-- Index on expression
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
-- Enables: WHERE LOWER(email) = LOWER($1)

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
-- Indexes with idx_scan = 0 may be unused overhead
```

---

### Normalization in Practice

```sql
-- ✗ Denormalized — user info duplicated in every task row
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    user_id UUID,
    user_email TEXT,   -- duplicated!
    user_name TEXT,    -- duplicated!
    title TEXT
);
-- Problem: if user changes email, must update thousands of task rows

-- ✓ Normalized — single source of truth
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title TEXT
);
-- Email comes from users table via JOIN — always current

-- When to intentionally denormalize:
-- Read-heavy, rarely changes, JOIN is a measured bottleneck
-- Example: store username on posts for a feed (avoid join on every feed load)
-- Document the decision and the trade-off
```

---

### Soft Delete vs Hard Delete

```sql
-- Hard delete: row is gone — simple but irreversible
DELETE FROM tasks WHERE id = $1;

-- Soft delete: mark as deleted, keep the data
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMPTZ;

-- "Delete" operation
UPDATE tasks SET deleted_at = NOW() WHERE id = $1;

-- Query active tasks
SELECT * FROM tasks WHERE deleted_at IS NULL;

-- Use a view to hide deleted rows transparently
CREATE VIEW active_tasks AS
    SELECT * FROM tasks WHERE deleted_at IS NULL;

-- Trade-offs:
-- ✓ Recoverable, audit trail, can show "recently deleted"
-- ✗ All queries need WHERE deleted_at IS NULL (easy to forget!)
-- ✗ Table grows forever
-- ✗ Unique constraints don't work as expected (email can't be reused)
-- Fix for unique: partial unique index
CREATE UNIQUE INDEX idx_tasks_title_active
ON tasks(user_id, title) WHERE deleted_at IS NULL;
```

---

## Advanced Patterns

### Optimistic Locking

```sql
-- Add a version column to detect concurrent modifications
ALTER TABLE tasks ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;

-- Update only if version matches what we read
UPDATE tasks
SET title = $1, version = version + 1
WHERE id = $2 AND version = $3;

-- If 0 rows updated: someone else modified it → show conflict to user
```

```ts
async function updateTask(id: string, title: string, version: number) {
    const result = await db.query(
        'UPDATE tasks SET title = $1, version = version + 1 WHERE id = $2 AND version = $3 RETURNING *',
        [title, id, version]
    );
    if (result.rowCount === 0) {
        throw new ConflictError('Task was modified by someone else — please refresh');
    }
    return result.rows[0];
}
```

---

### Audit Trail

```sql
-- Approach 1: audit table (stores all changes)
CREATE TABLE task_audit (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL,
    action      TEXT NOT NULL,  -- 'INSERT' | 'UPDATE' | 'DELETE'
    old_data    JSONB,
    new_data    JSONB,
    changed_by  UUID,
    changed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-populate audit log
CREATE OR REPLACE FUNCTION audit_task() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO task_audit(task_id, action, old_data, new_data, changed_by)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) END,
        current_setting('app.current_user_id', true)::UUID
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION audit_task();
```

---

### Partitioning

```sql
-- Range partitioning by date — useful for large time-series tables
-- Each month is a separate physical table, queries on date ranges are faster
CREATE TABLE events (
    id UUID,
    user_id UUID,
    event_type TEXT,
    created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE events_2026_02 PARTITION OF events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Old partitions can be dropped instantly (vs slow DELETE)
-- Or detached and archived to cold storage
```

---

### Connection Pooling Deep Dive

```
Direct connections model:
App (100 instances) → 100 connections → Postgres (max_connections: 100)
Problem: 100 app instances × 20 connections each = 2000 → Postgres can't handle this

Connection pooler (PgBouncer) model:
App (100 instances) → PgBouncer → Postgres (20 real connections)
PgBouncer multiplexes thousands of app connections onto a small pool

PgBouncer modes:
- Session pooling: connection held for the lifetime of client session (least multiplexing)
- Transaction pooling: connection held for one transaction (most common, good for most apps)
- Statement pooling: most aggressive, but breaks transactions

Config rules of thumb:
- Postgres max_connections: 100-500 (depends on RAM — each connection uses ~5MB)
- PgBouncer pool size: (CPU cores × 2) + disk spindles (e.g. 10 cores → 25)
- App connection pool: (pool_size / num_instances)
```

---

## Most Asked Database Design Interview Questions

### "How would you design a schema for a task management app?"

```sql
-- Core tables and relationships
users         (id, email, name, created_at)
workspaces    (id, name, owner_id → users)
workspace_members (workspace_id, user_id, role)  -- many-to-many
projects      (id, workspace_id, name, status)
tasks         (id, project_id, assignee_id → users, title, description,
               status, priority, due_date, position, created_at)
task_comments (id, task_id, author_id → users, body, created_at)
tags          (id, workspace_id, name, color)
task_tags     (task_id, tag_id)                  -- many-to-many

-- Key indexes:
-- tasks(project_id, status)    -- filter by project + status
-- tasks(assignee_id)           -- "my tasks" view
-- tasks(due_date)              -- overdue tasks
-- task_comments(task_id)       -- fetch comments for a task
```

### "When would you denormalize?"

> Denormalize when: (1) you have a measured performance problem (EXPLAIN ANALYZE shows expensive joins), (2) the data changes rarely, (3) the read-to-write ratio heavily favors reads. Always document the denormalization — note which table is the source of truth and how the duplicate gets updated (trigger? application code? background job?). Never denormalize speculatively — normalize first, denormalize when you have evidence.

### "How do you handle a slow query in production?"

> 1) `EXPLAIN ANALYZE` — is it doing a Seq Scan on a large table? That's usually a missing index. 2) Look at the row count estimates vs actuals — large discrepancies mean stale statistics (`ANALYZE tablename`). 3) Add the missing index with `CREATE INDEX CONCURRENTLY` (doesn't lock the table). 4) If a JOIN is expensive, check that FK columns are indexed. 5) If pagination with OFFSET is slow on large offsets, switch to cursor-based pagination. 6) For recurring slow queries, add slow query logging (`log_min_duration_statement = 1000ms`).

### "How do you do a zero-downtime schema migration?"

> Never make breaking changes in one step. Use expand/contract: **Expand**: add new column as nullable (or with a default) — old code ignores it, new code writes to it. **Backfill**: `UPDATE` existing rows in batches (not one huge update — it locks the table). **Switch**: deploy code that reads from the new column. **Contract**: drop the old column once all instances are on the new code. Never rename a column in one step — add new, copy data, switch reads, drop old.
