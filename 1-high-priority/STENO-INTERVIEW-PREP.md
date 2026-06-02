# Steno Interview Prep — Technical Screen Q&A

> Based on real interview questions reported by candidates (2024–2025).
> Format: rapid-fire Q&A covering Git, JavaScript/TypeScript, Node.js, SQL, and system design.

---

## Part 1: The 20 Rapid-Fire Questions

---

### Q1. What is a git fast-forward merge?

<!-- ‼️ A fast-forward merge happens when the branch you're merging into has no new commits since the feature branch was created. ‼️ Git doesn't create a merge commit — it just moves the pointer forward to the latest commit on the feature branch. It's like the main branch "catches up" by sliding its pointer forward along the same commit history.

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

‼️ You can force a merge commit even when fast-forward is possible with `git merge --no-ff`, which is useful to preserve branch history in the log. -->

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
- Rewrites commit history to make it look like you branched off from the latest commit‼️
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
- `merge`: on shared branches (main, develop) — safe because it doesn't rewrite history‼️
- `rebase`: on your own feature branches before merging — keeps history clean‼️
- Golden rule: NEVER rebase commits that have been pushed and shared with others, because rebase rewrites commit hashes and will cause conflicts for everyone else -->‼️

---

### Q3. What is the spread operator?

<!-- The spread operator (`...`) expands an ‼️ iterable (array, object, string) into individual elements. It's used for copying, merging, and passing arguments.

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
* Later properties overwrite earlier ones
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

Key detail: spread creates SHALLOW copies — ‼️ nested objects/arrays are still references to the originals. If you modify a nested object in the copy, the original changes too. -->

---

### Q4. What is an interface (in TypeScript)?

<!-- An interface defines the shape/contract of an object — what properties and methods it must have, and their types. It's a compile-time construct that disappears after compilation to JavaScript (‼️zero runtime cost).

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
- They enable dependency injection and make code testable (program to an interface, not an implementation)‼️
- They serve as documentation for what a function expects or returns -->

---

### Q5. Explain the benefits of async/await

<!-- async/await is syntactic sugar over Promises that makes asynchronous code read like synchronous code.

```js
* Promise chain:
function getUser(id) {
  return fetch(`/users/${id}`)
    .then(res => res.json())
    .then(user => fetch(`/posts?userId=${user.id}`))
    .then(res => res.json())
    .catch(err => console.error(err));
}

* async/await — same logic, much cleaner:
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
5. **Loops** — you can use for loops, while loops, for...of with await; Promise chains can't do this cleanly‼️

**Important to remember:**
- async functions ALWAYS return a Promise‼️
- await only works inside an async function (or at top level in ES modules‼️)
- await pauses execution of that function but does NOT block the event loop — other code continues running
- For parallel operations, use `Promise.all([...])` instead of sequential awaits -->

---

### Q6. What is an unhandled promise rejection?

<!-- An unhandled promise rejection occurs when a Promise is rejected (throws an error) and there is no .catch() handler or try/catch block to handle it.

```js
This creates an unhandled promise rejection:
async function fetchData() {
  const res = await fetch('https://bad-url.invalid');  // throws
  return res.json();
}
fetchData();  // no .catch(), no try/catch — rejection is unhandled

* Fixed — Option 1: .catch()
fetchData().catch(err => console.error('Failed:', err));

* Fixed — Option 2: try/catch inside the function
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
- In Node.js (v15+), unhandled promise rejections CRASH the process by default (`--unhandled-rejections=throw`)‼️
- In older Node.js versions, they just logged a warning — bugs would silently fail and cause mysterious downstream issues‼️
- In browsers, they show up in the console but don't crash the page‼️

