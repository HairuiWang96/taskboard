# Interview Prep — Full Stack Cheat Sheet

Stack: **TypeScript · React · Tailwind · shadcn/ui · Fastify · Drizzle ORM · Postgres**

---

## Project Map

```
taskboard/
├── server/
│   ├── drizzle.config.ts          ← tells drizzle-kit where schema is + DB connection
│   └── src/
│       ├── db/
│       │   ├── schema.ts          ← table definitions (TypeScript-first)
│       │   └── index.ts           ← drizzle client (wraps pg Pool)
│       ├── routes/tasks.ts        ← Fastify plugin: GET/POST/PATCH/DELETE
│       └── index.ts               ← app entry: register CORS + routes
└── client/
    ├── tailwind.config.ts         ← CSS variable colors, content paths
    └── src/
        ├── lib/utils.ts           ← cn() helper (clsx + tailwind-merge)
        ├── hooks/useTasks.ts      ← all server calls live here
        ├── components/
        │   ├── ui/button.tsx      ← shadcn component: variant map + cn()
        │   ├── ui/input.tsx       ← shadcn Input: wraps <input> with styles
        │   ├── ui/badge.tsx       ← shadcn Badge: status indicator
        │   ├── TaskForm.tsx       ← controlled form, loading state
        │   └── TaskList.tsx       ← list rendering, conditional classes
        └── App.tsx                ← thin: wires hook → components
```

---

## Drizzle ORM

### Defining a table

```ts
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(), // UUID, auto-generated
    title: text('title').notNull(),
    completed: boolean('completed').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Infer TS types directly from the schema — no duplication
export type Task = typeof tasks.$inferSelect; // shape of a row you GET back
export type NewTask = typeof tasks.$inferInsert; // shape needed to INSERT (id optional)
```

### Setting up the client

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema }); // pass schema for db.query.* API
```

### Core query patterns

```ts
import { eq, desc } from 'drizzle-orm';

// SELECT * FROM tasks ORDER BY created_at DESC
db.select().from(tasks).orderBy(desc(tasks.createdAt));

//! INSERT — .returning() gives back the created row (Postgres only)
const [task] = await db.insert(tasks).values({ title: 'Buy milk' }).returning();

// UPDATE
const [updated] = await db
    .update(tasks)
    .set({ completed: true })
    .where(eq(tasks.id, id)) // eq() = equals operator
    .returning();

// DELETE
await db.delete(tasks).where(eq(tasks.id, id));

// JOIN (avoids N+1 — see bottom of this doc)
const result = await db.select().from(usersTable).leftJoin(tasks, eq(tasks.userId, usersTable.id));
```

### Migrations

```bash
npx drizzle-kit generate   # generates SQL migration files from schema changes
npx drizzle-kit push       # pushes schema directly to DB (dev only, skips migration files)
```

---

## Fastify

### App entry point

```ts
import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: true }); // pino logger built in

app.register(cors, { origin: 'http://localhost:5173' });
app.register(taskRoutes, { prefix: '/tasks' }); // all routes in plugin get /tasks prefix

app.get('/health', async () => ({ status: 'ok' }));

await app.listen({ port: 3000 });
```

### Route plugin pattern

```ts
import { FastifyPluginAsync } from 'fastify';

// Fastify organises routes as plugins — register them with app.register()
const taskRoutes: FastifyPluginAsync = async fastify => {
    // No generics needed when there's no body/params
    fastify.get('/', async () => {
        return db.select().from(tasks);
    });

    // Generic: Body = shape of request.body
    fastify.post<{ Body: { title: string } }>('/', async (req, reply) => {
        const [task] = await db.insert(tasks).values({ title: req.body.title }).returning();
        reply.code(201);
        return task;
    });

    // Generic: Params = shape of URL params (:id)
    fastify.patch<{ Params: { id: string } }>('/:id/complete', async req => {
        const [task] = await db.update(tasks).set({ completed: true }).where(eq(tasks.id, req.params.id)).returning();
        return task;
    });

    fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
        await db.delete(tasks).where(eq(tasks.id, req.params.id));
        reply.code(204); // 204 = success, no body
    });
};

export default taskRoutes;
```

### Fastify route generics cheat sheet

```ts
fastify.get<{
  Params: { id: string };      // URL params — /users/:id
  Querystring: { q: string };  // query string — ?q=hello
  Body: { name: string };      // request body (POST/PATCH)
  Reply: { ok: boolean };      // response shape
}>('/route', async (req, reply) => { ... });
```

### Lifecycle hooks (for auth middleware)

```ts
fastify.addHook('onRequest', async (req, reply) => {
    // runs before route handler — good for auth checks
    const token = req.headers.authorization;
    if (!token) {
        reply.code(401).send({ error: 'Unauthorized' });
    }
});
```

---

## TypeScript Patterns

### Generics

```ts
// Pick specific keys from a type
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(k => (result[k] = obj[k]));
    return result;
}

pick({ a: 1, b: 2, c: 3 }, ['a', 'b']); // { a: 1, b: 2 }
```

### Utility types

```ts
type User = { id: string; name: string; email: string; password: string };

type PublicUser = Omit<User, 'password'>; // everything except password
type PartialUser = Partial<User>; // all fields optional
type RequiredId = Required<Pick<User, 'id'>>; // just id, required
type GetUserFn = ReturnType<typeof getUser>; // return type of a function
```

### Discriminated union (great for API responses)

```ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

function handleResult(result: ApiResult<User>) {
    if (result.ok) {
        console.log(result.data.name); // TS knows data exists here
    } else {
        console.log(result.error); // TS knows error exists here
    }
}
```

### as const

```ts
const ROLES = ['admin', 'member', 'guest'] as const;
type Role = (typeof ROLES)[number]; // 'admin' | 'member' | 'guest'
```

---

## React Patterns

### Custom hook — keep components dumb

```ts
// All data fetching + mutation logic in the hook
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/tasks');
    setTasks(await res.json());
  }, []); // empty deps = stable reference, won't re-create on every render

  useEffect(() => { fetchTasks(); }, [fetchTasks]); // runs once on mount

  const createTask = async (title: string) => {
    const res = await fetch('/tasks', { method: 'POST', body: JSON.stringify({ title }) });
    const task = await res.json();
    setTasks(prev => [task, ...prev]); // update local state without refetching
  };

  return { tasks, createTask };
}

// Component is thin — just uses the hook
function App() {
  const { tasks, createTask } = useTasks();
  return <TaskList tasks={tasks} onCreate={createTask} />;
}
```

### useCallback vs useMemo

```ts
// useCallback — memoises a FUNCTION (stops it being re-created every render)
const fetchTasks = useCallback(async () => { ... }, [deps]);

// useMemo — memoises a VALUE (expensive calculation)
const expensiveList = useMemo(() => tasks.filter(t => !t.completed), [tasks]);

// When NOT to use them: don't add them everywhere — only when:
// 1. A function is a dependency in useEffect deps array
// 2. A calculation is measurably slow (sorting thousands of items)
// Most components don't need either.
```

### Controlled vs uncontrolled form

```tsx
// Controlled: React owns the value — good for validation + dynamic UI
const [title, setTitle] = useState('');
<input value={title} onChange={e => setTitle(e.target.value)} />;

// Uncontrolled: DOM owns the value — simpler for basic forms
const inputRef = useRef<HTMLInputElement>(null);
<input ref={inputRef} defaultValue='' />;
// read with: inputRef.current?.value
```

---

## shadcn/ui

### What it actually is

- **Not an npm package** — you copy component files into `src/components/ui/`
- Built on **Radix UI** (accessible, unstyled primitives) + **Tailwind**
- You own the code — customize it however you want

### The `cn()` utility

```ts
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

//! clsx: handles conditional classes
// twMerge: resolves Tailwind conflicts (px-2 + px-4 → px-4, last wins)
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Usage
cn('px-4 py-2', isActive && 'bg-blue-500', className);
```

### Component pattern (variant map + cn)

```tsx
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'destructive' | 'outline';
};

const variantClasses = {
    default: 'bg-primary text-primary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input bg-background',
};

