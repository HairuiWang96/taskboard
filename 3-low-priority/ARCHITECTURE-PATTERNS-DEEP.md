# Architecture Patterns — Deep Reference

## Architectural Patterns vs Design Patterns

> **Design patterns** (Gang of Four) solve object/class-level problems — Singleton, Observer, Factory. **Architectural patterns** solve system/application-level structure — how to organize an entire application or distribute responsibilities across services. Both exist at different levels of abstraction.

---

## Application Architecture Patterns

### MVC — Model-View-Controller

> Separates an application into 3 concerns. **Model** — data and business logic (no UI knowledge). **View** — renders the UI (no business logic). **Controller** — handles input, coordinates between Model and View. The controller updates the model; the model notifies the view (or the controller updates the view directly depending on the flavor). Used by: Rails, Django, ASP.NET, many web frameworks.

```
User Input → Controller → updates → Model → notifies → View → renders to user
                    ↑                                            |
                    └────────────────────────────────────────────┘
```

---

### MVP — Model-View-Presenter

> Similar to MVC but the Presenter handles all UI logic — the View is passive (just displays what Presenter tells it). The View and Model never communicate directly. More testable than MVC because the Presenter can be tested without a real View (pass a mock). Used by: Android (classic), WinForms.

```
View ←→ Presenter ←→ Model
(passive)  (all logic)
```

---

### MVVM — Model-View-ViewModel

> The ViewModel exposes data streams and commands that the View binds to — no direct reference from ViewModel to View. The View observes the ViewModel reactively. Separation is clean: ViewModel is fully testable without a View. Used by: SwiftUI, Jetpack Compose, WPF, Angular (partially), Vue.

```ts
class TaskViewModel {
    tasks$ = new BehaviorSubject<Task[]>([]);
    isLoading$ = new BehaviorSubject(false);

    async loadTasks() {
        this.isLoading$.next(true);
        const tasks = await this.taskService.getAll();
        this.tasks$.next(tasks);
        this.isLoading$.next(false);
    }
}
// View observes tasks$ and isLoading$ — ViewModel never references View
```

---

### Clean Architecture (Hexagonal / Ports & Adapters)

> Organizes code in concentric layers — inner layers contain business rules, outer layers contain infrastructure. The **Dependency Rule**: source code dependencies only point inward. Inner layers know nothing about outer layers (no DB imports in business logic). Layers: **Entities** (core business rules) → **Use Cases** (application business rules) → **Interface Adapters** (controllers, presenters, gateways) → **Frameworks & Drivers** (DB, web framework, external APIs).

```
┌─────────────────────────────────────────┐
│  Frameworks & Drivers (Express, Postgres) │
│  ┌─────────────────────────────────────┐ │
│  │  Interface Adapters (Controllers)   │ │
│  │  ┌───────────────────────────────┐  │ │
│  │  │  Use Cases (Application Logic) │  │ │
│  │  │  ┌─────────────────────────┐  │  │ │
│  │  │  │  Entities (Core Rules)  │  │  │ │
│  │  │  └─────────────────────────┘  │  │ │
│  │  └───────────────────────────────┘  │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
Dependencies only point inward →
```

```ts
// Use Case — knows nothing about Express or Postgres
class CreateTaskUseCase {
    constructor(private taskRepo: TaskRepository) {} // interface, not Postgres
    async execute(title: string): Promise<Task> {
        if (!title.trim()) throw new ValidationError('Title required');
        return this.taskRepo.save({ title, done: false });
    }
}

// Interface (port) — defined in use case layer
interface TaskRepository {
    save(task: NewTask): Promise<Task>;
    findById(id: string): Promise<Task | null>;
}

// Adapter (outer layer) — implements the port
class PostgresTaskRepository implements TaskRepository {
    async save(task: NewTask) { /* Postgres-specific code here */ }
}
```

---

### CQRS — Command Query Responsibility Segregation

> Separates read operations (queries) from write operations (commands) — different models, potentially different databases. Commands change state and return nothing (or just an ID). Queries return data and change nothing. Benefits: read and write models can be optimized independently, can use different databases (SQL writes, Elasticsearch reads), scales each side separately. Complexity: eventual consistency between write and read models.

