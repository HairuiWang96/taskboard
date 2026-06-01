# Node.js Internals — Senior Deep Reference

---

## The Event Loop

Node.js is single-threaded but non-blocking via the event loop + libuv thread pool.

```
┌──────────────────────────────┐
│           timers             │  ← setTimeout, setInterval callbacks
├──────────────────────────────┤
│       pending callbacks      │  ← I/O callbacks deferred from prev iteration
├──────────────────────────────┤
│          idle, prepare       │  ← internal use only
├──────────────────────────────┤
│             poll             │  ← retrieve new I/O events; execute I/O callbacks
├──────────────────────────────┤
│             check            │  ← setImmediate callbacks
├──────────────────────────────┤
│        close callbacks       │  ← e.g., socket.on('close', ...)
└──────────────────────────────┘
         ↑ repeats until nothing to process
```

### Microtask Queue (runs BETWEEN every phase)

```
Microtasks run after each phase completes, before moving to the next.
Two microtask queues (processed in order):
  1. process.nextTick queue  (higher priority)
  2. Promise microtask queue (then/catch/finally, ‼️queueMicrotask)

Order of execution:
  setTimeout(fn, 0)   → timers phase
  setImmediate(fn)    → check phase (after I/O)
  process.nextTick    → next microtask drain (before any I/O/timers)
  Promise.resolve()   → microtask queue (after nextTick)
```

### Execution Order Quiz (critical interview topic)

```js
console.log('1');

setTimeout(() => console.log('2'), 0);

setImmediate(() => console.log('3'));

Promise.resolve().then(() => console.log('4'));

process.nextTick(() => console.log('5'));

console.log('6');

// Output: 1, 6, 5, 4, 2, 3
// Explanation:
// Sync: 1, 6
// nextTick queue: 5
// Promise microtasks: 4
// timers phase: 2
// check phase: 3
```

```js
// setTimeout vs setImmediate outside I/O — ORDER IS NON-DETERMINISTIC‼️
// ‼️because timers phase checks if setTimeout has expired; tiny timing differences
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
// Could be either order!‼️

// Inside I/O callback — setImmediate ALWAYS comes first:
fs.readFile('file', () => {
    setTimeout(() => console.log('timeout'), 0);
    setImmediate(() => console.log('immediate'));
    // Always: immediate, timeout
});
```

### process.nextTick vs setImmediate

```js
// process.nextTick: add to nextTick queue — runs before I/O events
// Risk: recursive nextTick starves I/O (don't do this)
function recursiveTick() {
    process.nextTick(recursiveTick);
} // ❌ blocks event loop

// setImmediate: runs in check phase — after I/O, won't starve
// Prefer setImmediate for recursive async work‼️

// When to use nextTick:
// - Emit events after constructor finishes (so listener can be attached)‼️
class EventEmitter {
    constructor() {
        process.nextTick(() => this.emit('ready')); // listener attached after constructor
    }
}
```

---

## libuv Thread Pool

```
Node.js is single-threaded for JS, but libuv uses a thread pool for:
  - File system ops (fs.readFile, fs.writeFile, etc.)
  - DNS lookups (dns.lookup)
  - Crypto operations (crypto.pbkdf2, crypto.randomBytes, etc.)
  - zlib (compression)
  - User code via worker_threads (see below)

Default thread pool size: 4
Set via: UV_THREADPOOL_SIZE=8 node app.js (max 128)

Network I/O (TCP, HTTP) does NOT use thread pool — uses OS epoll/kqueue (async)‼️

Implication: 5 concurrent bcrypt hashes with pool size 4 → 4 start, 1 waits
Fix: increase UV_THREADPOOL_SIZE or use worker threads
```

---

## Worker Threads

```js
// For CPU-intensive tasks — runs JS in a separate thread with own V8 instance
// Shares memory via SharedArrayBuffer + Atomics
// Communicates via message passing (postMessage)

// main.js
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
    const worker = new Worker(__filename, { workerData: { input: [1, 2, 3] } });
    worker.on('message', result => console.log('Result:', result));
    worker.on('error', console.error);
    worker.on('exit', code => {
        if (code !== 0) throw new Error(`Worker stopped: ${code}`);
    });
} else {
    // Worker thread
    const result = workerData.input.map(x => x * 2);
    parentPort.postMessage(result);
}

// Worker pool pattern (Piscina library is the standard):‼️
import Piscina from 'piscina';
const pool = new Piscina({ filename: './worker.js', maxThreads: 4 });
const result = await pool.run({ data: heavyInput });
```

### Worker Threads vs child_process vs cluster

```
worker_threads: shared memory (SharedArrayBuffer), same process, low overhead
               Use: CPU-intensive JS (image processing, ML inference, crypto)

child_process:  separate process, separate memory, IPC via stdin/stdout/pipe
  fork():       Node.js child, built-in IPC channel
  exec/spawn(): any executable
               Use: shell commands, separate Node processes, isolation needed

cluster:        multiple Node processes sharing same port (load balancing)
               Master forks workers, OS distributes connections round-robin
               Use: HTTP servers — use all CPU cores
               Modern alternative: PM2 cluster mode or running multiple containers‼️

---

## Streams

```

Why streams: process data chunk by chunk instead of loading all into memory
Reading 10GB file without streams: crashes (RAM exceeded)
With streams: constant ~64KB memory

Types:
Readable: source (fs.createReadStream, HTTP request, process.stdin)
Writable: sink (fs.createWriteStream, HTTP response, process.stdout)
Duplex: both (TCP socket, zlib Transform)
Transform: Duplex that transforms data (compression, encryption, parsing)‼️

````

