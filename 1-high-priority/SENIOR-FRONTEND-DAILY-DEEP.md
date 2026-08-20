# Senior Frontend Engineer — Complete React Ecosystem Reference

> Comprehensive reference covering React internals, Fiber architecture, reconciliation, hooks deep dive, state management, patterns, performance, concurrent features, Suspense, Server Components, frontend architecture, ecosystem libraries, Next.js, TypeScript+React, CSS architecture, accessibility, design systems, testing, observability, authentication, API patterns, tooling, code review, feature flags, i18n, SEO, and debugging.

---

## Table of Contents

### Part 1 — React Core, Architecture & Ecosystem

1. [React Fiber Architecture](#1-react-fiber-architecture)
2. [Reconciliation & Diffing](#2-reconciliation--diffing)
3. [Rendering Phases](#3-rendering-phases)
4. [Hooks — Deep Dive](#4-hooks--deep-dive)
5. [State Management Patterns](#5-state-management-patterns)
6. [Context API](#6-context-api)
7. [Performance Optimization](#7-performance-optimization)
8. [Patterns & Component Architecture](#8-patterns--component-architecture)
9. [Concurrent Mode & Features](#9-concurrent-mode--features)
10. [Suspense](#10-suspense)
11. [React Server Components](#11-react-server-components)
12. [Forms](#12-forms)
13. [Data Fetching Patterns](#13-data-fetching-patterns)
14. [Error Handling](#14-error-handling)
15. [Testing](#15-testing)
16. [Frontend Architecture](#16-frontend-architecture)
17. [Component Architecture](#17-component-architecture)
18. [State Architecture](#18-state-architecture)
19. [Data Fetching Architecture](#19-data-fetching-architecture)
20. [Routing Architecture](#20-routing-architecture)
21. [Rendering Strategy Architecture](#21-rendering-strategy-architecture)
22. [Monorepo Architecture](#22-monorepo-architecture)
23. [Module Boundary Rules](#23-module-boundary-rules)
24. [TanStack Query (React Query)](#24-tanstack-query-react-query)
25. [Zustand — Client State](#25-zustand--client-state)
26. [React Hook Form](#26-react-hook-form)
27. [React Router v6](#27-react-router-v6)
28. [Choosing the Right Tool](#28-choosing-the-right-tool)

### Part 2 — Day-to-Day Senior Engineering

29. [Next.js (App Router)](#29-nextjs-app-router)
30. [TypeScript + React Advanced Patterns](#30-typescript--react-advanced-patterns)
31. [CSS Architecture](#31-css-architecture)
32. [Accessibility (a11y) in React](#32-accessibility-a11y-in-react)
33. [Design Systems & Component Libraries](#33-design-systems--component-libraries)
34. [Testing Strategy for Senior Engineers](#34-testing-strategy-for-senior-engineers)
35. [Error Monitoring & Observability](#35-error-monitoring--observability)
36. [Authentication Patterns in React](#36-authentication-patterns-in-react)
37. [API Layer Patterns](#37-api-layer-patterns)
38. [Developer Experience & Tooling](#38-developer-experience--tooling)
39. [Code Review Practices](#39-code-review-practices)
40. [Feature Flags & A/B Testing](#40-feature-flags--ab-testing)
41. [Internationalization (i18n)](#41-internationalization-i18n)
42. [SEO for React/Next.js](#42-seo-for-reactnextjs)
43. [Debugging Techniques](#43-debugging-techniques)
44. [Soft Skills for Senior Frontend Engineers](#44-soft-skills-for-senior-frontend-engineers)

---

# Part 1 — React Core, Architecture & Ecosystem

---

## 1. React Fiber Architecture

### What Fiber is

```text
Before React 16: the "Stack Reconciler" — synchronous, could not be interrupted.
  Once started, it ran to completion. Long trees = dropped frames = janky UI.

React 16+: ‼️ Fiber — a complete rewrite of the reconciler.
  Key idea: reconciliation is now INTERRUPTIBLE and INCREMENTAL.

‼️ A Fiber is a JavaScript object — one per component instance — that represents:
  - What type of component it is (function, class, host element)
  - Its props and state
  - Pointers to parent, child, and sibling fibers (linked list, not a tree)‼️
  - Work that needs to happen (effect flags)
  - Priority of the work

‼️ The fiber tree is the virtual DOM — it exists entirely in JS memory.
```

### The fiber linked list

```text
Each fiber has three pointers:‼️
  child   → first child fiber
  sibling → next sibling fiber
  return  → parent fiber

Example:
  <App>
    <Header />
    <Main>
      <Article />
    </Main>
  </App>

Fiber tree:
  App → child → Header → sibling → Main → child → Article
  All have return pointers back to their parent‼️

Why linked list (not tree)?‼️
  A linked list can be traversed iteratively (with a pointer + loop).
  A tree requires recursion (fills the call stack).
  ‼️ Iterative traversal can be paused at any point — recursive cannot.
  This is what makes Fiber interruptible.
```

### Work loop

```text
React processes fibers in a "work loop" — a while loop that picks up
the next fiber unit of work and processes it.‼️

function workLoop(deadline) {
  while (nextFiber && deadline.timeRemaining() > 0) {
    nextFiber = performUnitOfWork(nextFiber); // process one fiber
  }
  // If time is up, yield to the browser — schedule more work later
  requestIdleCallback(workLoop);
}

In React's actual implementation: uses MessageChannel + scheduler package
instead of requestIdleCallback (better cross-browser control of timing).
```

---

## 2. Reconciliation & Diffing

### How React renders

```text
1. Trigger: state/prop change, forceUpdate, context change
2. Render phase: React calls your component function → gets new element tree (virtual DOM)
   - Pure, no side effects here‼️
   - May be interrupted in concurrent mode
3. Commit phase: React diffs old vs new tree → applies minimal DOM changes
   - Always synchronous‼️
   - ‼️ DOM mutations, then refs, then effects run here‼️
```

### The diffing algorithm

```text
When state changes, React re-renders and creates a new fiber tree.
It then diffs the new tree against the current (committed) tree.
This diffing is called reconciliation.

React's heuristics (makes it O(n) instead of O(n³)):
  1. Different element types = destroy subtree, mount fresh
     <div> → <span>: React removes the div and all its children, mounts a new span

  2. Same element type = update in place (reuse the DOM node)
     <div className="a"> → <div className="b">: React updates just the className

  3. Lists: use the key prop to match items across renders
     Without keys: React compares by position — inserting at start shuffles all
     With keys: React matches by key — only the new item is mounted

‼️ React assumes:
  1. Same component type at same position → update (reuse instance)
  2. Different component type at same position → unmount old, mount new
  3. Key prop → explicitly identify list items across renders

Same type → props updated, no unmount/mount:
  <Input type="text" />  →  <Input type="email" />  // same Input, prop changed

Different type → full remount:
  <Input />  →  <div />  // Input unmounted, div mounted fresh

This is why:
  - Conditionally rendering different types resets state
  - Conditionally rendering SAME type preserves state
```

### Why keys matter

```jsx
// ✗ No keys — inserting at start causes all items to re-render
const list = items.map((item, index) => (
    <li key={index}>{item.name}</li> // ✗ index as key — same problem
));

// What happens when you insert at index 0:
// Before: [A(0), B(1), C(2)]
// After:  [NEW(0), A(1), B(2), C(3)]
// React sees key=0 changed from A to NEW — re-renders A, B, C, AND mounts new item
// Result: full list re-render, potential state bugs in form inputs

// ✓ Use stable, unique IDs
const list = items.map(item => <li key={item.id}>{item.name}</li>);
// React correctly identifies which item is new, which moved — minimal DOM updates

// When index keys ARE okay:
// - The list never reorders
// - The list never has items inserted/deleted (only appended)
// - Items are not stateful (no forms, no animations)
```

### Keys in depth

```jsx
// Key must be stable, unique among siblings, not array index
{
    items.map(item => <Item key={item.id} {...item} />);
}

// ✗ Array index as key — breaks on reorder, insert, delete
{
    items.map((item, i) => <Item key={i} {...item} />);
}

// ‼️ Keys reset component state — use deliberately
// Forcing remount (reset) using key:
<Input key={userId} defaultValue={user.name} />;
// When userId changes, Input unmounts and remounts fresh — state reset‼️

// ‼️ Keys work across conditional branches:
//
// The problem: when you use a ternary like this WITHOUT keys:
//   isLoggedIn ? <Dashboard /> : <Login />
// Both components sit in the SAME POSITION in the React tree (position 0).
// React sees "position 0 had a component, position 0 still has a component"
// and might try to UPDATE the existing one instead of replacing it.
// This can LEAK STATE from one component into the other.‼️
//
// Adding keys tells React: "these are completely different things —
// destroy one and create the other." Forces a clean unmount/mount.
{
    isLoggedIn ? <Dashboard key='dashboard' /> : <Login key='login' />;
}
// ‼️ Without keys — React may try to update Dashboard → Login (same position)
// With keys — React knows they're different, unmounts/mounts correctly‼️
```

### Reconciliation and component types

```text
‼️ Two different questions about conditional rendering:

  Question 1: "How do I make sure React properly REPLACES one component
               with another?" → Use keys (shown above)

  Question 2: "What if I want to KEEP the state alive when toggling
               between components?" → Use CSS hiding (shown below)

  By default, toggling between components DESTROYS one and CREATES the other.
  All internal state (form inputs, scroll position, etc.) is LOST.
  Sometimes that's what you want (login → dashboard = fresh state).
  Sometimes it's NOT (tabs where you don't want to lose what the user typed).

  Summary:
    Unmount/mount (default):  state is RESET every time you toggle
    CSS display: none:        state is PRESERVED — component stays alive but hidden

    Use unmount when:  you WANT fresh state (login → dashboard)
    Use CSS hide when: you want to KEEP state (tabs, multi-step forms)‼️
```

```jsx
// Conditional rendering — component type matters
function Parent({ isLoggedIn }) {
    return isLoggedIn ? <UserDashboard /> : <LoginForm />;
    // When isLoggedIn toggles: React UNMOUNTS one and MOUNTS the other
    // All state inside each component is RESET — it's a fresh instance every time
    // This is usually what you want (e.g., going from login to dashboard)
}

// You might think using && instead of ternary is different — it's NOT:
function Parent({ isLoggedIn }) {
    return (
        <>
            {isLoggedIn && <UserDashboard />}
            {!isLoggedIn && <LoginForm />}
        </>
    );
    // Same result — they still unmount/mount
    // When isLoggedIn flips, one component is removed from the tree entirely
    // and the other is added. State is still RESET.
    // This is just a different SYNTAX for the same behavior as the ternary above.
}

// So how do you actually PRESERVE state? (e.g., tabs, multi-step forms)
// Always render BOTH components, use CSS to hide the inactive one:
function Parent({ isLoggedIn }) {
    return (
        <>
            <UserDashboard style={{ display: isLoggedIn ? 'block' : 'none' }} />
            <LoginForm style={{ display: isLoggedIn ? 'none' : 'block' }} />
        </>
    );
    // Both components stay MOUNTED in the DOM at all times
    // The hidden one is just invisible (display: none)
    // Its state (form inputs, scroll position) survives the toggle‼️
    // Trade-off: both components are in memory — only use when state preservation matters
}
```

### When does a component re-render?

```text
A component re-renders when:
  1. Its own state changes (useState, useReducer)
  2. Its parent re-renders (by default, children re-render too)
  3. A context it consumes changes
  4. Its props change (but parent re-render already causes this)

Note: ‼️ re-render ≠ DOM update‼️
  React re-renders (calls function) to compute new virtual DOM‼️
  Then diffs against previous — only CHANGED DOM nodes are updated
  Re-renders are usually fast; unnecessary DOM mutations are slow‼️
```

---

## 3. Rendering Phases

### Two-phase commit

```text
React's rendering has two phases:

RENDER PHASE (pure, may be interrupted/repeated in concurrent mode):
  - React calls your function component
  - Creates new fiber tree (virtual DOM)
  - Diffs against current fiber tree (reconciliation)
  - Calculates what needs to change (effect list)
  - No DOM changes yet — this is all in JS memory‼️
  - CAN be interrupted, discarded, and restarted (concurrent mode)
  - Must be pure (no side effects) — React may call your component multiple times

COMMIT PHASE (synchronous, cannot be interrupted):‼️
  - React applies all the DOM mutations at once
  - Runs useLayoutEffect (after DOM update, before browser paint)‼️
  - Browser paints the screen
  - Runs useEffect (after browser paint)

This is why:
  - useEffect (post-paint): safe for async, data fetching, subscriptions‼️
  - useLayoutEffect (post-DOM, pre-paint): safe for measuring DOM, preventing flicker‼️
  - Both can be called multiple times — render phase may restart‼️
```

### Why render phase must be pure

```jsx
// ✗ Side effect in render — dangerous in concurrent mode‼️
function Component() {
    // This runs during render phase — may run multiple times
    fetch('/api/data'); // fires multiple times! network requests pile up
    document.title = 'Loading...'; // flickers

    return <div>...</div>;
}

// ✓ Side effects go in useEffect (commit phase, runs once after paint)‼️
function Component() {
    useEffect(() => {
        fetch('/api/data').then(setData);
        document.title = 'Loaded';
    }, []);

    return <div>...</div>;
}
```

### useEffect vs useLayoutEffect vs useInsertionEffect

```jsx
// useInsertionEffect (React 18, CSS-in-JS only)‼️
//   → Runs before DOM mutations — for injecting style tags
//   → Not for application code‼️

// useLayoutEffect
//   → Runs synchronously after DOM update, before paint‼️
//   → Use for: reading DOM measurements, avoiding visual flicker‼️
//   → Blocks the browser — keep it fast‼️
useLayoutEffect(() => {
    const height = ref.current.getBoundingClientRect().height;
    setHeight(height); // set state before paint — no flash of wrong layout
}, []);

// useEffect
//   → Runs asynchronously after paint‼️
//   → Use for: data fetching, subscriptions, non-visual side effects‼️
useEffect(() => {
    const subscription = store.subscribe(handleChange);
    return () => subscription.unsubscribe();
}, []);
```

---

## 4. Hooks — Deep Dive

### How hooks actually work

```text
Hooks are stored as a linked list on the fiber.‼️
Each hook call appends to this list during render.

function Component() {
  const [a, setA] = useState(1); // hook 1
  const [b, setB] = useState(2); // hook 2
  useEffect(() => {}, []);       // hook 3
}

Fiber's hook list: hook1 → hook2 → hook3

On re-render, React reads hooks in ORDER from this list.‼️
This is why hooks cannot be inside conditions or loops:
  if (condition) {
    useState(1); // hook 1 sometimes, sometimes not
  }
  // React can't match hook 1 to the right stored state
  // → "Rendered more/fewer hooks than previous render" error
```

### useState internals

```js
// useState stores state in a ‼️ linked list on the fiber (component instance)
// ‼️ Hooks must be called in the same order every render — no conditions!
// This is why "Rules of Hooks" exist — React uses call order to match state to hook

const [count, setCount] = useState(0);

// Functional update — use when new state depends on old state ‼️
setCount(prev => prev + 1); // ‼️ safe in concurrent mode, batched updates‼️

// ‼️ ✗ Direct value — stale if called multiple times before re-render‼️
setCount(count + 1);
setCount(count + 1); // ‼️ still count+1, not count+2!

// ✓ Functional update — always applies to latest state‼️
setCount(c => c + 1);
setCount(c => c + 1); // correctly count+2

// ‼️ Lazy initialization — only runs on mount, not every render‼️
const [data, setData] = useState(() => JSON.parse(localStorage.getItem('data') ?? '[]'));

// Object state — must spread to preserve other keys
const [form, setForm] = useState({ name: '', email: '' });
setForm(prev => ({ ...prev, name: 'Alice' })); // preserve email
```

### useState batching internals

```jsx
// setState calls during React event handlers are batched
function handleClick() {
    setCount(c => c + 1);
    setName('Alice');
    // React batches both — ONE re-render, not two‼️
}

// Why functional updates matter
function handleClick() {
    setCount(count + 1); // ✗ closes over stale count
    setCount(count + 1); // ✗ both use the same old count — result: count + 1, not count + 2

    setCount(c => c + 1); // ✓ receives latest state
    setCount(c => c + 1); // ✓ receives the result of first update — result: count + 2
}
```

### useEffect internals

```js
// ‼️ useEffect runs AFTER the browser has painted — non-blocking
// ‼️ useLayoutEffect runs AFTER DOM mutations but BEFORE paint — blocking (like componentDidMount)
//
// Full sequence on every render:
//   1. Component function runs (render phase)
//      - state/ref values are read
//      - useEffect(() => {...}) is encountered → callback REGISTERED, not run yet
//      - JSX is returned
//   2. React diffs virtual DOM and updates the real DOM
//   3. Browser paints the screen (user sees the new UI)
//   4. useEffect callbacks fire
//      - cleanup of the previous effect runs first (if any)‼️
//      - then the new effect body runs
//
// useLayoutEffect fires between step 2 and 3 — after DOM update but before paint.
// Use it when you need to measure DOM elements before the user sees them.

useEffect(() => {
    // Effect body: runs after render + paint
    const subscription = subscribe(userId);

    return () => {
        // Cleanup: runs before next effect OR on unmount
        subscription.unsubscribe();
    };
}, [userId]); // dependency array

// [] — run once on mount, cleanup on unmount
// [dep] — run on mount + whenever dep changes
// ‼️ no array — run after EVERY render (rare, usually a bug)

// React 18 StrictMode: effects run TWICE on mount in development ‼️
// Purpose: verify your cleanup function correctly reverses the effect‼️
// This catches missing cleanups

// Common patterns
useEffect(() => {
    if (!id) return; // guard — don't run if no id

    let cancelled = false;
    fetchUser(id).then(user => {
        if (!cancelled) setUser(user); // prevent state update after unmount
    });

    return () => {
        cancelled = true;
    };
}, [id]);

// Q: If useEffect fires after paint, how does fetched data ever make it to the screen?
//    The user data needs to be there to paint — so what is actually being painted first?
//
// A: "Paint" means whatever React can render with the data it already has — not the final state.
//    React doesn't wait for your fetch. It paints immediately with the initial state (e.g. []),
//    then the effect fetches, and setUsers() triggers a SECOND render + paint with real data.
//
// Flow for a fetch inside useEffect:
//   1. Render  → component runs with users = [] (initial state)
//   2. Paint   → browser shows loading spinner / empty list
//   3. useEffect fires → fetch starts
//   4. Data arrives → setUsers(data) called → triggers a NEW render cycle
//   5. Render  → component runs again with users = [...]
//   6. Paint   → browser now shows the populated list
//
// That's why you always need a loading fallback for the first paint:‼️
//
// const [users, setUsers] = useState([]);          // first paint uses this
// useEffect(() => {
//     fetch('/api/users')
//         .then(r => r.json())
//         .then(data => setUsers(data));            // triggers second render + paint‼️
// }, []);
// return users.length === 0 ? <Spinner /> : <UserList users={users} />;
```

### useRef deep dive

```js
// ‼️ useRef returns a mutable box { current: initialValue }‼️
// Changing .current does NOT trigger re-render‼️
// ‼️ Same object reference across all renders‼️

// Under the hood, useRef is basically:
function useRef(initialValue) {
    const [ref] = useState({ current: initialValue });
    return ref;
}
// (simplified — actual implementation avoids useState overhead)

// Use 1: access DOM nodes
const inputRef = useRef(null);
useEffect(() => {
    inputRef.current.focus();
}, []);
<input ref={inputRef} />;

// Use 2: store mutable values across renders without triggering re-render‼️
const renderCount = useRef(0);
useEffect(() => {
    renderCount.current++; // runs after every render, always up-to-date‼️
}); // no dep = after every render
// NOTE: unlike usePrevious, this never reads ref.current during render (no return statement).
// So there's no "one render behind" problem — you read renderCount.current whenever
// you need it (e.g. in JSX or a handler), and by then the effect has already incremented it.
// Contrast:‼️
//   usePrevious → reads ref.current during render's return  → captures stale value → one render behind
//   renderCount → never reads ref.current during render     → always current when you check it

// ‼️ Use 3: store latest callback (avoid stale closure)‼️
const latestCallback = useRef(onSuccess);
useEffect(() => {
    latestCallback.current = onSuccess;
}); // always latest

useEffect(() => {
    const id = setInterval(() => {
        latestCallback.current(); // always calls latest version, no stale closure
    }, 1000);
    return () => clearInterval(id);
}, []); // interval created once, but always calls latest callback

// Use 4: previous value
// WHY usePrevious returns the PREVIOUS render's value:
//
// The trick is the timing gap between render and useEffect:
//   1. render() runs  →  ref.current is READ (still holds old value)
//   2. React paints the DOM
//   3. useEffect runs →  ref.current is WRITTEN (updated to new value)
//
// ‼️ So the return statement always executes BEFORE the effect updates the ref.
//
// Example walkthrough:
//   Render 1: value="A" → returns undefined (ref not set yet), then effect sets ref.current="A"
//   Render 2: value="B" → returns "A" (previous!),            then effect sets ref.current="B"
//   Render 3: value="C" → returns "B" (previous!),            then effect sets ref.current="C"
//
// ‼️ useRef persists across renders without triggering re-renders, and useEffect always
// runs after return — so the read and write are always exactly one render apart.
//
// ‼️ IMPORTANT: useEffect() does NOT run its callback immediately — it just schedules it.
// React collects all effects during render and runs them later after painting.
// So even though useEffect appears before return in the code, the callback hasn't
// executed yet when return ref.current runs.
//
// Code order vs execution order:
//   useEffect(() => { ... })  → just REGISTERS the callback (nothing runs yet)
//   return ref.current        → runs immediately, reads the still-old value
//   [after paint]             → React finally fires the scheduled callback
//
// ‼️ Code order ≠ execution order. useEffect is registration, not immediate execution.
function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value; // runs AFTER paint — not when this line is reached
    });
    return ref.current; // runs DURING render — useEffect callback hasn't fired yet
}
```

### useMemo & useCallback

```js
// useMemo — memoize a COMPUTED VALUE
const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items], // recompute only when items changes
);

// useCallback — memoize a FUNCTION REFERENCE‼️
const handleDelete = useCallback(id => {
    setItems(prev => prev.filter(item => item.id !== id));
}, []); // stable reference — won't cause child re-renders‼️

// When to use:
// useMemo: genuinely expensive computation (sorting thousands of items)
// useCallback: function passed to React.memo children, or in useEffect deps‼️

// When NOT to use:
// Memoization has a cost too — memory + comparison overhead
// Don't add them "just in case" — measure first
// Simple calculations are faster WITHOUT useMemo

// The real cost: React still calls the component — it just skips the work inside useMemo
// Extra cost: the comparison of deps array on every render
// Benefit only exceeds cost for: expensive computations, reference-stable callbacks
//   needed for React.memo or useEffect deps

// The reference equality problem
useEffect(() => {
    fetchData(options); // if options is an object created during render:
}, [options]); // new object every render = infinite loop!

// Fix: memoize the object
const options = useMemo(() => ({ page, limit }), [page, limit]);
// Or: list primitives as deps
useEffect(() => {
    fetchData({ page, limit });
}, [page, limit]);
```

### useReducer

```js
// useReducer: useState for complex state with multiple sub-values
// ‼️ or when next state depends on previous state in complex ways

type State = { items: Item[]; loading: boolean; error: string | null };
type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Item[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'DELETE_ITEM'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, items: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'DELETE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };
    default:
      return state;
  }
}

const initialState: State = { items: [], loading: false, error: null };
const [state, dispatch] = useReducer(reducer, initialState);

// Benefits:
// - ‼️ Reducer is a pure function — easy to test in isolation
// - All state transitions in one place — easier to reason about
// - dispatch is stable (never changes) — safe in dep arrays
```

### Custom hooks

```text
‼️ When to use custom hooks — a practical guideline:

  1. Extract logic out of components
     If a component has useState + useCallback + logic that isn't about
     rendering, pull it into a hook. The component stays focused on JSX.
     Rule of thumb: if you're scrolling past logic to find the return(),
     it's time to extract.

  2. Reuse stateful logic across components
     If two components need the same behavior (e.g., a useLocalStorage hook
     that syncs state to localStorage), write it once and call it in both.
     Regular functions can't hold state; hooks can.

  3. Encapsulate a "concern" — one hook = one responsibility
     As a project grows, each hook manages its own state independently:

       hooks/
       ├── useFileViewer.ts        ← navigation, loading
       ├── useZoom.ts              ← zoom in/out, fit-to-width
       ├── useSearch.ts            ← text search
       └── useKeyboardShortcuts.ts ← keyboard navigation

     The component just combines them:

       function App() {
         const { currentPage, ... } = useFileViewer();
         const { zoomLevel, ... } = useZoom();
         const { searchResults, ... } = useSearch();
         // ...compose in JSX
       }

‼️ When NOT to use a custom hook:

  - Pure computation — if there's no useState/useEffect/useCallback etc.,
    just use a regular function. A hook is only needed when you're wrapping
    React primitives.

  - One-liner state — a single useState inside a component doesn't need
    extraction. It's overhead with no benefit.

  - Premature abstraction — don't create useCounter for a counter that only
    exists in one place. Wait until you see the pattern repeat or the
    component gets too crowded.

The bigger picture — think of it as layers:‼️

  ┌─────────────────────────────┐
  │  Components (JSX / UI)      │  ← what the user sees
  ├─────────────────────────────┤
  │  Custom Hooks (logic)       │  ← how things behave
  ├─────────────────────────────┤
  │  Types + Constants          │  ← shared contracts
  ├─────────────────────────────┤
  │  Data / API                 │  ← where things come from
  └─────────────────────────────┘

  Components call hooks. Hooks manage state and side effects.
  This separation means you can change the UI without touching logic,
  or change logic without touching UI.
  That's what makes a project maintainable as it scales.‼️
```

```ts
// Extract stateful logic — NOT just to organize code, but to REUSE it

function useLocalStorage<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : initial;
        } catch {
            return initial;
        }
    });

    const set = useCallback(
        (newValue: T | ((prev: T) => T)) => {
            setValue(prev => {
                const next = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;
                localStorage.setItem(key, JSON.stringify(next));
                return next;
            });
        },
        [key],
    );

    return [value, set] as const;
}

// useDebounce
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

// useOnClickOutside
function useOnClickOutside(ref: RefObject<HTMLElement>, handler: () => void) {
    useEffect(() => {
        const listener = (e: MouseEvent) => {
            if (!ref.current || ref.current.contains(e.target as Node)) return;
            handler();
        };
        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler]);
}
```

---

## 5. State Management Patterns

### Local vs lifted vs global state

```text
Local state (useState in component):
  Use for: UI state (open/closed, form values, loading) that only THIS component needs
  Don't lift prematurely — keep state as close to where it's used as possible

Lifted state (in common ancestor):
  Use when: two sibling components need the same data
  Pattern: parent owns state, passes down as props + ‼️ setter callbacks

Global state:
  Use when: many components at different levels need the same data
  Options: Context API, Zustand, Redux Toolkit, Jotai

  Rule: don't reach for global state until you feel prop drilling pain
        most apps need less global state than devs think
```

### Zustand (lightweight global state)

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TaskStore = {
  tasks: Task[];
  addTask: (title: string) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
};

const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (title) => set(state => ({
        tasks: [...state.tasks, { id: crypto.randomUUID(), title, done: false }]
      })),
      deleteTask: (id) => set(state => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),
      toggleTask: (id) => set(state => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
      })),
    }),
    { name: 'task-store' } // persists to localStorage
  )
);

// Usage — no Provider needed
function TaskList() {
  const tasks = useTaskStore(state => state.tasks); // ‼️ selector — only re-renders when tasks changes
  const deleteTask = useTaskStore(state => state.deleteTask);
  ...
}
```

---

## 6. Context API

```tsx
// Context for state that many components need, without prop drilling
// Not a replacement for state management — still need useState/useReducer

type ThemeCtx = {
    theme: 'light' | 'dark';
    toggle: () => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const toggle = useCallback(() => setTheme(t => (t === 'light' ? 'dark' : 'light')), []);

    // Memoize the context value — prevents unnecessary re-renders
    const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Custom hook with error boundary
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
    return ctx;
}
```

### Context performance — the re-render problem

```tsx
// ✗ Every consumer re-renders when ANY value in context changes
const UserContext = createContext({ user: null, theme: 'light', sidebar: false });
// If sidebar changes, everything re-renders — even components that only use user

// ‼️ ✓ Split contexts by update frequency
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<Theme>('light');
const SidebarContext = createContext<boolean>(false);
// Now sidebar changes only re-render sidebar consumers

// ✓ Selector pattern with useSyncExternalStore (or Zustand)
// Components subscribe to only the slice of state they need
```

---

## 7. Performance Optimization

### React.memo

```tsx
// Prevents re-render if props haven't changed (shallow comparison)
const TaskItem = React.memo(function TaskItem({ task, onDelete }) {
    console.log('TaskItem render:', task.id);
    return <div>{task.title}</div>;
});

// ‼️ ✗ This defeats memo — new function reference every parent render
<TaskItem task={task} onDelete={id => deleteTask(id)} />;

// ‼️ ✓ Stable function reference with useCallback
const handleDelete = useCallback(id => deleteTask(id), [deleteTask]);
<TaskItem task={task} onDelete={handleDelete} />;

// ‼️ Custom comparison function
const TaskItem = React.memo(TaskItemBase, (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return prevProps.task.id === nextProps.task.id && prevProps.task.done === nextProps.task.done;
});

// When React.memo is worth it:
// - Component renders often
// - Props usually don't change
// - Render is expensive (complex output)
// When it's NOT worth it:
// - Simple components — comparison overhead exceeds render cost
// - Props always change — memo never helps, just adds cost
```

### Code splitting

```tsx
// Lazy load routes and heavy components
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path='/dashboard' element={<Dashboard />} />
                <Route path='/settings' element={<Settings />} />
                <Route path='/reports' element={<Reports />} />
            </Routes>
        </Suspense>
    );
}
// Each page is a separate JS chunk — only downloaded when that route is visited

// Preload before user navigates (on hover over link)
const preloadDashboard = () => import('./Dashboard');
<Link onMouseEnter={preloadDashboard} to='/dashboard'>
    Dashboard
</Link>;
```

### Virtualization for long lists

```jsx
// Rendering 10,000 DOM nodes = slow paint + slow interaction
// Solution: only render items currently visible in the viewport

import { useVirtualizer } from '@tanstack/react-virtual';

function LongList({ items }) {
    const parentRef = useRef(null);
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50, // estimated row height in px
    });

    return (
        <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                {virtualizer.getVirtualItems().map(virtualItem => (
                    <div
                        key={virtualItem.key}
                        style={{
                            position: 'absolute',
                            top: 0,
                            transform: `translateY(${virtualItem.start}px)`,
                            height: `${virtualItem.size}px`,
                        }}
                    >
                        {items[virtualItem.index].name}
                    </div>
                ))}
            </div>
        </div>
    );
}
// Only renders ~10-15 rows at a time regardless of list length
```

### Virtualization with react-window

```tsx
// Alternative virtualization library
import { FixedSizeList as List } from 'react-window';

function VirtualList({ items }) {
    const Row = ({ index, style }) => (
        <div style={style}>
            {' '}
            {/* style contains position — MUST apply */}
            {items[index].name}
        </div>
    );

    return (
        <List
            height={600} // visible area height
            itemCount={items.length}
            itemSize={50} // height of each row
            width='100%'
        >
            {Row}
        </List>
    );
}
// Only ~15 DOM nodes rendered at a time regardless of list size
```

### ‼️ Profiling

```tsx
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
    console.log(`${id} [${phase}]: ${actualDuration.toFixed(2)}ms`);
}

<Profiler id='TaskList' onRender={onRenderCallback}>
    <TaskList />
</Profiler>;

// Chrome DevTools → React DevTools → Profiler tab
// Record → interact → stop → see flame graph
// Look for: unexpectedly deep re-render trees, long render times
```

---

## 8. Patterns & Component Architecture

### ‼️ Compound components

```tsx
// ‼️ Components that share implicit state — like HTML <select>/<option>
// Works via Context without prop drilling
//
// DEFINITION:
// A group of components that work together and share state implicitly.
// They communicate through Context behind the scenes — no prop passing needed.
//
// HTML analogy:
//   <select>           ← owns state (which option is selected)
//     <option>A</option>  ← child, doesn't receive state as prop
//     <option>B</option>  ← just works because it's inside <select>
//   </select>
//
// React version: <Tabs> owns the `active` state, <Tabs.Tab> and <Tabs.Panel>
// read it from Context — no props needed between them.
//
// USE CASES:
//   - Tabs / Accordion   — parent tracks which is open, children just render
//   - Dropdown / Select  — parent tracks open/selected, items just respond
//   - Form               — parent tracks values/errors, fields just connect
//   - Modal              — <Modal>, <Modal.Header>, <Modal.Body> share close state
//
// WHEN TO USE:
//   - Multiple sub-components need to share state
//   - You want clean readable usage at the call site (no prop drilling)
//   - The components only make sense together (Tab without Tabs is meaningless)

const TabContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);

function Tabs({ defaultTab, children }) {
    const [active, setActive] = useState(defaultTab);
    return (
        <TabContext.Provider value={{ active, setActive }}>
            <div>{children}</div>
        </TabContext.Provider>
    );
}

function Tab({ id, children }) {
    const { active, setActive } = useContext(TabContext)!;
    return (
        <button onClick={() => setActive(id)} aria-selected={active === id}>
            {children}
        </button>
    );
}

function TabPanel({ id, children }) {
    const { active } = useContext(TabContext)!;
    return active === id ? <div>{children}</div> : null;
}

Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage — clean, semantic
<Tabs defaultTab='profile'>
    <Tabs.Tab id='profile'>Profile</Tabs.Tab>
    <Tabs.Tab id='settings'>Settings</Tabs.Tab>
    <Tabs.Panel id='profile'>
        <Profile />
    </Tabs.Panel>
    <Tabs.Panel id='settings'>
        <Settings />
    </Tabs.Panel>
</Tabs>;
```

### Render props & children as function

```tsx
// ‼️ Pass render logic as a prop — inversion of control
function DataProvider({ userId, render }) {
    const [data, setData] = useState(null);
    useEffect(() => {
        fetchUser(userId).then(setData);
    }, [userId]);
    return render(data);
}

// It's shorthand. These two are identical:
fetchUser(userId).then(data => setData(data)); // explicit
fetchUser(userId).then(setData); // shorthand
// ‼️ When you write .then(setData), you're passing setData as the callback function directly. .then() calls it with the resolved value as the first argument — which is exactly what data => setData(data) does manually.

// Works because setData is already a function that takes one argument. So you can just hand it over without wrapping it.

<DataProvider userId='123' render={user => <UserCard user={user} />} />;

// ‼️ children as function
// children here is NOT JSX — it's a function. That's the whole trick.
// Toggle calls children(...) and passes { on, toggle } into it.
// The function receives those values, unpacks them, and returns the button JSX.
//
// Toggle owns the state, but YOU decide what to render.
// Toggle doesn't render a button — you do. It just hands you `on` and `toggle` to use however you want.
function Toggle({ children }) {
    const [on, setOn] = useState(false);
    return children({ on, toggle: () => setOn(o => !o) }); // calls children as a function
}

// Breaking down the usage line by line:
// <Toggle>
//     {                                        ← children = this whole function
//         ({ on, toggle }) =>                  ← Toggle calls it with { on, toggle }
//             <button onClick={toggle}>        ← toggle comes from Toggle's state
//                 {on ? 'ON' : 'OFF'}          ← on comes from Toggle's state
//             </button>
//     }
// </Toggle>
<Toggle>{({ on, toggle }) => <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>}</Toggle>;

// Today: custom hooks replaced most render prop use cases
// Render props still useful when you need to control WHERE in JSX data is rendered
```

### Higher-Order Components (HOC)

```tsx
// Wrap a component to add behavior — less common post-hooks, still useful
function withAuth<P extends object>(Component: React.ComponentType<P>) {
    return function AuthenticatedComponent(props: P) {
        const { user } = useAuth();
        if (!user) return <Navigate to='/login' />;
        return <Component {...props} />;
    };
}

const ProtectedDashboard = withAuth(Dashboard);

// ‼️ HOC vs custom hook:
// HOC: when you need to conditionally render, wrap JSX output
// Custom hook: when you just need to share logic/state (usually preferred)
```

### Forwarding refs

```tsx
// ‼️ When parent needs access to a child's DOM node
//
// PROBLEM: normally ref doesn't work on custom components — React swallows it,
// it never reaches the component as a prop:
//   const inputRef = useRef(null);
//   <Input ref={inputRef} />   ← inputRef.current stays null — ref never arrives
//
// forwardRef tells React: "pass the ref through to the DOM node inside."
//
// forwardRef wraps the component and injects ref as a SECOND argument
// (you can't get it from props — React strips it out):
//   function Input({ className, ...props }, ref)
//                   ↑ normal props          ↑ ref comes here as second arg
//
// WHEN YOU NEED THIS:
//   - Parent wants to .focus() an input inside a child
//   - Parent wants to measure a child's DOM size/position
//   - Building a reusable component library where consumers need DOM access

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    //                             ↑ type of ref.current   ↑ type of props
    function Input({ className, ...props }, ref) {
        return <input ref={ref} className={cn('border rounded px-3 py-2', className)} {...props} />;
        //            ↑ ref attached to the real DOM node
    },
);

// Parent
const inputRef = useRef<HTMLInputElement>(null);
<Input ref={inputRef} />;
// inputRef.current is the actual <input> DOM node
// inputRef.current.focus() — works!
```

### ‼️ useImperativeHandle — expose selective API

```tsx
// Don't expose the raw DOM node — expose a controlled interface
//
// PROBLEM with forwardRef alone:
//   parent gets the raw DOM node → can call anything: focus, scrollIntoView, click...
//   useImperativeHandle lets you say: "here's the exact API I allow, nothing else"
//
// useImperativeHandle(ref, () => ({ ... }))
//   - ref     → the ref passed in from parent via forwardRef
//   - factory → returns an object that becomes what ref.current IS in the parent
//
// So instead of parent getting the raw <input> DOM node, they get:
//   inputRef.current.focus()          ✓ allowed — you exposed it
//   inputRef.current.clear()          ✓ allowed — you exposed it
//   inputRef.current.scrollIntoView() ✗ not available — you didn't expose it
//
// forwardRef alone:         ref.current = raw <input> DOM node  ← parent can do anything
// forwardRef + this hook:   ref.current = { focus, clear }      ← parent can only do what you allow
//
// WHEN TO USE:
//   - Building a reusable library component with a clean, stable public API
//   - Parent only needs a few specific actions, not full DOM access
//   - You want to hide internal implementation details
const FancyInput = React.forwardRef((props, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        clear: () => {
            if (inputRef.current) inputRef.current.value = '';
        },
        // NOT exposing the raw input — parent can't call scrollIntoView etc.
    }));

    return <input ref={inputRef} {...props} />;
});
```

---

## 9. Concurrent Mode & Features

### What concurrent mode enables

```text
Before React 18 (legacy mode): rendering is synchronous and uninterruptible.
  A large re-render blocks the main thread until complete.

React 18 concurrent mode: rendering is interruptible.
  React can start rendering, pause it for higher-priority work, and resume.
  Result: the UI stays responsive even during expensive renders.

Key: concurrent mode doesn't change what renders, just WHEN and HOW.
Your components don't need to know about it — React handles it internally.
```

### Automatic batching (React 18)

```jsx
// ‼️ React 18: ALL state updates are batched, even in setTimeout/Promises
// React 17: only batched inside React event handlers

// React 17:
setTimeout(() => {
    setCount(c => c + 1); // triggers re-render
    setFlag(f => !f); // triggers another re-render — 2 total
}, 1000);

// React 18: automatic batching everywhere
setTimeout(() => {
    setCount(c => c + 1);
    setFlag(f => !f); // batched — only 1 re-render
}, 1000);

// React 18 — all three setState calls cause ONE re-render
setTimeout(() => {
    setCount(c => c + 1);
    setFlag(f => !f);
    setData(d => [...d, newItem]);
    // ONE re-render (was THREE re-renders in React 17)
}, 0);

// To opt out of batching (rare):
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1)); // forces immediate re-render
flushSync(() => setFlag(f => !f)); // forces immediate re-render
```

### useTransition & startTransition

```tsx
// ‼️ Mark state updates as non-urgent — React can interrupt them
// Urgent: typing, clicking — must respond immediately
// Transition: filtering 10k items — can be interrupted if user types again

import { useTransition } from 'react';

function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isPending, startTransition] = useTransition();

    function handleSearch(e) {
        // Urgent: update the input value immediately
        setQuery(e.target.value);

        // Non-urgent: filter results can wait
        startTransition(() => {
            setResults(filterResults(e.target.value)); // expensive computation
        });
    }

    return (
        <>
            <input value={query} onChange={handleSearch} />
            {isPending && <Spinner />} {/* show while transition is pending */}
            <ResultList results={results} />
        </>
    );
}
// Input stays responsive while results update.
// If user types faster, React cancels the previous transition and starts a new one.

// startTransition standalone (without isPending):
import { startTransition } from 'react';

function handleInput(e) {
    setQuery(e.target.value); // urgent
    startTransition(() => {
        setResults(filterLargeDataset(e.target.value)); // non-urgent
    });
}
```

### useDeferredValue

```tsx
// ‼️ Defer updating a value — similar to debounce but React-aware
// Use when you don't control the setter (value comes from props)
import { useDeferredValue } from 'react';

function SearchResults({ query }) {
    const deferredQuery = useDeferredValue(query); // lags behind query
    const isStale = deferredQuery !== query;

    const results = useMemo(
        () => expensiveFilter(allItems, deferredQuery),
        [deferredQuery], // only recomputes when deferred value settles
    );

    return (
        <div style={{ opacity: isStale ? 0.5 : 1 }}>
            <List items={results} />
        </div>
    );
}
// The list renders with old results while new ones compute
// Once computed, seamlessly switches — no loading flash for fast queries

// Difference from useTransition:
// useTransition: you control which update is non-urgent (wrap the setter)
// useDeferredValue: you defer the value itself (use when you don't own the setter)
```

### Suspense for data fetching

```tsx
// ‼️ Suspense: show fallback while async content loads
// Works with: React.lazy, use() hook, TanStack Query, SWR

function UserProfile({ userId }) {
  // ‼️ use() hook throws a Promise if data not ready — Suspense catches it
  const user = use(fetchUserPromise(userId));
  return <div>{user.name}</div>;
}

<Suspense fallback={<ProfileSkeleton />}>
  <UserProfile userId="123" />
</Suspense>

// Nested Suspense — granular loading states
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<FeedSkeleton />}>
    <Feed />
  </Suspense>
  <Suspense fallback={<SidebarSkeleton />}>
    <Sidebar />
  </Suspense>
</Suspense>
```

---

## 10. Suspense

### What Suspense does

```jsx
// Suspense lets components "wait" for something before rendering.
// While waiting, React renders a fallback.

import { Suspense, lazy } from 'react';

// Lazy loading (code splitting)
const HeavyChart = lazy(() => import('./HeavyChart'));

function Dashboard() {
    return (
        <Suspense fallback={<Spinner />}>
            <HeavyChart /> {/* loaded lazily — shows Spinner until ready */}
        </Suspense>
    );
}

// Nested Suspense boundaries — each can have its own fallback
function App() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <Header />
            <Suspense fallback={<ChartSkeleton />}>
                <HeavyChart />
            </Suspense>
            <Suspense fallback={<TableSkeleton />}>
                <DataTable />
            </Suspense>
        </Suspense>
    );
}
// If HeavyChart suspends, only ChartSkeleton shows — Header and DataTable unaffected
```

### Suspense with data fetching (React 18 + framework)

```jsx
// Suspense works with frameworks that support it (Next.js App Router, Relay)
// A component "suspends" by throwing a Promise during render
// React catches it, shows fallback, and re-renders when Promise resolves

// Framework-level example (Next.js):
async function UserProfile({ id }) {
    const user = await fetchUser(id); // Server Component — can await directly
    return <div>{user.name}</div>;
}

function Page() {
    return (
        <Suspense fallback={<ProfileSkeleton />}>
            <UserProfile id={userId} />
        </Suspense>
    );
}

// In client components: use TanStack Query or SWR — they integrate with Suspense
import { useSuspenseQuery } from '@tanstack/react-query';

function UserProfile({ id }) {
    const { data: user } = useSuspenseQuery({
        queryKey: ['user', id],
        queryFn: () => fetchUser(id),
    });
    // No loading state needed — Suspense handles it above
    return <div>{user.name}</div>;
}
```

---

## 11. React Server Components

### The mental model

```text
Traditional React: ALL components run on the client (browser)
  - Large JS bundles sent to browser
  - Data fetching requires client → server round trips
  - Sensitive data/logic exposed to browser

React Server Components (RSC): components run on the SERVER
  - Server Component code never ships to the browser (zero bundle impact)
  - Can directly access databases, file system, env vars
  - Rendered output (not the component itself) is sent to client
  - Cannot use useState, useEffect, event handlers (no interactivity)

Hybrid: RSC + Client Components
  - Server Components: data fetching, static content, heavy dependencies
  - Client Components: interactivity, browser APIs, state, effects
```

### Server vs Client Components

```jsx
// Server Component (default in Next.js App Router — no 'use client' directive)
// app/users/page.tsx
async function UsersPage() {
    // ✓ Can await directly — no useEffect needed
    const users = await db.select().from(usersTable);

    // ✓ Access env vars — never exposed to browser
    console.log(process.env.DATABASE_URL); // safe on server

    // ✓ Heavy library — doesn't ship to browser bundle
    import { parseMarkdown } from 'heavy-markdown-library'; // ~100KB saved

    return <UserList users={users} />;
}

// Client Component — must add 'use client' at the top
('use client');
// app/components/UserList.tsx
function UserList({ users }) {
    const [filter, setFilter] = useState(''); // ✓ state allowed here

    return (
        <div>
            <input value={filter} onChange={e => setFilter(e.target.value)} />
            {users
                .filter(u => u.name.includes(filter))
                .map(u => (
                    <UserCard key={u.id} user={u} />
                ))}
        </div>
    );
}

// Rule: push 'use client' as far down the tree as possible
// Keep Server Components for anything that doesn't need interactivity
```

### Serialization boundary

```jsx
// Server → Client boundary: props must be serializable
// ✓ Strings, numbers, arrays, plain objects, Dates
// ✗ Functions, class instances, undefined (in objects), React elements (sometimes)

// ✗ Can't pass a function from Server to Client Component as prop
function ServerComponent() {
    const handleClick = () => console.log('click'); // function
    return <ClientButton onClick={handleClick} />; // ✗ can't serialize
}

// ✓ Event handlers are defined in Client Components
('use client');
function ClientButton() {
    const handleClick = () => console.log('click'); // defined in client
    return <button onClick={handleClick}>Click</button>; // ✓
}
```

---

## 12. Forms

### Controlled vs uncontrolled

```tsx
// Controlled: React state drives the input — good for validation, dynamic UI
function ControlledForm() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const validate = (value: string) => {
        if (!value.includes('@')) return 'Invalid email';
        return '';
    };

    return (
        <input
            value={email}
            onChange={e => {
                setEmail(e.target.value);
                setError(validate(e.target.value));
            }}
        />
    );
}

// Uncontrolled: DOM owns the value — simpler, less re-renders, good for simple forms
function UncontrolledForm() {
    const emailRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(emailRef.current?.value);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input ref={emailRef} defaultValue='' type='email' />
        </form>
    );
}
```

### React Hook Form (production pattern)

```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'user']),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: FormData) => {
        try {
            await login(data);
        } catch (err) {
            setError('email', { message: 'Invalid credentials' });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <input {...register('email')} type='email' />
            {errors.email && <p>{errors.email.message}</p>}

            <input {...register('password')} type='password' />
            {errors.password && <p>{errors.password.message}</p>}

            <button disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button>
        </form>
    );
}
```

---

## 13. Data Fetching Patterns

### Manual fetch with useEffect

```ts
function useUser(id: string) {
    const [state, dispatch] = useReducer(reducer, {
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!id) return;

        dispatch({ type: 'FETCH_START' });
        const controller = new AbortController();

        fetch(`/api/users/${id}`, { signal: controller.signal })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => dispatch({ type: 'FETCH_SUCCESS', payload: data }))
            .catch(err => {
                if (err.name !== 'AbortError') {
                    dispatch({ type: 'FETCH_ERROR', payload: err.message });
                }
            });

        return () => controller.abort();
    }, [id]);

    return state;
}
```

### TanStack Query (production standard)

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ‼️ Query: fetch + cache + background refetch + stale-while-revalidate
function UserProfile({ userId }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['user', userId], // cache key — refetch when this changes
        queryFn: () => fetchUser(userId),
        staleTime: 5 * 60 * 1000, // data is fresh for 5 min — no refetch
        gcTime: 10 * 60 * 1000, // keep in cache 10 min after unmount
        retry: 3, // retry failed requests 3 times
    });

    if (isLoading) return <Skeleton />;
    if (error) return <ErrorState error={error} />;
    return <Profile user={data} />;
}

// ‼️ Mutation: create/update/delete with optimistic updates
function TaskItem({ task }) {
    const queryClient = useQueryClient();

    const { mutate: toggle } = useMutation({
        mutationFn: (id: string) => fetch(`/tasks/${id}/toggle`, { method: 'POST' }),

        // Optimistic update — update UI before server responds
        onMutate: async id => {
            await queryClient.cancelQueries({ queryKey: ['tasks'] });
            const previous = queryClient.getQueryData(['tasks']);

            queryClient.setQueryData(['tasks'], (old: Task[]) => old.map(t => (t.id === id ? { ...t, done: !t.done } : t)));

            return { previous }; // context for rollback
        },

        onError: (err, id, context) => {
            // Rollback on error
            queryClient.setQueryData(['tasks'], context?.previous);
        },

        onSettled: () => {
            // Refetch to sync with server
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
}
```

---

## 14. Error Handling

```tsx
// Error Boundary — class component (no hook equivalent yet)
//
// PURPOSE: catch JS errors anywhere in a component tree and show fallback UI
// instead of crashing the entire app.
//
// Without error boundary:
//   UserProfile throws → entire app crashes → blank white page
//
// With error boundary:
//   UserProfile throws → just that section shows fallback UI → rest of app works fine
//
// How it works:
//   getDerivedStateFromError — catches the error, triggers re-render with fallback UI
//   componentDidCatch       — good place to log to Sentry/Datadog
//
// Strategic placement — wrap each major independent section:
//   <ErrorBoundary fallback={<SidebarError />}>
//       <Sidebar />       ← if this crashes...
//   </ErrorBoundary>
//   <ErrorBoundary fallback={<DashboardError />}>
//       <Dashboard />     ← ...this still works
//   </ErrorBoundary>
//
// ‼️ What it does NOT catch:
//   - Errors in event handlers (use regular try/catch there)
//   - Async errors (inside setTimeout, fetch, etc.)
//   - Errors in the boundary itself
class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { error: Error | null }> {
    state = { error: null };

    static getDerivedStateFromError(error: Error) {
        return { error }; // triggers fallback UI
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Log to Sentry, Datadog, etc.
        reportError(error, info.componentStack);
    }

    render() {
        if (this.state.error) return this.props.fallback;
        return this.props.children;
    }
}

// Reset the boundary (e.g. after navigation)
class ResettableErrorBoundary extends React.Component {
    state = { error: null, key: 0 };

    static getDerivedStateFromError(error) {
        return { error };
    }

    reset = () => this.setState({ error: null, key: k => k + 1 });

    render() {
        if (this.state.error) {
            return <button onClick={this.reset}>Try again</button>;
        }
        return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
    }
}

// Strategic placement — wrap each major section
<ErrorBoundary fallback={<DashboardError />}>
    <Dashboard />
</ErrorBoundary>;
// Errors in Dashboard don't crash the whole app
```

---

## 15. Testing

```tsx
// React Testing Library philosophy:
// ‼️ Test BEHAVIOR, not implementation
// Query DOM the way USERS would (by role, label, text)
// ‼️ Avoid: querying by CSS class, component name, implementation details

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('TaskForm', () => {
    it('adds a task when submitted', async () => {
        const onAdd = vi.fn();
        // vi.fn() creates a mock function from Vitest (like jest.fn() in Jest)
        // It's a fake function that records how it was called:
        //   onAdd.mock.calls          → [['hello']] after calling onAdd('hello')
        //   onAdd.mock.calls.length   → 1
        //   expect(onAdd).toHaveBeenCalledWith({ title: 'Buy milk' })
        // Used here because onAdd is a prop — we don't want the real implementation,
        // we just want to verify the component called it with the right arguments.
        // Jest equivalent is jest.fn() — same idea, different library.
        const user = userEvent.setup(); // more realistic than fireEvent

        render(<TaskForm onAdd={onAdd} />);

        await user.type(screen.getByRole('textbox', { name: /task title/i }), 'Buy milk');
        await user.click(screen.getByRole('button', { name: /add task/i }));

        expect(onAdd).toHaveBeenCalledWith('Buy milk');
        expect(screen.getByRole('textbox')).toHaveValue(''); // form reset
    });

    it('shows error for empty submission', async () => {
        const user = userEvent.setup();
        render(<TaskForm onAdd={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: /add/i }));

        expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
    });
});

// Async state updates
it('loads and displays tasks', async () => {
    vi.mocked(fetchTasks).mockResolvedValue([{ id: '1', title: 'Test task' }]);

    render(<TaskList />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading'); // skeleton/spinner
    await screen.findByText('Test task'); // waits for async state update
    expect(screen.queryByRole('status')).not.toBeInTheDocument(); // loading gone
});

// Querying priority (use higher ones first):
// ‼️ getByRole > getByLabelText > getByPlaceholderText > getByText > getByTestId
```

---

## 16. Frontend Architecture

### What Frontend Architecture Actually Means

## What Frontend Architecture Actually Means

```text
A frontend architecture defines:
  - How code is organised (folder structure, module boundaries)
  - Where state lives and how it flows
  - How data is fetched, cached, and synchronised
  - How the UI is split into components and how they communicate
  - How the app is split into routes and loaded
  - How multiple teams can work without stepping on each other
  - What rendering strategy is used (CSR, SSR, SSG, hybrid)
  - How the app scales without becoming a big ball of mud

Bad architecture:
  - Everything in one giant "components" folder
  - State scattered everywhere (local state, Redux, context, and props all mixed)
  - Components that do too many things (fetch data + render UI + handle business logic)
  - No clear boundaries — any file can import from any file
  - One person's change breaks another person's feature

Good architecture:
  - Clear, predictable structure — new developers find things fast
  - Obvious place for every new piece of code
  - Changes are local — editing one feature doesn't ripple to others
  - State flows in one direction, is easy to trace
  - Performance is built in, not bolted on
```

### Layer-based (bad for large apps)

```text
src/
  components/     # all UI components mixed together
  hooks/          # all hooks mixed together
  utils/          # all utilities mixed together
  services/       # all API calls mixed together
  store/          # all state mixed together

Problem: as the app grows, each folder becomes a dumping ground.
Finding everything related to "checkout" means searching across all folders.
```

### Feature-based (recommended for large apps)

```text
src/
  features/
    auth/
      components/     LoginForm.tsx, SignupModal.tsx
      hooks/          useAuth.ts, useSession.ts
      api/            auth.api.ts (API calls for this feature)
      store/          auth.slice.ts (state for this feature)
      types/          auth.types.ts
      index.ts        public API — what other features can import
    checkout/
      components/
      hooks/
      api/
      store/
      index.ts
    dashboard/
      ...
  shared/             # things used by multiple features
    components/       Button, Input, Modal, Table (design system)
    hooks/            useDebounce, useLocalStorage, useMediaQuery
    utils/            formatDate, formatCurrency, validators
    types/            common types
  app/
    router.tsx        route definitions
    store.ts          root store setup
    App.tsx

Key rule: features can import from shared/, but NOT from each other.
If two features need to share something, move it to shared/.
This enforces clear boundaries between features.
```

### Barrel files (index.ts) — the public API pattern

```typescript
// features/auth/index.ts — the public API of this feature
// Only export what other parts of the app should use
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export type { User, AuthState } from './types/auth.types';

// What's NOT exported (internal implementation details):
// - AuthFormField.tsx (internal component)
// - authHelpers.ts (internal utilities)
// - auth.slice.ts (internal state — exposed via useAuth hook)

// Other features import from the index, not from internals:
// ✓ import { useAuth } from '@/features/auth'
// ✗ import { useAuth } from '@/features/auth/hooks/useAuth' — breaks encapsulation
```

---

## 17. Component Architecture

### The three-layer component model

```text
Page components (route level):
  - One per route
  - Orchestrate data fetching for the page
  - Compose feature components
  - Minimal logic, minimal JSX
  - Example: CheckoutPage.tsx, DashboardPage.tsx

Feature components:
  - Own a section of the UI
  - Can have their own state and data fetching (via hooks)
  - Composed from UI components
  - Example: CartSummary.tsx, UserProfileCard.tsx

UI components (design system):
  - Pure presentational — receive props, render UI
  - No business logic, no data fetching
  - Reusable across the whole app
  - Example: Button, Input, Modal, DataTable
```

```typescript
// Page component — orchestrates, minimal logic
function CheckoutPage() {
  return (
    <div className="checkout-layout">
      <CartSummary />       {/* feature component — has own data fetching */}
      <DeliveryForm />      {/* feature component — has own state */}
      <PaymentSection />    {/* feature component */}
      <OrderSummary />      {/* feature component */}
    </div>
  );
}

// Feature component — owns a section, may fetch data
function CartSummary() {
  const { items, total } = useCart(); // hook owns the data fetching + logic
  return (
    <Card>
      <CardHeader>Your cart ({items.length} items)</CardHeader>
      {items.map(item => (
        <CartItem key={item.id} item={item} /> // UI component
      ))}
      <CartTotal total={total} />              // UI component
    </Card>
  );
}

// UI component — pure, no dependencies on business logic
function CartItem({ item }: { item: CartItemType }) {
  return (
    <div className="cart-item">
      <img src={item.imageUrl} alt={item.name} />
      <span>{item.name}</span>
      <span>{formatCurrency(item.price)}</span>
    </div>
  );
}
```

### Smart vs dumb components (container/presenter pattern)

```typescript
// Smart (container) — knows about data and state
function UserProfileContainer({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useUser(userId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <UserProfile user={user} />;
}

// Dumb (presenter) — pure UI, fully testable in isolation
function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <Avatar src={user.avatar} name={user.name} />
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </div>
  );
}
```

### Compound components pattern

```typescript
// API: <Select> with nested <Select.Option> sub-components
// Better than passing everything as props — more flexible, readable

const SelectContext = React.createContext<SelectContextType | null>(null);

function Select({ value, onChange, children }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  );
}

Select.Option = function Option({ value, children }: OptionProps) {
  const ctx = useContext(SelectContext)!;
  return (
    <div
      className={ctx.value === value ? 'option selected' : 'option'}
      onClick={() => ctx.onChange(value)}
    >
      {children}
    </div>
  );
};

// Usage — clean, flexible
<Select value={selectedRole} onChange={setSelectedRole}>
  <Select.Option value="admin">Admin</Select.Option>
  <Select.Option value="editor">Editor</Select.Option>
  <Select.Option value="viewer">Viewer</Selecct.Option>
</Select>
```

---

## 18. State Architecture

This is the most important architectural decision. The rule: **state should live as close to where it's used as possible, and no higher.**

### The four types of frontend state

```text
1. Server state (remote data)
   - Data that lives on the server and is fetched via API
   - Has a lifecycle: loading, success, error, stale, refetching
   - Examples: user profile, product list, order history
   - Tool: TanStack Query (React Query) or SWR — NOT Redux

2. Global client state (shared UI state)
   - Data that multiple components need but doesn't come from the server
   - Should be minimal — most devs put too much here
   - Examples: auth user object, theme, sidebar open/closed, active modal
   - Tool: Zustand, Jotai, or React Context (for rarely-changing data)

3. URL state (navigation state)
   - State that should be in the URL (so links are shareable)
   - Examples: search query, filters, pagination, sort order, tab selection
   - Tool: router (Next.js, React Router) — use query params
   - Rule: if the user would expect the state to survive a page refresh or be shareable, put it in the URL

4. Local component state
   - State only one component needs
   - Examples: form input values, hover state, dropdown open/closed, validation errors
   - Tool: useState, useReducer (for complex local state)
```

```typescript
// Example: search page state architecture

// URL state — search query, page, filters (shareable link)
// /products?q=shoes&category=running&sort=price&page=2
const [searchParams, setSearchParams] = useSearchParams();
const query = searchParams.get('q') ?? '';
const page = Number(searchParams.get('page') ?? 1);

// Server state — fetched data (TanStack Query)
const { data: products, isLoading } = useQuery({
    queryKey: ['products', query, page],
    queryFn: () => api.products.search({ query, page }),
});

// Global state — auth (Zustand)
const user = useAuthStore(state => state.user);

// Local state — dropdown open/closed
const [filtersOpen, setFiltersOpen] = useState(false);

// NOT in state at all — derived values
const totalPages = Math.ceil((products?.total ?? 0) / PAGE_SIZE);
const hasResults = (products?.items?.length ?? 0) > 0;
```

### TanStack Query (React Query) — server state architecture

```typescript
// The right way to handle server state
// Replaces useEffect + useState for data fetching

// Define queries in a dedicated file — queryKeys pattern
// features/products/api/products.queries.ts
export const productQueries = {
    all: () => ['products'] as const,
    lists: () => [...productQueries.all(), 'list'] as const,
    list: (filters: ProductFilters) => [...productQueries.lists(), filters] as const,
    details: () => [...productQueries.all(), 'detail'] as const,
    detail: (id: string) => [...productQueries.details(), id] as const,
};

// Use in components
function ProductList({ filters }: { filters: ProductFilters }) {
    const { data, isLoading, error } = useQuery({
        queryKey: productQueries.list(filters),
        queryFn: () => api.products.list(filters),
        staleTime: 1000 * 60 * 5, // 5 minutes before refetching
    });
}

// Mutations with cache invalidation
function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.products.delete(id),
        onSuccess: () => {
            // Invalidate the list — will refetch automatically
            queryClient.invalidateQueries({ queryKey: productQueries.lists() });
        },
    });
}
```

---

## 19. Data Fetching Architecture

```text
Anti-pattern: fetch data in a useEffect inside the component
  - Creates request waterfalls (parent fetches, then child fetches)
  - Hard to share data between components
  - Error handling scattered everywhere
  - No caching — refetches on every mount

Pattern: data fetching belongs in the route or in custom hooks

Option A: Route-level fetching (Next.js App Router / React Router loaders)
  - Data is loaded before the component renders
  - No loading spinners for initial page load
  - Better UX for critical data

Option B: Component-level with TanStack Query
  - Data fetching co-located with the component that needs it
  - Automatic caching, deduplication, background refetching
  - Good for data that isn't needed on initial render
```

```typescript
// Next.js App Router — route-level fetching (server component)
// app/products/[id]/page.tsx
async function ProductPage({ params }: { params: { id: string } }) {
  // Fetch on the server — no loading state, no useEffect
  const product = await api.products.getById(params.id);
  return <ProductDetail product={product} />;
}

// React Router v6 — loader pattern
// router.tsx
{
  path: '/products/:id',
  element: <ProductPage />,
  loader: async ({ params }) => {
    return await api.products.getById(params.id);
  },
}

// ProductPage.tsx
function ProductPage() {
  const product = useLoaderData(); // data is already fetched
  return <ProductDetail product={product} />;
}
```

### Avoiding request waterfalls

```typescript
// Waterfall (bad): child can't fetch until parent has rendered
function ParentComponent() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
  if (!user) return <Loading />;
  return <ChildComponent userId={user.id} />;
}

function ChildComponent({ userId }: { userId: string }) {
  // This fetch only starts AFTER the parent fetch completes
  const { data: orders } = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetchOrders(userId),
  });
}

// Parallel (good): both start at the same time
function ParentComponent() {
  // Prefetch or fetch at the same level
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
  const { data: orders } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => fetchOrders(user!.id),
    enabled: !!user?.id, // only run when user is available, but both are registered
  });
}
```

---

## 20. Routing Architecture

```typescript
// Next.js App Router — file-system routing
app / layout.tsx; // root layout (nav, footer)
page.tsx(
    // home page /
    auth,
) / // route group — shared layout, no URL segment
    login /
    page.tsx; // /login
signup / page.tsx; // /signup
dashboard / layout.tsx; // dashboard shell (sidebar)
page.tsx; // /dashboard
settings / page.tsx; // /dashboard/settings
products /
    page.tsx[id] / // /products (list)
    page.tsx; // /products/123 (detail)
loading.tsx; // Suspense boundary for this route
error.tsx; // Error boundary for this route
api / products / route.ts; // /api/products (API route)

// Code splitting is automatic — each page is a separate bundle
// Users only download the code for the route they're on
```

```typescript
// React Router v6 — explicit route tree
// router.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'dashboard',
        element: <DashboardLayout />,
        loader: dashboardLoader,   // prefetch data for the whole dashboard
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'settings', element: <Settings />, loader: settingsLoader },
        ],
      },
      {
        path: 'products',
        children: [
          { index: true, element: <ProductList />, loader: productsLoader },
          { path: ':id', element: <ProductDetail />, loader: productDetailLoader },
        ],
      },
    ],
  },
]);

// Lazy loading routes — only load component bundle when route is first visited
const ProductList = lazy(() => import('./features/products/ProductList'));
```

---

## 21. Rendering Strategy Architecture

```text
CSR (Client-Side Rendering):
  - Browser downloads JS bundle, runs it, renders the page
  - Good for: dashboards, admin tools, apps behind login
  - Bad for: SEO, initial page load performance
  - Example: plain React app (Create React App)

SSR (Server-Side Rendering):
  - Server renders HTML, sends to browser, JS hydrates
  - Good for: SEO, faster initial paint, dynamic content
  - Bad for: server cost, more complex infrastructure
  - Example: Next.js with server components

SSG (Static Site Generation):
  - HTML generated at build time
  - Fastest possible — served from CDN
  - Good for: marketing pages, docs, blogs
  - Bad for: frequently changing data, user-specific content
  - Example: Next.js with generateStaticParams

ISR (Incremental Static Regeneration):
  - Regenerates individual pages on demand or on a schedule
  - Good for: content that changes occasionally
  - Example: Next.js revalidate option

Hybrid (most production apps):
  - Mix strategies per route
  - Marketing pages → SSG
  - Product pages → SSR or ISR
  - Dashboard → CSR or SSR
  - API routes → server
```

```typescript
// Next.js — per-route rendering strategy

// Static (SSG) — build time
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await api.posts.getAll();
  return posts.map(post => ({ slug: post.slug }));
}

// Dynamic (SSR) — every request
export const dynamic = 'force-dynamic'; // opt out of caching

// ISR — regenerate every 60 seconds
export const revalidate = 60;

// Partial prerendering — static shell + dynamic content
// (Next.js 14+)
async function ProductPage({ params }) {
  return (
    <div>
      <StaticProductHeader />  {/* rendered at build time */}
      <Suspense fallback={<PriceSkeleton />}>
        <DynamicPrice productId={params.id} />  {/* rendered per-request */}
      </Suspense>
    </div>
  );
}
```

---

## 22. Monorepo Architecture

For large products with multiple apps or teams.

```text
Turborepo structure:
apps/
  web/          main Next.js app
  admin/        admin dashboard
  docs/         documentation site
  mobile/       React Native app (optional)

packages/
  ui/           shared component library (Button, Input, Modal)
  api-client/   generated API client (from OpenAPI spec)
  config/       shared ESLint, TypeScript, Tailwind configs
  utils/        shared utility functions
  types/        shared TypeScript types

Benefits:
  - Shared code: UI components used by web and admin are in one place
  - Single install: one npm install for everything
  - Coordinated changes: rename a type → all apps caught at once
  - Turborepo caches builds: only rebuild what changed

When to use a monorepo:
  - Multiple apps sharing substantial code
  - Team working across apps simultaneously
  - Shared design system

When NOT to use a monorepo:
  - Single app (adds complexity for no benefit)
  - Teams with very different release cycles
  - Early stage — start simple, migrate later
```

```json
// turbo.json — build pipeline
{
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
        "build": {
            "dependsOn": ["^build"], // build dependencies first
            "outputs": [".next/**", "dist/**"]
        },
        "test": {
            "dependsOn": ["^build"]
        },
        "lint": {},
        "dev": {
            "cache": false,
            "persistent": true
        }
    }
}
```

---

## 23. Module Boundary Rules

In a large codebase, without rules on what can import what, everything becomes interdependent and impossible to refactor.

```text
Import rules (enforce with ESLint eslint-plugin-boundaries):

features/auth     → can import from: shared/, app/
features/checkout → can import from: shared/, app/
features/checkout → CANNOT import from: features/auth (use shared/ if needed)
shared/           → can import from: nothing (no feature dependencies)
app/              → can import from: features/, shared/

Why this matters:
  - Circular dependencies → impossible to tree-shake, hard to test
  - Feature imports → change in auth breaks checkout
  - Uncontrolled deps → refactoring one thing breaks many others
```

```typescript
// .eslintrc — enforce boundaries
{
  "plugins": ["boundaries"],
  "rules": {
    "boundaries/element-types": ["error", {
      "default": "disallow",
      "rules": [
        { "from": "feature", "allow": ["shared", "app"] },
        { "from": "shared",  "allow": [] },
        { "from": "app",     "allow": ["feature", "shared"] },
      ]
    }]
  }
}
```

---

## 24. TanStack Query (React Query)

### The problem it solves

```text
Before React Query: you managed server state manually with useState + useEffect.
  Problems:
    - Loading/error states repeated everywhere
    - No cache — refetch on every mount
    - No background refetching (stale data)
    - Race conditions with useEffect (see JAVASCRIPT-DEEP.md)
    - Manual cache invalidation after mutations

React Query: server state management library.
  It manages the lifecycle of server data: fetching, caching, synchronizing, updating.
  "Server state" = data that lives on the server and changes independently of your app.
  "Client state" = UI state (modal open, selected tab) — use useState or Zustand for this.
```

### Setup

```tsx
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // data is "fresh" for 1 minute — no refetch during this time
            gcTime: 1000 * 60 * 5, // keep unused data in cache for 5 minutes (was cacheTime in v4)
            retry: 2, // retry failed requests twice
            refetchOnWindowFocus: true, // refetch when user returns to tab
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <MyApp />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
```

### useQuery — fetching data

```tsx
import { useQuery } from '@tanstack/react-query';

function TaskList() {
    const {
        data: tasks, // the data (undefined while loading)
        isLoading, // true on first load (no cached data)
        isFetching, // true whenever a request is in-flight (including background refetch)
        isError,
        error,
        refetch, // manually trigger a refetch
    } = useQuery({
        queryKey: ['tasks'], // cache key — must be unique per "query"
        queryFn: () => fetch('/tasks').then(r => r.json()),
    });

    if (isLoading) return <Spinner />;
    if (isError) return <Error message={error.message} />;

    return (
        <div>
            {isFetching && <small>Refreshing...</small>} {/* background refresh indicator */}
            {tasks.map(task => (
                <TaskCard key={task.id} task={task} />
            ))}
        </div>
    );
}

// Query keys with variables — query re-runs when key changes
function TaskDetail({ taskId }: { taskId: string }) {
    const { data: task } = useQuery({
        queryKey: ['tasks', taskId], // unique per taskId
        queryFn: () => fetch(`/tasks/${taskId}`).then(r => r.json()),
        enabled: !!taskId, // don't fetch if taskId is empty/undefined
    });
}

// Query with search params
function SearchResults({ query }: { query: string }) {
    const { data } = useQuery({
        queryKey: ['tasks', 'search', query], // re-fetches when query changes
        queryFn: () => fetch(`/tasks?q=${query}`).then(r => r.json()),
        enabled: query.length > 2, // only search when 3+ chars
        placeholderData: keepPreviousData, // show old results while fetching new (v5)
    });
}
```

### useMutation — creating/updating/deleting

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function TaskForm() {
    const queryClient = useQueryClient();

    const createTask = useMutation({
        mutationFn: (newTask: { title: string }) =>
            fetch('/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask),
            }).then(r => r.json()),

        onSuccess: createdTask => {
            // Option 1: invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            // RQ will refetch any active query matching ['tasks', ...]

            // Option 2: optimistic update — update cache directly (faster UX)
            queryClient.setQueryData(['tasks'], (old: Task[] = []) => [createdTask, ...old]);
        },

        onError: error => {
            toast.error(`Failed to create task: ${error.message}`);
        },
    });

    return (
        <form
            onSubmit={e => {
                e.preventDefault();
                createTask.mutate({ title: e.currentTarget.title.value });
            }}
        >
            <input name='title' />
            <button type='submit' disabled={createTask.isPending}>
                {createTask.isPending ? 'Creating...' : 'Add Task'}
            </button>
        </form>
    );
}
```

### Optimistic updates

```tsx
const deleteTask = useMutation({
    mutationFn: (id: string) => fetch(`/tasks/${id}`, { method: 'DELETE' }),

    // Before the request: optimistically remove from cache
    onMutate: async deletedId => {
        await queryClient.cancelQueries({ queryKey: ['tasks'] }); // cancel in-flight refetches
        const previous = queryClient.getQueryData<Task[]>(['tasks']); // save for rollback

        // Optimistically update UI
        queryClient.setQueryData<Task[]>(['tasks'], old => old?.filter(t => t.id !== deletedId));

        return { previous }; // pass to onError for rollback
    },

    // On failure: roll back to previous data
    onError: (err, deletedId, context) => {
        queryClient.setQueryData(['tasks'], context?.previous);
        toast.error('Failed to delete task');
    },

    // Always: refetch to make sure cache matches server
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
});
```

### Query key conventions

```ts
// Structure keys as arrays — RQ invalidates by prefix matching
['tasks'][('tasks', taskId)][('tasks', 'search', query)][('users', userId, 'tasks')]; // all tasks // specific task // task search results // tasks belonging to a user

// Invalidate everything under ['tasks']:
queryClient.invalidateQueries({ queryKey: ['tasks'] });
// Invalidates: ['tasks'], ['tasks', id], ['tasks', 'search', q], etc.

// The query key is also the cache key — two components with the same key share data
// Task detail shown in sidebar AND main panel → one network request
```

---

## 25. Zustand — Client State

### When to use Zustand (vs useState, vs React Query)

```text
useState:    local UI state — belongs to one component (modal open, form value)
React Query: server state — data from APIs
Zustand:     shared client state — UI state shared across multiple components
             Examples: auth state, sidebar open/closed, selected theme, shopping cart
             notification queue, multi-step form across routes

When NOT to use Zustand:
  - For server data: use React Query
  - For local component state: use useState
  - If only one component needs it: use useState + prop drilling
  - Context + useReducer works fine for simple cases too
```

### Basic setup

```ts
// store/useTaskStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface TaskStore {
    // State
    filter: 'all' | 'open' | 'completed';
    selectedTaskId: string | null;

    // Actions (in Zustand, state + actions live together)
    setFilter: (filter: 'all' | 'open' | 'completed') => void;
    selectTask: (id: string | null) => void;
}

export const useTaskStore = create<TaskStore>()(
    devtools(
        // Redux DevTools support
        persist(
            // persist to localStorage
            set => ({
                filter: 'all',
                selectedTaskId: null,

                setFilter: filter => set({ filter }),
                selectTask: id => set({ selectedTaskId: id }),
            }),
            { name: 'task-store' }, // localStorage key
        ),
    ),
);
```

### Usage in components

```tsx
// Select only the slice you need — prevents unnecessary re-renders
function FilterBar() {
    const filter = useTaskStore(state => state.filter);
    const setFilter = useTaskStore(state => state.setFilter);

    return (
        <div>
            {['all', 'open', 'completed'].map(f => (
                <button key={f} onClick={() => setFilter(f as any)} className={filter === f ? 'active' : ''}>
                    {f}
                </button>
            ))}
        </div>
    );
}

function TaskList() {
    const filter = useTaskStore(state => state.filter);
    const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });

    const filtered = useMemo(
        () =>
            tasks?.filter(t => {
                if (filter === 'all') return true;
                if (filter === 'open') return !t.completed;
                return t.completed;
            }) ?? [],
        [tasks, filter],
    );

    return (
        <ul>
            {filtered.map(t => (
                <li key={t.id}>{t.title}</li>
            ))}
        </ul>
    );
}
```

### Async actions and slices

```ts
// Slice pattern: split large stores into logical slices
interface AuthSlice {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

interface UISlice {
    sidebarOpen: boolean;
    toggleSidebar: () => void;
}

// Combine slices
type AppStore = AuthSlice & UISlice;

export const useAppStore = create<AppStore>()(
    devtools((set, get) => ({
        // Auth slice
        user: null,
        isLoading: false,

        login: async (email, password) => {
            set({ isLoading: true });
            try {
                const user = await authService.login(email, password);
                set({ user, isLoading: false });
            } catch (err) {
                set({ isLoading: false });
                throw err;
            }
        },

        logout: () => {
            authService.clearToken();
            set({ user: null });
        },

        // UI slice
        sidebarOpen: true,
        toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
    })),
);

// Access anywhere — no Provider needed (unlike Context)
const { user, login } = useAppStore(state => ({ user: state.user, login: state.login }));
```

---

## 26. React Hook Form

### Why not use controlled inputs everywhere?

```text
Controlled inputs (useState):
  - Every keystroke triggers a re-render
  - Fine for simple forms (1-3 fields)
  - Slow for large forms (20+ fields)

React Hook Form:
  - Uncontrolled by default (DOM manages values, RHF reads via ref)
  - Renders only the field that changed + submit/error states
  - Significantly faster for large forms
  - Built-in validation + error handling
  - Easy integration with Zod/Yup
```

### Basic usage

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
    title: z.string().min(1, 'Title is required').max(100),
    priority: z.enum(['low', 'medium', 'high']),
    dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function TaskForm({ onSubmit }: { onSubmit: (data: FormValues) => Promise<void> }) {
    const {
        register, // connect input to form
        handleSubmit, // wraps your submit handler
        formState: { errors, isSubmitting, isDirty }, // form state
        reset, // reset to defaults
        watch, // watch a field's value
        setValue, // programmatically set a value
    } = useForm<FormValues>({
        resolver: zodResolver(schema), // Zod validates on submit (and optionally on change)
        defaultValues: { title: '', priority: 'medium' },
    });

    const title = watch('title'); // reactive — causes re-render on change

    return (
        <form
            onSubmit={handleSubmit(async data => {
                await onSubmit(data);
                reset(); // clear form after successful submit
            })}
        >
            <div>
                <label htmlFor='title'>Title</label>
                <input
                    id='title'
                    {...register('title')} // spreads name, ref, onChange, onBlur
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? 'title-error' : undefined}
                />
                {errors.title && (
                    <p id='title-error' role='alert'>
                        {errors.title.message}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor='priority'>Priority</label>
                <select id='priority' {...register('priority')}>
                    <option value='low'>Low</option>
                    <option value='medium'>Medium</option>
                    <option value='high'>High</option>
                </select>
            </div>

            <button type='submit' disabled={isSubmitting || !isDirty}>
                {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
        </form>
    );
}
```

### Controller (for third-party inputs)

```tsx
import { Controller } from 'react-hook-form';

// For components that don't accept ref (UI libraries, custom components)
function TaskForm() {
    const { control } = useForm<FormValues>();

    return (
        <Controller
            control={control}
            name='priority'
            render={({ field, fieldState }) => (
                <Select // shadcn/ui Select (not a native <select>)
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-invalid={!!fieldState.error}
                >
                    <SelectTrigger>
                        <SelectValue placeholder='Priority' />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='low'>Low</SelectItem>
                        <SelectItem value='medium'>Medium</SelectItem>
                        <SelectItem value='high'>High</SelectItem>
                    </SelectContent>
                </Select>
            )}
        />
    );
}
```

### Dynamic fields (useFieldArray)

```tsx
import { useFieldArray } from 'react-hook-form';

function TaskForm() {
    const { register, control } = useForm<{ subtasks: { title: string }[] }>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'subtasks',
    });

    return (
        <div>
            {fields.map((field, index) => (
                <div key={field.id}>
                    {' '}
                    {/* use field.id, not index */}
                    <input {...register(`subtasks.${index}.title`)} />
                    <button type='button' onClick={() => remove(index)}>
                        Remove
                    </button>
                </div>
            ))}
            <button type='button' onClick={() => append({ title: '' })}>
                Add subtask
            </button>
        </div>
    );
}
```

---

## 27. React Router v6

### Setup

```tsx
// main.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />, // wrapper with nav, header, etc.
        errorElement: <ErrorPage />, // handles thrown errors and 404s
        children: [
            { index: true, element: <HomePage /> }, // path: "/"
            { path: 'tasks', element: <TaskListPage /> }, // path: "/tasks"
            { path: 'tasks/:id', element: <TaskPage /> }, // path: "/tasks/123"
            {
                path: 'admin',
                element: <AdminGuard />, // auth check wrapper
                children: [
                    { path: 'users', element: <UsersPage /> }, // path: "/admin/users"
                ],
            },
        ],
    },
]);

function App() {
    return <RouterProvider router={router} />;
}
```

### Hooks

```tsx
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';

function TaskPage() {
    const { id } = useParams<{ id: string }>(); // URL params (:id)
    const navigate = useNavigate(); // programmatic navigation
    const location = useLocation(); // current URL info
    const [searchParams, setSearchParams] = useSearchParams(); // query string

    const filter = searchParams.get('filter') ?? 'all';

    function handleClose() {
        navigate(-1); // go back
        navigate('/tasks'); // go to specific route
        navigate('/tasks', { replace: true }); // replace (no back button entry)
        navigate('/tasks', { state: { from: 'detail' } }); // pass state (accessible via location.state)
    }

    function setFilter(f: string) {
        setSearchParams({ filter: f }); // updates URL: /tasks?filter=open
    }

    return (
        <div>
            Task {id} — filter: {filter}
        </div>
    );
}
```

### Layout with Outlet

```tsx
// RootLayout.tsx — wraps all child routes
function RootLayout() {
    return (
        <div>
            <Header />
            <nav>
                <NavLink to='/' className={({ isActive }) => (isActive ? 'active' : '')}>
                    Home
                </NavLink>
                <NavLink to='/tasks' className={({ isActive }) => (isActive ? 'active' : '')}>
                    Tasks
                </NavLink>
            </nav>
            <main>
                <Outlet /> {/* child route renders here */}
            </main>
            <Footer />
        </div>
    );
}
```

### Data loading with loaders

```tsx
// Route loaders: fetch data BEFORE rendering the component
// Data is available immediately — no loading spinner needed for initial data

const router = createBrowserRouter([
    {
        path: 'tasks/:id',
        element: <TaskPage />,
        loader: async ({ params }) => {
            const task = await fetch(`/api/tasks/${params.id}`).then(r => {
                if (!r.ok) throw new Response('Not Found', { status: 404 });
                return r.json();
            });
            return task; // available via useLoaderData()
        },
        errorElement: <TaskError />,
    },
]);

function TaskPage() {
    const task = useLoaderData() as Task; // pre-loaded, no useState/useEffect needed
    return <div>{task.title}</div>;
}

// Route actions: handle form submissions
const router = createBrowserRouter([
    {
        path: 'tasks/new',
        element: <NewTaskPage />,
        action: async ({ request }) => {
            const formData = await request.formData();
            const title = formData.get('title') as string;
            const task = await createTask({ title });
            return redirect(`/tasks/${task.id}`);
        },
    },
]);

// Form that uses the action:
import { Form } from 'react-router-dom';
function NewTaskPage() {
    return (
        <Form method='post'>
            {' '}
            {/* submits to the route's action */}
            <input name='title' />
            <button type='submit'>Create</button>
        </Form>
    );
}
```

### Protected routes

```tsx
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAppStore(s => s);
  const location = useLocation();

  if (!user) {
    // Redirect to login, save current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// In router:
{
  path: 'dashboard',
  element: <AuthGuard><DashboardPage /></AuthGuard>,
}

// After login: redirect back to original destination
function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from?.pathname ?? '/dashboard';

  async function handleLogin(credentials) {
    await login(credentials);
    navigate(from, { replace: true }); // go back to where they came from
  }
}
```

---

## 28. Choosing the Right Tool

```text
Problem                               Solution
─────────────────────────────────────────────────────────────────────────
Fetch and cache API data              TanStack Query (useQuery)
Update server data                    TanStack Query (useMutation)
Shared UI state (auth, theme, cart)   Zustand
Local component state                 useState
Form with validation                  React Hook Form + Zod
Simple form (2-3 fields)              Controlled inputs + useState
Client-side routing                   React Router v6
Complex routing with data loading     React Router v6 loaders
Deep state management (complex flows) Zustand slices OR useReducer

What NOT to use:
  Redux: overkill for most apps (boilerplate > benefit). Use if team already knows it.
  MobX: valid but less common in new projects.
  React Context for server data: causes too many re-renders, no caching.
  Custom useEffect fetch: use React Query — it handles all the edge cases.
```

---

# Part 2 — Day-to-Day Senior Engineering

---

## 29. Next.js (App Router)

### App Router vs Pages Router

```text
‼️ Next.js has TWO routing systems:
  Pages Router (pages/) — the original, stable since Next 9
  App Router (app/)     — introduced in Next 13, stable in Next 13.4+

Pages Router:
  - File = route: pages/about.tsx → /about
  - getServerSideProps / getStaticProps for data fetching
  - _app.tsx for global layout, _document.tsx for HTML shell
  - All components are client components by default‼️
  - Simpler mental model but less flexible

App Router:
  - File conventions: layout.tsx, page.tsx, loading.tsx, error.tsx, not-found.tsx
  - ‼️ Server Components by default (no useState/useEffect unless 'use client')
  - Nested layouts that persist across navigations
  - Streaming + Suspense built in
  - Server Actions for mutations
  - Parallel and Intercepting Routes
  - More powerful but steeper learning curve

When to pick which:
  - New projects → App Router (it's the future, Pages Router is in maintenance mode)
  - Existing Pages Router app → migrate incrementally (both can coexist)
  - Simple marketing site → App Router with static generation
  - Complex SPA with no SEO needs → consider plain React + Vite instead
```

### Server Components vs Client Components

```text
Server Components (default in App Router):
  - Run ONLY on the server — never shipped to the browser‼️
  - Can directly access databases, file system, env secrets‼️
  - Cannot use useState, useEffect, onClick, or any browser API‼️
  - Zero JS sent to client for that component
  - Can import Client Components but NOT vice versa‼️

‼️ Client Components ('use client' directive at top of file):
  - Run on server for initial HTML (SSR) AND on client for interactivity‼️
  - Can use hooks, event handlers, browser APIs
  - The JS bundle IS shipped to the browser
  - 'use client' marks the BOUNDARY — everything imported by that file
    becomes part of the client bundle

Common mistake:
  Marking every component as 'use client' — defeats the purpose.
  Only mark the leaf components that NEED interactivity.‼️

‼️ The "client boundary" rule:
  Server Component → can render Client Component (pass as children or import)
  Client Component → CANNOT import Server Component directly
  Client Component → CAN receive Server Component as children prop‼️

  // This WORKS — Server Component passes Server Component as children to Client
  // layout.tsx (server)
  <ClientSidebar>
    <ServerNav />  {/* passed as children — stays on server */}‼️
  </ClientSidebar>
```

```tsx
// ‼️ Server Component — default, no directive needed
// app/users/page.tsx
import { db } from '@/lib/db';

export default async function UsersPage() {
    // Direct database access — this code never reaches the browser‼️
    const users = await db.user.findMany();

    return (
        <div>
            <h1>Users</h1>
            {users.map(user => (
                <UserCard key={user.id} user={user} />
            ))}
        </div>
    );
}

// ‼️ Client Component — needs the directive
// components/LikeButton.tsx
('use client');

import { useState } from 'react';

export function LikeButton({ postId }: { postId: string }) {
    const [liked, setLiked] = useState(false);

    return <button onClick={() => setLiked(!liked)}>{liked ? '❤️' : '🤍'}</button>;
}
```

### File-Based Routing Conventions

```text
app/
  layout.tsx      — ‼️ Root layout (REQUIRED, wraps entire app, includes <html> and <body>)
  page.tsx        — Home page (/)
  loading.tsx     — Loading UI (auto-wrapped in Suspense boundary)‼️
  error.tsx       — Error UI (auto-wrapped in ErrorBoundary, must be 'use client')‼️
  not-found.tsx   — 404 UI (triggered by notFound() function)
  global-error.tsx — Error UI for root layout errors (must be 'use client')

  dashboard/
    layout.tsx    — Dashboard layout (persists across sub-navigations, NOT remounted)
    page.tsx      — /dashboard
    loading.tsx   — Loading state for /dashboard

    settings/
      page.tsx    — /dashboard/settings

  blog/
    [slug]/
      page.tsx    — /blog/my-post (dynamic segment)

  shop/
    [...slug]/
      page.tsx    — /shop/a/b/c (catch-all segment)‼️

  (marketing)/    — ‼️ Route group — parentheses = no URL segment
    about/
      page.tsx    — /about (NOT /marketing/about)
    pricing/
      page.tsx    — /pricing

‼️ Layout behavior:
  - Layouts DON'T remount when navigating between their children‼️
  - State in layouts is preserved
  - Each route segment can have its own layout
  - Layouts receive { children } and render children inside themselves
```

```tsx
// app/layout.tsx — Root layout (required)
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'My App',
    description: 'Built with Next.js',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en'>
            <body className={inter.className}>{children}</body>
        </html>
    );
}

// app/dashboard/layout.tsx — Nested layout
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className='flex'>
            <Sidebar />
            <main className='flex-1'>{children}</main>
        </div>
    );
}

// app/dashboard/error.tsx — must be 'use client'
('use client');

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div>
            <h2>Something went wrong!</h2>
            <p>{error.message}</p>
            <button onClick={() => reset()}>Try again</button>
        </div>
    );
}
```

### Data Fetching in Server Components

```text
‼️ In App Router, data fetching is done with async/await directly in Server Components.
  No more getServerSideProps or getStaticProps.

fetch() in server components has EXTENDED options:‼️
  - cache: 'force-cache'  → static (like getStaticProps) — DEFAULT
  - cache: 'no-store'     → dynamic (like getServerSideProps)
  - next: { revalidate: 60 }  → ISR (revalidate every 60 seconds)
  - next: { tags: ['posts'] } → on-demand revalidation with revalidateTag('posts')

‼️ Request deduplication:
  If multiple components fetch the same URL with the same options,
  Next.js deduplicates them into ONE request automatically.
  This means you can fetch in each component that needs data
  without worrying about duplicate requests.

‼️ Caching layers (Next.js has FOUR):
  1. Request Memoization — dedupes same fetch in same render pass
  2. Data Cache — persists fetch results across requests (on server)
  3. Full Route Cache — caches rendered HTML + RSC payload at build time
  4. Router Cache — client-side cache of visited routes (in browser)
```

```tsx
// Static data — cached forever until redeployed (default)
async function getProducts() {
    const res = await fetch('https://api.example.com/products');
    // cache: 'force-cache' is the default
    return res.json();
}

// Dynamic data — never cached, fresh every request
async function getCart() {
    const res = await fetch('https://api.example.com/cart', {
        cache: 'no-store',
    });
    return res.json();
}

// ISR — cached but revalidated every 60 seconds
async function getPosts() {
    const res = await fetch('https://api.example.com/posts', {
        next: { revalidate: 60 },
    });
    return res.json();
}

// On-demand revalidation — tag-based
async function getBlogPosts() {
    const res = await fetch('https://api.example.com/posts', {
        next: { tags: ['posts'] },
    });
    return res.json();
}

// Then in a Server Action or Route Handler:
// import { revalidateTag } from 'next/cache'
// revalidateTag('posts')  // invalidates all fetches tagged with 'posts'
```

### Server Actions

```text
‼️ Server Actions = functions that run on the server, called from client or server components.
  Replaces API routes for mutations in many cases.

Rules:
  - Defined with 'use server' directive (at function level or file level)
  - Can be passed to form action prop or called directly
  - Always receive FormData as argument when used in forms
  - Can be used for database writes, sending emails, revalidation
  - Automatically integrate with Next.js caching (revalidatePath, revalidateTag)
  - ‼️ They POST under the hood — the function body NEVER reaches the client
```

```tsx
// app/actions.ts — file-level 'use server' makes ALL exports server actions
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { z } from 'zod';

const CreatePostSchema = z.object({
    title: z.string().min(1).max(100),
    content: z.string().min(1),
});

// ‼️ Server Action — runs on server, callable from client
export async function createPost(formData: FormData) {
    const parsed = CreatePostSchema.safeParse({
        title: formData.get('title'),
        content: formData.get('content'),
    });

    if (!parsed.success) {
        return { error: parsed.error.flatten().fieldErrors };
    }

    await db.post.create({ data: parsed.data });

    revalidatePath('/posts'); // bust the cache for /posts
    redirect('/posts'); // redirect after mutation
}

// app/posts/new/page.tsx — using the action
import { createPost } from '@/app/actions';

export default function NewPostPage() {
    return (
        <form action={createPost}>
            <input name='title' placeholder='Title' required />
            <textarea name='content' placeholder='Content' required />
            <button type='submit'>Create Post</button>
        </form>
    );
}

// ‼️ Using Server Actions from Client Components with useFormState + useFormStatus
('use client');
import { useFormState, useFormStatus } from 'react-dom';
import { createPost } from '@/app/actions';

function SubmitButton() {
    const { pending } = useFormStatus(); // ‼️ must be inside the <form>
    return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>;
}

export function PostForm() {
    const [state, formAction] = useFormState(createPost, null);

    return (
        <form action={formAction}>
            <input name='title' />
            {state?.error?.title && <p className='error'>{state.error.title}</p>}
            <textarea name='content' />
            <SubmitButton />
        </form>
    );
}
```

### Middleware

```text
‼️ middleware.ts lives at the ROOT of the project (same level as app/).
  Runs BEFORE every matched request (before rendering, before data fetching).‼️

Common uses:
  - Authentication checks (redirect if not logged in)
  - Geolocation-based redirects
  - A/B testing (rewrite to different page variant)‼️
  - Rate limiting headers
  - Internationalization (redirect to locale-prefixed path)

Limitations:‼️
  - Runs on the Edge Runtime (limited Node.js APIs — no fs, no native modules)
  - Must return a NextResponse (or NextResponse.next() to continue)
  - Cannot access database directly (use lightweight checks like JWT verification)
```

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('session')?.value;

    // ‼️ Protect dashboard routes
    if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Add custom header
    const response = NextResponse.next();
    response.headers.set('x-custom-header', 'hello');
    return response;
}

// ‼️ Matcher — only run middleware on these paths (improves performance)
export const config = {
    matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

### ISR (Incremental Static Regeneration)

```text
‼️ ISR = static pages that re-generate in the background after a time interval.
  Best of both worlds: speed of static + freshness of dynamic.‼️

How it works:
  1. Page is statically generated at build time
  2. After `revalidate` seconds, next request STILL gets stale page (fast)
  3. Next.js regenerates the page in the background
  4. Subsequent requests get the fresh page

In App Router:
  - Time-based: fetch(..., { next: { revalidate: 60 } })
  - On-demand: revalidateTag('products') or revalidatePath('/products')

‼️ On-demand revalidation is usually better than time-based:
  - Time-based: page could be stale for up to `revalidate` seconds
  - On-demand: immediately fresh when you know data changed (e.g., after a CMS publish)
```

```tsx
// On-demand ISR via Route Handler
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const { tag, secret } = await request.json();

    // ‼️ Protect the endpoint with a secret
    if (secret !== process.env.REVALIDATION_SECRET) {
        return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    revalidateTag(tag);
    return NextResponse.json({ revalidated: true });
}
```

### Image, Font, and Script Optimization

```tsx
// ‼️ next/image — automatic optimization (WebP/AVIF, lazy loading, responsive)
import Image from 'next/image'

// Local image — dimensions inferred automatically
import heroImage from '@/public/hero.jpg'
<Image src={heroImage} alt="Hero" placeholder="blur" />

// Remote image — must specify dimensions (or use fill)‼️
<Image
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  priority  // ‼️ Use for above-the-fold images (disables lazy loading)
/>

// Fill mode — fills parent container (parent must have position: relative)
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
  <Image src="/banner.jpg" alt="Banner" fill style={{ objectFit: 'cover' }} />
</div>

// ‼️ next/font — zero layout shift, self-hosted, no external requests
import { Inter, Roboto_Mono } from 'next/font/google'
import localFont from 'next/font/local'

const inter = Inter({ subsets: ['latin'], display: 'swap' })
const mono = Roboto_Mono({ subsets: ['latin'], variable: '--font-mono' })
const myFont = localFont({ src: './MyFont.woff2' })

// Apply in layout: <body className={inter.className}>
// Or use CSS variable: <body className={mono.variable}>
//   then in CSS: font-family: var(--font-mono);

// ‼️ next/script — control when third-party scripts load
import Script from 'next/script'

// afterInteractive (default) — loads after page is interactive
<Script src="https://analytics.example.com/script.js" />

// lazyOnload — loads during idle time
<Script src="https://widget.example.com/embed.js" strategy="lazyOnload" />

// beforeInteractive — loads before page hydrates (use sparingly)
<Script src="/polyfill.js" strategy="beforeInteractive" />
```

### Parallel Routes and Intercepting Routes

```text
‼️ Parallel Routes — render multiple pages in the same layout simultaneously.
  Use case: dashboards with independent panels, modals, conditional slots.

Convention: @slotName folder
  app/
    layout.tsx           — receives { children, team, analytics } as props
    page.tsx
    @team/
      page.tsx           — renders in the "team" slot
    @analytics/
      page.tsx           — renders in the "analytics" slot

‼️ Intercepting Routes — intercept a route to show it in a different context.
  Use case: clicking a photo opens a modal, but direct URL loads full page.

Convention: (..)routeName
  app/
    feed/
      page.tsx           — shows feed with photo thumbnails
      (..)photo/[id]/    — ‼️ intercepts /photo/[id] to show as modal
        page.tsx
    photo/[id]/
      page.tsx           — full page view when navigated directly

  (.) — intercept same level
  (..) — intercept one level up
  (..)(..) — intercept two levels up
  (...) — intercept from root
```

```tsx
// Parallel Routes example
// app/layout.tsx
export default function DashboardLayout({ children, team, analytics }: { children: React.ReactNode; team: React.ReactNode; analytics: React.ReactNode }) {
    return (
        <div>
            {children}
            <div className='grid grid-cols-2'>
                {team}
                {analytics}
            </div>
        </div>
    );
}
```

### Route Handlers (API Routes)

```tsx
// ‼️ app/api/users/route.ts — replaces pages/api/users.ts
import { NextRequest, NextResponse } from 'next/server';

// GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    const users = await db.user.findMany({
        where: query ? { name: { contains: query } } : undefined,
    });

    return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const user = await db.user.create({ data: body });
    return NextResponse.json(user, { status: 201 });
}

// Dynamic route handler: app/api/users/[id]/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const user = await db.user.findUnique({ where: { id: params.id } });
    if (!user) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(user);
}
```

### Environment Variables

```text
‼️ Next.js env variable rules:
  .env.local         — local overrides (gitignored)‼️
  .env.development   — dev defaults
  .env.production    — prod defaults
  .env               — all environments

‼️ NEXT_PUBLIC_ prefix = exposed to the browser
  NEXT_PUBLIC_API_URL → accessible in client components
  DATABASE_URL        → server only (not in browser bundle)

Load order (later overrides earlier):‼️
  .env → .env.local → .env.development/.env.production

‼️ Common mistake: putting secrets in NEXT_PUBLIC_ variables
  NEXT_PUBLIC_STRIPE_SECRET_KEY — NEVER DO THIS
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — this is fine (publishable = meant to be public)
```

### Deployment: Vercel vs Self-Hosted

```text
Vercel:
  - Zero-config deployment (git push → deployed)
  - Edge Functions, ISR, image optimization all work out of the box
  - Preview deployments per PR
  - Expensive at scale (usage-based pricing)
  - Vendor lock-in for some features (Edge Runtime specifics)

Self-hosted (Docker, AWS, etc.):
  - `next build` → `next start` (runs a Node.js server)
  - Need to handle image optimization yourself (or use a CDN like Cloudflare)
  - ISR works with `next start` but not with `next export`
  - More control, potentially cheaper at scale
  - More ops burden

‼️ `output: 'standalone'` in next.config.js — creates a minimal production build
  for Docker deployments (includes only necessary node_modules).
```

### When to Use Next.js vs Plain React (SPA)

```text
‼️ Use Next.js when:
  - SEO matters (marketing, blog, e-commerce)
  - You need SSR or static generation
  - You want file-based routing out of the box
  - You need API routes / Server Actions in the same repo
  - You want image/font optimization
  - You want incremental adoption of Server Components

‼️ Use plain React + Vite when:
  - Purely internal tool / admin panel (no SEO)
  - Behind authentication (search engines can't see it anyway)
  - You need maximum control over build setup
  - Team is not familiar with SSR complexities
  - You want simpler mental model (everything is client)
  - Deployed as a static SPA behind a CDN
```

---

## 30. TypeScript + React Advanced Patterns

### Generic Components

```tsx
// ‼️ Generic component — the list works with ANY item type
type ListProps<T> = {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    keyExtractor: (item: T) => string;
};

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
    return (
        <ul>
            {items.map(item => (
                <li key={keyExtractor(item)}>{renderItem(item)}</li>
            ))}
        </ul>
    );
}

// Usage — TypeScript infers T from the items prop
<List
    items={users} // T = User
    renderItem={user => <span>{user.name}</span>}
    keyExtractor={user => user.id}
/>;

// ‼️ Generic component with forwardRef (tricky — forwardRef loses generics)
// Solution: type assertion or wrapper
const SelectInner = <T extends string | number>(props: SelectProps<T> & { ref?: React.Ref<HTMLSelectElement> }) => {
    /* ... */
};

// Or use the newer ref-as-prop pattern (React 19):
function Select<T extends string | number>({ ref, ...props }: SelectProps<T> & { ref?: React.Ref<HTMLSelectElement> }) {
    return <select ref={ref} />;
}
```

### Discriminated Unions for Props

```tsx
// ‼️ Discriminated unions — different props based on a "type" field
// Much better than optional props + runtime checks

type ButtonProps = { variant: 'primary'; onClick: () => void; href?: never } | { variant: 'link'; href: string; onClick?: never };

function Button(props: ButtonProps) {
    if (props.variant === 'link') {
        return <a href={props.href}>{/* ... */}</a>; // TypeScript knows href exists
    }
    return <button onClick={props.onClick}>{/* ... */}</button>;
}

// ‼️ Status-based discriminated union
type AsyncState<T> = { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error };

function UserProfile({ state }: { state: AsyncState<User> }) {
    switch (state.status) {
        case 'idle':
            return null;
        case 'loading':
            return <Spinner />;
        case 'success':
            return <div>{state.data.name}</div>; // TS knows data exists
        case 'error':
            return <div>{state.error.message}</div>; // TS knows error exists
    }
}
```

### Polymorphic Components (the "as" Prop)

```tsx
// ‼️ Polymorphic component — renders as different HTML elements
// The component's props change based on what element it renders as

type PolymorphicProps<E extends React.ElementType> = {
  as?: E
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'children'>

function Box<E extends React.ElementType = 'div'>({
  as,
  children,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || 'div'
  return <Component {...props}>{children}</Component>
}

// Usage:
<Box>div by default</Box>
<Box as="section" id="hero">renders as section</Box>
<Box as="a" href="/about">renders as anchor with href prop available</Box>
// <Box as="a" onClick={...} /> — TypeScript knows anchor + click props are valid
```

### Type-Safe Event Handlers

```tsx
// ‼️ Typing event handlers explicitly

// Form events
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
};

// Change events — the generic is the ELEMENT type, not the value type
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value); // string
};

const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(e.target.value);
};

// Keyboard events
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        /* ... */
    }
};

// Mouse events
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log(e.clientX, e.clientY);
};

// ‼️ Inline handlers get inferred automatically — no need to type them
<input onChange={e => console.log(e.target.value)} />; // e is inferred
```

### Typing forwardRef

```tsx
// ‼️ forwardRef typing
import { forwardRef } from 'react';

type InputProps = {
    label: string;
    error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'label'>;

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, ...props }, ref) => {
    return (
        <div>
            <label>{label}</label>
            <input ref={ref} {...props} />
            {error && <span className='error'>{error}</span>}
        </div>
    );
});

Input.displayName = 'Input'; // ‼️ Always set for DevTools with forwardRef

// ‼️ React 19 alternative — ref is just a regular prop, no forwardRef needed
function Input({ label, error, ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
    return (
        <div>
            <label>{label}</label>
            <input ref={ref} {...props} />
            {error && <span className='error'>{error}</span>}
        </div>
    );
}
```

### Typing Custom Hooks — Return Tuples vs Objects

```tsx
// ‼️ Return OBJECT when there are many values (destructure by name)
function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const login = async (credentials: Credentials) => {
        /* ... */
    };
    const logout = async () => {
        /* ... */
    };

    return { user, loading, login, logout }; // object — callers pick what they need
}

// ‼️ Return TUPLE when mimicking useState pattern (2-3 values)
function useToggle(initial = false): [boolean, () => void] {
    const [value, setValue] = useState(initial);
    const toggle = useCallback(() => setValue(v => !v), []);
    return [value, toggle]; // tuple — positional, can rename easily
}

// ‼️ as const for tuple return type inference
function useToggle(initial = false) {
    const [value, setValue] = useState(initial);
    const toggle = useCallback(() => setValue(v => !v), []);
    return [value, toggle] as const;
    // Without 'as const': type is (boolean | () => void)[]
    // With 'as const': type is readonly [boolean, () => void]  ← correct!
}
```

### Utility Types for React

```tsx
// ‼️ ComponentProps — extract props from a component
import { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'>; // HTML button props
type MyBtnProps = ComponentProps<typeof Button>; // custom component props

// ‼️ PropsWithChildren — adds children?: ReactNode
import { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
    title: string;
    variant?: 'default' | 'outlined';
}>;

// ‼️ HTMLAttributes — base props for any HTML element
type DivProps = React.HTMLAttributes<HTMLDivElement>;

// ‼️ ComponentPropsWithRef / ComponentPropsWithoutRef
type InputPropsWithRef = React.ComponentPropsWithRef<'input'>; // includes ref
type InputPropsNoRef = React.ComponentPropsWithoutRef<'input'>; // excludes ref

// ‼️ Extending native element props
type CustomInputProps = {
    label: string;
    error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>; // omit conflicts
```

### Strict Typing for API Responses

```tsx
// ‼️ Never trust API data — validate at the boundary

import { z } from 'zod';

// Define the schema (source of truth)
const UserSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'user', 'moderator']),
    createdAt: z.string().datetime(),
});

// ‼️ Derive the TYPE from the schema (single source of truth)
type User = z.infer<typeof UserSchema>;

// Validate at the API boundary
async function fetchUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json(); // data is `any` here

    // ‼️ Parse — throws if data doesn't match schema
    return UserSchema.parse(data);
}

// Or use safeParse for graceful error handling
async function fetchUserSafe(id: string) {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();
    const result = UserSchema.safeParse(data);

    if (!result.success) {
        console.error('API response mismatch:', result.error.flatten());
        throw new Error('Invalid API response');
    }

    return result.data; // type-safe User
}
```

### The satisfies Operator

```tsx
// ‼️ satisfies — validates a value matches a type WITHOUT widening it

type Route = {
    path: string;
    component: React.ComponentType;
    auth?: boolean;
};

// WITHOUT satisfies: routes is typed as Record<string, Route>
// You lose the specific keys
const routes: Record<string, Route> = {
    home: { path: '/', component: HomePage },
    dashboard: { path: '/dashboard', component: DashboardPage, auth: true },
};
routes.nonexistent; // ← no error! Record<string, Route> allows any key

// ‼️ WITH satisfies: routes keeps its literal type but is validated against the type
const routes = {
    home: { path: '/', component: HomePage },
    dashboard: { path: '/dashboard', component: DashboardPage, auth: true },
} satisfies Record<string, Route>;

routes.home; // ✅ works, TypeScript knows this key exists
routes.nonexistent; // ❌ error! 'nonexistent' doesn't exist on this object

// ‼️ satisfies is perfect for config objects — you get validation AND inference
const theme = {
    colors: {
        primary: '#007bff',
        secondary: '#6c757d',
    },
    spacing: {
        sm: 4,
        md: 8,
        lg: 16,
    },
} satisfies Record<string, Record<string, string | number>>;

theme.colors.primary; // type is string (not string | number) — narrower!
```

### Module Augmentation

```tsx
// ‼️ Extending Window interface
// types/global.d.ts
declare global {
    interface Window {
        analytics: {
            track: (event: string, properties?: Record<string, unknown>) => void;
            identify: (userId: string) => void;
        };
        __INITIAL_STATE__: AppState;
    }
}
export {}; // ‼️ This line is REQUIRED to make it a module

// ‼️ Extending theme types (e.g., styled-components)
// types/styled.d.ts
import 'styled-components';

declare module 'styled-components' {
    export interface DefaultTheme {
        colors: {
            primary: string;
            secondary: string;
            background: string;
            text: string;
        };
        spacing: {
            sm: number;
            md: number;
            lg: number;
        };
    }
}

// ‼️ Extending environment variables
// env.d.ts
declare namespace NodeJS {
    interface ProcessEnv {
        DATABASE_URL: string;
        NEXT_PUBLIC_API_URL: string;
        STRIPE_SECRET_KEY: string;
        NODE_ENV: 'development' | 'production' | 'test';
    }
}
```

### Template Literal Types for Variants

```tsx
// ‼️ Generate variant types automatically
type Size = 'sm' | 'md' | 'lg';
type Color = 'primary' | 'secondary' | 'danger';

// Generates: 'primary-sm' | 'primary-md' | 'primary-lg' | 'secondary-sm' | ...
type ButtonVariant = `${Color}-${Size}`;

// Practical use: spacing utilities
type SpacingDirection = 'top' | 'right' | 'bottom' | 'left';
type SpacingSize = '0' | '1' | '2' | '4' | '8';
type SpacingClass = `m${SpacingDirection[0]}-${SpacingSize}`; // 'mt-0' | 'mr-1' | ...

// ‼️ Event handler types
type EventName = 'click' | 'hover' | 'focus';
type Handler = `on${Capitalize<EventName>}`; // 'onClick' | 'onHover' | 'onFocus'
```

---

## 31. CSS Architecture

### CSS Modules

```text
‼️ CSS Modules — scoped CSS at build time. Zero runtime. Ships with Next.js and Vite.
  Each .module.css file's class names are locally scoped — no global collisions.

Pros:
  - Zero runtime cost (compiled at build time)
  - Familiar CSS syntax
  - Co-locates styles with components
  - Works with SSR without extra config
  - IDE support (autocomplete, go to definition)

Cons:
  - Can't use dynamic styles easily (need inline styles or CSS variables)
  - Class name composition is awkward
  - No theming system built in (use CSS custom properties)
```

```tsx
// Button.module.css
.button {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 600;
}

.primary {
  background: var(--color-primary);
  color: white;
}

.secondary {
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}

.large {
  padding: 12px 24px;
  font-size: 1.125rem;
}

// Button.tsx
import styles from './Button.module.css'
import clsx from 'clsx' // or classnames library

type ButtonProps = {
  variant?: 'primary' | 'secondary'
  size?: 'default' | 'large'
  children: React.ReactNode
}

function Button({ variant = 'primary', size = 'default', children }: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.button,
        styles[variant],         // dynamic class based on prop
        size === 'large' && styles.large,
      )}
    >
      {children}
    </button>
  )
}

// ‼️ Global styles within CSS Modules
// :global(.className) escapes the module scope
:global(.dark-mode) .button {
  background: #333;
}

// ‼️ Composing from other modules
.button {
  composes: reset from './reset.module.css';
  padding: 8px 16px;
}
```

### Tailwind CSS

```text
‼️ Tailwind CSS — utility-first CSS framework. Most popular choice in React/Next.js ecosystem.

Key concepts:
  - Write styles directly in className using utility classes
  - No custom CSS files for most components
  - Responsive design with prefixes: sm:, md:, lg:, xl:, 2xl:
  - State variants: hover:, focus:, active:, disabled:, dark:
  - Design tokens built in (spacing, colors, typography)
  - Purges unused CSS at build time → tiny production CSS

‼️ Decision: Tailwind vs CSS Modules vs CSS-in-JS
  - Tailwind: fast development, consistent design, large class strings
  - CSS Modules: familiar CSS, no runtime, good for custom designs
  - CSS-in-JS: dynamic styles, colocated, but runtime cost (unless zero-runtime)
```

```tsx
// Tailwind basics in React
function Card({ title, description }: { title: string; description: string }) {
  return (
    // ‼️ Responsive: stack on mobile, side-by-side on md+
    <div className="flex flex-col md:flex-row gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </h2>
      <p className="text-gray-600 dark:text-gray-300 line-clamp-3">
        {description}
      </p>
    </div>
  )
}

// ‼️ Tailwind custom config — tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class', // 'class' = manual toggle, 'media' = system preference
  theme: {
    extend: {
      // ‼️ Design tokens — extend, don't override
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a5f',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),  // prose classes for rich text
    require('@tailwindcss/forms'),        // form reset
    require('@tailwindcss/line-clamp'),   // line-clamp-N (now built in v3.3+)
  ],
}

export default config

// ‼️ @apply — extract repeated utility patterns (use sparingly)
// globals.css
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-brand-500 text-white rounded-md font-semibold
           hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500
           focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
           transition-colors;
  }
}
// ‼️ Prefer component abstraction over @apply. @apply just moves the problem.
```

### CSS-in-JS Trade-offs

```text
‼️ Runtime CSS-in-JS (styled-components, Emotion):
  Pros:
    - Dynamic styles based on props
    - Theming system built in
    - Full JS power (loops, conditionals)
    - Colocated with component
  Cons:
    - Runtime overhead (generates CSS in JS, inserts <style> tags)
    - Larger bundle size
    - SSR requires extra setup (extracting styles server-side)
    - ‼️ Incompatible with React Server Components (needs 'use client')
    - Harder to cache/optimize

‼️ Zero-runtime CSS-in-JS (Vanilla Extract, Panda CSS, Linaria):
  Pros:
    - All CSS generated at BUILD time — zero runtime cost
    - Type-safe (Vanilla Extract uses TypeScript for styles)
    - Works with Server Components
    - Same DX as runtime CSS-in-JS
  Cons:
    - Build step required
    - Slightly less dynamic (can't interpolate runtime values freely)
    - Smaller ecosystem / community

‼️ Practical recommendation for 2024+:
  - Server Components project → Tailwind or CSS Modules or Vanilla Extract
  - Client-heavy SPA → any approach works, Tailwind is most popular
  - Design system → Vanilla Extract or Tailwind with CVA
  - Legacy project with styled-components → keep it, don't rewrite for the sake of it
```

```tsx
// styled-components example
import styled from 'styled-components';

const Button = styled.button<{ $variant: 'primary' | 'ghost' }>`
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: 600;
    background: ${props => (props.$variant === 'primary' ? props.theme.colors.primary : 'transparent')};
    color: ${props => (props.$variant === 'primary' ? 'white' : props.theme.colors.primary)};

    &:hover {
        opacity: 0.9;
    }
`;

// Vanilla Extract example (zero-runtime)
// button.css.ts
import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from './theme.css';

export const base = style({
    padding: '8px 16px',
    borderRadius: '4px',
    fontWeight: 600,
});

export const variants = styleVariants({
    primary: [base, { background: vars.color.primary, color: 'white' }],
    ghost: [base, { background: 'transparent', color: vars.color.primary }],
});
```

### CSS Custom Properties for Theming

```tsx
// ‼️ CSS custom properties (variables) — the native theming solution
// No runtime cost, works everywhere, SSR-safe

// globals.css
:root {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-bg: #ffffff;
  --color-text: #1f2937;
  --color-border: #e5e7eb;
  --spacing-unit: 4px;
  --radius-md: 8px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
}

// ‼️ Dark mode — just override the variables
[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-primary-hover: #93c5fd;
  --color-bg: #111827;
  --color-text: #f9fafb;
  --color-border: #374151;
}

.card {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
```

### Modern CSS Features

```text
‼️ Container Queries — style based on PARENT size, not viewport
  @container (min-width: 400px) { ... }
  Finally lets components be truly responsive to their context.

‼️ :has() selector — "parent selector" — style a parent based on its children
  .card:has(img) { ... }  — card WITH an image gets different styles
  .form:has(:invalid) { ... } — form with invalid fields

‼️ CSS Layers (@layer) — control cascade order explicitly
  @layer reset, base, components, utilities;
  Tailwind uses this: utilities always win over components.

‼️ Fluid typography with clamp()
  font-size: clamp(1rem, 2.5vw, 2rem);
  Min 1rem, scales with viewport, max 2rem. No media queries needed.
```

```css
/* Container queries */
.card-container {
    container-type: inline-size;
    container-name: card;
}

@container card (min-width: 400px) {
    .card-content {
        display: flex;
        gap: 1rem;
    }
}

/* :has() — style parent based on children */
.input-group:has(:focus) {
    border-color: var(--color-primary);
}

.nav-item:has(.submenu) {
    position: relative;
}

/* CSS layers */
@layer base {
    h1 {
        font-size: 2rem;
    }
}

@layer components {
    .hero h1 {
        font-size: 3rem;
    }
}

/* ‼️ Fluid responsive design — no breakpoints needed */
.container {
    width: clamp(320px, 90vw, 1200px);
    margin-inline: auto;
    padding: clamp(1rem, 3vw, 3rem);
}

h1 {
    font-size: clamp(1.5rem, 4vw, 3rem);
}
```

### CSS Decision Matrix

```text
‼️ When to use which CSS approach:

┌─────────────────────┬──────────────────────────────────────────┐
│ Situation           │ Recommended Approach                      │
├─────────────────────┼──────────────────────────────────────────┤
│ Next.js App Router  │ Tailwind CSS or CSS Modules               │
│ Component library   │ Vanilla Extract, CSS Modules, or Tailwind │
│ SPA (Vite)          │ Tailwind, CSS Modules, or styled-comp     │
│ Quick prototype     │ Tailwind                                  │
│ Custom design system│ CSS Modules + custom properties           │
│ Migration project   │ Keep existing, don't rewrite              │
│ Server Components   │ Tailwind, CSS Modules, Vanilla Extract    │
│                     │ (NOT runtime CSS-in-JS)                   │
└─────────────────────┴──────────────────────────────────────────┘
```

---

## 32. Accessibility (a11y) in React

### ARIA — When to Use and When NOT to Use

```text
‼️ First rule of ARIA: DON'T use ARIA if you can use native HTML.

  BAD:  <div role="button" tabIndex={0} onClick={...}>Click</div>
  GOOD: <button onClick={...}>Click</button>

  BAD:  <div role="checkbox" aria-checked={checked}>...</div>
  GOOD: <input type="checkbox" checked={checked} />

‼️ ARIA is for when native HTML can't express the semantics:
  - Complex widgets (tabs, combobox, tree view, drag-and-drop)
  - Custom components that have no HTML equivalent
  - Adding context that HTML can't express (aria-describedby, aria-live)

Common ARIA attributes:
  aria-label         — labels an element when visible text isn't available
  aria-labelledby    — points to the ID of the element that labels this one
  aria-describedby   — points to the ID of a description element
  aria-expanded      — whether a collapsible section is open
  aria-hidden="true" — hides from screen readers (decorative icons)
  aria-live          — announces dynamic content changes
  aria-current       — indicates current item (page, step, date)
  role               — overrides the element's default role
```

### Semantic HTML

```text
‼️ Why semantic HTML matters:
  - Screen readers use it to build an accessible tree
  - SEO engines use it to understand page structure
  - Keyboard navigation works automatically with native elements

Semantic elements and when to use them:
  <header>     — site or section header (not just a div with a class)
  <nav>        — primary navigation
  <main>       — main content (only ONE per page)
  <article>    — self-contained content (blog post, comment, card)
  <section>    — thematic grouping (must have a heading)
  <aside>      — tangentially related content (sidebar)
  <footer>     — site or section footer
  <figure>     — image + caption group
  <time>       — dates/times (datetime attribute for machine-readable)

‼️ "Div soup" is bad because:
  <div class="header"><div class="nav"><div class="nav-item">
  Screen readers see: "group, group, group" — meaningless.
  <header><nav><a href="/">
  Screen readers see: "banner, navigation, link" — meaningful.
```

### Keyboard Navigation

```text
‼️ Every interactive element must be keyboard accessible:
  - Tab: moves focus to next interactive element
  - Shift+Tab: moves focus to previous
  - Enter/Space: activates buttons/links
  - Arrow keys: navigates within composite widgets (tabs, menus, radio groups)
  - Escape: closes modals, popups, dropdowns

Focus management rules:
  1. Visible focus indicator (never `outline: none` without a replacement)
  2. Logical tab order (follows DOM order, use tabIndex sparingly)
  3. Focus trapping in modals (Tab shouldn't escape the modal)
  4. Focus restoration (when modal closes, focus returns to trigger button)
  5. Skip links (let users skip repetitive navigation)
```

```tsx
// ‼️ Focus trapping in a modal — the right way
// Use a library like @radix-ui/react-dialog or react-aria
// Manual implementation for understanding:

function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // ‼️ Save the previously focused element
      previousFocus.current = document.activeElement as HTMLElement

      // Focus the modal
      modalRef.current?.focus()

      // Trap focus
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
          return
        }

        if (e.key !== 'Tab') return

        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable?.length) return

        const first = focusable[0] as HTMLElement
        const last = focusable[focusable.length - 1] as HTMLElement

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus() // wrap to last
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus() // wrap to first
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    } else {
      // ‼️ Restore focus when modal closes
      previousFocus.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        {children}
      </div>
    </>
  )
}

// ‼️ Skip link — lets keyboard users skip navigation
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black"
    >
      Skip to main content
    </a>
  )
}

// In layout:
<SkipLink />
<nav>...</nav>
<main id="main-content">...</main>
```

### Form Accessibility

```tsx
// ‼️ Every input MUST have a label. No exceptions.

// Good — explicit label association
<label htmlFor="email">Email address</label>
<input id="email" type="email" aria-describedby="email-hint email-error" />
<p id="email-hint">We'll never share your email.</p>
{error && <p id="email-error" role="alert">Please enter a valid email.</p>}

// ‼️ useId — generates unique IDs for label/input pairs (React 18+)
function FormField({ label, error }: { label: string; error?: string }) {
  const id = useId()           // generates unique ID like ':r1:'
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  )
}

// ‼️ Fieldset + Legend for grouped inputs (radio buttons, checkboxes)
<fieldset>
  <legend>Preferred contact method</legend>
  <label><input type="radio" name="contact" value="email" /> Email</label>
  <label><input type="radio" name="contact" value="phone" /> Phone</label>
  <label><input type="radio" name="contact" value="mail" /> Mail</label>
</fieldset>
```

### Live Regions

```tsx
// ‼️ aria-live — announces dynamic content changes to screen readers

// 'polite' — waits until user is idle to announce
// 'assertive' — interrupts whatever is being announced (use sparingly)

// Toast notification
function Toast({ message }: { message: string }) {
    return (
        <div role='status' aria-live='polite'>
            {message}
        </div>
    );
}

// Error that appears dynamically
function FormError({ error }: { error?: string }) {
    return (
        <div role='alert' aria-live='assertive'>
            {/* ‼️ role="alert" implies aria-live="assertive" */}
            {error && <p className='error'>{error}</p>}
        </div>
    );
}

// ‼️ Loading announcements
function SearchResults({ loading, count }: { loading: boolean; count: number }) {
    return (
        <div>
            <div aria-live='polite' className='sr-only'>
                {loading ? 'Loading results...' : `${count} results found.`}
            </div>
            {/* actual results UI */}
        </div>
    );
}
```

### Focus Management on Route Changes

```tsx
// ‼️ SPA problem: route changes don't announce the new page to screen readers
// In a traditional site, page load resets focus. In an SPA, nothing happens.

// Next.js App Router handles this automatically (announces route changes).
// For React Router / custom routing:

function RouteAnnouncer() {
    const location = useLocation();
    const [announcement, setAnnouncement] = useState('');

    useEffect(() => {
        // Set the page title as the announcement
        const title = document.title;
        setAnnouncement(`Navigated to ${title}`);

        // Optionally move focus to main content
        const main = document.getElementById('main-content');
        main?.focus();
    }, [location.pathname]);

    return (
        <div role='status' aria-live='assertive' aria-atomic='true' className='sr-only'>
            {announcement}
        </div>
    );
}
```

### Headless UI Libraries

```text
‼️ Headless UI libraries provide behavior + accessibility WITHOUT styling.
  You bring your own styles. They handle keyboard nav, ARIA, focus management.

Radix UI:
  - Most popular headless library for React
  - Dialog, Dropdown, Tabs, Accordion, Tooltip, Select, etc.
  - Composable compound component API
  - Unstyled by default (pair with Tailwind or CSS Modules)

React Aria (Adobe):
  - Hook-based (useButton, useDialog, useComboBox)
  - Maximum flexibility — you control the DOM
  - Best accessibility compliance (Adobe invests heavily in a11y)
  - Steeper learning curve

Headless UI (Tailwind Labs):
  - Designed specifically for Tailwind
  - Fewer components than Radix
  - Simple API

‼️ Why use them instead of building your own?
  - Modals, dropdowns, comboboxes have HUNDREDS of edge cases
  - Keyboard navigation patterns are complex (arrow keys, type-ahead, etc.)
  - Screen reader announcements differ across OS/browser/reader combinations
  - You WILL get it wrong if you build from scratch. Use a headless library.
```

### Automated Accessibility Testing

```tsx
// ‼️ jest-axe — automated a11y checks in unit tests
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Button has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
});

// ‼️ Playwright a11y checks
import AxeBuilder from '@axe-core/playwright';

test('page has no a11y violations', async ({ page }) => {
    await page.goto('/dashboard');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});

// ‼️ Common mistakes that automated tools CANNOT catch:
// - Meaningful alt text (tools can check if alt exists, not if it's useful)
// - Logical focus order
// - Content understandability
// - Color alone conveying information
// Manual testing with a screen reader is STILL necessary.
```

### Color Contrast

```text
‼️ WCAG contrast ratios:
  AA (minimum):
    - Normal text: 4.5:1
    - Large text (18px bold or 24px): 3:1
    - UI components and graphics: 3:1

  AAA (enhanced):
    - Normal text: 7:1
    - Large text: 4.5:1

  Most companies target AA. AAA is aspirational.

Tools to check:
  - Chrome DevTools → Inspect element → shows contrast ratio in color picker
  - WebAIM Contrast Checker (webaim.org/resources/contrastchecker/)
  - Figma plugins (Stark, A11y - Color Contrast Checker)

‼️ Don't rely on color alone:
  BAD:  Red text = error, green text = success (colorblind users can't tell)
  GOOD: Red text + error icon + "Error:" prefix
```

---

## 33. Design Systems & Component Libraries

### API Design Principles

```text
‼️ Good component API design:
  1. Minimal surface area — fewer props = easier to use and maintain
  2. Sensible defaults — works well with zero config
  3. Composable — small pieces that combine well (not one mega-component)
  4. Consistent — same prop names across components (variant, size, disabled)
  5. Predictable — a prop does what its name suggests
  6. Accessible by default — keyboard + screen reader work without extra config

‼️ Prop naming conventions:
  Boolean props: is/has prefix for state → isOpen, hasError, isDisabled
  Handler props: on prefix → onClick, onClose, onChange
  Render props: render prefix → renderItem, renderHeader
  Variant props: variant, size, color (consistent across all components)

‼️ Don't expose implementation details:
  BAD:  <Modal usePortal setZIndex={1000} transitionDuration={300} />
  GOOD: <Modal />  ← portal, z-index, transitions are internal decisions
```

### Compound Components Pattern

```tsx
// ‼️ Compound components — related components that share state implicitly
// Like <select> + <option> in HTML

// Usage — clean, readable API:
<Tabs defaultValue='profile'>
    <Tabs.List>
        <Tabs.Trigger value='profile'>Profile</Tabs.Trigger>
        <Tabs.Trigger value='settings'>Settings</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value='profile'>Profile content</Tabs.Content>
    <Tabs.Content value='settings'>Settings content</Tabs.Content>
</Tabs>;

// Implementation:
import { createContext, useContext, useState } from 'react';

type TabsContextType = {
    activeTab: string;
    setActiveTab: (value: string) => void;
};

const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
    const context = useContext(TabsContext);
    if (!context) throw new Error('Tabs compound components must be used within <Tabs>');
    return context;
}

function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
    const [activeTab, setActiveTab] = useState(defaultValue);
    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div role='tablist'>{children}</div>
        </TabsContext.Provider>
    );
}

function TabsList({ children }: { children: React.ReactNode }) {
    return <div role='tablist'>{children}</div>;
}

function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
    const { activeTab, setActiveTab } = useTabsContext();
    return (
        <button role='tab' aria-selected={activeTab === value} onClick={() => setActiveTab(value)}>
            {children}
        </button>
    );
}

function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
    const { activeTab } = useTabsContext();
    if (activeTab !== value) return null;
    return <div role='tabpanel'>{children}</div>;
}

// ‼️ Attach as static properties for the dot notation API
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;
```

### Variant Patterns with CVA (Class Variance Authority)

```tsx
// ‼️ CVA — type-safe variant management for Tailwind + component libraries

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils' // clsx + tailwind-merge wrapper

// ‼️ Define variants declaratively
const buttonVariants = cva(
  // Base styles (always applied)
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'hover:bg-gray-100',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    // ‼️ Compound variants — specific combinations
    compoundVariants: [
      {
        variant: 'link',
        size: 'sm',
        className: 'px-0',  // links don't need horizontal padding
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

// ‼️ Extract the variant type from the cva definition
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

// Usage:
<Button variant="destructive" size="lg">Delete</Button>
<Button variant="ghost" size="icon"><TrashIcon /></Button>
<Button>Uses defaults (primary, md)</Button>
```

### Storybook

```text
‼️ Storybook = isolated component development + documentation + testing.

Key concepts:
  - Stories: render a component in a specific state
  - Controls: interactive props panel (auto-generated from TypeScript types)
  - Docs: auto-generated documentation pages
  - Interaction testing: simulate user interactions and assert outcomes
  - Visual regression: screenshot comparison (via Chromatic)

File convention: ComponentName.stories.tsx (co-located with component)
```

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { within, userEvent, expect } from '@storybook/test';

// ‼️ Meta — configures all stories for this component
const meta = {
    title: 'Components/Button',
    component: Button,
    tags: ['autodocs'], // auto-generate docs page
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'destructive', 'ghost'],
        },
        size: {
            control: 'radio',
            options: ['sm', 'md', 'lg'],
        },
        onClick: { action: 'clicked' },
    },
    args: {
        children: 'Button',
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ‼️ Individual stories — each is a specific state
export const Primary: Story = {
    args: {
        variant: 'primary',
        children: 'Primary Button',
    },
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary Button',
    },
};

export const Disabled: Story = {
    args: {
        disabled: true,
        children: 'Disabled Button',
    },
};

// ‼️ Interaction test — runs in the browser
export const ClickTest: Story = {
    args: { children: 'Click me' },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button');

        await userEvent.click(button);
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};
```

### Versioning and Publishing

```text
‼️ Component library versioning:
  MAJOR.MINOR.PATCH (semver)
  - PATCH: bug fix, no API changes (1.0.0 → 1.0.1)
  - MINOR: new feature, backwards compatible (1.0.0 → 1.1.0)
  - MAJOR: breaking change (1.0.0 → 2.0.0)

‼️ What counts as a breaking change in a component library:
  - Removing a prop
  - Changing a prop's type
  - Changing default behavior
  - Renaming a component
  - Changing the DOM structure (if consumers rely on CSS selectors)
  - Removing a CSS class name or CSS variable

Publishing workflow:
  1. Changesets (recommended): developers add changeset files with each PR
     describing what changed (patch/minor/major + description)
  2. CI runs `changeset version` → updates package.json + CHANGELOG
  3. CI runs `changeset publish` → publishes to npm / internal registry

‼️ Design tokens flow:
  Figma → Tokens Studio (Figma plugin) → JSON → Style Dictionary → CSS/TS variables
  This ensures design and code stay in sync.
```

---

## 34. Testing Strategy for Senior Engineers

### The Testing Trophy

```text
‼️ Testing Trophy (Kent C. Dodds) — NOT the testing pyramid:

         /\
        /E2E\          ← Few: critical user journeys (Playwright)
       /------\
      /Integra-\       ← Most: components + hooks + pages together (RTL)
     /--tion----\
    / Unit Tests \     ← Some: pure functions, utilities (Vitest/Jest)
   /-____________-\
  /  Static Types   \  ← Foundation: TypeScript + ESLint catch bugs at write time
  \__________________/

‼️ Key insight: Integration tests give the MOST confidence per test dollar.
  - Unit tests: cheap but test in isolation (miss interaction bugs)
  - Integration tests: test components together as users use them
  - E2E tests: high confidence but slow, brittle, expensive to maintain

‼️ What to test:
  - User-visible behavior (what the user sees and does)
  - Business logic (calculations, transformations, validations)
  - Edge cases (empty states, error states, loading states, boundaries)
  - Accessibility (keyboard nav, screen reader announcements)

‼️ What NOT to test:
  - Implementation details (internal state, private methods, component internals)
  - Third-party libraries (they have their own tests)
  - CSS/styling (use visual regression for this)
  - Simple pass-through components (just render children with a className)
```

### React Testing Library Philosophy

```tsx
// ‼️ Core principle: "The more your tests resemble the way your software is used,
//    the more confidence they can give you."

// ❌ BAD — testing implementation details
test('sets isLoading state to true', () => {
    const { result } = renderHook(() => useData());
    act(() => {
        result.current.fetch();
    });
    expect(result.current.isLoading).toBe(true); // testing internal state
});

// ✅ GOOD — testing what the user sees
test('shows loading spinner then data', async () => {
    render(<UserProfile userId='123' />);

    // User sees a loading state
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Then user sees the data
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

// ‼️ Query priority (use the most accessible query first):
// 1. getByRole       — accessible to everyone (screen readers, keyboard)
// 2. getByLabelText  — form fields
// 3. getByPlaceholder— only if no label
// 4. getByText       — non-interactive elements
// 5. getByDisplayValue — filled-in form inputs
// 6. getByAltText    — images
// 7. getByTitle      — tooltips
// 8. getByTestId     — LAST RESORT (data-testid="...")

// ‼️ AVOID:
// - container.querySelector('.my-class')  ← implementation detail
// - enzyme's .instance() or .state()      ← implementation detail
// - snapshot testing for everything        ← breaks on any change
```

### MSW (Mock Service Worker) for API Mocking

```tsx
// ‼️ MSW intercepts network requests at the SERVICE WORKER level.
// Your components make REAL fetch calls — MSW intercepts them.
// No mocking axios or fetch — tests are more realistic.

// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
    // GET /api/users
    http.get('/api/users', () => {
        return HttpResponse.json([
            { id: '1', name: 'Alice', email: 'alice@example.com' },
            { id: '2', name: 'Bob', email: 'bob@example.com' },
        ]);
    }),

    // POST /api/users
    http.post('/api/users', async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ id: '3', ...body }, { status: 201 });
    }),

    // Error scenario
    http.get('/api/users/:id', ({ params }) => {
        if (params.id === '999') {
            return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return HttpResponse.json({ id: params.id, name: 'Alice' });
    }),
];

// mocks/server.ts (for tests)
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// setupTests.ts (vitest or jest)
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers()); // reset overrides between tests
afterAll(() => server.close());

// In a test — override for specific scenario:
test('shows error when user not found', async () => {
    // ‼️ Override a specific handler for this test only
    server.use(
        http.get('/api/users/:id', () => {
            return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        }),
    );

    render(<UserProfile userId='999' />);
    expect(await screen.findByText(/not found/i)).toBeInTheDocument();
});
```

### E2E Testing — Playwright vs Cypress

```text
‼️ Playwright vs Cypress:

Playwright:
  - Multi-browser (Chromium, Firefox, WebKit)
  - Multi-tab, multi-origin support
  - Faster (parallel by default, no browser addon overhead)
  - Auto-waiting built in (waits for elements to be actionable)
  - API testing built in
  - Component testing (experimental)
  - Recommended for NEW projects

Cypress:
  - Single browser tab only (limitation)
  - Large ecosystem, many plugins
  - Time-travel debugging (excellent DX)
  - Familiar jQuery-like chaining API
  - Slower but more visual debugging
  - More mature for component testing
  - Many teams already use it
```

```ts
// ‼️ Playwright example — Page Object Pattern
// tests/pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly errorMessage: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.getByLabel('Email');
        this.passwordInput = page.getByLabel('Password');
        this.submitButton = page.getByRole('button', { name: 'Sign in' });
        this.errorMessage = page.getByRole('alert');
    }

    async goto() {
        await this.page.goto('/login');
    }

    async login(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }

    async expectError(message: string) {
        await expect(this.errorMessage).toContainText(message);
    }
}

// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Login', () => {
    test('successful login redirects to dashboard', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login('alice@example.com', 'password123');

        await expect(page).toHaveURL('/dashboard');
        await expect(page.getByText('Welcome, Alice')).toBeVisible();
    });

    test('shows error for invalid credentials', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login('wrong@example.com', 'wrong');

        await loginPage.expectError('Invalid email or password');
        await expect(page).toHaveURL('/login'); // stays on login page
    });
});
```

### Testing Custom Hooks

```tsx
// ‼️ renderHook — test hooks in isolation

import { renderHook, act } from '@testing-library/react';

function useCounter(initial = 0) {
    const [count, setCount] = useState(initial);
    const increment = () => setCount(c => c + 1);
    const decrement = () => setCount(c => c - 1);
    const reset = () => setCount(initial);
    return { count, increment, decrement, reset };
}

test('useCounter increments and decrements', () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);

    act(() => result.current.increment());
    expect(result.current.count).toBe(11);

    act(() => result.current.decrement());
    expect(result.current.count).toBe(10);

    act(() => result.current.reset());
    expect(result.current.count).toBe(10);
});

