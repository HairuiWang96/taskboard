# Modern JavaScript — Senior Developer Deep Reference

> Covers the language deeply: execution model, closures, async, prototypes, modern syntax, and interview-level topics.

---

## Table of Contents

1. [Execution Model & Event Loop](#1-execution-model--event-loop)
2. [Scope, Closures & Hoisting](#2-scope-closures--hoisting)
3. [Prototypes & Inheritance](#3-prototypes--inheritance)
4. [this keyword](#4-this-keyword)
5. [Async JavaScript](#5-async-javascript)
6. [Iterators & Generators](#6-iterators--generators)
7. [Modules (ESM)](#7-modules-esm)
8. [Destructuring & Spread](#8-destructuring--spread)
9. [Modern Syntax Deep Cuts](#9-modern-syntax-deep-cuts)
10. [Error Handling](#10-error-handling)
11. [Memory & Performance](#11-memory--performance)
12. [Functional Patterns](#12-functional-patterns)
13. [Proxy & Reflect](#13-proxy--reflect)
14. [Common Interview Questions](#14-common-interview-questions)
15. [Cross-Browser Compatibility](#15-cross-browser-compatibility)
16. [Race Conditions in Async JavaScript](#16-race-conditions-in-async-javascript)

---

## 1. Execution Model & Event Loop

### The single-threaded model

```text
JavaScript is single-threaded: one call stack, one thing at a time.
Yet it handles async (network, timers, I/O) without blocking.
This is the event loop's job.

The runtime has:
  Call stack:      where function calls execute (LIFO)
  Heap:            unstructured memory where objects live
  Web APIs:        browser/Node APIs (setTimeout, fetch, fs)
  Micro-task queue: Promises, queueMicrotask, MutationObserver
  Macro-task queue: setTimeout, setInterval, I/O callbacks, MessageChannel
  Event loop:      watches the stack, drains queues when stack is empty
```

### Execution order — critical to know

```js
console.log('1'); // synchronous

setTimeout(() => console.log('2'), 0); // macro-task (even with 0ms delay)

Promise.resolve().then(() => console.log('3')); // micro-task

queueMicrotask(() => console.log('4')); // micro-task

console.log('5'); // synchronous

//! Output: 1, 5, 3, 4, 2
// Rule: sync → all micro-tasks → one macro-task → all micro-tasks → next macro-task
```

### Why micro-tasks run before macro-tasks

```js
// Each macro-task (setTimeout callback) runs completely
// Then ALL micro-tasks are drained before the next macro-task

setTimeout(() => {
    console.log('macro');
    Promise.resolve().then(() => console.log('micro inside macro'));
}, 0);

// Output: macro, micro inside macro
// The micro-task created inside the macro runs before any OTHER macro-task

// Real implication: long chains of .then() can starve I/O callbacks
Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());
// ... 1000 levels deep
// All run before the next setTimeout fires
```

### Node.js event loop phases

```text
Node.js has more phases than browser:

1. timers:        setTimeout, setInterval callbacks due
2. pending I/O:   I/O callbacks deferred to next iteration
3. idle, prepare: internal
4. poll:          retrieve new I/O events, execute I/O callbacks
5. check:         setImmediate callbacks
6. close:         socket.on('close') callbacks

Between each phase: process.nextTick() and Promise micro-tasks drain
process.nextTick() runs before Promise micro-tasks

setImmediate vs setTimeout(fn, 0):
  In main module: order is non-deterministic
  Inside I/O callback: setImmediate always runs first
```

---

## 2. Scope, Closures & Hoisting

### Scope chain

```js
// Each function creates a new scope
// Inner functions can access outer variables (scope chain)
// Outer functions CANNOT access inner variables

const outer = 'I am outer';

function parent() {
    const mid = 'I am mid';

    function child() {
        const inner = 'I am inner';
        console.log(outer); // ✓ via scope chain
        console.log(mid); // ✓ via scope chain
    }

    child();
    console.log(inner); // ✗ ReferenceError — inner is not in parent's scope
}
```

### var vs let vs const

```js
// var — function-scoped, hoisted to function top, initialized as undefined
function example() {
    console.log(x); // undefined (hoisted, not error)
    var x = 5;
    console.log(x); // 5
}

// var in loops — the classic bug
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0); // prints 3, 3, 3 — all share the same i
}

// let/const — block-scoped, hoisted but NOT initialized (temporal dead zone)
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 5;

for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0); // prints 0, 1, 2 — each iteration has own i
}

// const — same as let but binding cannot be reassigned
const obj = { a: 1 };
obj.a = 2; // ✓ mutating the object is fine
obj = {}; // ✗ TypeError: cannot reassign a const
```

### Hoisting in detail

```js
// Function DECLARATIONS are fully hoisted (definition, not just name)
hello(); // ✓ works
function hello() {
    console.log('hi');
}

// Function EXPRESSIONS are NOT (only the variable is hoisted, as undefined)
greet(); // ✗ TypeError: greet is not a function
var greet = function () {
    console.log('hi');
};

// Class declarations are hoisted but in TDZ (like let)
const obj = new Foo(); // ✗ ReferenceError
class Foo {}
```

### Closures

```js
// A closure = function + its surrounding lexical scope
// The function "remembers" the variables from where it was DEFINED

function makeCounter(initial = 0) {
    let count = initial; // captured in closure

    return {
        increment: () => ++count,
        decrement: () => --count,
        value: () => count,
    };
}

const counter = makeCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.value(); // 12
// count is private — can't access it directly

// Practical use: partial application
function multiply(factor) {
    return number => number * factor; // closes over 'factor'
}

const double = multiply(2);
const triple = multiply(3);
double(5); // 10
triple(5); // 15

// Module pattern (pre-ESM)
const bankAccount = (() => {
    let balance = 0; // private
    return {
        deposit: n => {
            balance += n;
        },
        withdraw: n => {
            if (n <= balance) balance -= n;
        },
        getBalance: () => balance,
    };
})(); // IIFE — Immediately Invoked Function Expression
```

---

## 3. Prototypes & Inheritance

### The prototype chain

```js
// Every object has an internal [[Prototype]] link
// Property lookup walks up the chain until found or null reached

const animal = {
    breathe() {
        return 'breathing';
    },
};

const dog = Object.create(animal); // dog's [[Prototype]] = animal
dog.bark = function () {
    return 'woof';
};

dog.bark(); // found on dog itself
dog.breathe(); // not on dog → walk chain → found on animal
dog.toString(); // not on dog → not on animal → found on Object.prototype

// prototype chain: dog → animal → Object.prototype → null

Object.getPrototypeOf(dog) === animal; // true
dog.hasOwnProperty('bark'); // true
dog.hasOwnProperty('breathe'); // false (it's on the prototype)
```

### Classes (syntactic sugar over prototypes)

```js
class Animal {
    #name; // private field (ES2022)

    constructor(name) {
        this.#name = name;
    }

    speak() {
        return `${this.#name} makes a sound`;
    }

    get name() {
        return this.#name;
    } // getter

    static create(name) {
        return new Animal(name);
    } // static method
}

class Dog extends Animal {
    #breed;

    constructor(name, breed) {
        super(name); // must call super before using this
        this.#breed = breed;
    }

    speak() {
        return `${super.speak()} — specifically, woof`; // call parent method
    }
}

const dog = new Dog('Rex', 'Husky');

// Under the hood:
// Dog.prototype.__proto__ === Animal.prototype
// dog.__proto__ === Dog.prototype
```

### Object.create vs new vs Object.assign

```js
// Object.create: explicit prototype control
const proto = {
    greet() {
        return 'hello';
    },
};
const obj = Object.create(proto); // obj's prototype = proto
const empty = Object.create(null); // no prototype at all (no toString etc.)

// Object.assign: shallow copy / mixin
const target = { a: 1 };
const result = Object.assign(target, { b: 2 }, { c: 3 });
// result = target = { a: 1, b: 2, c: 3 } — mutates target!

// Spread for immutable version
const merged = { ...obj1, ...obj2 }; // new object, doesn't mutate

// Shallow vs deep copy
const shallow = { ...original }; // nested objects still shared
const deep = structuredClone(original); // ES2022 deep clone (most cases)
const deepOld = JSON.parse(JSON.stringify(original)); // loses: functions, Date, undefined
```

---

## 4. this keyword

```js
// 'this' refers to the execution context, not where the function is defined
// (except arrow functions — they capture 'this' from definition site)

// 1. Method call: this = the object before the dot
const obj = {
    name: 'Alice',
    greet() {
        return this.name;
    },
};
obj.greet(); // 'Alice'

// 2. Function call (non-strict): this = global (window/global)
// In strict mode ('use strict') or ESM: this = undefined
function standalone() {
    return this;
}
standalone(); // window (sloppy) or undefined (strict)

// 3. Constructor call (new): this = new object
function Person(name) {
    this.name = name;
}
const p = new Person('Bob'); // this = new Person instance

// 4. Explicit binding
function greet() {
    return this.name;
}
greet.call({ name: 'Alice' }); // call: invoke now with this
greet.apply({ name: 'Alice' }, []); // apply: same but args as array
const bound = greet.bind({ name: 'Alice' }); // bind: returns new function, doesn't call
bound();

// 5. Arrow functions: lexical this (inherits from surrounding scope)
const obj2 = {
    name: 'Alice',
    greet() {
        const inner = () => this.name; // this = obj2 (arrow, captured from greet)
        return inner();
    },
    broken() {
        function inner() {
            return this.name;
        } // this = undefined (regular function)
        return inner();
    },
};

// Classic problem: losing 'this' in callbacks
class Timer {
    constructor() {
        this.count = 0;
    }

    start() {
        // ✗ 'this' lost — setInterval callback is a regular function
        setInterval(function () {
            this.count++;
        }, 1000); // this = undefined

        // ✓ Arrow function preserves outer 'this'
        setInterval(() => {
            this.count++;
        }, 1000); // this = Timer instance
    }
}
```

---

## 5. Async JavaScript

### Promises in depth

```js
// Promise: a proxy for a value not yet known
// States: pending → fulfilled OR rejected (irreversible)

const p = new Promise((resolve, reject) => {
    // executor runs synchronously
    setTimeout(() => resolve('done'), 1000);
    // reject(new Error('failed')) — can also reject
});

// .then() returns a NEW promise — enables chaining
p.then(value => value.toUpperCase()) // transform the value
    .then(value => console.log(value)) // receive transformed value
    .catch(err => console.error(err)) // catches ANY rejection up the chain
    .finally(() => cleanup()); // always runs, passes through value/error

// Promise combinators
Promise.all([p1, p2, p3]); // waits for ALL — fails fast on first rejection
Promise.allSettled([p1, p2, p3]); // waits for ALL — never rejects, gives status of each
Promise.race([p1, p2, p3]); // resolves/rejects with FIRST to settle
Promise.any([p1, p2, p3]); // resolves with FIRST success, rejects if ALL fail

// Promise.all example
const [user, posts, comments] = await Promise.all([fetchUser(id), fetchPosts(id), fetchComments(id)]);
// Runs all three in parallel — much faster than sequential awaits
```

### async/await deep cuts

```js
// async function always returns a Promise
// await unwraps a Promise (can only be used inside async function or top-level module)

async function fetchUser(id) {
    const res = await fetch(`/api/users/${id}`); // pauses here, other code runs
    if (!res.ok) throw new Error(`HTTP ${res.status}`); // throw rejects the async fn's promise
    return res.json(); // return value becomes resolved value
}

// Sequential vs parallel
// ✗ Sequential — waits for each before starting next
const user = await fetchUser(1); // 300ms
const posts = await fetchPosts(); // 200ms after user resolves
// Total: 500ms

// ✓ Parallel — start both, await both
const [user, posts] = await Promise.all([fetchUser(1), fetchPosts()]); // 300ms total

// await in loops — tricky
// ✗ This runs sequentially (each await blocks the loop)
for (const id of ids) {
    await processItem(id); // one at a time
}

// ✓ Parallel with Promise.all
await Promise.all(ids.map(id => processItem(id)));

// ✓ Controlled concurrency (not all at once)
import pLimit from 'p-limit';
const limit = pLimit(3); // max 3 concurrent
await Promise.all(ids.map(id => limit(() => processItem(id))));

// Top-level await (ESM modules only)
const config = await fetch('/config.json').then(r => r.json());
export { config }; // other modules get resolved value
```

### AbortController

```js
// Cancel fetch requests (and other async operations)
const controller = new AbortController();

const fetchData = async () => {
    try {
        const res = await fetch('/api/data', { signal: controller.signal });
        return await res.json();
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Fetch cancelled');
            return null;
        }
        throw err; // re-throw non-abort errors
    }
};

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

// Cancel on cleanup (React pattern)
useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
}, []);
```

---

## 6. Iterators & Generators

### Iterators

```js
// An iterator has a .next() method returning { value, done }
// An iterable has [Symbol.iterator]() that returns an iterator

// Custom iterable
const range = {
    from: 1,
    to: 5,
    [Symbol.iterator]() {
        let current = this.from;
        const last = this.to;
        return {
            next() {
                return current <= last ? { value: current++, done: false } : { value: undefined, done: true };
            },
        };
    },
};

for (const n of range) {
    console.log(n);
} // 1, 2, 3, 4, 5
[...range]; // [1, 2, 3, 4, 5]
```

### Generators

```js
// Generator: function that can pause and resume
// function* returns a generator object (which is both iterator and iterable)

function* count() {
    yield 1; // pause, return 1
    yield 2; // pause, return 2
    yield 3; // pause, return 3
}

const gen = count();
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 2, done: false }
gen.next(); // { value: 3, done: false }
gen.next(); // { value: undefined, done: true }

// Infinite sequence
function* naturals() {
    let n = 1;
    while (true) yield n++;
}

const nat = naturals();
[...Array(5)].map(() => nat.next().value); // [1, 2, 3, 4, 5]

// Generator with return value passing
function* adder() {
    let sum = 0;
    while (true) {
        const val = yield sum; // yield sends sum out, receives next .next(val) call's arg
        sum += val ?? 0;
    }
}

const add = adder();
add.next(); // { value: 0 } — start
add.next(10); // { value: 10 }
add.next(5); // { value: 15 }

// Async generators (very powerful for streaming)
async function* streamLines(url) {
    const res = await fetch(url);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value);
    }
}

for await (const chunk of streamLines('/api/stream')) {
    console.log(chunk);
}
```

---

## 7. Modules (ESM)

```js
// Named exports
export const PI = 3.14159;
export function add(a, b) { return a + b; }
export class Vector { ... }

// Default export (one per file)
export default function main() { ... }

// Import
import { PI, add } from './math.js';
import defaultExport from './module.js';
import * as Math from './math.js'; // namespace import
import { add as sum } from './math.js'; // rename

// Dynamic import (lazy loading — returns a Promise)
const module = await import('./heavy-module.js');
// Only load when needed — great for code splitting

// Conditional dynamic import
if (user.isAdmin) {
  const { AdminPanel } = await import('./AdminPanel.js');
}
```

### ESM vs CommonJS

```js
// CommonJS (Node.js original) — synchronous
const path = require('path');
module.exports = { add };

// ESM — asynchronous, static analysis (enables tree-shaking)
import path from 'path';
export { add };

// Key differences:
// ESM: top-level await, strict mode by default, static imports (analyzed at parse time)
// CJS: dynamic require() can be inside conditions/functions
// ESM is the future — Node.js supports it natively with .mjs or "type": "module"

// Interop: ESM can import CJS, CJS cannot require ESM
// (CJS require is sync, ESM modules may have async initialization)
```

---

## 8. Destructuring & Spread

```js
// Array destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first=1, second=2, rest=[3,4,5]

// Skip elements
const [, second, , fourth] = [1, 2, 3, 4];

// Default values
const [a = 10, b = 20] = [1]; // a=1, b=20 (b not in array)

// Swap without temp variable
let x = 1, y = 2;
[x, y] = [y, x]; // x=2, y=1

// Object destructuring
const { name, age, address: { city } } = user;
// Rename
const { name: userName } = user; // userName, not name
// Default
const { role = 'user' } = user;
// Rest
const { id, ...rest } = user; // rest has everything except id

// In function parameters (very common in React)
function Component({ title, children, className = '' }) { ... }

// Nested
const { data: { users: [firstUser] } } = response;
```

### Spread operator

```js
// Arrays
const combined = [...arr1, ...arr2];
const copy = [...original]; // shallow copy
const withNew = [...items, newItem]; // append without mutation

// Objects
const updated = { ...user, name: 'New Name' }; // shallow merge, last wins
const { password, ...publicUser } = user; // remove a property immutably

// Function calls
Math.max(...numbers); // spread array as arguments

// Spread vs Object.assign
// Both are shallow — nested objects are still shared references
const a = { x: { y: 1 } };
const b = { ...a };
b.x.y = 2; // also mutates a.x.y!
// Use structuredClone(a) for deep copy
```

---

## 9. Modern Syntax Deep Cuts

### Optional chaining & nullish coalescing

```js
// Optional chaining — short-circuits to undefined on null/undefined
const city = user?.address?.city; // no TypeError if address is null
const firstTag = post?.tags?.[0];
const result = obj?.method?.();

// vs: const city = user && user.address && user.address.city; (old way)

// Nullish coalescing — only falls back on null or undefined (not 0, '', false)
const name = user.name ?? 'Anonymous';
// vs || which falls back on ANY falsy value (including 0 and '')
const count = data.count ?? 0; // correct — data.count might legitimately be 0
const count2 = data.count || 0; // wrong if count = 0

// Nullish assignment
user.name ??= 'Anonymous'; // only assigns if user.name is null/undefined
user.count ||= 0; // assigns if user.count is falsy (0 triggers this!)
user.list &&= user.list.filter(Boolean); // only assigns if user.list is truthy
```

### Tagged template literals

```js
// Tag function: processes template literal before interpolation
function highlight(strings, ...values) {
    return strings.reduce((result, str, i) => result + str + (values[i] !== undefined ? `<mark>${values[i]}</mark>` : ''), '');
}

const name = 'Alice';
const age = 30;
highlight`Name: ${name}, Age: ${age}`;
// "Name: <mark>Alice</mark>, Age: <mark>30</mark>"

// Real-world uses:
// sql`SELECT * FROM users WHERE id = ${userId}` — safe parameterized queries
// html`<div>${content}</div>` — sanitized HTML
// css`color: ${color};` — CSS-in-JS (styled-components uses this)
// gql`query { users { name } }` — GraphQL queries
```

### Symbol

```js
// Symbol: unique, non-enumerable primitive — great for meta-programming

const id = Symbol('id'); // description is just for debugging
const id2 = Symbol('id');
id === id2; // false — every Symbol is unique

const user = {
    name: 'Alice',
    [id]: 123, // Symbol key — not visible in for..in, JSON.stringify, Object.keys
};

user[id]; // 123
Object.keys(user); // ['name'] — Symbol not included
JSON.stringify(user); // '{"name":"Alice"}' — Symbol excluded

// Well-known Symbols — customize built-in behavior
class MyArray {
    [Symbol.iterator]() {
        /* custom iteration */
    }
}

class Dog {
    get [Symbol.toStringTag]() {
        return 'Dog';
    }
}
Object.prototype.toString.call(new Dog()); // '[object Dog]'

// Symbol.for — global symbol registry (same key = same symbol)
const s1 = Symbol.for('app.id');
const s2 = Symbol.for('app.id');
s1 === s2; // true — unlike Symbol()
```

### WeakMap & WeakSet

```js
// WeakMap: keys must be objects, doesn't prevent garbage collection
// vs Map: holds strong references — objects can't be GC'd while in Map

// Use case: private data per object, without memory leaks
const _private = new WeakMap();

class Person {
    constructor(name) {
        _private.set(this, { name }); // tied to this instance
    }
    getName() {
        return _private.get(this).name;
    }
}

// When the Person instance is GC'd, the WeakMap entry is also freed
// With a regular Map: the entry would remain forever → memory leak

// Use case: caching computed results
const cache = new WeakMap();
function compute(obj) {
    if (cache.has(obj)) return cache.get(obj);
    const result = expensiveOperation(obj);
    cache.set(obj, result);
    return result;
}
// Cache automatically freed when obj is GC'd

// WeakSet: set of objects, weak references (useful for tracking "visited" objects)
const visited = new WeakSet();
function processOnce(obj) {
    if (visited.has(obj)) return;
    visited.add(obj);
    doWork(obj);
}
```

---

## 10. Error Handling

```js
// Error types
new Error('message')           // generic
new TypeError('not a string')  // wrong type
new RangeError('out of range') // value out of valid range
new SyntaxError('bad syntax')  // parse error
new ReferenceError('x is not defined')

// Custom errors
class ApiError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    // Fix: ensure instanceof works correctly across bundlers
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Catch specific error types
try {
  const data = JSON.parse(input);
} catch (err) {
  if (err instanceof SyntaxError) {
    console.error('Invalid JSON:', err.message);
  } else {
    throw err; // re-throw unexpected errors
  }
}

// Never swallow errors silently
try { ... } catch (err) { } // ✗ — something failed and you'll never know

// Async error handling
// Unhandled promise rejection (crashes Node.js process)
Promise.reject(new Error('oops')); // ✗ no .catch()

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Result pattern (no exceptions in normal flow)
type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

async function safeRead(path: string): Promise<Result<string>> {
  try {
    const data = await fs.readFile(path, 'utf8');
    return { ok: true, value: data };
  } catch (err) {
    return { ok: false, error: err as Error };
  }
}
```

---

## 11. Memory & Performance

### Garbage collection

```text
V8 uses generational garbage collection:
  Young generation (nursery): new, short-lived objects — GC frequently (minor GC)
  Old generation: objects that survived young GC — GC infrequently (major GC)

Mark and sweep:
  1. Mark: start from roots (global, stack), traverse all reachable objects
  2. Sweep: free anything not marked

Common memory leak causes:
  - Global variables accumulating data
  - Event listeners not removed
  - Closures holding large objects longer than needed
  - Timers (setInterval) not cleared
  - Detached DOM nodes still referenced in JS
```

### Identifying leaks

```js
// Chrome DevTools: Memory tab → Heap snapshot
// Take snapshot → interact → take another → compare
// Look for: objects that grew, detached DOM nodes

// Node.js
process.memoryUsage();
// { rss, heapTotal, heapUsed, external }
// Watch heapUsed — if it keeps growing and never drops, you have a leak

// Weak references to avoid leaks
const ref = new WeakRef(heavyObject); // doesn't prevent GC
const obj = ref.deref(); // may return undefined if GC'd
if (obj) {
    /* use it */
}
```

### V8 optimizations

```js
// V8 optimizes functions it sees as "hot" (called many times)
// It assumes types are stable — de-optimizes if types change

// ✗ V8 struggles with this — obj's shape changes
function processItem(item) {
    if (someCondition) item.extra = true; // adds property sometimes
}

// ✓ Initialize all properties in constructor — stable shape (hidden class)
class Item {
    constructor() {
        this.name = '';
        this.value = 0;
        this.extra = false; // even if usually false — consistent shape
    }
}

// Avoid: delete obj.property — changes shape, de-optimizes
// Instead: set to null/undefined

// Monomorphic function (one type) — V8 optimizes well
function add(a, b) {
    return a + b;
}
add(1, 2); // V8 assumes numbers
add(1, 2); // confirms

// Polymorphic (multiple types) — harder to optimize
add(1, 2);
add('a', 'b'); // now V8 must handle multiple cases
```

---

## 12. Functional Patterns

### Pure functions & immutability

```js
// Pure function: same input always → same output, no side effects
const add = (a, b) => a + b; // pure

// Impure: depends on external state or has side effects
let total = 0;
const addToTotal = n => {
    total += n;
}; // impure — mutates external state

// Immutable update patterns
// Array
const withItem = [...arr, newItem]; // add
const without = arr.filter(x => x !== id); // remove
const updated = arr.map(x => (x.id === id ? { ...x, done: true } : x)); // update

// Object
const updated = { ...obj, name: 'new' }; // add/update
const { key, ...rest } = obj; // remove key
```

### Higher-order functions

```js
// Function that takes or returns a function

// Map, filter, reduce — know these cold
const numbers = [1, 2, 3, 4, 5];

numbers.map(n => n * 2); // [2, 4, 6, 8, 10]
numbers.filter(n => n % 2 === 0); // [2, 4]
numbers.reduce((acc, n) => acc + n, 0); // 15

// Reduce to group
const grouped = users.reduce((acc, user) => {
    const key = user.role;
    return { ...acc, [key]: [...(acc[key] ?? []), user] };
}, {});

// Compose and pipe
const compose =
    (...fns) =>
    x =>
        fns.reduceRight((v, f) => f(v), x);
const pipe =
    (...fns) =>
    x =>
        fns.reduce((v, f) => f(v), x);

const process = pipe(
    trim, // runs first
    toLowerCase,
    removeSpecialChars,
);
process('  Hello, World!  '); // 'hello world'
```

### Currying & partial application

```js
// Curry: transform f(a, b, c) → f(a)(b)(c)
const curry = fn => {
    const arity = fn.length;
    return function curried(...args) {
        if (args.length >= arity) return fn(...args);
        return (...more) => curried(...args, ...more);
    };
};

const add = curry((a, b, c) => a + b + c);
add(1)(2)(3); // 6
add(1, 2)(3); // 6
add(1)(2, 3); // 6

// Partial application: fix some arguments
const multiply = (a, b) => a * b;
const double = multiply.bind(null, 2);
const triple = multiply.bind(null, 3);
double(5); // 10

// Real use: event handlers with data
const handleDelete = id => event => deleteItem(id);
<button onClick={handleDelete(item.id)}>Delete</button>;
```

### Memoization

```js
function memoize(fn) {
    const cache = new Map();
    return function (...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

const expensiveCalc = memoize(n => {
    // slow computation
    return n * n;
});

expensiveCalc(10); // computed
expensiveCalc(10); // from cache
```

---

## 13. Proxy & Reflect

```js
// Proxy: intercept operations on an object
const handler = {
    get(target, prop, receiver) {
        console.log(`Getting ${prop}`);
        return Reflect.get(target, prop, receiver); // default behavior
    },
    set(target, prop, value, receiver) {
        if (typeof value !== 'number') throw new TypeError('Must be a number');
        return Reflect.set(target, prop, value, receiver);
    },
    has(target, prop) {
        return prop in target;
    },
    deleteProperty(target, prop) {
        console.log(`Deleting ${prop}`);
        return Reflect.deleteProperty(target, prop);
    },
};

const obj = new Proxy({}, handler);
obj.count = 5; // triggers set
obj.count; // triggers get
'count' in obj; // triggers has

// Real-world use: validation / reactive data (how Vue 3's reactivity works)
function reactive(target) {
    return new Proxy(target, {
        set(target, prop, value) {
            const result = Reflect.set(target, prop, value);
            notifySubscribers(prop, value); // trigger UI update
            return result;
        },
    });
}

// Proxy for default values
const withDefaults = (obj, defaults) =>
    new Proxy(obj, {
        get: (target, prop) => (prop in target ? target[prop] : defaults[prop]),
    });

const config = withDefaults({}, { theme: 'light', lang: 'en' });
config.theme; // 'light' (from defaults)
config.theme = 'dark';
config.theme; // 'dark' (from object)
```

---

## 14. Common Interview Questions

### "Explain the difference between == and ==="

> `==` coerces types before comparing (`"5" == 5` is `true`, `null == undefined` is `true`). `===` checks value and type strictly. Always use `===`. The only time `==` is useful: `x == null` catches both `null` and `undefined`.

### "What is the temporal dead zone?"

> The period between entering a block scope and the `let`/`const` declaration being initialized. The variable exists (it's been hoisted) but cannot be accessed — accessing it throws `ReferenceError`. `var` doesn't have a TDZ — it's initialized to `undefined` at hoist.

### "Explain event delegation."

```js
// Instead of attaching listeners to each item (expensive, doesn't work for dynamic items):
items.forEach(item => item.addEventListener('click', handler)); // ✗

// Attach ONE listener to the parent, use event.target to determine what was clicked
document.querySelector('.list').addEventListener('click', e => {
    const item = e.target.closest('.list-item');
    if (!item) return;
    handleItemClick(item.dataset.id);
});
// Works for dynamically added items, far fewer listeners
```

### "What is the difference between call, apply, and bind?"

```js
// All three let you control what 'this' is

fn.call(thisArg, arg1, arg2); // call now, args comma-separated
fn.apply(thisArg, [arg1, arg2]); // call now, args as array
const bound = fn.bind(thisArg, arg1); // returns new function, call later
bound(arg2); // arg1 already bound
```

### "What is event bubbling and capturing?"

```text
When you click a nested element:
  Capturing phase: event travels DOWN from document → target
  Target phase: fires on the target element
  Bubbling phase: event travels UP from target → document

By default: addEventListener uses bubbling phase
Third argument 'true': use capturing phase

event.stopPropagation(): stop event from continuing up/down
event.preventDefault(): stop browser's default action (e.g. form submit)
```

### "Implement debounce and throttle."

```js
// Debounce: execute AFTER N ms of inactivity
// Use for: search input, resize handler — wait until user stops
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

const search = debounce(query => fetchResults(query), 300);
input.addEventListener('input', e => search(e.target.value));

// Throttle: execute at MOST once per N ms
// Use for: scroll handler, mousemove — fire at regular intervals
function throttle(fn, interval) {
    let lastTime = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastTime >= interval) {
            lastTime = now;
            return fn.apply(this, args);
        }
    };
}

const onScroll = throttle(() => updatePosition(), 100);
window.addEventListener('scroll', onScroll);
```

### "What is a WeakMap and when would you use it?"

> A WeakMap holds weak references to its keys (which must be objects). If the key object has no other references, it can be garbage collected and the WeakMap entry disappears automatically. Use cases: storing private data associated with an object without preventing GC, caching computed results where the cache should be freed with the object. Regular Map keeps keys alive forever — memory leak if you're mapping instance data.

---

## 15. Cross-Browser Compatibility

### The core problem

```text
Every browser has its own JavaScript engine:
  Chrome / Edge:   V8
  Firefox:         SpiderMonkey
  Safari:          JavaScriptCore (JSC / Nitro)

They all implement the ECMAScript spec, but:
  - New features ship at different times
  - Some older APIs behave differently
  - Safari is most often the "one browser that breaks things"
    (especially on iOS, where ALL browsers must use WebKit by law)
```

### Feature detection — the right way

```js
// ✗ Browser detection — fragile, breaks when browsers update
if (navigator.userAgent.includes('Safari')) { ... }

// ✓ Feature detection — check if the API exists before using it
if ('IntersectionObserver' in window) {
  new IntersectionObserver(callback).observe(el);
} else {
  // fallback: scroll event listener
}

// ✓ Method detection on a prototype
if (typeof Array.prototype.at === 'function') {
  arr.at(-1); // last element
} else {
  arr[arr.length - 1]; // fallback
}

// ✓ Can I Use + MDN compatibility tables
// Check https://caniuse.com before using newer APIs
// Each MDN page has a "Browser compatibility" table at the bottom
```

### Polyfills — adding missing APIs

```js
// A polyfill is code that implements a missing browser API
// so older browsers behave like modern ones

// Example: Array.prototype.at (not in Safari < 15.4)
if (!Array.prototype.at) {
    Array.prototype.at = function (index) {
        const i = index < 0 ? this.length + index : index;
        return this[i];
    };
}

// Example: Object.hasOwn (not in older browsers)
if (!Object.hasOwn) {
    Object.hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
}

// In practice — use a polyfill service or core-js:
// <script src="https://polyfill.io/v3/polyfill.min.js"></script>
// or with bundlers: import 'core-js/stable';

// Babel + @babel/preset-env: transpiles modern JS syntax for older browsers
// Set targets in .browserslistrc:
//   > 0.5%, last 2 versions, not dead, not IE 11
```

### Common browser-specific gotchas

```js
// 1. Safari: no support for the 'lookbehind' regex assertion until Safari 16.4
//    (?<=foo)bar — matches 'bar' only if preceded by 'foo'
//    Fix: restructure the regex or detect and branch

// 2. Safari: Date parsing is strict — only accepts ISO 8601
new Date('2024-01-15'); // ✓ works everywhere
new Date('January 15, 2024'); // ✓ works in Chrome/Firefox
new Date('2024/01/15'); // ✗ Invalid Date in Safari
// Fix: always use ISO format or a library like date-fns

// 3. Safari: scroll behavior
el.scrollTo({ top: 0, behavior: 'smooth' }); // ✗ ignored in older Safari
// Fix: detect and use a scroll polyfill, or use CSS scroll-behavior

// 4. Firefox: event.path does not exist
e.path; // ✗ Chrome-only
e.composedPath(); // ✓ standard, works everywhere

// 5. All browsers: structuredClone (added 2022) — check before using
const clone = typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)); // fallback (loses dates, undefined, functions)

// 6. iOS Safari: audio/video autoplay blocked unless user gesture
//    Fix: only call .play() inside a click/touch event handler

// 7. Safari: ResizeObserver loop error — fires a non-fatal error
//    "ResizeObserver loop limit exceeded" — safe to ignore but noisy
window.addEventListener('error', e => {
    if (e.message === 'ResizeObserver loop limit exceeded') e.stopImmediatePropagation();
});
```

### Transpilation vs polyfilling — know the difference

```text
Transpilation: converts NEW SYNTAX → old syntax
  e.g. arrow functions, optional chaining, nullish coalescing
  Tool: Babel (compile-time)

Polyfilling: adds MISSING APIS at runtime
  e.g. Array.prototype.flat, Promise, fetch
  Tool: core-js, polyfill.io (runtime)

You need BOTH for full legacy support.

Example:
  const x = a?.b;       ← syntax (transpile)
  arr.flat();           ← API (polyfill)
  async/await           ← syntax (transpile → generator functions)
  fetch()               ← API (polyfill)
```

### Testing cross-browser without owning every device

```text
- BrowserStack / Sauce Labs: remote real device testing
- Chrome DevTools → Sensors: simulate mobile / touch
- Firefox Developer Edition: different engine from Chrome — good secondary test
- Safari via Xcode Simulator (Mac only) — free
- VM with IE/Edge legacy: Microsoft offers free VMs at developer.microsoft.com
- Automated: Playwright and WebdriverIO support multiple browsers in CI
```

---

## 16. Race Conditions in Async JavaScript

### What is a race condition?

```text
A race condition happens when the OUTCOME depends on the ORDER
or TIMING of async operations — and that order is not guaranteed.

!In JavaScript this is common with:
  - Multiple async calls where only the LAST response should win
  - Shared mutable state modified by concurrent async tasks
  - UI updates fired faster than previous requests complete
```

### The classic UI race: stale search results

```js
// User types fast: "re" → "rea" → "reac" → "react"
// Each keystroke fires a fetch — but responses come back out of order
// "react" response might arrive BEFORE "reac" → shows wrong results

// ✗ Broken — no guard against stale responses
async function search(query) {
    const results = await fetch(`/api/search?q=${query}`).then(r => r.json());
    renderResults(results); // could be from an OLD query!
}

input.addEventListener('input', e => search(e.target.value));
```

### Fix 1: AbortController — cancel the previous request

```js
// ✓ Cancel the in-flight request before starting a new one
let controller;

async function search(query) {
    // Abort the previous fetch if it's still running
    controller?.abort();
    controller = new AbortController();

    try {
        const results = await fetch(`/api/search?q=${query}`, {
            signal: controller.signal,
        }).then(r => r.json());

        renderResults(results); //! guaranteed: this is the latest query
    } catch (err) {
        if (err.name === 'AbortError') return; // expected — ignore
        throw err;
    }
}
```

### Fix 2: Sequence counter — ignore stale responses

```js
// ✓ Tag each request — only apply the result if it's still the latest
let latestSeq = 0;

async function search(query) {
    const seq = ++latestSeq; // capture the current sequence number
    const results = await fetch(`/api/search?q=${query}`).then(r => r.json());

    if (seq !== latestSeq) return; // a newer request was made — discard this result
    renderResults(results);
}
```

### Race condition with shared state

```js
// ✗ Two async operations both read, modify, and write the same value
let count = 0;

async function increment() {
    const current = count; // read
    await delay(100); // yield — other code can run here
    count = current + 1; // write — may overwrite another increment!
}

await Promise.all([increment(), increment()]);
console.log(count); // 1 — not 2! Both read 0, both wrote 1

// ✓ Fix: do the full read-modify-write atomically (no await in between)
async function safeIncrement() {
    await delay(100); // async work first
    count += 1; // synchronous read-modify-write — safe
}

// ✓ Fix: serialize with a queue (mutex-like pattern)
class AsyncQueue {
    #queue = Promise.resolve();

    run(fn) {
        this.#queue = this.#queue.then(fn).catch(() => {});
        return this.#queue;
    }
}

const queue = new AsyncQueue();
queue.run(() => increment()); // each call waits for the previous to finish
queue.run(() => increment());
```

### Race condition in React (useEffect)

```js
// 📖 Terms:
//   component unmounts — In React, a component is a piece of UI (e.g. a user profile card).
//                        "Unmounts" means it gets removed from the screen — e.g. the user
//                        navigates away to another page before the data finished loading.
//
//   in-flight          — The fetch request was already sent to the server and is still waiting
//                        for a response (it's "in the air", not yet resolved).
//
// The bug: you start a fetch when the component loads → the user navigates away (component
// unmounts) → the fetch finally resolves → it tries to call setUser(data) to update state
// on a component that no longer exists → React warns you about this.
//
// The fix (below): AbortController cancels the fetch when the component unmounts,
// so the callback never runs on dead state.
//! ✗ Classic React bug: component unmounts while fetch is in-flight
useEffect(() => {
    fetch(`/api/user/${id}`)
        .then(r => r.json())
        .then(data => setUser(data)); // setState on unmounted component — warning!
}, [id]);

// ✓ Fix with AbortController in cleanup
useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/user/${id}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => setUser(data))
        .catch(err => {
            if (err.name !== 'AbortError') throw err;
        });

    return () => controller.abort(); //! cleanup: cancel on unmount or id change
}, [id]);

// ✓ Or with a "live" flag (simpler, less optimal — doesn't cancel network)
useEffect(() => {
    let live = true;

    fetch(`/api/user/${id}`)
        .then(r => r.json())
        .then(data => {
            if (live) setUser(data);
        });

    return () => {
        live = false;
    };
}, [id]);
```

### Promise.race — useful but can also introduce races

```js
// Promise.race: resolves/rejects with FIRST to settle
// Good use: timeout pattern
function withTimeout(promise, ms) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms));
    return Promise.race([promise, timeout]);
}

const data = await withTimeout(fetch('/api/slow'), 5000);

//! Gotcha: Promise.race does NOT cancel the losing promises
// The slow fetch above still runs to completion — it's just ignored
// To truly cancel: use AbortController
function withTimeoutAndCancel(url, ms) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);

    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
}
```

### Debounce as a race condition guard

```js
// Debouncing collapses rapid calls into one — prevents the race from even starting
// (see Section 14 for implementation)

