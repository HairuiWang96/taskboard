# Express.js / Fastify.js / NestJS — Senior Developer Deep Reference

**Priority: HIGH**

> Covers architecture internals, middleware pipelines, request lifecycle, performance, patterns, and interview-critical distinctions between the three frameworks.

---

## Table of Contents

1. [Express.js — Core Internals](#1-expressjs--core-internals)
2. [Express.js — Middleware Pipeline](#2-expressjs--middleware-pipeline)
3. [Express.js — Error Handling](#3-expressjs--error-handling)
4. [Express.js — Router & Modular Architecture](#4-expressjs--router--modular-architecture)
5. [Fastify.js — Core Internals](#5-fastifyjs--core-internals)
6. [Fastify.js — Plugin System & Encapsulation](#6-fastifyjs--plugin-system--encapsulation)
7. [Fastify.js — Schema Validation & Serialization](#7-fastifyjs--schema-validation--serialization)
8. [Fastify.js — Hooks Lifecycle](#8-fastifyjs--hooks-lifecycle)
9. [NestJS — Architecture & Modules](#9-nestjs--architecture--modules)
10. [NestJS — Dependency Injection](#10-nestjs--dependency-injection)
11. [NestJS — Request Lifecycle](#11-nestjs--request-lifecycle)
12. [NestJS — Guards, Interceptors, Pipes, Filters](#12-nestjs--guards-interceptors-pipes-filters)
13. [NestJS — Advanced Patterns](#13-nestjs--advanced-patterns)
14. [Framework Comparison](#14-framework-comparison)
15. [Common Interview Questions](#15-common-interview-questions)

---

## 1. Express.js — Core Internals

### What Express actually is

```text
Express is a thin layer on top of Node.js's built-in http module.

When you call:
  const app = express();

You get a function (app) that IS a Node.js request handler:
  app(req, res)  ←— this is what Node's http.createServer() expects

Under the hood:
  express() → returns a Function with extra methods (.use, .get, .listen, etc.)
  app.listen(3000) → shorthand for http.createServer(app).listen(3000)

There is NO magic — Express is ~600 lines of core code.
```

### The req/res objects

```js
// Express extends Node's IncomingMessage and ServerResponse
// It adds convenience properties and methods on top

// req additions (not in vanilla Node):
req.params     // { id: '123' } — from :id route params
req.query      // { page: '1' } — from ?page=1 query string
req.body       // parsed body — only available AFTER body-parser middleware
req.ip         // client IP (respects X-Forwarded-For if trust proxy set)
req.path       // '/users/123' — URL path without query string
req.get('header-name')  // get a request header

// res additions:
res.json({ key: 'val' })   // sets Content-Type: application/json + JSON.stringify
res.status(404).json({})   // chainable
res.send('text')           // sends string, Buffer, or object
res.redirect('/new-path')  // 302 by default
res.set('X-Custom', 'val') // set response header
```

### Trust Proxy

```js
// IMPORTANT: if behind a reverse proxy (nginx, AWS ALB, etc.)
app.set('trust proxy', 1); // trust first hop
// Without this:
//   req.ip  → proxy's IP (wrong)
//   req.protocol → 'http' even if HTTPS (wrong)
// With this:
//   req.ip  → real client IP from X-Forwarded-For
//   req.protocol → 'https' if X-Forwarded-Proto: https
```

---

## 2. Express.js — Middleware Pipeline

### How middleware works

```text
Every middleware is a function: (req, res, next) => void

Express maintains an internal stack of middleware functions.
When a request comes in, Express walks the stack in order:
  → middleware 1 runs → calls next() → middleware 2 runs → ...
  → route handler runs → sends response → done

If next() is never called AND no response is sent → the request hangs.
If next(err) is called → Express skips regular middleware, jumps to error handlers.

‼️ Order matters — middleware runs in the ORDER it was registered with app.use()
```

```js
const express = require('express');
const app = express();

// 1. Logger — runs for EVERY request (no path = matches all)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // MUST call next() or the request hangs
});

// 2. Body parser — parse JSON bodies; populates req.body
app.use(express.json());
// Without this, req.body is undefined for POST/PUT with JSON body

// 3. Route-specific middleware (only runs for /users/*)
app.use('/users', requireAuth);

// 4. Route handler
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});

// 5. 404 handler — runs if no route matched
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 6. Error handler — MUST have 4 params for Express to recognize it
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

### Middleware types

```js
// Application-level: app.use() or app.METHOD()
app.use(express.json());

// Router-level: applied to a Router instance
const router = express.Router();
router.use(requireAuth);

// Error-handling: 4 parameters (err, req, res, next)
app.use((err, req, res, next) => { /* ... */ });

// Built-in middleware:
express.json()           // parse application/json
express.urlencoded()     // parse application/x-www-form-urlencoded (HTML forms)
express.static('public') // serve static files from /public directory

// Third-party:
// cors, helmet, morgan, compression, express-rate-limit, etc.
```

### next() behavior

```js
// next()        → go to next middleware/route
// next('route') → skip remaining handlers for this route, go to next route
// next(err)     → jump to error handler (skip all regular middleware)

app.get('/user/:id',
  (req, res, next) => {
    if (req.params.id === 'admin') return next('route'); // skip to next route
    next(); // continue to second handler
  },
  (req, res) => {
    res.send('Regular user');
  }
);

app.get('/user/:id', (req, res) => {
  res.send('Admin user'); // only runs if next('route') was called above
});
```

---

## 3. Express.js — Error Handling

### Synchronous vs async errors

```js
// ‼️ Critical: Express only catches synchronous errors automatically.
// For async errors, you MUST either:
//   1. Call next(err) manually in .catch()
//   2. Use an async wrapper
//   3. Use Express 5 (which supports async natively)

// ✗ WRONG — unhandled rejection, Express never sees this error
app.get('/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users'); // throws → unhandled!
  res.json(users);
});

// ✓ CORRECT — Express 4: manually catch and forward
app.get('/users', async (req, res, next) => {
  try {
    const users = await db.query('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    next(err); // forward to error handler
  }
});

// ✓ CORRECT — async wrapper utility (avoids try/catch everywhere)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users', asyncHandler(async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users);
}));

// ✓ CORRECT — Express 5 (handles async natively, no wrapper needed)
// app.get('/users', async (req, res) => { ... }); // just works in v5
```

### Centralized error handler

```js
// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguish operational vs programmer errors
  }
}

// Throw anywhere in route handlers
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  res.json(user);
}));

// ONE centralized handler at the bottom — catches everything
app.use((err, req, res, next) => {
  const statusCode = err.statusCode ?? 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  // Log unexpected errors
  if (!err.isOperational) console.error('UNEXPECTED ERROR:', err);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});
```

---

## 4. Express.js — Router & Modular Architecture

### Router splitting

```js
// ‼️ Key pattern: split routes into separate Router files — never define all routes on app

// routes/users.js
const router = express.Router();

// middleware scoped to this router only
router.use(requireAuth);

router.get('/',       getUsers);    // GET  /users
router.get('/:id',    getUserById); // GET  /users/:id
router.post('/',      createUser);  // POST /users
router.put('/:id',    updateUser);  // PUT  /users/:id
router.delete('/:id', deleteUser);  // DELETE /users/:id

module.exports = router;

// app.js
const usersRouter = require('./routes/users');
app.use('/users', usersRouter);
// Now all routes in usersRouter are prefixed with /users

// Folder structure:
// src/
//   routes/
//     users.js
//     posts.js
//   controllers/
//     userController.js
//   middleware/
//     auth.js
//     validate.js
//   app.js
//   server.js  ← only contains app.listen()
```

### Separation of concerns pattern

```js
// controllers/userController.js — business logic
const getUsers = async (req, res, next) => {
  try {
    const users = await UserService.findAll();
    res.json(users);
  } catch (err) { next(err); }
};

// services/userService.js — data access
const findAll = async () => db.query('SELECT * FROM users');

// middleware/validate.js — input validation
const validateUser = (req, res, next) => {
  const { email, name } = req.body;
  if (!email || !name) return next(new AppError('email and name required', 400));
  next();
};

// routes/users.js — wire it together
router.post('/', validateUser, createUser);
```

---

## 5. Fastify.js — Core Internals

### Why Fastify is faster than Express

```text
‼️ Three main reasons Fastify outperforms Express:

1. JSON serialization:
   Express:  JSON.stringify(obj) — generic, no optimization
   Fastify:  Generates a dedicated serialization function from your JSON Schema.
             fast-json-stringify is 2-3x faster than JSON.stringify for known shapes.

2. Schema-based validation:
   Express:  No built-in validation — you validate manually or with a library.
   Fastify:  Uses AJV (Ajv) to compile JSON Schema to optimized validator functions
             at startup, not at request time.

3. Hooks instead of middleware:
   Express:  Middleware is a flat array; every middleware iterates the chain.
   Fastify:  Hooks are tied to the request lifecycle — each hook runs only at its
             designated stage. Less overhead per request.

Benchmark: Fastify handles ~30,000 req/s; Express ~15,000 req/s on same hardware.
```

### Basic Fastify setup

```js
const fastify = require('fastify')({ logger: true });
// Options: logger (boolean|object), https, http2, trustProxy, etc.
// logger: true → uses pino (JSON structured logging) — much faster than console.log

// Route with schema
fastify.get('/users/:id', {
  schema: {
    params: {
      type: 'object',
      properties: { id: { type: 'integer' } },
      required: ['id'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
        },
      },
    },
  },
  handler: async (request, reply) => {
    const user = await getUserById(request.params.id);
    return user; // Fastify auto-serializes using the response schema
  },
});

// Start
const start = async () => {
  await fastify.listen({ port: 3000 });
};
start();
```

### Fastify vs Express request/reply

```js
// Fastify's request and reply are NOT the same as Express req/res
// They wrap Node's IncomingMessage and ServerResponse

// request:
request.params    // route params
request.query     // query string (automatically parsed)
request.body      // parsed body (built-in, no body-parser needed)
request.headers
request.id        // unique request ID (useful for logging/tracing)
request.log       // per-request pino logger (child of root logger)
request.ip        // client IP

// reply:
reply.send(data)          // send response
reply.code(404).send({})  // set status code + send
reply.header('X-Foo', 'bar')
reply.type('application/json')
// ‼️ Fastify also accepts returning a value from the handler directly:
//    return { id: 1 } === reply.send({ id: 1 })
```

---

## 6. Fastify.js — Plugin System & Encapsulation

### The plugin system (most important Fastify concept)

```text
‼️ Everything in Fastify is a plugin.
   Routes, decorators, hooks — all registered via fastify.register().

The key concept: ENCAPSULATION.
   Plugins create a child scope (via avvio). Whatever you register inside
   a plugin (decorators, hooks, routes) is ONLY available within that scope
   and its children — not in sibling or parent scopes.

This is the opposite of Express, where app.use() affects ALL subsequent routes.
```

```js
// fastify-plugin (fp) BREAKS encapsulation — makes plugin apply to parent scope
// Use fp for shared utilities (auth, db) that all routes need
const fp = require('fastify-plugin');

// ✓ DB plugin — should be available everywhere, so use fp
const dbPlugin = fp(async (fastify) => {
  const db = await connectToDatabase();
  fastify.decorate('db', db); // add db to fastify instance
  fastify.addHook('onClose', () => db.disconnect()); // cleanup on shutdown
});

// ✓ Auth plugin — also needs to be shared
const authPlugin = fp(async (fastify) => {
  fastify.decorate('authenticate', async (request, reply) => {
    // verify JWT, etc.
  });
});

// Route plugins — NO fp — encapsulated scope is desired
async function userRoutes(fastify) {
  // This hook only runs for routes in this plugin
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/users', async (request, reply) => {
    const users = await fastify.db.findAll(); // db is available (fp broke encapsulation)
    return users;
  });
}

// Register everything
fastify.register(dbPlugin);
fastify.register(authPlugin);
fastify.register(userRoutes, { prefix: '/api' }); // routes prefixed with /api
```

### Decorators

```js
// fastify.decorate — add properties to the Fastify instance
fastify.decorate('config', { jwtSecret: process.env.JWT_SECRET });
fastify.config.jwtSecret; // accessible anywhere

// fastify.decorateRequest — add properties to request objects
fastify.decorateRequest('user', null); // initialize as null
// Then set in a hook: request.user = await verifyToken(request.headers.authorization);

// fastify.decorateReply — add methods to reply objects
fastify.decorateReply('notFound', function () {
  this.code(404).send({ error: 'Not found' });
});
// Usage: reply.notFound();

// ‼️ Always initialize decorators before use — avoids prototype pollution
// ‼️ Only decorate with primitive values or null as initial — objects/arrays
//    would be shared across requests (reference shared on prototype)
fastify.decorateRequest('user', null);       // ✓
fastify.decorateRequest('user', {});         // ✗ shared reference
```

---

## 7. Fastify.js — Schema Validation & Serialization

### JSON Schema for validation

```js
// Fastify validates request data BEFORE the handler runs using Ajv
// If validation fails → automatic 400 response, handler never executes

const createUserSchema = {
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name:  { type: 'string', minLength: 1, maxLength: 100 },
      email: { type: 'string', format: 'email' },
      age:   { type: 'integer', minimum: 0, maximum: 150 },
    },
    additionalProperties: false, // reject unknown fields
  },
};

fastify.post('/users', { schema: createUserSchema }, async (request, reply) => {
  // request.body is guaranteed to be valid here
  const user = await createUser(request.body);
  reply.code(201).send(user);
});
```

### Response schema (serialization)

```js
// ‼️ Response schema does two things:
// 1. Strips fields not in the schema (security — prevents accidental data leaks)
// 2. Generates a fast serializer (faster than JSON.stringify)

fastify.get('/users/:id', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          id:    { type: 'integer' },
          name:  { type: 'string' },
          email: { type: 'string' },
          // password is NOT here — even if returned from DB, it won't be sent
        },
      },
      404: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
  handler: async (request, reply) => {
    const user = await db.findById(request.params.id);
    if (!user) return reply.code(404).send({ error: 'Not found' });
    return user; // password field is stripped automatically
  },
});

