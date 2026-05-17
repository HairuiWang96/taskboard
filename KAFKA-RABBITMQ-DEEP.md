# Kafka & RabbitMQ — Senior Deep Reference

---

## Mental Model: When to Use Which

```
Kafka                              RabbitMQ
─────────────────────────────      ─────────────────────────────
Event streaming / log              Task queue / work distribution
Replay messages (rewind log)       Messages deleted after ack
High throughput (millions/sec)     Lower volume, complex routing
Consumer controls position         Broker controls delivery
Retention by time/size             Retention until consumed
Fan-out to many consumer groups    Flexible exchange routing
Order guaranteed per partition     Order per queue (not global)
Kafka Connect / Streams built-in   Shovel, Federation plugins

Choose Kafka when: event sourcing, audit log, streaming analytics, CDC
Choose RabbitMQ when: task queues, RPC patterns, complex routing logic
```

---

## Kafka Internals

### Core Architecture

```
Producer → [Topic: orders]
              Partition 0: [msg0][msg1][msg2]...  ← append-only log
              Partition 1: [msg0][msg1][msg2]...
              Partition 2: [msg0][msg1][msg2]...
                    ↓
              Consumer Group A      Consumer Group B
              Consumer 1 → P0      Consumer X → P0,P1,P2 (all)
              Consumer 2 → P1      (independent offset tracking)
              Consumer 3 → P2

Each partition assigned to one consumer per group.
More partitions = more parallelism = more consumers.
```

### The Log: Kafka's Core Abstraction

```
Offset:  0    1    2    3    4    5    6  ...
         [m0][m1][m2][m3][m4][m5][m6]
                              ↑ consumer committed offset (next to read: 5)

- Append-only, immutable once written
- Consumers maintain offset position (stored in __consumer_offsets topic)
- Rewind: reset offset to beginning, re-process all events
- Retention: by time (default 7 days) OR by size (bytes), not by consumption
- Log compaction: keeps only latest value per key (use for state snapshots)
```

### Partitions, Leaders, ISR

```
Topic "orders" with replication-factor=3, partitions=3:

Broker 1: Partition 0 (LEADER), Partition 1 (follower), Partition 2 (follower)
Broker 2: Partition 0 (follower), Partition 1 (LEADER), Partition 2 (follower)
Broker 3: Partition 0 (follower), Partition 1 (follower), Partition 2 (LEADER)

ISR (In-Sync Replicas): set of replicas that are caught up to the leader.
- Leader writes message, waits for ISR to replicate before acking producer
- If a replica falls behind by > replica.lag.time.max.ms → removed from ISR
- If leader dies → one ISR elected as new leader
- min.insync.replicas: min ISR size before refusing producer writes
  (e.g., replication=3, min.insync.replicas=2 → tolerate 1 broker failure)
```

### Producer Delivery Guarantees

```ts
// acks=0: fire and forget (fastest, possible data loss)
// acks=1: leader acks, followers may not have replicated (default, some risk)
// acks=all (-1): all ISR must replicate before ack (strongest, slower)

producer.send({
  topic: 'orders',
  key: 'user-123',     // same key → always same partition (ordering)
  value: JSON.stringify(order),
})

// Idempotent producer (enable.idempotence=true):
// - Assigns sequence numbers to messages
// - Broker deduplicates retries (exactly-once within a partition)
// - Required for exactly-once semantics (EOS)

// Retries + idempotence → at-least-once becomes exactly-once per partition
```

### Consumer Groups & Rebalancing

```
Group "payment-service" reads "orders" topic:

  Normal:         Partition 0 → Consumer A
                  Partition 1 → Consumer B
                  Partition 2 → Consumer C

  Consumer B dies → Rebalance:
                  Partition 0 → Consumer A
                  Partition 1 → Consumer A or C  (reassigned)
                  Partition 2 → Consumer C

Rebalance is triggered by:
- Consumer joins/leaves group
- Consumer heartbeat timeout (session.timeout.ms, default 45s)
- Partition count changes

During rebalance: ALL consumers stop consuming (stop-the-world)
Static membership (group.instance.id): avoids rebalance on brief restarts
Cooperative rebalancing (incremental): only reassigned partitions pause
```

### Offset Management

```ts
// Auto-commit (default: every 5s) — risk: process crash after poll but before commit
// Manual commit — exactly-once processing semantics

consumer.subscribe(['orders'])
while (true) {
  const records = consumer.poll(Duration.ofMillis(100))
  for (const record of records) {
    processMessage(record)              // do your work first
    consumer.commitSync()               // then commit (at-least-once: retry on failure)
    // or commitAsync for throughput (no retry on failure)
  }
}

// At-least-once: commit after processing (may reprocess on crash after process, before commit)
// At-most-once: commit before processing (may lose on crash after commit, before process)
// Exactly-once: Kafka Transactions (produce + commit in one atomic operation)
```

### Exactly-Once Semantics (EOS) — Kafka Transactions