**Global safety net (doesn't replace proper error handling):**‼️
```js
* Node.js
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
  * Log it, alert monitoring, etc.
});

* Browser
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
* count is not accessible from outside, but the inner function still has access to it
```

**How it works:**
When a function is created, ‼️it gets a hidden reference to its surrounding scope (the "lexical environment"). Even after the outer function finishes executing, the inner function holds onto that reference — ‼️the variables don't get garbage collected because something still points to them.

**Common use cases:**
1. **Data privacy / encapsulation** — create private variables that can't be accessed directly‼️
2. **Factory functions** — functions that create customized functions‼️
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
4. **Module pattern** — before ES modules, closures were how you created private state‼️

**Classic gotcha — closures in loops:**
```js
* Bug: all callbacks log 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);  // prints 3, 3, 3
}

* Fix: use let (block-scoped, creates a new binding per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);  // prints 0, 1, 2
}
``` -->

---

### Q8. What is a callback function?

<!-- A callback is a function passed as an argument to another function, to be called (invoked) at a later time — when some operation completes or some event occurs.

```js
* Synchronous callback:
const numbers = [3, 1, 2];
numbers.sort((a, b) => a - b);  // the comparator is a callback‼️

* Asynchronous callback:
fs.readFile('data.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(data);
});
```

**Error-first callback pattern (Node.js convention):**
The first argument of the callback is always the error (null if no error), and the second argument is the result. This is how Node.js built-in modules work (fs, http, etc.).‼️

```js
function fetchData(url, callback) {
  * ... do async work
  if (error) {
    callback(error, null);    // error first‼️
  } else {
    callback(null, result);   // null error means success‼️
  }
}
```

**The problem — Callback Hell:**
```js
getUser(id, (err, user) => {
  getOrders(user.id, (err, orders) => {
    getItems(orders[0].id, (err, items) => {
      * deeply nested, hard to read, hard to handle errors
    });
  });
});
```

This is why Promises and async/await were introduced — they flatten nested callbacks into chains or sequential-looking code. Callbacks are still used for synchronous operations (array methods like map, filter, forEach) and event listeners, but for async flow control, Promises/async-await are the modern standard. -->

---

### Q9. What is middleware (in Node.js)?

<!-- Middleware is a function that sits between the incoming request and the final route handler. It has access to the request object, the response object, and the next middleware function in the chain. It can modify the request/response, end the request cycle, or pass control to the next middleware.

```js
* Express middleware signature:
function myMiddleware(req, res, next) {
  * Do something with req or res
  next();  // pass control to the next middleware
}

app.use(myMiddleware);  // applies to ALL routes‼️
```

**How the middleware chain works:**
```
Request → [Logger] → [Auth] → [BodyParser] → [Route Handler] → Response‼️
```
‼️ Each middleware calls `next()` to pass control to the next one. ‼️ If a middleware doesn't call `next()`, the request hangs (or the middleware must send a response itself).

**Common middleware examples:**
```js
* Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

* Authentication
app.use((req, res, next) => {
  const token = req.headers.authorization;‼️
  if (!token) return res.status(401).json({ error: 'No token' });
  req.user = verifyToken(token);  // attach user to request
  next();
});

* Body parsing (built-in)
app.use(express.json());  // parses JSON request bodies‼️

* Error-handling middleware (4 parameters):
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});
```

**Key concepts:**
- Middleware executes in the ORDER it's registered (`app.use()`)
- `app.use()` applies to all routes; ‼️`app.use('/api', ...)` applies only to routes starting with /api
- Route-specific middleware: ‼️`app.get('/admin', authMiddleware, handler)`
- Error middleware has 4 params `(err, req, res, next)` and is called when `next(err)` is used‼️
- Common middleware: cors, ‼️helmet (security headers), morgan (logging), express-rate-limit, cookie-parser -->

---

### Q10. What is dependency injection? And what are its benefits?‼️

<!-- ‼️ Dependency injection (DI) is a design pattern where a component receives its dependencies from the outside rather than creating them internally. Instead of a class/function creating what it needs, you "inject" those dependencies in.

```ts
* WITHOUT DI — tightly coupled:
class UserService {
  private db = new PostgresDatabase();  // creates its own dependency‼️

  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}

* WITH DI — loosely coupled:
class UserService {
  constructor(private db: Database) {}  // dependency injected from outside‼️

  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}

* Usage:
const db = new PostgresDatabase();
const userService = new UserService(db);  // inject the dependency

* In tests:
const mockDb = new MockDatabase();
const userService = new UserService(mockDb);  // inject a mock
```

```
The difference is WHO DECIDES which database to use:

WITHOUT DI — the class decides internally:
  private db = new PostgresDatabase();   ← hardcoded INSIDE the class
  UserService is WELDED to PostgresDatabase. You cannot change it without editing the class.
  Want to test with a fake DB?      → Can't. It's hardcoded.
  Want to switch to MySQL?          → Edit the class.
  Want to use SQLite for local dev? → Edit the class.

WITH DI — the caller decides from outside:
  constructor(private db: Database) {}   ← passed in from OUTSIDE
  Now whoever CREATES UserService decides which database:
  Production: new UserService(new PostgresDatabase())
  Testing:    new UserService(new FakeDatabase())
  Local dev:  new UserService(new SQLiteDatabase())
  The UserService code NEVER changes. Same class, different behavior.

Key insight: `Database` in the constructor is an INTERFACE (a contract)‼️, not a specific database.
Any class that has a .query() method works — Postgres, MySQL, a fake for testing.
UserService doesn't know or care which one it gets.
```

**Benefits:**
1. **Testability** — swap real dependencies with mocks/stubs for unit testing. This is the biggest practical benefit.‼️
2. **Loose coupling** — components depend on abstractions (interfaces), not concrete implementations. You can swap Postgres for MySQL without changing UserService.
3. **Single Responsibility** — a class focuses on its own logic, not on creating/configuring its dependencies.
4. **Reusability** — the same class works with different implementations of its dependencies.
5. **Configurability** — easy to change behavior by injecting different implementations (e.g., different loggers for dev vs prod).

**In Node.js/TypeScript, DI is often done through:**‼️
- Constructor injection (most common, shown above)
- Parameter injection (passing dependencies as function arguments)
- DI containers/frameworks (‼️NestJS uses decorators and a built-in DI container, similar to Angular and Spring) -->

---

### Q11. Name HTTP status codes

<!-- HTTP status codes are grouped by their first digit:

**1xx — Informational:**‼️
- 100 Continue — server received request headers, client should send the body‼️
- 101 Switching Protocols — switching to WebSocket‼️

**2xx — Success:**
- 200 OK — standard success response
- 201 Created — resource successfully created (POST)
- 204 No Content — success but no body to return (DELETE)‼️

**3xx — Redirection:**
- 301 Moved Permanently — resource permanently moved (SEO: search engines update their index)
- 302 Found — temporary redirect‼️
- 304 Not Modified — cached version is still valid, no need to re-download‼️

**4xx — Client Error:**
- 400 Bad Request — malformed request, invalid JSON, missing required fields
- 401 Unauthorized — not authenticated (misleading name — really means "unauthenticated")
- 403 Forbidden — authenticated but not authorized / don't have permission
- 404 Not Found — resource doesn't exist
- 405 Method Not Allowed — e.g., POST to a GET-only endpoint‼️
- 409 Conflict — e.g., duplicate entry, resource already exists‼️
- 422 Unprocessable Entity — request is valid JSON but fails validation (common in APIs)‼️
- 429 Too Many Requests — rate limited

**5xx — Server Error:**
- 500 Internal Server Error — generic server-side failure
- 502 Bad Gateway — server acting as proxy got invalid response from upstream‼️
- 503 Service Unavailable — server is overloaded or down for maintenance‼️
- 504 Gateway Timeout — proxy/load balancer timed out waiting for upstream‼️

**Most important for REST APIs:** 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500 -->

---

### Q12. Is HTTP stateful or stateless?

<!-- ‼️ HTTP is STATELESS. Each request is completely independent — the server does not remember anything about previous requests from the same client.

**What this means:**
- Every request must contain ALL the information the server needs to process it‼️
- The server doesn't know if you just sent a request 1 second ago
- Two requests from the same client are treated as completely unrelated

**Why stateless?**
- **Scalability** — any server in a cluster can handle any request (no need to route to a "sticky" server that has your state)
- **Reliability** — if a server crashes, no session state is lost
- **Simplicity** — servers don't need to manage/clean up session memory
- **Cacheability** — stateless responses are easier to cache‼️

**How we add "state" on top of stateless HTTP:**‼️
Since many apps need to know who the user is across requests, we use:
1. **Cookies** — server sends `Set-Cookie` header, browser sends it back on every subsequent request‼️
2. **Session tokens** — server stores session data, sends client a session ID (in a cookie)
3. **JWTs (JSON Web Tokens)** — self-contained token with user info, sent in `Authorization` header; server doesn't need to store anything (stateless authentication on top of stateless HTTP)‼️
4. **URL parameters** — less common, putting session info in the URL

The key insight: HTTP itself is stateless. We build stateful experiences (login sessions, shopping carts) ‼️ by passing tokens/cookies WITH each request so the server can look up or decode the state. -->

---

### Q13. Is SQL declarative or imperative?

<!-- ‼️SQL is DECLARATIVE. ‼️You describe WHAT data you want, not HOW to get it.

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
- The same SQL query might be executed completely differently depending on table size, available indexes, and data distribution‼️
- You focus on business logic, the database handles performance optimization

**Declarative vs Imperative examples in programming:**
- Declarative: SQL, HTML, CSS, React JSX, regex
- Imperative: for loops, step-by-step instructions, most general-purpose code

**The real-world nuance:**
While SQL is declarative, experienced developers still think about HOW the optimizer will execute their queries — using EXPLAIN to check query plans, adding proper indexes, structuring JOINs efficiently. You write declaratively but optimize with awareness of the execution engine. -->

---

### Q14. What is a CTE? And its keyword?

<!-- A CTE (Common Table Expression) is a ‼️ temporary, named result set defined using the ‼️ `WITH` keyword. ‼️ It exists only for the duration of that single query. ‼️Think of it as a temporary view or a named subquery that you can reference multiple times.

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
2. **Reusability** — reference the same CTE multiple times in one query (a subquery would need to be copy-pasted)‼️
3. **Organization** — break complex queries into named, logical steps
4. **Recursion** — CTEs support recursive queries (subqueries don't)‼️

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
- A view is a ‼️ SAVED QUERY — it doesn't store data itself
- It's a virtual table defined by a SELECT statement‼️
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

-- Use it like a table:‼️
SELECT * FROM active_premium_users WHERE name LIKE 'A%';
```

**Why use views?**
1. **Simplification** — hide complex JOINs behind a simple name
2. **Security** — expose only certain columns to certain roles (e.g., a view without salary column)
3. **Consistency** — everyone uses the same query logic instead of copy-pasting SQL
4. **Abstraction** — change underlying table structure without breaking queries that use the view‼️

**Materialized View (bonus):**
‼️ A materialized view DOES store data physically — it's a cached snapshot of the query result. It needs to be manually refreshed (`REFRESH MATERIALIZED VIEW`) to pick up changes. Used for performance when the underlying query is expensive and data doesn't need to be real-time.

**CTE vs View — also important to know:**

A CTE (Common Table Expression) is often confused with a view, but they are very different:

```sql
-- CTE = temporary, exists ONLY for ONE query, then gone
WITH active_users AS (
    SELECT * FROM users WHERE status = 'active'
)
SELECT * FROM active_users WHERE age > 25;
-- after this query runs, "active_users" no longer exists

-- View = permanent, saved in the database, reusable by anyone
CREATE VIEW active_users AS
    SELECT * FROM users WHERE status = 'active';
-- use it forever from anywhere, until you DROP VIEW
```

|           | CTE | View |
|---|---|---|
| Lifetime | One query only | Permanent until dropped |
| Stored in DB? | No | ‼️Yes (as a saved query definition) |
| Reusable? | No — rewrite each time | Yes — like a table |
| Recursive? | Yes (WITH RECURSIVE) | No |
| Permissions? | No | ‼️Yes — GRANT access |
| Use case | Break complex query into steps | Reusable abstraction, security |

A regular view does NOT store data — it's just a saved query that re-runs every time.
It's basically a permanent CTE with a name. -->

---

### Q16. What is a recursive query?‼️

<!-- ‼️ A recursive query is a query that references itself to process hierarchical or tree-structured data. It uses a recursive CTE (WITH RECURSIVE) to repeatedly execute until a termination condition is met.

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
Recursive queries can run forever if there's a cycle. Most databases let you set a limit:‼️
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
- Balanced tree structure — all leaf nodes are at the same depth‼️
- O(log n) for search, insert, delete
- Great for range queries (>, <, BETWEEN) because leaf nodes are linked‼️
- Works well with disk-based storage (minimizes disk reads)‼️

**Types of indexes:**
- **B-tree** — default, good for equality and range queries
- **Hash** — faster for exact equality, useless for ranges‼️
- **GIN (Generalized Inverted Index)** — for full-text search, arrays, JSONB‼️
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
- Services communicate via HTTP/REST, gRPC, or message queues‼️

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
- No network latency between components (it's all in-process function calls)‼️
- Easy to maintain data consistency (one database, real transactions)
- Lower operational complexity (one thing to monitor, deploy, scale)

**Monolith — Cons:**
- Gets harder to maintain as it grows (one change can break unrelated features)
- Must deploy the entire app for any change
- Scales as a whole unit (can't scale just the payment service)‼️
- Technology lock-in (one language, one framework)

**Microservices — Pros:**
- Independent deployment — deploy one service without touching others
- Independent scaling — scale only the services that need it
- Team autonomy — each team owns their service end-to-end
- Technology flexibility — each service can use different languages/databases

**Microservices — Cons:**
- Distributed system complexity — network failures, latency, eventual consistency
- Harder to debug (tracing a request across 10 services)‼️
- Data consistency is hard (no cross-service transactions without patterns like Saga)‼️
- Operational overhead — more services to deploy, monitor, and maintain
- Requires mature DevOps (CI/CD, container orchestration, service mesh)

**When to use which:**
- Start with a monolith for most projects — it's faster to develop and simpler
- Consider microservices when: team is large (10+ engineers), different components have very different scaling needs, or you need independent deployments
- You can always extract microservices from a monolith later (the reverse is much harder) -->

---

### Q19. What are some problems you can run into using message queues with microservices?‼️

<!-- Message queues (RabbitMQ, Kafka, SQS, etc.) enable async communication between microservices, but they introduce several challenges:

**What is a "broker" in this context?**‼️

A broker is the message queue server itself — the middleman that sits between services and routes messages.
Think of it like a post office:

- **Producer** (sender) — the microservice that creates and sends a message
- **Broker** (post office) — the system that receives, stores, and delivers messages. Examples: **RabbitMQ, Kafka, Amazon SQS**
- **Consumer** (recipient) — the microservice that reads and processes the message

```
Service A  →  [ Broker (RabbitMQ/Kafka) ]  →  Service B
(producer)     stores messages in queues       (consumer)
               until consumers pick them up
```

The broker's job is to:
1. **Accept** messages from producers
2. **Store** them (in memory or on disk, depending on durability settings)
3. **Deliver** them to consumers
4. **Track** which messages have been acknowledged (processed)‼️

So when the notes below say things like:
- "broker crashes before persisting" — the queue server itself goes down before saving the message to disk, so the message is lost
- "memory issues on the broker" — too many unprocessed messages pile up and the queue server runs out of memory
- "broker retries" — the queue server re-sends a message because it didn't get an acknowledgment back from the consumer

The term "broker" comes from the idea that it brokers (mediates) communication between services that don't talk to each other directly.

**1. Message ordering:**‼️
- Messages may arrive out of order, ‼️ especially with multiple consumers
- Example: "update user" arrives before "create user" — the update fails
- Fix: partition by key (Kafka), use sequence numbers, design for idempotency‼️

**2. Duplicate messages (at-least-once delivery):**
- Most queues guarantee at-least-once delivery, meaning the same message can be delivered twice (broker retries, consumer crashes after processing but before acknowledging)
- If your handler isn't idempotent, you process the same payment twice
- Fix: idempotent consumers (use a unique message ID + deduplication table)

**3. Message loss:**
- Messages can be lost if the broker crashes before persisting, or a consumer acknowledges before processing
- Fix: persistent/durable queues, acknowledge AFTER processing, use transactions

**4. Poison pill messages:**‼️
- A malformed message that crashes the consumer every time it's delivered‼️
- Consumer crashes → message goes back to queue → consumer picks it up → crashes again (infinite loop)
- Fix: dead letter queue (DLQ) — after N failed attempts, move the message to a DLQ for manual inspection‼️

**5. Eventual consistency:**
- Services are no longer immediately consistent — one service may have processed the message while another hasn't yet
- Users might see stale data briefly
- This requires careful UX design and client-side handling

**6. Monitoring and debugging complexity:**
- Hard to trace a request across multiple services and queues
- Need distributed tracing (Jaeger, Datadog) and centralized logging
- Messages sitting in a queue don't show up in normal request logs‼️

**7. Queue backpressure / consumer lag:**
- If producers send messages faster than consumers process them, the queue grows
- Can lead to memory issues on the broker and increased latency
- Fix: auto-scaling consumers, rate limiting producers, monitoring queue depth

**8. Schema evolution:**‼️
- If the message format changes, old consumers may not understand new messages (and vice versa)
- Fix: versioned schemas, backward-compatible changes, schema registry (Avro, Protobuf) -->

---

### Q20. Explain caching, and how you would implement it?

<!-- Caching stores frequently accessed data in a faster storage layer so you don't have to recompute or re-fetch it every time.

**Why cache?**
- Database queries are slow (disk I/O, complex joins)
- API calls to external services are slow (network latency)
- Computed results (reports, aggregations) are expensive to generate
- Caching trades memory for speed‼️

**Cache layers (closest to user → farthest):**
1. **Browser cache** — static assets (images, CSS, JS) cached by the browser via HTTP headers‼️
2. **CDN cache** — static content cached at edge servers close to users (CloudFront, Cloudflare)
3. **Application cache** — in-memory cache in your server process (Node.js Map, LRU cache)
4. **Distributed cache** — shared cache across multiple servers (Redis, Memcached)
5. **Database cache** — query result cache, buffer pool (built into the DB)‼️

**Implementation with Redis (most common in Node.js):**
```js
const Redis = require('ioredis');
const redis = new Redis();

async function getUser(id) {
  * 1. Check cache first
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    return JSON.parse(cached);  // cache HIT — fast path
  }

  * 2. Cache MISS — query database
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);

  * 3. Store in cache with TTL (time-to-live)
  await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);  // expires in 1 hour

  return user;
}
```

**Cache invalidation strategies:**
1. **TTL (Time-to-Live)** — cache expires after a set time. Simple but data can be stale until expiry.
2. **Write-through** — write to cache AND database at the same time. Always consistent, but every write is slower.
3. **Write-behind (write-back)** — write to cache first, async write to database later. Fast writes, but risk of data loss if cache crashes.‼️
4. **Cache-aside (lazy loading)** — the pattern shown above. Only cache on read. Most common in application code.
5. **Event-driven invalidation** — when data changes, publish an event that clears the relevant cache keys.‼️

**Common cache problems:**
- **Cache stampede**‼️ — cache expires, 1000 requests simultaneously hit the database. ‼️Fix: mutex/lock, staggered TTLs, pre-warming.
- **Stale data** — cache shows outdated information. Fix: shorter TTL, active invalidation on writes.
- **Memory pressure**‼️ — cache grows too large. Fix: eviction policies (LRU — Least Recently Used, LFU — Least Frequently Used).

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
4. When the async operation completes, its callback is placed in the appropriate queue‼️
5. The event loop picks callbacks from the queues and pushes them onto the call stack when it's empty‼️
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

* Output: 1 - start, 5 - end, 4 - nextTick, 3 - promise, 2 - setTimeout
```

