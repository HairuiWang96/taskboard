# Monorepo & Tooling — Deep Reference

## What is a Monorepo?

> A monorepo is a single repository containing multiple packages/apps that are developed together. Contrast with polyrepo (separate repo per project).

```
Polyrepo:                    Monorepo:
/repo-frontend               /my-org/
/repo-backend                  apps/
/repo-shared-ui                  web/          (Next.js app)
/repo-design-system              mobile/       (React Native)
/repo-utils                      api/          (Node.js server)
                               packages/
                                 ui/           (shared components)
                                 utils/        (shared utilities)
                                 config/       (shared ESLint, TS config)
```

**Monorepo advantages**: atomic commits across packages, easier refactoring (rename across packages), single CI pipeline, shared tooling/config, easier code sharing. **Disadvantages**: large repo (slow git operations at extreme scale), need tooling to avoid building everything on every change.

---

## pnpm Workspaces

> pnpm is the package manager of choice for monorepos — symlinks packages instead of duplicating (disk efficient), strict dependency isolation, fast.

```yaml
# pnpm-workspace.yaml (root)
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// Root package.json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

```json
// apps/web/package.json
{
  "name": "@myorg/web",
  "dependencies": {
    "@myorg/ui": "workspace:*",      // reference local package
    "@myorg/utils": "workspace:*"
  }
}
```

```bash
# Install in specific workspace
pnpm --filter @myorg/web add react

# Run script in all workspaces
pnpm -r run build

# Run script in specific workspace
pnpm --filter @myorg/api run dev

# Add package to root
pnpm add -w -D typescript
```

---

## Turborepo

> Turborepo is a high-performance build system for monorepos. Key feature: **remote caching** — if the code and inputs haven't changed, reuse the cached output (build artifact, test result) from a previous run — even across machines and CI runs.

```json
// turbo.json (root)
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],    // ^ means: build dependencies first
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": ["src/**", "tests/**"]  // only re-run if these change
    },
    "lint": {
      "cache": true
    },
    "dev": {
      "cache": false,             // never cache dev server
      "persistent": true          // long-running task
    }
  }
}
```

### How Turborepo Caching Works

```
1. Turbo computes a hash from:
   - Source files (inputs)
   - Environment variables
   - Task dependencies' hashes

2. Checks local cache (node_modules/.cache/turbo)
   then remote cache (Vercel / self-hosted)

3. If cache hit: restore outputs, skip execution
   If cache miss: run task, cache the result

Result: CI goes from 10min → 30sec for unchanged packages

# Enable remote caching (Vercel)
npx turbo login
npx turbo link
```

### Turborepo Pipeline — Task Graph

```
packages/ui: build
    ↑
apps/web: build  →  apps/web: test
    ↑
apps/api: build  →  apps/api: test

// Turbo runs tasks in parallel where safe
// "^build" ensures dependencies build first
```

---

## Nx

> Nx is a more feature-rich alternative to Turborepo — includes code generators, affected detection, visualization, and plugins for every major framework.

```bash
# Create Nx workspace
npx create-nx-workspace@latest my-org --preset=ts

# Generate an app
nx g @nx/next:app web
nx g @nx/node:app api

# Generate a library
nx g @nx/react:library ui

# Run affected commands — only run what changed
nx affected:build
nx affected:test
nx affected:lint

# Visualize dependency graph
nx graph
```

```json
// project.json (per package)
{
  "name": "web",
  "targets": {
    "build": {
      "executor": "@nx/next:build",
      "cache": true,
      "inputs": ["default", "^default"],
      "outputs": ["{workspaceRoot}/dist/apps/web"]
    },
    "test": {
      "executor": "@nx/jest:jest",
      "cache": true
    }
  }
}
```

### Turborepo vs Nx

```
Turborepo                          Nx
──────────────────────────────────────────────────────
Simpler, less config               More powerful, more config
Just a task runner + cache         Task runner + generators + plugins
No code generation                 Rich code generators
No framework opinions              Framework-specific plugins (Next, React, Node...)
Better for: small-medium teams     Better for: enterprise, large teams
Vercel ecosystem                   Nrwl ecosystem
```

---

## Module Federation

> Module Federation (Webpack 5 / Vite) allows loading JavaScript modules from a DIFFERENT deployed app at runtime — enables **Micro Frontends**: multiple independently deployed frontend apps that appear as one.

```
Shell App (host)
├── loads Header from → Remote App A (deployed separately)
├── loads Dashboard from → Remote App B (deployed separately)
└── own code

Each remote is deployed independently — update one without touching others.
```

```ts
// vite.config.ts — Remote app exposes components
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    federation({
      name: 'remote_app',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/components/Button',
        './Header': './src/components/Header',
      },
      shared: ['react', 'react-dom'], // don't load React twice
    }),
  ],
});

// vite.config.ts — Shell app consumes remotes
export default defineConfig({
  plugins: [
    federation({
      name: 'host',
      remotes: {
        remote_app: 'http://localhost:5001/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
});

// In shell app — import remote component
const RemoteButton = React.lazy(() => import('remote_app/Button'));
```

---

## Shared Configuration

### TypeScript — Shared Base Config

```json
// packages/config/tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": {
      "@myorg/ui": ["../../packages/ui/src/index.ts"],
      "@myorg/utils": ["../../packages/utils/src/index.ts"]
    }
  }
}

// apps/web/tsconfig.json — extends base
{
  "extends": "@myorg/config/tsconfig.base.json",
  "include": ["src/**/*"],
  "compilerOptions": {
    "outDir": "dist"
  }
}
```

### ESLint — Shared Config Package

```ts
// packages/config/eslint-base.js
module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    rules: {
        'no-console': ['warn', { allow: ['error'] }],
        '@typescript-eslint/no-unused-vars': 'error',
    },
};

// apps/web/.eslintrc.js
module.exports = {
    extends: ['@myorg/config/eslint-base', 'next/core-web-vitals'],
};
```

---

## changesets — Versioning and Changelogs

> Changesets manages versioning in monorepos — each PR includes a "changeset" describing what changed. On release, it bumps versions and generates changelogs automatically.

```bash
# Add a changeset for your PR
pnpm changeset
# → select which packages changed (major/minor/patch)
# → write a summary

# When ready to release
pnpm changeset version   # bumps all package.json versions
pnpm changeset publish   # publishes to npm
```

---

## Most Asked Monorepo Interview Questions

### "Why would you choose a monorepo over separate repos?"

> When packages are tightly coupled and change together frequently — separate repos create friction (open 5 PRs to make one change, coordinate releases, manage version mismatches). Monorepo wins when: shared design system or utilities, full-stack app where frontend and backend types must stay in sync, platform team managing many related services. Polyrepo wins when: truly independent teams/products, very different release cadences, compliance requires isolation.

### "How does Turborepo know what to rebuild?"

> Turborepo hashes the inputs (source files, env vars, dependencies' hashes). If the hash matches a previous run's hash, it's a cache hit — restore outputs and skip the task. The task graph (`dependsOn`) ensures dependencies always build before dependents. Remote caching (Vercel or self-hosted) extends this to the whole team — if your colleague already built the same code, you get their cached result.

### "What is the difference between a monorepo and a monolith?"

> A **monolith** is a single deployable unit — one application, one deployment. A **monorepo** is a single repository containing multiple deployable units — multiple apps/packages in one repo, each deployed independently. You can have a monorepo with a monolith (one app in one repo), a monorepo with microservices (many services in one repo), or microservices across many repos (polyrepo). The repo structure and the deployment architecture are independent decisions.
