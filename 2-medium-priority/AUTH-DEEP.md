# Authentication & Authorization — Senior Deep Reference

---

## Core Concepts

```text
Authentication (AuthN): Who are you?  → verify identity (password, token, biometric)
Authorization  (AuthZ): What can you do? → verify permissions (RBAC, ABAC, scopes)

Session-based: server stores state (session store). Cookie holds session ID.
Token-based:   server is stateless. Client holds the token (JWT). Server just validates.
```

---

## Session-Based Auth

```text
1. User POSTs credentials → server validates
2. Server creates session (random ID + user data) → stores in Redis/DB
3. Server sets cookie: Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Strict
4. Subsequent requests: browser sends cookie automatically
5. Server looks up session_id in store → gets user

Flow: Client → [Cookie: session_id=abc] → Server → Redis.get(abc) → User{id:1}

Pros:  Easy revocation (delete from session store), server controls state
Cons:  Requires session store (state), doesn't scale horizontally without sticky sessions
       or shared store (Redis); CSRF risk (mitigated by SameSite + CSRF tokens)

Session fixation attack: attacker sets known session ID before login
Fix: regenerate session ID after successful login
```

---

## JWT (JSON Web Token)

### Structure

```text
header.payload.signature

header:    { "alg": "HS256", "typ": "JWT" }   → base64url encoded
payload:   { "sub": "user-123", "exp": 1720000000, "iat": 1719996400, "role": "admin" }
signature: HMACSHA256(base64(header) + "." + base64(payload), secret)

Decode: base64url decode header + payload (NOT encrypted by default — visible to client)
Verify: recompute signature with secret → compare

"HS256" = HMAC-SHA256 (symmetric, shared secret — same key signs and verifies)
"RS256" = RSA SHA-256  (asymmetric — private key signs, public key verifies — use for microservices)
```

### Claims

```text
Registered (standard):
  sub  — subject (user ID)
  iss  — issuer (who created the token)
  aud  — audience (intended recipient)
  exp  — expiry (Unix timestamp)
  iat  — issued at
  jti  — JWT ID (for revocation)

Custom (private):
  role, permissions, email — anything useful to embed
  Rule: don't put secrets or large data in JWT payload — it's visible to client
```

### Access + Refresh Token Pattern

```text
Access token:  short-lived (15min–1h), used for API requests
               Stateless — server just validates signature + exp
               Sent in: Authorization: Bearer <token>

Refresh token: long-lived (7–30 days), used ONLY to get new access token
               Stored server-side (DB/Redis) — allows revocation
               Sent to: /auth/refresh endpoint
               Stored in: HttpOnly cookie (not localStorage)

Flow:
  Login → server issues access_token + refresh_token
  API call → Authorization: Bearer <access_token>
  Access token expires (401) → client POSTs refresh_token to /auth/refresh
  Server validates refresh_token (in DB, not expired, not revoked) → issues new access_token
  Logout → delete refresh_token from DB (invalidates future refreshes)

Rotation: on refresh, issue new refresh token AND revoke old one
          Reuse detection: if old token used again → revoke entire family (compromise detection)
```

### JWT Pitfalls

```text
❌ Storing JWT in localStorage:
   XSS attack reads localStorage → token stolen → impersonation until expiry
   Fix: store in HttpOnly cookie (inaccessible to JS)

❌ Long-lived access tokens:
   Can't be revoked without a denylist (defeats statelessness)
   Fix: short-lived access tokens + refresh token rotation

❌ alg: none attack:
   Old libraries accepted { alg: "none" } — skipped verification
   Fix: always specify allowed algorithms; never accept "none"

❌ HS256 with weak secret:
   Can be brute-forced offline (attacker has the token)
   Fix: 256-bit+ random secret, or switch to RS256

❌ Trusting payload without verifying signature:
   Never decode and use payload without calling verify()
   Fix: use library verify() — not just decode()

❌ Missing exp claim:
   Token lives forever if not expired
   Fix: always set exp; validate it on every request

❌ Not validating aud and iss:
   Token for service A used against service B
   Fix: validate aud matches expected audience on every request
```

---

## OAuth 2.0