export function Button({ variant = 'default', className, ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                'inline-flex items-center rounded-md px-4 py-2 text-sm font-medium',
                variantClasses[variant],
                className, // caller can still override
            )}
            {...props} // spreads disabled, onClick, type, children, etc.
        />
    );
}
```

### Theming: CSS variables → Tailwind

```css
/* index.css — define the palette once as CSS variables */
:root {
    --primary: 221.2 83.2% 53.3%; /* hsl values without hsl() wrapper */
    --primary-foreground: 210 40% 98%;
    --destructive: 0 84.2% 60.2%;
}
```

```ts
// tailwind.config.ts — map variables to Tailwind color names
colors: {
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
}
// Now bg-primary, text-primary, text-primary-foreground all work
```

---

## Tailwind

### Responsive prefixes

```tsx
<div className="p-4 md:p-8 lg:p-12">      // mobile-first: base → md → lg
<div className="flex-col md:flex-row">     // stack on mobile, row on desktop
<div className="hidden md:block">          // hide on mobile, show on md+
```

### Dark mode (class strategy)

```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
// Toggle by adding/removing 'dark' class on <html>
document.documentElement.classList.toggle('dark');
```

### Common patterns

```tsx
// Centered content with max width
<main className="max-w-xl mx-auto p-6">

// Flex row with spacing
<div className="flex items-center gap-3">

// Full-width button with grow
<div className="flex gap-2">
  <input className="flex-1" />   // takes remaining space
  <button>Submit</button>
</div>

// Conditional classes (use cn() or template literals)
<span className={`${completed ? 'line-through text-muted-foreground' : ''}`}>
```

---

## Postgres

### JOIN types

```sql
-- INNER JOIN: !only rows that match in BOTH tables
SELECT * FROM users INNER JOIN posts ON posts.user_id = users.id;

-- LEFT JOIN: !all users, even if they have no posts (posts columns = NULL)
SELECT * FROM users LEFT JOIN posts ON posts.user_id = users.id;
```

### Indexes

```sql
-- Add index when you filter/sort by a column frequently
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- Unique index (also enforces constraint)
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### Transactions

```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;   -- both succeed together
-- ROLLBACK;  -- or undo everything if something fails
```

### N+1 problem — know this cold

```ts
// BAD — N+1: 1 query to get users, then 1 MORE query per user
const users = await db.select().from(usersTable); // 1 query
for (const user of users) {
    user.tasks = await db
        .select()
        .from(tasks) // N queries
        .where(eq(tasks.userId, user.id));
}
// 100 users = 101 queries

// GOOD — 1 JOIN query fetches everything at once
const result = await db.select().from(usersTable).leftJoin(tasks, eq(tasks.userId, usersTable.id)); // 1 query always
```

---

## Running the Project

```bash
# 1. Start Postgres
docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# 2. Push schema to DB (creates the tasks table)
cd ~/Projects/taskboard/server
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskboard npx drizzle-kit push

# 3. Start the API server (port 3000)
npm run dev

# 4. In a new terminal — start the React app (port 5173)
cd ~/Projects/taskboard/client
npm run dev
```

### Verify it works

- `curl http://localhost:3000/health` → `{"status":"ok"}`
- `curl http://localhost:3000/tasks` → `[]`
- Open `http://localhost:5173`, add a task, complete it, delete it
- Refresh the page — tasks persist (they're in Postgres)

---

---

## Validation with Zod

Zod is the standard schema validation library in the TypeScript ecosystem. Validates at runtime, gives you types for free.

```ts
import { z } from 'zod';

// Define once — get runtime validation + TypeScript type
const CreateTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    dueDate: z.string().datetime().optional(), // ISO 8601
});

// Type inferred — no duplication
type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// In a Fastify route:
fastify.post<{ Body: CreateTaskInput }>('/', async (req, reply) => {
    const result = CreateTaskSchema.safeParse(req.body); // doesn't throw
    if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
    }
    const { title, priority } = result.data; // fully typed
    // ...
});

//! .parse() throws on failure — use in trusted contexts
const task = CreateTaskSchema.parse(req.body);

// Useful transforms
const Schema = z.object({
    id: z.string().uuid(),
    tags: z.array(z.string()).default([]), // missing → []
    email: z.string().email().toLowerCase().trim(), // sanitize on parse
    count: z.coerce.number(), // "5" → 5 (from query strings)
});
```

### Partial updates (PATCH endpoints)

```ts
const UpdateTaskSchema = CreateTaskSchema.partial(); // all fields optional
// z.partial() is the Zod equivalent of TypeScript's Partial<T>
```

---

## Error Handling

### Fastify error handler

```ts
// Global error handler — catches anything thrown in route handlers
app.setErrorHandler((error, req, reply) => {
    app.log.error(error);

    if (error.statusCode) {
        // Fastify's own HTTP errors (e.g. reply.code(404).send())
        return reply.code(error.statusCode).send({ error: error.message });
    }

    // Unexpected error — don't leak internals to client
    reply.code(500).send({ error: 'Internal server error' });
});

// Throw HTTP errors cleanly from route handlers
import createError from '@fastify/error';
const NotFound = createError('NOT_FOUND', 'Task not found', 404);
throw new NotFound(); // caught by setErrorHandler above
```

### Async error pattern

```ts
//! In route handlers, Fastify wraps async functions — rejections are caught automatically
fastify.get('/:id', async (req, reply) => {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, req.params.id));
    if (!task) {
        return reply.code(404).send({ error: 'Task not found' });
    }
    return task;
});

// In regular async code, always handle the error path explicitly
async function fetchUser(id: string) {
    try {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return { ok: true as const, data: user };
    } catch (err) {
        return { ok: false as const, error: 'Database error' };
    }
}
```

---

## Authentication — JWT Pattern

JWT = JSON Web Token. Stateless — no session stored on server. Three parts: `header.payload.signature`.

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.abc123
         header              payload             signature
```

### Signing and verifying (jsonwebtoken)

```ts
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!; // must be long, random, secret

// On login — sign a token
const token = jwt.sign(
    { userId: user.id, role: user.role }, // payload — keep small, avoid sensitive data
    SECRET,
    { expiresIn: '7d' },
);

// On every protected request — verify
try {
    const payload = jwt.verify(token, SECRET) as { userId: string; role: string };
    // payload is now the object you signed above
} catch (err) {
    // TokenExpiredError or JsonWebTokenError
    reply.code(401).send({ error: 'Invalid token' });
}
```

### Auth hook in Fastify

```ts
// Prehandler runs after parsing but before the route handler
fastify.addHook('preHandler', async (req, reply) => {
    const authHeader = req.headers.authorization; // "Bearer <token>"
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing token' });
    }
    const token = authHeader.slice(7);
    try {
        req.user = jwt.verify(token, SECRET) as JwtPayload; // augment req type
    } catch {
        return reply.code(401).send({ error: 'Invalid token' });
    }
});

// Augment Fastify's Request type so req.user is typed
declare module 'fastify' {
    interface FastifyRequest {
        user: { userId: string; role: string };
    }
}
```

### JWT vs Sessions — know the trade-off

|             | JWT                                     | Sessions                           |
| ----------- | --------------------------------------- | ---------------------------------- |
| Storage     | Client (localStorage / cookie)          | Server (DB or Redis)               |
| Revocation  | Hard — token is valid until expiry      | Easy — delete from store           |
| Scalability | Great — stateless, any server validates | Needs shared store                 |
| Use when    | Stateless APIs, microservices           | Need instant logout, high security |

---

## Environment Config

```ts
// server/src/config.ts — validate env vars at startup, fail fast
import { z } from 'zod';

const EnvSchema = z.object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// This throws at startup if anything is missing — better than undefined errors later
export const config = EnvSchema.parse(process.env);

// Usage
import { config } from './config';
app.listen({ port: config.PORT });
```

```bash
# .env (never commit this)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskboard
JWT_SECRET=super-long-random-secret-at-least-32-chars
PORT=3000
```

---

## Pagination

### Offset pagination (simple, common)

```ts
// GET /tasks?page=2&limit=20
fastify.get<{ Querystring: { page?: number; limit?: number } }>('/', async req => {
    const page = req.query.page ?? 1;
    const limit = req.query.limit ?? 20;
    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([db.select().from(tasks).limit(limit).offset(offset).orderBy(desc(tasks.createdAt)), db.select({ count: sql<number>`count(*)` }).from(tasks)]);

    return {
        data,
        pagination: {
            page,
            limit,
            total: Number(countResult[0].count),
            totalPages: Math.ceil(Number(countResult[0].count) / limit),
        },
    };
});
```

### Cursor pagination (better for large datasets)

```ts
// GET /tasks?cursor=<lastId>&limit=20
// Cursor = the ID of the last item seen — no offset needed
const tasks = await db
    .select()
    .from(tasks)
    .where(cursor ? lt(tasks.id, cursor) : undefined) // lt = less than
    .limit(limit)
    .orderBy(desc(tasks.createdAt));

