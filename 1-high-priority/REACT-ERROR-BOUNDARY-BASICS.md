# React Error Boundaries — Beginner's Guide

**Priority: HIGH**

> A plain-language introduction to error boundaries: what problem they solve, what they
> catch and what they DON'T, writing one yourself, the easier `react-error-boundary`
> library, "Try again" buttons, where to put them, and how to test them.
>
> Assumes you know React components, props and `useState`. No class-component experience
> needed.

---

## Table of Contents

- [React Error Boundaries — Beginner's Guide](#react-error-boundaries--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. The Problem It Solves](#1-the-problem-it-solves)
  - [2. What It Catches (and What It Doesn't)](#2-what-it-catches-and-what-it-doesnt)
  - [3. Writing One Yourself](#3-writing-one-yourself)
  - [4. The Easy Way — `react-error-boundary`](#4-the-easy-way--react-error-boundary)
  - [5. "Try Again" — Resetting](#5-try-again--resetting)
  - [6. Errors in Event Handlers \& Async Code](#6-errors-in-event-handlers--async-code)
  - [7. Where to Put Boundaries](#7-where-to-put-boundaries)
  - [8. Logging Errors](#8-logging-errors)
  - [9. Testing an Error Boundary](#9-testing-an-error-boundary)
  - [10. Common Beginner Mistakes](#10-common-beginner-mistakes)
  - [11. Cheat Sheet](#11-cheat-sheet)
  - [Related Files](#related-files)

---

## 1. The Problem It Solves

```tsx
function UserCard({ user }) {
  return <p>{user.name.toUpperCase()}</p>; // user.name is undefined → crash
}
```

```text
One component throws an error while rendering.

‼️ Without an error boundary, React REMOVES THE WHOLE APP from the screen.
   The user sees a blank white page — for one broken card.‼️

Why so harsh? React would rather show nothing than show a half-broken UI
that might display wrong data (wrong balance, wrong user).‼️

‼️ ERROR BOUNDARY IN ONE SENTENCE
   A component that wraps part of your app and, if anything inside it crashes
   while rendering, shows a FALLBACK ("Something went wrong") instead —
   while the rest of the app keeps working.‼️

  Without:   one broken card  →  whole page blank
  With:      one broken card  →  that card says "Couldn't load", rest is fine

It's try/catch — but for components.‼️
```

---

## 2. What It Catches (and What It Doesn't)

```text
‼️ THE PART EVERYONE GETS WRONG. Error boundaries only catch errors that
   happen while React is RENDERING the components inside them.‼️

  ✓ CAUGHT
    - Errors during render           user.name.toUpperCase() on undefined
    - Errors in useEffect / lifecycle methods
    - Errors in constructors of child components

  ✗ NOT CAUGHT‼️
    - Event handlers                 onClick={() => { throw ... }}
    - Async code                     setTimeout, fetch().then(...), await
    - Errors in the boundary ITSELF  (only boundaries ABOVE it can catch those)‼️
    - Server-side rendering errors

‼️ Why not event handlers? They don't run during rendering — React calls them
   later, when the user clicks. The screen is already drawn and nothing is
   broken, so a normal try/catch is the right tool there. See §6.
```

---

## 3. Writing One Yourself

```text
‼️ An error boundary must be a CLASS component. There is no hook for it
   (no "useErrorBoundary" built into React). That's the main reason people
   use the library in §4 instead.
```

```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  // 1. A child crashed → switch to "error mode" so the NEXT render shows the fallback.
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  // 2. Also called after a crash — the place for LOGGING (see §8).
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Caught by boundary:', error, info.componentStack);
  }

  // 3. Error mode → fallback. Normal → the children as usual.
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

```tsx
// Usage
<ErrorBoundary fallback={<p>Something went wrong.</p>}>
  <UserCard user={user} />
</ErrorBoundary>
```

```text
THE TWO SPECIAL METHODS
  getDerivedStateFromError   "something broke" → return new state → show fallback
  componentDidCatch          "something broke" → log it somewhere

That's the whole thing. ~20 lines. You only write it once.
```

---

## 4. The Easy Way — `react-error-boundary`

```bash
npm install react-error-boundary
```

```text
The standard library for this. No class to write, and it adds the things
you'll want next: a "Try again" button, logging, and a hook for async errors.
```

```tsx
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

// The fallback gets the error AND a function to reset (try again).
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role='alert'>
      <p>Something went wrong:</p>
      {/* ‼️ error is typed `unknown` — anything can be thrown, not only Errors */}
      <pre>{error instanceof Error ? error.message : 'Unknown error'}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => logToService(error, info)} // §8
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
```

```text
THREE WAYS TO GIVE IT A FALLBACK — pick one
  fallback={<p>Oops</p>}                    plain element, no error details
  FallbackComponent={ErrorFallback}         a component that gets { error, resetErrorBoundary }
  fallbackRender={({ error }) => <p>…</p>}  same, written inline

‼️ Beginner advice: use FallbackComponent. It's the clearest.‼️

‼️ In production, don't show error.message to users — it can expose internal
   details. Show a friendly message; log the real error.‼️
```

---

## 5. "Try Again" — Resetting

```text
Once a boundary shows its fallback, it STAYS in error mode until reset.‼️
Two ways to reset:

1. A BUTTON — call resetErrorBoundary() (from the fallback props, §4).
   Use onReset to fix whatever caused the crash first, or it just crashes again.

2. AUTOMATICALLY — when something changes, via resetKeys.‼️
```

```tsx
// 1. Button + onReset
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => {
    // clear the bad state, refetch, etc. — then the children render again
    queryClient.resetQueries();
  }}
>
  <Dashboard />
</ErrorBoundary>;

// 2. resetKeys — reset when the user navigates to a different page‼️
const location = useLocation();

<ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[location.pathname]}>
  <Outlet />
</ErrorBoundary>;

// ‼️ Without resetKeys here, one crashed page would keep showing the error
// even after the user clicks to a DIFFERENT page.‼️
```

---

## 6. Errors in Event Handlers & Async Code

```tsx
// ── Event handlers → plain try/catch ──────────────────────────────────────
function SaveButton() {
  const [error, setError] = useState('');

  const handleClick = async () => {
    try {
      await saveTask();
    } catch {
      setError('Could not save. Please try again.'); // show it right here
    }
  };

  return (
    <>
      <button onClick={handleClick}>Save</button>
      {error && <p role='alert'>{error}</p>}
    </>
  );
}
```

```tsx
// ── Async error that SHOULD show the boundary → useErrorBoundary ─────────
import { useErrorBoundary } from 'react-error-boundary';

function UserProfile({ id }: { id: string }) {
  const { showBoundary } = useErrorBoundary();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(id).then(setUser).catch(showBoundary); // ‼️ hands the error to the nearest boundary
  }, [id, showBoundary]);

  // ...
}
```

```text
‼️ WHICH ONE?
   Small, recoverable problem (save failed, form invalid)
     → try/catch + a message next to the button. Keep the page usable.
   The component CAN'T work without this (its data failed to load)
     → showBoundary(error). Let the boundary show the fallback.

‼️ TanStack Query does this for you with throwOnError: true — a failed query
throws during render, so the nearest error boundary catches it.
See TANSTACK-QUERY-BASICS.md §10.
```

---

## 7. Where to Put Boundaries

```text
‼️ NOT ONE BIG ONE. Use a few, at different levels.

  <App>
  └─ <ErrorBoundary>            ① TOP LEVEL — last line of defence
     ├─ <Header />                 "Something went wrong. Reload the page."
     ├─ <ErrorBoundary>         ② PER PAGE / ROUTE
     │  └─ <DashboardPage>         the page fails, header + nav still work
     │     ├─ <ErrorBoundary>   ③ PER WIDGET — for independent parts
     │     │  └─ <SalesChart />    the chart fails, the rest of the page is fine
     │     └─ <ErrorBoundary>
     │        └─ <ActivityFeed />
     └─ <Footer />

  ①  ALWAYS have one. Without it, any uncaught crash = blank screen.
  ②  One per route, so navigation keeps working when a page breaks.
  ③  Around parts that can fail ALONE — charts, feeds, third-party widgets.

‼️ The question to ask: "If THIS breaks, what should still work?"
   Put a boundary just around the part that broke.

✗ Don't wrap every button and list item — that's just noise.
```

---

## 8. Logging Errors

```text
A boundary that only shows "Oops" hides the problem from YOU. Users see a
fallback, you never find out. ‼️ Always send caught errors somewhere.
```

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => {
    // info.componentStack = WHICH component crashed — very useful
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }}
>
  <App />
</ErrorBoundary>
```

```text
React 19 also lets you handle errors for the whole app in one place:

  createRoot(container, {
    onCaughtError:   (error, info) => { /* caught by a boundary */ },
    onUncaughtError: (error, info) => { /* NOT caught — app crashed */ },
  });

‼️ IN DEVELOPMENT you still see the error in the console (and sometimes an
   overlay) even when a boundary catches it. That's normal — it's so you
   notice. In production, users only see your fallback.‼️
```

---

## 9. Testing an Error Boundary

```tsx
// ‼️ A test component that always crashes
function Bomb(): never {
  throw new Error('Boom');
}

beforeEach(() => {
  // React logs caught errors to console.error — silence it so test output
  // stays readable. (With restoreMocks: true it's undone after each test.)
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('shows the fallback when a child crashes', () => {
  render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Bomb />
    </ErrorBoundary>,
  );

  expect(screen.getByRole('alert')).toHaveTextContent('Boom');
});

it('recovers after "Try again"', async () => {
  const user = userEvent.setup();
  let shouldThrow = true;

  function MaybeBomb() {
    if (shouldThrow) throw new Error('Boom');
    return <p>All good</p>;
  }

  render(
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => (shouldThrow = false)}>
      <MaybeBomb />
    </ErrorBoundary>,
  );

  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByText('All good')).toBeInTheDocument();
});

// ‼️ You may still see "Error: Boom" printed in the test output — that's the
// test environment reporting the error, not a failure. Check the pass/fail count.
```

---

## 10. Common Beginner Mistakes

```text
‼️ 1. Expecting it to catch onClick errors.
   It doesn't. Use try/catch in event handlers.

‼️ 2. Expecting it to catch fetch/async errors.
   It doesn't on its own. Use showBoundary(error), or TanStack Query's
   throwOnError.

‼️ 3. Only one boundary around the whole app.
   Any small crash replaces the ENTIRE page with "Something went wrong".
   Add boundaries per page and around independent widgets.

‼️ 4. No top-level boundary at all.
   One uncaught crash = blank white screen.

‼️ 5. "Try again" without fixing the cause.
   The same error happens again instantly. Use onReset to clear bad state
   or refetch.

‼️ 6. No resetKeys on route-level boundaries.
   The error sticks even after the user navigates to a different page.

‼️ 7. Not logging.
   Users see a fallback; you never hear about the bug. Use onError.

‼️ 8. Showing error.message to users in production.
   It can leak internal details. Friendly message on screen, real error in logs.

‼️ 9. Trying to write it as a function component with hooks.
   Not possible — boundaries must be classes. Or use react-error-boundary.

‼️ 10. Thinking the dev console error means it didn't work.
   In development React still logs caught errors. Check what's on screen.
```

---

## 11. Cheat Sheet

```tsx
import { ErrorBoundary, useErrorBoundary, type FallbackProps } from 'react-error-boundary';

// ── FALLBACK ──────────────────────────────────────────────────────────────
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role='alert'>
      <p>Something went wrong.</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// ── BOUNDARY ──────────────────────────────────────────────────────────────
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => log(error, info)} // send to Sentry etc.
  onReset={() => clearBadState()} // before "Try again" re-renders
  resetKeys={[location.pathname]} // auto-reset when these change
>
  <Page />
</ErrorBoundary>;

// ── ASYNC ERRORS → BOUNDARY ───────────────────────────────────────────────
const { showBoundary } = useErrorBoundary();
fetchData().catch(showBoundary);

// ── EVENT HANDLER ERRORS → TRY/CATCH ──────────────────────────────────────
try {
  await save();
} catch {
  setError('Could not save');
}
```

```text
CATCHES                         DOESN'T CATCH
  errors during render            event handlers   → try/catch
  errors in useEffect             async code       → showBoundary / throwOnError
  errors in child constructors    the boundary itself
                                  server rendering

WHERE
  ① top level (always)  ② per route (+ resetKeys)  ③ per independent widget
```

---

## Related Files

- [REACT-DEEP.md](REACT-DEEP.md) — React core concepts, including error boundaries at interview depth
- [REACT-INTERVIEW-LIVE-CODING-TS.md](REACT-INTERVIEW-LIVE-CODING-TS.md) — §18, building an error boundary in a live-coding round
- [TANSTACK-QUERY-BASICS.md](TANSTACK-QUERY-BASICS.md) — §10, `throwOnError` sends failed queries to the nearest boundary
- [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) — setup for the tests in §9
- [FRONTEND-ARCHITECTURE-DEEP.md](FRONTEND-ARCHITECTURE-DEEP.md) — where boundaries fit in an app's structure
