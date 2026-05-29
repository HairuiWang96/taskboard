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

#### Connection pooling is NOT just a database concept

```
Connection pooling is a GENERAL pattern that applies to any resource that is:
  1. Expensive to create (TCP handshake, TLS, auth, process fork, etc.)
  2. Frequently needed (every request, every query, every call)
  3. Reusable (the connection can serve multiple requests over its lifetime)

The idea is always the same:
  Expensive to create + frequently needed = pool it
  Create N upfront → borrow when needed → return when done → reuse

Database connections get the most attention because they are the MOST
expensive (TCP + TLS + auth + Postgres forks a whole OS process per
connection), and apps hit the DB on nearly every request. But the same
pattern appears everywhere:
```

```
Where pooling is used beyond databases:

Resource        Pool                          Why pool it?
──────────────  ────────────────────────────  ─────────────────────────────────
Database        PgBouncer, HikariCP,          TCP + TLS + auth + process fork
                Sequelize pool, Prisma        = 30-100ms per connection

HTTP            http.Agent (Node.js),         TCP + TLS handshake = 20-50ms
                requests.Session (Python),    per request without keep-alive
                OkHttp pool (Java)

Threads         Java ExecutorService,         OS thread creation = ~1MB stack
                Nginx worker pool,            allocation + kernel scheduling
                Python ThreadPoolExecutor     overhead per thread

Redis           ioredis pool, Jedis pool,     Same as DB — TCP + auth overhead
                redis-py ConnectionPool       per connection

gRPC            gRPC channel pool             HTTP/2 channel setup is expensive,
                                              multiplexing helps but channels
                                              still have limits

WebSocket       Socket pool                   Handshake + HTTP upgrade = expensive
                                              per connection

DNS             OS DNS cache, Node.js         DNS lookup = network round-trip
                dns.resolve cache             (~5-50ms) for every request
```

```
Node.js HTTP Agent — a non-database pool you use every day:

  // WITHOUT pooling (keepAlive: false — the old default)
  fetch('https://api.stripe.com/charges')   // → TCP handshake (20ms)
                                             // → TLS handshake (30ms)
                                             // → request (5ms)
                                             // → connection CLOSED
  fetch('https://api.stripe.com/charges')   // → TCP again (20ms)
                                             // → TLS again (30ms)
                                             // → same request (5ms)
  // Total: 110ms for 2 requests

  // WITH pooling (keepAlive: true — default in Node 19+)
  const agent = new http.Agent({
    keepAlive: true,      // reuse connections (pool them)
    maxSockets: 50,       // max connections per host
    maxFreeSockets: 10,   // max idle connections kept open
  });
  fetch('https://api.stripe.com/charges', { agent })  // → TCP+TLS (50ms) + request (5ms)
  fetch('https://api.stripe.com/charges', { agent })  // → reuse connection (0ms) + request (5ms)
  // Total: 60ms for 2 requests — almost 2x faster

  // axios, got, undici all pool HTTP connections by default in modern versions.


Python requests.Session — same idea:

  # WITHOUT pooling
  requests.get('https://api.stripe.com/charges')  # new TCP+TLS every time
  requests.get('https://api.stripe.com/charges')  # new TCP+TLS again

  # WITH pooling
  session = requests.Session()                     # creates a connection pool
  session.get('https://api.stripe.com/charges')    # first call: TCP+TLS
  session.get('https://api.stripe.com/charges')    # reuses the connection


Java OkHttp — built-in pool:

  // OkHttp pools connections automatically
  // Default: max 5 idle connections, 5 min keep-alive
  OkHttpClient client = new OkHttpClient();  // one client = one pool
  // Every request through this client reuses connections


Thread pool — same pattern, different resource:

  // Java
  ExecutorService pool = Executors.newFixedThreadPool(10);
  pool.submit(() -> handleRequest());  // borrows a thread
  // thread returned to pool when task completes

  // Without pool: creating a new OS thread per request
  //   = ~1MB stack allocation + kernel scheduling each time
  // With pool: 10 threads created once, reused thousands of times
```