//! Why cursor > offset: offset queries get slower as offset grows (DB scans all skipped rows)
```

---

## Testing with Vitest

Vitest = Vite-native test runner. !Same syntax as Jest, much faster.

```bash
npm install -D vitest
# in package.json: "test": "vitest"
```

### Unit test

```ts
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
    it('formats ISO string to readable date', () => {
        expect(formatDate('2024-01-15T00:00:00Z')).toBe('Jan 15, 2024');
    });

    it('returns empty string for null', () => {
        expect(formatDate(null)).toBe('');
    });
});
```

### Mocking

```ts
import { vi } from 'vitest';

// Mock a module
vi.mock('./db', () => ({
    db: { select: vi.fn().mockResolvedValue([{ id: '1', title: 'Test' }]) },
}));

// Mock a function
const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })));

// Reset between tests
beforeEach(() => vi.clearAllMocks());
```

### React component test (with React Testing Library)

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskForm } from './TaskForm';

it('calls onCreate with the input value', async () => {
    const onCreate = vi.fn();
    render(<TaskForm onCreate={onCreate} />);

    fireEvent.change(screen.getByPlaceholderText('Task title'), {
        target: { value: 'Buy milk' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(onCreate).toHaveBeenCalledWith('Buy milk');
});
```

---

## React — Advanced Patterns

### Context + custom hook (avoid prop drilling)

```tsx
// AuthContext.tsx
type AuthCtx = { user: User | null; logout: () => void };
const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
    };
    return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

// Custom hook — throws if used outside provider (good DX)
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}

// Usage anywhere in the tree
function Header() {
    const { user, logout } = useAuth();
    return <button onClick={logout}>{user?.name}</button>;
}
```

### useReducer (when useState gets messy)

```ts
// Use when: multiple related state values, next state depends on current state
type State = { tasks: Task[]; loading: boolean; error: string | null };
type Action = { type: 'FETCH_START' } | { type: 'FETCH_SUCCESS'; payload: Task[] } | { type: 'FETCH_ERROR'; payload: string } | { type: 'ADD_TASK'; payload: Task };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, tasks: action.payload };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload };
        case 'ADD_TASK':
            return { ...state, tasks: [action.payload, ...state.tasks] };
    }
}

const [state, dispatch] = useReducer(reducer, { tasks: [], loading: false, error: null });
dispatch({ type: 'FETCH_START' });
```

### Error boundary (catch render errors)

```tsx
// React class component — no hook equivalent yet
class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: Error) {
        console.error(error);
    } // log to Sentry etc.

    render() {
        return this.state.hasError ? this.props.fallback : this.props.children;
    }
}

// Usage
<ErrorBoundary fallback={<p>Something went wrong</p>}>
    <TaskList />
</ErrorBoundary>;
```

### Key React interview concepts

```ts
// Reconciliation — React diffs the virtual DOM, updates only what changed
// Keys — help React identify list items. Use stable IDs, never array index
// (index keys cause bugs when list items reorder)

// Lifting state — when two siblings need the same data, move state to their parent
// Composition — prefer children prop over deeply nested props

// Strict Mode — renders components twice in dev to surface side effects
<React.StrictMode><App /></React.StrictMode>
```

---

## Drizzle ORM — Relations API

For complex data shapes, use Drizzle's relations API instead of manual joins.

```ts
// schema.ts
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
});

export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
});

// Declare the relationship (Drizzle uses these for db.query.*)
export const usersRelations = relations(users, ({ many }) => ({
    tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
    user: one(users, { fields: [tasks.userId], references: [users.id] }),
}));
```

```ts
// Query with relations — Drizzle handles the JOIN for you
const usersWithTasks = await db.query.users.findMany({
    with: { tasks: true }, // eager load tasks
});
// Result: [{ id, name, tasks: [{ id, title, ... }] }]

// Filtering nested relations
const usersWithOpenTasks = await db.query.users.findMany({
    with: {
        tasks: {
            where: eq(tasks.completed, false),
            orderBy: desc(tasks.createdAt),
        },
    },
});
```

---

## Fastify — Schema Validation (JSON Schema)

Fastify can validate requests and serialize responses via JSON Schema — faster than Zod for serialization, built in.

```ts
const createTaskSchema = {
    body: {
        type: 'object',
        required: ['title'],
        properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                completed: { type: 'boolean' },
            },
        },
    },
};

fastify.post('/', { schema: createTaskSchema }, async (req, reply) => {
    // req.body is validated before reaching here — 400 sent automatically if invalid
    reply.code(201);
    return db.insert(tasks).values(req.body).returning();
});
// Bonus: response schema also strips extra fields (security) and serializes faster
```

---

## REST API Design

### HTTP status codes — the ones that matter

| Code | Meaning               | When to use                                |
| ---- | --------------------- | ------------------------------------------ |
| 200  | OK                    | GET success, PATCH/PUT success with body   |
| 201  | Created               | POST that creates a resource               |
| 204  | No Content            | DELETE success (no body)                   |
| 400  | Bad Request           | Validation error — client sent bad data    |
| 401  | Unauthorized          | Not authenticated (no/bad token)           |
| 403  | Forbidden             | Authenticated but not allowed              |
| 404  | Not Found             | Resource doesn't exist                     |
| 409  | Conflict              | Duplicate (e.g., email already registered) |
| 422  | Unprocessable Entity  | Semantically wrong (valid JSON, bad logic) |
| 500  | Internal Server Error | Unexpected server failure                  |

### Resource naming conventions

```text
GET    /tasks           → list tasks
POST   /tasks           → create task
GET    /tasks/:id       → get one task
PATCH  /tasks/:id       → partial update
PUT    /tasks/:id       → full replace
DELETE /tasks/:id       → delete

# Nested resources
GET    /users/:id/tasks → tasks belonging to a user

# Actions that don't fit CRUD — use a verb
POST   /tasks/:id/complete   ← this project does this
POST   /auth/login
POST   /auth/logout
```

---

## System Design — Deep Dive

> You may not be asked all of this, but knowing the vocabulary makes you sound senior.

### Monolith vs Microservices

```text
Monolith: one codebase, one deployable unit, one database
  ✓ Simple to develop, test, deploy — right for early-stage startups
  ✗ Hard to scale individual parts, one bug can take down everything
  ✗ Teams step on each other in one giant codebase

Microservices: each business domain is its own service with its own DB
  ✓ Scale services independently (e.g. video calls need more servers than billing)
  ✓ Teams own their service end-to-end
  ✗ Distributed system complexity: network failures, eventual consistency, tracing
  ✗ Operational overhead: each service needs its own CI/CD, monitoring, logging

Rule of thumb: start with a modular monolith, extract services when you feel
the pain — not before.
```

### Service Communication

```text
Synchronous (caller waits for response):
  REST (HTTP)  — simple, universal, good for external APIs
  gRPC         — binary protocol, typed contracts, faster, good for internal services

Asynchronous (fire and forget):
  Message queue (RabbitMQ, SQS) — one producer, one consumer
  Event bus (Kafka)              — one producer, many consumers, durable log

When to use async:
  - The caller doesn't need the result immediately
  - You want to decouple services (notifications, emails, analytics)
  - You want to retry failed operations automatically
  - You're crossing service boundaries where latency would add up
```

### API Gateway pattern

```text
Client → API Gateway → [Service A, Service B, Service C]

Gateway responsibilities:
  - Single entry point for all clients (mobile, web, 3rd party)
  - Auth / rate limiting in one place
  - Request routing to the right service
  - Aggregating responses (fan out to 3 services, combine results)

Tools: AWS API Gateway, Kong, Nginx, Traefik
```

### Caching (when and how)

```text
Problem: same DB query running 1000 times/second
Solution: cache the result in memory for N seconds

Layers:
  Browser cache   → HTTP Cache-Control headers, CDN
  Application     → Redis (shared across servers), in-memory Map (single server)
  Database        → query result cache, read replicas

Cache invalidation strategies:
  TTL (time-to-live)  — expire after 60s, simple, may serve stale data
  Write-through       — update cache on every write, fresh, more complex
  Cache-aside         — app checks cache first, writes to cache on miss

"There are only two hard things in CS: cache invalidation and naming things" — know this quote
```

### Database patterns

```text
Read replicas:
  Primary handles writes, replicas handle reads — horizontal read scaling
  Lag between primary and replica = eventual consistency (fine for dashboards,
  bad for "you just submitted a form, can you see it?" scenarios)

Connection pooling:
  Opening a DB connection is expensive. A pool keeps N connections open and
  reuses them. In Node: pg Pool, Drizzle/Prisma handle this automatically.
  Default pool size ~10. Too small = queued requests. Too large = DB overwhelmed.

Sharding:
  Split data across multiple databases by some key (e.g. userId % 4).
  Extremely complex — only needed at massive scale. Mention it, but don't oversell.

CQRS (Command Query Responsibility Segregation):
  Separate read models from write models. Write to normalized DB, read from
  denormalized/indexed view. Complex but great for analytics-heavy apps.
```

