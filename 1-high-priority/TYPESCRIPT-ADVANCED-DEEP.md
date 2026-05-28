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
type ApiResponse<T = unknown>‼️ = { data: T; status: number; message: string }
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
type IsArray<T> = T extends any[] ? true : false;
type A = IsArray<string[]>; // true
type B = IsArray<string>; // false

// Infer — extract type from structure
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type UnpackPromise<T> = T extends Promise<infer U> ? U : T;
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type R = ReturnType<() => number>; // number
type U = UnpackPromise<Promise<string>>; // string
type E = ArrayElement<User[]>; // User

// Distributive conditional types — distributes over unions
type ToArray<T> = T extends any ? T[] : never;
type D = ToArray<string | number>; // string[] | number[]
// Use [T] extends [any] to prevent distribution:
type ToArrayNoDist<T> = [T] extends [any] ? T[] : never;
type ND = ToArrayNoDist<string | number>; // (string | number)[]

// Nested infer
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;
type FP = FirstParam<(a: string, b: number) => void>; // string

// Filter union types
type NonNullable<T> = T extends null | undefined ? never : T;
type Defined = NonNullable<string | null | undefined>; // string
```

---

## Mapped Types

```ts
// Transform each property of a type
type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Partial<T> = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] }; // -? removes optionality‼️
type Mutable<T> = { -readonly [K in keyof T]: T[K] };‼️

// Pick and Omit reimplemented
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] };

// Record
type MyRecord<K extends keyof any, V> = { [P in K]: V };
type PageMap = Record<'home' | 'about' | 'blog', { title: string }>;

// Remap keys with as clause (TS 4.1+)
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// Filter keys by value type
type PickByValue<T, V> = {
    [K in keyof T as T[K] extends V ? K : never]: T[K];
};
type StringProps = PickByValue<{ a: string; b: number; c: string }, string>;
// { a: string; c: string }
```

---

## Template Literal Types

```ts
// String manipulation at type level (TS 4.1+)
type EventName<T extends string> = `on${Capitalize<T>}`;
type E = EventName<'click' | 'focus'>; // 'onClick' | 'onFocus'

// Route builder
type Routes = '/user' | '/post' | '/comment';
type ApiRoute = `/api${Routes}`; // '/api/user' | '/api/post' | '/api/comment'

// Deep key paths
type PathsOf<T, Prefix extends string = ''> = {
    [K in keyof T & string]: T[K] extends object ? PathsOf<T[K], `${Prefix}${K}.`> | `${Prefix}${K}` : `${Prefix}${K}`;
}[keyof T & string];

type P = PathsOf<{ user: { name: string; age: number }; id: number }>;
// 'user' | 'user.name' | 'user.age' | 'id'

// Extract event type from 'onChange', 'onClick' etc.
type EventType<T extends string> = T extends `on${infer E}` ? Uncapitalize<E> : never;
type ET = EventType<'onClick' | 'onFocus'>; // 'click' | 'focus'

// Trim whitespace
type Trim<S extends string> = S extends ` ${infer R}` ? Trim<R> : S extends `${infer L} ` ? Trim<L> : S;
// This is a RECURSIVE type that removes spaces from both ends of a string type —
// like String.trim() but at the type level.‼️
//
// Breaking it down into 3 steps:
//   S extends ` ${infer R}` ? Trim<R> :    // Step 1: leading space?
//   S extends `${infer L} ` ? Trim<L> :    // Step 2: trailing space?
//   S;                                       // Step 3: no spaces, done!
//
// Step 1: S extends ` ${infer R}`
//   "Does S start with a space?"
//   ` ${infer R}` = a space followed by the REST of the string (captured as R)
//   If YES → call Trim<R> again (remove that leading space, check for more)
//
// Step 2: S extends `${infer L} `
//   "Does S end with a space?"
//   `${infer L} ` = the REST of the string (captured as L) followed by a space
//   If YES → call Trim<L> again (remove that trailing space, check for more)
//
// Step 3: S
//   No leading or trailing space → return S as-is. Done!
//
// Walk through: Trim<'  hello  '>
//
//   Trim<'  hello  '>
//   Step 1: '  hello  ' starts with a space? YES
//           infer R = ' hello  ' (everything after the first space)
//           → Trim<' hello  '>
//
//   Trim<' hello  '>
//   Step 1: ' hello  ' starts with a space? YES
//           infer R = 'hello  '
//           → Trim<'hello  '>
//
//   Trim<'hello  '>
//   Step 1: 'hello  ' starts with a space? NO
//   Step 2: 'hello  ' ends with a space? YES
//           infer L = 'hello '
//           → Trim<'hello '>
//
//   Trim<'hello '>
//   Step 1: starts with space? NO
//   Step 2: ends with space? YES
//           infer L = 'hello'
//           → Trim<'hello'>
//
//   Trim<'hello'>
//   Step 1: starts with space? NO
//   Step 2: ends with space? NO
//   Step 3: return 'hello' ✓
//
//   Final result: 'hello'
//
// It removes ONE space at a time, recursively, until no spaces remain on either end.
// It's like peeling layers — first all leading spaces (one by one), then all trailing spaces.‼️
// The key trick is RECURSION — Trim calls itself with one less space each time
// until there are no more spaces to remove.‼️
```

---

## Discriminated Unions

```ts
// Each member has a common literal field (discriminant)
type Shape = { kind: 'circle'; radius: number } | { kind: 'rect'; width: number; height: number } | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
    switch (shape.kind) {
        case 'circle':
            return Math.PI * shape.radius ** 2;
        case 'rect':
            return shape.width * shape.height;
        case 'triangle':
            return 0.5 * shape.base * shape.height;
        // TypeScript enforces exhaustiveness — add new union member → error here
    }
}

