# System Design — Senior Deep Reference

## The Framework (use this structure every time)

```
1. Clarify requirements (3–5 min)
   - Functional: what does it do?
   - Non-functional: scale, latency, availability, consistency?
   - Out of scope: what are we NOT building?

2. Capacity estimation (2–3 min)
   - DAU, read/write ratio, storage, bandwidth

3. High-level design (10 min)
   - Draw the boxes: client, LB, API servers, DB, cache, queue, CDN

4. Deep dive (15–20 min)
   - Pick 2–3 critical components and go deep
   - DB schema, API design, caching strategy, consistency model

5. Bottlenecks & trade-offs (5 min)
   - Single points of failure, hot spots, scaling limits
```

---

## Capacity Estimation Numbers to Memorise

```
Traffic:
  1M DAU, 10 req/day → 100M req/day → ~1,200 req/sec
  Rule: DAU × req/day / 86,400 = req/sec

Storage:
  1 byte  = 1 char
  1 tweet = ~300 bytes
  1 photo = ~200KB compressed
  1 video = ~10MB/min at 720p
  1TB = 1B KB = 1M MB

  10M photos/day × 200KB = 2TB/day = 730TB/year

Bandwidth:
  read QPS × response size = bandwidth

Latency targets:
  L1 cache: 1ns    L2: 4ns     L3: 40ns
  RAM: 100ns       SSD: 100µs  HDD: 10ms
  Network (same DC): 500µs     Cross-region: 150ms
  Rule of thumb: cache = fast, DB = slow, network = variable
```

---

## Core Building Blocks

### Load Balancer

```
Layer 4 (Transport): routes by IP/TCP — faster, no content inspection
Layer 7 (Application): routes by URL/header/cookie — smarter, SSL termination

Algorithms:
  Round-robin       — equal distribution
  Least connections — send to least busy server
  IP hash           — same client → same server (sticky sessions)
  Weighted          — proportional to server capacity

Health checks: heartbeat every N seconds; remove unhealthy servers from pool
Active-active: multiple LBs in parallel (avoid SPOF)
```

### Database Scaling

```
Vertical scaling:     bigger machine (limited, expensive)
Read replicas:        primary handles writes, replicas handle reads
                      replication lag is a concern (read-your-writes problem)
Sharding (horizontal):split data across multiple DBs by shard key

  Range sharding:    shard by user ID range (0-1M, 1M-2M)
                     Risk: hot shards if range is popular
  Hash sharding:     shard by hash(user_id) % N
                     Even distribution, but range queries across shards are hard
  Directory-based:   lookup service maps key → shard
                     Flexible, but lookup service is a bottleneck/SPOF

Consistent hashing:  nodes on a ring; data goes to nearest node clockwise
                     Adding/removing nodes only remaps ~1/N of keys
                     Used by: Cassandra, DynamoDB, load balancers

Cross-shard problems: joins, transactions, foreign keys — push these to app layer
```

### Caching

```
Cache-aside (lazy loading): app checks cache, on miss reads DB and populates cache
Write-through:              write to cache and DB together (always consistent)
Write-behind (write-back):  write to cache, async flush to DB (fast writes, risk of loss)
Read-through:               cache sits in front, app talks only to cache

Eviction: LRU (most common), LFU, FIFO, TTL-based

Cache invalidation strategies:
  TTL: simple, eventually consistent
  Event-driven: write to DB → publish event → invalidate cache
  Versioned keys: cache_key_v2 — never invalidate, just rotate

Cache stampede (thundering herd):
  Many requests hit empty cache simultaneously → all hit DB
  Fix: lock (one request populates, rest wait) or probabilistic early expiry
```

### Message Queues

```
Async decoupling: producer doesn't wait for consumer
Use for: email sending, image resizing, notifications, audit logging

Fan-out pattern:
  Producer → Queue → multiple consumers independently
  e.g., "user signed up" → welcome email + analytics + CRM

Backpressure: queue fills if consumers are slow → add consumers or slow producers
Dead-letter queue: failed messages after N retries → DLQ for investigation
```

### CDN

```
Edge servers cache static assets close to users.
Origin: your servers. Edge: CDN servers globally.

Push CDN: you upload files to CDN (good for small, infrequently changing assets)
Pull CDN: CDN fetches from origin on first miss, caches (good for large sites)

Cache-Control headers: max-age, s-maxage, no-cache, no-store
CDN purge: invalidate files after deploy (by URL or tag)

Dynamic content: CDN can forward to origin + cache with vary headers
```