### Event-driven architecture

```text
Pattern: services emit events, other services react to them

Example (Solace-like):
  PatientService emits "patient.matched"
  → NotificationService sends welcome SMS
  → BillingService creates an invoice record
  → AnalyticsService logs the match event

Benefits: loose coupling, each service has one job, easy to add new consumers
Downside: hard to trace what caused what (need distributed tracing — Jaeger, Datadog)

Outbox pattern (solving the dual-write problem):
  Problem: write to DB + emit event — what if the event broker goes down between the two?
  Solution: write the event to an "outbox" table in the SAME transaction as the data,
  then a separate process reads the outbox and publishes to the broker.
```

### Horizontal vs vertical scaling

```text
Vertical: bigger server (more RAM/CPU) — simple, has a ceiling
Horizontal: more servers behind a load balancer — complex, unlimited scale

Load balancer strategies:
  Round-robin     — requests go to each server in turn
  Least connections — next request goes to server with fewest active connections
  Sticky sessions — same user always hits same server (needed for stateful apps)

Stateless APIs (JWT auth, no in-memory sessions) scale horizontally easily.
Sessions stored in Redis = also scales horizontally.
```

### Queue / background jobs

```text
Use case: sending emails, processing images, anything slow
Pattern: route handler enqueues a job → separate worker processes it
Tools: BullMQ (Redis-backed), Postgres-backed queues (pg-boss), AWS SQS

Why: keeps HTTP response fast (<200ms), decouples heavy work
Retry logic: failed jobs re-queued with exponential backoff
Dead letter queue (DLQ): jobs that fail too many times go here for inspection
```

### Rate limiting

```ts
// Prevent abuse — limit how many requests a user/IP can make
// Common strategies:

// Fixed window: max N requests per minute, counter resets at :00
// Sliding window: max N requests in the last 60 seconds (smoother)
// Token bucket: bucket of N tokens, refills at rate R/second (allows bursts)

// In Fastify:
import rateLimit from '@fastify/rate-limit';
app.register(rateLimit, {
    max: 100, // 100 requests...
    timeWindow: '1m', // ...per minute per IP
    // Redis-backed for multi-server setups:
    redis: new Redis(),
});
```

### Real-time features (WebSockets)

```ts
// HTTP: client asks, server answers — request/response
// WebSocket: persistent two-way connection — server can push anytime

// Use cases: live chat, notifications, collaborative editing, live dashboards

// In Fastify with @fastify/websocket:
fastify.get('/chat', { websocket: true }, (socket, req) => {
    socket.on('message', msg => {
        // broadcast to all connected clients
        for (const client of fastify.websocketServer.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        }
    });
    socket.on('close', () => {
        /* cleanup */
    });
});

// At scale: one server can't hold all WebSocket connections
// Solution: Redis pub/sub — servers subscribe to channels, broadcast across them
```

### Observability (the three pillars)

```text
Logs    — what happened (structured JSON logs, Pino in Fastify)
Metrics — how the system is performing (request rate, latency p99, error rate)
Traces  — how a request flowed through multiple services (Datadog, Jaeger, OpenTelemetry)

Key metrics to monitor:
  - Request latency (p50, p95, p99) — p99 = slowest 1% of requests
  - Error rate — % of 5xx responses
  - Throughput — requests per second
  - DB connection pool saturation
  - Queue depth — are background jobs piling up?
```

### HIPAA compliance basics (healthcare-specific)

```text
HIPAA = Health Insurance Portability and Accountability Act
PHI = Protected Health Information (name + health data together = PHI)

Technical requirements relevant to engineers:
  - Encryption at rest (database, S3 buckets must be encrypted)
  - Encryption in transit (TLS/HTTPS everywhere, no HTTP)
  - Access controls — users should only see their own data (row-level security)
  - Audit logs — who accessed what PHI, when (immutable log trail)
  - Minimum necessary — don't return more data than the client needs
  - Business Associate Agreements (BAAs) — AWS, Twilio, etc. must sign these

In code:
  - Never log PHI (no console.log(user.diagnosis))
  - Mask or redact PHI in error messages
  - Use separate encrypted columns for sensitive fields if possible
  - Role-based access: patient sees own data, advocate sees assigned patients only
```

### Designing a matching system (patient ↔ advocate)

```text
Simplified flow:
  1. Patient submits intake form (needs, location, insurance, language)
  2. System scores available advocates against those criteria
  3. Top match is assigned or patient selects from shortlist

Scoring factors: availability, specialization, language, location, past ratings

At scale:
  - Pre-compute advocate "slots" and store in Redis for fast lookup
  - Run matching async (queue job), notify patient when match found
  - Use a feature store if ML scoring is involved
```

---

## TypeScript — More Patterns

### Mapped types

```ts
// Make every property in T optional and nullable
type Nullable<T> = { [K in keyof T]: T[K] | null };

// Make every property readonly
type Immutable<T> = { readonly [K in keyof T]: T[K] };

// Remove null/undefined from all properties
type NonNullableProps<T> = { [K in keyof T]: NonNullable<T[K]> };
```

### Template literal types

```ts
type EventName = 'click' | 'focus' | 'blur';
type Handler = `on${Capitalize<EventName>}`; // 'onClick' | 'onFocus' | 'onBlur'

type Route = '/tasks' | '/users';
type ApiRoute = `/api/v1${Route}`; // '/api/v1/tasks' | '/api/v1/users'
```

### Conditional types

```ts
// If T extends string, use string, else use number
type StringOrNumber<T> = T extends string ? string : number;

// Unwrap a Promise
type Awaited<T> = T extends Promise<infer U> ? U : T;
// Awaited<Promise<string>> = string  (this is actually built into TS now)

// Extract only function properties from an object
type FunctionProps<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];
```

### satisfies operator (TS 4.9+)

```ts
// Problem: 'as const' loses type checking, type annotation loses literal types
const config = {
    port: 3000,
    env: 'production',
} satisfies { port: number; env: 'development' | 'production' };
// ✓ Type-checked against the shape
// ✓ config.env is still typed as 'production' (not widened to string)
```

---

## Browser DevTools — Deep Reference

> Chrome DevTools is the standard. Firefox has equivalent panels; Safari has Web Inspector.
> Knowing these well sets you apart — most devs only use the Console tab.

---

### Elements panel

```text
Inspect and live-edit the DOM and CSS.

Shortcuts:
  Cmd+Shift+C (Mac) / Ctrl+Shift+C  → enter inspect mode, click element to select
  F2 (while element selected)        → edit outer HTML directly

Right-click an element → "Break on" → DOM subtree modifications
  This adds a BREAKPOINT that pauses JS whenever that DOM node is changed.
  Extremely useful for "something is adding/removing this class and I don't know what."

Computed tab:
  Shows final resolved CSS after all cascading.
  Hover any property → see which CSS rule "won" and which were overridden.
  Check "Show all" to see inherited properties too.

Box model diagram at bottom of Styles tab — click values to edit padding/margin live.
```

---

### Console

```js
// Beyond console.log — these are actually useful

console.table(arrayOfObjects); // renders as a sortable table — great for arrays
console.dir(element); // shows DOM element as JS object (all properties)
console.group('label'); // collapsible group for nested logs
console.groupEnd();
console.time('label'); // start timer
console.timeEnd('label'); // logs "label: 123.4ms"
console.count('label'); // counts how many times this line ran
console.trace(); // prints a stack trace at the current call
console.assert(condition, 'message'); // only logs if condition is FALSE

// Log with CSS styling
console.log('%cError!', 'color: red; font-size: 20px');

// In the console REPL:
$0; // the currently selected element in the Elements panel
$('css'); // shorthand for document.querySelector()
$$('css'); // shorthand for document.querySelectorAll() (returns array, not NodeList)
$_; // the result of the last expression
copy($0); // copies value to clipboard
```

---

### Sources / Debugger panel

