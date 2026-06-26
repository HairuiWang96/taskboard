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
  // Mutex = Mutual Exclusion — a lock that ensures only ONE thread/process can access a resource at a time
  // Without mutex:
  // Thread A: read balance ($100) → subtract $50 → write $50
  // Thread B: read balance ($100) → subtract $30 → write $70 ← overwrites Thread A's write!
  // Result: $70 (wrong — should be $20)
  //
  // With mutex:
  // Thread A: 🔒 lock → read $100 → subtract $50 → write $50 → 🔓 unlock
  // Thread B: ⏳ waiting... → 🔒 lock → read $50 → subtract $30 → write $20 → 🔓 unlock
  // Result: $20 (correct)
  //
  // Think of it like a bathroom lock — only one person can be inside.
  // Everyone else waits in line until the person inside unlocks the door.
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
- **Stream processing** — read/transform/write data using Node streams‼️
- **Concurrency** — handle multiple async operations with Promise.all, race conditions‼️
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
  - Talk through your approach BEFORE writing code‼️
  - "I'm thinking of using a hash map because..."
  - "I'll structure this as three endpoints: GET, POST, DELETE..."
  - Mention edge cases you'll handle

Step 3: CODE (15-25 min per problem)
  - Write clean, readable code — variable names matter‼️
  - Use TypeScript if allowed (shows your strength)
  - Add brief comments for complex logic
  - Handle errors properly (try/catch, status codes)

Step 4: TEST (3-5 min)
  - Run the test cases
  - Walk through a simple example manually
  - Check edge cases: empty input, large input, invalid input‼️

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

### NestJS Basics — What It Is and How It Works

// NestJS is a framework for building server-side Node.js applications.
// It is built on top of Express (default) or Fastify, and adds a structured,
// opinionated architecture inspired by Angular.‼️
// It uses TypeScript by default and is designed for building scalable, maintainable backend apps.

**Why NestJS exists (the problem it solves):**

// Express is minimal — it gives you req, res, next and nothing else.
// As projects grow, you end up inventing your own patterns for:
// - How to organize files and folders
// - How to share services between routes
// - How to validate input
// - How to handle auth consistently
// NestJS solves this by giving you a standard architecture out of the box.

**The 3 core building blocks:**

// 1. MODULES — containers that group related code together
// 2. CONTROLLERS — handle incoming HTTP requests (like Express route handlers)
// 3. PROVIDERS/SERVICES — business logic, reusable across controllers

// Think of it like this:
// Module = a folder/feature boundary (e.g., UsersModule, OrdersModule)
// Controller = the route handler (e.g., GET /users, POST /users)
// Service = the actual logic (e.g., query DB, send email, calculate price)

**1. Modules — how NestJS organizes code:**

```typescript
// Every NestJS app has a root module: AppModule
// Each feature gets its own module

// app.module.ts — the root module
@Module({
    imports: [UsersModule, OrdersModule], // bring in other modules
    controllers: [AppController], // route handlers for this module
    providers: [AppService], // services for this module
})
export class AppModule {}

// users.module.ts — a feature module
@Module({
    controllers: [UsersController], // handles /users routes
    providers: [UsersService], // business logic for users
    exports: [UsersService], // makes UsersService available to OTHER modules that import this one
})
export class UsersModule {}

// Key points:
// - imports: modules this module DEPENDS ON (pulls in their exported providers)
// - controllers: route handlers that belong to this module
// - providers: services/logic that belong to this module (private by default)‼️
// - exports: providers that OTHER modules can use when they import this module
// - If you don't export a provider, it stays private to this module‼️
```

**2. Controllers — handling HTTP requests:**

```typescript
// Controllers are similar to Express route handlers, but decorated with metadata‼️

@Controller('users') // base route: /users
export class UsersController {
    // NestJS injects UsersService automatically (dependency injection)
    constructor(private readonly usersService: UsersService) {}

    @Get() // GET /users
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id') // GET /users/123
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Post() // POST /users
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Put(':id') // PUT /users/123
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id') // DELETE /users/123
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}

// Compare with Express:
// Express:   router.get('/users/:id', (req, res) => { ... })
// NestJS:    @Get(':id') findOne(@Param('id') id: string) { ... }
//
// Key decorators for parameters:‼️
// @Param('id')   — route params (like req.params.id)
// @Body()        — request body (like req.body)
// @Query('page') — query string (like req.query.page)
// @Headers()     — request headers (like req.headers)
// @Req()         — raw Express request object (avoid if possible — breaks platform independence)
```

**3. Providers/Services — where the logic lives:**

```typescript
// Services are plain classes marked with @Injectable()‼️
// NestJS creates ONE instance and shares it everywhere (singleton by default)

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepo: Repository<User>, // TypeORM repository injected by NestJS
    ) {}

    findAll(): Promise<User[]> {
        return this.usersRepo.find();
    }

    findOne(id: string): Promise<User> {
        return this.usersRepo.findOneBy({ id });
    }

    create(dto: CreateUserDto): Promise<User> {
        const user = this.usersRepo.create(dto);
        return this.usersRepo.save(user);
    }
}

// Why @Injectable()?‼️
// It tells NestJS: "this class can be injected into other classes"
// NestJS reads the constructor parameters, finds the matching providers,
// and passes them in automatically. You never do `new UsersService(...)` yourself.
```

**Dependency Injection — the key concept:**

```typescript
// In Express you might do:
//   const usersService = new UsersService(new DatabaseConnection());
//   router.get('/users', (req, res) => usersService.findAll());
//
// In NestJS, you NEVER use `new` for services. The framework does it for you:

@Controller('users')
export class UsersController {
    // NestJS sees "UsersService" in the constructor → looks it up in the IoC container → injects it
    constructor(private readonly usersService: UsersService) {}
}

// Why this matters:
// 1. You don't manually wire up dependencies — NestJS handles the whole chain
// 2. Easy to test — swap real services with mocks
// 3. Singleton by default — one instance shared across the app (efficient)‼️
// 4. Loose coupling — controller doesn't know HOW UsersService works, just that it exists
```

**DTOs (Data Transfer Objects) and Validation:**

```typescript
// DTOs define the shape of incoming data — like a TypeScript interface but as a class
// Using a class (not interface) because NestJS validation pipes need runtime metadata‼️

import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @MinLength(8)
    password: string;
}

// In main.ts, enable global validation:
app.useGlobalPipes(
    new ValidationPipe({
        whitelist: true, // strips properties not in the DTO
        transform: true, // auto-transform payloads to DTO instances
    }),
);

// Now if someone sends { name: 123, email: "bad" }, NestJS automatically returns:
// 400 Bad Request with detailed validation errors
// You don't write any if/else validation logic yourself
```

**How a request flows through NestJS (simplified):**

```
Client sends: POST /users { name: "Alice", email: "alice@example.com" }

1. NestJS receives the request
2. Middleware runs (if any) — e.g., logging, CORS
3. Guards check (if any) — e.g., is the user authenticated?
4. Pipes validate/transform — ValidationPipe checks the body against CreateUserDto
5. Controller method runs — UsersController.create() is called
6. Service does the work — UsersService.create() queries the database
7. Response is sent back — NestJS serializes the return value to JSON automatically‼️
```

**NestJS project structure (typical):**

```
src/
├── app.module.ts          // Root module — imports all feature modules
├── app.controller.ts      // Root controller (health checks, etc.)
├── app.service.ts         // Root service
├── main.ts                // Entry point — creates the NestJS app and starts listening
│
├── users/                 // Feature module
│   ├── users.module.ts    // Module definition
│   ├── users.controller.ts // Route handlers
│   ├── users.service.ts   // Business logic
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── entities/
│       └── user.entity.ts // Database entity (TypeORM/Prisma model)
│
├── orders/                // Another feature module
│   ├── orders.module.ts
│   ├── orders.controller.ts
│   └── orders.service.ts
│
└── common/                // Shared utilities
    ├── guards/
    ├── pipes/
    ├── interceptors/
    └── filters/
```

**NestJS vs Express — quick comparison:**

```
| Feature              | Express                        | NestJS                              |
|----------------------|--------------------------------|-------------------------------------|
| Structure            | No opinion — you decide        | Opinionated — modules/ctrl/service  |
| TypeScript           | Manual setup                   | Built-in, first-class               |
| Dependency Injection | None — wire it yourself        | Built-in IoC container              |
| Validation           | Manual or middleware           | Decorators + ValidationPipe ‼️        |
| Testing              | Manual mocking                 | Built-in testing module with DI     |
| Learning curve       | Low                            | Medium (decorators, DI, modules)    |
| Best for             | Small apps, APIs, prototypes   | Large apps, teams, enterprise       |
```

// Summary — the NestJS mental model:
// 1. Modules group related features (like Angular modules)
// 2. Controllers handle routes (decorated Express handlers)
// 3. Services hold business logic (injected automatically via DI)
// 4. Decorators (@Get, @Body, @Injectable) replace manual wiring‼️
// 5. Everything flows through a predictable lifecycle: Middleware → Guards → Pipes → Handler → Interceptors → Filters

---

### Architecture & Core Concepts

**Q: How does dependency injection work in NestJS?**

> NestJS uses an ‼️ IoC (Inversion of Control) container. You mark classes with `@Injectable()` and register them as providers in a module. The framework resolves the dependency graph at startup and injects instances via constructor injection. ‼️ Custom providers use `useFactory`, `useClass`, or `useValue` strategies.
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

**Q: Explain the NestJS request lifecycle / execution order.**‼️

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

> ‼️ Dynamic modules allow runtime configuration via static methods like `register()` or `forRoot()`. They return a `DynamicModule` object with configured providers and exports. Use cases:
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

> - **Middleware:** Request preprocessing before routing — logging, body parsing, rate limiting. ‼️No access to handler metadata.
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
> - **Outbox:** Write events to a local outbox table within the same transaction as the data change, then publish events asynchronously. ‼️Ensures at-least-once delivery.
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

> - Use `--inspect` flag and Chrome DevTools for heap snapshots‼️
> - Monitor with `process.memoryUsage()` — watch `heapUsed` growth over time‼️
> - Common causes: global variables, unclosed event listeners, closures retaining references, unbounded caches
> - Use WeakMap/WeakSet for caches that should be GC'd‼️
> - Set max listeners with `emitter.setMaxListeners()` to detect leaks early‼️

**Q: Streams in Node.js — when and why?**

> Streams process data in chunks instead of loading everything into memory. Essential for:
>
> - Large file processing (CSV imports, log parsing)
> - HTTP request/response bodies
> - Database result streaming
> - Real-time data pipelines
>
> ‼️ Four types: Readable, Writable, Duplex, Transform. ‼️ Use `pipeline()` from `stream/promises` for proper error handling and backpressure.

**Q: Worker Threads vs Child Processes vs Cluster?**

> - **Worker Threads:** Share memory (via SharedArrayBuffer), good for CPU-intensive tasks within one process. Lower overhead than child processes.
> - **Child Processes:** Separate processes, ‼️ communicate via IPC. Use for running external commands or isolating untrusted code.
> - **Cluster:** Forks the main process to utilize multiple CPU cores. Each worker handles incoming connections. ‼️ Use for horizontal scaling of HTTP servers.

**Q: libuv thread pool vs Worker Threads — what's the difference?**

> These are two completely different things that people often confuse.
>
> **libuv Thread Pool (internal, automatic):**
>
> - Built into Node.js — you don't create or manage it
> - Default size: 4 threads (configurable via `UV_THREADPOOL_SIZE`, max 1024)
> - Handles operations that can't be done asynchronously by the OS:
>     - File system operations (`fs.readFile`, `fs.writeFile`)
>     - DNS lookups (`dns.lookup()`)
>     - Crypto operations (`crypto.pbkdf2`, `crypto.randomBytes`)
>     - Compression (`zlib`)
> - You never interact with these threads directly — Node.js uses them behind the scenes and returns results to the event loop
>
> ```typescript
> // You write this — looks async and single-threaded:
> const data = await fs.promises.readFile('big-file.txt');
>
> // But internally, libuv sends this to its thread pool
> // because the OS doesn't have a good async file I/O API
> // A thread pool worker does the blocking read, then
> // notifies the event loop when done
> ```
>
> **Worker Threads (explicit, you create them):**
>
> - You create and manage them via `worker_threads` module
> - Used for CPU-intensive JavaScript that would block the event loop
> - Each worker has its own V8 instance and event loop
> - Can share memory via `SharedArrayBuffer`
> - You decide what code runs in them
>
> ```typescript
> import { Worker, isMainThread, workerData, parentPort } from 'worker_threads';
>
> if (isMainThread) {
>     // Main thread — spawn a worker for heavy computation
>     const worker = new Worker(__filename, { workerData: { n: 1000000 } });
>     worker.on('message', result => console.log('Result:', result));
> } else {
>     // Worker thread — do CPU-heavy work without blocking main event loop
>     const sum = heavyComputation(workerData.n);
>     parentPort!.postMessage(sum);
> }
> ```
>
> **Side-by-side comparison:**
>
> |                        | libuv Thread Pool                   | Worker Threads                              |
> | ---------------------- | ----------------------------------- | ------------------------------------------- |
> | **Created by**         | Node.js automatically               | You, explicitly                             |
> | **Purpose**            | Async I/O that OS can't do natively | CPU-intensive JavaScript                    |
> | **Default count**      | 4                                   | 0 (you create as needed)                    |
> | **Runs JavaScript?**   | No — runs C/C++ code                | Yes — full V8 instance                      |
> | **Shares event loop?** | Returns results to main event loop  | Has its own event loop                      |
> | **Communication**      | Transparent (callback/promise)      | `postMessage` / `SharedArrayBuffer`         |
> | **Example use**        | `fs.readFile`, `crypto.pbkdf2`      | Image processing, parsing huge CSV, hashing |
>
> **The key insight for the interview:**
> "libuv threads handle I/O that the OS can't do async — the developer never sees them. Worker threads handle CPU-heavy JavaScript — the developer creates and manages them explicitly. They solve completely different problems."

---

## 8. Database Questions (MongoDB + MySQL + Redis)

**Q: When would you use MongoDB vs MySQL?**

> - **MongoDB:** Flexible schema, document model, ‼️good for rapidly changing data structures, nested/hierarchical data, high write throughput. ‼️Common in iGaming for user activity logs, game state, session data.
> - **MySQL:** ACID transactions, relational data with complex joins, strict data integrity requirements. Common in iGaming for financial transactions, user accounts, regulatory reporting.
> - **Hybrid approach:** Use MySQL for transactional data (deposits, withdrawals, bets) and MongoDB for analytics, game history, and user behavior tracking.

**Q: How do you use Redis beyond simple caching?**‼️

> - **Pub/Sub:** Real-time messaging between microservices (live game updates, odds changes)‼️
> - **Sorted Sets:** Leaderboards, ranking systems‼️
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

### MongoDB Basics — Quick Reference

**Connecting with Mongoose (most common in Node.js/NestJS):**

```typescript
import mongoose from 'mongoose';

// Connect to MongoDB
await mongoose.connect('mongodb://localhost:27017/igaming_db');

// Define a Schema — describes the shape of documents in a collection
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    role: { type: String, enum: ['player', 'admin'], default: 'player' },
    bets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bet' }], // Reference to another collection‼️
    createdAt: { type: Date, default: Date.now },
});

// Create a Model — gives you CRUD methods for the "users" collection‼️
const User = mongoose.model('User', userSchema);
```

**CRUD Operations:**

```typescript
// ========================
// CREATE
// ========================
const newUser = await User.create({
    name: 'Alice',
    email: 'alice@example.com',
    balance: 100,
});
// Or:
const user = new User({ name: 'Bob', email: 'bob@example.com' });
await user.save();

// ========================
// READ — find documents
// ========================

// Find all
const allUsers = await User.find();

// Find with filter
const players = await User.find({ role: 'player' });

// Find one by condition
const alice = await User.findOne({ email: 'alice@example.com' });

// Find by ID (MongoDB's _id field)
const user = await User.findById('60d5ec49f1b2c72b9c8e4d3a');

// Select specific fields (projection) — only return name and email
const names = await User.find({}, 'name email');
// Or:
const names2 = await User.find().select('name email');

// Sorting, limiting, skipping (for pagination)
const page2 = await User.find()
    .sort({ createdAt: -1 }) // -1 = descending, 1 = ascending‼️
    .skip(10) // skip first 10 results
    .limit(10); // return 10 results

// ========================
// UPDATE
// ========================

// Update one document
await User.updateOne(
    { email: 'alice@example.com' }, // filter
    { $set: { balance: 200 } }, // update
);

// Find and update (returns the updated document)
const updated = await User.findOneAndUpdate(
    { email: 'alice@example.com' },
    { $inc: { balance: 50 } }, // increment balance by 50
    { new: true }, // return the updated doc, not the old one
);

// Update many
await User.updateMany({ role: 'player' }, { $set: { status: 'active' } });

// ========================
// DELETE
// ========================

await User.deleteOne({ email: 'alice@example.com' });
await User.deleteMany({ role: 'banned' });
const deleted = await User.findByIdAndDelete('60d5ec49f1b2c72b9c8e4d3a');
```

**MongoDB Query Operators (must know for interviews):**

```typescript
// Comparison operators
await User.find({ balance: { $gt: 100 } }); // greater than
await User.find({ balance: { $gte: 100 } }); // greater than or equal
await User.find({ balance: { $lt: 50 } }); // less than
await User.find({ balance: { $lte: 50 } }); // less than or equal
await User.find({ balance: { $ne: 0 } }); // not equal
await User.find({ role: { $in: ['admin', 'moderator'] } }); // in array
await User.find({ role: { $nin: ['banned'] } }); // not in array

// Logical operators
await User.find({ $and: [{ balance: { $gt: 0 } }, { role: 'player' }] });
await User.find({ $or: [{ role: 'admin' }, { balance: { $gt: 1000 } }] });

// Element operators
await User.find({ phone: { $exists: true } }); // field exists

// Regex (string search)
await User.find({ name: { $regex: /^ali/i } }); // starts with "ali", case-insensitive
```

**Update Operators (used in the race condition solutions):**

```typescript
// $set — set a field's value
await User.updateOne({ _id: id }, { $set: { name: 'New Name' } });

// $inc — increment a field (can be negative to decrement)
await User.updateOne({ _id: id }, { $inc: { balance: -50 } }); // deduct 50
await User.updateOne({ _id: id }, { $inc: { loginCount: 1 } }); // increment by 1

// $push — add to an array
await User.updateOne({ _id: id }, { $push: { bets: betId } });

// $pull — remove from an array
await User.updateOne({ _id: id }, { $pull: { bets: betId } });

// $unset — remove a field entirely
await User.updateOne({ _id: id }, { $unset: { temporaryField: '' } });

// Combine multiple operators in one call
await User.updateOne(
    { _id: id },
    {
        $set: { lastLogin: new Date() },
        $inc: { loginCount: 1 },
        $push: { loginHistory: new Date() },
    },
);
```

**Aggregation Pipeline (powerful data processing):**

```typescript
// Aggregation = multi-step data transformation pipeline
// Each stage transforms the data and passes it to the next stage

// Example: Get total amount bet per user, sorted by highest
const stats = await Bet.aggregate([
    // Stage 1: Filter — only completed bets
    { $match: { status: 'completed' } },

    // Stage 2: Group — sum amounts per user
    {
        $group: {
            _id: '$userId', // group by userId
            totalBet: { $sum: '$amount' }, // sum of all amounts
            betCount: { $sum: 1 }, // count of bets
            avgBet: { $avg: '$amount' }, // average bet amount
            maxBet: { $max: '$amount' }, // largest single bet
        },
    },

    // Stage 3: Sort — highest total first
    { $sort: { totalBet: -1 } },

    // Stage 4: Limit — top 10
    { $limit: 10 },

    // Stage 5: Lookup — join with users collection (like SQL JOIN)‼️
    {
        $lookup: {
            from: 'users', // collection to join
            localField: '_id', // field from current pipeline (the userId we grouped by)
            foreignField: '_id', // field in users collection
            as: 'userInfo', // output array field name
        },
    },

    // Stage 6: Unwind — flatten the userInfo array into an object‼️
    { $unwind: '$userInfo' },

    // Stage 7: Project — reshape the output (like SELECT in SQL)
    {
        $project: {
            _id: 0,
            userName: '$userInfo.name',
            totalBet: 1,
            betCount: 1,
            avgBet: { $round: ['$avgBet', 2] },
        },
    },
]);

// Result: [{ userName: "Alice", totalBet: 5000, betCount: 42, avgBet: 119.05 }, ...]

// Common aggregation stages:
// $match   → filter (like WHERE)‼️
// $group   → group + aggregate (like GROUP BY)
// $sort    → sort results (like ORDER BY)
// $limit   → limit results (like LIMIT)
// $skip    → skip results (like OFFSET)
// $lookup  → join collections (like JOIN)‼️
// $unwind  → flatten arrays‼️
// $project → reshape / select fields (like SELECT)‼️
// $addFields → add computed fields
```

**Indexing (critical for performance):**

