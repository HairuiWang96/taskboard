# System Design — Senior Full Stack Engineer Reference

> Comprehensive guide for both daily engineering decisions and system design interviews.
> Covers architecture, data, infrastructure, reliability, and real-world patterns.

---

## Table of Contents

1. [How to Approach a System Design Interview](#1-how-to-approach-a-system-design-interview)
2. [Estimation & Back-of-Envelope Math](#2-estimation--back-of-envelope-math)
3. [Networking & Protocols](#3-networking--protocols)
4. [API Design](#4-api-design)
5. [Databases](#5-databases)
6. [Caching](#6-caching)
7. [Message Queues & Event Streaming](#7-message-queues--event-streaming)
8. [Scalability Patterns](#8-scalability-patterns)
9. [Reliability & Fault Tolerance](#9-reliability--fault-tolerance)
10. [Security](#10-security)
11. [Real-Time Systems](#11-real-time-systems)
12. [Storage & File Systems](#12-storage--file-systems)
13. [Search](#13-search)
14. [Microservices & Service Architecture](#14-microservices--service-architecture)
15. [Observability](#15-observability)
16. [Infrastructure & Deployment](#16-infrastructure--deployment)
17. [Common System Design Problems](#17-common-system-design-problems)
18. [Trade-off Cheat Sheet](#18-trade-off-cheat-sheet)

---

## 1. How to Approach a System Design Interview

The interviewer is not looking for a perfect answer. They are watching how you think and communicate.

### The framework (follow this every time)

```text
Step 1 — Clarify requirements (3-5 min)
  Functional:    What does the system do?
  Non-functional: Scale? Latency? Availability? Consistency?
  Constraints:   Budget? Team size? Existing tech?

Step 2 — Estimate scale (2-3 min)
  Users: DAU, MAU
  Read/write ratio
  Data volume: how much stored per day/year?
  Traffic: requests per second (RPS)

Step 3 — High-level design (10 min)
  Draw the boxes: client → API → services → DB
  Don't dive deep yet — get the full picture first

Step 4 — Deep dive (15-20 min)
  Pick the hardest or most interesting part
  Let the interviewer steer if they want

Step 5 — Wrap up (5 min)
  Bottlenecks you'd address
  What you'd monitor
  What you'd do differently with more time
```

### Questions to always ask upfront

- "How many daily active users are we expecting?"
- "What's the read-to-write ratio?"
- "Do we need global availability, or one region?"
- "Is strong consistency required, or is eventual consistency acceptable?"
- "Are there latency SLAs? (e.g. p99 < 200ms)"
- "Do we need to design for the MVP or for scale in 5 years?"

### Saying this out loud impresses interviewers

- "I'm going to start with a simple design and add complexity only where the scale demands it."
- "The bottleneck here is X — let me talk through how I'd address that."
- "This is a trade-off between consistency and availability — given the requirements, I'd lean toward..."
- "In production I'd monitor X metric to know when to scale this."

---

## 2. Estimation & Back-of-Envelope Math

Knowing these numbers cold lets you reason about scale confidently.

### Storage units

```text
1 KB  = 1,000 bytes       (a short text message)
1 MB  = 1,000 KB          (a photo)
1 GB  = 1,000 MB          (a movie)
1 TB  = 1,000 GB          (~200,000 photos)
1 PB  = 1,000 TB          (large data warehouse)
```

### Time units

```text
1 ms  = 1/1,000 second
1 μs  = 1/1,000,000 second

L1 cache access:          ~1 ns
L2 cache access:          ~4 ns
RAM access:               ~100 ns
SSD read:                 ~100 μs
HDD read:                 ~10 ms
Network roundtrip (same datacenter): ~1 ms
Network roundtrip (cross-continent): ~150 ms
```

### Traffic estimation example

```text
Problem: Design Twitter. 300M DAU, each user views 20 tweets/day.

Read RPS:
  300M users × 20 tweets / 86,400 seconds = ~70,000 RPS reads

Write RPS (assume 1% of users tweet once per day):
  3M tweets / 86,400 = ~35 RPS writes

Read:write ratio = 2,000:1 → heavily read-heavy → cache everything

Storage (tweets):
  35 RPS × 86,400 = ~3M tweets/day
  Each tweet: 200 bytes text + 50 bytes metadata = 250 bytes
  3M × 250 bytes = 750 MB/day
  750 MB × 365 = ~274 GB/year (just text, no media)
```

### Useful rules of thumb

```text
1 server handles:     ~10,000 HTTP requests/second (rough, varies by payload)
Postgres (indexed):   ~10,000 reads/second, ~5,000 writes/second per instance
Redis:                ~100,000 operations/second
Typical p99 target:   < 100ms for user-facing APIs
Availability nines:
  99%    = 3.65 days downtime/year
  99.9%  = 8.7 hours downtime/year
  99.99% = 52 minutes downtime/year
  99.999%= 5 minutes downtime/year  (very hard to achieve)
```

---

## 3. Networking & Protocols

### HTTP/1.1 vs HTTP/2 vs HTTP/3

```text
HTTP/1.1:
  - One request per connection (or keep-alive with pipelining, but rarely used)
  - Head-of-line blocking: second request waits for first to complete
  - Workaround: open 6 parallel connections per domain (browsers do this)

HTTP/2:
  - Multiplexing: many requests over one connection simultaneously
  - Header compression (HPACK) — reduces overhead
  - Server push (send resources before client asks) — rarely used in practice
  - Still uses TCP, so head-of-line blocking at the transport layer

HTTP/3:
  - Uses QUIC (UDP-based) instead of TCP
  - No head-of-line blocking at any layer
  - Better performance on lossy networks (mobile)
  - TLS 1.3 built in — faster handshake
```

### TCP vs UDP

```text
TCP (Transmission Control Protocol):
  - Reliable: guarantees delivery, ordering, no duplicates
  - Connection-oriented: 3-way handshake before data flows
  - Slower — retransmits lost packets
  - Use for: HTTP, databases, email, anything where accuracy matters

UDP (User Datagram Protocol):
  - Unreliable: no guarantee of delivery or order
  - No connection — just fire and forget
  - Faster — no handshake, no retransmits
  - Use for: video calls, games, DNS, live streaming
    (a dropped video frame is better than a delayed one)
```

### DNS (Domain Name System)

```text
How it works:
  1. Browser asks OS: "What is the IP for api.solace.health?"
  2. OS checks local cache → checks /etc/hosts → asks DNS resolver
  3. Resolver asks root nameserver → TLD nameserver → authoritative nameserver
  4. Returns IP, cached for TTL duration

TTL (Time to Live): how long the answer is cached
  - Low TTL (60s): faster failover, more DNS queries (cost)
  - High TTL (1h+): fewer queries, slower failover

CDN uses DNS: cdn.example.com resolves to different IPs based on user location
  → Geo-routing: user in Tokyo gets Tokyo edge node IP
```

### TLS / HTTPS

```text
TLS handshake (simplified):
  1. Client → Server: "I support these cipher suites"
  2. Server → Client: certificate + chosen cipher
  3. Client verifies certificate against a trusted CA
  4. Key exchange → shared secret established
  5. All further communication encrypted

TLS 1.3 (current):
  - 1-RTT handshake (was 2-RTT in 1.2)
  - 0-RTT resumption for returning connections (faster, minor replay risk)

Certificate:
  - Signed by a Certificate Authority (CA) like Let's Encrypt
  - Contains: domain name, public key, expiry date
  - Browser trusts it because it trusts the CA
```

---

## 4. API Design

### REST

```text
Principles:
  - Stateless: server holds no client state between requests
  - Resources as nouns: /users, /tasks — NOT /getUser, /createTask
  - HTTP verbs express the action: GET, POST, PUT, PATCH, DELETE
  - Uniform interface: consistent patterns across all endpoints

Versioning strategies:
  URL:     /api/v1/tasks         ← most common, easy to route
  Header:  Accept: application/vnd.api+json;version=1
  Query:   /tasks?version=1      ← messy, avoid

Response envelope pattern:
  {
    "data": [...],
    "meta": { "page": 1, "total": 243 },
    "errors": null
  }
```

### GraphQL

```text
What it solves:
  - Over-fetching: REST returns full user object, you only needed name
  - Under-fetching: you need user + their tasks → REST = 2 requests, GraphQL = 1

How it works:
  - Single endpoint: POST /graphql
  - Client specifies exact fields it needs in the query
  - Server resolves each field (resolvers)

When to use GraphQL:
  ✓ Multiple clients (web, mobile) needing different data shapes
  ✓ Rapid frontend iteration — no backend changes for new data needs
  ✗ Simple CRUD apps — REST is easier
  ✗ File uploads, binary data — REST handles better

N+1 in GraphQL:
  Every User resolves their posts → 1 query for users + N queries for posts
  Solution: DataLoader (batches and caches DB calls per request)
```

### gRPC

```text
What it is:
  - Remote Procedure Call framework by Google
  - Uses Protocol Buffers (protobuf) — binary serialization (smaller + faster than JSON)
  - Strongly typed contracts via .proto files
  - HTTP/2 based — multiplexing, streaming built in

When to use:
  ✓ Internal service-to-service communication (microservices)
  ✓ High throughput, low latency requirements
  ✓ Streaming (server-streaming, client-streaming, bidirectional)
  ✗ Browser clients — limited browser support (need grpc-web proxy)
  ✗ Public APIs — REST/JSON is more universally consumable
```

### Pagination patterns

```text
Offset pagination:
  GET /tasks?page=3&limit=20
  SQL: LIMIT 20 OFFSET 40

  ✓ Easy to implement, user can jump to any page
  ✗ Slow on large offsets — DB scans and discards offset rows
  ✗ Inconsistent if data changes between pages (items shift)

Cursor pagination:
  GET /tasks?cursor=<opaque_token>&limit=20
  cursor encodes: last seen ID + sort value

  SQL: WHERE id < :lastId ORDER BY id DESC LIMIT 20

  ✓ Consistent — new items don't shift existing pages
  ✓ Fast — no scan, uses index
  ✗ Can't jump to arbitrary page ("go to page 50")
  Use for: infinite scroll, feeds, real-time data

Keyset pagination:
  Variant of cursor — uses actual column values instead of opaque token
  WHERE (created_at, id) < (:lastCreatedAt, :lastId)
  Good when: stable sort order, compound index on sort columns
```

---

## 5. Databases

### Relational (SQL) vs Document (NoSQL)

```text
Relational (Postgres, MySQL):
  ✓ ACID transactions — safe for financial, medical, critical data
  ✓ Joins — query across related tables efficiently
  ✓ Strong consistency — read always reflects latest write
  ✓ Schema enforces data integrity
  ✗ Hard to scale writes horizontally (sharding is complex)
  ✗ Schema changes require migrations (can be risky at scale)

Document (MongoDB, DynamoDB):
  ✓ Flexible schema — store whatever shape per document
  ✓ Scales horizontally (sharding built in)
  ✓ Fast for read/write of a single document (no joins)
  ✗ No native joins — you denormalize or do joins in code (N+1 risk)
  ✗ Weaker consistency models by default
  ✗ Transactions exist but are complex

Rule of thumb:
  - Default to Postgres. Switch to NoSQL when you have a specific reason:
    very high write volume, flexible schema is genuinely needed, or
    document-shaped data (e.g. JSON event logs).
```

### ACID

```text
Atomicity:   All operations in a transaction succeed, or none do
             (transfer: debit + credit are one unit — no partial)

Consistency: Transaction brings DB from one valid state to another
             (constraints, foreign keys always satisfied)

Isolation:   Concurrent transactions don't interfere with each other
             (two users buying last ticket — only one succeeds)

Durability:  Committed transactions survive crashes
             (written to disk, not just memory)
```

### Isolation levels (common interview topic)

```sql
-- Weakest → Strongest (more protection = more locking = slower)

READ UNCOMMITTED  -- can read data another transaction hasn't committed yet (dirty read)
READ COMMITTED    -- only reads committed data (default in Postgres)
REPEATABLE READ   -- same row returns same value within a transaction (no non-repeatable reads)
SERIALIZABLE      -- transactions behave as if run one at a time (safest, slowest)

-- Postgres default: READ COMMITTED
-- Use SERIALIZABLE for: financial transactions, inventory (last item problem)
```

### Indexing

```sql
-- Index = sorted lookup structure — turns O(n) scan into O(log n) lookup

-- When to add an index:
--   Column appears in WHERE, JOIN ON, or ORDER BY frequently
--   Column has high cardinality (many unique values — IDs, emails, timestamps)

-- When NOT to add an index:
--   Low cardinality columns (boolean, status with 3 values) — not worth it
--   Tables with very high write volume — every insert updates the index
--   Small tables — full scan is faster than index + random read

-- Types:
CREATE INDEX idx_tasks_user_id ON tasks(user_id);                  -- B-tree (default)
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at); -- composite
CREATE UNIQUE INDEX idx_users_email ON users(email);                -- unique
CREATE INDEX idx_tasks_title_fts ON tasks USING GIN(to_tsvector('english', title)); -- full-text

-- EXPLAIN ANALYZE — shows query plan, actual execution time
EXPLAIN ANALYZE SELECT * FROM tasks WHERE user_id = '123';
-- Look for: Seq Scan (bad on large tables) vs Index Scan (good)
```

### Database normalization

```text
1NF: Each column holds one atomic value (no arrays in a cell)
2NF: Every non-key column depends on the WHOLE primary key (no partial deps)
3NF: No column depends on another non-key column (no transitive deps)

Denormalization:
  Intentionally breaking normal form for read performance.
  Example: storing user.name on the tasks table so you don't need a JOIN.
  Trade-off: faster reads, but updates to user.name must update tasks too.
  Use when: read-heavy, joins are a proven bottleneck.
```

### Read replicas

```text
Primary (leader): handles all writes
Replicas (followers): receive a copy of writes, handle reads

Benefits:
  - Scale read traffic horizontally (add more replicas)
  - Replicas can serve analytics queries without blocking writes

Replication lag:
  - There is a delay between write on primary and appearing on replica
  - "Read your own writes" problem: user submits form, immediately reads
    back → may hit replica that hasn't caught up yet
  - Fix: route reads immediately after writes to primary, or use sessions

Postgres replication types:
  Streaming replication: physical, byte-level copy of WAL (write-ahead log)
  Logical replication: row-level changes, can replicate to different schema
```

### Sharding

```text
Split data across multiple DB instances by a shard key.
Each instance owns a partition of the data.

Example: user_id % 4 → users 0-24% on shard A, 25-49% on B, etc.

Shard key choice matters:
  ✓ High cardinality — spreads load evenly
  ✓ Appears in most queries — avoid cross-shard queries
  ✗ Hot shard: if one user generates 80% of traffic, one shard is overloaded

Cons:
  - Cross-shard joins are expensive/impossible
  - Rebalancing shards when adding new nodes is complex
  - Transactions spanning shards require distributed transactions (very hard)

When to shard:
  - Postgres vertical scaling maxed out (256 GB RAM, fastest NVMe SSD)
  - Write volume too high for one primary
  Most startups never need this. Try read replicas + caching first.
```

### Connection pooling

```text
Opening a DB connection is expensive (~5-10ms, uses memory on DB server).
A pool keeps N connections open and reuses them.

PgBouncer: external connection pooler for Postgres
  - Sits between app and DB
  - App may have 1000 concurrent requests but only 20 DB connections open

In Node.js (pg Pool):
  const pool = new Pool({ max: 20, idleTimeoutMillis: 30000 });
  // max: max connections in pool
  // if all 20 are busy, new queries queue and wait

Signs of pool exhaustion:
  - Queries timing out under load
  - "remaining connection slots are reserved" error in Postgres
  - p99 latency spikes during traffic bursts

Sizing the pool:
  Rule of thumb: pool size ≈ (num_cpu_cores × 2) + num_disk_spindles
  For SSDs: pool size ≈ num_cpu_cores × 2
  Too small = queued requests. Too large = DB context switching overhead.
```

---

## 6. Caching

### Where caches live

```text
L1 — In-process memory (a Map/object in your Node.js process)
  ✓ Fastest — no network
  ✗ Not shared across servers, lost on restart, limited by process memory

L2 — Distributed cache (Redis, Memcached)
  ✓ Shared across all servers, survives individual server restarts
  ✓ Rich data structures (Redis): sorted sets, pub/sub, atomic operations
  ✗ Network hop (~1ms), single point of failure if not clustered

L3 — CDN (Cloudflare, CloudFront, Fastly)
  ✓ Caches HTTP responses at edge nodes globally
  ✓ Reduces load on your origin servers entirely
  ✓ DDoS protection built in
  ✗ Only for public, cacheable content (not user-specific or authenticated)

L4 — Database query cache
  ✓ DB can cache result sets internally
  ✗ Usually disabled or unreliable — don't rely on it
```

### Cache invalidation strategies

```text
TTL (Time to Live):
  Cache entry expires after N seconds automatically.
  ✓ Simple, automatic
  ✗ May serve stale data for up to N seconds
  Use for: semi-static data (config, feature flags, user profiles)

Write-through:
  On every write, update cache AND database together.
  ✓ Cache always fresh
  ✗ Write latency increases (two writes)
  Use for: data you need fresh immediately after writing

Write-behind (write-back):
  Write to cache only, flush to DB asynchronously.
  ✓ Very fast writes
  ✗ Risk of data loss if cache crashes before flush
  Use for: high-volume counters, analytics events

Cache-aside (lazy loading):
  App checks cache first. On miss, load from DB and populate cache.
  ✓ Only cache what's actually used
  ✗ Cache miss = full DB query latency
  Use for: most general caching scenarios

Read-through:
  Cache sits in front of DB. On miss, cache fetches from DB itself.
  ✓ App code is simpler (only talks to cache)
  ✗ Cold start — first request always slow
```

### Cache stampede (thundering herd)

```text
Problem:
  Popular cached item expires.
  1000 concurrent requests all get a cache miss at the same moment.
  All 1000 hit the database simultaneously → DB overwhelmed.

Solutions:
  1. Mutex / lock: first request acquires lock, fetches from DB, populates cache.
     Other 999 wait for lock, then read from cache.

  2. Probabilistic early expiration: before TTL expires, randomly refresh
     with a small probability proportional to how close to expiry we are.

  3. Background refresh: a separate job refreshes the cache before it expires.
     Cache never actually expires in production — always has a value.

  4. Stale-while-revalidate (HTTP Cache-Control header):
     Cache-Control: max-age=300, stale-while-revalidate=60
     Serve stale for up to 60s while revalidating in background.
```

### Redis patterns

```ts
// Basic get/set with TTL
await redis.set('user:123', JSON.stringify(user), 'EX', 3600); // expires in 1h
const cached = await redis.get('user:123');

// Atomic increment (counters, rate limiting)
await redis.incr('requests:user:123');
await redis.expire('requests:user:123', 60); // reset window every 60s

// Sorted set — leaderboard, priority queue
await redis.zadd('leaderboard', score, userId);
const top10 = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');

// Pub/Sub — notify other servers
publisher.publish('task:completed', JSON.stringify({ taskId, userId }));
subscriber.subscribe('task:completed', (message) => { ... });

// Distributed lock (prevent race conditions across servers)
const acquired = await redis.set('lock:resource', '1', 'NX', 'EX', 30);
// NX = only set if not exists — atomic operation
if (!acquired) { /* someone else holds the lock */ }
```

---

## 7. Message Queues & Event Streaming

### Why queues?

```text
HTTP is synchronous — caller waits for response.
Queues are asynchronous — caller fires and forgets.

Use cases:
  - Sending emails/SMS after signup (slow, don't block HTTP response)
  - Processing uploaded images/videos (seconds to minutes)
  - Propagating events to multiple downstream services
  - Smoothing traffic spikes — queue absorbs burst, worker processes at steady rate
  - Retry logic — failed jobs re-queued automatically
```

### Message queue vs event stream

```text
Message Queue (RabbitMQ, SQS, BullMQ):
  - Message delivered to ONE consumer (competing consumers pattern)
  - Message deleted after successful processing
  - Good for: tasks that need to happen once (send email, process payment)

Event Stream (Kafka, Kinesis):
  - Events stored durably as a log (like a database)
  - MANY consumers can read the same events independently
  - Events retained for days/weeks — replay is possible
  - Good for: audit logs, event sourcing, feeding multiple downstream services
  - Example: "order.placed" event → inventory service, notification service,
    analytics service all consume independently
```

### Kafka concepts

```text
Topic: a named stream of events (like a table in a DB)
Partition: a topic split into N partitions for parallel processing
  - Messages within a partition are ordered
  - Messages across partitions are NOT ordered
  - More partitions = more parallelism

Consumer group: a set of consumers sharing the work of a topic
  - Each partition consumed by exactly ONE consumer in the group
  - Add more consumers (up to partition count) to scale processing

Offset: position in a partition (like a bookmark)
  - Consumer commits offset after processing — survives restarts
  - Can reset offset to replay historical events

Producer → Topic (partitioned) → Consumer Group
```

### Reliability patterns

```text
At-most-once:  Message may be lost, never duplicated (fire and forget)
At-least-once: Message never lost, may be delivered multiple times
               → Your consumer must be IDEMPOTENT (safe to process twice)
Exactly-once:  Never lost, never duplicated — hardest, requires coordination

Idempotency:
  Processing the same message twice has the same result as processing it once.
  Implementation: store processed message IDs in DB, skip if already seen.
  Example: "send email for order 123" — check if email already sent for order 123.

Dead Letter Queue (DLQ):
  Messages that fail repeatedly (after N retries) are moved to a DLQ.
  Team inspects DLQ manually or via alerting.
  Prevents one bad message from blocking the entire queue.

Backpressure:
  Consumer is slower than producer → queue grows unbounded → OOM.
  Fix: consumer signals it's overwhelmed → producer slows down.
  In practice: monitor queue depth, alarm if growing, scale consumers.
```

---

## 8. Scalability Patterns

### Load balancing

```text
Distributes traffic across multiple servers.

Algorithms:
  Round-robin:       requests go to each server in rotation (default)
  Least connections: next request → server with fewest active connections
  IP hash:           same client IP → always same server (sticky)
  Weighted:          more powerful servers get more traffic

Layer 4 vs Layer 7:
  L4 (transport): routes by IP + port — fast, no HTTP awareness
  L7 (application): routes by URL path, headers, cookies — smarter but slower
  Most modern load balancers (Nginx, AWS ALB) operate at L7

Health checks:
  LB pings /health every 5s. Unhealthy servers removed from rotation.
  Servers added back when health checks pass again.
```

### Horizontal scaling

```text
Stateless services scale horizontally by adding instances.
All state must be external (DB, Redis, S3) — not in process memory.

Checklist for horizontal scalability:
  ✓ No local file system writes (use S3/object storage)
  ✓ No in-memory sessions (use Redis)
  ✓ No in-process caches that can diverge (use Redis)
  ✓ DB connection pooling (don't open too many connections per instance)
  ✓ Idempotent job processing (multiple workers may pick up same job)
```

### Auto-scaling

```text
Cloud services (AWS, GCP) can automatically add/remove instances based on metrics.

Scale out triggers:
  CPU > 70% for 5 minutes → add 2 instances
  Queue depth > 1000 → add worker instances

Scale in:
  CPU < 30% for 15 minutes → remove instances
  (scale in slower than scale out to avoid thrashing)

Predictive scaling:
  Know your traffic patterns → pre-scale before the spike
  E.g. Solace: advocate shift changes at 8am → pre-scale at 7:50am
```

### Rate limiting

```text
Prevent abuse, ensure fair usage, protect downstream services.

Algorithms:
  Fixed window:   count requests per minute, reset at :00
                  Problem: 60 at :59 + 60 at :01 = 120 in 2 seconds
  Sliding window: count requests in the last 60 seconds (rolling)
                  Smoother, more accurate, slightly more memory
  Token bucket:   bucket of N tokens, refills at rate R/sec
                  Allows bursts up to bucket size, smooth average rate
  Leaky bucket:   requests queue up, processed at constant rate (no bursts)

Implementation:
  Redis INCR + EXPIRE for fixed window (atomic, works across servers)
  Redis sorted sets for sliding window (store timestamps as scores)

Response:
  HTTP 429 Too Many Requests
  Retry-After: 30  (header telling client when to retry)
```

### Circuit breaker

```text
Problem: Service A calls Service B. B is slow or down.
  → A's threads pile up waiting for B
  → A exhausts its connection pool
  → A goes down too (cascading failure)

Circuit breaker pattern:
  CLOSED (normal):  requests flow through, errors tracked
  OPEN (tripped):   after N failures, stop calling B immediately (fail fast)
                    return cached data or error without waiting
  HALF-OPEN (test): after timeout, allow one request through
                    if it succeeds → CLOSED; if it fails → OPEN again

Libraries: opossum (Node.js), Resilience4j (Java), Polly (.NET)

Think of it like an electrical circuit breaker: trips to protect the system.
```

---

## 9. Reliability & Fault Tolerance

### Availability vs Consistency (CAP Theorem)

```text
CAP Theorem: A distributed system can guarantee at most 2 of:
  Consistency:  every read returns the most recent write
  Availability: every request gets a (non-error) response
  Partition tolerance: system works even if network partitions occur

Since network partitions WILL happen, you choose: CP or AP

CP (Consistency + Partition tolerance):
  During a partition, system rejects requests rather than return stale data
  Examples: Postgres, HBase, ZooKeeper
  Use for: banking, medical records, inventory (correctness critical)

AP (Availability + Partition tolerance):
  During a partition, system returns possibly stale data
  Examples: DynamoDB, Cassandra, CouchDB
  Use for: social feeds, product catalogs, analytics (availability critical)

In practice: most systems are "mostly consistent" — they make trade-offs
based on the specific operation, not one global choice.
```

### Eventual consistency

```text
Writes propagate to all nodes eventually, but not instantly.
Reads may return stale data for a short window.

Acceptable for:
  - Social media likes/counts (off by a few for seconds is fine)
  - Product view counts
  - Email delivery status

Not acceptable for:
  - Bank balances
  - Seat reservations (two users booking the last seat)
  - Medical records (patient takes wrong medication dosage)
```

### Idempotency

```text
An operation is idempotent if applying it multiple times = same as once.

HTTP:
  GET, PUT, DELETE are idempotent by definition
  POST is NOT idempotent (POST /orders = creates a new order each time)

Making POST idempotent:
  Client sends a unique Idempotency-Key header
  Server stores key + response in DB
  If same key seen again, return stored response (don't process again)
  Used by: Stripe API (prevents double-charges on retry)

Database:
  INSERT ... ON CONFLICT DO NOTHING  -- safe to run twice
  UPSERT (INSERT ... ON CONFLICT DO UPDATE)
```

### Retry strategies

```ts
// Naive retry — can overwhelm a struggling service
for (let i = 0; i < 3; i++) {
  try { return await callService(); } catch (e) { continue; }
}

// Exponential backoff — each retry waits longer
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// With jitter — randomize delay to prevent thundering herd on retry
const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
```

### Saga pattern (distributed transactions)

```text
Problem: A transaction spans multiple services. One step fails midway.
  E.g. Order service + Payment service + Inventory service

Two-phase commit (2PC):
  Coordinator asks all services to "prepare" → all say yes → commit
  ✗ Coordinator is SPOF, slow, complex, ties up resources

Saga pattern:
  Break transaction into local transactions, each publishing an event.
  If a step fails → compensating transactions undo previous steps.

Choreography: each service publishes events, others react (decentralized)
Orchestration: a central saga orchestrator tells each service what to do

Example (order flow):
  1. OrderService: create order (pending)    → emit "order.created"
  2. PaymentService: charge card             → emit "payment.completed"
  3. InventoryService: reserve item          → emit "inventory.reserved"
  4. OrderService: mark order (confirmed)

If step 3 fails:
  → emit "inventory.failed"
  → PaymentService: refund card (compensating transaction)
  → OrderService: cancel order
```

---

## 10. Security

### Authentication vs Authorization

```text
Authentication (AuthN): Who are you? (prove your identity)
  → Login with email/password, OAuth, biometrics

Authorization (AuthZ): What can you do? (are you allowed?)
  → Can this user read this record? Can they delete it?
```

### JWT deep dive

```text
Structure: header.payload.signature (base64url encoded)
  Header:    { "alg": "HS256", "typ": "JWT" }
  Payload:   { "sub": "userId", "role": "admin", "iat": 1234, "exp": 5678 }
  Signature: HMAC-SHA256(base64(header) + "." + base64(payload), secret)

Verification: anyone with the secret can verify the signature
Stateless: server doesn't store anything — all data in the token

Security concerns:
  - Store in httpOnly cookie (not localStorage) to prevent XSS theft
  - Short expiry (15min) + refresh token pattern
  - Refresh tokens: long-lived, stored in DB, can be revoked
  - Access token: short-lived JWT, not stored in DB
  - Rotate refresh tokens on use (detect theft: old token = alarm)

Algorithm choice:
  HS256: symmetric — same secret to sign and verify (single server)
  RS256: asymmetric — private key signs, public key verifies (microservices)
         Auth service signs; other services verify with public key only
```

### OAuth 2.0 / OpenID Connect

```text
OAuth 2.0: authorization framework (delegate access — "login with Google")
OpenID Connect (OIDC): identity layer on top of OAuth (adds ID token)

Authorization Code Flow (most secure — for web apps):
  1. User clicks "Login with Google"
  2. App redirects to Google with client_id, scope, redirect_uri
  3. User authenticates with Google, grants permission
  4. Google redirects back with one-time authorization code
  5. App's backend exchanges code for access_token + id_token (server-to-server)
  6. Backend verifies id_token, creates session

Why not implicit flow:
  Tokens returned in redirect URL → visible in browser history, logs
  Deprecated in OAuth 2.1
```

### Common vulnerabilities

```text
SQL Injection:
  Attack: user inputs "'; DROP TABLE users; --"
  Fix: ALWAYS use parameterized queries / prepared statements
       ORMs (Drizzle, Prisma) do this automatically
  Never: `SELECT * FROM users WHERE name = '${input}'`

XSS (Cross-Site Scripting):
  Attack: inject <script>steal_cookies()</script> into a page
  Fix: React escapes JSX output by default
       Never use dangerouslySetInnerHTML with user input
       Content-Security-Policy header

CSRF (Cross-Site Request Forgery):
  Attack: malicious site makes authenticated request on user's behalf
  Fix: SameSite=Strict on cookies, CSRF tokens for forms
       Modern browsers block cross-site cookies by default (SameSite=Lax)

IDOR (Insecure Direct Object Reference):
  Attack: GET /users/123 → change to /users/124 to see someone else's data
  Fix: always check ownership in the query:
       WHERE id = :id AND user_id = :currentUserId

Rate limiting:
  Without it: credential stuffing, brute force, DDoS
  Limit: login attempts (5/min/IP), API calls, SMS sends

Security headers:
  Strict-Transport-Security: max-age=31536000  (HTTPS only)
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY  (prevent clickjacking)
  Content-Security-Policy: default-src 'self'
```

### Role-based access control (RBAC)

```ts
// Roles: admin, advocate, patient, physician
// Permissions: read:own, read:assigned, read:all, write:own, write:all

// Middleware pattern
function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}

fastify.get('/patients', { preHandler: requireRole('advocate', 'admin') }, handler);

// Row-level security in the query — never trust client-provided user IDs
const patients = await db
  .select()
  .from(patientsTable)
  .where(
    req.user.role === 'admin'
      ? undefined                                     // admin sees all
      : eq(patientsTable.advocateId, req.user.id)    // advocate sees only assigned
  );
```

---

## 11. Real-Time Systems

### WebSockets vs Server-Sent Events vs Long Polling

```text
Long Polling:
  Client makes HTTP request → server holds it open until data is ready → client re-requests
  ✓ Works everywhere (HTTP only)
  ✗ High latency, many connections, complex server logic
  Use for: legacy environments, simple notifications

Server-Sent Events (SSE):
  Server pushes events to client over a single persistent HTTP connection
  ✓ Simple (built into browser as EventSource API)
  ✓ Auto-reconnect built in
  ✓ Works through HTTP/2 multiplexing
  ✗ One direction only (server → client)
  ✗ Max 6 connections per domain on HTTP/1.1 (not an issue with HTTP/2)
  Use for: live feeds, notifications, dashboards

WebSockets:
  Full-duplex bidirectional persistent connection
  ✓ Both directions, low latency (~1ms)
  ✓ Good for chat, collaborative editing, games
  ✗ More complex (connection management, heartbeats, reconnection logic)
  ✗ Stateful — hard to scale horizontally without Redis pub/sub
  Use for: chat, live collaboration, multiplayer, real-time trading
```

### WebSocket scaling problem

```text
Problem: User A on Server 1 sends message to User B on Server 2.
         Server 1 has no connection to User B.

Solution: Redis Pub/Sub
  1. Server 1 receives message from User A
  2. Server 1 publishes to Redis channel "user:B:messages"
  3. Server 2 is subscribed to that channel
  4. Server 2 receives the published message
  5. Server 2 delivers to User B's WebSocket connection

All servers subscribe to all user channels they have connections for.
```

### Presence and online status

```text
Challenge: how do you know if a user is online?

Heartbeat approach:
  Client pings server every 30s (WebSocket or HTTP)
  Server stores: { userId: lastSeenAt } in Redis with 60s TTL
  If TTL expires → user is offline
  Read: check if key exists in Redis

Status transitions:
  Connected:     set key, TTL 60s
  Heartbeat:     refresh TTL
  Disconnected:  delete key (or let TTL expire)
  Grace period:  don't immediately show "offline" — wait 30s (network blip)
```

---

## 12. Storage & File Systems

### Object storage (S3 pattern)

```text
Use S3 (or compatible: Cloudflare R2, GCS, MinIO) for:
  - User uploads (photos, documents, videos)
  - Static assets (JS bundles, images)
  - Backups
  - Log archives

Never store files on your application server's disk:
  ✗ Files lost when server is replaced
  ✗ Files not accessible to other server instances
  ✗ Disk fills up

Upload flow (server-side):
  Client → Your API → S3
  ✗ API becomes a proxy — bandwidth cost, slow

Upload flow (presigned URLs — preferred):
  1. Client asks your API for a presigned upload URL
  2. API generates URL with temporary credentials (valid 5 min)
  3. Client uploads directly to S3 using presigned URL (bypasses your server)
  4. S3 notifies your backend on upload complete (S3 event → SQS → Lambda)
```

```ts
// Generate a presigned upload URL (AWS SDK v3)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({ region: 'us-east-1' });

async function getUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 300 }); // 5 min
}
```

### CDN (Content Delivery Network)

```text
Network of edge servers globally. Caches content close to users.

How it works:
  1. User in Tokyo requests /static/app.js
  2. DNS routes them to nearest Cloudflare PoP (Tokyo edge)
  3. Edge has it cached → serves immediately (< 10ms)
  4. If not cached → fetches from origin, caches, serves
  5. Next user in Tokyo gets it from edge cache

Cache-Control headers control CDN behavior:
  Cache-Control: public, max-age=31536000, immutable
  → Cache for 1 year, never revalidate (use for hashed file names: app.abc123.js)

  Cache-Control: no-cache
  → Always revalidate with origin before serving (for index.html)

Purging:
  When you deploy → purge old files from CDN cache
  Or: use content-hashed filenames → old URL simply becomes unused
```

---

## 13. Search

### Full-text search in Postgres

```sql
-- Built-in full-text search — good for simple cases

-- GIN index on tsvector for fast search
CREATE INDEX idx_tasks_fts ON tasks
  USING GIN(to_tsvector('english', title || ' ' || coalesce(description, '')));

-- Query
SELECT *, ts_rank(to_tsvector('english', title), query) AS rank
FROM tasks, to_tsquery('english', 'patient & care') query
WHERE to_tsvector('english', title) @@ query
ORDER BY rank DESC;

-- Pros: no extra infrastructure, ACID consistent with your data
-- Cons: limited relevance ranking, no typo tolerance, no synonyms
```

### Elasticsearch / OpenSearch

```text
Use when you need:
  - Fuzzy/typo-tolerant search ("pateint" → "patient")
  - Relevance ranking with many signals (BM25 algorithm)
  - Faceted search (filter by category + price range simultaneously)
  - Autocomplete / typeahead
  - Log analysis (ELK stack)

Architecture:
  Your DB is the source of truth.
  ES is a search index — a derived view of your data.
  Sync pattern: DB write → publish event → consumer indexes to ES

Eventual consistency:
  ES index may be seconds behind your DB — acceptable for search.
  Never use ES as your primary DB.
```

---

## 14. Microservices & Service Architecture

### When to split a monolith

```text
Signs you need to split:
  - Different services have very different scaling needs
    (matching engine needs 100x more CPU than billing)
  - Teams are constantly stepping on each other's code
  - Deploy of service A requires testing all of B and C
  - One part of the system must be HIPAA-isolated from another

Signs you should stay monolith:
  - Small team (< 10 engineers)
  - Still finding product-market fit (requirements change daily)
  - Premature optimization — distributed systems are hard

Strangler Fig pattern:
  Migrate monolith to services incrementally.
  1. Put a proxy in front of the monolith
  2. Extract one service, route its traffic through proxy
  3. Repeat — monolith "dies" gradually as features are extracted
  Never do a big-bang rewrite.
```

### Service mesh

```text
At large scale, service-to-service communication gets complex:
  - How does Service A find Service B? (service discovery)
  - How do you encrypt traffic between services? (mTLS)
  - How do you observe latency between services? (distributed tracing)
  - Where do circuit breakers, retries, rate limits live?

Service mesh (Istio, Linkerd):
  Sidecar proxy (Envoy) injected alongside every service pod.
  All traffic flows through proxies — they handle mTLS, retries, tracing.
  Application code has zero awareness — purely infrastructure concern.

Simpler alternative: API Gateway + direct service calls
  Right for most teams until they have 10+ services.
```

### Service discovery

```text
Problem: Service A needs to call Service B. B's IP changes when pods restart.

Solutions:
  DNS-based: Service B registers as "service-b.internal". A calls that hostname.
             Kubernetes handles this automatically (CoreDNS).

  Registry-based: Services register with Consul/Eureka on startup.
                  A queries registry to get B's current IP.

In Kubernetes:
  Every Service gets a stable DNS name.
  service-b.namespace.svc.cluster.local → resolves to Service B's ClusterIP.
  Developer just calls http://service-b/api — no IP management.
```

---

## 15. Observability

### The three pillars

```text
Logs:    "What happened?" — events with context
Metrics: "How is the system performing?" — numbers over time
Traces:  "How did this request flow through the system?" — distributed spans
```

### Structured logging

```ts
// ✗ Unstructured — hard to query
console.log(`User ${userId} created task ${taskId}`);

// ✓ Structured — queryable in Datadog, Splunk, CloudWatch
logger.info({
  event: 'task.created',
  userId,
  taskId,
  durationMs: Date.now() - start,
  // NEVER log PHI here: no patient names, diagnoses, SSNs
});

// Correlation ID — trace a request across services
// Generate on entry, pass through all downstream calls
fastify.addHook('onRequest', async (req) => {
  req.correlationId = req.headers['x-correlation-id'] ?? crypto.randomUUID();
});
// Every log line includes correlationId — you can filter one request's full journey
```

### Key metrics

```text
Golden signals (Google SRE book):
  Latency:     how long requests take (p50, p95, p99)
  Traffic:     requests per second
  Errors:      error rate (% of 5xx)
  Saturation:  how "full" the system is (CPU %, queue depth, DB connections)

p99 latency: 99th percentile — the slowest 1% of requests
  p50 = 50ms but p99 = 2000ms → most users fine but 1% have terrible experience
  Always optimize p99 for user-facing services, not just average

SLI / SLO / SLA:
  SLI (indicator): the metric — "p99 latency"
  SLO (objective): the target — "p99 < 200ms, 99.9% of the time"
  SLA (agreement): the contract — "if we miss SLO, you get a credit"
  Error budget: if SLO is 99.9% → 0.1% error budget → 8.7h/year to spend
```

### Distributed tracing

```text
A trace = one request's journey across services.
A span = one operation within a trace (DB query, HTTP call, function).
Spans are linked by a trace ID propagated in HTTP headers.

Example trace:
  [POST /tasks] 120ms
    [JWT verify] 2ms
    [DB INSERT] 15ms
    [Redis cache invalidate] 3ms
    [Notification queue publish] 5ms

Without tracing: you see 120ms API call but don't know where time went.
With tracing: you see DB was 15ms — acceptable. If it was 100ms — optimize there.

Tools: OpenTelemetry (vendor-neutral SDK), Datadog, Jaeger, Honeycomb
```

---

## 16. Infrastructure & Deployment

### Containers & Kubernetes

```text
Docker:
  Packages your app + all dependencies into an image.
  Runs identically in dev, staging, production.
  Image → Container (running instance)

Dockerfile basics:
  FROM node:20-alpine          # base image
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production # install deps (cached layer if package.json unchanged)
  COPY . .
  RUN npm run build
  EXPOSE 3000
  CMD ["node", "dist/index.js"]

Kubernetes (K8s):
  Orchestrates containers across a cluster of machines.
  Core objects:
    Pod:         one or more containers, scheduled together on a node
    Deployment:  manages a set of identical pods, handles rolling updates
    Service:     stable DNS name + load balancing in front of pods
    ConfigMap:   non-secret config injected as env vars
    Secret:      sensitive config (passwords, API keys) — base64 encoded
    Ingress:     external HTTP routing → services (like a smart load balancer)
    HPA:         Horizontal Pod Autoscaler — scale pods based on CPU/memory
```

### CI/CD pipeline

```text
CI (Continuous Integration):
  Every push → automated tests run → merge only if green
  Fast feedback loop — catch bugs before they reach main

CD (Continuous Delivery/Deployment):
  Delivery: every merge to main produces a deployable artifact (manual deploy trigger)
  Deployment: every merge auto-deploys to production (requires high test confidence)

Typical pipeline:
  Push → Lint → Type check → Unit tests → Integration tests →
  Build Docker image → Push to registry → Deploy to staging →
  Smoke tests → Deploy to production

Tools: GitHub Actions, GitLab CI, CircleCI, Jenkins

Zero-downtime deployment strategies:
  Rolling: replace instances one at a time (always have N-1 running)
  Blue/Green: spin up entirely new environment, switch traffic instantly
              → easy rollback (switch back), but double infrastructure cost
  Canary: route 5% of traffic to new version, watch metrics, expand if healthy
          → catch issues with minimal blast radius
```

### Feature flags

```text
Deploy code without activating it. Activate without deploying.

Benefits:
  - Separate deploy from release
  - Gradual rollout (1% → 10% → 100%)
  - Instant kill switch if something goes wrong
  - A/B testing

Simple implementation:
  const flags = await featureFlagService.getFlags(userId);
  if (flags.newMatchingAlgorithm) {
    return newMatcher.match(patient);
  }
  return oldMatcher.match(patient);

Tools: LaunchDarkly, Flagsmith, Unleash, or a simple DB table
```

### Database migrations in production

```text
Safe migration checklist:
  1. Make migrations backward-compatible (old code must still work)
  2. Add new column as nullable first (not NOT NULL — breaks running instances)
  3. Deploy new code that writes to both old and new column
  4. Backfill existing rows
  5. Add NOT NULL constraint
  6. Deploy code that only reads new column
  7. Remove old column

Never:
  ✗ Rename a column directly (add new, migrate, drop old over multiple deploys)
  ✗ Add NOT NULL column without a default to a large table (locks table)
  ✗ Drop a column the running code still reads

Lock-safe pattern for large tables (Postgres):
  Use CREATE INDEX CONCURRENTLY (non-blocking, takes longer)
  Regular CREATE INDEX locks the table for reads+writes (dangerous in prod)
```

---

## 17. Common System Design Problems

### Design a URL shortener (bit.ly)

```text
Requirements:
  - Given a long URL, return a short URL (e.g. short.ly/abc123)
  - Redirect short URL to long URL
  - Analytics: click count

Key decisions:
  Short code generation:
    Random 6-char base62 string (62^6 = 56 billion possibilities)
    Or: auto-increment ID → base62 encode (no collision, sequential)

  Storage:
    { short_code, long_url, user_id, created_at, clicks }
    Index on short_code (primary key)

  Redirect:
    GET /abc123 → DB lookup → 301 (permanent, cached by browser) or 302 (temporary, trackable)
    Use 302 for analytics (browser won't bypass your server next time)

  Cache: most reads are for popular links
    Redis: short_code → long_url, TTL 24h
    Cache hit ratio likely > 90%

  Scale: 100:1 read:write ratio → cache aggressively, read replicas
```

### Design a notification system

```text
Requirements:
  - Send email, SMS, push notifications
  - Multiple channels (email, SMS, push)
  - Millions of users

Architecture:
  API → publish to queue ("notification.requested")
  Notification service consumes queue:
    → Fan out to channel workers (EmailWorker, SMSWorker, PushWorker)
  Channel workers call providers (SendGrid, Twilio, FCM)

Reliability:
  Retry with backoff (providers can be temporarily down)
  Dead letter queue for failed notifications
  Idempotency: don't send same notification twice (store notification ID)

User preferences:
  Table: { userId, channel, type, enabled }
  Check preferences before sending — respect unsubscribes

Rate limiting per user:
  Don't send more than N emails/day per user (Redis counter)

Prioritization:
  Critical (password reset): high-priority queue, processed first
  Marketing: low-priority queue, can be delayed
```

### Design a chat system (Slack-like)

```text
Requirements:
  - 1:1 and group messages
  - Message history
  - Online presence
  - Real-time delivery

Core data model:
  Channels: { id, name, type (dm/group) }
  Members:  { channelId, userId, joinedAt }
  Messages: { id, channelId, senderId, content, createdAt }

Real-time:
  WebSocket connection per client
  On send: store in DB, publish to Redis channel "channel:{channelId}"
  All servers subscribed to channels of their connected users
  Server receives published message → push to WebSocket

Message history:
  Paginate with cursor (createdAt + messageId) — no offset
  Load last 50 messages on open, infinite scroll up

Presence:
  Redis key "online:{userId}" with 60s TTL
  Heartbeat every 30s refreshes TTL
  Subscribe to Redis keyspace notifications for expiry events → "user went offline"

Fan-out (group with 10,000 members):
  Don't publish 10,000 WebSocket messages synchronously
  Publish once to Redis → each server handles its own connected members
```

### Design a ride-sharing system (Uber)

```text
Requirements:
  - Match rider to nearby driver
  - Real-time driver location tracking
  - Price estimation
  - Trip state machine

Location tracking:
  Driver app sends location every 4 seconds via WebSocket
  Store in Redis (fast, ephemeral): "driver:{id}:location" = { lat, lng, updatedAt }
  Geospatial index: Redis GEOADD command

Matching:
  Rider requests ride → find available drivers within 2km
  Redis GEORADIUS: get all drivers within radius
  Filter: available, correct vehicle type, acceptable rating
  Pick closest, send offer → driver accepts → match made

Trip state machine:
  REQUESTED → ACCEPTED → DRIVER_ARRIVING → IN_PROGRESS → COMPLETED
  Each state stored in DB, state transitions validated server-side
  Client polls for state changes OR receives WebSocket push

Surge pricing:
  Supply/demand ratio per geohash cell
  Calculate ratio every 30s, cache in Redis
  Dynamic multiplier: demand > supply → price increases
```

---

## 18. Trade-off Cheat Sheet

### The most common interview trade-offs

| Decision | Option A | Option B | Choose A when... |
| --- | --- | --- | --- |
| Consistency vs Availability | Strong consistency (Postgres) | Eventual consistency (Cassandra) | Data correctness is critical (medical, financial) |
| Monolith vs Microservices | Monolith | Microservices | Team < 10 engineers, early product |
| REST vs GraphQL | REST | GraphQL | Simple CRUD, or multiple client shapes needed |
| SQL vs NoSQL | SQL (Postgres) | NoSQL (Mongo) | Almost always SQL unless specific reason |
| Normalization vs Denormalization | Normalized | Denormalized | Read performance is bottleneck |
| Sync vs Async | HTTP/REST | Queue/Event | Caller doesn't need result immediately |
| JWT vs Sessions | JWT | Sessions | Stateless scaling needed, or instant revocation needed |
| Cache TTL: short vs long | Short (60s) | Long (1h) | Data changes frequently |
| WebSocket vs SSE | WebSocket | SSE | Bidirectional needed, or server-push only |
| Cursor vs Offset | Cursor | Offset | Large datasets, infinite scroll |

### CAP theorem quick reference

| System | Type | Trade-off |
| --- | --- | --- |
| Postgres | CP | Rejects during partition |
| DynamoDB | AP | Returns stale during partition |
| Cassandra | AP | Tunable per operation |
| Redis (single) | CP | Blocks during partition |
| Zookeeper | CP | Rejects during partition |

### Common bottlenecks and fixes

| Bottleneck | Symptom | Fix |
| --- | --- | --- |
| DB reads | High read latency, DB CPU high | Add index, read replica, cache |
| DB writes | Write queue growing, p99 spikes | Write batching, async writes, sharding |
| N+1 queries | Many small fast queries, slow overall | JOIN, DataLoader, eager loading |
| Single server | CPU/memory maxed | Horizontal scale, load balancer |
| Network latency | High p99, especially cross-region | CDN, edge caching, co-locate services |
| Cold cache | Slow after deploy or restart | Cache warming, background refresh |
| Queue backlog | Jobs processing slower than arriving | Scale consumers, optimize job logic |
| WebSocket scale | Can't share connections across servers | Redis pub/sub fanout |

---

*Built for: senior full stack interviews and daily engineering decisions.*
*Stack focus: TypeScript · Node.js · React · Postgres · Redis · AWS*