---

## Consistency Models

```
Strong consistency:    every read sees the latest write (expensive, blocks)
Eventual consistency:  reads may be stale, will converge (fast, available)
Read-your-writes:      user always sees their own writes (common requirement)
Monotonic reads:       user never sees data going backwards in time
Causal consistency:    causally related ops seen in order

CAP theorem: distributed system can guarantee 2 of 3:
  Consistency: all nodes see same data
  Availability: every request gets a response
  Partition tolerance: system works despite network splits

  CA: single-node DB (no partition tolerance, not distributed)
  CP: Zookeeper, HBase (sacrifices availability on partition)
  AP: Cassandra, DynamoDB (sacrifices consistency on partition — eventual)

PACELC extension: also considers latency tradeoff even without partition:
  e.g., Cassandra: AP during partition, EL (low latency) during normal ops
```

---

## Common Design Patterns

### Rate Limiting

```
Fixed window:   count requests in 1-min bucket — boundary burst problem
Sliding window: log per request timestamp — accurate, memory intensive
Sliding window counter: hybrid — weighted count across two windows
Token bucket:   bucket fills at fixed rate, requests consume tokens — allows burst
Leaky bucket:   queue processed at fixed rate — smooth output, drops excess

Storage: Redis (INCR + EXPIRE for fixed window, sorted sets for sliding log)
Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
Return: 429 Too Many Requests + Retry-After header
```

### Distributed ID Generation

```
UUID v4:           128-bit random — no coordination needed, not sortable, large
Twitter Snowflake: 64-bit = 41-bit timestamp | 10-bit machine ID | 12-bit sequence
                   Sortable by time, fits in bigint, 4096 IDs/ms per machine
Ulid:              128-bit, lexicographically sortable, URL-safe
Database sequence: simple but centralized bottleneck
```

### Consistent Hashing (deep)

```
Ring of 2^32 hash values (0 to 2^32-1)
Nodes placed on ring by hash(nodeId)
Key → hash(key) → clockwise to nearest node

Virtual nodes: each physical node has K virtual nodes on ring
               prevents uneven distribution, helps with different capacities
               When node leaves: K ranges redistribute, not just 1

Used by: Cassandra, DynamoDB, Riak, memcached clients
```

---

## Common System Design Questions

### Design a URL Shortener (bit.ly)

```
Requirements:
  - Shorten URL, redirect to original
  - 100M URLs total, 10M new/day, 1B redirects/day (~11K/sec read)
  - Low latency redirect (<100ms), 5-year retention

API:
  POST /shorten { url } → { shortCode }
  GET /{code} → 301/302 redirect

Key design: short code generation
  Option 1: hash(url) → take first 7 chars (collision possible)
  Option 2: auto-increment ID → base62 encode (guaranteed unique)
  Option 3: pre-generate pool of random codes

DB schema:
  shortcodes(code VARCHAR(7) PK, original_url TEXT, created_at, expires_at, user_id)
  clicks(code, timestamp, ip, user_agent)  — for analytics

Cache: Redis (code → url), cache hot codes (Pareto — 20% codes = 80% traffic)
  Cache-aside, TTL 24h

Redirect: 301 (permanent, browser caches — good for load, bad for analytics)
          302 (temporary, always hits server — good for analytics)

Scale:
  Read-heavy → multiple read replicas, heavy cache
  DB sharding by code range or hash
  CDN for redirect responses
```

### Design Twitter/X

```
Requirements:
  - Post tweets (280 chars), follow users, home timeline, user profile
  - 300M DAU, 600M tweets/day, timeline read-heavy

Key challenge: home timeline generation

Option 1: Fan-out on write (push)
  On tweet → write to all followers' timelines in Redis
  Read: O(1) — just read pre-computed list
  Problem: celebrity with 10M followers → 10M writes per tweet (write amplification)

Option 2: Fan-out on read (pull)
  Read: fetch tweets from all followed users, merge sort
  Problem: O(N) reads per timeline view where N = following count

Twitter's actual solution: hybrid
  Regular users → fan-out on write (push to followers' caches)
  Celebrities → fan-out on read (fetched and merged at read time)
  Threshold: ~10K followers → switch to pull model

DB design:
  users(id, username, bio, follower_count, following_count)
  tweets(id, user_id, content, created_at, like_count, retweet_count)
  follows(follower_id, followee_id, created_at)  — composite PK
  timeline_cache: Redis sorted set per user_id, score=timestamp

Media: object storage (S3), CDN for delivery
Search: Elasticsearch for full-text tweet search
```

