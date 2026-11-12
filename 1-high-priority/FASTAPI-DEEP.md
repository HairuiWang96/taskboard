# FastAPI — Senior Deep Reference

**Priority: HIGH**

> How FastAPI actually works and how to build production services with it: the ASGI and
> concurrency model, dependency injection, Pydantic v2, responses and streaming, errors and
> middleware, lifespan, async SQLAlchemy, JWT auth, testing, observability and deployment.
> Written for "you've used FastAPI — now explain it in an interview, and run it in production."
>
> New to FastAPI? Start with [FASTAPI-BASICS.md](FASTAPI-BASICS.md) (written for Express developers).
>
> Every code block here was run with FastAPI 0.162, Starlette 1.10, Pydantic 2.14, SQLAlchemy 2.1
> and Python 3.11 (November 2026), and the "real output" blocks are what it printed. FastAPI moves
> quickly: several features below (native SSE/JSON Lines streaming, built-in OpenTelemetry,
> Pydantic-native serialization) are recent. Check the release notes for your version.

---

## Table of Contents

- [FastAPI — Senior Deep Reference](#fastapi--senior-deep-reference)
  - [Table of Contents](#table-of-contents)
  - [1. What FastAPI Is Made Of](#1-what-fastapi-is-made-of)
  - [2. Concurrency — `def` vs `async def`, Measured](#2-concurrency--def-vs-async-def-measured)
  - [3. Dependency Injection, In Depth](#3-dependency-injection-in-depth)
  - [4. Pydantic v2, In Depth](#4-pydantic-v2-in-depth)
  - [5. Responses, Filtering and Streaming](#5-responses-filtering-and-streaming)
  - [6. Errors and Middleware](#6-errors-and-middleware)
  - [7. Lifespan and App State](#7-lifespan-and-app-state)
  - [8. Database — Async SQLAlchemy 2](#8-database--async-sqlalchemy-2)
  - [9. Authentication — OAuth2 Password Flow + JWT](#9-authentication--oauth2-password-flow--jwt)
  - [10. Project Structure and Settings](#10-project-structure-and-settings)
  - [11. Testing](#11-testing)
  - [12. WebSockets and File Uploads](#12-websockets-and-file-uploads)
  - [13. Observability — Built-In OpenTelemetry](#13-observability--built-in-opentelemetry)
  - [14. Deployment and Performance](#14-deployment-and-performance)
  - [15. Security Checklist](#15-security-checklist)
  - [16. FastAPI vs Express, NestJS, Django, Flask](#16-fastapi-vs-express-nestjs-django-flask)
  - [17. Interview Questions](#17-interview-questions)
  - [Related Files](#related-files)

---

## 1. What FastAPI Is Made Of

```text
FastAPI is a thin, well-designed layer over two libraries:

  STARLETTE   the web toolkit: routing, requests/responses, middleware, WebSockets,
              background tasks, TestClient. FastAPI's `app` IS a Starlette app.
  PYDANTIC    data validation and serialization (pydantic-core is written in Rust).
              Every parameter, body and return value goes through it.

FastAPI's own contribution is the glue: reading your function SIGNATURES (type hints,
defaults, Depends) and turning them into validation, dependency injection and an
OpenAPI schema — the /docs page is generated from the same information.

  ASGI        the interface between server and app (Python's async successor to WSGI).
              An ASGI app is just: async def app(scope, receive, send).
  UVICORN     the ASGI SERVER that speaks HTTP and calls your app. `fastapi dev` and
              `fastapi run` start uvicorn for you.
```

```text
THE LIFE OF ONE REQUEST

  uvicorn (HTTP parsing)
    → middleware stack (outermost first: errors, telemetry, YOUR middleware, exceptions)
      → router: match method + path
        → solve dependencies (cached per request, in dependency order)
          → validate path / query / header / cookie / body against your type hints
              ✗ invalid → 422 (RequestValidationError), your function never runs
          → call your function (async def: on the event loop · def: in a thread)
        → serialize the return value through the return type / response_model
      → yield-dependency cleanup (finally blocks) runs
    → background tasks run AFTER the response has been sent
```

```text
‼️ WHY IT'S "FAST"
   1. Runtime: Starlette + uvicorn are among the fastest Python web stacks, and
      validation/serialization happens in Rust (pydantic-core). It's fast FOR PYTHON —
      it doesn't beat Go or Rust, and your database usually dominates anyway.
   2. Development: types give you validation, editor autocomplete and API docs from one
      declaration. That's the bigger win in practice.‼️
```

---

## 2. Concurrency — `def` vs `async def`, Measured

```text
FastAPI runs on ONE event loop per worker process (like Node). How it runs your function
depends on how you declare it:

  async def endpoint   runs ON the event loop. Fine while you only `await` things.
                       A blocking call here freezes EVERY request on that worker.
  def endpoint         FastAPI runs it in a worker THREAD (AnyIO's pool, 40 threads by
                       default), so blocking calls are fine — up to 40 at once.
```

```python
import asyncio
import time

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool

app = FastAPI()


def slow_sdk_call() -> str:          # stands in for requests.get, a sync DB driver, the sync OpenAI client…
    time.sleep(0.5)
    return "done"


@app.get("/bad")
async def bad():                     # ✗ async def + blocking call → freezes the event loop
    return slow_sdk_call()


@app.get("/sync")
def good_sync():                     # ✓ plain def → FastAPI runs it in a worker thread
    return slow_sdk_call()


@app.get("/async")
async def good_async():              # ✓ async def + await → the loop serves others while waiting
    await asyncio.sleep(0.5)
    return "done"


@app.get("/mixed")
async def mixed():                   # ✓ async code that must call ONE blocking thing
    return await run_in_threadpool(slow_sdk_call)
```

```python
import asyncio, time
import httpx
from blocking import app

async def ten_at_once(path: str) -> float:
    transport = httpx.ASGITransport(app=app)       # call the app in-process, no server needed
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        start = time.perf_counter()
        await asyncio.gather(*(client.get(path) for _ in range(10)))
        return time.perf_counter() - start

for path in ["/bad", "/sync", "/async", "/mixed"]:
    print(f"{path:7} 10 concurrent requests of 0.5 s each: {asyncio.run(ten_at_once(path)):.1f} s")
```

```text
REAL OUTPUT
/bad    10 concurrent requests of 0.5 s each: 5.0 s     ← one at a time: the loop was frozen
/sync   10 concurrent requests of 0.5 s each: 0.5 s
/async  10 concurrent requests of 0.5 s each: 0.5 s
/mixed  10 concurrent requests of 0.5 s each: 0.5 s

‼️ THE RULE (memorise it — it's the #1 FastAPI interview question)
   - Using async libraries (httpx.AsyncClient, asyncpg, SQLAlchemy async, AsyncOpenAI)?
     → async def + await
   - Using sync libraries (requests, psycopg2, the sync OpenAI client, boto3)?
     → plain def, or `await run_in_threadpool(fn)` from inside async code
   - NEVER call blocking code directly in async def. /bad above is 10× slower, and in
     production it also stalls health checks, so the load balancer may kill the worker.‼️

CPU-BOUND WORK (image resizing, PDF parsing, ML inference on CPU)
   Threads don't help much because of the GIL (Python 3.14's free-threaded build changes
   this, but most deployments still use the default build). Options: a process pool
   (concurrent.futures.ProcessPoolExecutor), a job queue (Celery, ARQ, Dramatiq), or more
   worker processes.

THE THREAD POOL IS A LIMIT TOO
   40 threads by default means the 41st concurrent request to a `def` endpoint waits.
   If many sync endpoints do slow I/O, either move them to async libraries or raise the
   limit (anyio.to_thread.current_default_thread_limiter().total_tokens = 100, set in the
   lifespan) — and size your DB pool to match.
```

---

## 3. Dependency Injection, In Depth

```python
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request

LOG: list[str] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    LOG.append("startup")            # open pools, load models, warm caches
    app.state.settings = {"greeting": "hi"}
    yield
    LOG.append("shutdown")           # close pools, flush buffers


app = FastAPI(lifespan=lifespan)


# ── yield dependency: setup → value → cleanup (runs AFTER the response is built) ──
def get_db():
    LOG.append("db open")
    try:
        yield {"conn": "fake"}
    finally:
        LOG.append("db close")


# ── sub-dependency + per-request caching ─────────────────────────────────────
def get_current_user(x_user: Annotated[str | None, Header()] = None, db=Depends(get_db)):
    LOG.append("auth")
    if x_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"name": x_user}


CurrentUser = Annotated[dict, Depends(get_current_user)]   # reusable alias
DB = Annotated[dict, Depends(get_db)]


@app.get("/me")
def me(user: CurrentUser, db: DB, request: Request):
    # get_db is used twice (directly and via get_current_user) but runs ONCE per request
    return {"user": user["name"], "greeting": request.app.state.settings["greeting"]}


# ── class as a dependency: reusable query params ─────────────────────────────
class Pagination:
    def __init__(self, limit: int = 20, offset: int = 0):
        self.limit = min(limit, 100)
        self.offset = offset


@app.get("/items")
def items(page: Annotated[Pagination, Depends()]):  # Depends() with no arg = use the type
    return {"limit": page.limit, "offset": page.offset}
```

```text
REAL OUTPUT (TestClient, inside `with TestClient(app)`)
  lifespan:                       ['startup']
  GET /me  x-user: ada         →  {'user': 'ada', 'greeting': 'hi'}
                                  LOG: ['db open', 'auth', 'db close']
  GET /me  (no header)         →  401
                                  LOG: ['db open', 'auth', 'db close']     ← cleanup still ran
  GET /items?limit=500&offset=5 → {'limit': 100, 'offset': 5}
  dependency_overrides[get_current_user] = lambda: {'name': 'test-user'}
  GET /me                      →  {'user': 'test-user', 'greeting': 'hi'}
                                  LOG: ['db open', 'db close']              ← auth never ran
  after the `with` block:         'shutdown'
```

```text
WHAT THE OUTPUT PROVES

‼️ 1. PER-REQUEST CACHING. /me asks for get_db twice (directly, and inside
      get_current_user), but "db open" appears ONCE. FastAPI solves the dependency graph
      once per request and reuses each result. Opt out with Depends(fn, use_cache=False).

‼️ 2. yield DEPENDENCIES = SETUP + TEARDOWN. Code before `yield` runs before the endpoint;
      the `finally` runs after the response is built — EVEN WHEN THE REQUEST FAILED (the 401).
      This is how you guarantee DB sessions, locks and files are released.

   3. Annotated ALIASES (CurrentUser = Annotated[dict, Depends(get_current_user)]) are the
      recommended style: declare once, reuse in every endpoint, and the function signature
      still reads as plain type hints.

   4. CLASSES AS DEPENDENCIES. Depends() with no argument uses the annotated class; its
      __init__ parameters become query parameters (Pagination → ?limit=&offset=).

‼️ 5. dependency_overrides is the testing superpower: replace auth, the DB, an external
      client — anything injected — without patching imports. Clear it after each test.
```

```python
# APPLYING DEPENDENCIES TO MANY ROUTES AT ONCE
router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])  # every route in the router
app = FastAPI(dependencies=[Depends(verify_api_version)])                    # every route in the app

# Order of cleanup for yield dependencies: REVERSE of setup (like nested `with` blocks)
```

```text
DI vs NESTJS (if you know Nest)
  Nest: a container of SINGLETON providers wired by class type at startup.
  FastAPI: plain functions resolved PER REQUEST from the signature. No container, no
  decorators on providers, no module system. Singletons are just module-level objects
  (an engine, a client) or app.state, created in the lifespan.
```

---

## 4. Pydantic v2, In Depth

```python
from datetime import date
from typing import Annotated, Literal

from pydantic import (BaseModel, ConfigDict, Field, ValidationError, computed_field,
                      field_validator, model_validator)
from pydantic.alias_generators import to_camel


# ── camelCase JSON for a JS frontend, snake_case in Python ─────────────────────
class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# Annotated types = reusable constraints
Money = Annotated[float, Field(ge=0, le=1_000_000)]


class Booking(ApiModel):
    customer_name: str = Field(min_length=1)
    start_date: date
    end_date: date
    nightly_rate: Money

    @field_validator("customer_name")           # one field: clean it up / reject it
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip().title()

    @model_validator(mode="after")              # several fields together
    def check_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self

    @computed_field                             # derived, included in the output
    @property
    def nights(self) -> int:
        return (self.end_date - self.start_date).days


# ── Discriminated union: the "type" field picks the model ───────────────────
class CardPayment(BaseModel):
    type: Literal["card"]
    last4: str = Field(pattern=r"^\d{4}$")


class BankPayment(BaseModel):
    type: Literal["bank"]
    iban: str


class Order(BaseModel):
    payment: CardPayment | BankPayment = Field(discriminator="type")


# ── from_attributes: build a model from an ORM object (or any object) ─────────
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
```

```text
REAL OUTPUT
  Booking.model_validate({"customerName": "  ada lovelace ", "startDate": "2026-12-01",
                          "endDate": "2026-12-04", "nightlyRate": 120})
    .customer_name → 'Ada Lovelace'     (field_validator cleaned it)
    .nights        → 3                  (computed_field)
  .model_dump()                       → {'customer_name': 'Ada Lovelace', 'start_date':
                                          datetime.date(2026, 12, 1), …, 'nights': 3}
  .model_dump(by_alias=True, mode="json")
                                      → {'customerName': 'Ada Lovelace', 'startDate': '2026-12-01',
                                          'endDate': '2026-12-04', 'nightlyRate': 120.0, 'nights': 3}
  end before start                    → "Value error, end_date must be after start_date"
  Order {"payment": {"type": "bank", "iban": "DE89"}}  → BankPayment(type='bank', iban='DE89')
  Order {"payment": {"type": "card", "last4": "12"}}   → error at ('payment', 'card', 'last4'):
                                                          "String should match pattern '^\d{4}$'"
  UserOut.model_validate(obj with id, email, password_hash) → id=1 email='a@b.co'
  snake_case input also accepted      → nights 1      (populate_by_name=True)
```

```text
THE PARTS THAT MATTER IN PRODUCTION

  Validation vs serialization
    model_validate(data)        input → model (coerces "120" → 120.0 in lax mode)
    model_validate_json(str)    straight from JSON bytes — faster than json.loads + validate
    model_dump(mode="json")     model → JSON-safe dict (dates become strings)
    model_dump(exclude_unset=True)  only fields the client SENT — the correct PATCH pattern

  Validators
    @field_validator("x")       one field. mode="before" runs on the RAW input (e.g. split
                                a comma string into a list); default "after" gets the typed value
    @model_validator(mode="after")  cross-field rules (end after start)
    Annotated[float, Field(ge=0)]   reusable constrained types — define Money once

‼️ Discriminated unions (Field(discriminator="type")) are how you model "one of several
   shapes" — payments, events, LLM tool calls. Pydantic jumps straight to the right model by
   the tag, gives precise errors ('payment', 'card', 'last4'), and FastAPI documents it as
   oneOf in OpenAPI.

‼️ camelCase APIs: alias_generator=to_camel + populate_by_name=True gives a JS frontend
   camelCase JSON while Python stays snake_case. FastAPI outputs aliases by default
   (response_model_by_alias=True) — the real response from section 12's app:
   {'customerName': 'Ada', 'startDate': '2026-12-01', …, 'nights': 2}

  from_attributes=True   read from ORM objects / any object with attributes (section 8)
  Strict mode            ConfigDict(strict=True) or Field(strict=True): "120" is REJECTED
                         instead of coerced. Use for money and IDs where coercion hides bugs.
  v1 → v2 renames        .dict() → .model_dump(), .parse_obj() → .model_validate(),
                         @validator → @field_validator, class Config → model_config,
                         orm_mode → from_attributes
```

---

## 5. Responses, Filtering and Streaming

### The return type IS the response model

```python
# From web.py (section 6) — the stored user has a password hash; the client must never see it
class UserOut(BaseModel):          # what the client is allowed to see
    id: int
    email: EmailStr

class UserInDB(UserOut):           # what we store — includes the hash
    password_hash: str

@app.post("/users", status_code=201)
def create_user(body: UserIn, tasks: BackgroundTasks) -> UserOut:
    user = UserInDB(id=1, email=body.email, password_hash="argon2-hash…")
    tasks.add_task(send_welcome_email, user.email)
    return user                     # a UserInDB — but the return type is UserOut, so the hash is dropped
```

```text
REAL OUTPUT:  201 {'id': 1, 'email': 'ada@example.com'}       ← no password_hash

‼️ The return annotation (-> UserOut) does three jobs: validates what you return, FILTERS
   it to the declared fields, and documents it. response_model=UserOut does the same and
   wins if both are set (use it when you return a dict or ORM object whose type differs).

‼️ It's also the fast path: with a return type or response_model, FastAPI serializes
   straight to JSON bytes through Pydantic (in Rust). That's why ORJSONResponse /
   UJSONResponse are now deprecated — the default is already faster. Returning a raw
   JSONResponse skips validation AND filtering; only do it deliberately.

OTHER RESPONSE TOOLS
  status_code=201 / 204          on the decorator; 204 must return nothing
  response_model_exclude_unset   omit fields that were never set (sparse responses)
  Response / JSONResponse / HTMLResponse / RedirectResponse / FileResponse
                                 return directly for full control (headers, media type)
  response: Response parameter   set headers/cookies while still returning a model:
                                   def f(response: Response) -> X: response.set_cookie(...)
  BackgroundTasks                tasks.add_task(fn, args) runs AFTER the response is sent,
                                 in the same process — fine for emails/logging, NOT for
                                 anything that must survive a crash or take minutes
                                 (use a queue: Celery, ARQ, Dramatiq, RQ)
```

### Streaming — JSON Lines and Server-Sent Events (great for LLM tokens)

```python
import asyncio
from collections.abc import AsyncIterable
from fastapi import FastAPI
from fastapi.sse import EventSourceResponse, ServerSentEvent
from pydantic import BaseModel

app = FastAPI()

class Token(BaseModel):
    index: int
    text: str

@app.get("/tokens")
async def stream_tokens() -> AsyncIterable[Token]:
    for i, word in enumerate(["Hello", "from", "FastAPI"]):
        await asyncio.sleep(0.01)
        yield Token(index=i, text=word)

@app.get("/events", response_class=EventSourceResponse)
async def events() -> AsyncIterable[ServerSentEvent]:
    for i in range(3):
        yield ServerSentEvent(data={"step": i}, event="progress", id=str(i))
    yield ServerSentEvent(data="done", event="end")
```

```text
REAL OUTPUT
GET /tokens   content-type: application/jsonl
  {"index":0,"text":"Hello"}
  {"index":1,"text":"from"}
  {"index":2,"text":"FastAPI"}

GET /events   content-type: text/event-stream; charset=utf-8
  event: progress
  data: {"step": 0}
  id: 0

  event: progress
  data: {"step": 1}
  id: 1
  …
  event: end
  data: "done"

‼️ A path function that YIELDS streams: each item is validated against the AsyncIterable[...]
   type and sent as it's produced. Default format: JSON Lines (one JSON object per line).
   With response_class=EventSourceResponse: Server-Sent Events, which browsers read with
   `new EventSource(url)` and auto-reconnect (the `id` comes back as Last-Event-ID).
   SSE works over POST too — that's how MCP's HTTP transport streams.

   This is the natural way to stream an agent's progress or an LLM's tokens to a React UI:
   `async for chunk in llm_stream: yield ServerSentEvent(data=chunk, event="token")`.
   (Older code uses StreamingResponse with a hand-formatted "data: …\n\n" generator, or the
   sse-starlette package; both still work.)
```

---

## 6. Errors and Middleware

```python
import time
import uuid

from fastapi import BackgroundTasks, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

app = FastAPI()
ORDER: list[str] = []


# ── Middleware: runs around EVERY request. Last added = OUTERMOST (runs first) ──
@app.middleware("http")
async def timing(request: Request, call_next):
    ORDER.append("timing in")
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time-Ms"] = f"{(time.perf_counter() - start) * 1000:.1f}"
    ORDER.append("timing out")
    return response


@app.middleware("http")
async def request_id(request: Request, call_next):
    ORDER.append("request_id in")
    request.state.request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    ORDER.append("request_id out")
    return response


# ── Domain errors → one handler → consistent JSON ──────────────────────────────
class NotFound(Exception):
    def __init__(self, what: str):
        self.what = what


@app.exception_handler(NotFound)
async def not_found_handler(request: Request, exc: NotFound):
    return JSONResponse(status_code=404, content={
        "type": "not_found", "title": f"{exc.what} not found", "request_id": request.state.request_id})


# Reshape FastAPI's default 422 body into your API's error format
@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={
        "type": "validation_error",
        "errors": [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()],
    })


# ── Response filtering through the RETURN TYPE ────────────────────────────────
class UserIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):          # what the client is allowed to see
    id: int
    email: EmailStr


class UserInDB(UserOut):           # what we store — includes the hash
    password_hash: str


SENT: list[str] = []


def send_welcome_email(email: str):
    SENT.append(email)              # runs AFTER the response is sent


@app.post("/users", status_code=201)
def create_user(body: UserIn, tasks: BackgroundTasks) -> UserOut:
    user = UserInDB(id=1, email=body.email, password_hash="argon2-hash…")
    tasks.add_task(send_welcome_email, user.email)
    return user                     # a UserInDB — but the return type is UserOut, so the hash is dropped


@app.get("/users/{user_id}")
def get_user(user_id: int) -> UserOut:
    raise NotFound(f"User {user_id}")
```

```text
REAL OUTPUT
  POST /users {"email":"ada@example.com","password":"pw"}
    → 201 {'id': 1, 'email': 'ada@example.com'}    SENT (background task): ['ada@example.com']
    headers: X-Request-ID: bb07dc3c…   X-Process-Time-Ms: 2.3
  middleware order: ['request_id in', 'timing in', 'timing out', 'request_id out']
  GET /users/7  (X-Request-ID: abc)
    → {'type': 'not_found', 'title': 'User 7 not found', 'request_id': 'abc'}
  POST /users {"email":"nope"}
    → {'type': 'validation_error', 'errors': [
         {'field': 'email', 'message': 'value is not a valid email address: An email address must have an @-sign.'},
         {'field': 'password', 'message': 'Field required'}]}

‼️ MIDDLEWARE ORDER: the LAST middleware added is the OUTERMOST — it runs first on the way in
   and last on the way out. request_id was declared second, so it wraps timing. Rule of
   thumb: add the middleware that must see everything (request IDs, CORS, error capture)
   LAST.

‼️ ERRORS AS A CONTRACT
   - Raise domain exceptions (NotFound) in your code; map them to HTTP in ONE handler.
     Services stay free of HTTP concepts and the error shape is consistent everywhere.
   - Override RequestValidationError's handler to make 422s match your API's error format.
   - HTTPException is fine for simple cases; `detail` can be any JSON-serializable value.
   - Unhandled exceptions become a plain 500 — never leak stack traces to clients.

@app.middleware("http") vs PURE ASGI MIDDLEWARE
   The decorator style is easy and fine for headers/timing/logging. For streaming responses
   and maximum performance, write a pure ASGI middleware class (async def __call__(self,
   scope, receive, send)) and add it with app.add_middleware(...). Built-ins to know:
   CORSMiddleware, GZipMiddleware, TrustedHostMiddleware, HTTPSRedirectMiddleware.
```

---

## 7. Lifespan and App State

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP — runs once per worker process, before the first request
    app.state.http = httpx.AsyncClient(timeout=10)      # one shared client = one connection pool
    app.state.model = load_ml_model()                    # slow, so do it once
    yield
    # SHUTDOWN — runs on graceful stop (SIGTERM from Kubernetes, Ctrl-C)
    await app.state.http.aclose()
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

@app.get("/x")
async def x(request: Request):
    return (await request.app.state.http.get("https://example.com")).status_code
```

```text
‼️ - @app.on_event("startup"/"shutdown") is DEPRECATED — use lifespan.
   - Lifespan runs PER WORKER. With 4 workers you get 4 pools, 4 loaded models — size DB
     pools and memory with that in mind.
   - Create clients (httpx, Redis, DB engines) ONCE here, not per request. A new
     httpx.AsyncClient per request means a new connection pool and TLS handshake per request.
   - Tests: `with TestClient(app):` runs the lifespan; a bare TestClient(app) does NOT, and
     neither does httpx's ASGITransport (section 11 — this bites people).
```

---

## 8. Database — Async SQLAlchemy 2

```python
# app/db.py — SQLAlchemy 2.x, async
from collections.abc import AsyncIterator

from sqlalchemy import String
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config import get_settings

engine = create_async_engine(get_settings().database_url)          # ONE engine (= connection pool) per process
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str]


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(index=True)
    title: Mapped[str] = mapped_column(String(200))
    completed: Mapped[bool] = mapped_column(default=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """ONE session per request; always closed, even if the endpoint raises."""
    async with SessionLocal() as session:
        yield session
```

```python
# app/routers/tasks.py — every route here requires a logged-in user
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import Task, get_session
from app.security import CurrentUser

router = APIRouter(prefix="/tasks", tags=["tasks"])
Session = Annotated[AsyncSession, Depends(get_session)]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)   # build from the SQLAlchemy object
    id: int
    title: str
    completed: bool


@router.get("")
async def list_tasks(user: CurrentUser, session: Session) -> list[TaskOut]:
    rows = await session.scalars(select(Task).where(Task.owner_id == user.id).order_by(Task.id))
    return list(rows)


@router.post("", status_code=201)
async def create_task(body: TaskCreate, user: CurrentUser, session: Session) -> TaskOut:
    task = Task(owner_id=user.id, title=body.title)
    session.add(task)
    await session.commit()
    return task


@router.patch("/{task_id}/complete")
async def complete_task(task_id: int, user: CurrentUser, session: Session) -> TaskOut:
    task = await session.get(Task, task_id)
    # ‼️ 404 (not 403) for other users' tasks: don't reveal that the id exists
    if task is None or task.owner_id != user.id:
        raise HTTPException(404, "Task not found")
    task.completed = True
    await session.commit()
    return task
```

```text
‼️ SESSION PER REQUEST, ENGINE PER PROCESS
   The engine owns the connection pool: create it once (module level / lifespan). A session
   is a unit of work: one per request, from a yield dependency, so it's always closed.
   Never share a session between concurrent requests or tasks.

   expire_on_commit=False   after commit(), objects keep their loaded values. Without it,
                            touching task.title after commit triggers a LAZY RELOAD — which
                            in async SQLAlchemy raises MissingGreenlet instead of querying.
   from_attributes=True     lets the return type (TaskOut) read the ORM object directly.

‼️ THE ASYNC LAZY-LOADING TRAP
   Accessing an unloaded relationship (user.tasks) in async code doesn't silently run a
   query like sync SQLAlchemy — it errors. Load what you need up front:
     select(User).options(selectinload(User.tasks))
   That's also the cure for N+1 queries.

SCHEMA CHANGES: Alembic, not create_all
   create_all (used in this demo's lifespan) only creates MISSING tables. Real apps use
   Alembic migrations (alembic revision --autogenerate, alembic upgrade head), run in CI/CD
   before the new version starts.

ALTERNATIVES
   SQLModel   (by FastAPI's author) — one class is both the SQLAlchemy table and the Pydantic
              model. Less code; less separation between DB and API shapes.
   asyncpg / psycopg 3 directly — raw SQL, maximum control and speed.
   Sync SQLAlchemy is fine too: use `def` endpoints so it runs in the thread pool.
```

---

## 9. Authentication — OAuth2 Password Flow + JWT

```python
# app/security.py — password hashing + JWT access tokens
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt                                   # PyJWT
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash              # Argon2 by default (FastAPI's docs moved here from passlib)
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db import User, get_session

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")   # reads "Authorization: Bearer …"


def create_access_token(user_id: int, settings: Settings) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=settings.jwt_minutes)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token",
                                 headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])  # ‼️ always pin algorithms
    except jwt.InvalidTokenError:
        raise unauthorized
    user = await session.get(User, int(payload["sub"]))
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
```

```python
# app/main.py
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db import Base, User, engine, get_session
from app.routers.tasks import router as tasks_router
from app.security import create_access_token, password_hash


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:          # demo only — real apps use Alembic migrations
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()                      # close the connection pool on shutdown


app = FastAPI(title="Tasks API", lifespan=lifespan)
DUMMY_HASH = password_hash.hash("not-a-real-password")  # for timing-safe logins (below)
app.include_router(tasks_router)


class SignUp(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


@app.post("/auth/signup", status_code=201)
async def signup(body: SignUp, session: Annotated[AsyncSession, Depends(get_session)]) -> dict:
    if await session.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(409, "Email already registered")
    session.add(User(email=body.email, password_hash=password_hash.hash(body.password)))
    await session.commit()
    return {"ok": True}


# OAuth2PasswordRequestForm = form fields `username` + `password` (what /docs' "Authorize" sends)
@app.post("/auth/token")
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()],
                session: Annotated[AsyncSession, Depends(get_session)],
                settings: Annotated[Settings, Depends(get_settings)]) -> Token:
    user = await session.scalar(select(User).where(User.email == form.username))
    # Hash-check even when the email is unknown, so response time doesn't reveal which emails exist
    ok = password_hash.verify(form.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not ok:
        raise HTTPException(401, "Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return Token(access_token=create_access_token(user.id, settings))
```

```text
THE FLOW
  1. POST /auth/signup   {"email","password"}  → stores an Argon2 hash
  2. POST /auth/token    FORM fields username + password → {"access_token": "eyJ…"}
  3. Every other call    Authorization: Bearer eyJ…
     OAuth2PasswordBearer extracts the token (401 if missing); get_current_user verifies it
     and loads the user; CurrentUser injects it into any endpoint that needs a login.
  The "Authorize" button on /docs works out of the box because of tokenUrl="/auth/token".

‼️ DETAILS THAT MATTER (all in the code above)
   - jwt.decode(..., algorithms=["HS256"]) — ALWAYS pin the algorithm (blocks alg-confusion
     and "alg: none" tricks).
   - Short-lived access tokens (15 min); add a refresh-token flow (httpOnly cookie, rotation)
     for long sessions — see AUTH-DEEP.md.
   - pwdlib + Argon2 (PasswordHash.recommended()). FastAPI's docs moved off passlib, which is
     unmaintained.
   - Timing-safe login: verify against a dummy hash when the email is unknown, so the
     response time doesn't reveal which emails are registered.
   - Same 401 message for "no such user" and "wrong password".
   - Authorization by OWNERSHIP in the query (task.owner_id == user.id), returning 404 for
     other users' tasks so ids can't be probed.

   For machine-to-machine or third-party login, use an identity provider (Auth0, Cognito,
   Keycloak, Clerk…) and verify ITS JWTs (fetch its JWKS public keys) instead of issuing
   your own. Security(..., scopes=[...]) + SecurityScopes add OAuth2 scopes per endpoint.
```

---

## 10. Project Structure and Settings

```python
# app/config.py — typed settings from environment variables / .env
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    database_url: str = "sqlite+aiosqlite:///./app.db"
    jwt_secret: str = "change-me-in-production-please-32+chars"   # override via JWT_SECRET
    jwt_minutes: int = 15


@lru_cache  # read the environment once, reuse everywhere (and easy to override in tests)
def get_settings() -> Settings:
    return Settings()
```

```text
A LAYOUT THAT SCALES
  app/
    main.py            create the app, lifespan, include routers, exception handlers
    config.py          Settings (pydantic-settings) + get_settings()
    db.py              engine, session dependency, ORM models (or models/ for many)
    security.py        hashing, tokens, CurrentUser
    routers/           one module per resource: tasks.py, users.py, billing.py
    schemas/           Pydantic request/response models (keep separate from ORM models)
    services/          business logic — NO FastAPI imports; called by routers, workers, CLIs
  migrations/          Alembic
  tests/               conftest.py, test_*.py

‼️ Keep routers thin (validate → call service → return) and services framework-free. Then
   the same logic serves HTTP, a background worker, an AI agent's tool, or a CLI script.

‼️ get_settings() with @lru_cache reads the environment ONCE. Inject it with
   Depends(get_settings) so tests can swap it: app.dependency_overrides[get_settings] =
   lambda: Settings(jwt_minutes=1). Secrets come from env vars / a secret manager; .env is
   for local dev and is git-ignored.

VERSIONING: app.include_router(v1_router, prefix="/v1") — run v1 and v2 side by side.
```

---

## 11. Testing

```python
# conftest.py — pytest loads this first, automatically
import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"   # ‼️ BEFORE the app is imported

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:     # `with` runs the lifespan: creates tables, disposes the pool after
        yield c
    Path("test.db").unlink(missing_ok=True)   # a fresh database for every test
```

```python
# test_app.py — the `client` fixture comes from conftest.py


def login(client, email="ada@example.com", password="correct-horse-battery"):
    client.post("/auth/signup", json={"email": email, "password": password})
    token = client.post("/auth/token", data={"username": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_tasks_require_a_token(client):
    assert client.get("/tasks").status_code == 401


def test_full_flow(client):
    headers = login(client)
    created = client.post("/tasks", json={"title": "Write guide"}, headers=headers)
    assert created.status_code == 201
    task_id = created.json()["id"]
    assert client.patch(f"/tasks/{task_id}/complete", headers=headers).json()["completed"] is True
    assert client.get("/tasks", headers=headers).json() == [{"id": task_id, "title": "Write guide", "completed": True}]


def test_users_cannot_touch_each_others_tasks(client):
    ada = login(client)
    task_id = client.post("/tasks", json={"title": "Ada's"}, headers=ada).json()["id"]
    bob = login(client, email="bob@example.com")
    assert client.patch(f"/tasks/{task_id}/complete", headers=bob).status_code == 404
    assert client.get("/tasks", headers=bob).json() == []


def test_bad_password_and_bad_token(client):
    login(client)
    assert client.post("/auth/token", data={"username": "ada@example.com", "password": "wrong"}).status_code == 401
    assert client.get("/tasks", headers={"Authorization": "Bearer not-a-jwt"}).status_code == 401


def test_short_password_is_rejected(client):
    assert client.post("/auth/signup", json={"email": "x@example.com", "password": "short"}).status_code == 422
```

```text
REAL OUTPUT:   5 passed in 0.28s

WHAT THESE TESTS COVER (the cases interviewers ask about)
  - no token → 401;  bad token → 401;  wrong password → 401;  short password → 422
  - the full signup → login → create → complete → list flow
  - ownership: Bob can't complete or even see Ada's task (404, empty list)

‼️ THE SET-ENV-BEFORE-IMPORT TRICK
   db.py builds the engine at IMPORT time from settings. conftest.py sets DATABASE_URL
   before importing the app, so everything points at test.db. (Alternative: override
   get_session with a test session factory via dependency_overrides.)

ASYNC TESTS — httpx.AsyncClient + ASGITransport
  Use them when the test itself must await things (e.g. seeding with the async session).

    async with app.router.lifespan_context(app):            # ‼️ run the lifespan yourself
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/me", headers={"x-user": "ada"})

  REAL OUTPUT without the lifespan_context line:
    AttributeError: 'State' object has no attribute 'settings'
  ASGITransport does NOT run startup/shutdown. With it: 200 {'user': 'ada', 'greeting': 'hi'}.
  (The asgi-lifespan package's LifespanManager does the same job.) Async tests need an async
  runner: pytest-asyncio or AnyIO's pytest plugin (@pytest.mark.anyio).

  Mock OUTSIDE services (payment APIs, LLMs) with dependency_overrides or respx; use a REAL
  database (SQLite file for speed, or Postgres in a container via Testcontainers for fidelity).
```

---

## 12. WebSockets and File Uploads

```python
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect, HTTPException
from models import Booking

app = FastAPI()


@app.post("/bookings")
def create_booking(body: Booking) -> Booking:
    return body


MAX_BYTES = 5 * 1024 * 1024


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if file.content_type not in {"image/png", "image/jpeg"}:
        raise HTTPException(415, "Only PNG or JPEG")
    data = await file.read(MAX_BYTES + 1)          # never read an unbounded upload into memory
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large")
    return {"filename": file.filename, "bytes": len(data)}


@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            await websocket.send_json({"echo": text.upper()})
    except WebSocketDisconnect:
        pass                                        # client left — clean up subscriptions here
```

```text
REAL OUTPUT
  POST /bookings (camelCase body)  → {'customerName': 'Ada', 'startDate': '2026-12-01',
                                       'endDate': '2026-12-03', 'nightlyRate': 10.0, 'nights': 2}
  POST /upload a.png (14 bytes)    → {'filename': 'a.png', 'bytes': 14}
  POST /upload a.txt               → 415
  WebSocket: send "hello"          → {'echo': 'HELLO'}

‼️ UPLOADS
   - UploadFile spools to disk past a size threshold — memory-safe for big files, but
     read(n) with a cap; never read() an untrusted upload unbounded.
   - content_type comes from the CLIENT — check magic bytes / use a library for real
     validation, and set a max body size at the proxy (nginx client_max_body_size) too.
   - Large files: upload straight to S3 with a presigned URL; the API never touches the bytes.

‼️ WEBSOCKETS
   - Each connection lives on one worker. With several workers/servers, broadcast through
     Redis pub/sub (same as WEBSOCKETS-REALTIME-DEEP.md).
   - Authenticate on connect (token from a cookie or the first message), validate every
     incoming message with a Pydantic model, and handle WebSocketDisconnect to clean up.
   - For server → client only (progress, notifications, LLM tokens), SSE (section 5) is
     simpler and works through more proxies.
```

---

## 13. Observability — Built-In OpenTelemetry

```python
from fastapi import FastAPI
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

exporter = InMemorySpanExporter()                 # in production: OTLP exporter → your tracing backend
provider = TracerProvider()
provider.add_span_processor(SimpleSpanProcessor(exporter))

app = FastAPI(telemetry={"tracer_provider": provider})   # built-in OpenTelemetry


@app.get("/hello/{name}")
def hello(name: str):
    return {"hello": name}
```

```text
REAL OUTPUT — the spans FastAPI created for one GET /hello/ada
  fastapi.dependencies       {'code.function.name': 'telemetry_demo.hello'}
  fastapi.endpoint           {'code.function.name': 'telemetry_demo.hello'}
  fastapi.serialization      {'code.function.name': 'telemetry_demo.hello'}
  GET /hello/{name}          {'server.address': 'testserver', 'server.port': 80, 'url.path': '/hello/ada'}

‼️ Recent FastAPI has OpenTelemetry BUILT IN: request spans named by ROUTE TEMPLATE
   (GET /hello/{name} — low cardinality), plus spans for dependency solving, your endpoint
   and serialization, plus HTTP metrics and error logs. `fastapi[standard]` installs the
   OpenTelemetry SDK and OTLP exporter.

   FastAPI(telemetry={...}) options: tracer_provider / meter_provider / logger_provider,
   tracing, metrics, logs, operation_spans, exclude (skip e.g. /health), and auto_configure
   (OTLP exporters from the standard OTEL_* env vars; or set FASTAPI_OTEL_AUTO_CONFIGURE=true).
   Before this existed, the opentelemetry-instrumentation-fastapi package did the job — you'll
   see it in older code. Concepts: OPENTELEMETRY-BASICS.md.

ALSO LOG WELL
   Structured JSON logs with the request ID from section 6's middleware; never log tokens,
   passwords or full request bodies with personal data.
```

---

## 14. Deployment and Performance

```bash
fastapi run main.py --workers 4 --port 8000          # production: uvicorn, no reload
fastapi run main.py --proxy-headers                    # trust X-Forwarded-* from your load balancer
fastapi run main.py --root-path /api                   # served under a path prefix by a proxy
```

```dockerfile
FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev                          # dependencies first = cached layer
COPY . .
CMD ["uv", "run", "fastapi", "run", "app/main.py", "--port", "8000", "--proxy-headers"]
```

```text
HOW MANY WORKERS?
  On a VM: roughly one worker process per CPU core (more for I/O-heavy sync code).
  On Kubernetes / ECS: usually ONE worker per container and scale with replicas — the
  orchestrator does the process management, health checks and restarts. (Gunicorn with
  uvicorn workers was the classic setup; uvicorn's own --workers now covers most cases.)

‼️ POOL MATH: workers × replicas × DB pool size must stay under the database's
   max_connections. 4 workers × 10 replicas × pool 10 = 400 connections. Use PgBouncer or a
   smaller pool when it doesn't fit.

PERFORMANCE CHECKLIST
  ✓ No blocking calls in async def (section 2) — the most common FastAPI performance bug
  ✓ Shared clients and pools created in the lifespan (section 7)
  ✓ Return types / response_model set → fast Pydantic serialization (section 5)
  ✓ Paginate list endpoints; selectinload to avoid N+1 (section 8)
  ✓ Cache hot reads (Redis) and put a CDN in front of static/public responses
  ✓ uvicorn[standard] (uvloop + httptools) — installed by fastapi[standard]
  ✓ Profile before optimising: py-spy (sampling profiler) and your traces (section 13)

GRACEFUL SHUTDOWN
  On SIGTERM uvicorn stops accepting connections, finishes in-flight requests, then runs
  the lifespan shutdown. Give it time (Kubernetes terminationGracePeriodSeconds) and don't
  rely on BackgroundTasks for work that must not be lost.
```

---

## 15. Security Checklist

```text
  [ ] Every input is a typed parameter or Pydantic model (FastAPI validates it for you)
  [ ] Response models / return types on every endpoint that returns DB objects
      (no password_hash, internal flags or other users' fields leaking)
  [ ] Ownership checks in the query (WHERE owner_id = current user); 404 for others' records
  [ ] JWT: pinned algorithms, short expiry, secret from env/secret manager (≥ 32 bytes)
  [ ] Passwords: Argon2 via pwdlib; timing-safe login; rate-limit /auth endpoints
      (slowapi, or at the gateway)
  [ ] CORS: explicit origins, never "*" with credentials
  [ ] TrustedHostMiddleware and HTTPS at the edge; --proxy-headers only behind a trusted proxy
  [ ] Body size limits at the proxy; capped reads for uploads
  [ ] Disable /docs and /openapi.json in production if the API isn't public
      (FastAPI(docs_url=None, redoc_url=None, openapi_url=None))
  [ ] Parameterised queries only (SQLAlchemy does this; never f-string SQL)
  [ ] Dependency scanning (pip-audit / Dependabot) and pinned versions (uv.lock)
  [ ] Unhandled errors return a generic 500; details go to logs/traces, not the client
```

---

## 16. FastAPI vs Express, NestJS, Django, Flask

```text
                 FastAPI              Express           NestJS            Django (+DRF)        Flask
  Language       Python               JS/TS             TS                Python               Python
  Model          async (ASGI)         async (Node loop) async (Node)      sync-first (ASGI     sync (WSGI)
                                                                          support added)
  Validation     built in (Pydantic)  add Zod/Joi       class-validator   DRF serializers      add a library
  API docs       automatic OpenAPI    add a library     @nestjs/swagger   add a library        add a library
  DI             per-request          none              container,        none                 none
                 functions                              singletons
  ORM            your choice          your choice       TypeORM/Prisma…   built in             your choice
  Admin, auth    no                   no                no                YES (batteries)      no
  Best for       APIs, ML/AI          APIs, JS teams    large structured  full web apps,       small apps,
                 services, typed                        TS backends       admin-heavy CRUD     legacy
                 Python backends

‼️ The one-line pitch: FastAPI is the default for Python APIs — especially in front of ML
   models and AI agents, because the AI ecosystem is Python-first. Django wins when you
   want an admin, auth and an ORM out of the box for a full web product.‼️
```

---

## 17. Interview Questions

```text
Q: def or async def — how do you choose?
A: async def only if everything I call inside is awaitable (httpx.AsyncClient, asyncpg,
   async SQLAlchemy). If I use a blocking library, plain def — FastAPI runs it in a thread
   pool — or run_in_threadpool for one call inside async code. A blocking call in async def
   freezes the worker's event loop: 10 concurrent 0.5 s requests take 5 s instead of 0.5 s.

Q: How does dependency injection work in FastAPI?
A: Dependencies are callables in the function signature via Depends. FastAPI builds the
   graph from type hints, solves it once per request (results are cached within the request),
   and validates their parameters like an endpoint's. yield dependencies give setup/teardown
   with cleanup that runs even on errors — the standard way to manage DB sessions. In tests,
   app.dependency_overrides swaps any dependency.

Q: How do you stop sensitive fields leaking in responses?
A: Separate input, DB and output models, and declare the output via the return type or
   response_model. FastAPI validates and filters the return value to that model, so a
   password_hash on the DB object never reaches the client.

Q: How would you stream LLM output to a browser?
A: A path function that yields, with response_class=EventSourceResponse: each chunk becomes
   an SSE event the browser reads with EventSource. Or JSON Lines by default. Async
   generator, async client for the LLM, and handle client disconnects.

Q: Where do startup resources go, and why not create a client per request?
A: In the lifespan context manager, stored on app.state or module level: DB engines, HTTP
   clients, loaded models. They hold connection pools; creating one per request wastes
   connections and TLS handshakes. Lifespan runs per worker, so pools multiply by workers.

Q: How do you test a FastAPI app?
A: TestClient (inside `with` so the lifespan runs) or httpx.AsyncClient with ASGITransport
   for async tests — remembering ASGITransport doesn't run the lifespan. dependency_overrides
   for auth and external services; a real database for persistence tests; one test per
   security rule (401s, 404 on others' data, 422s).

Q: What's in a FastAPI request's lifecycle?
A: uvicorn → middleware (last added is outermost) → routing → dependency solving →
   parameter validation (422 on failure) → endpoint → response validation/serialization →
   yield-dependency cleanup → background tasks after the response is sent.

Q: Pydantic v2 — what changed and why does it matter?
A: The core was rewritten in Rust (pydantic-core): much faster validation and serialization,
   which FastAPI now uses to serialize responses straight to JSON. APIs renamed (model_dump,
   model_validate, field_validator, model_config). Stricter, clearer errors, discriminated
   unions, computed fields.
```

---

## Related Files

- [FASTAPI-BASICS.md](FASTAPI-BASICS.md) — the beginner guide, mapped to Express
- [AI-AGENTS-DELIVERY-QUOTE.md](AI-AGENTS-DELIVERY-QUOTE.md) — a FastAPI app serving an AI agent (sessions, bookings, tests)
- [AI-AGENTS-MORTGAGE-EXAMPLE.md](AI-AGENTS-MORTGAGE-EXAMPLE.md) — a simpler agent behind FastAPI
- [PYTHON-DEEP.md](../3-low-priority/PYTHON-DEEP.md) — Python language depth (async, typing, packaging)
- [AUTH-DEEP.md](../2-medium-priority/AUTH-DEEP.md) — sessions vs JWT, refresh tokens, OAuth/OIDC
- [NESTJS-DEEP.md](../2-medium-priority/NESTJS-DEEP.md) — the TypeScript framework FastAPI is most often compared with
- [OPENTELEMETRY-BASICS.md](../2-medium-priority/OPENTELEMETRY-BASICS.md) — tracing concepts behind section 13
- [WEBSOCKETS-REALTIME-DEEP.md](../2-medium-priority/WEBSOCKETS-REALTIME-DEEP.md) — scaling WebSockets and SSE
