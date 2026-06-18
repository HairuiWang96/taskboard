# Steno Take-Home Exercise — Prep Guide

> POC-level TypeScript + Node.js app. 5 days. Submit to their GitHub repo.
> // POC = Proof of Concept — a quick, minimal version of an app to prove the idea works.
> // Not production-ready (no auth, no full error handling, no scaling).
> // Just enough to show "this approach works."
> // Steno expects to see your thinking, patterns, and design decisions — not a polished product.
> **Critical**: They WILL quiz you on your code in the 90-min deep dive. Understand every line.

---

## What They Told You

<!-- - Write in TypeScript using Node.js as the runtime
- POC level — not production-grade, but add comments about design choices and what you'd improve
- Must run locally with instructions (README)
- 5 days to complete
- AI usage: OK for productivity, but don't over-rely — they'll ask you to explain everything in the next round
- Submit work to the GitHub repo they invite you to -->

---

## Section 1: TypeScript + Express.js Crash Course

> You know JavaScript and Node.js. Here's what's different with TypeScript + Express.

---

### Setting Up a TypeScript + Express Project From Scratch

<!-- **Step 1: Initialize the project**
```bash
mkdir steno-takehome && cd steno-takehome
npm init -y
```

**Step 2: Install dependencies**
```bash
# Runtime dependencies
npm install express dotenv

# Dev dependencies
npm install -D typescript ts-node @types/node @types/express nodemon
```

**Step 3: Create tsconfig.json**
```bash
npx tsc --init
```

Then edit `tsconfig.json` to these key settings:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**What each option means:**
- `target: "ES2022"` — compile to modern JS (async/await, optional chaining work natively)
- `module: "commonjs"` — use require/module.exports (Node.js standard)
- `outDir: "./dist"` — compiled JS goes here‼️
- `rootDir: "./src"` — your TypeScript source lives here‼️
- `strict: true` — enables all strict type checking (shows you know TypeScript)
- `esModuleInterop: true` — lets you `import express from 'express'` instead of `import * as express`‼️

**Step 4: Create package.json scripts**
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**Step 5: Create your entry point**
```
mkdir src
touch src/index.ts
``` -->

---

### Your First TypeScript Express Server

<!-- ```ts
* src/index.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

* Middleware — parse JSON request bodies
app.use(express.json());

* A simple route
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });‼️
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;  // export for testing
```

**What's different from plain JavaScript:**
1. `import` instead of `require` (with esModuleInterop)‼️
2. You type the parameters: `req: Request, res: Response`
3. `_req` — the underscore tells TypeScript "I know I'm not using this parameter"‼️
4. The `@types/express` package provides all the type definitions

**Run it:**
```bash
npm run dev
# Visit http://localhost:3000/health
``` -->

---

### TypeScript Types You'll Use Constantly

<!-- ```ts
* Request and Response from Express:‼️
import { Request, Response, NextFunction } from 'express';

* Typing request params, query, and body:
interface CreateUserBody {
  name: string;
  email: string;
}

* req.body is typed:‼️
* Request generic has 4 type params: Request<Params, ResBody, ReqBody, Query>
* So Request<{}, {}, CreateUserBody> means:
*   {} = route params (e.g. :id) — none here
*   {} = response body type — default/any
*   CreateUserBody = req.body is typed as CreateUserBody
* This gives you autocomplete and type checking on req.body
app.post('/users', (req: Request<{}, {}, CreateUserBody>, res: Response) => {
  const { name, email } = req.body;  // TypeScript knows these are strings
  * ...
});

* Simpler approach — just type inside the handler:‼️
app.post('/users', (req: Request, res: Response) => {
  const { name, email } = req.body as CreateUserBody;‼️
  * ...
});

* Typing route params:
interface UserParams {
  id: string;  // route params are always strings
}

app.get('/users/:id', (req: Request<UserParams>, res: Response) => {
  const userId = req.params.id;  // TypeScript knows this is a string
  * ...
});

* Typing query parameters:
interface SearchQuery {
  q?: string;
  page?: string;
  limit?: string;
}

app.get('/search', (req: Request<{}, {}, {}, SearchQuery>, res: Response) => {
  const query = req.query.q;       // string | undefined
  const page = req.query.page;     // string | undefined
  * ...
});

* Custom interfaces for your data:
interface Transcript {
  id: string;
  caseId: string;
  content: string;
  pageCount: number;
  status: 'draft' | 'final' | 'certified';  // union type = only these values
  createdAt: Date;
}

* Function return types:
async function getTranscript(id: string): Promise<Transcript | null> {
  * ...
}
``` -->

---

### Middleware in TypeScript

