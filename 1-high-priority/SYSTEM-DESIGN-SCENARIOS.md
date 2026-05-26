# System Design — Real-World Scenario Questions

> These are the kind of questions interviewers ask to test if you can actually
> operate a system, not just draw boxes on a whiteboard.
> Each scenario gives you the situation, then walks through how to think about it.

---

## Category 1: Diagnosing Issues Under High Traffic

### Scenario 1.1: Consistency Breaks Only Under High Traffic

**Situation:** Your e-commerce app shows correct inventory counts during low traffic,
but during flash sales (high traffic), users see stale stock counts — some even
purchase items that are already sold out.

**How to diagnose:**

```
Step 1: Identify the read path
  - Where is the inventory count being read from?
  - Is it hitting the DB directly, or a cache (Redis), or a read replica?

Step 2: Check for stale reads
  - If using read replicas: replication lag under high load
    → Replicas can fall behind the primary by seconds or even minutes
    → During low traffic, lag is negligible so you never notice
  - If using cache: cache TTL is masking stale data
    → During low traffic, writes are infrequent so cache is usually fresh
    → During high traffic, hundreds of purchases happen within a cache TTL window

Step 3: Check for race conditions
  - Are you doing "read stock → check > 0 → decrement" without a lock?
  - Under low traffic: requests are sequential, no collision
  - Under high traffic: 100 requests read stock=1 simultaneously, all proceed

Step 4: Metrics to look at
  - Replication lag (seconds behind master)
  - Cache hit rate vs. cache staleness
  - DB lock wait time / deadlock count
  - Request latency p99 (are some requests queuing?)
```

**Solutions (pick based on constraints):**

```
Option A: Strong consistency for writes (simplest)
  - Route all inventory reads AND writes to the primary DB
  - Use SELECT ... FOR UPDATE (pessimistic lock)
  - Tradeoff: higher latency, primary becomes bottleneck under load

Option B: Optimistic locking with versioning
  - Add a "version" column to inventory table
  - UPDATE inventory SET stock = stock - 1, version = version + 1
    WHERE item_id = X AND version = Y AND stock > 0
  - If affected_rows = 0 → conflict, retry or reject
  - Tradeoff: retries under contention, but no blocking locks

Option C: Redis atomic decrement (best for flash sales)
  - Pre-load stock into Redis: SET item:123:stock 500
  - On purchase: DECR item:123:stock → if result >= 0, proceed
  - Redis is single-threaded, DECR is atomic — no race condition
  - Async sync back to DB for persistence
  - Tradeoff: Redis is now source of truth temporarily, need recovery strategy

Option D: Queue-based serialisation
  - All purchase requests go to a queue (Kafka/SQS)
  - Single consumer processes them in order
  - Tradeoff: latency (user waits for queue processing), but zero overselling
```

---

### Scenario 1.2: API Latency Spikes During Peak Hours

**Situation:** Your API has p50 latency of 50ms normally, but during peak hours
p99 jumps from 200ms to 3 seconds. Users complain about timeouts.

**How to diagnose:**

```
Step 1: Where is the time being spent?
  - Add distributed tracing (Jaeger/Datadog APM) if not already in place
  - Break down: network → app processing → DB query → external API call
  - Is it one specific endpoint or all endpoints?

Step 2: Check the database
  - Slow query log: are certain queries degrading under load?
  - Connection pool exhaustion: all connections in use → requests queue
    → Check active connections vs pool size
  - Lock contention: writes blocking reads (or vice versa)
  - Missing indexes that only matter at scale (seq scan on large table)

Step 3: Check the application
  - Thread/worker pool exhaustion (all workers busy)
  - Memory pressure → garbage collection pauses (especially Java/Go)
  - CPU saturation → context switching overhead
  - Connection pool to downstream services exhausted

Step 4: Check infrastructure
  - Network: is there bandwidth saturation between services?
  - Load balancer: is one server getting disproportionate traffic?
  - Auto-scaling: are new instances spinning up too slowly?
  - Noisy neighbour: shared infra (multi-tenant) being hogged
```

**Solutions:**

```
Immediate (fire-fighting):
  - Scale horizontally (add instances)
  - Increase connection pool sizes
  - Add/tune caching for hot queries
  - Enable circuit breakers for slow downstream services

Medium-term:
  - Add read replicas for read-heavy queries
  - Optimise slow queries (indexes, query rewriting)
  - Implement request queuing with backpressure
  - Pre-compute expensive aggregations

Long-term:
  - Separate read and write paths (CQRS)
  - Move hot data to a cache layer (Redis)
  - Shard the database
  - Async processing for non-critical work
```

---

### Scenario 1.3: Thundering Herd After a Cache Failure

**Situation:** Your Redis cache server restarted. Immediately after, your database
CPU hits 100% and the entire service goes down.

**How to diagnose:**

```
Root cause: every request is now a cache miss → all hit DB simultaneously
This is the "thundering herd" or "cache stampede" problem.

Why it didn't happen before:
  - Cache was absorbing 95%+ of read traffic
  - DB was sized for 5% of actual read load
  - When cache disappears, DB gets 20x the traffic it can handle
```

**Solutions:**

```
Prevention:
  1. Cache warming: pre-populate cache on startup before taking traffic
     - Read top 10K hot keys from DB, populate cache
     - Only then mark the service as "ready" in health check

  2. Request coalescing / single-flight:
     - If key X is being fetched, all other requests for X wait for
       the first result instead of all hitting DB independently
     - Libraries: Go's singleflight, custom lock-per-key in Redis

  3. Staggered TTL:
     - Don't expire all keys at the same time
     - TTL = base_ttl + random(0, jitter_seconds)
     - Prevents synchronized mass expiry

  4. Circuit breaker on DB:
     - If DB error rate > threshold → return degraded response (stale cache,
       default values, "try again later")
     - Prevents DB from being hammered when it's already overloaded

  5. Multi-layer cache:
     - L1: in-process cache (small, fast, per-instance)
     - L2: Redis cluster (shared, larger)
     - L1 survives even if L2 goes down

  6. Redis high availability:
     - Redis Sentinel or Redis Cluster with replicas
     - Auto-failover so cache rarely fully disappears
```

---

## Category 2: Working with Limited Resources and Constraints

### Scenario 2.1: DynamoDB Hot Partition / Throttling

**Situation:** You're using DynamoDB. You have 10,000 provisioned WCU (Write Capacity Units)
spread across your table. But writes to certain items are getting throttled
even though your total usage is only 3,000 WCU. What's happening?

**How to diagnose:**

```
Root cause: DynamoDB distributes capacity across partitions.
If your partition key is poorly chosen, one partition gets
disproportionate traffic → "hot partition" problem.

Example:
  Table has 4 partitions → each gets 2,500 WCU
  If 80% of writes go to partition 1 → 2,400 WCU on one partition
  → That partition hits its limit even though total is under 10,000

How to confirm:
  - CloudWatch metric: ConsumedWriteCapacityUnits per partition
  - Check for "ProvisionedThroughputExceededException" in logs
  - Analyse partition key distribution — is it skewed?
```

**Solutions:**

```
Option A: Fix the partition key (best long-term solution)
  - Bad key: date (2024-01-15) → all writes for a day hit one partition
  - Bad key: status (ACTIVE/INACTIVE) → only 2 partitions ever used
  - Good key: userId, orderId — high cardinality, even distribution
  - If you need date queries: use composite key (date#userId)

Option B: Write sharding (scatter-gather)
  - Append a random suffix to partition key: "2024-01-15#3"
  - Use N shards (e.g., 0-9), so writes spread across 10 partitions
  - Reads need to query all N shards and merge
  - Tradeoff: read complexity increases

Option C: DynamoDB On-Demand mode
  - No provisioned capacity — auto-scales per request
  - Handles spikes without pre-planning
  - Tradeoff: more expensive at steady high throughput

Option D: Buffer writes through SQS/Kinesis
  - Instead of writing directly to DynamoDB, put events in a queue
  - Consumer writes at a controlled, even rate
  - Tradeoff: eventual consistency on writes, added latency

Option E: Use DynamoDB DAX (caching)
  - In-memory cache in front of DynamoDB
  - Absorbs read hotspots
  - Doesn't help with write hotspots though
```

---

### Scenario 2.2: Limited Budget — Can't Scale the Database

**Situation:** Your PostgreSQL database is at 80% CPU. You can't upgrade to a bigger
instance (budget freeze). You can't add read replicas (takes weeks to provision
in your org). Your PM says the feature must ship next week. What do you do?

**Strategy (practical, time-constrained):**

```
Day 1: Quick wins — query optimisation
  - Run EXPLAIN ANALYSE on top 10 slowest queries (from pg_stat_statements)
  - Add missing indexes (often gives 10-100x improvement)
  - Fix N+1 queries (common in ORMs — one query becomes 100)
  - Remove unnecessary SELECT * → select only needed columns
  - Check for sequential scans on large tables

Day 2: Caching layer
  - Add Redis in front of DB for read-heavy queries
  - Cache results of expensive aggregation queries
  - Even 5-minute TTL can reduce DB load by 80% for dashboards/reports
  - Application-level caching (memoize within request lifecycle)

Day 3: Reduce unnecessary load
  - Are there cron jobs or batch processes hitting the DB during peak hours?
    → Move them to off-peak
  - Are there monitoring queries or dashboards polling every second?
    → Reduce frequency
  - Are there unused indexes consuming write overhead?
    → Drop them
  - Connection pooling: use PgBouncer to reduce connection overhead

Day 4-5: Architectural changes if needed
  - Move analytics/reporting queries to a separate read replica
    (even if it takes time, start the process)
  - Denormalise frequently joined tables
  - Pre-compute aggregations (materialised views)
  - Archive old data to cold storage (move orders > 1 year old to archive table)
```

---

### Scenario 2.3: Migrating a Critical Table Without Downtime

**Situation:** You need to add a column to a table with 500M rows in production.
ALTER TABLE will lock the table for hours. You can't have downtime.

**Strategy:**

```
Option A: Online schema change (pt-online-schema-change / gh-ost)
  - Creates a shadow copy of the table with new schema
  - Copies data in chunks while keeping a trigger/binlog for new writes
  - Swaps tables atomically at the end
  - Used by: GitHub (gh-ost), Percona (pt-osc)

Option B: Expand-contract pattern (manual but safe)
  Step 1: Create new column with default (Postgres 11+ is instant for defaults)
  Step 2: Deploy code that writes to BOTH old and new columns
  Step 3: Backfill existing rows in batches (1000 rows at a time, with sleep)
  Step 4: Deploy code that reads from new column
  Step 5: Drop old column (if needed) — also in non-locking way

Option C: Dual-write to new table
  Step 1: Create new table with desired schema
  Step 2: Deploy code that writes to both tables
  Step 3: Backfill old data to new table
  Step 4: Switch reads to new table
  Step 5: Stop writes to old table, drop it later

Key principle: never do a big-bang migration. Always use incremental steps
where each step is independently reversible.
```

