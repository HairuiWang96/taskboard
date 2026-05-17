# Design Patterns — Senior Developer Deep Reference
**Priority: LOW**

> Covers: Creational, Structural, and Behavioral patterns implemented in TypeScript/JavaScript, plus JS-specific patterns and interview questions.

---

## Table of Contents

1. [What Design Patterns Are](#1-what-design-patterns-are)
2. [Creational Patterns](#2-creational-patterns)
3. [Structural Patterns](#3-structural-patterns)
4. [Behavioral Patterns](#4-behavioral-patterns)
5. [JavaScript-Specific Patterns](#5-javascript-specific-patterns)
6. [Anti-Patterns to Know](#6-anti-patterns-to-know)
7. [Common Interview Questions](#7-common-interview-questions)

---

## 1. What Design Patterns Are

```text
Design patterns are reusable solutions to commonly occurring problems in software design.
Not code you copy — they're templates / vocabulary for describing solutions.

Three categories (GoF — Gang of Four, 1994):
  Creational: how objects are CREATED
  Structural: how objects are COMPOSED into larger structures
  Behavioral: how objects COMMUNICATE and distribute responsibility

When to use patterns:
  ✓ When you recognize a well-known problem
  ✓ When team communication benefits from shared vocabulary
  ✗ Don't force them — over-engineering is a real risk
  ✗ YAGNI: "You Aren't Gonna Need It" — solve the actual problem, not imagined future ones
```

---

## 2. Creational Patterns

### Singleton

```ts
// One instance only — everyone shares the same object
// Use for: database connections, config, loggers, caches

class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private pool: Pool;

  private constructor() {
    // Private constructor prevents direct instantiation
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  query(sql: string, params: unknown[]) {
    return this.pool.query(sql, params);
  }
}

const db1 = DatabaseConnection.getInstance();
const db2 = DatabaseConnection.getInstance();
db1 === db2; // true — same instance

// In TypeScript/Node.js modules — even simpler
// Module-level exports are already singletons (module is cached after first require/import)
// db/index.ts
export const db = drizzle(pool, { schema }); // imported once, shared everywhere
// This IS the Singleton pattern — just using module system instead of a class
```

### Factory

```ts
// Create objects without specifying the exact class
// Use for: when the type of object depends on runtime conditions

interface Notification {
  send(message: string): Promise<void>;
}

class EmailNotification implements Notification {
  constructor(private to: string) {}
  async send(message: string) { /* send email */ }
}

class SMSNotification implements Notification {
  constructor(private phone: string) {}
  async send(message: string) { /* send SMS */ }
}

class PushNotification implements Notification {
  constructor(private deviceToken: string) {}
  async send(message: string) { /* send push */ }
}

// Factory function
function createNotification(user: User): Notification {
  if (user.preferences.channel === 'email')  return new EmailNotification(user.email);
  if (user.preferences.channel === 'sms')    return new SMSNotification(user.phone);
  if (user.preferences.channel === 'push')   return new PushNotification(user.deviceToken);
  throw new Error(`Unknown notification channel: ${user.preferences.channel}`);
}

// Usage — caller doesn't know which class it's getting
const notification = createNotification(user);
await notification.send('Your appointment is tomorrow');
```

### Builder

```ts
// Construct complex objects step by step
// Use for: objects with many optional parameters, avoiding "telescoping constructors"

class QueryBuilder {
  private table: string = '';
  private conditions: string[] = [];
  private selectedColumns: string[] = ['*'];
  private limitValue: number | null = null;
  private orderByClause: string | null = null;

  from(table: string): this {
    this.table = table;
    return this; // return this for chaining
  }

  select(...columns: string[]): this {
    this.selectedColumns = columns;
    return this;
  }

  where(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = `${column} ${direction}`;
    return this;
  }

  build(): string {
    let query = `SELECT ${this.selectedColumns.join(', ')} FROM ${this.table}`;
    if (this.conditions.length > 0) query += ` WHERE ${this.conditions.join(' AND ')}`;
    if (this.orderByClause) query += ` ORDER BY ${this.orderByClause}`;
    if (this.limitValue) query += ` LIMIT ${this.limitValue}`;
    return query;
  }
}

// Fluent, readable, no constructor overload explosion
const query = new QueryBuilder()
  .from('users')
  .select('id', 'name', 'email')
  .where('active = true')
  .where('role = "admin"')
  .orderBy('name')
  .limit(10)
  .build();
// "SELECT id, name, email FROM users WHERE active = true AND role = "admin" ORDER BY name ASC LIMIT 10"

// Real-world: Drizzle ORM uses the Builder pattern
db.select({ id: users.id, name: users.name })
  .from(users)
  .where(and(eq(users.active, true), eq(users.role, 'admin')))
  .orderBy(users.name)
  .limit(10);
```

---

## 3. Structural Patterns

### Adapter

```ts
// Convert one interface into another — make incompatible interfaces work together
// Use for: integrating third-party libraries, legacy code, or external APIs

// Third-party payment SDK with its own interface
interface StripePayment {
  createCharge(amount: number, currency: string, token: string): Promise<{ id: string }>;
}

// Your app's payment interface
interface PaymentService {
  charge(params: { amountInCents: number; currency: string; cardToken: string }): Promise<string>;
}

// Adapter: makes Stripe look like your PaymentService interface
class StripeAdapter implements PaymentService {
  constructor(private stripe: StripePayment) {}

  async charge(params: { amountInCents: number; currency: string; cardToken: string }): Promise<string> {
    const result = await this.stripe.createCharge(
      params.amountInCents,
      params.currency,
      params.cardToken,
    );
    return result.id;
  }
}

// Your app only knows about PaymentService — switching payment providers = new adapter
const paymentService: PaymentService = new StripeAdapter(stripeClient);
const chargeId = await paymentService.charge({ amountInCents: 5000, currency: 'usd', cardToken: 'tok_visa' });
```

### Decorator

```ts
// Wrap an object to add behavior — without modifying the original class
// Use for: logging, caching, validation, retry logic, rate limiting

interface UserService {
  getUser(id: string): Promise<User | null>;
  createUser(data: CreateUserInput): Promise<User>;
}

// Base implementation
class UserServiceImpl implements UserService {
  async getUser(id: string) { return db.select().from(users).where(eq(users.id, id)).get() ?? null; }
  async createUser(data: CreateUserInput) { return db.insert(users).values(data).returning().get(); }
}

// Caching decorator
class CachedUserService implements UserService {
  private cache = new Map<string, User>();

  constructor(private inner: UserService) {}

  async getUser(id: string): Promise<User | null> {
    if (this.cache.has(id)) return this.cache.get(id)!;
    const user = await this.inner.getUser(id);
    if (user) this.cache.set(id, user);
    return user;
  }

  async createUser(data: CreateUserInput): Promise<User> {
    const user = await this.inner.createUser(data);
    this.cache.set(user.id, user); // cache immediately
    return user;
  }
}

// Logging decorator
class LoggedUserService implements UserService {
  constructor(private inner: UserService) {}

  async getUser(id: string) {
    console.log(`[UserService] getUser(${id})`);
    const user = await this.inner.getUser(id);
    console.log(`[UserService] getUser → ${user ? 'found' : 'not found'}`);
    return user;
  }

  async createUser(data: CreateUserInput) {
    console.log('[UserService] createUser', data.email);
    const user = await this.inner.createUser(data);
    console.log('[UserService] createUser → id:', user.id);
    return user;
  }
}

// Compose decorators — logging wraps caching wraps real implementation
const userService = new LoggedUserService(
  new CachedUserService(
    new UserServiceImpl()
  )
);
```

### Facade

```ts
// Simple interface over a complex subsystem
// Use for: simplifying complex APIs, creating a clean boundary

// Complex subsystem
class EmailClient { async send(to: string, subject: string, body: string) {} }
class SMSClient   { async send(phone: string, message: string) {} }
class PushClient  { async send(deviceToken: string, payload: object) {} }
class TemplateEngine { render(template: string, vars: object): string { return ''; } }
class UserRepository { async find(id: string): Promise<User | null> { return null; } }

// Facade: one simple method that orchestrates all the complexity
class NotificationFacade {
  constructor(
    private email: EmailClient,
    private sms: SMSClient,
    private push: PushClient,
    private templates: TemplateEngine,
    private users: UserRepository,
  ) {}

  async sendAppointmentReminder(userId: string, appointmentDate: Date) {
    const user = await this.users.find(userId);
    if (!user) return;

    const message = this.templates.render('appointment-reminder', { date: appointmentDate });

    const promises = [];
    if (user.email)       promises.push(this.email.send(user.email, 'Appointment Reminder', message));
    if (user.phone)       promises.push(this.sms.send(user.phone, message));
    if (user.deviceToken) promises.push(this.push.send(user.deviceToken, { body: message }));

    await Promise.allSettled(promises);
  }
}

// Caller only knows about one method — complexity hidden behind facade
await notifications.sendAppointmentReminder(userId, appointmentDate);
```

### Proxy

```ts
// Substitute that controls access to another object
// Use for: lazy loading, access control, caching, logging

// JavaScript has a built-in Proxy — see JAVASCRIPT-DEEP.md Section 13
// Here's a TypeScript class-based proxy:

interface ImageLoader {
  load(url: string): Promise<string>;
}

// Proxy with caching and rate limiting
class CachingImageProxy implements ImageLoader {
  private cache = new Map<string, string>();
  private lastRequest = 0;
  private readonly minDelay = 100; // ms between requests

  constructor(private real: ImageLoader) {}

  async load(url: string): Promise<string> {
    if (this.cache.has(url)) return this.cache.get(url)!; // cached

    const now = Date.now();
    const wait = this.minDelay - (now - this.lastRequest);
    if (wait > 0) await delay(wait); // rate limiting

    this.lastRequest = Date.now();
    const result = await this.real.load(url);
    this.cache.set(url, result);
    return result;
  }
}
```

---

## 4. Behavioral Patterns

### Observer

```ts
// Objects (observers) subscribe to an event source (subject) and get notified
// Use for: event systems, state management, pub/sub, React state

type EventMap = {
  'task:created':  { task: Task };
  'task:completed': { taskId: string };
  'user:joined':   { user: User };
};

class EventEmitter<T extends Record<string, unknown>> {
  private listeners = new Map<keyof T, Set<(payload: T[keyof T]) => void>>();

  on<K extends keyof T>(event: K, handler: (payload: T[K]) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event)!;
    set.add(handler as (payload: T[keyof T]) => void);
    return () => set.delete(handler as (payload: T[keyof T]) => void); // unsubscribe fn
  }

  emit<K extends keyof T>(event: K, payload: T[K]): void {
    this.listeners.get(event)?.forEach(handler => handler(payload));
  }
}

const events = new EventEmitter<EventMap>();

// Subscribe
const unsub = events.on('task:created', ({ task }) => {
  sendNotification(`New task: ${task.title}`);
});

// Emit
events.emit('task:created', { task: newTask });

// Unsubscribe when done (prevent memory leaks)
unsub();

// React's useState/useEffect is Observer pattern:
// Components observe state; when state emits a change, observers re-render
```

### Strategy

```ts
// Define a family of algorithms, encapsulate each, make them interchangeable
// Use for: sorting strategies, payment methods, validation rules, file formats

interface SortStrategy<T> {
  sort(items: T[]): T[];
}

class BubbleSort<T> implements SortStrategy<T> {
  sort(items: T[]): T[] { /* bubble sort */ return items; }
}

class QuickSort<T> implements SortStrategy<T> {
  sort(items: T[]): T[] { /* quick sort */ return items; }
}

class TaskSorter {
  constructor(private strategy: SortStrategy<Task>) {}

  setStrategy(strategy: SortStrategy<Task>) {
    this.strategy = strategy;
  }

  sort(tasks: Task[]): Task[] {
    return this.strategy.sort(tasks);
  }
}

const sorter = new TaskSorter(new QuickSort());
sorter.sort(tasks); // uses QuickSort

sorter.setStrategy(new BubbleSort());
sorter.sort(tasks); // uses BubbleSort — same interface, different algorithm

// Simpler in functional style (functions as strategies):
type SortFn = (tasks: Task[]) => Task[];

const sortByDueDate: SortFn = tasks => [...tasks].sort((a, b) =>
  new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
);
const sortByPriority: SortFn = tasks => [...tasks].sort((a, b) =>
  priorityOrder[b.priority] - priorityOrder[a.priority]
);

function renderTasks(tasks: Task[], sortFn: SortFn) {
  return sortFn(tasks);
}
```

### Command

```ts
// Encapsulate a request as an object — supports undo, queuing, logging
// Use for: undo/redo, transaction logs, queued operations, macro recording

interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
}

class CreateTaskCommand implements Command {
  private createdTaskId: string | null = null;

  constructor(
    private title: string,
    private userId: string,
    private db: Database,
  ) {}

  async execute() {
    const [task] = await this.db.insert(tasks).values({
      title: this.title,
      userId: this.userId,
    }).returning();
    this.createdTaskId = task.id; // store for undo
  }

  async undo() {
    if (this.createdTaskId) {
      await this.db.delete(tasks).where(eq(tasks.id, this.createdTaskId));
    }
  }
}

class CommandHistory {
  private history: Command[] = [];

  async execute(command: Command) {
    await command.execute();
    this.history.push(command);
  }

  async undo() {
    const command = this.history.pop();
    if (command) await command.undo();
  }
}

const history = new CommandHistory();
await history.execute(new CreateTaskCommand('Write report', userId, db));
await history.undo(); // deletes the task
```

### Iterator

```ts
// Traverse a collection without exposing its internal structure
// JavaScript has this built in: Symbol.iterator, for..of, generators

// Custom paginated iterator (fetches pages on demand)
async function* paginatedUsers(pageSize = 20): AsyncGenerator<User> {
  let cursor: string | null = null;

  while (true) {
    const page = await db.select()
      .from(users)
      .where(cursor ? gt(users.id, cursor) : undefined)
      .limit(pageSize)
      .orderBy(users.id);

    for (const user of page) yield user;

    if (page.length < pageSize) break; // last page
    cursor = page[page.length - 1].id;
  }
}

// Caller just iterates — doesn't know about pagination
for await (const user of paginatedUsers()) {
  await sendEmail(user);
}

// Handles 1M users with constant memory — fetches one page at a time
```

---

## 5. JavaScript-Specific Patterns

### Module pattern

```ts
// Encapsulate private state — the original pattern before ES modules/classes

const counter = (() => {
  let count = 0; // private

  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
    reset: () => { count = 0; },
  };
})(); // IIFE — runs immediately, returns public API

counter.increment(); // 1
counter.increment(); // 2
counter.value();     // 2
// count is completely inaccessible from outside

// Modern equivalent: ES module with non-exported variables
// store.ts
let count = 0; // module-private (not exported)

export const increment = () => ++count;
export const getValue  = () => count;
```

### Mixin

```ts
// Add methods to a class without inheritance (composition over inheritance)

type Constructor<T = {}> = new (...args: any[]) => T;

// Mixin functions
function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
    updatedAt = new Date();
    touch() { this.updatedAt = new Date(); }
  };
}

function Activatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    isActive = true;
    activate() { this.isActive = true; }
    deactivate() { this.isActive = false; }
  };
}

class BaseEntity {
  constructor(public id: string) {}
}

// Compose mixins
const TimestampedActivatableEntity = Timestamped(Activatable(BaseEntity));

class Task extends TimestampedActivatableEntity {
  constructor(id: string, public title: string) {
    super(id);
  }
}

const task = new Task('1', 'Write report');
task.createdAt; // from Timestamped
task.isActive;  // from Activatable
task.touch();   // from Timestamped
```

### Pub/Sub (decoupled Observer)

```ts
// Unlike Observer, Pub/Sub uses a message broker — publishers and subscribers
// don't know about each other at all

class EventBus {
  private static channels = new Map<string, Set<Function>>();

  static publish(channel: string, data: unknown) {
    EventBus.channels.get(channel)?.forEach(fn => fn(data));
  }

  static subscribe(channel: string, handler: Function): () => void {
    if (!EventBus.channels.has(channel)) EventBus.channels.set(channel, new Set());
    EventBus.channels.get(channel)!.add(handler);
    return () => EventBus.channels.get(channel)?.delete(handler);
  }
}

// Publisher — has no reference to subscribers
EventBus.publish('task:created', { id: '1', title: 'Buy milk' });

// Subscriber — has no reference to publisher
const unsub = EventBus.subscribe('task:created', (task: Task) => {
  sendNotification(task);
});
```

---

## 6. Anti-Patterns to Know

```text
God Object:
  One class/module that knows too much and does too much.
  Sign: UserService that handles auth, emails, payments, AND user CRUD.
  Fix: Single Responsibility — split into focused services.

Spaghetti Code:
  Complex, tangled flow — hard to trace because of excessive state mutation,
  deeply nested callbacks, or unclear dependencies.

Premature Optimization:
  "The root of all evil" — optimizing before you know there's a performance problem.
  Fix: make it work, make it right, make it fast (in that order). Measure first.

Magic Numbers / Strings:
  Hardcoded values with no explanation.
  ✗ if (user.role === 3) { ... }
  ✓ const ADMIN_ROLE_ID = 3; if (user.role === ADMIN_ROLE_ID) { ... }

Cargo Cult Programming:
  Copying code/patterns without understanding why.
  "I'll add Redux because the last project used Redux."

Shotgun Surgery:
  A single change requires modifying many different files/classes.
  Sign of poor cohesion — related things are scattered.

Anemic Domain Model:
  Classes with only data (no behavior) — logic scattered in service layer.
  Opposite of OOP — the domain model has no intelligence.
```

---

## 7. Common Interview Questions

### "What is the Singleton pattern and what are its downsides?"

> Singleton ensures only one instance of a class exists. Use cases: database connection pool, config manager, logger. Downsides: global state (makes testing hard — you can't swap out a fake), tight coupling (code depends on the concrete class), violates single responsibility if it manages its own lifecycle. Modern alternative: dependency injection — inject the shared instance as a parameter rather than accessing it globally.

### "What is the difference between the Decorator and Proxy patterns?"

> Both wrap another object and implement the same interface. Proxy controls ACCESS to the object (lazy loading, access control, caching, rate limiting) — it's a stand-in that the subject doesn't know about. Decorator ADDS BEHAVIOR to the object — it enhances what the object does. Structurally identical; the intent differs. Proxy: "gatekeeping". Decorator: "enhancing".

### "What is the Observer pattern and where is it used in frontend?"

> Observer defines a one-to-many dependency: when one object (subject/observable) changes state, all dependent objects (observers) are notified. In frontend: React's state system (components observe state and re-render on change), EventEmitter, addEventListener, RxJS, Redux store. The key benefit: loose coupling between the subject and observers — they don't need references to each other.

### "When would you use the Strategy pattern?"

> When you have multiple algorithms/behaviors for the same task and want to switch between them at runtime, or configure them per use-case. Examples: different sorting algorithms, different payment methods, different file format exporters, different validation rules per user role. Avoids large if/else or switch blocks — add new strategies without touching existing code (Open/Closed Principle).

### "What is the Factory pattern?"

> A Factory abstracts object creation — the caller requests an object without knowing which concrete class it gets. The factory decides based on input. Use when: object creation is complex, the type depends on runtime conditions, you want to centralize creation logic. Example: `createNotification(user)` returns Email/SMS/Push notification based on user preferences — caller just calls `.send()`.

---

## Most Asked Design Patterns Interview Questions

### "What are the three categories of design patterns?"

> **Creational** — how objects are created: Singleton, Factory, Builder, Prototype. **Structural** — how objects are composed: Adapter, Decorator, Proxy, Facade, Composite. **Behavioral** — how objects communicate: Observer, Strategy, Command, Iterator, State. In interviews, know at least one from each category deeply and be able to explain why you'd use it.

### "What is the Singleton pattern and what are its downsides?"

> Ensures a class has only one instance and provides a global access point to it. Use cases: database connection pool, logger, config. Downsides: hard to test (global state, can't be mocked easily), introduces tight coupling, violates single responsibility (manages its own lifecycle). In modern JS/TS, module singletons (just export a single instance) are more idiomatic.

```ts
class Database {
    private static instance: Database;
    private constructor() {}  // prevent direct instantiation

    static getInstance(): Database {
        if (!Database.instance) Database.instance = new Database();
        return Database.instance;
    }

    query(sql: string) { /* ... */ }
}

// Module singleton (simpler, more idiomatic)
export const db = new Database();
```

### "What is the Observer pattern?"

> Defines a one-to-many dependency: when one object (subject/publisher) changes state, all its dependents (observers/subscribers) are notified automatically. Foundation of event-driven programming. Used everywhere: DOM events, React state, RxJS, EventEmitter, Redux.

```ts
class EventEmitter<T> {
    private listeners: Map<string, ((data: T) => void)[]> = new Map();

    on(event: string, fn: (data: T) => void) {
        (this.listeners.get(event) ?? this.listeners.set(event, []).get(event)!).push(fn);
    }

    emit(event: string, data: T) {
        this.listeners.get(event)?.forEach(fn => fn(data));
    }

    off(event: string, fn: (data: T) => void) {
        const fns = this.listeners.get(event) ?? [];
        this.listeners.set(event, fns.filter(f => f !== fn));
    }
}
```

### "What is the Factory pattern?"

> Provides an interface for creating objects without specifying their concrete class — the factory decides which class to instantiate. Useful when the exact type to create depends on runtime conditions, or when you want to centralize complex creation logic.

```ts
interface Logger { log(msg: string): void; }
class ConsoleLogger implements Logger { log(msg: string) { console.log(msg); } }
class FileLogger implements Logger { log(msg: string) { /* write to file */ } }

class LoggerFactory {
    static create(type: 'console' | 'file'): Logger {
        switch (type) {
            case 'console': return new ConsoleLogger();
            case 'file': return new FileLogger();
        }
    }
}

const logger = LoggerFactory.create(process.env.LOG_TARGET as 'console' | 'file');
```

### "What is the Strategy pattern?"

> Defines a family of algorithms, encapsulates each one, and makes them interchangeable. The client selects the algorithm at runtime. Eliminates `if/else` or `switch` chains. Open/closed principle: add new strategies without modifying existing code.

```ts
type SortStrategy = (arr: number[]) => number[];

const quickSort: SortStrategy = (arr) => { /* ... */ return arr; };
const mergeSort: SortStrategy = (arr) => { /* ... */ return arr; };

class Sorter {
    constructor(private strategy: SortStrategy) {}
    sort(arr: number[]) { return this.strategy(arr); }
    setStrategy(strategy: SortStrategy) { this.strategy = strategy; }
}

const sorter = new Sorter(quickSort);
sorter.sort([3, 1, 2]);
sorter.setStrategy(mergeSort); // swap algorithm at runtime
```

### "What is the Decorator pattern?"

> Dynamically adds behavior to an object by wrapping it, without modifying the original class or using inheritance. Each decorator wraps the component and adds its behavior before/after delegating to the inner object. Used in: middleware pipelines, logging wrappers, caching layers.

```ts
interface DataSource { read(): string; write(data: string): void; }

class FileDataSource implements DataSource { /* basic file read/write */ }

class EncryptionDecorator implements DataSource {
    constructor(private wrapped: DataSource) {}
    write(data: string) { this.wrapped.write(encrypt(data)); }
    read() { return decrypt(this.wrapped.read()); }
}

class CompressionDecorator implements DataSource {
    constructor(private wrapped: DataSource) {}
    write(data: string) { this.wrapped.write(compress(data)); }
    read() { return decompress(this.wrapped.read()); }
}

// Stack decorators: compression wraps encryption wraps file
const source = new CompressionDecorator(new EncryptionDecorator(new FileDataSource()));
```

### "What is the Command pattern?"

> Encapsulates a request as an object — with execute and undo methods. Decouples the sender from the receiver. Enables: undo/redo history, queuing operations, logging commands, macro recording.

```ts
interface Command { execute(): void; undo(): void; }

class TextEditor {
    text = '';
    history: Command[] = [];

    executeCommand(cmd: Command) {
        cmd.execute();
        this.history.push(cmd);
    }

    undoLast() {
        this.history.pop()?.undo();
    }
}

class InsertCommand implements Command {
    constructor(private editor: TextEditor, private text: string, private pos: number) {}
    execute() { this.editor.text = insert(this.editor.text, this.text, this.pos); }
    undo() { this.editor.text = remove(this.editor.text, this.text, this.pos); }
}
```

### "What is the Proxy pattern?"

> Provides a substitute that controls access to the real object. Can add: lazy initialization (create expensive object only when needed), access control, caching, logging, request throttling. JavaScript `Proxy` is a language-level implementation.

```ts
function createCachingProxy<T extends object>(target: T): T {
    const cache = new Map<string, unknown>();
    return new Proxy(target, {
        get(obj, prop: string) {
            const value = obj[prop as keyof T];
            if (typeof value === 'function') {
                return (...args: unknown[]) => {
                    const key = `${prop}:${JSON.stringify(args)}`;
                    if (cache.has(key)) return cache.get(key);
                    const result = value.apply(obj, args);
                    cache.set(key, result);
                    return result;
                };
            }
            return value;
        }
    });
}
```

### "What is SOLID and why does it matter?"

> Five OOP design principles for maintainable, extensible code:
> - **S**ingle Responsibility — a class has one reason to change
> - **O**pen/Closed — open for extension, closed for modification (add new behavior without changing existing code)
> - **L**iskov Substitution — subclasses must be substitutable for their base class
> - **I**nterface Segregation — clients shouldn't depend on interfaces they don't use (many small interfaces > one big one)
> - **D**ependency Inversion — depend on abstractions, not concretions (inject dependencies rather than hardcoding them)