```text
This is the most powerful panel — most developers never open it.

Setting breakpoints:
  Click line number in source → adds a breakpoint (blue marker)
  Right-click line → "Add conditional breakpoint" → only pauses if expression is true
    Example: i === 99 (pause on last loop iteration only)
  Right-click line → "Add logpoint" → console.log without changing your code

When paused at a breakpoint:
  Step over (F10)     → run next line, don't enter functions
  Step into (F11)     → enter the function on the current line
  Step out  (Shift+F11) → finish current function, return to caller
  Resume    (F8)      → continue until next breakpoint

Right panel while paused:
  Watch     → add expressions to evaluate on every pause (e.g. user.id, arr.length)
  Call Stack → full list of how you got here — click any frame to jump to that context
  Scope     → all variables in current scope (Local, Closure, Global)
              This shows closure variables — the "stale closure" bug becomes visible here

XHR/fetch breakpoints:
  Sources → "XHR/fetch Breakpoints" → add a URL fragment
  Pauses whenever a fetch matching that URL fires — no code changes needed

Event listener breakpoints:
  Sources → "Event Listener Breakpoints" → check e.g. "click"
  Pauses on the next click event anywhere on the page

Never use debugger; statements in source files — use DevTools breakpoints instead.
They disappear on refresh and don't pollute your code.
```

---

### Network panel

```text
Every HTTP request your page makes — the most-used panel after Console.

Key columns:
  Status   — HTTP response code (200, 404, etc.)
  Type     — fetch, xhr, document, script, img, ws (WebSocket), preflight
  Initiator — which file/line triggered this request (click to jump to source)
  Size     — transfer size / actual size (gzip compression visible here)
  Time     — total duration (waterfall chart shows DNS, connect, wait, download)

Filtering:
  Type buttons at the top (XHR/Fetch, JS, CSS, Img, WS, etc.)
  Filter box: type a URL fragment to find a specific request
  "-domain:" to exclude e.g. analytics calls

Click a request → opens detail pane:
  Headers  → request/response headers (check Content-Type, Authorization, CORS headers)
  Payload  → request body (what you sent)
  Response → raw response body (what came back)
  Preview  → formatted JSON (easier to read)
  Timing   → breakdown: DNS, TCP, SSL, TTFB (Time To First Byte), content download

TTFB (Time To First Byte):
  Time from request sent to first byte received — this is your server response time.
  High TTFB = slow server/DB. High download = large payload or slow connection.

Throttling (dropdown at top):
  "Slow 3G" → simulate mobile network (critical for testing real-world UX)
  "Offline"  → test your error/fallback states

Preserve log checkbox: keeps requests across page navigations (for debugging redirects)
Disable cache checkbox: stops browser from serving cached responses
```

---

### Performance panel

```text
Record and analyze runtime performance — use when the page feels janky or slow.

How to use:
  1. Click Record (or Cmd+E)
  2. Interact with the page (scroll, click the thing that's slow)
  3. Stop recording
  4. Analyze the flame chart

Reading the flame chart:
  X axis = time
  Y axis = call stack (top = caller, bottom = deepest callee)
  Wide bars = slow — these are what you want to investigate
  Color coding:
    Yellow  = JavaScript execution
    Purple  = style recalculation / layout
    Green   = painting
    Blue    = HTML parsing

Key metrics at the top:
  FPS chart  → green = smooth (60fps), red = dropped frames (jank)
  CPU chart  → if maxed out, you have expensive JS or layout work

Long Tasks (red corner on task bar):
  Any task > 50ms blocks the main thread — no user interaction during that time
  These are your #1 performance enemy in a React app

Layout thrashing:
  Reading DOM geometry (getBoundingClientRect, offsetTop) FORCES the browser to
  recalculate layout immediately. Doing read → write → read → write in a loop
  can cause hundreds of forced reflows. Batch reads first, then writes.
```

---

### Memory panel

```text
Find and diagnose memory leaks.

Three tools:

1. Heap Snapshot
   Takes a point-in-time snapshot of all objects in memory.
   Workflow to find a leak:
     a. Snapshot 1 — baseline (page just loaded)
     b. Do the action you suspect leaks (navigate, open modal, search)
     c. Snapshot 2
     d. Change view to "Comparison" → shows what was ADDED between snapshots
     e. Look for: Detached DOM (DOM nodes removed from page but still referenced in JS)

2. Allocation Timeline
   Records allocations over time.
   Useful for: identifying which operations keep allocating without freeing.

3. Allocation Sampling (lightest weight)
   Samples allocations — lower overhead, less detail.
   Good for: profiling long sessions without crashing DevTools.

What to look for:
  Detached HTMLElement — DOM node removed from page but JS still holds a reference
  Array/Map growing forever — data appended but never cleared
  EventListener — listeners added but never removed (common with custom libraries)
```

---

### Application panel

```text
Inspect and manipulate browser storage + service workers.

Storage:
  Local Storage  → key/value, persists until cleared, synchronous
  Session Storage → key/value, cleared on tab close
  Cookies        → inspect name, value, domain, expiry, HttpOnly, Secure flags
  IndexedDB      → browse structured databases (used by heavier web apps)

For debugging: you can directly edit/delete values in the left panel.
Useful for: "log me in without going through the login form" (paste a JWT into localStorage).

Cache Storage / Service Worker:
  Cache Storage → shows what your service worker has cached (offline-first apps, PWAs)
  Service Worker tab → register state, update, skip waiting, push events

Clear all storage:
  Application → Storage → "Clear site data" button
  Clears cookies, localStorage, cache, IndexedDB in one click
  Equivalent of a "fresh browser" for that origin — great for testing first-load behavior.
```

---

### Lighthouse (Audits)

```text
Automated audit of performance, accessibility, SEO, and best practices.

Run it: DevTools → Lighthouse tab → Generate report
  Select: Mobile or Desktop (always check Mobile — it's stricter)
  Select which categories to audit

Key scores:
  Performance    → Core Web Vitals (LCP, CLS, FID/INP)
  Accessibility  → missing alt text, contrast, ARIA roles
  Best Practices → HTTPS, deprecated APIs, console errors
  SEO            → meta tags, robots.txt, crawlability

Core Web Vitals — what Google uses for search ranking:
  LCP (Largest Contentful Paint)  → loading speed — target < 2.5s
  CLS (Cumulative Layout Shift)   → visual stability (elements jumping around) — target < 0.1
  INP (Interaction to Next Paint) → responsiveness — target < 200ms (replaced FID in 2024)

Each suggestion has "Learn more" links and estimates how much fixing it would improve the score.
```

---

### DevTools tips that most people don't know

```js
// Force element state (hover, focus, active) without holding the mouse
// Elements panel → right-click element → "Force state" → :hover
// Now you can inspect hover CSS that disappears when you move the mouse

// Copy a fetch call as code
// Network panel → right-click request → "Copy" → "Copy as fetch"
// Paste into console to replay the exact request

// Blackbox a script (ignore it in stack traces)
// Sources → right-click file → "Add script to ignore list"
// Stack traces skip it — great for hiding library internals (React, lodash)

// Local overrides — edit files locally, browser serves your version
// Sources → Overrides tab → enable, pick a folder
// Any change you save persists across refreshes (without deploy)
// Use case: debug a production build by editing the minified file locally

// Live expressions in Console
// Click the eye icon → type an expression
// Evaluates it continuously — like a watch, but in the Console
// e.g.: document.querySelectorAll('.task').length — updates in real time

// Device emulation (mobile testing)
// Cmd+Shift+M → toggles responsive mode
// Choose a device from the dropdown, or set custom width/height
// Checks: touch events, viewport meta, hover states don't work on touch
// "Throttle CPU" slider: simulate a low-end Android (4x slowdown)
```

---

## Debugging Tips

### Fastify — log incoming requests

```ts
// Add this hook to see every request hit the server
app.addHook('onRequest', async req => {
    app.log.info({ method: req.method, url: req.url }, 'incoming request');
});

// Fastify uses pino — structured JSON logging
// In dev, pipe through pino-pretty: node server.js | npx pino-pretty
```

### Drizzle — log generated SQL

```ts
const db = drizzle(pool, { schema, logger: true }); // logs SQL to console

// Or custom logger
const db = drizzle(pool, {
    logger: {
        logQuery(query, params) {
            console.log('SQL:', query, params);
        },
    },
});
```

### React — common bugs

#### Stale closure in useEffect — explained

A **closure** is when a function "remembers" the variables from where it was created.

When `useEffect` runs, it creates a closure — it captures a **snapshot** of `count` at that moment.
With `[]` as the dependency array, the effect only runs **once on mount**.
The `setInterval` callback is created once and keeps reading the same frozen snapshot of `count` forever,
even as the real `count` state changes in React.

```text
Mount:   count = 0  →  interval created, captures count = 0
1 second later:      logs "0"   ← stale, count may be 5 by now
2 seconds later:     logs "0"   ← still stale
```

