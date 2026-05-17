# Testing Strategy — Senior Deep Reference

---

## The Testing Trophy (Kent C. Dodds) vs Testing Pyramid

```text
Testing Pyramid (classic):
        /\
       /E2E\          ← few, slow, expensive
      /──────\
     /Integration\    ← moderate
    /──────────────\
   /   Unit Tests   \ ← many, fast, cheap
  /──────────────────\

Testing Trophy (modern React/JS):
         ___
        /   \  E2E         ← few
       /─────\
      / Integ \ ──────────  ← MOST tests here
     /──────────\
    /    Unit    \          ← some (pure logic)
   /──────────────\
  /    Static      \        ← TypeScript, ESLint (free)

Key insight: integration tests give the best ROI for UI code.
They test real behaviour without the brittleness of E2E or
the false confidence of heavily mocked unit tests.
```

---

## What to Test at Each Level

```text
Unit tests:
  - Pure functions (utils, algorithms, formatters)
  - Complex business logic with many branches
  - Reducers, selectors, state machines
  - Do NOT unit test: React components (brittle), functions with only one branch

Integration tests:
  - React components with real user interactions
  - API handlers with real DB (test containers)
  - Multi-step flows (form submission, auth, data fetching)
  - These are the majority of your test suite

E2E tests:
  - Critical happy paths: signup, checkout, login
  - Cross-browser issues
  - 5–20 tests max — not a replacement for integration

Static analysis:
  - TypeScript: type errors caught at compile time (free tests)
  - ESLint: logic bugs (no-unused-vars, exhaustive-deps, etc.)
  - Zod: runtime schema validation at system boundaries
```

---

## React Testing Library (RTL)

### Core Philosophy

```text
Test behaviour, not implementation.
Query by what users see, not by component internals.

❌ Avoid: wrapper.find('Button'), component.state(), component.props()
✅ Use:   getByRole, getByLabelText, getByText, userEvent
```

### Query Priority (use in this order)

```text
1. getByRole           — most accessible, closest to user experience
2. getByLabelText      — form fields
3. getByPlaceholderText— form fields without label
4. getByText           — non-interactive elements
5. getByDisplayValue   — current value of form element
6. getByAltText        — images
7. getByTitle          — title attribute
8. getByTestId         — last resort (data-testid="submit-btn")

Variants:
  getBy*      — throws if not found / multiple found
  queryBy*    — returns null if not found (use for asserting absence)
  findBy*     — async, returns Promise (waits for element to appear)
  getAllBy*   — returns array, throws if none found
  queryAllBy* — returns empty array if none found
  findAllBy*  — async array
```

### RTL Examples

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Basic render + assert
test('shows greeting', () => {
  render(<Greeting name="Alice" />)
  expect(screen.getByRole('heading', { name: /hello, alice/i })).toBeInTheDocument()
})

// User interaction
test('submits login form', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<LoginForm onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.type(screen.getByLabelText(/password/i), 'secret123')
  await user.click(screen.getByRole('button', { name: /sign in/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'alice@example.com',
    password: 'secret123',
  })
})

// Async — waiting for data to load
test('loads and displays users', async () => {
  render(<UserList />)

  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  const users = await screen.findAllByRole('listitem')  // waits up to 1000ms
  expect(users).toHaveLength(3)
})

// Assert element NOT present
test('hides error when valid', () => {
  render(<Form />)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

// Accessible role list (know these):
// button, link, heading, textbox, checkbox, radio, combobox, listbox,
// option, menuitem, dialog, alert, status, img, list, listitem, table
```

---

## Mocking

### What to Mock vs Not Mock

```text
✅ Mock:
  - External HTTP calls (MSW is best)
  - Third-party SDKs (Stripe, SendGrid, S3)
  - Time (vi.useFakeTimers)
  - Randomness (vi.spyOn(Math, 'random'))
  - Browser APIs not available in jsdom (IntersectionObserver, ResizeObserver)

❌ Don't Mock:
  - Your own application code (indicates poor separation of concerns)
  - The database in integration tests (use test containers instead)
  - React itself or component internals
  - Module implementations you own (mock the boundary, not the internals)
```

### MSW (Mock Service Worker) — Best Practice for API Mocking

```ts
// handlers.ts — define API mocks once, share across unit + integration + E2E
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ])
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 3, ...body }, { status: 201 })
  }),

  // Error scenario
  http.get('/api/users/:id', ({ params }) => {
    if (params.id === '999') {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({ id: params.id, name: 'Alice' })
  }),
]

