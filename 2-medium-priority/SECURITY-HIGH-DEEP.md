# Web Security — Senior Developer Deep Reference
**Priority: HIGH** — Especially critical for HIPAA-regulated platforms (Solace Health context)

> Covers: OWASP Top 10, XSS, CSRF, injection attacks, security headers, authentication security, input validation, HIPAA-specific requirements.

---

## Table of Contents

1. [OWASP Top 10](#1-owasp-top-10)
2. [XSS — Cross-Site Scripting](#2-xss--cross-site-scripting)
3. [CSRF — Cross-Site Request Forgery](#3-csrf--cross-site-request-forgery)
4. [Injection Attacks](#4-injection-attacks)
5. [Authentication & Session Security](#5-authentication--session-security)
6. [Security Headers](#6-security-headers)
7. [Input Validation & Sanitization](#7-input-validation--sanitization)
8. [Secrets & Environment Security](#8-secrets--environment-security)
9. [HIPAA Technical Safeguards](#9-hipaa-technical-safeguards)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. OWASP Top 10

```text
OWASP (Open Web Application Security Project) publishes the top 10 most
critical web security risks. Know these — they come up in every security interview.

2021 list:
  A01 Broken Access Control      ← #1 most common. Users accessing other users' data.
  A02 Cryptographic Failures     ← Sensitive data in plaintext, weak encryption.
  A03 Injection                  ← SQL, OS command, LDAP injection.
  A04 Insecure Design            ← Missing threat modeling, no rate limiting.
  A05 Security Misconfiguration  ← Default creds, open S3 buckets, verbose errors.
  A06 Vulnerable Components      ← Using packages with known CVEs.
  A07 Auth Failures              ← Weak passwords, no MFA, brute force possible.
  A08 Software & Data Integrity  ← Unverified dependencies, insecure CI/CD.
  A09 Logging Failures           ← No audit trail, login failures not logged.
  A10 SSRF                       ← Server fetching URLs controlled by attacker.
```

---

## 2. XSS — Cross-Site Scripting

### How it works

```text
XSS: attacker injects malicious JavaScript into a page that other users see.
The browser executes it because it trusts the page's origin.

Three types:
  Stored (Persistent) — injected script is saved in the DB and served to all users
    Example: comment field that stores <script>sendCookiesTo(attacker)</script>

  Reflected — malicious script is in the URL, server reflects it back
    Example: /search?q=<script>...</script>  → server renders it in the HTML

  DOM-based — no server involvement; JS reads URL/hash and writes to DOM unsafely
    Example: document.innerHTML = location.hash
```

### What an attacker can do

```text
- Steal session cookies (document.cookie) → hijack the user's account
- Keylog passwords typed on the page
- Redirect to a phishing site
- Make requests on behalf of the user (same-origin, bypasses CSRF)
- Access localStorage / sessionStorage (tokens stored there)
```

### Prevention

```js
// 1. Never inject untrusted data into HTML — use textContent, not innerHTML
// ✗ Vulnerable
element.innerHTML = userInput;

// ✓ Safe — browsers treat this as text, not HTML
element.textContent = userInput;

// 2. In React — JSX automatically escapes by default
// ✓ Safe — React escapes the value
const name = '<script>alert(1)</script>';
return <div>{name}</div>; // renders as text, not executed

// ✗ Explicitly unsafe — only use with sanitized HTML
return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;

// 3. If you must render HTML — sanitize with DOMPurify first
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirtyHtml); // strips dangerous tags/attrs
element.innerHTML = clean;

// 4. Content Security Policy (see Section 6) — last line of defense
// Blocks inline scripts even if injection succeeds
```

### CSP as defense-in-depth

```text
Content-Security-Policy: script-src 'self' 'nonce-abc123'

Even if XSS injection succeeds, CSP blocks the script from running
because it doesn't have the correct nonce or isn't from an allowed origin.
```

---

## 3. CSRF — Cross-Site Request Forgery

### How it works

```text
CSRF: attacker tricks a user's browser into making a request to your server.
The browser automatically includes the user's cookies — so the server thinks it's legitimate.

Example:
  1. User logs into bank.com (has a session cookie)
  2. User visits evil.com while still logged in
  3. evil.com's page has: <img src="https://bank.com/transfer?to=attacker&amount=1000">
  4. The browser makes a GET request to bank.com — WITH the session cookie
  5. Bank transfers the money
```

### Prevention

```js
// 1. CSRF tokens (traditional server-rendered apps)
// Server generates a random token, puts it in the form, validates on submit
// Attacker can't read the token from another origin (same-origin policy)
<input type="hidden" name="csrf_token" value="<random_token>" />

// 2. SameSite cookie attribute (modern, most effective)
// Tells the browser NOT to send the cookie on cross-site requests
Set-Cookie: session=abc123; SameSite=Strict; HttpOnly; Secure

// SameSite=Strict  — cookie never sent on cross-site requests
// SameSite=Lax     — cookie sent on top-level navigations (link clicks) but not on subresource loads
// SameSite=None    — sent everywhere (must also set Secure — HTTPS only)

// 3. Check the Origin/Referer header
// Reject requests where Origin doesn't match your domain
app.addHook('preHandler', async (req, reply) => {
  const origin = req.headers.origin;
  if (origin && origin !== 'https://yourapp.com') {
    return reply.code(403).send({ error: 'CSRF check failed' });
  }
});

// 4. JWT in Authorization header (REST APIs)
// CSRF only affects cookie-based auth. If you use JWT in Authorization header,
// CSRF is not possible — browsers don't auto-send custom headers cross-origin
fetch('/api/data', {
  headers: { Authorization: `Bearer ${token}` }
});
// ✓ No CSRF risk — attacker can't set this header from evil.com
```

---

## 4. Injection Attacks

### SQL Injection

```js
// ✗ Vulnerable — string concatenation with user input
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
// Attacker sends: email = ' OR '1'='1
// Query becomes: SELECT * FROM users WHERE email = '' OR '1'='1'
// Returns ALL users

// ✗ Worse — attacker sends: '; DROP TABLE users; --
// Query: SELECT * FROM users WHERE email = ''; DROP TABLE users; --'

// ✓ Always use parameterized queries / prepared statements
// pg (node-postgres)
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [req.body.email]  // parameter is NEVER interpreted as SQL
);

// ✓ Drizzle ORM — parameterized by default
const user = await db.select().from(users).where(eq(users.email, req.body.email));

// ✓ Raw SQL in Drizzle — use sql`` template tag
import { sql } from 'drizzle-orm';
const result = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);
// The sql tag parameterizes automatically

// Never: db.execute(sql.raw(`SELECT * FROM users WHERE id = ${userId}`))
// sql.raw() bypasses parameterization
```

### Command Injection

```js
import { exec } from 'child_process';

// ✗ Vulnerable — user input in shell command
exec(`convert ${req.body.filename} output.jpg`);
// Attacker sends: filename = "input.jpg; rm -rf /"

// ✓ Use execFile — does NOT invoke a shell (no injection possible)
import { execFile } from 'child_process';
execFile('convert', [req.body.filename, 'output.jpg']);
// Arguments are passed directly to the process, not through a shell

// ✓ Validate/sanitize filenames before any file operation
const safe = path.basename(req.body.filename); // strips directory traversal
if (!/^[\w\-. ]+$/.test(safe)) throw new Error('Invalid filename');
```

### Path Traversal

```js
// ✗ Vulnerable — user can request ../../../etc/passwd
const filePath = path.join(__dirname, 'uploads', req.params.filename);
// req.params.filename = '../../../../etc/passwd'

// ✓ Resolve and verify the path stays within the allowed directory
const uploadsDir = path.resolve(__dirname, 'uploads');
const requested = path.resolve(uploadsDir, req.params.filename);

if (!requested.startsWith(uploadsDir + path.sep)) {
  return reply.code(403).send({ error: 'Access denied' });
}
// Now safe to serve the file
```

---

## 5. Authentication & Session Security

### Password storage

```js
// ✗ Never store plaintext passwords
// ✗ Never use MD5 or SHA-1 — too fast, rainbow table attacks

// ✓ Use bcrypt, argon2, or scrypt — slow by design
import bcrypt from 'bcrypt';

const ROUNDS = 12; // cost factor — higher = slower = more secure (12-14 is standard)

// On registration
const hash = await bcrypt.hash(password, ROUNDS);
await db.insert(users).values({ email, passwordHash: hash });

// On login
const user = await db.select().from(users).where(eq(users.email, email)).get();
const valid = await bcrypt.compare(password, user.passwordHash);
if (!valid) return reply.code(401).send({ error: 'Invalid credentials' });

// Argon2 (stronger, recommended for new projects)
import argon2 from 'argon2';
const hash = await argon2.hash(password);
const valid = await argon2.verify(hash, password);
```

### Brute force protection

```js
// Rate limit login attempts per IP and per account
import rateLimit from '@fastify/rate-limit';

// Global rate limit
app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// Tighter limit on auth routes
fastify.post('/auth/login', {
  config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
}, async (req, reply) => { ... });

// Account lockout after N failures (store attempt count in Redis or DB)
// Lock for 15-30 minutes — balance security vs UX

// Never reveal which is wrong — email or password
// ✗ "Email not found" — confirms email enumeration
// ✓ "Invalid email or password" — same message always

// Timing attack: use bcrypt.compare even when user not found
// (otherwise timing difference reveals which emails exist)
const user = await findUser(email);
const hash = user?.passwordHash ?? '$2b$12$invalid_hash_to_prevent_timing_attack';
const valid = await bcrypt.compare(password, hash);
if (!user || !valid) return reply.code(401).send({ error: 'Invalid email or password' });
```

### JWT security

```js
// Secure JWT practices
const token = jwt.sign(payload, SECRET, {
  expiresIn: '15m',     // short-lived access tokens
  issuer: 'yourapp.com',
  audience: 'yourapp.com',
});

// Refresh token pattern (solve short expiry UX problem)
// Access token:  15 min expiry, stored in memory (not localStorage)
// Refresh token: 7-30 days, stored in HttpOnly cookie (not accessible to JS)

// On refresh: client sends refresh cookie → server validates → issues new access token
// Attacker who steals access token can only use it for 15 min max

// Token storage:
// localStorage   → accessible to JS (XSS can steal it) — avoid for sensitive apps
// sessionStorage → same problem
// HttpOnly cookie → cannot be read by JS — safe from XSS, use SameSite against CSRF
// Memory (JS var) → safest, lost on page refresh

// Revocation: JWTs can't be revoked before expiry
// Fix: store a "token version" in DB. Include version in JWT. Check on each request.
// Or: keep a blacklist of revoked JTIs in Redis
```

### Session management

```js
// Session ID requirements
// - Long (128+ bits of entropy)
// - Random (crypto.randomBytes, not Math.random)
// - Rotate on privilege escalation (login, sudo-like actions)

import crypto from 'crypto';
const sessionId = crypto.randomBytes(32).toString('hex'); // 256-bit

// Secure session cookie
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict; Path=/
// HttpOnly: no JS access (XSS protection)
// Secure: HTTPS only
// SameSite: CSRF protection
// Short Path: limit scope
```

---

## 6. Security Headers

```js
// In Fastify — add all security headers at once with @fastify/helmet
import helmet from '@fastify/helmet';

app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],        // only scripts from own origin
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs inline styles
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],       // fetch/XHR only to own origin
      frameAncestors: ["'none'"],   // equivalent of X-Frame-Options: DENY
    },
  },
});

// What each header does:
```

```text
Content-Security-Policy (CSP)
  Controls what resources the browser is allowed to load.
  scriptSrc: 'self' — only execute scripts from your own domain.
  Blocks injected scripts even if XSS injection succeeds.

Strict-Transport-Security (HSTS)
  Tells browsers to ONLY use HTTPS for this domain (for 1 year).
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  After first visit, browser refuses plain HTTP forever.

X-Frame-Options
  Prevents your page from being embedded in an <iframe>.
  Blocks clickjacking: attacker overlays invisible iframe on top of their page.
  X-Frame-Options: DENY  (or CSP: frame-ancestors 'none')

X-Content-Type-Options
  X-Content-Type-Options: nosniff
  Prevents browser from guessing content type (MIME sniffing attacks).
  Without this: a .txt file with HTML content could be rendered as HTML.

Referrer-Policy
  Controls how much of the URL is sent in the Referer header.
  Referrer-Policy: strict-origin-when-cross-origin
  PHI apps: use 'no-referrer' — don't leak URL paths to third parties.

Permissions-Policy (formerly Feature-Policy)
  Disable browser features you don't need.
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 7. Input Validation & Sanitization

```js
// Rule: validate at every trust boundary (HTTP requests, message queue, file uploads)
// Never trust: req.body, req.params, req.query, req.headers, file contents

// ✓ Validate with Zod at the route level
const CreateUserSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().min(1).max(100).trim(),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin']),  // whitelist, never accept raw role strings from client
});

// ✓ File upload validation
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

if (!ALLOWED_TYPES.includes(file.mimetype)) {
  return reply.code(400).send({ error: 'Invalid file type' });
}
if (file.size > MAX_SIZE) {
  return reply.code(400).send({ error: 'File too large' });
}
// Also: check file magic bytes (not just extension/MIME) for true type detection

// ✓ Mass assignment protection — only accept expected fields
// ✗ Vulnerable: directly inserting req.body into DB
await db.insert(users).values(req.body); // attacker sends { role: 'admin' }

// ✓ Safe: explicitly pick only the fields you want
const { email, name } = req.body;
await db.insert(users).values({ email, name, role: 'user' }); // role always set by server

// ✓ Return only necessary data (principle of least data)
// ✗ SELECT * — might include password hashes, internal flags
// ✓ SELECT id, name, email — explicit columns
const { passwordHash, ...publicUser } = user; // never send passwordHash to client
```

### Output encoding

```js
// Encode data for the context it's placed in
// HTML context: use React JSX (auto-escapes) or textContent
// URL context: encodeURIComponent()
// JSON context: JSON.stringify() (don't string-concat JSON)
// SQL context: parameterized queries

const url = `/search?q=${encodeURIComponent(userInput)}`; // encode for URL
const safeHtml = DOMPurify.sanitize(userHtml);            // sanitize HTML
```

---

## 8. Secrets & Environment Security

```js
// ✗ Never hardcode secrets
const SECRET = 'my-super-secret-key'; // hardcoded → ends up in git history forever

// ✓ Always use environment variables
const SECRET = process.env.JWT_SECRET;

// ✓ Validate at startup — fail fast if missing
import { z } from 'zod';
const env = z.object({
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
}).parse(process.env);

// ✓ Secret rotation: design so secrets can be changed without downtime
// - Support multiple valid signing keys simultaneously during rotation
// - JWT kid (key ID) header lets you look up which key was used

// ✓ .gitignore — always ignore
.env
.env.local
.env.production
*.pem
*.key

// ✓ Git history scanning
// If you accidentally commit a secret:
// 1. Revoke it IMMEDIATELY (rotate the key/token) — assume it's compromised
// 2. Remove from history with git filter-repo (not git filter-branch — deprecated)
// 3. Force push (after team is aligned)

// ✓ Secret management in production
// AWS Secrets Manager, HashiCorp Vault, or at minimum encrypted env vars in CI/CD
// Never store secrets in plaintext in CI/CD env vars if avoidable
```

---

## 9. HIPAA Technical Safeguards

```text
HIPAA requires these technical controls for any system handling PHI:

1. Access Control
   - Unique user identification — no shared accounts
   - Automatic logoff — idle sessions expire
   - Role-based access — minimum necessary access
   - Audit controls — log all PHI access

2. Audit Controls
   - Who accessed what PHI, when, from where
   - Immutable audit log (append-only — even admins can't delete)
   - Log: user ID, timestamp, resource accessed, action (view/edit/delete)
   - Retain logs for 6 years minimum

3. Integrity
   - Protect PHI from improper alteration/destruction
   - Checksums on sensitive files
   - Soft deletes (mark deleted, never hard-delete PHI records)

4. Transmission Security
   - Encrypt PHI in transit — TLS 1.2+ minimum, TLS 1.3 preferred
   - No PHI in URLs or query strings (appears in server logs)
   - No PHI in error messages or logs

5. Encryption at Rest
   - Database encryption (AWS RDS with encryption enabled)
   - S3 bucket encryption (SSE-S3 or SSE-KMS)
   - Backups encrypted
```

```js
// PHI in code — what NOT to do
// ✗ PHI in logs (violates HIPAA even if logs are internal)
console.log(`User ${user.name} has diagnosis ${user.diagnosis}`);
app.log.info({ user }); // if user has PHI fields

// ✓ Log user IDs only, never PHI values
app.log.info({ userId: user.id, action: 'viewed_record', resourceId: recordId });

// ✗ PHI in URLs (server logs, browser history, Referer header)
GET /patients/search?name=John+Smith&dob=1985-01-15

// ✓ PHI in POST body (encrypted in transit, not logged by default)
POST /patients/search
{ "name": "John Smith", "dob": "1985-01-15" }

// ✓ Row-level security — patients see only their own data
const record = await db.select()
  .from(records)
  .where(
    and(eq(records.id, recordId), eq(records.patientId, req.user.userId))
  )
  .get();
// Even if an attacker manipulates recordId, they can only get their own records

// ✓ Audit log on every PHI access
async function getPatientRecord(recordId: string, actorId: string) {
  const record = await db.select().from(records).where(eq(records.id, recordId)).get();

  // Audit log — always, even on failure
  await db.insert(auditLog).values({
    actorId,
    action: 'READ',
    resourceType: 'patient_record',
    resourceId: recordId,
    timestamp: new Date(),
    success: !!record,
  });

  return record;
}
```

---

## 10. Common Interview Questions

### "What is XSS and how do you prevent it?"

> XSS is when an attacker injects malicious JavaScript into a page that other users see. Three types: stored (saved in DB), reflected (in URL), DOM-based (JS reads attacker-controlled data). Prevention: escape output (React JSX does this by default), never use `innerHTML` with untrusted data, use DOMPurify if you must render HTML, add a Content Security Policy header as defense-in-depth.

### "What is the difference between XSS and CSRF?"

> XSS: attacker injects code that runs IN your site — exploits the user's trust in the site. CSRF: attacker tricks the user's browser into making requests TO your site using the user's existing session. XSS is about code injection; CSRF is about forged requests. JWT in an Authorization header is immune to CSRF (browsers don't auto-send custom headers). HttpOnly cookies protect against XSS stealing tokens.

### "How do you store passwords securely?"

> Hash with bcrypt or argon2 — never MD5/SHA-1 (too fast). bcrypt with cost factor 12+. Never store plaintext. Always compare with the library's compare function (timing-safe). Same error message whether email or password is wrong (prevent enumeration). Rate-limit login attempts.

### "What are security headers and which ones matter most?"

> Headers that tell the browser how to behave for security. Most important: Content-Security-Policy (blocks injected scripts, restricts resource origins), Strict-Transport-Security (force HTTPS), X-Frame-Options/frame-ancestors (block clickjacking), X-Content-Type-Options: nosniff (prevent MIME sniffing). In Fastify: `@fastify/helmet` sets all of these.

### "How do you prevent SQL injection?"

> Always use parameterized queries — never concatenate user input into SQL strings. With ORMs like Drizzle, injection is prevented by default. With raw queries, use the `sql` template tag which parameterizes automatically. Never use `sql.raw()` with user input.

### "What is the principle of least privilege?"

> Every component should have access to only what it needs — nothing more. Examples: DB user only has SELECT/INSERT/UPDATE on specific tables (not DROP); API route handlers can only read the user's own data (row-level access check); frontend tokens have limited scope; IAM roles have minimal permissions. Applied at every layer: code, DB, infrastructure, human access.

---

## Most Asked Security Interview Questions

### "What is the OWASP Top 10 and which are most important to know?"

> The OWASP Top 10 is the standard list of most critical web security risks. Most important: **Injection** (SQL, command — use parameterized queries). **Broken Authentication** (weak sessions, no rate limiting). **XSS** (injecting scripts — sanitize output). **Broken Access Control** (users accessing other users' data — always authorize server-side). **Security Misconfiguration** (default passwords, open S3 buckets, debug mode in prod). **SSRF** (server making requests to internal services based on user input).

### "What is XSS and how do you prevent it?"

> Cross-Site Scripting: attacker injects malicious script into a page served to other users. **Stored XSS**: script saved in DB, served to all visitors. **Reflected XSS**: script in URL, executed when victim visits link. **DOM XSS**: client-side JS writes attacker-controlled data into the DOM. Prevention: escape all output (React does this by default with JSX), never use `dangerouslySetInnerHTML` with user data, set Content-Security-Policy header, use `HttpOnly` cookies (JS can't read them).

```jsx
// ✗ XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />
element.innerHTML = userInput;

// ✓ React escapes automatically
<div>{userInput}</div>

// ✓ If you must render HTML — sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### "What is CSRF and how do you prevent it?"

> Cross-Site Request Forgery: a malicious site tricks a logged-in user's browser into making a request to your site — the browser automatically sends cookies. Prevention: **CSRF tokens** — server generates a random token, embeds in forms, validates on submission (attacker's site can't read your page to get the token). **SameSite cookie attribute** — `SameSite=Lax/Strict` prevents cookies from being sent on cross-site requests. Modern SPAs using `Authorization: Bearer` headers are not vulnerable (browsers don't auto-send custom headers cross-origin).

### "What is SQL injection and how do you prevent it?"

> SQL injection: user input is concatenated into a SQL query, allowing attackers to alter the query logic — access other users' data, bypass login, drop tables. Prevention: **always use parameterized queries** or prepared statements. ORMs handle this automatically. Never build queries with string concatenation. Input validation is a secondary defense, not sufficient alone.

```js
// ✗ SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`;
// email = "' OR '1'='1" → returns all users

// ✓ Parameterized query
const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
```

### "What is the difference between authentication and authorization?"

> **Authentication** (AuthN) — verifying WHO you are: login with password, OAuth, biometrics. **Authorization** (AuthZ) — verifying WHAT you're allowed to do: can this user access this resource? Authentication always comes first. Common mistake: checking auth on the frontend only — authorization MUST be enforced server-side on every request. Frontend checks are UX only.

### "How do HTTPS and TLS work?"

> TLS (Transport Layer Security) encrypts data in transit. The handshake: 1) Client sends supported cipher suites. 2) Server sends its certificate (contains public key, signed by a trusted CA). 3) Client verifies certificate. 4) They negotiate a session key using asymmetric encryption (RSA or Diffie-Hellman). 5) All subsequent communication encrypted with the symmetric session key (AES). HTTPS = HTTP over TLS. Prevents eavesdropping and man-in-the-middle attacks.

### "What is Content Security Policy (CSP)?"

> CSP is an HTTP response header that whitelists allowed sources for scripts, styles, images, etc. It's the most powerful XSS mitigation — even if an attacker injects a `<script>` tag, the browser refuses to execute it if the source isn't whitelisted.

```
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com; object-src 'none'
```

### "What are security headers every web app should have?"

```
Strict-Transport-Security: max-age=31536000; includeSubDomains  (force HTTPS)
X-Content-Type-Options: nosniff                                  (prevent MIME sniffing)
X-Frame-Options: DENY                                            (prevent clickjacking)
Content-Security-Policy: default-src 'self'                      (XSS mitigation)
Referrer-Policy: strict-origin-when-cross-origin                 (control referrer info)
Permissions-Policy: camera=(), microphone=()                     (disable browser features)
```

### "What is SSRF (Server-Side Request Forgery)?"

> SSRF: attacker tricks the server into making HTTP requests to internal services (AWS metadata endpoint, internal APIs, databases) that the attacker can't reach directly. Example: a URL preview feature that fetches user-provided URLs could be exploited with `http://169.254.169.254/latest/meta-data/` (AWS metadata). Prevention: allowlist valid external domains, block requests to private IP ranges (10.x, 172.16.x, 192.168.x, 169.254.x), use a dedicated fetch proxy.

### "What is the principle of least privilege?"

> Every component (user, service, process, API key) should have only the minimum permissions needed to do its job — nothing more. Examples: database user for the app should only have SELECT/INSERT/UPDATE on needed tables, not DROP or access to other DBs. AWS IAM roles scoped to specific resources. API keys with limited scopes. Regular users shouldn't have admin access. Limits blast radius when credentials are compromised.

### "How do you securely store passwords?"

> Never store plaintext passwords. Never use MD5/SHA1/SHA256 directly — they're too fast (billions/sec with GPUs). Use a purpose-built slow hash: **bcrypt** (most common), **Argon2** (recommended for new projects — winner of Password Hashing Competition), **scrypt**. These are intentionally slow and have a cost factor you can increase over time. Always use a salt (bcrypt does this automatically) to prevent rainbow table attacks.

```js
const bcrypt = require('bcrypt');

// Hash on registration
const hash = await bcrypt.hash(password, 12); // 12 = cost factor
await db.query('INSERT INTO users (password_hash) VALUES ($1)', [hash]);

// Verify on login
const match = await bcrypt.compare(inputPassword, storedHash);
if (!match) return res.status(401).json({ error: 'Invalid credentials' });
```