---

## Category 3: Debugging Production Performance Issues

### Scenario 3.1: Memory Leak Causing Periodic Restarts

**Situation:** Your Node.js service restarts every 6 hours. Memory usage grows linearly
until it hits the container limit and gets OOM-killed.

**How to diagnose:**

```
Step 1: Confirm the pattern
  - Check container metrics: RSS memory over time → linear growth = leak
  - Check restart count and OOM kill logs (dmesg or container orchestrator logs)

Step 2: Identify the leak source
  - Take heap snapshots at intervals (--inspect flag + Chrome DevTools)
  - Compare snapshot at 1h vs 4h → which objects are growing?
  - Common causes:
    a) Event listeners not cleaned up (addEventListener without removeEventListener)
    b) Closures holding references to large objects
    c) Global arrays/maps that grow unbounded (in-memory cache without eviction)
    d) Unclosed database connections or streams
    e) Timers (setInterval) that reference objects

Step 3: Production-safe profiling
  - Use clinic.js or 0x for flamegraph analysis
  - Enable --max-old-space-size to get a heap dump on OOM
  - Add custom metrics: track size of known caches/maps via Prometheus gauge
```

**Solutions:**

```
Immediate fix:
  - If it's a known cache: add LRU eviction with a max size
  - If it's event listeners: ensure cleanup in component/connection lifecycle
  - If it's unclosed connections: add connection pooling with max limit

Preventive:
  - Add memory usage alerting (alert at 70% of limit, not just OOM)
  - Load test with realistic sustained traffic (not just burst)
  - In code review, always check: "where does this get cleaned up?"
```

---

### Scenario 3.2: Intermittent 500 Errors That Don't Reproduce Locally

**Situation:** Production logs show 500 errors affecting 0.5% of requests. You can't
reproduce them locally. No code changes were deployed recently.

**Debugging strategy:**

```
Step 1: Correlate the errors
  - Are they always from the same endpoint?
  - Are they always the same error? Or different errors?
  - Is there a time pattern (every hour? random?)
  - Are they from the same user segment / region?

Step 2: Check for environmental differences (prod vs local)
  - Data differences: prod has edge-case data that your local DB doesn't
    → NULL values, special characters, extremely long strings, Unicode
  - Scale differences: connection pool exhaustion, timeout under load
  - Configuration: env vars, feature flags, A/B test segments
  - Dependencies: external API that's flaky (third-party payment, etc.)
  - Infrastructure: DNS resolution failures, network timeouts between services

Step 3: Add targeted logging
  - Log the full request (headers, body, params) for failed requests
  - Log the specific error with stack trace and context
  - Add correlation IDs to trace a request across services

Step 4: Reproduce with production conditions
  - Replay production traffic in staging (using request logs)
  - Shadow testing: duplicate prod traffic to staging environment
  - Chaos testing: inject failures (network delays, timeouts)
```

**Common root causes:**

```
1. Race condition under concurrent access (works alone, fails together)
2. External service timeout (third-party API has SLA of 99.5% → you get 0.5% errors)
3. Data edge case (user with 10,000 items, string with emoji, null field)
4. Resource exhaustion (connection pool, file descriptors, thread pool)
5. DNS resolution failure (intermittent, auto-recovers)
6. Clock skew between services (JWT validation fails, cache TTL wrong)
```

---

### Scenario 3.3: Database Query That Was Fast Yesterday Is Slow Today

**Situation:** A query that took 5ms yesterday now takes 5 seconds. No code changes,
no schema changes.

**How to diagnose:**

```
Step 1: Get the execution plan
  - Run EXPLAIN ANALYSE on the query
  - Compare with yesterday's plan if possible (pg_stat_statements)
  - Look for: sequential scans where index scans are expected

Step 2: Common causes
  a) Statistics are stale → planner picks wrong plan
     - Fix: ANALYSE tablename (updates statistics)
     - Postgres auto-vacuums, but heavy load can delay it

  b) Data volume crossed a threshold
     - Index was fine for 100K rows, but table grew to 10M overnight
       (e.g., batch import, log accumulation)
     - Fix: check table size, potentially partition or archive

  c) Index bloat
     - Many updates/deletes → dead tuples → index is fragmented
     - Fix: REINDEX or VACUUM FULL (careful: locks table)

  d) Lock contention
     - Long-running transaction holding a lock → your query waits
     - Fix: check pg_locks and pg_stat_activity for blocked queries
     - Kill the blocking query if safe

  e) Buffer cache was cold
     - Server restarted, cache is empty, everything reads from disk
     - Fix: cache warms up naturally, or pre-warm with pg_prewarm

  f) Parameter sniffing (more common in SQL Server but exists in Postgres)
     - Query plan was cached with unrepresentative parameter value
     - Fix: use PREPARE/EXECUTE with different values, or disable
       generic plans for that query

Step 3: Investigate data changes
  - Did a bulk import/delete happen? (check pg_stat_user_tables for row count changes)
  - Did a migration run? (even "no schema change" migrations can update stats)
  - Did the data distribution change? (new skew in a column)
```

---

## Category 4: Architecture and Strategy Questions

### Scenario 4.1: Monolith to Microservices — Where Do You Start?

**Situation:** You have a 500K LOC monolith that takes 45 minutes to deploy.
Management wants microservices. You have a team of 8.

**Strategy:**

```
Step 1: Don't rewrite everything (the "Big Bang" trap)
  - Full rewrites fail 70%+ of the time
  - You lose institutional knowledge embedded in the code
  - Business can't wait 18 months for a rewrite with zero features

Step 2: Identify extraction candidates — the Strangler Fig pattern
  - Find modules that:
    a) Change frequently (high deployment frequency = high value to decouple)
    b) Have different scaling requirements (e.g., image processing)
    c) Have clear bounded contexts (e.g., payments, notifications)
    d) Are causing the most pain (blocking other teams, slow tests)
  - Start with the EASIEST extraction, not the most important one
    → Build the infrastructure (CI/CD, service mesh, observability) on a safe target

Step 3: Extract incrementally
  1. Draw a boundary in the monolith code (separate module/package)
  2. Define the API contract between the module and the rest
  3. Replace internal calls with API calls (initially in-process, then remote)
  4. Deploy as a separate service
  5. Repeat

Step 4: What you need BEFORE you extract
  - Service discovery (Consul, K8s DNS)
  - Centralised logging (ELK, Datadog)
  - Distributed tracing (Jaeger, X-Ray)
  - CI/CD per service
  - Without these, microservices become a debugging nightmare

When to say NO to microservices:
  - Team < 5 people (operational overhead will eat your productivity)
  - No DevOps culture/automation
  - The real problem is code quality, not architecture
```

---

### Scenario 4.2: Multi-Region Deployment — Handling Data Consistency

**Situation:** Your app is deployed in US-East and EU-West. Users should be served from
the nearest region. How do you handle data that needs to be consistent?

**Strategy:**

```
Classify your data:

Tier 1: Must be globally consistent (payments, account balance, inventory)
  → Single-leader replication
  → All writes go to primary region (e.g., US-East)
  → Reads can be local if you accept slight staleness
  → Cross-region write latency: 150-300ms (acceptable for transactions)

Tier 2: Eventually consistent is fine (user profile, preferences, posts)
  → Multi-leader replication (each region has a writable primary)
  → Conflict resolution needed:
    - Last-write-wins (simple, potential data loss)
    - Merge (complex, application-specific)
    - CRDTs (conflict-free, limited data types)

Tier 3: Region-local data (session data, local cache, analytics events)
  → No replication needed
  → Stored only in the user's nearest region
  → If user moves regions: re-create (session) or async sync (analytics)

Architecture:
  - Global load balancer (Route53, Cloudflare) → routes by geography
  - Per-region application stack (independent scaling)
  - Database replication strategy per tier (above)
  - CDN for static assets (global)
  - Message queue for cross-region event propagation (Kafka MirrorMaker, SNS)

Failover:
  - If US-East goes down → promote EU-West to primary for Tier 1 data
  - DNS failover (health-check based, TTL 60s)
  - RPO (Recovery Point Objective): how much data can you lose? → replication lag
  - RTO (Recovery Time Objective): how fast to recover? → failover automation
```

---

### Scenario 4.3: You Inherit a System With No Observability

**Situation:** You join a team. The service has no logging, no metrics, no alerts.
It's in production serving 1M requests/day. Where do you start?

**Strategy (prioritised):**

```
Week 1: Don't break what works
  - Add structured logging (JSON) at request boundaries
    → Log: request_id, endpoint, status_code, latency, user_id
    → Ship to centralised log store (CloudWatch, ELK, Datadog)
  - Add a health check endpoint (/health)
  - Add basic uptime monitoring (Pingdom, UptimeRobot, or CloudWatch)

Week 2: Metrics (the RED method)
  - Rate: requests per second (by endpoint)
  - Errors: error rate (5xx, 4xx by endpoint)
  - Duration: latency percentiles (p50, p95, p99 by endpoint)
  - Expose via Prometheus endpoint or StatsD
  - Create a dashboard (Grafana)

Week 3: Alerts
  - Error rate > 1% for 5 minutes → PagerDuty alert
  - p99 latency > 2 seconds for 5 minutes → warning
  - Memory/CPU > 80% → warning
  - Zero traffic → critical (might mean LB or DNS is down)
  - Start with few, high-signal alerts. Too many alerts = alert fatigue = ignored

Week 4: Tracing and deeper observability
  - Add distributed tracing (OpenTelemetry)
  - Add business metrics (signups/day, orders/day, revenue/hour)
  - Add dependency health checks (can we reach the DB? Redis? External APIs?)
  - SLO dashboard: what % of requests meet our latency/error targets?

Principle: observability is not a project, it's a practice.
  Every new feature should include: "how will I know if this is broken?"
```

---

## Category 5: Quick-Fire Scenario Questions

### How would you handle...