// Shared schemas — define once, $ref anywhere
fastify.addSchema({
  $id: 'User',
  type: 'object',
  properties: {
    id:    { type: 'integer' },
    name:  { type: 'string' },
    email: { type: 'string' },
  },
});

// Use $ref in routes:
// response: { 200: { $ref: 'User#' } }
```

---

## 8. Fastify.js — Hooks Lifecycle

### Full request lifecycle

```text
Incoming request
     │
     ▼
onRequest          ← good for rate limiting, request ID assignment
     │
     ▼
preParsing         ← can modify raw payload stream
     │
     ▼
[Body parsing]
     │
     ▼
preValidation      ← modify body before schema validation
     │
     ▼
[Schema validation] ← automatic, using Ajv
     │
     ▼
preHandler         ← auth checks, logging, common setup
     │
     ▼
[Route handler]    ← your business logic
     │
     ▼
preSerialization   ← modify payload before serialization
     │
     ▼
[Serialization]    ← fast-json-stringify using response schema
     │
     ▼
onSend             ← modify serialized payload (string/buffer at this point)
     │
     ▼
[Response sent]
     │
     ▼
onResponse         ← logging, metrics (response already sent)

On error:
     ▼
onError            ← handle/transform errors before sending
```

```js
// Adding hooks — scoped to plugin or global
fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  request.log.info({ duration }, 'request completed');
});

