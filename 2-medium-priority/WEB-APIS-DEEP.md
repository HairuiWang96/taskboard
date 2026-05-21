# Web APIs Deep Reference

Senior frontend engineers are expected to know the browser platform, not just React. These are the native browser APIs that come up in interviews, enable performance optimisations, and power features that can't be done with a library alone.

---

## Web Workers

Run JavaScript in a background thread. The main thread stays unblocked — no UI freezing.

```text
Why: JavaScript is single-threaded. Heavy computation on the main thread
blocks rendering, animations, and user interactions.

Use for:
  - Image/video processing
  - Large data transformations (sorting 100K rows, parsing CSVs)
  - Cryptographic operations
  - Complex algorithm runs

Cannot do in a worker:
  - Access the DOM
  - Access window, document
  - Use most browser APIs (some are available: fetch, IndexedDB, WebSockets)
```

```typescript
// main.ts — create and communicate with a worker
const worker = new Worker(new URL('./heavy.worker.ts', import.meta.url), { type: 'module' });

// Send data to worker (data is copied, not shared)
worker.postMessage({ type: 'PROCESS', data: largeArray });

// Receive result from worker
worker.onmessage = (event) => {
  const { type, result } = event.data;
  if (type === 'DONE') {
    setProcessedData(result);
  }
};

worker.onerror = (error) => {
  console.error('Worker error:', error);
};

// Clean up when component unmounts
useEffect(() => {
  return () => worker.terminate();
}, []);

// heavy.worker.ts — runs in the background thread
self.onmessage = async (event) => {
  const { type, data } = event.data;

  if (type === 'PROCESS') {
    // This runs without blocking the UI
    const result = processLargeDataset(data);
    self.postMessage({ type: 'DONE', result });
  }
};

// Transferable objects — transfer ownership instead of copying (faster for large data)
// ArrayBuffer, TypedArray, ImageBitmap can be transferred
const buffer = new ArrayBuffer(1024 * 1024 * 10); // 10MB
worker.postMessage({ buffer }, [buffer]); // [buffer] = transfer, not copy
// buffer is now owned by the worker — can't use it in main thread anymore
```

### React hook for web workers

```typescript
function useWorker<TInput, TOutput>(workerFactory: () => Worker) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = workerFactory();
    return () => workerRef.current?.terminate();
  }, []);

  const run = useCallback((input: TInput): Promise<TOutput> => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current!;
      worker.postMessage(input);
      worker.onmessage = (e) => resolve(e.data);
      worker.onerror = reject;
    });
  }, []);

  return run;
}

// Usage
const runHeavyTask = useWorker(() => new Worker(new URL('./heavy.worker.ts', import.meta.url)));
const handleProcess = async () => {
  setLoading(true);
  const result = await runHeavyTask(data);
  setResult(result);
  setLoading(false);
};
```

---

## Service Workers

A service worker is a JavaScript file that runs separately from the page — it intercepts network requests and can cache responses. The foundation of PWAs (Progressive Web Apps).

```text
What service workers enable:
  - Offline support (serve cached content when no network)
  - Background sync (queue requests made offline, send when back online)
  - Push notifications (receive notifications even when app is closed)
  - Network request interception (cache strategies, A/B testing at network level)

Lifecycle:
  install → activate → idle (waiting for fetch events)
  
  install:  download and cache assets
  activate: clean up old caches
  fetch:    intercept requests, return from cache or network
```

```javascript
// service-worker.js (registered separately, runs in its own context)

const CACHE_NAME = 'app-v1';
const ASSETS_TO_CACHE = ['/', '/index.html', '/main.css', '/main.js'];

// Cache app shell on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting(); // activate immediately without waiting for old SW to go
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of existing pages immediately
});

// Intercept fetch — cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Cache-first: for static assets (CSS, JS, images)
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request))
    );
    return;
  }

  // Network-first: for API calls (fresh data, fall back to cache)
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)) // offline fallback
    );
    return;
  }

  // Stale-while-revalidate: return cache immediately, update in background
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then(response => {
        cache.put(request, response.clone());
        return response;
      });
      return cached ?? fetchPromise;
    })
  );
});
```

```typescript
// Register service worker in your app (main.ts)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  });
}

// In practice: use Workbox (Google's library) instead of hand-rolling
// npm install workbox-webpack-plugin
// Workbox handles caching strategies, versioning, and updates automatically
```

---

## IntersectionObserver

Fires a callback when an element enters or leaves the viewport. More performant than scroll event listeners.

