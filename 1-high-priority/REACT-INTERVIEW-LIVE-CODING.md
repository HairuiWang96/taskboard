# React — Live Coding Interview Cheat sheet

**Purpose: Write these from memory in a real interview. Partial but correct is better than full but wrong.**

> Most interviewers ask for: custom hooks, classic UI components, and state management patterns.
> They want to see: clean logic, correct hook usage, edge case awareness.

---

## Table of Contents

- [React — Live Coding Interview Cheat sheet](#react--live-coding-interview-cheat-sheet)
    - [Table of Contents](#table-of-contents)
    - [1. Custom Hooks](#1-custom-hooks)
        - [useDebounce](#usedebounce)
        - [useLocalStorage](#uselocalstorage)
        - [useToggle](#usetoggle)
        - [useWindowSize](#usewindowsize)
        - [usePrevious](#useprevious)
        - [useClickOutside](#useclickoutside)
    - [2. Search / Debounce](#2-search--debounce)
    - [3. Autocomplete / Typeahead](#3-autocomplete--typeahead)
    - [4. Infinite Scroll](#4-infinite-scroll)
    - [5. Accordion](#5-accordion)
    - [6. Tabs](#6-tabs)
    - [7. Modal](#7-modal)
    - [8. Todo List](#8-todo-list)
    - [9. Star Rating](#9-star-rating)
    - [10. Pagination](#10-pagination)
    - [11. Form with Validation](#11-form-with-validation)
    - [12. Timer / Countdown](#12-timer--countdown)
    - [13. Drag and Drop (basic)](#13-drag-and-drop-basic)
    - [14. Virtual List (windowing)](#14-virtual-list-windowing)
    - [15. useFetch](#15-usefetch)
    - [16. useReducer — Shopping Cart](#16-usereducer--shopping-cart)
    - [17. Context + useReducer — Theme Provider](#17-context--usereducer--theme-provider)
    - [18. Error Boundary](#18-error-boundary)
    - [19. OTP / PIN Input](#19-otp--pin-input)
    - [20. Sortable Table](#20-sortable-table)
    - [21. Multi-step Wizard Form](#21-multi-step-wizard-form)
    - [22. Tooltip](#22-tooltip)
    - [23. Dropdown Menu](#23-dropdown-menu)
    - [24. Optimistic UI Update](#24-optimistic-ui-update)
    - [25. useInterval](#25-useinterval)
    - [26. useMediaQuery](#26-usemediaquery)
    - [27. Lazy Image (IntersectionObserver)](#27-lazy-image-intersectionobserver)
    - [28. Copy to Clipboard Button](#28-copy-to-clipboard-button)
    - [29. Select All Checkboxes](#29-select-all-checkboxes)
    - [30. Resizable Panels](#30-resizable-panels)
    - [Quick Reference — What Interviewers Watch For](#quick-reference--what-interviewers-watch-for)
    - [Common Follow-up Questions After Live Coding](#common-follow-up-questions-after-live-coding)

---

## 1. Custom Hooks

### useDebounce

```jsx
// Delays updating the value until user stops typing for `delay` ms
// Classic use case: search input — avoids firing API on every keystroke
function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);

    // Every time value changes: cleanup kills the old timer, effect sets a new one.
    // Only the last timer survives long enough to fire. That's debouncing.
    //
    // User types "h":
    //   → useEffect runs → sets timer (300ms) to setDebounced("h")
    // User types "e" (before 300ms):
    //   → CLEANUP runs first → clearTimeout(timer)  ← cancels the "h" timer
    //   → useEffect runs again → sets NEW timer (300ms) to setDebounced("he")
    // User types "l" (before 300ms):
    //   → CLEANUP runs first → clearTimeout(timer)  ← cancels the "he" timer
    //   → useEffect runs again → sets NEW timer (300ms) to setDebounced("hel")
    // User stops typing... 300ms passes:
    //   → timer fires → setDebounced("hel") ← only this one actually executes
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

    const setStored = newValue => {
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
    const toggle = useCallback(val => {
        setState(typeof val === 'boolean' ? val : prev => !prev);
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
        const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
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
        const handler = e => {
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
            .then(r => r.json())
            .then(data => setResults(data))
            .finally(() => setLoading(false));
    }, [debouncedQuery]);

    return (
        <div>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search...' />
            {loading && <p>Loading...</p>}
            <ul>
                {results.map(item => (
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

    const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

    const handleKey = e => {
        if (e.key === 'ArrowDown') setHighlighted(h => Math.min(h + 1, filtered.length - 1));
        if (e.key === 'ArrowUp') setHighlighted(h => Math.max(h - 1, 0));
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
                onChange={e => {
                    setQuery(e.target.value);
                    setOpen(true);
                    setHighlighted(0);
                }}
                onKeyDown={handleKey}
                onFocus={() => setOpen(true)} // reopens dropdown when user clicks/tabs back into input
                // Without this, dropdown only opens when typing (via onChange)
                // Scenario: user selected an item (dropdown closed), clicks input again → dropdown reopens
            />
            {open && filtered.length > 0 && (
                <ul style={{ position: 'absolute', background: 'white', border: '1px solid #ccc', listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
                    {filtered.map((item, i) => (
                        <li
                            key={item}
                            style={{ background: i === highlighted ? '#eee' : 'white', padding: '4px 8px', cursor: 'pointer' }}
                            onMouseDown={() => {
                                setQuery(item);
                                setOpen(false);
                            }}
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
        setItems(prev => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setPage(p => p + 1);
        setLoading(false);
    }, [page, loading, hasMore]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) loadMore();
            },
            { threshold: 1 },
        );
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        // sentinelRef.current → the tiny 1px div at the bottom of the list (the "tripwire")
        // observer.observe()  → tells IntersectionObserver to watch it
        // When user scrolls down and the sentinel enters the viewport → loadMore() fires
        //
        // ┌─────────────┐
        // │  Item 1      │
        // │  Item 2      │  ← visible viewport
        // │  Item 3      │
        // └─────────────┘
        //    Item 4
        //    Item 5
        //    <div sentinel/>  ← when user scrolls here into view, loadMore() fires
        //
        // if (sentinelRef.current) is a safety check — make sure DOM node exists before observing
        return () => observer.disconnect();
    }, [loadMore]);

    return (
        <div>
            {items.map(item => (
                <div key={item.id}>{item.name}</div>
            ))}
            {loading && <p>Loading...</p>}
            <div ref={sentinelRef} style={{ height: 1 }} /> {/* invisible sentinel — the tripwire at the bottom */}
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
                    <button style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }} onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                        {item.title}
                        <span style={{ float: 'right' }}>{openIndex === i ? '▲' : '▼'}</span>
                    </button>
                    {openIndex === i && <div style={{ padding: '8px 12px' }}>{item.content}</div>}
                </div>
            ))}
        </div>
    );
}

// Multiple open variant: use a Set or array of open indices
const [openSet, setOpenSet] = useState(new Set());
const toggle = i =>
    setOpenSet(prev => {
        const s = new Set(prev);
        s.has(i) ? s.delete(i) : s.add(i);
        return s;
    });
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
// ‼️ Key: render via portal so it escapes parent stacking context
function Modal({ isOpen, onClose, children }) {
    useEffect(() => {
        const handler = e => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // BACKDROP CLICK FEATURE — uses event bubbling + stopPropagation:
    //
    // ┌──────────────────────────────┐
    // │  dark backdrop (onClose)     │
    // │                              │
    // │    ┌──────────────────┐      │
    // │    │ white content     │      │
    // │    │ (stopPropagation) │      │
    // │    └──────────────────┘      │
    // │                              │
    // └──────────────────────────────┘
    //   click here → closes           click here → stays open
    //
    // Click on backdrop (dark area):
    //   → onMouseDown fires on backdrop → onClose() → modal closes ✓
    // Click on content (white box):
    //   → onMouseDown fires on content → e.stopPropagation() → event STOPS here
    //   → never reaches backdrop → onClose() never called → modal stays open ✓
    return ReactDOM.createPortal(
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onMouseDown={onClose} // ‼️ click backdrop (dark overlay) to close
        >
            <div
                style={{ background: 'white', borderRadius: 8, padding: 24, minWidth: 320 }}
                onMouseDown={e => e.stopPropagation()} // ‼️ stops click from bubbling up to backdrop
            >
                <button onClick={onClose} style={{ float: 'right' }}>
                    ✕
                </button>
                {children}
            </div>
        </div>,
        document.body,
    );
}

// Usage:
const [open, setOpen] = useState(false);
<button onClick={() => setOpen(true)}>Open</button>
<Modal isOpen={open} onClose={() => setOpen(false)}><p>Content</p></Modal>
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
        setTodos(prev => [...prev, { id: Date.now(), text: input.trim(), done: false }]);
        setInput('');
    };

    const toggle = id => setTodos(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));

    const remove = id => setTodos(prev => prev.filter(t => t.id !== id));

    return (
        <div>
            {/* onKeyDown shorthand using && (logical AND):
                e.key === 'Enter' && add()
                Same as: if (e.key === 'Enter') { add(); }
                If left side is false → JS short-circuits, add() never runs
                If left side is true  → JS evaluates right side → add() runs
                So pressing Enter triggers add(), any other key does nothing */}
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder='Add todo...' />
            <button onClick={add}>Add</button>
            <ul>
                {todos.map(todo => (
                    <li key={todo.id} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
                        <input type='checkbox' checked={todo.done} onChange={() => toggle(todo.id)} />
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
// Key: two states — hovered (preview) and selected (committed); ‼️ display hover over selected
function StarRating({ max = 5, onChange }) {
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);

    const displayed = hovered || rating; // hover preview takes priority

    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: max }, (_, i) => i + 1).map(star => (
                <span
                    key={star}
                    style={{ fontSize: 32, cursor: 'pointer', color: star <= displayed ? 'gold' : '#ccc' }}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => {
                        setRating(star);
                        onChange?.(star);
                    }}
                >
                    ★
                </span>
            ))}
        </div>
    );
}
```

<!-- cursor: 'pointer' changes the mouse cursor to a hand icon (👆) when hovering over the element — the same cursor you see when hovering over a link. It signals to the user that the element is clickable.

cursor: 'default'  → normal arrow cursor
cursor: 'pointer'  → hand/finger cursor (clickable)
cursor: 'text'     → I-beam cursor (text input)
cursor: 'grab'     → open hand (draggable)
cursor: 'not-allowed' → circle with line (disabled) -->

---

## 10. Pagination

```jsx
// Page buttons for a list; compute slice from current page + pageSize
// Key: clamp page, derive slice via useMemo, don't mutate data
function Paginated({ data, pageSize = 10 }) {
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(data.length / pageSize);

    const currentItems = useMemo(() => data.slice((page - 1) * pageSize, page * pageSize), [data, page, pageSize]);

    return (
        <div>
            <ul>
                {currentItems.map(item => (
                    <li key={item.id}>{item.name}</li>
                ))}
            </ul>
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                <button onClick={() => setPage(1)} disabled={page === 1}>
                    «
                </button>
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)} style={{ fontWeight: p === page ? 'bold' : 'normal' }}>
                        {p}
                    </button>
                ))}
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                    ›
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                    »
                </button>
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

    const handleChange = e => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' })); // clear error on change
    };

    const handleSubmit = e => {
        e.preventDefault(); // stops browser's default: reload page on form submit
        // Without this: user clicks Submit → browser reloads page → all React state lost
        // With this: page stays put → React handles submission in JavaScript
        const errs = validate();
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }
        console.log('Submit:', form);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <input name='email' value={form.email} onChange={handleChange} placeholder='Email' />
                {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
            </div>
            <div>
                <input name='password' type='password' value={form.password} onChange={handleChange} placeholder='Password' />
                {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
            </div>
            <button type='submit'>Sign Up</button>
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
        // setInterval fires EVERY 1000ms (every second) until clearInterval()
        // vs setTimeout which fires only ONCE. That's why the countdown ticks every second.
        intervalRef.current = setInterval(() => {
            setSeconds(s => {
                if (s <= 1) {
                    clearInterval(intervalRef.current);
                    setRunning(false);
                    return 0;
                }
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

    // padStart(2, '0') pads a string to minimum length 2 with '0':
    //   String(5).padStart(2, '0')   → "05"   ← pads to reach 2 chars
    //   String(12).padStart(2, '0')  → "12"   ← already 2 chars, no padding
    //   Without padStart: "3:5"  ← looks wrong
    //   With padStart:    "03:05" ← proper timer format
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');

    return (
        <div>
            <h2>
                {mins}:{secs}
            </h2>
            <button onClick={start} disabled={running || seconds === 0}>
                Start
            </button>
            <button onClick={pause} disabled={!running}>
                Pause
            </button>
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

    const onDragStart = i => {
        dragIndex.current = i;
    };

    const onDrop = targetIndex => {
        const from = dragIndex.current;
        if (from === null || from === targetIndex) return;
        setItems(prev => {
            const next = [...prev];
            // splice returns an ARRAY of removed items, MUTATES the original array
            //   arr.splice(index, deleteCount) → removes items, returns them as array
            //   arr.splice(index, 0, item)     → inserts item, removes nothing, returns []
            const [moved] = next.splice(from, 1); // remove 1 item at `from`, destructure to get it
            next.splice(targetIndex, 0, moved); // insert it at new position, remove nothing
            return next;
        });
        dragIndex.current = null;
    };

    return (
        <ul style={{ listStyle: 'none', padding: 0 }}>
            {items.map((item, i) => (
                <li key={item.id} draggable onDragStart={() => onDragStart(i)} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(i)} style={{ padding: '8px 12px', margin: '4px 0', background: '#f0f0f0', cursor: 'grab' }}>
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
// HOW A VIRTUAL LIST WORKS:
//
// PROBLEM: rendering 10,000 DOM nodes is slow.
// SOLUTION: only render what's visible (~10-15 items), fake the rest with empty space.
//
// Full list (10,000 items):          Virtual list (only ~10 rendered):
//
// ┌──────────────┐                   ┌──────────────┐
// │ Item 1        │                   │              │ ← empty space (height fakes
// │ Item 2        │                   │              │   all items above viewport)
// │ Item 3        │                   │              │
// │ ...           │                   ├──────────────┤
// │ Item 50       │ ← viewport       │ Item 50       │ ← only these are real DOM nodes
// │ Item 51       │                   │ Item 51       │
// │ Item 52       │                   │ Item 52       │
// │ ...           │                   ├──────────────┤
// │ Item 10000    │                   │              │ ← empty space (height fakes
// └──────────────┘                   └──────────────┘   all items below viewport)
//
// scrollTop = how many pixels the user has scrolled down from the top.
// It's the key to figuring out which items are visible:
//
//   scrollTop = 2000                          // user scrolled 2000px down
//   itemHeight = 40                           // each item is 40px tall
//   startIndex = Math.floor(2000 / 40) = 50   // first visible item is #50
//   visibleCount = Math.ceil(400 / 40) = 10    // container shows 10 items
//   endIndex = 50 + 10 + 1 = 61               // render items 50–60
//
// WHY THREE LAYERS?
//
// LAYER 1 (outer div) — Creates the scrollable window.
//   Without it, there's no scroll. It's a fixed-height frame (400px).
//   Content overflows, so you can scroll. It listens to onScroll to know
//   how far the user has scrolled (scrollTop).
//
// LAYER 2 (spacer div) — Tricks the browser into showing a correct scrollbar.
//   10,000 items × 40px = 400,000px total height.
//   Without this fake height, the scrollbar would look tiny (like only 10 items).
//   The browser sees 400,000px and creates a proportional scrollbar — even though
//   most of that space is empty.
//
//   Without layer 2:                   With layer 2:
//   ┌──────────────┐ ▓ scrollbar       ┌──────────────┐ ░ scrollbar
//   │ Item 50       │ ▓ looks like     │ Item 50       │ ░ looks like
//   │ Item 51       │ ▓ only 10 items  │ Item 51       │ ▓ 10,000 items
//   │ Item 52       │ ▓                │ Item 52       │ ░ (correct!)
//   └──────────────┘                   └──────────────┘
//
// LAYER 3 (positioned div) — Moves the rendered items to the right spot.
//   Without it, items 50-60 would always appear at the top of the spacer.
//   With top: startIndex * itemHeight, they sit exactly where the user scrolled to.
//
// POSITION RELATIVE vs ABSOLUTE here:
//   relative → "I'm positioned normally, but my children can use me as their anchor"
//   absolute → "I'm taken out of normal flow, positioned relative to my nearest relative parent"
//
//   Layer 2: position: relative   ← becomes the anchor point
//     Layer 3: position: absolute ← positions itself inside layer 2
//              top: 2000px        ← 2000px from the top of layer 2 (not the page)
//
//   Without relative on layer 2, the absolute layer 3 would position itself
//   relative to the page — completely wrong position.
//
// OVERFLOW-Y AUTO:
//   overflowY: 'visible' → content spills out (default)
//   overflowY: 'hidden'  → content is clipped, no scrollbar
//   overflowY: 'scroll'  → always shows scrollbar (even if not needed)
//   overflowY: 'auto'    → shows scrollbar ONLY when content overflows
//   Here the container is 400px but spacer is 400,000px. 'auto' means
//   "show a scrollbar because the content doesn't fit."
function VirtualList({ items, itemHeight = 40, containerHeight = 400 }) {
    const [scrollTop, setScrollTop] = useState(0); // tracks how far user has scrolled

    const startIndex = Math.floor(scrollTop / itemHeight); // first visible item index
    const visibleCount = Math.ceil(containerHeight / itemHeight); // how many items fit in viewport
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length); // last visible + 1 buffer
    const visibleItems = items.slice(startIndex, endIndex); // only these get rendered as DOM nodes

    return (
        // LAYER 1: scrollable container — fixed height, captures scrollTop, overflowY auto shows scrollbar
        <div style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }} onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
            {/* LAYER 2: spacer — fakes total height (400,000px) so scrollbar is proportionally correct */}
            <div style={{ height: items.length * itemHeight, position: 'relative' /* anchor for absolute child */ }}>
                {/* LAYER 3: absolute positioned — moves rendered items to correct scroll position */}
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
// Array.from({ length: N }, callback) creates an array of N items using the callback
// callback receives (element, index) — element is undefined here so we use _ to ignore it
// i + 1 because index starts at 0 but we want "Item 1", "Item 2", etc.
const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
<VirtualList items={items} itemHeight={40} containerHeight={400} />;
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
            .then(r => {
                if (!r.ok) throw new Error(r.statusText);
                return r.json();
            })
            .then(data => setState({ data, loading: false, error: null }))
            .catch(err => {
                if (err.name === 'AbortError') return; // ignore cancellations
                setState({ data: null, loading: false, error: err.message });
            });

        return () => controller.abort(); // cancel on unmount or url change
    }, [url]);

    return state;
}

// Usage:
const { data, loading, error } = useFetch('/api/users');
if (loading) return <p>Loading...</p>;
if (error) return <p>Error: {error}</p>;
return (
    <ul>
        {data.map(u => (
            <li key={u.id}>{u.name}</li>
        ))}
    </ul>
);
```

---

## 16. useReducer — Shopping Cart

```jsx
// ‼️ useReducer shines when next state depends on the previous AND action type
// Classic example: cart with add/remove/clear actions
const cartReducer = (state, action) => {
    switch (action.type) {
        case 'ADD': {
            const existing = state.find(i => i.id === action.item.id);
            if (existing) {
                return state.map(i => (i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i));
            }
            return [...state, { ...action.item, qty: 1 }];
        }
        case 'REMOVE':
            return state.filter(i => i.id !== action.id);
        case 'CLEAR':
            return [];
        default:
            return state;
    }
};

function Cart({ products }) {
    const [cart, dispatch] = useReducer(cartReducer, []);
    // dispatch({ type: 'ADD', item: p }) → reducer returns new cart array → re-render triggered
    // On re-render, const total = cart.reduce(...) runs again with the new cart
    // New total is displayed

    // total is NOT state — it's a DERIVED VALUE computed fresh on every render from cart.
    // Every time cart changes (add/remove/clear), the component re-renders,
    // and total is recalculated automatically:
    //
    //   dispatch('ADD')    → cart changes → re-render → total recalculated
    //   dispatch('REMOVE') → cart changes → re-render → total recalculated
    //   dispatch('CLEAR')  → cart = []    → re-render → total = 0
    //
    // No need for a separate useState for total — just derive it from cart on each render.
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

    return (
        <div>
            {products.map(p => (
                <div key={p.id}>
                    {p.name} — ${p.price}
                    <button onClick={() => dispatch({ type: 'ADD', item: p })}>Add to cart</button>
                </div>
            ))}
            <hr />
            <h3>Cart</h3>
            {cart.map(i => (
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

// HOW dispatch AND action WORK TOGETHER:
//
// useReducer gives you:  const [cart, dispatch] = useReducer(cartReducer, []);
//   - cart     → current state (the array of cart items)
//   - dispatch → a function that sends an "action" object to the reducer
//
// An action is just a PLAIN OBJECT you pass to dispatch. You decide its shape.
// Convention: { type: '...', ...extraData }
//
// When you call:  dispatch({ type: 'ADD', item: p })
//
//   Step 1: React calls  cartReducer(currentCart, { type: 'ADD', item: p })
//                                     ↑ state        ↑ action (the object you passed)
//   Step 2: Reducer reads action.type → hits case 'ADD'
//   Step 3: Reducer reads action.item → knows WHICH product to add
//   Step 4: Reducer returns a NEW cart array
//   Step 5: React re-renders with the new cart
//
// dispatch itself doesn't know anything about "ADD" or "item" —
// it just passes WHATEVER OBJECT you give it straight to the reducer as the `action` parameter.
// The reducer is where all the logic lives.
//
// Each action type needs different extra data:
//
//   dispatch({ type: 'ADD', item: p })     → reducer reads action.item (the product to add)
//   dispatch({ type: 'REMOVE', id: i.id }) → reducer reads action.id  (which item to remove)
//   dispatch({ type: 'CLEAR' })            → reducer needs nothing    (just returns [])
//
// The field names (item, id) are NOT special syntax — they're just object properties.
// You could name them anything (e.g. { type: 'ADD', product: p }) as long as
// the reducer reads the same field name (action.product instead of action.item).
```

---

## 17. Context + useReducer — Theme Provider

```jsx
// Context shares state globally without prop drilling
// Pair with useReducer for complex updates; useMemo prevents re-renders on every parent render
const ThemeContext = createContext(null);

const themeReducer = (state, action) => {
    switch (action.type) {
        case 'TOGGLE':
            return { ...state, mode: state.mode === 'light' ? 'dark' : 'light' };
        case 'SET':
            return { ...state, mode: action.mode };
        default:
            return state;
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
const { theme, dispatch } = useTheme();
<button onClick={() => dispatch({ type: 'TOGGLE' })}>Current: {theme.mode}</button>;
```

---

## 18. Error Boundary

```jsx
// Error Boundaries MUST be class components — hooks cannot catch render errors
// Catches errors in: render, lifecycle methods, constructors of children
// ‼️ Does NOT catch: event handlers (use try/catch there), async code, itself
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // ‼️ Update state so next render shows fallback UI
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
<ErrorBoundary fallback={<p>Oops! Try refreshing.</p>}>
    <MyComponent />
</ErrorBoundary>;

// ‼️ React 19+ also has: use(promise) + Suspense for async errors, but class boundary still needed for render errors
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
        // next.every(Boolean) → checks if EVERY slot is filled (no empty strings left)
        //   Boolean('')   → false (empty slot)
        //   Boolean('7')  → true  (filled slot)
        //   ['3','7','','','',''].every(Boolean)      → false (still typing)
        //   ['3','7','1','4','9','2'].every(Boolean)  → true  (all filled!)
        //
        // onComplete?.(next.join('')) → optional chaining ?.() calls onComplete ONLY if
        //   the parent passed that prop. If onComplete is undefined, does nothing instead of crashing.
        //   next.join('') combines the array into one string: ['3','7','1','4','9','2'] → '371492'
        //
        // Full meaning: "If all 6 digits are filled, and the parent gave us an onComplete
        //   callback, call it with the combined PIN string."
        if (next.every(Boolean)) onComplete?.(next.join(''));
    };

    const handleKeyDown = (i, e) => {
        if (e.key === 'Backspace' && !values[i] && i > 0) {
            refs.current[i - 1].focus(); // go back on backspace when empty
        }
    };

    const handlePaste = e => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        const next = [...values];
        [...pasted].forEach((c, i) => {
            next[i] = c;
        });
        setValues(next);
        refs.current[Math.min(pasted.length, length - 1)].focus();
        e.preventDefault();
        // e.preventDefault() stops the browser's DEFAULT paste behavior.
        // Without it, TWO things happen:
        //   1. Your custom paste logic fills in the OTP boxes (what you want)
        //   2. The browser ALSO pastes the text into the focused input (double paste, breaks UI)
        // With it: "I'm handling this myself — browser, don't do your normal paste."
        // Same concept as e.preventDefault() in form submit (stops page reload) —
        // here it stops the browser from pasting on top of your custom logic.
    };

    return (
        <div style={{ display: 'flex', gap: 8 }}>
            {values.map((val, i) => (
                <input
                    key={i}
                    ref={el => (refs.current[i] = el)}
                    value={val}
                    onChange={e => handleChange(i, e)}
                    onKeyDown={e => handleKeyDown(i, e)}
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
    // data: an array of row objects (each row is one object)
    //   data = [
    //     { name: 'Alice', age: 30, city: 'London' },
    //     { name: 'Bob',   age: 25, city: 'Paris' },
    //     { name: 'Carol', age: 35, city: 'Tokyo' },
    //   ]
    //
    // columns: tells the table WHICH keys to display and what header label to show
    //   columns = [
    //     { key: 'name', label: 'Name' },
    //     { key: 'age',  label: 'Age' },
    //     { key: 'city', label: 'City' },
    //   ]
    //
    // data (rows):                          columns (which fields to show):
    // ┌──────────────────────────────┐      ┌──────────────────────────┐
    // │ { name, age, city }  ← row 1│      │ { key: 'name', label }   │
    // │ { name, age, city }  ← row 2│      │ { key: 'age',  label }   │
    // │ { name, age, city }  ← row 3│      │ { key: 'city', label }   │
    // └──────────────────────────────┘      └──────────────────────────┘
    //
    // Renders as:
    // | Name  | Age | City   |   ← column labels
    // |-------|-----|--------|
    // | Alice | 30  | London |   ← data[0]
    // | Bob   | 25  | Paris  |   ← data[1]
    // | Carol | 35  | Tokyo  |   ← data[2]
    //
    // columns exists separately so you can choose NOT to display every field —
    // e.g. if data has `id` but you don't want to show it, just don't include
    // { key: 'id', label: '...' } in columns.
    const [sort, setSort] = useState({ key: null, direction: 'asc' });

    const sorted = useMemo(() => {
        if (!sort.key) return data;
        return [...data].sort((a, b) => {
            const [av, bv] = [a[sort.key], b[sort.key]];
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return sort.direction === 'asc' ? cmp : -cmp;
        });
    }, [data, sort]);

    const handleSort = key => {
        setSort(prev => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
    };

    return (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
                <tr>
                    {columns.map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer', padding: '8px 12px', borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                            {col.label}
                            {sort.key === col.key ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {sorted.map((row, i) => (
                    <tr key={i}>
                        {columns.map(col => (
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
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
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

    const next = () => {
        if (validateStep()) setStep(s => s + 1);
    };
    const back = () => setStep(s => s - 1);
    const submit = () => {
        console.log('Final form:', form);
    };

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
                    <input placeholder='Name' value={form.name} onChange={e => update('name', e.target.value)} />
                    {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
                    <input placeholder='Email' value={form.email} onChange={e => update('email', e.target.value)} />
                    {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
                </div>
            )}

            {step === 1 && (
                <div>
                    <input placeholder='Street' value={form.street} onChange={e => update('street', e.target.value)} />
                    {errors.street && <span style={{ color: 'red' }}>{errors.street}</span>}
                    <input placeholder='City' value={form.city} onChange={e => update('city', e.target.value)} />
                    {errors.city && <span style={{ color: 'red' }}>{errors.city}</span>}
                </div>
            )}

            {step === 2 && (
                <div>
                    <p>
                        <strong>Name:</strong> {form.name}
                    </p>
                    <p>
                        <strong>Email:</strong> {form.email}
                    </p>
                    <p>
                        <strong>Address:</strong> {form.street}, {form.city}
                    </p>
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
// ‼️ Key: useRef for the trigger, show/hide with state, portal to avoid overflow clipping
function Tooltip({ text, children }) {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef();

    const show = () => {
        const rect = triggerRef.current.getBoundingClientRect();
        // rect.top  → distance from element to the TOP of the viewport (what you see on screen)
        // window.scrollY → how far the page is scrolled down
        // Adding them converts viewport position → PAGE position
        // ‼️ (because the tooltip is position: absolute relative to document.body, not the viewport)
        // - 8 → nudges it 8px above the element so there's a small gap
        //
        //   Without scrollY:                 With scrollY:
        //   ┌─ viewport ─────┐              Page is 500px scrolled down
        //   │                 │              rect.top says 200 (from viewport top)
        //   │   element       │              But real page position = 200 + 500 = 700
        //   └─────────────────┘
        //
        // rect.left + window.scrollX → same idea, converts to page position horizontally
        // + rect.width / 2 → moves to the HORIZONTAL CENTER of the trigger element
        //
        //   ┌── trigger button ──┐
        //   |←── rect.width ────→|
        //   |      ↑ center       |
        //          rect.left + rect.width / 2
        //
        // This is paired with transform: 'translate(-50%, -100%)' on the tooltip itself,
        // which shifts it left by half its own width (centering it) and up by its full
        // height (placing it above the anchor point).
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
            {/* createPortal renders a React component into a DIFFERENT DOM node than its parent —
                here it renders the tooltip into document.body instead of inside the trigger's DOM tree.

                WHY? Without it, the tooltip is a child of the trigger element.
                If any parent has overflow: hidden or a z-index stacking context,
                the tooltip gets CLIPPED or HIDDEN:

                Without portal:                    With portal:

                <div style="overflow: hidden">     <div style="overflow: hidden">
                  <span>Trigger</span>               <span>Trigger</span>
                  ┌──────────┐                     </div>
                  │ tooltip  │  ← CLIPPED!
                  └──────────┘                     <body>
                </div>                               ┌──────────┐
                                                     │ tooltip  │  ← renders here, escapes overflow
                                                     └──────────┘
                                                   </body>

                The tooltip is still a React child (gets same context, events bubble normally),
                but in the DOM it lives directly under <body>, so nothing can clip it. */}
            {visible &&
                ReactDOM.createPortal(
                    <div
                        style={{
                            position: 'absolute',
                            top: coords.top,
                            left: coords.left,
                            // translate(-50%, -100%) shifts the tooltip relative to ITS OWN SIZE:
                            //   -50% horizontally → moves left by half its own width (centers it over anchor)
                            //   -100% vertically  → moves up by its full height (places it above anchor)
                            //
                            //   Without translate:              With translate(-50%, -100%):
                            //
                            //   anchor point (coords)                    anchor point (coords)
                            //   ↓                                        ↓
                            //   ┌──────────────┐                ┌──────────────┐
                            //   │   tooltip     │               │   tooltip     │
                            //   └──────────────┘                └──────────────┘
                            //   ^ top-left corner at anchor     ^ centered above anchor
                            transform: 'translate(-50%, -100%)',
                            background: '#333',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            zIndex: 9999,
                        }}
                    >
                        {text}
                    </div>,
                    document.body,
                )}
        </>
    );
}

// Usage:
<Tooltip text='This is a tooltip'>
    <button>Hover me</button>
</Tooltip>;
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

    const handleKey = e => {
        if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} onKeyDown={handleKey}>
            <button onClick={() => setOpen(o => !o)} aria-haspopup='true' aria-expanded={open}>
                {label} {open ? '▲' : '▼'}
            </button>
            {/* position: 'absolute' → positions relative to nearest position: 'relative' parent
                The PARENT here is the outer <div> above (line with position: 'relative'),
                NOT the <button>. The button is just content inside the div.

                top: '100%' → 100% of the PARENT DIV's height down from the div's top edge.
                Since the button is the only content inside the div, the div's height = button's height.
                So top: 100% = bottom of the div = visually right below the button.

                left: 0 → align to the left edge of the parent div

                <div> (position: relative) ← THIS is the parent, the positioning anchor
                ┌──────────────────┐  ← top: 0% of the div
                │                  │
                │  <button>        │  ← button is inside the div, stretches it
                │                  │
                └──────────────────┘  ← top: 100% of the div (= bottom edge)
                ┌──────────────────┐
                │  <ul> dropdown   │  ← absolute, top: 100% = starts at div's bottom
                │  Edit            │
                │  Delete          │
                └──────────────────┘

                It's NOT 100% of the button — it's 100% of the position: relative div.
                They just happen to be the same height because the button is the only
                thing inside the div.

                Unlike the Tooltip which uses createPortal, the dropdown doesn't need a portal
                because it's positioned directly under the button, so overflow: hidden on
                ancestors is less likely to be an issue. */}
            {open && (
                <ul role='menu' style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #ccc', borderRadius: 4, listStyle: 'none', margin: 0, padding: 4, minWidth: 140, zIndex: 100 }}>
                    {items.map((item, i) => (
                        <li key={i} role='none'>
                            <button
                                role='menuitem'
                                onClick={() => {
                                    item.onClick();
                                    setOpen(false);
                                }}
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
        setLikes(l => l + (liked ? -1 : 1));
        setLiked(l => !l);

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
// ‼️ Like setInterval but React-safe: updates callback without restarting the interval
// Key: store callback in a ref so the interval always calls the latest version
// Classic Dan Abramov pattern — prevents stale closure issues

// THE PROBLEM: how do you update what the interval does without restarting it?
//
// Without ref (broken):
//   useEffect(() => {
//       const id = setInterval(callback, delay);
//       return () => clearInterval(id);
//   }, [callback, delay]);  ← restarts interval every time callback changes!
//   Every render recreates the callback function, so the interval is CLEARED and RESTARTED.
//   Your 1-second timer keeps resetting to 0.

// With ref (the fix):
//   function useInterval(callback, delay) {
//       const savedCallback = useRef(callback);  // box that holds the latest callback
//
//       // Step 1: update the box on every render (no interval restart)
//       useEffect(() => {
//           savedCallback.current = callback;
//       }, [callback]);
//
//       // Step 2: interval runs forever, reads from the box each tick
//       useEffect(() => {
//           const id = setInterval(() => savedCallback.current(), delay);
//           //                        ↑ doesn't call callback directly!
//           //                          calls whatever is CURRENTLY in the box
//           return () => clearInterval(id);
//       }, [delay]);  // ← only restarts if delay changes, NOT when callback changes
//   }

// THE FIX: use a ref as a "mailbox" — update what's inside without restarting the interval.
//
//   Render 1:  callback = () => setCount(1)
//              savedCallback.current = () => setCount(1)   ← put in mailbox
//
//   Render 2:  callback = () => setCount(2)
//              savedCallback.current = () => setCount(2)   ← update mailbox
//
//   Render 3:  callback = () => setCount(3)
//              savedCallback.current = () => setCount(3)   ← update mailbox
//
//   Meanwhile, the setInterval NEVER restarted. It just keeps running,
//   and each tick it opens the mailbox: savedCallback.current()
//   → always gets the LATEST callback without restarting the timer.

//
// ‼️ Key insight: updating a ref does NOT cause a re-render or restart the effect.
// So the interval keeps ticking uninterrupted, but always calls the freshest callback.
function useInterval(callback, delay) {
    const savedCallback = useRef(callback); // the "mailbox" that holds the latest callback

    // Step 1: update the mailbox on every render (no interval restart)
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Step 2: interval runs forever, reads from the mailbox each tick
    useEffect(() => {
        if (delay === null) return; // null delay = paused
        const id = setInterval(() => savedCallback.current(), delay);
        //                        ↑ doesn't call callback directly!
        //                          calls whatever is CURRENTLY in the mailbox
        return () => clearInterval(id);
    }, [delay]); // ← only restarts if delay changes, NOT when callback changes
}

// Usage — self-updating clock:
function Clock() {
    const [time, setTime] = useState(new Date());
    useInterval(() => setTime(new Date()), 1000);
    return <p>{time.toLocaleTimeString()}</p>;
}

// Pause by passing null:
useInterval(tick, running ? 1000 : null);

// HOW does the callback change and WHY does it change?
//
// ‼️ JavaScript creates a NEW FUNCTION OBJECT on every render,
// even if the code inside looks identical:
//
//   function Clock() {
//       const [time, setTime] = useState(new Date());
//
//       // This line runs on EVERY render.
//       // Each render creates a BRAND NEW function object in memory.
//       useInterval(() => setTime(new Date()), 1000);
//   }
//
//   Render 1: () => setTime(new Date())  → function at memory address 0x001
//   Render 2: () => setTime(new Date())  → function at memory address 0x002
//   Render 3: () => setTime(new Date())  → function at memory address 0x003
//
//   Same code inside, but JavaScript sees them as DIFFERENT objects:
//   0x001 === 0x002  → false  (different reference!)
//
// ‼️ WHY does this matter? Because useEffect compares dependencies by reference (===).
// A new function object = different reference = effect re-runs = interval restarts.
//
// A more obvious example where the callback TRULY changes (closures):
//
//   function Counter() {
//       const [count, setCount] = useState(0);
//
//       // This callback CLOSES OVER count — each render captures a different count value
//       useInterval(() => {
//           console.log(`Count is ${count}`);  // count is different each render!
//           setCount(count + 1);
//       }, 1000);
//   }
//
//   Render 1: count = 0 → callback logs "Count is 0"
//   Render 2: count = 1 → callback logs "Count is 1"
//   Render 3: count = 2 → callback logs "Count is 2"
//
//   Without the ref trick, useEffect would see a new callback each time,
//   clear the old interval, start a new one — timer keeps resetting.
//   With the ref, interval keeps ticking, but savedCallback.current
//   always points to the LATEST callback that sees the latest count.
//
// So callbacks change for TWO reasons:
//   1. JavaScript creates a new function object every render — even if the code
//      is identical, the reference is different
//   2. Closures capture different state values — the callback from render 1
//      sees count = 0, render 2 sees count = 1, etc.
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
        const handler = e => setMatches(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

// Usage:
const isMobile = useMediaQuery('(max-width: 768px)');
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
const isLandscape = useMediaQuery('(orientation: landscape)');
```

---

## 27. Lazy Image (IntersectionObserver)

```jsx
// ‼️ Only load image src when it enters the viewport — saves bandwidth on long pages
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
            { threshold: 0.1 },
        );
        if (imgRef.current) observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, [src]);

    return <img ref={imgRef} alt={alt} style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s', background: '#eee', ...props.style }} {...props} />;
}

// Usage:
<LazyImage src='/photos/large.jpg' alt='landscape' width={800} height={600} />;
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
<CopyButton text='npm install react' />;
```

---

## 29. Select All Checkboxes

```jsx
// "Select all" header checkbox; individual checkboxes; indeterminate state when partially selected
// ‼️ Key: indeterminate is a DOM property (not an HTML attribute) — must set via ref
function CheckboxList({ items }) {
    const [selected, setSelected] = useState(new Set());
    const headerRef = useRef();

    const allSelected = selected.size === items.length;
    const someSelected = selected.size > 0 && !allSelected;

    // indeterminate cannot be set via JSX — ‼️ must use the DOM property directly
    useEffect(() => {
        if (headerRef.current) headerRef.current.indeterminate = someSelected;
    }, [someSelected]);

    const toggleAll = () => {
        setSelected(allSelected ? new Set() : new Set(items.map(i => i.id)));
    };

    const toggleOne = id => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <div>
            <label style={{ fontWeight: 'bold' }}>
                <input type='checkbox' ref={headerRef} checked={allSelected} onChange={toggleAll} /> Select All ({selected.size}/{items.length})
            </label>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {items.map(item => (
                    <li key={item.id}>
                        <label>
                            <input type='checkbox' checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} /> {item.name}
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

    const onMouseDown = e => {
        dragging.current = true;
        e.preventDefault();
    };

    useEffect(() => {
        const onMouseMove = e => {
            if (!dragging.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const newSplit = ((e.clientX - rect.left) / rect.width) * 100;
            setSplit(Math.min(Math.max(newSplit, 10), 90)); // clamp 10%–90%
        };
        const onMouseUp = () => {
            dragging.current = false;
        };

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

// Usage:
<ResizablePanels left={<FileTree />} right={<Editor />} initialSplit={30} />;
```

---

## Quick Reference — What Interviewers Watch For

| Thing they check             | What to say/do                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Unique keys in lists         | Always use stable IDs, not array index (unless the list is static and never reordered)               |
| Cleanup in useEffect         | Return a cleanup fn for timers, listeners, subscriptions, and AbortControllers                       |
| Stale closures               | Store mutable values in `useRef`; use functional setState `(prev) => ...`                            |
| Controlled inputs            | Keep value in state, pass `onChange` — never mix controlled + uncontrolled                           |
| Avoid unnecessary re-renders | `useMemo` for derived data, `useCallback` for callbacks passed to children, `React.memo` on children |
| Event delegation             | Prefer handlers on the list container, not each item, for huge lists                                 |
| Accessibility                | Add `aria-*` attributes, `role`, keyboard handlers (`Enter`, `Escape`, `ArrowUp/Down`)               |
| Loading + error states       | Always handle both, even with mock data                                                              |

---

## Common Follow-up Questions After Live Coding

- _"How would you make this more performant?"_ → useMemo, useCallback, React.memo, virtualization
- _"What if the list has 10,000 items?"_ → Virtual list (windowing), pagination
- _"How would you test this?"_ → React Testing Library: `render`, `userEvent`, `screen.getByRole`
- _"How would you lift this to global state?"_ → Context + useReducer, or Zustand/Redux
- _"What about server state?"_ → React Query / SWR instead of manual useFetch