//! For search: debounce + AbortController together is the gold standard
let controller;
const debouncedSearch = debounce(async query => {
    controller?.abort();
    controller = new AbortController();
    try {
        const results = await fetch(`/api/search?q=${query}`, {
            signal: controller.signal,
        }).then(r => r.json());
        renderResults(results);
    } catch (err) {
        if (err.name !== 'AbortError') throw err;
    }
}, 300);

input.addEventListener('input', e => debouncedSearch(e.target.value));
// Debounce: doesn't even fire until user pauses typing
// AbortController: if it does fire twice, cancels the older one
```

### Summary: when to use which fix

```text
Situation                              Fix
─────────────────────────────────────────────────────────────────
Search / typeahead (HTTP requests)     Debounce + AbortController
Any fetch where only latest matters    AbortController or seq counter
React useEffect with fetch             AbortController in cleanup
Shared mutable state + async           Avoid await mid-mutation; or serialize
Timeout on a slow promise              Promise.race + AbortController
Multiple updates, need all results     Promise.allSettled (never races)
```

---

## Most Asked JavaScript Interview Questions

### "What is the event loop and how does JavaScript handle async code?"

> JavaScript is single-threaded — one call stack, one thing at a time. The event loop continuously checks: is the call stack empty? If yes, pull the next task from the queue and push it on the stack. There are two queues: the **microtask queue** (Promises, `queueMicrotask`) which drains completely before the next macrotask, and the **macrotask queue** (`setTimeout`, `setInterval`, I/O). So `Promise.resolve().then(...)` always runs before `setTimeout(..., 0)`.

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2
// Why: sync first (1, 4), then microtasks (3), then macrotasks (2)
```

