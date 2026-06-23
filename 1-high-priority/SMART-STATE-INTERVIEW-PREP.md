# Smart State Inc. — Senior Backend Developer Interview Prep

> Position: Senior Backend Developer | Location: Fort Lee, NJ (100% On-site) | Salary: $180K–$200K + performance bonuses

---

## 1. Company Overview

**Smart State Inc.** is a rapidly growing technology company in the **iGaming industry**. They blend software engineering, analytics, and product thinking to deliver reliable, innovative digital solutions. The backend team is part of their **Product & R&D** division.

- **Industry:** iGaming (online gaming/gambling technology)
- **Location:** Fort Lee, New Jersey
- **Team culture:** Collaborative, international team with emphasis on technical ownership
- **Benefits:** Medical/dental/vision, 401(k), generous PTO, subsidized office meals, professional development, team celebrations

### Smart State ↔ Soft2Bet ↔ BrainRocket Connection

Smart State is very likely a **subsidiary or local entity** of the **Soft2Bet / BrainRocket group**:‼️

- **Soft2Bet** — Founded 2016 by Uri Poliavich. Leading B2B iGaming platform provider (online casino & sportsbook software). Won Platform Provider of the Year 2025. Expanding into the U.S. market via **New Jersey** — same location as Smart State's Fort Lee office.
- **BrainRocket** — Founded 2020 by the same owner (Uri Poliavich). A software development company that operates under the Soft2Bet group, providing software development, game development, online payments, and other services. Was based in Cyprus, recently moved core operations to Spain.
- **Smart State** — The U.S.-facing hiring entity in Fort Lee, NJ. Likely the American arm for Soft2Bet's New Jersey market entry. Same iGaming focus, same tech stack (Node.js, NestJS, MongoDB, Redis, RabbitMQ).
- **Soft2Bet's customer** — Soft2Bet provides turnkey casino/sportsbook platform solutions. Their key product is the **PAM (Player Account Management)** system and **MEGA** gamification engine.
- Both Soft2Bet and Smart State post jobs on **Greenhouse** (job-boards.greenhouse.io) — same ATS platform.

**Why this matters for your interview:** The interviewer likely comes from BrainRocket/Soft2Bet engineering. Their interview process is documented on Glassdoor under BrainRocket. See the next section for exact details.

### BrainRocket / Soft2Bet Interview Data (FROM GLASSDOOR — Multiple Candidates)

#### Candidate 1: Senior Backend Developer (NodeJS) — May 2026

| Round                      | What Happened                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. HR Screen**           | Default screening interview with HR                                                                                                                           |
| **2. HackerRank Test**     | Short test task on HackerRank — technical questions + practical coding task                                                                                   |
| **3. Technical Interview** | With an engineer. Covered: different development approaches, **system design task**, **microservices theory**, **Node.js basics**, **short live coding task** |
| **4. Team Interview**      | With tech lead + HR. Technical experience discussion + soft skills (conflicts, uncomfortable situations)                                                      |

**Technical topics asked:**

- Basics of **distributed systems**
- Handling **race conditions**
- **Event loop** (Node.js internals)
- Comparison of **RabbitMQ vs Kafka**
- "Fairly easy" LeetCode problems

#### Candidate 2: Software Engineer — January 2026 (Portugal)

- Technical interview contained a **small discussion of Node.js internals** (event loop)
- A **"fairly easy" LeetCode problem**
- The interview style was described as direct and to-the-point

#### Candidate 3: Senior Full Stack Developer (Node.js & React) — August 2025

- **2.5-hour home assessment** via HackerRank containing:
    - **3 blocks of theory questions** (need to write extended answers, not multiple choice)
    - **2 coding tasks**
- Preceded by: call with recruiter → call with HR → then the 2.5-hour assessment

#### Candidate 4: Senior Frontend Developer (Angular) — Date unknown

- Test of **~35 questions**, very stressful
- **Code snippets where you had to predict the output** (JavaScript output prediction)
- Limited time, most questions about JavaScript fundamentals

#### Candidate 5: Senior Engineer — November 2024

- Process took **4 weeks**
- Multiple rounds including technical assessment
- **Proctored multiple-choice assessment under webcam monitoring**
- Two technical interview rounds
- Behavioral interview with the team lead

#### Candidate 6: Soft2Bet Developer — October 2025

- Process took **4 weeks**
- **System design** part was described as "actually interesting"
- Interviewer did a good job trying to understand the candidate's approach
- Behavioral rounds with HR and hiring managers

### Confirmed Official Interview Steps (from BrainRocket job posting)

BrainRocket's Greenhouse job listing for Senior Node.js Developer explicitly states 5 stages:

1. **Recruiter screening**
2. **Technical assessment** (HackerRank coding challenge)
3. **Technical interview** (expertise & problem-solving)
4. **Final team interview** (culture fit & collaboration)
5. **Offer stage**

### All Technical Topics Reported Across Interviews

Based on ALL candidate reports, here are the topics that have actually been asked:

**Node.js Fundamentals:**

- Event loop phases and how it works
- Node.js internals
- JavaScript "predict the output" questions (closures, hoisting, async order)

**Architecture & System Design:**

- System design task (open-ended, discuss your approach)
- Microservices theory (when to use, trade-offs, communication patterns)
- Different approaches in development (monolith vs microservices, etc.)

**Distributed Systems:**

- Basics of distributed systems
- Handling race conditions
- RabbitMQ vs Kafka comparison

**Coding:**

- "Fairly easy" LeetCode problems (likely Easy-Medium)
- 2 coding tasks in HackerRank assessment
- Short live coding task during technical interview

**Theory Questions (written answers):**

- 3 blocks of theory questions requiring extended written answers
- Not multiple choice — they want you to explain concepts in depth

**Soft Skills (Team Interview):**

- Conflicts at work — how you handled them
- Uncomfortable situations
- Technical experience discussion
- Collaboration style

### Stats from Glassdoor

- Difficulty: **2.75 / 5** (moderate — not FAANG hard)
- Positive experience: **31.6%** (mixed reviews — be prepared for a direct, sometimes blunt style)
- Average hiring timeline: **25 days** across all roles
- Process can be fast: **3 interviews within 2 weeks** for backend roles
- Some candidates report **4 weeks** for the full process
- **Warning:** Some candidates reported interviewers being blunt/adversarial with remarks like "If you don't answer this, we will end the interview." Don't let this rattle you — stay calm and keep explaining your thought process.

### What to research before interview:‼️

- iGaming industry regulations and compliance requirements‼️
- Real-time data processing needs in gaming platforms (betting odds, live scores, user sessions)‼️
- High-concurrency challenges unique to iGaming (burst traffic during live events)‼️
- **Soft2Bet's products** — PAM platform, MEGA gamification engine, multi-market compliance
- **Soft2Bet's scale** — 8,500+ casino games from 120+ providers, 60+ sports, 1.2M pre-match events/month
- **RabbitMQ vs Kafka** — this was specifically asked! (see Section 9)‼️
- **Race conditions** — specifically asked! Know mutex, optimistic locking, distributed locks with Redis‼️
- **JavaScript output prediction** — review closures, hoisting, `this` binding, event loop tick order

---

## 2. Tech Stack They Use

| Category           | Technologies                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **Runtime**        | Node.js                                                                                            |
| **Framework**      | Nest.js (strongly preferred)                                                                       |
| **Databases**      | MongoDB, MySQL                                                                                     |
| **Cache/Broker**   | Redis (caching + Pub/Sub)                                                                          |
| **Message Queues** | RabbitMQ, NATS (nice-to-have — like RabbitMQ but faster and simpler, trades reliability for speed) |
| **APIs**           | REST, GraphQL, WebSocket                                                                           |
| **Testing**        | TDD approach, automated testing                                                                    |
| **DevOps**         | CI/CD, containerization, Kubernetes (nice-to-have)                                                 |
| **VCS**            | Git with collaborative workflows                                                                   |

---

## 3. Your Interview Progress & What's Next

### Where you are now:

| Round                        | Status      | Details                                                |
| ---------------------------- | ----------- | ------------------------------------------------------ |
| **1. HackerRank Assessment** | PASSED      | Online coding assessment                               |
| **2. HR Screen**             | PASSED      | Recruiter call                                         |
| **3. Technical Live Coding** | **UP NEXT** | 1.5 hours, HackerRank CodePair style, with an engineer |
| **4. Final Round (TBD)**     | Pending     | Likely on-site / team fit                              |

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

| Time          | What Happens                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| **0–5 min**   | Introductions, interviewer explains the format                                                             |
| **5–45 min**  | **Problem 1:** Usually an algorithm/data structure problem OR a practical API-building task                |
| **45–85 min** | **Problem 2:** Often a real-world backend problem (REST API, async data processing, or system design lite) |
| **85–90 min** | Your questions for the interviewer                                                                         |

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
- **API versioning** — support v1 and v2 endpoints with different response shapes‼️
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

The interviewer is evaluating **how you think**, not just the final answer:‼️

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
2. **Ask clarifying questions** — it shows seniority and thoroughness‼️
3. **Start with brute force, then optimize** — a working solution beats an incomplete optimal one
4. **Use proper HTTP status codes** if building APIs — 200, 201, 400, 404, 429, 500
5. **Handle errors** — try/catch with async/await, validate inputs
6. **Know your Node.js built-ins** — `Array.map/filter/reduce`, `Promise.all`, `Object.entries`, `URL` and `URLSearchParams`
7. **Don't over-engineer** — no need for full NestJS architecture in a 30-min problem. Plain Express or even raw Node.js is fine
8. **If you're stuck** — say "I'm not sure about this part, but my intuition is..." — the interviewer may give hints‼️

---

## 5. Practice Problems to Do Before the Interview

### Must-Do Algorithm Problems (LeetCode)

| #   | Problem                                        | Pattern         | Difficulty |
| --- | ---------------------------------------------- | --------------- | ---------- |
| 1   | Two Sum                                        | Hash Map        | Easy       |
| 3   | Longest Substring Without Repeating Characters | Sliding Window  | Medium     |
| 15  | 3Sum                                           | Two Pointers    | Medium     |
| 49  | Group Anagrams                                 | Hash Map        | Medium     |
| 56  | Merge Intervals                                | Sorting         | Medium     |
| 73  | Set Matrix Zeroes                              | Array           | Medium     |
| 200 | Number of Islands                              | BFS/DFS         | Medium     |
| 238 | Product of Array Except Self                   | Array           | Medium     |
| 347 | Top K Frequent Elements                        | Hash Map + Heap | Medium     |
| 394 | Decode String                                  | Stack           | Medium     |

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

> NestJS uses an ‼️ IoC (Inversion of Control) container. You mark classes with `@Injectable()` and register them as providers in a module. The framework resolves the dependency graph at startup and injects instances via constructor injection. Custom providers use `useFactory`, `useClass`, or `useValue` strategies.
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
>
> - Configuring database connections per environment
> - Multi-tenant architecture (different config per tenant)
> - External service SDKs that need API keys
>
> ```typescript
> @Module({})
> export class DatabaseModule {
>     static forRoot(options: DatabaseOptions): DynamicModule {
>         return {
>             module: DatabaseModule,
>             providers: [{ provide: 'DB_OPTIONS', useValue: options }, DatabaseService],
>             exports: [DatabaseService],
>         };
>     }
> }
> ```

