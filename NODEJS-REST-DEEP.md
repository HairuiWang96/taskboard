# Node.js & REST APIs — Senior Developer Deep Reference

> Covers Node.js internals, Fastify, API design, security, performance, and production patterns.

---

## Table of Contents

1. [Node.js Internals](#1-nodejs-internals)
2. [Streams](#2-streams)
3. [Worker Threads & Child Processes](#3-worker-threads--child-processes)
4. [Fastify — Deep Dive](#4-fastify--deep-dive)
5. [Middleware & Plugin Architecture](#5-middleware--plugin-architecture)
6. [Validation & Serialization](#6-validation--serialization)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Error Handling](#8-error-handling)
9. [Logging & Observability](#9-logging--observability)
10. [Database Patterns](#10-database-patterns)
11. [REST API Design — Advanced](#11-rest-api-design--advanced)
12. [Performance & Scaling](#12-performance--scaling)
13. [Testing Node.js APIs](#13-testing-nodejs-apis)
14. [Production Readiness](#14-production-readiness)
15. [Common Interview Questions](#15-common-interview-questions)

---

## 1. Node.js Internals

### Architecture overview

```text
Node.js = V8 (JS engine) + libuv (async I/O) + Node.js APIs

libuv provides:
  - Event loop
  - Thread pool (default 4 threads) for CPU or blocking I/O:
    fs.readFile, crypto, dns.lookup, some zlib operations
  - Non-blocking I/O for network (epoll/kqueue/IOCP)

The event loop phases (in order):
  1. timers:       setTimeout, setInterval callbacks
  2. pending I/O:  I/O callbacks from previous iteration
  3. idle/prepare: internal
  4. poll:         NEW I/O events (most of your callbacks run here)
  5. check:        setImmediate callbacks
  6. close:        socket close callbacks

Between each phase:
  process.nextTick() queue drains (runs before Promises)
  Promise micro-task queue drains
```

### process.nextTick vs setImmediate vs setTimeout(fn, 0)

```js
setImmediate(() => console.log('setImmediate'));
setTimeout(() => console.log('setTimeout 0'), 0);
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));

// Output order: nextTick, promise, setTimeout 0 OR setImmediate (non-deterministic outside I/O)

// Inside an I/O callback:
fs.readFile('file', () => {
  setTimeout(() => console.log('setTimeout'));   // next timers phase
  setImmediate(() => console.log('setImmediate')); // current check phase — ALWAYS first
  process.nextTick(() => console.log('nextTick')); // before next phase — FIRST
});
// Order: nextTick, setImmediate, setTimeout
```

### Thread pool

```js
// CPU-intensive work blocks the event loop — offload to thread pool
const crypto = require('crypto');

// Blocking (bad for server performance):
const hash = crypto.createHash('sha256').update(data).digest('hex');

// Async (uses thread pool):
crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => {
  // runs in thread pool, callback fires when done
});

// Increase thread pool size for CPU-heavy apps:
process.env.UV_THREADPOOL_SIZE = '8'; // must be set before libuv loads (very top of entry)

// Worker threads (better than thread pool for sustained CPU work):
// See section 3
```

### Memory and garbage collection

```text
V8 heap:
  New space (nursery):  young objects, GC'd frequently (~1ms pause)
  Old space:            survived GC, collected infrequently (~100ms pause)
  Code space:           compiled code
  Large object space:   objects > 1MB — not compacted

Default heap limit: ~1.5GB (32-bit), ~4GB (64-bit)
Increase for memory-intensive apps:
  node --max-old-space-size=4096 server.js  (4GB)

Memory leak indicators:
  process.memoryUsage().heapUsed keeps growing
  GC pauses getting longer (visible in metrics)
  EventEmitter warnings: "MaxListenersExceededWarning"

Common leak sources:
  - Event listeners not removed (use emitter.removeListener or once())
  - Global caches growing without eviction
  - Closures holding large objects
  - Stream not consumed (backpressure not handled)
```

---

## 2. Streams

### Why streams?

```text
Problem: reading a 1GB file into memory crashes the process
  const data = fs.readFileSync('huge.csv'); // 1GB in RAM → OOM

Solution: streams — process data in chunks
  fs.createReadStream('huge.csv')
    .pipe(csvParser())
    .pipe(processRows())
    .pipe(writeToDb());
  // Only a few KB in memory at any time
```

### Stream types

```js
const { Readable, Writable, Transform, Duplex, pipeline } = require('stream');

// Readable — produces data
const readable = new Readable({
  read(size) { // called when consumer wants data
    this.push('chunk of data');
    this.push(null); // signal end of stream
  }
});

// Writable — consumes data
const writable = new Writable({
  write(chunk, encoding, callback) {
    console.log('received:', chunk.toString());
    callback(); // call when done — signals ready for more
    // callback(error) — to propagate errors
  }
});

// Transform — transforms data (both readable and writable)
const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

// Pipeline — safe pipe with error propagation (use instead of .pipe())
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

await pipelineAsync(
  fs.createReadStream('input.csv'),
  upperCase,
  fs.createWriteStream('output.csv')
);
// Any error in any stage propagates, all streams cleaned up
```

### Backpressure

```js
// Backpressure: readable produces faster than writable can consume
// Without handling: data buffers in memory → OOM

// readable.pipe(writable) handles backpressure automatically
// writable.write() returns false when buffer is full — stop reading
// writable emits 'drain' when buffer is empty — resume reading

readable.on('data', (chunk) => {
  const canContinue = writable.write(chunk);
  if (!canContinue) {
    readable.pause(); // stop reading — writable is full
    writable.once('drain', () => readable.resume()); // resume when drained
  }
});

// Async iteration handles backpressure naturally
for await (const chunk of readable) {
  await processChunk(chunk); // backpressure: loop waits for processing
}
```

---

## 3. Worker Threads & Child Processes

### Worker threads

```js
// Worker threads: run JS in parallel threads — shared memory via SharedArrayBuffer
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

// In main thread:
if (isMainThread) {
  const worker = new Worker('./worker.js', {
    workerData: { items: hugeArray }
  });

  worker.on('message', (result) => console.log('done:', result));
  worker.on('error', (err) => console.error(err));
  worker.on('exit', (code) => console.log(`Worker exited: ${code}`));
}

// In worker.js:
if (!isMainThread) {
  const result = expensiveComputation(workerData.items);
  parentPort.postMessage(result);
}

// Worker pool pattern (for repeated CPU work):
import Piscina from 'piscina'; // worker pool library

const pool = new Piscina({ filename: './worker.js', maxThreads: 4 });
const result = await pool.run({ items: data }); // queues work, runs in pool
```

### Child processes

```js
import { exec, execFile, spawn, fork } from 'child_process';

// exec: run shell command, buffer output (small outputs)
exec('ls -la', (err, stdout, stderr) => {
  if (err) throw err;
  console.log(stdout);
});

// spawn: streaming output (large outputs, long-running)
const ls = spawn('ls', ['-la']);
ls.stdout.pipe(process.stdout);
ls.stderr.pipe(process.stderr);

// fork: special spawn for Node.js scripts — built-in IPC channel
const child = fork('./worker.js');
child.send({ task: 'compute', data: payload }); // IPC message
child.on('message', (result) => console.log(result));

// Use cases:
// exec/execFile: run external tools (git, ffmpeg, pdflatex)
// spawn: stream output from external process
// fork: run another Node.js script with communication
// Worker threads: CPU work in same process, shared memory possible
```

---

## 4. Fastify — Deep Dive

### Plugin system & encapsulation

```ts
import Fastify, { FastifyPluginAsync } from 'fastify';

// Fastify encapsulates plugins — decorators, hooks, routes don't leak by default
// Use fastify-plugin to break encapsulation (share across the whole app)
import fp from 'fastify-plugin';

// This plugin is ENCAPSULATED — its decorators only visible to children
const encapsulated: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('myUtil', () => 'hello'); // only visible within this scope
};

// This plugin BREAKS encapsulation — decorators visible to all
const shared = fp(async (fastify) => {
  fastify.decorate('db', databaseConnection); // visible everywhere after registration
});

const app = Fastify();
await app.register(shared);    // db available everywhere
await app.register(encapsulated); // myUtil only inside encapsulated scope
```

### Lifecycle hooks

```ts
// Request lifecycle order:
// onRequest → preParsing → preValidation → preHandler → handler → preSerialization → onSend → onResponse

// onRequest: runs before body parsing — good for rate limiting, auth header check
fastify.addHook('onRequest', async (request, reply) => {
  if (!request.headers.authorization) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
});

// preValidation: runs before schema validation — good for transforming input
fastify.addHook('preValidation', async (request, reply) => {
  if (request.body && typeof request.body === 'string') {
    request.body = JSON.parse(request.body);
  }
});

// preHandler: runs after validation — good for auth/permission checks
fastify.addHook('preHandler', async (request, reply) => {
  const user = await verifyToken(request.headers.authorization);
  request.user = user; // attach to request for handler to use
});

// onSend: runs before response is sent — good for modifying response headers
fastify.addHook('onSend', async (request, reply, payload) => {
  reply.header('X-Request-Id', request.id);
  return payload; // must return payload (can transform it)
});

// onResponse: runs after response is sent — good for logging, metrics
fastify.addHook('onResponse', async (request, reply) => {
  metrics.recordDuration(reply.elapsedTime);
});
```

### Decorators — extending Fastify

```ts
// Decorate the fastify instance, request, or reply

// Instance decorator: share services across all routes
fastify.decorate('db', drizzleClient);
fastify.decorate('redis', redisClient);
fastify.decorate('config', appConfig);

// Type augmentation so TypeScript knows about decorators
declare module 'fastify' {
  interface FastifyInstance {
    db: DrizzleClient;
    redis: RedisClient;
    config: AppConfig;
  }
  interface FastifyRequest {
    user: { id: string; role: string };
    correlationId: string;
  }
}

// Use in routes
fastify.get('/users', async (request) => {
  const users = await request.server.db.select().from(usersTable);
  return users;
});
```

### Route options and schemas

```ts
import { Type, Static } from '@sinclair/typebox'; // Fastify's recommended schema library

const CreateUserBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String({ format: 'email' }),
  role: Type.Union([Type.Literal('admin'), Type.Literal('user')]),
});

const UserResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  email: Type.String(),
  role: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
});

type CreateUserBody = Static<typeof CreateUserBody>;

fastify.post<{ Body: CreateUserBody }>('/users', {
  schema: {
    body: CreateUserBody,
    response: {
      201: UserResponse, // validates AND fast-serializes the response
    },
    tags: ['users'],
    summary: 'Create a new user',
    security: [{ bearerAuth: [] }],
  },
  preHandler: [requireRole('admin')],
  handler: async (request, reply) => {
    const user = await createUser(request.body);
    return reply.code(201).send(user);
  },
});
```

---

## 5. Middleware & Plugin Architecture

### Scoped plugins

```ts
// Group related routes with shared prefix, hooks, and config
const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Hook only applies to routes registered in this plugin
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/', listUsers);
  fastify.get('/:id', getUser);
  fastify.post('/', createUser);
  fastify.patch('/:id', updateUser);
  fastify.delete('/:id', deleteUser);
};

// Route grouping with different auth requirements
const app = Fastify();
app.register(userRoutes, { prefix: '/api/users' });
app.register(publicRoutes, { prefix: '/api/public' }); // no auth hook
app.register(adminRoutes, { prefix: '/api/admin' });   // admin auth hook
```

### Rate limiting plugin

```ts
import rateLimit from '@fastify/rate-limit';
import Redis from 'ioredis';

await app.register(rateLimit, {
  global: false, // don't apply to all routes by default
  redis: new Redis(), // Redis-backed for multi-server consistency
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.user?.id ?? request.ip, // rate limit per user
  errorResponseBuilder: (request, context) => ({
    error: 'Too Many Requests',
    retryAfter: Math.ceil(context.ttl / 1000),
  }),
});

// Apply per route
fastify.post('/auth/login', {
  config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }, // strict for login
  handler: loginHandler,
});
```

---

## 6. Validation & Serialization

### Fastify's validation pipeline

```text
Request body → JSON.parse → Schema validation (ajv) → Handler
Response object → Schema serialization (fast-json-stringify) → JSON string → Send

Benefits:
  - Invalid requests rejected before reaching handler (400 automatic)
  - Response serialization: 2-3x faster than JSON.stringify (schema-aware)
  - Response schema strips extra fields (security — no accidental data leaks)
```

### Custom validators

```ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ coerceTypes: true, removeAdditional: true });
addFormats(ajv); // adds email, uri, date, uuid formats

// Add custom format
ajv.addFormat('phone', {
  type: 'string',
  validate: (value) => /^\+?[\d\s-()]+$/.test(value),
});

// Register with Fastify
fastify.setValidatorCompiler(({ schema }) => ajv.compile(schema));

// Zod as alternative validator
import { z } from 'zod';

fastify.post('/users', async (request, reply) => {
  const result = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }).safeParse(request.body);

  if (!result.success) {
    return reply.code(400).send({
      error: 'Validation failed',
      details: result.error.flatten(),
    });
  }

  return createUser(result.data);
});
```

---

## 7. Authentication & Authorization

### JWT implementation

```ts
import jwt from '@fastify/jwt';

// Register JWT plugin
await app.register(jwt, {
  secret: process.env.JWT_SECRET,
  sign: { expiresIn: '15m' },   // access token: short-lived
  verify: { maxAge: '15m' },
});

// Login endpoint
fastify.post<{ Body: { email: string; password: string } }>('/auth/login', async (request, reply) => {
  const { email, password } = request.body;
  const user = await findUserByEmail(email);

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const accessToken = app.jwt.sign({ sub: user.id, role: user.role });
  const refreshToken = crypto.randomBytes(64).toString('hex');

  // Store refresh token hash in DB
  await storeRefreshToken(user.id, await bcrypt.hash(refreshToken, 10));

  // Set refresh token in httpOnly cookie (not localStorage)
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,    // no JS access
    secure: true,      // HTTPS only
    sameSite: 'strict', // CSRF protection
    path: '/auth',     // only sent to /auth routes
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return { accessToken };
});

// Token refresh
fastify.post('/auth/refresh', async (request, reply) => {
  const refreshToken = request.cookies.refreshToken;
  if (!refreshToken) return reply.code(401).send({ error: 'No refresh token' });

  const tokenRecord = await findRefreshToken(refreshToken);
  if (!tokenRecord || tokenRecord.revokedAt) {
    return reply.code(401).send({ error: 'Invalid refresh token' });
  }

  // Rotate: invalidate old, issue new
  await revokeRefreshToken(refreshToken);
  const newRefreshToken = crypto.randomBytes(64).toString('hex');
  await storeRefreshToken(tokenRecord.userId, newRefreshToken);

  const accessToken = app.jwt.sign({ sub: tokenRecord.userId });

  reply.setCookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true });
  return { accessToken };
});

// Auth hook
const authenticate: FastifyPluginAsync = fp(async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify(); // verifies Bearer token, sets request.user
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
```

### RBAC (Role-Based Access Control)

```ts
// Middleware factory for role checking
function requireRole(...roles: string[]): preHandlerHookHandler {
  return async (request, reply) => {
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Requires one of: ${roles.join(', ')}`,
      });
    }
  };
}

// Route-level: applied to specific routes
fastify.delete('/users/:id', {
  preHandler: [authenticate, requireRole('admin')],
  handler: deleteUser,
});

// Resource ownership: users can only modify their own data
async function requireOwnerOrAdmin(request: FastifyRequest<{ Params: { id: string } }>, reply) {
  const { id } = request.params;
  if (request.user.role === 'admin') return; // admins bypass
  if (request.user.sub !== id) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
}
```

---

## 8. Error Handling

### Global error handler

```ts
fastify.setErrorHandler((error, request, reply) => {
  const { log } = request;

  // Validation errors (from schema)
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation Error',
      details: error.validation,
    });
  }

  // Known HTTP errors
  if (error.statusCode) {
    return reply.code(error.statusCode).send({
      error: error.message,
    });
  }

  // Database errors
  if (error.code === '23505') { // Postgres unique constraint violation
    return reply.code(409).send({
      error: 'Resource already exists',
    });
  }

  // Unexpected errors — don't leak internals
  log.error({ err: error }, 'Unhandled error');
  return reply.code(500).send({ error: 'Internal Server Error' });
});

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    error: 'Not Found',
    message: `Route ${request.method}:${request.url} not found`,
  });
});
```

### Custom error classes

```ts
import createError from '@fastify/error';

// Create typed HTTP errors
const NotFound = createError('NOT_FOUND', 'Resource not found', 404);
const Forbidden = createError('FORBIDDEN', 'Access denied', 403);
const Conflict = createError('CONFLICT', '%s', 409); // %s = format string

// Throw from handlers — caught by setErrorHandler
async function getUser(request) {
  const user = await db.findUser(request.params.id);
  if (!user) throw new NotFound();
  if (user.id !== request.user.sub) throw new Forbidden();
  return user;
}

// With message formatting
throw new Conflict('Email %s already registered', email);
```

---

## 9. Logging & Observability

### Pino (Fastify's built-in logger)

```ts
// Fastify uses Pino — structured JSON logging, very fast
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    // Pretty print in dev only:
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          // Never log Authorization header or body (may contain PII/secrets)
        };
      },
    },
  },
});