```typescript
// Without an index, MongoDB scans EVERY document (collection scan) — O(n)
// With an index, it's O(log n) — like a book's table of contents

// Single field index
userSchema.index({ email: 1 }); // 1 = ascending, -1 = descending

// Compound index (multiple fields)
betSchema.index({ userId: 1, createdAt: -1 }); // queries on userId + createdAt are fast

// Unique index (enforces uniqueness)
userSchema.index({ email: 1 }, { unique: true });

// Text index (for full-text search)
gameSchema.index({ name: 'text', description: 'text' });

// TTL index (auto-delete documents after time — great for sessions)
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // delete after 1 hour

// Check what indexes exist
await User.collection.getIndexes();

// When to index:
// ✓ Fields you filter on frequently (find, match)
// ✓ Fields you sort on
// ✓ Fields used in unique constraints
// ✗ Don't index everything — indexes slow down writes and use memory
// ✗ Don't index fields with low cardinality (e.g., boolean with only true/false)
```

**Populate (joining references between collections):**

```typescript
// Define schemas with references
const betSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    amount: Number,
    outcome: { type: String, enum: ['win', 'loss', 'pending'] },
});

const Bet = mongoose.model('Bet', betSchema);

// Without populate — just returns the ObjectId
const bet = await Bet.findById(betId);
// { userId: "60d5ec...", gameId: "60d5ed...", amount: 50 }

// With populate — resolves the reference and returns the full document‼️
const bet = await Bet.findById(betId)
    .populate('userId', 'name email') // only get name and email from user
    .populate('gameId', 'name category'); // only get name and category from game
// { userId: { name: "Alice", email: "..." }, gameId: { name: "Poker", category: "cards" }, amount: 50 }

// Populate is like a LEFT JOIN — but it makes separate queries under the hood
// For performance-critical code, use $lookup in aggregation pipeline instead‼️
```

---

## 9. Message Queues / RabbitMQ Questions

### Message Queue Basics — What They Are and How They Work

// THE BASIC CONCEPT:
// Instead of Service A calling Service B directly (HTTP),
// Service A puts a message in a QUEUE, and Service B picks it up later.
//
// Direct call (without queue):
// Service A ──HTTP POST──> Service B
// Problem: if Service B is down, the request FAILS and data is LOST
//
// With queue:
// Service A ──> [RabbitMQ/Kafka] ──> Service B
// If Service B is down, messages WAIT in the queue until B comes back
// No data loss, no failed requests

// THE 3 PLAYERS:
//
// 1. PRODUCER (sender) — any service that CREATES a message
// e.g., Bet Service says "a bet was placed"
// It's just a regular Node.js/NestJS app that connects to the broker and sends messages
//
// 2. BROKER (the queue itself) — RabbitMQ or Kafka SERVER
// Holds messages in memory/disk until consumers pick them up
// Runs on its OWN separate server (or cluster of servers)
// Think of it like a post office — it stores mail until someone picks it up
//
// 3. CONSUMER (receiver) — any service that READS and processes messages
// e.g., Notification Service reads "bet was placed" → sends a push notification
// Also a regular Node.js/NestJS app — it connects to the broker and LISTENS for messages

// WHERE DOES EACH PIECE RUN?
//
// In production, each is a SEPARATE server/container:
//
// Server 1: Bet Service (Producer) — Node.js app (your code)
// Server 2: RabbitMQ Broker — RabbitMQ server (or managed: AWS MQ, CloudAMQP)
// Server 3: Notification Service (Consumer) — Node.js app (your code)
// Server 4: Analytics Service (Consumer) — Node.js app (your code)
//
// The broker is NOT your code — it's a separate software you install/host‼️
// Like how MySQL is a separate server your app connects to, RabbitMQ is the same idea

// HOW DO SERVICES CONNECT TO THE BROKER?
//
// Via a connection string over the network (just like a database URL):‼️
//
// RabbitMQ: amqp://username:password@rabbitmq-server:5672
// Kafka: kafka-server:9092
//
// In NestJS, you configure it in your module:

```typescript
// Producer — Bet Service (sends messages)
@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'RABBITMQ_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: ['amqp://user:pass@rabbitmq-server:5672'], // connection to broker
                    queue: 'bets_queue', // which queue to send to
                },
            },
        ]),
    ],
})
export class BetModule {}

// Sending a message (in any service):
@Injectable()
export class BetService {
    constructor(@Inject('RABBITMQ_SERVICE') private client: ClientProxy) {}

    async placeBet(bet: BetDto) {
        // Save bet to database...

        // Send message to queue — Notification Service will pick this up
        this.client.emit('bet.placed', {
            userId: bet.userId,
            betId: bet.id,
            amount: bet.amount,
        });
        // emit() is fire-and-forget — Bet Service doesn't wait for a response‼️
    }
}
```

```typescript
// Consumer — Notification Service (receives messages)
// This is a SEPARATE Node.js app running on a DIFFERENT server

// main.ts — starts as a microservice (not HTTP server)
const app = await NestFactory.createMicroservice(NotificationModule, {
    transport: Transport.RMQ,
    options: {
        urls: ['amqp://user:pass@rabbitmq-server:5672'], // same broker, same connection
        queue: 'bets_queue', // listens to the SAME queue
    },
});
await app.listen();

// notification.controller.ts — handles incoming messages
@Controller()
export class NotificationController {
    @EventPattern('bet.placed') // listens for messages with this pattern‼️
    async handleBetPlaced(data: { userId: string; betId: string; amount: number }) {
        // This runs automatically when a message arrives in the queue‼️
        console.log(`User ${data.userId} placed a bet for $${data.amount}`);
        await this.sendPushNotification(data.userId, `Bet confirmed: $${data.amount}`);
    }
}
```

// THE FULL PICTURE — how messages flow:
//
// ┌─────────────┐ ┌──────────┐ ┌───────────────────┐
// │ Bet Service │──msg──>│ RabbitMQ │──msg──>│ Notification Svc │
// │ (Producer) │ │ (Broker) │ │ (Consumer) │
// │ Server 1 │ │ Server 2 │ │ Server 3 │
// └─────────────┘ └──────────┘ └───────────────────┘
// │
// │──msg──>┌───────────────────┐
// │ Analytics Service │
// │ (Consumer) │
// │ Server 4 │
// └───────────────────┘
//
// Step 1: User places a bet → Bet Service processes it and saves to DB
// Step 2: Bet Service PUBLISHES a message to RabbitMQ:
// { event: "bet.placed", userId: "u_123", amount: 50 }
// Step 3: RabbitMQ HOLDS the message in the "bets_queue"
// Step 4: Notification Service is SUBSCRIBED to "bets_queue"
// → picks up the message → sends push notification to user
// Step 5: Analytics Service is ALSO subscribed (in Kafka, or via fanout exchange in RabbitMQ)
// → picks up the message → updates dashboards
//
// KEY POINTS:
// - Producer and Consumer are SEPARATE Node.js apps on SEPARATE servers
// - They NEVER talk to each other directly — only through the broker
// - The broker (RabbitMQ/Kafka) is a separate server you don't write — you just connect to it
// - Producer doesn't know (or care) who the consumers are
// - Consumer doesn't know (or care) who the producer is
// - That's what "decoupling" means — services are independent
//
// RABBITMQ vs KAFKA — which is the broker?
// - RabbitMQ: messages are DELETED after consumer processes them (like a to-do list — check off and done)
// - Kafka: messages are KEPT for days/weeks (like a log — you can go back and re-read)
// - Both are just software you install on a server: apt install rabbitmq-server / docker run kafka

### EventEmitter vs Event-Driven Architecture vs Message Brokers — What's the Difference?

// These three things all use "events" and look similar, but they work at COMPLETELY different levels:
//
// ┌────────────────────────────────────────────────────────────────────────────┐
// │ Level 1: EventEmitter (emit/on) │
// │ WHERE: Inside ONE Node.js process (same server, same app) │
// │ HOW: emitter.emit('event') → emitter.on('event', callback) │
// │ SCOPE: In-memory only — if the process crashes, events are lost │
// ├────────────────────────────────────────────────────────────────────────────┤
// │ Level 2: NestJS Event-Driven (@EventPattern / @EventEmitter2) │
// │ WHERE: Inside ONE NestJS app (can be same process or microservice) │
// │ HOW: this.eventEmitter.emit('event') → @OnEvent('event') │
// │ SCOPE: In-memory within one app, OR over network via microservice transport│
// ├────────────────────────────────────────────────────────────────────────────┤
// │ Level 3: Message Broker (RabbitMQ / Kafka) │
// │ WHERE: Between SEPARATE services on SEPARATE servers over network │
// │ HOW: client.emit('event') → @EventPattern('event') │
// │ SCOPE: Persistent — messages survive crashes, restarts, network failures │
// └────────────────────────────────────────────────────────────────────────────┘

// LEVEL 1: EventEmitter (Node.js built-in)
// This is the SIMPLEST form — just callbacks within one app

```typescript
// Everything happens inside ONE process, ONE server
import { EventEmitter } from 'events';

const emitter = new EventEmitter();

// Register a listener (subscriber)
emitter.on('userSignedUp', user => {
    console.log(`Send welcome email to ${user.email}`);
});

emitter.on('userSignedUp', user => {
    console.log(`Create default settings for ${user.id}`);
});

// Fire the event (publisher)
emitter.emit('userSignedUp', { id: 1, email: 'alice@example.com' });
// Both listeners run immediately, in the same process

// LIMITATIONS:
// - Only works within ONE Node.js process‼️
// - If the process crashes, all listeners and pending events are GONE
// - Cannot communicate between different servers
// - No retry, no persistence, no guaranteed delivery
```

// LEVEL 2: NestJS EventEmitter2 (in-app events)
// A nicer version of Level 1, integrated with NestJS dependency injection

```typescript
// Still inside ONE NestJS app, but uses decorators and DI

// Sending an event (in a service):
@Injectable()
export class UserService {
    constructor(private eventEmitter: EventEmitter2) {}

    async createUser(dto: CreateUserDto) {
        const user = await this.userRepo.save(dto);

        // Fire event — other parts of THIS app can listen
        this.eventEmitter.emit('user.created', user);

        return user;
    }
}

// Listening for the event (in another service, SAME app):
@Injectable()
export class NotificationService {
    @OnEvent('user.created') // NestJS decorator — auto-registers listener
    handleUserCreated(user: User) {
        // Send welcome email
        // This runs in the SAME process as UserService
    }
}

// USE CASE: When you want different parts of your app to react to events
// WITHOUT them directly importing each other (loose coupling within one app)‼️
// Example: UserService doesn't import NotificationService — they communicate via events
```

// LEVEL 3: Message Broker (RabbitMQ / Kafka)
// For communication BETWEEN separate apps on separate servers

```typescript
// Producer (Bet Service — Server 1):
this.client.emit('bet.placed', { userId: 'u_123', amount: 50 });
// This sends the message OVER THE NETWORK to RabbitMQ (Server 2)

// Consumer (Notification Service — Server 3):
@EventPattern('bet.placed')
handleBetPlaced(data: any) {
    // This receives the message FROM RabbitMQ
    // Running on a completely different server
}

// KEY DIFFERENCES from Level 1 and 2:‼️
// - Messages travel over the NETWORK (not in-memory)
// - Messages are PERSISTED to disk — survive crashes and restarts
// - Built-in RETRY — if consumer fails, message goes back to queue
// - Multiple consumers can process messages in PARALLEL
// - Works across different programming languages (not just Node.js)
```

// WHEN TO USE WHICH:
//
// EventEmitter (emit/on):
// → Simple in-process pub/sub
// → Streams (readable.on('data')), HTTP server (server.on('request'))
// → Quick and easy, no setup needed
// → Example: custom event handling within one module
//
// NestJS EventEmitter2 (@OnEvent):
// → Decoupling within ONE NestJS app
// → When UserModule wants to notify NotificationModule without importing it
// → Still in-memory, still one process
// → Example: after creating a user, fire 'user.created' for email + analytics
//
// Message Broker (RabbitMQ/Kafka):
// → Communication between SEPARATE services/servers
// → When you need guaranteed delivery, persistence, retry
// → When services are written in different languages or deployed independently
// → Example: Bet Service → RabbitMQ → Notification Service + Analytics Service
//
// SIMPLE RULE:
// Same function? → just call it directly
// Same app? → EventEmitter or @OnEvent
// Different servers? → Message Broker (RabbitMQ/Kafka)

### Event-Driven Architecture (EDA) — The Big Picture

// Event-Driven Architecture is NOT a tool — it's a DESIGN PATTERN for your whole system.
// It means: "when something happens, broadcast it, and let any interested service react."
//
// The OPPOSITE is "request-driven" (traditional REST):
//
// REQUEST-DRIVEN (traditional):
// User places bet → Bet Service calls Wallet Service (HTTP)
// → Bet Service calls Notification Service (HTTP)
// → Bet Service calls Analytics Service (HTTP)
// → Bet Service calls Risk Service (HTTP)
//
// Problem: Bet Service must KNOW about every other service
// Problem: If you add a new service (Compliance), you must change Bet Service code
// Problem: If Notification Service is slow, Bet Service waits (blocking)
// Problem: If any call fails, the whole chain might fail
//
// EVENT-DRIVEN:
// User places bet → Bet Service publishes event: "bet.placed"
// → That's it. Bet Service is DONE.
//
// Meanwhile, independently:
// Wallet Service sees "bet.placed" → deducts balance
// Notification Service sees "bet.placed" → sends push notification
// Analytics Service sees "bet.placed" → updates dashboard
// Risk Service sees "bet.placed" → checks for fraud
//
// If you add Compliance Service later → it just subscribes to "bet.placed"
// NO changes to Bet Service needed!

// REAL iGaming EXAMPLE — Event Chain Reaction:
//
// ONE user action ("place a bet") triggers a CHAIN of events across the whole platform:
//
// User clicks "Place Bet"
// │
// ▼
// ┌─────────────┐
// │ Bet Service │──publishes──> "bet.placed"
// └─────────────┘ │
// ┌────────────────┼────────────────┬──────────────────┐
// ▼ ▼ ▼ ▼
// ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐
// │ Wallet Svc │ │ Notification │ │ Risk Svc │ │ Analytics │
// │ │ │ Service │ │ │ │ Service │
// └─────┬──────┘ └──────────────┘ └─────┬──────┘ └──────────────┘
// │ │
// ▼ ▼
// "balance.deducted" "risk.checked"
// │ │
// ┌─────┴──────┐ ┌─────┴──────┐
// │ Audit Svc │ │ Compliance │
// │ │ │ Service │
// └────────────┘ └────────────┘
//
// Notice: events TRIGGER other events → that's the "chain reaction"‼️
// - "bet.placed" triggers Wallet Service
// - Wallet Service deducts balance and publishes "balance.deducted"
// - "balance.deducted" triggers Audit Service to log the transaction
// - Meanwhile, Risk Service checks for fraud and publishes "risk.checked"
// - "risk.checked" triggers Compliance Service
//
// Each service only knows about EVENTS, not about other services.‼️
// Each service does ONE thing and publishes what happened.‼️

// HOW IS THIS IMPLEMENTED? With a Message Broker (RabbitMQ or Kafka)!
//
// The broker is the "event bus" — the highway that all events travel on:
//
// Service A ──publishes event──> [RabbitMQ/Kafka] ──delivers──> Service B, C, D
//
// So Event-Driven Architecture = the DESIGN PATTERN
// RabbitMQ/Kafka = the TOOL that makes it work
// EventEmitter = a mini in-memory version of the same idea (within one app)

// EVENT-DRIVEN vs REQUEST-DRIVEN — COMPARISON:
//
// | Aspect | Request-Driven (REST) | Event-Driven (EDA) |
// |------------------|------------------------------------|-----------------------------------------|
// | Communication | Service A calls Service B directly | Service A publishes, anyone can listen |
// | Coupling | Tight — A must know about B | Loose — A doesn't know who listens |
// | Adding services | Change the caller's code | New service just subscribes, no changes |
// | Failure handling | If B is down, A fails | If B is down, message waits in queue |
// | Speed | Synchronous — A waits for B | Asynchronous — A continues immediately |
// | Complexity | Simple to understand | Harder to debug (events are invisible)‼️ |
// | Tracing | Easy — follow the HTTP calls | Need distributed tracing (OpenTelemetry)‼️|
//
// WHEN TO USE EVENT-DRIVEN:
// - Multiple services need to react to the same action
// - You don't want services to depend on each other
// - Actions can happen asynchronously (user doesn't need to wait)
// - You expect to add more services/reactions in the future
//
// WHEN TO STICK WITH REST:
// - Simple request/response (user asks for data, you return it)
// - User needs an immediate answer (e.g., "is my password correct?")
// - Only two services involved, no chain reactions needed
//
// IN PRACTICE — most systems use BOTH:
// - REST for reads (GET /users, GET /bets) — user needs data NOW‼️
// - Events for writes/side effects (bet placed → notify + audit + analytics) — fire and forget

// AWS EVENT-DRIVEN — SAME PATTERN, MANAGED BY AWS:
//
// Self-hosted (what Soft2Bet/BrainRocket likely uses):
// Bet Service ──> RabbitMQ ──> Notification Service
// (your code) (your server) (your code)
//
// AWS managed version (same pattern, AWS runs the infrastructure):
// S3 upload ──> Lambda ──> SNS ──> Lambda ──> DynamoDB
// (AWS) (your code) (AWS) (your code) (AWS)
//
// The tools map 1-to-1:
// | Self-Hosted | AWS Managed Equivalent | What it does |
// |----------------------|---------------------------|----------------------------------|
// | RabbitMQ | SQS (Simple Queue Service)| Message queue — one consumer |
// | Kafka / Fanout | SNS (Simple Notification) | Pub/Sub — broadcast to many |
// | RabbitMQ + Kafka | EventBridge‼️ | Event bus — route events by rules|
// | Your Node.js app | Lambda | Your code that runs on an event |
// | Your MongoDB/MySQL | DynamoDB / RDS | Database |
// | Your Cron Jobs | CloudWatch Events‼️ | Scheduled triggers |
//
// AWS Lambda Example — same chain reaction pattern:
//
// User uploads profile photo to S3
// │
// ▼ (S3 triggers Lambda automatically — YOU don't poll, AWS calls your function)
// ┌──────────────┐
// │ Lambda: │──publishes──> SNS topic: "photo.uploaded"
// │ Resize Image │ │
// └──────────────┘ ┌─────────────┼─────────────┐
// ▼ ▼ ▼
// ┌────────────┐ ┌──────────┐ ┌────────────┐
// │ Lambda: │ │ Lambda: │ │ Lambda: │
// │ Update DB │ │ Send │ │ Moderate │
// │ with URL │ │ Email │ │ Content │
// └────────────┘ └──────────┘ └────────────┘
//
// Same as:
// User places bet → Bet Service → RabbitMQ → Notification + Analytics + Risk
//
// The difference is WHO MANAGES THE SERVERS:
// - Self-hosted: you install RabbitMQ, you run Node.js consumers, you handle scaling
// - AWS: AWS runs SQS/SNS, AWS runs your Lambda code, AWS auto-scales
// You only write the function code — no servers to manage (that's "serverless")
//
// WHY COMPANIES CHOOSE ONE OVER THE OTHER:
// - AWS Lambda/SNS/SQS: faster to set up, auto-scales, pay per use, no servers to maintain
// Good for: startups, variable traffic, teams without dedicated DevOps
// - Self-hosted RabbitMQ/Kafka: more control, lower cost at high scale, no vendor lock-in
// Good for: iGaming (compliance — some regulators require data on your own servers),
// high-throughput systems, teams with DevOps expertise
//
// AWS EVENTBRIDGE — Smart Event Router:
//
// Regular SNS: "broadcast this event to everyone subscribed" (all or nothing)
// EventBridge: "route this event ONLY to services that match specific RULES"
//
// Example: you only want to trigger the Fraud Lambda when bet amount > $1000
// EventBridge rule:
// {
// "source": ["bet-service"],
// "detail-type": ["bet.placed"],
// "detail": { "amount": [{ "numeric": [">", 1000] }] }
// }
// → Only high-value bets get routed to Fraud Lambda
// → Small bets skip it entirely
// → SNS can't do this — it broadcasts everything to everyone‼️
//
// Self-hosted equivalent: RabbitMQ topic exchange with routing keys
// e.g., routing key "bet.placed.high" vs "bet.placed.low"
// But EventBridge rules are much more powerful — you can filter on any field in the event body
//
// EventBridge also connects to 100+ AWS services as event sources:
// - S3 file uploaded → event
// - EC2 instance stopped → event
// - RDS database snapshot completed → event
// - Your custom app → event
// All routed through ONE event bus with filtering rules
//
// AWS STEP FUNCTIONS — Saga Orchestrator:
//
// Event-driven (SNS/SQS/EventBridge) = fire and forget, no coordination
// "bet.placed" → services react independently, nobody manages the order
//
// Step Functions = managed WORKFLOW, you CONTROL the order and handle failures‼️
// Step 1: Deduct balance → if success →
// Step 2: Create bet record → if success →
// Step 3: Notify user → DONE
// If Step 2 fails → compensate Step 1 (refund balance)
//
// This is EXACTLY the Saga pattern from our financial consistency section!
// Self-hosted: you write BetPlacementSaga class yourself (see Section 10)
// AWS: Step Functions does it for you with a visual workflow editor
//
// Step Functions workflow (JSON definition):
// {
// "StartAt": "DeductBalance",
// "States": {
// "DeductBalance": {
// "Type": "Task",
// "Resource": "arn:aws:lambda:us-east-1:123:function:deduct-balance",
// "Next": "CreateBet",
// "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "RefundBalance" }]
// },
// "CreateBet": {
// "Type": "Task",
// "Resource": "arn:aws:lambda:us-east-1:123:function:create-bet",
// "Next": "NotifyUser",
// "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "CancelAndRefund" }]
// },
// "NotifyUser": {
// "Type": "Task",
// "Resource": "arn:aws:lambda:us-east-1:123:function:notify-user",
// "End": true
// },
// "CancelAndRefund": {
// "Type": "Task",
// "Resource": "arn:aws:lambda:us-east-1:123:function:cancel-and-refund",
// "End": true
// },
// "RefundBalance": {
// "Type": "Task",
// "Resource": "arn:aws:lambda:us-east-1:123:function:refund-balance",
// "End": true
// }
// }
// }
//
// WHEN TO USE EVENTS vs STEP FUNCTIONS:
// - Events (SNS/SQS/EventBridge): independent reactions, order doesn't matter‼️
// "bet placed → notify user" (notification doesn't depend on analytics)
// - Step Functions: sequential steps where order MATTERS and failures need compensation‼️
// "deduct balance → create bet → notify" (must deduct BEFORE creating the bet)
//
// FULL PICTURE — all AWS event-driven tools:
//
// | Tool | Self-Hosted Equivalent | Purpose |
// |-----------------|-------------------------------|----------------------------------------|
// | SQS | RabbitMQ queue | Point-to-point message queue |
// | SNS | RabbitMQ fanout exchange | Broadcast to multiple subscribers |
// | EventBridge | RabbitMQ topic exchange | Smart routing with filtering rules |
// | Step Functions | Saga Orchestrator (your code) | Multi-step workflows with compensation |
// | Lambda | Your Node.js consumer service | Code that runs when an event arrives |

