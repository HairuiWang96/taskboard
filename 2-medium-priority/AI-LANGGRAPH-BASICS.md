# LangGraph — Hands-On (Python)

**Priority: MEDIUM**

> LangGraph is the agent framework job postings mention most. This guide builds the delivery
> booking flow as a LangGraph **state graph**: the model extracts details, the graph pauses to ask
> the customer for anything missing, code prices it, the graph pauses again for booking approval,
> and the paused conversation survives a process restart. Then the same job with LangChain's
> prebuilt `create_agent`, with memory and human-approval middleware.
>
> Run with `langgraph` 1.2, `langchain` 1.5 and `langchain-openai` 1.7 against a local `qwen2.5:7b`
> via Ollama (November 2026). The "real output" blocks are what it printed. LangGraph.js
> (`@langchain/langgraph`) has the same concepts in TypeScript.

---

## Table of Contents

- [LangGraph — Hands-On (Python)](#langgraph--hands-on-python)
  - [Table of Contents](#table-of-contents)
  - [1. What LangGraph Is](#1-what-langgraph-is)
  - [2. When to Use It (and When Not)](#2-when-to-use-it-and-when-not)
  - [3. Setup](#3-setup)
  - [4. The Five Concepts](#4-the-five-concepts)
  - [5. The Booking Graph](#5-the-booking-graph)
  - [6. Durable Execution — Pause Here, Resume Elsewhere](#6-durable-execution--pause-here-resume-elsewhere)
  - [7. Streaming Progress](#7-streaming-progress)
  - [8. The Prebuilt Agent — create\_agent](#8-the-prebuilt-agent--create_agent)
  - [9. Production Notes](#9-production-notes)
  - [10. Common Mistakes](#10-common-mistakes)
  - [11. Cheat Sheet](#11-cheat-sheet)
  - [12. Interview Answer](#12-interview-answer)
  - [Related Files](#related-files)

---

## 1. What LangGraph Is

```text
‼️ LANGGRAPH IN ONE SENTENCE
   You describe your AI workflow as a GRAPH: nodes are steps (plain functions — some call a
   model, most don't), edges decide what runs next, and a shared STATE is saved after every
   step so the run can pause, wait for a human, resume — even in another process.‼️

THE FAMILY
  LangGraph     the low-level engine: state, nodes, edges, checkpoints, interrupts
  LangChain     model wrappers (ChatOpenAI, ChatAnthropic…), tools, and since v1 the prebuilt
                agent create_agent — which is itself a LangGraph graph
  LangSmith     tracing, evals and deployment (a separate hosted product)

COMPARED WITH THE RAW LOOP (AI-AGENTS-BASICS.md)
  The raw loop is one function with a for-loop. LangGraph makes the steps EXPLICIT and gives
  you, for free: saved state per step, pause/resume (human-in-the-loop), branching and loops
  you can draw, streaming of every step, and time-travel through the history.
```

---

## 2. When to Use It (and When Not)

```text
USE IT WHEN
  ✓ a person must approve or answer mid-run (approvals, "what's the weight?")
  ✓ runs are LONG (minutes to days) and must survive restarts and deploys
  ✓ the flow has branches and loops you want to see and test (extract → ask → extract again)
  ✓ several agents/steps share state (multi-agent, supervisor patterns)

DON'T BOTHER WHEN
  ✗ one model call, or a short tool loop that finishes in one request — the raw loop or the
    OpenAI Agents SDK is simpler
  ✗ you can't yet explain your flow on a whiteboard — a framework won't fix that

‼️ Notice in §5 that only ONE of five nodes calls a model. That's the "workflow inside an agent"
   lesson from AI-AGENTS-DELIVERY-QUOTE-JS.md, enforced by the shape of the graph.
```

---

## 3. Setup

```bash
uv add langgraph langchain langchain-openai          # + langgraph-checkpoint-sqlite for §6
```

```text
ChatOpenAI works with Ollama (and any OpenAI-compatible server) via base_url, exactly like the
openai SDK. For other providers: langchain-anthropic, langchain-google-genai, langchain-ollama…
```

---

## 4. The Five Concepts

```text
  STATE          a TypedDict (or Pydantic model) of everything the graph knows. Nodes return
                 PARTIAL updates ({"quote": …}); LangGraph merges them into the state.
  NODES          functions state → update. Anything: a model call, a database query, maths.
  EDGES          what runs next. Fixed (add_edge), conditional (add_conditional_edges with a
                 function that returns the next node's name), or decided inside a node by
                 returning Command(goto=…).
  CHECKPOINTER   saves the state after every node, per THREAD (thread_id = one conversation).
                 InMemorySaver for tests; SQLite/Postgres savers for real use.
  INTERRUPT      interrupt(payload) inside a node PAUSES the run and hands payload to the
                 caller. Calling graph.invoke(Command(resume=value), config) continues from that
                 exact line, with interrupt(...) returning `value`.
```

---

## 5. The Booking Graph

```python
# graph.py — the delivery booking flow as a LangGraph state machine, with human-in-the-loop
import uuid
from typing import TypedDict

from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from pydantic import BaseModel, Field

llm = ChatOpenAI(base_url="http://localhost:11434/v1", api_key="ollama", model="qwen2.5:7b", temperature=0)


# ── 1. STATE: everything the graph knows, saved after every step ───────────────
class State(TypedDict, total=False):
    request: str            # everything the customer has said so far
    details: dict           # extracted by the model
    missing: list[str]      # computed by code
    quote: dict             # computed by code
    booking: dict | None


class Details(BaseModel):
    item: str | None = Field(description="the item to deliver, or null if not stated")
    weight_lb: float | None = Field(description="weight in pounds, or null if not stated")
    miles: float | None = Field(description="distance in miles, or null if not stated")


# ── 2. NODES: plain functions that take the state and return updates ──────────
def extract(state: State) -> State:
    """The ONLY step that needs a model: turn free text into fields."""
    details = llm.with_structured_output(Details).invoke(
        "Extract the delivery details. Use null for anything the customer did NOT say.\n\n"
        f"Customer: {state['request']}")
    missing = [f for f, v in details.model_dump().items() if v is None]   # code decides what's missing
    return {"details": details.model_dump(), "missing": missing}


def ask_customer(state: State) -> State:
    """PAUSE the graph and wait for the human. The state is saved by the checkpointer."""
    answer = interrupt({"question": f"Please tell me the {', '.join(state['missing'])}."})
    return {"request": f"{state['request']}\n{answer}"}           # resumes here with the answer


def price(state: State) -> State:
    d = state["details"]
    vehicle = "Car" if d["weight_lb"] <= 100 else "Cargo van" if d["weight_lb"] <= 2500 else "Box truck"
    base = {"Car": 12, "Cargo van": 35, "Box truck": 75}[vehicle]
    total = round(base + d["miles"] * 1.6 + (40 if d["weight_lb"] > 100 else 0), 2)
    return {"quote": {"quote_id": f"Q-{uuid.uuid4().hex[:8]}", "vehicle": vehicle, "total": total}}


def approve(state: State) -> Command:
    """Human approval, then ROUTE: book if approved, finish if not."""
    q = state["quote"]
    approved = interrupt({"question": f"Book {state['details']['item']} in a {q['vehicle']} for ${q['total']:.2f}?"})
    return Command(goto="book" if approved else END, update={} if approved else {"booking": None})


def book(state: State) -> State:
    return {"booking": {"booking_id": f"B-{uuid.uuid4().hex[:8]}", "total": state["quote"]["total"]}}


# ── 3. EDGES: the control flow is CODE, visible and testable ──────────────────
def after_extract(state: State) -> str:
    return "ask_customer" if state["missing"] else "price"


builder = StateGraph(State)
for name, fn in [("extract", extract), ("ask_customer", ask_customer), ("price", price), ("approve", approve), ("book", book)]:
    builder.add_node(name, fn)
builder.add_edge(START, "extract")
builder.add_conditional_edges("extract", after_extract, ["ask_customer", "price"])
builder.add_edge("ask_customer", "extract")      # loop back: re-extract with the new information
builder.add_edge("price", "approve")
builder.add_edge("book", END)

graph = builder.compile(checkpointer=InMemorySaver())   # checkpointer = pause/resume + memory


if __name__ == "__main__":
    config = {"configurable": {"thread_id": "customer-42"}}   # one thread per conversation

    result = graph.invoke({"request": "I need to move a sofa 10 miles"}, config)
    print("1 · paused:", result["__interrupt__"][0].value, "| known:", result["details"])

    result = graph.invoke(Command(resume="It weighs about 120 lb"), config)   # the human answers
    print("2 · paused:", result["__interrupt__"][0].value)

    result = graph.invoke(Command(resume=True), config)                       # the human approves
    print("3 · done:  booking =", result["booking"], "| quote =", result["quote"])

    print("history:", [s.next for s in graph.get_state_history(config)][::-1])
```

```text
REAL OUTPUT
1 · paused: {'question': 'Please tell me the weight_lb.'} | known: {'item': 'sofa', 'weight_lb': None, 'miles': 10.0}
2 · paused: {'question': 'Book sofa in a Cargo van for $91.00?'}
3 · done:  booking = {'booking_id': 'B-a040a5c1', 'total': 91.0} | quote = {'quote_id': 'Q-a8d0b807', 'vehicle': 'Cargo van', 'total': 91.0}
history: [('__start__',), ('extract',), ('ask_customer',), ('extract',), ('price',), ('approve',), ('book',), ()]

THE PATH IT TOOK
  START → extract (model found sofa + 10 miles, weight missing)
        → ask_customer  ⏸ interrupt: "Please tell me the weight_lb."
        ⏵ resume("It weighs about 120 lb") → extract again (now complete)
        → price (code: cargo van, $91.00)
        → approve  ⏸ interrupt: "Book sofa in a Cargo van for $91.00?"
        ⏵ resume(True) → book → END

‼️ WHAT THE GRAPH GIVES YOU
   - The model only EXTRACTS; code decides what's missing, the price and the route.
   - Each ⏸ is a real pause: invoke() RETURNS with "__interrupt__". Your API sends the question to
     the user and returns. Nothing is waiting in memory.
   - get_state_history() shows every step — the audit trail (and you can resume from an older
     checkpoint: "time travel").
   - The approve node uses Command(goto=…) to route by the human's answer.

PRACTICAL NOTE
  The question says "weight_lb" because it's built from field names. A real app maps them to
  friendly text ("the weight in pounds").
```

---

## 6. Durable Execution — Pause Here, Resume Elsewhere

```python
# durable.py — pause in one process, resume in ANOTHER: the state lives in SQLite, not in memory
import sqlite3
import sys

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import Command

from graph import builder   # the same graph definition, compiled with a persistent checkpointer

graph = builder.compile(checkpointer=SqliteSaver(sqlite3.connect("checkpoints.db", check_same_thread=False)))
config = {"configurable": {"thread_id": "customer-77"}}

step = sys.argv[1]
if step == "start":
    r = graph.invoke({"request": "Please move my 40 lb desk 5 miles"}, config)
    print("process A paused at:", graph.get_state(config).next, "→", r["__interrupt__"][0].value)
elif step == "deny":
    r = graph.invoke(Command(resume=False), config)          # a brand-new process picks it up
    print("process B resumed → booking:", r.get("booking"), "| next:", graph.get_state(config).next)
```

```text
REAL OUTPUT (two separate `python` processes)
$ python durable.py start
process A paused at: ('approve',) → {'question': 'Book 40 lb desk in a Car for $20.00?'}
$ python durable.py deny
process B resumed → booking: None | next: ()

‼️ Process A paused and EXITED. Process B — a fresh interpreter, which could be another server
   after a deploy, a day later — loaded the thread from SQLite and continued from the exact
   interrupt. That's what "durable execution" means, and it's the main reason teams pick
   LangGraph for approval workflows. (Deny ended the run with no booking, via Command(goto=END).)

Notice the item: '40 lb desk'. The model put the weight inside the item name too — harmless here,
but exactly the kind of extraction quirk an eval set catches (AI-EVALS-DEEP.md).
In production use the Postgres checkpointer (langgraph-checkpoint-postgres).
```

---

## 7. Streaming Progress

```python
# stream.py — watch the graph run, step by step (what you'd push to a UI)
from graph import graph

config = {"configurable": {"thread_id": "customer-99"}}
for update in graph.stream({"request": "Move my 30 lb lamp 4 miles"}, config, stream_mode="updates"):
    for node, change in update.items():
        print(f"{node:>13} → {change}")
```

```text
REAL OUTPUT
      extract → {'details': {'item': '30 lb lamp', 'weight_lb': 30.0, 'miles': 4.0}, 'missing': []}
        price → {'quote': {'quote_id': 'Q-72d1c9ab', 'vehicle': 'Car', 'total': 18.4}}
__interrupt__ → (Interrupt(value={'question': 'Book 30 lb lamp in a Car for $18.40?'}, id='3c03…', response_schema=None),)

stream_mode="updates"   what each node changed — perfect for "Extracting… Pricing… Waiting for
                        approval" in a UI (send it over SSE: FASTAPI-DEEP.md §5)
stream_mode="messages"  token-by-token model output from inside nodes
stream_mode="values"    the full state after each step
```

---

## 8. The Prebuilt Agent — create_agent

```python
# agent.py — the prebuilt agent: create_agent = a ready-made LangGraph tool loop
import uuid

from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

QUOTES: dict[str, float] = {}


@tool
def get_quote(item: str, weight_lb: float, miles: float) -> dict:
    """Price delivering one item. Needs the item, its weight in pounds and the distance in miles."""
    total = round((12 if weight_lb <= 100 else 35) + miles * 1.6 + (40 if weight_lb > 100 else 0), 2)
    quote_id = f"Q-{uuid.uuid4().hex[:8]}"
    QUOTES[quote_id] = total
    return {"quote_id": quote_id, "total": total}


@tool
def book_delivery(quote_id: str) -> dict:
    """Book a quoted delivery by its quote_id."""
    if quote_id not in QUOTES:
        return {"error": f"No quote {quote_id}"}
    return {"booked": True, "booking_id": f"B-{uuid.uuid4().hex[:8]}", "total": QUOTES.pop(quote_id)}


agent = create_agent(
    model=ChatOpenAI(base_url="http://localhost:11434/v1", api_key="ollama", model="qwen2.5:7b", temperature=0),
    tools=[get_quote, book_delivery],
    system_prompt="You are a delivery assistant. Use get_quote for prices and book_delivery to book. Never guess prices.",
    middleware=[HumanInTheLoopMiddleware(interrupt_on={"book_delivery": True})],   # pause before booking
    checkpointer=InMemorySaver(),                                                   # memory across turns
)

config = {"configurable": {"thread_id": "chat-1"}}
say = lambda text: agent.invoke({"messages": [{"role": "user", "content": text}]}, config)

r = say("How much to move a 120 lb sofa 10 miles?")
print("turn 1:", r["messages"][-1].content[:160])

r = say("Great, book it.")                              # the agent REMEMBERS the quote from turn 1
req = r["__interrupt__"][0].value
print("turn 2 paused for approval:", [(a["name"], a["args"]) for a in req["action_requests"]])

r = agent.invoke(Command(resume={"decisions": [{"type": "approve"}]}), config)
print("turn 2 after approval:", r["messages"][-1].content[:160])
print("tool calls made:", [m.name for m in r["messages"] if m.type == "tool"])
```

```text
REAL OUTPUT
turn 1: The quote for delivering a 120 lb sofa 10 miles is $91.00. You can proceed with booking the delivery if you're satisfied with the price. Would you like to book …
turn 2 paused for approval: [('book_delivery', {'quote_id': 'Q-9be44f11'})]
turn 2 after approval: Your delivery has been booked successfully. The booking ID is B-f72792da and the total cost is $91.00. …
tool calls made: ['get_quote', 'book_delivery']

‼️ WHAT HAPPENED
   - create_agent built the tool loop (model → tools → model…) as a LangGraph graph.
   - The checkpointer + thread_id gave it MEMORY: in turn 2, "book it" was enough — the agent
     found the quote_id from turn 1 in the saved conversation.
   - HumanInTheLoopMiddleware paused BEFORE book_delivery ran and showed the exact call
     (name + args). Resume with decisions: approve, reject (with a message), or edit the args.

MIDDLEWARE = the agent's plug-ins (langchain.agents.middleware, as installed in v1.5):
  HumanInTheLoopMiddleware   approvals          ModelCallLimitMiddleware / ToolCallLimitMiddleware  step & cost limits
  SummarizationMiddleware    long histories     ModelRetryMiddleware / ToolRetryMiddleware          retries
  PIIMiddleware              redact PII         ModelFallbackMiddleware                             backup model
  LLMToolSelectorMiddleware  pick tools when you have many

WHICH ONE TO USE
  create_agent: a standard tool-calling agent, fast to set up, with middleware for the usual needs.
  Your own StateGraph (§5): when the FLOW is yours — fixed steps, branches, several pauses.
  They mix: a create_agent can be one node inside a bigger graph.
```

---

## 9. Production Notes

```text
  PERSISTENCE     Postgres checkpointer; one thread_id per conversation/job; clean up old threads
  APIs            an endpoint that invokes with the user's input and returns either the result or
                  the interrupt payload; a second call resumes with Command(resume=…). Stream
                  updates over SSE.
  IDEMPOTENCY     a node can run again after a crash/resume: make side effects (booking, emails)
                  idempotent, or put them after the last interrupt and check before acting
  OBSERVABILITY   LangSmith traces every node and model call; or OpenTelemetry
  TESTING         nodes are plain functions — unit test them; test the graph with a fake model;
                  evals for the model nodes (AI-EVALS-DEEP.md)
  DEPLOYMENT      any Python server (FastAPI), or LangChain's managed platform
  JS              LangGraph.js mirrors this: StateGraph, Annotation-based state, interrupt, Command
```

---

## 10. Common Mistakes

```text
‼️ 1. Putting everything in model nodes. Only the steps that need judgement need a model.
‼️ 2. No checkpointer — interrupt() needs one, and without it there's no memory or resume.
‼️ 3. Reusing a thread_id across users or jobs — they'd share state.
‼️ 4. Side effects before an interrupt that may be re-run on resume → double bookings.
‼️ 5. Expecting invoke() to block until the human answers. It RETURNS with __interrupt__; you
      resume later with Command(resume=…).
   6. Huge state (whole documents, every intermediate) — it's saved after EVERY step.
   7. Copying pre-1.0 tutorials: create_react_agent (langgraph.prebuilt) is replaced by
      langchain.agents.create_agent; approvals moved to middleware.
```

---

## 11. Cheat Sheet

```python
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver

class State(TypedDict, total=False): ...
def node(state: State) -> dict: return {"field": value}            # partial update
builder = StateGraph(State)
builder.add_node("name", node)
builder.add_edge(START, "name")
builder.add_conditional_edges("name", lambda s: "a" if s["x"] else "b", ["a", "b"])
graph = builder.compile(checkpointer=InMemorySaver())

config = {"configurable": {"thread_id": "conversation-1"}}
result = graph.invoke({"field": "input"}, config)                    # may return "__interrupt__"
answer = interrupt({"question": "..."})                              # inside a node: pause
graph.invoke(Command(resume=answer_from_user), config)               # continue
# inside a node: return Command(goto="next_node", update={...})       # route by a decision
graph.stream(inputs, config, stream_mode="updates")                  # progress
graph.get_state(config).next                                         # where it is now
graph.get_state_history(config)                                      # the audit trail

# prebuilt
agent = create_agent(model, tools, system_prompt=..., checkpointer=InMemorySaver(),
                     middleware=[HumanInTheLoopMiddleware(interrupt_on={"book_delivery": True})])
agent.invoke(Command(resume={"decisions": [{"type": "approve"}]}), config)
```

---

## 12. Interview Answer

```text
Q: "Have you used LangGraph? Why would you choose it?"

"LangGraph models an AI workflow as a state graph: nodes are steps, edges decide what runs next,
 and a checkpointer saves the state after every step per thread. That gives you pause and
 resume — interrupt() in a node returns control to the caller, and you continue later with
 Command(resume=…) — which is exactly what human-in-the-loop needs.

 I built a delivery booking flow with it: a model node extracts the details, a code edge checks
 what's missing and routes to a node that interrupts to ask the customer, pricing is plain code,
 and an approval node interrupts before booking and routes on the answer. With a SQLite
 checkpointer I paused in one process and resumed in another, which is the durability you want
 for approvals that take hours. For a standard tool-calling assistant I'd use the prebuilt
 create_agent with the human-in-the-loop middleware instead of hand-building the loop. And I'd
 skip LangGraph entirely for a single call or a short loop — it earns its keep when there are
 pauses, branches and long-running state."
```

---

## Related Files

- [AI-AGENTS-BASICS.md](../1-high-priority/AI-AGENTS-BASICS.md) — the raw loop LangGraph builds on (§17 compares frameworks)
- [AI-AGENTS-DELIVERY-QUOTE.md](../1-high-priority/AI-AGENTS-DELIVERY-QUOTE.md) — the same booking flow without a framework
- [FASTAPI-DEEP.md](../1-high-priority/FASTAPI-DEEP.md) — serving and streaming a graph from an API
- [AI-EVALS-DEEP.md](../1-high-priority/AI-EVALS-DEEP.md) — testing the model nodes
- [AI-AGENT-MEMORY-DEEP.md](../1-high-priority/AI-AGENT-MEMORY-DEEP.md) — long-term memory (LangGraph stores)
