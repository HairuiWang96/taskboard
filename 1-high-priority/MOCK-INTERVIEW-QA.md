# Mock Interview Q&A — Top 50

Drill these aloud. Time yourself: 60–90 seconds per answer.
Don't read — glance at the question, close the file, speak it.

---

## JavaScript (10 questions)

**Q1. What is the event loop? How does Node.js handle async operations?**

> JavaScript is single-threaded. The event loop allows non-blocking I/O by offloading work (timers, I/O) to the OS/libuv and processing their callbacks when the call stack is empty. Phases: timers → I/O callbacks → poll → check (setImmediate) → close. Microtasks (Promises, nextTick) run between every phase.

**Q2. What is a closure? Give a real-world use case.**

> A closure is a function that retains access to its outer scope even after the outer function has returned. ‼️ Real use: data privacy (module pattern), memoisation, partial application, event handlers that remember context.

```js
function counter() {
    let count = 0;
    return { inc: () => ++count, get: () => count };
}
```

**Q3. Explain `this` in JavaScript. When does it change?**‼️

> `this` refers to the execution context. In a regular function: determined by how the function is called. In an arrow function: lexically inherited from the enclosing scope (never changes‼️). In a method call: the object before the dot. `call/apply/bind` explicitly set `this`. In strict mode, `this` is undefined in regular functions called without context.

```js
// "Lexically inherited from enclosing scope" means:
// An arrow function does NOT get its own `this`.‼️
// It captures `this` from WHERE it was WRITTEN (the parent scope), not how it's called.‼️
// "Lexically" = determined by source code location, not runtime behavior.‼️
// "Never changes" = .call(), .bind(), .apply() have NO effect on arrow functions.‼️

//"Lexically" = determined by the source code location (where you wrote it), not by runtime behavior (how it's called).
// "Inherited from enclosing scope" = it looks outward to the parent function/block and grabs whatever this is there.‼️
// "Never changes" = you can't override it with .call(), .bind(), or .apply() — it's locked in at definition time.

const obj = {
    name: 'Harry',

    // Regular function: `this` depends on HOW it's called
    regular() {
        console.log(this.name); // 'Harry' — called as obj.regular(), so this = obj
    },

    // Arrow function: `this` depends on WHERE it's written
    arrow: () => {
        console.log(this.name); // undefined — written in global/module scope, so this = global‼️
    },

    delayed() {
        // Here `this` = obj (because delayed() is called as obj.delayed())

        setTimeout(function () {
            // WHY is `this` wrong here?
            // setTimeout stores this callback and later calls it as a PLAIN function call:
            //   const cb = function () { ... };
            //   cb();  ← no object before the dot, so `this` = window/global
            // Rule for regular functions:
            //   obj.method()   → this = obj     (object before the dot)
            //   func()         → this = window  (no object → global)
            //   new Func()     → this = new instance
            //   func.call(obj) → this = obj     (explicitly set)
            console.log(this.name); // undefined — regular fn, setTimeout sets this = window‼️
        }, 100);

        setTimeout(() => {
            // WHY does `this` work here?
            // Arrow function doesn't care HOW it's called (plain call, .call(), whatever).
            // It inherited `this` = obj from delayed() when it was WRITTEN, and that's final.
            console.log(this.name); // 'Harry' — arrow inherits `this` from delayed(), which is obj
        }, 100);

        // Before arrow functions existed, the workaround was:
        // const self = this;  ← save `this` into a regular variable
        // setTimeout(function () {
        //   console.log(self.name); // 'Harry' — using the saved reference
        // }, 100);
        // Arrow functions made this `const self = this` hack unnecessary.
    },
};

// .call() and .bind() cannot override arrow function's `this`‼️
const arrow = () => console.log(this);
arrow.call({ name: 'Harry' }); // still global — .call() has NO effect
arrow.bind({ name: 'Harry' })(); // still global — .bind() has NO effect

// This is WHY arrow functions are perfect for callbacks inside methods:
// they automatically keep the parent's `this` without needing .bind(this)
```

