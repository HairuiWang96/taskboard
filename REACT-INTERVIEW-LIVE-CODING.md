# React — Live Coding Interview Cheatsheet

**Purpose: Write these from memory in a real interview. Partial but correct is better than full but wrong.**

> Most interviewers ask for: custom hooks, classic UI components, and state management patterns.
> They want to see: clean logic, correct hook usage, edge case awareness.

---

## Table of Contents

1. [Custom Hooks](#1-custom-hooks)
2. [Search / Debounce](#2-search--debounce)
3. [Autocomplete / Typeahead](#3-autocomplete--typeahead)
4. [Infinite Scroll](#4-infinite-scroll)
5. [Accordion](#5-accordion)
6. [Tabs](#6-tabs)
7. [Modal](#7-modal)
8. [Todo List](#8-todo-list)
9. [Star Rating](#9-star-rating)
10. [Pagination](#10-pagination)
11. [Form with Validation](#11-form-with-validation)
12. [Timer / Countdown](#12-timer--countdown)
13. [Drag and Drop (basic)](#13-drag-and-drop-basic)
14. [Virtual List (windowing)](#14-virtual-list-windowing)
15. [useFetch](#15-usefetch)
16. [useReducer — Shopping Cart](#16-usereducer--shopping-cart)
17. [Context + useReducer — Theme Provider](#17-context--usereducer--theme-provider)
18. [Error Boundary](#18-error-boundary)
19. [OTP / PIN Input](#19-otp--pin-input)
20. [Sortable Table](#20-sortable-table)
21. [Multi-step Wizard Form](#21-multi-step-wizard-form)
22. [Tooltip](#22-tooltip)
23. [Dropdown Menu](#23-dropdown-menu)
24. [Optimistic UI Update](#24-optimistic-ui-update)
25. [useInterval](#25-useinterval)
26. [useMediaQuery](#26-usemediaquery)
27. [Lazy Image (IntersectionObserver)](#27-lazy-image-intersectionobserver)
28. [Copy to Clipboard Button](#28-copy-to-clipboard-button)
29. [Select All Checkboxes](#29-select-all-checkboxes)
30. [Resizable Panels](#30-resizable-panels)

---

## 1. Custom Hooks

### useDebounce

```jsx
// Delays updating the value until user stops typing for `delay` ms
// Classic use case: search input — avoids firing API on every keystroke
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // cleanup on every new value
  }, [value, delay]);

  return debounced;
}

// Usage:
// const debouncedSearch = useDebounce(query, 500);
// useEffect(() => fetchResults(debouncedSearch), [debouncedSearch]);
```

---

### useLocalStorage

```jsx
// Syncs state to localStorage so it survives page refresh
// Key insight: read initial value from localStorage, write on every change
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStored = (newValue) => {
    setValue(newValue);
    localStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, setStored];
}

// Usage:
// const [theme, setTheme] = useLocalStorage('theme', 'light');
```

---

### useToggle

```jsx
// Simplest hook — toggle a boolean, optionally force a value
function useToggle(initial = false) {
  const [state, setState] = useState(initial);
  const toggle = useCallback((val) => {
    setState(typeof val === 'boolean' ? val : (prev) => !prev);
  }, []);
  return [state, toggle];
}

// Usage:
// const [open, toggleOpen] = useToggle();
// <button onClick={toggleOpen}>Toggle</button>
```

---

### useWindowSize

```jsx
// Returns { width, height } of the browser window, updates on resize
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handler = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return size;
}
```

---

### usePrevious

```jsx
// Returns the value from the PREVIOUS render
// Trick: useRef persists across renders without causing re-renders
function usePrevious(value) {
  const ref = useRef(undefined);
  useEffect(() => {
    ref.current = value; // runs AFTER render, so ref holds previous render's value
  });
  return ref.current;
}

// Usage:
// const prevCount = usePrevious(count);
// if (count > prevCount) console.log('went up');
```

---

### useClickOutside

```jsx
// Fires callback when user clicks outside of the given ref element
// Used for: closing dropdowns, modals, tooltips
function useClickOutside(ref, callback) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, callback]);
}

// Usage:
// const ref = useRef();
// useClickOutside(ref, () => setOpen(false));
// <div ref={ref}>...</div>
```

---

## 2. Search / Debounce

```jsx
// Debounced search input that fires API call after user pauses typing
// Key points: useDebounce delays the fetch, show loading state, handle empty query
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => setResults(data))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {loading && <p>Loading...</p>}
      <ul>
        {results.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 3. Autocomplete / Typeahead

```jsx
// Dropdown suggestions under an input, filtered from a static list (or API)
// Key: keyboard navigation (ArrowUp/Down/Enter), close on outside click
function Autocomplete({ options }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef();

  useClickOutside(ref, () => setOpen(false));

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    if (e.key === 'ArrowUp')   setHighlighted((h) => Math.max(h - 1, 0));
    if (e.key === 'Enter') {
      setQuery(filtered[highlighted]);
      setOpen(false);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
        onKeyDown={handleKey}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul style={{ position: 'absolute', background: 'white', border: '1px solid #ccc', listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
          {filtered.map((item, i) => (
            <li
              key={item}
              style={{ background: i === highlighted ? '#eee' : 'white', padding: '4px 8px', cursor: 'pointer' }}
              onMouseDown={() => { setQuery(item); setOpen(false); }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 4. Infinite Scroll

```jsx
// Loads more items when user scrolls to the bottom
// Key: IntersectionObserver on a sentinel div at the bottom of the list
function InfiniteList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef();

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const res = await fetch(`/api/items?page=${page}`);
    const data = await res.json();
    setItems((prev) => [...prev, ...data.items]);
    setHasMore(data.hasMore);
    setPage((p) => p + 1);
    setLoading(false);
  }, [page, loading, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div>
      {items.map((item) => <div key={item.id}>{item.name}</div>)}
      {loading && <p>Loading...</p>}
      <div ref={sentinelRef} style={{ height: 1 }} /> {/* sentinel */}
    </div>
  );
}
```

---

## 5. Accordion

```jsx
// One section open at a time (or allow multiple — ask the interviewer)
// Key: track which index is open; toggle closes if clicking same index
function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ border: '1px solid #ccc', marginBottom: 4 }}>
          <button
            style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            {item.title}
            <span style={{ float: 'right' }}>{openIndex === i ? '▲' : '▼'}</span>
          </button>
          {openIndex === i && (
            <div style={{ padding: '8px 12px' }}>{item.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// Multiple open variant: use a Set or array of open indices
// const [openSet, setOpenSet] = useState(new Set());
// const toggle = (i) => setOpenSet(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
```

---

## 6. Tabs

```jsx
// Classic tabbed interface — one tab visible at a time
// Key: controlled via activeTab index or key; separate tab bar from content
function Tabs({ tabs }) {
  // tabs = [{ label: 'Tab 1', content: <Component /> }, ...]
  const [active, setActive] = useState(0);

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '2px solid #ccc' }}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: active === i ? '2px solid blue' : 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: active === i ? 'bold' : 'normal',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 16 }}>{tabs[active].content}</div>
    </div>
  );
}
```

---

## 7. Modal

```jsx
// Overlay dialog with backdrop click and Escape key to close
// Key: render via portal so it escapes parent stacking context
function Modal({ isOpen, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onMouseDown={onClose} // click backdrop to close
    >
      <div
        style={{ background: 'white', borderRadius: 8, padding: 24, minWidth: 320 }}
        onMouseDown={(e) => e.stopPropagation()} // don't close when clicking content
      >
        <button onClick={onClose} style={{ float: 'right' }}>✕</button>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Usage:
// const [open, setOpen] = useState(false);
// <button onClick={() => setOpen(true)}>Open</button>
// <Modal isOpen={open} onClose={() => setOpen(false)}><p>Content</p></Modal>
```

---

## 8. Todo List

```jsx
// CRUD list — the most classic live coding question
// Key: each item needs a unique id; filter/map for delete and toggle
function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const add = () => {
    if (!input.trim()) return;
    setTodos((prev) => [...prev, { id: Date.now(), text: input.trim(), done: false }]);
    setInput('');
  };

  const toggle = (id) =>
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  const remove = (id) =>
    setTodos((prev) => prev.filter((t) => t.id !== id));

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="Add todo..."
      />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
            <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
            {todo.text}
            <button onClick={() => remove(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 9. Star Rating

```jsx
// Interactive 1–5 star selector with hover preview
// Key: two states — hovered (preview) and selected (committed); display hover over selected
function StarRating({ max = 5, onChange }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  const displayed = hovered || rating; // hover preview takes priority

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <span
          key={star}
          style={{ fontSize: 32, cursor: 'pointer', color: star <= displayed ? 'gold' : '#ccc' }}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => { setRating(star); onChange?.(star); }}
        >
          ★
        </span>
      ))}
    </div>
  );
}
```

---

## 10. Pagination

```jsx
// Page buttons for a list; compute slice from current page + pageSize
// Key: clamp page, derive slice via useMemo, don't mutate data
function Paginated({ data, pageSize = 10 }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(data.length / pageSize);

  const currentItems = useMemo(
    () => data.slice((page - 1) * pageSize, page * pageSize),
    [data, page, pageSize]
  );

  return (
    <div>
      <ul>
        {currentItems.map((item) => <li key={item.id}>{item.name}</li>)}
      </ul>
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        <button onClick={() => setPage(1)} disabled={page === 1}>«</button>
        <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{ fontWeight: p === page ? 'bold' : 'normal' }}
          >
            {p}
          </button>
        ))}
        <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
      </div>
    </div>
  );
}
```

---

## 11. Form with Validation

```jsx
// Controlled form with inline validation on submit (and optionally on blur)
// Key: keep errors in state, validate before submit, reset errors on change
function SignupForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.email.includes('@')) errs.email = 'Invalid email';
    if (form.password.length < 8) errs.password = 'Min 8 characters';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' })); // clear error on change
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    console.log('Submit:', form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" />
        {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
      </div>
      <div>
        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" />
        {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
      </div>
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

---

## 12. Timer / Countdown

```jsx
// Countdown that ticks every second; start/pause/reset controls
// Key: store interval ID in a ref (not state) so it doesn't trigger re-renders
function Countdown({ initialSeconds = 60 }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = () => {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(intervalRef.current); setRunning(false); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const pause = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setSeconds(initialSeconds);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []); // cleanup on unmount

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <div>
      <h2>{mins}:{secs}</h2>
      <button onClick={start} disabled={running || seconds === 0}>Start</button>
      <button onClick={pause} disabled={!running}>Pause</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

---

## 13. Drag and Drop (basic)

```jsx
// Reorder a list via HTML5 drag-and-drop (no library)
// Key: dragOver item index, splice on drop, use dragIndex ref to avoid stale state
function DragList({ initialItems }) {
  const [items, setItems] = useState(initialItems);
  const dragIndex = useRef(null);

  const onDragStart = (i) => { dragIndex.current = i; };

  const onDrop = (targetIndex) => {
    const from = dragIndex.current;
    if (from === null || from === targetIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    dragIndex.current = null;
  };

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {items.map((item, i) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(i)}
          style={{ padding: '8px 12px', margin: '4px 0', background: '#f0f0f0', cursor: 'grab' }}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

---

## 14. Virtual List (windowing)

```jsx
// Render only visible rows to handle 10,000+ items without lag
// Key: total height = itemHeight * total; translate visible window by scrollTop
function VirtualList({ items, itemHeight = 40, containerHeight = 400 }) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* total height spacer so scrollbar is correct */}
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {/* offset visible rows to their real position */}
        <div style={{ position: 'absolute', top: startIndex * itemHeight, width: '100%' }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight, display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', padding: '0 12px' }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Usage:
// const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
// <VirtualList items={items} itemHeight={40} containerHeight={400} />
```

---

## 15. useFetch

```jsx
// Generic data-fetching hook with loading/error/data states
// Key: AbortController cancels in-flight requests on cleanup (avoids memory leaks and stale updates)
function useFetch(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });

    fetch(url, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return; // ignore cancellations
        setState({ data: null, loading: false, error: err.message });
      });

    return () => controller.abort(); // cancel on unmount or url change
  }, [url]);

  return state;
}

// Usage:
// const { data, loading, error } = useFetch('/api/users');
// if (loading) return <p>Loading...</p>;
// if (error) return <p>Error: {error}</p>;
// return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
```

---

## 16. useReducer — Shopping Cart

```jsx
// useReducer shines when next state depends on the previous AND action type
// Classic example: cart with add/remove/clear actions
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find((i) => i.id === action.item.id);
      if (existing) {
        return state.map((i) => i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...state, { ...action.item, qty: 1 }];
    }
    case 'REMOVE':
      return state.filter((i) => i.id !== action.id);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
};

function Cart({ products }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div>
      {products.map((p) => (
        <div key={p.id}>
          {p.name} — ${p.price}
          <button onClick={() => dispatch({ type: 'ADD', item: p })}>Add to cart</button>
        </div>
      ))}
      <hr />
      <h3>Cart</h3>
      {cart.map((i) => (
        <div key={i.id}>
          {i.name} × {i.qty}
          <button onClick={() => dispatch({ type: 'REMOVE', id: i.id })}>✕</button>
        </div>
      ))}
      <p>Total: ${total.toFixed(2)}</p>
      <button onClick={() => dispatch({ type: 'CLEAR' })}>Clear cart</button>
    </div>
  );
}
```

---

## 17. Context + useReducer — Theme Provider

```jsx
// Context shares state globally without prop drilling
// Pair with useReducer for complex updates; useMemo prevents re-renders on every parent render
const ThemeContext = createContext(null);

const themeReducer = (state, action) => {
  switch (action.type) {
    case 'TOGGLE': return { ...state, mode: state.mode === 'light' ? 'dark' : 'light' };
    case 'SET':    return { ...state, mode: action.mode };
    default:       return state;
  }
};

function ThemeProvider({ children }) {
  const [theme, dispatch] = useReducer(themeReducer, { mode: 'light' });
  // useMemo: only re-create context value when theme changes, not every parent render
  const value = useMemo(() => ({ theme, dispatch }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Custom hook so consumers don't import context directly
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

// Usage in any child:
// const { theme, dispatch } = useTheme();
// <button onClick={() => dispatch({ type: 'TOGGLE' })}>
//   Current: {theme.mode}
// </button>
```

---

## 18. Error Boundary

```jsx
// Error Boundaries MUST be class components — hooks cannot catch render errors
// Catches errors in: render, lifecycle methods, constructors of children
// Does NOT catch: event handlers (use try/catch there), async code, itself
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to error reporting service (Sentry, Datadog, etc.)
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

// Usage:
// <ErrorBoundary fallback={<p>Oops! Try refreshing.</p>}>
//   <MyComponent />
// </ErrorBoundary>

// React 19+ also has: use(promise) + Suspense for async errors, but class boundary still needed for render errors
```

---

## 19. OTP / PIN Input

```jsx
// N separate single-character inputs; auto-advance focus on type, handle backspace
// Key: keep values in an array; use refs array to control focus programmatically
function OTPInput({ length = 6, onComplete }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const refs = useRef([]);

  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/, '').slice(-1); // digits only
    const next = [...values];
    next[i] = char;
    setValues(next);
    if (char && i < length - 1) refs.current[i + 1].focus(); // advance focus
    if (next.every(Boolean)) onComplete?.(next.join(''));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !values[i] && i > 0) {
      refs.current[i - 1].focus(); // go back on backspace when empty
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const next = [...values];
    [...pasted].forEach((c, i) => { next[i] = c; });
    setValues(next);
    refs.current[Math.min(pasted.length, length - 1)].focus();
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={val}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          maxLength={1}
          style={{ width: 40, height: 48, textAlign: 'center', fontSize: 20, border: '1px solid #ccc', borderRadius: 4 }}
        />
      ))}
    </div>
  );
}
```

---

## 20. Sortable Table

```jsx
// Click column header to sort; click again to reverse direction
// Key: store { key, direction } sort state; useMemo to avoid re-sorting on every render
function SortableTable({ data, columns }) {
  // columns = [{ key: 'name', label: 'Name' }, { key: 'age', label: 'Age' }, ...]
  const [sort, setSort] = useState({ key: null, direction: 'asc' });

  const sorted = useMemo(() => {
    if (!sort.key) return data;
    return [...data].sort((a, b) => {
      const [av, bv] = [a[sort.key], b[sort.key]];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sort]);

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              onClick={() => handleSort(col.key)}
              style={{ cursor: 'pointer', padding: '8px 12px', borderBottom: '2px solid #ccc', textAlign: 'left' }}
            >
              {col.label}
              {sort.key === col.key ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={col.key} style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                {row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 21. Multi-step Wizard Form

```jsx
// Multi-page form with Back/Next; validate each step before advancing
// Key: keep all data in one state object at top level; pass down as props or via context
const STEPS = ['Personal', 'Address', 'Review'];

function WizardForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', street: '', city: '' });
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep = () => {
    const errs = {};
    if (step === 0) {
      if (!form.name.trim()) errs.name = 'Required';
      if (!form.email.includes('@')) errs.email = 'Invalid email';
    }
    if (step === 1) {
      if (!form.street.trim()) errs.street = 'Required';
      if (!form.city.trim()) errs.city = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);
  const submit = () => { console.log('Final form:', form); };

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {STEPS.map((label, i) => (
          <span key={i} style={{ fontWeight: i === step ? 'bold' : 'normal', color: i < step ? 'green' : 'inherit' }}>
            {i < step ? '✓' : i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div>
          <input placeholder="Name" value={form.name} onChange={(e) => update('name', e.target.value)} />
          {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
          <input placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
        </div>
      )}

      {step === 1 && (
        <div>
          <input placeholder="Street" value={form.street} onChange={(e) => update('street', e.target.value)} />
          {errors.street && <span style={{ color: 'red' }}>{errors.street}</span>}
          <input placeholder="City" value={form.city} onChange={(e) => update('city', e.target.value)} />
          {errors.city && <span style={{ color: 'red' }}>{errors.city}</span>}
        </div>
      )}

      {step === 2 && (
        <div>
          <p><strong>Name:</strong> {form.name}</p>
          <p><strong>Email:</strong> {form.email}</p>
          <p><strong>Address:</strong> {form.street}, {form.city}</p>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        {step > 0 && <button onClick={back}>Back</button>}
        {step < STEPS.length - 1 && <button onClick={next}>Next</button>}
        {step === STEPS.length - 1 && <button onClick={submit}>Submit</button>}
      </div>
    </div>
  );
}
```

---

## 22. Tooltip

```jsx
// Show a tooltip on hover; position above/below based on available space
// Key: useRef for the trigger, show/hide with state, portal to avoid overflow clipping
function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef();

  const show = () => {
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.top + window.scrollY - 8,   // position above trigger
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setVisible(true);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        style={{ display: 'inline-block' }}
      >
        {children}
      </span>
      {visible && ReactDOM.createPortal(
        <div style={{
          position: 'absolute',
          top: coords.top,
          left: coords.left,
          transform: 'translate(-50%, -100%)',
          background: '#333',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 12,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 9999,
        }}>
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

// Usage:
// <Tooltip text="This is a tooltip"><button>Hover me</button></Tooltip>
```

---

## 23. Dropdown Menu

```jsx
// Button that opens a menu of actions; closes on outside click or Escape
// Key: useClickOutside + keyboard handler; menu items are buttons not links (accessible)
function DropdownMenu({ label, items }) {
  // items = [{ label: 'Edit', onClick: fn }, ...]
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useClickOutside(ref, () => setOpen(false));

  const handleKey = (e) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} onKeyDown={handleKey}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open}>
        {label} {open ? '▲' : '▼'}
      </button>
      {open && (
        <ul
          role="menu"
          style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #ccc', borderRadius: 4, listStyle: 'none', margin: 0, padding: 4, minWidth: 140, zIndex: 100 }}
        >
          {items.map((item, i) => (
            <li key={i} role="none">
              <button
                role="menuitem"
                onClick={() => { item.onClick(); setOpen(false); }}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '6px 12px', cursor: 'pointer' }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 24. Optimistic UI Update

```jsx
// Update UI immediately, then confirm with server; roll back on failure
// Key: apply change to state before the fetch; revert in catch block
function LikeButton({ postId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    // 1. Optimistic update — feels instant to the user
    const prevLikes = likes;
    const prevLiked = liked;
    setLikes((l) => l + (liked ? -1 : 1));
    setLiked((l) => !l);

    try {
      // 2. Fire real API call
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    } catch {
      // 3. Revert on failure
      setLikes(prevLikes);
      setLiked(prevLiked);
      alert('Failed to update like. Please try again.');
    }
  };

  return (
    <button onClick={handleLike} style={{ color: liked ? 'red' : 'gray' }}>
      {liked ? '♥' : '♡'} {likes}
    </button>
  );
}
```

---

## 25. useInterval

```jsx
// Like setInterval but React-safe: updates callback without restarting the interval
// Key: store callback in a ref so the interval always calls the latest version
// Classic Dan Abramov pattern — prevents stale closure issues
function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  // Always keep ref current without restarting the interval
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return; // null delay = paused
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Usage — self-updating clock:
// function Clock() {
//   const [time, setTime] = useState(new Date());
//   useInterval(() => setTime(new Date()), 1000);
//   return <p>{time.toLocaleTimeString()}</p>;
// }

// Pause by passing null:
// useInterval(tick, running ? 1000 : null);
```

---

## 26. useMediaQuery

```jsx
// Returns true/false based on a CSS media query string
// Key: MediaQueryList.matches for initial value; listen to 'change' event for updates
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Usage:
// const isMobile = useMediaQuery('(max-width: 768px)');
// const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
// const isLandscape = useMediaQuery('(orientation: landscape)');
```

---

## 27. Lazy Image (IntersectionObserver)

```jsx
// Only load image src when it enters the viewport — saves bandwidth on long pages
// Key: swap data-src → src on intersection; disconnect observer after load
function LazyImage({ src, alt, ...props }) {
  const imgRef = useRef();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          imgRef.current.src = src; // trigger real load
          setLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src]);

  return (
    <img
      ref={imgRef}
      alt={alt}
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s', background: '#eee', ...props.style }}
      {...props}
    />
  );
}

// Usage:
// <LazyImage src="/photos/large.jpg" alt="landscape" width={800} height={600} />
```

---

## 28. Copy to Clipboard Button

```jsx
// Copy text to clipboard; show "Copied!" confirmation for 2 seconds then reset
// Key: navigator.clipboard.writeText returns a promise; reset via setTimeout in ref
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Copy failed — check browser permissions');
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current), []); // cleanup on unmount

  return (
    <button onClick={handleCopy} style={{ minWidth: 80 }}>
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  );
}

// Usage:
// <CopyButton text="npm install react" />
```

---

## 29. Select All Checkboxes

```jsx
// "Select all" header checkbox; individual checkboxes; indeterminate state when partially selected
// Key: indeterminate is a DOM property (not an HTML attribute) — must set via ref
function CheckboxList({ items }) {
  const [selected, setSelected] = useState(new Set());
  const headerRef = useRef();

  const allSelected = selected.size === items.length;
  const someSelected = selected.size > 0 && !allSelected;

  // indeterminate cannot be set via JSX — must use the DOM property directly
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      <label style={{ fontWeight: 'bold' }}>
        <input
          type="checkbox"
          ref={headerRef}
          checked={allSelected}
          onChange={toggleAll}
        />
        {' '}Select All ({selected.size}/{items.length})
      </label>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggleOne(item.id)}
              />
              {' '}{item.name}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 30. Resizable Panels

```jsx
// Two side-by-side panels with a draggable divider
// Key: track mousedown on divider, then mousemove on document (not divider), cleanup on mouseup
function ResizablePanels({ left, right, initialSplit = 50 }) {
  const [split, setSplit] = useState(initialSplit); // percentage
  const containerRef = useRef();
  const dragging = useRef(false);

  const onMouseDown = (e) => {
    dragging.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newSplit = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(Math.max(newSplit, 10), 90)); // clamp 10%–90%
    };
    const onMouseUp = () => { dragging.current = false; };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'flex', height: '100%', userSelect: 'none' }}>
      <div style={{ width: `${split}%`, overflow: 'auto' }}>{left}</div>
      <div
        onMouseDown={onMouseDown}
        style={{ width: 6, background: '#ccc', cursor: 'col-resize', flexShrink: 0 }}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>{right}</div>
    </div>
  );
}

// Usage:
// <ResizablePanels left={<FileTree />} right={<Editor />} initialSplit={30} />
```

---

## Quick Reference — What Interviewers Watch For

| Thing they check | What to say/do |
|---|---|
| Unique keys in lists | Always use stable IDs, not array index (unless the list is static and never reordered) |
| Cleanup in useEffect | Return a cleanup fn for timers, listeners, subscriptions, and AbortControllers |
| Stale closures | Store mutable values in `useRef`; use functional setState `(prev) => ...` |
| Controlled inputs | Keep value in state, pass `onChange` — never mix controlled + uncontrolled |
| Avoid unnecessary re-renders | `useMemo` for derived data, `useCallback` for callbacks passed to children, `React.memo` on children |
| Event delegation | Prefer handlers on the list container, not each item, for huge lists |
| Accessibility | Add `aria-*` attributes, `role`, keyboard handlers (`Enter`, `Escape`, `ArrowUp/Down`) |
| Loading + error states | Always handle both, even with mock data |

---

## Common Follow-up Questions After Live Coding

- *"How would you make this more performant?"* → useMemo, useCallback, React.memo, virtualization
- *"What if the list has 10,000 items?"* → Virtual list (windowing), pagination
- *"How would you test this?"* → React Testing Library: `render`, `userEvent`, `screen.getByRole`
- *"How would you lift this to global state?"* → Context + useReducer, or Zustand/Redux
- *"What about server state?"* → React Query / SWR instead of manual useFetch