**Q: How do you resolve circular dependencies in NestJS?**

> Use `forwardRef()` to defer module/service resolution:
>
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
>
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
> const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
>     transport: Transport.RMQ,
>     options: {
>         urls: ['amqp://localhost:5672'],
>         queue: 'orders_queue',
>         queueOptions: { durable: true },
>     },
> });
> ```

**Q: How do you handle distributed transactions across microservices?**

> Use the **Saga pattern** or **Outbox pattern**:
>
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
>
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
>
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

**Q: RabbitMQ vs Kafka — when do you use which? (ASKED IN BRAINROCKET INTERVIEW)**

> This was a specific question in a May 2026 BrainRocket Senior Backend Developer interview.
>
> |                       | RabbitMQ                                         | Kafka                                                                                |
> | --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
> | **Model**             | Message broker (smart broker, dumb consumers)    | Distributed log (dumb broker, smart consumers)                                       |
> | **Message lifecycle** | Messages are deleted after consumer acknowledges | Messages are retained for a configurable period (days/weeks) — consumers can re-read |
> | **Ordering**          | Per-queue ordering                               | Per-partition ordering (stronger guarantees)                                         |
> | **Throughput**        | ~10K–50K msgs/sec                                | ~100K–1M+ msgs/sec                                                                   |
> | **Delivery**          | Push-based — broker pushes to consumers          | Pull-based — consumers pull at their own pace                                        |
> | **Use case**          | Task queues, RPC, complex routing (exchanges)    | Event streaming, event sourcing, real-time analytics, log aggregation                |
> | **Replay**            | No — once consumed, message is gone              | Yes — consumers can replay from any offset                                           |
> | **Complexity**        | Simpler to set up and operate                    | More complex — needs ZooKeeper/KRaft, partition management                           |
>
> **When to use RabbitMQ:**
>
> - Traditional task/work queues (process a bet, send an email, resize an image)
> - Complex routing needs (direct, fanout, topic, headers exchanges)
> - Request-reply (RPC) patterns
> - When you need per-message acknowledgment and redelivery
> - Lower volume, higher reliability per message
>
> **When to use Kafka:**
>
> - High-throughput event streaming (millions of events/sec)
> - Event sourcing — need to replay history (audit trails in iGaming)
> - Real-time analytics pipelines (tracking user behavior, live odds feeds)
> - Multiple consumers need to independently read the same events
> - Log aggregation across microservices
>
> **In iGaming context (what to say in the interview):**
> "For a platform like Soft2Bet's, I'd use RabbitMQ for transactional workflows — bet placement, payment processing, notification delivery — where each message needs reliable processing and acknowledgment. I'd use Kafka for the event streaming side — live odds feeds, user activity tracking, and audit logs — where we need high throughput, event replay for compliance, and multiple consumers reading the same stream independently."

---

## 10. System Design Questions (iGaming Context)

**Q: Design a real-time betting/odds system.**

> Key components:
>
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

---

## 17. Full Solutions for the 6 Reported HackerRank Problems

### Problem 1: Football API — Count Matches with Equal Goals

```typescript
// Given: A REST API at https://jsonmock.hackerrank.com/api/football_matches
// Query params: ?year=2011&team1goals=X&team2goals=X
// Response: { "total": number, ... }
// Task: Count all matches in a given year where team1goals === team2goals
// Constraint: max 10 goals per team, so goals range from 0-10

async function countDrawnMatches(year: number): Promise<number> {
    // Key insight: instead of fetching ALL matches and filtering,
    // we only need to check goals 0-0, 1-1, 2-2, ... 10-10
    // That's only 11 requests instead of potentially hundreds!

    const requests: Promise<number>[] = [];

    for (let goals = 0; goals <= 10; goals++) {
        const url = `https://jsonmock.hackerrank.com/api/football_matches?year=${year}&team1goals=${goals}&team2goals=${goals}`;

        const promise = fetch(url)
            .then(res => res.json())
            .then(data => data.total); // "total" tells us how many matches had this exact score

        requests.push(promise);
    }

    // Promise.all runs all 11 requests in parallel — much faster than sequential
    const results = await Promise.all(requests);

    // Sum up all the totals: draws at 0-0 + draws at 1-1 + ... + draws at 10-10
    return results.reduce((sum, count) => sum + count, 0);
}

// Usage
const totalDraws = await countDrawnMatches(2011);
console.log(`Total drawn matches in 2011: ${totalDraws}`);

// Why this works:
// - The API filters server-side, so ?team1goals=2&team2goals=2 only returns 2-2 draws
// - We exploit the constraint (max 10 goals) to make exactly 11 requests
// - Promise.all parallelizes them so we don't wait sequentially
// - Time complexity: O(1) — always 11 API calls regardless of data size
```

---

### Problem 2: Tournament Winner Goals — Multi-Step API Chaining

```typescript
// Given: A REST API for football competitions
// Step 1: Find the winner of a given competition in a given year
// Step 2: Sum all goals that winner scored (home + away) across all pages
// API endpoints:
//   /api/football_competitions?name=NAME&year=YEAR  → { data: [{ winner: "TeamName" }] }
//   /api/football_matches?year=YEAR&team1=WINNER&page=N → { data: [...], total_pages: N }
//   /api/football_matches?year=YEAR&team2=WINNER&page=N → { data: [...], total_pages: N }

async function fetchAllPages(baseUrl: string): Promise<any[]> {
    // First request to get total_pages
    const firstRes = await fetch(`${baseUrl}&page=1`);
    const firstData = await firstRes.json();
    const totalPages = firstData.total_pages;
    const allData = [...firstData.data];

    if (totalPages <= 1) return allData;

    // Fetch remaining pages in parallel
    const pageRequests: Promise<any[]>[] = [];
    for (let page = 2; page <= totalPages; page++) {
        pageRequests.push(
            fetch(`${baseUrl}&page=${page}`)
                .then(res => res.json())
                .then(data => data.data),
        );
    }

    const remainingPages = await Promise.all(pageRequests);
    remainingPages.forEach(pageData => allData.push(...pageData));

    return allData;
}

async function getTotalGoals(competition: string, year: number): Promise<number> {
    const BASE = 'https://jsonmock.hackerrank.com/api';

    // Step 1: Find the winner
    const compRes = await fetch(`${BASE}/football_competitions?name=${encodeURIComponent(competition)}&year=${year}`);
    const compData = await compRes.json();
    const winner = compData.data[0].winner;
    console.log(`Winner: ${winner}`);

    // Step 2: Get all matches where winner was team1 (home) and team2 (away)
    const [homeMatches, awayMatches] = await Promise.all([fetchAllPages(`${BASE}/football_matches?year=${year}&team1=${encodeURIComponent(winner)}`), fetchAllPages(`${BASE}/football_matches?year=${year}&team2=${encodeURIComponent(winner)}`)]);

    // Step 3: Sum goals
    // When winner is team1, their goals are in "team1goals"
    // When winner is team2, their goals are in "team2goals"
    const homeGoals = homeMatches.reduce((sum, match) => sum + parseInt(match.team1goals), 0);
    const awayGoals = awayMatches.reduce((sum, match) => sum + parseInt(match.team2goals), 0);

    return homeGoals + awayGoals;
}

// Usage
const goals = await getTotalGoals('UEFA Champions League', 2011);
console.log(`Total goals scored by winner: ${goals}`);

// Key patterns demonstrated:
// - Chaining async calls (competition → winner → matches)
// - Handling paginated APIs (fetch page 1 for total_pages, then fetch rest in parallel)
// - Data aggregation with reduce
// - Using encodeURIComponent for query params with spaces
```

---

### Problem 3: To-Do List API — Full CRUD with Express

```typescript
import express, { Request, Response } from 'express';

const app = express();
app.use(express.json()); // Parse JSON request bodies

// In-memory data store
interface Todo {
    id: number;
    task: string;
    completed: boolean;
}

let todos: Todo[] = [];
let nextId = 1;

// GET /todos — Return all todos
app.get('/todos', (req: Request, res: Response) => {
    res.status(200).json(todos);
});

// GET /todos/:id — Return one todo
app.get('/todos/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const todo = todos.find(t => t.id === id);

    if (!todo) {
        // Always return JSON error responses, not plain text
        return res.status(404).json({ error: `Todo with id ${id} not found` });
    }

    res.status(200).json(todo);
});

// POST /todos — Create a new todo
app.post('/todos', (req: Request, res: Response) => {
    const { task } = req.body;

    // Input validation — return 400 for missing required fields
    if (!task || typeof task !== 'string' || task.trim() === '') {
        return res.status(400).json({ error: 'Field "task" is required and must be a non-empty string' });
    }

    const newTodo: Todo = {
        id: nextId++,
        task: task.trim(),
        completed: false,
    };

    todos.push(newTodo);
    // 201 Created — not 200! This is important in interviews
    res.status(201).json(newTodo);
});

// PUT /todos/:id — Update an existing todo
app.put('/todos/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const todoIndex = todos.findIndex(t => t.id === id);

    if (todoIndex === -1) {
        return res.status(404).json({ error: `Todo with id ${id} not found` });
    }

    const { task, completed } = req.body;

    // Only update fields that are provided
    if (task !== undefined) {
        if (typeof task !== 'string' || task.trim() === '') {
            return res.status(400).json({ error: '"task" must be a non-empty string' });
        }
        todos[todoIndex].task = task.trim();
    }

    if (completed !== undefined) {
        if (typeof completed !== 'boolean') {
            return res.status(400).json({ error: '"completed" must be a boolean' });
        }
        todos[todoIndex].completed = completed;
    }

    res.status(200).json(todos[todoIndex]);
});

// DELETE /todos/:id — Delete a todo
app.delete('/todos/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const todoIndex = todos.findIndex(t => t.id === id);

    if (todoIndex === -1) {
        return res.status(404).json({ error: `Todo with id ${id} not found` });
    }

    const deleted = todos.splice(todoIndex, 1)[0];
    // 200 with the deleted item, or 204 No Content — both are acceptable
    res.status(200).json(deleted);
});

app.listen(3000, () => console.log('Server running on port 3000'));

// Status code cheat sheet for interviews:
// 200 OK — successful GET, PUT, DELETE
// 201 Created — successful POST that creates a resource
// 400 Bad Request — invalid input, missing required fields
// 404 Not Found — resource doesn't exist
// 500 Internal Server Error — unexpected server failure
```

---

### Problem 4: Pagination Implementation

```typescript
import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

// Sample data — imagine this is from a database
interface Product {
    id: number;
    name: string;
    price: number;
}

const products: Product[] = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    price: Math.round(Math.random() * 100 * 100) / 100,
}));

// GET /products?offset=0&limit=10
// GET /products?page=1&limit=10  (alternative style)
app.get('/products', (req: Request, res: Response) => {
    // Parse query params with defaults
    // offset/limit style (HackerRank typically uses this)
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    // Slice the array — this is the core logic
    const paginatedData = products.slice(offset, offset + limit);

    // Return with metadata so the client knows about total and pagination state
    res.status(200).json({
        data: paginatedData,
        pagination: {
            offset,
            limit,
            total: products.length,
            hasMore: offset + limit < products.length,
        },
    });
});

