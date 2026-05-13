# Accessibility (a11y) — Senior Developer Deep Reference
**Priority: MEDIUM** — Critical for healthcare platforms (patients may rely on assistive technology)

> Covers: WCAG standards, ARIA, keyboard navigation, focus management, screen reader testing, React patterns, and interview questions.

---

## Table of Contents

1. [Why Accessibility Matters](#1-why-accessibility-matters)
2. [WCAG Standards](#2-wcag-standards)
3. [Semantic HTML — The Foundation](#3-semantic-html--the-foundation)
4. [ARIA — When and How](#4-aria--when-and-how)
5. [Keyboard Navigation](#5-keyboard-navigation)
6. [Focus Management](#6-focus-management)
7. [Screen Readers](#7-screen-readers)
8. [Color, Contrast & Visual Design](#8-color-contrast--visual-design)
9. [React Accessibility Patterns](#9-react-accessibility-patterns)
10. [Testing Accessibility](#10-testing-accessibility)
11. [Common Interview Questions](#11-common-interview-questions)

---

## 1. Why Accessibility Matters

```text
Legal:
  ADA (Americans with Disabilities Act) — US law, applies to web.
  WCAG compliance is the legal standard in many countries.
  Healthcare platforms have heightened obligations — patients with disabilities
  have the same right to access their health information.

User reach:
  ~15% of the world's population has some form of disability.
  Visual impairments, motor impairments, cognitive disabilities, temporary disabilities
  (broken arm, bright sunlight, noise) all benefit from accessible design.

Engineering benefits:
  Semantic HTML improves SEO.
  Keyboard navigation is essential for power users.
  Good ARIA improves automated test reliability.
  Accessible components are often more robust and reusable.

For Solace Health specifically:
  Medicare population (65+) has high rates of visual and motor impairments.
  Healthcare information MUST be accessible — legal and ethical obligation.
```

---

## 2. WCAG Standards

```text
WCAG = Web Content Accessibility Guidelines (W3C standard)
Current version: WCAG 2.2 (2023). WCAG 3.0 in development.

Three conformance levels:
  A    — minimum. Failures here = some users cannot use the content at all.
  AA   — standard target. Legal compliance in most countries. Should always hit this.
  AAA  — enhanced. Not always achievable for all content.

Four principles (POUR):
  Perceivable:   information can be perceived by all senses (not just sight)
  Operable:      all functionality available by keyboard, no timing traps
  Understandable: content and UI is clear, errors are explained
  Robust:        works with current and future assistive technologies

Key AA criteria to know:
  1.1.1  — All non-text content has text alternatives (alt text for images)
  1.3.1  — Info and relationships conveyed through structure (semantic HTML)
  1.4.3  — Contrast ratio ≥ 4.5:1 for normal text, 3:1 for large text
  1.4.11 — Non-text contrast ≥ 3:1 (buttons, input borders, icons)
  2.1.1  — All functionality available from a keyboard
  2.4.3  — Focus order is logical and meaningful
  2.4.7  — Keyboard focus is visible
  3.3.1  — Input errors are described in text (not just color)
  4.1.2  — Name, role, value: all UI components have accessible name, role, state
```

---

## 3. Semantic HTML — The Foundation

```html
<!-- ARIA is a last resort — use semantic HTML first -->

<!-- ✗ Non-semantic: no meaning to assistive tech -->
<div onclick="submitForm()">Submit</div>
<div class="heading">Page Title</div>
<div class="nav">
  <div onclick="navigate('/home')">Home</div>
</div>

<!-- ✓ Semantic: native roles, keyboard support, meaning for screen readers -->
<button type="submit">Submit</button>
<h1>Page Title</h1>
<nav>
  <a href="/home">Home</a>
</nav>

<!-- Landmark elements: help screen reader users navigate the page -->
<header>    <!-- banner landmark -->
<nav>       <!-- navigation landmark -->
<main>      <!-- main landmark (only one per page) -->
<aside>     <!-- complementary landmark -->
<footer>    <!-- contentinfo landmark -->
<section aria-labelledby="section-title">  <!-- region landmark (needs label) -->

<!-- Form elements: always use <label> -->
<!-- ✗ No association: screen reader reads "input" with no context -->
<span>Email</span>
<input type="email" />

<!-- ✓ Explicit association via htmlFor/for -->
<label htmlFor="email">Email</label>
<input type="email" id="email" />

<!-- ✓ Implicit association (wrap input in label) -->
<label>
  Email
  <input type="email" />
</label>

<!-- Tables: use proper table markup -->
<table>
  <caption>Task Summary</caption>
  <thead>
    <tr>
      <th scope="col">Task</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Write report</td>
      <td>Open</td>
    </tr>
  </tbody>
</table>
```

---

## 4. ARIA — When and How

### ARIA rules

```text
Rule 1: Don't use ARIA if native HTML does the job.
  <button> already has role="button" — don't add it explicitly.
  Adding ARIA to div/span is more work and more error-prone.

Rule 2: Don't change native semantics unless you have to.
  ✗ <h2 role="button"> — confusing: heading that's also a button

Rule 3: All interactive ARIA controls must be keyboard operable.
  If you add role="button" to a div, you must also handle keyboard events.

Rule 4: Don't hide visible focusable elements from accessibility tree.
  ✗ <button aria-hidden="true"> — keyboard can focus it but screen reader ignores it

Rule 5: Interactive elements must have an accessible name.
  <button>, <a>, <input> must have visible text, aria-label, or aria-labelledby.
```

### ARIA roles

```html
<!-- Landmark roles (prefer semantic HTML equivalents) -->
<div role="banner">       <!-- = <header> -->
<div role="navigation">   <!-- = <nav> -->
<div role="main">         <!-- = <main> -->
<div role="contentinfo">  <!-- = <footer> -->

<!-- Widget roles (for custom interactive components) -->
<div role="button">       <!-- button that isn't a <button> — avoid if possible -->
<div role="dialog">       <!-- modal dialog -->
<div role="alert">        <!-- urgent message, announced immediately by screen reader -->
<div role="status">       <!-- polite message, announced when idle -->
<div role="tab">          <!-- tab in a tablist -->
<div role="tabpanel">     <!-- tab panel content -->
<div role="combobox">     <!-- select/autocomplete -->
<div role="listbox">      <!-- list of options -->
<div role="option">       <!-- individual option in listbox -->
<div role="tooltip">      <!-- tooltip -->
<div role="progressbar">  <!-- loading indicator -->
```

### ARIA properties and states

```html
<!-- Labeling: give an accessible name to elements without visible text -->
<button aria-label="Close dialog">✕</button>
<button aria-labelledby="dialog-title">Confirm</button>
<input aria-describedby="email-hint" />
<p id="email-hint">Enter your work email address</p>

<!-- States -->
<button aria-pressed="true">Bold</button>           <!-- toggle button -->
<button aria-expanded="false" aria-controls="menu"> <!-- expand/collapse -->
<li role="option" aria-selected="true">             <!-- selected item -->
<input aria-invalid="true" aria-errormessage="err"> <!-- validation error -->
<div aria-disabled="true">                          <!-- disabled (non-native) -->
<div aria-hidden="true">                            <!-- hide from AT entirely -->
  <!-- use for decorative icons, duplicate text, etc. -->

<!-- Live regions: announce dynamic content -->
<div aria-live="polite">Loading complete.</div>     <!-- announces when user is idle -->
<div aria-live="assertive">Error: session expired</div> <!-- announces immediately (interrupts) -->
<div role="alert">Critical error</div>              <!-- implicit assertive live region -->
<div role="status">File saved</div>                 <!-- implicit polite live region -->
```

### Custom tab component example

```tsx
// Full accessible tabs — implements the ARIA Authoring Practices tab pattern
function Tabs({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      const next = (index + 1) % tabs.length;
      setActiveIndex(next);
      tabRefs.current[next].focus();
    }
    if (e.key === 'ArrowLeft') {
      const prev = (index - 1 + tabs.length) % tabs.length;
      setActiveIndex(prev);
      tabRefs.current[prev].focus();
    }
    if (e.key === 'Home') { setActiveIndex(0); tabRefs.current[0].focus(); }
    if (e.key === 'End')  { setActiveIndex(tabs.length - 1); tabRefs.current[tabs.length - 1].focus(); }
  };

  const tabRefs = useRef([]);

  return (
    <div>
      <div role="tablist" aria-label="Main navigation">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeIndex === i}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeIndex === i ? 0 : -1} // roving tabindex
            ref={el => (tabRefs.current[i] = el)}
            onClick={() => setActiveIndex(i)}
            onKeyDown={e => handleKeyDown(e, i)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeIndex !== i}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

---

## 5. Keyboard Navigation

### Focus management rules

```text
Tab:          moves focus forward through interactive elements
Shift+Tab:    moves focus backward
Enter:        activates links and buttons
Space:        activates buttons, checkboxes
Arrow keys:   navigate within a widget (menus, listboxes, tabs, radio groups)
Escape:       close modals, dropdowns, cancel actions
Home/End:     first/last item in a list widget
```

### tabIndex

```html
<!-- tabIndex=0: element participates in natural tab order -->
<div role="button" tabIndex={0}>Custom button</div>

<!-- tabIndex=-1: focusable via JS (.focus()) but NOT in tab order -->
<!-- Use for: modal contents, items in a managed widget, off-screen elements -->
<div tabIndex={-1} ref={firstItemRef}>First modal item</div>

<!-- ✗ tabIndex > 0: creates a custom tab order — almost always wrong -->
<!-- Breaks predictable tab flow. Don't use. -->
<input tabIndex={3} />
```

### Roving tabindex (for composites)

```jsx
// For widgets with multiple interactive items (tabs, toolbar, menu):
// Only ONE element has tabIndex=0 at a time — the "active" one
// All others have tabIndex=-1
// Arrow keys move focus AND update which element has tabIndex=0

// This way: Tab enters the widget on the active item, then Tab exits
// Arrow keys navigate within the widget
// Avoids requiring many Tab presses to get through a list of 50 tabs

function RadioGroup({ options }) {
  const [selected, setSelected] = useState(0);
  const refs = useRef([]);

  const handleKeyDown = (e, index) => {
    let next = index;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % options.length;
    if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  next = (index - 1 + options.length) % options.length;
    setSelected(next);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup">
      {options.map((opt, i) => (
        <div
          key={opt.value}
          role="radio"
          aria-checked={selected === i}
          tabIndex={selected === i ? 0 : -1}  // roving tabindex
          ref={el => (refs.current[i] = el)}
          onClick={() => setSelected(i)}
          onKeyDown={e => handleKeyDown(e, i)}
        >
          {opt.label}
        </div>
      ))}
    </div>
  );
}
```

---

## 6. Focus Management

### Modal dialogs

```tsx
// When a modal opens:
// 1. Move focus to the first focusable element inside the modal
// 2. Trap focus within the modal (Tab/Shift+Tab stay inside)
// 3. When modal closes: return focus to the element that opened it

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  const triggerRef = useRef(null); // set by parent to track the opener

  useEffect(() => {
    if (isOpen) {
      // Focus the first focusable element in the modal
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Focus trap
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;

    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
      onKeyDown={handleKeyDown}
    >
      <h2 id="modal-title">Confirm Action</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}

// In practice: use @radix-ui/react-dialog or similar — handles all this correctly
```

### Skip links

```html
<!-- Allow keyboard users to skip past repeated navigation to main content -->
<!-- First focusable element on the page — visually hidden until focused -->

<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<nav>...</nav>

<main id="main-content" tabIndex={-1}>  {/* tabIndex=-1 so it can receive focus */}
  ...
</main>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  z-index: 999;
  padding: 0.5rem 1rem;
  background: #000;
  color: #fff;
}
.skip-link:focus {
  top: 0; /* visible when focused */
}
```

---

## 7. Screen Readers

### How screen readers work

```text
Screen readers:
  macOS/iOS: VoiceOver (built-in — free)
  Windows:   NVDA (free), JAWS (expensive, common in enterprise)
  Android:   TalkBack

Screen readers read the accessibility tree (not the visual DOM).
The accessibility tree is built from semantic HTML + ARIA.

Key VoiceOver shortcuts (Mac):
  VO = Control+Option
  VO+Right/Left:  move to next/previous element
  VO+Space:       activate element
  VO+H:           jump to next heading
  VO+T:           jump to next table
  VO+W:           read current word/item
  VO+U:           open rotor (navigate by headings, links, landmarks)
  Cmd+F5:         toggle VoiceOver on/off
```

### What screen readers announce

```text
For each focused element, a screen reader typically announces:
  1. Accessible name (what it is called)
  2. Role (button, link, heading level, checkbox...)
  3. State (checked, expanded, selected, disabled, invalid...)
  4. Value (text content, input value)

Example announcements:
  <button>Save changes</button>  → "Save changes, button"
  <input type="checkbox" checked> → "checked, checkbox"
  <h2>User Settings</h2>          → "User Settings, heading level 2"
  <a href="/home">Home</a>        → "Home, link"
  <button aria-expanded="true">Menu</button> → "Menu, expanded, button"
```

---

## 8. Color, Contrast & Visual Design

```text
WCAG 1.4.3 — Contrast minimum (AA):
  Normal text (<18pt or <14pt bold): contrast ratio ≥ 4.5:1
  Large text (≥18pt or ≥14pt bold):  contrast ratio ≥ 3:1
  Decorative text / logos:           no requirement

WCAG 1.4.11 — Non-text contrast (AA):
  UI components (button borders, input outlines): ≥ 3:1 against background
  Informational graphics/icons: ≥ 3:1

Contrast ratio:
  1:1 = no contrast (text same as background)
  21:1 = maximum (black on white)
  Check with: https://webaim.org/resources/contrastchecker/
  Or DevTools: Elements → Accessibility → Color contrast
```

```css
/* ✗ Common failure: gray placeholder text */
::placeholder {
  color: #aaa; /* often fails 4.5:1 against white */
}

/* ✓ Ensure sufficient contrast */
::placeholder {
  color: #767676; /* 4.54:1 against white — passes AA */
}

/* ✓ Focus indicators — must be visible */
/* Don't: outline: none — destroys keyboard usability */
*:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* ✓ Modern focus-visible: only show outline for keyboard, not mouse click */
*:focus:not(:focus-visible) {
  outline: none;
}
*:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}
```

```text
Don't convey information by color alone (WCAG 1.4.1):
  ✗ "Required fields are shown in red"
  ✓ "Required fields are marked with * and shown in red"

  ✗ Error state: input border turns red
  ✓ Error state: input border turns red + error icon + error message text

Color blindness:
  ~8% of men have some form of color blindness.
  Use patterns, labels, icons in addition to color for meaning.
  Check with: Chrome DevTools → Rendering → Emulate vision deficiencies
```

---

## 9. React Accessibility Patterns

### Forms and error messages

```tsx
function TaskForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    onSubmit({ title });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="task-title">
          Task title
          <span aria-hidden="true"> *</span>  {/* decorative asterisk */}
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(''); }}
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? 'title-error' : undefined}
        />
        {error && (
          <p id="title-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <button type="submit">Add task</button>
    </form>
  );
}
```

### Loading states

```tsx
// Loading: announce to screen readers that content is loading
function DataTable({ isLoading, data }) {
  return (
    <div>
      {isLoading ? (
        <div aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading tasks...</span>
          <Spinner aria-hidden="true" />
        </div>
      ) : (
        <div aria-live="polite">
          <table>...</table>
        </div>
      )}
    </div>
  );
}

// sr-only: visually hidden but accessible to screen readers
// Tailwind has this built in: className="sr-only"
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

### Icon buttons

```tsx
// ✗ No accessible name — screen reader says "button" with no context
<button onClick={onClose}>
  <XIcon />
</button>

// ✓ aria-label
<button onClick={onClose} aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

// ✓ Visually hidden text (shows on focus for sighted keyboard users too)
<button onClick={onClose}>
  <XIcon aria-hidden="true" />
  <span className="sr-only">Close dialog</span>
</button>
```

---

## 10. Testing Accessibility

### Automated tools (catch ~30% of issues)

```bash
# axe-core (most popular)
npm install -D @axe-core/react

# In development — logs violations to console
import React from 'react';
if (process.env.NODE_ENV !== 'production') {
  const axe = require('@axe-core/react');
  axe(React, ReactDOM, 1000);
}

# Lighthouse: DevTools → Lighthouse → check Accessibility
# aXe DevTools browser extension: highlights issues in-browser

# eslint-plugin-jsx-a11y: catch issues at write time
npm install -D eslint-plugin-jsx-a11y
# .eslintrc: "plugins": ["jsx-a11y"], "extends": ["plugin:jsx-a11y/recommended"]
```

### Manual testing checklist

```text
Keyboard test:
  □ Tab through every interactive element in logical order
  □ All interactive elements are reachable by Tab
  □ Visible focus indicator is always present
  □ No keyboard traps (except modals — which have intentional traps)
  □ Modal: focus trapped inside, Escape closes, focus returns to trigger

Screen reader test (VoiceOver on Mac):
  □ Turn on VoiceOver (Cmd+F5)
  □ Navigate with Tab — does each element make sense?
  □ Navigate with VO+Right — is there any "mystery content"?
  □ Navigate by headings (VO+U → Headings) — is the page outline logical?
  □ Navigate by landmarks — are all sections findable?
  □ Forms: are labels announced with their inputs?
  □ Errors: are error messages announced?
  □ Dynamic content: are updates announced (live regions)?
  □ Images: are alt texts meaningful (not "image.jpg")?
  □ Modals: are they announced as dialogs?

Visual test:
  □ All text meets contrast ratio (check with DevTools or browser extension)
  □ Information is not conveyed by color alone
  □ Text reflows at 200% zoom without horizontal scroll
  □ No content is hidden when browser font size is increased
```

---

## 11. Common Interview Questions

### "What is ARIA and when should you use it?"

> ARIA (Accessible Rich Internet Applications) is a set of HTML attributes that add accessibility information to elements. The first rule of ARIA: don't use it if native HTML does the job. A `<button>` is better than `<div role="button">` because the button has built-in keyboard handling and focus. Use ARIA for custom interactive widgets — tabs, modals, comboboxes — where no native HTML equivalent exists. Key attributes: `role` (what it is), `aria-label`/`aria-labelledby` (what to call it), `aria-expanded`/`aria-selected`/`aria-checked` (its current state).

### "What is the difference between aria-label and aria-labelledby?"

> `aria-label` provides an inline string as the accessible name. Use when there's no visible text to reference. `aria-labelledby` references another element's ID — the referenced element's text becomes the accessible name. Prefer `aria-labelledby` when visible text exists (keeps visible and accessible names in sync). `aria-describedby` adds supplementary description (read after the label).

### "How do you implement an accessible modal?"

> On open: move focus to the first focusable element inside. Trap focus with Tab/Shift+Tab so it cycles only within the modal. Pressing Escape closes the modal. The container has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the dialog title. On close: return focus to the element that triggered the dialog opening. In practice: use Radix UI or Headless UI — they implement all this correctly.

### "What is WCAG and what level should you target?"

> WCAG (Web Content Accessibility Guidelines) is the international standard for web accessibility. Levels: A (minimum — some users blocked), AA (target for most — legal compliance standard), AAA (enhanced — not always achievable for all content). AA is the standard. Key AA rules: sufficient color contrast (4.5:1 for text), all functionality by keyboard, visible focus indicators, form inputs labeled, errors described in text.

### "What is a skip link?"

> A visually hidden link at the very top of the page that becomes visible on focus. Allows keyboard and screen reader users to jump past the repeated navigation to the main content, without pressing Tab 20+ times on every page load. The target needs `tabIndex="-1"` so it can receive programmatic focus when the link is activated.

---

## Most Asked Accessibility Interview Questions

### "What is WCAG and what are the levels?"

> WCAG (Web Content Accessibility Guidelines) is the international standard for web accessibility published by W3C. Organized around 4 principles (POUR): **Perceivable**, **Operable**, **Understandable**, **Robust**. Three conformance levels: **A** (minimum — must fix), **AA** (standard — required by most laws and hiring expectations), **AAA** (enhanced — aspirational, not always achievable). Most companies target AA. Key laws: ADA (USA), Section 508 (US federal), EN 301 549 (EU).

### "What is ARIA and when should you use it?"

> ARIA (Accessible Rich Internet Applications) is a set of attributes (`role`, `aria-label`, `aria-expanded`, etc.) that add semantic information to HTML for assistive technologies. The #1 rule: **use native HTML elements first** — `<button>` is better than `<div role="button">` because it's keyboard-focusable, activatable with Enter/Space, and communicates role automatically. Use ARIA only when native HTML can't express the semantics (e.g., custom dropdowns, modals, tabs, live regions).

```html
<!-- ✗ Don't do this — needs all ARIA manually + keyboard handling -->
<div role="button" tabindex="0" aria-pressed="false" onclick="...">Click me</div>

<!-- ✓ Use native button — gets everything for free -->
<button type="button">Click me</button>

<!-- ✓ ARIA where HTML is insufficient — custom modal -->
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 id="modal-title">Confirm Delete</h2>
</div>
```

### "What is the minimum color contrast ratio?"

> WCAG AA requires: **4.5:1** for normal text (< 18pt or < 14pt bold), **3:1** for large text (≥ 18pt or ≥ 14pt bold) and UI components (buttons borders, icons, input borders). WCAG AAA: 7:1 for normal text. Check with tools: WebAIM Contrast Checker, browser DevTools accessibility panel. Common failure: light gray text on white background.

### "What elements must be keyboard accessible?"

> All interactive elements must be reachable and operable with keyboard alone: links (`Tab`, `Enter`), buttons (`Tab`, `Enter`, `Space`), form fields (`Tab`), dropdowns (`Arrow` keys), modals (trap focus inside, `Escape` to close), dialogs, date pickers. Test by unplugging your mouse and tabbing through the whole page. The tab order should follow the visual reading order.

### "What is a focus trap and when do you need one?"

> A focus trap keeps keyboard focus inside a component — typically a modal dialog. Without it, pressing Tab in a modal would move focus behind it to the page underneath, which is disorienting for screen reader users. Implement by intercepting Tab/Shift+Tab when focus would leave the container and cycling back. Libraries: `focus-trap-react`, Headless UI dialogs handle this automatically.

### "What are ARIA live regions?"

> Live regions announce dynamic content changes to screen readers without focus moving to the element. `aria-live="polite"` — announces when idle (non-urgent: stock ticker, search results). `aria-live="assertive"` — interrupts immediately (errors, alerts — use sparingly). Use `role="status"` for polite and `role="alert"` as shorthand.

```html
<!-- Search results update — announce when ready -->
<div aria-live="polite" aria-atomic="true">
    Found 42 results
</div>

<!-- Error message — announce immediately -->
<div role="alert">
    Invalid email address
</div>
```

### "What alt text should images have?"

> **Informative images**: describe what the image conveys — not "image of" or "photo of", but what it communicates. **Decorative images**: `alt=""` — screen reader skips it entirely. **Functional images** (buttons/links): describe the action, not the image (e.g., `alt="Search"` not `alt="magnifying glass"`). **Complex images** (charts/graphs): provide a text description of the data, not just "bar chart". Never omit `alt` — that causes screen readers to read the file name.
