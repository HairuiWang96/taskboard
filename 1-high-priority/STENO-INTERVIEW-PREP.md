# Steno Interview Prep — Technical Screen Q&A

> Based on real interview questions reported by candidates (2024–2025).
> Format: rapid-fire Q&A covering Git, JavaScript/TypeScript, Node.js, SQL, and system design.

---

## Part 1: The 20 Rapid-Fire Questions

---

### Q1. What is a git fast-forward merge?

<!-- A fast-forward merge happens when the branch you're merging into has no new commits since the feature branch was created. Git doesn't create a merge commit — it just moves the pointer forward to the latest commit on the feature branch. It's like the main branch "catches up" by sliding its pointer forward along the same commit history.

Example:
```
Before:
main:    A --- B
                \
feature:         C --- D

After fast-forward merge:
main:    A --- B --- C --- D
```

Because main had no new commits after B, Git just moves the main pointer from B to D. No merge commit needed.

When it CAN'T happen: If main has new commits that feature doesn't have, Git can't fast-forward — it needs a real merge commit (or you rebase first).

You can force a merge commit even when fast-forward is possible with `git merge --no-ff`, which is useful to preserve branch history in the log. -->

---

### Q2. What's the difference between git merge and rebase?

<!-- Both integrate changes from one branch into another, but they do it differently:

**git merge:**
- Creates a new "merge commit" that ties two branches together
- Preserves the full history — you can see exactly when branches diverged and came back together
- The commit graph looks like a railroad track with merging lines
```
main:    A --- B --------- M
                \         /
feature:         C --- D
```

**git rebase:**
- Takes your commits and replays them on top of the target branch, one by one
- Rewrites commit history to make it look like you branched off from the latest commit
- Creates a clean, linear history — no merge commits
```
Before rebase:
main:    A --- B --- E
                \
feature:         C --- D

After rebase (feature onto main):
main:    A --- B --- E
                      \
feature:               C' --- D'
```

**When to use which:**
- `merge`: on shared branches (main, develop) — safe because it doesn't rewrite history
- `rebase`: on your own feature branches before merging — keeps history clean
- Golden rule: NEVER rebase commits that have been pushed and shared with others, because rebase rewrites commit hashes and will cause conflicts for everyone else -->

---

### Q3. What is the spread operator?

<!-- The spread operator (`...`) expands an iterable (array, object, string) into individual elements. It's used for copying, merging, and passing arguments.

**Arrays — copy and merge:**
```js
const a = [1, 2, 3];
const b = [...a];           // shallow copy: [1, 2, 3]
const c = [...a, 4, 5];     // [1, 2, 3, 4, 5]
const d = [...a, ...b];     // merge: [1, 2, 3, 1, 2, 3]
```

**Objects — copy and merge:**
```js
const user = { name: 'Alice', age: 30 };
const updated = { ...user, age: 31 };  // { name: 'Alice', age: 31 }
// Later properties overwrite earlier ones
```

**Function arguments:**
```js
const nums = [1, 2, 3];
Math.max(...nums);  // same as Math.max(1, 2, 3)
```

**Rest parameters (looks the same but collects instead of spreads):**
```js
function sum(...numbers) {   // collects arguments into an array
  return numbers.reduce((a, b) => a + b, 0);
}
```

Key detail: spread creates SHALLOW copies — nested objects/arrays are still references to the originals. If you modify a nested object in the copy, the original changes too. -->

---

### Q4. What is an interface (in TypeScript)?

<!-- An interface defines the shape/contract of an object — what properties and methods it must have, and their types. It's a compile-time construct that disappears after compilation to JavaScript (zero runtime cost).

```ts
interface User {
  id: number;
  name: string;
  email?: string;          // optional property
  readonly createdAt: Date; // can't be reassigned after creation
  greet(): string;          // method signature
}

const user: User = {
  id: 1,
  name: 'Alice',
  createdAt: new Date(),
  greet() { return `Hi, I'm ${this.name}`; }
};
```

**Extending interfaces:**
```ts
interface Admin extends User {
  permissions: string[];
}
```

**Interface vs Type alias:**
- Interfaces can be extended with `extends` and merged (declaration merging — defining the same interface twice merges them)
- Types use `&` for intersection, can represent unions (`string | number`), primitives, tuples
- Interfaces are generally preferred for object shapes; types for unions and utility types
- In practice, they're mostly interchangeable for defining object shapes

**Why interfaces matter:**
- They enforce contracts at compile time — catch bugs before runtime
- They enable dependency injection and make code testable (program to an interface, not an implementation)
- They serve as documentation for what a function expects or returns -->

---

### Q5. Explain the benefits of async/await

<!-- async/await is syntactic sugar over Promises that makes asynchronous code read like synchronous code.

```js
// Promise chain:
function getUser(id) {
  return fetch(`/users/${id}`)
    .then(res => res.json())
    .then(user => fetch(`/posts?userId=${user.id}`))
    .then(res => res.json())
    .catch(err => console.error(err));
}

