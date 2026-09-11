# TanStack Query — Beginner's Guide

**Priority: HIGH**

> A plain-language introduction to TanStack Query (formerly React Query): what problem it
> solves, how caching actually works, `useQuery` and `useMutation`, query keys, invalidation,
> and the settings everyone gets wrong the first time.
>
> Assumes you know React hooks (`useState`, `useEffect`). No prior data-fetching library needed.

---

## Table of Contents

1. [The Problem It Solves](#1-the-problem-it-solves)
2. [Server State vs Client State](#2-server-state-vs-client-state)
3. [Setup](#3-setup)
4. [`useQuery` — Reading Data](#4-usequery--reading-data)
5. [Query Keys](#5-query-keys)
6. [`staleTime` vs `gcTime`](#6-staletime-vs-gctime)
7. [`useMutation` — Writing Data](#7-usemutation--writing-data)
8. [Invalidation — Keeping the Cache Fresh](#8-invalidation--keeping-the-cache-fresh)
9. [Dependent & Conditional Queries](#9-dependent--conditional-queries)
10. [Loading & Error States Done Properly](#10-loading--error-states-done-properly)
11. [Pagination](#11-pagination)
12. [Common Beginner Mistakes](#12-common-beginner-mistakes)
13. [Cheat Sheet](#13-cheat-sheet)
14. [Where to Go Next](#14-where-to-go-next)

---

## 1. The Problem It Solves

```typescript
// ── The way everyone writes data fetching at first ────────────────────────
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) return <Spinner />;
  if (error) return <Error />;
  return <div>{user.name}</div>;
}
```

```text
‼️ This works. It is also missing about a dozen things you will eventually need,
   and each one you add by hand makes the component longer and buggier:

  NO CACHING          Navigate away and back → full refetch, spinner again, even
                      though you had the data two seconds ago.

  NO DEDUPLICATION    Three components on the page need the same user? Three
                      identical network requests fire simultaneously.

  RACE CONDITIONS     Change userId from 1 → 2 quickly. Request 1 is slower and
                      lands last. You now display user 1's data while the URL
                      says user 2. This bug is silent and intermittent.

  NO REFETCH ON FOCUS Leave the tab open for an hour, come back — the data on
                      screen is an hour stale with no indication.

  MEMORY LEAK RISK    The component unmounts mid-request, setState fires on an
                      unmounted component.

  NO RETRY            A single flaky network blip becomes a permanent error state.

  NO SHARED STATE     Another component updates the user — this one has no idea.

  BOILERPLATE         Three useState calls and a useEffect, repeated in every
                      component that fetches anything.
```

```typescript
// ── The same thing with TanStack Query ────────────────────────────────────
function UserProfile({ userId }) {
  const { data: user, isPending, error } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then((r) => r.json()),
  });

  if (isPending) return <Spinner />;
  if (error) return <Error />;
  return <div>{user.name}</div>;
}
// Every problem in that list above is handled. Caching, deduplication, race
// conditions, refetch on focus, retries, cleanup — all of it, by default.
```

```text
‼️ THE ONE-SENTENCE PITCH
   TanStack Query is a cache for data that lives on your server. You tell it
   WHAT you want (a key) and HOW to fetch it (a function), and it handles
   everything about when to fetch, when to reuse, and when to refetch.
```

---

## 2. Server State vs Client State

```text
‼️ THE MENTAL SHIFT THAT MAKES EVERYTHING ELSE MAKE SENSE.

There are two completely different kinds of state in a frontend app, and people
get into trouble by treating them the same way.

CLIENT STATE — you own it
  Is this dropdown open? What's typed in this input? Which tab is selected?
  - You are the only source of truth.
  - It is synchronous. You set it, it's set.
  - It never goes stale.
  → Tools: useState, useReducer, Zustand, Redux

SERVER STATE — you are borrowing it
  The user list. The product catalogue. The current order.
  - The SERVER owns the truth. You have a COPY.
  - It is asynchronous. Fetching takes time and can fail.
  - It goes STALE the moment you receive it — someone else may have changed it.
  - It can be shared by many components at once.
  → Tools: TanStack Query, SWR, RTK Query

‼️ Putting server state into Redux/useState is the classic mistake. You end up
   hand-writing a cache — loading flags, invalidation, refetch logic — which is
   exactly the thing TanStack Query already is. Redux is excellent at client
   state and a poor fit for server state.

The practical rule:
  "Did this data come from an API?"  → TanStack Query
  "Did the user create it in the UI?" → useState / Zustand
```

---

## 3. Setup

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools    # strongly recommended
```

```tsx
// main.tsx — wrap your app once
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// The QueryClient IS the cache. One instance for the whole app.
// ‼️ Create it OUTSIDE the component. Creating it inside means a new, empty
// cache on every render — everything refetches constantly and nothing works.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // See §6 — this is the most important default to change, and the one
      // beginners most often leave wrong.
      staleTime: 1000 * 60,        // 1 minute
      retry: 1,                     // retry failed requests once (default is 3)
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      {/* A floating panel showing every cached query, its state, and its data.
          ‼️ Install this on day one. Watching the cache is by far the fastest
          way to understand what the library is doing. It is automatically
          excluded from production builds. */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## 4. `useQuery` — Reading Data

```tsx
const { data, isPending, isError, error, isFetching, refetch } = useQuery({
  // WHAT you are fetching. Also the cache key. See §5.
  queryKey: ['todos'],

  // HOW to fetch it. Must return a Promise, and must THROW on failure.
  queryFn: fetchTodos,
});
```

```typescript
// ‼️ THE queryFn MUST THROW ON ERROR, or TanStack Query cannot tell success
// from failure.
//
// This is the #1 setup mistake with `fetch`, because fetch does NOT reject on
// a 404 or 500 — it resolves with ok: false. So a failed request looks like a
// successful one and you get `undefined` data with no error.
async function fetchTodos() {
  const res = await fetch('/api/todos');

  // This line is what makes error handling work. Without it, isError is never
  // true no matter what the server returns.
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);

  return res.json();
}

// axios throws automatically on non-2xx, so it needs no equivalent line.
```

### The status flags

```text
‼️ There are two independent questions, and confusing them causes the most
   common UI bug in TanStack Query apps.

  isPending   "Do I have data yet?"     — true only when there is NOTHING cached
  isFetching  "Is a request in flight?" — true for the FIRST fetch AND every
                                          background refetch

  The scenario that shows why this matters:

    First visit          isPending: true   isFetching: true    → show a spinner
    Data arrives         isPending: false  isFetching: false   → show the data
    You switch tabs and come back — a background refetch fires
                         isPending: false  isFetching: true    → ‼️ STILL SHOW
                                                                  THE DATA

  If you write `if (isFetching) return <Spinner />`, that last line replaces
  your perfectly good data with a spinner every time the window regains focus.
  The whole point of the cache is that the user never sees that.

  RULE: gate your spinner on isPending. Use isFetching only for a subtle
        indicator — a small spinner in the corner, a dimmed background.
```

```tsx
function TodoList() {
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  });

  // Full-screen loading — only when there is genuinely nothing to show.
  if (isPending) return <Spinner />;

  if (isError) return <ErrorMessage error={error} />;

  return (
    <div>
      {/* A quiet hint that fresh data is on its way, without hiding what we have. */}
      {isFetching && <RefreshingIndicator />}
      {data.map((todo) => <Todo key={todo.id} todo={todo} />)}
    </div>
  );
}
```

---

## 5. Query Keys

```text
‼️ The query key is the cache key. TanStack Query uses it to decide:
   - whether it already has this data
   - which cached entry a component is subscribing to
   - what to refetch when you invalidate

Keys are ARRAYS, and they are hashed by VALUE, not by reference.
So a fresh object literal every render is fine — { page: 1 } always hashes the
same as { page: 1 }. Key order inside an object does not matter either.
```

```typescript
// Same key → same cache entry. These two components share ONE request.
useQuery({ queryKey: ['todos'], queryFn: fetchTodos });   // ComponentA
useQuery({ queryKey: ['todos'], queryFn: fetchTodos });   // ComponentB

// Different key → different cache entry, separate fetch.
useQuery({ queryKey: ['todos', 1], queryFn: () => fetchTodo(1) });
useQuery({ queryKey: ['todos', 2], queryFn: () => fetchTodo(2) });
```

```typescript
// ‼️ EVERYTHING THE queryFn USES MUST BE IN THE KEY.
// This is the rule that prevents the stale-data bugs.

// WRONG — the key never changes, so changing the filter shows the old results
useQuery({
  queryKey: ['todos'],
  queryFn: () => fetchTodos(filter),   // filter is used but not in the key
});

// RIGHT — a new filter is a new key, which is a new cache entry and a new fetch
useQuery({
  queryKey: ['todos', filter],
  queryFn: () => fetchTodos(filter),
});

// ‼️ Think of the key as the arguments to the fetch. If two calls would return
// different data, they must have different keys. The ESLint plugin
// @tanstack/eslint-plugin-query catches this automatically — worth installing.
```

### Structuring keys

```typescript
// Order keys from GENERAL to SPECIFIC. This matters because invalidation
// matches by PREFIX (§8), so the hierarchy is what gives you control.

['todos']                          // everything todo-related
['todos', 'list']                  // all lists
['todos', 'list', { done: false }] // one specific filtered list
['todos', 'detail', '123']         // one specific todo

// Once you have more than a handful, centralise them in a factory so a typo
// cannot silently create a second cache entry:
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: Filters) => [...todoKeys.lists(), filters] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: string) => [...todoKeys.details(), id] as const,
};
```

---

## 6. `staleTime` vs `gcTime`

```text
‼️ THE SINGLE MOST MISUNDERSTOOD PART OF THE LIBRARY, and a guaranteed
   interview question. They sound similar and do completely different things.

staleTime — "how long is this data considered FRESH?"
  Default: 0  (data is stale immediately)

  FRESH data  → reused from cache, NO network request
  STALE data  → shown instantly from cache, AND refetched in the background

  ‼️ Note what "stale" does NOT mean: it does not mean deleted, and it does not
  mean a spinner. Stale data is still displayed. It just triggers a background
  refresh on the next trigger (mount, window focus, reconnect).

gcTime — "how long do I keep UNUSED data before deleting it?"
  Default: 5 minutes   (gc = garbage collection; called cacheTime in v4)

  The countdown starts when the LAST component using that query unmounts.
  If you return within gcTime, the cached data is shown INSTANTLY while a
  refetch happens in the background. If you return after, there is nothing
  cached and you get a loading state.

THE RELATIONSHIP
  staleTime controls REFETCHING.  gcTime controls DELETION.
  staleTime should always be less than gcTime — data you have thrown away
  cannot be "fresh".
```

```typescript
// ‼️ The default staleTime: 0 surprises everyone. It means every mount, every
// window focus, and every reconnect triggers a refetch. That is safe, but it
// is far more network traffic than most apps need.

// Data that changes constantly — live prices, notifications
useQuery({ queryKey: ['prices'], queryFn: fetchPrices, staleTime: 0 });

// Normal application data — a sensible default for most queries
useQuery({ queryKey: ['todos'], queryFn: fetchTodos, staleTime: 1000 * 60 * 5 });

// Data that almost never changes — countries, categories, config
useQuery({
  queryKey: ['countries'],
  queryFn: fetchCountries,
  staleTime: Infinity,      // never refetch automatically
  gcTime: Infinity,         // never evict from cache
});
```

```text
WORKED EXAMPLE — staleTime: 60_000, gcTime: 300_000

  00:00  Mount. Nothing cached → fetch. Spinner.
  00:10  Navigate away. Component unmounts. gcTime countdown starts (5 min).
  00:20  Navigate back. Data is cached AND still fresh (< 60s old).
         → Instant render, NO network request at all.
  01:30  Navigate back again. Cached, but now stale (> 60s old).
         → Instant render from cache, AND a background refetch.
         → The user sees data immediately, then it silently updates.
  06:00  Navigate back. gcTime expired, cache entry deleted.
         → Spinner again, full fetch.
```

---

## 7. `useMutation` — Writing Data

```tsx
// Queries READ. Mutations WRITE (POST/PUT/PATCH/DELETE).
// The key difference: queries run automatically, mutations run when you call them.
function AddTodo() {
  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: (newTodo: { title: string }) =>
      fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      }).then((res) => {
        if (!res.ok) throw new Error('Failed to create todo');
        return res.json();
      }),

    onSuccess: (data) => {
      // Runs after a successful mutation. This is where cache updates go (§8).
    },
    onError: (error) => {
      // Runs on failure — show a toast, log it.
    },
    onSettled: () => {
      // Runs after either outcome. Good for cleanup.
    },
  });

  return (
    <button
      onClick={() => mutate({ title: 'Learn TanStack Query' })}
      disabled={isPending}
    >
      {isPending ? 'Saving...' : 'Add todo'}
    </button>
  );
}
```

```typescript
// ── mutate vs mutateAsync ─────────────────────────────────────────────────

// mutate — fire and forget. Errors go to onError. Does NOT return a promise.
// ‼️ Prefer this. It cannot produce an unhandled promise rejection.
mutate(newTodo);

// mutateAsync — returns a promise you can await.
// ‼️ If it rejects and you have no try/catch, you get an unhandled rejection
// that can crash the app. Only use it when you genuinely need to await.
try {
  const created = await mutateAsync(newTodo);
  navigate(`/todos/${created.id}`);
} catch (e) {
  // you MUST handle it here
}
```

---

## 8. Invalidation — Keeping the Cache Fresh

```text
‼️ THE CORE WORKFLOW OF THE WHOLE LIBRARY:

   You mutate data on the server → the cache is now out of date →
   you tell TanStack Query which cached queries are affected → it refetches them.

   You do NOT manually update your state. You tell the cache what is stale and
   let it re-sync with the server. That is the whole model.
```

```tsx
function useAddTodo() {
  // useQueryClient gives you the cache instance from context.
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      // Marks matching queries stale and refetches the active ones.
      // Every component showing a todo list updates automatically.
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

```typescript
// ‼️ INVALIDATION MATCHES BY PREFIX. This is what makes key hierarchy useful.

// Cached entries:
//   ['todos', 'list', { done: false }]
//   ['todos', 'list', { done: true }]
//   ['todos', 'detail', '1']

queryClient.invalidateQueries({ queryKey: ['todos'] });
// → invalidates ALL THREE (every key starting with 'todos')

queryClient.invalidateQueries({ queryKey: ['todos', 'list'] });
// → invalidates both lists, leaves the detail alone

queryClient.invalidateQueries({ queryKey: ['todos', 'detail', '1'] });
// → invalidates only that one

// exact: true turns prefix matching off — match this key and nothing below it.
queryClient.invalidateQueries({ queryKey: ['todos'], exact: true });
```

```typescript
// ── setQueryData — write to the cache directly ────────────────────────────
// When the server already returned the updated record, you can skip the
// refetch and write it straight into the cache.
onSuccess: (updatedTodo) => {
  queryClient.setQueryData(['todos', 'detail', updatedTodo.id], updatedTodo);

  // ‼️ Still invalidate the lists. The updated todo may now match or stop
  // matching a filter, so the list contents genuinely need re-deriving.
  queryClient.invalidateQueries({ queryKey: ['todos', 'list'] });
},

// ‼️ Beginner guidance: just use invalidateQueries. It is one line, always
// correct, and one extra request. Reach for setQueryData only when you have a
// measured reason to avoid that request.
```

---

## 9. Dependent & Conditional Queries

```tsx
// ‼️ You cannot put a query inside an `if` — hooks must run unconditionally.
// `enabled` is how you express "don't run this yet".
function UserOrders({ userId }: { userId?: string }) {
  const { data: user } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId!),
    enabled: !!userId,        // wait until userId exists
  });

  const { data: orders } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => fetchOrders(user!.id),
    // This query waits for the first one to produce a user.
    enabled: !!user?.id,
  });
}

// ‼️ A query that is disabled reports isPending: true but is NOT fetching —
// it has no data and never asked for any. If you gate a spinner on isPending
// alone, a disabled query shows a spinner forever. Check `isLoading` instead,
// which is (isPending && isFetching), or handle the disabled case explicitly.
```

---

## 10. Loading & Error States Done Properly

```tsx
// ── placeholderData — keep the previous page visible while the next loads ──
import { keepPreviousData } from '@tanstack/react-query';

const { data, isFetching } = useQuery({
  queryKey: ['todos', page],
  queryFn: () => fetchTodos(page),

  // Without this, changing page unmounts the list (new key = no data yet) and
  // the layout collapses to a spinner, then jumps back. With it, page 1 stays
  // on screen — dimmed, if you like — until page 2 arrives.
  placeholderData: keepPreviousData,
});
```

```tsx
// ── retry ─────────────────────────────────────────────────────────────────
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,

  // Default is 3 retries with exponential backoff. Usually good — but retrying
  // a 404 is pointless, and retrying a 401 delays the login redirect.
  retry: (failureCount, error) => {
    if (error.status >= 400 && error.status < 500) return false;  // client error
    return failureCount < 3;
  },
});
```

```tsx
// ── Error boundaries instead of per-component error UI ────────────────────
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  // Throws the error during render so a React error boundary catches it,
  // rather than every component writing its own `if (isError)` branch.
  throwOnError: true,
});
```

---

## 11. Pagination

```tsx
// ── Page-based ────────────────────────────────────────────────────────────
function TodoList() {
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery({
    queryKey: ['todos', 'list', page],   // page in the key = one entry per page
    queryFn: () => fetchTodos(page),
    placeholderData: keepPreviousData,   // no layout collapse between pages
  });

  return (
    <>
      {data?.items.map((t) => <Todo key={t.id} todo={t} />)}
      <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
        Previous
      </button>
      {/* Already-visited pages are cached, so going back is instant. */}
      <button onClick={() => setPage((p) => p + 1)} disabled={!data?.hasMore}>
        Next
      </button>
    </>
  );
}
```

```tsx
// ── Infinite scroll / "load more" ─────────────────────────────────────────
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['todos', 'infinite'],
  // pageParam is supplied by getNextPageParam below (or initialPageParam first).
  queryFn: ({ pageParam }) => fetchTodos(pageParam),
  initialPageParam: 1,

  // Returning undefined means "no more pages" and sets hasNextPage to false.
  getNextPageParam: (lastPage, allPages) =>
    lastPage.hasMore ? allPages.length + 1 : undefined,
});

// ‼️ data is NOT a flat array. It is { pages: [...], pageParams: [...] },
// where each entry is one page's response. Flatten before rendering:
const todos = data?.pages.flatMap((page) => page.items) ?? [];
```

---

## 12. Common Beginner Mistakes

```text
‼️ 1. Creating the QueryClient inside a component.
   A new cache every render — nothing is ever cached and everything refetches.
   Create it at module scope, outside the component.

‼️ 2. Not throwing in the queryFn when using fetch().
   fetch does not reject on 404/500. Without `if (!res.ok) throw ...`, failures
   look like successes and isError is never true.

‼️ 3. Missing a dependency in the query key.
   If the queryFn reads `filter`, `filter` must be in the key — otherwise
   changing it shows stale results from the previous filter.

‼️ 4. Gating the spinner on isFetching instead of isPending.
   Your data is replaced by a spinner on every background refetch, including
   every time the user refocuses the tab. Use isPending.

‼️ 5. Copying query data into useState.
   `const [items, setItems] = useState(data)` — now you have two sources of
   truth and the copy never updates. Use `data` directly; derive with useMemo
   if you need a transformation.

‼️ 6. Expecting staleTime: 0 (the default) to mean "no cache".
   It means "always refetch in the background". The cached data is still shown
   instantly. These are different things.

‼️ 7. Forgetting to invalidate after a mutation.
   The server is updated, the screen is not. Nothing will refresh on its own
   until a refetch trigger fires.

‼️ 8. Using mutateAsync without try/catch.
   An unhandled promise rejection. Use `mutate` unless you specifically need
   to await the result.

‼️ 9. Putting server data in Redux/Zustand as well.
   Two caches that disagree. Pick one home for server state — this one.

‼️ 10. Fetching inside useEffect and then calling setQueryData.
   You are fighting the library. Put the fetch in the queryFn.

‼️ 11. Not installing the Devtools.
   You are debugging a cache you cannot see. It takes two minutes to add.

‼️ 12. Reaching for optimistic updates too early.
   They add real complexity (rollback, race conditions). Plain invalidation is
   correct and fast enough for almost everything.
```

---

## 13. Cheat Sheet

```typescript
// ── READ ──────────────────────────────────────────────────────────────────
const { data, isPending, isError, error, isFetching, refetch } = useQuery({
  queryKey: ['todos', filter],     // cache key — include every queryFn input
  queryFn: () => fetchTodos(filter),
  staleTime: 1000 * 60 * 5,        // how long data counts as fresh
  gcTime: 1000 * 60 * 30,          // how long unused data is kept
  enabled: !!filter,               // skip the query until this is true
  placeholderData: keepPreviousData,
  select: (data) => data.items,    // transform without extra re-renders
  retry: 1,
});

// ── WRITE ─────────────────────────────────────────────────────────────────
const { mutate, isPending } = useMutation({
  mutationFn: createTodo,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  onError: (err) => toast.error(err.message),
  onSettled: () => {},
});
mutate(newTodo);                   // fire and forget (preferred)
await mutateAsync(newTodo);        // awaitable — needs try/catch

// ── CACHE OPERATIONS ──────────────────────────────────────────────────────
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['todos'] });    // mark stale, refetch
queryClient.setQueryData(['todos', id], newData);          // write directly
queryClient.getQueryData(['todos', id]);                   // read without subscribing
queryClient.removeQueries({ queryKey: ['todos'] });        // delete from cache
queryClient.prefetchQuery({ queryKey, queryFn });          // warm the cache early

// ── STATUS FLAGS ──────────────────────────────────────────────────────────
// isPending   no data yet                → full-page spinner
// isFetching  a request is in flight     → subtle refresh indicator only
// isLoading   isPending && isFetching    → first load, excluding disabled queries
// isError / error
// isSuccess

// ── KEY MATCHING ──────────────────────────────────────────────────────────
// ['todos'] matches ['todos', 'list', {...}] and ['todos', 'detail', '1']
// Add exact: true to match only the key itself.
```

---

## 14. Where to Go Next

```text
ONCE THE BASICS ARE COMFORTABLE:

  1. OPTIMISTIC UPDATES — update the UI before the server responds, roll back
     on failure. Makes an app feel instant. Add it only where latency is
     actually visible; it is genuinely fiddly to get right.

  2. PREFETCHING — queryClient.prefetchQuery on hover or on route enter, so the
     data is already cached by the time the user clicks. Large perceived win
     for very little code.

  3. SUSPENSE — useSuspenseQuery removes the isPending branch entirely and lets
     a <Suspense> boundary handle loading declaratively.

  4. SSR / Next.js — hydrating the cache from the server so the first paint
     already has data.

  5. TESTING — mocking at the network layer with MSW rather than mocking the
     hooks, so your tests exercise the real cache behaviour.

‼️ THE MOST USEFUL HABIT: keep the Devtools panel open while you build. Watch
   entries go fresh → stale → inactive → garbage collected as you navigate.
   Ten minutes of that teaches the caching model better than any article.
```

---

## Related Files

- [STATE-MANAGEMENT-DEEP.md](STATE-MANAGEMENT-DEEP.md) — where TanStack Query fits alongside Redux and Zustand
- [FRONTEND-ARCHITECTURE-DEEP.md](FRONTEND-ARCHITECTURE-DEEP.md) — §3 state architecture, the query key factory pattern
- [REACT-ECOSYSTEM-LOW-DEEP.md](../2-medium-priority/REACT-ECOSYSTEM-LOW-DEEP.md) — §1 TanStack Query at interview depth, plus Q&A
- [REACT-DEEP.md](REACT-DEEP.md) — hooks, re-render behaviour
- [TESTING-ECOSYSTEM-DEEP.md](TESTING-ECOSYSTEM-DEEP.md) — testing components that fetch data