```
Q: A deployment that causes 5% error rate increase?
A: 1. Immediate rollback (don't debug in prod under pressure)
   2. Compare: what changed? (diff the deploy)
   3. Reproduce in staging
   4. Fix → canary deploy (route 5% traffic to new version first)

Q: Your S3 bill tripled this month?
A: 1. Check S3 analytics: which bucket grew?
   2. Check for: failed multipart uploads (accumulate silently),
      missing lifecycle rules (old data never deleted),
      excessive logging to S3, replicated buckets
   3. Add lifecycle policies: move to Glacier after 30d, delete after 1y
   4. Enable S3 Intelligent-Tiering for unknown access patterns

Q: A downstream service you depend on is returning errors 10% of the time?
A: 1. Circuit breaker: stop calling it after N failures
   2. Fallback: return cached/default data
   3. Retry with exponential backoff + jitter (NOT immediate retry)
   4. Timeout: don't wait forever (set aggressive timeouts: 2-5s)
   5. Bulkhead: isolate the failing dependency so it doesn't consume all your threads

Q: Users report "it's slow" but your metrics look normal?
A: 1. "Slow" for who? Specific region? Device? Network?
   2. Check client-side metrics (Real User Monitoring / RUM)
   3. p99 might look fine but p99.9 could be terrible
   4. Check DNS resolution time, TLS handshake, TTFB (Time To First Byte)
   5. Check third-party scripts (analytics, ads) blocking page load

Q: You need to process 10M records but your server only has 2GB RAM?
A: 1. Stream processing: read and process one chunk at a time (not load all into memory)
   2. Batch processing: process in batches of 1000, write results, continue
   3. External sort: sort chunks that fit in memory, merge sorted chunks
   4. Use a database query to do the work (push computation to the data)
   5. MapReduce: distribute across multiple workers

Q: The CEO deleted a production database table accidentally?
A: 1. Point-in-time recovery (PITR) from automated backups (RDS supports this)
   2. If no backup: check if binary logs/WAL can replay transactions
   3. Prevention: restrict prod DB access (IAM, VPN, bastion host)
   4. Use "soft delete" (is_deleted flag) instead of hard DELETE
   5. Enable deletion protection on RDS instances
   6. Break-glass procedure: documented steps for emergency recovery
```

---

## Category 6: Cascading Failure Scenarios

### Scenario 6.1: The Retry Storm That Ate the Cluster

**Situation:** Your payment service starts returning 503s at 2% rate. The API gateway
retries failed requests 3 times. Downstream services also retry. Within 5 minutes,
the payment service is at 100% CPU and completely unreachable. Your request volume
went from 10K/sec to 150K/sec even though real user traffic hasn't changed.

**How to diagnose:**

```
Step 1: Check metrics — is real user traffic up, or is it internal amplification?
Step 2: Compare inbound request counts at each layer (gateway, service mesh, service)
Step 3: Look for retry headers or trace IDs showing the same logical request multiple times
Step 4: Check circuit breaker states — are they open or still closed?
Step 5: Look at the timeline: which service started failing first?
```

**Solutions:**

```
1. Exponential backoff with jitter on all retries
   - Reduces storm intensity but increases latency for legitimate retries

2. Circuit breakers at each service boundary
   - Fast-fails requests but some valid requests get dropped during recovery

3. Retry budgets (only 10% of requests in any window can be retries)
   - Prevents amplification but requires coordination across services

4. Shed load early: return 429 with Retry-After header at the gateway
   - Protects backend but shifts burden to clients

5. Kill switch: ability to disable retries globally in an emergency
```

---

### Scenario 6.2: One Slow Dependency Poisons Everything

**Situation:** Your checkout flow calls 5 microservices in sequence: inventory, pricing,
tax, fraud, and payment. The tax service's third-party API starts responding in 30s
instead of 200ms. Your thread pool across all services fills up. Even users who don't
need tax calculation (digital goods) can't check out.

**How to diagnose:**

```
Step 1: Check per-service latency percentiles — which service's p99 spiked?
Step 2: Look at thread pool utilisation across services
Step 3: Check connection pool metrics — are connections being held open?
Step 4: Verify if the slow service is the tax service itself or its downstream dep
Step 5: Check if timeouts are configured and actually being enforced
```

**Solutions:**

```
1. Bulkhead pattern: isolate thread pools per dependency
   - One slow service can't starve others
   - Tradeoff: adds resource overhead

2. Aggressive timeouts: set tax service call to 2-second timeout
   - Some tax calculations fail but checkout doesn't hang

3. Async fallback: queue the tax calculation, proceed with estimated tax, reconcile later
   - Better UX but adds complexity and potential incorrect charges

4. Circuit breaker on the tax service: after N failures, skip tax, flag for manual review
   - Fast but creates operational debt
```

---

## Category 7: Data Migration Gone Wrong

### Scenario 7.1: The Dual-Write Consistency Nightmare

**Situation:** You're migrating from a monolithic PostgreSQL to a new microservice with
its own database. During the migration, you write to both old and new databases. After
2 weeks, you discover the new database has 3% fewer records and some records have
different values. Users see different data depending on which service handles their request.

**How to diagnose:**

```
Step 1: Compare row counts and checksums between old and new databases
Step 2: Check application logs for failed writes to new DB — were errors swallowed?
Step 3: Look for race conditions — are writes to two DBs happening in different order?
Step 4: Check if there are code paths that bypass the dual-write logic
Step 5: Look for transaction boundaries — can one write succeed and the other fail?
```

**Solutions:**

```
1. Change Data Capture (CDC) with Debezium
   - Stream changes from old DB to new — eliminates dual-write issues
   - Tradeoff: adds infrastructure complexity and slight lag

2. Outbox pattern
   - Write to old DB + outbox table in same transaction
   - Separate process applies changes to new DB
   - Guarantees at-least-once delivery but requires idempotent consumers

3. Reconciliation job
   - Run periodic comparison and fix discrepancies
   - Catches drift but is reactive, not preventive

4. Shadow reads
   - Serve from old DB but also query new DB, compare results, log differences
   - Builds confidence before cutover without user impact
```

---

### Scenario 7.2: Data Corruption During Migration

**Situation:** A migration script was converting timestamps from local time to UTC
across 200M records. Halfway through, someone noticed records in "America/New_York"
were being converted as if they were "America/Chicago" — off by one hour. 100M records
already updated. Some records have been modified by users since the migration started.

**How to diagnose:**

```
Step 1: Identify the exact scope — which records were affected, which timezone was wrong?
Step 2: Check if you have an audit log or pre-migration backup
Step 3: Did the migration log which records it touched (batch IDs, timestamps)?
Step 4: Identify records modified by users since migration — these need special handling
Step 5: Check downstream systems that consumed corrupted data (analytics, billing)
```

**Solutions:**

```
1. Restore from backup + replay
   - Restore pre-migration data, fix the script, re-run
   - Cleanest but may lose user changes made during the window

2. Reverse transformation
   - Write a correction script that converts affected records back, then re-converts
   - Preserves user changes but error-prone if wrong records selected

3. Dual-track fix
   - For records NOT modified since migration: reverse and re-apply
   - For user-modified records: flag for manual review
   - Most accurate but time-consuming

Prevention: always run migrations with dry-run mode first, on a sample,
and log every change for reversibility
```

---

## Category 8: Deployment / Release Failures

### Scenario 8.1: The Canary That Looked Green But Wasn't

**Situation:** You deployed a new version via canary (5% traffic). All metrics looked
healthy: latency, error rate, CPU — all within thresholds. You rolled out to 100%.
Within 30 minutes, the database connection pool is exhausted and the service is down.
The bug only manifests under high connection concurrency that 5% traffic never triggered.

**How to diagnose:**

```
Step 1: Compare connection pool metrics at 5% vs 100% — linear or exponential?
Step 2: Check if the new code has a connection leak (acquired but not released)
Step 3: Look at connection pool configuration — was it sized for old code's patterns?
Step 4: Check if new code changed how transactions are handled
  (longer transactions = connections held longer)
```

**Solutions:**

```
1. Soak testing: hold canary at 5% for longer (hours, not minutes)
   - Catches slow leaks but delays deployment velocity

2. Load testing in staging: replay production traffic at full scale
   - Catches concurrency issues but staging never perfectly mirrors prod

3. Connection pool monitoring as canary metric
   - Add pool utilisation as a release gate
   - Catches this specific issue but not all categories

4. Progressive rollout: 5% → 25% → 50% → 100% with holds at each stage
   - Slower but gives more signal at each step

5. Feature flags over deployment: deploy to 100% but flag-gate the new behavior
   - Enables instant rollback without re-deployment
```

---

### Scenario 8.2: The Rollback That Made Things Worse

**Situation:** A deployment introduced a new database column and started writing data to it.
Users created 500K records with the new field populated. The deployment has a bug, so you
roll back the code. But the old code doesn't know about the new column. Old code tries to
insert rows and fails because the new column has a NOT NULL constraint. Now neither version works.

**How to diagnose:**

```
Step 1: Check the database schema — what constraints exist on the new column?
Step 2: Verify what the old code does when encountering unknown columns
Step 3: Assess how many records depend on the new column
Step 4: Determine if the new column can be safely made nullable without data loss
```

**Solutions:**

```
1. Make schema changes backwards-compatible ALWAYS
   - New columns must be nullable with defaults
   - Old code must ignore unknown columns
   - Requires discipline but prevents this entire class of issue

2. Expand-contract pattern
   (1) Add nullable column
   (2) Deploy code that writes to both
   (3) Backfill
   (4) Add constraint
   (5) Remove old column
   - Safe but slow (multiple deploys)

3. Emergency fix: ALTER TABLE to make the column nullable, then rollback code
   - Fixes immediately but may leave data in inconsistent state

4. Forward fix instead of rollback: fix the bug in new code and deploy again
   - Avoids the compatibility issue but requires the fix to be quick
```

---

### Scenario 8.3: The Config Change That Bypassed CI/CD

**Situation:** Someone updated a feature flag to enable a new recommendation algorithm for
all users. The change didn't go through the deployment pipeline — it was a config change,
not a code change. The new algorithm has an N+1 query problem. Database load increases 10x.
The site slows to a crawl. There's nothing to "rollback" in the deployment pipeline.

**How to diagnose:**

```
Step 1: Check recent config/feature flag changes — correlate timing with incident start
Step 2: Look at DB query patterns — has query count per request increased dramatically?
Step 3: Check if the config change has an audit trail and who made it
Step 4: Verify if the feature flag system has a rollback mechanism
```

**Solutions:**

```
1. Treat config changes as deployments
   - Require review, staged rollout, and monitoring
   - Prevents this but adds friction to config management

2. Feature flag guardrails
   - Automatically disable flags that cause metric degradation
   - Protects production but may disable legitimate features

3. Config change audit + auto-revert
   - If key metrics degrade within N minutes of a config change, auto-revert
   - Fast recovery but may cause flapping

4. Rate-limited feature rollout
   - Even config changes roll out incrementally (1% → 10% → 100%)
   - Catches problems early but adds complexity to the flag system
```

---

## Category 9: Cost Optimisation Under Pressure

### Scenario 9.1: The Cloud Bill That Tripled Overnight

