# JavaScript Runtimes — Beginner's Guide

**Priority: HIGH**

> A plain-language introduction to JavaScript runtimes: what a runtime is, engine vs
> runtime, the browser vs Node.js vs Deno/Bun vs edge, what's the same everywhere and
> what isn't, the event loop in one picture, and where React code actually runs.
>
> Assumes you've written some JavaScript. No knowledge of engines or Node internals needed.

---

## Table of Contents

- [JavaScript Runtimes — Beginner's Guide](#javascript-runtimes--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. What a Runtime Is](#1-what-a-runtime-is)
  - [2. Engine vs Runtime](#2-engine-vs-runtime)
  - [3. The Runtimes You'll Meet](#3-the-runtimes-youll-meet)
  - [4. Same Everywhere vs Runtime-Specific](#4-same-everywhere-vs-runtime-specific)
  - [5. The Event Loop — One Picture](#5-the-event-loop--one-picture)
  - [6. The Browser Runtime](#6-the-browser-runtime)
  - [7. The Node.js Runtime](#7-the-nodejs-runtime)
  - [8. Deno \& Bun](#8-deno--bun)
  - [9. Edge Runtimes](#9-edge-runtimes)
  - [10. Where React Code Actually Runs](#10-where-react-code-actually-runs)
  - [11. Versions \& Compatibility](#11-versions--compatibility)
  - [12. Common Beginner Mistakes](#12-common-beginner-mistakes)
  - [13. Cheat Sheet](#13-cheat-sheet)
  - [Related Files](#related-files)

---

## 1. What a Runtime Is

```text
JavaScript code is just text. ‼️ Something has to READ it and RUN it — and give
it a world to interact with: a screen, files, the network, a clock.

‼️ RUNTIME IN ONE SENTENCE
   The environment your JavaScript runs in: the engine that executes the
   code, PLUS the extra features (APIs) that environment gives you.‼️

  Same language, different worlds:

  In the BROWSER, JS can:          In NODE.JS, JS can:
    change the page (DOM)            read and write files
    react to clicks                  start a web server
    store data in localStorage       read environment variables
    ✗ NOT read your files            ✗ NOT touch a web page — there isn't one

‼️ The language is the same. What you can DO depends on where it runs.
```

---

## 2. Engine vs Runtime

```text
‼️ THE TWO WORDS YOU MUST GET STRAIGHT.

  ENGINE    Understands and executes the JavaScript LANGUAGE itself:
            variables, functions, objects, arrays, Promise, JSON, Math…
            Knows NOTHING about web pages, files or networks.‼️

  RUNTIME   Engine + extra APIs + an event loop (§5).
            The extra APIs are what let JS do useful things.

  The analogy:
    Engine   = a car engine —- powerful, but on its own it goes nowhere
    Runtime  = the whole car —- engine + wheels + steering + dashboard

  RUNTIME = ENGINE + APIs + EVENT LOOP‼️
```

```text
THE MAIN ENGINES
  V8               Google — inside Chrome, Edge, Node.js, Deno
  SpiderMonkey     Mozilla — inside Firefox‼️
  JavaScriptCore   Apple — inside Safari, and Bun‼️
  Hermes           Meta — built for React Native apps‼️

‼️ One engine, many runtimes: V8 powers Chrome AND Node.js AND Deno.
   They run your code the same way — they just offer different APIs.‼️
```

---

## 3. The Runtimes You'll Meet

```text
  RUNTIME          ENGINE         WHERE                  USED FOR
  ──────────────────────────────────────────────────────────────────────────────
  Browsers         V8 / Spider-   Chrome, Firefox,       Websites and web apps
                   Monkey / JSC   Safari, Edge
  Node.js          V8             Servers, your laptop   APIs, backends, build
                                                         tools, scripts
  Deno             V8             Servers, laptop        Like Node — TS built in,
                                                         secure by default
  Bun              JavaScriptCore Servers, laptop        Like Node — very fast,
                                                         lots of tools built in
  Edge runtimes    V8             CDN servers near users Small fast functions —
                                  (Cloudflare Workers,   redirects, auth checks,
                                  Vercel Edge)           personalising pages
  React Native     Hermes         iPhone / Android       Mobile apps
  Electron         V8 (Chromium   Desktop apps           VS Code, Slack, Discord
                   + Node.js)

‼️ For a frontend/full-stack developer, the two that matter most:
   the BROWSER (where your app runs for users) and
   NODE.JS (where your backend AND your build tools run).‼️
```

---

## 4. Same Everywhere vs Runtime-Specific

```text
‼️ THE LANGUAGE (from the engine) — works in EVERY runtime
   let/const, functions, classes, arrays, objects, Map, Set,
   Promise, async/await, JSON, Math, Date, RegExp, Error

COMMON WEB APIS — now in browsers AND Node AND Deno AND Bun AND edge‼️
   fetch, URL, setTimeout, console, TextEncoder,
   crypto.randomUUID(), structuredClone, AbortController

BROWSER ONLY                       NODE ONLY (also Deno/Bun via compatibility)
   window, document                   process (env, argv, exit)
   DOM: querySelector, addEventListener   fs (files)
   localStorage, sessionStorage       path, os
   alert, navigator, location         http server, child_process
   IndexedDB, Service Workers         require (CommonJS)

‼️ THE MOST COMMON RUNTIME ERRORS COME FROM THIS TABLE:
   "window is not defined"    → browser code ran in Node (often during SSR)
   "document is not defined"  → same
   "process is not defined"   → Node code ran in the browser
   "require is not defined"   → CommonJS code in an ES-module/browser context‼️
```

```javascript
// ‼️ globalThis = "the global object" in ANY runtime
//   browser → window      Node → global      workers → self
globalThis.setTimeout(() => {}, 0); // works everywhere

// Checking which runtime you're in:
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && !!process.versions?.node;
```

---

## 5. The Event Loop — One Picture

```text
‼️ JavaScript runs on ONE THREAD — it does one thing at a time.
   So how does it wait for a network request without freezing?

   It DOESN'T wait. It hands slow work ‼️ to the RUNTIME and keeps going.
   When the work is done, the runtime puts a callback in a queue, and the
   EVENT LOOP runs it when JS is free.‼️

     ┌──────────────┐   "fetch this"    ┌─────────────────────────┐
     │  CALL STACK  │ ────────────────▶ │  RUNTIME (browser/Node) │
     │ (your code,  │                   │  network, timers, files │
     │  one at a    │                   └───────────┬─────────────┘
     │  time)       │                               │ done!
     └──────▲───────┘                   ┌───────────▼─────────────┐
            │     event loop: "stack    │  QUEUES                 │
            └──── empty? run the next ──│  microtasks (promises)  │
                  callback"             │  tasks (timers, events) │
                                        └─────────────────────────┘

‼️ Same idea in the browser and in Node. That's why async/await,
   promises and setTimeout behave the same in both.
```

```javascript
console.log('1 sync');
setTimeout(() => console.log('4 timeout'), 0); // task queue
Promise.resolve().then(() => console.log('3 promise')); // microtask queue
console.log('2 sync');

// Prints: 1 sync, 2 sync, 3 promise, 4 timeout
// ‼️ All normal code first → then ALL microtasks (promises) → then the next task.
// setTimeout(..., 0) means "as soon as possible", NOT "right now".‼️
```

```text
‼️ WHY IT MATTERS
   A long loop on the main thread blocks EVERYTHING:
     browser → the page freezes, clicks don't respond
     Node    → the server can't answer ANY other request
   Heavy work → Web Workers (browser) or worker_threads (Node).‼️
```

---

## 6. The Browser Runtime

```text
What the browser gives your JavaScript (on top of the language):

  DOM              read and change the page: document.querySelector, .textContent
  Events           click, input, scroll, keydown → addEventListener
  Network          fetch, WebSocket
  Storage          localStorage, sessionStorage, IndexedDB, cookies
  Timers           setTimeout, setInterval, requestAnimationFrame
  Device           navigator.geolocation, clipboard, camera (with permission)
  Background       Web Workers, Service Workers‼️

‼️ THE BROWSER IS A SANDBOX — for the user's safety, page JS CANNOT:
   - read or write files on the computer (only ones the user picks)
   - read other websites' data (same-origin policy, CORS)
   - run other programs
   A random website must not be able to touch your files.‼️

Each browser has its own engine, so a brand-new feature may work in Chrome
before Safari. → see §11 and BROWSER-COMPATIBILITY-DEEP.md
```

---

## 7. The Node.js Runtime

```text
Node.js = V8 taken OUT of the browser, plus APIs for servers and computers.
Released 2009. It's why JavaScript runs on servers at all.

What Node gives you (on top of the language):

  fs              files      fs.readFile('data.json')
  http            servers    the base that Express and Nest build on
  process         the program   process.env.DATABASE_URL, process.argv, process.exit()
  path, os        file paths, system info
  child_process   run other programs‼️
  npm             the package manager that comes with it

‼️ NO SANDBOX — Node code can do anything your user account can:
   read your files, delete folders, open network connections.
   That's why you should be careful which npm packages you install.‼️
```

```javascript
// server.js — a whole web server with NO libraries, just the Node runtime
import { createServer } from 'node:http';

createServer((req, res) => {
  res.end('Hello from Node');
}).listen(3000);

// run:  node server.js   → open http://localhost:3000
```

```text
MODULES — two systems, both in Node:
  CommonJS (older)    const fs = require('fs');       module.exports = ...
  ES Modules (modern) import fs from 'node:fs';      export ...

  ‼️ Use ES modules for new code ("type": "module" in package.json).
     You'll still see require() in older projects and tutorials.

TypeScript: recent Node versions can run simple .ts files directly‼️
(`node app.ts`) by stripping the types. Bigger projects still compile with tsc
or a bundler. → see TYPESCRIPT-DEEP.md
```

---

## 8. Deno & Bun

```text
Both are alternatives to Node.js. Same language, similar server APIs.

  DENO   by the original creator of Node — "Node, fixed"
         - TypeScript works out of the box
         - Secure by default: no file/network access unless you allow it
             deno run --allow-net server.ts
         - Built-in formatter, linter, test runner

  BUN    focused on SPEED
         - Very fast startup, fast installs
         - Runtime + package manager + bundler + test runner in ONE tool
             bun install, bun run dev, bun test
         - TypeScript works out of the box

‼️ Both aim to run most Node code and npm packages. Compatibility is good
   but not perfect — check before switching a big existing project.

‼️ Beginner advice: learn NODE first. It's what most jobs, tutorials and
   hosting platforms expect. The concepts transfer directly.
```

---

## 9. Edge Runtimes

```text
"The edge" = servers spread around the world, close to users (a CDN).
An edge runtime runs SMALL JavaScript functions on those servers.‼️

  Cloudflare Workers, Vercel Edge Functions, Deno Deploy, Netlify Edge

  User in Tokyo ──▶ edge server in Tokyo (runs your code, ~ms away)
                    instead of
  User in Tokyo ──▶ your server in Virginia (much further)

GOOD FOR: redirects, auth checks, A/B tests, personalising a page, simple APIs

‼️ They are NOT full Node.js. Usually:‼️
   ✓ web-standard APIs: fetch, Request, Response, URL, crypto
   ✗ often no fs, limited or no native Node modules
   ✗ short time and memory limits per request
   So some npm packages don't work there.‼️
```

```javascript
// A whole edge function — uses only web-standard Request/Response
export default {
  async fetch(request) {
    const country = request.headers.get('cf-ipcountry'); // Cloudflare example
    return new Response(`Hello, visitor from ${country}`);
  },
};
```

---

## 10. Where React Code Actually Runs

```text
‼️ React is a LIBRARY, not a runtime. It's JavaScript code that RUNS INSIDE
   a runtime — and in a modern React app, it runs in several of them.‼️

  YOUR REACT PROJECT
  ═══════════════════════════════════════════════════════════════════════════

  ① BUILD TIME — runs in NODE.JS (on your laptop / CI)‼️
     Vite, TypeScript, ESLint, Vitest, npm
     → turns your .tsx files into plain .js the browser can understand
     ‼️ This is why you need Node installed for FRONTEND work, even though
        your app never runs in Node for users.‼️

  ② IN THE BROWSER — the BROWSER runtime (on the user's device)
     react + react-dom: renders components, handles clicks, useState,
     useEffect, fetch to your API
     → this is "client-side" React

  ③ ON THE SERVER — NODE (or edge) runtime — only with SSR frameworks
     Next.js, Remix/React Router: render components to HTML on the server
     first, so the page shows up fast; Server Components run ONLY here
     → then the browser "hydrates" it (adds the interactivity)

  ④ ON A PHONE — HERMES — with React Native
     Same React ideas (components, hooks), but renders native mobile views
     instead of a DOM

  A plain Vite + React app (like this repo's client/) uses ① and ② only.‼️
```

```tsx
// ‼️ THE CLASSIC SSR BUG — code that assumes it's in the browser
function ThemeToggle() {
  // ✗ In Next.js this also runs on the SERVER first → "window is not defined"
  const saved = window.localStorage.getItem('theme');

  // ✓ Browser-only code goes inside useEffect — it only runs in the browser
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    setTheme(localStorage.getItem('theme') ?? 'light');
  }, []);
}
```

```text
‼️ SECRETS: anything that ends up in BROWSER code is public — anyone can
   read it in DevTools. API keys belong in code that runs on the SERVER
   (②=public, ③=private). Vite only exposes env vars that start with VITE_
   to the browser for exactly this reason.
```

---

## 11. Versions & Compatibility

```text
‼️ Not every runtime supports every feature — and you don't control which
   browser your users have.

BROWSERS
  - New JS and CSS features arrive in different browsers at different times
  - Check support: caniuse.com, or MDN's "Baseline" badge
    (Baseline = works in all major browsers)
  - ‼️ Your bundler can TRANSPILE newer syntax into older syntax, and POLYFILLS
    add missing APIs — set your targets in the build config

NODE.JS
  - You choose the version on your server, so it's under your control
  - Use the current LTS (Long-Term Support) version — check nodejs.org
  - Pin it so everyone uses the same one:
      "engines": { "node": ">=26" }     in package.json
      .nvmrc  →  26                     for nvm / fnm users
      FROM node:26-alpine                in your Dockerfile
  - From Node 27 there's one major release a year, and every one becomes LTS

‼️ "It works on my machine" is often a Node VERSION difference. Pin it.‼️
```

---

## 12. Common Beginner Mistakes

```text
‼️ 1. Thinking JavaScript = the browser.
   The language runs in many runtimes. What's available depends on which.

‼️ 2. Using window / document / localStorage in code that runs on the server.
   "window is not defined" in Next.js SSR. Move it into useEffect, or check
   typeof window !== 'undefined'.

‼️ 3. Using process.env / fs / require in browser code.
   They don't exist there. Use import.meta.env.VITE_* in Vite apps.

‼️ 4. Putting secrets in frontend code.
   Everything sent to the browser is public. Keys stay on the server.

‼️ 5. Thinking React "is" the runtime.
   React is a library. The browser (or Node, or Hermes) is the runtime.‼️

‼️ 6. Blocking the event loop.
   A huge synchronous loop freezes the page — or stops a Node server from
   answering anyone. Split the work or move it to a worker.

‼️ 7. Expecting setTimeout(fn, 0) to run immediately.
   It runs after the current code AND all pending promises.

‼️ 8. Assuming a new feature works in every browser.
   Check caniuse / Baseline, especially for Safari.‼️

‼️ 9. Unpinned Node versions.
   Different laptops and servers run different Node → mysterious failures.

‼️ 10. Using any npm package on the edge.
   Edge runtimes aren't full Node. Packages that need fs or native modules fail.‼️
```

---

## 13. Cheat Sheet

```text
DEFINITIONS
  Engine    runs the LANGUAGE           V8, SpiderMonkey, JavaScriptCore, Hermes
  Runtime   engine + APIs + event loop  browser, Node, Deno, Bun, edge
  React     a LIBRARY that runs inside a runtime

WHICH RUNTIME FOR WHAT
  Website / web app UI            → browser
  Backend API, scripts            → Node (or Deno / Bun)
  Build tools (Vite, tsc, tests)  → Node‼️
  Tiny fast functions near users  → edge (Cloudflare Workers, Vercel Edge)‼️
  Mobile app                      → React Native (Hermes)
  Desktop app                     → Electron

AVAILABLE WHERE
  Everywhere     language features, fetch, URL, setTimeout, console, crypto
  Browser only   window, document, DOM, localStorage, alert
  Node only      process, fs, path, http server, require

ERRORS → MEANING
  window is not defined     browser code ran on the server
  process is not defined    Node code ran in the browser
  require is not defined    CommonJS in an ES-module context

EVENT LOOP ORDER
  sync code → all microtasks (promises) → next task (setTimeout, events)

REACT
  build: Node  •  client: browser  •  SSR/Server Components: Node/edge  •  RN: Hermes
```

---

## Related Files

- [JS-ASYNC-DEEP.md](JS-ASYNC-DEEP.md) — promises, async/await and the event loop in depth
- [BROWSER-INTERNALS-DEEP.md](../2-medium-priority/BROWSER-INTERNALS-DEEP.md) — inside the browser: components, V8, memory, rendering
- [NODEJS-INTERNALS-DEEP.md](NODEJS-INTERNALS-DEEP.md) — inside Node: libuv, the event loop phases, streams
- [BROWSER-COMPATIBILITY-DEEP.md](../2-medium-priority/BROWSER-COMPATIBILITY-DEEP.md) — engines, browser quirks, support policy
- [NEXTJS-DEEP.md](../2-medium-priority/NEXTJS-DEEP.md) — SSR and Server Components, where React runs on the server
- [DOCKER-BASICS.md](../2-medium-priority/DOCKER-BASICS.md) — pinning the Node version in an image