```
Interview-ready summary:

"Connection pooling is a general pattern for any resource that's expensive
to create but frequently needed — you create a fixed set upfront and
reuse them. It's most commonly associated with databases because DB
connections are the most expensive to establish — TCP, TLS, auth, and
Postgres even forks a new OS process per connection. But the same pattern
applies to HTTP connections, threads, Redis connections, and gRPC channels.
For example, Node.js's HTTP agent pools TCP connections with keep-alive,
and Java's ExecutorService pools OS threads. The principle is always the
same: create once, borrow, return, reuse."
```

---

#### What is a connection pool? (database-specific)

```
A connection pool is a cache of reusable database connections.

Without a pool:
  1. App needs data → opens a NEW TCP connection to the database
  2. TCP handshake (3 packets) + TLS handshake (if encrypted) + Postgres auth
  3. Query runs (maybe 5ms)
  4. Connection is closed
  5. Next request → repeat from step 1

  Problem: steps 1-2 take 20-50ms. The actual query takes 5ms.
           You spend MORE time connecting than querying.
           And each connection uses ~5-10MB of database RAM.

With a pool:
  1. App starts → pool opens N connections to the database and holds them open
  2. App needs data → borrows a connection from the pool (instant, <1ms)
  3. Query runs (5ms)
  4. Connection is returned to the pool (NOT closed)
  5. Next request → borrows the same connection again

  Result: zero connection overhead per request. Database sees a fixed,
          small number of connections instead of thousands.
```

#### Why it matters — the numbers

```
Creating a new Postgres connection:
  - TCP handshake:       ~1-3ms (local), ~20-50ms (cross-region)
  - TLS handshake:       ~5-30ms (if SSL required)
  - Postgres auth:       ~5-10ms (password + role lookup)
  - Process fork:        Postgres forks a new backend process per connection
  - Memory per conn:     ~5-10MB of Postgres RAM
  Total overhead:        ~30-100ms PER CONNECTION

  If your app handles 1000 req/sec without pooling:
    1000 × 50ms = 50 seconds of connection overhead per second
    → impossible. The database would collapse.

With a pool of 20 connections:
  - 20 connections created ONCE at startup
  - 1000 req/sec share those 20 connections
  - Each request waits <1ms to borrow a connection
  - Database is happy with 20 processes, ~100-200MB RAM
```

#### How a connection pool works internally

```
Pool lifecycle:

  STARTUP
  ┌───────────────────────────────────────────┐
  │ Pool creates `min` connections             │
  │ e.g., min: 5 → 5 connections ready         │
  └───────────────────────────────────────────┘

  REQUEST COMES IN
  ┌───────────────────────────────────────────┐
  │ Is there an idle connection in the pool?   │
  │                                            │
  │ YES → borrow it, mark as "in use"          │
  │ NO  → is pool at max size?                 │
  │       NO  → create new connection, use it  │
  │       YES → WAIT in queue until one frees  │
  │             (or timeout → error)           │
  └───────────────────────────────────────────┘

  REQUEST DONE
  ┌───────────────────────────────────────────┐
  │ Return connection to pool                  │
  │ Mark as "idle"                             │
  │ If pool > min and idle too long → close it │
  └───────────────────────────────────────────┘

Key pool settings:
  min (minimum connections): kept open even when idle. Avoids cold start.
  max (maximum connections): hard ceiling. Prevents database overload.
  idleTimeout: how long an idle connection lives before being closed.
  acquireTimeout: how long a request waits for a connection before erroring.
```

#### Direct connections vs pooling — visual

```
WITHOUT POOL (direct connections):

  Request 1  ──open──┤ query ├──close──
  Request 2     ──open──┤ query ├──close──
  Request 3        ──open──┤ query ├──close──
  Request 4           ──open──┤ query ├──close──
  
  DB sees: connections constantly opening/closing
  DB forks: new process for every single request
  Under load: max_connections hit → new requests REFUSED


WITH POOL:

  Pool        ═══════════════════════════════════  (connections stay open)
  Request 1   ─borrow─┤ query ├─return─
  Request 2      ─borrow─┤ query ├─return─
  Request 3         ─borrow─┤ query ├─return─
  Request 4            ─borrow─┤ query ├─return─
  
  DB sees: stable, fixed number of connections
  DB forks: done once at startup
  Under load: requests queue briefly, but DB stays healthy
```

