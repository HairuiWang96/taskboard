# Express.js — Senior Developer Deep Reference

> Covers Express internals, middleware pipeline, req/res API, routing, error handling, validation, authentication, security, logging, testing, performance, production patterns, and interview questions.

---

## Table of Contents

1. [What Express Actually Is](#1-what-express-actually-is)
2. [The Request & Response Objects](#2-the-request--response-objects)
3. [Middleware Pipeline — The Core Concept](#3-middleware-pipeline--the-core-concept)
4. [Routing & Router Architecture](#4-routing--router-architecture)
5. [Error Handling](#5-error-handling)
6. [Request Body Parsing](#6-request-body-parsing)
7. [Validation Patterns](#7-validation-patterns)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Security Hardening](#9-security-hardening)
10. [Logging & Observability](#10-logging--observability)
11. [File Uploads & Static Files](#11-file-uploads--static-files)
12. [Database Integration Patterns](#12-database-integration-patterns)
13. [Testing with Supertest](#13-testing-with-supertest)
14. [Performance & Scaling](#14-performance--scaling)
15. [Production Readiness](#15-production-readiness)
16. [Express 5 — What Changes](#16-express-5--what-changes)
17. [Full Project Structure](#17-full-project-structure)
18. [Common Interview Questions](#18-common-interview-questions)

---

## 1. What Express Actually Is

### Under the hood

```text
Express is a thin layer on top of Node.js's built-in http module.‼️

When you call:
  const app = express();

You get a FUNCTION (app) that IS a Node.js request handler:‼️
  app(req, res)  ←— this is what Node's http.createServer() expects‼️

Under the hood:‼️
  express() → returns a Function with extra methods (.use, .get, .listen, etc.)
  app.listen(3000) → shorthand for http.createServer(app).listen(3000)

There is NO magic — Express is ~600 lines of core code.‼️
It does two things:
  1. Maintains a stack of middleware functions
  2. Walks that stack for each incoming request
```

### Proof: Express IS http.createServer

```js
// These two are equivalent:
// Shorthand:
const app = express();
app.listen(3000);

// Explicit:
const app = express();
const http = require('http');
http.createServer(app).listen(3000);
// ‼️ app itself is the (req, res) callback — that's the entire design
```

### Minimal Express app

```ts
import express from 'express';

const app = express();

// Built-in middleware
app.use(express.json()); // parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // parse HTML form data‼️

// Route
app.get('/api/users', (req, res) => {
    res.json({ users: [] });
});

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## 2. The Request & Response Objects

### req — Express extends Node's IncomingMessage

```js
// ‼️ Express adds these convenience properties ON TOP of vanilla Node req

req.params; // { id: '123' } — from route params like /users/:id
req.query; // { page: '1', sort: 'name' } — from ?page=1&sort=name
req.body; // parsed body — ONLY available after body-parser middleware‼️
req.ip; // client IP (respects X-Forwarded-For if trust proxy set)
req.path; // '/users/123' — URL path without query string
req.method; // 'GET', 'POST', etc.
req.hostname; // 'example.com' (respects X-Forwarded-Host if trust proxy set)
req.protocol; // 'http' or 'https' (respects X-Forwarded-Proto if trust proxy set)
req.secure; // true if req.protocol === 'https'
req.originalUrl; // '/api/users/123?page=1' — full URL with query string
req.baseUrl; // '/api/users' — the prefix the router was mounted on
req.cookies; // { session: 'abc' } — only available with cookie-parser middleware‼️
req.signedCookies; // cookies that were signed with a secret
req.fresh; // true if the client's cached version is still valid (ETag/Last-Modified)
req.stale; // opposite of fresh
req.xhr; // true if X-Requested-With: XMLHttpRequest (deprecated pattern)

// Methods
req.get('Content-Type'); // get a request header (case-insensitive)
req.accepts('json'); // content negotiation — does client accept JSON?
req.is('application/json'); // check if Content-Type matches
```

### res — Express extends Node's ServerResponse

```js
// ‼️ Express adds these convenience methods ON TOP of vanilla Node res

// Sending responses (use ONE per request — calling two = error)‼️
res.json({ key: 'val' }); // sets Content-Type: application/json + JSON.stringify
res.send('text'); // sends string, Buffer, or object (auto-sets Content-Type)
res.sendStatus(204); // sends status code with status text as body
res.end(); // end response with no body (vanilla Node method)

// Status codes — chainable
res.status(201).json({ id: 1 }); // set status then send
res.status(404).send('Not found');

// Headers
res.set('X-Custom', 'value'); // set a response header
res.set({ 'X-A': '1', 'X-B': '2' }); // set multiple headers
res.get('Content-Type'); // get a response header you already set
res.append('Set-Cookie', 'a=1'); // append (not replace) a header value

// Redirects
res.redirect('/new-path'); // 302 redirect (temporary) by default
res.redirect(301, '/new-path'); // 301 redirect (permanent)

// Cookies (need cookie-parser middleware for reading, but setting works natively)
res.cookie('session', 'abc', {
    httpOnly: true, // no JS access — XSS protection‼️
    secure: true, // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in MILLISECONDS (Express uses ms)‼️
});
res.clearCookie('session'); // delete a cookie

// File responses
res.sendFile('/absolute/path/to/file.pdf'); // must be absolute path‼️
res.download('/path/file.pdf', 'report.pdf'); // triggers download with custom filename
res.attachment('report.pdf'); // sets Content-Disposition: attachment

// Content negotiation
res.format({
    'text/html': () => res.send('<h1>Hello</h1>'),
    'application/json': () => res.json({ message: 'Hello' }),
    default: () => res.status(406).send('Not Acceptable'),
});

// Locals — pass data to templates or downstream middleware
res.locals.user = { id: 1, name: 'Alice' };
// res.locals persists for the ENTIRE request lifecycle — great for template rendering
```

### Trust Proxy — critical for production‼️

```js
// ‼️ If behind a reverse proxy (Nginx, AWS ALB, Cloudflare, etc.) you MUST set this:
app.set('trust proxy', 1); // trust first hop

// Without this:
//   req.ip       → proxy's IP (wrong!)
//   req.protocol → 'http' even if client used HTTPS (wrong!)
//   req.hostname → proxy's hostname (wrong!)

// With this:
//   req.ip       → real client IP from X-Forwarded-For header
//   req.protocol → 'https' if X-Forwarded-Proto: https
//   req.hostname → real hostname from X-Forwarded-Host

// Values:
app.set('trust proxy', true); // trust all proxies (dangerous — IP spoofing)
app.set('trust proxy', 1); // trust first proxy (ALB, Nginx)
app.set('trust proxy', 2); // trust first two proxies (Cloudflare → ALB)
app.set('trust proxy', 'loopback'); // trust 127.0.0.1 only
app.set('trust proxy', '10.0.0.0/8'); // trust IPs in this subnet

// ‼️ AWS ALB / ECS:   trust proxy = 1
// ‼️ Cloudflare → ALB: trust proxy = 2
// ‼️ Never use `true` in production — allows clients to spoof their IP
```

---

## 3. Middleware Pipeline — The Core Concept

### How middleware works

```text
Every middleware is a function: (req, res, next) => void‼️

Express maintains an internal stack of middleware functions.
When a request comes in, Express walks the stack IN ORDER:
  → middleware 1 runs → calls next() → middleware 2 runs → ...
  → route handler runs → sends response → done

If next() is never called AND no response is sent → the request HANGS forever.‼️
If next(err) is called → Express SKIPS all regular middleware, jumps to error handlers.‼️

‼️ ORDER MATTERS — middleware runs in the ORDER it was registered with app.use()

Think of it like a pipeline:
  Request → [logger] → [bodyParser] → [auth] → [routeHandler] → Response
```

### Middleware registration and execution order

```js
const express = require('express');
const app = express();

// 1. Logger — runs for EVERY request (no path = matches all)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next(); // MUST call next() or the request hangs‼️
});

// 2. Body parser — parse JSON bodies; populates req.body
app.use(express.json());
// ‼️ Without this, req.body is undefined for POST/PUT with JSON body

// 3. Route-specific middleware (only runs for /users/* paths)
app.use('/users', requireAuth);

// 4. Route handler
app.get('/users/:id', (req, res) => {
    res.json({ id: req.params.id });
});

// 5. 404 handler — runs if NO route matched (must be after all routes)‼️
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// 6. Error handler — MUST have 4 params for Express to recognize it‼️
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
});
```

### Middleware types

```js
// 1. Application-level: runs on every request to the app
app.use(express.json());
app.use(morgan('dev'));

// 2. Route-level: applied to a specific Router
const router = express.Router();
router.use(requireAuth); // only applies to routes in this router

// 3. Inline route middleware: runs only on a specific route
app.get('/admin', requireAuth, requireRole('admin'), (req, res) => {
    res.json({ message: 'Welcome admin' });
});

// 4. Error-handling: has 4 parameters — (err, req, res, next)
app.use((err, req, res, next) => {
    /* ... */
});

// 5. Built-in middleware:
express.json(); // parse application/json bodies
express.urlencoded({ extended: true }); // parse HTML form submissions
express.static('public'); // serve static files from /public directory

// 6. Third-party:
// cors, helmet, morgan, compression, cookie-parser, express-rate-limit, etc.
```

### next() — the three behaviors‼️

```js
// next()        → go to NEXT middleware/route handler in the stack
// next('route') → skip remaining handlers for THIS route, go to NEXT matching route
// next(err)     → SKIP all regular middleware, jump to error handler‼️

// Example of next('route'):
app.get(
    '/user/:id',
    (req, res, next) => {
        if (req.params.id === 'admin') return next('route'); // skip to next route definition
        next(); // continue to second handler below
    },
    (req, res) => {
        res.send('Regular user'); // skipped if next('route') was called
    },
);

app.get('/user/:id', (req, res) => {
    res.send('Admin user'); // only runs if next('route') was called above
});
```

### Common middleware ordering pattern‼️

```js
// ‼️ Order matters. This is the recommended order:

// 1. Security headers (run first — apply to all responses including errors)
app.use(helmet());

// 2. CORS (must be before routes so preflight OPTIONS requests get handled)
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

// 3. Request logging (log all requests, including ones that fail)
app.use(morgan('combined'));

// 4. Body parsing (must be before any route that reads req.body)
app.use(express.json({ limit: '10kb' })); // limit body size‼️
app.use(express.urlencoded({ extended: true }));

// 5. Cookie parsing (must be before routes that read req.cookies)
app.use(cookieParser(process.env.COOKIE_SECRET));

// 6. Compression (compress responses — after parsing, before routes)
app.use(compression());

// 7. Rate limiting (before routes to reject early)
app.use('/api/', rateLimiter);

// 8. Static files (if serving any — before routes, after security)
app.use(express.static('public'));

// 9. Routes
app.use('/api/users', userRouter);
app.use('/api/tasks', taskRouter);

// 10. 404 handler (after ALL routes)
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// 11. Error handler (LAST — catches everything)‼️
app.use((err, req, res, next) => {
    /* ... */
});
```

---

## 4. Routing & Router Architecture

### Basic routing

```js
// Route = HTTP method + path + handler(s)
app.get('/users', getUsers); // GET    /users
app.post('/users', createUser); // POST   /users
app.put('/users/:id', updateUser); // PUT    /users/123
app.patch('/users/:id', patchUser); // PATCH  /users/123
app.delete('/users/:id', delUser); // DELETE /users/123
app.all('/secret', requireAuth); // ALL methods — useful for shared middleware

// Route parameters
app.get('/users/:id', (req, res) => {
    req.params.id; // '123'
});

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
    req.params.userId; // '123'
    req.params.postId; // '456'
});

// Optional parameters (regex)
app.get('/users/:id(\\d+)', (req, res) => {
    // Only matches if :id is all digits — /users/abc returns 404
});
```

### express.Router() — modular route grouping‼️

```ts
// ‼️ Key pattern: NEVER define all routes on app — split into Router files

// routes/users.ts
import { Router } from 'express';

const router = Router();

// Middleware scoped to this router only
router.use(requireAuth);

router.get('/', getUsers); // GET    /api/users
router.get('/:id', getUserById); // GET    /api/users/:id
router.post('/', createUser); // POST   /api/users
router.put('/:id', updateUser); // PUT    /api/users/:id
router.delete('/:id', deleteUser); // DELETE /api/users/:id

export default router;

// app.ts — mount with prefix
import userRouter from './routes/users';
app.use('/api/users', userRouter);
// ‼️ All routes in userRouter are now prefixed with /api/users
```

### Route grouping with different auth requirements

```ts
const app = express();

// Public routes — no auth
const publicRouter = Router();
publicRouter.get('/health', (req, res) => res.json({ status: 'ok' }));
publicRouter.post('/auth/login', loginHandler);
publicRouter.post('/auth/register', registerHandler);
app.use(publicRouter);

// Protected routes — require authentication
const protectedRouter = Router();
protectedRouter.use(authenticate); // all routes below need auth‼️
protectedRouter.use('/api/users', userRouter);
protectedRouter.use('/api/tasks', taskRouter);
app.use(protectedRouter);

// Admin routes — require auth + admin role
const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireRole('admin')); // all routes below need admin‼️
adminRouter.get('/api/admin/stats', getStats);
adminRouter.get('/api/admin/users', getAllUsers);
app.use(adminRouter);
```

### Route chaining with app.route()

```js
// Cleaner syntax when multiple methods share the same path
app.route('/users/:id').get(getUser).put(updateUser).patch(patchUser).delete(deleteUser);
```

### Router.param() — pre-processing route params

```js
const router = Router();

// Runs BEFORE any route handler that uses :id‼️
router.param('id', async (req, res, next, id) => {
    const user = await db.findUser(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    req.user = user; // attach to req for downstream handlers
    next();
});

// Now every route with :id automatically has req.user populated
router.get('/:id', (req, res) => res.json(req.user));
router.put('/:id', (req, res) => {
    /* req.user is already loaded */
});
router.delete('/:id', (req, res) => {
    /* req.user is already loaded */
});
```

---

## 5. Error Handling

### The biggest Express gotcha — async errors‼️

```ts
// Express was built before async/await — it does NOT catch async errors!‼️

// ✗ BROKEN — if db.getUsers() rejects, Express hangs or crashes
app.get('/users', async (req, res) => {
    const users = await db.getUsers(); // if this throws → unhandled rejection!
    res.json(users);
});

// ✓ FIX 1: try/catch every route (tedious but explicit)
app.get('/users', async (req, res, next) => {
    try {
        const users = await db.getUsers();
        res.json(users);
    } catch (err) {
        next(err); // forward to error handler
    }
});

// ✓ FIX 2: asyncHandler wrapper (recommended for Express 4)‼️
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
// This takes your async function, and if it rejects, automatically calls next(err)
// which forwards the error to the centralized error handler

app.get(
    '/users',
    asyncHandler(async (req, res) => {
        const users = await db.getUsers(); // errors auto-forwarded to error handler
        res.json(users);
    }),
);

// ✓ FIX 3: express-async-errors package (monkey-patches Express)
import 'express-async-errors'; // just import at top of app — async errors now caught
// No wrapper needed — async route handlers just work

// ✓ FIX 4: Express 5 handles async errors natively — no fix needed‼️
```

### How asyncHandler works — line by line‼️

```ts
// asyncHandler is a higher-order function:
//   - Takes your async route handler (fn)
//   - Returns a NEW function that Express calls with (req, res, next)
//   - Wraps fn in Promise.resolve() so even sync throws become rejections
//   - Attaches .catch(next) so any rejection calls next(err) automatically
//   - next(err) skips all normal middleware and jumps to the error handler

const asyncHandler =
    (
        fn, // fn = your async (req, res) => { ... }
    ) =>
    (
        req,
        res,
        next, // returns Express-compatible middleware
    ) =>
        Promise.resolve(fn(req, res, next)) // run fn, wrap result in Promise
            .catch(next); // if Promise rejects → call next(err)

// Why Promise.resolve()?
// If fn is sync and throws, the throw becomes a rejected Promise,
// which .catch(next) catches. Covers both sync and async errors.
```

### Custom error classes

```ts
// Create custom errors with status codes — throw from anywhere, handle in one place‼️

class AppError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public code?: string,
    ) {
        super(message);
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(404, `${resource} not found`, 'NOT_FOUND');
    }
}

class ForbiddenError extends AppError {
    constructor() {
        super(403, 'Access denied', 'FORBIDDEN');
    }
}

class ConflictError extends AppError {
    constructor(msg: string) {
        super(409, msg, 'CONFLICT');
    }
}

class ValidationError extends AppError {
    constructor(public details: any) {
        super(400, 'Validation failed', 'VALIDATION_ERROR');
    }
}

// Usage in route handlers:
app.get(
    '/users/:id',
    asyncHandler(async (req, res) => {
        const user = await db.findUser(req.params.id);
        if (!user) throw new NotFoundError('User');
        if (user.id !== req.user.sub) throw new ForbiddenError();
        res.json(user);
    }),
);
```

### Centralized error handler — ONE place for all errors‼️

```ts
// ‼️ Must be registered LAST — after all routes
// ‼️ Must have EXACTLY 4 parameters — Express identifies error handlers by param count

app.use((err, req, res, next) => {
    // Zod validation errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.flatten(),
        });
    }

    // Your custom AppError instances
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
    }

    // Database unique constraint violation (Postgres error code)
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Resource already exists' });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }

    // Unexpected errors — NEVER leak internals to client‼️
    console.error('UNEXPECTED ERROR:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// 404 handler — registered AFTER all routes but BEFORE error handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    });
});
```

### Error handling flow diagram

```text
Request comes in
  ↓
Regular middleware runs in order
  ↓
Route handler runs
  ↓
If handler throws / calls next(err):
  ↓
  Express SKIPS all regular middleware‼️
  ↓
  Jumps to first (err, req, res, next) middleware‼️
  ↓
  Error handler sends response
  ↓
Done

If no route matches:
  ↓
  Falls through to 404 handler (the last regular middleware)
```

---

## 6. Request Body Parsing

### Built-in parsers

```js
// express.json() — parse application/json
app.use(
    express.json({
        limit: '10kb', // max body size (prevent DoS)‼️
        strict: true, // only accept arrays and objects (default)
        type: 'application/json', // Content-Type to match
    }),
);

// express.urlencoded() — parse HTML form submissions (application/x-www-form-urlencoded)
app.use(
    express.urlencoded({
        extended: true, // true = use qs library (nested objects: user[name]=Alice)
        // false = use querystring library (flat only)‼️
        limit: '10kb',
    }),
);

// express.raw() — parse body as Buffer (for webhooks, binary data)
app.use('/webhook', express.raw({ type: 'application/json' }));
// req.body is a Buffer — parse yourself: JSON.parse(req.body.toString())

// express.text() — parse body as plain text string
app.use(express.text({ type: 'text/plain' }));

// ‼️ Common mistake: forgetting express.json()
// Without it, req.body is undefined for POST/PUT with JSON body
// This is the #1 beginner Express bug
```

### Webhook signature verification pattern

```ts
// Stripe, GitHub, etc. send webhooks with a signature header
// You MUST verify the signature using the raw body — NOT the parsed body‼️

// Use express.raw() for the webhook route only
app.post(
    '/webhook/stripe',
    express.raw({ type: 'application/json' }), // raw Buffer, not parsed JSON‼️
    (req, res) => {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
            // req.body is a Buffer here — Stripe SDK needs the raw bytes to verify
        } catch (err) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Process the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;
        }

        res.json({ received: true });
    },
);
```

---

## 7. Validation Patterns

### Express has NO built-in validation‼️

```text
Express has NO built-in validation — you pick your own library.‼️
This is different from Fastify (JSON Schema / ajv) or NestJS (class-validator).

Popular choices:
  Zod      — TypeScript-first, great DX, most popular in 2024+‼️
  Joi      — Mature, widely used, good for JavaScript
  express-validator — built on validator.js, middleware-style
```

### Zod validation middleware (recommended)‼️

```ts
import { z, ZodSchema } from 'zod';

// ‼️ Reusable middleware factory — validates body, query, or params

const validate = (schema: ZodSchema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            error: 'Validation failed',
            details: result.error.flatten(),
        });
    }
    req.body = result.data; // replace with validated + typed data‼️
    next();
};