// async/await — same logic, much cleaner:
async function getUser(id) {
  try {
    const res = await fetch(`/users/${id}`);
    const user = await res.json();
    const postsRes = await fetch(`/posts?userId=${user.id}`);
    return await postsRes.json();
  } catch (err) {
    console.error(err);
  }
}
```

**Benefits:**
1. **Readability** — code reads top-to-bottom like synchronous code, no .then() chains
2. **Error handling** — use standard try/catch instead of .catch() chains; one try/catch can wrap multiple async operations
3. **Debugging** — stack traces are meaningful; you can step through async code in a debugger line by line
4. **Conditionals** — easy to branch based on async results (with .then() chains, conditional logic gets messy fast)
5. **Loops** — you can use for loops, while loops, for...of with await; Promise chains can't do this cleanly

**Important to remember:**
- async functions ALWAYS return a Promise
- await only works inside an async function (or at top level in ES modules)
- await pauses execution of that function but does NOT block the event loop — other code continues running
- For parallel operations, use `Promise.all([...])` instead of sequential awaits -->

---

### Q6. What is an unhandled promise rejection?

<!-- An unhandled promise rejection occurs when a Promise is rejected (throws an error) and there is no .catch() handler or try/catch block to handle it.

```js
// This creates an unhandled promise rejection:
async function fetchData() {
  const res = await fetch('https://bad-url.invalid');  // throws
  return res.json();
}
fetchData();  // no .catch(), no try/catch — rejection is unhandled

// Fixed — Option 1: .catch()
fetchData().catch(err => console.error('Failed:', err));

// Fixed — Option 2: try/catch inside the function
async function fetchData() {
  try {
    const res = await fetch('https://bad-url.invalid');
    return res.json();
  } catch (err) {
    console.error('Failed:', err);
  }
}
```

**Why it matters:**
- In Node.js (v15+), unhandled promise rejections CRASH the process by default (`--unhandled-rejections=throw`)
- In older Node.js versions, they just logged a warning — bugs would silently fail and cause mysterious downstream issues
- In browsers, they show up in the console but don't crash the page

**Global safety net (doesn't replace proper error handling):**
```js
// Node.js
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
  // Log it, alert monitoring, etc.
});

// Browser
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});
```

Bottom line: ALWAYS handle your Promise rejections — either with .catch() or try/catch. -->

---

### Q7. What is a closure function?

<!-- A closure is a function that remembers and can access variables from the scope where it was created, even after that outer function has returned.

```js
function createCounter() {
  let count = 0;  // this variable is "closed over"
  return function() {
    count++;
    return count;
  };
}

const counter = createCounter();
counter(); // 1
counter(); // 2
counter(); // 3
// count is not accessible from outside, but the inner function still has access to it
```

**How it works:**
When a function is created, it gets a hidden reference to its surrounding scope (the "lexical environment"). Even after the outer function finishes executing, the inner function holds onto that reference — the variables don't get garbage collected because something still points to them.

**Common use cases:**
1. **Data privacy / encapsulation** — create private variables that can't be accessed directly
2. **Factory functions** — functions that create customized functions
```js
function multiply(x) {
  return function(y) {
    return x * y;
  };
}
const double = multiply(2);
double(5);  // 10
double(10); // 20
```
3. **Event handlers and callbacks** — preserve state between events
4. **Module pattern** — before ES modules, closures were how you created private state

**Classic gotcha — closures in loops:**
```js
// Bug: all callbacks log 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);  // prints 3, 3, 3
}

// Fix: use let (block-scoped, creates a new binding per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);  // prints 0, 1, 2
}
``` -->

---

### Q8. What is a callback function?

<!-- A callback is a function passed as an argument to another function, to be called (invoked) at a later time — when some operation completes or some event occurs.

```js
// Synchronous callback:
const numbers = [3, 1, 2];
numbers.sort((a, b) => a - b);  // the comparator is a callback

// Asynchronous callback:
fs.readFile('data.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(data);
});
```

**Error-first callback pattern (Node.js convention):**
The first argument of the callback is always the error (null if no error), and the second argument is the result. This is how Node.js built-in modules work (fs, http, etc.).

```js
function fetchData(url, callback) {
  // ... do async work
  if (error) {
    callback(error, null);    // error first
  } else {
    callback(null, result);   // null error means success
  }
}
```

**The problem — Callback Hell:**
```js
getUser(id, (err, user) => {
  getOrders(user.id, (err, orders) => {
    getItems(orders[0].id, (err, items) => {
      // deeply nested, hard to read, hard to handle errors
    });
  });
});
```

This is why Promises and async/await were introduced — they flatten nested callbacks into chains or sequential-looking code. Callbacks are still used for synchronous operations (array methods like map, filter, forEach) and event listeners, but for async flow control, Promises/async-await are the modern standard. -->

---

### Q9. What is middleware (in Node.js)?

<!-- Middleware is a function that sits between the incoming request and the final route handler. It has access to the request object, the response object, and the next middleware function in the chain. It can modify the request/response, end the request cycle, or pass control to the next middleware.

```js
// Express middleware signature:
function myMiddleware(req, res, next) {
  // Do something with req or res
  next();  // pass control to the next middleware
}