// Alternative: page-based pagination (also common in interviews)
// GET /products?page=2&limit=10  → returns items 11-20
app.get('/products/v2', (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    // Convert page to offset: page 1 → offset 0, page 2 → offset 10, etc.
    const offset = (page - 1) * limit;
    const paginatedData = products.slice(offset, offset + limit);
    const totalPages = Math.ceil(products.length / limit);

    res.status(200).json({
        data: paginatedData,
        pagination: {
            page,
            limit,
            total: products.length,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
});

app.listen(3000, () => console.log('Server running on port 3000'));

// Key things interviewers look for:
// 1. Default values for missing params (don't crash on undefined)
// 2. Input validation (non-negative offset, positive limit)
// 3. Upper bound on limit (prevent client requesting 1 million items)
// 4. Returning total count and hasMore/hasNext for client-side pagination UI
// 5. Using Array.slice correctly — slice(start, end) where end is exclusive
```

---

### Problem 5: Longest Substring Without Repeating Characters

```typescript
// LeetCode #3 — Classic sliding window problem
// Input: "abcabcbb" → Output: 3 (the substring "abc")
// Input: "bbbbb"    → Output: 1 (the substring "b")
// Input: "pwwkew"   → Output: 3 (the substring "wke")

function lengthOfLongestSubstring(s: string): number {
    // Sliding window approach using a Set to track characters in current window
    const seen = new Set<string>();
    let left = 0; // Left pointer of the window
    let maxLen = 0; // Track the longest substring found

    // Right pointer expands the window
    for (let right = 0; right < s.length; right++) {
        // If we've seen this character, shrink the window from the left
        // until we remove the duplicate
        while (seen.has(s[right])) {
            seen.delete(s[left]);
            left++;
        }

        // Add current character to our window
        seen.add(s[right]);

        // Update max length: window size = right - left + 1
        maxLen = Math.max(maxLen, right - left + 1);
    }

    return maxLen;
}

// Walk through example: "abcabcbb"
//
// right=0: 'a' → seen={a}, window="a",       maxLen=1
// right=1: 'b' → seen={a,b}, window="ab",     maxLen=2
// right=2: 'c' → seen={a,b,c}, window="abc",  maxLen=3
// right=3: 'a' → 'a' already in seen!
//          → remove 'a' from left, left=1, seen={b,c}
//          → add 'a', seen={b,c,a}, window="bca", maxLen=3
// right=4: 'b' → 'b' already in seen!
//          → remove 'b' from left, left=2, seen={c,a}
//          → add 'b', seen={c,a,b}, window="cab", maxLen=3
// right=5: 'c' → 'c' already in seen!
//          → remove 'c' from left, left=3, seen={a,b}
//          → add 'c', seen={a,b,c}, window="abc", maxLen=3
// right=6: 'b' → 'b' already in seen!
//          → remove 'a', left=4, seen={b,c} → still has 'b'
//          → remove 'b', left=5, seen={c}
//          → add 'b', seen={c,b}, window="cb", maxLen=3
// right=7: 'b' → 'b' already in seen!
//          → remove 'c', left=6, seen={b} → still has 'b'
//          → remove 'b', left=7, seen={}
//          → add 'b', seen={b}, window="b", maxLen=3
//
// Answer: 3

// Time complexity: O(n) — each character is added and removed from the set at most once
// Space complexity: O(min(n, m)) where m is the size of the character set

// Optimized version using Map (stores index to jump left pointer directly):
function lengthOfLongestSubstringOptimized(s: string): number {
    const lastSeen = new Map<string, number>(); // char → last index where it appeared
    let left = 0;
    let maxLen = 0;

    for (let right = 0; right < s.length; right++) {
        // If char was seen and is within our current window, jump left past it
        if (lastSeen.has(s[right]) && lastSeen.get(s[right])! >= left) {
            left = lastSeen.get(s[right])! + 1;
        }

        lastSeen.set(s[right], right);
        maxLen = Math.max(maxLen, right - left + 1);
    }

    return maxLen;
}

// Test cases
console.log(lengthOfLongestSubstring('abcabcbb')); // 3
console.log(lengthOfLongestSubstring('bbbbb')); // 1
console.log(lengthOfLongestSubstring('pwwkew')); // 3
console.log(lengthOfLongestSubstring('')); // 0
console.log(lengthOfLongestSubstring(' ')); // 1
```

---

### Problem 6: Linked List — Insert, Delete, Search

```typescript
// Implement a singly linked list with insert, delete, and search operations

class ListNode {
    value: number;
    next: ListNode | null;

    constructor(value: number) {
        this.value = value;
        this.next = null;
    }
}

class LinkedList {
    head: ListNode | null;
    size: number;

    constructor() {
        this.head = null;
        this.size = 0;
    }

    // INSERT at the end — O(n)
    insert(value: number): void {
        const newNode = new ListNode(value);

        if (!this.head) {
            // Empty list — new node becomes head
            this.head = newNode;
        } else {
            // Traverse to the last node
            let current = this.head;
            while (current.next) {
                current = current.next;
            }
            current.next = newNode;
        }

        this.size++;
    }

    // INSERT at a specific index — O(n)
    insertAt(value: number, index: number): void {
        if (index < 0 || index > this.size) {
            throw new Error(`Index ${index} out of bounds (size: ${this.size})`);
        }

        const newNode = new ListNode(value);

        if (index === 0) {
            // Insert at head — point new node to current head
            newNode.next = this.head;
            this.head = newNode;
        } else {
            // Traverse to the node BEFORE the target index
            let current = this.head!;
            for (let i = 0; i < index - 1; i++) {
                current = current.next!;
            }
            // Splice in: newNode points to what was after current
            newNode.next = current.next;
            current.next = newNode;
        }

        this.size++;
    }

    // DELETE by value (first occurrence) — O(n)
    delete(value: number): boolean {
        if (!this.head) return false;

        // Special case: deleting the head
        if (this.head.value === value) {
            this.head = this.head.next;
            this.size--;
            return true;
        }

        // Traverse to find the node BEFORE the one to delete
        let current = this.head;
        while (current.next) {
            if (current.next.value === value) {
                // Skip over the node to delete it
                current.next = current.next.next;
                this.size--;
                return true;
            }
            current = current.next;
        }

        return false; // Value not found
    }

    // SEARCH — returns true if value exists — O(n)
    search(value: number): boolean {
        let current = this.head;

        while (current) {
            if (current.value === value) return true;
            current = current.next;
        }

        return false;
    }

    // HELPER: convert to array for easy visualization
    toArray(): number[] {
        const result: number[] = [];
        let current = this.head;

        while (current) {
            result.push(current.value);
            current = current.next;
        }

        return result;
    }

    // HELPER: print the list
    print(): string {
        return this.toArray().join(' -> ') + ' -> null';
    }
}

// Demo usage
const list = new LinkedList();

list.insert(10);
list.insert(20);
list.insert(30);
console.log(list.print()); // 10 -> 20 -> 30 -> null

list.insertAt(15, 1);
console.log(list.print()); // 10 -> 15 -> 20 -> 30 -> null

console.log(list.search(20)); // true
console.log(list.search(99)); // false

list.delete(15);
console.log(list.print()); // 10 -> 20 -> 30 -> null

list.delete(10);
console.log(list.print()); // 20 -> 30 -> null

console.log(list.size); // 2

// Time complexities:
// insert (end):    O(n) — must traverse to end. Could be O(1) with a tail pointer
// insertAt:        O(n) — traverse to index
// delete:          O(n) — traverse to find value
// search:          O(n) — traverse to find value
// Space: O(1) for all operations (no extra data structures)
//
// Interview tip: if asked "how would you improve this?", mention:
// - Add a "tail" pointer for O(1) insert at end
// - Use a doubly linked list for O(1) delete if you have a reference to the node
// - Use a hash map alongside for O(1) search (like LRU cache)
```

---

## 18. Type A — Algorithm / Data Structure Problems (Full Examples & Solutions)

### A1. Hash Maps — Frequency Counting

**Q: Given an array of strings, group the anagrams together.**

```typescript
// Input: ["eat","tea","tan","ate","nat","bat"]
// Output: [["eat","tea","ate"], ["tan","nat"], ["bat"]]

function groupAnagrams(strs: string[]): string[][] {
    // Key insight: anagrams have the same letters when sorted
    // "eat" → "aet", "tea" → "aet", "ate" → "aet" — they all map to the same key
    const map = new Map<string, string[]>();

    for (const str of strs) {
        // Sort the characters to create a canonical key
        const key = str.split('').sort().join('');

        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key)!.push(str);
    }

    // Map.values() gives us all the grouped arrays
    return Array.from(map.values());
}

// Time: O(n * k log k) where n = number of strings, k = max string length (due to sorting each string)
// Space: O(n * k) to store all strings in the map

console.log(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']));
// [["eat","tea","ate"], ["tan","nat"], ["bat"]]
```

### A2. Hash Maps — Two Sum

**Q: Given an array of numbers and a target, return the indices of two numbers that add up to the target.**

```typescript
// Input: nums = [2, 7, 11, 15], target = 9
// Output: [0, 1]  (because nums[0] + nums[1] = 2 + 7 = 9)

function twoSum(nums: number[], target: number): number[] {
    // Map stores: value → index
    // For each number, check if (target - number) was already seen
    const seen = new Map<number, number>();

    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];

        if (seen.has(complement)) {
            return [seen.get(complement)!, i];
        }

        seen.set(nums[i], i);
    }

    return []; // No solution found
}

// Walk through: nums = [2, 7, 11, 15], target = 9
// i=0: complement = 9-2 = 7, seen={}, not found → seen={2:0}
// i=1: complement = 9-7 = 2, seen={2:0}, FOUND! → return [0, 1]

// Time: O(n) — single pass through the array
// Space: O(n) — map stores up to n entries

console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
console.log(twoSum([3, 2, 4], 6)); // [1, 2]
```

### A3. Arrays/Strings — Sliding Window

**Q: Given a string s and an integer k, find the length of the longest substring that contains at most k distinct characters.**

```typescript
// Input: s = "eceba", k = 2
// Output: 3 ("ece" has 2 distinct chars and length 3)

function longestSubstringKDistinct(s: string, k: number): number {
    if (k === 0 || s.length === 0) return 0;

    // charCount tracks how many times each character appears in our current window
    const charCount = new Map<string, number>();
    let left = 0;
    let maxLen = 0;

    for (let right = 0; right < s.length; right++) {
        // Expand window: add the right character
        charCount.set(s[right], (charCount.get(s[right]) || 0) + 1);

        // If we have more than k distinct characters, shrink from left
        while (charCount.size > k) {
            const leftChar = s[left];
            charCount.set(leftChar, charCount.get(leftChar)! - 1);

            // If count drops to 0, remove the key entirely so .size reflects distinct count
            if (charCount.get(leftChar) === 0) {
                charCount.delete(leftChar);
            }
            left++;
        }

        // Update max
        maxLen = Math.max(maxLen, right - left + 1);
    }

    return maxLen;
}

// Walk through: s = "eceba", k = 2
// right=0: 'e' → {e:1}, distinct=1, maxLen=1
// right=1: 'c' → {e:1,c:1}, distinct=2, maxLen=2
// right=2: 'e' → {e:2,c:1}, distinct=2, maxLen=3
// right=3: 'b' → {e:2,c:1,b:1}, distinct=3 > k!
//   → shrink: remove 'e', {e:1,c:1,b:1}, left=1, still 3
//   → shrink: remove 'c', {e:1,b:1}, left=2, now 2 ✓
//   maxLen stays 3
// right=4: 'a' → {e:1,b:1,a:1}, distinct=3 > k!
//   → shrink: remove 'e', {b:1,a:1}, left=3, now 2 ✓
//   maxLen stays 3
// Answer: 3

// Time: O(n) — each character added and removed at most once
// Space: O(k) — map stores at most k+1 entries

console.log(longestSubstringKDistinct('eceba', 2)); // 3
console.log(longestSubstringKDistinct('aa', 1)); // 2
```

### A4. Arrays/Strings — Two Pointers

**Q: Given a sorted array, remove duplicates in-place and return the new length.**

```typescript
// Input: [1, 1, 2, 2, 3]
// Output: 3 (array becomes [1, 2, 3, ...])
// Must modify array in-place with O(1) extra space

function removeDuplicates(nums: number[]): number {
    if (nums.length === 0) return 0;

    // "slow" pointer tracks where to place the next unique value
    // "fast" pointer scans through the array
    let slow = 0;

    for (let fast = 1; fast < nums.length; fast++) {
        // When we find a new unique value (different from what slow points to)
        if (nums[fast] !== nums[slow]) {
            slow++;
            nums[slow] = nums[fast]; // Place the unique value at the next position
        }
        // If they're equal, we just skip (fast moves forward, slow stays)
    }

    // slow is the index of the last unique element, so length = slow + 1
    return slow + 1;
}

// Walk through: [1, 1, 2, 2, 3]
// slow=0, fast=1: nums[1]=1 === nums[0]=1, skip
// slow=0, fast=2: nums[2]=2 !== nums[0]=1 → slow=1, nums[1]=2 → [1,2,2,2,3]
// slow=1, fast=3: nums[3]=2 === nums[1]=2, skip
// slow=1, fast=4: nums[4]=3 !== nums[1]=2 → slow=2, nums[2]=3 → [1,2,3,2,3]
// Return slow+1 = 3 — first 3 elements are [1,2,3]

// Time: O(n)   Space: O(1)

const arr = [1, 1, 2, 2, 3];
console.log(removeDuplicates(arr)); // 3
console.log(arr.slice(0, 3)); // [1, 2, 3]
```

### A5. Sorting — Merge Intervals

**Q: Given an array of intervals, merge all overlapping intervals.**

```typescript
// Input: [[1,3],[2,6],[8,10],[15,18]]
// Output: [[1,6],[8,10],[15,18]]
// Explanation: [1,3] and [2,6] overlap, so merge into [1,6]

function mergeIntervals(intervals: number[][]): number[][] {
    if (intervals.length <= 1) return intervals;

    // Step 1: Sort by start time — this is the key insight
    // Once sorted, overlapping intervals are guaranteed to be adjacent
    intervals.sort((a, b) => a[0] - b[0]);

    const merged: number[][] = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
        const current = intervals[i];
        const lastMerged = merged[merged.length - 1];

        if (current[0] <= lastMerged[1]) {
            // Overlapping — extend the end of the last merged interval
            // Use Math.max because current's end might be smaller (fully contained)
            lastMerged[1] = Math.max(lastMerged[1], current[1]);
        } else {
            // No overlap — add as a new interval
            merged.push(current);
        }
    }

    return merged;
}