// Request-scoped logger (includes request ID automatically)
fastify.get('/users', async (request) => {
  request.log.info({ userId: request.user.id }, 'Fetching user list');
  // Output: {"level":30,"msg":"Fetching user list","reqId":"req-1","userId":"123"}

  const users = await db.select().from(usersTable);
  request.log.info({ count: users.length }, 'Users fetched');
  return users;
});
```

### Correlation IDs for distributed tracing

```ts
import { v4 as uuid } from 'uuid';

const correlationPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.addHook('onRequest', async (request) => {
    // Propagate from upstream or generate new
    request.correlationId = request.headers['x-correlation-id'] as string ?? uuid();
    request.log = request.log.child({ correlationId: request.correlationId });
  });

  fastify.addHook('onSend', async (request, reply) => {
    // Return to client so they can correlate with support
    reply.header('x-correlation-id', request.correlationId);
  });
});

// When calling downstream services, forward the ID
await fetch(`${SERVICE_B_URL}/api/resource`, {
  headers: { 'x-correlation-id': request.correlationId },
});
```

### Health and readiness endpoints

```ts
// Health: is the process alive?
fastify.get('/health', { logLevel: 'silent' }, async () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));

// Readiness: are dependencies ready?
fastify.get('/ready', { logLevel: 'silent' }, async (request, reply) => {
  const checks = await Promise.allSettled([
    db.execute(sql`SELECT 1`),      // DB check
    redis.ping(),                    // Redis check
  ]);

  const dbOk = checks[0].status === 'fulfilled';
  const redisOk = checks[1].status === 'fulfilled';
  const ready = dbOk && redisOk;

  return reply.code(ready ? 200 : 503).send({
    status: ready ? 'ready' : 'not ready',
    checks: { db: dbOk ? 'ok' : 'fail', redis: redisOk ? 'ok' : 'fail' },
  });
});
```

---

## 10. Database Patterns

### Drizzle ORM — production patterns

```ts
// Transaction with error handling
async function transferFunds(fromId: string, toId: string, amount: number) {
  return await db.transaction(async (tx) => {
    const [from] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, fromId))
      .for('update'); // SELECT FOR UPDATE — row-level lock

    if (!from || from.balance < amount) {
      throw new Error('Insufficient funds'); // rolls back transaction
    }

    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount}` })
      .where(eq(accounts.id, fromId));

    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount}` })
      .where(eq(accounts.id, toId));

    return { success: true };
  });
}

