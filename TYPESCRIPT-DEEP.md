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
// TypeScript uses structural typing (duck typing), not nominal typing
// Two types are compatible if they have the same shape — names don't matter

interface Point { x: number; y: number; }
interface Coordinate { x: number; y: number; }

const p: Point = { x: 1, y: 2 };
const c: Coordinate = p; // ✓ compatible — same structure

// Extra properties are allowed when assigningto a wider type
interface Named { name: string; }
const obj = { name: 'Alice', age: 30 }; // extra property: age
const named: Named = obj; // ✓ — obj has at least { name: string }

// But object literals trigger excess property checking
const named2: Named = { name: 'Alice', age: 30 }; // ✗ — excess property error
// Only on direct assignment — not when going through a variable first
```

### Type vs interface

```ts
// Interface: extendable, can be augmented (declaration merging), often preferred for objects
interface User {
  id: string;
  name: string;
}
interface User { // merges with above
  email: string;
}
// Result: User = { id, name, email }

// Type alias: can be anything (union, intersection, primitive, tuple, etc.)
type Id = string | number;
type Nullable<T> = T | null;
type Point = [number, number]; // tuple
type EventHandler = (event: Event) => void;

// Extending
interface Admin extends User { role: 'admin' }          // interface extends interface
type AdminUser = User & { role: 'admin' };               // type intersection
interface ExtendedUser extends User { role: string }     // interface extends type alias ✓

// Rule of thumb:
// - Use interface for object shapes you'll extend or implement
// - Use type for everything else (unions, aliases, complex types)
// - Be consistent within a project
```

### Literal types & type widening

```ts
// Literal type: the exact value
type Direction = 'north' | 'south' | 'east' | 'west';
type StatusCode = 200 | 201 | 400 | 404 | 500;

// Type widening: TypeScript "widens" inferred types by default
let x = 'hello'; // inferred as string (widened from 'hello')
const y = 'hello'; // inferred as 'hello' (const can't change → literal)

// Prevent widening with as const
const config = {
  endpoint: '/api',
  method: 'POST',
} as const;
// config.method is 'POST' (not string)
// config is Readonly — no mutation allowed

// Extract type from as const
const ROLES = ['admin', 'member', 'guest'] as const;
type Role = (typeof ROLES)[number]; // 'admin' | 'member' | 'guest'

// satisfies — validate shape without losing literal types
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, string | number[]>;
// palette.red is number[] (not string | number[])
// palette.green is string (not string | number[])
// Without satisfies: type annotation widens to Record<string, string | number[]>
```

---

## 2. Generics

### Generic functions

```ts
// Generic: parameterize a type, like a function parameter for types
function identity<T>(value: T): T {
  return value;
}
identity(42);       // T inferred as number
identity('hello');  // T inferred as string
identity<boolean>(true); // explicit

// Multiple type parameters
function pair<A, B>(first: A, second: B): [A, B] {
  return [first, second];
}
pair('hello', 42); // [string, number]

// Generic constraints — T must have certain shape
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 30 };
getProperty(user, 'name'); // ✓ returns string
getProperty(user, 'age');  // ✓ returns number
getProperty(user, 'role'); // ✗ 'role' is not a key of user

// Default type parameter
function createArray<T = string>(length: number, fill: T): T[] {
  return Array.from({ length }, () => fill);
}
createArray(3, 'x');  // string[] — T inferred
createArray(3);       // would need fill to infer T — error; default kicks in if fill optional
```

### Generic interfaces and classes

```ts
// Generic interface
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

class UserRepository implements Repository<User> {
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
  isEmpty(): boolean { return this.items.length === 0; }
}

const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.pop(); // number | undefined
```

### Advanced generic patterns

```ts
// Infer from usage — let TypeScript figure out the type
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
first([1, 2, 3]);       // number | undefined
first(['a', 'b']);      // string | undefined

// Generic with conditional
type NonNullable<T> = T extends null | undefined ? never : T;

// Variadic tuple types (TypeScript 4.0+)
type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];
type ABC = Concat<[string, number], [boolean]>; // [string, number, boolean]

