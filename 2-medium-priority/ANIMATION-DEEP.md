# Animation on the Web — CSS, Web Animations, Motion, and View Transitions

**Priority: MEDIUM**

> How to add motion that feels good and stays fast: what makes animation cheap or janky,
> CSS transitions and keyframes, animating `display: none` and `height: auto` (finally
> possible), the Web Animations API, FLIP, Motion (formerly Framer Motion) for React —
> enter/exit, layout and shared-element animations, gestures, scroll-linked effects —
> the View Transitions API for page and state changes, scroll-driven CSS animations,
> reduced motion and accessibility, performance debugging, testing, and interview questions.
>
> Support notes checked November 2026. Several CSS features here are new — check
> caniuse/MDN and keep a non-animated fallback.

---

## Table of Contents

- [1. The Mental Model — What Animation Is For](#1-the-mental-model--what-animation-is-for)
- [2. Performance — Why Some Animations Jank](#2-performance--why-some-animations-jank)
- [3. Timing and Easing — Making Motion Feel Right](#3-timing-and-easing--making-motion-feel-right)
- [4. CSS Transitions](#4-css-transitions)
- [5. CSS Keyframe Animations](#5-css-keyframe-animations)
- [6. Animating Enter and Exit — display none, @starting-style](#6-animating-enter-and-exit--display-none-starting-style)
- [7. Animating Height to auto](#7-animating-height-to-auto)
- [8. The Web Animations API](#8-the-web-animations-api)
- [9. FLIP — Animating Layout Changes by Hand](#9-flip--animating-layout-changes-by-hand)
- [10. Choosing a Tool in React](#10-choosing-a-tool-in-react)
- [11. Motion for React — Basics](#11-motion-for-react--basics)
- [12. Exit Animations — AnimatePresence](#12-exit-animations--animatepresence)
- [13. Layout and Shared-Element Animations](#13-layout-and-shared-element-animations)
- [14. Variants and Staggering](#14-variants-and-staggering)
- [15. Gestures — Hover, Tap, Drag](#15-gestures--hover-tap-drag)
- [16. Scroll-Linked and Scroll-Triggered Animation](#16-scroll-linked-and-scroll-triggered-animation)
- [17. The View Transitions API](#17-the-view-transitions-api)
- [18. Route Transitions in React Apps](#18-route-transitions-in-react-apps)
- [19. Common UI Recipes](#19-common-ui-recipes)
- [20. Accessibility — Reduced Motion and Safe Motion](#20-accessibility--reduced-motion-and-safe-motion)
- [21. Debugging Animation Performance](#21-debugging-animation-performance)
- [22. Testing Animated UIs](#22-testing-animated-uis)
- [23. Other Libraries — GSAP, React Spring, Lottie, Rive](#23-other-libraries--gsap-react-spring-lottie-rive)
- [24. Common Pitfalls](#24-common-pitfalls)
- [25. Interview Questions](#25-interview-questions)
- [Related Files](#related-files)

---

## 1. The Mental Model — What Animation Is For

```text
‼️ GOOD UI ANIMATION EXPLAINS A CHANGE. It is not decoration.

   Purpose                                   Example
   ────────────────────────────────────────  ────────────────────────────────────────
   Show where something came from / went     a modal grows from the button that opened it;
                                             an item flies into the cart
   Show that something changed               a counter ticks, a row highlights after save
   Keep context during a layout change       list items slide when one is removed,
                                             instead of everything jumping
   Give feedback for an action               button press scale, toggle slides
   Signal state                              skeleton shimmer, spinner, progress bar
   Guide attention                           a subtle pulse on a new notification

   If you can't say which of these an animation does, it probably shouldn't exist.
   Frequently-used UI (menus, typing, tab switches) should be fast or instant — users see it
   hundreds of times a day.
```

---

## 2. Performance — Why Some Animations Jank

```text
‼️ THE BROWSER HAS ~16.7ms PER FRAME at 60Hz (8.3ms at 120Hz).

   What you animate decides how much work each frame costs:

   ANIMATE                         WORK PER FRAME                           COST
   ──────────────────────────────  ───────────────────────────────────────  ───────────
   transform (translate, scale,    Composite only — can run on the           ‼️ cheapest
   rotate), opacity                compositor/GPU thread, even while JS      (use these)
                                   is busy
   filter, clip-path               Paint + composite (often GPU-assisted)    medium
   color, background, box-shadow   Paint + composite                         medium
   width, height, top, left,       LAYOUT + paint + composite — and layout   ‼️ expensive
   margin, padding, font-size      can affect the whole page                 (avoid)

   So:
     move something       → transform: translate()   not  left/top
     resize something     → transform: scale()       not  width/height (or FLIP, §9)
     fade                 → opacity
     reveal               → clip-path / transform    not  height (unless you must, §7)
     box-shadow on hover  → animate the opacity of a pseudo-element that has the shadow
```

```css
/* Animating a shadow cheaply: fade in a pre-rendered shadow */
.card { position: relative; transition: transform 200ms ease-out; }
.card::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.18);
  opacity: 0; transition: opacity 200ms ease-out;
}
.card:hover { transform: translateY(-2px); }
.card:hover::after { opacity: 1; }
```

```text
COMPOSITOR LAYERS AND will-change
  - The browser promotes animated transform/opacity elements to their own layer.
  - will-change: transform  hints this ahead of time (avoids a first-frame hitch).
  - ‼️ Don't sprinkle it everywhere: every layer costs GPU memory; hundreds of layers make
    things SLOWER. Add it just before an animation (or on elements that animate often),
    remove it after.
  - JS-driven animations (setting styles in requestAnimationFrame) run on the MAIN thread —
    they stutter when the main thread is busy. CSS animations / WAAPI of transform/opacity
    can keep running smoothly. That's why Motion uses WAAPI for these when possible.
```

---

## 3. Timing and Easing — Making Motion Feel Right

```text
DURATIONS (rough guide)
  micro-interactions (hover, press, toggle)    100–150ms
  small elements appearing (tooltip, menu)     150–200ms
  medium (modal, drawer, toast)                200–300ms
  large / full-screen transitions              300–500ms
  ‼️ Exits faster than enters (~70–80% of the enter duration): when users dismiss
     something, they're done with it.
  Distance matters: bigger movements need slightly longer durations.
  Anything over ~500ms for routine UI feels sluggish.

EASING
  ease-out     fast start, slow end   → ‼️ things ENTERING / responding to the user
                                        (feels responsive — motion starts immediately)
  ease-in      slow start, fast end   → things LEAVING the screen
  ease-in-out  slow, fast, slow       → things moving from A to B on screen
  linear       constant               → only for continuous motion (spinners, progress,
                                        marquee) or opacity-only fades
  ❌ ease-in for enter animations feels laggy: nothing seems to happen at first.

  Custom curves: cubic-bezier(0.2, 0, 0, 1)  ("emphasized decelerate"-style ease-out)
  Springs: physics-based (stiffness, damping) — no fixed duration, natural for drag and
           gestures, interruptible without a "jump". Motion's default for transforms.
  CSS linear() can approximate springs and bounces:
    transition-timing-function: linear(0, 0.6 20%, 1.05 45%, 0.98 70%, 1);
```

---

## 4. CSS Transitions

```css
/* A transition animates between two states when a property CHANGES */
.button {
  background: var(--accent);
  transform: scale(1);
  transition:
    background-color 150ms ease-out,
    transform 100ms ease-out;
  /* ‼️ list properties explicitly — `transition: all` animates things you didn't mean to
     (layout props, colors from theme switches) and is harder to reason about */
}
.button:hover  { background: var(--accent-hover); }
.button:active { transform: scale(0.97); }

/* Different timing in and out: the transition on the TARGET state applies when entering it */
.menu       { opacity: 0; transform: translateY(-4px); transition: opacity 100ms ease-in, transform 100ms ease-in; }
.menu.open  { opacity: 1; transform: none;             transition: opacity 150ms ease-out, transform 150ms ease-out; }
```

```text
‼️ TRANSITION GOTCHAS
  - Nothing animates when an element is INSERTED already in its final state — there's no
    "before" value. Insert in the start state, then change on the next frame
    (double rAF), or use @starting-style (§6).
  - display: none → block can't transition by default (§6).
  - height: 0 → auto doesn't transition by default (§7).
  - Changing several things in the same frame? The browser only sees the final state.
  - transitionend fires once PER PROPERTY, and not at all if the transition was interrupted
    or the element was hidden. Listen for transitioncancel too, or use WAAPI .finished (§8).
```

```js
// React: toggling a class drives the transition — the most common pattern
<div className={open ? 'panel panel--open' : 'panel'}>...</div>

// Waiting for a transition to finish (e.g. unmount after fade-out)
el.addEventListener('transitionend', (e) => {
  if (e.propertyName !== 'opacity') return;   // ‼️ one event per property
  onDone();
}, { once: true });
```

---

## 5. CSS Keyframe Animations

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}

.toast {
  animation: fade-in-up 200ms ease-out both;
  /* name | duration | easing | fill-mode
     fill-mode both: hold the `from` styles during any delay and the `to` styles after */
}

@keyframes spin { to { transform: rotate(1turn); } }
.spinner { animation: spin 0.8s linear infinite; }

@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--s1) 25%, var(--s2) 50%, var(--s1) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

/* Staggering with a custom property set from JS/React: style={{ '--i': index }} */
.list-item { animation: fade-in-up 250ms ease-out both; animation-delay: calc(var(--i) * 40ms); }
```

```text
TRANSITION vs KEYFRAMES
  transition   between TWO states triggered by a change (hover, class toggle). Interruptible:
               reversing mid-way animates back from the current point. ‼️ Best for UI state.
  @keyframes   multi-step, looping, or run-on-insert animations (spinners, attention
               effects, entrance on mount). Restarting requires removing + re-adding the
               animation (or changing the key in React).

  Events: animationstart, animationiteration, animationend, animationcancel.
  Pause: animation-play-state: paused (e.g. pause shimmer when off-screen).
```

---

## 6. Animating Enter and Exit — display none, @starting-style

```text
‼️ THE OLD PROBLEM
   display: none → block switches instantly, so you couldn't fade a popover/dialog IN
   (no starting frame) or OUT (it disappears before the fade runs).

‼️ THE MODERN CSS ANSWER (Baseline-era features, ~2024+)
   1. @starting-style  — defines the styles an element starts from on its FIRST style
                         update (when inserted, or when it goes from display:none to shown)
   2. transition-behavior: allow-discrete — lets "discrete" properties like display and
                         overlay take part in a transition, flipping at the right moment
                         (display stays block until the fade-out finishes)
   Works for <dialog>, [popover], and any element toggled with display/hidden.
```

```css
/* A popover / dialog that fades + scales in AND out, pure CSS */
.popover {
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 150ms ease-out,
    transform 150ms ease-out,
    display 150ms allow-discrete,      /* keep it displayed during the exit */
    overlay 150ms allow-discrete;      /* keep it in the top layer during the exit */
}
.popover:not(:popover-open) {          /* the CLOSED state = exit target */
  opacity: 0;
  transform: scale(0.96);
}
@starting-style {                      /* where the ENTER animation starts from */
  .popover:popover-open {
    opacity: 0;
    transform: scale(0.96);
  }
}

/* <dialog> backdrop too */
dialog::backdrop { background: rgb(0 0 0 / 0.4); transition: background 200ms, display 200ms allow-discrete, overlay 200ms allow-discrete; }
@starting-style { dialog[open]::backdrop { background: rgb(0 0 0 / 0); } }
```

```text
IN REACT, conditional rendering ({open && <Menu/>}) REMOVES the element immediately, so
CSS can't run an exit animation on it. Options:
  - keep it mounted and toggle hidden/popover/open + the CSS above
  - delay unmount until the animation ends (onAnimationEnd → setMounted(false))
  - Motion's AnimatePresence (§12), which does exactly that for you
  - View Transitions (§17)
```

---

## 7. Animating Height to auto

```text
‼️ height: 0 → height: auto doesn't transition (the browser can't interpolate to "auto").

  OPTIONS, best first
  1. interpolate-size: allow-keywords (Chromium; progressive enhancement elsewhere):
       :root { interpolate-size: allow-keywords; }
       .panel { height: 0; overflow: clip; transition: height 250ms ease-out; }
       .panel.open { height: auto; }
     Also: calc-size(auto, size) for math with intrinsic sizes.
  2. The grid trick (works everywhere): animate grid-template-rows 0fr → 1fr
  3. Measure in JS: set height to scrollHeight px, transition, then set back to auto
  4. Motion: animate={{ height: 'auto' }} — it measures for you (§19)
  5. <details> + ::details-content with interpolate-size (newer)

  ‼️ Height animations trigger LAYOUT every frame. Fine for one accordion; avoid on many
     elements at once or on huge content. For lists, prefer transforms (FLIP/layout animations).
```

```css
/* The grid trick */
.accordion-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 250ms ease-out;
}
.accordion-body.open { grid-template-rows: 1fr; }
.accordion-body > .inner { overflow: hidden; }   /* ‼️ the single child must clip */
```

```jsx
<button aria-expanded={open} aria-controls="faq-1" onClick={() => setOpen(o => !o)}>Question</button>
<div id="faq-1" className={open ? 'accordion-body open' : 'accordion-body'}>
  <div className="inner">Answer text…</div>
</div>
```

---

## 8. The Web Animations API

```js
// Keyframes in JS, executed by the browser's animation engine (same as CSS animations —
// transform/opacity can run off the main thread).
const anim = el.animate(
  [
    { opacity: 0, transform: 'translateY(8px)' },
    { opacity: 1, transform: 'none' },
  ],
  { duration: 200, easing: 'ease-out', fill: 'both' },
);

await anim.finished;            // ‼️ a Promise — no transitionend juggling
anim.pause(); anim.play(); anim.reverse(); anim.cancel();
anim.playbackRate = 2;
anim.currentTime = 100;         // scrub

// Animate from the CURRENT computed value (omit the first keyframe)
el.animate({ transform: 'translateX(200px)' }, { duration: 300, fill: 'forwards' });

// Commit the end state into inline styles, then drop the animation (avoids
// fill: 'forwards' animations piling up and overriding styles forever)
anim.commitStyles(); anim.cancel();

document.getAnimations();       // every running animation (CSS ones too) — handy in tests/debugging
```

```text
WHEN TO USE WAAPI
  - you need to know when it finished (await .finished), reverse, pause, or scrub
  - values are computed at runtime (positions, FLIP deltas)
  - you'd otherwise write a requestAnimationFrame loop for a simple tween
  Motion's animate() is built on top of WAAPI where possible.
```

---

## 9. FLIP — Animating Layout Changes by Hand

```text
‼️ FLIP = First, Last, Invert, Play — animate a LAYOUT change using only transforms.

   Problem: an element changes position or size because the layout changed (list
   reorder, item removed above it, grid ↔ list view). Animating top/width is slow, and
   the new position is decided by the layout engine, not you.

   F  FIRST   measure the element's rect BEFORE the change     (getBoundingClientRect)
   L  LAST    apply the change (DOM / state), measure AGAIN
   I  INVERT  set a transform that moves it back to where it WAS:
              translate(first.x - last.x, first.y - last.y) scale(first.w / last.w, ...)
   P  PLAY    animate that transform to none → it slides from old place to new place

   The layout jumps instantly, but the user sees a smooth transform-only animation.
   This is exactly what Motion's `layout` prop and the View Transitions API do for you.
```

```js
function flip(el, change) {
  const first = el.getBoundingClientRect();     // F
  change();                                      // apply DOM change synchronously
  const last = el.getBoundingClientRect();      // L (forces layout — once, deliberately)
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const sx = first.width / last.width;
  const sy = first.height / last.height;
  el.animate(                                    // I + P
    [
      { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transformOrigin: 'top left', transform: 'none' },
    ],
    { duration: 300, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  );
}
// In React: measure "first" before the state update (or in getSnapshotBeforeUpdate /
// a ref captured in the event handler), then do "last + animate" in useLayoutEffect —
// before the browser paints the jumped layout.
// Scale distorts children (text squashes) — Motion corrects this automatically.
```

---

## 10. Choosing a Tool in React

```text
  NEED                                              USE
  ────────────────────────────────────────────────  ────────────────────────────────────
  Hover/press/focus effects, simple state changes   ‼️ CSS transitions (+ class toggles)
  Spinners, skeletons, attention loops              CSS @keyframes
  Popover/dialog/menu enter + exit                  CSS @starting-style + allow-discrete
                                                    (or Motion if you need more control)
  Exit animations on unmount, list add/remove,      ‼️ Motion (AnimatePresence, layout)
  reordering, shared elements, gestures, springs
  Page/route or big state transitions               View Transitions API (+ router support)
  Scroll progress / parallax / reveal on scroll     CSS scroll-driven animations, or
                                                    Motion useScroll / whileInView
  Complex timelines, marketing pages, SVG morph     GSAP
  Designer-made illustrations/animations            Lottie / Rive
  Canvas / WebGL scenes                             three.js / react-three-fiber, PixiJS

  Start with CSS. Add Motion when you need exit animations, layout animations or gestures.
  ‼️ Motion's full `motion` component is ~30kB+ gzipped; use the `m` component + LazyMotion
     to load features on demand if bundle size matters (§11).
```

---

## 11. Motion for React — Basics

```text
Motion (motion.dev) is the new name for Framer Motion. Same API, new package:
   npm install motion
   import { motion, AnimatePresence } from 'motion/react'
   (old imports from 'framer-motion' still work in existing code)
```

```tsx
import { motion } from 'motion/react';

// motion.div / motion.button / motion.li ... — any HTML or SVG element
function Card() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}        // state on mount (false = skip the mount animation)
      animate={{ opacity: 1, y: 0 }}        // target — animates whenever these values CHANGE
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      Hello
    </motion.div>
  );
}
// x, y, scale, rotate are shorthand transform values — Motion composes them into one transform.
// Units: numbers are px for x/y; strings like '50%' or '2rem' work too.

// Animate from React state — change the prop, Motion animates to it
<motion.div animate={{ x: open ? 240 : 0, opacity: open ? 1 : 0.6 }} />

// Transitions: tween (duration + ease) or spring (physics)
transition={{ type: 'spring', stiffness: 400, damping: 30 }}
transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }}   // easier spring knobs
transition={{ delay: 0.1, opacity: { duration: 0.1 } }}             // per-property overrides
// Default: springs for physical properties (x, scale), tweens for opacity/colors.

// Keyframes
animate={{ scale: [1, 1.15, 1] }}   // pulse

// Imperative control
import { useAnimate } from 'motion/react';
const [scope, animate] = useAnimate();
async function shake() {
  await animate(scope.current, { x: [0, -8, 8, -4, 4, 0] }, { duration: 0.4 });
}
// <div ref={scope}>...</div>

// Smaller bundles: m + LazyMotion
import { LazyMotion, domAnimation, m } from 'motion/react';
<LazyMotion features={domAnimation}><m.div animate={{ opacity: 1 }} /></LazyMotion>
```

---

## 12. Exit Animations — AnimatePresence

```text
‼️ WHY YOU NEED IT
   {open && <Modal/>} — when open becomes false, React removes the Modal immediately.
   There's no moment left to animate it out.

   <AnimatePresence> keeps a removed child in the DOM until its `exit` animation finishes,
   then lets React remove it.

   RULES
   1. AnimatePresence must stay MOUNTED; the conditional goes INSIDE it.
   2. Each direct child needs a unique, stable `key`.
   3. The child (or something inside it) must be a motion component with an `exit` prop.
```

```tsx
import { AnimatePresence, motion } from 'motion/react';

function Toasts({ toasts }) {
  return (
    <ul className="toasts" aria-live="polite">
      <AnimatePresence initial={false}>     {/* initial={false}: no animation for items already there on first render */}
        {toasts.map(t => (
          <motion.li
            key={t.id}                       // ‼️ stable key — never the index
            layout                           // remaining toasts slide into place (§13)
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}   // faster exit
          >
            {t.message}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Modal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="backdrop" className="backdrop" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Swap content with a cross-fade: change the KEY
<AnimatePresence mode="wait">       {/* 'wait': old exits fully before new enters */}
  <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <Step n={step} />
  </motion.div>
</AnimatePresence>
// mode: 'sync' (default, both at once) | 'wait' | 'popLayout' (exiting element is taken out
// of layout immediately so siblings can reflow — pairs with `layout`)

// onExitComplete={() => ...} runs after all exits finish (e.g. restore focus, scroll).
```

---

## 13. Layout and Shared-Element Animations

```tsx
// ── layout: animate ANY layout change automatically (FLIP under the hood) ───
// Reordering, filtering, expanding, changing justify-content — just add `layout`.
function FilterableGrid({ items }) {
  return (
    <ul className="grid">
      <AnimatePresence>
        {items.map(item => (
          <motion.li key={item.id} layout
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            {item.name}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

// A toggle switch whose knob slides because its parent's justify-content changes
<div className="switch" data-on={on} onClick={() => setOn(!on)}
     style={{ display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
  <motion.span layout className="knob" transition={{ type: 'spring', stiffness: 700, damping: 35 }} />
</div>

// layout="position" → animate only position, not size (avoids text distortion)
// LayoutGroup → elements in different components animate together when one changes
```

```tsx
// ── layoutId: SHARED ELEMENT transitions ────────────────────────────────────
// Two different elements with the same layoutId: when one unmounts and the other
// mounts, Motion animates from the old one's position/size to the new one's.

// Tabs with a sliding underline
function Tabs({ tabs, active, onChange }) {
  return (
    <div role="tablist">
      {tabs.map(tab => (
        <button key={tab.id} role="tab" aria-selected={active === tab.id} onClick={() => onChange(tab.id)}
                style={{ position: 'relative' }}>
          {tab.label}
          {active === tab.id && (
            <motion.span layoutId="tab-underline" className="underline"
                         style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 }} />
          )}
        </button>
      ))}
    </div>
  );
}

// Card → expanded detail ("magic move")
{selected
  ? <motion.div layoutId={`card-${selected.id}`} className="detail">...</motion.div>
  : items.map(i => <motion.div key={i.id} layoutId={`card-${i.id}`} onClick={() => setSelected(i)}>...</motion.div>)}
// Wrap in AnimatePresence if the shared element should also animate out when closing.
```

```text
‼️ LAYOUT ANIMATION GOTCHAS
  - Children get squashed/stretched while the parent scales → add `layout` to children too
    (Motion corrects distortion for layout children), or use layout="position".
  - border-radius and box-shadow distort under scale → set them via style={{ borderRadius }}
    on the motion element so Motion can correct them.
  - Elements inside scrolling containers: add layoutScroll to the scroll container.
  - position: fixed ancestors: layoutRoot.
  - Expensive with hundreds of items — measure every element each change.
```

---

## 14. Variants and Staggering

```tsx
// Variants: named animation states, propagated from parent to children
const list = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { when: 'beforeChildren', delayChildren: stagger(0.04) } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

import { motion, stagger } from 'motion/react';

function Menu({ links }) {
  return (
    <motion.ul variants={list} initial="hidden" animate="show">
      {links.map(l => (
        // children inherit "hidden"/"show" from the parent — no initial/animate needed
        <motion.li key={l.href} variants={item}><a href={l.href}>{l.label}</a></motion.li>
      ))}
    </motion.ul>
  );
}
// Older API: transition: { staggerChildren: 0.04 }
// ‼️ Keep staggers short (20–50ms per item) and cap them — 50 items × 50ms = 2.5s of waiting.
```

---

## 15. Gestures — Hover, Tap, Drag

```tsx
// Hover / press / focus states with animation
<motion.button
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  whileFocus={{ boxShadow: '0 0 0 3px var(--ring)' }}
  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
>
  Save
</motion.button>
// whileHover only applies to real hover (not emulated on touch). whileTap works for
// keyboard Enter on focusable elements too.

// Drag
<motion.div
  drag="x"                                   // true | 'x' | 'y'
  dragConstraints={{ left: -200, right: 0 }} // or a ref to a container element
  dragElastic={0.2}                          // rubber-band past the constraints
  dragMomentum={false}
  onDragEnd={(e, info) => { if (info.offset.x < -100 || info.velocity.x < -500) onDismiss(); }}
/>
// Swipe-to-dismiss / bottom sheets: use offset AND velocity so a quick flick counts.
// ‼️ Provide a non-drag alternative (button) for keyboard and assistive tech users.
// ‼️ Set touch-action appropriately (Motion sets it for drag="x"/"y") — see the DOM guide §10.

// Reorderable list
import { Reorder } from 'motion/react';
<Reorder.Group axis="y" values={items} onReorder={setItems}>
  {items.map(item => <Reorder.Item key={item.id} value={item}>{item.label}</Reorder.Item>)}
</Reorder.Group>
// Simple vertical/horizontal lists. For multi-container drag/drop, virtualized lists, or
// keyboard-accessible sorting, use dnd-kit.
```

---

## 16. Scroll-Linked and Scroll-Triggered Animation

```text
TWO DIFFERENT THINGS
  scroll-TRIGGERED   play an animation once when an element enters the viewport
                     ("fade in sections as you reach them")
  scroll-LINKED      animation progress is tied to scroll position, scrubbing back and forth
                     (reading progress bar, parallax, header shrinking with scroll)
```

```css
/* ── CSS scroll-driven animations (no JS, runs off the main thread) ─────────
   Supported in Chromium and Safari 26; Firefox behind a flag at the time of writing —
   always pair with @supports so other browsers just show the static state. */

/* Reading progress bar tied to page scroll */
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@supports (animation-timeline: scroll()) {
  .progress {
    position: fixed; inset: 0 0 auto 0; height: 3px; transform-origin: left;
    animation: grow linear both;
    animation-timeline: scroll(root);      /* progress = how far the page is scrolled */
  }
}

/* Reveal elements as they enter the viewport */
@keyframes reveal { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@supports (animation-timeline: view()) {
  .reveal {
    animation: reveal ease-out both;
    animation-timeline: view();            /* progress = element's journey through the viewport */
    animation-range: entry 0% entry 60%;   /* only during the first part of entering */
  }
}
```

```tsx
// ── Motion: scroll-triggered ────────────────────────────────────────────────
<motion.section
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}   // once: don't re-animate when scrolling back
  transition={{ duration: 0.4, ease: 'easeOut' }}
/>
// (Uses IntersectionObserver under the hood.)

// ── Motion: scroll-linked ───────────────────────────────────────────────────
import { motion, useScroll, useTransform, useSpring } from 'motion/react';

function ReadingProgress() {
  const { scrollYProgress } = useScroll();                    // 0 → 1 for the page
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return <motion.div className="progress" style={{ scaleX, transformOrigin: 'left' }} />;
}

function ParallaxHero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);   // map progress → value
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  return <section ref={ref}><motion.img src="/hero.jpg" alt="" style={{ y, opacity }} /></section>;
}
// ‼️ These are motion VALUES: they update the DOM directly without re-rendering React on
// every scroll frame. Never put scroll position in useState for animation.
```

---

## 17. The View Transitions API

```text
‼️ WHAT IT DOES

   document.startViewTransition(() => updateTheDOM())

   1. the browser takes a SCREENSHOT of the current page
   2. runs your update (React state change, DOM change, route change)
   3. snapshots the new state
   4. cross-fades old → new by default, using pseudo-elements you can style with CSS
   Elements with the same view-transition-name in old and new state MORPH from one
   position/size to the other — shared-element transitions with no library.

   SUPPORT
     same-document (SPA) transitions: Chromium, Safari 18+, Firefox 144+
     cross-document (MPA, normal page navigations): @view-transition { navigation: auto; }
       — Chromium and Safari; check Firefox
   Always feature-detect; without support, just run the update with no animation.
```

```js
function withViewTransition(update) {
  if (!document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();                       // fallback: instant
    return;
  }
  document.startViewTransition(update);
}

// React: the DOM must be updated SYNCHRONOUSLY inside the callback, so the browser
// snapshots the right "after" state → flushSync
import { flushSync } from 'react-dom';
withViewTransition(() => flushSync(() => setView('grid')));

// The transition object
const t = document.startViewTransition(() => flushSync(() => setPage(2)));
await t.finished;                    // also: t.ready, t.updateCallbackDone, t.skipTransition()
// t.types (where supported) / :active-view-transition-type(forward) for direction-specific CSS
```

```css
/* Default cross-fade timing */
::view-transition-old(root),
::view-transition-new(root) { animation-duration: 200ms; }

/* Shared element: give the thumbnail and the detail image the SAME name */
.thumb.is-selected, .detail-image { view-transition-name: product-image; }
/* ‼️ names must be UNIQUE on the page at any moment — set them only on the active item
   (e.g. inline style={{ viewTransitionName: `product-${id}` }} per item) */

/* Custom slide for the main content */
@keyframes slide-out { to { transform: translateX(-30px); opacity: 0; } }
@keyframes slide-in  { from { transform: translateX(30px); opacity: 0; } }
main { view-transition-name: main; }
::view-transition-old(main) { animation: 150ms ease-in both slide-out; }
::view-transition-new(main) { animation: 200ms ease-out both slide-in; }

/* Multi-page apps: opt in on BOTH pages */
@view-transition { navigation: auto; }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

```text
LIMITS
  - While a transition runs, the page shows snapshots: it isn't interactive for those
    few hundred ms. Keep them short.
  - Only one transition at a time; a new one skips the current one.
  - React's own <ViewTransition> component (integrating with transitions and Suspense) was
    experimental/canary-only at the time of writing — check the React docs before relying on it.
```

---

## 18. Route Transitions in React Apps

```tsx
// ── React Router (data/framework mode): built in ────────────────────────────
<Link to={`/products/${p.id}`} viewTransition>      {/* wraps the navigation in startViewTransition */}
  <img src={p.thumb} alt={p.name} style={{ viewTransitionName: `product-${p.id}` }} />
</Link>
// On the detail page: <img style={{ viewTransitionName: `product-${id}` }} />
// useViewTransitionState(to) → true while transitioning to `to` (set names only on the active item)
// navigate(to, { viewTransition: true }) for programmatic navigation.

// ── Next.js App Router: experimental viewTransition flag / next-view-transitions package,
//    or animate within layouts with Motion.

// ── Motion: animate the outlet by keying on the path ────────────────────────
function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();           // ‼️ capture the element, so the EXITING page keeps rendering
  return (                              //    its old content instead of the new route's
    <AnimatePresence mode="wait">
      <motion.main key={location.pathname}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}>
        {outlet}
      </motion.main>
    </AnimatePresence>
  );
}
```

```text
‼️ ROUTE TRANSITION ADVICE
  - Keep them short (150–250ms) — navigation should feel instant.
  - Animate only the content area, not the header/nav that stays.
  - Don't make users wait for an exit animation before the new page loads data.
  - Restore focus and scroll after the transition (see the routing guide §15).
```

---

## 19. Common UI Recipes

```tsx
// ── Accordion with Motion (height: auto) ────────────────────────────────────
function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>{title}</button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} key="content" style={{ overflow: 'hidden' }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}>
            <div style={{ padding: 12 }}>{children}</div>   {/* padding INSIDE, not on the animated box */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Number that counts up ───────────────────────────────────────────────────
import { animate, useMotionValue, useTransform } from 'motion/react';
function Counter({ value }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.6, ease: 'easeOut' });
    return () => controls.stop();
  }, [value]);
  return <motion.span aria-label={String(value)}>{rounded}</motion.span>;
}

// ── Highlight a row after it was updated (pure CSS) ─────────────────────────
// @keyframes flash { from { background: var(--highlight); } to { background: transparent; } }
// .row--updated { animation: flash 1.2s ease-out; }
// Re-trigger by changing the key: <tr key={`${row.id}-${row.updatedAt}`} className="row--updated">

// ── Shake an invalid field ──────────────────────────────────────────────────
const [scope, animateEl] = useAnimate();
function onInvalid() { animateEl(scope.current, { x: [0, -6, 6, -3, 3, 0] }, { duration: 0.35 }); }
// Always pair with a visible text error — motion alone isn't an error message.

// ── Skeleton → content cross-fade ───────────────────────────────────────────
<AnimatePresence mode="wait">
  {isLoading
    ? <motion.div key="skeleton" exit={{ opacity: 0 }}><Skeleton /></motion.div>
    : <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Content /></motion.div>}
</AnimatePresence>
```

---

## 20. Accessibility — Reduced Motion and Safe Motion

```text
‼️ prefers-reduced-motion

   Users with vestibular disorders (motion sickness, dizziness, migraines) turn on
   "Reduce motion" in their OS. Large movement, parallax, zooming and spinning can make
   them physically ill.

   "Reduce" doesn't mean "remove everything":
     ✅ keep: opacity fades, color changes, small instant feedback
     ❌ remove/replace: big slides, parallax, zoom/scale-in of large areas, auto-playing
        loops, scroll-linked movement, bouncing springs
```

```css
/* Option A: opt OUT globally (a common safety net) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Option B (better): only add movement when the user hasn't asked for less */
.panel { transition: opacity 200ms; }
@media (prefers-reduced-motion: no-preference) {
  .panel { transition: opacity 200ms, transform 250ms ease-out; }
}
```

```tsx
// Motion: respect the OS setting everywhere — transforms/layout animations are disabled,
// opacity/color still animate
import { MotionConfig, useReducedMotion } from 'motion/react';
<MotionConfig reducedMotion="user"><App /></MotionConfig>

// Per component: swap the movement for a fade
function Drawer({ open }) {
  const reduce = useReducedMotion();
  return <motion.aside animate={reduce ? { opacity: open ? 1 : 0 } : { x: open ? 0 : '-100%' }} />;
}
```

```text
OTHER RULES (WCAG)
  - Anything that moves, blinks or scrolls automatically for more than 5 seconds needs a
    way to PAUSE, stop or hide it (carousels, marquees, background videos) — 2.2.2.
  - Nothing flashes more than 3 times per second — can trigger seizures — 2.3.1.
  - Motion triggered by interaction (parallax on scroll) can be disabled — 2.3.3 (AAA).
  - Don't convey information ONLY through animation (the shake on an invalid field also
    needs a text error).
  - Don't move focus targets around while users try to click them.
  - Loading spinners need an accessible label (role="status" + text).
```

---

## 21. Debugging Animation Performance

```text
CHROME DEVTOOLS
  Performance panel → record while the animation runs:
    - frames in red / long "Animation Frame" entries = dropped frames
    - purple Layout / green Paint blocks every frame = you're animating layout/paint props
    - "Forced reflow" warnings = reading layout inside the animation loop
  Rendering drawer (⋮ → More tools → Rendering):
    - Paint flashing: green = repainted each frame (should be none for transform/opacity)
    - Layer borders: orange outlines = compositor layers (too many? will-change abuse)
    - Frame rendering stats: live FPS meter
    - Emulate prefers-reduced-motion
  Animations panel (⋮ → More tools → Animations):
    - captures CSS/WAAPI animations, slow them down to 10%/25%, scrub, edit easing curves
  Layers panel: why an element got its own layer, memory per layer

TEST ON A SLOW DEVICE
  CPU throttling 4–6× in DevTools, or a real mid-range Android phone. Your MacBook hides jank.
```

---

## 22. Testing Animated UIs

```text
  - jsdom doesn't run animations or layout: CSS transitions never fire transitionend,
    WAAPI may be missing (stub Element.prototype.animate), Motion animations complete
    instantly or not at all depending on setup.
  - ‼️ Disable animations in tests so assertions don't race:
      Motion:  import { MotionGlobalConfig } from 'motion/react';
               MotionGlobalConfig.skipAnimations = true;   // in the test setup file
      CSS:     Playwright → page.emulateMedia({ reducedMotion: 'reduce' }), or inject a
               stylesheet that zeroes durations; screenshots: animations: 'disabled'
  - Exit animations: with AnimatePresence, the element stays in the DOM until the exit ends —
    use findBy / waitForElementToBeRemoved instead of asserting removal immediately.
  - Visual regression tests need deterministic frames: disable animations and wait for fonts.
  - Test the reduced-motion path explicitly if it renders differently.
```

---

## 23. Other Libraries — GSAP, React Spring, Lottie, Rive

```text
  GSAP           Industry standard for complex, timeline-based animation (marketing sites,
                 storytelling, SVG morphing, ScrollTrigger). Now free for all uses, including
                 plugins. React: @gsap/react useGSAP() hook handles cleanup.
  React Spring   Spring-physics hooks (useSpring, useTransition). Good for physics-heavy UIs;
                 smaller community than Motion today.
  AutoAnimate    One line (useAutoAnimate) adds add/remove/move animations to a list —
                 great for quick wins.
  Lottie         Plays After Effects animations exported as JSON (lottie-web, dotLottie).
                 Watch file size and CPU cost; prefer dotLottie / the canvas renderer.
  Rive           Interactive, state-machine-driven vector animations designed in the Rive
                 editor; small files, runtime interaction (hover/click states).
  three.js / R3F 3D and WebGL scenes.
```

---

## 24. Common Pitfalls

```text
  Each entry:  ✗ symptom
                 why  → the cause
                 fix  → what to do

  ✗ ‼️ Animation stutters
      why  → animating width/height/top/left/margin (layout every frame)
      fix  → transform + opacity; FLIP / layout animations for size changes (§2, §9)

  ✗ Element appears instantly instead of fading in
      why  → inserted already in its final state; display none → block
      fix  → @starting-style + allow-discrete, or animate after mount (§6)

  ✗ ‼️ Exit animation never plays in React
      why  → conditional rendering removes the element immediately; or the conditional is
             around AnimatePresence instead of inside it; or no stable key
      fix  → AnimatePresence stays mounted, condition inside, unique key, exit prop (§12)

  ✗ height: auto won't animate
      why  → auto can't be interpolated by default
      fix  → interpolate-size, grid 0fr→1fr trick, or Motion height: 'auto' (§7)

  ✗ Text squashes during a layout animation
      why  → parent scale distorts children
      fix  → layout on children too, or layout="position" (§13)

  ✗ Shared element / view transition does nothing
      why  → duplicate view-transition-name on the page, or the DOM wasn't updated
             synchronously inside the callback
      fix  → unique names (only on the active item); flushSync in React (§17)

  ✗ transitionend handler runs several times / never
      why  → fires per property; doesn't fire if interrupted or hidden
      fix  → check e.propertyName; handle transitioncancel; or WAAPI .finished (§4, §8)

  ✗ `transition: all` animates surprising things
      why  → every property change animates (including layout props, theme switches)
      fix  → list properties explicitly (§4)

  ✗ GPU memory spikes / scrolling gets worse after adding will-change
      why  → too many compositor layers
      fix  → apply will-change only around actual animations (§2)

  ✗ Parallax/scroll effect re-renders React constantly
      why  → scroll position stored in state
      fix  → motion values (useScroll/useTransform) or CSS scroll-driven animations (§16)

  ✗ Users with motion sensitivity feel sick
      why  → no prefers-reduced-motion handling
      fix  → reduce movement to fades; MotionConfig reducedMotion="user" (§20)

  ✗ Carousel/marquee fails accessibility review
      why  → auto-moves > 5s without pause
      fix  → pause/stop controls; pause on hover/focus (§20)

  ✗ App feels slow even though it's fast
      why  → long or ease-in animations on frequent actions; staggered lists that take seconds
      fix  → 150–250ms, ease-out for enters, cap staggers (§3, §14)

  ✗ Flaky tests around animated elements
      why  → assertions race the animation; exit keeps elements in the DOM
      fix  → disable animations in tests; waitFor removal (§22)
```

---

## 25. Interview Questions

### "Which CSS properties are cheap to animate and why?"

`transform` and `opacity`. They only need compositing, which the browser can do on the compositor/GPU thread without recalculating layout or repainting — so they stay smooth even when the main thread is busy. Animating `width`, `height`, `top`, `left` or `margin` triggers layout every frame and often janks.

### "How do you animate an element when it's removed in React?"

React removes it immediately, so you must delay the unmount: keep it mounted and toggle a state class/attribute with CSS (`@starting-style` + `transition-behavior: allow-discrete` for `display`), wait for `animationend`/`.finished` before unmounting, or use Motion's `AnimatePresence`, which keeps the child until its `exit` animation finishes.

### "What is FLIP?"

First–Last–Invert–Play: measure an element before a layout change, apply the change, measure again, apply a transform that visually puts it back at the old position, then animate that transform to none. A layout change becomes a cheap transform animation. Motion's `layout` and the View Transitions API automate it.

### "Transitions vs keyframe animations?"

Transitions animate between two states when a property changes and are interruptible — ideal for UI state (hover, open/closed). Keyframes define multi-step or looping sequences that run on their own — spinners, skeletons, entrance effects.

### "What is the View Transitions API?"

`document.startViewTransition(update)` snapshots the page, runs the DOM update, and animates between old and new states with CSS-stylable pseudo-elements — a default cross-fade, plus morphing for elements sharing a `view-transition-name`. It works for SPA updates and, with `@view-transition { navigation: auto }`, for multi-page navigations. In React, update the DOM synchronously (`flushSync`) inside the callback.

### "How do you make animations accessible?"

Respect `prefers-reduced-motion` (replace movement with fades rather than removing all feedback), provide pause controls for anything auto-playing longer than 5 seconds, avoid flashing more than 3 times a second, never convey information only through motion, and keep durations short.

### "How would you debug a janky animation?"

Record in the DevTools Performance panel to see whether frames are dropped and whether each frame does Layout or Paint work; use Paint flashing and Layer borders in the Rendering drawer; switch to `transform`/`opacity`; remove forced reflows from animation loops; limit `will-change`; test with CPU throttling.

---

## Related Files

- [../1-high-priority/BROWSER-DOM-EVENTS-DEEP.md](../1-high-priority/BROWSER-DOM-EVENTS-DEEP.md) — rendering pipeline, rAF, layout thrashing, dialogs & popovers (§18, §19, §31)
- [BROWSER-INTERNALS-DEEP.md](BROWSER-INTERNALS-DEEP.md) — how the compositor works
- [PERFORMANCE-DEEP.md](PERFORMANCE-DEEP.md) — INP, long tasks, measuring
- [CSS-DEEP.md](CSS-DEEP.md) — layout, positioning, the properties being animated
- [../1-high-priority/REACT-ROUTING-DEEP.md](../1-high-priority/REACT-ROUTING-DEEP.md) — route transitions, scroll and focus after navigation
- [../3-low-priority/ACCESSIBILITY-MED-DEEP.md](../3-low-priority/ACCESSIBILITY-MED-DEEP.md) — motion and WCAG
- [../3-low-priority/UI-UX-DEEP.md](../3-low-priority/UI-UX-DEEP.md) — when motion helps UX