**Why this matters:**
- The event loop is WHY Node.js can handle thousands of concurrent connections with a single thread
- Blocking the event loop (heavy computation, synchronous file reads) freezes EVERYTHING
- CPU-intensive work should be offloaded to worker threads or a separate process -->

---

### Q22. What data structure does a SQL index use and why?

<!-- The default (and most common) data structure for SQL indexes is a **B-tree** (specifically ‼️ B+ tree in most implementations like PostgreSQL, MySQL InnoDB, SQL Server).

**What is a B+ tree?**
A self-balancing tree where:‼️
- Internal nodes store keys and pointers to child nodes (used for navigation)‼️
- Leaf nodes store the actual indexed values and pointers to the table rows‼️
- All leaf nodes are at the same depth (balanced = predictable performance)‼️
- Leaf nodes are linked together in a doubly-linked list (great for range scans)‼️

```
            [50]                    ← root
           /    \
      [20,30]   [70,80]            ← internal nodes
      / | \      / | \
   [10,15] [20,25] [30,40] [50,60] [70,75] [80,90,95]  ← leaf nodes (linked →)
```

**Why B-tree / B+ tree?**
1. **O(log n) lookups** — with millions of rows, a B-tree might only need 3-4 levels deep. Finding a row = 3-4 disk reads instead of millions.
2. **Optimized for disk I/O** — ‼️B-trees are wide and shallow (high branching factor). Each node can hold many keys, which maps perfectly to disk pages (typically 4KB-16KB). One disk read loads an entire node with hundreds of keys.‼️
3. **Range queries** — because leaf nodes are linked, once you find the start of a range (WHERE price BETWEEN 10 AND 50), you just follow the leaf node chain. An array would need to be sorted + binary searched; a hash table can't do ranges at all.
4. **Sorted order** — data in a B-tree is sorted, so ORDER BY queries on indexed columns can skip sorting entirely.
5. **Efficient inserts/deletes** — the tree rebalances itself to maintain O(log n) guarantees even with heavy writes.