**Situation:** Your AWS bill jumped from $150K/month to $450K/month. The CFO wants answers
by end of day. Investigation shows the spike is in data transfer costs and Lambda invocations.
Your team recently launched a feature that syncs user data every 5 minutes instead of hourly.

**How to diagnose:**

```
Step 1: Pull AWS Cost Explorer — break down by service, region, and usage type
Step 2: Check Lambda invocation counts and duration over time — when did the spike start?
Step 3: Correlate the timing with recent deployments and feature launches
Step 4: Look at data transfer patterns — is data leaving regions unnecessarily?
Step 5: Check for runaway processes (stuck Lambda retries, infinite loops)
```

**Solutions:**

```
1. Reduce sync frequency: go back to hourly or make it event-driven (sync only on change)
   - Massive cost reduction but users see less fresh data

2. Batch data transfer: instead of per-user syncs, batch changes and transfer in bulk
   - Reduces per-request overhead but adds latency

3. Cache at the edge: reduce cross-region data transfer
   - Saves bandwidth cost but adds cache invalidation complexity

4. Reserved capacity: commit to 1-year savings plans for predictable workloads
   - 30-60% savings but requires commitment

5. Kill the feature temporarily: disable, calculate real cost, re-design
   - Immediate savings but product impact
```

---

### Scenario 9.2: The Scaling Policy That Bankrupted Staging

**Situation:** Your auto-scaling policy in staging is identical to production: scale up
aggressively, scale down conservatively. A QA test generated a traffic spike. Staging
scaled to 200 instances and never scaled back because the cool-down period was 30 minutes
and small test bursts kept happening. This ran for 2 weeks. Cost: $80K wasted.

**Solutions:**

```
1. Environment-specific scaling policies
   - Staging scales more conservatively, shorter cool-downs
   - Saves money but may not catch scaling-related bugs

2. Budget alerts and hard caps
   - Maximum instance counts and billing alerts for non-production
   - Prevents runaway costs but may break tests that need scale

3. Scheduled scaling
   - Staging only runs during business hours, scales to zero at night/weekends
   - Big savings but can't run overnight tests

4. Spot instances for non-production
   - 60-90% cheaper but instances can be terminated mid-test
```

---

## Category 10: Security Incident Response

### Scenario 10.1: Leaked Credentials in a Public Repository

**Situation:** Your security scanner alerts that an AWS access key was committed to a
public GitHub repository 4 hours ago. The key has AdministratorAccess permissions.
You don't know yet if anyone has used it.

**Response (order matters):**

```
Step 1: IMMEDIATELY rotate the credential — contain first, investigate after
Step 2: Check AWS CloudTrail for any API calls made with that key in the past 4 hours
Step 3: Look for unauthorized resource creation (EC2, Lambda, IAM users)
Step 4: Check for data exfiltration (S3 access logs, unusual GetObject patterns)
Step 5: Verify git history — has this key been in older commits longer than 4 hours?
Step 6: Check if the key was used to create additional credentials (persistence)
```

**Solutions:**

```
1. Immediate rotation of the key AND all secrets accessible via it
   - Essential but may break running services that use the key

2. Full CloudTrail audit: check for lateral movement, new IAM users, modified policies
   - Thorough but time-consuming

3. Prevention: automated secret scanning in CI/CD (git-secrets, truffleHog)
   - Prevents future occurrences but doesn't help with this incident

4. Least-privilege principle: no key should ever have AdministratorAccess
   - Reduces blast radius but requires careful IAM design

5. Vault/secrets manager: never store secrets in code
   - Use HashiCorp Vault or AWS Secrets Manager
   - Eliminates this class of problem but requires infrastructure investment
```

---

### Scenario 10.2: Suspicious Outbound Traffic from Production

**Situation:** Network monitoring shows a production server is making HTTPS requests to an
unknown IP in Eastern Europe every 30 seconds, sending 50KB payloads. This started 3 days
ago. The server runs your customer database API.

**How to diagnose:**

```
Step 1: Capture the outbound traffic (packet capture) without alerting the potential attacker
Step 2: Identify the process making the requests (netstat, lsof, ss)
Step 3: Check when the binary/process was last modified — does it match a legitimate deploy?
Step 4: Review access logs — who has SSH'd into this server recently?
Step 5: Check for rootkits or modified system binaries
Step 6: Determine what data the server has access to (customer PII, payment data)
```

**Solutions:**

```
1. Isolate the server immediately
   - Remove from LB, restrict network but keep running for forensics
   - Stops exfiltration but reduces capacity

2. Full forensic analysis: snapshot disk, memory dump, analyse the malware
   - Thorough but takes time while attacker may have access to other systems

3. Rebuild from known-good image: destroy compromised server, rebuild
   - Fast recovery but you lose forensic evidence

4. Assume breach is wider: check all servers of same type, audit all access
   - Catches lateral movement but resource-intensive

5. Mandatory notification: if customer data was exfiltrated,
   regulatory obligations (GDPR 72h, CCPA) may apply
```

---

## Category 11: Message Queue Backlog Scenarios

### Scenario 11.1: The Queue That Won't Drain

**Situation:** Your Kafka topic for order processing has 50M unprocessed messages.
Consumer lag is increasing at 10K messages/second. Consumers are running but processing
is slow. Orders placed 6 hours ago haven't been fulfilled. Customers are calling.

**How to diagnose:**

```
Step 1: Check consumer group — are all consumers active and assigned partitions?
Step 2: Look at per-message processing time — has it increased? Why?
Step 3: Check if a downstream dependency (DB, external API) is slow
Step 4: Look at message payloads — are there poison messages causing repeated failures?
Step 5: Check consumer commit offsets — are consumers reprocessing the same messages?
Step 6: Verify partition distribution — is one partition much larger (hot partition)?
```

**Solutions:**

```
1. Scale consumers horizontally (up to number of partitions)
   - Immediate relief but may overwhelm downstream services

2. Prioritise: process recent orders first by reading from end of topic
   - Gets current customers served but older orders wait even longer

3. Skip/dead-letter poison messages that fail repeatedly
   - Unblocks the queue but those orders need manual handling

4. Increase parallelism within each consumer
   - Faster but risks ordering violations

5. The math matters:
   If you produce 10K/sec and consume 8K/sec, the backlog NEVER drains
   Recovery formula: extra consumers needed = backlog / (rate × recovery_time)
```

---

### Scenario 11.2: The Dead Letter Queue Nobody Monitors

**Situation:** Your order processing system has been sending failed messages to a DLQ
for 6 months. Nobody set up monitoring. The DLQ now has 2M messages representing
$15M in unprocessed orders. Some failed due to transient errors that no longer exist,
some due to data issues, some due to bugs since fixed.

**Solutions:**

```
1. Triage and batch replay
   - Categorise messages, replay fixable ones in controlled batches during low traffic
   - Recovers lost revenue but may cause duplicates if idempotency isn't perfect

2. Manual reconciliation for high-value orders
   - For orders above a threshold, manually verify and process
   - Accurate but labour-intensive

3. Write off old messages
   - Messages older than X days are likely already resolved by customer support
   - Practical but loses revenue

Prevention:
   - DLQ monitoring and alerts from day one
   - Maximum retention policies
   - DLQ review as part of on-call handoff
```

---

## Category 12: Database & Storage Issues

### Scenario 12.1: The Disk Full That Isn't About Disk Space

**Situation:** Your application crashes with "No space left on device" errors. You check
`df -h` and see 20% disk space is free. The application can't create new files or write
to the database.

**How to diagnose:**

```
Step 1: Check inode usage with df -i — you may have exhausted inodes, not bytes
Step 2: Look for millions of tiny files (session files, temp files, log fragments)
Step 3: Check if a process has deleted files that are still held open (lsof +L1)
Step 4: Verify if the filesystem is mounted read-only
Step 5: Check if disk quotas are in effect for the user running the application
```

**Solutions:**

```
1. Inode exhaustion: find and clean up millions of small files
   - Or reformat with more inodes (requires downtime)

2. Deleted-but-open files: restart processes holding deleted files
   - Immediate fix but causes brief downtime

3. Move to a filesystem that handles small files better (XFS instead of ext4)
   - Long-term fix but requires migration

4. Application fix: stop creating millions of temp files
   - Use a database or object store instead
```

---

### Scenario 12.2: Database Connection Pool Exhaustion at Midnight

**Situation:** Every night at midnight, your app becomes unresponsive for 5-10 minutes.
Health checks pass. No errors in application logs. Database metrics show connections at
max pool size. The issue resolves itself.

**How to diagnose:**

```
Step 1: What runs at midnight? Cron jobs, batch processes, report generation?
Step 2: Look at DB connection count over time — is there a spike at exactly midnight?
Step 3: Do batch jobs use the same connection pool as the web application?
Step 4: Are queries taking longer during the window?
Step 5: Check for table locks from long-running batch queries blocking web queries
```

**Solutions:**

```
1. Separate connection pools: batch jobs get their own pool
   - Prevents contention but requires more total connections

2. Separate database replicas: batch jobs read from a replica
   - Eliminates contention but adds infrastructure cost

3. Stagger batch jobs: don't run everything at midnight
   - Reduces peak but extends the batch window

4. Connection pool timeout: aggressive checkout timeouts so stuck connections recycle
   - Prevents deadlocks but may cause batch job failures

5. Queue-based batch processing: queue jobs, process sequentially
   - Prevents resource spikes but jobs take longer
```

---

## Category 13: Scaling Emergencies

### Scenario 13.1: Viral Traffic Spike (10x Normal)

**Situation:** A celebrity tweeted about your product. Traffic spikes from 5K req/sec to
50K req/sec in 15 minutes. Auto-scaling is set to add instances when CPU > 70% for
5 minutes. By the time new instances spin up, existing instances are already overloaded
and failing health checks.

**Solutions:**

```
1. Pre-warming: maintain a warm pool of instances ready to serve
   - Handles spikes instantly but costs money 24/7

2. More aggressive scaling: scale at 50% CPU with 1-minute evaluation
   - Responds faster but causes more scaling churn normally

3. CDN and edge caching: for read-heavy viral traffic, serve from CDN
   - Handles massive scale but only works for cacheable content

4. Rate limiting: protect core services, serve degraded experience under load
   - Keeps the site up but some users get errors

5. Static fallback pages: pre-rendered HTML served from CDN during extreme spikes
   - Handles unlimited scale but no dynamic functionality
```

---

## Category 14: Search Index Issues

### Scenario 14.1: The Reindex That Takes a Month

**Situation:** Your Elasticsearch cluster has 720M documents. You need to change a field
mapping (e.g., changing a text field analyser). ES doesn't allow changing mappings on
existing indices — you must reindex. Estimates show 4 weeks. Meanwhile, new data is coming
in and search results use the old (incorrect) analyser.