// Soft delete pattern
const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  deletedAt: timestamp('deleted_at'), // null = active, timestamp = deleted
});

// Always filter deleted in queries
const activeTasks = await db
  .select()
  .from(tasks)
  .where(isNull(tasks.deletedAt)); // only non-deleted

// Soft delete
await db
  .update(tasks)
  .set({ deletedAt: new Date() })
  .where(eq(tasks.id, id));
```

### Connection lifecycle

```ts
// Graceful shutdown — don't drop active connections
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });

process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received, shutting down gracefully');
  await app.close(); // stop accepting new requests
  await pool.end();  // close all DB connections
  process.exit(0);
});

// Retry on startup (DB may not be ready immediately)
async function connectWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return; // success
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1))); // exponential
    }
  }
}
```

---

## 11. REST API Design — Advanced

### Versioning strategies

```ts
// URL versioning (most common — easy to route, easy to understand)
app.register(v1Routes, { prefix: '/api/v1' });
app.register(v2Routes, { prefix: '/api/v2' });

// Header versioning (cleaner URLs, harder to test in browser)
fastify.addHook('preHandler', async (request, reply) => {
  const version = request.headers['api-version'] ?? '1';
  if (version === '2') {
    // handle v2 logic
  }
});

// Maintaining backward compatibility:
// - Add new optional fields to responses (additive)
// - Never remove or rename existing fields in the same version
// - Deprecation header: Deprecation: version="v1", Sunset: "Sat, 01 Jan 2026 00:00:00 GMT"
```

### Pagination, filtering, sorting

```ts
// Query string design
// GET /tasks?page=2&limit=20&status=open&sort=-createdAt&search=urgent

