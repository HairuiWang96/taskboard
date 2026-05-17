# JavaScript — Live Coding Interview Cheatsheet

**Purpose: Write these from memory in a real interview. Partial but correct is better than full but wrong.**

> Most interviewers ask for: utility functions, data structures, async patterns, and functional programming.
> They want to see: correct closure usage, edge case awareness, clean logic, and Big-O awareness.

---

## Table of Contents

1. [debounce](#1-debounce)
2. [throttle](#2-throttle)
3. [deepClone](#3-deepclone)
4. [deepEqual](#4-deepequal)
5. [EventEmitter](#5-eventemitter)
6. [Promise.all from scratch](#6-promiseall-from-scratch)
7. [Promise.allSettled from scratch](#7-promiseallsettled-from-scratch)
8. [Promise.race from scratch](#8-promiserace-from-scratch)
9. [Promise.any from scratch](#9-promiseany-from-scratch)
10. [promisify](#10-promisify)
11. [flatten](#11-flatten)
12. [curry](#12-curry)
13. [compose / pipe](#13-compose--pipe)
14. [memoize](#14-memoize)
15. [LRU Cache](#15-lru-cache)
16. [groupBy](#16-groupby)
17. [chunk](#17-chunk)
18. [intersection / difference / union](#18-intersection--difference--union)
19. [getNestedValue](#19-getnestedvalue)
20. [setNestedValue](#20-setnestedvalue)
21. [Observable (basic)](#21-observable-basic)
22. [sleep / delay](#22-sleep--delay)
23. [retry](#23-retry)
24. [parseQueryString](#24-parsequerystring)
25. [Trie](#25-trie)
26. [Quick Reference — What Interviewers Watch For](#26-quick-reference--what-interviewers-watch-for)

---

## 1. debounce

```js
// Key insight: each call CANCELS the previous timer via closure.
// The function only runs after the user STOPS calling it for `delay` ms.
// Gotcha: the returned function must be the SAME reference — don't re-create it on every render.
function debounce(fn, delay) {
  let timer; // captured in closure — shared across all calls

  return function (...args) {
    clearTimeout(timer);           // cancel whatever was queued
    timer = setTimeout(() => {
      fn.apply(this, args);        // preserve `this` and spread args
    }, delay);
  };
}

// Usage:
const log = debounce((val) => console.log('searching:', val), 300);
input.addEventListener('input', (e) => log(e.target.value));
// If user types fast, only the LAST keystroke fires after 300ms of silence.

// Variant with immediate (leading edge) option:
function debounceLeading(fn, delay) {
  let timer;
  return function (...args) {
    const callNow = !timer;        // fire immediately on the first call
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;                // reset so next burst can fire immediately
    }, delay);
    if (callNow) fn.apply(this, args);
  };
}
```

---

## 2. throttle

```js
// Key insight: throttle LIMITS how often a function fires.
// Leading edge: fires immediately, then ignores calls during cooldown.
// Trailing edge: ignores calls during cooldown, then fires once at the end.
// Interviewers want BOTH variants — leading is more common in interviews.

// --- Leading edge throttle ---
// Fires on the FIRST call, then blocks for `limit` ms.
function throttleLeading(fn, limit) {
  let inCooldown = false;

  return function (...args) {
    if (inCooldown) return;        // silently drop the call
    fn.apply(this, args);          // fire immediately
    inCooldown = true;
    setTimeout(() => {
      inCooldown = false;          // reopen the gate after `limit` ms
    }, limit);
  };
}

// --- Trailing edge throttle ---
// Queues the latest call and fires it at the END of each window.
function throttleTrailing(fn, limit) {
  let lastCallTime = 0;
  let timer;

  return function (...args) {
    const now = Date.now();
    const remaining = limit - (now - lastCallTime); // time left in current window

    clearTimeout(timer);

    if (remaining <= 0) {
      // Window has expired — fire immediately
      lastCallTime = now;
      fn.apply(this, args);
    } else {
      // Still in cooldown — schedule to fire when window ends
      timer = setTimeout(() => {
        lastCallTime = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}

// Usage:
const onScroll = throttleLeading(() => console.log('scroll'), 200);
window.addEventListener('scroll', onScroll);
// Fires at most once per 200ms — good for scroll/resize handlers.
```

---

## 3. deepClone

```js
// Key insight: JSON.parse(JSON.stringify(x)) fails for: Date, undefined, functions,
// circular references, Map/Set, and Infinity/NaN.
// The correct solution uses recursion + a WeakMap to handle circular refs.

function deepClone(value, seen = new WeakMap()) {
  // Primitives (string, number, boolean, null, undefined, symbol, bigint) — return as-is
  if (value === null || typeof value !== 'object') return value;

  // Handle circular references — if we've seen this object, return the clone we made
  if (seen.has(value)) return seen.get(value);

  // Handle Date — construct a new Date with the same timestamp
  if (value instanceof Date) return new Date(value.getTime());

  // Handle Array
  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);              // register BEFORE recursing to break cycles
    for (const item of value) {
      clone.push(deepClone(item, seen));
    }
    return clone;
  }

  // Handle plain Object
  const clone = Object.create(Object.getPrototypeOf(value)); // preserve prototype chain
  seen.set(value, clone);                // register BEFORE recursing
  for (const key of Object.keys(value)) {
    clone[key] = deepClone(value[key], seen);
  }
  return clone;
}

// Usage:
const original = { a: 1, b: { c: [1, 2, 3] }, d: new Date() };
const copy = deepClone(original);
copy.b.c.push(4);
console.log(original.b.c); // [1, 2, 3] — unaffected

// Circular reference:
const obj = { x: 1 };
obj.self = obj;
const safe = deepClone(obj); // no infinite loop
```

---

## 4. deepEqual

```js
// Key insight: === handles primitives and same-reference objects.
// For structural equality we must recurse into arrays and objects.
// Gotcha: check that both objects have the SAME set of keys.

function deepEqual(a, b) {
  // Same reference or same primitive value
  if (a === b) return true;

  // If types differ or either is null/not-object, they can't be equal
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;

  // Handle Date — compare timestamps
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

  // Handle Array — must both be arrays with same length
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  // Handle plain Object — same keys, same values
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => b.hasOwnProperty(key) && deepEqual(a[key], b[key]));
}

// Usage:
console.log(deepEqual({ a: [1, 2] }, { a: [1, 2] })); // true
console.log(deepEqual({ a: 1 }, { a: 1, b: 2 }));     // false
console.log(deepEqual([1, [2, 3]], [1, [2, 3]]));      // true
console.log(deepEqual(new Date('2024'), new Date('2024'))); // true
```

---

## 5. EventEmitter

```js
// Key insight: a map of event name → list of listeners.
// `once` wraps the listener so it removes itself after the first call.
// Interviewers look for: correct removal in `off`, correct `once` teardown.

class EventEmitter {
  constructor() {
    this.events = {}; // { eventName: [fn, fn, ...] }
  }

  // Register a listener
  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this; // allow chaining: emitter.on('x', f).on('y', g)
  }

  // Remove a specific listener
  off(event, listener) {
    if (!this.events[event]) return this;
    // Filter out the exact function reference
    this.events[event] = this.events[event].filter((l) => l !== listener);
    return this;
  }

  // Call all listeners for an event with provided args
  emit(event, ...args) {
    if (!this.events[event]) return false;
    // Slice to a copy — a listener might remove itself during emit
    this.events[event].slice().forEach((listener) => listener(...args));
    return true;
  }

  // Register a listener that fires only once, then removes itself
  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);       // call the original
      this.off(event, wrapper); // remove the wrapper, not the original
    };
    this.on(event, wrapper);
    return this;
  }
}

// Usage:
const emitter = new EventEmitter();

const greet = (name) => console.log('Hello', name);
emitter.on('greet', greet);
emitter.emit('greet', 'Alice'); // Hello Alice
emitter.off('greet', greet);
emitter.emit('greet', 'Bob');   // nothing

emitter.once('connect', () => console.log('connected'));
emitter.emit('connect'); // connected
emitter.emit('connect'); // nothing — already fired
```

---

## 6. Promise.all from scratch

```js
// Key insight: resolve when ALL resolve, reject immediately on the FIRST rejection.
// Gotcha: must track COUNT of resolved, not just push and check length,
// because array slots are assigned by index immediately.

function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) return resolve([]); // edge case: empty array

    const results = new Array(promises.length);
    let resolved = 0; // count resolved promises

    promises.forEach((p, i) => {
      // Wrap in Promise.resolve to handle non-promise values
      Promise.resolve(p).then((value) => {
        results[i] = value;          // store at the CORRECT index
        resolved++;
        if (resolved === promises.length) resolve(results); // all done
      }).catch(reject);              // any rejection short-circuits
    });
  });
}

// Usage:
promiseAll([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3),
]).then(console.log); // [1, 2, 3]

promiseAll([
  Promise.resolve(1),
  Promise.reject('oops'),
  Promise.resolve(3),
]).catch(console.error); // 'oops'
```

---

## 7. Promise.allSettled from scratch

```js
// Key insight: NEVER rejects — waits for ALL to settle (resolve OR reject).
// Each result is { status: 'fulfilled', value } or { status: 'rejected', reason }.

function promiseAllSettled(promises) {
  return new Promise((resolve) => {
    if (promises.length === 0) return resolve([]);

    const results = new Array(promises.length);
    let settled = 0;

    promises.forEach((p, i) => {
      Promise.resolve(p)
        .then((value) => {
          results[i] = { status: 'fulfilled', value };
        })
        .catch((reason) => {
          results[i] = { status: 'rejected', reason };
        })
        .finally(() => {
          settled++;
          if (settled === promises.length) resolve(results); // always resolves
        });
    });
  });
}

// Usage:
promiseAllSettled([
  Promise.resolve(1),
  Promise.reject('fail'),
  Promise.resolve(3),
]).then(console.log);
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected', reason: 'fail' },
//   { status: 'fulfilled', value: 3 },
// ]
```

---

## 8. Promise.race from scratch

```js
// Key insight: resolve/reject with whichever promise settles FIRST.
// Once one settles, the others are ignored (but still run in the background —
// you cannot cancel a running Promise).

function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    // Once a Promise resolves/rejects, calling resolve/reject again is a no-op
    promises.forEach((p) => {
      Promise.resolve(p).then(resolve).catch(reject);
    });
  });
}

// Usage:
const slow = new Promise((res) => setTimeout(() => res('slow'), 500));
const fast = new Promise((res) => setTimeout(() => res('fast'), 100));
promiseRace([slow, fast]).then(console.log); // 'fast'

// Real use case: timeout pattern
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return promiseRace([promise, timeout]);
}
```

---

## 9. Promise.any from scratch

```js
// Key insight: resolves with the FIRST fulfillment, rejects only if ALL reject.
// If all reject, produces an AggregateError with all rejection reasons.
// This is the OPPOSITE of Promise.all (which resolves on all, rejects on first).

function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) return reject(new AggregateError([], 'All promises were rejected'));

    const errors = new Array(promises.length);
    let rejected = 0;

    promises.forEach((p, i) => {
      Promise.resolve(p)
        .then(resolve)           // first fulfillment wins immediately
        .catch((err) => {
          errors[i] = err;
          rejected++;
          if (rejected === promises.length) {
            // Every promise rejected — that's the only way promiseAny rejects
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        });
    });
  });
}

// Usage:
promiseAny([
  Promise.reject('a'),
  Promise.resolve('b'),
  Promise.resolve('c'),
]).then(console.log); // 'b'

promiseAny([
  Promise.reject('x'),
  Promise.reject('y'),
]).catch((e) => console.log(e instanceof AggregateError, e.errors)); // true ['x','y']
```

---

## 10. promisify

```js
// Key insight: Node.js callbacks follow (err, result) convention.
// promisify wraps a callback-style function so it returns a Promise.
// Interviewers want to see: error-first callback convention, spread args.

function promisify(fn) {
  // Returns a new function that accepts the same args but returns a Promise
  return function (...args) {
    return new Promise((resolve, reject) => {
      // Append a callback that follows Node.js (err, result) convention
      fn(...args, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };
}

// Usage:
const fs = require('fs'); // Node.js example
const readFile = promisify(fs.readFile);
readFile('./file.txt', 'utf8').then(console.log).catch(console.error);

// Vanilla example:
function fakeReadFile(path, encoding, cb) {
  setTimeout(() => cb(null, `contents of ${path}`), 100);
}
const readAsync = promisify(fakeReadFile);
readAsync('./foo.txt', 'utf8').then(console.log); // 'contents of ./foo.txt'
```

---

## 11. flatten

```js
// Key insight: recursively handle nested arrays to any depth.
// Interviewers may ask for: recursive, iterative (stack), or one-liner.
// Gotcha: Array.prototype.flat(Infinity) exists — mention it, then implement from scratch.

// --- Recursive ---
function flattenRecursive(arr, depth = Infinity) {
  return arr.reduce((acc, item) => {
    if (Array.isArray(item) && depth > 0) {
      // Recurse into nested arrays, decrementing depth
      acc.push(...flattenRecursive(item, depth - 1));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

// --- Iterative (stack-based, avoids call stack overflow on deeply nested input) ---
function flattenIterative(arr) {
  const stack = [...arr]; // work queue
  const result = [];

  while (stack.length) {
    const item = stack.shift();        // take from front
    if (Array.isArray(item)) {
      stack.unshift(...item);          // put sub-items back at the front
    } else {
      result.push(item);
    }
  }
  return result;
}

// Usage:
flattenRecursive([1, [2, [3, [4]]]]); // [1, 2, 3, 4]
flattenRecursive([1, [2, [3]]], 1);   // [1, 2, [3]] — only one level
flattenIterative([1, [2, [3, [4]]]]); // [1, 2, 3, 4]

// One-liner (mention in interview):
[1, [2, [3]]].flat(Infinity); // [1, 2, 3]
```

---

## 12. curry

```js
// Key insight: curry transforms f(a, b, c) into f(a)(b)(c).
// The returned function checks if it has received ENOUGH arguments.
// If yes, call the original. If not, return another curried function.
// Gotcha: use fn.length to know how many args the original expects.

function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      // Have all required arguments — invoke the original function
      return fn.apply(this, args);
    }
    // Not enough args yet — return a function that collects the rest
    return function (...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

// Usage:
function add(a, b, c) { return a + b + c; }
const curriedAdd = curry(add);

curriedAdd(1)(2)(3);    // 6
curriedAdd(1, 2)(3);    // 6 — partial args work too
curriedAdd(1)(2, 3);    // 6
curriedAdd(1, 2, 3);    // 6

// Real use case: reusable validators
const multiply = curry((factor, value) => value * factor);
const double = multiply(2);
const triple = multiply(3);
[1, 2, 3].map(double); // [2, 4, 6]
```

---

## 13. compose / pipe

```js
// Key insight: compose applies functions right-to-left (math convention).
//             pipe applies functions left-to-right (readable data flow).
// Both take multiple functions and return a single function.
// Interviewers often ask for both — know which direction each goes.

// --- compose: right-to-left ---
// compose(f, g, h)(x) === f(g(h(x)))
function compose(...fns) {
  return function (x) {
    return fns.reduceRight((acc, fn) => fn(acc), x); // start from the rightmost fn
  };
}

// --- pipe: left-to-right ---
// pipe(f, g, h)(x) === h(g(f(x)))
function pipe(...fns) {
  return function (x) {
    return fns.reduce((acc, fn) => fn(acc), x); // start from the leftmost fn
  };
}

// Usage:
const add1 = (x) => x + 1;
const double = (x) => x * 2;
const square = (x) => x * x;

const transform = compose(square, double, add1); // square(double(add1(x)))
transform(3); // add1(3)=4 → double(4)=8 → square(8)=64

const pipeline = pipe(add1, double, square); // same operations, left-to-right
pipeline(3); // add1(3)=4 → double(4)=8 → square(8)=64

// Real use case: data transformation pipeline
const process = pipe(
  (data) => data.filter(Boolean),
  (data) => data.map((x) => x.trim()),
  (data) => data.sort(),
);
```

---

## 14. memoize

```js
// Key insight: cache results keyed by arguments so repeated calls skip computation.
// Gotcha with multiple args: JSON.stringify works for simple args but breaks on
// functions, circular refs, or undefined. Interviewers accept JSON.stringify for interviews.

function memoize(fn) {
  const cache = new Map();

  return function (...args) {
    const key = JSON.stringify(args); // serialize args into a cache key
    if (cache.has(key)) {
      return cache.get(key);          // cache hit — return stored result
    }
    const result = fn.apply(this, args);
    cache.set(key, result);           // cache miss — compute and store
    return result;
  };
}

// Usage:
function expensiveCalc(n) {
  console.log('computing...');
  return n * n;
}
const memoCalc = memoize(expensiveCalc);
memoCalc(5); // computing... → 25
memoCalc(5); // (no log) → 25 — served from cache
memoCalc(6); // computing... → 36

// Classic: memoized fibonacci
const fib = memoize(function (n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2); // each sub-call is also cached
});
fib(40); // fast — O(n) with memoization vs O(2^n) without
```

---

## 15. LRU Cache

```js
// Key insight: Least Recently Used — evict the item that was accessed longest ago.
// O(1) get and set using a Map, because Map preserves INSERTION ORDER.
// Trick: on each access, DELETE and RE-INSERT the key to move it to the "most recent" end.
// The oldest item is always at the front: map.keys().next().value

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // Map preserves insertion order — key to this whole solution
  }

  get(key) {
    if (!this.map.has(key)) return -1; // cache miss

    const value = this.map.get(key);
    // Move to most-recently-used position by deleting and re-inserting
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key); // remove old entry before re-inserting
    } else if (this.map.size >= this.capacity) {
      // At capacity — evict the LEAST recently used (first key in Map)
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
    this.map.set(key, value); // insert at the end (most recent)
  }
}

// Usage:
const cache = new LRUCache(3);
cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
cache.get('a');      // 1 — moves 'a' to most recent
cache.set('d', 4);   // evicts 'b' (least recently used)
cache.get('b');      // -1 — evicted
cache.get('a');      // 1 — still there
```

---

## 16. groupBy

```js
// Key insight: reduce over the array, using each item's key value as a bucket.
// Interviewers watch for: handling missing keys, handling non-string keys.

function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    // key can be a string property name OR a function that derives the group
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) groups[groupKey] = []; // initialize bucket if needed
    groups[groupKey].push(item);
    return groups;
  }, {});
}

// Usage:
const people = [
  { name: 'Alice', dept: 'Engineering' },
  { name: 'Bob', dept: 'Marketing' },
  { name: 'Carol', dept: 'Engineering' },
];

groupBy(people, 'dept');
// { Engineering: [Alice, Carol], Marketing: [Bob] }

groupBy([1, 2, 3, 4, 5, 6], (n) => (n % 2 === 0 ? 'even' : 'odd'));
// { odd: [1, 3, 5], even: [2, 4, 6] }
```

---

## 17. chunk

```js
// Key insight: walk the array in steps of `size`, slicing out each chunk.
// Gotcha: the last chunk may be smaller than `size` — slice handles this naturally.

function chunk(arr, size) {
  if (size <= 0) throw new Error('Chunk size must be positive');
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size)); // slice is end-exclusive and safe to overshoot
  }
  return result;
}

// Usage:
chunk([1, 2, 3, 4, 5], 2); // [[1,2],[3,4],[5]]
chunk([1, 2, 3, 4, 5], 3); // [[1,2,3],[4,5]]
chunk([], 2);               // []

// Alternative one-liner (show you know Array.from):
const chunk2 = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
```

---

## 18. intersection / difference / union

```js
// Key insight: convert arrays to Sets for O(1) lookup.
// Interviewers often want ALL three in one question.

// intersection: elements present in BOTH arrays
function intersection(a, b) {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item)); // O(n) — no nested loops
}

// difference: elements in `a` but NOT in `b`  (a - b)
function difference(a, b) {
  const setB = new Set(b);
  return a.filter((item) => !setB.has(item));
}

// union: all unique elements from BOTH arrays
function union(a, b) {
  return [...new Set([...a, ...b])]; // spread both into a Set, then back to array
}

// Usage:
const x = [1, 2, 3, 4];
const y = [3, 4, 5, 6];

intersection(x, y); // [3, 4]
difference(x, y);   // [1, 2]
union(x, y);        // [1, 2, 3, 4, 5, 6]

// Symmetric difference (bonus): elements in either, but NOT both
function symmetricDifference(a, b) {
  return [
    ...difference(a, b),
    ...difference(b, a),
  ];
}
symmetricDifference(x, y); // [1, 2, 5, 6]
```

---

## 19. getNestedValue

```js
// Key insight: split the path string on '.' and reduce over the segments.
// Gotcha: any intermediate value could be null/undefined — must short-circuit safely.

function getNestedValue(obj, path, defaultValue = undefined) {
  // Split 'a.b.c' into ['a', 'b', 'c'] and walk the object
  const result = path.split('.').reduce((current, key) => {
    // If current is null/undefined, keep returning undefined rather than throwing
    return current != null ? current[key] : undefined;
  }, obj);

  return result !== undefined ? result : defaultValue;
}

// Usage:
const data = { user: { profile: { name: 'Alice', age: 30 } } };

getNestedValue(data, 'user.profile.name');  // 'Alice'
getNestedValue(data, 'user.profile.age');   // 30
getNestedValue(data, 'user.address.city');  // undefined — no throw
getNestedValue(data, 'user.address.city', 'Unknown'); // 'Unknown' — default value

// Also known as: _.get(obj, path, defaultValue) in Lodash
```

---

## 20. setNestedValue

```js
// Key insight: walk to the SECOND-TO-LAST key, then set the final key.
// Must CREATE intermediate objects if they don't exist — this is the tricky part.
// Gotcha: mutates the original object (acceptable in interviews — mention it).

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  // Walk to the parent of the target key
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    // If the next level doesn't exist or isn't an object, create it
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key]; // descend one level
  }

  // Set the value at the final key
  current[keys[keys.length - 1]] = value;
  return obj; // return mutated object for convenience
}

// Usage:
const config = { theme: { color: 'blue' } };

setNestedValue(config, 'theme.color', 'red');
console.log(config.theme.color); // 'red'

setNestedValue(config, 'user.profile.name', 'Alice'); // creates intermediate objects
console.log(config.user.profile.name); // 'Alice'
```

---

## 21. Observable (basic)

```js
// Key insight: an Observable is a lazy push-based data source.
// Unlike a Promise (single value, eager), an Observable can emit MULTIPLE values over time.
// subscribe() returns a function to UNSUBSCRIBE (teardown).
// Interviewers want: next, error, complete callbacks, and unsubscription.

class Observable {
  constructor(subscribeFn) {
    // subscribeFn is called lazily — only when someone subscribes
    this._subscribeFn = subscribeFn;
  }

  subscribe(observer) {
    // observer can be { next, error, complete } or just a function
    const obs = typeof observer === 'function'
      ? { next: observer, error: () => {}, complete: () => {} }
      : { next: () => {}, error: () => {}, complete: () => {}, ...observer };

    let isUnsubscribed = false;

    // Wrap each callback to guard against calls after unsubscription
    const safeObserver = {
      next: (val) => { if (!isUnsubscribed) obs.next(val); },
      error: (err) => { if (!isUnsubscribed) obs.error(err); },
      complete: () => { if (!isUnsubscribed) { obs.complete(); isUnsubscribed = true; } },
    };

    // Run the producer logic; it may return a teardown function
    const teardown = this._subscribeFn(safeObserver);

    // Return an unsubscribe function
    return function unsubscribe() {
      isUnsubscribed = true;
      if (typeof teardown === 'function') teardown(); // e.g., clearInterval
    };
  }
}

// Usage:
const interval$ = new Observable((observer) => {
  let count = 0;
  const id = setInterval(() => observer.next(count++), 1000);
  return () => clearInterval(id); // teardown: stops the interval on unsubscribe
});

const unsubscribe = interval$.subscribe({
  next: (val) => console.log('tick', val),
  error: (err) => console.error(err),
  complete: () => console.log('done'),
});

setTimeout(unsubscribe, 3500); // stop after ~3 ticks
```

---

## 22. sleep / delay

```js
// Key insight: wrap setTimeout in a Promise so you can await it.
// This is a building block for retry, polling, and rate limiting.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Usage:
async function example() {
  console.log('start');
  await sleep(1000);       // pauses execution for 1 second
  console.log('after 1s');
}

// Bonus: cancelable sleep using AbortSignal
function sleepCancelable(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

const controller = new AbortController();
sleepCancelable(5000, controller.signal).catch((e) => console.log(e.name)); // AbortError
controller.abort(); // cancel the sleep early
```

---

## 23. retry

```js
// Key insight: if the async function throws, catch the error and try again.
// Must track attempt count and wait between retries (exponential backoff is a bonus).
// Gotcha: the last attempt should PROPAGATE the error rather than swallow it.

async function retry(fn, times, delay = 0) {
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn();            // try to run the async function
    } catch (err) {
      if (attempt === times) throw err; // last attempt — give up and throw
      if (delay > 0) await sleep(delay); // optional wait before next try
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Usage:
let tries = 0;
async function unreliable() {
  tries++;
  if (tries < 3) throw new Error(`Failed attempt ${tries}`);
  return 'success';
}

retry(unreliable, 5, 100).then(console.log); // 'success' after 2 failures

// Exponential backoff variant:
async function retryWithBackoff(fn, times, baseDelay = 100) {
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === times) throw err;
      await sleep(baseDelay * 2 ** (attempt - 1)); // 100ms, 200ms, 400ms...
    }
  }
}
```

---

## 24. parseQueryString

```js
// Key insight: split on '&', then split each pair on '='.
// Gotcha: handle leading '?', decode URI components, handle repeated keys (array values).
// Interviewers often ask BOTH directions: parse AND stringify.

// Parse "?a=1&b=hello%20world" → { a: '1', b: 'hello world' }
function parseQueryString(queryString) {
  const result = {};
  // Remove leading '?' if present, then split into key=value pairs
  const pairs = queryString.replace(/^\?/, '').split('&');

  for (const pair of pairs) {
    if (!pair) continue; // skip empty strings from "?&" edge cases
    const [key, value = ''] = pair.split('='); // value defaults to '' if no '='
    const decodedKey = decodeURIComponent(key);
    const decodedValue = decodeURIComponent(value);

    if (result[decodedKey] !== undefined) {
      // Repeated key — convert to array (e.g., ?a=1&a=2 → { a: ['1','2'] })
      result[decodedKey] = [].concat(result[decodedKey], decodedValue);
    } else {
      result[decodedKey] = decodedValue;
    }
  }
  return result;
}

// Stringify { a: '1', b: 'hello world' } → "a=1&b=hello%20world"
function stringifyQueryString(params) {
  return Object.entries(params)
    .flatMap(([key, value]) => {
      // Handle array values: { a: ['1','2'] } → "a=1&a=2"
      if (Array.isArray(value)) {
        return value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
}

// Usage:
parseQueryString('?name=Alice&age=30');         // { name: 'Alice', age: '30' }
parseQueryString('?tag=js&tag=ts');             // { tag: ['js', 'ts'] }
parseQueryString('?q=hello%20world');           // { q: 'hello world' }

stringifyQueryString({ name: 'Alice', age: '30' }); // 'name=Alice&age=30'
stringifyQueryString({ tag: ['js', 'ts'] });         // 'tag=js&tag=ts'

// Native alternative (mention in interviews):
Object.fromEntries(new URLSearchParams('?a=1&b=2')); // { a: '1', b: '2' }
```

---

## 25. Trie

```js
// Key insight: each node has a map of children (one per character) and an `isEnd` flag.
// Insert: walk each character, create nodes as needed, mark end.
// Search: walk each character — if any node is missing, return false.
// startsWith: same as search but don't require `isEnd` at the final node.
// Used for: autocomplete, spell checkers, IP routing tables.

class TrieNode {
  constructor() {
    this.children = {}; // character → TrieNode
    this.isEnd = false; // true if a complete word ends here
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  // Insert a word character by character
  insert(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode(); // create node if path doesn't exist
      }
      node = node.children[char]; // descend
    }
    node.isEnd = true; // mark the end of the word
  }

  // Returns true if the exact word exists
  search(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) return false; // path broken
      node = node.children[char];
    }
    return node.isEnd; // must end at a word boundary
  }

  // Returns true if any inserted word starts with this prefix
  startsWith(prefix) {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children[char]) return false;
      node = node.children[char];
    }
    return true; // no isEnd check needed — prefix is enough
  }

  // Bonus: get all words with a given prefix (for autocomplete)
  suggest(prefix) {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children[char]) return []; // prefix not found
      node = node.children[char];
    }
    // DFS from the prefix node to collect all complete words
    const results = [];
    this._dfs(node, prefix, results);
    return results;
  }

  _dfs(node, current, results) {
    if (node.isEnd) results.push(current); // complete word found
    for (const [char, child] of Object.entries(node.children)) {
      this._dfs(child, current + char, results); // recurse with character appended
    }
  }
}

// Usage:
const trie = new Trie();
trie.insert('apple');
trie.insert('app');
trie.insert('application');
trie.insert('banana');

trie.search('app');         // true
trie.search('ap');          // false — not a complete word
trie.startsWith('ap');      // true
trie.suggest('app');        // ['app', 'apple', 'application']
trie.suggest('ban');        // ['banana']
```

---

## 26. Quick Reference — What Interviewers Watch For

### Closure Gotchas

```js
// WRONG: classic var-in-loop bug — all callbacks share the same `i`
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 3, 3, 3
}

// FIX 1: use `let` — block-scoped, a new binding per iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 0, 1, 2
}

// FIX 2: IIFE to capture the current value
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i); // prints 0, 1, 2
}

// Closure holds a REFERENCE to the variable, not a copy of its value
function makeCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    get: () => count, // both functions share the SAME `count` binding
  };
}
const counter = makeCounter();
counter.increment(); counter.increment();
counter.get(); // 2
```

---

### `this` Binding

```js
// `this` is determined by HOW a function is CALLED, not where it's defined.

// 1. Method call — `this` is the object before the dot
const obj = { name: 'obj', greet() { return this.name; } };
obj.greet(); // 'obj'

// 2. Regular function call — `this` is undefined (strict mode) or global
const fn = obj.greet;
fn(); // undefined — `this` is lost when you detach the method

// 3. Arrow functions — inherit `this` from ENCLOSING lexical scope (no own `this`)
class Timer {
  constructor() { this.ticks = 0; }
  start() {
    setInterval(() => this.ticks++, 1000); // arrow: `this` is the Timer instance
  }
}

// 4. Explicit binding — call, apply, bind
function greet(greeting) { return `${greeting}, ${this.name}`; }
greet.call({ name: 'Alice' }, 'Hello');        // 'Hello, Alice'
greet.apply({ name: 'Bob' }, ['Hi']);          // 'Hi, Bob'
const boundGreet = greet.bind({ name: 'Carol' });
boundGreet('Hey');                             // 'Hey, Carol'

// Gotcha: `this` in class methods passed as callbacks
class Button {
  handleClick() { console.log(this); } // `this` is lost if passed as a callback
}
const btn = new Button();
document.addEventListener('click', btn.handleClick);        // `this` is the element, not Button!
document.addEventListener('click', btn.handleClick.bind(btn)); // fixed
document.addEventListener('click', () => btn.handleClick()); // arrow wrapper also works
```

---

### Prototype Chain

```js
// Every object has a [[Prototype]] (accessible via __proto__ or Object.getPrototypeOf).
// Property lookup walks UP the chain until found or chain ends at null.

function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return `${this.name} makes a sound`; };

function Dog(name) { Animal.call(this, name); } // call parent constructor
Dog.prototype = Object.create(Animal.prototype); // inherit from Animal
Dog.prototype.constructor = Dog;                 // fix constructor reference
Dog.prototype.bark = function () { return 'Woof!'; };

const d = new Dog('Rex');
d.bark();           // 'Woof!' — own prototype
d.speak();          // 'Rex makes a sound' — inherited from Animal.prototype
d instanceof Dog;   // true
d instanceof Animal;// true — walks the chain

// Class syntax is syntactic sugar over the same prototype chain:
class Cat extends Animal {
  constructor(name) { super(name); } // same as Animal.call(this, name)
  purr() { return 'Purrr'; }
}
```

---

### Event Loop

```js
// Execution order: synchronous → microtasks → macrotasks (one at a time)
// Microtasks: Promise.then/catch/finally, queueMicrotask, MutationObserver
// Macrotasks: setTimeout, setInterval, setImmediate (Node), I/O callbacks

console.log('1 - sync');

setTimeout(() => console.log('2 - macrotask'), 0);

Promise.resolve().then(() => console.log('3 - microtask'));

console.log('4 - sync');

// Output: 1, 4, 3, 2
// Microtasks ALWAYS drain before the next macrotask runs — this is a common interview trap.

// Gotcha: microtasks can STARVE the event loop
function infiniteMicrotasks() {
  Promise.resolve().then(infiniteMicrotasks); // the page will freeze!
}

// async/await is syntactic sugar for Promises — the await point is a microtask boundary
async function example() {
  console.log('A');
  await Promise.resolve();  // pause — rest runs as a microtask
  console.log('B');         // runs after current sync code, before macrotasks
}
example();
console.log('C');
// Output: A, C, B
```

---

### Common Mistakes Interviewers Look For

```js
// 1. Mutating function parameters (objects are passed by reference)
function addProp(obj) {
  obj.extra = true; // MUTATES the caller's object — often unintentional
  return obj;
}
// Fix: return a new object: return { ...obj, extra: true };

// 2. Forgetting `await` in async functions
async function fetchData() {
  const data = fetch('/api/data'); // BUG: data is a Promise, not the response!
  return data.json();              // Error: data.json is not a function
}
// Fix: const data = await fetch('/api/data');

// 3. Array methods that DO and DON'T mutate:
const arr = [3, 1, 2];
arr.sort();       // MUTATES arr in place — common gotcha
arr.slice();      // does NOT mutate — returns new array
arr.splice(0, 1); // MUTATES arr — removes element
[...arr].sort();  // safe — sort a copy

// 4. typeof null === 'object' — historical JS bug
typeof null;       // 'object' — not 'null'!
null === null;     // true — use strict equality to check for null

// 5. NaN is not equal to itself
NaN === NaN;       // false — use Number.isNaN(x), not isNaN(x)
isNaN('hello');    // true — isNaN coerces to number first (surprising!)
Number.isNaN('hello'); // false — correct behavior

// 6. == coercion surprises — always use ===
0 == false;        // true
'' == false;       // true
null == undefined; // true (and null == null, but null !== 0)
[] == false;       // true — [] is coerced to ''

// 7. Async error handling — must catch at the right level
async function bad() {
  throw new Error('oops');
}
bad(); // UnhandledPromiseRejection — not caught!
// Fix: await bad() inside a try/catch, OR bad().catch(...)

// 8. Closure in loops (see closure section above for full example)
// Always use `let` or create a new scope when capturing loop variable.

// 9. Object.keys / for...in includes inherited keys
function Parent() {}
Parent.prototype.inherited = true;
const child = new Parent();
child.own = 1;
for (const k in child) console.log(k); // 'own', 'inherited' — includes prototype!
Object.keys(child);                     // ['own'] — only own enumerable keys (safer)

// 10. Spread operator is SHALLOW
const nested = { a: { b: 1 } };
const copy = { ...nested };
copy.a.b = 999;
console.log(nested.a.b); // 999 — nested objects are still shared references
```

---

*Last updated: 2026-05-16*
