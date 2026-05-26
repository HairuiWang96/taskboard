# System Design — Senior Deep Reference

## The Framework (use this structure every time)

```
1. Clarify requirements (3–5 min)
   - Functional: what does it do? List the core features.
   - Non-functional: scale, latency, availability, consistency?
   - Out of scope: what are we NOT building?
   - Ask: "Who are the users? How many? What's the read/write ratio?"

   Example for a URL shortener:
     Functional: shorten URL, redirect, analytics
     Non-functional: <100ms redirect, 99.99% availability, 5-year retention
     Out of scope: custom domains, user accounts (unless asked)

2. Capacity estimation (2–3 min)
   - DAU, read/write ratio, storage, bandwidth
   - Show your math — interviewers want to see you reason, not just memorise

3. High-level design (10 min)
   - Draw the boxes: client, LB, API servers, DB, cache, queue, CDN
   - Explain the data flow: "user clicks → request hits LB → API server → cache
     check → DB read → response"
   - This is your chance to show you understand the full picture

4. Deep dive (15–20 min)
   - Pick 2–3 critical components and go deep
   - DB schema, API design, caching strategy, consistency model
   - The interviewer will often steer you: "let's talk about the database"
   - This is where you differentiate yourself — go beyond the obvious

5. Bottlenecks & trade-offs (5 min)
   - Single points of failure, hot spots, scaling limits
   - "If we 10x the traffic, what breaks first?"
   - Propose solutions for each bottleneck
```

---

## Capacity Estimation Numbers to Memorise

```
Traffic:
  1M DAU, 10 req/day → 100M req/day → ~1,200 req/sec
  Rule: DAU × req/day / 86,400 = req/sec
  Peak traffic is typically 2-3x the average

  Real-world examples:
    Twitter:  300M DAU × 20 reads/day = 6B reads/day = ~70K reads/sec
    Instagram: 500M DAU × 10 feed loads/day = 5B/day = ~58K/sec
    Google:   8.5B searches/day = ~100K searches/sec

Storage:
  1 byte  = 1 char (ASCII), 2-4 bytes for Unicode
  1 tweet = ~300 bytes (280 chars + metadata)
  1 photo = ~200KB compressed (JPEG), 2-5MB raw
  1 video = ~10MB/min at 720p, ~25MB/min at 1080p
  1 user profile = ~1KB (name, email, bio, settings)
  1 database row = ~100 bytes to 1KB depending on schema
  1TB = 1,000 GB = 1,000,000 MB = 1,000,000,000 KB

  Quick estimates:
    10M photos/day × 200KB = 2TB/day = 730TB/year
    100M messages/day × 200 bytes = 20GB/day = 7.3TB/year
    1M users × 1KB profile = 1GB total (tiny)

Bandwidth:‼️
  read QPS × response size = bandwidth  (QPS: Queries Per Second)

  Example: 10K reads/sec × 500 bytes = 5MB/sec = 40Mbps
  Example: 1K image reads/sec × 200KB = 200MB/sec = 1.6Gbps
  Modern servers handle 10Gbps+, so bandwidth is rarely the first bottleneck

Latency targets:
  L1 cache: 1ns    L2: 4ns     L3: 40ns
  RAM: 100ns       SSD: 100µs  HDD: 10ms
  Network (same DC): 500µs     Cross-region: 150ms
  Redis read: ~1ms  PostgreSQL indexed read: ~5ms  Full table scan: 100ms-10s

  Rule of thumb: cache = fast, DB = slow, network = variable‼️
  Jeff Dean's numbers: https://gist.github.com/jboner/2841832

Availability targets:
  99% = 3.65 days downtime/year (unacceptable for most)
  99.9% = 8.77 hours/year ("three nines")
  99.99% = 52.6 minutes/year ("four nines" — most production systems target this)
  99.999% = 5.26 minutes/year ("five nines" — only critical infrastructure)

  If two services are in series (both must work):
    99.9% × 99.9% = 99.8% — availability decreases with more dependencies
  If two services are in parallel (either can serve):
    1 - (0.001 × 0.001) = 99.9999% — redundancy dramatically improves availability
```

---

## Core Building Blocks

### Load Balancer

```
What it does: distributes incoming traffic across multiple servers.
Without it, one server handles everything → single point of failure.

Layer 4 (Transport): routes by IP/TCP — faster, no content inspection
  - Doesn't look at the HTTP request, just the TCP connection
  - Use case: raw speed, TCP/UDP pass-through, non-HTTP protocols
  - Example: AWS NLB (Network Load Balancer)

Layer 7 (Application): routes by URL/header/cookie — smarter, SSL termination
  - Can inspect the HTTP request and make routing decisions
  - Route /api/* to API servers, /static/* to CDN, /ws/* to WebSocket servers
  - Can modify headers, rewrite URLs, inject headers
  - Example: AWS ALB, Nginx, HAProxy, Envoy

Algorithms:
  Round-robin       — equal distribution (simplest, most common)
  Least connections — send to least busy server (good when requests vary in cost)
  IP hash           — same client → same server (sticky sessions)‼️
                      used when you need session affinity (in-memory session state)
                      problem: if server dies, all its sessions are lost
  Weighted          — proportional to server capacity (mix of big and small servers)
  Random            — surprisingly effective at scale (avoids hot spots)
  Consistent hash   — used in distributed caches (see Consistent Hashing section)

Health checks: heartbeat every N seconds; remove unhealthy servers from pool
  - Active: LB sends a request to /health every 10s
  - Passive: LB monitors real traffic — if 5 consecutive 5xx, mark unhealthy
  - Combine both: active for detection, passive for fast response

Active-active: multiple LBs in parallel (avoid SPOF)
  - DNS returns multiple LB IPs
  - If one LB fails, DNS removes it (but DNS TTL creates a delay)
  - Better: BGP anycast — same IP advertised from multiple locations

SSL/TLS termination:
  - LB handles the encryption/decryption (CPU-intensive)
  - Traffic between LB and backend servers can be plain HTTP (inside VPC)
  - Offloads TLS work from application servers
  - Centralises certificate management

Real-world example:
  Nginx config for a simple round-robin:
    upstream backend {
      server 10.0.0.1:8080;
      server 10.0.0.2:8080;
      server 10.0.0.3:8080;
    }
    server {
      listen 80;
      location / {
        proxy_pass http://backend;
      }
    }
```

---

### API Gateway

```
What it does: single entry point for all client requests to backend services.
Think of it as a "smart load balancer" for microservices.

Responsibilities:
  - Routing: route /users/* to User Service, /orders/* to Order Service
  - Authentication: validate JWT/API key before forwarding to backend
  - Rate limiting: enforce per-user or per-API-key limits
  - Request/response transformation: rename fields, convert XML to JSON
  - Aggregation: combine responses from multiple services into one
  - Circuit breaking: stop forwarding to a failing service
  - Caching: cache responses for GET requests
  - Logging & monitoring: centralised request logging and metrics

Why not just use a load balancer?
  - LB distributes traffic. API gateway understands your API.
  - LB routes by URL pattern. API gateway can route by header, body, auth token.
  - API gateway can aggregate multiple backend calls into one response.

Popular implementations:
  - Kong (open-source, plugin-based, runs on Nginx)
  - AWS API Gateway (managed, serverless-friendly, pay-per-request)
  - Envoy (proxy used as gateway, popular in service mesh)
  - Nginx (can be configured as API gateway with Lua/modules)

Backend for Frontend (BFF) pattern:‼️
  - Different clients need different data (mobile vs web vs third-party)
  - Instead of one generic API, create a BFF per client type
  - Mobile BFF: returns less data, optimised for bandwidth
  - Web BFF: returns richer data, supports real-time features
  - This avoids over-fetching and under-fetching

Example: e-commerce product page
  Without gateway: mobile app makes 5 API calls (product, reviews, inventory,
                   recommendations, pricing)
  With BFF gateway: mobile app makes 1 call to /mobile/product/:id
                    gateway aggregates all 5 calls internally
```

---

### Database Scaling

