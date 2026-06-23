# Smart State Inc. — Senior Backend Developer Interview Prep

> Position: Senior Backend Developer | Location: Fort Lee, NJ (100% On-site) | Salary: $180K–$200K + performance bonuses

---

## 1. Company Overview

**Smart State Inc.** is a rapidly growing technology company in the **iGaming industry**. They blend software engineering, analytics, and product thinking to deliver reliable, innovative digital solutions. The backend team is part of their **Product & R&D** division.

- **Industry:** iGaming (online gaming/gambling technology)
- **Location:** Fort Lee, New Jersey
- **Team culture:** Collaborative, international team with emphasis on technical ownership
- **Benefits:** Medical/dental/vision, 401(k), generous PTO, subsidized office meals, professional development, team celebrations

### What to research before interview:
- iGaming industry regulations and compliance requirements
- Real-time data processing needs in gaming platforms (betting odds, live scores, user sessions)
- High-concurrency challenges unique to iGaming (burst traffic during live events)

---

## 2. Tech Stack They Use

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js |
| **Framework** | Nest.js (strongly preferred) |
| **Databases** | MongoDB, MySQL |
| **Cache/Broker** | Redis (caching + Pub/Sub) |
| **Message Queues** | RabbitMQ, NATS (nice-to-have) |
| **APIs** | REST, GraphQL, WebSocket |
| **Testing** | TDD approach, automated testing |
| **DevOps** | CI/CD, containerization, Kubernetes (nice-to-have) |
| **VCS** | Git with collaborative workflows |

---

## 3. Your Interview Progress & What's Next

### Where you are now:
| Round | Status | Details |
|-------|--------|---------|
| **1. HackerRank Assessment** | PASSED | Online coding assessment |
| **2. HR Screen (Ron)** | PASSED | Recruiter call |
| **3. Technical Live Coding** | **UP NEXT** | 1.5 hours, HackerRank CodePair style, with an engineer |
| **4. Final Round (TBD)** | Pending | Likely on-site / team fit |

---

## 4. HackerRank CodePair Live Coding — What to Expect (CRITICAL)

### Platform & Environment
- **HackerRank CodePair** is a live collaborative coding environment — you and the interviewer see the same code editor in real time
- You get a **full IDE** with terminal access, file navigation, and code execution
- Supports **58+ languages** — pick Node.js/JavaScript/TypeScript
- You can **run test cases** and see output in real time
- The interviewer can see your screen, your typing, and tab switches — **do NOT switch tabs or use external tools**
- Communication via **audio/video chat** built into the platform

### Format for 1.5 Hours (90 min)
Based on research, a 90-minute HackerRank-style session for a senior backend role typically breaks down as:

| Time | What Happens |
|------|-------------|
| **0–5 min** | Introductions, interviewer explains the format |
| **5–45 min** | **Problem 1:** Usually an algorithm/data structure problem OR a practical API-building task |
| **45–85 min** | **Problem 2:** Often a real-world backend problem (REST API, async data processing, or system design lite) |
| **85–90 min** | Your questions for the interviewer |

### What Types of Problems to Expect

Since they said "HackerRank style" and this is a **senior backend** role, expect a MIX of:

#### Type A: Algorithm / Data Structure Problems (LeetCode-style)
These test your raw problem-solving ability. Common patterns:
- **Hash Maps** — frequency counting, two-sum variants, grouping
- **Arrays/Strings** — sliding window, two pointers, substring problems
- **Sorting** — custom sort, merge intervals
- **Trees/Graphs** — BFS/DFS, shortest path (less common for backend roles)
- **Dynamic Programming** — 1D/2D DP, memoization (medium difficulty, not hard)

**Difficulty level:** Likely LeetCode Medium. Unlikely to get Hard for a backend role.

#### Type B: Practical Backend / API Problems (More Likely Given the Role)
These test real-world backend skills:
- **Build a REST API** — CRUD operations with proper status codes, error handling
- **Implement pagination** — offset/limit query parameters on a list endpoint
- **Add authentication** — basic auth or JWT token validation on endpoints
- **Rate limiting** — track requests per IP, return 429 when exceeded
- **API versioning** — support v1 and v2 endpoints with different response shapes
- **Async data fetching** — fetch data from an external API, process and return results
- **Data transformation** — given raw API response, transform into a specific shape

