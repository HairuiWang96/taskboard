# LLM Observability & Production Monitoring

LLM applications fail in ways traditional software doesn't — hallucinations, prompt regressions, latency spikes from token growth, and silent quality degradation. Observability tells you when things go wrong before your users do.

---

## Why LLM Observability Is Different

```text
Traditional app observability:
  - Did the function return the right value? → easy to check
  - Did the API return 200? → binary
  - Did the DB query run in < 100ms? → measurable

LLM observability challenges:
  - Output correctness is subjective and non-deterministic
  - "Success" isn't binary — quality exists on a spectrum
  - The same prompt can produce different outputs on repeated calls
  - A model update from the provider can silently change behaviour
  - Cost scales with token count — hard to predict and control
  - Long chains/agents fail in complex, hard-to-trace ways

What you need to track:
  Inputs and outputs:    every prompt, every response, every tool call
  Performance:          latency, TTFT (time to first token), tokens per second
  Cost:                 tokens used, model, cost per call, cost per user
  Quality:              accuracy, relevance, format compliance, user feedback
  Errors:               failures, retries, timeouts, guardrail triggers
  Traces:               full execution path for multi-step agents
```

---

## Core Concepts

### Traces and spans

```text
A trace is the complete record of one user request through your system.
A span is one step within that trace.

Example — RAG query trace:
  Trace: "What is the refund policy?"
    Span 1: embed_query (12ms, 8 tokens)
    Span 2: vector_search (45ms, returned 5 chunks)
    Span 3: rerank (120ms, selected 3 chunks)
    Span 4: llm_call (1840ms, 2100 input tokens, 312 output tokens, $0.004)
    Span 5: output_validation (5ms, passed)
  Total: 2022ms, $0.004

For agents, traces show the full reasoning loop:
  llm_call → tool_call → llm_call → tool_call → llm_call (final answer)
```

### Key metrics

```text
Latency:
  TTFT (time to first token) — what users feel in streaming UIs
  Total latency — time to complete response
  p50, p95, p99 — track tail latency, not just averages

Cost:
  Input tokens / output tokens per call
  Cost per call, per user, per feature
  Daily/monthly spend trend

Quality:
  User feedback rate (thumbs up/down, regeneration)
  Task completion rate
  Hallucination rate (from automated evals)
  Format compliance rate (for structured output)

Errors:
  API error rate (rate limits, provider errors)
  Guardrail trigger rate (blocked inputs/outputs)
  Tool failure rate (for agents)
  Timeout rate

Volume:
  Requests per second
  Active users
  Token throughput
```

---

## LangSmith — Tracing for LangChain

```typescript
// LangSmith automatically traces all LangChain calls
// Set environment variables — no code changes needed

// .env
// LANGCHAIN_TRACING_V2=true
// LANGCHAIN_API_KEY=ls__your_key
// LANGCHAIN_PROJECT=my-project

import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor } from 'langchain/agents';

// All calls are automatically traced in LangSmith
const model = new ChatAnthropic({ modelName: 'claude-sonnet-4-6' });
const result = await model.invoke('Hello');
// → appears in LangSmith dashboard with full input/output, latency, token count

// Add metadata to traces
import { traceable } from 'langsmith/traceable';

const myFunction = traceable(
  async (userMessage: string) => {
    // your logic here
    return result;
  },
  {
    name: 'process_user_message',
    metadata: { feature: 'chat', version: '2.1' },
    tags: ['production'],
  }
);
```

### LangSmith features

```text
Tracing:      Full request/response logging with latency and token counts
Debugging:    Inspect every LLM call and tool use in a chain/agent
Datasets:     Build eval datasets from real production traffic
Evaluations:  Run automated evals, LLM-as-judge, human review
Playground:   Test prompt changes against historical examples before deploying
Alerts:       Notify on quality degradation or error spikes
```

---

## Helicone — LLM Proxy with Logging