```
Vertical scaling: bigger machine (limited, expensive)
  - More CPU cores, more RAM, faster SSD
  - Simple: no code changes, no architecture changes
  - Limit: largest AWS RDS instance is ~128 vCPUs, 1TB RAM
  - Cost: price increases exponentially with size
  - When to use: if your data fits on one machine, start here

Read replicas: primary handles writes, replicas handle reads
  - Replication lag is a concern (read-your-writes problem)‼️
  - Example: user updates profile, immediately reads it → gets old data
    because the replica hasn't caught up yet
  - Fix: route reads to primary for N seconds after a write for that user
  - MySQL: binlog replication (async by default, can be semi-sync)
  - PostgreSQL: streaming replication (WAL shipping)
  - Typical lag: 10ms-1s (normal), seconds-minutes (under heavy load)

Sharding (horizontal): split data across multiple DBs by shard key‼️

  Choosing a shard key — the most important decision:
    Good shard key properties:
      - High cardinality (many unique values → even distribution)
      - Frequently used in queries (avoids cross-shard queries)
      - Doesn't change over time (re-sharding is expensive)
    Example: user_id is usually a great shard key
    Example: country_code is bad (skewed — US has way more traffic)
    Example: date is bad (all traffic goes to today's shard)

  Range sharding: shard by user ID range (0-1M, 1M-2M)
    Risk: hot shards if range is popular
    Good for: time-series data where you query by range
    Example: logs sharded by date range → each month on its own shard

  Hash sharding: shard by hash(user_id) % N
    Even distribution, but range queries across shards are hard‼️
    Re-sharding is painful: changing N requires redistributing all data
    Example: user_id 12345 → hash(12345) % 4 = shard 2

  Directory-based: lookup service maps key → shard‼️
    Flexible: can move data between shards without re-hashing
    But lookup service is a bottleneck/SPOF
    Good for: uneven data distribution where you need manual control

  Consistent hashing: nodes on a ring; data goes to nearest node clockwise
    Adding/removing nodes only remaps ~1/N of keys
    Used by: Cassandra, DynamoDB, load balancers
    (see deep section below)

Cross-shard problems:‼️
  - Joins: can't JOIN users on shard 1 with orders on shard 3
    Fix: denormalise (store user name in orders table)
  - Transactions: can't do atomic transactions across shards
    Fix: saga pattern (compensating transactions)
  - Aggregations: COUNT(*) across all users requires querying every shard
    Fix: maintain counters in a separate store (Redis)
  - Auto-increment IDs: each shard has its own sequence → ID collisions
    Fix: use UUID, Snowflake ID, or shard-prefixed IDs

When to shard:
  - Single DB can handle more than you think (PostgreSQL: millions of rows easily)
  - Shard when: single DB CPU > 70% sustained, or data > 1TB, or you need
    write scalability that replicas can't provide
  - Try everything else first: indexes, query optimisation, read replicas, caching
```

---

### Caching

```
Why cache: DB reads are slow (5-50ms), cache reads are fast (<1ms).
A well-designed cache can absorb 90-99% of read traffic.

Cache-aside (lazy loading):‼️
  1. App checks cache for key
  2. Cache hit → return data (fast path)
  3. Cache miss → read from DB → store in cache → return data
  - Most common pattern
  - Stale data possible: DB updated but cache still has old value
  - Good for: read-heavy workloads where staleness is acceptable

  Example (pseudocode):
    def get_user(user_id):
      cached = redis.get(f"user:{user_id}")
      if cached:
        return deserialise(cached)
      user = db.query("SELECT * FROM users WHERE id = ?", user_id)
      redis.set(f"user:{user_id}", serialise(user), ex=3600)  # TTL 1 hour
      return user

Write-through: write to cache and DB together (always consistent)
  - Every write updates both cache and DB
  - Cache is always fresh
  - Tradeoff: slower writes (two writes per operation)
  - Good for: data that's read frequently right after being written

Write-behind (write-back): write to cache, async flush to DB‼️
  - Extremely fast writes (only writes to cache)
  - Background job flushes dirty entries to DB periodically
  - Risk: if cache crashes before flushing, data is lost
  - Good for: high-write scenarios where some data loss is acceptable
  - Example: analytics counters, view counts, like counts

Read-through: cache sits in front, app talks only to cache
  - Cache handles the DB read on miss automatically
  - App never talks to DB directly
  - Similar to cache-aside but the cache manages the loading logic
  - Good for: simplifying application code

Eviction policies:
  LRU (Least Recently Used): evict the least recently accessed item‼️
    - Most common, works well for most workloads
    - Redis uses an approximated LRU (samples 5 keys, evicts the oldest)
  LFU (Least Frequently Used): evict the least accessed over time
    - Better for workloads with stable hot items
    - Redis 4.0+ supports LFU
  TTL-based: items expire after a set time regardless of access
    - Simple, prevents stale data
    - Set TTL based on how stale the data can be

Cache invalidation strategies:‼️
  TTL: simple, eventually consistent
    - Set TTL = max staleness you can tolerate
    - 5 min TTL → data is at most 5 min stale
  Event-driven: write to DB → publish event → invalidate cache
    - Near real-time consistency
    - Requires an event system (Kafka, Redis pub/sub)
  Versioned keys: cache_key_v2 — never invalidate, just rotate
    - No invalidation needed, but storage grows
  Delete on write: when you write to DB, delete the cache key
    - Next read will cache-miss and fetch fresh data
    - Better than updating cache (avoids race conditions)
    - Why delete, not update? Two concurrent writes:
      Write 1: update DB to A, update cache to A
      Write 2: update DB to B, update cache to B
      But if Write 2 hits DB first and Write 1 hits cache last:
      DB = B, cache = A → inconsistent!
      Delete avoids this: DB = B, cache deleted → next read gets B from DB

Cache stampede (thundering herd):‼️
  Many requests hit empty cache simultaneously → all hit DB
  Scenarios:
    - Popular cache key expires (e.g., a viral product page)
    - Cache server restarts (all keys lost)
    - New feature launch (cache is cold)
  Fix:
    - Lock: one request acquires a lock, populates cache, others wait
    - Probabilistic early expiry: randomly refresh before TTL expires
      each request has a small chance of refreshing the cache early
      spreads the refresh over time instead of all at once
    - Stale-while-revalidate: serve expired data while refreshing in background
    - Pre-warming: populate cache before it expires (scheduled job)

Cache sizing:
  - Estimate: number of hot items × item size
  - Rule: 80/20 — 20% of items get 80% of traffic, cache the top 20%
  - Example: 10M products, top 20% = 2M, each ~1KB = 2GB → easily fits in Redis
  - Redis can handle ~25GB-100GB per instance (limited by RAM)
  - Need more? Redis Cluster (shard across multiple instances)

Multi-layer caching:
  L1: in-process cache (HashMap/Guava/Caffeine) — sub-microsecond, limited size
  L2: Redis/Memcached — sub-millisecond, shared across instances
  L3: CDN — serves static content from edge, ~10ms from user

  Example: product page
    1. Check in-process cache (L1) — 100ns
    2. Check Redis (L2) — 1ms
    3. Check CDN (L3) — 10ms (only for static resources)
    4. Read from DB — 5-50ms (last resort)
```

---

### Message Queues