```ts
// Command side — optimized for writes
class CreateTaskCommand {
    constructor(public readonly title: string, public readonly userId: string) {}
}
class CreateTaskHandler {
    async handle(cmd: CreateTaskCommand) {
        const task = new Task(cmd.title, cmd.userId);
        await this.taskRepo.save(task);
        this.eventBus.publish(new TaskCreatedEvent(task.id));
    }
}

// Query side — optimized for reads (different model, could be a read DB/cache)
class GetUserTasksQuery { constructor(public userId: string) {} }
class GetUserTasksHandler {
    async handle(query: GetUserTasksQuery) {
        return this.readDb.query(
            'SELECT * FROM tasks_view WHERE user_id = $1 ORDER BY created_at DESC',
            [query.userId]
        );
    }
}
```

---

### Event Sourcing

> Instead of storing the current state, store the sequence of events that led to it. State is derived by replaying events. Every change is an event: `TaskCreated`, `TaskCompleted`, `TaskDeleted`. Benefits: full audit log, time travel (rebuild state at any point), easy to add new projections. Complexity: eventual consistency, event schema evolution, storage size.

```ts
// Events — immutable facts that happened
type TaskEvent =
    | { type: 'TaskCreated'; taskId: string; title: string; timestamp: Date }
    | { type: 'TaskCompleted'; taskId: string; timestamp: Date }
    | { type: 'TaskDeleted'; taskId: string; timestamp: Date };

// State derived by replaying events
function buildTaskState(events: TaskEvent[]): Task | null {
    return events.reduce((state, event) => {
        switch (event.type) {
            case 'TaskCreated': return { id: event.taskId, title: event.title, done: false };
            case 'TaskCompleted': return state ? { ...state, done: true } : null;
            case 'TaskDeleted': return null;
            default: return state;
        }
    }, null as Task | null);
}
```

---

## Distributed System Patterns

### Monolith vs Microservices vs Modular Monolith

> **Monolith** — single deployable unit, single database. Simple to develop/test/deploy initially. Problems at scale: long build times, risky deployments (all-or-nothing), teams stepping on each other. **Microservices** — multiple independently deployable services, each with its own database. Each service owns its data. Benefits: independent deployment, scale services individually, technology flexibility. Costs: distributed system complexity (network failures, latency, distributed transactions), operational overhead. **Modular Monolith** — one deployment but strict module boundaries (no cross-module DB access, clear APIs between modules). Best of both: simple operations, good separation. Start here.

```
Monolith:          [UI → API → Business Logic → Database]
                   One process, one DB, simple

Microservices:     [Service A ↔ Service B ↔ Service C]
                   Each with own DB, communicates over HTTP/events

Modular Monolith:  [Module A | Module B | Module C] → Single DB (separate schemas)
                   One process, but strict module boundaries
```

---

### API Gateway Pattern

> A single entry point for all clients. The gateway handles: routing requests to the right microservice, authentication/authorization, rate limiting, SSL termination, request/response transformation, aggregating multiple service calls into one response. Clients talk to one URL; the gateway handles the routing complexity.

```
Client → API Gateway → [Service A]
                    → [Service B]
                    → [Service C]

Gateway responsibilities:
- Auth: verify JWT before forwarding
- Rate limiting: per-client request limits
- Routing: /users/* → User Service, /orders/* → Order Service
- Aggregation: combine responses from multiple services
```

---

### Saga Pattern

> Manages distributed transactions across multiple services without a distributed ACID transaction. A saga is a sequence of local transactions — each publishes an event triggering the next step. If any step fails, compensating transactions undo previous steps. Two flavors: **Choreography** (services react to events, no central coordinator — more decoupled) and **Orchestration** (a saga orchestrator tells each service what to do — easier to track state).

```
Order Saga (Choreography):
1. Order Service: creates order → emits OrderCreated
2. Payment Service: listens → charges card → emits PaymentSuccess / PaymentFailed
3. Inventory Service: listens → reserves stock → emits StockReserved / StockFailed
4. Shipping Service: listens → schedules delivery

On failure: each service emits a failure event → upstream services run compensating actions
```