fastify.addHook('preHandler', async (request, reply) => {
  // Auth check — throw to reject
  const token = request.headers.authorization;
  if (!token) throw fastify.httpErrors.unauthorized('Missing token');
  request.user = await verifyToken(token);
});

// onError hook — transform errors (e.g. DB errors → user-friendly messages)
fastify.addHook('onError', async (request, reply, error) => {
  if (error.code === '23505') { // PostgreSQL unique violation
    error.statusCode = 409;
    error.message = 'Resource already exists';
  }
});
```

---

## 9. NestJS — Architecture & Modules

### The big picture

```text
‼️ NestJS is a framework built ON TOP OF Express (or Fastify) that adds:
   - Angular-inspired architecture (Modules, Controllers, Services)
   - Dependency Injection (DI) container
   - Decorator-based metadata
   - Strong opinions about project structure

NestJS uses TypeScript decorators + reflect-metadata to build a DI container
at startup. When a request comes in, Nest resolves the provider graph and
injects dependencies automatically.

Under the hood:
  @Controller() + @Get()   → registers routes on the underlying Express/Fastify app
  @Injectable()            → marks a class as a DI provider
  @Module()                → declares what's available in that scope
```

### Module system

```typescript
// ‼️ Modules are the building blocks of a NestJS app
// Each module encapsulates: controllers, providers, imports, exports