OAuth 2.0 is a **delegation** framework — lets users grant third-party apps access to their resources without sharing passwords.

### Roles

```text
Resource Owner:   the user
Resource Server:  API holding user's data (GitHub, Google, etc.)
Client:           your application (wants access)
Authorization Server: issues tokens (often same as resource server for simple cases)
```

### Grant Types (Flows)

```text
1. Authorization Code (+ PKCE) — for web apps and mobile
   Most secure. Code is short-lived, exchanged for tokens server-side.

   Client → Redirect to /authorize?response_type=code&client_id=...&state=...&code_challenge=...
   User logs in, approves scope
   Auth server → Redirect to callback?code=abc&state=...
   Client → POST /token { code=abc, code_verifier=... }
   Auth server → { access_token, refresh_token }

   PKCE (Proof Key for Code Exchange):
     code_verifier = random 43–128 char string
     code_challenge = BASE64URL(SHA256(code_verifier))
     Prevents authorization code interception attack (public clients)
     Required for SPAs and mobile apps (no client secret)

2. Client Credentials — for machine-to-machine (no user)
   POST /token { grant_type=client_credentials, client_id, client_secret }
   → { access_token }
   Use: backend service calling another backend service

3. Device Code — for devices without browser (TV, CLI)
   Device polls for token while user authenticates on phone/computer

4. Implicit (deprecated) — tokens in URL fragment (insecure, replaced by Auth Code + PKCE)
5. Resource Owner Password Credentials (deprecated) — user gives password to client (insecure)
```

### Scopes

```text
Scopes define what access is granted:
  read:user, write:repo, email, profile, openid

Client requests scopes → user approves → access token encodes granted scopes
Resource server validates token includes required scope for each endpoint
```

---

## OpenID Connect (OIDC)

OAuth 2.0 extension for **authentication** (OAuth itself is only authorization).

```text
Adds:
  id_token:  JWT containing user identity (sub, email, name, picture)
             Signed by auth server — client can verify user identity without extra call
  /userinfo: endpoint to fetch user profile
  Discovery: /.well-known/openid-configuration → metadata (endpoints, public keys)

Flow: same as Auth Code, but scope includes "openid"
Token response adds id_token alongside access_token

Use OIDC when: implementing "Sign in with Google/GitHub/etc."
Use OAuth when: authorizing access to third-party resources

JWKS (JSON Web Key Set): auth server publishes public keys at /jwks.json
Your app fetches these to verify id_token signatures
```

---

## RBAC (Role-Based Access Control)

```sql
-- Classic schema
users       (id, email)
roles       (id, name)              -- admin, editor, viewer, moderator
permissions (id, resource, action)  -- 'post', 'create' | 'post', 'delete'
user_roles  (user_id, role_id)
role_perms  (role_id, permission_id)

-- Check: does user X have permission to action on resource?
SELECT 1
FROM user_roles ur
JOIN role_perms rp ON rp.role_id = ur.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE ur.user_id = ? AND p.resource = ? AND p.action = ?

-- Cache this in JWT claims or Redis — don't hit DB on every request
```

### Hierarchical RBAC

```text
admin > editor > viewer

admin inherits all editor permissions, editor inherits all viewer permissions.
Implement: store role hierarchy, traverse on permission check.
Or materialise all permissions per role at role-definition time.
```

### Attribute-Based Access Control (ABAC)

```text
More flexible than RBAC — decisions based on attributes of user, resource, environment.

Policies:
  ALLOW if user.department == resource.department AND user.clearance >= resource.classification
  DENY if request.time outside working_hours

Used in: AWS IAM policies, enterprise systems, multi-tenant apps.
Tools: Casbin (Go/Node), OPA (Open Policy Agent), AWS Cedar.
```

---

## Common Auth Patterns

### Password Storage

```text
❌ Plain text, ❌ MD5/SHA1 (fast hashes — brute-forceable)
✅ bcrypt (cost factor 10–12), ✅ Argon2id (winner of Password Hashing Competition)

bcrypt: adaptive (increase cost as hardware improves), built-in salt
Argon2id: memory-hard (resists GPU/ASIC attacks), recommended for new systems

Node.js:
  import bcrypt from 'bcrypt'
  const hash = await bcrypt.hash(password, 12)         // cost=12
  const match = await bcrypt.compare(plaintext, hash)   // timing-safe

  import { hash, verify } from 'argon2'
  const hash = await hash(password)
  const match = await verify(hash, plaintext)
```