// WHAT TO SAY IN AN INTERVIEW:
// "I'd design the platform using event-driven architecture for all state changes —
// when a bet is placed, a deposit is made, or a game result arrives, the originating
// service publishes an event to RabbitMQ or Kafka. Other services — notifications,
// analytics, compliance, audit — subscribe to the events they care about.
// This keeps services decoupled: if we add a new fraud detection service next month,
// it just subscribes to 'bet.placed' events — no changes to the Bet Service.
// For synchronous queries like 'get user balance' or 'list active bets',
// I'd still use REST APIs.
// This is the same pattern as AWS Lambda + SNS/SQS — event triggers function triggers
// more events — but self-hosted with RabbitMQ gives us more control for iGaming compliance."

---

**Q: Why use a message queue instead of direct HTTP calls between services?**

> - **Decoupling:** Services don't need to know about each other
> - **Resilience:** Messages persist if a consumer is down — processing resumes when it recovers
> - **Load leveling:** Buffer traffic spikes instead of overwhelming downstream services
> - **Guaranteed delivery:** At-least-once or exactly-once semantics‼️
> - In iGaming: bet placement -> payment processing -> notification can all be async via queues

**Q: RabbitMQ exchange types and when to use each?**‼️

> - **Direct:** ‼️ Routes to queues matching exact routing key. Use for specific task routing.
> - **Fanout:** ‼️ Broadcasts to all bound queues. Use for notifications (all services need to know about an event).
> - **Topic:** ‼️ Pattern-based routing (`bet.placed.*`, `user.#`). ‼️ Use for event-driven architectures with multiple consumers interested in different event subsets.
> - **Headers:** Routes based on message headers. Rarely used.

**Q: How do you handle failed messages in RabbitMQ?**

> - **Dead Letter Exchanges (DLX):** Route failed/rejected messages to a DLX for inspection and retry‼️
> - **Retry with backoff:** Re-queue with increasing delays (use message headers to track retry count)‼️
> - **Poison message handling:** After N retries, move to a dead letter queue for manual inspection
> - **Idempotency:** Design consumers to handle duplicate messages safely (idempotency keys)

**Q: RabbitMQ vs Kafka — when do you use which? (ASKED IN BRAINROCKET INTERVIEW)**

> This was a specific question in a May 2026 BrainRocket Senior Backend Developer interview.🅰️‼️
>
> |                       | RabbitMQ                                         | Kafka                                                                                |
> | --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ | --- |
> | **Model**             | Message broker (smart broker, dumb consumers)    | Distributed log (dumb broker, smart consumers)                                       |
> | **Message lifecycle** | Messages are deleted after consumer acknowledges | Messages are retained for a configurable period (days/weeks) — consumers can re-read |
> | **Ordering**          | Per-queue ordering                               | Per-partition ordering (stronger guarantees) ‼️                                      | >   |
> | **Throughput**        | ~10K–50K msgs/sec                                | ~100K–1M+ msgs/sec                                                                   |
> | **Delivery**          | Push-based — broker pushes to consumers          | Pull-based — consumers pull at their own pace                                        |
> | **Use case**          | Task queues, RPC, complex routing (exchanges)    | Event streaming, event sourcing, real-time analytics, log aggregation                |
> | **Replay**            | No — once consumed, message is gone              | Yes — consumers can replay from any offset                                           |
> | **Complexity**        | Simpler to set up and operate                    | More complex — needs ZooKeeper/KRaft, partition management                           |
>
> // Ordering = are messages guaranteed to arrive in the order they were sent?
> // Producer sends: Message 1, Message 2, Message 3
> //
> // RabbitMQ — per-queue ordering:
> // ONE queue → messages come out in order: 1, 2, 3 ✅
> // But with MULTIPLE queues or competing consumers, order is NOT guaranteed
> // Consumer A gets msg 1, Consumer B gets msg 2 — B might finish first
> //
> // Kafka — per-partition ordering (stronger):
> // Each partition guarantees strict order: 1, 2, 3 ✅
> // You control which messages go to which partition using a key
> // e.g., key = userId → all messages for same user go to same partition
> // → that user's events are always processed in order
> //
> // WHY it matters in iGaming:
> // Bet placed → Bet accepted → Bet settled — must happen IN ORDER
> // If "settled" arrives before "accepted", your system breaks
> //
> // WHAT IS A PARTITION?
> // Partition = a way Kafka splits one topic (queue) into multiple parallel lanes
> // Think of it like a highway:
> // RabbitMQ queue = single lane road → messages go one at a time
> // Kafka topic with 4 partitions = 4-lane highway → 4x throughput
> //
> // Kafka Topic: "bets"
> // Partition 0: [bet_A1, bet_A2, bet_A3] ← all from User A
> // Partition 1: [bet_B1, bet_B2] ← all from User B
> // Partition 2: [bet_C1, bet_C2, bet_C3] ← all from User C
> // Partition 3: [bet_D1] ← all from User D
> //
> // HOW messages get assigned to partitions:
> // Kafka uses a "partition key" — you choose what it is:
> // key = userId → hash(userId) % numPartitions = partition number
> // User "u_123" → hash("u_123") % 4 = 2 → always goes to Partition 2
> // User "u_456" → hash("u_456") % 4 = 0 → always goes to Partition 0
> //
> // WHY this matters:
> // 1. Within ONE partition → order is guaranteed (bet_A1 before bet_A2 before bet_A3)
> // 2. Across partitions → NO order guarantee (bet_A1 might process after bet_B1)
> // 3. Each partition can have its OWN consumer → parallel processing → high throughput
> // That's why Kafka does 100K-1M+ msgs/sec vs RabbitMQ's 10K-50K
> // More partitions = more parallelism = more throughput
>
> **When to use RabbitMQ:**
>
> - Traditional task/work queues (process a bet, send an email, resize an image)
> - Complex routing needs (direct, fanout, topic, headers exchanges)
> - Request-reply (RPC) patterns‼️
> - When you need per-message acknowledgment and redelivery‼️
> - Lower volume, higher reliability per message
>
> **When to use Kafka:**
>
> - High-throughput event streaming (millions of events/sec)
> - Event sourcing — need to replay history (audit trails in iGaming)
> - Real-time analytics pipelines (tracking user behavior, live odds feeds)
> - Multiple consumers need to independently read the same events‼️
> - Log aggregation across microservices
>
> **In iGaming context (what to say in the interview):**‼️
> "For a platform like Soft2Bet's, I'd use RabbitMQ for transactional workflows — bet placement, payment processing, notification delivery — ‼️ where each message needs reliable processing and acknowledgment. ‼️ I'd use Kafka for the event streaming side — live odds feeds, user activity tracking, and audit logs — ‼️ where we need high throughput, event replay for compliance, and multiple consumers reading the same stream independently."

---

## 10. System Design Questions (iGaming Context)

**Q: Design a real-time betting/odds system.**

> Key components:
>
> - **WebSocket Gateway** — pushes live odds updates to clients‼️
> - **Odds Engine Service** — calculates odds based on external feeds and internal models‼️
> - **Redis Pub/Sub** — distributes odds changes across all WebSocket server instances
> - **Rate limiting** — prevent abuse on bet placement endpoints
> - **Event sourcing** — every odds change is an immutable event for audit trail
> - **CQRS** — separate read model (fast odds queries) from write model (bet placement)
>
> Scale considerations: Spike traffic during popular live events (Super Bowl, World Cup). Use auto-scaling groups, pre-warm instances before known events, Redis cluster for cache layer.

**Detailed Design — Real-Time Betting/Odds System:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HIGH-LEVEL ARCHITECTURE                       │
│                                                                      │
│  External Odds      ┌──────────┐     ┌──────────────┐              │
│  Feeds (3rd party)──>│ Odds     │────>│ Redis Cluster │              │
│                      │ Ingestion│     │ (Pub/Sub +    │              │
│                      │ Service  │     │  Cache)       │              │
│                      └──────────┘     └──────┬───────┘              │
│                                              │                       │
│                      ┌──────────┐     ┌──────▼───────┐              │
│  Client (Browser) <──│ WebSocket│<────│ Odds Engine  │              │
│  via WebSocket       │ Gateway  │     │ Service      │              │
│                      │ (NestJS) │     └──────────────┘              │
│                      └──────────┘                                    │
│                                                                      │
│  Client (Browser) ──>┌──────────┐     ┌──────────────┐              │
│  POST /bets          │ Bet      │────>│ MySQL (ACID) │              │
│                      │ Placement│     │ balances +   │              │
│                      │ Service  │     │ bet records  │              │
│                      └────┬─────┘     └──────────────┘              │
│                           │                                          │
│                      ┌────▼─────┐     ┌──────────────┐              │
│                      │ RabbitMQ │────>│ Settlement   │              │
│                      │ (queues) │     │ Service      │              │
│                      └──────────┘     └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

// COMPONENT 1: Odds Ingestion Service
// - Connects to external odds providers via WebSocket/REST feeds
// - Receives raw odds data (e.g., "Team A: 1.85, Team B: 2.10, Draw: 3.40")
// - Normalizes data from multiple providers into a unified format
// - Publishes normalized odds to Redis Pub/Sub channel "odds:updates"
// - Stores every odds change as an immutable event in an event store (Kafka or append-only DB table)
// WHY event sourcing? Regulatory requirement — auditors need to see every odds change with timestamp

// COMPONENT 2: Odds Engine Service
// - Subscribes to Redis Pub/Sub "odds:updates" channel
// - Applies internal business rules:
// - Margin calculation (the house edge)
// - Liability limits (if too many bets on one side, adjust odds)
// - Suspension rules (auto-suspend market if odds change too fast — possible match fixing)
// - Writes final calculated odds to Redis cache (key: "odds:match:{matchId}")
// - Publishes to Redis Pub/Sub "odds:final" for WebSocket servers to pick up

// COMPONENT 3: WebSocket Gateway (NestJS)
// - Client connects via WebSocket and subscribes to specific matches:
// ws.send({ event: "subscribe", data: { matchIds: ["match_123", "match_456"] } })
// - Server subscribes to Redis Pub/Sub "odds:final"
// - When new odds arrive, pushes ONLY to clients subscribed to that match
// - Heartbeat every 30s to detect dead connections
// - Multiple WebSocket server instances behind a load balancer
// WHY Redis Pub/Sub? If client connects to Server A, but odds update hits Server B,
// Redis Pub/Sub ensures Server B publishes and Server A receives and forwards to client

```typescript
// NestJS WebSocket Gateway example:
@WebSocketGateway({ cors: true })
export class OddsGateway implements OnGatewayConnection, OnGatewayDisconnection {
    @WebSocketServer() server: Server;

    // Track which clients are subscribed to which matches
    private subscriptions = new Map<string, Set<string>>(); // matchId -> Set<clientId>

    handleConnection(client: Socket) {
        // Client connected — wait for subscribe events
    }

    @SubscribeMessage('subscribe')
    handleSubscribe(client: Socket, payload: { matchIds: string[] }) {
        for (const matchId of payload.matchIds) {
            if (!this.subscriptions.has(matchId)) {
                this.subscriptions.set(matchId, new Set());
            }
            this.subscriptions.get(matchId).add(client.id);
        }
    }

    // Called when Redis Pub/Sub receives new odds
    broadcastOddsUpdate(matchId: string, odds: OddsData) {
        const subscribers = this.subscriptions.get(matchId);
        if (subscribers) {
            for (const clientId of subscribers) {
                this.server.to(clientId).emit('oddsUpdate', { matchId, odds });
            }
        }
    }
}
```

// COMPONENT 4: Bet Placement Service
// - REST API: POST /bets { matchId, selection, amount, oddsAtPlacement }
// - Flow:
// 1. Validate request (user authenticated, amount > 0, market is open)
// 2. CHECK current odds in Redis — if odds changed since client saw them:
// - If change is within tolerance (e.g., < 5%), accept at new odds
// - If change is large, reject and tell client "odds have changed, please review"
// 3. START MySQL transaction:
// a. Lock user's balance row (SELECT ... FOR UPDATE)
// b. Check balance >= bet amount
// c. Deduct balance
// d. Insert bet record with status "PENDING"
// e. COMMIT
// 4. Publish bet event to RabbitMQ queue "bets:placed"
// 5. Return bet confirmation to client
//
// WHY MySQL transaction with row locking?
// - Prevents double-spending (two bets at the same time exceeding balance)
// - ACID guarantees: balance deduction and bet creation are atomic
//
// WHY idempotency token?
// - Client sends a unique betId with each request
// - If network fails and client retries, same betId won't create duplicate bets

// COMPONENT 5: Settlement Service
// - Listens to match result events (from external feed or admin panel)
// - Queries all bets for that match from MySQL
// - For each winning bet:
// a. Calculate payout = amount \* odds
// b. Credit user's balance in a transaction
// c. Update bet status to "WON"
// - For losing bets: Update status to "LOST"
// - Publish settlement events for downstream (notifications, analytics)

// SCALING FOR LIVE EVENTS (Super Bowl, World Cup):
// - Pre-warm: Spin up extra WebSocket + Bet Placement instances 1 hour before kickoff
// - Redis Cluster: 3+ nodes with read replicas for odds cache reads
// - Connection limits: Each WebSocket server handles ~50K connections
// For 500K concurrent users → 10 WebSocket instances behind ALB
// - Circuit breaker: If odds feed goes down, suspend all markets rather than serving stale odds
// - Auto-scaling: CPU/connection-based scaling policies on ECS/Kubernetes

// DATABASE SCHEMA (simplified):
// bets table:
// id (UUID), user_id, match_id, selection, amount, odds_at_placement,
// potential_payout, status (PENDING/WON/LOST/CANCELLED/VOID),
// idempotency_key (UNIQUE), created_at, settled_at
//
// user_balances table:
// user_id (PK), balance (DECIMAL), version (INT for optimistic locking), updated_at
//
// odds_events table (event sourcing):
// id, match_id, market_type, odds_data (JSON), source, timestamp
// — append-only, never updated or deleted‼️

**Q: Design a notification system for a gaming platform.**

> - **Event-driven architecture:** Game events -> RabbitMQ -> Notification Service
> - **Multi-channel:** Push notifications, email, SMS, in-app
> - **User preferences:** Per-user channel preferences stored in MongoDB
> - **Template engine:** Handlebars/Mustache for dynamic notification content
> - **Deduplication:** Idempotency keys prevent sending the same notification twice
> - **Priority queues:** Urgent notifications (withdrawal confirmed) vs marketing (new game available)

**Detailed Design — Gaming Platform Notification System:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HIGH-LEVEL ARCHITECTURE                       │
│                                                                      │
│  Game Events ──────>┌──────────┐                                    │
│  Bet Settled ──────>│ RabbitMQ │                                    │
│  Payment Done ─────>│ Exchange │                                    │
│  Admin Trigger ────>│ (topic)  │                                    │
│                      └────┬─────┘                                    │
│                           │                                          │
│              ┌────────────┼────────────┐                            │
│              │            │            │                              │
│         ┌────▼───┐  ┌────▼───┐  ┌────▼───┐                        │
│         │Priority │  │Priority │  │Priority │                        │
│         │HIGH     │  │MEDIUM  │  │LOW     │                        │
│         │Queue    │  │Queue   │  │Queue   │                        │
│         └────┬────┘  └────┬───┘  └────┬───┘                        │
│              │            │           │                               │
│              └────────────┼───────────┘                              │
│                           │                                          │
│                    ┌──────▼──────┐                                   │
│                    │ Notification │                                   │
│                    │ Orchestrator │                                   │
│                    └──────┬──────┘                                   │
│                           │                                          │
│            ┌──────────────┼──────────────┐                          │
│            │              │              │                            │
│       ┌────▼───┐    ┌────▼───┐    ┌────▼───┐    ┌─────────┐       │
│       │ Push   │    │ Email  │    │ SMS    │    │ In-App  │        │
│       │ Service│    │ Service│    │ Service│    │ Service │        │
│       │(FCM/   │    │(SES/   │    │(Twilio)│    │(WebSocket│       │
│       │ APNs)  │    │Mailgun)│    │        │    │ + DB)   │        │
│       └────────┘    └────────┘    └────────┘    └─────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

// HOW IT WORKS END-TO-END:
//
// Step 1: An event happens somewhere in the platform
// - A bet settles (user won $500)
// - A withdrawal is approved
// - A new promotion launches
// - A user's KYC verification completes
// KYC = Know Your Customer — a legal/regulatory requirement in iGaming (and banking/finance)
// The platform must verify a user's identity before allowing deposits, withdrawals, or real-money gambling
// Typical flow:
// 1. User signs up
// 2. Platform asks for: government ID (passport/driver's license), proof of address, sometimes a selfie
// 3. User uploads documents
// 4. Platform verifies (manually or via automated service like Jumio/Onfido)
// 5. Status: SUBMITTED → UNDER_REVIEW → APPROVED or REJECTED
// WHY it matters: legal requirement — platforms like Soft2Bet operate in regulated markets (EU, NJ)
// and must verify users to prevent money laundering, underage gambling, and fraud
//
// Step 2: The originating service publishes an event to RabbitMQ
// { event: "bet.settled", userId: "u_123", data: { betId: "b_456", result: "won", payout: 500 } }
//
// Step 3: RabbitMQ routes the event based on type
// - Topic exchange routes "bet.settled" to the notification queue
// - Priority assignment: bet.settled → MEDIUM, withdrawal.approved → HIGH, promo.new → LOW
//
// Step 4: Notification Orchestrator picks up the event and:
// a. Looks up user preferences in MongoDB:
// { userId: "u_123", channels: { push: true, email: true, sms: false, inApp: true } }
// b. Checks notification rules:
// - Is this notification type enabled for this user?
// - Is this within rate limits? (no more than 5 push notifications per hour)
// - Is this a duplicate? (check idempotency key in Redis)
// c. Selects the template and renders it:
// Template: "Congratulations! Your bet on {{matchName}} won {{currency}}{{payout}}!"
// Rendered: "Congratulations! Your bet on Real Madrid vs Barcelona won $500!"
// d. Dispatches to each enabled channel

// COMPONENT DETAILS:

// 1. EVENT PRODUCER (any service in the platform)

```typescript
// Any service can send a notification event — it doesn't need to know about channels or templates
// It just publishes what happened

@Injectable()
export class BetSettlementService {
    constructor(@Inject('RABBITMQ_SERVICE') private rabbitMQ: ClientProxy) {}

    async settleBet(betId: string) {
        // ... settle the bet in the database ...

        // Publish event — notification system handles the rest
        this.rabbitMQ.emit('notification.send', {
            event: 'bet.settled',
            userId: bet.userId,
            priority: 'MEDIUM',
            data: {
                betId: bet.id,
                matchName: bet.matchName,
                result: bet.result,
                payout: bet.payout,
            },
            idempotencyKey: `bet-settled-${bet.id}`, // prevents duplicate notifications
        });
    }
}
```

// 2. NOTIFICATION ORCHESTRATOR (the brain)

```typescript
@Injectable()
export class NotificationOrchestrator {
    constructor(
        private userPrefsService: UserPreferencesService,
        private templateService: TemplateService,
        private deduplicationService: DeduplicationService,
        private rateLimiter: RateLimiterService,
        private pushService: PushNotificationService,
        private emailService: EmailService,
        private smsService: SMSService,
        private inAppService: InAppNotificationService,
    ) {}

    @EventPattern('notification.send')
    async handleNotification(event: NotificationEvent) {
        // Step 1: Deduplicate — have we already processed this?
        const isDuplicate = await this.deduplicationService.check(event.idempotencyKey);
        if (isDuplicate) return; // already sent, skip

        // Step 2: Get user preferences
        const prefs = await this.userPrefsService.getPreferences(event.userId);

        // Step 3: Render the template
        const content = await this.templateService.render(event.event, event.data);
        // content = { title: "Bet Won!", body: "Your bet on Real Madrid vs Barcelona won $500!", ... }

        // Step 4: Dispatch to each enabled channel
        const dispatches = [];

        if (prefs.push && (await this.rateLimiter.allow(event.userId, 'push'))) {
            dispatches.push(this.pushService.send(event.userId, content));
        }
        if (prefs.email) {
            dispatches.push(this.emailService.send(event.userId, content));
        }
        if (prefs.sms && event.priority === 'HIGH') {
            // SMS only for high priority (costs money)
            dispatches.push(this.smsService.send(event.userId, content));
        }
        if (prefs.inApp) {
            dispatches.push(this.inAppService.send(event.userId, content));
        }

        // Step 5: Send all channels in parallel
        const results = await Promise.allSettled(dispatches);

        // Step 6: Log results, retry failures
        for (const result of results) {
            if (result.status === 'rejected') {
                // Push to retry queue with exponential backoff
            }
        }

        // Step 7: Mark as processed (deduplication)
        await this.deduplicationService.markProcessed(event.idempotencyKey);
    }
}
```

