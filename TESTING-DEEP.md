# Testing — Senior Developer Deep Reference

> Covers the testing pyramid, unit/integration/E2E testing, TDD, mocking, and interview topics.

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Unit Testing with Vitest](#2-unit-testing-with-vitest)
3. [Integration Testing](#3-integration-testing)
4. [React Component Testing](#4-react-component-testing)
5. [End-to-End Testing with Playwright](#5-end-to-end-testing-with-playwright)
6. [Mocking & Test Doubles](#6-mocking--test-doubles)
7. [Test-Driven Development (TDD)](#7-test-driven-development-tdd)
8. [Code Coverage](#8-code-coverage)
9. [Performance Testing](#9-performance-testing)
10. [Testing Patterns & Anti-patterns](#10-testing-patterns--anti-patterns)
11. [Common Interview Questions](#11-common-interview-questions)

---

## 1. Testing Philosophy

### The testing pyramid

```text
                    /\
                   /  \
                  / E2E \         Few, slow, expensive, high confidence
                 /--------\
                /Integration\     Some, medium speed, test real interactions
               /--------------\
              /   Unit Tests    \  Many, fast, cheap, test logic in isolation
             /------------------\

Ratio guideline: 70% unit / 20% integration / 10% E2E

Unit:        fast (ms), isolated, test one thing
Integration: slower (s), test component interactions (real DB, real API)
E2E:         slowest (10s+), test full user flows in a real browser

The trophy (Kent C. Dodds alternative):
  Static analysis > Unit > Integration > E2E
  Puts more weight on integration tests vs unit tests
  "Write tests. Not too many. Mostly integration."
```

### What to test

```text
Test behavior, not implementation:
  ✓ "When user submits form with valid data, task is created"
  ✗ "useState is called with the correct value"
  ✗ "fetchData function was called once"

Test the public interface, not internals:
  ✓ Test what the function RETURNS
  ✓ Test what the component RENDERS
  ✗ Test private methods, internal state

Test the things most likely to break:
  ✓ Business logic (calculations, validations, rules)
  ✓ Error paths (what happens when things fail)
  ✓ Edge cases (empty arrays, null values, large inputs)
  ✗ Framework code (React itself is tested by Meta)
  ✗ Third-party library behavior
  ✗ Trivial getters/setters with no logic
```

---

## 2. Unit Testing with Vitest

### Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,           // no need to import describe, it, expect
    environment: 'node',     // or 'jsdom' for browser-like environment
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.*'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
```

```ts
// src/test/setup.ts — runs before each test file
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup(); // cleanup React components after each test
});
```

### Writing unit tests

```ts
// src/lib/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, sanitizeInput } from './validation';

describe('validateEmail', () => {
  it('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user+tag@sub.domain.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });

  // Edge cases are important
  it('handles null and undefined gracefully', () => {
    expect(validateEmail(null as any)).toBe(false);
    expect(validateEmail(undefined as any)).toBe(false);
  });
});

describe('validatePassword', () => {
  it('requires minimum 8 characters', () => {
    expect(validatePassword('short').valid).toBe(false);
    expect(validatePassword('short').error).toBe('Minimum 8 characters');
    expect(validatePassword('longenough').valid).toBe(true);
  });

  it('requires at least one number', () => {
    expect(validatePassword('NoNumbers!').valid).toBe(false);
    expect(validatePassword('Has1Number!').valid).toBe(true);
  });
});
```

### Testing async code

```ts
// src/services/taskService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTask, getTaskById } from './taskService';
import { db } from '../db';

// Mock the entire db module
vi.mock('../db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

describe('createTask', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // reset all mocks before each test
  });

  it('creates a task with correct data', async () => {
    const mockTask = { id: 'uuid-1', title: 'Test task', done: false };

    // Chain mock: db.insert().values().returning() = [mockTask]
    const returningMock = vi.fn().mockResolvedValue([mockTask]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as any);

    const result = await createTask({ title: 'Test task' });

    expect(db.insert).toHaveBeenCalledWith(expect.any(Object));
    expect(valuesMock).toHaveBeenCalledWith({ title: 'Test task' });
    expect(result).toEqual(mockTask);
  });

  it('throws when db returns empty result', async () => {
    const returningMock = vi.fn().mockResolvedValue([]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as any);

    await expect(createTask({ title: 'Test' })).rejects.toThrow('Failed to create task');
  });
});
```

### Snapshot testing

```ts
// Good for: stable outputs (serialized data, rendered HTML structure)
// Bad for: anything that changes often — snapshots become noise

import { expect, it } from 'vitest';

it('serializes user to expected format', () => {
  const user = { id: '123', name: 'Alice', role: 'admin', createdAt: new Date('2024-01-01') };
  expect(serializeUser(user)).toMatchInlineSnapshot(`
    {
      "id": "123",
      "name": "Alice",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z",
    }
  `);
});

// Update snapshots: vitest --update-snapshots
// Inline snapshots (above) are better than file snapshots — visible in code review
```

---

## 3. Integration Testing

### API integration tests (Fastify)

```ts
// tests/integration/tasks.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/app';
import { db } from '../../src/db';
import { tasks, users } from '../../src/db/schema';
import { sql } from 'drizzle-orm';

// Use a real test database — NOT mocks
// DATABASE_URL in .env.test points to a test DB

describe('Task API Integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();

    // Create test users and get tokens
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: 'user@test.com', password: 'testpassword' },
    });
    userToken = loginRes.json().accessToken;
  });

  afterAll(async () => {
    await app.close();
    await db.execute(sql`TRUNCATE tasks, users CASCADE`);
  });

  beforeEach(async () => {
    // Clean tasks before each test for isolation
    await db.delete(tasks);
  });

  describe('GET /tasks', () => {
    it('returns empty array when no tasks', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/tasks',
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    });

    it('returns tasks belonging to authenticated user', async () => {
      // Seed a task
      await db.insert(tasks).values({ title: 'My task', userId: 'user-id' });
      await db.insert(tasks).values({ title: 'Other user task', userId: 'other-id' });

      const res = await app.inject({
        method: 'GET',
        url: '/tasks',
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1); // only sees own task
      expect(res.json().data[0].title).toBe('My task');
    });
  });

  describe('POST /tasks', () => {
    it('creates a task and returns 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/tasks',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { title: 'New task', priority: 'high' },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({
        title: 'New task',
        priority: 'high',
        done: false,
      });
      expect(res.json().id).toBeDefined();

      // Verify persisted in DB
      const [dbTask] = await db.select().from(tasks);
      expect(dbTask.title).toBe('New task');
    });

    it('returns 400 for missing title', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/tasks',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { priority: 'high' }, // missing title
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain('Validation');
    });

    it('returns 401 without authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload: { title: 'Test' },
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
```

### Database integration tests

```ts
// tests/integration/db.test.ts — test DB queries directly
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db';
import { tasks } from '../../src/db/schema';
import { findTasksByUserId, createTask } from '../../src/db/queries/tasks';

describe('Task DB queries', () => {
  beforeEach(async () => {
    await db.delete(tasks); // clean state
  });

  it('findTasksByUserId returns only that user tasks ordered by createdAt desc', async () => {
    await db.insert(tasks).values([
      { title: 'Task A', userId: 'user-1', createdAt: new Date('2024-01-01') },
      { title: 'Task B', userId: 'user-1', createdAt: new Date('2024-01-03') },
      { title: 'Task C', userId: 'user-2', createdAt: new Date('2024-01-02') }, // different user
    ]);

    const result = await findTasksByUserId('user-1');

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task B'); // most recent first
    expect(result[1].title).toBe('Task A');
  });
});
```

---

## 4. React Component Testing

### Setup

```bash
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

```ts
// vite.config.ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
}

// src/test/setup.ts
import '@testing-library/jest-dom'; // adds toBeInTheDocument, toHaveValue, etc.
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
```

### Component testing principles

```tsx
// src/components/TaskForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TaskForm } from './TaskForm';

// Query priority (always use this order):
// 1. getByRole          — most accessible (button, textbox, heading, checkbox)
// 2. getByLabelText     — form fields with labels
// 3. getByPlaceholderText
// 4. getByText
// 5. getByDisplayValue  — form elements by current value
// 6. getByAltText       — images
// 7. getByTestId        — last resort (fragile, doesn't test UX)

describe('TaskForm', () => {
  it('renders the form elements', () => {
    render(<TaskForm onSubmit={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: /task title/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /priority/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TaskForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'Buy groceries');
    await user.selectOptions(screen.getByRole('combobox', { name: /priority/i }), 'high');
    await user.click(screen.getByRole('button', { name: /add task/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Buy groceries', priority: 'high' });
  });

  it('shows validation error for empty title', async () => {
    const user = userEvent.setup();
    render(<TaskForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add/i }));

    // Wait for async validation
    await screen.findByRole('alert'); // findBy* waits for element to appear
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
    expect(screen.getByRole('button')).not.toBeDisabled(); // can try again
  });

  it('disables button while submitting', async () => {
    const user = userEvent.setup();
    // onSubmit is slow — simulates API call
    const onSubmit = vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 100)));

    render(<TaskForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'Task');
    await user.click(screen.getByRole('button', { name: /add/i }));

    // Button disabled immediately after click
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveTextContent(/submitting/i);

    // Re-enabled after complete
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
  });

  it('clears form after successful submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<TaskForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'My task');
    await user.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue('');
    });
  });
});
```

### Testing with providers (Context, Router, etc.)

```tsx
// src/test/renderWithProviders.tsx — a custom render wrapper
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // don't retry in tests — fail fast
    },
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    user = null,
    ...renderOptions
  } = {}
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider initialUser={user}>
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Usage
it('shows admin button for admin users', () => {
  renderWithProviders(<Dashboard />, {
    user: { id: '1', name: 'Admin', role: 'admin' },
  });

  expect(screen.getByRole('button', { name: /admin panel/i })).toBeInTheDocument();
});
```

### Testing hooks

```tsx
import { renderHook, act } from '@testing-library/react';
import { useTasks } from './useTasks';

it('loads tasks on mount', async () => {
  vi.mocked(fetchTasks).mockResolvedValue([{ id: '1', title: 'Test task' }]);

  const { result } = renderHook(() => useTasks());

  expect(result.current.loading).toBe(true);

  await act(async () => {
    await vi.runAllTimersAsync();
  });

  expect(result.current.loading).toBe(false);
  expect(result.current.tasks).toHaveLength(1);
  expect(result.current.tasks[0].title).toBe('Test task');
});

it('createTask adds task to local state', async () => {
  const { result } = renderHook(() => useTasks());

  await act(async () => {
    await result.current.createTask('New task');
  });

  expect(result.current.tasks).toContainEqual(
    expect.objectContaining({ title: 'New task' })
  );
});
```

---

## 5. End-to-End Testing with Playwright

### Setup

```bash
npm install -D @playwright/test
npx playwright install chromium  # install browsers
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,  // fail if test.only in CI
  retries: process.env.CI ? 2 : 0, // retry flaky tests in CI
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['github']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',  // record trace on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],

  // Start the app before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Writing E2E tests

```ts
// e2e/tasks.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@test.com');
    await page.getByLabel('Password').fill('testpassword');
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('/dashboard');
  });

  test('user can create a new task', async ({ page }) => {
    await page.goto('/tasks');

    await page.getByRole('textbox', { name: /task title/i }).fill('Buy groceries');
    await page.getByRole('combobox', { name: /priority/i }).selectOption('high');
    await page.getByRole('button', { name: /add task/i }).click();

    // Task appears in list
    await expect(page.getByRole('listitem').filter({ hasText: 'Buy groceries' })).toBeVisible();

    // Persists after page refresh
    await page.reload();
    await expect(page.getByRole('listitem').filter({ hasText: 'Buy groceries' })).toBeVisible();
  });

  test('user can complete a task', async ({ page }) => {
    await page.goto('/tasks');

    // Create a task first
    await page.getByRole('textbox', { name: /title/i }).fill('Task to complete');
    await page.getByRole('button', { name: /add/i }).click();

    const taskItem = page.getByRole('listitem').filter({ hasText: 'Task to complete' });
    await taskItem.getByRole('checkbox').click();

    // Shows as completed (strikethrough or class change)
    await expect(taskItem).toHaveClass(/completed/);
    await expect(taskItem.getByRole('checkbox')).toBeChecked();
  });

  test('user can delete a task', async ({ page }) => {
    await page.goto('/tasks');

    await page.getByRole('textbox', { name: /title/i }).fill('Task to delete');
    await page.getByRole('button', { name: /add/i }).click();

    const taskItem = page.getByRole('listitem').filter({ hasText: 'Task to delete' });
    await taskItem.getByRole('button', { name: /delete/i }).click();

    // Confirm dialog
    await page.getByRole('button', { name: /confirm/i }).click();

    // Task gone
    await expect(taskItem).not.toBeVisible();
  });

  test('shows empty state when no tasks', async ({ page }) => {
    // Assume test DB is clean
    await page.goto('/tasks');

    await expect(page.getByText(/no tasks yet/i)).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(0);
  });
});
```

### Page Object Model (POM)

```ts
// e2e/pages/TaskPage.ts — encapsulate page interactions
import { type Page, type Locator } from '@playwright/test';