// - sort=-createdAt: prefix - means DESC
// - Multiple sorts: sort=-priority,createdAt (priority DESC, then createdAt ASC)

fastify.get<{
  Querystring: {
    page?: number;
    limit?: number;
    status?: 'open' | 'done';
    sort?: string;
    search?: string;
  }
}>('/tasks', {
  schema: {
    querystring: Type.Object({
      page:   Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
      limit:  Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
      status: Type.Optional(Type.Union([Type.Literal('open'), Type.Literal('done')])),
      sort:   Type.Optional(Type.String()),
      search: Type.Optional(Type.String()),
    }),
  },
}, async (request) => {
  const { page = 1, limit = 20, status, sort = '-createdAt', search } = request.query;
  const offset = (page - 1) * limit;

  const orderBy = sort.startsWith('-')
    ? desc(tasks[sort.slice(1) as keyof typeof tasks])
    : asc(tasks[sort as keyof typeof tasks]);

  const conditions = [
    status && eq(tasks.status, status),
    search && ilike(tasks.title, `%${search}%`),
  ].filter(Boolean);

  const [items, [{ count }]] = await Promise.all([
    db.select().from(tasks)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(tasks).where(and(...conditions)),
  ]);

  return {
    data: items,
    meta: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
      hasNextPage: page * limit < Number(count),
    },
  };
});
```

### HATEOAS & response envelope

```ts
// HATEOAS: include links in response for discoverability
{
  "data": {
    "id": "123",
    "title": "Buy milk",
    "status": "open"
  },
  "links": {
    "self": "/api/tasks/123",
    "complete": "/api/tasks/123/complete",
    "delete": "/api/tasks/123",
    "owner": "/api/users/456"
  }
}