// users/users.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // imports User entity repository
    JwtModule,                        // for JWT signing
  ],
  controllers: [UsersController],     // handle HTTP routes
  providers: [UsersService, UserRepository], // DI-injectable classes
  exports: [UsersService],            // make UsersService available to other modules
})
export class UsersModule {}

// app.module.ts — root module
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // global = no need to import everywhere
    DatabaseModule,
    UsersModule,
    AuthModule,
    PostsModule,
  ],
})
export class AppModule {}

// main.ts — bootstrap
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app is still Express underneath — can call app.use() for Express middleware
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.listen(3000);
}
```

### Module types

```typescript
// Feature module — encapsulates a domain
@Module({ controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}

// Global module — available everywhere without importing
@Global()
@Module({ providers: [ConfigService], exports: [ConfigService] })
export class ConfigModule {}

// Dynamic module — configured at import time
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        { provide: 'DATABASE_OPTIONS', useValue: options },
        DatabaseService,
      ],
      exports: [DatabaseService],
      global: true,
    };
  }
}
// Usage: DatabaseModule.forRoot({ host: 'localhost', port: 5432 })
```

---

## 10. NestJS — Dependency Injection

### How DI works

```text
‼️ NestJS DI container:
   At startup, Nest scans all @Module() definitions, builds a dependency graph,
   and instantiates providers in the correct order.

   When a Controller needs a Service:
     @Controller() → constructor(private usersService: UsersService)
     Nest looks up UsersService in the module's providers
     Creates ONE instance (singleton by default) and injects it

   Singleton scope: one instance per module (default)
   Request scope:   new instance per HTTP request (injecting REQUEST token)
   Transient scope: new instance every time it's injected