### "What is a closure?"

> A closure is a function that remembers the variables from its outer scope even after that outer function has returned. Every function in JavaScript is a closure. The inner function holds a live reference to the outer scope — not a copy.

```js
function makeCounter() {
    let count = 0;
    return {
        increment: () => ++count,
        get: () => count,
    };
}
const counter = makeCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.get(); // 2
// count lives on because increment/get close over it
```

### "Explain `var` vs `let` vs `const`."

> `var` is function-scoped, hoisted and initialized to `undefined`, can be re-declared. `let` and `const` are block-scoped, hoisted but NOT initialized (Temporal Dead Zone — accessing before declaration throws ReferenceError), cannot be re-declared. `const` additionally prevents re-assignment (but does NOT make objects immutable — you can still mutate properties). Rule: default to `const`, use `let` when you need to reassign, never use `var`.

```js
// Temporal Dead Zone
console.log(x); // ReferenceError — x exists but is not initialized
let x = 5;

// const ≠ frozen object
const obj = { a: 1 };
obj.a = 2; // ✓ fine — mutating property
obj = {}; // ✗ TypeError — re-assigning binding
```

### "What is `this` and how does it work?"

> `this` is determined at call time, not at definition time (except for arrow functions). Rules in order: 1) `new` binding — `this` is the new object. 2) Explicit binding — `call`, `apply`, `bind` set `this` explicitly. 3) Implicit binding — `obj.method()` sets `this` to `obj`. 4) Default binding — plain function call sets `this` to `undefined` (strict mode) or `globalThis`. Arrow functions have no own `this` — they inherit from the enclosing lexical scope.

