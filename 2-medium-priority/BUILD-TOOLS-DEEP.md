# Build Tools Deep Reference

Build tools transform your source code (TypeScript, JSX, modern JS) into something browsers can run. Senior engineers are expected to understand what's happening at build time — not just "it works" but why, and what to do when it doesn't.

---

## The Modern Build Pipeline

```text
Source code (TypeScript, JSX, CSS Modules, assets)
      ↓
  Transpilation: TypeScript → JavaScript, JSX → React.createElement
      ↓
  Bundling: many files → one (or few) bundles
      ↓
  Tree shaking: remove unused code
      ↓
  Minification: shorten names, remove whitespace
      ↓
  Output: main.js, chunks, assets — ready for the browser
```

---

## Vite — The Modern Standard

Vite is the default choice for new projects. It's fast because it doesn't bundle during development.

### How Vite works

```text
Development mode:
  - No bundling. Uses native ES modules (import/export) in the browser.
  - Browser requests a file → Vite transforms it on demand (TypeScript → JS, JSX → JS)
  - Only transforms what the browser actually requests
  - Result: server starts in < 300ms, regardless of project size
  - Hot Module Replacement (HMR) only replaces the changed module

Production mode:
  - Uses Rollup under the hood to bundle everything
  - Tree shaking, code splitting, minification
  - Output is optimised for production

Why Vite is faster than Webpack in dev:
  - Webpack bundles everything first, then serves → slow start for large projects
  - Vite serves source files directly → instant start
```

### Vite config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(), // JSX transform + Fast Refresh
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // import '@/components/Button' instead of '../../components/Button'
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,      // source maps for debugging
    minify: 'esbuild',    // fast minification
    target: 'es2020',     // minimum browser support level

    rollupOptions: {
      output: {
        // Manual chunk splitting — control what goes into each bundle
        manualChunks: {
          vendor: ['react', 'react-dom'],           // separate vendor chunk (cached longer)
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },

    // Warn when a chunk exceeds this size
    chunkSizeWarningLimit: 500, // 500kb
  },

  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080', // proxy API calls to backend in dev
    },
  },

  // Optimise dependencies — pre-bundle node_modules with esbuild
  optimizeDeps: {
    include: ['lodash-es', 'date-fns'],
  },
});
```

---

## Webpack — The Veteran

Webpack is still widely used (Create React App, older projects, complex enterprise setups). Understanding it helps when you're maintaining existing projects.

### Core concepts

```text
Entry point:    where Webpack starts building the dependency graph
Output:         where the bundles go
Loaders:        transform files before they're added to the bundle
                (babel-loader: JS/JSX, ts-loader: TypeScript, css-loader: CSS)
Plugins:        extend Webpack's capabilities
                (HtmlWebpackPlugin, MiniCssExtractPlugin, DefinePlugin)
Module:         any file that can be imported (JS, CSS, image, etc.)
Chunk:          a bundle file produced by Webpack
```

### Basic webpack config

```javascript
// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: './src/index.tsx',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isDev ? '[name].js' : '[name].[contenthash].js',  // content hash for cache busting
      chunkFilename: '[name].[contenthash].chunk.js',
      clean: true, // clean dist/ before each build
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: { '@': path.resolve(__dirname, 'src') },
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: 'babel-loader',  // or 'ts-loader'
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader, // inject vs extract CSS
            'css-loader',
            'postcss-loader',  // Tailwind, autoprefixer
          ],
        },
        {
          test: /\.(png|jpg|svg|gif)$/,
          type: 'asset/resource',  // Webpack 5 built-in asset handling
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({ template: './public/index.html' }),
      !isDev && new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
    ].filter(Boolean),

    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
      runtimeChunk: 'single', // separate runtime chunk — improves long-term caching
    },

    devtool: isDev ? 'eval-source-map' : 'source-map',

    devServer: {
      port: 3000,
      hot: true,  // HMR
      historyApiFallback: true, // for client-side routing
      proxy: { '/api': 'http://localhost:8080' },
    },
  };
};
```

---

## esbuild — The Speed Benchmark

esbuild is 10-100x faster than Webpack or Rollup. Written in Go. Used internally by Vite for dependency pre-bundling and minification.

```javascript
// esbuild — direct API usage
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  splitting: true,          // code splitting
  sourcemap: true,
  minify: true,
  target: ['es2020', 'chrome90', 'firefox90'],
  jsx: 'automatic',         // React 17+ JSX transform (no import React needed)
  plugins: [],
});

