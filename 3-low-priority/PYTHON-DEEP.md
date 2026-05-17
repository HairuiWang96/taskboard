# Python — Senior Developer Deep Reference
**Priority: MEDIUM**

> Python as a general-purpose language: syntax, data structures, OOP, functional patterns, async, stdlib, packaging, and interview questions. See AI-ML-DEEP.md for data science / machine learning.

---

## Table of Contents

1. [Python vs JavaScript — Mental Model](#1-python-vs-javascript--mental-model)
2. [Core Types & Data Structures](#2-core-types--data-structures)
3. [Functions — Deep Cuts](#3-functions--deep-cuts)
4. [OOP in Python](#4-oop-in-python)
5. [Iterators, Generators & Comprehensions](#5-iterators-generators--comprehensions)
6. [Error Handling](#6-error-handling)
7. [Async Python](#7-async-python)
8. [The Standard Library](#8-the-standard-library)
9. [Packaging & Environments](#9-packaging--environments)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. Python vs JavaScript — Mental Model

```text
If you know JavaScript, here's the mental map:

Concept             JavaScript              Python
─────────────────────────────────────────────────────────
Null                null / undefined        None
Falsy values        0, '', null, undefined, NaN, false    0, '', None, [], {}, False
String template     `Hello ${name}`         f"Hello {name}"
Arrow function      (x) => x * 2           lambda x: x * 2
Array               []                      list []
Object / Map        {} / Map                dict {}
Set                 Set                     set {}
Destructuring       const [a, b] = arr      a, b = arr
Spread              [...arr]                [*arr]
Optional chain      obj?.prop               obj.get('prop') or getattr(obj, 'prop', None)
typeof              typeof x                type(x)
instanceof          x instanceof Foo        isinstance(x, Foo)
try/catch/finally   try/catch/finally       try/except/finally
async/await         async/await             async/await (same!)
module export       export const fn         (just define it — import the name)
module import       import { fn } from...   from module import fn
class               class Foo extends Bar   class Foo(Bar):
interface           interface / type        Protocol (typing module)
enum                enum (TS)               Enum class
```

### Key differences from JS

```python
# Indentation IS the syntax (no braces)
if condition:
    do_something()  # 4 spaces — standard

# Everything is an object (including functions and classes)
def greet(name):
    return f"Hello, {name}"

type(greet)       # <class 'function'>
greet.custom_attr = "I can add attributes to functions"

# Multiple assignment (tuple unpacking)
a, b = 1, 2
a, b = b, a      # swap — no temp variable needed
first, *rest = [1, 2, 3, 4]  # first=1, rest=[2,3,4]

# Truthiness: empty containers are falsy
bool([])    # False
bool({})    # False
bool("")    # False
bool(0)     # False
bool(None)  # False
# Non-empty containers are truthy
bool([0])   # True (list with one element — even if element is falsy)

# Integer division
10 / 3    # 3.3333... (always float in Python 3)
10 // 3   # 3 (floor division)
10 % 3    # 1 (modulo)
2 ** 10   # 1024 (exponentiation — not Math.pow())
```

---

## 2. Core Types & Data Structures

### Strings

```python
# f-strings (Python 3.6+) — the standard
name = "Alice"
age  = 30
f"Name: {name}, Age: {age}"           # "Name: Alice, Age: 30"
f"Pi is approximately {3.14159:.2f}"  # "Pi is approximately 3.14"
f"{name!r}"                           # repr() — "Alice" (with quotes)
f"{1_000_000:,}"                      # "1,000,000" (thousands separator)

# Common string methods
s = "  Hello, World!  "
s.strip()           # "Hello, World!" (remove whitespace)
s.lower()           # "  hello, world!  "
s.upper()
s.replace("World", "Python")
s.split(", ")       # ["  Hello", "World!  "]
", ".join(["a", "b", "c"])  # "a, b, c"
s.startswith("  He") # True
s.find("World")     # index of first match (or -1)
"42".zfill(5)       # "00042" (zero-pad)

# Multiline strings
text = """
This is a
multiline string
"""

# String is immutable — can't modify in place
s[0] = "h"  # TypeError
```

### Lists

```python
# Lists are ordered, mutable, allow duplicates
items = [1, 2, 3, 4, 5]

# Slicing [start:stop:step] — doesn't modify original
items[1:3]    # [2, 3]
items[::-1]   # [5, 4, 3, 2, 1] — reversed
items[::2]    # [1, 3, 5] — every other
items[-1]     # 5 — last element

# Mutation
items.append(6)          # add to end
items.extend([7, 8])     # add multiple
items.insert(0, 0)       # insert at index
items.pop()              # remove and return last
items.pop(0)             # remove and return by index
items.remove(3)          # remove first occurrence of value
items.sort()             # in-place sort
items.sort(reverse=True)
items.sort(key=lambda x: x.name)  # sort by field

# Non-mutating
sorted(items)             # returns new sorted list
sorted(items, reverse=True)
list(reversed(items))     # returns new reversed list
len(items)                # length

# List is mutable — beware of aliasing
a = [1, 2, 3]
b = a          # b IS a — same object
b.append(4)
print(a)       # [1, 2, 3, 4] — a was mutated!

b = a.copy()   # shallow copy
b = a[:]       # also shallow copy
import copy
b = copy.deepcopy(a)  # deep copy
```

### Dictionaries

```python
# Dicts are ordered (insertion order, Python 3.7+), mutable, unique keys
user = {"name": "Alice", "age": 30, "role": "admin"}

# Access
user["name"]              # "Alice" — KeyError if missing
user.get("name")          # "Alice" — None if missing
user.get("email", "N/A")  # "N/A" — default if missing

# Mutation
user["email"] = "alice@example.com"  # add or update
del user["age"]                       # delete
user.pop("role")                      # remove and return
user.update({"city": "NY", "age": 31}) # merge (mutates)

# Iteration
user.keys()    # dict_keys(['name', 'email', ...])
user.values()
user.items()   # dict_items([('name', 'Alice'), ...])

for key, value in user.items():
    print(f"{key}: {value}")

# Check membership
"name" in user      # True (checks keys)
"Alice" in user     # False (values not checked)

# Merge (Python 3.9+)
merged = {**dict1, **dict2}  # spread (last key wins)
merged = dict1 | dict2        # pipe operator (Python 3.9+)

# defaultdict — auto-initializes missing keys
from collections import defaultdict
word_count = defaultdict(int)
for word in words:
    word_count[word] += 1  # no KeyError on first access

# Counter — count occurrences
from collections import Counter
counts = Counter(["a", "b", "a", "c", "a"])
counts.most_common(2)  # [("a", 3), ("b", 1)]
```

### Sets & Tuples

```python
# Set: unordered, unique elements
tags = {"python", "web", "api"}
tags.add("docker")
tags.discard("web")   # remove if exists (no error if missing)
tags.remove("web")    # remove — KeyError if missing
"python" in tags      # O(1) lookup

# Set operations
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}
a | b    # union:        {1, 2, 3, 4, 5, 6}
a & b    # intersection: {3, 4}
a - b    # difference:   {1, 2}
a ^ b    # symmetric difference: {1, 2, 5, 6}

# Tuple: ordered, IMMUTABLE, allow duplicates
point = (3, 4)
x, y = point          # unpacking
point[0]              # 3
point[0] = 5          # TypeError — immutable

# Named tuple (like a lightweight struct)
from collections import namedtuple
Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
p.x    # 3
p._asdict()  # {'x': 3, 'y': 4}

# dataclass (modern, more powerful)
from dataclasses import dataclass, field
@dataclass
class Point:
    x: float
    y: float
    label: str = "unnamed"  # default value
    tags: list = field(default_factory=list)  # mutable default

p = Point(3.0, 4.0)
p.x      # 3.0
```

---

## 3. Functions — Deep Cuts

### Arguments

```python
# Positional and keyword arguments
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

greet("Alice")              # "Hello, Alice!"
greet("Alice", "Hi")        # "Hi, Alice!"
greet(greeting="Hey", name="Alice")  # keyword — any order

# *args: collect extra positional args as tuple
def sum_all(*args):
    return sum(args)

sum_all(1, 2, 3, 4)  # 10

# **kwargs: collect extra keyword args as dict
def create_user(name, **kwargs):
    return {"name": name, **kwargs}

create_user("Alice", role="admin", age=30)
# {"name": "Alice", "role": "admin", "age": 30}

# Keyword-only arguments (after *)
def connect(host, port, *, timeout=30, retry=True):
    pass

connect("localhost", 5432, timeout=60)  # ✓
connect("localhost", 5432, 60)          # TypeError — timeout must be keyword

# Positional-only arguments (before /, Python 3.8+)
def divide(a, b, /):
    return a / b

divide(10, 2)          # ✓
divide(a=10, b=2)      # TypeError — a and b are positional-only

# Unpacking when calling
args = [1, 2, 3]
sum_all(*args)          # same as sum_all(1, 2, 3)

kwargs = {"name": "Alice", "age": 30}
create_user(**kwargs)   # same as create_user(name="Alice", age=30)
```

### Closures and decorators

```python
# Closure: function remembers its enclosing scope
def make_multiplier(factor):
    def multiply(n):
        return n * factor  # captures 'factor'
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
double(5)  # 10
triple(5)  # 15

# Decorator: function that wraps another function
import functools
import time

def timer(func):
    @functools.wraps(func)  # preserve original function's metadata
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"{func.__name__} took {end - start:.4f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)

slow_function()  # "slow_function took 1.0001s"
# @timer is sugar for: slow_function = timer(slow_function)

# Decorator with arguments
def retry(max_attempts=3, delay=1):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(max_attempts=5, delay=2)
def fetch_data():
    pass
```

### Lambda & functional tools

```python
# Lambda: anonymous function (one expression only)
square  = lambda x: x ** 2
add     = lambda x, y: x + y

# Most useful inline (as argument)
items.sort(key=lambda x: x.age)
sorted(users, key=lambda u: (u.role, u.name))  # sort by multiple fields

# map, filter, reduce
numbers = [1, 2, 3, 4, 5]
list(map(lambda x: x * 2, numbers))    # [2, 4, 6, 8, 10]
list(filter(lambda x: x % 2 == 0, numbers))  # [2, 4]

from functools import reduce
reduce(lambda acc, x: acc + x, numbers, 0)  # 15

# In Python, prefer list comprehensions over map/filter (more readable)
[x * 2 for x in numbers]            # same as map
[x for x in numbers if x % 2 == 0]  # same as filter
```

---

## 4. OOP in Python

### Classes

```python
class Animal:
    # Class variable (shared by all instances)
    species_count = 0

    def __init__(self, name: str, age: int):
        # Instance variables
        self.name = name
        self.age = age
        Animal.species_count += 1

    def __repr__(self):
        """Unambiguous string — for debugging"""
        return f"Animal(name={self.name!r}, age={self.age})"

    def __str__(self):
        """Readable string — for print()"""
        return f"{self.name} ({self.age} years old)"

    def __eq__(self, other):
        return isinstance(other, Animal) and self.name == other.name

    def __lt__(self, other):
        return self.age < other.age

    def speak(self) -> str:
        raise NotImplementedError  # abstract method (or use ABC)

    @classmethod
    def from_dict(cls, data: dict) -> "Animal":
        """Alternative constructor"""
        return cls(data["name"], data["age"])

    @staticmethod
    def is_valid_age(age: int) -> bool:
        """Utility — doesn't need self or cls"""
        return 0 <= age <= 150

class Dog(Animal):
    def __init__(self, name: str, age: int, breed: str):
        super().__init__(name, age)  # call parent constructor
        self.breed = breed

    def speak(self) -> str:
        return "Woof!"

dog = Dog("Rex", 3, "Husky")
print(dog)           # Rex (3 years old) — uses __str__
repr(dog)            # Animal(name='Rex', age=3) — uses __repr__
isinstance(dog, Animal)  # True
isinstance(dog, Dog)     # True
```

### Properties and private attributes

```python
class BankAccount:
    def __init__(self, initial_balance: float):
        self._balance = initial_balance  # convention: "private" (not enforced)
        self.__secret = "really private"  # name-mangled to _BankAccount__secret

    @property
    def balance(self) -> float:
        """Read-only property"""
        return self._balance

    @balance.setter
    def balance(self, value: float):
        if value < 0:
            raise ValueError("Balance cannot be negative")
        self._balance = value

    @balance.deleter
    def balance(self):
        self._balance = 0

account = BankAccount(100)
account.balance          # 100 (calls getter)
account.balance = 200    # calls setter
del account.balance      # calls deleter
account.balance = -50    # ValueError
```

### Abstract base classes

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

    @abstractmethod
    def perimeter(self) -> float: ...

    def describe(self) -> str:
        return f"Area: {self.area():.2f}, Perimeter: {self.perimeter():.2f}"

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        return 3.14159 * self.radius ** 2

    def perimeter(self) -> float:
        return 2 * 3.14159 * self.radius

# Shape()  # TypeError — cannot instantiate abstract class
circle = Circle(5)  # ✓
circle.describe()
```

### Dataclasses (modern, preferred)

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Task:
    id: str
    title: str
    completed: bool = False
    tags: list[str] = field(default_factory=list)
    parent_id: Optional[str] = None

    def complete(self) -> "Task":
        return Task(self.id, self.title, True, self.tags, self.parent_id)

@dataclass(frozen=True)  # immutable — generates __hash__
class Point:
    x: float
    y: float

@dataclass(order=True)   # generates __lt__, __le__, __gt__, __ge__
class Priority:
    level: int
    name: str

# Auto-generates: __init__, __repr__, __eq__
# frozen=True also generates: __hash__
# order=True also generates: comparison methods
```

---

## 5. Iterators, Generators & Comprehensions

### Comprehensions

```python
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# List comprehension
evens   = [x for x in numbers if x % 2 == 0]      # [2, 4, 6, 8, 10]
squares = [x ** 2 for x in numbers]                 # [1, 4, 9, ...]

# Nested
matrix   = [[1,2,3],[4,5,6],[7,8,9]]
flat     = [x for row in matrix for x in row]       # [1,2,3,4,5,6,7,8,9]

# Dict comprehension
squared  = {x: x**2 for x in range(5)}              # {0:0, 1:1, 2:4, 3:9, 4:16}
inverted = {v: k for k, v in original.items()}      # swap keys and values

# Set comprehension
unique_lengths = {len(word) for word in words}

# Generator expression (lazy — doesn't build a list in memory)
total = sum(x**2 for x in range(1_000_000))         # only one value in memory at a time
```

### Generators

```python
# Generator function: yields values one at a time — pauses between yields
def fibonacci():
    a, b = 0, 1
    while True:
        yield a            # pause and return a
        a, b = b, a + b    # resume here on next()

fib = fibonacci()
next(fib)   # 0
next(fib)   # 1
next(fib)   # 1
next(fib)   # 2

# Take first N values from an infinite generator
import itertools
list(itertools.islice(fibonacci(), 10))  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# File reading without loading all into memory
def read_large_file(path):
    with open(path) as f:
        for line in f:
            yield line.strip()

for line in read_large_file("huge.csv"):
    process(line)           # processes one line at a time — constant memory

# yield from — delegate to another iterable
def chain(*iterables):
    for iterable in iterables:
        yield from iterable  # same as: for item in iterable: yield item

list(chain([1,2], [3,4], [5]))  # [1, 2, 3, 4, 5]
```

### The itertools module

```python
import itertools

# Infinite iterators
itertools.count(10)             # 10, 11, 12, ...
itertools.cycle([1, 2, 3])      # 1, 2, 3, 1, 2, 3, ...
itertools.repeat("x", 3)        # "x", "x", "x"

# Combinatorics
itertools.combinations([1,2,3], 2)        # (1,2), (1,3), (2,3)
itertools.permutations([1,2,3], 2)        # (1,2), (1,3), (2,1), (2,3), (3,1), (3,2)
itertools.product([1,2], ["a","b"])       # (1,"a"), (1,"b"), (2,"a"), (2,"b")

# Grouping
data = [("a", 1), ("a", 2), ("b", 3), ("b", 4)]
for key, group in itertools.groupby(data, key=lambda x: x[0]):
    print(key, list(group))  # "a" [("a",1), ("a",2)] | "b" [("b",3), ("b",4)]
# Note: groupby only groups consecutive equal elements — sort first!
```

---

## 6. Error Handling

```python
# Python exception hierarchy
# BaseException
#   SystemExit, KeyboardInterrupt
#   Exception
#     TypeError, ValueError, KeyError, IndexError
#     FileNotFoundError, PermissionError (IOError subclasses)
#     RuntimeError, NotImplementedError
#     AttributeError, NameError

try:
    result = 10 / 0
except ZeroDivisionError as e:
    print(f"Math error: {e}")
except (TypeError, ValueError) as e:   # catch multiple types
    print(f"Type or value error: {e}")
except Exception as e:
    print(f"Unexpected error: {type(e).__name__}: {e}")
    raise  # re-raise after logging
else:
    print("No exception occurred")     # runs if NO exception was raised
finally:
    print("Always runs")               # cleanup

# Custom exceptions
class AppError(Exception):
    """Base exception for this application"""

class ValidationError(AppError):
    def __init__(self, field: str, message: str):
        self.field = field
        super().__init__(f"Validation error on '{field}': {message}")

class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        self.resource = resource
        self.id = id
        super().__init__(f"{resource} with id '{id}' not found")

try:
    raise NotFoundError("User", "123")
except NotFoundError as e:
    print(e.resource, e.id)   # User  123

# Context managers (with statement) — ensure cleanup
with open("file.txt") as f:    # f.close() called even if exception
    content = f.read()

# Custom context manager
from contextlib import contextmanager

@contextmanager
def timer(label: str):
    start = time.perf_counter()
    try:
        yield          # code inside 'with' block runs here
    finally:
        elapsed = time.perf_counter() - start
        print(f"{label}: {elapsed:.4f}s")

with timer("query"):
    results = db.execute(query)
```

---

## 7. Async Python

```python
import asyncio

# async def returns a coroutine
async def fetch_user(user_id: int) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.get(f"/api/users/{user_id}") as response:
            return await response.json()

# await pauses the coroutine — other coroutines can run
async def main():
    user = await fetch_user(1)
    print(user)

asyncio.run(main())  # entry point for async programs

# Parallel execution (like Promise.all)
async def fetch_all():
    users, posts, comments = await asyncio.gather(
        fetch_user(1),
        fetch_posts(1),
        fetch_comments(1),
    )
    return users, posts, comments

# asyncio.gather() vs Promise.all() — same idea

# Task: run coroutine concurrently without waiting
async def main():
    task1 = asyncio.create_task(slow_operation())  # starts immediately
    task2 = asyncio.create_task(another_operation())

    result1 = await task1
    result2 = await task2

# Timeout
async def with_timeout():
    try:
        result = await asyncio.wait_for(fetch_user(1), timeout=5.0)
    except asyncio.TimeoutError:
        print("Timed out")

# Async generators
async def paginated_users():
    page = 1
    while True:
        users = await fetch_users_page(page)
        for user in users:
            yield user
        if len(users) < 20:
            break
        page += 1

async for user in paginated_users():
    await process(user)
```

---

## 8. The Standard Library

```python
# pathlib — modern file system paths (preferred over os.path)
from pathlib import Path

path = Path("/Users/harry/projects")
path / "taskboard" / "README.md"     # join with /
path.exists()
path.is_file()
path.is_dir()
path.suffix      # ".md"
path.stem        # "README"
path.name        # "README.md"
path.parent      # Path("/Users/harry/projects")
path.read_text()
path.write_text("content")
list(path.glob("**/*.py"))   # recursive glob

# json
import json
json.dumps({"key": "value"}, indent=2)       # serialize to string
json.loads('{"key": "value"}')               # deserialize from string
json.dump(data, file_obj)                    # write to file
json.load(file_obj)                          # read from file

# datetime
from datetime import datetime, timedelta, timezone

now = datetime.now(timezone.utc)             # timezone-aware (always use UTC)
now.isoformat()                              # "2024-01-15T10:30:00+00:00"
datetime.fromisoformat("2024-01-15T10:30:00+00:00")
now + timedelta(days=7)                      # one week from now
(now2 - now1).total_seconds()               # difference in seconds

# typing — type hints
from typing import Optional, Union, Any, Callable, TypeVar
from collections.abc import Sequence, Mapping, Iterator

def process(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

def maybe(x: Optional[str]) -> str:         # Optional[str] = str | None
    return x or "default"

T = TypeVar("T")
def first(items: list[T]) -> T | None:      # generic function
    return items[0] if items else None

# logging
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

logger.debug("debug info")
logger.info("normal info")
logger.warning("warning")
logger.error("error")
logger.exception("error with traceback")    # logs exception traceback automatically

# threading / multiprocessing
import threading
import multiprocessing

# GIL (Global Interpreter Lock):
# Only ONE Python thread runs at a time — threads don't help for CPU-bound work
# Use: threading for I/O-bound (network, disk)
# Use: multiprocessing for CPU-bound (computation, image processing)

thread = threading.Thread(target=my_func, args=(arg1,))
thread.start()
thread.join()

# concurrent.futures — high-level interface
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

with ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(fetch_url, urls))  # parallel I/O

with ProcessPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(cpu_task, data))   # parallel CPU
```

---

## 9. Packaging & Environments

```bash
# Virtual environments (isolate project dependencies)
python -m venv venv         # create virtual env
source venv/bin/activate    # activate (Mac/Linux)
venv\Scripts\activate       # activate (Windows)
deactivate                  # exit

# pip
pip install requests        # install package
pip install requests==2.31.0  # specific version
pip freeze > requirements.txt  # save dependencies
pip install -r requirements.txt  # install from file

# Modern tooling (recommended)
# uv — extremely fast package manager (replaces pip + venv)
pip install uv
uv venv                     # create venv
uv pip install requests     # install (100x faster than pip)
uv pip sync requirements.txt

# pyproject.toml — modern project configuration (replaces setup.py)
# [project]
# name = "myapp"
# version = "0.1.0"
# dependencies = ["fastapi", "sqlalchemy", "pydantic"]
# requires-python = ">=3.11"

# Popular web frameworks
# FastAPI  — modern, async, auto docs, type hints, Pydantic
# Flask    — minimal, synchronous, flexible
# Django   — batteries-included, ORM, admin, auth

# FastAPI quick example
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Task(BaseModel):
    title: str
    completed: bool = False

@app.get("/tasks")
async def get_tasks():
    return []

@app.post("/tasks", status_code=201)
async def create_task(task: Task):
    return task

# uvicorn myapp:app --reload   (run the server)
```

---

## 10. Common Interview Questions

### "What is the GIL?"

> The Global Interpreter Lock is a mutex in CPython that ensures only one thread executes Python bytecode at a time. This means multi-threading in Python doesn't achieve true parallelism for CPU-bound tasks. For I/O-bound tasks (network, disk), threads work well because the GIL is released while waiting for I/O. For CPU-bound parallelism, use `multiprocessing` (separate processes, each with their own GIL) or libraries like NumPy that release the GIL in C extensions.

### "What is the difference between a list and a tuple?"

> Lists are mutable (can change elements) and tuples are immutable (cannot). Tuples use less memory and are slightly faster. Tuples are hashable (can be used as dict keys or in sets) if all their elements are hashable. Convention: use lists for homogeneous sequences (same type, variable length), tuples for heterogeneous records (fixed structure — like a row of data).

### "What are generators and why use them?"

> A generator is a function that uses `yield` instead of `return` — it produces values lazily (one at a time) instead of building the whole collection in memory. Use generators for: large sequences (reading a 10GB file line by line), infinite sequences (Fibonacci), data pipelines (chain of transformations without intermediate lists). A generator expression `(x**2 for x in range(1M))` uses constant memory vs a list comprehension `[x**2 for x in range(1M)]` which builds a million-element list.

### "What is a decorator?"

> A decorator is a function that wraps another function to add behavior — without modifying the original. Uses: logging, timing, caching (`@functools.lru_cache`), retry logic, authentication (`@login_required` in Flask), input validation. `@decorator` is syntactic sugar for `func = decorator(func)`. The `@functools.wraps(func)` inside preserves the original function's name and docstring.

### "What is the difference between `__repr__` and `__str__`?"

> `__str__` is the "friendly" string — used by `print()` and `str()`. Should be readable by a human. `__repr__` is the "developer" string — used in the REPL and `repr()`. Should ideally be a valid Python expression that reconstructs the object. Rule: always implement `__repr__`, optionally `__str__`. If only `__repr__` is defined, it's also used for `str()`.

### "Explain list comprehensions vs map/filter."

> Both achieve the same result. List comprehensions are generally considered more Pythonic — more readable, no need for `lambda`, slightly faster because the bytecode is optimized. `map` and `filter` return iterators (lazy), while list comprehensions eagerly build a list — use a generator expression `(x for x in ...)` for lazy evaluation. Use `map`/`filter` when the function is already named (no lambda needed): `list(map(str, numbers))` vs `[str(n) for n in numbers]` — both are fine.

---

## Most Asked Python Interview Questions

### "What is the GIL and how does it affect concurrency?"

> The Global Interpreter Lock (GIL) is a mutex in CPython that allows only one thread to execute Python bytecode at a time. This means threads don't give you true parallelism for CPU-bound work — use `multiprocessing` for that (separate processes, no shared GIL). For I/O-bound work (network, disk), threads are still useful because the GIL is released during I/O waits. `asyncio` is the modern alternative for I/O concurrency — single-threaded cooperative multitasking with `async/await`.

```python
# CPU-bound: use multiprocessing
from multiprocessing import Pool
with Pool(4) as p:
    results = p.map(heavy_computation, data)

# I/O-bound: use asyncio
import asyncio
async def fetch_all(urls):
    async with aiohttp.ClientSession() as session:
        return await asyncio.gather(*[fetch(session, url) for url in urls])
```

### "What is the difference between `@classmethod`, `@staticmethod`, and instance methods?"

> Instance methods receive `self` (the instance) as first arg — can access and modify instance and class state. `@classmethod` receives `cls` (the class) as first arg — used as alternative constructors or to access class-level state. `@staticmethod` receives nothing special — just a regular function namespaced inside the class; no access to instance or class.

```python
class Date:
    def __init__(self, year, month, day):
        self.year, self.month, self.day = year, month, day

    def is_weekend(self):                        # instance method
        import datetime
        return datetime.date(self.year, self.month, self.day).weekday() >= 5

    @classmethod
    def from_string(cls, date_str):              # alternative constructor
        y, m, d = map(int, date_str.split('-'))
        return cls(y, m, d)

    @staticmethod
    def is_valid_year(year):                     # utility, no self/cls needed
        return 1900 <= year <= 2100

d = Date.from_string('2026-05-13')
Date.is_valid_year(2026)  # True
```

### "Explain `*args` and `**kwargs`."

> `*args` collects extra positional arguments into a tuple. `**kwargs` collects extra keyword arguments into a dict. Together they let you write functions that accept any number of arguments. The names `args`/`kwargs` are convention — the `*`/`**` is what matters.

```python
def log(level, *args, **kwargs):
    # args = ('message', 'extra')
    # kwargs = {'timestamp': '...', 'user': '...'}
    print(f"[{level}]", *args, **kwargs)

log('INFO', 'user logged in', timestamp='2026-05-13', user='Alice')

# Unpacking when calling
def add(a, b, c): return a + b + c
nums = [1, 2, 3]
add(*nums)           # same as add(1, 2, 3)
opts = {'a': 1, 'b': 2, 'c': 3}
add(**opts)          # same as add(a=1, b=2, c=3)
```

### "What are context managers and `with` statements?"

> A context manager handles setup and teardown automatically. `__enter__` runs at the start of the `with` block, `__exit__` runs at the end — even if an exception occurs. Built-in examples: `open()` (auto-closes file), `threading.Lock()` (auto-releases). Use `contextlib.contextmanager` decorator to write one with `yield` instead of a full class.

```python
from contextlib import contextmanager

@contextmanager
def timer():
    import time
    start = time.perf_counter()
    yield                           # code inside `with` block runs here
    elapsed = time.perf_counter() - start
    print(f"Elapsed: {elapsed:.3f}s")

with timer():
    result = expensive_operation()
```

### "What is MRO (Method Resolution Order)?"

> MRO defines the order Python searches for methods in a class hierarchy. Python uses the C3 linearization algorithm. `ClassName.__mro__` shows the order. Relevant for multiple inheritance — Python looks left to right in the class definition, then up the chain.

```python
class A:
    def hello(self): return 'A'

class B(A):
    def hello(self): return 'B'

class C(A):
    def hello(self): return 'C'

class D(B, C): pass  # MRO: D → B → C → A → object

D().hello()      # 'B' — B is first in MRO
print(D.__mro__) # (<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>)
```

### "What is the difference between `__init__` and `__new__`?"

> `__new__` creates the instance (allocates memory) — called first, returns the new object. `__init__` initializes it (sets attributes) — called after `__new__`, receives the created object as `self`. In practice you almost never override `__new__` — only for immutable types (subclassing `int`, `str`) or implementing Singleton patterns.

```python
class Singleton:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

a = Singleton()
b = Singleton()
a is b  # True — same instance
```

### "What are dataclasses?"

> `@dataclass` auto-generates `__init__`, `__repr__`, and `__eq__` from class-level annotations. Much less boilerplate than manual classes. `frozen=True` makes it immutable (and hashable). `field()` gives per-field control (default factories, exclusions).

```python
from dataclasses import dataclass, field

@dataclass
class Task:
    title: str
    done: bool = False
    tags: list[str] = field(default_factory=list)  # mutable default — must use field()

t = Task('Buy milk')
# Task(title='Buy milk', done=False, tags=[])
# __eq__ compares by value, not identity
```

### "What is `asyncio` and when do you use it?"

> `asyncio` is Python's event loop for async I/O. Use it when you have many concurrent I/O operations (HTTP requests, DB queries, file reads) and want to handle them without the overhead of threads/processes. `async def` defines a coroutine. `await` suspends it and yields control to the event loop. `asyncio.gather()` runs coroutines concurrently.

```python
import asyncio, aiohttp

async def fetch(session, url):
    async with session.get(url) as response:
        return await response.json()

async def main():
    async with aiohttp.ClientSession() as session:
        # All 3 requests run concurrently, total time ≈ max(individual times)
        results = await asyncio.gather(
            fetch(session, '/api/users'),
            fetch(session, '/api/posts'),
            fetch(session, '/api/comments'),
        )
    return results

asyncio.run(main())
```

### "What is the difference between `is` and `==`?"

> `==` checks value equality (calls `__eq__`). `is` checks identity — whether two variables point to the exact same object in memory. Never use `is` to compare values. The exception: `is None` / `is not None` is idiomatic because `None` is a singleton.

```python
a = [1, 2, 3]
b = [1, 2, 3]
a == b   # True  — same value
a is b   # False — different objects in memory

c = a
a is c   # True  — same object

# Correct None check
if value is None:   # ✓
if value == None:   # ✗ — works but not idiomatic
```

### "How does Python's memory management and garbage collection work?"

> Python uses reference counting as its primary memory management — every object tracks how many references point to it; when count hits 0, memory is freed immediately. The problem: circular references (A → B → A) never reach 0. The cyclic garbage collector (gc module) periodically detects and cleans these cycles. `__del__` is called when an object is collected but is unreliable — prefer context managers for cleanup.

### "What is a property decorator?"

> `@property` lets you define getter/setter/deleter methods that look like attribute access from outside the class. Useful for validation, computed attributes, and making APIs cleaner without breaking existing code when you need to add logic to attribute access.

```python
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("Radius cannot be negative")
        self._radius = value

    @property
    def area(self):                     # computed, read-only
        import math
        return math.pi * self._radius ** 2

c = Circle(5)
c.radius = 10   # calls setter
c.area          # calls getter — no ()
```

### "What are `__slots__`?"

> By default, Python stores instance attributes in a `__dict__` (a dictionary per instance). Defining `__slots__ = ['x', 'y']` tells Python to use a fixed-size array instead — no `__dict__`. Benefits: less memory per instance (significant for millions of objects), slightly faster attribute access. Drawbacks: can't add arbitrary attributes, no `__dict__`, complicates multiple inheritance.

```python
class Point:
    __slots__ = ['x', 'y']
    def __init__(self, x, y):
        self.x, self.y = x, y

# Creating 1M Points uses significantly less memory than without __slots__
```

### "What is the difference between `copy.copy()` and `copy.deepcopy()`?"

> `copy.copy()` creates a shallow copy — new container, but nested objects are still shared references. `copy.deepcopy()` recursively copies everything — fully independent. Deep copy handles circular references. Use shallow when you only need independence at the top level; deep when you need full isolation.
