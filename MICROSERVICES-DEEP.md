# Microservices & Distributed Systems — Senior Developer Deep Reference

**Priority: HIGH**

> Covers architecture tradeoffs, inter-service communication, messaging systems, distributed patterns (Saga, Circuit Breaker, CQRS, Event Sourcing), observability, data management, deployment, and testing — with Node.js code examples and text diagrams throughout.

---

## Table of Contents

1. [Monolith vs Microservices](#1-monolith-vs-microservices)
2. [Microservice Design Principles](#2-microservice-design-principles)
3. [Inter-Service Communication — Synchronous](#3-inter-service-communication--synchronous)
4. [Inter-Service Communication — Asynchronous](#4-inter-service-communication--asynchronous)
5. [Message Queues In Depth — Kafka](#5-message-queues-in-depth--kafka)
6. [Message Queues In Depth — RabbitMQ](#6-message-queues-in-depth--rabbitmq)
7. [Event-Driven Architecture — Domain Events, Event Sourcing, CQRS](#7-event-driven-architecture--domain-events-event-sourcing-cqrs)
8. [Saga Pattern — Distributed Transactions](#8-saga-pattern--distributed-transactions)
9. [Circuit Breaker Pattern](#9-circuit-breaker-pattern)
10. [API Gateway](#10-api-gateway)
11. [Service Discovery](#11-service-discovery)
12. [Distributed Tracing](#12-distributed-tracing)
13. [Eventual Consistency — CAP Theorem, BASE vs ACID, Idempotency](#13-eventual-consistency--cap-theorem-base-vs-acid-idempotency)
14. [Data Management in Microservices](#14-data-management-in-microservices)
15. [Strangler Fig Pattern](#15-strangler-fig-pattern)
16. [Deployment Patterns — Sidecar, Ambassador, Adapter, Service Mesh](#16-deployment-patterns--sidecar-ambassador-adapter-service-mesh)
17. [Testing Microservices](#17-testing-microservices)
18. [Common Interview Questions](#18-common-interview-questions)

---

## 1. Monolith vs Microservices

### What a monolith actually is

```text
A monolith is a single deployable unit where all business logic,
data access, and UI concerns are compiled and deployed together.

                     ┌─────────────────────────────────┐
                     │          MONOLITH                │
                     │                                  │
                     │  ┌──────────┐  ┌─────────────┐  │
                     │  │  Users   │  │   Orders    │  │
                     │  │  module  │  │   module    │  │
                     │  └────┬─────┘  └──────┬──────┘  │
                     │       │               │          │
                     │  ┌────▼───────────────▼──────┐  │
                     │  │     Shared Database        │  │
                     │  └───────────────────────────┘  │
                     └─────────────────────────────────┘
                                    │
                              Deploy once.
                            Scale everything.

Everything shares memory, process, and DB. One process crash = full outage.
```

### What microservices actually are

```text
Microservices decompose the system into independently deployable services,
each owning its own data and communicating over the network.

  ┌──────────────┐     REST/gRPC     ┌──────────────┐
  │  User        │ ◄──────────────── │  Order       │
  │  Service     │                   │  Service     │
  │  [DB: users] │                   │  [DB: orders]│
  └──────────────┘                   └──────────────┘
         │                                  │
         └─────────── Message Bus ──────────┘
                    (Kafka / RabbitMQ)
                           │
                    ┌──────────────┐
                    │  Notification│
                    │  Service     │
                    │  [DB: notifs]│
                    └──────────────┘

Each service: separate process, separate DB, separate deployable artifact.
```

### Tradeoffs — honest assessment

| Concern | Monolith | Microservices |
|---|---|---|
| Initial development speed | Fast — no network, no contracts | Slow — need infra from day one |
| Operational complexity | Low — one process to run | High — N services, N DBs, service mesh |
| Scalability | Scale everything together | Scale individual bottlenecks |
| Fault isolation | One crash = full outage | Failure in one service isolated |
| Deployment | Deploy everything at once | Independent deploys per service |
| Data consistency | Transactions are trivial (ACID) | Distributed transactions are hard |
| Team scaling | Hard — teams conflict in same codebase | Teams own independent services |
| Testing | Simpler — one process to test | E2E tests are expensive, contract tests needed |
| Latency | Function calls (nanoseconds) | Network calls (milliseconds) |
| Debugging | Single log stream, single trace | Need distributed tracing |

### When to use each

```text
Use a Monolith when:
  - Team is small (< 8-10 engineers)
  - Domain is not yet well-understood (you need flexibility)
  - Startup / early product (speed of iteration > scalability)
  - Tight transaction consistency is required across all features
  - You don't have the DevOps maturity to run Kubernetes + service mesh

Use Microservices when:
  - Teams are large and need autonomous deployment
  - Different parts of the system have dramatically different scaling needs
    (e.g., search service gets 10x the traffic of billing service)
  - Services need different technology stacks (polyglot persistence)
  - Regulatory isolation is required (e.g., PCI-DSS for payments)
  - You have the DevOps infrastructure to support it

❗ Most companies that succeed with microservices started as a monolith and
   broke it apart only once they understood their domain boundaries.
   (Amazon, Netflix, Uber all did this.)
```

### The Modular Monolith — the underrated middle ground

```text
A modular monolith enforces hard module boundaries (no cross-module
direct DB access, well-defined interfaces) inside a single deployable unit.

  ┌──────────────────────────────────────────────────┐
  │               MODULAR MONOLITH                   │
  │                                                  │
  │  ┌──────────────┐      ┌──────────────────────┐  │
  │  │  Users Module│      │   Orders Module      │  │
  │  │              │      │                      │  │
  │  │  userService │      │  orderService        │  │
  │  │  userRepo    │      │  orderRepo           │  │
  │  │              │      │                      │  │
  │  │  ONLY exposes│ ───► │  calls UserModule    │  │
  │  │  UserService │      │  interface — never   │  │
  │  │  interface   │      │  DB directly         │  │
  │  └──────────────┘      └──────────────────────┘  │
  │                                                  │
  │        Shared DB — but schema per module         │
  └──────────────────────────────────────────────────┘

Benefits:
  - All the code organization benefits of microservices
  - None of the network complexity
  - Can be split into actual microservices later (seams already exist)
  - Transactional consistency preserved

This is often the correct architecture for 80% of companies.
```

---

## 2. Microservice Design Principles

### Single Responsibility Principle at service level

```text
A service should have ONE reason to change.

BAD: "ProductService" that handles:
  - Product catalog CRUD
  - Inventory tracking
  - Pricing and promotions
  - Product search indexing

GOOD: Split into:
  - CatalogService    → product CRUD, descriptions, images
  - InventoryService  → stock levels, warehouse locations
  - PricingService    → base prices, promotions, discounts
  - SearchService     → Elasticsearch indexing and querying

If changing pricing rules requires re-deploying the catalog service,
the boundary is wrong.
```

### Bounded Context (Domain-Driven Design)

```text
A Bounded Context is a boundary within which a particular domain model
applies and has a consistent meaning.

"Customer" means different things in different contexts:

  Sales Context:          ├── name, lead source, deal stage
  Support Context:        ├── name, ticket history, SLA tier
  Billing Context:        ├── name, payment method, invoices
  Shipping Context:       └── name, delivery addresses, preferences

Each context should have its OWN model of "Customer" — a microservice
should NOT try to create a single "universal Customer" that satisfies
all contexts. That universal model becomes a God Object.

Bounded contexts map directly to microservice boundaries.
```

### Loose Coupling

```text
Services should know as little as possible about each other.

Tight coupling (bad):
  Order Service knows the exact DB schema of User Service.
  → If User Service renames a column, Order Service breaks.

Loose coupling (good):
  Order Service knows only the public API contract (REST/gRPC interface).
  Order Service can be deployed without redeploying User Service.
  Order Service only holds a userId — it fetches user details on demand.

Loose coupling requires:
  - Well-defined, versioned API contracts
  - No shared databases
  - No shared code that contains business logic (shared utils OK, shared models NOT OK)
  - Asynchronous messaging for non-critical paths
```

### High Cohesion

```text
Everything inside a service boundary should belong together.

Low cohesion (bad): A service that does user management AND sends emails
  AND generates reports. The email logic has nothing to do with user management.

High cohesion (good): User Service handles everything user-identity related:
  registration, login, profile, password reset. That's its domain.
  Email sending is a separate service (NotificationService) that listens for events.

Heuristic: if you can't explain what a service does in one sentence,
it's probably doing too much.
```

---

## 3. Inter-Service Communication — Synchronous

### REST over HTTP

```text
The default choice. Each service exposes an HTTP API.
Services call each other directly, wait for a response.

  Service A ──── POST /orders ────► Service B
  Service A ◄─── 200 { orderId } ── Service B

Pros:
  - Simple, universally understood
  - Easy to debug (curl, browser, Postman)
  - Stateless — no connection management needed
  - Human-readable

Cons:
  - Slower than gRPC (text serialization, HTTP/1.1 overhead)
  - No streaming out of the box (HTTP/1.1)
  - Temporal coupling — caller blocks while callee processes
  - If callee is down, caller fails immediately
```

```js
// Node.js — calling another service via REST
// Using node-fetch or axios

const axios = require('axios');

class UserServiceClient {
  constructor(baseUrl) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 3000, // ALWAYS set a timeout — never trust remote services
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getUser(userId) {
    try {
      const { data } = await this.client.get(`/users/${userId}`);
      return data;
    } catch (err) {
      if (err.response?.status === 404) return null;
      // Propagate other errors — circuit breaker will handle retries
      throw err;
    }
  }
}

// Usage in Order Service:
const userClient = new UserServiceClient('http://user-service:3001');
const user = await userClient.getUser(req.body.userId);
```

### gRPC and Protocol Buffers

```text
gRPC uses Protocol Buffers (protobuf) as the serialization format and
HTTP/2 as the transport. It is significantly faster than REST+JSON.

Key advantages over REST:
  - Binary serialization (protobuf) — 3-10x smaller payloads than JSON
  - HTTP/2 multiplexing — multiple requests on one connection
  - Strongly typed contracts (.proto files) — no ambiguity
  - Auto-generated client/server code in multiple languages
  - Streaming support built in (unary, server-stream, client-stream, bidirectional)

When to use gRPC:
  - Internal service-to-service calls (not browser-facing)
  - High-throughput, low-latency requirements
  - Services in different languages (generated clients handle interop)
  - Streaming use cases (real-time feeds, large file transfers)
```

```proto
// user.proto — the contract. Both services share this file.

syntax = "proto3";
package user;

service UserService {
  rpc GetUser (GetUserRequest) returns (User);                         // Unary
  rpc ListUsers (ListUsersRequest) returns (stream User);              // Server streaming
  rpc WatchUserChanges (WatchRequest) returns (stream UserEvent);      // Server streaming
}

message GetUserRequest {
  string user_id = 1;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
  int64 created_at = 4;  // Unix timestamp
}

message UserEvent {
  string type = 1;   // "created", "updated", "deleted"
  User user = 2;
}
```

```js
// Node.js gRPC server (using @grpc/grpc-js)
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDef = protoLoader.loadSync('./user.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const userProto = grpc.loadPackageDefinition(packageDef).user;

// Implement the service
const server = new grpc.Server();
server.addService(userProto.UserService.service, {
  // Unary RPC — one request, one response
  getUser: async (call, callback) => {
    const { user_id } = call.request;
    const user = await db.findUser(user_id);
    if (!user) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'User not found' });
    }
    callback(null, { id: user.id, name: user.name, email: user.email });
  },

  // Server streaming RPC — one request, stream of responses
  listUsers: async (call) => {
    const users = await db.getAllUsers();
    for (const user of users) {
      call.write({ id: user.id, name: user.name, email: user.email });
    }
    call.end(); // MUST call end() to close the stream
  },
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  server.start();
  console.log('gRPC server running on port 50051');
});

// Node.js gRPC client
const client = new userProto.UserService(
  'user-service:50051',
  grpc.credentials.createInsecure()
);

// Unary call
client.getUser({ user_id: '123' }, (err, user) => {
  if (err) console.error(err);
  else console.log(user);
});

// Server streaming
const stream = client.listUsers({});
stream.on('data', (user) => console.log(user));
stream.on('end', () => console.log('Stream complete'));
stream.on('error', (err) => console.error(err));
```

### REST vs gRPC — decision matrix

```text
Use REST when:
  ✓ Service is called by browsers or mobile apps directly
  ✓ API is public / third-party developers will consume it
  ✓ Team unfamiliar with protobuf tooling
  ✓ HTTP caching is important (GET requests)
  ✓ Debugging simplicity matters more than performance

Use gRPC when:
  ✓ Internal service-to-service (never browser-facing)
  ✓ Performance is critical (financial data, ML inference)
  ✓ You have many services in different languages
  ✓ Streaming data (live feeds, incremental results)
  ✓ Strong typing / contract enforcement is a priority
```

---

## 4. Inter-Service Communication — Asynchronous

### Why async messaging exists

```text
With synchronous calls, the caller is BLOCKED waiting for the callee.
This creates cascading failures:

  Order Service → calls → Payment Service (which is down)
       └─ Order Service call fails
             └─ Client gets a 500 error
                   └─ Order is lost

With async messaging, Order Service publishes an event and continues.
Payment Service processes it when it recovers.

  Order Service → publishes "OrderCreated" event → Message Broker
  Order Service returns 202 Accepted to client immediately
  ...later...
  Payment Service reads event → processes payment → publishes "PaymentCompleted"

Benefits of async:
  - Temporal decoupling: services don't need to be up at the same time
  - Load leveling: broker absorbs traffic spikes (queue buffers work)
  - Natural retry: failed consumers just re-read from the queue
  - Fan-out: one event can trigger N downstream consumers

Use async for:
  - Anything that doesn't need an immediate response (notifications, analytics)
  - Long-running workflows (order processing, video transcoding)
  - Cross-service side effects (when order is placed, also update inventory,
    send email, log to analytics — all async)

Use sync (REST/gRPC) for:
  - Anything where the response is needed to fulfill the current request
    (e.g., "get user profile to render the page")
  - Real-time queries
```

---

## 5. Message Queues In Depth — Kafka

### Kafka core concepts

```text
Kafka is a distributed, append-only commit log. It is NOT a traditional
message queue — it retains messages for a configurable time period and
allows replaying them.

Core concepts:

  Topic: a named stream of events (e.g., "orders", "payments", "user-events")
    └── Each topic is divided into Partitions

  Partition: an ordered, immutable sequence of records.
    - Records are appended to the end (offset 0, 1, 2, 3...)
    - Ordering is guaranteed WITHIN a partition only
    - More partitions = more parallelism

  Producer: publishes records to a topic/partition
    - Can choose partition via key hashing or round-robin
    - Records with the same key go to the same partition (preserves order per key)

  Consumer Group: a group of consumers that collectively read a topic
    - Each partition is read by exactly ONE consumer in the group
    - More consumers than partitions → some consumers idle
    - More partitions → more parallelism

  Offset: the position of a record within a partition
    - Consumers commit their offset to track progress
    - If a consumer restarts, it resumes from the last committed offset

  Broker: a Kafka server node
    - Multiple brokers form a Kafka cluster
    - Each partition has a leader broker + replica brokers

Topology:

  Producer ──► Topic "orders" ──► Partition 0  ──► Consumer Group A (Consumer 1)
                              ├── Partition 1  ──► Consumer Group A (Consumer 2)
                              └── Partition 2  ──► Consumer Group A (Consumer 3)
                                                          │
                                              Consumer Group B (Consumer 4) reads ALL
                                              (independent offset tracking per group)
```

### Delivery guarantees

```text
At-most-once:
  - Consumer reads message, commits offset, THEN processes
  - If processing fails after commit → message is silently lost
  - Use when: occasional data loss is acceptable (metrics, logs)

At-least-once (Kafka default):
  - Consumer reads message, processes, THEN commits offset
  - If consumer crashes after processing but before commit → message re-delivered
  - Duplicate processing is possible → your consumer MUST be idempotent
  - Use when: correctness > performance (orders, payments)

Exactly-once (Kafka Transactions):
  - Kafka 0.11+ feature: producer transactions + idempotent producers
  - Guarantees each message processed exactly once end-to-end
  - Requires Kafka Streams or careful transactional producer config
  - Use when: strict financial accuracy required
  - Cost: significant performance overhead

// Idempotent consumer example (at-least-once with deduplication):
// Store processed event IDs in Redis/DB to detect duplicates
async function processOrder(event) {
  const alreadyProcessed = await redis.exists(`processed:${event.eventId}`);
  if (alreadyProcessed) {
    console.log(`Skipping duplicate event ${event.eventId}`);
    return;
  }

  await db.createOrder(event.data); // actual processing
  await redis.setex(`processed:${event.eventId}`, 86400, '1'); // remember for 24h
}
```

### Log compaction and retention

```text
Standard retention (time-based):
  - Kafka retains messages for a configured period (e.g., 7 days)
  - After that, old segments are deleted
  - Good for: event streams, logs

Log compaction (key-based):
  - Kafka keeps only the LATEST record per key
  - Older records with the same key are removed
  - Good for: changelog topics, snapshots (e.g., latest user profile state)
  - Deleted records are represented by a tombstone (key with null value)

  Before compaction:
    offset 0: key=user:1  value={"name":"Alice"}
    offset 1: key=user:2  value={"name":"Bob"}
    offset 2: key=user:1  value={"name":"Alice Smith"}   ← same key as offset 0
    offset 3: key=user:1  value=null                     ← tombstone (delete)

  After compaction:
    key=user:1 → deleted (tombstone)
    key=user:2 → {"name":"Bob"}
```

### Kafka producer/consumer in Node.js

```js
// Using the 'kafkajs' library
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka-broker-1:9092', 'kafka-broker-2:9092'],
});

// ─── PRODUCER ────────────────────────────────────────────────────────────────
const producer = kafka.producer();

async function publishOrderCreated(order) {
  await producer.connect();

  await producer.send({
    topic: 'order-events',
    messages: [
      {
        // Key determines partition — orders from same user go to same partition
        // This preserves ordering of events per user
        key: order.userId,
        value: JSON.stringify({
          eventId: crypto.randomUUID(),
          type: 'OrderCreated',
          timestamp: Date.now(),
          data: order,
        }),
        headers: {
          'correlation-id': req.headers['x-correlation-id'] ?? '',
          source: 'order-service',
        },
      },
    ],
  });
}

// ─── CONSUMER ────────────────────────────────────────────────────────────────
const consumer = kafka.consumer({
  groupId: 'payment-service-group', // Each service has its own group ID
});

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'order-events', fromBeginning: false });

  await consumer.run({
    // eachMessage is called once per message, in order within a partition
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log(`Processing ${event.type} [offset ${message.offset}]`);

      try {
        await processEvent(event);
        // Offset is committed automatically after eachMessage resolves
      } catch (err) {
        // Throwing here will cause the consumer to pause and retry
        // Consider a dead-letter topic for poison pill messages
        throw err;
      }
    },
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await consumer.disconnect();
  await producer.disconnect();
});
```

---

## 6. Message Queues In Depth — RabbitMQ

### RabbitMQ core concepts

```text
RabbitMQ is a traditional message broker based on AMQP protocol.
Producers publish to Exchanges, which route messages to Queues,
which are consumed by consumers.

  Producer → Exchange → [binding rules] → Queue → Consumer

  Exchange types:
    direct  → routes by exact routing key match
    topic   → routes by routing key pattern (*.error, payment.#)
    fanout  → broadcasts to ALL bound queues (ignores routing key)
    headers → routes by message header attributes (rarely used)

  Queue: stores messages until consumed.
    - Durable: survives broker restart (stored to disk)
    - Exclusive: used by only one connection
    - Auto-delete: deleted when last consumer disconnects

  Binding: rule that connects an exchange to a queue
    - direct binding: routingKey === bindingKey
    - topic binding: routingKey matches pattern (# = any words, * = one word)
```

```text
Message Flow Examples:

1. Direct Exchange (point-to-point):
   Producer publishes routingKey="payment.process"
   Exchange routes to Queue bound with key "payment.process"
   → Only payment consumers receive it

2. Fanout Exchange (broadcast):
   Producer publishes any message
   Exchange sends to ALL bound queues
   → analytics-queue, audit-queue, notification-queue all receive it

3. Topic Exchange (pattern routing):
   Producer publishes routingKey="order.us.created"
   Queue A bound with "order.#"     → matches (receives it)
   Queue B bound with "order.*.created" → matches (receives it)
   Queue C bound with "payment.#"   → does NOT match

   Pattern syntax:
     *  matches exactly one word segment
     #  matches zero or more word segments
```

### Acknowledgments and Dead Letter Queues

```text
Message Acknowledgment:
  - When consumer receives a message, RabbitMQ marks it "unacked"
  - Consumer calls channel.ack(msg) after successful processing
  - If consumer crashes (without ack), RabbitMQ re-queues the message
  - channel.nack(msg, false, true)  → re-queue the message (retry)
  - channel.nack(msg, false, false) → discard or send to DLQ

Dead Letter Queue (DLQ):
  - A queue where messages go when they cannot be processed
  - Triggers: nack with no-requeue, message TTL exceeded, queue length exceeded
  - Configured via x-dead-letter-exchange on the original queue
  - DLQ messages include headers showing why they were dead-lettered
  - Ops team can inspect DLQ, fix the issue, and re-publish messages
```

```js
// Node.js RabbitMQ with amqplib
const amqp = require('amqplib');

async function setup() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // Declare a durable queue with a dead letter exchange
  await channel.assertExchange('dlx', 'direct', { durable: true });
  await channel.assertQueue('dead-letter-queue', { durable: true });
  await channel.bindQueue('dead-letter-queue', 'dlx', 'payment-failed');

  await channel.assertExchange('payments', 'direct', { durable: true });
  await channel.assertQueue('payment-processing', {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dlx',
      'x-dead-letter-routing-key': 'payment-failed',
      'x-message-ttl': 30000,         // messages expire after 30s
      'x-max-retries': 3,             // custom header — checked in consumer
    },
  });
  await channel.bindQueue('payment-processing', 'payments', 'payment.process');

  return { connection, channel };
}

// ─── PRODUCER ────────────────────────────────────────────────────────────────
async function publishPayment(channel, paymentData) {
  channel.publish(
    'payments',              // exchange
    'payment.process',       // routing key
    Buffer.from(JSON.stringify(paymentData)),
    {
      persistent: true,      // survives broker restart (requires durable queue)
      contentType: 'application/json',
      headers: {
        'x-retry-count': 0,
        'correlation-id': crypto.randomUUID(),
      },
    }
  );
}

// ─── CONSUMER ────────────────────────────────────────────────────────────────
async function startConsumer(channel) {
  // prefetch(1) = process ONE message at a time (backpressure)
  // Without this, RabbitMQ floods the consumer with all queued messages
  await channel.prefetch(1);

  channel.consume('payment-processing', async (msg) => {
    if (!msg) return; // consumer cancelled

    const payment = JSON.parse(msg.content.toString());
    const retryCount = (msg.properties.headers['x-retry-count'] ?? 0);

    try {
      await processPayment(payment);
      channel.ack(msg); // SUCCESS — remove from queue
    } catch (err) {
      console.error(`Payment failed (attempt ${retryCount + 1}):`, err.message);

      if (retryCount < 3) {
        // Re-publish with incremented retry count (manual retry with backoff)
        channel.publish(
          'payments',
          'payment.process',
          msg.content,
          {
            persistent: true,
            headers: { 'x-retry-count': retryCount + 1 },
            expiration: String(Math.pow(2, retryCount) * 1000), // exponential backoff
          }
        );
        channel.ack(msg); // Ack original to prevent re-queue loop
      } else {
        // Give up — send to DLQ
        channel.nack(msg, false, false);
      }
    }
  });
}
```

### Kafka vs RabbitMQ — when to use which

```text
Use Kafka when:
  ✓ You need to replay events (audit trail, rebuilding projections)
  ✓ High throughput (millions of messages/second)
  ✓ Multiple independent consumer groups reading the same stream
  ✓ Event log is the primary source of truth (event sourcing)
  ✓ Stream processing (Kafka Streams, ksqlDB)
  ✓ Long retention periods required

Use RabbitMQ when:
  ✓ Complex routing logic (topic/header exchanges)
  ✓ Traditional task queues (work distribution among workers)
  ✓ You need per-message TTL, priority queues
  ✓ Lower operational complexity is preferred (simpler than Kafka)
  ✓ Messages should be deleted after consumption (no replay needed)
  ✓ Request-reply patterns (RPC over messaging)

Key difference:
  RabbitMQ is a message BROKER — it pushes messages to consumers and
  deletes them after acknowledgment. Messages are transient by nature.

  Kafka is a distributed LOG — it retains messages. Consumers pull at
  their own pace. The log is the canonical record.
```

---

## 7. Event-Driven Architecture — Domain Events, Event Sourcing, CQRS

### Domain Events

```text
A domain event is a fact that happened in the domain, expressed in past tense.
It is immutable — it describes something that already occurred.

Good domain events:
  OrderPlaced         (not "PlaceOrder" — that's a command)
  PaymentProcessed
  ItemShippedToCustomer
  UserEmailVerified

Events carry all the data needed for consumers to react:
  {
    "eventId": "uuid",
    "type": "OrderPlaced",
    "occurredAt": "2024-01-15T10:30:00Z",
    "aggregateId": "order:abc123",
    "data": {
      "orderId": "abc123",
      "userId": "user:xyz",
      "items": [...],
      "total": 9999
    }
  }

Events flow through the system triggering reactions in other services:
  OrderPlaced
    → InventoryService decrements stock
    → NotificationService sends confirmation email
    → AnalyticsService records the sale
    → LoyaltyService awards points

Each consumer reacts independently. Adding a new consumer doesn't
require changing OrderService at all.
```

### Event Sourcing

```text
In standard CRUD, you store CURRENT STATE in the database.
In event sourcing, you store the HISTORY OF EVENTS and derive current state.

Standard approach:
  DB: orders table
  UPDATE orders SET status='shipped' WHERE id='abc'
  ← Previous status is gone forever

Event sourcing approach:
  Event store: events table
  INSERT: { type: 'OrderPlaced',   orderId: 'abc', items: [...] }
  INSERT: { type: 'PaymentTaken',  orderId: 'abc', amount: 9999 }
  INSERT: { type: 'OrderShipped',  orderId: 'abc', carrier: 'FedEx' }

  Current state = replay all events in sequence:
  OrderPlaced  → { status: 'pending', items: [...] }
  PaymentTaken → { status: 'paid', items: [...] }
  OrderShipped → { status: 'shipped', carrier: 'FedEx' }

Benefits of event sourcing:
  - Full audit trail — you can see every state transition
  - Time travel — reconstruct state at any point in time
  - Event replay — rebuild projections after bugs or new features
  - Natural fit for event-driven microservices

Drawbacks:
  - Querying current state is expensive (must replay events) — solved by snapshots
  - Schema evolution is hard (old events must remain compatible)
  - Eventual consistency — projections may lag
  - More complex than CRUD
```

### CQRS — Command Query Responsibility Segregation

```text
CQRS separates the write model (commands) from the read model (queries).

Without CQRS:
  One model handles reads AND writes. Complex queries are slow because
  the write-optimized schema isn't read-optimized.

With CQRS:
  Write side (Command):
    - Accepts commands (PlaceOrder, CancelOrder)
    - Validates, applies business rules
    - Saves events (if event sourcing) or updates write DB
    - Publishes domain events

  Read side (Query):
    - Separate DB optimized for reads (materialized views, denormalized)
    - Updated asynchronously by listening to domain events
    - Can use a completely different DB (e.g., Elasticsearch for search)
    - Returns pre-computed data — blazing fast reads

  ┌─────────────────────────────────────────────────────────┐
  │                      Client                             │
  └──────────────┬──────────────────────┬───────────────────┘
                 │ Commands             │ Queries
                 ▼                      ▼
  ┌──────────────────────┐  ┌──────────────────────────────┐
  │   Command Handler    │  │      Query Handler           │
  │   (write side)       │  │      (read side)             │
  │                      │  │                              │
  │  Validates command   │  │  Hits read-optimized DB      │
  │  Updates write DB    │  │  (Postgres view, Redis,      │
  │  Emits domain event  │  │   Elasticsearch)             │
  └──────────┬───────────┘  └──────────────────────────────┘
             │                           ▲
             └── domain event ───────────┘
                  (updates read DB
                   asynchronously)

Use CQRS when:
  - Read load >> write load (scale them independently)
  - Read queries are too complex for the write schema
  - You need multiple different read representations of the same data
  - Combined with event sourcing (very common pairing)
```

---

## 8. Saga Pattern — Distributed Transactions

### The problem: distributed transactions

```text
In a monolith, you can wrap multiple DB operations in a single ACID transaction.
If any step fails, everything rolls back.

In microservices, each service has its own DB.
Traditional two-phase commit (2PC) across services is:
  - Slow (blocking locks across services)
  - Fragile (coordinator becomes single point of failure)
  - Rarely supported by modern distributed databases

The Saga pattern solves this with a sequence of LOCAL transactions,
each publishing an event or message that triggers the next step.
If a step fails, compensating transactions undo previous steps.
```

### Choreography Saga

```text
No central coordinator. Each service listens for events and reacts.
Services are self-organizing.

  Order Service        Payment Service       Inventory Service
       │                     │                      │
  1.   │── OrderCreated ─────►│                      │
       │                     │                      │
  2.   │                 PaymentProcessed ──────────►│
       │                                            │
  3.   │◄──────────────── InventoryReserved ─────────│
       │
  4. OrderConfirmed

  If Payment fails:
  1.   │── OrderCreated ─────►│
       │                     │── PaymentFailed ──────►│ (trigger compensation)
       │◄────────────────── OrderCancelled ────────────│
       (Inventory does nothing; Order Service cancels the order)

Pros:
  - No single point of failure
  - Services are truly decoupled
  - Easy to add new participants (subscribe to existing events)

Cons:
  - Hard to understand the overall flow (it's implicit in event subscriptions)
  - Cyclic dependencies can emerge
  - Difficult to track overall saga state
```

### Orchestration Saga

```text
A central orchestrator (Saga Orchestrator) directs each step explicitly.
It knows the full flow and issues commands.

  Saga Orchestrator
       │
  1.   │── PlacePayment ────► Payment Service
       │◄─ PaymentProcessed ─ Payment Service
       │
  2.   │── ReserveInventory ► Inventory Service
       │◄─ InventoryReserved  Inventory Service
       │
  3.   │── ConfirmOrder ────► Order Service
       │◄─ OrderConfirmed ──  Order Service
       │
       DONE

  If step 2 fails:
       │── ReserveInventory ► Inventory Service
       │◄─ InsufficientStock  Inventory Service
       │
  Compensate:
       │── RefundPayment ───► Payment Service (compensating transaction)
       │◄─ PaymentRefunded ─  Payment Service
       │
       │── CancelOrder ─────► Order Service
       DONE

Pros:
  - Saga flow is explicit and auditable in one place
  - Easier to implement complex conditional flows
  - Saga state can be persisted (durable saga orchestrator)

Cons:
  - Orchestrator is a central component (not a single point of failure if replicated)
  - Risk of the orchestrator becoming a "god service" with too much business logic
```

### Node.js Saga implementation (Orchestration)

```js
// Simplified saga orchestrator for an order flow
class OrderSagaOrchestrator {
  constructor({ paymentService, inventoryService, orderService, eventBus }) {
    this.paymentService = paymentService;
    this.inventoryService = inventoryService;
    this.orderService = orderService;
    this.eventBus = eventBus;
  }

  async execute(sagaData) {
    const sagaId = crypto.randomUUID();
    const compensations = []; // stack of undo functions

    console.log(`[Saga ${sagaId}] Starting order saga`);

    try {
      // Step 1: Process payment
      const payment = await this.paymentService.charge({
        userId: sagaData.userId,
        amount: sagaData.total,
        sagaId,
      });
      // Register compensation IMMEDIATELY after each successful step
      compensations.push(() =>
        this.paymentService.refund({ paymentId: payment.id, sagaId })
      );

      // Step 2: Reserve inventory
      const reservation = await this.inventoryService.reserve({
        items: sagaData.items,
        sagaId,
      });
      compensations.push(() =>
        this.inventoryService.release({ reservationId: reservation.id, sagaId })
      );

      // Step 3: Confirm order (last step — no compensation needed for this)
      const order = await this.orderService.confirm({
        orderId: sagaData.orderId,
        paymentId: payment.id,
        reservationId: reservation.id,
        sagaId,
      });

      console.log(`[Saga ${sagaId}] Completed successfully`);
      return { success: true, order };

    } catch (err) {
      console.error(`[Saga ${sagaId}] Failed at step: ${err.message}`);
      console.log(`[Saga ${sagaId}] Running ${compensations.length} compensations`);

      // Execute compensations in REVERSE ORDER (stack)
      for (const compensate of compensations.reverse()) {
        try {
          await compensate();
        } catch (compensationErr) {
          // Compensation failed — this is a critical situation
          // Log to alerting system, may need manual intervention
          console.error(`[Saga ${sagaId}] COMPENSATION FAILED:`, compensationErr.message);
          // Continue trying remaining compensations — don't throw
        }
      }

      return { success: false, error: err.message };
    }
  }
}

// Usage
const saga = new OrderSagaOrchestrator({ paymentService, inventoryService, orderService });
const result = await saga.execute({
  orderId: 'order-123',
  userId: 'user-456',
  items: [{ productId: 'prod-1', qty: 2 }],
  total: 4999,
});
```

---

## 9. Circuit Breaker Pattern

### The problem: cascading failures

```text
Service A calls Service B. Service B is slow or down.
Service A's threads pile up waiting for B.
Service A runs out of thread pool capacity.
Service A becomes unresponsive.
Service C, which calls A, also fails.
The entire system collapses.

Circuit Breaker prevents this by failing FAST once a threshold is exceeded.
```

### Circuit Breaker states

```text
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   CLOSED ──────────── failure threshold exceeded ──► OPEN   │
  │   (normal)                                          (fail    │
  │      ▲                                               fast)   │
  │      │                                                │      │
  │      │                                         reset timeout │
  │      │                                                │      │
  │      └── success ────────────── HALF-OPEN ◄───────────┘      │
  │                                 (trial run)                  │
  │                                     │                        │
  │                                 failure                      │
  │                                     │                        │
  │                                     └──────────► OPEN again  │
  └──────────────────────────────────────────────────────────────┘

CLOSED:
  - Normal operation. All requests pass through to the downstream service.
  - Failures are counted. If failures exceed threshold in a time window
    (e.g., 5 failures in 10 seconds), trip to OPEN.

OPEN:
  - All requests fail immediately (no network call made).
  - Returns a fallback response or error immediately.
  - After a reset timeout (e.g., 30 seconds), transitions to HALF-OPEN.

HALF-OPEN:
  - A single trial request is allowed through.
  - If it succeeds → transition back to CLOSED (service recovered).
  - If it fails → transition back to OPEN (service still down).
```

### Node.js Circuit Breaker implementation

```js
// A simple but production-quality circuit breaker in Node.js

class CircuitBreaker {
  constructor(fn, options = {}) {
    this.fn = fn;                                      // the function to protect
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 30000;           // ms before trying HALF-OPEN
    this.callTimeout = options.callTimeout ?? 5000;    // ms before a call is considered failed

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  async call(...args) {
    if (this.state === 'OPEN') {
      const msSinceLastFailure = Date.now() - this.lastFailureTime;
      if (msSinceLastFailure < this.timeout) {
        throw new Error(`Circuit OPEN — fast failing (${Math.round((this.timeout - msSinceLastFailure) / 1000)}s remaining)`);
      }
      // Timeout elapsed — try HALF-OPEN
      this.state = 'HALF-OPEN';
      console.log('Circuit breaker → HALF-OPEN (trial request)');
    }

    try {
      const result = await this._callWithTimeout(...args);
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _callWithTimeout(...args) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Call timed out after ${this.callTimeout}ms`));
      }, this.callTimeout);

      this.fn(...args)
        .then((result) => { clearTimeout(timer); resolve(result); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }

  _onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF-OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('Circuit breaker → CLOSED (service recovered)');
      }
    }
  }

  _onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'HALF-OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.successCount = 0;
      console.log(`Circuit breaker → OPEN (${this.failureCount} failures)`);
    }
  }

  getState() {
    return { state: this.state, failureCount: this.failureCount };
  }
}

// Usage — wrapping an HTTP call to Payment Service
const paymentBreaker = new CircuitBreaker(
  (paymentData) => axios.post('http://payment-service/charge', paymentData),
  { failureThreshold: 5, timeout: 30000, callTimeout: 3000 }
);

async function chargeCustomer(paymentData) {
  try {
    const result = await paymentBreaker.call(paymentData);
    return result.data;
  } catch (err) {
    if (err.message.startsWith('Circuit OPEN')) {
      // Fallback: queue for later processing
      await paymentQueue.enqueue(paymentData);
      return { status: 'queued', message: 'Payment queued for processing' };
    }
    throw err;
  }
}
```

### Hystrix / Resilience4j concepts

```text
Hystrix (Netflix, now in maintenance mode) and Resilience4j (modern replacement)
are battle-tested circuit breaker libraries for Java.

Key concepts they add beyond the basic circuit breaker:

  Bulkhead:
    Limits concurrent calls to a service (thread pool or semaphore isolation).
    Even if Payment Service is slow, only 10 threads are blocked waiting.
    Other services are unaffected.

  Rate Limiter:
    Limits calls per time period (e.g., max 100/second to Payment Service).
    Protects downstream services from being overwhelmed.

  Retry:
    Automatically retry failed calls with configurable backoff.
    Combined with circuit breaker: retry first, then open circuit.

  Timeout:
    Every remote call has a deadline. If exceeded, fail immediately.
    This is THE most important property — never call a remote service
    without a timeout.

In Node.js, the 'opossum' library provides Hystrix-compatible circuit breaking.
In production, combine: Timeout + Retry (with backoff) + Circuit Breaker + Bulkhead.
```

---

## 10. API Gateway

### What an API Gateway does

```text
An API Gateway is the single entry point for all client requests.
It sits in front of all microservices and handles cross-cutting concerns.

  ┌──────────┐        ┌─────────────────────────────────────────┐
  │  Mobile  │        │              API GATEWAY                │
  │  App     ├───────►│                                         │
  └──────────┘        │  1. TLS termination                     │
                      │  2. Authentication / JWT validation      │
  ┌──────────┐        │  3. Rate limiting                       │
  │  Web     ├───────►│  4. Request routing                     │
  │  Browser │        │  5. Request/response transformation     │
  └──────────┘        │  6. Load balancing                      │
                      │  7. Caching                             │
  ┌──────────┐        │  8. Logging / tracing                   │
  │  Third   ├───────►│  9. API versioning                      │
  │  Party   │        │ 10. Request aggregation                 │
  └──────────┘        └───────┬──────────┬──────────┬───────────┘
                              │          │          │
                              ▼          ▼          ▼
                         User       Order      Payment
                        Service    Service    Service
```

### Rate Limiting

```text
Rate limiting protects services from being overwhelmed and prevents abuse.

Common algorithms:
  Token Bucket:
    - Bucket holds N tokens, refills at R tokens/second
    - Each request consumes 1 token
    - If bucket empty → reject request
    - Allows bursts up to bucket capacity

  Leaky Bucket:
    - Requests enter a queue; processed at fixed rate
    - Queue overflow → reject
    - Smoother output, no bursts allowed

  Fixed Window Counter:
    - Count requests per time window (e.g., 100/minute)
    - Simple but has edge case: 100 at 0:59 + 100 at 1:01 = 200 in 2 seconds

  Sliding Window Log:
    - Exact but memory-intensive (stores each request timestamp)
    - Most accurate rate limiting

In the gateway:
  - Rate limit by API key, user ID, or IP
  - Store counts in Redis (shared across gateway instances)
  - Return 429 Too Many Requests with Retry-After header
```

### Request Aggregation (API Composition)

```text
The gateway can combine multiple service calls into a single response,
saving the client from making N round trips.

Without aggregation (client makes 3 requests):
  Client → GET /users/123        → User Service
  Client → GET /orders?user=123  → Order Service
  Client → GET /notifications/123 → Notification Service

With aggregation (gateway handles it):
  Client → GET /dashboard/123   → Gateway
                                      ├─ GET /users/123
                                      ├─ GET /orders?user=123
                                      └─ GET /notifications/123
                                      (parallel calls)
                                  ← merged response { user, orders, notifications }

This is especially important for mobile clients on high-latency connections.
```

### Backend for Frontend (BFF) Pattern

```text
Instead of one generic API Gateway, create purpose-built gateways
for each type of client.

  ┌────────────┐     ┌──────────────────┐
  │ Mobile App │────►│  Mobile BFF      │  ← optimized for mobile:
  └────────────┘     │  (lightweight,   │     compressed payloads,
                     │   offline-safe)  │     fewer fields returned
                     └──────────────────┘
                              │
  ┌────────────┐     ┌──────────────────┐          ┌──────────────┐
  │ Web App    │────►│  Web BFF         │──────────►│ Microservices│
  └────────────┘     │  (full data,     │           │   (shared)   │
                     │   SSR support)   │           └──────────────┘
                     └──────────────────┘
                              │
  ┌────────────┐     ┌──────────────────┐
  │ Third-Party│────►│  Public API BFF  │  ← versioned, stable,
  └────────────┘     │  (rate-limited,  │     well-documented
                     │   versioned)     │
                     └──────────────────┘

Each BFF is maintained by the team that owns the client, allowing
mobile and web teams to evolve their APIs independently without
coordinating with backend teams.
```

---

## 11. Service Discovery

### The problem

```text
In a microservices system, service instances come and go (scaling up/down,
rolling deployments, crashes). You can't hardcode IP addresses.

Service Discovery answers: "Where is the current healthy instance of User Service?"
```

### Client-side discovery (Eureka model)

```text
Each service registers itself with a Service Registry on startup.
Clients query the registry to find service instances, then call directly.

  Service A starts → registers with Registry { name: "user-service", ip: "10.0.1.5", port: 3001 }

  Service B wants to call Service A:
    1. B queries Registry: "where is user-service?"
    2. Registry returns: [{ ip: "10.0.1.5", port: 3001 }, { ip: "10.0.1.6", port: 3001 }]
    3. B applies load balancing (round-robin) → picks 10.0.1.5
    4. B calls 10.0.1.5:3001 directly

Registry: Netflix Eureka, Consul, etcd

Pros:
  - Client controls load balancing strategy
  - One fewer network hop (no proxy)

Cons:
  - Every client needs service-discovery logic (language-specific library)
  - Client must handle stale registry data (TTL-based health checks)
```

### Server-side discovery (Kubernetes DNS model)

```text
The load balancer / proxy handles discovery. Client just calls a stable name.

  Service B calls http://user-service:3001/users/123
  → Kubernetes DNS resolves "user-service" to the Service ClusterIP
  → kube-proxy routes to a healthy Pod based on iptables rules

  Service B knows nothing about how many instances exist or their IPs.

Pros:
  - Client is simple — just use a DNS name
  - Works across all languages without client-side libraries
  - Kubernetes handles health checking (readiness probes remove unhealthy pods)

Cons:
  - Extra network hop through the proxy/load balancer
  - Client cannot use sophisticated routing (it delegates that to the proxy)

Health checks:
  Kubernetes readiness probe: "is this pod ready to accept traffic?"
    → If readiness probe fails, pod is removed from service endpoints
    → Rolling deploys drain old pods gracefully

  Kubernetes liveness probe: "is this pod alive?"
    → If liveness probe fails repeatedly, pod is restarted
```

---

## 12. Distributed Tracing

### The problem

```text
A request in a microservices system touches many services.
When it's slow or fails, which service is responsible?

Without tracing:
  User reports: "checkout is slow"
  You have logs in 6 different services. Which logs are related?
  In what order did things happen?

With distributed tracing:
  Every request gets a unique Trace ID that flows through all services.
  Each service creates a Span (a timed unit of work) linked to the trace.
  You can visualize the entire request as a timeline.
```

### Trace ID, Span ID, propagation

```text
Trace:   the entire end-to-end journey of a single request
  └─ Span: one unit of work within a service (can be nested)
       └─ Child Span: a sub-operation (DB query, downstream HTTP call)

Headers that propagate the context:

  W3C Trace Context (standard):
    traceparent: 00-{traceId}-{spanId}-{flags}
    Example: traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01

  B3 Headers (Zipkin original):
    X-B3-TraceId: 4bf92f3577b34da6a3ce929d0e0e4736
    X-B3-SpanId: 00f067aa0ba902b7
    X-B3-ParentSpanId: a3ce929d0e0e4736
    X-B3-Sampled: 1

Request flow:

  Client → [creates Trace ID] → API Gateway
    API Gateway creates Span "gateway.request"
    forwards traceparent header to User Service
      User Service creates Span "user.getUser" (child of gateway span)
      User Service creates Span "db.query" (child of getUser span)
      returns, closes spans
    API Gateway closes its span
  → Trace is complete, collected by Jaeger/Zipkin
```

### OpenTelemetry in Node.js

```js
// OpenTelemetry is the standard SDK for distributed tracing, metrics, and logs.
// It's vendor-neutral — you can export to Jaeger, Zipkin, Datadog, etc.

// tracing.js — initialize BEFORE importing your app code
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');

const sdk = new NodeSDK({
  serviceName: 'order-service',
  traceExporter: new OTLPTraceExporter({
    url: 'http://jaeger:4318/v1/traces',  // OTLP endpoint
  }),
  instrumentations: [
    new HttpInstrumentation(),       // auto-instrument all HTTP calls
    new ExpressInstrumentation(),    // auto-instrument Express routes
    new PgInstrumentation(),         // auto-instrument PostgreSQL queries
  ],
});

sdk.start();
// All HTTP calls, Express routes, and DB queries now automatically create spans
// and propagate trace context via W3C traceparent headers.

// Manual span creation for custom operations:
const { trace, context } = require('@opentelemetry/api');

async function processOrder(orderId) {
  const tracer = trace.getTracer('order-service');

  // Create a custom span
  const span = tracer.startSpan('processOrder', {
    attributes: {
      'order.id': orderId,
      'order.source': 'web',
    },
  });

  // All code within this context is "inside" the span
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const order = await db.findOrder(orderId);
      span.setAttribute('order.total', order.total);

      await validatePayment(order);    // will create a child span automatically
      await reserveInventory(order);  // same

      span.setStatus({ code: SpanStatusCode.OK });
      return order;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end(); // ALWAYS end the span
    }
  });
}
```

---

## 13. Eventual Consistency — CAP Theorem, BASE vs ACID, Idempotency

### CAP Theorem

```text
CAP Theorem states that a distributed system can guarantee at most TWO
of the following three properties simultaneously:

  Consistency (C):
    Every read receives the most recent write or an error.
    (All nodes see the same data at the same time.)

  Availability (A):
    Every request receives a response (not necessarily the most recent data).
    (The system always responds, even if some nodes are down.)

  Partition Tolerance (P):
    The system continues to operate even when network partitions occur
    (some nodes can't communicate with others).

Since network partitions WILL happen in a distributed system, you must
always choose P. So the real choice is: C or A during a partition?

  CP systems (choose Consistency over Availability):
    HBase, Zookeeper, MongoDB (with majority write concern)
    During a partition: refuse writes until the partition heals.
    Good for: banking, inventory (where wrong data is worse than downtime)

  AP systems (choose Availability over Consistency):
    Cassandra, CouchDB, DynamoDB (eventually consistent reads)
    During a partition: accept writes, merge conflicts when partition heals.
    Good for: shopping carts, social feeds, DNS (stale data briefly OK)

❗ CAP is often oversimplified. PACELC is a more complete model that also
   considers the consistency/latency tradeoff during NORMAL operation.
```

### BASE vs ACID

```text
ACID (traditional relational databases):
  Atomicity:   all operations in a transaction succeed or all fail
  Consistency: DB goes from one valid state to another
  Isolation:   concurrent transactions don't interfere
  Durability:  committed data survives crashes

BASE (distributed systems / NoSQL):
  Basically Available:    system remains available (AP choice)
  Soft state:             state can change over time without input (due to convergence)
  Eventually consistent:  the system will become consistent at some point in the future

Example of eventual consistency:
  User A updates their profile name on Server 1.
  User B reads the profile from Server 2 (replica is 500ms behind).
  User B sees the old name for a brief window — this is acceptable.
  After replication, both servers agree — eventually consistent.

Designing for eventual consistency:
  - Accept that reads may be stale — show "as of X seconds ago" if needed
  - Make writes idempotent (safe to replay)
  - Use conflict resolution strategies (last-write-wins, CRDT, business logic)
  - Never show stale data for safety-critical information (bank balances)
```

### Handling out-of-order events

```text
In a distributed system, messages can arrive out of order.

Example: User places order, then immediately cancels.
Events might arrive: OrderCancelled → OrderPlaced (due to network delays)

Strategies:

  1. Event versioning / sequence numbers:
     Each event has a sequence number per aggregate.
     OrderPlaced (seq=1), OrderCancelled (seq=2)
     If seq=2 arrives before seq=1 → buffer seq=2, wait for seq=1

  2. Timestamps (with caution):
     Use event occurrence time, not processing time.
     Clocks across machines are not perfectly synchronized.
     Use vector clocks or Lamport timestamps for true ordering.

  3. Idempotent consumers with state machine:
     Model valid state transitions explicitly.
     Receiving OrderCancelled when order doesn't exist yet → buffer it.
     Receiving OrderCancelled when already cancelled → ignore (idempotent).
```

### Idempotency

```text
An operation is idempotent if performing it multiple times has the same
effect as performing it once.

Non-idempotent (dangerous in distributed systems):
  POST /payments → creates a new charge each time called
  If the network times out after payment processed but before response →
  client retries → double-charged!

Idempotent (safe):
  POST /payments with idempotency-key: "order-123-attempt-1"
  If called again with the same key → return the original result, don't re-charge

Implementation:
  - Client generates a unique idempotency key per logical operation
  - Server stores (key → result) in Redis/DB with TTL
  - On duplicate request with same key → return stored result
```

```js
// Idempotency middleware for Express
const redis = require('ioredis');
const client = new redis();

async function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) return next(); // optional for non-mutating endpoints

  const cacheKey = `idempotent:${req.path}:${idempotencyKey}`;
  const cached = await client.get(cacheKey);

  if (cached) {
    const { statusCode, body } = JSON.parse(cached);
    return res.status(statusCode).json(body); // return original result
  }

  // Intercept the response to cache it
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    await client.setex(
      cacheKey,
      86400, // 24-hour TTL
      JSON.stringify({ statusCode: res.statusCode, body })
    );
    return originalJson(body);
  };

  next();
}

app.use('/payments', idempotencyMiddleware);
```

---

## 14. Data Management in Microservices

### Database per service — the foundational rule

```text
Each microservice owns its own database. No other service can access it directly.

  User Service      Order Service     Payment Service
  ┌──────────┐      ┌──────────┐      ┌──────────────┐
  │ PostgreSQL│      │ MongoDB  │      │ PostgreSQL   │
  │  users DB │      │ orders DB│      │ payments DB  │
  └──────────┘      └──────────┘      └──────────────┘
       ▲                  ▲                  ▲
       │                  │                  │
  Only User Svc      Only Order Svc     Only Payment Svc
  can query here    can query here     can query here

Why this matters:
  - Services can be deployed and scaled independently
  - Each service can use the best DB for its use case
    (User: relational, Order: document, Search: Elasticsearch)
  - Schema changes in one service don't break another
  - Teams can evolve their data model without coordination

Cross-service queries:
  Service A cannot JOIN with Service B's DB table.
  Options:
    1. API call: Service A asks Service B for data at runtime
    2. Event-driven denormalization: Service A maintains its own copy
       of Service B's data, updated via events
    3. Read-side projection (CQRS): a materialized view maintained by events
```

### Shared database anti-pattern

```text
NEVER share a database between services (except in a carefully bounded monolith).

  ┌──────────────────────────────────────────────────────┐
  │                   SHARED DATABASE ← ANTI-PATTERN     │
  │                                                      │
  │   User Service ──────────────────────────────────┐   │
  │                                                  ▼   │
  │   Order Service ─────────────────────────► Postgres  │
  │                                                  ▲   │
  │   Payment Service ───────────────────────────────┘   │
  └──────────────────────────────────────────────────────┘

Problems:
  - Schema change in one service can break others (tight coupling)
  - One service with a slow query degrades all services
  - Impossible to scale services independently (DB is the bottleneck)
  - One DB outage takes down all services
  - Teams cannot evolve their schema without cross-team coordination

Exception: Reporting databases / data warehouses (read-only replicas
for analytics) — these are acceptable because they're read-only and
explicitly separate from operational data.
```

### Event sourcing for cross-service data

```text
Instead of sharing a DB, services share EVENTS via a message bus.
Each service maintains its own projection of the data it needs.

  Order Service creates an order and publishes:
  → OrderCreated { orderId, userId, items, total }

  Inventory Service subscribes and maintains its own local table:
    inventory_reservations { orderId, items, status }

  Search Service subscribes and indexes the order in Elasticsearch.

  Analytics Service subscribes and inserts into its data warehouse.

Each service has the data it needs, in the schema it prefers,
without calling another service at query time (low latency, no coupling).

The cost: eventual consistency. The projection lags behind the source by
the time it takes to consume the event (usually milliseconds to seconds).
```

---

## 15. Strangler Fig Pattern

### What it is and why it works

```text
The Strangler Fig is a strategy for incrementally migrating a monolith
to microservices WITHOUT a big-bang rewrite.

Named after the strangler fig tree, which grows around an existing tree,
eventually replacing it while the original tree continues to function.

  Phase 1: Route new features to microservices, keep old ones in monolith
  Phase 2: Gradually migrate existing monolith features to microservices
  Phase 3: Monolith is strangled — all traffic goes to microservices

  ┌──────────────┐        Phase 1: facade in front
  │   Clients    │        ┌──────────────────────────────────────────┐
  └──────┬───────┘        │            API Gateway / Facade          │
         │                │                                          │
         └───────────────►│  /users/*   → User Microservice (new)    │
                          │  /products  → Monolith (old)             │
                          │  /orders/*  → Order Microservice (new)   │
                          └──────────────────────────────────────────┘
                                   ↓ monolith routes still work

  Phase 2: Migrate /products to Product Microservice
         Route all /products/* to Product Microservice
         Monolith's product code can be deleted

  Phase N: Monolith is empty — decommission it
```

### Implementation steps

```text
1. Put a facade (API Gateway or reverse proxy) in front of the monolith.
   All traffic goes through the facade. No client changes needed.

2. Choose the EASIEST domain to extract first (often authentication,
   notifications, or a self-contained feature with few dependencies).

3. Build the new microservice for that domain.

4. Migrate the facade to route that domain's traffic to the new service.

5. Gradually migrate data from the monolith DB to the service's own DB.
   - Use the "Expand-Contract" pattern for DB migrations:
     a. Add new table/schema alongside old (expand)
     b. Dual-write to both during transition
     c. Read from new, stop writing to old (contract)
     d. Remove old schema

6. Delete the extracted code from the monolith.

7. Repeat for the next domain.

Key principle: the system always remains operational. No downtime.
Users see no difference. You can pause at any phase.
```

---

## 16. Deployment Patterns — Sidecar, Ambassador, Adapter, Service Mesh

### Sidecar Pattern

```text
Deploy a secondary container alongside every service container.
The sidecar handles cross-cutting concerns so the service doesn't have to.

  ┌─────────────────────────────────────┐
  │              Pod (Kubernetes)       │
  │                                     │
  │  ┌──────────────┐  ┌─────────────┐  │
  │  │  Your App    │  │   Sidecar   │  │
  │  │  (Node.js)   │◄─►│  (Envoy)   │  │
  │  │              │  │             │  │
  │  │  port 3000   │  │  port 80    │  │ ← external traffic goes here
  │  └──────────────┘  └─────────────┘  │
  │                                     │
  └─────────────────────────────────────┘

Sidecar handles:
  - mTLS (mutual TLS) — encrypts all traffic between services
  - Retries and circuit breaking
  - Metrics collection (Prometheus scraping)
  - Distributed tracing (adding trace headers)
  - Traffic shaping (rate limiting, canary routing)

Your app code stays clean — no circuit breaker libraries, no TLS config.
The sidecar handles it all transparently.
```

### Ambassador Pattern

```text
The ambassador sidecar acts as an outbound proxy — it handles all
egress (outgoing) calls from your service.

  Your App → http://localhost:8080/payment → Ambassador Sidecar
  Ambassador → resolves "payment-service", adds retry, adds trace headers
  Ambassador → actual call to payment-service

Use cases:
  - Service discovery (ambassador resolves names)
  - Protocol translation (your app uses HTTP, downstream uses gRPC)
  - Connection pooling (ambassador maintains efficient connection pools)
  - A/B testing routing for outbound calls
```

### Adapter Pattern

```text
The adapter sidecar standardizes the interface your service exposes to
the rest of the system — handles ingress (incoming) concerns.

Use cases:
  - Standardize metrics format (your Java app exposes JMX metrics,
    adapter converts to Prometheus format)
  - Protocol translation for incoming calls
  - Authentication / authorization on the way in
```

### Service Mesh (Istio)

```text
A service mesh is a dedicated infrastructure layer for service-to-service
communication, implemented using the sidecar pattern across ALL services.

Istio deploys Envoy proxies as sidecars to every pod.
The "data plane" is all the Envoy proxies.
The "control plane" (Istiod) configures them centrally.

Capabilities:
  Traffic management:
    - Load balancing (round-robin, least-connections, consistent hashing)
    - Circuit breaking
    - Retries with backoff
    - Traffic splitting (canary: 5% to v2, 95% to v1)
    - Fault injection (chaos engineering — inject 500ms delays or errors)

  Security:
    - mTLS between all services by default (zero-trust networking)
    - Service-to-service authorization policies
    - No certificate management in your code

  Observability:
    - Automatic distributed tracing (Envoy adds trace headers)
    - Automatic metrics (request rate, error rate, latency histograms)
    - Access logs for all service-to-service calls

  VirtualService (Istio traffic rule example):
    route 90% of traffic to order-service:v1
    route 10% of traffic to order-service:v2 (canary)
    → Instantly roll back by changing the split (no redeployment)

Cost:
  - Operational complexity — Istio has a significant learning curve
  - Resource overhead — every pod has an Envoy sidecar using ~50MB RAM
  - Latency added by the proxy hops (usually <1ms, but non-zero)
  - Not worth it for small deployments (< 10 services)
```

---

## 17. Testing Microservices

### Testing pyramid for microservices

```text
            ▲
           /E2E\          Few, slow, brittle — test critical user journeys
          /─────\
         /Integr-\        Medium — test service boundaries and contracts
        /─────────\
       / Contract  \      Medium — test API contracts between services
      /─────────────\
     /     Unit      \    Many, fast — test business logic in isolation
    /─────────────────\

In a microservices context:
  Unit tests:     Test individual functions/classes within a service (mocked dependencies)
  Integration:    Test a service against a real DB, real cache (dockerized)
  Contract:       Test that Service A's expectations of Service B's API are met
  E2E:            Test the full flow across services (usually against a staging environment)
```

### Unit Testing

```js
// Unit test — test business logic with mocked dependencies
// Using Jest + dependency injection

// orderService.js
class OrderService {
  constructor({ userClient, inventoryClient, db }) {
    this.userClient = userClient;
    this.inventoryClient = inventoryClient;
    this.db = db;
  }

  async placeOrder({ userId, items }) {
    const user = await this.userClient.getUser(userId);
    if (!user) throw new Error('User not found');

    const available = await this.inventoryClient.checkAvailability(items);
    if (!available) throw new Error('Items out of stock');

    return this.db.createOrder({ userId, items, status: 'pending' });
  }
}

// orderService.test.js
describe('OrderService.placeOrder', () => {
  let service;
  const mockUserClient = { getUser: jest.fn() };
  const mockInventoryClient = { checkAvailability: jest.fn() };
  const mockDb = { createOrder: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService({
      userClient: mockUserClient,
      inventoryClient: mockInventoryClient,
      db: mockDb,
    });
  });

  it('should create an order when user exists and items are available', async () => {
    mockUserClient.getUser.mockResolvedValue({ id: 'user-1', name: 'Alice' });
    mockInventoryClient.checkAvailability.mockResolvedValue(true);
    mockDb.createOrder.mockResolvedValue({ id: 'order-99' });

    const result = await service.placeOrder({ userId: 'user-1', items: [{ id: 'prod-1', qty: 1 }] });

    expect(result).toEqual({ id: 'order-99' });
    expect(mockDb.createOrder).toHaveBeenCalledWith({
      userId: 'user-1',
      items: expect.any(Array),
      status: 'pending',
    });
  });

  it('should throw when user not found', async () => {
    mockUserClient.getUser.mockResolvedValue(null);
    await expect(service.placeOrder({ userId: 'bad-user', items: [] }))
      .rejects.toThrow('User not found');
    expect(mockDb.createOrder).not.toHaveBeenCalled();
  });
});
```

### Integration Testing

```js
// Integration test — test a service with a real DB using Testcontainers
// (spins up Docker containers in the test)

const { GenericContainer } = require('testcontainers');
const { Pool } = require('pg');

describe('OrderRepository integration', () => {
  let container;
  let pool;
  let repo;

  beforeAll(async () => {
    // Start a real Postgres container for the test
    container = await new GenericContainer('postgres:15')
      .withEnvironment({ POSTGRES_PASSWORD: 'test', POSTGRES_DB: 'orders_test' })
      .withExposedPorts(5432)
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: 'orders_test',
      user: 'postgres',
      password: 'test',
    });

    await pool.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    repo = new OrderRepository(pool);
  }, 60000); // allow time for container startup

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it('should create and retrieve an order', async () => {
    const order = await repo.create({ userId: 'user-1', status: 'pending' });
    expect(order.id).toBeDefined();

    const fetched = await repo.findById(order.id);
    expect(fetched.userId).toBe('user-1');
    expect(fetched.status).toBe('pending');
  });
});
```

### Contract Testing with Pact

```text
Contract testing verifies that services honour each other's API expectations.

Without contract tests:
  Service A assumes User Service returns { id, name, email }
  User Service team renames "email" to "emailAddress"
  Service A breaks in production — caught too late

With Pact:
  1. Consumer (Service A) defines the contract:
     "I expect User Service to return { id, name, email } for GET /users/:id"
  2. Consumer test publishes the contract (Pact file) to a Pact Broker
  3. Provider (User Service) verifies the contract against its actual implementation
  4. If the provider fails to honour the contract → CI fails BEFORE deployment

This is the "consumer-driven contract testing" pattern.
The consumer defines what it needs. The provider proves it can deliver it.
```

```js
// Consumer side — Order Service
const { Pact } = require('@pact-foundation/pact');
const { like } = require('@pact-foundation/pact/matchers');
const path = require('path');

describe('Order Service → User Service contract', () => {
  const provider = new Pact({
    consumer: 'OrderService',
    provider: 'UserService',
    port: 4000,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'), // Pact file written here
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  it('should receive user details for a valid user ID', async () => {
    // Define the interaction (the contract)
    await provider.addInteraction({
      state: 'user with ID user-123 exists',
      uponReceiving: 'a request for user user-123',
      withRequest: {
        method: 'GET',
        path: '/users/user-123',
        headers: { Accept: 'application/json' },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: like('user-123'),      // like() means "same type", not exact value
          name: like('Alice'),
          email: like('alice@example.com'),
        },
      },
    });

    // Run the actual consumer code against the mock provider
    const userClient = new UserServiceClient('http://localhost:4000');
    const user = await userClient.getUser('user-123');

    expect(user.id).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.email).toBeDefined();
  });
});

// Provider side — User Service runs Pact verification in its CI pipeline
// (fetches the Pact file from the Pact Broker and replays the interactions
// against the real User Service implementation)
```

---

## 18. Common Interview Questions

---

**Q: What is a microservice and how is it different from a monolith?**

A microservice is an independently deployable unit of software that encapsulates a single business capability, owns its own data store, and communicates with other services over the network. A monolith is a single deployable unit where all business logic, data access, and often UI code are compiled and deployed together. The key differences are: deployment independence (each microservice deploys on its own schedule), data isolation (each service owns its DB), fault isolation (a crash in one service doesn't take down others), and scalability (scale only the bottlenecked service). The tradeoff is significantly higher operational complexity — you need distributed tracing, service discovery, message brokers, and container orchestration that a monolith simply doesn't require.

---

**Q: How do you handle a distributed transaction across multiple microservices?**

You use the Saga pattern rather than two-phase commit. A saga breaks a distributed transaction into a sequence of local transactions, each publishing an event or message to trigger the next step. If any step fails, compensating transactions undo the previous steps. There are two implementation styles: choreography (services react to events from each other — decentralized, but hard to understand the full flow) and orchestration (a saga orchestrator explicitly directs each step — centralized, easier to reason about). The key insight is that sagas achieve eventual consistency rather than ACID consistency — there's a window where the system is in a partially-completed state, so you must design compensating transactions carefully and handle scenarios where compensation itself fails.

---

**Q: Explain the Circuit Breaker pattern. Why do you need it?**

Without circuit breakers, a slow or failed downstream service causes callers to block, exhausting their thread pools, which cascades the failure upward. The circuit breaker is a state machine with three states: CLOSED (normal operation, failures counted), OPEN (fail immediately without attempting the call, after failure threshold exceeded), and HALF-OPEN (trial request after a reset timeout — if successful, back to CLOSED; if failed, back to OPEN). This provides fail-fast behavior that prevents cascading failures, allows services time to recover, and provides a place to implement fallback behavior. In Node.js, a key implementation detail is that ALL remote calls must have explicit timeouts — without a timeout, you can never trip the circuit breaker.

---

**Q: What is the difference between Kafka and RabbitMQ? When would you use each?**

They solve similar problems but with fundamentally different models. RabbitMQ is a message broker — it routes messages to queues, consumers acknowledge them, and messages are deleted after consumption. It excels at task distribution, complex routing (direct/topic/fanout exchanges), and traditional work queues. Kafka is a distributed commit log — it retains messages for a configurable period and allows any number of independent consumer groups to read the same stream at their own pace. Kafka is better for event streaming, event sourcing (you can replay the log), high-throughput scenarios (millions/second), and when multiple downstream systems need to react to the same events independently. Use RabbitMQ for task queues and complex routing; use Kafka when you need replay, multiple independent consumers, or very high throughput.

---

**Q: What is eventual consistency and how do you design for it?**

Eventual consistency means that a distributed system will reach a consistent state, but may serve stale reads during a window after a write. It's the result of choosing availability over consistency in CAP theorem terms. Designing for it requires: making all consumers idempotent (safe to process a message twice), using event timestamps from the source rather than processing time, handling out-of-order messages (buffer events with higher sequence numbers until lower ones arrive), using idempotency keys to prevent duplicate side effects, and being explicit about where stale data is acceptable (social feeds: fine; bank balances: not fine). The most important tool is idempotency — if processing an event twice has the same effect as once, eventual consistency stops being dangerous.

---

**Q: How does an API Gateway differ from a load balancer?**

A load balancer distributes traffic across instances of the same service (Layer 4 or 7). An API Gateway is a smart reverse proxy that provides application-level routing AND cross-cutting concerns: authentication/JWT validation, rate limiting, SSL termination, request aggregation (combining multiple service calls into one response), protocol translation (REST to gRPC), API versioning, request/response transformation, and observability (logging, metrics). An API Gateway often includes a load balancer internally. Common choices: Kong (open source, plugin-based), AWS API Gateway, Nginx (with Lua scripting), or building a custom gateway with Node.js/Express. The BFF (Backend for Frontend) pattern extends this by having separate gateway instances per client type (mobile, web, third-party), each optimized for its client's needs.

---

**Q: What is CQRS and when should you use it?**

CQRS (Command Query Responsibility Segregation) separates the write model (commands that change state) from the read model (queries that return data). The write side handles validation and business logic, updates the write-optimized storage, and emits domain events. The read side listens for those events and maintains one or more read-optimized projections (materialized views, denormalized tables, Elasticsearch indexes). This solves the problem where the schema optimized for writes (normalized, transactional) is terrible for reads (requires expensive joins). The tradeoff is eventual consistency — the read side lags behind the write side. Use CQRS when read load significantly exceeds write load, when you need multiple different read representations of the same data, or when you're implementing event sourcing (the two patterns complement each other naturally).

---

**Q: How do you test microservices, specifically the contracts between them?**

Testing strategy follows a pyramid: many fast unit tests (business logic with mocked dependencies), integration tests with real infrastructure (using Testcontainers to spin up dockerized DBs and message brokers), contract tests (using Pact to verify service API contracts), and few end-to-end tests (against a staging environment). Contract testing is the most microservices-specific: the consumer defines what it expects from the provider (e.g., "User Service must return `{ id, name, email }` for GET /users/:id"), this contract is published to a Pact Broker, and the provider runs verification as part of its CI pipeline. If a provider team changes an API in a way that breaks a consumer contract, CI fails before deployment. This catches integration failures early without requiring a full environment and is far more reliable than end-to-end tests for catching breaking API changes.

---

**Q: What is the Strangler Fig pattern and why is it preferred over a big-bang rewrite?**

The Strangler Fig incrementally migrates a monolith to microservices by routing specific domains to new microservices while the monolith continues serving the rest, with a facade (API gateway or reverse proxy) in front that both clients and the system operate as normal throughout. Big-bang rewrites are notoriously risky — they take years, the business keeps evolving, the target is a moving one, and the rewrite often fails or launches with regressions. The Strangler Fig mitigates this by keeping the system operational at all times, allowing the team to learn microservices patterns with lower-risk domains first, and providing a clear rollback path (just re-route to the monolith). The key implementation detail is the facade — clients never know which backend is serving their request, making the migration invisible to them.

---

**Q: How do you implement distributed tracing? What are trace IDs and span IDs?**

A trace represents the entire journey of a single request through the system. Each service creates spans — timed units of work — that are linked to the trace. When Service A calls Service B, it passes the trace context in HTTP headers (`traceparent` in W3C format, or `X-B3-TraceId` in B3 format). Service B creates a child span linked to A's span. The result is a complete timeline of the request across all services. OpenTelemetry is the standard SDK: it auto-instruments HTTP calls, Express routes, and database queries, adding spans automatically and propagating headers. The traces are exported to Jaeger or Zipkin, which visualize the call tree with timing. In Node.js, you initialize the SDK at process startup before any other imports, and it instruments everything via monkey-patching. For custom operations (business logic steps), you create manual spans with attributes that provide context for debugging.
