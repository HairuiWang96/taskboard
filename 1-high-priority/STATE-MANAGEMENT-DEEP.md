# State Management — Senior Deep Reference

## Mental Model: When to Use What

```
Server state (async, remote)?      → TanStack Query
Global UI state (complex logic)?   → Redux Toolkit
Simple global state?               → Zustand
Atomic/derived state?              → Jotai or Recoil
Local component state?             → useState / useReducer
Form state?                        → React Hook Form + Zod
```

---

## Redux Toolkit (RTK)

### Core Concepts

```
Action → Reducer → Store → React Component (via useSelector)
                 ↑
         Middleware (thunk/saga/logger)
```

### Store Setup

```ts
// store.ts
import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './cartSlice'
import userReducer from './userSlice'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(logger), // default includes thunk
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

### createSlice (actions + reducer in one)

```ts
// cartSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CartState {
  items: { id: string; qty: number }[]
  total: number
}

const initialState: CartState = { items: [], total: 0 }

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<{ id: string; qty: number }>) {
      // Immer lets us mutate directly — RTK wraps reducers in Immer
      const existing = state.items.find(i => i.id === action.payload.id)
      if (existing) {
        existing.qty += action.payload.qty
      } else {
        state.items.push(action.payload)
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload)
    },
    clearCart(state) {
      state.items = []
      state.total = 0
    },
  },
  // handle async thunk lifecycle actions here:
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => { state.loading = true })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload
        state.loading = false
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.error = action.error.message
        state.loading = false
      })
  },
})

export const { addItem, removeItem, clearCart } = cartSlice.actions
export default cartSlice.reducer
```

### createAsyncThunk (Redux Thunk)

```ts
// Thunk = middleware that lets you dispatch functions instead of plain objects
// Dispatching a function → middleware intercepts, calls it with (dispatch, getState)

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',           // action type prefix
  async (userId: string, thunkAPI) => {
    try {
      const res = await fetch(`/api/cart/${userId}`)
      return await res.json()         // becomes action.payload in fulfilled
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message)  // becomes action.error
    }
  }
)

// Usage in component:
dispatch(fetchCart('user-123'))
```

### Redux Saga (side effects as generator functions)

```ts
// saga.ts — more powerful than thunk: cancellable, testable, complex flows
import { call, put, takeEvery, takeLatest, select, all, fork } from 'redux-saga/effects'

// Worker saga
function* fetchCartSaga(action: ReturnType<typeof fetchCartAction>) {
  try {
    const data = yield call(api.fetchCart, action.payload.userId)  // call = blocking effect
    yield put(cartSlice.actions.setItems(data))                     // put = dispatch
  } catch (err) {
    yield put(cartSlice.actions.setError(err.message))
  }
}

// Watcher saga
function* watchCart() {
  yield takeLatest('cart/fetch', fetchCartSaga) // cancels previous if new fires
  // takeEvery — runs all concurrently
  // takeLatest — cancels previous, keeps newest
  // takeLeading — ignores new until current finishes
}

// Root saga
export function* rootSaga() {
  yield all([
    fork(watchCart),
    fork(watchUser),
  ])
}
```

### Selectors & Memoization

```ts
import { createSelector } from '@reduxjs/toolkit'  // re-exports reselect

// Basic selector (no memo needed — just reads state)
const selectItems = (state: RootState) => state.cart.items

// Memoized derived selector — only recomputes if items changes
const selectCartTotal = createSelector(
  selectItems,
  (items) => items.reduce((sum, i) => sum + i.qty * i.price, 0)
)

// In component — won't re-render unless total changes
const total = useSelector(selectCartTotal)
```

### Typed Hooks (avoid casting everywhere)

```ts
// hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

### RTK Query (built-in data fetching)

```ts
// apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Cart', 'User'],
  endpoints: (builder) => ({
    getCart: builder.query<Cart, string>({
      query: (userId) => `/cart/${userId}`,
      providesTags: ['Cart'],
    }),
    addItem: builder.mutation<Cart, AddItemArgs>({
      query: (body) => ({ url: '/cart/item', method: 'POST', body }),
      invalidatesTags: ['Cart'],  // auto-refetch getCart after mutation
    }),
  }),
})

export const { useGetCartQuery, useAddItemMutation } = api

// Component:
const { data, isLoading, isError } = useGetCartQuery('user-123')
const [addItem, { isLoading: adding }] = useAddItemMutation()
```

---

## Zustand

Minimal boilerplate, no Provider needed, works outside React.

```ts
// store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface BearState {
  bears: number
  fish: number
  addBear: () => void
  feed: (amount: number) => void
  reset: () => void
}

export const useBearStore = create<BearState>()(
  devtools(           // Redux DevTools support
    persist(          // localStorage persistence
      (set, get) => ({
        bears: 0,
        fish: 10,
        addBear: () => set((s) => ({ bears: s.bears + 1 })),
        feed: (amount) => set((s) => ({ fish: s.fish - amount })),
        reset: () => set({ bears: 0, fish: 10 }),
        // get() for reading state inside actions:
        canFeed: () => get().fish > 0,
      }),
      { name: 'bear-storage' }
    )
  )
)

// Component — subscribes only to bears (no re-render if fish changes):
const bears = useBearStore((s) => s.bears)
const addBear = useBearStore((s) => s.addBear)
```

### Zustand Slices Pattern (large stores)

```ts
// Separate concerns, compose into one store
const createCartSlice = (set, get) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
})

const createUserSlice = (set, get) => ({
  user: null,
  setUser: (u) => set({ user: u }),
})

export const useStore = create()((...a) => ({
  ...createCartSlice(...a),
  ...createUserSlice(...a),
}))
```