// Exhaustiveness check helper
function assertNever(x: never): never {
    throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}
// Add as default: default: return assertNever(shape)

// Result type pattern (functional error handling)
type Ok<T> = { ok: true; value: T };
type Err<E> = { ok: false; error: E };
type Result<T, E = Error> = Ok<T> | Err<E>;

function divide(a: number, b: number): Result<number, string> {
    if (b === 0) return { ok: false, error: 'Division by zero' };
    return { ok: true, value: a / b };
}

const res = divide(10, 2);
if (res.ok)
    console.log(res.value); // narrowed to Ok<number>
else console.error(res.error); // narrowed to Err<string>
```

---

## Utility Types (built-in + custom)

```ts
// Built-in (know these cold)
Partial<T>; // all props optional
Required<T>; // all props required
Readonly<T>; // all props readonly
Record<K, V>; // object type with keys K and values V
Pick<T, K>; // subset of T's props
Omit<T, K>; // T without K's props
Exclude<T, U>; // union members in T but not U
Extract<T, U>; // union members in T that are also in U
NonNullable<T>; // remove null | undefined
ReturnType<F>; // return type of function
Parameters<F>; // parameter types as tuple
ConstructorParameters<C>; // constructor parameter types
InstanceType<C>; // instance type of a class‼️
Awaited<T>; // unwrap Promise type (recursive)‼️

// Custom utilities
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

type Nullable<T> = T | null;
type Maybe<T> = T | null | undefined;

// Flatten one level
type Flatten<T> = T extends Array<infer Item> ? Item : T;

// Function overload types‼️
type Overloaded = {
    (x: string): string;
    (x: number): number;
};
```

---

## `infer` Patterns

```ts
// Extract Promise value
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// Extract function params
type Params<T> = T extends (...args: infer P) => any ? P : never;
type P = Params<(a: string, b: number) => void>; // [string, number]‼️

// Last element of tuple‼️
type Last<T extends any[]> = T extends [...infer _, infer L] ? L : never;
type L = Last<[1, 2, 3]>; // 3

// Head of tuple
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;

// Tail of tuple‼️
type Tail<T extends any[]> = T extends [any, ...infer T] ? T : never;

// Extract constructor type
type Ctor<T> = T extends new (...args: infer A) => infer R ? { args: A; instance: R } : never;

// Flatten nested promises
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;
type DA = DeepAwaited<Promise<Promise<string>>>; // string
```

---

## Decorators (TS 5+ — using `experimentalDecorators` or new standard)

```ts
// What are decorators?‼
// A decorator is a function that WRAPS a class, method, or property to add extra behavior —
// WITHOUT modifying the original code.
//
// Think of it like a gift wrapper:
//   You have a box (your class/method).
//   The decorator wraps it — adds a bow, a tag, glitter — but the box inside is unchanged.
//   When someone opens it, they get the box PLUS the extras.
//
// Why use decorators?
//   - Add behavior (logging, validation, caching) without cluttering the original code.
//   - Reusable — write the decorator once, apply it to many classes/methods with @.
//   - Common in frameworks: NestJS uses them heavily (@Controller, @Get, @Injectable).‼️
//
// Syntax: put @decoratorName right above the thing you're decorating.
//   @Singleton          ← decorating a class
//   class Database {}
//
//   @Log                ← decorating a method
//   getUser() {}
//
// There are 3 main types:
//   1. Class decorator — wraps the entire class (e.g., make it a Singleton)
//   2. Method decorator — wraps a method (e.g., add logging before/after)
//   3. Property decorator — intercepts a property (e.g., add validation on set)