// Walk through: [[1,3],[2,6],[8,10],[15,18]]
// After sort: [[1,3],[2,6],[8,10],[15,18]] (already sorted)
// Start: merged = [[1,3]]
// i=1: [2,6] — 2 <= 3 (overlaps!) → merged = [[1,6]]
// i=2: [8,10] — 8 > 6 (no overlap) → merged = [[1,6],[8,10]]
// i=3: [15,18] — 15 > 10 (no overlap) → merged = [[1,6],[8,10],[15,18]]

// Time: O(n log n) due to sorting
// Space: O(n) for the result array

console.log(
    mergeIntervals([
        [1, 3],
        [2, 6],
        [8, 10],
        [15, 18],
    ]),
);
// [[1,6],[8,10],[15,18]]

console.log(
    mergeIntervals([
        [1, 4],
        [4, 5],
    ]),
);
// [[1,5]]
```

### A6. Trees/Graphs — BFS (Number of Islands)

**Q: Given a 2D grid of '1's (land) and '0's (water), count the number of islands.**

```typescript
// Input:
// [["1","1","0","0","0"],
//  ["1","1","0","0","0"],
//  ["0","0","1","0","0"],
//  ["0","0","0","1","1"]]
// Output: 3

function numIslands(grid: string[][]): number {
    if (!grid.length || !grid[0].length) return 0;

    const rows = grid.length;
    const cols = grid[0].length;
    let islands = 0;

    // BFS to mark all connected land cells as visited
    function bfs(startRow: number, startCol: number): void {
        const queue: [number, number][] = [[startRow, startCol]];
        grid[startRow][startCol] = '0'; // Mark as visited by sinking the island

        // 4 directions: up, down, left, right
        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ];

        while (queue.length > 0) {
            const [row, col] = queue.shift()!;

            for (const [dr, dc] of directions) {
                const newRow = row + dr;
                const newCol = col + dc;

                // Check bounds AND if it's land
                if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && grid[newRow][newCol] === '1') {
                    grid[newRow][newCol] = '0'; // Mark visited BEFORE adding to queue (prevents duplicates)
                    queue.push([newRow, newCol]);
                }
            }
        }
    }

    // Scan every cell in the grid
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '1') {
                islands++; // Found a new island
                bfs(r, c); // Sink the entire island so we don't count it again
            }
        }
    }

    return islands;
}

// How it works:
// 1. Scan grid left-to-right, top-to-bottom
// 2. When we hit a '1', we found a new island — increment counter
// 3. BFS explores all connected '1's and marks them '0' (visited)
// 4. Continue scanning — any '1' we find next must be a separate island

// Time: O(rows * cols) — visit each cell at most once
// Space: O(min(rows, cols)) — BFS queue size in worst case

console.log(
    numIslands([
        ['1', '1', '0', '0', '0'],
        ['1', '1', '0', '0', '0'],
        ['0', '0', '1', '0', '0'],
        ['0', '0', '0', '1', '1'],
    ]),
); // 3
```

### A7. Dynamic Programming — Climbing Stairs

**Q: You are climbing a staircase with n steps. Each time you can climb 1 or 2 steps. How many distinct ways can you reach the top?**

```typescript
// Input: n = 5
// Output: 8
// Ways: 1+1+1+1+1, 1+1+1+2, 1+1+2+1, 1+2+1+1, 2+1+1+1, 1+2+2, 2+1+2, 2+2+1

function climbStairs(n: number): number {
    // This is essentially the Fibonacci sequence
    // To reach step n, you either came from step n-1 (took 1 step) or step n-2 (took 2 steps)
    // So: ways(n) = ways(n-1) + ways(n-2)

    if (n <= 2) return n;

    // Only need to track the last two values, not the entire array
    let prev2 = 1; // ways to reach step 1
    let prev1 = 2; // ways to reach step 2

    for (let i = 3; i <= n; i++) {
        const current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }

    return prev1;
}

// Walk through: n = 5
// i=3: current = 2+1 = 3, prev2=2, prev1=3
// i=4: current = 3+2 = 5, prev2=3, prev1=5
// i=5: current = 5+3 = 8, prev2=5, prev1=8
// Answer: 8

// Time: O(n)   Space: O(1)

// If the interviewer asks for the memoized recursive version:
function climbStairsMemo(n: number, memo: Map<number, number> = new Map()): number {
    if (n <= 2) return n;
    if (memo.has(n)) return memo.get(n)!;

    const result = climbStairsMemo(n - 1, memo) + climbStairsMemo(n - 2, memo);
    memo.set(n, result);
    return result;
}

console.log(climbStairs(5)); // 8
console.log(climbStairs(10)); // 89
```

---

## 19. Type B — Practical Backend / API Problems (Full Examples & Solutions)

### B1. Build a REST API — CRUD with Proper Status Codes

> Already covered in Section 17, Problem 3 (To-Do List API). See that for the full Express solution.

### B2. Implement Pagination

> Already covered in Section 17, Problem 4 (Pagination Implementation). Includes both offset/limit and page-based styles.

### B3. Add Authentication — JWT Token Validation

**Q: Add JWT authentication to an Express API. Protected routes should require a valid token. Return 401 for missing/invalid tokens.**

```typescript
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'; // npm install jsonwebtoken @types/jsonwebtoken

const app = express();
app.use(express.json());

const SECRET_KEY = 'your-secret-key'; // In production, use env variable

// Extend Request type to include user info
interface AuthRequest extends Request {
    user?: { id: number; email: string; role: string };
}

// =============================================
// AUTH MIDDLEWARE — reusable across all routes
// =============================================
function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    // Token comes in the Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or malformed Authorization header' });
        return;
    }

    const token = authHeader.split(' ')[1]; // Extract the token part after "Bearer "

    try {
        // jwt.verify throws if the token is invalid, expired, or tampered with
        const decoded = jwt.verify(token, SECRET_KEY) as { id: number; email: string; role: string };
        req.user = decoded; // Attach user info to the request for downstream handlers
        next(); // Token is valid — continue to the route handler
    } catch (err) {
        // Token is invalid — could be expired, wrong signature, malformed
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// =============================================
// PUBLIC ROUTE — no auth needed
// =============================================
app.post('/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    // In real app, you'd check the database. This is simplified.
    if (email === 'user@example.com' && password === 'password123') {
        // Create a token that expires in 1 hour
        const token = jwt.sign(
            { id: 1, email: 'user@example.com', role: 'admin' }, // payload — the claims
            SECRET_KEY,
            { expiresIn: '1h' }, // token expiration
        );

        return res.status(200).json({ token });
    }

    res.status(401).json({ error: 'Invalid credentials' });
});

// =============================================
// PROTECTED ROUTES — require valid JWT
// =============================================
app.get('/profile', authenticate, (req: AuthRequest, res: Response) => {
    // req.user was set by the authenticate middleware
    res.status(200).json({
        message: 'This is a protected route',
        user: req.user,
    });
});

app.get('/admin', authenticate, (req: AuthRequest, res: Response) => {
    // Additional authorization check — not just authenticated, but must be admin
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden — admin access required' });
    }

    res.status(200).json({ message: 'Welcome, admin!' });
});

app.listen(3000, () => console.log('Server running on port 3000'));

