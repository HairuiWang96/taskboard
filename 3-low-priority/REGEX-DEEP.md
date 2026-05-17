# Regular Expressions — Deep Reference

## Syntax Quick Reference

```
CHARACTER CLASSES
.         any character except newline
\d        digit [0-9]
\D        non-digit
\w        word character [a-zA-Z0-9_]
\W        non-word character
\s        whitespace (space, tab, newline)
\S        non-whitespace
[abc]     any of a, b, c
[^abc]    not a, b, or c
[a-z]     range a to z
[a-zA-Z] case-insensitive letter

ANCHORS
^         start of string (or line with /m flag)
$         end of string (or line with /m flag)
\b        word boundary (between \w and \W)
\B        non-word boundary

QUANTIFIERS
*         0 or more (greedy)
+         1 or more (greedy)
?         0 or 1 (makes preceding optional)
{3}       exactly 3
{3,}      3 or more
{3,6}     between 3 and 6
*?        0 or more (lazy — matches as few as possible)
+?        1 or more (lazy)

GROUPS & ALTERNATION
(abc)     capturing group
(?:abc)   non-capturing group (no capture overhead)
(?<name>) named capturing group
a|b       a or b
\1        backreference to group 1

LOOKAHEAD / LOOKBEHIND
(?=abc)   positive lookahead — followed by abc
(?!abc)   negative lookahead — NOT followed by abc
(?<=abc)  positive lookbehind — preceded by abc
(?<!abc)  negative lookbehind — NOT preceded by abc

FLAGS
/g        global — find all matches
/i        case-insensitive
/m        multiline (^ and $ match line boundaries)
/s        dotAll (. matches newline too)
```

---

## Common Patterns

```ts
// Email (simplified — true RFC 5321 is extremely complex)
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Better: use a proper library (zod z.string().email())

// URL
const url = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

// Phone (US)
const phone = /^\+?1?\s?(\(?\d{3}\)?[\s.-]?)(\d{3}[\s.-]?)(\d{4})$/;

// IPv4 address
const ipv4 = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

// Date YYYY-MM-DD
const date = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Strong password (min 8 chars, uppercase, lowercase, number, special char)
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Hex color
const hexColor = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// Slug (URL-friendly)
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Credit card (basic — 13-16 digits, optional spaces/hyphens)
const creditCard = /^[\d\s-]{13,19}$/;

// Semantic version
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-z-]+))?$/i;

// UUID v4
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
```

---

## JavaScript Regex Methods

```ts
// test() — returns boolean, fastest for "does it match?"
/^\d+$/.test('123');       // true
/^\d+$/.test('abc');       // false

// match() — returns match array or null
'hello world'.match(/\w+/);         // ['hello'] — first match
'hello world'.match(/\w+/g);        // ['hello', 'world'] — all matches with /g

// matchAll() — returns iterator of all matches with capture groups
const matches = [...'2026-01-15 2026-02-20'.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)];
matches[0][1]; // '2026'  — group 1
matches[0][2]; // '01'    — group 2

// replace() — replace matches
'hello world'.replace(/\w+/, 'hi');      // 'hi world' — first only
'hello world'.replace(/\w+/g, 'hi');     // 'hi hi' — all

// replace with function — dynamic replacement
'hello world'.replace(/\w+/g, word => word.toUpperCase());
// 'HELLO WORLD'

// Named groups
const { year, month, day } = '2026-05-13'.match(
    /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/
)!.groups!;

// split() — split on regex
'one1two2three'.split(/\d/);  // ['one', 'two', 'three']
```

---

## Greedy vs Lazy

```ts
const html = '<b>bold</b> and <i>italic</i>';

// Greedy — matches as much as possible
html.match(/<.+>/);   // '<b>bold</b> and <i>italic</i>' — oops, entire string

// Lazy — matches as little as possible
html.match(/<.+?>/);  // '<b>' — just the first tag

// Common gotcha: greedy quantifiers eat more than intended
// Fix: use lazy quantifier (+?) or use [^>] to exclude what shouldn't match
html.match(/<[^>]+>/g);  // ['<b>', '</b>', '<i>', '</i>'] — more precise
```

---

## Lookahead / Lookbehind

```ts
// Positive lookahead — match X only if followed by Y
'100px 200em 300px'.match(/\d+(?=px)/g);  // ['100', '300'] — numbers before "px"

// Negative lookahead — match X only if NOT followed by Y
'100px 200em'.match(/\d+(?!px)\b/g);  // ['200'] — numbers NOT before "px"

// Positive lookbehind — match X only if preceded by Y
'$100 £200 $300'.match(/(?<=\$)\d+/g);  // ['100', '300'] — numbers after "$"

// Negative lookbehind
'$100 £200'.match(/(?<!\$)\d+/g);  // ['200'] — numbers NOT after "$"

// Real use: format number with commas (insert comma before every group of 3 digits)
'1234567'.replace(/\B(?=(\d{3})+(?!\d))/g, ',');  // '1,234,567'
```

---

## Performance Tips

```ts
// ✗ Recompiling regex on every call (in a loop)
items.forEach(item => item.match(/^\d+$/)); // new RegExp object each time

// ✓ Compile once, reuse
const numericRegex = /^\d+$/;
items.forEach(item => numericRegex.test(item));

// ✗ Catastrophic backtracking — exponential time on some inputs
// Pattern: (a+)+ — nested quantifiers on same chars
const bad = /^(a+)+$/;
bad.test('aaaaaaaaaaaaaaaaaaaaab'); // may hang for seconds!

// ✓ Fix: use atomic groups or possessive quantifiers (not in JS)
// Or restructure the pattern to eliminate ambiguity
const good = /^a+$/;

// For complex validation, consider a proper parser over regex
// Regex is not suitable for: HTML, JSON, nested structures, context-free grammars
```

---

## Most Asked Regex Interview Questions

### "How do you extract all URLs from a string?"

```ts
const text = 'Visit https://example.com or http://test.org/path?q=1';
const urls = text.match(/https?:\/\/[^\s]+/g);
// ['https://example.com', 'http://test.org/path?q=1']
```

### "How do you validate an email with regex?"

```ts
// Simple check — good enough for most purposes
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// In practice: send a confirmation email — that's the real validation
// Use a library (zod) rather than crafting your own regex
```

### "How do you replace all occurrences of a string?"

```ts
// ✗ replace() without /g only replaces first
'aabbcc'.replace('b', 'X');   // 'aaXbcc'

// ✓ With /g flag
'aabbcc'.replace(/b/g, 'X');  // 'aaXXcc'

// ✓ replaceAll() (ES2021)
'aabbcc'.replaceAll('b', 'X'); // 'aaXXcc'
```

### "Write a regex to match a password with specific requirements."

```ts
// At least 8 chars, one uppercase, one lowercase, one digit, one special char
const validatePassword = (p: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(p);

// Breaking it down:
// (?=.*[a-z])   — lookahead: at least one lowercase
// (?=.*[A-Z])   — lookahead: at least one uppercase
// (?=.*\d)      — lookahead: at least one digit
// (?=.*[@$!%*?&]) — lookahead: at least one special char
// .{8,}         — at least 8 characters total
```