// Class decorator
function Singleton<T extends new (...args: any[]) => {}>(Base: T) {
    let instance: InstanceType<T>;
    return class extends Base {
        constructor(...args: any[]) {
            if (instance) return instance;
            super(...args);
            instance = this as any;
        }
    };
}

@Singleton
class Database {
    constructor(public url: string) {}
}

// Method decorator
function Log(target: any, key: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = function (...args: any[]) {
        console.log(`Calling ${key} with`, args);
        const result = original.apply(this, args);
        console.log(`${key} returned`, result);
        return result;
    };
    return descriptor;
}

// Property decorator
function Validate(min: number, max: number) {
    return function (target: any, key: string) {
        let val: number;
        Object.defineProperty(target, key, {
            get: () => val,
            set: (v: number) => {
                if (v < min || v > max) throw new RangeError(`${key} must be ${min}–${max}`);
                val = v;
            },
        });
    };
}
```

---

## Type Guards & Narrowing

```ts
// typeof — only works for primitives‼️
function process(x: string | number) {
    if (typeof x === 'string') x.toUpperCase(); // narrowed to string
}

// instanceof
function format(x: Date | string) {
    if (x instanceof Date) return x.toISOString();
    return x;
}

// in operator
type Fish = { swim: () => void };
type Bird = { fly: () => void };
function move(animal: Fish | Bird) {
    if ('swim' in animal) animal.swim();
    else animal.fly();
}

// User-defined type guard
function isUser(x: unknown): x is User {
    return typeof x === 'object' && x !== null && 'id' in x && 'name' in x;
}

// Assertion function (throws on invalid)
function assertIsString(x: unknown): asserts x is string {
    if (typeof x !== 'string') throw new TypeError('Expected string');
}
// After call: x is narrowed to string

// Zod for runtime + compile-time validation:
import { z } from 'zod';
const UserSchema = z.object({ id: z.string(), name: z.string(), age: z.number() });
type User = z.infer<typeof UserSchema>; // derive type from schema
const user = UserSchema.parse(rawData); // runtime validated + typed‼️
```

---

## Advanced Patterns

### Builder Pattern with Type Safety

```ts
class QueryBuilder<T extends Record<string, any> = {}> {
    private conditions: string[] = [];

    where<K extends string, V>(key: K, val: V): QueryBuilder<T & Record<K, V>> {
        this.conditions.push(`${key} = ${JSON.stringify(val)}`);
        return this as any;
    }

    build(): T {
        return {} as T;
    }
}

const q = new QueryBuilder()
    .where('id', 1) // QueryBuilder<{ id: number }>
    .where('name', 'Bob') // QueryBuilder<{ id: number; name: string }>
    .build(); // { id: number; name: string }
```

### Branded/Nominal Types

```ts
// Prevent mixing structurally identical types
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function createUserId(id: string): UserId {
    return id as UserId;
}
function createOrderId(id: string): OrderId {
    return id as OrderId;
}

function getUser(id: UserId): User {
    /* ... */
}

const uid = createUserId('u-123');
const oid = createOrderId('o-456');

getUser(uid); // ✅
getUser(oid); // ❌ Type 'OrderId' is not assignable to type 'UserId'
getUser('u-123'); // ❌ plain string not accepted
```

### Variance (Covariance & Contravariance)

```ts
// Covariant: subtype can be used where supertype expected (function return types)‼️
// Contravariant: supertype can be used where subtype expected (function params)‼️

type Animal = { name: string };
type Dog = Animal & { breed: string };

// Covariant (return type): Dog → Animal ✅
type CoFn = () => Dog;
const coFn: () => Animal = () => ({ name: 'Rex', breed: 'Lab' }); // ✅

// Contravariant (param type): Animal → Dog (reverse!)
type ContraFn = (x: Animal) => void;
const fn: (x: Dog) => void = (x: Animal) => {}; // ✅ (Dog satisfies Animal)

