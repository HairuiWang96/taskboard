# Micro-Frontends

Micro-frontends apply microservice thinking to the frontend: split a large frontend into smaller, independently deployable pieces owned by separate teams. This appears in staff/senior interviews at larger companies and in job specs for "platform" or "architecture" roles.

---

## What Problem Micro-Frontends Solve

```text
The monolith problem at scale:
  - 20+ engineers working in one frontend repo
  - Every change requires coordinating with other teams
  - One team's bug breaks everyone's release
  - Different teams want different tech stacks or upgrade cadences
  - Deploy cycle becomes a bottleneck — all teams release together

Micro-frontends solution:
  - Each team owns a separate frontend application
  - Teams deploy independently
  - A "shell" app composes the pieces into one UI for the user
  - Teams can use different frameworks or versions (with caveats)

Real examples:
  - IKEA: separate teams own separate sections of the site
  - Zalando: product teams own their own frontend slices
  - Large SaaS: separate checkout, dashboard, admin apps unified in a shell
```

---

## Integration Approaches

### 1. Build-time integration (npm packages)

```text
Teams publish their UI as an npm package.
The shell imports and renders the package.

Pros:
  - Simple, familiar (it's just an import)
  - Full type safety
  - Tree shaking works

Cons:
  - NOT truly independent deployment — shell must rebuild to pick up updates
  - Shared npm registry needed
  - Version coordination required

When to use: shared component libraries, not separate deployments
```

### 2. iframe integration

```text
Each team deploys their app at a URL.
The shell renders <iframe src="https://team-app.com"> for each section.

Pros:
  - Complete isolation (CSS, JS, storage)
  - Truly independent deployment
  - Any framework, any version

Cons:
  - Poor UX (scroll, resize, history management across frames)
  - Hard to share state or auth
  - Performance overhead
  - Accessibility issues (focus management across frames)

When to use: legacy integration where isolation is critical, third-party embeds
```

### 3. Module Federation (Webpack 5) — most common

```text
Each team deploys their app independently.
The shell downloads and mounts remote code at runtime.

Pros:
  - Truly independent deployment (no shell rebuild needed)
  - Shared dependencies (one copy of React)
  - Feels like a normal app from the user's perspective

Cons:
  - Webpack 5 required (Vite plugin exists but less mature)
  - Version mismatch risk (shell expects v1, remote ships v2)
  - Network waterfall on first load of a remote

When to use: large teams, independent deployment is a hard requirement
```

### 4. Web components

```text
Teams build and expose custom elements: <checkout-widget>, <product-card>
Shell renders the custom elements like native HTML.

Pros:
  - Framework-agnostic (custom elements work in any framework)
  - Native browser standard, no bundler magic
  - Strong encapsulation via Shadow DOM

Cons:
  - Developer experience is worse than React/Vue
  - Shadow DOM complicates global styles and shared themes
  - Limited React interop (event system differences)

When to use: mixed framework environments, when true framework independence is needed
```

---

## Module Federation Deep Dive

The most practical approach for React-heavy organisations.

```javascript
// Shell (host) — webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',

      // Remote apps — loaded at runtime from their deployment URL
      remotes: {
        // syntax: 'name@url/remoteEntry.js'
        checkout: 'checkout@https://checkout.myapp.com/remoteEntry.js',
        catalog:  'catalog@https://catalog.myapp.com/remoteEntry.js',
        auth:     'auth@https://auth.myapp.com/remoteEntry.js',
      },

      // Shared dependencies — loaded once, shared between host and remotes
      shared: {
        react: {
          singleton: true,           // only ONE instance of React — required for hooks
          requiredVersion: '^18.0.0', // version contract
          eager: false,              // lazy-load (better performance)
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        // Shared design system
        '@myapp/ui': {
          singleton: true,
          requiredVersion: '^2.0.0',
        },
      },
    }),
  ],
};

// Shell — App.tsx
import { lazy, Suspense } from 'react';

// Remote modules are lazy-loaded — only fetched when navigated to
const CheckoutPage = lazy(() => import('checkout/CheckoutPage'));
const CatalogPage  = lazy(() => import('catalog/CatalogPage'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/checkout/*" element={<CheckoutPage />} />
        <Route path="/catalog/*"  element={<CatalogPage />} />
      </Routes>
    </Suspense>
  );
}
```

```javascript
// Checkout team — webpack.config.js (the remote)
new ModuleFederationPlugin({
  name: 'checkout',

  // This file is the manifest — tells the host what's available
  filename: 'remoteEntry.js',

  // What the checkout team exposes to the shell
  exposes: {
    './CheckoutPage':  './src/pages/CheckoutPage',
    './CartWidget':    './src/components/CartWidget',
    './useCart':       './src/hooks/useCart',
  },

  shared: {
    react:     { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
    '@myapp/ui': { singleton: true, requiredVersion: '^2.0.0' },
  },
});

// Checkout team develops their app normally
// They run it standalone for development: localhost:3001
// Shell loads from their production URL: checkout.myapp.com
```

---

## Sharing State Between Micro-Frontends

Micro-frontends can't share a Redux store directly. Options:

```typescript
// Option 1: Custom events (loosely coupled, good for simple messages)
// Remote fires an event
window.dispatchEvent(new CustomEvent('cart:updated', {
  detail: { itemCount: 3 },
  bubbles: true,
}));

// Shell or another remote listens
window.addEventListener('cart:updated', (e: CustomEvent) => {
  setCartCount(e.detail.itemCount);
});

// Option 2: Shared module via Module Federation
// auth remote exposes its store/hooks
exposes: {
  './useAuth': './src/hooks/useAuth',
}

// Other remotes import it
import { useAuth } from 'auth/useAuth';

// Option 3: URL as shared state
// Put important state in query params — any micro-frontend can read the URL
// /checkout?userId=123&coupon=SAVE10

// Option 4: Props passed by the shell
// Shell reads global state (auth, theme) and passes as props to remote components
<CheckoutPage userId={user.id} theme={theme} onComplete={handleOrderComplete} />
```

---

## Handling Auth Across Micro-Frontends

```text
Pattern: auth lives in the shell (or a dedicated auth remote)
  - Shell handles login/logout
  - Token stored in a cookie (accessible to all subdomains) or localStorage
  - Each remote reads the token directly from cookie/localStorage
  - OR: shell passes userId/token as props to each remote component
  - OR: shared auth remote exposes useAuth hook via Module Federation

Token sharing via subdomain cookie:
  .myapp.com cookie — accessible to:
    shell.myapp.com
    checkout.myapp.com
    catalog.myapp.com
  This is the simplest cross-micro-frontend auth mechanism.
```

---

## Shared Design System

```text
The design system MUST be shared — otherwise each team builds their own Button.

Options:
  1. npm package (@myapp/ui) — rebuilt and versioned
     Pros: type safety, changelog, familiar
     Cons: version drift — checkout uses v1.5, catalog uses v2.0

  2. Module Federation shared dependency
     Both remotes get the same version at runtime
     Shell controls which version everyone uses
     Pros: everyone always uses the same version
     Cons: shell owns the upgrade, remotes can't opt out

  3. Design tokens via CSS custom properties
     Each team uses their own component library but shares tokens:
     --color-primary, --spacing-4, --font-size-base
     Injected by the shell into :root
     Pros: framework-agnostic, easy to update
     Cons: components still look different
```

---

## Deployment Architecture

```text
Each micro-frontend is deployed separately:
  shell.myapp.com    → shell app (static files on CDN)
  checkout.myapp.com → checkout app (static files on CDN)
  catalog.myapp.com  → catalog app (static files on CDN)

The shell loads everything from the same domain to the user:
  User visits myapp.com
  → Shell HTML loads
  → Shell JS runs, loads remoteEntry.js from each remote's CDN
  → Remote chunks loaded when navigated to

CI/CD per team:
  Checkout team merges PR → checkout CI runs → deploys to checkout.myapp.com
  No coordination needed with other teams
  Shell is not rebuilt or redeployed

Rollback:
  If checkout has a bug → redeploy previous version of checkout.myapp.com
  Shell doesn't change — it just loads the (fixed) remote
```

---

## When NOT to Use Micro-Frontends

```text
Micro-frontends are complex. They add:
  - Multiple build pipelines to maintain
  - Cross-team contract negotiation (shared deps, API shapes)
  - More complex local development (run shell + multiple remotes)
  - Network requests at runtime to load remote bundles
  - Harder debugging across team boundaries

Don't use them when:
  - You have < 5-10 frontend engineers
  - One team owns the whole frontend
  - Teams don't have truly independent release cycles
  - You're a startup — premature organisational architecture

Do use them when:
  - 5+ separate teams working on one product
  - Teams need to ship without coordinating with each other
  - Different sections have genuinely different tech requirements
  - Existing modular structure is already straining the monorepo
```

---

## Common Interview Questions

### "What are micro-frontends and when would you use them?"

> Micro-frontends apply microservice architecture to the frontend — splitting a large UI into separately deployed pieces owned by different teams. The problem they solve: at 10+ engineers on one frontend repo, deploy coordination becomes a bottleneck, one team's bug blocks everyone's release, and teams can't move independently. The most common implementation is Module Federation (Webpack 5): each team deploys their app independently, and a shell app loads and composes them at runtime. Use them when you have 5+ teams working on one product who genuinely need independent deployment. Don't reach for them at small scale — they add real complexity (multiple build pipelines, shared dependency contracts, cross-team coordination on breaking changes). Most companies should have a well-structured monorepo long before considering micro-frontends.

### "How does Module Federation work?"

> Module Federation lets a running JavaScript app load code from another separately deployed app at runtime. Each "remote" app exposes specific modules (components, hooks, pages) via a `remoteEntry.js` manifest file deployed to its CDN. The "shell" (host) app is configured with the URLs of these remotes. When a user navigates to a route owned by a remote team, the shell fetches that remote's manifest, then fetches the actual code chunks. Shared dependencies like React are configured as singletons — only one copy is loaded even if both shell and remote include React. This means both use the same React instance, which is required for hooks to work correctly. The result: the checkout team can deploy a new version of their checkout page, and users get the update the next time they visit — without the shell needing to rebuild.

### "How do micro-frontends share state?"

> There are three practical patterns. First, **custom events on window** — one micro-frontend fires `window.dispatchEvent(new CustomEvent('cart:updated', { detail }))` and others listen. Loosely coupled but limited to simple messages. Second, **shared modules via Module Federation** — one team exposes their hooks or store, others import them. Good for auth (`auth/useAuth`) which everyone needs. Third, **the URL** — filters, IDs, and navigation state in query params are readable by any micro-frontend without coordination. For auth specifically, a cookie on the parent domain (`.myapp.com`) is accessible to all subdomains (`checkout.myapp.com`, `catalog.myapp.com`). The key principle: minimise what needs to be shared. Micro-frontends work best when each team's section is relatively self-contained.