// setup.ts (Vitest/Jest)
import { setupServer } from 'msw/node'
export const server = setupServer(...handlers)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Override per-test:
test('handles 500 error', () => {
  server.use(
    http.get('/api/users', () => HttpResponse.json({}, { status: 500 }))
  )
  // ... assert error UI shown
})
```

### Vitest Mocks

```ts
// vi.fn() — create a mock function
const mockFn = vi.fn().mockReturnValue(42)
mockFn()  // 42
expect(mockFn).toHaveBeenCalledTimes(1)
expect(mockFn).toHaveBeenCalledWith()

// Mock return values
vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2).mockReturnValue(3)
vi.fn().mockResolvedValue({ data: 'ok' })  // async
vi.fn().mockRejectedValue(new Error('fail'))

// vi.spyOn — spy on existing method without replacing it
const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
// ... do something that triggers console.error
expect(spy).toHaveBeenCalledWith(expect.stringContaining('invalid'))
spy.mockRestore()

// vi.mock — mock entire module
vi.mock('../lib/stripe', () => ({
  createPaymentIntent: vi.fn().mockResolvedValue({ clientSecret: 'pi_test' }),
}))

// Mock with factory (runs before imports — hoisted)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard',
}))

// Fake timers
vi.useFakeTimers()
vi.advanceTimersByTime(1000)  // advance by 1s
vi.runAllTimers()              // run all pending timers
vi.useRealTimers()             // restore
```

---

## API / Integration Testing (Node.js)

```ts
// Supertest + Vitest — test HTTP endpoints with real DB (Postgres in test container)
import request from 'supertest'
import { app } from '../app'
import { db } from '../db'

beforeAll(async () => {
  await db.migrate.latest()  // run migrations on test DB
})

afterEach(async () => {
  await db('users').delete()  // clean up between tests
})

afterAll(async () => {
  await db.destroy()
})

test('POST /users creates user', async () => {
  const res = await request(app)
    .post('/api/users')
    .send({ email: 'alice@example.com', name: 'Alice' })
    .set('Authorization', `Bearer ${testToken}`)

  expect(res.status).toBe(201)
  expect(res.body).toMatchObject({ email: 'alice@example.com' })

  // Verify DB state directly — confirm it actually persisted
  const dbUser = await db('users').where({ email: 'alice@example.com' }).first()
  expect(dbUser).toBeDefined()
})

test('GET /users/:id returns 404 for unknown user', async () => {
  const res = await request(app).get('/api/users/99999')
  expect(res.status).toBe(404)
})
```

### Test Containers (real DB in CI)

```ts
// @testcontainers/postgresql — spins up real Postgres in Docker for tests
import { PostgreSqlContainer } from '@testcontainers/postgresql'

let container: StartedPostgreSqlContainer

beforeAll(async () => {
  container = await new PostgreSqlContainer().start()
  process.env.DATABASE_URL = container.getConnectionUri()
  await runMigrations()
}, 60_000)

afterAll(async () => {
  await container.stop()
})
```

---

## E2E Testing (Playwright)

```ts
// playwright.config.ts
export default {
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
}

// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test('complete checkout flow', async ({ page }) => {
  await page.goto('/shop')

  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await page.getByRole('link', { name: 'Cart' }).click()

  await expect(page.getByText('1 item')).toBeVisible()

  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByLabel('Card number').fill('4242424242424242')
  await page.getByLabel('Expiry').fill('12/28')
  await page.getByLabel('CVC').fill('123')
  await page.getByRole('button', { name: 'Pay now' }).click()

  await expect(page.getByText('Order confirmed')).toBeVisible()
})

// Page Object Model — encapsulate page interactions
class LoginPage {
  constructor(private page: Page) {}
  async login(email: string, password: string) {
    await this.page.goto('/login')
    await this.page.getByLabel(/email/i).fill(email)
    await this.page.getByLabel(/password/i).fill(password)
    await this.page.getByRole('button', { name: /sign in/i }).click()
    await this.page.waitForURL('/dashboard')
  }
}
```

---

## Test Organisation & Best Practices

### File Structure

```text
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx      ← co-located unit/integration tests
  lib/
    utils.ts
    utils.test.ts
e2e/
  checkout.spec.ts         ← Playwright E2E tests
  auth.spec.ts
