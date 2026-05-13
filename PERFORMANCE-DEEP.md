# Performance — Deep Reference

## Core Web Vitals (CWV)

> Google's metrics for user experience quality. Used in search ranking. Three main metrics:

```
LCP — Largest Contentful Paint    → loading performance
      Good: < 2.5s | Needs work: 2.5–4s | Poor: > 4s
      What: time until the largest visible element is rendered (hero image, h1)
      Fix: preload key resources, optimize images, reduce TTFB

FID → INP (Interaction to Next Paint) → interactivity
      Good: < 200ms | Needs work: 200–500ms | Poor: > 500ms
      What: delay between user interaction and browser response
      Fix: break up long tasks, defer non-critical JS, use web workers

CLS — Cumulative Layout Shift       → visual stability
      Good: < 0.1 | Needs work: 0.1–0.25 | Poor: > 0.25
      What: unexpected layout shifts during page load
      Fix: reserve space for images/ads (width/height attrs), avoid inserting DOM above content
```

---

## Frontend Performance

### Critical Rendering Path

> The browser's steps to turn HTML/CSS/JS into pixels. **DOM** (parse HTML) + **CSSOM** (parse CSS) → **Render Tree** → **Layout** → **Paint** → **Composite**. CSS blocks rendering (CSSOM must be complete before rendering). JS blocks parsing by default (parser-blocking). Optimize: minimize render-blocking resources, defer/async non-critical JS, inline critical CSS.

```html
<!-- Render-blocking — bad for performance -->
<link rel="stylesheet" href="styles.css">
<script src="app.js"></script>

<!-- async: downloads in parallel, executes when ready (may block parse) -->
<script async src="analytics.js"></script>

<!-- defer: downloads in parallel, executes after HTML parsed — preferred for app scripts -->
<script defer src="app.js"></script>

<!-- Preload critical resources — browser fetches early -->
<link rel="preload" href="hero.jpg" as="image">
<link rel="preload" href="font.woff2" as="font" crossorigin>
```

---

### Bundle Optimization

```ts
// Code splitting — dynamic import creates a separate chunk
const HeavyChart = lazy(() => import('./HeavyChart'));

// Tree shaking — import only what you use (works with ESM)
import { debounce } from 'lodash-es'; // ✓ tree-shakeable
import _ from 'lodash';               // ✗ imports entire library

// Analyze bundle size
// npx vite-bundle-visualizer  OR  npx webpack-bundle-analyzer

// Key strategies:
// - Split vendor chunks (React, etc.) separately — cached longer
// - Route-based code splitting (lazy load each page)
// - Compress with Brotli/gzip (server config)
// - Use CDN for static assets
```

```ts
// Vite chunk splitting config
build: {
    rollupOptions: {
        output: {
            manualChunks: {
                vendor: ['react', 'react-dom'],
                ui: ['@radix-ui/react-dialog', 'class-variance-authority'],
            }
        }
    }
}
```

---

### Image Optimization

```html
<!-- Modern formats: WebP (30% smaller than JPEG), AVIF (50% smaller) -->
<picture>
    <source srcset="hero.avif" type="image/avif">
    <source srcset="hero.webp" type="image/webp">
    <img src="hero.jpg" alt="Hero" width="800" height="400"
         loading="lazy"          <!-- defer off-screen images -->
         decoding="async">       <!-- don't block main thread
</picture>

<!-- Responsive images — browser picks right size -->
<img
    srcset="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
    sizes="(max-width: 600px) 480px, (max-width: 900px) 800px, 1200px"
    src="large.jpg" alt="...">
```

---

### React Performance

```tsx
// 1. React.memo — skip re-render if props shallowly equal
const TaskItem = React.memo(({ task, onToggle }) => (
    <li onClick={() => onToggle(task.id)}>{task.title}</li>
));

// 2. useMemo — expensive computation
const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.title.localeCompare(b.title)),
    [tasks]
);

// 3. useCallback — stable function reference for memo'd children
const handleToggle = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
}, []);

// 4. Virtualize long lists (react-window / TanStack Virtual)
import { FixedSizeList } from 'react-window';
<FixedSizeList height={600} itemCount={10000} itemSize={50}>
    {({ index, style }) => <div style={style}>{items[index].title}</div>}
</FixedSizeList>

// 5. Profiler — measure render time
import { Profiler } from 'react';
<Profiler id="TaskList" onRender={(id, phase, actualDuration) => {
    if (actualDuration > 16) console.warn(`Slow render: ${id} took ${actualDuration}ms`);
}}>
    <TaskList />
</Profiler>
```

---

### Caching Strategies

```
Strategy              When to use
──────────────────────────────────────────────────────────────
Cache-first           Offline-first apps, infrequently changing assets
Network-first         Dynamic content that must be fresh
Stale-while-revalidate Show cached immediately, update in background (best for most data)
Cache-only            Full offline support
Network-only          Never cache (auth, payments)
```

