# CSS / HTML Live Coding

Frontend roles often include a CSS round: build a layout from scratch, fix broken flex/grid, implement a UI component without a library. These questions test whether you actually understand the cascade and layout model, or just rely on a framework to hide it.

---

## What Companies Actually Test

- Flexbox layout (most common)
- CSS Grid layout
- Responsive design without a framework
- Centring (horizontal, vertical, both)
- Common UI components from scratch: modal, navbar, card, tooltip
- Fixing broken layouts (spot the bug)
- CSS specificity / the cascade
- Pseudo-elements and pseudo-classes
- CSS custom properties (variables)
- Animations and transitions

---

## Flexbox — The Essentials

```css
/* Container properties */
.container {
  display: flex;
  flex-direction: row;          /* row | column | row-reverse | column-reverse */
  justify-content: space-between; /* main axis: flex-start | center | space-between | space-around | space-evenly */
  align-items: center;          /* cross axis: flex-start | center | flex-end | stretch | baseline */
  align-content: flex-start;   /* multiple rows: like justify-content but for cross axis */
  flex-wrap: wrap;              /* nowrap | wrap | wrap-reverse */
  gap: 16px;                   /* gap between items (replaces margin hacks) */
}

/* Item properties */
.item {
  flex: 1;           /* shorthand for flex-grow: 1, flex-shrink: 1, flex-basis: 0% */
  flex-grow: 1;      /* how much item grows relative to siblings */
  flex-shrink: 0;    /* 0 = don't shrink, 1 = can shrink */
  flex-basis: 200px; /* initial size before grow/shrink */
  align-self: flex-end; /* override container's align-items for this item */
  order: 2;          /* visual order, doesn't affect DOM */
}
```

### Classic Flexbox pattern: navigation bar
```html
<nav class="navbar">
  <div class="logo">Brand</div>
  <ul class="nav-links">
    <li><a href="#">Home</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
  <button class="cta">Sign up</button>
</nav>
```

```css
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.nav-links {
  display: flex;
  list-style: none;
  gap: 24px;
  margin: 0;
  padding: 0;
}

.nav-links a {
  text-decoration: none;
  color: #374151;
}
```

---

## CSS Grid — The Essentials

```css
/* Container */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);   /* 3 equal columns */
  grid-template-columns: 200px 1fr 1fr;    /* fixed + flexible */
  grid-template-rows: auto 1fr auto;       /* header, content, footer */
  gap: 16px;                               /* row and column gap */
  grid-template-areas:
    "header header header"
    "sidebar content content"
    "footer footer footer";
}

/* Item placement */
.item {
  grid-column: 1 / 3;        /* span from line 1 to line 3 */
  grid-column: 1 / span 2;   /* start at 1, span 2 columns */
  grid-row: 2 / 4;
  grid-area: header;         /* use named area */
}
```

### Classic Grid pattern: page layout
```css
.page {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 240px 1fr;
  grid-template-rows: 64px 1fr 48px;
  min-height: 100vh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

### Responsive grid without media queries
```css
/* Auto-fill: as many columns as fit, min 200px each */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

---

## Centring (Every Way)

```css
/* Flexbox — most common, works for most cases */
.center-flex {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Grid — even simpler */
.center-grid {
  display: grid;
  place-items: center;
}

/* Absolute positioning — for modals, overlays */
.center-absolute {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Horizontal only — text or block */
.center-horizontal {
  margin: 0 auto;  /* block element with known width */
  text-align: center; /* inline content */
}
```

---

## Common UI Components from Scratch

### Modal / Dialog
```html
<div class="modal-overlay">
  <div class="modal">
    <button class="modal-close" aria-label="Close">×</button>
    <h2>Title</h2>
    <p>Content here.</p>
    <div class="modal-actions">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

```css
.modal-overlay {
  position: fixed;
  inset: 0;                    /* shorthand for top/right/bottom/left: 0 */
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  width: min(480px, 90vw);     /* responsive: 480px or 90% of viewport */
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
```

### Tooltip
```html
<div class="tooltip-wrapper">
  Hover me
  <span class="tooltip">This is the tooltip text</span>
</div>
```

```css
.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: absolute;
  bottom: calc(100% + 8px);   /* above the element, 8px gap */
  left: 50%;
  transform: translateX(-50%);
  background: #111;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}

/* Arrow */
.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #111;
}