```typescript
// Helicone works as a proxy — add a base URL override, no SDK changes needed

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Anthropic via Helicone
const anthropic = new Anthropic({
  baseURL: 'https://anthropic.helicone.ai',
  defaultHeaders: {
    'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
    // Optional metadata
    'Helicone-User-Id': userId,
    'Helicone-Property-Feature': 'customer-support',
    'Helicone-Cache-Enabled': 'true',  // enable semantic caching
  },
});

// OpenAI via Helicone
const openai = new OpenAI({
  baseURL: 'https://oai.helicone.ai/v1',
  defaultHeaders: {
    'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
  },
});

// All calls are logged automatically
const response = await anthropic.messages.create({ ... });
```

### Helicone features

```text
Proxy-based logging:   zero code changes, works with any SDK
Caching:              semantic cache (returns cached response for similar queries)
Rate limiting:        per-user rate limits enforced at the proxy
Cost tracking:        per-user, per-feature, per-model cost dashboards
Request filtering:    search/filter by user, model, property, date
Alerts:               spike in errors or cost
```

---

## Braintrust — Evals + Observability

```typescript
// Braintrust combines logging, evals, and prompt management
import * as braintrust from 'braintrust';

// Log a production call with score
const logger = braintrust.initLogger({ projectName: 'my-ai-app' });

const span = logger.startSpan({ name: 'chat_response' });

const response = await anthropic.messages.create({ ... });

span.log({
  input: userMessage,
  output: response.content[0].text,
  metadata: {
    model: 'claude-sonnet-4-6',
    userId,
    feature: 'chat',
    tokens: response.usage,
  },
  scores: {
    // Add automatic scores
    format_valid: isValidFormat(response.content[0].text) ? 1 : 0,
  },
});
span.end();

// Run offline evals
const experiment = await braintrust.Eval('customer-support-bot', {
  data: () => testCases.map(tc => ({ input: tc.question, expected: tc.answer })),
  task: async (input) => myAgent.run(input),
  scores: [
    // Built-in scorers
    braintrust.Factuality,     // uses LLM to check factual accuracy
    braintrust.Closeness,      // semantic similarity to expected
    // Custom scorer
    async ({ output, expected }) => ({
      name: 'format',
      score: isValidJSON(output) ? 1 : 0,
    }),
  ],
});
```

---

## Custom Observability with OpenTelemetry

```typescript
// If you prefer to own your own stack: OpenTelemetry + Grafana + Prometheus

import { trace, metrics, context } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/node';

const tracer = trace.getTracer('ai-service');
const meter = metrics.getMeter('ai-service');

// Custom counters and histograms
const llmRequestDuration = meter.createHistogram('llm_request_duration_ms');
const llmTokensUsed = meter.createCounter('llm_tokens_total');
const llmErrors = meter.createCounter('llm_errors_total');

async function tracedLLMCall(prompt: string, model: string) {
  const span = tracer.startSpan('llm_call', {
    attributes: { model, 'prompt.length': prompt.length },
  });

  const start = Date.now();
  try {
    const response = await anthropic.messages.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    });

    const duration = Date.now() - start;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    span.setAttributes({
      'response.input_tokens': inputTokens,
      'response.output_tokens': outputTokens,
      'response.duration_ms': duration,
    });

    llmRequestDuration.record(duration, { model, status: 'success' });
    llmTokensUsed.add(inputTokens, { model, type: 'input' });
    llmTokensUsed.add(outputTokens, { model, type: 'output' });

    return response.content[0].text;
  } catch (error) {
    llmErrors.add(1, { model, error: (error as Error).message });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
```

---

## Prompt Registry and Version Control

```typescript
// Track which prompt version produced which output
// Essential for debugging regressions

interface PromptVersion {
  id: string;
  version: string;
  template: string;
  createdAt: Date;
  deployedAt?: Date;
  metrics?: { accuracy: number; latency: number; cost: number };
}

class PromptRegistry {
  async get(promptId: string, version = 'production'): Promise<PromptVersion> {
    return db.prompts.findOne({ id: promptId, tag: version });
  }

  async deploy(promptId: string, newVersion: PromptVersion) {
    // Run evals before deploying
    const evalResult = await runEvals(newVersion.template);
    if (evalResult.accuracy < MINIMUM_ACCURACY) {
      throw new Error(`Eval failed: ${evalResult.accuracy} < ${MINIMUM_ACCURACY}`);
    }

    // Tag new version as production, archive old
    await db.prompts.update({ id: promptId, tag: 'production' }, { tag: 'archived' });
    await db.prompts.create({ ...newVersion, tag: 'production', deployedAt: new Date() });
  }
}

// Log which prompt version produced each response
await logger.log({
  input: userMessage,
  output: response,
  metadata: {
    promptId: 'customer-support-v2',
    promptVersion: '2.3.1',
  },
});
```