```

### Arrange-Act-Assert (AAA)

```ts
test('filters completed todos', () => {
  // Arrange
  const todos = [
    { id: 1, text: 'Buy milk', done: true },
    { id: 2, text: 'Walk dog', done: false },
  ]

  // Act
  const result = filterTodos(todos, 'completed')

  // Assert
  expect(result).toHaveLength(1)
  expect(result[0].text).toBe('Buy milk')
})
```

### What Makes a Good Test

```text
F — Fast:       milliseconds, not seconds
I — Isolated:   doesn't depend on other tests or global state
R — Repeatable: same result every run (no randomness, no time dependency)
S — Self-validating: passes or fails, no manual inspection needed
T — Timely:     written alongside or before the code

❌ Bad test smells:
  - Tests internal implementation (tests a function that shouldn't be public)
  - Asserts on snapshots of huge components (brittle, noisy diffs)
  - Skipped tests (just delete them)
  - Test that always passes (missing assertion, wrong expectation)
  - Tests that depend on each other's side effects (order-dependent)
  - Mock everything — tests nothing real

✅ Good test:
  - Fails when behaviour breaks (not just when code changes)
  - Clear what it's testing from the name alone
  - One logical assertion per test (can have multiple expects)
  - Tests one scenario
```

### Snapshot Testing (use sparingly)

```ts
// Good use: small, stable output like serialised data or error messages
expect(formatDate(new Date('2024-01-15'))).toMatchInlineSnapshot(`"Jan 15, 2024"`)

// ❌ Bad use: large component snapshot (any change → noisy diff → people update blindly)
// If you do use component snapshots:
expect(container).toMatchSnapshot()
// Run with --updateSnapshot when intentional changes are made
// Review snapshot diffs in PR — don't blindly update

// Better alternative: assert on specific text/role/structure with RTL queries
```

### Coverage (don't chase 100%)

```text
Coverage measures which lines are executed — not whether behaviour is tested.

Targets by layer:
  Pure utils / business logic: 90–100%
  React components:            70–80%  (integration tests cover most)
  E2E critical paths:          key flows covered
  Overall:                     70–80% is healthy

❌ 100% coverage is not the goal:
  - Branches with impossible conditions shouldn't be forced
  - Getters/setters that are trivially correct
  - Generated code

✅ What matters:
  - All happy paths covered
  - Key error/edge cases covered
  - Critical user flows have E2E coverage
```

---

## TDD (Test-Driven Development)

```text
Red → Green → Refactor

1. Red:     Write a failing test for the feature you're about to build
2. Green:   Write the minimal code to make the test pass
3. Refactor: Clean up code while keeping tests green

Benefits:
  - Forces you to think about the interface before implementation
  - Built-in regression coverage
  - Natural documentation of expected behaviour

When to use:
  ✅ Bug fixes: write test that reproduces bug first, then fix
  ✅ Pure functions / algorithms: easy to test-drive
  ✅ Complex state machines
  ⚠️  UI components: harder (behaviour emerges from visual design)
  ⚠️  Exploratory code: prototyping → write tests after shape is clear
```

---

## CI Testing Strategy

```yaml
# GitHub Actions — layered test strategy
jobs:
  static:
    runs-on: ubuntu-latest
    steps:
      - run: npm run typecheck   # tsc --noEmit
      - run: npm run lint        # eslint

  unit-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
    steps:
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Interview Questions

```text
Q: What's the difference between a unit test and an integration test?
A: Unit: tests one thing in isolation, all dependencies mocked.
   Integration: tests multiple units working together with real dependencies
   (real DB, real child components, real HTTP handlers via MSW).
   Integration tests give higher confidence at the cost of being slightly slower.

Q: How do you test a component that fetches data?
A: Use MSW to intercept HTTP at the network level (no mocking internals).
   Render the component, wait for loading state to disappear (findBy* for async),
   assert the rendered data. Test error state by overriding MSW handler to return 500.

Q: What is the testing trophy and why does it differ from the testing pyramid?
A: Trophy puts most weight on integration tests for UI/React apps.
   Pyramid was designed for backend systems where unit tests are cheap and reliable.
   For React, unit tests of components are often brittle (test implementation).
   Integration tests with RTL test real user behaviour — better ROI.

Q: How do you prevent tests from becoming brittle?
A: Test behaviour not implementation.
   Query by role/label (RTL), not by CSS class or component name.
   Avoid testing internals (state, private methods).
   Use MSW so tests don't break when you refactor fetch logic.
   Avoid snapshot tests for large outputs.

Q: How would you test a custom React hook?
A: Use renderHook from @testing-library/react.
   Wrap in act() for state updates. Assert the returned values.
   Or better: test the component that uses the hook — tests behaviour end-to-end.
   Only use renderHook for complex hooks with many branches.
```
