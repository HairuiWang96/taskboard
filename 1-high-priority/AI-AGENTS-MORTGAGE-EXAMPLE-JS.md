# AI Agents — Hands-On Example: Mortgage Loan Intake (JavaScript / TypeScript)

**Priority: HIGH**

> The JavaScript twin of [AI-AGENTS-MORTGAGE-EXAMPLE.md](AI-AGENTS-MORTGAGE-EXAMPLE.md) (Python +
> FastAPI). Same project, same sections, written in TypeScript with Node.js and Express. Build it
> in JS first, then rebuild it from the Python version to learn Python. Section 18 maps the two.
>
> A worked project: build one AI agent end to end, for free, for a made-up mortgage-lending
> scenario (the kind of "agentic tooling for lenders" job recruiters are hiring for). It goes from
> raw tool calls to a framework, an Express API, tests, evals and a 10-step project roadmap.
>
> For the general concepts behind it (workflow patterns, memory, MCP, prompt injection, provider
> differences), read [AI-AGENTS-BASICS-JS.md](AI-AGENTS-BASICS-JS.md) first or alongside.
>
> Every code block here was run on Node 22 (`openai` 7, `@openai/agents` 0.21, `zod` 4,
> Express 5, Vitest 5) against a local `qwen2.5:7b` model via Ollama (November 2026). Library APIs
> and model names change. If something doesn't match, check the library's docs.

---

## Table of Contents