// Status codes to remember:
// 401 Unauthorized — not authenticated (no token, bad token, expired token)
// 403 Forbidden — authenticated but not authorized (wrong role/permissions)
//
// JWT structure: header.payload.signature
// - Header: { "alg": "HS256", "typ": "JWT" }
// - Payload: { "id": 1, "email": "...", "iat": 123, "exp": 456 }
// - Signature: HMACSHA256(header + "." + payload, secret)
//
// Common interview follow-up: "How do you handle token refresh?"
// Answer: Issue a short-lived access token (15 min) + long-lived refresh token (7 days).
// When access token expires, client sends refresh token to get a new access token.
```

### B4. Rate Limiting

**Q: Implement a rate limiter middleware that allows max 10 requests per minute per IP. Return 429 when exceeded.**

```typescript
import express, { Request, Response, NextFunction } from 'express';

const app = express();

// =============================================
// RATE LIMITER — Sliding Window approach
// =============================================

// Store request timestamps per IP
// In production, use Redis instead of in-memory (works across multiple server instances)
const requestLog = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS = 10; // Max requests per window

function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Get existing timestamps for this IP, or start fresh
    const timestamps = requestLog.get(ip) || [];

    // Remove timestamps older than the window (sliding window)
    // Only keep timestamps from the last 60 seconds
    const recentTimestamps = timestamps.filter(t => now - t < WINDOW_MS);

    if (recentTimestamps.length >= MAX_REQUESTS) {
        // Too many requests — calculate when the oldest request will expire
        const oldestTimestamp = recentTimestamps[0];
        const retryAfterMs = WINDOW_MS - (now - oldestTimestamp);
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);

        res.set('Retry-After', String(retryAfterSec)); // Standard header telling client when to retry
        res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`,
            limit: MAX_REQUESTS,
            window: '60 seconds',
        });
        return;
    }

    // Request is allowed — record this timestamp
    recentTimestamps.push(now);
    requestLog.set(ip, recentTimestamps);

    // Add rate limit headers so clients can self-throttle
    res.set('X-RateLimit-Limit', String(MAX_REQUESTS));
    res.set('X-RateLimit-Remaining', String(MAX_REQUESTS - recentTimestamps.length));

    next();
}

// Apply rate limiter to all routes
app.use(rateLimiter);

app.get('/api/data', (req: Request, res: Response) => {
    res.json({ message: 'Here is your data!' });
});

app.listen(3000, () => console.log('Server running on port 3000'));

// Interview follow-up: "How would you do this in production with multiple servers?"
// Answer: Use Redis with INCR + EXPIRE:
//
// async function redisRateLimiter(ip: string): Promise<boolean> {
//   const key = `rate:${ip}`;
//   const count = await redis.incr(key);     // Atomic increment
//   if (count === 1) {
//     await redis.expire(key, 60);           // Set expiry on first request
//   }
//   return count <= MAX_REQUESTS;
// }
//
// Redis approach is better because:
// - Atomic operations (no race conditions)
// - Works across multiple server instances
// - Automatic cleanup with EXPIRE (no memory leaks)
```

### B5. API Versioning

**Q: Support both v1 and v2 of a users endpoint. v1 returns basic user info. v2 adds a "status" field and different response format.**

```typescript
import express, { Request, Response, Router } from 'express';

const app = express();
app.use(express.json());

// Shared data store
interface User {
    id: number;
    name: string;
    email: string;
    status: 'active' | 'inactive' | 'banned';
    createdAt: string;
}

const users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com', status: 'active', createdAt: '2024-01-15' },
    { id: 2, name: 'Bob', email: 'bob@example.com', status: 'inactive', createdAt: '2024-03-20' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', status: 'banned', createdAt: '2024-06-10' },
];

// =============================================
// V1 ROUTES — simple, flat response
// =============================================
const v1Router = Router();

v1Router.get('/users', (req: Request, res: Response) => {
    // v1 only returns basic fields — no status, no metadata
    const v1Users = users.map(({ id, name, email }) => ({ id, name, email }));
    res.status(200).json(v1Users);
});

v1Router.get('/users/:id', (req: Request, res: Response) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { id, name, email } = user;
    res.status(200).json({ id, name, email });
});

// =============================================
// V2 ROUTES — richer response with status, metadata, envelope
// =============================================
const v2Router = Router();

v2Router.get('/users', (req: Request, res: Response) => {
    // v2 includes status field and wraps in an envelope with metadata
    // Also supports filtering by status
    const statusFilter = req.query.status as string | undefined;

    let filteredUsers = users;
    if (statusFilter) {
        filteredUsers = users.filter(u => u.status === statusFilter);
    }

    const v2Users = filteredUsers.map(({ id, name, email, status, createdAt }) => ({
        id,
        name,
        email,
        status,
        createdAt,
    }));

    res.status(200).json({
        data: v2Users,
        meta: {
            total: v2Users.length,
            version: 'v2',
        },
    });
});

v2Router.get('/users/:id', (req: Request, res: Response) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).json({
            error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
    }

    res.status(200).json({ data: user, meta: { version: 'v2' } });
});

// =============================================
// Mount versioned routers under /v1 and /v2
// =============================================
app.use('/v1', v1Router);
app.use('/v2', v2Router);

app.listen(3000, () => console.log('Server running on port 3000'));

// Example responses:
//
// GET /v1/users → [{ "id": 1, "name": "Alice", "email": "alice@example.com" }, ...]
//
// GET /v2/users → {
//   "data": [{ "id": 1, "name": "Alice", "email": "alice@example.com", "status": "active", "createdAt": "2024-01-15" }, ...],
//   "meta": { "total": 3, "version": "v2" }
// }
//
// GET /v2/users?status=active → only active users
//
// Interview talking points:
// - URL path versioning (/v1/, /v2/) is the most common and explicit approach
// - Other approaches: header versioning (Accept: application/vnd.api+v2), query param (?version=2)
// - Always keep v1 working when you release v2 — don't break existing clients
// - Use Express Router to keep versioned code organized and separate
```

### B6. Async Data Fetching — External API Aggregation

**Q: Build an endpoint that fetches user data from an external API, aggregates results across multiple pages, and returns statistics.**

```typescript
import express, { Request, Response } from 'express';

const app = express();

// Simulating an external paginated API
// In real HackerRank problems, they give you the API URL
const EXTERNAL_API = 'https://jsonplaceholder.typicode.com';

// =============================================
// Helper: Fetch all pages from a paginated API
// =============================================
interface PaginatedResponse<T> {
    data: T[];
    page: number;
    total_pages: number;
}

async function fetchAllPages<T>(baseUrl: string): Promise<T[]> {
    // Step 1: Fetch page 1 to learn total_pages
    const firstResponse = await fetch(`${baseUrl}?page=1`);

    if (!firstResponse.ok) {
        throw new Error(`API error: ${firstResponse.status}`);
    }

    const firstPage: PaginatedResponse<T> = await firstResponse.json();
    const allData: T[] = [...firstPage.data];

    if (firstPage.total_pages <= 1) return allData;

    // Step 2: Fetch remaining pages in PARALLEL with Promise.all
    const pagePromises: Promise<T[]>[] = [];

    for (let page = 2; page <= firstPage.total_pages; page++) {
        pagePromises.push(
            fetch(`${baseUrl}?page=${page}`)
                .then(res => {
                    if (!res.ok) throw new Error(`API error on page ${page}: ${res.status}`);
                    return res.json();
                })
                .then((data: PaginatedResponse<T>) => data.data),
        );
    }

    const remainingData = await Promise.all(pagePromises);
    remainingData.forEach(pageData => allData.push(...pageData));

    return allData;
}

// =============================================
// Endpoint: Aggregate user statistics
// =============================================
interface User {
    id: number;
    name: string;
    email: string;
    company: { name: string };
}

app.get('/api/user-stats', async (req: Request, res: Response) => {
    try {
        // Fetch all users from external API
        const response = await fetch(`${EXTERNAL_API}/users`);

        if (!response.ok) {
            return res.status(502).json({ error: 'External API unavailable' });
        }

        const users: User[] = await response.json();

        // Aggregate: group users by company
        const companyCounts = new Map<string, number>();
        for (const user of users) {
            const company = user.company.name;
            companyCounts.set(company, (companyCounts.get(company) || 0) + 1);
        }

        // Transform Map to sorted array
        const companyStats = Array.from(companyCounts.entries())
            .map(([company, count]) => ({ company, count }))
            .sort((a, b) => b.count - a.count); // Most employees first

        // Aggregate: email domain distribution
        const domainCounts = new Map<string, number>();
        for (const user of users) {
            const domain = user.email.split('@')[1];
            domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
        }

        const domainStats = Array.from(domainCounts.entries())
            .map(([domain, count]) => ({ domain, count }))
            .sort((a, b) => b.count - a.count);

        res.status(200).json({
            totalUsers: users.length,
            companyCounts: companyStats,
            emailDomains: domainStats,
        });
    } catch (error) {
        // Handle network errors, timeouts, etc.
        console.error('Error fetching from external API:', error);
        res.status(500).json({ error: 'Internal server error while fetching user data' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));

// Key patterns demonstrated:
// 1. async/await with proper try/catch error handling
// 2. Promise.all for parallel requests (don't fetch pages one by one!)
// 3. Data aggregation using Map (grouping, counting)
// 4. Transforming data structures (Map → sorted array of objects)
// 5. Proper error propagation (502 for external API failures, 500 for internal errors)
// 6. Using Array methods: map, sort, split, from
```

### B7. Data Transformation

**Q: Given raw API data in one format, transform it into a different structure for the frontend.**

```typescript
// Input: flat array of order items with repeated order info
const rawApiData = [
    { orderId: 1, orderDate: '2024-01-15', productName: 'Laptop', quantity: 1, price: 999.99, customerName: 'Alice' },
    { orderId: 1, orderDate: '2024-01-15', productName: 'Mouse', quantity: 2, price: 29.99, customerName: 'Alice' },
    { orderId: 2, orderDate: '2024-01-16', productName: 'Keyboard', quantity: 1, price: 79.99, customerName: 'Bob' },
    { orderId: 2, orderDate: '2024-01-16', productName: 'Monitor', quantity: 1, price: 349.99, customerName: 'Bob' },
    { orderId: 2, orderDate: '2024-01-16', productName: 'USB Cable', quantity: 3, price: 9.99, customerName: 'Bob' },
    { orderId: 3, orderDate: '2024-01-17', productName: 'Headphones', quantity: 1, price: 199.99, customerName: 'Alice' },
];

// Desired output: grouped by order, with items nested and total calculated
// {
//   orders: [
//     {
//       orderId: 1,
//       orderDate: '2024-01-15',
//       customer: 'Alice',
//       items: [{ product: 'Laptop', quantity: 1, price: 999.99 }, ...],
//       total: 1059.97
//     },
//     ...
//   ],
//   summary: { totalOrders: 3, totalRevenue: 1719.91 }
// }

interface RawOrderItem {
    orderId: number;
    orderDate: string;
    productName: string;
    quantity: number;
    price: number;
    customerName: string;
}

interface TransformedOrder {
    orderId: number;
    orderDate: string;
    customer: string;
    items: { product: string; quantity: number; price: number; subtotal: number }[];
    total: number;
}

function transformOrders(raw: RawOrderItem[]) {
    // Step 1: Group items by orderId using a Map
    const orderMap = new Map<number, TransformedOrder>();

    for (const item of raw) {
        if (!orderMap.has(item.orderId)) {
            // First time seeing this order — create the structure
            orderMap.set(item.orderId, {
                orderId: item.orderId,
                orderDate: item.orderDate,
                customer: item.customerName,
                items: [],
                total: 0,
            });
        }

        const order = orderMap.get(item.orderId)!;
        const subtotal = item.quantity * item.price;

        // Add the item to this order's items array
        order.items.push({
            product: item.productName,
            quantity: item.quantity,
            price: item.price,
            subtotal: Math.round(subtotal * 100) / 100, // Avoid floating point weirdness
        });

        // Running total
        order.total = Math.round((order.total + subtotal) * 100) / 100;
    }

    // Step 2: Convert Map to array, sorted by orderId
    const orders = Array.from(orderMap.values()).sort((a, b) => a.orderId - b.orderId);

    // Step 3: Calculate summary
    const summary = {
        totalOrders: orders.length,
        totalRevenue: (Math.round(orders.reduce((sum, o) => sum + o.total, 100) / 100) * 100) / 100,
        // Fix: correct calculation
    };

    // Actually let's do the revenue correctly
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

    return {
        orders,
        summary: {
            totalOrders: orders.length,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
        },
    };
}

const result = transformOrders(rawApiData);
console.log(JSON.stringify(result, null, 2));

// Key patterns demonstrated:
// 1. Grouping flat data into nested structures using Map
// 2. Building objects incrementally (add items, update running total)
// 3. Map → Array conversion with Array.from()
// 4. Handling floating-point precision with Math.round
// 5. Computing derived/summary data from the transformed result
//
// This pattern appears CONSTANTLY in backend interviews because it mirrors
// real work: raw database rows → structured API response for the frontend
```

