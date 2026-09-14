# Testing — Beginner's Guide

**Priority: MEDIUM**

> What the different types of test actually are, which tool to use for each, and how to write
> your first ones — on the backend (services, API endpoints, databases) and the frontend
> (components, user flows).
>
> Assumes you can write JavaScript/TypeScript and have built something. No testing experience
> needed.

---

## Table of Contents

1. [Why Test At All](#1-why-test-at-all)
2. [Anatomy of a Test](#2-anatomy-of-a-test)
3. [The Types of Tests](#3-the-types-of-tests)
4. [The Testing Pyramid](#4-the-testing-pyramid)
5. [The Tools — What to Use for What](#5-the-tools--what-to-use-for-what)
6. [Your First Unit Test](#6-your-first-unit-test)
7. [Backend — Testing a Service](#7-backend--testing-a-service)
8. [Backend — Testing an API Endpoint](#8-backend--testing-an-api-endpoint)
9. [Backend — Testing with a Real Database](#9-backend--testing-with-a-real-database)
10. [Mocking, Explained Simply](#10-mocking-explained-simply)
11. [Frontend — Testing a Component](#11-frontend--testing-a-component)
12. [E2E — Testing the Whole Thing](#12-e2e--testing-the-whole-thing)
13. [What to Test and What to Skip](#13-what-to-test-and-what-to-skip)
14. [Running Tests & CI](#14-running-tests--ci)
15. [Common Beginner Mistakes](#15-common-beginner-mistakes)
16. [Cheat Sheet](#16-cheat-sheet)
17. [Where to Go Next](#17-where-to-go-next)

---

## 1. Why Test At All

```text
The honest version, because "tests are good" is not a reason.

WHAT TESTS ACTUALLY BUY YOU

  1. CONFIDENCE TO CHANGE CODE.
     This is the big one, and it is not about catching bugs today. Six months
     from now you need to change how orders are priced. Without tests you have
     to manually re-check every flow that touches pricing, so you either spend
     a day on it or you cross your fingers. With tests you change the code and
     the suite tells you in ten seconds what you broke.

  2. THEY DOCUMENT INTENT.
     A test named "throws when the discount exceeds the order total" tells the
     next person what the rule is. Comments drift from the code; a test that
     drifts fails.

  3. THEY CATCH REGRESSIONS.
     The bug you fixed in March comes back in July because someone refactored.
     A test written alongside that fix stops it permanently.

  4. THEY FORCE BETTER DESIGN.
     Code that is hard to test is usually badly structured — it does too much,
     or reaches out to things it shouldn't. "This is painful to test" is a
     useful design signal.

WHAT TESTS COST

  - Time to write. Roughly 20-50% on top of the feature, at first.
  - Time to maintain. Badly written tests break on every refactor and become
    a tax rather than an asset.
  - False confidence. 100% coverage of the wrong things proves nothing.

‼️ THE REALISTIC POSITION: test the things that would genuinely hurt if they
   broke — money, auth, data loss, the core flow your product exists for.
   Do not chase a coverage number. A handful of good tests on critical paths
   beats hundreds of tests on getters and setters.
```

---

## 2. Anatomy of a Test

```javascript
// Almost every test in JavaScript looks like this, whatever the tool.

// describe() groups related tests. Purely organisational — it makes output
// readable and lets you share setup within the group.
describe('calculateTotal', () => {

  // it() (or test() — they are identical) is ONE test case.
  // ‼️ The name should describe the BEHAVIOUR, so a failure message tells you
  // what broke without opening the file. Read it as a sentence:
  // "calculateTotal adds tax to the subtotal".
  it('adds tax to the subtotal', () => {

    // ── ARRANGE — set up the inputs and any state you need ──────────────
    const items = [{ price: 100, quantity: 2 }];
    const taxRate = 0.1;

    // ── ACT — run the ONE thing you are testing ─────────────────────────
    const result = calculateTotal(items, taxRate);

    // ── ASSERT — state what you expect to be true ───────────────────────
    // If this is false, the test fails and reports both values.
    expect(result).toBe(220);
  });

  it('returns 0 for an empty cart', () => {
    expect(calculateTotal([], 0.1)).toBe(0);
  });
});

// ‼️ ARRANGE / ACT / ASSERT (AAA) is the structure to internalise. Every test
// you ever write is those three steps. Keeping them visually separate makes
// tests readable at a glance, and a test that has two "act" steps is usually
// two tests wearing a trenchcoat.
```

### The assertions you will actually use

```javascript
// ── Equality ──────────────────────────────────────────────────────────────
expect(x).toBe(5);                      // exact same value (===)
                                        // ‼️ For objects this compares by
                                        // REFERENCE, so two identical-looking
                                        // objects fail. Use toEqual.
expect(obj).toEqual({ id: 1 });         // deep equality — compares contents
expect(obj).toStrictEqual({ id: 1 });   // also checks undefined keys and class

// ── Truthiness ────────────────────────────────────────────────────────────
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// ── Numbers ───────────────────────────────────────────────────────────────
expect(n).toBeGreaterThan(5);
expect(n).toBeLessThanOrEqual(10);
expect(0.1 + 0.2).toBeCloseTo(0.3);     // ‼️ floats — toBe(0.3) FAILS here

// ── Strings & arrays ──────────────────────────────────────────────────────
expect(str).toContain('hello');
expect(arr).toContain('apple');
expect(arr).toHaveLength(3);
expect(str).toMatch(/^user_/);          // regex

// ── Objects ───────────────────────────────────────────────────────────────
expect(user).toHaveProperty('email');
expect(user).toMatchObject({ role: 'admin' });   // ‼️ partial match — only
                                                 // checks the keys you list

// ── Errors ────────────────────────────────────────────────────────────────
// ‼️ Note the arrow function. Without it the error throws immediately and the
// test crashes instead of passing — the single most common assertion mistake.
expect(() => divide(1, 0)).toThrow();
expect(() => divide(1, 0)).toThrow('Cannot divide by zero');
expect(() => validate(bad)).toThrow(ValidationError);

// ── Async ─────────────────────────────────────────────────────────────────
await expect(fetchUser('123')).resolves.toEqual({ id: '123' });
await expect(fetchUser('bad')).rejects.toThrow(NotFoundException);

// ── Mocks ─────────────────────────────────────────────────────────────────
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveBeenCalledWith('a@b.com', 'Welcome');

// ── Negation — .not works on all of them ──────────────────────────────────
expect(x).not.toBe(5);
```

---

## 3. The Types of Tests

```text
‼️ The names get used loosely and inconsistently across teams. These are the
   common meanings, ordered from smallest scope to largest.

UNIT TEST
  Tests ONE function or class in isolation. Everything it depends on is faked.
  Speed: milliseconds. You can run thousands in seconds.
  Backend example:  calculateDiscount() returns 10% off for orders over £100
  Frontend example: formatCurrency(1234.5) returns "£1,234.50"
  ‼️ Best for: business logic, calculations, validation, pure transformations.

INTEGRATION TEST
  Tests SEVERAL pieces working together — typically your code plus a real
  database, or a full API endpoint through its routing, validation and service.
  Speed: tens to hundreds of milliseconds.
  Backend example: POST /users creates a row and returns 201
  ‼️ Best for: the layer where most real bugs live — the seams between parts.
     This is usually the highest-value type of test on a backend.

END-TO-END (E2E) TEST
  Drives the REAL application through a real browser, like a user would.
  Frontend, backend, and database all running together.
  Speed: seconds per test. Slow, and the most fragile.
  Example: log in, add an item to the cart, check out, see the confirmation
  ‼️ Best for: a handful of critical user journeys. Not for edge cases.

COMPONENT TEST (frontend)
  Renders one UI component and interacts with it, without a real browser.
  Sits between unit and integration.
  Example: clicking "Add to cart" calls onAdd with the product id

SMOKE TEST
  A tiny set of "is it even alive?" checks run right after a deploy.
  Example: the homepage returns 200, the health endpoint is OK, login works.

REGRESSION TEST
  Not a technique — a PURPOSE. Any test written to make sure a specific bug
  never comes back. ‼️ Write one every time you fix a bug: reproduce the bug
  as a failing test first, then fix it. Now it cannot silently return.

SNAPSHOT TEST
  Records the output of something and fails if it changes.
  ‼️ Use sparingly. It tells you something changed, not whether the change was
  wrong, so the usual reaction is to press "update snapshot" without reading it.

CONTRACT TEST
  Verifies that two services still agree on the shape of their API. Useful once
  you have separate frontend and backend teams, or microservices.

LOAD / PERFORMANCE TEST
  How does the system behave at 1,000 requests per second? Where does it break?
  Tools: k6, Artillery.

SECURITY TEST
  Scans for known vulnerable dependencies and common vulnerability classes.
  Tools: npm audit, Snyk, OWASP ZAP.

ACCESSIBILITY TEST
  Automated checks for missing labels, poor contrast, keyboard traps.
  Tools: axe-core, jest-axe, Playwright's accessibility scanner.
  ‼️ Catches maybe 30% of real issues — the rest needs manual keyboard testing.

MANUAL / EXPLORATORY TEST
  A human using the product, trying to break it. Still irreplaceable for
  "does this feel right?" and for finding things nobody thought to automate.
```

---

## 4. The Testing Pyramid

```text
                    ▲
                   ╱ ╲        E2E  —  a few
                  ╱   ╲       Slow (seconds), expensive, brittle,
                 ╱─────╲      but the only thing that proves the
                ╱       ╲     whole system actually works.
               ╱         ╲
              ╱INTEGRATION╲   —  a good number
             ╱             ╲  Medium speed, catch real bugs at the
            ╱───────────────╲ seams between your code and the DB
           ╱                 ╲/API/framework.
          ╱       UNIT        ╲ —  many
         ╱                     ╲Fast (ms), cheap, precise. When one
        ╱───────────────────────╲fails you know exactly what broke.

  WHY THIS SHAPE:
    As you go up, tests get SLOWER, more EXPENSIVE to write, and more likely
    to fail for reasons unrelated to real bugs (timing, network, a moved
    button). As you go down they get faster and more precise, but prove less
    about whether the system as a whole works.

  ‼️ THE TWO FAILURE MODES, both common:

    ICE CREAM CONE (inverted)  Mostly E2E, few unit tests. The suite takes 40
      minutes, fails randomly, and everyone learns to re-run it rather than
      read it. Eventually it is ignored entirely.

    HOURGLASS  Lots of unit tests and lots of E2E, nothing in between. Every
      piece works alone, the whole thing works in the happy path, and all the
      bugs live in the middle where nothing is tested.

  ‼️ THE MODERN ADJUSTMENT — "the Testing Trophy" (Kent C. Dodds):
     put the MOST weight on INTEGRATION tests, not unit tests. The reasoning:
     unit tests with everything mocked can all pass while the app is broken,
     because you tested your mocks. Integration tests exercise real wiring and
     catch far more real bugs per test written.

     For a backend this is very good advice: testing an API endpoint end to end
     through real routing, validation, service and database is usually worth
     more than ten isolated unit tests of the same code.
```

---

## 5. The Tools — What to Use for What

```text
‼️ THE DECISION TABLE. This is the part most beginners want and rarely find
   stated plainly.

WHAT YOU ARE TESTING              TOOL                       NOTES
────────────────────────────────────────────────────────────────────────────
Any JS/TS logic (the runner)      VITEST                     Default for new
                                                             projects. Fast,
                                                             ESM+TS out of the
                                                             box, Jest-
                                                             compatible API.

Same, on an existing project      JEST                       The long-standing
                                                             standard. Almost
                                                             identical API, so
                                                             skills transfer.

Backend API endpoints (Node)      SUPERTEST                  Fires real HTTP
                                                             requests at your
                                                             app without
                                                             binding a port.

Real database in tests            TESTCONTAINERS             Spins up a real
                                                             Postgres/Redis in
                                                             Docker per suite.

React components                  REACT TESTING LIBRARY      Renders a
                                  (+ @testing-library/       component and
                                   user-event)               interacts with it
                                                             as a user would.

Faking HTTP calls in tests        MSW (Mock Service Worker)  Intercepts at the
                                                             network layer, so
                                                             it works for both
                                                             frontend and
                                                             backend tests.

Full browser E2E                  PLAYWRIGHT                 The current
                                                             default. Multi-
                                                             browser, fast,
                                                             great debugging.

Full browser E2E (alternative)    CYPRESS                    Popular, very nice
                                                             UI. Weaker multi-
                                                             tab/multi-origin
                                                             support.

Load testing                      K6                         Write load tests
                                                             in JavaScript.

Dependency vulnerabilities        npm audit / SNYK           Run in CI.

Accessibility                     AXE-CORE / jest-axe        Automated a11y
                                                             checks.

Manual API poking                 POSTMAN / INSOMNIA /       Exploration, not
                                  Bruno / curl               automated testing.
```

```bash
# ── A typical setup for a Node + React project ──────────────────────────
npm install -D vitest                          # the test runner
npm install -D supertest                       # backend API tests
npm install -D @testing-library/react \
               @testing-library/user-event \
               @testing-library/jest-dom       # React component tests
npm install -D msw                             # mock HTTP
npm install -D @playwright/test                # E2E
```

```javascript
// vitest.config.ts — the minimum you need
export default defineConfig({
  test: {
    // 'node' for backend-only projects. 'jsdom' simulates a browser
    // environment so React component tests can render into a fake DOM.
    environment: 'jsdom',

    // Makes describe/it/expect available without importing them in every file.
    globals: true,

    // Runs before every test file — where you register jest-dom matchers,
    // start MSW, and so on.
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

---

## 6. Your First Unit Test

```typescript
// ── The code under test: src/lib/pricing.ts ─────────────────────────────
export function calculateDiscount(subtotal: number, code: string): number {
  if (subtotal <= 0) throw new Error('Subtotal must be positive');

  const discounts: Record<string, number> = { SAVE10: 0.1, SAVE20: 0.2 };
  const rate = discounts[code];

  if (rate === undefined) return 0;
  if (subtotal < 50) return 0;       // minimum spend

  return Math.round(subtotal * rate * 100) / 100;
}
```

```typescript
// ── The test: src/lib/pricing.test.ts ───────────────────────────────────
// ‼️ Naming convention: put the test next to the code as <name>.test.ts.
// Test runners find these automatically, and keeping them adjacent means
// they get moved and renamed along with the code instead of rotting.
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './pricing';

describe('calculateDiscount', () => {
  // ‼️ Start with the HAPPY PATH — the normal, expected case.
  it('applies 10% for SAVE10', () => {
    expect(calculateDiscount(100, 'SAVE10')).toBe(10);
  });

  it('applies 20% for SAVE20', () => {
    expect(calculateDiscount(100, 'SAVE20')).toBe(20);
  });

  // ‼️ Then the EDGE CASES — this is where the real value is. Ask yourself:
  // what is unusual, empty, zero, negative, too big, or wrong?
  it('returns 0 for an unknown code', () => {
    expect(calculateDiscount(100, 'NOPE')).toBe(0);
  });

  it('returns 0 below the £50 minimum spend', () => {
    // A BOUNDARY test — bugs cluster at boundaries, because that is where
    // < and <= get confused.
    expect(calculateDiscount(49.99, 'SAVE10')).toBe(0);
  });

  it('applies the discount exactly at the £50 minimum', () => {
    // The other side of the same boundary. Testing both sides is what
    // actually pins down the rule.
    expect(calculateDiscount(50, 'SAVE10')).toBe(5);
  });

  it('rounds to two decimal places', () => {
    expect(calculateDiscount(33.33, 'SAVE10')).toBe(3.33);
  });

  // ‼️ And the ERROR CASES — what should fail, and does it fail properly?
  it('throws for a zero subtotal', () => {
    expect(() => calculateDiscount(0, 'SAVE10')).toThrow('Subtotal must be positive');
  });

  it('throws for a negative subtotal', () => {
    expect(() => calculateDiscount(-10, 'SAVE10')).toThrow();
  });
});
```

```text
‼️ THE CHECKLIST FOR "WHAT CASES DO I WRITE?"

  1. The happy path — the normal case.
  2. Boundaries — at the limit, just below, just above. (49.99 / 50 / 50.01)
  3. Empty / zero / null — empty array, empty string, 0, null, undefined.
  4. Invalid input — wrong type, negative, too long, unknown value.
  5. Errors — does it throw when it should, with a useful message?

  Five tests per function is usually plenty. You are not trying to enumerate
  every possible input — you are trying to pin down the RULES.
```

---

## 7. Backend — Testing a Service

```typescript
// ── The code: a service with dependencies ───────────────────────────────
export class UserService {
  constructor(
    private readonly repo: UserRepository,
    private readonly mailer: MailerService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.repo.findByEmail(email);
    if (existing) throw new ConflictError('Email already registered');

    if (password.length < 12) {
      throw new ValidationError('Password must be at least 12 characters');
    }

    const user = await this.repo.create({
      email: email.toLowerCase().trim(),
      passwordHash: await hash(password),
    });

    await this.mailer.sendWelcome(user.email);
    return user;
  }
}
```

```typescript
// ── The test ────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UserService.register', () => {
  let service: UserService;
  let repo: { findByEmail: Mock; create: Mock };
  let mailer: { sendWelcome: Mock };

  // ‼️ beforeEach runs before EVERY test in this describe block. Rebuilding
  // the fakes here means each test starts clean — no call counts or queued
  // return values leaking from the previous test. Tests that share mutable
  // state pass alone and fail in suite order, which is miserable to debug.
  beforeEach(() => {
    // vi.fn() creates a fake function that records how it was called and
    // returns whatever you tell it to. (jest.fn() in Jest — identical.)
    repo = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    };
    mailer = { sendWelcome: vi.fn() };

    // ‼️ Because the service takes its dependencies as constructor arguments,
    // swapping in fakes is trivial. This is dependency injection paying off:
    // if the service did `new MailerService()` internally there would be no
    // seam here and this test would send real email.
    service = new UserService(repo as any, mailer as any);
  });

  it('creates a user and sends a welcome email', async () => {
    // ARRANGE — tell the fakes what to return for this scenario.
    repo.findByEmail.mockResolvedValue(null);          // no existing user
    repo.create.mockResolvedValue({ id: '1', email: 'ada@example.com' });

    // ACT
    const user = await service.register('ada@example.com', 'a-long-password');

    // ASSERT — both the return value...
    expect(user.id).toBe('1');
    // ...and the side effect. Checking that the email was sent, and sent to
    // the right address, is the part people forget.
    expect(mailer.sendWelcome).toHaveBeenCalledWith('ada@example.com');
  });

  it('normalises the email before saving', async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: '1', email: 'ada@example.com' });

    await service.register('  ADA@Example.COM  ', 'a-long-password');

    // ‼️ Asserting on what the service PASSED to its dependency. This is how
    // you test a transformation that has no visible return value.
    expect(repo.create).toHaveBeenCalledWith({
      email: 'ada@example.com',
      passwordHash: expect.any(String),   // don't assert on the exact hash —
                                          // it is random by design
    });
  });

  it('rejects a duplicate email', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register('ada@example.com', 'a-long-password'),
    ).rejects.toThrow(ConflictError);

    // ‼️ Equally important: assert the things that should NOT have happened.
    // A bug that sends a welcome email to someone who failed to register is
    // exactly the kind of thing this catches.
    expect(repo.create).not.toHaveBeenCalled();
    expect(mailer.sendWelcome).not.toHaveBeenCalled();
  });

  it('rejects a short password', async () => {
    repo.findByEmail.mockResolvedValue(null);

    await expect(service.register('a@b.com', 'short')).rejects.toThrow(
      'Password must be at least 12 characters',
    );
  });
});
```

---

## 8. Backend — Testing an API Endpoint

```typescript
// ‼️ THE HIGHEST-VALUE BACKEND TEST. It exercises the real route, the real
// middleware, the real validation, and the real service in one go — the exact
// path a real request takes. One of these catches more than several unit tests.

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('POST /api/users', () => {
  let app: Express;

  beforeAll(async () => {
    // Build the real app. supertest talks to it directly in memory, so no
    // port is bound and tests can run in parallel without clashing.
    app = await createApp();
  });

  it('creates a user and returns 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'ada@example.com', password: 'a-long-password' })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: 'ada@example.com',
    });

    // ‼️ Assert the password hash is NOT in the response. Security assertions
    // like this are cheap to write and catch genuinely serious mistakes —
    // a refactor that starts returning the whole user row, for instance.
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password');
  });

  it('returns 400 for an invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', password: 'a-long-password' })
      .expect(400);

    // ‼️ Assert on the SHAPE of the error, not its exact wording. Messages get
    // reworded; a test that breaks when someone improves a message is noise.
    expect(response.body.message).toBeDefined();
  });

  it('returns 409 for a duplicate email', async () => {
    await request(app).post('/api/users').send({
      email: 'dupe@example.com',
      password: 'a-long-password',
    });

    await request(app)
      .post('/api/users')
      .send({ email: 'dupe@example.com', password: 'a-long-password' })
      .expect(409);
  });

  it('returns 401 without a token on a protected route', async () => {
    await request(app).get('/api/users/me').expect(401);
  });

  it('returns the current user with a valid token', async () => {
    const token = signTestToken({ sub: 'user-1' });

    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)   // set headers like this
      .expect(200);
  });
});
```

```text
‼️ WHAT TO TEST ON EVERY ENDPOINT — a checklist you can apply mechanically:

  ✓ The happy path returns the right status and body shape
  ✓ Invalid input returns 400 (test at least one bad field)
  ✓ Missing auth returns 401
  ✓ Wrong user / insufficient role returns 403
  ✓ A missing resource returns 404
  ✓ A conflict (duplicate) returns 409, if applicable
  ✓ Secrets are not in the response body

  That is six or seven tests per endpoint and it covers almost everything that
  actually goes wrong in an API.
```

---

## 9. Backend — Testing with a Real Database

```text
‼️ THE QUESTION EVERY BEGINNER HITS: do I mock the database or use a real one?

  MOCKING THE DATABASE
    Fast, no setup. But you are asserting that your code calls a fake in a
    certain way — which proves nothing about whether your actual SQL is
    correct, whether the constraint fires, or whether the migration works.
    Plenty of "all tests pass" codebases are broken in exactly this gap.

  USING A REAL DATABASE
    Slower (seconds of startup, amortised over the whole suite) but tests the
    thing that actually runs in production: real SQL, real constraints, real
    transactions, real migrations.

  ‼️ RECOMMENDATION: use a real database for repository and endpoint tests.
     It is the single highest-value testing upgrade for a backend, and with
     Testcontainers the setup is about fifteen lines.

  The other options, for completeness:
    - A shared test database: works, but tests interfere with each other and
      it has to exist on every machine and in CI.
    - SQLite in place of Postgres: fast, but a DIFFERENT database. Different
      SQL dialect, different constraint behaviour, no jsonb. It will pass
      tests that fail in production.
```

```typescript
// ── Testcontainers: a real Postgres, per test suite ─────────────────────
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

describe('UserRepository', () => {
  let container: StartedPostgreSqlContainer;
  let repo: UserRepository;

  beforeAll(async () => {
    // Starts a real Postgres in Docker. The first run pulls the image, hence
    // the generous timeout; after that it is a few seconds.
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    const db = await connect(container.getConnectionUri());

    // ‼️ Run your real migrations. This means every test run is also a
    // migration test — if a migration is broken, you find out here rather
    // than during a deploy.
    await runMigrations(db);

    repo = new UserRepository(db);
  }, 60_000);

  // ‼️ Clean between tests so they cannot affect each other. Truncating is
  // much faster than recreating the schema, and TRUNCATE ... CASCADE handles
  // foreign keys for you.
  afterEach(async () => {
    await db.query('TRUNCATE users, posts RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    // ‼️ Always stop the container, or it keeps running after the tests end.
    await container.stop();
  });

  it('saves and retrieves a user', async () => {
    const created = await repo.create({ email: 'ada@example.com' });
    const found = await repo.findByEmail('ada@example.com');
    expect(found?.id).toBe(created.id);
  });

  it('enforces the unique email constraint', async () => {
    await repo.create({ email: 'ada@example.com' });

    // ‼️ THIS is what mocking cannot test. The constraint lives in the
    // database, and this proves it is actually there and actually fires.
    await expect(repo.create({ email: 'ada@example.com' })).rejects.toThrow();
  });

  it('cascades deletes to posts', async () => {
    const user = await repo.create({ email: 'ada@example.com' });
    await postRepo.create({ authorId: user.id, title: 'Hello' });

    await repo.delete(user.id);

    // Proves the ON DELETE CASCADE in your schema is correct — again,
    // something no mock can verify.
    expect(await postRepo.findByAuthor(user.id)).toHaveLength(0);
  });
});
```

---

## 10. Mocking, Explained Simply

```text
‼️ A MOCK is a fake stand-in for something real, used because the real thing is
   slow, unreliable, costs money, or has side effects you don't want in a test.

   You mock so that a test of YOUR code does not depend on:
     - the network being up
     - a third-party API being available (and not charging you)
     - real emails being sent to real people
     - the current time
     - randomness

THE VOCABULARY (used loosely in practice — do not lose sleep over it)

  STUB   Returns a canned answer. "When asked for user 123, return this object."
         Used to SET UP a scenario.

  MOCK   Records how it was called so you can assert on it afterwards.
         Used to VERIFY an interaction happened.

  SPY    Wraps a REAL function — it still runs, but calls are recorded.
         Used when you want real behaviour AND visibility.

  FAKE   A real but simplified implementation. An in-memory array standing in
         for a database, for example.

  ‼️ In Vitest and Jest, vi.fn() / jest.fn() does the stub and mock jobs, and
     vi.spyOn() does the spy job. That is 95% of what you need.
```

```typescript
// ── Creating and controlling a mock ─────────────────────────────────────
const sendEmail = vi.fn();                     // does nothing, records calls

sendEmail.mockReturnValue('sent');             // sync return value
sendEmail.mockResolvedValue({ id: '1' });      // async resolve
sendEmail.mockRejectedValue(new Error('SMTP down'));   // async reject

// Different answer on each successive call — for testing retries
sendEmail
  .mockRejectedValueOnce(new Error('timeout'))
  .mockResolvedValueOnce({ id: '1' });

// ── Asserting on how it was called ──────────────────────────────────────
expect(sendEmail).toHaveBeenCalled();
expect(sendEmail).toHaveBeenCalledTimes(1);
expect(sendEmail).toHaveBeenCalledWith('ada@example.com', 'Welcome');
expect(sendEmail).not.toHaveBeenCalled();

// Inspect the arguments directly when the assertion is more complex
expect(sendEmail.mock.calls[0][0]).toMatch(/@example\.com$/);

// ── Spying on a real object's method ────────────────────────────────────
const spy = vi.spyOn(logger, 'error');
// ...run code...
expect(spy).toHaveBeenCalledWith(expect.stringContaining('failed'));
spy.mockRestore();      // ‼️ put the original back, or later tests see the spy

// ── Faking time ─────────────────────────────────────────────────────────
// ‼️ For anything involving dates, timeouts, or expiry. Without this you write
// tests that pass today and fail on the 1st of the month, or that genuinely
// wait 30 seconds.
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

expect(isExpired(token)).toBe(false);
vi.advanceTimersByTime(1000 * 60 * 60);   // jump forward one hour
expect(isExpired(token)).toBe(true);

vi.useRealTimers();     // ‼️ always restore, or every later test has frozen time
```

```typescript
// ── MSW — mocking HTTP at the network layer ─────────────────────────────
// ‼️ The better way to fake external APIs. Instead of mocking your fetch/axios
// wrapper (which means you are testing your wrapper's fake), MSW intercepts
// the actual request. Your code calls fetch normally and has no idea.
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('https://api.stripe.com/v1/customers/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, balance: 1000 });
  }),
);

beforeAll(() => server.listen({
  // ‼️ Fail loudly if your code calls an endpoint you did not mock, rather
  // than letting a real request escape to the internet during a test run.
  onUnhandledRequest: 'error',
}));
afterEach(() => server.resetHandlers());   // undo per-test overrides
afterAll(() => server.close());

it('handles the payment provider being down', async () => {
  // Override just for this test — simulate a 500
  server.use(
    http.get('https://api.stripe.com/v1/customers/:id', () =>
      HttpResponse.json({ error: 'server_error' }, { status: 500 }),
    ),
  );

  await expect(billing.getBalance('cus_1')).rejects.toThrow(ServiceUnavailable);
});
```

```text
‼️ HOW MUCH TO MOCK — the judgement call that matters most.

  MOCK:    third-party APIs, email/SMS senders, payment providers, the clock,
           randomness, anything that costs money or is outside your control.

  DO NOT MOCK: your own database (use a real one), your own modules that the
           code under test is genuinely integrated with, or the framework.

  ‼️ The failure mode to avoid: a test where everything is mocked. It asserts
     that your code calls your fakes in the order you told it to — which will
     still pass after you break the real integration. If a test only ever
     touches mocks, ask what it is actually proving.
```

---

## 11. Frontend — Testing a Component

```tsx
// ── The component ───────────────────────────────────────────────────────
function LoginForm({ onSubmit }: { onSubmit: (email: string, pw: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return setError('Please enter a valid email');
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />

      <label htmlFor="password">Password</label>
      <input id="password" type="password" value={password}
             onChange={(e) => setPassword(e.target.value)} />

      {error && <p role="alert">{error}</p>}
      <button type="submit">Log in</button>
    </form>
  );
}
```

```tsx
// ── The test ────────────────────────────────────────────────────────────
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LoginForm', () => {
  it('submits the email and password', async () => {
    // user-event simulates real interaction (focus, keydown, keyup, input)
    // rather than firing a single synthetic event. Closer to reality, and it
    // catches bugs fireEvent misses.
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    // ‼️ THE CORE PRINCIPLE OF REACT TESTING LIBRARY:
    // find elements the way a USER would — by their visible label, their role,
    // their text — NOT by CSS class or component internals.
    //
    // Why it matters: a test written against .login-input breaks when someone
    // renames a class, even though nothing user-facing changed. A test written
    // against the label "Email" only breaks if the label actually changes,
    // which IS a real change. It also means your test fails if the input has
    // no label — an accessibility bug caught for free.
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(onSubmit).toHaveBeenCalledWith('ada@example.com', 'secret123');
  });

  it('shows an error for an invalid email and does not submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    // role="alert" is how a screen reader announces an error, so querying by
    // it tests the behaviour and the accessibility at the same time.
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

```text
‼️ THE QUERY METHODS, and when to use each:

  getBy...     Element MUST exist now. Throws a helpful error if not.
               → your default

  queryBy...   Returns null if missing. Does NOT throw.
               → ONLY for asserting something is ABSENT:
                 expect(screen.queryByText('Error')).not.toBeInTheDocument()

  findBy...    Async — waits up to 1s for it to appear. Returns a promise.
               → for anything that appears after a fetch or a transition:
                 expect(await screen.findByText('Welcome')).toBeInTheDocument()

  ‼️ Using getBy for something that has not loaded yet is the #1 flaky-test
     cause in component testing. If it appears asynchronously, use findBy.

PREFER QUERIES IN THIS ORDER (most to least user-like):
  getByRole        → getByRole('button', { name: 'Save' })   ‼️ best default
  getByLabelText   → form fields
  getByPlaceholderText
  getByText        → non-interactive content
  getByTestId      → ‼️ last resort, when nothing else identifies it
```

---

## 12. E2E — Testing the Whole Thing

```typescript
// ── Playwright ──────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';

test('a user can log in and see their dashboard', async ({ page }) => {
  await page.goto('/login');

  // getByLabel / getByRole — the same user-centric philosophy as RTL.
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Log in' }).click();

  // ‼️ Playwright's expect AUTO-WAITS — it retries for a few seconds until the
  // condition is true. So you do NOT write sleeps. A hard-coded
  // waitForTimeout(2000) is both slower than necessary and still flaky on a
  // slow CI machine; auto-waiting is faster and more reliable.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page).toHaveURL('/dashboard');
});

test('shows an error for wrong credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('alert')).toContainText('Invalid credentials');
});
```

```bash
# ── The commands worth knowing ──────────────────────────────────────────
npx playwright test                  # run everything, headless
npx playwright test --ui             # ‼️ interactive mode — watch it run, step
                                     # through, time-travel. Use this while
                                     # writing tests; it is excellent.
npx playwright test --headed         # see the real browser
npx playwright test --debug          # pause and step
npx playwright codegen localhost:3000 # ‼️ records your clicks and WRITES the
                                     # test for you — the fastest way to start
npx playwright show-report           # HTML report with screenshots and traces
```

```text
‼️ E2E RULES, because these tests are the ones that go bad:

  1. KEEP THE NUMBER SMALL. Five to fifteen tests covering your critical
     journeys — sign up, log in, the core action, checkout. Not every edge
     case; those belong in cheaper, faster tests lower down the pyramid.

  2. NEVER SLEEP. Use auto-waiting assertions. Hard waits are the primary
     cause of flaky suites.

  3. EACH TEST CREATES ITS OWN DATA. Tests that depend on a specific record
     existing break when someone else's test deletes it, and they cannot run
     in parallel.

  4. DO NOT LOG IN THROUGH THE UI EVERY TIME. Log in once, save the auth
     state, and reuse it. Repeating a 3-second login in 15 tests wastes most
     of your runtime.

  5. A FLAKY TEST IS WORSE THAN NO TEST. Once people start re-running the
     suite instead of reading failures, every test has lost its value. Fix it
     or delete it — do not leave it failing intermittently.
```

---

## 13. What to Test and What to Skip

```text
‼️ TEST THESE — high value, in rough priority order:

  ✓ BUSINESS LOGIC — pricing, discounts, permissions, state transitions,
    validation rules. Anything with an `if` that matters commercially.
  ✓ MONEY — anything touching payments, invoices, balances. Twice.
  ✓ AUTH — who can see what, who can do what. The tests that stop a data breach.
  ✓ API CONTRACTS — status codes and response shapes your clients depend on.
  ✓ EDGE CASES AND BOUNDARIES — empty, zero, one, maximum, negative.
  ✓ BUG FIXES — always write the failing test first, then fix it.
  ✓ THE CRITICAL USER JOURNEY — one E2E covering the thing your product exists
    to do.

‼️ DO NOT BOTHER TESTING — low value, high maintenance:

  ✗ THIRD-PARTY LIBRARIES. React works. Postgres works. Not your job.
  ✗ TRIVIAL GETTERS AND SETTERS with no logic in them.
  ✗ IMPLEMENTATION DETAILS — private methods, internal state, "was this
    function called in this exact order". These break on every refactor even
    when behaviour is unchanged, which is the definition of a bad test.
  ✗ EXACT COPY AND STYLING. "The heading says exactly 'Welcome back, Ada!'"
    fails when marketing reword it. Test that a heading exists, not its prose.
  ✗ CONFIG FILES AND CONSTANTS.
  ✗ CODE YOU ARE ABOUT TO DELETE.

‼️ THE TEST THAT TELLS YOU WHICH IS WHICH:
   "If I refactor the implementation without changing the behaviour, should
   this test still pass?"
   YES → you are testing behaviour. Good test.
   NO  → you are testing implementation. It will cost you more than it saves.
```

```text
‼️ ABOUT CODE COVERAGE — because someone will ask you for a number.

  Coverage measures which LINES ran during your tests. That is all it measures.

  This function has 100% coverage and is completely untested:

      it('works', () => { calculateDiscount(100, 'SAVE10'); });
      // No expect() at all. Every line ran. Coverage: 100%. Value: zero.

  Use coverage to FIND UNTESTED AREAS — "nothing in the payments module is
  covered" is genuinely useful information. Do not use it as a goal. Chasing
  90% produces tests written to touch lines rather than to verify behaviour.

  A pragmatic target: 70-80% overall, with the critical paths near 100% and
  nobody worrying about the rest.
```

---

## 14. Running Tests & CI

```jsonc
// package.json
{
  "scripts": {
    "test": "vitest run",           // once, then exit — what CI runs
    "test:watch": "vitest",         // ‼️ re-runs on save. What you use while
                                    // developing — instant feedback loop
    "test:ui": "vitest --ui",       // browser UI for exploring results
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

```bash
# ── Running a subset while you work ─────────────────────────────────────
npx vitest run pricing              # only files matching "pricing"
npx vitest run -t "applies 10%"     # only tests whose NAME matches
```

```typescript
// ── Focusing and skipping ───────────────────────────────────────────────
it.only('just this one', () => {});   // run ONLY this in the file
it.skip('not ready yet', () => {});   // skip it, but keep it visible
it.todo('handle refunds');            // a reminder that shows in the output

// ‼️ Never commit .only — it silently disables every other test in the file
// and CI goes green while testing almost nothing. Add an ESLint rule
// (no-only-tests) so it cannot happen by accident.
```

```yaml
# ── .github/workflows/test.yml — a minimal CI setup ─────────────────────
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'          # caches dependencies between runs — big speedup

      - run: npm ci             # ‼️ `ci` not `install` — installs exactly what
                                # the lockfile says, so CI cannot silently get
                                # different versions than your machine
      - run: npm run test
      - run: npm run test:e2e
```

```text
‼️ THE POINT OF CI: tests only protect you if they RUN. A suite that passes on
   your machine and is never run on a pull request will be broken within a
   month and nobody will notice. Make the tests run automatically on every PR,
   and block merging when they fail.
```

---

## 15. Common Beginner Mistakes

```text
‼️ 1. Testing implementation instead of behaviour.
   Asserting on internal state, private methods, or call order. The test breaks
   on every refactor even though nothing user-visible changed. Test what goes
   IN and what comes OUT.

‼️ 2. Writing a test with no assertion.
   The code runs, nothing is checked, the test passes. Always have an expect().

‼️ 3. Forgetting the arrow function when testing a throw.
   expect(divide(1, 0)).toThrow()   ← throws immediately, test errors
   expect(() => divide(1, 0)).toThrow()   ← correct

‼️ 4. Forgetting await on an async assertion.
   The test finishes before the promise settles and passes regardless.
   Use: await expect(promise).rejects.toThrow()

‼️ 5. Tests that depend on each other or on order.
   Test B only passes because test A created a record. Reset state in
   beforeEach/afterEach; every test must pass alone.

‼️ 6. Not resetting mocks between tests.
   Call counts and queued return values leak. Use vi.resetAllMocks() in
   afterEach, or the clearMocks config option.

‼️ 7. Mocking everything.
   If a test only touches mocks, it proves your mocks work. Use real
   dependencies wherever it is practical — especially your database.

‼️ 8. Using getBy for something that loads asynchronously.
   The element is not there yet, the test fails intermittently. Use findBy.

‼️ 9. Hard-coded sleeps in E2E tests.
   await page.waitForTimeout(2000) is slow AND still flaky. Use auto-waiting
   assertions instead.

‼️ 10. Testing dates without freezing time.
   Passes today, fails on the 1st, or at midnight, or in another timezone.
   Use vi.setSystemTime().

‼️ 11. Chasing a coverage percentage.
   Produces tests that touch lines without verifying anything.

‼️ 12. Committing it.only.
   Silently disables the rest of the file. CI goes green testing nothing.

‼️ 13. Vague test names.
   "it works" tells you nothing when it fails at 2am. Describe the behaviour:
   "returns 409 when the email is already registered".

‼️ 14. Leaving a flaky test in the suite.
   People start ignoring failures, and then all the tests are worthless.
   Fix it or delete it.
```

---

## 16. Cheat Sheet

```javascript
// ── STRUCTURE ─────────────────────────────────────────────────────────────
describe('thing', () => {
  beforeAll(() => {});    // once, before all tests in this block
  beforeEach(() => {});   // before EVERY test — where you reset state
  afterEach(() => {});    // after every test — cleanup
  afterAll(() => {});     // once, at the end — close connections

  it('does the thing', () => {
    // ARRANGE — set up
    // ACT     — run the one thing under test
    // ASSERT  — expect(...)
  });
});

// ── ASSERTIONS ────────────────────────────────────────────────────────────
expect(x).toBe(5);                    // primitives, ===
expect(obj).toEqual({ a: 1 });        // objects/arrays, deep compare
expect(obj).toMatchObject({ a: 1 });  // partial match
expect(arr).toHaveLength(3);
expect(arr).toContain('x');
expect(x).toBeTruthy() / toBeNull() / toBeUndefined();
expect(n).toBeGreaterThan(5) / toBeCloseTo(0.3);
expect(() => fn()).toThrow('message');            // note the arrow
await expect(promise).resolves.toEqual(x);
await expect(promise).rejects.toThrow(ErrorType);
expect(mock).toHaveBeenCalledWith('a', 'b');
expect(x).not.toBe(5);

// ── MOCKS ─────────────────────────────────────────────────────────────────
const fn = vi.fn();
fn.mockReturnValue(x);  fn.mockResolvedValue(x);  fn.mockRejectedValue(err);
vi.spyOn(obj, 'method');
vi.resetAllMocks();                  // in afterEach
vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01')); vi.useRealTimers();

// ── BACKEND API (supertest) ───────────────────────────────────────────────
await request(app)
  .post('/api/users')
  .set('Authorization', `Bearer ${token}`)
  .send({ email: 'a@b.com' })
  .expect(201);

// ── REACT (Testing Library) ───────────────────────────────────────────────
const user = userEvent.setup();
render(<Component />);
screen.getByRole('button', { name: 'Save' });    // ‼️ preferred query
screen.getByLabelText('Email');
await screen.findByText('Loaded');               // async — waits
screen.queryByText('Error');                     // may be absent
await user.click(el);  await user.type(el, 'text');

// ── E2E (Playwright) ──────────────────────────────────────────────────────
await page.goto('/login');
await page.getByLabel('Email').fill('a@b.com');
await page.getByRole('button', { name: 'Log in' }).click();
await expect(page.getByText('Welcome')).toBeVisible();   // auto-waits

// ── COMMANDS ──────────────────────────────────────────────────────────────
// vitest                     watch mode (development)
// vitest run                 once (CI)
// vitest run -t "name"       only matching test names
// playwright test --ui       interactive E2E runner
// playwright codegen <url>   record a test by clicking
```

---

## 17. Where to Go Next

```text
A SENSIBLE ORDER TO ACTUALLY LEARN THIS:

  1. Write unit tests for pure functions. No mocks, no setup — just input and
     output. Get comfortable with describe/it/expect and AAA.

  2. Write API endpoint tests with supertest. ‼️ If you only ever do one kind
     of backend test, make it this one — best value per test written.

  3. Add a real database with Testcontainers. This is where the tests start
     catching bugs that matter.

  4. Learn mocking properly — but only for genuinely external things.

  5. Add component tests for the interactive parts of your UI.

  6. Add three to five E2E tests for your critical journeys. Stop there.

  7. Wire it all into CI so it runs on every pull request.

THEN, WHEN YOU WANT MORE DEPTH:
  - TDD (write the test first) — changes how you design code
  - Test data factories and fixtures — for managing setup at scale
  - Contract testing — once you have separate services
  - Load testing with k6 — before a launch or a traffic spike
  - Mutation testing — tests your tests by breaking your code deliberately

‼️ THE HABIT WORTH BUILDING FIRST: every time you fix a bug, write the failing
   test BEFORE the fix. It forces you to actually reproduce the bug (so you
   know you fixed the right thing), it proves the fix works, and the bug can
   never silently come back. It is the single highest-return testing habit,
   and it requires no strategy discussion with anyone.
```

---

## Related Files

- [TESTING-DEEP.md](TESTING-DEEP.md) — the same ground at interview depth, plus patterns and anti-patterns
- [TESTING-STRATEGY-DEEP.md](TESTING-STRATEGY-DEEP.md) — the testing trophy, what to test at each level, CI strategy
- [TESTING-ECOSYSTEM-DEEP.md](../1-high-priority/TESTING-ECOSYSTEM-DEEP.md) — the full reference: TDD, QA roles, test planning, manual testing
- [NESTJS-DEEP.md](NESTJS-DEEP.md) — §27 testing a NestJS app specifically
- [TYPEORM-BASICS.md](TYPEORM-BASICS.md) — the database layer these tests exercise
