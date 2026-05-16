# UI/UX — Senior Developer Deep Reference

**Priority: HIGH**

> Covers UX principles, design systems, interaction patterns, typography, color, spacing, motion, forms, states, dark mode, design tokens, and the engineering side of translating design to code.
> Complements CSS-DEEP.md (layout/styling) and ACCESSIBILITY-MED-DEEP.md (WCAG/ARIA).

---

## Table of Contents

1. [Core UX Principles](#1-core-ux-principles)
2. [Nielsen's 10 Usability Heuristics](#2-nielsens-10-usability-heuristics)
3. [Design Systems](#3-design-systems)
4. [Design Tokens](#4-design-tokens)
5. [Typography](#5-typography)
6. [Color Theory & Theming](#6-color-theory--theming)
7. [Spacing & Layout Systems](#7-spacing--layout-systems)
8. [Component Design Patterns](#8-component-design-patterns)
9. [Forms & Input UX](#9-forms--input-ux)
10. [Loading, Empty & Error States](#10-loading-empty--error-states)
11. [Motion & Animation](#11-motion--animation)
12. [Responsive & Adaptive Design Strategy](#12-responsive--adaptive-design-strategy)
13. [Dark Mode](#13-dark-mode)
14. [Perceived Performance](#14-perceived-performance)
15. [Common Interview Questions](#15-common-interview-questions)

---

## 1. Core UX Principles

### Mental models

```text
‼️ A mental model is the user's internal expectation of how something works,
   built from prior experience with similar products.

Design principle: match the user's mental model, not your implementation model.

Examples:
  Trash/recycle bin — files don't disappear immediately. Users expect recovery.
  Shopping cart — items stay even after closing the tab. Persist to localStorage/server.
  Search box in top-right — global search. Top-left = logo/home. Users expect this layout.

When you violate a mental model:
  Users get confused, call it "unintuitive", abandon the task.
  "Intuitive" = matches my existing mental model.

Engineering implication:
  Don't invent new patterns for solved problems.
  A custom date picker that works differently from the native one = cognitive load.
  Prefer standard HTML elements + progressive enhancement over fully custom UI.
```

### Fitts's Law

```text
Time to reach a target = log2(distance / size + 1)

In plain English: the further away and smaller a target, the harder it is to click.

Engineering implications:
  ✓ Make clickable areas large (min 44×44px for touch — Apple HIG standard)
  ✓ Place primary actions where the cursor already is (context menus, inline buttons)
  ✓ Corners and edges of the screen are "infinite" in one dimension — easy to reach
    (this is why macOS menu bar is at the very top, not floating)
  ✓ Destructive actions (Delete, Remove) should be small AND far from primary action
  ✓ Disabled buttons should still be visible but clearly non-interactive

Touch targets:
  WCAG 2.5.5 AAA: 44×44px minimum
  WCAG 2.5.8 AA (2.2): 24×24px minimum (with spacing)
  Google Material: 48×48dp
```

### Hick's Law

```text
Decision time increases logarithmically with number of choices.

Engineering implications:
  ✓ Navigation: 5–7 top-level items max (Miller's Law: 7±2 items in working memory)
  ✓ Onboarding: break into steps — don't show all fields at once
  ✓ Settings: group and nest options — progressive disclosure
  ✓ Autocomplete over free text: reduce open-ended choices
  ✓ Smart defaults: pre-select the most common option

Example — bad:
  Form with 20 visible fields shown simultaneously → overwhelming.
Example — good:
  Multi-step form, 4–5 fields per step, progress indicator.
```

### Jakob's Law

```text
Users spend most of their time on OTHER sites.
They expect YOUR site to work like all those other sites.

Implication: innovation has a UX cost.
  Custom UI patterns require learning. Standard patterns are free.

When to innovate:
  When the standard pattern genuinely cannot solve your problem.
  When you have research proving users prefer your pattern.
  NOT because it looks different/cool.
```

### The Gulf of Evaluation & Execution

```text
Gulf of Execution: "How do I do what I want to do?"
  Fix: clear affordances (buttons look clickable), labels, help text, tooltips.

Gulf of Evaluation: "Did what I did actually do what I wanted?"
  Fix: feedback — visual confirmation, success/error messages, undo actions.

‼️ Every UI interaction must bridge both gulfs:
  1. User can see how to perform the action (execution)
  2. User can see the result of the action (evaluation)

Examples:
  ✗ Icon-only button with no label → gulf of execution (what does this do?)
  ✗ Form submit with no feedback → gulf of evaluation (did it save?)
  ✓ Button with label + tooltip + success toast → bridges both
```

---

## 2. Nielsen's 10 Usability Heuristics

```text
These are the most referenced heuristics in interviews. Know them cold.

1. Visibility of system status
   Keep users informed. Show loading spinners, progress bars, confirmation toasts.
   "Your changes are saved." "3 of 10 files uploaded."

2. Match between system and the real world
   Use words users know, not system jargon. Chronological order. Real-world conventions.
   "Inbox" not "MessageRepository". Trash icon, not "DELETE_BLOB".

3. User control and freedom
   Provide undo/redo. Cancel button on every modal/dialog.
   Don't trap users in flows they can't exit. Browser back button should work.

4. Consistency and standards
   Same word always means the same thing. Platform conventions (cmd+S = save).
   Buttons in the same position across pages. One component for one concept.

5. Error prevention
   Better than good error messages: prevent errors.
   Disable "Submit" until form is valid. Confirmation dialogs for destructive actions.
   Constrained inputs (date picker vs. free text date field).

6. Recognition over recall
   Don't make users remember info from one page to another.
   Show recent searches, previously selected options. Visible labels (not just placeholders).
   ‼️ Placeholder text disappears on type — never use it as a substitute for a label.

7. Flexibility and efficiency of use
   Shortcuts for experts (keyboard shortcuts, bulk actions).
   Let beginners use the full flow, let power users skip steps.
   Command palette (cmd+K) is the modern answer to this.

8. Aesthetic and minimalist design
   Every extra element competes for attention. Remove what doesn't serve a purpose.
   "Perfection is achieved not when there is nothing left to add,
    but when there is nothing left to remove." — Antoine de Saint-Exupéry

9. Help users recognize, diagnose, and recover from errors
   Error messages: plain language, describe the problem, suggest a fix.
   ✗ "Error 422" ✗ "Invalid input"
   ✓ "Email must be a valid address (e.g. name@example.com)"

10. Help and documentation
    UI should be self-explanatory. When it's not, inline help > external docs.
    Tooltips, progressive disclosure, contextual help icons.
```

---

## 3. Design Systems

### What a design system is

```text
A design system is a single source of truth that contains:
  - Design tokens (colors, spacing, typography scales)
  - Component library (Button, Input, Modal, etc.)
  - Usage guidelines (when to use what, do/don't examples)
  - Design files (Figma) + code (React/Vue/etc.) in sync

Why it matters for engineers:
  - Eliminates "which shade of blue?" debates
  - Components are built once, used everywhere → consistency
  - Design changes in one place propagate everywhere
  - Reduces CSS sprawl (no more one-off styles)

Famous design systems:
  Google: Material Design (material.io)
  Apple:  Human Interface Guidelines (HIG)
  Shopify: Polaris
  IBM:    Carbon
  Atlassian: Atlassian Design System
  Radix UI / shadcn/ui — headless component libraries for React
```

### Atomic Design (Brad Frost)

```text
The mental model for component hierarchy:

Atoms       → smallest UI elements: Button, Input, Label, Icon, Badge
              No dependencies on other components.

Molecules   → combinations of atoms: SearchBox (Input + Button),
              FormField (Label + Input + ErrorMessage)

Organisms   → complex UI sections: Header (Logo + Nav + SearchBox),
              ProductCard (Image + Title + Price + AddToCart)

Templates   → page layouts without real content: wires showing organism placement

Pages       → templates with real content — what users actually see

Engineering implication:
  Build atoms first (most reusable, most tested).
  Compose upward. Never let an atom import a molecule.
  Dependency direction: Pages → Templates → Organisms → Molecules → Atoms
```

### Component API design

```tsx
// ‼️ Good component API is UX for engineers — it guides correct usage

// ✗ Bad — too many booleans, unclear intent, doesn't scale
<Button primary large loading disabled iconLeft="star" />

// ✓ Better — variant + size as enums, semantic prop names
<Button
  variant="primary"         // 'primary' | 'secondary' | 'ghost' | 'destructive'
  size="md"                 // 'sm' | 'md' | 'lg'
  isLoading={submitting}
  leftIcon={<StarIcon />}
  onClick={handleSubmit}
>
  Save Changes
</Button>

// Principles:
// - Composition over configuration (slots/children over dozens of props)
// - Variants as enums, not booleans (variant="destructive" not isDestructive)
// - Sensible defaults (size="md" by default)
// - Extend native element props (a Button should accept all <button> HTML props)
// - Don't leak implementation details in the API

// Extending native props in TypeScript:
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}
```

---

## 4. Design Tokens

### What tokens are and why they matter

```text
Design tokens = named values for every design decision (color, spacing, font size, etc.)

Without tokens:
  #3B82F6 is hardcoded in 47 different files.
  Brand color change = grep-and-replace nightmare.
  Dark mode = impossible.

With tokens:
  --color-brand-500: #3B82F6;
  All components reference the token name, not the value.
  Brand color change = 1 line in 1 file.
  Dark mode = redefine tokens under [data-theme="dark"] selector.
```

### Token naming conventions

```css
/* 2-tier system: primitive tokens + semantic tokens */

/* Tier 1 — Primitive (raw values, not used in components directly) */
:root {
  --blue-100: #EFF6FF;
  --blue-500: #3B82F6;
  --blue-900: #1E3A8A;
  --gray-50:  #F9FAFB;
  --gray-900: #111827;

  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.25rem;   /* 20px */

  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
}

/* Tier 2 — Semantic (what the color DOES, not what it IS) */
:root {
  --color-bg-primary:    var(--gray-50);
  --color-bg-secondary:  white;
  --color-text-primary:  var(--gray-900);
  --color-text-muted:    var(--gray-500);
  --color-border:        var(--gray-200);
  --color-brand:         var(--blue-500);
  --color-brand-hover:   var(--blue-600);
  --color-error:         var(--red-600);
  --color-success:       var(--green-600);
  --color-warning:       var(--yellow-500);
  --color-focus-ring:    var(--blue-500);
}

/* Dark mode — only redefine semantic tokens */
[data-theme="dark"] {
  --color-bg-primary:   var(--gray-900);
  --color-bg-secondary: var(--gray-800);
  --color-text-primary: var(--gray-50);
  --color-text-muted:   var(--gray-400);
  --color-border:       var(--gray-700);
}

/* Components reference semantic tokens only */
.button-primary {
  background: var(--color-brand);          /* ✓ semantic */
  color: white;
  /* background: #3B82F6;  ✗ primitive hardcoded */
}
```

### Token tooling

```text
Style Dictionary (Amazon) — transforms tokens JSON to CSS/JS/iOS/Android
Theo (Salesforce) — similar to Style Dictionary
Figma Tokens plugin — sync design tokens between Figma and code
Tailwind CSS — its config IS a token system (colors, spacing, fonts)

Token lifecycle:
  Designer defines in Figma → exported as JSON → Style Dictionary transforms
  → generates CSS vars, JS constants, native platform values
  → components consume → single source of truth
```

---

## 5. Typography

### The type scale

```text
‼️ Don't use arbitrary font sizes. Use a modular scale.

Modular scale: multiply a base size by a fixed ratio.
  Base: 16px, Ratio: 1.25 (Major Third)
  → 10.24 / 12.8 / 16 / 20 / 25 / 31.25 / 39.06 / 48.83px

Common scales used in design systems:
  Tailwind default: 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72px
  Material Design: 12, 14, 16, 20, 24, 34, 48, 60, 96px

Why it matters:
  Random font sizes (17px, 23px, 41px) create visual noise.
  Consistent scale creates rhythm and hierarchy.
```

```css
/* Type hierarchy — 3-4 levels is usually enough */
.text-xs   { font-size: 0.75rem;  line-height: 1rem;      } /* 12px — captions, labels */
.text-sm   { font-size: 0.875rem; line-height: 1.25rem;   } /* 14px — secondary text */
.text-base { font-size: 1rem;     line-height: 1.5rem;    } /* 16px — body text */
.text-lg   { font-size: 1.125rem; line-height: 1.75rem;   } /* 18px — lead text */
.text-xl   { font-size: 1.25rem;  line-height: 1.75rem;   } /* 20px — h4 */
.text-2xl  { font-size: 1.5rem;   line-height: 2rem;      } /* 24px — h3 */
.text-3xl  { font-size: 1.875rem; line-height: 2.25rem;   } /* 30px — h2 */
.text-4xl  { font-size: 2.25rem;  line-height: 2.5rem;    } /* 36px — h1 */
```

### Line length & spacing

```text
Optimal line length (measure): 50–75 characters per line (~45–85ch)
  Too narrow: eye jumps too often → tiring
  Too wide:   hard to find the next line → disorienting

Line height (leading):
  Body text: 1.4–1.6× font size (e.g. 16px font → 24px line height)
  Headings:  1.1–1.3× (tighter — shorter lines, larger size)
  Small text: 1.4–1.5× (needs more breathing room)

Letter spacing (tracking):
  Body text:    0 or very slight (default)
  ALL CAPS:     +0.05–0.1em (capitals need more tracking)
  Large display headings: slight negative (-0.02em) looks tighter/cleaner

Font weight hierarchy:
  Regular (400) → body text
  Medium (500)  → UI labels, slightly emphasized
  Semibold (600) → subheadings, strong emphasis
  Bold (700)     → headings, high-emphasis CTA
  Avoid: mixing more than 2–3 weights on a single page
```

### Web font performance

```css
/* font-display: swap — show fallback font immediately, swap when custom font loads */
/* Prevents invisible text during font load (FOIT — Flash of Invisible Text) */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap; /* show system font → swap to Inter when ready */
  font-weight: 400 900; /* variable font — one file, all weights */
}

/* Preload critical fonts — browser fetches early */
/* <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin> */

/* System font stack — zero load time, matches OS */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             Oxygen, Ubuntu, Cantarell, sans-serif;

/* Subset fonts — only include characters you need */
/* Google Fonts does this automatically via &subset=latin */
/* Reduces file size by 60–80% for non-Latin scripts */
```

---

## 6. Color Theory & Theming

### Color roles in UI

```text
Every color in a UI serves a role. Name it by role, not by hue.

Background     — page, card, sidebar backgrounds
Surface        — elevated surfaces (modals, dropdowns, popovers)
Brand/Primary  — main interactive color (buttons, links, focus rings)
Neutral        — text, borders, disabled states
Semantic:
  Success (green)  — confirmations, completed states
  Warning (yellow) — caution, degraded states
  Error (red)      — failures, destructive actions
  Info (blue)      — neutral informational messages

‼️ Never use raw hue names in code ("blue", "red").
   Use role names ("--color-brand", "--color-error").
   Blue means nothing. "brand" tells you how to use it.
```

### Color contrast (WCAG requirements)

```text
Normal text (< 18pt / < 14pt bold): ratio ≥ 4.5:1  (AA)
Large text  (≥ 18pt / ≥ 14pt bold): ratio ≥ 3:1    (AA)
UI components and graphical objects:  ratio ≥ 3:1    (AA)
Enhanced (AAA) normal text:           ratio ≥ 7:1

How to calculate: (L1 + 0.05) / (L2 + 0.05)
  where L = relative luminance of the color

Tools: WebAIM Contrast Checker, Figma plugins (Contrast, Stark)

Common failures:
  ✗ Gray text on white (#999 on #fff = 2.85:1 — fails AA)
  ✗ Blue text on blue background
  ✗ Placeholder text (gray on white often fails)
  ✓ #767676 on white = 4.54:1 — barely passes AA
  ✓ #595959 on white = 7.0:1 — passes AAA
```

### Building a color palette

```text
Technique: start with a brand color, generate a scale of 9-10 shades.

Scale naming convention (Tailwind-style):
  50   — very light tint (backgrounds)
  100  — light tint
  200  — lighter
  300  — light
  400  — medium light
  500  — base brand color (use this in the name: "blue-500")
  600  — medium dark (hover state for primary button)
  700  — dark
  800  — darker
  900  — very dark (text on colored backgrounds)

Button states using the scale:
  Default:  brand-500 background
  Hover:    brand-600 background
  Active:   brand-700 background
  Focus:    brand-500 + focus ring (brand-300 at 50% opacity)
  Disabled: neutral-300 background, neutral-500 text

‼️ Don't generate your palette with pure saturation changes.
   Real palette shades also shift hue slightly (HSL hue rotation).
   Tools: Radix Colors, Tailwind palette generator, Colorbox.io
```

---

## 7. Spacing & Layout Systems

### The 4pt/8pt grid system

```text
‼️ Most successful design systems use a base-8 spacing system.
   All spacing values are multiples of 4 or 8.

Why 8pt?
  - Most screen densities (1x, 2x, 3x) scale cleanly with 8
  - 8 divides evenly into many common widths
  - Creates visual rhythm — everything "snaps" to the same grid

Scale (multiples of 4):
  4px   → tight spacing (icon padding, badge padding)
  8px   → small (between related items, icon margins)
  12px  → medium-small
  16px  → medium (default padding, between form fields)
  24px  → medium-large (between sections)
  32px  → large (section padding)
  48px  → xl (between major sections)
  64px  → 2xl (page-level spacing)

Engineering: map these to --space-1 through --space-16 tokens (each = 4px × n)
  --space-1:  4px
  --space-2:  8px
  --space-3:  12px
  --space-4:  16px
  --space-6:  24px
  --space-8:  32px
  --space-12: 48px
  --space-16: 64px
```

### Layout patterns

```css
/* Holy Grail layout — header, footer, sidebar, main */
.layout {
  display: grid;
  grid-template:
    "header header"  auto
    "sidebar main"   1fr
    "footer footer"  auto
    / 260px 1fr;
  min-height: 100vh;
}

/* Card grid — auto-fill, min 280px, fill available space */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-6);
}

/* Centered content with max width */
.container {
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: var(--space-4); /* 16px side padding on small screens */
}

/* Stack — vertical rhythm with consistent spacing */
.stack > * + * {
  margin-top: var(--space-4); /* Lobotomized Owl selector */
}

/* Cluster — wrapping horizontal group */
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

/* Sidebar layout — sidebar + fluid main content */
.with-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}
.with-sidebar > :first-child { width: 260px; }
.with-sidebar > :last-child  { flex: 1; min-width: min(400px, 100%); }
```

---

## 8. Component Design Patterns

### Navigation patterns

```text
Top navigation bar:
  ✓ Best for: 5–7 top-level sections, horizontal space available
  ✓ Users expect logo top-left, primary nav center/right, profile top-right
  ✗ Avoid: more than 7 items (use dropdown groups)

Sidebar navigation:
  ✓ Best for: complex apps with many sections (dashboards, admin panels)
  ✓ Collapsible — icon-only on small screens, full labels on large
  ✓ Persistent (always visible) vs. drawer (hidden, hamburger toggle)

Tab navigation:
  ✓ Best for: switching between related views (not deep navigation)
  ✓ Keep to 3–6 tabs max
  ✓ Tabs indicate current state — use aria-selected, not href routing alone

Breadcrumbs:
  ✓ Best for: deep hierarchies (e-commerce categories, file systems, CMS)
  ✓ Always show current page as last item (non-clickable)
  ✓ Separator: "/" or ">" — both are fine; be consistent
```

### Button hierarchy

```text
Every screen should have ONE primary action. Secondary and tertiary actions
are visually subordinate.

Primary:    filled, brand color → "Save", "Submit", "Purchase"
Secondary:  outlined or ghost   → "Cancel", "Back", "Learn more"
Tertiary:   text-only           → "Skip", "Dismiss", auxiliary links
Destructive: filled red/danger  → "Delete account", "Remove" — separated from primary

‼️ Common mistake: multiple primary buttons on one screen.
   Two bright filled buttons fight for attention → decision paralysis.
   One primary, one secondary maximum in a single action group.

Button sizing:
  Large: 48px height — primary CTAs, hero sections
  Medium: 40px — default, most use cases
  Small: 32px — tables, compact UI, secondary actions in tight spaces
  Touch: ensure 44×44px minimum tap target even if visual size is smaller
         (add invisible padding with padding or using ::before pseudo-element)
```

### Modal & dialog patterns

```text
When to use a modal:
  ✓ Blocking decision user MUST make before continuing (confirm delete)
  ✓ Quick task that doesn't need a full page (edit name, add tag)
  ✗ Not for complex multi-step flows (use a page instead)
  ✗ Not for non-blocking information (use toast/notification)

Modal anatomy:
  - Backdrop (semi-transparent overlay) — click to close (unless critical)
  - Container — centered, max-width ~560px for forms, ~800px for content
  - Header: title + close button (always provide a close button)
  - Body: scrollable if content overflows
  - Footer: action buttons (primary right, secondary left OR both right)
  - Escape key: always closes the modal
  - Focus trap: keyboard focus must stay inside the modal

‼️ Focus management in modals:
  On open:  move focus to first interactive element or modal title
  On close: return focus to the element that triggered the modal
  Inside:   Tab/Shift+Tab cycles only within the modal (focus trap)
```

### Data table patterns

```text
Column behavior:
  Sortable: click header to sort asc/desc — show sort indicator (▲/▼/⇅)
  Resizable: drag column divider (optional, useful for dense data)
  Sticky header: freeze header on scroll for long tables
  Sticky column: freeze first column for wide tables (e.g., name column)

Row behavior:
  Selection: checkbox column (with select-all in header)
  Row click: navigates to detail, OR opens panel — be consistent
  Row actions: show on hover (✏️ 🗑️) OR in a "..." overflow menu
  Empty state: meaningful message + CTA when no rows

Pagination vs. infinite scroll:
  Pagination: preferred for tables — users know how many results exist,
              can jump to page N, browser back works correctly
  Infinite scroll: preferred for feeds — content is exploratory, not task-based

Column data alignment:
  Text:    left-aligned
  Numbers: right-aligned (decimal points align vertically)
  Status:  centered
  Actions: right-aligned
```

---

## 9. Forms & Input UX

### Label and placeholder rules

```text
‼️ Always use visible labels. NEVER replace labels with placeholders.

Why:
  - Placeholder disappears on type → user forgets what field is for
  - Placeholder contrast is intentionally low (gray) → fails WCAG
  - Screen readers may skip placeholder text
  - Autofilled fields show the value but not the placeholder label

Pattern: floating label (Material Design style)
  - Label sits inside the input as a placeholder
  - On focus/fill: label floats to top of input border
  - Complex to implement correctly (especially with autofill)
  - Only use if you have the engineering bandwidth

Simpler pattern: label above input (always visible, always accessible)
  <label for="email">Email address</label>
  <input id="email" type="email" placeholder="name@example.com" />
  <!-- placeholder here is an example, supplementary to the label -->
```

### Input types

```html
<!-- ‼️ Always use the correct input type — triggers right keyboard on mobile -->
<input type="email">     <!-- @ key on mobile keyboard, built-in email validation -->
<input type="tel">       <!-- numeric keyboard on mobile, no validation -->
<input type="number">    <!-- numeric, increment/decrement arrows -->
<input type="password">  <!-- masked characters -->
<input type="search">    <!-- search icon, clear button, enter triggers search -->
<input type="url">       <!-- .com key on mobile, URL validation -->
<input type="date">      <!-- native date picker -->
<input type="range">     <!-- slider -->
<input type="checkbox">  <!-- boolean, group with fieldset+legend -->
<input type="radio">     <!-- single selection from group -->

<!-- Autocomplete attribute — helps password managers and browsers -->
<input type="email" autocomplete="email">
<input type="password" autocomplete="current-password">
<input type="password" autocomplete="new-password">
<input type="text" autocomplete="name">
<input type="text" autocomplete="street-address">
```

### Validation UX

```text
When to validate:
  On submit:  always validate everything. Simplest baseline.
  On blur:    validate a field when user leaves it. Catches errors early.
  On change:  validate as user types. Only for real-time feedback (password strength,
              username availability). Avoid for format validation — fires on every key.

Error message rules:
  1. Tell the user WHAT is wrong (not just "Invalid input")
  2. Tell them HOW to fix it ("Must be at least 8 characters")
  3. Show the error IN CONTEXT (next to the field, not just at the top)
  4. Use red color PLUS an icon — never rely on color alone (color blindness)
  5. Associate error with input via aria-describedby

  ✗ "This field is required"  — which field?
  ✗ "Invalid value"           — how invalid?
  ✓ "Email is required"
  ✓ "Password must be at least 8 characters and include a number"

Inline validation example:
  input[aria-invalid="true"] { border-color: var(--color-error); }
  #email-error { color: var(--color-error); font-size: 0.875rem; }
  <input aria-invalid="true" aria-describedby="email-error">
  <p id="email-error" role="alert">Enter a valid email address</p>

Password strength:
  Show strength meter (weak/fair/strong) — don't ONLY list requirements.
  Progressive disclosure: show requirements on focus, check them off as met.
```

### Form layout

```text
Single column vs. multi-column:
  ✓ Single column: almost always. Easier to scan, better on mobile.
  ✓ Multi-column: only for logically paired fields (First Name | Last Name,
                  City | State | ZIP, Start Date | End Date)
  ✗ Multi-column for unrelated fields: users zigzag, miss fields

Field order:
  - Logical flow (like filling a paper form)
  - Most important / most needed fields first
  - Optional fields last (or in an "Advanced" section)

Form length:
  - Remove optional fields aggressively — every field has a cost (cognitive + time)
  - If you must have many fields: multi-step wizard with progress indicator
  - Smart defaults reduce required input (pre-fill country from IP, etc.)
```

---

## 10. Loading, Empty & Error States

### The four states every UI component needs

```text
Every data-driven component has four states. Design ALL of them.

1. Loading:    data is being fetched
2. Empty:      fetch succeeded but there's nothing to show
3. Error:      fetch failed
4. Populated:  the happy path (the only state most devs design)

‼️ Missing states = UI holes. Users hit them constantly.
   "Loading" is often the FIRST thing a user sees.
```

### Loading state patterns

```text
Spinner:
  ✓ Short, unpredictable waits (< 3 seconds)
  ✓ Small areas (button loading state)
  ✗ Full page load — feels like nothing is happening

Skeleton screen:
  ✓ Page-level and component-level loads
  ✓ Shows layout structure before content arrives — feels faster (perceived performance)
  ✓ Reduces layout shift when content arrives
  Technique: gray placeholder boxes matching content shape, shimmer animation

Progress bar:
  ✓ Deterministic progress (file upload, multi-step process)
  ✓ Long operations (> 3 seconds) — users need to know it's working
  ✗ Fake progress bars (looping bar at unknown speed) — feels dishonest

Optimistic UI:
  ✓ Instant feedback for high-confidence actions (like, follow, add to cart)
  Update UI immediately, revert on failure
  See REACT-INTERVIEW-LIVE-CODING.md #24 for implementation
```

### Empty state design

```text
An empty state is NOT just an absence of content — it's a UX opportunity.

Anatomy of a good empty state:
  1. Illustration or icon — makes it feel intentional, not broken
  2. Headline — what is empty? ("No projects yet")
  3. Description — why it's empty + what to expect ("Projects you create appear here")
  4. Primary CTA — the ONE action to fix it ("Create your first project")

Types of empty states:
  First time: user hasn't created anything yet → onboarding opportunity
  Cleared:    user deleted everything → confirmation + undo option
  No results: search/filter returned nothing → suggest different search terms
  Error:      couldn't load → "Something went wrong. Try again."

✗ Never show a blank white box with no explanation.
✓ Always explain what goes here and how to populate it.
```

### Error state design

```text
Error severity levels:

Inline error:   field-level validation error, next to the field
Toast/snackbar: non-blocking, temporary notification (action failed/succeeded)
Banner:         page-level warning persists until dismissed (degraded mode, quota warning)
Error page:     full-page error (404, 500, no network connection)

Error page anatomy:
  1. Clear headline ("Page not found" / "Something went wrong")
  2. Human explanation (not "Error 404")
  3. What the user can do (Go back / Go to homepage / Try again)
  4. Optional: humor or illustration (softens frustration — but not for serious errors)

Toast/notification rules:
  - Auto-dismiss after 4–5 seconds for success
  - Don't auto-dismiss errors — user needs to read and act
  - Position: top-right (desktop) or bottom-center (mobile, thumb reachable)
  - Max 1–2 toasts at a time — stack or queue them
  - Provide a close button always
  - Success: green; Error: red; Warning: yellow; Info: blue — plus icon (not color only)
```

---

## 11. Motion & Animation

### The 12 principles of animation (applied to UI)

```text
Most UI-relevant Disney principles:

1. Timing — faster = snappier/crisper. Slower = weightier/important.
   Micro-interactions: 100–300ms
   Page transitions:   300–500ms
   > 500ms feels slow. > 1000ms = user wonders if it's broken.

2. Easing — movement rarely starts or stops abruptly in the real world.
   ease-in:     slow start, fast end (entering elements)
   ease-out:    fast start, slow end (exiting elements) ← most common in UI
   ease-in-out: slow start AND end (repositioning elements)
   linear:      constant speed (spinners, progress bars)

3. Anticipation — brief setup before the main action (drawer slides in with slight bounce)
4. Follow-through — slight overshoot then settle (spring animations)
5. Secondary action — supporting motion reinforces the main action (list item slides
   and the container resizes simultaneously)
```

### CSS animation best practices

```css
/* ‼️ Only animate compositor-friendly properties to avoid layout thrashing */
/* Cheap (compositor thread — GPU): */
transform: translate(), rotate(), scale()
opacity

/* Expensive (main thread — triggers layout/paint): */
/* width, height, top, left, margin, padding, font-size → avoid animating these */

/* ✓ Move element by animating transform, not left/top */
.card:hover { transform: translateY(-4px); } /* GPU — smooth */
/* .card:hover { top: -4px; }  ← triggers layout — avoid */

/* will-change: hint the browser to promote the element to its own layer */
.animated-element { will-change: transform; } /* use sparingly — memory cost */

/* Respect user preference for reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Easing functions */
.modal-enter {
  animation: slideIn 250ms cubic-bezier(0.16, 1, 0.3, 1); /* ease-out quint */
}

.tooltip {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

/* Spring animation in CSS (approximation) */
.dropdown {
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1); /* spring */
}
```

### When to animate (and when not to)

```text
✓ Animate to:
  - Show spatial relationships (where an element came from / where it went)
  - Provide feedback (button press, form submit)
  - Draw attention to important changes (new notification, error appearing)
  - Make transitions feel smooth (page change, modal open)

✗ Don't animate:
  - Decoration only — if removing the animation doesn't affect understanding, remove it
  - Blocking interactions — never block user from acting while animation plays
  - Every possible hover state — animation fatigue is real
  - Critical information — don't animate errors into view; they might be missed

Animation timing guidelines:
  Hover/focus transitions:   100–150ms
  Tooltips appear:           150–200ms
  Dropdowns/menus:           200–250ms
  Modals:                    250–350ms
  Page transitions:          300–500ms
  Loading animations:        continuous loop, ~1500ms cycle
```

---

## 12. Responsive & Adaptive Design Strategy

### Mobile-first vs. desktop-first

```text
Mobile-first (recommended):
  Write base styles for mobile → add complexity with min-width breakpoints.
  Forces you to prioritize content — if it works on mobile, it works everywhere.
  Progressively enhanced.

  @media (min-width: 768px) { /* tablet and up */ }
  @media (min-width: 1024px) { /* desktop */ }

Desktop-first:
  Write styles for desktop → remove/override with max-width breakpoints.
  Leads to bloated mobile styles, harder to maintain.
  Use only when retrofitting a legacy desktop-only app.

  @media (max-width: 767px) { /* mobile only */ }
```

### Breakpoint strategy

```text
‼️ Don't base breakpoints on devices. Base them on content.
   "When does this layout break?" → that's where the breakpoint goes.

Common breakpoint scale (Tailwind defaults):
  sm:  640px  — large mobile / small tablet portrait
  md:  768px  — tablet portrait
  lg:  1024px — tablet landscape / small desktop
  xl:  1280px — desktop
  2xl: 1536px — large desktop / wide screens

Component-level breakpoints (container queries):
  @container (min-width: 400px) { /* component responds to ITS OWN container, not viewport */ }
  Use when a component is used in different-width contexts (sidebar vs. main)
  More correct than viewport breakpoints for component libraries

Navigation adaptation:
  Mobile (<768px):  hamburger menu → full-screen drawer or bottom sheet
  Tablet (768–1024px): icon-only sidebar or collapsed nav
  Desktop (>1024px): full sidebar or horizontal top nav
```

### Touch vs. pointer design

```css
/* Detect touch capability */
@media (hover: none) and (pointer: coarse) {
  /* Touch device — larger tap targets, no hover states */
  .button { min-height: 48px; }
  .hover-only { display: none; }
}

@media (hover: hover) and (pointer: fine) {
  /* Mouse/trackpad — hover states are safe */
  .button:hover { background: var(--color-brand-hover); }
  .row:hover .row-actions { opacity: 1; } /* reveal on hover */
}

/* Touch-specific: don't show hover-revealed actions on touch */
/* Use a "..." button or long-press instead */
```

---

## 13. Dark Mode

### Implementation strategy

```text
3 approaches:

1. CSS custom properties (recommended)
   Define semantic tokens in :root, redefine under [data-theme="dark"].
   No class changes needed on individual components — just change root attribute.
   Most maintainable.

2. CSS media query: prefers-color-scheme
   Automatic — follows OS setting.
   Cannot be overridden by user preference in the app itself without JS.

3. Both (best UX):
   Default to prefers-color-scheme.
   Allow user to override with a toggle (saves preference to localStorage).
   CSS: use prefers-color-scheme as default, JS applies [data-theme] to override.
```

```css
/* Step 1: define all colors as semantic tokens in :root */
:root {
  --color-bg:          #ffffff;
  --color-bg-elevated: #f9fafb;
  --color-text:        #111827;
  --color-text-muted:  #6b7280;
  --color-border:      #e5e7eb;
  --color-brand:       #3b82f6;
}

/* Step 2: redefine for dark mode */
/* Approach A: OS-level only */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:          #111827;
    --color-bg-elevated: #1f2937;
    --color-text:        #f9fafb;
    --color-text-muted:  #9ca3af;
    --color-border:      #374151;
    --color-brand:       #60a5fa; /* lighter blue — better contrast on dark bg */
  }
}

/* Approach B: JS-controlled + OS default */
[data-theme="dark"] {
  --color-bg:          #111827;
  /* ... */
}

/* Step 3: JS toggle */
/* const saved = localStorage.getItem('theme') ?? 'system'; */
/* document.documentElement.dataset.theme = saved === 'system' ? '' : saved; */
```

### Dark mode design rules

```text
✗ Don't just invert colors — pure black (#000) backgrounds are harsh
✓ Use dark gray (#111827, #1f2937) as background

✗ Don't use the same brand color on dark — often too bright/saturated
✓ Use a lighter tint of the brand color (blue-400 instead of blue-500)

✗ Don't forget to update images and icons (SVGs can use currentColor)
✓ Use CSS filters or multiple versions of images when needed

Shadow on dark mode:
✗ Box shadows are invisible on dark backgrounds (both are dark)
✓ Use border or slight background color difference for elevation instead

Contrast on dark:
  Check all text/background combinations again — passing on light ≠ passing on dark.
  Dark mode often has DIFFERENT contrast failures than light mode.
```

---

## 14. Perceived Performance

### Why perceived performance matters more than actual performance

```text
‼️ Perceived performance ≠ actual performance.
   Users judge speed by how fast things FEEL, not by stopwatch.

Key insight: users tolerate waiting IF they see progress.
  A 3-second load with a skeleton feels faster than
  a 2-second load with a blank white screen.

This is why Netflix shows thumbnails before video loads,
why Google Search shows a result layout before results fill in.
```

### Techniques for better perception

```text
1. Skeleton screens (over spinners)
   Show the page structure immediately. Content "populates" rather than "appears".
   Implementation: gray placeholder boxes with shimmer animation.
   Best for: article pages, card grids, profile pages.

2. Optimistic UI
   Show the result of an action before server confirms it.
   Best for: likes, follows, todo completion, add to cart.
   Always revert on failure with clear error message.

3. Content-first loading (progressive loading)
   Render text first, then images.
   Lazy-load below-the-fold images.
   Use low-quality image placeholders (LQIP) that blur-up to full quality.

4. Instant feedback on interaction
   Buttons should respond within 100ms — below perception threshold.
   Show loading state on the button itself (spinner inside button)
   rather than disabling the page.

5. Preloading
   Preload the next page on hover (before click).
   Prefetch data user is likely to need (next page in pagination).
   <link rel="prefetch" href="/next-page">

6. Avoid layout shift (CLS)
   Reserve space for images (width + height attributes, aspect-ratio CSS).
   Avoid inserting content above existing content (banners, ads, cookie notices).
   Use font-display: swap + size-adjust for font loading.

Core Web Vitals:
  LCP (Largest Contentful Paint) < 2.5s   — perceived load speed
  FID/INP (Interaction to Next Paint) < 200ms — interactivity
  CLS (Cumulative Layout Shift) < 0.1     — visual stability
```

### Skeleton screen implementation

```css
/* Shimmer animation — the "shimmer" moves left to right */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-elevated) 25%,
    var(--color-border)       50%,
    var(--color-bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-text  { height: 1rem; width: 80%; }
.skeleton-title { height: 1.5rem; width: 60%; }
.skeleton-avatar { height: 40px; width: 40px; border-radius: 50%; }
.skeleton-card  { height: 200px; width: 100%; }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
```

---

## 15. Common Interview Questions

### "What is the difference between UX and UI?"

```text
UI (User Interface): the visual layer — colors, typography, spacing, icons, layout.
  "What does it look like?"

UX (User Experience): the overall experience of using the product — the flow,
  information architecture, mental models, error recovery, onboarding.
  "How does it feel? Can users accomplish their goals?"

UI is a subset of UX.
You can have beautiful UI with terrible UX (looks great, impossible to use).
You can have great UX with mediocre UI (ugly but effective — Craigslist, early Google).

As an engineer, both matter:
  UI: pixel-perfect implementation of the design system
  UX: questioning flows, advocating for loading states, error states, edge cases
```

### "How do you make a component accessible AND good UX?"

```text
They are the same goal, not in tension.

Accessible = usable by more people:
  - Keyboard navigable (power users + motor disabilities)
  - Visible focus indicators (keyboard users + low vision)
  - Sufficient contrast (low vision + bright sunlight + aging eyes)
  - Descriptive labels (screen reader users + distracted users reading fast)

UX improvements that happen to be accessible:
  - Clear error messages → helps everyone, required for WCAG 3.3.1
  - Visible labels (not just placeholders) → helps everyone, required for WCAG 1.3.1
  - Loading states → helps everyone understand the system status (Heuristic #1)
  - Focus management in modals → required for keyboard users, also prevents confusion
```

### "Describe how you'd approach designing a complex form"

```text
1. Audit the fields — remove every optional field. Justify every required field.
2. Group related fields (fieldset + legend for screen readers)
3. Order fields logically (like a paper form flow)
4. Choose correct input types (email, tel, date) for mobile keyboards
5. Visible labels above each field — no placeholder-only
6. Inline validation on blur, full validation on submit
7. Clear, actionable error messages with aria-describedby association
8. Single primary CTA (Submit) — disable until minimally valid OR validate on submit
9. Consider multi-step if > 7–8 fields
10. Test with keyboard-only, screen reader, and mobile
```

### "What's a design system and why does it matter for engineering?"

```text
A design system is the single source of truth for UI decisions:
  design tokens (colors, spacing, fonts) + component library + usage guidelines.

Why it matters for engineering:
  1. Eliminates inconsistency — every button looks and behaves the same
  2. Speeds up development — compose from existing components, don't rebuild
  3. Makes design changes cheap — update a token, all components update
  4. Enables dark mode / theming — just redefine tokens
  5. Forces component API design — components need clear, stable contracts
  6. Improves accessibility — accessible patterns built once, reused everywhere
```

### "How do you implement dark mode?"

```text
1. Define all colors as CSS custom properties (tokens) in :root
2. Create semantic token names (--color-text, --color-bg) not raw color names
3. Redefine semantic tokens under [data-theme="dark"] or @media (prefers-color-scheme: dark)
4. Components use semantic tokens — no raw color values in component CSS
5. JS toggle: read prefers-color-scheme as default, save user preference to localStorage,
   set document.documentElement.dataset.theme = 'dark' | 'light'
6. Check contrast ratios AGAIN for dark mode — different colors, different failures
7. Handle images: SVG uses currentColor, photos may need CSS filters or alternate sources
```

### "What is perceived performance and how do you improve it?"

```text
Perceived performance is how fast something FEELS, not how fast it is.
Users judge by visible feedback, not timers.

Improvements:
  Skeleton screens:    show layout shape immediately → content feels like it "fills in"
  Optimistic UI:       apply action result instantly → no wait for server round-trip
  Progressive loading: text first, images lazy-loaded below fold
  Instant feedback:    button responds in < 100ms (even if actual work takes 2 seconds)
  Preloading:          fetch next page data on hover, before click
  Avoid layout shift:  reserve image space, don't inject content above existing content
  font-display: swap:  show text with system font immediately → swap to brand font
```

### "How would you handle a 10,000-item list in the UI?"

```text
Never render 10,000 DOM nodes — the browser cannot handle it.

Option 1: Pagination
  Render 20–50 items per page. User navigates pages.
  Best for: tables, search results, structured data.
  Pros: users know how many total items exist, can jump to a specific page.

Option 2: Virtual scrolling (windowing)
  Only render rows currently visible in the viewport (~15–20 at a time).
  Scroll the list normally — DOM nodes are recycled as user scrolls.
  Libraries: react-virtual (@tanstack/virtual), react-window, react-virtualized.
  Best for: feeds, long lists, infinite data with scroll behavior.
  Pros: smooth scroll experience, handles unlimited items.

Option 3: Infinite scroll with virtualization
  Load more items as user scrolls to bottom (IntersectionObserver on sentinel).
  Combine with virtualization to keep DOM size stable.
  Best for: social feeds, logs, exploratory browsing.
```
