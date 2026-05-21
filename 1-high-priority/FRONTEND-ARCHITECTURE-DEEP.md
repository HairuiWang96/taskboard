# Frontend Architecture

"Frontend architecture" is about how you structure a large frontend application so it stays maintainable as the codebase, team, and feature set grows. Junior developers write components. Senior developers design the system those components live in.

This comes up in senior interviews as: "How would you structure a large React app?", "How do you decide where state should live?", "How would you set up a new frontend from scratch?"

---

## What Frontend Architecture Actually Means

```text
A frontend architecture defines:
  - How code is organised (folder structure, module boundaries)
  - Where state lives and how it flows
  - How data is fetched, cached, and synchronised
  - How the UI is split into components and how they communicate
  - How the app is split into routes and loaded
  - How multiple teams can work without stepping on each other
  - What rendering strategy is used (CSR, SSR, SSG, hybrid)
  - How the app scales without becoming a big ball of mud

Bad architecture:
  - Everything in one giant "components" folder
  - State scattered everywhere (local state, Redux, context, and props all mixed)
  - Components that do too many things (fetch data + render UI + handle business logic)
  - No clear boundaries — any file can import from any file
  - One person's change breaks another person's feature

Good architecture:
  - Clear, predictable structure — new developers find things fast
  - Obvious place for every new piece of code
  - Changes are local — editing one feature doesn't ripple to others
  - State flows in one direction, is easy to trace
  - Performance is built in, not bolted on
```

---

## 1. Project Structure

### Layer-based (bad for large apps)

```text
src/
  components/     # all UI components mixed together
  hooks/          # all hooks mixed together
  utils/          # all utilities mixed together
  services/       # all API calls mixed together
  store/          # all state mixed together

Problem: as the app grows, each folder becomes a dumping ground.
Finding everything related to "checkout" means searching across all folders.
```

### Feature-based (recommended for large apps)

```text
src/
  features/
    auth/
      components/     LoginForm.tsx, SignupModal.tsx
      hooks/          useAuth.ts, useSession.ts
      api/            auth.api.ts (API calls for this feature)
      store/          auth.slice.ts (state for this feature)
      types/          auth.types.ts
      index.ts        public API — what other features can import
    checkout/
      components/
      hooks/
      api/
      store/
      index.ts
    dashboard/
      ...
  shared/             # things used by multiple features
    components/       Button, Input, Modal, Table (design system)
    hooks/            useDebounce, useLocalStorage, useMediaQuery
    utils/            formatDate, formatCurrency, validators
    types/            common types
  app/
    router.tsx        route definitions
    store.ts          root store setup
    App.tsx

Key rule: features can import from shared/, but NOT from each other.
If two features need to share something, move it to shared/.
This enforces clear boundaries between features.
```

### Barrel files (index.ts) — the public API pattern

```typescript
// features/auth/index.ts — the public API of this feature
// Only export what other parts of the app should use
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export type { User, AuthState } from './types/auth.types';

// What's NOT exported (internal implementation details):
// - AuthFormField.tsx (internal component)
// - authHelpers.ts (internal utilities)
// - auth.slice.ts (internal state — exposed via useAuth hook)

// Other features import from the index, not from internals:
// ✓ import { useAuth } from '@/features/auth'
// ✗ import { useAuth } from '@/features/auth/hooks/useAuth' — breaks encapsulation
```

---

## 2. Component Architecture

### The three-layer component model

```text
Page components (route level):
  - One per route
  - Orchestrate data fetching for the page
  - Compose feature components
  - Minimal logic, minimal JSX
  - Example: CheckoutPage.tsx, DashboardPage.tsx

Feature components:
  - Own a section of the UI
  - Can have their own state and data fetching (via hooks)
  - Composed from UI components
  - Example: CartSummary.tsx, UserProfileCard.tsx

UI components (design system):
  - Pure presentational — receive props, render UI
  - No business logic, no data fetching
  - Reusable across the whole app
  - Example: Button, Input, Modal, DataTable
```

```typescript
// Page component — orchestrates, minimal logic
function CheckoutPage() {
  return (
    <div className="checkout-layout">
      <CartSummary />       {/* feature component — has own data fetching */}
      <DeliveryForm />      {/* feature component — has own state */}
      <PaymentSection />    {/* feature component */}
      <OrderSummary />      {/* feature component */}
    </div>
  );
}

// Feature component — owns a section, may fetch data
function CartSummary() {
  const { items, total } = useCart(); // hook owns the data fetching + logic
  return (
    <Card>
      <CardHeader>Your cart ({items.length} items)</CardHeader>
      {items.map(item => (
        <CartItem key={item.id} item={item} /> // UI component
      ))}
      <CartTotal total={total} />              // UI component
    </Card>
  );
}

// UI component — pure, no dependencies on business logic
function CartItem({ item }: { item: CartItemType }) {
  return (
    <div className="cart-item">
      <img src={item.imageUrl} alt={item.name} />
      <span>{item.name}</span>
      <span>{formatCurrency(item.price)}</span>
    </div>
  );
}
```