// Use as a standalone bundler for:
// - Build tools and CLIs (fast builds, doesn't need HMR)
// - Bundling Node.js server code
// - Lambda functions (small, fast bundles)
// NOT ideal for complex frontend apps (less mature ecosystem than Vite/Webpack)
```

---

## Tree Shaking

Tree shaking removes code that is imported but never used. This requires ES modules (`import`/`export`) — CommonJS (`require`/`module.exports`) cannot be tree-shaken.

```typescript
// utils.ts — exports 3 functions
export function formatDate(date: Date) { ... }
export function formatCurrency(amount: number) { ... }
export function formatPhone(phone: string) { ... }

// component.tsx — only uses one
import { formatDate } from './utils';

// After tree shaking: formatCurrency and formatPhone are NOT in the bundle
```

### What breaks tree shaking

```typescript
// ✗ Side effects — bundler can't safely remove code that might run
import './setup'; // this file runs immediately on import — can't remove

// ✗ CommonJS — require() is dynamic, bundler can't analyse it statically
const utils = require('./utils');
utils.formatDate(date); // bundler doesn't know what `utils` will contain

// ✗ Namespace imports — bundler imports everything
import * as _ from 'lodash'; // imports all of lodash
_.map(arr, fn);

// ✓ Named imports — bundler can remove unused exports
import { map } from 'lodash-es'; // only imports map (lodash-es is ES module)

// Tell bundler a file has no side effects (enables more aggressive tree shaking)
// package.json
{
  "sideEffects": false              // no files have side effects
  "sideEffects": ["*.css", "setup.js"]  // only these files have side effects
}
```

---

## Code Splitting

Split your bundle into smaller chunks that load on demand. Critical for performance.

```typescript
// Route-based code splitting — most important type
// Each route only loads when navigated to

// React.lazy + Suspense
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const Settings = lazy(() => import('./features/settings/Settings'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// Component-level splitting — heavy components loaded on demand
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));
const PDFViewer = lazy(() => import('./components/PDFViewer'));

function DocumentEditor({ mode }) {
  return mode === 'edit'
    ? <Suspense fallback={<Skeleton />}><RichTextEditor /></Suspense>
    : <Suspense fallback={<Skeleton />}><PDFViewer /></Suspense>;
}

// Dynamic import with preloading — load before user needs it
function ProductCard({ productId }) {
  const prefetchDetail = () => {
    // Preload the detail page bundle on hover — ready when user clicks
    import('./features/products/ProductDetail');
  };

  return (
    <div onMouseEnter={prefetchDetail}>
      <Link to={`/products/${productId}`}>View product</Link>
    </div>
  );
}
```

---

## Bundle Analysis

When your bundle is too large, use analysis tools to find what's inside.

```bash
# Vite — rollup-plugin-visualizer
npm install -D rollup-plugin-visualizer

# In vite.config.ts:
import { visualizer } from 'rollup-plugin-visualizer';
plugins: [react(), visualizer({ open: true, gzipSize: true })]

# Build — opens an interactive treemap in browser
npm run build

# Webpack Bundle Analyzer
npm install -D webpack-bundle-analyzer

# Add to webpack config:
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
plugins: [new BundleAnalyzerPlugin()]

# Or use CLI:
npx webpack-bundle-analyzer dist/stats.json
```

### What to look for

```text
Large node_modules:
  - moment.js — 67kb gzipped. Replace with date-fns or dayjs (5-7kb)
  - lodash — 24kb. Use lodash-es + tree shaking, or native methods
  - Full icon libraries — import only what you use

Duplicates:
  - Multiple versions of the same package
  - Components accidentally included twice

Unexpectedly large features:
  - A rarely-used admin page loaded in the main bundle
  - Fix: lazy load it

Chart libraries:
  - recharts, chart.js, d3 are heavy — lazy load charts
```

---

## Source Maps

Source maps let you debug minified production code by mapping it back to your source.

```text
Types:
  eval-source-map    — fastest rebuild, good for dev
  cheap-source-map   — fast, line-level accuracy
  source-map         — slowest, full accuracy (use for production)
  hidden-source-map  — like source-map but not linked in the bundle (upload to Sentry)

Security:
  Never serve source maps publicly in production — they expose your source code.
  Upload to Sentry/Datadog for error tracking, then exclude from CDN.

In Vite:
  build: { sourcemap: 'hidden' } // generates but doesn't link in HTML