#### Type C: Node.js Specific Problems
- **Event-driven patterns** — implement an event emitter, handle async flows
- **Stream processing** — read/transform/write data using Node streams
- **Concurrency** — handle multiple async operations with Promise.all, race conditions
- **Error handling** — proper try/catch with async/await, custom error classes

### Real HackerRank Problems People Have Reported

Based on research across Glassdoor and developer forums:

1. **Football API problem** — Query a REST API to count matches where both teams scored equal goals in a given year. Tests: async/await, API pagination, optimization (minimizing HTTP requests using Promise.all)

2. **Tournament winner goals** — Multi-step API calls: find tournament winner, then sum their goals from home + away matches. Tests: chaining async calls, data aggregation

3. **To-Do List API** — Build full CRUD REST API. Tests: route handling, JSON parsing, proper HTTP status codes, input validation

4. **Pagination implementation** — Extend an API to support offset/limit query params. Tests: array slicing, query parameter parsing, edge cases

5. **Longest substring without repeating characters** — Classic sliding window problem. Tests: string manipulation, hash set usage, algorithm efficiency

6. **Implement a linked list** — With insert, delete, search operations. Tests: data structure fundamentals

### How to Approach Each Problem (Talk Out Loud!)

The interviewer is evaluating **how you think**, not just the final answer:

```
Step 1: CLARIFY (2-3 min)
  - "Can I clarify the input format?"
  - "What should happen if the input is empty/null?"
  - "Are there any constraints on time/space complexity?"
  - "Can I use TypeScript or do you prefer JavaScript?"

Step 2: PLAN (3-5 min)
  - Talk through your approach BEFORE writing code
  - "I'm thinking of using a hash map because..."
  - "I'll structure this as three endpoints: GET, POST, DELETE..."
  - Mention edge cases you'll handle

Step 3: CODE (15-25 min per problem)
  - Write clean, readable code — variable names matter
  - Use TypeScript if allowed (shows your strength)
  - Add brief comments for complex logic
  - Handle errors properly (try/catch, status codes)

Step 4: TEST (3-5 min)
  - Run the test cases
  - Walk through a simple example manually
  - Check edge cases: empty input, large input, invalid input

Step 5: OPTIMIZE (if time permits)
  - Discuss time/space complexity
  - "This is O(n) time, O(n) space. We could optimize..."
```

### Critical Tips for the Live Coding

1. **Think out loud the ENTIRE time** — silence is the worst thing. Even "hmm, let me think about this for a second" is better than silence
2. **Ask clarifying questions** — it shows seniority and thoroughness
3. **Start with brute force, then optimize** — a working solution beats an incomplete optimal one
4. **Use proper HTTP status codes** if building APIs — 200, 201, 400, 404, 429, 500
5. **Handle errors** — try/catch with async/await, validate inputs
6. **Know your Node.js built-ins** — `Array.map/filter/reduce`, `Promise.all`, `Object.entries`, `URL` and `URLSearchParams`
7. **Don't over-engineer** — no need for full NestJS architecture in a 30-min problem. Plain Express or even raw Node.js is fine
8. **If you're stuck** — say "I'm not sure about this part, but my intuition is..." — the interviewer may give hints

---

## 5. Practice Problems to Do Before the Interview

### Must-Do Algorithm Problems (LeetCode)
| # | Problem | Pattern | Difficulty |
|---|---------|---------|------------|
| 1 | Two Sum | Hash Map | Easy |
| 3 | Longest Substring Without Repeating Characters | Sliding Window | Medium |
| 15 | 3Sum | Two Pointers | Medium |
| 49 | Group Anagrams | Hash Map | Medium |
| 56 | Merge Intervals | Sorting | Medium |
| 73 | Set Matrix Zeroes | Array | Medium |
| 200 | Number of Islands | BFS/DFS | Medium |
| 238 | Product of Array Except Self | Array | Medium |
| 347 | Top K Frequent Elements | Hash Map + Heap | Medium |
| 394 | Decode String | Stack | Medium |

### Must-Do Backend / API Problems
Practice these in a local Node.js environment:

**Problem 1: Build a REST API for a bookstore**
```
- GET /books — return all books (support ?page=1&limit=10)
- GET /books/:id — return one book (404 if not found)
- POST /books — create a book (validate title and author fields, return 400 if missing)
- PUT /books/:id — update a book
- DELETE /books/:id — remove a book
- Use in-memory array (no database needed)
- Return proper status codes: 200, 201, 400, 404
```