```js
const obj = {
    name: 'Alice',
    greet() {
        console.log(this.name);
    }, // 'Alice' — implicit
    greetArrow: () => console.log(this.name), // undefined — arrow, no own this
};
const fn = obj.greet;
fn(); // undefined — lost implicit binding (default binding in strict mode)
fn.call({ name: 'Bob' }); // 'Bob' — explicit binding
```

### "What is prototypal inheritance?"

> Every JavaScript object has an internal `[[Prototype]]` link to another object (or null). When you access a property, JS looks on the object first, then walks up the prototype chain until found or the chain ends at null. `class` syntax is sugar over this — `extends` sets up the prototype chain. `Object.create(proto)` creates an object with `proto` as its prototype.

```js
const animal = {
    breathe() {
        return 'breathing';
    },
};
const dog = Object.create(animal);
dog.bark = function () {
    return 'woof';
};

dog.bark(); // 'woof' — own property
dog.breathe(); // 'breathing' — found on prototype
```

### "What is the difference between `==` and `===`?"

> `===` (strict equality) checks value AND type — no conversion. `==` (loose equality) performs type coercion before comparing. Always use `===` to avoid surprising coercion bugs. The only common acceptable use of `==` is `x == null` which matches both `null` and `undefined`.

```js
0 == ''; // true  — both coerce to 0
0 === ''; // false — different types
null == undefined; // true  — special case
null === undefined; // false
NaN === NaN; // false — NaN is never equal to itself; use Number.isNaN()
```

