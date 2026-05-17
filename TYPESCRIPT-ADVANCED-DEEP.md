# TypeScript Advanced Patterns — Senior Deep Reference

---

## Generics

```ts
// Basic generic
function identity<T>(val: T): T { return val }

// Multiple type params
function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((val, i) => [val, b[i]])
}

// Generic constraints — T must have .length
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b
}

// Default type parameter
type ApiResponse<T = unknown> = { data: T; status: number; message: string }
const res: ApiResponse<User> = { data: user, status: 200, message: 'ok' }
const raw: ApiResponse = { data: anything, status: 200, message: '' }

// Generic classes
class Repository<T extends { id: string }> {
  private items: T[] = []
  findById(id: string): T | undefined { return this.items.find(i => i.id === id) }
  save(item: T): void { this.items.push(item) }
}
```

---

## Conditional Types

```ts
// T extends U ? X : Y — evaluated at type level
type IsArray<T> = T extends any[] ? true : false
type A = IsArray<string[]>   // true
type B = IsArray<string>     // false

// Infer — extract type from structure
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never
type UnpackPromise<T> = T extends Promise<infer U> ? U : T
type ArrayElement<T> = T extends (infer E)[] ? E : never

type R = ReturnType<() => number>          // number
type U = UnpackPromise<Promise<string>>    // string
type E = ArrayElement<User[]>             // User

// Distributive conditional types — distributes over unions
type ToArray<T> = T extends any ? T[] : never
type D = ToArray<string | number>         // string[] | number[]
// Use [T] extends [any] to prevent distribution:
type ToArrayNoDist<T> = [T] extends [any] ? T[] : never
type ND = ToArrayNoDist<string | number>  // (string | number)[]

// Nested infer
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never
type FP = FirstParam<(a: string, b: number) => void>  // string

// Filter union types
type NonNullable<T> = T extends null | undefined ? never : T
type Defined = NonNullable<string | null | undefined>  // string
```

---

## Mapped Types

```ts
// Transform each property of a type
type Readonly<T> = { readonly [K in keyof T]: T[K] }
type Partial<T> = { [K in keyof T]?: T[K] }
type Required<T> = { [K in keyof T]-?: T[K] }   // -? removes optionality
type Mutable<T> = { -readonly [K in keyof T]: T[K] }

// Pick and Omit reimplemented
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
type MyOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] }

// Record
type MyRecord<K extends keyof any, V> = { [P in K]: V }
type PageMap = Record<'home' | 'about' | 'blog', { title: string }>

// Remap keys with as clause (TS 4.1+)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
type G = Getters<{ name: string; age: number }>
// { getName: () => string; getAge: () => number }

// Filter keys by value type
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}
type StringProps = PickByValue<{ a: string; b: number; c: string }, string>
// { a: string; c: string }
```

---

## Template Literal Types

```ts
// String manipulation at type level (TS 4.1+)
type EventName<T extends string> = `on${Capitalize<T>}`
type E = EventName<'click' | 'focus'>  // 'onClick' | 'onFocus'

// Route builder
type Routes = '/user' | '/post' | '/comment'
type ApiRoute = `/api${Routes}`  // '/api/user' | '/api/post' | '/api/comment'

// Deep key paths
type PathsOf<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends object
    ? PathsOf<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
    : `${Prefix}${K}`
}[keyof T & string]

type P = PathsOf<{ user: { name: string; age: number }; id: number }>
// 'user' | 'user.name' | 'user.age' | 'id'

// Extract event type from 'onChange', 'onClick' etc.
type EventType<T extends string> = T extends `on${infer E}` ? Uncapitalize<E> : never
type ET = EventType<'onClick' | 'onFocus'>  // 'click' | 'focus'

// Trim whitespace
type Trim<S extends string> =
  S extends ` ${infer R}` ? Trim<R> :
  S extends `${infer L} ` ? Trim<L> : S
```

---

## Discriminated Unions

```ts
// Each member has a common literal field (discriminant)
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2
    case 'rect': return shape.width * shape.height
    case 'triangle': return 0.5 * shape.base * shape.height
    // TypeScript enforces exhaustiveness — add new union member → error here
  }
}

// Exhaustiveness check helper
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`)
}
// Add as default: default: return assertNever(shape)

// Result type pattern (functional error handling)
type Ok<T> = { ok: true; value: T }
type Err<E> = { ok: false; error: E }
type Result<T, E = Error> = Ok<T> | Err<E>

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return { ok: false, error: 'Division by zero' }
  return { ok: true, value: a / b }
}

const res = divide(10, 2)
if (res.ok) console.log(res.value)   // narrowed to Ok<number>
else console.error(res.error)         // narrowed to Err<string>
```

---

## Utility Types (built-in + custom)

```ts
// Built-in (know these cold)
Partial<T>                    // all props optional
Required<T>                   // all props required
Readonly<T>                   // all props readonly
Record<K, V>                  // object type with keys K and values V
Pick<T, K>                    // subset of T's props
Omit<T, K>                    // T without K's props
Exclude<T, U>                 // union members in T but not U
Extract<T, U>                 // union members in T that are also in U
NonNullable<T>                // remove null | undefined
ReturnType<F>                 // return type of function
Parameters<F>                 // parameter types as tuple
ConstructorParameters<C>      // constructor parameter types
InstanceType<C>               // instance type of a class
Awaited<T>                    // unwrap Promise type (recursive)

// Custom utilities
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

type Nullable<T> = T | null
type Maybe<T> = T | null | undefined