```

---

## Module Federation

Module Federation (Webpack 5, Vite federation plugin) lets multiple separately-deployed apps share code at runtime — the foundation of micro-frontends.

```javascript
// Host app (shell) — consumes remote modules
// webpack.config.js
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    checkout: 'checkout@https://checkout.example.com/remoteEntry.js',
    catalog:  'catalog@https://catalog.example.com/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true },
  },
});

// Remote app (checkout) — exposes modules to the host
new ModuleFederationPlugin({
  name: 'checkout',
  filename: 'remoteEntry.js',
  exposes: {
    './CheckoutPage': './src/CheckoutPage',
    './CartWidget': './src/CartWidget',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
});

// In the host app — load remote module dynamically
const CheckoutPage = lazy(() => import('checkout/CheckoutPage'));

// What happens:
// 1. Browser loads the host app
// 2. User navigates to checkout
// 3. Browser fetches checkout.example.com/remoteEntry.js (manifest)
// 4. Browser fetches the actual checkout bundle
// 5. React mounts the remote CheckoutPage component

// Singleton: react and react-dom are shared — only one copy in memory
// Both host and remote use the same React instance (required for hooks to work)
```

---

## Environment Variables

```typescript
// Vite: prefix with VITE_ to expose to client
// .env
VITE_API_URL=https://api.example.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx
SECRET_KEY=this-is-not-exposed  // NOT prefixed — stays on server

// In code
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;         // true in dev
const isProd = import.meta.env.PROD;       // true in prod
const mode = import.meta.env.MODE;         // 'development' | 'production'

// Webpack: use DefinePlugin
new webpack.DefinePlugin({
  'process.env.API_URL': JSON.stringify(process.env.API_URL),
});

// TypeScript — declare types for custom env vars
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
}
```

---

## Common Interview Questions

### "What is the difference between Vite and Webpack?"

> The key difference is in how they handle development. Webpack bundles all your files before serving — for large projects this can take 30-60 seconds on cold start. Vite skips bundling entirely in development: it uses native ES modules so the browser imports files directly, and Vite only transforms files (TypeScript → JS, JSX → JS) when the browser requests them. The result is a dev server that starts in under 300ms regardless of project size, and HMR that replaces only the changed module. For production builds, Vite uses Rollup (same quality output as Webpack). Choose Vite for new projects. Stick with Webpack if you're on an existing project with a complex config you'd need to migrate.

### "What is tree shaking and what can break it?"

> Tree shaking removes exports from your bundle that are never imported anywhere. It requires ES modules — the bundler statically analyses `import` and `export` statements to build a graph of what's actually used. Three things break it: **CommonJS** (`require()` is dynamic, the bundler can't determine what's used at build time), **side effects** (files that run code on import — the bundler can't remove them safely), and **namespace imports** (`import * as utils from './utils'` imports everything). To enable tree shaking: use ES modules, mark your packages as `"sideEffects": false` in package.json, use named imports, and prefer ES module versions of libraries (lodash-es over lodash).

### "How do you reduce bundle size?"

> I'd start with bundle analysis (rollup-plugin-visualizer or webpack-bundle-analyzer) to see what's actually in the bundle. The most common culprits: **large libraries** — moment.js (67kb) replaced by dayjs (5kb), lodash replaced by lodash-es with tree shaking or native methods; **unused imports** from icon libraries (import only what you use, not the whole library); **route-based code splitting** — each page loads its own bundle so users don't download code for pages they haven't visited; **lazy loading heavy components** — chart libraries, rich text editors, PDF viewers. After identifying the biggest chunks, code split them with `React.lazy()`. Then check for duplicate packages (two versions of the same library). Finally, ensure gzip/brotli compression is enabled on the CDN — usually reduces bundle size by 60-70%.

### "What is code splitting and how do you implement it?"

> Code splitting divides your bundle into smaller chunks that load on demand instead of upfront. The most important type is route-based splitting — each route gets its own chunk, loaded only when the user navigates there. In React: wrap each lazy-loaded component with `React.lazy()` and `Suspense`. The build tool (Vite/Webpack) automatically creates a separate chunk for each `import()` call. Beyond routes, you can split heavy components (a PDF viewer, map, or chart library) that aren't needed on initial render. Vite also supports manual chunk configuration via `rollupOptions.output.manualChunks` — useful for separating vendor code (React, React-DOM) which changes less frequently and can be cached longer than your app code.
