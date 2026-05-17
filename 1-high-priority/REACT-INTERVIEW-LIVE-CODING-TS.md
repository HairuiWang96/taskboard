# React + TypeScript — Live Coding Interview Cheatsheet

**Purpose: Write these from memory in a real interview. Partial but correct is better than full but wrong.**

> TypeScript additions to watch for: prop interfaces, generic hooks, event types, discriminated unions for reducers, `ReactNode`, `RefObject`.

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

```tsx
// Generic hook — T lets it work for strings, numbers, objects, etc.
// Delays updating the value until user stops typing for `delay` ms
function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// Usage:
// const debouncedSearch = useDebounce<string>(query, 500);
```

---

### useLocalStorage

```tsx
// Generic hook — T is the stored value type
// Key insight: read initial value from localStorage, write on every change
function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStored = (newValue: T): void => {
    setValue(newValue);
    localStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, setStored];
}

// Usage:
// const [theme, setTheme] = useLocalStorage<string>('theme', 'light');
```

---

### useToggle

```tsx
// Return tuple typed explicitly so TS doesn't widen to (boolean | ((val?: boolean) => void))[]
function useToggle(initial: boolean = false): [boolean, (val?: boolean) => void] {
  const [state, setState] = useState<boolean>(initial);

  const toggle = useCallback((val?: boolean): void => {
    setState(typeof val === 'boolean' ? val : (prev) => !prev);
  }, []);

  return [state, toggle];
}

// Usage:
// const [open, toggleOpen] = useToggle();
```

---

### useWindowSize

```tsx
interface WindowSize {
  width: number;
  height: number;
}

function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handler = (): void =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return size;
}
```

---

### usePrevious

```tsx
// T | undefined because on the very first render there is no previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value; // runs AFTER render — ref holds previous render's value
  });
  return ref.current;
}

// Usage:
// const prevCount = usePrevious<number>(count);
```

---

### useClickOutside

```tsx
// RefObject<HTMLElement> — the ref can be attached to any HTML element
function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  callback: () => void
): void {
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, callback]);
}

// Usage:
// const ref = useRef<HTMLDivElement>(null);
// useClickOutside(ref, () => setOpen(false));
// <div ref={ref}>...</div>
```

---

## 2. Search / Debounce

```tsx
// Typed result shape — in a real interview, define just enough to make it compile
interface SearchResult {
  id: number;
  name: string;
}

function SearchBox(): JSX.Element {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const debouncedQuery = useDebounce<string>(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json() as Promise<SearchResult[]>)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  return (
    <div>
      <input
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {loading && <p>Loading...</p>}
      <ul>
        {results.map((item) => <li key={item.id}>{item.name}</li>)}
      </ul>
    </div>
  );
}
```

---

## 3. Autocomplete / Typeahead

```tsx
interface AutocompleteProps {
  options: string[];
}

function Autocomplete({ options }: AutocompleteProps): JSX.Element {
  const [query, setQuery] = useState<string>('');
  const [open, setOpen] = useState<boolean>(false);
  const [highlighted, setHighlighted] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    if (e.key === 'ArrowUp')   setHighlighted((h) => Math.max(h - 1, 0));
    if (e.key === 'Enter') { setQuery(filtered[highlighted]); setOpen(false); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setQuery(e.target.value); setOpen(true); setHighlighted(0);
        }}
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

```tsx
interface ListItem {
  id: number;
  name: string;
}

interface PageResponse {
  items: ListItem[];
  hasMore: boolean;
}

function InfiniteList(): JSX.Element {
  const [items, setItems] = useState<ListItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async (): Promise<void> => {
    if (loading || !hasMore) return;
    setLoading(true);
    const res = await fetch(`/api/items?page=${page}`);
    const data: PageResponse = await res.json();
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
      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
}
```

---

## 5. Accordion

```tsx
interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
}

function Accordion({ items }: AccordionProps): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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