// Schema for creating a user
const createUserSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    role: z.enum(['admin', 'user']).optional().default('user'),
    age: z.number().int().min(18).max(120).optional(),
});

// Use in route
app.post(
    '/users',
    validate(createUserSchema),
    asyncHandler(async (req, res) => {
        // req.body is validated and typed here — safe to use directly
        const user = await createUser(req.body);
        res.status(201).json(user);
    }),
);
```

### Validate body, params, and query separately

```ts
// More flexible — validate different parts of the request

const validateRequest =
    ({ body, params, query }: { body?: ZodSchema; params?: ZodSchema; query?: ZodSchema }) =>
    (req, res, next) => {
        if (body) {
            const result = body.safeParse(req.body);
            if (!result.success) return res.status(400).json({ error: result.error.flatten() });
            req.body = result.data;
        }
        if (params) {
            const result = params.safeParse(req.params);
            if (!result.success) return res.status(400).json({ error: result.error.flatten() });
            req.params = result.data;
        }
        if (query) {
            const result = query.safeParse(req.query);
            if (!result.success) return res.status(400).json({ error: result.error.flatten() });
            req.query = result.data;
        }
        next();
    };

// Usage
app.get(
    '/users/:id',
    validateRequest({
        params: z.object({ id: z.string().uuid() }),
        query: z.object({ include: z.enum(['posts', 'comments']).optional() }),
    }),
    asyncHandler(async (req, res) => {
        const user = await getUser(req.params.id, req.query.include);
        res.json(user);
    }),
);
```

### Joi validation (alternative)

```ts
import Joi from 'joi';