<!-- ```ts
import { Request, Response, NextFunction } from 'express';

* Basic middleware:
function logger(req: Request, res: Response, next: NextFunction): void {
  console.log(`${req.method} ${req.path}`);
  next();  // MUST call next() or the request hangs‼️
}

app.use(logger);

* Async middleware (for database calls, auth checks):
*
* This is a higher-order function — a function that takes a function and returns a new function.
*
* The problem it solves: Express doesn't catch errors from async handlers.‼️
* If you throw or a promise rejects, the request just hangs:
*
*   ❌ If getUser() rejects, Express never sends an error response
*   app.get('/users/:id', async (req, res) => {
*     const user = await getUser(req.params.id); * throws → request hangs forever
*     res.json(user);
*   });
*
* How it works, step by step:
*   1. fn is your async route handler (the function you pass in)
*   2. asyncHandler returns a new non-async function that Express understands‼️
*   3. Inside, it calls your fn(req, res, next) which returns a Promise
*   4. .catch(next) — if the Promise rejects, it calls next(error),
*      which triggers Express's error handler
*
*   * ✅ Now if getUser() rejects, Express gets the error and sends 500
*   app.get('/users/:id', asyncHandler(async (req, res) => {
*     const user = await getUser(req.params.id);  // throws → .catch(next) → error handler
*     res.json(user);
*   }));
*
* Think of it as wrapping every async handler in a try/catch automatically:‼️
*
*   try {
*     await fn(req, res, next);
*   } catch (error) {
*     next(error);  * sends to Express error-handling middleware
*   }
*
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);  * catches async errors and passes to error handler
  };
}

* Usage:
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!user.rows[0]) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ data: user.rows[0] });
}));

* Error handling middleware (4 parameters — Express recognizes this signature):
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
}

app.use(errorHandler);  // register LAST
``` -->

---

### Routing — Organizing Your Endpoints

<!-- ```ts
* src/routes/users.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  * GET /api/users
  res.json({ data: [] });
});

router.get('/:id', async (req: Request, res: Response) => {
  * GET /api/users/123
  const { id } = req.params;
  res.json({ data: { id } });
});

router.post('/', async (req: Request, res: Response) => {
  * POST /api/users
  const { name, email } = req.body;
  res.status(201).json({ data: { name, email } });
});

export default router;

* src/index.ts — mount the router:
import userRoutes from './routes/users';

app.use('/api/users', userRoutes);
* Now:
*   GET  /api/users       → router.get('/')
*   GET  /api/users/123   → router.get('/:id')
*   POST /api/users       → router.post('/')
``` -->

---

### Connecting to PostgreSQL

<!-- ```ts
* src/db.ts
import { Pool } from 'pg';

* The Pool manages multiple connections — you don't open/close per query
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  * OR individual fields:
  * host: process.env.DB_HOST,
  * port: parseInt(process.env.DB_PORT || '5432'),
  * database: process.env.DB_NAME,
  * user: process.env.DB_USER,
  * password: process.env.DB_PASSWORD,
});

* Helper to run queries:
export async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result;
}

* For transactions:
export async function getClient() {
  const client = await pool.connect();
  return client;
}

export default pool;
```

**Install the pg package:**
```bash
npm install pg
npm install -D @types/pg
```

**Usage in a route:**
```ts
import { query } from '../db';

router.get('/', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM users ORDER BY created_at DESC');
  res.json({ data: result.rows });
});

router.post('/', async (req: Request, res: Response) => {
  const { name, email } = req.body;
  const result = await query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    [name, email]
  );
  res.status(201).json({ data: result.rows[0] });
});
```

**IMPORTANT — always use parameterized queries ($1, $2):**‼️
```ts
* GOOD — safe from SQL injection:
query('SELECT * FROM users WHERE id = $1', [userId]);

* BAD — SQL injection vulnerability:
query(`SELECT * FROM users WHERE id = '${userId}'`);
```

**.env file:**
```bash
DATABASE_URL=postgres://user:password@localhost:5432/steno_takehome
PORT=3000
``` -->

---

## Section 2: Project Structure Template

<!-- **Use this as your starting point when the repo arrives:**

```
steno-takehome/
├── src/
│   ├── index.ts              # Entry point — starts the server‼️
│   ├── app.ts                # Express app setup (separate from server start for testing)‼️
│   ├── db.ts                 # Database connection pool
│   ├── routes/
│   │   └── [resource].ts     # Route handlers grouped by resource
│   ├── middleware/
│   │   ├── errorHandler.ts   # Global error handling middleware
│   │   └── validate.ts       # Request validation (optional)
│   └── types/
│       └── index.ts          # Shared TypeScript interfaces
├── tests/                    # Optional but impressive for a POC
│   └── [resource].test.ts
├── .env.example              # Template for env vars (commit this)
├── .env                      # Actual env vars (gitignore this)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md                 # HOW TO RUN + design decisions
```

