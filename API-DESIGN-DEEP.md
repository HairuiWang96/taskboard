# API Design — Deep Reference

## REST API Design Principles

### Resource Naming

```
Rules:
- Use nouns, not verbs (the HTTP method IS the verb)
- Plural for collections: /users, /tasks, /orders
- Nested resources for relationships: /users/:id/tasks
- Lowercase, hyphen-separated: /api/user-profiles
- No file extensions: /api/tasks not /api/tasks.json

✗ Bad:             ✓ Good:
/getUsers          GET /users
/createUser        POST /users
/updateUser/1      PUT /users/1
/deleteUser/1      DELETE /users/1
/getUserTasks/1    GET /users/1/tasks
```

---

### HTTP Methods — Correct Usage

```
GET    /tasks          → list all tasks (safe, idempotent)
GET    /tasks/:id      → get one task
POST   /tasks          → create a task (not idempotent — each call creates new)
PUT    /tasks/:id      → full replace (idempotent — same result every time)
PATCH  /tasks/:id      → partial update (only send changed fields)
DELETE /tasks/:id      → delete (idempotent — deleting twice = same result)

POST vs PUT:
- POST creates (server assigns ID)
- PUT creates or replaces at a client-specified URI
- PATCH partially updates — only include fields you want to change
```

---

### Status Codes — Use Them Correctly

```ts
// Creating a resource
res.status(201).json(newTask);          // 201 Created

// Successful, no body (delete)
res.status(204).send();                 // 204 No Content

// Validation failed
res.status(422).json({                  // 422 Unprocessable Entity
    error: 'Validation failed',
    details: [{ field: 'title', message: 'Title is required' }]
});

// Not authenticated (no/invalid token)
res.status(401).json({ error: 'Unauthorized' });

// Authenticated but not allowed
res.status(403).json({ error: 'Forbidden' });

// Resource not found
res.status(404).json({ error: 'Task not found' });

// Conflict (duplicate, version mismatch)
res.status(409).json({ error: 'Task with this title already exists' });

// Rate limited
res.status(429).json({ error: 'Too many requests', retryAfter: 60 });
```

---

### Consistent Error Format

```ts
// Define a standard error shape — use it everywhere
interface ApiError {
    error: string;          // human-readable message
    code?: string;          // machine-readable code (for client logic)
    details?: Array<{       // field-level validation errors
        field: string;
        message: string;
    }>;
    requestId?: string;     // for support/debugging
}

// Examples:
{ "error": "Task not found", "code": "TASK_NOT_FOUND" }
{
    "error": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
        { "field": "title", "message": "Title must be at least 1 character" },
        { "field": "dueDate", "message": "Due date must be in the future" }
    ]
}
```

---

### Pagination

```ts
// ✗ Offset pagination — gets slow at high offsets, inconsistent when data changes
GET /tasks?page=5&limit=20
// → SELECT * FROM tasks LIMIT 20 OFFSET 100
// Problem: if items are inserted/deleted between pages, items skip or duplicate

// ✓ Cursor-based pagination — consistent, performant at any scale
GET /tasks?limit=20&cursor=eyJpZCI6IjEwMCJ9  // cursor = base64 encoded last item ID

// Response includes next cursor
{
    "data": [...],
    "pagination": {
        "hasMore": true,
        "nextCursor": "eyJpZCI6IjEyMCJ9",
        "limit": 20
    }
}

// Implementation
async function getTasks(cursor?: string, limit = 20) {
    const decodedCursor = cursor ? JSON.parse(atob(cursor)) : null;
    const tasks = await db.select().from(tasks)
        .where(decodedCursor ? lt(tasks.id, decodedCursor.id) : undefined)
        .orderBy(desc(tasks.id))
        .limit(limit + 1); // fetch one extra to know if there's a next page

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore ? btoa(JSON.stringify({ id: items[items.length - 1].id })) : null;

    return { data: items, pagination: { hasMore, nextCursor, limit } };
}
```

---

### Filtering, Sorting, Field Selection

```
// Filtering — use query params for simple filters
GET /tasks?status=pending&assignee=user123&priority=high

// Date ranges
GET /tasks?createdAfter=2026-01-01&createdBefore=2026-06-01

// Sorting — field and direction
GET /tasks?sort=createdAt&order=desc
GET /tasks?sort=-createdAt   // prefix minus = descending (common convention)

// Field selection — reduce payload
GET /tasks?fields=id,title,status   // return only these fields

// Search
GET /tasks?q=buy+milk   // full text search
```

---

### Versioning

