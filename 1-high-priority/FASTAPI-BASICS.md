# FastAPI — Beginner's Guide (for Express Developers)

**Priority: HIGH**

> FastAPI is the most popular way to build an HTTP API in Python, and the usual way to put an
> AI agent behind an endpoint your React app can call. This guide maps everything to what you
> already know from Express: routes, params, body validation, errors, middleware, CORS, tests.
>
> Assumes you've built an Express API. Python basics help; see
> [PYTHON-DEEP.md](../3-low-priority/PYTHON-DEEP.md) §1 for the JS → Python mental model.
>
> The example app and its tests were run with FastAPI 0.162 and Pydantic 2 (November 2026).

---

## Table of Contents

- [FastAPI — Beginner's Guide (for Express Developers)](#fastapi--beginners-guide-for-express-developers)
  - [Table of Contents](#table-of-contents)
  - [1. What FastAPI Is](#1-what-fastapi-is)
  - [2. Setup](#2-setup)
  - [3. Your First App](#3-your-first-app)
  - [4. Express → FastAPI Cheat Map](#4-express--fastapi-cheat-map)
  - [5. Path and Query Parameters](#5-path-and-query-parameters)
  - [6. Request Bodies — Pydantic Models](#6-request-bodies--pydantic-models)
  - [7. Responses and Status Codes](#7-responses-and-status-codes)
  - [8. Errors](#8-errors)
  - [9. Dependencies — Reusable Route Logic](#9-dependencies--reusable-route-logic)
  - [10. `def` vs `async def`](#10-def-vs-async-def)
  - [11. CORS — Letting React Call It](#11-cors--letting-react-call-it)
  - [12. A Complete Example — Tasks API](#12-a-complete-example--tasks-api)
  - [13. Splitting Into Files — Routers](#13-splitting-into-files--routers)
  - [14. Testing](#14-testing)
  - [15. Config and Secrets](#15-config-and-secrets)
  - [16. Common Beginner Mistakes](#16-common-beginner-mistakes)
  - [17. Cheat Sheet](#17-cheat-sheet)
  - [Related Files](#related-files)

---

## 1. What FastAPI Is

```text
FastAPI = a Python web framework for building APIs. Think Express, but you DECLARE types
and FastAPI does three jobs you'd normally wire up by hand:‼️

  1. VALIDATION     Request bodies, params and headers are checked against your types.
                    Bad input → automatic 422 with a clear error. (Express: add Zod/Joi.)‼️
  2. CONVERSION     "?limit=5" arrives as the int 5, not the string "5".
  3. DOCS           An interactive API page at /docs, generated from your code.
                    (Express: hand-write a Swagger file.)

‼️ FASTAPI IN ONE SENTENCE
   Write normal Python functions with type hints. FastAPI turns them into validated,
   documented HTTP endpoints.‼️

WHY IT'S EVERYWHERE IN AI WORK
  The AI ecosystem (OpenAI/Anthropic SDKs, LangChain, LangGraph, PyTorch) is Python-first,
  so the API in front of an agent is usually Python too, and FastAPI is the default choice.
```

---

## 2. Setup

```bash
brew install uv                       # Python's fast package manager (≈ npm + nvm in one)

uv init my-api && cd my-api           # ≈ npm init — creates pyproject.toml (≈ package.json)
uv add "fastapi[standard]"            # ≈ npm install express  (+ server, CLI, test client)
uv add --dev pytest                   # ≈ npm install -D vitest

uv run fastapi dev main.py            # ≈ nodemon — dev server with auto-reload on :8000
uv run fastapi run main.py            # production mode (no reload)
uv run pytest                         # run tests
```

```text
WHAT `uv` IS DOING FOR YOU
  - Creates a VIRTUAL ENVIRONMENT (.venv/) — Python's per-project node_modules
  - Locks versions in uv.lock (≈ package-lock.json) — commit it
  - `uv run …` runs a command inside that environment, so you never "activate" anything

‼️ Add .venv/ to .gitignore, just like node_modules/.‼️
```

---

## 3. Your First App

```python
# main.py
from fastapi import FastAPI

app = FastAPI()                        # ≈ const app = express()

@app.get("/")                          # ≈ app.get('/', (req, res) => ...)
def home():
    return {"message": "Hello"}        # a dict is sent as JSON — no res.json() needed

@app.get("/hello/{name}")
def hello(name: str):
    return {"message": f"Hello {name}"}   # f"..." ≈ JS template literal `Hello ${name}`
```

```text
uv run fastapi dev main.py

  http://localhost:8000/hello/Harry  → {"message": "Hello Harry"}
  http://localhost:8000/docs         → interactive docs: every route, a "Try it out" button
  http://localhost:8000/openapi.json → the machine-readable spec (generate a TS client from it!)‼️

‼️ The @app.get(...) line is a DECORATOR. It registers the function below it as the handler
   for that route. That's the whole trick; there's no app.listen(), ‼️the CLI runs the server.‼️
```

---

## 4. Express → FastAPI Cheat Map

```text
  EXPRESS                                   FASTAPI
  ────────────────────────────────────────  ──────────────────────────────────────────────
  app.get('/tasks', handler)                @app.get("/tasks") above a function
  req.params.id                             a function argument named like {id} in the path
  req.query.limit                           a function argument NOT in the path
  req.body + Zod schema                     a function argument typed as a Pydantic model‼️
  req.headers['x-api-key']                  x_api_key: str = Header()
  res.json(obj)                             return obj
  res.status(201).json(obj)                 @app.post(..., status_code=201)
  res.status(404).json({ error })           raise HTTPException(404, "Not found")
  app.use(middleware)                       app.add_middleware(...) or a Depends() dependency
  router middleware (auth on some routes)   Depends(require_auth) on those routes
  express.Router()                          APIRouter()
  app.use('/tasks', tasksRouter)            app.include_router(tasks_router, prefix="/tasks")
  cors()                                    CORSMiddleware
  supertest(app)                            TestClient(app)
  nodemon index.js                          fastapi dev main.py

‼️ The big mindset shift: in Express you PULL data out of `req`. ‼️ In FastAPI you DECLARE
   function arguments, and FastAPI works out where each one comes from (path, query,
   body, header) and validates it before your function runs.‼️
```

---

## 5. Path and Query Parameters

```python
from fastapi import Query

@app.get("/tasks/{task_id}")            # {task_id} in the path → path parameter
def get_task(task_id: str):
    ...

@app.get("/tasks")                      # arguments NOT in the path → query parameters
def list_tasks(
    completed: bool | None = None,                     # optional: ?completed=true
    limit: int = Query(default=20, ge=1, le=100),      # default 20, must be 1–100
):
    ...
```

```text
  GET /tasks                      → completed=None, limit=20
  GET /tasks?completed=true       → completed=True     (the string "true" became a bool)
  GET /tasks?limit=5              → limit=5            (an int, not "5")
  GET /tasks?limit=0              → 422, "Input should be greater than or equal to 1"
  GET /tasks?limit=abc            → 422, "Input should be a valid integer"

  `bool | None = None`  means "a bool, or nothing; default nothing" (≈ TS `completed?: boolean`)
  Query(ge=1, le=100)   ge = greater-or-equal, le = less-or-equal
```

---

## 6. Request Bodies — Pydantic Models

```python
from pydantic import BaseModel, Field

# Pydantic ≈ Zod: a class that describes the shape, and validates data against it
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)

@app.post("/tasks")
def create_task(body: TaskCreate):      # typed as a model → read from the JSON body
    body.title                          # already validated, and editor autocomplete works
    ...
```

```text
  POST /tasks {"title": "Buy milk"}  → body = TaskCreate(title="Buy milk")
  POST /tasks {"title": ""}          → 422: "String should have at least 1 character"
  POST /tasks {}                     → 422: "Field required"
  POST /tasks {"title": 123}         → 422: "Input should be a valid string"

‼️ Your function never runs with bad data. No `if (!req.body.title) return res.status(400)…`
   at the top of every handler.‼️
```

```python
# SEPARATE MODELS FOR IN AND OUT — a very common pattern‼️
class TaskCreate(BaseModel):      # what the client SENDS (no id, no timestamps)
    title: str

class TaskUpdate(BaseModel):      # PATCH: every field optional
    title: str | None = None
    completed: bool | None = None

class Task(BaseModel):            # what the API RETURNS
    id: str
    title: str
    completed: bool
    created_at: datetime
```

---

## 7. Responses and Status Codes

```python
from fastapi import status

@app.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(body: TaskCreate):
    ...
    return task
```

```text
response_model=Task does two things:
  1. FILTERS — only fields in Task are sent. If your DB object has password_hash,
     it is stripped out. ‼️ This is a security feature, not just docs.‼️
  2. DOCUMENTS — /docs shows the exact response shape.

status_code=201 sets the success code. status.HTTP_201_CREATED is the same as 201, just
easier to read. Use 204 (no content) for DELETE and return nothing.
```

---

## 8. Errors

```python
from fastapi import HTTPException

@app.get("/tasks/{task_id}", response_model=Task)
def get_task(task_id: str):
    task = TASKS.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
```

```text
  → 404 {"detail": "Task not found"}

‼️ `raise`, not `return`.‼️ Raising stops the function immediately, from anywhere, even from
   inside a helper function called by the route. That's why other routes can call
   get_task(task_id) to reuse the 404 check.‼️

Error shapes you'll see:
  Your HTTPException     {"detail": "Task not found"}
  Validation failure     422 {"detail": [{"loc": ["body","title"], "msg": "...", ...}]}
  Unhandled exception    500 Internal Server Error (details only in the server log)
```

---

## 9. Dependencies — Reusable Route Logic

```text
A DEPENDENCY is a function FastAPI runs BEFORE your route, whose result (or error) is
handed to the route. It plays the part of Express middleware for "auth on these routes",
"get the current user", "open a DB session".
```

```python
from fastapi import Depends, Header, HTTPException

def require_api_key(x_api_key: str = Header()):   # reads the "x-api-key" header
    if x_api_key != "dev-secret":
        raise HTTPException(status_code=401, detail="Invalid API key")

# Option 1 — run it as a guard on a route
@app.delete("/tasks/{task_id}", status_code=204, dependencies=[Depends(require_api_key)])
def delete_task(task_id: str):
    ...

# Option 2 — use the value it returns
def get_current_user(authorization: str = Header()) -> User:
    user = decode_token(authorization)
    if user is None:
        raise HTTPException(status_code=401)
    return user

@app.get("/me")
def me(user: User = Depends(get_current_user)):     # ≈ req.user set by auth middleware
    return user
```

```text
Header() converts underscores: x_api_key ↔ the "x-api-key" header.

‼️ Dependencies are also what makes testing easy: in tests you can swap one out with
   app.dependency_overrides[get_current_user] = lambda: fake_user.‼️
```

---

## 10. `def` vs `async def`

```python
@app.get("/a")
def a():                     # FastAPI runs it in a thread pool, so blocking calls are OK‼️
    return slow_sync_call()

@app.get("/b")
async def b():               # runs on the event loop, like a Node handler
    data = await httpx_client.get("https://...")   # must only AWAIT async things
    return data.json()
```

```text
‼️ THE RULE
   - Calling async libraries (httpx, async DB drivers, AsyncOpenAI) → async def + await
   - Calling normal/blocking code (requests, the sync OpenAI client, time.sleep) → plain def
   - NEVER call blocking code inside async def. It freezes the event loop, and every
     other request waits, exactly like a synchronous loop in a Node handler.‼️

When unsure, plain `def` is the safe default. FastAPI handles it correctly.‼️
```

---

## 11. CORS — Letting React Call It

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # your Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)
```

```text
Without this, the browser blocks fetch() from localhost:5173 to localhost:8000 with a CORS
error, same as Express without cors(). List exact origins in production; don't use "*"
together with cookies or credentials.
```

---

## 12. A Complete Example — Tasks API

```python
# main.py — the same tasks API as this repo's Express server, in FastAPI
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Taskboard API")

# Let the React dev server (Vite on :5173) call this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas (Pydantic models) ─────────────────────────────────────────────────
class TaskCreate(BaseModel):            # what the client SENDS
    title: str = Field(min_length=1, max_length=200)

class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    completed: bool | None = None

class Task(BaseModel):                  # what the API RETURNS
    id: str
    title: str
    completed: bool
    created_at: datetime

# ── Fake database ─────────────────────────────────────────────────────────────
TASKS: dict[str, Task] = {}

# ── Dependency: a simple API-key check, reused by any route that needs it ─────
def require_api_key(x_api_key: str = Header()):
    if x_api_key != "dev-secret":
        raise HTTPException(status_code=401, detail="Invalid API key")

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/tasks", response_model=list[Task])
def list_tasks(completed: bool | None = None, limit: int = Query(default=20, ge=1, le=100)):
    tasks = list(TASKS.values())
    if completed is not None:
        tasks = [t for t in tasks if t.completed == completed]
    return tasks[:limit]

@app.get("/tasks/{task_id}", response_model=Task)
def get_task(task_id: str):
    task = TASKS.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(body: TaskCreate):
    task = Task(id=str(uuid4()), title=body.title, completed=False, created_at=datetime.now(timezone.utc))
    TASKS[task.id] = task
    return task

@app.patch("/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, body: TaskUpdate):
    task = get_task(task_id)                        # reuse the 404 logic‼️
    changes = body.model_dump(exclude_unset=True)   # only the fields the client sent‼️
    updated = task.model_copy(update=changes)
    TASKS[task_id] = updated
    return updated

@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_api_key)])
def delete_task(task_id: str):
    get_task(task_id)
    del TASKS[task_id]
```

```text
TWO LINES WORTH UNDERSTANDING
  body.model_dump(exclude_unset=True)
      ‼️ Turns the model into a dict, keeping only fields the client actually SENT.
      PATCH {"completed": true} → {"completed": True}; title is not touched.
      (Without exclude_unset you'd get {"title": None, "completed": True} and wipe the title.)‼️
  task.model_copy(update=changes)
      A new Task with those fields replaced ≈ { ...task, ...changes } in JS.‼️
```

---

## 13. Splitting Into Files — Routers

```python
# app/routers/tasks.py
from fastapi import APIRouter

router = APIRouter(prefix="/tasks", tags=["tasks"])    # ≈ express.Router()

@router.get("")                # → GET /tasks
def list_tasks(): ...

@router.get("/{task_id}")      # → GET /tasks/{task_id}
def get_task(task_id: str): ...
```

```python
# app/main.py
from fastapi import FastAPI
from app.routers import tasks

app = FastAPI()
app.include_router(tasks.router)       # ≈ app.use('/tasks', tasksRouter)
```

```text
A COMMON LAYOUT
  app/
    main.py          create app, middleware, include routers
    routers/         one file per resource (tasks.py, reviews.py)
    schemas.py       Pydantic models (request/response shapes)
    services/        business logic (e.g. the AI agent) — no HTTP code in here
    db.py            database setup
  tests/
  pyproject.toml

‼️ Keep routes thin: validate → call a service → return. Logic in services can be
   tested and reused without HTTP.‼️
```

---

## 14. Testing

```python
# test_main.py — uv run pytest
from fastapi.testclient import TestClient
from main import app, TASKS

client = TestClient(app)             # ≈ supertest(app) — no real server needed

def setup_function():
    TASKS.clear()                    # fresh "database" before each test

def test_create_and_get_task():
    res = client.post("/tasks", json={"title": "Write README"})
    assert res.status_code == 201
    task = res.json()
    assert task["title"] == "Write README"
    assert task["completed"] is False

    res = client.get(f"/tasks/{task['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == task["id"]

def test_empty_title_is_rejected():
    res = client.post("/tasks", json={"title": ""})
    assert res.status_code == 422

def test_missing_task_returns_404():
    assert client.get("/tasks/nope").status_code == 404

def test_patch_only_changes_sent_fields():
    task = client.post("/tasks", json={"title": "A"}).json()
    res = client.patch(f"/tasks/{task['id']}", json={"completed": True})
    assert res.json() == {**task, "completed": True}

def test_filter_and_limit():
    for t in ["a", "b", "c"]:
        client.post("/tasks", json={"title": t})
    assert len(client.get("/tasks?limit=2").json()) == 2
    assert client.get("/tasks?completed=true").json() == []
    assert client.get("/tasks?limit=0").status_code == 422

def test_delete_requires_api_key():
    task = client.post("/tasks", json={"title": "A"}).json()
    assert client.delete(f"/tasks/{task['id']}").status_code == 422          # header missing
    assert client.delete(f"/tasks/{task['id']}", headers={"x-api-key": "wrong"}).status_code == 401
    assert client.delete(f"/tasks/{task['id']}", headers={"x-api-key": "dev-secret"}).status_code == 204
```

```text
pytest basics for Vitest users
  - Any function named test_* in a file named test_*.py is a test — no describe/it‼️ T
  - Plain `assert` instead of expect(...).toBe(...); pytest shows a detailed diff on failure
  - setup_function() runs before each test (≈ beforeEach); pytest "fixtures" are the
    more powerful version

‼️ Note test_delete_requires_api_key: a MISSING required header is a 422 (validation),
   a WRONG one is our 401. Testing both catches surprises.‼️
```

---

## 15. Config and Secrets

```python
# Simple: environment variables (≈ process.env)
import os
API_KEY = os.getenv("LLM_API_KEY")                # None if not set‼️
MODEL = os.getenv("LLM_MODEL", "qwen2.5:7b")      # with a default‼️
```

```python
# Typed and validated: pydantic-settings (uv add pydantic-settings)
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")   # also reads a .env file
    llm_base_url: str = "http://localhost:11434/v1"
    llm_model: str = "qwen2.5:7b"
    llm_api_key: str = "ollama"

settings = Settings()        # reads LLM_BASE_URL, LLM_MODEL, LLM_API_KEY (case-insensitive)
```

```text
‼️ Same rules as Node: secrets in env vars / .env, .env in .gitignore, never commit keys.‼️
```

---

## 16. Common Beginner Mistakes

```text
‼️ 1. Blocking calls inside async def.
   time.sleep(), requests.get(), the sync OpenAI client → freezes every request.‼️
   Use plain def, or the async version of the library with await.

‼️ 2. Returning the error instead of raising it.
   return HTTPException(...) sends a 200 with a weird body. Use raise.‼️

‼️ 3. Forgetting response_model on routes that return DB objects.
   Internal fields (password_hash, internal notes) leak to the client.

‼️ 4. PATCH without exclude_unset=True.
   Fields the client didn't send become None and overwrite real data.‼️

‼️ 5. Expecting a 400 for bad input.
   FastAPI uses 422 for validation errors. Handle 422 in the frontend.

‼️ 6. Missing CORS.
   Works in /docs and curl, fails from React with a CORS error. Add CORSMiddleware.

‼️ 7. Business logic inside route functions.
   Put it in services/ so you can test it (and reuse it from an agent tool) without HTTP.‼️

‼️ 8. Mutable default arguments.‼️
   def f(items: list = []) shares ONE list across calls (a Python gotcha, not FastAPI's).‼️
   Use None and create the list inside, or Field(default_factory=list) in Pydantic.‼️
```

---

## 17. Cheat Sheet

```python
from fastapi import FastAPI, APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

app = FastAPI()

class ItemIn(BaseModel):                                  # request body
    name: str = Field(min_length=1)
    price: float = Field(gt=0)
    tags: list[str] = []                                  # OK in Pydantic (it copies defaults)

class ItemOut(ItemIn):                                    # response (inherits fields)
    id: int

@app.get("/items/{item_id}", response_model=ItemOut)     # path param
def get_item(item_id: int): ...

@app.get("/items")                                        # query params
def list_items(q: str | None = None, limit: int = Query(20, ge=1, le=100)): ...

@app.post("/items", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(body: ItemIn): ...                        # JSON body

raise HTTPException(status_code=404, detail="Not found")  # error

def auth(x_api_key: str = Header()): ...                  # dependency
@app.delete("/items/{item_id}", status_code=204, dependencies=[Depends(auth)])
def delete_item(item_id: int): ...

router = APIRouter(prefix="/items"); app.include_router(router)
```

```bash
uv add "fastapi[standard]"      # install
uv run fastapi dev main.py      # dev server → :8000, docs at /docs
uv run pytest                   # tests (TestClient)
```

---

## Related Files

- [FASTAPI-DEEP.md](FASTAPI-DEEP.md) — the next level: concurrency, DI, Pydantic v2, streaming, async SQLAlchemy, JWT, testing, deployment
- [AI-AGENTS-BASICS.md](AI-AGENTS-BASICS.md) — what AI agents are and how they work
- [AI-AGENTS-MORTGAGE-EXAMPLE.md](AI-AGENTS-MORTGAGE-EXAMPLE.md) — an agent project that ends with a FastAPI endpoint
- [EXPRESS-DEEP.md](EXPRESS-DEEP.md) — the Express side of every comparison here
- [NODEJS-REST-DEEP.md](NODEJS-REST-DEEP.md) — REST design (status codes, pagination, errors) applies unchanged
- [PYTHON-DEEP.md](../3-low-priority/PYTHON-DEEP.md) — Python syntax, async and packaging for JS developers
- [TESTING-BASICS.md](../2-medium-priority/TESTING-BASICS.md) — API testing ideas; supertest ↔ TestClient