```typescript
// Use cases: lazy loading images, infinite scroll, animation triggers,
// tracking what content the user saw (analytics)

// Basic usage
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        console.log('Element entered viewport');
        // load image, trigger animation, etc.
      }
    });
  },
  {
    root: null,           // null = viewport
    rootMargin: '200px',  // fire 200px before element enters viewport (preload)
    threshold: 0.1,       // fire when 10% of element is visible (0 = any pixel, 1 = fully visible)
  }
);

observer.observe(element);
observer.unobserve(element); // stop observing
observer.disconnect();       // stop observing all elements

// React hook
function useIntersectionObserver(
  ref: RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options?.rootMargin, options?.threshold]);

  return isIntersecting;
}

// Lazy image loading
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const isVisible = useIntersectionObserver(ref, { rootMargin: '200px' });

  return (
    <img
      ref={ref}
      src={isVisible ? src : undefined}
      alt={alt}
      style={{ minHeight: 200, backgroundColor: '#f0f0f0' }}
    />
  );
}

// Animation trigger — add class when element scrolls into view
function AnimatedSection({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const hasEntered = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasEntered.current) {
        ref.current?.classList.add('animate-in');
        hasEntered.current = true; // only animate once
        observer.disconnect();
      }
    }, { threshold: 0.2 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
```

---

## ResizeObserver

Fires when an element's size changes. More precise than `window.resize` for individual elements.

```typescript
// Use cases: responsive components, canvas resizing, chart redraws

function useElementSize(ref: RefObject<Element>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return size;
}

// Responsive chart — redraws when container resizes
function ResponsiveChart({ data }: { data: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(containerRef);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas width={width} height={width * 0.5} />
    </div>
  );
}
```

---

## IndexedDB

Client-side database for storing large amounts of structured data. Persists across page refreshes and browser restarts.

```text
When to use IndexedDB vs alternatives:
  localStorage:  < 5-10MB, key-value strings only, synchronous (blocks thread)
  sessionStorage: same as localStorage but cleared on tab close
  Cookies:        < 4KB, sent with every request, for auth tokens
  IndexedDB:      large amounts (GBs), structured data, async, offline-first apps
  Cache API:      HTTP response caching (used by service workers)
```

```typescript
// Raw IndexedDB is verbose — use a wrapper library: idb
import { openDB, DBSchema } from 'idb';

interface AppDB extends DBSchema {
  drafts: {
    key: string;
    value: { id: string; content: string; updatedAt: Date };
    indexes: { 'by-date': Date };
  };
  offlineQueue: {
    key: number;
    value: { action: string; payload: unknown; timestamp: Date };
    autoIncrement: true;
  };
}

const db = await openDB<AppDB>('app-db', 1, {
  upgrade(db) {
    const drafts = db.createObjectStore('drafts', { keyPath: 'id' });
    drafts.createIndex('by-date', 'updatedAt');

    db.createObjectStore('offlineQueue', { autoIncrement: true });
  },
});

// CRUD operations
await db.put('drafts', { id: 'draft-1', content: 'Hello', updatedAt: new Date() });
const draft = await db.get('drafts', 'draft-1');
await db.delete('drafts', 'draft-1');
const allDrafts = await db.getAll('drafts');

// Query by index
const recentDrafts = await db.getAllFromIndex('drafts', 'by-date');

// Use case: offline queue — store failed requests, replay when online
async function queueOfflineAction(action: string, payload: unknown) {
  await db.add('offlineQueue', { action, payload, timestamp: new Date() });
}

window.addEventListener('online', async () => {
  const queued = await db.getAll('offlineQueue');
  for (const item of queued) {
    await api.execute(item.action, item.payload);
    await db.delete('offlineQueue', item.id);
  }
});
```

---

## Clipboard API

Read from and write to the clipboard.

```typescript
// Copy text to clipboard
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied!');
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

// Read from clipboard (requires user gesture + permission)
async function pasteFromClipboard(): Promise<string> {
  const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
  if (permission.state === 'denied') throw new Error('Clipboard permission denied');
  return navigator.clipboard.readText();
}

// Copy rich content (HTML)
async function copyHtml(html: string, plainText: string) {
  const htmlBlob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([plainText], { type: 'text/plain' });
  await navigator.clipboard.write([
    new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob }),
  ]);
}

// React hook
function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return { copy, copied };
}
```

---

## Broadcast Channel API

Communicate between tabs/windows of the same origin.