### Smart vs dumb components (container/presenter pattern)

```typescript
// Smart (container) — knows about data and state
function UserProfileContainer({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useUser(userId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <UserProfile user={user} />;
}

// Dumb (presenter) — pure UI, fully testable in isolation
function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <Avatar src={user.avatar} name={user.name} />
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </div>
  );
}
```

### Compound components pattern

```typescript
// API: <Select> with nested <Select.Option> sub-components
// Better than passing everything as props — more flexible, readable

const SelectContext = React.createContext<SelectContextType | null>(null);

function Select({ value, onChange, children }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  );
}

Select.Option = function Option({ value, children }: OptionProps) {
  const ctx = useContext(SelectContext)!;
  return (
    <div
      className={ctx.value === value ? 'option selected' : 'option'}
      onClick={() => ctx.onChange(value)}
    >
      {children}
    </div>
  );
};

// Usage — clean, flexible
<Select value={selectedRole} onChange={setSelectedRole}>
  <Select.Option value="admin">Admin</Select.Option>
  <Select.Option value="editor">Editor</Select.Option>
  <Select.Option value="viewer">Viewer</Selecct.Option>
</Select>
```

---

## 3. State Architecture

This is the most important architectural decision. The rule: **state should live as close to where it's used as possible, and no higher.**

### The four types of frontend state

```text
1. Server state (remote data)
   - Data that lives on the server and is fetched via API
   - Has a lifecycle: loading, success, error, stale, refetching
   - Examples: user profile, product list, order history
   - Tool: TanStack Query (React Query) or SWR — NOT Redux
   
2. Global client state (shared UI state)
   - Data that multiple components need but doesn't come from the server
   - Should be minimal — most devs put too much here
   - Examples: auth user object, theme, sidebar open/closed, active modal
   - Tool: Zustand, Jotai, or React Context (for rarely-changing data)

3. URL state (navigation state)
   - State that should be in the URL (so links are shareable)
   - Examples: search query, filters, pagination, sort order, tab selection
   - Tool: router (Next.js, React Router) — use query params
   - Rule: if the user would expect the state to survive a page refresh or be shareable, put it in the URL

4. Local component state
   - State only one component needs
   - Examples: form input values, hover state, dropdown open/closed, validation errors
   - Tool: useState, useReducer (for complex local state)
```

```typescript
// Example: search page state architecture

// URL state — search query, page, filters (shareable link)
// /products?q=shoes&category=running&sort=price&page=2
const [searchParams, setSearchParams] = useSearchParams();
const query = searchParams.get('q') ?? '';
const page = Number(searchParams.get('page') ?? 1);

// Server state — fetched data (TanStack Query)
const { data: products, isLoading } = useQuery({
  queryKey: ['products', query, page],
  queryFn: () => api.products.search({ query, page }),
});

// Global state — auth (Zustand)
const user = useAuthStore(state => state.user);

// Local state — dropdown open/closed
const [filtersOpen, setFiltersOpen] = useState(false);

// NOT in state at all — derived values
const totalPages = Math.ceil((products?.total ?? 0) / PAGE_SIZE);
const hasResults = (products?.items?.length ?? 0) > 0;
```

### TanStack Query (React Query) — server state architecture

```typescript
// The right way to handle server state
// Replaces useEffect + useState for data fetching

// Define queries in a dedicated file — queryKeys pattern
// features/products/api/products.queries.ts
export const productQueries = {
  all: () => ['products'] as const,
  lists: () => [...productQueries.all(), 'list'] as const,
  list: (filters: ProductFilters) => [...productQueries.lists(), filters] as const,
  details: () => [...productQueries.all(), 'detail'] as const,
  detail: (id: string) => [...productQueries.details(), id] as const,
};

// Use in components
function ProductList({ filters }: { filters: ProductFilters }) {
  const { data, isLoading, error } = useQuery({
    queryKey: productQueries.list(filters),
    queryFn: () => api.products.list(filters),
    staleTime: 1000 * 60 * 5,  // 5 minutes before refetching
  });
}

// Mutations with cache invalidation
function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => {
      // Invalidate the list — will refetch automatically
      queryClient.invalidateQueries({ queryKey: productQueries.lists() });
    },
  });
}
```

---

## 4. Data Fetching Architecture