app.use(myMiddleware);  // applies to ALL routes
```

**How the middleware chain works:**
```
Request → [Logger] → [Auth] → [BodyParser] → [Route Handler] → Response
```
Each middleware calls `next()` to pass control to the next one. If a middleware doesn't call `next()`, the request hangs (or the middleware must send a response itself).

**Common middleware examples:**
```js
// Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Authentication
app.use((req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'No token' });
  req.user = verifyToken(token);  // attach user to request
  next();
});

// Body parsing (built-in)
app.use(express.json());  // parses JSON request bodies

// Error-handling middleware (4 parameters):
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});
```

**Key concepts:**
- Middleware executes in the ORDER it's registered (`app.use()`)
- `app.use()` applies to all routes; `app.use('/api', ...)` applies only to routes starting with /api
- Route-specific middleware: `app.get('/admin', authMiddleware, handler)`
- Error middleware has 4 params `(err, req, res, next)` and is called when `next(err)` is used
- Common middleware: cors, helmet (security headers), morgan (logging), express-rate-limit, cookie-parser -->

---

### Q10. What is dependency injection? And what are its benefits?

<!-- Dependency injection (DI) is a design pattern where a component receives its dependencies from the outside rather than creating them internally. Instead of a class/function creating what it needs, you "inject" those dependencies in.

```ts
// WITHOUT DI — tightly coupled:
class UserService {
  private db = new PostgresDatabase();  // creates its own dependency
  
  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}

// WITH DI — loosely coupled:
class UserService {
  constructor(private db: Database) {}  // dependency injected from outside
  
  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}

// Usage:
const db = new PostgresDatabase();
const userService = new UserService(db);  // inject the dependency

// In tests:
const mockDb = new MockDatabase();
const userService = new UserService(mockDb);  // inject a mock
```

**Benefits:**
1. **Testability** — swap real dependencies with mocks/stubs for unit testing. This is the biggest practical benefit.
2. **Loose coupling** — components depend on abstractions (interfaces), not concrete implementations. You can swap Postgres for MySQL without changing UserService.
3. **Single Responsibility** — a class focuses on its own logic, not on creating/configuring its dependencies.
4. **Reusability** — the same class works with different implementations of its dependencies.
5. **Configurability** — easy to change behavior by injecting different implementations (e.g., different loggers for dev vs prod).

**In Node.js/TypeScript, DI is often done through:**
- Constructor injection (most common, shown above)
- Parameter injection (passing dependencies as function arguments)
- DI containers/frameworks (NestJS uses decorators and a built-in DI container, similar to Angular and Spring) -->

---

### Q11. Name HTTP status codes

<!-- HTTP status codes are grouped by their first digit:

**1xx — Informational:**
- 100 Continue — server received request headers, client should send the body
- 101 Switching Protocols — switching to WebSocket

**2xx — Success:**
- 200 OK — standard success response
- 201 Created — resource successfully created (POST)
- 204 No Content — success but no body to return (DELETE)

**3xx — Redirection:**
- 301 Moved Permanently — resource permanently moved (SEO: search engines update their index)
- 302 Found — temporary redirect
- 304 Not Modified — cached version is still valid, no need to re-download

**4xx — Client Error:**
- 400 Bad Request — malformed request, invalid JSON, missing required fields
- 401 Unauthorized — not authenticated (misleading name — really means "unauthenticated")
- 403 Forbidden — authenticated but not authorized / don't have permission
- 404 Not Found — resource doesn't exist
- 405 Method Not Allowed — e.g., POST to a GET-only endpoint
- 409 Conflict — e.g., duplicate entry, resource already exists
- 422 Unprocessable Entity — request is valid JSON but fails validation (common in APIs)
- 429 Too Many Requests — rate limited

**5xx — Server Error:**
- 500 Internal Server Error — generic server-side failure
- 502 Bad Gateway — server acting as proxy got invalid response from upstream
- 503 Service Unavailable — server is overloaded or down for maintenance
- 504 Gateway Timeout — proxy/load balancer timed out waiting for upstream

**Most important for REST APIs:** 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500 -->

---

### Q12. Is HTTP stateful or stateless?

<!-- HTTP is STATELESS. Each request is completely independent — the server does not remember anything about previous requests from the same client.

**What this means:**
- Every request must contain ALL the information the server needs to process it
- The server doesn't know if you just sent a request 1 second ago
- Two requests from the same client are treated as completely unrelated

**Why stateless?**
- **Scalability** — any server in a cluster can handle any request (no need to route to a "sticky" server that has your state)
- **Reliability** — if a server crashes, no session state is lost
- **Simplicity** — servers don't need to manage/clean up session memory
- **Cacheability** — stateless responses are easier to cache

**How we add "state" on top of stateless HTTP:**
Since many apps need to know who the user is across requests, we use:
1. **Cookies** — server sends `Set-Cookie` header, browser sends it back on every subsequent request
2. **Session tokens** — server stores session data, sends client a session ID (in a cookie)
3. **JWTs (JSON Web Tokens)** — self-contained token with user info, sent in `Authorization` header; server doesn't need to store anything (stateless authentication on top of stateless HTTP)
4. **URL parameters** — less common, putting session info in the URL

The key insight: HTTP itself is stateless. We build stateful experiences (login sessions, shopping carts) by passing tokens/cookies WITH each request so the server can look up or decode the state. -->

---

### Q13. Is SQL declarative or imperative?

<!-- SQL is DECLARATIVE. You describe WHAT data you want, not HOW to get it.

```sql
-- Declarative (SQL) — you say WHAT you want:
SELECT name, email FROM users WHERE age > 25 ORDER BY name;
-- "Give me names and emails of users over 25, sorted by name"
-- You don't specify: which index to use, how to scan the table, how to sort