```js
// WHY is `arrow: () => {}` inside an object literal considered global scope?
//
// Because object literals { } are NOT scopes — they're just syntax for building an object.‼️
// Scopes in JS are created by: functions, blocks (let/const), modules.‼️
// An object literal { } does NOT create a scope — it's just data construction.‼️
//
// So this arrow function is effectively written in the global/module scope:

// These two are essentially identical:

// Version 1: object literal
const obj1 = {
    arrow: () => console.log(this), // `this` = whatever `this` is RIGHT HERE (global)
};

// Version 2: equivalent desugared code
const obj2 = {};
obj2.arrow = () => console.log(this); // clearly in global scope → this = global
// Both are the same — the { } in the object literal didn't create a new scope.

// The rule: arrow functions look for the nearest enclosing FUNCTION scope‼️
// (or module/global), NOT the nearest { }.‼️
// The obj = { } braces are not a function, so the arrow skips them
// and lands on global/module scope, where `this` = undefined (strict) or window (browser).

// This is why putting an arrow inside a regular METHOD works:
const obj3 = {
    name: 'Harry',
    delayed() {
        // regular function = creates a real scope, this = obj3
        const fn = () => this.name; // arrow inherits `this` from delayed() → obj3 ✓
        console.log(fn()); // 'Harry'
    },
};
```

**Q4. What's the difference between `==` and `===`?**

> `===` (strict) checks value and type — no coercion. `==` (loose) applies type coercion: `0 == false` is true, `'' == false` is true, `null == undefined` is true but `null === undefined` is false. Always use `===` unless you specifically need coercion.

**Q5. How does prototypal inheritance work?**

> ‼️Every object has an internal `[[Prototype]]` link. When you access a property, JS walks the prototype chain until it finds it or reaches null. `Object.create(proto)` creates an object with a specific prototype. ES6 `class` is syntactic sugar over prototype chains. `__proto__` is the accessor, `Object.getPrototypeOf()` is the standard API.

**Q6. What is a Promise? How is it different from a callback?**

> A Promise is an object representing the eventual resolution or rejection of an async operation. Unlike callbacks, Promises are chainable (`.then`), composable (`Promise.all`), and have built-in error handling (`.catch`). They avoid callback hell (nested callbacks) and allow async/await syntax.

**Q7. What's the difference between `null`, `undefined`, and `undeclared`?**

> `undefined`: variable declared but not assigned. `null`: intentional absence of value, explicitly set. `undeclared`: variable referenced that was never declared — throws ReferenceError in strict mode. ‼️`typeof undeclared` returns `'undefined'` (no error). `null == undefined` is true; `null === undefined` is false.

**Q8. Explain hoisting.**

> `var` declarations are hoisted to the top of their function scope and initialised to `undefined`. `function` declarations are fully hoisted (name + body). `let` and `const` are hoisted to the block scope but remain in the Temporal Dead Zone until the declaration line — accessing them before throws ReferenceError.

**Q9. What is debounce vs throttle? Implement one.**

> Debounce: delays execution until N ms after the last call — good for search inputs. ‼️Throttle: limits execution to once per N ms regardless of call frequency — ‼️good for scroll events.

```js
function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}
```

**Q10. What are WeakMap and WeakSet? When would you use them?**

> WeakMap/WeakSet hold weak references — ‼️their keys/values can be garbage collected if no other reference exists. ‼️They are not iterable. Use WeakMap for: storing metadata about DOM nodes or objects without preventing GC (e.g., caching computed values keyed by object reference, without memory leaks).

---

## React (10 questions)

**Q11. How does React's reconciliation algorithm work?**

> React builds a virtual DOM (‼️plain JS objects). On re-render, it diffs the new tree against the previous one (reconciliation). It uses heuristics: different element types → rebuild subtree; same type → update props. The `key` prop lets React identify which items changed in lists — without keys, React re-renders by position which causes bugs.

**Q12. When does a React component re-render?**

> 1. Its own state changes. 2. Its parent re-renders (unless memoised). 3. A context it consumes changes. 4. A hook it uses triggers a re-render. `React.memo` wraps a component to skip re-render if props haven't changed (‼️shallow compare). `useMemo` and `useCallback` memoize values and functions to stabilise references.

**Q13. Explain useEffect — when does it run? What is the cleanup function?**