```

```typescript
// ✓ Standard injection — most common pattern
@Injectable()
export class UsersService {
  constructor(
    // TypeORM repository injection
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    // Service injection
    private readonly mailerService: MailerService,

    // Config injection
    private readonly configService: ConfigService,
  ) {}

  async findById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepo.create(dto);
    await this.userRepo.save(user);
    await this.mailerService.sendWelcome(user.email);
    return user;
  }
}

// ✓ Controller consuming the service
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

### Custom providers

```typescript
// Value provider — inject a constant
{ provide: 'API_KEY', useValue: process.env.API_KEY }
// Inject with: @Inject('API_KEY') private readonly apiKey: string

// Factory provider — inject result of a factory function
{
  provide: 'DATABASE_CONNECTION',
  useFactory: async (config: ConfigService) => {
    return createConnection({ url: config.get('DB_URL') });
  },
  inject: [ConfigService], // inject ConfigService into the factory
}

// Class provider — override a class with another
{ provide: UserRepository, useClass: MockUserRepository } // useful for testing

// Alias provider — create an alias token
{ provide: 'USERS_SERVICE', useExisting: UsersService }
```

---

## 11. NestJS — Request Lifecycle

### Full NestJS request lifecycle

```text
Incoming HTTP request (Express/Fastify layer)
     │
     ▼
Middleware (app.use() — runs before Nest sees the request)
     │
     ▼
Guards (@UseGuards — decides if request is allowed: auth, roles, permissions)
     │  returns false → 403 Forbidden
     ▼
Interceptors — before handler (@UseInterceptors — transform request, timing)
     │
     ▼
Pipes (@UsePipes — validate and transform route params, body, query)
     │  invalid → 400 Bad Request
     ▼
[Controller method / Route Handler]
     │
     ▼
Interceptors — after handler (transform response, logging)
     │
     ▼
Exception Filters (@UseFilters — catch exceptions, format error responses)
     │
     ▼
Response sent

‼️ Order to remember: Middleware → Guards → Interceptors → Pipes → Handler
                       then: Interceptors (out) → Filters
```