- [AI Agents — Hands-On Example: Mortgage Loan Intake (JavaScript / TypeScript)](#ai-agents--hands-on-example-mortgage-loan-intake-javascript--typescript)
  - [Table of Contents](#table-of-contents)
  - [1. Prompt Call vs Agent](#1-prompt-call-vs-agent)
  - [2. The Agent Loop — The Whole Idea](#2-the-agent-loop--the-whole-idea)
  - [3. Free Setup — No Credit Card Needed](#3-free-setup--no-credit-card-needed)
  - [4. The Scenario — Loan Intake Assistant](#4-the-scenario--loan-intake-assistant)
  - [5. Build It From Scratch — Step by Step](#5-build-it-from-scratch--step-by-step)
  - [6. The Full Agent (Copy, Run, Read)](#6-the-full-agent-copy-run-read)
  - [7. Writing Good Tools](#7-writing-good-tools)
  - [8. Structured Output — Get Data, Not Prose](#8-structured-output--get-data-not-prose)
  - [9. Human Approval for Risky Actions](#9-human-approval-for-risky-actions)
  - [10. The Same Agent With a Framework](#10-the-same-agent-with-a-framework)
  - [11. Serving It Over HTTP — Express](#11-serving-it-over-http--express)
  - [12. Testing an Agent](#12-testing-an-agent)
  - [13. Agents in a Regulated Business (Mortgages)](#13-agents-in-a-regulated-business-mortgages)
  - [14. Common Beginner Mistakes](#14-common-beginner-mistakes)
  - [15. Cheat Sheet](#15-cheat-sheet)
  - [16. Your Hands-On Project Roadmap](#16-your-hands-on-project-roadmap)
  - [17. Interview Answer](#17-interview-answer)
  - [18. JavaScript ↔ Python — Rebuilding It in Python](#18-javascript--python--rebuilding-it-in-python)
  - [Related Files](#related-files)

---

## 1. Prompt Call vs Agent

```text
WHAT YOU'VE DONE SO FAR — a single prompt call

  your code ──"Summarise this loan file"──▶ LLM ──"Here is a summary…"──▶ your code

  One question, one answer. The model only knows what you put in the prompt.
  It can't look anything up, can't calculate reliably, can't DO anything.


WHAT AN AGENT IS — the model decides which of YOUR functions to call, in a loop

  your code ──"Is APP-1001 ready for underwriting?" + list of tools──▶ LLM
  LLM ──"call get_application('APP-1001')"──▶ your code runs it ──result──▶ LLM
  LLM ──"call calculate_dti(...)"──────────▶ your code runs it ──result──▶ LLM
  LLM ──"call check_documents('APP-1001')"─▶ your code runs it ──result──▶ LLM
  LLM ──"NOT READY — bank statements missing"──▶ done

‼️ AN AGENT IN ONE SENTENCE
   An LLM that, given a goal and a set of tools, decides step by step which tool to
   call next, sees the result, and keeps going until the goal is done.‼️
```

```text
‼️ THE ONE FACT THAT MAKES IT CLICK
   The model NEVER runs your code. It only replies with a structured request:
     { "name": "calculate_dti", "arguments": "{\"monthlyDebts\": 1200, ...}" }
   YOUR code runs the function and sends the result back as another message.
   An "agent framework" is mostly just a nicer way to write that loop.‼️
```

```text
WORKFLOW vs AGENT — know the difference (interviewers ask)

  WORKFLOW   YOU decide the steps in code; the LLM fills in one step.
             "Extract fields from the PDF → validate → save." Predictable, cheap.
  AGENT      The LLM decides the steps. Flexible, handles surprises,
             but less predictable and costs more calls.

‼️ Use the simplest thing that works. Many "AI agent" products are mostly workflows
   with an agent only where the path really varies.‼️
```

---

## 2. The Agent Loop — The Whole Idea

```text
  ┌──────────────────────────────────────────────────────────┐
  │ messages = [system prompt, user's goal]                  │
  │                                                          │
  │ loop (at most N times):                                  │
  │    response = await LLM(messages, tools)                 │
  │                                                          │
  │    if response has NO tool calls:                        │
  │        return response.content         ← final answer    │
  │                                                          │
  │    for each tool call in response:                       │
  │        result = runMyFunction(name, arguments)           │
  │        messages.push(result)           ← model sees it   │
  └──────────────────────────────────────────────────────────┘

Three ingredients:
  1. TOOLS           your functions + a description of each (name, what it does, params)
  2. A SYSTEM PROMPT the agent's job, rules and limits
  3. THE LOOP        call model → run tools → feed results back → repeat

‼️ The loop needs a MAX STEPS limit. Without one, a confused model can call tools forever
   and burn money.‼️
```

---

## 3. Free Setup — No Credit Card Needed

```text
You need (a) a model that supports TOOL CALLING and (b) a Node project.

OPTION A — LOCAL WITH OLLAMA (recommended for learning: free, offline, unlimited)
  Runs an open model on your own laptop. 8 GB+ RAM is enough for a 7B model.
  Slower and less clever than hosted models — which is GOOD for learning, because
  you'll see agents make mistakes and learn to guard against them.

OPTION B — A HOSTED FREE TIER (faster, smarter, rate-limited)
  Google Gemini (AI Studio API key) and Groq both have free tiers and both offer an
  OpenAI-compatible endpoint. Free-tier limits and model names change often, so check
  their sites.

‼️ The trick that makes this easy: Ollama, Gemini and Groq all speak the OPENAI API
   format. You keep using the `openai` npm package you may already know and only change
   baseURL, apiKey and the model name.‼️
```

```bash
# ── Option A: Ollama ──────────────────────────────────────────────────────────
brew install ollama            # or download from ollama.com
ollama serve                   # starts the local server on :11434 (the app does this for you)
ollama pull qwen2.5:7b         # ~4.7 GB; a small model with good tool calling
ollama run qwen2.5:7b "hi"     # sanity check

# ── Node project ─────────────────────────────────────────────────────────────
mkdir loan-agent && cd loan-agent
npm init -y
npm pkg set type=module        # import/export syntax
npm install openai zod
node agent.ts                  # Node 22.18+ / 24 run .ts files directly (types are stripped)
```

```text
SWITCHING PROVIDERS = 3 VALUES (set them as environment variables)

                 LLM_BASE_URL                                               LLM_API_KEY
  Ollama         http://localhost:11434/v1                                   anything (e.g. "ollama")
  Gemini         https://generativelanguage.googleapis.com/v1beta/openai/    your AI Studio key
  Groq           https://api.groq.com/openai/v1                              your Groq key
  OpenAI         (leave unset — the SDK default)                             your OpenAI key

  LLM_MODEL      e.g. qwen2.5:7b for Ollama; for hosted providers, copy a current
                 model id from their model list.

  Run with:  LLM_MODEL=qwen2.5:7b node agent.ts   (or put them in a .env file and use
             node --env-file=.env agent.ts)

‼️ Running .ts directly: import local files WITH the extension ('./agent.ts') and stick to
   "erasable" TypeScript (no enums). If your Node is older, use `npx tsx agent.ts`.

‼️ Not every model supports tool calling. If the model ignores your tools or crashes,
   check its model card for "tools" / "function calling". For Ollama, look for the
   "tools" tag on ollama.com/search.‼️
```

---

## 4. The Scenario — Loan Intake Assistant

```text
THE BUSINESS PROBLEM (made up, but realistic)
  A mortgage lender gets hundreds of applications a week. Before an underwriter (a human
  expert who approves or denies the loan) looks at one, a processor checks:
    - Are all required documents in?
    - Is the debt-to-income ratio (DTI) within limits?
  That checking is repetitive. An agent can do the first pass so processors handle more
  applications without hiring more people: "scale volume without adding headcount".

TWO TERMS YOU NEED
  DTI  = (monthly debts + new housing payment) / gross monthly income
         Many loan programs want ≤ 43% (the real limits vary by program; 43% is our rule).
  Required documents (our simplified list): photo_id, pay_stubs, w2_2025, bank_statements

THE AGENT'S JOB
  Input:  "Is application APP-1001 ready for underwriting?"
  Tools:  get_application, calculate_dti, check_documents
  Output: READY / NOT READY + reasons

‼️ The agent does NOT approve loans. It prepares work for a human. That boundary matters
   a lot in lending (section 13).‼️
```

---

## 5. Build It From Scratch — Step by Step

Build it from scratch once, without a framework. After that, every framework will make sense.

### Step 1 — A plain function (the tool)

```typescript
function calculateDti({ monthlyDebts, proposedHousingPayment, grossMonthlyIncome }:
  { monthlyDebts: number; proposedHousingPayment: number; grossMonthlyIncome: number }) {
  const dti = (monthlyDebts + proposedHousingPayment) / grossMonthlyIncome;
  return { dtiPercent: Math.round(dti * 1000) / 10 }; // one decimal place
}
```

```text
Nothing AI about it. A tool is just a function. It takes ONE object argument because the
model sends the arguments as one JSON object — destructuring it keeps things simple.
‼️ Do the maths in code, never in the model. LLMs are bad at arithmetic and great at
deciding WHEN to call a calculator.‼️
```

### Step 2 — Describe it to the model

```typescript
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'calculate_dti',
      description: 'Calculate the debt-to-income ratio (DTI) as a percentage. ' +
                   'Always use this tool instead of doing the maths yourself.',
      parameters: {                         // a JSON Schema for the arguments
        type: 'object',
        properties: {
          monthlyDebts: { type: 'number' },
          proposedHousingPayment: { type: 'number' },
          grossMonthlyIncome: { type: 'number' },
        },
        required: ['monthlyDebts', 'proposedHousingPayment', 'grossMonthlyIncome'],
      },
    },
  },
];
```

```text
‼️ The model never sees your code, ONLY this description. The name and
   description are how it decides whether to use the tool, so write them like docs
   for a new teammate.‼️
```

### Step 3 — Send the tools, see what comes back

```typescript
const response = await client.chat.completions.create({ model: MODEL, messages, tools: TOOLS });
const message = response.choices[0].message;

message.tool_calls          // undefined/empty → the model answered in text
                            // an array        → the model wants you to run these tools
const call = message.tool_calls[0];
call.id                     // 'call_abc123'  — you must send this back with the result
call.function.name          // 'calculate_dti'
call.function.arguments     // '{"monthlyDebts": 1200, ...}'  ← a JSON STRING, not an object
```

### Step 4 — Run the tool, send the result back

```typescript
const args = JSON.parse(call.function.arguments);  // string → object
const result = calculateDti(args);

messages.push(message);                            // 1. the model's request, verbatim
messages.push({                                    // 2. your answer to it
  role: 'tool',
  tool_call_id: call.id,                           // links the result to the request
  content: JSON.stringify(result),                 // always a string
});
```

```text
‼️ Both pushes are required. Leave out the assistant message, or get the
   tool_call_id wrong, and the API rejects the next request (or the model gets confused).‼️
```

### Step 5 — Loop until there are no more tool calls

That's section 6.

---

## 6. The Full Agent (Copy, Run, Read)

```typescript
// agent.ts — a complete agent in ~150 lines, no framework
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

// ── 1. The model client ───────────────────────────────────────────────────────
// Ollama speaks the OpenAI API, so the normal OpenAI SDK works — just point it
// at your laptop. To use a hosted model instead, change baseURL/apiKey/MODEL.
export const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY ?? 'ollama', // Ollama ignores the key, but the SDK requires one
});
export const MODEL = process.env.LLM_MODEL ?? 'qwen2.5:7b';

// ── 2. Fake data — stands in for the lender's loan system ─────────────────────
type Application = {
  borrower: string;
  loanAmount: number;
  grossMonthlyIncome: number;
  monthlyDebts: number;            // car loan + credit cards
  proposedHousingPayment: number;  // new mortgage payment
  documentsReceived: string[];
};

export const APPLICATIONS: Record<string, Application> = {
  'APP-1001': {
    borrower: 'Jordan Lee',
    loanAmount: 320_000,
    grossMonthlyIncome: 9_500,
    monthlyDebts: 1_200,
    proposedHousingPayment: 2_100,
    documentsReceived: ['photo_id', 'pay_stubs', 'w2_2025'],
  },
  'APP-1002': {
    borrower: 'Sam Rivera',
    loanAmount: 450_000,
    grossMonthlyIncome: 7_000,
    monthlyDebts: 1_900,
    proposedHousingPayment: 2_800,
    documentsReceived: ['photo_id'],
  },
};
export const REQUIRED_DOCUMENTS = ['photo_id', 'pay_stubs', 'w2_2025', 'bank_statements'];

// ── 3. The tools — plain functions ────────────────────────────────────────────
function getApplication({ applicationId }: { applicationId: string }) {
  return APPLICATIONS[applicationId] ?? { error: `No application found with id ${applicationId}` };
}

function calculateDti({ monthlyDebts, proposedHousingPayment, grossMonthlyIncome }:
  { monthlyDebts: number; proposedHousingPayment: number; grossMonthlyIncome: number }) {
  const dti = (monthlyDebts + proposedHousingPayment) / grossMonthlyIncome;
  return { dtiPercent: Math.round(dti * 1000) / 10 }; // one decimal place
}

function checkDocuments({ applicationId }: { applicationId: string }) {
  const app = APPLICATIONS[applicationId];
  if (!app) return { error: `No application found with id ${applicationId}` };
  const missing = REQUIRED_DOCUMENTS.filter((d) => !app.documentsReceived.includes(d));
  return { missingDocuments: missing };
}

export const TOOL_FUNCTIONS: Record<string, (args: any) => unknown> = {
  get_application: getApplication,
  calculate_dti: calculateDti,
  check_documents: checkDocuments,
};

// ── 4. Tool descriptions — what the MODEL sees (it never sees your code) ──────
export const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_application',
      description: 'Look up a loan application by its id. Returns borrower, loan amount, income, debts and documents received.',
      parameters: {
        type: 'object',
        properties: { applicationId: { type: 'string', description: 'e.g. APP-1001' } },
        required: ['applicationId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_dti',
      description: 'Calculate the debt-to-income ratio (DTI) as a percentage. Always use this tool instead of doing the maths yourself.',
      parameters: {
        type: 'object',
        properties: {
          monthlyDebts: { type: 'number' },
          proposedHousingPayment: { type: 'number' },
          grossMonthlyIncome: { type: 'number' },
        },
        required: ['monthlyDebts', 'proposedHousingPayment', 'grossMonthlyIncome'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_documents',
      description: 'List which required documents are still missing for an application.',
      parameters: {
        type: 'object',
        properties: { applicationId: { type: 'string' } },
        required: ['applicationId'],
      },
    },
  },
];

export const SYSTEM_PROMPT = `You are a loan intake assistant for a mortgage lender.
Your job: check whether an application is ready to send to an underwriter.
An application is READY only if no documents are missing AND DTI is 43% or below.
Always use the tools to get facts and do calculations — never guess numbers.
You do not approve or deny loans; a human underwriter does that.
End with: READY or NOT READY, followed by the reasons in short bullet points.`;

// ── 5. The agent loop ─────────────────────────────────────────────────────────
export async function runAgent(task: string, maxSteps = 10): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: task },
  ];

  for (let step = 0; step < maxSteps; step++) {
    const response = await client.chat.completions.create({ model: MODEL, messages, tools: TOOLS });
    const message = response.choices[0].message;

    // No tool calls → the model is giving its final answer. Done.
    if (!message.tool_calls?.length) return message.content ?? '';

    // The model asked for one or more tools. Save its request in the history...
    messages.push(message);

    // ...run each tool, and send each result back.
    for (const call of message.tool_calls) {
      if (call.type !== 'function') continue;
      const name = call.function.name;
      const args = JSON.parse(call.function.arguments); // a JSON STRING → object
      console.log(`  [step ${step + 1}] ${name}(${JSON.stringify(args)})`);

      const fn = TOOL_FUNCTIONS[name];
      const result = fn ? fn(args) : { error: `Unknown tool ${name}` };

      messages.push({
        role: 'tool',
        tool_call_id: call.id, // links this result to the request above
        content: JSON.stringify(result),
      });
    }
  }
  return 'Stopped: reached the step limit without a final answer.';
}

// Only runs with `node agent.ts`, not when another file imports this one
if (import.meta.main) {
  for (const appId of ['APP-1001', 'APP-1002']) {
    console.log(`\n=== ${appId} ===`);
    console.log(await runAgent(`Is application ${appId} ready for underwriting?`));
  }
}
```

```text
REAL OUTPUT (qwen2.5:7b on a laptop)

=== APP-1001 ===
  [step 1] get_application({"applicationId":"APP-1001"})
  [step 2] calculate_dti({"grossMonthlyIncome":9500,"monthlyDebts":1200,"proposedHousingPayment":2100})
  [step 3] check_documents({"applicationId":"APP-1001"})
NOT READY
- Missing documents: bank statements
- DTI: 34.7% (below 43%)

=== APP-1002 ===
  [step 1] get_application({"applicationId":"APP-1002"})
  [step 2] calculate_dti({"grossMonthlyIncome":7000,"monthlyDebts":1900,"proposedHousingPayment":2800})
  [step 3] check_documents({"applicationId":"APP-1002"})
NOT READY
- DTI is 67.1%, which is above the 43% threshold.
- Missing documents: pay stubs, W2 for 2025, bank statements.

‼️ Look at what happened:
   - Nobody told it the ORDER. It decided: look up the app → take the numbers it needed
     from the result → pass them to calculate_dti → check documents. That's the "agent" part.
   - The decision is right both times. Wording varies from run to run (the Python version
     once wrote "below 43%, but close enough" for 34.7%) — that's why section 8 turns the
     answer into structured data, and section 12 tests it.‼️
```

```text
TYPESCRIPT DETAILS IN THIS FILE
  Record<string, Application>      an object used as a map: id → Application
  ?? 'default'                     use the right side only if the left is null/undefined
  message.tool_calls?.length       optional chaining: undefined (falsy) if tool_calls is missing
  call.type !== 'function'         the SDK's type allows other kinds of tool call; skip them
  (args: any) => unknown           the model's arguments are untrusted JSON, so the map is loose;
                                   section 7 shows validating them with zod
```

---

## 7. Writing Good Tools

```text
‼️ Most "my agent is dumb" problems are actually tool problems.‼️

  ✓ ONE JOB PER TOOL        check_documents, not do_everything(action="...")
  ✓ CLEAR NAMES             verb_noun: get_application, send_document_request
  ✓ DESCRIPTIONS SAY WHEN   "Use this after check_documents shows something is missing."
  ✓ RETURN ERRORS AS DATA   { error: 'No application APP-9' } instead of throwing.
                            The model reads the error and can recover (try another id,
                            ask the user). An exception just crashes your loop.‼️
  ✓ SMALL OUTPUTS           Return the fields the model needs, not a 5,000-line JSON
                            blob. Everything you return costs tokens and attention.
  ✓ CODE DOES THE RULES     Calculations, validation, permissions, limits → in code.
                            The model decides WHAT to do; your code decides what's ALLOWED.
  ✓ FEW TOOLS               Start with 3–5. Dozens of similar tools confuse models,
                            small ones especially.

READ TOOLS vs ACTION TOOLS
  Read      get_application, check_documents     safe — let the agent call freely
  Action    send_email, update_status, order_appraisal
            changes the world → validate, log, often require human approval (section 9)
```

```typescript
// Validating arguments with zod — the model can send a wrong type or a made-up field
import { z } from 'zod';

const DtiArgs = z.object({
  monthlyDebts: z.number().nonnegative(),
  proposedHousingPayment: z.number().nonnegative(),
  grossMonthlyIncome: z.number().positive(),   // also prevents dividing by zero
});

function calculateDtiSafe(raw: unknown) {
  const parsed = DtiArgs.safeParse(raw);
  if (!parsed.success) return { error: `Invalid arguments: ${parsed.error.message}` }; // error as data
  const { monthlyDebts, proposedHousingPayment, grossMonthlyIncome } = parsed.data;
  return { dtiPercent: Math.round(((monthlyDebts + proposedHousingPayment) / grossMonthlyIncome) * 1000) / 10 };
}
```

---

## 8. Structured Output — Get Data, Not Prose

```text
"NOT READY\n- Missing documents: bank statements" is fine for a human. Your React app,
database or the next workflow step wants DATA. Ask the model to fill a schema.
```

```typescript
// structured.ts — zod is JS's Pydantic: one schema gives validation AND the TS type
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { client, MODEL } from './agent.ts';

const IntakeDecision = z.object({
  status: z.enum(['READY', 'NOT_READY']),
  dtiPercent: z.number(),
  missingDocuments: z.array(z.string()),
  reasons: z.array(z.string()),
});

const completion = await client.chat.completions.parse({
  model: MODEL,
  messages: [
    { role: 'system', content: 'Turn the loan intake review into the requested format.' },
    { role: 'user', content: finalAnswerFromTheAgent },
  ],
  response_format: zodResponseFormat(IntakeDecision, 'intake_decision'),
});
const decision = completion.choices[0].message.parsed; // typed, already validated (or null)

decision?.status            // 'NOT_READY'
decision?.missingDocuments  // ['bank_statements']
```

```text
REAL OUTPUT for the input "NOT READY. DTI is 34.7%. Missing documents: bank_statements."
  {
    status: 'NOT_READY',
    dtiPercent: 34.7,
    missingDocuments: [ 'bank_statements' ],
    reasons: [ 'DTI is above the acceptable limit' ]     ← ‼️ WRONG: 34.7% is below 43%
  }

‼️ The schema guarantees the SHAPE, not the TRUTH. status, dtiPercent and
   missingDocuments are right; the free-text reason is invented. Two fixes:
   1. Don't ask the model for things code can compute: derive status from
      dtiPercent <= 43 && missingDocuments.length === 0 yourself.
   2. Keep free-text fields for humans only, and never base a decision on them.

COMMON PATTERN: let the agent loop work freely, then do ONE final structured call to
turn its answer into a validated object. Your app then uses decision.status, never a
regex over free text.‼️
```

---

## 9. Human Approval for Risky Actions

```text
Add an ACTION tool, send_document_request, that emails the borrower. You don't want a
model emailing customers on its own, so put a human check in front of it, IN YOUR CODE.
```

```typescript
// approval.ts
import * as readline from 'node:readline/promises';
import { APPLICATIONS, TOOL_FUNCTIONS, TOOLS } from './agent.ts';

function sendDocumentRequest({ applicationId, documents }: { applicationId: string; documents: string[] }) {
  // In real life: email/SMS the borrower. Here we just pretend.
  return { sent: true, to: APPLICATIONS[applicationId].borrower, documents };
}
TOOL_FUNCTIONS.send_document_request = sendDocumentRequest;
TOOLS.push({
  type: 'function',
  function: {
    name: 'send_document_request',
    description: 'Email the borrower asking for missing documents. Only use after check_documents shows something is missing.',
    parameters: {
      type: 'object',
      properties: {
        applicationId: { type: 'string' },
        documents: { type: 'array', items: { type: 'string' } },
      },
      required: ['applicationId', 'documents'],
    },
  },
});

const NEEDS_APPROVAL = new Set(['send_document_request']);

async function askHuman(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function runTool(name: string, args: any) {
  if (NEEDS_APPROVAL.has(name)) {
    const answer = await askHuman(`Agent wants to call ${name}(${JSON.stringify(args)}). Allow? [y/N] `);
    if (answer.trim().toLowerCase() !== 'y') {
      // Tell the model, as data, so it can carry on without that action
      return { error: 'A human rejected this action. Do not retry it.' };
    }
  }
  const fn = TOOL_FUNCTIONS[name];
  return fn ? fn(args) : { error: `Unknown tool ${name}` };
}

// In the loop from section 6, replace
//     const result = fn ? fn(args) : { error: … };
// with
//     const result = await runTool(name, args);
// and add to the system prompt: "If documents are missing, request them from the borrower."
```

```text
REAL OUTPUT — "Review APP-1001 and chase anything missing."
  [step 1] get_application({"applicationId":"APP-1001"})
  [step 2] calculate_dti({...})
  [step 3] check_documents({"applicationId":"APP-1001"})
  [step 4] send_document_request({"applicationId":"APP-1001","documents":["bank_statements"]})
  Agent wants to call send_document_request(...). Allow? [y/N] y
  NOT READY
  - Missing: bank statements
  - DTI: 34.7% (ready)

‼️ WHAT ELSE HAPPENED ACROSS FOUR RUNS (all real)
   - Two runs: exactly as above.
   - One run: the model asked to send the SAME email TWICE. The approval prompt caught the
     duplicate — but in an unattended system you'd need IDEMPOTENCY: remember that
     (APP-1001, bank_statements) was already requested today and return
     { alreadySent: true } instead of emailing again.
   - One run: the model PRINTED the tool call as text ({"name": "send_document_request", …})
     instead of actually making one, so nothing ran and that text became the "final
     answer". Small models do this sometimes. Defences: detect it (a final answer that
     looks like JSON / contains "<tool_call>"), retry once, and track how often it
     happens in your evals.‼️

‼️ The approval lives in YOUR code, not in the prompt. "Please ask before emailing" in a
   system prompt is a suggestion. A check in runTool is a guarantee.‼️

In a web app, readline becomes: save the pending action → show "Approve / Reject" in the
React UI → resume the agent with the decision. Frameworks call this human-in-the-loop
(HITL) and most have built-in support for it.
```

---

## 10. The Same Agent With a Framework

```text
Once the loop makes sense, a framework writes it for you: it turns your functions into tool
schemas, runs the loop, and adds tracing, handoffs between agents, guardrails and retries.
```

```typescript
// npm install @openai/agents
// agent_sdk.ts — the same agent with the OpenAI Agents SDK (works with Ollama too)
import OpenAI from 'openai';
import { z } from 'zod';
import { Agent, OpenAIChatCompletionsModel, run, setTracingDisabled, tool } from '@openai/agents';
import { APPLICATIONS, REQUIRED_DOCUMENTS, SYSTEM_PROMPT } from './agent.ts'; // reuse data + prompt

setTracingDisabled(true); // tracing uploads to OpenAI's dashboard — off when using other models

const model = new OpenAIChatCompletionsModel(
  new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' }),
  'qwen2.5:7b',
);

// tool() builds the JSON schema from the zod `parameters` — and validates the arguments
const getApplication = tool({
  name: 'get_application',
  description: 'Look up a loan application by its id (e.g. APP-1001).',
  parameters: z.object({ applicationId: z.string() }),
  execute: async ({ applicationId }) =>
    APPLICATIONS[applicationId] ?? { error: `No application ${applicationId}` },
});

const calculateDti = tool({
  name: 'calculate_dti',
  description: 'Calculate debt-to-income ratio as a percentage. Always use this instead of doing maths yourself.',
  parameters: z.object({
    monthlyDebts: z.number(),
    proposedHousingPayment: z.number(),
    grossMonthlyIncome: z.number(),
  }),
  execute: async ({ monthlyDebts, proposedHousingPayment, grossMonthlyIncome }) => ({
    dtiPercent: Math.round(((monthlyDebts + proposedHousingPayment) / grossMonthlyIncome) * 1000) / 10,
  }),
});

const checkDocuments = tool({
  name: 'check_documents',
  description: 'List which required documents are still missing for an application.',
  parameters: z.object({ applicationId: z.string() }),
  execute: async ({ applicationId }) => {
    const app = APPLICATIONS[applicationId];
    if (!app) return { error: `No application ${applicationId}` };
    return { missingDocuments: REQUIRED_DOCUMENTS.filter((d) => !app.documentsReceived.includes(d)) };
  },
});

const intakeAgent = new Agent({
  name: 'Loan intake assistant',
  instructions: SYSTEM_PROMPT,
  tools: [getApplication, calculateDti, checkDocuments],
  model,
});

const result = await run(intakeAgent, 'Is application APP-1001 ready for underwriting?', { maxTurns: 10 });
console.log(result.finalOutput);
```

```text
REAL OUTPUT
  NOT READY
  - DTI is 34.7%, which is below 43%
  - Missing documents: bank statements

‼️ Compare with section 6: TOOLS (the JSON schemas), TOOL_FUNCTIONS and runAgent are gone.
   tool() + run() do that work, and zod validates every argument for free. Same idea,
   less code.‼️
```

```text
WHICH FRAMEWORK? (all free and open source, all have JS/TS versions)

  OpenAI Agents SDK   @openai/agents. Small and easy, close to the raw loop. Works with any
                      OpenAI-compatible model. A great FIRST framework.
  Vercel AI SDK       `ai`. The most popular JS choice when the agent streams into a React /
                      Next.js UI; one API over many providers.
  LangGraph.js        Agents as a graph of steps with saved state: pause/resume, human
                      approval, long workflows. Shows up in job postings more than any
                      other (mostly the Python version). Learn it second.
  Mastra              TypeScript-first framework: agents, workflows, memory, evals.
  Claude Agent SDK    Anthropic's toolkit behind Claude Code: files, shell, MCP tools.
                      Aimed at agents that work on a computer; Claude models only.

‼️ They all do the same section-2 loop. Learn it raw, then pick one framework and go deep.
   Don't try to learn all of them.‼️
```

---

## 11. Serving It Over HTTP — Express

```text
Your React app calls the agent through an API. In the Python version that's FastAPI;
here it's Express 5 (npm install express zod).
```

```typescript
// server.ts — node server.ts
import express from 'express';
import { z } from 'zod';
import { APPLICATIONS, runAgent } from './agent.ts';

export const app = express();
app.use(express.json());

const ReviewRequest = z.object({ applicationId: z.string().min(1) });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Express 5: async handlers are fine — a thrown error goes to the error handler
app.post('/reviews', async (req, res) => {
  const parsed = ReviewRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'Invalid body', details: z.flattenError(parsed.error) });
  }
  const { applicationId } = parsed.data;
  if (!APPLICATIONS[applicationId]) {
    return res.status(404).json({ error: 'Application not found' });
  }
  const review = await runAgent(`Is application ${applicationId} ready for underwriting?`);
  res.json({ applicationId, review });
});

if (import.meta.main) {
  app.listen(3000, () => console.log('Listening on http://localhost:3000'));
}
```

```text
POST /reviews {"applicationId": "APP-1002"}  → 200 {"applicationId":"APP-1002","review":"NOT READY\n- DTI is 67.1%, ..."}
POST /reviews {}                              → 422 (zod rejected the body)
POST /reviews {"applicationId": "NOPE"}       → 404

FASTAPI vs EXPRESS — what changes
  FastAPI validates the body from the type hints automatically (bad input → 422).
  In Express YOU call zod's safeParse() and send the 422 yourself, as above.
  FastAPI generates /docs automatically; in Express you'd add a library
  (e.g. generate an OpenAPI spec from the zod schemas).
  `export const app` + `if (import.meta.main)` lets tests import the app without
  starting a server — the same trick as FastAPI's TestClient (section 12).

‼️ Agent calls are SLOW (seconds to minutes). For real use: stream progress to the UI
   (Server-Sent Events), or start a background job (e.g. BullMQ) and let the frontend
   poll for the result. A 30-second HTTP request will time out somewhere.‼️
```

---

## 12. Testing an Agent

```text
The model's answers vary from run to run, so test in three layers. Vitest + supertest:
  npm install -D vitest supertest      →  npx vitest run
```

```typescript
// tools.test.ts — 1. TOOLS: plain functions, normal unit tests
import { describe, expect, it } from 'vitest';
import { TOOL_FUNCTIONS } from './agent.ts';

describe('tools', () => {
  it('calculates DTI', () => {
    expect(TOOL_FUNCTIONS.calculate_dti({ monthlyDebts: 1200, proposedHousingPayment: 2100, grossMonthlyIncome: 9500 }))
      .toEqual({ dtiPercent: 34.7 });
  });
  it('lists missing documents', () => {
    expect(TOOL_FUNCTIONS.check_documents({ applicationId: 'APP-1001' })).toEqual({ missingDocuments: ['bank_statements'] });
  });
  it('returns errors as data', () => {
    expect(TOOL_FUNCTIONS.get_application({ applicationId: 'APP-9' })).toEqual({ error: 'No application found with id APP-9' });
  });
});
```

```typescript
// loop.test.ts — 2. THE LOOP: a fake model with scripted replies (no network, no cost)
import { afterEach, expect, it, vi } from 'vitest';
import { client, runAgent } from './agent.ts';

function reply(message: object) {
  return { choices: [{ message: { role: 'assistant', content: null, ...message } }] } as any;
}
const toolCall = (name: string, args: object) => ({
  tool_calls: [{ id: 'call_1', type: 'function', function: { name, arguments: JSON.stringify(args) } }],
});

afterEach(() => vi.restoreAllMocks());

it('runs the requested tool and sends the result back', async () => {
  const create = vi.spyOn(client.chat.completions, 'create')
    .mockResolvedValueOnce(reply(toolCall('check_documents', { applicationId: 'APP-1001' })))
    .mockResolvedValueOnce(reply({ content: 'NOT READY' }));

  expect(await runAgent('Is APP-1001 ready?')).toBe('NOT READY');

  const secondCallMessages = (create.mock.calls[1][0] as any).messages;
  expect(secondCallMessages.at(-1)).toEqual({
    role: 'tool',
    tool_call_id: 'call_1',
    content: JSON.stringify({ missingDocuments: ['bank_statements'] }),
  });
});

it('stops at the step limit', async () => {
  vi.spyOn(client.chat.completions, 'create')
    .mockResolvedValue(reply(toolCall('check_documents', { applicationId: 'APP-1001' })));
  expect(await runAgent('loop forever', 3)).toMatch(/step limit/);
});
```

```typescript
// server.test.ts — the API, with runAgent replaced by a fake
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Replace ONLY runAgent: API tests should be fast and give the same result every run.
// The real model is tested separately, in evals (layer 3).
vi.mock('./agent.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./agent.ts')>()),
  runAgent: vi.fn(async () => 'NOT READY\n- DTI is 67.1%'),
}));

const { app } = await import('./server.ts');

describe('POST /reviews', () => {
  it('rejects a missing applicationId with 422', async () => {
    const res = await request(app).post('/reviews').send({});
    expect(res.status).toBe(422);
  });

  it('returns 404 for an unknown application', async () => {
    const res = await request(app).post('/reviews').send({ applicationId: 'NOPE' });
    expect(res.status).toBe(404);
  });

  it('returns the agent review for a real application', async () => {
    const res = await request(app).post('/reviews').send({ applicationId: 'APP-1002' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ applicationId: 'APP-1002', review: 'NOT READY\n- DTI is 67.1%' });
  });
});
```

```text
RESULT:  Test Files 3 passed · Tests 8 passed

‼️ WHY MOCK THE MODEL IN TESTS — a real lesson from writing these
   The first version of server.test.ts called the REAL model and checked that the review
   contained "NOT READY". It failed once and passed on the very next run, with no code
   change. Real-model checks belong in EVALS (layer 3), where you expect variation and
   track a pass rate, not in the unit tests that gate every pull request.‼️

  3. BEHAVIOUR — "evals": scenarios with known right answers, run against the real model.
       APP-1001 → NOT_READY, missing ["bank_statements"]
       APP-1002 → NOT_READY, DTI 67.1
       APP-1003 (all docs, DTI 30) → READY
     Run each a few times and track the PASS RATE. When you change the prompt, model or
     tools, re-run and compare. ‼️ This is how you know a "prompt improvement" actually
     improved anything.‼️

  Also check the PATH, not only the answer: did it call calculate_dti, or guess the number?
```

---

## 13. Agents in a Regulated Business (Mortgages)

```text
Lending is heavily regulated (fair lending laws, privacy of financial data, audit
requirements). Interviewers for these jobs will check that you know it.

‼️ RULES OF THUMB
  1. THE AGENT PREPARES, A HUMAN DECIDES. Approve / deny / pricing decisions stay with
     licensed humans and rules-based systems. Agents gather, check, summarise, draft.
  2. LOG EVERYTHING. Every tool call, argument, result and final answer, with the
     application id and a timestamp. If a regulator asks "why?", you need the trail.
  3. RULES IN CODE, NOT PROMPTS. The 43% DTI limit lives in code, where it's testable
     and auditable, not only in prompt text. (Section 8 shows why: the model wrote
     "above the limit" for 34.7%.)
  4. PROTECT PII. SSNs, bank statements and income are sensitive. Send the model only
     the fields it needs, and check where the provider stores and logs data. Self-hosted
     models (Ollama/vLLM) are one answer.
  5. NO PROTECTED CHARACTERISTICS. Never give the model race, religion, marital status
     and similar as inputs to anything decision-related. Fair-lending law forbids using
     them.‼️

WHERE AGENTS ACTUALLY SAVE LENDERS TIME
  - Document intake: classify uploads (pay stub? W-2?), extract fields, flag mismatches
  - Condition clearing: "underwriter asked for X" → check if X has arrived, chase if not
  - Borrower follow-up: draft (not send) emails/SMS for missing items
  - File summaries for underwriters, so they start with the facts in one place
```

---

## 14. Common Beginner Mistakes

```text
‼️ 1. Letting the model do maths or apply business rules.
   Put them in tools/code. The model picks the tool; code gets the number right.

‼️ 2. No step limit.
   One confused model + a loop with no max = runaway cost. Always cap steps.

‼️ 3. Throwing from tools.
   Return { error: '...' } so the model can recover. Wrap JSON.parse and the tool call in
   try/catch too.

‼️ 4. Forgetting to push the assistant message before the tool results,
   or sending the wrong tool_call_id. The API errors, or the model loses track.

‼️ 5. Treating arguments as trusted.
   The model can make up an application id or pass a string where you expected a number.
   Validate inside the tool (zod), exactly like user input.

‼️ 6. Safety rules only in the prompt.
   Prompts are suggestions. Permission checks and approval gates go in code.

‼️ 7. Starting with a multi-agent framework.
   Get one agent with 3 tools working first. Most real problems need one agent.

‼️ 8. Judging by one run — or testing the real model in unit tests.
   Build a small eval set (section 12) and track the pass rate; mock the model in unit tests.

‼️ 9. Model without tool support.
   If the model never calls your tools, check that it supports function calling.

‼️ 10. JS-specific: forgetting `await` (you'd push a Promise into messages), forgetting
   JSON.parse on arguments / JSON.stringify on results, or importing './agent' without
   the .ts extension when running TypeScript directly with Node.
```

---

## 15. Cheat Sheet

```typescript
// ── CLIENT (any OpenAI-compatible provider) ──────────────────────────────────
const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });

// ── ONE TURN ─────────────────────────────────────────────────────────────────
const msg = (await client.chat.completions.create({ model: MODEL, messages, tools: TOOLS })).choices[0].message;
if (!msg.tool_calls?.length) {
  final = msg.content;                                   // done
} else {
  messages.push(msg);                                    // model's request
  for (const call of msg.tool_calls) {
    if (call.type !== 'function') continue;
    const args = JSON.parse(call.function.arguments);    // JSON string → object
    const result = TOOL_FUNCTIONS[call.function.name](args);
    messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
  }
}

// ── STRUCTURED OUTPUT ────────────────────────────────────────────────────────
const parsed = (await client.chat.completions.parse({ model: MODEL, messages: m,
  response_format: zodResponseFormat(MySchema, 'name') })).choices[0].message.parsed;

// ── FRAMEWORK (OpenAI Agents SDK) ────────────────────────────────────────────
const myTool = tool({ name: '...', description: 'What + when', parameters: z.object({...}), execute: async (args) => ... });
const agent = new Agent({ name: '...', instructions: '...', tools: [myTool], model });
(await run(agent, 'task', { maxTurns: 10 })).finalOutput;
```

```text
RULES
  1. Tools = plain functions + a good description
  2. Maths, rules, permissions → code. Decisions about what to do next → model
  3. Always: max steps, errors as data, validate arguments
  4. Risky actions → human approval, enforced in code (and idempotent)
  5. Structured output for anything a program will read — but compute decisions in code
  6. Mock the model in unit tests; evals for real-model behaviour; logs so you can explain it
```

---

## 16. Your Hands-On Project Roadmap

```text
Build these in order in your project folder. Each milestone is small and works on its own.

  M1  Hello model       Ollama running; one chat call from Node prints a reply.
  M2  One tool          calculate_dti only; watch the model call it (section 5).
  M3  The loop          Full agent.ts from section 6. Add APP-1003 that should be READY.
  M4  Errors & limits   Ask about "APP-9999". Does it recover? Set maxSteps = 2 and see
                        it stop. Add zod validation to one tool (section 7).
  M5  Structured        Final IntakeDecision via .parse() — then compute status in code
                        (section 8).
  M6  Approval          send_document_request behind a y/N check, plus a "don't send the
                        same request twice" guard (section 9).
  M7  Tests & evals     The three Vitest files from section 12, then a script that runs
                        5–10 scenarios against the real model and prints the pass rate.
  M8  Framework         Port it to @openai/agents (section 10).
  M9  API               Express POST /reviews (section 11).
  M10 UI                A small React page: pick an application → run review → show the
                        status, missing docs, and an Approve button for pending emails.

THEN — LEARN PYTHON WITH THE SAME PROJECT
  Rebuild M3–M9 from AI-AGENTS-MORTGAGE-EXAMPLE.md (Python + FastAPI). You already know
  WHAT every line does, so you only have to learn HOW Python says it. Section 18 is the
  translation table.

STRETCH IDEAS (great interview stories)
  - Document classification: pass a PDF's text in and let a tool label it pay_stub / w2 / other
  - An audit log table: every tool call saved with application id + timestamp
  - Swap Ollama for a hosted free tier with only env-var changes, and compare quality/speed
  - Stream the agent's steps to the React UI as they happen (SSE)
```

---

## 17. Interview Answer

```text
Q: "Have you built AI agents? How do they work?"

"An agent is an LLM in a loop with tools. You give it a goal, a system prompt and a set
 of functions described with JSON schemas. The model replies with tool calls instead of
 text; my code runs them, appends the results and calls the model again, until it gives
 a final answer or hits a step limit.

 I built a loan-intake agent to learn it: it looks up an application, calculates DTI with a
 tool rather than in the model, checks for missing documents and returns a structured
 READY / NOT READY decision. I wrote the loop from scratch in TypeScript first, then ported
 it to the OpenAI Agents SDK, served it with Express, and then rebuilt it in Python with
 FastAPI.

 The lessons that mattered: business rules and maths live in code, not the prompt — I saw
 the model call 34.7% "above the 43% limit" in a free-text field; tools return errors as
 data so the model can recover; risky actions like emailing a borrower go through a
 human-approval gate in code and are idempotent, because the model once tried to send the
 same email twice; and I mock the model in unit tests but run an eval set against the real
 model to check that a prompt or model change actually helps. In lending specifically, the
 agent prepares the work and a human makes the credit decision, with every step logged."
```

---

## 18. JavaScript ↔ Python — Rebuilding It in Python

When you move to [AI-AGENTS-MORTGAGE-EXAMPLE.md](AI-AGENTS-MORTGAGE-EXAMPLE.md):

```text
  THIS VERSION (TypeScript + Express)             PYTHON VERSION (Python + FastAPI)
  ──────────────────────────────────────────────  ──────────────────────────────────────────
  npm install openai zod express                  uv add openai pydantic "fastapi[standard]"
  node agent.ts / node server.ts                  uv run agent.py / uv run fastapi dev main.py
  type Application = { … }                        a dict (or a dataclass / Pydantic model)
  APPLICATIONS['APP-1001']                        APPLICATIONS["APP-1001"]
  APPLICATIONS[id] ?? { error }                   APPLICATIONS.get(id) or {"error": …}
  docs.filter(d => !received.includes(d))         [d for d in docs if d not in received]
  Math.round(x * 1000) / 10                       round(x * 100, 1)
  camelCase args (applicationId)                  snake_case args (application_id)
  fn(args)                                        func(**args)
  JSON.parse / JSON.stringify                     json.loads / json.dumps
  `template ${x}`                                 f"template {x}"
  z.object({ … }) + zodResponseFormat()           class X(BaseModel) + response_format=X
  readline.question()                             input()
  tool({ parameters: z.object(…), execute })      @function_tool + type hints + docstring
  run(agent, task, { maxTurns: 10 })              Runner.run_sync(agent, task, max_turns=10)
  Express + zod safeParse → res.status(422)       FastAPI validates automatically → 422
  export const app + import.meta.main             app object + `fastapi dev`
  Vitest + supertest + vi.spyOn                   pytest + TestClient + monkeypatch / mocks

‼️ Everything the MODEL sees is the same in both: the system prompt, the tool schemas,
   the messages array, tool_call_id. That's why the agent behaves the same way —
   the language only changes the code around the model.‼️
```

---

## Related Files

- [AI-AGENTS-DELIVERY-QUOTE-JS.md](AI-AGENTS-DELIVERY-QUOTE-JS.md) — a second, harder project: a multi-turn delivery quote chat with real map and weather APIs
- [AI-AGENTS-MORTGAGE-EXAMPLE.md](AI-AGENTS-MORTGAGE-EXAMPLE.md) — the same project in Python + FastAPI
- [AI-AGENTS-BASICS-JS.md](AI-AGENTS-BASICS-JS.md) — the general guide in JavaScript
- [AI-AGENTS-BASICS.md](AI-AGENTS-BASICS.md) — the general guide in Python
- [EXPRESS-DEEP.md](EXPRESS-DEEP.md) — Express in depth
- [FASTAPI-BASICS.md](FASTAPI-BASICS.md) — FastAPI for Express developers, for when you switch
- [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) — Vitest basics behind section 12
- [AI-ENGINEERING-AGENTS-DEEP.md](AI-ENGINEERING-AGENTS-DEEP.md) — the next level: frameworks, multi-agent, RAG, guardrails
- [AI-SYSTEM-DESIGN-DEEP.md](AI-SYSTEM-DESIGN-DEEP.md) — Q5 "AI document processing pipeline" is very close to mortgage work
