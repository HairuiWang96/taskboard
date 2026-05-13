# Observability — Deep Reference

## The Three Pillars

```
Metrics  → numbers over time (CPU: 80%, error rate: 0.3%, p99 latency: 230ms)
           "Is something wrong?"

Logs     → structured records of events
           "What happened?"

Traces   → record of a request's journey across services
           "Where is it slow / where did it fail?"

Together: metrics alert you, logs tell you what happened, traces show you where.
```

---

## SLI, SLO, SLA

> These three terms are commonly confused but critically important at senior level.

### SLI — Service Level Indicator
> A specific, measurable metric that reflects how well a service is performing. The raw number.

```
Examples:
- Availability: (successful requests / total requests) × 100
- Latency: 99th percentile response time
- Error rate: (5xx responses / total responses) × 100
- Throughput: requests per second
- Durability: % of data successfully stored and retrievable
```

### SLO — Service Level Objective
> The target value or range for an SLI. Your internal promise to yourself. What "good" looks like.

```
Examples:
- Availability SLO: 99.9% of requests return 2xx over a 30-day window
- Latency SLO: p99 < 300ms over a 1-hour window
- Error rate SLO: < 0.1% errors per day

Error Budget:
- 99.9% availability = 0.1% downtime allowed = 43.8 min/month budget
- When budget is exhausted → stop new features, focus on reliability
- When budget is healthy → ship fast, take more risk
```

### SLA — Service Level Agreement
> A contractual promise to customers with financial/legal consequences for breach. Always more lenient than your internal SLO.

```
SLO (internal target): 99.95% availability    ← stricter
SLA (customer contract): 99.9% availability   ← looser (buffer for violations)

If SLA is breached: credits, penalties, contract consequences
```

---

## Metrics

### The Four Golden Signals (Google SRE)

```
1. Latency   — how long requests take
               Track success latency AND error latency separately
               Use percentiles: p50, p95, p99 (NOT averages — they hide outliers)

2. Traffic   — how much demand is on the system
               Requests/sec, transactions/sec, active connections

3. Errors    — rate of failed requests
               5xx rate, timeout rate, business errors (payment failed)

4. Saturation — how "full" the service is
               CPU %, memory %, disk %, DB connection pool utilization
               Saturation predicts problems before they happen
```

### Percentiles vs Averages

```ts
// Why percentiles matter:
// Response times: [10, 12, 11, 9, 13, 500, 11, 10]ms
// Average: 72ms — misleading (one slow request hides in the average)
// p50: 11ms (median)
// p95: ~500ms (5% of users experience this)
// p99: 500ms (1% of users — "tail latency")

// The user experience IS the tail latency
// p99 latency matters because 1 in 100 requests is that slow
// In a page with 100 API calls, p99 latency is felt by nearly every user
```

### Prometheus Metric Types

```ts
// Counter — always increases (resets on restart)
const httpRequests = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
});
httpRequests.inc({ method: 'GET', route: '/tasks', status: '200' });

// Gauge — can go up or down (current value)
const activeConnections = new Gauge({
    name: 'active_db_connections',
    help: 'Current active DB connections',
});
activeConnections.set(pool.totalCount);

// Histogram — samples observations, tracks distribution
const httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['route'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
const end = httpDuration.startTimer({ route: '/tasks' });
await handler();
end(); // records duration

// Query p99 latency in PromQL:
// histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

---

## Logging

### Structured Logging

```ts
// ✗ Unstructured — hard to query, parse, or alert on
console.log(`User ${userId} created task ${taskId} in ${duration}ms`);

// ✓ Structured JSON — queryable, filterable, parseable by log systems
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

logger.info({
    event: 'task.created',
    userId,
    taskId,
    duration,
    requestId: req.headers['x-request-id'],
});

// Output: {"level":30,"time":1716600000,"event":"task.created","userId":"u1","taskId":"t42","duration":12}
```

### Log Levels — When to Use Each

```
TRACE  — extremely detailed, usually disabled in prod (step-by-step execution)
DEBUG  — diagnostic info for developers (disabled in prod)
INFO   — normal operations (request received, user logged in, task created)
WARN   — unexpected but handled (retry attempt, degraded mode, approaching limit)
ERROR  — something failed but service continues (unhandled rejection, DB error)
FATAL  — service cannot continue, about to crash
```

### Correlation IDs (Request IDs)

```ts
// Every request gets a unique ID — attach to all logs for that request
// Allows tracing a single request's logs across services

app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
});

// Child logger carries requestId on every log in this request's scope
app.use((req, res, next) => {
    req.log = logger.child({ requestId: req.requestId });
    next();
});