// Inferring tuple from function parameters
function zip<T extends unknown[], U extends unknown[]>(
  a: T, b: U
): { [K in keyof T]: [T[K], K extends keyof U ? U[K] : never] } {
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
type StrictUser = Required<Partial<User>>;

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
// { admin: string[]; user: string[] }

type Cache = Record<string, { data: unknown; expiry: number }>;

// Exclude<T, U> — from union T, remove members assignable to U
type NonAdmin = Exclude<'admin' | 'user' | 'guest', 'admin'>; // 'user' | 'guest'

// Extract<T, U> — from union T, keep only members assignable to U
type AdminOnly = Extract<'admin' | 'user' | 'guest', 'admin' | 'guest'>; // 'admin' | 'guest'

// NonNullable<T> — exclude null and undefined
type DefiniteString = NonNullable<string | null | undefined>; // string

// ReturnType<T> — extract return type of a function
async function fetchUser(id: string) { return { id, name: 'Alice' }; }
type UserResult = ReturnType<typeof fetchUser>; // Promise<{ id: string; name: string }>
type ResolvedUser = Awaited<ReturnType<typeof fetchUser>>; // { id: string; name: string }

// Parameters<T> — extract parameter types as tuple
function createTask(title: string, priority: number, tags: string[]) { ... }
type CreateTaskArgs = Parameters<typeof createTask>; // [string, number, string[]]

// ConstructorParameters<T> — parameter types of a constructor
type DateArgs = ConstructorParameters<typeof Date>; // []... various overloads

// InstanceType<T> — instance type of a constructor
class DatabaseConnection { query(sql: string): void {} }
type DBInstance = InstanceType<typeof DatabaseConnection>; // DatabaseConnection
```

---

## 4. Mapped Types

```ts
// Transform each property in a type

// Make all properties optional (reimplementing Partial)
type Optional<T> = {
  [K in keyof T]?: T[K];
};

// Make all properties nullable
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

// Make all properties readonly
type Immutable<T> = {
  readonly [K in keyof T]: T[K];
};

// Deep readonly (recursive)
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Flatten optional: make all properties required AND non-null
type Concrete<T> = {
  [K in keyof T]-?: NonNullable<T[K]>; // -? removes optionality
};

// Rename keys
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// Filter properties by type
type FilterByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};
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

// Unwrap array
type Unwrap<T> = T extends Array<infer U> ? U : T;
type C = Unwrap<string[]>; // string
type D = Unwrap<number>;   // number (not array, returns T)

// infer: extract a type from a position
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type E = UnwrapPromise<Promise<string>>; // string
type F = UnwrapPromise<number>;          // number

// Get return type of async function
type AsyncReturn<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never;

// Distribution over unions
// When T is a union, the conditional is applied to each member separately
type ToArray<T> = T extends any ? T[] : never;
type G = ToArray<string | number>; // string[] | number[]
// (not (string | number)[] — it distributes!)

// Prevent distribution with wrapping in tuple
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
const bad: Greeting = 'Hi there!';   // ✗

// HTTP methods + endpoints
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type Endpoint = '/users' | '/tasks' | '/auth';
type ApiRoute = `${Method} ${Endpoint}`;
// 'GET /users' | 'GET /tasks' | ... all combinations

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

// Path types for nested objects
type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]:
    T[K] extends object
      ? Paths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
      : `${Prefix}${K}`;
}[keyof T & string];

type UserPaths = Paths<{ name: string; address: { city: string; zip: string } }>;
// 'name' | 'address' | 'address.city' | 'address.zip'
```

---

## 7. Type Inference

```ts
// TypeScript infers types — you rarely need to annotate everything

// Inferred from assignment
const name = 'Alice';     // string
const count = 42;         // number
const flag = true;        // boolean
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
head([1, 2, 3]);     // T inferred as number
head(['a', 'b']);    // T inferred as string
```

---

## 8. Discriminated Unions

```ts
// Union of types with a common literal "discriminant" property
// TypeScript uses the discriminant to narrow the type in conditionals

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

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

// Exhaustiveness check — TypeScript catches missing cases
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

function area2(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'rectangle': return shape.width * shape.height;
    // Missing 'triangle' case
    default: return assertNever(shape); // ✗ Error: 'triangle' not assignable to never
  }
}

// API response pattern
type ApiResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; code: number }
  | { status: 'loading' };

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
type Action =
  | { type: 'INCREMENT'; payload: number }
  | { type: 'DECREMENT'; payload: number }
  | { type: 'RESET' }; // no payload

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT': return state + action.payload;
    case 'DECREMENT': return state - action.payload;
    case 'RESET': return 0; // action.payload doesn't exist here — TypeScript enforces it
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

// Namespace merging with functions (add properties to a function)
function log(message: string) { console.log(message); }
namespace log {
  export function error(message: string) { console.error(message); }
  export const prefix = '[App]';
}
log('hello');        // function call
log.error('oops');   // namespace property
```

### Module augmentation

```ts
// Extend types from external libraries — very common in frameworks

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

// Augmenting a third-party module's types
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
  public owner: string;         // accessible everywhere (default)
  private balance: number;      // only within this class
  protected accountType: string; // within this class and subclasses
  readonly id: string;          // can't be reassigned after construction

  // Private class fields (ES2022) — truly private, even at runtime
  #secret: string;

  // Parameter properties shorthand
  constructor(
    public owner: string,      // shorthand: declares AND assigns
    private balance: number,
    readonly id: string = crypto.randomUUID()
  ) {
    this.#secret = 'shhh';
  }
}

// Abstract classes — can't be instantiated, must be extended
abstract class Animal {
  abstract sound(): string; // subclasses MUST implement this

  move(): string { return 'moving'; } // concrete method
}