**Solutions:**

```
1. Disable refresh during reindex: set refresh_interval to -1
   - Massive speed improvement but search results won't update during reindex

2. Parallel reindex by date range: split into time-based chunks, run in parallel
   - Much faster (SoundCloud went from 1 week to 1 hour this way)
   - But requires careful orchestration

3. Alias-based zero-downtime reindex:
   - Create new index with correct mappings
   - Reindex into it
   - Swap the alias
   - Zero downtime but temporarily doubles storage

4. Dual-write during reindex:
   - Write new data to both old and new index while reindexing historical data
   - Ensures no data gaps but adds write overhead
```

---

## Category 15: DNS / Networking Issues

### Scenario 15.1: The DNS TTL Disaster

**Situation:** You migrated your API from old servers to new servers by updating the DNS
record. TTL was set to 86400 seconds (24 hours). Some clients still hit old servers 18
hours later. You've already decommissioned old servers. Those clients get connection
refused errors.

**Solutions:**

```
1. Bring old servers back online temporarily
   - Redirect from old IPs to new servers
   - Immediate fix but requires old infrastructure to still exist

2. Lower TTL BEFORE migration (the real lesson)
   - Set TTL to 60 seconds 48 hours before migration
   - So caches expire before the switch

3. IP-level redirect: set up forwarding from old IPs to new servers
   - Works for TCP traffic but adds a network hop

4. Dual-stack: keep both old and new servers running for 2x the TTL period
   - Safe but doubles infrastructure cost during transition
```

---

### Scenario 15.2: Internal Service Discovery Failure After K8s Upgrade

**Situation:** After a Kubernetes cluster upgrade, pods can resolve external DNS
(google.com works) but internal service discovery fails. `service-a` cannot reach
`service-b.namespace.svc.cluster.local`. CoreDNS pods are running but requests time out.

**How to diagnose:**

```
Step 1: Check CoreDNS pod logs for errors
Step 2: Test DNS resolution from within a pod:
        nslookup service-b.namespace.svc.cluster.local
Step 3: Verify CoreDNS ConfigMap — did the cluster upgrade modify it?
Step 4: Check if kube-dns service has correct endpoints
Step 5: Look at network policies — is there a policy blocking DNS traffic on port 53?
```

**Solutions:**

```
1. Restart CoreDNS pods: upgrade may have left them in bad state
2. Check and restore CoreDNS ConfigMap: upgrade may have overwritten custom config
3. Verify network policies: a new default-deny policy may block UDP port 53
4. Check ndots configuration: if changed during upgrade, short names may not resolve
```

---

## Category 16: Split-Brain / Distributed System Issues

### Scenario 16.1: The Leader Election That Elected Two Leaders

**Situation:** Your distributed database cluster uses leader election via ZooKeeper.
A network partition isolates the leader from ZooKeeper but the leader can still serve
clients. ZooKeeper elects a new leader. Now you have two leaders accepting writes.
When the partition heals, you have conflicting data.

**How to diagnose:**

```
Step 1: Check ZooKeeper session status — did the old leader's session expire?
Step 2: Look at epoch/term numbers — which leader has the higher term?
Step 3: Identify the scope of conflicting writes — how many records affected?
Step 4: Determine if the app uses fencing tokens to prevent stale leaders from writing
```

**Solutions:**

```
1. Fencing tokens
   - New leader gets a monotonically increasing token
   - Old leader's writes are rejected by storage because its token is stale
   - Prevents split-brain writes but requires all storage layers to check the token

2. STONITH (Shoot The Other Node In The Head)
   - When new leader elected, old leader is forcibly shut down
   - Prevents split-brain but risks killing a healthy node due to false detection

3. Conflict resolution after merge
   - Use timestamps, vector clocks, or application-level merge logic
   - Handles the aftermath but some conflicts may be unresolvable automatically

4. Prevention: use odd-numbered clusters with quorum requirements
   - A partition always has one side with majority
```

---

## Category 17: On-Call / Incident Management

### Scenario 17.1: The Alert Storm During an Outage

**Situation:** A core database goes down. Within 2 minutes, you receive 847 alerts from
43 different services. PagerDuty is escalating to everyone. The actual root cause
(database) is buried under hundreds of downstream alerts.

**How to respond:**

```
Step 1: STOP and organise — declare an incident commander, others stop random investigation
Step 2: Look for the earliest alert — it's likely closest to the root cause
Step 3: Check the dependency graph — which service sits at the bottom?
Step 4: Silence downstream alerts to reduce noise
Step 5: Focus on infrastructure first: network? databases? message brokers?
```

**Solutions:**

```
1. Alert correlation/grouping
   - Group related alerts, surface probable root cause
   - Reduces noise but requires upfront dependency mapping

2. Tiered alerting
   - Only page for symptoms (user-facing impact), not causes (individual service errors)
   - Fewer alerts but might miss issues that haven't impacted users yet

3. Incident roles: pre-assign IC, communications lead, scribe
   - Structured response but requires training and practice

4. Dependency-aware monitoring
   - If database is down, automatically suppress alerts for all dependent services
   - Eliminates noise but requires accurate dependency mapping
```

---

### Scenario 17.2: The False Positive That Cried Wolf

**Situation:** Your monitoring fires "database latency critical" alert 3 times per week.
Each time, the on-call investigates and finds nothing wrong — it's caused by a nightly
backup. After 2 months, the team ignores the alert. Then the database actually has a
latency spike. The on-call dismisses it. A real outage goes undetected for 45 minutes.

**Solutions:**

```
1. Maintenance window suppression
   - Suppress during known backup windows
   - Eliminates false positives but risks missing real issues during backups

2. Dynamic thresholds
   - Use anomaly detection instead of static thresholds
   - Baseline during backups is different from normal operation
   - More accurate but harder to reason about

3. Alert quality SLO
   - Track false positive rate for every alert
   - Alerts with >50% false positive rate must be fixed or deleted
   - Improves signal quality but requires discipline
```

---

## Category 18: Third-Party Dependency Failures

### Scenario 18.1: Payment Provider Outage During Black Friday

**Situation:** Your payment provider goes down during Black Friday. You process $500K/hour
through them. Every failed checkout is a lost sale. You have no backup payment provider.

**Solutions:**

```
1. Multi-provider fallback
   - Integrate a secondary payment provider, failover automatically
   - Eliminates SPOF but doubles integration complexity

2. Queue and retry
   - Accept orders, queue payment processing, charge when provider recovers
   - Preserves sales but you're shipping without confirmed payment (fraud risk)

3. Graceful degradation: show "pay later" or "invoice" option during outage
   - Preserves some sales but changes UX and creates accounts receivable overhead

4. Prevention:
   - Negotiate SLAs with payment providers
   - Maintain a secondary provider even if rarely used
   - Test failover regularly
```

---

### Scenario 18.2: The API Rate Limit You Didn't Know About

**Situation:** Your app relies on a third-party geocoding API for address validation.
Traffic doubles due to a marketing campaign. The geocoding API starts returning 429
(rate limited). Address validation fails. Users can't place orders because checkout
requires a validated address.

**Solutions:**

```
1. Cache aggressively: most addresses repeat, cache geocoding results
   - Reduces API calls dramatically but needs invalidation strategy

2. Make validation non-blocking: validate asynchronously after order placed
   - Preserves purchase flow but some addresses may be invalid

3. Degrade gracefully: if API is down, accept address as-is, validate later
   - Doesn't block users but may result in undeliverable orders

4. Multiple providers with load balancing
   - Higher availability but different providers may return different results

5. Self-host: use local geocoding database (OpenStreetMap data)
   - Eliminates dependency but requires maintaining the data
```

---

## Category 19: Cross-Team Coordination Problems

### Scenario 19.1: The Upstream API Breaking Change

**Situation:** Team A owns the User Service. They deployed a "minor" change that renamed
a JSON field from `user_name` to `username`. Five downstream services maintained by
three different teams break. Team A's tests all pass because they only test their own
service. There's no contract testing.

**Solutions:**

```
1. Immediate fix: return BOTH user_name and username in the response temporarily
   - Unblocks everyone but creates technical debt

2. API versioning: introduce versioned endpoints (/v1/, /v2/)
   - Consumers migrate at their own pace
   - Clean but adds maintenance burden

3. Consumer-driven contract testing (Pact)
   - Consumers define what they expect
   - Provider's CI runs these tests before deployment
   - Catches breaking changes but requires buy-in from all teams

4. Schema registry (Protobuf/Avro)
   - Enforces backwards compatibility
   - Prevents this class of issue but requires adopting schema-first approach

5. Deprecation policy
   - Breaking changes require N weeks notice, documentation, migration support
   - Fair process but slows down the provider team
```

---

## Category 20: Capacity Planning Mistakes

### Scenario 20.1: The Storage That Ran Out on a Holiday

**Situation:** It's December 25th. Your database storage hits 100% at 3 AM. Writes fail.
The on-call can't expand storage because it requires a maintenance window and management
approval for the cost.

**Solutions:**

```
1. Emergency space reclamation
   - Delete old logs, vacuum the database, archive old data to S3
   - Buys time but is a band-aid

2. Online volume resize (if AWS EBS gp3/gp2)
   - Can resize without downtime (takes hours to optimise)
   - Non-disruptive but slow

3. Failover to replica, resize primary, fail back
   - Involves downtime during failover
   - Thorough fix but risky if failover isn't tested

Prevention:
   - Storage alerts at 60%, 75%, 90%
   - Auto-scaling storage where possible
   - Regular capacity planning reviews
   - Never let storage reach 80% without a plan
```

---

### Scenario 20.2: The Memory Leak That Only Shows Up After 12 Days

**Situation:** Your Java app restarts once every two weeks. Memory usage grows linearly
from 4GB to 14GB (the JVM max) over 12 days, then OOMs and restarts. It's been doing
this for months but nobody noticed because Kubernetes restarts it cleanly.

**How to diagnose:**

```
Step 1: Graph memory usage over 30 days — confirm linear growth pattern
Step 2: Take heap dumps at different points in the cycle and compare
Step 3: Look for objects that grow unboundedly:
  - Caches without eviction
  - Listeners added but never removed
  - Thread-local variables
Step 4: Check if leak correlates with specific request types or user actions
```

**Common culprits:**

```
- Un-closed database connections
- Event listeners never unregistered
- Static Maps used as caches (no max size, no eviction)
- ThreadLocal variables not cleaned up
- Class loader leaks in hot-reload scenarios
```

**Solutions:**

```
1. Find and fix the leak (the proper solution)
2. Scheduled restarts every 3 days as a temporary measure
3. Use WeakReferences for caches if that's the source
4. Add memory usage alerting (alert at 70%, not just OOM)
```