// 3. TEMPLATE SERVICE
// - Templates stored in MongoDB or a config file
// - Each event type maps to a template per channel:
// "bet.settled" → {
// push: { title: "Bet Won!", body: "Your bet on {{matchName}} won {{currency}}{{payout}}!" },
// email: { subject: "You won!", htmlTemplate: "bet-won.hbs" },
// sms: { body: "You won {{currency}}{{payout}} on {{matchName}}! Check your account." },
// inApp: { title: "Bet Won!", body: "...", action: { type: "navigate", target: "/bets/{{betId}}" } }
// }
// - Uses Handlebars for rendering: replace {{matchName}} with actual data
// - Supports localization: template per language (en, es, de, etc.)

// 4. PRIORITY QUEUES — WHY THREE?
// HIGH priority: withdrawal approved, account locked, KYC required
// → processed immediately, more worker instances assigned
// MEDIUM priority: bet settled, deposit confirmed, game result
// → processed within seconds, standard workers
// LOW priority: new promotions, weekly summaries, marketing
// → processed during low-traffic periods, rate-limited to avoid spam
//
// In RabbitMQ: use x-max-priority on the queue or separate queues with different consumer counts

// 5. IN-APP NOTIFICATIONS (special case)
// - Stored in database: notifications table (userId, title, body, read, createdAt)
// - Delivered in real-time via WebSocket if user is online
// - Available via REST API for notification history: GET /notifications?unread=true
// - Badge count pushed via WebSocket: { event: "badge", count: 3 }

// 6. DEDUPLICATION & RATE LIMITING
// - Deduplication: Store idempotencyKey in Redis with TTL (e.g., 24 hours)
// Before sending, check: EXISTS idempotency:{key} → if yes, skip
// After sending: SET idempotency:{key} EX 86400
// - Rate limiting: Per-user, per-channel limits in Redis
// Key: ratelimit:{userId}:{channel} → increment, check against threshold
// Example: max 5 push notifications per hour, max 3 emails per day

// 7. FAILURE HANDLING
// - If Push/Email/SMS provider fails → message goes to a dead letter queue (DLQ)
// - Retry with exponential backoff: 1s, 5s, 30s, 5min
// - After max retries (e.g., 5), log failure and alert ops team
// - For critical notifications (withdrawal, account security): fallback to next channel‼️
// Push failed → try SMS → try email → store in-app (guaranteed)

// DATABASE SCHEMA:
// user_preferences (MongoDB):
// { userId, channels: { push: bool, email: bool, sms: bool, inApp: bool },
// quietHours: { start: "22:00", end: "08:00", timezone: "UTC+2" },
// language: "en", unsubscribed: ["marketing"] }
//
// notifications (MySQL/MongoDB):
// id, userId, type, title, body, channel, status (sent/failed/read),
// idempotencyKey, createdAt, readAt
//
// notification_templates (MongoDB):
// eventType, channel, language, template, subject (for email)

**Q: How would you ensure data consistency for financial transactions in a distributed system?**

> - Use MySQL with ACID transactions for the source of truth on balances
> - Implement optimistic locking with version numbers to prevent double-spending
> - Use the Saga pattern for multi-step operations (bet -> deduct balance -> confirm bet)
> - Event sourcing for complete audit trail (regulatory requirement in iGaming)
> - Reconciliation jobs to detect and alert on inconsistencies
> - Idempotency tokens on all mutation endpoints

**Detailed Design — Financial Transaction Consistency in Distributed Systems:**

// THE CORE PROBLEM:
// In a betting platform, a single user action like "place a bet" touches multiple services:
// 1. Wallet Service — deduct $50 from user balance
// 2. Bet Service — create the bet record
// 3. Risk Service — update liability calculations
// 4. Notification Service — confirm the bet
// If step 2 fails after step 1 succeeds, the user loses $50 with no bet.
// You CANNOT use a single database transaction because each service has its own database.

// SOLUTION 1: SAGA PATTERN (Orchestration)
// A Saga is a sequence of local transactions where each step has a compensating action.
// If any step fails, you run the compensating actions in reverse order.

```
Bet Placement Saga — Happy Path:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 1. Wallet │───>│ 2. Bet   │───>│ 3. Risk  │───>│ 4. Notify│
│ Deduct   │    │ Create   │    │ Update   │    │ Confirm  │
│ $50      │    │ record   │    │ exposure │    │ to user  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘

Bet Placement Saga — Step 2 Fails:
┌──────────┐    ┌──────────┐
│ 1. Wallet │───>│ 2. Bet   │ ✗ FAILS
│ Deduct   │    │ Create   │
│ $50      │    │          │
└────┬─────┘    └──────────┘
     │
     │ COMPENSATE: Wallet.refund($50)
     ▼
┌──────────┐
│ 1c. Wallet│
│ Refund   │
│ $50      │
└──────────┘
```

```typescript
// Saga Orchestrator — controls the entire flow
@Injectable()
export class BetPlacementSaga {
    constructor(
        private walletService: WalletServiceClient,
        private betService: BetServiceClient,
        private riskService: RiskServiceClient,
    ) {}

    async execute(command: PlaceBetCommand): Promise<BetResult> {
        const sagaLog = []; // track what succeeded for compensation

        try {
            // Step 1: Deduct balance
            const deduction = await this.walletService.deduct({
                userId: command.userId,
                amount: command.amount,
                idempotencyKey: `deduct-${command.betId}`,
            });
            sagaLog.push({ step: 'wallet.deduct', data: deduction });

            // Step 2: Create bet
            const bet = await this.betService.create({
                betId: command.betId,
                userId: command.userId,
                matchId: command.matchId,
                amount: command.amount,
                odds: command.odds,
            });
            sagaLog.push({ step: 'bet.create', data: bet });

            // Step 3: Update risk exposure
            await this.riskService.updateExposure({
                matchId: command.matchId,
                selection: command.selection,
                amount: command.amount,
            });
            sagaLog.push({ step: 'risk.update' });

            return { success: true, betId: command.betId };
        } catch (error) {
            // COMPENSATE — undo everything in reverse order
            await this.compensate(sagaLog, command);
            throw new BetPlacementFailedException(error.message);
        }
    }

    private async compensate(sagaLog: SagaStep[], command: PlaceBetCommand) {
        // Reverse order compensation
        for (const step of sagaLog.reverse()) {
            switch (step.step) {
                case 'risk.update':
                    await this.riskService.rollbackExposure(/* ... */);
                    break;
                case 'bet.create':
                    await this.betService.cancel(command.betId);
                    break;
                case 'wallet.deduct':
                    await this.walletService.refund({
                        userId: command.userId,
                        amount: command.amount,
                        idempotencyKey: `refund-${command.betId}`,
                    });
                    break;
            }
        }
    }
}
```

// SOLUTION 2: OPTIMISTIC LOCKING (prevents double-spending within one service)
// The wallet service must prevent this scenario:
// - User has $100 balance
// - Two concurrent requests each try to bet $70
// - Without locking, both could succeed → balance goes to -$40

```typescript
// Wallet Service — uses version number to prevent concurrent overwrites
@Injectable()
export class WalletService {
    async deduct(userId: string, amount: number, idempotencyKey: string): Promise<void> {
        // Check idempotency first — was this already processed?
        const existing = await this.idempotencyRepo.findOne({ key: idempotencyKey });
        if (existing) return existing.result; // already done, return cached result

        // Retry loop for optimistic locking conflicts‼️
        for (let attempt = 0; attempt < 3; attempt++) {
            const wallet = await this.walletRepo.findOne({ userId });

            if (wallet.balance < amount) {
                throw new InsufficientFundsError();
            }

            // UPDATE wallets SET balance = balance - $amount, version = version + 1
            // WHERE user_id = $userId AND version = $currentVersion
            const result = await this.walletRepo.update(
                { userId, version: wallet.version }, // WHERE clause includes version
                { balance: wallet.balance - amount, version: wallet.version + 1 },
            );

            if (result.affected === 1) {
                // Success — version matched, no one else modified it
                await this.idempotencyRepo.save({ key: idempotencyKey, result: 'ok' });
                return;
            }
            // result.affected === 0 means someone else changed the row — retry‼️
        }
        throw new ConcurrencyConflictError('Balance was modified concurrently, try again');
    }
}
```

// WHY optimistic locking instead of pessimistic (SELECT ... FOR UPDATE)?
// - Optimistic: reads don't block, conflicts are rare, better throughput for high-traffic‼️
// - Pessimistic: guarantees success but creates lock contention under load‼️
// - For a betting platform with thousands of concurrent bets: optimistic is usually better
// - Exception: for extremely high-volume single users (bot accounts), pessimistic may be safer

// SOLUTION 3: EVENT SOURCING (audit trail for compliance)
// Instead of updating a balance field, store every transaction as an immutable event:

```
events table (append-only, never update or delete):
| id  | user_id | type       | amount | balance_after | metadata          | timestamp           |
|-----|---------|------------|--------|---------------|-------------------|---------------------|
| 1   | u_123   | DEPOSIT    | +100   | 100           | { txId: "..." }   | 2024-01-15 10:00:00 |
| 2   | u_123   | BET_PLACED | -50    | 50            | { betId: "..." }  | 2024-01-15 10:05:00 |
| 3   | u_123   | BET_WON    | +92.50 | 142.50        | { betId: "..." }  | 2024-01-15 11:30:00 |
| 4   | u_123   | WITHDRAWAL | -100   | 42.50         | { txId: "..." }   | 2024-01-15 12:00:00 |
```

// Current balance = sum of all events for that user (or maintained in a materialized view)
// WHY? Regulatory requirement in iGaming — auditors can reconstruct any balance at any point in time
// You can answer: "What was user X's balance at 10:06 on Jan 15?" → $50

// SOLUTION 4: RECONCILIATION (safety net)‼️
// Even with sagas + locking + event sourcing, things can go wrong (network partitions, bugs)
// Run periodic reconciliation jobs:

// Job 1: Balance reconciliation (every hour)
// - Calculate balance from events: SUM(amount) WHERE user_id = X
// - Compare with cached balance in wallets table
// - If mismatch → alert ops team, freeze account if significant

// Job 2: Bet-wallet reconciliation (every hour)
// - For every bet with status PENDING/CONFIRMED, verify a matching wallet deduction event exists
// - For every wallet deduction with bet metadata, verify the bet record exists
// - Orphaned records → alert and investigate

// Job 3: Settlement reconciliation (daily)
// - For every settled bet, verify payout was credited to wallet
// - For every bet.won event, verify matching wallet credit event

// IDEMPOTENCY — WHY IT'S CRITICAL:
// Network failures cause retries. Without idempotency:
// Client sends "place bet $50" → Server processes it, deducts $50
// Response is lost due to network error
// Client retries "place bet $50" → Server processes again, deducts another $50
// User lost $100 instead of $50
//
// With idempotency:
// Client sends "place bet $50" with idempotencyKey: "bet_abc123"
// Server processes it, stores idempotencyKey in Redis/DB
// Response is lost
// Client retries with same idempotencyKey: "bet_abc123"
// Server checks: "bet_abc123" already processed → returns cached result
// User correctly lost only $50

// WHAT TO SAY IN THE INTERVIEW:
// "For financial consistency in a distributed betting platform, I use a layered approach:
// 1. Saga pattern for multi-service transactions with compensation on failure
// 2. Optimistic locking on the wallet to prevent double-spending
// 3. Idempotency keys on every mutation to handle retries safely
// 4. Event sourcing for a complete, immutable audit trail — required for iGaming compliance
// 5. Reconciliation jobs as a safety net to catch any edge cases
// The key principle: design for failure. Assume any step can fail, any message can be duplicated,‼️
// and any service can be temporarily unavailable."

---

## 11. API Design & GraphQL Questions

**Q: REST vs GraphQL — when to use which?**

> - **REST:** Simple CRUD operations, public APIs, caching with HTTP standards, when clients have predictable data needs
> - **GraphQL:** Complex data relationships, mobile clients needing to minimize requests, when different clients need different data shapes
> - In iGaming: REST for admin APIs and simple operations, GraphQL for player-facing dashboards that need flexible data fetching (game history + stats + balance in one query)

**Q: How do you handle N+1 problems in GraphQL?**

> ‼️ Use **DataLoader** — batches and caches database requests within a single request lifecycle. Instead of N individual queries for related data, DataLoader collects all IDs and makes one batched query.

---

## 12. Testing Questions (TDD Focus)

**Q: How do you approach TDD in NestJS?**‼️

> - Write test first, watch it fail, implement minimum code to pass, refactor‼️
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
> - Automated test gates: unit -> integration -> E2E‼️
> - Docker multi-stage builds for small production images‼️
> - Health check endpoints for orchestrator readiness/liveness probes‼️
> - Blue-green or canary deployments for zero-downtime releases

**Q: How do you monitor a Node.js microservices system?**‼️

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
    // That's only 11 requests instead of potentially hundreds!‼️

    const requests: Promise<number>[] = [];‼️

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

    // Step 2: Get all matches where winner was team1 (home) and team2 (away)‼️
    const [homeMatches, awayMatches] = await Promise.all([fetchAllPages(`${BASE}/football_matches?year=${year}&team1=${encodeURIComponent(winner)}`), fetchAllPages(`${BASE}/football_matches?year=${year}&team2=${encodeURIComponent(winner)}`)]);

    // Step 3: Sum goals
    // When winner is team1, their goals are in "team1goals"
    // When winner is team2, their goals are in "team2goals"
    const homeGoals = homeMatches.reduce((sum, match) => sum + parseInt(match.team1goals), 0);‼️
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
// - Using encodeURIComponent for query params with spaces‼️
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
    const id = parseInt(req.params.id);‼️
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

    const deleted = todos.splice(todoIndex, 1)[0];‼️
    // 200 with the deleted item, or 204 No Content — both are acceptable‼️
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
    // offset/limit style (HackerRank typically uses this)‼️
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    // Slice the array — this is the core logic‼️
    const paginatedData = products.slice(offset, offset + limit);

    // Return with metadata so the client knows about total and pagination state‼️
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
// 1. Default values for missing params (don't crash on undefined)‼️
// 2. Input validation (non-negative offset, positive limit)
// 3. Upper bound on limit (prevent client requesting 1 million items)‼️
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
// Space complexity: O(min(n, m)) where m is the size of the character set‼️

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
// - Add a "tail" pointer for O(1) insert at end‼️
// - Use a doubly linked list for O(1) delete if you have a reference to the node‼️
// - Use a hash map alongside for O(1) search (like LRU cache)‼️
```

---

## 17B. Additional Real Interview Problems (HackerRank / Backend OAs)

// These problems are reported from real HackerRank assessments and backend developer interviews
// at BrainRocket, Soft2Bet, and similar companies. Sources: Glassdoor, LeetCode Discuss, GitHub.
// Problems 1-6 above are already confirmed from BrainRocket interviews.
// These additional problems come from HackerRank REST API certifications and backend OAs
// that use the same jsonmock API infrastructure and Express.js patterns.

---

### Problem 7: Movie Search API — Paginated Search with Sorting

```typescript
// Given: A REST API at https://jsonmock.hackerrank.com/api/movies/search/?Title=substr
// Response: { page, per_page, total, total_pages, data: [{ Title, Year, imdbID }] }
// Task: Given a search substring, return ALL matching movie titles sorted alphabetically
// Must handle pagination — fetch ALL pages, not just the first one
// Source: HackerRank REST API Certification, reported by multiple backend candidates

async function getMovieTitles(substr: string): Promise<string[]> {
    // encodeURIComponent converts special characters into URL-safe format‼️
    // URLs can only contain certain characters. Spaces, &, =, ?, etc. break URLs.
    // encodeURIComponent replaces them with % codes:
    //   encodeURIComponent("Real Madrid")  → "Real%20Madrid"      // space → %20
    //   encodeURIComponent("Tom & Jerry")  → "Tom%20%26%20Jerry"  // & → %26
    //   encodeURIComponent("price=100")    → "price%3D100"        // = → %3D
    //
    // Without it: fetch("/api?team=Real Madrid")  ❌ URL breaks — space is invalid
    // With it:    fetch("/api?team=Real%20Madrid") ✅ server decodes it back automatically
    const BASE = `https://jsonmock.hackerrank.com/api/movies/search/?Title=${encodeURIComponent(substr)}`;

    // Step 1: Fetch first page to get total_pages
    const firstRes = await fetch(`${BASE}&page=1`);
    const firstData = await firstRes.json();
    const totalPages: number = firstData.total_pages;

    // Collect titles from first page
    let allTitles: string[] = firstData.data.map((movie: any) => movie.Title);

    // Step 2: Fetch remaining pages in parallel
    if (totalPages > 1) {
        const pagePromises: Promise<string[]>[] = [];
        for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(
                fetch(`${BASE}&page=${page}`)
                    .then(res => res.json())
                    .then(data => data.data.map((movie: any) => movie.Title)),
            );
        }

        const remainingTitles = await Promise.all(pagePromises);
        // Flatten: [[title1, title2], [title3]] → [title1, title2, title3]
        remainingTitles.forEach(titles => allTitles.push(...titles));
    }

    // Step 3: Sort alphabetically and return‼️
    return allTitles.sort();
}

// Usage
const titles = await getMovieTitles('spiderman');
console.log(titles);
// ["Amazing Spiderman", "Spiderman", "Spiderman 2", "Spiderman 3", ...]

// Key patterns:
// - Pagination handling (same pattern as Problem 2)
// - encodeURIComponent for search terms with special characters‼️
// - Promise.all for parallel fetching
// - Array.sort() for alphabetical ordering (default sort is fine for strings)‼️
// - map() to extract just the Title field from full movie objects
```

---

### Problem 8: Top Articles by Comments — Null Handling + Multi-Criteria Sort

```typescript
// Given: A REST API at https://jsonmock.hackerrank.com/api/articles?page=N
// Response: { data: [{ title, url, author, num_comments, story_title, story_url }], total_pages }
// Task: Return article titles sorted by num_comments (desc), then alphabetically (asc)
// CATCH: Some articles have title=null. Use story_title as fallback.
//        If BOTH title AND story_title are null, SKIP that article entirely.
// Source: HackerRank OA, reported by Dunzo and other backend candidates

async function topArticles(limit: number): Promise<string[]> {
    const BASE = 'https://jsonmock.hackerrank.com/api/articles';

    // Step 1: Fetch first page to get total_pages
    const firstRes = await fetch(`${BASE}?page=1`);
    const firstData = await firstRes.json();
    const totalPages: number = firstData.total_pages;
    let allArticles: any[] = [...firstData.data];

    // Step 2: Fetch remaining pages
    if (totalPages > 1) {
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(
                fetch(`${BASE}?page=${page}`)
                    .then(res => res.json())
                    .then(data => data.data),
            );
        }
        const pages = await Promise.all(pagePromises);
        pages.forEach(pageData => allArticles.push(...pageData));
    }

    // Step 3: Process articles — resolve title, filter nulls
    const processed = allArticles
        .map(article => ({
            // Use title if available, otherwise story_title
            title: article.title || article.story_title,
            num_comments: article.num_comments ?? 0, // default to 0 if null
        }))
        .filter(article => article.title !== null && article.title !== undefined);
    // ^^ Skip articles where BOTH title and story_title are null

    // Step 4: Sort by num_comments DESC, then title ASC (alphabetical)‼️
    processed.sort((a, b) => {
        if (b.num_comments !== a.num_comments) {‼️
            return b.num_comments - a.num_comments; // descending by comments
        }
        return a.title.localeCompare(b.title); // ascending alphabetical‼️
    });

    // Step 5: Return only the titles, limited to requested count
    return processed.slice(0, limit).map(a => a.title);
}

// Usage
const top5 = await topArticles(5);
console.log(top5);
// ["Most commented article", "Second most", ...]

// Key patterns:
// - Null coalescing: article.title || article.story_title (fallback logic)
// - Nullish coalescing: ?? 0 for num_comments (treats null/undefined as 0)
// - Multi-criteria sorting with localeCompare for proper string comparison
// - .filter() to remove invalid entries BEFORE sorting
// - .slice() for limiting results AFTER sorting
//
// WHY this is tricky:
// - The null handling is the gotcha — many candidates forget story_title fallback
// - Sorting by two criteria requires careful comparison function
// - Must handle ALL pages, not just first page
```

---

### Problem 9: REST API Capital City — Simple Fetch with Error Handling

```typescript
// Given: A REST API at https://jsonmock.hackerrank.com/api/countries?name=COUNTRY
// Response: { data: [{ name, capital, ... }] }
// Task: Return the capital city of the given country. Return "-1" if not found.
// Source: HackerRank REST API Certification
// WHY this is asked: Tests basic async/await, error handling, and edge cases