### "Explain `call`, `apply`, and `bind`."

> All three set `this` explicitly. `call(thisArg, arg1, arg2)` invokes immediately with args spread. `apply(thisArg, [arg1, arg2])` invokes immediately with args as array. `bind(thisArg, arg1)` returns a NEW function with `this` permanently bound — useful for event handlers and callbacks.

```js
function greet(greeting, punct) {
    return `${greeting}, ${this.name}${punct}`;
}
const user = { name: 'Alice' };

greet.call(user, 'Hello', '!'); // 'Hello, Alice!'
greet.apply(user, ['Hello', '!']); // 'Hello, Alice!'
const boundGreet = greet.bind(user);
boundGreet('Hi', '.'); // 'Hi, Alice.'
```

### "What are Promises and how do they differ from async/await?"

> A Promise is an object representing a future value — pending, fulfilled, or rejected. `async/await` is syntactic sugar over Promises — it makes async code look synchronous, improving readability. Under the hood, `await` just calls `.then()`. Error handling: `.then().catch()` vs `try/catch`. Both are equivalent in power; `async/await` is easier to read and debug (stack traces are cleaner).

```js
// Promise chain
fetch('/api/user')
    .then(r => r.json())
    .then(user => console.log(user))
    .catch(err => console.error(err));

// Equivalent async/await
async function getUser() {
    try {
        const r = await fetch('/api/user');
        const user = await r.json();
        console.log(user);
    } catch (err) {
        console.error(err);
    }
}
```

