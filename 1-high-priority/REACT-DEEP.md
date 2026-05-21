# React — Senior Developer Deep Reference

> Covers rendering, hooks internals, patterns, performance, architecture, and interview topics.

---

## Table of Contents

1. [Rendering & Reconciliation](#1-rendering--reconciliation)
2. [Hooks — Deep Dive](#2-hooks--deep-dive)
3. [State Management Patterns](#3-state-management-patterns)
4. [Context API](#4-context-api)
5. [Performance Optimization](#5-performance-optimization)
6. [Patterns & Component Architecture](#6-patterns--component-architecture)
7. [Forms](#7-forms)
8. [Data Fetching Patterns](#8-data-fetching-patterns)
9. [Error Handling](#9-error-handling)
10. [Testing](#10-testing)
11. [Concurrent Features (React 18+)](#11-concurrent-features-react-18)
12. [Common Interview Questions](#12-common-interview-questions)

---

## 1. Rendering & Reconciliation

### How React renders

```text
1. Trigger: state/prop change, forceUpdate, context change
2. Render phase: React calls your component function → gets new element tree (virtual DOM)
   - Pure, no side effects here
   - May be interrupted in concurrent mode
3. Commit phase: React diffs old vs new tree → applies minimal DOM changes
   - Always synchronous
   - ‼️ DOM mutations, then refs, then effects run here
```

### The diffing algorithm

```text
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
// When userId changes, Input unmounts and remounts fresh — state reset

// ‼️ Keys work across conditional branches:
{
    isLoggedIn ? <Dashboard key='dashboard' /> : <Login key='login' />;
}
// ‼️ Without keys — React may try to update Dashboard → Login (same position)
// With keys — React knows they're different, unmounts/mounts correctly
```

### When does a component re-render?

```text
A component re-renders when:
  1. Its own state changes (useState, useReducer)
  2. Its parent re-renders (by default, children re-render too)
  3. A context it consumes changes
  4. Its props change (but parent re-render already causes this)

Note: ‼️ re-render ≠ DOM update
  React re-renders (calls function) to compute new virtual DOM
  Then diffs against previous — only CHANGED DOM nodes are updated
  Re-renders are usually fast; unnecessary DOM mutations are slow
```

---

## 2. Hooks — Deep Dive

### useState internals

```js
// useState stores state in a ‼️ linked list on the fiber (component instance)
// ‼️ Hooks must be called in the same order every render — no conditions!
// This is why "Rules of Hooks" exist — React uses call order to match state to hook

const [count, setCount] = useState(0);

// Functional update — use when new state depends on old state ‼️
setCount(prev => prev + 1); // ‼️ safe in concurrent mode, batched updates

// ‼️ ✗ Direct value — stale if called multiple times before re-render
setCount(count + 1);
setCount(count + 1); // ‼️ still count+1, not count+2!

// ✓ Functional update — always applies to latest state
setCount(c => c + 1);
setCount(c => c + 1); // correctly count+2

// ‼️ Lazy initialization — only runs on mount, not every render
const [data, setData] = useState(() => JSON.parse(localStorage.getItem('data') ?? '[]'));

// Object state — must spread to preserve other keys
const [form, setForm] = useState({ name: '', email: '' });
setForm(prev => ({ ...prev, name: 'Alice' })); // preserve email
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
//      - cleanup of the previous effect runs first (if any)
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
// Purpose: verify your cleanup function correctly reverses the effect
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
// That's why you always need a loading fallback for the first paint:
//
// const [users, setUsers] = useState([]);          // first paint uses this
// useEffect(() => {
//     fetch('/api/users')
//         .then(r => r.json())
//         .then(data => setUsers(data));            // triggers second render + paint
// }, []);
// return users.length === 0 ? <Spinner /> : <UserList users={users} />;
```

### useRef deep dive

```js
// ‼️ useRef returns a mutable box { current: initialValue }
// Changing .current does NOT trigger re-render
// ‼️ Same object reference across all renders

// Use 1: access DOM nodes
const inputRef = useRef(null);
useEffect(() => {
    inputRef.current.focus();
}, []);
<input ref={inputRef} />;

// Use 2: store mutable values across renders without triggering re-render
const renderCount = useRef(0);
useEffect(() => {
    renderCount.current++; // runs after every render, always up-to-date
}); // no dep = after every render
// NOTE: unlike usePrevious, this never reads ref.current during render (no return statement).
// So there's no "one render behind" problem — you read renderCount.current whenever
// you need it (e.g. in JSX or a handler), and by then the effect has already incremented it.
// Contrast:
//   usePrevious → reads ref.current during render's return  → captures stale value → one render behind
//   renderCount → never reads ref.current during render     → always current when you check it

// ‼️ Use 3: store latest callback (avoid stale closure)
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

// useCallback — memoize a FUNCTION REFERENCE
const handleDelete = useCallback(id => {
    setItems(prev => prev.filter(item => item.id !== id));
}, []); // stable reference — won't cause child re-renders

// When to use:
// useMemo: genuinely expensive computation (sorting thousands of items)
// useCallback: function passed to React.memo children, or in useEffect deps

// When NOT to use:
// Memoization has a cost too — memory + comparison overhead
// Don't add them "just in case" — measure first
// Simple calculations are faster WITHOUT useMemo

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

## 3. State Management Patterns

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

## 4. Context API

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

## 5. Performance Optimization

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

### Virtualization (windowing)

```tsx
// Problem: rendering 10,000 list items creates 10,000 DOM nodes
// Virtualization: only render items currently visible in the viewport

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

### Code splitting

```tsx
// Lazy load routes and heavy components
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));
const Reports = lazy(() => import('./Reports')); // heavy, loaded only when needed

function App() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <Routes>
                <Route path='/dashboard' element={<Dashboard />} />
                <Route path='/reports' element={<Reports />} />
            </Routes>
        </Suspense>
    );
}

// Preload before user navigates (on hover over link)
const preloadDashboard = () => import('./Dashboard');
<Link onMouseEnter={preloadDashboard} to='/dashboard'>
    Dashboard
</Link>;
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

## 6. Patterns & Component Architecture

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

## 7. Forms

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

## 8. Data Fetching Patterns

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

## 9. Error Handling

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

## 10. Testing

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

## 11. Concurrent Features (React 18+)

### Automatic batching

```js
// ‼️ React 18: ALL state updates are batched, even in setTimeout/Promises
// React 17: only batched inside React event handlers

// React 18 — all three setState calls cause ONE re-render
setTimeout(() => {
    setCount(c => c + 1);
    setFlag(f => !f);
    setData(d => [...d, newItem]);
    // ONE re-render (was THREE re-renders in React 17)
}, 0);

// Opt out of batching (rare)
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1)); // forces synchronous re-render
flushSync(() => setFlag(f => !f)); // another synchronous re-render
```

### useTransition & startTransition

```tsx
// ‼️ Mark state updates as non-urgent — React can interrupt them
// Urgent: typing, clicking — must respond immediately
// Transition: filtering 10k items — can be interrupted if user types again

const [isPending, startTransition] = useTransition();

function handleSearch(query: string) {
    setQuery(query); // urgent — update input immediately

    startTransition(() => {
        setResults(filterResults(query)); // non-urgent — can be interrupted
    });
}

// isPending: true while transition is running — show loading indicator
{
    isPending && <Spinner />;
}
```

### useDeferredValue

```tsx
// ‼️ Defer updating a value — similar to debounce but React-aware
function SearchResults({ query }) {
    const deferredQuery = useDeferredValue(query); // lags behind query

    const results = useMemo(
        () => expensiveFilter(allItems, deferredQuery),
        [deferredQuery], // only recomputes when deferred value settles
    );

    return <List items={results} />;
}

// The list renders with old results while new ones compute
// Once computed, seamlessly switches — no loading flash for fast queries
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

## 12. Common Interview Questions

### "Explain the virtual DOM and why React uses it."

> The virtual DOM is a lightweight JavaScript representation of the actual DOM. When state changes, React creates a new virtual DOM tree and diffs it against the previous one (reconciliation). Only the actual differences are applied to the real DOM. This is faster than naively re-rendering the whole DOM because real DOM manipulation is expensive — JavaScript is much faster. However, the real win is the programming model: you describe what the UI should look like, and React figures out the minimal changes needed.

### "What is the difference between useEffect and useLayoutEffect?"

> Both run after renders. `useEffect` runs asynchronously after the browser has painted — it doesn't block the user seeing the updated UI. `useLayoutEffect` runs synchronously after DOM mutations but before the browser paints — it can block the paint. Use `useLayoutEffect` when you need to measure DOM nodes or make synchronous DOM mutations that would cause a visible flash if done in `useEffect` (e.g. tooltips, scrolling to a position). Use `useEffect` for everything else.

### "How do you prevent unnecessary re-renders?"

```text
1. React.memo — skip re-render if props shallowly equal
2. useCallback — stable function references for memo'd children
3. useMemo — stable object/array references for memo'd children or useEffect deps
4. ‼️ Split context — consumers only re-render when their slice changes
5. ‼️ Move state down — component that changes state has fewer children to re-render
6. ‼️ Virtualization — only render visible list items
```

### "Explain the rules of hooks and why they exist."

> React stores hook state in a linked list on the component's internal fiber. ‼️ It identifies which state belongs to which `useState` call by the ORDER of hook calls. If hooks ran inside conditions or loops, the order could change between renders, and React would match the wrong state to the wrong hook. So: hooks must be called at the top level of a component, never inside conditions, loops, or nested functions.

```js
// WHAT IS A FIBER?
// A fiber is React's internal object representing one component instance.
// It stores everything React needs about that component:
//   Fiber = {
//       type: MyComponent,
//       stateNode: the actual DOM node,
//       memoizedState: → hook1 → hook2 → hook3 → null,  // linked list of hooks
//       pendingProps: ...,
//   }
// Every component in your tree has its own fiber.
// React keeps a tree of fibers internally to track state, schedule work, and reconcile.

// WHAT IS "ORDER OF CALLS"?
// React doesn't store hook state by name — it stores it as a linked list by POSITION:
//
// function Counter() {
//     const [count, setCount] = useState(0);   // slot 0
//     const [name, setName]   = useState('');  // slot 1
//     const [open, setOpen]   = useState(false);// slot 2
// }
//
// Internally React sees:   slot 0 → { value: 0 }
//                          slot 1 → { value: '' }
//                          slot 2 → { value: false }
//
// No names — just positions. On every render React walks the list in order
// and hands each useState its value by position.

// WHY HOOKS CAN'T GO INSIDE CONDITIONS:
//
// function Counter() {
//     const [count, setCount] = useState(0);      // slot 0
//     if (someCondition) {
//         const [name, setName] = useState('');   // slot 1 — only sometimes!
//     }
//     const [open, setOpen] = useState(false);    // slot 1 or 2 depending on condition!
// }
//
// Render 1 (condition = true):  slot 0 = count, slot 1 = name, slot 2 = open
// Render 2 (condition = false): slot 0 = count, slot 1 = open  ← open reads name's value!
//
// React handed open's useState the value stored for name — wrong value, wrong state, bugs.
// The order must stay the same every render so each hook always reads from its own slot.
```

### "What is reconciliation and what role does key play?"

> Reconciliation is React's diffing algorithm. When re-rendering a list, React compares old and new elements. Without keys, it compares by position — if you add an item at the start, React thinks every item changed. With stable keys, React can identify that existing items just moved, and only adds the new one. This prevents unnecessary unmount/remount cycles, which would reset state and cause visual jumps.

### "What is prop drilling and how do you solve it?"

> Prop drilling is passing props through multiple intermediate components that don't use them, just to get them to a deeply nested consumer. Solutions: Context API (for state that many components need), component composition (pass components as children rather than data), or state management libraries (Zustand). The best solution often isn't lifting state — it's restructuring components so the state is closer to where it's used.

---

## Most Asked React Interview Questions

### "What is the Virtual DOM and how does React use it?"

> The Virtual DOM is a lightweight JavaScript representation of the real DOM. When state changes, React builds a new Virtual DOM tree, diffs it against the previous one (reconciliation), and applies only the minimal set of real DOM updates. This batching and diffing is faster than naively re-rendering the whole DOM. React 18+ uses the Fiber architecture which makes this work incremental — it can pause, prioritize, and resume rendering work.

### "What is the difference between `useState` and `useReducer`?"

> Both manage local state. `useState` is for simple, independent values. `useReducer` is for complex state with multiple sub-values or when next state depends on the previous in non-trivial ways. `useReducer` gives you a predictable state machine: `(state, action) => newState`. Easier to test the reducer in isolation. Redux follows the same pattern at a global scale.

```jsx
// useState — fine for simple cases
const [count, setCount] = useState(0);

// useReducer — better for complex state
const [state, dispatch] = useReducer(
    (state, action) => {
        switch (action.type) {
            case 'increment':
                return { ...state, count: state.count + 1 };
            case 'reset':
                return { count: 0, error: null };
            default:
                return state;
        }
    },
    { count: 0, error: null },
);

dispatch({ type: 'increment' });
```

### "When does a React component re-render?"

> A component re-renders when: 1) its own state changes (`setState`), 2) its parent re-renders (even if props didn't change — unless wrapped in `React.memo`), 3) a context it consumes changes. Re-rendering is NOT the same as DOM update — React re-runs the component function, diffs the output, and only updates the DOM where needed. Unnecessary re-renders waste CPU but don't always cause visible slowdowns — profile before optimizing.

### "What is `useCallback` vs `useMemo`?"

> `useMemo` memoizes a **computed value** — reruns only when dependencies change. `useCallback` memoizes a **function** — returns the same function reference unless dependencies change. They solve the same problem: stable references to prevent unnecessary re-renders of `React.memo` children or unnecessary `useEffect` re-runs. `useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`.

```jsx
const Parent = ({ items }) => {
    // Without useCallback: new function reference every render → Child re-renders
    const handleClick = useCallback(id => {
        setSelected(id);
    }, []); // stable reference

    const sorted = useMemo(
        () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
        [items], // only re-sort when items change
    );

    return <Child items={sorted} onClick={handleClick} />;
};
```

### "What is the difference between controlled and uncontrolled components?"

> Controlled: React state is the single source of truth — every keystroke calls `onChange` which updates state, and `value` is driven by state. You always know the current value. Uncontrolled: the DOM holds the value — you read it via `ref` when needed (e.g. on submit). Controlled is recommended for most cases (easier validation, instant access to value); uncontrolled is fine for simple forms or when integrating with non-React code.

```jsx
// Controlled
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />;

// Uncontrolled
const ref = useRef();
<input ref={ref} defaultValue='initial' />;
// read: ref.current.value on submit
```

### "What are Error Boundaries?"

> Error Boundaries are class components that catch JavaScript errors in their child component tree during rendering, lifecycle methods, and constructors — preventing the whole app from crashing. They can't catch errors in event handlers (use try/catch there) or async code. Define `static getDerivedStateFromError()` to render fallback UI, and `componentDidCatch()` to log errors.

```jsx
class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        logErrorToService(error, info.componentStack);
    }

    render() {
        if (this.state.hasError) return <h2>Something went wrong.</h2>;
        return this.props.children;
    }
}

// Usage
<ErrorBoundary>
    <MyWidget />
</ErrorBoundary>;
```

### ‼️ "What are React Portals?"

> Portals let you render a component's output into a different DOM node than its parent — typically used for modals, tooltips, and dropdowns that need to escape overflow/z-index constraints of their parent container. The component still lives in the React tree (events bubble normally), just the DOM placement changes.

```jsx
import { createPortal } from 'react-dom';

function Modal({ children }) {
    return createPortal(
        <div className='modal'>{children}</div>,
        document.getElementById('modal-root'), // renders outside #app
    );
}
```

### "What is `useRef` and when should you use it?"

> `useRef` returns a mutable object `{ current: ... }` that persists across renders without causing re-renders when mutated. Two main uses: 1) DOM refs — accessing/focusing DOM elements imperatively. 2) Storing mutable values that shouldn't trigger re-renders (previous value, timer IDs, interval handles).

```jsx
// DOM access
const inputRef = useRef(null);
const focusInput = () => inputRef.current.focus();
<input ref={inputRef} />;

// Mutable value without re-render
const timerRef = useRef(null);
const startTimer = () => {
    timerRef.current = setInterval(tick, 1000);
};
const stopTimer = () => clearInterval(timerRef.current);
```

### "How does Context API work and what are its limitations?"

> Context provides a way to pass data through the component tree without prop drilling. `createContext` creates a context, `Provider` wraps the tree and sets the value, any descendant can `useContext` to read it. Limitation: every component that calls `useContext` re-renders when the context value changes — even if it only uses a tiny slice. Solution: split contexts by update frequency, or use `useMemo` to stabilize the value object.

```jsx
const ThemeContext = createContext('light');

function App() {
    const [theme, setTheme] = useState('light');
    // Memoize value to prevent re-renders when App re-renders for other reasons
    const value = useMemo(() => ({ theme, setTheme }), [theme]);
    return (
        <ThemeContext.Provider value={value}>
            <Page />
        </ThemeContext.Provider>
    );
}

function Button() {
    const { theme } = useContext(ThemeContext);
    return <button className={theme}>Click</button>;
}
```

### "What are custom hooks and why use them?"

> A custom hook is a function starting with `use` that calls other hooks. They let you extract and reuse stateful logic between components — without changing the component hierarchy (unlike render props or HOCs). The component stays clean; the hook encapsulates the side effects and state.

```jsx
function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(key)) ?? initialValue;
        } catch {
            return initialValue;
        }
    });

    const set = useCallback(
        newValue => {
            setValue(newValue);
            localStorage.setItem(key, JSON.stringify(newValue));
        },
        [key],
    );

    return [value, set];
}

// Usage — any component can persist state to localStorage in one line
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

### ‼️ "What are React Server Components?"

> Server Components (RSC) run only on the server — they can directly access databases, file systems, and secrets. They send rendered HTML (or a serialized component tree) to the client — zero JavaScript bundle cost for the component. They cannot use `useState`, `useEffect`, or browser APIs. Client Components (`'use client'`) are the traditional React components. The key win: data fetching happens on the server, co-located with the component, without waterfalls.

```jsx
// app/users/page.tsx — Server Component (Next.js App Router)
// No 'use client' — runs on server, can await directly
export default async function UsersPage() {
    const users = await db.select().from(usersTable); // direct DB access
    return <UserList users={users} />;
}

// components/UserList.tsx
('use client'); // needs interactivity
export function UserList({ users }) {
    const [filter, setFilter] = useState('');
    // ...
}
```

### "What is Suspense and what problems does it solve?"

> Suspense lets you declaratively show a loading state while a component is waiting for something (data fetching, lazy-loaded code). The component "suspends" by throwing a Promise — React catches it, shows the `fallback`, and re-renders when the Promise resolves. Works with `React.lazy` for code splitting and with frameworks like Next.js for data fetching.

```jsx
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function Dashboard() {
    return (
        <Suspense fallback={<Spinner />}>
            <HeavyChart /> {/* code-splits automatically */}
        </Suspense>
    );
}
```

### "What is the difference between `useEffect` and `useLayoutEffect`?"

> Both run after render. `useEffect` runs asynchronously after the browser has painted — doesn't block the user from seeing the screen. `useLayoutEffect` runs synchronously after DOM mutations but before the browser paints — use it when you need to read layout (element dimensions, scroll positions) and immediately apply changes to avoid a visible flicker. In most cases, `useEffect` is correct and preferred.

```jsx
// useLayoutEffect: measure then adjust before paint (no flicker)
useLayoutEffect(() => {
    const { height } = ref.current.getBoundingClientRect();
    setTooltipTop(-height - 8); // position tooltip above element
}, []);
```