```text
Anti-pattern: fetch data in a useEffect inside the component
  - Creates request waterfalls (parent fetches, then child fetches)
  - Hard to share data between components
  - Error handling scattered everywhere
  - No caching — refetches on every mount

Pattern: data fetching belongs in the route or in custom hooks

Option A: Route-level fetching (Next.js App Router / React Router loaders)
  - Data is loaded before the component renders
  - No loading spinners for initial page load
  - Better UX for critical data

Option B: Component-level with TanStack Query
  - Data fetching co-located with the component that needs it
  - Automatic caching, deduplication, background refetching
  - Good for data that isn't needed on initial render
```

```typescript
// Next.js App Router — route-level fetching (server component)
// app/products/[id]/page.tsx
async function ProductPage({ params }: { params: { id: string } }) {
  // Fetch on the server — no loading state, no useEffect
  const product = await api.products.getById(params.id);
  return <ProductDetail product={product} />;
}

// React Router v6 — loader pattern
// router.tsx
{
  path: '/products/:id',
  element: <ProductPage />,
  loader: async ({ params }) => {
    return await api.products.getById(params.id);
  },
}

// ProductPage.tsx
function ProductPage() {
  const product = useLoaderData(); // data is already fetched
  return <ProductDetail product={product} />;
}
```

### Avoiding request waterfalls

```typescript
// Waterfall (bad): child can't fetch until parent has rendered
function ParentComponent() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
  if (!user) return <Loading />;
  return <ChildComponent userId={user.id} />;
}

function ChildComponent({ userId }: { userId: string }) {
  // This fetch only starts AFTER the parent fetch completes
  const { data: orders } = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetchOrders(userId),
  });
}

// Parallel (good): both start at the same time
function ParentComponent() {
  // Prefetch or fetch at the same level
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
  const { data: orders } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => fetchOrders(user!.id),
    enabled: !!user?.id, // only run when user is available, but both are registered
  });
}
```

---

## 5. Routing Architecture

```typescript
// Next.js App Router — file-system routing
app/
  layout.tsx            // root layout (nav, footer)
  page.tsx              // home page /
  (auth)/               // route group — shared layout, no URL segment
    login/page.tsx      // /login
    signup/page.tsx     // /signup
  dashboard/
    layout.tsx          // dashboard shell (sidebar)
    page.tsx            // /dashboard
    settings/
      page.tsx          // /dashboard/settings
  products/
    page.tsx            // /products (list)
    [id]/
      page.tsx          // /products/123 (detail)
      loading.tsx       // Suspense boundary for this route
      error.tsx         // Error boundary for this route
  api/
    products/route.ts   // /api/products (API route)

// Code splitting is automatic — each page is a separate bundle
// Users only download the code for the route they're on
```

```typescript
// React Router v6 — explicit route tree
// router.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'dashboard',
        element: <DashboardLayout />,
        loader: dashboardLoader,   // prefetch data for the whole dashboard
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'settings', element: <Settings />, loader: settingsLoader },
        ],
      },
      {
        path: 'products',
        children: [
          { index: true, element: <ProductList />, loader: productsLoader },
          { path: ':id', element: <ProductDetail />, loader: productDetailLoader },
        ],
      },
    ],
  },
]);

// Lazy loading routes — only load component bundle when route is first visited
const ProductList = lazy(() => import('./features/products/ProductList'));
```

---

## 6. Rendering Strategy Architecture

```text
CSR (Client-Side Rendering):
  - Browser downloads JS bundle, runs it, renders the page
  - Good for: dashboards, admin tools, apps behind login
  - Bad for: SEO, initial page load performance
  - Example: plain React app (Create React App)

SSR (Server-Side Rendering):
  - Server renders HTML, sends to browser, JS hydrates
  - Good for: SEO, faster initial paint, dynamic content
  - Bad for: server cost, more complex infrastructure
  - Example: Next.js with server components

SSG (Static Site Generation):
  - HTML generated at build time
  - Fastest possible — served from CDN
  - Good for: marketing pages, docs, blogs
  - Bad for: frequently changing data, user-specific content
  - Example: Next.js with generateStaticParams

ISR (Incremental Static Regeneration):
  - Regenerates individual pages on demand or on a schedule
  - Good for: content that changes occasionally
  - Example: Next.js revalidate option

Hybrid (most production apps):
  - Mix strategies per route
  - Marketing pages → SSG
  - Product pages → SSR or ISR
  - Dashboard → CSR or SSR
  - API routes → server
```

```typescript
// Next.js — per-route rendering strategy

// Static (SSG) — build time
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await api.posts.getAll();
  return posts.map(post => ({ slug: post.slug }));
}

// Dynamic (SSR) — every request
export const dynamic = 'force-dynamic'; // opt out of caching

// ISR — regenerate every 60 seconds
export const revalidate = 60;

// Partial prerendering — static shell + dynamic content
// (Next.js 14+)
async function ProductPage({ params }) {
  return (
    <div>
      <StaticProductHeader />  {/* rendered at build time */}
      <Suspense fallback={<PriceSkeleton />}>
        <DynamicPrice productId={params.id} />  {/* rendered per-request */}
      </Suspense>
    </div>
  );
}
```