#### Two levels of pooling

```
There are TWO places you can pool connections — and they solve different problems:

1. APPLICATION-LEVEL POOL (inside your app)
   ─────────────────────────────────────────
   Built into your ORM or database driver.
   Each app instance manages its own pool.

   App Instance 1  →  [pool: 10 connections]  →  Database
   App Instance 2  →  [pool: 10 connections]  →  Database
   App Instance 3  →  [pool: 10 connections]  →  Database
                                                  = 30 total connections

   Problem: when you scale to 50 app instances, that's 500 connections.
            Postgres typically handles 100-500 max.

2. EXTERNAL POOLER (between your apps and the database)
   ─────────────────────────────────────────────────────
   A separate process (PgBouncer, PgCat, RDS Proxy) that sits
   between ALL your app instances and the database.

   App Instance 1  ─┐
   App Instance 2  ─┤→  PgBouncer  →  [20 real connections]  →  Database
   App Instance 3  ─┘    (1000s of       (only 20 actual
   ...                    app conns)       DB connections)
   App Instance 50 ─┘

   PgBouncer multiplexes thousands of incoming connections
   onto a small number of real Postgres connections.

In production you often use BOTH:
   App pool (5 per instance) → PgBouncer (50 total) → Postgres (50 real connections)
```

#### External poolers compared

```
Tool         Who runs it        Best for                   Notes
──────────── ────────────────── ────────────────────────── ──────────────────────
PgBouncer    You (self-hosted)  Most common Postgres       Single-threaded, very
                                pooler. Battle-tested.     lightweight. Used by
                                                           most companies.

PgCat        You (self-hosted)  Multi-threaded PgBouncer   Newer, supports
                                alternative. Sharding.     load balancing + sharding.

RDS Proxy    AWS (managed)      AWS RDS / Aurora           Fully managed, no ops.
                                serverless apps            Higher latency (~1ms).
                                                           Good for Lambda.

Supabase     Supabase           Supabase projects          Built-in PgBouncer.
Pooler       (managed)                                     Uses transaction mode
                                                           by default.

PgBouncer modes:
  Session mode:     connection held until client disconnects (least sharing)
  Transaction mode: connection held for one transaction only (most common, best default)
  Statement mode:   connection returned after each statement (breaks multi-statement txns)
```

#### How different frameworks/ORMs handle pooling

```
─── Node.js ───────────────────────────────────────────────────────

pg (node-postgres) — built-in pool:
  const { Pool } = require('pg');
  const pool = new Pool({
    host: 'localhost',
    database: 'mydb',
    max: 20,              // max connections in pool
    idleTimeoutMillis: 30000,  // close idle connections after 30s
    connectionTimeoutMillis: 2000  // error if can't connect in 2s
  });
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  // connection is automatically returned to pool after query

Sequelize — built-in pool (uses pg underneath):
  const sequelize = new Sequelize('mydb', 'user', 'pass', {
    dialect: 'postgres',
    pool: {
      max: 10,       // maximum connections
      min: 2,        // minimum connections (kept warm)
      acquire: 30000, // max time (ms) to get a connection
      idle: 10000     // close idle connections after 10s
    }
  });

Prisma — built-in pool:
  // Set in DATABASE_URL:
  // postgresql://user:pass@host/db?connection_limit=10&pool_timeout=10
  // Prisma manages the pool automatically — fewer knobs to turn.

  // For serverless (Lambda, Vercel), use Prisma Accelerate or an external pooler
  // because each Lambda invocation would create its own pool otherwise.


─── Python ────────────────────────────────────────────────────────

SQLAlchemy — built-in pool:
  from sqlalchemy import create_engine
  engine = create_engine(
      'postgresql://user:pass@host/db',
      pool_size=10,          # maintained connections
      max_overflow=20,       # extra connections allowed under load
      pool_timeout=30,       # wait time before error
      pool_recycle=1800      # recycle connections after 30 min
  )

Django — built-in pool (Django 4.1+):
  DATABASES = {
      'default': {
          'CONN_MAX_AGE': 600,      # reuse connections for 10 min
          'CONN_HEALTH_CHECKS': True # check connection before reuse
      }
  }
  # Before Django 4.1: each request opened/closed a connection (slow).


─── Java / Spring ─────────────────────────────────────────────────

HikariCP — the standard Java pool (Spring Boot default):
  spring.datasource.hikari.maximum-pool-size=10
  spring.datasource.hikari.minimum-idle=5
  spring.datasource.hikari.idle-timeout=300000
  spring.datasource.hikari.connection-timeout=20000

  # HikariCP is considered the fastest Java pool.
  # Previously: C3P0, DBCP — both slower, less reliable.


─── Go ────────────────────────────────────────────────────────────

database/sql — built-in pool:
  db, _ := sql.Open("postgres", connStr)
  db.SetMaxOpenConns(25)       // max open connections
  db.SetMaxIdleConns(10)       // max idle connections
  db.SetConnMaxLifetime(5 * time.Minute)

  // Go's database/sql has pooling built into the standard library.
  // Every sql.Open returns a pool, not a single connection.
```