// Standard envelope
{
  "data": { ... },            // the actual payload
  "meta": {                   // pagination, timestamps
    "page": 1,
    "total": 150,
    "requestId": "req-abc123"
  },
  "links": { "next": "..." }
}

// Error envelope
{
  "error": "Validation Error",
  "code": "VALIDATION_FAILED",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ],
  "requestId": "req-abc123"    // for support lookups
}
```

### Idempotency for mutations

```ts
// POST /payments with Idempotency-Key: <uuid>
// Retry-safe: duplicate requests return the same response

fastify.post('/payments', async (request, reply) => {
  const idempotencyKey = request.headers['idempotency-key'] as string;

  if (idempotencyKey) {
    // Check if we've processed this key before
    const cached = await redis.get(`idempotency:${idempotencyKey}`);
    if (cached) {
      const { statusCode, body } = JSON.parse(cached);
      return reply.code(statusCode).send(body);
    }
  }

  const payment = await processPayment(request.body);

  if (idempotencyKey) {
    // Store response for 24 hours
    await redis.setex(
      `idempotency:${idempotencyKey}`,
      86400,
      JSON.stringify({ statusCode: 201, body: payment })
    );
  }

  return reply.code(201).send(payment);
});
```

---

## 12. Performance & Scaling

### Fastify performance defaults

```text
Fastify vs Express benchmarks:
  Express: ~15,000 req/s
  Fastify: ~75,000 req/s (5x faster)