---

## 7. Monorepo Architecture

For large products with multiple apps or teams.

```text
Turborepo structure:
apps/
  web/          main Next.js app
  admin/        admin dashboard
  docs/         documentation site
  mobile/       React Native app (optional)

packages/
  ui/           shared component library (Button, Input, Modal)
  api-client/   generated API client (from OpenAPI spec)
  config/       shared ESLint, TypeScript, Tailwind configs
  utils/        shared utility functions
  types/        shared TypeScript types

Benefits:
  - Shared code: UI components used by web and admin are in one place
  - Single install: one npm install for everything
  - Coordinated changes: rename a type → all apps caught at once
  - Turborepo caches builds: only rebuild what changed

When to use a monorepo:
  - Multiple apps sharing substantial code
  - Team working across apps simultaneously
  - Shared design system

When NOT to use a monorepo:
  - Single app (adds complexity for no benefit)
  - Teams with very different release cycles
  - Early stage — start simple, migrate later
```

```json
// turbo.json — build pipeline
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // build dependencies first
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 8. Module Boundary Rules

In a large codebase, without rules on what can import what, everything becomes interdependent and impossible to refactor.

```text
Import rules (enforce with ESLint eslint-plugin-boundaries):

features/auth     → can import from: shared/, app/
features/checkout → can import from: shared/, app/
features/checkout → CANNOT import from: features/auth (use shared/ if needed)
shared/           → can import from: nothing (no feature dependencies)
app/              → can import from: features/, shared/

Why this matters:
  - Circular dependencies → impossible to tree-shake, hard to test
  - Feature imports → change in auth breaks checkout
  - Uncontrolled deps → refactoring one thing breaks many others
```

```typescript
// .eslintrc — enforce boundaries
{
  "plugins": ["boundaries"],
  "rules": {
    "boundaries/element-types": ["error", {
      "default": "disallow",
      "rules": [
        { "from": "feature", "allow": ["shared", "app"] },
        { "from": "shared",  "allow": [] },
        { "from": "app",     "allow": ["feature", "shared"] },
      ]
    }]
  }
}
```

---

## Common Interview Questions

### "How would you structure a large React application?"

> I use feature-based structure. Each feature (auth, checkout, dashboard) gets its own folder with components, hooks, API calls, and state — everything related to that feature in one place. Shared things (design system, utilities, common types) go in a `shared/` folder. Each feature exposes a public API via `index.ts` and other features can only import from that index, not from internal files. This enforces boundaries: changing one feature's internals doesn't break others. The app layer wires up routing and the root store. The benefit is that a new developer can open the `checkout` folder and find everything they need — no hunting across `components/`, `hooks/`, `utils/` trying to piece together what belongs together.

### "Where should state live in a React application?"

> Four types of state, each with the right home. **Server state** (API data) belongs in TanStack Query — it handles caching, background refetching, and loading states automatically. Don't put API data in Redux or Zustand. **URL state** (filters, search, pagination) belongs in the URL as query params — it makes links shareable and survives page refresh. **Global UI state** (auth user, theme, modal open) belongs in Zustand or Context — but keep this minimal, most devs put too much here. **Local state** (form values, dropdown open) belongs in `useState` close to where it's used. The rule: state should live as close to where it's used as possible. Lift it up only when multiple components genuinely need it — and even then, reach for the URL or TanStack Query before reaching for a global store.

### "What is a rendering strategy and how do you choose?"

> The rendering strategy determines when and where HTML is generated. CSR (client-side rendering) sends a minimal HTML shell and renders everything in the browser — good for dashboards and authenticated apps where SEO doesn't matter. SSR (server-side rendering) generates HTML per request on the server — better initial load, good for SEO, works for dynamic or user-specific content. SSG (static generation) generates HTML at build time — fastest possible, served from CDN, best for marketing pages and docs that don't change often. ISR (incremental static regeneration) is SSG with a revalidation interval — good for content that changes occasionally. Modern apps mix strategies per route: SSG for the homepage and marketing pages, SSR or ISR for product pages, CSR for the dashboard. Next.js App Router makes this per-route decision explicit.

### "What is a monorepo and when would you use one?"

> A monorepo is a single repository containing multiple applications or packages — for example, a web app, an admin app, and a shared component library all in one repo. The advantage: code sharing is easy (one import, no versioning), changes that affect multiple apps are made atomically, and the TypeScript compiler catches breakage across the whole codebase at once. Tools like Turborepo handle the build orchestration — only rebuilding what changed, running tasks in parallel. I'd use a monorepo when multiple apps share substantial code (especially a design system), when teams work across apps frequently, or when coordinated releases are important. I wouldn't use it for a single app (unnecessary complexity) or very early stage where structure should stay simple.