// ‼️ Testing hooks that need providers (context, React Query, etc.)
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider
        client={
            new QueryClient({
                defaultOptions: { queries: { retry: false } },
            })
        }
    >
        <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
);

test('useUser returns current user', async () => {
    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => {
        expect(result.current.data).toEqual({ id: '1', name: 'Alice' });
    });
});
```

### Test Data Factories

```tsx
// ‼️ Factories — generate test data with good defaults and easy overrides
// Use @faker-js/faker for realistic data

import { faker } from '@faker-js/faker';

// Factory function pattern
function createUser(overrides: Partial<User> = {}): User {
    return {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        role: 'user',
        createdAt: faker.date.past().toISOString(),
        ...overrides, // overrides win
    };
}

function createPost(overrides: Partial<Post> = {}): Post {
    return {
        id: faker.string.uuid(),
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(3),
        author: createUser(),
        published: true,
        ...overrides,
    };
}

// Usage in tests:
const user = createUser({ role: 'admin' });
const draft = createPost({ published: false, author: user });
const users = Array.from({ length: 10 }, () => createUser());
```

### Code Coverage — What's Meaningful

```text
‼️ Coverage targets:
  80% line coverage is a REASONABLE target for most projects.
  100% is a vanity metric — it forces you to test trivial code
  and gives false confidence about edge cases.

