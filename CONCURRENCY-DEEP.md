# Concurrency — Deep Reference

## Core Concepts

### Concurrency vs Parallelism

```
Concurrency  — multiple tasks are IN PROGRESS at the same time (may not run simultaneously)
               One CPU, many tasks interleaved — dealing with lots of things at once
               Example: Node.js event loop — handles many connections concurrently on one thread

Parallelism  — multiple tasks ACTUALLY RUNNING simultaneously on multiple CPUs
               Example: Node.js cluster, Python multiprocessing, Go goroutines on multi-core

Analogy:
Concurrency = one barista taking multiple orders (interleaving)
Parallelism = multiple baristas working at the same time
```

---

## Race Conditions

> A race condition occurs when the result depends on the timing/order of concurrent operations. Two or more operations read/modify shared state without coordination.

```ts
// ✗ Race condition — two requests both read count=5, both write count=6
// Expected: count becomes 7 (two increments)
// Actual: count becomes 6 (lost update)
app.post('/like', async (req, res) => {
    const post = await db.findById(req.params.id);
    await db.update({ likes: post.likes + 1 }); // read-modify-write is not atomic
});

// ✓ Fix: atomic update — database handles it
app.post('/like', async (req, res) => {
    await db.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [req.params.id]);
});

// ✓ Fix: optimistic locking — detect and retry conflicts
app.post('/like', async (req, res) => {
    const result = await db.query(
        'UPDATE posts SET likes = likes + 1, version = version + 1 WHERE id = $1 AND version = $2',
        [req.params.id, req.body.version]
    );
    if (result.rowCount === 0) throw new ConflictError('Version mismatch — retry');
});
```

---

## Mutex and Locking

### Database-Level Locking

```sql
-- Pessimistic locking: lock the row while you work with it
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;  -- locks this row
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;  -- lock released

-- SELECT FOR UPDATE prevents other transactions from modifying the row
-- Use for: critical financial operations, inventory reservation

-- Optimistic locking: no lock, detect conflict on write
UPDATE accounts
SET balance = balance - 100, version = version + 1
WHERE id = 1 AND version = 5;  -- only succeeds if version hasn't changed
-- If 0 rows affected: someone else modified it — retry
```

### Application-Level Mutex (Node.js)

```ts
// Problem: two concurrent requests both try to initialize the same resource
// Solution: mutex — only one can proceed at a time

class AsyncMutex {
    private queue: (() => void)[] = [];
    private locked = false;

    async acquire(): Promise<() => void> {
        return new Promise(resolve => {
            if (!this.locked) {
                this.locked = true;
                resolve(() => this.release());
            } else {
                this.queue.push(() => resolve(() => this.release()));
            }
        });
    }

    private release() {
        if (this.queue.length > 0) {
            this.queue.shift()!();
        } else {
            this.locked = false;
        }
    }
}

const mutex = new AsyncMutex();
async function criticalSection() {
    const unlock = await mutex.acquire();
    try {
        await doSomethingExclusive(); // only one runs at a time
    } finally {
        unlock(); // always release, even on error
    }
}
```

### Redis Distributed Lock

```ts
// Problem: mutex in one Node.js process doesn't work across multiple instances
// Solution: distributed lock using Redis SETNX (Set if Not eXists)

async function acquireDistributedLock(key: string, ttlMs: number): Promise<string | null> {
    const token = crypto.randomUUID(); // unique token to identify our lock
    const acquired = await redis.set(
        `lock:${key}`,
        token,
        'NX',  // only set if not exists
        'PX',  // expire in milliseconds
        ttlMs
    );
    return acquired === 'OK' ? token : null;
}

async function releaseDistributedLock(key: string, token: string) {
    // Lua script: only delete if we own the lock (compare token)
    await redis.eval(`
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    `, 1, `lock:${key}`, token);
}

// Usage
async function processOrder(orderId: string) {
    const token = await acquireDistributedLock(`order:${orderId}`, 30_000);
    if (!token) throw new Error('Could not acquire lock — another instance is processing');
    try {
        await doOrderProcessing(orderId);
    } finally {
        await releaseDistributedLock(`order:${orderId}`, token);
    }
}
```

---

## Deadlocks

> A deadlock occurs when two or more processes are waiting for each other to release a resource — circular wait, everyone blocked forever.

```
Process A: holds Lock 1, waiting for Lock 2
Process B: holds Lock 2, waiting for Lock 1
→ Neither can proceed — deadlock

Four conditions (Coffman conditions) — all must be true for deadlock:
1. Mutual exclusion — resources can't be shared
2. Hold and wait — holds a resource while waiting for another
3. No preemption — can't forcibly take resources
4. Circular wait — A waits for B, B waits for A

Prevention strategies:
- Always acquire locks in the same order (eliminates circular wait)
- Lock timeout — give up waiting after N seconds, retry
- Deadlock detection — detect and kill one of the processes
```

```sql
-- SQL deadlock example:
-- Transaction A: UPDATE accounts WHERE id=1, then UPDATE accounts WHERE id=2
-- Transaction B: UPDATE accounts WHERE id=2, then UPDATE accounts WHERE id=1
-- → Deadlock

-- Prevention: always lock rows in the same order (by id ascending)
-- PostgreSQL will detect deadlocks and roll back one transaction automatically
-- Your app must be prepared to catch "deadlock detected" and retry
```