### "What is hoisting?"

> Hoisting is JavaScript's behavior of moving declarations to the top of their scope before execution. `var` declarations are hoisted and initialized to `undefined`. Function declarations are fully hoisted (name + body). `let`/`const`/`class` are hoisted but NOT initialized (Temporal Dead Zone). Function expressions and arrow functions assigned to variables hoist only the variable, not the function body.

```js
console.log(foo()); // 'foo' — function declaration fully hoisted
console.log(bar); // undefined — var hoisted, not the value
console.log(baz); // ReferenceError — let in TDZ

function foo() {
    return 'foo';
}
var bar = 'bar';
let baz = 'baz';
```

### "What is event bubbling, capturing, and delegation?"

> When an event fires, it travels in 3 phases: capture (top → target), target, bubble (target → top). By default, handlers run in the bubble phase. `stopPropagation()` stops the event from traveling further. Event delegation: instead of attaching a listener to every child, attach one listener to the parent and check `event.target`. More efficient for dynamic lists.

```js
// Event delegation — one listener handles all current and future buttons
document.querySelector('#list').addEventListener('click', e => {
    if (e.target.matches('button.delete')) {
        e.target.closest('li').remove();
    }
});
```

### "What is the difference between `null` and `undefined`?"

> `undefined` means a variable was declared but not assigned, or a function returned nothing, or an object property doesn't exist. `null` is an explicit "intentional absence of value" — you assign it on purpose. `typeof undefined === 'undefined'`, but `typeof null === 'object'` (a historic bug). Use `null` when you want to explicitly clear a value; `undefined` happens naturally.