---

## 20. Type C — Node.js Specific Problems (Full Examples & Solutions)

### C1. Event-Driven Patterns — Custom EventEmitter

**Q: Implement a simplified EventEmitter class with on, off, emit, and once methods.**

```typescript
// Don't use Node's built-in EventEmitter — build it from scratch to show understanding

type Listener = (...args: any[]) => void;

class MyEventEmitter {
    // Map of event name → array of listener functions
    private events: Map<string, Listener[]>;

    constructor() {
        this.events = new Map();
    }

    // Subscribe to an event
    on(event: string, listener: Listener): this {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
        return this; // Allow chaining: emitter.on('a', fn1).on('b', fn2)
    }

    // Unsubscribe from an event
    off(event: string, listener: Listener): this {
        const listeners = this.events.get(event);
        if (!listeners) return this;

        // Remove the specific listener (by reference)
        const index = listeners.indexOf(listener);
        if (index !== -1) {
            listeners.splice(index, 1);
        }

        // Clean up empty arrays
        if (listeners.length === 0) {
            this.events.delete(event);
        }

        return this;
    }

    // Emit an event — call all registered listeners with the provided arguments
    emit(event: string, ...args: any[]): boolean {
        const listeners = this.events.get(event);
        if (!listeners || listeners.length === 0) return false;

        // Call each listener with the provided arguments
        // Use a copy of the array in case a listener modifies the list (e.g., once)
        [...listeners].forEach(listener => listener(...args));

        return true; // true means there were listeners
    }

    // Subscribe to an event, but only fire ONCE then auto-unsubscribe
    once(event: string, listener: Listener): this {
        // Wrap the listener so it removes itself after first call
        const wrapper: Listener = (...args: any[]) => {
            listener(...args); // Call the original listener
            this.off(event, wrapper); // Remove the wrapper (not the original listener)
        };

        this.on(event, wrapper);
        return this;
    }

    // Bonus: get listener count for an event
    listenerCount(event: string): number {
        return this.events.get(event)?.length || 0;
    }
}

// Demo usage
const emitter = new MyEventEmitter();

// Regular listener — fires every time
const onData = (data: any) => console.log('Data received:', data);
emitter.on('data', onData);

// Once listener — fires only once then auto-removes
emitter.once('connect', () => console.log('Connected!'));

emitter.emit('data', { id: 1 }); // "Data received: { id: 1 }"
emitter.emit('data', { id: 2 }); // "Data received: { id: 2 }"
emitter.emit('connect'); // "Connected!"
emitter.emit('connect'); // (nothing — once already fired)

// Unsubscribe
emitter.off('data', onData);
emitter.emit('data', { id: 3 }); // (nothing — listener removed)

console.log(emitter.listenerCount('data')); // 0

// Why this matters:
// - Node.js is built on events (http.Server, streams, process are all EventEmitters)
// - Shows understanding of the observer/pub-sub pattern
// - Tests: closures (once wrapper), array manipulation, Map usage
```

### C2. Stream Processing — Transform Stream

**Q: Read a CSV file, transform each row to uppercase, and write to a new file. Use streams (not fs.readFile).**

```typescript
import { createReadStream, createWriteStream } from 'fs';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

// Custom Transform stream: converts each line to uppercase
class UppercaseTransform extends Transform {
    private buffer: string;

    constructor() {
        super(); // Call parent constructor
        this.buffer = '';
    }

    // _transform is called for each chunk of data
    _transform(chunk: Buffer, encoding: string, callback: (error?: Error | null, data?: any) => void): void {
        // Chunks can split in the middle of a line, so we buffer
        this.buffer += chunk.toString();

        // Split by newline, but keep the last (potentially incomplete) line in the buffer
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || ''; // Last element might be incomplete

        for (const line of lines) {
            // Push the transformed line downstream
            this.push(line.toUpperCase() + '\n');
        }

        callback(); // Signal that we're done processing this chunk
    }

    // _flush is called when the stream ends — process any remaining buffered data
    _flush(callback: (error?: Error | null, data?: any) => void): void {
        if (this.buffer) {
            this.push(this.buffer.toUpperCase() + '\n');
        }
        callback();
    }
}

// Usage with pipeline (preferred — handles errors and backpressure automatically)
async function processFile(inputPath: string, outputPath: string): Promise<void> {
    await pipelineAsync(
        createReadStream(inputPath), // Readable: reads file in chunks (default 64KB)
        new UppercaseTransform(), // Transform: converts to uppercase
        createWriteStream(outputPath), // Writable: writes to output file
    );

    console.log('File processing complete!');
}

// processFile('input.csv', 'output.csv');

// Why streams matter:
// - Memory efficient: processes data chunk by chunk, not all at once
// - A 10GB file? Streams handle it with ~64KB of memory. readFile would crash.
// - Backpressure: if the writer is slow, the reader automatically slows down
// - pipeline() handles error propagation and cleanup (closes all streams on error)
//
// The 4 stream types:
// - Readable: source of data (fs.createReadStream, http request)
// - Writable: destination (fs.createWriteStream, http response)
// - Transform: modify data passing through (compression, encryption, parsing)
// - Duplex: both readable and writable (TCP socket, WebSocket)
```

### C3. Concurrency — Promise.all, Promise.allSettled, Race Conditions

**Q: Fetch data from 5 different APIs concurrently. Some might fail. Return all successful results and log failures.**

```typescript
// =============================================
// Pattern 1: Promise.all — fails fast if ANY promise rejects
// =============================================
async function fetchAllOrFail(urls: string[]): Promise<any[]> {
    // If even ONE request fails, the entire Promise.all rejects
    // Use this when ALL data is required and partial results are useless
    try {
        const responses = await Promise.all(urls.map(url => fetch(url).then(res => res.json())));
        return responses;
    } catch (error) {
        console.error('One or more requests failed:', error);
        throw error;
    }
}

// =============================================
// Pattern 2: Promise.allSettled — never fails, returns status of each
// =============================================
async function fetchAllGracefully(urls: string[]): Promise<{
    successful: any[];
    failed: { url: string; error: string }[];
}> {
    // Promise.allSettled ALWAYS resolves — it waits for everything to finish
    // Each result is either { status: 'fulfilled', value: ... } or { status: 'rejected', reason: ... }
    const results = await Promise.allSettled(
        urls.map(async url => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return { url, data: await response.json() };
        }),
    );

    const successful: any[] = [];
    const failed: { url: string; error: string }[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            successful.push(result.value);
        } else {
            failed.push({
                url: urls[index],
                error: result.reason.message,
            });
        }
    });

    console.log(`${successful.length} succeeded, ${failed.length} failed`);
    return { successful, failed };
}

// =============================================
// Pattern 3: Concurrency limit — don't overwhelm the server
// =============================================
async function fetchWithLimit<T>(tasks: (() => Promise<T>)[], concurrencyLimit: number): Promise<T[]> {
    // Process tasks in batches of `concurrencyLimit` at a time
    // Prevents opening 1000 connections at once
    const results: T[] = [];

    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
        const batch = tasks.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(batch.map(task => task()));
        results.push(...batchResults);
    }

    return results;
}

// Usage
const urls = [
    'https://jsonplaceholder.typicode.com/posts/1',
    'https://jsonplaceholder.typicode.com/posts/2',
    'https://jsonplaceholder.typicode.com/posts/3',
    'https://invalid-url.example.com/fail', // This one will fail
    'https://jsonplaceholder.typicode.com/posts/5',
];

// fetchAllGracefully(urls).then(console.log);

// Usage with concurrency limit:
const tasks = urls.map(url => () => fetch(url).then(r => r.json()));
// fetchWithLimit(tasks, 2); // Only 2 requests at a time

// When to use which:
// Promise.all     → All or nothing. Fast fail. Use when every result is required.
// Promise.allSettled → Graceful degradation. Use when partial results are useful.
// Promise.race    → First to finish wins. Use for timeouts:
//   Promise.race([fetchData(), timeout(5000)])
// Concurrency limit → Don't overwhelm external APIs. Use when making many requests.
```

### C4. Error Handling — Async/Await Patterns

**Q: Implement robust error handling for an Express API that calls multiple external services.**

```typescript
import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// =============================================
// Custom error classes — different errors need different handling
// =============================================
class AppError extends Error {
    statusCode: number;
    isOperational: boolean; // Operational = expected errors we can handle gracefully

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        // Maintains proper stack trace in V8 (Node.js)
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404);
    }
}

class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

class ExternalServiceError extends AppError {
    constructor(service: string) {
        super(`External service "${service}" is unavailable`, 502);
    }
}

// =============================================
// Async wrapper — eliminates try/catch in every route
// =============================================
// Without this, every async route handler needs its own try/catch
// This wrapper catches errors and passes them to Express error middleware
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next); // Any thrown/rejected error goes to the error middleware
    };
};

// =============================================
// Service functions with proper error handling
// =============================================
async function fetchUserFromDB(id: number) {
    // Simulate database lookup
    if (id <= 0) throw new ValidationError('User ID must be positive');
    if (id > 1000) throw new NotFoundError('User');

    return { id, name: 'Alice', email: 'alice@example.com' };
}

async function fetchOrdersFromAPI(userId: number) {
    // Simulate external API call that might fail
    try {
        const response = await fetch(`https://api.example.com/orders?userId=${userId}`);

        if (!response.ok) {
            throw new ExternalServiceError('Orders API');
        }

        return await response.json();
    } catch (error) {
        // Network errors (DNS failure, timeout, etc.)
        if (error instanceof ExternalServiceError) throw error;
        throw new ExternalServiceError('Orders API');
    }
}

