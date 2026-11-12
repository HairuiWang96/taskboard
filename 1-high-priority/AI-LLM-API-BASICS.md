# LLM API Fundamentals — Tokens, Context, Sampling, Streaming, Cost

**Priority: HIGH**

> The layer under every AI feature: what tokens are and what they cost, context windows (and how
> they silently fail), temperature and sampling, `max_tokens` and `finish_reason`, streaming,
> structured output, retries and rate limits, prompt caching, batch APIs, reasoning models, and
> how to pick a model. Every number below was MEASURED, not quoted from documentation.
>
> TypeScript (`openai` npm package, Node 22) with Python equivalents in §12, run against a local
> `qwen2.5:7b` via Ollama (November 2026). The same code works against OpenAI, Gemini, Groq and
> other OpenAI-compatible providers by changing `baseURL`, `apiKey` and the model name.

---

## Table of Contents

- [LLM API Fundamentals — Tokens, Context, Sampling, Streaming, Cost](#llm-api-fundamentals--tokens-context-sampling-streaming-cost)
  - [Table of Contents](#table-of-contents)
  - [1. The Request and the Response](#1-the-request-and-the-response)
  - [2. Tokens — Measured](#2-tokens--measured)
  - [3. Context Windows — and the Silent Failure](#3-context-windows--and-the-silent-failure)
  - [4. Sampling — Temperature, Seed, top\_p](#4-sampling--temperature-seed-top_p)
  - [5. max\_tokens and finish\_reason](#5-max_tokens-and-finish_reason)
  - [6. Streaming](#6-streaming)
  - [7. Structured Output and Tool Calling](#7-structured-output-and-tool-calling)
  - [8. Errors, Retries, Timeouts, Rate Limits](#8-errors-retries-timeouts-rate-limits)
  - [9. Cost — How to Estimate It](#9-cost--how-to-estimate-it)
  - [10. Prompt Caching and Batch APIs](#10-prompt-caching-and-batch-apis)
  - [11. Choosing a Model](#11-choosing-a-model)
  - [12. The Same Basics in Python](#12-the-same-basics-in-python)
  - [13. Provider Differences](#13-provider-differences)
  - [14. Common Mistakes](#14-common-mistakes)
  - [15. Cheat Sheet](#15-cheat-sheet)
  - [16. Interview Answer](#16-interview-answer)
  - [Related Files](#related-files)

---

## 1. The Request and the Response

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:11434/v1',  // Ollama; leave out for OpenAI itself
  apiKey: 'ollama',                      // process.env.OPENAI_API_KEY for a real provider
  timeout: 60_000,                       // ms — fail instead of hanging forever
  maxRetries: 2,                         // automatic retries on 429 / 5xx / network errors
});

const res = await client.chat.completions.create({
  model: 'qwen2.5:7b',
  messages: [
    { role: 'system', content: 'You are a concise assistant.' },   // instructions
    { role: 'user', content: 'Explain a cargo van in one sentence.' },
  ],
  temperature: 0,       // section 4
  max_tokens: 200,      // section 5
});

res.choices[0].message.content   // the text
res.choices[0].finish_reason     // 'stop' | 'length' | 'tool_calls' …
res.usage                        // { prompt_tokens, completion_tokens, total_tokens } — what you pay for
```

```text
‼️ THE MODEL IS STATELESS. It remembers nothing between requests. A "conversation" is you
   re-sending the whole message list every time — which is why long chats get slower and
   more expensive with every turn, and why context windows matter (section 3).‼️
```

---

## 2. Tokens — Measured

```typescript
// tokens.ts — what a "token" actually is, measured with the API's own usage numbers
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });

async function promptTokens(text: string) {
  const r = await client.chat.completions.create({ model: 'qwen2.5:7b', max_tokens: 1, messages: [{ role: 'user', content: text }] });
  return r.usage!.prompt_tokens;
}
const empty = await promptTokens('');   // the chat template itself costs tokens
console.log('empty message overhead:', empty, 'tokens');
const samples = {
  'English sentence': 'The quick brown fox jumps over the lazy dog near the river bank.',
  'Same in Chinese': '敏捷的棕色狐狸跳过了河岸边的懒狗。',
  'Code': 'const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);',
  'Numbers': '3.14159265358979323846264338327950288419716939937510',
  'UUID': '3f2b9c1e-7a4d-4e8b-9f61-2c5d8a0b1e47',
};
for (const [name, text] of Object.entries(samples)) {
  const t = (await promptTokens(text)) - empty;
  console.log(`${name.padEnd(17)} ${String(text.length).padStart(3)} chars → ${String(t).padStart(3)} tokens  (${(text.length / t).toFixed(1)} chars/token)`);
}
```

```text
REAL OUTPUT
empty message overhead: 29 tokens
English sentence   64 chars →  14 tokens  (4.6 chars/token)
Same in Chinese    17 chars →  12 tokens  (1.4 chars/token)
Code               65 chars →  22 tokens  (3.0 chars/token)
Numbers            52 chars →  52 tokens  (1.0 chars/token)
UUID               36 chars →  36 tokens  (1.0 chars/token)

‼️ WHAT THIS MEANS
   - A TOKEN is a chunk of text from the model's vocabulary: often a word or part of one.
     You pay per token, limits are in tokens, speed is tokens per second.
   - "~4 characters per token" is true for ENGLISH PROSE ONLY. This model spends one token
     per digit — a 36-character UUID costs as much as a 160-character English sentence.
     Logs, IDs, JSON, numbers and non-English text are much more expensive than they look.
   - Even an empty message costs tokens (the chat template wraps every message).
   - Every model has its own tokenizer: the same text is a different number of tokens on
     different models. Measure with the provider's usage numbers or its tokenizer library.
```

---

## 3. Context Windows — and the Silent Failure

```typescript
// context.ts — what happens when the prompt is bigger than the context window?
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });

async function test(paragraphs: number) {
  const body = 'The warehouse report lists boxes, shelves and pallets in aisle seven. '.repeat(paragraphs);
  const prompt = `SECRET CODE: PELICAN-42.\n\n${body}\n\nWhat is the secret code at the very start? Answer with the code only.`;
  const r = await client.chat.completions.create({ model: 'qwen2.5:7b', temperature: 0, messages: [{ role: 'user', content: prompt }] });
  console.log(`${String(paragraphs).padStart(4)} repeats → prompt_tokens reported: ${String(r.usage!.prompt_tokens).padStart(5)}   answer: ${r.choices[0].message.content?.trim().slice(0, 40)}`);
}
for (const n of [50, 200, 300, 600]) await test(n);
```

```text
REAL OUTPUT
  50 repeats → prompt_tokens reported:   757   answer: PELICAN-42
 200 repeats → prompt_tokens reported:  2857   answer: PELICAN-42
 300 repeats → prompt_tokens reported:  2050   answer: shelves and pallets in aisle seven
 600 repeats → prompt_tokens reported:  2050   answer: shelves and pallets in aisle seven

`ollama show qwen2.5:7b` → context length 32768

‼️ READ THAT CAREFULLY
   The MODEL supports 32,768 tokens. But Ollama SERVED it with a much smaller window by
   default, and when the prompt didn't fit it silently threw away the BEGINNING — including
   the secret code — and answered anyway. No error. The only clue: prompt_tokens went DOWN
   (2857 → 2050) while the prompt got longer.
```

```typescript
// The same 600-repeat prompt through Ollama's native API, with a bigger context window
const body = 'The warehouse report lists boxes, shelves and pallets in aisle seven. '.repeat(600);
const prompt = `SECRET CODE: PELICAN-42.\n\n${body}\n\nWhat is the secret code at the very start? Answer with the code only.`;
const res = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    model: 'qwen2.5:7b', stream: false,
    messages: [{ role: 'user', content: prompt }],
    options: { num_ctx: 16384, temperature: 0 },   // ← Ollama-specific: raise the context window
  }),
});
const data = await res.json();
console.log(`num_ctx 16384 → prompt tokens: ${data.prompt_eval_count}   answer: ${data.message.content.trim()}`);
```

```text
REAL OUTPUT
num_ctx 16384 → prompt tokens: 8457   answer: PELICAN-42

CONTEXT WINDOW FACTS
  - The window holds input + output together. A 128k-token model with a 120k prompt can only
    answer in 8k.
  - Hosted APIs usually REJECT an oversized prompt with an error ("context length exceeded");
    some local servers TRUNCATE silently, as above. Know which yours does.
  - Bigger isn't free: cost and latency grow with prompt size, and models get worse at using
    details buried in the middle of very long prompts ("lost in the middle").
  - Ollama: set num_ctx per request (native API, above), in a Modelfile, or server-wide
    (check the Ollama docs for the current environment variable). More context = more memory.
  - Long conversations: trim old turns, summarise, or retrieve (AI-AGENT-MEMORY-DEEP.md).
```

---

## 4. Sampling — Temperature, Seed, top_p

```typescript
// sampling.ts — temperature, seed, max_tokens and finish_reason, measured
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });
const ask = (opts: object) => client.chat.completions.create({ model: 'qwen2.5:7b',
  messages: [{ role: 'user', content: 'Suggest a name for a delivery company. Reply with the name only.' }], ...opts });

for (const temperature of [0, 0.7, 1.5]) {
  const names = await Promise.all(Array.from({ length: 5 }, () => ask({ temperature }).then((r) => r.choices[0].message.content!.trim())));
  console.log(`temperature ${temperature}: ${new Set(names).size} distinct of 5 → ${[...new Set(names)].join(' | ')}`);
}
const seeded = await Promise.all(Array.from({ length: 3 }, () => ask({ temperature: 1.0, seed: 42 }).then((r) => r.choices[0].message.content!.trim())));
console.log(`temperature 1.0 + seed 42: ${new Set(seeded).size} distinct of 3 → ${[...new Set(seeded)].join(' | ')}`);

const cut = await client.chat.completions.create({ model: 'qwen2.5:7b', max_tokens: 12,
  messages: [{ role: 'user', content: 'Explain how a cargo van differs from a box truck.' }] });
console.log(`max_tokens 12 → finish_reason: ${cut.choices[0].finish_reason}  text: "${cut.choices[0].message.content}"`);
const full = await client.chat.completions.create({ model: 'qwen2.5:7b', messages: [{ role: 'user', content: 'Say OK.' }] });
console.log(`normal → finish_reason: ${full.choices[0].finish_reason}`);
```

```text
REAL OUTPUT
temperature 0:   1 distinct of 5 → SwiftShip
temperature 0.7: 4 distinct of 5 → SwiftShip | SwiftPulse Delivery | SwiftCourier | SwiftDelivery
temperature 1.5: 3 distinct of 5 → SwiftDelivery | SwiftShip | SwiftPax
temperature 1.0 + seed 42: 1 distinct of 3 → SwiftShip
max_tokens 12 → finish_reason: length  text: "Certainly! Cargo vans and box trucks are both types of commercial"
normal → finish_reason: stop

HOW SAMPLING WORKS
  The model outputs a probability for every possible next token. TEMPERATURE reshapes them:
  0 = always take the most likely token (deterministic in practice); higher = flatter, more
  random. top_p = only sample from the most likely tokens that add up to p (0.9 = top 90%).
  Adjust one or the other, not both.

‼️ WHAT TO USE
   0 (or low)    extraction, classification, RAG answers, tool calling, evals — anything
                 with a right answer. (AI-EVALS-DEEP.md: at 0, repeated eval runs were identical.)
   0.7–1.0       writing, brainstorming, varied suggestions
   > 1.0         rarely useful — more random, not more creative. Here 1.5 gave FEWER distinct
                 names than 0.7 in this sample; it just gets noisier.
   seed          same seed + same settings → same output (here, 3 of 3 identical at temp 1.0).
                 Useful for reproducible tests. Providers that support it don't guarantee it
                 across model updates or hardware.
   Reasoning models (section 11) often ignore or restrict temperature.
```

---

## 5. max_tokens and finish_reason

```text
max_tokens caps the OUTPUT length. When the cap is hit the text simply stops mid-sentence
(above: "…both types of commercial") and finish_reason is "length" instead of "stop".

‼️ ALWAYS CHECK finish_reason
   "stop"        the model finished normally
   "length"      CUT OFF — the answer is incomplete. If you parse JSON from it, it's broken JSON.
   "tool_calls"  the model wants you to run tools (AI-AGENTS-BASICS-JS.md)
   "content_filter" (some providers) the provider blocked the output

Set max_tokens to protect cost and latency, but high enough for a full answer. Some newer
APIs name it max_completion_tokens or max_output_tokens.
```

---

## 6. Streaming

```typescript
// streaming.ts — same request, streamed vs not: what the USER waits for
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama', timeout: 60_000, maxRetries: 2 });
const messages = [{ role: 'user' as const, content: 'In about 120 words, explain what a delivery dispatcher does.' }];

let t = performance.now();
const whole = await client.chat.completions.create({ model: 'qwen2.5:7b', temperature: 0, messages });
console.log(`not streamed: first text after ${((performance.now() - t) / 1000).toFixed(1)} s (all of it at once), ${whole.usage!.completion_tokens} tokens`);

t = performance.now();
let first = 0, chunks = 0, text = '';
const stream = await client.chat.completions.create({ model: 'qwen2.5:7b', temperature: 0, messages, stream: true,
  stream_options: { include_usage: true } });          // ask for token usage in the final chunk
let usage;
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content ?? '';
  if (delta && !first) first = performance.now() - t;
  if (delta) { chunks++; text += delta; }              // in a UI: append delta to the screen here
  if (chunk.usage) usage = chunk.usage;
}
console.log(`streamed:     first text after ${(first / 1000).toFixed(2)} s, done after ${((performance.now() - t) / 1000).toFixed(1)} s, ${chunks} chunks, usage: ${usage?.completion_tokens} tokens`);
console.log(`same text both ways: ${text.trim() === whole.choices[0].message.content?.trim()}`);
```

```text
REAL OUTPUT
not streamed: first text after 1.5 s (all of it at once), 81 tokens
streamed:     first text after 0.02 s, done after 1.4 s, 80 chunks, usage: 81 tokens
same text both ways: true

‼️ Streaming doesn't make the answer FASTER — total time was the same. It makes the FIRST
   WORDS appear ~75× sooner, which is what users perceive as speed. Any chat UI should stream.
   Time to first token (TTFT) and tokens per second are the two latency numbers to track.

- Each chunk carries a small delta; append it to the screen.
- stream_options: { include_usage: true } puts the token counts in the final chunk (otherwise
  streamed responses don't report usage on this API).
- Streams can fail halfway: keep what arrived, show an error, let the user retry.
- To the browser: Server-Sent Events from your server (FASTAPI-DEEP.md §5, AI-FRONTEND-REACT.md).
  Never call the LLM API from the browser with your API key.
```

---

## 7. Structured Output and Tool Calling

```text
When a PROGRAM reads the answer, don't parse free text:

  Structured output   response_format: zodResponseFormat(Schema, 'name') + .parse() → a validated
                      object (AI-AGENTS-BASICS-JS.md §9). The provider constrains the output to
                      your JSON Schema.
  JSON mode           response_format: { type: 'json_object' } — valid JSON, but no schema; validate
                      it yourself. Prefer structured output when supported.
  Tool calling        the model returns tool_calls with JSON arguments (the whole agent guides).

‼️ A schema guarantees the SHAPE, not the TRUTH — AI-AGENTS-MORTGAGE-EXAMPLE-JS.md §8 has a
   perfectly-shaped answer that said 34.7% was "above the 43% limit".
```

---

## 8. Errors, Retries, Timeouts, Rate Limits

```typescript
// retries.ts — how the SDK handles rate limits (429) and failures, against a fake server
import { createServer } from 'node:http';
import OpenAI from 'openai';

let calls = 0;
const times: number[] = [];
const fake = createServer((req, res) => {
  calls++; times.push(performance.now());
  if (calls <= 2) {                                    // first two calls: "slow down"
    res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '1' });
    return res.end(JSON.stringify({ error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } }));
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ id: 'x', object: 'chat.completion', created: 0, model: 'fake',
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'ok' } }] }));
}).listen(4010);

