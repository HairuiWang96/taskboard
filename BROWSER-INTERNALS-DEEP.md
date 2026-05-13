# Browser Internals — Deep Reference

## How Browsers Work

### Main Components

```
Browser Engine     — coordinates between UI and rendering engine (e.g. Blink in Chrome)
Rendering Engine   — parses HTML/CSS, builds trees, paints pixels (Blink, Gecko, WebKit)
JavaScript Engine  — executes JS (V8 in Chrome/Node, SpiderMonkey in Firefox)
Networking         — HTTP requests, caching, DNS
UI Backend         — draws native widgets (scrollbars, dropdowns)
Data Storage       — cookies, localStorage, IndexedDB, Cache API
```

---

## V8 JavaScript Engine

### How V8 Executes Code

```
Source Code
    ↓
Parser → AST (Abstract Syntax Tree)
    ↓
Ignition (interpreter) → Bytecode  ← fast start, runs immediately
    ↓ (hot code detected by profiler)
TurboFan (JIT compiler) → Optimized Machine Code  ← much faster execution

Key insight:
- V8 doesn't compile to machine code upfront (too slow to start)
- Ignition interprets bytecode quickly to start running
- TurboFan watches for "hot" code (called many times) and compiles it
- If assumptions are wrong (type changes), it "deoptimizes" back to bytecode
```

### What Causes Deoptimization (Slow JS)

```ts
// V8 optimizes functions based on observed types
// If types change, it deoptimizes — performance cliff

function add(a, b) { return a + b; }
add(1, 2);     // V8 assumes: number + number → optimizes for numbers
add(1, 2);     // fast — uses optimized code
add('a', 'b'); // type changed! V8 deoptimizes — back to slow path

// ✓ Keep types consistent — V8 loves monomorphic functions
function addNumbers(a: number, b: number) { return a + b; }

// Hidden classes — V8 creates an internal "shape" for objects
// ✓ Always initialize properties in the same order
const p1 = { x: 0, y: 0 };
const p2 = { x: 1, y: 1 };  // same hidden class — fast

// ✗ Different property order → different hidden class → slower
const p3 = { y: 0, x: 0 };  // different hidden class!

// ✗ Adding properties after construction → new hidden class per property
const obj = {};
obj.x = 1;  // new hidden class
obj.y = 2;  // another new hidden class

// ✓ Declare all properties upfront
const obj = { x: 1, y: 2 };
```

---

## JavaScript Memory Model

### Stack vs Heap

```
Stack                          Heap
─────────────────              ─────────────────────────────
Primitives (by value)          Objects, Arrays, Functions
number, boolean, string*       (by reference)
null, undefined, symbol        Allocated dynamically
BigInt                         Garbage collected

* Strings are immutable — V8 may store them differently
  but they behave like primitives

let a = 5;          // stored on stack
let b = a;          // copy of value — b = 5, independent
b = 10;
console.log(a);     // 5 — unchanged

let obj1 = { x: 1 };  // reference on stack, object on heap
let obj2 = obj1;       // copy of REFERENCE — both point to same object
obj2.x = 99;
console.log(obj1.x);   // 99 — same object!
```

---

## Garbage Collection

### Mark and Sweep

```
V8 uses generational garbage collection:

Young Generation (Nursery):
- New objects allocated here
- Collected frequently (minor GC) — fast, most objects die young
- "Stop the world" pause (very brief — ~1ms)

Old Generation:
- Objects that survive several minor GCs are promoted here
- Collected less frequently (major GC) — slower
- V8 uses incremental marking (spread work over time) to reduce pauses

Mark phase: traverse all reachable objects from roots (global, stack)
            mark them as "alive"
Sweep phase: reclaim memory of unmarked objects
Compact phase: (sometimes) move surviving objects together, fix pointers
```

### Memory Leaks — How They Happen

