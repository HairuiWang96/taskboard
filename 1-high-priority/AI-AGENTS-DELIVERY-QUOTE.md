# AI Agents — Hands-On Example: Delivery Quote Chat (Python + FastAPI)

**Priority: HIGH**

> The Python twin of [AI-AGENTS-DELIVERY-QUOTE-JS.md](AI-AGENTS-DELIVERY-QUOTE-JS.md). Same
> project, same design, same lessons, written in Python with FastAPI and pytest. If you built the
> JS version first, you already know WHAT every line does; this guide shows how Python says it.
> Section 15 is the JS → Python translation table.
>
> A worked project: a customer CHATS with an agent to get a delivery quote. The agent asks for
> what's missing (addresses, date, item sizes and weights), then code works out the route,
> weather, fuel price, vehicle and price from REAL, free map and weather APIs, and the customer
> can book.
>
> Every code block was run with Python 3.11 (`openai` 3, `pydantic` 2, `httpx`, FastAPI 0.162,
> pytest) against a local `qwen2.5:7b` model via Ollama, with live OpenStreetMap, OSRM and
> Open-Meteo data (November 2026). All 13 tests pass. The "real output" blocks are what it printed.

---

## Table of Contents

- [AI Agents — Hands-On Example: Delivery Quote Chat (Python + FastAPI)](#ai-agents--hands-on-example-delivery-quote-chat-python--fastapi)
  - [Table of Contents](#table-of-contents)
  - [1. What We're Building](#1-what-were-building)
  - [2. Setup](#2-setup)
  - [3. Project Layout](#3-project-layout)
  - [4. Pricing — Plain Code, No AI](#4-pricing--plain-code-no-ai)
  - [5. Real-World Data — Maps and Weather](#5-real-world-data--maps-and-weather)
  - [6. How the Design Got Here — Three Versions](#6-how-the-design-got-here--three-versions)
  - [7. The Quote Workflow](#7-the-quote-workflow)
  - [8. Grounding — Did the Customer Actually Say That?](#8-grounding--did-the-customer-actually-say-that)
  - [9. The Agent](#9-the-agent)
  - [10. Chatting in the Terminal](#10-chatting-in-the-terminal)
  - [11. The FastAPI App](#11-the-fastapi-app)
  - [12. Tests (pytest)](#12-tests-pytest)
  - [13. Rules of Thumb and Common Mistakes](#13-rules-of-thumb-and-common-mistakes)
  - [14. Your Hands-On Roadmap](#14-your-hands-on-roadmap)
  - [15. JavaScript ↔ Python — The Same Project in Both](#15-javascript--python--the-same-project-in-both)
  - [Related Files](#related-files)

---

## 1. What We're Building

```text
  you>   Hi, I need a quote to move a sofa tomorrow
  agent> Could you please provide the pickup and drop-off addresses, the dimensions and
         weight of the sofa …
  you>   From the Ferry Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland.
         It's about 84 by 36 by 34 inches and 120 lb.
  agent> Total: $105.00 USD · Quote ID: Q-121221bf · Vehicle: Cargo van · Based on: …
  you>   Actually, add 2 boxes too, each 18 by 12 by 12 inches and 15 lb.
  agent> Total: $111.00 USD · Quote ID: Q-e49aff50 …
  you>   Great, book it. I'm Alex Kim, 415-555-0134.
  agent> Your delivery has been booked successfully! Booking ID: B-a1cd8b01 …

WHAT GOES INTO THE PRICE
  Route        real driving distance + time (OpenStreetMap geocoding + OSRM routing)
  Weather      real forecast for that day at the pickup (Open-Meteo) → rain/snow surcharge
  Fuel         price per gallon in the pickup's state (a table here; an API in production)
  Vehicle      smallest of car / cargo van / box truck that fits every item
  Helpers      a second person if any item is over 100 lb
  Handling     a small fee per piece

‼️ THE ONE-LINE DESIGN
   The MODEL handles the conversation. CODE does everything that must be right: maps,
   maths, vehicle choice, prices, dates and bookings. Section 6 explains, with real
   failures, why each of those had to move into code.‼️
```

---

## 2. Setup

```bash
# The model
brew install ollama
ollama pull qwen2.5:7b

# The project (uv = Python's npm; see FASTAPI-BASICS.md §2)
uv init delivery-agent && cd delivery-agent
uv add openai pydantic httpx "fastapi[standard]"
uv add --dev pytest

uv run chat.py                # talk to it in the terminal
uv run fastapi dev main.py    # the API on :8000 (docs at /docs)
uv run pytest                 # the tests
```

```text
THE FREE APIs — no account, no key, no credit card

  API                         What it gives us                      Rules
  ──────────────────────────  ────────────────────────────────────  ──────────────────────────────
  OpenStreetMap Nominatim     address → coordinates + state         max 1 request/second, must send
                                                                    an identifying User-Agent; fine
                                                                    for learning, NOT heavy traffic
  OSRM demo server            driving distance + time               best effort, no traffic data
  Open-Meteo                  daily forecast, up to 16 days ahead   free for non-commercial use

For production, swap maps.py for Google Maps Platform / Mapbox / HERE (traffic-aware times,
better address matching) — see the JS guide §13 for the Google Routes call. Nothing else
changes, because the rest of the code only sees { distance_miles, duration_minutes, … }.
```

---

## 3. Project Layout

```text
  pricing.py       vehicles, vehicle choice, the price formula, fuel prices    ← plain code
  maps.py          geocoding, routing, weather (real HTTP APIs)                 ← plain code
  quote.py         get_quote(): route → vehicle → weather + fuel → price,
                   stores the quote; book_quote()                               ← plain code
  grounding.py     "did the customer actually say this?" checks + date words   ← plain code
  agent.py         the model, the tools it sees, the chat loop                  ← the AI part
  chat.py          talk to it in the terminal
  main.py          the FastAPI app for a React frontend
  test_*.py        pytest tests

‼️ Five files of ordinary code, one file of "AI". That ratio is normal for a reliable
   agent: the model is the conversational front door, not the engine.‼️
```

---

## 4. Pricing — Plain Code, No AI

```python
# pricing.py — ALL the money logic lives here, in plain code. The model never does maths.
from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field

VehicleType = Literal["car", "cargo_van", "box_truck"]
Weather = Literal["clear", "rain", "snow", "storm"]


@dataclass(frozen=True)
class Vehicle:
    label: str
    max_weight_lb: float
    max_volume_cu_ft: float
    max_length_in: float   # longest item that fits
    base_fee: float        # $ per job
    per_mile: float        # $ per mile (driver + vehicle wear)
    per_minute: float      # $ per minute of drive time
    mpg: float             # fuel economy


VEHICLES: dict[str, Vehicle] = {
    "car":       Vehicle("Car",             100,  12,  40,  12, 1.10, 0.25, 30),
    "cargo_van": Vehicle("Cargo van",       2500, 250, 120, 35, 1.60, 0.45, 18),
    "box_truck": Vehicle("16 ft box truck", 6000, 800, 190, 75, 2.40, 0.70, 10),
}
ORDER = ["car", "cargo_van", "box_truck"]  # smallest first


class Item(BaseModel):
    description: str
    length_in: float = Field(gt=0)
    width_in: float = Field(gt=0)
    height_in: float = Field(gt=0)
    weight_lb: float = Field(gt=0)
    quantity: int = Field(gt=0)


def choose_vehicle(items: list[Item]) -> dict:
    """Pick the SMALLEST vehicle that fits every item (by weight, volume and longest side)."""
    if not items:
        return {"error": "No items given"}
    total_weight = sum(i.weight_lb * i.quantity for i in items)
    # 1728 cubic inches in a cubic foot; ×1.3 because boxes never pack perfectly
    total_volume = sum(i.length_in * i.width_in * i.height_in * i.quantity / 1728 for i in items) * 1.3
    longest = max(max(i.length_in, i.width_in, i.height_in) for i in items)

    # next() with a default = JS's .find(): the first match, or None
    fit = next((v for v in ORDER
                if total_weight <= VEHICLES[v].max_weight_lb
                and total_volume <= VEHICLES[v].max_volume_cu_ft
                and longest <= VEHICLES[v].max_length_in), None)

    summary = {"total_weight_lb": round(total_weight), "total_volume_cu_ft": round(total_volume), "longest_in": longest}
    if fit is None:
        return {"error": "Too big or heavy for a single vehicle — needs a freight quote from a human", **summary}
    return {"vehicle": fit, "label": VEHICLES[fit].label, **summary}


WEATHER_SURCHARGE = {"clear": 0, "rain": 0.10, "snow": 0.25, "storm": 0.35}


def calculate_quote(*, vehicle: str, distance_miles: float, duration_minutes: float,
                    fuel_price_per_gallon: float, weather: str, helpers: int, pieces: int) -> dict:
    """The price. Every line is shown, so a human can check it."""
    v = VEHICLES.get(vehicle)
    if v is None:
        return {"error": f"Unknown vehicle {vehicle}"}
    if distance_miles <= 0 or duration_minutes <= 0:
        return {"error": "Distance and duration must be positive"}
    if not 0 <= helpers <= 2:
        return {"error": "helpers must be 0, 1 or 2"}

    lines = {
        "base": v.base_fee,
        "distance": round(distance_miles * v.per_mile, 2),
        "time": round(duration_minutes * v.per_minute, 2),
        "fuel": round(distance_miles / v.mpg * fuel_price_per_gallon, 2),
        "helpers": helpers * 40,
        "handling": pieces * 3,
    }
    subtotal = sum(lines.values())
    weather_surcharge = round(subtotal * WEATHER_SURCHARGE[weather], 2)
    total = max(round(subtotal + weather_surcharge, 2), 20)  # $20 minimum job
    return {"vehicle": v.label, "lines": {**lines, "weather_surcharge": weather_surcharge}, "total": total, "currency": "USD"}


# Fake fuel price table ($/gallon, regular). A real app would call a fuel-price API
# (e.g. the US EIA open data API, free with a key) and cache the result for a day.
FUEL_PRICES = {"California": 4.89, "Texas": 2.79, "New York": 3.29, "Washington": 4.29}


def get_fuel_price(state: str) -> dict:
    price = FUEL_PRICES.get(state, 3.19)
    return {"state": state, "price_per_gallon": price,
            "source": "state average" if state in FUEL_PRICES else "national average"}
```

```text
REAL OUTPUT
  choose_vehicle([sofa 84×36×34 in, 120 lb])   → {'vehicle': 'cargo_van', …}  (84 in is too long for a car)
  choose_vehicle([2 boxes 18×12×12 in, 15 lb]) → {'vehicle': 'car', …}
  choose_vehicle([sofa at 7000 lb])            → {'error': 'Too big or heavy … needs a freight
                                                   quote from a human', …}
  calculate_quote(vehicle='cargo_van', distance_miles=10.1, duration_minutes=18,
                  fuel_price_per_gallon=4.89, weather='clear', helpers=1, pieces=1)
    → lines: base 35 · distance 16.16 · time 8.1 · fuel 2.74 · helpers 40 · handling 3
      total: 105.0         (115.5 with weather='rain')   ← identical to the JS version

PYTHON DETAILS IN THIS FILE
  @dataclass(frozen=True)      a small read-only class with a generated __init__ — like a
                               TS `type` you can construct: Vehicle("Car", 100, …)
  Literal["car", …]            ≈ TS union type 'car' | 'cargo_van' | 'box_truck'
  Item(BaseModel) + Field(gt=0) Pydantic model = zod schema: validation AND a type
  next((v for v in … if …), None)  ≈ JS array.find(): first match, or the default
  def f(*, vehicle, …)         the * makes every argument KEYWORD-only: you must write
                               calculate_quote(vehicle="car", …), so arguments can't be
                               swapped by position
  {**lines, "x": 1}            ≈ JS { ...lines, x: 1 }

‼️ MONEY AND FLOATS — the same caution as in JS: floats can't store 0.1 exactly, and
   Python's round() rounds halves to EVEN (round(0.125, 2) == 0.12). Fine for a demo; a real
   billing system stores CENTS as integers or uses decimal.Decimal.‼️
```

---

## 5. Real-World Data — Maps and Weather

```python
# maps.py — real, FREE, no-key APIs: OpenStreetMap Nominatim (address → coordinates),
# OSRM (driving route) and Open-Meteo (weather).
import time

import httpx  # uv add httpx — Python's fetch()

USER_AGENT = "delivery-quote-agent-tutorial/1.0"  # Nominatim requires an identifying User-Agent
http = httpx.Client(timeout=15, headers={"User-Agent": USER_AGENT})


def geocode(address: str) -> dict | None:
    res = http.get("https://nominatim.openstreetmap.org/search",
                   params={"q": address, "format": "json", "limit": 1, "addressdetails": 1})
    res.raise_for_status()
    hits = res.json()
    if not hits:
        return None
    hit = hits[0]
    return {"lat": float(hit["lat"]), "lon": float(hit["lon"]),
            "state": hit.get("address", {}).get("state", "unknown"), "label": hit["display_name"]}


def get_route(pickup: str, dropoff: str) -> dict:
    origin = geocode(pickup)
    time.sleep(1.1)  # Nominatim's free tier allows 1 request per second — be polite
    destination = geocode(dropoff)
    if origin is None:
        return {"error": f'Could not find the pickup address "{pickup}". Ask the customer for a fuller address.'}
    if destination is None:
        return {"error": f'Could not find the drop-off address "{dropoff}". Ask the customer for a fuller address.'}

    coords = f"{origin['lon']},{origin['lat']};{destination['lon']},{destination['lat']}"
    data = http.get(f"https://router.project-osrm.org/route/v1/driving/{coords}", params={"overview": "false"}).json()
    if data.get("code") != "Ok":
        return {"error": "No driving route between those addresses"}
    route = data["routes"][0]
    return {
        "distance_miles": round(route["distance"] / 1609.34, 1),  # OSRM gives metres
        "duration_minutes": round(route["duration"] / 60),         # …and seconds
        "pickup_state": origin["state"],
        "pickup_latitude": origin["lat"],
        "pickup_longitude": origin["lon"],
        "pickup_found": origin["label"],    # lets the agent confirm "did you mean…?"
        "dropoff_found": destination["label"],
    }


def to_condition(code: int) -> str:
    """Open-Meteo returns a WMO weather code per day; group them into what pricing cares about."""
    if code >= 95:
        return "storm"
    if 71 <= code <= 77 or code in (85, 86):
        return "snow"
    if 51 <= code <= 67 or 80 <= code <= 82:
        return "rain"
    return "clear"  # 0–3 clear/cloudy, 45/48 fog


def get_weather(latitude: float, longitude: float, date: str) -> dict:
    res = http.get("https://api.open-meteo.com/v1/forecast", params={
        "latitude": latitude, "longitude": longitude,
        "daily": "weather_code,precipitation_probability_max",
        "timezone": "auto", "start_date": date, "end_date": date,
    })
    data = res.json()
    if res.status_code != 200 or data.get("error"):
        return {"error": f"Weather unavailable for {date} (forecasts cover the next 16 days)"}
    return {
        "date": date,
        "condition": to_condition(data["daily"]["weather_code"][0]),
        "precipitation_chance_percent": data["daily"]["precipitation_probability_max"][0],
    }
```

```text
REAL OUTPUT
  get_route('Ferry Building, San Francisco', 'Lake Merritt, Oakland')
    → {'distance_miles': 11.2, 'duration_minutes': 19, 'pickup_state': 'California',
       'pickup_latitude': 37.7955487, 'pickup_longitude': -122.3934746,
       'pickup_found': 'San Francisco Ferry Building, 1, The Embarcadero, …', …}
  get_weather(37.7955, -122.3935, '2026-11-12') → {'date': '2026-11-12', 'condition': 'clear',
                                                    'precipitation_chance_percent': 3}
  get_route('asdkjhqwe nowhere 99', 'Oakland')  → {'error': 'Could not find the pickup address …
                                                    Ask the customer for a fuller address.'}
  get_weather(37.8, -122.4, '2027-03-01')       → {'error': 'Weather unavailable for 2027-03-01
                                                    (forecasts cover the next 16 days)'}

PYTHON DETAILS
  httpx.Client(...)          a reusable HTTP client ≈ fetch with shared defaults (headers,
                             timeout). params={…} builds the ?query=string for you.
  res.raise_for_status()     throws on 4xx/5xx — fetch() does NOT do this; you check res.ok
  dict | None                ≈ TS `Record<…> | null`
  .get("address", {})        read a key with a default instead of crashing on a missing key
```

---

## 6. How the Design Got Here — Three Versions

The JS guide walks through all three versions with their code. These are the same findings, from
the same model and prompts. They explain why the final design looks the way it does.

```text
VERSION 1 — FIVE TOOLS, THE MODEL RUNS THE STEPS
  Tools: get_route, get_weather, get_fuel_price, choose_vehicle, calculate_quote.
  It chained all five perfectly — and was wrong in four ways (real run):
    1. With no addresses given, it called get_route("123 Main St, Anytown, USA", …)
    2. The customer said 84 inches; it passed lengthIn 72 — its own earlier guess
    3. A 120 lb sofa needs a helper; it chose helpers: 0
    4. "Always include the quoteId" — it didn't
  → The steps always ran in the same order, so they didn't need a model. Move them to code.

VERSION 2 — ONE TOOL, CODE RUNS THE STEPS (section 7's get_quote)
  Better: it asked for missing details, used the customer's real numbers, and code picked
  the helpers. New problems, found only by running it repeatedly:
    - 1 in 8 replies was EMPTY (no text, no tool call)        → retry once (section 9)
    - "tomorrow, Wednesday 2026-11-12" — tomorrow was Thursday → weekday computed in code
    - replied in Chinese halfway through                       → "Always reply in English."
  And then the run that mattered:
    you>   Hi, I need a quote to move a sofa tomorrow
      [tool] get_quote({"pickup":"456 Oak Avenue, Springfield","dropoff":"123 Elm Street,
             Springfield", … "lengthIn":72, … "weightLb":150 …})
    agent> Total: $886.66 … Distance: 351.2 miles …
  No addresses or sizes had been given. The model invented a whole job, a real geocoder
  found a Springfield, and the customer was quoted $886. The next turn, when the real
  pickup failed to geocode, it quietly substituted "900 Main Street". The system prompt
  already said "Never make up addresses, sizes or weights."

VERSION 3 — GROUNDING (section 8)
  Code checks every tool argument against the customer's own messages before quoting,
  and turns date words ("tomorrow", "friday") into dates itself.

‼️ THE LESSON: a rule in a prompt is a request, not a guarantee. Anything that must be
   true — prices, dates, "the customer really said this" — is enforced in code.‼️
```

---

## 7. The Quote Workflow

```python
# quote.py — ONE quote function. Code runs the fixed steps (a workflow); the model only talks.
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date as Date

from maps import get_route, get_weather
from pricing import Item, calculate_quote, choose_vehicle, get_fuel_price

QUOTES: dict[str, dict] = {}       # in production: Redis/Postgres with expiry
QUOTE_TTL_SECONDS = 30 * 60        # quotes are valid for 30 minutes


def clean(address: str) -> str:
    """Clean up what the model copies from the chat ("From the Ferry Building in San Francisco")."""
    address = re.sub(r"^\s*(from|to)\s+", "", address, flags=re.I)
    return re.sub(r"\s+in\s+", ", ", address, count=1, flags=re.I)


def get_quote(pickup: str, dropoff: str, date: str, items: list[Item]) -> dict:
    # 1. Route — the step most likely to fail (unknown address), so do it first
    route = get_route(clean(pickup), clean(dropoff))
    if "error" in route:
        return route

    # 2. Vehicle — and the HELPER RULE, in code: anything over 100 lb needs a second person
    vehicle = choose_vehicle(items)
    if "error" in vehicle:
        return vehicle
    helpers = 1 if any(i.weight_lb > 100 for i in items) else 0

    # 3. Weather and fuel don't depend on each other → run them in parallel (like Promise.all)
    with ThreadPoolExecutor() as pool:
        weather_job = pool.submit(get_weather, route["pickup_latitude"], route["pickup_longitude"], date)
        fuel_job = pool.submit(get_fuel_price, route["pickup_state"])
        weather, fuel = weather_job.result(), fuel_job.result()
    if "error" in weather:
        return weather

    # 4. Price
    quote = calculate_quote(
        vehicle=vehicle["vehicle"],
        distance_miles=route["distance_miles"],
        duration_minutes=route["duration_minutes"],
        fuel_price_per_gallon=fuel["price_per_gallon"],
        weather=weather["condition"],
        helpers=helpers,
        pieces=sum(i.quantity for i in items),
    )
    if "error" in quote:
        return quote

    quote_id = f"Q-{uuid.uuid4().hex[:8]}"
    QUOTES[quote_id] = {"quote_id": quote_id, "pickup": route["pickup_found"], "dropoff": route["dropoff_found"],
                        "date": date, "items": items, "total": quote["total"], "created_at": time.time()}

    weekday = Date.fromisoformat(date).strftime("%A")  # weekday computed in CODE, not by the model
    return {
        "quote_id": quote_id,
        "total": quote["total"],
        "currency": "USD",
        "breakdown": quote["lines"],
        "vehicle": vehicle["label"],
        "helpers": helpers,
        "distance_miles": route["distance_miles"],
        "drive_minutes": route["duration_minutes"],
        "weather": f'{weather["condition"]} ({weather["precipitation_chance_percent"]}% chance of rain)',
        # Echo back what the quote is BASED ON, so the customer can spot a wrong number
        "based_on": {
            "pickup": route["pickup_found"],
            "dropoff": route["dropoff_found"],
            "date": f"{weekday} {date}",
            "items": [f"{i.quantity} × {i.description}: {i.length_in:g}×{i.width_in:g}×{i.height_in:g} in, {i.weight_lb:g} lb"
                      for i in items],
        },
        "valid_for_minutes": 30,
    }


def book_quote(quote_id: str, customer_name: str, phone: str) -> dict:
    """Book a stored quote. Shared by the chat tool (terminal) and the POST /bookings endpoint (web)."""
    quote = QUOTES.get(quote_id)
    if quote is None:
        return {"error": f"No quote with id {quote_id}"}
    if time.time() - quote["created_at"] > QUOTE_TTL_SECONDS:
        return {"error": "That quote has expired — get a new quote."}
    del QUOTES[quote_id]  # a quote can only be booked once
    booking_id = f"B-{uuid.uuid4().hex[:8]}"
    # The confirmation text is built by CODE from the stored quote, never by the model
    confirmation = (f"Booking {booking_id} for {customer_name}: pickup {quote['pickup']}, "
                    f"drop-off {quote['dropoff']}, on {quote['date']}. Total ${quote['total']:.2f}.")
    return {"booked": True, "booking_id": booking_id, "total": quote["total"], "confirmation": confirmation}
```

```text
REAL OUTPUT
  get_quote('Ferry Building in San Francisco', '1 Frank H Ogawa Plaza, Oakland', '2026-11-13', [sofa])
    → quote_id 'Q-eaa112ad', total 115.5, weather 'rain (99% chance of rain)',
      based_on {'pickup': 'San Francisco Ferry Building, 1, The Embarcadero, …',
                'dropoff': 'Oakland City Hall, 1, Frank H. Ogawa Plaza, …',
                'date': 'Friday 2026-11-13', 'items': ['1 × sofa: 84×36×34 in, 120 lb']}
  book_quote(that id, 'Alex Kim', '415-555-0134') → {'booked': True, …}
  book_quote(that id again)                       → {'error': 'No quote with id Q-eaa112ad'}

PYTHON DETAILS
  ThreadPoolExecutor + pool.submit(...)   run two blocking calls at the same time ≈ Promise.all.
                                          (Python code is synchronous here; threads let the
                                          two HTTP waits overlap.)
  uuid.uuid4().hex[:8]                    ≈ crypto.randomUUID().slice(0, 8)
  f"{i.length_in:g}"                      :g prints 84.0 as "84"
  f"…{quote['total']:.2f}"                :.2f = two decimals → "105.00"
  re.sub(r"…", "", s, flags=re.I)         ≈ s.replace(/…/i, '')
```

---

## 8. Grounding — Did the Customer Actually Say That?

```python
# grounding.py — check that tool arguments came from the CUSTOMER, not the model's imagination
import re
from datetime import date, timedelta

from pricing import Item

IGNORED = {"from", "to", "the", "in", "at", "of", "and", "usa", "united", "states", "us",
           "ca", "california", "st", "street", "ave", "avenue", "rd", "road"}


def words(s: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", s.lower())


def address_is_grounded(address: str, customer_text: str) -> bool:
    """
    Every meaningful word of the address must appear somewhere in what the customer wrote.
    A simple heuristic, good enough to catch invented addresses. Production systems also show
    the geocoded result for the customer to confirm.
    """
    said = set(words(customer_text))
    important = [w for w in words(address) if w not in IGNORED]
    return bool(important) and all(w in said for w in important)


def number_is_grounded(n: float, customer_text: str) -> bool:
    """Every size and weight must be a number the customer actually typed."""
    said = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", customer_text)]
    return float(n) in said


WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]  # date.weekday(): Monday = 0
RELATIVE = ["today", "tomorrow", *WEEKDAYS]


def resolve_date(when: str, today: date | None = None) -> str | None:
    """Relative dates are resolved in CODE, not by the model: today, tomorrow, a weekday, or YYYY-MM-DD."""
    today = today or date.today()          # local date (no UTC surprise, unlike JS toISOString)
    word = when.strip().lower()
    if word == "today":
        return today.isoformat()
    if word == "tomorrow":
        return (today + timedelta(days=1)).isoformat()
    if word in WEEKDAYS:
        days_ahead = (WEEKDAYS.index(word) - today.weekday()) % 7 or 7  # "friday" = the NEXT Friday
        return (today + timedelta(days=days_ahead)).isoformat()
    return when if re.fullmatch(r"\d{4}-\d{2}-\d{2}", when) else None


def check_grounding(pickup: str, dropoff: str, when: str, items: list[Item], customer_text: str) -> list[str]:
    problems = []
    if not address_is_grounded(pickup, customer_text):
        problems.append(f'pickup address "{pickup}"')
    if not address_is_grounded(dropoff, customer_text):
        problems.append(f'drop-off address "{dropoff}"')
    word = when.strip().lower()
    date_said = word in customer_text.lower() if word in RELATIVE else when in customer_text
    if not date_said:
        problems.append(f'date "{when}"')
    for item in items:
        for field in ("length_in", "width_in", "height_in", "weight_lb"):
            value = getattr(item, field)
            if not number_is_grounded(value, customer_text):
                problems.append(f"{item.description} {field} = {value:g}")
    return problems
```

```text
REAL CHECKS AGAINST THE ACTUAL FAILURES
  Customer said: "…sofa tomorrow … from the Ferry Building in San Francisco to 1 Frank H
                  Ogawa Plaza, Oakland … 84 by 36 by 34 inches and 120 lb."

  check_grounding('Ferry Building, San Francisco, CA', '1 Frank H Ogawa Plaza, Oakland',
                  'tomorrow', [84×36×34, 120 lb], said)
    → []                                                       ✓ allowed
  check_grounding('900 Main Street, San Francisco, CA', …, '2026-11-13', [length_in 72 …], said)
    → ['pickup address "900 Main Street, San Francisco, CA"',
       'date "2026-11-13"',
       'sofa length_in = 72']                                  ✗ blocked, all three
  resolve_date(x, Wednesday 2026-11-11) for today / tomorrow / friday / Wednesday / 2026-12-01 /
  next week → '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-18', '2026-12-01', None

PYTHON DETAILS
  date.today()                  the LOCAL date. (The JS version needed a workaround because
                                toISOString() gives the UTC date.)
  date.weekday()                Monday = 0 … Sunday = 6 (JS getDay() is Sunday = 0)
  timedelta(days=1)             date arithmetic: today + timedelta(days=1) = tomorrow
  [*WEEKDAYS]                   ≈ JS [...WEEKDAYS]
  a if cond else b              ≈ JS cond ? a : b

‼️ Grounding is a general technique: whenever a tool argument should come from the USER
   (an amount, an email address, an account number), check it against what the user said
   before acting. Too strict ("SF" won't match "San Francisco") is the right side to fail
   on: the cost is one extra question, not a wrong price.‼️
```

---

## 9. The Agent

```python
# agent.py — the delivery quote agent: one quote tool, grounded arguments, code-side dates, booking
import json
import os
from datetime import date
from typing import Callable

from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError

from grounding import check_grounding, resolve_date
from pricing import Item
from quote import QUOTES, book_quote, get_quote

client = OpenAI(
    base_url=os.getenv("LLM_BASE_URL", "http://localhost:11434/v1"),
    api_key=os.getenv("LLM_API_KEY", "ollama"),
)
MODEL = os.getenv("LLM_MODEL", "qwen2.5:7b")


class GetQuoteArgs(BaseModel):
    pickup: str = Field(min_length=3, description="pickup address, in the customer's own words")
    dropoff: str = Field(min_length=3, description="drop-off address, in the customer's own words")
    date: str = Field(description='"today", "tomorrow", a weekday like "friday", or YYYY-MM-DD — exactly as the customer said it')
    items: list[Item] = Field(min_length=1, description="EXACTLY the sizes and weights the customer gave")


class BookArgs(BaseModel):
    quote_id: str = Field(min_length=1)
    customer_name: str = Field(min_length=1)
    phone: str = Field(min_length=7)


def inline_refs(schema: dict) -> dict:
    """Pydantic puts nested models in "$defs" and points to them with "$ref". Small local
    models handle a flat schema better, so copy each definition into place."""
    defs = schema.pop("$defs", {})

    def walk(node):
        if isinstance(node, dict):
            if "$ref" in node:
                return walk(defs[node["$ref"].split("/")[-1]])
            return {k: walk(v) for k, v in node.items() if k != "title"}  # titles are noise
        if isinstance(node, list):
            return [walk(v) for v in node]
        return node

    return walk(schema)


def to_tool(name: str, description: str, model: type[BaseModel]) -> dict:
    return {"type": "function",
            "function": {"name": name, "description": description, "parameters": inline_refs(model.model_json_schema())}}


TOOLS = [
    to_tool("get_quote", "Price a delivery. Only call when the CUSTOMER has given the pickup address, "
                         "drop-off address, date, and size + weight of every item.", GetQuoteArgs),
    to_tool("book_delivery", "Book a quoted delivery. Only call after the customer says they want to book "
                             "AND has given their name and phone number.", BookArgs),
]


def system_prompt(can_book: bool, today: date | None = None) -> str:
    today = today or date.today()
    booking = ("To book, you need the quote_id plus the customer's name and phone number." if can_book
               else 'You cannot book. To book, the customer presses "Book" on the quote card.')
    return f"""You are a friendly delivery quote assistant for a same-day delivery company.
Always reply in English. Today is {today.strftime("%A")} {today.isoformat()}.

To quote you need, FROM THE CUSTOMER: pickup address, drop-off address, delivery date, and for
each item its size in inches (length × width × height), weight in pounds and quantity.
If anything is missing, ask for ALL missing details in one short message.
Never make up addresses, sizes or weights. If get_quote says details were not given by the
customer, ask the customer for them.

After get_quote, reply with the total, the quote_id, the vehicle and the "based_on" details so the
customer can check them. Never state a price yourself.
{booking}"""


def customer_text(messages: list) -> str:
    """The customer's own words — the ONLY source the tool arguments may come from."""
    return "\n".join(str(m["content"]) for m in messages if isinstance(m, dict) and m.get("role") == "user")


Confirm = Callable[[str], bool]


def run_tool(name: str, raw_args: str, messages: list, confirm: Confirm | None) -> dict:
    if name == "get_quote":
        try:
            args = GetQuoteArgs.model_validate_json(raw_args)  # parse + validate in one step
        except ValidationError as e:
            return {"error": f"Missing or invalid details: {e.errors(include_url=False)}. Ask the customer."}
        not_given = check_grounding(args.pickup, args.dropoff, args.date, args.items, customer_text(messages))
        if not_given:
            return {"error": f"These details were NOT given by the customer: {'; '.join(not_given)}. "
                             "Ask the customer for them — do not guess."}
        when = resolve_date(args.date)
        if when is None:
            return {"error": f'Unclear date "{args.date}". Ask the customer for the date.'}
        return get_quote(args.pickup, args.dropoff, when, args.items)

    if name == "book_delivery" and confirm is not None:
        try:
            args = BookArgs.model_validate_json(raw_args)
        except ValidationError as e:
            return {"error": f"Missing booking details: {e.errors(include_url=False)}"}
        quote = QUOTES.get(args.quote_id)
        if quote is None:
            return {"error": f"No quote with id {args.quote_id}"}
        # ‼️ The price shown to the human comes from the STORED quote, never from the model
        if not confirm(f"Book {quote['quote_id']} for {args.customer_name} ({args.phone}) — ${quote['total']:.2f}?"):
            return {"error": "The booking was not confirmed. Do not retry unless the customer asks again."}
        return {**book_quote(args.quote_id, args.customer_name, args.phone),
                "instruction": "Show the customer the confirmation text exactly as written."}

    return {"error": f"Unknown tool {name}"}


def run_turn(messages: list, confirm: Confirm | None = None, max_steps: int = 6) -> str:
    """One customer turn. Pass `confirm` to let the agent book (terminal chat). Leave it out and
    the agent can only quote — the web app books through a normal endpoint instead."""
    tools = TOOLS if confirm else [t for t in TOOLS if t["function"]["name"] != "book_delivery"]
    empty_retries = 0
    for _ in range(max_steps):
        message = client.chat.completions.create(model=MODEL, messages=messages, tools=tools).choices[0].message

        # Small models sometimes return NOTHING (no text, no tool call) — retry once
        if not message.tool_calls and not (message.content or "").strip() and empty_retries < 1:
            empty_retries += 1
            continue

        messages.append(message)
        if not message.tool_calls:
            return message.content or "Sorry, could you say that again?"

        for call in message.tool_calls:
            print(f"  [tool] {call.function.name}({call.function.arguments})")
            try:
                result = run_tool(call.function.name, call.function.arguments, messages, confirm)
            except Exception as e:  # network failure, bad JSON… → data, not a crash
                result = {"error": f"{type(e).__name__}: {e}"}
            if "error" in result:
                print(f"  [tool error] {result['error']}")
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})
    return "Sorry, I got stuck working that out. A teammate will follow up."


def new_conversation(can_book: bool = False) -> list:
    """can_book: True for the terminal chat (agent can book, with a confirm step); False for the web app."""
    return [{"role": "system", "content": system_prompt(can_book)}]
```

```text
REAL OUTPUT — the full conversation (scripted run; the booking confirm was answered "yes")

you>   Hi, I need a quote to move a sofa tomorrow
agent> Sure, I can help with that. Could you please provide the pickup and drop-off
       addresses, the dimensions and weight of the sofa, as well as the quantity? …

you>   From the Ferry Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland.
       It's about 84 by 36 by 34 inches and 120 lb.
  [tool] get_quote({"pickup":"Ferry Building in San Francisco","dropoff":"1 Frank H Ogawa Plaza, Oakland","date":"tomorrow","items":[{"description":"Sofa","height_in":34,"length_in":84,"quantity":1,"weight_lb":120,"width_in":36}]})
agent> Based on the details you provided, here is your delivery quote:
       - Total: $105.00 USD
       - Quote ID: Q-121221bf
       - Vehicle: Cargo van
       - Based on: Pickup: San Francisco Ferry Building, 1, The Embarcadero, … 94111
                   Drop-off: Oakland City Hall, 1, Frank H. Ogawa Plaza, … 94612
                   Date: Thursday, 2026-11-12 · Items: 1 × Sofa: 84" × 36" × 34", 120 lb

you>   Actually, add 2 boxes too, each 18 by 12 by 12 inches and 15 lb.
  [tool] get_quote({"date":"tomorrow", … "items":[{Sofa…},{"description":"Box","height_in":12,"length_in":18,…}]})
agent> … Total: $111.00 USD · Quote ID: Q-e49aff50 · Cargo van
       Items: 1 × Sofa: 84" × 36" × 34", 120 lb · 2 × Box: 18" × 12" × 12", 15 lb

you>   Great, book it. I'm Alex Kim, 415-555-0134.
  [tool] book_delivery({"quote_id":"Q-e49aff50","customer_name":"Alex Kim","phone":"415-555-0134"})
  [confirm] Book Q-e49aff50 for Alex Kim (415-555-0134) — $111.00? → yes
agent> Your delivery has been booked successfully! Booking ID: B-a1cd8b01 · Total: $111.00 USD
       Your confirmation text is as follows: Booking B-a1cd8b01 for Alex Kim: pickup San
       Francisco Ferry Building, … on 2026-11-12. Total $111.00.

TWO MORE REAL RUNS — changing the date
you>   What if I do it on Friday instead?
  [tool] get_quote({"date":"friday", …})
agent> Your quote for the delivery on Friday is as follows: Total: $115.50 USD …
       Date: Friday, 2026-11-13. This quote includes a $10.50 weather surcharge due to the
       99% chance of rain.

AND THE GUARD RAIL — "Hi, I need a quote to move a sofa tomorrow" with nothing else,
three runs: all three asked for the addresses and sizes; none called get_quote.

PYTHON DETAILS
  inline_refs()                 Pydantic's model_json_schema() puts the nested Item model
                                under "$defs" and refers to it with "$ref". Small models
                                cope better with one flat schema, so this copies it in place.
  GetQuoteArgs.model_validate_json(raw_args)
                                parse the JSON string AND validate it in one call
                                ≈ GetQuoteArgs.safeParse(JSON.parse(raw)) in zod
  except ValidationError as e   Pydantic throws instead of returning { success: false }
  Callable[[str], bool]         the type of a function that takes a str and returns a bool
  messages.append(message)      the SDK's message OBJECT goes in the list as-is, next to
                                plain dicts — the SDK accepts both. That's why
                                customer_text() checks isinstance(m, dict).
```

---

## 10. Chatting in the Terminal

```python
# chat.py — talk to the agent in the terminal:  uv run chat.py
from agent import new_conversation, run_turn

messages = new_conversation(can_book=True)  # ONE list for the whole conversation = the agent's memory


def confirm(question: str) -> bool:
    """The human approval step for bookings — it shows the price from the STORED quote."""
    return input(f"  {question} [y/N] ").strip().lower() == "y"


print('Delivery quote assistant — type "exit" to quit.\n')
while True:
    text = input("you> ")
    if text.strip().lower() == "exit":
        break
    messages.append({"role": "user", "content": text})
    print(f"agent> {run_turn(messages, confirm)}\n")
```

```text
REAL OUTPUT (interactive)
you>   Quote please: sofa 84 by 36 by 34 inches, 120 lb, from the Ferry Building in San
       Francisco to 1 Frank H Ogawa Plaza, Oakland, tomorrow.
  [tool] get_quote({"pickup":"the Ferry Building in San Francisco", …})
agent> … Total: $105.00 USD …
you>   Book it. I'm Alex Kim, 415-555-0134.
  [tool] book_delivery({"customer_name":"Alex Kim","phone":"415-555-0134","quote_id":"Q-10017144"})
  Book Q-10017144 for Alex Kim (415-555-0134) — $105.00? [y/N] y
agent> Your delivery has been booked successfully. Booking ID: B-8300b7db · Total: $105.00 USD

The y/N question is printed by YOUR code with the STORED price, so the human approves the
real number even if the model's message says something else.
```

---

## 11. The FastAPI App

```python
# main.py — the chat agent behind a FastAPI API:  uv run fastapi dev main.py
import json
import uuid

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from agent import new_conversation, run_turn
from quote import book_quote

app = FastAPI(title="Delivery quote agent")

# One message history per conversation. In production: Redis or a database, with a TTL.
SESSIONS: dict[str, list] = {}


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    quote: dict | None   # the data for the UI's quote card


@app.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest):
    session_id = body.session_id or str(uuid.uuid4())
    messages = SESSIONS.setdefault(session_id, new_conversation())  # get, or create and store

    messages.append({"role": "user", "content": body.message})
    reply = run_turn(messages)  # no confirm → the agent can quote but not book

    # The UI's quote card is built from the TOOL RESULT (data), not from the model's prose
    tool_results = [json.loads(m["content"]) for m in reversed(messages)
                    if isinstance(m, dict) and m.get("role") == "tool"]
    latest_quote = next((r for r in tool_results if "quote_id" in r), None)

    return ChatResponse(session_id=session_id, reply=reply, quote=latest_quote)


class BookingRequest(BaseModel):
    quote_id: str = Field(min_length=1)
    customer_name: str = Field(min_length=1)
    phone: str = Field(min_length=7)


# Booking is a normal endpoint the "Book" button calls — no model involved
@app.post("/bookings", status_code=201)
def create_booking(body: BookingRequest):
    result = book_quote(body.quote_id, body.customer_name, body.phone)
    if "error" in result:
        raise HTTPException(status_code=409, detail=result["error"])
    return result
```

```text
REAL OUTPUT (curl against `fastapi run main.py`)

POST /chat {"message":"Quote please: sofa 84 by 36 by 34 inches, 120 lb, from the Ferry
            Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland, tomorrow."}
→ 200 {"session_id":"4ca503ec-…", "reply":"Here is your delivery quote: … Total: $105.00 USD …",
       "quote":{"quote_id":"Q-274e718e","total":105.0, "breakdown":{…}, "based_on":{…}, …}}

POST /bookings {"quote_id":"Q-274e718e","customer_name":"Alex Kim","phone":"415-555-0134"}
→ 201 {"booked":true,"booking_id":"B-a2421847","total":105.0,"confirmation":"Booking … Total $105.00."}

POST /bookings (same body again)  → 409 {"detail":"No quote with id Q-274e718e"}
POST /chat {"message":""}          → 422 (FastAPI validated the body — no code needed)

‼️ THE SAME THREE DESIGN CHOICES AS THE JS VERSION
   1. The React app gets `quote` as DATA from the tool result, and renders the quote card
      from it — the price on screen is never the model's paraphrase.
   2. The web agent has NO booking tool. Booking is a normal endpoint behind a "Book" button.
   3. session_id keys the message history; send it back to continue the conversation.

FASTAPI vs EXPRESS (the JS version)
   - The 422 for an empty message comes free from Field(min_length=1); Express needed a
     zod safeParse + res.status(422) by hand.
   - raise HTTPException(409, …) ≈ return res.status(409).json(…)
   - SESSIONS.setdefault(id, new_conversation())  ≈ map.get(id) ?? (map.set(id, x), x)
   - Interactive docs at /docs for free.
   - Endpoints are plain `def` (not async def) because the OpenAI and httpx calls here
     are synchronous — FastAPI runs them in a thread pool (FASTAPI-BASICS.md §10).
```

---

## 12. Tests (pytest)

```python
# test_pricing.py — the money and the guard rails, no model needed:  uv run pytest
from datetime import date

from grounding import check_grounding, resolve_date
from pricing import Item, calculate_quote, choose_vehicle

sofa = Item(description="sofa", length_in=84, width_in=36, height_in=34, weight_lb=120, quantity=1)


def test_picks_the_smallest_vehicle_that_fits():
    box = Item(description="box", length_in=18, width_in=12, height_in=12, weight_lb=15, quantity=1)
    assert choose_vehicle([box])["vehicle"] == "car"
    assert choose_vehicle([sofa])["vehicle"] == "cargo_van"  # 84 in is too long for a car


def test_refuses_loads_no_vehicle_can_take():
    assert "error" in choose_vehicle([sofa.model_copy(update={"weight_lb": 7000})])


BASE = dict(vehicle="cargo_van", distance_miles=10.1, duration_minutes=18, fuel_price_per_gallon=4.89, helpers=1, pieces=1)


def test_adds_up_every_line():
    assert calculate_quote(**BASE, weather="clear")["total"] == 105


def test_adds_ten_percent_in_the_rain():
    assert calculate_quote(**BASE, weather="rain")["total"] == 115.5


SAID = "Sofa 84 by 36 by 34 inches, 120 lb, from the Ferry Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland, tomorrow."


def test_accepts_details_the_customer_gave():
    assert check_grounding("Ferry Building, San Francisco", "1 Frank H Ogawa Plaza, Oakland", "tomorrow", [sofa], SAID) == []


def test_rejects_an_invented_address_size_and_date():
    problems = check_grounding("900 Main Street, San Francisco", "1 Frank H Ogawa Plaza, Oakland", "2026-11-13",
                               [sofa.model_copy(update={"length_in": 72})], SAID)
    assert len(problems) == 3


def test_resolves_relative_dates_in_code():
    wednesday = date(2026, 11, 11)
    assert resolve_date("tomorrow", wednesday) == "2026-11-12"
    assert resolve_date("friday", wednesday) == "2026-11-13"
    assert resolve_date("next week", wednesday) is None
```

```python
# test_agent.py — the agent loop with a FAKE model, scripted to misbehave
import json
from types import SimpleNamespace

import agent


def reply(content=None, tool_calls=None):
    """Shape a fake response like the SDK's: response.choices[0].message"""
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content, tool_calls=tool_calls))])


def quote_call(args: dict):
    return [SimpleNamespace(id="call_1", function=SimpleNamespace(name="get_quote", arguments=json.dumps(args)))]


SOFA = {"description": "sofa", "length_in": 84, "width_in": 36, "height_in": 34, "weight_lb": 120, "quantity": 1}


def fake_model(monkeypatch, *replies):
    """Replace client.chat.completions.create with scripted replies; record every call."""
    calls, queue = [], list(replies)

    def create(**kwargs):
        calls.append(kwargs)
        return queue.pop(0)

    monkeypatch.setattr(agent.client.chat.completions, "create", create)
    return calls


def test_blocks_a_quote_built_from_details_the_customer_never_gave(monkeypatch):
    fake_model(monkeypatch,
               reply(tool_calls=quote_call({"pickup": "456 Oak Avenue, Springfield", "dropoff": "123 Elm Street, Springfield",
                                            "date": "tomorrow", "items": [SOFA]})),
               reply(content="What are the pickup and drop-off addresses?"))
    quoted = []
    monkeypatch.setattr(agent, "get_quote", lambda *a, **k: quoted.append(a) or {"quote_id": "Q-test"})

    messages = agent.new_conversation()
    messages.append({"role": "user", "content": "Hi, I need a quote to move a sofa tomorrow"})

    assert "addresses" in agent.run_turn(messages)
    assert quoted == []  # the grounding check stopped it
    tool_result = json.loads(next(m["content"] for m in messages if isinstance(m, dict) and m.get("role") == "tool"))
    assert "NOT given by the customer" in tool_result["error"]


def test_retries_once_when_the_model_returns_an_empty_reply(monkeypatch):
    fake_model(monkeypatch, reply(content=""), reply(content="Could you share the addresses?"))
    messages = agent.new_conversation() + [{"role": "user", "content": "hi"}]
    assert agent.run_turn(messages) == "Could you share the addresses?"


def test_cannot_book_without_a_confirm_callback(monkeypatch):
    calls = fake_model(monkeypatch, reply(content="ok"))
    agent.run_turn(agent.new_conversation() + [{"role": "user", "content": "book it"}])
    assert [t["function"]["name"] for t in calls[0]["tools"]] == ["get_quote"]
```

```python
# test_main.py — the API with the model turn replaced by a fake
import json
import time

from fastapi.testclient import TestClient

import main
from quote import QUOTES

client = TestClient(main.app)


def fake_run_turn(messages, confirm=None):
    QUOTES["Q-test"] = {"quote_id": "Q-test", "pickup": "A", "dropoff": "B", "date": "2026-11-12",
                        "items": [], "total": 105, "created_at": time.time()}
    messages.append({"role": "tool", "tool_call_id": "call_1", "content": json.dumps({"quote_id": "Q-test", "total": 105})})
    return "Your total is $105 (quote Q-test)."


def test_chat_returns_the_quote_card_data(monkeypatch):
    monkeypatch.setattr(main, "run_turn", fake_run_turn)
    res = client.post("/chat", json={"message": "quote a sofa"})
    assert res.status_code == 200
    assert res.json()["quote"] == {"quote_id": "Q-test", "total": 105}
    assert isinstance(res.json()["session_id"], str)


def test_books_a_quote_exactly_once(monkeypatch):
    monkeypatch.setattr(main, "run_turn", fake_run_turn)
    client.post("/chat", json={"message": "quote a sofa"})
    body = {"quote_id": "Q-test", "customer_name": "Alex Kim", "phone": "415-555-0134"}
    assert client.post("/bookings", json=body).status_code == 201
    assert client.post("/bookings", json=body).status_code == 409


def test_rejects_an_empty_message():
    assert client.post("/chat", json={"message": ""}).status_code == 422
```

```text
uv run pytest   →   13 passed in 0.42s

PYTEST vs VITEST
  def test_…(): assert …        ≈ it('…', () => expect(…).toBe(…))   — any test_ function runs
  monkeypatch.setattr(obj, "name", fake)
                                ≈ vi.spyOn(obj, 'name').mockImplementation(fake) — and it's
                                automatically undone after each test
  SimpleNamespace(a=1)          a quick object with attributes, for faking the SDK's response
                                shape (response.choices[0].message.tool_calls)
  TestClient(app)               ≈ supertest(app)

‼️ The most valuable test replays the real $886 "Springfield" failure with a fake model and
   proves grounding blocks it. Turn every real failure you see into a test like that.‼️
```

---

## 13. Rules of Thumb and Common Mistakes

```text
RULES OF THUMB (the full list with explanations is in the JS guide §14)
  ‼️ Prices come from code, always — the model reports a quote_id, the UI renders the price.
  ‼️ Quotes expire and book once (idempotency).
  ‼️ Echo back what the quote is based on (geocoded addresses, date, items).
  ‼️ Ground everything the customer must provide before acting on it.
  - Weight/size limits and hazardous-item rules are code, not prompt text.
  - Names and phone numbers are personal data: don't log conversations forever.
  - Cache geocoding and fuel prices; respect Nominatim's 1 request/second.

COMMON MISTAKES
  ‼️ 1. Letting the model run steps that never change order — that's a workflow; use code.
  ‼️ 2. Trusting the prompt to stop made-up inputs — "never make up addresses" didn't.
  ‼️ 3. Letting the model do dates — it said tomorrow was Wednesday on a Wednesday.
  ‼️ 4. Showing the model's prose as the record — build confirmations from stored data.
  ‼️ 5. Giving the model powers it doesn't need — the web agent can't book.
  ‼️ 6. Testing once — v2 looked perfect twice; the third run quoted $886.
  7. Python-specific: forgetting Field(gt=0) and similar constraints (Pydantic only checks
     what you declare); reusing the same quote type inside an f-string on Python < 3.12
     (f"{d["k"]}" is a SyntaxError before 3.12 — use f"{d['k']}"); float money (use cents).
```

---

## 14. Your Hands-On Roadmap

```text
  M1  pricing.py + test_pricing.py — get the money right first, no AI
  M2  maps.py — try your own addresses and a nonsense one
  M3  quote.py — get_quote() from a Python shell, then book_quote()
  M4  grounding.py — feed it the real failures from section 6
  M5  agent.py + chat.py — chat with it, book with the y/N confirm
  M6  test_agent.py — turn every failure you see into a fake-model test
  M7  main.py — uv run fastapi dev main.py, try it from /docs
  M8  A React page against this API (chat box + quote card + Book button)
  M9  Evals: 10 scripted conversations × 3 runs, print the pass rate

STRETCH
  - Pydantic structured output for the agent's final reply (AI-AGENTS-BASICS.md §9)
  - Port to the OpenAI Agents SDK: @function_tool on get_quote (the grounding check stays
    inside the function)
  - Rush-hour surcharge from the departure time; multi-stop deliveries
```

---

## 15. JavaScript ↔ Python — The Same Project in Both

```text
  JS / TYPESCRIPT (AI-AGENTS-DELIVERY-QUOTE-JS.md)   PYTHON (this guide)
  ─────────────────────────────────────────────────  ────────────────────────────────────────────
  npm install openai zod express                      uv add openai pydantic httpx "fastapi[standard]"
  node chat.ts / node server.ts                       uv run chat.py / uv run fastapi dev main.py
  type Vehicle = { … }                                @dataclass class Vehicle: …
  'car' | 'cargo_van' | 'box_truck'                   Literal["car", "cargo_van", "box_truck"]
  z.object({ lengthIn: z.number().positive() })       class Item(BaseModel): length_in: float = Field(gt=0)
  z.toJSONSchema(schema)                              Model.model_json_schema() (+ inline_refs)
  Schema.safeParse(JSON.parse(raw))                   Model.model_validate_json(raw) + except ValidationError
  ORDER.find((v) => …)                                next((v for v in ORDER if …), None)
  items.some((i) => i.weightLb > 100)                 any(i.weight_lb > 100 for i in items)
  items.reduce((n, i) => n + i.quantity, 0)           sum(i.quantity for i in items)
  items.map((i) => `…${i.lengthIn}…`)                 [f"…{i.length_in:g}…" for i in items]
  await fetch(url, { headers })                       httpx.Client(headers=…).get(url, params=…)
  await new Promise((r) => setTimeout(r, 1100))       time.sleep(1.1)
  Promise.all([a(), b()])                             ThreadPoolExecutor: submit(a), submit(b), .result()
  new Map<string, StoredQuote>()                      dict[str, dict]
  QUOTES.delete(id)                                   del QUOTES[id]
  d.toLocaleDateString('en-CA')                       date.isoformat()
  d.setDate(d.getDate() + 1)                          today + timedelta(days=1)
  d.getDay()  (Sunday = 0)                            today.weekday()  (Monday = 0)
  crypto.randomUUID().slice(0, 8)                     uuid.uuid4().hex[:8]
  readline .question()                                input()
  res.status(409).json(…)                             raise HTTPException(409, …)
  z.safeParse → res.status(422)                       automatic 422 from the Pydantic body model
  vi.spyOn(client.chat.completions, 'create')         monkeypatch.setattr(agent.client.chat.completions, "create", fake)
  vi.mock('./agent.ts', …)                            monkeypatch.setattr(main, "run_turn", fake)
  supertest(app)                                      TestClient(app)
  camelCase (lengthIn, quoteId)                       snake_case (length_in, quote_id)

‼️ The model-facing parts are the same in both languages: the system prompt, the tool
   JSON schema, the messages list and tool_call_id. That's why both versions behave the same,
   and why the lessons transfer between them.‼️
```

---

## Related Files

- [AI-AGENTS-DELIVERY-QUOTE-JS.md](AI-AGENTS-DELIVERY-QUOTE-JS.md) — the same project in TypeScript + Express, with all three versions' code and the Google Maps swap
- [AI-AGENTS-BASICS.md](AI-AGENTS-BASICS.md) — the agent concepts behind this project, in Python
- [AI-AGENTS-MORTGAGE-EXAMPLE.md](AI-AGENTS-MORTGAGE-EXAMPLE.md) — a simpler single-task project in Python + FastAPI
- [FASTAPI-BASICS.md](FASTAPI-BASICS.md) — FastAPI for Express developers
- [PYTHON-DEEP.md](../3-low-priority/PYTHON-DEEP.md) — Python for JS developers