```ts
// ❌ THE PROBLEM — stale closure
const [count, setCount] = useState(0);

useEffect(() => {
    // This callback closes over count = 0 (its value at mount)
    // setInterval holds a reference to THIS function forever
    const id = setInterval(() => {
        console.log(count); // always prints 0, no matter how many times setCount is called
    }, 1000);
    return () => clearInterval(id);
}, []); // [] means "run once" — count is never re-captured
```

**Fix 1 — add `count` to the deps array**

React will tear down and recreate the interval each time `count` changes.
The new callback captures the fresh value.

```ts
// ✅ Correct — interval restarts whenever count changes
useEffect(() => {
    const id = setInterval(() => {
        console.log(count); // always the latest count
    }, 1000);
    return () => clearInterval(id);
}, [count]); // re-runs when count changes → fresh closure each time
// Downside: the timer resets every time count changes (usually fine)
```

**Fix 2 — `useRef` (when you need the latest value WITHOUT restarting the interval)**

A ref is a mutable box that lives outside the render cycle.
Reading `countRef.current` always gives the latest value because refs are not part of the closure snapshot.

```ts
// ✅ Correct — interval never restarts, but always reads latest count
const [count, setCount] = useState(0);
const countRef = useRef(count);

// Keep the ref in sync with state on every render
useEffect(() => {
    countRef.current = count;
});

useEffect(() => {
    const id = setInterval(() => {
        console.log(countRef.current); // reads the ref — always current, never stale
    }, 1000);
    return () => clearInterval(id);
}, []); // interval is created once and never restarted

// Mental model:
// state  → immutable snapshot per render (closures capture this)
// ref    → mutable box, same object every render (closures always see latest)
```

**Which fix to use:**

| Situation                             | Fix                                                        |
| ------------------------------------- | ---------------------------------------------------------- |
| Timer can reset when value changes    | Add to deps array                                          |
| Timer must be stable (e.g. game loop) | `useRef`                                                   |
| You're not sure                       | Add to deps array — it's simpler and almost always correct |

> One-line summary for the interview: _"The closure captured an old value because the effect only ran once. Adding it to the deps array re-creates the effect with a fresh closure whenever the value changes."_

```ts
// Object/array as useEffect dep — new reference every render = infinite loop
useEffect(() => { ... }, [{ id: 1 }]); // ❌ new object every render
useEffect(() => { ... }, [id]);         // ✅ primitive value

// Async in useEffect — can't make the callback async directly
useEffect(() => {
  // ❌ useEffect(async () => ...) — returns Promise, React ignores it
  // ✅ Define and call async function inside
  const load = async () => { const data = await fetch(...); setData(data); };
  load();
}, []);
```

---

## Common Interview Questions — Quick Answers

### "What is the event loop?"

JavaScript is single-threaded. The event loop processes the call stack first, then the micro-task queue (Promises), then the macro-task queue (setTimeout, I/O). This is why `await` doesn't block the server — the runtime can handle other requests while waiting for DB responses.

### "Explain async/await vs callbacks vs Promises."

Callbacks = manual chaining, leads to callback hell. Promises = chainable `.then()`, better but still noisy. Async/await = syntactic sugar over Promises — same under the hood, but reads like synchronous code. They all solve the same problem: handling operations that don't complete immediately.

### "What is closure?"

A function that captures variables from its outer scope, even after that scope has returned. The `useCallback` deps array problem is a closure bug — the callback closes over a stale variable.

### "Explain the difference between == and ===."

`==` coerces types (`"5" == 5` is true). `===` checks value and type (`"5" === 5` is false). Always use `===` in TypeScript.

### "What is a memory leak in React?"

Setting state on an unmounted component. Common pattern: fetch starts, component unmounts before fetch resolves, then setState is called. Fix: use an `AbortController` to cancel the fetch on cleanup, or check if component is still mounted.

```ts
useEffect(() => {
    const controller = new AbortController();
    fetch('/tasks', { signal: controller.signal })
        .then(r => r.json())
        .then(setTasks)
        .catch(e => {
            if (e.name !== 'AbortError') console.error(e);
        });
    return () => controller.abort(); // cleanup
}, []);
```

### "What is CORS and how do you fix it?"

Cross-Origin Resource Sharing — browsers block requests from `http://localhost:5173` to `http://localhost:3000` by default (different ports = different origin). Fix: server adds `Access-Control-Allow-Origin` header. In Fastify: `app.register(cors, { origin: 'http://localhost:5173' })`.

### "How does React render work?"

Parent renders → React diffs virtual DOM vs previous → only changed DOM nodes are updated (reconciliation). `React.memo` skips re-render if props haven't changed. `key` prop tells React how to match list items across renders.

---

## Solace Health — Company Intel

**What they do:** Patient advocacy platform. They connect patients (primarily Medicare-covered) with trained health advocates — RNs, social workers — who help navigate the US healthcare system: scheduling appointments, interpreting treatment plans, handling medical billing disputes, coordinating care. Serves 20,000+ patients/month. Valued at $1B+ (Series C, Feb 2026, $211M raised total).

**Why this matters for the interview:** They're not just a CRUD app. They're a marketplace (patient ↔ advocate matching), a healthcare platform (HIPAA-regulated PHI everywhere), and a communications platform (text, phone, video). Every engineering decision has a compliance dimension.

---

### What their platform almost certainly involves

```text
Core domains:
  Patients        — intake, profile, care history, insurance info (PHI-heavy)
  Advocates       — profiles, availability, specializations, caseloads
  Matching        — pairing patients to advocates (rule-based or ML-scored)
  Messaging       — text/phone/video between patient and advocate
  Clinical docs   — care plans, notes, task checklists (their proprietary EHR)
  Billing         — Medicare billing, invoice generation, claims status
  Physician oversight — supervising physicians reviewing advocate activity

Likely tech bets (based on job postings + funding stage):
  TypeScript + React (frontend)
  Node.js (backend — they hired for TS/Node explicitly)
  PostgreSQL (confirmed in job postings)
  HIPAA-compliant infra: AWS with BAAs (S3, RDS, etc.)
  Twilio or similar for SMS/video
  Redis for sessions/queues
  Some form of event-driven notifications (new patient assigned, task due)
```

---

### Problems they're probably solving right now (at their scale)

```text
1. Advocate capacity management
   - 20k+ patients, finite advocates — how do you load-balance caseloads?
   - Real-time availability tracking, not just static assignments

2. Compliance at scale
   - Every piece of health data is PHI — audit logs, access controls, data residency
   - Medicare billing has strict rules — bad data = claim denied or clawback

3. Care continuity
   - Patient's advocate goes on leave — seamless handoff with no context loss
   - Building a "care timeline" that any new advocate can pick up cold

4. Async communication at scale
   - Patient sends a message at 2am — advocate sees it at 8am
   - Need read receipts, priority routing, escalation if unanswered

5. Reporting for physicians
   - Supervising physicians need dashboards: which patients are at risk?
   - Aggregate trends without exposing individual PHI to wrong parties
```

---

### Questions to ask Solace specifically

These show you understand their domain, not just generic engineering:

- "How do you handle the data model when a patient is reassigned to a new advocate — do they inherit the full care history?"
- "How do you approach HIPAA audit logging at scale — is every PHI access row-logged in Postgres or do you use a separate audit service?"
- "What does advocate availability look like technically — is it calendar-based, shift-based, or capacity-based?"
- "How do you handle the physician oversight layer — is that a separate interface or integrated into the advocate workflow?"
- "With 20k patients a month, how are you thinking about scaling the matching algorithm — rule-based today, ML later?"
- "What's your approach to schema migrations when downtime would affect patient care workflows?"
- "How do you balance moving fast (startup pace) with the compliance obligations that come with handling PHI?"

---

### Things to work into your answers if they come up

```text
"For a HIPAA-regulated platform, I'd want to make sure..."
  → audit logs, encryption at rest/transit, role-based access, minimum-necessary data returns

"At a marketplace with two sides (patients and advocates)..."
  → different auth roles, different data access patterns, matching logic as a separate concern

"Given you handle real-time communication..."
  → WebSockets or SSE for live status, fallback to polling, message queues for reliability

"At 20k patients/month growing fast..."
  → I'd think about connection pooling, read replicas for reporting, async for non-critical paths
```

---

## Think Out Loud — Interview Phrases

> For non-native speakers: the goal is NOT perfect grammar. The goal is to keep talking so the interviewer can follow your thinking. A simple sentence said clearly beats a perfect sentence said after 30 seconds of silence.