Why Fastify is faster:
  - Schema-based serialization (fast-json-stringify) vs JSON.stringify
  - Compiled route matching (find-my-way radix router)
  - No middleware overhead (hooks are async functions, not connect-style middleware)
  - Pre-compiled validators (ajv)
```

### Cluster mode

```ts
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code) => {
    console.log(`Worker ${worker.process.pid} died — forking replacement`);
    cluster.fork(); // replace dead worker
  });

} else {
  // Each worker runs the Fastify server
  const app = await buildApp();
  await app.listen({ port: 3000, host: '0.0.0.0' });
  console.log(`Worker ${process.pid} started`);
}

// In production: prefer Kubernetes pods over cluster
// Cluster is useful for single-machine deployments (VPS, EC2)
```

### Caching responses

```ts
import caching from '@fastify/caching';

// Cache GET responses in Redis
fastify.get('/tasks', {
  config: { cache: { ttl: 60 } }, // cache for 60 seconds
  handler: async () => db.select().from(tasks),
});

// Manual caching pattern
fastify.get('/stats', async (request, reply) => {
  const cacheKey = 'global:stats';
  const cached = await redis.get(cacheKey);

  if (cached) {
    reply.header('X-Cache', 'HIT');
    return JSON.parse(cached);
  }

  const stats = await computeExpensiveStats();
  await redis.setex(cacheKey, 300, JSON.stringify(stats)); // 5 minutes

  reply.header('X-Cache', 'MISS');
  return stats;
});

// HTTP cache headers for CDN/browser caching
reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
reply.header('ETag', `"${hash(data)}"`); // conditional requests
reply.header('Last-Modified', new Date().toUTCString());
```

---

## 13. Testing Node.js APIs

### Integration testing with Fastify

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../src/app';
import { db } from '../src/db';

describe('Task API', () => {
  let app: ReturnType<typeof buildApp>;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false }); // quiet logs in tests
    await app.ready();

    // Seed test user and get token
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: 'test@example.com', password: 'password' },
    });
    authToken = res.json().accessToken;
  });

  afterAll(async () => {
    await app.close();
    await db.execute(sql`TRUNCATE tasks CASCADE`); // clean up
  });

  it('GET /tasks returns empty array initially', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: [], meta: { total: 0 } });
  });

  it('POST /tasks creates a task', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${authToken}` },
      body: { title: 'Test task', priority: 'high' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      title: 'Test task',
      priority: 'high',
      done: false,
    });
    expect(res.json().id).toBeDefined();
  });

  it('returns 400 for invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${authToken}` },
      body: { title: '' }, // title too short
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/tasks' });
    expect(res.statusCode).toBe(401);
  });
});
```

---

## 14. Production Readiness

### Graceful shutdown

```ts
async function gracefulShutdown(signal: string) {
  app.log.info(`Received ${signal}, starting graceful shutdown`);

  // Stop accepting new requests
  await app.close();

  // Wait for in-flight requests (Fastify does this on close)

  // Close DB connections
  await pool.end();
  await redis.quit();

  app.log.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions — log then crash (let supervisor restart)
process.on('uncaughtException', (err) => {
  app.log.fatal({ err }, 'Uncaught exception');
  process.exit(1); // crash — uncaught exceptions leave unknown state
});

process.on('unhandledRejection', (reason) => {
  app.log.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});
```

### Environment configuration

```ts
// Validate all required env vars at startup — fail fast
import { z } from 'zod';

const env = z.object({
  NODE_ENV:       z.enum(['development', 'production', 'test']),
  PORT:           z.coerce.number().default(3000),
  DATABASE_URL:   z.string().url(),
  REDIS_URL:      z.string().url().default('redis://localhost:6379'),
  JWT_SECRET:     z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN:    z.string().url(),
  LOG_LEVEL:      z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
}).parse(process.env); // throws at startup if invalid

export default env;
```

### Security headers

```ts
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

// Security headers
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
});