**Problem 2: Rate limiter middleware**
```
- Track requests per IP address
- Allow max 10 requests per minute
- Return 429 Too Many Requests when exceeded
- Include Retry-After header
```

**Problem 3: Async API aggregation**
```
- Given an external API endpoint, fetch paginated data
- Aggregate results across all pages
- Return computed statistics (count, sum, average)
- Use Promise.all for parallel fetching
- Handle API errors gracefully
```

**Problem 4: Event-based notification system**
```
- Implement EventEmitter pattern
- Subscribe/unsubscribe to events
- Emit events with payloads
- Support wildcard listeners
```

---

## 6. NestJS Interview Questions (High Priority)

### Architecture & Core Concepts

**Q: How does dependency injection work in NestJS?**
> NestJS uses an IoC (Inversion of Control) container. You mark classes with `@Injectable()` and register them as providers in a module. The framework resolves the dependency graph at startup and injects instances via constructor injection. Custom providers use `useFactory`, `useClass`, or `useValue` strategies.
>
> ```typescript
> // Custom provider with factory
> {
>   provide: 'CONFIG_SERVICE',
>   useFactory: async (httpService: HttpService) => {
>     const config = await httpService.get('/config').toPromise();
>     return new ConfigService(config);
>   },
>   inject: [HttpService],
> }
> ```

**Q: Explain the NestJS request lifecycle / execution order.**
> 1. **Middleware** — runs first, similar to Express middleware (logging, CORS, compression)
> 2. **Guards** — authorization checks (`CanActivate` interface), can access metadata via `Reflector`
> 3. **Interceptors (before)** — pre-handler logic (logging start, cache check)
> 4. **Pipes** — input validation and transformation (`ValidationPipe`, custom pipes)
> 5. **Route Handler** — your controller method
> 6. **Interceptors (after)** — post-handler logic (response transformation, logging end)
> 7. **Exception Filters** — catch and format errors
>
> This is a critical question — know this order cold.

**Q: What are Dynamic Modules and when would you use them?**
> Dynamic modules allow runtime configuration via static methods like `register()` or `forRoot()`. They return a `DynamicModule` object with configured providers and exports. Use cases:
> - Configuring database connections per environment
> - Multi-tenant architecture (different config per tenant)
> - External service SDKs that need API keys
>
> ```typescript
> @Module({})
> export class DatabaseModule {
>   static forRoot(options: DatabaseOptions): DynamicModule {
>     return {
>       module: DatabaseModule,
>       providers: [
>         { provide: 'DB_OPTIONS', useValue: options },
>         DatabaseService,
>       ],
>       exports: [DatabaseService],
>     };
>   }
> }
> ```

**Q: How do you resolve circular dependencies in NestJS?**
> Use `forwardRef()` to defer module/service resolution:
> ```typescript
> // In module
> @Module({
>   imports: [forwardRef(() => ModuleB)],
> })
> export class ModuleA {}
>
> // In service
> constructor(
>   @Inject(forwardRef(() => ServiceB))
>   private serviceB: ServiceB,
> ) {}
> ```
> Better approach: refactor to eliminate the circular dependency by extracting shared logic into a third module.

**Q: Guards vs Middleware vs Interceptors — when do you use each?**
> - **Middleware:** Request preprocessing before routing — logging, body parsing, rate limiting. No access to handler metadata.
> - **Guards:** Authorization/authentication decisions. Has access to `ExecutionContext` and route metadata via `Reflector`. Returns boolean or throws.
> - **Interceptors:** Cross-cutting concerns that wrap handler execution — response transformation, caching, timing, error mapping. Uses RxJS observables.

**Q: How would you implement role-based access control (RBAC)?**
> ```typescript
> // Custom decorator
> export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
>
> // Guard
> @Injectable()
> export class RolesGuard implements CanActivate {
>   constructor(private reflector: Reflector) {}
>
>   canActivate(context: ExecutionContext): boolean {
>     const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
>       context.getHandler(),
>       context.getClass(),
>     ]);
>     if (!requiredRoles) return true;
>     const { user } = context.switchToHttp().getRequest();
>     return requiredRoles.some((role) => user.roles?.includes(role));
>   }
> }
>
> // Usage
> @Roles('admin')
> @UseGuards(AuthGuard, RolesGuard)
> @Get('admin/dashboard')
> getAdminDashboard() { ... }
> ```