export class TaskPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly addButton: Locator;
  readonly taskList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByRole('textbox', { name: /task title/i });
    this.addButton = page.getByRole('button', { name: /add task/i });
    this.taskList = page.getByRole('list', { name: /tasks/i });
  }

  async goto() {
    await this.page.goto('/tasks');
  }

  async addTask(title: string, priority = 'medium') {
    await this.titleInput.fill(title);
    await this.page.getByRole('combobox', { name: /priority/i }).selectOption(priority);
    await this.addButton.click();
    // Wait for task to appear
    await this.taskList.getByText(title).waitFor();
  }

  getTaskItem(title: string) {
    return this.taskList.getByRole('listitem').filter({ hasText: title });
  }

  async completeTask(title: string) {
    await this.getTaskItem(title).getByRole('checkbox').click();
  }
}

// Usage in tests
test('create and complete a task', async ({ page }) => {
  const taskPage = new TaskPage(page);
  await taskPage.goto();
  await taskPage.addTask('Buy milk', 'high');
  await taskPage.completeTask('Buy milk');

  await expect(taskPage.getTaskItem('Buy milk')).toHaveClass(/completed/);
});
```

---

## 6. Mocking & Test Doubles

### Types of test doubles

```text
Dummy:   object passed but never used (filling parameter lists)
Stub:    returns predefined responses ("when called with X, return Y")
Fake:    working implementation, but simplified (in-memory DB instead of real)
Mock:    stub + expectations ("verify that fetchUser was called with userId=123")
Spy:     wraps real implementation, records calls
```

### Vitest mocking

```ts
import { vi, expect, it } from 'vitest';

