# Software Principles — Deep Reference

## Core Design Principles

### SOLID

> Five object-oriented design principles for maintainable, extensible code. Coined by Robert C. Martin.

#### S — Single Responsibility Principle (SRP)
> A class/module should have one and only one reason to change. One responsibility = one axis of change. Not "do one thing" (too vague) but "be responsible to one actor." Violation: a `UserService` that handles business logic, DB queries, AND sends emails — three different reasons to change.

```ts
// ✗ Violation — handles data, validation, AND email
class UserService {
    createUser(data) {
        this.validate(data);
        this.db.insert(data);
        this.emailClient.sendWelcome(data.email); // ← different responsibility
    }
}

// ✓ Each class has one reason to change
class UserService {
    createUser(data) { this.db.insert(data); }
}
class UserValidator { validate(data) { /* ... */ } }
class WelcomeEmailSender { send(email) { /* ... */ } }
```

#### O — Open/Closed Principle (OCP)
> Software entities should be open for extension, closed for modification. Add new behavior by adding new code, not changing existing tested code. Achieved through abstractions (interfaces, base classes) and polymorphism.

```ts
// ✗ Violation — must modify every time a new shape is added
function totalArea(shapes) {
    return shapes.reduce((sum, s) => {
        if (s.type === 'circle') return sum + Math.PI * s.r ** 2;
        if (s.type === 'rect')   return sum + s.w * s.h;
        // must edit here to add triangle
    }, 0);
}

// ✓ Open for extension — add Triangle without touching existing code
interface Shape { area(): number; }
class Circle implements Shape { area() { return Math.PI * this.r ** 2; } }
class Rect   implements Shape { area() { return this.w * this.h; } }
class Triangle implements Shape { area() { return 0.5 * this.b * this.h; } }

function totalArea(shapes: Shape[]) {
    return shapes.reduce((sum, s) => sum + s.area(), 0);
}
```

#### L — Liskov Substitution Principle (LSP)
> Subclasses must be substitutable for their base class — without breaking the program. A subclass should honor the contract of its base class: same preconditions, same postconditions, same invariants. Classic violation: `Square extends Rectangle` — setting width also changes height, breaking rectangle's contract.

```ts
// ✗ Violation — Square breaks Rectangle's contract
class Rectangle {
    setWidth(w: number)  { this.width = w; }
    setHeight(h: number) { this.height = h; }
    area() { return this.width * this.height; }
}
class Square extends Rectangle {
    setWidth(w: number)  { this.width = this.height = w; } // breaks LSP
}

// Code that works with Rectangle breaks with Square:
function doubleWidth(r: Rectangle) {
    const h = r.area() / r.width;
    r.setWidth(r.width * 2);
    assert(r.area() === h * r.width * 2); // FAILS for Square
}
```

#### I — Interface Segregation Principle (ISP)
> Clients should not be forced to depend on interfaces they don't use. Many small, specific interfaces are better than one large general one. Prevents "fat interfaces" where implementing classes must define methods they don't need.

```ts
// ✗ Violation — Printer forced to implement fax/scan it doesn't support
interface Machine {
    print(doc: Document): void;
    scan(doc: Document): void;
    fax(doc: Document): void;
}

// ✓ Segregated interfaces
interface Printer { print(doc: Document): void; }
interface Scanner { scan(doc: Document): void; }
interface Fax     { fax(doc: Document): void; }

class SimplePrinter implements Printer { /* only print */ }
class AllInOne implements Printer, Scanner, Fax { /* all */ }
```

#### D — Dependency Inversion Principle (DIP)
> High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details; details should depend on abstractions. Achieved through dependency injection.

```ts
// ✗ Violation — high-level UserService directly depends on low-level MySQLDB
class UserService {
    private db = new MySQLDatabase(); // hardcoded dependency
}

// ✓ Depend on abstraction; inject the concrete implementation
interface Database {
    find(id: string): Promise<User>;
    save(user: User): Promise<void>;
}

class UserService {
    constructor(private db: Database) {} // inject — works with any DB
}

// Wiring at the top level:
const service = new UserService(new PostgresDatabase());
// In tests:
const service = new UserService(new InMemoryDatabase());
```

---

### DRY — Don't Repeat Yourself
> "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system." Not just copy-pasted code — duplicated logic, business rules, or data schema. The real question: when this thing changes, how many places need updating? If more than one: violation. Counter: avoid creating the wrong abstraction just to avoid duplication — two similar-looking but different-reason things shouldn't be forced into one abstraction.

```ts
// ✗ Same validation rule in 3 places
if (title.length === 0 || title.length > 200) throw new Error('Invalid title');

// ✓ Single source of truth
const TITLE_SCHEMA = z.string().min(1).max(200);
// Used everywhere that validates a title
```

---

### KISS — Keep It Simple, Stupid
> Systems work best when kept simple. Prefer the simplest solution that solves the problem. Complexity is the enemy of reliability. Ask: "Is there a simpler way to solve this?" before reaching for a complex pattern. Complexity should only be introduced when there's a specific, demonstrated need — not speculatively.

```ts
// ✗ Over-engineered for a simple problem
class TaskCreationStrategyFactory {
    getStrategy(type: string): TaskCreationStrategy { /* ... */ }
}

// ✓ If you only have one type of task creation:
async function createTask(title: string) {
    return db.insert({ title, done: false });
}
```

---

### YAGNI — You Aren't Gonna Need It
> Don't implement something until you actually need it. Builds on KISS — don't add speculative features, configuration options, or abstractions for hypothetical future requirements. The cost of unused code: maintenance burden, complexity, and the wrong abstraction when the real need finally arrives.

