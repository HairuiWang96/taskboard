# HTTP & Web Protocols — Senior Developer Deep Reference
**Priority: MEDIUM**

> Covers: HTTP/1.1, HTTP/2, HTTP/3, caching headers, cookies, CORS deep dive, and common interview questions.

---

## Table of Contents

1. [HTTP Fundamentals](#1-http-fundamentals)
2. [HTTP/1.1 vs HTTP/2 vs HTTP/3](#2-http11-vs-http2-vs-http3)
3. [Caching Headers](#3-caching-headers)
4. [Cookies — In Depth](#4-cookies--in-depth)
5. [CORS — Deep Dive](#5-cors--deep-dive)
6. [HTTP Methods & Idempotency](#6-http-methods--idempotency)
7. [HTTPS & TLS](#7-https--tls)
8. [WebSockets & Server-Sent Events](#8-websockets--server-sent-events)
9. [Common Interview Questions](#9-common-interview-questions)

---

## 1. HTTP Fundamentals

### Request structure

```
GET /api/users?page=2 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGci...
Content-Type: application/json
Accept: application/json
User-Agent: Mozilla/5.0 ...

[body — empty for GET]
```

```
POST /api/users HTTP/1.1
Host: api.example.com
Content-Type: application/json
Content-Length: 42

{"name": "Alice", "email": "alice@example.com"}
```

### Response structure

```
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/users/123
Cache-Control: no-store
X-Request-Id: abc-123

{"id": "123", "name": "Alice"}
```

### Status code families

```text
1xx — Informational
  100 Continue     — server received headers, client should send body

2xx — Success
  200 OK           — standard success
  201 Created      — resource created (POST)
  204 No Content   — success, no body (DELETE)
  206 Partial Content — range request fulfilled (video streaming, resumable uploads)

3xx — Redirection
  301 Moved Permanently  — permanent redirect (cached by browser forever)
  302 Found              — temporary redirect (not cached)
  304 Not Modified       — cached version is still valid (conditional GET)
  307 Temporary Redirect — same as 302 but preserves HTTP method
  308 Permanent Redirect — same as 301 but preserves HTTP method

4xx — Client Error
  400 Bad Request       — malformed request / validation error
  401 Unauthorized      — not authenticated
  403 Forbidden         — authenticated but not allowed
  404 Not Found         — resource doesn't exist
  405 Method Not Allowed — wrong HTTP method for this endpoint
  409 Conflict          — duplicate (email already taken)
  410 Gone              — resource permanently deleted
  422 Unprocessable     — valid JSON but semantically wrong
  429 Too Many Requests — rate limited

5xx — Server Error
  500 Internal Server Error — unexpected failure
  502 Bad Gateway           — upstream server returned invalid response
  503 Service Unavailable   — server temporarily down (maintenance, overload)
  504 Gateway Timeout       — upstream server timed out
```

---

## 2. HTTP/1.1 vs HTTP/2 vs HTTP/3

### HTTP/1.1

```text
Released: 1997. Still used everywhere.

Key features:
  - Persistent connections (keep-alive): reuse TCP connection for multiple requests
    (before: new TCP handshake per request — very slow)
  - Pipelining: send multiple requests without waiting for responses
    (rarely used in practice — head-of-line blocking still exists)

Problems:
  - Head-of-line blocking: if request 1 is slow, requests 2 and 3 wait behind it
  - No header compression: headers repeat on every request (User-Agent, Cookie, etc.)
  - Max 6 concurrent connections per host (browsers limit this)
  - Workarounds: domain sharding, CSS sprites, JS bundling, inlining — all hacks
```

### HTTP/2

```text
Released: 2015. Now standard on most web servers.

Key improvements:
  Multiplexing:
    Multiple requests/responses over ONE TCP connection simultaneously.
    No head-of-line blocking at the HTTP layer.
    Eliminates need for domain sharding, JS bundling (slightly) reduces need.

  Header compression (HPACK):
    Headers are compressed and common headers are sent only once.
    Reduces overhead significantly for APIs with many small requests.

  Binary protocol:
    HTTP/1.1 is text-based (human readable). HTTP/2 is binary (faster to parse).

  Server push (largely deprecated):
    Server can proactively send resources the client will need.
    e.g., browser requests index.html, server pushes style.css and app.js before asked.
    In practice: complex, often counterproductive. Not used much. Removed in Chrome 106.

  Stream prioritization:
    Client can signal which resources are more important.

Remaining problem:
  Still over TCP — TCP-level head-of-line blocking exists.
  If one TCP packet is lost, ALL HTTP/2 streams on that connection stall until retransmit.
```

### HTTP/3

```text
Released: 2022. ~30% of websites as of 2024.

Key change: replaces TCP with QUIC (UDP-based protocol)

QUIC solves:
  TCP head-of-line blocking: each QUIC stream is independent —
  a lost packet only stalls its own stream, not others.

  Connection migration: connections are identified by a connection ID, not IP:port.
  Switching from WiFi to 4G doesn't break connections (great for mobile).

  0-RTT handshake: for previously-visited servers, QUIC can send data in the FIRST packet.
  TCP+TLS = 2 round trips before data flows. QUIC = 0 or 1 round trips.

Used by: Google (all their services), Facebook, Cloudflare, AWS CloudFront.
```

### Comparison summary

```text
Feature               HTTP/1.1      HTTP/2         HTTP/3
─────────────────────────────────────────────────────────
Transport             TCP           TCP            QUIC (UDP)
Multiplexing          No            Yes            Yes
Head-of-line blocking Request-level None (HTTP)    None
Header compression    No            HPACK          QPACK
Encryption required   No            No (but de facto yes) Yes (built into QUIC)
Connection migration  No            No             Yes
Adoption              Universal     ~70%           ~30%
```

---

## 3. Caching Headers

### Cache-Control

```text
The primary caching directive. Controls who can cache, how long, and how.

Directives:
  max-age=N         — cache for N seconds (from response time)
  s-maxage=N        — max-age for shared caches (CDN) only, overrides max-age
  no-store          — never cache (sensitive data — bank statements, PHI)
  no-cache          — can cache but MUST revalidate with server before using
                      (despite the name, it DOES cache — just always checks)
  private           — only browser can cache, not CDNs/proxies
  public            — CDNs and proxies can cache
  must-revalidate   — once stale (past max-age), must revalidate before using
  immutable         — content will never change — browser won't revalidate
                      (use with content-hashed filenames: bundle.a1b2c3.js)
  stale-while-revalidate=N — serve stale while fetching fresh in background
```

```js
// Common patterns:

// Never cache (PHI, sensitive user data)
reply.header('Cache-Control', 'no-store');

// Always revalidate (dynamic but cacheable)
reply.header('Cache-Control', 'no-cache');

// Cache for 1 hour in browser, 1 day on CDN
reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');

// Immutable static assets (content-hashed filenames)
reply.header('Cache-Control', 'public, max-age=31536000, immutable');
// app.a1b2c3.js — filename changes when content changes — safe to cache forever

// Stale while revalidate (serve fast, update in background)
reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
// Use cached version for up to 60s. After 60s, serve stale but fetch fresh.
// User sees fast response; fresh data ready for next request.
```

### ETag and Last-Modified (conditional requests)

```js
// ETag: opaque identifier for a specific version of a resource
// Server sends: ETag: "abc123"
// Client sends back on next request: If-None-Match: "abc123"
// Server compares: if unchanged → 304 Not Modified (no body sent)

// Last-Modified: timestamp of last change
// Server sends: Last-Modified: Wed, 15 Jan 2024 10:00:00 GMT
// Client sends: If-Modified-Since: Wed, 15 Jan 2024 10:00:00 GMT
// Server: if not modified → 304

// In Fastify (automatic ETag support):
app.register(import('@fastify/etag'));
// Now GET responses automatically get an ETag header

// Manual ETag:
fastify.get('/api/resource', async (req, reply) => {
  const data = await getData();
  const etag = `"${hashData(data)}"`;

  if (req.headers['if-none-match'] === etag) {
    return reply.code(304).send(); // client has current version
  }

  reply.header('ETag', etag);
  return data;
});
```

### Vary header

```js
// Vary: tells CDNs to cache separate versions based on request headers
// Without Vary: CDN might serve a gzip response to a client that doesn't support it

// Vary on Accept-Encoding (almost always needed)
reply.header('Vary', 'Accept-Encoding');

// Vary on Accept-Language (serve different language versions)
reply.header('Vary', 'Accept-Language');

// Multiple:
reply.header('Vary', 'Accept-Encoding, Accept-Language');

// Warning: high Vary values reduce CDN cache efficiency
// Each unique combination of Vary header values = separate cache entry
```

---

## 4. Cookies — In Depth

### Cookie attributes

```js
// Set a cookie with all security attributes
reply.setCookie('session', sessionId, {
  httpOnly: true,     // cannot be read by JavaScript (XSS protection)
  secure: true,       // only sent over HTTPS
  sameSite: 'strict', // not sent on cross-site requests (CSRF protection)
  path: '/',          // available on all routes
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  domain: 'example.com', // available on example.com and subdomains
});
```

```text
Attribute     Values                  Purpose
────────────────────────────────────────────────────────────
HttpOnly      (flag)                  JS cannot read cookie — XSS protection
Secure        (flag)                  Only sent over HTTPS
SameSite      Strict / Lax / None     CSRF protection
  Strict: never sent on cross-site requests
  Lax: sent on top-level navigation (clicking a link), not on AJAX/fetch
  None: always sent cross-site (must also set Secure — for embedded widgets)
Path          /path                   Cookie sent only for requests to this path
Domain        example.com             Cookie sent to domain and all subdomains
Expires/Max-Age  date / seconds       Session cookie (no expiry) vs persistent
```

### Cookie types and storage decision

```text
Session cookie:    No Max-Age/Expires. Deleted when browser closes.
Persistent cookie: Has Max-Age or Expires. Survives browser restart.

Where to store JWT tokens:
  localStorage    → survives refresh, accessible to JS → XSS can steal it
  sessionStorage  → cleared on tab close, accessible to JS → XSS can steal it
  HttpOnly cookie → not accessible to JS → XSS CANNOT steal it

Recommended: store access token in memory (JS var), refresh token in HttpOnly cookie.
  - Access token (15min): JS memory → lost on refresh → use refresh cookie to renew
  - Refresh token (7d): HttpOnly cookie → safe from XSS, SameSite=Strict for CSRF

HIPAA context: HttpOnly cookies for anything authentication-related.
```

---

## 5. CORS — Deep Dive

### The same-origin policy

```text
Same-origin = same protocol + same host + same port.
  https://app.example.com:443 = origin
  https://app.example.com/api — SAME origin (path doesn't matter)
  http://app.example.com      — DIFFERENT (http vs https)
  https://api.example.com     — DIFFERENT (different subdomain)
  https://app.example.com:8080 — DIFFERENT (different port)

Browsers enforce same-origin policy on:
  fetch / XMLHttpRequest to a different origin
  Cookies (sent automatically to the same origin)
  JS access to iframes from different origins
  (Images, scripts, CSS — cross-origin loading is ALLOWED by default)
```

### Simple requests vs preflighted requests

```text
Simple request (no preflight needed):
  Methods: GET, POST, HEAD
  Headers: only safe headers (Accept, Content-Type: text/plain|form/multipart|urlencoded)
  Content-Type: application/json → NOT a simple request (triggers preflight)

Preflight request:
  Browser sends OPTIONS request first to check if server allows it
  Only then sends the actual request
  Triggered by: DELETE, PUT, PATCH; custom headers (Authorization, X-Custom); JSON body
```

```js
// What a preflight looks like:
OPTIONS /api/users HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization

// Server must respond with:
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400  // browser caches preflight result for 1 day

// Then browser sends the actual POST request
```

### CORS configuration in Fastify

```js
import cors from '@fastify/cors';

// Development
app.register(cors, {
  origin: 'http://localhost:5173',
  credentials: true, // allow cookies to be sent cross-origin
});

// Production — multiple allowed origins
app.register(cors, {
  origin: (origin, callback) => {
    const allowed = ['https://app.example.com', 'https://admin.example.com'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
});

// ✗ Never use in production:
origin: '*'  // AND credentials: true — these cannot coexist
// * with credentials is blocked by the browser — security restriction
```

### CORS for credentials (cookies)

```js
// Sending cookies cross-origin requires BOTH:
// 1. Server: Access-Control-Allow-Credentials: true (and specific origin, not *)
// 2. Client: credentials: 'include' in fetch options

fetch('https://api.example.com/data', {
  credentials: 'include', // sends cookies with cross-origin request
});

// Without credentials: 'include', cookies are NOT sent cross-origin
// Default: 'same-origin' (cookies only sent to same origin)
```

---

## 6. HTTP Methods & Idempotency

```text
Method      Idempotent  Safe    Body    Typical use
──────────────────────────────────────────────────────────
GET         Yes         Yes     No      Fetch data
HEAD        Yes         Yes     No      Same as GET but no body (metadata check)
POST        No          No      Yes     Create resource, non-idempotent actions
PUT         Yes         No      Yes     Full replace of a resource
PATCH       No*         No      Yes     Partial update
DELETE      Yes         No      No      Delete resource
OPTIONS     Yes         Yes     No      CORS preflight, discover capabilities

*PATCH is idempotent if implemented correctly but spec doesn't require it.

Idempotent: calling the same request N times = same result as calling it once.
  DELETE /users/1 called 3 times: first call deletes, next two calls → 404. Same end state.
  POST /users called 3 times: creates 3 users. Not idempotent.

Safe: no side effects — read-only.

Idempotency key (for POST):
  Client generates a unique key per request.
  Server stores: if key seen before, return cached response (don't re-execute).
  Prevents duplicate operations if client retries on network failure.

  POST /payments
  Idempotency-Key: uuid-v4-here
  { amount: 100 }
  // If request times out and client retries with same key → no duplicate charge
```

---

## 7. HTTPS & TLS

### TLS handshake

```text
TLS 1.3 handshake (simplified):
  1. Client Hello: client sends supported cipher suites + random number + key share
  2. Server Hello: server picks cipher suite, sends certificate + key share + random
  3. Client verifies certificate (is it signed by a trusted CA? Is it for this domain?)
  4. Both derive session keys from the key shares
  5. Data flows — encrypted with symmetric keys

TLS 1.3 advantages over TLS 1.2:
  - 1-RTT handshake (vs 2-RTT in TLS 1.2) — faster connection setup
  - 0-RTT resumption for previously visited servers
  - Removed weak algorithms (RSA key exchange, RC4, SHA-1, 3DES)

Certificate:
  - Contains: domain name, public key, issuer (CA), expiry date
  - Signed by a Certificate Authority (CA) — browser trusts CAs by default
  - Let's Encrypt: free, automated CA — no reason to pay for certs anymore
```

### HSTS (HTTP Strict Transport Security)

```js
// Tell browsers to ONLY use HTTPS for this domain (for max-age seconds)
reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

// After first HTTPS visit, browser refuses to make plain HTTP requests to this domain.
// Even if user types http:// — browser upgrades to https:// before sending.

// preload: submit your domain to browser preload lists
// (built into Chrome/Firefox — enforced from first ever visit, even without prior HTTPS visit)
// hstspreload.org — submit here
```

---

## 8. WebSockets & Server-Sent Events

### WebSocket vs SSE vs Long Polling

```text
Long Polling:
  Client makes a request, server holds it open until data is ready (or timeout).
  Then client immediately makes another request. Simulates real-time.
  Cons: high overhead (HTTP headers each request), latency from reconnect.

Server-Sent Events (SSE):
  One-directional: server → client only.
  Built on HTTP — works through proxies, no protocol upgrade.
  Auto-reconnects on disconnect.
  Use for: live feeds, notifications, progress updates.

WebSocket:
  Bidirectional: server ↔ client on a single persistent connection.
  Upgrades from HTTP → WS protocol.
  Lower overhead after connection established.
  Use for: chat, collaborative editing, live multiplayer.
```

```js
// SSE in Fastify
fastify.get('/events', async (req, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (data) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send events
  const interval = setInterval(() => sendEvent({ time: Date.now() }), 1000);

  req.raw.on('close', () => clearInterval(interval)); // cleanup on disconnect
});

// Client-side SSE
const source = new EventSource('/events');
source.onmessage = (e) => console.log(JSON.parse(e.data));
source.onerror   = () => source.close(); // handle disconnect

// Named events (SSE)
reply.raw.write(`event: taskUpdated\ndata: {"id": "123"}\n\n`);
source.addEventListener('taskUpdated', (e) => updateTask(JSON.parse(e.data)));
```

---

## 9. Common Interview Questions

### "What is the difference between HTTP/1.1 and HTTP/2?"

> HTTP/2 adds multiplexing — multiple requests over one TCP connection simultaneously, eliminating HTTP-level head-of-line blocking. HTTP/1.1 can only handle one request at a time per connection (pipelining was unreliable), requiring browsers to open 6+ connections per host. HTTP/2 also adds header compression (HPACK) and uses a binary framing layer instead of text. The downside: HTTP/2 still uses TCP, so a single lost packet blocks all streams (TCP head-of-line blocking) — solved by HTTP/3/QUIC.

### "What is CORS and how does it work?"

> CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts JavaScript from making HTTP requests to a different origin than the page it's on. When a browser detects a cross-origin request, it first sends a preflight OPTIONS request to ask the server if the real request is allowed. The server responds with `Access-Control-Allow-Origin` and related headers. If approved, the browser sends the actual request. Fix: add `@fastify/cors` plugin and configure the allowed origins.

### "What is the difference between no-cache and no-store?"

> `no-store` means never cache anything — not in the browser, not in any proxy. Use for sensitive data. `no-cache` means the response CAN be cached, but the browser must revalidate with the server before using it (sends a conditional GET). If the server says nothing changed (304), the cached version is used. Despite the name, `no-cache` does allow caching.

### "What is an ETag?"

> An ETag is an opaque identifier representing a specific version of a resource. The server includes it in responses. On subsequent requests, the client sends `If-None-Match: <etag>`. If the resource hasn't changed, the server returns `304 Not Modified` with no body — saving bandwidth. ETags are more reliable than `Last-Modified` because they're based on content, not timestamps.

### "What is the difference between PUT and PATCH?"

> PUT replaces the entire resource — you send the full representation. PATCH partially updates the resource — you send only the fields to change. PUT is idempotent: sending the same PUT request twice produces the same result. PATCH can be idempotent if designed carefully (e.g., `PATCH /users/1 { status: 'active' }`) but doesn't have to be.

### "How does HTTPS work?"

> HTTPS is HTTP over TLS. The TLS handshake establishes a shared secret: the client and server exchange public keys, verify the server's certificate is signed by a trusted Certificate Authority, and derive symmetric encryption keys. All subsequent HTTP traffic is encrypted with those symmetric keys. In TLS 1.3, this handshake takes one round trip.