### Controllers and decorators

```typescript
@Controller('users')
@UseGuards(AuthGuard)         // applies to all routes in this controller
@UseInterceptors(LoggingInterceptor)
export class UsersController {

  @Get()
  findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) { ... }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { ... }

  @Post()
  @HttpCode(HttpStatus.CREATED) // default POST returns 201 only with this
  @UsePipes(new ValidationPipe())
  create(@Body() createUserDto: CreateUserDto) { ... }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { ... }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { ... }

  // Access raw request (Express or Fastify)
  @Get('raw')
  raw(@Req() req: Request, @Res() res: Response) {
    res.status(200).json({ ok: true });
    // ‼️ Using @Res() bypasses Nest's response handling
    //    Must call res.send/json manually AND interceptors won't apply
  }
}
```

---

## 12. NestJS — Guards, Interceptors, Pipes, Filters

### Guards — authentication & authorization

```typescript
// Guards answer: "Can this user access this route?"
// canActivate() returns boolean | Promise<boolean> | Observable<boolean>

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload; // attach user to request
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}

// Role-based guard using custom decorator
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!requiredRoles) return true; // no roles required — allow
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}

// Custom decorator to set roles metadata
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// Usage:
// @Roles(Role.ADMIN)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Delete(':id')
// remove() { ... }
```

### Interceptors — transform & cross-cutting concerns

```typescript
// Interceptors wrap the handler call — can run code before AND after
// Use for: logging, response transformation, caching, timeout

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    console.log(`→ ${req.method} ${req.url}`);

    return next.handle().pipe(
      tap(() => console.log(`← ${Date.now() - start}ms`)),
    );
  }
}

// Transform response — wrap all responses in { data: ... }
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ data: T }> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}

// Timeout interceptor
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(timeout(5000)); // throw TimeoutError after 5s
  }
}
```

### Pipes — validation & transformation

```typescript
// Pipes run after guards, before the handler — validate + transform params

// Built-in pipes:
// ParseIntPipe, ParseFloatPipe, ParseBoolPipe, ParseArrayPipe,
// ParseUUIDPipe, ParseEnumPipe, DefaultValuePipe, ValidationPipe

// ‼️ ValidationPipe + class-validator is the most important combo

// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value)) // transform string '25' → number 25
  age?: number;
}

// In module bootstrap or globally:
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,      // strip properties not in DTO
  forbidNonWhitelisted: true, // throw if extra properties sent
  transform: true,      // auto-transform to DTO types
}));

// Custom pipe — parse and validate pagination
@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(value: any): { page: number; limit: number } {
    const page = Math.max(1, parseInt(value.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(value.limit) || 10));
    return { page, limit };
  }
}
```

### Exception Filters — error handling

```typescript
// ‼️ Nest has built-in exceptions: NotFoundException, UnauthorizedException,
//    BadRequestException, ForbiddenException, ConflictException, etc.
//    All extend HttpException.

// Custom exception filter — catch and format errors
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}

// Catch ALL exceptions (including non-HTTP)
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    response.status(status).json({ statusCode: status, message });
  }
}

// Apply globally:
// app.useGlobalFilters(new AllExceptionsFilter());
```

---

## 13. NestJS — Advanced Patterns

### Custom decorators