What coverage DOES tell you:
  - Which code paths have ZERO tests (find the gaps)

What coverage does NOT tell you:
  - Whether tests are GOOD (you can have 100% coverage with useless assertions)
  - Whether important scenarios are covered
  - Whether tests are maintainable

‼️ Focus on:
  - High coverage for business logic (90%+)
  - Medium coverage for UI components (70-80%)
  - Low coverage is OK for: config files, type definitions, simple wrappers

‼️ Enforce in CI:
  - Coverage should not DECREASE (ratchet, don't target a number)
  - Block PRs that reduce coverage significantly
  - But don't block for not reaching an arbitrary threshold
```

---

## 35. Error Monitoring & Observability

### Sentry Setup for React

```tsx
// ‼️ Sentry — the industry standard for frontend error monitoring

// sentry.client.config.ts (Next.js) or main.tsx (Vite)
import * as Sentry from '@sentry/nextjs'; // or @sentry/react

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // ‼️ Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions (adjust based on volume)

    // ‼️ Session replay — record user sessions that had errors
    replaysSessionSampleRate: 0.01, // 1% of all sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions WITH errors

    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],

    // ‼️ Filter out noisy errors
    ignoreErrors: ['ResizeObserver loop', 'Non-Error promise rejection', /Loading chunk \d+ failed/],

    // ‼️ Before sending — scrub PII, add context
    beforeSend(event) {
        // Don't send errors in development
        if (process.env.NODE_ENV === 'development') return null;

        // Scrub sensitive data
        if (event.request?.cookies) {
            event.request.cookies = undefined;
        }

        return event;
    },
});

