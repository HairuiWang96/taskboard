# React Ecosystem — Senior Developer Deep Reference
**Priority: LOW**

> Covers: TanStack Query (React Query), Zustand, React Hook Form, React Router v6, and common interview questions.

---

## Table of Contents

1. [TanStack Query (React Query)](#1-tanstack-query-react-query)
2. [Zustand — Client State](#2-zustand--client-state)
3. [React Hook Form](#3-react-hook-form)
4. [React Router v6](#4-react-router-v6)
5. [Choosing the Right Tool](#5-choosing-the-right-tool)
6. [Common Interview Questions](#6-common-interview-questions)

---

## 1. TanStack Query (React Query)

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
      staleTime: 1000 * 60,      // data is "fresh" for 1 minute — no refetch during this time
      gcTime: 1000 * 60 * 5,     // keep unused data in cache for 5 minutes (was cacheTime in v4)
      retry: 2,                  // retry failed requests twice
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
    data: tasks,       // the data (undefined while loading)
    isLoading,         // true on first load (no cached data)
    isFetching,        // true whenever a request is in-flight (including background refetch)
    isError,
    error,
    refetch,           // manually trigger a refetch
  } = useQuery({
    queryKey: ['tasks'],         // cache key — must be unique per "query"
    queryFn: () => fetch('/tasks').then(r => r.json()),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <Error message={error.message} />;

  return (
    <div>
      {isFetching && <small>Refreshing...</small>} {/* background refresh indicator */}
      {tasks.map(task => <TaskCard key={task.id} task={task} />)}
    </div>
  );
}

// Query keys with variables — query re-runs when key changes
function TaskDetail({ taskId }: { taskId: string }) {
  const { data: task } = useQuery({
    queryKey: ['tasks', taskId],             // unique per taskId
    queryFn: () => fetch(`/tasks/${taskId}`).then(r => r.json()),
    enabled: !!taskId,                       // don't fetch if taskId is empty/undefined
  });
}

// Query with search params
function SearchResults({ query }: { query: string }) {
  const { data } = useQuery({
    queryKey: ['tasks', 'search', query],    // re-fetches when query changes
    queryFn: () => fetch(`/tasks?q=${query}`).then(r => r.json()),
    enabled: query.length > 2,              // only search when 3+ chars
    placeholderData: keepPreviousData,       // show old results while fetching new (v5)
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

    onSuccess: (createdTask) => {
      // Option 1: invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // RQ will refetch any active query matching ['tasks', ...]

      // Option 2: optimistic update — update cache directly (faster UX)
      queryClient.setQueryData(['tasks'], (old: Task[] = []) => [createdTask, ...old]);
    },

    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  return (
    <form onSubmit={e => {
      e.preventDefault();
      createTask.mutate({ title: e.currentTarget.title.value });
    }}>
      <input name="title" />
      <button type="submit" disabled={createTask.isPending}>
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
  onMutate: async (deletedId) => {
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
['tasks']                     // all tasks
['tasks', taskId]             // specific task
['tasks', 'search', query]   // task search results
['users', userId, 'tasks']   // tasks belonging to a user

// Invalidate everything under ['tasks']:
queryClient.invalidateQueries({ queryKey: ['tasks'] });
// Invalidates: ['tasks'], ['tasks', id], ['tasks', 'search', q], etc.

// The query key is also the cache key — two components with the same key share data
// Task detail shown in sidebar AND main panel → one network request
```

---

## 2. Zustand — Client State

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
  devtools(            // Redux DevTools support
    persist(           // persist to localStorage
      (set) => ({
        filter: 'all',
        selectedTaskId: null,

        setFilter: (filter) => set({ filter }),
        selectTask: (id) => set({ selectedTaskId: id }),
      }),
      { name: 'task-store' }  // localStorage key
    )
  )
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
        <button key={f} onClick={() => setFilter(f as any)}
          className={filter === f ? 'active' : ''}>
          {f}
        </button>
      ))}
    </div>
  );
}

function TaskList() {
  const filter = useTaskStore(state => state.filter);
  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });

  const filtered = useMemo(() =>
    tasks?.filter(t => {
      if (filter === 'all') return true;
      if (filter === 'open') return !t.completed;
      return t.completed;
    }) ?? [],
    [tasks, filter]
  );

  return <ul>{filtered.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
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
  }))
);

// Access anywhere — no Provider needed (unlike Context)
const { user, login } = useAppStore(state => ({ user: state.user, login: state.login }));
```

---

## 3. React Hook Form

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
    register,         // connect input to form
    handleSubmit,     // wraps your submit handler
    formState: { errors, isSubmitting, isDirty }, // form state
    reset,            // reset to defaults
    watch,            // watch a field's value
    setValue,         // programmatically set a value
  } = useForm<FormValues>({
    resolver: zodResolver(schema),  // Zod validates on submit (and optionally on change)
    defaultValues: { title: '', priority: 'medium' },
  });

  const title = watch('title'); // reactive — causes re-render on change

  return (
    <form onSubmit={handleSubmit(async (data) => {
      await onSubmit(data);
      reset(); // clear form after successful submit
    })}>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          {...register('title')} // spreads name, ref, onChange, onBlur
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && <p id="title-error" role="alert">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="priority">Priority</label>
        <select id="priority" {...register('priority')}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <button type="submit" disabled={isSubmitting || !isDirty}>
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
      name="priority"
      render={({ field, fieldState }) => (
        <Select          // shadcn/ui Select (not a native <select>)
          value={field.value}
          onValueChange={field.onChange}
          aria-invalid={!!fieldState.error}
        >
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
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
        <div key={field.id}> {/* use field.id, not index */}
          <input {...register(`subtasks.${index}.title`)} />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ title: '' })}>
        Add subtask
      </button>
    </div>
  );
}
```

---

## 4. React Router v6

### Setup

```tsx
// main.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,       // wrapper with nav, header, etc.
    errorElement: <ErrorPage />,   // handles thrown errors and 404s
    children: [
      { index: true, element: <HomePage /> },         // path: "/"
      { path: 'tasks', element: <TaskListPage /> },   // path: "/tasks"
      { path: 'tasks/:id', element: <TaskPage /> },   // path: "/tasks/123"
      {
        path: 'admin',
        element: <AdminGuard />,   // auth check wrapper
        children: [
          { path: 'users', element: <UsersPage /> },  // path: "/admin/users"
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
  const { id } = useParams<{ id: string }>();         // URL params (:id)
  const navigate = useNavigate();                     // programmatic navigation
  const location = useLocation();                     // current URL info
  const [searchParams, setSearchParams] = useSearchParams(); // query string

  const filter = searchParams.get('filter') ?? 'all';

  function handleClose() {
    navigate(-1);                                    // go back
    navigate('/tasks');                              // go to specific route
    navigate('/tasks', { replace: true });           // replace (no back button entry)
    navigate('/tasks', { state: { from: 'detail' } }); // pass state (accessible via location.state)
  }

  function setFilter(f: string) {
    setSearchParams({ filter: f });                  // updates URL: /tasks?filter=open
  }

  return <div>Task {id} — filter: {filter}</div>;
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
        <NavLink to="/"      className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>Tasks</NavLink>
      </nav>
      <main>
        <Outlet />  {/* child route renders here */}
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
    <Form method="post">   {/* submits to the route's action */}
      <input name="title" />
      <button type="submit">Create</button>
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

## 5. Choosing the Right Tool

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

## 6. Common Interview Questions

### "What is React Query and why would you use it over useEffect + useState?"

> React Query manages server state — it handles fetching, caching, background refetching, error states, and cache invalidation. With `useEffect + useState` you manually implement all of this, often with bugs: race conditions (stale response arrives after a newer one), no cache (refetch on every mount), no background updates, repeated loading/error boilerplate. React Query gives you all of that for free with a clean API. You only write the fetch function.

### "What is the difference between staleTime and gcTime in React Query?"

> `staleTime`: how long data is considered "fresh". During this time, React Query won't refetch — it serves from cache. Default: 0 (immediately stale). `gcTime` (formerly `cacheTime`): how long unused data stays in the cache before being garbage collected. Default: 5 minutes. A query can be stale (would refetch on mount) but still in the cache (used while refetching). Set `staleTime` to a few minutes for data that doesn't change often.

### "When would you use Zustand vs React Context?"

> Both share state across components. Zustand: fine-grained subscriptions (only re-renders if the slice you subscribed to changed), no Provider needed, devtools support, easy async actions. Context: re-renders ALL consumers when any context value changes — bad for frequent updates. Use Context for: infrequently changing values (theme, locale, auth). Use Zustand for: anything that changes often (filters, selections, cart, notifications).

### "Why use React Hook Form over controlled inputs?"

> Controlled inputs (useState) re-render the component on every keystroke. For a large form with 20 fields, that's 20 components re-rendering on every key press. React Hook Form uses uncontrolled inputs by default — it reads values via refs at submit time, and only triggers re-renders for validation errors and form-level state (isSubmitting). Significantly faster for large forms. Also handles field arrays, validation, and error messages more cleanly.

### "What is the difference between useNavigate and Link?"

> `<Link>` renders an anchor tag — declarative navigation on click, handled in JSX. `useNavigate()` returns a function for programmatic navigation — use inside event handlers, effects, or after an async operation (e.g., navigate to dashboard after successful login). `<NavLink>` is `<Link>` but with an `isActive` callback for styling the active route.