```ts
// HTTP cache headers
// Immutable assets (content hash in filename): cache forever
'Cache-Control': 'public, max-age=31536000, immutable'

// HTML: always revalidate (short cache, must check for updates)
'Cache-Control': 'no-cache'

// API responses: stale-while-revalidate
'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
```

---

## Backend Performance

### Database Query Optimization

```sql
-- EXPLAIN ANALYZE to find slow queries
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1 AND status = 'pending';

-- Missing index: Seq Scan → add composite index
CREATE INDEX CONCURRENTLY idx_orders_user_status ON orders(user_id, status);
-- CONCURRENTLY: builds without locking the table (production-safe)

-- N+1: fetch all needed data in one query
-- ✗ N+1: 1 query for tasks + N queries for assignees
-- ✓ JOIN: single query
SELECT t.*, u.name AS assignee_name
FROM tasks t
LEFT JOIN users u ON u.id = t.assignee_id
WHERE t.project_id = $1;

-- Pagination: cursor-based is faster than OFFSET for large datasets
-- ✗ OFFSET gets slower as offset grows (DB scans all skipped rows)
SELECT * FROM tasks ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- ✓ Cursor: always O(log n)
SELECT * FROM tasks
WHERE created_at < $cursor
ORDER BY created_at DESC
LIMIT 20;
```

---

### Caching at the Application Level

```ts
// Cache-aside pattern with Redis
async function getUser(id: string): Promise<User> {
    const cacheKey = `user:${id}`;

    // 1. Check cache
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // 2. Cache miss — fetch from DB
    const user = await db.select().from(users).where(eq(users.id, id)).get();
    if (!user) throw new NotFoundError();

    // 3. Store in cache with TTL
    await redis.setex(cacheKey, 300, JSON.stringify(user)); // 5 min TTL
    return user;
}

// Cache invalidation on update
async function updateUser(id: string, data: Partial<User>) {
    const updated = await db.update(users).set(data).where(eq(users.id, id)).returning();
    await redis.del(`user:${id}`); // invalidate cache
    return updated[0];
}
```

---

### Connection Pooling

```ts
// Without pooling: new DB connection per request (~50ms overhead, limited connections)
// With pooling: reuse connections from a pool

// Drizzle + postgres.js (built-in pooling)
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, {
    max: 20,        // max pool size (match your DB's max_connections / num_instances)
    idle_timeout: 30, // close idle connections after 30s
});

// PgBouncer: connection pooler in front of Postgres
// Handles thousands of app connections → dozens of real DB connections
```

---

## Performance Measurement

```ts
// Web Vitals measurement
import { onCLS, onLCP, onINP } from 'web-vitals';

onLCP(metric => sendToAnalytics({ name: metric.name, value: metric.value }));
onCLS(metric => sendToAnalytics({ name: metric.name, value: metric.value }));
onINP(metric => sendToAnalytics({ name: metric.name, value: metric.value }));

// Performance API — measure custom timings
performance.mark('task-render-start');
renderTasks();
performance.mark('task-render-end');
performance.measure('task-render', 'task-render-start', 'task-render-end');
const [measure] = performance.getEntriesByName('task-render');
console.log(`Rendered in ${measure.duration}ms`);
```

---

## Most Asked Performance Interview Questions

### "How would you improve a slow web page?"

> Systematic approach: 1) **Measure first** — Lighthouse audit, Chrome DevTools Performance tab, Web Vitals. Identify the bottleneck before guessing. 2) **Network**: reduce payload (compress, optimize images, tree-shake), reduce requests (bundle, sprites, HTTP/2 multiplexing), cache aggressively. 3) **Rendering**: eliminate render-blocking resources, defer non-critical CSS/JS, lazy-load below-fold content. 4) **JavaScript**: profile with DevTools, find long tasks, code-split, virtualize large lists. 5) **Backend**: check TTFB (Time To First Byte) — if slow, it's server-side.

### "What is TTFB and how do you improve it?"

> Time To First Byte — time from browser sending request to receiving the first byte of the response. Affected by: server processing time, database query speed, network latency. Improve with: caching responses (Redis, CDN), database indexing, moving servers geographically closer to users (CDN edge), reducing server computation (optimize hot code paths), using a CDN for static content.

### "What causes layout thrashing and how do you prevent it?"

> Layout thrashing (forced synchronous layout) happens when you read a layout property (offsetWidth, getBoundingClientRect) immediately after writing to the DOM — forcing the browser to recalculate layout synchronously. Each read-write pair triggers a full layout recalculation. Fix: batch all reads first, then all writes. Use `requestAnimationFrame` to schedule DOM writes.

```js
// ✗ Layout thrashing — forces layout on every iteration
elements.forEach(el => {
    const width = el.offsetWidth; // read (forces layout)
    el.style.width = width * 2 + 'px'; // write
});

// ✓ Batch reads, then writes
const widths = elements.map(el => el.offsetWidth); // all reads
elements.forEach((el, i) => el.style.width = widths[i] * 2 + 'px'); // all writes
```