async function getCapitalCity(country: string): Promise<string> {
    const url = `https://jsonmock.hackerrank.com/api/countries?name=${encodeURIComponent(country)}`;

    const res = await fetch(url);
    const data = await res.json();

    // Edge case 1: Country not found — data array is empty
    if (!data.data || data.data.length === 0) {
        return '-1';
    }

    // Edge case 2: Country found but capital field is missing/null
    const capital = data.data[0].capital;
    if (!capital) {
        return '-1';
    }

    return capital;
}

// Usage
console.log(await getCapitalCity('Germany')); // "Berlin"
console.log(await getCapitalCity('Afghanistan')); // "Kabul"
console.log(await getCapitalCity('Nonexistent')); // "-1"

// This is a warm-up problem — usually the easier of the two coding tasks
// Key points:
// - Always check data.data.length before accessing data.data[0]‼️
// - Return the exact type the spec asks for ("-1" as string, not the number -1)
// - encodeURIComponent for country names with spaces (e.g., "New Zealand")
```

---

### Problem 10: Discounted Price API — Business Logic + API

```typescript
// Given: A REST API at https://jsonmock.hackerrank.com/api/inventory?barcode=BARCODE
// Response: { data: [{ barcode, item, price, discount, quantity }] }
// Task: Given a barcode, return the discounted price rounded to 2 decimal places.
//       If item not found, return "Item not found"
// discounted_price = price * (1 - discount / 100)
// Source: HackerRank, used by Twilio and similar backend OAs

async function getDiscountedPrice(barcode: number): Promise<string | number> {
    const url = `https://jsonmock.hackerrank.com/api/inventory?barcode=${barcode}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
        return 'Item not found';
    }

    const item = data.data[0];
    const discountedPrice = item.price * (1 - item.discount / 100);

    // Round to 2 decimal places
    // WHY Math.round and not toFixed? toFixed returns a string.‼️
    // But some HackerRank tests expect a number. Use whichever the spec requires.
    return Math.round(discountedPrice * 100) / 100;‼️
}

// Usage
console.log(await getDiscountedPrice(74002314)); // e.g., 89.10
console.log(await getDiscountedPrice(99999999)); // "Item not found"

// Key patterns:
// - Business logic: discount calculation is simple but easy to mess up
//   WRONG: price - discount (that's not how percentages work)
//   RIGHT: price * (1 - discount/100)
// - Rounding: floating point math can produce 89.09999999... → round properly
// - Return types: mixed return type (number | string) — match exactly what spec says
```

---

### Problem 11: Express.js Authorization Middleware — Role-Based Access

```typescript
// Task: Build an Express.js app with role-based authorization middleware
// Roles: "admin" (full access), "editor" (read + write), "viewer" (read only)
// Routes:
//   GET /tasks       — all roles can access
//   POST /tasks      — admin and editor only
//   PUT /tasks/:id   — admin and editor only
//   DELETE /tasks/:id — admin only
// Role is passed in the "x-role" header
// Return 403 if role doesn't have permission, 401 if no role header
// Source: HackerRank Node.js Intermediate Certification

import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// In-memory store
interface Task {
    id: number;
    title: string;
    completed: boolean;
}

let tasks: Task[] = [];
let nextId = 1;

// Define permissions per role‼️
const rolePermissions: Record<string, string[]> = {
    admin: ['tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete'],
    editor: ['tasks.read', 'tasks.create', 'tasks.update'],
    viewer: ['tasks.read'],
};

// Authorization middleware factory — returns middleware for a specific permission‼️
function authorize(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const role = req.headers['x-role'] as string;‼️

        // No role header → 401 Unauthorized
        if (!role) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Unknown role → 403 Forbidden
        const permissions = rolePermissions[role.toLowerCase()];
        if (!permissions) {
            return res.status(403).json({ error: `Unknown role: ${role}` });
        }

        // Role doesn't have required permission → 403 Forbidden
        if (!permissions.includes(permission)) {
            return res.status(403).json({ error: `Role "${role}" lacks permission: ${permission}` });
        }

        // Role has permission → proceed
        next();
    };
}

// Routes with authorization
app.get('/tasks', authorize('tasks.read'), (req: Request, res: Response) => {
    res.json(tasks);
});

app.post('/tasks', authorize('tasks.create'), (req: Request, res: Response) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const task: Task = { id: nextId++, title, completed: false };
    tasks.push(task);
    res.status(201).json(task);
});

app.put('/tasks/:id', authorize('tasks.update'), (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const task = tasks.find(t => t.id === id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { title, completed } = req.body;
    if (title !== undefined) task.title = title;
    if (completed !== undefined) task.completed = completed;
    res.json(task);
});

app.delete('/tasks/:id', authorize('tasks.delete'), (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return res.status(404).json({ error: 'Task not found' });

    tasks.splice(index, 1);
    res.status(204).send();
});

app.listen(3000);

// Key patterns:
// - Middleware factory: authorize('tasks.create') returns a middleware function‼️
//   This is the "closure pattern" — the returned function closes over the permission string
// - Role lookup from headers: req.headers['x-role']
// - 401 vs 403: 401 = "who are you?" (no credentials), 403 = "I know who you are, but no" (insufficient permissions)
// - Separation of concerns: authorization logic is reusable middleware, not duplicated in each route
//
// Interview follow-up questions they might ask:
// - "How would you add a new role?" → Just add to rolePermissions object
// - "How would you make this production-ready?" → Store roles in DB, use JWT tokens instead of headers,‼️
//   add role hierarchy (admin inherits editor permissions)‼️
// - "What about route-level vs resource-level permissions?" → This is route-level.
//   Resource-level means "can user X edit THIS specific task?" (ownership check)
```

---

### Problem 12: Product API — CRUD with Method Restrictions

```typescript
// Task: Build a /products REST endpoint with specific business rules:
// - POST /products: Create product. ALWAYS set isPublished: false regardless of input
// - GET /products: Return all products sorted by ID ascending
// - GET /products/:id: Return single product, 404 if not found
// - PUT /products: Return 405 Method Not Allowed
// - DELETE /products: Return 405 Method Not Allowed
// - Auto-increment IDs starting from 1
// Source: HackerRank Node.js Intermediate Certification

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

interface Product {
    id: number;
    name: string;
    price: number;
    isPublished: boolean;
}

let products: Product[] = [];
let nextId = 1;

// POST /products — Create (always unpublished)
app.post('/products', (req: Request, res: Response) => {
    const { name, price } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ error: 'name and price are required' });
    }

    const product: Product = {
        id: nextId++,
        name,
        price: Number(price),
        isPublished: false, // ALWAYS false — ignore whatever the client sends
    };

    products.push(product);
    res.status(201).json(product);
});

// GET /products — List all, sorted by ID
app.get('/products', (req: Request, res: Response) => {
    // Sort by ID ascending (in case array order got mixed up)
    const sorted = [...products].sort((a, b) => a.id - b.id);
    res.status(200).json(sorted);
});

// GET /products/:id — Single product
app.get('/products/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);

    if (!product) {
        return res.status(404).json({ error: `Product with id ${id} not found` });
    }

    res.status(200).json(product);
});

// PUT and DELETE — Not allowed (405)‼️
app.put('/products', (req: Request, res: Response) => {
    res.status(405).json({ error: 'Method Not Allowed' });
});

app.put('/products/:id', (req: Request, res: Response) => {
    res.status(405).json({ error: 'Method Not Allowed' });
});

app.delete('/products', (req: Request, res: Response) => {
    res.status(405).json({ error: 'Method Not Allowed' });
});

app.delete('/products/:id', (req: Request, res: Response) => {
    res.status(405).json({ error: 'Method Not Allowed' });
});

app.listen(3000);

// Key patterns:
// - Business rule enforcement: isPublished is ALWAYS false on creation
//   Even if client sends { isPublished: true }, we ignore it
//   This tests whether you read the spec carefully
// - 405 Method Not Allowed: a real HTTP status code that many developers forget exists‼️
//   Use it when the endpoint exists but the HTTP method is not supported‼️
// - Auto-increment: simple pattern with a module-level counter
// - Defensive sorting: [...products].sort() creates a copy so we don't mutate the array‼️
```

---

### Problem 13: Async Search with EventEmitter‼️

```typescript
// Task: Create a Search class that extends EventEmitter
// - searchCount(searchTerm) method that:
//   1. Emits 'SEARCH_STARTED' event immediately with { searchTerm }
//   2. Calls an async countMatches(searchTerm) function
//   3. On success: emits 'SEARCH_SUCCESS' with { searchTerm, count }
//   4. On failure: emits 'SEARCH_ERROR' with { searchTerm, error }
//   5. If searchTerm is undefined/null: emits 'SEARCH_ERROR' immediately
// Source: HackerRank Node.js assessment — tests EventEmitter + async patterns

import { EventEmitter } from 'events';

// Simulated async API call
async function countMatches(searchTerm: string): Promise<number> {
    // In real HackerRank, this function is provided — you don't implement it
    // It might call an API or search a database
    const response = await fetch(`https://jsonmock.hackerrank.com/api/movies/search/?Title=${encodeURIComponent(searchTerm)}`);
    const data = await response.json();
    return data.total;
}

class Search extends EventEmitter {
    async searchCount(searchTerm: string | undefined | null): Promise<void> {
        // Guard: undefined or null searchTerm → error immediately
        if (searchTerm === undefined || searchTerm === null) {
            this.emit('SEARCH_ERROR', {
                searchTerm,
                error: 'Invalid search term',
            });
            return;
        }

        // Step 1: Emit SEARCH_STARTED
        this.emit('SEARCH_STARTED', { searchTerm });

        try {
            // Step 2: Call async function
            const count = await countMatches(searchTerm);

            // Step 3: Emit SEARCH_SUCCESS
            this.emit('SEARCH_SUCCESS', { searchTerm, count });
        } catch (error) {
            // Step 4: Emit SEARCH_ERROR on failure
            this.emit('SEARCH_ERROR', {
                searchTerm,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}

// Usage — how the test file typically uses it:‼️
const search = new Search();

search.on('SEARCH_STARTED', data => {
    console.log(`Search started for: ${data.searchTerm}`);
});

search.on('SEARCH_SUCCESS', data => {
    console.log(`Found ${data.count} results for: ${data.searchTerm}`);
});

search.on('SEARCH_ERROR', data => {
    console.log(`Search failed for: ${data.searchTerm} — ${data.error}`);
});

await search.searchCount('spiderman');
// Output:
// Search started for: spiderman
// Found 15 results for: spiderman

await search.searchCount(undefined);
// Output:
// Search failed for: undefined — Invalid search term

// Key patterns:
// - Extending EventEmitter: class Search extends EventEmitter
// - Event-driven async: emit events at each stage of an async operation‼️
// - Guard clauses: check for invalid input BEFORE starting the async work
// - Error handling: try/catch around the async call, emit error events
//
// WHY this problem matters:
// - EventEmitter is core to Node.js — used in streams, HTTP servers, WebSockets
// - This pattern (emit start → do work → emit success/error) is exactly how
//   real backend services handle async workflows
// - In NestJS, this is similar to how @EventPattern works in microservices
```

---

### Problem 14: Transaction Statement — Async Data Processing

```typescript
// Task: Given a user ID, fetch all transactions from a REST API
// Each transaction has: userName, amount, location.city, type (credit/debit)
// Calculate: total credits, total debits, net balance
// Return a formatted statement object
// Must use non-blocking API calls (async/await)
// Source: HackerRank Node.js assessment — tests async + data aggregation

interface Transaction {
    id: number;
    userId: number;
    userName: string;
    amount: number;
    type: 'credit' | 'debit';
    location: { city: string; country: string };
    timestamp: string;
}

interface Statement {
    userName: string;
    totalCredits: number;
    totalDebits: number;
    netBalance: number;
    transactionCount: number;
    cities: string[];
}

async function fetchAllTransactions(userId: number): Promise<Transaction[]> {
    const BASE = `https://jsonmock.hackerrank.com/api/transactions?userId=${userId}`;

    // Fetch first page
    const firstRes = await fetch(`${BASE}&page=1`);
    const firstData = await firstRes.json();
    const totalPages: number = firstData.total_pages;
    let allTransactions: Transaction[] = [...firstData.data];

    // Fetch remaining pages in parallel
    if (totalPages > 1) {
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(
                fetch(`${BASE}&page=${page}`)
                    .then(res => res.json())
                    .then(data => data.data),
            );
        }
        const pages = await Promise.all(pagePromises);
        pages.forEach(pageData => allTransactions.push(...pageData));
    }

    return allTransactions;
}

async function getStatement(userId: number): Promise<Statement> {
    const transactions = await fetchAllTransactions(userId);

    if (transactions.length === 0) {
        throw new Error(`No transactions found for user ${userId}`);
    }

    const userName = transactions[0].userName;
    let totalCredits = 0;
    let totalDebits = 0;
    const citySet = new Set<string>();‼️

    for (const tx of transactions) {
        // GOTCHA: amount might come as a string like "$1,234.56" from some APIs
        // Parse it properly:
        const amount = typeof tx.amount === 'string' ? parseFloat((tx.amount as string).replace(/[$,]/g, '')) : tx.amount;

        if (tx.type === 'credit') {
            totalCredits += amount;
        } else {
            totalDebits += amount;
        }

        if (tx.location?.city) {
            citySet.add(tx.location.city);
        }
    }

    return {
        userName,
        totalCredits: Math.round(totalCredits * 100) / 100,‼️
        totalDebits: Math.round(totalDebits * 100) / 100,
        netBalance: Math.round((totalCredits - totalDebits) * 100) / 100,
        transactionCount: transactions.length,
        cities: [...citySet].sort(), // unique cities, sorted
    };
}

// Usage
const statement = await getStatement(1);
console.log(statement);
// {
//   userName: "John Doe",
//   totalCredits: 5430.50,
//   totalDebits: 2150.00,
//   netBalance: 3280.50,
//   transactionCount: 25,
//   cities: ["Chicago", "Los Angeles", "New York"]
// }

// Key patterns:
// - Same pagination pattern as Problems 2, 7, 8 (it keeps coming up!)
// - Set for unique values (cities) — much cleaner than array + indexOf
// - String-to-number parsing: "$1,234.56" → 1234.56 (remove $, remove commas)
// - Rounding: Math.round(x * 100) / 100 for 2 decimal places‼️
// - Aggregation: single pass through data to calculate multiple metrics
//
// Common mistakes:
// - Not handling paginated responses (only processing page 1)
// - Not parsing currency strings ("$500" is a string, not a number)
// - Floating point errors: 0.1 + 0.2 = 0.30000000000000004 → always round‼️
```

---

### Problem 15: Countries with Population Filter — Paginated API + Filter

```typescript
// Task: Fetch all countries from the API where population > threshold
// API: https://jsonmock.hackerrank.com/api/countries?page=N
// Response: { data: [{ name, capital, population, ... }], total_pages }
// Return: Array of country names, sorted alphabetically
// Source: HackerRank REST API assessment

async function getCountriesByPopulation(threshold: number): Promise<string[]> {
    const BASE = 'https://jsonmock.hackerrank.com/api/countries';

    // Fetch first page for total_pages
    const firstRes = await fetch(`${BASE}?page=1`);
    const firstData = await firstRes.json();
    const totalPages: number = firstData.total_pages;

    // Collect ALL data from all pages
    let allCountries: any[] = [...firstData.data];

    if (totalPages > 1) {
        const promises = [];
        for (let page = 2; page <= totalPages; page++) {
            promises.push(
                fetch(`${BASE}?page=${page}`)
                    .then(res => res.json())
                    .then(data => data.data),
            );
        }
        const pages = await Promise.all(promises);
        pages.forEach(pageData => allCountries.push(...pageData));
    }

    // Filter by population threshold and return sorted names
    return allCountries
        .filter(country => country.population > threshold)
        .map(country => country.name)
        .sort();
}

// Usage
const bigCountries = await getCountriesByPopulation(100000000);
console.log(bigCountries);
// ["Bangladesh", "Brazil", "China", "India", "Indonesia", ...]

// This is a simpler variant of the pagination pattern.
// The trick is: you MUST fetch ALL pages before filtering.
// You cannot just check page 1 — matching countries could be on any page.
// The sorting is done client-side AFTER collecting all results.
```

---

### Problem 16: Order State Machine — State Transitions with Validation‼️

```typescript
// Task: Implement an order processing function that handles state transitions
// Valid states: PENDING → PROCESSING → SHIPPED → DELIVERED
// Rules:
//   - Can only move forward (PENDING→PROCESSING is ok, SHIPPED→PENDING is not)
//   - Cannot skip states (PENDING→SHIPPED is not allowed)
//   - Once DELIVERED, no more transitions allowed
//   - Return the updated order or throw an error for invalid transitions
// Source: HackerRank Node.js Basic Certification

interface Order {
    id: string;
    item: string;
    quantity: number;
    status: OrderStatus;
    history: { status: OrderStatus; timestamp: Date }[];‼️
}

type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

// Define valid transitions as a map‼️
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [], // terminal state — no transitions allowed
    CANCELLED: [], // terminal state — no transitions allowed
};

function transitionOrder(order: Order, newStatus: OrderStatus): Order {
    const currentStatus = order.status;

    // Check if transition is valid
    const allowedNextStates = validTransitions[currentStatus];

    if (!allowedNextStates || !allowedNextStates.includes(newStatus)) {
        throw new Error(`Invalid transition: cannot move from ${currentStatus} to ${newStatus}. ` + `Allowed transitions from ${currentStatus}: [${allowedNextStates.join(', ')}]`);
    }

    // Apply the transition
    order.status = newStatus;
    order.history.push({ status: newStatus, timestamp: new Date() });

    return order;
}

// Usage
const order: Order = {
    id: 'ORD-001',
    item: 'Gaming Mouse',
    quantity: 1,
    status: 'PENDING',
    history: [{ status: 'PENDING', timestamp: new Date() }],
};

transitionOrder(order, 'PROCESSING'); // ✅ OK
console.log(order.status); // "PROCESSING"

transitionOrder(order, 'SHIPPED'); // ✅ OK
console.log(order.status); // "SHIPPED"

try {
    transitionOrder(order, 'PENDING'); // ❌ ERROR: cannot go backwards
} catch (e) {
    console.log(e.message);
    // "Invalid transition: cannot move from SHIPPED to PENDING. Allowed: [DELIVERED]"
}

transitionOrder(order, 'DELIVERED'); // ✅ OK

try {
    transitionOrder(order, 'SHIPPED'); // ❌ ERROR: DELIVERED is terminal
} catch (e) {
    console.log(e.message);
    // "Invalid transition: cannot move from DELIVERED to SHIPPED. Allowed: []"
}

// Key patterns:
// - State machine: validTransitions map defines all legal transitions
//   Adding a new state or transition = just update the map, no code logic changes
// - History tracking: every transition is logged with timestamp (audit trail)‼️
// - Clear error messages: tell the user WHAT went wrong and WHAT is allowed
//
// WHY this pattern matters in iGaming:
// - Bet states: PENDING → ACCEPTED → SETTLED → PAID (exactly this pattern)
// - Payment states: INITIATED → PROCESSING → COMPLETED/FAILED
// - KYC states: SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED
// - The state machine pattern prevents invalid operations on bets/payments‼️
```

---

### Problem 17: Recipes Pagination Middleware — Custom Express Middleware

```typescript
// Task: Build pagination middleware for a /recipes endpoint
// Query params: ?page=1&limit=3&search=chicken
// Middleware should:
//   1. Parse page (default 1) and limit (default 3) from query params
//   2. If search param exists, filter recipes by name (case-insensitive)
//   3. Attach pagination context to req object
//   4. Handler uses the context to return paginated results
// Source: HackerRank Node.js Basic Certification

import express, { Request, Response, NextFunction } from 'express';

const app = express();

// Sample data
const recipes = [
    { id: 1, name: 'Chicken Tikka Masala', cuisine: 'Indian', time: 45 },
    { id: 2, name: 'Spaghetti Carbonara', cuisine: 'Italian', time: 30 },
    { id: 3, name: 'Chicken Caesar Salad', cuisine: 'American', time: 15 },
    { id: 4, name: 'Pad Thai', cuisine: 'Thai', time: 25 },
    { id: 5, name: 'Grilled Chicken Sandwich', cuisine: 'American', time: 20 },
    { id: 6, name: 'Beef Tacos', cuisine: 'Mexican', time: 20 },
    { id: 7, name: 'Mushroom Risotto', cuisine: 'Italian', time: 40 },
    { id: 8, name: 'Fish and Chips', cuisine: 'British', time: 35 },
    { id: 9, name: 'Chicken Fried Rice', cuisine: 'Chinese', time: 20 },
    { id: 10, name: 'Veggie Burger', cuisine: 'American', time: 25 },
];

// Extend Request type to include pagination context‼️
interface PaginatedRequest extends Request {
    pagination?: {
        page: number;
        limit: number;
        search?: string;
        filteredData: typeof recipes;
        paginatedData: typeof recipes;
        totalItems: number;
        totalPages: number;
    };
}

// Pagination middleware
function paginationMiddleware(data: typeof recipes) {
    return (req: PaginatedRequest, res: Response, next: NextFunction) => {
        // Parse query params with defaults
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.max(1, parseInt(req.query.limit as string) || 3);
        const search = req.query.search as string | undefined;‼️

        // Filter by search term (case-insensitive)
        let filteredData = data;
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // 'i' flag = case-insensitive
            filteredData = data.filter(item => searchRegex.test(item.name));‼️
        }

        // Calculate pagination
        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        // Attach to request object for handler to use‼️
        req.pagination = {
            page,
            limit,
            search,
            filteredData,
            paginatedData,
            totalItems,
            totalPages,
        };

        next(); // Pass control to the route handler
    };
}

// Route using the middleware
app.get('/recipes', paginationMiddleware(recipes), (req: PaginatedRequest, res: Response) => {
    const p = req.pagination!;

    res.json({
        page: p.page,
        limit: p.limit,
        totalItems: p.totalItems,
        totalPages: p.totalPages,
        data: p.paginatedData,
    });
});

app.listen(3000);

// Test examples:
// GET /recipes                        → page 1, 3 items (default)
// GET /recipes?page=2&limit=5         → page 2, 5 items per page
// GET /recipes?search=chicken         → filtered: Tikka Masala, Caesar Salad, Sandwich, Fried Rice
// GET /recipes?search=chicken&page=2&limit=2 → page 2 of chicken results: Sandwich, Fried Rice

// Key patterns:
// - Middleware factory: paginationMiddleware(data) returns a middleware function‼️
//   This lets you reuse the same middleware for different data sets
// - Extending req: attach custom data to the request object via interface‼️
// - Default values: || 1 and || 3 for missing/invalid query params
// - Math.max(1, ...) prevents page=0 or negative numbers
// - Math.ceil for total pages: 7 items / 3 per page = ceil(2.33) = 3 pages
// - slice(start, end) for pagination: page 2, limit 3 → slice(3, 6)
//
// Pagination formula to memorize:
// startIndex = (page - 1) * limit
// endIndex = startIndex + limit
// totalPages = Math.ceil(totalItems / limit)
```

---

### Problem 18: Football Scores — Binary Search (Algorithm)

```typescript
// Task: Given two arrays of scores (teamA and teamB), for each score in teamB,
// count how many scores in teamA are LESS THAN OR EQUAL to it.
// Input:  teamA = [1, 4, 2, 4], teamB = [3, 5]
// Output: [2, 4]
//   - For teamB[0]=3: scores ≤ 3 in teamA are [1, 2] → count = 2
//   - For teamB[1]=5: scores ≤ 5 in teamA are [1, 2, 4, 4] → count = 4
// Constraint: arrays can be very large (up to 10^5), so brute force O(n*m) will timeout
// Source: HackerRank, reported by Meesho, Adobe, and backend OA candidates

function countScores(teamA: number[], teamB: number[]): number[] {
    // Step 1: Sort teamA — required for binary search‼️
    teamA.sort((a, b) => a - b);
    // teamA = [1, 2, 4, 4]

    // Step 2: For each score in teamB, binary search for the rightmost position
    // where teamA[pos] <= score
    return teamB.map(target => upperBound(teamA, target));
}

// Binary search: find count of elements in sorted array that are ≤ target
function upperBound(sorted: number[], target: number): number {
    let left = 0;
    let right = sorted.length - 1;
    let result = 0; // if no element ≤ target, count is 0

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        if (sorted[mid] <= target) {
            // sorted[mid] qualifies — everything at or before mid is ≤ target‼️
            result = mid + 1; // mid is 0-indexed, count is 1-indexed‼️
            left = mid + 1; // look for more qualifying elements to the right
        } else {
            // sorted[mid] > target — look left
            right = mid - 1;
        }
    }