```
What they do: decouple producers from consumers. Producer puts a message
on the queue and moves on. Consumer processes it later.

Why use them:
  - Async processing: don't make the user wait for slow work
  - Decoupling: producer doesn't need to know who consumes
  - Buffering: absorb traffic spikes (queue grows, consumers catch up)
  - Reliability: if consumer is down, messages wait in queue
  - Fan-out: one message → multiple consumers independently

Key concepts:

  Point-to-point: one message → one consumer
    - Work queue pattern: distribute tasks across workers
    - Example: 100 image resize tasks → 10 workers process them
    - Each task processed exactly once (with acknowledgement)

  Pub/Sub: one message → all subscribers
    - Broadcasting pattern: every subscriber gets every message
    - Example: "user signed up" → email service + analytics + CRM all receive it
    - If a subscriber is down, it misses the message (unless durable)

  Fan-out pattern:
    Producer → Exchange/Topic → multiple queues → multiple consumers
    Example: order placed →
      Queue 1: payment service (charge the card)
      Queue 2: inventory service (reserve the item)
      Queue 3: notification service (send confirmation email)
      Queue 4: analytics service (track the conversion)

Message delivery guarantees:‼️
  At-most-once: message may be lost, never duplicated
    - Send and forget, no acknowledgement
    - Use when: logging, metrics (losing one data point is OK)
  At-least-once: message will be delivered, may be duplicated‼️
    - Consumer must acknowledge processing; if no ACK, message re-delivered
    - Duplicates possible: consumer processes message, crashes before ACK
    - This is the most common guarantee — requires idempotent consumers
  Exactly-once: message delivered exactly once (theoretically impossible)
    - Achieved in practice: at-least-once + idempotent consumer
    - Kafka "exactly-once" = idempotent producer + transactional consumer

Backpressure: queue fills if consumers are slow
  - Options: add more consumers, slow down producers, or drop messages
  - Monitor queue depth: if it's growing, you have a problem
  - Alert when queue depth > threshold (e.g., >10K messages for >5 minutes)

Dead-letter queue (DLQ):‼️
  - Messages that fail processing after N retries → moved to DLQ
  - Prevents poison messages from blocking the queue forever
  - Must be monitored: DLQ growing = silent data loss
  - Review DLQ regularly: fix the bug, replay messages

Ordering guarantees:
  - Global ordering: messages consumed in exact order they were produced
    Very expensive: limits parallelism to one consumer
  - Partition ordering: ordering within a partition key (e.g., per user_id)
    Kafka: messages with same key go to same partition → ordered within partition
    Good enough for most use cases

Message queue comparison:
  RabbitMQ:
    - Traditional broker with acknowledgements
    - Flexible routing (exchanges: direct, topic, fanout, headers)
    - Message-level acknowledgement
    - Messages deleted after consumption
    - Best for: task queues, RPC-style messaging

  Kafka:
    - Distributed log, not a traditional queue
    - Messages retained for a configurable period (even after consumption)
    - Replay capability: consumers can re-read old messages
    - Consumer groups: multiple consumers share partitions
    - Very high throughput (millions of events/sec)
    - Best for: event streaming, event sourcing, data pipelines

  SQS (AWS):
    - Fully managed, zero operations
    - Standard queue: at-least-once, best-effort ordering
    - FIFO queue: exactly-once, strict ordering (lower throughput)
    - Auto-scales to any traffic level
    - Best for: serverless architectures, simple async processing

  Redis Streams:
    - Lightweight, built into Redis
    - Consumer groups (like Kafka)
    - Good for: simple pub/sub within a service, when you already have Redis
    - Not for: durability-critical workloads (Redis is primarily in-memory)
```

---

### CDN (Content Delivery Network)

```
What it does: caches content on edge servers worldwide, close to users.
User in Tokyo gets content from a Tokyo server, not from your US origin.

Origin: your servers (where the content lives)
Edge: CDN servers globally (where the content is cached)‼️

How it works:
  1. User in Australia requests example.com/image.jpg
  2. DNS resolves to the nearest CDN edge (e.g., Sydney)
  3. Edge checks: do I have this file?
  4. Cache hit → serve immediately (~10ms)
  5. Cache miss → fetch from origin, cache it, serve to user (~200ms first time)
  6. Next Australian user gets it from Sydney edge (~10ms)

Push CDN:‼️
  - You upload files to CDN proactively
  - Good for: small, infrequently changing assets (logo, JS/CSS bundles)
  - You control exactly what's cached
  - Requires manual or CI/CD-triggered upload

Pull CDN:‼️
  - CDN fetches from origin on first request, caches automatically
  - Good for: large sites with many assets, user-generated content
  - No manual management — CDN handles it
  - First request is slower (cache miss), subsequent requests are fast

Cache-Control headers:‼️
  Cache-Control: max-age=31536000 → cache for 1 year (static assets with hash in filename)
  Cache-Control: s-maxage=3600 → CDN caches for 1 hour (overrides max-age for CDN)
  Cache-Control: no-cache → always revalidate with origin (still cacheable)
  Cache-Control: no-store → never cache (sensitive data, user-specific responses)
  Cache-Control: private → only browser cache, not CDN (user-specific data)
  Cache-Control: public → CDN can cache (shareable across users)

  Common patterns:
    Static assets (JS, CSS, images with content hash):
      Cache-Control: public, max-age=31536000, immutable
      Filename includes hash: app.a3f2b1.js → new hash on every build

    API responses:
      Cache-Control: no-store (user-specific data)
      OR: Cache-Control: public, s-maxage=60 (shared data, stale within 1 min)

    HTML pages:
      Cache-Control: no-cache (always check with origin, but serve cached if fresh)

CDN purge/invalidation:‼️
  - When you deploy new code, old cached assets must be invalidated
  - By URL: purge specific files (/js/app.js)
  - By tag/surrogate key: purge all assets tagged "product-page"
  - Best practice: use content-hashed filenames (app.a3f2b1.js) → never need to purge
    New deploy → new filename → CDN fetches new file, old one expires naturally

Dynamic content:‼️
  - CDN can cache dynamic responses too (with vary headers)
  - Vary: Accept-Language → cache separate versions for each language
  - Vary: Accept-Encoding → cache gzip and brotli versions separately
  - Edge computing: run custom logic at the edge (Cloudflare Workers, Lambda@Edge)
    - A/B testing at the edge
    - Authentication at the edge
    - Personalisation at the edge

CDN providers and what they're known for:
  CloudFront (AWS): tight AWS integration, Lambda@Edge
  Cloudflare: DDoS protection, Workers (edge compute), fast DNS
  Akamai: largest network, enterprise-focused
  Fastly: real-time purging, Varnish-based, VCL configuration
```

---

### Blob / Object Storage

```
What it does: stores unstructured data — images, videos, documents, backups.
Not a filesystem, not a database. Key-value store for large binary objects.

Why not use a regular database for files?
  - Databases are optimised for structured, small records
  - A 10MB image in PostgreSQL = slow queries, huge WAL, expensive replication
  - Object storage is 10-100x cheaper than database storage

AWS S3 (the standard):
  - Objects up to 5TB
  - 99.999999999% durability (11 nines — data won't be lost)
  - 99.99% availability
  - Virtually unlimited storage
  - Cost: ~$0.023/GB/month (standard), ~$0.004/GB (Glacier archive)

Storage tiers:
  Standard: frequent access, low latency
  Infrequent Access (IA): cheaper storage, $0.01/GB retrieval fee
  Glacier: archive storage, retrieval takes minutes to hours
  Glacier Deep Archive: cheapest, retrieval takes 12-48 hours

  Lifecycle policies: automatically move objects between tiers‼️
    - After 30 days → move to IA
    - After 90 days → move to Glacier
    - After 365 days → delete or move to Deep Archive

Access patterns:
  Pre-signed URLs: generate a temporary URL that grants access for N minutes‼️
    - User uploads directly to S3 (bypass your server)
    - User downloads from S3 with time-limited access
    - Reduces load on your servers for large file transfers

  CDN in front of S3:
    - S3 is the origin, CDN serves cached copies
    - CloudFront + S3 is the standard combo
    - Reduces S3 bandwidth costs (CDN bandwidth is cheaper)

Example: image upload flow
  1. Client requests pre-signed upload URL from your API
  2. Your API generates S3 pre-signed URL (valid for 15 min)
  3. Client uploads directly to S3 using the pre-signed URL
  4. S3 triggers a Lambda function (or sends event to SQS)
  5. Lambda creates thumbnails (different sizes), stores back in S3
  6. Lambda updates the database with the image URL
  7. CDN serves the image to users
```

---

### Proxies

```
Forward proxy (client-side proxy):
  Client → Forward Proxy → Internet → Server
  - Client knows it's using a proxy
  - Use cases: corporate firewalls, VPNs, caching, privacy
  - Example: user's browser → corporate proxy → blocked/allowed website

Reverse proxy (server-side proxy):‼️
  Client → Internet → Reverse Proxy → Backend Servers
  - Client doesn't know there's a proxy (thinks it's talking to the server)
  - Use cases: load balancing, SSL termination, caching, security
  - Example: user → Nginx (reverse proxy) → one of 10 backend servers
  - Almost every production system uses a reverse proxy

  Nginx, HAProxy, Envoy, Caddy are all reverse proxies

Service mesh (sidecar proxy):
  Every service gets its own proxy (sidecar) that handles networking
  - mTLS between services (encrypted internal traffic)
  - Automatic retries, circuit breaking, load balancing
  - Observability: metrics, tracing, logging without app changes
  - Example: Istio (uses Envoy sidecars), Linkerd
  - When to use: large microservice deployments (50+ services)
  - When NOT to use: small teams, few services (overhead not worth it)
```

---

## Consistency Models