const schema = Joi.object({
    name: Joi.string().min(1).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid('admin', 'user').default('user'),
});

app.post(
    '/users',
    (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(d => d.message),
            });
        }
        req.body = value; // cleaned + validated
        next();
    },
    createUserHandler,
);
```

---

## 8. Authentication & Authorization

### JWT authentication middleware‼️

```ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';

app.use(cookieParser()); // needed to read cookies‼️

// Login endpoint — issues access token + refresh token
app.post(
    '/auth/login',
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        const user = await findUserByEmail(email);

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
            // ‼️ Don't say "user not found" or "wrong password" — helps attackers
        }

        // Access token — short-lived, sent in response body
        const accessToken = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });

        // Refresh token — long-lived, stored in httpOnly cookie
        const refreshToken = crypto.randomBytes(64).toString('hex');
        await storeRefreshToken(user.id, await bcrypt.hash(refreshToken, 10));

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // no JS access — safe from XSS‼️
            secure: true, // HTTPS only
            sameSite: 'strict', // CSRF protection
            path: '/auth', // only sent to /auth routes (not every request)
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (Express uses milliseconds)‼️
        });

        res.json({ accessToken });
    }),
);
```

### Auth middleware — protect routes

```ts
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        // req.user = { sub: '123', role: 'admin', iat: ..., exp: ... }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Use as route-level middleware
app.get('/api/profile', authenticate, getProfile);