// ‼️ Error Boundary integration
import { ErrorBoundary } from '@sentry/react';

function App() {
    return (
        <ErrorBoundary
            fallback={({ error, resetError }) => (
                <div>
                    <h2>Something went wrong</h2>
                    <p>{error.message}</p>
                    <button onClick={resetError}>Try again</button>
                </div>
            )}
            showDialog // shows Sentry feedback dialog
        >
            <Router />
        </ErrorBoundary>
    );
}

// ‼️ Adding context — helps debug errors
Sentry.setUser({ id: user.id, email: user.email });

Sentry.setContext('order', {
    orderId: '12345',
    total: 99.99,
    items: 3,
});

// ‼️ Breadcrumbs — trail of events leading to the error
Sentry.addBreadcrumb({
    category: 'user-action',
    message: 'Clicked checkout button',
    level: 'info',
});

// ‼️ Manual error capture
try {
    await processPayment(order);
} catch (error) {
    Sentry.captureException(error, {
        tags: { payment_provider: 'stripe' },
        extra: { orderId: order.id },
    });
    throw error; // re-throw so error boundary catches it
}

// ‼️ Source maps — upload during build for readable stack traces
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
    org: 'my-org',
    project: 'my-app',
    silent: true,
    // Upload source maps but don't expose them publicly
    hideSourceMaps: true,
});
```

### Core Web Vitals

```text
‼️ Core Web Vitals — Google's metrics for user experience.
  Directly impact SEO ranking.