// Multiple open variant:
// const [openSet, setOpenSet] = useState<Set<number>>(new Set());
// const toggle = (i: number) => setOpenSet(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
```

---

## 6. Tabs

```tsx
interface Tab {
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
}

function Tabs({ tabs }: TabsProps): JSX.Element {
  const [active, setActive] = useState<number>(0);

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

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps): JSX.Element | null {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onMouseDown={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 8, padding: 24, minWidth: 320 }}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ float: 'right' }}>✕</button>
        {children}
      </div>
    </div>,
    document.body
  );
}
```

---

## 8. Todo List

```tsx
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

function TodoApp(): JSX.Element {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState<string>('');

  const add = (): void => {
    if (!input.trim()) return;
    setTodos((prev) => [...prev, { id: Date.now(), text: input.trim(), done: false }]);
    setInput('');
  };

  const toggle = (id: number): void =>
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  const remove = (id: number): void =>
    setTodos((prev) => prev.filter((t) => t.id !== id));

  return (
    <div>
      <input
        value={input}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && add()}
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

```tsx
interface StarRatingProps {
  max?: number;
  onChange?: (rating: number) => void;
}

function StarRating({ max = 5, onChange }: StarRatingProps): JSX.Element {
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);

  const displayed = hovered || rating;

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

```tsx
interface PaginatedItem {
  id: number;
  name: string;
}

interface PaginatedProps {
  data: PaginatedItem[];
  pageSize?: number;
}

function Paginated({ data, pageSize = 10 }: PaginatedProps): JSX.Element {
  const [page, setPage] = useState<number>(1);
  const totalPages = Math.ceil(data.length / pageSize);

  const currentItems = useMemo<PaginatedItem[]>(
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
          <button key={p} onClick={() => setPage(p)} style={{ fontWeight: p === page ? 'bold' : 'normal' }}>
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

```tsx
interface FormState {
  email: string;
  password: string;
}

// Partial so we only set the fields that have errors
type FormErrors = Partial<Record<keyof FormState, string>>;

function SignupForm(): JSX.Element {
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.email.includes('@')) errs.email = 'Invalid email';
    if (form.password.length < 8) errs.password = 'Min 8 characters';
    return errs;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
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

```tsx
interface CountdownProps {
  initialSeconds?: number;
}

function Countdown({ initialSeconds = 60 }: CountdownProps): JSX.Element {
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [running, setRunning] = useState<boolean>(false);
  // ReturnType<typeof setInterval> is `number` in browsers, `NodeJS.Timeout` in Node — use ReturnType to avoid the conflict
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = (): void => {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(intervalRef.current!); setRunning(false); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const pause = (): void => {
    clearInterval(intervalRef.current!);
    setRunning(false);
  };

  const reset = (): void => {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setSeconds(initialSeconds);
  };

  useEffect(() => () => clearInterval(intervalRef.current!), []);

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

```tsx
interface DragItem {
  id: number;
  name: string;
}

interface DragListProps {
  initialItems: DragItem[];
}

function DragList({ initialItems }: DragListProps): JSX.Element {
  const [items, setItems] = useState<DragItem[]>(initialItems);
  const dragIndex = useRef<number | null>(null);

  const onDragStart = (i: number): void => { dragIndex.current = i; };

  const onDrop = (targetIndex: number): void => {
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
          onDragOver={(e: React.DragEvent) => e.preventDefault()}
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

```tsx
interface VirtualListProps {
  items: string[];
  itemHeight?: number;
  containerHeight?: number;
}

function VirtualList({ items, itemHeight = 40, containerHeight = 400 }: VirtualListProps): JSX.Element {
  const [scrollTop, setScrollTop] = useState<number>(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
      onScroll={(e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
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

```tsx
// Generic T — caller decides what shape the data is
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useFetch<T>(url: string | null): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });

    fetch(url, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json() as Promise<T>; })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setState({ data: null, loading: false, error: err.message });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}

// Usage:
// interface User { id: number; name: string; }
// const { data, loading, error } = useFetch<User[]>('/api/users');
```

---

## 16. useReducer — Shopping Cart

```tsx
interface Product {
  id: number;
  name: string;
  price: number;
}

interface CartItem extends Product {
  qty: number;
}

// Discriminated union — TS narrows action.item / action.id based on type
type CartAction =
  | { type: 'ADD'; item: Product }
  | { type: 'REMOVE'; id: number }
  | { type: 'CLEAR' };

const cartReducer = (state: CartItem[], action: CartAction): CartItem[] => {
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
  }
};

interface CartProps {
  products: Product[];
}

function Cart({ products }: CartProps): JSX.Element {
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

```tsx
type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
}

type ThemeAction =
  | { type: 'TOGGLE' }
  | { type: 'SET'; mode: ThemeMode };

interface ThemeContextValue {
  theme: ThemeState;
  dispatch: React.Dispatch<ThemeAction>;
}

// createContext<T | null>(null) is the idiomatic pattern — guard with the custom hook
const ThemeContext = createContext<ThemeContextValue | null>(null);

const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'TOGGLE': return { ...state, mode: state.mode === 'light' ? 'dark' : 'light' };
    case 'SET':    return { ...state, mode: action.mode };
  }
};

function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [theme, dispatch] = useReducer(themeReducer, { mode: 'light' });
  const value = useMemo<ThemeContextValue>(() => ({ theme, dispatch }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

// Usage:
// const { theme, dispatch } = useTheme();
// dispatch({ type: 'SET', mode: 'dark' }); // TS enforces mode is 'light' | 'dark'
```

---

## 18. Error Boundary

```tsx
// Error Boundaries MUST be class components — hooks cannot catch render errors
interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

// Usage:
// <ErrorBoundary fallback={<p>Oops!</p>}>
//   <MyComponent />
// </ErrorBoundary>
```

---

## 19. OTP / PIN Input

```tsx
interface OTPInputProps {
  length?: number;
  onComplete?: (value: string) => void;
}

function OTPInput({ length = 6, onComplete }: OTPInputProps): JSX.Element {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>): void => {
    const char = e.target.value.replace(/\D/, '').slice(-1);
    const next = [...values];
    next[i] = char;
    setValues(next);
    if (char && i < length - 1) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) onComplete?.(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !values[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const next = [...values];
    [...pasted].forEach((c, i) => { next[i] = c; });
    setValues(next);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
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

```tsx
// Generic T constrained to objects with string keys — works for any row shape
interface Column<T> {
  key: keyof T;
  label: string;
}

type SortDirection = 'asc' | 'desc';

interface SortState<T> {
  key: keyof T | null;
  direction: SortDirection;
}

interface SortableTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
}

function SortableTable<T extends Record<string, unknown>>({ data, columns }: SortableTableProps<T>): JSX.Element {
  const [sort, setSort] = useState<SortState<T>>({ key: null, direction: 'asc' });

  const sorted = useMemo<T[]>(() => {
    if (!sort.key) return data;
    return [...data].sort((a, b) => {
      const [av, bv] = [a[sort.key!], b[sort.key!]];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sort]);

  const handleSort = (key: keyof T): void => {
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
              key={String(col.key)}
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
              <td key={String(col.key)} style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                {String(row[col.key])}
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

```tsx
const STEPS = ['Personal', 'Address', 'Review'] as const;

interface WizardFormState {
  name: string;
  email: string;
  street: string;
  city: string;
}

type WizardFormErrors = Partial<Record<keyof WizardFormState, string>>;

function WizardForm(): JSX.Element {
  const [step, setStep] = useState<number>(0);
  const [form, setForm] = useState<WizardFormState>({ name: '', email: '', street: '', city: '' });
  const [errors, setErrors] = useState<WizardFormErrors>({});

  const update = (field: keyof WizardFormState, value: string): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep = (): boolean => {
    const errs: WizardFormErrors = {};
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

  const next = (): void => { if (validateStep()) setStep((s) => s + 1); };
  const back = (): void => setStep((s) => s - 1);
  const submit = (): void => { console.log('Final form:', form); };

  return (
    <div>
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

```tsx
interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

interface Coords {
  top: number;
  left: number;
}

function Tooltip({ text, children }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState<boolean>(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = (): void => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.top + window.scrollY - 8,
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setVisible(true);
  };

  return (
    <>
      <span ref={triggerRef} onMouseEnter={show} onMouseLeave={() => setVisible(false)} style={{ display: 'inline-block' }}>
        {children}
      </span>
      {visible && ReactDOM.createPortal(
        <div style={{
          position: 'absolute', top: coords.top, left: coords.left,
          transform: 'translate(-50%, -100%)', background: '#333', color: 'white',
          padding: '4px 8px', borderRadius: 4, fontSize: 12, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 9999,
        }}>
          {text}
        </div>,
        document.body
      )}
    </>
  );
}
```

---

## 23. Dropdown Menu

```tsx
interface MenuItem {
  label: string;
  onClick: () => void;
}

interface DropdownMenuProps {
  label: string;
  items: MenuItem[];
}

function DropdownMenu({ label, items }: DropdownMenuProps): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} onKeyDown={handleKey}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open}>
        {label} {open ? '▲' : '▼'}
      </button>
      {open && (
        <ul role="menu" style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #ccc', borderRadius: 4, listStyle: 'none', margin: 0, padding: 4, minWidth: 140, zIndex: 100 }}>
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

```tsx
interface LikeButtonProps {
  postId: number;
  initialLikes: number;
}

function LikeButton({ postId, initialLikes }: LikeButtonProps): JSX.Element {
  const [likes, setLikes] = useState<number>(initialLikes);
  const [liked, setLiked] = useState<boolean>(false);

  const handleLike = async (): Promise<void> => {
    const prevLikes = likes;
    const prevLiked = liked;
    setLikes((l) => l + (liked ? -1 : 1));
    setLiked((l) => !l);

    try {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    } catch {
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

```tsx
// null delay = paused; number delay = running
function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Usage — self-updating clock:
// function Clock(): JSX.Element {
//   const [time, setTime] = useState<Date>(new Date());
//   useInterval(() => setTime(new Date()), 1000);
//   return <p>{time.toLocaleTimeString()}</p>;
// }
```

---

## 26. useMediaQuery

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent): void => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Usage:
// const isMobile = useMediaQuery('(max-width: 768px)');
// const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
```

---

## 27. Lazy Image (IntersectionObserver)

```tsx
// Omit src so we control when it gets applied; spread remaining img props
type LazyImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
};

function LazyImage({ src, alt, style, ...props }: LazyImageProps): JSX.Element {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imgRef.current) {
          imgRef.current.src = src;
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
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s', background: '#eee', ...style }}
      {...props}
    />
  );
}
```

---

## 28. Copy to Clipboard Button

```tsx
interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Copy failed — check browser permissions');
    }
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <button onClick={handleCopy} style={{ minWidth: 80 }}>
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  );
}
```

---

## 29. Select All Checkboxes

```tsx
interface CheckboxItem {
  id: number;
  name: string;
}

interface CheckboxListProps {
  items: CheckboxItem[];
}

function CheckboxList({ items }: CheckboxListProps): JSX.Element {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const headerRef = useRef<HTMLInputElement>(null);

  const allSelected = selected.size === items.length;
  const someSelected = selected.size > 0 && !allSelected;

  // indeterminate is a DOM property, not an HTML attribute — must set via ref
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = (): void => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  };

  const toggleOne = (id: number): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      <label style={{ fontWeight: 'bold' }}>
        <input type="checkbox" ref={headerRef} checked={allSelected} onChange={toggleAll} />
        {' '}Select All ({selected.size}/{items.length})
      </label>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} />
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

```tsx
interface ResizablePanelsProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialSplit?: number; // percentage 0–100
}

function ResizablePanels({ left, right, initialSplit = 50 }: ResizablePanelsProps): JSX.Element {
  const [split, setSplit] = useState<number>(initialSplit);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<boolean>(false);

  const onMouseDown = (e: React.MouseEvent): void => {
    dragging.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newSplit = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(Math.max(newSplit, 10), 90));
    };
    const onMouseUp = (): void => { dragging.current = false; };

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
      <div onMouseDown={onMouseDown} style={{ width: 6, background: '#ccc', cursor: 'col-resize', flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'auto' }}>{right}</div>
    </div>
  );
}
```

---

## TypeScript-Specific Patterns to Remember

| Pattern | When to use | Example |
|---|---|---|
| `interface Props` | Define component props | `interface ButtonProps { label: string; onClick: () => void }` |
| Discriminated union for actions | Reducer action types | `type Action = \| { type: 'ADD'; item: T } \| { type: 'CLEAR' }` |
| Generic hooks `<T>` | Hooks that work on any data shape | `useFetch<User[]>`, `useDebounce<string>` |
| `React.ReactNode` | Children, content slots, fallbacks | `children: React.ReactNode` |
| `React.ChangeEvent<HTMLInputElement>` | Input onChange | `(e: React.ChangeEvent<HTMLInputElement>) => void` |
| `React.KeyboardEvent<HTMLElement>` | onKeyDown handlers | `(e: React.KeyboardEvent<HTMLInputElement>) => void` |
| `React.FormEvent<HTMLFormElement>` | Form onSubmit | `(e: React.FormEvent<HTMLFormElement>) => void` |
| `useRef<HTMLDivElement>(null)` | DOM refs — always `null` initial | `const ref = useRef<HTMLDivElement>(null)` |
| `ReturnType<typeof setTimeout>` | Timer refs — avoids Node vs browser conflict | `useRef<ReturnType<typeof setTimeout> \| null>(null)` |
| `Partial<Record<keyof T, string>>` | Form error maps | `type Errors = Partial<Record<keyof FormState, string>>` |
| `Omit<Props, 'field'>` | Extend native element props | `type LazyImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string }` |
| `as const` | Freeze tuple/array types | `const STEPS = ['A', 'B', 'C'] as const` |

---

## Quick Reference — What Interviewers Watch For

| Thing they check | What to say/do |
|---|---|
| Unique keys in lists | Always use stable IDs, not array index (unless list is static) |
| Cleanup in useEffect | Return a cleanup fn for timers, listeners, AbortControllers |
| Stale closures | Store mutable values in `useRef`; use functional setState `(prev) => ...` |
| Controlled inputs | Keep value in state, pass `onChange` — never mix controlled + uncontrolled |
| Avoid unnecessary re-renders | `useMemo` for derived data, `useCallback` for callbacks, `React.memo` on children |
| TS: no `any` | Use generics, `unknown`, or proper interfaces instead |
| TS: event types | Always type event params — don't leave them as implicit `any` |
| Loading + error states | Always handle both, even with mock data |

---

## Common Follow-up Questions After Live Coding

- *"How would you make this more performant?"* → `useMemo`, `useCallback`, `React.memo`, virtualization
- *"What if the list has 10,000 items?"* → Virtual list (windowing), pagination
- *"How would you test this?"* → React Testing Library: `render`, `userEvent`, `screen.getByRole`
- *"How would you lift this to global state?"* → Context + `useReducer`, or Zustand/Redux
- *"What about server state?"* → React Query / SWR instead of manual `useFetch`
- *"Why `interface` over `type`?"* → Interfaces are extendable and give better error messages for objects; `type` for unions/intersections