// Auto-mock module (all exports become vi.fn())
vi.mock('../emailService');

// Manual mock — control exactly what each function does
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: '1', name: 'Alice' }]),
      }),
    }),
  },
}));

// Spy on existing function without replacing it
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
// After test:
consoleSpy.mockRestore();

// Mock timer functions
vi.useFakeTimers();
vi.setSystemTime(new Date('2024-01-15'));

const timer = setTimeout(() => doSomething(), 1000);
vi.advanceTimersByTime(1000); // fast-forward 1 second
expect(doSomething).toHaveBeenCalledOnce();

vi.useRealTimers();

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue({ users: [] }),
});

// MSW (Mock Service Worker) — more realistic API mocking
// Intercepts actual HTTP requests — works in both browser and Node
```

### MSW (Mock Service Worker)

```ts
// src/test/handlers.ts — define API mock handlers
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/tasks', () => {
    return HttpResponse.json({
      data: [
        { id: '1', title: 'Task 1', done: false },
        { id: '2', title: 'Task 2', done: true },
      ],
      meta: { total: 2 },
    });
  }),

  http.post('/api/tasks', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: 'new-id', ...body, done: false },
      { status: 201 }
    );
  }),

  http.delete('/api/tasks/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// src/test/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// src/test/setup.ts
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers()); // reset per-test overrides
afterAll(() => server.close());

