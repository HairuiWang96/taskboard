# OpenTelemetry — Beginner's Guide

**Priority: MEDIUM**

> A plain-language introduction to OpenTelemetry (OTel): what problem it solves, traces and
> spans, adding it to a Node app with zero code changes, custom spans, how a request is
> followed across services, the Collector, and the mistakes that trip up beginners.
>
> Assumes you can run a Node/Express/Nest app and know what an HTTP request is. No
> monitoring experience needed.

---

## Table of Contents

- [OpenTelemetry — Beginner's Guide](#opentelemetry--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. The Problem It Solves](#1-the-problem-it-solves)
  - [2. What OpenTelemetry Is (and Isn't)](#2-what-opentelemetry-is-and-isnt)
  - [3. The Three Signals](#3-the-three-signals)
  - [4. Traces \& Spans](#4-traces--spans)
  - [5. Setup — Auto-Instrumentation](#5-setup--auto-instrumentation)
  - [6. Seeing Your Traces Locally](#6-seeing-your-traces-locally)
  - [7. Custom Spans](#7-custom-spans)
  - [8. Following a Request Across Services](#8-following-a-request-across-services)
  - [9. The Collector](#9-the-collector)
  - [10. Sampling](#10-sampling)
  - [11. Frontend (Browser)](#11-frontend-browser)
  - [12. Common Beginner Mistakes](#12-common-beginner-mistakes)
  - [13. Cheat Sheet](#13-cheat-sheet)
  - [Related Files](#related-files)

---

## 1. The Problem It Solves

```text
A user says: "Checkout took 8 seconds."

The checkout request touched:
  frontend → API gateway → orders service → payments service → Postgres → Stripe

Which one was slow? With only console.log in each service:
  - the logs are in 5 different places
  - nothing tells you which log line belongs to THIS user's request
  - you're guessing

‼️ OPENTELEMETRY IN ONE SENTENCE
   A standard way to make your app report what it's doing — especially to
   follow ONE request through every service it touches, with timings for
   each step — and send that data to whatever monitoring tool you use.‼️
```

---

## 2. What OpenTelemetry Is (and Isn't)

```text
‼️ OTel COLLECTS and SENDS data. It does NOT store or display it.

  OpenTelemetry   = the camera      Records what happens in your app.
  Backend         = the photo album Stores it and lets you search/view it.
                                    Jaeger, Grafana Tempo, Honeycomb, Datadog,
                                    New Relic, ...

  Your app ──(OTel SDK)──▶ [ Collector (optional) ] ──▶ Backend ──▶ you, in a browser

‼️ WHY IT MATTERS: before OTel, every vendor had its own agent and its own code.
   Switching from Datadog to Grafana meant rewriting instrumentation.
   With OTel you instrument ONCE and change backends with a config setting.‼️

It is open source, run by the CNCF (the same foundation as Kubernetes), and
supported by basically every monitoring vendor.‼️
```

---

## 3. The Three Signals

```text
OTel can collect three kinds of data ("signals"):

  TRACES    The path of ONE request through your system, step by step, with
            timings.                           "Where did the 8 seconds go?"

  METRICS   Numbers over time — request count, error rate, CPU, latency.
                                               "Is something wrong right now?"

  LOGS      Text records of events — like console.log, but structured and
            linked to the trace they happened in.  "What exactly happened?"

‼️ START WITH TRACES. They are the thing OTel is best known for, the most
   mature part, and what this guide focuses on.‼️
```

---

## 4. Traces & Spans

```text
‼️ THE TWO WORDS YOU MUST GET STRAIGHT.

  SPAN    ONE unit of work, with a start time and an end time.
          "HTTP GET /checkout", "SELECT * FROM orders", "call Stripe".

  TRACE   ALL the spans for ONE request, linked together as a tree.
          Every span in it shares the same TRACE ID.

A trace for "POST /checkout" (each bar is a span, length = time taken):

  POST /checkout                       [████████████████████████████] 8.0s
    ├─ validate cart                   [█]                            0.1s
    ├─ SELECT orders (Postgres)          [██]                         0.3s
    ├─ POST payments-service                [█████████████████████]   7.4s  ← here
    │    └─ POST api.stripe.com               [████████████████████]  7.3s  ← culprit
    └─ send confirmation email                                    [█] 0.2s

‼️ That picture — called a WATERFALL — is the whole point. You can SEE that
   Stripe took 7.3 of the 8 seconds, without guessing.‼️
```

```text
What's inside a span:
  name          "POST /checkout"
  trace id      4bf92f3577b34da6a3ce929d0e0e4736   (same for the whole trace)
  span id       00f067aa0ba902b7                   (unique to this span)
  parent id     which span started this one         (makes the tree)
  start / end   timestamps → duration
  attributes    extra key-values: http.method=POST, user.id=42, order.id=981
  status        OK or ERROR
  events        things that happened during it, e.g. an exception
```

---

## 5. Setup — Auto-Instrumentation

```text
‼️ The best part: for common libraries you write ZERO tracing code.
   AUTO-INSTRUMENTATION patches Express, Nest, http, fetch, pg, mysql, redis,
   mongodb, etc. as they load, and creates spans for every request and query.‼️
```

```bash
npm install @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/api
```

```typescript
// src/instrumentation.ts — the whole setup
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  // ‼️ Name your service — otherwise it shows up as "unknown_service:node".
  serviceName: 'orders-api',

  // WHERE to send the data. OTLP is OTel's own protocol; 4318 is its HTTP port.
  traceExporter: new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' }),

  // Turn on automatic spans for every supported library.
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

```bash
# ‼️ Instrumentation must load BEFORE your app imports express/pg/etc.
#    It works by patching those libraries as they load — if they're already
#    loaded, there's nothing left to patch and you get no spans.‼️

node --require ./dist/instrumentation.js dist/main.js
```

```bash
# Even simpler — no setup file at all, everything through environment variables:
OTEL_SERVICE_NAME=orders-api \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
node --require @opentelemetry/auto-instrumentations-node/register dist/main.js
```

---

## 6. Seeing Your Traces Locally

```bash
# Jaeger — a free trace viewer. One container, accepts OTLP directly.
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/jaeger:latest
#   16686 → the Jaeger web UI
#   4318  → where your app sends traces (OTLP over HTTP)
#   (:latest is fine for a throwaway local viewer — pin a version anywhere real)
```

```text
1. Start Jaeger (above)
2. Start your app with the instrumentation (§5)
3. Hit a few endpoints:  curl http://localhost:3000/users
4. Open http://localhost:16686 → pick your service → "Find Traces"
5. Click a trace → you see the waterfall from §4

‼️ Do this once. Seeing a real waterfall of your own app explains traces
   better than anything you can read.‼️
```

---

## 7. Custom Spans

```text
Auto-instrumentation shows HTTP calls and database queries. It can't see your
own business logic — "calculate price", "apply discounts". Add spans for the
parts YOU care about.
```

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

// One tracer per file/module — the name shows up in your backend.
const tracer = trace.getTracer('orders');

async function calculatePrice(orderId: string) {
  // startActiveSpan creates a span AND makes it the "current" one, so any
  // spans created inside (e.g. auto DB spans) become its children.
  return tracer.startActiveSpan('calculate-price', async span => {
    try {
      span.setAttribute('order.id', orderId); // searchable later‼️

      const items = await loadItems(orderId); // auto DB span appears as a child
      const total = applyDiscounts(items);

      span.setAttribute('order.total', total);
      return total;
    } catch (err) {
      // Mark the span as failed so it shows up red in the backend.
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end(); // ‼️ ALWAYS end the span — an un-ended span is never sent.‼️
    }
  });
}
```

```typescript
// Just want to add info to the CURRENT span (e.g. the auto HTTP span)?
const span = trace.getActiveSpan();
span?.setAttribute('user.id', userId);
```

---

## 8. Following a Request Across Services

```text
How does the payments service know its spans belong to the SAME trace as the
orders service?

‼️ CONTEXT PROPAGATION — the trace id travels in an HTTP header.

  orders-api                          payments-service
  ──────────                          ────────────────
  span: POST /checkout
    │  calls payments with header:
    │  traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
    │                  └──────── trace id ──────────┘ └─ parent span ─┘
    └──────────────────────────────▶  reads traceparent
                                      creates its spans with the SAME trace id
                                      and the caller's span as parent

  traceparent is a W3C standard header, so it works across languages and
  vendors — a Node service and a Java service end up in one trace.

‼️ With auto-instrumentation this happens AUTOMATICALLY for HTTP — outgoing
   requests get the header added, incoming requests have it read.‼️

   Where it does NOT happen automatically: message queues and background jobs
   (Kafka, RabbitMQ, BullMQ) without an instrumentation for them. There the
   trace breaks into separate pieces unless you pass the context yourself.
```

---

## 9. The Collector

```text
The OTel Collector is an optional middleman service between your apps and
the backend.

  Without:   app ───────────────────────────▶ backend
  With:      app ──▶ Collector ──▶ backend(s)

What it adds:
  - Your apps just send to the Collector — backend URLs, API keys and retries
    live in ONE place instead of in every service
  - Send to SEVERAL backends at once (e.g. Jaeger + Datadog during a migration)
  - Filter, batch, sample, and strip sensitive attributes before data leaves
  - Switch backends by editing Collector config — no app redeploy

‼️ Beginner advice: skip it locally — send straight to Jaeger. In production
   it's the standard setup, usually run as a container next to your services.‼️
```

```yaml
# collector-config.yaml — a minimal example: receive OTLP, batch, send on
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
processors:
  batch: {} # send in batches instead of one at a time
exporters:
  otlphttp:
    endpoint: https://your-backend.example.com
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

---

## 10. Sampling

```text
A busy service handles thousands of requests a second. Keeping a trace for
every single one costs a lot of storage and money.

SAMPLING = keep only some of the traces.

  Development   keep 100% — you want to see everything
  Production    keep e.g. 10% — still plenty to spot patterns

‼️ The decision is made ONCE at the start of a trace and passed along with it,
   so you get COMPLETE traces, not random spans missing from the middle.‼️
```

```bash
# Keep 10% of traces, but always follow the decision of the calling service
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

---

## 11. Frontend (Browser)

```text
Everything above is for the BACKEND (Node). OTel also runs in the browser,
but it's less common and has more rough edges.

What the browser SDK can trace:
  - Page load       how long HTML, CSS, JS took
  - fetch / XHR     every API call the page makes
  - User clicks     interactions

‼️ THE BIG WIN: it adds the traceparent header (§8) to your API calls, so the
   trace STARTS AT THE USER'S CLICK instead of at the server:

   click → fetch /api/checkout → orders-api → payments → Postgres
   └──────────────────── one waterfall ────────────────────┘

   Now you can answer "the button felt slow — frontend or backend?"‼️
```

```bash
npm install @opentelemetry/sdk-trace-web \
            @opentelemetry/auto-instrumentations-web \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/instrumentation \
            @opentelemetry/resources \
            @opentelemetry/semantic-conventions
```

```typescript
// src/tracing.ts — import this FIRST in main.tsx
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'web-app' }),
  spanProcessors: [
    // ‼️ A PUBLIC Collector endpoint — never a vendor URL with an API key.
    new BatchSpanProcessor(new OTLPTraceExporter({ url: 'https://otel.example.com/v1/traces' })),
  ],
});
provider.register();

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fetch': {
        // ‼️ Only add traceparent to calls to YOUR API (see CORS below).
        propagateTraceHeaderCorsUrls: [/^https:\/\/api\.example\.com/],
      },
    }),
  ],
});
```

```text
‼️ CATCHES COMPARED TO THE BACKEND

  CORS        The browser only sends traceparent to URLs listed in
              propagateTraceHeaderCorsUrls, AND your API must allow it:
                Access-Control-Allow-Headers: traceparent
              Miss either → the request fails, or the trace breaks in two.‼️

  Secrets     Anyone can read frontend code. NEVER put a vendor API key in it.
              Send to your own Collector (with CORS enabled), which holds the
              keys and forwards to the backend.‼️

  Size        Adds weight to your JS bundle. The browser packages are also
              less stable than the Node SDK.

WHAT TEAMS USUALLY DO
  Many use a "Real User Monitoring" (RUM) tool for the frontend instead of
  raw OTel — Sentry, Datadog RUM, Grafana Faro (built on OTel). They also give
  you JS errors, Core Web Vitals and session replays, and still connect to
  backend traces through traceparent.
```

---

## 12. Common Beginner Mistakes

```text
‼️ 1. Loading instrumentation AFTER the app.
   Express, pg, etc. are already loaded and can't be patched → no spans.
   Use --require so it runs first.

‼️ 2. Forgetting span.end().
   The span is never finished, so it's never sent. Always end in `finally`.

‼️ 3. No service name.
   Everything shows up as "unknown_service:node" and you can't tell services
   apart. Set serviceName or OTEL_SERVICE_NAME.

‼️ 4. Expecting OTel to show you the data.
   OTel only collects and sends. You need a backend (Jaeger locally).

‼️ 5. Putting secrets or personal data in attributes.
   Passwords, tokens, emails, card numbers end up in your monitoring tool.
   Add ids, not sensitive values.

‼️ 6. Huge or unique values as span NAMES.
   "GET /users/123" → a new name per user. Use "GET /users/:id" and put 123
   in an attribute.

‼️ 7. Keeping 100% of traces in production.
   Storage and vendor bills explode. Sample.

‼️ 8. Broken traces across queues/jobs.
   HTTP propagates automatically; queues often don't. Check the trace really
   continues into the worker.

‼️ 9. Wrong port.
   OTLP uses 4318 for HTTP and 4317 for gRPC. The http exporter → 4318.
```

---

## 13. Cheat Sheet

```typescript
// ── SETUP (instrumentation.ts) ────────────────────────────────────────────
const sdk = new NodeSDK({
  serviceName: 'orders-api',
  traceExporter: new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' }),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
// run: node --require ./dist/instrumentation.js dist/main.js

// ── CUSTOM SPAN ───────────────────────────────────────────────────────────
const tracer = trace.getTracer('orders');
await tracer.startActiveSpan('do-work', async span => {
  try {
    span.setAttribute('order.id', id);
    // ... work ...
  } catch (e) {
    span.recordException(e as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw e;
  } finally {
    span.end(); // always
  }
});

// ── ADD TO THE CURRENT SPAN ───────────────────────────────────────────────
trace.getActiveSpan()?.setAttribute('user.id', userId);
```

```text
WORDS
  span          one step, with start/end time
  trace         all spans for one request (shared trace id)
  attribute     key-value info on a span
  exporter      sends data out (OTLP → Collector or backend)
  Collector     optional middleman: receive → process → export
  backend       stores + shows data (Jaeger, Tempo, Honeycomb, Datadog…)
  traceparent   HTTP header that carries the trace across services
  sampling      keeping only some traces

ENV VARS
  OTEL_SERVICE_NAME=orders-api
  OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
  OTEL_TRACES_SAMPLER=parentbased_traceidratio
  OTEL_TRACES_SAMPLER_ARG=0.1

PORTS
  4318  OTLP over HTTP      4317  OTLP over gRPC      16686  Jaeger UI
```

---

## Related Files

- [OBSERVABILITY-DEEP.md](../3-low-priority/OBSERVABILITY-DEEP.md) — the bigger picture: metrics, logging, SLOs, alerting, incident response
- [AI-OBSERVABILITY-DEEP.md](AI-OBSERVABILITY-DEEP.md) — tracing LLM calls and agents
- [MICROSERVICES-DEEP.md](MICROSERVICES-DEEP.md) — why distributed tracing matters once you have many services
- [NESTJS-BASICS.md](NESTJS-BASICS.md) — the kind of Node app the setup in §5 instruments
- [DOCKER-BASICS.md](DOCKER-BASICS.md) — running Jaeger and the Collector as containers