```ts
// 1. Forgotten event listeners
function setup() {
    const bigData = new Array(1_000_000).fill('x');
    window.addEventListener('resize', () => {
        console.log(bigData.length); // bigData can't be GC'd — listener holds ref
    });
}
// Fix: remove listener when done
const handler = () => { ... };
window.addEventListener('resize', handler);
// cleanup:
window.removeEventListener('resize', handler);

// 2. Closures holding large scope
function outer() {
    const bigArray = new Array(1_000_000);
    return function inner() {
        return 42; // bigArray never used but closure keeps it alive!
    };
}

// 3. Detached DOM nodes
let detachedNode;
function detach() {
    const node = document.getElementById('myDiv');
    detachedNode = node;        // JS still references it
    node.parentNode.removeChild(node); // removed from DOM but NOT GC'd
}
// Fix: detachedNode = null when done

// 4. Global variables (accidentally)
function leak() {
    forgotVar = 'I am global'; // missing let/const/var → attaches to window
}

// 5. Timers not cleared
const id = setInterval(() => expensiveOperation(), 1000);
// If component unmounts but interval not cleared → memory leak
clearInterval(id); // always clean up

// 6. WeakMap/WeakRef for cache that should be GC-able
const cache = new WeakMap(); // when key object is GC'd, entry is removed automatically
```

### Detecting Memory Leaks

```
Chrome DevTools → Memory tab:
1. Take a heap snapshot
2. Do the action that might leak (navigate, open/close modal)
3. Take another snapshot
4. Compare — look for objects that grew unexpectedly

Performance tab:
- Record while performing actions
- Look for "sawtooth" memory pattern that doesn't come back down

Node.js:
node --inspect app.js
# Then connect Chrome DevTools
# Or use: process.memoryUsage()
```

---

## Browser Storage

### Comparison

```
Storage          Capacity    Sync?   Accessible   Sent with    Lifetime
────────────────────────────────────────────────────────────────────────────────
Cookie           ~4KB        Sync    JS + Server  Every request  Set by server
localStorage     ~5-10MB     Sync    JS only      Never          Until cleared
sessionStorage   ~5-10MB     Sync    JS only      Never          Until tab closes
IndexedDB        Hundreds MB Async   JS only      Never          Until cleared
Cache API        Large       Async   JS/SW        Never          Until cleared
```

### When to Use Each

```
Cookie:          Session tokens (HttpOnly), CSRF tokens, user preferences
                 that server needs. Small data.

localStorage:    Non-sensitive user preferences (theme, language), draft content.
                 Simple key-value, synchronous, don't store sensitive data.

sessionStorage:  Form data for a multi-step process within one tab session.
                 Cleared when tab closes — intentional.

IndexedDB:       Large structured data, offline apps, complex querying.
                 Async API — use a wrapper library (Dexie.js, idb).

Cache API:       Network response caching for service workers,
                 offline-first apps, static asset caching.
```

```ts
// IndexedDB with idb wrapper
import { openDB } from 'idb';

const db = await openDB('taskboard', 1, {
    upgrade(db) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' });
        store.createIndex('userId', 'userId');
    },
});

await db.put('tasks', { id: '1', title: 'Buy milk', userId: 'u1' });
const tasks = await db.getAllFromIndex('tasks', 'userId', 'u1');
```

---

## Service Workers

### What They Are

```
Service Worker = a script that runs in the background, separate from the page
- No DOM access
- Intercepts network requests (acts as a proxy)
- Enables: offline support, background sync, push notifications, caching
- Lifecycle: Install → Activate → Idle → Fetch/Message events

                    ┌─────────┐
    Page ←──────────┤   SW    ├──────── Network
    (can't talk     │         │         (SW can cache
     to SW directly)│  Cache  │          responses)
                    └─────────┘
```

```ts
// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered:', reg.scope);
    });
}

// sw.js — service worker file
const CACHE_NAME = 'v1';
const STATIC_ASSETS = ['/', '/index.html', '/app.js', '/styles.css'];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting(); // activate immediately
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: serve from cache, fall back to network (cache-first strategy)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Cache successful GET responses
                if (event.request.method === 'GET' && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
```