```ts
// Producer side: transactional.id + enable.idempotence=true
producer.initTransactions()
try {
  producer.beginTransaction()
  producer.send({ topic: 'output', ... })
  // commit consumer offset AND produce in one atomic operation:
  producer.sendOffsetsToTransaction(offsets, consumerGroupMetadata)
  producer.commitTransaction()
} catch (e) {
  producer.abortTransaction()
}

// Consumer side: isolation.level=read_committed
// Only reads messages from committed transactions
// Aborted transaction messages are skipped
```

### Consumer Lag

```
Consumer lag = latest offset (partition) - committed offset (consumer)

High lag means: consumer is falling behind producers

Monitor with:
  kafka-consumer-groups.sh --describe --group payment-service
  or Kafka's built-in metrics: records-lag, records-lag-max

Fix strategies:
  1. Add more consumers (up to partition count)
  2. Increase batch size (max.poll.records)
  3. Optimize processing (parallelise within consumer)
  4. Scale partitions (requires rebalance, can't reduce later)
```

### Kafka Streams vs Kafka Connect

```
Kafka Connect:
  Source connectors: external DB/API → Kafka topic (CDC with Debezium)
  Sink connectors: Kafka topic → external DB/ES/S3
  No code needed for standard connectors

Kafka Streams (client library, runs in your app):
  Read topic → transform/aggregate/join → write to output topic
  Stateful with local RocksDB store (materialised views)
  Exactly-once processing built-in

ksqlDB: SQL interface over Kafka Streams (CREATE STREAM, CREATE TABLE)
```

### Key Configs Summary

```
Producer:
  linger.ms          - batch wait time (0 = send immediately, higher = better throughput)
  batch.size         - max bytes per batch
  compression.type   - snappy/lz4/zstd (throughput vs CPU tradeoff)
  max.in.flight.requests.per.connection - set to 1 for strict ordering w/o idempotence

Consumer:
  auto.offset.reset  - earliest (from beginning) | latest (only new messages)
  max.poll.records   - max records per poll() call
  fetch.min.bytes    - wait for this much data before returning (batching)
  heartbeat.interval.ms - must be < session.timeout.ms / 3

Topic:
  retention.ms       - how long to keep messages (default 604800000 = 7 days)
  retention.bytes    - size cap per partition
  cleanup.policy     - delete | compact | compact,delete
  min.insync.replicas - ISR threshold for producer acks=all
```

---

## RabbitMQ Internals

### Core Components

```
Producer → Exchange → Binding → Queue → Consumer
                         ↑
                   routing logic lives here
```

### All Exchange Types

```
1. Direct Exchange
   Route by exact routing key match.
   Use: task queues, specific service routing.

   Producer → routingKey: "email"   → Queue: email-queue
   Producer → routingKey: "sms"     → Queue: sms-queue

2. Fanout Exchange
   Broadcast to ALL bound queues, ignores routing key.
   Use: pub/sub, notifications, cache invalidation.

   Producer → message → Queue A (all consumers)
                      → Queue B (all consumers)
                      → Queue C (all consumers)

3. Topic Exchange
   Route by pattern matching on routing key (. as separator, * = one word, # = zero or more).
   Use: multi-tenant, selective subscriptions.

   routingKey: "order.us.premium"
   Binding "order.*.premium" → MATCH
   Binding "order.#"         → MATCH (# = anything)
   Binding "order.eu.*"      → NO MATCH

4. Headers Exchange
   Route by message headers (key-value pairs), ignores routing key.
   x-match: all (AND) | any (OR)
   Use: complex attribute-based routing.

   headers: { format: "pdf", type: "report" }
   Binding { format: "pdf", x-match: "any" } → MATCH
```

### Dead Letter Queue (DLQ)

```
Messages become "dead" when:
  - rejected (nack) with requeue=false
  - TTL expires (message or queue TTL)
  - queue max-length exceeded

Setup:
  Queue "orders" → x-dead-letter-exchange: "dlx"
                 → x-dead-letter-routing-key: "dead.orders" (optional)
  Exchange "dlx" → Queue "orders-dlq"

Dead letter headers added automatically:
  x-death: reason (rejected/expired/maxlen), original queue, count, timestamp
  x-first-death-reason, x-first-death-queue, x-first-death-exchange

Pattern: DLQ → alerting → manual review → republish or discard
Retry pattern: DLQ with TTL → republish to original queue (delayed retry)
```

### Priority Queues

```
Setup: x-max-priority: 10 (0-255, higher = more priority)
Message: { priority: 8 }

RabbitMQ delivers higher-priority messages first within a queue.
Cost: memory overhead, separate priority sub-queues internally.
Use: urgent alerts before bulk processing, premium vs free tier tasks.
```

### Message Acknowledgement Modes

