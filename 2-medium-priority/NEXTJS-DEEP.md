# Next.js — Senior Developer Deep Reference

> Covers App Router, Server Components, data fetching, caching, Server Actions, middleware, and performance.

---

## Table of Contents

1. [App Router vs Pages Router](#1-app-router-vs-pages-router)
2. [Server Components vs Client Components](#2-server-components-vs-client-components)
3. [Data Fetching](#3-data-fetching)
4. [Caching & Revalidation](#4-caching--revalidation)
5. [Server Actions](#5-server-actions)
6. [Routing & Navigation](#6-routing--navigation)
7. [Middleware](#7-middleware)
8. [Rendering Strategies](#8-rendering-strategies)
9. [Performance Optimization](#9-performance-optimization)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. App Router vs Pages Router

### Architecture Comparison

```text
Pages Router (legacy, /pages dir):
  /pages/index.tsx          → /
  /pages/about.tsx          → /about
  /pages/blog/[slug].tsx    → /blog/:slug
  /pages/api/users.ts       → API route (Node.js handler)

  Data fetching:
    getStaticProps    → SSG (build time)
    getServerSideProps → SSR (every request)
    getStaticPaths    → dynamic SSG routes

App Router (current, /app dir — Next.js 13+):
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

// ‼️ You CAN pass a Server Component as children/prop to a Client Component
// The Server Component is rendered on the server, result passed as prop (already rendered)

// ClientWrapper.tsx
'use client';
export default function ClientWrapper({ children }) {
    const [open, setOpen] = useState(true);
    return open ? <div>{children}</div> : null;
    // ‼️ `children` is already rendered Server Component HTML — no re-execution
}

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

// Static (cached forever at build) — like getStaticProps
async function getData() {
    const res = await fetch('https://api.example.com/data', {
        cache: 'force-cache', // default — cached indefinitely
    });
    return res.json();
}

// Dynamic (no cache, fresh every request) — like getServerSideProps
async function getLiveData() {
    const res = await fetch('https://api.example.com/live', {
        cache: 'no-store', // ‼️ opt out of caching entirely
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

// ‼️ server-only package — prevents accidental import in Client Components
import 'server-only'; // throws at build time if imported in 'use client' file
```

---

## 4. Caching & Revalidation

### The Four Caching Layers

```text
‼️ Next.js App Router has 4 caching mechanisms:

1. Request Memoization (per-render)
   - Duplicate fetch() calls with same URL+options in ONE render → deduplicated
   - Only during React's render tree — cleared after each request
   - ✓ Safe to call the same fetch in multiple components without duplicating requests

2. Data Cache (persistent, server-side)
   - fetch() results stored on disk across requests and deployments
   - cache: 'force-cache' → permanent (until revalidated)
   - next: { revalidate: N } → revalidate every N seconds (ISR)
   - cache: 'no-store' → skip Data Cache entirely
   - ‼️ revalidatePath() / revalidateTag() → purge programmatically

3. Full Route Cache (server-side HTML)
   - Statically rendered routes cached as HTML+RSC payload on the server
   - Served instantly without re-running Server Components
   - Invalidated when Data Cache for that route is revalidated

4. Router Cache (client-side, in-memory)
   - Client stores visited route segments for the session
   - Navigating back is instant (no server round-trip)
   - Duration: 30s for dynamic, 5min for static segments (configurable)
   - Cleared on: hard refresh, router.refresh(), revalidatePath() from Server Action
```

### On-Demand Revalidation

```ts
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-revalidate-secret');
    if (secret !== process.env.REVALIDATE_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path, tag } = await req.json();

    if (tag) {
        revalidateTag(tag); // ‼️ invalidates all fetches tagged with this tag
    }
    if (path) {
        revalidatePath(path); // ‼️ invalidates the full route cache for this path
    }

    return Response.json({ revalidated: true });
}

// Tagging fetches
const data = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }, // ‼️ tag this fetch
});

// Later: revalidateTag('posts') clears all fetches with this tag
```

---

## 5. Server Actions

### Mutations Without API Routes

```tsx
// ‼️ Server Actions — async functions marked with 'use server', run on the server
// Called directly from Client Components — no API endpoint needed

// Define in a separate file for reuse
// actions/users.ts
'use server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createUser(formData: FormData) {
    const name  = formData.get('name') as string;
    const email = formData.get('email') as string;

    // ‼️ ALWAYS validate on server — client can bypass JS validation
    if (!name || !email) throw new Error('Name and email required');

    await db.user.create({ data: { name, email } });

    revalidatePath('/users'); // ‼️ invalidate the cached page
    redirect('/users');       // ‼️ redirect after success (throws internally — use in try block only)
}

// Use in a Server Component form — works without JS (progressive enhancement) ‼️
export default function CreateUserPage() {
    return (
        <form action={createUser}>
            <input name="name" required />
            <input name="email" type="email" required />
            <button type="submit">Create</button>
        </form>
    );
}

// Use from a Client Component with useActionState (React 19 / Next.js 15)
'use client';
import { useActionState } from 'react';
import { createUser } from '@/actions/users';

export default function CreateUserForm() {
    const [state, action, isPending] = useActionState(createUser, null);

    return (
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
export async function generateStaticParams() {
    // ‼️ Called at build time — pre-renders these paths as static HTML
    const posts = await fetch('https://api.example.com/posts').then(r => r.json());
    return posts.map(post => ({ slug: post.slug }));
    // Returns: [{ slug: 'hello-world' }, { slug: 'next-js-deep' }, ...]
}

// generateMetadata — dynamic SEO metadata per page
export async function generateMetadata({ params }: { params: { slug: string } }) {
    const post = await getPost(params.slug);
    return {
        title: post.title,
        description: post.excerpt,
        openGraph: { images: [post.coverImage] },
    };
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
    const post = await getPost(params.slug);
    if (!post) notFound(); // ‼️ renders not-found.tsx
    return <Article post={post} />;
}
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
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// Prefetching — Link prefetches the route on hover (production only)
<Link href="/about">About</Link>
<Link href="/about" prefetch={false}>About (no prefetch)</Link>

// Programmatic navigation
'use client';
const router = useRouter();
router.push('/dashboard');    // navigate
router.replace('/login');     // replace without history entry
router.back();                // go back
router.refresh();             // ‼️ re-fetch current route data (clears Router Cache for this route)

// Reading URL state
const pathname   = usePathname();    // '/dashboard'
const searchParams = useSearchParams(); // URLSearchParams
const page = searchParams.get('page') ?? '1';

// ‼️ searchParams in Server Components — passed as prop
export default function Page({ searchParams }: { searchParams: { page?: string } }) {
    const page = searchParams.page ?? '1';
}
```

---

## 7. Middleware

```ts
// middleware.ts — runs at the Edge before every matched request
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Auth check for protected routes
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

// ‼️ Middleware runs on the Edge Runtime — no Node.js APIs
// ✗ No fs, no node:crypto, no Prisma, no heavy libraries
// ✓ fetch, Response, cookies, headers, URL manipulation, jose (JWT)
```

---

## 8. Rendering Strategies

### Static, Dynamic, Streaming

```text
Static Rendering (default):
  - Page rendered at build time → cached as HTML → served instantly
  - Opt-in: no dynamic functions, cache: 'force-cache' fetches
  - Use: marketing pages, blogs, product pages with ISR

Dynamic Rendering:
  - Page rendered on every request — always fresh
  - Opt-in: any of these used in the route:
      ✓ cookies(), headers(), searchParams in page props
      ✓ fetch with cache: 'no-store'
      ✓ export const dynamic = 'force-dynamic'
  - Use: dashboards, personalized pages, real-time data

Partial Prerendering (PPR — experimental, Next.js 14+):
  - Static shell rendered at build time
  - Dynamic "holes" streamed in at request time via Suspense
  - ‼️ Best of both: instant HTML shell + fresh data where needed
  export const experimental_ppr = true;

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
    priority          // ‼️ preload — use for above-the-fold images (LCP)
    placeholder="blur" // show blurred placeholder while loading
    blurDataURL="data:image/png;base64,..." // low-res base64
/>

// Remote images — must whitelist domains in next.config.js
// next.config.js
module.exports = {
    images: {
        remotePatterns: [{
            protocol: 'https',
            hostname: 'images.example.com',
        }],
    },
};

// fill — fills parent container (for responsive images)
<div style={{ position: 'relative', height: '400px' }}>
    <Image src="/photo.jpg" alt="Photo" fill style={{ objectFit: 'cover' }} />
</div>
```

### Code Splitting & Dynamic Imports

```tsx
import dynamic from 'next/dynamic';

// Lazy load a heavy Client Component — not in initial bundle
const HeavyChart = dynamic(() => import('./HeavyChart'), {
    loading: () => <ChartSkeleton />,  // shown while loading
    ssr: false,                         // ‼️ disable SSR (for browser-only libs like chart.js)
});

// ‼️ dynamic() is next.js's wrapper around React.lazy() + Suspense
// The component bundle is only downloaded when first rendered

// Named export
const Modal = dynamic(() => import('./Modal').then(mod => mod.Modal));

// Font optimization — automatically self-hosted, no layout shift
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], display: 'swap' });
// inter.className — apply to root element
```

### Bundle Analysis & Performance

```text
Bundle analysis:
  npm install @next/bundle-analyzer
  ANALYZE=true next build
  ‼️ Look for: large client bundles, server-only code in client bundle

Performance checklist:
  ✓ Use Server Components for data-heavy, non-interactive UI
  ✓ 'use client' only where interactivity is needed
  ✓ dynamic() for heavy Client Components
  ✓ next/image for all images (WebP, lazy load, no CLS)
  ✓ next/font for web fonts (no FOUT, no layout shift)
  ✓ Parallel data fetching (Promise.all, not sequential await)
  ✓ Suspense boundaries for streaming — don't block the whole page
  ✓ ISR or cache tags for semi-static content
  ✓ Middleware at Edge — no cold starts, low latency
```

---

## 10. Common Interview Questions

```text
Q: What is the difference between Server Components and Client Components?
A: Server Components run on the server, have no JS bundle, can directly access databases
   and secrets, cannot use hooks or browser APIs.
   Client Components run in the browser (after hydration), can use hooks and events, cannot
   be async. Default in App Router is Server Component — opt into client with 'use client'.

Q: How does Next.js caching work in App Router?
A: Four layers: Request Memoization (per-render dedup), Data Cache (persistent fetch cache),
   Full Route Cache (static HTML on server), Router Cache (client-side navigation cache).
   ‼️ Opt out: cache: 'no-store', using cookies()/headers(), dynamic = 'force-dynamic'.
   Invalidate programmatically: revalidatePath() or revalidateTag().

Q: What is the difference between layout.tsx and template.tsx?
A: layout.tsx — persists across navigations between children, state is preserved, not re-mounted.
   template.tsx — re-mounted on every navigation, fresh state each time.
   Use template for: per-route enter animations, useEffect that must fire on navigation.

Q: How do Server Actions differ from API routes?
A: Server Actions are async server functions called directly from components (no HTTP fetch).
   They work with HTML forms natively (progressive enhancement without JS).
   API routes (route.ts) are explicit HTTP endpoints — needed for webhooks, external access.
   ‼️ Server Actions automatically handle CSRF via the framework.

Q: What is Partial Prerendering (PPR)?
A: Renders a static HTML shell at build time, with Suspense boundaries as dynamic "holes"
   that stream in at request time. Combines static speed with dynamic freshness.
   The user sees instant HTML, dynamic content arrives shortly after.

Q: When would you use generateStaticParams?
A: To pre-render dynamic routes at build time (SSG). Next.js calls it to get the list of
   params to pre-render. Unknown paths at build time: set dynamicParams = true (SSR fallback)
   or dynamicParams = false (404 for unknown paths).

Q: What are the limitations of Middleware in Next.js?
A: Runs on the Edge Runtime — no Node.js APIs, no native addons, no Prisma/heavy ORMs.
   Limited to: fetch, Request/Response, cookies, URL manipulation, lightweight JWT verification.
   ‼️ For heavy logic, redirect to an API route or use a Server Component instead.
```