-- Imperative (pseudocode) — you say HOW to do it:
results = []
for each row in users_table:
    if row.age > 25:
        results.push({ name: row.name, email: row.email })
sort results by name
return results
```

**Why it matters:**
- The database query optimizer decides HOW to execute your query — which indexes to use, join order, scan strategies
- The same SQL query might be executed completely differently depending on table size, available indexes, and data distribution
- You focus on business logic, the database handles performance optimization

**Declarative vs Imperative examples in programming:**
- Declarative: SQL, HTML, CSS, React JSX, regex
- Imperative: for loops, step-by-step instructions, most general-purpose code

**The real-world nuance:**
While SQL is declarative, experienced developers still think about HOW the optimizer will execute their queries — using EXPLAIN to check query plans, adding proper indexes, structuring JOINs efficiently. You write declaratively but optimize with awareness of the execution engine. -->

---

### Q14. What is a CTE? And its keyword?

<!-- A CTE (Common Table Expression) is a temporary, named result set defined using the `WITH` keyword. It exists only for the duration of that single query. Think of it as a temporary view or a named subquery that you can reference multiple times.

```sql
-- Keyword: WITH
WITH active_users AS (
    SELECT id, name, email
    FROM users
    WHERE status = 'active'
      AND last_login > NOW() - INTERVAL '30 days'
)
SELECT au.name, COUNT(o.id) AS order_count
FROM active_users au
JOIN orders o ON o.user_id = au.id
GROUP BY au.name
ORDER BY order_count DESC;
```

**Benefits over subqueries:**
1. **Readability** — name your subqueries so the logic reads like English
2. **Reusability** — reference the same CTE multiple times in one query (a subquery would need to be copy-pasted)
3. **Organization** — break complex queries into named, logical steps
4. **Recursion** — CTEs support recursive queries (subqueries don't)

**Multiple CTEs:**
```sql
WITH 
  active_users AS (
    SELECT * FROM users WHERE status = 'active'
  ),
  recent_orders AS (
    SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'
  )
SELECT au.name, ro.total
FROM active_users au
JOIN recent_orders ro ON ro.user_id = au.id;
```

CTEs don't create actual tables or views — they're just a way to structure a single query more clearly. The database optimizer may inline them as subqueries anyway. -->

---

### Q15. What is the difference between a table and a view?

<!-- **Table:**
- A table STORES data physically on disk
- It has actual rows and columns with real data
- INSERT, UPDATE, DELETE directly modify the stored data
- Takes up storage space
- Is the source of truth

**View:**
- A view is a SAVED QUERY — it doesn't store data itself
- It's a virtual table defined by a SELECT statement
- Every time you query a view, it runs the underlying query against the actual tables
- Takes up no additional storage (just the query definition)
- Always reflects the current data in the underlying tables

```sql
-- Create a view:
CREATE VIEW active_premium_users AS
SELECT u.id, u.name, u.email, s.plan_name
FROM users u
JOIN subscriptions s ON s.user_id = u.id
WHERE u.status = 'active' AND s.plan_name = 'premium';