```
Auto-ack (autoAck: true):
  Message deleted from queue as soon as delivered to consumer.
  Risk: consumer crashes before processing → message lost.

Manual ack (autoAck: false):
  Consumer explicitly acks after processing.
  channel.ack(msg)         // success
  channel.nack(msg, false, true)   // requeue=true: put back in queue
  channel.nack(msg, false, false)  // requeue=false: goes to DLQ

  prefetchCount (QoS): max unacked messages per consumer
  channel.prefetch(1)  // process one at a time, fair dispatch

Multiple ack: channel.ack(msg, true) — acks all msgs up to this delivery tag
```

### Publisher Confirms (reliability)

```
// Synchronous confirm:
channel.confirmSelect()
channel.publish(exchange, key, content)
await channel.waitForConfirms()  // blocks until broker acks

// Asynchronous confirms (higher throughput):
channel.on('ack', (deliveryTag, multiple) => { /* confirmed */ })
channel.on('nack', (deliveryTag, multiple) => { /* retry */ })
channel.confirmSelect()
// Track deliveryTag → message mapping for retry

// Persistent messages: deliveryMode: 2
// Durable queue: durable: true
// Both required for messages to survive broker restart
```

### Shovel Plugin

```
Copies messages between queues/exchanges (within or across clusters).
Use: data migration, geo-distribution, failover, bridging environments.

rabbitmq-plugins enable rabbitmq_shovel rabbitmq_shovel_management

Config (dynamic via API):
{
  src-protocol: "amqp091",
  src-uri: "amqp://source-host",
  src-queue: "orders",
  dest-protocol: "amqp091",
  dest-uri: "amqp://dest-host",
  dest-exchange: "orders",
}

Dynamic shovel: survives restarts, configurable at runtime
Static shovel: in rabbitmq.conf, applied at startup
```

### Federation Plugin

```
Links exchanges/queues across separate RabbitMQ clusters (WANs, regions).
Unlike shovel: messages pulled on demand (only when local consumers exist).
Use: global deployments, region-local consumption, DR.

federation-upstream: points to upstream broker
Apply via policy to exchanges or queues.
```

### Production Patterns

```
1. Work Queue (competing consumers):
   - One queue, multiple consumers (round-robin by default)
   - prefetchCount=1 for fair dispatch
   - Manual ack + persistent messages + durable queue

2. Pub/Sub:
   - Fanout exchange, each subscriber has own queue
   - Queue can be auto-delete + exclusive (disappears when consumer disconnects)

3. RPC pattern:
   - Client sends to rpc_queue with reply_to + correlation_id headers
   - Server processes, publishes to reply_to queue
   - Client correlates response by correlation_id

4. Delayed retry with exponential backoff:
   - DLQ with x-message-ttl (e.g., 1000ms) → republish to original queue
   - Increment x-retry-count header, stop at max retries

5. Circuit breaker:
   - Track failure rate per queue; stop consuming if threshold hit
   - Resume after cooldown period
```

---

## Kafka vs RabbitMQ Comparison

| | Kafka | RabbitMQ |
|---|---|---|
| Model | Log / pull | Queue / push |
| Message retention | Time/size based (default 7d) | Until consumed + acked |
| Replay | Yes (rewind offset) | No (message gone after ack) |
| Ordering | Per partition | Per queue |
| Throughput | Millions/sec | Tens of thousands/sec |
| Routing | By partition key | Exchange + binding rules |
| Consumer control | Consumer tracks offset | Broker tracks |
| At-least-once | Default | Default (manual ack) |
| Exactly-once | Yes (EOS + transactions) | Yes (publisher confirms + idempotent consumers) |
| Persistence | Disk-first | Optionally persistent |
| Protocol | Kafka protocol (binary) | AMQP 0-9-1, MQTT, STOMP |
| Clustering | Built-in, partition-based | Mirror/quorum queues |
| Use case | Event streaming, CDC, analytics | Task queues, RPC, routing |

---

## Interview Gotchas

```
Q: How does Kafka guarantee ordering?
A: Only within a partition. Use same key → same partition for ordered events.
   Global ordering would require 1 partition → no parallelism tradeoff.

Q: What happens if a Kafka consumer is slower than producers?
A: Consumer lag grows. Brokers keep messages until retention expires.
   Fix: more consumers (up to partition count), optimise processing, add partitions.

Q: RabbitMQ vs Kafka for a payment system?
A: Depends on requirements.
   - Audit log / replay needed → Kafka
   - Complex routing (country-specific handlers) → RabbitMQ
   - High throughput event stream → Kafka
   - RPC-style request/response → RabbitMQ

Q: How do you prevent message loss in RabbitMQ?
A: Durable queues + persistent messages + publisher confirms + manual ack.
   All four required. Missing any one creates a loss window.

Q: What is log compaction in Kafka?
A: Kafka retains only the LATEST message per key. Older values deleted.
   Use: changelog topics, state snapshots (current balance, not all transactions).
   cleanup.policy=compact

Q: Kafka exactly-once vs at-least-once?
A: At-least-once: commit offset after processing (may reprocess on crash).
   Exactly-once: enable.idempotence=true + transactions + read_committed isolation.
   Most production systems accept at-least-once + idempotent consumers.
```
