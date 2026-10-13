# Zustand — Beginner's Guide

**Priority: HIGH**

> A plain-language introduction to Zustand: what it is for, how to make a store, how to read
> and update it, and the few mistakes that cause most beginner bugs.
>
> Assumes you know React hooks (`useState`). No Redux or Context experience needed.

---

## Table of Contents

- [Zustand — Beginner's Guide](#zustand--beginners-guide)
    - [Table of Contents](#table-of-contents)
    - [1. The Problem It Solves](#1-the-problem-it-solves)
    - [2. Setup](#2-setup)
    - [3. Your First Store](#3-your-first-store)
    - [4. Reading State — Selectors](#4-reading-state--selectors)
    - [5. Updating State — `set`](#5-updating-state--set)
    - [6. A Real Example — Shopping Cart](#6-a-real-example--shopping-cart)
    - [7. Using the Store Outside React](#7-using-the-store-outside-react)
    - [8. Saving to localStorage — `persist`](#8-saving-to-localstorage--persist)
    - [9. When to Use Zustand (and When Not)](#9-when-to-use-zustand-and-when-not)
    - [10. Common Beginner Mistakes](#10-common-beginner-mistakes)
    - [11. Cheat Sheet](#11-cheat-sheet)
    - [Related Files](#related-files)

---

## 1. The Problem It Solves

```text
Some data is needed by MANY components that are far apart in the tree:
the logged-in user, the theme, the shopping cart, whether the sidebar is open.

With only useState you have two options, and both get painful:

  PROP DRILLING    Keep the state at the top and pass it down through every
                   component in between — even ones that don't use it.

  REACT CONTEXT    Works, but needs a Provider, and EVERY component using the
                   context re-renders when ANY part of the value changes.

‼️ ZUSTAND IN ONE SENTENCE
   A store is a global object with data + functions to change it. Any component
   can read just the piece it needs with a hook — no Provider, no prop drilling,
   and it only re-renders when THAT piece changes.
```

---

## 2. Setup

```bash
npm install zustand
```

```text
That's it. No Provider to wrap your app in, no config file.‼️
```

---

## 3. Your First Store

```typescript
// stores/counterStore.ts
import { create } from 'zustand';

type CounterState = {
    count: number;
    increase: () => void;
    reset: () => void;
};

// ‼️ Note the extra () after create<CounterState>. This is how TypeScript
// typing works in Zustand — it looks odd, but always write it this way.
export const useCounterStore = create<CounterState>()(set => ({
    // DATA
    count: 0,

    // ACTIONS — functions that change the data
    increase: () => set(state => ({ count: state.count + 1 })),
    reset: () => set({ count: 0 }),
}));
```

```tsx
// Any component, anywhere in the app
function Counter() {
    const count = useCounterStore(state => state.count);
    const increase = useCounterStore(state => state.increase);

    return <button onClick={increase}>Clicked {count} times</button>;
}

function ResetButton() {
    // A completely separate component — same store, same data.
    const reset = useCounterStore(state => state.reset);
    return <button onClick={reset}>Reset</button>;
}
```

```text
WHAT JUST HAPPENED
  create(...)        builds the store and gives back a HOOK (useCounterStore)
  state => ...       a "selector" — picks which piece of the store you want
  set(...)           updates the store; every component using that piece re-renders

‼️ Data and actions live together in one object. Components never change the
   data directly — they call an action, and the action calls set().
```

---

## 4. Reading State — Selectors

```tsx
// ‼️ THE MOST IMPORTANT HABIT: select only what you need.

// GOOD — re-renders only when `count` changes
const count = useCounterStore(state => state.count);

// BAD — no selector, so you get the WHOLE store.
// ‼️ This component now re-renders when ANYTHING in the store changes.
const { count } = useCounterStore();
```

```tsx
// Need several values? Two options.

// Option 1 — one selector per value (simplest, always safe)
const count = useCounterStore(state => state.count);
const increase = useCounterStore(state => state.increase);

// Option 2 — pick several at once with useShallow
import { useShallow } from 'zustand/react/shallow';

const { count, increase } = useCounterStore(
    useShallow(state => ({ count: state.count, increase: state.increase })),
);

// ‼️ Without useShallow, Option 2 BREAKS. The selector builds a new object
// every time, Zustand thinks the value changed, and you get endless re-renders
// ("Maximum update depth exceeded"). Rule: if your selector returns a new
// object or array, wrap it in useShallow.‼️
```

---

## 5. Updating State — `set`

```typescript
// Two ways to call set:

// 1. Pass the new values directly — when you don't need the old state
set({ count: 0 });

// 2. Pass a function — when the new value depends on the old one
set(state => ({ count: state.count + 1 }));
```

```text
‼️ set MERGES — you only pass the fields that change. The rest are kept.

   Store: { count: 5, name: 'Harry' }
   set({ count: 0 })
   Store: { count: 0, name: 'Harry' }    ← name is still there

‼️ BUT it only merges ONE level deep. Nested objects are replaced, not merged:

   Store: { user: { name: 'Harry', age: 30 } }
   set({ user: { name: 'Sam' } })
   Store: { user: { name: 'Sam' } }      ← age is GONE‼️

   Copy the nested object yourself:
   set(state => ({ user: { ...state.user, name: 'Sam' } }))
```

```typescript
// ‼️ Never change state directly. Always make a new object/array.

// WRONG — mutates the existing array; components don't see the change‼️
addItem: item => set(state => {
    state.items.push(item);
    return { items: state.items };
}),

// RIGHT — new array
addItem: item => set(state => ({ items: [...state.items, item] })),
```

---

## 6. A Real Example — Shopping Cart

```typescript
// stores/cartStore.ts
import { create } from 'zustand';

type CartItem = { id: string; name: string; price: number; qty: number };

type CartState = {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'qty'>) => void;
    removeItem: (id: string) => void;
    clear: () => void;
};

export const useCartStore = create<CartState>()(set => ({
    items: [],

    addItem: item =>
        set(state => {
            const existing = state.items.find(i => i.id === item.id);
            if (existing) {
                // Already in the cart → increase qty
                return {
                    items: state.items.map(i => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i)),
                };
            }
            // New item → add with qty 1
            return { items: [...state.items, { ...item, qty: 1 }] };
        }),

    removeItem: id => set(state => ({ items: state.items.filter(i => i.id !== id) })),

    clear: () => set({ items: [] }),
}));
```

```tsx
// Header — only needs the item count
function CartBadge() {
    // ‼️ Computing a number in the selector is fine — numbers compare by value,
    // so this only re-renders when the count actually changes.
    const count = useCartStore(state => state.items.reduce((sum, i) => sum + i.qty, 0));
    return <span>🛒 {count}</span>;
}

// Product page — only needs the action
function AddToCartButton({ product }) {
    // Actions never change, so this component never re-renders because of the cart.
    const addItem = useCartStore(state => state.addItem);
    return <button onClick={() => addItem(product)}>Add to cart</button>;
}

// Cart page — needs the list
function CartPage() {
    const items = useCartStore(state => state.items);
    const removeItem = useCartStore(state => state.removeItem);

    return (
        <ul>
            {items.map(i => (
                <li key={i.id}>
                    {i.name} × {i.qty}
                    <button onClick={() => removeItem(i.id)}>Remove</button>
                </li>
            ))}
        </ul>
    );
}
```

---

## 7. Using the Store Outside React

```typescript
// The hook also has methods you can call from plain JS/TS files —
// API helpers, event handlers, tests. No hook rules apply here.

useCartStore.getState().items;       // read the current value
useCartStore.getState().clear();     // call an action
useCartStore.setState({ items: [] }); // set state directly

// Example — attach the auth token to every request
// ‼️ getState() reads once; it does NOT subscribe or re-render anything.
const token = useAuthStore.getState().token;
fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
```

---

## 8. Saving to localStorage — `persist`

```typescript
// Keep the cart after a page refresh.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create<CartState>()(
    persist(
        set => ({
            items: [],
            addItem: item => set(state => ({ items: [...state.items, { ...item, qty: 1 }] })),
            clear: () => set({ items: [] }),
        }),
        {
            name: 'cart', // the localStorage key‼️ — must be unique per store
        },
    ),
);

// ‼️ Only plain data is saved. Functions (actions) are not stored — they are
// recreated from the code on every load, which is what you want.
```

---

## 9. When to Use Zustand (and When Not)

```text
USE ZUSTAND FOR — data that lives in the browser and many components share
  ✓ Logged-in user / auth token
  ✓ Theme, language, sidebar open/closed
  ✓ Shopping cart, multi-step form progress
  ✓ Anything you'd otherwise pass through 3+ levels of props

DON'T USE IT FOR
  ✗ Data from your API (user list, products, orders)
      → use TanStack Query. It handles loading, caching and refetching,
        which you'd otherwise rebuild by hand in Zustand.‼️
  ✗ State only one component needs (an input's text, a dropdown's open state)
      → plain useState is simpler.

‼️ THE QUICK RULE
   Came from an API?               → TanStack Query
   Used by one component?          → useState
   Shared by many, lives in the UI → Zustand
```

```text
ZUSTAND vs REDUX vs CONTEXT — the short version

  Context   Built into React. Fine for values that rarely change (theme).
            Every consumer re-renders on any change.
  Redux     Powerful, great devtools, lots of structure and boilerplate.
            Common in large existing codebases.
  Zustand   Tiny, almost no boilerplate, no Provider, re-renders only what's
            selected. A common default for new projects.‼️
```

---

## 10. Common Beginner Mistakes

```text
‼️ 1. Calling the hook with no selector.
   useStore() returns the whole store, so the component re-renders on every
   change anywhere. Always pass a selector: useStore(s => s.thing).

‼️ 2. Returning a new object/array from a selector without useShallow.
   useStore(s => ({ a: s.a, b: s.b })) → infinite re-render loop.
   Use one selector per value, or wrap it in useShallow.

‼️ 3. Mutating state.
   state.items.push(x) changes the array in place — React never notices.
   Always create a new array/object: [...state.items, x].

‼️ 4. Expecting set to merge nested objects.
   It merges ONE level only. Spread nested objects yourself:
   set(s => ({ user: { ...s.user, name } })).

‼️ 5. Putting API data in Zustand.
   You end up hand-writing loading flags, caching and refetching.
   That's TanStack Query's job.

‼️ 6. One giant store for everything.
   Make small stores per feature: useAuthStore, useCartStore, useUiStore.
   They're easier to read and test.

‼️ 7. Forgetting the extra () in TypeScript.
   create<State>()(set => ...) — not create<State>(set => ...).
   Without it, type inference breaks in confusing ways.
```

---

## 11. Cheat Sheet

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ── CREATE ────────────────────────────────────────────────────────────────
const useStore = create<State>()(set => ({
    count: 0,
    increase: () => set(s => ({ count: s.count + 1 })), // based on old state
    reset: () => set({ count: 0 }),                      // direct value
}));

// ── READ (in components) ──────────────────────────────────────────────────
const count = useStore(s => s.count);                 // one value
const { a, b } = useStore(useShallow(s => ({ a: s.a, b: s.b }))); // several‼️

// ── OUTSIDE REACT ─────────────────────────────────────────────────────────
useStore.getState().count;          // read
useStore.getState().reset();        // call an action
useStore.setState({ count: 5 });    // write

// ── PERSIST ───────────────────────────────────────────────────────────────
const useStore2 = create<State>()(persist(set => ({ /* ... */ }), { name: 'key' }));

// ── RULES ─────────────────────────────────────────────────────────────────
// 1. Always use a selector
// 2. New object/array from a selector → useShallow
// 3. Never mutate — return new objects/arrays
// 4. set merges one level deep only
// 5. API data → TanStack Query, not Zustand
```

---

## Related Files

- [STATE-MANAGEMENT-DEEP.md](STATE-MANAGEMENT-DEEP.md) — Zustand at senior depth: devtools, slices pattern, Zustand vs Redux
- [TANSTACK-QUERY-BASICS.md](TANSTACK-QUERY-BASICS.md) — the beginner guide for server state, the other half of this picture
- [REACT-DEEP.md](REACT-DEEP.md) — hooks and re-render behaviour
