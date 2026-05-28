# TypeScript — Senior Developer Deep Reference

> Covers the type system deeply: generics, inference, mapped types, conditional types, and patterns used daily by senior engineers.

---

## Table of Contents

1. [Type System Fundamentals](#1-type-system-fundamentals)
2. [Generics](#2-generics)
3. [Utility Types](#3-utility-types)
4. [Mapped Types](#4-mapped-types)
5. [Conditional Types](#5-conditional-types)
6. [Template Literal Types](#6-template-literal-types)
7. [Type Inference](#7-type-inference)
8. [Discriminated Unions](#8-discriminated-unions)
9. [Declaration Merging & Module Augmentation](#9-declaration-merging--module-augmentation)
10. [Class Types](#10-class-types)
11. [Configuration Deep Dive](#11-configuration-deep-dive)
12. [Real-World Patterns](#12-real-world-patterns)
13. [Common Interview Questions](#13-common-interview-questions)

---

## 1. Type System Fundamentals

### Structural typing

```ts
// TypeScript uses structural typing ‼️ (duck typing), not nominal typing
// Two types are compatible if they have the same shape — names don't matter‼️

interface Point {
    x: number;
    y: number;
}
interface Coordinate {
    x: number;
    y: number;
}

const p: Point = { x: 1, y: 2 };
const c: Coordinate = p; // ✓ compatible — same structure

// Extra properties are allowed when assigningto a wider type‼️
interface Named {
    name: string;
}
const obj = { name: 'Alice', age: 30 }; // extra property: age
const named: Named = obj; // ✓ — obj has at least { name: string }

// But object literals trigger excess property checking‼️
const named2: Named = { name: 'Alice', age: 30 }; // ✗ — excess property error‼️
// Only on direct assignment — not when going through a variable first‼️
```

### Type vs interface

```ts
// Interface: extendable, can be augmented (declaration merging), often preferred for objects
interface User {
    id: string;
    name: string;
}
interface User {
    // merges with above
    email: string;
}
// Result: User = { id, name, email }

// Type alias: can be anything (union, intersection, primitive, tuple, etc.)
type Id = string | number;
type Nullable<T> = T | null;‼️
type Point = [number, number]; // tuple‼️
type EventHandler = (event: Event) => void;‼️

// Extending
interface Admin extends User {
    role: 'admin';
} // interface extends interface
type AdminUser = User & { role: 'admin' }; // type intersection
interface ExtendedUser extends User {
    role: string;
} // interface extends type alias ✓

// Rule of thumb:
// - Use interface for object shapes you'll extend or implement
// - Use type for everything else (unions, aliases, complex types)
// - Be consistent within a project
```

### Literal types & type widening

```ts
// Literal type: the exact value‼️
type Direction = 'north' | 'south' | 'east' | 'west';
type StatusCode = 200 | 201 | 400 | 404 | 500;

// Type widening: TypeScript "widens" inferred types by default‼️
let x = 'hello'; // inferred as string (widened from 'hello')‼️
const y = 'hello'; // inferred as 'hello' (const can't change → literal)‼️

// The `as` keyword has 4 different meanings in TypeScript:‼️
//
// 1. Type assertion — "trust me, I know the type"
//    const input = document.getElementById('name') as HTMLInputElement;
//    const value = someUnknown as string;
//    You're telling TypeScript: "I know more than you — treat this as this type."
//
// 2. `as const` — prevent type widening, make everything readonly and literal
//    const roles = ['admin', 'user'] as const;  // readonly ['admin', 'user'], not string[]
//    const config = { port: 3000 } as const;    // { readonly port: 3000 }, not { port: number }
//    Tells TypeScript: "don't widen this, keep the exact literal types."
//
// 3. Key remapping in mapped types — rename or filter keys‼️
//    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];  // rename keys
//    [K in keyof T as T[K] extends string ? K : never]: T[K];       // filter keys
//    The `as` here means: "transform the key into something else."
//
// 4. Import alias — rename an import
//    import { useState as useStateHook } from 'react';
//    import * as React from 'react';
//    Just renaming for convenience.
//
// Same keyword, 4 completely different uses — context determines the meaning.‼️

// Prevent widening with as const
const config = {
    endpoint: '/api',
    method: 'POST',
} as const;
// config.method is 'POST' (not string)
// config is Readonly — no mutation allowed‼️

// Extract type from as const‼️
const ROLES = ['admin', 'member', 'guest'] as const;
type Role = (typeof ROLES)[number]; ‼️ // 'admin' | 'member' | 'guest'

// satisfies — validate shape without losing literal types‼️
const palette = {
    red: [255, 0, 0],
    green: '#00ff00',
} satisfies Record<string, string | number[]>;
// palette.red is number[] (not string | number[])
// palette.green is string (not string | number[])
// Without satisfies: type annotation widens to Record<string, string | number[]>‼️
//
// Record<string, string | number[]> means: an object where every value can be
// EITHER string OR number[]. That's the shape requirement — each individual value
// must be one or the other.
//
// The problem is what happens AFTER TypeScript checks it:
//
// ❌ With type annotation (: ) — loses specificity:
//
//   const palette: Record<string, string | number[]> = {
//       red: [255, 0, 0],
//       green: '#00ff00',
//   };
//   palette.red    // type is: string | number[]  ← TypeScript FORGETS it's specifically number[]
//   palette.green  // type is: string | number[]  ← TypeScript FORGETS it's specifically string
//
//   palette.red.map(n => n * 2);  // ❌ ERROR! TypeScript thinks it might be a string
//
// ✓ With satisfies — keeps specificity:
//
//   const palette = {
//       red: [255, 0, 0],
//       green: '#00ff00',
//   } satisfies Record<string, string | number[]>;
//   palette.red    // type is: number[]  ← TypeScript REMEMBERS the specific type‼️
//   palette.green  // type is: string    ← TypeScript REMEMBERS the specific type
//
//   palette.red.map(n => n * 2);  // ✓ Works! TypeScript knows it's number[]
//
// The key difference:‼️
//   Type annotation (:) — validates the shape, then REPLACES the type with the
//     annotation. You lose specificity.‼️
//   satisfies — validates the shape, but KEEPS the original inferred types.
//     You get both safety AND specificity.‼️
//
// You might think: each value IS either string or number[], so what's the problem?
// The issue isn't validation — both approaches catch errors.
// The issue is what TypeScript REMEMBERS afterward.‼️
// "satisfies" = "check that this matches the shape, but don't forget what each
//   value actually is."
```

---

## 2. Generics

### Generic functions

```ts
// Generic: parameterize a type, like a function parameter for types
function identity<T>(value: T): T {
    return value;
}
identity(42); // T inferred as number‼️
identity('hello'); // T inferred as string
identity<boolean>(true); // explicit‼️

// Multiple type parameters
function pair<A, B>(first: A, second: B): [A, B] {
    return [first, second];
}
pair('hello', 42); // [string, number]

// Generic constraints — T must have certain shape‼️
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const user = { name: 'Alice', age: 30 };
getProperty(user, 'name'); // ✓ returns string‼️
getProperty(user, 'age'); // ✓ returns number
getProperty(user, 'role'); // ✗ 'role' is not a key of user

// Default type parameter‼️
function createArray<T = string>(length: number, fill: T): T[] {
    return Array.from({ length }, () => fill);
}
createArray(3, 'x'); // string[] — T inferred‼️
createArray(3); ‼️// would need fill to infer T — error; default kicks in if fill optional
```

### Generic interfaces and classes

```ts
// Generic interface‼️
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

class UserRepository implements‼️ Repository<User> {
  async findById(id: string): Promise<User | null> { ... }
  async findAll(): Promise<User[]> { ... }
  async save(user: User): Promise<User> { ... }
  async delete(id: string): Promise<void> { ... }
}

// Generic class
class Stack<T> {
  private items: T[] = [];

  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
  get size(): number { return this.items.length; }
  // `get` is a getter — it lets you access a method like a property (no parentheses).‼️
  // With `get`:    stack.size    ← no parentheses, looks like a property
  // Without `get`: stack.size()  ← needs parentheses, it's a regular method call
  // ‼️ Getters are commonly used for computed values that feel like they should be
  // properties (like .length, .size) rather than function calls.
  // There's also `set` for setters:
  //   set size(value: number) { ... }  → stack.size = 10  ← assigns like a property
  isEmpty(): boolean { return this.items.length === 0; }
}

const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.pop(); // number | undefined
numberStack.size;  // 0 ← no parentheses because of `get` keyword
```

### Advanced generic patterns

```ts
// Infer from usage — let TypeScript figure out the type
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}
first([1, 2, 3]); // number | undefined
first(['a', 'b']); // string | undefined

// Generic with conditional‼️
type NonNullable<T> = T extends null | undefined ? never : T;

// Variadic tuple types (TypeScript 4.0+)
type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];
type ABC = Concat<[string, number], [boolean]>; // [string, number, boolean]

// Inferring tuple from function parameters‼️
function zip<T extends unknown[], U extends unknown[]>(a: T, b: U): { [K in keyof T]: [T[K], K extends keyof U ? U[K] : never] } {
    // ...
}
```

---

## 3. Utility Types

```ts
// Built-in utility types — know all of these

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
};

// Partial<T> — all properties optional
type UserUpdate = Partial<User>; // { id?: string; name?: string; ... }

// Required<T> — all properties required (opposite of Partial)
// Use it when a type has optional properties and you want to force ALL of them to be provided.
type UserConfig = {
  name: string;
  theme?: string;    // optional
  locale?: string;   // optional
};
type StrictConfig = Required<UserConfig>;
// { name: string; theme: string; locale: string } ← theme and locale are now required

// Readonly<T> — all properties readonly
type ImmutableUser = Readonly<User>;
const user: ImmutableUser = { ... };
user.name = 'new'; // ✗ Error: readonly

// Pick<T, K> — keep only specified keys
type PublicUser = Pick<User, 'id' | 'name' | 'email'>;
type LoginData = Pick<User, 'email' | 'password'>;

// Omit<T, K> — exclude specified keys
type SafeUser = Omit<User, 'password'>; // everything except password
type UserWithoutMeta = Omit<User, 'id' | 'createdAt'>;

// Record<K, V> — object with keys K and values V
type RolePermissions = Record<User['role'], string[]>;
// { admin: string[]; user: string[] }‼️

type Cache = Record<string, { data: unknown; expiry: number }>;

// Exclude<T, U> — from union T, remove members assignable to U
type NonAdmin = Exclude<'admin' | 'user' | 'guest', 'admin'>; // 'user' | 'guest'

// Extract<T, U> — from union T, keep only members assignable to U
type AdminOnly = Extract<'admin' | 'user' | 'guest', 'admin' | 'guest'>; // 'admin' | 'guest'

// NonNullable<T> — exclude null and undefined‼️
type DefiniteString = NonNullable<string | null | undefined>; // string

// ReturnType<T> — extract return type of a function‼️
async function fetchUser(id: string) { return { id, name: 'Alice' }; }
type UserResult = ReturnType<typeof fetchUser>; //‼️ Promise<{ id: string; name: string }>
type ResolvedUser = Awaited<ReturnType<typeof fetchUser>>;‼️ // { id: string; name: string }

// Parameters<T> — extract parameter types as tuple‼️
function createTask(title: string, priority: number, tags: string[]) { ... }
type CreateTaskArgs = Parameters<typeof createTask>; // [string, number, string[]]‼️

// ConstructorParameters<T> — parameter types of a constructor‼️
type DateArgs = ConstructorParameters<typeof Date>; // []... various overloads

// InstanceType<T> — instance type of a constructor
class DatabaseConnection { query(sql: string): void {} }
type DBInstance = InstanceType<typeof DatabaseConnection>; // DatabaseConnection‼️
```

---

## 4. Mapped Types

```ts
// Transform each property in a type‼️

// Make all properties optional (reimplementing Partial)
type Optional<T> = {
    [K in keyof T]?: T[K];‼️
};

// Make all properties nullable
type Nullable<T> = {
    [K in keyof T]: T[K] | null;
};

// Make all properties readonly
type Immutable<T> = {
    readonly [K in keyof T]: T[K];
};

// Deep readonly (recursive)‼️
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Flatten optional: make all properties required AND non-null
type Concrete<T> = {
    [K in keyof T]-?: NonNullable<T[K]>; // -? removes optionality‼️
};

// Rename keys‼️
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
//1. string & K — ensures K is treated as a string type. keyof T can technically include string | number | symbol, and Capitalize only works on strings. string & K filters it to "only the string keys."
//Capitalize<...> — a built-in TypeScript utility that uppercases the first letter of a string type.

type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// Filter properties by type‼️
type FilterByType<T, U> = {
    [K in keyof T as T[K] extends U ? K : never]: T[K];
};
// Breaking down: [K in keyof T as T[K] extends U ? K : never]: T[K]‼️
//
// Step by step:
//   1. K in keyof T — loop through every key in type T
//      (like 'id', 'name', 'email', 'role', 'createdAt')
//
//   2. as — remap/rename the key. Whatever comes after `as` becomes the new key name.‼️
//      This is where you can change or FILTER keys.‼️
//
//   3. T[K] extends U ? K : never — conditional check on each key:
//      - T[K] = the TYPE of the value at key K
//        (e.g., T['name'] = string, T['createdAt'] = Date)
//      - extends U = "is this value type assignable to U?"‼️
//      - If yes → K (keep the key as-is)
//      - If no → never (and `never` as a key REMOVES the property entirely)‼️
//
//   4. : T[K] — the value type stays the same
//
// Walk through with an example:
//   type User = { id: string; name: string; role: 'admin'|'user'; createdAt: Date };
//   type StringProps = FilterByType<User, string>;
//
//   K = 'id'        → T['id'] is string          → extends string? YES → keep 'id'
//   K = 'name'      → T['name'] is string         → extends string? YES → keep 'name'
//   K = 'role'      → T['role'] is 'admin'|'user' → extends string? YES → keep 'role'
//
//   Wait — 'admin'|'user' is a union of string literals, not just "string". Why does it extend string?‼️
//   Because string literals ARE strings — they're just more SPECIFIC strings.
//   Type hierarchy (from specific to broad):
//     'admin'              → string literal, can ONLY be 'admin'
//     'admin' | 'user'     → union of string literals, can ONLY be 'admin' or 'user'
//     string               → any string — 'hello', 'xyz', anything
//   The rule: `extends` means "is assignable to" / "is a subset of"
//     'admin' extends string            → YES — 'admin' is a string
//     'admin' | 'user' extends string   → YES — both are strings
//     string extends 'admin'            → NO — string is broader than 'admin'
//   Think of it like: string = any fruit, 'admin'|'user' = only apples and oranges.
//   Apples and oranges ARE fruits → extends string? YES.
//
//   What about `as const` — does that change anything?‼️
//     const role = 'admin' as const;  → type is 'admin' (not widened to string)
//     But 'admin' extends string → still YES. Always true, with or without as const.
//     `as const` doesn't create a new kind of type.‼️
//     It just tells TypeScript: "don't widen this to string, keep it as 'admin'."
//     'admin' was always a string — as const just makes TypeScript REMEMBER
//     that it's specifically 'admin' rather than forgetting and calling it string.
//     Similar to `satisfies` in spirit — both are about keeping TypeScript from
//     forgetting specificity. But the specific type ('admin') is always a string underneath.‼️
//
//   K = 'createdAt' → T['createdAt'] is Date      → extends string? NO  → never (removed!)
//
//   Result: { id: string; name: string; role: 'admin' | 'user' }
//   createdAt is gone because Date doesn't extend string.
//
// The key trick: `as never` removes a key from the type.‼️
// That's how filtering works — any key you don't want, you map to `never` and it disappears.

// When a key becomes never, TypeScript skips the entire property — both the key AND the value. The : T[K] part never even runs for that key.
// never in TypeScript means "this cannot exist." So a key that is never = "this property cannot exist" = the whole property (key + value) is removed from the type.
// It's a special behavior built into mapped types — TypeScript treats never keys as "delete this entry."

type StringProps = FilterByType<User, string>; // only string properties

// Create event handler types from event names
type Events = 'click' | 'focus' | 'blur';
type EventHandlers = {
    [E in Events as `on${Capitalize<E>}`]?: (event: Event) => void;
};
// { onClick?: ...; onFocus?: ...; onBlur?: ... }
```

---

## 5. Conditional Types

```ts
// T extends U ? True : False

// Simple conditional
type IsString<T> = T extends string ? true : false;
type A = IsString<string>; // true
type B = IsString<number>; // false

// Unwrap array‼️
type Unwrap<T> = T extends Array<infer U> ? U : T;‼️
type C = Unwrap<string[]>; // string
type D = Unwrap<number>; // number (not array, returns T)

// infer tells TypeScript: "I don't know this type yet — figure it out from the pattern."
// infer is like pattern matching — it's a "hole" that TypeScript fills in:
//   Array<infer U>    → extract element type from an array
//   Promise<infer U>  → extract resolved type from a promise
//   (infer A) => infer B → extract parameter and return type from a function

// infer: extract a type from a position
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type E = UnwrapPromise<Promise<string>>; // string
type F = UnwrapPromise<number>; // number

// Get return type of async function
type AsyncReturn<T extends (...args: any[]) => Promise<any>> = T extends (...args: any[]) => Promise<infer R> ? R : never;

// Distribution over unions‼️
// When T is a union, the conditional is applied to each member separately
type ToArray<T> = T extends any ? T[] : never;
type G = ToArray<string | number>; // string[] | number[]
// (not (string | number)[] — it distributes!)

// Prevent distribution with wrapping in tuple‼️
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type H = ToArrayNonDist<string | number>; // (string | number)[]

// Practical: get all keys where value matches a type
type KeysOfType<T, U> = {
    [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

type StringKeys = KeysOfType<User, string>; // 'id' | 'name' | 'email' | 'password'
```

---

## 6. Template Literal Types

```ts
// Combine string literal types

type Greeting = `Hello, ${string}!`;
const g: Greeting = 'Hello, World!'; // ✓
const bad: Greeting = 'Hi there!'; // ✗

// HTTP methods + endpoints
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type Endpoint = '/users' | '/tasks' | '/auth';
type ApiRoute = `${Method} ${Endpoint}`;
// 'GET /users' | 'GET /tasks' | ... all combinations‼️

// CSS class builder
type Side = 'top' | 'right' | 'bottom' | 'left';
type Margin = `margin-${Side}`; // 'margin-top' | 'margin-right' | ...

// Event names
type EventNames<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventNames<'click' | 'focus' | 'blur'>;
// 'onClick' | 'onFocus' | 'onBlur'

// Getter/setter pairs
type Accessors<T extends string> = `get${Capitalize<T>}` | `set${Capitalize<T>}`;
type NameAccessors = Accessors<'name'>; // 'getName' | 'setName'

// Path types for nested objects‼️
type Paths<T, Prefix extends string = ''> = {
    [K in keyof T & string]: T[K] extends object ? Paths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}` : `${Prefix}${K}`;
}[keyof T & string];

type UserPaths = Paths<{ name: string; address: { city: string; zip: string } }>;
// 'name' | 'address' | 'address.city' | 'address.zip'‼️
```

---

## 7. Type Inference

```ts
// TypeScript infers types — you rarely need to annotate everything

// Inferred from assignment
const name = 'Alice'; // string
const count = 42; // number
const flag = true; // boolean
const arr = [1, 'a', true]; // (number | string | boolean)[]

// Inferred from function return
function add(a: number, b: number) {
    return a + b; // return type inferred as number — don't need ': number'
}

// Inferred from context (contextual typing)
const names = ['Alice', 'Bob', 'Charlie'];
names.forEach(name => {
    console.log(name.toUpperCase()); // name inferred as string from array
});

// typeof in type position
const defaultConfig = { host: 'localhost', port: 3000, debug: false };
type Config = typeof defaultConfig; // { host: string; port: number; debug: boolean }

// ReturnType and Parameters from existing functions
function createUser(name: string, role: 'admin' | 'user') {
    return { id: crypto.randomUUID(), name, role, createdAt: new Date() };
}
type User = ReturnType<typeof createUser>;
// { id: string; name: string; role: 'admin' | 'user'; createdAt: Date }

// Infer in generic functions
function head<T>(arr: [T, ...unknown[]]): T {
    return arr[0];
}
head([1, 2, 3]); // T inferred as number
head(['a', 'b']); // T inferred as string
```

---

## 8. Discriminated Unions

```ts
// Union of types with a common literal "discriminant" property
// TypeScript uses the discriminant to narrow the type in conditionals

type Shape = { kind: 'circle'; radius: number } | { kind: 'rectangle'; width: number; height: number } | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
    switch (shape.kind) {
        case 'circle':
            return Math.PI * shape.radius ** 2; // shape is { kind: 'circle'; radius: number }
        case 'rectangle':
            return shape.width * shape.height;
        case 'triangle':
            return (shape.base * shape.height) / 2;
    }
}

// Exhaustiveness check — TypeScript catches missing cases‼️
function assertNever(x: never): never {
    throw new Error(`Unexpected value: ${x}`);
}

function area2(shape: Shape): number {
    switch (shape.kind) {
        case 'circle':
            return Math.PI * shape.radius ** 2;
        case 'rectangle':
            return shape.width * shape.height;
        // Missing 'triangle' case
        default:
            return assertNever(shape); // ✗ Error: 'triangle' not assignable to never
    }
}

// API response pattern
type ApiResult<T> = { status: 'success'; data: T } | { status: 'error'; error: string; code: number } | { status: 'loading' };

function handleResult<T>(result: ApiResult<T>) {
    if (result.status === 'success') {
        console.log(result.data); // TypeScript knows data exists
    } else if (result.status === 'error') {
        console.error(result.error, result.code); // TypeScript knows error and code exist
    } else {
        // result.status === 'loading'
        showSpinner();
    }
}

// Real-world: action types in reducers
type Action = { type: 'INCREMENT'; payload: number } | { type: 'DECREMENT'; payload: number } | { type: 'RESET' }; // no payload

function reducer(state: number, action: Action): number {
    switch (action.type) {
        case 'INCREMENT':
            return state + action.payload;
        case 'DECREMENT':
            return state - action.payload;
        case 'RESET':
            return 0; // action.payload doesn't exist here — TypeScript enforces it
    }
}
```

---

## 9. Declaration Merging & Module Augmentation

### Declaration merging

```ts
// Interface merging — add properties across multiple declarations
interface Window {
    myCustomProp: string;
}
window.myCustomProp; // ✓ TypeScript knows about it

// Merging with library types
interface Request {
    user?: { id: string; role: string };
}

// Namespace merging with functions (add properties to a function)‼️
function log(message: string) {
    console.log(message);
}
namespace log {
    export function error(message: string) {
        console.error(message);
    }
    export const prefix = '[App]';
}
log('hello'); // function call
log.error('oops'); // namespace property
```

### Module augmentation

```ts
// Extend types from external libraries — very common in frameworks‼️

// Fastify: add user to request type
import 'fastify';
declare module 'fastify' {
    interface FastifyRequest {
        user: { id: string; role: string };
    }
}

// Express: similar pattern
import 'express';
declare module 'express-serve-static-core' {
    interface Request {
        user?: JwtPayload;
    }
}

// Augmenting a third-party module's types‼️
declare module 'some-library' {
    interface ExistingInterface {
        newMethod(): void; // add methods to existing interface
    }
}
```

---

## 10. Class Types

```ts
// Access modifiers
class BankAccount {
    public owner: string; // accessible everywhere (default)
    private balance: number; // only within this class
    protected accountType: string; // within this class and subclasses
    readonly id: string; // can't be reassigned after construction

    // Private class fields (ES2022) — truly private, even at runtime‼️
    #secret: string;

    // Parameter properties shorthand
    constructor(
        public owner: string, // shorthand: declares AND assigns
        private balance: number,
        readonly id: string = crypto.randomUUID(),
    ) {
        this.#secret = 'shhh';
    }
}

// Abstract classes — can't be instantiated, must be extended
abstract class Animal {
    abstract sound(): string; // subclasses MUST implement this

    move(): string {
        return 'moving';
    } // concrete method
}

class Cat extends Animal {
    sound() {
        return 'meow';
    } // must implement
}

// Interfaces for classes — define the public contract
interface Serializable {
    serialize(): string;
    deserialize(data: string): void;
}

interface Loggable {
    log(): void;
}

class User implements Serializable, Loggable {
    serialize() {
        return JSON.stringify(this);
    }
    deserialize(data: string) {
        Object.assign(this, JSON.parse(data));
    }
    log() {
        console.log(this);
    }
}
```

---

## 11. Configuration Deep Dive

### tsconfig.json

```json
{
    "compilerOptions": {
        // Strictness
        "strict": true, // enables all strict checks below
        "noImplicitAny": true, // error when type is implicitly 'any'
        "strictNullChecks": true, // null/undefined are not assignable to other types
        "strictFunctionTypes": true, // stricter function type compatibility
        "noUncheckedIndexedAccess": true, // arr[0] is T | undefined, not T

        // Output
        "target": "ES2022", // compile to this JS version
        "module": "ESNext", // module system
        "moduleResolution": "Bundler", // how imports are resolved (Bundler for Vite)‼️
        "outDir": "./dist",

        // Developer experience
        "sourceMap": true, // enable source maps for debugging‼️
        "declaration": true, // emit .d.ts files (for libraries)‼️
        "declarationMap": true, // source maps for .d.ts files‼️

        // Paths
        "baseUrl": ".",
        "paths": {
            "@/*": ["./src/*"] // alias: import from '@/components/Button'‼️
        },

        // JSX (React)
        "jsx": "react-jsx", // automatic JSX transform (no import React needed)

        // Important flags
        "esModuleInterop": true, // allows default import from CommonJS modules‼️
        "skipLibCheck": true, // skip type-checking .d.ts files (faster)
        "forceConsistentCasingInFileNames": true,
        "noUnusedLocals": true, // error on unused variables‼️
        "noUnusedParameters": true, // error on unused function parameters
        "noImplicitReturns": true // error if not all code paths return a value
    }
}
```

---

## 12. Real-World Patterns

### Builder pattern

```ts
class QueryBuilder<T> {
    private conditions: string[] = [];
    private _limit?: number;
    private _offset?: number;
    private _orderBy?: string;

    where(condition: string): this {
        this.conditions.push(condition);
        return this; // return this for chaining‼️
    }

    limit(n: number): this {
        this._limit = n;
        return this;
    }

    offset(n: number): this {
        this._offset = n;
        return this;
    }

    orderBy(field: string): this {
        this._orderBy = field;
        return this;
    }

    build(): string {
        let query = 'SELECT * FROM table';
        if (this.conditions.length) query += ` WHERE ${this.conditions.join(' AND ')}`;
        if (this._orderBy) query += ` ORDER BY ${this._orderBy}`;
        if (this._limit) query += ` LIMIT ${this._limit}`;
        if (this._offset) query += ` OFFSET ${this._offset}`;
        return query;
    }
}

const query = new QueryBuilder().where('active = true').where('role = "admin"').orderBy('created_at DESC').limit(20).build();
```

### Type-safe event emitter

```ts
type EventMap = {
    'user:login': { userId: string; timestamp: Date };
    'user:logout': { userId: string };
    'task:created': { taskId: string; title: string };
};

class TypedEventEmitter<T extends Record<string, unknown>> {
    private listeners = new Map<keyof T, Set<Function>>();

    on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(listener);
    }

    off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
        this.listeners.get(event)?.delete(listener);
    }

    emit<K extends keyof T>(event: K, data: T[K]): void {
        this.listeners.get(event)?.forEach(listener => listener(data));
    }
}

const emitter = new TypedEventEmitter<EventMap>();

emitter.on('user:login', ({ userId, timestamp }) => {
    // fully typed!
    console.log(`${userId} logged in at ${timestamp}`);
});

emitter.emit('user:login', { userId: '123', timestamp: new Date() }); // ✓
emitter.emit('user:login', { userId: '123' }); // ✗ missing timestamp
```

### Branded types (nominal typing)

```ts
// Problem: string is string — can pass userId where you need taskId
function getUser(id: string) { ... }
function getTask(id: string) { ... }

const userId = '123';
getTask(userId); // ✓ TypeScript allows — both are string!

// Branded types: add a phantom type to create nominal distinction‼️
type Brand<T, B> = T & { __brand: B };

type UserId = Brand<string, 'UserId'>;
type TaskId = Brand<string, 'TaskId'>;

function getUser(id: UserId) { ... }
function getTask(id: TaskId) { ... }

// Create branded values with a constructor
const createUserId = (id: string): UserId => id as UserId;
const createTaskId = (id: string): TaskId => id as TaskId;

const userId = createUserId('123');
const taskId = createTaskId('456');

getUser(userId); // ✓
getTask(userId); // ✗ Error: UserId is not assignable to TaskId — caught!
```

### Type-safe fetch wrapper

```ts
async function typedFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
}

// Usage
const user = await typedFetch<User>('/api/users/123');
const tasks = await typedFetch<Task[]>('/api/tasks');

// With Zod validation for runtime safety
async function validatedFetch<T>(url: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
    const data = await typedFetch<unknown>(url, options);
    return schema.parse(data); // throws if data doesn't match schema
}

const user = await validatedFetch('/api/users/123', UserSchema);
// Both compile-time typed AND runtime validated‼️
```

### Recursive types

```ts
// JSON type
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

// Tree structure
type TreeNode<T> = {
    value: T;
    children: TreeNode<T>[];
};

// Nested form errors
type FormErrors<T> = {
    [K in keyof T]?: T[K] extends object
        ? FormErrors<T[K]> // recurse into nested objects
        : string; // leaf = error message
};

type UserFormErrors = FormErrors<{ name: string; address: { city: string; zip: string } }>;
// { name?: string; address?: { city?: string; zip?: string } }

// Deep partial
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
```

---

## 13. Common Interview Questions

### "What is the difference between unknown and any?"

```ts
// any: disables type checking entirely — escape hatch
const a: any = 'hello';
a.notAMethod(); // ✓ TypeScript doesn't check anything on 'any'
a.toFixed(2); // ✓ no error even though string doesn't have toFixed

// unknown: type-safe any — you must narrow before using‼️
const b: unknown = 'hello';
b.toUpperCase(); // ✗ Error: can't use unknown without narrowing first‼️

if (typeof b === 'string') {
    b.toUpperCase(); // ✓ narrowed to string inside the if
}

// Rule: use unknown when you don't know the type.
// Use any only when migrating JS to TS or as a last resort.‼️
```

### "Explain type narrowing."

```ts
// TypeScript narrows the type based on control flow

function process(value: string | number | null) {
    if (value === null) {
        // value is null here
        return;
    }
    if (typeof value === 'string') {
        // value is string here
        return value.toUpperCase();
    }
    // value is number here
    return value.toFixed(2);
}

// Narrowing techniques:
typeof x === 'string'; // typeof guard
x instanceof Date; // instanceof guard
x !== null; // truthiness check
'name' in x; // in guard
Array.isArray(x); // Array check

// Type predicates — custom type guard‼️
function isUser(obj: unknown): obj is User {
    return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;
}

if (isUser(data)) {
    data.name; // ✓ TypeScript narrows to User‼️
}

// Assertion functions
function assertIsString(val: unknown): asserts val is string {
    if (typeof val !== 'string') throw new Error('Not a string');
}
assertIsString(value); // after this, value is string
```

### "What is declaration merging and when would you use it?"‼️

> Declaration merging is when TypeScript merges multiple declarations with the same name into a single definition. The most practical use is module augmentation: adding properties to types from external libraries. For example, after adding JWT verification middleware to Fastify, you augment `FastifyRequest` to include a `user` property so TypeScript knows it exists in route handlers. Without augmentation, you'd get type errors or need to cast to `any`.

### "Explain the difference between Readonly and as const."

```ts
// Readonly<T>: shallow immutability — properties can't be reassigned‼️
// But nested objects CAN be mutated‼️
const user: Readonly<User> = { name: 'Alice', address: { city: 'NY' } };
user.name = 'Bob'; // ✗ Error
user.address.city = 'LA'; // ✓ — address itself is readonly, but city inside is not‼️

// as const: deep immutability of a literal value‼️
// All properties become readonly, all values become literal types‼️
const config = { theme: 'dark', fontSize: 16 } as const;
config.theme = 'light'; // ✗ Error
config.theme; // type is 'dark' (literal, not string)

// as const is for values; Readonly<T> is for types‼️
```

### "When would you use never?"

```ts
// never: a type with no values — represents the impossible‼️

// 1. Function that never returns
function fail(message: string): never {
    throw new Error(message);
}

// 2. Exhaustiveness checking in switch statements
function handleShape(shape: Shape): number {
    switch (shape.kind) {
        case 'circle':
            return Math.PI * shape.radius ** 2;
        case 'square':
            return shape.side ** 2;
        default: {
            const _exhaustive: never = shape; // Error if Shape has unhandled cases
            return _exhaustive;
        }
    }
}

// 3. Filtering impossible branches
type StringOrNumber = string | number;
type OnlyString = StringOrNumber extends number ? never : StringOrNumber;
// never filters out of unions: string | never = string

// 4. Bottom type — nothing is assignable to never (except never itself)‼️
```

---

## Most Asked TypeScript Interview Questions

### "What is the difference between `interface` and `type`?"

> Both describe object shapes. Key differences: `interface` is extendable with `extends` and supports declaration merging (two `interface Foo` blocks merge into one). `type` is more powerful — can represent unions, intersections, primitives, tuples, and mapped/conditional types. In practice: use `interface` for object shapes that may be extended (API contracts, class blueprints), use `type` for unions, aliases, and complex type manipulations. Either works for most day-to-day cases.

```ts
interface Animal {
    name: string;
}
interface Dog extends Animal {
    breed: string;
}

// Declaration merging — adds to existing interface (useful for augmenting libs)
interface Window {
    myPlugin: MyPlugin;
}

// type for union — interface can't do this
type Status = 'idle' | 'loading' | 'success' | 'error';
type StringOrNumber = string | number;

// Intersection type
type AdminUser = User & { adminLevel: number };
```

### "What are generics and how do you constrain them?"

> Generics let you write reusable code that works with any type while maintaining type safety. The type is a parameter — specified at call/instantiation time. ‼️ Use `extends` to constrain what types are accepted.

```ts
// Without constraint — T could be anything
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

// With constraint — T must have an id property
function findById<T extends { id: number }>(items: T[], id: number): T | undefined {
    return items.find(item => item.id === id);
}

// Multiple type params
function merge<T, U>(a: T, b: U): T & U {
    return { ...a, ...b } as T & U;
}
```

### "What are TypeScript utility types?"

> Built-in generic types that transform existing types. The most important:

```ts
interface User {
    id: number;
    name: string;
    email: string;
    age: number;
}

Partial<User>; // all fields optional
Required<User>; // all fields required
Readonly<User>; // all fields read-only
Pick<User, 'id' | 'name'>; // only id and name
Omit<User, 'age'>; // everything except age
Record<string, User>; // { [key: string]: User }
Exclude<'a' | 'b' | 'c', 'a'>; // 'b' | 'c'
Extract<'a' | 'b' | 'c', 'a' | 'b'>; // 'a' | 'b'
NonNullable<string | null | undefined>; // string‼️
ReturnType<typeof someFunction>; // return type of the function
Parameters<typeof someFunction>; // tuple of param types‼️
```

### "What are discriminated unions?"

> A discriminated union is a union of types that all share a common literal property (the discriminant). TypeScript can narrow the type inside a switch/if by checking that property, giving you full type safety in each branch.

```ts
type Shape = { kind: 'circle'; radius: number } | { kind: 'rect'; width: number; height: number } | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
    switch (shape.kind) {
        case 'circle':
            return Math.PI * shape.radius ** 2;
        case 'rect':
            return shape.width * shape.height;
        case 'triangle':
            return 0.5 * shape.base * shape.height;
        // TypeScript errors if you add a new Shape variant and forget to handle it
    }
}
```

### "What are type guards?"

> Type guards narrow a union type within a conditional block. TypeScript understands `typeof`, `instanceof`, `in`, truthiness checks, and custom type guard functions (returning a type predicate `arg is Type`).

```ts
// typeof guard
function format(val: string | number) {
    if (typeof val === 'string') return val.toUpperCase(); // string here
    return val.toFixed(2); // number here
}

// instanceof guard
function handle(err: Error | string) {
    if (err instanceof Error) return err.message;
    return err;
}

// Custom type guard — use when the above aren't enough
function isUser(obj: unknown): obj is User {
    return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;
}
```

### "What are mapped types?"

> Mapped types transform every property in an existing type using a ‼️ for-in style loop over the keys. They're how utility types like `Partial`, `Readonly`, and `Record` are implemented.

```ts
// Reimplementing Partial from scratch
type MyPartial<T> = {
    [K in keyof T]?: T[K];
};

// Make all values a string
type Stringified<T> = {
    [K in keyof T]: string;
};

// Practical: form errors type mirrors form values type
type FormErrors<T> = {
    [K in keyof T]?: string;
};
type LoginForm = { email: string; password: string };
type LoginErrors = FormErrors<LoginForm>; // { email?: string; password?: string }
```

### "What are conditional types?"

> Conditional types choose a type based on a condition: `T extends U ? X : Y`. They enable powerful type-level logic. Used extensively in utility types and library types.

```ts
// NonNullable implemented with conditional type
type MyNonNullable<T> = T extends null | undefined ? never : T;

// Unwrap array element type
type ElementOf<T> = T extends (infer E)[] ? E : never;
type N = ElementOf<number[]>; // number

// Distribute over union automatically
type ToArray<T> = T extends any ? T[] : never;
type Arr = ToArray<string | number>; // string[] | number[]
```

### "What is `unknown` vs `any`?"

> `any` disables all type checking — you can do anything with it, and it spreads (assigning `any` to a typed variable makes that typed too). `unknown` is type-safe: you can assign anything TO `unknown`, but to use it, ‼️ you must first narrow the type. Always prefer `unknown` over `any` for values you truly don't know the type of (API responses, `catch` clause errors).

```ts
function processAny(val: any) {
    val.foo.bar.baz; // ✓ TypeScript allows it — but runtime error if wrong
}

function processUnknown(val: unknown) {
    val.foo;         // ✗ Error — must narrow first
    if (typeof val === 'string') {
        val.toUpperCase(); // ✓ string here
    }
}

// Best practice for catch
try { ... } catch (err) {
    if (err instanceof Error) console.error(err.message);
}
```

### "What is `never` and when do you use it?"

> `never` is the bottom type — no value can be assigned to it. It represents something that can never happen: a function that always throws, an infinite loop, or the exhausted branches of a union. Most useful as an "exhaustiveness check" — if TypeScript reaches a `never` assignment, it means you forgot to handle a union case.

```ts
function assertNever(x: never): never {
    throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

type Direction = 'north' | 'south' | 'east' | 'west';
function move(dir: Direction) {
    switch (dir) {
        case 'north':
            return 'N';
        case 'south':
            return 'S';
        case 'east':
            return 'E';
        // Forgot 'west' — TypeScript errors on the line below!
        default:
            return assertNever(dir);
    }
}
```

### "What is `as const` and when do you use it?"‼️

> `as const` tells TypeScript to infer the narrowest possible literal types and make everything `readonly`. Without it, TypeScript widens string literals to `string`, numbers to `number`, etc.

```ts
const config = {
    endpoint: '/api',
    retries: 3,
} as const;
// Type: { readonly endpoint: '/api'; readonly retries: 3 }
// Without as const: { endpoint: string; retries: number }

const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;
type Direction = (typeof DIRECTIONS)[number]; // 'north' | 'south' | 'east' | 'west'
```

### "What is the `infer` keyword?"

> `infer` is used inside conditional types to capture and name a type that TypeScript infers. It's how you extract sub-types from complex types — like the return type of a function, the element type of an array, or the resolved type of a Promise.

```ts
// Extract return type (already built-in as ReturnType<T>)
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Unwrap Promise
type Awaited<T> = T extends Promise<infer U> ? U : T;
type Data = Awaited<Promise<User[]>>; // User[]

// Extract first argument type
type FirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;
// Read it as: "If T is a function, extract the type of its FIRST argument and call it F.‼️
//  Otherwise return never."
//
// Breaking down the pattern:
//   (first: infer F, ...rest: any[]) => any
//    ↑               ↑                  ↑
//    first param:    remaining params:  return type:
//    capture as F    don't care         don't care
//
// Walk through:
//   type Fn1 = (name: string, age: number) => void;
//   type Result1 = FirstArg<Fn1>;
//   T = (name: string, age: number) => void
//   Does it match (first: infer F, ...rest: any[]) => any?
//   YES — first param is string, so infer F = string
//   ...rest captures [number] but we don't use it (any[])
//   => any matches => void (void is assignable to any)‼️
//   Return F → string ✓
//
//   type Fn2 = (id: number) => boolean;
//   type Result2 = FirstArg<Fn2>;
//   first param is number → infer F = number
//   ...rest = [] (no more params, still matches any[])‼️
//   Return F → number ✓
//
//   type Result3 = FirstArg<string>;
//   string is NOT a function
//   Doesn't match the pattern → return never
//
// So `infer F` captures the first parameter's type, `...rest: any[]` swallows
// all remaining parameters (we don't care about them), and `=> any` matches
// any return type.‼️
```
