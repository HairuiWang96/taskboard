# NestJS — Beginner's Guide

**Priority: MEDIUM**

> A plain-language introduction to NestJS for people who already know Express: what Nest
> adds, the three building blocks (modules, controllers, services), reading requests,
> validation, errors, and the mistakes that cause most beginner bugs.
>
> Assumes you know Express and basic TypeScript. No Nest experience needed.

---

## Table of Contents

- [NestJS — Beginner's Guide](#nestjs--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. What Nest Is](#1-what-nest-is)
  - [2. Express → Nest Cheat Table](#2-express--nest-cheat-table)
  - [3. Setup](#3-setup)
  - [4. The Three Building Blocks](#4-the-three-building-blocks)
  - [5. Controllers — Reading the Request](#5-controllers--reading-the-request)
  - [6. Services \& Dependency Injection](#6-services--dependency-injection)
  - [7. Modules — Wiring It Together](#7-modules--wiring-it-together)
  - [8. Validation with DTOs](#8-validation-with-dtos)
  - [9. Errors — Built-in Exceptions](#9-errors--built-in-exceptions)
  - [10. `@Res()` — When You Need the Raw Response](#10-res--when-you-need-the-raw-response)
  - [11. The Request Flow](#11-the-request-flow)
  - [12. Common Beginner Mistakes](#12-common-beginner-mistakes)
  - [13. Cheat Sheet](#13-cheat-sheet)
  - [Related Files](#related-files)

---

## 1. What Nest Is

```text
‼️ NEST RUNS ON EXPRESS. By default, underneath every Nest app is a normal
   Express server. Same req, same res, same middleware. Nest adds STRUCTURE on top.‼️

What Express leaves up to you, Nest decides for you:

  EXPRESS                              NEST
  "Put your routes anywhere."          Routes go in CONTROLLERS.
  "Put your logic anywhere."           Logic goes in SERVICES.
  "Organise files however you like."   Features are grouped into MODULES.
  "Validate the body yourself."        DTOs + ValidationPipe do it for you.
  "res.status(404).json(...)"          throw new NotFoundException()

‼️ NEST IN ONE SENTENCE
   Express with rules: every feature is a module, routes live in controllers,
   logic lives in services, and Nest connects them for you.‼️
```

---

## 2. Express → Nest Cheat Table

| In Express you'd write…           | In Nest you write…                                     |
| --------------------------------- | ------------------------------------------------------ |
| `app.listen(3000)` in `index.js`  | `main.ts`: `NestFactory.create(AppModule)` + `listen`  |
| `const router = express.Router()` | A class with `@Controller('users')`                    |
| `router.get('/:id', handler)`     | A method with `@Get(':id')`                            |
| `req.params.id`                   | `@Param('id') id: string`                              |
| `req.query.page`                  | `@Query('page') page: string`                          |
| `req.body`                        | `@Body() body: CreateUserDto`                          |
| `res.json(obj)`                   | Just `return obj`                                      |
| `res.status(404).json(...)`       | `throw new NotFoundException()`                        |
| `app.use(authMiddleware)`         | A **Guard**: `@UseGuards(AuthGuard)`                   |
| `require('./userService')`        | **Dependency injection** — ask for it in a constructor |

---

## 3. Setup

```bash
npm i -g @nestjs/cli
nest new my-app          # creates a working project
cd my-app
npm run start:dev        # runs on http://localhost:3000, restarts on save

# ‼️ The most useful command — creates a whole feature in one go:‼️
nest g resource users    # module + controller + service + DTOs
```

```typescript
// src/main.ts — the entry point (like index.js in Express)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {‼️
  const app = await NestFactory.create(AppModule); // builds the app from the root module
  await app.listen(3000);
}
bootstrap();
```

---

## 4. The Three Building Blocks

```text
Think of a restaurant:

  CONTROLLER = the waiter    Takes the order (the HTTP request) and brings back
                             the answer. Does NOT cook.
  SERVICE    = the kitchen   Does the real work — database, files, business rules.
  MODULE     = the restaurant  Says "this waiter and this kitchen work together."

‼️ The flow for every request:
   Request → Controller (read input) → Service (do the work) → Controller (return) → Response

‼️ The @Something things are DECORATORS — labels that tell Nest what a class or
   function is for. ‼️ You never call controller methods yourself; Nest calls them
   when a matching URL comes in.‼️
```

---

## 5. Controllers — Reading the Request

```typescript
// src/users/users.controller.ts
import { Controller, Get, Post, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users') // every route here starts with /users
export class UsersController {
  constructor(private readonly usersService: UsersService) {} // see §6

  // GET /users?page=2
  @Get()
  findAll(@Query('page') page: string) {
    return this.usersService.findAll(); // returned value → JSON automatically‼️
  }

  // GET /users/42
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // ‼️ ParseIntPipe turns "42" into 42 — or returns 400 if it's not a number.
    // URL params are ALWAYS strings without it.‼️
    return this.usersService.findOne(id);
  }

  // POST /users   (body: { "email": "...", "name": "..." })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto); // POST returns 201 by default
  }
}
```

```text
‼️ Keep controllers THIN: read the input, call the service, return the result.
   No database calls, no business logic. That all goes in the service.
```

---

## 6. Services & Dependency Injection

```typescript
// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable() // ‼️ marks this class as something Nest can create and hand out‼️
export class UsersService {
  private users = [{ id: 1, email: 'a@b.com', name: 'Ann' }];

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  create(dto: { email: string; name: string }) {
    const user = { id: Date.now(), ...dto };
    this.users.push(user);
    return user;
  }
}
```

```text
‼️ DEPENDENCY INJECTION (DI) — the core idea of Nest.

  In Express:   const usersService = new UsersService();   ← you create it
  In Nest:      constructor(private readonly usersService: UsersService) {}
                                                            ← you ASK for it

  Nest sees the type in the constructor, creates ONE shared UsersService, and
  passes it in. Every class that asks for it gets the same instance.

  Why bother? In tests you can swap in a fake service without changing any code.‼️
```

---

## 7. Modules — Wiring It Together

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController], // the routes in this feature
  providers: [UsersService], // the services Nest should create
  exports: [UsersService], // ‼️ what OTHER modules are allowed to use
})
export class UsersModule {}
```

```typescript
// src/app.module.ts — the root module; every feature module is imported here
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [UsersModule, OrdersModule],
})
export class AppModule {}
```

```text
‼️ SHARING A SERVICE BETWEEN MODULES needs BOTH sides:

   UsersModule    exports: [UsersService]     ← "I'm sharing this"
   OrdersModule   imports: [UsersModule]      ← "I want what they share"

   Miss either one and you get the most common Nest error of all:

   "Nest can't resolve dependencies of the OrdersService (?).
    Please make sure that the argument UsersService at index [0] is available
    in the OrdersModule context."‼️

   It always means: something is missing from providers, imports, or exports.
```

---

## 8. Validation with DTOs

```bash
npm install class-validator class-transformer
```

```typescript
// src/users/dto/create-user.dto.ts
// A DTO (Data Transfer Object) describes what a request body must look like.‼️
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;
}
```

```typescript
// src/main.ts — turn validation on for the whole app, once‼️
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // ‼️ strips fields not in the DTO (stops users sending { isAdmin: true })‼️
    transform: true, // turns the plain JSON into a real CreateUserDto instance‼️
  }),
);
```

```text
Now a bad body never reaches your code. Nest replies automatically:

  POST /users  { "email": "not-an-email" }
  → 400 { "message": ["email must be an email", "name must be a string", ...] }

‼️ The DTO must be a CLASS, not a TypeScript type/interface. Types disappear
   when TS compiles to JS, so Nest has nothing to validate against at runtime.‼️
```

---

## 9. Errors — Built-in Exceptions

```typescript
// Just THROW — Nest turns it into the right HTTP response. No res.status() needed.
import {
  BadRequestException, // 400 — bad input
  UnauthorizedException, // 401 — not logged in
  ForbiddenException, // 403 — logged in, but not allowed
  NotFoundException, // 404 — doesn't exist
  ConflictException, // 409 — clashes with existing data
} from '@nestjs/common';

throw new NotFoundException('User not found');
// → { "statusCode": 404, "message": "User not found", "error": "Not Found" }
```

```typescript
// ── Conflict check — "does this already exist?" ───────────────────────────
async create(dto: CreateUserDto) {
  const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
  if (existing) {
    throw new ConflictException('Email already in use'); // → 409
  }
  return this.usersRepo.save(dto);
}

// ‼️ Check-then-save has a gap: two sign-ups at the same moment can both pass
// the check. Also put a UNIQUE constraint on the column in the database, and
// turn the database's duplicate-key error into a ConflictException.‼️
```

```text
‼️ Any error that is NOT one of these (a normal `throw new Error()`, a crash)
   becomes a 500 "Internal server error". The real message is hidden from the
   client and logged on the server.
```

---

## 10. `@Res()` — When You Need the Raw Response

```typescript
// Normally you just `return` and Nest builds the response.
// @Res() gives you the Express `res` object for the rare cases you need it —‼️
// usually to set custom headers, like for a file download.‼️
import { Controller, Get, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';

@Controller('files')
export class FilesController {
  @Get('report')
  download(@Res({ passthrough: true }) res: Response) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"',
    });
    // StreamableFile sends the file in small pieces instead of all at once‼️
    return new StreamableFile(createReadStream('report.pdf'));
  }
}
```

```text
‼️ ALWAYS ADD passthrough: true.

   @Res()                       "I'll send the response myself."
                                Nest stops sending. Forget res.send() and the
                                request HANGS forever.‼️

   @Res({ passthrough: true })  "I only want to set headers. You still send it."
                                You set headers, then `return` as usual.

Avoid @Res() entirely when you can — returning values keeps the rest of Nest
(interceptors, serialization) working.‼️
```

---

## 11. The Request Flow

```text
Every request passes through these stages, in this order:

  Middleware → Guards → Interceptors (before) → Pipes → Controller
                                                            │
  Response ← Exception filters ← Interceptors (after) ←─────┘

  MIDDLEWARE     Same as Express middleware. Logging, cookies, CORS.
  GUARDS         "Is this request allowed?" → auth and roles.‼️
  INTERCEPTORS   Wrap the handler — change the result, add timing, caching.‼️
  PIPES          Check and convert input — ValidationPipe, ParseIntPipe.‼️
  CONTROLLER     Your route handler.
  FILTERS        Turn thrown errors into responses (the default one is built in).

‼️ As a beginner you mostly need PIPES (validation) and GUARDS (auth).
   The rest can wait.
```

```typescript
// A simple guard — the Nest version of an auth middleware
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest(); // the normal Express req
    return !!req.headers.authorization; // true → allowed, false → 403
  }
}

// Use it on a whole controller or a single route
@UseGuards(AuthGuard)
@Controller('orders')
export class OrdersController {}
```

---

## 12. Common Beginner Mistakes

```text
‼️ 1. "Nest can't resolve dependencies of X".
   Something is missing from a module: the service isn't in `providers`, the
   other module doesn't `export` it, or you didn't `import` that module.

‼️ 2. Forgetting @Injectable() on a service.
   Nest doesn't know it can create it — same "can't resolve" error.

‼️ 3. Using @Res() without passthrough: true.
   Nest stops sending responses, and the request hangs.

‼️ 4. Forgetting ValidationPipe in main.ts.
   Your DTOs with @IsEmail() etc. do NOTHING without it. Bad data goes straight in.

‼️ 5. Using a TS type/interface as a DTO.
   It doesn't exist at runtime, so nothing gets validated. Use a class.‼️

‼️ 6. Treating URL params as numbers.
   @Param('id') id: number is still the string "42". Use ParseIntPipe.

‼️ 7. Putting logic in the controller.
   Database calls and business rules belong in the service. Controllers stay thin.

‼️ 8. Creating services with `new`.
   `new UsersService()` skips DI — the service gets none of its own dependencies.
   Always ask for it in the constructor.

‼️ 9. res.status(404).json(...) out of Express habit.
   Throw an exception instead: throw new NotFoundException().
```

---

## 13. Cheat Sheet

```typescript
// ── CONTROLLER ────────────────────────────────────────────────────────────
@Controller('users') // base path /users
export class UsersController {
  constructor(private readonly usersService: UsersService) {} // DI

  @Get() findAll(@Query('page') page: string) {}
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {}
  @Post() create(@Body() dto: CreateUserDto) {} // 201
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) {}
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {} // custom status
}