// Now every log automatically includes the requestId
req.log.info({ event: 'task.created', taskId });
```

---

## Distributed Tracing

### Concepts

```
Trace   — the entire journey of one request through your system
Span    — a single unit of work within a trace (DB query, HTTP call, function)
          Each span has: name, start time, duration, status, attributes
Parent span → child spans form a tree

Example trace for POST /tasks:
└─ POST /tasks (span: 45ms total)
   ├─ validate input (span: 1ms)
   ├─ check auth (span: 3ms)
   ├─ postgres INSERT (span: 12ms)
   └─ publish event to Kafka (span: 8ms)
```

### OpenTelemetry (OTel)

```ts
// OTel is the standard — vendor-neutral, works with Jaeger, Zipkin, Datadog, etc.
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('tasks-service');

async function createTask(title: string) {
    const span = tracer.startSpan('createTask');
    span.setAttribute('task.title', title);

    try {
        const task = await db.insert(tasks).values({ title }).returning();
        span.setStatus({ code: SpanStatusCode.OK });
        return task[0];
    } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        span.recordException(err);
        throw err;
    } finally {
        span.end();
    }
}
```

---

## Alerting

### Alerting Principles

```
Good alert:
✓ Actionable — someone must DO something when it fires
✓ Urgent — represents a real user-visible problem
✓ Clear runbook — responder knows what to investigate

Bad alert:
✗ "CPU > 70%" — what do I do? CPU can be high for good reason
✗ Fires when no user impact yet — alert fatigue
✗ No clear next step

Alert on symptoms (user impact), not causes:
✓ "Error rate > 1% for 5 minutes"    — user is impacted NOW
✗ "CPU > 80%"                         — might be fine, might not
✗ "DB connection pool at 90%"         — symptom of something, but is it causing errors?
```

### Alerting Examples

```yaml
# Prometheus alerting rules
groups:
  - name: api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 2m         # must be true for 2 min before firing (reduces flapping)
        annotations:
          summary: "Error rate {{ $value | humanizePercentage }} on {{ $labels.route }}"
          runbook: "https://wiki/runbooks/high-error-rate"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        annotations:
          summary: "p99 latency {{ $value }}s — SLO breach imminent"
```

---

## Incident Response

### Incident Lifecycle

```
1. Detect    — alert fires, or user reports
2. Triage    — is this real? how severe? assign incident commander
3. Mitigate  — restore service FIRST (rollback, disable feature flag, scale up)
               Don't root-cause while users are impacted
4. Resolve   — confirm service restored, close incident
5. Postmortem — blameless analysis: what happened? why? how to prevent?
```

### Severity Levels

```
SEV1 (Critical)  — total outage, all users affected, revenue impact. Page immediately.
SEV2 (Major)     — significant % of users impacted, core feature broken. Page immediately.
SEV3 (Minor)     — small % of users, non-core feature. Fix within business hours.
SEV4 (Cosmetic)  — minor issue, workaround available. Schedule fix normally.
```

### Blameless Postmortem

```
What to include:
- Timeline of events (what happened and when, with exact times)
- Root cause (the actual technical reason — often multiple contributing factors)
- Contributing factors (what made this possible / worse)
- Impact (users affected, duration, revenue)
- What went well (detection was fast, rollback worked)
- Action items with owners and due dates — SMART goals

What NOT to do:
- Name and blame individuals
- Focus on "human error" as root cause (ask: why was the error possible?)
- Skip it when things are busy
- Write it and never follow up on action items
```

---

## Most Asked Observability Interview Questions

### "What is the difference between monitoring and observability?"

> **Monitoring** is checking predefined metrics against thresholds — you can only ask questions you anticipated. **Observability** is the ability to understand any internal state from external outputs — you can ask NEW questions you didn't think of before, including during an incident. Observability requires rich telemetry (structured logs, distributed traces, high-cardinality metrics). Monitoring asks "is it broken?" Observability asks "why is it broken in this specific way for this specific user?"

### "How do you set a good SLO?"

> Start with user expectations (what response time feels instant vs slow?). Look at historical data — what have users been experiencing? Set the SLO slightly better than current reality, then improve over time. Make it measurable with an SLI you can actually collect. Set an error budget — the flip side of the SLO — and use it to balance reliability work vs feature work. Review SLOs quarterly; they should change as the service matures.

### "Walk me through investigating a production incident."

> 1) **Don't panic, gather data first.** Check dashboards: error rate, latency, traffic — which metric changed and when? 2) Correlate with deployments — was there a recent deploy? 3) Check logs for the time the issue started — look for new error patterns. 4) Check distributed traces for slow/failing requests. 5) Mitigate first (rollback if deploy-related, scale up if load-related, disable feature flag). 6) Root cause after service is restored. 7) Document timeline. 8) Write postmortem.