-- Use it like a table:
SELECT * FROM active_premium_users WHERE name LIKE 'A%';
```

**Why use views?**
1. **Simplification** — hide complex JOINs behind a simple name
2. **Security** — expose only certain columns to certain roles (e.g., a view without salary column)
3. **Consistency** — everyone uses the same query logic instead of copy-pasting SQL
4. **Abstraction** — change underlying table structure without breaking queries that use the view

**Materialized View (bonus):**
A materialized view DOES store data physically — it's a cached snapshot of the query result. It needs to be manually refreshed (`REFRESH MATERIALIZED VIEW`) to pick up changes. Used for performance when the underlying query is expensive and data doesn't need to be real-time. -->

---

### Q16. What is a recursive query?

<!-- A recursive query is a query that references itself to process hierarchical or tree-structured data. It uses a recursive CTE (WITH RECURSIVE) to repeatedly execute until a termination condition is met.

```sql
-- Example: Get an employee and ALL their reports (direct and indirect)
WITH RECURSIVE org_tree AS (
    -- Base case (anchor): start with the top-level manager
    SELECT id, name, manager_id, 1 AS depth
    FROM employees
    WHERE id = 1  -- CEO
    
    UNION ALL
    
    -- Recursive case: find employees who report to people already in the result
    SELECT e.id, e.name, e.manager_id, ot.depth + 1
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id  -- references itself
)
SELECT * FROM org_tree;
```

**How it works step by step:**
1. Execute the base case (anchor query) — gets the starting row(s)
2. Execute the recursive part using results from the previous step
3. Repeat step 2 until no new rows are produced
4. Combine all results with UNION ALL

**Common use cases:**
- **Org charts** — find all reports under a manager at any depth
- **Category trees** — e-commerce categories with subcategories
- **File systems** — folders containing folders
- **Bill of materials** — parts made of sub-parts
- **Graph traversal** — shortest path, connected components

**Important safeguard:**
Recursive queries can run forever if there's a cycle. Most databases let you set a limit:
```sql
-- PostgreSQL: limit recursion depth
WITH RECURSIVE ... 
SELECT * FROM tree WHERE depth <= 10;
```

Without recursion, you'd need multiple queries or application-level loops to traverse hierarchical data. -->

---

### Q17. What is a SQL index?

<!-- An index is a data structure (typically a B-tree) that speeds up data retrieval on a table. It's like the index at the back of a book — instead of scanning every page, you look up the topic and jump to the right page.

**Without index:** the database scans EVERY row in the table (full table scan) — O(n)
**With index:** the database navigates the B-tree to find the matching rows — O(log n)

```sql
-- Create an index on the email column:
CREATE INDEX idx_users_email ON users(email);

-- Now this query is fast:
SELECT * FROM users WHERE email = 'alice@example.com';
-- Instead of scanning millions of rows, it does a B-tree lookup

-- Composite index (multiple columns):
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
-- Speeds up: WHERE user_id = 5 AND created_at > '2024-01-01'
```

**Why B-tree?**
- Balanced tree structure — all leaf nodes are at the same depth
- O(log n) for search, insert, delete
- Great for range queries (>, <, BETWEEN) because leaf nodes are linked
- Works well with disk-based storage (minimizes disk reads)

**Types of indexes:**
- **B-tree** — default, good for equality and range queries
- **Hash** — faster for exact equality, useless for ranges
- **GIN (Generalized Inverted Index)** — for full-text search, arrays, JSONB
- **Unique index** — B-tree + enforces uniqueness constraint

**Trade-offs:**
- Indexes speed up reads but SLOW DOWN writes (every INSERT/UPDATE/DELETE must also update the index)
- Indexes use additional disk space
- Too many indexes = slower writes, more storage, more maintenance
- Rule of thumb: index columns used in WHERE, JOIN, and ORDER BY clauses; don't index everything -->

---

### Q18. Explain the difference between monolithic vs microservice architecture

<!-- **Monolithic architecture:**
- The entire application is ONE deployable unit — one codebase, one process, one database
- All features (auth, payments, notifications, etc.) live in the same codebase and deploy together
- A single team (or multiple teams) work in the same repository

```
[Monolith]
┌──────────────────────────┐
│  Auth | Orders | Payments │
│  Users | Notifications    │
│       Single DB           │
└──────────────────────────┘
```

**Microservice architecture:**
- The application is split into small, independent services that each do ONE thing
- Each service has its own codebase, database, and deployment pipeline
- Services communicate via HTTP/REST, gRPC, or message queues

```
[Microservices]
┌────────┐  ┌──────────┐  ┌──────────┐
│  Auth  │  │  Orders  │  │ Payments │
│  (DB)  │  │  (DB)    │  │  (DB)    │
└────┬───┘  └────┬─────┘  └────┬─────┘
     │           │              │
     └───── Message Queue ──────┘