**Why separate app.ts from index.ts? This is a key pattern:**

* If you put everything in one file (index.ts), the server starts
* the moment you import it — because app.listen() runs immediately:
*
*   ❌ Everything in index.ts
*   const app = express();
*   app.use(express.json());
*   app.get('/users', ...);
*   app.listen(3000);  // server starts immediately when you import this file
*
* Now if your test does `import app from './index'`, it starts listening
* on port 3000 — you get port conflicts, hanging test processes, etc.
*
* The fix: separate them into two files.‼️
*   app.ts  = the app config & routes (no listening) — the "what"
*   index.ts = imports app and calls app.listen() — the "start button"

```ts
* src/app.ts — just the Express app, no listening
import express from 'express';
import userRoutes from './routes/users';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

export default app;
* That's it — no app.listen() here. This file just defines the app.

* src/index.ts — only starts the server
import app from './app';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
* This is the only file that calls app.listen().
* In production, you run: node dist/index.js → this file runs → server starts.
* In tests, you never import this file.
```

* Now in tests you can import just the app without starting a server:
*
*   import request from 'supertest';
*   import app from '../src/app';  // no server starts! just the app object
*
*   test('GET /api/users returns 200', async () => {
*     const res = await request(app).get('/api/users');
*     // supertest handles it in-memory — no real port, no conflicts‼️
*     expect(res.status).toBe(200);
*   });
*
* supertest creates a temporary in-memory server for each test,‼️
* so you can run tests in parallel without port conflicts.
*
* TL;DR: app.ts = the app config/routes, index.ts = the "start" button.
* Tests need the app but not the start button.‼️

-->

---

## Section 3: Common Take-Home Patterns

---

### CRUD API Pattern (you'll likely need this)

<!-- ```ts
* src/routes/items.ts — a complete CRUD resource
import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

* LIST — GET /api/items
router.get('/', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM items ORDER BY created_at DESC');
  res.json({ data: result.rows });‼️
});

* GET ONE — GET /api/items/:id
router.get('/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM items WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

* CREATE — POST /api/items
router.post('/', async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const result = await query(
    'INSERT INTO items (name, description) VALUES ($1, $2) RETURNING *',‼️
    [name, description]
  );
  res.status(201).json({ data: result.rows[0] });
});

* UPDATE — PATCH /api/items/:id
* COALESCE picks the first non-null value from its arguments.
*   COALESCE($1, name) means: use $1 (new value from request) if provided,
*   otherwise keep the existing `name` in the database.
*
* This is the trick for partial updates — user only sends fields they want to change:
*   User sends: { name: "New Name" }  (no description)
*   $1 = "New Name", $2 = undefined (becomes NULL in SQL)
*
*   name = COALESCE('New Name', name)        → 'New Name' is not null → use it
*   description = COALESCE(NULL, description) → NULL → keep existing description
*
* Without COALESCE, sending PATCH with only { name: "New Name" } would
* overwrite description to NULL — wiping out existing data.
router.patch('/:id', async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const result = await query(
    'UPDATE items SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
    [name, description, req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

* DELETE — DELETE /api/items/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const result = await query('DELETE FROM items WHERE id = $1 RETURNING *', [req.params.id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.status(204).send();
});

export default router;
```

**The COALESCE trick for PATCH:**
`COALESCE($1, name)` means: use the new value if provided, otherwise keep the existing value. This lets clients send partial updates without overwriting everything. -->

---

### Database Setup with SQL File

<!-- ```sql
-- src/db/schema.sql  (or migrations/ folder)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update the updated_at timestamp:
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

**Run it:**
```bash
psql -d steno_takehome -f src/db/schema.sql
```

**Or add a setup script to package.json:**
```json
{
  "scripts": {
    "db:setup": "psql $DATABASE_URL -f src/db/schema.sql"
  }
}
``` -->

---

### Input Validation (Simple, No Library)

<!-- For a POC, you don't need zod or joi. Simple validation is fine:

```ts
* src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';

* Generic validation middleware factory:
function validate(schema: Record<string, (val: any) => boolean>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const [field, check] of Object.entries(schema)) {
      if (!check(req.body[field])) {
        errors.push(`Invalid or missing field: ${field}`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }
    next();
  };
}

