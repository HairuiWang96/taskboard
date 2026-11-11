# AI Agents — Hands-On Example: Mortgage Loan Intake

**Priority: HIGH**

> A worked project: build one AI agent end to end, in Python, for free, for a made-up
> mortgage-lending scenario (the kind of "agentic tooling for lenders" job recruiters are
> hiring for). It goes from raw tool calls to a framework, an API, evals and a 10-step
> project roadmap.
>
> For the general concepts behind it, not tied to any industry (workflow patterns, memory,
> MCP, prompt injection, provider differences), read [AI-AGENTS-BASICS.md](AI-AGENTS-BASICS.md)
> first or alongside.
>
> ‼️ Prefer JavaScript? [AI-AGENTS-MORTGAGE-EXAMPLE-JS.md](AI-AGENTS-MORTGAGE-EXAMPLE-JS.md) is this
> exact project in TypeScript + Express (with Vitest tests). Build it there first, then rebuild it
> here to learn Python; its §18 is the JS → Python translation table.
>
> Assumes you know JavaScript/TypeScript and have called the OpenAI API. Python basics help;
> see [PYTHON-DEEP.md](../3-low-priority/PYTHON-DEEP.md) §1 for the JS → Python mental model.
> To serve the agent over HTTP, see [FASTAPI-BASICS.md](FASTAPI-BASICS.md).
>
> Every code block here was run against a local `qwen2.5:7b` model via Ollama (November 2026).
> Library APIs and model names change. If something doesn't match, check the library's docs.

---

## Table of Contents