**Other index types and their data structures:**
- **Hash index** — hash table. O(1) exact-match lookups. ‼️Cannot do range queries, no ordering. Good for equality checks only.
- **GIN (Generalized Inverted Index)** — inverted index (like a book's index). Used for full-text search, JSONB, arrays. Maps each value to the list of rows containing it.
- **GiST** — generalized search tree. Used for geometric/spatial data (PostGIS), full-text search.
- **BRIN (Block Range Index)** — stores min/max per block of table pages. Very small, great for naturally ordered data (timestamps).‼️

**The key insight for interviews:**
B-tree is the default because it handles the widest range of operations efficiently: equality (`=`), range (`>`, `<`, `BETWEEN`), sorting (`ORDER BY`), and prefix matching (`LIKE 'abc%'`). It's the best general-purpose trade-off between read speed, write speed, and disk access patterns. -->

---

### Q23. In JavaScript, what is the difference between a Promise and a callback?

<!-- Both are patterns for handling asynchronous operations, but they work very differently:

**Callback:**
A function you pass to another function, to be called when the work is done. It's the oldest async pattern in JavaScript.

```js
* Callback pattern (Node.js error-first convention):
fs.readFile('data.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(data);
});
```

**Promise:**
An object that represents a future value. ‼️ Instead of passing a function in, you get an object back that you can attach handlers to.

```js
* Promise pattern:
fetch('/api/data')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

**Side-by-side comparison — reading a file then parsing it then saving it:**

```js
* CALLBACK — nested, messy ("callback hell"):
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

* PROMISE — flat chain:
readFile('input.txt')
  .then(raw => parseData(raw))
  .then(parsed => saveToDb(parsed))
  .then(result => console.log('Done:', result))
  .catch(err => handleError(err));  * one catch handles all errors

* ASYNC/AWAIT — reads like synchronous code:
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

|                   | Callback | Promise |
|---|---|---|
| **Flow control** | Nesting (pyramid of doom) | Chaining (.then()) or sequential (await) |
| **Error handling** | Check `err` in every callback | Single .catch() or try/catch |
| **Composition** | Manual, painful | Promise.all(), Promise.race(), Promise.allSettled() |
| **Inversion of control** | You hand your function to someone else — you trust they'll call it correctly, once, with the right args | You get an object back — YOU decide what to do with it |
| **Guarantees** | None — callback could be called twice, never, or synchronously | Settled exactly once (either fulfilled or rejected), always async |
| **Return values** | ‼️ Can't return from a callback to the outer function | Promises chain — each .then() returns a new Promise |

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

---

## Part 3: Additional Questions Based on Steno Job Requirements

> The JD calls for: Node.js + TypeScript, React.js, PostgreSQL, unit/integration testing,
> n-tier/monolithic/distributed architectures, cloud infra, CI/CD, and full-stack web fundamentals.
> These questions fill the gaps not covered in Parts 1–2.

---

### Q24. What is the difference between unit testing and integration testing?

<!-- **Unit testing** tests a single function, method, or component in ISOLATION. All external dependencies (database, APIs, other modules) are mocked or stubbed.

**‼️ Integration testing** tests how multiple components work TOGETHER — hitting real databases, real APIs, real middleware chains.

```ts
* UNIT TEST — isolated, fast, mocked dependencies:
describe('calculateTotal', () => {
  it('applies discount correctly', () => {
    const items = [{ price: 100, qty: 2 }, { price: 50, qty: 1 }];
    expect(calculateTotal(items, 0.1)).toBe(225);  // 250 - 10%
  });
});

* INTEGRATION TEST — real database, real HTTP:
describe('POST /api/orders', () => {
  it('creates an order and stores it in the database', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 1, qty: 2 }] });

    expect(res.status).toBe(201);

    * Verify it actually hit the database:
    const order = await db.query('SELECT * FROM orders WHERE id = $1', [res.body.id]);
    expect(order.rows).toHaveLength(1);
  });
});
```

**Key differences:**

|           | Unit Test | Integration Test |
|---|---|---|
| **Scope** | Single function/class | Multiple components together |
| **Dependencies** | Mocked/stubbed | Real (DB, APIs, file system) |
| **Speed** | Very fast (milliseconds) | Slower (seconds — DB setup, network) |
| **What it catches** | Logic bugs within a function | Wiring bugs, query errors, API contract mismatches |
| **When it breaks** | The function's logic changed | A dependency changed (schema, API response, config) |

**Testing pyramid:**
```
        /  E2E  \        ← few, slow, expensive (Cypress, Playwright)
       /----------\
      / Integration \    ← moderate number, test boundaries
     /----------------\
    /   Unit Tests     \  ← many, fast, cheap (Jest, Vitest)
```

**In practice at a Node.js + PostgreSQL stack:**
- Unit tests: pure business logic, utility functions, data transformations
- Integration tests: API endpoints end-to-end, database queries, middleware chains
- Use a test database (docker-compose with Postgres) for integration tests, reset between runs‼️

**Common tools:** Jest or Vitest for both, Supertest for HTTP integration tests, testcontainers for spinning up real Postgres in CI. -->

---

### Q25. What is n-tier architecture?

<!-- N-tier (or multi-tier) architecture separates an application into logical layers (tiers), each with a specific responsibility. The most common is 3-tier architecture.

**3-Tier Architecture:**
```
┌─────────────────────┐
│  Presentation Tier   │  ← UI (React, browser, mobile app)
│  (Client / Frontend) │
└─────────┬───────────┘
          │ HTTP/API calls
┌─────────┴───────────┐
│  Application Tier    │  ← Business logic (Node.js/Express API)
│  (Server / Backend)  │
└─────────┬───────────┘
          │ SQL queries
┌─────────┴───────────┐
│  Data Tier           │  ← Database (PostgreSQL)
│  (Database / Storage)│
└─────────────────────┘
```

**Each tier has a clear responsibility:**
1. **Presentation tier** — what the user sees and interacts with. Sends requests to the application tier. (React frontend)
2. **Application tier** — receives requests, applies business logic, validates data, orchestrates operations. (Node.js API server)
3. **Data tier** — stores and retrieves data. (PostgreSQL, Redis, S3)

**Rules:**
- Each tier only communicates with the tier directly above or below it
- The presentation tier NEVER talks directly to the database
- Tiers can be deployed independently on different servers/infrastructure

**Benefits:**
1. **Separation of concerns** — each layer has one job; easier to reason about and maintain
2. **Independent scaling** — scale the API tier without touching the database tier
3. **Team specialization** — frontend team works on presentation, backend on application tier
4. **Swappable** — replace React with a mobile app without touching the API; switch from PostgreSQL to MySQL without touching the frontend
5. **Security** — the database is never exposed to the client; all access goes through the API layer

**How it compares to monolith vs microservices:**
- N-tier describes how you LAYER your code (vertical separation)‼️
- Monolith vs microservices describes how you DEPLOY your code (horizontal separation)‼️
- You can have a monolith with n-tier architecture (most common for small-to-mid apps)
- Microservices often have their own internal n-tier structure per service -->

---

### Q26. What is CI/CD? How would you set up a pipeline?

<!-- **CI (Continuous Integration):** ‼️ Automatically build and test code every time someone pushes to the repository. Catches bugs early.

**CD (Continuous Delivery / Deployment):**
- Continuous Delivery: code is always in a deployable state; deployment is a manual approval‼️
- Continuous Deployment: every change that passes tests is automatically deployed to production

**A typical CI/CD pipeline:**
```
Push code → Build → ‼️Lint → Unit Tests → Integration Tests → Deploy to Staging → Deploy to Prod
```

**Example GitHub Actions pipeline for a Node.js + TypeScript app:**
```yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:                          # real DB for integration tests
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci                      # install deps (uses lockfile)‼️
      - run: npm run lint                # ESLint
      - run: npm run typecheck           # tsc --noEmit
      - run: npm run test:unit           # Jest unit tests
      - run: npm run test:integration    # tests against real Postgres
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test_db

  deploy:
    needs: test                          # only runs if tests pass‼️
    if: github.ref == 'refs/heads/main'  # only on main branch‼️
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: ./deploy.sh                 # deploy to cloud (AWS, GCP, etc.)
```

**Key CI/CD practices:**
1. **Run on every PR** — catch problems before merge
2. **Fast feedback** — parallelize tests, cache dependencies‼️
3. **Test against real dependencies** — use service containers (Postgres, Redis) in CI
4. **Environment parity** — CI should mirror production as closely as possible
5. **Automated deployments** — remove human error from the deploy process
6. **Rollback strategy** — blue/green deployment or feature flags for safe rollbacks

**Common CI/CD tools:** GitHub Actions, GitLab CI, CircleCI, Jenkins, AWS CodePipeline -->

---

### Q27. What are TypeScript generics, and why are they useful?

<!-- Generics let you write functions, classes, and interfaces that work with ANY type while still being type-safe. They're like function parameters, but for types.

**Without generics — you lose type information:**
```ts
function first(arr: any[]): any {
  return arr[0];
}
const val = first([1, 2, 3]);  // val is `any` — TypeScript can't help you
```

**With generics — type-safe AND flexible:**
```ts
function first<T>(arr: T[]): T {
  return arr[0];
}
const val = first([1, 2, 3]);      // val is `number` — TypeScript infers it
const str = first(['a', 'b']);      // str is `string`
```

**Common use cases:**

```ts
* Generic interface:
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const userRes: ApiResponse<User> = await fetchUser(1);
* userRes.data is typed as User

* Generic with constraints:
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
getProperty({ name: 'Alice', age: 30 }, 'name');  // return TYPE is string, return VALUE is 'Alice'
* T = { name: string, age: number }, K = 'name', so T[K] = T['name'] = string
getProperty({ name: 'Alice', age: 30 }, 'foo');   // ERROR: 'foo' is not a key

* Generic class:
class Stack<T> {
  private items: T[] = [];
  push(item: T) { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}
const numStack = new Stack<number>();
numStack.push(1);    // OK
numStack.push('a');  // ERROR: string is not assignable to number
```

**Why generics matter:**
1. **Reusability** — write once, use with any type
2. **Type safety** — catch errors at compile time, not runtime
3. **No `any`** — avoid losing type information
4. **Better DX** — autocomplete works because TypeScript knows the exact type

**Real-world examples:** Array<T>, Promise<T>, Map<K, V>, React's useState<T>, Express Request<Params, ResBody, ReqBody> -->

---

### Q28. What is the React virtual DOM, and how does React rendering work?

<!-- The virtual DOM is a ‼️ lightweight JavaScript representation of the actual DOM. React uses it to minimize expensive real DOM operations.

**How it works:**
```
1. State changes (setState, useState setter)
        ↓
2. React re-renders the component → creates a NEW virtual DOM tree‼️
        ↓
3. React DIFFS the new virtual DOM against the previous one ("reconciliation")
        ↓
4. React calculates the MINIMUM set of real DOM changes needed‼️
        ↓
5. React applies only those changes to the real DOM ("commit phase")‼️
```

**Why not just update the real DOM directly?**
- Real DOM operations are SLOW (layout recalculation, repaint, reflow)
- JavaScript object comparison (virtual DOM diff) is FAST
- Batching multiple changes into one DOM update is much cheaper than doing them individually‼️

**React rendering phases:**‼️
1. **Render phase** — ‼️ React calls your component function, generates virtual DOM. Pure, no side effects. Can be interrupted (concurrent mode).
2. **Commit phase** — ‼️ React applies the diff to the real DOM. Runs useEffect/useLayoutEffect. Cannot be interrupted.

<!-- useEffect vs useLayoutEffect:
  useEffect        — runs AFTER the browser paints the screen. Async, non-blocking.
                     Use for: data fetching, subscriptions, logging. (99% of the time use this)
  useLayoutEffect  — runs AFTER DOM update but BEFORE the browser paints.‼️ Synchronous, blocks paint.
                     Use for: measuring DOM layout (element size/position), preventing visual flicker.
  Same API, different timing. useLayoutEffect fires first, useEffect fires second.‼️
  If you don't need to read/modify layout before paint, always prefer useEffect. -->

**Key concepts:**

- **Re-render ≠ DOM update** — ‼️ a component re-rendering means React calls the function again, but the DOM only updates if the output actually changed
- **Reconciliation** — React's diffing algorithm. Compares elements by type and key. Same type = update props; different type = unmount and remount.
- **Keys** — help React identify which items in a list changed, were added, or removed. Using array index as key is an anti-pattern when list order changes.

```jsx
* React re-renders when:
* 1. State changes
const [count, setCount] = useState(0);
setCount(1);  // triggers re-render

* 2. Parent re-renders (even if props didn't change)
* Fix: wrap child in React.memo()
const Child = React.memo(({ name }) => <div>{name}</div>);

* 3. Context value changes
const theme = useContext(ThemeContext);  // re-renders when theme changes
```

**Performance optimization tools:**

- `React.memo()` — skip re-render if props haven't changed
- `useMemo()` — memoize expensive computed values
- `useCallback()` — memoize function references (prevent child re-renders)
- React DevTools Profiler — visualize what's re-rendering and why -->

---

### Q29. What are React hooks? Name the most important ones.

<!-- Hooks are functions that let you use state and other React features in function components (previously only available in class components). Introduced in React 16.8.

**Core hooks:**

```jsx
* useState — local state
const [count, setCount] = useState(0);

* useEffect — side effects (data fetching, subscriptions, DOM manipulation)
useEffect(() => {
  fetchData();
  return () => cleanup();  * cleanup on unmount or before next effect
}, [dependency]);  // re-runs when dependency changes; [] = mount only

* useContext — access context without nesting Consumer components
const theme = useContext(ThemeContext);

* useRef — mutable value that persists across re-renders without causing re-render
const inputRef = useRef(null);
inputRef.current.focus();

* useMemo — memoize expensive computation, recompute only when deps change
const sorted = useMemo(() => expensiveSort(items), [items]);‼️

* useCallback — memoize a function reference (useful to prevent child re-renders)
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

* useReducer — complex state logic (like Redux, but local)
const [state, dispatch] = useReducer(reducer, initialState);
dispatch({ type: 'INCREMENT' });
```

**Rules of hooks (enforced by ESLint plugin):**
1. Only call hooks at the TOP LEVEL — never inside conditions, loops, or nested functions
2. Only call hooks from React function components or custom hooks

**Why these rules exist:**
‼️ React relies on the ORDER hooks are called to match state to the right hook. If you put a hook inside an `if` statement, the order could change between renders, and React would mix up which state belongs to which hook.

**Custom hooks — reusable logic:**
```tsx
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}

* Usage:
const { data: users, loading } = useFetch<User[]>('/api/users');
``` -->

---

### Q30. What are PostgreSQL transactions, and what is ACID?

<!-- A transaction is a group of SQL operations that execute as a single unit — ‼️ either ALL succeed or ALL are rolled back. No partial changes.

```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- debit
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- credit
COMMIT;  -- both happen, or neither happens

-- If something fails:
ROLLBACK;  -- undo everything since BEGIN
```

**ACID properties — the guarantees a transaction provides:**

**A — Atomicity:**
All operations in a transaction succeed or all fail. No partial updates. If the server crashes between the debit and credit, the entire transaction is rolled back.

**C — Consistency:**
A transaction brings the database from one valid state to another. Constraints (foreign keys, unique, check) are enforced. You can't end up with negative balances if you have a CHECK constraint.

**I — Isolation:**
Concurrent transactions don't interfere with each other. Each transaction sees a consistent snapshot of the data, as if it were the only one running. (The level of isolation is configurable — see isolation levels below.)

**D — Durability:**
Once a transaction is committed, it's permanent — even if the server crashes immediately after. ‼️ The data is written to disk (WAL — Write-Ahead Log).

**PostgreSQL isolation levels (from least to most strict):**
1. **Read Uncommitted** — can see uncommitted changes from other transactions (PostgreSQL treats this as Read Committed)
2. **Read Committed** (default) — only sees data committed before each statement
3. **Repeatable Read** — sees a snapshot from the start of the transaction; prevents non-repeatable reads
4. **Serializable** — strictest; transactions behave as if they ran one after another

```sql
-- Set isolation level:‼️
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  -- your queries here
COMMIT;
```

**In Node.js with a connection pool:**‼️
```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [100, 1]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [100, 2]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
``` -->

---

### Q31. What is the difference between SQL JOINs?

<!-- JOINs combine rows from two or more tables based on a related column.

```
Table: users                Table: orders
| id | name   |            | id | user_id | total |
|----|--------|            |----|---------|-------|
| 1  | Alice  |            | 1  | 1       | 50    |
| 2  | Bob    |            | 2  | 1       | 30    |
| 3  | Carol  |            | 3  | 4       | 20    |
```

**INNER JOIN** — only rows that match in BOTH tables:
```sql
SELECT u.name, o.total
FROM users u INNER JOIN orders o ON u.id = o.user_id;
-- Result: Alice|50, Alice|30  (Bob has no orders → excluded. Order 3 has no user → excluded)
```

**LEFT JOIN (LEFT OUTER JOIN)** — all rows from the LEFT table, matched rows from right (NULL if no match):
```sql
SELECT u.name, o.total
FROM users u LEFT JOIN orders o ON u.id = o.user_id;
-- Result: Alice|50, Alice|30, Bob|NULL, Carol|NULL
```

**RIGHT JOIN** — all rows from the RIGHT table, matched rows from left:
```sql
SELECT u.name, o.total
FROM users u RIGHT JOIN orders o ON u.id = o.user_id;
-- Result: Alice|50, Alice|30, NULL|20  (order 3 has user_id 4 which doesn't exist)
```

**FULL OUTER JOIN** — all rows from BOTH tables, NULLs where no match:‼️
```sql
SELECT u.name, o.total
FROM users u FULL OUTER JOIN orders o ON u.id = o.user_id;
-- Result: Alice|50, Alice|30, Bob|NULL, Carol|NULL, NULL|20
```

**CROSS JOIN** — every row from left × every row from right (Cartesian product):
```sql
SELECT u.name, o.total FROM users u CROSS JOIN orders o;
-- Result: 3 users × 3 orders = 9 rows
```

**Quick decision guide:**
- "Get all users WITH their orders" → LEFT JOIN (includes users with no orders)‼️
- "Get only users who HAVE orders" → INNER JOIN
- "Find users WITHOUT orders" → LEFT JOIN ... WHERE o.id IS NULL
- "Combine everything from both sides" → FULL OUTER JOIN

**Performance tip:** JOINs on indexed columns are fast. Always ensure your JOIN columns (foreign keys) are indexed. -->

---

### Q32. What is a RESTful API? What are best practices for API design?

<!-- REST (‼️ Representational State Transfer) is an architectural style for designing APIs that uses HTTP methods and URLs to model resources.

**Core principles:**
1. **Resources** are nouns, identified by URLs: `/users`, `/orders/123`
2. **HTTP methods** map to CRUD operations:
   - GET = Read (idempotent, safe)
   - POST = Create
   - PUT = Replace entirely (idempotent)
   - PATCH = Partial update
   - DELETE = Remove (idempotent)
3. **Stateless** — each request contains all info needed; server stores no session state
4. **Uniform interface** — consistent URL patterns and response formats

**REST API design best practices:**

```
# Use plural nouns for resources:‼️
GET    /users          ← list all users
GET    /users/123      ← get specific user
POST   /users          ← create a user
PUT    /users/123      ← replace user 123‼️
PATCH  /users/123      ← update specific fields on user 123
DELETE /users/123      ← delete user 123

# Nested resources for relationships:
GET    /users/123/orders       ← orders for user 123
POST   /users/123/orders       ← create order for user 123

# Filtering, sorting, pagination via query params:
GET    /users?status=active&sort=name&page=2&limit=20‼️

# Versioning:
GET    /api/v1/users
```

**Response design:**
```json
* Success:
{ "data": { "id": 123, "name": "Alice" } }

* Error:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [{ "field": "email", "message": "must not be empty" }]
  }
}

* List with pagination:
{
  "data": [...],
  "meta": { "page": 2, "limit": 20, "total": 145 }‼️
}
```

**Best practices:**
1. Use proper HTTP status codes (201 for created, 404 for not found, etc.)
2. Use JSON for request/response bodies
3. Version your API from day one (`/api/v1/`)‼️
4. Use pagination for list endpoints (never return unbounded results)‼️
5. Return consistent error format across all endpoints
6. Use HTTPS always
7. Validate input at the API boundary; ‼️ sanitize before database queries
8. Rate limit public endpoints
9. Document with OpenAPI/Swagger -->

---

### Q33. What is cloud infrastructure? Explain key AWS/cloud concepts.

<!-- Cloud infrastructure means running your application on servers managed by a cloud provider (AWS, GCP, Azure) instead of owning physical hardware.

**Key concepts and services (using AWS terms, which are most common):**

**Compute:**
- **EC2** — virtual machines (servers) you can SSH into and run anything
- **ECS/EKS** — run Docker containers (ECS = AWS-managed, EKS = Kubernetes)‼️
- **Lambda** — serverless functions, pay per execution, auto-scales to zero
- **Fargate** — serverless containers (no server management)‼️

**Storage:**
- **S3** — object storage (files, images, backups). Virtually unlimited, cheap.
- **EBS** — block storage attached to EC2 (like a hard drive)‼️

**Database:**
- **RDS** — managed relational databases (PostgreSQL, MySQL). Handles backups, patching, replication.
- **ElastiCache** — managed Redis/Memcached‼️

**Networking:**
- **VPC** — your private network in the cloud. Isolates your resources.
- **Load Balancer (ALB)** — distributes traffic across multiple instances
- **Route 53** — DNS management
- **CloudFront** — CDN for static assets‼️

**Key concepts for interviews:**

**Horizontal vs Vertical scaling:**
- Vertical: bigger server (more CPU/RAM) — has a ceiling
- Horizontal: more servers behind a load balancer — scales infinitely

**Infrastructure as Code (IaC):**
- Define your infrastructure in code (Terraform, CloudFormation, Pulumi)‼️
- Version controlled, reproducible, reviewable in PRs

**Environment parity:**
- Dev, staging, and production should be as similar as possible
- Use Docker to guarantee "works on my machine" = "works in production"

**12-Factor App principles (most relevant):**
- Store config in environment variables (not in code)
- Treat backing services (DB, cache, queue) as attached resources
- Logs are event streams (write to stdout, let the platform collect them)
- Processes are stateless (‼️ store session data in Redis, not in memory) -->

---

### Q34. What is connection pooling and why does it matter?

<!-- Connection pooling maintains a pool of reusable database connections instead of opening a new connection for every query. Opening a database connection is expensive (TCP handshake, SSL negotiation, authentication) — pooling amortizes this cost.

**Without pooling:**
```
Request 1 → Open connection → Query → Close connection  (200ms overhead)
Request 2 → Open connection → Query → Close connection  (200ms overhead)
Request 3 → Open connection → Query → Close connection  (200ms overhead)
```

**With pooling:**
```
Startup → Create pool of 10 connections

Request 1 → Borrow connection → Query → Return to pool  (0ms overhead)
Request 2 → Borrow connection → Query → Return to pool  (0ms overhead)
Request 3 → Borrow connection → Query → Return to pool  (0ms overhead)
```

**In Node.js with PostgreSQL (pg library):**
```ts
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  user: 'myuser',
  password: 'secret',
  max: 20,               // max connections in pool
  idleTimeoutMillis: 30000,  // close idle connections after 30s
  connectionTimeoutMillis: 2000,  // fail if can't connect within 2s
});

* Simple query (auto-borrows and returns connection):
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

* For transactions (manually manage the connection):
const client = await pool.connect();
try {
  await client.query('BEGIN');
  * ... multiple queries ...
  await client.query('COMMIT');
} catch {
  await client.query('ROLLBACK');
} finally {
  client.release();  // ALWAYS release back to pool
}
```

**Why it matters:**
1. **Performance** — eliminates connection overhead per request
2. **Resource management** — ‼️ PostgreSQL has a max connections limit (default 100). Without pooling, 100 concurrent requests = 100 connections = limit hit.
3. **Reliability** — pool handles reconnection, health checks, and connection lifecycle
4. **Concurrency** — pool queues requests when all connections are busy, preventing database overload

**Common pitfall:** forgetting to release connections back to the pool (connection leak). Eventually the pool is exhausted and new queries hang forever. Always use try/finally or use the pool.query() shorthand. -->

---

### Q35. What is Docker, and why is it used in development and deployment?

<!-- Docker packages your application and ALL its dependencies into a container — a lightweight, standalone, executable unit that runs the same everywhere.

**The problem Docker solves:**
- "It works on my machine" — different Node versions, different OS, different Postgres versions
- Setting up a new developer takes hours of installing dependencies‼️
- Production environment differs from development

**Key concepts:**

```dockerfile
# Dockerfile — recipe for building a container image:
FROM node:20-alpine              # base image
WORKDIR /app
COPY package*.json ./
RUN npm ci --production           # install deps
COPY . .
RUN npm run build                 # compile TypeScript
EXPOSE 3000
CMD ["node", "dist/index.js"]     # start command
```

**Image vs Container:**
- **Image** — a blueprint (like a class). Built from a Dockerfile. Immutable.
- **Container** — a running instance of an image (like an object). Has its own filesystem, network, process space.

**docker-compose — run multiple services together:**‼️
```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ['3000:3000']
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/myapp
    depends_on: [db, redis]

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data   # persist data

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

```bash
docker-compose up    # starts app + postgres + redis
docker-compose down  # stops everything
```

**Why Docker matters for Steno's stack:**
1. **Development** — `docker-compose up` gives every developer identical Postgres, Redis, Node.js
2. **CI/CD** — tests run in containers, same environment as production
3. **Deployment** — build image once, deploy the same image to staging and production
4. **Isolation** — each service runs independently; a crash in one doesn't affect others
5. **Scaling** — container orchestration (ECS, Kubernetes) can spin up more copies as traffic grows -->

---

### Q36. What are environment variables, and how do you manage configuration?

<!-- Environment variables are key-value pairs set OUTSIDE your code that configure your application's behavior. They keep secrets and environment-specific settings out of the codebase.

```bash
# Set in the shell:
DATABASE_URL=postgres://user:pass@localhost:5432/myapp
JWT_SECRET=super-secret-key
NODE_ENV=production
PORT=3000
```

```ts
* Access in Node.js:
const dbUrl = process.env.DATABASE_URL;
const port = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');  * fail fast if missing
}
```

**Why not hardcode config?**
1. **Security** — secrets (DB passwords, API keys) should NEVER be in code or git history
2. **Environment differences** — dev uses localhost DB, staging uses staging DB, prod uses prod DB — same code, different config
3. **12-Factor App principle** — strict separation of config from code

**Common patterns in Node.js:**

**.env files (development only):**‼️
```bash
# .env (NEVER commit this — add to .gitignore)
DATABASE_URL=postgres://localhost:5432/myapp_dev
JWT_SECRET=dev-secret
REDIS_URL=redis://localhost:6379
```

```ts
* Load with dotenv (dev only):‼️
import 'dotenv/config';  // loads .env into process.env‼️
```

**Validation with a library (e.g., zod, envalid):**
```ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
* Throws a clear error if any required var is missing or invalid
```

**In production:**
- Set env vars through your cloud provider (AWS Parameter Store, ECS task definitions, Kubernetes secrets)
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) for sensitive values
- NEVER use .env files in production — they're a development convenience only -->‼️

---

### Q37. What is the difference between authentication and authorization?

<!-- **Authentication (AuthN)** — WHO are you? Verifying identity.
**Authorization (AuthZ)** — WHAT can you do? Verifying permissions.

Authentication always comes first. You can't check permissions until you know who the user is.

```
Request → [Authentication] → [Authorization] → [Route Handler]
            "Who is this?"     "Can they do this?"   "Do the thing"
