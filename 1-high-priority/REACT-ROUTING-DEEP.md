# React Routing — React Router v7, TanStack Router, and the Patterns Behind Them

**Priority: HIGH**

> How client-side routing works under the hood, then React Router v7 in depth (its three
> modes, nested routes and layouts, params and search params, loaders and actions,
> pending UI, errors, auth guards, code splitting, scroll restoration, blocking
> navigation), TanStack Router's type-safe approach, how Next.js App Router compares,
> URL-as-state patterns, deployment gotchas (404 on refresh), testing, and the interview
> questions.
>
> Library versions assumed: React Router 7, TanStack Router 1, Next.js 15+.
> The browser APIs underneath (`history.pushState`, `popstate`, `URL`, `URLSearchParams`)
> are in [BROWSER-DOM-EVENTS-DEEP.md §22](BROWSER-DOM-EVENTS-DEEP.md#22-url-history-and-navigation).

---

## Table of Contents

- [1. The Mental Model — What a Client-Side Router Does](#1-the-mental-model--what-a-client-side-router-does)
- [2. Choosing a Router](#2-choosing-a-router)
- [3. React Router v7 — The Three Modes](#3-react-router-v7--the-three-modes)
- [4. Defining Routes — Nesting, Layouts, Index, Splats](#4-defining-routes--nesting-layouts-index-splats)
- [5. Navigating — Link, NavLink, useNavigate, redirect](#5-navigating--link-navlink-usenavigate-redirect)
- [6. Route Params](#6-route-params)
- [7. Search Params — The URL as State](#7-search-params--the-url-as-state)
- [8. Loaders — Fetch Before Render](#8-loaders--fetch-before-render)
- [9. Actions, Form, and useFetcher — Mutations](#9-actions-form-and-usefetcher--mutations)
- [10. Pending UI — useNavigation and Optimistic Updates](#10-pending-ui--usenavigation-and-optimistic-updates)
- [11. Errors and 404s](#11-errors-and-404s)
- [12. Auth and Protected Routes](#12-auth-and-protected-routes)
- [13. Loaders with TanStack Query](#13-loaders-with-tanstack-query)
- [14. Code Splitting — Lazy Routes](#14-code-splitting--lazy-routes)
- [15. Scroll Restoration, Focus, and Page Titles](#15-scroll-restoration-focus-and-page-titles)
- [16. Blocking Navigation — Unsaved Changes](#16-blocking-navigation--unsaved-changes)
- [17. Modals, Tabs, and Other Routing UI Patterns](#17-modals-tabs-and-other-routing-ui-patterns)
- [18. TanStack Router — Type-Safe Routing](#18-tanstack-router--type-safe-routing)
- [19. Next.js App Router — How It Compares](#19-nextjs-app-router--how-it-compares)
- [20. Deployment — 404 on Refresh, Base Paths, Hash Routing](#20-deployment--404-on-refresh-base-paths-hash-routing)
- [21. Testing Routed Components](#21-testing-routed-components)
- [22. Common Pitfalls](#22-common-pitfalls)
- [23. Interview Questions](#23-interview-questions)
- [Related Files](#related-files)

---

## 1. The Mental Model — What a Client-Side Router Does

```text
‼️ WITHOUT A ROUTER (multi-page app)

   click <a href="/tasks/7"> → browser requests /tasks/7 from the server → new HTML page →
   all JS reloads, all state is lost, white flash.

‼️ WITH A CLIENT-SIDE ROUTER (single-page app)

   click <Link to="/tasks/7">
     1. the router calls e.preventDefault() on the click (no page load)
     2. history.pushState(null, '', '/tasks/7') → the URL changes, a history entry is added
     3. the router matches '/tasks/7' against your route definitions
     4. (data routers) runs the matching routes' loaders, in parallel
     5. React renders the matching components; the rest of the page (layout, sidebar,
        state) stays mounted

   Back button → the browser fires 'popstate' → the router reads location and re-renders.
   Refresh → the SERVER receives /tasks/7 → it must return index.html (§20), then the router
   takes over.
```

```text
THE URL IS STATE — and the best kind

   https://app.com/projects/42/tasks?status=open&sort=due#comments
                  └──────── path ────────┘ └──── search ─────┘ └─ hash ─┘
                     WHICH page/resource       HOW to view it     where on the page

   Put in the URL anything a user would expect to survive a refresh, be shareable, or
   work with Back: the current page, the selected item, filters, sort, pagination,
   the open tab, search text.
   Keep OUT of the URL: secrets/tokens, big blobs, transient UI (is a tooltip open).
```

---

## 2. Choosing a Router

```text
  OPTION                         CHOOSE WHEN
  ─────────────────────────────  ──────────────────────────────────────────────────────
  React Router v7                ‼️ the most common React router; huge ecosystem.
  (declarative / data mode)      A Vite SPA, or adding routing to an existing app.

  React Router v7 framework      You want SSR, file-based routes, loaders on the server,
  mode (the successor of Remix)  type generation — a full-stack framework, Vite-based.

  TanStack Router                You want end-to-end TYPE SAFETY (params, search params,
                                 loader data all typed), validated search params, and
                                 tight TanStack Query integration. SPA-first; TanStack
                                 Start adds SSR.

  Next.js App Router             Server Components, server-first rendering, SEO-heavy
                                 sites, Vercel-style deployment. Routing is part of the
                                 framework (file-system based).

  wouter                         Tiny (~2kB) hook-based router for small apps/widgets.
```

---

## 3. React Router v7 — The Three Modes

```text
‼️ ONE PACKAGE, THREE WAYS TO USE IT

   In v7 everything is imported from "react-router" (react-router-dom was merged in;
   only DOM-specific bits like RouterProvider live in "react-router/dom").

   1. DECLARATIVE mode — <BrowserRouter> + <Routes>/<Route> in JSX
        Routing only: matching, Link, params. You fetch data yourself (useEffect /
        TanStack Query). Simplest; how most React Router v5/v6 apps were written.

   2. DATA mode — createBrowserRouter([...route objects]) + <RouterProvider>
        Adds loaders, actions, pending states, error boundaries per route, lazy routes,
        useFetcher, blocking. ‼️ Recommended for new SPAs.

   3. FRAMEWORK mode — the Vite plugin (@react-router/dev), routes.ts, route modules
        Everything in data mode + server rendering, file-based routes, typegen
        (Route.LoaderArgs, Route.ComponentProps), pre-rendering. This is what Remix became.
```

```tsx
// ── Declarative mode ────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route } from 'react-router';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="tasks/:taskId" element={<TaskPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>,
);
```

```tsx
// ── Data mode ───────────────────────────────────────────────────────────────
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,             // or element: <RootLayout />
    ErrorBoundary: RootError,
    children: [
      { index: true, Component: Home },
      { path: 'tasks', Component: TaskList, loader: tasksLoader },
      { path: 'tasks/:taskId', Component: TaskPage, loader: taskLoader, action: taskAction },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
// ‼️ Create the router ONCE at module level — not inside a component (it would be
// recreated on every render and lose state).
```

```ts
// ── Framework mode: app/routes.ts ───────────────────────────────────────────
import { type RouteConfig, index, route, layout } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  layout('routes/app-layout.tsx', [
    route('tasks', 'routes/tasks.tsx'),
    route('tasks/:taskId', 'routes/task.tsx'),
  ]),
] satisfies RouteConfig;

// app/routes/task.tsx — a "route module": loader, action, component, meta, ErrorBoundary
import type { Route } from './+types/task';         // generated types
export async function loader({ params }: Route.LoaderArgs) {
  return { task: await db.task.find(params.taskId) };    // runs on the server
}
export default function Task({ loaderData }: Route.ComponentProps) {
  return <h1>{loaderData.task.title}</h1>;               // fully typed
}
```

---

## 4. Defining Routes — Nesting, Layouts, Index, Splats

```text
‼️ NESTED ROUTES = NESTED UI

   URL: /projects/42/settings

   <RootLayout>                    path "/"            header, nav  ── always shown
     <Outlet/> → <ProjectLayout>   path "projects/:id" project name, tabs
                   <Outlet/> → <ProjectSettings>  path "settings"

   Each parent renders <Outlet /> where its matching child goes.
   Navigating from /projects/42/settings to /projects/42/members re-renders only the
   innermost part; RootLayout and ProjectLayout stay mounted (state, scroll, inputs kept).
```

```tsx
const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },                 // "/" exactly
      {
        path: 'projects/:projectId',
        Component: ProjectLayout,
        loader: projectLoader,
        children: [
          { index: true, Component: ProjectOverview },       // "/projects/42"
          { path: 'tasks', Component: ProjectTasks },        // "/projects/42/tasks"
          { path: 'settings', Component: ProjectSettings },  // "/projects/42/settings"
        ],
      },
      // Pathless LAYOUT route: groups children under a shared UI/guard without adding a URL segment
      {
        Component: AuthLayout,                                // no path
        children: [
          { path: 'login', Component: Login },
          { path: 'signup', Component: Signup },
        ],
      },
      { path: 'docs/*', Component: Docs },                    // splat: matches docs/a/b/c
      { path: '*', Component: NotFound },                     // catch-all 404
    ],
  },
]);

function RootLayout() {
  return (
    <>
      <Header />
      <main><Outlet /></main>            {/* ‼️ forget this and child routes render nothing */}
    </>
  );
}
```

```text
MATCHING RULES (React Router ranks routes — order in the array doesn't matter much)
  static segments beat dynamic:    /tasks/new  wins over  /tasks/:taskId
  optional segments:               path: 'lang?/about'  matches /about and /en/about
  child paths are RELATIVE:        'tasks' under 'projects/:id' → /projects/:id/tasks
                                   (a leading slash makes it absolute — usually a mistake)
  index route:                     the child shown at the parent's exact URL
  splat:                           params['*'] holds the rest of the path
```

---

## 5. Navigating — Link, NavLink, useNavigate, redirect

```tsx
import { Link, NavLink, useNavigate, redirect } from 'react-router';

// ── Link — the default for navigation ───────────────────────────────────────
<Link to="/tasks/7">Open task</Link>
<Link to="settings">Settings</Link>              // ‼️ relative to the current ROUTE
<Link to="..">Back to project</Link>             // up one route level
<Link to={{ pathname: '/tasks', search: '?status=open' }}>Open tasks</Link>
<Link to="/tasks/7" replace>…</Link>              // replace history entry (no new Back step)
<Link to="/tasks/7" state={{ from: 'board' }}>…</Link>   // invisible state: useLocation().state
<Link to="/tasks/7" prefetch="intent">…</Link>    // framework mode: preload on hover/focus
<Link to="/tasks/7" viewTransition>…</Link>       // animate with the View Transitions API
// ‼️ Link renders a real <a href> — Cmd+click / middle-click / "copy link" all work.
// Never navigate with <div onClick={() => navigate(...)}> for normal links.

// ── NavLink — a Link that knows if it's active ──────────────────────────────
<NavLink to="/tasks" className={({ isActive, isPending }) => (isActive ? 'active' : '')}>
  Tasks
</NavLink>
// Adds aria-current="page" when active (good for accessibility). `end` prop: only active on
// the exact path, not children (needed for "/" links).

// ── useNavigate — navigate from code (after an event) ───────────────────────
const navigate = useNavigate();
async function onSave() {
  const task = await api.create(values);
  navigate(`/tasks/${task.id}`, { replace: true });   // replace: Back shouldn't return to the form
}
navigate(-1);    // history back
// ‼️ Don't call navigate() during render — use <Navigate to="..." /> or a loader redirect.

// ── redirect — inside loaders/actions (data & framework modes) ──────────────
export async function loader() {
  if (!(await getUser())) throw redirect('/login');   // throw or return both work
  return null;
}
```

---

## 6. Route Params

```tsx
// route: { path: 'projects/:projectId/tasks/:taskId', ... }
import { useParams } from 'react-router';

function TaskPage() {
  const { projectId, taskId } = useParams();      // ‼️ always STRINGS (or undefined)
  const id = Number(taskId);                      // convert yourself
  if (!Number.isInteger(id)) return <NotFound />; // validate — users can type any URL
  // ...
}
```

```text
‼️ PARAMS GOTCHAS

  - Params are strings: "7", not 7. Validate (Zod) before using them in queries.
  - Same component, different param: /tasks/7 → /tasks/8 does NOT remount TaskPage.
    Local state (form inputs, "edit mode") from task 7 stays. Fixes:
      * key the component by the param:   <TaskForm key={taskId} />
      * or reset the state when the param changes
    (Effects/queries that depend on taskId re-run normally.)
  - URL-encode values you put into paths: `/search/${encodeURIComponent(term)}`.
  - Prefer ids (or "id-slug" like 42-fix-login) over names in paths — names change.
```

---

## 7. Search Params — The URL as State

```tsx
import { useSearchParams } from 'react-router';

function TaskList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'all';         // string | null → default
  const page = Number(searchParams.get('page') ?? '1');
  const q = searchParams.get('q') ?? '';

  function setStatus(next: string) {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);    // ‼️ copy — keep the OTHER params
      if (next === 'all') p.delete('status'); else p.set('status', next);
      p.delete('page');                       // changing a filter resets pagination
      return p;
    });
  }

  // Search box: replace instead of push, so each keystroke isn't a Back step
  function setQuery(next: string) {
    setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('q', next); return p; },
                    { replace: true });
  }
  // ...fetch with useQuery({ queryKey: ['tasks', { status, page, q }], ... })
}
```

```text
‼️ URL-AS-STATE RULES

  - The URL is the source of truth. Don't copy search params into useState and then try
    to keep them in sync — read them directly each render.
  - Everything is a string. Parse + validate + default every param (a Zod schema works:
    z.object({ page: z.coerce.number().int().min(1).catch(1) }) — .catch gives a
    fallback for garbage input instead of crashing).
  - Omit params that equal their default → clean, canonical URLs.
  - Typing in a search box: debounce + { replace: true }.
  - Pagination / tabs: push (users expect Back to go to the previous page/tab).
  - Arrays: ?tag=a&tag=b → searchParams.getAll('tag').
  - Put the parsed params into your query key so data and URL always match.
  - TanStack Router does all of this with types and validation built in (§18).
  - Next.js: useSearchParams() + router.push(`?${params}`), or the nuqs library.
```

---

## 8. Loaders — Fetch Before Render

```text
‼️ WHY LOADERS

   useEffect fetching:   render → effect → fetch → render data
                         Parent fetches, then renders child, which fetches → WATERFALL.
                         Spinners everywhere, layout jumps.
   Loaders:              navigation starts → ALL matching routes' loaders run IN PARALLEL
                         → render once the data is ready (or stream parts of it).
                         Fetching starts on the click, not after rendering.
```

```tsx
import { useLoaderData, type LoaderFunctionArgs, data } from 'react-router';

export async function taskLoader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);                  // search params live on request.url
  const res = await fetch(`/api/tasks/${params.taskId}`, { signal: request.signal });
  //                                                   ↑ ‼️ aborted if the user navigates away
  if (res.status === 404) {
    throw data('Task not found', { status: 404 });    // → nearest ErrorBoundary (§11)
  }
  if (!res.ok) throw new Error('Failed to load task');
  return { task: await res.json(), tab: url.searchParams.get('tab') ?? 'details' };
  // ‼️ v7: return plain objects. json() / defer() from v6 are gone/deprecated.
}

function TaskPage() {
  const { task, tab } = useLoaderData<typeof taskLoader>();   // typed from the loader
  return <TaskView task={task} tab={tab} />;
}
// Parent route data from a child: useRouteLoaderData('route-id') (give the route an id).
```

```tsx
// ── Streaming slow data: return a promise, render with <Await> / use() ──────
export async function projectLoader({ params }) {
  const project = await api.getProject(params.projectId);      // critical — wait for it
  const activity = api.getActivity(params.projectId);          // slow — DON'T await
  return { project, activity };                                // v7: promises stream automatically
}

function ProjectPage() {
  const { project, activity } = useLoaderData();
  return (
    <>
      <h1>{project.name}</h1>
      <Suspense fallback={<ActivitySkeleton />}>
        <Await resolve={activity} errorElement={<p>Couldn't load activity</p>}>
          {(items) => <ActivityList items={items} />}
        </Await>
      </Suspense>
    </>
  );
}
```

```text
WHEN LOADERS RE-RUN (revalidation)
  - navigating to the route, or when its params / search params change
  - ‼️ after ANY action (form submission) on the page — so data refreshes automatically
  - control it with shouldRevalidate({ currentUrl, nextUrl, formMethod, ... }) → boolean
  - useRevalidator().revalidate() to refresh manually (e.g. on window focus)
```

---

## 9. Actions, Form, and useFetcher — Mutations

```tsx
import { Form, useActionData, redirect, type ActionFunctionArgs } from 'react-router';

// Runs on non-GET submissions (<Form method="post">, fetcher.submit, useSubmit)
export async function taskAction({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');                // one action, several buttons

  if (intent === 'delete') {
    await api.deleteTask(params.taskId!);
    return redirect('/tasks');
  }

  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };   // → useActionData()
  }
  await api.updateTask(params.taskId!, parsed.data);
  return { ok: true };
  // After the action, loaders on the page REVALIDATE automatically → UI shows fresh data.
}

function TaskEdit() {
  const { task } = useLoaderData<typeof taskLoader>();
  const actionData = useActionData<typeof taskAction>();
  return (
    <Form method="post">                  {/* ‼️ <Form>, not <form>: submits to the route action */}
      <input name="title" defaultValue={task.title} />
      {actionData?.fieldErrors?.title && <p role="alert">{actionData.fieldErrors.title[0]}</p>}
      <button name="intent" value="save">Save</button>
      <button name="intent" value="delete">Delete</button>
    </Form>
  );
}
```

```tsx
// ── useFetcher — mutations/loads WITHOUT navigating ─────────────────────────
// For: toggling a checkbox in a list, "like" buttons, inline edits, autocomplete,
// newsletter forms in a footer — anything that shouldn't change the URL or history.
function TaskRow({ task }) {
  const fetcher = useFetcher();
  // optimistic: use the value being submitted while in flight
  const done = fetcher.formData ? fetcher.formData.get('done') === 'true' : task.done;
  return (
    <fetcher.Form method="post" action={`/tasks/${task.id}/toggle`}>
      <button name="done" value={String(!done)} aria-pressed={done}>
        {done ? '✓' : '○'} {task.title}
      </button>
      {fetcher.state !== 'idle' && <span aria-live="polite">Saving…</span>}
    </fetcher.Form>
  );
}
// fetcher.state: 'idle' | 'submitting' | 'loading'
// fetcher.data: what the action/loader returned
// fetcher.load('/api/search?q=re') — call a loader without navigating (autocomplete)
// Many fetchers can run at once (each row has its own) — unlike navigation, which is one at a time.
```

```text
<Form> vs fetcher.Form vs your own onSubmit
  <Form>           a NAVIGATION: may redirect, adds history (method="get" updates search params)
  fetcher.Form     no navigation, independent pending state per instance
  onSubmit + fetch fine when you use TanStack Query mutations instead of route actions —
                   just call queryClient.invalidateQueries afterwards (§13)
```

---

## 10. Pending UI — useNavigation and Optimistic Updates

```tsx
import { useNavigation } from 'react-router';

function RootLayout() {
  const navigation = useNavigation();
  // navigation.state: 'idle' | 'loading' (a loader is running) | 'submitting' (an action)
  const busy = navigation.state !== 'idle';
  return (
    <>
      {busy && <div className="top-progress-bar" role="progressbar" aria-label="Loading" />}
      <main style={{ opacity: navigation.state === 'loading' ? 0.6 : 1 }}>
        <Outlet />
      </main>
    </>
  );
}

// Is THIS form submitting?
const isSaving = navigation.state === 'submitting' && navigation.formAction === `/tasks/${id}`;
// navigation.location → where we're going (show which link is pending)
```

```text
‼️ HOW NAVIGATION FEELS

   With loaders, the OLD page stays on screen until the new page's data is ready
   (like a normal website, minus the white flash). Give feedback:
     - a global progress bar from useNavigation
     - NavLink isPending styles on the clicked link
     - skeletons only for streamed (non-awaited) data
   Without loaders (fetch in components), the new page renders immediately with spinners.
   Both are valid; loaders give fewer layout jumps and no waterfalls.

   HydrateFallback / hydrateFallbackElement: what to show while the FIRST load's loaders run
   in an SPA (there's no previous page to keep on screen).
```

---

## 11. Errors and 404s

```tsx
import { isRouteErrorResponse, useRouteError } from 'react-router';

// Data mode: ErrorBoundary on any route. Framework mode: export function ErrorBoundary.
// Catches: errors thrown in that route's loader/action/component, and anything its
// children don't catch themselves. ‼️ Errors bubble to the NEAREST boundary, so the
// layout above it stays rendered (header, nav still work).
function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    // thrown with data(..., { status }) or a Response
    if (error.status === 404) return <NotFound message={error.data} />;
    if (error.status === 401) return <p>Please <Link to="/login">sign in</Link>.</p>;
    return <p>{error.status} {error.statusText}</p>;
  }
  console.error(error);   // report to Sentry etc.
  return <p>Something went wrong. <button onClick={() => location.reload()}>Reload</button></p>;
}

const router = createBrowserRouter([
  {
    path: '/', Component: RootLayout, ErrorBoundary: RouteError,   // catches everything below
    children: [
      { path: 'tasks/:taskId', Component: TaskPage, loader: taskLoader, ErrorBoundary: RouteError },
      // ↑ task-level errors render INSIDE RootLayout, nav keeps working
      { path: '*', Component: NotFound },     // unknown URLs
    ],
  },
]);
```

```text
TWO KINDS OF 404
  1. No route matches the URL       → path: '*' route (or the root ErrorBoundary gets a 404)
  2. Route matches, record missing  → throw data('Not found', { status: 404 }) in the loader
     (/tasks/99999)                   so the boundary shows a proper "not found" page
  For SEO with SSR (framework mode / Next.js), make sure the HTTP status is really 404.
```

---

## 12. Auth and Protected Routes

```tsx
// ── Data mode: guard in a loader (runs BEFORE rendering — no flash of private content) ──
async function requireUser(request: Request) {
  const user = await getCurrentUser();             // from your auth client / cached query
  if (!user) {
    const from = new URL(request.url).pathname + new URL(request.url).search;
    throw redirect(`/login?redirectTo=${encodeURIComponent(from)}`);
  }
  return user;
}

const router = createBrowserRouter([
  { path: '/login', Component: Login, action: loginAction },
  {
    id: 'app',
    Component: AppLayout,
    loader: async ({ request }) => ({ user: await requireUser(request) }),  // guards ALL children
    children: [
      { path: 'dashboard', Component: Dashboard },
      {
        path: 'admin',
        loader: async ({ request }) => {
          const user = await requireUser(request);
          if (user.role !== 'admin') throw data('Forbidden', { status: 403 });
          return null;
        },
        Component: Admin,
      },
    ],
  },
]);
// Children read the user with useRouteLoaderData('app').

// After login, go back where they were — but ONLY to a same-site path:
async function loginAction({ request }) {
  const form = await request.formData();
  await auth.login(form.get('email'), form.get('password'));
  const to = new URL(request.url).searchParams.get('redirectTo') ?? '/dashboard';
  return redirect(to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard');
  // ‼️ validate redirectTo — an open redirect (?redirectTo=https://evil.com) is a phishing tool
}
```

```tsx
// ── Declarative mode: a wrapper component ───────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullPageSpinner />;          // ‼️ don't redirect before auth is known
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
// <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
// Or as a layout route: <Route element={<RequireAuth><Outlet /></RequireAuth>}> ...children </Route>
```

```text
‼️ CLIENT-SIDE GUARDS ARE UX, NOT SECURITY
   Anyone can open DevTools and render the admin page's JS. The API must check auth and
   permissions on every request. Route guards just stop users seeing pages they can't use.
   More: ../2-medium-priority/AUTH-DEEP.md
```

---

## 13. Loaders with TanStack Query

```text
‼️ THE BEST OF BOTH: loaders START the fetch early, TanStack Query OWNS the cache.

   Loader alone:          no shared cache between routes, no background refetch,
                          no stale-while-revalidate.
   TanStack Query alone:  fetching starts only when the component renders (waterfalls).
   Together:              loader calls queryClient.ensureQueryData → data is in the cache
                          before render; components use useQuery/useSuspenseQuery with the
                          same key and get caching, refetching and invalidation.
```

```tsx
const taskQuery = (id: string) => ({
  queryKey: ['task', id],
  queryFn: () => api.getTask(id),
  staleTime: 30_000,
});

export const taskLoader = (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    await queryClient.ensureQueryData(taskQuery(params.taskId!));  // returns cached if fresh
    return null;                                                   // data lives in the cache
  };

function TaskPage() {
  const { taskId } = useParams();
  const { data: task } = useSuspenseQuery(taskQuery(taskId!));    // already cached → instant
  return <TaskView task={task} />;
}

// Router setup gets the client:
const router = createBrowserRouter([{ path: 'tasks/:taskId', loader: taskLoader(queryClient), Component: TaskPage }]);

// Mutations: useMutation + invalidateQueries — the active useQuery refetches automatically.
// (Or a route action that invalidates: await queryClient.invalidateQueries({ queryKey: ['task', id] }))
```

---

## 14. Code Splitting — Lazy Routes

```tsx
// ‼️ Each route's code downloads only when it's first visited → smaller initial bundle.

// Data mode: route.lazy — loads the component AND loader/action in parallel with navigation
const router = createBrowserRouter([
  {
    path: 'reports',
    lazy: async () => {
      const m = await import('./routes/reports');
      return { Component: m.Reports, loader: m.loader, ErrorBoundary: m.ErrorBoundary };
    },
  },
]);
// Newer object form: lazy: { Component: async () => (await import('./reports')).Reports, ... }
// which loads each property independently.

// Declarative mode: React.lazy + Suspense
const Reports = lazy(() => import('./routes/Reports'));
<Route path="reports" element={<Suspense fallback={<PageSpinner />}><Reports /></Suspense>} />
// ‼️ With React.lazy, the code download starts at RENDER time (after navigation),
// and data fetching starts only after the code arrives → a waterfall. route.lazy avoids it.

// Framework mode, TanStack Router (autoCodeSplitting), Next.js: split per route automatically.

// Prefetch on hover/focus for instant navigation:
//   framework mode <Link prefetch="intent">; TanStack Router defaultPreload: 'intent';
//   Next.js <Link> prefetches automatically in production.
```

---

## 15. Scroll Restoration, Focus, and Page Titles

```tsx
// ── Scroll ──────────────────────────────────────────────────────────────────
// SPAs keep the scroll position between "pages" unless you handle it.
// Data mode: render once in the root layout
import { ScrollRestoration } from 'react-router';
function RootLayout() {
  return (<><Header /><Outlet /><ScrollRestoration /></>);
}
// → new pages start at the top; Back/Forward restore the previous position.
// getKey={(location) => location.pathname} → restore by path instead of history entry.
// <Link preventScrollReset> → don't scroll to top (e.g. changing tabs/filters on the same page).
// Declarative mode: no built-in component — useEffect on location.pathname → window.scrollTo(0, 0).

// ── Focus and announcements (accessibility) ─────────────────────────────────
// ‼️ A full page load moves focus to the top and screen readers announce the new title.
// A client-side navigation does NEITHER by default — screen reader users don't know the
// page changed. Move focus to the main heading after navigation:
function PageHeading({ children }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  useEffect(() => { ref.current?.focus(); }, [location.pathname]);
  return <h1 ref={ref} tabIndex={-1}>{children}</h1>;
}

// ── Titles ──────────────────────────────────────────────────────────────────
// React 19: render <title> anywhere; React hoists it into <head>.
function TaskPage() {
  const { task } = useLoaderData();
  return (<><title>{`${task.title} · Taskboard`}</title>...</>);
}
// Framework mode: export function meta() { return [{ title: '...' }] }
```

---

## 16. Blocking Navigation — Unsaved Changes

```tsx
import { useBlocker } from 'react-router';   // data & framework modes only

function EditTaskForm() {
  const [dirty, setDirty] = useState(false);

  // Block in-app navigation when dirty AND going to a different page
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname);

  // Tab close / reload / external links need beforeunload (the router can't block those)
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  return (
    <>
      <form onChange={() => setDirty(true)}>...</form>
      {blocker.state === 'blocked' && (
        <ConfirmDialog
          message="You have unsaved changes. Leave anyway?"
          onConfirm={() => blocker.proceed()}   // continue the navigation
          onCancel={() => blocker.reset()}      // stay
        />
      )}
    </>
  );
}
// ‼️ After saving, set dirty = false BEFORE navigating, or your own redirect gets blocked.
// Next.js App Router has no built-in blocker — use beforeunload + a guarded Link/router wrapper.
```

---

## 17. Modals, Tabs, and Other Routing UI Patterns

```text
TABS AS ROUTES                 /projects/42/tasks, /projects/42/settings
                               ✅ shareable, Back works, each tab lazy-loads
                               → nested routes with NavLink tabs and <Outlet/>
TABS AS SEARCH PARAMS          ?tab=settings — when tabs are light views of the same data

MODAL AS A ROUTE               /tasks/7 opens a modal over the list; refresh shows the task
                               page; Back closes the modal.
                               → nested route rendered as a modal on top of its parent's
                                 <Outlet/>; close = navigate('..')
                               → "background location" pattern: <Link to="/tasks/7"
                                 state={{ background: location }}> and render the list for
                                 state.background while showing the modal for the real URL
                               Next.js: intercepting + parallel routes ((.)tasks/[id])

MASTER–DETAIL                  /inbox/:messageId — list in the parent layout, detail in the
                               child route; the list keeps its scroll and selection.

BREADCRUMBS                    each route declares handle: { crumb: (data) => ... };
                               useMatches() gives all matched routes → render their crumbs.

MULTI-STEP FLOWS               /checkout/shipping → /checkout/payment, with a layout route
                               holding shared state, or the step in a search param.
```

```tsx
// Breadcrumbs with handle + useMatches
const routes = [{
  path: 'projects/:projectId', loader: projectLoader,
  handle: { crumb: (data) => <Link to={`/projects/${data.project.id}`}>{data.project.name}</Link> },
  children: [{ path: 'settings', handle: { crumb: () => <span>Settings</span> }, Component: Settings }],
}];

function Breadcrumbs() {
  const matches = useMatches();
  const crumbs = matches.filter(m => m.handle?.crumb).map(m => m.handle.crumb(m.data));
  return <nav aria-label="Breadcrumb"><ol>{crumbs.map((c, i) => <li key={i}>{c}</li>)}</ol></nav>;
}
```

---

## 18. TanStack Router — Type-Safe Routing

```text
‼️ WHAT MAKES IT DIFFERENT

   - Every route's params, search params, loader data and context are TYPED end to end.
     <Link to="/tasks/$taskId" params={{ taskId: '7' }} /> — a typo in the path or a
     missing param is a TypeScript error.
   - Search params are validated with a schema and are first-class typed state.
   - File-based routes (generated route tree) or code-based.
   - Built-in loader caching (stale-while-revalidate), preloading on intent, and
     beforeLoad for guards / context.
   - Pairs naturally with TanStack Query.
```

```tsx
// src/routes/tasks.$taskId.tsx  (file-based: $taskId = param)
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const searchSchema = z.object({
  tab: z.enum(['details', 'comments', 'history']).catch('details'),   // invalid → default
});

export const Route = createFileRoute('/tasks/$taskId')({
  validateSearch: searchSchema,                    // ‼️ search params parsed + typed
  beforeLoad: ({ context }) => {                   // guard: runs before loader
    if (!context.auth.user) throw redirect({ to: '/login' });
  },
  loader: async ({ params, context }) => {
    const task = await context.queryClient.ensureQueryData(taskQuery(params.taskId));
    if (!task) throw notFound();
    return { task };
  },
  component: TaskPage,
});

function TaskPage() {
  const { task } = Route.useLoaderData();          // typed
  const { tab } = Route.useSearch();               // 'details' | 'comments' | 'history'
  const navigate = Route.useNavigate();
  return (
    <>
      <h1>{task.title}</h1>
      <button onClick={() => navigate({ search: (prev) => ({ ...prev, tab: 'comments' }) })}>
        Comments
      </button>
    </>
  );
}

// Linking is type-checked:
<Link to="/tasks/$taskId" params={{ taskId: task.id }} search={{ tab: 'history' }}>History</Link>
```

---

## 19. Next.js App Router — How It Compares

```text
  CONCEPT              REACT ROUTER v7 (data/framework)     NEXT.JS APP ROUTER
  ───────────────────  ──────────────────────────────────  ──────────────────────────────────
  Route definition     route objects / routes.ts            folders: app/tasks/[id]/page.tsx
  Layout               parent route + <Outlet/>             layout.tsx wrapping {children}
  Params               useParams() / loader params          params prop (a Promise in Next 15+)
  Search params        useSearchParams()                    searchParams prop (server) /
                                                            useSearchParams() (client)
  Data loading         loader                               async Server Component (fetch
                                                            directly in the component)
  Mutations            action + <Form> / fetcher            Server Actions ('use server')
  Pending UI           useNavigation                        loading.tsx (Suspense), useTransition
  Errors               ErrorBoundary per route              error.tsx, not-found.tsx
  Navigation           <Link>, useNavigate                  <Link>, useRouter().push
  Redirect             redirect() in loader/action          redirect() in server code
  Guards               loader / beforeLoad                  middleware + layout checks
  Code splitting       route.lazy                           automatic per route

  Same ideas — nested layouts, data before render, mutations that revalidate —
  different APIs. More: ../2-medium-priority/NEXTJS-DEEP.md
```

---

## 20. Deployment — 404 on Refresh, Base Paths, Hash Routing

```text
‼️ "WORKS WHEN I CLICK AROUND, 404 WHEN I REFRESH"

   Clicking a <Link> to /tasks/7 never asks the server. Refreshing does: the server looks
   for a file at /tasks/7, finds none → 404.

   Fix: configure the host to serve index.html for every unknown path (SPA fallback),
   while still serving real files (JS, CSS, images) normally.

     Netlify      _redirects:      /*  /index.html  200
     Vercel       vercel.json:     { "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
     Nginx        try_files $uri $uri/ /index.html;
     S3+CloudFront  error response 403/404 → /index.html with status 200
                    (or a CloudFront Function rewrite)
     Express      app.use(express.static('dist'));
                  app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')));
     Vite dev     handles this automatically (that's why it works locally).

   ‼️ Keep API routes OUT of the fallback (/api/* must still 404 properly).
```

```text
APP NOT AT THE DOMAIN ROOT (e.g. https://company.com/taskboard/)
  - Vite:            base: '/taskboard/'           (asset URLs)
  - React Router:    createBrowserRouter(routes, { basename: '/taskboard' })
                     or <BrowserRouter basename="/taskboard">
  - The server fallback must serve /taskboard/index.html for /taskboard/*

HASH ROUTING (createHashRouter / <HashRouter>): URLs like /#/tasks/7
  The server only ever sees "/", so no fallback config is needed.
  Use it only when you can't configure the server (some static hosts, file:// in Electron
  or embedded webviews). Downsides: ugly URLs, worse SEO, no SSR, conflicts with #anchors.
```

---

## 21. Testing Routed Components

```tsx
import { createMemoryRouter, RouterProvider, createRoutesStub } from 'react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Data mode: an in-memory router with just the routes you need ────────────
test('shows the task and navigates back to the list', async () => {
  const router = createMemoryRouter(
    [
      { path: '/tasks', element: <h1>All tasks</h1> },
      { path: '/tasks/:taskId', element: <TaskPage />, loader: () => ({ task: { id: '7', title: 'Fix login' } }) },
    ],
    { initialEntries: ['/tasks/7'] },              // start at this URL
  );
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole('heading', { name: 'Fix login' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: /back/i }));
  expect(await screen.findByRole('heading', { name: 'All tasks' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/tasks');   // assert the URL
});

// ── createRoutesStub (v7): stub loaders/actions for a component under test ──
const Stub = createRoutesStub([
  { path: '/tasks/:taskId', Component: TaskPage, loader: () => ({ task: fakeTask }) },
]);
render(<Stub initialEntries={['/tasks/7']} />);

// ── Declarative mode: wrap in MemoryRouter ──────────────────────────────────
render(
  <MemoryRouter initialEntries={['/tasks?status=open']}>
    <Routes><Route path="/tasks" element={<TaskList />} /></Routes>
  </MemoryRouter>,
);
// ‼️ "useNavigate() may be used only in the context of a <Router>" in tests → you rendered a
// component that uses router hooks without a router wrapper.
```

---

## 22. Common Pitfalls

```text
  Each entry:  ✗ symptom
                 why  → the cause
                 fix  → what to do

  ✗ ‼️ 404 when refreshing any page except "/"
      why  → the server has no file for that path
      fix  → SPA fallback to index.html on the host (§20)

  ✗ Child route renders nothing
      why  → the parent component has no <Outlet />
      fix  → render <Outlet /> where children belong (§4)

  ✗ Link goes to the wrong URL
      why  → relative paths resolve against the current ROUTE, or a leading "/" made it absolute
      fix  → check relative vs absolute; use ".." to go up a route level (§5)

  ✗ ‼️ Old data/state stays when switching /tasks/7 → /tasks/8
      why  → same component, not remounted
      fix  → key={taskId} on the stateful child, or reset state on param change (§6)

  ✗ Params/search params used as numbers break
      why  → they're always strings (or null)
      fix  → parse + validate with defaults (Zod .catch) (§6, §7)

  ✗ Changing one filter wipes the other search params
      why  → setSearchParams({ status }) replaces everything
      fix  → copy prev into a new URLSearchParams and set one key (§7)

  ✗ Back button needs 20 presses after typing in search
      why  → each keystroke pushed a history entry
      fix  → { replace: true } (+ debounce) for search inputs (§7)

  ✗ Filter state lost on refresh / can't share a link
      why  → filters kept in useState
      fix  → keep them in search params (§7)

  ✗ Loading waterfalls (parent loads, then child loads, then grandchild)
      why  → fetching in useEffect per component
      fix  → route loaders (parallel), or ensureQueryData in loaders (§8, §13)

  ✗ Loader data stale after a mutation
      why  → mutation done outside actions (plain fetch / mutation hook)
      fix  → submit through an action (auto revalidation), useRevalidator, or invalidate queries

  ✗ Private page flashes before redirecting to login
      why  → auth checked in a component effect after render
      fix  → guard in a loader / beforeLoad; or render a spinner while auth is loading (§12)

  ✗ Users redirected away from a valid page on refresh
      why  → guard redirected while auth was still loading (user = null for a moment)
      fix  → wait for the auth state before deciding (§12)

  ✗ Open redirect vulnerability
      why  → redirectTo taken from the URL unchecked
      fix  → only allow same-site relative paths (§12)

  ✗ "useNavigate() may be used only in the context of a <Router>"
      why  → component rendered outside the router (often in tests or a portal root)
      fix  → wrap in the router / MemoryRouter / createRoutesStub (§21)

  ✗ Router state resets / app remounts on every render
      why  → createBrowserRouter called inside a component
      fix  → create the router once at module scope (§3)

  ✗ Page stays scrolled down after navigating
      why  → no scroll restoration in an SPA
      fix  → <ScrollRestoration /> or scrollTo on pathname change (§15)

  ✗ Screen readers don't notice page changes
      why  → client navigation doesn't move focus or announce
      fix  → focus the h1 after navigation; update <title> (§15)

  ✗ Lazy routes load slowly (code, then data)
      why  → React.lazy downloads code at render time
      fix  → route.lazy (parallel with loaders), prefetch on intent (§14)

  ✗ Cmd+click on navigation items doesn't open a new tab
      why  → navigation done with onClick + navigate()
      fix  → use <Link> / <NavLink> (real <a href>) (§5)
```

---

## 23. Interview Questions

### "How does client-side routing work?"

The router intercepts link clicks (`preventDefault`), updates the URL with `history.pushState`, matches the new path against route definitions and renders the matching components, keeping shared layouts mounted. Back/Forward fire `popstate`, which the router listens to. On a hard refresh the server must return `index.html` for any app path, then the router takes over.

### "What are nested routes and `<Outlet />`?"

Routes mirror UI nesting: a parent route renders shared layout and an `<Outlet />` where the matching child renders. Navigating between children only re-renders the inner part, preserving the layout's state. Index routes render at the parent's exact path; pathless layout routes group children under shared UI or guards without adding a URL segment.

### "Why use loaders instead of fetching in `useEffect`?"

Loaders start fetching when navigation starts, run in parallel for all matched routes, and render once with the data — avoiding the render-then-fetch waterfalls and spinner cascades of effects. They also integrate with pending UI, error boundaries, request cancellation and automatic revalidation after actions. Combined with TanStack Query (`ensureQueryData`), you also get caching.

### "What should go in the URL?"

Anything that should survive a refresh, be shareable or bookmarkable, or work with Back: the page, the selected resource, filters, sorting, pagination, tabs and search text. The URL is then the single source of truth — read params each render instead of mirroring them in state, and validate them because users can type anything.

### "How do you protect routes?"

Check auth before render: in a loader or `beforeLoad` that redirects to login (with a validated `redirectTo`), or with a wrapper/layout route that waits for auth state and renders `<Navigate>`. Role checks the same way. Stress that client guards are UX only — the API must enforce authorization.

### "Why do I get a 404 when I refresh a page in production?"

The server is asked for a path that only exists in the client router. Configure an SPA fallback that serves `index.html` for unknown non-asset, non-API paths. Vite's dev server does this automatically, which is why it only breaks in production.

### "How do you code-split routes?"

Lazy-load each route's module so its code downloads on first visit — `route.lazy` in React Router data mode (loads code and loader in parallel), `React.lazy` + `Suspense` in declarative mode, or automatic splitting in frameworks — and prefetch on hover/focus for instant transitions.

### "React Router vs TanStack Router vs Next.js?"

React Router: the most widely used, flexible, with declarative/data/framework modes. TanStack Router: fully type-safe params, search params and loader data with schema-validated search params and built-in caching. Next.js App Router: file-system routing integrated with Server Components, server actions and SSR. Same core ideas — nested layouts, data before render, mutations that revalidate.

---

## Related Files

- [BROWSER-DOM-EVENTS-DEEP.md](BROWSER-DOM-EVENTS-DEEP.md) — history API, popstate, scroll, focus (§12, §15, §22)
- [REACT-FORMS-DEEP.md](REACT-FORMS-DEEP.md) — forms with route actions, unsaved changes
- [TANSTACK-QUERY-BASICS.md](TANSTACK-QUERY-BASICS.md) — the cache that loaders feed
- [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) — testing components with routers
- [FRONTEND-ARCHITECTURE-DEEP.md](FRONTEND-ARCHITECTURE-DEEP.md) — app structure around routes
- [../2-medium-priority/NEXTJS-DEEP.md](../2-medium-priority/NEXTJS-DEEP.md) — App Router in depth
- [../2-medium-priority/AUTH-DEEP.md](../2-medium-priority/AUTH-DEEP.md) — sessions, tokens, real authorization
- [../2-medium-priority/ANIMATION-DEEP.md](../2-medium-priority/ANIMATION-DEEP.md) — route transitions, View Transitions