### Microservices with NestJS

**Q: How does NestJS support microservices?**
> NestJS provides a `@nestjs/microservices` package with transport layers: TCP, Redis, NATS, RabbitMQ, Kafka, gRPC. You create a microservice app using `NestFactory.createMicroservice()` and use message patterns (`@MessagePattern`) or event patterns (`@EventPattern`) for communication.
>
> ```typescript
> // main.ts for a microservice
> const app = await NestFactory.createMicroservice<MicroserviceOptions>(
>   AppModule,
>   {
>     transport: Transport.RMQ,
>     options: {
>       urls: ['amqp://localhost:5672'],
>       queue: 'orders_queue',
>       queueOptions: { durable: true },
>     },
>   },
> );
> ```

**Q: How do you handle distributed transactions across microservices?**
> Use the **Saga pattern** or **Outbox pattern**:
> - **Saga:** Orchestrate a sequence of local transactions across services. If one fails, execute compensating transactions to roll back previous steps.
> - **Outbox:** Write events to a local outbox table within the same transaction as the data change, then publish events asynchronously. Ensures at-least-once delivery.
>
> NestJS supports CQRS with `@nestjs/cqrs` — separate read and write models for complex domains.

**Q: How do you scale WebSocket connections in distributed NestJS apps?**
> Use **Redis Pub/Sub** as a transport layer across instances. When one server receives a WebSocket message, it publishes to Redis, and all other instances subscribe and broadcast to their connected clients. This ensures messages reach all users regardless of which instance they're connected to.

---

## 7. Node.js Deep Questions (High Priority)

**Q: Explain the Event Loop in Node.js and its phases.**
> The event loop has 6 phases:
> 1. **Timers** — executes `setTimeout`/`setInterval` callbacks
> 2. **Pending callbacks** — I/O callbacks deferred to next iteration
> 3. **Idle/Prepare** — internal use only
> 4. **Poll** — retrieves new I/O events, executes I/O callbacks
> 5. **Check** — `setImmediate()` callbacks
> 6. **Close callbacks** — `socket.on('close')` etc.
>
> `process.nextTick()` runs between phases (microtask queue). Promises also go to microtask queue.

**Q: How do you handle memory leaks in Node.js?**
> - Use `--inspect` flag and Chrome DevTools for heap snapshots
> - Monitor with `process.memoryUsage()` — watch `heapUsed` growth over time
> - Common causes: global variables, unclosed event listeners, closures retaining references, unbounded caches
> - Use WeakMap/WeakSet for caches that should be GC'd
> - Set max listeners with `emitter.setMaxListeners()` to detect leaks early

**Q: Streams in Node.js — when and why?**
> Streams process data in chunks instead of loading everything into memory. Essential for:
> - Large file processing (CSV imports, log parsing)
> - HTTP request/response bodies
> - Database result streaming
> - Real-time data pipelines
>
> Four types: Readable, Writable, Duplex, Transform. Use `pipeline()` from `stream/promises` for proper error handling and backpressure.

**Q: Worker Threads vs Child Processes vs Cluster?**
> - **Worker Threads:** Share memory (via SharedArrayBuffer), good for CPU-intensive tasks within one process. Lower overhead than child processes.
> - **Child Processes:** Separate processes, communicate via IPC. Use for running external commands or isolating untrusted code.
> - **Cluster:** Forks the main process to utilize multiple CPU cores. Each worker handles incoming connections. Use for horizontal scaling of HTTP servers.

---

## 8. Database Questions (MongoDB + MySQL + Redis)

**Q: When would you use MongoDB vs MySQL?**
> - **MongoDB:** Flexible schema, document model, good for rapidly changing data structures, nested/hierarchical data, high write throughput. Common in iGaming for user activity logs, game state, session data.
> - **MySQL:** ACID transactions, relational data with complex joins, strict data integrity requirements. Common in iGaming for financial transactions, user accounts, regulatory reporting.
> - **Hybrid approach:** Use MySQL for transactional data (deposits, withdrawals, bets) and MongoDB for analytics, game history, and user behavior tracking.