```
Options:
1. URL versioning:    /api/v1/tasks    (most common, most visible)
2. Header versioning: Accept: application/vnd.api.v1+json
3. Query param:       /api/tasks?version=1
4. Subdomain:         v1.api.example.com

// URL versioning is most common — easy to see, test in browser, route at infrastructure level
// Never remove v1 while clients still use it
// v1 and v2 can coexist — migrate clients gradually

// Semantic versioning for APIs:
// Major: breaking change (v1 → v2) — e.g. rename a field, change response shape
// Minor: additive change — adding new optional fields is backward-compatible
// Patch: bug fix — never breaking
```

---

### Idempotency Keys

```ts
// Problem: client sends POST, network fails — did the server create the resource?
// Client retries → creates duplicate

// Solution: client generates a unique idempotency key per operation
// Server stores (key → response) — returns same response on retry

app.post('/payments', async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) return res.status(400).json({ error: 'Idempotency-Key required' });

    // Check if we've seen this key
    const existing = await redis.get(`idem:${idempotencyKey}`);
    if (existing) return res.json(JSON.parse(existing)); // return cached response

    // Process the payment
    const payment = await processPayment(req.body);

    // Cache the response (24h TTL)
    await redis.setex(`idem:${idempotencyKey}`, 86400, JSON.stringify(payment));
    res.status(201).json(payment);
});

// Client usage:
const key = crypto.randomUUID(); // generate once per logical operation
await fetch('/payments', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: JSON.stringify(paymentData),
});
// Safe to retry with same key
```

---

### Rate Limiting Response Headers

```
X-RateLimit-Limit: 100           // requests allowed per window
X-RateLimit-Remaining: 42        // requests remaining this window
X-RateLimit-Reset: 1716600000    // Unix timestamp when window resets
Retry-After: 60                  // seconds to wait (returned with 429)
```

---

### API Authentication Patterns

```
1. API Keys — simplest, for server-to-server
   Authorization: Bearer sk_live_abc123
   Cons: no expiry, if leaked must rotate

2. JWT Bearer Token — stateless, for user auth
   Authorization: Bearer eyJhbGci...
   Short-lived (15min) + refresh token (7 days, stored in HttpOnly cookie)

3. OAuth 2.0 — delegated authorization ("Login with Google")
   Flows: Authorization Code (web apps), Client Credentials (server-to-server),
          PKCE (mobile/SPA — no client secret)

4. Session cookies — traditional, stateful
   Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax
```

---

### OpenAPI / Swagger

```yaml
# openapi.yaml — machine-readable API contract
openapi: 3.0.0
info:
  title: Tasks API
  version: 1.0.0

paths:
  /tasks:
    get:
      summary: List tasks
      parameters:
        - name: status
          in: query
          schema: { type: string, enum: [pending, done] }
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Task' }
    post:
      summary: Create task
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateTask' }
      responses:
        '201': { description: Created }
        '422': { description: Validation error }

components:
  schemas:
    Task:
      type: object
      properties:
        id:    { type: string }
        title: { type: string }
        done:  { type: boolean }
```

---

## Most Asked API Design Interview Questions

### "How do you design a backward-compatible API change?"

> Additive changes are backward-compatible: add new optional fields to responses, add new optional query params, add new endpoints. Breaking changes require a new version: removing fields, changing field types, changing response structure, removing endpoints, changing authentication. When you must make a breaking change: version the API (v2), keep v1 running with a deprecation notice and sunset date, give clients a migration guide.

### "What is HATEOAS and is it worth implementing?"

> HATEOAS (Hypermedia As The Engine Of Application State) — responses include links to related actions/resources. The client discovers what it can do next from the response, not hardcoded URLs. In theory: clients don't need to know URL structures, API is self-documenting. In practice: most teams skip it — it adds complexity with limited real-world benefit when you control both client and server. Worth knowing the concept; rarely worth fully implementing.

### "What is GraphQL and what problems does it solve over REST?"

> GraphQL solves: **over-fetching** (REST endpoint returns fields you don't need), **under-fetching** (need multiple requests to get related data), and the need for **many specialized endpoints**. With GraphQL, the client specifies exactly what data it needs in a single request. Trade-offs: harder to cache (all requests are POSTs), N+1 problem requires DataLoader, learning curve, less mature tooling than REST. Best for: complex nested data, mobile apps (bandwidth), teams with many different clients needing different data shapes.

### "How do you handle API errors gracefully?"

> Define a consistent error schema upfront. Use correct HTTP status codes — don't return 200 for errors. Include machine-readable error codes (for client logic), human-readable messages (for debugging/display), field-level detail for validation errors, and a request ID for support. Log all 5xx errors server-side. Don't expose internal details (stack traces, DB errors) to clients — log them, return a safe message. Handle errors at every layer: validation (422), auth (401/403), business logic (409/400), infrastructure (503).
