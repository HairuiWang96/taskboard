# Express.js + TypeScript — Senior Developer Deep Reference

> Covers Express internals, middleware pipeline, req/res API, routing, error handling, validation, authentication, security, logging, testing, performance, production patterns, and interview questions — all with full TypeScript types.

---

## Table of Contents

1. [What Express Actually Is](#1-what-express-actually-is)
2. [TypeScript Setup for Express](#2-typescript-setup-for-express)
3. [The Request & Response Objects](#3-the-request--response-objects)
4. [Middleware Pipeline — The Core Concept](#4-middleware-pipeline--the-core-concept)
5. [Routing & Router Architecture](#5-routing--router-architecture)
6. [Error Handling](#6-error-handling)
7. [Request Body Parsing](#7-request-body-parsing)
8. [Validation Patterns](#8-validation-patterns)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Security Hardening](#10-security-hardening)
11. [Logging & Observability](#11-logging--observability)
12. [File Uploads & Static Files](#12-file-uploads--static-files)
13. [Database Integration Patterns](#13-database-integration-patterns)
14. [Testing with Supertest](#14-testing-with-supertest)
15. [Performance & Scaling](#15-performance--scaling)
16. [Production Readiness](#16-production-readiness)
17. [Express 5 — What Changes](#17-express-5--what-changes)
18. [Full Project Structure](#18-full-project-structure)
19. [Common Interview Questions](#19-common-interview-questions)

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

```ts
// These two are equivalent:
// Shorthand:
import express from 'express';
import http from 'http';

const app: express.Express = express();
app.listen(3000);

// Explicit:
const app2: express.Express = express();
http.createServer(app2).listen(3000);
// ‼️ app itself is the (req, res) callback — that's the entire design
```

### Minimal Express app

```ts
import express, { Request, Response } from 'express';

const app: express.Express = express();

// Built-in middleware
app.use(express.json()); // parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // parse HTML form data‼️

// Route
app.get('/api/users', (req: Request, res: Response): void => {
    res.json({ users: [] });
});

// Start server
app.listen(3000, (): void => console.log('Server running on port 3000'));
```

---

## 2. TypeScript Setup for Express

### Installing type packages

```ts
// Install Express and its TypeScript type definitions:
// npm install express
// npm install -D typescript @types/express @types/node
//
// Other common type packages you'll need:
// npm install -D @types/cors @types/morgan @types/cookie-parser @types/bcrypt @types/jsonwebtoken @types/multer @types/compression @types/supertest
```

### tsconfig.json essentials for Express

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "Node16",
        "moduleResolution": "Node16",
        "esModuleInterop": true,
        "strict": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

```text
Key tsconfig options for Express:‼️

  esModuleInterop: true
    → Lets you write: import express from 'express'
    → Without it you'd need: import * as express from 'express'

  strict: true
    → Enables all strict type checks (noImplicitAny, strictNullChecks, etc.)
    → Catches bugs at compile time — always use in production projects‼️

  outDir / rootDir
    → outDir: where compiled JS goes (dist/)
    → rootDir: where your source TS lives (src/)

  declaration: true
    → Generates .d.ts files — useful if you're building a library
```

### Extending Express Request interface (declare global namespace Express)

```ts
// types/express.d.ts
// ‼️ This file extends Express's built-in Request type with custom properties
// You need this when you attach custom data to req (e.g., req.user, req.correlationId)

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
export {}; // ‼️ This empty export makes the file a module — required for declare global to work

// Now req.user and req.correlationId are typed everywhere‼️
// TypeScript will autocomplete and type-check these properties on any Request object

// ‼️ Make sure this file is included in your tsconfig.json "include" array
// If it's under src/, the default "src/**/*" glob picks it up automatically
```

---

## 3. The Request & Response Objects

### req — Express extends Node's IncomingMessage

```ts
import { Request } from 'express';

// Express adds these convenience properties ON TOP of vanilla Node req

// Given a handler with req typed as Request:
function showReqProperties(req: Request): void {
    req.params; // { id: '123' } — from route params like /users/:id
    req.query; // { page: '1', sort: 'name' } — from ?page=1&sort=name‼️
    req.body; // parsed body — ONLY available after body-parser middleware‼️
    req.ip; // client IP (respects X-Forwarded-For if trust proxy set)‼️
    req.path; // '/users/123' — URL path without query string‼️
    req.method; // 'GET', 'POST', etc.
    req.hostname; // 'example.com' (respects X-Forwarded-Host if trust proxy set)
    req.protocol; // 'http' or 'https' (respects X-Forwarded-Proto if trust proxy set)
    req.secure; // true if req.protocol === 'https'
    req.originalUrl; // '/api/users/123?page=1' — full URL with query string
    req.baseUrl; // '/api/users' — the prefix the router was mounted on
    req.cookies; // { session: 'abc' } — only available with cookie-parser middleware‼️
    req.signedCookies; // cookies that were signed with a secret‼️
    req.fresh; // true if the client's cached version is still valid (ETag/Last-Modified)‼️
    req.stale; // opposite of fresh
    req.xhr; // true if X-Requested-With: XMLHttpRequest (deprecated pattern)

    // Methods
    req.get('Content-Type'); // get a request header (case-insensitive)
    req.accepts('json'); // content negotiation — does client accept JSON?
    req.is('application/json'); // check if Content-Type matches
}
```

### res — Express extends Node's ServerResponse

```ts
import { Request, Response } from 'express';

// Express adds these convenience methods ON TOP of vanilla Node res

function showResMethods(req: Request, res: Response): void {
    // Sending responses (use ONE per request — calling two = error)‼️
    res.json({ key: 'val' }); // sets Content-Type: application/json + JSON.stringify‼️
    res.send('text'); // sends string, Buffer, or object (auto-sets Content-Type)
    res.sendStatus(204); // sends status code with status text as body
    res.end(); // end response with no body (vanilla Node method)‼️

    // Status codes — chainable
    res.status(201).json({ id: 1 }); // set status then send‼️
    res.status(404).send('Not found');

    // Headers
    res.set('X-Custom', 'value'); // set a response header‼️
    res.set({ 'X-A': '1', 'X-B': '2' }); // set multiple headers
    res.get('Content-Type'); // get a response header you already set
    res.append('Set-Cookie', 'a=1'); // append (not replace) a header value

    // Redirects
    res.redirect('/new-path'); // 302 redirect (temporary) by default
    res.redirect(301, '/new-path'); // 301 redirect (permanent)

    // Cookies (need cookie-parser middleware for reading, but setting works natively)‼️
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
        'text/html': (): void => {
            res.send('<h1>Hello</h1>');
        },
        'application/json': (): void => {
            res.json({ message: 'Hello' });
        },
        default: (): void => {
            res.status(406).send('Not Acceptable');
        },
    });

    // Locals — pass data to templates or downstream middleware‼️
    res.locals.user = { id: 1, name: 'Alice' };
    // res.locals persists for the ENTIRE request lifecycle — great for template rendering
}
```

### Trust Proxy — critical for production‼️

```ts
import express from 'express';

const app: express.Express = express();

// If behind a reverse proxy (Nginx, AWS ALB, Cloudflare, etc.) you MUST set this:
app.set('trust proxy', 1); // trust first hop‼️

// Without this:
//   req.ip       → proxy's IP (wrong!)
//   req.protocol → 'http' even if client used HTTPS (wrong!)
//   req.hostname → proxy's hostname (wrong!)

// With this:
//   req.ip       → real client IP from X-Forwarded-For header
//   req.protocol → 'https' if X-Forwarded-Proto: https
//   req.hostname → real hostname from X-Forwarded-Host

// Values:‼️
app.set('trust proxy', true); // trust all proxies (dangerous — IP spoofing)‼️
app.set('trust proxy', 1); // trust first proxy (ALB, Nginx)
app.set('trust proxy', 2); // trust first two proxies (Cloudflare → ALB)
app.set('trust proxy', 'loopback'); // trust 127.0.0.1 only
app.set('trust proxy', '10.0.0.0/8'); // trust IPs in this subnet

// ‼️ AWS ALB / ECS:   trust proxy = 1
// ‼️ Cloudflare → ALB: trust proxy = 2
// ‼️ Never use `true` in production — allows clients to spoof their IP
```

---

## 4. Middleware Pipeline — The Core Concept

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

```ts
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

const app: express.Express = express();

// 1. Logger — runs for EVERY request (no path = matches all)
app.use((req: Request, res: Response, next: NextFunction): void => {
    console.log(`${req.method} ${req.url}`);
    next(); // MUST call next() or the request hangs‼️
});

// 2. Body parser — parse JSON bodies; populates req.body
app.use(express.json());
// ‼️ Without this, req.body is undefined for POST/PUT with JSON body

// 3. Route-specific middleware (only runs for /users/* paths)
app.use('/users', requireAuth);

// 4. Route handler
app.get('/users/:id', (req: Request, res: Response): void => {
    res.json({ id: req.params.id });
});

// 5. 404 handler — runs if NO route matched (must be after all routes)‼️
app.use((req: Request, res: Response): void => {
    res.status(404).json({ error: 'Not found' });
});

// 6. Error handler — MUST have 4 params for Express to recognize it‼️
const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    res.status(500).json({ error: err.message });
};
app.use(errorHandler);
```

### Middleware types

```ts
import express, { Request, Response, NextFunction, ErrorRequestHandler, RequestHandler } from 'express';

const app: express.Express = express();

// 1. Application-level: runs on every request to the app
app.use(express.json());
app.use(morgan('dev'));

// 2. Route-level: applied to a specific Router
const router: express.Router = express.Router();
router.use(requireAuth); // only applies to routes in this router

// 3. Inline route middleware: runs only on a specific route
app.get('/admin', requireAuth, requireRole('admin'), (req: Request, res: Response): void => {
    res.json({ message: 'Welcome admin' });
});

// 4. Error-handling: has 4 parameters — (err, req, res, next)
const globalErrorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    /* ... */
};
app.use(globalErrorHandler);

// 5. Built-in middleware:
express.json(); // parse application/json bodies
express.urlencoded({ extended: true }); // parse HTML form submissions
express.static('public'); // serve static files from /public directory

// 6. Third-party:
// cors, helmet, morgan, compression, cookie-parser, express-rate-limit, etc.
```

### next() — the three behaviors‼️

```ts
import { Request, Response, NextFunction } from 'express';

// next()        → go to NEXT middleware/route handler in the stack
// next('route') → skip remaining handlers for THIS route, go to NEXT matching route
// next(err)     → SKIP all regular middleware, jump to error handler‼️

// Example of next('route'):
app.get(
    '/user/:id',
    (req: Request, res: Response, next: NextFunction): void => {
        if (req.params.id === 'admin') return next('route'); // skip to next route definition
        next(); // continue to second handler below
    },
    (req: Request, res: Response): void => {
        res.send('Regular user'); // skipped if next('route') was called
    },
);

app.get('/user/:id', (req: Request, res: Response): void => {
    res.send('Admin user'); // only runs if next('route') was called above
});
```

### Common middleware ordering pattern‼️

```ts
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';

const app: express.Express = express();

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
app.use((req: Request, res: Response): void => {
    res.status(404).json({ error: 'Not found' });
});

// 11. Error handler (LAST — catches everything)‼️
const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    /* ... */
};
app.use(errorHandler);
```

---

## 5. Routing & Router Architecture

### Basic routing

```ts
import express, { Request, Response } from 'express';

const app: express.Express = express();

// Route = HTTP method + path + handler(s)
app.get('/users', getUsers); // GET    /users
app.post('/users', createUser); // POST   /users
app.put('/users/:id', updateUser); // PUT    /users/123
app.patch('/users/:id', patchUser); // PATCH  /users/123
app.delete('/users/:id', delUser); // DELETE /users/123
app.all('/secret', requireAuth); // ALL methods — useful for shared middleware

// Route parameters
app.get('/users/:id', (req: Request<{ id: string }>, res: Response): void => {
    req.params.id; // '123'
});

// Multiple parameters
app.get(
    '/users/:userId/posts/:postId',
    (req: Request<{ userId: string; postId: string }>, res: Response): void => {
        req.params.userId; // '123'
        req.params.postId; // '456'
    },
);

// Optional parameters (regex)
app.get('/users/:id(\\d+)', (req: Request<{ id: string }>, res: Response): void => {
    // Only matches if :id is all digits — /users/abc returns 404
});
```

### express.Router() — modular route grouping‼️

```ts
// ‼️ Key pattern: NEVER define all routes on app — split into Router files

// routes/users.ts
import { Router, Request, Response, RequestHandler } from 'express';

const router: Router = Router();

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
import express, { Router, Request, Response } from 'express';

const app: express.Express = express();

// Public routes — no auth
const publicRouter: Router = Router();
publicRouter.get('/health', (req: Request, res: Response): void => {
    res.json({ status: 'ok' });
});
publicRouter.post('/auth/login', loginHandler);
publicRouter.post('/auth/register', registerHandler);
app.use(publicRouter);

// Protected routes — require authentication
const protectedRouter: Router = Router();
protectedRouter.use(authenticate); // all routes below need auth‼️
protectedRouter.use('/api/users', userRouter);
protectedRouter.use('/api/tasks', taskRouter);
app.use(protectedRouter);

// Admin routes — require auth + admin role
const adminRouter: Router = Router();
adminRouter.use(authenticate);
adminRouter.use(requireRole('admin')); // all routes below need admin‼️
adminRouter.get('/api/admin/stats', getStats);
adminRouter.get('/api/admin/users', getAllUsers);
app.use(adminRouter);
```

### Route chaining with app.route()

```ts
import express, { Request, Response } from 'express';

const app: express.Express = express();

// Cleaner syntax when multiple methods share the same path
app.route('/users/:id').get(getUser).put(updateUser).patch(patchUser).delete(deleteUser);
```

### Router.param() — pre-processing route params

```ts
import { Router, Request, Response, NextFunction } from 'express';

const router: Router = Router();

// Runs BEFORE any route handler that uses :id‼️
router.param('id', async (req: Request, res: Response, next: NextFunction, id: string): Promise<void> => {
    const user = await db.findUser(id);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    req.user = user; // attach to req for downstream handlers
    next();
});

// Now every route with :id automatically has req.user populated
router.get('/:id', (req: Request, res: Response): void => {
    res.json(req.user);
});
router.put('/:id', (req: Request, res: Response): void => {
    /* req.user is already loaded */
});
router.delete('/:id', (req: Request, res: Response): void => {
    /* req.user is already loaded */
});
```

---

## 6. Error Handling

### The biggest Express gotcha — async errors‼️

```ts
import express, { Request, Response, NextFunction, RequestHandler } from 'express';

// Express was built before async/await — it does NOT catch async errors!‼️

// ✗ BROKEN — if db.getUsers() rejects, Express hangs or crashes
app.get('/users', async (req: Request, res: Response): Promise<void> => {
    const users = await db.getUsers(); // if this throws → unhandled rejection!
    res.json(users);
});

// ✓ FIX 1: try/catch every route (tedious but explicit)
app.get('/users', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const users = await db.getUsers();
        res.json(users);
    } catch (err) {
        next(err); // forward to error handler
    }
});

// ✓ FIX 2: asyncHandler wrapper (recommended for Express 4)‼️
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
// This takes your async function, and if it rejects, automatically calls next(err)
// which forwards the error to the centralized error handler

app.get(
    '/users',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
import { Request, Response, NextFunction, RequestHandler } from 'express';

// asyncHandler is a higher-order function:
//   - Takes your async route handler (fn)
//   - Returns a NEW function that Express calls with (req, res, next)
//   - Wraps fn in Promise.resolve() so even sync throws become rejections
//   - Attaches .catch(next) so any rejection calls next(err) automatically
//   - next(err) skips all normal middleware and jumps to the error handler

const asyncHandler =
    (
        fn: (req: Request, res: Response, next: NextFunction) => Promise<void>, // fn = your async (req, res) => { ... }
    ): RequestHandler =>
    (
        req: Request,
        res: Response,
        next: NextFunction, // returns Express-compatible middleware
    ): void => {
        Promise.resolve(fn(req, res, next)) // run fn, wrap result in Promise
            .catch(next); // if Promise rejects → call next(err)
    };

// Why Promise.resolve()?
// If fn is sync and throws, the throw becomes a rejected Promise,
// which .catch(next) catches. Covers both sync and async errors.
```

### Custom error classes

```ts
// Create custom errors with status codes — throw from anywhere, handle in one place‼️

class AppError extends Error {
    public readonly statusCode: number;
    public readonly code?: string;

    constructor(statusCode: number, message: string, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
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
    public readonly details: unknown;

    constructor(details: unknown) {
        super(400, 'Validation failed', 'VALIDATION_ERROR');
        this.details = details;
    }
}

// Usage in route handlers:
import { Request, Response } from 'express';

app.get(
    '/users/:id',
    asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const user = await db.findUser(req.params.id);
        if (!user) throw new NotFoundError('User');
        if (user.id !== req.user?.sub) throw new ForbiddenError();
        res.json(user);
    }),
);
```

### Centralized error handler — ONE place for all errors‼️

```ts
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

// ‼️ Must be registered LAST — after all routes
// ‼️ Must have EXACTLY 4 parameters — Express identifies error handlers by param count

interface AppErrorLike extends Error {
    statusCode?: number;
    code?: string;
}

interface ZodErrorLike extends Error {
    name: 'ZodError';
    flatten: () => unknown;
}

const centralErrorHandler: ErrorRequestHandler = (
    err: AppErrorLike & { code?: string },
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    // Zod validation errors
    if (err.name === 'ZodError') {
        res.status(400).json({
            error: 'Validation Error',
            details: (err as unknown as ZodErrorLike).flatten(),
        });
        return;
    }

    // Your custom AppError instances
    if (err.statusCode) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
        return;
    }

    // Database unique constraint violation (Postgres error code)
    if (err.code === '23505') {
        res.status(409).json({ error: 'Resource already exists' });
        return;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token expired' });
        return;
    }

    // Unexpected errors — NEVER leak internals to client‼️
    console.error('UNEXPECTED ERROR:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

app.use(centralErrorHandler);

// 404 handler — registered AFTER all routes but BEFORE error handler
app.use((req: Request, res: Response): void => {
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

## 7. Request Body Parsing

### Built-in parsers

```ts
import express from 'express';

const app: express.Express = express();

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
import express, { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';

// Stripe, GitHub, etc. send webhooks with a signature header
// You MUST verify the signature using the raw body — NOT the parsed body‼️

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface StripeWebhookRequest extends Request {
    body: Buffer; // raw body for signature verification
}

// Use express.raw() for the webhook route only
app.post(
    '/webhook/stripe',
    express.raw({ type: 'application/json' }), // raw Buffer, not parsed JSON‼️
    async (req: StripeWebhookRequest, res: Response): Promise<void> => {
        const sig: string | undefined = req.headers['stripe-signature'] as string | undefined;
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig as string,
                process.env.STRIPE_WEBHOOK_SECRET as string,
            );
            // req.body is a Buffer here — Stripe SDK needs the raw bytes to verify
        } catch (err) {
            res.status(400).json({ error: 'Invalid signature' });
            return;
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

## 8. Validation Patterns

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
import { Request, Response, NextFunction, RequestHandler } from 'express';

// ‼️ Reusable middleware factory — validates body, query, or params

const validate = (schema: ZodSchema): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: result.error.flatten(),
            });
            return;
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

// Infer the TypeScript type from the Zod schema‼️
type CreateUserBody = z.infer<typeof createUserSchema>;

// Use in route
app.post(
    '/users',
    validate(createUserSchema),
    asyncHandler(async (req: Request<{}, {}, CreateUserBody>, res: Response): Promise<void> => {
        // req.body is validated and typed here — safe to use directly
        const user = await createUser(req.body);
        res.status(201).json(user);
    }),
);
```

### Validate body, params, and query separately

```ts
import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// More flexible — validate different parts of the request

interface ValidationSchemas {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
}

const validateRequest = ({ body, params, query }: ValidationSchemas): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): void => {
        if (body) {
            const result = body.safeParse(req.body);
            if (!result.success) {
                res.status(400).json({ error: result.error.flatten() });
                return;
            }
            req.body = result.data;
        }
        if (params) {
            const result = params.safeParse(req.params);
            if (!result.success) {
                res.status(400).json({ error: result.error.flatten() });
                return;
            }
            req.params = result.data;
        }
        if (query) {
            const result = query.safeParse(req.query);
            if (!result.success) {
                res.status(400).json({ error: result.error.flatten() });
                return;
            }
            req.query = result.data;
        }
        next();
    };

// Usage
const getUserParamsSchema = z.object({ id: z.string().uuid() });
const getUserQuerySchema = z.object({ include: z.enum(['posts', 'comments']).optional() });

type GetUserParams = z.infer<typeof getUserParamsSchema>;
type GetUserQuery = z.infer<typeof getUserQuerySchema>;

app.get(
    '/users/:id',
    validateRequest({
        params: getUserParamsSchema,
        query: getUserQuerySchema,
    }),
    asyncHandler(async (req: Request<GetUserParams, {}, {}, GetUserQuery>, res: Response): Promise<void> => {
        const user = await getUser(req.params.id, req.query.include);
        res.json(user);
    }),
);
```

### Joi validation (alternative)

```ts
import Joi, { ValidationResult } from 'joi';
import { Request, Response, NextFunction, RequestHandler } from 'express';

interface CreateUserJoiBody {
    name: string;
    email: string;
    role: 'admin' | 'user';
}

const schema: Joi.ObjectSchema<CreateUserJoiBody> = Joi.object({
    name: Joi.string().min(1).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid('admin', 'user').default('user'),
});

app.post(
    '/users',
    (req: Request, res: Response, next: NextFunction): void => {
        const { error, value }: ValidationResult<CreateUserJoiBody> = schema.validate(req.body, {
            abortEarly: false,
        });
        if (error) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.details.map((d: Joi.ValidationErrorItem) => d.message),
            });
            return;
        }
        req.body = value; // cleaned + validated
        next();
    },
    createUserHandler,
);
```

---

## 9. Authentication & Authorization

### JWT authentication middleware‼️

```ts
import express, { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

const app: express.Express = express();
app.use(cookieParser()); // needed to read cookies‼️

// Define typed JWT payload
interface TokenPayload extends JwtPayload {
    sub: string;
    role: string;
}

// Define typed request body for login
interface LoginBody {
    email: string;
    password: string;
}

// Define typed user from DB
interface DbUser {
    id: string;
    email: string;
    role: string;
    passwordHash: string;
}

// Login endpoint — issues access token + refresh token
app.post(
    '/auth/login',
    asyncHandler(async (req: Request<{}, {}, LoginBody>, res: Response): Promise<void> => {
        const { email, password } = req.body;
        const user: DbUser | null = await findUserByEmail(email);

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
            // ‼️ Don't say "user not found" or "wrong password" — helps attackers
        }

        // Access token — short-lived, sent in response body
        const accessToken: string = jwt.sign(
            { sub: user.id, role: user.role } as TokenPayload,
            process.env.JWT_SECRET as string,
            { expiresIn: '15m' },
        );

        // Refresh token — long-lived, stored in httpOnly cookie
        const refreshToken: string = crypto.randomBytes(64).toString('hex');
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
import { Request, Response, NextFunction, Router } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface TokenPayload extends JwtPayload {
    sub: string;
    role: string;
}

const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader: string | undefined = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    const token: string = authHeader.split(' ')[1];
    try {
        const decoded: TokenPayload = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
        req.user = decoded;
        // req.user = { sub: '123', role: 'admin', iat: ..., exp: ... }
        next();
    } catch (err) {
        if ((err as Error).name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Use as route-level middleware
app.get('/api/profile', authenticate, getProfile);

// Or on a Router — protects all routes in the router
const protectedRouter: Router = Router();
protectedRouter.use(authenticate);
protectedRouter.get('/users', getUsers);
protectedRouter.get('/tasks', getTasks);
app.use('/api', protectedRouter);
```

### RBAC — Role-Based Access Control‼️

```ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Middleware factory — returns middleware that checks for required roles
function requireRole(...roles: string[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user?.role || !roles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Requires one of: ${roles.join(', ')}`,
            });
            return;
        }
        next(); // Express REQUIRES next() — forgetting it hangs the request‼️
    };
}

// Chain middleware: authenticate first, then check role
app.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);
app.get('/reports', authenticate, requireRole('admin', 'manager'), getReports);

// Resource ownership — user can only access their own data
function requireOwnerOrAdmin(req: Request, res: Response, next: NextFunction): void {
    if (req.user?.role === 'admin') return next(); // admin bypasses
    if (req.user?.sub !== req.params.id) {
        res.status(403).json({ error: 'You can only access your own data' });
        return;
    }
    next();
}

app.get('/users/:id', authenticate, requireOwnerOrAdmin, getUser);
app.put('/users/:id', authenticate, requireOwnerOrAdmin, updateUser);
```

### Token refresh endpoint

```ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface RefreshTokenRecord {
    userId: string;
    revokedAt: Date | null;
}

app.post(
    '/auth/refresh',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const refreshToken: string | undefined = req.cookies.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ error: 'No refresh token' });
            return;
        }

        const tokenRecord: RefreshTokenRecord | null = await findRefreshToken(refreshToken);
        if (!tokenRecord || tokenRecord.revokedAt) {
            res.status(401).json({ error: 'Invalid refresh token' });
            return;
        }

        // ‼️ Token rotation: invalidate old, issue new (prevents stolen token reuse)
        await revokeRefreshToken(refreshToken);
        const newRefreshToken: string = crypto.randomBytes(64).toString('hex');
        await storeRefreshToken(tokenRecord.userId, newRefreshToken);

        const accessToken: string = jwt.sign(
            { sub: tokenRecord.userId },
            process.env.JWT_SECRET as string,
            { expiresIn: '15m' },
        );

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

## 10. Security Hardening

### Helmet — security headers‼️

```ts
import express from 'express';
import helmet from 'helmet';

const app: express.Express = express();

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
import express from 'express';
import cors, { CorsOptions, CorsOptionsDelegate } from 'cors';

const app: express.Express = express();

// Development
app.use(
    cors({
        origin: 'http://localhost:5173',
        credentials: true, // allow cookies cross-origin
    } as CorsOptions),
);

// Production — whitelist specific origins
const corsOptionsDelegate: CorsOptionsDelegate = (req, callback) => {
    const allowed: string[] = ['https://app.example.com', 'https://admin.example.com'] as const;
    const origin: string | undefined = req.headers.origin;
    if (!origin || allowed.includes(origin)) {
        callback(null, {
            origin: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
            maxAge: 86400, // preflight cache: 24 hours
        });
    } else {
        callback(new Error('Not allowed by CORS'));
    }
};

app.use(cors(corsOptionsDelegate));

// ‼️ NEVER use in production:
// origin: '*' AND credentials: true — these CANNOT coexist
// The browser blocks this combination for security
```

### Rate limiting‼️

```ts
import express, { Request, Response } from 'express';
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const app: express.Express = express();
const redis: Redis = new Redis(process.env.REDIS_URL as string);

// Global rate limiter
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // 100 requests per window
    standardHeaders: true, // return RateLimit-* headers in response
    store: new RedisStore({
        // Redis-backed for multi-server consistency‼️
        sendCommand: (...args: string[]) => redis.call(...args),
    }),
    keyGenerator: (req: Request): string => req.user?.sub ?? req.ip ?? 'unknown', // per-user if authenticated
    handler: (req: Request, res: Response): void => {
        res.status(429).json({ error: 'Too many requests, try again later' });
    },
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
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';

const app: express.Express = express();

// Prevent NoSQL injection (MongoDB)
app.use(mongoSanitize()); // strips $ and . from req.body, req.query, req.params

// Prevent XSS in user input (if you're rendering HTML)
const userInput: string = '<script>alert("xss")</script>';
const clean: string = xss(userInput); // strips <script> tags, event handlers, etc.

// ‼️ For SQL databases: ALWAYS use parameterized queries, never string concatenation
// Safe:   db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
// Unsafe: db.query(`SELECT * FROM users WHERE id = ${req.params.id}`) // SQL INJECTION‼️
```

---

## 11. Logging & Observability

### Morgan — HTTP request logging

```ts
import express from 'express';
import morgan from 'morgan';
import fs from 'fs';

const app: express.Express = express();

// Development — colored, concise
app.use(morgan('dev'));
// Output: GET /api/users 200 15.432 ms - 432

// Production — Apache-style combined format
app.use(morgan('combined'));
// Output: ::1 - - [04/Jun/2026:10:30:00] "GET /api/users HTTP/1.1" 200 432

// Custom format
app.use(morgan(':method :url :status :response-time ms'));

// Log to file
const accessLogStream: fs.WriteStream = fs.createWriteStream('./access.log', { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// Skip health check logs (reduce noise)
app.use(
    morgan('combined', {
        skip: (req: express.Request): boolean => req.url === '/health',
    }),
);
```

### Pino — structured JSON logging (production)‼️

```ts
import express, { Request, Response } from 'express';
import pino, { Logger } from 'pino';
import pinoHttp from 'pino-http';

const app: express.Express = express();

const logger: Logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
        process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined, // production: raw JSON (for log aggregators like Datadog, ELK)
});

app.use(pinoHttp({ logger })); // adds req.log to every request

// Use in routes
app.get(
    '/users',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        req.log.info({ userId: req.user?.sub }, 'Fetching user list');
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
import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

const app: express.Express = express();

// Middleware — runs on every request
app.use((req: Request, res: Response, next: NextFunction): void => {
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

## 12. File Uploads & Static Files

### Multer — file upload middleware‼️

```ts
import express, { Request, Response } from 'express';
import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';

const app: express.Express = express();

// Disk storage with custom filename
const storage: StorageEngine = multer.diskStorage({
    destination: './uploads/',
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void): void => {
        const uniqueName: string = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const upload: multer.Multer = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max‼️
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
        const allowed: string[] = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    },
});

// Single file upload
app.post('/avatar', authenticate, upload.single('avatar'), (req: Request, res: Response): void => {
    // req.file = { fieldname, originalname, mimetype, size, path, ... }
    const file: Express.Multer.File | undefined = req.file;
    if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    res.json({ url: `/uploads/${file.filename}` });
});

// Multiple files
app.post('/photos', upload.array('photos', 10), (req: Request, res: Response): void => {
    // req.files = array of file objects
    const files: Express.Multer.File[] = (req.files as Express.Multer.File[]) ?? [];
    res.json({ count: files.length });
});

// Memory storage (for S3 upload — file stays in memory as Buffer)
const memoryUpload: multer.Multer = multer({ storage: multer.memoryStorage() });
app.post('/upload', memoryUpload.single('file'), async (req: Request, res: Response): Promise<void> => {
    // req.file.buffer = Buffer containing the file
    const file: Express.Multer.File | undefined = req.file;
    if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    await s3.upload({ Bucket: 'my-bucket', Key: file.originalname, Body: file.buffer });
    res.json({ success: true });
});
```

### Serving static files

```ts
import express from 'express';

const app: express.Express = express();

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

## 13. Database Integration Patterns

### Connection setup and graceful shutdown

```ts
import { Pool, PoolConfig } from 'pg';
// or: import { drizzle } from 'drizzle-orm/node-postgres';

const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20, // max connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

const pool: Pool = new Pool(poolConfig);

// Graceful shutdown — close DB connections before exiting
process.on('SIGTERM', async (): Promise<void> => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(); // stop accepting new requests
    await pool.end(); // close all DB connections
    process.exit(0);
});
```

### Transaction pattern

```ts
import { Pool, PoolClient, QueryResult } from 'pg';
import { Request, Response } from 'express';

interface TransferBody {
    fromId: string;
    toId: string;
    amount: number;
}

interface AccountRow {
    balance: number;
}

app.post(
    '/transfer',
    asyncHandler(async (req: Request<{}, {}, TransferBody>, res: Response): Promise<void> => {
        const { fromId, toId, amount } = req.body;

        const client: PoolClient = await pool.connect(); // get connection from pool
        try {
            await client.query('BEGIN');

            const result: QueryResult<AccountRow> = await client.query<AccountRow>(
                'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE', // row lock‼️
                [fromId],
            );
            const from: AccountRow | undefined = result.rows[0];

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
import { Request, Response } from 'express';

// Define types for database entities
interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
}

interface NewUser {
    email: string;
    name: string;
    role?: string;
}

// repositories/userRepository.ts
export const userRepository = {
    findById: (id: string): Promise<User | undefined> =>
        db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .then((r: User[]) => r[0]),

    findByEmail: (email: string): Promise<User | undefined> =>
        db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .then((r: User[]) => r[0]),

    create: (data: NewUser): Promise<User> =>
        db
            .insert(users)
            .values(data)
            .returning()
            .then((r: User[]) => r[0]),

    update: (id: string, data: Partial<NewUser>): Promise<User | undefined> =>
        db
            .update(users)
            .set(data)
            .where(eq(users.id, id))
            .returning()
            .then((r: User[]) => r[0]),

    delete: (id: string): Promise<void> => {
        db.delete(users).where(eq(users.id, id));
    },
} as const;

// routes/users.ts — uses repository, no SQL in routes
app.get(
    '/users/:id',
    asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const user: User | undefined = await userRepository.findById(req.params.id);
        if (!user) throw new NotFoundError('User');
        res.json(user);
    }),
);
```

---

## 14. Testing with Supertest

### Integration testing pattern‼️

```ts
// Express uses "supertest" — sends HTTP requests to your app WITHOUT starting a server‼️
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request, { Response as SupertestResponse } from 'supertest';
import express from 'express';
import { createApp } from '../src/app';

describe('Task API', (): void => {
    let app: express.Express;
    let authToken: string;

    beforeAll(async (): Promise<void> => {
        app = createApp(); // create Express app (DON'T call .listen())‼️

        // Seed test user and get token
        const res: SupertestResponse = await request(app)
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password' });
        authToken = res.body.accessToken as string;
    });

    afterAll(async (): Promise<void> => {
        await db.execute(sql`TRUNCATE tasks CASCADE`);
    });

    it('GET /tasks returns empty array', async (): Promise<void> => {
        const res: SupertestResponse = await request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`) // set header with .set()
            .expect(200); // assert status inline

        expect(res.body).toMatchObject({ data: [], meta: { total: 0 } });
    });

    it('POST /tasks creates a task', async (): Promise<void> => {
        const res: SupertestResponse = await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ title: 'Test task', priority: 'high' }) // send body with .send()
            .expect(201);

        expect(res.body).toMatchObject({ title: 'Test task', priority: 'high' });
        expect(res.body.id).toBeDefined();
    });

    it('returns 400 for invalid body', async (): Promise<void> => {
        await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ title: '' }) // invalid — empty title
            .expect(400);
    });

    it('returns 401 without token', async (): Promise<void> => {
        await request(app).get('/api/tasks').expect(401);
    });

    it('returns 403 for non-admin accessing admin route', async (): Promise<void> => {
        await request(app)
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${authToken}`) // regular user token
            .expect(403);
    });
});
```

### Supertest API cheat sheet

```ts
import request from 'supertest';
import express from 'express';

declare const app: express.Express;

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

## 15. Performance & Scaling

### Compression

```ts
import express, { Request, Response } from 'express';
import compression from 'compression';

const app: express.Express = express();

app.use(
    compression({
        threshold: 1024, // only compress responses > 1KB
        level: 6, // gzip level (1=fast, 9=best compression, 6=default)
        filter: (req: Request, res: Response): boolean => {
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
import express, { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const app: express.Express = express();
const redis: Redis = new Redis(process.env.REDIS_URL as string);

// Manual caching middleware
const cacheMiddleware = (ttl: number = 300) =>
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const key: string = `cache:${req.originalUrl}`;
        const cached: string | null = await redis.get(key);

        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            res.json(JSON.parse(cached));
            return;
        }

        // Override res.json to intercept and cache the response
        const originalJson = res.json.bind(res) as (body: unknown) => Response;
        res.json = ((body: unknown): Response => {
            redis.setex(key, ttl, JSON.stringify(body)); // cache for ttl seconds
            res.setHeader('X-Cache', 'MISS');
            return originalJson(body);
        }) as Response['json'];

        next();
    });

// Use on specific routes
app.get(
    '/api/stats',
    cacheMiddleware(600),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const stats = await computeExpensiveStats(); // only runs on cache miss
        res.json(stats);
    }),
);
```

### Cluster mode — use all CPU cores

```ts
import cluster from 'cluster';
import os from 'os';
import express from 'express';

if (cluster.isPrimary) {
    const numCPUs: number = os.cpus().length;
    console.log(`Primary ${process.pid} forking ${numCPUs} workers`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker): void => {
        console.log(`Worker ${worker.process.pid} died — forking replacement`);
        cluster.fork(); // auto-restart crashed workers
    });
} else {
    const app: express.Express = createApp();
    app.listen(3000, (): void => {
        console.log(`Worker ${process.pid} started`);
    });
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

## 16. Production Readiness

### Environment validation — fail fast at startup‼️

```ts
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    CORS_ORIGIN: z.string().url(),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

// Infer the type from the Zod schema‼️
type Env = z.infer<typeof envSchema>;

const env: Env = envSchema.parse(process.env);
// ‼️ Throws at startup if any required env var is missing or invalid
// Better to crash here than discover a missing var at 3am in production

export default env;
```

### Graceful shutdown

```ts
import express from 'express';
import http from 'http';
import { Pool } from 'pg';
import Redis from 'ioredis';

const app: express.Express = express();

const server: http.Server = app.listen(env.PORT, (): void => {
    console.log(`Server running on port ${env.PORT}`);
});

async function gracefulShutdown(signal: string): Promise<void> {
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

process.on('SIGTERM', (): void => {
    gracefulShutdown('SIGTERM');
});
process.on('SIGINT', (): void => {
    gracefulShutdown('SIGINT');
});

// Crash on uncaught exceptions — let process manager restart‼️
process.on('uncaughtException', (err: Error): void => {
    console.error('Uncaught exception:', err);
    process.exit(1); // crash — unknown state, don't continue
});

process.on('unhandledRejection', (reason: unknown): void => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
});
```

### Health and readiness endpoints

```ts
import express, { Request, Response } from 'express';

const app: express.Express = express();

interface HealthResponse {
    status: string;
    uptime: number;
    timestamp: string;
}

interface ReadinessResponse {
    status: 'ready' | 'not ready';
    checks: {
        database: 'ok' | 'fail';
        redis: 'ok' | 'fail';
    };
}

// Health — is the process alive?
app.get('/health', (req: Request, res: Response<HealthResponse>): void => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// Readiness — can the process serve traffic? (DB, Redis connected)
app.get(
    '/ready',
    asyncHandler(async (req: Request, res: Response<ReadinessResponse>): Promise<void> => {
        const checks: PromiseSettledResult<unknown>[] = await Promise.allSettled([
            pool.query('SELECT 1'),
            redis.ping(),
        ]);

        const dbOk: boolean = checks[0].status === 'fulfilled';
        const redisOk: boolean = checks[1].status === 'fulfilled';
        const ready: boolean = dbOk && redisOk;

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

## 17. Express 5 — What Changes

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

## 18. Full Project Structure

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

## 19. Common Interview Questions

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

### "How does TypeScript improve Express development?"

> TypeScript catches entire categories of bugs at compile time: (1) Typed `Request<Params, ResBody, ReqBody, Query>` generics ensure route handlers access the correct properties on params, body, and query. (2) `RequestHandler` and `ErrorRequestHandler` types enforce correct middleware signatures — you can't forget the `next` parameter or add the wrong number of args. (3) Extending the Express `Request` interface (`declare global { namespace Express { interface Request { ... } } }`) gives you typed custom properties like `req.user` everywhere. (4) Zod's `z.infer<typeof schema>` connects validation schemas directly to TypeScript types — one source of truth. (5) `as const` assertions on configuration objects prevent accidental mutation. The main cost is setup (tsconfig, @types packages, `.d.ts` files), but it pays for itself in fewer runtime errors and better IDE support.