```

**Monolith — Pros:**
- Simple to develop, test, deploy, and debug
- No network latency between components (it's all in-process function calls)
- Easy to maintain data consistency (one database, real transactions)
- Lower operational complexity (one thing to monitor, deploy, scale)

**Monolith — Cons:**
- Gets harder to maintain as it grows (one change can break unrelated features)
- Must deploy the entire app for any change
- Scales as a whole unit (can't scale just the payment service)
- Technology lock-in (one language, one framework)

**Microservices — Pros:**
- Independent deployment — deploy one service without touching others
- Independent scaling — scale only the services that need it
- Team autonomy — each team owns their service end-to-end
- Technology flexibility — each service can use different languages/databases

**Microservices — Cons:**
- Distributed system complexity — network failures, latency, eventual consistency
- Harder to debug (tracing a request across 10 services)
- Data consistency is hard (no cross-service transactions without patterns like Saga)
- Operational overhead — more services to deploy, monitor, and maintain
- Requires mature DevOps (CI/CD, container orchestration, service mesh)

**When to use which:**
- Start with a monolith for most projects — it's faster to develop and simpler
- Consider microservices when: team is large (10+ engineers), different components have very different scaling needs, or you need independent deployments
- You can always extract microservices from a monolith later (the reverse is much harder) -->

---

### Q19. What are some problems you can run into using message queues with microservices?

<!-- Message queues (RabbitMQ, Kafka, SQS, etc.) enable async communication between microservices, but they introduce several challenges:

**1. Message ordering:**
- Messages may arrive out of order, especially with multiple consumers
- Example: "update user" arrives before "create user" — the update fails
- Fix: partition by key (Kafka), use sequence numbers, design for idempotency

**2. Duplicate messages (at-least-once delivery):**
- Most queues guarantee at-least-once delivery, meaning the same message can be delivered twice (broker retries, consumer crashes after processing but before acknowledging)
- If your handler isn't idempotent, you process the same payment twice
- Fix: idempotent consumers (use a unique message ID + deduplication table)

**3. Message loss:**
- Messages can be lost if the broker crashes before persisting, or a consumer acknowledges before processing
- Fix: persistent/durable queues, acknowledge AFTER processing, use transactions

**4. Poison pill messages:**
- A malformed message that crashes the consumer every time it's delivered
- Consumer crashes → message goes back to queue → consumer picks it up → crashes again (infinite loop)
- Fix: dead letter queue (DLQ) — after N failed attempts, move the message to a DLQ for manual inspection

**5. Eventual consistency:**
- Services are no longer immediately consistent — one service may have processed the message while another hasn't yet
- Users might see stale data briefly
- This requires careful UX design and client-side handling

**6. Monitoring and debugging complexity:**
- Hard to trace a request across multiple services and queues
- Need distributed tracing (Jaeger, Datadog) and centralized logging
- Messages sitting in a queue don't show up in normal request logs

**7. Queue backpressure / consumer lag:**
- If producers send messages faster than consumers process them, the queue grows
- Can lead to memory issues on the broker and increased latency
- Fix: auto-scaling consumers, rate limiting producers, monitoring queue depth

**8. Schema evolution:**
- If the message format changes, old consumers may not understand new messages (and vice versa)
- Fix: versioned schemas, backward-compatible changes, schema registry (Avro, Protobuf) -->

---

### Q20. Explain caching, and how you would implement it?

<!-- Caching stores frequently accessed data in a faster storage layer so you don't have to recompute or re-fetch it every time.

**Why cache?**
- Database queries are slow (disk I/O, complex joins)
- API calls to external services are slow (network latency)
- Computed results (reports, aggregations) are expensive to generate
- Caching trades memory for speed

**Cache layers (closest to user → farthest):**
1. **Browser cache** — static assets (images, CSS, JS) cached by the browser via HTTP headers
2. **CDN cache** — static content cached at edge servers close to users (CloudFront, Cloudflare)
3. **Application cache** — in-memory cache in your server process (Node.js Map, LRU cache)
4. **Distributed cache** — shared cache across multiple servers (Redis, Memcached)
5. **Database cache** — query result cache, buffer pool (built into the DB)

**Implementation with Redis (most common in Node.js):**
```js
const Redis = require('ioredis');
const redis = new Redis();

async function getUser(id) {
  // 1. Check cache first
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    return JSON.parse(cached);  // cache HIT — fast path
  }
  
  // 2. Cache MISS — query database
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  
  // 3. Store in cache with TTL (time-to-live)
  await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);  // expires in 1 hour
  
  return user;
}
```

**Cache invalidation strategies:**
1. **TTL (Time-to-Live)** — cache expires after a set time. Simple but data can be stale until expiry.
2. **Write-through** — write to cache AND database at the same time. Always consistent, but every write is slower.
3. **Write-behind (write-back)** — write to cache first, async write to database later. Fast writes, but risk of data loss if cache crashes.
4. **Cache-aside (lazy loading)** — the pattern shown above. Only cache on read. Most common in application code.
5. **Event-driven invalidation** — when data changes, publish an event that clears the relevant cache keys.

**Common cache problems:**
- **Cache stampede** — cache expires, 1000 requests simultaneously hit the database. Fix: mutex/lock, staggered TTLs, pre-warming.
- **Stale data** — cache shows outdated information. Fix: shorter TTL, active invalidation on writes.
- **Memory pressure** — cache grows too large. Fix: eviction policies (LRU — Least Recently Used, LFU — Least Frequently Used).

"There are only two hard things in computer science: cache invalidation and naming things." — Phil Karlton -->

---

## Part 2: Additional Questions from Other Interviews

---

### Q21. Explain how the event loop works

<!-- The event loop is the core mechanism that allows Node.js (and browsers) to perform non-blocking I/O despite JavaScript being single-threaded. It continuously checks for and processes events/callbacks.

**The big picture:**
```
   ┌───────────────────────────┐