LCP (Largest Contentful Paint) — ‼️ Loading performance
  What: Time until the largest visible element finishes rendering
  Good: < 2.5s | Needs improvement: 2.5-4s | Poor: > 4s
  Common culprits:
    - Slow server response (TTFB)
    - Render-blocking CSS/JS
    - Unoptimized images (no lazy loading, no srcset, no next/image)
    - Client-side rendering (content not in initial HTML)
  Fixes:
    - SSR/SSG for above-the-fold content
    - Preload LCP image: <link rel="preload" as="image" href="..." />
    - Use next/image with priority for hero images
    - Reduce server response time

INP (Interaction to Next Paint) — ‼️ Responsiveness (replaced FID in March 2024)
  What: Time from user interaction to next visual update
  Good: < 200ms | Needs improvement: 200-500ms | Poor: > 500ms
  Common culprits:
    - Long JavaScript tasks blocking the main thread
    - Expensive re-renders (large component trees, no memoization)
    - Synchronous operations in event handlers
  Fixes:
    - Break up long tasks (yield to main thread)
    - Use startTransition for non-urgent state updates
    - Debounce/throttle event handlers
    - Move heavy computation to Web Workers

CLS (Cumulative Layout Shift) — ‼️ Visual stability
  What: Measures unexpected layout shifts during page life
  Good: < 0.1 | Needs improvement: 0.1-0.25 | Poor: > 0.25
  Common culprits:
    - Images without width/height (browser doesn't know size until loaded)
    - Dynamically injected content above existing content
    - Web fonts causing FOUT (Flash of Unstyled Text)
    - Ads/embeds without reserved space
  Fixes:
    - Always set width/height on images (or use aspect-ratio)
    - Use next/font (prevents layout shift from fonts)
    - Reserve space for dynamic content (skeleton screens)
    - Use transform animations instead of layout-triggering properties
```

```tsx
// ‼️ Measuring Core Web Vitals in code
// Use the web-vitals library (what Lighthouse uses internally)

import { onLCP, onINP, onCLS } from 'web-vitals';

function reportVitals() {
    onLCP(metric => {
        console.log('LCP:', metric.value);
        sendToAnalytics({ name: 'LCP', value: metric.value, id: metric.id });
    });

    onINP(metric => {
        console.log('INP:', metric.value);
        sendToAnalytics({ name: 'INP', value: metric.value, id: metric.id });
    });

    onCLS(metric => {
        console.log('CLS:', metric.value);
        sendToAnalytics({ name: 'CLS', value: metric.value, id: metric.id });
    });
}

// ‼️ Next.js has this built in — reportWebVitals in app/layout.tsx
// Or use @next/third-parties for Google Analytics integration

// ‼️ Performance budgets — fail CI if metrics regress
// lighthouse-ci.config.js
module.exports = {
    ci: {
        assert: {
            assertions: {
                'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
                'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
                interactive: ['error', { maxNumericValue: 3500 }],
            },
        },
    },
};
```

### Structured Logging for Frontend

```tsx
// ‼️ Don't just console.log — structure your logs for searchability

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
    userId?: string;
    sessionId?: string;
    traceId?: string;
};

