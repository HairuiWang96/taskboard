# NestJS — Senior Developer Deep Reference

**Priority: MEDIUM**

> Everything from how the IoC container actually works, through DI scopes, the full request
> lifecycle, validation, persistence (TypeORM / Prisma / Mongoose), CQRS, microservices,
> queues, WebSockets, GraphQL, caching, observability, testing, and production hardening.
> Written for the interview question *"you say you know Nest — explain how it works."*

---

## Table of Contents

1. [Mental Model — What Nest Actually Is](#1-mental-model--what-nest-actually-is)
2. [Bootstrapping & Platform Adapters](#2-bootstrapping--platform-adapters)
3. [Modules — Static, Global, Dynamic](#3-modules--static-global-dynamic)
4. [Providers & Dependency Injection](#4-providers--dependency-injection)
5. [Injection Scopes & Durable Providers](#5-injection-scopes--durable-providers)
6. [Controllers & Routing](#6-controllers--routing)
7. [The Full Request Lifecycle](#7-the-full-request-lifecycle)
8. [Middleware](#8-middleware)
9. [Guards & Authorization](#9-guards--authorization)
10. [Interceptors & RxJS](#10-interceptors--rxjs)
11. [Pipes & Validation](#11-pipes--validation)
12. [Exception Filters & Error Handling](#12-exception-filters--error-handling)
13. [Custom Decorators & Metadata](#13-custom-decorators--metadata)
14. [Configuration & Environment](#14-configuration--environment)
15. [Lifecycle Hooks & Graceful Shutdown](#15-lifecycle-hooks--graceful-shutdown)
16. [Persistence — TypeORM](#16-persistence--typeorm)
17. [Persistence — Prisma](#17-persistence--prisma)
18. [Persistence — Mongoose](#18-persistence--mongoose)
19. [Transactions & The Unit of Work Problem](#19-transactions--the-unit-of-work-problem)
20. [CQRS & Event Sourcing](#20-cqrs--event-sourcing)
21. [Microservices & Transports](#21-microservices--transports)
22. [Queues, Jobs & Scheduling](#22-queues-jobs--scheduling)
23. [WebSockets & Gateways](#23-websockets--gateways)
24. [GraphQL in Nest](#24-graphql-in-nest)
25. [Caching & Rate Limiting](#25-caching--rate-limiting)
26. [OpenAPI / Swagger](#26-openapi--swagger)
27. [Testing](#27-testing)
28. [Observability — Logging, Tracing, Health](#28-observability--logging-tracing-health)
29. [Security Hardening](#29-security-hardening)
30. [Performance & Scaling](#30-performance--scaling)
31. [Architecture at Scale](#31-architecture-at-scale)
32. [Common Pitfalls](#32-common-pitfalls)
33. [Interview Questions](#33-interview-questions)

---

## 1. Mental Model — What Nest Actually Is

### The one-paragraph version

```text
‼️ NestJS is NOT a web server. It is an IoC (Inversion of Control) container
   with an HTTP adapter bolted on.

   The HTTP part is Express (default) or Fastify — Nest does not implement
   routing, parsing, or the socket handling itself. It delegates.

   The part that is actually "Nest" is:
     1. A metadata system    — decorators write metadata onto classes
     2. A DI container       — reads that metadata, builds a dependency graph,
                               instantiates everything in topological order
     3. An enhancer pipeline — guards / interceptors / pipes / filters that wrap
                               every route handler in a consistent order

   If you remember one thing: decorators do not DO anything at runtime.
   They only ATTACH METADATA. The container reads it later.
```

### How a decorator becomes a route

```typescript
// ‼️ This is the entire "magic" of Nest, demystified.

// When you write:
@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string) {}
}

// Here is what happens, step by step:

// STEP 1 — At class-definition time (when the file is imported), the decorators run.
// @Controller('users') is roughly:
function Controller(prefix: string): ClassDecorator {
  return (target) => {
    // Reflect.defineMetadata writes a key/value pair onto the CLASS ITSELF.
    // It does not modify behaviour — it is a side-table of annotations.
    // This requires the `reflect-metadata` polyfill, which is why every Nest
    // app imports it in main.ts (or via @nestjs/core).
    Reflect.defineMetadata('path', prefix, target);
    Reflect.defineMetadata('__controller__', true, target);
  };
}

// @Get(':id') is roughly the same but on the METHOD:
function Get(path: string): MethodDescriptor {
  return (target, key, descriptor) => {
    Reflect.defineMetadata('path', path, descriptor.value);
    Reflect.defineMetadata('method', RequestMethod.GET, descriptor.value);
  };
}

// STEP 2 — At bootstrap, NestFactory walks the module tree, finds every class
// marked with __controller__, reads its metadata, and calls the underlying
// Express router for real:
//   expressApp.get('/users/:id', (req, res) => { ... })
// The handler it registers is a WRAPPER that runs guards → interceptors →
// pipes → your method → interceptors (post) → serialisation.

// STEP 3 — @Param('id') stored metadata about WHICH argument maps to WHICH
// part of the request. At call time Nest builds the argument array:
//   handler.apply(controllerInstance, [req.params.id])
// This is why argument ORDER in your method signature is irrelevant to Nest —
// each parameter is independently described by its own decorator.
```

### Where the constructor types come from

```typescript
// ‼️ The single most-asked "how does it know?" question.

@Injectable()
export class UsersService {
  constructor(private readonly repo: UserRepository) {}
  //                              ^^^^^^^^^^^^^^^^
  // TypeScript types are ERASED at compile time. So how does Nest know to
  // inject a UserRepository here?
}

// Answer: `emitDecoratorMetadata: true` in tsconfig.json.
// When a class has ANY decorator on it, TypeScript emits an extra call:
//   Reflect.metadata('design:paramtypes', [UserRepository])
// i.e. the compiler serialises the constructor parameter types into metadata.
// Nest reads 'design:paramtypes' and resolves each one from the module's
// provider registry.

// ‼️ Three consequences that bite people in interviews and in production:
//
// 1. The class MUST have a decorator (@Injectable(), @Controller(), etc.) or
//    TypeScript emits NO paramtypes and Nest cannot inject anything.
//    A provider with no dependencies technically works without @Injectable(),
//    but adding it is always correct — do it unconditionally.
//
// 2. INTERFACES CANNOT BE INJECTED. `constructor(private x: IMailer)` emits
//    `design:paramtypes: [Object]` because interfaces do not exist at runtime.
//    You must use a string/symbol token with @Inject() instead (see §4).
//
// 3. Circular imports produce `undefined` in paramtypes, which is why Nest
//    needs forwardRef() — see §3.
```

### tsconfig requirements

```jsonc
{
  "compilerOptions": {
    // Enables @Decorator() syntax at all. Without it, nothing compiles.
    "experimentalDecorators": true,

    // Emits design:type / design:paramtypes / design:returntype metadata.
    // This is what makes constructor injection work by type. Turning this off
    // silently breaks DI — you get "Nest can't resolve dependencies" errors.
    "emitDecoratorMetadata": true,

    // Nest targets a modern Node runtime; ES2021+ is the usual baseline.
    "target": "ES2021",
    "module": "commonjs",

    // Recommended, not required. strictPropertyInitialization often fights with
    // TypeORM entities and DTOs, so many Nest codebases disable just that flag.
    "strict": true,
    "strictPropertyInitialization": false
  }
}
```

---

## 2. Bootstrapping & Platform Adapters

### main.ts — the production shape

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  // NestFactory.create() does the whole container build:
  //   - recursively scans AppModule's imports
  //   - registers every controller and provider it finds
  //   - instantiates providers in dependency order (leaves first)
  //   - runs onModuleInit hooks
  // It does NOT bind the port yet — that is app.listen().
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // bufferLogs delays log output until a custom logger is attached below,
    // so early bootstrap logs are not lost or printed in the wrong format.
    bufferLogs: true,

    // 'cors: true' would enable permissive CORS; prefer explicit config below.
    // 'abortOnError: false' makes create() throw instead of process.exit(1),
    // which matters when you bootstrap inside tests or a serverless handler.
    abortOnError: false,
  });

  // Express-level middleware still works — the adapter exposes the raw app.
  app.use(helmet());          // security headers (CSP, HSTS, X-Frame-Options...)
  app.use(compression());     // gzip/brotli responses over ~1KB

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [],
    credentials: true,        // required for cookie-based auth across origins
  });

  // Global prefix: every route becomes /api/... except the exclusions.
  // Health checks are excluded so load balancers hit a stable, unversioned path.
  app.setGlobalPrefix('api', { exclude: ['health', 'metrics'] });

  // URI versioning: /api/v1/users, /api/v2/users.
  // Alternatives: VersioningType.HEADER, MEDIA_TYPE, or CUSTOM (extractor fn).
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ‼️ Global pipe. Applied to EVERY handler's parameters.
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip properties that have no decorator in the DTO. This is the single
      // most important security setting in a Nest app: without it, a client can
      // POST { role: 'admin' } and, if you pass the DTO straight to an ORM
      // .save(), mass-assign a field you never intended to expose.
      whitelist: true,

      // Instead of silently stripping unknown props, reject the request with
      // 400. Stricter; good for internal APIs where extra fields signal a bug.
      forbidNonWhitelisted: true,

      // Run class-transformer so the handler receives a real DTO class instance
      // (not a plain object). Required for @Type() nesting and for any method
      // you define on the DTO to exist.
      transform: true,

      transformOptions: {
        // Coerce "123" → 123 and "true" → true based on the TS type. Convenient
        // for query params, but it is a lenient coercion — for anything that
        // must be exact, use an explicit @Type(() => Number) instead.
        enableImplicitConversion: true,
      },

      // In production, do not leak validation internals to clients if your
      // error messages might echo back sensitive constraint details.
      // Usually left false because the messages are genuinely useful.
      disableErrorMessages: false,
    }),
  );

  // Listens for SIGTERM/SIGINT and runs onModuleDestroy / onApplicationShutdown.
  // Without this, Kubernetes rolling deploys kill in-flight requests. See §15.
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  Logger.log(`Listening on ${await app.getUrl()}`, 'Bootstrap');
}
bootstrap();
```

### Express vs Fastify adapter

```typescript
// Swapping the HTTP engine is a two-line change:
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: false, trustProxy: true }),
);
await app.listen(3000, '0.0.0.0'); // Fastify needs an explicit host in containers
```

```text
‼️ What actually changes when you switch to Fastify:

  SAME:  controllers, providers, guards, interceptors, pipes, filters, DI —
         all of it is adapter-agnostic. That is the point of the abstraction.

  DIFFERENT:
    - @Res() gives you a Fastify Reply, not an Express Response.
      reply.send() instead of res.json(); reply.code() instead of res.status().
      Any code that touched the raw response object must be rewritten.
    - Express middleware (app.use) mostly works via middie, but not all of it.
      helmet/compression have @fastify/* equivalents you should use instead.
    - Static files, view engines, and multipart uploads use different packages
      (@fastify/static, @fastify/multipart vs express-static, multer).
    - Some third-party Nest libs assume Express internals and break.

  WHY BOTHER: roughly 2–3x higher request throughput on trivial handlers, mostly
  from Fastify's schema-based serialisation (it compiles a JSON stringifier per
  route instead of calling generic JSON.stringify).

  ‼️ Honest interview answer: in a real app the bottleneck is almost always the
  database, not the HTTP layer, so the adapter swap rarely moves the p99. Choose
  Fastify for new projects (free performance, no downside), but do not migrate an
  existing Express-based Nest app for performance without profiling first.
```

### Standalone applications

```typescript
// ‼️ Nest without HTTP at all — useful for CLI tools, cron workers, migrations,
// and seed scripts that need the same DI container as the API.
async function runSeed() {
  // createApplicationContext() builds the container but registers no HTTP
  // server and no routes. Everything DI-related works exactly the same.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  // .get() pulls a provider out of the container by its token.
  // { strict: false } searches the entire tree instead of only AppModule's
  // own providers, so you do not have to re-export things just for a script.
  const seeder = app.get(SeederService, { strict: false });
  await seeder.run();

  // Always close: this flushes onModuleDestroy hooks, closes DB pools, and
  // lets the process exit instead of hanging on open handles.
  await app.close();
}
```

---

## 3. Modules — Static, Global, Dynamic

### What a module actually is

```text
‼️ A module is a DI SCOPE, not a folder convention.

  providers:   classes the container instantiates and can inject WITHIN this module
  controllers: route handlers instantiated in this module's injector
  imports:     other modules whose EXPORTS become visible here
  exports:     the subset of this module's providers other modules may import

  The rule that trips everyone up:
    A provider is private to its module unless exported.
    Importing a module gives you its exports — NOT its providers, and NOT
    transitively its imports (unless it re-exports them).
```

### The four module patterns

```typescript
// ── 1. FEATURE MODULE — one bounded slice of the domain ──────────────────
@Module({
  imports: [TypeOrmModule.forFeature([User])], // repository for this entity only
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],  // AuthModule needs this; the repo stays private
})
export class UsersModule {}

// ── 2. SHARED MODULE — cross-cutting providers, imported explicitly ──────
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

// ── 3. GLOBAL MODULE — registered once, injectable everywhere ────────────
// ‼️ @Global() does NOT mean "singleton" (everything is a singleton by default).
// It means "put my exports in the global registry so no one has to import me."
@Global()
@Module({
  providers: [ConfigService, LoggerService],
  exports: [ConfigService, LoggerService],
})
export class CoreModule {}
// Use sparingly. Global modules hide the dependency graph: a reader of
// UsersModule can no longer tell what it depends on. Good for config/logging,
// bad for domain services.

// ── 4. DYNAMIC MODULE — configured at import time ────────────────────────
// This is how every third-party Nest module (TypeOrmModule.forRoot,
// JwtModule.register, BullModule.forRoot...) is built.
export interface StorageOptions {
  bucket: string;
  region: string;
}

// A token for the options object. Symbols avoid collisions; strings are fine
// too as long as they are unique. Export it so consumers can inject it.
export const STORAGE_OPTIONS = Symbol('STORAGE_OPTIONS');

@Module({})
export class StorageModule {
  // forRoot = synchronous configuration, values known at import time.
  static forRoot(options: StorageOptions): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        // useValue registers a plain object under a token. StorageService can
        // now do @Inject(STORAGE_OPTIONS) to read its configuration.
        { provide: STORAGE_OPTIONS, useValue: options },
        StorageService,
      ],
      exports: [StorageService],
      global: true, // optional: same effect as @Global() but decided at call time
    };
  }

  // ‼️ forRootAsync = configuration that depends on OTHER providers, e.g. reading
  // env vars through ConfigService. This is the pattern to know cold — every
  // real app wires its database and JWT modules this way.
  static forRootAsync(options: {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<StorageOptions> | StorageOptions;
  }): DynamicModule {
    return {
      module: StorageModule,
      // The factory needs ConfigModule in scope to inject ConfigService, and
      // that scope is local to this dynamic module — hence passing imports in.
      imports: options.imports ?? [],
      providers: [
        {
          provide: STORAGE_OPTIONS,
          // useFactory runs at container build time. Nest awaits the result if
          // it returns a Promise, so async config (fetching secrets from Vault,
          // AWS Secrets Manager, etc.) is fully supported here.
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        StorageService,
      ],
      exports: [StorageService],
    };
  }
}

// Consumer side:
@Module({
  imports: [
    StorageModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        bucket: config.getOrThrow('S3_BUCKET'),
        region: config.getOrThrow('AWS_REGION'),
      }),
    }),
  ],
})
export class AppModule {}
```

### ConfigurableModuleBuilder — the modern way

```typescript
// ‼️ Writing forRoot/forRootAsync/register/registerAsync by hand is ~80 lines of
// boilerplate per module. Nest 9+ generates all four for you.
import { ConfigurableModuleBuilder } from '@nestjs/common';

export const {
  ConfigurableModuleClass,  // base class providing the static methods
  MODULE_OPTIONS_TOKEN,     // token to @Inject() the resolved options
  OPTIONS_TYPE,             // TS type of the sync options argument
  ASYNC_OPTIONS_TYPE,       // TS type of the async options argument
} = new ConfigurableModuleBuilder<StorageOptions>()
  // Renames forRoot/forRootAsync → register/registerAsync if you prefer that
  // convention (Nest's own convention: forRoot = app-wide once,
  // register/forFeature = per-feature, possibly many times).
  .setClassMethodName('forRoot')
  // Adds an `isGlobal` flag to the options that consumers can pass.
  .setExtras({ isGlobal: false }, (definition, extras) => ({
    ...definition,
    global: extras.isGlobal,
  }))
  .build();

@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule extends ConfigurableModuleClass {}
// Consumers now get StorageModule.forRoot({...}) AND .forRootAsync({...}) free.

@Injectable()
export class StorageService {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private opts: StorageOptions) {}
}
```

### Circular dependencies

```typescript
// ‼️ UsersModule needs AuthModule; AuthModule needs UsersModule. At container
// build time one of them is `undefined` when the other is being constructed,
// so Nest throws "Cannot read properties of undefined".

// forwardRef() defers resolution: it hands Nest a THUNK (() => Module) that is
// only called after both classes exist, breaking the initialisation cycle.
@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

// The SAME problem exists at the provider level, and needs its own forwardRef:
@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}
}

// ‼️ Interview-grade take: forwardRef is a code smell, not a solution. A cycle
// means your module boundaries are wrong. The three real fixes, in order of
// preference:
//   1. Extract the shared piece into a third module both depend on
//      (e.g. UsersModule + AuthModule both import a TokenModule).
//   2. Invert one direction with an event: AuthService emits 'user.logged_in'
//      and UsersService subscribes, instead of calling each other directly.
//   3. Depend on an abstract token/interface in one direction and bind the
//      implementation at the composition root.
// Use forwardRef when you inherit a cycle you cannot refactor today.
```

### Module re-export

```typescript
// A module can re-export a module it imports, so consumers get both in one import.
@Module({
  imports: [ConfigModule, PrismaModule],
  exports: [ConfigModule, PrismaModule], // ← re-export: importing CoreModule now
                                          //   also gives you ConfigService and
                                          //   PrismaService without listing them
})
export class CoreModule {}
```

---

## 4. Providers & Dependency Injection

### The five provider forms

```typescript
// ── useClass (the default) ────────────────────────────────────────────────
// `providers: [UsersService]` is shorthand for:
{ provide: UsersService, useClass: UsersService }
// The TOKEN is the class itself; the VALUE is an instance of that class.

// Swap the implementation per environment without touching any consumer:
{
  provide: MailerService,
  useClass: process.env.NODE_ENV === 'production'
    ? SesMailerService      // real AWS SES calls
    : ConsoleMailerService, // logs the email body to stdout
}

// ── useValue — constants, mocks, pre-built SDK clients ────────────────────
{
  provide: 'STRIPE_CLIENT',
  useValue: new Stripe(process.env.STRIPE_KEY, { apiVersion: '2024-06-20' }),
}
// Also the standard way to inject a mock in tests (see §27).

// ── useFactory — computed at build time, may be async ─────────────────────
{
  provide: 'DATABASE_POOL',
  // The factory's arguments come from `inject`, positionally.
  useFactory: async (config: ConfigService) => {
    const pool = new Pool({ connectionString: config.getOrThrow('DATABASE_URL') });
    // Fail fast at boot rather than on the first request: if credentials are
    // wrong, the container build throws and the process never reports healthy.
    await pool.query('SELECT 1');
    return pool;
  },
  inject: [ConfigService],
}

// ── useExisting — an alias to an already-registered provider ──────────────
// Both tokens resolve to the SAME instance (no second construction).
{ provide: 'LOGGER', useExisting: PinoLoggerService }
// Useful when migrating a token name without breaking existing consumers.

// ── Custom token for an INTERFACE ─────────────────────────────────────────
// ‼️ Interfaces vanish at runtime, so you cannot inject one by type. Pair the
// interface with a token constant — this is how you get Dependency Inversion
// (the D in SOLID) in Nest.
export interface PaymentGateway {
  charge(amountCents: number, token: string): Promise<{ id: string }>;
}
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

@Module({
  providers: [{ provide: PAYMENT_GATEWAY, useClass: StripeGateway }],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentsModule {}

@Injectable()
export class CheckoutService {
  // The domain code depends only on the interface. Swapping Stripe for Adyen
  // is a one-line change in the module, and the unit test injects a fake.
  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}
}
```

### Injection modifiers

```typescript
@Injectable()
export class ReportService {
  constructor(
    // @Optional() — resolves to undefined instead of throwing when the token is
    // not registered. Use for genuinely optional collaborators (a metrics sink,
    // a feature-flag client), never to paper over a missing import.
    @Optional() @Inject('METRICS') private readonly metrics?: MetricsClient,

    // @Self() — look ONLY in the current module's injector, never in parents.
    @Self() private readonly localCache: CacheService,

    // @SkipSelf() — skip the current injector, start the lookup at the parent.
    // Used when a module deliberately overrides a provider but one collaborator
    // still needs the outer/global version.
    @SkipSelf() private readonly rootConfig: ConfigService,

    // @Host() — restrict the lookup to the host module (module-scoped
    // resolution). Rare outside library code.
    @Host() private readonly hostScoped: SomeService,
  ) {}
}

// Property injection — works, but avoid it in application code.
@Injectable()
export class LegacyService {
  // ‼️ The dependency is not visible in the constructor, so the class lies about
  // what it needs, and unit tests must reach in and set the property. The one
  // legitimate use is a base class that subclasses should not have to thread a
  // constructor argument through.
  @Inject(HttpService) private readonly http: HttpService;
}
```

### ModuleRef — resolving providers imperatively

```typescript
@Injectable()
export class JobDispatcher implements OnModuleInit {
  private handlers = new Map<string, JobHandler>();

  // ModuleRef is Nest's handle on the container itself. Inject it when the
  // dependency you need is only known at runtime (plugin registries, strategy
  // lookup by name, dynamically chosen handlers).
  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    // .get() — SYNCHRONOUS, singleton-scoped providers only.
    // { strict: false } searches the whole application tree, not just the
    // current module's injector.
    this.handlers.set('email', this.moduleRef.get(EmailJobHandler, { strict: false }));
  }

  async dispatchScoped(name: string) {
    // .resolve() — ASYNCHRONOUS, and the ONLY way to get a REQUEST- or
    // TRANSIENT-scoped provider. Each call returns a NEW instance because
    // scoped providers have no single instance to hand out.
    const handler = await this.moduleRef.resolve(ScopedJobHandler);
    return handler.run(name);
  }

  async dispatchInSameContext(contextId: ContextId) {
    // Passing an existing contextId returns the instance belonging to THAT
    // request context — so a background task can share the request-scoped
    // instances (e.g. the same transaction, the same correlation id).
    return this.moduleRef.resolve(ScopedJobHandler, contextId);
  }

  async createOutsideContainer() {
    // .create() instantiates a class that is NOT registered as a provider,
    // while still injecting its dependencies from the container.
    return this.moduleRef.create(AdHocReportBuilder);
  }
}
```

### Lazy-loading modules

```typescript
// ‼️ Cold-start optimisation, mainly for serverless. By default Nest instantiates
// EVERY provider in EVERY module at bootstrap. A Lambda that only ever calls the
// billing route still pays to construct the reporting, search, and email modules.
@Injectable()
export class RouteHandler {
  constructor(private readonly lazyModuleLoader: LazyModuleLoader) {}

  async handleReport() {
    // The dynamic import() means the module's code is not even parsed until the
    // first call. Nest caches the instantiated module, so subsequent calls are
    // just a map lookup — the cost is paid once per process.
    const { ReportingModule } = await import('./reporting/reporting.module');
    const moduleRef = await this.lazyModuleLoader.load(() => ReportingModule);
    const service = moduleRef.get(ReportingService);
    return service.generate();
  }
}
// Caveat: controllers, resolvers, and enhancers in a lazily-loaded module are
// NOT registered — routing is fixed at bootstrap. Lazy modules are for
// providers only.
```

---

## 5. Injection Scopes & Durable Providers

### The three scopes

```typescript
// ── DEFAULT (singleton) ───────────────────────────────────────────────────
// One instance for the whole application, shared by every request.
// This is the default and what you want ~95% of the time.
@Injectable()
export class UsersService {}

// ── REQUEST ───────────────────────────────────────────────────────────────
// A new instance per incoming request, destroyed when the response is sent.
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  // REQUEST is a special token holding the raw request object.
  constructor(@Inject(REQUEST) private readonly request: Request) {}
  get correlationId() { return this.request.headers['x-correlation-id']; }
}

// ── TRANSIENT ─────────────────────────────────────────────────────────────
// A brand-new instance for EVERY consumer that injects it. Two services
// injecting the same transient provider get two different objects.
@Injectable({ scope: Scope.TRANSIENT })
export class ContextualLogger {
  // INQUIRER is the class that asked for this instance — this is how a logger
  // can automatically tag every line with the name of the service using it.
  constructor(@Inject(INQUIRER) private readonly parent: object) {}
  log(msg: string) { console.log(`[${this.parent.constructor.name}] ${msg}`); }
}
```

### Scope bubbling — the trap

```text
‼️ THE most important scoping fact, and a favourite interview question:

  SCOPE BUBBLES UP THE DEPENDENCY CHAIN.

  If UsersController → UsersService → AuditService, and you mark AuditService
  as REQUEST-scoped, then UsersService becomes request-scoped, and so does
  UsersController. Nest now instantiates that whole chain on EVERY request.

  Consequences:
    - Measurable throughput cost (allocation + GC pressure per request).
    - Singleton state you were relying on silently disappears — an in-memory
      cache or counter on that service is now re-created per request.
    - onModuleInit does NOT run per request; initialisation you assumed ran
      once may not run when you expect.
    - Request-scoped providers CANNOT be injected into singletons at all;
      you must use ModuleRef.resolve() with a contextId instead.

  Where it typically leaks in from:
    - A "CurrentUserService" that injects REQUEST.
    - A tenant-aware database service.
    - A request-scoped logger with the correlation id baked in.

  ‼️ The better answer in almost every case: AsyncLocalStorage.
```

### AsyncLocalStorage instead of request scope

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  correlationId: string;
  userId?: string;
  tenantId?: string;
}

// A single SINGLETON that holds per-request data in Node's async context.
// AsyncLocalStorage propagates a store through the entire async call chain
// (promises, timers, callbacks) without threading an argument through every
// function — the same mechanism OpenTelemetry uses for trace context.
@Injectable()
export class RequestContext {
  private readonly als = new AsyncLocalStorage<RequestStore>();

  // Everything awaited inside `fn` sees this store. Nested async calls inherit it.
  run<T>(store: RequestStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  get(): RequestStore | undefined {
    return this.als.getStore();
  }
}

// Populate it in middleware, which runs before any handler.
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private readonly ctx: RequestContext) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.ctx.run(
      {
        correlationId: (req.headers['x-correlation-id'] as string) ?? randomUUID(),
        userId: (req as any).user?.id,
      },
      // Calling next() INSIDE run() is what puts the rest of the request —
      // guards, interceptors, the handler, the DB calls — inside the context.
      () => next(),
    );
  }
}

// ‼️ Now every service stays a SINGLETON and still reads per-request data:
@Injectable()
export class AuditService {
  constructor(private readonly ctx: RequestContext) {}
  record(action: string) {
    // No request scope, no bubbling, no per-request instantiation cost.
    return this.db.audit.create({
      data: { action, correlationId: this.ctx.get()?.correlationId },
    });
  }
}
```

### Durable providers (multi-tenancy)

```typescript
// ‼️ The escape hatch when you genuinely need per-context instances but not
// per-REQUEST ones — classic case: one instance per TENANT, shared across all
// that tenant's requests, instead of one per request.
@Injectable()
export class TenantContextIdStrategy implements ContextIdStrategy {
  attach(contextId: ContextId, request: Request) {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      // No tenant → fall back to normal per-request behaviour.
      return () => contextId;
    }
    // getByRequest returns a STABLE sub-context id per tenant, so Nest reuses
    // the same durable provider instances for every request from that tenant.
    const tenantSubTreeId = { id: tenantId } as ContextId;
    return (info: HostComponentInfo) =>
      info.isTreeDurable ? tenantSubTreeId : contextId;
  }
}
// Register in main.ts: ContextIdFactory.apply(new TenantContextIdStrategy());
// And mark the provider durable:
@Injectable({ scope: Scope.REQUEST, durable: true })
export class TenantConnection {}
```

---

## 6. Controllers & Routing

### Parameter decorators

```typescript
@Controller({ path: 'users', version: '1' }) // → /api/v1/users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    // @Query() with a DTO class + ValidationPipe gives you typed, validated,
    // coerced query params — far better than reading req.query by hand.
    @Query() query: ListUsersDto,
  ) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(
    // ParseUUIDPipe rejects a malformed id with 400 BEFORE the handler runs,
    // so the service never sees invalid input and the DB is never queried with
    // a value that would throw a driver-level error.
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(id);
  }

  @Post()
  // @HttpCode overrides Nest's default status. Nest returns 201 for POST and
  // 200 for everything else; anything different must be declared.
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    // You can pull a single body property, with its own pipe.
    @Body('email') email: string,
  ) {
    return this.usersService.updateEmail(id, email);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204: no body, so return void
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  @Get('search/*path')     // wildcard segment (Nest 11 / Express 5 syntax;
                            //  Express 4 / Nest ≤10 used '*')
  search(@Param('path') path: string) {}

  // Other parameter decorators worth knowing:
  //   @Headers('authorization') auth: string
  //   @Ip() ip: string
  //   @HostParam('tenant') tenant: string   — with @Controller({ host: ':tenant.example.com' })
  //   @Session() session: Record<string, any>
  //   @Next() next: NextFunction            — escape hatch, almost never needed
  //   @Req() / @Request()                   — the raw request object
}
```

### The @Res() trap

```typescript
@Controller('files')
export class FilesController {
  // ‼️ Injecting @Res() switches that handler into "library-specific mode":
  // Nest STOPS handling the response entirely. Your return value is ignored,
  // interceptors that map the response body no longer apply, and if you forget
  // to call res.send() the request HANGS until the client times out.
  @Get('bad')
  bad(@Res() res: Response) {
    res.status(200).json({ ok: true }); // you now own the whole response
  }

  // ‼️ The fix when you only need to set a header or a cookie:
  // passthrough: true keeps Nest in control of sending the response, while
  // still giving you the raw object for side effects.
  @Get('good')
  good(@Res({ passthrough: true }) res: Response) {
    res.cookie('session', 'abc', { httpOnly: true, sameSite: 'lax' });
    return { ok: true }; // Nest serialises this normally — interceptors still run
  }

  // Streaming a file the idiomatic way — no @Res() needed at all.
  @Get('download/:id')
  @Header('Content-Type', 'application/pdf')
  download(@Param('id') id: string): StreamableFile {
    const stream = createReadStream(join(process.cwd(), 'files', `${id}.pdf`));
    // StreamableFile lets Nest pipe the stream and still run the normal
    // response pipeline, including error handling if the stream fails.
    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="${id}.pdf"`,
    });
  }
}
```

### Route matching order

```typescript
@Controller('users')
export class UsersController {
  // ‼️ Nest registers routes in DECLARATION ORDER and Express matches the first
  // pattern that fits. Declaring @Get(':id') first would make GET /users/me
  // match it with id === 'me' — a real bug that ships regularly.
  @Get('me')        // STATIC segments must be declared BEFORE dynamic ones
  me() {}

  @Get(':id')       // this would otherwise swallow /users/me
  findOne(@Param('id') id: string) {}
}
```

### Versioning strategies

```typescript
// URI (most common, most cache-friendly, most visible)
@Controller({ path: 'users', version: '1' })
export class UsersV1Controller {}

@Controller({ path: 'users', version: '2' })
export class UsersV2Controller {}

// A single controller can serve several versions, or opt out entirely:
@Controller({ path: 'users', version: ['1', '2'] })       // both
@Controller({ path: 'health', version: VERSION_NEUTRAL }) // unversioned

// Header-based: app.enableVersioning({ type: VersioningType.HEADER,
//                                      header: 'X-API-Version' })
// Media type:   Accept: application/json;v=2
// Custom:       extractor: (req) => req.headers['x-version'] ?? '1'
```

---

## 7. The Full Request Lifecycle

```text
‼️ MEMORISE THIS ORDER — it is the single most common NestJS interview question.

  Incoming HTTP request
        │
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ 1. MIDDLEWARE                                                   │
  │    Global (app.use) → module-bound (configure/MiddlewareConsumer)│
  │    Runs on the RAW req/res. No DI-injected handler context yet   │
  │    (no ExecutionContext, so it cannot read route metadata).      │
  └─────────────────────────────────────────────────────────────────┘
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ 2. GUARDS                    Global → Controller → Route        │
  │    Return boolean/Promise<boolean>. false → 403 ForbiddenException│
  │    Has ExecutionContext, so it CAN read @SetMetadata via Reflector│
  │    This is where authN/authZ belongs.                           │
  └─────────────────────────────────────────────────────────────────┘
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ 3. INTERCEPTORS (pre)        Global → Controller → Route        │
  │    Everything BEFORE `return next.handle()`.                    │
  └─────────────────────────────────────────────────────────────────┘
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ 4. PIPES                     Global → Controller → Route → Param│
  │    Transform + validate each argument, in that order.           │
  └─────────────────────────────────────────────────────────────────┘
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ 5. ROUTE HANDLER  →  your services  →  database                 │
  └─────────────────────────────────────────────────────────────────┘
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ 6. INTERCEPTORS (post)       Route → Controller → Global        │
  │    ‼️ REVERSE order — the RxJS operators after next.handle()     │
  │    unwind like a stack (first in, last out).                    │
  └─────────────────────────────────────────────────────────────────┘
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ 7. EXCEPTION FILTERS  (only if something threw, at any stage)   │
  │    Route → Controller → Global → built-in default               │
  │    ‼️ REVERSE of the others: the MOST specific filter wins.      │
  └─────────────────────────────────────────────────────────────────┘
        ▼
  Response sent
```

```text
‼️ The three details that separate a good answer from a great one:

  1. Interceptors run TWICE — once before pipes, once after the handler — and
     the post half unwinds in reverse. A timing interceptor works because the
     same closure sees both edges.

  2. Guards run BEFORE pipes. So an @Body() DTO is NOT yet validated or
     transformed when a guard runs; a guard reading request.body sees raw,
     untrusted input. Never make an authorization decision on unvalidated body
     data — read from params/headers/token, or validate inside the guard.

  3. Middleware cannot access ExecutionContext, so it cannot read route
     metadata (Reflector). If your logic needs to know which handler is about
     to run — anything driven by a custom decorator — it must be a guard or an
     interceptor, not middleware.

  4. Exception filters catch throws from ANY earlier stage, including guards
     and pipes — but NOT from middleware (that goes to the underlying Express
     error handler, which is why middleware errors sometimes bypass your
     nicely formatted error responses).
```

---

## 8. Middleware

```typescript
// Class-based middleware — injectable, so it can use services.
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    // 'finish' fires when the response headers and body have been handed to the
    // socket. Listening here (rather than logging up front) is what lets you
    // record the status code and duration of the completed request.
    res.on('finish', () => {
      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`,
      );
    });

    // Forgetting next() hangs the request forever. There is no timeout by default.
    next();
  }
}

// Functional middleware — no DI, but lighter and fine for stateless work.
export function correlationId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-correlation-id'] as string) ?? randomUUID();
  req.headers['x-correlation-id'] = id;
  res.setHeader('x-correlation-id', id); // echo it back for client-side tracing
  next();
}

// Binding: middleware CANNOT be registered in the `providers` array like other
// enhancers. It is wired through the module's configure() method.
@Module({ controllers: [UsersController, AuthController] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(correlationId, RequestLoggerMiddleware) // order = execution order
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        'metrics',                                    // string shorthand
      )
      .forRoutes('*');                                // all routes

    consumer
      .apply(RateLimitMiddleware)
      .forRoutes(AuthController);      // a controller class…
      // .forRoutes({ path: 'auth/login', method: RequestMethod.POST }); // …or a route
  }
}
```

```text
‼️ Middleware vs Guard vs Interceptor — the decision rule:

  MIDDLEWARE   Raw req/res plumbing that does not care which handler runs:
               correlation ids, body parsing, static files, CORS, helmet,
               third-party Express middleware.
               No ExecutionContext → no access to route metadata or DTOs.

  GUARD        A yes/no access decision: is this caller authenticated, do they
               have the role, do they own this resource, is the feature flag on.
               Has ExecutionContext → can read @Roles(), @Public(), etc.
               Returning false yields 403 automatically.

  INTERCEPTOR  Wraps the handler on BOTH sides: response shaping, timing,
               caching, retries, timeouts, serialisation, transaction wrapping.
               Anything that needs "before AND after" is an interceptor.
```

---

## 9. Guards & Authorization

### JWT authentication guard

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ‼️ getAllAndOverride reads metadata from the HANDLER first, then falls
    // back to the CONTROLLER class. That precedence is what lets a single
    // @Public() route live inside an otherwise-protected controller.
    // (getAllAndMerge would combine both instead of overriding — use that for
    // additive metadata like roles.)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // switchToHttp() is required because ExecutionContext is transport-agnostic:
    // the same guard class can run over HTTP, WebSockets, gRPC, or a microservice
    // message, and each transport exposes its arguments differently.
    const request = context.switchToHttp().getRequest<Request>();

    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      // Attaching to the request is how downstream code (the @CurrentUser()
      // param decorator, other guards, interceptors) sees the authenticated user.
      request['user'] = payload;
      return true;
    } catch {
      // ‼️ Deliberately do not echo the JWT library's error message. "jwt
      // expired" vs "invalid signature" tells an attacker which half of their
      // forgery attempt was wrong.
      throw new UnauthorizedException('Invalid token');
    }
  }
}

// The @Public() escape hatch:
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Role-based authorization

```typescript
export enum Role { User = 'user', Admin = 'admin', Owner = 'owner' }

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // No @Roles() on the route → authorization is not this guard's concern.
    // (Authentication was already enforced by JwtAuthGuard running before it.)
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    // ‼️ Guard order matters: RolesGuard assumes request.user exists, which is
    // only true if JwtAuthGuard ran first. Global guards run in REGISTRATION
    // order, so JwtAuthGuard must be provided before RolesGuard.
    return required.some((role) => user?.roles?.includes(role));
  }
}
```

### Ownership / resource-level authorization

```typescript
// ‼️ Role checks are not enough. "Any user can edit a post" plus "this post
// belongs to someone else" is IDOR (Insecure Direct Object Reference) — the
// most common real-world API vulnerability. Ownership must be checked against
// the actual record.
@Injectable()
export class PostOwnerGuard implements CanActivate {
  constructor(private readonly posts: PostsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const post = await this.posts.findOne(req.params.id);

    if (!post) {
      // ‼️ 404 rather than 403 on a missing record: returning 403 for records
      // that exist and 404 for ones that do not lets an attacker enumerate
      // valid ids. Some teams return 404 for "exists but not yours" too, for
      // exactly this reason.
      throw new NotFoundException();
    }

    if (post.authorId !== req.user.id && !req.user.roles.includes(Role.Admin)) {
      throw new ForbiddenException();
    }

    // Stash the already-loaded record so the handler does not query it again.
    req.post = post;
    return true;
  }
}
```

### Binding guards

```typescript
// Route-level / controller-level: takes a CLASS, so Nest instantiates it via DI.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  @Roles(Role.Admin)
  @Get('stats')
  stats() {}
}

// Global via app.useGlobalGuards(new JwtAuthGuard()) — ‼️ this instance is
// constructed OUTSIDE the container, so it gets NO dependency injection.

// ‼️ The correct way to register a global guard that needs DI:
@Module({
  providers: [
    // APP_GUARD is a special token. Nest collects every provider registered
    // under it and applies them globally — but because they are registered as
    // normal providers, they are fully injectable.
    { provide: APP_GUARD, useClass: JwtAuthGuard },  // runs first
    { provide: APP_GUARD, useClass: RolesGuard },    // runs second
  ],
})
export class AppModule {}
// The same pattern exists for APP_PIPE, APP_INTERCEPTOR, and APP_FILTER.
```

---

## 10. Interceptors & RxJS

### The shape

```typescript
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const { method, url } = context.switchToHttp().getRequest();

    // ‼️ next.handle() returns an Observable that has NOT been subscribed yet.
    // Nest subscribes to it after all interceptors have wrapped it. Everything
    // before this line runs pre-handler; everything you pipe onto it runs post.
    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${method} ${url} ${Date.now() - start}ms`),
        error: (e) => this.logger.error(`${method} ${url} failed: ${e.message}`),
      }),
    );
  }
}
```

### Response envelope

```typescript
export interface ApiResponse<T> {
  data: T;
  meta: { timestamp: string; correlationId?: string };
}

// Generic so the transformed type is preserved for callers/tests.
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const req = ctx.switchToHttp().getRequest();
    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          timestamp: new Date().toISOString(),
          correlationId: req.headers['x-correlation-id'],
        },
      })),
    );
  }
}
// ‼️ Two things this breaks if you apply it globally without thinking:
//   1. Error responses do NOT pass through interceptors — they are handled by
//      exception filters. So your success shape and error shape diverge unless
//      the filter emits the same envelope. Design them together.
//   2. File downloads / StreamableFile get wrapped into { data: {...} } and
//      corrupt the download. Exclude those routes.
```

### Timeout, retry, and cache interceptors

```typescript
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly ms = 5000) {}

  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      // RxJS timeout() throws TimeoutError if the source has not emitted in
      // time. ‼️ It does NOT cancel the underlying work — the DB query or HTTP
      // call keeps running. This protects the CLIENT's latency budget, not the
      // server's resources. For real cancellation you need AbortSignal support
      // in the driver, or a statement_timeout at the database level.
      timeout(this.ms),
      catchError((err) =>
        err instanceof TimeoutError
          ? throwError(() => new RequestTimeoutException())
          : throwError(() => err),
      ),
    );
  }
}

@Injectable()
export class HttpRetryInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      retry({
        count: 3,
        // Exponential backoff with jitter. Without jitter, every client that
        // failed at the same instant retries at the same instant — a
        // thundering herd that keeps a recovering service down.
        delay: (error, retryCount) => {
          // ‼️ Only retry what is safe to retry. Retrying a 400 wastes calls;
          // retrying a non-idempotent POST can double-charge a customer.
          if (error.status && error.status < 500) throw error;
          const base = Math.pow(2, retryCount) * 100;
          return timer(base + Math.random() * base);
        },
      }),
    );
  }
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    if (req.method !== 'GET') return next.handle(); // never cache writes

    const key = `http:${req.originalUrl}:${req.user?.id ?? 'anon'}`;
    //                                      ^^^^^^^^^^^^^^^^^^^^^^
    // ‼️ Include the identity in the key. A shared cache key across users is
    // how one user's private data ends up served to another — a real incident
    // pattern, not a theoretical one.

    const hit = await this.cache.get(key);
    // of() wraps the cached value into an Observable so the handler is skipped
    // entirely while the response pipeline stays identical.
    if (hit !== undefined) return of(hit);

    return next.handle().pipe(tap((body) => this.cache.set(key, body, 30_000)));
  }
}
```

### Class serialisation

```typescript
// ‼️ The built-in way to stop leaking password hashes and internal fields.
export class UserEntity {
  id: string;
  email: string;

  // @Exclude() drops the field from the serialised output. Combined with
  // ClassSerializerInterceptor, this is enforced centrally instead of relying
  // on every service to remember to delete the field.
  @Exclude()
  passwordHash: string;

  // @Expose() with groups: only serialised when the request context asks for
  // that group — e.g. admins see internal notes, regular users do not.
  @Expose({ groups: ['admin'] })
  internalNotes: string;

  // @Transform() reshapes a value on the way out.
  @Transform(({ value }) => value.toISOString())
  createdAt: Date;

  constructor(partial: Partial<UserEntity>) { Object.assign(this, partial); }
}

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    // ‼️ MUST return a CLASS INSTANCE. class-transformer reads the decorators
    // off the prototype, so a plain object from an ORM `select` is passed
    // through untouched — @Exclude does nothing and the hash leaks. This is
    // the #1 way this feature silently fails.
    return new UserEntity(await this.usersService.findOne(id));
  }
}
```

---

## 11. Pipes & Validation

### DTOs with class-validator

```typescript
export class CreateUserDto {
  @IsEmail({}, { message: 'A valid email is required' })
  // Normalising here means every downstream layer — uniqueness checks, lookups,
  // the DB unique index — sees the same canonical form.
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain upper, lower, and a digit',
  })
  password: string;

  @IsOptional()          // ‼️ skips ALL other validators when the value is
                         // undefined/null — this is how you model "not sent"
                         // as distinct from "sent as empty".
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.User;

  // Nested objects need BOTH decorators:
  //   @ValidateNested tells class-validator to recurse.
  //   @Type tells class-transformer which class to instantiate — without it the
  //   nested value stays a plain object and its decorators never run, so nested
  //   validation silently passes everything.
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @IsArray()
  @ValidateNested({ each: true }) // `each` applies the rule per array element
  @Type(() => TagDto)
  @ArrayMaxSize(10)
  tags: TagDto[];
}

// Query DTOs need explicit coercion because query strings are always strings.
export class ListUsersDto {
  @Type(() => Number)   // "2" → 2 before @IsInt runs
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)             // ‼️ ALWAYS cap page size. Without it, ?limit=1000000
                        // is a free denial-of-service against your database.
  @IsOptional()
  limit = 20;

  @IsIn(['createdAt', 'email'])  // ‼️ allow-list sort columns. Interpolating a
                                 // user-supplied column into ORDER BY is SQL
                                 // injection even through an ORM query builder.
  @IsOptional()
  sortBy = 'createdAt';
}
```

### Derived DTOs with mapped types

```typescript
// Avoid duplicating validation rules across create/update DTOs.
import { PartialType, PickType, OmitType, IntersectionType } from '@nestjs/swagger';
// (@nestjs/mapped-types has the same helpers without the OpenAPI metadata.)

// Every field optional, all validators preserved — the canonical PATCH DTO.
export class UpdateUserDto extends PartialType(CreateUserDto) {}

// Only the named fields.
export class LoginDto extends PickType(CreateUserDto, ['email', 'password']) {}

// Everything except the named fields.
export class PublicUserDto extends OmitType(CreateUserDto, ['password']) {}

// Combine two DTOs.
export class SearchUsersDto extends IntersectionType(ListUsersDto, FilterDto) {}
```

### Custom pipes

```typescript
// A validation pipe backed by Zod, for teams that prefer schema-first over
// decorator-first. Works because ValidationPipe is not special — any class
// implementing PipeTransform can validate.
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    // The RETURN VALUE becomes the handler's argument — this is why pipes can
    // transform as well as validate, and why they run before the handler.
    return result.data;
  }
}
// Usage: @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserInput

// A pipe that resolves an id into the entity itself, so the handler receives a
// domain object instead of a string it has to look up.
@Injectable()
export class ParseUserByIdPipe implements PipeTransform<string, Promise<User>> {
  constructor(private readonly users: UsersService) {}

  async transform(value: string, metadata: ArgumentMetadata): Promise<User> {
    const user = await this.users.findOne(value);
    // Throwing from a pipe produces a clean 404 before the handler body runs,
    // so the handler never has to write the "if (!user) throw" branch.
    if (!user) throw new NotFoundException(`User ${value} not found`);
    return user;
  }
}
// Usage: findOne(@Param('id', ParseUserByIdPipe) user: User) { return user; }
```

```text
‼️ Built-in pipes worth knowing by name:
   ParseIntPipe, ParseFloatPipe, ParseBoolPipe, ParseArrayPipe,
   ParseUUIDPipe, ParseEnumPipe, DefaultValuePipe, ValidationPipe,
   ParseFilePipe (with MaxFileSizeValidator / FileTypeValidator).

   Configure error codes inline:
     @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE }))

   Order: @Body(PipeA, PipeB) runs A then B, each receiving the previous output.
```

---

## 12. Exception Filters & Error Handling

### Built-in exceptions

```typescript
// Nest maps each of these to the right status code automatically.
throw new BadRequestException('Invalid payload');            // 400
throw new UnauthorizedException();                           // 401
throw new ForbiddenException();                              // 403
throw new NotFoundException('User not found');               // 404
throw new ConflictException('Email already registered');     // 409
throw new UnprocessableEntityException();                    // 422
throw new TooManyRequestsException();                        // 429
throw new InternalServerErrorException();                    // 500
throw new ServiceUnavailableException();                     // 503

// Custom domain exceptions — the right way to keep HTTP concerns out of the
// domain layer while still getting correct status codes at the edge.
export class InsufficientFundsException extends HttpException {
  constructor(
    public readonly required: number,
    public readonly available: number,
  ) {
    super(
      {
        // A stable machine-readable code lets clients branch on the error
        // without string-matching a human message that will be reworded.
        code: 'INSUFFICIENT_FUNDS',
        message: `Requires ${required} but only ${available} available`,
        required,
        available,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
```

### Global exception filter

```typescript
// @Catch() with NO argument catches EVERYTHING, including non-HttpException
// throws (a TypeError, a driver error, a rejected promise).
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  // HttpAdapterHost gives a transport-agnostic way to write the response, so
  // the same filter works under both Express and Fastify.
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: Record<string, unknown> = {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      payload =
        typeof response === 'string' ? { message: response } : { ...(response as object) };
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // ‼️ Translate driver errors at the edge so the persistence layer's
      // vocabulary never reaches the client. P2002 = unique constraint.
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        payload = { code: 'DUPLICATE', message: 'Resource already exists' };
      }
    }

    // ‼️ Log the FULL error server-side, return a SAFE message to the client.
    // Stack traces in an HTTP response disclose file paths, package versions,
    // and sometimes credentials from connection strings.
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    httpAdapter.reply(
      ctx.getResponse(),
      {
        ...payload,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(request),
        correlationId: request.headers['x-correlation-id'],
      },
      status,
    );
  }
}

// Register globally WITH DI:
@Module({ providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }] })
export class AppModule {}
```

### Filter ordering

```typescript
// ‼️ Filters resolve MOST-SPECIFIC-FIRST — the opposite of guards/interceptors.
//   Route filter → Controller filter → Global filter → Nest's built-in
// The first filter whose @Catch() matches the thrown type wins; a @Catch()
// with no argument at the route level would shadow everything below it.

@Catch(InsufficientFundsException)
export class PaymentExceptionFilter implements ExceptionFilter {
  catch(exception: InsufficientFundsException, host: ArgumentsHost) {
    // Handle only this case; anything else falls through to the global filter.
  }
}

@UseFilters(PaymentExceptionFilter) // controller- or route-level
@Controller('payments')
export class PaymentsController {}
```

---

## 13. Custom Decorators & Metadata

```typescript
// ── Parameter decorator ───────────────────────────────────────────────────
// createParamDecorator receives (data, ctx) and returns the argument value.
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    // `data` is whatever the caller passed: @CurrentUser('id') → data === 'id',
    // which lets one decorator serve both the whole object and a single field.
    return data ? user?.[data] : user;
  },
);
// Usage: findMe(@CurrentUser() user: JwtPayload)
//        findMyId(@CurrentUser('id') userId: string)

// ── Metadata decorator ────────────────────────────────────────────────────
export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs });

// ── Composed decorator ────────────────────────────────────────────────────
// ‼️ applyDecorators collapses a repeated stack into one reusable decorator.
// Without it, every protected admin route repeats five lines and eventually
// one of them forgets a guard.
export function AdminOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(Role.Admin),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid token' }),
    ApiForbiddenResponse({ description: 'Requires admin role' }),
  );
}
// Usage:
//   @AdminOnly()
//   @Get('stats')
//   stats() {}

// ── Reflector API cheat sheet ─────────────────────────────────────────────
// get(key, target)                 — read from one target only
// getAll(key, [targets])           — array of each target's value
// getAllAndMerge(key, [targets])   — concatenate arrays / merge objects
//                                    (use for ADDITIVE metadata, e.g. roles)
// getAllAndOverride(key, [targets])— first non-undefined wins, handler first
//                                    (use for OVERRIDING metadata, e.g. @Public)

// ── Typed metadata (Nest 9+) ──────────────────────────────────────────────
// Reflector.createDecorator gives type-safe metadata with no string key to
// keep in sync between the decorator and the reader.
export const Roles2 = Reflector.createDecorator<Role[]>();
// Reading it: this.reflector.getAllAndOverride(Roles2, [handler, class])
// — the return type is inferred as Role[], no generic argument needed.
```

---

## 14. Configuration & Environment

```typescript
// ── Namespaced, typed config ──────────────────────────────────────────────
export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  poolSize: parseInt(process.env.DB_POOL_SIZE ?? '10', 10),
  ssl: process.env.DB_SSL === 'true',
}));
// registerAs gives you a token you can inject with full typing, instead of
// stringly-typed config.get('database.poolSize') lookups scattered everywhere.

@Module({
  imports: [
    ConfigModule.forRoot({
      // Available everywhere without importing ConfigModule in each feature.
      isGlobal: true,

      // Later files do NOT override earlier ones — first match wins. So the
      // environment-specific file must come first.
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],

      load: [databaseConfig, authConfig, redisConfig],

      // ‼️ Validate at BOOT. A missing or malformed env var should crash the
      // process at startup — where a deploy pipeline catches it — not throw on
      // a random request at 3am. This is the single highest-value line here.
      validate: (raw) => {
        const parsed = envSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error(
            `Invalid environment:\n${JSON.stringify(parsed.error.format(), null, 2)}`,
          );
        }
        return parsed.data;
      },

      // Caches process.env lookups. process.env access is surprisingly slow in
      // Node (it hits the host environment each time), so this matters on
      // hot paths that read config per request.
      cache: true,

      // Prevents ConfigModule from mutating process.env, which keeps tests
      // isolated from one another.
      ignoreEnvVars: false,
      expandVariables: true, // supports ${VAR} interpolation inside .env
    }),
  ],
})
export class AppModule {}

// The Zod schema — one source of truth for what the app needs to run.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  // ‼️ Enforce secret strength in the schema, not in a wiki page nobody reads.
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
});
export type Env = z.infer<typeof envSchema>;
```

```typescript
// ── Consuming config ──────────────────────────────────────────────────────
@Injectable()
export class TokenService {
  constructor(
    // Injecting the namespaced config gives a fully-typed object with no
    // string keys and no runtime lookup cost per access.
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  sign(payload: object) {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.accessTokenTtl,
    });
  }
}

@Injectable()
export class OtherService {
  constructor(private readonly config: ConfigService<Env, true>) {
    //                                              ^^^^^^^^^ `true` = infer
    // types AND treat every key as required, so get() returns a non-optional
    // type instead of `T | undefined`.

    // ‼️ getOrThrow over get: fail loudly at construction rather than passing
    // `undefined` into an SDK that will fail with a much less obvious error
    // several layers deeper.
    const url = this.config.getOrThrow('DATABASE_URL');
  }
}
```

---

## 15. Lifecycle Hooks & Graceful Shutdown

```text
‼️ Order of lifecycle events:

  STARTUP
    1. onModuleInit()            — per module, after its own providers exist
                                   (dependencies are ready; siblings may not be)
    2. onApplicationBootstrap()  — after ALL modules are initialised
                                   (the safe place for cross-module work)
    → app.listen() binds the port

  SHUTDOWN  (only fires if enableShutdownHooks() was called)
    3. onModuleDestroy()             — per module, teardown of its own resources
    4. beforeApplicationShutdown(sig)— all modules destroyed, connections still open
    5. onApplicationShutdown(sig)    — final cleanup; close pools/clients here
```

```typescript
@Injectable()
export class QueueConsumer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private consumer?: KafkaConsumer;
  private inFlight = 0;
  private draining = false;

  async onApplicationBootstrap() {
    // ‼️ Start consuming here, not in onModuleInit: at onModuleInit time other
    // modules this handler depends on may not be initialised yet, so a message
    // arriving in that window would hit half-built dependencies.
    this.consumer = await this.kafka.consumer({ groupId: 'orders' });
    await this.consumer.run({ eachMessage: (m) => this.handle(m) });
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Shutting down on ${signal}`);
    this.draining = true;

    // Stop accepting new work FIRST, then drain what is in flight. Doing it in
    // the other order means new messages keep arriving while you wait.
    await this.consumer?.disconnect();

    // ‼️ Bounded wait. An unbounded drain loop turns a rolling deploy into a
    // hang; Kubernetes will SIGKILL at terminationGracePeriodSeconds anyway,
    // so exiting cleanly before that is strictly better than being killed.
    const deadline = Date.now() + 15_000;
    while (this.inFlight > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200));
    }
    if (this.inFlight > 0) {
      this.logger.warn(`Forcing exit with ${this.inFlight} messages in flight`);
    }
  }
}
```

```text
‼️ The Kubernetes graceful-shutdown sequence, and why readiness matters:

  1. K8s sends SIGTERM AND removes the pod from the Service endpoints — but
     these are NOT atomic. For a second or two, traffic still arrives at a pod
     that has already begun shutting down.
  2. So: on SIGTERM, first flip your READINESS probe to failing, keep serving
     for a few seconds, THEN start closing resources.
  3. app.close() runs the shutdown hooks and stops the HTTP server from
     accepting new connections while letting in-flight ones finish.
  4. Set terminationGracePeriodSeconds longer than your worst-case drain.

  Skipping step 2 is the usual cause of "we get 502s on every deploy".
```

---

## 16. Persistence — TypeORM

### Wiring

```typescript
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),

        // autoLoadEntities picks up everything registered via forFeature(),
        // so you do not maintain a second list of entity paths.
        autoLoadEntities: true,

        // ‼️ NEVER true outside local development. synchronize alters the live
        // schema to match your entities on every boot — it will silently drop
        // a column when you rename a property. Production uses migrations.
        synchronize: false,

        // Also never true in production: it would run pending migrations during
        // startup, so N replicas racing to migrate the same database.
        // Run migrations as a separate pipeline step or an init container.
        migrationsRun: false,

        // Connection pool sizing: this is per PROCESS. With 4 replicas × 4
        // cluster workers × 10 connections you are asking Postgres for 160
        // connections — past the default max_connections of 100. Size against
        // the database limit, and put PgBouncer in front if you need more.
        extra: { max: 10, connectionTimeoutMillis: 5000 },

        // Log slow queries in production; log everything only in development.
        logging: config.get('NODE_ENV') === 'development' ? 'all' : ['error', 'warn'],
        maxQueryExecutionTime: 1000, // logs any query slower than 1s
      }),
    }),
  ],
})
export class DatabaseModule {}
```

### Entities and relations

```typescript
@Entity('users')
// A composite/partial index defined where the entity lives, so it is reviewed
// alongside the query that needs it.
@Index(['tenantId', 'createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // unique: true creates a UNIQUE INDEX — the only reliable way to prevent
  // duplicate emails. A "check then insert" in application code is a race:
  // two concurrent requests both pass the check and both insert.
  @Column({ unique: true })
  email: string;

  // select: false keeps the column out of every default query, so a forgotten
  // `find()` cannot leak the hash. You must opt in with addSelect() to read it.
  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.User })
  role: Role;

  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, unknown> | null;

  // One-to-many: the FK lives on the OTHER table (posts.authorId).
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @ManyToMany(() => Team, (team) => team.members)
  @JoinTable({ name: 'user_teams' }) // owning side creates the join table
  teams: Team[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;

  // Soft delete: rows get deletedAt set instead of being removed, and TypeORM
  // adds `WHERE deletedAt IS NULL` to queries automatically.
  // ‼️ Caveat: a UNIQUE index still sees soft-deleted rows, so a user who
  // deletes their account cannot re-register with the same email unless you
  // use a partial unique index (WHERE deleted_at IS NULL).
  @DeleteDateColumn() deletedAt: Date | null;

  @VersionColumn() version: number; // optimistic locking — see §19
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => User, (user) => user.posts, {
    // RESTRICT/CASCADE decides what the DATABASE does when the parent is
    // deleted. Prefer letting the database enforce it over application code —
    // it holds even for writes that bypass your app.
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  // ‼️ Mapping the FK as its own column lets you set/read the relation without
  // loading the whole User entity — a large and easily-missed win.
  @Column({ name: 'author_id' })
  authorId: string;
}
```

### Repository patterns and the N+1 problem

```typescript
@Injectable()
export class UsersService {
  constructor(
    // @InjectRepository provides the repository token registered by forFeature.
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly dataSource: DataSource, // for transactions / raw queries
  ) {}

  // ‼️ THE N+1 PROBLEM — the most common ORM performance bug, and a guaranteed
  // interview topic.
  async badFindAll() {
    const users = await this.repo.find();            // 1 query
    for (const user of users) {
      user.posts = await this.postsRepo.find({       // N more queries
        where: { authorId: user.id },
      });
    }
    // 100 users → 101 round trips. Each is only ~1ms, but 101 sequential
    // round trips is ~100ms of pure latency doing nothing.
  }

  async goodFindAll() {
    // relations generates a LEFT JOIN — one query, all data.
    return this.repo.find({
      relations: { posts: true },
      // ‼️ Always select explicitly on hot paths. `SELECT *` on a table with a
      // jsonb blob or a text column pulls megabytes you immediately discard.
      select: { id: true, email: true, posts: { id: true, title: true } },
      // ‼️ Never return an unbounded list from an API.
      take: 20,
      skip: 0,
      order: { createdAt: 'DESC' },
    });
  }

  // ‼️ The JOIN + LIMIT trap: with a one-to-many join, `take` applies to the
  // JOINED ROWS, not the parent entities — a user with 5 posts consumes 5 of
  // your 20 rows. TypeORM's `find` handles this by issuing two queries, but a
  // hand-written QueryBuilder does NOT unless you say so.
  async paginatedWithRelations(page: number, limit: number) {
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.posts', 'post')
      .where('user.tenantId = :tenantId', { tenantId })
      //          ^^^^^^^^^^^^ parameterised — NEVER template-interpolate user
      //          input into a query string, even inside an ORM.
      .orderBy('user.createdAt', 'DESC')
      .take(limit)   // take/skip = entity-aware pagination (two queries)
      .skip((page - 1) * limit)
      // limit/offset = raw SQL LIMIT/OFFSET — wrong here, right for flat queries
      .getManyAndCount(); // returns [rows, total] for the pagination envelope
  }

  // ‼️ Keyset (cursor) pagination — what you use once the table is large.
  // OFFSET 100000 makes Postgres read and discard 100,000 rows; a WHERE on an
  // indexed column jumps straight to the right place. Cost stays flat as the
  // offset grows, which is why every large API paginates by cursor.
  async keysetPage(cursor?: { createdAt: Date; id: string }, limit = 20) {
    const qb = this.repo.createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC') // tiebreaker keeps the order total/stable
      .take(limit + 1);              // fetch one extra to detect "has more"

    if (cursor) {
      // Row-value comparison — the clean way to express "strictly after this
      // (createdAt, id) pair" without nested OR conditions.
      qb.where('(user.createdAt, user.id) < (:createdAt, :id)', cursor);
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    return { items: hasMore ? rows.slice(0, limit) : rows, hasMore };
  }
}
```

### Migrations

```typescript
// data-source.ts — the CLI needs its own DataSource, separate from the Nest module.
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});

// npm run typeorm -- migration:generate src/migrations/AddUserRole -d data-source.ts
// npm run typeorm -- migration:run -d data-source.ts
// npm run typeorm -- migration:revert -d data-source.ts
```

```typescript
export class AddUserRole1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ‼️ Adding a NOT NULL column with a DEFAULT rewrites the whole table and
    // holds an ACCESS EXCLUSIVE lock on older Postgres (<11). The zero-downtime
    // sequence is: add nullable → backfill in batches → add the NOT NULL
    // constraint (NOT VALID, then VALIDATE) → deploy code that writes it.
    await queryRunner.query(`ALTER TABLE "users" ADD "role" varchar`);
    await queryRunner.query(`UPDATE "users" SET "role" = 'user' WHERE "role" IS NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL`);

    // CONCURRENTLY builds the index without blocking writes. It cannot run
    // inside a transaction, so this migration must be marked transactional:false
    // (or run as its own migration) — otherwise it errors out.
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY "idx_users_role" ON "users" ("role")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ‼️ Always write down(). Untested rollbacks are how a bad deploy becomes
    // a two-hour incident instead of a two-minute one.
    await queryRunner.query(`DROP INDEX "idx_users_role"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
```

---

## 17. Persistence — Prisma

```typescript
// ── PrismaService ─────────────────────────────────────────────────────────
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      datasources: { db: { url: config.getOrThrow('DATABASE_URL') } },
      // Emitting as events (rather than 'stdout') lets you route query logs
      // into your real logger with correlation ids attached.
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    // ‼️ Connecting eagerly means a bad DATABASE_URL fails the health check at
    // boot instead of surfacing on the first user request. Prisma would connect
    // lazily otherwise.
    await this.$connect();

    this.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > 500) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }

  async onModuleDestroy() {
    // Closes the connection pool so the process can exit and Postgres does not
    // hold orphaned connections open until its own timeout.
    await this.$disconnect();
  }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

```typescript
// ── Querying ──────────────────────────────────────────────────────────────
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: ListUsersDto) {
    // ‼️ $transaction with an ARRAY runs both queries in one round trip inside
    // one transaction, so the count and the page are consistent with each other.
    // Two separate awaits can return a count that does not match the page if a
    // row is inserted between them.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        // `select` beats `include`: include returns every scalar column of the
        // relation, select returns exactly what you asked for.
        select: {
          id: true,
          email: true,
          // Nested select solves N+1 — Prisma issues one extra query per
          // relation level (not per row), then stitches the results.
          posts: { select: { id: true, title: true }, take: 5 },
          _count: { select: { posts: true } }, // aggregate without loading rows
        },
        where: {
          // undefined is IGNORED by Prisma, so optional filters compose
          // cleanly with no conditional query building.
          email: params.search ? { contains: params.search, mode: 'insensitive' } : undefined,
          deletedAt: null,
        },
        orderBy: { [params.sortBy]: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }

  async create(dto: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data: { email: dto.email, passwordHash: await hash(dto.password) },
      });
    } catch (e) {
      // ‼️ Catch the unique-constraint violation instead of pre-checking with a
      // findUnique. The pre-check is a TOCTOU race under concurrency: two
      // requests both find nothing, both insert, one crashes with a 500. Let
      // the database be the arbiter and translate its error.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }
}
```

```text
‼️ Prisma error codes worth memorising:
   P2002 — unique constraint violation      → 409 Conflict
   P2003 — foreign key constraint violation → 400 / 422
   P2025 — record not found (update/delete) → 404
   P1001 — cannot reach database server     → 503
```

```typescript
// ── Typed results without hand-written interfaces ─────────────────────────
// Prisma generates the exact return type of a query shape, so your DTOs stay
// in sync with the schema automatically.
const userWithPosts = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { posts: true },
});
export type UserWithPosts = Prisma.UserGetPayload<typeof userWithPosts>;
```

---

## 18. Persistence — Mongoose

```typescript
@Schema({
  timestamps: true,    // adds createdAt / updatedAt
  collection: 'users',
  toJSON: {
    virtuals: true,
    // ‼️ Strip Mongo internals and the password on the way out, centrally.
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret._id; delete ret.__v; delete ret.passwordHash;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  // A reference to another document — the Mongo equivalent of a foreign key,
  // except nothing enforces referential integrity, so orphans are your problem.
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Post' }] })
  posts: Post[];

  @Prop({ type: Object }) metadata: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);
// Compound index defined next to the schema it serves.
UserSchema.index({ email: 1, createdAt: -1 });

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  findAll() {
    return this.model
      .find()
      // populate is Mongo's join. ‼️ It is a SECOND query per populate call,
      // executed client-side by Mongoose — the N+1 risk here is even higher
      // than in SQL because there is no real join to fall back on. For hot
      // paths use an aggregation $lookup, or denormalise.
      .populate('posts', 'title createdAt')
      // .lean() returns plain objects instead of hydrated Mongoose documents:
      // significantly faster and less memory, but no .save() and no virtuals.
      // Use it for every read-only query.
      .lean()
      .limit(20)
      .exec();
  }
}
```

---

## 19. Transactions & The Unit of Work Problem

### TypeORM transactions

```typescript
@Injectable()
export class TransferService {
  constructor(private readonly dataSource: DataSource) {}

  // ‼️ The callback form is the safe default: it commits on return and rolls
  // back on throw, and it cannot leak a connection.
  async transfer(fromId: string, toId: string, amount: number) {
    return this.dataSource.transaction(async (manager) => {
      // ‼️ EVERY query in the transaction must go through `manager`. Using the
      // injected repository instead silently runs OUTSIDE the transaction on a
      // different connection — the classic bug: the debit rolls back, the
      // credit does not, and money is created.
      const from = await manager.findOne(Account, {
        where: { id: fromId },
        // Pessimistic write lock: SELECT ... FOR UPDATE. Without it, two
        // concurrent transfers both read balance=100, both write 50, and one
        // withdrawal vanishes (lost update).
        lock: { mode: 'pessimistic_write' },
      });

      if (!from || from.balance < amount) {
        // Throwing rolls the whole transaction back automatically.
        throw new InsufficientFundsException(amount, from?.balance ?? 0);
      }

      await manager.decrement(Account, { id: fromId }, 'balance', amount);
      await manager.increment(Account, { id: toId }, 'balance', amount);

      // ‼️ Deadlock note: two concurrent transfers in opposite directions can
      // lock the same two rows in opposite order and deadlock. Fix by always
      // locking in a deterministic order (e.g. sorted by id).
    });
  }

  // Manual form — needed when the lifecycle spans more than one function.
  async manual() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE'); // isolation level

    try {
      await queryRunner.manager.save(entity);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      // ‼️ MUST release, in a finally, always. A forgotten release leaks a
      // pooled connection; enough of them and the pool is exhausted and every
      // request hangs waiting for a connection that will never come back.
      await queryRunner.release();
    }
  }
}
```

### Optimistic locking

```typescript
@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() content: string;

  // TypeORM adds `WHERE version = :expected` to updates and increments it.
  // If another writer got there first the row count is 0 and TypeORM throws
  // OptimisticLockVersionMismatchError.
  @VersionColumn() version: number;
}

async update(id: string, dto: UpdateDocumentDto, expectedVersion: number) {
  try {
    // ‼️ Optimistic locking suits low-contention, user-facing edits: no locks
    // are held while a human thinks, and the conflict is surfaced as a 409 the
    // UI can resolve ("this document changed, reload?"). Pessimistic locking
    // suits short, high-contention machine writes like the balance above.
    await this.repo.update({ id, version: expectedVersion }, dto);
  } catch (e) {
    if (e instanceof OptimisticLockVersionMismatchError) {
      throw new ConflictException('Document was modified by someone else');
    }
    throw e;
  }
}
```

### Transactions across a service boundary

```typescript
// ‼️ THE structural problem: OrdersService.create() needs to write orders,
// inventory, and an audit row in ONE transaction, but each lives behind its own
// service. Passing an EntityManager through every method signature pollutes the
// domain API with persistence details.

// Solution: AsyncLocalStorage-backed transaction context. Each repository looks
// for an ambient transaction and joins it if present.
@Injectable()
export class TransactionContext {
  private readonly als = new AsyncLocalStorage<EntityManager>();

  constructor(private readonly dataSource: DataSource) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    // Reuse the outer transaction if we are already inside one — this makes
    // nested run() calls safe, which matters when a service that manages its
    // own transaction is called from another that also does.
    const existing = this.als.getStore();
    if (existing) return fn();

    return this.dataSource.transaction((manager) => this.als.run(manager, fn));
  }

  // Repositories call this instead of using the injected repository directly.
  getManager(): EntityManager {
    return this.als.getStore() ?? this.dataSource.manager;
  }
}

// An interceptor makes it declarative — see §13 for how to compose it into a
// single @Transactional() decorator.
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly ctx: TransactionContext) {}

  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    // from() converts the promise back into the Observable the pipeline expects.
    return from(this.ctx.run(() => firstValueFrom(next.handle())));
  }
}

// ‼️ Interview-grade caveat: this pattern makes the transaction boundary
// invisible at the call site, and a long HTTP handler wrapped in a transaction
// holds a database connection for its entire duration — including any external
// API call inside it. Never make a network call inside a transaction. Keep
// transactions short and around writes only.
```

---

## 20. CQRS & Event Sourcing

```text
‼️ CQRS = Command Query Responsibility Segregation.
   Writes (commands) and reads (queries) go through separate models.

   WHEN IT PAYS OFF:
     - Read and write shapes genuinely diverge (write a normalised order;
       read a denormalised dashboard joining six tables).
     - Read and write load scale differently (100:1 read:write).
     - Complex business workflows with many side effects per write.
     - You want an audit trail of intent, not just final state.

   WHEN IT IS OVER-ENGINEERING (say this in the interview — it is the part
   most candidates miss):
     - CRUD apps. You have replaced `usersService.create(dto)` with a command,
       a handler, a bus, and an event — four files to do one insert.
     - Small teams. The indirection costs more in navigation than it saves.

   ‼️ CQRS does NOT require event sourcing, and does NOT require two databases.
   The minimum viable version is just "commands and queries are different
   objects handled by different classes" against one database.
```

```typescript
// ── Command (an intent to change state; returns little or nothing) ────────
export class CreateOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly items: OrderItem[],
    // The idempotency key lets a retried request be recognised as a duplicate
    // rather than creating a second order — essential for any payment flow
    // where the client may retry after a timeout.
    public readonly idempotencyKey: string,
  ) {}
}

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    private readonly repo: OrderRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateOrderCommand): Promise<{ id: string }> {
    const existing = await this.repo.findByIdempotencyKey(command.idempotencyKey);
    if (existing) return { id: existing.id }; // safe replay

    // mergeObjectContext attaches the event-publishing machinery to the
    // aggregate, so the aggregate can record domain events internally and
    // they are dispatched only when commit() is called.
    const order = this.publisher.mergeObjectContext(
      Order.create(command.userId, command.items),
    );

    await this.repo.save(order);

    // ‼️ commit() dispatches the events the aggregate recorded. Doing it AFTER
    // the save means subscribers never see an event for a write that failed.
    // (Full correctness under crashes needs the transactional outbox pattern:
    // write the events to an outbox table in the SAME transaction as the
    // order, and have a relay publish them. Otherwise a crash between the
    // commit and the publish loses the event.)
    order.commit();

    return { id: order.id };
  }
}

// ── Query (read-only; can bypass the domain model entirely) ───────────────
export class GetOrderSummaryQuery {
  constructor(public readonly orderId: string) {}
}

@QueryHandler(GetOrderSummaryQuery)
export class GetOrderSummaryHandler implements IQueryHandler<GetOrderSummaryQuery> {
  constructor(private readonly db: PrismaService) {}

  execute(query: GetOrderSummaryQuery) {
    // ‼️ Query handlers are allowed to hit a read replica, a materialised view,
    // Elasticsearch, or raw SQL. Not loading the aggregate for a read is the
    // whole point of the separation.
    return this.db.$queryRaw`
      SELECT o.id, o.total, u.email, COUNT(i.id) AS item_count
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items i ON i.order_id = o.id
      WHERE o.id = ${query.orderId}
      GROUP BY o.id, u.email
    `;
  }
}

// ── Event handler (reacts to something that already happened) ─────────────
@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  async handle(event: OrderCreatedEvent) {
    // ‼️ The in-process EventBus is synchronous and NOT durable — if the
    // process dies here, the email is simply never sent, and a throw here can
    // surface as a failure of the original request. For anything that must
    // happen, publish to a real queue (§22) and handle it in a worker.
    await this.mailer.sendOrderConfirmation(event.orderId);
  }
}

// ── Saga (long-running process manager: event in → command out) ───────────
@Injectable()
export class OrderSaga {
  @Saga()
  // A saga is an RxJS stream over the event bus, so you get the full operator
  // set: debounce, buffer, combine multiple event types, time windows.
  orderCreated = (events$: Observable<any>): Observable<ICommand> =>
    events$.pipe(
      ofType(OrderCreatedEvent),
      // delay models "reserve stock 5s after the order, unless cancelled".
      delay(5000),
      map((event) => new ReserveInventoryCommand(event.orderId)),
    );
}

@Module({ imports: [CqrsModule] })
export class OrdersModule {}
```

```typescript
// ── The aggregate ─────────────────────────────────────────────────────────
export class Order extends AggregateRoot {
  private constructor(
    public readonly id: string,
    private status: OrderStatus,
  ) {
    super();
  }

  static create(userId: string, items: OrderItem[]): Order {
    // ‼️ Invariants live in the aggregate, not in the service. This is what
    // makes the domain model worth having: there is exactly one place that can
    // create an invalid order, and it refuses to.
    if (items.length === 0) throw new BadRequestException('Order requires items');

    const order = new Order(randomUUID(), OrderStatus.Pending);
    // apply() records the event internally; nothing is published until commit().
    order.apply(new OrderCreatedEvent(order.id, userId, items));
    return order;
  }

  cancel(reason: string) {
    // State transitions are guarded by the current state — an illegal
    // transition is impossible to express rather than merely discouraged.
    if (this.status === OrderStatus.Shipped) {
      throw new ConflictException('Cannot cancel a shipped order');
    }
    this.status = OrderStatus.Cancelled;
    this.apply(new OrderCancelledEvent(this.id, reason));
  }
}
```

---

## 21. Microservices & Transports

### Transport comparison

```text
‼️ Nest's microservice layer is a thin abstraction over transports. The API is
   the same; the delivery guarantees are NOT. This table is the interview answer.

  TCP        Built in, zero infra. Point-to-point only, no persistence, no
             retries, no service discovery. Fine for a demo; almost never the
             right production choice.

  REDIS      Pub/Sub. Very low latency, trivial to run. ‼️ FIRE AND FORGET —
             a subscriber that is down when the message is published never
             sees it. Use Redis Streams (not Pub/Sub) if you need persistence.

  NATS       Lightweight, fast, supports request/reply natively and queue
             groups for load balancing. JetStream adds persistence.

  RABBITMQ   Real message broker: durable queues, acks, dead-letter exchanges,
             per-message routing. The default choice for task distribution
             where each message must be processed exactly once by one worker.

  KAFKA      Distributed log. Messages are RETAINED and REPLAYABLE, ordered
             within a partition, consumed by independent consumer groups at
             their own offsets. The choice for event streaming, audit trails,
             and fan-out to many consumers. ‼️ Not a task queue — there is no
             per-message ack/retry; you commit offsets.

  gRPC       Contract-first RPC over HTTP/2 with protobuf. Strong typing across
             languages, streaming in both directions, small payloads. The choice
             for internal service-to-service calls where latency matters.

  MQTT       IoT/device messaging; QoS levels, tiny footprint.
```

### Message vs event patterns

```typescript
@Controller()
export class OrdersMicroservice {
  // ‼️ @MessagePattern = REQUEST/RESPONSE. The caller waits for a reply.
  // Under the hood the transport creates a reply channel and correlates the
  // response by id. The caller is COUPLED to this service being up.
  @MessagePattern({ cmd: 'get_order' })
  getOrder(@Payload() data: { id: string }, @Ctx() context: RmqContext) {
    return this.ordersService.findOne(data.id);
  }

  // ‼️ @EventPattern = FIRE AND FORGET. No reply channel, the caller does not
  // wait, and the return value is discarded. This is what you want for domain
  // events — the publisher must not care who is listening.
  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: OrderCreatedEvent, @Ctx() ctx: RmqContext) {
    await this.inventory.reserve(data.orderId);

    // ‼️ MANUAL ACK. With noAck: false, the message stays on the queue until
    // you ack it, so a crash mid-processing redelivers rather than loses it.
    // Ack AFTER the work succeeds — acking first converts a crash into silent
    // data loss.
    const channel = ctx.getChannelRef();
    channel.ack(ctx.getMessage());
  }

  // ‼️ Every handler must be IDEMPOTENT. All of these transports are
  // at-least-once: a redelivery after a timeout, a consumer rebalance, or a
  // network blip WILL happen. Guard with a processed-message table keyed by
  // message id, or make the operation naturally idempotent (upsert, not insert).
}
```

### Bootstrapping microservices

```typescript
// ── A pure microservice (no HTTP) ─────────────────────────────────────────
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
    queue: 'orders_queue',
    queueOptions: { durable: true }, // survives a broker restart
    noAck: false,                    // manual ack (see above)
    // ‼️ Without prefetchCount, RabbitMQ pushes the whole queue at one consumer
    // and the others sit idle. prefetchCount:1 gives fair round-robin dispatch;
    // higher values trade fairness for throughput.
    prefetchCount: 1,
  },
});
await app.listen();

// ── A HYBRID app: HTTP + microservice in one process ──────────────────────
// The common real-world shape — an API that also consumes a queue.
const app = await NestFactory.create(AppModule);
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.KAFKA,
  options: {
    client: { brokers: [process.env.KAFKA_BROKER] },
    // ‼️ The consumer GROUP ID determines load balancing and offset tracking.
    // Two instances with the SAME group id split the partitions between them;
    // with DIFFERENT ids they each receive every message. Getting this wrong
    // means either duplicate processing or idle consumers.
    consumer: { groupId: 'orders-consumer' },
  },
});
await app.startAllMicroservices(); // must come BEFORE listen()
await app.listen(3000);
```

### Calling another service

```typescript
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'INVENTORY_SERVICE', // the injection token
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: { urls: [config.getOrThrow('RABBITMQ_URL')], queue: 'inventory_queue' },
        }),
      },
    ]),
  ],
})
export class OrdersModule {}

@Injectable()
export class OrdersService implements OnApplicationBootstrap {
  constructor(@Inject('INVENTORY_SERVICE') private readonly client: ClientProxy) {}

  async onApplicationBootstrap() {
    // ‼️ Connect eagerly. Otherwise the FIRST request pays the connection
    // handshake, and connection failures surface as a user-facing error
    // instead of a startup failure your deploy can catch.
    await this.client.connect();
  }

  async reserve(orderId: string) {
    // send() → request/response, returns a COLD Observable. Nothing is sent
    // until something subscribes, which is why you must await/subscribe it.
    return firstValueFrom(
      this.client.send({ cmd: 'reserve' }, { orderId }).pipe(
        // ‼️ Always bound a cross-service call. Without a timeout, one slow
        // downstream service exhausts this service's connections and the
        // failure cascades — the classic distributed-systems outage shape.
        timeout(3000),
        catchError((err) =>
          throwError(() => new ServiceUnavailableException('Inventory unavailable')),
        ),
      ),
    );
  }

  notify(orderId: string) {
    // emit() → fire and forget. Returns immediately; no reply channel.
    this.client.emit('order.created', { orderId });
  }
}
```

### gRPC

```protobuf
// proto/orders.proto — the contract, shared between services and languages.
syntax = "proto3";
package orders;

service OrdersService {
  rpc FindOne (OrderById) returns (Order) {}
  rpc FindMany (stream OrderById) returns (stream Order) {} // bidirectional stream
}

message OrderById { string id = 1; }
message Order { string id = 1; string status = 2; double total = 3; }
```

```typescript
@Controller()
export class OrdersGrpcController {
  // The strings must match the proto service and method names exactly.
  @GrpcMethod('OrdersService', 'FindOne')
  findOne(data: { id: string }, metadata: Metadata): Order {
    return this.ordersService.findOne(data.id);
  }

  // Streaming: return an Observable and each emission is a message on the wire.
  @GrpcStreamMethod('OrdersService', 'FindMany')
  findMany(data$: Observable<{ id: string }>): Observable<Order> {
    return data$.pipe(mergeMap((req) => from(this.ordersService.findOne(req.id))));
  }
}
```

### Resilience patterns

```typescript
// ‼️ A circuit breaker stops a failing dependency from consuming this service's
// resources. Without one, every request queues behind a dead downstream until
// the thread pool / connection pool is exhausted and THIS service dies too —
// a cascading failure.
@Injectable()
export class ResilientInventoryClient {
  private failures = 0;
  private openedAt = 0;
  private readonly threshold = 5;
  private readonly resetMs = 30_000;

  async reserve(orderId: string) {
    // OPEN: fail fast without even attempting the call.
    if (this.isOpen()) {
      throw new ServiceUnavailableException('Inventory circuit open');
    }
    try {
      const result = await firstValueFrom(
        this.client.send({ cmd: 'reserve' }, { orderId }).pipe(timeout(2000)),
      );
      // HALF-OPEN → CLOSED: a success resets the breaker.
      this.failures = 0;
      return result;
    } catch (err) {
      if (++this.failures >= this.threshold) this.openedAt = Date.now();
      throw err;
    }
  }

  private isOpen() {
    if (this.failures < this.threshold) return false;
    // After the reset window, allow ONE trial request through (half-open).
    if (Date.now() - this.openedAt > this.resetMs) {
      this.failures = this.threshold - 1;
      return false;
    }
    return true;
  }
}
// In production use a library (opossum) rather than hand-rolling: it handles
// half-open concurrency limits, rolling windows, and metrics.
```

---

## 22. Queues, Jobs & Scheduling

### BullMQ

```typescript
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow('REDIS_URL') },
        defaultJobOptions: {
          attempts: 3,
          // Exponential backoff: 2s, 4s, 8s. Gives a flapping dependency time
          // to recover instead of hammering it three times in a row.
          backoff: { type: 'exponential', delay: 2000 },
          // ‼️ Without these, completed and failed jobs accumulate in Redis
          // forever and eventually exhaust its memory. This is a real
          // production incident, not a theoretical one.
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86_400 },
        },
      }),
    }),
    BullModule.registerQueue({ name: 'emails' }),
  ],
})
export class JobsModule {}

// ── Producer ──────────────────────────────────────────────────────────────
@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue('emails') private readonly queue: Queue) {}

  async sendWelcome(userId: string) {
    await this.queue.add(
      'welcome',
      { userId },
      {
        // ‼️ A deterministic jobId makes enqueueing idempotent: BullMQ refuses
        // a duplicate id, so a retried HTTP request cannot send two emails.
        jobId: `welcome:${userId}`,
        delay: 60_000,        // send one minute after signup
        priority: 1,          // lower number = higher priority
      },
    );
  }

  async scheduleDigest() {
    await this.queue.add('digest', {}, {
      // A repeatable job — BullMQ's cron. Survives restarts because the
      // schedule lives in Redis, not in process memory.
      repeat: { pattern: '0 9 * * *', tz: 'America/New_York' },
    });
  }
}

// ── Consumer ──────────────────────────────────────────────────────────────
@Processor('emails', {
  // ‼️ Concurrency is PER WORKER PROCESS. Four replicas at concurrency 5 means
  // 20 jobs in flight — size this against the downstream rate limit, not
  // against what one machine can handle.
  concurrency: 5,
  limiter: { max: 100, duration: 60_000 }, // 100 jobs/minute across this worker
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailer: MailerService) { super(); }

  // In BullMQ (@nestjs/bullmq), one process() handles all job names for the
  // queue and dispatches on job.name — unlike legacy Bull's @Process('name').
  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'welcome':
        // Reporting progress lets a dashboard show long jobs advancing, and
        // BullMQ uses recent activity to distinguish stalled from slow.
        await job.updateProgress(10);
        await this.mailer.sendWelcome(job.data.userId);
        await job.updateProgress(100);
        break;
      default:
        // ‼️ Throwing marks the job failed and triggers the retry policy.
        // Swallowing the error marks it COMPLETE and loses the work silently.
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  // Lifecycle events for metrics and alerting.
  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    // attemptsMade === opts.attempts means retries are exhausted: this job is
    // dead and needs a human. Alert here, not on every individual failure.
    if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
      this.logger.error(`Job ${job.id} dead-lettered: ${err.message}`, err.stack);
    }
  }
}
```

```text
‼️ Queue design rules worth stating in an interview:

  1. Jobs must be IDEMPOTENT. Retries and at-least-once delivery guarantee that
     some job runs twice. Charging a card in a job without an idempotency key
     is how customers get double-billed.
  2. Store IDs in the payload, not whole objects. The object may be stale by
     the time the job runs, and large payloads bloat Redis.
  3. Set a timeout on every job. A job that hangs holds a worker slot forever.
  4. Separate queues by priority/latency class. One slow bulk-export job in the
     same queue as password-reset emails delays the emails.
  5. Monitor QUEUE DEPTH and OLDEST JOB AGE, not just error rates — a queue
     silently growing is the earliest signal that workers cannot keep up.
```

### Scheduled tasks

```typescript
@Injectable()
export class TasksService {
  // Declarative cron. Runs in-process, so it only fires while the app is up.
  @Cron('0 2 * * *', { name: 'nightly-cleanup', timeZone: 'UTC' })
  async cleanup() {
    // ‼️ THE multi-replica trap: @Cron runs in EVERY replica. Three pods means
    // the job runs three times, concurrently. Guard it with a distributed lock
    // (Redis SET NX PX), a leader election, or move the schedule to a BullMQ
    // repeatable job (which Redis coordinates for you).
    const lock = await this.redis.set('lock:cleanup', '1', 'NX', 'PX', 300_000);
    if (!lock) return; // another replica already has it

    await this.repo.deleteExpiredSessions();
  }

  @Interval(30_000)              // every 30s from app start
  heartbeat() {}

  @Timeout(5000)                 // once, 5s after app start
  warmCache() {}

  // Programmatic control, e.g. to disable a job via a feature flag at runtime.
  constructor(private readonly registry: SchedulerRegistry) {}

  pauseCleanup() {
    this.registry.getCronJob('nightly-cleanup').stop();
  }
}
```

### In-process events

```typescript
// EventEmitter2 — decoupling WITHIN one process. Use it to avoid circular
// dependencies between modules, not as a substitute for a real queue.
@Injectable()
export class UsersService {
  constructor(private readonly events: EventEmitter2) {}

  async create(dto: CreateUserDto) {
    const user = await this.repo.save(dto);
    // ‼️ emit() is SYNCHRONOUS and in-memory: a listener that throws can
    // propagate into this call, and nothing survives a process restart.
    // emitAsync() awaits all listeners, which is usually worse here — it makes
    // the HTTP response wait on the side effects.
    this.events.emit('user.created', new UserCreatedEvent(user.id));
    return user;
  }
}

@Injectable()
export class WelcomeEmailListener {
  @OnEvent('user.created', {
    // async: true runs the listener without blocking the emitter.
    async: true,
    // ‼️ suppressErrors (the default) means a throw here is swallowed. Set it
    // false and add your own try/catch + logging, or failures are invisible.
    suppressErrors: false,
  })
  async handle(event: UserCreatedEvent) {
    // The durable version: enqueue rather than send inline, so the email
    // survives a crash and gets retries.
    await this.emailQueue.sendWelcome(event.userId);
  }
}
```

---

## 23. WebSockets & Gateways

```typescript
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.CORS_ORIGINS?.split(',') },
  // ‼️ In a multi-instance deployment, sockets on instance A cannot reach
  // sockets on instance B without a shared adapter. The Redis adapter
  // broadcasts across instances via pub/sub — without it, users connected to
  // different pods simply do not see each other's messages, and it works
  // perfectly in local development, so it ships broken.
  transports: ['websocket'],
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;

  constructor(private readonly jwt: JwtService) {}

  afterInit(server: Server) {
    // ‼️ Authenticate at the HANDSHAKE, not per message. A socket that is not
    // authenticated should never be allowed to connect at all.
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        socket.data.user = await this.jwt.verifyAsync(token);
        next();
      } catch {
        // Rejecting here closes the connection before any handler can run.
        next(new Error('Unauthorized'));
      }
    });
  }

  async handleConnection(client: Socket) {
    // A per-user room makes targeted server→client pushes trivial, and works
    // across instances via the Redis adapter.
    client.join(`user:${client.data.user.sub}`);
  }

  handleDisconnect(client: Socket) {
    // ‼️ Clean up any per-socket state here — presence entries, subscriptions,
    // timers. Leaking them is the standard cause of a gateway whose memory
    // grows all day and gets OOM-killed every night.
  }

  @SubscribeMessage('message')
  // Pipes, guards, and interceptors work here too, but ValidationPipe must be
  // applied explicitly — the global HTTP pipe does not cover WS payloads
  // unless registered via APP_PIPE.
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async onMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<WsResponse<{ id: string }>> {
    // ‼️ Re-check authorization per message. Room membership at connect time
    // does not prove the user still has access — they may have been removed
    // from the conversation since.
    await this.assertMember(client.data.user.sub, dto.roomId);

    const saved = await this.messages.create(dto, client.data.user.sub);

    // .to(room) excludes nobody; client.to(room) excludes the sender.
    this.server.to(`room:${dto.roomId}`).emit('message', saved);

    // Returning a WsResponse sends an ack back to just this client.
    return { event: 'message:ack', data: { id: saved.id } };
  }
}

// Redis adapter for horizontal scaling — register in main.ts BEFORE listen().
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(url: string): Promise<void> {
    const pubClient = createClient({ url });
    // Two connections are required: a Redis client in subscribe mode cannot
    // issue publish commands, so pub and sub need separate connections.
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
```

```text
‼️ WebSockets vs SSE vs polling — the design-question answer:

  WebSocket  Bidirectional, low latency, stateful. Cost: sticky sessions or a
             shared adapter, connection state to manage, harder to scale, and
             proxies/corporate firewalls sometimes block it.
             Use when the CLIENT must push too: chat, collaborative editing,
             multiplayer, live cursors.

  SSE        Server→client only, over plain HTTP/1.1 or HTTP/2. Auto-reconnect
             is built into EventSource, works through every proxy, and needs no
             special infrastructure.
             ‼️ Under HTTP/1.1 browsers cap ~6 connections per domain, and SSE
             holds one open. Use when you only push DOWN: notifications, job
             progress, live dashboards, streaming LLM tokens.

  POLLING    Simplest, statelessly scalable, works everywhere. Wasteful, and
             latency is bounded by the interval. Perfectly fine when updates
             are infrequent and a few seconds of staleness is acceptable.
```

```typescript
// SSE in Nest — one decorator, no extra infrastructure.
@Sse('notifications')
notifications(@CurrentUser('id') userId: string): Observable<MessageEvent> {
  return this.notificationsService.streamFor(userId).pipe(
    map((n) => ({ data: n, id: n.id, type: 'notification' })),
    // A periodic comment/heartbeat keeps proxies from closing an idle
    // connection after their read timeout (often 60s).
  );
}
```

---

## 24. GraphQL in Nest

```typescript
// ‼️ Code-first (recommended in Nest): TypeScript classes are the source of
// truth and the SDL is GENERATED from them. No drift between schema and code,
// and the resolver signatures are typed automatically.
// Schema-first is the inverse — write SDL, generate types. Prefer it only when
// a non-TS team owns the schema.
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true, // deterministic output, so schema diffs are readable

      // ‼️ Turn off introspection and the playground in production: they let
      // anyone enumerate your entire API surface, including admin mutations.
      introspection: process.env.NODE_ENV !== 'production',
      playground: false,

      // The context is per-request and is where DataLoaders must live (below).
      context: ({ req, res }) => ({ req, res, loaders: createLoaders() }),

      formatError: (error) => {
        // Do not leak stack traces or internal messages to GraphQL clients.
        if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          return { message: 'Internal server error', extensions: { code: 'INTERNAL' } };
        }
        return error;
      },
    }),
  ],
})
export class AppModule {}
```

```typescript
@ObjectType()
export class User {
  @Field(() => ID) id: string;
  @Field() email: string;
  // Simply omitting @Field() keeps a property out of the schema entirely —
  // the GraphQL equivalent of @Exclude().
  passwordHash: string;
  @Field(() => [Post]) posts: Post[];
}

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly postsLoader: PostsLoader,
  ) {}

  @Query(() => [User])
  @UseGuards(GqlAuthGuard)
  users(@Args() args: ListUsersArgs) {
    return this.usersService.findAll(args);
  }

  // ‼️ A @ResolveField is called ONCE PER PARENT OBJECT. Query 100 users with
  // their posts and this runs 100 times — the GraphQL N+1 problem, and it is
  // worse than the REST version because the client controls the query shape,
  // so you cannot predict which fields will be requested.
  @ResolveField(() => [Post])
  posts(@Parent() user: User) {
    // DataLoader batches all calls made within one tick of the event loop into
    // a single query, and caches by key for the request's lifetime.
    return this.postsLoader.byUserId.load(user.id);
  }

  @Mutation(() => User)
  createUser(@Args('input') input: CreateUserInput) {
    return this.usersService.create(input);
  }
}
```

```typescript
// ── DataLoader ────────────────────────────────────────────────────────────
@Injectable({ scope: Scope.REQUEST }) // ‼️ MUST be request-scoped
export class PostsLoader {
  constructor(private readonly prisma: PrismaService) {}

  readonly byUserId = new DataLoader<string, Post[]>(async (userIds) => {
    // One query for all the ids collected during this tick.
    const posts = await this.prisma.post.findMany({
      where: { authorId: { in: [...userIds] } },
    });

    const grouped = new Map<string, Post[]>();
    for (const post of posts) {
      grouped.set(post.authorId, [...(grouped.get(post.authorId) ?? []), post]);
    }

    // ‼️ The returned array MUST be the same length and ORDER as the input
    // keys — DataLoader matches results to keys positionally. Returning the
    // raw query result (which is in database order, and omits users with no
    // posts) hands each user someone else's data.
    return userIds.map((id) => grouped.get(id) ?? []);
  });
}
// ‼️ A SINGLETON DataLoader would cache across requests and across users —
// serving one user's data to another, and never seeing updates. Request scope
// is what makes the cache correct.
```

```typescript
// GraphQL guards need their own ExecutionContext conversion, because the
// arguments array is (root, args, context, info), not (req, res, next).
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext().req;
  }
}
```

```text
‼️ Query depth and complexity limits are not optional in a public GraphQL API.
   A client can write { user { posts { author { posts { author { ... }}}}}} and
   generate a query that never terminates. Add graphql-depth-limit and a
   complexity plugin, and cap both — this is the #1 GraphQL security question.
```

---

## 25. Caching & Rate Limiting

```typescript
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [createKeyv(config.getOrThrow('REDIS_URL'))],
        ttl: 30_000, // milliseconds
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        // Layered limits: a short burst window plus a longer sustained window.
        // One limit alone either blocks legitimate bursts or permits sustained
        // abuse; two together allow normal usage and stop scripted hammering.
        { name: 'short', ttl: 1000, limit: 10 },
        { name: 'long', ttl: 60_000, limit: 100 },
      ],
      // ‼️ The in-memory default is PER PROCESS. With four replicas the real
      // limit is 4× what you configured, and it resets on every deploy. Use
      // the Redis storage adapter for a limit that actually holds.
      storage: new ThrottlerStorageRedisService(process.env.REDIS_URL),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

```typescript
@Controller('auth')
export class AuthController {
  // ‼️ Login needs a much tighter limit than the global default — this is the
  // control that turns credential stuffing from "feasible" into "impractical".
  // Rate-limit per IP AND per account: per-IP alone is defeated by a botnet,
  // per-account alone lets one IP spray many accounts.
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto) {}

  @SkipThrottle()  // exempt a route entirely (health checks, webhooks)
  @Get('status')
  status() {}
}
```

```typescript
// ── Cache-aside, written correctly ────────────────────────────────────────
@Injectable()
export class ProductsService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async findOne(id: string): Promise<Product> {
    const key = `product:${id}`;

    const cached = await this.cache.get<Product>(key);
    // ‼️ Check for undefined, not falsiness. `if (cached)` treats a legitimately
    // cached `0`, `''`, or `false` as a miss and re-queries every time.
    if (cached !== undefined) return cached;

    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException();

    // ‼️ Jitter the TTL. Identical TTLs make everything cached at the same
    // moment expire at the same moment — a cache stampede that dumps the full
    // read load onto the database at once.
    await this.cache.set(key, product, 300_000 + Math.random() * 60_000);
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const updated = await this.repo.save({ id, ...dto });

    // ‼️ INVALIDATE, do not update, the cache. Writing the new value into the
    // cache races with concurrent readers that may write a stale value after
    // you. Deletion is idempotent and always safe; the next read repopulates.
    await this.cache.del(`product:${id}`);
    // Remember every derived key too — list pages, search results, and any
    // aggregate that included this product. Forgetting these is the usual
    // cause of "the detail page updated but the list still shows the old name".
    await this.cache.del(`products:list`);

    return updated;
  }
}
```

```text
‼️ Caching strategies, and when each applies:

  CACHE-ASIDE (lazy)   App checks cache, misses, loads from DB, populates.
                       Default choice. Only caches what is actually requested.
  READ-THROUGH         The cache library loads on miss. Same effect, less code,
                       less control.
  WRITE-THROUGH        Write to cache and DB together. Cache is never stale;
                       every write pays the cache latency.
  WRITE-BEHIND         Write to cache, flush to DB asynchronously. Fast writes,
                       and you WILL lose data if the cache dies. Rarely worth it.
  REFRESH-AHEAD        Proactively refresh hot keys before expiry. Best tail
                       latency, most complexity.

  The three failure modes to name:
    STAMPEDE/DOGPILE  Many concurrent misses on the same key → all hit the DB.
                      Fix: a short lock per key, or serve stale while revalidating.
    PENETRATION       Repeated lookups for keys that do not exist bypass the
                      cache entirely. Fix: cache the negative result briefly.
    AVALANCHE         Mass simultaneous expiry. Fix: TTL jitter.
```

---

## 26. OpenAPI / Swagger

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Orders API')
  .setVersion('1.0')
  // The name ('bearer') is referenced by @ApiBearerAuth('bearer') on routes.
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
  .addServer('https://api.example.com', 'Production')
  .build();

const document = SwaggerModule.createDocument(app, config);

// ‼️ Do NOT expose Swagger UI publicly in production without auth. The schema
// is a complete map of your API — every route, parameter, and error shape —
// which is exactly what an attacker wants first.
if (process.env.NODE_ENV !== 'production') {
  SwaggerModule.setup('docs', app, document, {
    // Keeps the bearer token across page reloads while developing.
    swaggerOptions: { persistAuthorization: true },
  });
}
```

```typescript
@ApiTags('users')
@ApiBearerAuth('bearer')
@Controller('users')
export class UsersController {
  @Post()
  @ApiOperation({ summary: 'Create a user', operationId: 'createUser' })
  @ApiCreatedResponse({ type: UserDto })
  @ApiConflictResponse({ description: 'Email already registered' })
  create(@Body() dto: CreateUserDto) {}
}

export class CreateUserDto {
  // @ApiProperty feeds the schema. `example` is what shows in the UI's
  // "Try it out" body, so a realistic example makes the docs self-testing.
  @ApiProperty({ example: 'ada@example.com', format: 'email' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: Role, default: Role.User })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
```

```jsonc
// nest-cli.json — ‼️ the CLI plugin infers @ApiProperty from TypeScript types
// and class-validator decorators, so you stop writing @ApiProperty twice for
// every field. Big reduction in boilerplate and in doc drift.
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,     // derive constraints from validators
          "introspectComments": true,     // use JSDoc as descriptions
          "dtoFileNameSuffix": [".dto.ts", ".entity.ts"]
        }
      }
    ]
  }
}
```

---

## 27. Testing

### Unit tests

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    // Test.createTestingModule builds a REAL Nest container with only what you
    // list — so DI, custom providers, and module wiring are all exercised, but
    // nothing outside the unit under test is constructed.
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          // getRepositoryToken produces the same token @InjectRepository uses,
          // which is how you substitute a mock repository.
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  // ‼️ Reset between tests or call counts and queued return values leak across
  // them, producing tests that pass alone and fail in suite order.
  afterEach(() => jest.resetAllMocks());

  it('throws NotFoundException for a missing user', async () => {
    repo.findOneBy.mockResolvedValue(null);

    // Assert on the EXCEPTION TYPE, not the message: messages get reworded,
    // and the type is what determines the HTTP status the client sees.
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
```

### Overriding providers

```typescript
const module = await Test.createTestingModule({ imports: [AppModule] })
  // Replace a provider anywhere in the tree, however deeply nested.
  .overrideProvider(MailerService).useValue({ send: jest.fn() })

  // ‼️ Guards must be overridden to test protected routes without minting real
  // tokens. Returning a canActivate that stamps a user onto the request keeps
  // the handler code identical to production.
  .overrideGuard(JwtAuthGuard).useValue({
    canActivate: (ctx: ExecutionContext) => {
      ctx.switchToHttp().getRequest().user = { id: 'test-user', roles: ['admin'] };
      return true;
    },
  })

  .overrideInterceptor(CacheInterceptor).useValue({ intercept: (_, n) => n.handle() })
  .overrideFilter(AllExceptionsFilter).useClass(TestFilter)

  // Replace a whole module — e.g. swap the real database module for an
  // in-memory one — without touching application code.
  .overrideModule(DatabaseModule).useModule(TestDatabaseModule)
  .compile();
```

### E2E tests

```typescript
describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService).useValue({ send: jest.fn() })
      .compile();

    app = module.createNestApplication();

    // ‼️ Global pipes/filters/interceptors registered in main.ts do NOT apply
    // automatically here — createNestApplication does not run your bootstrap
    // function. Re-register them or your e2e tests exercise a DIFFERENT
    // pipeline than production, and validation bugs sail through.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    // init() runs onModuleInit/onApplicationBootstrap and readies the HTTP
    // server WITHOUT binding a port — supertest talks to the handle directly.
    await app.init();
  });

  // ‼️ Always close. A leaked app keeps DB pools and timers alive, and Jest
  // hangs with "did not exit one second after test run completed".
  afterAll(async () => await app.close());

  it('POST /users rejects an invalid email', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toEqual(
          expect.arrayContaining([expect.stringContaining('email')]),
        );
      });
  });
});
```

### Testcontainers

```typescript
// ‼️ The highest-value testing upgrade for a Nest backend. Mocking a repository
// tests your mock; a real Postgres in a container tests your actual SQL,
// migrations, constraints, and transaction behaviour — the layer where the bugs
// actually are. Startup is a few seconds and is amortised across the suite.
let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();

  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();

  // Run the real migrations — this also makes every test run a migration test.
  await app.get(DataSource).runMigrations();
}, 60_000); // generous timeout: pulling the image the first time is slow

afterAll(async () => {
  await app.close();
  await container.stop();
});

// Isolate tests from each other by truncating between them. Faster and more
// reliable than recreating the schema, and avoids order-dependent tests.
afterEach(async () => {
  const ds = app.get(DataSource);
  const tables = ds.entityMetadatas.map((e) => `"${e.tableName}"`).join(', ');
  await ds.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
});
```

---

## 28. Observability — Logging, Tracing, Health

```typescript
// ── Structured logging with Pino ──────────────────────────────────────────
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // ‼️ JSON in production so log aggregators (Datadog, CloudWatch, Loki)
        // can index fields; pretty-printed only for human eyes locally.
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
        level: process.env.LOG_LEVEL ?? 'info',

        // ‼️ REDACT SECRETS. Logging the full request headers is how bearer
        // tokens, cookies, and API keys end up permanently stored in a log
        // index that far more people can read than can read the database.
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
            '*.creditCard',
          ],
          censor: '[REDACTED]',
        },

        // Attach a correlation id to every log line of a request, so one
        // filter in the log tool reconstructs the whole request.
        genReqId: (req, res) => {
          const id = req.headers['x-correlation-id'] ?? randomUUID();
          res.setHeader('x-correlation-id', id);
          return id;
        },

        // Health checks at 1/sec would otherwise dominate the log volume.
        autoLogging: { ignore: (req) => req.url === '/health' },
      },
    }),
  ],
})
export class LoggingModule {}
```

```typescript
// ── OpenTelemetry ─────────────────────────────────────────────────────────
// tracing.ts — ‼️ MUST be imported BEFORE anything else in main.ts. OTel works
// by monkey-patching modules (http, pg, ioredis) as they are required; if your
// app requires them first, the patches never apply and you get empty traces.
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export const otelSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_ENDPOINT }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Filesystem spans are enormous in volume and almost never useful.
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'orders-api',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
});

// main.ts:  import './tracing'; then otelSDK.start(); then bootstrap();
```

```typescript
// ── Health checks ─────────────────────────────────────────────────────────
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  // ‼️ LIVENESS: "is the process wedged?" It must NOT check dependencies.
  // If liveness fails when the database is down, Kubernetes restarts every
  // pod — turning a database blip into a full outage with a crash-loop.
  @Get('live')
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  // ‼️ READINESS: "can I serve traffic right now?" This one DOES check
  // dependencies. Failing it removes the pod from the load balancer without
  // killing it, so it can rejoin when the dependency recovers.
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      () => this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
    ]);
  }
}
```

```typescript
// ── Prometheus metrics ────────────────────────────────────────────────────
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly histogram = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    // ‼️ Label with the ROUTE PATTERN (/users/:id), never the actual URL
    // (/users/abc-123). Using raw URLs creates one time series per id — a
    // cardinality explosion that will take down your metrics backend.
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  });

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const end = this.histogram.startTimer();
    return next.handle().pipe(
      // finalize runs on success AND error AND unsubscribe, so no request is
      // ever unmeasured. tap(next) alone would miss the error path.
      finalize(() =>
        end({
          method: req.method,
          route: req.route?.path ?? 'unknown',
          status: ctx.switchToHttp().getResponse().statusCode,
        }),
      ),
    );
  }
}
```

---

## 29. Security Hardening

```typescript
// ── Password hashing ──────────────────────────────────────────────────────
@Injectable()
export class PasswordService {
  // ‼️ argon2id is the current recommendation (memory-hard, resistant to GPU
  // and side-channel attacks). bcrypt is still acceptable at cost ≥ 12.
  // NEVER a plain hash (md5/sha1/sha256) — a GPU computes billions per second,
  // so an unsalted fast hash is functionally the same as storing plaintext.
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456, // 19 MiB — OWASP's minimum recommendation
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    // ‼️ argon2.verify is constant-time with respect to the hash comparison.
    // A naive `computed === stored` leaks information through timing.
    return argon2.verify(hash, password);
  }
}

// ── Login: avoid user enumeration and timing leaks ────────────────────────
async validate(email: string, password: string) {
  const user = await this.users.findByEmail(email);

  // ‼️ If we returned early when the user does not exist, the response would
  // come back measurably faster — letting an attacker enumerate valid accounts
  // by timing alone. Hashing a dummy value keeps the timing uniform.
  const hash = user?.passwordHash ?? DUMMY_ARGON2_HASH;
  const valid = await this.passwords.verify(hash, password);

  // ‼️ One generic message for both branches. "No such user" vs "wrong
  // password" hands an attacker a free account-enumeration oracle.
  if (!user || !valid) throw new UnauthorizedException('Invalid credentials');
  return user;
}
```

```typescript
// ── Refresh token rotation ────────────────────────────────────────────────
async refresh(userId: string, presentedToken: string) {
  const stored = await this.tokens.findByUserId(userId);

  // Compare the HASH — refresh tokens must be stored hashed, exactly like
  // passwords. A leaked database with plaintext refresh tokens is a full
  // account takeover for every user.
  if (!stored || !(await argon2.verify(stored.tokenHash, presentedToken))) {
    // ‼️ REUSE DETECTION: a valid-but-already-rotated token means someone is
    // replaying a stolen one. The correct response is to revoke the ENTIRE
    // token family, logging out both the attacker and the legitimate user, who
    // then re-authenticates. Silently issuing a new token lets the attacker
    // keep the session indefinitely.
    await this.tokens.revokeAllForUser(userId);
    throw new UnauthorizedException('Token reuse detected');
  }

  await this.tokens.revoke(stored.id);       // one-time use
  return this.issueTokenPair(userId);
}
```

```text
‼️ Nest security checklist — the interview version:

  INPUT      ValidationPipe with whitelist:true globally. Cap array sizes and
             string lengths. Allow-list any value used in ORDER BY or a raw query.
  AUTHZ      Check ownership per resource, not just roles (IDOR is the #1 real
             API vulnerability). Deny by default with a global guard + @Public().
  SECRETS    Never in git. Validate presence at boot. Rotate. Redact from logs.
  HEADERS    helmet(). Explicit CORS origins — never `origin: true` with
             credentials:true, which reflects any origin and defeats CORS entirely.
  UPLOADS    Cap size, validate MIME by MAGIC BYTES not the client-supplied
             Content-Type, store outside the webroot, never execute.
  SQL        Parameterised queries always, including inside a query builder.
  RATE LIMIT Tight on auth endpoints, per-IP AND per-account, backed by Redis.
  ERRORS     Never return stack traces. Map driver errors to generic messages.
  DEPS       npm audit / Snyk in CI. Pin versions. Nest itself patches promptly.
  JWT        Short access TTL (5–15m), rotate refresh tokens, verify the `alg`
             header (reject `none`), and keep a revocation list for logout —
             a stateless JWT cannot otherwise be invalidated before expiry.
```

---

## 30. Performance & Scaling

```text
‼️ Order the investigation this way; most teams skip straight to step 4 and
   optimise the wrong layer.

  1. MEASURE     p50/p95/p99 per route, plus a flame graph (clinic.js, 0x).
                 Averages hide the tail; the tail is what users complain about.
  2. DATABASE    Almost always the answer. Missing index, N+1, SELECT *,
                 unbounded query, connection pool exhaustion, or a lock.
                 EXPLAIN ANALYZE the slow query before touching Node.
  3. CACHE       Add caching only once you know what is hot and how stale it
                 may be. Caching a wrong query just serves wrong data faster.
  4. NODE        Blocking the event loop: sync crypto, JSON.parse on a huge
                 payload, a tight loop, sync fs. Move it to a worker thread.
  5. INFRA       Horizontal scaling, cluster mode, a Fastify adapter.
```

```typescript
// ── Do not block the event loop ───────────────────────────────────────────
@Injectable()
export class ReportService {
  // ‼️ Node runs your JS on ONE thread. A 2-second CPU-bound loop does not slow
  // down one request — it freezes EVERY concurrent request, including health
  // checks, which then fail and get the pod restarted mid-report.
  async generateBad(rows: Row[]) {
    return rows.map(expensiveTransform); // blocks for seconds
  }

  // Worker threads move CPU work off the main thread. Piscina manages a pool
  // so you are not paying ~30ms of worker startup per call.
  private pool = new Piscina({ filename: resolve(__dirname, 'report.worker.js') });

  async generateGood(rows: Row[]) {
    return this.pool.run(rows);
  }
}
```

```typescript
// ── Streaming large responses ─────────────────────────────────────────────
@Get('export')
async export(@Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
  res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=export.csv' });

  // ‼️ Building the full array first (`const all = await repo.find()`) loads
  // every row into memory at once — a million-row export is an OOM crash.
  // A cursor + stream keeps memory flat regardless of result size.
  const stream = await this.repo
    .createQueryBuilder('u')
    .stream();                       // node stream from the driver cursor

  return new StreamableFile(stream.pipe(new CsvTransform()));
}
```

```text
‼️ Scaling checklist:

  STATELESS       No in-memory sessions, no in-memory caches you rely on for
                  correctness, no local file uploads. Anything stateful goes to
                  Redis/S3/Postgres, or horizontal scaling breaks it.
  CLUSTER         Node uses one core. Run one process per core via the cluster
                  module, PM2, or (better) one container per core and let the
                  orchestrator schedule them — simpler failure semantics.
  POOL SIZING     total_connections = replicas × workers × pool_size must stay
                  under the database's max_connections. Add PgBouncer when it
                  does not fit.
  KEEP-ALIVE      ‼️ Set server.keepAliveTimeout ABOVE your load balancer's idle
                  timeout (ALB defaults to 60s). If Node closes first, the LB
                  sends a request onto a socket Node is closing → sporadic 502s
                  that are maddening to debug.
  COMPRESSION     Worth it for JSON over ~1KB; skip for already-compressed
                  payloads (images, gzip) where it only burns CPU.
  GRACEFUL        See §15 — readiness off, drain, then close.
```

---

## 31. Architecture at Scale

### Folder structure

```text
src/
├── main.ts
├── app.module.ts
├── common/                      ← shared, framework-facing, no domain logic
│   ├── decorators/              (@CurrentUser, @Public, @AdminOnly)
│   ├── filters/                 (AllExceptionsFilter)
│   ├── guards/                  (JwtAuthGuard, RolesGuard)
│   ├── interceptors/            (Transform, Timeout, Logging)
│   ├── pipes/
│   └── dto/                     (PaginationDto, base response shapes)
├── config/                      ← registerAs namespaces + the env schema
├── infrastructure/              ← adapters to the outside world
│   ├── database/                (PrismaService / DataSource, migrations)
│   ├── cache/  queue/  storage/
└── modules/                     ← one folder per bounded context
    ├── users/
    │   ├── users.module.ts
    │   ├── users.controller.ts  ← HTTP only: parse, delegate, serialise
    │   ├── users.service.ts     ← business rules; no HTTP, no SQL
    │   ├── users.repository.ts  ← persistence; no business rules
    │   ├── dto/                 ← input contracts (validated)
    │   ├── entities/
    │   └── users.service.spec.ts
    └── orders/

‼️ The rule that keeps this honest: dependencies point INWARD.
   controller → service → repository. A service that imports `Request` or
   throws NotFoundException is leaking HTTP into the domain; a controller that
   builds a query is leaking SQL upward. Both are the usual entry points to a
   codebase nobody wants to touch in year two.
```

### Layering discipline

```typescript
// ── Controller: thin. Translate HTTP ↔ domain, nothing else. ──────────────
@Controller('orders')
export class OrdersController {
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser('id') userId: string) {
    // No business logic here. If there is an `if` in a controller that is not
    // about HTTP, it belongs in the service.
    return this.ordersService.create(userId, dto);
  }
}

// ── Service: business rules. Framework-agnostic enough to unit test easily. ─
@Injectable()
export class OrdersService {
  async create(userId: string, dto: CreateOrderDto) {
    const items = await this.pricing.price(dto.items);
    if (Order.total(items) > MAX_ORDER_VALUE) {
      // ‼️ Pragmatic compromise most Nest codebases make: HttpException in the
      // service. Purists throw a domain error and map it in a filter. Either
      // is defensible — just be consistent, and prefer domain errors if the
      // same service is also called from a queue consumer or a CLI, where
      // HTTP status codes are meaningless.
      throw new BadRequestException('Order exceeds maximum value');
    }
    return this.repo.create(userId, items);
  }
}

// ── Repository: persistence only. Hides the ORM from the domain. ──────────
@Injectable()
export class OrderRepository {
  // The payoff: swapping TypeORM for Prisma, or adding a read replica, touches
  // this file only. Services that call `repo.findById` do not change.
  findById(id: string) {
    return this.prisma.order.findUnique({ where: { id }, include: { items: true } });
  }
}
```

### Monorepo mode

```bash
# Nest has first-class monorepo support built into the CLI.
nest generate app orders-api        # a second deployable application
nest generate app orders-worker
nest generate library shared        # shared code, path-mapped in tsconfig

# apps/orders-api/     apps/orders-worker/     libs/shared/
# Build one: nest build orders-api
# Run one:   nest start orders-worker --watch
```

```text
‼️ When to reach for a monorepo, and the honest trade-off:

  GOOD FOR   An API and its background worker that share entities, DTOs, and
             config. One version of the shared code, one PR for a cross-cutting
             change, no publishing dance.

  COSTS      A shared library becomes a coupling point — a change to `libs/shared`
             forces every app to be rebuilt, retested, and usually redeployed
             together. That is the opposite of what microservices are for.
             Build times grow. CI needs affected-project detection (Nx) to stay fast.

  RULE       Share TYPES and CONTRACTS freely. Share BUSINESS LOGIC reluctantly.
             The moment two apps must deploy in lockstep because of `libs/shared`,
             you have a distributed monolith — the worst of both models.
```

---

## 32. Common Pitfalls

```text
‼️ 1. "Nest can't resolve dependencies of X (?)."
   The `?` marks WHICH constructor argument failed — count the position.
   Causes, in order of likelihood:
     - The provider is not in the module's `providers` array.
     - The provider IS registered in another module but not EXPORTED there.
     - The module that exports it is not IMPORTED here.
     - A circular import → use forwardRef, then fix the design.
     - Missing @Injectable() → no design:paramtypes emitted.
     - You are injecting an INTERFACE (impossible — use a token).

‼️ 2. Global pipes/filters registered with `new` get no DI.
   app.useGlobalGuards(new MyGuard(someService)) forces you to construct
   dependencies by hand. Use { provide: APP_GUARD, useClass: MyGuard } instead.

‼️ 3. Global enhancers do not apply in e2e tests.
   createNestApplication() does not run your bootstrap(), so main.ts's
   useGlobalPipes never happens. Re-register them in the test setup or move
   them to APP_* providers, which DO get picked up.

‼️ 4. ClassSerializerInterceptor silently does nothing on plain objects.
   Return `new UserEntity(row)`, not `row`. @Exclude lives on the prototype.

‼️ 5. Request-scoped providers poison the chain.
   One @Injectable({ scope: Scope.REQUEST }) makes every consumer above it
   request-scoped. Use AsyncLocalStorage instead (§5).

‼️ 6. @Res() disables the whole response pipeline.
   Interceptors stop shaping the body and the request hangs if you forget to
   send. Use @Res({ passthrough: true }) unless you truly own the response.

‼️ 7. Route order: @Get(':id') before @Get('me') swallows /users/me.
   Static segments first, always.

‼️ 8. Guards run BEFORE pipes.
   request.body inside a guard is unvalidated, untransformed, attacker-controlled.

‼️ 9. Exception filters resolve most-specific-first — the reverse of guards and
   interceptors. A bare @Catch() at route level shadows everything else.

‼️ 10. `synchronize: true` in production will drop columns.
   Migrations only. And never `migrationsRun: true` with multiple replicas.

‼️ 11. @Cron runs in every replica.
   Three pods = three concurrent executions. Use a distributed lock or a
   BullMQ repeatable job.

‼️ 12. In-memory ThrottlerGuard and CacheModule are per-process.
   With N replicas your rate limit is silently N×. Back both with Redis.

‼️ 13. Socket.IO without the Redis adapter breaks across instances.
   Works flawlessly on localhost, fails in production — the worst failure mode.

‼️ 14. Forgetting await app.close() in tests leaks pools and hangs Jest.

‼️ 15. A missing enableShutdownHooks() means SIGTERM kills in-flight requests,
   producing 502s on every rolling deploy.

‼️ 16. Optional chaining on config: config.get('X') returns undefined for a
   missing var and the failure surfaces three layers deeper. getOrThrow().

‼️ 17. Circular imports also break at the FILE level, not just the module level.
   A barrel `index.ts` re-exporting everything is the usual culprit — it turns
   an innocent import into a cycle and yields `undefined` decorators at runtime.
```

---

## 33. Interview Questions

### "How does NestJS dependency injection actually work?"

```text
Three pieces:

1. METADATA. Decorators do not change behaviour; they call
   Reflect.defineMetadata to annotate the class. Separately, TypeScript's
   emitDecoratorMetadata writes 'design:paramtypes' — the constructor's
   parameter types — onto any decorated class.

2. THE CONTAINER. At bootstrap NestFactory walks the module graph, and for each
   provider reads design:paramtypes, resolves each token against that module's
   provider registry (then its imports' exports, then globals), and instantiates
   in topological order — dependencies before dependents.

3. TOKENS. The token is usually the class itself, but can be a string or symbol.
   That indirection is what lets you inject an interface: bind
   { provide: PAYMENT_GATEWAY, useClass: StripeGateway } and consumers depend
   only on the abstraction — dependency inversion, enforced by the container.

The three consequences worth volunteering: interfaces cannot be injected by
type (they do not exist at runtime); a class with no decorator gets no
paramtypes so injection fails; and circular imports yield undefined paramtypes,
which is what forwardRef defers around.
```

### "What is the request lifecycle order?"

```text
Middleware → Guards → Interceptors (pre) → Pipes → Handler →
Interceptors (post) → Exception filters → Response.

The details that show real experience:
  - Guards/interceptors/pipes bind global → controller → route.
  - Interceptors' POST half unwinds in REVERSE (route → controller → global).
  - Exception filters are most-specific-first — the opposite of the others.
  - Guards run before pipes, so a guard sees UNVALIDATED body data.
  - Middleware has no ExecutionContext, so it cannot read route metadata; any
    logic driven by a custom decorator must be a guard or interceptor.
```

### "Middleware vs guard vs interceptor vs pipe — when do you use each?"

```text
MIDDLEWARE   Raw req/res, handler-agnostic. Correlation ids, helmet, parsing.
GUARD        A boolean access decision, with route metadata available.
             AuthN/authZ. Returning false → 403.
INTERCEPTOR  Wraps the handler on both sides. Response envelopes, timing,
             caching, timeouts, retries, transactions, serialisation.
PIPE         Per-argument transform + validate. DTO validation, id parsing,
             coercion, and resolving an id into an entity.

The tell for a strong answer: "anything needing before AND after is an
interceptor; anything that is purely a yes/no is a guard."
```

### "How do you avoid N+1 queries?"

```text
Name it first: one query for the parents, then one per parent for the children.
100 rows → 101 round trips, each cheap, together ~100ms of pure latency.

Fixes by stack:
  TypeORM   `relations: { posts: true }` (a JOIN), or a QueryBuilder with
            leftJoinAndSelect. Watch the JOIN+LIMIT trap: take/skip is
            entity-aware, limit/offset is not.
  Prisma    `include`/nested `select` — one extra query per relation LEVEL,
            not per row.
  GraphQL   DataLoader, request-scoped, batching per event-loop tick. The
            returned array must match the key order exactly.
  Mongoose  populate() is a second query and does not scale; use $lookup or
            denormalise.

Then: how you'd DETECT it — query logging with counts per request, an APM
trace showing repeated identical queries, or asserting query count in a test.
```

### "When would you NOT use NestJS?"

```text
A question that rewards honesty:

  - A tiny service (a webhook receiver, one endpoint): Express or Fastify is
    ~30 lines; Nest adds a module graph, a build step, and a learning curve for
    no benefit.
  - Serverless with tight cold-start budgets: the container builds every
    provider at startup. Mitigable with lazy modules, but plain handlers start
    faster.
  - A team with no TypeScript or DI experience and a hard deadline. The
    Angular-style conventions are a real ramp.
  - Maximum raw throughput on trivial handlers — though this is almost always
    the wrong thing to optimise; the database is the bottleneck.

Where it clearly wins: a team of 3+ on a codebase that will live for years.
The enforced structure, DI, testability, and the batteries-included ecosystem
(config, validation, OpenAPI, queues, microservices, GraphQL) pay for
themselves in month three, when three engineers are adding features in parallel
and the conventions are what stop the codebase diverging.
```

### "Explain injection scopes and why they matter."

```text
DEFAULT (singleton) — one instance app-wide. The default and correct choice.
REQUEST — a new instance per request, injectable REQUEST token.
TRANSIENT — a new instance per consumer, with the INQUIRER token available.

The important part: SCOPE BUBBLES UP. One request-scoped provider makes every
service and controller above it request-scoped too, so Nest reconstructs that
whole chain per request — throughput cost, GC pressure, and any singleton state
those services held silently disappears. Request-scoped providers also cannot
be injected into singletons at all; you need ModuleRef.resolve() with a contextId.

So for per-request data — correlation ids, the current user, a tenant — the
better tool is AsyncLocalStorage: a singleton holding an async-context store,
populated in middleware. Everything stays a singleton and still reads per-request
state. Durable providers exist for the genuine per-tenant case.
```

### "How would you structure a large NestJS application?"

```text
One module per bounded context under modules/, plus common/ for framework-facing
cross-cutting code, config/ for typed namespaced configuration, and
infrastructure/ for adapters to the outside world.

Within a module: controller (HTTP only) → service (business rules, no HTTP and
no SQL) → repository (persistence only). Dependencies point inward; a service
that imports Request, or a controller that builds a query, is a boundary
violation and the start of the mess.

Module boundaries: export only what other modules genuinely need — usually the
service, never the repository. Cross-module cycles mean the boundaries are wrong;
fix them by extracting a shared module or inverting one direction with an event,
and treat forwardRef as a temporary splint.

Scaling further: dynamic modules with ConfigurableModuleBuilder for reusable
infrastructure, CQRS only where read and write models genuinely diverge, and
monorepo mode when an API and its worker share contracts — while sharing types
freely and business logic reluctantly, or you end up with a distributed monolith.
```

### Rapid fire

```text
Q: forRoot vs forFeature vs register?
A: Convention. forRoot = configure once app-wide (a connection). forFeature =
   register per-module resources against that root (entities/repositories).
   register = a non-global instance you may create several of.

Q: APP_GUARD vs useGlobalGuards?
A: Both apply globally. APP_GUARD registers through the container so the guard
   gets DI; useGlobalGuards takes an already-constructed instance that does not.

Q: getAllAndOverride vs getAllAndMerge?
A: Override = first non-undefined wins, handler before class — for metadata
   that REPLACES (@Public). Merge = combine — for ADDITIVE metadata (roles).

Q: Why is StreamableFile better than res.pipe()?
A: It keeps Nest in charge of the response, so interceptors, filters, and error
   handling still apply, and it works identically under Express and Fastify.

Q: Does Nest support Fastify fully?
A: Yes for everything Nest owns (DI, enhancers, controllers). What changes is
   raw @Res() usage, Express-specific middleware, and some third-party libs
   that assume Express internals.

Q: What is a hybrid application?
A: One process serving HTTP AND one or more microservice transports —
   connectMicroservice() + startAllMicroservices() before listen(). The common
   shape for an API that also consumes a queue.

Q: Difference between @MessagePattern and @EventPattern?
A: MessagePattern is request/response — the caller awaits a reply and is coupled
   to this service being up. EventPattern is fire-and-forget — no reply channel,
   return value discarded. Domain events should be EventPattern.

Q: How do you test a route protected by a guard?
A: .overrideGuard(JwtAuthGuard).useValue({ canActivate: ctx => { ...set
   request.user...; return true; } }) — no real tokens, handler unchanged.

Q: Why must a DataLoader be request-scoped?
A: Its cache would otherwise persist across requests and across users — serving
   one user's data to another and never seeing updates.

Q: Nest's biggest weakness?
A: Boilerplate and indirection. A CRUD endpoint touches a module, controller,
   service, repository, and two DTOs. On a small app that is pure overhead; the
   structure only pays off with team size and codebase lifetime.
```

---

## Related Files

- [NODE-FRAMEWORKS-DEEP.md](NODE-FRAMEWORKS-DEEP.md) — Express and Fastify internals, framework comparison
- [NODEJS-REST-DEEP.md](../1-high-priority/NODEJS-REST-DEEP.md) — REST API design with Node
- [EXPRESS-TS-DEEP.md](../1-high-priority/EXPRESS-TS-DEEP.md) — Express with TypeScript
- [TYPESCRIPT-ADVANCED-DEEP.md](../1-high-priority/TYPESCRIPT-ADVANCED-DEEP.md) — decorators, generics, conditional types
- [MICROSERVICES-DEEP.md](MICROSERVICES-DEEP.md) — distributed system patterns
- [AUTH-DEEP.md](AUTH-DEEP.md) — JWT, OAuth2, OIDC, RBAC
- [API-DESIGN-DEEP.md](API-DESIGN-DEEP.md) — versioning, pagination, error contracts
- [GRAPHQL-DEEP.md](GRAPHQL-DEEP.md) — schema design, resolvers, DataLoader
- [REDIS-CACHING-DEEP.md](REDIS-CACHING-DEEP.md) — caching strategies and Redis data structures
- [TESTING-STRATEGY-DEEP.md](TESTING-STRATEGY-DEEP.md) — the testing pyramid, CI strategy
- [DATABASE-DESIGN-DEEP.md](../1-high-priority/DATABASE-DESIGN-DEEP.md) — schema design, indexing, query optimisation