// Override in specific tests
it('handles API error', async () => {
  server.use(
    http.get('/api/tasks', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    })
  );

  render(<TaskList />);
  await screen.findByText(/something went wrong/i);
});
```

---

## 7. Test-Driven Development (TDD)

### The Red-Green-Refactor cycle

```text
1. RED:    Write a failing test for the desired behavior
2. GREEN:  Write the minimum code to make it pass
3. REFACTOR: Clean up code without breaking the test

Benefits:
  - Tests define the API before implementation (better design)
  - Forces you to think about behavior, not implementation
  - Always have tests when you're done (no retrofitting)
  - Small, focused changes — less fear of breaking things

When to use TDD:
  ✓ Business logic (calculations, rules, algorithms)
  ✓ Bug fixes — write a test that reproduces the bug first
  ✓ New features with clear requirements

When NOT to use TDD:
  ✗ Exploratory coding — when you don't know the API yet
  ✗ UI layout — hard to TDD pixel-perfect designs
  ✗ One-off scripts
```

### TDD example

```ts
// Step 1: RED — write the test first
// src/lib/pricing.test.ts
describe('calculatePrice', () => {
  it('applies 10% discount for orders over $100', () => {
    expect(calculatePrice(120)).toBe(108); // 120 * 0.9 = 108
  });

  it('applies no discount for orders under $100', () => {
    expect(calculatePrice(80)).toBe(80);
  });

  it('applies 20% discount for orders over $500', () => {
    expect(calculatePrice(600)).toBe(480); // 600 * 0.8 = 480
  });
});