```
Strong consistency: every read sees the latest write‼️
  - After a write completes, all subsequent reads (from any node) see the new value
  - Implementation: all writes go through a single leader, reads wait for replication
  - Cost: higher latency, reduced availability during partitions
  - Use when: financial transactions, inventory counts, user authentication
  - Example: your bank balance must always be correct. If you deposit $100, the
    ATM across the street must see $100 more, not the old balance.

Eventual consistency: reads may be stale, will converge (fast, available)‼️
  - After a write, there's a window where reads may return old data
  - Eventually (milliseconds to seconds), all reads return the new value
  - Implementation: async replication, conflict resolution
  - Use when: social media feeds, product reviews, analytics, DNS
  - Example: you post on Instagram. Your friend 1000km away might not see it
    for 2-3 seconds. That's fine.

Read-your-writes: user always sees their own writes
  - I update my profile, I should immediately see the update
  - Other users can see the old version temporarily (eventual consistency for them)
  - Implementation: route reads to the primary for recently-written data
    OR track write timestamp, only read from replica if replica is caught up
  - This is a very common requirement that many apps need

Monotonic reads: user never sees data going backwards in time
  - If I read version 5, the next read must return version 5 or later, never version 4
  - Can happen with multiple read replicas: read from replica A (version 5),
    next read hits replica B (only at version 3) → user sees "data going backwards"
  - Fix: sticky sessions (always read from the same replica) or read from primary

Causal consistency: causally related ops seen in order
  - If A causes B, everyone sees A before B
  - But unrelated operations can be seen in any order
  - Example: I post "I got the job!" then my friend replies "Congrats!"
    Everyone must see my post before the reply (causal relationship)
    But an unrelated post from someone else can appear in any order

CAP theorem:‼️
  Distributed system can guarantee 2 of 3:
    Consistency: all nodes see same data at the same time
    Availability: every request gets a response (not an error)
    Partition tolerance: system works despite network splits between nodes

  In practice, network partitions WILL happen (P is mandatory), so you choose:
    CP: when partition happens, sacrifice availability for consistency
      - Refuse writes/reads until partition heals
      - Examples: ZooKeeper, HBase, MongoDB (with majority write concern)
      - Use for: coordination services, locks, leader election

    AP: when partition happens, sacrifice consistency for availability
      - Keep serving requests, but data may diverge between nodes
      - Examples: Cassandra, DynamoDB, CouchDB
      - Use for: user-facing services where uptime matters more than perfect accuracy

  Important nuance: CAP only applies DURING a partition. When the network is healthy,
  you can have all three. The question is: what do you sacrifice WHEN things go wrong?

PACELC extension:‼️
  Even without partition, there's a latency vs consistency tradeoff:
    Partition → choose A or C
    Else (normal operation) → choose Latency or Consistency

  Examples:
    Cassandra: PA/EL (availability during partition, low latency normally)
    MongoDB: PC/EC (consistency during partition, consistency normally)
    DynamoDB: PA/EL (availability during partition, low latency normally)
    PostgreSQL (single node): PC/EC (consistency always — but no partition tolerance)

Conflict resolution (when consistency is sacrificed):
  Last-write-wins (LWW): latest timestamp wins → simple but data loss possible‼️
    Two users edit the same document simultaneously → one edit is silently lost
  Vector clocks: track causal history of each update → detect conflicts
    Application decides how to merge conflicts
  CRDTs (Conflict-free Replicated Data Types): data structures that merge automatically
    Counters: G-Counter (grow-only), PN-Counter (add/subtract)
    Sets: G-Set (grow-only), OR-Set (add and remove)
    Used by: Redis (CRDTs for active-active replication), Riak
```

---

## Common Design Patterns

### Rate Limiting

```
Why: protect services from abuse, ensure fair usage, prevent DDoS.

Fixed window: count requests in 1-min bucket
  - Simple: INCR counter, check < limit
  - Problem: boundary burst — 100 req limit per minute, user sends 100 at 0:59
    and 100 at 1:00 → 200 requests in 2 seconds, but each window sees 100
  - Implementation with Redis:
    key = "rate:user123:202601251430"  (minute bucket)
    INCR key → if > limit, reject
    EXPIRE key 60 → auto-cleanup

Sliding window log: log per request timestamp
  - Store timestamp of every request in a sorted set
  - Count requests in the last 60 seconds
  - Accurate: no boundary burst problem
  - Problem: memory intensive — storing every request timestamp
  - Implementation: Redis sorted set, ZRANGEBYSCORE to count recent entries

Sliding window counter: hybrid — weighted count across two windows‼️
  - Combine current window count and previous window count with weights
  - Example: 30 seconds into current minute
    estimated count = (prev_window × 0.5) + current_window
    (0.5 because we're 50% through the current window)
  - Accurate enough, very memory efficient

Token bucket: bucket fills at fixed rate, requests consume tokens‼️
  - Bucket holds max N tokens
  - Tokens added at rate R per second
  - Each request takes 1 token
  - If no tokens → request rejected
  - Allows bursts (up to N), but average rate is bounded
  - Used by: AWS API Gateway, Stripe
  - Example: bucket size 10, refill 5/sec
    → can handle a burst of 10, then sustained rate of 5/sec

Leaky bucket: queue processed at fixed rate — smooth output
  - Requests enter a queue (bucket)
  - Queue processed at a fixed rate (leak rate)
  - If queue is full → request rejected
  - Output is smooth (no bursts)
  - Good for: shaping traffic to a steady rate

Where to implement rate limiting:
  Client-side: easily bypassed, only for UX (debounce)
  API Gateway: most common, centralised enforcement
  Application: per-endpoint or per-feature limits
  Database: connection limits (not really rate limiting, but similar)

Distributed rate limiting:
  Challenge: 10 API servers, each with local counters → user can get 10x the limit
  Solution 1: centralised Redis (all servers check same counter)
    - Network overhead for every request
  Solution 2: local counters with periodic sync
    - Each server allows limit/N requests (N = number of servers)
    - Slight over-limit is acceptable
  Solution 3: token bucket with Redis Lua script (atomic)
    - Single atomic operation: check + decrement

Response:
  Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
  Return: 429 Too Many Requests + Retry-After header
  Be helpful: tell the client when they can retry and how much is left
```

---

### Distributed ID Generation

```
Why: in a distributed system, you need globally unique IDs without coordination.
Database auto-increment doesn't work across multiple databases or services.

UUID v4: 128-bit random
  - No coordination needed: any server can generate independently
  - Collision probability: 50% chance after generating 2.71 × 10^18 UUIDs
  - Not sortable by time (random order)
  - Large: 36 chars as string, 16 bytes as binary
  - Bad for database indexes: random insertion → B-tree fragmentation
  - Example: 550e8400-e29b-41d4-a716-446655440000

Twitter Snowflake: 64-bit structured ID‼️
  Format: timestamp (41 bits) | datacenter (5) | machine (5) | sequence (12)
  - Sortable by time: IDs generated later are always larger
  - Fits in a bigint (8 bytes) — efficient for DB indexes
  - 4096 IDs/ms per machine (12-bit sequence)
  - 41-bit timestamp: ~69 years from epoch
  - Requires machine ID assignment (coordination for setup, not for generation)
  - Used by: Twitter, Discord, Instagram (modified version)

  Why it matters: sortable IDs mean your database inserts are sequential,
  which is MUCH faster for B-tree indexes than random UUIDs.

ULID: 128-bit, lexicographically sortable, URL-safe
  Format: timestamp (48 bits) + randomness (80 bits)
  - Sortable like Snowflake, but no machine ID needed
  - String format: 01ARZ3NDEKTSV4RRFFQ69G5FAV (26 chars, Crockford Base32)
  - Monotonic within the same millisecond
  - Good for: when you want sortable IDs without infrastructure for machine IDs

Database sequence: simple but centralised bottleneck
  - PostgreSQL: CREATE SEQUENCE, NEXTVAL()
  - Works for small scale, becomes a bottleneck at high throughput
  - Single point of failure
  - Can pre-allocate ranges: server A gets 1-1000, server B gets 1001-2000
    This reduces coordination but creates gaps in sequences

Comparison:
  UUID v4:    no coordination, not sortable, 16 bytes, random B-tree insert
  Snowflake:  needs machine ID, sortable, 8 bytes, sequential B-tree insert
  ULID:       no coordination, sortable, 16 bytes, sequential B-tree insert
  DB sequence: centralised, sortable, 8 bytes, sequential but SPOF

  For most systems: Snowflake or ULID. UUID if you can't set up anything.
```