> "Always implement things when you actually need them, never when you just foresee that you need them." — Ron Jeffries

---

### Separation of Concerns (SoC)
> Divide a program into distinct sections, each addressing a separate concern. Each section should know as little as possible about other sections. Examples: MVC separates data/logic/presentation; CSS separates styling from HTML structure; business logic should not live in HTTP route handlers.

```ts
// ✗ Concern mixing — HTTP, business logic, and DB in one place
app.post('/tasks', async (req, res) => {
    if (!req.body.title) return res.status(400).json({ error: 'Title required' });
    const task = { title: req.body.title, done: false };
    const [created] = await db.insert(tasks).values(task).returning();
    await emailService.notifyAdmin(created);
    res.status(201).json(created);
});

// ✓ Separated: route → service → repository
app.post('/tasks', async (req, res) => {
    const task = await taskService.create(req.body); // concerns separated
    res.status(201).json(task);
});
```

---

### Law of Demeter (Principle of Least Knowledge)
> A unit should only talk to its immediate friends — not to strangers. An object should only call methods on: itself, objects passed as arguments, objects it creates, its direct components. Violation: chaining through multiple objects (`a.getB().getC().doSomething()`). This couples you to the entire chain's structure.

```ts
// ✗ Violation — depends on internal structure of customer's wallet
const amount = order.getCustomer().getWallet().getBalance();

// ✓ Ask for what you need, don't navigate to it
const amount = order.getCustomerBalance(); // Customer/Wallet internals hidden
```

---

### Composition Over Inheritance
> Favor composing objects with behavior over inheriting from a base class. Inheritance creates tight coupling (subclass depends on parent internals), fragile hierarchies, and the "gorilla/banana problem" (you wanted a banana, got a gorilla holding a banana). Composition is more flexible — mix and match behaviors.

```ts
// ✗ Deep inheritance — TaskWithNotification extends NotifiableTask extends BaseTask
// Changing BaseTask potentially breaks everything below

// ✓ Composition — mix in only what you need
function withLogging<T>(service: T, logger: Logger): T {
    return new Proxy(service as object, {
        get(target, prop) {
            const value = target[prop];
            if (typeof value === 'function') {
                return (...args: unknown[]) => {
                    logger.info(`Calling ${String(prop)}`);
                    return value.apply(target, args);
                };
            }
            return value;
        }
    }) as T;
}
```

---

### Fail Fast
> Detect and report errors as early as possible — at the point they occur, not downstream where the symptoms show up. Validate inputs at system boundaries. Throw immediately rather than propagating invalid state. Makes debugging easier (stack trace points to the real cause) and prevents corrupted state from spreading.

```ts
function createUser(data: unknown) {
    // ✓ Fail fast — validate at the entry point
    const parsed = CreateUserSchema.parse(data); // throws immediately if invalid
    return db.insert(parsed);
    // ✗ Don't let invalid data flow into business logic then fail at the DB
}
```

---

### Principle of Least Astonishment
> A component should behave in the way users expect — it should not astonish or surprise. Function names should match what they do, APIs should follow conventions. If a function is called `getUser`, it shouldn't also delete the user. If a method returns a new array, it shouldn't also mutate the original.

---

## Most Asked Principles Interview Questions

### "Explain DRY and give an example of when NOT to follow it."

> DRY is about avoiding duplication of knowledge — not just syntactic similarity. Don't follow DRY blindly when: two similar-looking pieces of code represent different business concepts that happen to look alike now but will diverge later. Premature abstraction to eliminate "duplication" can create wrong abstractions — two things that look the same but have different reasons to change should stay separate. "Duplication is far cheaper than the wrong abstraction." — Sandi Metz.

### "What is the difference between coupling and cohesion?"

> **Cohesion** — how related and focused the responsibilities within a module are. High cohesion = module does one well-defined thing. **Coupling** — how dependent modules are on each other. Low coupling = changes in one module don't ripple into others. Goal: high cohesion, low coupling. Highly coupled code is hard to test, reuse, and change. Dependency injection reduces coupling by removing hardcoded dependencies.

### "What is technical debt?"

> Technical debt is the cost of shortcuts, poor design decisions, and deferred refactoring. Like financial debt: it accumulates interest — the longer you leave it, the harder it becomes to work around. Types: reckless/deliberate ("we don't have time to do this right"), reckless/inadvertent (didn't know the better approach), prudent/deliberate (consciously chose speed now, will pay back later), prudent/inadvertent (learned the right approach after the fact). Manage it: track it explicitly, pay it back incrementally, don't let it accumulate to the point of system-wide drag.

### "What is the difference between abstraction and encapsulation?"

> **Abstraction** — hiding complexity by exposing only what's necessary. You interact with a car's steering wheel without knowing how the steering column works. In code: interfaces, functions, APIs hide implementation details. **Encapsulation** — bundling data and the methods that operate on it together, and restricting direct access to internal state. Private fields + public methods. Encapsulation is a mechanism for achieving abstraction. Together: users of your code see a simple interface, not the complex internals.

### "When should you refactor code?"

> The **Rule of Three**: first time, just do it. Second time, note the duplication. Third time, refactor. Refactor when: adding a feature is harder than it should be, tests are hard to write, the code is hard to understand, there's clear duplication of logic. Don't refactor: working code with no tests (risky), under tight deadlines (do it after), speculatively (YAGNI). Always refactor with tests in place — they're your safety net.
