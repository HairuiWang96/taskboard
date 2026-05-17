# JavaScript Async — Senior Deep Reference

Covers: Promises internals, async/await edge cases, generators, async generators,
observables, cancellation, and the async patterns interviewers actually probe.

---

## The Microtask Queue (revisited)

```js
console.log('1')                          // sync
setTimeout(() => console.log('2'), 0)     // macrotask (timers phase)
Promise.resolve().then(() => console.log('3'))  // microtask
queueMicrotask(() => console.log('4'))    // microtask
console.log('5')                          // sync

// Output: 1, 5, 3, 4, 2
// Sync runs to completion → microtask queue drains → event loop continues
```

**Key rule:** microtasks (Promises, queueMicrotask) run after every task, before the next task.
This means a long microtask chain can starve I/O callbacks.

```js
// This starves the event loop — every .then schedules another microtask
function loop() { Promise.resolve().then(loop) }
loop() // ❌ nothing else runs

// Fix: use setImmediate or setTimeout to yield to macrotask queue
function loop() { setImmediate(loop) } // ✅ I/O still runs between iterations
```

---

## Promises — Internals & Edge Cases

### States and Transitions

```js
// Promise has 3 states: pending → fulfilled | rejected (irreversible)
const p = new Promise((resolve, reject) => {
  // Executor runs synchronously
  console.log('executor runs now')
  resolve(42)       // transitions to fulfilled — only first call matters
  resolve(100)      // ignored — already settled
  reject('error')   // ignored — already settled
})

// .then callbacks are always async (microtask), even if already resolved
p.then(v => console.log(v))
console.log('after .then registration')
// Output: "executor runs now", "after .then registration", 42
```

### Promise Chaining

```js
// Each .then returns a NEW promise — enables chaining
Promise.resolve(1)
  .then(v => v + 1)          // returns Promise<2>
  .then(v => v * 2)          // returns Promise<4>
  .then(v => { throw v })    // throws — next .then skipped
  .then(v => console.log('skipped'))
  .catch(e => console.log('caught:', e))  // 'caught: 4'

// Returning a promise from .then — flattens automatically (thenable)
fetch('/api/user')
  .then(res => res.json())   // res.json() returns Promise — unwrapped automatically
  .then(user => user.name)   // receives resolved value, not Promise<value>
```

### Promise Combinators

```js
// Promise.all — all resolve → resolves with array; any reject → rejects immediately
const [user, posts] = await Promise.all([fetchUser(1), fetchPosts(1)])
// Use when: independent parallel requests
// Risk: one failure cancels everything — use allSettled if you need all results

// Promise.allSettled — waits for ALL, returns status + value/reason for each
const results = await Promise.allSettled([p1, p2, p3])
results.forEach(r => {
  if (r.status === 'fulfilled') console.log(r.value)
  else console.error(r.reason)
})
// Use when: you want all results regardless of individual failures

// Promise.race — first to settle (resolve OR reject) wins
const result = await Promise.race([fetchWithTimeout(url, 3000), timeout(3000)])
// Use when: implementing timeouts, fastest-responder wins

// Promise.any — first to RESOLVE wins (ignores rejections unless all reject)
const fastest = await Promise.any([cdn1.fetch(url), cdn2.fetch(url)])
// AggregateError if all reject
// Use when: trying multiple sources, want first success

// Summary:
// all        → short-circuit on first reject
// allSettled → never short-circuits, always waits for all
// race       → short-circuit on first settle (resolve or reject)
// any        → short-circuit on first resolve (ignores rejects)
```

### Implement Promise.all from scratch

```js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = []
    let remaining = promises.length
    if (remaining === 0) { resolve(results); return }

    promises.forEach((p, i) => {
      Promise.resolve(p).then(val => {  // wrap in Promise.resolve to handle non-promises
        results[i] = val
        if (--remaining === 0) resolve(results)
      }, reject)  // any rejection → reject immediately
    })
  })
}
```

### Common Promise Mistakes

```js
// ❌ Missing return in .then (loses the chain)
fetch('/api/user')
  .then(res => { res.json() })  // returns undefined — .json() result dropped
  .then(user => user.name)      // user is undefined

// ✅ Always return
  .then(res => res.json())

// ❌ Promise constructor anti-pattern (wrapping existing promise)
const p = new Promise((resolve, reject) => {
  fetch('/api/user').then(resolve).catch(reject) // unnecessary wrapper
})

// ✅ Just use the promise directly
const p = fetch('/api/user')

// ❌ Unhandled rejection (crashes in Node 15+)
Promise.reject(new Error('oops'))  // no .catch

// ✅ Always handle rejections
p.catch(err => console.error(err))
// or use global handler:
process.on('unhandledRejection', (reason) => { /* log + exit */ })

// ❌ Swallowing errors silently
async function load() {
  try { return await fetch('/api') }
  catch { /* empty catch */ }  // caller doesn't know it failed
}

// ✅ Either handle meaningfully or re-throw
catch (err) { logger.error(err); throw err }
```