---

### Consistent Hashing (deep)

```
Problem: you have N cache servers. Traditional hashing: server = hash(key) % N
When you add or remove a server (N changes), ALL keys get remapped. Disaster.

Consistent hashing: only ~1/N of keys get remapped when a node is added/removed.

How it works:
  1. Create a hash ring with values 0 to 2^32-1
  2. Place each server node on the ring by hashing its name: hash("server-A")
  3. To find which server stores a key: hash(key), then walk clockwise to the
     nearest server node

  Example with 3 servers on the ring:
    Server A at position 1000
    Server B at position 5000
    Server C at position 9000

    key "user:123" hashes to 3000 → walks clockwise → hits Server B
    key "user:456" hashes to 7000 → walks clockwise → hits Server C
    key "user:789" hashes to 500  → walks clockwise → hits Server A

  Adding Server D at position 7500:
    Only keys between 5000-7500 move from C to D
    Everything else stays put

Virtual nodes:‼️
  Problem: with only 3 servers on the ring, distribution is uneven.
  One server might "own" 60% of the ring.

  Solution: each physical server gets K virtual nodes on the ring
  Server A → virtual nodes: A-1, A-2, A-3, ..., A-150
  Each virtual node is placed independently on the ring

  Benefits:
    - Even distribution: more points on ring → more uniform ownership
    - Heterogeneous servers: give powerful server 200 vnodes, weak server 50
    - Smooth rebalancing: when a node leaves, its K vnodes spread load evenly

  Typical K value: 100-200 virtual nodes per physical node
  More vnodes = more even distribution but more memory for the ring map

Used by: Cassandra, DynamoDB, Riak, memcached clients, Akamai CDN
```

---

### CQRS (Command Query Responsibility Segregation)

```
What: separate the read model (Query) from the write model (Command).
Instead of one database serving both reads and writes, use two different models.

Why:
  - Reads and writes often have very different requirements
  - Reads: need fast, denormalised, pre-computed data
  - Writes: need normalised, validated, consistent data
  - Optimising one often hurts the other

How:
  Write side: normalised relational DB, enforces business rules, handles transactions
  Read side: denormalised read store (Elasticsearch, Redis, materialised views)
  Sync: events or CDC (Change Data Capture) propagate changes from write to read side

Example: e-commerce product listing
  Write model (PostgreSQL):
    products(id, name, description, category_id, price, stock, seller_id, created_at)
    categories(id, name, parent_id)
    sellers(id, name, rating)
  → normalised, no duplication, enforces foreign keys

  Read model (Elasticsearch):
    { id, name, description, category_name, price, stock, seller_name, seller_rating,
      image_urls, review_count, average_rating }
  → denormalised, everything needed for display in one document
  → optimised for search and filtering

  When seller updates their name:
    Write: UPDATE sellers SET name = 'New Name' WHERE id = 5
    Event: "seller_name_changed" → consumer updates all products in read model
    Read model is eventually consistent (milliseconds to seconds lag)

When to use CQRS:
  ✓ Read and write patterns are very different (read-heavy with complex queries)
  ✓ You need different performance characteristics for reads vs writes
  ✓ You're already using event sourcing

When NOT to use:
  ✗ Simple CRUD app (massive overkill)
  ✗ Strong consistency is required everywhere
  ✗ Small team that can't handle the operational complexity
```

---

### Event Sourcing

```
What: instead of storing current state, store every event that changed the state.
The current state is derived by replaying all events from the beginning.

Traditional: UPDATE account SET balance = 900 WHERE id = 1
  → You only know the current balance, not how you got there

Event sourcing: store events in an append-only log
  Event 1: AccountOpened { id: 1, balance: 0 }
  Event 2: MoneyDeposited { id: 1, amount: 1000 }
  Event 3: MoneyWithdrawn { id: 1, amount: 100 }
  → Current balance: replay events → 0 + 1000 - 100 = 900

Benefits:
  - Full audit trail: every change is recorded
  - Temporal queries: "what was the balance on March 15?"
  - Event replay: rebuild state from scratch, create new read models
  - Debugging: replay events to reproduce bugs

Challenges:
  - Performance: replaying millions of events is slow
    Fix: snapshots — periodically save the current state, replay from latest snapshot
  - Schema evolution: events are immutable, but their schema changes over time
    Fix: event versioning (upcasters transform old events to new schema)
  - Eventual consistency: read models are derived from events, so they lag behind
  - Complexity: much harder than simple CRUD

Often used with CQRS:
  Events (write side) → Event Store → Projections → Read Models (read side)

Real-world examples:
  - Banking: every transaction is an event (legally required audit trail)
  - Git: every commit is an event, current state = replay of all commits
  - Event log systems: Kafka retains events, consumers derive state
```

---

### Saga Pattern

```
What: manage distributed transactions across multiple services without a
centralised transaction coordinator. Each service does its local transaction
and publishes an event. If something fails, compensating transactions undo
the previous steps.

Why: in microservices, you can't do a single ACID transaction across databases.
Service A uses PostgreSQL, Service B uses DynamoDB — no shared transaction.

Example: booking a trip (flight + hotel + car)
  Happy path:
    1. Flight Service: reserve flight → publish "flight_reserved"
    2. Hotel Service: reserve hotel → publish "hotel_reserved"
    3. Car Service: reserve car → publish "car_reserved"
    4. All succeeded → trip confirmed

  Failure path (car unavailable):
    1. Flight Service: reserve flight ✓
    2. Hotel Service: reserve hotel ✓
    3. Car Service: reserve car ✗ → publish "car_reservation_failed"
    4. Hotel Service: compensate → cancel hotel reservation
    5. Flight Service: compensate → cancel flight reservation

Two types:

Choreography (event-driven): each service listens for events and acts‼️
  - No central coordinator
  - Services publish events, other services react
  - Simple for 2-3 services, becomes a mess for 5+ (hard to track the flow)
  - Example: order placed → payment service charges → inventory reserves → notification sends

Orchestration (central coordinator):‼️
  - A saga orchestrator service manages the flow
  - Tells each service what to do and handles failures
  - Easier to understand and debug (flow is in one place)
  - Orchestrator is a single point of failure (but can be made HA)
  - Example: OrderSaga orchestrator calls PaymentService.charge(),
    then calls InventoryService.reserve(), etc.

Key rules:
  - Every action must have a compensating action (undo)
  - Compensating actions must be idempotent (safe to retry)
  - Design for eventual consistency, not immediate consistency
  - Use a saga state machine to track progress
```

---

### Circuit Breaker

```
What: prevents a service from repeatedly calling a failing dependency.
Like an electrical circuit breaker: trips open when there's a fault.

Why: without it, one failing service takes down everything.
100 requests → slow/failing service → 100 threads blocked → thread pool exhaustion
→ your service becomes unresponsive too → cascade failure

Three states:
  Closed (normal): requests flow through
    - Track success/failure rate
    - If failure rate > threshold (e.g., 50% in last 10 seconds) → Open

  Open (tripped): requests fail immediately‼️
    - Don't even try to call the failing service
    - Return a fallback response (cached data, default, error message)
    - After a timeout (e.g., 30 seconds) → Half-Open

  Half-Open (testing): allow a few requests through
    - If they succeed → Closed (service recovered)
    - If they fail → Open again (service still broken)

Implementation:
  - Netflix Hystrix (Java, now in maintenance mode)
  - Resilience4j (Java, modern replacement for Hystrix)
  - Polly (.NET)
  - Custom: simple to implement with a counter and state machine

Example: your checkout calls a tax calculation API
  Normal: every checkout calls tax API → works fine
  Tax API goes down:
    Without circuit breaker: every checkout waits 30s for timeout → all checkouts slow
    With circuit breaker: after 5 failures, circuit opens → checkouts skip tax calculation,
      use estimated tax, reconcile later → checkouts remain fast

Combine with:
  - Retry with exponential backoff (before the circuit opens)
  - Fallback (return cached/default data when circuit is open)
  - Bulkhead (isolate thread pools per dependency)
  - Timeout (don't wait forever for a response)
```

---

## Common System Design Questions

### Design a URL Shortener (bit.ly)