const client = new OpenAI({ baseURL: 'http://localhost:4010/v1', apiKey: 'x', maxRetries: 3, timeout: 10_000 });
const r = await client.chat.completions.create({ model: 'fake', messages: [{ role: 'user', content: 'hi' }] });
console.log(`answer "${r.choices[0].message.content}" after ${calls} HTTP calls; waits between them: ${times.slice(1).map((t, i) => ((t - times[i]) / 1000).toFixed(1) + 's').join(', ')}`);

calls = 0; times.length = 0;
const noRetry = new OpenAI({ baseURL: 'http://localhost:4010/v1', apiKey: 'x', maxRetries: 0 });
try { await noRetry.chat.completions.create({ model: 'fake', messages: [{ role: 'user', content: 'hi' }] }); }
catch (e) { console.log(`maxRetries 0 → ${e instanceof OpenAI.RateLimitError ? 'OpenAI.RateLimitError' : e?.constructor?.name}, status ${(e as any).status}: ${(e as any).message}`); }
fake.close();
```

```text
REAL OUTPUT
answer "ok" after 3 HTTP calls; waits between them: 1.0s, 1.0s
maxRetries 0 → OpenAI.RateLimitError, status 429: 429 Rate limit exceeded

‼️ The SDK already retries 429s, 5xx errors and dropped connections with backoff — and here
   it honoured the server's retry-after header (1 s) exactly. Don't wrap it in a second retry
   loop, or one failure becomes 3 × 3 = 9 calls. Set maxRetries and timeout deliberately.

