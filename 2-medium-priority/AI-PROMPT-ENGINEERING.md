# Prompt and Context Engineering — What Actually Moves the Needle

**Priority: MEDIUM**

> How to write prompts and assemble context that work, and how to know they work. It covers the
> anatomy of a good system prompt, the classic techniques (definitions, examples, step-by-step
> reasoning, output formats, instruction placement), and "context engineering": deciding what
> goes into the model's window at all.
>
> Instead of repeating folklore, each technique was MEASURED on a labelled set against a local
> `qwen2.5:7b` via Ollama (November 2026). Two helped, one hurt a little, and two made no
> difference. All of those results are below, because "it depends — measure" is the most
> important prompt-engineering skill.

---

## Table of Contents

- [Prompt and Context Engineering — What Actually Moves the Needle](#prompt-and-context-engineering--what-actually-moves-the-needle)
  - [Table of Contents](#table-of-contents)
  - [1. Prompt Engineering vs Context Engineering](#1-prompt-engineering-vs-context-engineering)
  - [2. Anatomy of a Good System Prompt](#2-anatomy-of-a-good-system-prompt)
  - [3. Experiment — Definitions and Examples](#3-experiment--definitions-and-examples)
  - [4. Experiment — Step-by-Step Reasoning vs Code](#4-experiment--step-by-step-reasoning-vs-code)
  - [5. Experiment — Where Instructions Go in a Long Context](#5-experiment--where-instructions-go-in-a-long-context)
  - [6. Experiment — JSON in the Prompt vs Structured Output](#6-experiment--json-in-the-prompt-vs-structured-output)
  - [7. The Technique Catalogue](#7-the-technique-catalogue)
  - [8. Context Engineering](#8-context-engineering)
  - [9. Prompts Are Code](#9-prompts-are-code)
  - [10. Common Mistakes](#10-common-mistakes)
  - [11. Cheat Sheet](#11-cheat-sheet)
  - [12. Interview Answer](#12-interview-answer)
  - [Related Files](#related-files)

---

## 1. Prompt Engineering vs Context Engineering

```text
PROMPT ENGINEERING   writing the instructions: role, task, rules, format, examples.
CONTEXT ENGINEERING  deciding EVERYTHING the model sees on each call: the system prompt, tool
                     definitions, retrieved documents, memory, conversation history, tool
                     results, current state — what's in, what's out, in what order, how big.

‼️ For a single call, the prompt matters most. For agents and RAG, the CONTEXT matters more:
   most failures in the other guides came from what was (or wasn't) in the window — a missing
   document wording (AI-RAG-BASICS.md §10), a truncated prompt (AI-LLM-API-BASICS.md §3), a
   poisoned document (AI-SECURITY-DEEP.md §4) — not from clumsy wording.‼️
```

---

## 2. Anatomy of a Good System Prompt

```text
A real one, from AI-AGENTS-DELIVERY-QUOTE-JS.md, labelled:

  ROLE + GOAL        You are a friendly delivery quote assistant for a same-day delivery company.
  HARD CONTEXT       Always reply in English. Today is Wednesday 2026-11-11.
  WHAT'S NEEDED      To quote you need, FROM THE CUSTOMER: pickup address, drop-off address,
                     delivery date, and for each item its size in inches … weight in pounds …
  WHAT TO DO IF      If anything is missing, ask for ALL missing details in one short message.
  NOT                Never make up addresses, sizes or weights. If get_quote says details were
                     not given by the customer, ask the customer for them.
  OUTPUT             After get_quote, reply with the total, the quoteId, the vehicle and the
                     "basedOn" details so the customer can check them.
  BOUNDARY           Never state a price yourself.

THE CHECKLIST
  ✓ Who the model is and what success looks like — one or two sentences
  ✓ Facts it can't know: today's date, the user's name/plan, the product's rules
  ✓ Exactly what to do in the COMMON case and in the UNCLEAR case ("ask", "say I don't know")
  ✓ The output shape (or a schema — §6)
  ✓ Plain, direct language. Explain WHY a rule exists when it's not obvious — models follow
    reasons better than bare commands
  ✗ No secrets or permission logic (AI-SECURITY-DEEP.md §3 — prompts leak)
  ✗ No rules that MUST hold — those go in code (the same prompt said "never make up addresses"
    and the model did anyway; a code check stopped it)
```

---

## 3. Experiment — Definitions and Examples

```typescript
// fewshot.ts — zero-shot vs definitions vs few-shot, on a labelled routing set
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });

const LABELLED: [string, 'billing' | 'technical' | 'delivery' | 'other'][] = [
  ['I was charged twice this month', 'billing'],
  ['Can I get a refund for the late delivery fee?', 'billing'],
  ['My promo code did not apply at checkout', 'billing'],
  ['The app crashes when I upload a photo', 'technical'],
  ["I can't log in, it says invalid token", 'technical'],
  ['The map in the app is blank', 'technical'],
  ['Where is my driver right now?', 'delivery'],
  ['The sofa arrived with a torn cushion', 'delivery'],
  ['Can you pick up 30 minutes later than planned?', 'delivery'],
  ['My package was left at the wrong door', 'delivery'],
  ['Do you have an office in Berlin?', 'other'],
  ['Are you hiring drivers?', 'other'],
  ['I want to change the email on my invoice', 'billing'],
  ['The tracking page never loads', 'technical'],
  ['The driver was very rude to me', 'delivery'],
  ['What are your opening hours?', 'other'],
];

const PROMPTS = {
  'zero-shot': 'Classify the customer message as billing, technical, delivery or other. Reply with the category only.',
  'with definitions': `Classify the customer message. Reply with the category only.
billing = charges, refunds, promo codes, invoices, payment details
technical = app or website problems: crashes, login, pages not loading
delivery = anything about a specific delivery: where it is, damage, timing changes, the driver
other = everything else (company info, jobs, general questions)`,
  'definitions + 4 examples': `Classify the customer message. Reply with the category only.
billing = charges, refunds, promo codes, invoices, payment details
technical = app or website problems: crashes, login, pages not loading
delivery = anything about a specific delivery: where it is, damage, timing changes, the driver
other = everything else (company info, jobs, general questions)

Examples:
"Why was I charged a $15 fee?" → billing
"The Book button does nothing" → technical
"My boxes arrived wet" → delivery
"Do you deliver on holidays?" → other`,
};

for (const [name, system] of Object.entries(PROMPTS)) {
  let correct = 0; const wrong: string[] = [];
  for (const [msg, label] of LABELLED) {
    const r = await client.chat.completions.create({ model: 'qwen2.5:7b', temperature: 0, messages: [
      { role: 'system', content: system }, { role: 'user', content: msg }] });
    const got = (r.choices[0].message.content ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
    if (got === label) correct++; else wrong.push(`"${msg}" → ${got} (want ${label})`);
  }
  console.log(`${name.padEnd(26)} ${correct}/${LABELLED.length}   ${wrong.join(' · ')}`);
}
```

```text
REAL OUTPUT (16 labelled messages, temperature 0)
zero-shot                  13/16   "Can I get a refund for the late delivery fee?" → delivery (want billing) ·
                                   "The tracking page never loads" → delivery (want technical) ·
                                   "The driver was very rude to me" → other (want delivery)
with definitions           15/16   "Can you pick up 30 minutes later than planned?" → other (want delivery)
definitions + 4 examples   14/16   "Can you pick up 30 minutes later…" → other · "The driver was very rude to me" → other

‼️ WHAT IT SAYS
   - DEFINITIONS were the win (13 → 15). Zero-shot guessed at the edges: is a refund for a
     delivery fee "billing" or "delivery"? A one-line definition per category settled it.
   - Adding EXAMPLES on top was slightly WORSE (14). Examples steer by similarity; none of
     these resembled "the driver was rude", and the model got it wrong again. On 16 cases a
     one-point difference is noise (AI-EVALS-DEEP.md §9) — the honest conclusion is
     "examples didn't help here", not "examples hurt".
   - Few-shot shines for FORMAT and STYLE (show the exact output shape) and for unusual
     tasks. Choose examples that cover the confusing cases, vary them, and measure.
```

---

## 4. Experiment — Step-by-Step Reasoning vs Code

```typescript
// cot.ts — does "reason step by step" fix rule-following? And how does code compare?
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });

const POLICY = `Cancelling is free up to 2 hours before the pickup window.
If you cancel less than 2 hours before the pickup window, the fee is $15.
If the driver has already arrived, the fee is 50% of the quoted total.`;

// hours before pickup, driver arrived?, quoted total → correct fee
const CASES: [string, number][] = [
  ['I cancelled 5 hours before pickup. Quote was $80.', 0],
  ['I cancelled 1 hour before pickup. Quote was $80.', 15],
  ['I cancelled 30 minutes before pickup. Quote was $120.', 15],
  ['I cancelled 3 hours before pickup. Quote was $60.', 0],
  ['The driver was already at my door when I cancelled. Quote was $90.', 45],
  ['I cancelled 90 minutes before pickup. Quote was $50.', 15],
  ['I cancelled the day before. Quote was $200.', 0],
  ['The driver had arrived and I cancelled. Quote was $64.', 32],
];

// The deterministic answer: rules in code
function feeInCode(hoursBefore: number | null, driverArrived: boolean, quote: number) {
  if (driverArrived) return quote * 0.5;
  return hoursBefore !== null && hoursBefore < 2 ? 15 : 0;
}

const STYLES = {
  direct: 'Reply with the fee as a number only, e.g. 15 or 0.',
  'step by step': 'First reason step by step: compare the time with the 2-hour rule and check whether the driver arrived. Then on the last line write "FEE: <number>".',
};

for (const [name, instruction] of Object.entries(STYLES)) {
  let correct = 0; const wrong: string[] = [];
  for (const [msg, want] of CASES) {
    const r = await client.chat.completions.create({ model: 'qwen2.5:7b', temperature: 0, messages: [
      { role: 'system', content: `Policy:\n${POLICY}\n\n${instruction}` }, { role: 'user', content: msg }] });
    const text = r.choices[0].message.content ?? '';
    const num = Number((text.match(/FEE:\s*\$?([\d.]+)/i)?.[1] ?? text.match(/\$?([\d.]+)/)?.[1]) ?? NaN);
    if (num === want) correct++; else wrong.push(`"${msg.slice(0, 40)}…" → ${num} (want ${want})`);
  }
  console.log(`${name.padEnd(13)} ${correct}/${CASES.length}   ${wrong.join(' · ')}`);
}
const inCode = [feeInCode(5, false, 80), feeInCode(1, false, 80), feeInCode(0.5, false, 120), feeInCode(3, false, 60), feeInCode(null, true, 90), feeInCode(1.5, false, 50), feeInCode(24, false, 200), feeInCode(null, true, 64)];
console.log(`${'rules in code'.padEnd(13)} ${inCode.filter((f, i) => f === CASES[i][1]).length}/${CASES.length}`);
```

```text
REAL OUTPUT (8 cancellation cases, temperature 0)
direct        7/8   "I cancelled 90 minutes before pickup. Qu…" → 0 (want 15)
step by step  8/8
rules in code 8/8

‼️ WHAT IT SAYS
   - Asking for reasoning before the answer fixed the one miss: "90 minutes" vs a 2-HOUR rule
     needs a comparison, and writing it out made the model do it. (This is the same rule the
     RAG assistant got backwards in AI-RAG-BASICS.md §9.)
   - Ask for the reasoning FIRST and the answer LAST ("FEE: 15") — then the answer can depend
     on the reasoning, and code can parse the final line.
   - It costs output tokens and time. Reasoning models do this internally — prompting them
     to "think step by step" adds little.
   - The most reliable column is the last: let the model EXTRACT the facts
     ({ hoursBefore: 1.5, driverArrived: false, quote: 50 } via structured output) and let
     CODE apply the rule. Deterministic, testable, auditable — the theme of every guide here.
```

---

## 5. Experiment — Where Instructions Go in a Long Context

```typescript
// position.ts — where should instructions go when the context is long?
import { readFileSync, readdirSync } from 'node:fs';
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });

// ~2,500 tokens of real documents (the help-center docs, three times over)
const docs = readdirSync('../rag/docs').map((f) => readFileSync(`../rag/docs/${f}`, 'utf8')).join('\n\n');
const LONG = [docs, docs, docs].join('\n\n');
const RULE = 'Answer in exactly one sentence, then end your reply with the code word ZEBRA-7.';
const QUESTION = 'What is the late cancellation fee?';

const LAYOUTS = {
  'rule at the TOP only': [{ role: 'system', content: `${RULE}\n\nDocuments:\n${LONG}` }, { role: 'user', content: QUESTION }],
  'rule at the END only': [{ role: 'system', content: `Documents:\n${LONG}` }, { role: 'user', content: `${QUESTION}\n\n${RULE}` }],
  'rule at BOTH ends': [{ role: 'system', content: `${RULE}\n\nDocuments:\n${LONG}` }, { role: 'user', content: `${QUESTION}\n\nReminder: ${RULE}` }],
} as const;

for (const [name, messages] of Object.entries(LAYOUTS)) {
  let followed = 0, tokens = 0;
  for (let run = 0; run < 5; run++) {
    const r = await client.chat.completions.create({ model: 'qwen2.5:7b', temperature: 0.7, messages: messages as any });
    tokens = r.usage!.prompt_tokens;
    if ((r.choices[0].message.content ?? '').trim().endsWith('ZEBRA-7') || /ZEBRA-7\.?$/.test((r.choices[0].message.content ?? '').trim())) followed++;
  }
  console.log(`${name.padEnd(22)} followed ${followed}/5   (prompt ${tokens} tokens)`);
}
```

```text
REAL OUTPUT
~3,000 tokens of documents:
  rule at the TOP only   followed 5/5   (prompt 2994 tokens)
  rule at the END only   followed 5/5   (prompt 2994 tokens)
  rule at BOTH ends      followed 5/5   (prompt 3016 tokens)
~11,000 tokens (same test, Ollama native API with num_ctx 16384 — position-long.ts):
  rule at the TOP only   followed 5/5   (prompt 10866 tokens)
  rule at the END only   followed 5/5   (prompt 10866 tokens)
  rule at BOTH ends      followed 5/5   (prompt 10888 tokens)

‼️ A NULL RESULT — and a useful one
   The common advice "put instructions at the end of long contexts" (or "repeat them") made
   no difference here, even at 11k tokens, for a simple formatting rule. It may matter for much
   longer contexts, harder instructions or other models — models do lose details in the middle
   of very long inputs. The lesson isn't "position never matters"; it's that advice from
   blog posts is a HYPOTHESIS. Test it on your model and task before adding complexity.
   (Separately: put the user's question near the END of a long prompt — and keep stable
   content first for prompt caching, AI-LLM-API-BASICS.md §10.)
```

---

## 6. Experiment — JSON in the Prompt vs Structured Output

```typescript
// format.ts — asking for JSON in the prompt vs structured output, measured
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });

const Ticket = z.object({ category: z.enum(['billing', 'technical', 'delivery', 'other']), urgent: z.boolean(), summary: z.string() });
const MESSAGES = ['I was charged twice this month!!', 'The app crashes when I upload a photo', 'Where is my driver right now? I need it in 10 minutes',
  'Do you have an office in Berlin?', 'My sofa arrived torn, I am furious', 'Can I change my invoice email?', 'Login says invalid token', 'Are you hiring?'];

let promptOnlyOk = 0, structuredOk = 0;
const samples: string[] = [];
for (const msg of MESSAGES) {
  const a = await client.chat.completions.create({ model: 'qwen2.5:7b', temperature: 0.7, messages: [
    { role: 'system', content: 'Return ONLY a JSON object: {"category": "billing"|"technical"|"delivery"|"other", "urgent": true|false, "summary": string}. No other text.' },
    { role: 'user', content: msg }] });
  const text = a.choices[0].message.content ?? '';
  try { Ticket.parse(JSON.parse(text)); promptOnlyOk++; } catch { samples.push(text.slice(0, 80).replace(/\n/g, '⏎')); }

  const b = await client.chat.completions.parse({ model: 'qwen2.5:7b', temperature: 0.7,
    messages: [{ role: 'system', content: 'Classify the support ticket.' }, { role: 'user', content: msg }],
    response_format: zodResponseFormat(Ticket, 'ticket') });
  if (b.choices[0].message.parsed) structuredOk++;
}
console.log(`JSON asked for in the prompt: ${promptOnlyOk}/${MESSAGES.length} valid   failures: ${samples.join(' | ')}`);
console.log(`structured output (schema):   ${structuredOk}/${MESSAGES.length} valid`);
```

```text
REAL OUTPUT (8 tickets, temperature 0.7)
JSON asked for in the prompt: 8/8 valid
structured output (schema):   8/8 valid

‼️ ANOTHER NULL RESULT — and why you'd still use the schema
   This model followed "return ONLY JSON" every time in 8 tries. But 8/8 can't distinguish
   "always" from "fails 1 in 20" — and in production 1 in 20 is thousands of broken requests.
   Structured output CONSTRAINS generation to the schema and validates the result, so the
   failure mode disappears instead of becoming rare. Use it whenever code reads the output; use
   prompt-only formats for text a human reads.
```

---

## 7. The Technique Catalogue

```text
TECHNIQUE              WHAT IT IS                                    WHEN IT HELPS (here / generally)
───────────────────    ────────────────────────────────────────────  ────────────────────────────────────
Definitions / rubric   define every category, term, threshold        ✓ classification 13→15/16
Few-shot examples      show input → output pairs                     ~ no gain here; great for format/style
Reasoning first        "reason step by step, then FEE: <n>"          ✓ rule application 7→8/8
Decomposition          split into steps (extract → decide → write),  ✓ the delivery and LangGraph designs;
                       some done by code                             each step is easier and testable
Escape hatch           "if unsure / not in sources, say I don't      ✓ RAG refusals (AI-RAG-BASICS.md)
                       know" / "ask the customer"
Delimiters / tags      <documents>…</documents>, ### sections        clarity for the model and for you —
                                                                     NOT a security boundary (5/5 injected)
Output schema          structured output                             ✓ guarantees shape (§6)
Role                   "You are a support engineer"                  sets tone/defaults; small effect
Self-check             a second call: "does this answer only use     catches some hallucinations; costs a
                       facts from the sources?"                      call — measure it
Prefill                start the assistant's reply for it (some      forces a format; provider-specific
                       APIs allow this)
Temperature 0          for tasks with a right answer                 consistency (AI-LLM-API-BASICS.md §4)

‼️ The ones that reliably helped all REMOVE ambiguity (definitions, decomposition, escape
   hatches, schemas). The ones that are folklore (magic phrases, "you are a world-class…",
   tipping the model, threats) don't show up in measurements worth trusting.
```

---

## 8. Context Engineering

```text
WHAT CAN BE IN THE WINDOW
  system prompt · tool definitions · retrieved documents · long-term memory · conversation
  history · tool results · current task state (plans, todo lists) · the user's message

THE PRINCIPLES
  1. RELEVANT ONLY — every token competes for attention. Retrieve 3–5 good chunks, not 20;
     return the fields a tool needs, not a 5,000-line JSON dump (AI-AGENTS-BASICS-JS.md §7).
  2. BUDGET IT — know the window and what each part costs (tokens aren't characters —
     AI-LLM-API-BASICS.md §2). Reserve room for the answer.
  3. ORDER IT — stable parts first (system prompt, tools, reference docs) for prompt caching;
     the changing part (latest question) last.
  4. COMPACT HISTORY — keep recent turns verbatim, summarise older ones, drop stale tool
     results. Long agent runs need this or they slow down, cost more and lose the plot.
  5. STATE OUTSIDE THE WINDOW — keep the authoritative state (quotes, bookings, the plan) in
     code/a database and give the model a short summary, as the delivery agent did with
     quoteIds. The model reads a view; it doesn't own the data.
  6. RETRIEVE JUST IN TIME — let the agent fetch what it needs with tools (search, read file)
     instead of pre-loading everything.
  7. ISOLATE — give sub-tasks to sub-agents with their own small context and get back a short
     result (AI-ENGINEERING-AGENTS-DEEP.md §6). Keep untrusted content away from privileged
     tools (AI-SECURITY-DEEP.md §5).

‼️ MOST "THE MODEL GOT DUMB" BUGS ARE CONTEXT BUGS: the right fact wasn't in the window, was
   buried under irrelevant text, was silently truncated, or was contradicted by stale history.
   Log the exact context of failing calls and read it — that's where the answer usually is.
```

---

## 9. Prompts Are Code

```text
  VERSION CONTROL   prompts live in the repo (or a prompt registry), reviewed in PRs like code
  TEMPLATES         build prompts from parts in code (role + rules + definitions + examples),
                    not by copy-pasting strings around the codebase
  EVALS             every prompt change runs the eval set; compare case by case (AI-EVALS-DEEP.md)
  NO OVERFITTING    never add test-specific hints ("a dog is a live animal") to pass a test —
                    AI-RAG-BASICS.md §10 shows that fix vanishing without the hint
  PIN THE MODEL     a prompt is tuned to a model version; re-run evals when the model changes
  LOG               store prompt version + model + inputs + outputs for every call you'll need
                    to debug (with PII limits)
```

---

## 10. Common Mistakes

```text
‼️ 1. Folklore over measurement. Two popular tips made zero difference here; definitions did.
‼️ 2. Vague categories and rules. Most classification errors were boundary cases a one-line
      definition fixed.
‼️ 3. Asking the model to apply rules code could apply. 7/8 vs 8/8 — and code is 8/8 forever.
‼️ 4. Answer first, reasoning after — the reasoning can't influence the answer.
‼️ 5. Parsing prompt-only JSON in production. 8/8 in testing ≠ always.
‼️ 6. Stuffing the context. More documents, more history, more tools = more noise and cost.
‼️ 7. Test-specific hints that make evals pass and production fail.
   8. Secrets and must-hold rules in the prompt.
   9. Changing prompt AND model AND retrieval at once — you can't tell what helped.
```

---

## 11. Cheat Sheet

```text
SYSTEM PROMPT   role + goal · facts it can't know (date, user, rules) · what to do normally ·
                what to do when unsure (ask / "I don't know") · output shape · boundaries
CLASSIFY        define every category in one line; add examples for the confusing cases; measure
RULES           extract facts with a schema → apply the rule in code
                (or: reasoning first, "ANSWER: x" last, parse the last line)
FORMAT          code reads it → structured output; a human reads it → describe or show the format
LONG CONTEXT    stable first (caching), question last, only relevant chunks, test placement claims
CONTEXT         relevant · budgeted · ordered · compacted · state outside the window · just-in-time
PROCESS         prompts in git · evals on every change · one change at a time · no test-specific hints
```

---

## 12. Interview Answer

```text
Q: "How do you approach prompt engineering?"

"As an engineering loop, not word-smithing: write a clear system prompt — role, the facts it
 can't know, what to do normally and when unsure, the output format — build a small labelled
 set, and measure every change.

 When I measured common techniques on a ticket-routing task, one-line category definitions
 took accuracy from 13 to 15 out of 16; adding few-shot examples on top didn't help. For a
 policy rule, asking for reasoning before the answer fixed the one case it missed — but
 extracting the facts and applying the rule in code was right every time, so that's what I'd
 ship. Two popular tips — instruction placement in long contexts and prompt-only JSON — made no
 difference in my tests, so I treat blog advice as a hypothesis.

 And for agents I think of it as context engineering: what's in the window matters more than
 the wording — only relevant retrieved chunks, compact tool results, summarised history,
 authoritative state kept in code — because most 'the model got worse' bugs turn out to be the
 right fact missing, buried or truncated."
```

---

## Related Files

- [AI-EVALS-DEEP.md](../1-high-priority/AI-EVALS-DEEP.md) — how to measure prompt changes properly
- [AI-LLM-API-BASICS.md](../1-high-priority/AI-LLM-API-BASICS.md) — tokens, context windows, temperature, caching
- [AI-RAG-BASICS.md](../1-high-priority/AI-RAG-BASICS.md) — context from retrieval, and the overfitting trap
- [AI-AGENTS-BASICS-JS.md](../1-high-priority/AI-AGENTS-BASICS-JS.md) — tool descriptions are prompts too (§7)
- [AI-SECURITY-DEEP.md](AI-SECURITY-DEEP.md) — why delimiters and "ignore instructions in documents" aren't security
- [AI-AGENT-MEMORY-DEEP.md](../1-high-priority/AI-AGENT-MEMORY-DEEP.md) — managing history and memory in context