```
Requirements:
  - Shorten URL, redirect to original
  - 100M URLs total, 10M new/day, 1B redirects/day (~11K/sec read)
  - Low latency redirect (<100ms), 5-year retention
  - Analytics: click count, referrer, geography

API:
  POST /api/shorten
    Request:  { "url": "https://example.com/very/long/path", "custom_alias": "mylink" }
    Response: { "short_url": "https://tny.im/a3Bf2x", "expires_at": "2031-01-01" }

  GET /{code} → 301/302 redirect‼️

  GET /api/stats/{code}
    Response: { "clicks": 150000, "created_at": "...", "top_referrers": [...] }

Key design: short code generation
  Option 1: hash(url) → take first 7 chars of MD5/SHA256
    - Collision possible: different URLs may get the same 7 chars
    - Fix: check DB for collision, if collision add a counter and re-hash
    - Idempotent: same URL always gets same short code (good for deduplication)

  Option 2: auto-increment ID → base62 encode‼️
    - ID 12345 → base62("12345") → "3d7" (short!)
    - Guaranteed unique (no collisions)
    - Predictable: IDs are sequential → security concern (can guess other URLs)
    - Fix: use a non-sequential ID generator (Snowflake) before base62 encoding

  Option 3: pre-generate pool of random codes
    - Generate millions of random 7-char codes in advance
    - Store in a key-value store, mark as "used" when assigned
    - No runtime computation, no collision handling
    - Need to manage the pool (refill when running low)

  base62: [a-zA-Z0-9] = 62 chars. 7 chars = 62^7 = 3.5 trillion combinations
    6 chars = 56 billion (enough for most systems)
    7 chars = 3.5 trillion (enough for massive scale)

DB schema:
  shortcodes(
    code VARCHAR(7) PRIMARY KEY,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    user_id BIGINT,
    click_count BIGINT DEFAULT 0
  )
  -- Index on original_url for deduplication (if URL already shortened, return existing)

  clicks(
    code VARCHAR(7),
    timestamp TIMESTAMP,
    ip VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    country VARCHAR(2)
  )
  -- Partition by date for efficient time-range queries
  -- This table gets massive: 1B rows/day → use Cassandra or ClickHouse

Cache: Redis (code → url), cache hot codes (Pareto — 20% codes = 80% traffic)
  Cache-aside, TTL 24h
  Cache size estimate: 20% of 100M URLs = 20M × ~200 bytes = 4GB → fits in one Redis instance

Redirect: 301 vs 302 — important distinction‼️
  301 (permanent): browser caches the redirect, never hits your server again
    - Good for: reducing server load
    - Bad for: analytics (you can't count clicks if browser never calls you)
  302 (temporary): browser always calls your server
    - Good for: analytics, A/B testing, expiring links
    - Bad for: higher server load
  Most URL shorteners use 302 (analytics are the core product)

Scale:
  Read-heavy (1000:1 ratio) → multiple read replicas, heavy cache
  DB sharding by code hash (first 2 chars) → even distribution
  CDN for redirect responses (CDN can handle redirects at edge)
  Rate limiting on create endpoint (prevent spam)
  Expiry: background job deletes expired URLs and frees codes for reuse

Deep dive topics interviewers love:
  - Custom aliases: user picks "tny.im/myproduct" → check availability, reserve
  - Link expiry: TTL per link, background cleanup job
  - Abuse prevention: block malicious URLs, CAPTCHA on creation
  - Global deployment: DNS-based routing to nearest data center
```

---

### Design Twitter/X

```
Requirements:
  - Post tweets (280 chars), follow users, home timeline, user profile
  - 300M DAU, 600M tweets/day, timeline read-heavy (100:1 read/write)
  - Low latency timeline (<200ms), high availability (99.99%)

Capacity:
  Tweets: 600M/day = ~7,000 tweets/sec
  Timeline reads: 300M DAU × 10 views/day = 3B/day = ~35K reads/sec
  Storage: 600M × 300 bytes = 180GB/day = 66TB/year (text only)
  Media: assume 10% have images → 60M × 200KB = 12TB/day

Key challenge: home timeline generation‼️

Option 1: Fan-out on write (push)
  When user posts a tweet → write to ALL followers' timeline caches
  - User A has 1000 followers → 1000 Redis writes per tweet
  - Read: O(1) — just read the pre-computed list from Redis
  - Timeline is always ready, no computation at read time
  Problem: celebrity with 10M followers → 10M writes per tweet‼️
    Elon Musk tweets → 10M Redis writes → takes minutes to propagate
    During those minutes, most followers don't see the tweet yet

Option 2: Fan-out on read (pull)
  Read: fetch tweets from all followed users, merge sort by timestamp
  - No write amplification: posting a tweet is just one DB write
  Problem: O(N) reads per timeline view where N = following count
    User follows 500 people → query 500 users' tweets, merge → slow
    35K timeline reads/sec × 500 users = 17.5M DB reads/sec → very expensive

Option 3: Twitter's actual solution — hybrid‼️
  Regular users (< 10K followers) → fan-out on write
    Post tweet → push to all followers' Redis timeline caches
    Most users have < 1000 followers → 1000 writes is fast and cheap
  Celebrities (> 10K followers) → fan-out on read
    Don't push to 10M timelines
    When a user loads their timeline:
      1. Read pre-computed timeline from Redis (non-celebrity tweets)
      2. Fetch latest tweets from each celebrity they follow
      3. Merge the two lists, sort by timestamp
      4. Return top N tweets

  This is brilliant because:
    - 99% of users have < 10K followers → handled by fast push path
    - The few celebrities are fetched on-demand
    - User follows ~5 celebrities → only 5 extra reads per timeline load

DB design:
  users(id BIGINT PK, username VARCHAR(15) UNIQUE, bio TEXT,
        follower_count INT, following_count INT, created_at)

  tweets(id BIGINT PK,          -- Snowflake ID (sortable by time)
         user_id BIGINT,         -- FK to users
         content VARCHAR(280),
         media_urls TEXT[],       -- array of S3 URLs
         reply_to_id BIGINT,     -- NULL if not a reply
         retweet_of_id BIGINT,   -- NULL if not a retweet
         like_count INT,
         retweet_count INT,
         created_at TIMESTAMP)
  -- Index: (user_id, created_at DESC) for user profile timeline

  follows(follower_id BIGINT, followee_id BIGINT, created_at TIMESTAMP)
  -- Composite PK: (follower_id, followee_id)
  -- Index: (followee_id, follower_id) for "who follows me"
  -- This table is huge: 300M users × avg 200 following = 60B rows
  -- Shard by follower_id (queries are "who do I follow")

  timeline_cache: Redis sorted set per user_id‼️
    Key: timeline:{user_id}
    Members: tweet_id
    Score: created_at timestamp
    ZREVRANGE timeline:123 0 19 → get 20 most recent tweets
    Keep last 800 tweets per user (trim older ones)
    Total cache: 300M users × 800 tweets × 8 bytes = ~2TB of Redis

Media: S3 for storage, CDN for delivery
  - Upload: client → pre-signed URL → S3
  - Serve: CDN URL (e.g., pbs.twimg.com/media/...)

Search: Elasticsearch for full-text tweet search
  - Index: tweet content, hashtags, user mentions
  - Trending: aggregate hashtag counts over a sliding window
  - Store recent tweets (last 7 days) for fast search

Notifications:
  - Fan-out on write: when tweet is liked/replied/retweeted → push notification
  - WebSocket or SSE for real-time delivery
  - If user offline → push notification via APNS/FCM
  - Store in a notifications table, paginated by (user_id, created_at)
```

---

### Design a Chat System (WhatsApp)