---

## async/await — Edge Cases

### async always returns a Promise

```js
async function getValue() { return 42 }
getValue()           // Promise<42>, not 42
await getValue()     // 42

async function throws() { throw new Error('fail') }
throws()             // Promise<rejected>
await throws()       // throws — must be caught
```

### await is not "blocking" — it yields to the event loop

```js
async function main() {
  console.log('A')
  await Promise.resolve()   // yields — other microtasks can run
  console.log('B')          // resumes after microtask queue drains
}
main()
console.log('C')
// A, C, B
```

### Sequential vs Parallel — critical performance difference

```js
// ❌ Sequential — total time = time1 + time2 + time3
const a = await fetchA()
const b = await fetchB()
const c = await fetchC()

// ✅ Parallel — total time = max(time1, time2, time3)
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()])

// ✅ Start all, await individually (same as Promise.all but more readable for some)
const pA = fetchA()
const pB = fetchB()
const a = await pA
const b = await pB
```

### async/await in loops

```js
const ids = [1, 2, 3, 4, 5]

// ❌ forEach ignores returned promises — fire and forget
ids.forEach(async id => await fetch(`/api/${id}`))
// Doesn't wait — all fire immediately, errors swallowed

// ✅ for...of — sequential
for (const id of ids) {
  const data = await fetch(`/api/${id}`)
}

// ✅ Promise.all — parallel
await Promise.all(ids.map(id => fetch(`/api/${id}`)))

// ✅ Controlled concurrency (p-limit pattern) — parallel but limit to N at once
async function withConcurrency(items, limit, fn) {
  const results = []
  const executing = []
  for (const item of items) {
    const p = fn(item).then(r => { executing.splice(executing.indexOf(p), 1); return r })
    results.push(p)
    executing.push(p)
    if (executing.length >= limit) await Promise.race(executing)
  }
  return Promise.all(results)
}
// Or use: p-limit, p-queue, bottleneck npm packages
```

### Error handling patterns

```js
// Wrap individual awaits when you need granular handling
async function loadDashboard(userId) {
  let user
  try {
    user = await fetchUser(userId)
  } catch (err) {
    // handle user fetch failure specifically
    return { error: 'User not found' }
  }

  const [posts, notifications] = await Promise.allSettled([
    fetchPosts(userId),
    fetchNotifications(userId),
  ])

  return {
    user,
    posts: posts.status === 'fulfilled' ? posts.value : [],
    notifications: notifications.status === 'fulfilled' ? notifications.value : [],
  }
}

// Helper: avoid try/catch noise (Go-style)
async function to<T>(p: Promise<T>): Promise<[null, T] | [Error, null]> {
  try { return [null, await p] }
  catch (e) { return [e as Error, null] }
}

const [err, user] = await to(fetchUser(id))
if (err) return handleError(err)
// user is narrowed — no try/catch needed inline
```

---

## Generators

```js
// Generator function — returns an iterator, pauses at each yield
function* counter(start = 0) {
  while (true) {
    const reset = yield start  // yield sends value out, receives value in (via .next(val))
    start = reset ?? start + 1
  }
}

const gen = counter(5)
gen.next()       // { value: 5, done: false }
gen.next()       // { value: 6, done: false }
gen.next(0)      // { value: 0, done: false } — reset to 0
gen.return(99)   // { value: 99, done: true } — force close

// Finite generator
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) yield i
}
[...range(0, 10, 2)]  // [0, 2, 4, 6, 8]

// Delegating generators
function* inner() { yield 1; yield 2 }
function* outer() { yield 0; yield* inner(); yield 3 }
[...outer()]  // [0, 1, 2, 3]

// Lazy infinite sequences (memory-efficient)
function* fibonacci() {
  let [a, b] = [0, 1]
  while (true) { yield a;[a, b] = [b, a + b] }
}
const fib = fibonacci()
Array.from({ length: 10 }, () => fib.next().value) // [0,1,1,2,3,5,8,13,21,34]
```

---

## Async Generators & for await...of

```js
// Async generator — yields promises, used with for await...of
async function* paginate(url) {
  let cursor = null
  do {
    const res = await fetch(`${url}?cursor=${cursor}`)
    const { data, nextCursor } = await res.json()
    yield data          // each page is a yielded value
    cursor = nextCursor
  } while (cursor)
}

// Consumer — processes each page as it arrives (no loading all into memory)
for await (const page of paginate('/api/users')) {
  for (const user of page) processUser(user)
}

// Async iterable from any data source
async function* fromStream(stream) {
  for await (const chunk of stream) yield chunk
}

// Real use: streaming LLM responses, file processing, WebSocket messages, SSE
async function* streamLLM(prompt) {
  const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ prompt }) })
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield decoder.decode(value)
  }
}

for await (const chunk of streamLLM('Hello')) {
  process.stdout.write(chunk)
}
```

