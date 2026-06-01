# SQL & PostgreSQL — Senior Developer Deep Reference

**Priority: HIGH**

> Covers: query planning, EXPLAIN ANALYZE, index types, window functions, CTEs, transactions, locking, performance patterns, and common interview questions.

---

## Table of Contents

1. [How PostgreSQL Executes Queries](#1-how-postgresql-executes-queries)
2. [EXPLAIN ANALYZE](#2-explain-analyze)
3. [Index Types & Strategy](#3-index-types--strategy)
4. [Window Functions](#4-window-functions)
5. [CTEs — Common Table Expressions](#5-ctes--common-table-expressions)
6. [Subqueries vs JOINs](#6-subqueries-vs-joins)
7. [Transactions & Locking](#7-transactions--locking)
8. [VACUUM & Table Bloat](#8-vacuum--table-bloat)
9. [Advanced Query Patterns](#9-advanced-query-patterns)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. How PostgreSQL Executes Queries

### Query lifecycle‼️

```text
1. Parser       — validates SQL syntax, builds parse tree
2. Rewriter     — applies rules (e.g. view expansion)
3. Planner/Optimizer — generates multiple possible execution plans,
                       estimates cost of each, picks the cheapest
4. Executor     — runs the chosen plan, returns rows

The planner uses STATISTICS — stored estimates about data distribution.‼️
If stats are stale (table changed a lot since last ANALYZE), the planner
picks bad plans.‼️ ANALYZE updates the stats; ‼️ AUTOVACUUM runs it automatically.
```

### The cost model

```text
Planner assigns a cost to each operation:
  seq_page_cost     = 1.0   (reading a page sequentially)
  random_page_cost  = 4.0   (reading a page at random — seeks are expensive)
  cpu_tuple_cost    = 0.01  (processing each row)
  cpu_operator_cost = 0.0025

Lower cost = preferred plan.

Planner may choose a sequential scan over an index scan if:‼️
  - The table is small (sequential scan is fast)
  - The query returns a large % of rows (index adds overhead vs full scan)
  - WORK_MEM is low (can't do hash join in memory)

Always verify with EXPLAIN ANALYZE — planner estimates can be wrong.‼️
```

---

## 2. EXPLAIN ANALYZE

### What is EXPLAIN ANALYZE? (the simple version)

```text
Think of it like this:

  You ask the database: "find me all users who signed up this year and count their tasks"

  The database doesn't just "do it" — it makes a PLAN first.
  Like a GPS: there are multiple routes, it picks the fastest one.

  EXPLAIN = "show me the plan you'd use" (doesn't run the query)
  EXPLAIN ANALYZE = "actually run it AND show me the plan + real timing"

  Why do you care?
    Your query is slow. You don't know WHY. Is it the JOIN? The sort? A missing index?
    EXPLAIN ANALYZE shows you exactly where the time is spent, step by step.‼️

  It's like a performance profiler for SQL.
```

### How to read the output (step by step)

```text
The output is a TREE — read it from the INSIDE OUT, BOTTOM UP.‼️
The innermost/bottom-most step runs first. Each step feeds into the one above it.

Think of it like an assembly line:
  Step 1 (bottom): find the users  →  feeds into
  Step 2: find the tasks  →  feeds into
  Step 3: join them together  →  feeds into
  Step 4: group and count  →  feeds into
  Step 5 (top): sort the results  →  final output
```

```sql
EXPLAIN ANALYZE
  SELECT u.name, COUNT(t.id) as task_count
  FROM users u
  LEFT JOIN tasks t ON t.user_id = u.id
  WHERE u.created_at > '2024-01-01'
  GROUP BY u.id, u.name
  ORDER BY task_count DESC;

-- Example output (read BOTTOM UP):

-- ⑤ Sort  (cost=245..247 rows=1000) (actual time=15.3..15.4 rows=850)
--    ↑ Step 5: sort the final results by task_count DESC
--    "actual time=15.3..15.4" means it took 15.4ms total
--
--   → ④ HashAggregate  (cost=185..195 rows=1000) (actual time=14.1..14.6 rows=850)
--      ↑ Step 4: GROUP BY u.id, u.name + COUNT — aggregate into 850 groups
--
--     → ③ Hash Left Join  (cost=50..160 rows=5000) (actual time=2.1..11.5 rows=5000)
--        ↑ Step 3: join users with tasks using a hash table
--        Hash Cond: (t.user_id = u.id)
--        "rows=5000" means 5000 rows came out of the join
--
--       → ② Seq Scan on tasks t  (cost=0..90 rows=5000) (actual time=0.01..4.2 rows=5000)
--          ↑ Step 2: read ALL rows from tasks table (no filter on tasks, so full scan)
--
--       → ① Hash → Index Scan using idx_users_created_at on users u
--          (cost=0.28..40 rows=800) (actual time=0.05..1.7 rows=850)
--          ↑ Step 1: find users where created_at > '2024-01-01' using an index
--          Index Cond: (created_at > '2024-01-01')
--          "rows=850" means 850 users matched
--
-- Planning Time: 0.8 ms   ← time to figure out the plan
-- Execution Time: 15.6 ms ← total time to actually run the query
```

### Understanding the numbers

```text
Every step shows TWO sets of numbers:

  (cost=X..Y rows=Z)              ← PostgreSQL's GUESS before running
  (actual time=X..Y rows=Z)       ← what ACTUALLY happened

  cost=X..Y:
    X = startup cost — how long before the FIRST row comes out
    Y = total cost — how long to get ALL rows
    These are NOT milliseconds. They're arbitrary "cost units."
    Lower cost = planner thinks this plan is faster.

  actual time=X..Y:
    X = time to first row (milliseconds)
    Y = time to last row (milliseconds)
    These ARE real milliseconds. This is what you care about.

  rows:
    Estimated rows = planner's guess (based on table statistics)
    Actual rows = what really happened
    When these are VERY different → the planner made a bad choice
    → run ANALYZE to update statistics

  loops:
    How many times this step ran.
    If loops=100, multiply the actual time by 100 to get the real total time.
    Example: (actual time=0.1..0.5 rows=10 loops=100)
             Real total time = 0.5ms × 100 = 50ms (not 0.5ms!)
```

### Common scan types explained

```text
Seq Scan (Sequential Scan):
  Reads EVERY row in the table, one by one.
  Like reading a book from page 1 to the end to find one sentence.
  SLOW on large tables. FINE on small tables (<1000 rows).
  When you see this on a big table → you probably need an index.

Index Scan:
  Uses an index to jump directly to matching rows.
  Like using a book's index to find the page number for "EXPLAIN ANALYZE."
  FAST. This is what you want to see on large tables.

Index Only Scan:‼️
  Even better than Index Scan — gets all needed data FROM the index itself.
  Doesn't even look at the table rows. Like getting the answer from the
  book's index without turning to the page. Happens with "covering indexes."

Bitmap Index Scan + Bitmap Heap Scan:
  A middle ground between Seq Scan and Index Scan.‼️
  Step 1 (Bitmap Index Scan): use the index to build a "map" of which pages
    contain matching rows.
  Step 2 (Bitmap Heap Scan): read those pages from disk.
  Used when: many rows match the index condition (too many for Index Scan,
    too few for Seq Scan to be efficient).
```

### Common join types explained

```text
Nested Loop:
  For each row in table A, scan table B for matches.
  Like: for each student, look through all grades to find theirs.
  FAST when: inner table is small or has an index.
  SLOW when: both tables are large (100 × 100 = 10,000 lookups).

Hash Join:
  Step 1: build a hash table from the smaller table.
  Step 2: scan the larger table, probe the hash table for matches.
  Like: put all students in a phone book first, then look up each grade's student.
  FAST for large tables. Needs enough memory (work_mem) for the hash table.

Merge Join:
  Both tables are sorted on the join key, then walk through both simultaneously.
  Like: merging two sorted card decks.
  FAST when: both inputs are already sorted (from an index or prior sort).
  Rare — hash join is usually preferred unless data is already sorted.‼️
```

### Warning signs — what to look for

```text
1. "Seq Scan" on a table with 100K+ rows
   → Probably needs an index on the column in the WHERE clause
   → Fix: CREATE INDEX idx_name ON table(column);

2. Estimated rows=10 but actual rows=50,000
   → Statistics are stale — planner made a wrong guess
   → Fix: ANALYZE tablename;  (updates statistics)

3. Nested Loop with loops=10,000
   → The inner table is being scanned 10,000 times
   → Check if an index exists on the join column of the inner table
   → Multiply "actual time" by "loops" to get real time

4. Sort shows "Sort Method: external merge Disk"‼️
   → Data didn't fit in memory, had to sort on disk (SLOW)‼
   → Fix: SET work_mem = '256MB';  (give more memory for sorting)
   → Note: set per-session, not globally (each query gets this much)

5. Very high "actual time" on one specific step
   → That step is the bottleneck — focus your optimization there
   → The step's time INCLUDES all child steps below it‼️
   → To find the real time of just that step: subtract child times‼️

6. "Rows Removed by Filter: 999000" (filtered out almost everything)
   → The database read 1M rows but only kept 1000
   → This means there's no index, so it read everything then filtered
   → Fix: add an index so it only reads the 1000 rows it needs
```

### Real debugging example

```sql
-- Your query is slow. Let's debug it:
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 42 AND status = 'pending';

-- BAD output (no index):
-- Seq Scan on orders  (cost=0.00..25000.00 rows=3 width=100)
--                     (actual time=89.2..245.1 rows=3 loops=1)
--   Filter: ((user_id = 42) AND (status = 'pending'))
--   Rows Removed by Filter: 999997     ← read 1M rows, kept only 3!
-- Execution Time: 245.3 ms

-- Fix: add a composite index
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- GOOD output (with index):
-- Index Scan using idx_orders_user_status on orders
--   (cost=0.43..8.46 rows=3 width=100)
--   (actual time=0.02..0.04 rows=3 loops=1)
--   Index Cond: ((user_id = 42) AND (status = 'pending'))
-- Execution Time: 0.08 ms

-- 245ms → 0.08ms = 3000x faster, just by adding an index!
```

### Useful EXPLAIN options

```sql
-- Show buffer cache usage (hits = good, reads = disk I/O)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;

-- JSON format for tooling
EXPLAIN (ANALYZE, FORMAT JSON) SELECT ...;

-- Just the plan without executing (safe on writes)‼️
EXPLAIN SELECT ...;           -- no ANALYZE = no execution‼️
EXPLAIN UPDATE tasks SET ...; -- safe, doesn't actually run the UPDATE‼️
```

---

## 3. Index Types & Strategy

### B-tree (default)

```sql
-- Good for: equality, range, ORDER BY, LIKE 'prefix%'
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_users_email ON users(email);

-- B-tree supports:
-- =, <, <=, >, >=, BETWEEN, IN, IS NULL, LIKE 'abc%' (prefix only)
-- ORDER BY (eliminates sort step)
-- Used for: most standard queries

-- ✗ B-tree does NOT help with:‼️
-- LIKE '%suffix' (no prefix to seek on)
-- Full-text search
-- Array containment
```

### Composite index — column order matters

```sql
-- Composite index: covers queries on (a), (a, b), but NOT (b) alone‼️
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);

-- ✓ Uses the index:
SELECT * FROM tasks WHERE user_id = $1;
SELECT * FROM tasks WHERE user_id = $1 AND status = 'open';

-- ✗ Does NOT use the index (starts with second column):
SELECT * FROM tasks WHERE status = 'open'; -- full scan needed

-- Rule: put the most selective column first (highest cardinality)
-- Exception: if you always filter on both, put the equality column first‼️

-- Covering index: include non-key columns to avoid a "heap fetch"‼️
CREATE INDEX idx_tasks_user_covering ON tasks(user_id) INCLUDE (title, status);‼️
-- Query: SELECT title, status FROM tasks WHERE user_id = $1
-- With covering index: satisfied entirely from index, no heap access (index-only scan)

-- $1 is a parameter placeholder in PostgreSQL — it means "the first value passed in."‼️
-- $1 = first parameter, $2 = second, $3 = third, etc.
-- In app code: db.query('SELECT ... WHERE user_id = $1', [42]) → $1 becomes 42.
-- Why not just write the value directly?
--   1. Security: prevents SQL injection ($1 is always treated as data, never as SQL code).‼️
--   2. Performance: the database can cache and reuse the query plan.
-- In Drizzle ORM, you never write $1 — Drizzle generates it for you:
--   db.select().from(tasks).where(eq(tasks.userId, userId))
```

### Partial index

```sql
-- Index only a subset of rows — smaller, faster for targeted queries
CREATE INDEX idx_tasks_open ON tasks(created_at)
WHERE status = 'open';
-- Only indexes open tasks — much smaller if most tasks are closed

-- ✓ Uses this index:
SELECT * FROM tasks WHERE status = 'open' AND created_at > '2024-01-01';

-- ✗ Does NOT use it (condition doesn't match the WHERE clause):
SELECT * FROM tasks WHERE status = 'closed' AND created_at > '2024-01-01';

-- Use case: soft-delete — index only non-deleted rows
CREATE INDEX idx_users_active ON users(email) WHERE deleted_at IS NULL;
```

### GIN index (Generalized Inverted Index)‼️

```sql
-- Good for: arrays, JSONB, full-text search‼️
-- GIN indexes the elements/keys, not the row as a whole‼️

-- Array containment
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
SELECT * FROM posts WHERE tags @> ARRAY['javascript']; -- uses GIN index
-- @> means "contains"‼️

-- JSONB
CREATE INDEX idx_events_data ON events USING GIN(data);
SELECT * FROM events WHERE data @> '{"type": "click"}'; -- uses GIN index

-- Full-text search
CREATE INDEX idx_articles_search ON articles USING GIN(
  to_tsvector('english', title || ' ' || body)
);
SELECT * FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('javascript');
```

### Index maintenance

```sql
-- Check index usage (low scans + large size = useless index)‼️
SELECT
  indexrelname,
  idx_scan,        -- how many times the index was used
  idx_tup_read,    -- rows returned via index
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Rebuild a bloated index without locking
REINDEX INDEX CONCURRENTLY idx_tasks_created_at;

-- Add index without locking the table (takes longer)
CREATE INDEX CONCURRENTLY idx_new ON tasks(some_column);
-- Without CONCURRENTLY: locks the table for writes during creation‼️
```

---

## 4. Window Functions

### What window functions do

```sql
-- Window functions compute a value across a set of rows related to the current row‼️
-- Unlike GROUP BY, they don't collapse rows — each row keeps its own data‼️

-- Syntax:
function_name() OVER (
  PARTITION BY column  -- divide rows into groups (like GROUP BY but non-collapsing)
  ORDER BY column      -- order within the partition
  ROWS/RANGE BETWEEN   -- define the frame (subset of the partition)
)
```

### ROW_NUMBER, RANK, DENSE_RANK

```sql
-- ROW_NUMBER: unique sequential number (no ties)
-- RANK: same rank for ties, skips numbers after ties (1,1,3)
-- DENSE_RANK: same rank for ties, no gaps (1,1,2)

SELECT
  name,
  score,
  ROW_NUMBER() OVER (ORDER BY score DESC) AS row_num,   -- 1,2,3,4,5
  RANK()       OVER (ORDER BY score DESC) AS rank,      -- 1,1,3,4,5
  DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank -- 1,1,2,3,4
FROM players;

-- Per-group ranking (PARTITION BY)
SELECT
  user_id,
  task_title,
  created_at,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS task_num
FROM tasks;
-- task_num = 1 means the user's most recent task
```

### Practical: get the latest record per group

```sql
-- Common pattern: most recent row per user (without subquery)
SELECT user_id, task_title, created_at
FROM (
  SELECT
    user_id,
    task_title,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM tasks
) ranked
WHERE rn = 1;

-- In Drizzle ORM with raw SQL:
const latestPerUser = await db.execute(sql`
  SELECT user_id, task_title, created_at
  FROM (
    SELECT user_id, task_title, created_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM tasks
  ) ranked
  WHERE rn = 1
`);
```

### Aggregate window functions

```sql
-- Running total (cumulative sum)
SELECT
  date,
  revenue,
  SUM(revenue) OVER (ORDER BY date) AS running_total
FROM daily_revenue;

-- Moving average (last 7 days)
SELECT
  date,
  revenue,
  AVG(revenue) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS moving_avg_7d
FROM daily_revenue;

-- Percentage of total
SELECT
  category,
  amount,
  ROUND(amount / SUM(amount) OVER () * 100, 2) AS pct_of_total
FROM sales;
-- SUM(amount) OVER () = sum across ALL rows (no partition)

-- Lag/Lead: access previous or next row's value
SELECT
  date,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY date) AS prev_day_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY date) AS daily_change
FROM daily_revenue;
```

---

## 5. CTEs — Common Table Expressions

### Basic CTE

```sql
-- WITH clause: name a subquery and reference it like a table‼️
-- Makes complex queries readable — breaks into named steps

WITH active_users AS (
  SELECT id, name, email
  FROM users
  WHERE last_login > NOW() - INTERVAL '30 days'
    AND deleted_at IS NULL
),
user_task_counts AS (
  SELECT user_id, COUNT(*) AS task_count
  FROM tasks
  WHERE status = 'open'
  GROUP BY user_id
)
SELECT
  u.name,
  u.email,
  COALESCE(utc.task_count, 0) AS open_tasks
FROM active_users u
LEFT JOIN user_task_counts utc ON utc.user_id = u.id
ORDER BY open_tasks DESC;
```

### Recursive CTE (hierarchical data)

```sql
-- Use for: threaded comments, org charts, menu trees, category hierarchies‼️

-- Schema: categories with parent_id (self-referential)
CREATE TABLE categories (
  id INT PRIMARY KEY,
  name TEXT,
  parent_id INT REFERENCES categories(id)
);

-- Get all descendants of category 1 (any depth)
WITH RECURSIVE category_tree AS (
  -- Base case: the root
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE id = 1

  UNION ALL

  -- Recursive case: children of rows already in the result
  SELECT c.id, c.name, c.parent_id, ct.depth + 1
  FROM categories c
  JOIN category_tree ct ON ct.id = c.parent_id
)
SELECT * FROM category_tree ORDER BY depth, name;

-- Threaded comments (get full thread from root comment)
WITH RECURSIVE thread AS (
  SELECT id, content, parent_id, 0 AS level
  FROM comments WHERE id = $rootId

  UNION ALL

  SELECT c.id, c.content, c.parent_id, t.level + 1
  FROM comments c
  JOIN thread t ON t.id = c.parent_id
)
SELECT * FROM thread ORDER BY level;
```

### CTE vs subquery — when to use which

```sql
-- CTE: better readability, can be referenced multiple times, always materialized in PG < 12
-- Subquery: sometimes optimized better by planner (inlined into main query)

-- What does "materialized" mean?‼️
-- Materialized = the database runs the query ONCE and STORES the result (like a cache/snapshot).‼️
-- Not materialized (inlined) = the CTE is treated like a subquery — the planner can optimize
--   it together with the outer query, but it might run multiple times.
-- Think of it like: "materialized" = "make it real/physical" — instead of a virtual query
--   that runs on demand, it becomes a stored temporary result.‼️

-- PG 12+: CTEs are inlined by default (can be optimized by planner)
-- Force materialization (evaluate once):
WITH expensive AS MATERIALIZED (
  SELECT * FROM huge_table WHERE complex_condition
)
SELECT * FROM expensive WHERE x = 1
UNION ALL
SELECT * FROM expensive WHERE y = 2;
-- Without MATERIALIZED: expensive might run TWICE (once per reference).
-- With MATERIALIZED: runs ONCE, result is cached, both references read the cached result.‼️
```

### CTE vs View — what's the difference?

```sql
-- CTE = temporary, exists ONLY for the duration of ONE query, then gone.
-- View = permanent (saved in the database), reusable across any query, by anyone.

-- CTE: exists ONLY within this single query
WITH active_users AS (
    SELECT * FROM users WHERE status = 'active'
)
SELECT * FROM active_users WHERE age > 25;
-- after this query runs, "active_users" no longer exists

-- View: saved in the database permanently, usable by anyone anytime
CREATE VIEW active_users AS
    SELECT * FROM users WHERE status = 'active';

SELECT * FROM active_users WHERE age > 25;   -- works forever
SELECT COUNT(*) FROM active_users;            -- works from anywhere
-- persists until you DROP VIEW active_users;

-- CTE vs View comparison:
--   Lifetime:       CTE = one query only          | View = permanent until dropped
--   Stored in DB:   CTE = no                      | View = yes (as a saved query definition)
--   Reusable:       CTE = no, must rewrite        | View = yes, use it like a table
--   Recursive:      CTE = yes (WITH RECURSIVE)    | View = no
--   Permissions:    CTE = no                      | View = yes (GRANT access to a view)
--   Performance:    CTE = inlined by optimizer     | View = same (re-runs query each time)
--   Use case:       CTE = break complex query      | View = reusable abstraction, security
--                   into readable steps            |   (hide columns), simplify common queries

-- Common misconception: a regular view does NOT store data.
-- It's just a saved SQL query that runs every time you SELECT from it.
-- It's basically a permanent CTE with a name.
--
-- If you want a view that actually CACHES the result on disk:
-- → Materialized View (must be manually refreshed with REFRESH MATERIALIZED VIEW)
```

---

## 6. Subqueries vs JOINs

```sql
-- Correlated subquery: runs once PER ROW — often slow
SELECT u.name,
  (SELECT COUNT(*) FROM tasks WHERE tasks.user_id = u.id) AS task_count
FROM users u;
-- For 1000 users: 1001 queries (1 for users, 1 per user for count)‼️

-- ✓ Rewrite as JOIN + GROUP BY: one query
SELECT u.name, COUNT(t.id) AS task_count
FROM users u
LEFT JOIN tasks t ON t.user_id = u.id
GROUP BY u.id, u.name;

-- EXISTS vs IN:
-- IN: evaluates the subquery, builds a list, checks membership
-- EXISTS: stops as soon as it finds one match — often faster‼️

-- ✗ IN can be slow for large subquery results
SELECT * FROM users
WHERE id IN (SELECT user_id FROM tasks WHERE status = 'open');

-- ✓ EXISTS: short-circuits
SELECT * FROM users u
WHERE EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.user_id = u.id AND t.status = 'open'
);

-- Modern Postgres: optimizer often rewrites IN as EXISTS anyway‼️
-- Use EXPLAIN to verify which plan it chose
```

---

## 7. Transactions & Locking

### Isolation levels

```sql
-- PostgreSQL isolation levels (weakest to strongest):‼️

READ COMMITTED (default):
  Each statement sees data committed before THAT statement started.
  Problem: non-repeatable reads — same row read twice in a tx can give different results.

REPEATABLE READ:
  All statements in the tx see a snapshot from tx start.
  Protects: non-repeatable reads.
  Problem: phantom reads (new rows inserted by other txs might be invisible... mostly).

SERIALIZABLE:
  Strongest. Transactions appear to run one after another.
  Protects everything. Slowest — more aborts/retries.

SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
  SELECT balance FROM accounts WHERE id = 1; -- snapshot taken here
  -- Other tx commits a change to balance — you still see original value
  SELECT balance FROM accounts WHERE id = 1; -- same result
COMMIT;
```

### Locking patterns

```sql
-- SELECT FOR UPDATE: lock the rows you're reading (prevent concurrent modification)
BEGIN;
  SELECT * FROM accounts WHERE id = 1 FOR UPDATE; -- locks this row
  -- Other transactions trying to FOR UPDATE the same row will WAIT
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- FOR UPDATE SKIP LOCKED: claim work without blocking (job queues)
BEGIN;
  SELECT * FROM job_queue
  WHERE status = 'pending'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- skip rows locked by other workers
  -- Update the claimed job
  UPDATE job_queue SET status = 'processing' WHERE id = $claimedId;
COMMIT;
-- Multiple workers can safely claim different jobs concurrently

-- Advisory locks: application-level locks (no table involved)
SELECT pg_try_advisory_lock(12345); -- returns true if lock acquired, false if taken
SELECT pg_advisory_unlock(12345);
-- Use for: distributed mutex, preventing concurrent cron jobs
-- What is a mutex? (mutual exclusion)‼️
-- A mutex is a lock that ensures ONLY ONE process/thread can access a resource at a time.‼️
-- Think of it like a bathroom with one key — only one person can use it, everyone else waits.
-- Without mutex:
--   Worker A reads balance=$100, Worker B reads balance=$100 (before A writes),
--   A writes $50, B writes $70 → WRONG! Lost A's update.
-- With mutex:
--   Worker A acquires lock → reads $100 → writes $50 → releases lock
--   Worker B waits → acquires lock → reads $50 → writes $20 → correct ✓
-- pg_try_advisory_lock acts as a mutex here — if one cron job grabs the lock,
-- other instances see "false" (lock taken) and skip, preventing duplicate runs.‼️
```

### Deadlocks

```sql
-- Deadlock: two transactions each hold a lock the other needs
-- PostgreSQL detects and kills one of them (ERROR: deadlock detected)

-- Prevention: always acquire locks in the same ORDER across all transactions
-- ✗ Tx1: locks account 1, then 2 | Tx2: locks account 2, then 1 → deadlock
-- ✓ Tx1 and Tx2: always lock lower ID first → no deadlock‼️

-- In application code with Drizzle:
await db.transaction(async (tx) => {
  const [fromAccount, toAccount] = [Math.min(a, b), Math.max(a, b)]; // consistent order
  const from = await tx.select().from(accounts)
    .where(eq(accounts.id, fromAccount)).for('update').get();
  const to   = await tx.select().from(accounts)
    .where(eq(accounts.id, toAccount)).for('update').get();
  // ... transfer logic
});
```

---

## 8. VACUUM & Table Bloat

### Why VACUUM exists

```text
PostgreSQL uses MVCC (Multi-Version Concurrency Control):‼️
  Updates don't overwrite rows — they mark old rows as "dead" and insert new ones.
  Deletes mark rows as "dead" — they stay on disk.

Dead rows ("dead tuples") accumulate over time → table bloat.‼️
Old transaction IDs accumulate → transaction ID wraparound (catastrophic).‼️

VACUUM: reclaims dead tuples, updates visibility map, prevents XID wraparound.‼️
VACUUM FULL: reclaims disk space (requires table lock, rarely needed).
AUTOVACUUM: background process that runs VACUUM automatically.‼️
```

```sql
-- Check table bloat
SELECT
  relname AS table_name,
  n_dead_tup AS dead_tuples,
  n_live_tup AS live_tuples,
  ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Manual vacuum (non-blocking):‼️
VACUUM tasks;

-- Update statistics only:‼️
ANALYZE tasks;

-- Both:
VACUUM ANALYZE tasks;‼️

-- Reclaim disk space (locks table — avoid in production during peak hours):‼️
VACUUM FULL tasks;
```

---

## 9. Advanced Query Patterns

### Upsert (INSERT OR UPDATE)

```sql
-- ON CONFLICT: handle constraint violations instead of erroring
INSERT INTO users (email, name, updated_at)
VALUES ('user@example.com', 'Alice', NOW())
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,         -- EXCLUDED = the row that was rejected
      updated_at = EXCLUDED.updated_at;

-- Only update if something actually changed (avoid unnecessary writes):
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name
  WHERE users.name IS DISTINCT FROM EXCLUDED.name; -- skip if same value

-- Ignore duplicates entirely:
INSERT INTO user_events (user_id, event_type)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- In Drizzle:
await db.insert(users)
  .values({ email, name })
  .onConflictDoUpdate({
    target: users.email,
    set: { name, updatedAt: new Date() },
  });
```

### Bulk operations

```sql
-- Insert many rows at once (one round trip)
INSERT INTO tasks (title, user_id, status)
VALUES
  ('Task 1', 1, 'open'),
  ('Task 2', 1, 'open'),
  ('Task 3', 2, 'open');

-- In Drizzle:
await db.insert(tasks).values([
  { title: 'Task 1', userId: 1 },
  { title: 'Task 2', userId: 1 },
  { title: 'Task 3', userId: 2 },
]);

-- COPY: fastest for bulk imports (CSV → table)‼️
COPY tasks (title, user_id) FROM '/path/to/data.csv' CSV HEADER;
```

### JSONB queries

```sql
-- JSONB: stored in binary format (faster, supports indexing)
-- JSON: stored as text (exact whitespace preserved)

-- Accessing JSONB fields
SELECT data->>'name' AS name        -- text value (double arrow)
FROM events;
SELECT data->'address'->'city'      -- nested (returns JSONB)
FROM events;

-- Filtering on JSONB
SELECT * FROM events
WHERE data->>'type' = 'click';                     -- equality
WHERE data @> '{"type": "click", "page": "home"}'; -- contains (GIN index helps)
WHERE data ? 'optional_field';                     -- key exists

-- Update a specific JSONB field
UPDATE events
SET data = jsonb_set(data, '{status}', '"processed"')
WHERE id = $1;

-- Expand JSONB array to rows‼️
SELECT jsonb_array_elements(data->'tags') AS tag FROM posts;
```

### Pagination patterns

```sql
-- Offset pagination (simple, gets slower as offset grows)‼️
SELECT * FROM tasks ORDER BY created_at DESC LIMIT 20 OFFSET 200;
-- Problem: DB must scan and skip 200 rows — slow on large tables

-- Keyset / cursor pagination (fast regardless of page number)‼️
-- First page:
SELECT * FROM tasks ORDER BY created_at DESC, id DESC LIMIT 20;
-- Next page: pass last row's values as cursor
SELECT * FROM tasks
WHERE (created_at, id) < ($lastCreatedAt, $lastId) -- use the composite key
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- DB seeks directly to cursor position — O(log n) regardless of depth‼️
```

---

## 10. Common Interview Questions

### "What is the difference between INNER JOIN and LEFT JOIN?"

> INNER JOIN returns only rows that have matches in BOTH tables. LEFT JOIN returns ALL rows from the left table, with NULL values for right-table columns when there's no match. Use LEFT JOIN when you want to keep rows from the left table even if they have no related data (e.g., users with no tasks).

### "How do you optimize a slow query?"‼️

> 1. Run `EXPLAIN ANALYZE` to see the execution plan. 2. Check for Seq Scan on large tables — usually needs an index. 3. Check estimated vs actual row counts — huge mismatch means stale stats, run `ANALYZE`. 4. Check for N+1 patterns — nested loops with many iterations. 5. Check if `work_mem` is causing disk sorts. 6. Add a missing index. 7. Rewrite correlated subqueries as JOINs. 8. Use a covering index to avoid heap fetches.

### "What is a window function and when would you use one?"

> Window functions compute a value across a set of rows related to the current row, without collapsing the rows (unlike GROUP BY). Use cases: ranking within a group (ROW_NUMBER OVER PARTITION BY), running totals (SUM OVER ORDER BY), getting the latest row per user (ROW_NUMBER = 1 filter), lag/lead comparisons between consecutive rows.

### "What is MVCC?"

> Multi-Version Concurrency Control — PostgreSQL's strategy for handling concurrent transactions. Instead of locking rows on update, Postgres creates a new version of the row and marks the old one as dead. Readers see a snapshot of the data at their transaction start time — they never block writers and writers never block readers. Dead rows are cleaned up by VACUUM.

### "What is the difference between a CTE and a subquery?"

> Both define a named result set used in a query. A CTE (`WITH` clause) is more readable, can be self-referential (recursive), and can be referenced multiple times. In PostgreSQL 12+, CTEs are inlined by default (same as subqueries for the planner). Before PG 12, CTEs were always materialized (evaluated once, not re-optimized with the outer query). For complex, multi-step queries: use CTEs for readability. For simple single-use cases: subquery is fine.

### "How do you prevent N+1 queries?"

> Use JOINs or eager loading instead of looping and querying. In Drizzle: use `db.query.users.findMany({ with: { tasks: true } })` which generates a JOIN. In raw SQL: JOIN and aggregate in one query. In application code: batch IDs and use a single `WHERE id IN (...)` query rather than one query per ID.

---

## Most Asked SQL Interview Questions

### "What is the difference between INNER, LEFT, RIGHT, and FULL JOIN?"

> `INNER JOIN` — only rows that match in BOTH tables. `LEFT JOIN` — all rows from the left table, matched rows from right (NULLs where no match). `RIGHT JOIN` — all rows from the right, matched from left. `FULL OUTER JOIN` — all rows from both, NULLs where no match on either side. In practice: LEFT JOIN is by far the most common. RIGHT JOIN is always rewritable as a LEFT JOIN with tables swapped.

```sql
-- All users, even those with no orders (LEFT JOIN)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;

-- Only users who HAVE orders (INNER JOIN)
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON o.user_id = u.id;
```

### "What is the difference between WHERE and HAVING?"

> `WHERE` filters rows BEFORE grouping — it operates on individual rows and cannot use aggregate functions. `HAVING` filters AFTER grouping — it operates on groups and can use aggregates. You need `GROUP BY` to use `HAVING`.

```sql
-- WHERE: filter before grouping
SELECT department, AVG(salary)
FROM employees
WHERE active = true          -- filter individual rows first
GROUP BY department
HAVING AVG(salary) > 70000;  -- then filter groups
```

### "What are indexes and how do they work?"

> An index is a separate data structure (usually a B-tree) ‼️ that stores column values sorted, with pointers to rows. Queries on indexed columns skip full table scans. Trade-off: faster reads, slower writes (index must be updated on INSERT/UPDATE/DELETE), extra storage. Always index: foreign keys, columns in WHERE/JOIN/ORDER BY, high-cardinality columns. Avoid indexing every column — over-indexing hurts write performance.

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index — useful when filtering/sorting by both columns together
-- Order matters: (last_name, first_name) helps queries on last_name alone,
-- but NOT first_name alone
CREATE INDEX idx_name ON users(last_name, first_name);

-- Check if a query uses an index
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com';
```

### "What are window functions?"

> Window functions perform calculations across a set of rows related to the current row without collapsing them into a group (unlike `GROUP BY`). ‼️ The `OVER()` clause defines the window. Key functions: `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `LAG()`/`LEAD()` (access previous/next row), `SUM()`/`AVG()` as running totals.

```sql
-- Rank employees by salary within each department
SELECT
    name,
    department,
    salary,
    RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rank,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
    LAG(salary)  OVER (PARTITION BY department ORDER BY salary DESC) AS prev_salary
FROM employees;

-- Running total
SELECT date, amount,
    SUM(amount) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) AS running_total
FROM transactions;
```

### "What is a CTE (Common Table Expression) and why use it?"

> A CTE (`WITH` clause) is a named temporary result set scoped to the query. Benefits: readability (break complex queries into named steps), reusability within the same query, and enabling recursion. Recursive CTEs can walk trees and hierarchies.

```sql
-- Readable: break into steps
WITH active_users AS (
    SELECT id, name FROM users WHERE active = true
),
high_value_orders AS (
    SELECT user_id, SUM(total) AS lifetime_value
    FROM orders
    GROUP BY user_id
    HAVING SUM(total) > 1000
)
SELECT u.name, o.lifetime_value
FROM active_users u
JOIN high_value_orders o ON o.user_id = u.id;

-- Recursive: walk org hierarchy
WITH RECURSIVE org_tree AS (
    SELECT id, name, manager_id, 0 AS level
    FROM employees WHERE manager_id IS NULL   -- root
    UNION ALL
    SELECT e.id, e.name, e.manager_id, t.level + 1
    FROM employees e
    JOIN org_tree t ON t.id = e.manager_id   -- join to parent
)
SELECT * FROM org_tree ORDER BY level;
```

### "What is the difference between `DELETE`, `TRUNCATE`, and `DROP`?"

> `DELETE` removes rows one by one, fires triggers, can be rolled back, can have WHERE clause. `TRUNCATE` removes ALL rows at once — faster (doesn't log individual rows), resets auto-increment, cannot have WHERE, can be rolled back in PostgreSQL (not MySQL). `DROP` removes the entire table structure and all data — cannot be rolled back.

### "What are transactions and the ACID properties?"

> A transaction is a group of operations that execute as an atomic unit. ACID: **Atomicity** — all or nothing; if one operation fails, all are rolled back. **Consistency** — data always moves from one valid state to another. **Isolation** — concurrent transactions don't interfere (controlled by isolation level). **Durability** — committed transactions survive crashes (written to disk).

```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
  -- If either fails, ROLLBACK undoes both
COMMIT;
```

### "What are the SQL isolation levels?"

> Isolation levels control what concurrent transactions can see. From least to most strict: **READ UNCOMMITTED** (can read uncommitted changes — dirty reads). **READ COMMITTED** (only reads committed data — default in most DBs‼️). **REPEATABLE READ** (same query returns same rows within transaction). **SERIALIZABLE** (transactions execute as if serial — no phantom reads). Higher isolation = fewer anomalies but more locking/contention.

### "What is normalization? Explain 1NF, 2NF, 3NF."

> Normalization reduces redundancy and improves data integrity by organizing tables. **1NF**: each column holds atomic values (no arrays/sets), each row is unique. **2NF**: 1NF + every non-key column fully depends on the whole primary key (eliminates partial dependencies — relevant for composite keys). **3NF**: 2NF + no transitive dependencies (non-key columns don't depend on other non-key columns). In practice, aim for 3NF; denormalize deliberately for read performance.

### "What is the N+1 query problem?"

> N+1 happens when you fetch N records then run 1 additional query per record to get related data — 1 + N queries total instead of 1. Fix: use a JOIN or `IN` clause to fetch all related data in one query, or use an ORM's eager loading.

```sql
-- N+1: 1 query for posts + 1 query per post for author = 1 + N queries
SELECT * FROM posts;
-- then for each post: SELECT * FROM users WHERE id = post.user_id

-- Fix: single JOIN — always 1 query
SELECT p.title, u.name AS author
FROM posts p
JOIN users u ON u.id = p.user_id;
```

### "What is EXPLAIN and how do you read it?"

> `EXPLAIN` (or `EXPLAIN ANALYZE`) shows the query execution plan — how the database will (or did) retrieve data. Key things to look for: **Seq Scan** on large tables = missing index. **Nested Loop** with large row counts = potential performance problem. **cost** = estimated work, **actual time** (with ANALYZE) = real time. **rows** = estimated vs actual row count — large differences indicate stale statistics.

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 42 AND status = 'pending';

-- If you see: Seq Scan on orders (cost=0.00..15420.00 rows=1234320)
-- → add an index on (user_id, status)
-- After: Index Scan using idx_orders_user_status (cost=0.43..8.46 rows=3)
```