// Or on a Router — protects all routes in the router
const protectedRouter = Router();
protectedRouter.use(authenticate);
protectedRouter.get('/users', getUsers);
protectedRouter.get('/tasks', getTasks);
app.use('/api', protectedRouter);
```

### RBAC — Role-Based Access Control‼️

```ts
// Middleware factory — returns middleware that checks for required roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Requires one of: ${roles.join(', ')}`,
            });
        }
        next(); // Express REQUIRES next() — forgetting it hangs the request‼️
    };
}

// Chain middleware: authenticate first, then check role
app.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);
app.get('/reports', authenticate, requireRole('admin', 'manager'), getReports);

// Resource ownership — user can only access their own data
function requireOwnerOrAdmin(req, res, next) {
    if (req.user.role === 'admin') return next(); // admin bypasses
    if (req.user.sub !== req.params.id) {
        return res.status(403).json({ error: 'You can only access your own data' });
    }
    next();
}

app.get('/users/:id', authenticate, requireOwnerOrAdmin, getUser);
app.put('/users/:id', authenticate, requireOwnerOrAdmin, updateUser);
```

### Token refresh endpoint

```ts
app.post(
    '/auth/refresh',
    asyncHandler(async (req, res) => {
        const { refreshToken } = req.cookies;
        if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

        const tokenRecord = await findRefreshToken(refreshToken);
        if (!tokenRecord || tokenRecord.revokedAt) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // ‼️ Token rotation: invalidate old, issue new (prevents stolen token reuse)
        await revokeRefreshToken(refreshToken);
        const newRefreshToken = crypto.randomBytes(64).toString('hex');
        await storeRefreshToken(tokenRecord.userId, newRefreshToken);

        const accessToken = jwt.sign({ sub: tokenRecord.userId }, process.env.JWT_SECRET, { expiresIn: '15m' });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ accessToken });
    }),
);
```

---

## 9. Security Hardening

### Helmet — security headers‼️

```ts
import helmet from 'helmet';