* Usage:
router.post('/',
  validate({
    name: (v) => typeof v === 'string' && v.trim().length > 0,
    email: (v) => typeof v === 'string' && v.includes('@'),
  }),
  async (req: Request, res: Response) => {
    * req.body is validated at this point
  }
);
```

Or even simpler — just validate inline:
```ts
router.post('/', async (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required and must be a string' });
    return;
  }
  * ... proceed
});
``` -->

---

## Section 4: README Template

<!-- **This is what they'll read first. Make it count.**

```markdown
# [Project Name]

## Overview
Brief description of what this does and the approach you took.

## Design Decisions
- **TypeScript + Express**: [why / how you structured it]
- **PostgreSQL**: [schema choices, any interesting patterns]
- **[Other decision]**: [reasoning]

## What I'd Change for Production
- Add proper input validation library (zod)
- Add authentication middleware (JWT)
- Add comprehensive error handling with custom error classes
- Add database migrations (instead of raw SQL schema file)
- Add request logging (pino or morgan)‼️
- Add rate limiting
- Add pagination for list endpoints
- Add CI/CD pipeline
- Add comprehensive test coverage (unit + integration)
- Add API documentation (OpenAPI/Swagger)

## Setup & Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation
\```bash
# Clone and install
git clone [repo-url]
cd [project-name]
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Set up database
createdb steno_takehome
npm run db:setup

# Run in development
npm run dev
\```

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/items | List all items |
| GET | /api/items/:id | Get one item |
| POST | /api/items | Create an item |
| PATCH | /api/items/:id | Update an item |
| DELETE | /api/items/:id | Delete an item |

### Running Tests
\```bash
npm test
\```
```
-->

---

## Section 5: Things They'll Ask About in the Deep Dive

<!-- Based on the interview process doc: "a discussion of your take-home assignment, followed by a live coding portion."

**Be ready to explain:**

1. **"Walk me through your project structure. Why did you organize it this way?"**
   - Explain the separation: routes → handlers → database queries
   - Why app.ts is separate from index.ts (testability)

2. **"Why did you choose this database schema?"**
   - Explain your table design, data types, relationships
   - What indexes you added and why
   - What you'd change for production (migrations, more constraints)

3. **"How does your error handling work?"**
   - The asyncHandler pattern (catch async errors)
   - Global error middleware
   - Consistent error response format

4. **"How would you add authentication to this?"**
   - JWT middleware that verifies token on protected routes
   - Role-based access control

5. **"How would you add pagination?"**
   - Offset-based: LIMIT/OFFSET with page/limit query params
   - Return total count for frontend pagination

6. **"What would you test and how?"**
   - Supertest for API integration tests‼️
   - What edge cases you'd cover

7. **"What trade-offs did you make for the POC?"**
   - This is where your "What I'd Change for Production" section shines
   - Shows you know the difference between POC and production code

8. **Live coding additions they might ask:**
   - "Add a new endpoint that does X"
   - "Add validation to this route"
   - "Write a test for this endpoint"
   - "Add a query parameter for filtering/sorting"
   - "Add a relationship between two resources" -->

---

## Section 6: Quick Commands Cheat Sheet

<!-- ```bash
# Create project
mkdir project && cd project && npm init -y

# Install everything you need
npm install express pg dotenv
npm install -D typescript ts-node @types/node @types/express @types/pg nodemon

# Init TypeScript‼️
npx tsc --init

# Create folder structure
mkdir -p src/routes src/middleware src/types src/db tests

# Run dev server (with auto-reload)
npm run dev

# Build for production
npm run build

# Create database
createdb steno_takehome

# Run SQL schema
psql -d steno_takehome -f src/db/schema.sql

# Run tests
npm test

# Check TypeScript errors without compiling‼️
npx tsc --noEmit
```

**.gitignore:**
```
node_modules/
dist/
.env
```

**.env.example:**
```
DATABASE_URL=postgres://localhost:5432/steno_takehome
PORT=3000
``` -->

---

## Key Reminders

<!--
1. **Understand every line** — they WILL ask you to explain your code in the 90-min deep dive
2. **POC, not production** — don't over-engineer, but show you KNOW what production would look like (comments, README)
3. **README matters** — clear setup instructions, design decisions, what you'd improve
4. **Git history matters** — make meaningful commits, not one giant commit at the end
5. **Run it before submitting** — clone to a fresh directory, follow your own README, make sure it works
6. **Add comments on design choices** — "I chose X because Y. For production, I would Z."
7. **Parameterized queries** — NEVER concatenate user input into SQL strings
8. **TypeScript strict mode** — shows you take type safety seriously
9. **Test at least one endpoint** — even one test shows you know how to test
10. **Keep it simple** — a clean, working POC beats an over-engineered mess
-->