---

## The 12 Recurring Failure Patterns (Summary Checklist)

> Based on analysis of 50+ production incidents, these patterns account for
> the vast majority of outages. The top 5 alone cover ~84% of incidents.

```
 1. Connection Pool Exhaustion
    - Connections acquired but not released; pool fills; new requests hang

 2. Cascade Failure
    - One slow service makes everything slow; timeouts propagate upstream

 3. Retry Storm
    - Aggressive retries amplify load on failing service; recovery impossible

 4. Memory Leak
    - Slow, steady growth; OOM after days/weeks; disguised by periodic restarts

 5. Cache Stampede
    - Popular cache key expires; thousands hit DB simultaneously

 6. Thread Pool Saturation
    - All workers busy; new requests queue indefinitely; eventually timeout

 7. Hot Partition
    - One key/shard gets disproportionate traffic; throttled while others fine

 8. Split Brain
    - Network partition causes two leaders; conflicting writes; data divergence

 9. Configuration Drift
    - Production differs from expected; env vars, flags, settings changed untracked

10. Dependency Timeout Misconfiguration
    - Default timeouts too long (30s+); threads held waiting; cascading

11. Log/Temp File Accumulation
    - Disk or inode exhaustion from unrotated logs or temp files

12. Unmonitored Dead Letter Queue
    - Failed messages pile up silently; discovered weeks/months later
```

---

# Part 2: Other Question Types Beyond "Fix It"

> Interviewers don't only ask "how would you fix this?"
> Below are all the other question types you'll face, with realistic examples.

---

## Type A: "Walk Me Through What Happens When..." Questions

> These test your depth. The interviewer wants to see how far down the stack you can go.

### A.1: What happens when you type a URL in the browser and hit Enter?

```
Level 1 — Network (what most people say):
  1. Browser checks its DNS cache → OS cache → router cache → ISP DNS → recursive lookup
  2. Browser opens TCP connection to the IP (3-way handshake: SYN, SYN-ACK, ACK)
  3. If HTTPS: TLS handshake (client hello, server hello, certificate, key exchange)
  4. Browser sends HTTP GET request
  5. Server processes request, returns response
  6. Browser receives HTML, parses it

Level 2 — Rendering (this is where you stand out):
  7. HTML parser builds the DOM tree
  8. CSS parser builds the CSSOM tree
  9. DOM + CSSOM → Render tree (only visible elements)
  10. Layout: calculate position and size of every element
  11. Paint: fill in pixels (colours, text, images, borders)
  12. Composite: combine layers and display on screen

Level 3 — Details that impress:
  - DNS uses UDP (port 53), falls back to TCP for large responses
  - TCP slow start: initial window is small, grows exponentially
  - TLS 1.3 reduces handshake to 1 round trip (vs 2 in TLS 1.2)
  - HTTP/2: multiplexed streams, header compression, server push
  - HTTP/3: runs over QUIC (UDP), eliminates head-of-line blocking
  - Browser has a preload scanner that fetches resources while parsing HTML
  - Render-blocking: CSS blocks rendering, JS blocks HTML parsing (unless async/defer)
  - requestAnimationFrame runs before the next paint
  - Compositor thread handles scroll/animations off the main thread
```

---

### A.2: What happens when you do `git push`?

```
1. Git computes which commits are in local but not in remote
2. Git packs those objects (commits, trees, blobs) into a packfile
3. Opens connection to remote (SSH or HTTPS)
4. Sends the packfile to the remote
5. Remote receives and unpacks objects
6. Remote checks if the push is a fast-forward (or requires force push)
7. Remote updates the branch reference to point to the new commit
8. Server-side hooks run (pre-receive, update, post-receive)
9. If hooks reject → push fails, branch reference not updated
10. Local updates the remote-tracking branch (origin/main)

Follow-up: what if two people push at the same time?
  - First push succeeds
  - Second push is rejected (not a fast-forward)
  - Second person must pull (fetch + merge/rebase), then push again
  - This is how Git prevents lost updates without locking
```

---

### A.3: What happens when a Kubernetes pod starts?

```
1. User submits a Deployment/Pod spec to the API server
2. API server validates and stores it in etcd
3. Scheduler watches for unscheduled pods
4. Scheduler picks a node based on: resource requests, affinity, taints/tolerations
5. Scheduler assigns the pod to a node (writes to etcd)
6. Kubelet on that node detects the new assignment
7. Kubelet pulls the container image (if not cached)
8. Kubelet creates the container via the container runtime (containerd/CRI-O)
9. Init containers run first (sequentially, must succeed)
10. Main containers start
11. Startup probe runs (if defined) — pod is not ready until this passes
12. Liveness probe starts — if it fails, pod is restarted
13. Readiness probe starts — only when passing, pod gets added to Service endpoints
14. Endpoint controller updates the Service, kube-proxy updates iptables/IPVS
15. Now traffic starts flowing to the pod

Key insight: there's a gap between "container running" and "receiving traffic"
  → This is why readiness probes exist
  → Without them, users hit a pod that isn't ready yet → 502 errors
```

---

### A.4: What happens when you run a SQL query?

```
1. Client sends query string to the database server
2. Parser: checks SQL syntax, builds a parse tree
3. Analyser: resolves table/column names, checks permissions
4. Rewriter: applies rules (view expansion, query rewrites)
5. Planner/Optimiser: generates multiple execution plans, estimates cost of each,
   picks the cheapest one
   - Cost based on: table statistics, index availability, join algorithms, row estimates
6. Executor: runs the chosen plan
   - Sequential scan: read every row (no usable index)
   - Index scan: use B-tree to find specific rows
   - Nested loop join: for small tables or indexed lookups
   - Hash join: for large unsorted tables
   - Merge join: for large sorted tables
7. Results buffered and sent back to client

Why this matters in interviews:
  - "Why is my query slow?" → usually the planner picked the wrong plan
  - Bad statistics → wrong row estimates → wrong plan
  - Missing index → sequential scan on a million-row table
  - EXPLAIN ANALYSE shows you the actual plan and actual row counts
```

---

## Type B: "Compare and Choose" / Trade-off Questions

> These test your judgment. There's no single right answer — they want to see
> your reasoning process and awareness of trade-offs.

### B.1: SQL vs NoSQL — when would you choose each?

```
Choose SQL (PostgreSQL, MySQL) when:
  - Your data has relationships (users → orders → items)
  - You need ACID transactions (financial data, inventory)
  - You need complex queries (joins, aggregations, GROUP BY)
  - Your schema is well-defined and unlikely to change drastically
  - You need strong consistency
  - Your data fits on one big server or a few read replicas

Choose NoSQL when:
  - Scale is the primary concern (billions of rows, thousands of writes/sec)
  - Your data is naturally document-shaped (user profiles, product catalogs)
  - Your access patterns are simple (key-value lookups, no complex joins)
  - Schema changes frequently (agile development, evolving requirements)
  - You need horizontal scaling without the pain of sharding SQL
  - Eventual consistency is acceptable

The nuanced answer interviewers love:
  "I'd start with PostgreSQL because it handles most use cases well, it's
   well-understood, and you can always add caching later. I'd only reach
   for NoSQL when I have a specific scaling or data model requirement that
   PostgreSQL can't meet — like time-series data (use TimescaleDB or
   Cassandra), or a social graph (use Neo4j), or key-value cache (use Redis)."

Real example:
  - Uber moved from PostgreSQL to Cassandra for trip data because they
    needed cross-datacenter replication with low-latency writes
  - But they kept PostgreSQL for billing (needs ACID transactions)
  - Lesson: most systems use both — different databases for different needs
```

---

### B.2: Monolith vs Microservices — when would you choose each?

```
Choose Monolith when:
  - Team is small (< 10 engineers)
  - You're building a new product (need to iterate fast)
  - The domain is not well understood yet
  - You don't have DevOps maturity (no CI/CD, no container orchestration)
  - You can't afford the operational overhead of distributed systems

Choose Microservices when:
  - Multiple teams need to deploy independently
  - Different components have very different scaling requirements
  - You need technology diversity (ML team uses Python, API team uses Go)
  - The domain boundaries are clear and stable
  - You have the infrastructure to support it (K8s, observability, CI/CD per service)

The trap answer to avoid:
  ✗ "Microservices are better because they scale"
  ✓ "It depends on team size, domain maturity, and operational capability"

What interviewers really want to hear:
  "Microservices are a solution to an organisational problem, not a technical one.
   If one team owns the whole thing, a monolith is almost always simpler and faster.
   The moment you have 3+ teams stepping on each other's deploys, that's when you
   start extracting services — and you start with the one causing the most pain."
```

---

### B.3: REST vs GraphQL vs gRPC — when would you choose each?

```
REST:
  - Best for: public APIs, simple CRUD, broad client compatibility
  - Pros: universally understood, cacheable (HTTP caching), simple tooling
  - Cons: over-fetching (get 50 fields when you need 3), under-fetching (N+1 requests)
  - Use when: building a public API, or the resource model maps cleanly to endpoints

GraphQL:
  - Best for: complex UIs with varied data needs, mobile apps (bandwidth matters)
  - Pros: client gets exactly what it asks for, single request for complex data
  - Cons: caching is harder, N+1 query problem on the server (use DataLoader),
    complexity shifts to backend, security (malicious deep queries)
  - Use when: frontend team is frustrated by REST endpoints not matching their needs

gRPC:
  - Best for: internal service-to-service communication, high-performance
  - Pros: binary protocol (Protobuf) = fast + small, streaming support,
    strong typing, code generation for multiple languages
  - Cons: not browser-friendly (needs gRPC-Web proxy), not human-readable,
    harder to debug with curl
  - Use when: microservices talking to each other, latency-sensitive paths

The real-world answer:
  "Most companies use all three:
   - gRPC between backend services (fast, typed)
   - GraphQL as a BFF (Backend For Frontend) aggregation layer
   - REST for public APIs and webhooks"
```

---

### B.4: When would you use a message queue vs direct API calls?

```
Use direct API calls (synchronous) when:
  - You need an immediate response (user is waiting)
  - The operation is simple and fast (< 200ms)
  - Failure should be visible immediately (payment processing)
  - The two services are tightly coupled by design

Use a message queue (asynchronous) when:
  - The work can be done later (send email, generate report, resize image)
  - You need to decouple producer from consumer
  - You need to handle traffic spikes (queue absorbs the burst)
  - You need fan-out (one event → multiple consumers)
  - The consumer might be temporarily unavailable
  - You need guaranteed delivery (at-least-once processing)

Queue selection:
  - RabbitMQ: traditional message broker, routing, priority queues
  - Kafka: event streaming, replay capability, high throughput, log-based
  - SQS: managed, simple, serverless-friendly, no ops burden
  - Redis Streams: lightweight, good for simple pub/sub within a service

The question behind the question:
  Interviewers are really asking: "do you understand coupling and trade-offs?"
  The answer is: synchronous = simple but coupled, async = decoupled but complex.
```