// Helmet sets many security headers in one call
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"], // only load resources from same origin
                scriptSrc: ["'self'"], // only run scripts from same origin
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        hsts: { maxAge: 31536000, includeSubDomains: true }, // force HTTPS for 1 year
    }),
);

// What Helmet sets:
// X-Content-Type-Options: nosniff         — prevent MIME-type sniffing
// X-Frame-Options: SAMEORIGIN             — prevent clickjacking
// Strict-Transport-Security: max-age=...  — force HTTPS
// X-XSS-Protection: 0                     — disable browser XSS filter (deprecated, CSP is better)
// Content-Security-Policy: ...            — control which resources can load
// Referrer-Policy: no-referrer            — don't leak referrer info
```

### CORS configuration‼️

```ts
import cors from 'cors';

// Development
app.use(
    cors({
        origin: 'http://localhost:5173',
        credentials: true, // allow cookies cross-origin
    }),
);

// Production — whitelist specific origins
app.use(
    cors({
        origin: (origin, callback) => {
            const allowed = ['https://app.example.com', 'https://admin.example.com'];
            if (!origin || allowed.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 86400, // preflight cache: 24 hours
    }),
);

// ‼️ NEVER use in production:
// origin: '*' AND credentials: true — these CANNOT coexist
// The browser blocks this combination for security
```

### Rate limiting‼️

```ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Global rate limiter
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // 100 requests per window
    standardHeaders: true, // return RateLimit-* headers in response
    store: new RedisStore({
        // Redis-backed for multi-server consistency‼️
        sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: req => req.user?.id ?? req.ip, // per-user if authenticated
    handler: (req, res) => res.status(429).json({ error: 'Too many requests, try again later' }),
});

app.use('/api/', limiter);

// Stricter limiter for auth endpoints (prevent brute force)‼️
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // only 5 attempts
    message: { error: 'Too many login attempts, try again in 15 minutes' },
});

app.post('/auth/login', authLimiter, loginHandler);
app.post('/auth/register', authLimiter, registerHandler);
```

### Input sanitization

```ts
// Prevent NoSQL injection (MongoDB)
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize()); // strips $ and . from req.body, req.query, req.params

// Prevent XSS in user input (if you're rendering HTML)
import xss from 'xss';
const clean = xss(userInput); // strips <script> tags, event handlers, etc.

// ‼️ For SQL databases: ALWAYS use parameterized queries, never string concatenation
// Safe:   db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
// Unsafe: db.query(`SELECT * FROM users WHERE id = ${req.params.id}`) // SQL INJECTION‼️
```

---

## 10. Logging & Observability

### Morgan — HTTP request logging

```ts
import morgan from 'morgan';

// Development — colored, concise
app.use(morgan('dev'));
// Output: GET /api/users 200 15.432 ms - 432

// Production — Apache-style combined format
app.use(morgan('combined'));
// Output: ::1 - - [04/Jun/2026:10:30:00] "GET /api/users HTTP/1.1" 200 432

// Custom format
app.use(morgan(':method :url :status :response-time ms'));

// Log to file
import fs from 'fs';
const accessLogStream = fs.createWriteStream('./access.log', { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// Skip health check logs (reduce noise)
app.use(
    morgan('combined', {
        skip: req => req.url === '/health',
    }),
);
```

### Pino — structured JSON logging (production)‼️

```ts
import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { colorize: true } } : undefined, // production: raw JSON (for log aggregators like Datadog, ELK)
});

app.use(pinoHttp({ logger })); // adds req.log to every request

// Use in routes
app.get(
    '/users',
    asyncHandler(async (req, res) => {
        req.log.info({ userId: req.user.id }, 'Fetching user list');
        const users = await db.select().from(usersTable);
        req.log.info({ count: users.length }, 'Users fetched');
        res.json(users);
    }),
);

// Output (production):
// {"level":30,"msg":"Fetching user list","reqId":"req-1","userId":"123","time":1717500000}
```

### Correlation IDs — trace requests across services

```ts
import { v4 as uuid } from 'uuid';

// Middleware — runs on every request
app.use((req, res, next) => {
    // Use upstream correlation ID if provided, otherwise generate one
    req.correlationId = (req.headers['x-correlation-id'] as string) ?? uuid();
    res.setHeader('x-correlation-id', req.correlationId);

    // Attach to logger for all logs in this request
    req.log = req.log?.child({ correlationId: req.correlationId });
    next();
});

// ‼️ Now every log for a single request shares the same correlationId
// When debugging: search your logs by correlationId to trace the full request lifecycle
```

---

## 11. File Uploads & Static Files

### Multer — file upload middleware‼️

```ts
import multer from 'multer';
import path from 'path';

// Disk storage with custom filename
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max‼️
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    },
});