```typescript
// Use cases: sync auth state across tabs, broadcast settings changes,
// notify other tabs when a resource is updated

const channel = new BroadcastChannel('app-updates');

// Send to all other tabs
channel.postMessage({ type: 'AUTH_CHANGED', user: null });

// Receive in all other tabs
channel.onmessage = (event) => {
  if (event.data.type === 'AUTH_CHANGED') {
    if (!event.data.user) {
      // Another tab logged out — redirect this tab too
      window.location.href = '/login';
    }
  }
};

// React hook
function useBroadcastChannel<T>(channelName: string, onMessage: (data: T) => void) {
  useEffect(() => {
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (e) => onMessage(e.data);
    return () => channel.close();
  }, [channelName, onMessage]);

  const broadcast = useCallback((data: T) => {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(data);
    channel.close();
  }, [channelName]);

  return broadcast;
}

// Usage: logout sync across tabs
function useAuthSync() {
  const broadcast = useBroadcastChannel<{ type: string }>('auth', (data) => {
    if (data.type === 'LOGOUT') {
      // Another tab logged out
      authStore.logout();
      navigate('/login');
    }
  });

  function logout() {
    authStore.logout();
    broadcast({ type: 'LOGOUT' }); // notify other tabs
    navigate('/login');
  }

  return { logout };
}
```

---

## Page Visibility API

Detect when the user switches tabs or minimises the browser.

```typescript
// Use cases: pause video/audio, stop polling, pause animations,
// track actual time user spent on page

function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return isVisible;
}

// Pause polling when tab is hidden
function usePolling(fn: () => void, interval: number) {
  const isVisible = usePageVisibility();

  useEffect(() => {
    if (!isVisible) return; // don't poll when tab is hidden
    fn(); // run immediately
    const id = setInterval(fn, interval);
    return () => clearInterval(id);
  }, [isVisible, interval]);
}

// Video player — pause when tab is hidden
function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVisible = usePageVisibility();

  useEffect(() => {
    if (!isVisible) {
      videoRef.current?.pause();
    }
  }, [isVisible]);

  return <video ref={videoRef} src={src} controls />;
}
```

---

## MutationObserver

Watch for DOM changes — useful for third-party integrations or legacy code where you can't control the source of changes.

```typescript
// Use cases: watch for dynamically injected content (ads, analytics, embeds),
// implement undo for DOM mutations, detect when third-party code changes your DOM

const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        console.log('Node added:', node);
      });
    }
    if (mutation.type === 'attributes') {
      console.log(`Attribute ${mutation.attributeName} changed`);
    }
  });
});

observer.observe(document.getElementById('target')!, {
  childList: true,    // watch for added/removed children
  subtree: true,      // watch all descendants
  attributes: true,   // watch attribute changes
  characterData: true // watch text content changes
});

observer.disconnect(); // stop watching
```

---

## Common Interview Questions

### "What is a Service Worker and what can you do with it?"

> A service worker is a JavaScript file that runs in a separate thread from the page — it has no DOM access but can intercept every network request the page makes. This makes it the foundation of offline-capable web apps: it can intercept a request, check a local cache, and return the cached response if there's no network. The main use cases are: offline support (cache the app shell and API responses), background sync (queue API calls made offline and replay them when the network returns), and push notifications (receive them even when the page is closed). In practice, most teams use Workbox (Google's library) rather than writing service worker logic by hand, as cache invalidation and update management are tricky to get right.

### "What is the difference between Web Workers and Service Workers?"

> Both run JavaScript off the main thread, but they serve different purposes. **Web Workers** are tied to a specific page — they're created by a page, communicate with it via `postMessage`, and die when the page closes. They're for offloading heavy computation (data processing, image manipulation, cryptography) so the UI doesn't freeze. **Service Workers** are independent from any page — they intercept network requests, can serve cached content, handle push notifications, and run in the background even when no page is open. A page can spawn multiple web workers; a service worker acts as a proxy for all requests from pages on a given origin. Neither can access the DOM.

### "When would you use IntersectionObserver over a scroll event listener?"

> IntersectionObserver is the better choice in almost every case. Scroll event listeners fire extremely frequently (dozens of times per second during scrolling), forcing layout calculations that run on the main thread — this creates jank. IntersectionObserver is managed by the browser natively and fires asynchronously only when an element crosses a threshold, with no main-thread work per scroll event. It's also more versatile: it works for any scrollable container (not just the window) and you can configure exact thresholds and margins. The only time a scroll listener still makes sense is when you need the exact scroll position value continuously — like for parallax effects or a custom scrollbar. For lazy loading, infinite scroll triggers, and animation entry points, always use IntersectionObserver.

### "How would you sync state across multiple browser tabs?"

> Two options. **BroadcastChannel API**: create a channel with a name, post messages, receive them in all other tabs of the same origin. This is the simplest approach for messages like "user logged out, redirect all tabs." **localStorage events**: writing to localStorage fires a `storage` event in all other tabs (not the one that wrote). Can be used as a primitive message bus, but BroadcastChannel is cleaner. For more complex shared state, you can use IndexedDB as a shared store that all tabs read from and write to. Service Workers can also act as a coordination layer — a tab posts a message to the service worker, which broadcasts to all clients. The auth logout case is the most common: user logs out in one tab → BroadcastChannel message → all other tabs redirect to /login.