// CORS
await app.register(cors, {
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
  credentials: true, // allow cookies
});
```

---

## 15. Common Interview Questions

### "How does Node.js handle concurrency if it's single-threaded?"

> Node.js uses a non-blocking I/O model via the event loop. When you do an async operation like a database query or file read, Node.js registers a callback with the OS and continues executing other code. The OS notifies libuv when the I/O completes, and libuv schedules the callback on the event loop. So while the DB query is in flight, Node.js can handle thousands of other requests. The thread is never sitting idle waiting — it's always processing something. This is why Node.js is excellent for I/O-bound workloads but not for CPU-bound work (which blocks the single thread).

### "What is the difference between Express and Fastify?"

```text
Express:
  - Older, massive ecosystem
  - Synchronous middleware (connect-style)
  - No built-in validation/serialization
  - ~15,000 req/s

Fastify:
  - Plugin system with encapsulation
  - Schema-based validation (ajv) and serialization (fast-json-stringify)
  - Async/await native
  - TypeScript-first
  - ~75,000 req/s (5x faster)
  - Better for new projects, greenfield TypeScript APIs
```

### "Explain backpressure in Node.js streams."

> Backpressure occurs when a readable stream produces data faster than a writable stream can consume it. Without handling it, data buffers pile up in memory, eventually causing OOM. The solution: `writable.write()` returns `false` when its internal buffer is full — at that point, you should stop reading from the source and wait for the `drain` event on the writable before resuming. `.pipe()` handles this automatically. Backpressure is why you should always use `pipeline()` instead of manual `.pipe()` for production code — `pipeline()` also handles cleanup on errors.

### "How would you handle database migrations safely in production?"

```text
1. Expand-contract pattern (for zero downtime):
   - Expand: add new column as nullable, deploy code that writes to both old and new
   - Migrate: backfill existing rows
   - Contract: add NOT NULL, deploy code that only uses new column, drop old

2. Never lock tables in production (for large tables):
   - CREATE INDEX CONCURRENTLY (Postgres) — non-locking
   - Add columns as nullable first — instant, no lock
   - Adding NOT NULL without default = full table rewrite — dangerous

3. Test migrations on production-sized data
   - Staging with production data volume (sanitized)
   - Measure migration time — 5 seconds on staging = 5 minutes on prod with 100x data

4. Have a rollback plan
   - New code should be compatible with both old and new schema
   - Roll forward vs roll back: rolling back DB migrations is risky
```

### "What are some ways to improve API performance?"

```text
1. Caching (biggest impact):
   - Redis for DB query results, computed values
   - HTTP Cache-Control headers for CDN caching
   - ETags for conditional requests

2. Database:
   - Add indexes for common query patterns (EXPLAIN ANALYZE)
   - Use read replicas for read-heavy routes
   - Connection pooling (don't open too many connections)
   - Avoid N+1 queries — use JOINs or eager loading

3. Response size:
   - Pagination — don't return 10,000 rows
   - Field selection — return only requested fields
   - Compression (gzip/brotli) for large text responses
   - fastify-compress plugin

4. Concurrency:
   - Run independent async operations in parallel (Promise.all)
   - Don't await in loops when order doesn't matter

5. Architecture:
   - Move slow work to background queues (email, image processing)
   - Cluster mode or horizontal scaling for CPU-bound work
```

---

## Most Asked Node.js Interview Questions

### "How does the Node.js event loop work?"

> Node.js is single-threaded but non-blocking thanks to its event loop and libuv. When you call an async operation (fs, network), Node offloads it to the OS/thread pool and continues executing. When the operation completes, the callback is queued. The event loop processes phases in order: timers (`setTimeout`/`setInterval`) → pending I/O callbacks → idle/prepare → poll (wait for I/O) → check (`setImmediate`) → close callbacks. Microtasks (`Promise`, `process.nextTick`) run between every phase — `nextTick` before Promise callbacks.

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));

// Output: nextTick → promise → timeout → immediate
// (nextTick and promise are microtasks, run before next phase)
```

### "What are Node.js Streams and why use them?"

> Streams process data chunk by chunk instead of loading everything into memory. Four types: Readable (data source), Writable (data destination), Duplex (both), Transform (modify data in transit). Crucial for large files, HTTP request/response, and data pipelines. `pipe()` connects streams and handles backpressure automatically.

```js
const fs = require('fs');
const zlib = require('zlib');

// Without streams: reads entire file into memory → crashes on large files
// fs.readFile('huge.csv', callback);

// With streams: constant ~64KB memory usage regardless of file size
fs.createReadStream('huge.csv')
    .pipe(zlib.createGzip())
    .pipe(fs.createWriteStream('huge.csv.gz'));

// HTTP: response is a Writable stream
app.get('/download', (req, res) => {
    fs.createReadStream('./large-file.pdf').pipe(res);
});
```

### "What is the difference between `process.nextTick` and `setImmediate`?"

> `process.nextTick` fires before the event loop continues to the next phase — even before I/O callbacks. `setImmediate` fires in the check phase, after I/O. `nextTick` has higher priority. Overusing `nextTick` can starve the I/O queue (infinite `nextTick` loop blocks everything). Use `nextTick` for callbacks that should run "after current operation but before I/O"; use `setImmediate` for most other deferred work.

### "How do you handle uncaught exceptions and unhandled rejections in Node.js?"

> Two process-level handlers catch what escapes your try/catch. In production, log the error and gracefully shut down — the process state is unreliable after an uncaught exception.

```js
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    process.exit(1); // must exit — state is corrupt
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    process.exit(1);
});

// Better: use a process manager (PM2, systemd) to restart on crash
// Even better: don't let errors reach here — handle them at the source
```

### "What is clustering in Node.js and when do you use it?"

> Node runs in a single process on one CPU core. The `cluster` module forks multiple worker processes that share the same port — the master distributes incoming connections. This uses all CPU cores. Modern alternative: run multiple Node instances behind a load balancer (nginx, HAProxy), or use PM2 which handles clustering for you.

```js
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    for (let i = 0; i < numCPUs; i++) cluster.fork();
    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died — forking replacement`);
        cluster.fork();
    });
} else {
    // Each worker runs the Express app independently
    require('./app').listen(3000);
}
```

### "What is middleware in Express and how does the chain work?"

> Middleware functions have signature `(req, res, next)`. They run in order of registration. Call `next()` to pass to the next middleware, call `next(err)` to skip to error-handling middleware, or end the request with `res.send()`/`res.json()`. Error-handling middleware has 4 params `(err, req, res, next)` and must be registered last.

```js
// Logger middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next(); // must call next or request hangs
});