```js
// Pipe — connects readable to writable (handles backpressure automatically)
fs.createReadStream('input.txt').pipe(zlib.createGzip()).pipe(fs.createWriteStream('output.gz'));

// pipeline (node:stream) — preferred: handles errors + cleanup
const { pipeline } = require('stream/promises');
await pipeline(fs.createReadStream('input.txt'), zlib.createGzip(), fs.createWriteStream('output.gz'));

// Custom Readable
const { Readable } = require('stream');
const readable = new Readable({
    read(size) {
        // called when consumer wants data
        this.push('chunk of data'); // push data downstream
        this.push(null); // signal end of stream
    },
});

// Custom Transform
const { Transform } = require('stream');
const upper = new Transform({
    transform(chunk, encoding, callback) {
        this.push(chunk.toString().toUpperCase());
        callback(); // signal ready for next chunk
    },
});

// Async iterator (modern, cleaner)
async function processFile(path) {
    const stream = fs.createReadStream(path, { encoding: 'utf8' });
    for await (const chunk of stream) {
        process(chunk);
    }
}
````

### Backpressure

```js
// Problem: fast readable + slow writable → buffer fills → OOM
// pipe/pipeline handles this automatically via backpressure signals

// Manual backpressure:
readable.on('data', chunk => {
    const canContinue = writable.write(chunk);
    if (!canContinue) {
        readable.pause(); // stop reading
        writable.once('drain', () => {
            readable.resume(); // resume when writable is ready
        });
    }
});
```

---

## Node.js Cluster

```js
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isPrimary) {
    // Fork a worker per CPU core
    for (let i = 0; i < numCPUs; i++) cluster.fork();

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died, restarting...`);
        cluster.fork(); // auto-restart crashed workers
    });
} else {
    // Worker: each has its own event loop
    http.createServer((req, res) => {
        res.writeHead(200);
        res.end(`Hello from worker ${process.pid}`);
    }).listen(8000);
}

// OS distributes incoming connections across workers (round-robin on Linux)
// Workers share the same port — OS handles accept() distribution

// Graceful shutdown:
process.on('SIGTERM', () => {
    server.close(() => process.exit(0)); // stop accepting, drain existing
});
```

---

## Event Loop: Common Pitfalls

```js
// 1. Blocking the event loop — everything freezes
app.get('/api', (req, res) => {
    const result = JSON.parse(hugeJsonString); // blocks event loop
    // Fix: use streaming JSON parser, or move to worker thread‼️
});

// 2. Unhandled promise rejections (crash in Node 15+)
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
});

// 3. Memory leaks
// - Event listeners not removed (use emitter.removeListener or { once: true })
// - Closures holding large objects
// - Growing arrays/maps never cleared
// Diagnose: node --inspect → Chrome DevTools heap snapshot‼️

// 4. setInterval drifts under load
// Each iteration start time ≠ previous end time + interval
// Fix: recursive setTimeout for precise intervals‼️

// 5. CPU in Promise chains still blocks
// Promise callbacks run in microtask queue — still on main thread
// Long Promise chains ≠ non-blocking; only I/O awaits are non-blocking‼️
```

---

## HTTP/2 & HTTP/3 in Node

```js
// HTTP/2 — multiplexed streams over one connection
const http2 = require('http2');
const fs = require('fs');

const server = http2.createSecureServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
});

server.on('stream', (stream, headers) => {
    stream.respond({ ':status': 200, 'content-type': 'text/plain' });
    stream.end('Hello HTTP/2');
});

// Server push — push assets before client requests them
server.on('stream', stream => {
    stream.pushStream({ ':path': '/style.css' }, (err, pushStream) => {
        pushStream.respond({ ':status': 200 });
        pushStream.end(cssContent);
    });
    stream.respond({ ':status': 200 });
    stream.end(htmlContent);
});
```

---

## Performance & Profiling

```bash
# CPU profiling‼️
node --prof app.js                    # generates isolate-*.log
node --prof-process isolate-*.log     # human-readable output

# Heap snapshot
node --inspect app.js
# Open chrome://inspect → Memory tab → Take heap snapshot

# Flame graph (clinic.js — best DX)‼️
npm install -g clinic
clinic flame -- node app.js
clinic doctor -- node app.js   # detects event loop lag, I/O issues

# Built-in performance hooks
const { performance, PerformanceObserver } = require('perf_hooks')
performance.mark('start')
doWork()
performance.mark('end')
performance.measure('work', 'start', 'end')
const [entry] = performance.getEntriesByName('work')
console.log(entry.duration)
```

---

## Key Interview Answers

```
Q: Why is Node.js fast for I/O?
A: Single-threaded event loop + non-blocking I/O via libuv (OS epoll/kqueue).
   Doesn't spin threads per connection (unlike traditional servers).‼️
   One thread handles thousands of connections via async callbacks.

Q: When is Node.js NOT a good choice?
A: CPU-intensive tasks (video encoding, ML, heavy crypto) block the event loop.
   Worker threads mitigate this but add complexity.
   GIL-free multi-threading (Go, Rust) may be better for heavy compute.

Q: process.nextTick vs Promise.resolve()
A: Both are microtasks but nextTick queue drains first.
   process.nextTick defers to end of current operation (before I/O).
   Promise microtasks run after nextTick queue is empty.
   Overusing nextTick can starve I/O — prefer Promise/setImmediate.

Q: How do you handle CPU-intensive tasks?
A: worker_threads for JS-based CPU work with shared memory.
   child_process.spawn for native executables.
   Offload to a separate microservice (queue-based) for long-running work.

Q: What is backpressure in streams?
A: Signal from a writable stream that its internal buffer is full.
   Readable should pause until writable emits 'drain'.
   pipe/pipeline manages this automatically.‼️
   Manual: check write() return value, pause on false, resume on 'drain'.
```
