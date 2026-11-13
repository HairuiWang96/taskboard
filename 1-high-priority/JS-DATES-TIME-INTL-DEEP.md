# Dates, Time Zones, and Intl — The JavaScript Developer's Survival Guide

**Priority: HIGH**

> Why `new Date('2026-11-12')` shows the 11th in New York, why "add one day" is not
> "add 24 hours", where to store what in the database, how to format dates, numbers and
> currencies for any locale with the built-in `Intl` APIs, and what the new `Temporal` API
> fixes. Plus date libraries, `<input type="date">`, React/SSR hydration problems, testing
> with fake clocks, and the interview questions.
>
> Support notes checked November 2026. `Temporal` in particular is still rolling out —
> confirm on MDN / caniuse before using it without a polyfill.

---

## Table of Contents

- [1. The Mental Model — Instants, Wall Time, and Time Zones](#1-the-mental-model--instants-wall-time-and-time-zones)
- [2. The Date Object — What It Really Is](#2-the-date-object--what-it-really-is)
- [3. Parsing — Where Most Bugs Start](#3-parsing--where-most-bugs-start)
- [4. Getters, Setters, and the Classic Traps](#4-getters-setters-and-the-classic-traps)
- [5. Date Arithmetic and Daylight Saving Time](#5-date-arithmetic-and-daylight-saving-time)
- [6. Comparing and Sorting Dates](#6-comparing-and-sorting-dates)
- [7. Time Zones in Practice](#7-time-zones-in-practice)
- [8. Storing and Sending Dates — Backend and API Rules](#8-storing-and-sending-dates--backend-and-api-rules)
- [9. Intl.DateTimeFormat — Formatting Dates](#9-intldatetimeformat--formatting-dates)
- [10. Relative Time — "3 minutes ago"](#10-relative-time--3-minutes-ago)
- [11. Intl.NumberFormat — Numbers, Currency, Percent, Units](#11-intlnumberformat--numbers-currency-percent-units)
- [12. The Rest of Intl — Plurals, Lists, Sorting, Segments, Names](#12-the-rest-of-intl--plurals-lists-sorting-segments-names)
- [13. Money — Never Use Floats](#13-money--never-use-floats)
- [14. Temporal — The Modern Date API](#14-temporal--the-modern-date-api)
- [15. Date Libraries — date-fns, Day.js, Luxon](#15-date-libraries--date-fns-dayjs-luxon)
- [16. Dates in HTML Forms](#16-dates-in-html-forms)
- [17. Dates in React — Rendering, Hydration, Live Clocks](#17-dates-in-react--rendering-hydration-live-clocks)
- [18. Measuring Time — performance.now vs Date.now](#18-measuring-time--performancenow-vs-datenow)
- [19. Testing Code That Uses Dates](#19-testing-code-that-uses-dates)
- [20. Recipes](#20-recipes)
- [21. Common Pitfalls](#21-common-pitfalls)
- [22. Interview Questions](#22-interview-questions)
- [Related Files](#related-files)

---

## 1. The Mental Model — Instants, Wall Time, and Time Zones

```text
‼️ THREE DIFFERENT THINGS PEOPLE ALL CALL "A DATE"

  1. AN INSTANT — one exact moment in history, the same everywhere on Earth.
       "The deploy happened at 2026-11-12T15:30:00Z"
       Examples: created_at, a log timestamp, when a payment went through, a deadline
       that is the same moment for everyone ("auction ends at 15:00 UTC").
       → stored as UTC / a timestamp. Displayed in the VIEWER's time zone.

  2. WALL-CLOCK TIME (a "plain" / local date-time) — what a clock on the wall shows,
     with NO time zone attached.
       "Lunch is at 12:30"         "Store opens 09:00"
       "My birthday is 1996-03-14" ← a calendar date, not a moment
       Examples: birthdays, holidays, a recurring "every Monday 9am" meeting,
       a due DATE ("due Nov 12" — the whole day, wherever you are).
       → stored as a plain date / time string. NEVER converted between time zones.
         ‼️ A birthday converted to UTC and back shifts by a day for half the world.

  3. A ZONED DATE-TIME — wall time + the place it happens.
       "The meeting is 2026-03-10 09:00 in America/New_York"
       Examples: future calendar events, flight departures, appointments.
       → stored as local date-time + IANA time zone name. The instant is computed when
         needed, because time zone RULES can change before the event happens.

  Most date bugs come from treating one kind as another: turning a birthday into an
  instant, or showing an instant without a time zone.
```

```text
VOCABULARY

  UTC              Coordinated Universal Time. The reference clock. No daylight saving.
  offset           how far a place is from UTC right now: -05:00, +08:00, +05:30.
                   ‼️ An offset is NOT a time zone. New York is -05:00 in winter and
                   -04:00 in summer.
  time zone        a region with shared rules over time: "America/New_York",
                   "Asia/Shanghai", "Europe/London". These are IANA names (the tz database).
                   ‼️ Store and pass these, never "EST" or "+08:00".
  DST              daylight saving time: some zones jump 1 hour forward in spring and back
                   in autumn. Some days have 23 or 25 hours. Some local times don't exist
                   (02:30 on spring-forward day) and some happen twice (01:30 on fall-back day).
  epoch            1970-01-01T00:00:00Z. Timestamps count from here.
  Unix timestamp   SECONDS since the epoch (backend, JWT exp, many APIs).
  JS timestamp     ‼️ MILLISECONDS since the epoch (Date.now()). Multiply/divide by 1000
                   when talking to Unix-seconds APIs.
  ISO 8601         the standard text format: 2026-11-12T15:30:00.000Z
                   (Z = "Zulu" = UTC; or an offset like +08:00).
```

---

## 2. The Date Object — What It Really Is

```text
‼️ A Date IS JUST A NUMBER: milliseconds since 1970-01-01T00:00:00Z.

   It is an INSTANT. It has NO time zone inside it.

   The confusion: most of its methods (getHours, getDate, toString...) answer
   "what would this instant look like in THE TIME ZONE OF THE COMPUTER RUNNING THIS CODE".
   So the same Date prints differently on your laptop, a user's phone in Tokyo, and a
   server in UTC — while being the same moment.

     const d = new Date(0);
     d.getTime();        // 0                      ← the real value, same everywhere
     d.toISOString();    // "1970-01-01T00:00:00.000Z"   ← always UTC
     d.toString();       // "Wed Dec 31 1969 19:00:00 GMT-0500 (EST)"  in New York
                         // "Thu Jan 01 1970 08:00:00 GMT+0800 (CST)"  in Shanghai
     d.getHours();       // 19 in New York, 8 in Shanghai
     d.getUTCHours();    // 0 everywhere
```

```js
// ── Creating Dates ──────────────────────────────────────────────────────────
new Date();                          // now
Date.now();                          // now as a number (ms) — no object created
new Date(1731425400000);             // from a JS timestamp (ms)
new Date(unixSeconds * 1000);        // ‼️ from Unix seconds — multiply by 1000
new Date('2026-11-12T15:30:00Z');    // from ISO string with zone — SAFE, unambiguous
new Date(2026, 10, 12, 15, 30);      // from parts, in LOCAL time. ‼️ month 10 = NOVEMBER
new Date(Date.UTC(2026, 10, 12));    // from parts, in UTC
new Date(otherDate);                 // copy (Date objects are mutable — copy before changing)

// ── Getting the value out ───────────────────────────────────────────────────
d.getTime();          // ms since epoch (same as +d or Number(d))
d.toISOString();      // "2026-11-12T15:30:00.000Z" — ‼️ the format to send to APIs
d.toJSON();           // same as toISOString — what JSON.stringify uses
Math.floor(d.getTime() / 1000);   // Unix seconds

// ‼️ Invalid dates don't throw — they become "Invalid Date" (NaN inside)
const bad = new Date('not a date');
bad.getTime();               // NaN
Number.isNaN(bad.getTime()); // ✅ the check
bad.toISOString();           // ❌ throws RangeError: Invalid time value
```

---

## 3. Parsing — Where Most Bugs Start

```text
‼️ THE #1 DATE BUG IN JAVASCRIPT

   new Date('2026-11-12')            → parsed as UTC midnight
   new Date('2026-11-12T00:00')      → parsed as LOCAL midnight
   new Date('2026/11/12')            → non-standard: LOCAL midnight in most browsers

   A user in New York (UTC-5):
     new Date('2026-11-12').toLocaleDateString('en-US')
       → "11/11/2026"     ← the 11th! UTC midnight is 7pm the day before in New York.

   A user in Shanghai (UTC+8) sees "11/12/2026" — so the bug only shows up for users
   WEST of UTC (the Americas). Developers in Asia/Europe often never see it.

   The rule in the spec: a DATE-ONLY ISO string is UTC; a DATE-TIME ISO string without
   an offset is LOCAL. Historical accident, can't be changed now.
```

```js
// ── Safe parsing rules ──────────────────────────────────────────────────────

// 1. For INSTANTS: only parse full ISO strings WITH a zone (Z or offset).
new Date('2026-11-12T15:30:00Z');        // ✅
new Date('2026-11-12T15:30:00+08:00');   // ✅

// 2. For CALENDAR DATES ("2026-11-12" from a date picker / birthday / due date):
//    ‼️ don't turn them into a Date at all if you can avoid it. Keep the string.
//    If you need a Date for a local calendar day, build it from parts (local midnight):
function parseLocalDate(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d);     // m - 1 because months are 0-based
}
// Or use Temporal.PlainDate.from('2026-11-12') — a date with no time and no zone (§14).

// 3. Never parse other formats with new Date(...):
new Date('11/12/2026');       // ❌ US-style — is it Nov 12 or Dec 11? implementation-defined
new Date('12 Nov 2026');      // ❌ works in some engines, not guaranteed
new Date('2026-11-12 15:30'); // ❌ space instead of T: Safari historically returned Invalid Date
// → use a library parser with an explicit format: date-fns parse(str, 'dd/MM/yyyy', new Date())

// 4. Always validate after parsing
function toDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}
```

```text
JSON HAS NO DATE TYPE

   JSON.stringify({ at: new Date() })  →  '{"at":"2026-11-12T15:30:00.000Z"}'
   JSON.parse(...)                     →  { at: "2026-11-12T15:30:00.000Z" }  ← a STRING

   ‼️ Dates come back from every API as strings. Convert at the boundary
   (in your fetch layer, or with a Zod schema: z.coerce.date() / z.iso.datetime()),
   not randomly throughout the code.
```

---

## 4. Getters, Setters, and the Classic Traps

```js
const d = new Date(2026, 10, 12, 15, 30);   // Thu Nov 12 2026 15:30 local

d.getFullYear();   // 2026            ‼️ NOT getYear() — deprecated, returns 126
d.getMonth();      // 10              ‼️ 0-based: 0 = January, 11 = December
d.getDate();       // 12              ‼️ day of MONTH (1–31)
d.getDay();        // 4               ‼️ day of WEEK: 0 = Sunday ... 6 = Saturday
d.getHours();      // 15
d.getMinutes();    // 30
d.getSeconds();    // 0
d.getMilliseconds();
d.getTimezoneOffset();  // ‼️ minutes, and the SIGN IS INVERTED:
                        // New York in winter → 300 (it's UTC-5, offset reported as +300)
                        // Shanghai → -480

// Every getter has a UTC twin: getUTCFullYear, getUTCMonth, getUTCDate, getUTCHours...
```

```text
‼️ THE TRAPS, ONE LINE EACH

  getMonth() is 0-based          → display: d.getMonth() + 1
  getDate() vs getDay()          → date of month vs day of week
  getYear()                      → deprecated, use getFullYear()
  getTimezoneOffset() sign       → positive means BEHIND UTC (west)
  Date is MUTABLE                → d.setDate(...) changes d for everyone holding it
  setters OVERFLOW silently      → new Date(2026, 0, 31).setMonth(1) → March 3 (Feb 31 rolls over)
  new Date(2026, 1, 0)           → the 0th of February = last day of January
                                   (handy: days in a month = new Date(y, m + 1, 0).getDate())
```

```js
// ‼️ Mutation bug
function addDays(date, n) {
  date.setDate(date.getDate() + n);   // ❌ changes the caller's Date
  return date;
}
const start = new Date();
const end = addDays(start, 7);        // start is now ALSO 7 days later

function addDaysSafe(date, n) {
  const copy = new Date(date);        // ✅ copy first
  copy.setDate(copy.getDate() + n);
  return copy;
}
// In React state this matters doubly: mutating a Date in state won't trigger a render.
```

---

## 5. Date Arithmetic and Daylight Saving Time

```text
‼️ "ADD ONE DAY" IS NOT "ADD 24 HOURS"

   On the day clocks spring forward, a day has 23 hours. On fall-back day, 25 hours.

   US spring forward: 2026-03-08, 02:00 → 03:00 in America/New_York

     const sat = new Date(2026, 2, 7, 12, 0);           // Sat Mar 7, 12:00 local

     new Date(sat.getTime() + 24 * 60 * 60 * 1000)      // + 24 HOURS
       → Sun Mar 8, 13:00   ← one hour "later" on the clock

     const next = new Date(sat); next.setDate(next.getDate() + 1)   // + 1 CALENDAR DAY
       → Sun Mar 8, 12:00   ✅ same wall time

   Rule:
     duration in real time (timeouts, "expires in 24h", rate limits) → add milliseconds
     calendar math ("same time tomorrow", "every Monday", "next month") → add calendar units
                                                                           with setDate/setMonth
                                                                           or a library / Temporal
```

```js
// ── Difference in calendar days between two local dates ─────────────────────
// ❌ (b - a) / 86400000 gives 0.958... or 1.041... across a DST change
// ✅ compare at UTC midnight of each calendar date — no DST in UTC
function daysBetween(a, b) {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

// ── Adding months: decide what "Jan 31 + 1 month" means ─────────────────────
// Native setMonth overflows to March 3. Most products want "clamp to the end of the month"
// (Feb 28/29). date-fns addMonths and Temporal both clamp.
function addMonthsClamped(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);                     // avoid overflow while changing month
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

// ── Start / end of day (local) ──────────────────────────────────────────────
const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());          // 00:00
const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - 1;    // 23:59:59.999
// ‼️ For a date RANGE filter, prefer half-open intervals: start <= t < nextDayStart.
// No .999 hacks, no missed records at 23:59:59.5.
```

```text
DST EDGE CASES YOU WILL HIT IN SCHEDULING FEATURES

  Nonexistent time:  2026-03-08 02:30 in New York never happens (02:00 → 03:00).
                     new Date(2026, 2, 8, 2, 30) silently gives 03:30.
  Ambiguous time:    2026-11-01 01:30 in New York happens TWICE (EDT then EST).
                     Date picks one; you can't choose which.
  ‼️ Temporal lets you choose: { disambiguation: 'earlier' | 'later' | 'reject' } (§14).
  Not every zone has DST, and DST dates differ by country (US vs EU switch on different
  weekends). Never hard-code "DST starts in March".
  Some zones have 30- or 45-minute offsets: India +05:30, Nepal +05:45.
```

---

## 6. Comparing and Sorting Dates

```js
// ── Compare instants by their number ────────────────────────────────────────
a < b;                         // ✅ works — < converts to numbers
a.getTime() === b.getTime();   // ✅ equality
a === b;                       // ❌ compares object identity — false for two equal dates
a == b;                        // ❌ same problem

// ── Same calendar day (local)? ──────────────────────────────────────────────
const sameDay = a.getFullYear() === b.getFullYear() &&
                a.getMonth() === b.getMonth() &&
                a.getDate() === b.getDate();
// ‼️ "Same day" depends on WHICH time zone. Two instants can be the same day in Tokyo
// and different days in London.

// ── Sorting ─────────────────────────────────────────────────────────────────
items.sort((x, y) => x.date - y.date);                     // Date objects, ascending
items.sort((x, y) => y.createdAt.localeCompare(x.createdAt)); // ISO strings in UTC, descending
// ‼️ ISO strings sort correctly as plain strings ONLY when they're all the same format
// and the same offset (ideally all ending in Z). Mixed offsets → convert to Date first.
// Use toSorted() if you don't want to mutate the array (e.g. React state).
```

---

## 7. Time Zones in Practice

```js
// ── What zone is the user in? ───────────────────────────────────────────────
Intl.DateTimeFormat().resolvedOptions().timeZone;   // "America/New_York" — ‼️ the IANA name
// Send this to your backend (in a header or user profile) when the server needs to
// compute "today" or "9am" for the user — reminder emails, daily reports.

// ── Show an instant in a specific zone ──────────────────────────────────────
// Date can't "be in" a zone, but Intl can FORMAT it for any zone:
const d = new Date('2026-11-12T15:30:00Z');
d.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' });     // "11/12/2026, 11:30:00 PM"
d.toLocaleString('en-US', { timeZone: 'America/New_York' });  // "11/12/2026, 10:30:00 AM"

// ── All supported zone names (for a picker) ─────────────────────────────────
Intl.supportedValuesOf('timeZone');   // ["Africa/Abidjan", ..., "Pacific/Wallis"]
```

```text
‼️ CONVERTING "9:00 IN TOKYO" INTO AN INSTANT

   The native Date API can't do this directly — it only knows UTC and the machine's
   own zone. Options:
     - Temporal.ZonedDateTime.from({ ..., timeZone: 'Asia/Tokyo' })   (§14)
     - date-fns-tz / @date-fns/tz:  new TZDate(2026, 10, 12, 9, 0, 'Asia/Tokyo')
     - Luxon:  DateTime.fromObject({ ... }, { zone: 'Asia/Tokyo' })
     - On the server: PostgreSQL  '2026-11-12 09:00'::timestamp AT TIME ZONE 'Asia/Tokyo'

   ❌ Don't hand-roll it with fixed offsets ("Tokyo is +9 so subtract 9 hours"): it breaks
      for every zone with DST and whenever a government changes the rules.
```

```text
WHERE THE TIME ZONE COMES FROM, BY LAYER

  Browser      the OS setting of the user's device (can be wrong / travelling)
  Node server  process.env.TZ, else the OS. ‼️ Set TZ=UTC on servers and in CI so the
               server's zone never leaks into results. Run tests in a non-UTC zone too
               to catch bugs (§19).
  Database     PostgreSQL session TimeZone setting — affects how timestamptz is DISPLAYED
  The user     an explicit "time zone" preference in their profile beats guessing,
               for anything sent while they're not looking at the page (emails, reports).
```

---

## 8. Storing and Sending Dates — Backend and API Rules

```text
‼️ THE RULES

  INSTANTS (created_at, paid_at, expires_at)
    DB:   PostgreSQL timestamptz  (stores UTC internally, converts on input/output)
          ‼️ not "timestamp" (without time zone) — it silently drops the offset
          MySQL: DATETIME in UTC by convention, or TIMESTAMP (UTC, range ends 2038)
    API:  ISO 8601 string in UTC with Z:  "2026-11-12T15:30:00.000Z"
          (or a number of ms — but strings are readable in logs and unambiguous)
    UI:   format in the viewer's zone at render time

  CALENDAR DATES (birthday, due date, holiday, booking check-in day)
    DB:   DATE column
    API:  "2026-11-12"   ‼️ NO time, NO zone
    UI:   display as-is. ‼️ never new Date("2026-11-12") (§3)

  WALL TIMES (store opens 09:00)
    DB:   TIME (without time zone) + the place's time zone if it matters
    API:  "09:00"

  FUTURE EVENTS IN A PLACE (meeting 2026-03-10 09:00 New York)
    DB:   local datetime "2026-03-10T09:00" + IANA zone "America/New_York"
          (optionally also the computed UTC instant, for querying — recompute it if the
          tz database changes)
    API:  both fields, or an RFC 9557 string: "2026-03-10T09:00-04:00[America/New_York]"
          (the format Temporal uses)

  RECURRING EVENTS ("every Monday 9am")
    Store the rule (RRULE from iCalendar) + zone, expand occurrences when needed.
    Each occurrence keeps 9am local even when DST changes the UTC instant.
```

```ts
// Validating dates at the API boundary with Zod (v4 API)
import { z } from 'zod';

const Task = z.object({
  createdAt: z.iso.datetime(),           // "2026-11-12T15:30:00Z" — instant as string
  dueDate: z.iso.date(),                 // "2026-11-12" — calendar date as string
  remindAt: z.coerce.date(),             // anything Date can parse → Date object
});
// Keep calendar dates as strings in your types; only instants become Date objects.
```

---

## 9. Intl.DateTimeFormat — Formatting Dates

```text
‼️ USE Intl FOR EVERYTHING USERS SEE. Don't build date strings by hand.

   `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}` is wrong for most of the world:
     US        11/12/2026
     UK        12/11/2026     (day first)
     China     2026/11/12  or  2026年11月12日
     Germany   12.11.2026
     ISO       2026-11-12

   Intl knows every locale's order, separators, month names, 12/24-hour clock, and calendar.
```

```js
const d = new Date('2026-11-12T15:30:00Z');

// ── Quick: toLocale*String (creates a formatter each call — fine for a few dates) ──
d.toLocaleDateString('en-US');                 // "11/12/2026"
d.toLocaleDateString('zh-CN');                 // "2026/11/12"
d.toLocaleTimeString('en-GB');                 // "15:30:00"  (in the machine's zone)
d.toLocaleString(undefined);                   // undefined = the user's browser locale

// ── Reusable formatter (‼️ create once, reuse — much faster in lists) ────────
const fmt = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',      // 'full' | 'long' | 'medium' | 'short'
  timeStyle: 'short',
  timeZone: 'America/New_York',
});
fmt.format(d);              // "Nov 12, 2026, 10:30 AM"

// dateStyle presets in en-US:
//   full   "Thursday, November 12, 2026"
//   long   "November 12, 2026"
//   medium "Nov 12, 2026"
//   short  "11/12/26"

// ── Pick individual fields instead of a style ───────────────────────────────
// (can't combine dateStyle/timeStyle with these)
new Intl.DateTimeFormat('en-US', {
  weekday: 'short',         // 'long' | 'short' | 'narrow'
  month: 'short',           // 'numeric' | '2-digit' | 'long' | 'short' | 'narrow'
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: false,            // force 24h; or hourCycle: 'h23'
  timeZoneName: 'short',    // "EST"; 'longOffset' → "GMT-05:00"
}).format(d);               // "Thu, Nov 12, 10:30 EST"   (in the machine's zone unless timeZone set)
// You choose WHICH fields; the locale decides ORDER and punctuation.

// ── Ranges ──────────────────────────────────────────────────────────────────
new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
  .formatRange(new Date(2026, 10, 12), new Date(2026, 10, 15));   // "Nov 12 – 15, 2026"

// ── Parts — when you need to style pieces separately ────────────────────────
new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).formatToParts(d);
// [{ type: 'month', value: 'Nov' }, { type: 'literal', value: ' ' }, { type: 'day', value: '12' }]
```

```text
‼️ FORMATTING A CALENDAR DATE ("2026-11-12") WITH Intl

   Intl formats INSTANTS. To show a calendar date without shifting it, either:
     - build a local Date from parts (§3) and format WITHOUT a timeZone option, or
     - treat it as UTC midnight and format WITH timeZone: 'UTC':
         new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' })
           .format(new Date('2026-11-12'))     → "November 12, 2026" for every user
     - or Temporal.PlainDate.from('2026-11-12').toLocaleString('en-US', { dateStyle: 'long' })
```

```text
FOR A MACHINE, NOT A HUMAN:
  logs, APIs, file names, sortable keys → d.toISOString()
  a "YYYY-MM-DD" key for a LOCAL day   → new Intl.DateTimeFormat('en-CA').format(d)
                                          (Canadian English happens to format as 2026-11-12)
                                          or build it from getFullYear/getMonth/getDate
  ‼️ d.toISOString().slice(0, 10) gives the UTC date — wrong local day near midnight.
```

---

## 10. Relative Time — "3 minutes ago"

```js
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
rtf.format(-1, 'day');      // "yesterday"   (numeric: 'always' → "1 day ago")
rtf.format(2, 'hour');      // "in 2 hours"
rtf.format(-3, 'minute');   // "3 minutes ago"
new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' }).format(-1, 'day');  // "昨天"

// Intl doesn't choose the unit for you — you pick it:
const UNITS = [
  ['year', 31_536_000], ['month', 2_592_000], ['week', 604_800],
  ['day', 86_400], ['hour', 3_600], ['minute', 60], ['second', 1],
];
function timeAgo(date, locale = undefined) {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);   // negative = past
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second') {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
}
// timeAgo(new Date(Date.now() - 90_000))  → "2 minutes ago"
// (Month/year lengths here are approximations — fine for "ago" labels, not for billing.)
```

```text
UX RULES FOR RELATIVE TIME
  - Show the exact date on hover / in a <time> element:
      <time dateTime="2026-11-12T15:30:00Z" title="Nov 12, 2026, 10:30 AM">3 minutes ago</time>
  - Switch to an absolute date after ~a week: "Nov 3" reads better than "9 days ago".
  - Labels go stale — refresh them on an interval (§17).

Durations ("1 hr 30 min") — Intl.DurationFormat:
  new Intl.DurationFormat('en', { style: 'short' }).format({ hours: 1, minutes: 30 })
    → "1 hr, 30 min"
  Newer API (Baseline 2025) — feature-detect if you support old browsers.
```

---

## 11. Intl.NumberFormat — Numbers, Currency, Percent, Units

```js
// ── Plain numbers: separators differ by locale ──────────────────────────────
new Intl.NumberFormat('en-US').format(1234567.891);   // "1,234,567.891"
new Intl.NumberFormat('de-DE').format(1234567.891);   // "1.234.567,891"   ← . and , swapped
new Intl.NumberFormat('en-IN').format(1234567.891);   // "12,34,567.891"   ← lakh grouping
new Intl.NumberFormat('fr-FR').format(1234567.891);   // "1 234 567,891"   (narrow no-break space)

// ── Decimals ────────────────────────────────────────────────────────────────
new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(3.14159);  // "3.14"
new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(5);        // "5.00"
// ‼️ Use this instead of toFixed() for display — toFixed ignores locale and has
// rounding surprises: (1.005).toFixed(2) → "1.00" (1.005 is really 1.00499999...).

// ── Currency ────────────────────────────────────────────────────────────────
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234.5);  // "$1,234.50"
new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(1234.5);  // "¥1,234.50"
new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(1234.5);  // "￥1,235" (yen has 0 decimals)
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5);  // "1.234,50 €"
// ‼️ The CURRENCY comes from your data (what the price is in).
//    The LOCALE comes from the user (how they read numbers). They are independent:
//    a German user viewing a USD price → new Intl.NumberFormat('de-DE', { currency: 'USD' }) → "1.234,50 $"
{ currencyDisplay: 'code' }     // "USD 1,234.50"   — unambiguous for international users
{ currencySign: 'accounting' }  // "($1,234.50)" for negatives

// ── Percent ─────────────────────────────────────────────────────────────────
new Intl.NumberFormat('en-US', { style: 'percent' }).format(0.256);   // "26%"  ‼️ input is a fraction
new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(0.256); // "25.6%"

// ── Compact: 1.2K, 3.4M ─────────────────────────────────────────────────────
new Intl.NumberFormat('en-US', { notation: 'compact' }).format(1_234_567);  // "1.2M"
new Intl.NumberFormat('zh-CN', { notation: 'compact' }).format(1_234_567);  // "123万"

// ── Units ───────────────────────────────────────────────────────────────────
new Intl.NumberFormat('en-US', { style: 'unit', unit: 'kilometer-per-hour' }).format(50); // "50 km/h"
new Intl.NumberFormat('en-US', { style: 'unit', unit: 'megabyte', unitDisplay: 'narrow' }).format(3.2); // "3.2MB"

// ── Sign ────────────────────────────────────────────────────────────────────
new Intl.NumberFormat('en-US', { signDisplay: 'exceptZero' }).format(5);   // "+5" — for deltas

// ── Ranges ──────────────────────────────────────────────────────────────────
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  .formatRange(50, 100);   // "$50 – $100"
```

```text
‼️ PARSING LOCALIZED NUMBERS BACK IS HARD

   "1.234,50" (German) vs "1,234.50" (US). There's no Intl.NumberFormat.parse.
   - For inputs, use <input type="number"> / inputMode="decimal" and store numbers, not
     formatted strings.
   - Never round-trip a formatted string through Number() / parseFloat().
```

---

## 12. The Rest of Intl — Plurals, Lists, Sorting, Segments, Names

```js
// ── Intl.PluralRules — which plural FORM a number needs ─────────────────────
const pr = new Intl.PluralRules('en-US');
pr.select(1);   // "one"
pr.select(5);   // "other"
// Languages differ: English has 2 forms, Arabic has 6 (zero, one, two, few, many, other),
// Chinese/Japanese have 1. ‼️ `count === 1 ? 'item' : 'items'` is English-only logic.
const msgs = { one: 'You have # message', other: 'You have # messages' };
const msg = msgs[pr.select(n)].replace('#', n);

new Intl.PluralRules('en-US', { type: 'ordinal' }).select(2);  // "two" → "2nd"
const suffix = { one: 'st', two: 'nd', few: 'rd', other: 'th' };
// 1st 2nd 3rd 4th 11th 12th 13th 21st 22nd ...

// ── Intl.ListFormat — "A, B, and C" ─────────────────────────────────────────
new Intl.ListFormat('en', { type: 'conjunction' }).format(['Ann', 'Bo', 'Cy']); // "Ann, Bo, and Cy"
new Intl.ListFormat('en', { type: 'disjunction' }).format(['red', 'blue']);     // "red or blue"
new Intl.ListFormat('zh-CN').format(['张三', '李四', '王五']);                   // "张三、李四和王五"

// ── Intl.Collator — sorting strings correctly ───────────────────────────────
['b', 'a', 'Z', 'ä'].sort();                                   // ["Z","a","b","ä"] ❌ by code point
['b', 'a', 'Z', 'ä'].sort(new Intl.Collator('de').compare);    // ["a","ä","b","Z"] ✅
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
['file10', 'file2', 'file1'].sort(collator.compare);           // ["file1","file2","file10"]
// numeric: true → "natural sort". sensitivity: 'base' → case/accent-insensitive equality.
// (a.localeCompare(b) works too but builds a collator per call — slow for big lists.)

// ── Intl.Segmenter — split text the way humans see it ───────────────────────
'👨‍👩‍👧'.length;   // 8  ❌ UTF-16 code units, not characters
[...new Intl.Segmenter().segment('👨‍👩‍👧')].length;   // 1 ✅ one grapheme
// Word splitting for languages without spaces (Chinese, Japanese, Thai):
const words = [...new Intl.Segmenter('zh', { granularity: 'word' }).segment('我喜欢编程')]
  .filter(s => s.isWordLike).map(s => s.segment);    // ["我", "喜欢", "编程"]
// Use for: character counters that count emoji correctly, truncation that doesn't cut an
// emoji in half, word counts in CJK text.

// ── Intl.DisplayNames — names of languages, regions, currencies ─────────────
new Intl.DisplayNames(['en'], { type: 'region' }).of('CN');     // "China"
new Intl.DisplayNames(['zh-CN'], { type: 'language' }).of('en');// "英语"
new Intl.DisplayNames(['en'], { type: 'currency' }).of('JPY');  // "Japanese Yen"
// Perfect for country / language pickers — no hard-coded name lists.

// ── Intl.Locale and the user's locale ───────────────────────────────────────
navigator.language;      // "en-US" — the browser's preferred language
navigator.languages;     // ["en-US", "zh-CN", "en"] — in preference order
new Intl.Locale('zh-Hant-TW').language;   // "zh"
```

More on locales and translation: [../2-medium-priority/I18N-DEEP.md](../2-medium-priority/I18N-DEEP.md).

---

## 13. Money — Never Use Floats

```text
‼️ 0.1 + 0.2 === 0.30000000000000004

   JavaScript numbers are binary floating point. Most decimal fractions can't be stored
   exactly, so money math drifts:  19.99 * 3 → 59.97000000000001

   RULES
   1. Store and compute money in the SMALLEST UNIT as integers: cents, fen, yen.
        $19.99 → 1999        ¥1,235 → 1235 (yen already has no minor unit)
   2. Send amounts as integers (or decimal STRINGS) in APIs, with the currency code:
        { "amount": 1999, "currency": "USD" }        ← Stripe does exactly this
   3. In the database: integer minor units, or DECIMAL/NUMERIC — never FLOAT/REAL/DOUBLE.
   4. Convert to a decimal only for DISPLAY, with Intl.NumberFormat.
   5. Decide rounding explicitly (banker's rounding? round half up?) for tax, splits, discounts.
   6. Very large amounts or crypto: BigInt minor units, or a decimal library (big.js, dinero.js).
```

```js
// Minor units ↔ display
const minorDigits = (currency) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
// USD → 2, JPY → 0, KWD → 3

function formatMoney({ amount, currency }, locale) {
  const value = amount / 10 ** minorDigits(currency);
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}
formatMoney({ amount: 1999, currency: 'USD' }, 'en-US');   // "$19.99"

// Splitting a bill without losing a cent: distribute the remainder
function split(amount, parts) {
  const base = Math.floor(amount / parts);
  const remainder = amount - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}
split(1000, 3);   // [334, 333, 333] — sums to 1000 exactly
```

---

## 14. Temporal — The Modern Date API

```text
‼️ TEMPORAL FIXES DATE'S DESIGN PROBLEMS

   Date problem                         Temporal answer
   ───────────────────────────────────  ─────────────────────────────────────────────
   One type for everything              A type per concept (instant, plain date, ...)
   Mutable                              Immutable — every operation returns a new object
   Months 0-based                       Months 1-based
   Only UTC + the machine's zone        Any IANA time zone
   Ambiguous parsing                    Strict ISO 8601 / RFC 9557 parsing, throws on bad input
   No calendar math                     .add({ months: 1 }), .until(), .round(), DST-safe
   No date-only / time-only type        PlainDate, PlainTime, PlainYearMonth, PlainMonthDay

   STATUS: shipped in Firefox and Chromium-based browsers; Safari support was still in
   progress at the time of writing. Check caniuse; until then use a polyfill
   (temporal-polyfill or @js-temporal/polyfill).
```

```text
THE TYPES — pick by the mental model from §1

  Temporal.Instant          an exact moment (like Date, but honest about it)
  Temporal.ZonedDateTime    a moment + an IANA zone → knows its wall time and DST rules
  Temporal.PlainDate        a calendar date: 2026-11-12. No time, no zone. ← birthdays, due dates
  Temporal.PlainTime        a wall time: 09:00. No date, no zone.
  Temporal.PlainDateTime    date + wall time, no zone ("2026-11-12T09:00" in some place)
  Temporal.PlainYearMonth   2026-11 (credit card expiry, monthly reports)
  Temporal.PlainMonthDay    11-12 (yearly anniversaries)
  Temporal.Duration         an amount of time: { hours: 1, minutes: 30 }
  Temporal.Now              current time in any of the above forms
```

```js
// ── Now ─────────────────────────────────────────────────────────────────────
Temporal.Now.instant();                       // exact now
Temporal.Now.zonedDateTimeISO();              // now in the system zone
Temporal.Now.plainDateISO('Asia/Shanghai');   // today's DATE in Shanghai
Temporal.Now.timeZoneId();                    // "America/New_York"

// ── Calendar dates: no time zone bugs possible ──────────────────────────────
const due = Temporal.PlainDate.from('2026-11-12');
due.add({ days: 1 }).toString();              // "2026-11-13"
due.month;                                    // 11 — ‼️ 1-based
due.dayOfWeek;                                // 4 — Monday = 1 ... Sunday = 7 (ISO)
Temporal.PlainDate.from('2026-01-31').add({ months: 1 }).toString();   // "2026-02-28" (clamped)
due.until(Temporal.PlainDate.from('2026-12-25')).days;                 // 43
Temporal.PlainDate.compare(a, b);             // -1 | 0 | 1 — use in .sort()
due.equals(other);
due.toLocaleString('en-US', { dateStyle: 'long' });   // "November 12, 2026"

// ── A meeting in a specific place ───────────────────────────────────────────
const meeting = Temporal.ZonedDateTime.from({
  year: 2026, month: 3, day: 10, hour: 9, minute: 0,
  timeZone: 'America/New_York',
});
meeting.toString();               // "2026-03-10T09:00:00-04:00[America/New_York]"
meeting.toInstant().toString();   // "2026-03-10T13:00:00Z"    ← for the database / API
meeting.withTimeZone('Asia/Shanghai').toPlainTime().toString();   // "21:00:00" — for a colleague

// ── DST-safe arithmetic ─────────────────────────────────────────────────────
const sat = Temporal.ZonedDateTime.from('2026-03-07T12:00[America/New_York]');
sat.add({ days: 1 }).toString();   // "2026-03-08T12:00:00-04:00[...]" ✅ same wall time
sat.add({ hours: 24 }).toString(); // "2026-03-08T13:00:00-04:00[...]" ✅ exactly 24h later
// Both are correct — you say which one you mean.

// ── Nonexistent / ambiguous times — you choose ──────────────────────────────
Temporal.ZonedDateTime.from(
  { year: 2026, month: 11, day: 1, hour: 1, minute: 30, timeZone: 'America/New_York' },
  { disambiguation: 'earlier' },   // 'earlier' | 'later' | 'compatible' (default) | 'reject'
);

// ── Converting to/from Date ─────────────────────────────────────────────────
const instant = Temporal.Instant.fromEpochMilliseconds(date.getTime());
const backToDate = new Date(instant.epochMilliseconds);
date.toTemporalInstant?.();        // available where Temporal ships

// ── Durations ───────────────────────────────────────────────────────────────
const dur = Temporal.Duration.from({ hours: 1, minutes: 90 });
dur.round({ largestUnit: 'hour' }).toString();   // "PT2H30M"
dur.total('minutes');                            // 150
```

---

## 15. Date Libraries — date-fns, Day.js, Luxon

```text
WHEN YOU NEED ONE
  Native Date + Intl covers: creating, comparing, formatting for display, relative time.
  A library helps with: parsing custom formats, calendar math (add months, start of week),
  time zone conversion, and readable code. Temporal will replace most of this over time.

  ❌ Moment.js — in maintenance mode since 2020, mutable, large. Don't start new code with it.

  date-fns     functions over native Date: addDays(d, 1), format(d, 'yyyy-MM-dd').
               Tree-shakeable (you ship only what you import), immutable.
               Time zones: @date-fns/tz (TZDate) in v4.
               ‼️ Most popular choice for React apps.
  Day.js       Moment-like chainable API, 2kB core. dayjs(d).add(1, 'day').format('YYYY-MM-DD')
               Time zones via utc + timezone plugins.
  Luxon        From a Moment maintainer. Immutable DateTime objects with built-in time zone
               and Intl support. DateTime.now().setZone('Asia/Tokyo').toFormat('HH:mm')
               Closest in spirit to Temporal.
```

```js
// date-fns — the functions you'll use most
import {
  format, parse, parseISO, isValid, addDays, addMonths, subWeeks,
  differenceInCalendarDays, startOfWeek, endOfMonth, isSameDay, isBefore,
  formatDistanceToNow, eachDayOfInterval,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

format(new Date(2026, 10, 12), 'yyyy-MM-dd');          // "2026-11-12"
// ‼️ date-fns tokens: yyyy = year, MM = month, dd = day of month, HH = 24h hour, mm = minute.
//    YYYY (week-numbering year) and DD (day of YEAR) are different and throw by default —
//    a classic bug in Moment-style format strings.
format(d, 'PPP', { locale: zhCN });                    // "2026年11月12日" (localized preset)
parse('12/11/2026', 'dd/MM/yyyy', new Date());         // explicit format — no guessing
parseISO('2026-11-12');                                // ‼️ LOCAL midnight (unlike new Date!)
isValid(d);
addMonths(new Date(2026, 0, 31), 1);                   // Feb 28 — clamped
differenceInCalendarDays(b, a);                        // DST-safe calendar-day difference
startOfWeek(d, { weekStartsOn: 1 });                   // Monday-based weeks
formatDistanceToNow(d, { addSuffix: true });           // "3 minutes ago"
eachDayOfInterval({ start, end });                     // array of days — for calendars
```

---

## 16. Dates in HTML Forms

```text
NATIVE INPUTS AND THEIR VALUES (always strings, always this format)

  <input type="date">            value "2026-11-12"        ← a calendar date, no zone
  <input type="time">            value "09:30"
  <input type="datetime-local">  value "2026-11-12T09:30"  ← wall time, NO zone
  <input type="month">           value "2026-11"
  <input type="week">            value "2026-W46"

  ‼️ The picker UI is shown in the user's locale (12/11/2026 for UK users), but .value is
     always the ISO-like string above. Never parse the displayed text.

  ‼️ input.valueAsDate on type="date" returns UTC midnight — the same off-by-one trap as
     new Date("2026-11-12"). Prefer the string value.

  min / max / step use the same format:  <input type="date" min="2026-01-01" max="2026-12-31">
```

```jsx
// datetime-local → instant for the API: the string has no zone, so it means
// "this wall time in the USER'S zone". new Date() on a date-TIME string without offset
// parses as local — which is exactly what we want here.
function DueAtField({ value, onChange }) {
  // value: ISO instant string from the API, e.g. "2026-11-12T14:30:00.000Z"
  const local = value ? toDatetimeLocal(new Date(value)) : '';
  return (
    <input
      type="datetime-local"
      value={local}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
    />
  );
}
// Date → "YYYY-MM-DDTHH:mm" in local time (what datetime-local expects)
function toDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Calendar date field: keep the string end to end — no Date objects at all.
<input type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value || null)} />
```

```text
Custom date pickers (react-day-picker, MUI, Mantine, React Aria DatePicker):
  - check what they give you — a Date at local midnight? a string? a CalendarDate object?
  - React Aria's @internationalized/date uses CalendarDate / ZonedDateTime types
    modelled on Temporal — the cleanest option for correctness and accessibility.
  - Native inputs are accessible and localized for free; reach for a custom picker only for
    range selection, inline calendars, or design requirements.
```

---

## 17. Dates in React — Rendering, Hydration, Live Clocks

```jsx
// ── Reuse formatters — creating Intl objects is relatively expensive ─────────
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });   // module scope

function TaskRow({ task }) {
  return <td><time dateTime={task.createdAt}>{dateFmt.format(new Date(task.createdAt))}</time></td>;
}
// If the locale is dynamic (user setting), memoize per locale:
const fmt = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }), [locale]);
```

```text
‼️ HYDRATION MISMATCHES FROM DATES (Next.js / any SSR)

   The server renders "Nov 12, 2026, 3:30 PM" (server is in UTC, locale en-US).
   The browser renders "2026/11/12 23:30" (user in Shanghai, locale zh-CN).
   → React warns "Text content did not match", patches the text, users see a flash.

   Also: "3 minutes ago" computed at render is different on server and client;
   new Date() / Date.now() during render is different every time.

   FIXES
   1. Render a stable, zone-free value on the server, then the local one after mount:
        const [mounted, setMounted] = useState(false);
        useEffect(() => setMounted(true), []);
        return mounted ? fmt.format(d) : d.toISOString().slice(0, 10);
   2. Pass an explicit locale AND timeZone so server and client agree
      (e.g. the user's saved preferences, read on the server from a cookie/profile).
   3. <time suppressHydrationWarning> for that one element, when a brief swap is acceptable.
   4. Render it client-only (dynamic import with ssr: false, or a Client Component that
      shows a placeholder until mounted).
```

```jsx
// ── A live "x minutes ago" label that updates itself ────────────────────────
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);       // ‼️ clean up, or every row leaks a timer
  }, [intervalMs]);
  return now;
}
function TimeAgo({ iso }) {
  useNow(30_000);                          // re-render every 30s
  return <time dateTime={iso} title={new Date(iso).toLocaleString()}>{timeAgo(new Date(iso))}</time>;
}
// For a list of 500 rows, share ONE ticking "now" through context instead of 500 intervals.

// ── Countdown that doesn't drift ────────────────────────────────────────────
// ‼️ Don't decrement a counter every second: intervals drift and pause in background tabs.
// Compute the remaining time from a fixed end instant on every tick.
function Countdown({ endsAt }) {
  const now = useNow(1000);
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  const s = Math.floor(ms / 1000);
  return <span>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>;
}
// Server-authoritative deadlines (auctions, exams): also correct for clock skew between the
// user's device and the server (compare a server timestamp with Date.now() once at load).
```

---

## 18. Measuring Time — performance.now vs Date.now

```text
  Date.now()          wall-clock ms since epoch. Can JUMP — the user or NTP changes
                      the system clock, and it's only millisecond precision.
                      → for "what time is it", timestamps, expiry checks.

  performance.now()   ms since the page started (time origin), sub-millisecond, MONOTONIC —
                      never goes backwards, unaffected by clock changes.
                      → ‼️ for MEASURING durations: how long a request/render/function took.

    const t0 = performance.now();
    await doWork();
    console.log(`took ${(performance.now() - t0).toFixed(1)}ms`);

  performance.mark('a'); ... performance.mark('b'); performance.measure('a→b', 'a', 'b');
    → shows up in the DevTools Performance panel timeline.

  Node: performance.now() too, or process.hrtime.bigint() for nanoseconds.
```

---

## 19. Testing Code That Uses Dates

```ts
// ── Freeze "now" ────────────────────────────────────────────────────────────
import { vi, beforeEach, afterEach, test, expect } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-12T15:30:00Z'));   // Date.now() / new Date() return this
});
afterEach(() => vi.useRealTimers());

test('shows "3 minutes ago"', () => {
  expect(timeAgo(new Date('2026-11-12T15:27:00Z'), 'en')).toBe('3 minutes ago');
});

test('countdown reaches zero', () => {
  render(<Countdown endsAt="2026-11-12T15:30:05Z" />);
  act(() => { vi.advanceTimersByTime(5000); });   // move the clock forward 5s
  expect(screen.getByText('0:00')).toBeInTheDocument();
});
// Jest: jest.useFakeTimers(); jest.setSystemTime(...)
// Playwright: await page.clock.setFixedTime(new Date('2026-11-12T15:30:00Z'))
```

```text
‼️ RUN TESTS IN A FIXED TIME ZONE — AND ALSO IN AN UNFRIENDLY ONE

   Tests that pass in your zone can fail in CI (UTC) or on a teammate's machine.
     package.json:  "test": "TZ=UTC vitest"
   To catch off-by-one-day bugs, run date tests in a zone WEST of UTC:
     TZ=America/Los_Angeles vitest run src/dates
   And around DST transitions: pick fixed dates like 2026-03-08 and 2026-11-01 for
   America/New_York in your test cases.

   Locale too: Intl output depends on the runtime's ICU data. Assert with an explicit
   locale ('en-US'), and beware that whitespace in formatted output may be a narrow
   no-break space (U+202F) before AM/PM — compare with toMatch(/10:30\sAM/) or normalize.
```

---

## 20. Recipes

```js
// ── "Today" as a YYYY-MM-DD string in the user's zone ───────────────────────
const todayLocal = () => new Intl.DateTimeFormat('en-CA').format(new Date());
// or Temporal.Now.plainDateISO().toString()

// ── "Today" in a specific zone (e.g. the store's zone, on the server) ───────
const todayIn = (tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

// ── Age from a birthday string ──────────────────────────────────────────────
function age(birthday /* "1996-03-14" */, today = todayLocal()) {
  const [by, bm, bd] = birthday.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

// ── Is a token expired? (JWT exp is in SECONDS) ─────────────────────────────
const isExpired = (exp, skewSeconds = 30) => Date.now() >= (exp - skewSeconds) * 1000;

// ── Days in a month ─────────────────────────────────────────────────────────
const daysInMonth = (year, month1to12) => new Date(year, month1to12, 0).getDate();

// ── Build a month grid for a calendar UI (weeks starting Monday) ────────────
function monthGrid(year, month /* 0-11 */) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;        // Monday = 0 ... Sunday = 6
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) =>      // 6 weeks × 7 days
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
// Week start differs by locale (US Sunday, most of Europe/China Monday):
// new Intl.Locale('en-US').getWeekInfo?.().firstDay   → 7 (Sunday)  — newer API, feature-detect

// ── Group items by local day ("Today", "Yesterday", "Nov 3") ────────────────
const dayKey = new Intl.DateTimeFormat('en-CA');   // YYYY-MM-DD in local zone
const groups = Object.groupBy(items, (it) => dayKey.format(new Date(it.createdAt)));

// ── Send the user's zone to the backend on every request ────────────────────
fetch('/api/report', { headers: { 'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone } });
```

---

## 21. Common Pitfalls

```text
  Each entry:  ✗ symptom
                 why  → the cause
                 fix  → what to do

  ✗ ‼️ Date shows one day early for US users
      why  → new Date('2026-11-12') parses as UTC midnight
      fix  → keep calendar dates as strings; parse from parts; Temporal.PlainDate (§3)

  ✗ Month is off by one
      why  → getMonth() / new Date(y, m, d) months are 0-based
      fix  → +1 for display, -1 when constructing

  ✗ Weekday wrong
      why  → used getDate() (day of month) instead of getDay() (day of week)
      fix  → getDay(); remember 0 = Sunday

  ✗ "Tomorrow" is an hour off twice a year
      why  → added 24 * 60 * 60 * 1000 across a DST change
      fix  → setDate(d.getDate() + 1), date-fns addDays, Temporal .add({ days: 1 }) (§5)

  ✗ Jan 31 + 1 month = March 3
      why  → setMonth overflows
      fix  → clamp to the end of the month, or date-fns addMonths (§5)

  ✗ Two equal dates aren't equal
      why  → a === b compares object identity
      fix  → a.getTime() === b.getTime()

  ✗ A function changed my original date
      why  → Date is mutable
      fix  → copy with new Date(d) before setters; or use Temporal / date-fns (immutable)

  ✗ Token "never expires" / expires in 1970
      why  → mixed up seconds (Unix, JWT) and milliseconds (JS)
      fix  → × 1000 / ÷ 1000 at the boundary; name variables expiresAtMs / expSeconds

  ✗ Times stored are shifted by the server's zone
      why  → PostgreSQL timestamp (without time zone), or server not in UTC
      fix  → timestamptz; TZ=UTC on servers; ISO strings with Z in APIs (§8)

  ✗ Birthday shows a different day after the user travels
      why  → stored a calendar date as an instant
      fix  → DATE column / "YYYY-MM-DD" string (§1, §8)

  ✗ Hydration mismatch on a timestamp
      why  → server and client format in different zones / locales
      fix  → stable server value, explicit timeZone + locale, or client-only (§17)

  ✗ Date formatted MM/DD for UK users
      why  → hand-built string
      fix  → Intl.DateTimeFormat with the user's locale (§9)

  ✗ Price shows 59.97000000000001
      why  → floating-point money
      fix  → integer minor units + Intl.NumberFormat (§13)

  ✗ "1 items" / wrong plurals in other languages
      why  → count === 1 ? ... English-only logic
      fix  → Intl.PluralRules or your i18n library's plural support (§12)

  ✗ Sorting puts "Zebra" before "apple" / "file10" before "file2"
      why  → default sort compares UTF-16 code units
      fix  → Intl.Collator with numeric: true (§12)

  ✗ Character counter counts an emoji as 2–11 characters
      why  → string.length counts UTF-16 code units
      fix  → Intl.Segmenter graphemes (§12)

  ✗ Tests pass locally, fail in CI (or the other way round)
      why  → tests depend on the machine's zone, locale or real "now"
      fix  → TZ=UTC, explicit locale, vi.setSystemTime (§19)

  ✗ Countdown drifts or freezes in a background tab
      why  → decrementing a counter in setInterval
      fix  → recompute from a fixed end time on every tick (§17)

  ✗ toISOString() throws RangeError
      why  → the Date is Invalid Date
      fix  → validate with Number.isNaN(d.getTime()) after parsing
```

---

## 22. Interview Questions

### "What's the difference between a timestamp and a date?"

A timestamp (instant) is one exact moment, the same everywhere — store it in UTC and show it in the viewer's zone. A calendar date (a birthday, a due date) has no time zone — store it as `YYYY-MM-DD` and never convert it. Future events in a place need local time plus an IANA zone, because the offset for that date isn't certain until it happens.

### "Why does `new Date('2026-11-12')` show the 11th for some users?"

A date-only ISO string is parsed as UTC midnight. For anyone west of UTC that instant is still the previous evening locally, so local formatting shows the 11th. Keep calendar dates as strings, build local dates from parts, or use `Temporal.PlainDate`.

### "How do you store dates in a database for a global app?"

Instants in `timestamptz` (PostgreSQL) — UTC internally. Calendar dates in `DATE`. Future scheduled events as local date-time plus IANA zone name. Servers run in UTC. APIs send ISO 8601 with `Z` for instants and `YYYY-MM-DD` for dates.

### "How do you add a day correctly?"

Decide whether you mean 24 hours or "the same wall time tomorrow". For calendar meaning use `setDate(getDate() + 1)`, `date-fns addDays`, or `Temporal ... .add({ days: 1 })`, which keep the wall time across DST. Adding 86,400,000 ms is a real-time duration and shifts the wall time on DST days.

### "How do you format dates and numbers for different locales?"

`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`, `Intl.PluralRules` and `Intl.ListFormat`, with the user's locale and, for dates, the time zone to display in. Reuse formatter instances. Never build date strings by hand or use `toFixed` for display.

### "Why shouldn't you use floats for money?"

Binary floating point can't represent most decimal fractions exactly, so sums drift (`0.1 + 0.2`). Use integer minor units (cents) with a currency code, `DECIMAL` in the database, and format only for display.

### "What is Temporal and what does it fix?"

The new built-in date/time API. Separate immutable types for each concept (`Instant`, `ZonedDateTime`, `PlainDate`, `PlainTime`, `Duration`), 1-based months, any IANA time zone, strict parsing, and DST-aware arithmetic with explicit handling of ambiguous times.

### "`Date.now()` vs `performance.now()`?"

`Date.now()` is wall-clock time and can jump when the system clock changes. `performance.now()` is monotonic and high-resolution — use it to measure durations.

### "How do you test date-dependent code?"

Fake timers with a fixed system time, a fixed `TZ` in test scripts (plus runs in a zone west of UTC and around DST transitions), and explicit locales in assertions.

---

## Related Files

- [JAVASCRIPT-DEEP.md](JAVASCRIPT-DEEP.md) — language fundamentals
- [BROWSER-DOM-EVENTS-DEEP.md](BROWSER-DOM-EVENTS-DEEP.md) — inputs, timers, rAF
- [REACT-FORMS-DEEP.md](REACT-FORMS-DEEP.md) — date fields in forms, Zod validation
- [../2-medium-priority/I18N-DEEP.md](../2-medium-priority/I18N-DEEP.md) — translations, locales, RTL, using Intl in an i18n setup
- [SQL-BASICS-DEEP.md](SQL-BASICS-DEEP.md) and [DATABASE-DESIGN-DEEP.md](DATABASE-DESIGN-DEEP.md) — column types
- [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) — fake timers in component tests
- [../2-medium-priority/NEXTJS-DEEP.md](../2-medium-priority/NEXTJS-DEEP.md) — hydration