---

## Cancellation

JavaScript Promises are **not natively cancellable**. Options:

### AbortController (fetch + native APIs)

```js
const controller = new AbortController()
const { signal } = controller

// Cancel after 5 seconds
const timeout = setTimeout(() => controller.abort('Timeout'), 5000)

try {
  const res = await fetch('/api/data', { signal })
  const data = await res.json()
  clearTimeout(timeout)
  return data
} catch (err) {
  if (err.name === 'AbortError') console.log('Request cancelled')
  else throw err
}

// Cancel from UI (e.g., component unmount)
controller.abort()
```

### Cancellable async function pattern

```js
function makeCancellable(promise) {
  let cancelled = false
  const wrapped = new Promise((resolve, reject) => {
    promise.then(
      val => cancelled ? reject({ cancelled: true }) : resolve(val),
      err => cancelled ? reject({ cancelled: true }) : reject(err)
    )
  })
  return { promise: wrapped, cancel: () => { cancelled = true } }
}

// In React (old pattern, use AbortController instead):
useEffect(() => {
  const { promise, cancel } = makeCancellable(fetchData())
  promise.then(setData).catch(err => { if (!err.cancelled) setError(err) })
  return cancel  // cleanup on unmount
}, [])
```

---

## Observables (RxJS)

```js
import { Observable, Subject, BehaviorSubject, fromEvent, interval } from 'rxjs'
import { map, filter, debounceTime, switchMap, takeUntil } from 'rxjs/operators'

// Observable = lazy stream that can emit multiple values over time
// Promise = eager, single value
// Observable = lazy, multiple values, cancellable

// Creating
const obs$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  setTimeout(() => { subscriber.next(3); subscriber.complete() }, 1000)
  return () => { /* cleanup on unsubscribe */ }
})

const sub = obs$.subscribe({
  next: v => console.log(v),
  error: e => console.error(e),
  complete: () => console.log('done'),
})
sub.unsubscribe()  // cancel — triggers cleanup fn

// Common operators
fromEvent(input, 'keyup').pipe(
  debounceTime(300),            // wait 300ms after last event
  map(e => e.target.value),     // extract value
  filter(v => v.length > 2),   // ignore short queries
  switchMap(q => fetch(`/api/search?q=${q}`)),  // cancel prev, start new
).subscribe(results => render(results))

// Subject — both observable and observer (multicasts)
const subject$ = new Subject<number>()
subject$.subscribe(v => console.log('A:', v))
subject$.subscribe(v => console.log('B:', v))
subject$.next(1)  // both A and B receive 1

// BehaviorSubject — emits current value to new subscribers immediately
const state$ = new BehaviorSubject({ count: 0 })
state$.subscribe(s => console.log(s))  // immediately: { count: 0 }
state$.next({ count: 1 })              // { count: 1 }
state$.getValue()                       // { count: 1 } — sync access

// vs Promise:
// ✅ Observable: cancellable, multiple values, lazy, composable operators
// ✅ Promise: simpler, single value, native, easier to reason about
// Use Observable for: event streams, WebSocket, real-time data, complex async coordination
// Use Promise/async-await for: one-off HTTP calls, sequential async logic
```

---

## Interview Q&A — Async Focus

```text
Q: What's the difference between Promise.all and Promise.allSettled?
A: Promise.all short-circuits on the first rejection — if one fails, you get nothing.
   Promise.allSettled waits for all to finish regardless, returns an array of
   { status: 'fulfilled'|'rejected', value|reason } for each.
   Use allSettled when partial success is acceptable.

Q: Does await block the thread?
A: No. await yields control back to the event loop. The function is suspended
   but other code (I/O callbacks, other promises) can run while it waits.
   It looks synchronous but is non-blocking.

Q: Why doesn't forEach work with async/await?
A: forEach ignores the returned Promise from the async callback — it doesn't
   await it. Use for...of for sequential, or Promise.all(arr.map(...)) for parallel.

Q: What happens if you don't catch a rejected Promise?
A: In Node.js 15+, an unhandled rejection crashes the process.
   In browsers, it logs a warning and fires the unhandledrejection event.
   Always attach .catch() or use try/catch with await.

Q: Generators vs async/await?
A: async/await is syntactic sugar built on generators + Promises.
   Generators give you manual control over iteration and can yield any value.
   Use generators for: lazy sequences, custom iteration protocols, co-routines.
   Use async/await for: async operations — it's simpler and purpose-built.

Q: How do you cancel a fetch request?
A: AbortController. Pass signal to fetch, call controller.abort() to cancel.
   The fetch rejects with an AbortError. In React: call abort in useEffect cleanup.
```