### "What are `map`, `filter`, and `reduce`?"

> All three are non-mutating array methods. `map` transforms each element and returns a new array of the same length. `filter` returns a new array with only elements that pass a test. `reduce` accumulates all elements into a single value (any type).

```js
const nums = [1, 2, 3, 4, 5];

nums.map(n => n * 2); // [2, 4, 6, 8, 10]
nums.filter(n => n % 2 === 0); // [2, 4]
nums.reduce((acc, n) => acc + n, 0); // 15

// Real use: group by category
const grouped = items.reduce((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
}, {});
```

### "What is destructuring and the spread/rest operator?"

> Destructuring extracts values from arrays or objects into variables. Spread (`...`) expands an iterable into individual elements. Rest (`...`) collects remaining elements into an array. Same syntax, opposite directions — context determines which it is.

```js
// Object destructuring with rename + default
const { name: userName = 'Guest', age } = user;

// Array destructuring
const [first, , third] = [1, 2, 3];

// Rest params
function sum(...nums) {
    return nums.reduce((a, b) => a + b, 0);
}

// Spread — merge objects (last key wins)
const merged = { ...defaults, ...overrides };

// Spread — clone array
const copy = [...original, newItem];
```

### "What is currying?"

> Currying transforms a function that takes multiple arguments into a chain of functions that each take one argument. Useful for partial application — pre-filling some arguments and reusing the specialized function.