// Run: vitest → 3 tests FAIL (calculatePrice doesn't exist)

// Step 2: GREEN — minimal implementation
// src/lib/pricing.ts
export function calculatePrice(amount: number): number {
  if (amount >= 500) return amount * 0.8;
  if (amount >= 100) return amount * 0.9;
  return amount;
}

// Run: vitest → 3 tests PASS

// Step 3: REFACTOR — clean up without breaking
export function calculatePrice(amount: number): number {
  const discount = amount >= 500 ? 0.2 : amount >= 100 ? 0.1 : 0;
  return amount * (1 - discount);
}

// Run: vitest → still 3 tests PASS
```

---

## 8. Code Coverage

### Understanding coverage metrics

```text
Line coverage:    % of lines executed during tests
Branch coverage:  % of if/else/switch branches taken
Function coverage: % of functions called
Statement coverage: % of statements executed

Branch coverage is most meaningful:
  You can have 100% line coverage but miss branches:

  function getRole(user) {
    if (user.isAdmin) return 'admin'; // line covered ✓
    return 'user'; // never reached if always testing admin users → 50% branch coverage
  }
```

```ts
// vitest.config.ts
test: {
  coverage: {
    provider: 'v8',         // or 'istanbul'
    reporter: ['text', 'html', 'lcov'],
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/test/**',
      'src/types/**',      // type-only files don't need coverage
      'src/**/*.d.ts',
    ],
    thresholds: {
      lines: 80,
      branches: 70,
      functions: 80,
      statements: 80,
    },
  },
}

// Run with coverage
// npx vitest run --coverage
// Open coverage/index.html to see detailed report
```

### What coverage DOESN'T tell you

```text
100% coverage ≠ good tests
  You can have 100% coverage with worthless tests:

  it('runs without error', () => {
    expect(() => calculatePrice(100)).not.toThrow(); // covers the line, tests nothing
  });

Coverage is a minimum bar, not a quality measure.

Better signal: mutation testing (Stryker)
  Automatically modifies your code (changes + to -, removes conditions)
  Runs tests — if tests still pass after mutation, tests are weak
  Mutation score: % of mutations caught by tests
```

---

## 9. Performance Testing

### Load testing with k6

```js
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up to 50 users
    { duration: '3m', target: 50 },   // stay at 50 for 3 min
    { duration: '1m', target: 200 },  // spike to 200
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p95<500'],   // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // < 1% error rate
    errors: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://api.staging.solace.health/tasks', {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has data field': (r) => JSON.parse(r.body).data !== undefined,
  });

  errorRate.add(!success);
  sleep(1); // think time between requests
}
```

```bash
k6 run --env TEST_TOKEN=abc123 load-test.js
```

---

## 10. Testing Patterns & Anti-patterns

### Good patterns

```ts
// Arrange-Act-Assert (AAA) structure — easy to read
it('creates task with given title', async () => {
  // Arrange
  const title = 'Buy groceries';
  const userId = 'user-123';

  // Act
  const task = await createTask({ title, userId });

  // Assert
  expect(task.title).toBe(title);
  expect(task.userId).toBe(userId);
  expect(task.done).toBe(false);
  expect(task.id).toBeDefined();
});

// Test one thing per test — clear failure messages
// ✗ Bad: 'tests the whole task flow'
// ✓ Good: 'createTask sets done to false by default'