class FrontendLogger {
    private context: Record<string, unknown> = {};

    setContext(ctx: Record<string, unknown>) {
        this.context = { ...this.context, ...ctx };
    }

    private log(level: LogLevel, message: string, extra?: Record<string, unknown>) {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: { ...this.context, ...extra },
        };

        // Send to logging service (Datadog, LogRocket, etc.)
        if (level === 'error' || level === 'warn') {
            sendToLoggingService(entry);
        }

        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console[level](message, entry.context);
        }
    }

    info(message: string, extra?: Record<string, unknown>) {
        this.log('info', message, extra);
    }
    warn(message: string, extra?: Record<string, unknown>) {
        this.log('warn', message, extra);
    }
    error(message: string, extra?: Record<string, unknown>) {
        this.log('error', message, extra);
    }
}

export const logger = new FrontendLogger();

// Usage:
logger.setContext({ userId: user.id, sessionId: getSessionId() });
logger.info('Payment started', { orderId: '123', amount: 99.99 });
logger.error('Payment failed', { orderId: '123', error: err.message });
```

---

## 36. Authentication Patterns in React

### JWT Flow (Access + Refresh Tokens)

```text
‼️ JWT Authentication Flow:

1. User submits credentials (username + password)
2. Server validates → returns access token + refresh token
3. Access token: short-lived (15 min), contains user claims
4. Refresh token: long-lived (7-30 days), used to get new access tokens
5. Client sends access token in Authorization header with every request
6. When access token expires → client uses refresh token to get a new one
7. When refresh token expires → user must log in again

‼️ Token structure (three parts, base64-encoded, separated by dots):
  Header.Payload.Signature
  - Header: algorithm + token type
  - Payload: claims (userId, role, exp, iat)
  - Signature: HMAC or RSA signature (server can verify authenticity)

‼️ JWTs are NOT encrypted — anyone can read the payload.
  Never put sensitive data (passwords, SSN, credit card) in a JWT.
  The signature only guarantees the token wasn't TAMPERED with.
```

### Where to Store Tokens

```text
‼️ Token storage — the great debate:

httpOnly Cookies (RECOMMENDED):
  ✅ Not accessible via JavaScript (XSS can't steal them)
  ✅ Automatically sent with every request to the same origin
  ✅ Can set Secure, SameSite=Strict, Path, Domain
  ❌ Vulnerable to CSRF (mitigate with SameSite + CSRF tokens)
  ❌ Can't access token claims client-side (need a /me endpoint)

localStorage:
  ✅ Easy to implement
  ✅ Accessible in JavaScript (can read claims, check expiry)
  ❌ ‼️ Vulnerable to XSS — if ANY script on your page is compromised,
     attacker can read the token and send it anywhere
  ❌ Persists after browser close (unless you manually clear it)
  ❌ Not automatically sent with requests (must add Authorization header)

sessionStorage:
  ✅ Cleared when tab closes
  ❌ Same XSS vulnerability as localStorage
  ❌ Lost on page reload in some edge cases

‼️ RECOMMENDATION:
  Access token: httpOnly cookie (or in-memory if you can't use cookies)
  Refresh token: httpOnly cookie with stricter path (/api/auth/refresh)
  NEVER store refresh tokens in localStorage.

  If you MUST use localStorage (e.g., cross-domain API without cookie support):
  - Keep access token lifetime very short (5-15 min)
  - Implement token rotation on refresh
  - Monitor for token theft
```

### Auth Context Pattern

```tsx
// ‼️ Auth context — provides user state and auth methods to the entire app

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true); // ‼️ start true — checking session

    // ‼️ Check for existing session on mount
    useEffect(() => {
        async function checkSession() {
            try {
                const response = await fetch('/api/auth/me', { credentials: 'include' });
                if (response.ok) {
                    const user = await response.json();
                    setUser(user);
                }
            } catch {
                // Not authenticated
            } finally {
                setIsLoading(false);
            }
        }
        checkSession();
    }, []);

    const login = async (credentials: LoginCredentials) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // ‼️ sends and receives cookies
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        const user = await response.json();
        setUser(user);
    };

    const logout = async () => {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
        });
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                register: async () => {
                    /* similar to login */
                },
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
```

### Protected Routes

```tsx
// ‼️ Protected route component — redirects to login if not authenticated

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    if (isLoading) {
        return <LoadingSpinner />; // ‼️ Don't redirect while still checking session
    }

    if (!isAuthenticated) {
        // ‼️ Save the attempted URL so we can redirect back after login
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return null;
    }

    return <>{children}</>;
}

// Next.js App Router — middleware approach (preferred):
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value;

    if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

