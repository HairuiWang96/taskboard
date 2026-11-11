# AI Agents — Hands-On Example: Delivery Quote Chat (JavaScript / TypeScript)

**Priority: HIGH**

> A worked project: a customer CHATS with an agent to get a delivery quote. The agent asks for
> what's missing (addresses, date, item sizes and weights), then code works out the route,
> weather, fuel price, vehicle and price, and the customer can book. It uses REAL, free map and
> weather APIs, not fake data.
>
> It's built in three versions, because each version failed in an instructive way when run
> against a real model. The failures are kept in the guide: they're the most useful part.
>
> Same style as [AI-AGENTS-MORTGAGE-EXAMPLE-JS.md](AI-AGENTS-MORTGAGE-EXAMPLE-JS.md). If agents are
> new to you, read [AI-AGENTS-BASICS-JS.md](AI-AGENTS-BASICS-JS.md) sections 1–7 first.
>
> Every code block was run on Node 22 (`openai` 7, `zod` 4, Express 5, Vitest 5) against a local
> `qwen2.5:7b` model via Ollama, with live OpenStreetMap, OSRM and Open-Meteo data (November 2026).
> The "real output" blocks are what it actually printed. All 13 tests pass.

---

## Table of Contents

- [AI Agents — Hands-On Example: Delivery Quote Chat (JavaScript / TypeScript)](#ai-agents--hands-on-example-delivery-quote-chat-javascript--typescript)
  - [Table of Contents](#table-of-contents)
  - [1. What We're Building](#1-what-were-building)
  - [2. Free Setup — Model and APIs](#2-free-setup--model-and-apis)
  - [3. Project Layout](#3-project-layout)
  - [4. Pricing — Plain Code, No AI](#4-pricing--plain-code-no-ai)
  - [5. Real-World Data — Maps and Weather](#5-real-world-data--maps-and-weather)
  - [6. Version 1 — Five Tools, the Model Runs the Steps](#6-version-1--five-tools-the-model-runs-the-steps)
  - [7. Version 2 — One Tool, Code Runs the Steps](#7-version-2--one-tool-code-runs-the-steps)
  - [8. Version 3 — Grounding: Did the Customer Actually Say That?](#8-version-3--grounding-did-the-customer-actually-say-that)
  - [9. The Final Agent](#9-the-final-agent)
  - [10. Chatting in the Terminal](#10-chatting-in-the-terminal)
  - [11. The Express API](#11-the-express-api)
  - [12. Tests](#12-tests)
  - [13. Swapping In Google Maps](#13-swapping-in-google-maps)
  - [14. Rules of Thumb for a Real Delivery Business](#14-rules-of-thumb-for-a-real-delivery-business)
  - [15. Common Mistakes](#15-common-mistakes)
  - [16. Your Hands-On Roadmap](#16-your-hands-on-roadmap)
  - [17. Interview Answer](#17-interview-answer)
  - [Related Files](#related-files)

---

## 1. What We're Building

```text
A customer types to the assistant, in as many messages as they like:

  you>   Hi, I need a quote to move a sofa tomorrow
  agent> Could you share the pickup and drop-off addresses, and the sofa's size (inches)
         and weight (lb)?
  you>   From the Ferry Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland.
         It's about 84 by 36 by 34 inches and 120 lb.
  agent> Total $105 — quote Q-5c37b614 — cargo van with 1 helper. Based on: …
  you>   What if I do it on Friday instead?
  agent> Friday has a 99% chance of rain, so it's $115.50 (quote Q-58671a62) …
  you>   Book it. I'm Alex Kim, 415-555-0134.
  agent> Booked: B-2b284ff3 …

WHAT GOES INTO THE PRICE
  Route        real driving distance + time between the two addresses (OpenStreetMap + OSRM)
  Weather      real forecast for that day at the pickup (Open-Meteo) → rain/snow surcharge
  Fuel         price per gallon in the pickup's state (a table here; an API in production)
  Vehicle      smallest of car / cargo van / box truck that fits every item
  Helpers      a second person if any item is over 100 lb
  Handling     a small fee per piece

‼️ THE ONE-LINE DESIGN
   The MODEL handles the conversation: understanding the customer, asking for what's
   missing, explaining the quote. CODE does everything that must be right: maps, maths,
   vehicle choice, prices, dates and bookings. Section 6–8 show, with real failures,
   why every one of those had to move into code.‼️
```

```text
WHY THIS IS A GOOD AGENT PROBLEM (and how it differs from the mortgage example)
  - It's a CONVERSATION: the agent doesn't get everything up front, so it must remember
    earlier messages and ask for the rest. (The mortgage agent got one task and ran.)
  - It calls REAL external APIs that can fail (unknown address, no forecast that far out).
  - The customer CHANGES their mind ("add 2 boxes", "make it Friday"), and the quote has to
    follow.
  - Money and bookings are involved, so the agent must never make up a number.
```

---

## 2. Free Setup — Model and APIs

```bash
# The model (same as the other guides)
brew install ollama
ollama pull qwen2.5:7b

# The project
mkdir delivery-agent && cd delivery-agent
npm init -y
npm pkg set type=module  # It sets "type": "module" in package.json, so Node treats your .js/.ts files as ES modules (import/export).‼️
npm install openai zod express
npm install -D vitest supertest
```

```text
THE FREE APIs — no account, no key, no credit card

  API                         What it gives us                      Rules
  ──────────────────────────  ────────────────────────────────────  ──────────────────────────────
  OpenStreetMap Nominatim     address → coordinates + state         max 1 request/second, must send
  nominatim.openstreetmap.org                                       an identifying User-Agent; fine
                                                                    for learning, NOT for heavy
                                                                    production traffic
  OSRM demo server            driving distance + time between two   demo server, best effort, no
  router.project-osrm.org     coordinates                           traffic data
  Open-Meteo                  daily forecast (weather code, chance  free for non-commercial use,
  api.open-meteo.com          of rain), up to 16 days ahead         no key

‼️ For a real product you'd use a paid, reliable provider (Google Maps Platform, Mapbox,
   HERE) for traffic-aware times and better address matching. Section 13 shows the Google
   swap — only maps.ts changes, because the rest of the code only sees
   { distanceMiles, durationMinutes, … }.‼️
```

---

## 3. Project Layout

```text
  pricing.ts       vehicles, vehicle choice, the price formula, fuel prices    ← plain code
  maps.ts          geocoding, routing, weather (real HTTP APIs)                 ← plain code
  quote.ts         getQuote(): runs route → vehicle → weather + fuel → price,
                   stores the quote; bookQuote()                                ← plain code
  grounding.ts     "did the customer actually say this?" checks + date words   ← plain code
  agent.ts         the model, the tools it sees, the chat loop                  ← the AI part
  chat.ts          talk to it in the terminal
  server.ts        the Express API for a React app
  *.test.ts        Vitest tests

‼️ Look at the ratio: five files of ordinary code, one file of "AI". That's normal for a
   reliable agent. ‼️The model is the conversational front door, not the engine.‼️
```

---

## 4. Pricing — Plain Code, No AI

```typescript
// pricing.ts — ALL the money logic lives here, in plain code. The model never does maths.

export type VehicleType = 'car' | 'cargo_van' | 'box_truck';

type Vehicle = {
  label: string;
  maxWeightLb: number;
  maxVolumeCuFt: number;
  maxLengthIn: number; // longest item that fits
  baseFee: number; // $ per job
  perMile: number; // $ per mile (driver + vehicle wear)
  perMinute: number; // $ per minute of drive time
  mpg: number; // fuel economy
};

export const VEHICLES: Record<VehicleType, Vehicle> = {
  car: { label: 'Car', maxWeightLb: 100, maxVolumeCuFt: 12, maxLengthIn: 40, baseFee: 12, perMile: 1.1, perMinute: 0.25, mpg: 30 },
  cargo_van: { label: 'Cargo van', maxWeightLb: 2500, maxVolumeCuFt: 250, maxLengthIn: 120, baseFee: 35, perMile: 1.6, perMinute: 0.45, mpg: 18 },
  box_truck: { label: '16 ft box truck', maxWeightLb: 6000, maxVolumeCuFt: 800, maxLengthIn: 190, baseFee: 75, perMile: 2.4, perMinute: 0.7, mpg: 10 },
};
const ORDER: VehicleType[] = ['car', 'cargo_van', 'box_truck'];

export type Item = {
  description: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightLb: number;
  quantity: number;
};

/** Pick the SMALLEST vehicle that fits every item (by weight, volume and longest side). */
export function chooseVehicle(items: Item[]) {
  if (items.length === 0) return { error: 'No items given' };
  const totalWeight = items.reduce((sum, i) => sum + i.weightLb * i.quantity, 0);
  // 1728 cubic inches in a cubic foot; ×1.3 because boxes never pack perfectly
  const totalVolume = items.reduce((sum, i) => sum + (i.lengthIn * i.widthIn * i.heightIn * i.quantity) / 1728, 0) * 1.3;
  const longest = Math.max(...items.map(i => Math.max(i.lengthIn, i.widthIn, i.heightIn)));

  const fit = ORDER.find(v => totalWeight <= VEHICLES[v].maxWeightLb && totalVolume <= VEHICLES[v].maxVolumeCuFt && longest <= VEHICLES[v].maxLengthIn);

  const summary = { totalWeightLb: Math.round(totalWeight), totalVolumeCuFt: Math.round(totalVolume), longestIn: longest };
  if (!fit) return { error: 'Too big or heavy for a single vehicle — needs a freight quote from a human', ...summary };
  return { vehicle: fit, label: VEHICLES[fit].label, ...summary };
}

export type Weather = 'clear' | 'rain' | 'snow' | 'storm';
const WEATHER_SURCHARGE: Record<Weather, number> = { clear: 0, rain: 0.1, snow: 0.25, storm: 0.35 };

export type QuoteInput = {
  vehicle: VehicleType;
  distanceMiles: number;
  durationMinutes: number;
  fuelPricePerGallon: number;
  weather: Weather;
  helpers: number; // extra people to carry heavy items (0–2)
  pieces: number; // how many items to load (each adds a handling fee)
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The price. Every line is shown, so a human (or a regulator) can check it. */
export function calculateQuote(input: QuoteInput) {
  const v = VEHICLES[input.vehicle];
  if (!v) return { error: `Unknown vehicle ${input.vehicle}` };
  if (input.distanceMiles <= 0 || input.durationMinutes <= 0) return { error: 'Distance and duration must be positive' };
  if (input.helpers < 0 || input.helpers > 2) return { error: 'helpers must be 0, 1 or 2' };

  const lines = {
    base: v.baseFee,
    distance: round2(input.distanceMiles * v.perMile),
    time: round2(input.durationMinutes * v.perMinute),
    fuel: round2((input.distanceMiles / v.mpg) * input.fuelPricePerGallon),
    helpers: input.helpers * 40,
    handling: input.pieces * 3,
  };
  const subtotal = Object.values(lines).reduce((a, b) => a + b, 0);
  const weatherSurcharge = round2(subtotal * WEATHER_SURCHARGE[input.weather]);
  const total = Math.max(round2(subtotal + weatherSurcharge), 20); // $20 minimum job

  return { vehicle: v.label, lines: { ...lines, weatherSurcharge }, total, currency: 'USD' };
}

// Fake fuel price table ($/gallon, regular). A real app would call a fuel-price API
// (e.g. the US EIA open data API, free with a key) and cache the result for a day.
const FUEL_PRICES: Record<string, number> = { California: 4.89, Texas: 2.79, 'New York': 3.29, Washington: 4.29 };
export function getFuelPrice({ state }: { state: string }) {
  const price = FUEL_PRICES[state] ?? 3.19;
  return { state, pricePerGallon: price, source: FUEL_PRICES[state] ? 'state average' : 'national average' };
}
```

```text
REAL OUTPUT (the numbers the rest of the guide uses)
  chooseVehicle([sofa 84×36×34 in, 120 lb])   → cargo_van   (84 in is too long for a car)
  chooseVehicle([2 boxes 18×12×12 in, 15 lb]) → car
  chooseVehicle([piano, 7000 lb])             → { error: 'Too big or heavy … needs a freight
                                                  quote from a human' }

  calculateQuote({ cargo_van, 10.1 mi, 18 min, $4.89/gal, clear, 1 helper, 1 piece })
    lines: base 35 · distance 16.16 · time 8.10 · fuel 2.74 · helpers 40 · handling 3
    total: $105         (and $115.50 in the rain: +10%)

WHY THIS FILE HAS NO AI IN IT‼️
  - It's testable: the same inputs always give the same price (section 12).
  - It's explainable: every line is visible, so support staff can answer "why $105?".
  - The business can change the rules (new vehicle, new surcharge) without touching prompts.
```

---

## 5. Real-World Data — Maps and Weather

```typescript
// maps.ts — real, FREE, no-key APIs: OpenStreetMap Nominatim (address → coordinates),
// OSRM (driving route) and Open-Meteo (weather). Section 11 shows the Google Maps swap.

const USER_AGENT = 'delivery-quote-agent-tutorial/1.0'; // Nominatim requires an identifying User-Agent
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type Place = { lat: number; lon: number; state: string; label: string };

async function geocode(address: string): Promise<Place | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: address, format: 'json', limit: '1', addressdetails: '1' }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Geocoding failed: HTTP ${res.status}`);
  const [hit] = await res.json();
  if (!hit) return null;
  return { lat: Number(hit.lat), lon: Number(hit.lon), state: hit.address?.state ?? 'unknown', label: hit.display_name };
}

export async function getRoute({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  const from = await geocode(pickup);
  await sleep(1100); // Nominatim's free tier allows 1 request per second — be polite
  const to = await geocode(dropoff);
  if (!from) return { error: `Could not find the pickup address "${pickup}". Ask the customer for a fuller address.` };
  if (!to) return { error: `Could not find the drop-off address "${dropoff}". Ask the customer for a fuller address.` };

  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`);
  const data = await res.json();
  if (data.code !== 'Ok') return { error: 'No driving route between those addresses' };
  const route = data.routes[0];
  return {
    distanceMiles: Math.round((route.distance / 1609.34) * 10) / 10, // OSRM gives metres
    durationMinutes: Math.round(route.duration / 60), // …and seconds
    pickupState: from.state,
    pickupLatitude: from.lat,
    pickupLongitude: from.lon,
    pickupFound: from.label, // lets the agent confirm "did you mean…?"
    dropoffFound: to.label,
  };
}

// Open-Meteo returns a WMO weather code per day; group them into what pricing cares about
function toCondition(code: number) {
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'clear'; // 0–3 clear/cloudy, 45/48 fog
}

export async function getWeather({ latitude, longitude, date }: { latitude: number; longitude: number; date: string }) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: 'weather_code,precipitation_probability_max',
    timezone: 'auto',
    start_date: date,
    end_date: date,
  }).toString();
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) return { error: `Weather unavailable for ${date} (forecasts cover the next 16 days)` };
  return {
    date,
    condition: toCondition(data.daily.weather_code[0]),
    precipitationChancePercent: data.daily.precipitation_probability_max[0],
  };
}
```

```text
REAL OUTPUT
  getRoute({ pickup: 'Ferry Building, San Francisco', dropoff: 'Lake Merritt, Oakland' })
    → { distanceMiles: 11.2, durationMinutes: 19, pickupState: 'California',
        pickupLatitude: 37.7955, pickupLongitude: -122.3935,
        pickupFound: 'San Francisco Ferry Building, 1, The Embarcadero, …' }
  getWeather({ latitude: 37.79, longitude: -122.39, date: '2026-11-12' })
    → { date: '2026-11-12', condition: 'clear', precipitationChancePercent: 33 }
  getRoute({ pickup: 'asdkjhqwe nowhere 99', … })
    → { error: 'Could not find the pickup address … Ask the customer for a fuller address.' }
  getWeather({ …, date: '2027-03-01' })
    → { error: 'Weather unavailable for 2027-03-01 (forecasts cover the next 16 days)' }

‼️ Every failure comes back as { error } with a hint for the model ("Ask the customer for a
   fuller address"). The agent turns that into a sensible question instead of crashing.‼️
```

---

## 6. Version 1 — Five Tools, the Model Runs the Steps

The obvious first design: give the model one tool per job and let it call them in order.

```typescript
// v1 (shortened) — each tool is ONE zod schema, used twice: turned into the JSON Schema the model sees
// (z.toJSONSchema) AND used to validate the arguments the model sends back (safeParse)
export const TOOL_DEFS = {
  get_route: { description: 'Driving distance and time between two addresses…', schema: z.object({ pickup: z.string(), dropoff: z.string() }), run: getRoute },
  get_weather: { description: 'Weather on the delivery date at the pickup…', schema: z.object({ latitude: z.number(), longitude: z.number(), date: z.string() }), run: getWeather },
  get_fuel_price: { description: 'Fuel price per gallon in a US state…', schema: z.object({ state: z.string() }), run: getFuelPrice },
  choose_vehicle: { description: 'Pick the smallest vehicle that fits all items…', schema: z.object({ items: z.array(ItemSchema) }), run: ({ items }) => chooseVehicle(items) },
  calculate_quote: { description: 'Calculate the price. Only call after the others…', schema: QuoteInputSchema, run: storeAndReturnQuote },
};
// System prompt: "…call the tools in this order: get_route, get_weather, get_fuel_price,
// choose_vehicle, calculate_quote. NEVER state a price yourself… always include the quoteId."
```

```text
REAL OUTPUT

you>   Hi, I need a quote to move a sofa tomorrow
  [tool] get_route({"pickup":"123 Main St, Anytown, USA","dropoff":"456 Elm St, Anytown, USA"})
agent> I couldn't find the pickup address "123 Main St, Anytown, USA". Could you provide a
       fuller address? … a typical sofa is about 72" long, 36" wide, and 32" high …

you>   From the Ferry Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland.
       It's about 84 by 36 by 34 inches and 120 lb.
  [tool] get_route({"pickup":"The Ferry Building, San Francisco, CA","dropoff":"1 Frank H Ogawa Plaza, Oakland, CA"})
  [tool] get_weather({"latitude":37.7959463,"longitude":-122.3937376,"date":"2026-11-12"})
  [tool] get_fuel_price({"state":"California"})
  [tool] choose_vehicle({"items":[{"description":"Sofa","lengthIn":72,"widthIn":36,"heightIn":34,"weightLb":120,"quantity":1}]})
  [tool] calculate_quote({"vehicle":"cargo_van","distanceMiles":10.1,"durationMinutes":18,"fuelPricePerGallon":4.89,"weather":"clear","helpers":0})
agent> … Base fee: $35.00 · Distance: $16.16 · Time: $8.10 · Fuel: $2.74 · Weather: $0.00
       The total quote is $62.00 USD. The quote is valid for the next 30 minutes.
```

```text
‼️ IT LOOKS IMPRESSIVE — FIVE TOOLS CHAINED PERFECTLY — AND IT'S WRONG IN FOUR WAYS

  1. INVENTED AN ADDRESS. With no addresses given, it called get_route with
     "123 Main St, Anytown, USA" instead of asking. Only the geocoder failing saved it.
  2. CHANGED THE CUSTOMER'S NUMBER. The customer said 84 inches. The model passed 72 —
     its OWN earlier guess. A 72-inch sofa fits different vehicles than an 84-inch one.
  3. MADE A BUSINESS DECISION. The prompt said heavy items (over 100 lb) need a helper.
     The sofa is 120 lb. It chose helpers: 0 — a $40 line and an injured driver.
  4. DROPPED A REQUIRED DETAIL. "Always include the quoteId" — it didn't.

  The order of the tool calls was always the same, and every input to calculate_quote
  came from an earlier tool. Nothing about that NEEDED a model's judgement — so why let
  the model do it, and give it four chances to get it wrong? → Version 2.‼️
```

---

## 7. Version 2 — One Tool, Code Runs the Steps

```text
THE CHANGE
  The five fixed steps become ONE function in code, getQuote(). The model gets ONE tool:
  get_quote({ pickup, dropoff, date, items }) — just the things only the customer knows.
  Code decides the helpers, the vehicle, the order, and builds the price.

  This is the "workflow inside an agent" pattern (AI-AGENTS-BASICS-JS.md §2): the
  conversation is open-ended (agent), the quoting is a fixed sequence (workflow).
```

```typescript
// quote.ts — ONE quote function. Code runs the fixed steps (a workflow); the model only talks.
import { calculateQuote, chooseVehicle, getFuelPrice, type Item } from './pricing.ts';
import { getRoute, getWeather } from './maps.ts';

export type StoredQuote = {
  quoteId: string;
  pickup: string;
  dropoff: string;
  date: string;
  items: Item[];
  total: number;
  createdAt: number;
};
export const QUOTES = new Map<string, StoredQuote>();
export const QUOTE_TTL_MS = 30 * 60 * 1000; // quotes are valid for 30 minutes

export async function getQuote({ pickup, dropoff, date, items }: { pickup: string; dropoff: string; date: string; items: Item[] }) {
  // 1. Route — the step most likely to fail (unknown address), so do it first.
  //    Clean up what the model copies from the chat ("From the Ferry Building…")
  const clean = (a: string) => a.replace(/^\s*(from|to)\s+/i, '').replace(/\s+in\s+/i, ', ');
  const route = await getRoute({ pickup: clean(pickup), dropoff: clean(dropoff) });
  if ('error' in route) return route;

  // 2. Vehicle — and the HELPER RULE, in code: anything over 100 lb needs a second person
  const vehicle = chooseVehicle(items);
  if ('error' in vehicle) return vehicle;
  const helpers = items.some(i => i.weightLb > 100) ? 1 : 0;

  // 3. Weather and fuel don't depend on each other → fetch them in parallel
  const [weather, fuel] = await Promise.all([getWeather({ latitude: route.pickupLatitude, longitude: route.pickupLongitude, date }), Promise.resolve(getFuelPrice({ state: route.pickupState }))]);
  if ('error' in weather) return weather;

  // 4. Price
  const quote = calculateQuote({
    vehicle: vehicle.vehicle,
    distanceMiles: route.distanceMiles,
    durationMinutes: route.durationMinutes,
    fuelPricePerGallon: fuel.pricePerGallon,
    weather: weather.condition,
    helpers,
    pieces: items.reduce((n, i) => n + i.quantity, 0),
  });
  if ('error' in quote) return quote;

  const quoteId = `Q-${crypto.randomUUID().slice(0, 8)}`;
  QUOTES.set(quoteId, { quoteId, pickup: route.pickupFound, dropoff: route.dropoffFound, date, items, total: quote.total, createdAt: Date.now() });

  return {
    quoteId,
    total: quote.total,
    currency: 'USD',
    breakdown: quote.lines,
    vehicle: vehicle.label,
    helpers,
    distanceMiles: route.distanceMiles,
    driveMinutes: route.durationMinutes,
    weather: `${weather.condition} (${weather.precipitationChancePercent}% chance of rain)`,
    // Echo back what the quote is BASED ON, so the customer can spot a wrong number
    basedOn: {
      pickup: route.pickupFound,
      dropoff: route.dropoffFound,
      // weekday computed in CODE — the model got "tomorrow is Wednesday" wrong once
      date: `${new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })} ${date}`,
      items: items.map(i => `${i.quantity} × ${i.description}: ${i.lengthIn}×${i.widthIn}×${i.heightIn} in, ${i.weightLb} lb`),
    },
    validForMinutes: 30,
  };
}

/** Book a stored quote. Shared by the chat tool (CLI) and the POST /bookings endpoint (web). */
export function bookQuote(quoteId: string, customerName: string, phone: string) {
  const quote = QUOTES.get(quoteId);
  if (!quote) return { error: `No quote with id ${quoteId}` };
  if (Date.now() - quote.createdAt > QUOTE_TTL_MS) return { error: 'That quote has expired — get a new quote.' };
  QUOTES.delete(quoteId); // a quote can only be booked once
  const bookingId = `B-${crypto.randomUUID().slice(0, 8)}`;
  // The confirmation text is built by CODE from the stored quote — the model once wrote
  // the wrong date in its own summary of a booking.
  const confirmation = `Booking ${bookingId} for ${customerName}: pickup ${quote.pickup}, drop-off ${quote.dropoff}, on ${quote.date}. Total $${quote.total}.`;
  return { booked: true, bookingId, total: quote.total, confirmation };
}
```

```text
‼️ WHAT IMPROVED (real runs of the same conversation)
   - Turn 1: both runs now ASKED for the addresses instead of inventing them.
   - Turn 2: the tool got lengthIn 84 — the customer's real number — and helpers: 1.
   - The reply included the quoteId and the "basedOn" echo, so the customer can see
     "1 × sofa: 84×36×34 in, 120 lb" and spot a mistake.

NEW PROBLEMS, FOUND BY RUNNING IT MORE THAN ONCE
   a) One run returned an EMPTY reply (no text, no tool call). Measured over 8 identical
      tries: 7 called the tool, 1 returned nothing. Fix: if the reply is empty, don't save
      it and ask the model again, once (section 9's runTurn).
   b) One reply said "tomorrow, Wednesday 2026-11-12". Today was Wednesday — tomorrow is
      THURSDAY. Fix: the weekday in basedOn.date is computed in code.
   c) One run answered entirely in CHINESE (qwen is a Chinese-English model) halfway
      through the chat. Fix: "Always reply in English." in the system prompt.

AND THEN THE RUN THAT MADE VERSION 3 NECESSARY

you>   Hi, I need a quote to move a sofa tomorrow
  [tool] get_quote({"pickup":"456 Oak Avenue, Springfield","dropoff":"123 Elm Street, Springfield","date":"2026-11-12","items":[{"description":"sofa","lengthIn":72,"widthIn":36,"heightIn":36,"weightLb":150,"quantity":1}]})
agent> Here is your quote: Total: $886.66 … Distance: 351.2 miles · Drive time: 410 minutes …

you>   From the Ferry Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland. …
  [tool] get_quote({"pickup":"Ferry Building in San Francisco, California, United States", …, "date":"2026-11-13", …})
  [tool] get_quote({"pickup":"900 Main Street, San Francisco, CA, 94103, United States", …})
agent> Here is your quote: Total: $115.50 … Delivery date: Friday, 2026-11-13 …

‼️ READ THAT AGAIN
   - Turn 1: the customer gave NO addresses and NO measurements. The model made up two
     addresses in "Springfield", a sofa size and a weight, a real geocoder FOUND a
     Springfield, and the customer was quoted $886 for a 351-mile trip.
   - Turn 2: when the real pickup failed to geocode, the model quietly replaced it with
     "900 Main Street" — an address nobody said — and moved the date to Friday.
   The system prompt said "Never make up addresses, sizes or weights" in capital letters.
   It didn't matter. A rule in a prompt is a request, not a guarantee.‼️
```

---

## 8. Version 3 — Grounding: Did the Customer Actually Say That?

```text
THE IDEA
  Before running get_quote, CODE checks every argument against the customer's own messages:
    - every meaningful word of each address must appear in what the customer typed
    - every size and weight must be a number the customer typed
    - the date must be a word the customer used ("tomorrow", "friday") or a date they typed
  If anything fails, the tool returns { error: 'These details were NOT given by the
  customer: …. Ask the customer for them' } — and the model asks.

  Dates go one step further: the model passes the customer's WORD ("tomorrow"), and code
  turns it into a date. The model never does calendar maths.
```

```typescript
// grounding.ts — check that tool arguments came from the CUSTOMER, not the model's imagination
import type { Item } from './pricing.ts';

const IGNORED = new Set(['from', 'to', 'the', 'in', 'at', 'of', 'and', 'usa', 'united', 'states', 'us', 'ca', 'california', 'st', 'street', 'ave', 'avenue', 'rd', 'road']);
const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/**
 * Every meaningful word of the address must appear somewhere in what the customer wrote.
 * A simple heuristic, good enough to catch invented addresses. Production systems also show
 * the geocoded result ("San Francisco Ferry Building, 1 The Embarcadero") for the customer to confirm.
 */
function addressIsGrounded(address: string, customerText: string) {
  const said = new Set(words(customerText));
  const important = words(address).filter(w => !IGNORED.has(w));
  return important.length > 0 && important.every(w => said.has(w));
}

/** Every size and weight must be a number the customer actually typed. */
function numberIsGrounded(n: number, customerText: string) {
  const said = (customerText.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  return said.includes(n);
}

// YYYY-MM-DD in LOCAL time ('en-CA' formats dates that way). toISOString() would use UTC,
// which is already "tomorrow" in the evening in the US.
export const localDate = (d: Date) => d.toLocaleDateString('en-CA');

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const RELATIVE = ['today', 'tomorrow', ...WEEKDAYS];

/** Relative dates are resolved in CODE, not by the model: today, tomorrow, a weekday, or YYYY-MM-DD. */
export function resolveDate(date: string, today = new Date()): string | null {
  const word = date.trim().toLowerCase();
  const d = new Date(today);
  if (word === 'today') return localDate(d);
  if (word === 'tomorrow') {
    d.setDate(d.getDate() + 1);
    return localDate(d);
  }
  const weekday = WEEKDAYS.indexOf(word);
  if (weekday !== -1) {
    const daysAhead = (weekday - d.getDay() + 7) % 7 || 7; // "Friday" = the NEXT Friday, never today
    d.setDate(d.getDate() + daysAhead);
    return localDate(d);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export function checkGrounding(args: { pickup: string; dropoff: string; date: string; items: Item[] }, customerText: string): string[] {
  const problems: string[] = [];
  if (!addressIsGrounded(args.pickup, customerText)) problems.push(`pickup address "${args.pickup}"`);
  if (!addressIsGrounded(args.dropoff, customerText)) problems.push(`drop-off address "${args.dropoff}"`);
  const dateWord = args.date.trim().toLowerCase();
  const dateSaid = RELATIVE.includes(dateWord) ? customerText.toLowerCase().includes(dateWord) : customerText.includes(args.date);
  if (!dateSaid) problems.push(`date "${args.date}"`);
  for (const item of args.items) {
    for (const [field, value] of Object.entries({ lengthIn: item.lengthIn, widthIn: item.widthIn, heightIn: item.heightIn, weightLb: item.weightLb })) {
      if (!numberIsGrounded(value, customerText)) problems.push(`${item.description} ${field} = ${value}`);
    }
  }
  return problems;
}
```

```text
REAL CHECKS AGAINST THE ACTUAL FAILURES
  Customer said: "…sofa tomorrow … from the Ferry Building in San Francisco to 1 Frank H Ogawa
                  Plaza, Oakland … 84 by 36 by 34 inches and 120 lb."

  checkGrounding({ pickup: 'Ferry Building, San Francisco, CA', dropoff: '1 Frank H Ogawa
                   Plaza, Oakland', date: 'tomorrow', items: [84×36×34, 120 lb] })
    → []                                                     ✓ allowed
  checkGrounding({ pickup: '900 Main Street, San Francisco, CA', date: '2026-11-13',
                   items: [lengthIn 72 …] })
    → [ 'pickup address "900 Main Street, San Francisco, CA"',
        'date "2026-11-13"',
        'sofa lengthIn = 72' ]                               ✗ blocked, all three
  resolveDate('tomorrow', Wed 2026-11-11) → '2026-11-12'
  resolveDate('friday',   Wed 2026-11-11) → '2026-11-13'
  resolveDate('next week', …)             → null   → "Unclear date — ask the customer"

AND IN A REAL CHAT, VERSION 3 CAUGHT ONE IMMEDIATELY
  [tool] get_quote({… "pickup":"Ferry Building, 33 Sansome St, San Francisco, CA" …})
  [tool error] These details were NOT given by the customer: pickup address
               "Ferry Building, 33 Sansome St, San Francisco, CA". Ask the customer for them.
  agent> I understand we need a more accurate pickup address. Could you please provide the
         full address for the pickup location …

‼️ GROUNDING IS A GENERAL TECHNIQUE, not a delivery trick. Whenever a tool argument should
   come from the USER (an amount to transfer, an email address, an account number), check
   it against what the user actually said before acting on it.

   It's a heuristic, and it can be too strict (a customer who writes "SF" won't match
   "San Francisco"). Too strict is the right side to fail on: the cost is one extra
   question, not a wrong price.‼️
```

---

## 9. The Final Agent

```typescript
// agent.ts — the delivery quote agent: one quote tool, grounded arguments, code-side dates, booking
import OpenAI from 'openai';
import { z } from 'zod';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { bookQuote, getQuote, QUOTES } from './quote.ts';
import { checkGrounding, localDate, resolveDate } from './grounding.ts';

export const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY ?? 'ollama',
});
export const MODEL = process.env.LLM_MODEL ?? 'qwen2.5:7b';

const ItemSchema = z.object({
  description: z.string(),
  lengthIn: z.number().positive(),
  widthIn: z.number().positive(),
  heightIn: z.number().positive(),
  weightLb: z.number().positive(),
  quantity: z.number().int().positive(),
});

const GetQuoteArgs = z.object({
  pickup: z.string().min(3).describe("pickup address, in the customer's own words"),
  dropoff: z.string().min(3).describe("drop-off address, in the customer's own words"),
  date: z.string().describe('"today", "tomorrow", a weekday like "friday", or YYYY-MM-DD — exactly as the customer said it'),
  items: z.array(ItemSchema).min(1).describe('EXACTLY the sizes and weights the customer gave'),
});

const BookArgs = z.object({
  quoteId: z.string().min(1),
  customerName: z.string().min(1),
  phone: z.string().min(7),
});

function toTool(name: string, description: string, schema: z.ZodObject<any>): ChatCompletionTool {
  const { $schema, ...parameters } = z.toJSONSchema(schema) as Record<string, unknown>;
  return { type: 'function', function: { name, description, parameters } };
}

export const TOOLS: ChatCompletionTool[] = [
  toTool('get_quote', 'Price a delivery. Only call when the CUSTOMER has given the pickup address, drop-off address, date, and size + weight of every item.', GetQuoteArgs),
  toTool('book_delivery', 'Book a quoted delivery. Only call after the customer says they want to book AND has given their name and phone number.', BookArgs),
];

export function systemPrompt(canBook: boolean, today = new Date()) {
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
  return `You are a friendly delivery quote assistant for a same-day delivery company.
Always reply in English. Today is ${weekday} ${localDate(today)}.

To quote you need, FROM THE CUSTOMER: pickup address, drop-off address, delivery date, and for
each item its size in inches (length × width × height), weight in pounds and quantity.
If anything is missing, ask for ALL missing details in one short message.
Never make up addresses, sizes or weights. If get_quote says details were not given by the
customer, ask the customer for them.

After get_quote, reply with the total, the quoteId, the vehicle and the "basedOn" details so the
customer can check them. Never state a price yourself.
${canBook ? "To book, you need the quoteId plus the customer's name and phone number." : 'You cannot book. To book, the customer presses "Book" on the quote card.'}`;
}

// The customer's own words — the ONLY source the tool arguments may come from
const customerText = (messages: ChatCompletionMessageParam[]) =>
  messages
    .filter(m => m.role === 'user')
    .map(m => String(m.content))
    .join('\n');

export type Confirm = (question: string) => Promise<boolean>;

async function runTool(name: string, rawArgs: string, messages: ChatCompletionMessageParam[], confirm?: Confirm) {
  const raw = JSON.parse(rawArgs);

  if (name === 'get_quote') {
    const parsed = GetQuoteArgs.safeParse(raw);
    if (!parsed.success) return { error: `Missing or invalid details: ${z.prettifyError(parsed.error)}. Ask the customer.` };
    const notGiven = checkGrounding(parsed.data, customerText(messages));
    if (notGiven.length) {
      return { error: `These details were NOT given by the customer: ${notGiven.join('; ')}. Ask the customer for them — do not guess.` };
    }
    const date = resolveDate(parsed.data.date);
    if (!date) return { error: `Unclear date "${parsed.data.date}". Ask the customer for the date.` };
    return getQuote({ ...parsed.data, date });
  }

  if (name === 'book_delivery' && confirm) {
    const parsed = BookArgs.safeParse(raw);
    if (!parsed.success) return { error: `Missing booking details: ${z.prettifyError(parsed.error)}` };
    const quote = QUOTES.get(parsed.data.quoteId);
    if (!quote) return { error: `No quote with id ${parsed.data.quoteId}` };
    // ‼️ The price shown to the human comes from the STORED quote, never from the model
    const ok = await confirm(`Book ${quote.quoteId} for ${parsed.data.customerName} (${parsed.data.phone}) — $${quote.total}?`);
    if (!ok) return { error: 'The booking was not confirmed. Do not retry unless the customer asks again.' };
    return { ...bookQuote(quote.quoteId, parsed.data.customerName, parsed.data.phone), instruction: 'Show the customer the confirmation text exactly as written.' };
  }

  return { error: `Unknown tool ${name}` };
}

/**
 * One customer turn. Pass `confirm` to let the agent book (terminal chat). Leave it out and the
 * agent can only quote — the web app books through a normal endpoint instead (section 11).
 */
export async function runTurn(messages: ChatCompletionMessageParam[], confirm?: Confirm, maxSteps = 6): Promise<string> {
  const tools = confirm ? TOOLS : TOOLS.filter(t => t.function.name !== 'book_delivery');
  let emptyRetries = 0;
  for (let step = 0; step < maxSteps; step++) {
    const message = (await client.chat.completions.create({ model: MODEL, messages, tools })).choices[0].message;

    // Small models sometimes return NOTHING (no text, no tool call) — retry once
    if (!message.tool_calls?.length && !message.content?.trim() && emptyRetries++ < 1) continue;

    messages.push(message);
    if (!message.tool_calls?.length) return message.content || 'Sorry, could you say that again?';

    for (const call of message.tool_calls) {
      if (call.type !== 'function') continue;
      let result: unknown;
      try {
        console.log(`  [tool] ${call.function.name}(${call.function.arguments})`);
        result = await runTool(call.function.name, call.function.arguments, messages, confirm);
      } catch (e) {
        result = { error: String(e) };
      }
      if (result && typeof result === 'object' && 'error' in result) console.log(`  [tool error] ${(result as any).error}`);
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return 'Sorry, I got stuck working that out. A teammate will follow up.';
}

/** canBook: true for the terminal chat (agent can book, with a confirm step); false for the web app. */
export const newConversation = (canBook = false): ChatCompletionMessageParam[] => [{ role: 'system', content: systemPrompt(canBook) }];
```

```text
THE PARTS THAT MATTER

  Multi-turn memory   runTurn() gets the SAME messages array every turn and pushes onto it.
                      That array is the whole conversation; nothing else remembers anything.
  customerText()      only role:'user' messages — the model's own words don't count as
                      evidence for grounding, or it could "ground" its own guesses.
  Booking             the model can only pass a quoteId. The price the human confirms comes
                      from the STORED quote, so the model can't change it. A quote books once.
  confirm             passed in from outside: the terminal asks y/N; the web app doesn't give
                      the agent a booking tool at all (section 11).
  emptyRetries        the "1 in 8 empty replies" fix from section 7.
```

```text
REAL OUTPUT — the full conversation, final version

you>   Hi, I need a quote to move a sofa tomorrow
agent> Sure, I can help with that. Could you please provide me with the pickup and drop-off
       addresses, as well as the dimensions and weight of the sofa?

you>   From the Ferry Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland.
       It's about 84 by 36 by 34 inches and 120 lb.
  [tool] get_quote({"date":"tomorrow","items":[{"description":"sofa","heightIn":34,"lengthIn":84,"quantity":1,"weightLb":120,"widthIn":36}],"pickup":"The Ferry Building, San Francisco, CA","dropoff":"1 Frank H Ogawa Plaza, Oakland"})
agent> Here is your delivery quote for tomorrow, Thursday, 2026-11-12:
       - Total: $105 USD
       - Quote ID: Q-54233cbf
       - Vehicle: Cargo van
       - Pickup: The Epicurean Trader, 1, Ferry Building, San Francisco, California, 94111
       - Dropoff: Oakland City Hall, 1, Frank H. Ogawa Plaza, Oakland, California, 94612
       - Item: 1 × sofa: 84×36×34 in, 120 lb
       Would you like to book the delivery now?

you>   Actually, add 2 boxes too, each 18 by 12 by 12 inches and 15 lb.
  [tool] get_quote({… same addresses and date … "items":[{sofa…},{"description":"box","heightIn":12,"lengthIn":18,"quantity":2,"weightLb":15,"widthIn":12}]})
agent> Here is your new quote: Total: $111 USD · Quote ID: Q-0ecca37e · Cargo van · Helpers: 1
       Items: 1 × sofa: 84×36×34 in, 120 lb · 2 × box: 18×12×12 in, 15 lb each

you>   Great, book it. I'm Alex Kim, 415-555-0134.
  [tool] book_delivery({"quoteId":"Q-0ecca37e","customerName":"Alex Kim","phone":"415-555-0134"})
  [confirm] Book Q-0ecca37e for Alex Kim (415-555-0134) — $111? → yes   (answered by the test script)
agent> Your delivery has been booked successfully. Booking ID: B-0e6608c1 · Total: $111 USD

A SEPARATE RUN — changing the date
you>   What if I do it on Friday instead?
  [tool] get_quote({"date":"friday", …})
agent> Your quote for delivery on Friday is: Total: $115.50 USD · Quote ID: Q-58671a62 ·
       Date: Friday 2026-11-13. The weather forecast predicts a 99% chance of rain, which
       has increased the quote by $10.50.

‼️ NOTICE
   - Turn 3 kept both addresses and the sofa from earlier turns — memory is just the array.
   - "The Epicurean Trader, 1, Ferry Building" is what the geocoder matched (a shop inside
     the building). Echoing it back in basedOn is what lets the customer catch that.
   - Friday's real forecast (99% rain) changed the price through code: 10% of $105 = $10.50.

WHAT STILL WASN'T PERFECT (all real)
   - In one run the model's own booking message said "November 16" for a Thursday-the-12th
     booking. That's why bookQuote() returns a `confirmation` string built by CODE —
     and why a real UI should DISPLAY that string or a booking card, not the model's prose.
   - In another it labelled the customer "Service Provider: Alex Kim". Same lesson.‼️
```

---

## 10. Chatting in the Terminal

```typescript
// chat.ts — talk to the agent in the terminal:  node chat.ts
import * as readline from 'node:readline/promises';
import { newConversation, runTurn } from './agent.ts';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const messages = newConversation(true); // ONE array for the whole conversation = the agent's memory

// The human approval step for bookings — it shows the price from the STORED quote
const confirm = async (question: string) => (await rl.question(`  ${question} [y/N] `)).trim().toLowerCase() === 'y';

console.log('Delivery quote assistant — type "exit" to quit.\n');
while (true) {
  const text = await rl.question('you> ');
  if (text.trim().toLowerCase() === 'exit') break;
  messages.push({ role: 'user', content: text });
  console.log(`agent> ${await runTurn(messages, confirm)}\n`);
}
rl.close();
```

```text
node chat.ts

The y/N question comes from YOUR code with the stored price, so even if the model says
"great, that's $50!" in its message, the human approves the real $111.
```

---

## 11. The Express API

```typescript
// server.ts — the chat agent behind an Express API:  node server.ts
import express from 'express';
import { z } from 'zod';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { newConversation, runTurn } from './agent.ts';
import { bookQuote } from './quote.ts';

export const app = express();
app.use(express.json());

// One message history per conversation. In production: Redis or a database, with a TTL.
const SESSIONS = new Map<string, ChatCompletionMessageParam[]>();

const ChatBody = z.object({ sessionId: z.string().optional(), message: z.string().min(1).max(2000) });

app.post('/chat', async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Invalid body', details: z.flattenError(parsed.error) });

  const sessionId = parsed.data.sessionId ?? crypto.randomUUID();
  const messages = SESSIONS.get(sessionId) ?? newConversation();
  SESSIONS.set(sessionId, messages);

  messages.push({ role: 'user', content: parsed.data.message });
  const reply = await runTurn(messages); // no confirm → the agent can quote but not book

  // The UI's quote card is built from the TOOL RESULT (data), not from the model's prose
  const latestQuote = [...messages]
    .reverse()
    .filter(m => m.role === 'tool')
    .map(m => JSON.parse(String(m.content)))
    .find(r => r.quoteId);

  res.json({ sessionId, reply, quote: latestQuote ?? null });
});

const BookBody = z.object({ quoteId: z.string().min(1), customerName: z.string().min(1), phone: z.string().min(7) });

// Booking is a normal endpoint the "Book" button calls — no model involved
app.post('/bookings', (req, res) => {
  const parsed = BookBody.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Invalid body', details: z.flattenError(parsed.error) });
  const result = bookQuote(parsed.data.quoteId, parsed.data.customerName, parsed.data.phone);
  if ('error' in result) return res.status(409).json(result);
  res.status(201).json(result);
});

if (import.meta.main) {
  app.listen(3000, () => console.log('Listening on http://localhost:3000'));
}
```

```text
REAL OUTPUT (curl against the running server)

POST /chat {"message":"Quote please: sofa 84 by 36 by 34 inches, 120 lb, from the Ferry
            Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland, tomorrow."}
→ { "sessionId": "76cf7526-…", "reply": "… Total: $105 USD … Quote ID: Q-5c37b614 …",
    "quote": { "quoteId": "Q-5c37b614", "total": 105, "breakdown": {…}, "basedOn": {…} } }

POST /bookings {"quoteId":"Q-5c37b614","customerName":"Alex Kim","phone":"415-555-0134"}
→ 201 { "booked": true, "bookingId": "B-37597e97", "total": 105, "confirmation": "Booking …" }

POST /bookings (same body again)
→ 409 { "error": "No quote with id Q-5c37b614" }      ← a quote can only be booked once

‼️ THREE DESIGN CHOICES WORTH COPYING
   1. The React app gets `quote` as DATA, taken from the tool result in code. It renders the
      quote card from that, so the price on screen can never be the model's paraphrase.
   2. In the web app the agent has NO booking tool. Booking is a normal endpoint behind a
      "Book" button. The model was never needed for that step, so it isn't given the power.
   3. sessionId keys the message history. Send it back on every /chat call to continue the
      conversation; leave it out to start a new one.

FOR PRODUCTION
   - Store SESSIONS and QUOTES in Redis/Postgres with expiry, not in-memory Maps.
   - Stream the reply (Server-Sent Events) — a turn with map calls takes several seconds.
   - Rate-limit /chat per user: every message costs model time and API calls.
```

---

## 12. Tests

```typescript
// pricing.test.ts — the money and the guard rails, no model needed
import { describe, expect, it } from 'vitest';
import { calculateQuote, chooseVehicle } from './pricing.ts';
import { checkGrounding, resolveDate } from './grounding.ts';

const sofa = { description: 'sofa', lengthIn: 84, widthIn: 36, heightIn: 34, weightLb: 120, quantity: 1 };

describe('chooseVehicle', () => {
  it('picks the smallest vehicle that fits', () => {
    expect(chooseVehicle([{ ...sofa, description: 'box', lengthIn: 18, widthIn: 12, heightIn: 12, weightLb: 15 }]).vehicle).toBe('car');
    expect(chooseVehicle([sofa]).vehicle).toBe('cargo_van'); // 84 in is too long for a car
  });
  it('refuses loads no vehicle can take', () => {
    expect(chooseVehicle([{ ...sofa, weightLb: 7000 }])).toHaveProperty('error');
  });
});

describe('calculateQuote', () => {
  const base = { vehicle: 'cargo_van', distanceMiles: 10.1, durationMinutes: 18, fuelPricePerGallon: 4.89, helpers: 1, pieces: 1 } as const;
  it('adds up every line', () => {
    expect(calculateQuote({ ...base, weather: 'clear' })).toMatchObject({ total: 105 });
  });
  it('adds 10% in the rain', () => {
    expect(calculateQuote({ ...base, weather: 'rain' })).toMatchObject({ total: 115.5 });
  });
});

describe('grounding', () => {
  const said = 'Sofa 84 by 36 by 34 inches, 120 lb, from the Ferry Building in San Francisco to 1 Frank H Ogawa Plaza, Oakland, tomorrow.';
  it('accepts details the customer gave', () => {
    expect(checkGrounding({ pickup: 'Ferry Building, San Francisco', dropoff: '1 Frank H Ogawa Plaza, Oakland', date: 'tomorrow', items: [sofa] }, said)).toEqual([]);
  });
  it('rejects an invented address, size and date', () => {
    const problems = checkGrounding({ pickup: '900 Main Street, San Francisco', dropoff: '1 Frank H Ogawa Plaza, Oakland', date: '2026-11-13', items: [{ ...sofa, lengthIn: 72 }] }, said);
    expect(problems).toHaveLength(3);
  });
  it('resolves relative dates in code', () => {
    const wed = new Date('2026-11-11T10:00:00');
    expect(resolveDate('tomorrow', wed)).toBe('2026-11-12');
    expect(resolveDate('friday', wed)).toBe('2026-11-13');
    expect(resolveDate('next week', wed)).toBeNull();
  });
});
```

```typescript
// agent.test.ts — the agent loop with a FAKE model, scripted to misbehave
import { afterEach, expect, it, vi } from 'vitest';

// Fake the slow, external quote step — we're testing the AGENT's guard rails here
vi.mock('./quote.ts', async importOriginal => ({
  ...(await importOriginal<typeof import('./quote.ts')>()),
  getQuote: vi.fn(async () => ({ quoteId: 'Q-test', total: 105 })),
}));

const { client, newConversation, runTurn } = await import('./agent.ts');
const { getQuote } = await import('./quote.ts');

const reply = (message: object) => ({ choices: [{ message: { role: 'assistant', content: null, ...message } }] }) as any;
const quoteCall = (args: object) => ({
  tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_quote', arguments: JSON.stringify(args) } }],
});
const sofa = { description: 'sofa', lengthIn: 84, widthIn: 36, heightIn: 34, weightLb: 120, quantity: 1 };

afterEach(() => vi.clearAllMocks());

it('blocks a quote built from details the customer never gave', async () => {
  vi.spyOn(client.chat.completions, 'create')
    .mockResolvedValueOnce(reply(quoteCall({ pickup: '456 Oak Avenue, Springfield', dropoff: '123 Elm Street, Springfield', date: 'tomorrow', items: [sofa] })))
    .mockResolvedValueOnce(reply({ content: 'What are the pickup and drop-off addresses?' }));

  const messages = newConversation();
  messages.push({ role: 'user', content: 'Hi, I need a quote to move a sofa tomorrow' });

  expect(await runTurn(messages)).toMatch(/addresses/);
  expect(getQuote).not.toHaveBeenCalled(); // the guard stopped it
  // (mock.calls keeps a REFERENCE to the same messages array, so search it rather than use .at(-1))
  const toolMessage = messages.find(m => m.role === 'tool')!;
  const toolResult = JSON.parse(String(toolMessage.content));
  expect(toolResult.error).toMatch(/NOT given by the customer/);
});

it('retries once when the model returns an empty reply', async () => {
  vi.spyOn(client.chat.completions, 'create')
    .mockResolvedValueOnce(reply({ content: '' }))
    .mockResolvedValueOnce(reply({ content: 'Could you share the addresses?' }));
  const messages = newConversation();
  messages.push({ role: 'user', content: 'hi' });
  expect(await runTurn(messages)).toBe('Could you share the addresses?');
});

it('cannot book without a confirm callback (web mode)', async () => {
  const create = vi.spyOn(client.chat.completions, 'create').mockResolvedValueOnce(reply({ content: 'ok' }));
  await runTurn([...newConversation(), { role: 'user', content: 'book it' }]);
  const toolNames = (create.mock.calls[0][0] as any).tools.map((t: any) => t.function.name);
  expect(toolNames).toEqual(['get_quote']);
});
```

```typescript
// server.test.ts — the API with the model turn replaced by a fake
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Replace the model turn with a fake that "quotes" by storing a real quote
vi.mock('./agent.ts', async importOriginal => {
  const { QUOTES } = await import('./quote.ts');
  return {
    ...(await importOriginal<typeof import('./agent.ts')>()),
    runTurn: vi.fn(async (messages: any[]) => {
      QUOTES.set('Q-test', { quoteId: 'Q-test', pickup: 'A', dropoff: 'B', date: '2026-11-12', items: [], total: 105, createdAt: Date.now() });
      messages.push({ role: 'tool', tool_call_id: 'call_1', content: JSON.stringify({ quoteId: 'Q-test', total: 105 }) });
      return 'Your total is $105 (quote Q-test).';
    }),
  };
});

const { app } = await import('./server.ts');

describe('delivery API', () => {
  it('chats and returns the quote card data', async () => {
    const res = await request(app).post('/chat').send({ message: 'quote a sofa' });
    expect(res.status).toBe(200);
    expect(res.body.quote).toEqual({ quoteId: 'Q-test', total: 105 });
    expect(res.body.sessionId).toBeTypeOf('string');
  });

  it('books a quote exactly once', async () => {
    await request(app).post('/chat').send({ message: 'quote a sofa' });
    const body = { quoteId: 'Q-test', customerName: 'Alex Kim', phone: '415-555-0134' };
    expect((await request(app).post('/bookings').send(body)).status).toBe(201);
    expect((await request(app).post('/bookings').send(body)).status).toBe(409);
  });

  it('rejects an empty message', async () => {
    expect((await request(app).post('/chat').send({ message: '' })).status).toBe(422);
  });
});
```

```text
npx vitest run   →   Test Files 3 passed · Tests 13 passed

‼️ THE MOST VALUABLE TEST: "blocks a quote built from details the customer never gave".
   It replays the exact $886 Springfield failure from section 7 with a fake model, and
   proves the grounding check stops it — every time, for free, on every pull request.
   When you find a real failure, turn it into a test like this.‼️

EVALS (real model, run separately — not in CI)
   A script with 10–20 scripted conversations and expected outcomes, e.g.
     - no details given          → the agent asks; get_quote is NOT called
     - "sofa … tomorrow …"       → a quote with lengthIn 84 and helpers 1
     - "make it friday"          → a new quote with the rain surcharge
     - unknown address           → the agent asks for a fuller address
   Run each several times and track the pass rate (section 7's "7 out of 8" is exactly
   this kind of number).
```

---

## 13. Swapping In Google Maps

```text
Only maps.ts changes. Everything else consumes { distanceMiles, durationMinutes,
pickupState, pickupLatitude, pickupLongitude, pickupFound, dropoffFound }.

Google's Routes API (computeRoutes) takes ADDRESSES directly (no separate geocoding step)
and can use live TRAFFIC for the departure time — the big upgrade for delivery ETAs.
It needs an API key on a Google Cloud project with billing enabled (there is a monthly
free usage allowance; check current pricing).
```

```typescript
// maps.google.ts — NOT run for this guide (needs a key + billing). Check the current
// Routes API docs before relying on the exact field names.
export async function getRouteGoogle({ pickup, dropoff, departureTime }: { pickup: string; dropoff: string; departureTime?: string }) {
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY!,
      // FieldMask = only return what you need (Google bills and responds faster this way)
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
    },
    body: JSON.stringify({
      origin: { address: pickup },
      destination: { address: dropoff },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE', // live traffic
      ...(departureTime && { departureTime }), // e.g. '2026-11-12T15:00:00Z'
    }),
  });
  if (!res.ok) return { error: `Routing failed: HTTP ${res.status}` };
  const route = (await res.json()).routes?.[0];
  if (!route) return { error: 'No driving route between those addresses' };
  return {
    distanceMiles: Math.round((route.distanceMeters / 1609.34) * 10) / 10,
    durationMinutes: Math.round(parseInt(route.duration, 10) / 60), // duration is a string like "1106s"
  };
  // You'd still geocode the pickup (Google Geocoding API) for the state and coordinates
  // that the fuel and weather lookups need.
}
```

```text
OTHER REAL DATA SOURCES
  Fuel prices   US EIA open data API (free with a key) — weekly regional averages; cache them
  Weather       Open-Meteo works in production for many uses; Google also has a Weather API
  Addresses     Google Places Autocomplete in the UI, so customers pick a real address
                instead of typing one — the best fix for geocoding failures
```

---

## 14. Rules of Thumb for a Real Delivery Business

```text
‼️ PRICES COME FROM CODE, ALWAYS
   The model never states or computes a price. It reports a quoteId whose price is stored
   server-side, and the UI renders the price from data.

‼️ QUOTES EXPIRE AND BOOK ONCE
   Fuel, traffic and weather change, so quotes are valid for a short time (30 min here).
   Booking deletes the quote, so a retry or a double-click can't book twice (idempotency).

‼️ CONFIRM WHAT THE QUOTE IS BASED ON
   Show the geocoded addresses, date and item list. "Oakland City Hall, 1 Frank H. Ogawa
   Plaza" is easy to check; "$105" on its own isn't.

‼️ GROUND EVERYTHING THE CUSTOMER MUST PROVIDE
   Addresses, sizes, weights, dates, names, phone numbers. Check them against the customer's
   messages before acting.

SAFETY AND LIABILITY
  - Weight and size limits are hard rules in code (chooseVehicle refuses a 7,000 lb piano
    and hands it to a human), not something the model can talk its way around.
  - Hazardous items (batteries, chemicals, firearms) → a code-level keyword check or a
    classifier that routes to a human; don't rely on the model to remember the policy.

PRIVACY
  - Names and phone numbers are personal data: don't log full conversations forever, and
    don't send more to a hosted model than it needs.

COST
  - Cache geocoding results (addresses repeat a lot) and fuel prices (they change weekly).
  - Respect free-API rules: Nominatim's 1 request/second is why getRoute() sleeps.
```

---

## 15. Common Mistakes

```text
‼️ 1. Letting the model run steps that never change order.
   Five tools in a fixed order = a workflow. Put it in code (section 7).

‼️ 2. Trusting the prompt to stop made-up inputs.
   "Never make up addresses" didn't stop "456 Oak Avenue, Springfield". Grounding did.

‼️ 3. Letting the model do dates.
   "Tomorrow is Wednesday" (it was Thursday). Pass the customer's word; resolve it in code.
   And use local dates — toISOString() is UTC, already "tomorrow" on a US evening.

‼️ 4. Showing the model's prose as the record.
   It wrote the wrong booking date once. Build confirmations and quote cards from data.

‼️ 5. Giving the model a power it doesn't need.
   The web agent can't book; a button does. Fewer tools = fewer ways to go wrong.

‼️ 6. Testing once.
   Version 2 looked perfect in two runs. The third run quoted $886 for an imaginary sofa.
   Run conversations many times; turn every real failure into a test.

‼️ 7. Calling free APIs carelessly.
   No User-Agent, or more than 1 request/second to Nominatim, gets you blocked.
```

---

## 16. Your Hands-On Roadmap

```text
  M1  Pricing         pricing.ts + pricing.test.ts. No AI yet — get the money right first.
  M2  Real data       maps.ts. Call it for your own addresses; try a nonsense address.
  M3  Version 1       The five-tool agent. Run it 5+ times and write down what goes wrong.
  M4  Version 2       quote.ts + one tool. Compare the failure list with M3.
  M5  Version 3       grounding.ts. Replay your M3/M4 failures — are they blocked now?
  M6  Chat + booking  chat.ts with the y/N confirm.
  M7  Tests           agent.test.ts: turn each failure you saw into a fake-model test.
  M8  API             server.ts; call it with curl or a REST client.
  M9  React UI        a chat box + a quote card rendered from `quote` + a Book button.
  M10 Evals           10 scripted conversations, run 3× each, print the pass rate.

STRETCH IDEAS (great interview stories)
  - Swap in Google Routes with live traffic (section 13) and compare times with OSRM
  - Time windows: rush-hour surcharge computed from the departure time
  - Multi-stop deliveries (one pickup, three drop-offs)
  - Photo → item size: let the customer upload a photo and have a vision model SUGGEST
    dimensions, which the customer must confirm (grounding still applies)
  - Port it to Python + FastAPI using AI-AGENTS-MORTGAGE-EXAMPLE.md as the pattern
```

---

## 17. Interview Answer

```text
Q: "Tell me about an agent you built."

"I built a chat agent for delivery quotes — something I'd done before with a single
 OpenAI call. The customer describes the job in their own words; the agent asks for
 whatever's missing, and then code works out a real route and drive time, the weather
 forecast, fuel cost, the right vehicle and helpers, and prices it. The customer can
 change the job mid-conversation and book it.

 The interesting part was how it failed. My first version gave the model five tools and
 let it run them in order. It chained them perfectly — and invented addresses, swapped
 the customer's sofa length for its own guess, and skipped a required helper. So I moved
 the fixed sequence into code and gave the model one tool. That fixed most of it, until a
 run where the model made up an entire job and quoted $886 for a 351-mile trip.

 The fix was grounding: before the quote runs, code checks that every address, size,
 weight and date actually appears in what the customer typed, and dates like 'Friday'
 are resolved in code. Prices are stored server-side behind a quote ID, quotes expire and
 book once, and in the web app booking is a button, not something the model can do.
 Every real failure became a test with a fake model, so they can't come back."
```

---

## Related Files

- [AI-AGENTS-BASICS-JS.md](AI-AGENTS-BASICS-JS.md) — the concepts behind this project (loop, tools, workflows, evals)
- [AI-AGENTS-MORTGAGE-EXAMPLE-JS.md](AI-AGENTS-MORTGAGE-EXAMPLE-JS.md) — the simpler, single-task project
- [AI-AGENTS-MORTGAGE-EXAMPLE.md](AI-AGENTS-MORTGAGE-EXAMPLE.md) — the same pattern in Python + FastAPI
- [FASTAPI-BASICS.md](FASTAPI-BASICS.md) — for porting this project's API to Python
- [EXPRESS-DEEP.md](EXPRESS-DEEP.md) — Express in depth
- [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) — Vitest basics behind section 12
- [AI-SYSTEM-DESIGN-DEEP.md](AI-SYSTEM-DESIGN-DEEP.md) — designing AI features at scale