### Multi-Factor Authentication (MFA)

```text
TOTP (Time-based One-Time Password — Google Authenticator):
  Secret shared at setup: user scans QR code (base32-encoded secret)
  TOTP = HOTP(secret, floor(time / 30))  → 6-digit code valid 30s
  Server recomputes with same secret — match → auth
  Library: otplib (Node), speakeasy

SMS OTP: less secure (SIM swap attacks), avoid for high-security apps
Push notification: Duo, Okta Verify
Hardware key: FIDO2/WebAuthn (most secure — phishing-resistant)
```

### WebAuthn / Passkeys

```text
Phishing-resistant auth using public key cryptography + hardware authenticator.

Registration:
  Server sends challenge → authenticator creates key pair
  Public key stored on server, private key stays on device (TPM/Secure Enclave)

Authentication:
  Server sends challenge → authenticator signs with private key
  Server verifies signature with stored public key

Passkey = WebAuthn credential synced across devices via cloud (iCloud Keychain, Google Password Manager)
No password, no phishing possible (credential bound to origin)
```

### CSRF Protection

```text
Cross-Site Request Forgery: malicious site triggers state-changing request using user's cookies.

Mitigations:
  1. SameSite=Strict on cookies: cookie not sent on cross-site requests (best defence)
     SameSite=Lax: sent for top-level navigations (GET) but not POST — safe for most cases
  2. CSRF token: server issues per-session token, sent in hidden form field or X-CSRF-Token header
     Malicious site can't read it (same-origin policy)
  3. Origin/Referer header validation
  4. Double-submit cookie pattern: same CSRF token in both cookie and request header

If using HttpOnly cookies for tokens + SameSite=Strict → CSRF largely mitigated.
APIs using Authorization: Bearer header → immune to CSRF (browser never auto-sends this).
```

### Rate Limiting Auth Endpoints

```text
Login: max 5–10 attempts per username per 15min → lock account or add delay
       Implement with Redis INCR + EXPIRE
       Exponential backoff after failed attempts
       Alert on unusual patterns (credential stuffing from many IPs)

Password reset: rate-limit requests per email + per IP
Token issuance: rate-limit /auth/token endpoint

Tools: express-rate-limit, rate-limiter-flexible (Redis-backed)
```

---

## Interview Questions

```text
Q: JWT vs Session — when to use each?
A: Sessions: traditional web apps, need instant revocation, simpler server setup.
   JWT: stateless microservices (no shared session store), mobile apps,
   third-party API access. Use refresh tokens + short access token TTL
   to mitigate the irrevocability problem.

Q: Why store JWT in HttpOnly cookie instead of localStorage?
A: localStorage is accessible to any JS on the page — XSS steals token permanently.
   HttpOnly cookie: inaccessible to JS; browser handles automatically.
   Needs SameSite=Strict + CSRF protection.
   Alternatively: memory-only (lost on refresh) for high-security SPAs.

Q: How do you revoke a JWT before expiry?
A: Options:
   1. Denylist in Redis (check jti on every request) — re-introduces state
   2. Short access token TTL (15min) — acceptable window of risk
   3. Rotate signing key — invalidates ALL tokens (nuclear option)
   4. Track token version in DB — check user.token_version matches jwt.ver claim

Q: What is PKCE and why do SPAs need it?
A: Proof Key for Code Exchange. SPAs can't safely store a client secret (browser-visible).
   PKCE replaces the client secret: app generates random verifier, sends hash (challenge) upfront.
   Auth server validates that the verifier matches the challenge at token exchange.
   Prevents auth code interception attacks.

Q: Explain the refresh token rotation attack.
A: If refresh token is stolen and rotated, legitimate user's next refresh attempt
   will use old token → server detects reuse → revokes entire token family → logs out both.
   Attacker and user both get logged out. Server can alert on this event.
```