    return result;
}

// Usage
console.log(countScores([1, 4, 2, 4], [3, 5]));
// [2, 4]

console.log(countScores([1, 2, 3], [2, 4]));
// [2, 3]

// Walkthrough for target=3 in sorted [1, 2, 4, 4]:
// left=0, right=3, mid=1 → sorted[1]=2 ≤ 3 → result=2, left=2
// left=2, right=3, mid=2 → sorted[2]=4 > 3 → right=1
// left=2 > right=1 → stop → return 2
// Answer: 2 scores in teamA are ≤ 3

// Time complexity:
// - Sorting teamA: O(n log n)
// - For each element in teamB: O(log n) binary search
// - Total: O(n log n + m log n) where n = teamA.length, m = teamB.length
//
// vs brute force: O(n * m) — would timeout for n,m = 100,000
//
// Key pattern: "count elements ≤ X in an array" → sort + binary search‼️
// This is a very common HackerRank pattern — recognize it instantly
```

---

### Problem 19: Maximum Transfer Amount — API + Algorithm Hybrid

```typescript
// Task: Fetch transaction data from an API, then find the maximum amount
// that was transferred between two specific cities
// API: https://jsonmock.hackerrank.com/api/transactions?page=N
// Response: { data: [{ id, userId, userName, amount, location: { city } }], total_pages }
// Given: sourceCity and destCity
// Find: Maximum transaction amount from sourceCity
//       (This is a simplified version — real problem may involve more complex filtering)
// Source: HackerRank REST API + Algorithm hybrid problems

async function getMaxTransferAmount(city: string): Promise<number> {
    const BASE = 'https://jsonmock.hackerrank.com/api/transactions';

    // Step 1: Fetch all pages
    const firstRes = await fetch(`${BASE}?page=1`);
    const firstData = await firstRes.json();
    const totalPages: number = firstData.total_pages;
    let allTransactions: any[] = [...firstData.data];

    if (totalPages > 1) {
        const promises = [];
        for (let page = 2; page <= totalPages; page++) {
            promises.push(
                fetch(`${BASE}?page=${page}`)
                    .then(res => res.json())
                    .then(data => data.data),
            );
        }
        const pages = await Promise.all(promises);
        pages.forEach(p => allTransactions.push(...p));
    }

    // Step 2: Filter by city and find max amount
    let maxAmount = -1;

    for (const tx of allTransactions) {
        if (tx.location?.city === city) {
            // Parse amount — might be "$1,234.56" format
            const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount.replace(/[$,]/g, '')) : tx.amount;

            if (amount > maxAmount) {
                maxAmount = amount;
            }
        }
    }

    return maxAmount; // -1 if no transactions found for that city
}

// Usage
const maxLA = await getMaxTransferAmount('Los Angeles');
console.log(`Max transfer in LA: $${maxLA}`);

// Variant: Find max amount across ALL cities and return { city, amount }
async function getMaxTransferByCity(): Promise<{ city: string; amount: number }> {
    // ... fetch all transactions (same as above) ...
    const allTransactions: any[] = []; // fetched data

    const cityMaxMap = new Map<string, number>();

    for (const tx of allTransactions) {
        const city = tx.location?.city;
        if (!city) continue;

        const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount.replace(/[$,]/g, '')) : tx.amount;‼️

        const currentMax = cityMaxMap.get(city) ?? 0;
        if (amount > currentMax) {
            cityMaxMap.set(city, amount);
        }
    }

    // Find the city with the overall max
    let resultCity = '';
    let resultAmount = -1;

    for (const [city, amount] of cityMaxMap) {
        if (amount > resultAmount) {
            resultCity = city;
            resultAmount = amount;
        }
    }

    return { city: resultCity, amount: resultAmount };
}

// Key patterns:
// - Same pagination fetch pattern (you should be able to write this in your sleep by now)
// - Currency string parsing: "$1,234.56" → 1234.56‼️
// - Map for grouping/aggregating: Map<city, maxAmount>
// - Finding max: simple comparison, no need for Math.max with spread (which can stack overflow on large arrays)‼️
```

---

## Summary: The Patterns That Keep Repeating

// After solving all 19 problems, you'll notice the same patterns appear over and over:
//
// 1. PAGINATION PATTERN (Problems 2, 7, 8, 14, 15, 19):
// - Fetch page 1 → get total_pages → fetch remaining pages with Promise.all
// - This is the #1 most common HackerRank backend pattern
//
// 2. API + FILTER + SORT (Problems 7, 8, 15):
// - Fetch all data → filter by criteria → sort by one or more fields → return
//
// 3. DATA AGGREGATION (Problems 1, 2, 14, 19):
// - Fetch data → reduce/sum/count/group → return computed result
//
// 4. EXPRESS CRUD (Problems 3, 11, 12):
// - Routes + status codes + input validation + error handling
//
// 5. MIDDLEWARE PATTERN (Problems 11, 17):
// - Factory function that returns middleware → attach data to req → call next()
//
// 6. BINARY SEARCH (Problem 18):
// - "Count elements ≤ X" or "Find first/last element matching criteria" → sort + binary search
//
// 7. STATE MACHINE (Problem 16):
// - Define valid transitions in a map → validate before applying → track history
//
// If you can write these 7 patterns from memory, you can solve
// virtually any HackerRank backend problem they throw at you.

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
        const key = str.split('').sort().join('');‼️

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

**DFS Method (same problem, different traversal):**

```typescript
// DFS uses recursion (call stack) instead of a queue
// Same idea: find a '1', sink the entire island, count it

function numIslandsDFS(grid: string[][]): number {
    if (!grid.length || !grid[0].length) return 0;

    const rows = grid.length;
    const cols = grid[0].length;
    let islands = 0;

    // DFS to mark all connected land cells as visited
    function dfs(row: number, col: number): void {
        // Base case: out of bounds OR water → stop
        if (row < 0 || row >= rows || col < 0 || col >= cols || grid[row][col] === '0') {
            return;
        }

        // Mark current cell as visited (sink it)
        grid[row][col] = '0';

        // Explore all 4 directions recursively
        dfs(row - 1, col); // up
        dfs(row + 1, col); // down
        dfs(row, col - 1); // left
        dfs(row, col + 1); // right
    }

    // Scan every cell in the grid
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '1') {
                islands++; // Found a new island
                dfs(r, c); // Sink the entire island
            }
        }
    }

    return islands;
}

// Walkthrough with the example grid:
// [["1","1","0","0","0"],
//  ["1","1","0","0","0"],
//  ["0","0","1","0","0"],
//  ["0","0","0","1","1"]]
//
// Step 1: grid[0][0] = '1' → islands = 1
//   dfs(0,0) → marks '0', calls dfs(up)=OOB, dfs(down)=dfs(1,0), dfs(left)=OOB, dfs(right)=dfs(0,1)
//   dfs(1,0) → marks '0', calls dfs(2,0)='0' stop, dfs(0,0)='0' stop, ..., dfs(1,1)
//   dfs(1,1) → marks '0', calls dfs(0,1)
//   dfs(0,1) → marks '0', all neighbors are '0' now → stop
//   Island 1 fully sunk: top-left 2x2 block
//
// Step 2: grid[0][1..4] all '0' now, grid[1][0..4] all '0', grid[2][0..1] = '0'
//   grid[2][2] = '1' → islands = 2
//   dfs(2,2) → marks '0', no neighbors are '1' → stop
//   Island 2: single cell
//
// Step 3: grid[3][3] = '1' → islands = 3
//   dfs(3,3) → marks '0', dfs(3,4) → marks '0', no more '1' neighbors → stop
//   Island 3: two cells
//
// Result: 3

// Time: O(rows * cols) — same as BFS, visit each cell at most once
// Space: O(rows * cols) — worst case recursion depth (entire grid is one island)
//        vs BFS which is O(min(rows, cols)) — BFS is better for space in worst case

// BFS vs DFS comparison for this problem:
// - BFS: uses queue (array + shift), iterative, O(min(rows,cols)) space
// - DFS: uses call stack (recursion), cleaner/shorter code, O(rows*cols) space worst case‼️
// - Both are O(rows*cols) time
// - DFS is easier to write in interviews (fewer lines, no queue management)
// - BFS is safer for very large grids (no stack overflow risk)‼️
// - Interview tip: mention both, implement whichever you're more comfortable with,
//   then explain the trade-off if asked