// Single file upload
app.post('/avatar', authenticate, upload.single('avatar'), (req, res) => {
    // req.file = { fieldname, originalname, mimetype, size, path, ... }
    res.json({ url: `/uploads/${req.file.filename}` });
});

// Multiple files
app.post('/photos', upload.array('photos', 10), (req, res) => {
    // req.files = array of file objects
    res.json({ count: req.files.length });
});

// Memory storage (for S3 upload — file stays in memory as Buffer)
const memoryUpload = multer({ storage: multer.memoryStorage() });
app.post('/upload', memoryUpload.single('file'), async (req, res) => {
    // req.file.buffer = Buffer containing the file
    await s3.upload({ Bucket: 'my-bucket', Key: req.file.originalname, Body: req.file.buffer });
    res.json({ success: true });
});
```

### Serving static files

```js
// Serve files from /public directory
app.use(express.static('public'));
// GET /style.css → serves public/style.css

// With virtual prefix
app.use('/static', express.static('public'));
// GET /static/style.css → serves public/style.css

// With cache headers for production‼️
app.use(
    express.static('public', {
        maxAge: '1d', // browser caches files for 1 day
        etag: true, // enable ETag for conditional requests
        lastModified: true, // enable Last-Modified header
        immutable: true, // for content-hashed files (bundle.a1b2c3.js)
        index: false, // don't serve index.html for directories
    }),
);
```

---

## 12. Database Integration Patterns

### Connection setup and graceful shutdown

```ts
import { Pool } from 'pg';
// or: import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // max connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Graceful shutdown — close DB connections before exiting
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(); // stop accepting new requests
    await pool.end(); // close all DB connections
    process.exit(0);
});
```

### Transaction pattern

```ts
app.post(
    '/transfer',
    asyncHandler(async (req, res) => {
        const { fromId, toId, amount } = req.body;

        const client = await pool.connect(); // get connection from pool
        try {
            await client.query('BEGIN');

            const {
                rows: [from],
            } = await client.query(
                'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE', // row lock‼️
                [fromId],
            );

            if (!from || from.balance < amount) {
                throw new AppError(400, 'Insufficient funds');
            }

            await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
            await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);

            await client.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err; // re-throw to error handler
        } finally {
            client.release(); // always return connection to pool‼️
        }
    }),
);
```

### Repository pattern — separate DB logic from routes

```ts
// repositories/userRepository.ts
export const userRepository = {
    findById: (id: string) =>
        db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .then(r => r[0]),

    findByEmail: (email: string) =>
        db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .then(r => r[0]),

    create: (data: NewUser) =>
        db
            .insert(users)
            .values(data)
            .returning()
            .then(r => r[0]),

    update: (id: string, data: Partial<NewUser>) =>
        db
            .update(users)
            .set(data)
            .where(eq(users.id, id))
            .returning()
            .then(r => r[0]),

    delete: (id: string) => db.delete(users).where(eq(users.id, id)),
};

// routes/users.ts — uses repository, no SQL in routes
app.get(
    '/users/:id',
    asyncHandler(async (req, res) => {
        const user = await userRepository.findById(req.params.id);
        if (!user) throw new NotFoundError('User');
        res.json(user);
    }),
);
```

---

## 13. Testing with Supertest

### Integration testing pattern‼️

```ts
// Express uses "supertest" — sends HTTP requests to your app WITHOUT starting a server‼️
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Task API', () => {
    let app;
    let authToken;

    beforeAll(async () => {
        app = createApp(); // create Express app (DON'T call .listen())‼️

        // Seed test user and get token
        const res = await request(app).post('/auth/login').send({ email: 'test@test.com', password: 'password' });
        authToken = res.body.accessToken;
    });

    afterAll(async () => {
        await db.execute(sql`TRUNCATE tasks CASCADE`);
    });

    it('GET /tasks returns empty array', async () => {
        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`) // set header with .set()
            .expect(200); // assert status inline

        expect(res.body).toMatchObject({ data: [], meta: { total: 0 } });
    });

    it('POST /tasks creates a task', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ title: 'Test task', priority: 'high' }) // send body with .send()
            .expect(201);

        expect(res.body).toMatchObject({ title: 'Test task', priority: 'high' });
        expect(res.body.id).toBeDefined();
    });

    it('returns 400 for invalid body', async () => {
        await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ title: '' }) // invalid — empty title
            .expect(400);
    });

    it('returns 401 without token', async () => {
        await request(app).get('/api/tasks').expect(401);
    });

    it('returns 403 for non-admin accessing admin route', async () => {
        await request(app)
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${authToken}`) // regular user token
            .expect(403);
    });
});
```

### Supertest API cheat sheet

```ts
// Methods
request(app).get('/path');
request(app).post('/path');
request(app).put('/path');
request(app).patch('/path');
request(app)
    .delete('/path')

    // Set headers
    .set('Authorization', 'Bearer token')
    .set('Content-Type', 'application/json')
    .set({ 'X-Custom': 'value', Accept: 'application/json' }) // multiple

    // Send body
    .send({ key: 'value' }) // JSON body
    .send('raw string body') // text body
    .field('name', 'value') // form field (multipart)
    .attach('avatar', './test/photo.jpg') // file upload

    // Query string
    .query({ page: 1, limit: 10 }) // ?page=1&limit=10

    // Assertions (can chain)
    .expect(200) // status code
    .expect('Content-Type', /json/) // header regex match
    .expect({ key: 'value' }); // full body match

// Get response for manual assertions
const res = await request(app).get('/path');
res.status; // 200
res.body; // parsed JSON body
res.headers; // response headers
res.text; // raw response text
```

---

## 14. Performance & Scaling

### Compression

```ts
import compression from 'compression';

app.use(
    compression({
        threshold: 1024, // only compress responses > 1KB
        level: 6, // gzip level (1=fast, 9=best compression, 6=default)
        filter: (req, res) => {
            // Don't compress SSE streams
            if (req.headers.accept === 'text/event-stream') return false;
            return compression.filter(req, res);
        },
    }),
);