---

## Alerting — What to Monitor

```typescript
// Key thresholds to alert on

const alerts = {
  // Latency
  p95LatencyMs: { threshold: 5000, severity: 'warning' },
  p99LatencyMs: { threshold: 10000, severity: 'critical' },

  // Error rates
  apiErrorRate: { threshold: 0.02, severity: 'critical' },      // > 2% errors
  guardrailTriggerRate: { threshold: 0.10, severity: 'warning' }, // > 10% blocked

  // Quality (needs eval pipeline)
  accuracyDrop: { threshold: -0.05, severity: 'critical' },     // > 5% accuracy drop vs baseline

  // Cost
  dailyCostUSD: { threshold: 500, severity: 'warning' },
  costPerUserUSD: { threshold: 0.50, severity: 'warning' },     // per conversation

  // Agent-specific
  maxStepsReached: { threshold: 0.05, severity: 'warning' },    // > 5% of agent runs hit limit
  toolErrorRate: { threshold: 0.05, severity: 'warning' },
};
```

---

## Structured Logging Pattern

```typescript
// Always log enough to debug any production issue

interface LLMLog {
  requestId: string;
  timestamp: string;
  userId: string;
  feature: string;

  // Input
  model: string;
  promptVersion: string;
  inputTokens: number;
  messagesCount: number;
  toolsCount: number;

  // Output
  outputTokens: number;
  stopReason: string;
  toolCallsCount: number;

  // Performance
  durationMs: number;
  ttftMs: number;

  // Cost
  costUSD: number;

  // Quality signals (if available)
  userFeedback?: 'positive' | 'negative';
  evalScore?: number;

  // Error (if applicable)
  error?: string;
  errorCode?: string;
}

// Ship these logs to your log aggregation system (Datadog, CloudWatch, Grafana Loki)
// Then build dashboards and alerts on top
```

---

## Common Interview Questions

### "How would you monitor an LLM application in production?"

> Three layers. **Infrastructure**: standard metrics — latency (TTFT and total), error rate, token throughput, GPU utilisation if self-hosted. Use Grafana + Prometheus or Datadog. **LLM-specific**: log every request and response with metadata (model, prompt version, token count, cost, user ID). Use a tool like LangSmith, Helicone, or Braintrust — they give tracing, cost tracking, and user feedback collection out of the box. **Quality**: this is the hard part. Instrument user feedback (thumbs up/down), track proxy metrics like regeneration rate and conversation abandonment, and run automated evals on a sample of production traffic daily. Alert when quality metrics drop more than 5% from baseline. The most common failure mode is silent quality degradation — the API keeps returning 200s but the outputs get worse.

### "What is a prompt registry and why would you need one?"

> A prompt registry is a versioned store of prompt templates with deployment tracking — similar to a feature flag system but for prompts. You need one because prompts are code: they change, they have bugs, they need to roll back. Without a registry, when a prompt change degrades quality, you don't know which change caused it or what the previous version was. A registry lets you: version prompts and tag releases ('production', 'staging', 'v2.3.1'), track which prompt version produced each response, A/B test prompt variants, gate deployment on eval results, and roll back to a previous version in seconds. Store prompts in a database alongside their eval metrics and deployment history.

### "How would you debug a multi-step agent that's producing wrong outputs?"

> I'd use distributed tracing to see the full execution path. A good tracing setup (LangSmith, or custom OpenTelemetry) records every LLM call, every tool call, every intermediate result with timing and token counts. I'd replay the failing trace and look for: which step produced incorrect output, whether a tool returned unexpected data, whether the model misinterpreted a tool result, or whether the context grew too long and the model lost track of the goal. The key questions: did the agent take the right steps in the right order? Did each tool return what the agent needed? Did the agent correctly interpret tool results? Without tracing, debugging an agent with 10+ steps is essentially impossible.