---

### Circuit Breaker Pattern

> Prevents cascading failures in distributed systems. When a downstream service starts failing, the circuit "opens" and stops sending requests — fail fast instead of waiting for timeouts. After a timeout, it tries a single request (half-open); if successful, the circuit closes. Three states: **Closed** (normal), **Open** (failing, reject immediately), **Half-Open** (testing recovery).

```ts
class CircuitBreaker {
    private failures = 0;
    private state: 'closed' | 'open' | 'half-open' = 'closed';
    private lastFailure: number = 0;

    async call<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailure > 30_000) this.state = 'half-open';
            else throw new Error('Circuit open — fast fail');
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (err) {
            this.onFailure();
            throw err;
        }
    }

    private onSuccess() { this.failures = 0; this.state = 'closed'; }
    private onFailure() {
        this.failures++;
        this.lastFailure = Date.now();
        if (this.failures >= 5) this.state = 'open';
    }
}
```

---

### Strangler Fig Pattern

> Incrementally migrate from a monolith to microservices (or legacy to modern system). New features are built in the new system; old features are gradually migrated and "strangled" out of the monolith. A proxy/facade routes requests — to the old system for legacy features, new system for migrated ones. You never do a big-bang rewrite (highest-risk migration strategy).

```
Phase 1: All traffic → Monolith
Phase 2: Traffic → Router: /users → New Service | everything else → Monolith
Phase 3: Traffic → Router: /users, /orders → New Services | rest → Monolith
Phase N: Monolith retired
```

---

## Most Asked Architecture Interview Questions

### "When would you choose a monolith over microservices?"

> Start with a monolith: small team (< 10 engineers), new product (domain not yet understood — microservices require knowing boundaries upfront), fast iteration needed. Microservices add operational overhead (deployment pipelines per service, distributed tracing, service discovery). The hardest part of microservices is getting service boundaries right — wrong boundaries = distributed monolith (worst of both worlds). A well-structured modular monolith is often the right answer until you have specific scaling needs.

### "What is eventual consistency and when is it acceptable?"

> In distributed systems, it's impossible to have strong consistency (every read sees the latest write) across multiple nodes without paying a latency/availability cost (CAP theorem). Eventual consistency means: given no new updates, all replicas will eventually converge to the same value. Acceptable when: showing a user their own feed (brief staleness OK), likes/view counts (approximate is fine), inventory (show approximate, confirm at checkout). Not acceptable when: bank transfers, medical records, anything where stale data causes harm.

### "What is the difference between REST and GraphQL?"

> **REST**: multiple endpoints, each returns a fixed shape. Over-fetching (endpoint returns more data than needed) and under-fetching (need multiple requests to get related data) are common problems. Simple, widely understood, great HTTP caching. **GraphQL**: single endpoint, client specifies exactly what data it needs. Solves over/under-fetching. Better for complex, nested data requirements and mobile (bandwidth-constrained). Downsides: harder to cache (POST requests), N+1 problem if not handled (use DataLoader), more complex server implementation.

### "What is an event-driven architecture?"

> Services communicate by publishing and consuming events — no direct calls between services. Publisher doesn't know who consumes; consumers don't know who published. Benefits: decoupling (services evolve independently), resilience (consumer down = events queue up), extensibility (add new consumers without changing publisher). Challenges: harder to trace request flow, eventual consistency, event schema versioning. Use a message broker (Kafka, RabbitMQ, SNS/SQS) as the backbone.

### "What is the difference between horizontal and vertical scaling?"

> **Vertical scaling** — make one machine bigger (more CPU, RAM). Simple, no code changes, limited ceiling, single point of failure. **Horizontal scaling** — add more machines, distribute load. Requires stateless services (no local session state — use Redis), a load balancer, and usually more complex infrastructure. Most modern cloud architectures are designed for horizontal scaling. Stateless services (no in-memory state) are easy to scale horizontally — just add more instances.