// ‼️ In production: let Nginx or a CDN handle compression instead
// Nginx is more efficient at gzip/brotli than Node.js
```

### Response caching with Redis

```ts
// Manual caching middleware
const cacheMiddleware = (ttl = 300) =>
    asyncHandler(async (req, res, next) => {
        const key = `cache:${req.originalUrl}`;
        const cached = await redis.get(key);

        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(JSON.parse(cached));
        }

        // Override res.json to intercept and cache the response
        const originalJson = res.json.bind(res);
        res.json = body => {
            redis.setex(key, ttl, JSON.stringify(body)); // cache for ttl seconds
            res.setHeader('X-Cache', 'MISS');
            return originalJson(body);
        };

        next();
    });

// Use on specific routes
app.get(
    '/api/stats',
    cacheMiddleware(600),
    asyncHandler(async (req, res) => {
        const stats = await computeExpensiveStats(); // only runs on cache miss
        res.json(stats);
    }),
);
```

### Cluster mode — use all CPU cores

```ts
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    console.log(`Primary ${process.pid} forking ${numCPUs} workers`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', worker => {
        console.log(`Worker ${worker.process.pid} died — forking replacement`);
        cluster.fork(); // auto-restart crashed workers
    });
} else {
    const app = createApp();
    app.listen(3000, () => console.log(`Worker ${process.pid} started`));
}

// ‼️ In production: prefer Kubernetes pods or PM2 over manual cluster
// PM2:  pm2 start app.js -i max   (auto-clusters across all CPUs)
// K8s:  run multiple pod replicas  (container orchestration handles scaling)
```

### Performance tips

```text
1. Body size limits — prevent DoS:‼️
   app.use(express.json({ limit: '10kb' }));

2. Pagination — never return unbounded results:‼️
   Always use LIMIT/OFFSET, never SELECT * without a cap.

3. Promise.all for independent async operations:
   const [users, tasks] = await Promise.all([getUsers(), getTasks()]);
   // Instead of: const users = await getUsers(); const tasks = await getTasks();

4. Avoid sync operations in request handlers:
   ✗ fs.readFileSync()   → blocks event loop, all requests stall
   ✓ fs.readFile() or fs/promises

5. Let Nginx handle static files and SSL:
   Node.js is slower at serving static files than Nginx.
   Nginx can also handle gzip, rate limiting, and SSL termination.

6. Use connection pooling for databases:
   Don't open a new connection per request — use a pool (pg.Pool, Drizzle).
```

---

## 15. Production Readiness

### Environment validation — fail fast at startup‼️

```ts
import { z } from 'zod';

const env = z
    .object({
        NODE_ENV: z.enum(['development', 'production', 'test']),
        PORT: z.coerce.number().default(3000),
        DATABASE_URL: z.string().url(),
        REDIS_URL: z.string().url().default('redis://localhost:6379'),
        JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
        CORS_ORIGIN: z.string().url(),
        LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
    })
    .parse(process.env);
// ‼️ Throws at startup if any required env var is missing or invalid
// Better to crash here than discover a missing var at 3am in production

export default env;
```

### Graceful shutdown

```ts
const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
});