┌─>│         timers             │  (setTimeout, setInterval callbacks)
│  └──────────┬────────────────┘
│  ┌──────────┴────────────────┐
│  │     pending callbacks      │  (I/O callbacks deferred to next loop)
│  └──────────┬────────────────┘
│  ┌──────────┴────────────────┐
│  │       idle, prepare        │  (internal use)
│  └──────────┬────────────────┘
│  ┌──────────┴────────────────┐
│  │         poll               │  (retrieve new I/O events; execute I/O callbacks)
│  └──────────┬────────────────┘
│  ┌──────────┴────────────────┐
│  │         check              │  (setImmediate callbacks)
│  └──────────┬────────────────┘
│  ┌──────────┴────────────────┐
│  │    close callbacks         │  (socket.on('close'), etc.)
│  └──────────┬────────────────┘
└─────────────┘
```

**How it works step by step:**
1. Your JavaScript code runs synchronously on the call stack
2. When you encounter an async operation (file read, HTTP request, timer), Node.js hands it off to the system (libuv thread pool or OS kernel)
3. Your code continues executing — it doesn't wait
4. When the async operation completes, its callback is placed in the appropriate queue
5. The event loop picks callbacks from the queues and pushes them onto the call stack when it's empty
6. This repeats forever until there are no more callbacks to process

**Key phases:**
- **Timers** — executes callbacks from setTimeout() and setInterval()
- **Poll** — retrieves new I/O events and executes their callbacks (this is where most work happens)
- **Check** — executes setImmediate() callbacks

**Microtask queue (higher priority):**
- Promise .then()/.catch()/.finally() callbacks and process.nextTick() go into the microtask queue
- Microtasks are processed BETWEEN every phase transition and after each callback
- process.nextTick() has even higher priority than Promise callbacks

```js
console.log('1 - start');

setTimeout(() => console.log('2 - setTimeout'), 0);

Promise.resolve().then(() => console.log('3 - promise'));

process.nextTick(() => console.log('4 - nextTick'));

console.log('5 - end');

// Output: 1 - start, 5 - end, 4 - nextTick, 3 - promise, 2 - setTimeout
```

**Why this matters:**
- The event loop is WHY Node.js can handle thousands of concurrent connections with a single thread
- Blocking the event loop (heavy computation, synchronous file reads) freezes EVERYTHING
- CPU-intensive work should be offloaded to worker threads or a separate process -->

---

### Q22. What data structure does a SQL index use and why?

<!-- The default (and most common) data structure for SQL indexes is a **B-tree** (specifically B+ tree in most implementations like PostgreSQL, MySQL InnoDB, SQL Server).

**What is a B+ tree?**
A self-balancing tree where:
- Internal nodes store keys and pointers to child nodes (used for navigation)
- Leaf nodes store the actual indexed values and pointers to the table rows
- All leaf nodes are at the same depth (balanced = predictable performance)
- Leaf nodes are linked together in a doubly-linked list (great for range scans)

```
            [50]                    ← root
           /    \
      [20,30]   [70,80]            ← internal nodes
      / | \      / | \
   [10,15] [20,25] [30,40] [50,60] [70,75] [80,90,95]  ← leaf nodes (linked →)
```

**Why B-tree / B+ tree?**
1. **O(log n) lookups** — with millions of rows, a B-tree might only need 3-4 levels deep. Finding a row = 3-4 disk reads instead of millions.
2. **Optimized for disk I/O** — B-trees are wide and shallow (high branching factor). Each node can hold many keys, which maps perfectly to disk pages (typically 4KB-16KB). One disk read loads an entire node with hundreds of keys.
3. **Range queries** — because leaf nodes are linked, once you find the start of a range (WHERE price BETWEEN 10 AND 50), you just follow the leaf node chain. An array would need to be sorted + binary searched; a hash table can't do ranges at all.
4. **Sorted order** — data in a B-tree is sorted, so ORDER BY queries on indexed columns can skip sorting entirely.
5. **Efficient inserts/deletes** — the tree rebalances itself to maintain O(log n) guarantees even with heavy writes.

**Other index types and their data structures:**
- **Hash index** — hash table. O(1) exact-match lookups. Cannot do range queries, no ordering. Good for equality checks only.
- **GIN (Generalized Inverted Index)** — inverted index (like a book's index). Used for full-text search, JSONB, arrays. Maps each value to the list of rows containing it.
- **GiST** — generalized search tree. Used for geometric/spatial data (PostGIS), full-text search.
- **BRIN (Block Range Index)** — stores min/max per block of table pages. Very small, great for naturally ordered data (timestamps).

**The key insight for interviews:**
B-tree is the default because it handles the widest range of operations efficiently: equality (`=`), range (`>`, `<`, `BETWEEN`), sorting (`ORDER BY`), and prefix matching (`LIKE 'abc%'`). It's the best general-purpose trade-off between read speed, write speed, and disk access patterns. -->

---

### Q23. In JavaScript, what is the difference between a Promise and a callback?

<!-- Both are patterns for handling asynchronous operations, but they work very differently:

**Callback:**
A function you pass to another function, to be called when the work is done. It's the oldest async pattern in JavaScript.

```js
// Callback pattern (Node.js error-first convention):
fs.readFile('data.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(data);
});
```

**Promise:**
An object that represents a future value. Instead of passing a function in, you get an object back that you can attach handlers to.

```js
// Promise pattern:
fetch('/api/data')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