**Q: How do you use Redis beyond simple caching?**
> - **Pub/Sub:** Real-time messaging between microservices (live game updates, odds changes)
> - **Sorted Sets:** Leaderboards, ranking systems
> - **Rate Limiting:** Token bucket or sliding window using `INCR` + `EXPIRE`
> - **Session Store:** Centralized session management across instances
> - **Distributed Locks:** Using `SET key value NX EX` (or Redlock for multi-node)
> - **Streams:** Event sourcing, message queue alternative

**Q: How do you handle database migrations in production?**
> - Use migration tools (TypeORM migrations, Knex migrations, mongoose-migrate)
> - Always make migrations backward-compatible (additive changes first, remove old columns later)
> - Blue-green deployments: run migrations before switching traffic
> - Never run destructive migrations during peak hours
> - Test migrations against production-sized datasets in staging

---

## 9. Message Queues / RabbitMQ Questions

**Q: Why use a message queue instead of direct HTTP calls between services?**
> - **Decoupling:** Services don't need to know about each other
> - **Resilience:** Messages persist if a consumer is down — processing resumes when it recovers
> - **Load leveling:** Buffer traffic spikes instead of overwhelming downstream services
> - **Guaranteed delivery:** At-least-once or exactly-once semantics
> - In iGaming: bet placement -> payment processing -> notification can all be async via queues

**Q: RabbitMQ exchange types and when to use each?**
> - **Direct:** Routes to queues matching exact routing key. Use for specific task routing.
> - **Fanout:** Broadcasts to all bound queues. Use for notifications (all services need to know about an event).
> - **Topic:** Pattern-based routing (`bet.placed.*`, `user.#`). Use for event-driven architectures with multiple consumers interested in different event subsets.
> - **Headers:** Routes based on message headers. Rarely used.

**Q: How do you handle failed messages in RabbitMQ?**
> - **Dead Letter Exchanges (DLX):** Route failed/rejected messages to a DLX for inspection and retry
> - **Retry with backoff:** Re-queue with increasing delays (use message headers to track retry count)
> - **Poison message handling:** After N retries, move to a dead letter queue for manual inspection
> - **Idempotency:** Design consumers to handle duplicate messages safely (idempotency keys)

---

## 10. System Design Questions (iGaming Context)

**Q: Design a real-time betting/odds system.**
> Key components:
> - **WebSocket Gateway** — pushes live odds updates to clients
> - **Odds Engine Service** — calculates odds based on external feeds and internal models
> - **Redis Pub/Sub** — distributes odds changes across all WebSocket server instances
> - **Rate limiting** — prevent abuse on bet placement endpoints
> - **Event sourcing** — every odds change is an immutable event for audit trail
> - **CQRS** — separate read model (fast odds queries) from write model (bet placement)
>
> Scale considerations: Spike traffic during popular live events (Super Bowl, World Cup). Use auto-scaling groups, pre-warm instances before known events, Redis cluster for cache layer.

**Q: Design a notification system for a gaming platform.**
> - **Event-driven architecture:** Game events -> RabbitMQ -> Notification Service
> - **Multi-channel:** Push notifications, email, SMS, in-app
> - **User preferences:** Per-user channel preferences stored in MongoDB
> - **Template engine:** Handlebars/Mustache for dynamic notification content
> - **Deduplication:** Idempotency keys prevent sending the same notification twice
> - **Priority queues:** Urgent notifications (withdrawal confirmed) vs marketing (new game available)

**Q: How would you ensure data consistency for financial transactions in a distributed system?**
> - Use MySQL with ACID transactions for the source of truth on balances
> - Implement optimistic locking with version numbers to prevent double-spending
> - Use the Saga pattern for multi-step operations (bet -> deduct balance -> confirm bet)
> - Event sourcing for complete audit trail (regulatory requirement in iGaming)
> - Reconciliation jobs to detect and alert on inconsistencies
> - Idempotency tokens on all mutation endpoints

---

## 11. API Design & GraphQL Questions

**Q: REST vs GraphQL — when to use which?**
> - **REST:** Simple CRUD operations, public APIs, caching with HTTP standards, when clients have predictable data needs
> - **GraphQL:** Complex data relationships, mobile clients needing to minimize requests, when different clients need different data shapes
> - In iGaming: REST for admin APIs and simple operations, GraphQL for player-facing dashboards that need flexible data fetching (game history + stats + balance in one query)

