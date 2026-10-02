# Next.js — Senior Developer Deep Reference

> Covers App Router, Server Components, data fetching, caching, Server Actions, proxy (middleware), and performance.
>
> Updated for Next.js 16 (October 2026). Next 15 and 16 changed several defaults — caching,
> async request APIs, the middleware file name, the bundler — so tutorials written for
> Next 13–14 are now misleading in places. Those changes are flagged with ‼️ below.

---

## Table of Contents

1. [App Router vs Pages Router](#1-app-router-vs-pages-router)
2. [Server Components vs Client Components](#2-server-components-vs-client-components)
3. [Data Fetching](#3-data-fetching)
4. [Caching & Revalidation](#4-caching--revalidation)
5. [Server Actions](#5-server-actions)
6. [Routing & Navigation](#6-routing--navigation)
7. [Proxy (formerly Middleware)](#7-proxy-formerly-middleware)
8. [Rendering Strategies](#8-rendering-strategies)
9. [Performance Optimization](#9-performance-optimization)
10. [What Changed in Next 15 and 16](#10-what-changed-in-next-15-and-16)
11. [Common Interview Questions](#11-common-interview-questions)

---

## 1. App Router vs Pages Router

### Architecture Comparison

```text
Pages Router (legacy, /pages dir — still supported, in maintenance):
  /pages/index.tsx          → /
  /pages/about.tsx          → /about
  /pages/blog/[slug].tsx    → /blog/:slug
  /pages/api/users.ts       → API route (Node.js handler)

  Data fetching:
    getStaticProps    → SSG (build time)
    getServerSideProps → SSR (every request)
    getStaticPaths    → dynamic SSG routes

App Router (current, /app dir — Next.js 13.4+):
  /app/page.tsx             → /
  /app/about/page.tsx       → /about
  /app/blog/[slug]/page.tsx → /blog/:slug
  /app/api/users/route.ts   → Route Handler

  ‼️ Key differences:
    - Layouts are persistent and composable (no re-mount on navigation)
    - Default: Server Components (zero JS sent to browser)
    - Nested layouts share state without re-rendering parent
    - Streaming + Suspense built-in
    - Server Actions replace API routes for mutations
```

### File Conventions (App Router)

```text
app/
  layout.tsx        ← ‼️ wraps all children, persists across navigation (don't re-mount)
  page.tsx          ← the route's UI (publicly accessible)
  loading.tsx       ← Suspense fallback — shown while page.tsx is streaming
  error.tsx         ← error boundary — must be Client Component ('use client')
  not-found.tsx     ← rendered when notFound() is called
  template.tsx      ← like layout but re-mounts on navigation (rare)
  route.ts          ← API endpoint (GET, POST, etc.) — no UI

  (group)/          ← route group — doesn't affect URL, used for layout organization
  [param]/          ← dynamic segment
  [...slug]/        ← catch-all segment
  [[...slug]]/      ← optional catch-all (matches / too)
  @modal/           ← parallel route — render multiple pages simultaneously
  (.)photo/[id]/    ← intercepting route — show modal over current page

proxy.ts            ← at the project root (next to app/) — runs before requests
                      (named middleware.ts before Next 16 — see §7)
```

---

## 2. Server Components vs Client Components

### The Mental Model

```text
‼️ In App Router, ALL components are Server Components by default.
   They run on the server, have NO JavaScript sent to the browser.

Server Components CAN:
  ✓ directly await data (no useEffect fetch needed)
  ✓ access filesystem, databases, secrets
  ✓ import heavy server-only libraries (no bundle cost)
  ✓ render other Server or Client Components

Server Components CANNOT:
  ✗ use hooks (useState, useEffect, useContext...)
  ✗ use browser APIs (window, document)
  ✗ add event listeners (onClick, onChange...)
  ✗ use context providers (must wrap in Client Component)

Client Components ('use client' directive):
  ✓ all React hooks work normally
  ✓ browser APIs
  ✓ event handlers
  ✗ can NOT be async functions
  ✗ can NOT directly await server-only data

‼️ The component tree is split at 'use client' boundaries.
   Everything above a 'use client' boundary runs on the server.
   Everything at or below runs on the client (hydrated).
```

### Composition Patterns

```tsx
// ‼️ Server Component wrapping a Client Component — most common pattern
// ServerPage.tsx (no directive — Server Component)
import ClientCard from './ClientCard';

export default async function ServerPage() {
    const data = await fetch('https://api.example.com/data').then(r => r.json());

    return (
        <main>
            <h1>{data.title}</h1>
            <ClientCard initialData={data} /> {/* pass serializable data as props */}
        </main>
    );
}
```

```tsx
// ClientCard.tsx
'use client';
import { useState } from 'react';

export default function ClientCard({ initialData }) {
    const [liked, setLiked] = useState(false);
    return (
        <div>
            <p>{initialData.description}</p>
            <button onClick={() => setLiked(l => !l)}>{liked ? '❤️' : '🤍'}</button>
        </div>
    );
}
```

```tsx
// ‼️ You CAN pass a Server Component as children/prop to a Client Component
// The Server Component is rendered on the server, result passed as prop (already rendered)

// ClientWrapper.tsx
'use client';
import { useState } from 'react';

export default function ClientWrapper({ children }) {
    const [open, setOpen] = useState(true);
    return open ? <div>{children}</div> : null;
    // ‼️ `children` is already rendered Server Component output — no re-execution
}
```

```tsx
// page.tsx (Server Component)
import ClientWrapper from './ClientWrapper';
import ServerContent from './ServerContent'; // Server Component

export default function Page() {
    return (
        <ClientWrapper>
            <ServerContent /> {/* rendered on server, passed as prop */}
        </ClientWrapper>
    );
}
```

---

## 3. Data Fetching

### Fetch in Server Components

```tsx
// ‼️ Next.js extends the native fetch API with caching options
// ‼️ NEXT 15 CHANGED THE DEFAULT: fetch() is NOT cached unless you opt in.
//    (Next 13–14 cached every fetch by default — most older tutorials assume that.)

// Dynamic (fresh every request) — like getServerSideProps — the DEFAULT now
async function getLiveData() {
    const res = await fetch('https://api.example.com/live'); // no option = not cached
    // cache: 'no-store' makes the intent explicit
    return res.json();
}

// Static (cached until revalidated) — like getStaticProps — must opt in
async function getData() {
    const res = await fetch('https://api.example.com/data', {
        cache: 'force-cache',
    });
    return res.json();
}

// Revalidate on a schedule — like ISR
async function getRevalidatedData() {
    const res = await fetch('https://api.example.com/posts', {
        next: { revalidate: 60 }, // ‼️ revalidate every 60 seconds (ISR)
    });
    return res.json();
}

// Parallel fetching — don't await sequentially, initiate both at once
export default async function Page() {
    const artistData = fetch('/api/artist');  // start both
    const albumData  = fetch('/api/albums');  // at the same time

    const [artist, albums] = await Promise.all([artistData, albumData]);
    // ‼️ Sequential awaiting waterfall: await artistData, then await albumData = slower
    return <ArtistPage artist={artist} albums={albums} />;
}
```

### Streaming with Suspense

```tsx
// Loading states while Server Components fetch data
// app/dashboard/page.tsx
import { Suspense } from 'react';
import RevenueChart from './RevenueChart';   // slow async component
import LatestInvoices from './LatestInvoices'; // fast async component

export default function Dashboard() {
    return (
        <main>
            <h1>Dashboard</h1>
            {/* ‼️ Each Suspense boundary streams independently */}
            <Suspense fallback={<ChartSkeleton />}>
                <RevenueChart />   {/* slow — doesn't block LatestInvoices */}
            </Suspense>
            <Suspense fallback={<InvoicesSkeleton />}>
                <LatestInvoices /> {/* fast — renders as soon as ready */}
            </Suspense>
        </main>
    );
}

// RevenueChart.tsx — Server Component, async
export default async function RevenueChart() {
    const data = await fetchRevenue(); // may be slow — streams when ready
    return <Chart data={data} />;
}

// ‼️ loading.tsx is a route-level Suspense boundary
// It wraps the entire page.tsx in Suspense automatically
// For granular control, use explicit <Suspense> boundaries inside the page
```

### ORM / DB Direct Access in Server Components

```tsx
// ‼️ Server Components run on the server — can query DB directly, no API needed
import 'server-only'; // build error if this module is ever imported into a 'use client' file
import { db } from '@/lib/db'; // Prisma, Drizzle, etc.

export default async function UsersPage() {
    // Direct DB query — no API route needed for read operations
    const users = await db.user.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });

    return (
        <ul>
            {users.map(u => <li key={u.id}>{u.name}</li>)}
        </ul>
    );
}
```

---

## 4. Caching & Revalidation

### Next 16: `'use cache'` and Cache Components

```tsx
// ‼️ The current model (stable in Next 16). Enable in next.config.ts:
//    const nextConfig = { cacheComponents: true };
//
// Instead of configuring caching per fetch, mark a FUNCTION or COMPONENT as
// cacheable. It works for any async work — DB queries, SDK calls — not just fetch.
import { cacheLife, cacheTag } from 'next/cache';

export async function getProducts() {
    'use cache';
    cacheLife('hours');      // built-in profiles: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'
    cacheTag('products');    // so you can invalidate it on demand
    return db.product.findMany();
}

// A cached component — its output becomes part of the static shell
async function ProductGrid() {
    'use cache';
    const products = await getProducts();
    return <Grid products={products} />;
}

// ‼️ Anything NOT cached and not inside <Suspense> makes the route dynamic.
//    With cacheComponents on, Next tells you at build time when uncached data
//    isn't wrapped in Suspense — so the "is this page static or dynamic?"
//    question becomes explicit instead of guessed from the code.
```

### The Caching Layers

```text
‼️ Next.js App Router has 4 caching mechanisms:

1. Request Memoization (per-render)
   - Duplicate fetch() calls with same URL+options in ONE render → deduplicated
   - Only during React's render tree — cleared after each request
   - ✓ Safe to call the same fetch in multiple components without duplicating requests
   - For non-fetch functions (DB calls), wrap them in React's cache()

2. Data Cache (persistent, server-side)
   - Cached fetch() / 'use cache' results stored across requests and deployments
   - ‼️ Only for data you OPTED IN to caching (since Next 15)
   - next: { revalidate: N } or cacheLife() → time-based revalidation (ISR)
   - ‼️ revalidatePath() / revalidateTag() / updateTag() → purge programmatically

3. Full Route Cache (server-side HTML)
   - Statically rendered routes cached as HTML+RSC payload on the server
   - Served instantly without re-running Server Components
   - Invalidated when Data Cache for that route is revalidated

4. Router Cache (client-side, in-memory)
   - Client stores visited route segments for the session
   - ‼️ Since Next 15, page segments are NOT reused by default (staleTimes.dynamic = 0)
     — navigating to a page fetches fresh data. Layouts and loading states are
     still reused. Tune with the experimental staleTimes config.
   - Back/forward navigation still restores instantly
   - Cleared on: hard refresh, router.refresh(), revalidating from a Server Action
```

### On-Demand Revalidation

```ts
// app/api/revalidate/route.ts — e.g. called by a CMS webhook
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-revalidate-secret');
    if (secret !== process.env.REVALIDATE_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path, tag } = await req.json();

    if (tag) {
        // ‼️ Next 16: second argument is a cacheLife profile. 'max' = mark stale
        //    now, serve stale while refetching in the background.
        //    (The one-argument form is deprecated.)
        revalidateTag(tag, 'max');
    }
    if (path) {
        revalidatePath(path); // ‼️ invalidates the full route cache for this path
    }

    return Response.json({ revalidated: true });
}

// Tagging fetches (or use cacheTag() inside a 'use cache' function)
const data = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }, // ‼️ tag this fetch
});

// Inside a Server Action — when the user must see their OWN change immediately:
//   updateTag('posts')   // expires right away; next read waits for fresh data
//   (revalidateTag serves stale-while-revalidate, so the user might briefly
//    see old data — fine for a CMS webhook, wrong after a form submit)
```

---

## 5. Server Actions

### Mutations Without API Routes

```tsx
// ‼️ Server Actions — async functions marked with 'use server', run on the server
// Called directly from components — no API endpoint to write

// actions/users.ts — file-level 'use server': every export is a Server Action
'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const CreateUser = z.object({ name: z.string().min(1), email: z.string().email() });

export type CreateUserState = { error?: string } | null;

// Signature is (prevState, formData) because the form below uses useActionState.
// A plain <form action={fn}> passes only (formData).
export async function createUser(prevState: CreateUserState, formData: FormData): Promise<CreateUserState> {
    // ‼️ A Server Action is a PUBLIC HTTP endpoint — anyone can call it with any
    //    arguments. Always check auth and validate input inside the action.
    const session = await auth();
    if (!session) return { error: 'Not signed in' };

    const parsed = CreateUser.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
    });
    if (!parsed.success) return { error: 'Name and a valid email are required' };

    try {
        await db.user.create({ data: parsed.data });
    } catch {
        return { error: 'Could not create user' };
    }

    revalidatePath('/users'); // ‼️ invalidate the cached page
    // ‼️ redirect() works by THROWING a special error — call it OUTSIDE any
    //    try/catch, or your catch block swallows the redirect.
    redirect('/users');
}
```

```tsx
// Use from a Client Component with useActionState (React 19)
'use client';
import { useActionState } from 'react';
import { createUser } from '@/actions/users';

export default function CreateUserForm() {
    const [state, action, isPending] = useActionState(createUser, null);

    return (
        // ‼️ Works before JS loads too (progressive enhancement) — the form
        //    posts to the action like a normal HTML form
        <form action={action}>
            <input name="name" />
            <input name="email" />
            {state?.error && <p>{state.error}</p>}
            <button disabled={isPending}>
                {isPending ? 'Creating...' : 'Create'}
            </button>
        </form>
    );
}
```

---

## 6. Routing & Navigation

### Dynamic Routes & generateStaticParams

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
    // ‼️ Called at build time — pre-renders these paths as static HTML
    const posts = await fetch('https://api.example.com/posts').then(r => r.json());
    return posts.map(post => ({ slug: post.slug }));
    // Returns: [{ slug: 'hello-world' }, { slug: 'next-js-deep' }, ...]
}

// ‼️ NEXT 15+: params and searchParams are PROMISES — await them.
//    Synchronous params.slug was removed after a deprecation period.
type Props = { params: Promise<{ slug: string }> };

// generateMetadata — dynamic SEO metadata per page
export async function generateMetadata({ params }: Props) {
    const { slug } = await params;
    const post = await getPost(slug);
    return {
        title: post.title,
        description: post.excerpt,
        openGraph: { images: [post.coverImage] },
    };
}

export default async function BlogPost({ params }: Props) {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) notFound(); // ‼️ renders not-found.tsx
    return <Article post={post} />;
}

// (Next also generates PageProps<'/blog/[slug]'> helper types for this.)
```

### Parallel & Intercepting Routes

```text
Parallel Routes — render multiple pages in the same layout simultaneously
  app/
    layout.tsx
    @team/page.tsx       ← rendered at /team slot
    @analytics/page.tsx  ← rendered at /analytics slot

  layout.tsx receives both as props:
  export default function Layout({ children, team, analytics }) {
    return <div>{children}{team}{analytics}</div>
  }

  ‼️ Every slot needs a default.tsx fallback (required since Next 16) —
     it's what renders when the slot has no match for the current URL.

  ‼️ Use case: dashboards, split views, modals with their own URL

Intercepting Routes — show modal with its own URL, show real page on direct load
  app/
    photo/[id]/page.tsx          ← direct URL: full photo page
    @modal/
      (.)photo/[id]/page.tsx     ← intercepted: show modal OVER current page

  (.)  — same level
  (..) — one level up
  (...) — root level

  ‼️ Use case: Instagram-style photo modal — /feed stays visible, /photo/123 in URL
```

### Link & Navigation

```tsx
import Link from 'next/link';

// Prefetching — Link prefetches the route when it enters the viewport (production only)
<Link href="/about">About</Link>
<Link href="/about" prefetch={false}>About (no prefetch)</Link>
```

```tsx
// Programmatic navigation and URL state — Client Component hooks
'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function Nav() {
    const router = useRouter();
    // router.push('/dashboard');    // navigate
    // router.replace('/login');     // replace without history entry
    // router.back();                // go back
    // router.refresh();             // ‼️ re-fetch current route's server data

    const pathname = usePathname();          // '/dashboard'
    const searchParams = useSearchParams();  // URLSearchParams (read-only)
    const page = searchParams.get('page') ?? '1';
    // ...
}
```

```tsx
// ‼️ searchParams in Server Components — passed as a prop, and a Promise since Next 15
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const { page = '1' } = await searchParams;
    // ...
}
```

---

## 7. Proxy (formerly Middleware)

```text
‼️ NEXT 16 RENAMED middleware.ts → proxy.ts, and the exported function
   middleware() → proxy(). Same job: code that runs before matched requests.
   middleware.ts still works but is deprecated. The rename reflects what it
   is — a lightweight layer in front of your app, not Express-style middleware.

‼️ RUNTIME: proxy.ts runs on the Node.js runtime, so Node APIs are available.
   (The old middleware ran on the Edge Runtime — no fs, no Node crypto, no
   Prisma — and much older advice is about that limitation.)
```

```ts
// proxy.ts — at the project root, next to app/
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Optimistic auth check for protected routes
    if (pathname.startsWith('/dashboard')) {
        const token = req.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/login', req.url));
        }

        try {
            await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        } catch {
            return NextResponse.redirect(new URL('/login', req.url));
        }
    }

    // Modify request headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-request-id', crypto.randomUUID());

    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/api/:path*',
        // ‼️ Exclude static files and Next.js internals
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

// ‼️ Keep it FAST — it runs on every matched request. Cookie/JWT checks,
//    redirects, rewrites, headers. No heavy DB work.
// ‼️ Never make it your ONLY auth check. In March 2025 (CVE-2025-29927) a
//    crafted header let attackers skip middleware entirely on self-hosted
//    Next.js. Re-check auth where the data is read: in the page, Route
//    Handler or Server Action ("data access layer").
```

---

## 8. Rendering Strategies

### Static, Dynamic, Streaming

```text
Static Rendering:
  - Page rendered at build time → cached as HTML → served instantly
  - Happens when the route uses no request data and no uncached fetches
  - Use: marketing pages, blogs, product pages with ISR

Dynamic Rendering:
  - Page rendered on every request — always fresh
  - Triggered by any of these in the route:
      ✓ await cookies(), headers(), searchParams, connection()
      ✓ an uncached fetch (the default since Next 15)
      ✓ export const dynamic = 'force-dynamic'
  - Use: dashboards, personalized pages, real-time data

Partial Prerendering (PPR):
  - Static shell rendered at build time
  - Dynamic "holes" streamed in at request time via Suspense
  - ‼️ Best of both: instant HTML shell + fresh data where needed
  - Experimental in Next 14–15 (experimental_ppr). In Next 16 it is how
    Cache Components work: enable cacheComponents: true, mark cached parts
    with 'use cache', wrap dynamic parts in <Suspense>.

ISR (Incremental Static Regeneration):
  - Static page regenerated in background after revalidate seconds
  - Stale-while-revalidate: serve old while regenerating ‼️
  export const revalidate = 60; // revalidate every 60s
```

---

## 9. Performance Optimization

### Image Optimization

```tsx
import Image from 'next/image';

// ‼️ next/image: automatic WebP/AVIF conversion, lazy loading, prevents CLS
<Image
    src="/hero.jpg"
    alt="Hero"
    width={1200}
    height={600}
    priority          // ‼️ preload — use for the above-the-fold LCP image
    placeholder="blur" // show blurred placeholder while loading
    blurDataURL="data:image/png;base64,..." // low-res base64
/>

// Remote images — must allow-list hosts in next.config.ts
// next.config.ts
const nextConfig = {
    images: {
        remotePatterns: [{
            protocol: 'https',
            hostname: 'images.example.com',
        }],
    },
};
export default nextConfig;

// fill — fills parent container (for responsive images)
<div style={{ position: 'relative', height: '400px' }}>
    <Image src="/photo.jpg" alt="Photo" fill style={{ objectFit: 'cover' }} />
</div>
```

### Code Splitting & Dynamic Imports

```tsx
'use client'; // ‼️ ssr: false is only allowed inside Client Components (error since Next 15)
import dynamic from 'next/dynamic';

// Lazy load a heavy Client Component — not in initial bundle
const HeavyChart = dynamic(() => import('./HeavyChart'), {
    loading: () => <ChartSkeleton />,  // shown while loading
    ssr: false,                         // ‼️ skip SSR (for browser-only libs like chart.js)
});

// ‼️ dynamic() is next.js's wrapper around React.lazy() + Suspense
// The component bundle is only downloaded when first rendered

// Named export
const Modal = dynamic(() => import('./Modal').then(mod => mod.Modal));
```

```tsx
// Font optimization — automatically self-hosted, no layout shift
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], display: 'swap' });
// inter.className — apply to root element
```

### Bundle Analysis & Performance

```text
Bundle analysis:
  ‼️ Turbopack is the default bundler since Next 16 (dev AND build).
  Next 16.1+ ships a built-in analyzer (experimental) that works with it.
  @next/bundle-analyzer only works for webpack builds (next build --webpack).
  ‼️ Look for: large client bundles, server-only code in client bundle

Performance checklist:
  ✓ Use Server Components for data-heavy, non-interactive UI
  ✓ 'use client' only where interactivity is needed — push it to the leaves
  ✓ dynamic() for heavy Client Components
  ✓ next/image for all images (WebP/AVIF, lazy load, no CLS)
  ✓ next/font for web fonts (no FOUT, no layout shift)
  ✓ Parallel data fetching (Promise.all, not sequential await)
  ✓ Suspense boundaries for streaming — don't block the whole page
  ✓ 'use cache' / cache tags for semi-static content
  ✓ React Compiler (reactCompiler: true — stable in Next 16) instead of
    hand-written useMemo/useCallback
```

---

## 10. What Changed in Next 15 and 16

```text
Next 15 (Oct 2024):
  ‼️ fetch() and GET Route Handlers no longer cached by default
  ‼️ cookies(), headers(), draftMode(), params, searchParams are async
  ‼️ Router Cache no longer reuses page segments by default
  React 19 support; next.config.ts; Turbopack dev stable;
  next lint deprecated (use ESLint or Biome directly)

Next 16 (Oct 2025):
  ‼️ middleware.ts → proxy.ts (Node.js runtime)
  ‼️ Turbopack is the default bundler for dev and build (--webpack to opt out)
  Cache Components: 'use cache', cacheLife, cacheTag, PPR built in
  revalidateTag(tag, profile); new updateTag() and refresh() for Server Actions
  React Compiler support stable; React 19.2 (View Transitions,
  useEffectEvent, <Activity>)
  Parallel route slots require default.tsx; next lint removed
  Node.js 20.9+ required

Next 16.1–16.3 (Dec 2025 – Aug 2026):
  Turbopack file-system cache for builds (stable), much faster next dev
  startup and lower memory, built-in bundle analyzer, Server Fast Refresh,
  AI tooling (AGENTS.md, browser log forwarding, agent DevTools)

Upgrade: npx @next/codemod@canary upgrade latest — handles most mechanical
changes (async params, middleware → proxy, config renames).
```

---

## 11. Common Interview Questions

```text
Q: What is the difference between Server Components and Client Components?
A: Server Components run on the server, have no JS bundle, can directly access databases
   and secrets, cannot use hooks or browser APIs.
   Client Components run in the browser (after hydration), can use hooks and events, cannot
   be async. Default in App Router is Server Component — opt into client with 'use client'.

Q: How does Next.js caching work in App Router?
A: Four layers: Request Memoization (per-render dedup), Data Cache (persistent cache for
   data you opt into), Full Route Cache (static HTML on server), Router Cache (client-side).
   ‼️ Since Next 15 nothing is cached unless you opt in — the opposite of Next 13–14.
   In Next 16 the main tool is the 'use cache' directive with cacheLife and cacheTag.
   Invalidate with revalidateTag(tag, profile), updateTag() in Server Actions, or
   revalidatePath().

Q: What is the difference between layout.tsx and template.tsx?
A: layout.tsx — persists across navigations between children, state is preserved, not re-mounted.
   template.tsx — re-mounted on every navigation, fresh state each time.
   Use template for: per-route enter animations, useEffect that must fire on navigation.

Q: How do Server Actions differ from API routes?
A: Server Actions are async server functions called directly from components — Next.js
   creates the POST endpoint for you. They work with HTML forms natively (progressive
   enhancement without JS) and integrate with revalidation.
   API routes (route.ts) are explicit HTTP endpoints — needed for webhooks, external access.
   ‼️ Next.js protects actions against CSRF (POST only, Origin check), but they are still
   public endpoints: always check auth and validate input inside the action.

Q: What is Partial Prerendering (PPR)?
A: Renders a static HTML shell at build time, with Suspense boundaries as dynamic "holes"
   that stream in at request time. Combines static speed with dynamic freshness.
   In Next 16 it's part of Cache Components: cached parts ('use cache') form the shell,
   uncached parts inside <Suspense> stream per request.

Q: When would you use generateStaticParams?
A: To pre-render dynamic routes at build time (SSG). Next.js calls it to get the list of
   params to pre-render. Unknown paths at build time: set dynamicParams = true (SSR fallback)
   or dynamicParams = false (404 for unknown paths).

Q: What is proxy.ts (middleware) for, and what are its limits?
A: Code that runs before matched requests: redirects, rewrites, headers, optimistic auth
   checks, i18n routing. Renamed from middleware.ts in Next 16 and now runs on Node.js.
   Keep it fast (it runs on every matched request) and never rely on it as the only
   auth check — verify again where data is accessed.

Q: Why did my page become dynamic / why isn't my data cached after upgrading?
A: Since Next 15, fetch isn't cached by default and reading cookies/headers/searchParams
   makes a route dynamic. Opt in with cache: 'force-cache', revalidate, or 'use cache'.
```
