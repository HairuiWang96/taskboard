# React Unit Testing with Vitest — Beginner's Guide

**Priority: HIGH**

> A plain-language introduction to unit testing React components with Vitest and React
> Testing Library: setup, your first test, finding elements, clicking and typing, mocking
> functions and API calls, async UI, components that need providers (TanStack Query,
> Router, Zustand), custom hooks, timers, and the mistakes that cause most flaky tests.
>
> Assumes you know React (components, props, `useState`, `useEffect`). No testing
> experience needed.

---

## Table of Contents

- [React Unit Testing with Vitest — Beginner's Guide](#react-unit-testing-with-vitest--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. What a React Unit Test Is](#1-what-a-react-unit-test-is)
  - [2. Setup](#2-setup)
  - [3. Your First Test](#3-your-first-test)
  - [4. Finding Elements — Queries](#4-finding-elements--queries)
  - [5. Clicking \& Typing — `userEvent`](#5-clicking--typing--userevent)
  - [6. Assertions — `jest-dom` Matchers](#6-assertions--jest-dom-matchers)
  - [7. Mock Functions — Testing Callbacks](#7-mock-functions--testing-callbacks)
  - [8. Async UI — Loading, Then Data](#8-async-ui--loading-then-data)
  - [9. Components That Need Providers](#9-components-that-need-providers)
  - [10. Testing Custom Hooks](#10-testing-custom-hooks)
  - [11. Timers — `setTimeout`, Debounce](#11-timers--settimeout-debounce)
  - [12. Running Tests](#12-running-tests)
  - [13. What to Test (and What to Skip)](#13-what-to-test-and-what-to-skip)
  - [14. Common Beginner Mistakes](#14-common-beginner-mistakes)
  - [15. Cheat Sheet](#15-cheat-sheet)
  - [Related Files](#related-files)

---

## 1. What a React Unit Test Is

```text
A unit test for a component:
  1. RENDERS the component into a fake browser (jsdom) ‼️
  2. FINDS elements on the "screen" — a button, a heading, an input
  3. ACTS like a user — clicks, types
  4. CHECKS what the user would now see

‼️ REACT TESTING IN ONE SENTENCE
   Test what the USER sees and does — not how the component works inside.‼️

  ✗ "state.count is 1"                  ← implementation detail
  ✓ "after clicking +, the screen shows 1"  ← behaviour‼️

‼️ Why it matters: if you refactor useState → useReducer and nothing changes
   for the user, your tests should still pass. Tests that check internals
   break on every refactor and catch no real bugs.‼️
```

```text
THE TOOLS — three pieces that work together

  Vitest                    The TEST RUNNER. Finds test files, runs them,
                            gives you describe / it / expect / vi.
  React Testing Library     RENDERS components and FINDS elements‼️
  (@testing-library/react)  the way a user would (by text, label, role).
  user-event                SIMULATES a real user — click, type, tab.
  jest-dom                  Extra matchers: toBeInTheDocument(), toBeDisabled()…‼️
  jsdom                     A fake browser DOM that runs inside Node.‼️
```

---

## 2. Setup

```bash
npm install -D vitest jsdom \
               @testing-library/react \
               @testing-library/user-event \
               @testing-library/jest-dom
```

```typescript
// vite.config.ts — add a `test` section
import { defineConfig } from 'vitest/config'; // ‼️ from 'vitest/config', not 'vite'
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // ‼️ a fake browser — without it, "document is not defined"
    globals: true, // use describe/it/expect without importing them‼️
    setupFiles: './src/test/setup.ts', // runs before every test file‼️
    restoreMocks: true, // reset all mocks between tests automatically‼️
  },
});
```

```typescript
// src/test/setup.ts
// Adds jest-dom matchers (toBeInTheDocument, toHaveTextContent, …) to expect.‼️
import '@testing-library/jest-dom/vitest';

// With globals: true, React Testing Library automatically unmounts the
// component after each test, so tests don't leak into each other.‼️
```

```jsonc
// tsconfig.json — so TypeScript knows about the globals and matchers‼️
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"],
  },
}
```

```jsonc
// package.json
{
  "scripts": {
    "test": "vitest", // watch mode — reruns on save
    "test:run": "vitest run", // run once (for CI)
  },
}
```

```text
‼️ Test files are found by name: anything ending in .test.tsx or .spec.tsx.
   Put them next to the component:

     src/components/Counter.tsx
     src/components/Counter.test.tsx

‼️ Version note: recent Vitest releases need a recent Vite. If `npm install`
   complains about peer versions on an older Vite, install a Vitest major that
   matches it (check the Vitest docs), or upgrade Vite.
```

---

## 3. Your First Test

```tsx
// src/components/Greeting.tsx
export function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}
```

```tsx
// src/components/Greeting.test.tsx
import { render, screen } from '@testing-library/react';
import { Greeting } from './Greeting';

describe('Greeting', () => {
  // a group of related tests
  it('shows the name it is given', () => {
    // one test = one behaviour‼️
    // 1. RENDER
    render(<Greeting name='Ada' />);

    // 2. FIND  +  3. CHECK
    expect(screen.getByRole('heading', { name: 'Hello, Ada!' })).toBeInTheDocument();
  });
});
```

```text
WHAT JUST HAPPENED
  describe(...)   groups tests — shows as a heading in the output
  it(...)         one test case (test(...) is the same thing)
  render(...)     mounts the component into the fake DOM
  screen          the whole fake page — where you search for elements‼️
  getByRole(...)  finds the <h1> the way a screen reader would‼️
  expect(...)     the check — fails the test if it isn't true

‼️ Name tests as sentences about BEHAVIOUR:
   ✓ "shows an error when the email is invalid"
   ✗ "test 1", "handleSubmit works"
```

---

## 4. Finding Elements — Queries

```text
‼️ PREFER QUERIES IN THIS ORDER (most to least like a real user):

  getByRole          getByRole('button', { name: 'Save' })      ← best default
                     getByRole('heading', { name: 'Profile' })
                     getByRole('textbox', { name: 'Email' })
                     getByRole('checkbox', { name: 'Remember me' })
  getByLabelText     getByLabelText('Email')                    ← form fields
  getByPlaceholderText
  getByText          getByText('No tasks yet')                  ← plain content
  getByTestId        getByTestId('chart')                       ← last resort‼️

  Why role first? It's how assistive tech sees the page — so a test that finds
  a button by role also proves the button is ACCESSIBLE.
```

```text
‼️ THE THREE PREFIXES — the #1 source of beginner confusion.

  getBy...     MUST exist right now. Throws if not.
               → your default

  queryBy...   Returns null if missing. Doesn't throw.
               → ONLY to check something is NOT there:
                 expect(screen.queryByText('Error')).not.toBeInTheDocument()

  findBy...    WAITS for it to appear (up to 1 second). Returns a Promise.
               → anything that shows up later — after a fetch, a timeout:
                 expect(await screen.findByText('Welcome')).toBeInTheDocument()

  + getAllBy / queryAllBy / findAllBy  → when there can be several (returns an array)

‼️ getBy for something that hasn't loaded yet = the #1 flaky-test cause.
   If it appears asynchronously, use findBy.‼️
```

```tsx
// Not sure what role or name something has? Print the DOM:
screen.debug(); // prints the current HTML to the terminal‼️‼️

// Or ask Testing Library for suggestions:
screen.logTestingPlaygroundURL(); // opens a page that suggests the best query‼️
```

---

## 5. Clicking & Typing — `userEvent`

```tsx
// src/components/Counter.tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <button onClick={() => setCount(0)} disabled={count === 0}>
        Reset
      </button>
    </div>
  );
}
```

```tsx
// src/components/Counter.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments when the button is clicked', async () => {
    const user = userEvent.setup(); // ‼️ create the "user" FIRST, before render
    render(<Counter />);

    await user.click(screen.getByRole('button', { name: 'Increment' })); // ‼️ await
    await user.click(screen.getByRole('button', { name: 'Increment' }));

    expect(screen.getByText('Count: 2')).toBeInTheDocument();
  });

  it('resets back to zero', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const reset = screen.getByRole('button', { name: 'Reset' });
    expect(reset).toBeDisabled(); // nothing to reset yet

    await user.click(screen.getByRole('button', { name: 'Increment' }));
    await user.click(reset);

    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });
});
```

```text
‼️ ALWAYS `await` user actions. ‼️ They're async. Forget the await and your
   expect runs BEFORE the click finishes — the test fails or, worse, passes
   for the wrong reason.‼️

COMMON ACTIONS
  await user.click(el)
  await user.dblClick(el)
  await user.type(input, 'hello')        types one key at a time
  await user.clear(input)                empty an input
  await user.selectOptions(select, 'red')
  await user.keyboard('{Enter}')         special keys: {Enter} {Escape} {Tab}
  await user.tab()                       move focus to the next element
  await user.hover(el)

userEvent vs fireEvent:
  ‼️ fireEvent fires ONE raw event. userEvent does what a real user does
  (focus → keydown → input → keyup…). ‼️ Use userEvent. fireEvent only for
  rare events userEvent doesn't cover (e.g. scroll).
```

---

## 6. Assertions — `jest-dom` Matchers

```tsx
// Presence
expect(el).toBeInTheDocument();
expect(screen.queryByText('Error')).not.toBeInTheDocument();

// Text
expect(el).toHaveTextContent('Count: 2'); // contains this text
expect(el).toHaveTextContent(/count: \d+/i); // regex works too‼️

// Forms
expect(input).toHaveValue('ada@example.com');
expect(checkbox).toBeChecked();
expect(button).toBeDisabled();
expect(button).toBeEnabled();
expect(input).toHaveFocus();

// Visibility & attributes
expect(el).toBeVisible();
expect(link).toHaveAttribute('href', '/profile');
expect(el).toHaveClass('active'); // ‼️ use sparingly — classes are styling

// Accessibility
expect(input).toHaveAccessibleName('Email');
expect(input).toBeInvalid(); // aria-invalid or failed validation
```

---

## 7. Mock Functions — Testing Callbacks

```text
Many components don't DO the action — they call a function from props
(onSubmit, onDelete, onChange). To test that, pass a MOCK FUNCTION:
a fake function that records every call.‼️
```

```tsx
// src/components/AddTask.tsx
import { useState } from 'react';

export function AddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('');

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title.trim());
        setTitle('');
      }}
    >
      <label htmlFor='title'>New task</label>
      <input id='title' value={title} onChange={e => setTitle(e.target.value)} />
      <button type='submit'>Add</button>
    </form>
  );
}
```

```tsx
// src/components/AddTask.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTask } from './AddTask';

describe('AddTask', () => {
  it('calls onAdd with the typed title and clears the input', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(); // ‼️ the mock — records every call‼️

    render(<AddTask onAdd={onAdd} />);

    const input = screen.getByLabelText('New task');
    await user.type(input, '  Buy milk  ');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith('Buy milk'); // trimmed
    expect(input).toHaveValue(''); // cleared
  });

  it('does not call onAdd when the title is empty', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<AddTask onAdd={onAdd} />);
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).not.toHaveBeenCalled();
  });
});
```

```text
MOCK FUNCTION CHEATS
  vi.fn()                              a fake function that does nothing‼️
  vi.fn(() => 42)                      …that returns 42
  vi.fn().mockResolvedValue(data)      …that returns Promise.resolve(data)‼️
  vi.fn().mockRejectedValue(err)       …that returns Promise.reject(err)

  expect(fn).toHaveBeenCalled()
  expect(fn).toHaveBeenCalledTimes(2)
  expect(fn).toHaveBeenCalledWith('a', 1)
  expect(fn).not.toHaveBeenCalled()
```

---

## 8. Async UI — Loading, Then Data

```tsx
// src/api/users.ts
export async function fetchUsers(): Promise<{ id: number; name: string }[]> {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}
```

```tsx
// src/components/UserList.tsx
import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';

export function UserList() {
  const [users, setUsers] = useState<{ id: number; name: string }[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setError('Could not load users'));
  }, []);

  if (error) return <p role='alert'>{error}</p>;
  if (!users) return <p>Loading...</p>;
  return (
    <ul>
      {users.map(u => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

```tsx
// src/components/UserList.test.tsx
import { render, screen } from '@testing-library/react';
import { UserList } from './UserList';
import { fetchUsers } from '../api/users';

// ‼️ Replace the REAL api module with a fake one for this whole file.‼️
// No network request is made. vi.mock is moved to the top of the file
// automatically, so it runs before the imports above.‼️
vi.mock('../api/users');

describe('UserList', () => {
  it('shows loading, then the users', async () => {
    vi.mocked(fetchUsers).mockResolvedValue([
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
    ]);

    render(<UserList />);

    // Right away: loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // ‼️ findBy WAITS for the data to arrive
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    vi.mocked(fetchUsers).mockRejectedValue(new Error('boom'));

    render(<UserList />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load users');
  });
});
```

```text
‼️ ALWAYS TEST THE THREE STATES of anything that fetches:‼️
   loading → success → error. The error state is the one that breaks in
   production because nobody tested it.

waitFor — for checks that aren't "find an element":
  await waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(1));
  It retries the callback until it passes (or times out).
  ‼️ Prefer findBy when you're waiting for an element — it's shorter.

NEXT LEVEL: MSW (Mock Service Worker) fakes the NETWORK instead of your
api module, so the real fetch code runs too. See TESTING-STRATEGY-DEEP.md.‼️
```

---

## 9. Components That Need Providers

```text
Real components often need something from a parent: TanStack Query's
QueryClientProvider, React Router, a theme context. Render them without it
and you get errors like "No QueryClient set" or "useNavigate() may be used
only in the context of a <Router>".

‼️ FIX: wrap the component in the same providers your app uses —
   and put that in ONE helper so every test can reuse it.
```

```tsx
// src/test/render.tsx — a custom render with all your providers‼️
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router'; // v7+; on React Router v6 it's 'react-router-dom'
import type { ReactElement } from 'react';

export function renderWithProviders(ui: ReactElement, { route = '/' } = {}) {
  // ‼️ A NEW QueryClient for EVERY test. A shared one keeps cached data
  //    between tests, so one test's data shows up in the next.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // ‼️ otherwise a failing query retries 3× and the test times out
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {/* MemoryRouter = a router that lives in memory — no real URL bar needed */}‼️
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
```

```tsx
// Usage — same as render, just with providers
import { renderWithProviders } from '../test/render';

it('shows the profile page', async () => {
  renderWithProviders(<ProfilePage />, { route: '/profile/42' });
  expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
});
```

```tsx
// ── Zustand: no provider needed, but RESET the store between tests ─────────
// A Zustand store is global, so state from one test leaks into the next.‼️
import { useCartStore } from '../stores/cartStore';

const initialState = useCartStore.getState();

beforeEach(() => {
  useCartStore.setState(initialState, true); // true = replace, don't merge‼️
});

it('shows the cart count', () => {
  useCartStore.setState({ items: [{ id: '1', name: 'Pen', price: 2, qty: 3 }] });
  render(<CartBadge />);
  expect(screen.getByText(/3/)).toBeInTheDocument();
});
```

---

## 10. Testing Custom Hooks

```tsx
// src/hooks/useToggle.ts
import { useState, useCallback } from 'react';

export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn(v => !v), []);
  return { on, toggle };
}
```

```tsx
// src/hooks/useToggle.test.ts
import { renderHook, act } from '@testing-library/react';
import { useToggle } from './useToggle';

it('toggles on and off', () => {
  // renderHook runs the hook inside a tiny invisible test component‼️
  const { result } = renderHook(() => useToggle());

  expect(result.current.on).toBe(false);

  // ‼️ Anything that updates state OUTSIDE a user event goes inside act()‼️‼️
  act(() => result.current.toggle());
  expect(result.current.on).toBe(true);

  act(() => result.current.toggle());
  expect(result.current.on).toBe(false);
});

// ‼️ result.current is always the LATEST value — read it AFTER act(),‼️
// don't save it to a variable before.
```

```text
‼️ Only test a hook on its own when it's REUSED or has real logic.
   A hook used by one component is usually better tested THROUGH that
   component — it's closer to what the user sees.‼️
```

---

## 11. Timers — `setTimeout`, Debounce

```tsx
// A toast that disappears after 3 seconds
export function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(id);
  }, []);
  return visible ? <p role='status'>{message}</p> : null;
}
```

```tsx
import { render, screen, act } from '@testing-library/react';

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers()); // ‼️ fake clock — time only moves when YOU say‼️
  afterEach(() => vi.useRealTimers()); // ‼️ always switch back

  it('disappears after 3 seconds', () => {
    render(<Toast message='Saved' />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');

    // Jump the clock forward instead of really waiting 3 seconds
    act(() => vi.advanceTimersByTime(3000));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
```

```text
‼️ FAKE TIMERS + userEvent: tell userEvent about the fake clock, or its
   internal delays never finish and the test hangs:‼️

     const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

‼️ FAKE TIMERS + findBy: findBy waits using timers too. If a test with fake
   timers hangs on findBy, advance the timers first, or use real timers
   for that test.
```

---

## 12. Running Tests

```bash
npm test                         # watch mode — reruns affected tests on save
npx vitest run                   # run once and exit (CI)‼️
npx vitest Counter               # only files matching "Counter"
npx vitest -t "resets"           # only tests whose name matches "resets"
npx vitest --coverage            # coverage report (prompts to install @vitest/coverage-v8)
npx vitest --ui                  # browser UI (prompts to install @vitest/ui)
```

```tsx
// Focus or skip while debugging — ‼️ never commit these‼️
it.only('runs ONLY this test in the file', () => {});
it.skip('skips this test', () => {});
it.todo('write this test later');
```

---

## 13. What to Test (and What to Skip)

```text
✓ TEST
  - What renders for given props          "shows the user's name"
  - What happens on interaction           "clicking Delete calls onDelete"
  - Conditional UI                        "shows an error when invalid"
  - Loading / success / error states      for anything that fetches
  - Edge cases                            empty list, very long text, 0 items
  - Accessibility basics                  labels exist, buttons have names

✗ SKIP
  - Internal state values                 "state.isOpen is true"
  - That React works                      "useState updates" — React is tested
  - Exact CSS / pixel layout              → visual tests or E2E‼️
  - Third-party libraries themselves      trust the date picker; test YOUR use of it
  - Every tiny presentational component   a <Card> that only renders children

‼️ A GOOD TEST FAILS WHEN THE USER WOULD NOTICE, and passes when they wouldn't.‼️
```

---

## 14. Common Beginner Mistakes

```text
‼️ 1. getBy for something that appears later.
   Use findBy for anything after a fetch, timeout or transition.

‼️ 2. Forgetting `await` on user.click / user.type / findBy.
   The check runs too early. Every userEvent call and findBy needs await.

‼️ 3. Testing implementation details.
   Checking state, calling component methods, counting renders. Test what's
   on screen instead.‼️

‼️ 4. Querying by class name or test id first.
   Use getByRole / getByLabelText. Test ids are the last resort.

‼️ 5. Missing environment: 'jsdom'.
   "document is not defined" / "window is not defined". Add it to vite.config.

‼️ 6. Forgetting the setup file.
   "toBeInTheDocument is not a function". Import
   '@testing-library/jest-dom/vitest' in setupFiles.

‼️ 7. Sharing one QueryClient between tests (or leaving retry on).
   Data leaks between tests; failing queries retry and time out.

‼️ 8. Not resetting global state.
   Zustand stores, mocks, fake timers — reset in beforeEach/afterEach
   (or restoreMocks: true in config).

‼️ 9. "Warning: An update was not wrapped in act(...)".
   Something updated AFTER your test stopped looking — usually a fetch that
   finished late. Wait for the final UI with findBy, so the test ends after it.

‼️ 10. Big snapshot tests.‼️
   toMatchSnapshot() on a whole page → huge files nobody reads, updated
   blindly with -u. Prefer specific assertions.

‼️ 11. Committing it.only.
   Every other test in the file silently stops running.
```

---

## 15. Cheat Sheet

```tsx
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── THE PATTERN ───────────────────────────────────────────────────────────
it('does the thing', async () => {
  const user = userEvent.setup();         // 1. set up
  const onSave = vi.fn();
  render(<Form onSave={onSave} />);       // 2. render

  await user.type(screen.getByLabelText('Name'), 'Ada');           // 3. act
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(onSave).toHaveBeenCalledWith('Ada');                      // 4. check
});

// ── QUERIES ───────────────────────────────────────────────────────────────
screen.getByRole('button', { name: 'Save' })   // must exist now
screen.queryByText('Error')                    // null if missing → for .not
await screen.findByText('Ada')                 // waits for it
screen.getAllByRole('listitem')                // several → array‼️
screen.debug()                                 // print the DOM

// ── MOCKS ─────────────────────────────────────────────────────────────────
const fn = vi.fn();                            // fake callback
vi.mock('../api/users');                       // fake a whole module
vi.mocked(fetchUsers).mockResolvedValue([...]) // set what it returns
vi.mocked(fetchUsers).mockRejectedValue(err)   // make it fail

// ── ASYNC ─────────────────────────────────────────────────────────────────
expect(await screen.findByText('Done')).toBeInTheDocument();
await waitFor(() => expect(fn).toHaveBeenCalled());

// ── HOOKS ─────────────────────────────────────────────────────────────────
const { result } = renderHook(() => useToggle());
act(() => result.current.toggle());
expect(result.current.on).toBe(true);

// ── TIMERS ────────────────────────────────────────────────────────────────
vi.useFakeTimers();‼️
act(() => vi.advanceTimersByTime(3000));
vi.useRealTimers();
```

```text
RULES
  1. Test what the user sees, not internals‼️
  2. getByRole first, getByTestId last
  3. await every user action and findBy
  4. findBy for anything that appears later
  5. Test loading, success AND error
  6. Fresh QueryClient (retry: false) and reset stores per test
```

---

## Related Files

- [TESTING-ECOSYSTEM-DEEP.md](TESTING-ECOSYSTEM-DEEP.md) — the full testing tool landscape at senior depth
- [TESTING-BASICS.md](../2-medium-priority/TESTING-BASICS.md) — beginner guide to testing in general: types of tests, backend, mocking, E2E
- [TESTING-STRATEGY-DEEP.md](../2-medium-priority/TESTING-STRATEGY-DEEP.md) — RTL, MSW, Playwright, TDD and CI strategy
- [TANSTACK-QUERY-BASICS.md](TANSTACK-QUERY-BASICS.md) — the queries §9 wraps in a provider
- [ZUSTAND-BASICS.md](ZUSTAND-BASICS.md) — the stores §9 resets between tests