> `useEffect(fn, deps)` ‼️ runs after paint on mount and after every render where a dep changed. No dep array: runs after every render. Empty array: runs once on mount. The cleanup function (returned from fn) runs before the next effect and on unmount — use it to cancel fetches, clear timers, remove event listeners.

**Q14. What is the difference between useMemo and useCallback?**

> `useMemo(fn, deps)` memoises the return value of fn. `useCallback(fn, deps)` memoises the function reference itself. Both prevent unnecessary recalculation/re-creation on re-render. ‼️`useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`. Use them when passing callbacks to memoised children or as dependency of other hooks.

**Q15. What are React Server Components?**

> ‼️Server Components render on the server — their output is a serialised UI description sent to the client. They can directly access databases, file systems, and secrets. ‼️They have zero JS bundle impact. They cannot use state, effects, or browser APIs. Client Components (marked `'use client'`) work like traditional React. ‼️The split allows mixing server and client rendering in the same tree.

**Q16. Explain the useReducer hook and when you'd use it over useState.**

> `useReducer(reducer, initialState)` manages complex state with a pure function: ‼️`(state, action) => newState`. Use it over useState when: multiple related state variables that update together, next state depends on previous in complex ways, you want to centralise state logic (easier to test the reducer). Similar to Redux but local to a component.

**Q17. What is a custom hook? Write one.**

> A custom hook is a function starting with `use` that composes React hooks. It lets you extract and reuse stateful logic between components ‼️without changing the component tree.

```ts
function useDebounce<T>(value: T, ms: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(timer);
    }, [value, ms]);
    return debounced;
}
```

**Q18. How would you optimise a React app that's rendering slowly?**

> 1. Profile with React DevTools — identify what's re-rendering and why. 2. `React.memo` on expensive components. 3. `useMemo`/`useCallback` to stabilise props. 4. Virtualise long lists (react-window). 5. Code-split with `React.lazy` + Suspense. 6. Move state down — don't lift state higher than needed. 7. Check for unnecessary context consumers.

**Q19. What is React Suspense and what can it do?**