```
Requirements:
  - 1:1 and group chat (up to 256 members), message delivery, online presence, history
  - 2B users, 100B messages/day
  - Low latency (< 200ms message delivery), high reliability (no message loss)
  - End-to-end encryption, media sharing, read receipts

Connection: WebSocket for real-time‼️
  - HTTP is request-response: client must poll for new messages (wasteful)
  - WebSocket: persistent bidirectional connection
  - Client opens one WebSocket → stays connected → server pushes messages instantly

  Challenge: which server holds user X's connection?‼️
  - 2B users, each connected to one of thousands of chat servers
  - When user A sends to user B, how do we find user B's server?
  - Solution: connection registry in Redis
    user:456 → chat-server-7
    When message arrives for user 456 → look up → route to chat-server-7
  - Alternative: Redis pub/sub — publish to channel "user:456",
    the server holding user 456's connection subscribes to that channel

Message flow (1:1):
  1. Sender → WebSocket → Chat Server A
  2. Chat Server A → Message Service → store in DB (with message_id)
  3. Message Service → look up recipient's chat server
  4. If online: route to Chat Server B → WebSocket → Recipient
  5. If offline: push notification via APNS/FCM
  6. Message Service returns ack to sender (✓ sent)

Message flow (group):
  1. Sender → Chat Server → Message Service
  2. Message Service → store message with conversation_id
  3. For each group member:
     - If online: route to their chat server → WebSocket → deliver
     - If offline: push notification
  4. Optimisation: if group has 200 members on 50 different chat servers,
     send one copy to each chat server, fan out locally

Storage:‼️
  Messages: Cassandra (time-series, write-heavy)
    Partition key: conversation_id
    Clustering key: message_id (Snowflake → sorted by time)
    Columns: sender_id, content, media_url, type, created_at

    Why Cassandra?
    - Write-heavy: 100B messages/day = ~1.15M writes/sec
    - Time-series: naturally ordered by timestamp
    - Horizontal scaling: add nodes as data grows
    - Tunable consistency: write with LOCAL_QUORUM for durability

    Query pattern:
    "Get last 50 messages in conversation X" → single partition read, efficient

  User metadata: PostgreSQL (structured, relational)
  Media: S3 + CDN
    - Media messages store the S3 URL, not the file itself
    - End-to-end encryption: client encrypts before upload, only recipient can decrypt

Delivery receipts:‼️
  sent ✓ → message stored on server (ack from Message Service)
  delivered ✓✓ → recipient's device received the message
    - Recipient's device sends "delivered" ack back to server
    - Server forwards "delivered" status to sender
  read ✓✓ (blue) → recipient opened the chat
    - Recipient's app sends "read" event when chat is opened
    - Server forwards "read" status to sender

  Implementation: status updates are themselves messages sent back through the same pipeline
  Optimisation: batch status updates (don't send "read" for each message,
    send "read up to message_id X" for the whole conversation)

Presence (online/offline):
  User sends heartbeat every 5s to presence service
  Presence stored in Redis: userId → { status, lastSeen } with TTL 30s
  If no heartbeat for 30s → user considered offline

  Challenge: 2B users × status updates to all contacts = massive fan-out
  Optimisation:
    - Only send presence updates to users who have the chat open
    - Don't send "last seen" updates in real-time for large group chats
    - Use lazy pull: when user opens a chat, fetch the other person's status

End-to-end encryption (E2EE):
  - Signal Protocol (used by WhatsApp, Signal)
  - Each user has a public/private key pair
  - Message encrypted with recipient's public key
  - Server stores encrypted blob — cannot read the message
  - Key exchange happens when users first message each other
  - Group E2EE: sender encrypts once per member (expensive for large groups)
```

---

### Design a Rate Limiter

```
Requirements:
  - 10K req/sec, per-user and per-IP rate limiting, distributed system
  - Multiple rules: 100 req/min per user, 1000 req/hour per user, 10 req/sec per IP
  - Low latency: rate check < 1ms
  - Accurate: no significant over-limit

Architecture:
  Client → API Gateway → Rate Limiter Middleware → Application

  Rate limiter is typically in the API Gateway or as middleware.
  Rules stored in a configuration service (can be updated without redeploy).

Storage: Redis (shared across API server fleet)‼️
  Why Redis: in-memory, single-threaded (no race conditions with Lua), sub-ms latency

Token bucket in Redis (Lua script for atomicity):
  -- Lua script executed atomically in Redis
  local key = KEYS[1]                    -- "rate:user:123"
  local limit = tonumber(ARGV[1])        -- max tokens (e.g., 100)
  local refill_rate = tonumber(ARGV[2])  -- tokens per second (e.g., 2)
  local now = tonumber(ARGV[3])          -- current timestamp (ms)

  local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
  local tokens = tonumber(bucket[1]) or limit
  local last_refill = tonumber(bucket[2]) or now

  -- Refill tokens based on elapsed time
  local elapsed = (now - last_refill) / 1000
  tokens = math.min(limit, tokens + elapsed * refill_rate)

  if tokens >= 1 then
    tokens = tokens - 1
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 3600)  -- cleanup after 1 hour of inactivity
    return 1  -- allowed
  else
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 3600)
    return 0  -- rejected
  end

Distributed rate limiting challenges:‼️
  - Network latency to Redis: every request adds ~1ms round trip
    Fix: local in-memory cache with periodic sync (accept ~5% overrun)
  - Redis SPOF: use Redis Cluster with replicas → automatic failover
  - Race conditions: Lua scripts run atomically in Redis → no races
  - Clock drift: use Redis server time, not application server time

Multiple rules:
  User can have multiple rate limit rules applied simultaneously:
    Rule 1: 100 requests per minute
    Rule 2: 1000 requests per hour
    Rule 3: 10 requests per second per endpoint

  Implementation: check all rules, reject if ANY rule is exceeded
  Store each rule in a separate Redis key:
    rate:user:123:minute → token bucket (limit=100, refill=100/60)
    rate:user:123:hour   → token bucket (limit=1000, refill=1000/3600)
    rate:user:123:second → token bucket (limit=10, refill=10)

Response headers:
  X-RateLimit-Limit: 100           (max requests allowed in window)
  X-RateLimit-Remaining: 43        (requests left)
  X-RateLimit-Reset: 1620000000    (epoch when limit resets)
  Retry-After: 30                  (seconds until client should retry)

Rate limiting strategies:
  Per-user: authenticated users get their own bucket → fair for paying customers
  Per-IP: unauthenticated traffic → protect against abuse
  Per-API-key: different API keys get different limits → tiered pricing
  Per-endpoint: /api/search gets lower limit than /api/user (search is expensive)
  Global: protect the entire system regardless of user (emergency brake)
```

---

### Design YouTube/Netflix

```
Requirements:
  - Upload video, watch video, search, recommendations
  - 500 hours of video uploaded per minute
  - 1B daily video views, 200M DAU
  - Adaptive streaming, multiple quality levels
  - Low start time (< 2 seconds), smooth playback

Upload pipeline:‼️
  1. Client → Upload Service → raw video stored in S3 (original quality)
  2. Upload Service → publishes "video_uploaded" event to Kafka
  3. Transcoding workers consume event:
     - Download raw video from S3
     - Transcode to multiple resolutions: 360p, 480p, 720p, 1080p, 4K
     - Each resolution also has multiple bitrates
     - Split into 2-10 second segments (chunks)
     - Generate a manifest file (.m3u8 for HLS, .mpd for DASH)
     - Upload all chunks + manifest back to S3
  4. Transcoding worker → publishes "video_ready" event
  5. Metadata service updates DB: status = "published", chunk URLs populated

  Why chunks?‼️
    - Enables adaptive bitrate streaming
    - Client can switch quality mid-stream based on bandwidth
    - Enables seeking: jump to any point without downloading everything
    - Parallel download: CDN can serve different chunks from different edges

Adaptive bitrate streaming (ABR):‼️
  HLS (Apple) and DASH (open standard) work similarly:
    1. Client requests manifest file
    2. Manifest lists all available quality levels and their chunk URLs:
       720p: chunk1.ts, chunk2.ts, chunk3.ts...
       1080p: chunk1.ts, chunk2.ts, chunk3.ts...
    3. Client starts with low quality (fast start)
    4. If bandwidth is good → switch to higher quality on next chunk
    5. If bandwidth drops → switch to lower quality
    6. Decision made per-chunk → seamless quality transitions

CDN — the most critical component for video:‼️
  - 80-90% of video traffic served from CDN edge servers
  - Popular videos pre-warmed on CDN (proactive push)
  - Long-tail videos: pulled from origin on first request, then cached
  - Multi-CDN: use multiple CDN providers for redundancy and coverage
    Netflix uses their own CDN (Open Connect) plus commercial CDNs

  Cost optimisation:
  - CDN bandwidth is the #1 cost for video platforms
  - More efficient codecs (AV1 vs H.264): 30-50% smaller files, same quality
  - Smart caching: pre-warm only videos likely to be popular
  - P2P delivery: in some implementations, viewers share chunks with nearby viewers

DB:
  Video metadata: PostgreSQL or Cassandra
    videos(id, title, description, uploader_id, duration, status,
           thumbnail_url, view_count, like_count, created_at)
    video_chunks(video_id, quality, chunk_index, chunk_url, duration)

  User watch history: Cassandra (time-series, write-heavy)
    watch_history(user_id, video_id, progress_seconds, timestamp)
    - Partition by user_id
    - "Resume where you left off" = read latest entry for (user_id, video_id)

  Comments: Cassandra, paginated by (video_id, created_at)
    - Separate table for performance (comments don't slow down video metadata reads)

Search: Elasticsearch
  - Index: title, description, tags, channel name, captions/subtitles
  - Autocomplete: edge n-gram analysis on title field
  - Filtered by: upload date, duration, quality, channel

Recommendations:‼️
  - Collaborative filtering: "users who watched X also watched Y"
  - Content-based: similar tags, categories, descriptions
  - Pre-computed by ML pipeline (offline batch processing)
  - Stored in a fast read store (Redis or dedicated recommendation service)
  - Real-time signals: what user just watched → update recommendations immediately
  - A/B testing: different recommendation algorithms for different user segments

Thumbnail generation:
  - Auto-generate: extract frames at regular intervals, pick the most visually appealing
  - ML model selects best thumbnail (highest predicted click-through rate)
  - Multiple thumbnails for A/B testing
```