### Zustand vs Redux

| | Zustand | Redux Toolkit |
|---|---|---|
| Boilerplate | Minimal | Moderate |
| DevTools | Via middleware | Built-in |
| Middleware | Manual | Built-in (thunk, immer) |
| Learning curve | Low | Higher |
| Best for | Simple–medium global state | Complex state, large teams |
| Outside React | Yes (getState/setState) | Yes (store.getState/dispatch) |

---

## Jotai

Atomic state — bottom-up composition. Each atom is independent; components subscribe only to what they need.

```ts
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'

// Primitive atoms
const countAtom = atom(0)
const nameAtom = atom('Alice')

// Derived (read-only) atom — recomputes when countAtom changes
const doubledAtom = atom((get) => get(countAtom) * 2)

// Read-write derived atom
const uppercaseAtom = atom(
  (get) => get(nameAtom).toUpperCase(),
  (get, set, newVal: string) => set(nameAtom, newVal.toLowerCase())
)

// Async atom
const userAtom = atom(async (get) => {
  const id = get(userIdAtom)
  return fetch(`/api/user/${id}`).then(r => r.json())
})

// Component
function Counter() {
  const [count, setCount] = useAtom(countAtom)      // read + write
  const doubled = useAtomValue(doubledAtom)          // read only
  const setName = useSetAtom(nameAtom)               // write only (no re-render on read)
  return <button onClick={() => setCount(c => c + 1)}>{count} ({doubled})</button>
}

// Atom families (parameterised atoms)
import { atomFamily } from 'jotai/utils'
const todoAtom = atomFamily((id: number) => atom({ id, done: false }))
// Each id gets its own atom — components subscribe to specific todo only
```

### Jotai vs Recoil

| | Jotai | Recoil |
|---|---|---|
| Bundle size | ~3kb | ~21kb |
| Provider | Optional | Required (RecoilRoot) |
| Async | Built-in | Selectors + Suspense |
| Suspense | First-class | First-class |
| Maintenance | Active | Slowing (Meta) |
| Key | No string keys | String keys (atom/selector) |

---

## TanStack Query (React Query)

The standard for server state. Caching, background refetch, pagination, mutations.

```ts
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 min before refetch
      gcTime: 1000 * 60 * 10,    // 10 min before garbage collection (was cacheTime)
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
})
// Wrap app: <QueryClientProvider client={queryClient}>

// Basic query
const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
  queryKey: ['user', userId],          // cache key — array, any serialisable value
  queryFn: () => fetchUser(userId),
  enabled: !!userId,                   // don't run until userId exists
  select: (data) => data.profile,      // transform data before returning to component
  placeholderData: keepPreviousData,   // show stale data while fetching (pagination UX)
})

// Mutation
const mutation = useMutation({
  mutationFn: (newUser: User) => fetch('/api/users', { method: 'POST', body: JSON.stringify(newUser) }),
  onSuccess: (data, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ['users'] })  // refetch list
  },
  onError: (error) => { /* rollback */ },
  // Optimistic update:
  onMutate: async (newUser) => {
    await queryClient.cancelQueries({ queryKey: ['users'] })
    const snapshot = queryClient.getQueryData(['users'])
    queryClient.setQueryData(['users'], (old) => [...old, newUser])
    return { snapshot }                // context passed to onError
  },
  onError: (err, newUser, context) => {
    queryClient.setQueryData(['users'], context.snapshot)  // rollback
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
})

mutation.mutate({ name: 'Bob' })
```

### Pagination & Infinite Scroll

```ts
// Offset pagination
const { data } = useQuery({
  queryKey: ['todos', page],
  queryFn: () => fetchTodos(page),
  placeholderData: keepPreviousData,  // no loading flash between pages
})

// Infinite scroll
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['todos'],
  queryFn: ({ pageParam = 0 }) => fetchTodos(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
})
// data.pages = array of pages; data.pages.flat() for all items
```

### Prefetching

```ts
// Hover prefetch
onMouseEnter={() => queryClient.prefetchQuery({ queryKey: ['user', id], queryFn: ... })}

// SSR prefetch (Next.js)
await queryClient.prefetchQuery({ queryKey: ['user', id], queryFn: fetchUser })
const dehydratedState = dehydrate(queryClient)
// Pass to client via <HydrationBoundary state={dehydratedState}>
```

### Query Key Conventions

```ts
// Hierarchical — invalidating ['todos'] also invalidates ['todos', filters]
['todos']                          // list
['todos', { status: 'done' }]     // filtered list
['todos', id]                      // single item
['todos', id, 'comments']         // nested resource
```

---

## Decision Matrix

| Scenario | Tool |
|---|---|
| Fetching & caching API data | TanStack Query |
| Shared UI state (modal open, theme, user session) | Zustand |
| Complex business logic with many actions | Redux Toolkit |
| Derived/computed state, fine-grained subscriptions | Jotai |
| Form state | React Hook Form |
| Local, non-shared state | useState/useReducer |
| Real-time (WebSocket) server state | TanStack Query + manual setQueryData |

### Anti-patterns to call out in interviews

```
❌ Putting server data in Redux (double caching, stale sync)
❌ One giant Redux slice for everything
❌ Calling useSelector at the top of a heavy component (subscribe to slices)
❌ Creating atoms inside render (new reference each render in Jotai)
❌ Mutating Redux state directly without Immer (classic bug)
❌ Not memoizing expensive selectors (reselect / createSelector)
❌ Using TanStack Query for purely local/UI state
```