### Design a Chat System (WhatsApp)

```
Requirements:
  - 1:1 and group chat, message delivery, online presence, history

Connection: WebSocket for real-time (persistent connection)
  Chat servers maintain WebSocket connections
  Service discovery: which server holds user X's connection?
  → Redis pub/sub or Zookeeper

Message flow:
  Sender → WebSocket → Chat server → Message service → Queue
  Queue → Chat server (recipient's) → WebSocket → Recipient

  If recipient offline: push notification via APNS/FCM

Storage:
  Messages: Cassandra (time-series, write-heavy, sharded by conversation_id)
            (conversation_id, timestamp) → composite partition key
  User metadata: MySQL/Postgres
  Media: S3 + CDN

Delivery receipts:
  sent ✓ → server received
  delivered ✓✓ → recipient device received
  read ✓✓ (blue) → recipient opened

Presence (online/offline):
  User sends heartbeat every 5s to presence service
  Presence stored in Redis (userId → lastSeen with TTL)
  Offline if lastSeen > 30s ago
```

### Design a Rate Limiter

```
Requirements:
  - 10K req/sec, per-user rate limiting, distributed system

Storage: Redis (shared across API server fleet)

Token bucket in Redis (Lua script for atomicity):
  KEYS[1] = "rate:user:123"
  local tokens = redis.call('GET', KEYS[1]) or LIMIT
  if tokens > 0 then
    redis.call('SET', KEYS[1], tokens - 1, 'EX', WINDOW)
    return 1  -- allowed
  else
    return 0  -- rejected
  end

Distributed rate limiting challenges:
  - Network latency to Redis adds overhead
  - Redis SPOF: use Redis Cluster with replicas
  - Local in-memory cache: allow small % of excess, sync periodically

Response headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 43
  X-RateLimit-Reset: 1620000000 (epoch when limit resets)
```

### Design YouTube/Netflix

```
Requirements:
  - Upload video, watch video, search, recommendations
  - 500 hours of video uploaded per minute

Upload pipeline:
  Client → upload service → raw video (S3)
  → transcoding queue (Kafka)
  → transcoding workers → multiple resolutions (360p, 720p, 1080p, 4K)
  → encoded chunks stored in S3
  → metadata updated in DB

Adaptive bitrate streaming (HLS/DASH):
  Video split into 2–10s chunks
  Client selects quality based on bandwidth (ABR algorithm)
  Manifest file (.m3u8 / .mpd) → chunk list by quality

CDN: video chunks served from edge nodes (80–90% traffic)
  Upload to origin → CDN pre-warms popular content proactively

DB:
  Video metadata: Cassandra (id, title, uploader, views, duration, status)
  User watch history: Cassandra (user_id, video_id, progress, timestamp)
  Comments: Cassandra, paginated by video_id + timestamp

Search: Elasticsearch, index title/description/tags
Recommendations: offline ML pipeline (collaborative filtering), pre-computed
```

---

## Trade-off Cheat Sheet

```
SQL vs NoSQL:
  SQL: ACID, joins, complex queries, schema enforced
  NoSQL: horizontal scale, flexible schema, eventual consistency

Normalisation vs Denormalisation:
  Normalise: no duplication, complex joins at query time
  Denormalise: duplicate data, fast reads, complex writes

Synchronous vs Asynchronous:
  Sync: simpler, immediate feedback, tight coupling
  Async: decoupled, resilient, harder to debug

Strong vs Eventual consistency:
  Strong: correct but slower, limits availability
  Eventual: fast, available, requires idempotent consumers

Push vs Pull:
  Push: low latency, complex fan-out, wasted work for inactive users
  Pull: simple, stale data, thundering herd on polling

Monolith vs Microservices:
  Monolith: simple, fast iteration, single deploy, hard to scale independently
  Microservices: independent scale/deploy, tech diversity, network/ops complexity
```