```typescript
// Param decorator — extract current user from request
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // set by JwtAuthGuard
  },
);

// Usage:
// @Get('profile')
// @UseGuards(JwtAuthGuard)
// getProfile(@CurrentUser() user: UserPayload) { return user; }

// Combine decorators — @Auth() = @UseGuards(JwtAuthGuard) + @ApiBearerAuth()
export function Auth(...roles: Role[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
  );
}
// Usage: @Auth(Role.ADMIN)
```

### Circular dependency handling

```typescript
// ‼️ Circular deps: AuthModule imports UsersModule, UsersModule imports AuthModule
// Solution: forwardRef()

// auth.module.ts
@Module({
  imports: [forwardRef(() => UsersModule)],
})
export class AuthModule {}

// users.module.ts
@Module({
  imports: [forwardRef(() => AuthModule)],
})
export class UsersModule {}

// In constructor injection:
constructor(
  @Inject(forwardRef(() => AuthService))
  private authService: AuthService,
) {}
```

### Testing in NestJS

```typescript
// Unit test — mock all dependencies
describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    userRepo = module.get(getRepositoryToken(User));
  });

  it('throws NotFoundException when user not found', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.findById(999)).rejects.toThrow(NotFoundException);
  });
});

// E2E test — full HTTP request through the real app
describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('GET /users returns array', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect((res) => expect(Array.isArray(res.body)).toBe(true));
  });

  afterAll(() => app.close());
});
```

---

## 14. Framework Comparison

### Architecture philosophy

| | Express | Fastify | NestJS |
|---|---|---|---|
| Philosophy | Minimal, unopinionated | Performance-first, plugin-based | Structured, opinionated (Angular-inspired) |
| Built-in features | Almost none | Schema validation, serialization, logging | DI, modules, guards, pipes, filters |
| Learning curve | Low | Medium | High |
| TypeScript support | Manual (`@types/express`) | Built-in types | First-class, required |
| Performance | ~15k req/s | ~30k req/s | ~14k req/s (on Express adapter) |
| Best for | Simple APIs, microservices, legacy | High-throughput APIs, microservices | Large enterprise apps, monoliths |

### Middleware vs Plugin vs Guard

```text
Express middleware:
  - flat stack, runs in registration order
  - (req, res, next) signature
  - global effect — affects all subsequent routes
  - third-party: cors, helmet, morgan, multer

Fastify plugin:
  - scoped (encapsulation by default)
  - can be async
  - registers hooks, routes, decorators in its own scope
  - use fastify-plugin to break encapsulation intentionally

NestJS guard:
  - class-based, DI-aware
  - returns true/false — clean separation of concerns
  - can use services (DB, JWT, config) via injection
  - applied via decorator at controller or route level
```

### Error handling comparison

```js
// Express — manual, centralized at bottom
app.use((err, req, res, next) => {
  res.status(err.status ?? 500).json({ error: err.message });
});

// Fastify — setErrorHandler or onError hook
fastify.setErrorHandler((error, request, reply) => {
  reply.status(error.statusCode ?? 500).send({ error: error.message });
});

// NestJS — exception filter (class-based, DI-aware)
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) { ... }
}
app.useGlobalFilters(new HttpExceptionFilter());
```

### When to choose which

```text
Choose Express when:
  ✓ You need maximum ecosystem compatibility (most npm packages have Express examples)
  ✓ Building a simple REST API or adding routes to an existing app
  ✓ Team is new to Node.js — minimal abstractions = easier to debug
  ✓ Integrating with legacy middleware libraries

Choose Fastify when:
  ✓ Performance is critical (high throughput, low latency)
  ✓ You want schema validation and fast JSON serialization built in
  ✓ Building microservices where overhead matters
  ✓ You want structured logging (pino) by default
  ✓ TypeScript-first without the NestJS complexity

Choose NestJS when:
  ✓ Large team — enforced structure prevents architecture drift
  ✓ Enterprise app with complex domain (auth, roles, multi-module)
  ✓ You want Angular-style DI and testing patterns
  ✓ Building a monolith that may later be split into microservices
  ✓ Team has Angular or Spring Boot background
```

