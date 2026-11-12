# LLM Evals — Measuring AI Quality, In Depth

**Priority: HIGH**

> How to know whether your AI feature works and whether a change made it better or worse: building
> eval datasets, code graders, LLM-as-judge (and checking the judge), component vs end-to-end
> evals, regression gates in CI, the statistics that keep you honest, and production monitoring.
>
> The system under test is the RAG help-center assistant from [AI-RAG-BASICS.md](AI-RAG-BASICS.md).
> Everything was run locally against `qwen2.5:7b` via Ollama (November 2026), and the "real output"
> blocks are what it printed. Three of the results contradicted what I expected. They're the reason
> this guide exists.

---

## Table of Contents

- [LLM Evals — Measuring AI Quality, In Depth](#llm-evals--measuring-ai-quality-in-depth)
  - [Table of Contents](#table-of-contents)
  - [1. Why Evals](#1-why-evals)
  - [2. The Kinds of Evals](#2-the-kinds-of-evals)
  - [3. Building the Dataset](#3-building-the-dataset)
  - [4. The Harness](#4-the-harness)
  - [5. Comparing Two Variants — Real Results](#5-comparing-two-variants--real-results)
  - [6. LLM-as-Judge — and Checking the Judge](#6-llm-as-judge--and-checking-the-judge)
  - [7. Component Evals — Testing the Parts](#7-component-evals--testing-the-parts)
  - [8. A Regression Gate in CI — and How It Fooled Me](#8-a-regression-gate-in-ci--and-how-it-fooled-me)
  - [9. Statistics That Keep You Honest](#9-statistics-that-keep-you-honest)
  - [10. Evaluating Agents](#10-evaluating-agents)
  - [11. Tools](#11-tools)
  - [12. Online Evals — In Production](#12-online-evals--in-production)
  - [13. Common Mistakes](#13-common-mistakes)
  - [14. Cheat Sheet](#14-cheat-sheet)
  - [15. Interview Answer](#15-interview-answer)
  - [Related Files](#related-files)

---

## 1. Why Evals

```text
Normal code: same input → same output → a unit test proves it.
LLM features: the output is text, it varies, and "correct" is fuzzy. Worse, changes that
look like improvements often aren't:

  - A prompt tweak fixes the bug you were looking at and breaks two you weren't.
  - A new model is "smarter" overall and worse at YOUR task.
  - A refactor of the retrieval code silently halves search quality.

‼️ AN EVAL IN ONE SENTENCE
   A fixed set of inputs, a way to grade each output, and a number — so every change to a
   prompt, model, tool or pipeline is judged by the same yardstick instead of by vibes.‼️

The real story from this guide: query rewriting looked like a clear fix on 4 hand-picked
questions (AI-RAG-BASICS.md §10). On 10 questions it fixed one case, broke another, and the
first score said it was WORSE — until the grader itself turned out to be wrong too.
```

---

## 2. The Kinds of Evals

```text
BY WHAT YOU GRADE
  Code graders      exact match, "contains $15", regex, JSON schema valid, refused when it
                    should, called the right tool. Fast, free, deterministic. USE FIRST.
  LLM-as-judge      a model grades against a rubric: "says propane is not accepted". For
                    fuzzy qualities code can't check. Must itself be validated (section 6).
  Human review      the ground truth, slow and expensive. Use to label datasets, check
                    judges, and review samples from production.
  Pairwise          "which of these two answers is better?" — easier for humans and judges
                    than absolute scores; good for comparing prompts or models.

BY WHAT YOU TEST
  Component         one part: retrieval (hit@k), routing (right category), tool choice
                    (right tool + args), extraction (right fields).
  End-to-end        the whole pipeline: question in, final answer graded.
  ‼️ You need BOTH. Section 8 shows an end-to-end eval missing a big component regression.

BY WHEN
  Offline           before shipping: a fixed dataset, in development and CI.
  Online            after shipping: real traffic, sampled and graded, plus user feedback.
```

---

## 3. Building the Dataset

```text
WHERE CASES COME FROM (best first)
  1. Real user questions from logs (anonymised) — the only source of how people actually ask
  2. Every bug you've seen — each failure becomes a permanent case (regression tests)
  3. Edge cases: the answer isn't in the docs (must refuse), ambiguous questions,
     very long input, other languages
  4. Adversarial: "ignore your instructions…", requests for things it must not do
  5. Synthetic: an LLM drafts questions from your documents — review them by hand

WHAT EACH CASE NEEDS
  input + a CHECKABLE definition of success: required facts, must-refuse flag, expected
  tool call, or a rubric for the judge. "A good answer" is not checkable.

HOW MANY
  Start with 20–50 good cases — enough to catch big regressions (section 9 explains why 10 is
  too few). Grow it with every real failure. Keep a held-out set you DON'T tune prompts on,
  or you'll overfit your prompt to your test set.
```

---

## 4. The Harness

```typescript
// evals.ts — an eval harness: dataset → system under test → graders → pass rates
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { answer, client, CHAT_MODEL, openDb } from './rag.ts';

// ── 1. THE DATASET — inputs + what a correct output must satisfy ──────────────
type Case = {
  id: string;
  question: string;
  mustInclude?: string[];      // facts that must appear (code-checked)
  mustRefuse?: boolean;        // the answer is NOT in the docs → must say "I don't know"
  rubric?: string;             // for the LLM judge: what a good answer does
};

export const CASES: Case[] = [
  { id: 'late-cancel', question: 'I cancelled 1 hour before pickup — what will I pay?', mustInclude: ['$15'] },
  { id: 'driver-arrived', question: 'The driver was already at my door when I cancelled. What do I owe?', mustInclude: ['50%'] },
  { id: 'free-cancel', question: 'Is it free to cancel 5 hours before pickup?', rubric: 'PASS if the answer says yes, it is free.' },
  { id: 'insure-art', question: 'How do I insure an expensive painting, and what does it cost?', mustInclude: ['3%'] },
  { id: 'dog', question: 'Can I bring my dog along in the van?', rubric: 'PASS if the answer clearly says dogs/pets/animals are NOT transported.' },
  { id: 'propane', question: 'Can you carry my propane tank?', rubric: 'PASS if the answer clearly says propane is NOT accepted. Giving a reason is optional.' },
  { id: 'stairs', question: 'I live on the 3rd floor with no elevator. Is there an extra charge?', mustInclude: ['$10'] },
  { id: 'tips', question: 'Does the driver get my whole tip?', rubric: 'PASS if the answer says yes / 100% of tips go to the driver (and helpers).' },
  { id: 'canada', question: 'Do you deliver to Canada?', mustRefuse: true },
  { id: 'crypto', question: 'Can I pay with Bitcoin?', rubric: 'PASS if the answer says no, or lists the accepted methods (cards, Apple Pay, Google Pay) without crypto. FAIL if it says "I don\'t know" or claims crypto is accepted.' },
];

// ── 2. GRADERS ────────────────────────────────────────────────────────────────
const REFUSAL = /i don'?t know/i;

/** Code graders: fast, free, deterministic. Use them for everything they can check. */
export function codeGrade(c: Case, output: string): { pass: boolean; why: string } | null {
  if (c.mustRefuse) return REFUSAL.test(output) ? { pass: true, why: 'refused' } : { pass: false, why: 'answered instead of refusing' };
  if (c.mustInclude) {
    const missing = c.mustInclude.filter((f) => !output.includes(f));
    return missing.length ? { pass: false, why: `missing ${missing.join(', ')}` } : { pass: true, why: 'all facts present' };
  }
  return null; // nothing code can check → needs the judge
}

/** LLM-as-judge: for answers code can't check. Returns a verdict AND a reason. */
const Verdict = z.object({ reason: z.string(), pass: z.boolean() });   // reason FIRST: think, then decide

export async function judge(c: Case, output: string) {
  const res = await client.chat.completions.parse({
    model: CHAT_MODEL,
    temperature: 0,
    messages: [{
      role: 'user',
      content: `You are grading a customer-support answer.
Question: ${c.question}
Requirement for a PASS: ${c.rubric}
Answer to grade:
"""${output}"""
Does the answer meet the requirement? Judge only the requirement, not style or length.`,
    }],
    response_format: zodResponseFormat(Verdict, 'verdict'),
  });
  return res.choices[0].message.parsed ?? { pass: false, reason: 'judge returned nothing' };
}

export async function grade(c: Case, output: string) {
  return codeGrade(c, output) ?? (await judge(c, output).then((v) => ({ pass: v.pass, why: `judge: ${v.reason}` })));
}

// ── 3. THE RUNNER — every case, several times, per variant ────────────────────
type Variant = (question: string) => Promise<string>;

export async function runEval(name: string, system: Variant, runs = 3) {
  const perCase: Record<string, boolean[]> = {};
  const failures: string[] = [];
  for (const c of CASES) {
    perCase[c.id] = [];
    for (let r = 0; r < runs; r++) {
      const output = await system(c.question);
      const { pass, why } = await grade(c, output);
      perCase[c.id].push(pass);
      if (!pass) failures.push(`${c.id}: ${why.slice(0, 90)} ← "${output.replace(/\n/g, ' ').slice(0, 70)}…"`);
    }
  }
  const all = Object.values(perCase).flat();
  const rate = all.filter(Boolean).length / all.length;
  const flaky = Object.entries(perCase).filter(([, rs]) => rs.some(Boolean) && rs.some((x) => !x)).map(([id]) => id);
  console.log(`\n${name}: ${(rate * 100).toFixed(0)}% passed (${all.filter(Boolean).length}/${all.length})   flaky: ${flaky.join(', ') || 'none'}`);
  for (const [id, rs] of Object.entries(perCase)) console.log(`  ${id.padEnd(15)} ${rs.map((p) => (p ? '✓' : '✗')).join(' ')}`);
  return { rate, failures };
}

// ── The two variants we want to compare (from AI-RAG-BASICS.md §10) ──────────
async function rewrite(question: string) {
  const r = await client.chat.completions.create({ model: CHAT_MODEL, temperature: 0, messages: [{ role: 'user',
    content: `Rewrite this customer question as a short, general question in the terms a company policy document would use (categories, rules, time limits). Keep every number. Reply with the rewritten question only.\n\nQuestion: ${question}` }] });
  return (r.choices[0].message.content ?? question).trim();
}

if (import.meta.main) {
  const db = await openDb();
  const baseline: Variant = async (q) => (await answer(db, q)).answer;
  const withRewrite: Variant = async (q) => (await answer(db, `${q}\n(In policy terms: ${await rewrite(q)})`)).answer;

  const a = await runEval('BASELINE', baseline);
  const b = await runEval('WITH QUERY REWRITE', withRewrite);
  console.log('\nBASELINE failures:\n  ' + a.failures.join('\n  '));
  console.log('\nREWRITE failures:\n  ' + b.failures.join('\n  '));
  await db.close();
}
```

```text
THE DESIGN
  CASES          the dataset — mostly code-checkable; a rubric only where code can't decide
  codeGrade()    returns null when it CAN'T check, so the judge only runs where needed
  judge()        structured output { reason, pass } — the reason comes FIRST so the model
                 explains before deciding (and you can read why it failed)
  runEval()      every case × N runs → pass rate, per-case ✓/✗ grid, and "flaky" cases that
                 both passed and failed
  Variant        any function question → answer. Compare prompts, models or pipelines by
                 passing different variants to the same runEval().
```

---

## 5. Comparing Two Variants — Real Results

```text
REAL OUTPUT — baseline vs "query rewriting" (AI-RAG-BASICS.md §10), 10 cases × 3 runs
(This run used the FIRST version of the rubrics; the harness above already has the fixed,
"minimum to pass" rubrics from section 6.)

BASELINE: 80% passed (24/30)   flaky: none          WITH QUERY REWRITE: 70% passed (21/30)
  late-cancel     ✗ ✗ ✗                               late-cancel     ✓ ✓ ✓   ← fixed
  driver-arrived  ✓ ✓ ✓                               driver-arrived  ✓ ✓ ✓
  free-cancel     ✓ ✓ ✓                               free-cancel     ✓ ✓ ✓
  insure-art      ✓ ✓ ✓                               insure-art      ✓ ✓ ✓
  dog             ✓ ✓ ✓                               dog             ✗ ✗ ✗   ← broke
  propane         ✓ ✓ ✓                               propane         ✗ ✗ ✗   ← broke
  stairs          ✓ ✓ ✓                               stairs          ✓ ✓ ✓
  tips            ✓ ✓ ✓                               tips            ✓ ✓ ✓
  canada          ✓ ✓ ✓                               canada          ✓ ✓ ✓
  crypto          ✗ ✗ ✗                               crypto          ✗ ✗ ✗

BASELINE failures:
  late-cancel: missing $15 ← "Since you cancelled more than 2 hours before the pickup window, there …"
  crypto: judge: FAIL ← "I don't know — please contact support.…"

‼️ THREE LESSONS FROM ONE TABLE
   1. The change FIXED the case it was designed for and BROKE another (dog). Looking only at
      the failing example would have shipped a regression.
   2. "flaky: none" and identical ✓/✗ across runs: at temperature 0 this model gives the
      SAME answer every run. Repeating runs added no information (section 9 — the real
      sample size here is 10, not 30). To test robustness, vary the INPUT (paraphrases),
      not the run count.
   3. The "propane" ✗ in the rewrite column was the JUDGE being wrong, not the assistant
      (section 6). Re-graded with the fixed rubric: rewrite 8/10 vs baseline 8/10 — a TIE
      that swaps one failure for another, not the "−10 points" the first table showed.
      ‼️ Always read the failures, not just the score: some of them are grader bugs.
```

---

## 6. LLM-as-Judge — and Checking the Judge

```typescript
// judge-check.ts — before trusting an LLM judge, check it against answers a HUMAN has labelled
import { CASES, judge } from './evals.ts';

const byId = Object.fromEntries(CASES.map((c) => [c.id, c]));

// Hand-written answers with a human verdict — including the tricky kinds judges get wrong
const LABELLED = [
  { id: 'dog', output: 'No, we do not transport live animals, including pets such as dogs and cats. [1]', human: true },
  { id: 'dog', output: 'I don\'t know — please contact support.', human: false },
  { id: 'dog', output: 'Yes! Pets are welcome as long as they are in a carrier. [1]', human: false },          // confident + cited + wrong
  { id: 'propane', output: 'Propane tanks are not accepted because they are flammable. [1]', human: true },
  { id: 'propane', output: 'We carry most household items, including gas canisters, if they are packed well. [2]', human: false },
  { id: 'tips', output: 'Yes — 100% of tips go to the driver and helpers. [1]', human: true },
  { id: 'tips', output: 'Tips are shared between the driver and the company. [1]', human: false },
  { id: 'free-cancel', output: 'Yes, cancelling is free up to 2 hours before the pickup window, so 5 hours before is free. [1]', human: true },
  { id: 'free-cancel', output: 'Cancellations made less than 2 hours before pickup cost $15. [1]', human: false },     // true fact, doesn't answer
  { id: 'crypto', output: 'We accept credit and debit cards, Apple Pay and Google Pay — not cryptocurrency. [1]', human: true },
  { id: 'crypto', output: 'Thank you so much for your question! We really value you as a customer. Payment options are a big topic and we offer many convenient ways to pay, which our support team will be glad to explain in detail.', human: false }, // long, polite, empty
];

let agree = 0;
const disagreements: string[] = [];
for (const l of LABELLED) {
  const verdicts = await Promise.all([0, 1, 2].map(() => judge(byId[l.id], l.output)));  // 3 judge runs
  const majority = verdicts.filter((v) => v.pass).length >= 2;
  if (majority === l.human) agree++;
  else disagreements.push(`${l.id}: human=${l.human} judge=${majority} ("${l.output.slice(0, 60)}…") — ${verdicts[0].reason.slice(0, 100)}`);
}
console.log(`judge agreed with the human on ${agree}/${LABELLED.length}`);
console.log(disagreements.join('\n'));
```

```text
REAL OUTPUT:  judge agreed with the human on 11/11

Looks perfect — but these were HAND-WRITTEN answers, cleaner than real ones. Then I gave it
two real outputs from section 5:

  propane: "No, propane tanks are not accepted [1]. I don't know — please contact support."
           human = PASS  ·  judge = FAIL, FAIL, FAIL
           reason: "The answer does not fully meet the requirement because it does not
                    explicitly state that propane is a hazardous material…"
  crypto:  "I don't know — please contact support."   human = FAIL  ·  judge = FAIL ✓

THE CAUSE WAS THE RUBRIC, NOT THE MODEL
  rubric "Says no: propane is a hazardous material that is not accepted."
         (describes an IDEAL answer)                          → FAIL FAIL FAIL
  rubric "PASS if the answer clearly says propane is NOT accepted. Giving a reason is
         optional."  (states the MINIMUM to pass)             → PASS PASS PASS

‼️ RUBRIC RULES
   - Write the MINIMUM that makes an answer acceptable, not a description of a perfect one.
     Judges read every word of the rubric as a requirement.
   - One criterion per rubric. "Correct AND concise AND friendly" gives muddy verdicts;
     use three judges or drop what you don't need.
   - Say what FAILS, too ("FAIL if it says 'I don't know' or claims crypto is accepted").
   - Validate on REAL outputs, including the messy ones, not just clean examples.

KNOWN JUDGE BIASES (research and practice agree on these)
  Position bias     in pairwise A-vs-B, prefers whichever comes first → run both orders
  Verbosity bias    prefers longer answers → rubric says "length doesn't matter"
  Self-preference   rates its own model family's writing higher → judge with a different family
  Leniency          a weak judge passes confident nonsense → validate against human labels;
                    use a stronger model as judge than the one being judged when you can
  Use binary PASS/FAIL (or a small labelled scale) rather than "rate 1–10" — scores drift.
```

---

## 7. Component Evals — Testing the Parts

```text
End-to-end evals tell you THAT something broke; component evals tell you WHERE.

  RETRIEVAL      labelled question → expected chunk; metrics hit@k, MRR.
                 The full example is AI-RAG-BASICS.md §8 — real result: vector 94% hit@1,
                 keyword 50%, vector + rerank 100%.
  TOOL CHOICE    agent input → expected tool + key arguments (no need to run the tool).
  ROUTING        message → expected category (billing / technical / other).
  EXTRACTION     document → expected fields; compare field by field.
  SAFETY         adversarial inputs → must refuse / must not call action tools.

‼️ Component evals are cheaper (no full pipeline), more precise (one cause per failure) and
   much more sensitive — section 8 shows a regression that only a component eval caught.
```

---

## 8. A Regression Gate in CI — and How It Fooled Me

```typescript
// eval-gate.ts — fail CI when quality drops. Run: node eval-gate.ts  (exit code 1 = blocked)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { runEval } from './evals.ts';
import { answer, openDb } from './rag.ts';

const BASELINE_FILE = 'eval-baseline.json';
const ALLOWED_DROP = 0.05; // tolerate 5 points of noise

const db = await openDb();
const { rate } = await runEval('CURRENT', async (q) => (await answer(db, q)).answer, 1);
await db.close();

if (!existsSync(BASELINE_FILE) || process.argv.includes('--update')) {
  writeFileSync(BASELINE_FILE, JSON.stringify({ rate, at: new Date().toISOString() }));
  console.log(`baseline saved: ${(rate * 100).toFixed(0)}%`);
} else {
  const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')).rate;
  const ok = rate >= baseline - ALLOWED_DROP;
  console.log(`baseline ${(baseline * 100).toFixed(0)}% → now ${(rate * 100).toFixed(0)}%: ${ok ? 'OK' : 'REGRESSION — blocking'}`);
  process.exit(ok ? 0 : 1);
}
```

```text
REAL OUTPUT — first run saves the baseline
  CURRENT: 70% passed (7/10)   …   baseline saved: 70%

THEN A "HARMLESS REFACTOR": retrieval switched from vector + rerank to keyword search.
Component-level, this is a disaster — keyword search found the right chunk first only 50% of
the time vs 94% (AI-RAG-BASICS.md §8). The gate's verdict:

  AFTER THE CHANGE: 70% passed (7/10)
  baseline 70% → now 70%: OK                    exit=0   ← ‼️ the regression SHIPPED

‼️ WHY THE GATE MISSED IT
   These 10 questions happen to contain words that appear in the documents, so keyword search
   found the right passage anyway. The END-TO-END eval was insensitive to a change that would
   hurt real users, who paraphrase ("fourth floor, no lift" vs "stairs").
   Fixes:
     1. Gate on COMPONENT metrics too (retrieval hit@1 would have dropped 94% → 50%).
     2. More and more varied cases — include paraphrases, not just questions written while
        looking at the documents.
     3. Treat the gate as a floor, not proof of quality.

RUNNING EVALS IN CI
  - Fast, deterministic tests (tools, graders, parsing) on every pull request — as usual.
  - The model-based eval on PRs that touch prompts/models/retrieval, or nightly — it's slow
    and costs money with hosted models.
  - Store results per commit so you can see the trend, not just pass/fail.
  - Pin the model version you evaluate ("gpt-…-2026-…", a fixed Ollama tag) — a silently
    updated model invalidates the baseline.
```

---

## 9. Statistics That Keep You Honest

```text
‼️ "80% vs 70%" ON 10 CASES IS NOT A RESULT YOU CAN TRUST BY ITSELF

  95% margin of error for a pass rate ≈ ±2 × √(p(1−p)/n)
    n = 10,  p = 0.8  →  ±25 points     (anything from ~55% to ~100%)
    n = 100, p = 0.8  →  ±8 points
    n = 400, p = 0.8  →  ±4 points

  And n is the number of DISTINCT cases, not runs: at temperature 0 the 3 runs were
  identical, so "24/30" carried the information of 8/10.

COMPARE VARIANTS CASE BY CASE (paired), NOT JUST THE TOTALS
  Section 5: rewrite FIXED 1 case and BROKE 1 (a third "break" was the judge). That's the
  real finding — far more useful than "−10 points", and it tells you exactly what to look at. With enough cases, a paired test
  (McNemar's test on fixed-vs-broke counts) tells you if the difference is real.

WHEN TO REPEAT RUNS
  Only when outputs vary (temperature > 0, or a provider that isn't deterministic). Then
  report per-case pass RATES and flag flaky cases — a case passing 2/3 is a warning sign
  even if the average looks fine.
```

---

## 10. Evaluating Agents

```text
An agent's final answer can be right for the wrong reasons (it guessed) or wrong despite good
steps. Grade the PATH as well as the result:

  TASK SUCCESS      did it achieve the goal? (quote created with the right items and price)
  TRAJECTORY        right tools, right order, right arguments? Did it ask instead of
                    inventing? (The delivery agent's grounding failures — invented addresses,
                    a changed sofa length — are trajectory failures.)
  EFFICIENCY        steps, tokens, time and cost per task
  SAFETY            never called an action tool without approval; refused out-of-policy requests

HOW
  Record every run (messages + tool calls) and grade the record. Replay real failures with a
  FAKE model as permanent regression tests — the delivery guide's "blocks a quote built from
  details the customer never gave" test is exactly this (AI-AGENTS-DELIVERY-QUOTE-JS.md §12).
  For multi-turn agents, script the user side (or simulate it with another model) and grade
  the whole conversation.
```

---

## 11. Tools

```yaml
# promptfooconfig.yaml — the same idea as the harness, declaratively.
# (Shown for reference — not run for this guide.)  npx promptfoo@latest eval
prompts:
  - file://prompt.txt                    # the system prompt + {{question}}
providers:
  - id: ollama:chat:qwen2.5:7b
tests:
  - vars: { question: "I cancelled 1 hour before pickup — what will I pay?" }
    assert:
      - type: contains
        value: "$15"
  - vars: { question: "Can you carry my propane tank?" }
    assert:
      - type: llm-rubric
        value: "PASS if the answer clearly says propane is NOT accepted."
```

```text
  promptfoo          CLI + YAML, JS-friendly, compares prompts/models side by side, red-teaming
  Ragas              Python, RAG-specific metrics: faithfulness (is the answer supported by the
                     retrieved context?), answer relevancy, context precision / recall
  DeepEval           Python, pytest-style LLM tests with many built-in metrics
  Braintrust, LangSmith, Langfuse, Arize Phoenix
                     hosted/self-hosted platforms: datasets, experiments, traces, online evals
  OpenAI Evals, Inspect (UK AISI)
                     frameworks for model-level evaluation

‼️ A 100-line harness like section 4 teaches you what these tools do. Adopt one when you need
   shared datasets, dashboards and experiment history across a team.
```

---

## 12. Online Evals — In Production

```text
  SAMPLE AND GRADE     run the code graders and judges on a % of real traffic (asynchronously,
                       so users don't wait). Track pass rates per feature over time.
  USER SIGNALS         thumbs up/down, "regenerate", copy, abandoned chats, escalations to
                       a human, follow-up "that's wrong" messages
  GUARDRAIL METRICS    refusals, blocked tool calls, grounding-check failures (the delivery
                       agent's "NOT given by the customer" errors), PII detections
  COST AND LATENCY     tokens and seconds per request, per feature
  DRIFT                new kinds of questions appear; the pass rate on them is unknown →
                       sample them into the offline dataset
  A/B TESTS            for big changes, route a % of users to the new version and compare the
                       business metric (resolution rate, conversion), not just eval scores

‼️ THE LOOP: production failures → reviewed by a human → added to the offline dataset → the
   next change is tested against them. That loop is what makes an AI feature get better
   instead of just different.
```

---

## 13. Common Mistakes

```text
‼️ 1. Judging a change by the example you were fixing. It fixed 1, broke 1 (section 5).
‼️ 1b. Reading only the score. One of the "breaks" was a grader bug.
‼️ 2. Tiny datasets. 10 cases = ±25 points. You can't see a 5-point change.
‼️ 3. Counting repeated identical runs as more data. Vary inputs instead.
‼️ 4. Trusting an LLM judge you haven't checked against human labels — on REAL outputs.
‼️ 5. Rubrics that describe a perfect answer. State the minimum to pass.
‼️ 6. Only end-to-end evals. A 94% → 50% retrieval regression passed the gate (section 8).
‼️ 7. Tuning prompts on the same set you report results on. Keep a held-out set.
‼️ 8. Unpinned models. The baseline means nothing if the model changed underneath it.
   9. Only measuring quality. Track cost, latency and safety per case too.
```

---

## 14. Cheat Sheet

```text
DATASET     input + checkable success: mustInclude / mustRefuse / expected tool / rubric
GRADERS     code first → judge (structured { reason, pass }) only where code can't decide
JUDGE       validate vs human labels on real outputs · minimum-to-pass rubrics · binary verdicts
            · different model family · both orders for pairwise
RUN         every case × variant · compare case by case: fixed / broke / unchanged
STATS       margin ≈ ±2√(p(1−p)/n) · n = distinct cases · 50+ cases before trusting 5-point moves
LEVELS      component (retrieval hit@k, tool choice) + end-to-end · offline + online
CI          deterministic tests on every PR · model evals on prompt/model changes or nightly
            · gate on component AND end-to-end metrics · pin model versions
PROD        sample + grade traffic · user signals · failures → dataset → next change
```

---

## 15. Interview Answer

```text
Q: "How do you know your LLM feature works — and that a change improved it?"

"With an eval set: real user questions plus every bug we've seen, each with a checkable
 success condition — required facts, must-refuse, the expected tool call — and a rubric
 only where code can't decide. Code graders run first; an LLM judge handles the rest, and
 I validate the judge against human labels on real outputs.

 Two things I learned building one. First, a change that fixes the failing example often
 breaks others: query rewriting fixed one case and broke another, so I compare variants case by
 case — and I read the failures, because one of its 'breaks' was actually the judge
 being too strict. Second, end-to-end evals can be blind: swapping vector search for keyword search
 didn't move my 10-question end-to-end score, while the retrieval eval showed hit@1
 dropping from 94% to 50%. So I gate on component metrics too, use enough cases that the
 margin of error is smaller than the changes I care about, pin model versions, and feed
 production failures back into the dataset."
```

---

## Related Files

- [AI-RAG-BASICS.md](AI-RAG-BASICS.md) — the system evaluated here, and its retrieval eval
- [AI-AGENTS-DELIVERY-QUOTE-JS.md](AI-AGENTS-DELIVERY-QUOTE-JS.md) — agent failures turned into regression tests
- [AI-OBSERVABILITY-DEEP.md](../2-medium-priority/AI-OBSERVABILITY-DEEP.md) — tracing and production monitoring
- [AI-ENGINEERING-AGENTS-DEEP.md](AI-ENGINEERING-AGENTS-DEEP.md) — §9 evaluation in the wider AI stack
- [TESTING-ECOSYSTEM-DEEP.md](TESTING-ECOSYSTEM-DEEP.md) — how evals fit next to normal testing and CI