---

### When you first hear the question — buy yourself time

These are natural ways to pause and think without going silent:

- "Let me make sure I understand the problem first..."
- "Okay, so if I'm reading this right, we need to..."
- "Let me think through this for a second."
- "That's an interesting one — give me just a moment to think."
- "Before I start writing code, let me think about the approach."
- "Can I take a minute to think out loud?"

---

### When you need to clarify something

Never guess what they mean — asking shows good instincts:

- "Just to make sure I'm on the right track — are we expecting the input to always be...?"
- "One thing I want to clarify: should this handle the case where...?"
- "Is it okay if I assume X for now and we can revisit later?"
- "What should happen if the user sends an empty value — should we reject it or ignore it?"
- "Are there any constraints I should know about, like expected data size or performance requirements?"

---

### When you're explaining your approach

- "My first instinct is to do X, because..."
- "I'm going to start simple and we can optimize if needed."
- "The way I'm thinking about this is..."
- "There are a couple of ways to do this — I'll go with X because it's simpler, but Y would work better if we needed..."
- "Let me talk through what happens step by step when this request comes in."
- "The tricky part here is..."
- "What I want to avoid is..."

---

### While you're writing code (keep talking)

This is the most important part — do not go quiet:

- "So here I'm creating... "
- "I'm going to name this X because..."
- "Let me handle the happy path first, then the error case."
- "I'll leave a comment here — this is the part I want to come back to."
- "This is a rough version — I'll clean it up once the logic is working."
- "I'm using X here instead of Y because..."
- "Actually, wait — let me rethink this part."
- "Let me just double-check my logic here..."

---

### When you make a mistake or want to change direction

Making mistakes is fine — how you recover is what they're watching:

- "Actually, I think there's a better way to do this."
- "Let me step back — I don't think that approach is quite right."
- "I realized I made an assumption that isn't quite right — let me fix that."
- "That's a bug, actually — if the input is X, this would fail because..."
- "Let me rethink this. The issue with what I wrote is..."
- "I'm going to refactor this slightly — I want to make it clearer."

---

### When you're stuck — do NOT go silent

Saying you're stuck out loud is far better than silent staring:

- "I'm not 100% sure about this part — let me think through it out loud."
- "I know the general idea but I'm blanking on the exact syntax — let me work through it."
- "I'd normally look this up, but let me reason through what it should be..."
- "I think there's something with X that I'm not remembering exactly — can I talk through what I do know?"
- "I'm between two approaches and not sure which one is better — can I think through the trade-offs?"

---

### When you finish — don't just stop

- "Okay, so this handles the basic case. What I'd add next would be..."
- "This works, but there are a few things I'd want to improve: first, the error handling could be more specific. Second..."
- "Let me walk through a quick test case to make sure this does what I think it does."
- "Is there a specific edge case you'd like me to handle?"
- "I'd also add some validation here in production — I skipped it to keep it focused."

---

### When they push back or challenge your answer

This is not an attack — they want to see how you think under pressure:

- "That's a fair point. Let me think about that."
- "You're right — I didn't consider that case. If we have X, then my current code would..."
- "Good catch. I think the fix would be to..."
- "I see what you mean. My thinking was X, but I can see why Y is better because..."
- "I'm not sure I have the perfect answer to that — what direction would you lean?"

---

### Useful sentence starters (for when you can't find the word)

English filler phrases that buy you a second without sounding awkward:

- "So basically..."
- "The thing is..."
- "What I mean is..."
- "In other words..."
- "Let me put it this way..."
- "If I understand correctly..."
- "My concern with that approach is..."
- "The reason I went with X is..."

---

### Words that sound confident (use these)

| Instead of...         | Say this                                                             |
| --------------------- | -------------------------------------------------------------------- |
| "I don't know"        | "I'm not sure, but my instinct is..."                                |
| "I forgot"            | "I'd look this up, but I know it works roughly like..."              |
| "Is this right?"      | "I think this is right — does this match what you had in mind?"      |
| "Sorry, I'm confused" | "Let me make sure I understand — are you saying...?"                 |
| "I can't do this"     | "I'm not immediately seeing the solution — let me break it down."    |
| "This is wrong"       | "Actually, let me revisit this — I think there's a better approach." |

## Role-Based Access Control (RBAC)

Solace has at least 3 user types: patient, advocate, physician. How you model and enforce access matters.

### Modelling roles

```ts
// schema.ts — add role to users table
export const users = pgTable('users', {
  id:    uuid('id').primaryKey().defaultRandom(),
  name:  text('name').notNull(),
  email: text('email').notNull().unique(),
  role:  text('role', { enum: ['patient', 'advocate', 'admin'] }).notNull().default('patient'),
});
```

### Enforcing in Fastify — role guard hook

```ts
// Attach this as a preHandler to routes that need a specific role
function requireRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) return reply.code(401).send({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}

// Usage on routes
fastify.get('/admin/users', { preHandler: requireRole('admin') }, async req => { ... });
fastify.get('/advocate/caseload', { preHandler: requireRole('advocate', 'admin') }, async req => { ... });
```

### Row-level security — users can only see their own data

```ts
// ❌ Never do this — any userId can be passed in the URL
fastify.get('/tasks/:userId', async req => {
  return db.select().from(tasks).where(eq(tasks.userId, req.params.userId));
});

// ✅ Always filter by the authenticated user's id from the JWT
fastify.get('/tasks', async req => {
  return db.select().from(tasks).where(eq(tasks.userId, req.user.userId));
});
```

### RBAC vs ABAC — know the difference

```text
RBAC (Role-Based Access Control):
  Access is granted by role. Simple, predictable.
  "Advocates can read patient records, patients cannot."
  Good for: most apps, including Solace.

ABAC (Attribute-Based Access Control):
  Access based on attributes of user + resource + environment.
  "Advocate can read patient record ONLY IF they are assigned to that patient."
  More powerful but complex. Solace almost certainly uses this for patient↔advocate relationship.

// ABAC check in a route:
fastify.get('/patients/:patientId', { preHandler: requireRole('advocate') }, async req => {
  // Not just "are you an advocate?" but "are you THIS patient's advocate?"
  const assignment = await db.select().from(assignments)
    .where(and(
      eq(assignments.advocateId, req.user.userId),
      eq(assignments.patientId, req.params.patientId)
    ));
  if (!assignment.length) return reply.code(403).send({ error: 'Not your patient' });
  // ...
});
```

---

## Production Database Migrations

`drizzle-kit push` is dev-only — it applies changes directly. In production you need migration files + safe rollout.

### The workflow

```bash
# 1. Change schema.ts (e.g. add a new column)

# 2. Generate a migration file (SQL diff, committed to git)
npx drizzle-kit generate
# Creates: drizzle/0001_add_priority_to_tasks.sql

# 3. Review the generated SQL before applying!
cat drizzle/0001_add_priority_to_tasks.sql

# 4. Apply in production (CI/CD runs this before deploy)
npx drizzle-kit migrate
```

### Zero-downtime migrations — the expand/contract pattern

Dropping or renaming a column while the old server is still running = downtime. Safe approach:

```text
Phase 1 — Expand (deploy new code that writes BOTH old and new)
  - Add the new column (nullable, no NOT NULL yet)
  - New code writes to both old and new column
  - Old code still reads old column — no breakage

Phase 2 — Migrate data
  - Backfill: UPDATE tasks SET new_col = old_col WHERE new_col IS NULL
  - Run in batches on large tables to avoid locking

Phase 3 — Contract (deploy code that only uses new column)
  - Add NOT NULL constraint once all rows are populated
  - Old code is gone — safe to drop old column in next deploy
```

### What NOT to do in a single migration

```sql
-- ❌ These lock the table and can cause downtime on large tables:
ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'; -- full table rewrite on old Postgres
ALTER TABLE tasks RENAME COLUMN title TO name;                        -- breaks old code still running
ALTER TABLE tasks DROP COLUMN old_field;                              -- data loss if old code still reads it

-- ✅ Safe alternatives:
ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium';          -- nullable first, backfill, then add NOT NULL
-- For rename: add new column → backfill → update code → drop old column (3 deploys)
```

### Drizzle migration tracking

```text
Drizzle stores applied migrations in a __drizzle_migrations table.
Running drizzle-kit migrate again is idempotent — already-applied migrations are skipped.
Always commit migration files to git — they are the source of truth for DB state.
```

---

## Optimistic Updates

Update the UI immediately on user action, roll back if the server fails. Makes the app feel instant.

### The pattern