RATE LIMITS
  Providers limit requests per minute AND tokens per minute (and sometimes per day), per
  model and per account tier. A burst of long prompts hits the TOKEN limit first.
  - Queue and throttle background work (a job queue with concurrency limits)
  - Back off on 429 (the SDK does), and surface "busy, retrying" to users
  - Spread load across models/regions/providers for high volume

ERRORS TO HANDLE ON PURPOSE
  401/403  bad key or no access — don't retry
  400      bad request: oversized context, invalid schema, unsupported parameter — don't
           retry blindly; fix or shrink the input
  429/5xx  retry with backoff (built in)
  timeout  retry once, then fail gracefully; long generations may need a longer timeout
```

---

## 9. Cost — How to Estimate It

```text
cost = input_tokens × input_price + output_tokens × output_price
(prices are quoted per million tokens; output usually costs several × more than input)

WORKED EXAMPLE (illustrative prices — check your provider's current price page)
  Price: $1 per million input tokens, $4 per million output tokens
  A RAG answer: 1,500 input tokens (instructions + 4 retrieved chunks + question)
                + 200 output tokens
  = 1,500 × $0.000001 + 200 × $0.000004 = $0.0015 + $0.0008 = $0.0023 per question
  × 100,000 questions a month ≈ $230

  An agent turn is several model calls, each re-sending the growing history:
  10 steps × ~3,000 input tokens ≈ 30,000 input tokens — ~20× a single call.

‼️ COST LEVERS, BIGGEST FIRST
   1. A smaller/cheaper model where it's good enough (routing, extraction, classification)
   2. Fewer input tokens: trim history, fewer/shorter retrieved chunks, no giant JSON dumps
   3. Prompt caching for repeated prefixes (section 10)
   4. Batch APIs for work that can wait (section 10)
   5. max_tokens caps, and caching whole answers to frequent questions
   Measure cost per FEATURE from usage numbers, not from the monthly bill.
```

---

## 10. Prompt Caching and Batch APIs

```text
PROMPT CACHING
  If many requests start with the same long prefix (system prompt, tool definitions, a
  document), providers can cache the processed prefix and charge much less for it on the next
  request, and answer faster. Details differ:
    - some providers cache long prefixes automatically
    - others need you to mark cache points in the request (e.g. Anthropic's cache_control)
    - caches expire after minutes; cached-token discounts and write costs vary by provider
  ‼️ To benefit: keep the stable parts FIRST and identical (system prompt, tools, documents),
     and put what changes (the user's question) LAST. A timestamp at the top of the system
     prompt breaks caching for every request.

BATCH APIS
  Submit thousands of requests as one job; results come back within hours (typically up to
  24h) at a large discount (about half price at the major providers). Perfect for: evals,
  bulk classification, back-filling embeddings, nightly summaries. Useless for chat.

(Neither can be demonstrated with a local model — check your provider's docs for the exact
 rules and prices.)
```

---

## 11. Choosing a Model

```text
  QUESTION                           LEANS TOWARD
  Is there a right answer the        small/cheap model + structured output + evals
  model only has to find/format?     (classification, extraction, routing)
  Multi-step reasoning, hard         a frontier model, or a REASONING model
  coding/maths, ambiguous tasks?
  Latency-critical (autocomplete,    small, fast model; stream; short prompts
  voice)?
  Data can't leave your network?     open-weight model, self-hosted (AI-OPEN-SOURCE-MODELS-DEEP.md)
  Images, audio, PDFs?               a multimodal model (AI-MULTIMODAL-VISION-DEEP.md)

REASONING MODELS
  Models that "think" before answering: they generate hidden reasoning tokens first (billed as
  output), then the answer. Much better at multi-step problems; slower and pricier per call;
  often a "reasoning effort" setting instead of temperature. Use them where accuracy beats
  latency.

‼️ HOW TO ACTUALLY CHOOSE: build the eval set first (AI-EVALS-DEEP.md), then run 2–3
   candidate models on it and compare pass rate, cost per case and latency. Leaderboards
   tell you what to try, not what wins on YOUR task. Pin exact model versions in production.
```

---

## 12. The Same Basics in Python

```python
# basics.py — the same API basics in Python
from openai import OpenAI, RateLimitError

client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama", timeout=60, max_retries=2)

# Usage: every response says how many tokens it cost
r = client.chat.completions.create(model="qwen2.5:7b", temperature=0, max_tokens=12,
                                   messages=[{"role": "user", "content": "Explain how a cargo van differs from a box truck."}])
print(r.usage.prompt_tokens, r.usage.completion_tokens, r.choices[0].finish_reason)   # "length" = cut off by max_tokens

# Streaming: print each piece as it arrives
stream = client.chat.completions.create(model="qwen2.5:7b", stream=True,
                                        messages=[{"role": "user", "content": "Say hello in five words."}])
for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()

try:
    pass  # client.chat.completions.create(...)
except RateLimitError as e:   # 429 after the automatic retries ran out
    print("rate limited:", e.status_code)
```

```text
REAL OUTPUT
41 12 length
Hello, nice to meet you.

Same SDK shape: timeout / max_retries on the client, r.usage, finish_reason, stream=True and
iterate the chunks, typed errors (RateLimitError, APITimeoutError, BadRequestError…).
```

---

## 13. Provider Differences

```text
                        OPENAI Chat Completions   OPENAI Responses API        ANTHROPIC Messages
  System prompt         a "system" message        `instructions`              top-level `system`
  Output limit          max_tokens /              max_output_tokens           max_tokens (REQUIRED)
                        max_completion_tokens
  Text                  choices[0].message        output items / output_text  content blocks
                        .content
  Stop signal           finish_reason             status / output items       stop_reason
  Usage                 prompt_/completion_tokens input_/output_tokens        input_/output_tokens
  Conversation state    you resend history        optional server-side state  you resend history

‼️ The OpenAI Chat Completions format is the one most other providers and local servers copy
   (Ollama, Gemini, Groq, vLLM…), so code written against it is the most portable. Native SDKs
   expose provider-specific features (prompt caching controls, extended thinking, built-in
   tools). Libraries like the Vercel AI SDK or LiteLLM hide the differences.
```

---

## 14. Common Mistakes

```text
‼️ 1. Estimating tokens as characters ÷ 4 for everything. IDs and numbers were 1 char/token.
‼️ 2. Trusting the model's advertised context window. The server ran it smaller and silently
      dropped the start of the prompt. Check prompt_tokens; set num_ctx on Ollama.
‼️ 3. Not checking finish_reason — and parsing a cut-off ("length") answer as complete.
‼️ 4. temperature > 0 for tasks with a right answer, then wondering why results vary.
‼️ 5. Not streaming chat UIs — 1.5 s of blank screen vs words after 0.02 s.
‼️ 6. Adding your own retry loop on top of the SDK's — multiplies calls under load.
‼️ 7. Putting changing content (timestamps, user names) at the start of the prompt — breaks
      prompt caching.
‼️ 8. Calling the LLM API from the browser with a secret key. Always go through your server.
   9. Ignoring usage numbers until the bill arrives. Log tokens per feature from day one.
```

---

## 15. Cheat Sheet

```text
CLIENT     new OpenAI({ baseURL, apiKey, timeout: 60_000, maxRetries: 2 })
CALL       client.chat.completions.create({ model, messages, temperature, max_tokens, stream, tools, response_format })
READ       choices[0].message.content · choices[0].finish_reason · usage.{prompt,completion}_tokens
STREAM     stream: true + stream_options: { include_usage: true } → for await (chunk) append chunk.choices[0].delta.content
TOKENS     English ≈ 4–5 chars/token · code ≈ 3 · digits/IDs ≈ 1 · non-English often 1–2
CONTEXT    input + output share it · hosted APIs error, some local servers truncate silently · Ollama: num_ctx
SAMPLING   0 for right-answer tasks · 0.7–1.0 creative · seed for reproducibility
COST       in_tokens × in_price + out_tokens × out_price · agents re-send history every step
SAVE       smaller models · fewer input tokens · prompt caching (stable prefix first) · batch API · max_tokens
ERRORS     401/403 fix key · 400 fix input · 429/5xx SDK retries · always set a timeout
```

---

## 16. Interview Answer

```text
Q: "What do you need to know to use LLM APIs well in production?"

"That everything is tokens: cost, limits and speed. Tokens aren't characters — when I measured,
 English was about 4.6 characters per token but UUIDs and numbers were one per character, so
 logs and JSON are far more expensive than they look. The API is stateless, so conversations
 resend history and agents multiply input tokens every step.

 Context windows have a real gotcha: a local server ran a 32k-token model with a smaller
 window and silently dropped the beginning of my prompt — no error, just a wrong answer and a
 smaller prompt_tokens number. So I check usage, and I check finish_reason so I never treat a
 cut-off answer as complete.

 Then the production basics: temperature 0 for anything with a right answer, streaming for
 every chat UI because it cuts perceived latency from seconds to milliseconds, timeouts and
 the SDK's built-in retries for 429s, structured output when code reads the result, and cost
 levers — smaller models where evals say they're good enough, prompt caching with a stable
 prefix, and batch APIs for offline work."
```

---

## Related Files

- [AI-AGENTS-BASICS-JS.md](AI-AGENTS-BASICS-JS.md) — tool calling and the agent loop on top of these APIs
- [AI-RAG-BASICS.md](AI-RAG-BASICS.md) — the embeddings API and retrieval
- [AI-EVALS-DEEP.md](AI-EVALS-DEEP.md) — choosing models and prompts with evidence
- [AI-FRONTEND-REACT.md](../2-medium-priority/AI-FRONTEND-REACT.md) — streaming into a React UI
- [AI-OPEN-SOURCE-MODELS-DEEP.md](AI-OPEN-SOURCE-MODELS-DEEP.md) — running models yourself (Ollama, vLLM)
- [AI-OBSERVABILITY-DEEP.md](../2-medium-priority/AI-OBSERVABILITY-DEEP.md) — tracking tokens, cost and latency