// ‼️ Role-Based Access Control (RBAC) in components
function AdminOnly({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    if (!user || user.role !== 'admin') {
        return null; // or <AccessDenied />
    }

    return <>{children}</>;
}

// Usage:
<AdminOnly>
    <DeleteUserButton userId={user.id} />
</AdminOnly>;

// ‼️ RBAC with a permission check hook
function usePermission(permission: string): boolean {
    const { user } = useAuth();
    if (!user) return false;

    const rolePermissions: Record<string, string[]> = {
        admin: ['users.read', 'users.write', 'users.delete', 'settings.write'],
        moderator: ['users.read', 'users.write'],
        user: ['users.read'],
    };

    return rolePermissions[user.role]?.includes(permission) ?? false;
}

// Usage:
function UserActions({ userId }: { userId: string }) {
    const canDelete = usePermission('users.delete');

    return (
        <div>
            <ViewUserButton userId={userId} />
            {canDelete && <DeleteUserButton userId={userId} />}
        </div>
    );
}
```

### OAuth 2.0 / OIDC with PKCE

```text
‼️ OAuth 2.0 Authorization Code Flow with PKCE (for SPAs):
  PKCE = Proof Key for Code Exchange (pronounced "pixie")

  Why PKCE? SPAs can't keep a client secret (it's in the browser JS).
  PKCE replaces the secret with a dynamic, one-time challenge.

Flow:
  1. Generate code_verifier (random string, 43-128 chars)
  2. Generate code_challenge = SHA256(code_verifier) → base64url encode
  3. Redirect user to auth server:
     /authorize?response_type=code&client_id=...&code_challenge=...
     &code_challenge_method=S256&redirect_uri=...
  4. User logs in at auth server → redirected back with authorization code
  5. Exchange code for tokens:
     POST /token with code + code_verifier (server verifies the challenge)
  6. Receive access_token + id_token + refresh_token

‼️ NextAuth.js / Auth.js handles all of this for you:
  - Google, GitHub, Discord, etc. providers out of the box
  - Session management (JWT or database sessions)
  - CSRF protection built in
  - Callbacks for customizing tokens and sessions
```

```tsx
// NextAuth.js / Auth.js setup (Next.js App Router)
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
        }),
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const user = await verifyCredentials(credentials);
                return user ?? null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role; // ‼️ Add custom claims
            }
            return token;
        },
        async session({ session, token }) {
            session.user.role = token.role; // ‼️ Expose to client
            return session;
        },
    },
});

// Using in a Server Component:
import { auth } from '@/auth';

export default async function DashboardPage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    return <div>Welcome, {session.user?.name}</div>;
}
```

### Silent Refresh and Token Expiry

```tsx
// ‼️ Handling token expiry gracefully in the UI

// Axios interceptor approach:
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: Error | null) => {
    failedQueue.forEach(promise => {
        error ? promise.reject(error) : promise.resolve();
    });
    failedQueue = [];
};

api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // ‼️ Queue requests while refresh is in progress
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => api(originalRequest));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await axios.post('/api/auth/refresh', {}, { withCredentials: true });
                processQueue(null);
                return api(originalRequest); // ‼️ Retry the original request
            } catch (refreshError) {
                processQueue(refreshError as Error);
                // Refresh failed — redirect to login
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);
```

---

## 37. API Layer Patterns

### API Client Architecture

```tsx
// ‼️ Centralized API client — singleton pattern with interceptors

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL,
            timeout: 10_000,
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true, // send cookies
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // ‼️ Request interceptor — add auth token, request ID, timing
        this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
            config.headers['X-Request-ID'] = crypto.randomUUID();
            return config;
        });

        // ‼️ Response interceptor — handle errors globally
        this.client.interceptors.response.use(
            response => response,
            (error: AxiosError) => {
                if (error.response?.status === 403) {
                    window.location.href = '/forbidden';
                }
                if (error.response?.status === 500) {
                    Sentry.captureException(error);
                }
                return Promise.reject(error);
            },
        );
    }

    // ‼️ Type-safe methods
    async get<T>(url: string, config?: object): Promise<T> {
        const response = await this.client.get<T>(url, config);
        return response.data;
    }

    async post<T>(url: string, data?: unknown, config?: object): Promise<T> {
        const response = await this.client.post<T>(url, data, config);
        return response.data;
    }

    async put<T>(url: string, data?: unknown, config?: object): Promise<T> {
        const response = await this.client.put<T>(url, data, config);
        return response.data;
    }

    async delete<T>(url: string, config?: object): Promise<T> {
        const response = await this.client.delete<T>(url, config);
        return response.data;
    }
}

export const api = new ApiClient();

// Usage:
const users = await api.get<User[]>('/users');
const user = await api.post<User>('/users', { name: 'Alice', email: 'alice@example.com' });
```

### Request/Response Validation with Zod

```tsx
// ‼️ Validate API responses at the boundary — don't trust the API

import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'user']),
});

const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
    z.object({
        items: z.array(itemSchema),
        total: z.number(),
        page: z.number(),
        pageSize: z.number(),
        hasMore: z.boolean(),
    });

const UsersResponseSchema = PaginatedResponseSchema(UserSchema);
type UsersResponse = z.infer<typeof UsersResponseSchema>;

// ‼️ Validated API function
async function getUsers(page: number): Promise<UsersResponse> {
    const data = await api.get(`/users?page=${page}`);
    return UsersResponseSchema.parse(data); // throws if invalid
}
```

### Error Handling Strategy

```text
‼️ Frontend error handling layers:
  1. API client interceptor — handle 401, 403, 500 globally
  2. React error boundary — catch rendering errors, show fallback UI
  3. Per-component error handling — specific error messages, retry options
  4. Toast notifications — non-blocking user feedback for recoverable errors

Rule of thumb:
  - Unrecoverable errors → Error boundary (full page or section fallback)
  - Recoverable errors → Toast notification + optional retry
  - Form validation errors → Inline error messages
  - Network errors → "You appear to be offline" banner
```

```tsx
// ‼️ Error handling with React Query + toast

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner'; // or react-hot-toast

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30_000),
        },
        mutations: {
            // ‼️ Global mutation error handler
            onError: error => {
                if (error instanceof AxiosError) {
                    const message = error.response?.data?.message || 'Something went wrong';
                    toast.error(message);
                }
            },
        },
    },
});

// ‼️ Per-mutation error handling with optimistic updates
function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateUserData) => api.put(`/users/${data.id}`, data),

        // ‼️ Optimistic update — update UI immediately
        onMutate: async newData => {
            await queryClient.cancelQueries({ queryKey: ['users', newData.id] });
            const previous = queryClient.getQueryData<User>(['users', newData.id]);
            queryClient.setQueryData(['users', newData.id], { ...previous, ...newData });
            return { previous };
        },

        // ‼️ Rollback on error
        onError: (err, newData, context) => {
            queryClient.setQueryData(['users', newData.id], context?.previous);
            toast.error('Failed to update user. Changes reverted.');
        },

        onSettled: (data, error, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
        },
    });
}
```

### Request Cancellation

```tsx
// ‼️ AbortController — cancel in-flight requests (prevent race conditions)

// Cancel on unmount
function useSearchUsers(query: string) {
    const [results, setResults] = useState<User[]>([]);

    useEffect(() => {
        if (!query) {
            setResults([]);
            return;
        }

        const controller = new AbortController();

        async function search() {
            try {
                const data = await api.get<User[]>(`/users?q=${query}`, {
                    signal: controller.signal,
                });
                setResults(data);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    // ‼️ Request was cancelled — this is expected, don't treat as error
                    return;
                }
                throw error;
            }
        }

        search();
        return () => controller.abort(); // ‼️ Cancel previous request on re-render
    }, [query]);

    return results;
}

// ‼️ With React Query — cancellation is built in
function useSearchUsers(query: string) {
    return useQuery({
        queryKey: ['users', 'search', query],
        queryFn: (
            { signal }, // signal is automatically provided
        ) => api.get<User[]>(`/users?q=${query}`, { signal }),
        enabled: query.length > 0,
    });
}
```

### Pagination Patterns

```text
‼️ Offset-based pagination:
  /api/users?page=3&pageSize=20
  - Simple, familiar (page numbers in UI)
  - ❌ Inconsistent results if data changes between pages
  - ❌ Slow for large offsets (database must scan past skipped rows)

‼️ Cursor-based pagination:
  /api/users?cursor=abc123&limit=20
  - Cursor = pointer to last item seen (usually encoded ID or timestamp)
  - ✅ Consistent results even if data changes
  - ✅ Efficient for large datasets (no offset scanning)
  - ❌ Can't jump to page 5 (must go through pages 1-4)
  - Best for: infinite scroll, "load more", real-time feeds
```

```tsx
// ‼️ Infinite scroll with React Query (useInfiniteQuery)

function useInfiniteUsers() {
    return useInfiniteQuery({
        queryKey: ['users'],
        queryFn: async ({ pageParam }) => {
            const response = await api.get<{
                users: User[];
                nextCursor: string | null;
            }>(`/users?cursor=${pageParam}&limit=20`);
            return response;
        },
        initialPageParam: '',
        getNextPageParam: lastPage => lastPage.nextCursor,
    });
}

function UserList() {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteUsers();

    // ‼️ Flatten pages into a single array
    const allUsers = data?.pages.flatMap(page => page.users) ?? [];

    // Intersection Observer for infinite scroll
    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 1.0 },
        );

        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    return (
        <div>
            {allUsers.map(user => (
                <UserCard key={user.id} user={user} />
            ))}
            <div ref={loadMoreRef}>{isFetchingNextPage && <Spinner />}</div>
        </div>
    );
}
```

### File Upload Patterns

```tsx
// ‼️ Direct upload (multipart form data)
async function uploadFile(file: File, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: event => {
            if (event.total) {
                const percent = Math.round((event.loaded * 100) / event.total);
                onProgress?.(percent);
            }
        },
    });

    return response.data;
}

// ‼️ Presigned URL upload (better for large files — bypasses your server)
// Flow: 1) Request presigned URL from your API  2) Upload directly to S3
async function uploadToS3(file: File) {
    // Step 1: Get presigned URL from your backend
    const { uploadUrl, fileUrl } = await api.post<{
        uploadUrl: string;
        fileUrl: string;
    }>('/api/upload/presigned', {
        filename: file.name,
        contentType: file.type,
    });

    // Step 2: Upload directly to S3 (your server is not a middleman)
    await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
    });

    return fileUrl;
}

// ‼️ File upload component with progress
function FileUpload() {
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // ‼️ Client-side validation
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File must be less than 10MB');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only JPEG, PNG, and PDF files are allowed');
            return;
        }

        setUploading(true);
        try {
            await uploadFile(file, setProgress);
            toast.success('File uploaded!');
        } catch {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div>
            <input type='file' onChange={handleChange} disabled={uploading} />
            {uploading && <progress value={progress} max={100} />}
        </div>
    );
}
```

### WebSocket Integration

```tsx
// ‼️ WebSocket in React — use a custom hook

function useWebSocket(url: string) {
    const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
    const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => setReadyState(WebSocket.OPEN);
        ws.onclose = () => {
            setReadyState(WebSocket.CLOSED);
            // ‼️ Reconnect with exponential backoff
            setTimeout(() => {
                // reconnect logic here
            }, 3000);
        };
        ws.onmessage = event => setLastMessage(event);
        ws.onerror = () => setReadyState(WebSocket.CLOSED);

        return () => {
            ws.close();
        };
    }, [url]);

    const sendMessage = useCallback((data: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    return { lastMessage, readyState, sendMessage };
}

// Usage:
function Chat() {
    const { lastMessage, sendMessage, readyState } = useWebSocket('wss://api.example.com/ws');
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        if (lastMessage) {
            const data = JSON.parse(lastMessage.data);
            setMessages(prev => [...prev, data]);
        }
    }, [lastMessage]);

    const handleSend = (text: string) => {
        sendMessage({ type: 'message', text });
    };

    const isConnected = readyState === WebSocket.OPEN;

    return (
        <div>
            {!isConnected && <Banner>Reconnecting...</Banner>}
            <MessageList messages={messages} />
            <MessageInput onSend={handleSend} disabled={!isConnected} />
        </div>
    );
}
```

### OpenAPI/Swagger Codegen

```text
‼️ OpenAPI codegen — generate type-safe API clients from your API spec.
  Eliminates manual typing of request/response types.

Tools:
  - openapi-typescript: generates TypeScript types from OpenAPI spec
  - openapi-fetch: type-safe fetch wrapper using generated types
  - orval: generates React Query hooks from OpenAPI spec
  - swagger-typescript-api: generates full API client

Workflow:
  1. Backend publishes OpenAPI spec (swagger.json)
  2. Frontend runs codegen: npx openapi-typescript ./swagger.json -o ./src/api/types.ts
  3. Import generated types in your API client
  4. ‼️ Run codegen in CI — if spec changes, types update automatically
  5. TypeScript catches breaking API changes at compile time
```

---

## 38. Developer Experience & Tooling

### ESLint (Flat Config)

```ts
// ‼️ ESLint 9+ uses flat config (eslint.config.js), NOT .eslintrc

// eslint.config.js
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';

export default [
    js.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                project: './tsconfig.json',
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            react: react,
            'react-hooks': reactHooks,
            'jsx-a11y': a11y,
        },
        rules: {
            // ‼️ React hooks rules — NEVER disable these
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // TypeScript
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

            // Accessibility
            'jsx-a11y/alt-text': 'error',
            'jsx-a11y/anchor-is-valid': 'error',
            'jsx-a11y/no-autofocus': 'warn',

            // React
            'react/jsx-no-target-blank': 'error',
            'react/self-closing-comp': 'warn',
        },
    },
    {
        ignores: ['node_modules/', '.next/', 'dist/', 'coverage/'],
    },
];
```

### Pre-commit Hooks (Husky + lint-staged)

```text
‼️ Pre-commit hooks ensure every commit meets code quality standards.
  husky: runs scripts on git hooks
  lint-staged: runs scripts ONLY on staged files (fast)
  commitlint: enforces conventional commit messages

Setup:
  npx husky init
  npm install -D lint-staged @commitlint/cli @commitlint/config-conventional
```

```json
// package.json
{
    "lint-staged": {
        "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
        "*.{css,json,md}": ["prettier --write"]
    }
}
```

```ts
// commitlint.config.ts
// ‼️ Conventional commits: type(scope): description
// feat(auth): add social login
// fix(cart): correct total calculation
// chore(deps): bump React to v19

export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build']],
        'subject-max-length': [2, 'always', 72],
    },
};
```

### Vite Configuration

```ts
// ‼️ vite.config.ts — most common configuration options

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],

    resolve: {
        // ‼️ Path aliases — cleaner imports
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@lib': path.resolve(__dirname, './src/lib'),
        },
    },

    server: {
        port: 3000,
        // ‼️ Proxy API requests to backend (avoids CORS in dev)
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },

    // ‼️ Environment variables: must be prefixed with VITE_
    // VITE_API_URL → import.meta.env.VITE_API_URL

    build: {
        // ‼️ Code splitting
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                },
            },
        },
        // Report chunk sizes
        chunkSizeWarningLimit: 500, // KB
    },
});

// ‼️ Must also update tsconfig.json for path aliases:
// {
//   "compilerOptions": {
//     "baseUrl": ".",
//     "paths": {
//       "@/*": ["./src/*"]
//     }
//   }
// }
```

### Barrel Files — Pros and Cons

```text
‼️ Barrel files = index.ts that re-exports from multiple files:

// components/index.ts
export { Button } from './Button'
export { Input } from './Input'
export { Card } from './Card'

// Consumer:
import { Button, Input, Card } from '@/components'

Pros:
  - Cleaner imports
  - Controls public API of a module
  - Easy to refactor internal file structure

‼️ Cons (why many teams avoid them):
  - Hurts tree shaking — importing one thing may pull in the entire barrel
  - Slows down builds and hot reload (Vite/webpack must resolve more)
  - Circular dependency risk (barrel A imports from barrel B which imports from A)
  - IDE auto-import sometimes picks the barrel instead of the direct file

Recommendation:
  - Use barrel files for PUBLIC packages/libraries (controls the API)
  - ‼️ Avoid barrel files in application code (import directly from the file)
  - If you must use them, keep them shallow (don't re-export entire sub-barrels)
```

### Bundle Analysis

```text
‼️ Bundle size matters because:
  - Larger bundles = slower page load (especially on mobile/3G)
  - Users on slow connections may leave before JS finishes loading
  - Google considers page speed in search ranking

Tools for analysis:
  - @next/bundle-analyzer (Next.js)
  - rollup-plugin-visualizer (Vite)
  - source-map-explorer (generic)
  - bundlephobia.com (check package sizes before installing)

‼️ Common bundle size offenders:
  - moment.js (full locale data) → use date-fns or dayjs instead
  - lodash (importing the whole library) → import lodash/debounce specifically
  - Heavy icon libraries → import individual icons
  - Unused dependencies → audit with depcheck
```

```tsx
// ‼️ Code splitting strategies

// 1. Route-based splitting (automatic in Next.js, manual in React Router)
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <Routes>
                <Route path='/dashboard' element={<Dashboard />} />
                <Route path='/settings' element={<Settings />} />
            </Routes>
        </Suspense>
    );
}

// 2. Component-based splitting (heavy components loaded on demand)
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Analytics() {
    const [showChart, setShowChart] = useState(false);

    return (
        <div>
            <button onClick={() => setShowChart(true)}>Show Chart</button>
            {showChart && (
                <Suspense fallback={<ChartSkeleton />}>
                    <HeavyChart data={data} />
                </Suspense>
            )}
        </div>
    );
}

// 3. ‼️ Tree shaking — only works with ES modules (import/export)
// BAD — imports everything:
import _ from 'lodash';
_.debounce(fn, 300);

// GOOD — tree-shakeable:
import debounce from 'lodash/debounce';
debounce(fn, 300);

// ALSO GOOD — lodash-es is fully tree-shakeable:
import { debounce } from 'lodash-es';
```

### Monorepo Tools

```text
‼️ When to use a monorepo:
  - Component library + app(s) in same repo
  - Multiple apps sharing code (web + mobile, public site + admin)
  - Microservices that share types/contracts

Turborepo:
  - Simple, fast, works with any package manager
  - Task-based (runs build/test/lint across packages)
  - Remote caching (don't rebuild unchanged packages)
  - Minimal config
  - Recommended for most frontend monorepos

Nx:
  - More features (generators, dependency graph visualization)
  - Plugin ecosystem (React, Next.js, Nest.js presets)
  - More opinionated (can be good or bad)
  - Better for large organizations with many teams

pnpm workspaces:
  - Package manager-level monorepo support
  - Efficient disk usage (symlinked node_modules)
  - Works with Turborepo or Nx on top
  - ‼️ pnpm is the recommended package manager for monorepos
```

---

## 39. Code Review Practices

### What Senior Engineers Look For

```text
‼️ Beyond just "does it work" — a senior engineer reviews for:

1. CORRECTNESS
   - Does it handle edge cases? (empty arrays, null, undefined, 0, empty string)
   - Race conditions? (stale closures, concurrent requests, unmounted components)
   - Does it work on mobile? Different browsers?
   - Error handling — what happens when the API call fails?

2. PERFORMANCE
   - Unnecessary re-renders? (missing memoization, unstable references)
   - Large bundle impact? (did they import all of lodash?)
   - Memory leaks? (event listeners not cleaned up, intervals not cleared)
   - N+1 query patterns? (fetching in a loop)
   - Images optimized? (next/image, appropriate formats, lazy loading)

3. ACCESSIBILITY
   - Semantic HTML used?
   - Keyboard navigable?
   - Proper ARIA attributes?
   - Color contrast sufficient?
   - Screen reader tested?

4. SECURITY
   - XSS risks? (dangerouslySetInnerHTML, rendering user input)
   - Secrets in client code? (NEXT_PUBLIC_ with actual secrets)
   - CSRF protection?
   - Input validation/sanitization?
   - Proper auth checks on protected routes?

5. MAINTAINABILITY
   - Is the abstraction at the right level? (not too early, not too late)
   - Would a new team member understand this code?
   - Are there tests for the important behavior?
   - Is the component doing too many things?
   - Are the types precise? (not too many `any` or overly broad types)

6. NAMING
   - Do function/variable names describe WHAT, not HOW?
   - Boolean variables: is/has/should prefix
   - Event handlers: handle + noun + verb (handleUserDelete, not deleteHandler)
   - Components: noun (UserCard, not ShowUser)
```

### PR Size Guidelines

```text
‼️ Ideal PR size:
  - < 200 lines of meaningful changes (not counting generated files, tests, types)
  - Reviewable in < 30 minutes
  - Addresses ONE concern (feature, bug fix, refactor)

Why small PRs:
  - Reviewed faster (hours, not days)
  - Reviewed better (reviewer doesn't skim a 1000-line PR)
  - Easier to revert if something breaks
  - Less merge conflict risk
  - Faster feedback loop

‼️ When PRs must be large:
  - Migrations (database, framework version, file restructuring)
  - Stack them: PR1: types + API, PR2: components, PR3: integration
  - Mark sections: "Focus review on src/auth/, the rest is generated"
```

### Constructive Feedback Patterns

```text
‼️ Good code review feedback:

1. Ask questions instead of making demands:
   ❌ "This should use useMemo."
   ✅ "What do you think about memoizing this? It runs on every render
      and the parent re-renders frequently."

2. Explain the WHY:
   ❌ "Use useCallback here."
   ✅ "Without useCallback, this function gets a new reference every render,
      which causes the child component to re-render unnecessarily."

3. Offer alternatives, not just criticism:
   ❌ "This approach won't scale."
   ✅ "This works for now, but as we add more roles, the if/else chain
      will grow. Consider a role → permissions map instead."

4. Distinguish between blocking and non-blocking:
   "nit: prefer const over let here" (non-blocking)
   "BLOCKER: this bypasses auth checks for admin routes" (blocking)

5. Acknowledge good work:
   "Nice use of discriminated unions here — makes the component much
    more type-safe than optional props."
```

---

## 40. Feature Flags & A/B Testing

### Feature Flag Patterns in React

```text
‼️ Feature flags = ship code behind toggles, enable/disable without deployment.

Use cases:
  - Gradual rollout (1% → 10% → 50% → 100%)
  - Kill switch (disable broken feature instantly)
  - A/B testing (variant A vs variant B)
  - User targeting (beta users, internal team, specific customers)
  - Trunk-based development (merge incomplete features behind flags)

Services:
  - LaunchDarkly (enterprise, full-featured, expensive)
  - Unleash (open source, self-hosted option)
  - Flagsmith (open source, feature-rich)
  - PostHog (flags + analytics + session replay)
  - ConfigCat (simple, affordable)
  - Vercel Edge Config (if on Vercel)
```

```tsx
// ‼️ Feature flag implementation — Provider + Hook pattern

// Feature flag provider
type Flags = Record<string, boolean | string | number>;

const FeatureFlagContext = createContext<{
    flags: Flags;
    isEnabled: (flag: string) => boolean;
    getVariant: (flag: string) => string | undefined;
}>({
    flags: {},
    isEnabled: () => false,
    getVariant: () => undefined,
});

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
    const [flags, setFlags] = useState<Flags>({});

    useEffect(() => {
        // Fetch flags from your service (LaunchDarkly, Unleash, etc.)
        async function loadFlags() {
            const response = await fetch('/api/feature-flags', {
                headers: { 'X-User-Id': getUserId() },
            });
            const data = await response.json();
            setFlags(data);
        }
        loadFlags();
    }, []);

    const isEnabled = useCallback(
        (flag: string) => {
            return flags[flag] === true;
        },
        [flags],
    );

    const getVariant = useCallback(
        (flag: string) => {
            const value = flags[flag];
            return typeof value === 'string' ? value : undefined;
        },
        [flags],
    );

    return <FeatureFlagContext.Provider value={{ flags, isEnabled, getVariant }}>{children}</FeatureFlagContext.Provider>;
}

export function useFeatureFlag(flag: string): boolean {
    const { isEnabled } = useContext(FeatureFlagContext);
    return isEnabled(flag);
}

// ‼️ Usage in components
function CheckoutPage() {
    const showNewCheckout = useFeatureFlag('new-checkout-flow');

    if (showNewCheckout) {
        return <NewCheckoutFlow />;
    }
    return <LegacyCheckoutFlow />;
}

// ‼️ A/B testing variant
function PricingPage() {
    const { getVariant } = useContext(FeatureFlagContext);
    const variant = getVariant('pricing-page-variant'); // 'control' | 'variant-a' | 'variant-b'

    // ‼️ Track which variant the user saw
    useEffect(() => {
        analytics.track('pricing_page_viewed', { variant });
    }, [variant]);

    switch (variant) {
        case 'variant-a':
            return <PricingVariantA />;
        case 'variant-b':
            return <PricingVariantB />;
        default:
            return <PricingControl />;
    }
}
```

### Flag Cleanup

```text
‼️ Feature flags are TECH DEBT if not cleaned up.

Lifecycle:
  1. Create flag → add flag check in code
  2. Gradual rollout → monitor metrics
  3. 100% rollout → flag is "done"
  4. ‼️ CLEANUP → remove flag check, remove dead code path, remove flag from service

Cleanup strategy:
  - Add a "remove by" date when creating the flag
  - Track active flags in your project management tool
  - Set up alerts for flags older than 30 days at 100%
  - ‼️ When removing a flag, also remove the old code path (don't leave dead code)
  - Clean up in a dedicated PR (easy to review, easy to revert)
```

---

## 41. Internationalization (i18n)

### Setup with next-intl / i18next

```text
‼️ i18n libraries for React:
  next-intl — best for Next.js App Router (server component support)
  react-i18next + i18next — most popular, works everywhere
  react-intl (FormatJS) — good ICU message format support

Translation file structure:
  messages/
    en/
      common.json     — shared strings (buttons, labels)
      auth.json       — login/signup strings
      dashboard.json  — dashboard-specific strings
    es/
      common.json
      auth.json
      dashboard.json
```

```json
// messages/en/common.json
{
    "nav": {
        "home": "Home",
        "dashboard": "Dashboard",
        "settings": "Settings"
    },
    "actions": {
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "confirmDelete": "Are you sure you want to delete {itemName}?"
    },
    "items": {
        "count": "{count, plural, =0 {No items} one {# item} other {# items}}"
    },
    "greeting": "Hello, {name}!",
    "lastLogin": "Last login: {date, date, medium} at {date, time, short}"
}
```

```tsx
// ‼️ next-intl example (Next.js App Router)

// i18n.ts — configuration
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
    messages: (await import(`./messages/${locale}/common.json`)).default,
}));

