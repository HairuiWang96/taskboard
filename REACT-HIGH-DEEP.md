# React — Senior Developer Deep Reference
**Priority: HIGH**

> Covers React internals, Fiber, reconciliation, concurrent features, Suspense, Server Components, hooks internals, and performance patterns.

---

## Table of Contents

1. [React Fiber Architecture](#1-react-fiber-architecture)
2. [Reconciliation & Diffing](#2-reconciliation--diffing)
3. [Rendering Phases](#3-rendering-phases)
4. [Concurrent Mode & Features](#4-concurrent-mode--features)
5. [Suspense](#5-suspense)
6. [React Server Components](#6-react-server-components)
7. [Hooks — Deep Internals](#7-hooks--deep-internals)
8. [Performance Optimization](#8-performance-optimization)
9. [Patterns & Architecture](#9-patterns--architecture)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. React Fiber Architecture

### What Fiber is

```text
Before React 16: the "Stack Reconciler" — synchronous, could not be interrupted.
  Once started, it ran to completion. Long trees = dropped frames = janky UI.

React 16+: Fiber — a complete rewrite of the reconciler.
  Key idea: reconciliation is now INTERRUPTIBLE and INCREMENTAL.

A Fiber is a JavaScript object — one per component instance — that represents:
  - What type of component it is (function, class, host element)
  - Its props and state
  - Pointers to parent, child, and sibling fibers (linked list, not a tree)
  - Work that needs to happen (effect flags)
  - Priority of the work

The fiber tree is the virtual DOM — it exists entirely in JS memory.
```

### The fiber linked list

```text
Each fiber has three pointers:
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
  All have return pointers back to their parent

Why linked list (not tree)?
  A linked list can be traversed iteratively (with a pointer + loop).
  A tree requires recursion (fills the call stack).
  Iterative traversal can be paused at any point — recursive cannot.
  This is what makes Fiber interruptible.
```

### Work loop

```text
React processes fibers in a "work loop" — a while loop that picks up
the next fiber unit of work and processes it.

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
const list = items.map(item => (
  <li key={item.id}>{item.name}</li>
));
// React correctly identifies which item is new, which moved — minimal DOM updates

// When index keys ARE okay:
// - The list never reorders
// - The list never has items inserted/deleted (only appended)
// - Items are not stateful (no forms, no animations)
```

### Reconciliation and component types

```jsx
// Conditional rendering — component type matters
function Parent({ isLoggedIn }) {
  return isLoggedIn ? <UserDashboard /> : <LoginForm />;
  // When isLoggedIn toggles: React UNMOUNTS one and MOUNTS the other
  // State of each is reset — intentional behavior
}

// Preserve state across conditional renders:
function Parent({ isLoggedIn }) {
  return (
    <>
      {isLoggedIn && <UserDashboard />}
      {!isLoggedIn && <LoginForm />}
    </>
  );
  // Same result — they unmount/mount

  // To PRESERVE state: always render, use CSS to hide
  return (
    <>
      <UserDashboard style={{ display: isLoggedIn ? 'block' : 'none' }} />
      <LoginForm style={{ display: isLoggedIn ? 'none' : 'block' }} />
    </>
  );
}
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
  - No DOM changes yet — this is all in JS memory
  - CAN be interrupted, discarded, and restarted (concurrent mode)
  - Must be pure (no side effects) — React may call your component multiple times

COMMIT PHASE (synchronous, cannot be interrupted):
  - React applies all the DOM mutations at once
  - Runs useLayoutEffect (after DOM update, before browser paint)
  - Browser paints the screen
  - Runs useEffect (after browser paint)

This is why:
  - useEffect (post-paint): safe for async, data fetching, subscriptions
  - useLayoutEffect (post-DOM, pre-paint): safe for measuring DOM, preventing flicker
  - Both can be called multiple times — render phase may restart
```

### Why render phase must be pure

```jsx
// ✗ Side effect in render — dangerous in concurrent mode
function Component() {
  // This runs during render phase — may run multiple times
  fetch('/api/data'); // fires multiple times! network requests pile up
  document.title = 'Loading...'; // flickers

  return <div>...</div>;
}

// ✓ Side effects go in useEffect (commit phase, runs once after paint)
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
// useInsertionEffect (React 18, CSS-in-JS only)
//   → Runs before DOM mutations — for injecting style tags
//   → Not for application code

// useLayoutEffect
//   → Runs synchronously after DOM update, before paint
//   → Use for: reading DOM measurements, avoiding visual flicker
//   → Blocks the browser — keep it fast
useLayoutEffect(() => {
  const height = ref.current.getBoundingClientRect().height;
  setHeight(height); // set state before paint — no flash of wrong layout
}, []);

// useEffect
//   → Runs asynchronously after paint
//   → Use for: data fetching, subscriptions, non-visual side effects
useEffect(() => {
  const subscription = store.subscribe(handleChange);
  return () => subscription.unsubscribe();
}, []);
```

---

## 4. Concurrent Mode & Features

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

### useTransition

```jsx
// Mark a state update as "non-urgent" — can be interrupted by urgent updates
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
```

### useDeferredValue

```jsx
// Defer a value — similar to useTransition but for when you don't control the setter
import { useDeferredValue } from 'react';

function Parent({ query }) {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery lags behind query — lets UI show stale results while updating

  return (
    <>
      <input value={query} onChange={...} />
      {/* ExpensiveList gets the old query until React has time to re-render it */}
      <ExpensiveList query={deferredQuery} />
    </>
  );
}

// Difference from useTransition:
// useTransition: you control which update is non-urgent (wrap the setter)
// useDeferredValue: you defer the value itself (use when you don't own the setter)
```

### Automatic batching (React 18)

```jsx
// Before React 18: state updates were batched inside React event handlers
// but NOT inside setTimeout, fetch, or native event listeners

// React 17:
setTimeout(() => {
  setCount(c => c + 1); // triggers re-render
  setFlag(f => !f);     // triggers another re-render — 2 total
}, 1000);

// React 18: automatic batching everywhere
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);     // batched — only 1 re-render
}, 1000);

// To opt out of batching (rare):
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1)); // forces immediate re-render
flushSync(() => setFlag(f => !f));     // forces immediate re-render
```

---

## 5. Suspense

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

## 6. React Server Components

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
'use client';
// app/components/UserList.tsx
function UserList({ users }) {
  const [filter, setFilter] = useState(''); // ✓ state allowed here

  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      {users.filter(u => u.name.includes(filter)).map(u => (
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
'use client';
function ClientButton() {
  const handleClick = () => console.log('click'); // defined in client
  return <button onClick={handleClick}>Click</button>; // ✓
}
```

---

## 7. Hooks — Deep Internals

### How hooks actually work

```text
Hooks are stored as a linked list on the fiber.
Each hook call appends to this list during render.

function Component() {
  const [a, setA] = useState(1); // hook 1
  const [b, setB] = useState(2); // hook 2
  useEffect(() => {}, []);       // hook 3
}

Fiber's hook list: hook1 → hook2 → hook3

On re-render, React reads hooks in ORDER from this list.
This is why hooks cannot be inside conditions or loops:
  if (condition) {
    useState(1); // hook 1 sometimes, sometimes not
  }
  // React can't match hook 1 to the right stored state
  // → "Rendered more/fewer hooks than previous render" error
```

### useState batching internals

```jsx
// setState calls during React event handlers are batched
function handleClick() {
  setCount(c => c + 1);
  setName('Alice');
  // React batches both — ONE re-render, not two
}

// Why functional updates matter
function handleClick() {
  setCount(count + 1); // ✗ closes over stale count
  setCount(count + 1); // ✗ both use the same old count — result: count + 1, not count + 2

  setCount(c => c + 1); // ✓ receives latest state
  setCount(c => c + 1); // ✓ receives the result of first update — result: count + 2
}
```

### useRef internals

```jsx
// useRef returns { current: initialValue }
// The SAME object reference persists across all renders
// Changing .current does NOT trigger a re-render

// Under the hood, useRef is basically:
function useRef(initialValue) {
  const [ref] = useState({ current: initialValue });
  return ref;
}
// (simplified — actual implementation avoids useState overhead)

// Three use cases for useRef:
// 1. Accessing DOM nodes
const inputRef = useRef(null);
<input ref={inputRef} />;
inputRef.current.focus(); // direct DOM access

// 2. Storing mutable values that don't need to trigger renders
const renderCount = useRef(0);
renderCount.current++; // track renders without causing re-render

// 3. Storing the latest value of a prop/state for use inside callbacks
const latestCallback = useRef(onSomeEvent);
useEffect(() => { latestCallback.current = onSomeEvent; }); // always up to date
useEffect(() => {
  const id = setInterval(() => latestCallback.current(), 1000); // always fresh
  return () => clearInterval(id);
}, []); // interval created once, never stale
```

### useCallback and useMemo — when they actually help

```jsx
// useMemo: memoize an expensive computed value
const sortedUsers = useMemo(
  () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
  [users] // only re-sort when users array changes
);

// useCallback: memoize a function reference (for stable deps / React.memo children)
const handleDelete = useCallback((id) => {
  setUsers(prev => prev.filter(u => u.id !== id));
}, []); // stable reference — safe to pass to React.memo child

// When NOT to use them (most of the time):
// - Simple calculations (adding numbers, basic filtering) — memoization adds overhead
// - Components that re-render anyway due to parent renders
// - Props that are primitives (already stable)

// The real cost: React still calls the component — it just skips the work inside useMemo
// Extra cost: the comparison of deps array on every render
// Benefit only exceeds cost for: expensive computations, reference-stable callbacks
//   needed for React.memo or useEffect deps
```

---

## 8. Performance Optimization

### React.memo

```jsx
// React.memo: skip re-render if props haven't changed (shallow comparison)
const UserCard = React.memo(function UserCard({ user, onDelete }) {
  return (
    <div>
      {user.name}
      <button onClick={() => onDelete(user.id)}>Delete</button>
    </div>
  );
});

// For this to work, the parent must pass stable references:
// ✗ New function on every render — memo is useless
<UserCard onDelete={(id) => deleteUser(id)} />

// ✓ useCallback — stable reference
const handleDelete = useCallback((id) => deleteUser(id), []);
<UserCard onDelete={handleDelete} />

// Custom comparison (for complex props):
const UserCard = React.memo(UserCardFn, (prevProps, nextProps) => {
  return prevProps.user.id === nextProps.user.id; // return true = skip render
});
```

### Code splitting

```jsx
// Lazy load routes — only load JS for the current page
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings  = lazy(() => import('./pages/Settings'));
const Reports   = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="/reports"   element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
// Each page is a separate JS chunk — only downloaded when that route is visited
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

---

## 9. Patterns & Architecture

### Compound components

```jsx
// Pattern: parent component manages shared state, children access it via context
// Allows flexible composition without prop drilling

const TabContext = createContext(null);

function Tabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabContext.Provider>
  );
}

function TabList({ children }) {
  return <div role="tablist">{children}</div>;
}

function Tab({ id, children }) {
  const { activeTab, setActiveTab } = useContext(TabContext);
  return (
    <button
      role="tab"
      aria-selected={activeTab === id}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }) {
  const { activeTab } = useContext(TabContext);
  return activeTab === id ? <div role="tabpanel">{children}</div> : null;
}

// Usage — flexible layout, no prop drilling
<Tabs defaultTab="profile">
  <TabList>
    <Tab id="profile">Profile</Tab>
    <Tab id="settings">Settings</Tab>
  </TabList>
  <TabPanel id="profile"><ProfileForm /></TabPanel>
  <TabPanel id="settings"><SettingsForm /></TabPanel>
</Tabs>
```

### Render props / function as child

```jsx
// Pass a function as children — parent controls rendering, child controls data
function MouseTracker({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
      {children(pos)} {/* call the function with data */}
    </div>
  );
}

<MouseTracker>
  {({ x, y }) => <p>Mouse at {x}, {y}</p>}
</MouseTracker>

// Today: custom hooks replaced most render prop use cases
// Render props still useful when you need to control WHERE in JSX data is rendered
```

---

## 10. Common Interview Questions

### "Explain React Fiber."

> Fiber is React's reconciliation engine (rewritten in React 16). A fiber is a JS object representing a unit of work — one per component. The fiber tree is a linked list, which allows traversal to be paused and resumed. This enables concurrent rendering: React can interrupt long renders to handle urgent updates (like typing), then resume. Before Fiber, the old stack reconciler ran synchronously to completion, causing dropped frames on complex UIs.

### "What is the difference between the render phase and the commit phase?"

> Render phase: React calls your components, creates a new virtual DOM tree, diffs it against the current tree. This is pure (no side effects) and can be interrupted/restarted in concurrent mode. Commit phase: React applies the changes to the actual DOM synchronously — cannot be interrupted. After DOM update: `useLayoutEffect` fires. After browser paint: `useEffect` fires.

### "Why can't you call hooks inside an if statement?"

> Hooks are stored as a linked list on the fiber. React reads them by position on every render. If you conditionally call a hook, the positions shift — React reads the wrong hook's state for each subsequent hook. React enforces the Rules of Hooks (hooks must be called in the same order every render) to prevent this mismatch.

### "What is the difference between useEffect and useLayoutEffect?"

> `useEffect` runs asynchronously after the browser paints — safe for data fetching, subscriptions, non-visual work. `useLayoutEffect` runs synchronously after DOM mutations but before the browser paints — use when you need to read DOM measurements or prevent visual flicker. `useLayoutEffect` blocks painting, so keep it fast.

### "What is React.memo and when should you NOT use it?"

> `React.memo` wraps a component and skips re-rendering if props haven't shallowly changed. Don't use it by default — it adds overhead (comparison on every render) that often outweighs the savings. Only add it when: the component is proven to be slow (profiled), it renders often with the same props, and the props are stable references (use `useCallback`/`useMemo` for function/object props).

### "What are React Server Components?"

> RSC are components that render exclusively on the server. They never ship to the browser (zero bundle contribution), can directly access databases and environment variables, and cannot use state, effects, or event handlers. They interleave with Client Components — Server Components for data and static content, Client Components (marked with 'use client') for interactivity. Reduces bundle size and eliminates client-side data fetching waterfalls.

---

## Most Asked Advanced React Interview Questions

### "How does React Fiber work?"

> Fiber is React's internal reconciliation engine (rewritten in React 16). The key innovation: rendering is now interruptible. Previously, reconciliation was a single synchronous recursive call — it blocked the main thread for large trees. Fiber breaks work into small units (fibers — one per component). The scheduler can pause work, yield to the browser for higher-priority tasks (user input, animations), then resume. This enables concurrent features: `startTransition`, `Suspense`, streaming SSR.

### "What is `startTransition` and when do you use it?"

> `startTransition` marks state updates as non-urgent — they can be interrupted by more urgent updates (typing, clicking). Without it, every state update is treated as urgent and blocks the UI. Use for: filtering/sorting large lists, tab switching, search results — any update where showing stale UI briefly is acceptable.

```jsx
import { startTransition, useState } from 'react';

function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    function handleInput(e) {
        // Urgent: update input immediately
        setQuery(e.target.value);

        // Non-urgent: can be interrupted if user keeps typing
        startTransition(() => {
            setResults(filterLargeDataset(e.target.value));
        });
    }

    return <input value={query} onChange={handleInput} />;
}
```

### "What is React's `key` prop and why does it matter for lists?"

> `key` is React's identifier for elements in a list. During reconciliation, React uses keys to match old elements with new ones. Stable keys (like item IDs) let React detect moves/additions/removals efficiently. Index as key is problematic: when items reorder, React thinks item at index 0 is the same element — state (like input text) gets associated with the wrong item, and animations break. Always use stable unique IDs.

```jsx
// ✗ Index as key — breaks when items reorder
{items.map((item, i) => <Item key={i} {...item} />)}

// ✓ Stable ID
{items.map(item => <Item key={item.id} {...item} />)}
```

### "What are Higher-Order Components (HOCs) and their drawbacks?"

> An HOC is a function that takes a component and returns a new enhanced component. Pattern for reusing component logic (before hooks). Drawbacks: prop collision (HOC and wrapped component may use same prop name), wrapper hell (deep nesting in DevTools), non-obvious data flow. Custom hooks replaced most HOC use cases — prefer hooks for logic reuse; HOCs still valid for cross-cutting concerns like error boundaries.

```jsx
// HOC pattern
function withAuth(Component) {
    return function WrappedComponent(props) {
        const { user } = useAuth();
        if (!user) return <Redirect to="/login" />;
        return <Component {...props} user={user} />;
    };
}

const ProtectedPage = withAuth(DashboardPage);
// Equivalent custom hook approach is usually cleaner
```

### "What is render props and how does it compare to hooks?"

> Render props: a component accepts a function as a prop and calls it in render — shares behavior with children. Like HOCs, mostly superseded by hooks for stateful logic sharing. Render props still useful for inversion of control (letting parent control what gets rendered).

```jsx
// Render prop — passes mouse position to children
function MouseTracker({ render }) {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    return (
        <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
            {render(pos)}
        </div>
    );
}

<MouseTracker render={({ x, y }) => <p>Mouse: {x}, {y}</p>} />

// Equivalent custom hook — cleaner
function useMouse() {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    useEffect(() => {
        const handler = e => setPos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handler);
        return () => window.removeEventListener('mousemove', handler);
    }, []);
    return pos;
}
```

### "How does React batch state updates?"

> In React 18+, all state updates are automatically batched — even in async callbacks, setTimeout, and event handlers. Multiple `setState` calls in the same event handler result in one re-render. In React 17 and earlier, batching only happened inside React event handlers; async updates each triggered a re-render. Use `flushSync` (rare) to opt out of batching when you need the DOM to update immediately.

```jsx
// React 18: all 3 updates batched → 1 re-render
setTimeout(() => {
    setA(1);
    setB(2);
    setC(3);
}, 1000);

// Force immediate render (rare — e.g., measure DOM)
import { flushSync } from 'react-dom';
flushSync(() => setCount(c + 1)); // DOM updated synchronously here
```

### "What is the `useImperativeHandle` hook?"

> `useImperativeHandle` customizes what is exposed when a parent uses a `ref` on a child component. Instead of exposing the whole DOM node or component instance, you expose a specific API. Used with `forwardRef`. Useful for: exposing `focus()`, `scroll()`, `reset()` methods to parents while keeping internal implementation private.

```jsx
const Input = forwardRef((props, ref) => {
    const inputRef = useRef();

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current.focus(),
        clear: () => { inputRef.current.value = ''; },
    }));

    return <input ref={inputRef} {...props} />;
});

// Parent
const inputRef = useRef();
<Input ref={inputRef} />
<button onClick={() => inputRef.current.focus()}>Focus</button>
```

### "What is code splitting and how does React handle it?"

> Code splitting defers loading of JavaScript until it's actually needed — reduces initial bundle size, faster first load. React supports it natively with `React.lazy()` + `Suspense`. The dynamic `import()` creates a split point; bundlers (Vite, webpack) automatically create separate chunks.

```jsx
// Before: everything loaded upfront
import HeavyDashboard from './HeavyDashboard';

// After: HeavyDashboard loaded only when rendered
const HeavyDashboard = React.lazy(() => import('./HeavyDashboard'));

function App() {
    return (
        <Suspense fallback={<Loading />}>
            <Routes>
                <Route path="/dashboard" element={<HeavyDashboard />} />
            </Routes>
        </Suspense>
    );
}
```

### "What is the `useDeferredValue` hook?"

> `useDeferredValue` defers updating a value until the browser is idle — similar to `startTransition` but for values you don't control (e.g., coming from props). The component renders immediately with the old value, then re-renders with the new value when the browser is free. Shows stale content instead of blocking.

```jsx
function SearchResults({ query }) {
    const deferredQuery = useDeferredValue(query);
    const isStale = deferredQuery !== query;

    return (
        <div style={{ opacity: isStale ? 0.5 : 1 }}>
            <ResultsList query={deferredQuery} />
        </div>
    );
}
```