// Descriptive test names — reads like documentation
describe('createTask', () => {
  it('returns the created task with a generated id');
  it('sets done to false by default');
  it('throws ValidationError when title is empty');
  it('throws NotFoundError when userId does not exist');
});
```

### Anti-patterns to avoid

```ts
// ✗ Testing implementation details
it('calls useState with initial value', () => {
  const spy = vi.spyOn(React, 'useState');
  render(<TaskForm />);
  expect(spy).toHaveBeenCalledWith(''); // breaks on any refactor
});

// ✗ Tests that are always green (testing nothing)
it('component renders', () => {
  expect(() => render(<TaskForm />)).not.toThrow(); // not useful
});

// ✗ Sharing mutable state between tests — causes flaky tests
let tasks: Task[] = [];
it('adds task', () => { tasks.push(newTask); });
it('removes task', () => { tasks.pop(); }); // depends on previous test order

// ✓ Each test is independent — no shared state
it('adds task', () => {
  const tasks: Task[] = [];
  tasks.push(newTask);
  expect(tasks).toHaveLength(1);
});

// ✗ waitForSomethingToDisappear antipattern (race condition)
await waitFor(() => expect(spinner).not.toBeInTheDocument());
// ✓ Instead: wait for what you expect to appear
await screen.findByText('Task created'); // implicitly waits for spinner to finish

// ✗ Magic numbers — unclear what they represent
expect(result).toBe(86400);
// ✓ Named constants
const SECONDS_IN_A_DAY = 60 * 60 * 24;
expect(result).toBe(SECONDS_IN_A_DAY);
```

---

## 11. Common Interview Questions

### "Explain the testing pyramid."

> The testing pyramid describes the ideal distribution of tests: many unit tests at the base (fast, cheap, isolated), fewer integration tests in the middle (slower, test real interactions between components), and a small number of E2E tests at the top (slowest, test full user flows). The rationale: unit tests give fast feedback on logic, integration tests catch wiring issues, E2E tests catch user-facing regressions. Inverting the pyramid (too many E2E tests) leads to slow, brittle test suites. Too many mocks in unit tests gives false confidence.

### "What is the difference between a mock and a stub?"

> A stub returns predefined responses — it just provides canned answers (when `fetchUser` is called, return `{ id: '1', name: 'Alice' }`). A mock goes further — it also verifies expectations on how it was called (`expect(fetchUser).toHaveBeenCalledWith('123')`). In practice, `vi.fn()` in Vitest is both — you set the return value (stub behavior) and can assert on calls (mock behavior). The distinction matters conceptually: test behavior, not that specific methods were called.

### "How do you test code that depends on external APIs?"

> Three approaches: (1) Mocking the fetch/axios calls with `vi.fn()` — fast and controlled but you're testing against a fake. (2) MSW (Mock Service Worker) — intercepts real HTTP requests at the network layer, much more realistic, your code exercises the real fetch logic. (3) Integration tests against a real API (or a local Docker version) — most confidence but slow and requires infra. I prefer MSW for component tests and real integration tests for critical API paths.

### "What is TDD and when would you NOT use it?"

> TDD is the practice of writing a failing test first, then writing the minimum code to pass it, then refactoring. Benefits: tests drive design toward clean interfaces, you always have tests when done, and small iterations reduce fear. I wouldn't use TDD for exploratory code (when I don't know the API yet), for UI layout (not behavior), or for prototyping where the API changes rapidly. It shines for business logic, bug fixes (write a failing test that reproduces the bug first), and utility functions.

### "How do you make tests less flaky?"

```text
Flaky test: passes sometimes, fails sometimes — same code

Common causes and fixes:
  Async timing:     Use findBy* (waits) instead of getBy* after async action
  Shared state:     Clean up before/after each test (beforeEach, afterEach)
  Test ordering:    Tests must be independent — any order should work
  Real timers:      Use vi.useFakeTimers() for setTimeout/setInterval
  Network calls:    Mock external APIs — real network is unreliable in CI
  Date/time:        vi.setSystemTime() to freeze time
  Random data:      Use fixed seeds or vi.spyOn(Math, 'random')
  Race conditions:  Use waitFor() with assertions, not arbitrary sleeps
```
