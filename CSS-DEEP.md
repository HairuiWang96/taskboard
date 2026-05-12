# CSS — Senior Developer Deep Reference

> Comprehensive guide covering the cascade, layout systems, performance, architecture, and interview topics.

---

## Table of Contents

1. [The Cascade & Specificity](#1-the-cascade--specificity)
2. [Box Model & Sizing](#2-box-model--sizing)
3. [Flexbox](#3-flexbox)
4. [CSS Grid](#4-css-grid)
5. [Positioning](#5-positioning)
6. [Responsive Design](#6-responsive-design)
7. [Custom Properties (CSS Variables)](#7-custom-properties-css-variables)
8. [Animations & Transitions](#8-animations--transitions)
9. [Typography](#9-typography)
10. [CSS Architecture](#10-css-architecture)
11. [Tailwind CSS — Deep Dive](#11-tailwind-css--deep-dive)
12. [Performance](#12-performance)
13. [Modern CSS Features](#13-modern-css-features)
14. [Common Interview Questions](#14-common-interview-questions)

---

## 1. The Cascade & Specificity

### How the browser decides which rule wins

```text
Priority order (highest → lowest):
  1. !important declarations
  2. Inline styles          style="color: red"
  3. ID selectors           #header
  4. Class, attribute, pseudo-class    .btn, [type="text"], :hover
  5. Element, pseudo-element           div, p, ::before
  6. Universal selector *  (specificity = 0)

Specificity is calculated as (A, B, C):
  A = number of ID selectors
  B = number of class/attribute/pseudo-class selectors
  C = number of element/pseudo-element selectors

Example:
  #nav .link:hover    → (1, 2, 0) = 120
  div.container p     → (0, 1, 2) = 012
  Higher number wins: #nav .link:hover wins
```

```css
/* !important — avoid, hard to override, signals design problems */
.btn { color: red !important; } /* only ever use in utility classes */

/* The only clean way to override !important: another !important with higher specificity */

/* Inheritance — some properties inherit by default (font, color, line-height) */
/* Others do not (margin, padding, border, background) */
body { font-family: sans-serif; } /* all children inherit this */

/* Force or stop inheritance */
.child { color: inherit; }    /* force inherit even if property doesn't by default */
.child { color: initial; }    /* reset to browser default */
.child { color: unset; }      /* inherit if inheritable, else initial */
.child { color: revert; }     /* reset to browser's user-agent stylesheet */
```

### Cascade layers (modern CSS)

```css
/* @layer lets you control cascade order explicitly — no specificity wars */
@layer base, components, utilities;

@layer base {
  a { color: blue; }
}

@layer utilities {
  .text-red { color: red; } /* wins over base — later layer wins */
}

/* Styles outside any layer beat all layer styles */
a { color: green; } /* this beats both layers above */
```

---

## 2. Box Model & Sizing

```css
/* Default: box-sizing: content-box */
/* width = content only — padding and border ADD to total size */
.box {
  width: 200px;
  padding: 20px;
  border: 2px solid;
  /* actual rendered width: 200 + 40 + 4 = 244px */
}

/* border-box: width INCLUDES padding and border */
/* This is what every project should use */
*, *::before, *::after {
  box-sizing: border-box;
}
.box {
  width: 200px;
  padding: 20px;
  border: 2px solid;
  /* actual rendered width: 200px — padding/border eat into content */
}
```

### Margin collapsing

```css
/* Vertical margins between adjacent elements COLLAPSE (take the larger) */
/* This only happens with block elements in normal flow */
.a { margin-bottom: 20px; }
.b { margin-top: 30px; }
/* Gap between them: 30px (not 50px) */

/* Margin collapse does NOT happen: */
/* - Inside flex or grid containers */
/* - Elements with overflow other than visible */
/* - Elements with padding or border between them */
/* - Float elements */

/* Classic bug: parent's margin-top collapses with first child's */
.parent { /* no border, no padding */ }
.child { margin-top: 40px; } /* parent moves down 40px, not child */
/* Fix: add any padding or border to parent, or use overflow: hidden */
```

### Intrinsic sizing

```css
/* width: auto — fills available space (block default) */
/* width: min-content — shrinks to smallest content without breaking */
/* width: max-content — expands to fit all content in one line */
/* width: fit-content — like max-content but capped at available space */

.card {
  width: fit-content; /* as wide as its content needs, no wider than parent */
}

/* clamp(min, preferred, max) — responsive without media queries */
.text {
  font-size: clamp(1rem, 2.5vw, 2rem);
  /* min: 1rem, preferred: 2.5% viewport width, max: 2rem */
}

.container {
  width: clamp(320px, 90%, 1200px);
  margin-inline: auto;
}
```

---

## 3. Flexbox

```css
/* Flexbox = one-dimensional layout (row OR column) */

.container {
  display: flex;
  flex-direction: row;          /* row | row-reverse | column | column-reverse */
  flex-wrap: wrap;              /* nowrap | wrap | wrap-reverse */
  justify-content: space-between; /* main axis alignment */
  align-items: center;           /* cross axis alignment */
  align-content: flex-start;     /* cross axis alignment when wrapped (multiple lines) */
  gap: 16px;                     /* gap: row-gap column-gap */
}

/* justify-content values:
   flex-start | flex-end | center | space-between | space-around | space-evenly */

/* align-items values:
   flex-start | flex-end | center | baseline | stretch (default) */
```

### Flex items

```css
.item {
  flex-grow: 1;    /* how much to grow relative to siblings (0 = don't grow) */
  flex-shrink: 1;  /* how much to shrink (0 = don't shrink) */
  flex-basis: auto; /* initial size before grow/shrink (like width in row direction) */

  /* Shorthand: flex: grow shrink basis */
  flex: 1;         /* flex: 1 1 0% — item grows to fill space, basis is 0 */
  flex: auto;      /* flex: 1 1 auto — grows/shrinks based on content size */
  flex: none;      /* flex: 0 0 auto — rigid, doesn't grow or shrink */

  align-self: flex-end; /* override container's align-items for this one item */
  order: -1;            /* change visual order without changing DOM order */
}

/* Common pattern: sidebar + main */
.layout { display: flex; }
.sidebar { flex: 0 0 250px; } /* fixed width, won't grow or shrink */
.main { flex: 1; }             /* takes all remaining space */

/* Center anything */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### Flex vs Grid — when to use which

```text
Flexbox:
  - One-dimensional: a row of buttons, a nav bar, a card's internal layout
  - Content-driven: you don't know how many items there are
  - Let items naturally determine their size

Grid:
  - Two-dimensional: page layout, image gallery, dashboard
  - Layout-driven: the grid defines the structure, items fill it
  - Precise placement of items in rows AND columns
```

---

## 4. CSS Grid

```css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr 1fr; /* 3 columns: fixed, flexible, flexible */
  grid-template-rows: auto;             /* rows size to content */
  gap: 24px;                            /* gap between cells */
}

/* fr = fraction of remaining space */
/* repeat() saves repetition */
grid-template-columns: repeat(3, 1fr);      /* 3 equal columns */
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* responsive! */
/* auto-fit: as many columns as fit, with min 200px each */
/* auto-fill: same but keeps empty columns (doesn't collapse them) */
```

### Placing items

```css
.item {
  grid-column: 1 / 3;    /* span from line 1 to line 3 (2 columns wide) */
  grid-column: 1 / -1;   /* span full width (-1 = last line) */
  grid-column: span 2;   /* span 2 columns from current position */
  grid-row: 2 / 4;       /* span 2 rows */
}
```

### Named areas

```css
.layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

### Subgrid (modern, powerful)

```css
/* Problem: child grid doesn't align with parent grid columns */
/* Subgrid: child inherits parent's tracks */
.parent {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.child {
  grid-column: span 3;
  display: grid;
  grid-template-columns: subgrid; /* child items now align with parent columns */
}
```

---

## 5. Positioning

```css
/* position: static — default, normal flow */
/* position: relative — offset from its normal position, still in flow */
/* position: absolute — removed from flow, positioned relative to nearest positioned ancestor */
/* position: fixed — relative to viewport, stays during scroll */
/* position: sticky — relative until scroll threshold, then fixed */

.parent { position: relative; } /* creates positioning context for absolute children */

.tooltip {
  position: absolute;
  top: 100%;   /* below the parent */
  left: 50%;   /* center */
  transform: translateX(-50%); /* shift back half its own width */
}

/* Sticky nav */
.nav {
  position: sticky;
  top: 0;      /* sticks when it reaches 0px from top of viewport */
  z-index: 100;
}

/* z-index only works on positioned elements (not static) */
/* z-index creates stacking contexts */
/* Stacking context: element with opacity < 1, transform, filter, etc. */
/* All children are rendered within their parent's stacking context */
```

---

## 6. Responsive Design

### Mobile-first approach

```css
/* Write base styles for mobile, add complexity for larger screens */
/* This is how Tailwind works too */

.card {
  padding: 16px;         /* mobile */
}

@media (min-width: 768px) {
  .card {
    padding: 32px;       /* tablet and up */
  }
}

@media (min-width: 1024px) {
  .card {
    padding: 48px;       /* desktop and up */
  }
}

/* Desktop-first is the opposite — start large, scale down */
/* Mobile-first is preferred: progressive enhancement */
```

### Media query features

```css
/* Width breakpoints */
@media (min-width: 768px) { }          /* tablet up */
@media (max-width: 767px) { }          /* mobile only */
@media (768px <= width < 1024px) { }   /* range syntax (modern) */

/* Orientation */
@media (orientation: landscape) { }

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root { --bg: #0a0a0a; --fg: #fafafa; }
}

/* Reduced motion — respect accessibility */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* High DPI screens — serve 2x images */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .logo { background-image: url(logo@2x.png); }
}

/* Container queries (modern — respond to parent, not viewport) */
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card { flex-direction: row; }
}
```

### Responsive images

```html
<!-- srcset: browser picks best resolution -->
<img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="Description"
/>

<!-- picture: art direction (different crops at different sizes) -->
<picture>
  <source media="(min-width: 800px)" srcset="wide.jpg">
  <source media="(min-width: 400px)" srcset="medium.jpg">
  <img src="narrow.jpg" alt="Description">
</picture>
```

---

## 7. Custom Properties (CSS Variables)

```css
/* Defined on :root — available globally */
:root {
  --color-primary: #3b82f6;
  --color-bg: #ffffff;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --radius: 6px;
  --font-body: 'Inter', sans-serif;
}

.btn {
  background: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius);
}

/* Fallback value */
color: var(--color-accent, #6366f1); /* uses #6366f1 if --color-accent not defined */

/* Variables are scoped — override per component */
.card {
  --radius: 12px; /* only applies inside .card */
}

/* Dark mode with variables — just swap the values */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0a0a0a;
    --color-primary: #60a5fa;
  }
}

/* Toggle dark mode with a class */
[data-theme="dark"] {
  --color-bg: #0a0a0a;
  --color-fg: #f5f5f5;
}

/* Variables are live — change with JS */
document.documentElement.style.setProperty('--color-primary', '#ff0000');

/* Variables DON'T work inside media queries (they're not design tokens at that level) */
/* This does NOT work: */
:root { --breakpoint-md: 768px; }
@media (min-width: var(--breakpoint-md)) { } /* ✗ invalid */
```

---

## 8. Animations & Transitions

### Transitions

```css
/* Smooth state changes */
.btn {
  background: blue;
  transition: background 200ms ease, transform 150ms ease;
  /* property duration timing-function delay */
}

.btn:hover {
  background: darkblue;
  transform: translateY(-2px);
}

/* Timing functions */
/* ease: slow start, fast middle, slow end (default) */
/* linear: constant speed */
/* ease-in: slow start */
/* ease-out: slow end (best for elements leaving screen) */
/* ease-in-out: slow start and end */
/* cubic-bezier(x1, y1, x2, y2): custom — use dev tools to design */

/* Only animate: transform, opacity */
/* These are composited by GPU — don't trigger layout or paint */
/* Avoid animating: width, height, margin, top, left — cause reflow */
```

### Keyframe animations

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeInUp 300ms ease-out forwards;
  /* name duration timing fill-mode */
  /* forwards: keep final state after animation ends */
}

/* More control */
.spinner {
  animation:
    spin 1s linear infinite,        /* multiple animations */
    pulse 2s ease-in-out 3;         /* play 3 times */
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Animation events in JS */
element.addEventListener('animationend', () => element.remove());

/* will-change: hint to browser to create a compositing layer */
.animated { will-change: transform; }
/* Warning: don't overuse — each layer consumes GPU memory */
/* Only add right before animation, remove after */
```

---

## 9. Typography

```css
/* System font stack — fast, no network request */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
               Helvetica, Arial, sans-serif;
}

/* Loading custom fonts — performance matters */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2'); /* woff2 is smallest */
  font-display: swap;   /* show fallback font immediately, swap when loaded */
  font-weight: 400 700; /* variable font: one file covers 400-700 */
}

/* Fluid typography with clamp */
h1 { font-size: clamp(1.5rem, 4vw, 3rem); }
p  { font-size: clamp(1rem, 2vw, 1.25rem); }

/* Line height — unitless values are relative to the element's font-size */
p { line-height: 1.6; }   /* 1.6 × font-size — scales with font, no unit needed */

/* Spacing */
letter-spacing: 0.05em;  /* use em, scales with font-size */
word-spacing: 0.1em;

/* Text rendering */
-webkit-font-smoothing: antialiased;   /* macOS: crisper text */
text-rendering: optimizeLegibility;    /* kerning, ligatures (performance cost) */

/* Truncation */
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Multi-line truncation */
.clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

---

## 10. CSS Architecture

### The problems CSS architecture solves

```text
Without architecture:
  - Specificity wars (need !important to override)
  - Side effects (changing .btn breaks something unexpected)
  - Dead code (no one knows what's safe to delete)
  - Name collisions (two .header rules fight)
```

### BEM (Block Element Modifier)

```css
/* Block: standalone component */
.card { }

/* Element: part of the block, can't exist alone */
.card__title { }
.card__body { }
.card__footer { }

/* Modifier: variation of block or element */
.card--featured { }
.card__title--large { }

/* BEM avoids nesting — all selectors have specificity (0,1,0) */
/* Easy to override, no cascade fights */
```

### CSS Modules (used with React/Vite)

```css
/* Button.module.css */
.button { padding: 8px 16px; }
.primary { background: blue; }
```

```tsx
import styles from './Button.module.css';
// Compiled to: .Button_button__3xKj { ... }
// Class names are locally scoped — no global collisions
<button className={`${styles.button} ${styles.primary}`}>Click</button>
```

### Utility-first (Tailwind approach)

```text
Pros:
  - No naming things
  - No dead CSS (only classes in HTML get included in build)
  - Constraints (spacing scale, color palette) prevent inconsistency
  - Co-located with markup — easy to understand

Cons:
  - Verbose HTML
  - Hard to extract shared patterns without @apply or components
  - Learning curve for the class names

@apply — extract repeated utilities into a class:
  .btn-primary { @apply px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600; }
  Use sparingly — defeats the purpose if overused
```

---

## 11. Tailwind CSS — Deep Dive

### The config

```ts
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx,html}'],  // purge unused classes
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      spacing: {
        '18': '4.5rem',  // adds gap-18, p-18, etc.
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),  // .prose for markdown content
    require('@tailwindcss/forms'),       // better form defaults
  ],
};
```

### Variants and modifiers

```html
<!-- Responsive -->
<div class="p-4 md:p-8 lg:p-12">

<!-- State -->
<button class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 focus:ring-2">

<!-- Dark mode -->
<div class="bg-white dark:bg-gray-900 text-black dark:text-white">

<!-- Group hover — parent hover affects children -->
<div class="group">
  <p class="opacity-0 group-hover:opacity-100 transition">Shows on parent hover</p>
</div>

<!-- Peer — sibling state -->
<input class="peer" type="checkbox" />
<label class="hidden peer-checked:block">Shown when checkbox checked</label>

<!-- Arbitrary values — escape hatch -->
<div class="top-[117px] bg-[#1da1f2] text-[clamp(1rem,2vw,2rem)]">

<!-- Arbitrary properties -->
<div class="[mask-image:linear-gradient(to_bottom,black,transparent)]">
```

### JIT (Just-in-Time) engine

```text
Tailwind v3+ uses JIT by default.
Scans your content files on-demand and generates ONLY the classes you use.
Build output: < 10KB gzipped for most apps (vs 3MB for full CSS).
Enables arbitrary values: top-[117px] works without config.
```

---

## 12. Performance

### Critical rendering path

```text
1. Browser parses HTML → builds DOM
2. Encounters CSS → builds CSSOM
3. DOM + CSSOM → Render Tree (only visible elements)
4. Layout: calculate size and position of every element
5. Paint: fill in pixels
6. Composite: combine layers, send to GPU

Optimizations:
  - Minimize CSS file size (remove unused, minify, compress)
  - Inline critical CSS (above-the-fold styles) in <head>
  - Load non-critical CSS asynchronously
  - Avoid CSS that triggers layout (width, height, margin) in animations
  - Avoid @import in CSS (blocks rendering, sequential loading)
```

### What triggers what

```text
Layout (most expensive — recalculates ALL element positions):
  width, height, margin, padding, border, top, left, right, bottom,
  font-size, line-height, display, position, float

Paint (re-fills pixels — expensive):
  color, background, box-shadow, border-color, outline, visibility

Composite only (cheapest — GPU handles it):
  transform, opacity

Rule: only animate transform and opacity in performance-critical animations.
```

### Reducing layout thrash

```ts
// Layout thrash: alternating reads and writes force multiple reflows
// ✗ Bad — forces layout twice per element
elements.forEach(el => {
  const height = el.offsetHeight;       // READ — forces layout
  el.style.height = height + 10 + 'px'; // WRITE — invalidates layout
});

// ✓ Good — batch reads then batch writes
const heights = elements.map(el => el.offsetHeight); // all READs first
elements.forEach((el, i) => el.style.height = heights[i] + 10 + 'px'); // then WRITEs

// Even better: use CSS classes instead of inline styles
// requestAnimationFrame: defer write to next frame
requestAnimationFrame(() => {
  elements.forEach((el, i) => el.classList.add('expanded'));
});
```

### Layer promotion

```css
/* Force a compositing layer — GPU handles this element separately */
.animated {
  transform: translateZ(0); /* old trick */
  will-change: transform;   /* modern, preferred */
}

/* Only do this for elements that ARE animating */
/* Each layer uses GPU memory — too many layers = worse performance */
```

---

## 13. Modern CSS Features

### Logical properties (writing-mode aware)

```css
/* Physical → Logical */
margin-left   → margin-inline-start   /* works in RTL languages too */
margin-right  → margin-inline-end
margin-top    → margin-block-start
padding-left  → padding-inline-start

/* Shorthand */
margin-inline: auto;    /* centers horizontally in all writing modes */
padding-block: 16px;    /* top and bottom padding */
inset: 0;               /* top: 0; right: 0; bottom: 0; left: 0 */
inset-inline: 20px;     /* left and right */
```

### :is(), :where(), :has()

```css
/* :is() — matches any of the selectors, takes highest specificity */
:is(h1, h2, h3) { color: var(--heading-color); }

/* vs writing individually: */
h1, h2, h3 { color: var(--heading-color); } /* same result */

/* :where() — same as :is() but specificity is always 0 */
:where(h1, h2, h3) { color: red; } /* easy to override */

/* :has() — parent selector! (CSS finally has one) */
/* Select .card that contains an img */
.card:has(img) { padding: 0; }

/* Select label whose input is checked */
label:has(input:checked) { font-weight: bold; }

/* Select form that has an invalid input */
form:has(:invalid) .submit-btn { opacity: 0.5; }
```

### @layer, @scope, nesting

```css
/* CSS Nesting (native — no preprocessor needed) */
.card {
  padding: 16px;

  & .title {           /* & = parent selector (.card .title) */
    font-size: 1.5rem;
  }

  &:hover {            /* .card:hover */
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  @media (min-width: 768px) {
    padding: 32px;     /* media query nested inside rule */
  }
}

/* @scope — style children without side effects */
@scope (.card) {
  .title { color: var(--card-title-color); } /* only affects .title inside .card */
}
```

### Color functions

```css
/* oklch — perceptually uniform color space (best for design systems) */
:root {
  --primary: oklch(60% 0.2 240);  /* lightness%, chroma, hue */
}

/* Generate tints/shades easily */
--primary-light: oklch(80% 0.15 240);
--primary-dark:  oklch(40% 0.25 240);

/* color-mix() */
.blended {
  background: color-mix(in oklch, var(--primary) 30%, white);
}

/* light-dark() — automatic dark mode */
.text {
  color: light-dark(#111, #eee);  /* first = light, second = dark */
}
```

---

## 14. Common Interview Questions

### "Explain the box model."

> Every element is a box: content → padding → border → margin. The default `box-sizing: content-box` means `width` applies to content only, so padding and border add to the total size. `border-box` makes `width` include padding and border, which is what every project should use globally.

### "What is specificity and how do you avoid fighting it?"

> Specificity determines which CSS rule wins: inline styles beat IDs, which beat classes, which beat elements. The key to not fighting it is keeping specificity flat — BEM classes are all `(0,1,0)`, utility classes are all `(0,1,0)`, easy to override. Avoid IDs in CSS. Avoid `!important` except in utilities. Use cascade layers (`@layer`) in modern CSS to control ordering without specificity at all.

### "What is the difference between `display: none`, `visibility: hidden`, and `opacity: 0`?"

```text
display: none     — removed from layout entirely, no space taken, not accessible
visibility: hidden — invisible but space is preserved, not accessible to screen readers
opacity: 0        — invisible but space preserved, STILL accessible and clickable

For animations:
  Can't transition display: none → block (no in-between state)
  Can transition opacity: 0 → 1 (smooth)
  Can transition visibility: hidden → visible combined with opacity for accessible fade
```

### "How would you implement a sticky header that shrinks on scroll?"

```js
// CSS handles the sticky positioning
// JS handles the class toggle for shrinking
const header = document.querySelector('header');
const observer = new IntersectionObserver(
  ([entry]) => header.classList.toggle('shrunk', !entry.isIntersecting),
  { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
);
observer.observe(document.querySelector('.scroll-sentinel')); // invisible div at top
```

```css
header { transition: padding 200ms ease, font-size 200ms ease; }
header.shrunk { padding: 8px 24px; font-size: 0.875rem; }
```

### "Explain how CSS Grid's `auto-fit` vs `auto-fill` differ."

```css
/* auto-fit: collapses empty tracks — items stretch to fill space */
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
/* 3 items in a wide container → 3 wide columns */

/* auto-fill: keeps empty tracks — items don't stretch beyond their natural size */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
/* 3 items in a wide container → 3 items at min 200px + empty columns on right */

/* In practice: auto-fit is usually what you want for responsive grids */
```

### "What causes layout shifts (CLS) and how do you prevent them?"

```text
CLS (Cumulative Layout Shift) — content jumps as page loads

Causes:
  - Images without width/height attributes (browser doesn't reserve space)
  - Web fonts causing text reflow (FOIT/FOUT)
  - Ads or embeds inserted without reserved space
  - Dynamic content injected above existing content

Fixes:
  - Always set width and height on <img> (or use aspect-ratio)
  - font-display: optional (never shows fallback) or swap (shows fallback, swaps)
  - Reserve space for ads with min-height
  - Insert dynamic content below the fold or use skeleton screens
```

### "How does `transform` differ from changing `top`/`left`?"

```text
top/left: triggers layout → paint → composite on every frame (expensive)
           moves the element in the document flow

transform: triggers composite only (GPU, doesn't affect other elements)
           doesn't trigger layout, doesn't affect surrounding elements
           much better for animation performance

Rule: for animations, always use transform: translate() instead of top/left
```