// ── SERVICE ───────────────────────────────────────────────────────────────
@Injectable()‼️
export class UsersService {}

// ── MODULE ────────────────────────────────────────────────────────────────
@Module({
  imports: [OtherModule], // modules whose exports you need
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // share with other modules
})
export class UsersModule {}

// ── ERRORS ────────────────────────────────────────────────────────────────
// 400 BadRequest  401 Unauthorized  403 Forbidden  404 NotFound  409 Conflict
throw new NotFoundException('User not found');

// ── main.ts ───────────────────────────────────────────────────────────────
const app = await NestFactory.create(AppModule);
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.listen(3000);

// ── CLI ───────────────────────────────────────────────────────────────────
// nest new my-app          new project
// nest g resource users    module + controller + service + DTOs
// npm run start:dev        dev server with reload
```

---

## Related Files

- [NESTJS-DEEP.md](NESTJS-DEEP.md) — the full reference; [Part 0](NESTJS-DEEP.md#part-0--start-here-the-basics) goes deeper on everything here
- [TYPEORM-BASICS.md](TYPEORM-BASICS.md) — beginner guide to the database layer most Nest apps use
- [EXPRESS-TS-DEEP.md](../1-high-priority/EXPRESS-TS-DEEP.md) — Express with TypeScript, the layer Nest runs on
- [TESTING-BASICS.md](TESTING-BASICS.md) — testing backend code, including mocking services