```

**Authentication example (JWT-based):**
```ts
* Login — create a token:
app.post('/login', async (req, res) => {
  const user = await db.findByEmail(req.body.email);
  const valid = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

* Authentication middleware — verify the token:
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);  // { userId, role }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Authorization example (role-based):**
```ts
* Authorization middleware — check permissions:
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });  // 403, not 401
    }
    next();
  };
}

* Usage:
app.delete('/users/:id', authenticate, authorize('admin'), deleteUser);‼️
* Must be authenticated AND must have admin role
```

**Key distinction in HTTP status codes:**
- **401 Unauthorized** — actually means UNAUTHENTICATED (no valid token)
- **403 Forbidden** — authenticated but NOT AUTHORIZED (valid token, wrong permissions)

**Common auth strategies:**
- **Session-based** — server stores session, client sends cookie. Stateful.‼️
- **JWT-based** — token contains user info, server doesn't store state. Stateless. Must handle token expiry and refresh.
- **OAuth2/OpenID Connect** — delegated auth ("Login with Google"). Used for third-party access.
- **API keys** — for service-to-service communication. Simple but limited. -->‼️

---

---

## Part 4: Engineering Leaders Deep Dive & Take-Home Prep

> The 60-min engineering leaders round goes deeper into your resume and Steno's tech ecosystem.
> The take-home is followed by a 90-min deep dive: code review discussion, live coding, and more technical Qs.
> These questions prepare you for scenario-based, experience-driven, and design-level conversations.

---

### Q38. Walk me through how you would design a database schema for a court reporting platform.

<!-- This is a Steno-specific question — they're in the court reporting/legal tech space. Think about what entities exist.

**Core entities:**
```sql
-- Users of the platform (attorneys, court reporters, admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,  -- 'attorney', 'reporter', 'admin'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A legal case
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'closed', 'archived'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A deposition/hearing event
CREATE TABLE proceedings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    location TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',  -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    reporter_id UUID REFERENCES users(id),  -- assigned court reporter
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcripts produced by court reporters
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proceeding_id UUID REFERENCES proceedings(id),
    file_url TEXT NOT NULL,           -- S3 URL
    format VARCHAR(20) NOT NULL,     -- 'pdf', 'txt', 'ascii'
    status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'final', 'certified'
    page_count INTEGER,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: which attorneys are on which cases
CREATE TABLE case_participants (
    case_id UUID REFERENCES cases(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(50) NOT NULL,  -- 'lead_attorney', 'co_counsel', 'witness'
    PRIMARY KEY (case_id, user_id)
);

-- Indexes for common queries:
CREATE INDEX idx_proceedings_case_id ON proceedings(case_id);
CREATE INDEX idx_proceedings_reporter_id ON proceedings(reporter_id);
CREATE INDEX idx_proceedings_scheduled_at ON proceedings(scheduled_at);
CREATE INDEX idx_transcripts_proceeding_id ON transcripts(proceeding_id);
```

**Design decisions to discuss:**
1. **UUIDs vs auto-increment** — UUIDs are better for distributed systems, avoid ID enumeration attacks, and work well for APIs
2. **Status as VARCHAR vs enum** — VARCHAR is easier to extend; PostgreSQL enums require ALTER TYPE to add values‼️
3. **Soft delete vs hard delete** — legal data likely requires soft delete (add `deleted_at` column) for audit trails
4. **Timestamps with timezone** — always use TIMESTAMPTZ in PostgreSQL for legal records across time zones‼️
5. **File storage** — store files in S3, store the URL in the database (never store binary blobs in PostgreSQL)
6. **Audit trail** — for a legal platform, you'd likely want an audit log table tracking all changes (who changed what, when) -->‼️

---

### Q39. Tell me about a time you had to debug a production issue. What was your process?

<!-- Structure your answer with STAR (Situation, Task, Action, Result). Here's a framework:

**Framework for answering:**

1. **Detection** — how did you find out? (monitoring alert, user report, error spike in logs)
2. **Triage** — how severe? (P0 all users affected? P1 some users? P2 minor degradation?)
3. **Investigation** — what tools and steps?
   - Check error logs (CloudWatch, Datadog, Sentry)
   - Check recent deployments (was anything just deployed? → check git log)‼️
   - Check infrastructure (is the database overloaded? is a service down?)‼️
   - Reproduce the issue (can you trigger it locally or in staging?)
4. **Root cause** — what was actually wrong?
5. **Fix** — what did you do? (hotfix, rollback, config change)
6. **Prevention** — what did you do to prevent it from happening again? (added monitoring, added tests, improved the deploy process)

**Example answer structure:**
"We had an incident where API response times spiked to 30 seconds during peak hours. I checked our monitoring dashboard and saw the database connection pool was saturated — all 20 connections were in use and requests were queuing. I traced it to a new endpoint that was doing a complex query without a timeout, and some queries were taking 15+ seconds due to a missing index. I added the index (response times dropped to 50ms), added a query timeout of 5 seconds, and increased the pool size to 30 as a safety buffer. Then I added a Datadog monitor for connection pool usage so we'd catch this earlier."

**Key things interviewers look for:**
- Systematic approach (not just guessing)
- Use of observability tools (logs, metrics, traces)
- Speed of mitigation vs. speed of root cause fix
- What you learned and how you prevented recurrence -->

---

### Q40. How do you approach code reviews? What do you look for?

<!-- **What to look for in a code review:**

1. **Correctness** — does it actually solve the problem? Edge cases handled?
2. **Readability** — can another engineer understand this in 6 months? Clear variable names? Not too clever?
3. **Architecture** — is it in the right place? Does it follow existing patterns? Is the abstraction level appropriate?
4. **Performance** — any N+1 queries? Missing indexes? Unnecessary re-renders in React?
5. **Security** — SQL injection? XSS? Sensitive data exposure? Input validation?
6. **Testing** — are the important paths tested? Are tests actually testing the right thing (not just asserting true === true)?
7. **Error handling** — what happens when things fail? Are errors meaningful to the caller?

**How to give feedback:**
- Lead with questions, not commands ("What do you think about..." vs "Change this to...")
- Distinguish between blocking issues and suggestions ("Must fix: SQL injection" vs "Nit: prefer const over let here")
- Acknowledge good code — call out things done well, not just problems
- Be specific — link to docs, show an example, explain WHY not just WHAT

**How to RECEIVE feedback:**
- Don't take it personally — the code is being reviewed, not you
- Ask clarifying questions if you disagree
- If you push back, provide reasoning (not just "I prefer it this way")

**As a senior engineer:**
- Mentor through code reviews — explain the "why" behind suggestions
- Focus on patterns and architecture, not just style (that's what linters are for)‼️
- Consider the PR author's experience level — adjust depth of feedback accordingly -->

---

### Q41. How would you structure a Node.js + TypeScript project?

<!-- **A clean project structure for a Node.js API (what Steno likely uses):**

```
project-root/
├── src/
│   ├── index.ts              # entry point — starts the server
│   ├── app.ts                # Express app setup, middleware registration
│   ├── config/
│   │   └── index.ts          # env var validation (zod), DB config, etc.
│   ├── routes/
│   │   ├── users.ts          # route definitions: app.get('/users', ...)
│   │   └── orders.ts
│   ├── controllers/
│   │   ├── users.ts          # request handling: parse input, call service, send response‼️
│   │   └── orders.ts
│   ├── services/
│   │   ├── users.ts          # business logic: validation rules, orchestration‼️
│   │   └── orders.ts
│   ├── repositories/         # (or models/)
│   │   ├── users.ts          # database queries: SQL, ORM calls
│   │   └── orders.ts
│   ├── middleware/
│   │   ├── auth.ts           # authentication middleware
│   │   ├── errorHandler.ts   # global error handler
│   │   └── validate.ts       # request validation middleware (zod)
│   ├── types/
│   │   └── index.ts          # shared TypeScript interfaces/types
│   └── utils/
│       └── logger.ts         # logging utility‼️
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── .env.example              # template for env vars (committed)
├── .env                      # actual env vars (gitignored)
├── Dockerfile
└── docker-compose.yml
```

**The layered flow:**
```
Route → Controller → Service → Repository → Database‼️
```

- **Route**: defines URL patterns and HTTP methods
- **Controller**: handles the HTTP request/response — parses params, calls the service, sends the response
- **Service**: contains business logic — validation, authorization checks, orchestrating multiple repository calls
- **Repository**: raw data access — SQL queries or ORM calls. Only layer that talks to the database.

**Why this structure matters:**
1. **Testability** — you can unit test services by mocking repositories; integration test controllers by mocking services
2. **Separation of concerns** — changing the database (PostgreSQL → MySQL) only affects the repository layer
3. **Onboarding** — new developers know exactly where to find things
4. **Scalability** — easy to extract a module into its own service later

**TypeScript configuration (tsconfig.json key settings):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,           // enables all strict checks
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
``` -->

---

### Q42. What is database migration, and how do you manage schema changes?

<!-- Database migration is a version-controlled way to evolve your database schema over time. Instead of manually running ALTER TABLE commands, you write migration files that can be applied (and rolled back) in order.

**Why migrations?**
- Every developer and environment (dev, staging, prod) needs the same schema
- You need a history of what changed and when
- You need to be able to roll back if a migration breaks something
- Schema changes should be reviewed in PRs just like code changes

**Example with a migration tool (e.g., node-pg-migrate, Knex, Prisma):**

```ts
* migrations/20240115_001_create_users.ts
export async function up(db) {
  await db.query(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_users_email ON users(email);
  `);
}

export async function down(db) {
  await db.query('DROP TABLE IF EXISTS users;');
}

* migrations/20240120_002_add_role_to_users.ts
export async function up(db) {
  await db.query(`
    ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
  `);
}

export async function down(db) {
  await db.query('ALTER TABLE users DROP COLUMN role;');
}
```

**How it works:**
1. Migrations are numbered/timestamped and run in order
2. A `migrations` table in the database tracks which migrations have been applied
3. `migrate up` runs all pending migrations
4. `migrate down` rolls back the last migration
5. In CI/CD, migrations run automatically before the new code deploys‼️

**Best practices:**
1. **Never edit a migration that's been run in production** — create a new migration instead
2. **Make migrations backward-compatible** — ‼️ the old code should still work while the migration is being applied (important for zero-downtime deploys)
3. **Small, focused migrations** — one change per migration file
4. **Always write a down migration** — you need to be able to rollback
5. **Test migrations on a copy of production data** before running in production -->

---

### Q43. How do you handle error handling in a Node.js API?

<!-- **Layered error handling strategy:**

```ts
* 1. Define custom error classes:
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(422, 'VALIDATION_ERROR', message);
  }
}

* 2. Throw errors in your service/repository layer:
async function getUser(id: string) {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  if (!user.rows[0]) throw new NotFoundError('User');
  return user.rows[0];
}

* 3. Controller doesn't need try/catch if you use an async wrapper:
const asyncHandler = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);  * forwards errors to error middleware
};

* SYNTAX BREAKDOWN — asyncHandler is a CURRIED FUNCTION (a function that returns another function):‼️
*
*   Layer 1: takes fn (your route handler) and returns a NEW function
*   const asyncHandler = (fn: RequestHandler) =>
*
*   Layer 2: the NEW function — this is what Express actually calls as middleware‼️
*     (req: Request, res: Response, next: NextFunction) => {
*       Promise.resolve(fn(req, res, next)).catch(next);
*     };
*
*   Without arrow syntax, it's the same as:
*     function asyncHandler(fn: RequestHandler) {
*       return function(req: Request, res: Response, next: NextFunction) {
*         Promise.resolve(fn(req, res, next)).catch(next);
*       };
*     }
*
*   What Promise.resolve(fn(req, res, next)).catch(next) does:‼️
*     1. fn(req, res, next) — calls your route handler
*     2. Promise.resolve(...) — wraps the result in a promise
*        (if fn is async it already returns a promise; if sync, this makes it one)‼️
*     3. .catch(next) — if the promise rejects (handler threw an error),
*        calls next(error) which forwards to Express's error-handling middleware
*
*   WHY this exists — without asyncHandler, you must try/catch EVERY route:‼️
*     app.get('/users', async (req, res, next) => {
*       try {
*         const users = await db.getUsers();
*         res.json(users);
*       } catch (err) {
*         next(err);  * manually forward to error middleware
*       }
*     });
*
*   With asyncHandler — no try/catch needed:‼️
*     app.get('/users', asyncHandler(async (req, res) => {
*       const users = await db.getUsers();
*       res.json(users);  * if this throws, asyncHandler catches it automatically‼️
*     }));
*
*   So asyncHandler is a WRAPPER FACTORY — you give it your handler,
*   it gives back a new handler with automatic error catching built in.‼️
*   The currying pattern (fn) => (req, res, next) => ... is what makes it
*   work as a wrapper you can slot into Express's app.get().

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  res.json({ data: user });
}));

* 4. Global error handling middleware (registered LAST):
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    * Known error — send structured response:
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message }
    });
  }

  * Unknown error — log it, send generic response:
  console.error('Unexpected error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }
  });
});
```

**Key principles:**
1. **Fail fast** — validate inputs at the boundary (middleware); throw early if something is wrong
2. **Custom error classes** — categorize errors (not found, validation, auth, internal) so the error handler can respond appropriately
3. **Never expose stack traces** to the client in production — log them server-side‼️
4. **Centralized error handler** — one place handles all errors consistently
5. **Async wrapper** — avoids try/catch boilerplate in every route handler‼️
6. **Log meaningfully** — include request ID, user ID, and context so you can trace issues in production
7. **Return consistent error format** — every error response has the same shape so clients can handle them uniformly -->

---

### Q44. Explain how you would implement pagination for a large dataset.

<!-- **Two common approaches:**

**1. Offset-based pagination (simpler, most common):**
```ts
* GET /api/users?page=2&limit=20
app.get('/api/users', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);  // cap at 100
  const offset = (page - 1) * limit;

  const [users, countResult] = await Promise.all([‼️
    db.query('SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
    db.query('SELECT COUNT(*) FROM users'),
  ]);

  const total = parseInt(countResult.rows[0].count);‼️

  res.json({
    data: users.rows,‼️
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  });
});
```

**Problem with offset:** ‼️ OFFSET scans and discards rows. OFFSET 10000 means the DB reads 10,000 rows and throws them away. Gets slower as pages increase.

**2. Cursor-based pagination (better for large datasets):**
```ts
* GET /api/users?cursor=2024-01-15T10:30:00Z&limit=20
app.get('/api/users', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const cursor = req.query.cursor as string;

  let query = 'SELECT * FROM users';
  const params: any[] = [limit + 1];  // fetch one extra to know if there's a next page
  * [limit + 1] is ARRAY SYNTAX — creates an array with one element inside it.‼️
  * If limit = 20, this is: const params = [21];
  *
  * This array is the list of SQL parameter values that get plugged into the query.
  * Later when params.push(cursor) is called:
  *   params becomes [21, '2024-01-15T10:30:00Z']
  *
  * Then in the query:
  *   'SELECT * FROM users WHERE created_at < $2 ORDER BY created_at DESC LIMIT $1'
  *   $1 → params[0] → 21                    (how many rows to fetch)
  *   $2 → params[1] → '2024-01-15T10:30:00Z' (the cursor value)
  *
  * $1, $2 are PLACEHOLDERS — replaced by values in the params array (by position).‼️
  * This is called ‼️ PARAMETERIZED QUERIES, which prevents SQL injection.‼️

  if (cursor) {
    query += ' WHERE created_at < $2';
    params.push(cursor);
  }

  query += ' ORDER BY created_at DESC LIMIT $1';

  const result = await db.query(query, params);
  const hasMore = result.rows.length > limit;
  const users = hasMore ? result.rows.slice(0, limit) : result.rows;

  res.json({
    data: users,
    meta: {
      nextCursor: hasMore ? users[users.length - 1].created_at : null,
      hasMore,
    }
  });
});
```

**When to use which:**
- **Offset**: simple UIs with page numbers (page 1, 2, 3...). Fine for small-to-medium datasets.
- **Cursor**: infinite scroll, real-time feeds, large datasets (100k+ rows). More performant but can't jump to page 47.

**Performance tips:**
- Always have an index on the ORDER BY column
- Use `LIMIT + 1` trick to check if there's a next page without a separate COUNT query‼️
- COUNT(*) on large tables is slow in PostgreSQL — consider approximate counts or caching the total -->‼️

---

### Q45. What are some common security vulnerabilities in web applications, and how do you prevent them?

<!-- **OWASP Top vulnerabilities relevant to a Node.js + PostgreSQL stack:**

**1. SQL Injection:**
```ts
* BAD — string concatenation:
db.query(`SELECT * FROM users WHERE email = '${email}'`);  * attacker: ' OR 1=1 --

* GOOD — parameterized queries:
db.query('SELECT * FROM users WHERE email = $1', [email]);
```
Always use parameterized queries. ORMs (Prisma, TypeORM) do this automatically.‼️

**2. Cross-Site Scripting (XSS):**
```jsx
* BAD — rendering raw HTML:
<div dangerouslySetInnerHTML={{ __html: userInput }} />

* GOOD — React auto-escapes by default:‼️
<div>{userInput}</div>
```
‼️ React escapes output by default. Never use dangerouslySetInnerHTML with user input. Sanitize with DOMPurify if you must render HTML.

**3. Cross-Site Request Forgery (CSRF):**‼️
- Use anti-CSRF tokens for cookie-based auth
- JWT in Authorization header is inherently CSRF-safe (cookies are the vulnerability)
- SameSite cookie attribute helps

**4. Broken Authentication:**
- Hash passwords with bcrypt (cost factor 10+)
- Use constant-time comparison for tokens
- Implement rate limiting on login endpoints
- JWT: use short expiry + refresh tokens, never store in localStorage (XSS vulnerable), use httpOnly cookies‼️

**5. Sensitive Data Exposure:**
- Never log passwords, tokens, or PII
- Use HTTPS everywhere
- Don't return sensitive fields in API responses (filter at the query or serialization layer)
- Store secrets in env vars / secrets manager, never in code

**Security middleware for Express:**
```ts
import helmet from 'helmet';       // sets security headers
import cors from 'cors';           // configure allowed origins
import rateLimit from 'express-rate-limit';

app.use(helmet());
app.use(cors({ origin: 'https://app.steno.com' }));
app.use('/api/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));‼️
``` -->

---

### Q46. What is your approach to mentoring junior engineers?

<!-- This matters for a senior role — the JD mentions "mentor less experienced engineers."

**Framework for answering:**

1. **Code reviews as teaching moments** — don't just say "change this"; explain WHY and link to resources. Turn a review into a mini-lesson.

2. **Pair programming** — sit with them on complex problems. Let them drive while you guide. They learn decision-making, not just solutions.

3. **Progressive responsibility** — start with small, well-defined tasks with good test coverage (safe to fail). Gradually increase scope and ambiguity.

4. **Design discussions** — involve them in architecture conversations. Ask them to propose solutions before you share yours. Even if their approach isn't optimal, discussing tradeoffs builds judgment.

5. **Documentation culture** — encourage them to write down what they learn (ADRs, wiki, PR descriptions). Teaching others is how you solidify understanding.

6. **Psychological safety** — make it clear that asking questions is expected and valued. Share your own past mistakes. Normalize not knowing things.

**Example answer:**
"When I onboard a junior engineer, I start by pairing with them on a small feature end-to-end — from database migration to API endpoint to frontend component. This gives them a mental model of the whole stack. For code reviews, I try to explain the reasoning, not just the fix — if I suggest adding an index, I'll explain query plans and show them EXPLAIN ANALYZE. I also set up regular 1:1s to check in on blockers and learning goals, separate from standup. The goal is to make them independently productive within a few months, not dependent on me." -->

---

### Q47. How would you approach a take-home assignment for a full-stack Node.js + React app?

<!-- **What they're evaluating in a take-home:**

1. **Code quality** — clean, readable, well-organized code. Not over-engineered, not hacked together.
2. **Architecture decisions** — sensible project structure, separation of concerns
3. **TypeScript usage** — proper typing, no excessive `any`, good use of interfaces
4. **Error handling** — graceful failure, not just happy path
5. **Testing** — at least some tests that demonstrate you know how to test
6. **Documentation** — README with setup instructions, design decisions

**Checklist before submitting:**

```markdown
## Code
- [ ] TypeScript strict mode, no `any` types
- [ ] Consistent code style (run ESLint + Prettier)
- [ ] Meaningful variable/function names
- [ ] No commented-out code or console.logs

## Backend
- [ ] Parameterized SQL queries (no SQL injection)
- [ ] Input validation (zod or joi)
- [ ] Proper error handling with meaningful error responses
- [ ] Database migrations (not raw CREATE TABLE in code)
- [ ] Environment variables for config (not hardcoded)

## Frontend
- [ ] Components are focused and reusable
- [ ] Loading and error states handled
- [ ] TypeScript props interfaces defined
- [ ] No unnecessary re-renders

## Testing
- [ ] At least unit tests for business logic
- [ ] At least one integration test for a key API endpoint
- [ ] Tests actually test behavior, not implementation‼️

## Documentation
- [ ] README with: setup instructions, design decisions, tradeoffs, what you'd improve with more time
- [ ] Clear git history (meaningful commits, not one giant commit)
```

**The "what I'd improve" section is crucial** — it shows you know what corners you cut and what production-quality code looks like. Interviewers read this carefully. -->

---

### Q48. Describe how you would handle database performance issues.

<!-- **Systematic approach to diagnosing and fixing slow queries:**

**Step 1: Identify the slow query**
```sql
-- PostgreSQL: find slow queries‼️
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Or enable slow query logging:‼️
-- SET log_min_duration_statement = 500;  -- log queries taking > 500ms
```

**Step 2: Analyze with EXPLAIN**
```sql
EXPLAIN ANALYZE SELECT u.name, COUNT(o.id)
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.status = 'active'
GROUP BY u.name;

-- Look for:
-- Seq Scan (full table scan — may need an index)
-- Nested Loop with high row counts (may need a different join strategy)
-- Sort with high cost (may need an index for ORDER BY)
```

**Step 3: Common fixes**

1. **Add missing indexes:**
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_users_status ON users(status);
-- Composite index for multi-column WHERE:
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

2. **Fix N+1 queries:**
```ts
* BAD — N+1 (1 query for users + N queries for orders):
const users = await db.query('SELECT * FROM users');
for (const user of users.rows) {
  user.orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [user.id]);
}

* GOOD — single query with JOIN:
const result = await db.query(`
  SELECT u.*, json_agg(o.*) as orders
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id
`);
```

3. **Optimize query structure:**
   - Use `SELECT` only the columns you need (not `SELECT *`)
   - Use `EXISTS` instead of `COUNT(*) > 0`‼️
   - Use `LIMIT` for pagination (never fetch all rows)
   - Consider materialized views for expensive aggregations

4. **Connection and configuration:**‼️
   - Tune connection pool size (`max` in pg Pool)‼️
   - Increase `shared_buffers` and `work_mem` in postgresql.conf‼️
   - Use connection pooler like PgBouncer for high-concurrency apps‼️

5. **Caching layer:**
   - Cache frequently-read, rarely-changed data in Redis
   - Cache computed results (dashboards, reports) with TTL -->

---

## Quick Reference — One-Line Answers

| #   | Question                    | One-Liner                                                                                                     |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Git fast-forward merge      | Moves the branch pointer forward when there are no divergent commits — no merge commit created                |
| 2   | Merge vs rebase             | Merge creates a merge commit preserving history; rebase replays commits for a linear history                  |
| 3   | Spread operator             | `...` expands iterables into individual elements for copying, merging, and argument passing                   |
| 4   | Interface (TS)              | A compile-time contract that defines the shape of an object — properties, methods, and their types            |
| 5   | async/await benefits        | Reads like sync code, standard try/catch, better stack traces, works with loops and conditionals              |
| 6   | Unhandled promise rejection | A rejected Promise with no .catch() or try/catch — crashes Node.js v15+                                       |
| 7   | Closure                     | A function that retains access to its outer scope's variables even after the outer function returns           |
| 8   | Callback                    | A function passed as an argument to another function, called when an operation completes                      |
| 9   | Middleware (Node.js)        | A function in the request pipeline with access to req, res, and next()                                        |
| 10  | Dependency injection        | Passing dependencies in from outside instead of creating them internally — enables testing and loose coupling |
| 11  | HTTP status codes           | 2xx success, 3xx redirect, 4xx client error, 5xx server error                                                 |
| 12  | HTTP stateful/stateless     | Stateless — each request is independent; state is added via cookies/tokens                                    |
| 13  | SQL declarative/imperative  | Declarative — you say WHAT you want, the optimizer decides HOW                                                |
| 14  | CTE                         | Common Table Expression — a named temporary result set using the `WITH` keyword                               |
| 15  | Table vs view               | Table stores data on disk; a view is a saved query that runs against tables on access                         |
| 16  | Recursive query             | A CTE that references itself to traverse hierarchical data (WITH RECURSIVE)                                   |
| 17  | SQL index                   | A B-tree data structure that speeds up reads at the cost of slower writes and extra storage                   |
| 18  | Monolith vs microservice    | Monolith: one deployable unit, simple; Microservices: independent services, scalable but complex              |
| 19  | Message queue problems      | Ordering, duplicates, message loss, poison pills, eventual consistency, consumer lag                          |
| 20  | Caching                     | Store frequently accessed data in faster storage (Redis); invalidate via TTL or events                        |
| 21  | Event loop                  | Single-threaded loop that processes async callbacks from queues, enabling non-blocking I/O                    |
| 22  | Index data structure        | B+ tree — O(log n) lookups, disk-optimized, supports range queries and sorting                                |
| 23  | Promise vs callback         | Callbacks nest and have no guarantees; Promises chain, settle once, and have single .catch() error handling   |
| 24  | Unit vs integration testing | Unit: isolated single function with mocks; Integration: multiple components with real DB and APIs             |
| 25  | N-tier architecture         | Layered architecture (presentation → application → data) with separation of concerns per tier                 |
| 26  | CI/CD                       | Automate build/test on every push (CI) and deploy to production automatically or on approval (CD)             |
| 27  | TypeScript generics         | Type parameters (`<T>`) that let you write reusable, type-safe functions without `any`                        |
| 28  | React virtual DOM           | Lightweight JS copy of real DOM; React diffs old vs new and applies minimal real DOM updates                  |
| 29  | React hooks                 | Functions (useState, useEffect, etc.) that add state and lifecycle to function components                     |
| 30  | Transactions & ACID         | Group of SQL ops that all succeed or all rollback; Atomic, Consistent, Isolated, Durable                      |
| 31  | SQL JOINs                   | INNER: both match; LEFT: all left + matched right; RIGHT: all right; FULL: everything; CROSS: cartesian       |
| 32  | RESTful API design          | Resources as URLs, HTTP methods as CRUD, stateless, consistent error format, pagination                       |
| 33  | Cloud infrastructure        | Managed compute (EC2/ECS), storage (S3), DB (RDS), networking (VPC/ALB) from AWS/GCP/Azure                    |
| 34  | Connection pooling          | Reuse DB connections instead of open/close per query — saves overhead, manages limited connections            |
| 35  | Docker                      | Packages app + dependencies into containers that run identically everywhere (dev, CI, prod)                   |
| 36  | Environment variables       | External key-value config (secrets, DB URLs) — never hardcode; validate with zod; use secrets manager in prod |
| 37  | Auth vs authorization       | Authentication = WHO are you (401 if fail); Authorization = WHAT can you do (403 if fail)                     |
| 38  | DB schema design            | Design entities, relationships, indexes; discuss UUIDs, soft deletes, audit trails for legal data             |
| 39  | Production debugging        | Detect → triage → investigate (logs, metrics) → root cause → fix → prevent recurrence                         |
| 40  | Code review approach        | Check correctness, readability, architecture, performance, security, tests; lead with questions not commands  |
| 41  | Project structure           | Route → Controller → Service → Repository layers; separation of concerns for testability                      |
| 42  | Database migrations         | Version-controlled schema changes (up/down); never edit applied migrations; backward-compatible               |
| 43  | Error handling (Node.js)    | Custom error classes + async wrapper + centralized error middleware; consistent error response format         |
| 44  | Pagination                  | Offset-based (simple, page numbers) vs cursor-based (performant, infinite scroll); index the ORDER BY column  |
| 45  | Security vulnerabilities    | SQL injection (parameterize), XSS (React escapes), CSRF (tokens), bcrypt passwords, helmet + CORS             |
| 46  | Mentoring engineers         | Code reviews as teaching, pair programming, progressive responsibility, design discussions                    |
| 47  | Take-home approach          | Clean TS, proper error handling, tests, migrations, README with design decisions and tradeoffs                |
| 48  | DB performance              | EXPLAIN ANALYZE, add indexes, fix N+1 queries, optimize SELECT, cache with Redis, tune connection pool        |