// =============================================
// Routes using asyncHandler — clean, no try/catch needed
// =============================================
app.get(
    '/users/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            throw new ValidationError('Invalid user ID — must be a number');
        }

        const user = await fetchUserFromDB(id);
        res.status(200).json(user);
    }),
);

app.get(
    '/users/:id/orders',
    asyncHandler(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new ValidationError('Invalid user ID');

        // Multiple async operations — if user fetch fails, don't bother fetching orders
        const user = await fetchUserFromDB(id);
        const orders = await fetchOrdersFromAPI(user.id);

        res.status(200).json({ user, orders });
    }),
);

// =============================================
// Global error handler middleware — MUST have 4 parameters
// =============================================
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error for debugging
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);

    if (err instanceof AppError) {
        // Operational error — we know what happened, send clean response
        res.status(err.statusCode).json({
            error: {
                message: err.message,
                status: err.statusCode,
            },
        });
    } else {
        // Programming error — unexpected, don't leak details to client
        console.error('Unexpected error:', err.stack);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                status: 500,
            },
        });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));

// Key patterns demonstrated:
// 1. Custom error classes with status codes — no more magic numbers scattered in routes
// 2. asyncHandler wrapper — DRY pattern, replaces try/catch in every route
// 3. Operational vs programming errors — show different info to the client
// 4. Global error middleware — single place to handle all errors consistently
// 5. Error.captureStackTrace — proper stack traces for debugging
//
// Interview follow-up: "How do you handle unhandled rejections in production?"
// process.on('unhandledRejection', (reason) => {
//   console.error('Unhandled rejection:', reason);
//   // Log to monitoring service (Sentry, DataDog, etc.)
//   // Optionally: graceful shutdown
// });
```

---

## 21. BrainRocket-Specific Interview Questions — Full Answers

> These are the exact topics reported by real candidates who interviewed at BrainRocket/Soft2Bet. If you only have time to study a few things, study THESE.

### Q1: Explain the Node.js Event Loop and its phases. (ASKED MULTIPLE TIMES)

> This was mentioned by almost every candidate. Know it cold.

```
   ┌───────────────────────────┐
┌─>│        timers              │ ← setTimeout, setInterval callbacks
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
│  │     pending callbacks     │ ← I/O callbacks deferred to next loop
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
│  │       idle, prepare       │ ← internal use only
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
│  │          poll             │ ← retrieve new I/O events, execute I/O callbacks
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
│  │          check            │ ← setImmediate() callbacks
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
│  │     close callbacks       │ ← socket.on('close'), etc.
│  └───────────┬───────────────┘
│              │
│  ┌───────────┴───────────────┐
│  │   microtask queue         │ ← process.nextTick(), Promise.then()
│  │   (runs BETWEEN phases)   │    nextTick has priority over Promises
│  └───────────┬───────────────┘
└──────────────┘
```

**What does "I/O callbacks deferred to next loop" mean?**

In the event loop, the **pending callbacks** phase handles I/O callbacks that were **ready** in the previous loop iteration but couldn't run because the poll phase had already moved on.

```
Loop iteration 1:
  - poll phase picks up: "file read done" + "TCP connection ready"
  - poll phase runs the file read callback
  - BUT while running that callback, the TCP callback arrived too late
  - TCP callback gets deferred → queued for next iteration

Loop iteration 2:
  - pending callbacks phase runs the TCP callback
```

What kind of callbacks end up here:
- Certain system-level I/O errors (e.g., `ECONNREFUSED` from a TCP socket)
- I/O callbacks that the OS reports as ready but missed their window in the previous poll phase

In practice, you rarely think about this phase. Most I/O callbacks (file reads, HTTP responses, database queries) run directly in the **poll** phase. The pending callbacks phase is just a cleanup mechanism for edge cases.

For the interview, if they ask, just say: "It handles I/O callbacks that were deferred from the previous event loop iteration — things like certain TCP/socket errors that the OS reports asynchronously. Most I/O callbacks run in the poll phase directly."

**Key points to say in the interview:**

- Node.js is **single-threaded** for JavaScript execution, but uses **libuv** thread pool for I/O (file system, DNS, etc.)
- The event loop is what makes Node.js non-blocking — it delegates I/O to the OS/thread pool and picks up results when ready
- **Microtask queue** (process.nextTick + Promises) runs between EVERY phase, not just at the end
- `process.nextTick()` has higher priority than `Promise.then()` — nextTick queue is drained first
- `setImmediate()` runs in the **check** phase (after poll), `setTimeout(fn, 0)` runs in the **timers** phase — their order depends on context

**Predict the output (they WILL ask something like this):**

```typescript
console.log('1: start');

setTimeout(() => console.log('2: setTimeout'), 0);

Promise.resolve().then(() => console.log('3: promise'));

process.nextTick(() => console.log('4: nextTick'));

setImmediate(() => console.log('5: setImmediate'));

console.log('6: end');

// Output:
// 1: start
// 6: end
// 4: nextTick        ← microtask, highest priority after sync
// 3: promise         ← microtask, but after nextTick
// 2: setTimeout      ← timers phase
// 5: setImmediate    ← check phase (order with setTimeout can vary at top level)
```

**Why this order:**

1. `console.log('1: start')` — synchronous, runs immediately
2. `setTimeout` — schedules callback in timers phase, doesn't run yet
3. `Promise.resolve().then()` — schedules callback in microtask queue
4. `process.nextTick()` — schedules callback in microtask queue (higher priority)
5. `setImmediate()` — schedules callback in check phase
6. `console.log('6: end')` — synchronous, runs immediately
7. Call stack is now empty → drain microtask queue → nextTick first, then promise
8. Enter event loop → timers phase (setTimeout) → poll → check phase (setImmediate)

---

### Q2: How do you handle race conditions? (SPECIFICALLY ASKED)

**What is a race condition?**

> A race condition occurs when two or more operations try to access/modify shared state concurrently, and the final result depends on the timing/order of execution. In Node.js, even though JS is single-threaded, race conditions happen with:
>
> - Multiple async operations writing to the same database record
> - Two API requests trying to deduct from the same user balance
> - Concurrent microservices processing the same event

**Example: Double-spending in iGaming**

```typescript
// BAD — Race condition: two concurrent bet placements for the same user
app.post('/place-bet', async (req, res) => {
    const { userId, amount } = req.body;

    // Both requests read balance = $100 at the same time
    const user = await db.findOne({ id: userId });

    if (user.balance >= amount) {
        // Both requests think there's enough balance!
        // Request A: 100 >= 50 ✓  →  sets balance to 50
        // Request B: 100 >= 50 ✓  →  sets balance to 50 (should be 0 or rejected!)
        await db.updateOne({ id: userId }, { balance: user.balance - amount });
        res.json({ success: true });
    }
});
```

**Solution 1: Optimistic Locking (version field)**

```typescript
// GOOD — Use a version field to detect concurrent modifications
// Each update checks AND increments the version atomically

app.post('/place-bet', async (req, res) => {
    const { userId, amount } = req.body;

    const user = await db.findOne({ id: userId });

    if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Atomic update: only succeeds if version hasn't changed since we read it
    const result = await db.updateOne(
        { id: userId, version: user.version }, // WHERE id = X AND version = Y
        {
            $set: { balance: user.balance - amount },
            $inc: { version: 1 }, // Increment version
        },
    );

    if (result.modifiedCount === 0) {
        // Another request modified the record — version changed → retry or reject
        return res.status(409).json({ error: 'Conflict — please retry' });
    }

    res.json({ success: true, newBalance: user.balance - amount });
});

// How it prevents the race condition:
// Request A reads: balance=100, version=1
// Request B reads: balance=100, version=1
// Request A updates WHERE version=1 → succeeds, version becomes 2
// Request B updates WHERE version=1 → fails (version is now 2) → returns 409
```

**Solution 2: Atomic Database Operations**

```typescript
// BETTER — Use atomic operations, never read-then-write separately

app.post('/place-bet', async (req, res) => {
    const { userId, amount } = req.body;

    // Single atomic operation: only decrements if balance >= amount
    const result = await db.updateOne(
        { id: userId, balance: { $gte: amount } }, // Check AND update atomically
        { $inc: { balance: -amount } }, // Decrement atomically
    );

    if (result.modifiedCount === 0) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    res.json({ success: true });
});

// MongoDB's $inc is atomic — no race condition possible
// No need for version fields or retries
```

**Solution 3: Distributed Lock with Redis**

```typescript
// For multi-step operations that can't be done in a single atomic query
// Use Redis distributed lock (SET NX EX pattern)

import Redis from 'ioredis';
const redis = new Redis();

async function withLock<T>(lockKey: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const lockValue = crypto.randomUUID(); // Unique value to identify lock owner

    // Try to acquire lock: SET key value NX (only if not exists) EX (with expiry)
    const acquired = await redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX');

    if (!acquired) {
        throw new Error('Could not acquire lock — another operation in progress');
    }

    try {
        return await fn(); // Execute the critical section
    } finally {
        // Release lock — but only if WE still own it (compare value)
        // Lua script ensures atomic check-and-delete
        const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
        await redis.eval(script, 1, lockKey, lockValue);
    }
}

// Usage: only one request can process a bet for this user at a time
app.post('/place-bet', async (req, res) => {
    const { userId, amount } = req.body;

    try {
        const result = await withLock(`lock:user:${userId}`, 5000, async () => {
            const user = await db.findOne({ id: userId });
            if (user.balance < amount) throw new Error('Insufficient balance');

            await db.updateOne({ id: userId }, { $inc: { balance: -amount } });
            return { newBalance: user.balance - amount };
        });

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// When to use which:
// Atomic operations → simplest, use when possible (single DB operation)
// Optimistic locking → when you need to read-then-write but conflicts are rare
// Distributed lock → when you have multi-step operations across services/DBs
```

---

### Q3: Basics of Distributed Systems (SPECIFICALLY ASKED)

**Key concepts to know and be able to explain:**

**CAP Theorem:**

> In a distributed system, you can only guarantee 2 out of 3:
>
> - **Consistency** — every read receives the most recent write
> - **Availability** — every request receives a response (even if not the latest data)
> - **Partition Tolerance** — the system works even when network between nodes fails
>
> In practice, network partitions WILL happen, so you're really choosing between **CP** (consistent but may reject requests) or **AP** (available but may serve stale data).
>
> "In iGaming, financial transactions like bets and withdrawals need CP — we can't risk showing a wrong balance. But for leaderboards or game history, AP is fine — slightly stale data is acceptable."

**Eventual Consistency:**

> Instead of all nodes having the same data at all times (strong consistency), changes propagate gradually. All nodes will eventually reach the same state. Used by: DynamoDB, Cassandra, DNS, Redis replication.
>
> "When a user places a bet, we use strong consistency for the balance update (MySQL transaction). But the bet history feed for other users? That can be eventually consistent via an event published to Kafka."

**Service Discovery:**

> How do microservices find each other?
>
> - **DNS-based** — services register with a DNS server (e.g., Consul, Route 53)
> - **Client-side** — service queries a registry and picks an instance (e.g., Eureka)
> - **Server-side** — load balancer routes to healthy instances (e.g., Kubernetes Service, AWS ALB)
> - In Kubernetes: services get a stable DNS name automatically (`my-service.default.svc.cluster.local`)

**Idempotency:**

> An operation is idempotent if calling it multiple times produces the same result as calling it once. Critical for reliability in distributed systems where messages can be delivered more than once.

```typescript
// Idempotent bet placement using an idempotency key
app.post('/place-bet', async (req, res) => {
    const { userId, amount, idempotencyKey } = req.body;

    // Check if this request was already processed
    const existing = await db.findOne({ idempotencyKey });
    if (existing) {
        // Already processed — return the same response (don't process again)
        return res.status(200).json(existing.response);
    }

    // Process the bet
    const result = await processBet(userId, amount);

    // Store the result keyed by idempotencyKey
    await db.insertOne({ idempotencyKey, response: result, createdAt: new Date() });

    res.status(201).json(result);
});

// Client sends: POST /place-bet { idempotencyKey: "uuid-123", userId: 1, amount: 50 }
// First call: processes the bet, returns 201
// Retry (same key): returns the cached 200 response without processing again
```

**Health Checks & Circuit Breaker:**

> - **Health checks:** Each service exposes `/health` endpoint. Orchestrator (K8s) checks it to route traffic only to healthy instances.
> - **Circuit breaker:** If a downstream service fails repeatedly, stop calling it temporarily (open circuit). Try again after a timeout (half-open). If it works, close the circuit. Prevents cascading failures.

```typescript
// Simple circuit breaker concept
class CircuitBreaker {
    private failures = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    private nextAttempt = 0;

    constructor(
        private threshold: number = 5, // Open after 5 failures
        private cooldownMs: number = 30000, // Wait 30s before retrying
    ) {}

    async call<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit is OPEN — service unavailable');
            }
            this.state = 'HALF_OPEN'; // Try one request
        }

        try {
            const result = await fn();
            this.failures = 0;
            this.state = 'CLOSED';
            return result;
        } catch (error) {
            this.failures++;
            if (this.failures >= this.threshold) {
                this.state = 'OPEN';
                this.nextAttempt = Date.now() + this.cooldownMs;
            }
            throw error;
        }
    }
}