// Route-specific middleware
const auth = (req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
    next();
};
app.get('/protected', auth, handler);

// Error-handling middleware — 4 params, register last
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});
```

### "How do you prevent SQL injection / NoSQL injection in Node.js?"

> Never concatenate user input into queries. Always use parameterized queries or an ORM. For NoSQL (MongoDB), sanitize inputs that could be objects (e.g. `{ $gt: '' }`).

```js
// ✗ SQL injection vulnerability
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;

// ✓ Parameterized query (pg library)
const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [req.body.email]
);

// ✓ ORM (Drizzle/Prisma) handles escaping automatically
const user = await db.select().from(users).where(eq(users.email, req.body.email));

// ✗ NoSQL injection
User.findOne({ email: req.body.email }); // if email = { $gt: '' }, returns all users

// ✓ Validate with zod first
const { email } = z.object({ email: z.string().email() }).parse(req.body);
```

### "What is JWT and how does authentication work with it?"

> JWT (JSON Web Token) is a self-contained token: `header.payload.signature`. The server signs the payload with a secret — anyone can read the payload, but only the server can create valid signatures. Stateless: no session store needed. The client sends the token in `Authorization: Bearer <token>` on every request. The server verifies the signature and reads the claims.

```js
const jwt = require('jsonwebtoken');

// Sign — on login
const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }   // short-lived access token
);

// Verify — middleware on protected routes
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}
```

### "What is rate limiting and how do you implement it?"

> Rate limiting restricts how many requests a client can make in a time window — protects against brute force attacks, DoS, and API abuse. Implement per-IP or per-user. In production, store counters in Redis (not in-memory, which breaks with multiple instances).

```js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                   // 100 requests per window per IP
    standardHeaders: true,
    store: new RedisStore({ /* redis client */ }),
    handler: (req, res) =>
        res.status(429).json({ error: 'Too many requests, slow down.' }),
});

app.use('/api/', limiter);

// Stricter for login
const loginLimiter = rateLimit({ windowMs: 60_000, max: 5 });
app.post('/auth/login', loginLimiter, loginHandler);
```

### "How do you manage environment variables and secrets in Node.js?"

> Use `dotenv` in development to load `.env` files. Never commit `.env` to git. In production, inject via the deployment platform (Railway, Heroku config vars, AWS SSM, Kubernetes secrets). Validate all required env vars at startup so the app crashes loudly if misconfigured rather than silently later.

```js
// Validate at startup
import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET:   z.string().min(32),
    PORT:         z.coerce.number().default(3000),
    NODE_ENV:     z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
// If DATABASE_URL is missing: throws at startup with a clear error
```

### "What is the difference between `require` (CommonJS) and `import` (ESM)?"

> CommonJS (`require`) is synchronous, loads at runtime, outputs a copy of the value (not live binding). ESM (`import`) is static (analyzed at parse time), asynchronous, tree-shakeable, and produces live bindings. Node.js supports both, but they don't mix cleanly. Use `.mjs` or `"type": "module"` in package.json for ESM. Modern packages ship ESM; older Node.js codebases use CJS. Top-level `await` only works in ESM.

```js
// CommonJS
const express = require('express');
module.exports = { myFunction };

// ESM
import express from 'express';
export { myFunction };
export default myFunction;

// Dynamic import works in both — lazy-loads a module
const { default: heavy } = await import('./heavy-module.js');
```