- [AI Agents — Hands-On Example: Mortgage Loan Intake](#ai-agents--hands-on-example-mortgage-loan-intake)
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
  - [11. Serving It Over HTTP — FastAPI](#11-serving-it-over-http--fastapi)
  - [12. Testing an Agent](#12-testing-an-agent)
  - [13. Agents in a Regulated Business (Mortgages)](#13-agents-in-a-regulated-business-mortgages)
  - [14. Common Beginner Mistakes](#14-common-beginner-mistakes)
  - [15. Cheat Sheet](#15-cheat-sheet)
  - [16. Your Hands-On Project Roadmap](#16-your-hands-on-project-roadmap)
  - [17. Interview Answer](#17-interview-answer)
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
     { "tool": "calculate_dti", "arguments": { "monthly_debts": 1200, ... } }
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
  │    response = LLM(messages, tools)                       │
  │                                                          │
  │    if response has NO tool calls:                        │
  │        return response.text            ← final answer    │
  │                                                          │
  │    for each tool call in response:                       │
  │        result = run_my_function(name, arguments)         │
  │        messages.append(result)         ← model sees it   │
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
You need (a) a model that supports TOOL CALLING and (b) a Python environment.

OPTION A — LOCAL WITH OLLAMA (recommended for learning: free, offline, unlimited)
  Runs an open model on your own laptop. 8 GB+ RAM is enough for a 7B model.
  Slower and less clever than hosted models — which is GOOD for learning, because
  you'll see agents make mistakes and learn to guard against them.

OPTION B — A HOSTED FREE TIER (faster, smarter, rate-limited)
  Google Gemini (AI Studio API key) and Groq both have free tiers and both offer an
  OpenAI-compatible endpoint. Free-tier limits and model names change often, so check
  their sites.

‼️ The trick that makes this easy: Ollama, Gemini and Groq all speak the OPENAI API
   format. You keep using the `openai` Python package you already know and only change
   base_url, api_key and the model name.‼️
```

```bash
# ── Option A: Ollama ──────────────────────────────────────────────────────────
brew install ollama            # or download from ollama.com
ollama serve                   # starts the local server on :11434 (the app does this for you)
ollama pull qwen2.5:7b         # ~4.7 GB; a small model with good tool calling
ollama run qwen2.5:7b "hi"     # sanity check

# ── Python project (uv is the modern npm-equivalent for Python) ──────────────
brew install uv
uv init loan-agent && cd loan-agent
uv add openai                  # like `npm install openai`
uv run agent.py                # like `node agent.js`, inside the project's virtualenv
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

```python
def calculate_dti(monthly_debts: float, proposed_housing_payment: float, gross_monthly_income: float) -> dict:
    dti = (monthly_debts + proposed_housing_payment) / gross_monthly_income
    return {"dti_percent": round(dti * 100, 1)}
```

```text
Nothing AI about it. A tool is just a function. ‼️ Do the maths in code, never in the
model. LLMs are bad at arithmetic and great at deciding WHEN to call a calculator.‼️
```

### Step 2 — Describe it to the model

```python
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "calculate_dti",
            "description": "Calculate the debt-to-income ratio (DTI) as a percentage. "
                           "Always use this tool instead of doing the maths yourself.",
            "parameters": {                       # a JSON Schema for the arguments
                "type": "object",
                "properties": {
                    "monthly_debts": {"type": "number"},
                    "proposed_housing_payment": {"type": "number"},
                    "gross_monthly_income": {"type": "number"},
                },
                "required": ["monthly_debts", "proposed_housing_payment", "gross_monthly_income"],
            },
        },
    },
]
```

```text
‼️ The model never sees your Python code, ONLY this description. The name and
   description are how it decides whether to use the tool, so write them like docs
   for a new teammate.‼️
```

### Step 3 — Send the tools, see what comes back

```python
response = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS)
message = response.choices[0].message

message.tool_calls        # None → the model answered in text
                          # a list → the model wants you to run these tools
call = message.tool_calls[0]
call.id                   # "call_abc123"  — you must send this back with the result
call.function.name        # "calculate_dti"
call.function.arguments   # '{"monthly_debts": 1200, ...}'  ← a JSON STRING, not a dict
```

### Step 4 — Run the tool, send the result back

```python
args = json.loads(call.function.arguments)        # string → dict
result = calculate_dti(**args)                    # **args = spread, like fn(...args) in JS

messages.append(message)                          # 1. the model's request, verbatim
messages.append({                                 # 2. your answer to it
    "role": "tool",
    "tool_call_id": call.id,                      # links the result to the request
    "content": json.dumps(result),                # always a string
})
```

```text
‼️ Both appends are required. Leave out the assistant message, or get the
   tool_call_id wrong, and the API rejects the next request (or the model gets confused).‼️
```

### Step 5 — Loop until there are no more tool calls

That's section 6.

---

## 6. The Full Agent (Copy, Run, Read)

```python
# agent.py — a complete agent in ~150 lines, no framework
import json
import os
from openai import OpenAI

# ── 1. The model client ───────────────────────────────────────────────────────
# Ollama speaks the OpenAI API, so the normal OpenAI SDK works — just point it
# at your laptop. To use a hosted model instead, change base_url/api_key/MODEL.
client = OpenAI(
    base_url=os.getenv("LLM_BASE_URL", "http://localhost:11434/v1"),
    api_key=os.getenv("LLM_API_KEY", "ollama"),  # Ollama ignores the key, but the SDK requires one
)
MODEL = os.getenv("LLM_MODEL", "qwen2.5:7b")

# ── 2. Fake data — stands in for the lender's loan system ─────────────────────
APPLICATIONS = {
    "APP-1001": {
        "borrower": "Jordan Lee",
        "loan_amount": 320_000,
        "gross_monthly_income": 9_500,
        "monthly_debts": 1_200,             # car loan + credit cards
        "proposed_housing_payment": 2_100,  # new mortgage payment
        "documents_received": ["photo_id", "pay_stubs", "w2_2025"],
    },
    "APP-1002": {
        "borrower": "Sam Rivera",
        "loan_amount": 450_000,
        "gross_monthly_income": 7_000,
        "monthly_debts": 1_900,
        "proposed_housing_payment": 2_800,
        "documents_received": ["photo_id"],
    },
}
REQUIRED_DOCUMENTS = ["photo_id", "pay_stubs", "w2_2025", "bank_statements"]

# ── 3. The tools — plain Python functions ─────────────────────────────────────
def get_application(application_id: str) -> dict:
    app = APPLICATIONS.get(application_id)
    if app is None:
        return {"error": f"No application found with id {application_id}"}
    return app

def calculate_dti(monthly_debts: float, proposed_housing_payment: float, gross_monthly_income: float) -> dict:
    dti = (monthly_debts + proposed_housing_payment) / gross_monthly_income
    return {"dti_percent": round(dti * 100, 1)}

def check_documents(application_id: str) -> dict:
    app = APPLICATIONS.get(application_id)
    if app is None:
        return {"error": f"No application found with id {application_id}"}
    missing = [d for d in REQUIRED_DOCUMENTS if d not in app["documents_received"]]
    return {"missing_documents": missing}

TOOL_FUNCTIONS = {
    "get_application": get_application,
    "calculate_dti": calculate_dti,
    "check_documents": check_documents,
}

# ── 4. Tool descriptions — what the MODEL sees (it never sees your code) ──────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_application",
            "description": "Look up a loan application by its id. Returns borrower, loan amount, income, debts and documents received.",
            "parameters": {
                "type": "object",
                "properties": {"application_id": {"type": "string", "description": "e.g. APP-1001"}},
                "required": ["application_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_dti",
            "description": "Calculate the debt-to-income ratio (DTI) as a percentage. Always use this tool instead of doing the maths yourself.",
            "parameters": {
                "type": "object",
                "properties": {
                    "monthly_debts": {"type": "number"},
                    "proposed_housing_payment": {"type": "number"},
                    "gross_monthly_income": {"type": "number"},
                },
                "required": ["monthly_debts", "proposed_housing_payment", "gross_monthly_income"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_documents",
            "description": "List which required documents are still missing for an application.",
            "parameters": {
                "type": "object",
                "properties": {"application_id": {"type": "string"}},
                "required": ["application_id"],
            },
        },
    },
]

SYSTEM_PROMPT = """You are a loan intake assistant for a mortgage lender.
Your job: check whether an application is ready to send to an underwriter.
An application is READY only if no documents are missing AND DTI is 43% or below.
Always use the tools to get facts and do calculations — never guess numbers.
You do not approve or deny loans; a human underwriter does that.
End with: READY or NOT READY, followed by the reasons in short bullet points."""

# ── 5. The agent loop ─────────────────────────────────────────────────────────
def run_agent(task: str, max_steps: int = 10) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": task},
    ]

    for step in range(max_steps):
        response = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS)
        message = response.choices[0].message

        # No tool calls → the model is giving its final answer. Done.
        if not message.tool_calls:
            return message.content

        # The model asked for one or more tools. Save its request in the history...
        messages.append(message)

        # ...run each tool, and send each result back.
        for call in message.tool_calls:
            name = call.function.name
            args = json.loads(call.function.arguments)
            print(f"  [step {step + 1}] {name}({args})")

            func = TOOL_FUNCTIONS.get(name)
            result = func(**args) if func else {"error": f"Unknown tool {name}"}

            messages.append({
                "role": "tool",
                "tool_call_id": call.id,   # links this result to the request above
                "content": json.dumps(result),
            })

    return "Stopped: reached the step limit without a final answer."


if __name__ == "__main__":   # only runs with `uv run agent.py`, not when imported
    for app_id in ["APP-1001", "APP-1002"]:
        print(f"\n=== {app_id} ===")
        print(run_agent(f"Is application {app_id} ready for underwriting?"))
```

```text
REAL OUTPUT (qwen2.5:7b on a laptop)

=== APP-1001 ===
  [step 1] get_application({'application_id': 'APP-1001'})
  [step 2] calculate_dti({'gross_monthly_income': 9500, 'monthly_debts': 1200, 'proposed_housing_payment': 2100})
  [step 3] check_documents({'application_id': 'APP-1001'})
NOT READY
- Missing documents: bank statements
- DTI: 34.7% (below 43%, but close enough)

=== APP-1002 ===
  [step 1] get_application({'application_id': 'APP-1002'})
  [step 2] calculate_dti({'gross_monthly_income': 7000, 'monthly_debts': 1900, 'proposed_housing_payment': 2800})
  [step 3] check_documents({'application_id': 'APP-1002'})
NOT READY
- DTI is 67.1%, which is above the 43% threshold.
- Missing documents: pay_stubs, w2_2025, bank_statements.

‼️ Look at what happened:
   - Nobody told it the ORDER. It decided: look up the app → get the numbers it needed
     from the result → pass them to calculate_dti → check documents. That's the "agent" part.
   - The decision is right both times, but "below 43%, but close enough" is a strange
     comment for 34.7%. Small models add noise like this. That's why section 8 turns the
     answer into structured data, and section 12 tests it.‼️
```

---

## 7. Writing Good Tools

```text
‼️ Most "my agent is dumb" problems are actually tool problems.‼️

  ✓ ONE JOB PER TOOL        check_documents, not do_everything(action="...")
  ✓ CLEAR NAMES             verb_noun: get_application, send_document_request
  ✓ DESCRIPTIONS SAY WHEN   "Use this after check_documents shows something is missing."
  ✓ RETURN ERRORS AS DATA   {"error": "No application APP-9"} instead of raising.
                            The model reads the error and can recover (try another id,
                            ask the user). An exception just crashes your loop.‼️
  ✓ SMALL OUTPUTS           Return the fields the model needs, not a 5,000-line JSON
                            blob. Everything you return costs tokens and attention.
  ✓ CODE DOES THE RULES     Calculations, validation, permissions, limits → in Python.
                            The model decides WHAT to do; your code decides what's ALLOWED.
  ✓ FEW TOOLS               Start with 3–5. Dozens of similar tools confuse models,
                            small ones especially.

READ TOOLS vs ACTION TOOLS
  Read      get_application, check_documents     safe — let the agent call freely
  Action    send_email, update_status, order_appraisal
            changes the world → validate, log, often require human approval (section 9)
```

---

## 8. Structured Output — Get Data, Not Prose

```text
"NOT READY\n- Missing documents: bank statements" is fine for a human. Your React app,
database or the next workflow step wants DATA. Ask the model to fill a schema.
```

```python
# Pydantic = Python's Zod: define a shape once, get validation + types
from typing import Literal
from pydantic import BaseModel

class IntakeDecision(BaseModel):
    status: Literal["READY", "NOT_READY"]
    dti_percent: float
    missing_documents: list[str]
    reasons: list[str]

completion = client.chat.completions.parse(
    model=MODEL,
    messages=[
        {"role": "system", "content": "Turn the loan intake review into the requested format."},
        {"role": "user", "content": final_answer_from_the_agent},
    ],
    response_format=IntakeDecision,     # the SDK turns the class into a JSON Schema
)
decision = completion.choices[0].message.parsed   # an IntakeDecision object, already validated

decision.status              # 'NOT_READY'
decision.missing_documents   # ['bank_statements']
```

```text
‼️ COMMON PATTERN: let the agent loop work freely, then do ONE final structured call to
   turn its answer into a validated object. Your app then uses decision.status, never a
   regex over free text.‼️
```

---

## 9. Human Approval for Risky Actions

```text
Add an ACTION tool, send_document_request, that emails the borrower. You don't want a
model emailing customers on its own, so put a human check in front of it, IN YOUR CODE.
```

```python
NEEDS_APPROVAL = {"send_document_request"}

def run_tool(name: str, args: dict) -> dict:
    if name in NEEDS_APPROVAL:
        answer = input(f"Agent wants to call {name}({args}). Allow? [y/N] ")
        if answer.strip().lower() != "y":
            # Tell the model, as data, so it can carry on without that action
            return {"error": "A human rejected this action. Do not retry it."}
    func = TOOL_FUNCTIONS.get(name)
    return func(**args) if func else {"error": f"Unknown tool {name}"}

# In the loop, replace the two lines that call func(**args) with:
#     result = run_tool(name, args)
```

```text
REAL OUTPUT — "Review APP-1001 and chase anything missing."
  [step 1] get_application(...)
  [step 2] check_documents(...)
  [step 3] send_document_request({'application_id': 'APP-1001', 'documents': ['bank_statements']})
  Agent wants to call send_document_request(...). Allow? [y/N] y
  [step 4] calculate_dti(...)
  NOT READY — bank statements missing (requested via email to Jordan Lee)

‼️ The approval lives in YOUR code, not in the prompt. "Please ask before emailing" in a
   system prompt is a suggestion. A check in run_tool is a guarantee.‼️

In a web app, input() becomes: save the pending action → show "Approve / Reject" in the
React UI → resume the agent with the decision. Frameworks call this human-in-the-loop
(HITL) and most have built-in support for it.
```

---

## 10. The Same Agent With a Framework

```text
Once the loop makes sense, a framework writes it for you: it turns your functions into tool
schemas, runs the loop, and adds tracing, handoffs between agents, guardrails and retries.
```

```python
# uv add openai-agents
# agent_sdk.py — the same agent with the OpenAI Agents SDK (works with Ollama too)
from openai import AsyncOpenAI
from agents import Agent, OpenAIChatCompletionsModel, Runner, function_tool, set_tracing_disabled

from agent import APPLICATIONS, REQUIRED_DOCUMENTS, SYSTEM_PROMPT   # reuse the data + prompt

set_tracing_disabled(True)  # tracing uploads to OpenAI's dashboard — off when using other models

model = OpenAIChatCompletionsModel(
    model="qwen2.5:7b",
    openai_client=AsyncOpenAI(base_url="http://localhost:11434/v1", api_key="ollama"),
)

# @function_tool reads the type hints + docstring and builds the JSON schema for you
@function_tool
def get_application(application_id: str) -> dict:
    """Look up a loan application by its id (e.g. APP-1001)."""
    return APPLICATIONS.get(application_id) or {"error": f"No application {application_id}"}

@function_tool
def calculate_dti(monthly_debts: float, proposed_housing_payment: float, gross_monthly_income: float) -> dict:
    """Calculate debt-to-income ratio as a percentage. Always use this instead of doing maths yourself."""
    return {"dti_percent": round((monthly_debts + proposed_housing_payment) / gross_monthly_income * 100, 1)}

@function_tool
def check_documents(application_id: str) -> dict:
    """List which required documents are still missing for an application."""
    app = APPLICATIONS.get(application_id)
    if app is None:
        return {"error": f"No application {application_id}"}
    return {"missing_documents": [d for d in REQUIRED_DOCUMENTS if d not in app["documents_received"]]}

intake_agent = Agent(
    name="Loan intake assistant",
    instructions=SYSTEM_PROMPT,
    tools=[get_application, calculate_dti, check_documents],
    model=model,
)

result = Runner.run_sync(intake_agent, "Is application APP-1001 ready for underwriting?", max_turns=10)
print(result.final_output)
```

```text
‼️ Compare with section 6: TOOLS (the JSON schemas), TOOL_FUNCTIONS and run_agent are gone.
   @function_tool + Runner do that work. Same idea, less code.‼️
```

```text
WHICH FRAMEWORK? (all have free, open-source Python libraries)

  OpenAI Agents SDK   Small and easy, close to the raw loop. Works with any
                      OpenAI-compatible model. A great FIRST framework.
  LangGraph           Agents as a graph of steps with saved state: pause/resume,
  (+ LangChain)       human approval, long workflows. Shows up in job postings more
                      than any other. Learn it second.‼️
  Pydantic AI         Type-safe, built on Pydantic. Good fit if you like FastAPI.
  Claude Agent SDK    Anthropic's toolkit behind Claude Code: files, shell, MCP tools.
                      Aimed at agents that work on a computer; Claude models only.
  CrewAI              Several "role" agents working together. Popular in demos.

‼️ They all do the same section-2 loop. Learn it raw, then pick one framework and go deep.
   Don't try to learn all of them.‼️
```

---

## 11. Serving It Over HTTP — FastAPI

```text
Your React app can't call a Python function, so wrap the agent in an API. FastAPI is the
standard Python choice (think Express, plus automatic validation and docs).
Full beginner guide: FASTAPI-BASICS.md.
```

```python
# main.py — uv add "fastapi[standard]"  →  uv run fastapi dev main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from agent import APPLICATIONS, run_agent

app = FastAPI(title="Loan intake agent")

class ReviewRequest(BaseModel):
    application_id: str

class ReviewResponse(BaseModel):
    application_id: str
    review: str

@app.post("/reviews", response_model=ReviewResponse)
def create_review(body: ReviewRequest):
    if body.application_id not in APPLICATIONS:
        raise HTTPException(status_code=404, detail="Application not found")
    review = run_agent(f"Is application {body.application_id} ready for underwriting?")
    return ReviewResponse(application_id=body.application_id, review=review)
```

```text
POST /reviews {"application_id": "APP-1002"}
→ 200 {"application_id": "APP-1002", "review": "NOT READY\n- DTI is 67.1%, ..."}
POST /reviews {}                → 422 (FastAPI validated the body for you)
POST /reviews {"application_id": "NOPE"} → 404

Open http://localhost:8000/docs for an interactive API page you didn't have to write.

‼️ Agent calls are SLOW (seconds to minutes). For real use: stream progress to the UI,
   or start a background job and let the frontend poll for the result. A 30-second HTTP
   request will time out somewhere.‼️
```

---

## 12. Testing an Agent

```text
The model's answers vary from run to run, so test in three layers.

  1. TOOLS — normal unit tests (pytest). They're plain functions; test them like any code.
       assert calculate_dti(1200, 2100, 9500) == {"dti_percent": 34.7}

  2. THE LOOP — replace the model with a fake that returns scripted tool calls.
       Tests: unknown tool → error message, step limit works, results are appended.
       No model, no cost, fully repeatable.

  3. BEHAVIOUR — "evals": a list of scenarios with known right answers, run against
     the real model.
       APP-1001 → NOT_READY, missing ["bank_statements"]
       APP-1002 → NOT_READY, DTI 67.1
       APP-1003 (all docs, DTI 30) → READY
     Run each a few times and track the pass rate. When you change the prompt, model or
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
  3. RULES IN CODE, NOT PROMPTS. The 43% DTI limit lives in Python, where it's testable
     and auditable, not only in prompt text.
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
   Put them in tools/code. The model picks the tool; Python gets the number right.

‼️ 2. No step limit.
   One confused model + a loop with no max = runaway cost. Always cap steps.

‼️ 3. Raising exceptions from tools.
   Return {"error": "..."} so the model can recover. Catch unexpected exceptions around
   the tool call too.

‼️ 4. Forgetting to append the assistant message before the tool results,
   or sending the wrong tool_call_id. The API errors, or the model loses track.

‼️ 5. Treating arguments as trusted.
   The model can make up an application id or pass a string where you expected a number.
   Validate inside the tool (Pydantic helps), exactly like user input.

‼️ 6. Safety rules only in the prompt.
   Prompts are suggestions. Permission checks and approval gates go in code.

‼️ 7. Starting with a multi-agent framework.
   Get one agent with 3 tools working first. Most real problems need one agent.

‼️ 8. Judging by one run.
   It worked once ≠ it works. Build a small eval set (section 12) and track the pass rate.

‼️ 9. Model without tool support.
   If the model never calls your tools, check that it supports function calling.
```

---

## 15. Cheat Sheet

```python
# ── CLIENT (any OpenAI-compatible provider) ──────────────────────────────────
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

# ── ONE TURN ─────────────────────────────────────────────────────────────────
msg = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS).choices[0].message
if not msg.tool_calls:
    final = msg.content                                   # done
else:
    messages.append(msg)                                  # model's request
    for call in msg.tool_calls:
        args = json.loads(call.function.arguments)        # JSON string → dict
        result = TOOL_FUNCTIONS[call.function.name](**args)
        messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})

# ── STRUCTURED OUTPUT ────────────────────────────────────────────────────────
parsed = client.chat.completions.parse(model=MODEL, messages=m, response_format=MyModel).choices[0].message.parsed

# ── FRAMEWORK (OpenAI Agents SDK) ────────────────────────────────────────────
@function_tool
def my_tool(x: str) -> dict: """What it does and when to use it."""
agent = Agent(name="...", instructions="...", tools=[my_tool], model=model)
Runner.run_sync(agent, "task", max_turns=10).final_output
```

```text
RULES
  1. Tools = plain functions + a good description
  2. Maths, rules, permissions → code. Decisions about what to do next → model
  3. Always: max steps, errors as data, validate arguments
  4. Risky actions → human approval, enforced in code
  5. Structured output for anything a program will read
  6. Evals before you trust it; logs so you can explain it
```

---

## 16. Your Hands-On Project Roadmap

```text
Build these in order in your project folder. Each milestone is small and works on its own.

  M1  Hello model       Ollama running; one chat call from Python prints a reply.
  M2  One tool          calculate_dti only; watch the model call it (section 5).
  M3  The loop          Full agent.py from section 6. Add APP-1003 that should be READY.
  M4  Errors & limits   Ask about "APP-9999". Does it recover? Set max_steps=2 and see
                        it stop.
  M5  Structured        Final IntakeDecision via .parse() (section 8).
  M6  Approval          send_document_request behind a y/N check (section 9).
  M7  Evals             5–10 scenarios with expected answers; a script that runs them and
                        prints the pass rate. Try a prompt change and compare.
  M8  Framework         Port it to the OpenAI Agents SDK (section 10). Then try LangGraph.
  M9  API               FastAPI POST /reviews (section 11) + pytest for the tools.
  M10 UI                A small React page: pick an application → run review → show the
                        status, missing docs, and an Approve button for pending emails.

STRETCH IDEAS (great interview stories)
  - Document classification: pass a PDF's text in and let a tool label it pay_stub / w2 / other
  - An audit log table: every tool call saved with application id + timestamp
  - Swap Ollama for a hosted free tier with only env-var changes, and compare quality/speed
  - Stream the agent's steps to the React UI as they happen
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
 READY / NOT READY decision. I wrote the loop from scratch first, then ported it to the
 OpenAI Agents SDK, and served it with FastAPI.

 The lessons that mattered: business rules and maths live in code, not the prompt; tools
 return errors as data so the model can recover; risky actions like emailing a borrower
 go through a human-approval gate enforced in code; and I use a small eval set to check
 that a prompt or model change actually helps. In lending specifically, the agent prepares
 the work and a human makes the credit decision, with every step logged."
```

---

## Related Files

- [AI-AGENTS-MORTGAGE-EXAMPLE-JS.md](AI-AGENTS-MORTGAGE-EXAMPLE-JS.md) — this project in TypeScript + Express
- [AI-AGENTS-BASICS.md](AI-AGENTS-BASICS.md) — the general guide: agent concepts and patterns for any domain
- [FASTAPI-BASICS.md](FASTAPI-BASICS.md) — serving the agent as an API, for Express developers
- [AI-ENGINEERING-AGENTS-DEEP.md](AI-ENGINEERING-AGENTS-DEEP.md) — the next level: tool use in TypeScript, frameworks, multi-agent, RAG, evals, guardrails
- [AI-AGENT-MEMORY-DEEP.md](AI-AGENT-MEMORY-DEEP.md) — giving agents memory across conversations
- [AI-OPEN-SOURCE-MODELS-DEEP.md](AI-OPEN-SOURCE-MODELS-DEEP.md) — Ollama, vLLM and choosing an open model
- [AI-SYSTEM-DESIGN-DEEP.md](AI-SYSTEM-DESIGN-DEEP.md) — Q5 "AI document processing pipeline" is very close to mortgage work
- [AI-OBSERVABILITY-DEEP.md](../2-medium-priority/AI-OBSERVABILITY-DEEP.md) — tracing and logging agent runs
- [AI-TOOLS-BASICS.md](AI-TOOLS-BASICS.md) — §8–9: SDKs and MCP at a glance
- [PYTHON-DEEP.md](../3-low-priority/PYTHON-DEEP.md) — Python for JS developers