---

## JavaScript Concurrency

### The Event Loop — Detailed

```ts
// Execution order:
// 1. Synchronous code (call stack)
// 2. process.nextTick callbacks (before anything else in the queue)
// 3. Promise microtasks (.then, .catch, async/await continuations)
// 4. Macrotasks: timers (setTimeout/setInterval), I/O callbacks, setImmediate

async function example() {
    console.log('1 - sync');
    
    setTimeout(() => console.log('5 - macrotask'), 0);
    setImmediate(() => console.log('6 - setImmediate'));
    
    process.nextTick(() => console.log('3 - nextTick'));
    
    await Promise.resolve();
    console.log('4 - after await (microtask)');
    
    console.log('2 - sync (before await)');
}
// Output: 1, 2, 3, 4, 5, 6
// Wait — 1 and 2 are both sync but await splits them
// Actually: 1, then sync continues to "2", await suspends,
// nextTick (3), microtask (4), then macrotasks (5, 6)
```

### Promise Combinators

```ts
// Promise.all — all must succeed, fails fast on first error
const [users, tasks, settings] = await Promise.all([
    fetchUsers(),
    fetchTasks(),
    fetchSettings(),
]);
// If any fail → entire Promise.all rejects immediately

// Promise.allSettled — wait for all, even if some fail
const results = await Promise.allSettled([fetchA(), fetchB(), fetchC()]);
results.forEach(result => {
    if (result.status === 'fulfilled') use(result.value);
    else logError(result.reason);
});

// Promise.race — first to resolve OR reject wins
const result = await Promise.race([
    fetchData(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
]);

// Promise.any — first to RESOLVE wins (ignores rejections unless all fail)
const fastest = await Promise.any([mirror1.fetch(), mirror2.fetch(), mirror3.fetch()]);
```

---

## Go Concurrency

```go
// Goroutines + channels — CSP model (Communicating Sequential Processes)
// "Don't communicate by sharing memory; share memory by communicating"

// Worker pool pattern — limit concurrency
func processItems(items []Item) {
    const workers = 10
    jobs := make(chan Item, len(items))
    results := make(chan Result, len(items))

    // Start workers
    for i := 0; i < workers; i++ {
        go func() {
            for item := range jobs {
                results <- process(item)
            }
        }()
    }

    // Send jobs
    for _, item := range items {
        jobs <- item
    }
    close(jobs)

    // Collect results
    for range items {
        result := <-results
        handle(result)
    }
}

// Context for cancellation
func fetchWithTimeout(url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel() // always cancel to release resources

    req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err // includes context.DeadlineExceeded on timeout
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

---

## Python Concurrency

```python
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

# asyncio — I/O-bound concurrency (single thread, cooperative)
async def fetch_all(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks)  # all run concurrently

# Threading — I/O-bound, GIL released during I/O
with ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(fetch_url, url) for url in urls]
    results = [f.result() for f in futures]

# Multiprocessing — CPU-bound work (separate processes, bypass GIL)
with ProcessPoolExecutor(max_workers=os.cpu_count()) as executor:
    results = list(executor.map(cpu_intensive_task, data))

# threading.Lock — mutual exclusion
lock = threading.Lock()
counter = 0

def increment():
    global counter
    with lock:  # context manager — auto-releases on exit or exception
        counter += 1

# asyncio.Lock — for async code
async_lock = asyncio.Lock()
async def async_increment():
    async with async_lock:
        await asyncio.sleep(0)  # simulate async work
        counter += 1
```

---

## Most Asked Concurrency Interview Questions

### "What is a race condition and how do you prevent it?"

> A race condition is when the outcome depends on the non-deterministic timing of concurrent operations — two threads/processes both read-modify-write the same data without coordination. Prevent with: atomic operations (database `UPDATE x = x + 1`), mutexes/locks, database transactions, message queues (serialize operations), immutable data (no shared mutable state). In distributed systems: distributed locks (Redis), optimistic locking (version columns), event sourcing (append-only, no shared mutable state).

### "What is a deadlock and how do you avoid it?"

> Deadlock: circular wait — A holds lock 1 and waits for lock 2; B holds lock 2 and waits for lock 1. Prevention: always acquire locks in a consistent global order; set lock acquisition timeouts; minimize time holding locks; prefer database-level transactions over application-level locks; use tryLock with retry and backoff instead of blocking indefinitely.

### "What is the difference between a process and a thread?"

> A **process** is an independent program in execution — its own memory space, file handles, and OS resources. Starting a process has high overhead. Processes don't share memory (communicate via IPC, pipes, sockets). A **thread** is a unit of execution within a process — shares the process's memory space (cheaper to create, faster communication), but requires synchronization for shared data. Multiple threads in one process can run truly in parallel on multi-core CPUs (if the language/runtime allows it — Python's GIL is a notable exception).

### "What is thread safety?"

> Code is thread-safe if it works correctly when multiple threads execute it concurrently — no race conditions, no data corruption, no deadlocks. Achieving thread safety: immutable objects (no shared mutable state — easiest), mutual exclusion (locks — serializes access), atomic operations (hardware-level read-modify-write), thread-local storage (each thread has its own copy). Stateless functions are inherently thread-safe (no shared state).