---

## Type C: Estimation / Capacity Planning Questions

> These test whether you can reason about scale and do back-of-envelope math.

### C.1: How much storage does YouTube need per day?

```
Given:
  - 500 hours of video uploaded per minute
  - Average video: 720p, ~10MB per minute of video

Calculation:
  500 hours/min = 30,000 min of video per minute
  30,000 min × 10MB = 300,000 MB = 300 GB per minute
  300 GB × 60 min × 24 hours = 432,000 GB/day = 432 TB/day

But wait — YouTube transcodes to multiple resolutions:
  - 360p, 480p, 720p, 1080p, 4K
  - Roughly 3-5x the raw storage
  - 432 TB × 4 = ~1.7 PB/day

Per year: 1.7 PB × 365 = ~620 PB/year

Key insight: the real bottleneck isn't storage cost (S3 is cheap) — it's
the transcoding compute and CDN bandwidth for serving.
```

---

### C.2: How many servers do you need for a chat app with 10M DAU?

```
Given:
  - 10M DAU, each user sends 40 messages/day
  - Total messages: 400M/day

Messages per second:
  - 400M / 86,400 = ~4,600 msg/sec average
  - Peak = 3x average = ~14,000 msg/sec

Each WebSocket connection uses ~10KB of memory:
  - Concurrent users (assume 10% of DAU online at any time) = 1M
  - 1M connections × 10KB = 10GB of memory just for connections
  - A server with 64GB RAM can handle ~5M connections (with overhead)
  - Need: 1M / 5M = 1 server (but you'd never do this — need redundancy)
  - Practical: 4 WebSocket servers (for redundancy and fault tolerance)

Message throughput:
  - A single server can handle ~50K msg/sec with efficient I/O
  - 14,000 peak msg/sec → 1 server is enough for throughput
  - But again, 2-3 for redundancy

Storage:
  - Average message = 200 bytes
  - 400M × 200 bytes = 80GB/day
  - Keep 1 year: 80GB × 365 = ~30TB
  - Cassandra or similar distributed DB

Bottom line: 4-6 app servers, 3-node Cassandra cluster, 3-node Redis cluster
  Much smaller than people guess — efficient engineering matters more than hardware.
```

---

### C.3: Design the capacity for a URL shortener handling 1B redirects/day

```
Read (redirects):
  1B/day ÷ 86,400 = ~11,600 req/sec average
  Peak (3x): ~35,000 req/sec

Write (new URLs):
  Assume 100:1 read-to-write ratio → 10M new URLs/day
  10M / 86,400 = ~115 writes/sec (very manageable)

Storage:
  Each record: short code (7 bytes) + URL (100 bytes avg) + metadata (50 bytes) ≈ 160 bytes
  10M/day × 160 bytes = 1.6 GB/day
  5 years: 1.6 GB × 365 × 5 = ~2.9 TB total

Cache:
  80/20 rule: 20% of URLs get 80% of traffic
  Total unique URLs in 5 years: 10M × 365 × 5 = 18.25B URLs
  Cache top 20%: 3.65B × 160 bytes = ~584 GB
  That's a lot — so cache only the hot ones (last 24h popular):
  Hot URLs per day: ~2M × 160 bytes = 320 MB → easily fits in Redis

Bandwidth:
  35,000 req/sec × 500 bytes (response with redirect) = 17.5 MB/sec = 140 Mbps
  Very manageable for modern infrastructure

Servers:
  Each server handles ~10K req/sec → need 4 servers (with headroom)
  Behind an L7 load balancer
```

---

## Type D: "How Would You Improve This?" Questions

> The interviewer describes an existing system and asks you to improve it.
> This tests whether you can identify bottlenecks and prioritise.

### D.1: "Our search takes 3 seconds. How would you make it faster?"

```
Step 1: Where is the time spent? (always ask this first)
  - Network latency to search service?
  - Query parsing and analysis?
  - The actual search execution?
  - Result ranking and scoring?
  - Serialising and returning results?

Step 2: Common quick wins
  a) Add caching for popular searches
     - 20% of queries are repeated — cache the results
     - Use Redis with query hash as key, TTL 5 minutes

  b) Optimise the search index
     - Are all searchable fields properly indexed?
     - Is the index up to date? (stale index = full scan)
     - Index size vs available RAM (index should fit in memory)

  c) Limit the search scope
     - Do you search everything or just recent data?
     - Can you filter before searching? (category → then full-text search)
     - Paginate: fetch top 20, not all 10,000 results

  d) Use a proper search engine
     - If you're doing LIKE '%query%' in SQL → move to Elasticsearch
     - Inverted index is orders of magnitude faster for text search

  e) Frontend improvements
     - Debounce search input (don't search on every keystroke)
     - Show cached/predictive results while the real search runs
     - Use skeleton loading so it feels faster

Step 3: Advanced optimisations
  - Shard the search index by category/region
  - Use search-as-you-type with edge n-grams
  - Pre-compute search results for trending queries
  - Use approximate nearest neighbour (ANN) for semantic search
```

---

### D.2: "Our dashboard loads in 12 seconds. How would you fix it?"

```
Step 1: Diagnose — frontend or backend problem?
  - Open browser DevTools → Network tab → what takes longest?
  - Is it one huge API call or many small ones?
  - Is the HTML/JS bundle too big?

If it's the API:
  1. Are you running expensive aggregation queries on every page load?
     → Pre-compute aggregations in a materialised view (refresh every 5 min)
  2. Are you loading ALL data then filtering client-side?
     → Push filters to the API/database, paginate results
  3. N+1 queries: loading a dashboard with 10 widgets = 10 sequential API calls?
     → Batch into one API call, or use GraphQL, or make them parallel

If it's the frontend:
  1. JavaScript bundle too large (2MB+)?
     → Code split: lazy load dashboard widgets
     → Tree shaking: remove unused code
  2. Rendering too many DOM elements?
     → Virtualise lists (react-window), paginate tables
  3. Too many re-renders?
     → Memoise expensive components, avoid prop drilling

If it's the data volume:
  1. Dashboard shows 1M rows of raw data?
     → Pre-aggregate: show daily/hourly summaries, drill down on demand
  2. Charts render 100K data points?
     → Downsample: human eye can't distinguish 100K points, show 1K

The meta-answer:
  "I wouldn't guess. I'd measure first using profiling tools (Lighthouse, DevTools,
   APM), identify the single biggest bottleneck, fix that, and then re-measure."
```

---

## Type E: Strategy / Priority Questions

> "You have limited time and resources. What do you do first?"
> These test your judgment, not your knowledge.

### E.1: "You just joined. The system has no tests, no CI/CD, no monitoring, poor docs. What do you do first?"

```
The wrong answer: "I'd rewrite everything"
The right answer: prioritise by risk and impact.

Week 1-2: Monitoring first (you can't fix what you can't see)
  - Add health checks, basic metrics (RED: Rate, Errors, Duration)
  - Set up alerts for critical failures
  - This gives you data to make better decisions about what to fix next

Week 3-4: CI/CD pipeline
  - Even a basic one: lint, build, deploy to staging
  - This removes the "deploy fear" that makes everyone hesitant to change things
  - Every future improvement benefits from this

Month 2: Critical path tests
  - Don't try to get 80% coverage
  - Write integration tests for the 5 most critical user flows
  - These catch the most dangerous regressions

Month 3: Start paying down the worst tech debt
  - Now you have monitoring (you can see what's broken)
  - You have CI/CD (you can deploy with confidence)
  - You have critical tests (you won't break the main flows)
  - NOW you can safely refactor

Why this order:
  Monitoring → so you can see problems
  CI/CD → so you can ship fixes safely
  Tests → so you don't create new problems
  Refactor → now you have the safety net to improve
```

---

### E.2: "We need to reduce our AWS bill by 40% in 3 months. What's your plan?"

```
Week 1: Measure (you can't cut what you don't understand)
  - AWS Cost Explorer: break down by service, tag, team
  - Find the top 5 cost drivers — they're usually 80% of the bill
  - Look for obvious waste: idle instances, unattached EBS volumes, unused load balancers

Quick wins (Week 2-3, often 15-20% savings):
  - Right-size instances: most are over-provisioned (m5.xlarge running at 5% CPU → m5.large)
  - Delete unused resources: old snapshots, orphaned volumes, test environments left running
  - Reserved Instances / Savings Plans for stable workloads (30-60% savings)
  - Spot instances for fault-tolerant workloads (60-90% savings)

Medium effort (Month 1-2, another 10-15%):
  - Optimise data transfer: keep traffic within the same AZ/region
  - S3 lifecycle policies: move old data to Glacier (90% cheaper)
  - Cache aggressively: reduce DB queries, reduce Lambda invocations
  - Auto-scaling: scale down during off-hours (nights, weekends)

Architectural changes (Month 2-3, if still needed):
  - Replace always-on services with serverless where appropriate
  - Consolidate microservices that are over-split (each ALB costs $16/month + data)
  - Move heavy computation to ARM instances (Graviton — 20% cheaper, 40% more efficient)

Governance (permanent):
  - Tag everything (team, environment, cost-centre)
  - Budget alerts per team
  - Monthly cost review meeting
  - Kill switch for non-production after business hours
```

---

### E.3: "Your API is at 80% capacity. How do you plan for 10x growth in 6 months?"

```
Month 1: Measure and model
  - Profile: which endpoints consume the most resources?
  - What's the bottleneck? CPU? Memory? Database? Network?
  - Build a load model: if traffic is 10x, what breaks first?
  - Load test current system to find actual limits, not theoretical ones

Month 2: Quick scaling wins
  - Add caching: cache DB results in Redis (often reduces DB load by 80%)
  - Optimise hot queries: add indexes, denormalise, pre-compute
  - Read replicas: offload read traffic from primary DB
  - CDN for static content
  - Connection pooling (PgBouncer for PostgreSQL)

Month 3-4: Horizontal scaling
  - Make the app stateless (sessions in Redis, not in-memory)
  - Auto-scaling groups with proper metrics
  - Load balancing across multiple instances
  - Database: shard or move read-heavy data to a read-optimised store

Month 5-6: Architecture for scale
  - Async processing for anything that doesn't need immediate response
  - CQRS: separate read and write models if read patterns differ from writes
  - Event-driven: decouple services via message queues
  - Consider multi-region if users are global

The pattern to communicate:
  "I'd follow the sequence: measure → cache → scale horizontally → rearchitect.
   Each step buys time while the next step is being implemented."
```