// in/out markers (TS 4.7+)‼️
type Provider<out T> = () => T; // covariant
type Consumer<in T> = (val: T) => void; // contravariant
```

---

## Common Interview Questions

```ts
// 1. Implement DeepReadonly
type DeepReadonly<T> = T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
// This is a recursive type that makes EVERYTHING readonly — not just the top level,
// but all nested objects and arrays too.‼️
//
// Breaking it down into 3 steps:
//   T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> :   // Step 1: is it an array?
//   T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :  // Step 2: is it an object?
//   T;                                                          // Step 3: it's a primitive
//
// Step 1: T extends (infer U)[]
//   "Is T an array?"
//   (infer U)[] = an array of SOMETHING — capture that something as U
//   If YES → ReadonlyArray<DeepReadonly<U>>
//     - ReadonlyArray = makes the array itself readonly (can't push, pop, etc.)
//     - DeepReadonly<U> = recursively make each ELEMENT readonly too
//
//   What is ReadonlyArray?‼️
//     A built-in TypeScript type — it's an array you CAN'T modify.
//     Shorthand: readonly string[]
//     Regular array:   arr.push('d') ✅  arr[0] = 'z' ✅  arr.pop() ✅
//     ReadonlyArray:   arr.push('d') ❌  arr[0] = 'z' ❌  arr.pop() ❌
//     It removes all mutating methods: push, pop, shift, unshift, splice, sort, reverse.
//     Only read methods remain: map, filter, find, forEach, includes, indexOf, slice, etc.‼️
//     Think of it like: Readonly is for objects, ReadonlyArray is for arrays.‼️
//     Same idea — you can look but you can't touch.
//
// Step 2: T extends object
//   "Is T an object (but not an array, since arrays were caught in Step 1)?"
//   If YES → { readonly [K in keyof T]: DeepReadonly<T[K]> }
//     - readonly [K in keyof T] = make every property readonly
//     - DeepReadonly<T[K]> = recursively make each property's VALUE readonly too
//
// Step 3: T
//   "It's a primitive (string, number, boolean, etc.)"
//   Primitives are already immutable — nothing to do, return as-is.
//
// Walk through:
//   type User = {
//     name: string;
//     address: { city: string; zip: number };
//     tags: string[];
//   };
//   type ReadonlyUser = DeepReadonly<User>;
//
//   DeepReadonly<User>
//     User is an object → Step 2
//     { readonly [K in keyof User]: DeepReadonly<User[K]> }
//
//     K = 'name' → DeepReadonly<string>
//       string is a primitive → Step 3 → string
//       Result: readonly name: string
//
//     K = 'address' → DeepReadonly<{ city: string; zip: number }>
//       It's an object → Step 2 (recurse!)
//       { readonly city: DeepReadonly<string>, readonly zip: DeepReadonly<number> }
//       string and number are primitives → Step 3
//       Result: readonly address: { readonly city: string; readonly zip: number }
//
//     K = 'tags' → DeepReadonly<string[]>
//       string[] is an array → Step 1
//       (infer U) = string
//       ReadonlyArray<DeepReadonly<string>>
//       DeepReadonly<string> → primitive → string
//       Result: readonly tags: ReadonlyArray<string>
//
//   Final result:
//   {
//     readonly name: string;
//     readonly address: { readonly city: string; readonly zip: number };
//     readonly tags: ReadonlyArray<string>;
//   }
//
// Compare with regular Readonly<T>:‼️
//   Readonly<User> → only top level is readonly
//   user.name = 'x'          // ❌ blocked
//   user.address.city = 'x'  // ✅ ALLOWED! (Readonly doesn't go deep)
//
//   DeepReadonly<User> → EVERYTHING is readonly
//   user.name = 'x'          // ❌ blocked
//   user.address.city = 'x'  // ❌ blocked too!
//   user.tags.push('x')      // ❌ blocked! (ReadonlyArray has no push)
//
// The order of checks matters: arrays first (Step 1), then objects (Step 2).‼️
// Arrays must be checked first because arrays ARE objects in JavaScript —
// if you checked object first, arrays would match there and not get ReadonlyArray.

// 2. Implement Pick
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };

// 3. Implement Exclude
type MyExclude<T, U> = T extends U ? never : T;

// 4. Make all functions in object async
type Asyncify<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : T[K];
};

// 5. Type-safe event emitter
type EventMap = { click: { x: number; y: number }; focus: void; blur: void };
class TypedEmitter<Events extends Record<string, any>> {
    on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {}
    emit<K extends keyof Events>(event: K, data: Events[K]): void {}
}
const emitter = new TypedEmitter<EventMap>();
emitter.on('click', ({ x, y }) => {}); // x, y inferred
emitter.emit('click', { x: 1, y: 2 }); // enforced
```