```js
// Manual curry
const multiply = a => b => a * b;
const double = multiply(2);
double(5); // 10

// Practical: pre-fill a logger's prefix
const log = level => message => console.log(`[${level}] ${message}`);
const warn = log('WARN');
warn('disk full'); // [WARN] disk full
```

### "What is memoization?"

> Memoization is caching the result of a function call so repeated calls with the same arguments return the cached result instead of recomputing. Trade-off: faster repeat calls at the cost of memory.

```js
function memoize(fn) {
    const cache = new Map();
    return function (...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

const expensiveFn = memoize(n => {
    // heavy computation
    return n * n;
});
```

### "What is the difference between deep and shallow copy?"

> A shallow copy copies the top-level properties — nested objects/arrays are still shared by reference. A deep copy recursively copies everything — no shared references. `Object.assign({}, obj)` and `{ ...obj }` are shallow. `structuredClone(obj)` is the modern deep clone (handles dates, maps, sets). `JSON.parse(JSON.stringify(obj))` is a quick deep clone but loses `undefined`, functions, `Date` (becomes string), and `Map`/`Set`.

```js
const original = { a: 1, nested: { b: 2 } };

const shallow = { ...original };
shallow.nested.b = 99; // also changes original.nested.b!

const deep = structuredClone(original); // truly independent
deep.nested.b = 99; // original is untouched
```

### "What are WeakMap and WeakSet?"

> `WeakMap` and `WeakSet` hold weak references — if the key object has no other references, it can be garbage collected and the entry is automatically removed. They don't prevent GC like regular `Map`/`Set` do. Not iterable (you can't loop over them). Use cases: caching data keyed by DOM nodes (auto-cleans when node is removed), storing private data for class instances without memory leaks.

```js
const cache = new WeakMap();

function process(element) {
    if (cache.has(element)) return cache.get(element);
    const result = heavyCompute(element);
    cache.set(element, result);
    return result;
}
// When element is removed from DOM and has no other refs, cache entry auto-GC'd
```