class Cat extends Animal {
  sound() { return 'meow'; } // must implement
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
  serialize() { return JSON.stringify(this); }
  deserialize(data: string) { Object.assign(this, JSON.parse(data)); }
  log() { console.log(this); }
}
```

---

## 11. Configuration Deep Dive

### tsconfig.json

```json
{
  "compilerOptions": {
    // Strictness
    "strict": true,               // enables all strict checks below
    "noImplicitAny": true,        // error when type is implicitly 'any'
    "strictNullChecks": true,     // null/undefined are not assignable to other types
    "strictFunctionTypes": true,  // stricter function type compatibility
    "noUncheckedIndexedAccess": true, // arr[0] is T | undefined, not T

    // Output
    "target": "ES2022",           // compile to this JS version
    "module": "ESNext",           // module system
    "moduleResolution": "Bundler", // how imports are resolved (Bundler for Vite)
    "outDir": "./dist",

    // Developer experience
    "sourceMap": true,            // enable source maps for debugging
    "declaration": true,          // emit .d.ts files (for libraries)
    "declarationMap": true,       // source maps for .d.ts files

    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]          // alias: import from '@/components/Button'
    },

    // JSX (React)
    "jsx": "react-jsx",           // automatic JSX transform (no import React needed)

    // Important flags
    "esModuleInterop": true,      // allows default import from CommonJS modules
    "skipLibCheck": true,         // skip type-checking .d.ts files (faster)
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,       // error on unused variables
    "noUnusedParameters": true,   // error on unused function parameters
    "noImplicitReturns": true,    // error if not all code paths return a value
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
    return this; // return this for chaining
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

const query = new QueryBuilder()
  .where('active = true')
  .where('role = "admin"')
  .orderBy('created_at DESC')
  .limit(20)
  .build();
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

emitter.on('user:login', ({ userId, timestamp }) => { // fully typed!
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

// Branded types: add a phantom type to create nominal distinction
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
async function typedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
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
async function validatedFetch<T>(
  url: string,
  schema: z.ZodType<T>,
  options?: RequestInit
): Promise<T> {
  const data = await typedFetch<unknown>(url, options);
  return schema.parse(data); // throws if data doesn't match schema
}

const user = await validatedFetch('/api/users/123', UserSchema);
// Both compile-time typed AND runtime validated
```

### Recursive types

```ts
// JSON type
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Tree structure
type TreeNode<T> = {
  value: T;
  children: TreeNode<T>[];
};

// Nested form errors
type FormErrors<T> = {
  [K in keyof T]?: T[K] extends object
    ? FormErrors<T[K]>  // recurse into nested objects
    : string;           // leaf = error message
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
a.notAMethod();     // ✓ TypeScript doesn't check anything on 'any'
a.toFixed(2);       // ✓ no error even though string doesn't have toFixed

// unknown: type-safe any — you must narrow before using
const b: unknown = 'hello';
b.toUpperCase();    // ✗ Error: can't use unknown without narrowing first

if (typeof b === 'string') {
  b.toUpperCase();  // ✓ narrowed to string inside the if
}

// Rule: use unknown when you don't know the type.
// Use any only when migrating JS to TS or as a last resort.
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
typeof x === 'string'        // typeof guard
x instanceof Date            // instanceof guard
x !== null                   // truthiness check
'name' in x                  // in guard
Array.isArray(x)             // Array check

// Type predicates — custom type guard
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;
}

if (isUser(data)) {
  data.name; // ✓ TypeScript narrows to User
}

// Assertion functions
function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== 'string') throw new Error('Not a string');
}
assertIsString(value); // after this, value is string
```

### "What is declaration merging and when would you use it?"

> Declaration merging is when TypeScript merges multiple declarations with the same name into a single definition. The most practical use is module augmentation: adding properties to types from external libraries. For example, after adding JWT verification middleware to Fastify, you augment `FastifyRequest` to include a `user` property so TypeScript knows it exists in route handlers. Without augmentation, you'd get type errors or need to cast to `any`.

### "Explain the difference between Readonly and as const."

```ts
// Readonly<T>: shallow immutability — properties can't be reassigned
// But nested objects CAN be mutated
const user: Readonly<User> = { name: 'Alice', address: { city: 'NY' } };
user.name = 'Bob';           // ✗ Error
user.address.city = 'LA';    // ✓ — address itself is readonly, but city inside is not

// as const: deep immutability of a literal value
// All properties become readonly, all values become literal types
const config = { theme: 'dark', fontSize: 16 } as const;
config.theme = 'light';     // ✗ Error
config.theme;               // type is 'dark' (literal, not string)

// as const is for values; Readonly<T> is for types
```

### "When would you use never?"

```ts
// never: a type with no values — represents the impossible

// 1. Function that never returns
function fail(message: string): never {
  throw new Error(message);
}

// 2. Exhaustiveness checking in switch statements
function handleShape(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'square': return shape.side ** 2;
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

// 4. Bottom type — nothing is assignable to never (except never itself)
```
