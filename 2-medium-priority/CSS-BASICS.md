# CSS — Beginner's Practical Guide

**Priority: MEDIUM**

> The CSS you actually meet in real projects: the box model, units, Flexbox, Grid, centring,
> spacing, positioning, responsive design, transitions, and how to read Tailwind. Plus a
> troubleshooting section for when something "just won't work".
>
> Written for reading and adjusting CSS in a working project — including CSS an AI wrote for
> you — rather than for interviews.

---

## Table of Contents

- [CSS — Beginner's Practical Guide](#css--beginners-practical-guide)
    - [Table of Contents](#table-of-contents)
    - [1. How CSS Actually Works](#1-how-css-actually-works)
        - [Selectors you will actually see](#selectors-you-will-actually-see)
        - [The cascade — which rule wins](#the-cascade--which-rule-wins)
        - [Inheritance](#inheritance)
    - [2. The Box Model](#2-the-box-model)
        - [box-sizing — the one line every project needs](#box-sizing--the-one-line-every-project-needs)
        - [Shorthand values](#shorthand-values)
    - [3. Units — px, rem, %, vh, fr](#3-units--px-rem--vh-fr)
    - [4. Display — Why Things Sit Where They Do](#4-display--why-things-sit-where-they-do)
    - [5. Flexbox — The 90% You Need](#5-flexbox--the-90-you-need)
    - [6. Grid — The 90% You Need](#6-grid--the-90-you-need)
    - [7. Centring Things](#7-centring-things)
    - [8. Spacing — margin, padding, gap](#8-spacing--margin-padding-gap)
    - [9. Positioning \& z-index](#9-positioning--z-index)
    - [10. Colours, Borders, Shadows](#10-colours-borders-shadows)
    - [11. Typography](#11-typography)
    - [12. Responsive Design](#12-responsive-design)
    - [13. Transitions \& Hover Effects](#13-transitions--hover-effects)
        - [transform vs transition — they are not the same thing](#transform-vs-transition--they-are-not-the-same-thing)
    - [14. Reading Tailwind](#14-reading-tailwind)
    - [15. Debugging CSS](#15-debugging-css)
    - [16. Troubleshooting — "Why Won't This Work?"](#16-troubleshooting--why-wont-this-work)
    - [17. Cheat Sheet](#17-cheat-sheet)
    - [Related Files](#related-files)

---

## 1. How CSS Actually Works

```css
/* A CSS rule has three parts. */

.card {
    /* SELECTOR — which elements this applies to */
    color: red; /* PROPERTY: VALUE — what to change, and to what */
    padding: 16px; /* each line is one DECLARATION */
}
```

### Selectors you will actually see

```css
/* By tag name — every <p> on the page */
p {
}

/* By class — every element with class="card". THE ONE YOU USE 95% OF THE TIME. */
.card {
}

/* By id — the single element with id="header". ‼️ Avoid in practice: ids are
   hard to override (see specificity below) and can only be used once. */
#header {
}

/* Multiple selectors, same rules — comma-separated */
h1,
h2,
h3 {
}

/* DESCENDANT — ‼️any .title ANYWHERE inside .card, however deeply nested */
‼️ ‼️ .card .title {
}

/* DIRECT CHILD — only a .title that is an immediate child of .card.‼️
   The > matters: with .card > .title, a .title inside .card > .body is NOT matched. */
.card > .title {
}

/* An element with BOTH classes (no space between them) */
‼️ .card.featured {
}

/* ‼️ Note the difference — this trips people up constantly:
     .card.featured   →  ONE element with class="card featured"
     .card .featured  →  a .featured element INSIDE a .card             */

/* STATE — pseudo-classes */
.button:hover {
} /* mouse is over it */
.button:focus {
} /* keyboard-focused ‼️/ clicked into */
.button:disabled {
} /* has the disabled attribute */
.input:focus-visible {
} /* focused via KEYBOARD only‼️ — use for focus rings */
.item:first-child {
}
.item:last-child {
}
.item:nth-child(2) {
}
.item:not(.active) {
} /* everything except .active */
```

### The cascade — which rule wins

```css
/* When two rules target the same element, the browser decides by SPECIFICITY.
   The practical ranking, from weakest to strongest: */

p {
    color: blue;
} /* 1 — tag selector        (weakest) */
.text {
    color: green;
} /* 2 — class selector */
#intro {
    color: orange;
} /* 3 — id selector */
/* style="color: purple"  */ /* 4 — inline style */
p {
    color: red !important;
} /* 5 — !important          (strongest) */

/* ‼️ Two practical rules that save a lot of pain:
   1. If two rules have the SAME specificity, the one written LATER wins.
      This is why the order of your CSS file matters, and why an imported
      library's styles can override yours (or not) depending on import order.‼️

   2. Do not reach for !important to fix an override problem. It works, then
      the next thing that needs to override it needs !important too, and
      within a month nothing can be overridden by anything. Add a class, or
      make your selector slightly more specific, instead. */
```

### Inheritance

```css
/* Some properties pass down to children automatically‼️ — mostly text ones:
     color, font-family, font-size, line-height, text-align

   Most do not — layout and box properties:‼️
     padding, margin, border, background, width, display */

body {
    font-family: system-ui, sans-serif; /* every element inherits this */
    color: #333; /* and this */
    padding: 20px; /* ‼️ NOT inherited — body only */
}

/* This is why setting the font once on <body> styles the whole page, but you
   have to set padding on each element that needs it. */
```

---

## 2. The Box Model

```text
‼️ EVERY element is a rectangular box with four layers. Understanding this
   diagram resolves most "why is there a gap there?" questions.

  ┌─────────────────────────────────────────────┐
  │  MARGIN            (space OUTSIDE the box)  │   ← transparent, pushes
  │   ┌─────────────────────────────────────┐   │     other elements away
  │   │  BORDER                             │   │
  │   │   ┌─────────────────────────────┐   │   │
  │   │   │  PADDING  (space INSIDE)    │   │   │   ← inside the background
  │   │   │   ┌─────────────────────┐   │   │   │
  │   │   │   │      CONTENT        │   │   │   │
  │   │   │   │   text, image, etc  │   │   │   │
  │   │   │   └─────────────────────┘   │   │   │
  │   │   └─────────────────────────────┘   │   │
  │   └─────────────────────────────────────┘   │
  └─────────────────────────────────────────────┘

  PADDING  space INSIDE the border. The background colour extends into it.‼️
           Use it to stop text touching the edge of a box.

  MARGIN   space OUTSIDE the border. Always transparent.‼️
           Use it to push this box away from its neighbours.

  THE RULE OF THUMB: padding pushes the content IN, margin pushes other
  elements AWAY. If a button's text is cramped → padding. If two buttons are
  too close together → margin (or gap, see §8).
```

### box-sizing — the one line every project needs

```css
/* ‼️ THE DEFAULT IS COUNTERINTUITIVE AND CAUSES CONSTANT LAYOUT BUGS. */

.box {
    width: 200px;
    padding: 20px;
    border: 2px solid black;
}
/* By default (box-sizing: content-box), that box is NOT 200px wide.
   It is 200 + 20 + 20 + 2 + 2 = 244px.
   The width applies to the CONTENT only;‼️ padding and border are added on top.

   So two 50%-wide boxes with padding do not fit side by side, and you get a
   mystery overflow or an unexpected wrap. */

/* THE FIX — put this at the top of every project. It is the first thing in
   almost every CSS reset, and there is no downside. */
‼️ *,
*::before,
*::after {
    box-sizing: border-box;
}

/* With border-box, width means the TOTAL width including padding and border.‼️‼️
   Now .box really is 200px wide, and 50% really is half. This is what people
   expect, and what every UI framework uses. */
```

### Shorthand values

```css
/* Padding and margin take 1 to 4 values. The order is CLOCKWISE from the top. */

padding: 10px; /* all four sides */
padding: 10px 20px; /* vertical | horizontal */
padding: 10px 20px 30px; /* top | horizontal | bottom */
padding: 10px 20px 30px 40px; /* top | right | bottom | left  (clockwise) */

/* Or set one side at a time when you only need one: */
padding-top: 10px;
margin-bottom: 24px;

/* ‼️ margin: 0 auto is the classic "centre this block horizontally".‼️
   `auto` means "split the leftover space equally between left and right",
   which only works on a block element with a set width. */
.container {
    max-width: 1200px;
    margin: 0 auto; /* 0 top/bottom, auto left/right → centred */‼️‼️
}
```

---

## 3. Units — px, rem, %, vh, fr

```css
/* ── px — absolute pixels ─────────────────────────────────────────────── */
/* Fixed size, never scales.‼️ Fine for borders, small fixed details,
   and shadows. ‼️ Avoid for font-size: it ignores the user's browser font
   setting, which is an accessibility problem for anyone who has increased it. */
border: 1px solid #ddd;
border-radius: 8px;

/* ── rem — relative to the ROOT font size ─────────────────────────────── */
/* 1rem = the <html> font-size, which is 16px by default.
   So: 1rem = 16px, 1.5rem = 24px, 0.5rem = 8px, 0.875rem = 14px.
   ‼️ THE DEFAULT CHOICE for font sizes, padding, margins, and widths.‼️
   Everything scales together if the user changes their font size. */
font-size: 1.125rem; /* 18px */
padding: 1.5rem; /* 24px */

/* ── em — relative to THIS element's font size ────────────────────────── */
/* Useful for spacing that should scale WITH the text of the component. */‼️
.button {
    font-size: 1.125rem; /* 18px */
    padding: 0.5em 1em; /* 9px 18px — scales with the button's own text */‼️
}
/* ‼️ em COMPOUNDS when nested. A 1.2em inside a 1.2em is 1.44× the root.
   Nest a few levels and sizes drift unpredictably. ‼️ This is exactly why rem
   exists — it always resolves against the root and never compounds. */

/* ── % — relative to the PARENT ───────────────────────────────────────── */
width: 50%; /* half the parent's width */
/* ‼️ A percentage HEIGHT only works if the parent has an explicit height.‼️
   height: 100% on a child of a parent with no height does nothing‼️ — this is
   one of the most common "why isn't this filling the screen?" questions. */

/* ── vh / vw — relative to the VIEWPORT (browser window) ───────────────── */‼️
min-height: 100vh; /* full screen height — for hero sections, page shells */
width: 100vw; /* full screen width */
/* ‼️ Prefer 100dvh over 100vh on mobile. ‼️100vh counts the area BEHIND the
   browser's address bar, so a full-height section gets cut off or causes an
   unexpected scroll. ‼️dvh ("dynamic viewport height") adjusts as the bar
   shows and hides. */
min-height: 100dvh;

/* ── fr — a fraction of free space (Grid only) ────────────────────────── */
grid-template-columns: 1fr 2fr; /* second column is twice as wide */

/* ── Useful functions ─────────────────────────────────────────────────── */
width: min(90%, 1200px); /* whichever is SMALLER — caps at 1200px */
width: max(50%, 300px); /* whichever is LARGER — never below 300px */
width: clamp(300px, 90%, 1200px); /* min, preferred, max — responsive with
                                      no media query at all */‼️
font-size: clamp(1rem, 2.5vw, 2rem); /* scales with the window, bounded */‼️
```

```text
‼️ PRACTICAL DEFAULTS — what to reach for without thinking:

  Font sizes ........ rem
  Padding / margin .. rem  (or a design system's spacing scale)
  Borders ........... px
  Border radius ..... px
  Widths ............ %, rem, or clamp()
  Max widths ........ rem or px  (e.g. max-width: 70ch for readable text)
  Full-screen ....... dvh / vw
  Grid columns ...... fr
```

---

## 4. Display — Why Things Sit Where They Do

```css
/* ‼️ `display` is the single most important property for layout, and the
   answer to "why won't these sit side by side?" is almost always here. */

/* ── block ────────────────────────────────────────────────────────────── */
/* Takes the FULL width available, always starts on a new line.
   Default for: div, p, h1-h6, section, header, footer, ul, li */
display: block;
/* You CAN set width and height. */‼️

/* ── inline ───────────────────────────────────────────────────────────── */
/* Flows within text, only as wide as its content, does NOT start a new line.
   Default for: span, a, strong, em, img(ish) */
display: inline;
/* ‼️ width, height, and vertical margin/padding DO NOT WORK on inline elements.
   Setting height on a <span> and seeing nothing happen is this rule.
   Fix: make it inline-block or block. */‼️

/* ── inline-block ─────────────────────────────────────────────────────── */
/* Flows inline like text, but accepts width, height, and all padding.
   Was the standard way to lay things out horizontally before Flexbox. */
display: inline-block;
/* ‼️ Has an annoying quirk: whitespace in your HTML becomes a visible ~4px‼️
   gap between items, because they are still being treated as text. Flexbox
   does not have this problem, which is one reason it replaced this approach.‼️ */

/* ── flex ─────────────────────────────────────────────────────────────── */
/* Children line up in a row (or column) and can be distributed and aligned.
   ‼️ THE DEFAULT ANSWER for arranging a handful of things in a line. */
display: flex;

/* ── grid ─────────────────────────────────────────────────────────────── */
/* Children go into a two-dimensional grid of rows and columns. */
display: grid;

/* ── none ─────────────────────────────────────────────────────────────── */
display: none; /* removed entirely — takes up no space */
/* Compare with: */
visibility: hidden; /* invisible but STILL OCCUPIES its space */‼️
opacity: 0; /* invisible, occupies space, and is still CLICKABLE */‼️
```

```text
‼️ THE DECISION IN PRACTICE:

  One row or one column of items?          → flex
  Rows AND columns together (a real grid)? → grid
  A card grid that wraps responsively?     → grid with auto-fit (§6)‼️
  Text flowing inside a paragraph?         → inline (leave it alone)

  You will use flex far more often than grid. When in doubt, start with flex.
```

---

## 5. Flexbox — The 90% You Need

```css
/* Flexbox has two sides: properties on the CONTAINER, and properties on the
   ITEMS inside it. Most of the time you only touch the container. */

.container {
    display: flex;

    /* ── DIRECTION — which way do items flow? ───────────────────────────── */
    flex-direction: row; /* → default: left to right */
    flex-direction: column; /* ↓ top to bottom — used constantly for
                                     stacking things with even spacing */

    /* ── JUSTIFY-CONTENT — alignment ALONG the direction ─────────────────── */
    /* For row: horizontal. For column: vertical. */
    justify-content: flex-start; /* default — packed at the start */
    justify-content: center; /* centred */
    justify-content: flex-end; /* packed at the end */
    justify-content: space-between; /* first at start, last at end, even gaps.
                                     ‼️ THE navbar/header layout: logo left,
                                     nav right, with one line of CSS. */
    justify-content: space-around; /* equal space around each item */
    justify-content: space-evenly; /* equal space between AND at the edges */

    /* ── ALIGN-ITEMS — alignment ACROSS the direction ────────────────────── */
    /* For row: vertical. For column: horizontal. */
    align-items: stretch; /* default — items fill the cross axis */
    align-items: center; /* ‼️ vertically centres a row. Used constantly. */
    align-items: flex-start;
    align-items: flex-end;
    align-items: baseline; /* align text baselines — good for mixed sizes */‼️

    /* ── GAP — space between items ───────────────────────────────────────── */
    /* ‼️ Use this instead of margins on children. No "last item has a trailing
     margin" problem, no :last-child overrides. */‼️
    gap: 1rem;
    gap: 1rem 2rem; /* row-gap | column-gap */

    /* ── WRAP — allow items onto a new line ──────────────────────────────── */
    flex-wrap: nowrap; /* ‼️ default — items SHRINK rather than wrap, which
                          is why a flex row can squash its contents instead
                          of moving them to the next line */
    flex-wrap: wrap; /* items move to a new line when they run out of room */‼️
}

/* ── PROPERTIES ON THE ITEMS ─────────────────────────────────────────── */
.item {
    flex: 1; /* ‼️ "grow to fill the available space, share it equally".
                       Two items both with flex: 1 → each takes half. */
    flex: 2; /* takes twice as much of the free space as a flex: 1 */
    flex: 0 0 200px; /* don't grow, don't shrink, stay 200px — a fixed sidebar */‼️
    flex-shrink: 0; /* ‼️ "never let this get squashed". ‼️ The fix when an icon
                       or button gets crushed next to long text. */
    align-self: center; /* override the container's align-items for one item */‼️
    margin-left: auto; /* ‼️ push THIS item (and everything after it) to the
                          far end. The classic "one link on the right of the
                          navbar" trick. */‼️
}
```

```css
/* ── THE PATTERNS YOU WILL WRITE OVER AND OVER ───────────────────────── */

/* 1. Navbar: logo left, links right */
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
}

/* 2. Icon next to text, vertically aligned */
.button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* 3. A vertical stack with even spacing — replaces margin on every child */
.stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* 4. Sidebar fixed, main content fills the rest */
.layout {
    display: flex;
    gap: 2rem;
}
.sidebar {
    flex: 0 0 250px;
} /* fixed 250px */
.main {
    flex: 1;
} /* everything else */

/* 5. Footer pinned to the bottom even on short pages */
.page {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
}
.content {
    flex: 1;
} /* content grows, pushing the footer down */
```

---

## 6. Grid — The 90% You Need

```css
/* Grid is for two-dimensional layout: rows AND columns at the same time. */

.grid {
    display: grid;

    /* ── COLUMNS ─────────────────────────────────────────────────────────── */
    grid-template-columns: 200px 1fr; /* fixed sidebar + flexible main */
    grid-template-columns: 1fr 1fr 1fr; /* three equal columns */
    grid-template-columns: repeat(3, 1fr); /* same thing, less typing */
    grid-template-columns: 2fr 1fr; /* first column twice as wide */

    /* ── ROWS (often you can leave these automatic) ──────────────────────── */
    grid-template-rows: auto 1fr auto; /* header | content | footer */

    gap: 1rem; /* space between cells — same idea as in flexbox */
}
```

```css
/* ‼️ THE ONE GRID PATTERN TO MEMORISE — a responsive card grid with NO
   media queries at all. */
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}
/* How to read that:
     repeat(auto-fit, ...)  →  fit as many columns as will fit‼️‼️
     minmax(250px, 1fr)     →  each column is at least 250px, and shares any
                               leftover space equally‼️

   Result: 4 columns on a desktop, 2 on a tablet, 1 on a phone — automatically,‼️
   at every width in between, without a single breakpoint.‼️

   ‼️ auto-fit vs auto-fill: with few items, auto-fit STRETCHES them to fill
   the row; auto-fill leaves empty invisible columns. auto-fit is usually
   what you want. */
```

```css
/* ── PLACING ITEMS ACROSS CELLS ──────────────────────────────────────── */
.featured {
    grid-column: span 2; /* this item is two columns wide */
    grid-row: span 2; /* and two rows tall */
    grid-column: 1 / 3; /* from grid line 1 to line 3 (i.e. 2 columns) */‼️
    grid-column: 1 / -1; /* ‼️ full width, whatever the column count */‼️‼️
}

/* ── NAMED AREAS — the most readable way to do a page shell ──────────── */
.page {
    display: grid;
    grid-template-areas:
        'header header'
        'sidebar main'
        'footer footer';
    grid-template-columns: 250px 1fr;
    grid-template-rows: auto 1fr auto;
    min-height: 100dvh;
}
.page > header {
    grid-area: header;
}
.page > aside {
    grid-area: sidebar;
}
.page > main {
    grid-area: main;
}
.page > footer {
    grid-area: footer;
}
/* The ASCII picture in the CSS IS the layout — you can see the page shape by
   reading it, and rearranging the page means rearranging those strings. */

/* ── ALIGNMENT — same vocabulary as flexbox ──────────────────────────── */
.grid {
    justify-items: center; /* horizontal position of items inside their cell */
    align-items: center; /* vertical position of items inside their cell */
    place-items: center; /* both at once */‼️‼️
}
```

```text
‼️ FLEX OR GRID? The practical test:

  "I have a handful of things and I want them in a line, spaced out."  → FLEX
  "I have a repeating set of cards that should wrap into a grid."      → GRID
  "I'm laying out the overall page: header, sidebar, main, footer."    → GRID
  "I'm aligning an icon next to some text."                            → FLEX

  Another way to put it: flex arranges content along ONE axis and lets the
  content decide the sizes. Grid defines the STRUCTURE first and places
  content into it. Most components are flex; most page shells are grid.
```

---

## 7. Centring Things

```css
/* ‼️ The most-searched CSS question of all time. Here are the ways that matter. */

/* ── HORIZONTALLY: a block element with a width ──────────────────────── */
.box {
    max-width: 600px;
    margin: 0 auto; /* auto left/right splits the leftover space */
}

/* ── HORIZONTALLY: text, or inline content ───────────────────────────── */
.box {
    text-align: center;
}

/* ── BOTH DIRECTIONS: flexbox — the everyday answer ──────────────────── */
.parent {
    display: flex;
    justify-content: center; /* horizontal */
    align-items: center; /* vertical */
    min-height: 300px; /* ‼️ needs a height to centre WITHIN */‼️‼️
}

/* ── BOTH DIRECTIONS: grid — shortest version ────────────────────────── */
.parent {
    display: grid;
    place-items: center;
    min-height: 300px;
}

/* ── BOTH DIRECTIONS: absolute positioning — for overlays and modals ──── */‼️‼️
.parent {
    position: relative;
}
.child {
    position: absolute;
    top: 50%;
    left: 50%;
    /* ‼️ The translate is essential. top/left position the child's TOP-LEFT
     CORNER at the centre, so without this the box sits down-and-right of
     where you want it. translate(-50%, -50%) shifts it back by half its own
     size — and works without knowing that size in advance. */
    transform: translate(-50%, -50%);
}

/* ── A CENTRED PAGE CONTAINER — the pattern every site uses ──────────── */
.container {
    width: 100%;
    max-width: 1200px; /* never wider than this */
    margin: 0 auto; /* centred */
    padding: 0 1rem; /* ‼️ breathing room so text never touches the phone
                          screen edge */‼️‼️
}
```

---

## 8. Spacing — margin, padding, gap

```css
/* ‼️ MODERN ADVICE: reach for `gap` first. It only works inside flex or grid,‼️
   but that covers most layout, and it avoids every margin headache below. */

/* ── THE OLD WAY — margin on each child ──────────────────────────────── */
.list-item {
    margin-bottom: 1rem;
}
.list-item:last-child {
    margin-bottom: 0; /* ‼️ the extra rule you always have to remember,
                            or you get a stray gap at the bottom */
}

/* ── THE MODERN WAY ──────────────────────────────────────────────────── */
.list {
    display: flex;
    flex-direction: column;
    gap: 1rem; /* space BETWEEN items only — no trailing gap, no
                            :last-child rule, nothing to forget */
}
```

```css
/* ‼️ MARGIN COLLAPSING — the "why is there a gap I didn't ask for?" bug.‼️‼️
   VERTICAL margins between siblings MERGE into one, taking the larger value. */‼️

.a {
    margin-bottom: 20px;
}
.b {
    margin-top: 30px;
}
/* The gap between them is 30px, NOT 50px. */‼️

/* Worse, a child's top margin can "escape" its parent and push the PARENT
   down instead of the child:  */‼️‼️
.parent {
    background: grey;
} /* no padding, no border */
.child {
    margin-top: 20px;
} /* pushes .parent down, not .child */‼️‼️

/* Fixes, in order of preference:‼️‼️
     1. Use gap on a flex/grid parent — collapsing does not happen at all.
     2. Give the parent padding or a border — that blocks the escape.
     3. Use padding instead of margin.
   ‼️ Horizontal margins never collapse. This is a vertical-only oddity. */‼️‼️
```

```css
/* ── A SPACING SCALE — pick from a set, don't invent numbers ──────────── */
:root {
    --space-1: 0.25rem; /*  4px */
    --space-2: 0.5rem; /*  8px */
    --space-3: 1rem; /* 16px */
    --space-4: 1.5rem; /* 24px */
    --space-5: 2rem; /* 32px */
    --space-6: 3rem; /* 48px */
}
.card {
    padding: var(--space-4);
    gap: var(--space-3);
}
/* ‼️ Why bother: consistent spacing is most of what makes a design look
   "professional" rather than homemade. Choosing from six values instead of
   typing 13px here and 18px there is the single easiest visual upgrade. */
```

---

## 9. Positioning & z-index

```css
/* ── static — the default ────────────────────────────────────────────── */
position: static; /* normal document flow; top/left/right/bottom do nothing */

/* ── relative — nudge it, and become an anchor ───────────────────────── */
.box {
    position: relative;
    top: 10px; /* moves 10px down from where it WOULD have been */
}
/* ‼️ Its original space is still reserved — nothing else moves. The far more
   common use is as an ANCHOR: an absolutely positioned child positions itself
   against the nearest positioned ancestor, so `position: relative` with no
   offsets is how you say "position children against THIS box". */

/* ── absolute — removed from flow, positioned against an ancestor ────── */
.parent {
    position: relative;
} /* ‼️ without this, .badge positions
                                       against the whole page instead */
.badge {
    position: absolute;
    top: -8px;
    right: -8px; /* a notification dot on the corner of an icon */
}

/* ── fixed — pinned to the viewport, ignores scrolling ───────────────── */‼️
.floating-button {
    position: fixed;
    bottom: 2rem;
    right: 2rem; /* stays put while the page scrolls */
}

/* ── sticky — normal until it hits a scroll threshold, then pinned ───── */
.header {
    position: sticky;
    top: 0; /* ‼️ REQUIRED — sticky with no offset does nothing at all,‼️‼️
                       and this is the usual reason "sticky isn't working" */
    z-index: 10;
}
/* ‼️ Second common sticky failure: it only sticks within its PARENT. If the
   parent is only as tall as the header, there is nothing to stick across.
   Also, any ancestor with `overflow: hidden` breaks sticky entirely. */‼️‼️
```

```css
/* ── z-index — what stacks on top ────────────────────────────────────── */
.modal {
    position: fixed;
    z-index: 100;
}
.tooltip {
    position: absolute;
    z-index: 50;
}

/* ‼️ Two rules that explain most z-index confusion:
   1. z-index ONLY works on positioned elements (relative/absolute/fixed/sticky).‼️‼️
      Adding it to a static element does nothing.
   2. z-index is compared only among SIBLINGS in the same stacking context.‼️‼️
      A child with z-index: 9999 inside a parent with z-index: 1 will still
      sit below a sibling of that parent with z-index: 2. ‼️The child cannot
      escape its parent's layer. This is why "I set z-index to 9999 and it
      still doesn't show" happens — the fix is to move the element up the DOM,
      or change the PARENT's z-index. */

/* Keep a small documented scale rather than escalating numbers: */
:root {
    --z-dropdown: 10;
    --z-sticky-header: 20;
    --z-modal-backdrop: 40;
    --z-modal: 50;
    --z-toast: 60;
}
```

---

## 10. Colours, Borders, Shadows

```css
/* ── COLOUR FORMATS ──────────────────────────────────────────────────── */
color: #3b82f6; /* hex — most common */
color: #3b82f680; /* hex with alpha (last two digits) */
color: rgb(59 130 246); /* modern space-separated syntax */
color: rgb(59 130 246 / 50%); /* with transparency */
color: hsl(217 91% 60%); /* hue, saturation, lightness */
/* ‼️ HSL is worth knowing: to make a colour lighter or darker for a hover
   state, change ONLY the lightness number. ‼️‼️With hex you have to guess a whole
   new value. hsl(217 91% 60%) → hsl(217 91% 50%) is the same blue, darker. */

/* ── CSS VARIABLES — define your palette once ────────────────────────── */
:root {
    --color-primary: #3b82f6;
    --color-primary-dark: #2563eb;
    --color-text: #1f2937;
    --color-text-muted: #6b7280;
    --color-border: #e5e7eb;
    --color-bg: #ffffff;
}
.button {
    background: var(--color-primary);
    color: white;
}
.button:hover {
    background: var(--color-primary-dark);
}
/* ‼️ The payoff: changing the brand colour is one line, and dark mode is a
   matter of redefining the same names under a media query — no rewriting of
   every rule that used the colour. */

@media (prefers-color-scheme: dark) {
    :root {
        --color-text: #f9fafb;
        --color-bg: #111827;
        --color-border: #374151;
    }
}

/* ── BORDERS ─────────────────────────────────────────────────────────── */
border: 1px solid var(--color-border); /* width | style | colour */‼️
border-radius: 8px;
border-radius: 50%; /* a circle, on a square element */‼️
border-radius: 9999px; /* a pill shape, on a wide element */
border-bottom: 2px solid red; /* one side only — underlines, active tabs */

/* ── SHADOWS ─────────────────────────────────────────────────────────── */
/*           x-offset | y-offset | blur | spread | colour */‼️
box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); /* subtle card lift */
box-shadow: 0 4px 12px rgb(0 0 0 / 0.15); /* more elevated */
box-shadow: 0 20px 25px rgb(0 0 0 / 0.15); /* modal */
box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.1); /* pressed inward */
box-shadow: 0 0 0 3px rgb(59 130 246 / 0.5); /* focus ring */

/* ‼️ Shadows should be subtle and consistent. A realistic shadow is mostly
   soft and low-opacity — big blur, small offset, 10-15% black. Harsh dark
   shadows are the fastest way to make a UI look amateur. Layering two
   shadows (one tight, one soft) looks noticeably better than one: */
box-shadow:
    0 1px 2px rgb(0 0 0 / 0.08),
    0 4px 12px rgb(0 0 0 / 0.08);
```

---

## 11. Typography

```css
body {
    /* ‼️ The system font stack — uses the OS's own UI font. Loads instantly
     (no download), and looks native on every platform. A good default before
     you commit to a custom font. */‼️‼️
    font-family:
        system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;

    font-size: 1rem; /* 16px — do not go below this for body text */
    line-height: 1.5; /* ‼️ unitless. 1.5 = 1.5× the element's own font
                              size, and it scales correctly for headings that
                              inherit it. Never use line-height: 24px. */‼️‼️
    color: #1f2937; /* near-black reads better than pure #000 */‼️
}

h1 {
    font-size: 2rem;
    line-height: 1.2; /* ‼️ tighter for large text — 1.5 looks unnaturally
                              airy on headings */
    font-weight: 700;
}

p {
    /* ‼️ THE most effective readability fix there is. `ch` is the width of one
     "0" character, so 65ch is roughly 65 characters per line — the range
     typographers consider comfortable. Full-width paragraphs on a wide
     monitor are genuinely hard to read. */‼️‼️
    max-width: 65ch;
}

/* ── PROPERTIES YOU WILL ACTUALLY USE ────────────────────────────────── */‼️
font-weight: 400; /* normal */
font-weight: 500; /* medium — good for UI labels */
font-weight: 600; /* semibold — good for headings in UI */
font-weight: 700; /* bold */

text-align: left | center | right;
text-transform: uppercase | capitalize | lowercase;
letter-spacing: 0.05em; /* slight tracking — pairs well with uppercase */
text-decoration: none; /* removes the underline from links */‼️

/* Truncate one line with an ellipsis */‼️
.truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap; /* ‼️ all three are required — any one alone does nothing */
}

/* Truncate after N lines */‼️
.clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
```

---

## 12. Responsive Design

```css
/* ‼️ MOBILE-FIRST: write the phone layout as the BASE, then add complexity at
   larger widths with min-width queries.

   Why this order rather than the reverse: the mobile layout is usually the
   simpler one (a single column), so you start simple and add. Going
   desktop-first means every breakpoint has to UNDO something, which is more
   code and harder to follow. */

/* Base — phones. No media query. */
.grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
    .grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Desktop and up */
@media (min-width: 1024px) {
    .grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
```

```css
/* ── COMMON BREAKPOINTS (Tailwind's, which are a reasonable default) ──── */
‼️
/* 640px   sm   large phone      */
/* 768px   md   tablet           */
/* 1024px  lg   laptop           */
/* 1280px  xl   desktop          */
/* 1536px  2xl  large desktop    */

/* ── OTHER USEFUL QUERIES ────────────────────────────────────────────── */‼️
@media (prefers-color-scheme: dark) {
} /* user has dark mode on */
@media (prefers-reduced-motion: reduce) {
} /* ‼️ user asked for less motion —
                                                disable animations here; it is
                                                an accessibility requirement,
                                                not a nicety */
@media print {
} /* printed version */
```

```css
/* ‼️ MODERN CSS THAT REPLACES MANY MEDIA QUERIES ENTIRELY.
   Prefer these — fewer breakpoints means fewer places to keep in sync. */
‼️

/* Fluid font size between two bounds */
h1 {
    font-size: clamp(1.75rem, 5vw, 3.5rem);
}

/* Auto-wrapping card grid — see §6 */
.cards {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

/* Row on wide screens, column on narrow — no breakpoint needed.‼️
   Items stay in a row until they'd drop below 300px, then they wrap. */
.split {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
}
.split > * {
    flex: 1 1 300px;
}

/* A container that is never wider than the screen, with side padding */
.container {
    width: min(100% - 2rem, 1200px);
    margin-inline: auto;
}
```

```html
<!-- ‼️ WITHOUT THIS TAG IN YOUR HTML <head>, NONE OF YOUR RESPONSIVE CSS
     WORKS ON A PHONE. ‼️‼️ The browser pretends to be 980px wide and zooms out,
     so your media queries never fire. Every framework's starter template
     includes it — but if you hand-wrote your HTML, check it is there. -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

---

## 13. Transitions & Hover Effects

### transform vs transition — they are not the same thing

```text
‼️ These get confused constantly, because they are almost always written
   together. They do completely different jobs.

  TRANSFORM   = WHAT the change is.‼️
                Move, rotate, scale, skew. It is a STATE, not a motion.
                On its own it happens INSTANTLY.

  TRANSITION  = HOW the change happens.
                "Animate smoothly over time instead of jumping."
                It changes nothing itself — it watches OTHER properties and
                eases between the old value and the new one.

  THE ONE-LINE VERSION:
    transform moves the thing. transition makes the move smooth.‼️
```

```css
.box {
    transform: translateY(0); /* WHAT: current position */
    transition: transform 200ms ease; /* HOW:  animate changes to transform */
}
.box:hover {
    transform: translateY(-10px); /* change the WHAT... */
    /* ...and transition makes it glide instead of jumping */
}

/* ‼️ TEST YOUR UNDERSTANDING BY DELETING EACH ONE:
     Remove the transition line → the box STILL MOVES on hover, it just snaps
                                  there instantly with no animation.
     Remove the transform lines → NOTHING MOVES AT ALL, because there is no
                                  longer any change for transition to animate.
   That is the clearest demonstration that they are independent. */

/* They do not need each other at all: */
.fade {
    transition: background 200ms ease; /* animates colour — no transform involved */
}
.tilted {
    transform: rotate(45deg); /* permanently rotated — no animation involved */
}
```

```text
‼️ WHY YOU SEE transform IN ALMOST EVERY HOVER EFFECT:

   transform and opacity are the two CHEAPEST things to animate.‼️‼️ The GPU
   handles them without re-laying-out the page, so they stay smooth at 60fps.

   Animating top/left/width/height forces the browser to recalculate layout on
   every single frame, which visibly stutters on slower devices.‼️

     Instead of  top: -2px        →  transform: translateY(-2px)
     Instead of  width: 110%      →  transform: scaleX(1.1)

   Same visual result, far better performance. This is covered again below.‼️
```

```css
/* A transition animates a property when its value changes. */
‼️ .button {
    background: var(--color-primary);
    transform: translateY(0);

    /*          what        | how long | easing */
    transition:
        background 150ms ease,
        transform 150ms ease;
}
.button:hover {
    background: var(--color-primary-dark);
    transform: translateY(-2px); /* lifts slightly */
}

/* ‼️ Put the transition on the BASE element, not on :hover. On :hover only,
   the animation plays on the way in but snaps back instantly on the way out. */‼️

/* ‼️ AVOID `transition: all`. It animates properties you did not intend
   (including layout ones), which is both slower and a source of odd glitches.
   List the properties you actually want. */

/* ‼️ ANIMATE ONLY `transform` AND `opacity` WHERE POSSIBLE.
   These two are handled by the GPU and do not trigger layout recalculation,
   so they stay smooth at 60fps. Animating width, height, top, or margin
   forces the browser to re-lay-out the page on every frame, which visibly
   stutters on slower devices.

     Instead of  top / left      →  transform: translate()
     Instead of  width / height  →  transform: scale()
     Instead of  display: none   →  opacity + visibility                 */

/* ── TIMING ──────────────────────────────────────────────────────────── */
/* 150ms   hovers, small state changes — feels instant but smooth */
/* 200-300ms  dropdowns, modals opening */
/* 500ms+  usually too slow for UI; feels sluggish */

transition-timing-function: ease; /* gentle default */
transition-timing-function: ease-out; /* ‼️ best for things ENTERING —
                                            fast start, soft landing */
transition-timing-function: ease-in; /* best for things LEAVING */

/* ── KEYFRAME ANIMATION — for repeating or multi-step motion ─────────── */‼️‼️
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
.spinner {
    animation: spin 1s linear infinite;
}

@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.modal {
    animation: fade-in 200ms ease-out;
}

/* ‼️ ACCESSIBILITY — always include this.‼️ Motion triggers nausea and migraines
   for some people, and they have told their OS so. */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

## 14. Reading Tailwind

```text
‼️ AI tools generate Tailwind constantly, so being able to READ it matters even
   if you never write it. Tailwind classes are just CSS with short names —
   once you know the pattern, you can translate any of them.

THE NAMING PATTERN

  Most classes are:  <property-abbreviation>-<value>‼️‼️

  The spacing scale is the key: the number is in units of 0.25rem (4px).
    p-1 = 4px    p-2 = 8px    p-4 = 16px    p-6 = 24px    p-8 = 32px
    (so: multiply by 4 to get pixels)‼️
```

```text
─── SPACING ────────────────────────────────────────────────────────────────
  p-4            padding: 1rem
  px-4           padding-left + padding-right
  py-2           padding-top + padding-bottom
  pt-4           padding-top       (also pr- pb- pl-)
  m-4            margin: 1rem
  mt-8           margin-top: 2rem  (also mr- mb- ml- mx- my-)
  mx-auto        margin-left: auto; margin-right: auto   ← centres a block
  gap-4          gap: 1rem         ← space between flex/grid children
  space-y-4      vertical space between children (older alternative to gap)

─── LAYOUT / DISPLAY ───────────────────────────────────────────────────────
  flex           display: flex
  grid           display: grid
  block          display: block
  inline-block   display: inline-block
  hidden         display: none‼️

─── FLEXBOX ────────────────────────────────────────────────────────────────
  flex-col          flex-direction: column      (flex-row is the default)
  flex-wrap         flex-wrap: wrap
  items-center      align-items: center         ← vertical, in a row
  items-start       align-items: flex-start
  justify-center    justify-content: center     ← horizontal, in a row
  justify-between   justify-content: space-between   ← logo left, nav right
  flex-1            flex: 1                     ← grow to fill space
  shrink-0          flex-shrink: 0              ← never get squashed

─── GRID ───────────────────────────────────────────────────────────────────
  grid-cols-3       three equal columns
  grid-cols-[200px_1fr]   custom columns (underscore = space)
  col-span-2        span two columns
  row-span-2        span two rows

─── SIZING ─────────────────────────────────────────────────────────────────
  w-full         width: 100%
  w-1/2          width: 50%
  w-64           width: 16rem        (same ×4 scale as spacing)
  h-screen       height: 100vh‼️
  min-h-screen   min-height: 100vh
  max-w-md       max-width: 28rem    ← sm/md/lg/xl/2xl... up to 7xl‼️
  size-10        width AND height: 2.5rem‼️

─── COLOURS ────────────────────────────────────────────────────────────────
  bg-blue-500       background colour
  text-gray-700     text colour
  border-gray-200   border colour
  ‼️ The number is the SHADE: 50 = lightest, 900 = darkest.‼️‼️
     So bg-blue-600 is a darker version of bg-blue-500 — which is why hover
     states are almost always "the same colour, one step up".

─── TYPOGRAPHY ─────────────────────────────────────────────────────────────
  text-sm        font-size: 0.875rem   ← xs / sm / base / lg / xl / 2xl ...
  text-base      font-size: 1rem
  text-lg        font-size: 1.125rem
  text-2xl       font-size: 1.5rem
  font-medium    font-weight: 500‼️
  font-bold      font-weight: 700
  text-center    text-align: center
  leading-tight  line-height: 1.25‼️
  truncate       one line + ellipsis (the three-property trick from §11)‼️

─── BORDERS & EFFECTS ──────────────────────────────────────────────────────
  border         border-width: 1px‼️
  border-2       border-width: 2px
  rounded-lg     border-radius: 0.5rem   ← sm / md / lg / xl / 2xl
  rounded-full   border-radius: 9999px   ← pill or circle
  shadow-sm      a subtle box-shadow     ← sm / md / lg / xl / 2xl
  opacity-50     opacity: 0.5

─── POSITIONING ────────────────────────────────────────────────────────────
  relative       position: relative
  absolute       position: absolute
  fixed          position: fixed
  sticky top-0   position: sticky; top: 0
  z-10           z-index: 10
  inset-0        top/right/bottom/left all 0  ← fills the parent‼️

─── STATE PREFIXES ─────────────────────────────────────────────────────────
  hover:bg-blue-600       on mouse over
  focus:ring-2            on focus
  disabled:opacity-50     when disabled
  group-hover:text-white  when a parent marked `group` is hovered‼️
  dark:bg-gray-900        in dark mode

─── RESPONSIVE PREFIXES ────────────────────────────────────────────────────
  ‼️ MOBILE-FIRST: no prefix = ALL sizes. A prefix means "at that breakpoint
     AND UP". So `flex-col md:flex-row` is a column on phones, a row from
     768px upward.

  sm:   from 640px      lg:   from 1024px      2xl:  from 1536px
  md:   from 768px      xl:   from 1280px

  md:flex          display: flex, from 768px up
  lg:grid-cols-3   three columns, from 1024px up
```

```html
<!-- Putting it together — a typical AI-generated button, translated: -->
<button
    class="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600
               text-white font-medium rounded-lg shadow-sm disabled:opacity-50"
>
    <!-- Which is exactly this CSS:
     display: flex;
     align-items: center;
     gap: 0.5rem;
     padding: 0.5rem 1rem;
     background: #3b82f6;
     color: white;
     font-weight: 500;
     border-radius: 0.5rem;
     box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
     &:hover    { background: #2563eb; }
     &:disabled { opacity: 0.5; }                                          -->
</button>
```

```text
‼️ HOW TO ADJUST AI-GENERATED TAILWIND WITHOUT UNDERSTANDING ALL OF IT:‼️

  "Too cramped"        → increase the p-* or gap-* number (p-2 → p-4)
  "Too much space"     → decrease it
  "Not centred"        → add  items-center  and/or  justify-center  to the
                          flex parent
  "Wrong colour"       → change the number: bg-blue-500 → bg-blue-600 (darker)
  "Corners too sharp"  → rounded → rounded-lg → rounded-xl
  "Text too small"     → text-sm → text-base → text-lg
  "Stacks when it shouldn't on desktop" → add md:flex-row to the flex-col

  Hovering an element in devtools shows the computed CSS for those classes,
  which is the fastest way to confirm what a class you don't recognize does.‼️
```

---

## 15. Debugging CSS

```text
‼️ THE DEVTOOLS WORKFLOW — this is most of the skill. Right-click → Inspect.

  1. THE ELEMENTS PANEL shows the live DOM. Click any element.

  2. THE STYLES PANEL (right side) shows every rule matching it, in priority
     order, with the winning rule at the top.
     ‼️ A rule with a LINE THROUGH IT was overridden by something above it.‼️
     That instantly answers "why isn't my style applying?" — you can see what
     beat it and where that rule lives.

  3. THE COMPUTED TAB shows the final value of every property after the
     cascade. ‼️Use it when you cannot find where a value is coming from —
     expand a property and it names the exact rule that set it.

  4. THE BOX MODEL DIAGRAM (bottom of Styles) shows this element's actual
     content size, padding, border, and margin in pixels.‼️ This is how you
     find an unexpected gap in about five seconds.

  5. EDIT LIVE. Click any value and type a new one. Arrow keys nudge numbers
     up and down. Tick and untick properties. Nothing is saved, so experiment
     freely, then copy what worked into your file.

  6. ‼️THE :hov BUTTON forces :hover / :focus / :active states on, so you can
     inspect a hover style without needing to keep the mouse in place.
```

```css
/* ── THE OUTLINE TRICK — see every box on the page ───────────────────── */
‼️ * {
    outline: 1px solid red;
}
/* Paste into devtools when a layout is mysteriously wrong. Instantly shows
   which element is too wide, overflowing, or not where you think it is.
   ‼️ Use `outline`, not `border` — border adds to the element's size and
   would change the very layout you are trying to diagnose. */

/* ── FIND WHAT IS CAUSING HORIZONTAL SCROLL ──────────────────────────── */
/* An element wider than the screen creates a horizontal scrollbar on mobile.
   Paste this in devtools to highlight the culprit: */
* {
    outline: 1px solid red;
}
body {
    overflow-x: hidden;
} /* ‼️ a temporary diagnostic, NOT the fix —
                                  it hides the symptom and the element is
                                  still too wide */
```

---

## 16. Troubleshooting — "Why Won't This Work?"

```text
‼️ THE SYMPTOM → CAUSE TABLE. Most CSS problems are one of these.

MY STYLE ISN'T APPLYING AT ALL
  - Check devtools: is the rule struck through? Something more specific won.
  - Is the selector right? .card vs #card vs card — and a typo in a class
    name fails silently, with no error anywhere.
  - Is the stylesheet actually loaded? Check the Network tab.‼️
  - In React, is it className and not class?
  - Is there a syntax error EARLIER in the file? One missing } silently kills
    every rule after it.

WIDTH/HEIGHT IS IGNORED
  - The element is display: inline. Inline elements ignore width, height, and
    vertical padding. Use inline-block or block.

MY BOX IS BIGGER THAN THE WIDTH I SET
  - box-sizing. Add the border-box reset from §2.

height: 100% DOES NOTHING
  - A percentage height needs the PARENT to have a defined height. Either give
    the parent a height, or use min-height: 100dvh, or use flex/grid instead.

THINGS WON'T SIT SIDE BY SIDE
  - The parent needs display: flex (or grid). Block elements always stack.‼️

THERE'S A GAP I DIDN'T ADD
  - Margin collapsing (§8) — vertical margins merging or escaping the parent.
  - inline-block whitespace — the newline in your HTML renders as a space.‼️
  - A default margin you forgot: <p>, <h1>, <ul> all have browser margins.‼️
  - Check the box model diagram in devtools to see exactly which layer it is.

MY FLEX ITEM IS SQUASHED / TEXT IS CRUSHED
  - Flex items shrink by default. Add flex-shrink: 0 to the item that should
    keep its size.

FLEXBOX ISN'T CENTRING VERTICALLY
  - The container has no height, so there is no vertical space to centre
    within. Add min-height.‼️

position: sticky ISN'T STICKING
  - You must set an offset: top: 0 (or bottom/left/right). No offset, no stick.‼️‼️
  - An ancestor has overflow: hidden / auto / scroll — that breaks sticky.‼️
  - The parent is not tall enough for there to be anywhere to stick across.

z-index: 9999 STILL DOESN'T SHOW ON TOP
  - z-index needs position (relative/absolute/fixed/sticky) to do anything.
  - Stacking context: a child cannot escape its parent's layer. Raise the
    PARENT's z-index, or move the element higher in the DOM (‼️a modal usually
    belongs at the end of <body>, via a portal in React).

MY MEDIA QUERIES DON'T WORK ON MOBILE
  - Missing <meta name="viewport"> in your HTML head (§12).

THE PAGE SCROLLS SIDEWAYS ON MOBILE
  - Something is wider than the screen: a fixed width, an unwrapped long
    string, a negative margin, or 100vw (which includes the scrollbar width).
  - Use the outline trick in §15 to find it. ‼️Prefer width: 100% over 100vw.

MY HOVER ANIMATION SNAPS BACK INSTANTLY
  - The transition is declared on :hover instead of on the base element.

MY IMAGE IS STRETCHED OR SQUASHED‼️
  - Set object-fit: cover (fills the box, crops the overflow) or
    object-fit: contain (fits entirely, may letterbox).
```

---

## 17. Cheat Sheet

```css
/* ── ALWAYS START WITH THIS ──────────────────────────────────────────── */
*,
*::before,
*::after {
    box-sizing: border-box;
}
body {
    margin: 0;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
}

/* ── LAYOUT ──────────────────────────────────────────────────────────── */
display: flex; /* one row or column of items */
display: grid; /* two-dimensional layout */
gap: 1rem; /* space between children — prefer over margin */‼️

/* Flex container */
flex-direction: row | column;
justify-content: flex-start | center | space-between; /* along the axis */
align-items: stretch | center | flex-start; /* across the axis */
flex-wrap: wrap;

/* Flex item */
flex: 1; /* grow to fill */
flex: 0 0 250px; /* fixed size, never grow or shrink */‼️
flex-shrink: 0; /* don't let this be squashed */
margin-left: auto; /* push this and everything after it right */

/* Grid */
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* responsive cards */
grid-template-columns: 250px 1fr; /* sidebar + main */
grid-column: 1 / -1; /* full width */

/* ── CENTRING ────────────────────────────────────────────────────────── */
margin: 0 auto; /* horizontal, block element */
display: flex;
justify-content: center;
align-items: center; /* both */
display: grid;
place-items: center; /* both, shorter */

/* ── SIZING ──────────────────────────────────────────────────────────── */
width: min(100% - 2rem, 1200px); /* responsive container with side padding */
max-width: 65ch; /* readable paragraph width */
min-height: 100dvh; /* full screen, mobile-safe */
font-size: clamp(1rem, 2.5vw, 2rem); /* fluid, bounded */

/* ── POSITION ────────────────────────────────────────────────────────── */
position: relative; /* anchor for absolutely positioned children */
position: absolute; /* placed against the nearest positioned ancestor */
position: fixed; /* pinned to the viewport */
position: sticky;
top: 0; /* the offset is required */

/* ── VISUAL ──────────────────────────────────────────────────────────── */
border-radius: 8px;
box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
transition:
    background 150ms ease,
    transform 150ms ease;
transform: translateY(-2px); /* animate transform/opacity, not width/top */

/* ── RESPONSIVE (mobile-first) ───────────────────────────────────────── */
@media (min-width: 768px) {
} /* tablet and up */
@media (min-width: 1024px) {
} /* desktop and up */
@media (prefers-reduced-motion: reduce) {
} /* respect motion preferences */‼️

/* ── UNITS ───────────────────────────────────────────────────────────── */
/* rem    sizes, spacing (1rem = 16px)‼️    px   borders, radii, shadows    */
/* %      relative to parent                dvh  full screen height         */
/* fr     grid fraction                     ch   character width (text)     */
```

---

## Related Files

- [CSS-DEEP.md](CSS-DEEP.md) — cascade internals, specificity, subgrid, CSS architecture, Tailwind in depth
- [CSS-HTML-LIVE-CODING.md](CSS-HTML-LIVE-CODING.md) — building components from scratch under interview conditions
- [ACCESSIBILITY-MED-DEEP.md](../3-low-priority/ACCESSIBILITY-MED-DEEP.md) — focus states, contrast, reduced motion
- [FRONTEND-ARCHITECTURE-DEEP.md](../1-high-priority/FRONTEND-ARCHITECTURE-DEEP.md) — where styles live in a large app