---

## Type F: "What Would You Choose and Why?" Decision Questions

> These are direct decision questions. The interviewer presents a scenario
> and wants you to make a choice and justify it.

### F.1: "We need a database for 500M user sessions per day. What do you pick?"

```
My recommendation: Redis (with persistence) or DynamoDB

Why NOT SQL:
  - 500M/day = ~5,800 writes/sec average, peak ~17K/sec
  - Sessions are key-value lookups (session_id → session_data)
  - No complex queries, no joins, no transactions needed
  - SQL databases can handle this but it's overkill and expensive

Why Redis:
  - In-memory: sub-millisecond reads, perfect for session lookups
  - TTL built-in: sessions automatically expire (no cleanup job needed)
  - Cluster mode: horizontal scaling across nodes
  - Concern: data is in-memory, need persistence (RDB snapshots + AOF)
  - Cost: need enough RAM for all active sessions

Why DynamoDB:
  - Managed: zero ops burden, auto-scales
  - Session ID as partition key → even distribution
  - On-demand mode handles traffic spikes without pre-planning
  - TTL built-in (delete expired sessions automatically)
  - Cost: pay-per-request, predictable

Why NOT Cassandra (even though it scales):
  - Operational complexity for a simple key-value use case
  - DynamoDB gives you Cassandra-like benefits without the ops burden

The real answer:
  "If the team already runs Redis in production → Redis Cluster
   If it's a cloud-native team that wants zero ops → DynamoDB
   The choice depends on what the team can operate, not just technical fit."
```

---

### F.2: "We're choosing between Kafka, RabbitMQ, and SQS. What do you recommend?"

```
It depends on the use case:

For event streaming / event sourcing:
  → Kafka
  - Messages are retained (replay capability)
  - Consumer groups with offset tracking
  - High throughput (millions of events/sec)
  - Ordering guaranteed within a partition
  - Tradeoff: operational complexity (ZooKeeper/KRaft, partitions, replication)

For task queues / work distribution:
  → RabbitMQ
  - Traditional message broker with acknowledgements
  - Flexible routing (direct, topic, fanout exchanges)
  - Priority queues, dead-letter queues built-in
  - Message-level acknowledgement (consumer confirms processing)
  - Tradeoff: lower throughput than Kafka, no replay

For simple async processing / serverless:
  → SQS
  - Zero operations (fully managed by AWS)
  - Scales automatically to any throughput
  - FIFO queues for ordering, standard queues for max throughput
  - Dead-letter queues built-in
  - Integrates natively with Lambda, SNS, EventBridge
  - Tradeoff: AWS lock-in, 256KB message size limit, no replay

Quick decision framework:
  - "Do I need to replay old events?" → Kafka
  - "Do I need complex routing?" → RabbitMQ
  - "Do I want zero ops and I'm on AWS?" → SQS
  - "Am I doing event-driven microservices?" → Kafka
  - "Am I doing background job processing?" → SQS or RabbitMQ
```

---

### F.3: "Should we build this feature in-house or use a third-party service?"

```
Build in-house when:
  - It's your core competency (you're a payments company building payment processing)
  - You need deep customisation that third-party can't provide
  - The third-party cost will scale badly with your growth
  - You need full control over uptime, data residency, compliance
  - The domain is well-understood and stable

Use a third-party when:
  - It's NOT your core business (auth, email, SMS, analytics, payments for non-fintech)
  - Time to market matters more than customisation
  - The third-party has specialised expertise you'd take years to build
  - The integration is standard and well-documented
  - Your team is small and can't afford the maintenance burden

Framework for the decision:
  1. "Is this our core differentiator?" → If yes, build. If no, buy.
  2. "What's the total cost?" → Include maintenance, not just build cost.
     Rule of thumb: building costs 3-5x what you initially estimate.
  3. "What's the switching cost?" → How locked in will we be?
  4. "What's the security/compliance impact?" → Does data leave our control?

Real examples:
  - Auth: use Auth0/Clerk unless you're a security company (build = 6-12 months, endless CVEs)
  - Email sending: use SendGrid/SES (building a reliable email sender is deceptively hard)
  - Search: build with Elasticsearch if core product, use Algolia if it's just a feature
  - Payments: use Stripe unless you process >$1B/year and need lower margins
```

---

## Type G: "Tell Me About a Time When..." Behavioural + Technical Questions

> These blend behavioral and technical. Prepare 3-4 real stories from your experience
> and adapt them to different questions.

### G.1: Common questions and how to structure answers

```
Use the STAR format but make it TECHNICAL:
  Situation: what was the system, what was the scale?
  Task: what needed to happen and why was it hard?
  Action: what did YOU specifically do? (technical details matter)
  Result: what was the measurable outcome?

Q: "Tell me about a time you dealt with a production outage"
  Bad: "The site went down and I fixed it"
  Good: "Our payment service was returning 503s during a flash sale.
    I identified that the connection pool was exhausted because each
    transaction was holding a connection for 30 seconds due to a
    third-party API timeout. I reduced the timeout to 3 seconds,
    added a circuit breaker, and the error rate dropped from 15% to 0.1%
    within 5 minutes. I then wrote a postmortem and we added connection
    pool monitoring as a standard alert."

Q: "Tell me about a technical decision you made that had significant impact"
  Structure:
  - What were the options?
  - What data did you use to decide?
  - What were the trade-offs?
  - What was the outcome?
  - What would you do differently now?

Q: "Tell me about a time you disagreed with a technical approach"
  Show:
  - You listened to the other side
  - You used data/evidence, not authority
  - You were willing to be wrong
  - The team made a better decision because of the discussion

Q: "Tell me about a time you had to make a decision with incomplete information"
  Show:
  - You identified what you did know vs what you didn't
  - You made a reversible decision (two-way door)
  - You set up monitoring to validate the decision
  - You were prepared to course-correct
```

---

## Type H: Deep Concept Questions

> "Explain X to me" — tests whether you truly understand, not just memorised.

### H.1: Explain eventual consistency like I'm a product manager

```
"Imagine you update your profile photo on Instagram. Your friend in London
checks your profile 2 seconds later and still sees the old photo. 5 seconds
later, they see the new one.

That's eventual consistency — the system guarantees that everyone will
eventually see the update, but not necessarily immediately.

Why do we do this? Because the alternative (everyone sees it instantly)
requires all servers worldwide to agree before showing anything. That
makes every action slow.

The trade-off: speed and availability vs seeing slightly stale data for
a brief period. For a profile photo, that's fine. For a bank balance,
that's NOT fine — that needs strong consistency."
```

---

### H.2: Explain the CAP theorem with a real example

```
"Imagine you have a distributed database with copies in London and New York.

Normal operation: a write in London replicates to New York. Everything works.

Now the network cable between London and New York breaks (partition).

You have two choices:

  Choice 1 (Consistency): Stop accepting writes until the connection is fixed.
    Both cities always show the same data. But users in London can't update
    their profiles. That's choosing CP (Consistency + Partition tolerance).
    Example: your bank — they'd rather reject your transaction than let
    two ATMs give out the same money.

  Choice 2 (Availability): Keep both cities running independently.
    Users can still write in both cities. But London and New York might
    have different data until the cable is fixed. That's choosing AP
    (Availability + Partition tolerance).
    Example: social media — better to show a slightly stale feed than
    to show nothing at all.

The key insight: you're not choosing for the whole system. Different parts
of the same system can make different choices. User sessions: AP is fine.
Financial transactions: must be CP."
```

---

### H.3: What's the difference between horizontal and vertical scaling? When does each fail?

```
Vertical scaling (scale up): bigger machine
  - More CPU, RAM, faster disks
  - Simple: no code changes needed
  - Limit: you can't buy a machine bigger than the biggest available
  - Cost: exponential (2x CPU ≠ 2x price, more like 3-4x)
  - Downtime: usually need to stop and restart on new machine
  - When it fails: when you hit hardware limits (~100 cores, ~12TB RAM on AWS)
    or when cost becomes absurd

Horizontal scaling (scale out): more machines
  - Add more servers behind a load balancer
  - Limit: theoretically unlimited
  - Complexity: need stateless apps, distributed data, load balancing
  - When it fails:
    → When your application has shared state (sessions in memory)
    → When your database is the bottleneck (adding app servers doesn't help)
    → When the problem is a hot key/partition (more shards won't help if
       one key gets all the traffic)

The real answer:
  "Start vertical (it's simpler), go horizontal when vertical hits its limit.
   But make your application stateless from day one so the transition is easy."
```

---

### H.4: What are idempotency and exactly-once delivery? Why do they matter?

```
Idempotency: doing the same operation multiple times has the same effect as doing it once.
  - Example: SET user.email = "a@b.com" is idempotent (run it 10 times, same result)
  - Example: balance += 100 is NOT idempotent (run it 10 times, you added $1000)

Why it matters:
  - In distributed systems, messages can be delivered more than once
  - Network timeout doesn't mean the server didn't receive it — maybe the ACK was lost
  - If the client retries, the server might process the request twice

How to make operations idempotent:
  1. Idempotency key: client sends a unique ID with each request
     - Server checks: "have I seen this ID before?" → yes, return cached result
     - Stripe uses this: every payment has an Idempotency-Key header
  2. Use absolute values, not deltas: SET balance = 500, not balance += 100
  3. Database constraints: UNIQUE on (user_id, transaction_id)

Exactly-once delivery:
  - Technically impossible in distributed systems (proven by theory)
  - What people really mean: "at-least-once delivery + idempotent processing"
  - Kafka "exactly-once" = idempotent producer + transactional consumer
  - The illusion of exactly-once, achieved through engineering
```

---

## How to Use These in Interviews

1. Clarify the constraints (2 min)
   "Before I dive in — is this a cloud environment or on-prem?
    What's the current monitoring setup? How large is the team?"

2. State your hypothesis (1 min)
   "Based on the symptoms — consistency issues only under high traffic —
    my first hypothesis is replication lag or race conditions."

3. Describe your diagnostic approach (3-5 min)
   "Here's how I'd systematically narrow it down..."
   Show that you have a structured method, not random guessing.

4. Propose solutions with trade-offs (5 min)
   "There are three approaches, each with different trade-offs..."
   Always present options, not a single answer.

5. Discuss prevention (2 min)
   "To prevent this from happening again, I'd add..."
   This shows you think beyond the immediate fix.

Key: interviewers want to see HOW you think, not just the right answer.
  - Ask clarifying questions (shows you don't jump to conclusions)
  - Think out loud (share your reasoning process)
  - Consider trade-offs (nothing is free)
  - Mention monitoring/alerting (shows operational maturity)
```