.tooltip-wrapper:hover .tooltip {
  opacity: 1;
}
```

### Card with hover effect
```css
.card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  transition: box-shadow 0.2s, transform 0.2s;
  cursor: pointer;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}
```

### Sticky header
```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
```

### Responsive image that fills container
```css
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Object-fit for fixed-size containers */
.image-container {
  width: 200px;
  height: 200px;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;     /* cover | contain | fill | none */
  object-position: center;
}
```

---

## Responsive Design Patterns

```css
/* Mobile-first approach (recommended) */
.container {
  padding: 16px;
}

@media (min-width: 768px) {
  .container {
    padding: 24px;
    max-width: 768px;
    margin: 0 auto;
  }
}

@media (min-width: 1200px) {
  .container {
    max-width: 1200px;
    padding: 32px;
  }
}

/* Common breakpoints */
/* 480px  — large phones */
/* 768px  — tablets */
/* 1024px — small laptops */
/* 1280px — desktop */
/* 1536px — large desktop */
```

### Stack on mobile, row on desktop
```css
.split {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .split {
    flex-direction: row;
  }
}
```

---

## CSS Specificity

When two rules conflict, the more specific one wins.

Specificity is calculated as (ID, class/attribute/pseudo-class, element/pseudo-element):

```
Inline style:          1-0-0-0  (highest)
#id selector:          0-1-0-0
.class, [attr], :hover 0-0-1-0
div, p, span           0-0-0-1
* universal selector:  0-0-0-0
```

```css
/* Specificity: 0-1-0-0 */
#header { color: red; }

/* Specificity: 0-0-1-0 — LOSES to #header even if later in file */
.header { color: blue; }

/* Specificity: 0-1-1-0 — wins over #header alone */
#header.active { color: green; }
```

**`!important` overrides all specificity. Avoid it — use it only to override third-party styles you can't touch.**

---

## CSS Custom Properties (Variables)

```css
:root {
  --color-primary: #3b82f6;
  --color-text: #111827;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --border-radius: 6px;
}

.button {
  background: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  color: #fff;
}

/* Override for dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #60a5fa;
    --color-text: #f9fafb;
  }
}
```

---

## CSS Animations

```css
/* Transition (state change) */
.button {
  background: #3b82f6;
  transition: background 0.2s ease, transform 0.1s ease;
}

.button:hover {
  background: #2563eb;
  transform: scale(1.02);
}

/* Keyframe animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeIn 0.3s ease forwards;
}

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
```

---

## Pseudo-elements

```css
/* ::before and ::after add virtual elements */
.card::before {
  content: '';      /* required — can be empty string */
  display: block;
  height: 4px;
  background: #3b82f6;
  border-radius: 4px 4px 0 0;
}

/* Common use: clearfix (less needed with flexbox/grid) */
.clearfix::after {
  content: '';
  display: table;
  clear: both;
}

/* Styling the first letter */
p::first-letter {
  font-size: 2em;
  font-weight: bold;
}
```

---

## Common Live Coding Exercises

### 1. Two-column layout: sidebar + main
```css
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  padding: 24px;
  min-height: 100vh;
}
```

### 2. Three-column card grid, responsive
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
```

### 3. Vertically and horizontally centred full-screen
```css
body {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
}
```

### 4. Fixed header + scrollable content + fixed footer
```css
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header { flex-shrink: 0; height: 64px; }
.content { flex: 1; overflow-y: auto; }
.footer { flex-shrink: 0; height: 48px; }
```

### 5. Pill / badge component
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 9999px;   /* pill shape */
  font-size: 12px;
  font-weight: 500;
  background: #dbeafe;
  color: #1d4ed8;
}
```

---

## Debugging Layout Issues

When something looks wrong:

1. **Add `outline: 1px solid red` to the element** — visualises the box without affecting layout (unlike border)
2. **Check `display`** — is it block, inline, flex, grid?
3. **Check `position`** — static, relative, absolute, fixed, sticky?
4. **Check `overflow`** — `hidden` clips children, `auto` adds scrollbar
5. **Check `z-index`** — only works on positioned elements (not `position: static`)
6. **Check parent constraints** — a flex child with `flex: 1` needs the parent to have a defined height

Common gotchas:
- `height: 100%` on a child only works if the parent has an explicit height
- `margin: auto` only works on block elements with a defined width
- Absolute positioned element is relative to nearest `position: relative` ancestor
- `z-index` doesn't work without `position` set
- `overflow: hidden` on a parent clips absolutely positioned children