console.log(
    numIslandsDFS([
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
    // This is essentially the Fibonacci sequence‼️
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

// If the interviewer asks for the memoized recursive version:‼️
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
import jwt from 'jsonwebtoken'; // npm install jsonwebtoken ‼️@types/jsonwebtoken

const app = express();
app.use(express.json());

const SECRET_KEY = 'your-secret-key'; // In production, use env variable

// Extend Request type to include user info‼️
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
        // jwt.verify throws if the token is invalid, expired, or tampered with‼️
        //
        // HOW jwt.verify() WORKS INTERNALLY:
        //
        // A JWT has 3 parts separated by dots:
        // eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEyMywiZXhwIjoxNzE5MDAwMDAwfQ.abc123signature
        // │ HEADER              │ PAYLOAD                                     │ SIGNATURE
        // │ { "alg": "HS256" }  │ { "userId": 123, "exp": 1719000000 }       │ HMAC hash
        //
        // Step 1: SPLIT AND DECODE
        //   token.split('.') → [header, payload, signature]
        //   Base64-decode header and payload (NOT the signature yet)
        //
        // Step 2: CHECK SIGNATURE (detects tampering)
        //   Recalculate what the signature SHOULD be:
        //     expectedSignature = HMAC-SHA256(header + "." + payload, YOUR_SECRET_KEY)
        //   Compare with the signature in the token:
        //     if (expectedSignature !== actualSignature) → throw JsonWebTokenError('invalid signature')
        //   If someone changed the payload (e.g., userId: 123 → userId: 1),
        //   the recalculated signature won't match because they don't have your secret key.
        //   That's the whole point — only someone with the secret can produce a valid signature.// jwt.verify throws if the token is invalid, expired, or tampered with
        //
        // Step 3: CHECK EXPIRATION
        //   Read the "exp" claim from the payload:
        //     if (payload.exp && Date.now() / 1000 > payload.exp) → throw TokenExpiredError('jwt expired')
        //
        // Step 4: CHECK OTHER CLAIMS (if configured)
        //   Optional: nbf (not before), iss (issuer), aud (audience)
        //     if (payload.nbf && Date.now() / 1000 < payload.nbf) → throw JsonWebTokenError('jwt not active')
        //
        // THE 3 FAILURE CASES:
        // | Case       | What happened                                          | Error thrown                              |
        // |------------|--------------------------------------------------------|------------------------------------------|
        // | Invalid    | Malformed token, wrong format, or wrong secret         | JsonWebTokenError('invalid signature')   |
        // | Expired    | exp claim is in the past                               | TokenExpiredError('jwt expired')         |
        // | Tampered   | Payload modified but can't re-sign (no secret)         | JsonWebTokenError('invalid signature')   |
        //
        // WHY TAMPERING FAILS:
        //   Signing (jwt.sign):
        //     payload = { userId: 123 }
        //     signature = hash("userId:123" + "MY_SECRET_KEY") → "abc123"
        //     token = payload + "." + "abc123"
        //
        //   Attacker changes payload:
        //     payload = { userId: 1 }  ← attacker wants to be admin
        //     But they don't know MY_SECRET_KEY, so they can't compute the new signature
        //     They send: { userId: 1 } + "." + "abc123" (old signature)
        //
        //   jwt.verify:
        //     expectedSig = hash("userId:1" + "MY_SECRET_KEY") → "xyz789"
        //     actualSig = "abc123"
        //     "xyz789" !== "abc123" → THROW invalid signature
        //
        // The secret key is what makes JWT secure — without it, you can read the payload‼️
        // (it's just base64) but you CANNOT forge a valid signature.‼️

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
// JWT structure: header.payload.signature‼️
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

        res.set('Retry-After', String(retryAfterSec)); // Standard header telling client when to retry‼️
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
// Answer: Use Redis with INCR + EXPIRE:‼️
//
// async function redisRateLimiter(ip: string): Promise<boolean> {
//   const key = `rate:${ip}`;
//   const count = await redis.incr(key);     // Atomic increment
//   if (count === 1) {
//     await redis.expire(key, 60);           // Set expiry on first request
//     // redis.expire(key, 60) tells Redis: "delete this key automatically after 60 seconds"
//     // Without expire: the key lives forever → counter never resets → user blocked permanently
//     // With expire(key, 60): after 60s, Redis auto-deletes the key → counter resets to 0
//     //
//     // Timeline:
//     // 0s   — User's first request → Redis creates key "rate:192.168.1.1" = 1
//     //         expire(key, 60) → "delete this key at 60s"
//     // 5s   — Request #2 → key = 2
//     // 10s  — Request #3 → key = 3
//     // ...
//     // 55s  — Request #10 → key = 10 → limit reached, block further requests
//     // 60s  — Redis auto-deletes the key → as if the user never made any requests
//     // 61s  — User's next request → key doesn't exist → starts fresh at 1
//     //
//     // It's a self-resetting counter — the 60-second TTL (Time To Live)
//     // is what creates the "per minute" in "10 requests per minute"
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
// - Use Express Router to keep versioned code organized and separate‼️
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
            return res.status(502).json({ error: 'External API unavailable' });‼️
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
// 3. Data aggregation using Map (grouping, counting)‼️
// 4. Transforming data structures (Map → sorted array of objects)‼️
// 5. Proper error propagation (502 for external API failures, 500 for internal errors)‼️
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
console.log(JSON.stringify(result, null, 2));‼️

// Key patterns demonstrated:
// 1. Grouping flat data into nested structures using Map
// 2. Building objects incrementally (add items, update running total)
// 3. Map → Array conversion with Array.from()‼️
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
// Don't use Node's built-in EventEmitter — build it from scratch to show understanding‼️

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
emitter.emit('data', { id: 3 }); // (nothing — listener removed)‼️

console.log(emitter.listenerCount('data')); // 0

// Why this matters:
// - Node.js is built on events (http.Server, streams, process are all EventEmitters)
// - Shows understanding of the observer/pub-sub pattern‼️
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

// Usage with pipeline (preferred — handles errors and backpressure automatically)‼️
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
// - pipeline() handles error propagation and cleanup (closes all streams on error)‼️
//
// The 4 stream types:
// - Readable: source of data (fs.createReadStream, http request)
// - Writable: destination (fs.createWriteStream, http response)
// - Transform: modify data passing through (compression, encryption, parsing)
// - Duplex: both readable and writable (TCP socket, WebSocket)‼️
```

### C3. Concurrency — Promise.all, Promise.allSettled, Race Conditions

**Q: Fetch data from 5 different APIs concurrently. Some might fail. Return all successful results and log failures.**

```typescript
// =============================================
// Pattern 1: Promise.all — fails fast if ANY promise rejects
// =============================================
async function fetchAllOrFail(urls: string[]): Promise<any[]> {
    // If even ONE request fails, the entire Promise.all rejects‼️
    // Use this when ALL data is required and partial results are useless‼️
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
    // Promise.allSettled ALWAYS resolves — it waits for everything to finish‼️
    // Each result is either { status: 'fulfilled', value: ... } or { status: 'rejected', reason: ... }
    const results = await Promise.allSettled(
        urls.map(async url => {‼️
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
// Pattern 3: Concurrency limit — don't overwhelm the server‼️
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

// fetchAllGracefully(urls).then(console.log);‼️

// Usage with concurrency limit:
const tasks = urls.map(url => () => fetch(url).then(r => r.json()));
// fetchWithLimit(tasks, 2); // Only 2 requests at a time

// When to use which:
// Promise.all     → All or nothing. Fast fail. Use when every result is required.‼️
// Promise.allSettled → Graceful degradation. Use when partial results are useful.
// Promise.race    → First to finish wins. Use for timeouts:‼️
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
        // Maintains proper stack trace in V8 (Node.js)‼️
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
//   // Optionally: graceful shutdown‼️
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
│  │          poll             │ ← retrieve new I/O events, execute I/O callbacks‼️
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
7. Call stack is now empty → drain microtask queue → nextTick first, then promise‼️
8. Enter event loop → timers phase (setTimeout) → poll → check phase (setImmediate)

---

### Q2: How do you handle race conditions? (SPECIFICALLY ASKED)‼️

**What is a race condition?**

> ‼️ A race condition occurs when two or more operations try to access/modify shared state concurrently, ‼️ and the final result depends on the timing/order of execution. In Node.js, even though JS is single-threaded, race conditions happen with:
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

    // Atomic update: only succeeds if version hasn't changed since we read it‼️
    const result = await db.updateOne(
        { id: userId, version: user.version }, // WHERE id = X AND version = Y
        {
            $set: { balance: user.balance - amount },
            $inc: { version: 1 }, // Increment version‼️
        },
    );

    if (result.modifiedCount === 0) {
        // Another request modified the record — version changed → retry or reject
        return res.status(409).json({ error: 'Conflict — please retry' });
    }

    res.json({ success: true, newBalance: user.balance - amount });
});

// How it prevents the race condition:‼️
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

    // Single atomic operation: only decrements if balance >= amount‼️
    const result = await db.updateOne(
        { id: userId, balance: { $gte: amount } }, // Check AND update atomically‼️
        { $inc: { balance: -amount } }, // Decrement atomically‼️
    );

    if (result.modifiedCount === 0) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    res.json({ success: true });
});

// MongoDB's $inc is atomic — no race condition possible‼️
// No need for version fields or retries
```

**Solution 3: Distributed Lock with Redis**

```typescript
// For multi-step operations that can't be done in a single atomic query
// Use Redis distributed lock (SET NX EX pattern)‼️

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
        // Release lock — but only if WE still own it (compare value)‼️
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
// Optimistic locking → when you need to read-then-write but conflicts are rare‼️
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
> ‼️"In iGaming, financial transactions like bets and withdrawals need CP — we can't risk showing a wrong balance. ‼️But for leaderboards or game history, AP is fine — slightly stale data is acceptable."

**Eventual Consistency:**

> Instead of all nodes having the same data at all times (strong consistency), changes propagate gradually. All nodes will eventually reach the same state. ‼️ Used by: DynamoDB, Cassandra, DNS, Redis replication.
>
> "When a user places a bet, we use strong consistency for the balance update (MySQL transaction). But the bet history feed for other users? That can be eventually consistent via an event published to Kafka."

**Service Discovery:**

> How do microservices find each other?‼️
>
> - **DNS-based** — services register with a DNS server (e.g., Consul, Route 53)
> - **Client-side** — service queries a registry and picks an instance (e.g., Eureka)‼️
> - **Server-side** — load balancer routes to healthy instances (e.g., Kubernetes Service, AWS ALB)
> - In Kubernetes: services get a stable DNS name automatically (`my-service.default.svc.cluster.local`)‼️

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

> - **Health checks:** ‼️ Each service exposes `/health` endpoint. Orchestrator (K8s) checks it to route traffic only to healthy instances.
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
> "I'd start with a modular monolith — ‼️ clean separation into modules that COULD become services later. Only split when you have a clear need: independent scaling, independent deployment, or different technology requirements."

**Q: How do microservices communicate?**

> **Synchronous (request-response):**
>
> - **REST/HTTP** — simple, widely understood, good for CRUD. ‼️ Downside: tight coupling, cascading failures.
> - **gRPC** — binary protocol, faster than REST, strongly typed with Protobuf. Good for internal service-to-service calls.
>
> **Asynchronous (event-driven):**
>
> - **Message queues (RabbitMQ)** — task-based: "process this bet," "send this email." ‼️ One producer, one consumer per message.
> - **Event streaming (Kafka)** — event-based: "bet was placed." ‼️ Multiple consumers can independently read the same event.
> - **NATS** — ‼️ lightweight pub/sub, great for real-time notifications. Fire-and-forget unless using JetStream.
>
> "For the iGaming platform, I'd use REST for client-to-service communication, gRPC for internal service-to-service calls where performance matters,‼️ and RabbitMQ/Kafka for async workflows like bet processing and notification delivery."

**Q: How do you handle data consistency across microservices?**

> Each microservice owns its own database (Database per Service pattern). This means you can't do cross-service JOINs or ACID transactions.
>
> **Patterns for consistency:**
>
> - **Saga pattern** — a sequence of local transactions. If step 3 fails, execute compensating transactions for steps 2 and 1. Two styles:
>     - _Choreography:_ each service listens for events and acts (simpler, but harder to track)
>     - _Orchestration:_ a central orchestrator tells each service what to do (easier to debug)
> - **Outbox pattern** — write the event to a local "outbox" table in the same transaction as the data change. A separate process polls the outbox and publishes events. ‼️ Guarantees at-least-once delivery.
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
// Why: `var` is function-scoped, not block-scoped. ‼️ By the time setTimeout
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
console.log(a); // undefined (var is hoisted but not initialized)‼️
console.log(b); // ReferenceError: Cannot access 'b' before initialization‼️
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
greetFn(); ‼️ // undefined — `this` is now global/undefined (lost context)‼️
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
// 4. D — C's .then returned a Promise, so D is queued in the NEXT microtask batch‼️
// 5. B — setTimeout is a macrotask, runs after all microtasks are drained‼️
```

**Snippet 5: typeof and equality quirks**

```javascript
console.log(typeof null); // "object" (infamous JS bug, kept for compatibility)‼️
console.log(typeof undefined); // "undefined"
console.log(null == undefined); // true (loose equality, both are "empty" values)
console.log(null === undefined); // false (strict equality, different types)
console.log(NaN === NaN); // false (NaN is not equal to anything, including itself)‼️
console.log(Number.isNaN(NaN)); // true (use this instead of ===)‼️
```

**Snippet 6: Async/Await execution order**‼️

```javascript
async function foo() {
    console.log('1: foo start');
    await bar();
    console.log('2: foo after await'); // This runs as a microtask after bar resolves‼️
}

async function bar() {
    console.log('3: bar start');
}

console.log('4: script start');
foo();
console.log('5: script end');

// Output: 4: script start, 1: foo start, 3: bar start, 5: script end, 2: foo after await‼️
// Why:‼️
// - "4: script start" — synchronous
// - foo() is called — "1: foo start" — synchronous part of foo
// - await bar() — calls bar synchronously — "3: bar start"
// - await pauses foo, returns control to caller
// - "5: script end" — synchronous
// - microtask queue: resume foo after await — "2: foo after await"
```

**How async/await execution order works (theory):**

// JavaScript has ONE thread and TWO queues:
// 1. Call stack — where synchronous code runs, one frame at a time‼️
// 2. Microtask queue — where resolved promise callbacks (and code after `await`) wait‼️
// 3. Macrotask queue — where `setTimeout`, I/O callbacks, etc. wait
//
// The rule: the call stack must be completely empty before anything from the microtask queue runs.‼️
//
// What `async` and `await` actually do:
// - `async function` — wraps the return value in a Promise automatically.
// The function body runs SYNCHRONOUSLY until it hits the first `await`.
// - `await x` — does two things:
// 1. Evaluates `x` synchronously (if `x` is a function call, it calls it right now)
// 2. PAUSES the function and schedules everything after the `await` as a microtask (like `.then())
//   Think of `await`as a "pause point" — everything above it is sync, everything below it gets deferred.
//
// Walking through the snippet step by step:
//
// Step 1: console.log('4: script start') — sync, prints immediately → 4
//
// Step 2: foo() is called, enters foo:
//   - console.log('1: foo start') — sync → 1
//   - hits`await bar()`— calls bar() SYNCHRONOUSLY FIRST
//     - enters bar: console.log('3: bar start') → 3
//     - bar returns (implicitly Promise<undefined>)‼️
//   - NOW`await`kicks in: PAUSES foo, schedules the rest of foo
//     (the console.log('2:...')) into the microtask queue
//   - returns control back to the caller (the global script)
//
// Step 3: Back in global script: console.log('5: script end') — sync → 5
//
// Step 4: Call stack is now EMPTY. JS engine checks the microtask queue‼️
//   → finds the continuation of foo → runs console.log('2: foo after await') → 2
//
// Result: 4, 1, 3, 5, 2
//
// The simple rule to remember:
//`await` = "run the thing on the right synchronously, then yield.
// Everything below me becomes a .then() callback."
//
// So this:
// async function foo() {
// A();
// await B();
// C();
// }
// Is essentially:
// function foo() {
// A();
// return B().then(() => {
// C(); // C runs as a microtask, not immediately
// });
// }
// That .then() transformation is why C() always waits until the current
// synchronous call stack finishes.‼️

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

**For prompt #4, here's a strong answer:**‼️

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
   - Return 202 Accepted immediately, process async‼️
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

---

## 22. V8 Engine and libuv — How Node.js Actually Works Under the Hood

**Q: What is V8 and what does it do?**

// V8 is the JavaScript ENGINE — it's the part that reads your JS code and executes it.
// Built by Google (same engine used in Chrome browser).
// Node.js = V8 (JS engine) + libuv (async I/O) + Node APIs (fs, http, crypto, etc.)
//
// What V8 does:
// 1. PARSES your JavaScript code (text → Abstract Syntax Tree)
// 2. COMPILES it to machine code (not interpreted line-by-line like people think!)
// 3. EXECUTES the machine code on your CPU
// 4. Manages MEMORY (garbage collection — automatically frees unused objects)
//
// V8 is what makes JavaScript fast — it uses JIT (Just-In-Time) compilation:
//
// Old way (interpreter):
//   JS code → read line → execute → read next line → execute → slow
//
// V8 way (JIT compiler):
//   JS code → compile ENTIRE function to machine code → execute machine code → FAST
//
// V8 has TWO compilers:
//   1. Ignition (baseline) — quickly compiles to bytecode (fast startup)
//   2. TurboFan (optimizing) — watches which functions run often ("hot" functions),
//      then recompiles them with heavy optimizations (fast execution)
//
// Example:
//   function add(a, b) { return a + b; }
//   // Called once → Ignition compiles to bytecode (quick but not optimized)
//   // Called 10,000 times with numbers → TurboFan recompiles:
//   //   "this function always gets numbers, I'll optimize for number addition"
//   //   → generates specialized machine code that's nearly as fast as C
//
// DEOPTIMIZATION — when V8 guesses wrong:
//   add(1, 2);       // TurboFan: "these are always numbers, optimize!"
//   add("a", "b");   // Wait, strings? → TurboFan DEOPTIMIZES back to generic bytecode
//   // That's why consistent types = faster code in Node.js

**Q: What is libuv and how does it relate to V8?**

// V8 can ONLY run JavaScript — it has NO idea how to do:
//   - File system operations (fs.readFile)
//   - Network requests (http.get)
//   - DNS lookups
//   - Timers (setTimeout)
//   - Child processes
//
// libuv handles ALL of these async operations.
// It's a C library that provides the EVENT LOOP and async I/O for Node.js.
//
// Think of it like this:
//   V8 = the brain (understands JavaScript, runs your code)
//   libuv = the body (talks to the OS, handles files, network, timers)
//
// How they work together:
//
//   Your code: fs.readFile('data.json', callback)
//        │
//        ▼
//   V8 sees fs.readFile → "I don't know how to read files"
//        │
//        ▼
//   Node.js binding layer → sends the request to libuv
//        │
//        ▼
//   libuv → asks the OS to read the file (non-blocking)
//   libuv → puts callback in a queue, continues with other work
//        │
//        ▼ (file read completes)
//   libuv → "file is ready!" → puts callback on the event loop
//        │
//        ▼
//   V8 picks up the callback → executes your function with the file data
//
// libuv provides TWO mechanisms for async I/O:
//
// 1. OS-level async (epoll on Linux, kqueue on Mac, IOCP on Windows)
//    Used for: network I/O (TCP, UDP, HTTP), pipes
//    How: asks the OS "tell me when data is ready" → OS notifies libuv → no threads needed
//
// 2. Thread pool (default 4 threads, configurable via UV_THREADPOOL_SIZE)
//    Used for: file system, DNS lookups, crypto, compression
//    How: libuv hands the work to a thread → thread does blocking work → notifies event loop
//    WHY threads? Some OS operations don't have good async APIs, so libuv uses threads

```
┌─────────────────────────────────────────────────────────┐
│                     NODE.JS ARCHITECTURE                 │
│                                                          │
│  Your JavaScript Code                                    │
│  ─────────────────────                                   │
│         │                                                │
│         ▼                                                │
│  ┌─────────────┐          ┌──────────────────────┐      │
│  │     V8      │          │   Node.js Bindings   │      │
│  │  (JS Engine)│◄────────►│  (C++ glue code)     │      │
│  │             │          │  fs, http, crypto...  │      │
│  │ - Parse JS  │          └──────────┬───────────┘      │
│  │ - Compile   │                     │                   │
│  │ - Execute   │                     ▼                   │
│  │ - GC        │          ┌──────────────────────┐      │
│  └─────────────┘          │       libuv           │      │
│                           │                       │      │
│                           │ ┌───────────────────┐ │      │
│                           │ │    Event Loop      │ │      │
│                           │ │ (single thread)    │ │      │
│                           │ └───────────────────┘ │      │
│                           │                       │      │
│                           │ ┌───────────────────┐ │      │
│                           │ │   Thread Pool      │ │      │
│                           │ │ (4 threads default)│ │      │
│                           │ │ fs, dns, crypto    │ │      │
│                           │ └───────────────────┘ │      │
│                           │                       │      │
│                           │ ┌───────────────────┐ │      │
│                           │ │  OS Async (epoll)  │ │      │
│                           │ │  network I/O       │ │      │
│                           │ └───────────────────┘ │      │
│                           └──────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

// INTERVIEW QUESTION: "Is Node.js single-threaded?"
//
// ANSWER: "Yes AND no.
//   - Your JavaScript code runs on ONE thread (the V8 main thread)
//   - But libuv uses a thread pool (4 threads by default) for file I/O, DNS, crypto
//   - And the OS handles network I/O asynchronously without any threads
//   - So Node.js is single-threaded for YOUR code, but multi-threaded under the hood
//   - If you need CPU-heavy work on multiple threads, use Worker Threads"

---

## 23. SOLID Principles — Object-Oriented Design

// SOLID is a set of 5 design principles that make code easier to maintain, test, and extend.
// Interviewers ask this to see if you write clean, professional code — not just code that works.
// You don't need to memorize definitions — understand WHAT PROBLEM each principle solves.

**S — Single Responsibility Principle (SRP)**

// ONE class/module should do ONE thing.
// If you need to change it for two different reasons, it's doing too much.

```typescript
// ❌ BAD — UserService does EVERYTHING
class UserService {
    createUser(data) { /* save to DB */ }
    sendWelcomeEmail(user) { /* send email */ }
    generateReport(user) { /* create PDF */ }
    validateCreditCard(card) { /* check card */ }
}
// Problem: if email template changes, you're editing the same file as database logic

// ✅ GOOD — each class has ONE job
class UserService {
    createUser(data) { /* save to DB */ }
}
class EmailService {
    sendWelcomeEmail(user) { /* send email */ }
}
class ReportService {
    generateReport(user) { /* create PDF */ }
}
class PaymentService {
    validateCreditCard(card) { /* check card */ }
}
// Now email changes don't risk breaking user creation
```

**O — Open/Closed Principle (OCP)**

// Open for EXTENSION, closed for MODIFICATION.
// Add new behavior WITHOUT changing existing code.

```typescript
// ❌ BAD — adding a new payment method requires modifying existing code
class PaymentProcessor {
    process(method: string, amount: number) {
        if (method === 'credit_card') {
            // process credit card
        } else if (method === 'paypal') {
            // process paypal
        } else if (method === 'crypto') {
            // added later — had to MODIFY this class
        }
    }
}

// ✅ GOOD — add new payment methods without touching existing code
interface PaymentMethod {
    process(amount: number): Promise<void>;
}

class CreditCardPayment implements PaymentMethod {
    async process(amount: number) { /* credit card logic */ }
}
class PayPalPayment implements PaymentMethod {
    async process(amount: number) { /* paypal logic */ }
}
class CryptoPayment implements PaymentMethod {
    async process(amount: number) { /* NEW — no existing code changed */ }
}

class PaymentProcessor {
    async process(method: PaymentMethod, amount: number) {
        await method.process(amount); // works with ANY payment method
    }
}
```

**L — Liskov Substitution Principle (LSP)**

// If class B extends class A, you should be able to use B anywhere A is expected
// WITHOUT breaking anything.

```typescript
// ❌ BAD — Square extends Rectangle but breaks the contract
class Rectangle {
    constructor(public width: number, public height: number) {}
    area() { return this.width * this.height; }
}

class Square extends Rectangle {
    constructor(side: number) {
        super(side, side);
    }
    // Problem: if someone does square.width = 5, height is still the old value
    // Square breaks the Rectangle contract — changing width should be independent of height
}

// ✅ GOOD — use separate classes or a shared interface
interface Shape {
    area(): number;
}
class Rectangle implements Shape {
    constructor(public width: number, public height: number) {}
    area() { return this.width * this.height; }
}
class Square implements Shape {
    constructor(public side: number) {}
    area() { return this.side * this.side; }
}
// Both are Shapes, but neither pretends to be the other
```

**I — Interface Segregation Principle (ISP)**

// Don't force classes to implement methods they don't need.
// Many small, specific interfaces > one big fat interface.

```typescript
// ❌ BAD — one huge interface forces every worker to implement everything
interface Worker {
    work(): void;
    eat(): void;
    sleep(): void;
    attendMeeting(): void;
}
// A Robot worker doesn't eat or sleep — but is forced to implement those methods

// ✅ GOOD — split into small, focused interfaces
interface Workable {
    work(): void;
}
interface Eatable {
    eat(): void;
}
interface Meetable {
    attendMeeting(): void;
}

class HumanWorker implements Workable, Eatable, Meetable {
    work() { /* ... */ }
    eat() { /* ... */ }
    attendMeeting() { /* ... */ }
}
class RobotWorker implements Workable {
    work() { /* ... */ }
    // No eat() or attendMeeting() — robot doesn't need them
}
```

**D — Dependency Inversion Principle (DIP)**

// High-level modules should NOT depend on low-level modules.
// Both should depend on ABSTRACTIONS (interfaces).
// THIS IS EXACTLY WHAT NESTJS DEPENDENCY INJECTION DOES!

```typescript
// ❌ BAD — UserService directly depends on MySQLDatabase
class UserService {
    private db = new MySQLDatabase(); // tightly coupled to MySQL

    findUser(id: string) {
        return this.db.query(`SELECT * FROM users WHERE id = ${id}`);
    }
}
// Problem: can't switch to MongoDB without rewriting UserService
// Problem: can't unit test without a real MySQL database

// ✅ GOOD — depend on an interface, inject the implementation
interface Database {
    findById(table: string, id: string): Promise<any>;
}

class MySQLDatabase implements Database {
    async findById(table: string, id: string) { /* MySQL query */ }
}
class MongoDB implements Database {
    async findById(table: string, id: string) { /* MongoDB query */ }
}

class UserService {
    // Depends on the Database INTERFACE, not a specific implementation
    constructor(private db: Database) {}

    findUser(id: string) {
        return this.db.findById('users', id);
    }
}

// Now you can swap databases:
const userService = new UserService(new MySQLDatabase()); // production
const userService = new UserService(new MockDatabase());  // testing
// UserService code doesn't change at all!

// THIS IS EXACTLY HOW NESTJS WORKS:
// @Injectable() + constructor injection = Dependency Inversion
// You define what you need (interface), NestJS provides it (implementation)
```

// SOLID SUMMARY — one line each:
// S — One class, one job. Don't mix email sending with database queries.
// O — Add features by adding new code, not changing existing code.
// L — Subclasses must work wherever the parent class works.
// I — Small, focused interfaces. Don't force unused methods.
// D — Depend on interfaces, not implementations. (= NestJS DI)
//
// WHAT TO SAY IN INTERVIEW:
// "I follow SOLID principles — for example, in NestJS I use dependency injection
//  which is the D in SOLID. Each service has a single responsibility (S),
//  and I use interfaces so I can swap implementations for testing or when
//  requirements change (O and D). This makes the codebase maintainable
//  as the team and product grow."

---

## 24. ACID — Database Transaction Guarantees

// ACID is a set of 4 properties that guarantee database transactions are reliable.
// When the interviewer asks "how do you ensure data consistency?", ACID is the foundation.
// This is especially important in iGaming — real money is at stake.

**A — Atomicity (All or Nothing)**

// A transaction either COMPLETELY succeeds or COMPLETELY fails.
// There is no "half done" state.

```typescript
// Scenario: Transfer $100 from User A to User B
// Two operations: deduct from A, add to B

// WITHOUT atomicity:
await db.query('UPDATE wallets SET balance = balance - 100 WHERE user_id = "A"'); // ✅ works
// 💥 SERVER CRASHES HERE
await db.query('UPDATE wallets SET balance = balance + 100 WHERE user_id = "B"'); // ❌ never runs
// Result: A lost $100, B got nothing. Money disappeared!

// WITH atomicity (transaction):
await db.query('BEGIN');
await db.query('UPDATE wallets SET balance = balance - 100 WHERE user_id = "A"');
await db.query('UPDATE wallets SET balance = balance + 100 WHERE user_id = "B"');
await db.query('COMMIT');
// If ANYTHING fails between BEGIN and COMMIT → everything is ROLLED BACK
// A still has the $100, B has nothing. No money lost.

// Think of it like: all-or-nothing. Either the whole transfer happens, or none of it does.
```

**C — Consistency (Rules Are Always Followed)**

// The database moves from one VALID state to another VALID state.
// Constraints (foreign keys, unique, check constraints) are never violated.

```typescript
// Example: balance can never go below 0
// ALTER TABLE wallets ADD CONSTRAINT balance_positive CHECK (balance >= 0);

await db.query('BEGIN');
await db.query('UPDATE wallets SET balance = balance - 500 WHERE user_id = "A"');
// If A only has $200, this violates the CHECK constraint
// → transaction is REJECTED, ROLLED BACK automatically
// → A still has $200, nothing changed
await db.query('COMMIT');

// Consistency means: the database will REFUSE to save invalid data
// Even if your code has a bug, the database catches it
```

**I — Isolation (Transactions Don't Interfere)**

// Multiple transactions running at the same time can't see each other's uncommitted changes.
// Each transaction thinks it's the ONLY one running.

```typescript
// Scenario: User A has $100. Two bets placed at the same time:
//
// Transaction 1: Place $70 bet      Transaction 2: Place $60 bet
// READ balance → $100               READ balance → $100
// $100 >= $70 ✅                     $100 >= $60 ✅
// DEDUCT → $30                      DEDUCT → $40
// COMMIT                            COMMIT
// Final balance: $40 (wrong! should have rejected one)
//
// WITH proper isolation:
// Transaction 1: Place $70 bet      Transaction 2: Place $60 bet
// READ balance → $100, LOCK row     WAITING... (row is locked)
// $100 >= $70 ✅                     (still waiting)
// DEDUCT → $30                      (still waiting)
// COMMIT, release lock              NOW reads balance → $30
//                                   $30 >= $60 ❌ REJECTED!
//
// Isolation levels (from least to most strict):
// READ UNCOMMITTED — can see other transactions' uncommitted changes (dirty reads) — almost never used
// READ COMMITTED — only sees committed data — PostgreSQL default
// REPEATABLE READ — same query returns same results within a transaction — MySQL InnoDB default
// SERIALIZABLE — transactions execute as if they ran one at a time — safest but slowest
```

**D — Durability (Committed Data Survives Crashes)**

// Once a transaction is COMMITTED, the data is permanently saved.
// Even if the server crashes 1 millisecond after COMMIT, the data is safe.

```typescript
// How? The database writes to a WAL (Write-Ahead Log) on DISK before confirming COMMIT.
// Even if power goes out:
//   1. Server restarts
//   2. Database reads the WAL
//   3. Replays any committed transactions that weren't fully written to data files
//   4. Your data is intact

// This is why databases are slower than in-memory stores like Redis:
// Database: writes to disk → guaranteed durability → slower
// Redis: writes to memory → can lose data on crash → faster
// That's why we use MySQL for money/bets and Redis for caching/sessions
```

// ACID SUMMARY:
// A — All or nothing. Transaction either fully completes or fully rolls back.
// C — Rules (constraints) are always enforced. No invalid data ever saved.
// I — Concurrent transactions don't interfere with each other.
// D — Once committed, data survives any crash.
//
// WHAT TO SAY IN INTERVIEW:
// "For financial data like user balances and bet records, I use MySQL with
//  ACID transactions. Atomicity ensures a balance deduction and bet creation
//  happen together or not at all. Isolation with row locking prevents
//  double-spending. For non-critical data like analytics or caching,
//  I use Redis or MongoDB where strict ACID isn't necessary."

---

## 25. Coupling and Cohesion

// These two concepts describe how well your code is organized.
// COUPLING = how much modules DEPEND on each other (want LOW)
// COHESION = how related the things inside a module are (want HIGH)
//
// Goal: LOW coupling, HIGH cohesion

**Coupling — How Much Modules Depend on Each Other**

```typescript
// ❌ TIGHT COUPLING — modules are tangled together
// Changing one breaks the other

class OrderService {
    private db = new MySQLDatabase();        // directly creates its own database
    private email = new SendGridEmailer();   // directly creates its own emailer
    private payment = new StripePayment();   // directly creates its own payment

    async createOrder(data) {
        const order = await this.db.query('INSERT INTO orders ...');
        await this.payment.charge(data.card, data.amount);  // knows Stripe's API
        await this.email.send(data.email, 'Order confirmed'); // knows SendGrid's API
    }
}

// Problems:
// - Can't switch from Stripe to PayPal without rewriting OrderService
// - Can't test OrderService without real database, real Stripe, real SendGrid
// - If Stripe changes their API, OrderService breaks
// - OrderService knows TOO MUCH about other modules' internals

// ✅ LOOSE COUPLING — modules communicate through interfaces

interface PaymentProvider {
    charge(amount: number): Promise<void>;
}
interface EmailProvider {
    send(to: string, body: string): Promise<void>;
}

@Injectable()
class OrderService {
    constructor(
        private payment: PaymentProvider,  // doesn't know if it's Stripe or PayPal
        private email: EmailProvider,      // doesn't know if it's SendGrid or Mailgun
        private orderRepo: OrderRepository,
    ) {}

    async createOrder(data) {
        const order = await this.orderRepo.save(data);
        await this.payment.charge(data.amount);
        await this.email.send(data.email, 'Order confirmed');
    }
}

// Now:
// - Switch from Stripe to PayPal → just provide a different PaymentProvider implementation
// - Test with mocks → inject MockPaymentProvider
// - OrderService doesn't know or care about implementation details
// - THIS IS EXACTLY WHAT NESTJS DI DOES — and it's also the D in SOLID
```

**Cohesion — How Related Things Are Inside a Module**

```typescript
// ❌ LOW COHESION — module does unrelated things
// "God class" that handles everything

class AppService {
    createUser() { /* user logic */ }
    processPayment() { /* payment logic */ }
    sendEmail() { /* email logic */ }
    generateReport() { /* report logic */ }
    resizeImage() { /* image logic */ }
}
// These are 5 completely unrelated responsibilities crammed into one class

// ✅ HIGH COHESION — module does ONE related set of things

class UserService {
    createUser() { /* ... */ }
    updateUser() { /* ... */ }
    deleteUser() { /* ... */ }
    findUserById() { /* ... */ }
}
// Everything in UserService is about USERS — highly cohesive

class PaymentService {
    processPayment() { /* ... */ }
    refundPayment() { /* ... */ }
    getPaymentHistory() { /* ... */ }
}
// Everything in PaymentService is about PAYMENTS — highly cohesive
```

// HOW COUPLING AND COHESION RELATE:
//
// | Coupling | Cohesion | Result                                               |
// |----------|----------|------------------------------------------------------|
// | LOW      | HIGH     | ✅ IDEAL — clean, maintainable, testable code         |
// | LOW      | LOW      | Modules are independent but internally disorganized  |
// | HIGH     | HIGH     | Modules are focused but tangled with each other      |
// | HIGH     | LOW      | ❌ WORST — messy "spaghetti code", untestable         |
//
// IN NESTJS TERMS:
// - Each Module (UsersModule, PaymentsModule) = HIGH cohesion (one feature per module)
// - Modules communicate via exports/imports + DI = LOW coupling (interfaces, not implementations)
// - This is WHY NestJS forces the module structure — it naturally achieves low coupling + high cohesion
//
// WHAT TO SAY IN INTERVIEW:
// "I aim for low coupling and high cohesion. In NestJS, each module handles one
//  domain (users, payments, notifications) with high cohesion. Modules communicate
//  through exported services and dependency injection, keeping coupling low.
//  This makes it easy to test modules in isolation and swap implementations."

---

## 26. Microservices Communication Patterns

**Q: How do microservices communicate with each other?**

// There are 3 main patterns. Each has its use case.

**1. Synchronous — REST / HTTP (request-response)**

```typescript
// Service A makes an HTTP call to Service B and WAITS for the response

// Bet Service needs user's balance from Wallet Service:
@Injectable()
class BetService {
    constructor(private httpService: HttpService) {}

    async placeBet(userId: string, amount: number) {
        // Synchronous call — Bet Service WAITS for Wallet Service to respond
        const { data: wallet } = await this.httpService.axiosRef.get(
            `http://wallet-service:3001/wallets/${userId}`,
        );

        if (wallet.balance < amount) {
            throw new Error('Insufficient funds');
        }
        // ... proceed with bet
    }
}

// PROS:
// - Simple to understand and implement
// - Immediate response — know right away if it worked
// - Easy to debug — follow the HTTP calls
//
// CONS:
// - TIGHT COUPLING — Bet Service must know Wallet Service's URL and API
// - If Wallet Service is down, Bet Service FAILS
// - Latency adds up — each call adds network round-trip time
// - CASCADING FAILURES — if one service is slow, it slows down everything calling it
```

**2. Asynchronous — Message Broker (fire-and-forget)**

```typescript
// Service A publishes a message and DOESN'T WAIT for a response
// (This is the event-driven pattern we covered in Section 9)

@Injectable()
class BetService {
    constructor(@Inject('RABBITMQ') private client: ClientProxy) {}

    async placeBet(userId: string, amount: number) {
        // ... create the bet ...

        // Fire and forget — Bet Service doesn't wait for a response
        this.client.emit('bet.placed', { userId, betId: bet.id, amount });
        // Notification Service, Analytics Service, etc. will pick this up
    }
}

// PROS:
// - LOOSE COUPLING — producer doesn't know who the consumers are
// - RESILIENT — if a consumer is down, messages wait in the queue
// - SCALABLE — add more consumers without changing the producer
//
// CONS:
// - No immediate response — you don't know if the consumer succeeded
// - Harder to debug — messages are invisible, need distributed tracing
// - Eventual consistency — data might be out of sync for a moment
```

**3. Hybrid — RPC over Message Broker (request-response via queue)**

```typescript
// Like REST but through a message broker — best of both worlds
// NestJS supports this natively with client.send() (vs client.emit())

@Injectable()
class BetService {
    constructor(@Inject('RABBITMQ') private client: ClientProxy) {}

    async getUserBalance(userId: string): Promise<number> {
        // send() = request-response pattern (waits for reply)
        // emit() = fire-and-forget pattern (no reply)
        const balance = await firstValueFrom(
            this.client.send('wallet.getBalance', { userId }),
        );
        return balance;
    }
}

// Wallet Service responds to the request:
@Controller()
class WalletController {
    @MessagePattern('wallet.getBalance')  // responds to requests (not @EventPattern)
    getBalance(data: { userId: string }): number {
        return this.walletService.getBalance(data.userId);
    }
}

// PROS:
// - Request-response like REST, but through a message broker
// - Broker handles load balancing, retry, and failover
// - Services don't need to know each other's URLs
//
// CONS:
// - More complex than direct HTTP
// - Still synchronous (caller waits for response)
```

// WHEN TO USE WHICH:
// | Pattern          | Use when                                           | iGaming example                    |
// |------------------|----------------------------------------------------|------------------------------------|
// | REST (HTTP)      | Need immediate response, simple CRUD               | GET /users/:id, GET /bets/:id      |
// | Message (emit)   | Side effects, notifications, analytics             | bet.placed → notify + audit        |
// | RPC over broker  | Need response but want broker benefits             | Check balance before placing bet   |
//
// IN PRACTICE: most systems use ALL THREE:
// - REST for client-facing APIs (user's browser → your API)
// - Message broker for service-to-service side effects (bet placed → notify)
// - RPC for service-to-service queries that need a response (check balance)

---

## 27. Debugging Microservices When There Are No Logs

**Q: A microservice is failing in production but there are no logs. How do you debug?**

// This is a REAL interview question — it tests your systematic debugging approach.
// Don't panic. Follow this step-by-step process.

**Step 1: Check if it's actually your service**

```
// Before debugging YOUR code, verify the problem is where you think it is:

// Is the service running?
kubectl get pods -n production | grep bet-service
docker ps | grep bet-service

// Is it reachable?
curl -v http://bet-service:3000/health
// If health check fails → the service isn't even running
// Check: did it crash? OOM killed? Failed deployment?

// Is it the right version?
kubectl describe pod bet-service-xxx | grep Image
// Maybe an old version was deployed
```

**Step 2: Check infrastructure metrics (no logs needed)**

```
// Even without application logs, you can check:

// 1. CPU and Memory — is the service overloaded?
kubectl top pods -n production
// If CPU is at 100% → infinite loop or CPU-intensive operation
// If memory keeps growing → memory leak

// 2. Network — is the service receiving requests?
// Check load balancer / ingress metrics
// If requests are 0 → problem is upstream (DNS, routing, load balancer)
// If requests are high + errors → service is overwhelmed

// 3. Database connections — is the DB reachable?
// Check database connection pool metrics
// Check if max connections are reached
// mysql -h db-host -u user -p -e "SHOW STATUS LIKE 'Threads_connected';"

// 4. Message queue — are messages piling up?
// RabbitMQ management UI: check queue depth
// If queue depth is growing → consumers are dead or too slow
```

**Step 3: Check external dependencies**

```
// Your service might be fine — but something it DEPENDS on is broken:

// Database down?
mysql -h db-host -u user -p -e "SELECT 1;"

// Redis down?
redis-cli -h redis-host ping

// Another microservice down?
curl http://wallet-service:3001/health
curl http://notification-service:3002/health

// DNS resolution working?
nslookup wallet-service
// If DNS fails → services can't find each other

// Certificate expired?
openssl s_client -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Step 4: Add emergency logging / enable debug mode**

```typescript
// If there are truly NO logs, you need to ADD them:

// Option 1: Environment variable to enable debug logging
// Set LOG_LEVEL=debug in production (temporarily)
// Most logging frameworks (pino, winston) support runtime log level changes

// Option 2: Attach to the running container
kubectl exec -it bet-service-xxx -- /bin/sh
// Now you're inside the container — check:
//   - Are log files being written but not shipped to your log aggregator?
//   - Is the disk full? (df -h)
//   - Are environment variables correct? (env | grep DB)

// Option 3: Port-forward and test locally
kubectl port-forward pod/bet-service-xxx 3000:3000
// Now you can hit the service directly from your machine
curl http://localhost:3000/bets
// See what error you get
```

**Step 5: Distributed tracing (the real answer for production)**

```
// If you have OpenTelemetry / Jaeger / Datadog set up:

// 1. Find the failing request's trace ID
// 2. Follow the trace across services:
//    Client → API Gateway → Bet Service → Wallet Service → Database
//    ✅         ✅            ✅            ❌ (timeout here!)
// 3. Now you know: Wallet Service is the problem, not Bet Service

// If you DON'T have distributed tracing set up:
// → Add correlation IDs to all requests
// Each request gets a unique ID that's passed through every service call
// When something fails, grep for that ID across all service logs
```

**Step 6: Reproduce locally**

```
// If all else fails, reproduce the issue locally:

// 1. Pull the same Docker image running in production
docker pull registry.company.com/bet-service:v2.3.1

// 2. Run it with the same environment variables
docker run -e DB_HOST=... -e REDIS_HOST=... bet-service:v2.3.1

// 3. Send the same request that's failing
curl -X POST http://localhost:3000/bets -d '{"matchId": "123", "amount": 50}'

// 4. Now you have full access to logs, debugger, and can add breakpoints
```

// WHAT TO SAY IN INTERVIEW:
// "First, I'd verify the service is actually running and reachable — health checks,
//  pod status, network connectivity. Then I'd check infrastructure metrics:
//  CPU, memory, database connections, queue depth — these don't need application logs.
//  Next, I'd check external dependencies — is the database reachable? Is Redis up?
//  If the issue is still unclear, I'd enable debug logging temporarily or attach
//  to the container. Long-term, I'd ensure we have distributed tracing with
//  OpenTelemetry and correlation IDs, so we can follow requests across services.
//  The key is systematic elimination — rule out infrastructure, then dependencies,
//  then narrow down to the specific code."

---

## 28. Database Locks — Types, Problems, and How to Resolve Them

**What are database locks?**

// Locks prevent multiple transactions from corrupting data when they access the same rows.
// Without locks → race conditions → data corruption.
// With locks → one transaction waits for another → data is safe.
//
// Think of it like a bathroom door:
// Unlocked = anyone can walk in (data corruption risk)
// Locked = one person at a time (safe, but others wait)

**Two main types of locks:**

```
// 1. SHARED LOCK (Read Lock) — "I'm reading, others can read too, but nobody writes"
//    Multiple transactions can hold shared locks on the same row
//    SELECT ... LOCK IN SHARE MODE (MySQL)
//
//    Transaction A: reads row → shared lock ✅
//    Transaction B: reads row → shared lock ✅ (both can read)
//    Transaction C: tries to UPDATE row → ❌ BLOCKED (must wait for A and B to finish)

// 2. EXCLUSIVE LOCK (Write Lock) — "I'm writing, nobody else can read OR write"
//    Only ONE transaction can hold an exclusive lock
//    SELECT ... FOR UPDATE (MySQL)
//
//    Transaction A: updates row → exclusive lock ✅
//    Transaction B: tries to READ row → ❌ BLOCKED (must wait)
//    Transaction C: tries to UPDATE row → ❌ BLOCKED (must wait)
```

**Optimistic vs Pessimistic Locking:**

```typescript
// PESSIMISTIC LOCKING — lock the row BEFORE doing anything (SELECT ... FOR UPDATE)

async function deductBalance(userId: string, amount: number) {
    await db.query('BEGIN');

    // Lock the row — nobody else can read or write this row until we COMMIT
    const [wallet] = await db.query(
        'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [userId],
    );

    if (wallet.balance < amount) {
        await db.query('ROLLBACK');
        throw new Error('Insufficient funds');
    }

    await db.query(
        'UPDATE wallets SET balance = balance - ? WHERE user_id = ?',
        [amount, userId],
    );

    await db.query('COMMIT');  // releases the lock
}

// PROS: guaranteed to work, no retries needed
// CONS: blocks other transactions → lower throughput under high load
// USE WHEN: conflicts are FREQUENT (same row updated often)

// ─────────────────────────────────────────────────────────────

// OPTIMISTIC LOCKING — don't lock, just check if anything changed (version number)

async function deductBalanceOptimistic(userId: string, amount: number) {
    // Read current state (no lock)
    const [wallet] = await db.query(
        'SELECT balance, version FROM wallets WHERE user_id = ?',
        [userId],
    );

    if (wallet.balance < amount) {
        throw new Error('Insufficient funds');
    }

    // Update ONLY IF version hasn't changed
    const result = await db.query(
        'UPDATE wallets SET balance = balance - ?, version = version + 1 WHERE user_id = ? AND version = ?',
        [amount, userId, wallet.version],
    );

    if (result.affectedRows === 0) {
        // Someone else modified the row between our SELECT and UPDATE
        // RETRY the whole operation
        throw new Error('Concurrent modification — retry');
    }
}

// PROS: no blocking → higher throughput
// CONS: must handle retries in your code
// USE WHEN: conflicts are RARE (different users, different rows)
```

**The DEADLOCK Problem — Two Locks Blocking Each Other:**

```
// Deadlock = two transactions each hold a lock the other needs
// Neither can proceed → both wait forever

// Transaction A:                        Transaction B:
// 1. Lock Row X (wallet A) ✅          1. Lock Row Y (wallet B) ✅
// 2. Try to lock Row Y (wallet B) ❌   2. Try to lock Row X (wallet A) ❌
//    BLOCKED — B holds Y                   BLOCKED — A holds X
//
// A waits for B. B waits for A. Nobody can proceed. DEADLOCK!

// REAL EXAMPLE — Transfer money between two users:
// Transfer $50 from A to B:
//   Lock A's wallet → Deduct $50 → Lock B's wallet → Add $50
//
// At the SAME TIME, transfer $30 from B to A:
//   Lock B's wallet → Deduct $30 → Lock A's wallet → Add $30
//
// Both lock their first row successfully.
// Both try to lock the other's row → DEADLOCK!
```

**How to RESOLVE and PREVENT deadlocks:**

```typescript
// SOLUTION 1: Always lock rows in the SAME ORDER
// If you always lock the LOWER user_id first, deadlocks can't happen

async function transfer(fromId: string, toId: string, amount: number) {
    await db.query('BEGIN');

    // Always lock in consistent order (by user_id)
    const [firstId, secondId] = fromId < toId ? [fromId, toId] : [toId, fromId];

    // Lock both rows in the same order — no deadlock possible
    await db.query('SELECT * FROM wallets WHERE user_id = ? FOR UPDATE', [firstId]);
    await db.query('SELECT * FROM wallets WHERE user_id = ? FOR UPDATE', [secondId]);

    // Now safely do the transfer
    await db.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [amount, fromId]);
    await db.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, toId]);

    await db.query('COMMIT');
}

// WHY this works:
// Transfer A→B: locks A first, then B
// Transfer B→A: ALSO locks A first (because A < B), then B
// Same order → no circular dependency → no deadlock

// ─────────────────────────────────────────────────────────────

// SOLUTION 2: Set a lock timeout
// If a lock can't be acquired within X seconds, give up and retry

await db.query('SET innodb_lock_wait_timeout = 5'); // 5 seconds max
// If blocked for more than 5 seconds → throws error → your code catches and retries

// ─────────────────────────────────────────────────────────────

// SOLUTION 3: Use optimistic locking instead (no locks at all)
// If deadlocks are frequent, switch to version-based optimistic locking
// (See optimistic locking example above)
// No locks = no deadlocks, but you must handle retries

// ─────────────────────────────────────────────────────────────

// SOLUTION 4: Keep transactions SHORT
// The longer a transaction holds locks, the higher the chance of deadlock

// ❌ BAD — long transaction
await db.query('BEGIN');
await db.query('SELECT ... FOR UPDATE');   // lock acquired
await callExternalAPI();                    // slow network call — lock held for seconds!
await db.query('UPDATE ...');
await db.query('COMMIT');                   // lock released after API call

// ✅ GOOD — keep lock duration minimal
const data = await callExternalAPI();       // do slow work BEFORE the transaction
await db.query('BEGIN');
await db.query('SELECT ... FOR UPDATE');    // lock acquired
await db.query('UPDATE ...');               // immediate update
await db.query('COMMIT');                   // lock released quickly
```

**Other common lock problems:**

```
// LOCK CONTENTION — too many transactions trying to lock the same row
// Symptom: slow queries, high wait times
// Solution: split hot rows (e.g., instead of one global counter row,
//           use multiple counter rows and sum them)

// LOCK ESCALATION — database converts many row locks to a table lock
// Symptom: suddenly the entire table is locked, everything blocks
// Solution: smaller transactions, fewer rows locked at once, proper indexing

// PHANTOM READS — you lock rows matching a WHERE clause, but new rows are inserted
// that also match the clause (they weren't locked because they didn't exist yet)
// Solution: use SERIALIZABLE isolation level or gap locks (MySQL InnoDB does this automatically
// at REPEATABLE READ level)
```

// SUMMARY — Database Locks:
// | Type              | How it works                    | Use when                        |
// |-------------------|---------------------------------|---------------------------------|
// | Shared (read)     | Multiple readers, no writers    | Reading data that shouldn't change |
// | Exclusive (write) | One writer, no readers          | Updating data                   |
// | Pessimistic       | Lock BEFORE operating           | High conflict (same row often)  |
// | Optimistic        | Check version AFTER operating   | Low conflict (rare same row)    |
//
// DEADLOCK PREVENTION:
// 1. Always lock in consistent order
// 2. Set lock timeouts
// 3. Keep transactions short
// 4. Consider optimistic locking
//
// WHAT TO SAY IN INTERVIEW:
// "For financial data like wallet balances, I use pessimistic locking with
//  SELECT FOR UPDATE to prevent double-spending. For less critical data,
//  I use optimistic locking with version numbers for better throughput.
//  To prevent deadlocks, I always acquire locks in a consistent order
//  and keep transactions as short as possible — do any slow work like
//  API calls OUTSIDE the transaction."
