# Redis & Caching Strategies — Senior Developer Deep Reference

**Priority: HIGH**

> Covers Redis internals, all data structures, caching patterns, eviction policies, rate limiting, pub/sub, distributed locking, cluster/sentinel, persistence, transactions, and Node.js patterns with ioredis.

---

## Table of Contents

1. [What Redis Is](#1-what-redis-is)
2. [Redis Data Structures](#2-redis-data-structures)
3. [Caching Patterns](#3-caching-patterns)
4. [Cache Invalidation Strategies](#4-cache-invalidation-strategies)
5. [Cache Eviction Policies](#5-cache-eviction-policies)
6. [Cache Stampede (Thundering Herd)](#6-cache-stampede-thundering-herd)
7. [Session Storage with Redis](#7-session-storage-with-redis)
8. [Rate Limiting Patterns](#8-rate-limiting-patterns)
9. [Pub/Sub](#9-pubsub)
10. [Distributed Locking](#10-distributed-locking)
11. [Redis Cluster](#11-redis-cluster)
12. [Redis Sentinel](#12-redis-sentinel)
13. [Persistence — RDB vs AOF](#13-persistence--rdb-vs-aof)
14. [Pipelines and Transactions](#14-pipelines-and-transactions)
15. [Common Node.js Patterns with ioredis](#15-common-nodejs-patterns-with-ioredis)
16. [Common Interview Questions](#16-common-interview-questions)

---

## 1. What Redis Is

```text
Redis = Remote Dictionary Server

An in-memory data structure store used as:
  - Cache (primary use case)
  - Message broker (pub/sub, streams)
  - Session store
  - Leaderboard / rate limiter
  - Distributed lock manager

Key properties:
  - In-memory → microsecond latency (sub-millisecond reads)
  - Single-threaded command execution → no race conditions on individual commands
  - Optionally persistent (RDB snapshots, AOF log)
  - Rich data structures beyond simple key-value
  - Atomic operations on individual commands

Single-threaded does NOT mean slow:
  Redis processes ~100,000 ops/sec on commodity hardware because:
    1. All ops are in-memory (no disk I/O on the hot path)
    2. Non-blocking I/O via epoll/kqueue (multiplexed networking)
    3. No lock contention — one command at a time per CPU core

Redis 6+ added I/O threading (for network reads/writes) while keeping
command execution single-threaded. So "single-threaded" refers to the
command processing pipeline, not the entire server.
```

### Persistence options

```text
Redis has three durability modes:

1. No persistence (default in some configs)
   - Pure cache — data lost on restart
   - Maximum performance

2. RDB (Redis Database) — point-in-time snapshots
   - Redis forks a child process to write a binary snapshot to disk
   - Configurable: "save 900 1" means snapshot if 1 key changed in 900s
   - Compact, fast to restore, small file size
   - Downside: you lose writes between the last snapshot and crash

3. AOF (Append Only File) — write-ahead log
   - Every write command is appended to a log file
   - On restart, Redis replays the log to rebuild state
   - fsync policies: always | everysec | no
     - always: safest, slowest (fsync on every write)
     - everysec: good tradeoff (at most 1 second of data loss)
     - no: fastest, OS decides when to flush
   - AOF rewrite: Redis compacts the log periodically (BGREWRITEAOF)

4. RDB + AOF together
   - Best durability — AOF used for recovery, RDB for fast backups
   - Redis 7+ has a unified "RDB-AOF" hybrid format
```

---

## 2. Redis Data Structures

```text
Redis keys are always strings. Values can be one of many types.
Each type has O(1) to O(n) commands — know the complexity.
TTL (time-to-live) can be set on any key with EXPIRE or in-command options.
```

### String

```js
// The simplest type — a byte string (up to 512MB).
// Used for: counters, cached JSON blobs, feature flags, simple values.

const Redis = require('ioredis');
const redis = new Redis(); // connects to localhost:6379 by default

// Basic get/set
await redis.set('user:1:name', 'Alice');
const name = await redis.get('user:1:name'); // 'Alice'

// SET with TTL in one atomic command (always prefer this over SET + EXPIRE)
await redis.set('session:abc123', JSON.stringify({ userId: 1 }), 'EX', 3600);
// EX = seconds, PX = milliseconds

// SETNX = "SET if Not eXists" — only set if key does not exist
// Used for distributed locks, idempotent operations
const wasSet = await redis.setnx('lock:resource', '1'); // 1 = set, 0 = already exists
// Modern equivalent: SET key value NX EX seconds (atomic)
await redis.set('lock:resource', '1', 'NX', 'EX', 30);

// Atomic increment/decrement — no need for read-modify-write
await redis.set('page:views', 0);
await redis.incr('page:views');        // → 1
await redis.incrby('page:views', 5);   // → 6
await redis.decr('page:views');        // → 5
await redis.incrbyfloat('price', 1.5); // works with floats too

// GETSET — get old value and set new in one command (atomic)
const old = await redis.getset('counter', '0'); // returns old, sets to '0'

// MSET/MGET — bulk operations (more efficient than N individual calls)
await redis.mset('a', '1', 'b', '2', 'c', '3');
const vals = await redis.mget('a', 'b', 'c'); // ['1', '2', '3']

// Check TTL
await redis.ttl('session:abc123'); // remaining seconds, -1 = no TTL, -2 = key gone
await redis.pttl('session:abc123'); // same but in milliseconds
```

### Hash

```js
// A hash is a map of field → value stored under one key.
// Perfect for storing objects — avoids JSON serialization overhead,
// allows updating individual fields without fetching the whole object.
// Memory-efficient for small hashes (Redis uses ziplist encoding internally).

// Store a user object
await redis.hset('user:1', 'name', 'Alice', 'email', 'alice@example.com', 'age', '30');

// Get a single field
const email = await redis.hget('user:1', 'email'); // 'alice@example.com'

// Get all fields as a flat array ['name', 'Alice', 'email', 'alice@example.com', ...]
const flat = await redis.hgetall('user:1');
// ioredis returns an object: { name: 'Alice', email: 'alice@example.com', age: '30' }

// Update one field without touching others
await redis.hset('user:1', 'age', '31');

// Delete a field
await redis.hdel('user:1', 'age');

// Check if a field exists
const exists = await redis.hexists('user:1', 'email'); // 1 or 0

// Increment a numeric field atomically
await redis.hset('product:1', 'stock', '100');
await redis.hincrby('product:1', 'stock', -1); // atomic decrement → 99

// Get all keys or all values
const keys = await redis.hkeys('user:1');   // ['name', 'email']
const vals = await redis.hvals('user:1');   // ['Alice', 'alice@example.com']
const len  = await redis.hlen('user:1');    // 2

// When to use Hash vs String(JSON):
//   Hash  → you need to read/update individual fields frequently
//   JSON  → you always read/write the whole object, or need complex nested structure
```

### List

```js
// A doubly-linked list of strings.
// O(1) push/pop from both ends, O(n) random access.
// Used for: queues (FIFO), stacks (LIFO), activity feeds, recent items.

// LPUSH = push to LEFT (head), RPUSH = push to RIGHT (tail)
await redis.rpush('queue:emails', 'email:1', 'email:2', 'email:3');
// List is now: [email:1, email:2, email:3] (left to right)

await redis.lpush('stack:undo', 'action:1');
await redis.lpush('stack:undo', 'action:2');
// Stack is now: [action:2, action:1]

// POP from left or right
const next = await redis.lpop('queue:emails'); // 'email:1' — FIFO dequeue
const top  = await redis.lpop('stack:undo');   // 'action:2' — LIFO pop

// BLPOP — BLOCKING pop: waits until an item is available (useful for workers)
// Second arg is timeout in seconds (0 = wait forever)
const [listName, value] = await redis.blpop('queue:emails', 5);
// Blocks up to 5 seconds; returns null if timeout

// LRANGE — get a range of elements (0-indexed, -1 = last element)
await redis.rpush('feed:user:1', 'post:3', 'post:2', 'post:1');
const recent = await redis.lrange('feed:user:1', 0, 9);  // first 10 items
const all    = await redis.lrange('feed:user:1', 0, -1); // all items

// Keep only the last N items (trim a list — useful for bounded feeds)
await redis.ltrim('feed:user:1', 0, 99); // keep only 100 most recent

// LLEN — length
const len = await redis.llen('queue:emails');

// LINDEX — get element at index (O(n) — avoid for large lists)
const first = await redis.lindex('feed:user:1', 0);

// Pattern: simple job queue
async function enqueue(job) {
  await redis.rpush('jobs', JSON.stringify(job));
}
async function dequeue() {
  const raw = await redis.lpop('jobs');
  return raw ? JSON.parse(raw) : null;
}
```

### Set

```js
// An unordered collection of unique strings.
// O(1) add/remove/lookup, O(n) for iteration and set operations.
// Used for: unique tags, friend lists, "who liked this", deduplication.

// Add members
await redis.sadd('tags:post:1', 'javascript', 'redis', 'caching');
await redis.sadd('tags:post:2', 'redis', 'database', 'nosql');

// Check membership — O(1)
const isMember = await redis.sismember('tags:post:1', 'redis'); // 1

// Get all members (unordered)
const tags = await redis.smembers('tags:post:1'); // ['javascript', 'redis', 'caching']

// Count members
const count = await redis.scard('tags:post:1'); // 3

// Remove a member
await redis.srem('tags:post:1', 'caching');

// Set operations — great for social graphs, recommendations
const union  = await redis.sunion('tags:post:1', 'tags:post:2');  // all tags from both
const inter  = await redis.sinter('tags:post:1', 'tags:post:2');  // tags in BOTH posts → ['redis']
const diff   = await redis.sdiff('tags:post:1', 'tags:post:2');   // in post:1 but NOT post:2

// Store result of set operation as a new key
await redis.sunionstore('tags:all', 'tags:post:1', 'tags:post:2');

// Random member — useful for sampling, random recommendations
const random = await redis.srandmember('tags:post:1');             // one random
const sample = await redis.srandmember('tags:post:1', 3);          // 3 random (no repeat)
const withReplace = await redis.srandmember('tags:post:1', -3);    // 3 random (may repeat)

// Pattern: track who has seen a notification (deduplication)
await redis.sadd(`notif:${notifId}:seen`, userId);
const alreadySeen = await redis.sismember(`notif:${notifId}:seen`, userId);
```

### Sorted Set

```js
// A set where every member has a floating-point score.
// Members are unique; scores determine sort order.
// O(log n) for most operations.
// Used for: leaderboards, priority queues, rate limiting (sliding window), time-series indexes.

// ZADD key score member [score member ...]
await redis.zadd('leaderboard', 1500, 'alice', 750, 'bob', 2000, 'charlie');

// ZRANGE — get members by rank (0 = lowest score)
const bottom = await redis.zrange('leaderboard', 0, -1);            // all, ascending
const top    = await redis.zrange('leaderboard', 0, -1, 'REV');     // descending (Redis 6.2+)
// Older alternative: ZREVRANGE (deprecated in Redis 6.2)
const topOld = await redis.zrevrange('leaderboard', 0, 2);          // top 3, descending

// WITHSCORES — include scores in result
const withScores = await redis.zrange('leaderboard', 0, -1, 'WITHSCORES');
// ['bob', '750', 'alice', '1500', 'charlie', '2000']

// ZRANK — get rank of a member (0-indexed, ascending)
const rank = await redis.zrank('leaderboard', 'alice'); // 1 (0=bob, 1=alice, 2=charlie)
const revRank = await redis.zrevrank('leaderboard', 'charlie'); // 0 (highest score = rank 0)

// ZSCORE — get a member's score
const score = await redis.zscore('leaderboard', 'alice'); // '1500'

// ZINCRBY — atomically increment a score
await redis.zincrby('leaderboard', 100, 'alice'); // alice now has 1600

// ZRANGEBYSCORE — get members within a score range
const midTier = await redis.zrangebyscore('leaderboard', 1000, 2000);
// -inf and +inf are valid boundaries
const all = await redis.zrangebyscore('leaderboard', '-inf', '+inf');

// ZCARD — count members
const total = await redis.zcard('leaderboard');

// ZREM — remove a member
await redis.zrem('leaderboard', 'bob');

// Pattern: leaderboard with pagination
async function getLeaderboard(page = 0, pageSize = 10) {
  const start = page * pageSize;
  const end   = start + pageSize - 1;
  // zrevrange: highest score first
  const members = await redis.zrevrange('leaderboard', start, end, 'WITHSCORES');
  // Parse into [{member, score, rank}]
  const result = [];
  for (let i = 0; i < members.length; i += 2) {
    result.push({
      rank:   start + Math.floor(i / 2) + 1,
      member: members[i],
      score:  parseFloat(members[i + 1]),
    });
  }
  return result;
}
```

### HyperLogLog

```js
// A probabilistic data structure for counting unique elements.
// Uses ~12KB of memory regardless of the number of distinct elements.
// Error rate: ~0.81% — acceptable for analytics.
// Used for: unique visitor counts, unique search queries, cardinality estimation.

// PFADD — add elements (returns 1 if internal representation changed)
await redis.pfadd('uv:2024-01-15', 'user:1', 'user:2', 'user:3');
await redis.pfadd('uv:2024-01-15', 'user:1'); // already seen, no change → returns 0

// PFCOUNT — approximate count of unique elements
const uniqueVisitors = await redis.pfcount('uv:2024-01-15'); // ~3

// PFCOUNT across multiple keys — union count
await redis.pfadd('uv:2024-01-16', 'user:2', 'user:4');
const weeklyUnique = await redis.pfcount('uv:2024-01-15', 'uv:2024-01-16'); // ~4 (user:1,2,3,4)

// PFMERGE — merge multiple HyperLogLogs into one
await redis.pfmerge('uv:week', 'uv:2024-01-15', 'uv:2024-01-16');
const weekCount = await redis.pfcount('uv:week'); // ~4

// Why use HyperLogLog instead of a Set?
//   Set with 1 million unique IDs → ~50MB+
//   HyperLogLog with 1 million unique IDs → 12KB
//   If exact count is not required, HyperLogLog wins decisively.
```

### Streams

```js
// A persistent, append-only log of messages (like Kafka, but simpler).
// Each entry has an auto-generated ID (timestamp-sequence) and fields.
// Supports consumer groups for distributed processing.
// Used for: event sourcing, audit logs, activity streams, lightweight message queues.

// XADD — append an entry; '*' = auto-generate ID
const id = await redis.xadd('events', '*', 'type', 'click', 'userId', '42', 'page', '/home');
// id looks like: '1705344000000-0' (ms-sequence)

// XLEN — number of entries
const len = await redis.xlen('events');

// XREAD — read entries (non-blocking)
// COUNT limits entries per stream, '0' = from beginning
const entries = await redis.xread('COUNT', 10, 'STREAMS', 'events', '0');
// entries = [['events', [['id1', ['type', 'click', ...]], ...]]]

// XREAD from a specific ID onward (for resuming after a cursor)
const newEntries = await redis.xread('COUNT', 10, 'STREAMS', 'events', lastSeenId);

// XRANGE — read a range by ID
const range = await redis.xrange('events', '-', '+'); // all entries
const recent = await redis.xrange('events', '1705344000000-0', '+', 'COUNT', 100);

// XLEN and XTRIM — keep stream bounded
await redis.xtrim('events', 'MAXLEN', '~', 10000); // ~ = approximate trim (faster)

// Consumer groups — allows multiple workers to share a stream
await redis.xgroup('CREATE', 'events', 'workers', '$', 'MKSTREAM');
// '$' = start from new messages only; '0' = from beginning

// XREADGROUP — read as a group member
const msgs = await redis.xreadgroup('GROUP', 'workers', 'worker-1', 'COUNT', 10, 'STREAMS', 'events', '>');
// '>' = undelivered messages; specific ID = re-read pending

// XACK — acknowledge processing (removes from pending list)
await redis.xack('events', 'workers', id);

// Streams vs Pub/Sub:
//   Streams: persistent, consumers can replay, supports consumer groups, ack-based
//   Pub/Sub: ephemeral, message lost if no subscriber, fire-and-forget
```

### Bitmap

```js
// Bitmaps are not a distinct type — they use Strings with bit-level operations.
// Each bit represents a boolean for a user/item by their integer ID.
// Memory: 100 million users = ~12.5MB. Extremely compact.
// Used for: daily active users, feature flags, user cohort tracking.

// SETBIT key offset value (value must be 0 or 1)
// Track which users were active on 2024-01-15
const userId = 42;
await redis.setbit('active:2024-01-15', userId, 1); // user 42 was active
await redis.setbit('active:2024-01-15', 99, 1);     // user 99 was active

// GETBIT — check if a user was active
const wasActive = await redis.getbit('active:2024-01-15', userId); // 1

// BITCOUNT — count the number of set bits (= number of active users)
const dailyActives = await redis.bitcount('active:2024-01-15'); // 2

// BITCOUNT with byte range (each byte covers 8 users)
// Count users with IDs 0-15 (first 2 bytes = offsets 0-1)
const subset = await redis.bitcount('active:2024-01-15', 0, 1);

// BITOP — bitwise operations across multiple bitmaps
// Users active on BOTH days (AND)
await redis.bitop('AND', 'active:both', 'active:2024-01-15', 'active:2024-01-16');
// Users active on EITHER day (OR)
await redis.bitop('OR', 'active:either', 'active:2024-01-15', 'active:2024-01-16');

// Pattern: check if a user completed an onboarding step
// Steps: 0=email_verified, 1=profile_filled, 2=first_post
await redis.setbit(`onboarding:${userId}`, 1, 1); // completed profile_filled
const completed = await redis.getbit(`onboarding:${userId}`, 1); // 1
```

---

## 3. Caching Patterns

```text
There is no universally "best" pattern. The right choice depends on:
  - Read vs write ratio
  - Tolerance for stale data
  - Consistency requirements
  - Who owns the cache-population logic
```

### Cache-Aside (Lazy Loading)

```js
// Most common pattern. Application code manages the cache explicitly.
//
// Read flow:
//   1. Check cache
//   2. On HIT  → return cached value
//   3. On MISS → read from DB → write to cache → return value
//
// Write flow:
//   Option A: invalidate the cache key (safest)
//   Option B: update the cache key (risky — race conditions)
//
// Pros:
//   - Only caches what is actually requested (no wasted memory)
//   - Cache failure is non-fatal — app falls back to DB
//   - Good read performance after warm-up
//
// Cons:
//   - First request after miss is slow (cold start latency)
//   - Risk of stale data if DB is updated without invalidating cache
//   - Each miss hits the DB (stampede risk under high load)

async function getUser(userId) {
  const cacheKey = `user:${userId}`;

  // Step 1: Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached); // HIT
  }

  // Step 2: Cache MISS — fetch from DB
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  // Step 3: Write to cache with TTL
  await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600); // 1 hour TTL

  return user;
}

// On write: invalidate the cache (safer than updating it)
async function updateUser(userId, data) {
  await db.query('UPDATE users SET ? WHERE id = ?', [data, userId]);
  await redis.del(`user:${userId}`); // invalidate — next read will repopulate
}
```

### Write-Through

```js
// Write to cache AND DB synchronously on every write.
//
// Read flow: same as cache-aside (check cache first)
// Write flow: write cache → write DB (or DB → cache) atomically from app's perspective
//
// Pros:
//   - Cache is always up-to-date — no stale reads
//   - Read hits are high after the first write
//
// Cons:
//   - Write latency is higher (two writes per operation)
//   - Wastes cache space — items may be written but never read
//   - If DB write fails after cache write, data is inconsistent

async function writeThrough(userId, data) {
  // Write to DB first (source of truth)
  await db.query('UPDATE users SET ? WHERE id = ?', [data, userId]);

  // Then update cache — keep them in sync
  const cacheKey = `user:${userId}`;
  await redis.set(cacheKey, JSON.stringify({ ...data, id: userId }), 'EX', 3600);
}

async function readWithCache(userId) {
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (user) await redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 3600);
  return user;
}
```

### Write-Behind (Write-Back)

```js
// Write to cache immediately; DB write is deferred (async).
// High write throughput — cache absorbs bursts, DB is updated in batches.
//
// Pros:
//   - Very low write latency (just a cache write)
//   - DB write batching reduces load
//
// Cons:
//   - Data loss risk — if Redis crashes before async write, DB is out of date
//   - More complex: need a reliable background job for flushing
//   - Not suitable for financial or critical data
//
// Implementation sketch:
//   1. Write to Redis (with a "dirty" marker or a write queue)
//   2. Background worker flushes dirty keys to DB periodically

async function writeBehind(userId, data) {
  const cacheKey = `user:${userId}`;

  // Write to cache immediately
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 3600);

  // Push to a write queue for async DB flush
  await redis.rpush('write-queue', JSON.stringify({ type: 'user', id: userId, data }));
}

// Background flusher (runs in a worker process)
async function flushWorker() {
  while (true) {
    const raw = await redis.blpop('write-queue', 1); // blocking pop, 1s timeout
    if (!raw) continue;
    const { type, id, data } = JSON.parse(raw[1]);
    if (type === 'user') {
      await db.query('UPDATE users SET ? WHERE id = ?', [data, id]);
    }
  }
}
```

### Read-Through

```js
// The cache itself is responsible for fetching from the DB on a miss.
// Application always talks to the cache layer only.
// In practice: implemented by a caching library or proxy (e.g., AWS ElastiCache DAX for DynamoDB).
//
// Difference from cache-aside:
//   Cache-aside: app knows about both cache AND DB
//   Read-through: app only talks to cache; cache handles the DB call
//
// In Node.js, you simulate this by wrapping Redis in an abstraction:

class ReadThroughCache {
  constructor(redis, db) {
    this.redis = redis;
    this.db = db;
  }

  async get(key, fetchFn, ttl = 3600) {
    // The caller provides fetchFn — cache calls it on a miss
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    // Miss: delegate fetch to the provided function (DB query)
    const value = await fetchFn();
    if (value != null) {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    }
    return value;
  }
}

const cache = new ReadThroughCache(redis, db);

// App code — no knowledge of DB fetch logic here
const user = await cache.get(
  `user:${userId}`,
  () => db.query('SELECT * FROM users WHERE id = ?', [userId]),
  3600
);
```

### Refresh-Ahead

```js
// Proactively refresh cache entries before they expire.
// Prevents cold-start latency on popular/expensive keys.
//
// Strategy: when TTL falls below a threshold, trigger a background refresh
// so the next requester still gets a cached value.

async function refreshAhead(key, fetchFn, ttl = 3600, refreshThreshold = 300) {
  const cached = await redis.get(key);

  if (cached) {
    const remaining = await redis.ttl(key);

    // If TTL is low, refresh in the background (non-blocking)
    if (remaining > 0 && remaining < refreshThreshold) {
      setImmediate(async () => {
        try {
          const fresh = await fetchFn();
          await redis.set(key, JSON.stringify(fresh), 'EX', ttl);
        } catch (err) {
          console.error('Refresh-ahead failed:', err);
        }
      });
    }

    return JSON.parse(cached); // return current cached value immediately
  }

  // Cold miss — fetch synchronously
  const value = await fetchFn();
  if (value != null) {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  }
  return value;
}
```

---

## 4. Cache Invalidation Strategies

```text
Cache invalidation is one of the two hard problems in computer science.
The wrong strategy leads to: stale data, phantom reads, or unnecessary DB load.
```

### TTL-Based Expiry

```js
// Simplest strategy — let keys expire automatically after a fixed time.
// Accept eventual consistency: data may be stale for up to TTL seconds.
//
// Good for: user profiles, product listings, recommendation results, anything
//           where stale-for-N-seconds is acceptable.
//
// Choose TTL based on:
//   - How frequently the underlying data changes
//   - How harmful stale data is
//   - Cache hit rate you need

await redis.set('product:123', JSON.stringify(product), 'EX', 300); // stale up to 5 min

// Sliding TTL (reset on access) — keeps hot keys alive, cold keys expire
async function getWithSlidingTTL(key, fetchFn, ttl = 3600) {
  const cached = await redis.get(key);
  if (cached) {
    await redis.expire(key, ttl); // reset TTL on every access
    return JSON.parse(cached);
  }
  const value = await fetchFn();
  if (value != null) await redis.set(key, JSON.stringify(value), 'EX', ttl);
  return value;
}
```

### Event-Driven Invalidation

```js
// Invalidate (or update) cache entries when the underlying data changes.
// More precise than TTL — eliminates stale data immediately on write.
//
// Implementation options:
//   1. App-level: invalidate in the write path (most common)
//   2. DB triggers / change data capture (CDC): Debezium, MySQL binlog
//   3. Message queue: publish "user.updated" event → consumer invalidates cache

// App-level invalidation on write
async function updateProduct(productId, data) {
  await db.query('UPDATE products SET ? WHERE id = ?', [data, productId]);

  // Invalidate all keys related to this product
  await redis.del(`product:${productId}`);
  await redis.del(`product:${productId}:reviews`);
  // Also invalidate any list/search results that may contain this product:
  await redis.del('products:featured');
}

// Pattern: publish invalidation event for other services
async function updateUserWithEvent(userId, data) {
  await db.query('UPDATE users SET ? WHERE id = ?', [data, userId]);
  await redis.publish('cache:invalidate', JSON.stringify({ type: 'user', id: userId }));
}

// Other services subscribe and invalidate their local caches
redis.subscribe('cache:invalidate', (err) => {
  if (err) throw err;
});
redis.on('message', (channel, message) => {
  const { type, id } = JSON.parse(message);
  if (type === 'user') {
    redis.del(`user:${id}`);
  }
});
```

### Cache Tags (Tag-Based Invalidation)

```js
// Associate cache keys with logical "tags".
// When data changes, invalidate all keys with the matching tag.
// Redis does not have built-in tag support — implement with Sets.

// Store a cache entry AND register its key under a tag
async function setWithTag(key, value, tag, ttl = 3600) {
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
  await redis.sadd(`tag:${tag}`, key);            // register key under tag
  await redis.expire(`tag:${tag}`, ttl + 60);     // tag set should outlive entries
}

// Invalidate all keys with a given tag
async function invalidateTag(tag) {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys);         // delete all tagged cache entries
  }
  await redis.del(`tag:${tag}`);     // clean up the tag set itself
}

// Usage
await setWithTag('user:1:profile', userData, 'user:1');
await setWithTag('user:1:posts',   postsData,  'user:1');

// When user 1 is updated, nuke all their cached data at once
await invalidateTag('user:1');
```

### Version Keys

```js
// Append a version number to every cache key for a resource.
// "Invalidation" = incrementing the version (old keys become orphaned).
// Old keys expire via TTL — no explicit delete needed.
//
// Pros: atomic, no race conditions, no complex invalidation logic.
// Cons: orphaned keys consume memory until TTL expires.

async function getUserCacheKey(userId) {
  // Version stored in Redis; incrementing it "invalidates" all old keys
  const version = await redis.get(`user:${userId}:version`) || '1';
  return `user:${userId}:v${version}`;
}

async function getCachedUser(userId) {
  const key = await getUserCacheKey(userId);
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  await redis.set(key, JSON.stringify(user), 'EX', 3600);
  return user;
}

// "Invalidate" by incrementing the version — old key becomes unreachable
async function invalidateUser(userId) {
  await redis.incr(`user:${userId}:version`);
  // The old `user:${userId}:v1` key still exists but will never be hit again
  // It will expire on its own TTL
}
```

---

## 5. Cache Eviction Policies

```text
When Redis reaches maxmemory limit, it must evict keys to make room for new ones.
Configure with:
  maxmemory 256mb          ← set memory limit
  maxmemory-policy allkeys-lru  ← eviction policy

8 eviction policies:
```

```js
// 1. noeviction (default if maxmemory not set)
//    - Returns error on write when memory is full
//    - Use when: Redis is your primary data store, NOT a cache
//    - Risk: application errors under memory pressure

// 2. allkeys-lru  ← most popular for caching
//    - Evicts LEAST RECENTLY USED key from ALL keys
//    - Use when: you want Redis to auto-manage cache size; hot keys stay, cold keys go
//    - Approximation: Redis samples N keys (default 5) and evicts the least recently used

// 3. volatile-lru
//    - Evicts LRU key from keys WITH an expiry set (volatile = has TTL)
//    - Keys without TTL are never evicted — safe for mixing persistent + cache data
//    - Use when: some keys must never be evicted (e.g., session data with no TTL)

// 4. allkeys-lfu  (Redis 4.0+)
//    - Evicts LEAST FREQUENTLY USED key from ALL keys
//    - LFU tracks access frequency, not just recency
//    - Better than LRU when: access patterns have long-lived hot keys
//      (e.g., a product that's popular for weeks, not just recently)

// 5. volatile-lfu
//    - Evicts LFU key from keys WITH an expiry set

// 6. allkeys-random
//    - Evicts a random key from ALL keys
//    - Use when: all keys have uniform access patterns (rare in practice)

// 7. volatile-random
//    - Evicts a random key from keys with TTL

// 8. volatile-ttl
//    - Evicts the key with the SHORTEST remaining TTL (soonest to expire)
//    - Use when: you have fine-grained control over TTLs and want to evict
//      "least valuable" (shortest-lived) keys first

// Summary table:
//
//   Policy            | Key scope      | Algorithm | Use case
//   ------------------|----------------|-----------|---------------------------
//   noeviction        | all            | none      | Primary DB, never a cache
//   allkeys-lru       | all            | LRU       | General-purpose cache ✓
//   volatile-lru      | has TTL        | LRU       | Mixed persistent + cache
//   allkeys-lfu       | all            | LFU       | Long-lived hot key workloads
//   volatile-lfu      | has TTL        | LFU       | Same but mixed storage
//   allkeys-random    | all            | random    | Uniform access (rare)
//   volatile-random   | has TTL        | random    | —
//   volatile-ttl      | has TTL        | min TTL   | Controlled TTL-based priority

// Check current memory usage and eviction stats
// redis-cli> INFO memory
// redis-cli> INFO stats  ← look for evicted_keys
```

---

## 6. Cache Stampede (Thundering Herd)

```text
The problem:
  1. A popular cache key expires (or is deleted)
  2. At that exact moment, hundreds of requests arrive simultaneously
  3. ALL of them get a cache MISS
  4. ALL of them hit the DB at once
  5. DB is overwhelmed; it may crash or be severely degraded
  6. All pending requests wait for the DB → user-facing latency spike

This is a "thundering herd" — a sudden surge of DB load from cache misses.
```

### Solution 1: Mutex Lock (Prevent Parallel DB Fetches)

```js
// Only ONE request fetches from DB; all others wait for that result.
// Implemented with a Redis lock: the first requester acquires the lock,
// fetches from DB, writes to cache, releases the lock.
// Others poll (or wait) until the cache is populated.

async function getWithMutex(key, fetchFn, ttl = 3600) {
  // Try to get from cache first
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const lockKey = `lock:${key}`;

  // Try to acquire lock: SET NX EX is atomic
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 10); // 10s lock TTL

  if (acquired) {
    // This process won the lock — fetch from DB
    try {
      const value = await fetchFn();
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
      return value;
    } finally {
      await redis.del(lockKey); // always release the lock
    }
  } else {
    // Another process is fetching — wait and retry
    await new Promise(resolve => setTimeout(resolve, 50));
    return getWithMutex(key, fetchFn, ttl); // retry (cache should be warm now)
  }
}
```

### Solution 2: Probabilistic Early Expiry (PER)

```js
// Instead of a hard TTL, each request has a small probability of treating
// the key as "expired" BEFORE it actually expires.
// The probability increases as TTL approaches 0.
// Result: cache is refreshed slightly before expiry — stampede never happens.
//
// Formula: key is considered expired if:
//   currentTime - beta * delta * ln(random()) > expireTime
//
// beta: tuning factor (typically 1.0)
// delta: time to recompute the value (measured during last fetch)

async function getWithPER(key, fetchFn, ttl = 3600, beta = 1.0) {
  const raw = await redis.get(key);

  if (raw) {
    const { value, expiry, delta } = JSON.parse(raw);
    const now = Date.now() / 1000; // seconds

    // PER formula: should we early-refresh?
    const shouldRefresh = now - beta * delta * Math.log(Math.random()) > expiry;

    if (!shouldRefresh) {
      return value; // still valid — return cached value
    }
    // Fall through to refresh (this request proactively refreshes)
  }

  // Fetch and store with timing info
  const start = Date.now();
  const value = await fetchFn();
  const delta = (Date.now() - start) / 1000; // how long DB fetch took, in seconds
  const expiry = Date.now() / 1000 + ttl;

  await redis.set(key, JSON.stringify({ value, expiry, delta }), 'EX', ttl + Math.ceil(delta * beta * 5));
  return value;
}
```

### Solution 3: Background Refresh (Stale-While-Revalidate)

```js
// Serve the stale value immediately; refresh in the background.
// User gets fast response; next user gets the fresh value.
// Conceptually identical to HTTP's stale-while-revalidate Cache-Control directive.

const refreshing = new Set(); // in-process deduplication

async function getStaleWhileRevalidate(key, fetchFn, ttl = 3600, staleTTL = 60) {
  const cached = await redis.get(key);
  const remaining = await redis.ttl(key);

  if (cached) {
    // If TTL is low and we're not already refreshing, trigger background refresh
    if (remaining < staleTTL && !refreshing.has(key)) {
      refreshing.add(key);
      setImmediate(async () => {
        try {
          const fresh = await fetchFn();
          await redis.set(key, JSON.stringify(fresh), 'EX', ttl);
        } finally {
          refreshing.delete(key);
        }
      });
    }
    return JSON.parse(cached); // return stale value immediately
  }

  // Cold miss — synchronous fetch
  const value = await fetchFn();
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
  return value;
}
```

---

## 7. Session Storage with Redis

```js
// Redis is the standard session store for Node.js at scale.
// Why not in-memory (default)?
//   - Server restarts lose all sessions
//   - Multiple server instances can't share session state (sticky sessions needed)
//   - Redis solves both: persistent, shareable across instances

// Install: npm install express-session connect-redis ioredis

const express      = require('express');
const session      = require('express-session');
const { createClient } = require('redis');
// connect-redis v7+ uses the official 'redis' client; for ioredis use wrapper

// Using ioredis with connect-redis
const RedisStore   = require('connect-redis').default;
const Redis        = require('ioredis');
const redisClient  = new Redis({ host: 'localhost', port: 6379 });

const app = express();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET, // used to sign the session ID cookie
  resave: false,            // don't save session if it wasn't modified
  saveUninitialized: false, // don't create session for unauthenticated users
  cookie: {
    secure:   process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,          // inaccessible to JS (XSS protection)
    maxAge:   1000 * 60 * 60 * 24, // 24 hours in ms
    sameSite: 'lax',         // CSRF protection
  },
  // Session key in Redis: "sess:<sessionId>"
  // connect-redis automatically handles serialization and TTL
}));

// Usage in a route
app.post('/login', async (req, res) => {
  const user = await authenticateUser(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId   = user.id;
  req.session.userRole = user.role;

  // Manually save session (normally auto-saved at end of request)
  req.session.save(err => {
    if (err) return res.status(500).json({ error: 'Session error' });
    res.json({ message: 'Logged in' });
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// Sliding expiry — reset TTL on each request to keep active sessions alive
app.use((req, res, next) => {
  if (req.session.userId) {
    req.session.touch(); // resets the TTL to maxAge
  }
  next();
});

// What Redis stores:
//   Key:   sess:s%3AaB3kL9...   (URL-encoded session ID)
//   Value: {"userId":1,"userRole":"admin","cookie":{...}}
//   TTL:   86400 seconds (maxAge)
```

---

## 8. Rate Limiting Patterns

```text
Goal: limit requests to N per window W per identifier (IP, user ID, API key).

Four main algorithms:
  1. Fixed Window Counter   — simple, but has burst problem at window boundary
  2. Sliding Window Log     — precise, but memory-intensive
  3. Sliding Window Counter — good balance; approximation of sliding log
  4. Token Bucket           — allows bursts up to bucket size; smooth refill
```

### Fixed Window Counter

```js
// Simple increment in a time-bucketed key.
// Problem: a user can make 2x the limit in a short burst straddling the boundary.
//   (e.g., 100 at :59 + 100 at :01 = 200 in 2 seconds)

async function fixedWindowRateLimit(identifier, limit = 100, windowSec = 60) {
  const now    = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSec); // current window number
  const key    = `ratelimit:fw:${identifier}:${window}`;

  const count = await redis.incr(key);

  // Set TTL only on first increment (avoid overwriting)
  if (count === 1) {
    await redis.expire(key, windowSec * 2); // 2x window so key outlives its period
  }

  return {
    allowed:   count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt:   (window + 1) * windowSec, // Unix timestamp of next window
  };
}
```

### Sliding Window Log

```js
// Store a timestamp for every request in a Sorted Set.
// Score = timestamp; remove entries older than the window.
// Precise — but every request stores a set entry → memory scales with traffic.

async function slidingWindowLog(identifier, limit = 100, windowMs = 60000) {
  const now      = Date.now();
  const windowStart = now - windowMs;
  const key      = `ratelimit:swl:${identifier}`;

  // Pipeline: remove old entries + add current + count — all atomic-ish
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, '-inf', windowStart); // remove expired
  pipeline.zadd(key, now, `${now}-${Math.random()}`); // add current request
  pipeline.zcard(key);                                  // count remaining
  pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);
  const results = await pipeline.exec();

  const count = results[2][1]; // zcard result

  return {
    allowed:   count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
```

### Sliding Window Counter (Recommended)

```js
// Approximation using two fixed-window buckets + weighted interpolation.
// Memory: O(1) per identifier (just two counters).
// Accuracy: ~0.1% error rate — acceptable for most rate limiters.
//
// Formula:
//   estimated = prevCount * (1 - elapsedFraction) + currCount

async function slidingWindowCounter(identifier, limit = 100, windowSec = 60) {
  const now          = Math.floor(Date.now() / 1000);
  const currWindow   = Math.floor(now / windowSec);
  const prevWindow   = currWindow - 1;
  const currKey      = `ratelimit:swc:${identifier}:${currWindow}`;
  const prevKey      = `ratelimit:swc:${identifier}:${prevWindow}`;

  const [prevCountRaw, currCountRaw] = await redis.mget(prevKey, currKey);
  const prevCount = parseInt(prevCountRaw || '0', 10);
  const currCount = parseInt(currCountRaw || '0', 10);

  // How far into the current window are we? (0.0 = start, 1.0 = end)
  const elapsedFraction = (now % windowSec) / windowSec;

  // Weighted estimate of requests in the last full window
  const estimated = prevCount * (1 - elapsedFraction) + currCount;

  if (estimated >= limit) {
    return { allowed: false, remaining: 0, estimated: Math.floor(estimated) };
  }

  // Increment current window counter
  const newCount = await redis.incr(currKey);
  if (newCount === 1) await redis.expire(currKey, windowSec * 2);

  return {
    allowed:   true,
    remaining: Math.floor(limit - estimated - 1),
    estimated: Math.floor(estimated),
  };
}
```

### Full Rate Limiter with Sorted Sets (Sliding Window Log, Production-Ready)

```js
// Uses a Lua script for atomicity — all operations in one round-trip.
// Lua scripts in Redis are atomic — no interleaving possible.

const rateLimitScript = `
  local key        = KEYS[1]
  local now        = tonumber(ARGV[1])
  local windowMs   = tonumber(ARGV[2])
  local limit      = tonumber(ARGV[3])
  local requestId  = ARGV[4]
  local windowStart = now - windowMs

  -- Remove expired entries
  redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

  -- Count current requests in window
  local count = redis.call('ZCARD', key)

  if count < limit then
    -- Allow: add this request
    redis.call('ZADD', key, now, requestId)
    redis.call('PEXPIRE', key, windowMs)
    return {1, limit - count - 1}  -- {allowed, remaining}
  else
    return {0, 0}  -- {denied, remaining}
  end
`;

// Load script once and use SHA for subsequent calls (EVALSHA)
let rateLimitScriptSha;
async function loadScript() {
  rateLimitScriptSha = await redis.script('LOAD', rateLimitScript);
}

async function rateLimit(identifier, limit = 100, windowMs = 60000) {
  const key       = `ratelimit:${identifier}`;
  const now       = Date.now();
  const requestId = `${now}-${Math.random()}`;

  const result = await redis.evalsha(
    rateLimitScriptSha,
    1,              // number of KEYS
    key,            // KEYS[1]
    now,            // ARGV[1]
    windowMs,       // ARGV[2]
    limit,          // ARGV[3]
    requestId       // ARGV[4]
  );

  return {
    allowed:   result[0] === 1,
    remaining: result[1],
  };
}

// Express middleware using the rate limiter
function rateLimitMiddleware({ limit = 100, windowMs = 60000 } = {}) {
  return async (req, res, next) => {
    const identifier = req.ip; // or req.user?.id for authenticated users
    const { allowed, remaining } = await rateLimit(identifier, limit, windowMs);

    res.set('X-RateLimit-Limit',     limit);
    res.set('X-RateLimit-Remaining', remaining);

    if (!allowed) {
      return res.status(429).json({ error: 'Too Many Requests' });
    }
    next();
  };
}

app.use('/api/', rateLimitMiddleware({ limit: 100, windowMs: 60000 }));
```

---

## 9. Pub/Sub

```js
// Redis Pub/Sub is a fire-and-forget messaging system.
// Publishers send to a channel; subscribers receive from channels.
// Messages are NOT stored — if no subscriber is listening, the message is lost.
// NOT for reliable messaging — use Streams or a proper queue for that.
//
// Use cases:
//   - Real-time notifications (push to connected WebSocket clients)
//   - Cache invalidation broadcasts across multiple servers
//   - Chat messages (with separate persistence layer)
//   - Live dashboards / scoreboard updates

const Redis = require('ioredis');

// IMPORTANT: A Redis connection used for SUBSCRIBE cannot issue other commands.
// You need separate connections for pub and sub.
const publisher  = new Redis();
const subscriber = new Redis();

// Subscribe to channels
await subscriber.subscribe('notifications', 'updates');

// Receive messages
subscriber.on('message', (channel, message) => {
  console.log(`[${channel}] ${message}`);
  // channel: 'notifications' | 'updates'
  // message: raw string — parse if JSON

  if (channel === 'notifications') {
    const data = JSON.parse(message);
    // emit to connected WebSocket clients, etc.
  }
});

// Publish a message
await publisher.publish('notifications', JSON.stringify({
  type:    'NEW_MESSAGE',
  userId:  42,
  content: 'Hello!',
}));

// Pattern subscriptions (wildcard matching)
await subscriber.psubscribe('user:*:events'); // matches user:1:events, user:42:events, etc.
subscriber.on('pmessage', (pattern, channel, message) => {
  console.log(`Pattern: ${pattern}, Channel: ${channel}, Message: ${message}`);
});

// Unsubscribe
await subscriber.unsubscribe('updates');
await subscriber.punsubscribe('user:*:events');

// Pub/Sub limitations vs Streams:
//
//   Pub/Sub:
//     ✓ Simple API
//     ✓ Low latency
//     ✗ No persistence — missed messages are gone
//     ✗ No consumer groups — every subscriber gets every message
//     ✗ No message acknowledgment
//     ✗ Cannot replay history
//
//   Streams:
//     ✓ Persistent log
//     ✓ Consumer groups with ACK
//     ✓ Replay from any point in time
//     ✓ Backpressure via XREADGROUP blocking
//     ✗ More complex API
```

---

## 10. Distributed Locking

```text
A distributed lock ensures that at most one process performs a critical section
across multiple servers. Essential for: preventing duplicate job execution,
coordinating writes, leader election.
```

### WRONG: SETNX + EXPIRE (Two Commands)

```js
// DO NOT DO THIS — classic mistake.
// SETNX and EXPIRE are two separate commands, NOT atomic.
// If the process crashes between them, the key has no TTL → stuck lock forever.

// BAD CODE — for illustration only
await redis.setnx('lock:job', '1');  // crash here?
await redis.expire('lock:job', 30);  // never runs → lock never expires → deadlock
```

### CORRECT: SET NX EX (Atomic)

```js
// SET with NX (only if not exists) and EX (expiry) is ONE atomic command.
// This is the correct single-node distributed lock implementation.

async function acquireLock(resource, ttlSeconds = 30) {
  // Value should be a unique token — used to verify ownership before release
  const token  = `${Date.now()}-${Math.random()}`; // or use crypto.randomUUID()
  const key    = `lock:${resource}`;

  // SET key value NX EX ttl — returns 'OK' if set, null if already locked
  const result = await redis.set(key, token, 'NX', 'EX', ttlSeconds);
  return result === 'OK' ? token : null; // return token if acquired, null if not
}

// IMPORTANT: only the lock owner should release it.
// Use a Lua script to make GET + DEL atomic (prevent releasing someone else's lock).
const releaseLockScript = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
`;

async function releaseLock(resource, token) {
  const key = `lock:${resource}`;
  const result = await redis.eval(releaseLockScript, 1, key, token);
  return result === 1; // 1 = released, 0 = lock was not ours
}

// High-level usage pattern
async function withLock(resource, fn, ttlSeconds = 30) {
  const token = await acquireLock(resource, ttlSeconds);
  if (!token) throw new Error(`Could not acquire lock for ${resource}`);

  try {
    return await fn();
  } finally {
    await releaseLock(resource, token);
  }
}

// Usage
await withLock('invoice:generate', async () => {
  // Only one process at a time runs this block across all servers
  await generateInvoice(orderId);
});
```

### Redlock — Multi-Node Distributed Lock

```js
// Single-node SET NX EX is NOT sufficient when:
//   - Redis instance crashes after lock is acquired but before it expires
//   - Network partition makes the node unreachable but not dead
//   - You need strong safety guarantees across a Redis cluster
//
// Redlock (by antirez) uses N independent Redis instances (typically 5).
// A lock is valid only if acquired on MAJORITY (N/2 + 1) of instances.
// If Redis node crashes, the lock expires independently on surviving nodes.
//
// Algorithm:
//   1. Get current time in ms (T1)
//   2. Sequentially try to SET NX EX on all N Redis instances
//   3. Lock is acquired if: majority of nodes said OK AND (elapsed time < TTL)
//   4. If not acquired, release on all nodes (cleanup)
//   5. If acquired, effective TTL = original TTL - elapsed

// Install: npm install redlock
const Redlock = require('redlock');

const redlock = new Redlock(
  // Pass multiple independent Redis clients
  [new Redis(6379), new Redis(6380), new Redis(6381)],
  {
    driftFactor:   0.01,  // clock drift compensation factor
    retryCount:    10,    // max retries before giving up
    retryDelay:    200,   // ms between retries
    retryJitter:   200,   // randomize delay to avoid convoy effect
    automaticExtensionThreshold: 500, // auto-extend if still running near expiry
  }
);

// Usage — Redlock handles acquire, auto-extension, and release
async function criticalSection() {
  await using lock = await redlock.acquire(['lock:critical-resource'], 5000); // 5s TTL
  // `await using` (JS explicit resource management) auto-releases on scope exit

  // Do critical work here
  await processJob();
  // Lock auto-released when `lock` goes out of scope
}

// Without `await using` (older style):
async function criticalSectionOld() {
  const lock = await redlock.acquire(['lock:resource'], 5000);
  try {
    await processJob();
  } finally {
    await lock.release();
  }
}
```

---

## 11. Redis Cluster

```text
Redis Cluster = horizontal sharding across multiple Redis nodes.
Used when: single Redis node cannot hold all data in memory, or you need
           throughput beyond a single node's ~100k ops/sec.

Hash Slots:
  - Redis Cluster divides the keyspace into 16,384 hash slots (0–16383)
  - Each key is assigned: CRC16(key) % 16384
  - Each master node owns a range of slots
  - Example (3 masters):
      Node A: slots 0–5460
      Node B: slots 5461–10922
      Node C: slots 10923–16383
  - Each master has 1+ replicas for HA

Hash Tags:
  - {user:1}:profile and {user:1}:posts share the tag {user:1}
  - CRC16 computed on the part inside {}, so both map to the same slot
  - Required for multi-key commands (MGET, pipeline, transactions) to work in cluster mode

Cluster topology:
  Master A ←→ Replica A'
  Master B ←→ Replica B'
  Master C ←→ Replica C'

  All nodes gossip with each other (CLUSTER MEET, heartbeat every 100ms)
  Clients connect to any node; redirected via MOVED/ASK errors
```

```js
// ioredis cluster mode — automatically handles MOVED/ASK redirects
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: '127.0.0.1', port: 7000 },
  { host: '127.0.0.1', port: 7001 },
  { host: '127.0.0.1', port: 7002 },
], {
  scaleReads: 'slave', // read from replicas (eventual consistency)
  // 'master'  = always read from master (strong consistency, more load)
  // 'slave'   = always read from replica
  // 'all'     = round-robin across all nodes
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
  clusterRetryStrategy: (times) => Math.min(times * 100, 3000),
});

// Multi-key commands MUST use hash tags to route to the same slot
await cluster.mset(
  '{user:1}:profile', JSON.stringify(profile),
  '{user:1}:settings', JSON.stringify(settings)
);
// Both keys hash to the same slot — safe for cluster

// Single-key commands work transparently — ioredis routes to correct node
await cluster.set('product:123', JSON.stringify(product));

// Pipeline in cluster — ioredis groups commands by slot automatically
const pipeline = cluster.pipeline();
pipeline.set('{batch}:key1', 'val1'); // same hash tag = same slot
pipeline.set('{batch}:key2', 'val2');
await pipeline.exec();

// Cluster vs Sentinel vs Standalone:
//
//   Standalone:
//     - Single Redis instance
//     - No HA, no sharding
//     - Use for: development, small datasets, simple caches
//
//   Sentinel:
//     - HA for a single Redis master + replicas
//     - Automatic failover; no sharding
//     - Use for: production with moderate data size, high availability required
//
//   Cluster:
//     - Horizontal sharding across multiple masters + replicas
//     - Automatic failover per shard
//     - Use for: large datasets (> single node RAM), high throughput requirements
//     - Complexity: multi-key ops require hash tags; client must handle MOVED
```

---

## 12. Redis Sentinel

```text
Redis Sentinel provides high availability for a single Redis master setup.
It does NOT provide sharding.

Components:
  - 1 Redis master
  - 1+ Redis replicas (async replication from master)
  - 3+ Sentinel processes (odd number for quorum voting)

Sentinel responsibilities:
  1. Monitoring — pings master and replicas every second
  2. Notification — alerts admin or triggers automation on failures
  3. Automatic failover — if master is unreachable:
       a. Sentinels vote (quorum = majority must agree master is down)
       b. Elect new master from replicas
       c. Update other replicas to follow new master
       d. Inform clients of new master address
  4. Configuration provider — clients query Sentinel for current master address

Quorum:
  - With 3 Sentinels, quorum = 2 (majority)
  - Master declared down ("subjectively down" = one sentinel can't reach it)
  - After quorum sentinels agree → "objectively down" → failover begins
  - Why 3? 2 Sentinels split-brain: with 1 Sentinel down, no majority possible

Replication lag:
  - Replication is async → potential data loss during failover
  - min-slaves-to-write and min-slaves-max-lag config can enforce sync replication
```

```js
// ioredis Sentinel connection — client automatically discovers master
const Redis = require('ioredis');

const redis = new Redis({
  sentinels: [
    { host: '192.168.1.1', port: 26379 },
    { host: '192.168.1.2', port: 26379 },
    { host: '192.168.1.3', port: 26379 },
  ],
  name: 'mymaster', // the master name defined in sentinel.conf
  // ioredis automatically queries sentinels for current master address
  // and reconnects on failover
  sentinelPassword: process.env.SENTINEL_PASSWORD,
  password:         process.env.REDIS_PASSWORD,
  role: 'master',   // 'master' | 'slave' — which role to connect to
});

// After failover, ioredis re-queries sentinels and reconnects transparently
// Inflight commands during failover are retried automatically
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('+switch-master', () => console.log('Sentinel: master switched'));
```

---

## 13. Persistence — RDB vs AOF

```text
RDB (Redis Database Snapshots):
  - Binary dump of all data at a point in time
  - Created by forking: child process writes snapshot; parent continues serving
  - Files are compact and can be compressed
  - Fast restart — load binary file vs replaying thousands of log entries
  - Data loss risk: up to (snapshot_interval) seconds of writes on crash
  - Config: save <seconds> <changes>
      save 900 1    # snapshot if at least 1 key changed in 900 seconds
      save 300 10   # OR if 10 keys changed in 300 seconds
      save 60 10000 # OR if 10000 keys changed in 60 seconds

AOF (Append Only File):
  - Log of every write command (SET, DEL, INCR, etc.)
  - On restart, Redis replays all commands to rebuild state
  - More durable: fsync every second = at most 1s of data loss
  - Larger files; slower restarts for huge datasets
  - AOF rewrite: Redis compacts log in background (BGREWRITEAOF)
    - Rewrite replaces multiple ops on same key with the current SET value
  - fsync options (appendfsync):
      always    → fsync after every write — safest, 1000s of writes/sec max
      everysec  → fsync every second — good balance (DEFAULT recommendation)
      no        → let OS decide (~30s) — fastest, most data loss risk
```

```text
Choosing persistence mode:

  Pure cache (data loss OK):
    → Disable both: no save directives, no AOF
    → Maximum performance

  High durability (financial, transactional):
    → RDB + AOF with appendfsync everysec
    → On startup Redis uses AOF (more complete) if both exist

  Fast recovery, some data loss OK:
    → RDB only
    → Tune snapshot frequency

  Minimal data loss:
    → AOF with appendfsync everysec (industry standard)
    → Run BGREWRITEAOF periodically to keep file size manageable

  Hybrid (Redis 4+):
    → aof-use-rdb-preamble yes
    → AOF file starts with RDB snapshot then appends incremental AOF
    → Fast load time + minimal data loss
```

```js
// Trigger operations from code (admin/ops tooling)
// BGSAVE — fork and save RDB snapshot in background
await redis.bgsave();

// BGREWRITEAOF — compact the AOF file in background
await redis.bgrewriteaof();

// Check last save time (Unix timestamp)
const lastSave = await redis.lastsave();
console.log('Last RDB save:', new Date(lastSave * 1000));

// DEBUG RELOAD — reload dataset from disk (testing persistence)
// await redis.debug('reload'); // development/testing only

// Check persistence info
const info = await redis.info('persistence');
// Contains: rdb_last_save_time, aof_enabled, aof_current_size, etc.
```

---

## 14. Pipelines and Transactions

### Pipeline (Batch Commands for Throughput)

```js
// By default, each Redis command = one TCP round-trip.
// Pipeline sends multiple commands in one batch → one round-trip.
// Commands are NOT atomic (another client can interleave between them).
// Use pipeline for: bulk reads/writes where atomicity is not required.

const Redis = require('ioredis');
const redis = new Redis();

// Without pipeline: 3 round-trips
await redis.set('a', '1');
await redis.set('b', '2');
await redis.set('c', '3');

// With pipeline: 1 round-trip, ~3x faster for small commands
const pipeline = redis.pipeline();
pipeline.set('a', '1');
pipeline.set('b', '2');
pipeline.set('c', '3');
const results = await pipeline.exec();
// results = [[null, 'OK'], [null, 'OK'], [null, 'OK']]
// Each element: [error, result]

// Pipeline with mixed commands
const pipe = redis.pipeline();
pipe.set('counter', 0);
pipe.incr('counter');
pipe.incr('counter');
pipe.get('counter');
const [, , , [, finalValue]] = await pipe.exec();
console.log(finalValue); // '2'

// Inline pipeline (fluent API)
const [, [, count]] = await redis
  .pipeline()
  .incr('page:views')
  .expire('page:views', 86400)
  .exec();
```

### MULTI/EXEC (Transactions)

```js
// MULTI/EXEC queues commands and executes them atomically as a block.
// During EXEC: no other client's commands interleave.
// If any command in the queue has a syntax error, the whole transaction is aborted.
// If a command FAILS at runtime (e.g., wrong type), others still execute.
// (Redis does NOT support rollback like SQL — failed commands don't undo others)

// ioredis: use redis.multi() (same as pipeline but wrapped in MULTI/EXEC)
const tx = redis.multi();
tx.set('balance:alice', '1000');
tx.decrby('balance:alice', 100);
tx.incrby('balance:bob', 100);
const txResults = await tx.exec();
// All three execute atomically or none do (on EXEC)
// txResults = [[null, 'OK'], [null, 900], [null, 100]]

// DISCARD — cancel a queued transaction
const abortable = redis.multi();
abortable.set('key', 'val');
// Changed our mind:
await abortable.discard(); // clears the queue, returns to normal mode
```

### WATCH (Optimistic Locking)

```js
// WATCH marks keys for observation.
// If a watched key is modified by another client before EXEC:
//   → EXEC returns null (transaction aborted)
//   → Retry the whole transaction
//
// This is optimistic locking: assume no conflict; verify before committing.
// Use for: read-modify-write operations that must be atomic without a mutex.

async function transferFunds(fromKey, toKey, amount) {
  // Retry loop — CAS (Compare-And-Swap) pattern
  for (let attempt = 0; attempt < 5; attempt++) {
    // Watch the keys we'll read
    await redis.watch(fromKey, toKey);

    const balance = parseInt(await redis.get(fromKey), 10);
    if (balance < amount) {
      await redis.unwatch();
      throw new Error('Insufficient funds');
    }

    // Queue transaction — if fromKey or toKey changed since WATCH, EXEC returns null
    const result = await redis.multi()
      .decrby(fromKey, amount)
      .incrby(toKey, amount)
      .exec();

    if (result !== null) {
      return result; // success
    }
    // result === null → conflict detected → retry
    // Small backoff to reduce contention
    await new Promise(r => setTimeout(r, 10 * (attempt + 1)));
  }
  throw new Error('Transaction failed after retries — too much contention');
}
```

### Pipeline vs MULTI/EXEC

```text
Pipeline:
  - Batch commands for fewer round-trips
  - Commands sent and executed in order but NOT atomic
  - Other clients CAN interleave between pipeline commands
  - Use for: bulk inserts, reads that don't need atomicity

MULTI/EXEC:
  - Atomic execution — no interleaving
  - Commands are queued client-side, sent as a batch, executed atomically
  - Slower than pipeline due to MULTI/EXEC overhead
  - Use for: operations that must succeed or fail together

Both can be combined: ioredis's multi() is both pipelined AND atomic.
```

---

## 15. Common Node.js Patterns with ioredis

### Setup and Connection Handling

```js
const Redis = require('ioredis');

// Basic connection with retry and error handling
const redis = new Redis({
  host:               process.env.REDIS_HOST || 'localhost',
  port:               parseInt(process.env.REDIS_PORT || '6379', 10),
  password:           process.env.REDIS_PASSWORD,
  db:                 0,                      // database index (0–15)
  keyPrefix:          'myapp:',               // automatically prepended to all keys
  connectTimeout:     10000,                  // 10s connection timeout
  maxRetriesPerRequest: 3,                    // retry failed commands up to 3 times
  enableReadyCheck:   true,
  lazyConnect:        false,                  // connect immediately
  retryStrategy(times) {
    if (times > 10) return null; // stop retrying after 10 attempts
    return Math.min(times * 200, 2000);       // exponential backoff up to 2s
  },
});

redis.on('connect',   () => console.log('Redis: connected'));
redis.on('ready',     () => console.log('Redis: ready'));
redis.on('error',     (err) => console.error('Redis error:', err));
redis.on('close',     () => console.log('Redis: connection closed'));
redis.on('reconnecting', () => console.log('Redis: reconnecting...'));

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit(); // send QUIT, wait for pending commands
  process.exit(0);
});
```

### Caching Middleware (Express)

```js
// Cache-aside as Express middleware — cache GET responses automatically

function cacheMiddleware(ttlSeconds = 300) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const key = `http:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        const { status, body } = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        return res.status(status).json(body);
      }
    } catch (err) {
      // Cache failure is non-fatal — fall through to handler
      console.error('Cache middleware error:', err);
    }

    // Intercept res.json to capture the response for caching
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode === 200) {
        try {
          await redis.set(
            key,
            JSON.stringify({ status: res.statusCode, body }),
            'EX',
            ttlSeconds
          );
        } catch (err) {
          console.error('Cache write error:', err);
        }
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

// Usage
app.get('/api/products', cacheMiddleware(300), async (req, res) => {
  const products = await db.query('SELECT * FROM products');
  res.json(products); // automatically cached for 5 minutes
});
```

### Cache Warming

```js
// Proactively populate the cache on startup (or after a cache flush).
// Prevents stampede on first requests; ensures hot paths are always fast.

async function warmCache() {
  console.log('Starting cache warm-up...');

  // Fetch top N most popular products from DB
  const topProducts = await db.query(
    'SELECT * FROM products ORDER BY view_count DESC LIMIT 100'
  );

  // Write to cache in parallel batches (avoid overwhelming Redis)
  const batchSize = 20;
  for (let i = 0; i < topProducts.length; i += batchSize) {
    const batch = topProducts.slice(i, i + batchSize);
    const pipeline = redis.pipeline();
    for (const product of batch) {
      pipeline.set(
        `product:${product.id}`,
        JSON.stringify(product),
        'EX',
        3600
      );
    }
    await pipeline.exec();
  }

  console.log(`Cache warmed: ${topProducts.length} products`);
}

// Run on server start (after DB is ready)
app.on('ready', async () => {
  await warmCache();
});
```

### Generic Cache-Aside with ioredis

```js
// Reusable cache-aside helper with type safety, error handling, and metrics

class CacheService {
  constructor(redis, { defaultTTL = 3600, prefix = '' } = {}) {
    this.redis      = redis;
    this.defaultTTL = defaultTTL;
    this.prefix     = prefix;
    this.hits       = 0;
    this.misses     = 0;
  }

  key(k) { return `${this.prefix}${k}`; }

  async get(key, fetchFn, ttl) {
    const fullKey = this.key(key);
    try {
      const cached = await this.redis.get(fullKey);
      if (cached !== null) {
        this.hits++;
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error(`Cache GET error for ${fullKey}:`, err);
    }

    this.misses++;
    const value = await fetchFn();
    if (value != null) {
      try {
        await this.redis.set(fullKey, JSON.stringify(value), 'EX', ttl ?? this.defaultTTL);
      } catch (err) {
        console.error(`Cache SET error for ${fullKey}:`, err);
      }
    }
    return value;
  }

  async invalidate(...keys) {
    const fullKeys = keys.map(k => this.key(k));
    if (fullKeys.length > 0) await this.redis.del(...fullKeys);
  }

  async invalidatePattern(pattern) {
    // SCAN is safe for production (non-blocking); KEYS is not (blocks Redis)
    let cursor = '0';
    const fullPattern = this.key(pattern);
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor, 'MATCH', fullPattern, 'COUNT', 100
      );
      cursor = nextCursor;
      if (keys.length > 0) await this.redis.del(...keys);
    } while (cursor !== '0');
  }

  hitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total * 100).toFixed(2) + '%';
  }
}

const cache = new CacheService(redis, { defaultTTL: 3600, prefix: 'myapp:' });

// Usage
const user = await cache.get(
  `user:${userId}`,
  () => db.query('SELECT * FROM users WHERE id = ?', [userId]),
  1800 // 30 minute TTL for this call
);

await cache.invalidate(`user:${userId}`);
await cache.invalidatePattern('user:*:profile'); // use SCAN, not KEYS
```

---

## 16. Common Interview Questions

---

**Q: What is the difference between Redis and Memcached?**

```text
Redis:
  - Rich data structures (String, Hash, List, Set, Sorted Set, Stream, etc.)
  - Optional persistence (RDB, AOF)
  - Pub/Sub, Lua scripting, transactions (MULTI/EXEC)
  - Cluster and Sentinel for HA
  - Pub/Sub, streams, atomic operations

Memcached:
  - Simple key-value only (strings)
  - No persistence — pure cache
  - Multi-threaded (can use multiple CPU cores)
  - Slightly simpler, slightly faster for pure string caching at massive scale

Choose Redis in almost all cases. Choose Memcached only if you need
multi-threaded cache and have an extremely simple data model.
```

---

**Q: Redis is single-threaded. How is it fast?**

```text
Single-threaded means ONE thread handles command execution — no lock contention,
no context switching between command processors.

Speed comes from:
  1. All data in memory — no disk I/O on the hot path (microsecond latency)
  2. Non-blocking I/O via epoll/kqueue — single thread handles thousands of connections
  3. Simple, optimized data structures — O(1) operations are truly O(1)
  4. No serialization overhead for stored data in-memory

Redis 6+ added I/O threads for network handling while keeping command
execution single-threaded. This improved throughput for high-bandwidth workloads.

Benchmark: ~100,000–1,000,000 ops/sec on commodity hardware.
```

---

**Q: Explain cache stampede and how to prevent it.**

```text
Cache stampede (thundering herd):
  When a popular cached key expires, many concurrent requests all get a MISS
  and simultaneously hit the backing store (DB), overwhelming it.

Prevention strategies:

1. Mutex lock (most common):
   - First requester acquires a Redis lock (SET NX EX)
   - Others wait/retry until the cache is populated
   - Downside: waiting adds latency; lock must have a safe TTL

2. Probabilistic Early Expiry (PER):
   - Each request has a small random chance of refreshing BEFORE expiry
   - Probability increases as TTL nears zero
   - No coordination required; one request naturally refreshes before expiry

3. Stale-While-Revalidate:
   - Serve the stale cached value immediately
   - Trigger a background refresh asynchronously
   - Next requester gets the fresh value
   - Best for: user-facing reads where milliseconds matter

4. Cache warming:
   - Pre-populate cache before it expires (scheduled job)
   - Prevents cold start entirely
```

---

**Q: What is the difference between MULTI/EXEC and a pipeline?**

```text
Pipeline:
  - Groups multiple commands into one TCP batch for efficiency
  - NOT atomic — other clients can execute commands between yours
  - Used for performance (fewer round-trips), not consistency

MULTI/EXEC (transaction):
  - Atomic block — guaranteed no interleaving by other clients
  - Commands are queued (not executed) until EXEC is called
  - All commands execute in order, atomically, when EXEC is called
  - If a key is modified by another client between MULTI and EXEC:
    → WATCH catches this → EXEC returns null → retry

ioredis's multi() is both pipelined AND transactional (MULTI/EXEC under the hood).
```

---

**Q: What is the correct way to implement a distributed lock in Redis?**

```text
WRONG:
  SETNX lock 1          ← not atomic with EXPIRE
  EXPIRE lock 30        ← if crash between these two → deadlock forever

CORRECT (single node):
  SET lock <unique-token> NX EX 30
  ← one atomic command: only set if not exists, with 30s expiry

Release with Lua (atomic check-and-delete):
  if GET(lock) == token then DEL(lock) end

Use a unique token per lock acquisition so you only release YOUR lock,
not a lock acquired by another process after yours expired.

For multi-node (Redlock):
  - Acquire on N independent Redis instances simultaneously
  - Valid if majority (N/2+1) acquired AND total time < TTL
  - Provides safety across node failures
```

---

**Q: What cache eviction policy should you use and why?**

```text
For a general-purpose cache where you want Redis to auto-manage size:
  → allkeys-lru

For a Redis instance that stores both persistent data AND cached data:
  → volatile-lru (only evict keys that have a TTL set)

For workloads where some keys are consistently hot over long periods (not just recently):
  → allkeys-lfu (Least Frequently Used — better than LRU for these patterns)

For a primary data store where you NEVER want eviction:
  → noeviction (application gets errors on write instead of silent eviction)

NEVER use noeviction for a pure caching layer — it will cause write errors
instead of gracefully making room.
```

---

**Q: What is the difference between RDB and AOF persistence?**

```text
RDB (snapshot):
  - Binary point-in-time dump
  - Compact, fast to load on restart
  - Data loss: up to snapshot_interval seconds
  - Use for: backups, recovery speed is priority, some data loss acceptable

AOF (append-only log):
  - Log of every write command
  - Durable: at most 1 second of data loss with appendfsync everysec
  - Larger files, slower restarts for huge datasets
  - Use for: minimal data loss requirement

Best practice: use BOTH. AOF for recovery (durability), RDB for fast backups.
Redis 4+ hybrid format combines both in the AOF file.
```

---

**Q: How does Redis Cluster distribute keys?**

```text
Redis Cluster uses consistent hashing via hash slots:

  1. The keyspace is divided into 16,384 hash slots (0–16383)
  2. Each key is assigned: slot = CRC16(key) % 16384
  3. Each master node owns a range of slots

For multi-key commands (MGET, MSET, pipeline) to work:
  All keys must hash to the same slot.
  Use hash tags: {user:1}:profile and {user:1}:settings both hash on "user:1"
  → same slot → safe for multi-key operations.

Clients receive MOVED redirects when they send a command to the wrong node.
ioredis handles MOVED/ASK transparently — auto-updates its slot map.
```

---

**Q: What is the difference between Pub/Sub and Streams?**

```text
Pub/Sub:
  - Fire-and-forget: message is lost if no active subscriber
  - No persistence — cannot replay missed messages
  - All subscribers receive all messages (no partitioning)
  - Use for: real-time notifications where loss is acceptable

Streams:
  - Persistent log — messages survive until XTRIM or TTL
  - Consumer groups: messages partitioned among workers, each worker gets a subset
  - Acknowledgment: XACK marks message as processed; unacked = redelivered
  - Replay: read from any point in the stream by ID
  - Use for: reliable event queues, audit logs, anything requiring at-least-once delivery
```

---

**Q: How do you invalidate related cache entries when data changes?**

```text
Strategies in order of complexity:

1. TTL-based: accept stale data for TTL duration. Simplest; no code needed.

2. Key-level invalidation: DEL specific keys on write. Works when you know
   exactly which cache keys are affected.

3. Cache tags: store a Set of cache keys per logical entity. On update,
   DEL all keys in the tag's Set. Good for compound cache entries.

4. Version keys: include a version counter in the cache key. "Invalidation"
   = increment the version counter. Old keys naturally expire. No explicit DEL needed.

5. Event-driven: publish invalidation event (Redis Pub/Sub or message queue).
   Other services subscribe and DEL their local copies.

6. Cache stampede protection: pair any invalidation with mutex or PER to
   prevent stampede on the next request after invalidation.
```