#### Serverless and connection pooling — the special problem

```
Serverless functions (AWS Lambda, Vercel, Cloudflare Workers) break
traditional pooling because:

  Traditional app:    1 process → 1 pool → N connections → shared across requests
  Serverless:         1000 invocations → 1000 pools → 1000 connections → DB dies

  Each Lambda invocation creates its own pool. Under load, you get
  thousands of pools × min connections each = connection explosion.

Solutions:
  1. External pooler: RDS Proxy, PgBouncer, Supabase Pooler
     Lambda → RDS Proxy → Database (Proxy manages the real connections)

  2. HTTP-based database access: Neon, PlanetScale, Supabase
     Instead of TCP connections, use HTTP/WebSocket — no pooling needed
     Lambda → HTTP → Database edge proxy → Database

  3. Prisma Accelerate / Prisma Data Proxy
     Lambda → HTTP → Prisma Proxy (with pool) → Database

Rule of thumb: if you're serverless, you NEED an external pooler or
               an HTTP-based database driver. App-level pools alone won't work.
```

#### Pool sizing — rules of thumb

```
Formula (from PostgreSQL wiki):
  pool_size = (CPU cores × 2) + number_of_disks
  Example:   8 cores, 1 SSD → (8 × 2) + 1 = 17 connections

  This is for the DATABASE side. For the APP side:
  app_pool_per_instance = total_db_pool / number_of_app_instances
  Example: 20 DB connections / 4 app instances = 5 per instance

Common mistakes:
  ✗ Setting pool too large (100+)
    → Postgres forks a process per connection, context switching kills performance
    → More connections ≠ more throughput. After ~20-50, performance DECREASES.

  ✗ Setting pool too small (1-2)
    → Requests queue up waiting for a connection
    → Latency spikes under any load

  ✗ No idleTimeout
    → Connections sit idle forever, wasting database memory

  ✗ Using connection pool with serverless without external pooler
    → Each function instance creates its own pool → connection explosion

Sweet spot for most apps:
  Small app (1-2 instances):     max: 10-20
  Medium app (5-10 instances):   max: 5-10 per instance + PgBouncer
  Large app (50+ instances):     max: 2-5 per instance + PgBouncer (required)
```

#### Interview — how to talk about connection pooling

```
"Connection pooling is maintaining a cache of reusable database connections
instead of opening and closing one for every request. Opening a Postgres
connection involves a TCP handshake, optional TLS, and authentication —
that's 30-100ms of overhead. With a pool, connections are created once at
startup and borrowed/returned per request, which reduces that to under 1ms.

At the app level, most ORMs have built-in pools — Sequelize, Prisma,
SQLAlchemy all do this. But when you scale horizontally to many app
instances, you need an external pooler like PgBouncer or RDS Proxy that
sits between all your instances and the database, multiplexing thousands
of app connections onto a small number of real database connections.

At Gophr, with multiple microservices each running their own pools,
managing total connection count across services was important to keep
Postgres healthy."
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