---

## Web Workers

```ts
// Problem: heavy computation blocks the main thread → UI freezes
// Solution: Web Worker — runs JS in a background thread (no DOM access)

// main.js
const worker = new Worker('/heavy-worker.js');

worker.postMessage({ type: 'process', data: largeDataset });

worker.onmessage = (event) => {
    console.log('Result:', event.data.result);
};

worker.onerror = (err) => console.error('Worker error:', err);

// heavy-worker.js (no window/document access)
self.onmessage = (event) => {
    if (event.data.type === 'process') {
        const result = heavyComputation(event.data.data); // doesn't block UI
        self.postMessage({ result });
    }
};

// SharedArrayBuffer — share memory between main thread and workers
// (requires COOP/COEP headers — security requirement)
const buffer = new SharedArrayBuffer(1024);
const array = new Int32Array(buffer);
worker.postMessage({ buffer }, [buffer]); // transfer ownership
```

---

## Browser Rendering Pipeline (Detailed)

```
1. Parse HTML → DOM tree
2. Parse CSS → CSSOM tree
3. Combine → Render tree (only visible nodes)
4. Layout (Reflow) → calculate position/size of each node
5. Paint → fill in pixels (color, text, images, shadows)
6. Composite → layers combined on GPU, displayed

Triggering each stage:
- JS changes DOM/CSSOM → may trigger Layout + Paint + Composite (slowest)
- Changing background-color → triggers Paint + Composite (skips Layout)
- Changing transform/opacity → triggers Composite only (fastest — GPU only)

CSS properties that only trigger composite (60fps animations):
transform: translate/scale/rotate
opacity
filter (sometimes)
will-change: transform  → hint browser to create a separate layer
```

---

## Most Asked Browser Internals Interview Questions

### "What is the difference between reflow and repaint?"

> **Reflow (Layout)**: recalculates the geometry of elements — position, size. Triggered by: adding/removing DOM nodes, changing width/height/margin/padding/font-size, reading layout properties (offsetWidth, getBoundingClientRect). Expensive — changes can cascade through the whole document. **Repaint**: redraws pixels without changing layout — triggered by color, background, visibility changes. Less expensive. **Composite only**: transform and opacity — only the GPU layer is updated, no CPU work. Rule: animate with `transform` and `opacity` for 60fps.

### "What is a memory leak in JavaScript and how do you find one?"

> A memory leak is memory that's allocated but never freed because the GC can't collect it (still reachable via reference). Common causes: forgotten event listeners, closures holding large scopes, detached DOM nodes, uncancelled timers/intervals, global variables. Find with Chrome DevTools Memory tab: take heap snapshots before and after an action, compare to find unexpected growth. In Node.js: `--inspect` flag + Chrome DevTools, or `process.memoryUsage()` to track heap growth over time.

### "How does the event loop interact with the browser rendering?"

> The browser targets 60fps = 1 frame every 16.7ms. The rendering happens between macrotask executions. If a macrotask (or many microtasks) takes more than 16.7ms, a frame is dropped — visible as jank. Long-running JS blocks rendering. Solutions: break work into smaller chunks with `setTimeout(fn, 0)` to yield to the renderer, use `requestAnimationFrame` for visual updates (runs before the next paint), use Web Workers for CPU-heavy work.

### "What is `requestAnimationFrame` and when do you use it?"

> `requestAnimationFrame(callback)` schedules a callback to run before the next browser paint — synchronized with the display refresh rate. Use for: animations (not `setInterval` — that's not synced to display), reading DOM measurements before a paint. The callback receives a timestamp. Cancel with `cancelAnimationFrame(id)`.

```ts
function animate(timestamp: number) {
    const elapsed = timestamp - startTime;
    element.style.transform = `translateX(${elapsed * 0.1}px)`;
    if (elapsed < 2000) requestAnimationFrame(animate); // continue until done
}
requestAnimationFrame(animate);
```