**Q: How do you handle N+1 problems in GraphQL?**
> Use **DataLoader** — batches and caches database requests within a single request lifecycle. Instead of N individual queries for related data, DataLoader collects all IDs and makes one batched query.

---

## 12. Testing Questions (TDD Focus)

**Q: How do you approach TDD in NestJS?**
> - Write test first, watch it fail, implement minimum code to pass, refactor
> - NestJS provides `@nestjs/testing` with `Test.createTestingModule()` for isolated unit tests
> - Override providers with mocks using `.overrideProvider().useValue()`
> - Integration tests: use in-memory databases (mongodb-memory-server, SQLite for MySQL)
> - E2E tests: use `supertest` with the full NestJS app

**Q: What do you test vs what do you skip?**
> - **Always test:** Business logic, edge cases, error paths, authorization rules, data transformations
> - **Integration test:** Database queries, message queue producers/consumers, external API integrations
> - **Skip/minimal:** Framework boilerplate, simple getters/setters, configuration files

---

## 13. DevOps & Production Questions

**Q: How do you implement CI/CD for microservices?**
> - Separate pipelines per service (only build/deploy what changed)
> - Automated test gates: unit -> integration -> E2E
> - Docker multi-stage builds for small production images
> - Health check endpoints for orchestrator readiness/liveness probes
> - Blue-green or canary deployments for zero-downtime releases

**Q: How do you monitor a Node.js microservices system?**
> - **Metrics:** Prometheus + Grafana for request rates, latency percentiles, error rates (RED method)
> - **Logging:** Structured JSON logs with pino, correlation IDs across service hops
> - **Tracing:** OpenTelemetry for distributed tracing across services
> - **Alerting:** SLO-based alerts (e.g., alert when p99 latency exceeds 500ms for 5 minutes)

---

## 14. Behavioral / Culture Fit Questions

Since Smart State emphasizes "technical ownership" and "collaborative, international team":

**Q: Tell me about a time you designed a system from scratch.**
> Use STAR format. Focus on: gathering requirements, making trade-off decisions, documenting for the team, iterating based on feedback.

**Q: How do you handle disagreements about technical decisions?**
> Data-driven approach: propose both options, prototype if needed, measure performance, let results decide. Emphasize team alignment over being right.

**Q: How do you stay current with backend technologies?**
> Mention: reading Node.js release notes, following NestJS updates, contributing to open source, building side projects to test new patterns.

---

## 15. Questions to Ask Them

1. "What does a typical request flow look like from client to backend in your platform?"
2. "How many microservices does the backend currently have, and what transport layer do they use?"
3. "What's your deployment frequency and process?"
4. "What are the biggest backend scaling challenges you're facing right now?"
5. "How do you handle compliance and regulatory requirements for the iGaming space?"
6. "What does the on-call rotation look like for the backend team?"
7. "What does 'high-performance' mean in your context — what are your target RPS and latency?"

---

## 16. Study Priority Checklist (Reprioritized for Live Coding)

### P0 — Do these BEFORE the interview (live coding essentials)
- [ ] **LeetCode Medium practice** — do the 10 problems listed in Section 5 (Two Sum, Sliding Window, etc.)
- [ ] **Build a REST API from scratch** — practice the bookstore API problem in Section 5 (timed, 30 min)
- [ ] **Async/await mastery** — Promise.all, error handling, fetching + aggregating external API data
- [ ] **Array/String methods cold** — map, filter, reduce, find, Object.entries, Set, Map — no looking up docs
- [ ] **Practice on HackerRank** — do 2-3 problems on hackerrank.com to get comfortable with their IDE and test runner

### P1 — Review these (likely discussion topics during coding)
- [ ] **Node.js internals** — event loop phases, streams, memory management
- [ ] **REST API best practices** — status codes (200/201/400/404/429/500), pagination, error response format
- [ ] **NestJS fundamentals** — modules, DI, request lifecycle, guards/pipes/interceptors
- [ ] **MongoDB + MySQL basics** — when to use which, basic queries, indexing

### P2 — Know at a high level (may come up in conversation)
- [ ] **RabbitMQ** — exchange types, DLX, why message queues
- [ ] **Redis** — caching, Pub/Sub, rate limiting, distributed locks
- [ ] **Microservices patterns** — Saga, CQRS, event sourcing
- [ ] **System design** — real-time systems, iGaming context
- [ ] **Docker/K8s basics** — Dockerfile, docker-compose, pod concepts