---

## 15. Common Interview Questions

### "What is middleware in Express? How does the chain work?"

```text
Middleware is a function with signature (req, res, next).
Express maintains an internal stack. On each request, it walks the stack in order.
Each middleware can:
  1. Execute any code
  2. Modify req/res
  3. Call next() to continue
  4. Call next(err) to jump to error handlers
  5. End the cycle by sending a response

If no middleware sends a response → request hangs (timeout).
If next() is never called → chain stops at that middleware.
```

### "How does Express handle async errors?"

```text
Express 4: Does NOT catch async errors automatically.
  → You must try/catch and call next(err), or use an async wrapper.

Express 5: Catches async errors natively — async route handlers just work.

Common pattern for Express 4:
  const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
```

### "What makes Fastify faster than Express?"

```text
1. fast-json-stringify: compiles response schema to a dedicated serializer function.
   Faster than JSON.stringify() for known shapes.

2. Ajv validation: compiles JSON Schema to an optimized validator at startup.
   Validation runs in nanoseconds, not milliseconds.

3. Plugin encapsulation: hooks are scoped and lightweight.
   Less iteration through middleware chains.

4. Pino logger: async, low-overhead JSON logging vs synchronous console.log.
```

### "Explain NestJS Dependency Injection"

```text
NestJS DI is a container that manages object creation and lifetime.

At startup:
  1. Nest scans all @Module() imports
  2. Builds a dependency graph from @Injectable() classes
  3. Instantiates providers in dependency order (A needs B → create B first)
  4. Injects instances into constructors

Scope:
  - Singleton (default): one instance per module, shared across requests
  - Request: new instance per HTTP request (use sparingly — more overhead)
  - Transient: new instance every injection

Why it matters:
  - Decouples classes from their dependencies
  - Makes testing easy — swap real service for mock in test module
  - Avoids manual wiring of complex object graphs
```

### "What is the NestJS request lifecycle order?"

```text
Middleware → Guards → Interceptors (before) → Pipes → Handler
          ↓
Interceptors (after) → Exception Filters

Memory trick: "MGI-PH" (Many Great Ideas Prevent Headaches)
  Middleware, Guards, Interceptors, Pipes, Handler
```

### "How does Fastify's plugin encapsulation work?"

```text
Every fastify.register() call creates a child context.
Decorators, hooks, and routes registered inside are scoped to that child.
Sibling plugins cannot see each other's internals.

To break encapsulation: wrap the plugin with fastify-plugin (fp).
This "hoists" the plugin's registrations to the parent scope.

Rule of thumb:
  fp = shared infrastructure (DB, auth, config)
  no fp = route grouping (admin routes, user routes)

Analogy: fp is like exporting a module, no fp is like a private closure.
```

### "How would you structure a large Express/NestJS application?"

```text
Express (feature-based):
  src/
    features/
      users/
        users.router.js
        users.controller.js
        users.service.js
        users.validation.js
    middleware/
      auth.js
      errorHandler.js
    config/
    app.js
    server.js

NestJS (module-based — enforced by framework):
  src/
    users/
      dto/
      entities/
      users.controller.ts
      users.service.ts
      users.module.ts
    auth/
      guards/
      strategies/
      auth.module.ts
    common/
      filters/
      interceptors/
      pipes/
    app.module.ts
    main.ts
```

### "How do you handle authentication in each framework?"

```js
// Express: middleware + JWT
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};
app.use('/api/protected', requireAuth);

// Fastify: hook + decorator
fastify.decorateRequest('user', null);
fastify.addHook('preHandler', async (request, reply) => {
  const token = request.headers.authorization?.split(' ')[1];
  if (!token) throw fastify.httpErrors.unauthorized();
  request.user = jwt.verify(token, process.env.JWT_SECRET);
});

// NestJS: Guard + Strategy (Passport integration)
// JwtAuthGuard → JwtStrategy.validate() → attaches user to request
// Apply with @UseGuards(JwtAuthGuard) on controller or route
```