> ‼️Suspense lets components wait for something before rendering, showing a fallback in the meantime. Originally for lazy-loaded components (`React.lazy`). ‼️In React 18+: also handles data fetching (via frameworks like Next.js, TanStack Query's `suspense: true`). Works with Server Components for streaming HTML. Concurrent mode features (transitions, `useDeferredValue`) integrate with Suspense.

**Q20. What problem does the key prop solve in lists?**

> Without stable keys, React identifies list items by position. If you insert at the beginning, React thinks every item changed → re-renders all. With unique, stable keys (not array index for reorderable lists), React tracks which specific item moved, was added, or was removed — updating only what changed. Index as key is fine for static, non-reorderable lists.

---

## TypeScript (5 questions)

**Q21. What is the difference between `type` and `interface` in TypeScript?**

> Both define object shapes. `interface` is open — can be merged/extended with `extends` and declaration merging. `type` is closed — can express unions, intersections, conditional types, and mapped types that interfaces cannot. Prefer `interface` for public APIs (extendable), `type` for complex compositions and union types.

**Q22. What are generics and why are they useful?**

> Generics let you write type-safe code that works with multiple types without sacrificing type information. ‼️Like a variable for types. `function identity(val: T): T` preserves the specific type through the function. Enables reusable, type-safe data structures (Array, Map) and utilities (Pick).

**Q23. What is a discriminated union? When would you use it?**

> A union where each member has a common literal field (the discriminant) that narrows the type in switch statements. TypeScript gives exhaustiveness checking — add a new union member without handling it → compile error.

```ts
type Shape = { kind: 'circle'; r: number } | { kind: 'rect'; w: number; h: number };
function area(s: Shape) {
    switch (s.kind) {
        case 'circle':
            return Math.PI * s.r ** 2;
        case 'rect':
            return s.w * s.h;
    }
}
```

**Q24. What is `unknown` vs `any`?**

> ‼️Both accept any value. `any` disables type checking — you can call methods, access properties freely. `unknown` is the type-safe alternative — ‼️you must narrow it before using it (typeof, instanceof, type guard). ‼️Use `unknown` for data from external sources (API responses, JSON.parse) and narrow before use. Avoid `any`.

**Q25. What is `keyof` and how do you use it?**

> `keyof T` produces a union of string/symbol keys of type T. Used to constrain parameters to valid keys.

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]; // type-safe — T[K] is the exact type of that property
}
const name = getProperty({ name: 'Alice', age: 30 }, 'name'); // string
```

---

## System Design (5 questions)

**Q26. How would you design a URL shortener?**

> Requirements: shorten URL, redirect, analytics optional. Short code: base62-encoded auto-increment ID. DB: `shortcodes(code, original_url, created_at, user_id)`. Cache hot codes in Redis (20% codes = 80% traffic). ‼️Redirect: 301 (browser caches) vs 302 (tracks every click). Scale: read-heavy → multiple replicas, heavy Redis cache, CDN for redirect responses.

**Q27. How do you scale a database when it becomes a bottleneck?**

> 1. Add read replicas — primary handles writes, replicas serve reads. 2. Add caching layer (Redis) for hot data. 3. Shard horizontally by hash(user_id) % N for even distribution. 4. Denormalise to avoid expensive joins. 5. Add connection pool (PgBouncer). 6. Async heavy writes via queue. 7. Partition tables by time for time-series data.

**Q28. What is consistent hashing and why is it used?**

> Nodes placed on a hash ring (0 to 2^32). A key routes to the nearest node clockwise. Adding/removing a node only remaps 1/N of keys (vs modulo which remaps most keys). Virtual nodes give even distribution. Used by Cassandra, DynamoDB, distributed caches. Solves the resharding problem when adding cache nodes.

**Q29. How would you design a notification system?**

> ‼️Producer publishes events (order placed, message received) to a topic/queue. ‼️Notification service consumes, determines channels (push, email, SMS) per user preference. ‼️Fan-out: one event → multiple notifications. Use: Kafka for high-throughput event streaming, worker pool for delivery. Handle failures: DLQ for failed deliveries, exponential retry. Rate-limit per user (no spam).

**Q30. What's the difference between SQL and NoSQL? How do you choose?**

> SQL: fixed schema, ACID, joins, complex queries, vertical scaling. NoSQL: flexible schema, horizontal scaling, eventual consistency, limited query patterns. Choose SQL when: complex relationships, transactions, ad-hoc queries. Choose NoSQL when: massive write scale (Cassandra), flexible/varying schema (MongoDB), simple key-value (Redis), global distribution.

---

## Node.js & Backend (5 questions)

**Q31. Explain the Node.js event loop phases.**

> 6 phases: timers (setTimeout/setInterval), pending callbacks (I/O from prev iteration), idle/prepare (internal), poll (wait for I/O, execute callbacks), check (setImmediate), close callbacks. Microtasks (nextTick, Promises) drain after each phase. nextTick has higher priority than Promise microtasks.

**Q32. When would you use worker threads vs child_process in Node.js?**‼️

> ‼️Worker threads: CPU-intensive JS (crypto, image processing, ML) — share memory via SharedArrayBuffer, low overhead. ‼️child_process: shell commands or separate Node processes needing isolation — separate memory, communicate via IPC/stdin. ‼️For HTTP servers: cluster module (multiple processes sharing a port) or modern alternative: run multiple containers.

**Q33. What is middleware in Express and how does it work?**

> Middleware is a function `(req, res, next)`. Calling `next()` passes to the next middleware. Calling `next(err)` skips to error-handling middleware. Used for: logging, auth, body parsing, rate limiting, error handling. Executed in the order they are registered. App-level vs router-level vs error-handling (4 params).

**Q34. How do you handle errors in an async Express route?**

> ‼️Without a wrapper, `async` route errors don't trigger the error middleware. Solutions: 1. Wrap with `try/catch` and call `next(err)`. 2. Use a wrapper utility: `const asyncHandler = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next)`. 3. In Express 5 (async routes natively supported). Always have a global error handler: `app.use((err, req, res, next) => ...)`.

**Q35. What is the difference between authentication and authorisation?**

> Authentication (AuthN): verifying who you are (login with password, token verification). Authorisation (AuthZ): verifying what you're allowed to do (role check, permission check). Auth happens first, then authz. Example: JWT verifies your identity (authn); checking your role is 'admin' before deleting a resource is authz.

---

## Databases (5 questions)

**Q36. What is an index and when would you NOT add one?**

> An index (typically B-tree) speeds up reads ‼️by pre-sorting data. Avoid when: write-heavy table (every write updates all indexes), low-cardinality column (boolean — full scan is faster), small table (overhead > benefit), column rarely queried. Always index: primary key, foreign keys, columns frequently in WHERE/JOIN/ORDER BY with high selectivity.

**Q37. What is the N+1 query problem and how do you fix it?**

> Fetching N records then making N additional queries for related data. 1 query to get posts + N queries to get each post's author = N+1. Fix: JOIN in a single query, or ‼️eager load (ORM `include`), or two queries + manual join (load all related IDs in one query, map in application code). Also: DataLoader for GraphQL (batching + deduplication).

**Q38. Explain ACID.**

> Atomicity: all operations in a transaction succeed or all fail. Consistency: DB transitions between valid states only (constraints respected). ‼️Isolation: concurrent transactions don't see each other's intermediate state (configurable via isolation levels). ‼️Durability: committed transactions survive crashes (WAL/redo log). NoSQL often sacrifices ACID for scale.

**Q39. What is a database transaction and what isolation level would you use?**

> A transaction groups operations that must succeed or fail atomically. Isolation levels (most → least strict): Serializable (no anomalies), Repeatable Read (MySQL default — no dirty/non-repeatable reads), Read Committed (Postgres default — no dirty reads), Read Uncommitted. For most web apps: Read Committed + SELECT FOR UPDATE for critical sections.

**Q40. How do you do a zero-downtime database migration?**‼️

> Expand-Contract pattern: 1. Add new column (nullable, no constraint). 2. Deploy code that writes to both old and new column. 3. Backfill old rows. 4. Deploy code that reads from new column. 5. Remove old column. Never: rename a column in one step (breaks running code), add a NOT NULL column without a default (table lock), drop a column before code that reads it is gone.

---

## Behavioural (10 questions)

**Q41. Tell me about yourself.**

> Keep it to 90 seconds: current role + impact → what you're looking for → why this company. End with a hook for them to ask about. Practice until it sounds natural, not rehearsed.

**Q42. Tell me about a technically challenging project.**

> STAR format. Focus on your specific contribution, the technical decision you made, why you made it over alternatives, and the measurable outcome. Have one story ready that involves a hard architectural or performance problem.

**Q43. Tell me about a time you disagreed with a technical decision.**

> Show: you raised the concern with data/reasoning, you listened to the other view, you either convinced them or committed to the decision once made. Never: "I just did what I was told" or "I was right and they were wrong."

**Q44. Tell me about a time you failed.**

> Own the failure fully. Explain what you learned. Show how you changed behaviour after. Interviewers want self-awareness and growth, not perfection.

**Q45. How do you handle tight deadlines?**

> Break down work, identify critical path, cut scope (not quality) with stakeholder agreement, communicate proactively when at risk, deliver something working over something incomplete. Give a concrete example.

**Q46. How do you stay current with technology?**

> Be specific: sources you actually use (TC39 proposals, React RFC, Kent C. Dodds, Theo, The Primeagen, specific newsletters, open source PRs). Don't say "I read blogs" — name them. Also: side projects, contributing to OSS, building things to learn.

**Q47. Why do you want to leave your current job?**

> Frame positively — what you're moving toward, not running from. Examples: want to work at greater scale, want more ownership, excited by this company's mission/tech, want to grow in a specific area.

**Q48. Where do you see yourself in 5 years?**

> Be honest but link to the role. Common: "I want to be a strong senior/staff engineer, deepening in [X area], ideally leading technical direction on impactful projects." Shows ambition without unrealistic expectations.

**Q49. Do you have any questions for us?**

> Always have 3–5 prepared (see INTERVIEW-DAY-CHECKLIST.md). Never say "no, I think you covered everything." Asking good questions signals genuine interest and gives you real info to evaluate the offer.

**Q50. What are your salary expectations?**

> Don't anchor first if you can help it. "I'm flexible depending on the total compensation package — could you share the band for this role?" If pushed: give a range based on research (levels.fyi, Glassdoor, Blind, LinkedIn Salary). Make the bottom of your range your actual minimum — they often land there.