// app/[locale]/layout.tsx
import { NextIntlClientProvider, useMessages } from 'next-intl';

export default function LocaleLayout({ children, params: { locale } }: { children: React.ReactNode; params: { locale: string } }) {
    const messages = useMessages();

    return (
        <html lang={locale}>
            <body>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    {children}
                </NextIntlClientProvider>
            </body>
        </html>
    );
}

// Component usage:
import { useTranslations } from 'next-intl';

function Dashboard() {
    const t = useTranslations('dashboard');

    return (
        <div>
            <h1>{t('title')}</h1>
            {/* ‼️ Pluralization with ICU format */}
            <p>{t('items.count', { count: items.length })}</p>
            {/* ‼️ Date formatting */}
            <p>{t('lastLogin', { date: new Date(user.lastLogin) })}</p>
            {/* ‼️ Interpolation */}
            <p>{t('greeting', { name: user.name })}</p>
        </div>
    );
}
```

### Common i18n Gotchas

```text
‼️ Common i18n mistakes:

1. String concatenation — NEVER DO THIS
   BAD:  t('hello') + ' ' + name + '!'
   GOOD: t('greeting', { name })
   Why: word order differs by language ("Hello John" vs "John-san konnichiwa")

2. Hardcoded text in images
   BAD:  <img src="/hero-banner.png" />  (text baked into image)
   GOOD: Text overlay on generic image, or different images per locale

3. Assuming text length
   English "Submit" → German "Einreichen" (60% longer!)
   ‼️ Design UI to accommodate 40-60% text expansion

4. Date/number/currency formatting
   US: 12/31/2024, $1,234.56
   DE: 31.12.2024, 1.234,56 €
   JP: 2024年12月31日, ¥1,234
   ‼️ Always use Intl.DateTimeFormat / Intl.NumberFormat, never manual formatting

5. Pluralization
   English: 0 items, 1 item, 2 items (two forms)
   Russian: 1 товар, 2 товара, 5 товаров (three forms)
   Arabic: six plural forms!
   ‼️ Use ICU message format — it handles all these cases

6. RTL support (Arabic, Hebrew)
   - Use logical CSS properties: margin-inline-start (not margin-left)
   - Set dir="rtl" on <html>
   - Test layout doesn't break
   - Icons that indicate direction (arrows) may need to be mirrored
```

### Translation Workflow

```text
‼️ Developer → Translator → Code workflow:

1. Developer adds new strings in the DEFAULT locale (usually English)
   - Uses meaningful keys: 'checkout.paymentFailed' not 'error1'
   - Adds ICU placeholders for dynamic content

2. Translation management platform (Crowdin, Lokalise, Phrase)
   - Sync source locale → platform detects new/changed strings
   - Translators translate in the platform
   - Machine translation for first pass, human review

3. Pull translated files back into codebase
   - CI job syncs translations on a schedule (daily) or on trigger
   - New translations go through PR review

4. ‼️ Missing translations at runtime:
   - Show the default locale string (fallback)
   - Log the missing key (so translators can add it)
   - Never show a translation key to users
```

---

## 42. SEO for React/Next.js

### Metadata API (Next.js App Router)

```tsx
// ‼️ Static metadata — defined in layout.tsx or page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Acme Store',
    description: 'Best products at the best prices',
    openGraph: {
        title: 'Acme Store',
        description: 'Best products at the best prices',
        url: 'https://acme.com',
        siteName: 'Acme Store',
        images: [
            {
                url: 'https://acme.com/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Acme Store',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Acme Store',
        description: 'Best products at the best prices',
        images: ['https://acme.com/og-image.png'],
    },
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: 'https://acme.com',
        languages: {
            'en-US': 'https://acme.com/en',
            'es-ES': 'https://acme.com/es',
        },
    },
};

// ‼️ Dynamic metadata — for pages with dynamic content (product pages, blog posts)
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const post = await getPost(params.slug);

    return {
        title: post.title,
        description: post.excerpt,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            images: [post.coverImage],
            type: 'article',
            publishedTime: post.publishedAt,
            authors: [post.author.name],
        },
    };
}

// ‼️ Title template — in layout, inherited by child pages
export const metadata: Metadata = {
    title: {
        template: '%s | Acme Store', // child page title replaces %s
        default: 'Acme Store', // fallback if child doesn't set title
    },
};
// Child page: export const metadata = { title: 'Products' }
// Rendered: "Products | Acme Store"
```

### Structured Data (JSON-LD)

```tsx
// ‼️ Structured data helps Google understand your content → rich search results

// Product page
export default function ProductPage({ product }: { product: Product }) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images,
        offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'USD',
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
        },
    };

    return (
        <>
            {/* ‼️ Inject JSON-LD into the page */}
            <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <ProductDetail product={product} />
        </>
    );
}

// ‼️ Blog post (Article)
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
        '@type': 'Person',
        name: post.author.name,
    },
};

// ‼️ FAQ page (shows expandable answers in search results)
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
        },
    })),
};
```

### Sitemap and Robots

```tsx
// ‼️ app/sitemap.ts — auto-generates /sitemap.xml
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const posts = await getAllPosts();

    const postEntries = posts.map(post => ({
        url: `https://acme.com/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }));

    return [
        {
            url: 'https://acme.com',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: 'https://acme.com/products',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        ...postEntries,
    ];
}

// ‼️ app/robots.ts — auto-generates /robots.txt
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/admin/', '/dashboard/'],
            },
        ],
        sitemap: 'https://acme.com/sitemap.xml',
    };
}
```

### Dynamic OG Images

```tsx
// ‼️ app/api/og/route.tsx — generate OG images on-the-fly with @vercel/og
import { ImageResponse } from 'next/og';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') ?? 'Default Title';

    return new ImageResponse(
        <div
            style={{
                fontSize: 48,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 48,
            }}
        >
            <h1>{title}</h1>
        </div>,
        {
            width: 1200,
            height: 630,
        },
    );
}

// In metadata:
// images: [{ url: `/api/og?title=${encodeURIComponent(post.title)}` }]
```

### SSR vs CSR SEO Implications

```text
‼️ SEO and rendering strategy:

SSR/SSG (Next.js):
  ✅ Search engines get fully rendered HTML
  ✅ Meta tags present on first response
  ✅ Fast LCP (content in initial HTML)
  ✅ Social media previews work (crawlers don't run JS)

CSR (plain React SPA):
  ❌ Initial HTML is empty <div id="root">
  ❌ Googlebot CAN render JS, but with delays and budget limits
  ❌ Other crawlers (Bing, social media) may NOT render JS
  ❌ Slower LCP (must download + parse + execute JS before content appears)
  ❌ Meta tags not available until JS executes

‼️ If SEO matters → use SSR or SSG. Period.
  If SEO doesn't matter (internal tool, behind auth) → CSR is fine.
```

---

## 43. Debugging Techniques

### React DevTools

```text
‼️ React DevTools — two main panels:

Components tab:
  - Tree view of component hierarchy
  - Click component → see props, state, hooks, context
  - Search by component name
  - ‼️ Highlight updates: Settings → "Highlight updates when components render"
    Components flash when they re-render. Fast way to spot unnecessary renders.

Profiler tab:
  - Record renders → see what rendered, why, and how long
  - Flamegraph: shows component tree + render time per component
  - Ranked chart: sorts components by render time (slowest first)
  - ‼️ "Why did this render?" column — shows if it was:
    - Props changed
    - State changed
    - Context changed
    - Parent rendered
  - Use this to find performance bottlenecks

‼️ Tips:
  - Filter out small components: Settings → min render time threshold
  - Name your components (displayName for forwardRef, named exports)
  - useDebugValue in custom hooks to show values in DevTools
```

### Chrome DevTools

```text
‼️ Performance tab:
  - Record → interact → stop → analyze
  - Main thread: see all JS execution, identify long tasks (>50ms blocks)
  - Look for: long yellow (scripting) blocks, layout thrashing, forced reflows
  - Timings: shows LCP, FCP, FID markers
  - Bottom-up: see which functions took the most time

‼️ Memory tab:
  - Heap snapshot: see all objects in memory at a point in time
  - Allocation timeline: record → see what allocates memory over time
  - Compare snapshots: snapshot before action → action → snapshot after
    Filter by "Objects allocated between Snapshot 1 and 2"

  ‼️ Finding memory leaks:
  1. Take heap snapshot
  2. Perform the action suspected of leaking (e.g., open/close modal 10 times)
  3. Take another heap snapshot
  4. Compare: if memory grew, look for retained objects
  5. Common culprits: event listeners, setInterval, closures over large objects,
     detached DOM nodes, WebSocket connections

‼️ Network tab:
  - Throttle: simulate 3G/slow connections
  - Disable cache: test real user experience
  - Filter by type: JS, CSS, Img, Fetch/XHR
  - Waterfall: see request timing (DNS, connect, TTFB, download)
  - ‼️ Look for: unnecessary requests, large payloads, sequential vs parallel
```

### Debugging Re-renders

```tsx
// ‼️ Why-did-you-render — library that logs unnecessary re-renders
// Install: npm install @welldone-software/why-did-you-render

// wdyr.ts (import at the TOP of your entry file)
import React from 'react';

if (process.env.NODE_ENV === 'development') {
    const whyDidYouRender = require('@welldone-software/why-did-you-render');
    whyDidYouRender(React, {
        trackAllPureComponents: true,
        // Or track specific components:
        // trackExtraHooks: [[ReactRedux, 'useSelector']]
    });
}

// Mark specific components:
MyComponent.whyDidYouRender = true;

// ‼️ Manual debugging — quick and dirty
function MyComponent(props) {
    // Log every render
    console.count('MyComponent render');

    // Log which prop changed
    const prevProps = useRef(props);
    useEffect(() => {
        const changed = Object.entries(props).filter(([key, value]) => prevProps.current[key] !== value);
        if (changed.length) {
            console.log('Changed props:', changed);
        }
        prevProps.current = props;
    });

    return <div>...</div>;
}
```

### Debugging Hydration Mismatches

```text
‼️ Hydration mismatch = server HTML doesn't match what React renders on client.
  React 18 shows a warning but continues. React 19 will be stricter.

Common causes:
  1. Using Date.now() or Math.random() in render (different on server vs client)
  2. Browser extensions modifying the DOM before hydration
  3. Checking window/document in render (doesn't exist on server)
  4. Different data on server vs client (e.g., auth state, feature flags)
  5. Invalid HTML nesting (<p> inside <p>, <div> inside <p>)
  6. Third-party scripts modifying the DOM

Fixes:
  1. For client-only content: useEffect + state, or suppressHydrationWarning
  2. For dates: pass as prop from server, format client-side
  3. For window checks: use a useIsClient() hook

‼️ suppressHydrationWarning — use sparingly, not as a blanket fix:
  <time dateTime={date.toISOString()} suppressHydrationWarning>
    {date.toLocaleString()}  {/* differs by server locale vs client locale */}
  </time>
```

```tsx
// ‼️ useIsClient hook — safe way to render client-only content
function useIsClient() {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    return isClient;
}

function ClientOnlyComponent() {
    const isClient = useIsClient();

    if (!isClient) return null; // render nothing on server

    return <div>Window width: {window.innerWidth}</div>;
}
```

### Debugging Layout Shifts

```text
‼️ Use Chrome DevTools to visualize layout shifts:

1. Performance tab → Record → interact → look for "Layout Shift" entries
2. Click a layout shift → see which element shifted and by how much
3. "Layout Shift Regions" checkbox in rendering tab — highlights shifts in blue

Common causes and fixes:
  - Images without dimensions → set width + height, or use aspect-ratio
  - Fonts loading (FOUT) → use next/font or font-display: optional
  - Dynamic content above existing content → reserve space with min-height
  - Ads/iframes → set explicit dimensions on container
  - Conditional rendering that pushes content → use opacity/visibility instead
```

### Console Techniques Beyond console.log

```tsx
// ‼️ Console methods you should be using:

// console.table — beautiful for arrays/objects
console.table(users);
// ┌─────┬────────┬───────────────────┬────────┐
// │     │ name   │ email             │ role   │
// ├─────┼────────┼───────────────────┼────────┤
// │ 0   │ Alice  │ alice@example.com │ admin  │
// │ 1   │ Bob    │ bob@example.com   │ user   │
// └─────┴────────┴───────────────────┴────────┘

// console.group / console.groupEnd — organize related logs
console.group('User Authentication');
console.log('Checking token...');
console.log('Token valid, fetching user...');
console.log('User loaded:', user);
console.groupEnd();

// console.time / console.timeEnd — measure execution time
console.time('fetchUsers');
const users = await fetchUsers();
console.timeEnd('fetchUsers'); // fetchUsers: 234ms

// console.trace — shows call stack (where was this called from?)
function processOrder(order) {
    console.trace('processOrder called');
    // Output shows full call stack leading to this point
}

// console.assert — logs only when condition is false
console.assert(user.role === 'admin', 'Expected admin user, got:', user.role);

// console.dir — shows object properties (useful for DOM elements)
console.dir(document.getElementById('root'), { depth: 2 });

// ‼️ Styled console output
console.log('%c🔴 PRODUCTION WARNING %c You are running in development mode', 'background: red; color: white; font-weight: bold; padding: 4px 8px;', 'color: red;');

// ‼️ debugger statement — pauses execution (like a breakpoint)
function calculateTotal(items) {
    debugger; // Chrome DevTools will pause here if open
    return items.reduce((sum, item) => sum + item.price, 0);
}
```

---

## 44. Soft Skills for Senior Frontend Engineers

### Why soft skills matter at the senior level

```text
‼️ At senior level, your impact is no longer just your code — it's how you
multiply the effectiveness of everyone around you.

The shift:
  Junior:  "Can I build this feature?"
  Mid:     "Can I build this feature well?"
  Senior:  "Can I make sure the RIGHT feature gets built, by the right people,
            in the right way, and that everyone grows in the process?"

Technical skills get you to senior. Soft skills keep you there and move you up.
Most senior engineers who stall do so because of communication, not code.‼️
```

### Communication

```text
‼️ Clear communication is the #1 skill that separates great senior engineers
from average ones.

Writing:
  - Write design docs BEFORE coding — forces you to think, gets early feedback
  - Write clear PR descriptions — explain WHY, not just WHAT‼️
  - Write clear commit messages — your future self will thank you
  - Write clear Slack messages — state the problem, what you tried, what you need‼️
  - Write clear incident reports — timeline, impact, root cause, action items
  - Write RFC/ADRs (Architecture Decision Records) for major decisions
    so future engineers know WHY choices were made

  Bad Slack message:
    "hey, the thing is broken"

  Good Slack message:
    "The checkout flow is returning 500s for ~5% of users since the
    deploy at 2pm. I've checked the logs and it's a null pointer in
    the payment service. I'm rolling back now. Will post RCA after."

Speaking:
  - In meetings: state your point first, then explain (pyramid principle)‼️
  - Don't say "I think we should..." — say "I recommend X because Y"‼️
  - Ask clarifying questions instead of assuming
  - Disagree respectfully: "I see it differently because..." not "That's wrong"
  - Know when to speak up and when to let others have the floor
  - Adapt your language to your audience:
      To PM: "This will take 3 sprints because of X dependency"
      To engineer: "We need to refactor the auth middleware first"
      To executive: "This reduces customer churn by improving load time 40%"

Listening:
  - Repeat back what you heard to confirm understanding
  - Ask "What problem are we trying to solve?" before jumping to solutions
  - Notice when quieter team members have something to say
```

### Giving and receiving feedback

```text
‼️ Feedback is how teams improve. Senior engineers must be good at BOTH giving
and receiving it.

Giving feedback:
  Framework: SBI (Situation, Behavior, Impact)‼️
    Situation: "In yesterday's sprint planning..."
    Behavior:  "...you dismissed the junior's estimate without explanation..."
    Impact:    "...which made them hesitant to speak up for the rest of the meeting."

  Rules:
    - Be specific, not vague ("your code needs work" → useless)
    - Focus on behavior, not personality ("this code has a bug" not "you're careless")
    - Give it timely — don't save it for quarterly reviews
    - Give positive feedback too — not just corrections‼️
    - In code reviews: explain WHY something should change, not just "change this"
    - Praise in public, critique in private‼️

  In code reviews:
    ✗ "This is wrong"
    ✗ "Why did you do it this way?"
    ✓ "This works, but consider X because Y — here's an example: ..."
    ✓ "Nit: minor style preference, take it or leave it"‼️
    ✓ "Question: I'm not sure I understand the intent here — could you clarify?"

Receiving feedback:
  - Don't get defensive — assume good intent
  - Ask clarifying questions: "Can you give me a specific example?"
  - Thank the person, even if it stings
  - Separate your ego from your code — you are not your pull request
  - Act on it — feedback without action is wasted
```

### Mentoring junior and mid-level engineers

```text
‼️ Mentoring is one of the highest-leverage activities a senior engineer can do.
One hour of mentoring can save someone days of struggle.

How to mentor effectively:
  - Don't give answers — guide them to find answers‼️
    ✗ "Just use useCallback here"
    ✓ "What do you think is causing the re-render? How could you verify that?"
  - Pair program, but let THEM drive — you navigate
  - Review their PRs thoroughly with explanations, not just approvals
  - Share your mental models, not just solutions
    "When I see a performance issue, I first check: is it re-rendering too much?
     Is it computing too much? Is it fetching too much? Then I narrow down."
  - Create safe spaces to fail — "Try it, if it breaks we'll fix it together"
  - Celebrate their growth publicly
  - Assign stretch tasks slightly above their current level

What NOT to do:
  - Don't rewrite their code — suggest improvements
  - Don't say "it's easy" or "it's obvious" — it wasn't for you once either
  - Don't always jump in to fix things — let them struggle productively
  - Don't gatekeep knowledge — share context freely
```

### Managing up — working with your manager and PM

```text
‼️ Your manager can't help you if they don't know what's going on.
Your PM can't prioritize well if you don't share technical reality.

With your manager:
  - Proactively share status — don't wait to be asked
  - Flag risks early: "This might slip because X — here's my plan to mitigate"
  - Come with solutions, not just problems‼️
  - Ask for what you need: resources, time, scope reduction
  - Share your career goals — they can't help if they don't know
  - Make their job easier — they'll remember

With your PM:
  - Help them understand technical trade-offs in business terms‼️
    ✗ "We need to refactor the state management"
    ✓ "If we spend 2 days cleaning up state management, new features will
       take 30% less time to build for the next 6 months"
  - Push back on scope, not timelines
    ✗ "We can't do this in 2 weeks"
    ✓ "We can ship the core flow in 2 weeks. The edge cases can follow
       in the next sprint. Here's what I'd cut..."
  - Negotiate: "We can do A or B in this sprint, but not both. Which matters more?"
  - Understand their priorities — they have pressure you don't see‼️
```

### Estimating work

```text
‼️ Estimation is one of the hardest skills. Senior engineers are expected to
be better at it — not perfect, but more realistic.

Why estimates are hard:
  - Unknown unknowns (you don't know what you don't know)‼️
  - Optimism bias (developers consistently underestimate)‼️
  - Scope creep (requirements shift mid-sprint)
  - Context switching (meetings, Slack, incidents)
  - Integration complexity (your code works, but does it work with theirs?)

How to estimate better:
  1. Break it down into small tasks (< 1 day each)‼️
     Big task: "Build user profile page" → feels like "3 days"
     Broken down: API integration (4h) + form UI (4h) + validation (3h) +
                  avatar upload (6h) + loading/error states (2h) +
                  tests (4h) + code review fixes (3h) = ~3.5 days

  2. Add buffer for unknowns: multiply by 1.5-2x‼️
     "I think it's 3 days" → tell PM "4-5 days"
     This isn't padding — it's accounting for reality

  3. Use ranges, not points: "2-4 days" is more honest than "3 days"

  4. Track your estimates vs actuals — learn your own bias

  5. Call out risks and assumptions:
     "This assumes the API endpoint already exists. If not, add 2 days."

  6. Re-estimate when scope changes — don't silently absorb it
```

### Dealing with conflict and disagreement

```text
Technical disagreements are normal and healthy. How you handle them matters.

When you disagree with a technical decision:‼️
  1. Assume good intent — they probably have context you don't
  2. Ask questions first: "Help me understand why you chose X over Y?"
  3. Present your case with evidence, not opinions:
     ✗ "Redux is better"
     ✓ "In our case, Redux adds 15KB to the bundle and requires 3x more
        boilerplate. Zustand covers our use case with less complexity.
        Here's a prototype: ..."
  4. Disagree and commit — if the team decides differently, support it‼️
     "I still think X would be better, but I understand the reasoning for Y.
      I'll fully commit to making Y work well."
  5. Know when it matters — not every hill is worth dying on‼️
     Ask: "Will this matter in 6 months?" If no, let it go.

When two team members are in conflict:
  - Don't take sides — facilitate
  - Bring it back to data: "Let's prototype both and measure"
  - Separate technical disagreement from personal friction
  - If it's blocking progress, propose a time-boxed experiment
```

### Owning projects and driving execution

```text
‼️ Senior engineers are expected to take a vague problem and drive it to
completion — not wait for someone to break it down for them.

What "owning a project" means:
  - Understand the WHY (business value, user impact)
  - Write the technical design doc
  - Break it into milestones and communicate the plan
  - Identify risks and dependencies early
  - Coordinate with other teams if needed
  - Make decisions and document them (ADRs)
  - Unblock yourself — don't wait for perfect answers
  - Ship incrementally — don't disappear for 3 weeks
  - Communicate progress proactively
  - Handle unexpected issues without being told to
  - Run the retro after it's done

The difference between senior and staff:
  Senior: owns a project end-to-end within a team
  Staff:  owns a problem space across multiple teams‼️
```

### Time management and focus

```text
‼️ Senior engineers have more demands on their time — meetings, mentoring,
code reviews, Slack, AND their own coding. Managing this is a skill.

Strategies:
  - Block focus time on your calendar (2-4 hour blocks)‼️
    Context switching between code and meetings kills productivity.
    A 30-min meeting doesn't cost 30 min — it costs 30 min + 20 min
    to get back into flow state.

  - Batch similar tasks:
    Morning: deep coding (your most productive hours)
    After lunch: code reviews, PR feedback
    Late afternoon: Slack catch-up, planning, mentoring

  - Learn to say no (politely):
    ✗ "Sure, I'll join that meeting"
    ✓ "I don't think I'll add value in that meeting. Can you send me
       the notes and I'll follow up async if needed?"

  - Triage Slack — not everything needs an immediate response
    Urgent (respond now): production incidents, blockers
    Important (respond within hours): PR reviews, design questions
    Low (respond when convenient): general discussion, FYIs

  - Use the 2-minute rule: if it takes < 2 min, do it now. If not, schedule it.

  - Protect your deep work — this is where your highest value contribution is
```

### Working in a remote/hybrid environment

```text
Remote work requires intentional communication — the hallway conversations
don't happen naturally anymore.

Best practices:
  - Over-communicate in writing — what you're working on, what's blocked,
    what you decided and why
  - Default to async — don't schedule a meeting for something a Slack
    message or doc can handle‼️
  - When you DO meet, have an agenda and take notes
  - Use Loom/screen recordings for demos and walkthroughs
  - Be responsive during core hours — silence makes people assume the worst
  - Turn on your camera in important meetings — it builds trust
  - Document decisions in a shared place (not DMs)
  - Create "working out loud" habits — share progress in team channels

For tech leads:
  - Create async standup formats (Slack bot, written updates)
  - Run inclusive meetings — ensure remote people aren't forgotten
  - Build social connection intentionally (virtual coffee, team retros)
  - Write more documentation — you can't rely on tap-on-shoulder knowledge transfer
```

### Navigating ambiguity

```text
‼️ Senior engineers are expected to handle ambiguity — the requirements won't
always be clear, and that's okay.

When requirements are unclear:
  1. Don't wait for perfect specs — start with what you know
  2. Identify the unknowns and list them explicitly
  3. Make reasonable assumptions and STATE them:
     "I'm assuming we only need to support English for v1. If that's wrong,
      let me know now because it changes the architecture."
  4. Build the smallest thing that validates the approach
  5. Get feedback early — ship a prototype in 2 days, not a polished product in 2 weeks‼️
  6. Be comfortable with "we'll figure it out as we go" for non-critical decisions

When the technical direction is unclear:
  - Timebox your research: "I'll spend 4 hours evaluating options, then decide"‼️
  - Write a short comparison doc (not a 10-page RFC for every decision)
  - Talk to people who've done it before
  - Choose the most reversible option when confidence is low‼️
  - Accept that some decisions are "two-way doors" — you can change them later
```