**Side-by-side comparison — reading a file then parsing it then saving it:**

```js
// CALLBACK — nested, messy ("callback hell"):
readFile('input.txt', (err, raw) => {
  if (err) return handleError(err);
  parseData(raw, (err, parsed) => {
    if (err) return handleError(err);
    saveToDb(parsed, (err, result) => {
      if (err) return handleError(err);
      console.log('Done:', result);
    });
  });
});

// PROMISE — flat chain:
readFile('input.txt')
  .then(raw => parseData(raw))
  .then(parsed => saveToDb(parsed))
  .then(result => console.log('Done:', result))
  .catch(err => handleError(err));  // one catch handles all errors

// ASYNC/AWAIT — reads like synchronous code:
async function process() {
  try {
    const raw = await readFile('input.txt');
    const parsed = await parseData(raw);
    const result = await saveToDb(parsed);
    console.log('Done:', result);
  } catch (err) {
    handleError(err);  // one catch handles all errors
  }
}
```

**Key differences:**

| | Callback | Promise |
|---|---|---|
| **Flow control** | Nesting (pyramid of doom) | Chaining (.then()) or sequential (await) |
| **Error handling** | Check `err` in every callback | Single .catch() or try/catch |
| **Composition** | Manual, painful | Promise.all(), Promise.race(), Promise.allSettled() |
| **Inversion of control** | You hand your function to someone else — you trust they'll call it correctly, once, with the right args | You get an object back — YOU decide what to do with it |
| **Guarantees** | None — callback could be called twice, never, or synchronously | Settled exactly once (either fulfilled or rejected), always async |
| **Return values** | Can't return from a callback to the outer function | Promises chain — each .then() returns a new Promise |

**The evolution:**
Callbacks (ES5) → Promises (ES6/2015) → async/await (ES2017)

Each step solved the pain points of the previous one:
- Promises solved callback hell and inconsistent error handling
- async/await solved Promise chain readability and made async code look synchronous

**When callbacks are still used:**
- Event listeners: `button.addEventListener('click', callback)`
- Array methods: `arr.map(callback)`, `arr.filter(callback)`
- Streams: `stream.on('data', callback)`

These are synchronous or event-based callbacks — not the async-flow-control callbacks that Promises replaced. -->

---

## Quick Reference — One-Line Answers

| # | Question | One-Liner |
|---|----------|-----------|
| 1 | Git fast-forward merge | Moves the branch pointer forward when there are no divergent commits — no merge commit created |
| 2 | Merge vs rebase | Merge creates a merge commit preserving history; rebase replays commits for a linear history |
| 3 | Spread operator | `...` expands iterables into individual elements for copying, merging, and argument passing |
| 4 | Interface (TS) | A compile-time contract that defines the shape of an object — properties, methods, and their types |
| 5 | async/await benefits | Reads like sync code, standard try/catch, better stack traces, works with loops and conditionals |
| 6 | Unhandled promise rejection | A rejected Promise with no .catch() or try/catch — crashes Node.js v15+ |
| 7 | Closure | A function that retains access to its outer scope's variables even after the outer function returns |
| 8 | Callback | A function passed as an argument to another function, called when an operation completes |
| 9 | Middleware (Node.js) | A function in the request pipeline with access to req, res, and next() |
| 10 | Dependency injection | Passing dependencies in from outside instead of creating them internally — enables testing and loose coupling |
| 11 | HTTP status codes | 2xx success, 3xx redirect, 4xx client error, 5xx server error |
| 12 | HTTP stateful/stateless | Stateless — each request is independent; state is added via cookies/tokens |
| 13 | SQL declarative/imperative | Declarative — you say WHAT you want, the optimizer decides HOW |
| 14 | CTE | Common Table Expression — a named temporary result set using the `WITH` keyword |
| 15 | Table vs view | Table stores data on disk; a view is a saved query that runs against tables on access |
| 16 | Recursive query | A CTE that references itself to traverse hierarchical data (WITH RECURSIVE) |
| 17 | SQL index | A B-tree data structure that speeds up reads at the cost of slower writes and extra storage |
| 18 | Monolith vs microservice | Monolith: one deployable unit, simple; Microservices: independent services, scalable but complex |
| 19 | Message queue problems | Ordering, duplicates, message loss, poison pills, eventual consistency, consumer lag |
| 20 | Caching | Store frequently accessed data in faster storage (Redis); invalidate via TTL or events |
| 21 | Event loop | Single-threaded loop that processes async callbacks from queues, enabling non-blocking I/O |
| 22 | Index data structure | B+ tree — O(log n) lookups, disk-optimized, supports range queries and sorting |
| 23 | Promise vs callback | Callbacks nest and have no guarantees; Promises chain, settle once, and have single .catch() error handling |