async function gracefulShutdown(signal) {
    console.log(`${signal} received, shutting down gracefully`);

    // 1. Stop accepting new requests
    server.close();

    // 2. Wait for in-flight requests to finish (Express does this on close)

    // 3. Close external connections
    await pool.end(); // close DB connection pool
    await redis.quit(); // close Redis connection

    console.log('Shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Crash on uncaught exceptions — let process manager restart‼️
process.on('uncaughtException', err => {
    console.error('Uncaught exception:', err);
    process.exit(1); // crash — unknown state, don't continue
});

process.on('unhandledRejection', reason => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
});
```

### Health and readiness endpoints

```ts
// Health — is the process alive?
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// Readiness — can the process serve traffic? (DB, Redis connected)
app.get(
    '/ready',
    asyncHandler(async (req, res) => {
        const checks = await Promise.allSettled([pool.query('SELECT 1'), redis.ping()]);

        const dbOk = checks[0].status === 'fulfilled';
        const redisOk = checks[1].status === 'fulfilled';
        const ready = dbOk && redisOk;

        res.status(ready ? 200 : 503).json({
            status: ready ? 'ready' : 'not ready',
            checks: {
                database: dbOk ? 'ok' : 'fail',
                redis: redisOk ? 'ok' : 'fail',
            },
        });
    }),
);

// ‼️ Kubernetes uses these:
//   livenessProbe  → /health  (restart if dead)
//   readinessProbe → /ready   (remove from load balancer if not ready)
```

---

## 16. Express 5 — What Changes

```text
Express 5 (released 2024 — first major update in 10+ years):

✅ Async error handling — async route handlers just work‼️
   No more asyncHandler wrapper, no more express-async-errors.
   app.get('/users', async (req, res) => {
     const users = await db.getUsers(); // throws → automatically caught
     res.json(users);
   });

✅ Removed deprecated APIs:
   - req.host → use req.hostname
   - res.json(obj, status) → use res.status(n).json(obj)
   - app.del() → use app.delete()
   - req.param() → use req.params, req.query, req.body

✅ Path route matching changes:
   - Regex-like patterns in paths are stricter
   - Optional params: /users/:id? no longer works — use /users{/:id}

✅ res.render() returns a Promise (can await it)

✅ Dropped Node.js < 18 support

Migration:
  npm install express@5
  Most Express 4 apps work with minimal changes.
  Main breaking change: path pattern syntax.
```

---

## 17. Full Project Structure

```text
src/
  app.ts              ← Express app setup, middleware registration
  server.ts           ← app.listen() only — separate for testing‼️
  config/
    env.ts            ← Zod-validated environment variables
    database.ts       ← DB connection pool setup
    redis.ts          ← Redis client setup
  middleware/
    authenticate.ts   ← JWT verification middleware
    authorize.ts      ← Role-based access control
    validate.ts       ← Zod validation middleware factory
    errorHandler.ts   ← Centralized error handler
    rateLimiter.ts    ← Rate limiting config
  routes/
    index.ts          ← Mounts all routers: app.use('/api/users', userRouter)
    users.ts          ← Router for /api/users
    tasks.ts          ← Router for /api/tasks
    auth.ts           ← Router for /auth (login, register, refresh)
  controllers/        ← Route handlers (thin — delegate to services)
    userController.ts
    taskController.ts
  services/           ← Business logic (testable without Express)
    userService.ts
    taskService.ts
  repositories/       ← Database queries (SQL / ORM)
    userRepository.ts
    taskRepository.ts
  errors/
    AppError.ts       ← Custom error classes
  types/
    express.d.ts      ← Extend Express Request type (req.user, req.correlationId)
  utils/
    asyncHandler.ts   ← asyncHandler wrapper (Express 4 only)

‼️ Key principle: app.ts creates and configures the app, server.ts calls .listen()
   This separation lets Supertest import app without starting the server.
```

### Extending Express Request type (TypeScript)

```ts
// types/express.d.ts
declare global {
    namespace Express {
        interface Request {
            user?: {
                sub: string;
                role: string;
                iat: number;
                exp: number;
            };
            correlationId?: string;
        }
    }
}
export {};

// Now req.user and req.correlationId are typed everywhere‼️
```

---

## 18. Common Interview Questions

### "What is Express.js?"

> Express is a minimal, unopinionated web framework for Node.js. It's a thin layer on top of Node's built-in `http` module that provides routing and a middleware pipeline. When you call `express()`, you get a function that IS a Node.js request handler — `app.listen(3000)` is just shorthand for `http.createServer(app).listen(3000)`. Express gives you routing, middleware, and convenience methods on req/res — everything else (validation, ORM, auth) you choose yourself.

### "What is middleware and how does the chain work?"

> Middleware is a function with the signature `(req, res, next)`. Express maintains a stack of these functions and walks through them in order for each request. Each middleware can modify req/res, send a response (ending the chain), or call `next()` to pass control to the next middleware. If `next(err)` is called, Express skips all normal middleware and jumps to error handlers (which have 4 params: `err, req, res, next`). Order of `app.use()` registration matters — that's the execution order.

### "How does Express handle async errors?"

> Express 4 does NOT catch async errors automatically — this is the biggest gotcha. If an `async` route handler throws, Express never sees it (unhandled rejection). Three fixes: (1) wrap every handler in try/catch and call `next(err)`, (2) use an `asyncHandler` wrapper that catches rejections and calls `next(err)`, (3) use the `express-async-errors` package that monkey-patches Express. Express 5 fixes this natively — async errors are caught automatically.

### "What is the difference between app.use() and app.get()?"

> `app.use()` matches ALL HTTP methods and matches any path that STARTS WITH the given prefix. `app.get()` only matches GET requests to the exact path (or path with params). `app.use('/api')` matches `/api`, `/api/users`, `/api/anything`. `app.get('/api')` only matches `GET /api`. Use `app.use()` for middleware, `app.get/post/put/delete()` for route handlers.

### "What is express.Router() and why use it?"

> `express.Router()` creates a mini-app (a modular route handler). You define routes on the Router, then mount it on the app with a prefix: `app.use('/api/users', userRouter)`. Benefits: (1) organize routes by feature, (2) scope middleware to specific route groups (e.g., auth only on user routes), (3) keep `app.ts` clean — it just mounts routers. It's Express's way of creating modular, maintainable route structure.

### "What is the difference between req.params, req.query, and req.body?"

> `req.params` — values from URL path parameters. `GET /users/:id` → `req.params.id = '123'`. `req.query` — values from the query string. `GET /users?page=2` → `req.query.page = '2'`. `req.body` — the parsed request body (POST/PUT/PATCH). Requires `express.json()` middleware — without it, `req.body` is undefined. Params and query are always strings; body can be any parsed type.

### "How would you structure a large Express application?"

> Separate concerns: `app.ts` sets up middleware and mounts routers. `server.ts` calls `app.listen()` (separate so tests can import app without starting the server). Routes go in `routes/` as Router files. Business logic goes in `services/`. Database queries go in `repositories/`. Middleware (auth, validation, error handling) gets its own directory. Custom error classes in `errors/`. Environment validation in `config/`. The key principle: route handlers should be thin — they validate input, call a service, and send the response.

### "How do you handle authentication in Express?"

> JWT-based: Login endpoint verifies credentials and returns an access token (short-lived, 15min) in the response body and a refresh token (long-lived, 7 days) in an httpOnly cookie. An auth middleware extracts the Bearer token from the Authorization header, verifies it with `jwt.verify()`, and attaches the decoded payload to `req.user`. Protected routes use this middleware: `app.get('/profile', authenticate, handler)`. Role-based access adds a second middleware: `requireRole('admin')`. Refresh tokens enable silent re-authentication without re-entering credentials.

### "What is the difference between Express and Fastify?"

```text
Express:
  - Middleware chain architecture (connect-style)
  - No built-in validation, serialization, or logging
  - ~15,000 req/s
  - Massive ecosystem (10+ years, thousands of packages)
  - Async errors NOT caught (Express 4) — need wrapper
  - TypeScript: bolted on (@types/express)

Fastify:
  - Plugin system with encapsulation (plugins don't leak)
  - Built-in: JSON Schema validation (ajv), serialization (fast-json-stringify), Pino logging
  - ~75,000 req/s (5x faster)
  - Async errors caught automatically
  - TypeScript-first
  - Better for new production APIs and greenfield projects

For most apps: framework speed doesn't matter — your DB is the bottleneck.‼️
Express overhead: ~0.07ms per request. DB query: 5-50ms.
```

### "What security middleware should every Express app have?"

> At minimum: (1) `helmet` — sets security headers (CSP, HSTS, X-Content-Type-Options, etc.). (2) `cors` — configure allowed origins, never use `*` with credentials. (3) `express-rate-limit` — prevent brute force and DDoS, stricter limits on auth endpoints. (4) `express.json({ limit: '10kb' })` — limit body size to prevent payload DoS. (5) Always use parameterized queries (never string interpolation in SQL). (6) Store tokens in httpOnly cookies, not localStorage (XSS protection). (7) Set `trust proxy` correctly if behind a reverse proxy.