// Flatten one level
type Flatten<T> = T extends Array<infer Item> ? Item : T

// Function overload types
type Overloaded = {
  (x: string): string
  (x: number): number
}
```

---

## `infer` Patterns

```ts
// Extract Promise value
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T

// Extract function params
type Params<T> = T extends (...args: infer P) => any ? P : never
type P = Params<(a: string, b: number) => void>  // [string, number]

// Last element of tuple
type Last<T extends any[]> = T extends [...infer _, infer L] ? L : never
type L = Last<[1, 2, 3]>  // 3

// Head of tuple
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never

// Tail of tuple
type Tail<T extends any[]> = T extends [any, ...infer T] ? T : never

// Extract constructor type
type Ctor<T> = T extends new (...args: infer A) => infer R
  ? { args: A; instance: R }
  : never

// Flatten nested promises
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T
type DA = DeepAwaited<Promise<Promise<string>>>  // string
```

---

## Decorators (TS 5+ — using `experimentalDecorators` or new standard)

```ts
// Class decorator
function Singleton<T extends new (...args: any[]) => {}>(Base: T) {
  let instance: InstanceType<T>
  return class extends Base {
    constructor(...args: any[]) {
      if (instance) return instance
      super(...args)
      instance = this as any
    }
  }
}

@Singleton
class Database { constructor(public url: string) {} }

// Method decorator
function Log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${key} with`, args)
    const result = original.apply(this, args)
    console.log(`${key} returned`, result)
    return result
  }
  return descriptor
}

// Property decorator
function Validate(min: number, max: number) {
  return function (target: any, key: string) {
    let val: number
    Object.defineProperty(target, key, {
      get: () => val,
      set: (v: number) => {
        if (v < min || v > max) throw new RangeError(`${key} must be ${min}–${max}`)
        val = v
      },
    })
  }
}
```

---

## Type Guards & Narrowing

```ts
// typeof — only works for primitives
function process(x: string | number) {
  if (typeof x === 'string') x.toUpperCase()  // narrowed to string
}

// instanceof
function format(x: Date | string) {
  if (x instanceof Date) return x.toISOString()
  return x
}

// in operator
type Fish = { swim: () => void }
type Bird = { fly: () => void }
function move(animal: Fish | Bird) {
  if ('swim' in animal) animal.swim()
  else animal.fly()
}

// User-defined type guard
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x && 'name' in x
}

// Assertion function (throws on invalid)
function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new TypeError('Expected string')
}
// After call: x is narrowed to string

// Zod for runtime + compile-time validation:
import { z } from 'zod'
const UserSchema = z.object({ id: z.string(), name: z.string(), age: z.number() })
type User = z.infer<typeof UserSchema>   // derive type from schema
const user = UserSchema.parse(rawData)   // runtime validated + typed
```

---

## Advanced Patterns

### Builder Pattern with Type Safety

```ts
class QueryBuilder<T extends Record<string, any> = {}> {
  private conditions: string[] = []

  where<K extends string, V>(key: K, val: V): QueryBuilder<T & Record<K, V>> {
    this.conditions.push(`${key} = ${JSON.stringify(val)}`)
    return this as any
  }

  build(): T { return {} as T }
}

const q = new QueryBuilder()
  .where('id', 1)       // QueryBuilder<{ id: number }>
  .where('name', 'Bob') // QueryBuilder<{ id: number; name: string }>
  .build()              // { id: number; name: string }
```

### Branded/Nominal Types

```ts
// Prevent mixing structurally identical types
type UserId = string & { readonly __brand: 'UserId' }
type OrderId = string & { readonly __brand: 'OrderId' }

function createUserId(id: string): UserId { return id as UserId }
function createOrderId(id: string): OrderId { return id as OrderId }

function getUser(id: UserId): User { /* ... */ }

const uid = createUserId('u-123')
const oid = createOrderId('o-456')

getUser(uid)  // ✅
getUser(oid)  // ❌ Type 'OrderId' is not assignable to type 'UserId'
getUser('u-123')  // ❌ plain string not accepted
```

### Variance (Covariance & Contravariance)

```ts
// Covariant: subtype can be used where supertype expected (function return types)
// Contravariant: supertype can be used where subtype expected (function params)

type Animal = { name: string }
type Dog = Animal & { breed: string }

// Covariant (return type): Dog → Animal ✅
type CoFn = () => Dog
const coFn: () => Animal = (() => ({ name: 'Rex', breed: 'Lab' })) // ✅

// Contravariant (param type): Animal → Dog (reverse!)
type ContraFn = (x: Animal) => void
const fn: (x: Dog) => void = (x: Animal) => {} // ✅ (Dog satisfies Animal)

// in/out markers (TS 4.7+)
type Provider<out T> = () => T          // covariant
type Consumer<in T> = (val: T) => void  // contravariant
```

---

## Common Interview Questions

```ts
// 1. Implement DeepReadonly
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T

// 2. Implement Pick
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }

// 3. Implement Exclude
type MyExclude<T, U> = T extends U ? never : T

// 4. Make all functions in object async
type Asyncify<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K]
}

// 5. Type-safe event emitter
type EventMap = { click: { x: number; y: number }; focus: void; blur: void }
class TypedEmitter<Events extends Record<string, any>> {
  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {}
  emit<K extends keyof Events>(event: K, data: Events[K]): void {}
}
const emitter = new TypedEmitter<EventMap>()
emitter.on('click', ({ x, y }) => {})  // x, y inferred
emitter.emit('click', { x: 1, y: 2 }) // enforced
```