```ts
// useTasks.ts — optimistic complete
const completeTask = async (id: string) => {
  // 1. Save previous state for rollback
  const previousTasks = tasks;

  // 2. Update UI immediately (optimistic)
  setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));

  try {
    // 3. Fire the actual request
    await fetch(`/tasks/${id}/complete`, { method: 'PATCH' });
    // Success — UI is already correct, nothing more to do
  } catch (err) {
    // 4. Server failed — roll back to previous state
    setTasks(previousTasks);
    // Optionally show an error toast
  }
};
```

### Optimistic delete

```ts
const deleteTask = async (id: string) => {
  const previousTasks = tasks;
  setTasks(prev => prev.filter(t => t.id !== id)); // remove immediately

  try {
    await fetch(`/tasks/${id}`, { method: 'DELETE' });
  } catch {
    setTasks(previousTasks); // put it back on failure
  }
};
```

### When to use it

```text
✓ Toggle (complete/uncomplete) — near-zero failure rate, feels instant
✓ Delete — removing from list immediately is great UX
✓ Any mutation that is usually expected to succeed

✗ Create — you don't have the server-generated ID yet (use a temp ID, swap on success)
✗ Operations with meaningful failure modes — show loading state instead
```

---

## Soft Deletes

Healthcare apps almost never hard-delete data — audit trails, compliance, accidental delete recovery.

### Schema

```ts
export const tasks = pgTable('tasks', {
  id:        uuid('id').primaryKey().defaultRandom(),
  title:     text('title').notNull(),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),  // NULL = active, timestamp = deleted
});
```

### Queries — always filter out deleted rows

```ts
import { isNull } from 'drizzle-orm';

// SELECT — exclude soft-deleted
db.select().from(tasks).where(isNull(tasks.deletedAt));

// "DELETE" — set the timestamp instead
const [task] = await db.update(tasks)
  .set({ deletedAt: new Date() })
  .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
  .returning();

// Restore
await db.update(tasks)
  .set({ deletedAt: null })
  .where(eq(tasks.id, id));

// Hard delete (admin only, purge after retention period)
await db.delete(tasks).where(eq(tasks.id, id));
```

### The footgun — forgetting the filter

```ts
// ❌ This returns deleted records too
db.select().from(tasks).where(eq(tasks.userId, userId));

// ✅ Always include the soft-delete filter
db.select().from(tasks).where(
  and(eq(tasks.userId, userId), isNull(tasks.deletedAt))
);

// Common pattern: wrap in a helper or use a view
// CREATE VIEW active_tasks AS SELECT * FROM tasks WHERE deleted_at IS NULL;
```

### Why healthcare specifically

```text
HIPAA requires audit trails — knowing WHEN something was deleted is as important as the data itself.
Medicare billing: a deleted record may still be referenced in a claim.
Legal holds: data may be frozen pending an investigation — hard delete is forbidden.
```

---

## React Query (TanStack Query)

The de-facto standard for server state in React apps. Replaces manual fetch + useState + useEffect patterns.

### Why use it over a custom hook

```text
Custom fetch hook gives you:   data, loading, error
React Query gives you for free: data, loading, error, caching, deduplication,
  background refetch, stale-while-revalidate, retry, pagination, optimistic updates, devtools
```

### Basic usage

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetching — replaces useEffect + fetch + useState
function TaskList() {
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks'],          // cache key — same key = same cached data
    queryFn: () => fetch('/tasks').then(r => r.json()),
    staleTime: 30_000,            // treat data as fresh for 30s (no refetch)
  });

  if (isLoading) return <Spinner />;
  if (error) return <p>Error loading tasks</p>;
  return tasks.map(t => <TaskRow key={t.id} task={t} />);
}
```

### Mutations — create / update / delete

```tsx
function TaskForm() {
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: (title: string) =>
      fetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({ title }),
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json()),

    // After success — invalidate the cache so the list refetches
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return (
    <button onClick={() => createTask.mutate('New task')} disabled={createTask.isPending}>
      {createTask.isPending ? 'Adding...' : 'Add Task'}
    </button>
  );
}
```

### Optimistic update with React Query

```ts
useMutation({
  mutationFn: (id: string) => fetch(`/tasks/${id}/complete`, { method: 'PATCH' }),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['tasks'] });
    const previous = queryClient.getQueryData(['tasks']);         // snapshot
    queryClient.setQueryData(['tasks'], (old: Task[]) =>          // optimistic update
      old.map(t => t.id === id ? { ...t, completed: true } : t)
    );
    return { previous };                                          // returned as context
  },
  onError: (_err, _id, context) => {
    queryClient.setQueryData(['tasks'], context?.previous);       // rollback
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });       // sync with server
  },
});
```

### One-liner mental model for the interview

```text
"React Query separates server state from UI state. Local useState is for form inputs
and toggles. Remote data — anything from an API — belongs in React Query, which
handles caching, deduplication, and background sync automatically."
```

---

## SSE (Server-Sent Events) vs WebSockets

Both push data from server to client. SSE is simpler and often sufficient.

### Comparison

```text
                    SSE                           WebSocket
Protocol            HTTP/1.1 (EventSource API)    WS (separate protocol upgrade)
Direction           Server → Client only          Bidirectional
Browser reconnect   Automatic                     Manual
Complexity          Trivial                       Moderate
Use when            Notifications, live feeds     Chat, collaborative editing, games
Proxy/CDN support   Works out of the box          Needs explicit WS support
```

### SSE in Fastify

```ts
fastify.get('/events', async (req, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders();

  // Send a message
  const send = (event: string, data: unknown) => {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('connected', { message: 'Stream open' });

  // Example: send a notification every 10 seconds
  const interval = setInterval(() => {
    send('ping', { time: new Date().toISOString() });
  }, 10_000);

  // Cleanup when client disconnects
  req.raw.on('close', () => clearInterval(interval));
});
```

### SSE in React

```ts
useEffect(() => {
  const es = new EventSource('/events');

  es.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data);
    setNotifications(prev => [data, ...prev]);
  });

  es.onerror = () => es.close(); // browser auto-reconnects by default

  return () => es.close(); // cleanup on unmount
}, []);
```

### When to use each at Solace

```text
SSE:        Advocate gets notified when a new patient is assigned to them
SSE:        Patient sees "Your advocate is typing..." status update
WebSocket:  Real-time messaging between patient and advocate (bidirectional)
WebSocket:  Collaborative care plan editing (multiple advocates on one record)
```

---

## File Uploads — Fastify + S3

Uploading care documents, insurance cards, etc. to S3. Never stream files through your server to S3 — use presigned URLs.

### Pattern 1 — Presigned URL (recommended)

Client gets a short-lived S3 URL, uploads directly to S3. Server never sees the file bytes.

```ts
// Server: generate presigned upload URL
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1' });

fastify.post<{ Body: { filename: string; contentType: string } }>(
  '/upload-url',
  async (req) => {
    const key = `documents/${req.user.userId}/${Date.now()}-${req.body.filename}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: req.body.contentType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
    return { url, key }; // client uses url to PUT, then sends key back to save in DB
  }
);
```

```ts
// Client: upload directly to S3
const { url, key } = await fetch('/upload-url', {
  method: 'POST',
  body: JSON.stringify({ filename: file.name, contentType: file.type }),
}).then(r => r.json());

await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

// Then tell your API to save the reference
await fetch('/documents', { method: 'POST', body: JSON.stringify({ key, name: file.name }) });
```

### Pattern 2 — Multipart upload through your server (simpler, smaller files)

```ts
import multipart from '@fastify/multipart';
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

fastify.post('/upload', async (req, reply) => {
  const data = await req.file(); // single file
  const buffer = await data.toBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `uploads/${Date.now()}-${data.filename}`,
    Body: buffer,
    ContentType: data.mimetype,
  }));

  reply.code(201).send({ ok: true });
});
```

### HIPAA note for documents

```text
S3 buckets storing PHI must:
  - Have server-side encryption enabled (SSE-S3 or SSE-KMS)
  - Block all public access (no public ACLs)
  - Be covered by an AWS BAA (Business Associate Agreement)
  - Have access logging enabled (who downloaded what document, when)
  - Use presigned URLs with short expiry (not permanent public URLs)
```

---

## Questions to Ask Them

- "How do you handle schema migrations in production?"
- "What does local dev look like — Docker, shared dev DB?"
- "How do you handle auth — JWT, sessions, or something else?"
- "What's the biggest technical challenge the team is working through right now?"
- "What do you look for most in code review?"
- "How does HIPAA compliance shape your day-to-day engineering decisions?"
- "How big is the eng team and how are squads structured?"
