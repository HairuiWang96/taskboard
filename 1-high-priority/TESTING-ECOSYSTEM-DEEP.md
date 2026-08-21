# Testing Ecosystem — Complete Enterprise Reference

> Complete reference covering testing philosophy, developer testing, QA workflows, automation, manual testing, performance, security, team roles, test environments, release management, and the full testing lifecycle for large projects.

---

## Table of Contents

### Part 1 — Testing Philosophy & Fundamentals
1. [Testing Philosophy](#1-testing-philosophy)
2. [Types of Testing Overview](#2-types-of-testing-overview)
3. [Test-Driven Development (TDD)](#3-test-driven-development-tdd)
4. [Testing Patterns & Anti-patterns](#4-testing-patterns--anti-patterns)

### Part 2 — Developer Testing (Code-Level)
5. [Unit Testing with Vitest/Jest](#5-unit-testing-with-vitestjest)
6. [Mocking & Test Doubles](#6-mocking--test-doubles)
7. [Integration Testing](#7-integration-testing)
8. [React Component Testing](#8-react-component-testing)
9. [E2E Testing with Playwright](#9-e2e-testing-with-playwright)
10. [API Testing](#10-api-testing)
11. [Code Coverage](#11-code-coverage)

### Part 3 — QA & Team Workflow
12. [QA Roles & Responsibilities](#12-qa-roles--responsibilities)
13. [Testing in Agile/Scrum](#13-testing-in-agilescrum)
14. [Test Planning & Test Case Management](#14-test-planning--test-case-management)
15. [Manual Testing](#15-manual-testing)
16. [Bug Lifecycle & Defect Management](#16-bug-lifecycle--defect-management)
17. [Test Environments Strategy](#17-test-environments-strategy)
18. [Test Data Management](#18-test-data-management)

### Part 4 — Automation at Scale
19. [Test Automation Strategy](#19-test-automation-strategy)
20. [Automation Framework Design](#20-automation-framework-design)
21. [CI/CD Testing Pipeline](#21-cicd-testing-pipeline)
22. [Visual Regression Testing](#22-visual-regression-testing)
23. [Cross-Browser & Cross-Device Testing](#23-cross-browser--cross-device-testing)

### Part 5 — Specialized Testing
24. [Performance & Load Testing](#24-performance--load-testing)
25. [Security Testing](#25-security-testing)
26. [Accessibility Testing](#26-accessibility-testing)
27. [Chaos Engineering](#27-chaos-engineering)
28. [Contract Testing](#28-contract-testing)

### Part 6 — Metrics, Reporting & Release
29. [Test Metrics & Reporting](#29-test-metrics--reporting)
30. [Release Management](#30-release-management)
31. [Production Testing](#31-production-testing)

### Part 7 — The Complete Testing Workflow
32. [End-to-End Team Workflow](#32-end-to-end-team-workflow)

---

# Part 1 — Testing Philosophy & Fundamentals

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
```

### The testing trophy (Kent C. Dodds alternative)

```text
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

"Write tests. Not too many. Mostly integration."
```

### Why we test

```text
‼️ Testing is not about finding bugs — it's about preventing them and
   enabling confident, fast delivery.

Benefits of a good test suite:
  1. Confidence to refactor — change code without fear of breaking things
  2. Living documentation — tests describe what the system actually does
  3. Faster feedback loop — catch bugs in seconds, not days
  4. Cheaper bug fixes — bugs caught early cost 10-100x less to fix
  5. Enables CI/CD — automated tests are the gate for continuous deployment
  6. Team velocity — new developers can change code safely
  7. Design feedback — hard-to-test code is usually poorly designed
```

### Cost of bugs at each stage

```text
‼️ The later a bug is found, the more expensive it is to fix:

Stage               Relative Cost    Example
─────────────────────────────────────────────────────────────
Design/Requirements    1x            "Should we validate email format?"
Development           5x             Developer finds logic error while coding
Code Review           10x            Reviewer spots missing null check
Unit Test             10x            Test catches wrong calculation
Integration Test      25x            API returns wrong status code
QA/Staging            50x            QA finds broken checkout flow
Production           100-1000x       Users can't complete purchases
                                     (lost revenue + emergency fix + incident response)

This is why "shift-left" testing matters — move testing earlier in the lifecycle.
```

### Shift-left and shift-right testing

```text
Shift-left testing: Move testing EARLIER in the development lifecycle
  - Write tests during development, not after
  - Static analysis catches bugs at compile time (TypeScript, ESLint)
  - TDD — write the test before the code
  - Code review includes test review
  - Security scanning in IDE (not just in prod)
  - Developers write their own tests (not a separate QA phase)

Shift-right testing: Continue testing AFTER deployment
  - Synthetic monitoring — automated checks in production
  - Canary deployments — deploy to 1% of users first
  - Feature flags — test in production safely
  - Real user monitoring (RUM) — track actual user experience
  - A/B testing — validate changes with real traffic
  - Chaos engineering — intentionally break things to find weaknesses

‼️ Modern teams do BOTH — shift-left for prevention, shift-right for detection.
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

### What to test at each level

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

## 2. Types of Testing Overview

```text
‼️ Complete taxonomy of testing types — know when to use each one:

Type              What It Tests                          When to Use
──────────────────────────────────────────────────────────────────────────────────
Unit              Single function/module in isolation    Always — fast feedback on logic
Integration       Multiple modules working together      Always — catches wiring issues
E2E (End-to-End)  Full user flows in real browser        Critical paths only — slow but high confidence
Smoke             Basic "does it start?" checks          After every deployment — quick sanity
Regression        Previously working features            Before every release — catch regressions
Sanity            Focused check after a bug fix          After specific fix — verify the fix works
Exploratory       Unscripted manual investigation        When requirements are unclear or new features
Acceptance (UAT)  Business requirements met              Before release — stakeholder sign-off
Performance       Speed, throughput, resource usage       Before major releases — ensure SLAs
Security          Vulnerabilities, attack vectors        Continuously — in CI and periodic audits
Accessibility     Usable by people with disabilities     Continuously — legal requirement in many regions
Chaos             System resilience under failure        Periodically — build confidence in fault tolerance
Contract          API agreements between services        When services are developed by different teams

Detailed definitions:
```

### Unit testing

```text
Tests a single function, class, or module in complete isolation.
All external dependencies are mocked or stubbed.
Runs in milliseconds. Should make up the bulk of your test suite.

Example: testing a calculateDiscount() function with various inputs.
```

### Integration testing

```text
Tests how multiple modules work together with real dependencies.
May use a real database, real HTTP calls (via MSW), real child components.
Slower than unit tests but catches wiring bugs that unit tests miss.

Example: testing an API endpoint that queries a real database and returns formatted JSON.
```

### E2E (End-to-End) testing

```text
Tests the entire application from the user's perspective in a real browser.
Uses tools like Playwright or Cypress. Interacts with real UI, real backend, real database.
Slowest and most expensive — reserve for critical user journeys.

Example: user signs up → verifies email → logs in → creates a task → marks it complete.
```

### Smoke testing

```text
A minimal set of tests that verify the application starts and core functions work.
"Build verification test" — does the build work at all?
Run after every deployment. Should take < 2 minutes.

Example: homepage loads, login endpoint responds 200, main API returns data.
```

### Regression testing

```text
Re-running existing tests to ensure new changes haven't broken existing functionality.
Can be automated (preferred) or manual. Run before every release.

Example: after adding a new feature, run the full test suite to catch side effects.
```

### Sanity testing

```text
A narrow, focused check to verify a specific fix or feature works.
Not exhaustive — just confirms the targeted area is working.

Example: bug fix for "user can't save profile" → sanity test: save profile and verify.
```

### Exploratory testing

```text
Unscripted, investigative testing where the tester actively explores the application.
Relies on tester's experience, intuition, and creativity.
Finds bugs that scripted tests miss — especially UX issues and edge cases.

Approaches:
  - Session-based: time-boxed sessions (30-90 min) with a charter (goal)
  - Ad-hoc: completely unstructured exploration
  - Pair exploratory: two testers explore together — one drives, one observes

Example charter: "Explore the checkout flow with various payment methods,
looking for edge cases around coupon codes and international addresses."
```

### Acceptance testing (UAT)

```text
Validates that the software meets business requirements from the user's perspective.
Run by stakeholders, product owners, or actual end users — not developers.
The final gate before release — requires formal sign-off.

Example: product owner verifies that the new reporting dashboard shows correct data
and matches the requirements in the user story.
```

### Performance testing

```text
Measures how the system performs under various conditions — speed, scalability, stability.
Sub-types: load, stress, spike, soak, scalability (detailed in section 24).

Example: verify the API handles 1000 concurrent users with p95 response time < 500ms.
```

### Security testing

```text
Identifies vulnerabilities and ensures the application is protected against attacks.
Includes SAST, DAST, SCA, penetration testing (detailed in section 25).

Example: scanning for SQL injection, XSS, insecure dependencies, exposed secrets.
```

### Accessibility testing

```text
Ensures the application is usable by people with disabilities.
Tests keyboard navigation, screen reader compatibility, color contrast, ARIA attributes.
Legal requirement in many jurisdictions (ADA, Section 508, WCAG). Detailed in section 26.

Example: verify all interactive elements are keyboard-accessible and have proper ARIA labels.
```

### Chaos engineering

```text
Intentionally introduces failures to test system resilience.
Kills servers, adds network latency, fills disks — validates graceful degradation.
Detailed in section 27.

Example: randomly terminate a pod in Kubernetes and verify the system self-heals.
```

### Contract testing

```text
Verifies that two services (consumer and provider) agree on the API contract.
Consumer defines expectations, provider verifies it can meet them.
Detailed in section 28.

Example: frontend expects GET /api/users to return { id: number, name: string }[].
Contract test verifies the backend actually returns that shape.
```

---

## 3. Test-Driven Development (TDD)

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
  - Built-in regression coverage
  - Natural documentation of expected behaviour

When to use TDD:
  ✓ Business logic (calculations, rules, algorithms)
  ✓ Bug fixes — write a test that reproduces the bug first
  ✓ New features with clear requirements
  ✓ Pure functions / algorithms: easy to test-drive
  ✓ Complex state machines

When NOT to use TDD:
  ✗ Exploratory coding — when you don't know the API yet
  ✗ UI layout — hard to TDD pixel-perfect designs
  ✗ One-off scripts
  ⚠️ Prototyping — write tests after shape is clear
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

### BDD (Behavior-Driven Development)

```text
‼️ BDD extends TDD by writing tests in natural language that non-technical
   stakeholders can understand.

Key concept: tests are written as "specifications" using Given/When/Then syntax.

Tools:
  - Gherkin: the language for writing BDD specs (.feature files)
  - Cucumber: the tool that runs Gherkin specs
  - Jest-Cucumber: Cucumber bindings for Jest/Vitest
```

```text
# features/checkout.feature (Gherkin syntax)
Feature: Checkout
  As a customer
  I want to purchase items in my cart
  So that I can receive products I need

  Scenario: Apply discount code
    Given I have items totaling $120 in my cart
    And I have a valid 10% discount code "SAVE10"
    When I apply the discount code at checkout
    Then the total should be $108
    And the discount should show as "$12 off"

  Scenario: Reject expired discount code
    Given I have items totaling $120 in my cart
    And I have an expired discount code "OLD20"
    When I apply the discount code at checkout
    Then I should see an error "This discount code has expired"
    And the total should remain $120
```

```ts
// Step definitions — connect Gherkin to actual test code
import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature('./features/checkout.feature');

defineFeature(feature, (test) => {
  test('Apply discount code', ({ given, and, when, then }) => {
    let cart: Cart;
    let result: CheckoutResult;

    given(/^I have items totaling \$(\d+) in my cart$/, (total) => {
      cart = createCart(Number(total));
    });

    and(/^I have a valid (\d+)% discount code "(.+)"$/, (percent, code) => {
      createDiscountCode(code, Number(percent));
    });

    when('I apply the discount code at checkout', () => {
      result = applyDiscount(cart, 'SAVE10');
    });

    then(/^the total should be \$(\d+)$/, (expectedTotal) => {
      expect(result.total).toBe(Number(expectedTotal));
    });
  });
});
```

### ATDD (Acceptance Test-Driven Development)

```text
‼️ ATDD is similar to BDD but focuses on acceptance criteria defined collaboratively
   by the "three amigos" — developer, QA, and product owner.

Workflow:
  1. Product owner writes acceptance criteria for a user story
  2. Three amigos discuss and refine the criteria together
  3. QA or developer writes automated acceptance tests from the criteria
  4. Developer writes code to make acceptance tests pass
  5. Tests serve as living documentation of requirements

Difference from BDD:
  - BDD focuses on behavior specification language (Gherkin)
  - ATDD focuses on the collaborative process of defining acceptance criteria
  - In practice, they often overlap — ATDD may use BDD tools
```

---

## 4. Testing Patterns & Anti-patterns

### Good patterns

```ts
// ‼️ Arrange-Act-Assert (AAA) structure — easy to read
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

### What makes a good test (FIRST principles)

```text
F — Fast:       milliseconds, not seconds
I — Isolated:   doesn't depend on other tests or global state
R — Repeatable: same result every run (no randomness, no time dependency)
S — Self-validating: passes or fails, no manual inspection needed
T — Timely:     written alongside or before the code

✅ Good test:
  - Fails when behaviour breaks (not just when code changes)
  - Clear what it's testing from the name alone
  - One logical assertion per test (can have multiple expects)
  - Tests one scenario
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

### More anti-patterns

```text
❌ Bad test smells:
  - Tests internal implementation (tests a function that shouldn't be public)
  - Asserts on snapshots of huge components (brittle, noisy diffs)
  - Skipped tests (just delete them)
  - Test that always passes (missing assertion, wrong expectation)
  - Tests that depend on each other's side effects (order-dependent)
  - Mock everything — tests nothing real
  - Excessive setup — test becomes unreadable
  - Test names like "test1", "should work", "handles edge case"
```

### Flaky tests

```text
‼️ Flaky test: passes sometimes, fails sometimes — same code

Common causes and fixes:
  Async timing:     Use findBy* (waits) instead of getBy* after async action
  Shared state:     Clean up before/after each test (beforeEach, afterEach)
  Test ordering:    Tests must be independent — any order should work
  Real timers:      Use vi.useFakeTimers() for setTimeout/setInterval
  Network calls:    Mock external APIs — real network is unreliable in CI
  Date/time:        vi.setSystemTime() to freeze time
  Random data:      Use fixed seeds or vi.spyOn(Math, 'random')
  Race conditions:  Use waitFor() with assertions, not arbitrary sleeps
  Port conflicts:   Use random available ports in test servers
  File system:      Use temp directories, clean up after

Flaky test policy:
  - Quarantine flaky tests immediately (move to a separate suite)
  - Fix or delete within 1 sprint — don't let them rot
  - Track flaky test rate as a team metric
```

### Test isolation

```text
‼️ Every test must be completely independent:
  - No test should depend on another test's output
  - No test should leave state that affects another test
  - Tests should be runnable in any order
  - Tests should be runnable in parallel

Techniques for isolation:
  - beforeEach/afterEach hooks for setup/teardown
  - Fresh database state per test (truncate or transaction rollback)
  - Unique test data per test (use factories with random IDs)
  - Mock external dependencies (network, file system, time)
  - Container isolation (testcontainers for real databases)
```

### Deterministic tests

```text
A deterministic test produces the same result every single time.
Non-deterministic tests are worse than no tests — they erode trust.

Sources of non-determinism and fixes:
  Current date/time → vi.setSystemTime(new Date('2024-01-15'))
  Random values     → vi.spyOn(Math, 'random').mockReturnValue(0.5)
  UUID generation   → mock the UUID generator
  Network requests  → use MSW or mocks
  Database state    → clean before each test
  File system       → use temp directories
  Environment vars  → set explicitly in test setup
  Parallel tests    → ensure no shared mutable state
```

---

# Part 2 — Developer Testing (Code-Level)

---

## 5. Unit Testing with Vitest/Jest

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

### Parameterized tests

```ts
// ‼️ Use it.each for testing many inputs with the same logic
describe('isValidAge', () => {
  it.each([
    { input: 0, expected: false, description: 'zero' },
    { input: -1, expected: false, description: 'negative' },
    { input: 17, expected: false, description: 'minor' },
    { input: 18, expected: true, description: 'exactly 18' },
    { input: 65, expected: true, description: 'senior' },
    { input: 150, expected: false, description: 'unreasonably old' },
    { input: NaN, expected: false, description: 'NaN' },
  ])('returns $expected for $description ($input)', ({ input, expected }) => {
    expect(isValidAge(input)).toBe(expected);
  });
});

// Table-driven tests (alternative syntax)
it.each`
  input     | expected
  ${''}     | ${false}
  ${'abc'}  | ${false}
  ${'1234'} | ${true}
  ${'12'}   | ${false}
`('validates code "$input" → $expected', ({ input, expected }) => {
  expect(isValidCode(input)).toBe(expected);
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

// ❌ Bad use: large component snapshot (any change → noisy diff → people update blindly)
// If you do use component snapshots:
// expect(container).toMatchSnapshot()
// Run with --updateSnapshot when intentional changes are made
// Review snapshot diffs in PR — don't blindly update

// Better alternative: assert on specific text/role/structure with RTL queries
```

### Lifecycle hooks

```ts
// beforeAll/afterAll — run once for the entire describe block
// beforeEach/afterEach — run before/after each individual test

describe('UserService', () => {
  let db: Database;

  beforeAll(async () => {
    // Expensive setup — do once
    db = await connectToTestDatabase();
    await db.migrate();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clean state for each test
    await db.truncateAll();
  });

  afterEach(() => {
    vi.restoreAllMocks(); // restore any spies
  });

  it('creates a user', async () => { /* ... */ });
  it('finds a user by email', async () => { /* ... */ });
});
```

### Property-based testing

```ts
// ‼️ Instead of writing specific test cases, define properties that should always hold
// and let the framework generate hundreds of random inputs to try to break them.
// Libraries: fast-check (JS), hypothesis (Python)

import fc from 'fast-check';

// Property: sorting twice gives same result as sorting once
fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
        const once = [...arr].sort((a, b) => a - b);
        const twice = [...once].sort((a, b) => a - b);
        expect(once).toEqual(twice);
    })
);
// fast-check generates hundreds of random arrays automatically

// Property: encode then decode = original
fc.assert(
    fc.property(fc.string(), (str) => {
        expect(decode(encode(str))).toBe(str);
    })
);

// Great for: algorithms, parsers, serializers, data transformation functions
// where you can define invariants
```

### File structure

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

---

## 6. Mocking & Test Doubles

### Types of test doubles

```text
‼️ Know the difference between each type:

Dummy:   object passed but never used (filling parameter lists)
Stub:    returns predefined responses ("when called with X, return Y")
Fake:    working implementation, but simplified (in-memory DB instead of real)
Mock:    stub + expectations ("verify that fetchUser was called with userId=123")
Spy:     wraps real implementation, records calls

In practice with vi.fn():
  - vi.fn() is both a stub and a mock — set return values AND assert on calls
  - vi.spyOn() is a spy — wraps the real implementation, records calls
  - The conceptual distinction matters: test behavior, not that specific methods were called
```

```ts
// Stub — replace with fixed return
vi.spyOn(userService, 'findById').mockResolvedValue({ id: 1, name: 'Alice' });

// Mock — assert it was called
expect(emailService.send).toHaveBeenCalledWith({
    to: 'alice@example.com',
    subject: 'Welcome',
});

// Spy — real implementation + observe calls
const spy = vi.spyOn(console, 'error');
doSomething();
expect(spy).toHaveBeenCalledTimes(1);
spy.mockRestore();
```

### What to mock vs what not to mock

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
```

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

// vi.mock — mock entire module
vi.mock('../lib/stripe', () => ({
  createPaymentIntent: vi.fn().mockResolvedValue({ clientSecret: 'pi_test' }),
}))

// Mock with factory (runs before imports — hoisted)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard',
}))
```

### MSW (Mock Service Worker)

```text
‼️ MSW is the best practice for API mocking — intercepts real HTTP requests at the
   network layer. Your code exercises the real fetch logic. Works in both browser and Node.
   Define handlers once, share across unit + integration + E2E tests.
```

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

  // Error scenario
  http.get('/api/users/:id', ({ params }) => {
    if (params.id === '999') {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({ id: params.id, name: 'Alice' })
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

### Dependency injection for testability

```ts
// ‼️ Code that creates its own dependencies is hard to test.
// Inject dependencies so tests can provide test doubles.

// ✗ Hard to test — creates its own dependency
class UserService {
  private db = new PostgresDatabase();

  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}

// ✓ Easy to test — dependency is injected
class UserService {
  constructor(private db: Database) {}

  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}

// In production:
const userService = new UserService(new PostgresDatabase());

// In tests:
const fakeDb = { query: vi.fn().mockResolvedValue([{ id: '1', name: 'Alice' }]) };
const userService = new UserService(fakeDb);
```

---

## 7. Integration Testing

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

### API integration tests (Supertest)

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

### Test Containers (real DB in CI)

```ts
// ‼️ @testcontainers/postgresql — spins up real Postgres in Docker for tests
// No more "works on my machine" — identical DB in CI and local
import { PostgreSqlContainer } from '@testcontainers/postgresql'

let container: StartedPostgreSqlContainer

beforeAll(async () => {
  container = await new PostgreSqlContainer().start()
  process.env.DATABASE_URL = container.getConnectionUri()
  await runMigrations()
}, 60_000)  // 60s timeout — container startup can be slow

afterAll(async () => {
  await container.stop()
})

// Benefits:
// - Real database, not an in-memory fake
// - Identical behavior to production
// - Automatic cleanup when container stops
// - Works in CI without configuring external services
```

---

## 8. React Component Testing

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

### Core Philosophy

```text
‼️ Test behaviour, not implementation.
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

Accessible role list (know these):
  button, link, heading, textbox, checkbox, radio, combobox, listbox,
  option, menuitem, dialog, alert, status, img, list, listitem, table
```

### Component testing examples

```tsx
// src/components/TaskForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TaskForm } from './TaskForm';

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

### More RTL examples

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

// ‼️ Tip: Only use renderHook for complex hooks with many branches.
// For simple hooks, test the component that uses the hook — tests behavior end-to-end.
```

### Testing forms

```tsx
// Testing form validation, submission, and error handling
describe('RegistrationForm', () => {
  it('shows field-level errors on blur', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid');
    await user.tab(); // blur the field

    await screen.findByText(/valid email/i);
  });

  it('shows server-side errors after submission', async () => {
    server.use(
      http.post('/api/register', () => {
        return HttpResponse.json(
          { errors: { email: 'Email already taken' } },
          { status: 422 }
        );
      })
    );

    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText(/email/i), 'taken@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await screen.findByText(/email already taken/i);
  });

  it('redirects on successful registration', async () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
```

### Testing async flows

```tsx
// Testing components that load data asynchronously
describe('UserProfile', () => {
  it('shows loading state, then user data', async () => {
    render(<UserProfile userId="123" />);

    // Loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Data loaded
    const heading = await screen.findByRole('heading', { name: /alice/i });
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      })
    );

    render(<UserProfile userId="999" />);

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(/not found/i);
  });
});
```

---

## 9. E2E Testing with Playwright

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
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
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

### Checkout flow example

```ts
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

// e2e/pages/LoginPage.ts
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

// Usage in tests
test('create and complete a task', async ({ page }) => {
  const taskPage = new TaskPage(page);
  await taskPage.goto();
  await taskPage.addTask('Buy milk', 'high');
  await taskPage.completeTask('Buy milk');

  await expect(taskPage.getTaskItem('Buy milk')).toHaveClass(/completed/);
});
```

### Playwright fixtures

```ts
// e2e/fixtures.ts — reusable test setup
import { test as base } from '@playwright/test';
import { TaskPage } from './pages/TaskPage';
import { LoginPage } from './pages/LoginPage';

type Fixtures = {
  taskPage: TaskPage;
  loginPage: LoginPage;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  taskPage: async ({ page }, use) => {
    await use(new TaskPage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  authenticatedPage: async ({ page }, use) => {
    // Login once, reuse for all tests using this fixture
    const loginPage = new LoginPage(page);
    await loginPage.login('user@test.com', 'testpassword');
    await use(page);
  },
});

// Usage
test('create task as authenticated user', async ({ authenticatedPage, taskPage }) => {
  await taskPage.goto();
  await taskPage.addTask('New task');
  // ...
});
```

### Screenshots and video recording

```ts
// Playwright automatically captures on failure (configured in playwright.config.ts)
// You can also capture manually:

test('visual check', async ({ page }) => {
  await page.goto('/dashboard');
  await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });
});

// CI integration — upload artifacts on failure
// See CI testing pipeline section (21) for GitHub Actions config
```

---

## 10. API Testing

### Postman/Newman for API testing

```text
‼️ Postman is a GUI tool for manual API testing and exploration.
   Newman is the CLI runner for Postman collections — runs in CI.

Workflow:
  1. Create/organize API requests in Postman collections
  2. Write tests in Postman's test tab (JavaScript)
  3. Export collections as JSON
  4. Run with Newman in CI pipeline

Newman CLI:
  newman run collection.json --environment staging.json --reporters cli,junit
```

```js
// Postman test script (runs after each request)
pm.test('Status code is 200', () => {
  pm.response.to.have.status(200);
});

pm.test('Response has correct structure', () => {
  const json = pm.response.json();
  pm.expect(json).to.have.property('data');
  pm.expect(json.data).to.be.an('array');
  pm.expect(json.data[0]).to.have.all.keys('id', 'name', 'email');
});

pm.test('Response time is under 500ms', () => {
  pm.expect(pm.response.responseTime).to.be.below(500);
});

// Chain requests — save token from login for subsequent requests
// (Pre-request script)
const loginRes = pm.sendRequest({
  url: pm.environment.get('baseUrl') + '/auth/login',
  method: 'POST',
  body: { mode: 'raw', raw: JSON.stringify({ email: 'test@example.com', password: 'pass' }) },
});
pm.environment.set('authToken', loginRes.json().token);
```

### REST API testing patterns

```text
‼️ Test matrix for every REST endpoint:

For each endpoint, test:
  ✓ Happy path — valid input returns correct response
  ✓ Validation — invalid input returns 400 with clear error
  ✓ Authentication — missing/invalid token returns 401
  ✓ Authorization — wrong role returns 403
  ✓ Not found — invalid ID returns 404
  ✓ Conflict — duplicate resource returns 409
  ✓ Server error — graceful 500 handling

HTTP method patterns:
  GET    /resources       — list (pagination, filtering, sorting)
  GET    /resources/:id   — single resource (404 if not found)
  POST   /resources       — create (201 + Location header)
  PUT    /resources/:id   — full update (idempotent)
  PATCH  /resources/:id   — partial update
  DELETE /resources/:id   — delete (204 no content)
```

### GraphQL testing

```ts
// Testing GraphQL APIs
import request from 'supertest';

test('query users returns list', async () => {
  const res = await request(app)
    .post('/graphql')
    .send({
      query: `
        query {
          users {
            id
            name
            email
          }
        }
      `,
    });

  expect(res.status).toBe(200);
  expect(res.body.errors).toBeUndefined();
  expect(res.body.data.users).toHaveLength(3);
});

test('mutation createUser validates input', async () => {
  const res = await request(app)
    .post('/graphql')
    .send({
      query: `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
          }
        }
      `,
      variables: {
        input: { name: '', email: 'invalid' }, // invalid
      },
    });

  expect(res.body.errors).toBeDefined();
  expect(res.body.errors[0].message).toContain('Validation');
});
```

### Contract testing with Pact (consumer-driven contracts)

```text
‼️ See section 28 for full contract testing coverage.

Quick summary:
  - Consumer defines expectations (what it expects from the provider API)
  - Pact generates a contract file from the consumer tests
  - Provider verifies it can fulfill the contract
  - Pact Broker stores and manages contracts between services
```

### Schema validation

```ts
// ‼️ Validate API responses against a schema to catch breaking changes

import { z } from 'zod';

// Define the expected response schema
const UserResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
  createdAt: z.string().datetime(),
});

const UsersListSchema = z.object({
  data: z.array(UserResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
});

test('GET /api/users returns valid schema', async () => {
  const res = await request(app).get('/api/users');
  const parsed = UsersListSchema.safeParse(res.body);

  expect(parsed.success).toBe(true);
  if (!parsed.success) {
    console.error(parsed.error.format()); // helpful error output
  }
});
```

---

## 11. Code Coverage

### Understanding coverage metrics

```text
‼️ Know what each metric measures:

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

### Configuration

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

### Coverage targets by layer

```text
Targets by layer:
  Pure utils / business logic: 90–100%
  React components:            70–80%  (integration tests cover most)
  E2E critical paths:          key flows covered
  Overall:                     70–80% is healthy

❌ 100% coverage is not the goal:
  - Branches with impossible conditions shouldn't be forced
  - Getters/setters that are trivially correct
  - Generated code
  - Third-party library wrappers

✅ What matters:
  - All happy paths covered
  - Key error/edge cases covered
  - Critical user flows have E2E coverage
```

### What coverage DOESN'T tell you

```text
‼️ 100% coverage ≠ good tests
  You can have 100% coverage with worthless tests:

  it('runs without error', () => {
    expect(() => calculatePrice(100)).not.toThrow(); // covers the line, tests nothing
  });

Coverage is a minimum bar, not a quality measure.

A test that calls a function but makes no assertions gives
100% coverage with zero confidence.
```

### Mutation testing (Stryker)

```text
‼️ Mutation testing is the gold standard for measuring test quality.

How it works:
  1. Stryker automatically modifies (mutates) your source code
     - Changes + to -
     - Removes conditions (if → if(true))
     - Changes return values
     - Replaces string literals
  2. Runs your tests against each mutation
  3. If tests still PASS after a mutation → your tests are WEAK
     (they didn't catch a change in behavior)
  4. If tests FAIL after a mutation → your tests are STRONG
     (they detected the change)

Mutation score: % of mutations caught by tests
  - 90%+ mutation score = excellent test quality
  - Much more meaningful than line/branch coverage

Setup:
  npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner

  // stryker.config.json
  {
    "testRunner": "vitest",
    "mutate": ["src/lib/**/*.ts"],
    "reporters": ["html", "clear-text", "progress"],
    "coverageAnalysis": "perTest"
  }

  // Run: npx stryker run
```

### Meaningful coverage vs vanity metrics

```text
Vanity metric: "We have 95% code coverage!"
  → But are the tests actually checking correct behavior?
  → Are edge cases covered?
  → Would the tests catch a real bug?

Meaningful metrics:
  - Mutation score (from Stryker)
  - Coverage of critical business logic paths
  - Coverage of error handling paths
  - Branch coverage on complex conditionals
  - Test execution time (are tests fast enough to run on every push?)

Best practice:
  - Set coverage thresholds as a minimum bar (not a target)
  - Focus on testing behavior, not chasing coverage numbers
  - Use coverage reports to find UNTESTED code, not to prove quality
  - Review coverage diffs in PRs — new code should have tests
```

---

# Part 3 — QA & Team Workflow

---

## 12. QA Roles & Responsibilities

### Role definitions

```text
‼️ QA is not just "testing" — it's quality ASSURANCE across the entire lifecycle.

QA Engineer (Manual QA)
  - Writes and executes test cases
  - Performs exploratory testing
  - Reports and tracks bugs
  - Validates bug fixes
  - Participates in requirements review
  - Runs regression testing before releases
  - Cross-browser and device testing

SDET (Software Development Engineer in Test)
  - Writes automated tests (E2E, API, performance)
  - Builds and maintains test frameworks
  - Integrates tests into CI/CD pipelines
  - Creates test utilities and tools
  - Codes as much as developers, but focused on testing
  - Works on test infrastructure (test environments, data management)

QA Lead / QA Manager
  - Defines testing strategy for the team/org
  - Allocates QA resources across projects
  - Owns test metrics and reporting
  - Makes go/no-go decisions for releases
  - Mentors QA team members
  - Coordinates with dev leads on quality goals

Manual Tester
  - Focuses on manual test execution
  - Exploratory testing specialist
  - Usability and UX testing
  - Less technical than QA Engineer
  - Common in early career or specialized roles

Test Architect
  - Designs the overall test architecture
  - Selects tools and frameworks
  - Defines test automation standards
  - Creates reusable test patterns and libraries
  - Evaluates new testing technologies
  - Senior/principal-level role
```

### How QA fits in the team structure

```text
‼️ Two main models:

Embedded QA (recommended for agile teams):
  - QA engineer is part of the development team
  - Sits with developers, attends all ceremonies
  - Tests features as they're developed (not after)
  - Closer collaboration, faster feedback
  - QA has context on the feature being built

  Team: 5-8 devs + 1-2 QA engineers + 1 PM

Centralized QA team:
  - Separate QA department serves multiple dev teams
  - QA assigned to projects as needed
  - Good for specialized testing (security, performance, accessibility)
  - Risk: QA becomes a bottleneck, "throw over the wall" mentality
  - Works better for large organizations with specialized needs

Hybrid approach:
  - Each dev team has 1 embedded QA
  - Centralized team provides specialized testing (perf, security)
  - Best of both worlds

QA-to-developer ratio:
  - Typical: 1 QA per 3-5 developers
  - High automation: 1 QA per 5-8 developers
  - Heavily regulated (fintech, healthcare): 1 QA per 2-3 developers
  - Startups: developers own testing (0 dedicated QA)
```

---

## 13. Testing in Agile/Scrum

### When QA fits in sprints

```text
‼️ QA is not a phase at the end of the sprint — it's continuous throughout.

Sprint Planning:
  - QA reviews user stories for testability
  - QA estimates testing effort for each story
  - QA identifies test scenarios during planning
  - QA flags stories that need special test environments or data
  - Definition of Ready includes acceptance criteria that QA can test

During the Sprint:
  - Developer and QA pair on defining test cases (before coding starts)
  - QA writes test cases while developer codes
  - QA begins testing as soon as feature is PR-ready (not after merge)
  - QA provides immediate feedback — bugs fixed same day
  - Continuous testing, not "testing phase"

End of Sprint:
  - Final regression testing
  - Smoke test on staging environment
  - QA signs off on completed stories
  - Bugs that can't be fixed in sprint → backlog (with severity)

Sprint Review/Demo:
  - QA can demo test results and quality metrics
  - QA highlights any quality risks for stakeholders
```

### Three amigos

```text
‼️ Three amigos meeting: Developer + QA + Product Owner/PM
   Meet before development starts on a user story.

Purpose:
  - Shared understanding of the requirement
  - Developer understands WHAT to build
  - QA understands WHAT to test
  - PM confirms the ACCEPTANCE CRITERIA

Discuss:
  - Happy path scenarios
  - Edge cases and error scenarios
  - Non-functional requirements (performance, accessibility)
  - Test data needs
  - Dependencies on other teams/services

Output:
  - Refined acceptance criteria
  - Initial test scenarios
  - Identified risks and unknowns
  - Estimated effort (dev + QA)

Duration: 15-30 minutes per story
```

### Definition of Done includes testing

```text
A user story is NOT done until:
  ✓ Code is written and peer-reviewed
  ✓ Unit tests pass (developer)
  ✓ Integration tests pass (developer + QA)
  ✓ Feature tested on QA environment (QA)
  ✓ Acceptance criteria verified (QA + PM)
  ✓ No open S1/S2 bugs
  ✓ Regression tests pass
  ✓ Documentation updated (if applicable)
  ✓ Accessibility requirements met
  ✓ Performance within acceptable limits
```

### QA capacity planning

```text
Sprint testing capacity:
  - QA should spend ~60% on testing current sprint stories
  - ~20% on regression testing
  - ~10% on automation development/maintenance
  - ~10% on exploratory testing and process improvement

When QA becomes a bottleneck:
  - Stories pile up "waiting for QA" at end of sprint
  - Solutions:
    1. Start testing earlier (shift-left)
    2. Developers write more automated tests
    3. Automate regression suite (free up QA for new features)
    4. Add QA capacity
    5. Reduce WIP (fewer stories in parallel)
```

---

## 14. Test Planning & Test Case Management

### Test plans

```text
‼️ A test plan is a document that describes the testing approach for a feature,
   release, or project.

Contents of a test plan:
  1. Scope — what features/areas are being tested
  2. Objectives — what we're trying to verify
  3. Approach — manual vs automated, test types to use
  4. Test environment — where tests will run
  5. Test data requirements — what data is needed
  6. Schedule — when testing starts/ends
  7. Entry criteria — what must be true before testing begins
     (e.g., "all code merged to QA branch", "environment stable")
  8. Exit criteria — what must be true before testing is complete
     (e.g., "all P1/P2 bugs fixed", "95% test cases pass")
  9. Risks — what could go wrong (environment instability, data issues)
  10. Resources — who is testing, what tools
  11. Deliverables — test reports, bug reports, sign-off document
```

### Test cases vs test scenarios

```text
Test Scenario (high-level):
  "Verify that a user can complete the checkout process"

Test Cases (detailed steps derived from the scenario):
  TC-001: Checkout with valid credit card
    Precondition: User has items in cart, is logged in
    Steps:
      1. Navigate to cart page
      2. Click "Proceed to checkout"
      3. Enter valid shipping address
      4. Select "Credit Card" payment method
      5. Enter valid card details (4242424242424242, 12/28, 123)
      6. Click "Place Order"
    Expected Result: Order confirmation page shown with order number
    Priority: P1

  TC-002: Checkout with expired credit card
    Steps: Same as TC-001, but card expiry = 01/20
    Expected Result: Error message "Card expired" shown
    Priority: P2

  TC-003: Checkout with empty cart
    Steps: Navigate to checkout with 0 items
    Expected Result: Redirect to cart with message "Cart is empty"
    Priority: P2
```

### Test suites

```text
Test suite = a collection of related test cases grouped for execution.

Examples:
  - Smoke Test Suite: 10-20 critical tests run after every deployment
  - Regression Suite: 200+ tests covering all existing functionality
  - Feature Suite: tests specific to a new feature
  - API Test Suite: all API endpoint tests
  - Payment Suite: all payment-related tests

Organization:
  Suite → Test Scenario → Test Case → Test Step
```

### Traceability matrix

```text
‼️ Maps requirements to test cases — ensures every requirement has test coverage.

Requirement ID  | Requirement Description    | Test Cases        | Status
────────────────────────────────────────────────────────────────────────────
REQ-001         | User can register          | TC-001, TC-002    | Covered
REQ-002         | User can login             | TC-010, TC-011    | Covered
REQ-003         | User can reset password    | TC-020            | Partial
REQ-004         | Admin can manage users     | (none)            | NOT COVERED

Benefits:
  - Identifies untested requirements
  - Shows impact analysis (if requirement changes, which tests need updating)
  - Audit trail for compliance
  - Required in regulated industries (healthcare, finance)
```

### Test case management tools

```text
Popular tools:
  TestRail — most popular, integrates with Jira, detailed reporting
  Zephyr   — Jira plugin, test cases live inside Jira
  qTest    — enterprise-grade, good for large teams
  Xray     — Jira plugin, supports BDD/Gherkin, popular in agile teams

What these tools provide:
  - Test case repository (versioned, searchable)
  - Test execution tracking (pass/fail/blocked/skipped)
  - Test run management (assign tests to testers, track progress)
  - Reporting and dashboards
  - Integration with bug trackers (Jira, Azure DevOps)
  - Traceability to requirements
```

### Test case writing best practices

```text
✓ One test case, one thing — don't test multiple features in one case
✓ Clear preconditions — what must be true before the test starts
✓ Specific steps — a new tester should be able to follow them
✓ Expected results for EVERY step, not just the last one
✓ Include test data — exact values to enter
✓ Mark priority (P1-P4) and severity
✓ Keep test cases independent — no dependencies between cases
✓ Review test cases with developers — catch gaps early
✗ Don't write overly detailed steps for obvious actions
✗ Don't duplicate test cases — use parameterized cases instead
```

---

## 15. Manual Testing

### Exploratory testing

```text
‼️ Exploratory testing is simultaneous learning, test design, and test execution.
   The tester actively explores the application, designs tests on the fly,
   and adjusts based on what they find.

Session-based testing:
  - Time-boxed sessions (30-90 minutes)
  - Each session has a "charter" — a focused goal
  - Tester takes notes during the session (observations, bugs, questions)
  - Session ends with a debrief

Charter examples:
  "Explore the user registration flow, focusing on:
   - International characters in name fields
   - Very long email addresses
   - Rapid form resubmission"

  "Explore the dashboard as a user with many (1000+) tasks,
   focusing on performance and pagination behavior"

  "Explore the mobile experience of checkout on iOS Safari,
   focusing on payment form usability"

Session notes format:
  Session: Registration edge cases
  Duration: 45 minutes
  Tester: Alice
  Bugs found: 3 (1 critical, 2 minor)
  Areas explored: name validation, email validation, password rules
  Areas NOT explored: social login, email verification
  Notes: Unicode handling in name field is broken (bug filed)
```

### Regression testing

```text
Regression testing: re-testing existing functionality after changes.

Types:
  - Full regression: run ALL tests (before major releases)
  - Partial regression: test only areas affected by the change
  - Risk-based regression: test areas most likely to be impacted

When to run:
  - Before every release (full or partial)
  - After bug fixes (verify fix + check for side effects)
  - After configuration changes
  - After environment updates

Automation priority:
  - Automate stable, frequently-run regression tests FIRST
  - Keep exploratory regression manual
  - Automate the "boring" repetitive checks
  - Let humans focus on creative, judgment-based testing
```

### Smoke testing (build verification)

```text
‼️ Smoke tests answer: "Is this build stable enough to test further?"

Characteristics:
  - Quick (< 5 minutes)
  - Tests core functionality only
  - Run after every deployment/build
  - If smoke tests fail → reject the build, don't waste QA time

Typical smoke test checklist:
  ✓ Application starts without errors
  ✓ Homepage loads
  ✓ User can log in
  ✓ Main navigation works
  ✓ Core API endpoints respond
  ✓ Database connection works
  ✓ Critical user flow works (e.g., create a task)
```

### Sanity testing

```text
Sanity testing: a focused check after a specific change.

Difference from smoke testing:
  - Smoke: broad, tests many areas briefly (build verification)
  - Sanity: narrow, tests one area deeply (change verification)

Example:
  Bug fix: "Users can't save their profile photo"
  Sanity test: Upload a profile photo, verify it saves and displays correctly.
  Also check: Can existing photos still be viewed? Can photos be deleted?
```

### UAT (User Acceptance Testing)

```text
‼️ UAT is the FINAL gate before release. It validates that the software
   meets business requirements from the end user's perspective.

Who runs it:
  - Product owners
  - Business stakeholders
  - Actual end users (beta testers)
  - NOT developers or QA (they're too close to the implementation)

When:
  - After QA testing is complete
  - In a staging environment that mirrors production
  - Before release to production

UAT process:
  1. QA prepares UAT test scenarios (based on user stories)
  2. Business users execute scenarios
  3. Users report issues (not necessarily bugs — could be "not what we wanted")
  4. Development team addresses issues
  5. Users re-test and provide formal SIGN-OFF
  6. Sign-off = approval to deploy to production

Sign-off document:
  "I, [Name], confirm that the following features meet the business
   requirements and are approved for production release:
   - Feature A: ✓ Approved
   - Feature B: ✓ Approved with minor issue (tracked as JIRA-456)
   - Feature C: ✗ Not approved — needs rework"
```

### Cross-browser testing

```text
Tools:
  BrowserStack — cloud-based, real browsers and devices
  Sauce Labs    — similar to BrowserStack, good CI integration
  LambdaTest    — budget-friendly alternative

Browser matrix (what to test):
  ‼️ Don't test every browser — use analytics to prioritize.

  Typically:
    Chrome (latest)         — 65% of users
    Safari (latest)         — 20% of users (especially mobile)
    Firefox (latest)        — 5% of users
    Edge (latest)           — 5% of users
    Mobile Safari (iOS)     — critical for mobile users
    Mobile Chrome (Android) — critical for mobile users

  Test methodology:
    1. Full testing on Chrome (primary)
    2. Smoke testing on Safari, Firefox, Edge
    3. Responsive testing on mobile viewports
    4. Focus on CSS/layout issues (most common cross-browser bugs)
```

### Mobile testing

```text
Device farms: BrowserStack, Sauce Labs, AWS Device Farm
  - Test on real devices (not just emulators)
  - Cover top 5-10 devices by market share

Responsive testing:
  - Test at key breakpoints (mobile, tablet, desktop)
  - Test touch interactions (swipe, pinch, long press)
  - Test orientation changes (portrait ↔ landscape)
  - Test with on-screen keyboard (does it obscure form fields?)

Mobile-specific concerns:
  - Network conditions (3G, 4G, offline)
  - Battery and performance
  - Push notifications
  - App install/update flows
  - Deep linking
```

### Accessibility testing

```text
‼️ Detailed coverage in section 26. Quick overview for QA:

Automated tools:
  - axe browser extension (free, quick scan)
  - Lighthouse accessibility audit (Chrome DevTools)

Manual testing (QA should do these):
  - Keyboard-only navigation: Tab through entire page
    - Can you reach every interactive element?
    - Is focus visible?
    - Can you operate dropdowns, modals, date pickers?
  - Screen reader testing:
    - VoiceOver (macOS/iOS) or NVDA (Windows)
    - Do images have alt text?
    - Are form labels announced?
    - Are error messages announced?
  - Color contrast: use browser extension to check (minimum 4.5:1 ratio)
  - Zoom: does the layout work at 200% zoom?

WCAG 2.1 AA compliance — the standard target for most applications.
```

---

## 16. Bug Lifecycle & Defect Management

### Bug reporting

```text
‼️ A good bug report saves hours of developer time.

Required fields:
  Title:          Clear, specific summary
                  ✗ "Button doesn't work"
                  ✓ "Checkout 'Pay Now' button is unresponsive on Safari 17 when using Apple Pay"

  Steps to Reproduce:
                  1. Log in as user@test.com / password123
                  2. Add item "Widget A" to cart
                  3. Navigate to checkout
                  4. Select "Apple Pay" as payment method
                  5. Click "Pay Now" button
                  (Be specific — exact data, exact clicks)

  Expected Result: Payment is processed, order confirmation page shown
  Actual Result:   Nothing happens. Button appears clicked but no network request is made.

  Environment:    Safari 17.2 on macOS Sonoma 14.2, staging environment
  Severity:       S1 (Blocker) — users cannot complete checkout
  Priority:       P1 (Fix immediately)

  Attachments:
    - Screenshot of the frozen button state
    - Video recording of the bug reproduction
    - Console log showing JavaScript error
    - Network tab showing no requests fired

  Additional context:
    - Works correctly on Chrome 120
    - Regression: was working in build v2.3.1, broken in v2.4.0
    - Only happens with Apple Pay, credit card payment works
```

### Severity levels

```text
‼️ Severity = technical impact of the bug

S1 — Blocker:
  System crash, data loss, security breach, complete feature unusable
  No workaround exists
  Example: Users cannot log in, payment processing fails

S2 — Critical:
  Major feature broken, but workaround exists
  Example: Export to PDF fails, but CSV export works

S3 — Major:
  Feature partially broken, non-critical functionality affected
  Example: Sorting on dashboard doesn't work, but data is still displayed

S4 — Minor:
  Cosmetic issue, typo, slight UI misalignment
  Example: Button has wrong hover color, text wraps awkwardly on one screen size
```

### Priority levels

```text
‼️ Priority = business urgency (when to fix)

P1 — Fix immediately (hotfix):
  Blocking users in production. Drop everything.
  Must be fixed within hours.

P2 — Fix in current sprint:
  Important bug affecting significant users.
  Fix within the current sprint.

P3 — Fix in next sprint:
  Bug exists but has workaround, or affects few users.
  Scheduled for upcoming sprint.

P4 — Fix when convenient:
  Nice-to-have fix. Low impact.
  Backlog — fix if time permits.

‼️ Severity ≠ Priority:
  A typo on the CEO's bio page could be S4 (cosmetic) but P1 (business urgency).
  A crash in an admin tool used by 2 people could be S1 (crash) but P3 (low impact).
```

### Bug triage meetings

```text
Purpose: Review new bugs, assign severity/priority, decide what to fix.

Frequency: daily during active testing, weekly otherwise
Attendees: QA lead, dev lead, PM, sometimes specific developers

Agenda:
  1. Review all new bugs since last triage
  2. Assign/confirm severity and priority
  3. Assign to developer
  4. Identify duplicate bugs
  5. Review aging bugs (bugs open > 1 sprint)
  6. Decide on deferred bugs (explicitly mark as "Won't Fix" or "Deferred")

Rules:
  - Every bug must have a triage decision within 24 hours
  - No bug should be open without an assigned developer for > 3 days
  - S1/P1 bugs skip triage — escalate immediately
```

### Defect tracking workflow (Jira)

```text
‼️ Typical Jira bug workflow:

  Open → In Progress → Fixed → In QA → Verified → Closed
    ↑                              ↓
    └──────── Reopened ←──── Failed Verification

States:
  Open:         Bug reported, not yet worked on
  In Progress:  Developer is fixing the bug
  Fixed:        Developer has deployed the fix to QA environment
  In QA:        QA is verifying the fix
  Verified:     QA confirms the fix works
  Closed:       Bug is resolved and verified
  Reopened:     Fix didn't work, or bug reappeared

Additional fields in Jira:
  - Affected Version: which release has the bug
  - Fix Version: which release will include the fix
  - Component: which part of the system (Frontend, API, Database)
  - Sprint: which sprint the fix is planned for
  - Labels: e.g., "regression", "production", "intermittent"
```

### Regression bugs

```text
A regression bug is a bug in previously working functionality.

‼️ Regressions are the highest-priority bugs — they mean we broke something
   that was already working. They indicate:
   - Missing test coverage
   - Insufficient regression testing
   - Tightly coupled code

When a regression is found:
  1. File the bug with "regression" label
  2. Identify which change caused the regression (git bisect)
  3. Fix the bug
  4. Write a test that catches this specific regression
  5. Add the test to the regression suite
```

### Escaped defects

```text
Escaped defect = a bug that reached production without being caught.

Track escaped defects to measure QA effectiveness:
  - Which test phase should have caught it? (unit, integration, E2E, QA, UAT)
  - Why was it missed? (missing test case, environment difference, timing issue)
  - What can we do to prevent similar escapes? (add test, improve coverage)

Escaped defect rate = bugs found in production / total bugs found
  - Target: < 10% escaped defect rate
  - > 20% indicates serious gaps in testing process
```

---

## 17. Test Environments Strategy

### Environment tiers

```text
‼️ Environment progression from development to production:

Local (developer machine):
  - Developer runs code + unit tests locally
  - May use Docker for databases
  - Fastest feedback loop
  - Not shared with others

Dev (development):
  - Shared environment for developers
  - Latest code from main branch
  - May be unstable — auto-deploys on every merge
  - Used for integration between services

QA (quality assurance):
  - Dedicated environment for QA testing
  - Specific builds deployed (not auto-deploy)
  - QA team runs manual and automated tests
  - More stable than dev
  - Test data is managed (not random)

Staging (pre-production):
  - ‼️ Should MIRROR production as closely as possible
  - Same infrastructure, same configuration, same data shape
  - Used for final validation before production
  - UAT happens here
  - Performance testing happens here

Pre-prod (optional):
  - Even closer to production
  - May connect to production-like external services
  - Used in highly regulated industries for final sign-off
  - Sometimes used for canary testing

Production:
  - The live environment
  - Post-deployment smoke tests run here
  - Monitoring and alerting active
  - Feature flags control rollout
```

### Environment parity

```text
‼️ "Works on staging, breaks in production" is a common and preventable problem.

Staging should match production in:
  ✓ OS and runtime versions (Node.js, Python, etc.)
  ✓ Database version and configuration
  ✓ Infrastructure (same cloud provider, same regions)
  ✓ Environment variables (same structure, different values)
  ✓ Third-party service versions
  ✓ Network configuration (VPNs, firewalls, load balancers)
  ✓ Data volume (representative data, not empty DB)

Acceptable differences:
  - Scale (staging can be smaller — fewer instances)
  - Domain name
  - Credentials (different keys for staging vs prod)
  - Data content (anonymized prod data, not real user data)
```

### Ephemeral/preview environments per PR

```text
‼️ Modern approach: spin up a temporary environment for each PR.

How it works:
  1. Developer opens a PR
  2. CI builds the app and deploys to a temporary URL
     (e.g., pr-123.preview.myapp.com)
  3. QA tests on the preview environment
  4. Reviewers can see the changes live
  5. Environment is destroyed when PR is merged or closed

Benefits:
  - Every PR is testable in isolation
  - No conflicts with other developers' changes
  - QA can test in parallel
  - Product can review changes before merge

Tools:
  - Vercel (automatic preview deployments for frontend)
  - Railway, Render (backend preview environments)
  - Kubernetes namespaces + Terraform
```

### Environment promotion workflow

```text
‼️ Code flows through environments in one direction:

  Local → Dev → QA → Staging → Production

Promotion rules:
  Dev → QA:      CI pipeline passes (unit + integration tests)
  QA → Staging:  QA sign-off (manual + automated tests pass)
  Staging → Prod: UAT sign-off + performance tests pass + security scan clean

Never:
  ✗ Promote code that skips an environment
  ✗ Apply hotfixes directly to production without testing
  ✗ Use production as a test environment (unless with feature flags)
```

### Feature flags in test environments

```text
Feature flags allow testing unreleased features in any environment.

Benefits for testing:
  - Test new features in production without user exposure
  - Toggle features on/off for specific test scenarios
  - A/B test with real users
  - Instant rollback if something goes wrong

Tools: LaunchDarkly, Unleash, Flagsmith, custom implementation

Testing strategy:
  - Test with flag ON (new behavior)
  - Test with flag OFF (existing behavior)
  - Test flag toggle (switching mid-session)
  - Test flag cleanup (remove flag code after full rollout)
```

---

## 18. Test Data Management

### Test data factories

```ts
// ‼️ Use factories to create test data — never hardcode test data in tests.

// Using faker.js for realistic random data
import { faker } from '@faker-js/faker';

function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'user',
    createdAt: faker.date.past(),
    ...overrides,  // allow overriding specific fields
  };
}

function createTask(overrides = {}) {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
    done: false,
    userId: faker.string.uuid(),
    createdAt: faker.date.recent(),
    ...overrides,
  };
}

// Usage in tests
it('displays user name', () => {
  const user = createUser({ name: 'Alice Smith' }); // override only what matters
  render(<UserCard user={user} />);
  expect(screen.getByText('Alice Smith')).toBeInTheDocument();
});

it('shows high priority badge', () => {
  const task = createTask({ priority: 'high' }); // override only priority
  render(<TaskCard task={task} />);
  expect(screen.getByText('High')).toBeInTheDocument();
});
```

### Database seeding

```ts
// ‼️ Seed the database with known data before tests run.

// seed.ts — run before test suite
async function seedTestData(db: Database) {
  // Create users
  const adminUser = await db.insert(users).values({
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'admin',
  }).returning();

  const regularUser = await db.insert(users).values({
    id: 'user-001',
    name: 'Regular User',
    email: 'user@test.com',
    role: 'user',
  }).returning();

  // Create related data
  await db.insert(tasks).values([
    { title: 'Admin task', userId: 'admin-001', priority: 'high' },
    { title: 'User task 1', userId: 'user-001', priority: 'medium' },
    { title: 'User task 2', userId: 'user-001', priority: 'low' },
  ]);

  return { adminUser, regularUser };
}

// In tests
beforeAll(async () => {
  await seedTestData(db);
});
```

### Test data isolation

```text
‼️ Each test must get fresh data — never share mutable data between tests.

Strategies:
  1. Transaction rollback (fastest):
     - Wrap each test in a DB transaction
     - Rollback at the end — DB is unchanged
     - Very fast, but doesn't work with multiple connections

  2. Truncate and reseed (most common):
     - beforeEach: truncate all tables, insert fresh seed data
     - Slower but reliable and simple

  3. Unique data per test:
     - Each test creates its own data with unique IDs
     - Tests don't interfere with each other
     - Can run in parallel

  4. Database per test (slowest, most isolated):
     - Each test gets its own database instance
     - Maximum isolation, slowest setup
     - Use testcontainers for this approach
```

### Anonymizing production data for testing

```text
‼️ Using real production data for testing provides the most realistic test data,
   but you MUST anonymize it first.

What to anonymize:
  - Names → replace with faker names
  - Email addresses → replace with @example.com addresses
  - Phone numbers → replace with fake numbers
  - Addresses → replace with fake addresses
  - SSN/ID numbers → replace with random numbers
  - Financial data → replace with fake card numbers
  - Medical data → remove entirely

What to preserve:
  - Data distribution (if 60% of users are in California, keep that ratio)
  - Relationships (user → orders → items)
  - Volume (same number of records)
  - Edge cases in the real data (very long names, unicode characters)

Tools:
  - PostgreSQL: pg_anonymize, postgresql_anonymizer
  - Custom scripts: query production → transform → insert into test DB
```

### GDPR considerations

```text
‼️ GDPR and privacy laws affect test data:

  - Never use real personal data in non-production environments
  - Anonymize or synthesize test data
  - Test environments should have the same security controls as production
  - Document what data exists in test environments
  - Include test environments in data retention policies
  - Right to erasure applies to test data too (if identifiable)

Synthetic data (best approach):
  - Generate realistic but entirely fake data
  - No privacy concerns
  - Can create edge cases on demand
  - Tools: faker.js, Mockaroo, custom generators
```

### Shared test accounts

```text
For manual testing, maintain a set of shared test accounts:

Environment  | Account           | Role    | Password     | Notes
─────────────────────────────────────────────────────────────────────
QA           | admin@test.com    | Admin   | TestPass123  | Full access
QA           | user@test.com     | User    | TestPass123  | Standard user
QA           | viewer@test.com   | Viewer  | TestPass123  | Read-only
Staging      | uat-admin@test.com| Admin   | UatPass456   | UAT testing
Staging      | uat-user@test.com | User    | UatPass456   | UAT testing

Best practices:
  - Never use real email addresses
  - Store credentials in a shared password manager (1Password, Vault)
  - Reset test accounts regularly
  - Don't use production credentials in any other environment
```

---

# Part 4 — Automation at Scale

---

## 19. Test Automation Strategy

### What to automate vs what to keep manual

```text
‼️ Automation decision matrix:

                    High value from automation
                    ─────────────────────────
                    ✓ Regression tests (run repeatedly)
                    ✓ Smoke tests (run after every deploy)
                    ✓ Data-driven tests (many input variations)
                    ✓ Cross-browser checks
                    ✓ API contract validation
                    ✓ Performance benchmarks

                    Keep manual
                    ─────────────────────────
                    ✓ Exploratory testing (requires human judgment)
                    ✓ Usability testing (subjective assessment)
                    ✓ Ad-hoc testing of new features
                    ✓ Visual design review (automated tools help but can't replace humans)
                    ✓ Edge cases found during exploratory sessions
                    ✓ First-time testing of a new feature

Rule of thumb:
  If you'll run it more than 3 times → automate it
  If it requires human judgment → keep it manual
  If it changes frequently → wait for stability before automating
```

### ROI of automation

```text
‼️ Automation has an upfront cost but pays off over time.

Cost of automation:
  - Writing the test: 2-8 hours per test (E2E)
  - Maintaining the test: 0.5-1 hour per test per month
  - Framework setup: 1-4 weeks initially
  - Training team: ongoing

Break-even calculation:
  Manual test execution time: 15 min per run
  Test runs per sprint: 10 (regression, smoke, etc.)
  Manual cost per sprint: 150 min = 2.5 hours
  Automation writing time: 4 hours
  Break-even: 2 sprints

  After break-even, every run is "free" — and automated tests run faster,
  more reliably, and at 3am without overtime.
```

### Test ownership

```text
Who writes and maintains which tests:

Developers:
  - Unit tests (100% developer-owned)
  - Integration tests (primarily developer-owned)
  - Component tests (developer-owned)

SDETs / QA Engineers:
  - E2E tests (primarily QA-owned)
  - API automation tests
  - Performance test scripts
  - Cross-browser test setup

Shared ownership:
  - Smoke tests (both teams contribute)
  - Regression suite (developers add, QA maintains)
  - Test infrastructure (dev + QA + DevOps)

‼️ Rule: whoever writes the code should write the tests.
   QA augments with tests that developers wouldn't think to write.
```

---

## 20. Automation Framework Design

### Page Object Model (POM)

```text
‼️ POM is the most common design pattern for E2E test automation.

Principles:
  - Each page/component has a corresponding "page object" class
  - Page object encapsulates selectors and interactions
  - Tests use page objects, never directly reference selectors
  - If UI changes, update the page object, not every test

Benefits:
  - DRY — selector logic in one place
  - Readable tests — taskPage.addTask('Buy milk') vs page.click('#add-btn')
  - Maintainable — UI change = update one file, not 50 tests
```

```ts
// See section 9 for full POM examples with Playwright
```

### Screenplay pattern

```text
‼️ An alternative to POM, more focused on user intent.

Instead of "pages", you have:
  - Actors: who is performing the action
  - Tasks: high-level actions (login, checkout, search)
  - Interactions: low-level browser actions (click, type, navigate)
  - Questions: assertions about the state (is the item visible?)

Example:
  actor('Alice')
    .attemptsTo(Login.withCredentials('alice@test.com', 'password'))
    .attemptsTo(AddToCart.item('Widget A'))
    .attemptsTo(Checkout.withPayment('4242424242424242'))
    .asks(OrderConfirmation.isDisplayed())

Benefits:
  - Even more readable than POM
  - Better for complex multi-step workflows
  - Forces thinking about user behavior, not page structure

Drawbacks:
  - More abstract, steeper learning curve
  - More boilerplate for simple tests
  - POM is sufficient for most teams
```

### Test fixtures and factories

```ts
// ‼️ Fixtures provide reusable test setup — avoid duplicating setup code.

// Playwright fixtures (extend the base test)
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Fixture: authenticated page
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/dashboard');
    await use(page);
  },

  // Fixture: page with seeded data
  seededPage: async ({ page, request }, use) => {
    // Seed data via API
    await request.post('/api/test/seed', {
      data: { tasks: 10, users: 3 },
    });
    await use(page);
    // Cleanup after test
    await request.post('/api/test/cleanup');
  },
});
```

### Data-driven testing

```ts
// ‼️ Run the same test with different data sets

// Playwright data-driven
const testCases = [
  { card: '4242424242424242', expected: 'Payment successful' },
  { card: '4000000000000002', expected: 'Card declined' },
  { card: '4000000000009995', expected: 'Insufficient funds' },
];

for (const { card, expected } of testCases) {
  test(`checkout with card ${card} shows "${expected}"`, async ({ page }) => {
    await page.goto('/checkout');
    await page.getByLabel('Card number').fill(card);
    await page.getByLabel('Expiry').fill('12/28');
    await page.getByLabel('CVC').fill('123');
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page.getByText(expected)).toBeVisible();
  });
}
```

### Configuration management for tests

```ts
// ‼️ Test configuration should be environment-aware

// test.config.ts
const config = {
  local: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:3001',
    dbUrl: 'postgresql://test:test@localhost:5432/testdb',
  },
  ci: {
    baseUrl: 'http://app:3000',
    apiUrl: 'http://api:3001',
    dbUrl: process.env.DATABASE_URL,
  },
  staging: {
    baseUrl: 'https://staging.myapp.com',
    apiUrl: 'https://api.staging.myapp.com',
    dbUrl: undefined, // no direct DB access in staging
  },
};

export const testConfig = config[process.env.TEST_ENV || 'local'];
```

---

## 21. CI/CD Testing Pipeline

### Where each test type runs

```text
‼️ Tests run at different stages of the CI/CD pipeline:

Pre-commit hooks (developer machine):
  ├── Lint (ESLint)
  ├── Format check (Prettier)
  ├── Type check (tsc --noEmit)
  └── Related unit tests (vitest --changed)
      ↓
PR Pipeline (on every push to PR):
  ├── Static analysis (TypeScript, ESLint)
  ├── Unit tests (vitest)
  ├── Integration tests (vitest + test DB)
  ├── Build check (can the app build?)
  ├── Security scan (SAST — Semgrep/CodeQL)
  └── Visual regression (Chromatic/Percy)
      ↓
Merge Pipeline (on merge to main):
  ├── Full test suite
  ├── Build artifacts
  ├── Deploy to QA environment
  └── Run smoke tests on QA
      ↓
Deployment Pipeline (deploy to staging/prod):
  ├── E2E tests on staging
  ├── Performance tests
  ├── Security scan (DAST)
  └── Deploy to production
      ↓
Post-deployment:
  ├── Smoke tests on production
  ├── Synthetic monitoring starts
  └── Canary analysis
```

### GitHub Actions CI configuration

```yaml
# .github/workflows/test.yml — layered test strategy
name: Test Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  static:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck   # tsc --noEmit
      - run: npm run lint        # eslint

  unit-integration:
    runs-on: ubuntu-latest
    needs: static
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/testdb
      - uses: codecov/codecov-action@v4

  e2e:
    runs-on: ubuntu-latest
    needs: unit-integration
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Parallel test execution

```text
‼️ Split tests across multiple CI workers for faster pipelines.

Strategies:
  1. Test file splitting: distribute test files across N workers
     npx playwright test --shard=1/4  # run 1 of 4 shards

  2. Test suite splitting: unit + integration + E2E run in parallel jobs

  3. Smart splitting: tools like CircleCI split tests by execution time
     (slower tests balanced across workers)

Vitest parallelism:
  - By default, Vitest runs test files in parallel (workers)
  - Tests WITHIN a file run sequentially
  - Use --pool=threads or --pool=forks for different isolation levels

Playwright parallelism:
  - fullyParallel: true in config
  - workers: process.env.CI ? 1 : undefined
  - Shard across CI machines: --shard=1/4
```

### Flaky test quarantine

```text
‼️ Don't let flaky tests block the team.

Process:
  1. Test fails intermittently → mark as flaky
  2. Move to quarantine suite (separate CI job, non-blocking)
  3. File a ticket to fix the flaky test
  4. Fix within 1 sprint
  5. Move back to main suite

Implementation:
  - Playwright: test.fixme() or test.skip() with comment
  - Vitest: it.skip('reason: flaky — JIRA-123')
  - Use test annotations/tags to group quarantined tests
  - Run quarantined tests separately, don't block the pipeline
```

### Test result reporting

```text
Report formats:
  JUnit XML — standard format, understood by all CI tools
  Allure    — rich HTML reports with charts, trends, and attachments
  Custom    — JSON output consumed by dashboards

JUnit XML:
  vitest --reporter=junit --outputFile=test-results.xml
  npx playwright test --reporter=junit

Allure reports:
  npm install -D allure-playwright
  npx playwright test --reporter=allure-playwright
  npx allure serve allure-results/
  → generates beautiful HTML report with:
    - Test execution timeline
    - Pass/fail/skip breakdown
    - Screenshots and videos on failure
    - Historical trends (when connected to Allure server)
```

### Pipeline gates

```text
‼️ Block deployments when tests fail.

Gates:
  - PR cannot be merged if any test fails
  - Deploy to staging blocked if integration tests fail
  - Deploy to production blocked if E2E + performance tests fail
  - Security scan findings above "high" severity block all deploys

GitHub branch protection:
  Settings → Branches → Branch protection rules:
  ✓ Require status checks to pass before merging
  ✓ Require branches to be up to date before merging
  Select required checks: "static", "unit-integration", "e2e"
```

---

## 22. Visual Regression Testing

### What is visual regression testing

```text
‼️ Visual regression testing catches unintended visual changes by comparing
   screenshots of the UI before and after a code change.

When to use:
  - Design system / component library (catch style regressions)
  - Landing pages and marketing sites (pixel-perfect matters)
  - After CSS/styling refactors
  - After dependency updates (UI library upgrades)

When NOT to use:
  - Dynamic content (changes every render)
  - Applications with user-generated content
  - Early-stage prototypes (design changes constantly)
```

### Tools

```text
Chromatic:
  - Built by Storybook team
  - Captures screenshots of every Storybook story
  - Visual diff review UI (accept/reject changes)
  - Free tier available
  - Best for: component libraries, design systems

Percy (BrowserStack):
  - Integrates with any test framework
  - Cross-browser visual testing
  - Best for: full-page visual testing

Playwright visual comparisons:
  - Built into Playwright (free)
  - await expect(page).toHaveScreenshot('dashboard.png')
  - Stores baseline screenshots in repo
  - Best for: lightweight visual checks alongside E2E tests

BackstopJS:
  - Open source
  - URL-based screenshot comparison
  - Docker support for consistent rendering
  - Best for: simple page-level visual testing
```

### Playwright visual testing

```ts
// Built-in visual comparison
test('dashboard looks correct', async ({ page }) => {
  await page.goto('/dashboard');

  // Compare against stored baseline screenshot
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixelRatio: 0.01, // allow 1% pixel difference
  });
});

// First run: creates the baseline screenshot
// Subsequent runs: compares against baseline
// Update baselines: npx playwright test --update-snapshots
```

### Pixel diff vs structural diff

```text
Pixel diff:
  - Compares actual pixels between images
  - Catches: color changes, font changes, spacing changes
  - False positives: anti-aliasing, rendering differences between OS
  - Tools: Playwright, BackstopJS

Structural diff:
  - Compares DOM structure and computed styles
  - Catches: element additions/removals, layout changes
  - Fewer false positives
  - Tools: Chromatic (uses Storybook's component isolation)

Best practice: use both — structural for components, pixel for pages.
```

### Managing visual baselines

```text
- Store baselines in version control (Git LFS for large files)
- Update baselines intentionally (review visual diffs in PRs)
- Separate baselines per browser/OS (rendering differences)
- Review visual changes in PR review process (Chromatic provides a review UI)
- CI should FAIL on visual diff until explicitly approved
```

---

## 23. Cross-Browser & Cross-Device Testing

### BrowserStack/Sauce Labs integration

```ts
// playwright.config.ts — run on BrowserStack
export default defineConfig({
  projects: [
    // Local browsers
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },

    // BrowserStack browsers (via Playwright's connect method)
    {
      name: 'browserstack-safari',
      use: {
        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
            'browser': 'safari',
            'os': 'osx',
            'os_version': 'Sonoma',
          }))}`,
        },
      },
    },
  ],
});
```

### Browser matrix

```text
‼️ Don't test every browser — use analytics to determine your browser matrix.

Typical priority order:
  1. Chrome (desktop + mobile)  — largest market share
  2. Safari (desktop + mobile)  — second largest, iOS is WebKit-only
  3. Firefox (desktop)          — smaller share but vocal user base
  4. Edge (desktop)             — Chromium-based, usually same as Chrome
  5. Samsung Internet (mobile)  — significant in some markets

Testing depth:
  Chrome:  full E2E suite + visual regression
  Safari:  smoke suite + cross-browser-specific tests
  Firefox: smoke suite
  Edge:    only if analytics show significant usage
  Mobile:  test critical flows on iOS Safari + Android Chrome
```

### Responsive testing strategy

```text
Key breakpoints to test:
  - Mobile: 375px (iPhone SE), 390px (iPhone 14)
  - Tablet: 768px (iPad), 1024px (iPad Pro)
  - Desktop: 1280px, 1440px, 1920px

What to check at each breakpoint:
  ✓ Navigation (hamburger menu on mobile?)
  ✓ Form layouts (fields stack on mobile?)
  ✓ Table layouts (horizontal scroll or card view?)
  ✓ Images (responsive sizes, not oversized on mobile)
  ✓ Touch targets (minimum 44x44px on mobile)
  ✓ Text readability (not too small on mobile)
```

### Mobile app testing

```text
Native/hybrid app testing tools:
  Appium     — cross-platform (iOS + Android), Selenium-like API
  Detox      — React Native E2E testing (by Wix)
  XCUITest   — iOS native testing (Apple)
  Espresso   — Android native testing (Google)

Device farms:
  BrowserStack App Live — real device testing
  AWS Device Farm — real devices in AWS
  Firebase Test Lab — Google's device farm for Android

Mobile-specific tests:
  - Gesture interactions (swipe, pinch, long press)
  - Offline behavior (airplane mode)
  - Push notifications
  - Deep links / universal links
  - Camera/photo integration
  - Performance on low-end devices
```

---

# Part 5 — Specialized Testing

---

## 24. Performance & Load Testing

### Types of performance testing

```text
‼️ Know the difference between each type:

Load testing:
  Simulate expected production load
  Goal: verify the system handles normal traffic
  Example: 500 concurrent users for 30 minutes

Stress testing:
  Push beyond expected load to find breaking point
  Goal: find the upper limit and understand failure behavior
  Example: ramp from 100 to 5000 users until errors > 5%

Spike testing:
  Sudden large increase in traffic
  Goal: verify system handles traffic spikes
  Example: 100 users → 2000 users in 10 seconds

Soak testing (endurance):
  Sustained load over a long period
  Goal: find memory leaks, resource exhaustion
  Example: 200 users for 8-24 hours

Scalability testing:
  Gradually increase load while adding resources
  Goal: verify horizontal/vertical scaling works
  Example: double users while adding servers
```

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
  const res = http.get('http://api.staging.example.com/tasks', {
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

### Other performance testing tools

```text
Tools comparison:
  k6:       JavaScript/Go, developer-friendly, good for CI, free/open-source
  JMeter:   Java, GUI-based, most features, steep learning curve
  Gatling:  Scala, good for complex scenarios, detailed reports
  Locust:   Python, distributed load testing, easy to script
  Artillery: Node.js/YAML, simple syntax, good for quick tests

Choose based on team skills:
  - JavaScript team → k6 or Artillery
  - Java team → JMeter or Gatling
  - Python team → Locust
```

### Key performance metrics

```text
‼️ Metrics to measure and track:

Response time:
  - Average: overall mean response time (can be misleading)
  - p50 (median): half of requests are faster than this
  - p95: 95% of requests are faster than this (most important)
  - p99: 99% of requests are faster (catches long-tail latency)

  ‼️ Always use percentiles, not averages:
     Average of [10ms, 10ms, 10ms, 10ms, 5000ms] = 1008ms
     p50 = 10ms, p95 = 5000ms — much more useful

Throughput:
  - Requests per second (RPS)
  - How many requests the system can handle

Error rate:
  - Percentage of failed requests
  - Target: < 1% under normal load, < 5% under stress

Concurrent users:
  - How many users are active simultaneously

Resource utilization:
  - CPU usage, memory usage, disk I/O, network bandwidth
  - Helps identify bottlenecks
```

### Performance budgets

```text
‼️ Define and enforce performance budgets:

Frontend budgets:
  - Largest Contentful Paint (LCP): < 2.5 seconds
  - First Input Delay (FID): < 100ms
  - Cumulative Layout Shift (CLS): < 0.1
  - Total JavaScript size: < 200KB (gzipped)
  - Total page weight: < 1MB

API budgets:
  - p95 response time: < 500ms
  - p99 response time: < 2000ms
  - Error rate: < 0.1%

Enforcement:
  - Bundle size check in CI (bundlewatch, size-limit)
  - Lighthouse CI for Core Web Vitals
  - k6 thresholds for API performance
  - Block PR merge if budgets are exceeded
```

### Load testing in CI

```yaml
# Run k6 load tests in CI pipeline (against staging)
load-test:
  runs-on: ubuntu-latest
  needs: deploy-staging
  steps:
    - uses: actions/checkout@v4
    - uses: grafana/k6-action@v0.3.1
      with:
        filename: load-tests/api-load.js
      env:
        TEST_TOKEN: ${{ secrets.STAGING_TEST_TOKEN }}
        BASE_URL: https://staging.myapp.com
```

### Capacity planning

```text
Use performance test results for capacity planning:

1. Establish baseline: what load does current infrastructure handle?
2. Model growth: how much traffic will increase in 3/6/12 months?
3. Test at projected load: can the system handle future traffic?
4. Identify bottlenecks: database, API, network, CDN?
5. Plan scaling: horizontal (more instances) vs vertical (bigger instances)

Real User Monitoring (RUM) vs Synthetic Monitoring:
  RUM:       measures real user experience in production
             Tools: Datadog RUM, New Relic Browser, Google Analytics
  Synthetic: simulated requests from monitoring endpoints
             Tools: Datadog Synthetics, Checkly, Pingdom
  Use both — RUM for real user data, synthetic for consistent baselines.
```

---

## 25. Security Testing

### SAST (Static Application Security Testing)

```text
‼️ SAST scans source code for vulnerabilities WITHOUT running the application.

Tools:
  SonarQube  — comprehensive code quality + security, self-hosted or cloud
  Semgrep    — fast, customizable rules, open-source
  CodeQL     — GitHub's code analysis engine, free for public repos

What SAST catches:
  - SQL injection patterns
  - Cross-site scripting (XSS) risks
  - Hardcoded secrets/credentials
  - Insecure cryptography usage
  - Path traversal vulnerabilities
  - Unsafe deserialization

When to run:
  - In CI pipeline on every PR
  - In IDE (real-time feedback)
  - Nightly full scans

Example Semgrep rule:
  rules:
    - id: no-eval
      pattern: eval($X)
      message: "eval() is dangerous — use JSON.parse() instead"
      severity: ERROR
```

### DAST (Dynamic Application Security Testing)

```text
‼️ DAST tests the running application by sending malicious requests.

Tools:
  OWASP ZAP  — open-source, most popular DAST tool
  Burp Suite — commercial, gold standard for security testing

What DAST catches:
  - SQL injection (sends actual SQL in inputs)
  - XSS (injects scripts and checks if they execute)
  - CSRF vulnerabilities
  - Authentication bypass
  - Directory traversal
  - Server misconfigurations

When to run:
  - Against staging environment (never production — could cause damage)
  - Before major releases
  - Periodically (weekly or monthly)

OWASP ZAP in CI:
  docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t https://staging.myapp.com \
    -r report.html
```

### SCA (Software Composition Analysis)

```text
‼️ SCA scans your dependencies for known vulnerabilities.

Tools:
  Snyk         — most popular, free tier, GitHub integration
  Dependabot   — built into GitHub, automatic PRs for updates
  npm audit     — built into npm, basic vulnerability scanning
  Socket.dev   — detects supply chain attacks

What SCA catches:
  - Known CVEs in npm packages
  - Outdated dependencies with security patches
  - License compliance issues
  - Supply chain attacks (typosquatting, compromised packages)

When to run:
  - On every PR (check if new deps have vulnerabilities)
  - Nightly (check for newly discovered CVEs)
  - Continuous (Snyk/Dependabot monitor and alert)

Example:
  npm audit
  → found 3 vulnerabilities (1 high, 2 moderate)
  → npm audit fix (auto-fix compatible updates)
```

### Penetration testing

```text
‼️ Penetration testing (pen testing) is a simulated attack by security experts.

Scope definition:
  - What's in scope (web app, API, mobile app, internal tools)
  - What's out of scope (third-party services, production data)
  - Rules of engagement (hours of testing, notification procedures)
  - Testing type: black box (no source code) vs white box (source code access)

Process:
  1. Reconnaissance — understand the application
  2. Enumeration — discover endpoints, parameters, technologies
  3. Vulnerability identification — find potential attack vectors
  4. Exploitation — attempt to exploit vulnerabilities
  5. Reporting — detailed findings with severity and remediation

Report format:
  Finding:        SQL injection in /api/users search endpoint
  Severity:       Critical
  Impact:         Attacker can read/modify any database record
  Steps to reproduce:
    1. Navigate to /api/users?search=alice
    2. Modify to: /api/users?search=alice' OR 1=1--
    3. All users are returned
  Remediation:    Use parameterized queries instead of string concatenation
  Fix deadline:   7 days (critical severity)

Frequency: annually or before major releases
```

### OWASP Top 10 testing

```text
‼️ Test for the OWASP Top 10 most critical web application security risks:

1. Broken Access Control
   Test: can user A access user B's data?
   Test: can a non-admin access admin endpoints?

2. Cryptographic Failures
   Test: are passwords hashed with bcrypt/argon2 (not MD5/SHA1)?
   Test: is data in transit encrypted (HTTPS)?

3. Injection (SQL, NoSQL, OS command)
   Test: send malicious input in every user-facing field
   Test: are queries parameterized?

4. Insecure Design
   Test: are there rate limits on login/registration?
   Test: is there proper input validation?

5. Security Misconfiguration
   Test: are debug endpoints disabled in production?
   Test: are default credentials changed?

6. Vulnerable Components
   Test: run npm audit / Snyk
   Test: are all dependencies up to date?

7. Authentication Failures
   Test: can passwords be brute-forced?
   Test: are sessions invalidated on logout?

8. Software & Data Integrity Failures
   Test: are CI/CD pipelines secured?
   Test: is auto-update mechanism secure?

9. Security Logging & Monitoring Failures
   Test: are failed login attempts logged?
   Test: are security events alerted?

10. Server-Side Request Forgery (SSRF)
    Test: can user input cause the server to make requests to internal resources?
```

### Security testing in CI pipeline

```yaml
# Add to CI pipeline
security:
  runs-on: ubuntu-latest
  steps:
    # SAST
    - uses: returntocorp/semgrep-action@v1
      with:
        config: p/owasp-top-ten

    # SCA — dependency scanning
    - run: npm audit --audit-level=high

    # Secret detection
    - uses: trufflesecurity/trufflehog@main
      with:
        path: ./

    # License compliance
    - run: npx license-checker --failOn "GPL-3.0;AGPL-3.0"
```

---

## 26. Accessibility Testing

### Automated tools

```text
‼️ Automated tools catch ~30-40% of accessibility issues.
   Manual testing is required for the rest.

axe-core:
  - Most comprehensive accessibility engine
  - Browser extension for quick manual checks
  - jest-axe for unit test integration
  - @axe-core/playwright for E2E integration
  - Catches: missing alt text, insufficient contrast, missing labels, invalid ARIA

Lighthouse:
  - Chrome DevTools → Lighthouse tab → Accessibility
  - Scores 0-100 based on axe-core + additional checks
  - Good for quick audits

pa11y:
  - CLI tool for accessibility testing
  - Good for CI integration
  - Can test against WCAG 2.1 AA or AAA standards
```

### Automated testing integration

```ts
// jest-axe — accessibility in unit tests
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('LoginForm has no accessibility violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// Playwright + axe — accessibility in E2E tests
import AxeBuilder from '@axe-core/playwright';

test('dashboard page is accessible', async ({ page }) => {
  await page.goto('/dashboard');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])  // WCAG 2.1 AA
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Manual accessibility testing

```text
‼️ These tests CANNOT be automated — they require human judgment:

Keyboard-only navigation:
  1. Put mouse aside, navigate entire page with keyboard
  2. Tab: move to next interactive element
  3. Shift+Tab: move to previous element
  4. Enter/Space: activate buttons and links
  5. Arrow keys: navigate within components (radio groups, menus)
  6. Escape: close modals and popups

  Check:
  ✓ Can you reach every interactive element?
  ✓ Is focus indicator visible (outline, highlight)?
  ✓ Is focus order logical (left-to-right, top-to-bottom)?
  ✓ Can you operate all controls (dropdowns, date pickers, sliders)?
  ✓ Are there keyboard traps (can't tab out of a component)?

Screen reader testing:
  VoiceOver (macOS): Cmd+F5 to enable
  NVDA (Windows): free download
  TalkBack (Android): in accessibility settings

  Check:
  ✓ Are headings announced with correct level (h1, h2, h3)?
  ✓ Are images described (alt text)?
  ✓ Are form labels announced when you focus the input?
  ✓ Are error messages announced?
  ✓ Are dynamic content changes announced (aria-live regions)?
  ✓ Are buttons described by their text (not "button button button")?
```

### WCAG 2.1 AA compliance

```text
‼️ WCAG 2.1 AA is the standard most organizations aim for.
   Four principles: Perceivable, Operable, Understandable, Robust (POUR).

Key requirements:
  Perceivable:
    - All images have alt text (or are marked decorative)
    - Color contrast ratio: 4.5:1 for normal text, 3:1 for large text
    - Text can be resized to 200% without loss of content
    - Don't use color alone to convey information

  Operable:
    - All functionality available via keyboard
    - No keyboard traps
    - Provide skip navigation link
    - Page titles are descriptive
    - Focus order is logical
    - No content that flashes more than 3 times per second

  Understandable:
    - Language of page is specified (lang attribute)
    - Form inputs have labels
    - Error messages are clear and helpful
    - Navigation is consistent across pages

  Robust:
    - Valid HTML
    - ARIA attributes used correctly
    - Custom components have appropriate roles
    - Works with assistive technologies
```

### Common accessibility bugs

```text
Most frequent a11y bugs found in testing:
  1. Missing form labels (input without associated <label>)
  2. Insufficient color contrast
  3. Images without alt text
  4. Missing skip navigation link
  5. Non-descriptive link text ("click here", "read more")
  6. Inaccessible custom components (custom dropdown without ARIA)
  7. Missing focus indicators (removed default outline)
  8. Keyboard traps in modals
  9. Auto-playing media without controls
  10. Missing heading hierarchy (h1 → h3, skipping h2)
```

### Accessibility in CI

```yaml
# Add a11y checks to CI pipeline
accessibility:
  runs-on: ubuntu-latest
  steps:
    - run: npm ci
    - run: npm run build
    - name: Run pa11y
      run: |
        npx pa11y-ci --config pa11y-ci.json
    - name: Lighthouse CI
      run: |
        npx lhci autorun --config lighthouserc.json
```

---

## 27. Chaos Engineering

### Principles

```text
‼️ Chaos engineering is the practice of experimenting on a system to build
   confidence in its ability to withstand turbulent conditions in production.

Core principles:
  1. Build a hypothesis around steady-state behavior
     "Our system should maintain p99 latency < 2s even if one pod fails"

  2. Vary real-world events
     Simulate real failures: server crashes, network issues, disk full

  3. Run experiments in production (carefully)
     Staging is useful, but production is where it really matters

  4. Automate experiments to run continuously
     Don't just run chaos once — make it a regular practice

  5. Minimize blast radius
     Start small, expand gradually, have a kill switch
```

### Tools

```text
Chaos Monkey (Netflix):
  - Randomly terminates instances in production
  - Part of Netflix's Simian Army
  - Forces teams to build resilient services

Litmus (CNCF):
  - Kubernetes-native chaos engineering
  - ChaosExperiments as Kubernetes CRDs
  - Good for: pod kill, network chaos, disk fill

Gremlin:
  - Commercial platform, most features
  - Supports: infrastructure, application, network chaos
  - Nice UI for experiment management

AWS Fault Injection Simulator (FIS):
  - AWS-native chaos engineering service
  - Inject faults into AWS resources
  - Good for: EC2 stop, RDS failover, AZ failure simulation
```

### Game days

```text
‼️ A game day is a planned chaos engineering event.

Format:
  Duration: 2-4 hours
  Participants: engineering team, on-call, SRE
  Observer: someone not participating who takes notes

Steps:
  1. Define the hypothesis
     "Our system will continue serving requests with < 5% error rate
      if we lose one availability zone"

  2. Prepare the experiment
     - Identify what to break (kill pod, add latency, etc.)
     - Prepare monitoring dashboards
     - Ensure rollback plan exists
     - Notify stakeholders

  3. Run the experiment
     - Inject the failure
     - Observe system behavior
     - Monitor dashboards, alerts, logs

  4. Observe and record
     - Did the system recover automatically?
     - Were alerts triggered?
     - Was user impact detected?
     - How long was recovery?

  5. Debrief
     - What did we learn?
     - What needs to be fixed?
     - What experiments should we run next?
```

### Chaos experiments

```text
Common experiments:

Pod/instance kill:
  - Kill a random pod/instance
  - Expected: new pod starts, traffic rerouted, no user impact
  - Tests: auto-scaling, health checks, load balancing

Network latency:
  - Add 500ms-2s latency between services
  - Expected: timeouts trigger, retries work, circuit breakers open
  - Tests: timeout configuration, retry logic, circuit breakers

CPU/memory stress:
  - Spike CPU to 100% on one instance
  - Expected: load balancer routes traffic away, autoscaling kicks in
  - Tests: resource limits, autoscaling policies

Availability zone failure:
  - Simulate losing an entire AZ
  - Expected: multi-AZ deployment handles failover
  - Tests: multi-AZ architecture, data replication

Dependency failure:
  - Make an external service (database, cache, third-party API) unreachable
  - Expected: graceful degradation, fallback responses
  - Tests: circuit breakers, fallback logic, error handling

DNS failure:
  - Intercept DNS resolution
  - Expected: cached DNS entries used, retries work
  - Tests: DNS caching, resilience to DNS issues
```

### Steady-state hypothesis

```text
‼️ Every chaos experiment needs a clear hypothesis about what "normal" looks like.

Examples:
  "p99 response time stays below 2 seconds"
  "Error rate stays below 1%"
  "All requests complete within 30 seconds"
  "No data loss occurs"
  "Alerts fire within 5 minutes of the failure"
  "System recovers within 10 minutes without manual intervention"

Metrics to monitor during experiments:
  - Request latency (p50, p95, p99)
  - Error rate (HTTP 5xx)
  - Throughput (requests per second)
  - CPU/memory usage
  - Queue depth
  - Active connections
```

---

## 28. Contract Testing

### Consumer-driven contracts (Pact)

```text
‼️ Contract testing verifies that two services agree on the API contract
   WITHOUT requiring both services to be running at the same time.

How it works:
  1. Consumer defines expectations:
     "When I call GET /api/users/123, I expect { id: 123, name: string, email: string }"

  2. Pact generates a contract file from consumer tests

  3. Provider verifies it can fulfill the contract:
     "Yes, I can serve GET /api/users/123 with that exact shape"

  4. If provider changes its API → contract test fails → provider knows
     it would break the consumer
```

### Consumer test (frontend)

```ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const provider = new PactV3({
  consumer: 'Frontend',
  provider: 'UserAPI',
});

describe('User API Contract', () => {
  it('returns user by ID', async () => {
    await provider
      .given('user with ID 123 exists')
      .uponReceiving('a request for user 123')
      .withRequest({
        method: 'GET',
        path: '/api/users/123',
      })
      .willRespondWith({
        status: 200,
        body: MatchersV3.like({
          id: 123,
          name: 'Alice',
          email: 'alice@example.com',
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const user = await fetchUser(mockServer.url, '123');
      expect(user.name).toBe('Alice');
    });
  });
});

// This generates a pact contract file (JSON)
// that the provider must verify against
```

### Provider verification

```ts
import { Verifier } from '@pact-foundation/pact';

describe('Provider verification', () => {
  it('fulfills the Frontend consumer contract', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:3001',
      pactUrls: ['./pacts/frontend-userapi.json'], // or Pact Broker URL
      stateHandlers: {
        'user with ID 123 exists': async () => {
          // Seed the database with the required state
          await db.insert(users).values({ id: 123, name: 'Alice', email: 'alice@example.com' });
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

### Contract testing vs integration testing

```text
‼️ Contract testing and integration testing serve different purposes:

Contract testing:
  - Tests the API shape (request/response format)
  - Does NOT require both services running
  - Fast — runs as unit tests
  - Catches: breaking API changes, missing fields, wrong types
  - Best for: microservices with multiple consumers

Integration testing:
  - Tests actual behavior with real services
  - Requires both services running
  - Slower — requires infrastructure
  - Catches: logic errors, data issues, timing issues
  - Best for: critical workflows, complex interactions

Use BOTH:
  - Contract tests catch shape/format issues early (shift-left)
  - Integration tests catch behavioral issues
  - Contract tests are faster and cheaper to run
```

### Pact Broker

```text
Pact Broker: central repository for contract files.

Benefits:
  - Stores all consumer contracts
  - Provider can pull contracts and verify automatically
  - Tracks verification status
  - "Can I deploy?" feature — checks if all contracts are verified
  - Webhook notifications when contracts change

Workflow:
  1. Consumer CI publishes contract to Pact Broker
  2. Provider CI pulls contracts and runs verification
  3. Both teams can see contract status in Pact Broker UI
  4. Before deploying provider, check "can-i-deploy"

Bi-directional contracts:
  - Consumer publishes expected contract
  - Provider publishes its actual API spec (OpenAPI/Swagger)
  - Pact Broker compares them automatically
  - No need for provider verification step
```

---

# Part 6 — Metrics, Reporting & Release

---

## 29. Test Metrics & Reporting

### Key test metrics

```text
‼️ Track these metrics to understand testing effectiveness:

Test pass rate:
  Total passed / Total executed × 100
  Target: > 95% on stable branches
  If consistently < 90% → investigate test quality or code quality

Defect density:
  Number of defects / lines of code (or per feature)
  Helps identify problem areas in the codebase
  High defect density → needs more testing or refactoring

Defect escape rate:
  Defects found in production / Total defects found
  Target: < 10%
  Measures how effective pre-production testing is

Mean Time to Detect (MTTD):
  Average time from defect introduction to discovery
  Lower is better — shift-left reduces MTTD

Mean Time to Resolve (MTTR):
  Average time from defect discovery to fix deployed
  Target: P1 bugs < 4 hours, P2 < 1 sprint

Test execution time:
  How long the full test suite takes to run
  Track trends — if getting slower, investigate
  Target: PR pipeline < 15 minutes, full suite < 1 hour

Test automation coverage:
  Automated tests / Total test cases × 100
  Target: 60-80% of regression suite automated
  100% is not the goal — some tests are better manual

Flaky test rate:
  Flaky tests / Total tests × 100
  Target: < 2%
  > 5% indicates a serious infrastructure or test quality problem
```

### Meaningful metrics vs vanity metrics

```text
‼️ Not all metrics are useful. Focus on metrics that drive action.

Vanity metrics (look good but don't help):
  ✗ "We have 2000 test cases!"    (but how many are automated? how many are useful?)
  ✗ "95% code coverage!"          (but are the tests checking behavior?)
  ✗ "0 bugs in staging!"          (but are we testing thoroughly enough?)
  ✗ "Test suite runs in 2 hours!" (that's actually terrible)

Actionable metrics (drive improvement):
  ✓ Defect escape rate — are bugs reaching production?
  ✓ MTTD trend — are we catching bugs faster over time?
  ✓ Flaky test rate — is our test infrastructure reliable?
  ✓ Test execution time trend — is our pipeline getting faster or slower?
  ✓ Coverage of critical paths — are the most important flows tested?
```

### Reporting tools

```text
Allure Reports:
  - Rich HTML reports with interactive charts
  - Test execution timeline and duration
  - Screenshots, videos, logs attached to failures
  - Historical trend analysis
  - Categories (product bugs vs test bugs)
  - Setup: allure-playwright, allure-vitest plugins

Custom dashboards:
  - Grafana + test results in InfluxDB/PostgreSQL
  - Track trends over time
  - Team-specific views
  - Alert on degrading metrics

CI-native reporting:
  - GitHub Actions: test summary in PR checks
  - GitLab: test report artifacts displayed in MR
  - JUnit XML: universal format for CI tools
```

---

## 30. Release Management

### Release process

```text
‼️ The typical release process for enterprise applications:

1. Code Freeze:
   - No new feature merges to release branch
   - Only bug fixes allowed
   - Announced 2-5 days before target release date

2. Regression Testing:
   - Full regression suite (automated + manual)
   - Focus on areas changed in this release
   - Any new bugs → triage immediately

3. UAT (User Acceptance Testing):
   - Business stakeholders test on staging
   - Verify features match requirements
   - Duration: 2-5 days depending on scope

4. Sign-off:
   - QA Lead signs off: all P1/P2 bugs fixed, test pass rate > 95%
   - Product Owner signs off: features meet acceptance criteria
   - Engineering Lead signs off: no known technical risks
   - Security signs off: no critical vulnerabilities

5. Deploy to Production:
   - Follow deployment checklist
   - Monitor dashboards during and after deployment
   - Run production smoke tests

6. Post-deployment Verification:
   - Smoke tests pass
   - Key metrics normal (error rate, latency)
   - Monitor for 30-60 minutes
```

### Release checklist

```text
‼️ Checklist before releasing to production:

Pre-release:
  [ ] All P1/P2 bugs fixed and verified
  [ ] Regression tests pass (> 95% pass rate)
  [ ] UAT sign-off received
  [ ] Performance testing complete (no regressions)
  [ ] Security scan clean (no critical/high findings)
  [ ] Database migrations tested and reversible
  [ ] Feature flags configured correctly
  [ ] Release notes written
  [ ] Rollback plan documented and tested
  [ ] On-call team notified
  [ ] Communication sent to stakeholders

During deployment:
  [ ] Deploy to production
  [ ] Run database migrations
  [ ] Verify pod/instance health
  [ ] Run smoke tests
  [ ] Check error rates in monitoring
  [ ] Verify key user flows

Post-deployment:
  [ ] Monitor dashboards for 30-60 minutes
  [ ] Verify no increase in error rates
  [ ] Verify no increase in latency
  [ ] Spot-check key features
  [ ] Close release ticket
  [ ] Send release notification to stakeholders
```

### Go/no-go decision criteria

```text
‼️ Go/no-go meeting: the final decision point before production deployment.

Go criteria (ALL must be true):
  ✓ All P1/P2 bugs fixed
  ✓ Test pass rate > 95%
  ✓ UAT signed off
  ✓ No critical security findings
  ✓ Performance within acceptable limits
  ✓ Rollback plan tested
  ✓ On-call team available

No-go criteria (ANY one blocks release):
  ✗ Any open P1 bug
  ✗ Untested critical feature
  ✗ Staging environment not matching production
  ✗ External dependency not ready
  ✗ No rollback plan
  ✗ On-call team unavailable
```

### Hotfix process

```text
‼️ Hotfixes are emergency fixes for production issues.

Process:
  1. Incident detected (monitoring alert or user report)
  2. Severity assessed — is this a hotfix or can it wait?
  3. Hotfix branch created from production tag
  4. Fix developed and peer-reviewed
  5. Abbreviated testing:
     - Unit test for the fix
     - Smoke test on staging
     - Verify the specific issue is fixed
     - Quick regression of affected area
  6. Deployed to production
  7. Monitored for 30 minutes
  8. Fix merged back to main branch
  9. Incident postmortem within 48 hours

Key rule: hotfixes STILL go through testing — they just have a shorter cycle.
Never deploy untested code to production.
```

### Rollback criteria

```text
‼️ Define criteria BEFORE deployment for when to rollback:

Automatic rollback triggers:
  - Error rate > 5% (was < 1% before deploy)
  - p99 latency > 5s (was < 2s before deploy)
  - Health check failures on > 50% of instances
  - Smoke tests fail

Manual rollback triggers:
  - Data corruption detected
  - Security vulnerability discovered in new code
  - Critical user flow broken
  - Multiple customer complaints about same issue

Rollback process:
  1. Announce rollback to team
  2. Revert to previous deployment (feature flag off, or redeploy previous version)
  3. Verify rollback successful (smoke tests, monitoring)
  4. Investigate root cause
  5. Fix the issue and go through normal release process
```

### Canary releases from QA perspective

```text
‼️ Canary release: deploy to a small percentage of users first.

QA responsibilities:
  - Define canary success criteria (error rate, latency, conversion rate)
  - Monitor canary metrics during rollout
  - Compare canary vs baseline (side-by-side dashboards)
  - Decision: promote (roll out to 100%) or rollback

Canary rollout stages:
  1% → monitor 15 min → 5% → monitor 30 min → 25% → monitor 1 hour → 100%

If ANY stage shows degradation → rollback to 0%
```

### Feature flag-based releases

```text
‼️ Feature flags decouple deployment from release.

Deploy code to production with flag OFF → QA tests with flag ON in production
→ Gradually enable for users → Full release → Remove flag

Benefits:
  - Deploy anytime without releasing to users
  - A/B test new features
  - Instant rollback (turn flag off)
  - Targeted rollout (beta users first)
  - QA can test in production safely

Testing considerations:
  - Test with flag ON (new behavior)
  - Test with flag OFF (existing behavior)
  - Test flag transition (what happens mid-session)
  - Include flag cleanup in the release process
```

---

## 31. Production Testing

### Smoke tests post-deployment

```text
‼️ Run automated smoke tests immediately after every production deployment.

Typical production smoke tests:
  ✓ Homepage loads (HTTP 200, key elements present)
  ✓ Login flow works
  ✓ API health endpoint returns 200
  ✓ Database connectivity verified
  ✓ Key user flow works (e.g., create a task)
  ✓ Search returns results
  ✓ Third-party integrations connected (payment, email)

Duration: < 5 minutes
Failure action: trigger automatic rollback or alert on-call
```

### Synthetic monitoring

```text
‼️ Synthetic monitoring = automated, scheduled tests running against production.

Tools:
  Datadog Synthetics — HTTP tests + browser tests, alerting
  Checkly            — Playwright-based monitoring, developer-friendly
  Pingdom            — simple uptime monitoring
  New Relic Synthetics — comprehensive APM integration

What to monitor:
  - API endpoints: response time, status code, response body validation
  - User flows: login, checkout, search (browser-based tests)
  - SSL certificate expiry
  - DNS resolution time
  - Third-party service availability

Configuration:
  - Run every 1-5 minutes
  - From multiple geographic locations
  - Alert on 2+ consecutive failures (avoid alert noise)
  - Page on-call for critical checks
```

### Canary analysis

```text
Canary analysis: statistically compare canary metrics against baseline.

Metrics to compare:
  - Error rate (canary vs baseline)
  - Latency (p50, p95, p99)
  - CPU/memory usage
  - Business metrics (conversion rate, abandonment rate)

Automated canary analysis tools:
  - Kayenta (Netflix/Google) — statistical comparison
  - Argo Rollouts — Kubernetes-native canary with analysis
  - Flagger — GitOps canary deployments for Kubernetes

Pass/fail:
  - Canary error rate < baseline + 0.5% → PASS
  - Canary p99 latency < baseline + 20% → PASS
  - Otherwise → FAIL → automatic rollback
```

### A/B testing validation

```text
QA's role in A/B testing:
  - Verify both variants work correctly
  - Test variant assignment is sticky (same user always sees same variant)
  - Test that metrics are being tracked correctly
  - Verify the experiment can be disabled safely
  - Test edge cases: what happens if a user switches devices?
```

### Real user monitoring (RUM)

```text
‼️ RUM measures actual user experience in production.

What RUM captures:
  - Page load time (real users, not synthetic)
  - Core Web Vitals (LCP, FID, CLS) by page
  - JavaScript errors (with stack traces)
  - User session replays
  - Performance by geography, device, browser

Tools: Datadog RUM, New Relic Browser, Sentry, LogRocket

How QA uses RUM:
  - Identify pages with poor real-world performance
  - Find bugs that only occur on specific devices/browsers
  - Validate that fixes actually improve user experience
  - Discover issues that don't reproduce in test environments
```

### Testing in production safely

```text
‼️ Production testing is safe when done with proper controls:

Feature flags:
  - New feature behind a flag, enabled only for testers
  - If issue found, disable flag immediately
  - No user impact

Shadow traffic:
  - Duplicate production traffic to new version
  - New version processes requests but results are discarded
  - Compare responses between old and new version
  - Zero user impact

Dark launches:
  - Deploy new feature, process data in background
  - Don't show results to users
  - Validate that the new feature produces correct results
  - When confident, expose to users

Blue-green deployments:
  - Two identical production environments (blue and green)
  - Deploy to inactive environment
  - Switch traffic (load balancer)
  - If issues, switch back instantly

‼️ Never test in production without:
  - A rollback plan
  - Monitoring and alerting in place
  - Feature flags or traffic controls
  - Team awareness (don't do solo yolo deploys)
```

---

# Part 7 — The Complete Testing Workflow

---

## 32. End-to-End Team Workflow

### The complete flow

```text
‼️ This is how all roles interact throughout the development and release lifecycle.

1. PLANNING
   Developer + QA + PM meet (three amigos)
   → Define acceptance criteria
   → QA identifies test scenarios
   → QA estimates testing effort

2. DEVELOPMENT
   Developer writes code + unit tests
   → Pushes to feature branch
   → Pre-commit hooks run: lint, format, type-check

3. PR PIPELINE (automated)
   PR created →
   → CI runs: unit tests, integration tests, build, security scan
   → Visual regression check
   → Coverage report posted to PR

4. CODE REVIEW
   → Peer developer reviews code
   → QA reviews test coverage (are the right things tested?)
   → Comments addressed, tests added

5. MERGE
   → PR approved and merged to main
   → CI builds artifact
   → Deploys to QA environment

6. QA TESTING
   → QA runs manual exploratory testing
   → QA runs automated regression suite
   → Bugs filed → Developer fixes → QA retests
   → QA signs off on the feature

7. STAGING
   → Deploys to staging environment
   → UAT by product owner/stakeholders
   → Performance testing
   → Security scan (DAST)
   → UAT sign-off

8. PRODUCTION
   → Go/no-go decision
   → Deploys to production (canary or full)
   → Smoke tests run automatically
   → Monitoring dashboards watched
   → Synthetic monitoring active

9. ONGOING
   → Real user monitoring captures actual experience
   → Incidents trigger postmortems
   → Lessons learned improve test coverage
```

### ASCII diagram — developer and QA swim lanes

```text
‼️ Complete workflow showing parallel developer and QA activities:

DEVELOPER                                    QA
─────────                                    ──
    │                                         │
    ├── Write code + unit tests               ├── Review user story
    │                                         ├── Write test cases
    ├── Push to branch                        ├── Prepare test data
    │                                         │
    ├── Pre-commit hooks ────────────────────>│
    │   (lint, format, type-check)            │
    │                                         │
    ├── Open PR ─────────────────────────────>│
    │                                         │
    │   ┌─── CI PIPELINE (automated) ───┐    │
    │   │ Static analysis               │    │
    │   │ Unit tests                    │    │
    │   │ Integration tests             │    │
    │   │ Build check                   │    │
    │   │ Security scan (SAST)          │    │
    │   │ Visual regression             │    │
    │   └───────────────────────────────┘    │
    │                                         │
    ├── Code review ←─────────────────────────┤ QA reviews test coverage
    ├── Address comments                      │
    │                                         │
    ├── Merge to main ──────────────────────>│
    │                                         │
    │   ┌─── CI BUILDS & DEPLOYS ───────┐    │
    │   │ Build artifact                │    │
    │   │ Deploy to QA environment      │    │
    │   │ Run smoke tests               │    │
    │   └───────────────────────────────┘    │
    │                                         │
    │                                         ├── Exploratory testing
    │                                         ├── Run regression suite
    │                                         ├── Cross-browser testing
    │                                         ├── Accessibility check
    │                                         │
    │   ┌─── BUG FOUND ────────────────┐     │
    ├──<│ Bug filed in Jira            │<────┤ QA files bug
    │   └──────────────────────────────┘     │
    ├── Fix bug                              │
    ├── Push fix ───────────────────────────>├── Retest
    │                                        ├── Verify fix
    │                                        ├── ✓ QA sign-off
    │                                         │
    │   ┌─── DEPLOY TO STAGING ─────────┐    │
    │   │ Deploy to staging             │    │
    │   │ Environment mirrors prod      │    │
    │   └───────────────────────────────┘    │
    │                                         │
    │                                         ├── UAT coordination
    │                                         │   (PM/stakeholders test)
    │                                         ├── Performance testing
    │                                         ├── Security scan (DAST)
    │                                         ├── UAT sign-off received
    │                                         │
    │   ┌─── GO/NO-GO DECISION ─────────┐    │
    │   │ QA: all tests pass            │    │
    │   │ PM: features accepted         │    │
    │   │ Eng: no technical risks       │    │
    │   │ Security: no critical issues  │    │
    │   └───────────────────────────────┘    │
    │                                         │
    │   ┌─── DEPLOY TO PRODUCTION ──────┐    │
    │   │ Canary deployment (1%)        │    │
    │   │ Monitor metrics               │    │
    │   │ Full rollout (100%)           │    │
    │   └───────────────────────────────┘    │
    │                                         │
    │                                         ├── Smoke tests (production)
    │                                         ├── Monitor dashboards
    │                                         │
    │   ┌─── ONGOING ──────────────────┐     │
    ├──>│ Synthetic monitoring         │<────┤
    │   │ Real user monitoring         │     │
    │   │ Incident response            │     │
    │   │ Postmortems → improve tests  │     │
    │   └──────────────────────────────┘     │
    │                                         │
    ▼                                         ▼
```

### Summary: who does what

```text
Developer responsibilities:
  ✓ Write unit tests for all new code
  ✓ Write integration tests for API endpoints
  ✓ Fix bugs identified by QA
  ✓ Review test coverage in PRs
  ✓ Maintain test infrastructure (CI pipeline, test utilities)
  ✓ Respond to production incidents

QA responsibilities:
  ✓ Write and execute test cases
  ✓ Perform exploratory testing
  ✓ Run and maintain automated regression suite
  ✓ Report bugs with clear reproduction steps
  ✓ Verify bug fixes
  ✓ Coordinate UAT with stakeholders
  ✓ Track and report test metrics
  ✓ Sign off on releases
  ✓ Monitor production quality

Shared responsibilities:
  ✓ Define acceptance criteria (three amigos)
  ✓ Maintain test environments
  ✓ Improve test processes
  ✓ Participate in incident postmortems
  ✓ Knowledge sharing (dev teaches QA about the system, QA teaches dev about testing strategies)
```

---

*This document consolidates and extends the content from TESTING-DEEP.md and TESTING-STRATEGY-DEEP.md into a single, comprehensive enterprise testing reference. All original content has been preserved and organized into a unified structure covering the complete testing ecosystem.*
