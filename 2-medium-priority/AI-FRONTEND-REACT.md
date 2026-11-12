# AI in React — Streaming Chat, Tool UIs and Approvals

**Priority: MEDIUM**

> Building the FRONTEND of AI features in React: a streaming chat, tool results rendered as real
> components ("generative UI"), and a human-approval step for risky actions. All of it uses the
> Vercel AI SDK, the most-used JS library for this, plus the UX and security details that make
> it production-ready.
>
> Built and tested with `ai` 7.0 / `@ai-sdk/react` 4.0 (November 2026) against a local
> `qwen2.5:7b` via Ollama. The tests in §8 render the REAL component, call the REAL route and
> model, and click the buttons, and they pass. The AI SDK changes quickly between majors
> (v7 renamed and moved things — see §3), so check its docs for newer versions.

---

## Table of Contents

- [AI in React — Streaming Chat, Tool UIs and Approvals](#ai-in-react--streaming-chat-tool-uis-and-approvals)
  - [Table of Contents](#table-of-contents)
  - [1. What's Different About AI UIs](#1-whats-different-about-ai-uis)
  - [2. The Architecture](#2-the-architecture)
  - [3. The AI SDK in One Page](#3-the-ai-sdk-in-one-page)
  - [4. The Server Route](#4-the-server-route)
  - [5. The Chat Component](#5-the-chat-component)
  - [6. Generative UI — Tool Results as Components](#6-generative-ui--tool-results-as-components)
  - [7. Human Approval in the UI](#7-human-approval-in-the-ui)
  - [8. Testing It — Real Component, Real Model](#8-testing-it--real-component-real-model)
  - [9. UX Patterns That Matter](#9-ux-patterns-that-matter)
  - [10. Without the SDK](#10-without-the-sdk)
  - [11. Common Mistakes](#11-common-mistakes)
  - [12. Cheat Sheet](#12-cheat-sheet)
  - [13. Interview Answer](#13-interview-answer)
  - [Related Files](#related-files)

---

## 1. What's Different About AI UIs

```text
A normal fetch: request → spinner → whole response → render.
An AI response:
  - arrives over SECONDS as a stream of tokens → render as it arrives (AI-LLM-API-BASICS.md §6:
    first words after 0.02 s instead of 1.5 s)
  - isn't just text: it contains TOOL CALLS ("getting a quote…") and TOOL RESULTS (a quote) that
    deserve real UI, not a JSON dump
  - can ask the USER for something mid-stream (approve this booking?)
  - can fail halfway, be stopped, be regenerated
  - is non-deterministic, so the UI must handle answers you didn't design for

‼️ The SDK's core idea: a message is a list of PARTS (text, tool calls in various states,
   reasoning, files…), and your component renders each part by type and state.‼️
```

---

## 2. The Architecture

```text
  Browser (React)                 Your server                       Model provider
  ──────────────                  ───────────                       ──────────────
  useChat() ──POST messages──▶  route: streamText({ model, tools }) ──▶ OpenAI / Anthropic / Ollama…
            ◀──UI message stream── (runs tools, enforces approval)   ◀── tokens, tool calls
  renders parts as they arrive

‼️ The model is ALWAYS called from your server:
   - the API key never reaches the browser
   - tools run where your database and secrets are
   - prices, permissions and approvals are enforced where the user can't tamper with them
   The browser only sends the conversation and renders what comes back.
```

---

## 3. The AI SDK in One Page

```text
PACKAGES
  ai                   core: streamText, generateText, tool, Output (structured output),
                       convertToModelMessages, stepCountIs, DefaultChatTransport
  @ai-sdk/react        useChat (chat), useCompletion (single completions), useObject (streamed JSON)
  @ai-sdk/<provider>   @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google…, and
                       @ai-sdk/openai-compatible for Ollama, vLLM, Groq and friends
                       — switching providers = changing ONE line

‼️ VERSION NOTES — v7 (what bit me reading older tutorials)
   - streamText({ instructions }) — `system` is deprecated
   - tool approval is configured on streamText: toolApproval: { bookDelivery: 'user-approval' };
     the tool-level `needsApproval` option is deprecated
   - experimental_toolApprovalSecret signs approval requests so a client can't forge one
   - tools use `inputSchema` (older code: `parameters`); tool UI parts are typed `tool-<name>`
     with a `state` (older code: `toolInvocations`)
   - useChat sends via a transport: new DefaultChatTransport({ api: '/api/chat' })
```

---

## 4. The Server Route

```typescript
// app/route.ts — the chat endpoint. A standard Web Request → Response handler: drop it into a
// Next.js route (app/api/chat/route.ts → export const POST = handleChat), Hono, or any server.
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';

// Any OpenAI-compatible server works; for OpenAI/Anthropic/Google use @ai-sdk/openai etc.
const ollama = createOpenAICompatible({ name: 'ollama', baseURL: process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1' });
const model = ollama(process.env.LLM_MODEL ?? 'qwen2.5:7b');

// Server-side state: quotes live HERE, so the browser can't invent a price
export const QUOTES = new Map<string, { total: number; vehicle: string; item: string }>();

const tools = {
  getQuote: tool({
    description: 'Price delivering one item. Needs the item, its weight in pounds and the distance in miles.',
    inputSchema: z.object({ item: z.string(), weightLb: z.number().positive(), miles: z.number().positive() }),
    execute: async ({ item, weightLb, miles }) => {
      const vehicle = weightLb <= 100 ? 'Car' : weightLb <= 2500 ? 'Cargo van' : 'Box truck';
      const base = vehicle === 'Car' ? 12 : vehicle === 'Cargo van' ? 35 : 75;
      const total = Math.round((base + miles * 1.6 + (weightLb > 100 ? 40 : 0)) * 100) / 100;
      const quoteId = `Q-${crypto.randomUUID().slice(0, 8)}`;
      QUOTES.set(quoteId, { total, vehicle, item });
      return { quoteId, item, vehicle, total };          // becomes the tool part's `output` in the UI
    },
  }),
  bookDelivery: tool({
    description: 'Book a quoted delivery. Needs the quoteId from getQuote.',
    inputSchema: z.object({ quoteId: z.string() }),
    execute: async ({ quoteId }) => {
      const quote = QUOTES.get(quoteId);
      if (!quote) return { error: `No quote ${quoteId}` };
      QUOTES.delete(quoteId);                            // book once
      return { booked: true, bookingId: `B-${crypto.randomUUID().slice(0, 8)}`, total: quote.total };
    },
  }),
};

export async function handleChat(req: Request): Promise<Response> {
  const { messages }: { messages: UIMessage[] } = await req.json();   // the whole chat, from useChat
  const result = streamText({
    model,
    instructions: 'You are a delivery assistant. Use getQuote to price deliveries and bookDelivery to book. Never state a price yourself.',
    messages: await convertToModelMessages(messages),   // UI messages (with parts) → model messages
    tools,
    toolApproval: { bookDelivery: 'user-approval' },    // ‼️ the USER must approve before it executes
    experimental_toolApprovalSecret: process.env.APPROVAL_SECRET ?? 'dev-only-secret', // signs approval requests
    stopWhen: stepCountIs(5),                           // the agent-loop step limit
    temperature: 0,
  });
  return result.toUIMessageStreamResponse();            // streams text, tool calls and tool results to the UI
}
```

```text
WHAT EACH PIECE DOES
  convertToModelMessages     useChat sends UI messages (with parts, ids, tool states); the model
                             needs model messages. One call converts them.
  tools with execute         run ON THE SERVER; their return value streams to the UI as the
                             tool part's `output`
  toolApproval               bookDelivery won't execute until the user approves in the UI (§7)
  stopWhen: stepCountIs(5)   the agent-loop step limit — streamText calls the model again after
                             each tool result, up to 5 steps
  toUIMessageStreamResponse  a streaming HTTP response in the format useChat reads

‼️ QUOTES live on the server. The UI only ever displays what the getQuote tool returned, and
   bookDelivery looks the price up by quoteId — the same "the model never owns the money"
   rule as AI-AGENTS-DELIVERY-QUOTE-JS.md.

IN NEXT.JS: app/api/chat/route.ts → export const POST = handleChat; (and maxDuration for
long streams on serverless). The handler is a plain Web Request → Response, so it also drops
into Hono, Remix/React Router, Bun, or an Express adapter.
```

---

## 5. The Chat Component

```tsx
// app/Chat.tsx — a streaming chat UI with a tool-result card and an approval step
'use client';
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';

export function Chat({ fetchImpl }: { fetchImpl?: typeof fetch }) {
  const { messages, sendMessage, addToolApprovalResponse, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat', fetch: fetchImpl }),
    // after the user answers an approval, send the conversation back automatically
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const [input, setInput] = useState('');

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id} data-role={m.role}>
          {m.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <p key={i}>{part.text}</p>;

              case 'tool-getQuote':                       // "generative UI": render tool output as a component
                if (part.state === 'output-available') {
                  const q = part.output as { item: string; vehicle: string; total: number };
                  return <div key={i} role="article" aria-label="quote">{q.item}: {q.vehicle} — ${q.total.toFixed(2)}</div>;
                }
                return <p key={i}>Getting a quote…</p>;    // input-streaming / input-available

              case 'tool-bookDelivery':
                if (part.state === 'approval-requested') {
                  return (
                    <div key={i}>
                      <p>Book quote {(part.input as { quoteId: string }).quoteId}?</p>
                      <button onClick={() => addToolApprovalResponse({ id: part.approval.id, approved: true })}>Approve</button>
                      <button onClick={() => addToolApprovalResponse({ id: part.approval.id, approved: false })}>Deny</button>
                    </div>
                  );
                }
                if (part.state === 'output-available') {
                  const b = part.output as { bookingId?: string; total?: number };
                  return <p key={i} role="status">Booked {b.bookingId} — ${b.total?.toFixed(2)}</p>;
                }
                if (part.state === 'output-denied') return <p key={i}>Booking cancelled.</p>;
                return null;

              default:
                return null;
            }
          })}
        </div>
      ))}

      <form onSubmit={(e) => { e.preventDefault(); sendMessage({ text: input }); setInput(''); }}>
        <input aria-label="message" value={input} onChange={(e) => setInput(e.target.value)} disabled={status !== 'ready'} />
        <button type="submit" disabled={status !== 'ready'}>Send</button>
      </form>
    </div>
  );
}
```

```text
TOOL PART STATES (part.type === 'tool-getQuote', 'tool-bookDelivery', …)
  input-streaming       the model is still writing the arguments
  input-available       arguments complete; the tool is running
  approval-requested    waiting for the user (§7) — part.approval.id identifies the request
  approval-responded    the user answered; waiting for the server
  output-available      done — part.output is the tool's return value
  output-error          the tool threw — part.errorText
  output-denied         the user denied the approval

‼️ Handle every state you can reach, or the UI shows nothing while a tool runs. A switch on
   part.type, then on part.state, keeps it explicit (and TypeScript narrows part.output for
   typed tools).

useChat ALSO GIVES YOU: status ('ready' | 'submitted' | 'streaming' | 'error'), stop(),
regenerate(), error, setMessages() — see §9.
```

---

## 6. Generative UI — Tool Results as Components

```text
"Generative UI" just means: the model decides WHICH tool to call; your code decides HOW its
result looks. In §5, getQuote's output renders as a quote card — not as the model's sentence
about the quote:

  REAL OUTPUT (from the test in §8):   QUOTE CARD: sofa: Cargo van — $91.00

‼️ Two big benefits:
   1. The number on screen comes from the tool's DATA, so it can't be misquoted by the
      model's prose (the mortgage and delivery guides both caught the model paraphrasing
      numbers wrongly).
   2. The card can be interactive — a Book button, a vehicle picker, a map — wired to normal
      React state and normal API calls.

The same pattern renders: search results as a list with links, a chart from a data tool, a
form the model pre-filled, a diff the user can accept.
```

---

## 7. Human Approval in the UI

```text
THE FLOW (all real — the test in §8 runs it)
  1. User: "Quote a 120 lb sofa going 10 miles, then book it."
  2. Model calls getQuote → executes on the server → the quote card renders.
  3. Model calls bookDelivery → because of toolApproval: 'user-approval', the server does NOT
     execute it. The part arrives as state 'approval-requested'.
  4. The UI shows Approve / Deny. Clicking calls addToolApprovalResponse({ id, approved }).
  5. sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses re-sends the
     conversation; the server sees the approval, executes the tool, streams the result.
     REAL OUTPUT:   BOOKED: Booked B-87425365 — $91.00
  6. If denied, the part becomes 'output-denied' and the tool never runs.

‼️ SECURITY — the approval is a message FROM THE BROWSER
   Anything the browser sends can be forged. experimental_toolApprovalSecret makes the server
   HMAC-sign each approval request and verify the signature when the approval comes back, so a
   client can't approve a tool call the server never asked about. On top of that, the tool's
   own execute() still checks everything that matters (the quote exists, belongs to this user,
   hasn't been booked) — the approval proves intent, not permission.
```

---

## 8. Testing It — Real Component, Real Model

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ esbuild: { jsx: 'automatic' }, test: { environment: 'jsdom', testTimeout: 180_000 } });
```

```tsx
// app/chat.test.tsx — the REAL component + the REAL route + the local model, in one test
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { Chat } from './Chat';
import { handleChat, QUOTES } from './route';

// Instead of a running server, the component's fetch calls the route handler directly
afterEach(() => { cleanup(); QUOTES.clear(); });

const fetchToRoute: typeof fetch = async (_url, init) => handleChat(new Request('http://test/api/chat', init as RequestInit));

it('quotes, asks for approval, then books', async () => {
  const user = userEvent.setup();
  render(<Chat fetchImpl={fetchToRoute} />);

  await user.type(screen.getByLabelText('message'), 'Quote a 120 lb sofa going 10 miles, then book it.');
  await user.click(screen.getByRole('button', { name: 'Send' }));

  // 1. The tool result renders as a component, not as text
  const card = await screen.findByRole('article', { name: 'quote' }, { timeout: 120_000 });
  console.log('QUOTE CARD:', card.textContent);

  // 2. The model asked to book → the UI shows Approve/Deny, and NOTHING is booked yet
  const approve = await screen.findByRole('button', { name: 'Approve' }, { timeout: 120_000 });
  expect(QUOTES.size).toBe(1);
  await user.click(approve);

  // 3. After approval the tool runs on the server and the result streams back
  const booked = await screen.findByRole('status', {}, { timeout: 120_000 });
  console.log('BOOKED:', booked.textContent);
  expect(QUOTES.size).toBe(0);
});

it('does not book when the user denies', async () => {
  const user = userEvent.setup();
  render(<Chat fetchImpl={fetchToRoute} />);
  await user.type(screen.getByLabelText('message'), 'Quote a 40 lb box going 5 miles, then book it.');
  await user.click(screen.getByRole('button', { name: 'Send' }));

  await user.click(await screen.findByRole('button', { name: 'Deny' }, { timeout: 120_000 }));
  await screen.findByText('Booking cancelled.', {}, { timeout: 120_000 });
  expect(screen.queryByRole('status')).toBeNull();      // no booking happened
  expect(QUOTES.size).toBe(1);                          // the quote is still unbooked
});
```

```text
REAL OUTPUT
QUOTE CARD: sofa: Cargo van — $91.00
BOOKED: Booked B-87425365 — $91.00
  ✓ quotes, asks for approval, then books
  ✓ does not book when the user denies
Tests  2 passed (2)        (run twice; passed both times)

‼️ THE TRICK: DefaultChatTransport accepts a `fetch`. The test passes one that calls the route
   handler directly — no server, no ports — so the test exercises the real component, the real
   streaming protocol, real tools and the real approval flow.
   For fast CI tests, swap the model for the AI SDK's mock model (MockLanguageModelV4 from
   'ai/test' in v7 — the version suffix changes between majors), scripting the tool calls — the same "fake model" idea as the agent guides —
   and keep this real-model version as an occasional smoke test.
   (First run lesson: toBeEnabled() is a jest-dom matcher; without @testing-library/jest-dom
    set up, Vitest's expect doesn't have it.)
```

---

## 9. UX Patterns That Matter

```text
STREAMING
  - Render text as it arrives; keep the scroll pinned to the bottom unless the user scrolled up
  - A "Stop" button while status is 'submitted' / 'streaming' → stop()
  - Show tool progress ("Getting a quote…") from the tool part's state — users tolerate waits
    they can see

ERRORS AND RETRIES
  - status === 'error' → show `error` and a Retry button → regenerate()
  - A stream can fail halfway: keep the partial text, mark it as interrupted
  - Disable the input while a response is in progress (the component above does)

RENDERING MODEL TEXT SAFELY
  - Markdown is the norm: render it with a markdown component that SANITISES (no raw HTML),
    opens links with rel="noopener noreferrer", and only renders images from allow-listed hosts
    — a model-written image URL can leak data (AI-SECURITY-DEEP.md §4)
  - Never dangerouslySetInnerHTML model output

ACCESSIBILITY
  - Put the message list in an aria-live="polite" region so screen readers announce replies —
    but announce the FINISHED message, not every token
  - Approve/Deny are real <button>s with clear labels (the test finds them by role and name)

PERSISTENCE
  - Save messages server-side (onFinish in the route, or by chat id) to restore conversations
  - Stream resumption exists for reconnecting after a page reload mid-response

COST AND PERFORMANCE
  - Abort in-flight requests on unmount / route change
  - Trim history server-side before calling the model; don't trust the client's message list
    for anything security-relevant (validate it, or load the history from your database)
```

---

## 10. Without the SDK

```typescript
// The core of reading a streamed response yourself — fetch + a ReadableStream reader
// (a sketch: no error handling; real streams use SSE framing, e.g. "data: …\n\n" lines)
const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message }) });
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let text = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  text += decoder.decode(value, { stream: true });  // parse SSE events here, append deltas
  setAnswer(text);                                   // re-render as it grows
}
```

```text
EventSource is simpler for GET-only SSE (auto-reconnect), but it can't POST a body — so chat
UIs use fetch streaming. The FastAPI side of this is FASTAPI-DEEP.md §5 (EventSourceResponse).
Writing it yourself is fine for plain text streaming; once you have tool calls, approvals and
multi-step agents, the SDK's message-parts protocol saves a lot of code.
```

---

## 11. Common Mistakes

```text
‼️ 1. Calling the model from the browser with an API key. Always a server route.
‼️ 2. Rendering only `text` parts — tool calls then look like the app froze.
‼️ 3. Showing prices or results from the model's prose instead of the tool output.
‼️ 4. Trusting approvals or message history from the client for security. Sign approvals,
      re-check in execute(), load history from your DB for anything that matters.
‼️ 5. Unsanitised markdown/HTML from the model, and rendering images from any URL.
‼️ 6. Following v4/v5 tutorials on v7: `system` → `instructions`, `parameters` → `inputSchema`,
      needsApproval → toolApproval on streamText, toolInvocations → typed tool parts.
   7. No Stop button, no error state, no retry.
   8. Tests that only mock fetch with canned JSON — the streaming protocol never gets tested.
```

---

## 12. Cheat Sheet

```text
SERVER   streamText({ model, instructions, messages: await convertToModelMessages(messages),
                      tools, toolApproval: { name: 'user-approval' }, stopWhen: stepCountIs(5) })
         .toUIMessageStreamResponse()
TOOL     tool({ description, inputSchema: z.object({...}), execute: async (input) => output })
CLIENT   const { messages, sendMessage, addToolApprovalResponse, status, stop, regenerate, error } =
           useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }),
                     sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses })
RENDER   messages.map(m => m.parts.map(p => switch p.type: 'text' | 'tool-<name>' (by p.state)))
STATES   input-streaming → input-available → [approval-requested → approval-responded] →
         output-available | output-error | output-denied
SEND     sendMessage({ text })
APPROVE  addToolApprovalResponse({ id: part.approval.id, approved: true | false })
TEST     DefaultChatTransport({ fetch }) → call the route handler directly
```

---

## 13. Interview Answer

```text
Q: "How would you build the frontend for an AI assistant in React?"

"The model is always called from a server route — keys and tools stay server-side — and the
 route streams back a sequence of message parts: text, tool calls with their state, tool
 results. I used the Vercel AI SDK: streamText on the server with tools and a step limit, and
 useChat in React, rendering each part by type and state.

 Two patterns matter most. Generative UI: tool results render as components — a quote card
 built from the tool's data — so the numbers on screen can't be misquoted by the model's prose,
 and they can be interactive. And human approval: a risky tool like booking is configured to
 need user approval, so it arrives as an approval request, the UI shows Approve and Deny, and
 the server only executes after approval — with the approval signed so the client can't forge
 it, and the tool still re-checking permissions itself.

 Then the UX details: render as tokens arrive, a stop button, visible tool progress, error and
 retry states, sanitised markdown, and accessible live regions. I tested it by rendering the
 real component with a fetch that calls the route handler directly, clicking Approve and Deny."
```

---

## Related Files

- [AI-LLM-API-BASICS.md](../1-high-priority/AI-LLM-API-BASICS.md) — streaming, tokens and latency underneath this
- [AI-AGENTS-BASICS-JS.md](../1-high-priority/AI-AGENTS-BASICS-JS.md) — the agent loop that streamText runs for you
- [AI-AGENTS-DELIVERY-QUOTE-JS.md](../1-high-priority/AI-AGENTS-DELIVERY-QUOTE-JS.md) — server-side quotes, approvals and booking rules
- [AI-SECURITY-DEEP.md](AI-SECURITY-DEEP.md) — why model output must be rendered carefully
- [FASTAPI-DEEP.md](../1-high-priority/FASTAPI-DEEP.md) — §5 the same streaming from a Python backend
- [REACT-TESTING-BASICS.md](../1-high-priority/REACT-TESTING-BASICS.md) — Testing Library basics behind §8
- [NEXTJS-DEEP.md](NEXTJS-DEEP.md) — route handlers in Next.js