---

### Design a Notification System

```
Requirements:
  - Push notifications (mobile), email, SMS, in-app notifications
  - 100M users, 1B notifications/day
  - Priority-based: urgent (password reset) vs low (weekly digest)
  - User preferences: opt-in/opt-out per channel per notification type
  - Rate limiting: don't spam users

Architecture:
  1. Service publishes event: { type: "order_shipped", user_id: 123, data: {...} }
  2. Notification Service receives event
  3. Checks user preferences: does user want this notification? Via which channel?
  4. Templates: render the message for each channel (push title, email HTML, SMS text)
  5. Rate check: has user received too many notifications recently?
  6. Route to appropriate channel handler:
     - Push: APNS (iOS), FCM (Android)
     - Email: SES, SendGrid
     - SMS: Twilio, SNS
     - In-app: store in DB, deliver via WebSocket

Key design decisions:

  Priority queues:‼️
    High priority: password reset, 2FA, payment confirmation → process immediately
    Medium: order updates, social interactions → process within seconds
    Low: weekly digest, recommendations → batch and send at optimal time

    Implementation: separate Kafka topics or SQS queues per priority
    High-priority queue has more consumers → lower latency

  Template engine:
    - Templates stored in DB, editable by marketing team
    - Variables: { user.name }, { order.number }, { tracking.url }
    - Localisation: template per language
    - Preview: render template before sending (admin tool)

  Delivery tracking:
    - Track: sent, delivered, opened, clicked, bounced, unsubscribed
    - Email: track opens via 1x1 pixel, clicks via redirect links
    - Push: delivery receipt from APNS/FCM
    - Store in analytics DB for reporting

  Rate limiting per user:
    - Max 5 push notifications per hour
    - Max 1 email per day (except urgent)
    - Group notifications: "3 people liked your post" instead of 3 separate notifications
    - Quiet hours: don't send between 10pm-8am (user's timezone)

DB:
  notifications(id, user_id, type, channel, status, content, created_at, sent_at, read_at)
  user_preferences(user_id, notification_type, channel, enabled)
  device_tokens(user_id, platform, token, created_at)
```

---

### Design a Web Crawler

```
Requirements:
  - Crawl 1B pages per month (~400 pages/sec)
  - Respect robots.txt, handle duplicates, politeness (don't DDoS sites)
  - Store page content for indexing

Architecture:
  1. URL Frontier: queue of URLs to crawl (prioritised)
  2. Fetcher: downloads pages (HTTP client with timeouts)
  3. DNS Resolver: resolve domain to IP (cache DNS results)
  4. Content Parser: extract text, links, metadata
  5. URL Deduplicator: have we seen this URL before? (Bloom filter)
  6. Content Deduplicator: have we seen this content before? (SimHash)
  7. URL Extractor: pull all links from the page → add to URL Frontier
  8. Storage: store page content (S3 or distributed filesystem)

Key design decisions:

  Politeness:‼️
    - Respect robots.txt: download and cache robots.txt per domain
    - Crawl delay: wait N seconds between requests to the same domain
    - Max concurrent connections per domain (usually 1)
    - Implementation: per-domain queue with rate limiting
      URL Frontier has a separate queue per domain
      Each domain queue is rate-limited (e.g., 1 request per second)

  URL Frontier (priority queue):
    - Not a simple FIFO: some URLs are more important
    - Priority based on: PageRank, freshness, domain authority
    - Back queue: per-domain queues for politeness
    - Front queue: priority queues that feed the back queues

  Deduplication:‼️
    URL dedup: Bloom filter — probabilistic, space-efficient
      - 1B URLs × 8 bits per element = 1GB (compact!)
      - False positive rate: ~2% (might re-crawl some pages, that's OK)
      - False negatives: zero (never misses a URL it's seen)
    Content dedup: SimHash — fingerprint of page content
      - Two pages with similar content → similar fingerprints
      - Detects near-duplicates (same article on different URLs)

  Handling traps:
    - Infinite pagination: /page/1, /page/2, /page/3... forever
      Fix: max URL depth limit (e.g., 15 hops from seed URL)
    - Dynamic content: JavaScript-rendered pages
      Fix: headless browser (Puppeteer) for JS rendering (expensive)
    - URL normalisation: remove fragments (#), sort query params,
      lowercase scheme/host, resolve relative URLs

  Scale:
    400 pages/sec × 500KB avg = 200MB/sec incoming bandwidth
    Storage: 1B pages × 500KB = 500TB per month
    Distributed: multiple crawler instances, each assigned different domains
    Coordination: URL Frontier is shared (Kafka or distributed queue)
```

---

## Trade-off Cheat Sheet

```
SQL vs NoSQL:
  SQL: ACID, joins, complex queries, schema enforced, vertical scaling
    Best for: structured data with relationships, transactions, complex reporting
    Examples: PostgreSQL, MySQL, Aurora
  NoSQL: horizontal scale, flexible schema, eventual consistency, simple queries
    Best for: high write throughput, simple key-value lookups, rapidly changing schema
    Document: MongoDB (flexible schema, JSON-like)
    Wide-column: Cassandra (time-series, write-heavy, horizontal scale)
    Key-value: Redis (cache, sessions), DynamoDB (managed, auto-scale)
    Graph: Neo4j (social networks, recommendations)

Normalisation vs Denormalisation:
  Normalise: no duplication, complex joins at query time
    Good: data integrity, easy updates (change in one place)
    Bad: slow reads (many joins), harder to scale (joins across shards)
  Denormalise: duplicate data, fast reads, complex writes
    Good: fast reads (no joins), easier to shard
    Bad: data inconsistency risk, more storage, complex update logic

Synchronous vs Asynchronous:
  Sync: simpler, immediate feedback, tight coupling
    When: user needs an immediate response, operation is fast
    Example: "is this username available?" → must respond immediately
  Async: decoupled, resilient, harder to debug
    When: work can be done later, need to absorb traffic spikes
    Example: "send a welcome email" → queue it, don't make user wait

Strong vs Eventual consistency:
  Strong: correct but slower, limits availability
    When: financial transactions, inventory, authentication
    Example: bank transfer must be atomic — debit and credit together
  Eventual: fast, available, requires idempotent consumers
    When: social feeds, analytics, caching, DNS
    Example: like count showing 999 instead of 1000 for 2 seconds is fine

Push vs Pull:
  Push: low latency, complex fan-out, wasted work for inactive users
    When: real-time requirements, small fan-out
    Example: WhatsApp messages, stock price updates
  Pull: simple, stale data, thundering herd on polling
    When: large fan-out, users check infrequently
    Example: RSS feeds, email checking

Monolith vs Microservices:
  Monolith: simple, fast iteration, single deploy, hard to scale independently
    When: small team (<10), new product, domain not well understood
  Microservices: independent scale/deploy, tech diversity, network/ops complexity
    When: multiple teams, clear domain boundaries, different scaling needs

Batch vs Stream processing:
  Batch: process large volumes periodically (hourly, daily)
    When: data completeness matters, latency tolerance is high
    Tools: Hadoop MapReduce, Spark, AWS Batch
    Example: daily revenue report, ML model training
  Stream: process events as they arrive (real-time or near-real-time)
    When: low latency matters, react to events immediately
    Tools: Kafka Streams, Flink, Kinesis
    Example: fraud detection, real-time dashboard, alerting
```