// Usage
const paymentCircuit = new CircuitBreaker(3, 10000);

app.post('/withdraw', async (req, res) => {
    try {
        const result = await paymentCircuit.call(() => fetch('https://payment-service/process', { method: 'POST', body: JSON.stringify(req.body) }));
        res.json(result);
    } catch (err) {
        res.status(503).json({ error: 'Payment service temporarily unavailable' });
    }
});
```

---

### Q4: Microservices Theory (SPECIFICALLY ASKED)

**Q: When should you use microservices vs a monolith?**

> **Use a monolith when:**
>
> - Small team (< 5-10 developers)
> - New product / MVP — you don't know the domain boundaries yet
> - Simple deployment needs
> - The overhead of distributed systems isn't worth it
>
> **Use microservices when:**
>
> - Multiple teams need to deploy independently
> - Different parts of the system have different scaling needs (e.g., odds calculation needs 10x more instances than user auth)
> - You need technology diversity (e.g., Python for ML model, Node.js for API)
> - Domain boundaries are well understood
>
> "I'd start with a modular monolith — clean separation into modules that COULD become services later. Only split when you have a clear need: independent scaling, independent deployment, or different technology requirements."

**Q: How do microservices communicate?**

> **Synchronous (request-response):**
>
> - **REST/HTTP** — simple, widely understood, good for CRUD. Downside: tight coupling, cascading failures.
> - **gRPC** — binary protocol, faster than REST, strongly typed with Protobuf. Good for internal service-to-service calls.
>
> **Asynchronous (event-driven):**
>
> - **Message queues (RabbitMQ)** — task-based: "process this bet," "send this email." One producer, one consumer per message.
> - **Event streaming (Kafka)** — event-based: "bet was placed." Multiple consumers can independently read the same event.
> - **NATS** — lightweight pub/sub, great for real-time notifications. Fire-and-forget unless using JetStream.
>
> "For the iGaming platform, I'd use REST for client-to-service communication, gRPC for internal service-to-service calls where performance matters, and RabbitMQ/Kafka for async workflows like bet processing and notification delivery."

**Q: How do you handle data consistency across microservices?**

> Each microservice owns its own database (Database per Service pattern). This means you can't do cross-service JOINs or ACID transactions.
>
> **Patterns for consistency:**
>
> - **Saga pattern** — a sequence of local transactions. If step 3 fails, execute compensating transactions for steps 2 and 1. Two styles:
>     - _Choreography:_ each service listens for events and acts (simpler, but harder to track)
>     - _Orchestration:_ a central orchestrator tells each service what to do (easier to debug)
> - **Outbox pattern** — write the event to a local "outbox" table in the same transaction as the data change. A separate process polls the outbox and publishes events. Guarantees at-least-once delivery.
> - **CQRS** — Command Query Responsibility Segregation. Separate write model (commands) from read model (queries). Write to MySQL, project to a denormalized read model in MongoDB/Redis for fast queries.

---

### Q5: JavaScript "Predict the Output" Questions (REPORTED BY CANDIDATES)

> Candidates reported code snippet questions where you have to predict the output. These test deep JavaScript knowledge.

**Snippet 1: Closures**

```javascript
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0);
}
// Output: 3, 3, 3
// Why: `var` is function-scoped, not block-scoped. By the time setTimeout
// callbacks run, the loop has finished and i = 3. All closures reference
// the same `i` variable.

// Fix with let (block-scoped):
for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0);
}
// Output: 0, 1, 2
// Why: `let` creates a new binding for each loop iteration
```

**Snippet 2: Hoisting**

```javascript
console.log(a); // undefined (var is hoisted but not initialized)
console.log(b); // ReferenceError: Cannot access 'b' before initialization
var a = 1;
let b = 2;

// Why: `var` declarations are hoisted and initialized to undefined
// `let` and `const` are hoisted but in a "temporal dead zone" until declaration
```

**Snippet 3: `this` binding**

```javascript
const obj = {
    name: 'Alice',
    greet: function () {
        console.log(this.name);
    },
    greetArrow: () => {
        console.log(this.name);
    },
};

obj.greet(); // "Alice" — `this` refers to obj (method call)
obj.greetArrow(); // undefined — arrow functions don't have their own `this`,
//   they inherit from the enclosing scope (module/global)

const greetFn = obj.greet;
greetFn(); // undefined — `this` is now global/undefined (lost context)
```

**Snippet 4: Promise execution order**

```javascript
console.log('A');

setTimeout(() => console.log('B'), 0);

Promise.resolve()
    .then(() => {
        console.log('C');
        return Promise.resolve();
    })
    .then(() => console.log('D'));

Promise.resolve().then(() => console.log('E'));

console.log('F');

// Output: A, F, C, E, D, B
// Why:
// 1. A, F — synchronous, run immediately
// 2. C — first microtask (first Promise.then)
// 3. E — second microtask (second Promise chain, same microtask batch)
// 4. D — C's .then returned a Promise, so D is queued in the NEXT microtask batch
// 5. B — setTimeout is a macrotask, runs after all microtasks are drained
```

**Snippet 5: typeof and equality quirks**

```javascript
console.log(typeof null); // "object" (infamous JS bug, kept for compatibility)
console.log(typeof undefined); // "undefined"
console.log(null == undefined); // true (loose equality, both are "empty" values)
console.log(null === undefined); // false (strict equality, different types)
console.log(NaN === NaN); // false (NaN is not equal to anything, including itself)
console.log(Number.isNaN(NaN)); // true (use this instead of ===)
```

**Snippet 6: Async/Await execution order**

```javascript
async function foo() {
    console.log('1: foo start');
    await bar();
    console.log('2: foo after await'); // This runs as a microtask after bar resolves
}

async function bar() {
    console.log('3: bar start');
}

console.log('4: script start');
foo();
console.log('5: script end');

// Output: 4: script start, 1: foo start, 3: bar start, 5: script end, 2: foo after await
// Why:
// - "4: script start" — synchronous
// - foo() is called — "1: foo start" — synchronous part of foo
// - await bar() — calls bar synchronously — "3: bar start"
// - await pauses foo, returns control to caller
// - "5: script end" — synchronous
// - microtask queue: resume foo after await — "2: foo after await"
```

**Snippet 7: Object reference vs value**

```javascript
const a = { count: 1 };
const b = a; // b points to the SAME object
b.count = 2;
console.log(a.count); // 2 — objects are passed by reference

const x = 10;
let y = x; // y gets a COPY of the value
y = 20;
console.log(x); // 10 — primitives are passed by value
```

---

### Q6: RabbitMQ vs Kafka (SPECIFICALLY ASKED)

> Already covered in full detail in Section 9. Here's the quick version for fast review:
>
> - **RabbitMQ** = message broker, push-based, messages deleted after consume, complex routing (exchanges), good for task queues. Use for: bet processing, payment workflows, email sending.
> - **Kafka** = distributed log, pull-based, messages retained (replayable), high throughput (1M+ msgs/sec), good for event streaming. Use for: audit trails, analytics pipelines, live odds feeds.
> - **In iGaming:** RabbitMQ for transactional workflows, Kafka for event streaming and compliance audit logs.

---

### Q7: System Design — Be Ready to Discuss Your Approach (SOFT2BET SAID THIS WAS "INTERESTING")

> The Soft2Bet interviewer reportedly enjoyed the system design discussion and wanted to understand the candidate's approach. This is your chance to shine — think out loud, draw the architecture, discuss trade-offs.

**Likely system design prompts for iGaming:**

1. "Design a real-time betting system" → See Section 10 for full answer
2. "Design a wallet/payment system that prevents double-spending" → Use the race condition patterns from Q2 above
3. "Design a notification system for a gaming platform" → See Section 10
4. "How would you scale this service to handle 10x traffic during a major sporting event?"

**For prompt #4, here's a strong answer:**

```
Scale strategy for a live sporting event (e.g., Super Bowl):

1. PREDICT: We know the event date → pre-scale infrastructure
   - Auto-scaling groups with scheduled scaling policies
   - Pre-warm instances 1 hour before the event
   - Increase Redis cluster nodes for cache capacity

2. CACHE AGGRESSIVELY: Most data is read-heavy during events
   - Cache odds in Redis with short TTL (5-10 seconds)
   - Cache user session data in Redis (don't hit DB per request)
   - CDN for static assets

3. QUEUE WRITES: Bet placements spike → don't overwhelm the database
   - Bet placement → RabbitMQ queue → workers process at sustainable rate
   - Return 202 Accepted immediately, process async
   - Client polls or subscribes via WebSocket for confirmation

4. SEPARATE READ/WRITE PATHS (CQRS):
   - Writes (bets, deposits) → MySQL with strong consistency
   - Reads (odds, leaderboards, history) → Redis/MongoDB read replicas
   - Different scaling for each path

5. CIRCUIT BREAKERS: If payment service slows down, don't cascade
   - Open circuit → return "temporarily unavailable" → retry after cooldown
   - Fallback: queue the payment for processing when service recovers

6. MONITORING: Watch these metrics live during the event
   - Request rate (RPS), p99 latency, error rate
   - Queue depth (if growing → add workers)
   - Database connection pool usage
   - Redis memory and hit rate
```
