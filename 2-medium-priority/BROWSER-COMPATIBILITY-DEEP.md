# Browser Compatibility — Engines, Quirks, Desktop vs Mobile

**Priority: MEDIUM**

> Which browsers matter, which engine each one actually runs, how they differ, and why
> "works on my Chrome" is not "works". Covers desktop and mobile (iOS and Android), in-app
> browsers and WebViews, the recurring quirks per browser, and how to test and debug
> across all of them.
>
> Companion to [BROWSER-INTERNALS-DEEP.md](BROWSER-INTERNALS-DEEP.md), which explains how
> one browser works inside. This file explains how browsers differ from each other.
>
> Support status checked September 2026. Browser support changes every month — confirm
> anything you rely on at caniuse.com or MDN's compatibility tables before you ship.

---

## Table of Contents

- [Browser Compatibility — Engines, Quirks, Desktop vs Mobile](#browser-compatibility--engines-quirks-desktop-vs-mobile)
  - [Table of Contents](#table-of-contents)
  - [1. The Mental Model — Engines, Not Browsers](#1-the-mental-model--engines-not-browsers)
  - [2. The Browsers Most Apps Support](#2-the-browsers-most-apps-support)
  - [3. Market Share — What It Means for You](#3-market-share--what-it-means-for-you)
  - [4. Release Cycles — Why Safari Is Different](#4-release-cycles--why-safari-is-different)
  - [5. iOS — Every Browser Is Safari](#5-ios--every-browser-is-safari)
  - [6. Android — Chrome, Samsung, and WebView](#6-android--chrome-samsung-and-webview)
  - [7. In-App Browsers and WebViews](#7-in-app-browsers-and-webviews)
  - [8. Chrome and the Chromium Family](#8-chrome-and-the-chromium-family)
  - [9. Safari (WebKit) Quirks](#9-safari-webkit-quirks)
  - [10. Firefox (Gecko) Quirks](#10-firefox-gecko-quirks)
  - [11. Mobile Layout — Viewport, Keyboard, Safe Areas](#11-mobile-layout--viewport-keyboard-safe-areas)
  - [12. Touch, Hover, and Input](#12-touch-hover-and-input)
  - [13. Forms Across Browsers](#13-forms-across-browsers)
  - [14. Media — Autoplay, Audio, Images, Video](#14-media--autoplay-audio-images-video)
  - [15. Storage, Cookies, and Privacy Rules](#15-storage-cookies-and-privacy-rules)
  - [16. Page Lifecycle — Background Tabs, bfcache, Suspension](#16-page-lifecycle--background-tabs-bfcache-suspension)
  - [17. PWAs and Installable Apps](#17-pwas-and-installable-apps)
  - [18. JavaScript and Web API Differences](#18-javascript-and-web-api-differences)
  - [19. CSS Differences](#19-css-differences)
  - [20. Chromium-Only APIs](#20-chromium-only-apis)
  - [21. Deciding What to Support](#21-deciding-what-to-support)
  - [22. Tooling — Baseline, Browserslist, Polyfills](#22-tooling--baseline-browserslist-polyfills)
  - [23. Testing Across Browsers](#23-testing-across-browsers)
  - [24. Debugging on Real Devices](#24-debugging-on-real-devices)
  - [25. "Works in Chrome, Broken in Safari" — A Checklist](#25-works-in-chrome-broken-in-safari--a-checklist)
  - [26. Common Pitfalls](#26-common-pitfalls)
  - [27. Interview Questions](#27-interview-questions)
  - [Related Files](#related-files)

---

## 1. The Mental Model — Engines, Not Browsers

```text
‼️ THE MENTAL MODEL THAT EXPLAINS EVERYTHING ELSE:

   There are dozens of browsers but only THREE engines that matter.
   ‼️ Compatibility bugs follow the ENGINE, not the brand name on the icon. ‼️

   A browser = an ENGINE (parses HTML/CSS, lays out, paints, runs JS)
             + a SHELL (tabs, address bar, sync, ad blocker, UI)

   ┌─────────────┬───────────────┬────────────┬───────────────────────────────┐
   │ Engine      │ Rendering     │ JavaScript │ Browsers built on it          │
   ├─────────────┼───────────────┼────────────┼───────────────────────────────┤
   │ Chromium    │ Blink         │ V8         │ Chrome, Edge, Opera, Brave,   │
   │             │               │            │ Vivaldi, Samsung Internet,    │
   │             │               │            │ Android WebView, Arc/Dia,     │
   │             │               │            │ Yandex, most Chinese browsers │
   ├─────────────┼───────────────┼────────────┼───────────────────────────────┤
   │ WebKit      │ WebCore       │ JavaScript-│ Safari (macOS, iOS, iPadOS),  │
   │             │               │ Core (JSC) │ EVERY browser on iOS (§5),    │
   │             │               │            │ WKWebView in iOS apps         │
   ├─────────────┼───────────────┼────────────┼───────────────────────────────┤
   │ Gecko       │ Gecko         │ Spider-    │ Firefox (desktop + Android),  │
   │             │ (+ Servo bits)│ Monkey     │ Tor Browser, LibreWolf, Zen   │
   └─────────────┴───────────────┴────────────┴───────────────────────────────┘

   Family tree:
     KHTML (KDE, 1998) ──► WebKit (Apple, 2003) ──► Blink (Google fork, 2013)
     Netscape ──► Gecko (Mozilla)
     Trident (Internet Explorer) ── dead; IE11 retired June 2022
     EdgeHTML (old Edge) ── dead; Edge switched to Chromium in January 2020

   ‼️ PRACTICAL CONSEQUENCE:
     If it works in Chrome it will almost always work in Edge, Opera,
     Brave and Samsung Internet (modulo version lag — §6, §8).
     You really have THREE engines to test: Chromium, WebKit, Gecko.
     And WebKit on iOS is the one that surprises people most.
```

Two newer engines exist — **Ladybird** (independent, from scratch) and **Servo** (Rust, now
under the Linux Foundation, pieces of which live in Firefox). Neither is something you
support in production yet, but they are worth knowing about in an interview conversation
about engine diversity.

---

## 2. The Browsers Most Apps Support

```text
DESKTOP
┌────────────────────┬──────────┬──────────────────────────────────────────────┐
│ Browser            │ Engine   │ What to know                                 │
├────────────────────┼──────────┼──────────────────────────────────────────────┤
│ Chrome             │ Chromium │ The default. Most users, most devtools,      │
│                    │          │ ships new APIs first.                        │
│ Safari (macOS)     │ WebKit   │ Second largest on desktop in the US. Updates │
│                    │          │ come with macOS/Safari releases (§4).        │
│ Edge               │ Chromium │ Default on Windows, big in enterprise.       │
│                    │          │ Has "IE mode" for legacy intranet sites.     │
│ Firefox            │ Gecko    │ Small share, but the only non-Chromium       │
│                    │          │ engine on Windows/Linux. Firefox ESR exists  │
│                    │          │ for enterprises (older, slower-moving).      │
│ Opera / Opera GX   │ Chromium │ Behaves like Chrome a version or so behind.  │
│ Brave              │ Chromium │ Blocks trackers/ads, randomises fingerprints │
│                    │          │ — breaks analytics, some canvas code.        │
│ Vivaldi, Arc, Dia  │ Chromium │ Treat as Chrome.                             │
└────────────────────┴──────────┴──────────────────────────────────────────────┘

MOBILE
┌────────────────────┬──────────┬──────────────────────────────────────────────┐
│ Safari (iOS)       │ WebKit   │ Default on iPhone/iPad. Tied to iOS version. │
│ Chrome (iOS)       │ WebKit!  │ ‼️ NOT Blink. Same engine as Safari (§5).    │
│ Firefox/Edge (iOS) │ WebKit!  │ ‼️ Same — Safari's engine in another shell.  │
│ Chrome (Android)   │ Chromium │ Default on most Android phones.              │
│ Samsung Internet   │ Chromium │ Default on Samsung phones. Lags Chrome by a  │
│                    │          │ few Chromium versions. Has its own dark mode │
│                    │          │ that can recolour your site.                 │
│ Firefox (Android)  │ Gecko    │ Real Gecko, unlike on iOS.                   │
│ In-app browsers    │ WebView  │ Instagram, Facebook, TikTok, WeChat, LinkedIn│
│                    │          │ — a big, overlooked slice of traffic (§7).   │
└────────────────────┴──────────┴──────────────────────────────────────────────┘

REGIONAL — depends on your market
  China:        WeChat in-app browser, QQ Browser, UC Browser, Huawei Browser,
                Quark — all Chromium-based, often several versions behind.
  Russia:       Yandex Browser (Chromium).
  Low-end /     Opera Mini in "extreme" mode renders pages on a proxy server
  Africa:       and runs very limited JS — a server-rendered HTML fallback
                matters here.
  Enterprise:   Edge (sometimes pinned to an old version by IT), Firefox ESR.
```

**The typical support statement** most product companies land on:

```text
  "Last 2 versions of Chrome, Edge, Firefox and Safari,
   plus Safari on the last 2 major iOS versions,
   plus Chrome and Samsung Internet on Android."
```

---

## 3. Market Share — What It Means for You

Approximate global figures (StatCounter, 2025–26 — they move, so check the current numbers
for your region):

```text
ALL PLATFORMS            MOBILE ONLY              DESKTOP ONLY
  Chrome   ~65–68%         Chrome   ~65%            Chrome   ~65–70%
  Safari   ~17–19%         Safari   ~23–25%         Edge     ~12–14%
  Edge     ~5%             Samsung  ~3–4%           Safari   ~7–9%
  Firefox  ~2–3%           Others   the rest        Firefox  ~6%
  Samsung  ~2%
  Opera    ~2%

‼️ GLOBAL NUMBERS LIE ABOUT YOUR USERS.

   - In the US, UK, Japan and Australia, iPhones are ~50%+ of mobile
     traffic, so iOS Safari is often the SINGLE LARGEST browser for a
     consumer app — bigger than desktop Chrome.
   - A B2B dashboard used at work may be 90% desktop Chrome + Edge.
   - An app popular in China may be mostly WeChat's in-app browser.

   ✅ Use YOUR analytics (browser + OS + version) to decide, not global
      charts. Remember analytics under-counts privacy browsers (Brave,
      Firefox with strict tracking protection, Safari with blockers).
```

---

## 4. Release Cycles — Why Safari Is Different

```text
┌──────────┬────────────────────────┬─────────────────────────────────────────┐
│ Browser  │ Cadence                │ How users get updates                   │
├──────────┼────────────────────────┼─────────────────────────────────────────┤
│ Chrome   │ Every 4 weeks          │ Silent auto-update. ~all users on the   │
│ Edge     │ Every 4 weeks          │ latest within weeks. "Evergreen".       │
│ Firefox  │ Every 4 weeks          │ Silent auto-update (ESR: ~yearly).      │
│ Safari   │ One major per year     │ ‼️ Tied to the OS. iOS Safari ONLY      │
│          │ (Sept) + point releases│ updates when the user updates iOS.      │
│          │ (x.1, x.2, x.4 …)      │                                         │
└──────────┴────────────────────────┴─────────────────────────────────────────┘

‼️ WHY THIS MATTERS

   - A feature Chrome shipped last month is available to nearly every
     Chrome user now. A feature Safari shipped in September is only
     available to people who have updated their phone.
   - Some iPhones stop receiving iOS updates altogether. Those users are
     frozen on an old Safari forever.
   - iOS adoption is fast (most users are on the newest major within a
     few months), but a long tail stays 1–2 versions behind.

   So on iOS you are supporting "Safari 18, 26 and 26.x", not "Safari
   latest". (Apple jumped from Safari 18 to Safari 26 in 2025 to match
   its new year-based OS names — iOS 26, macOS 26.)

   On macOS, Safari updates are also offered to the previous two macOS
   versions, so desktop Safari lags less than iOS Safari.

Preview channels — test here before things reach users:
   Chrome Beta / Dev / Canary · Edge Beta / Dev / Canary
   Firefox Beta / Nightly · Safari Technology Preview · iOS beta
```

---

## 5. iOS — Every Browser Is Safari

```text
‼️ THE SINGLE MOST MISUNDERSTOOD FACT IN MOBILE WEB:

   On iPhone and iPad, Chrome, Firefox, Edge, Opera and Brave all use
   Apple's WebKit engine. Apple's App Store rules required it for years.

   "Chrome on iOS" = Safari's engine + Google's UI, sync and bookmarks.

   So:
   - A bug in "Chrome on iPhone" is a WebKit bug. Reproduce it in Safari.
   - Testing Chrome on Android tells you NOTHING about Chrome on iOS.
   - Chromium-only APIs (§20) do not exist on iOS, whatever the icon says.
   - The user agent string says "CriOS" (Chrome) or "FxiOS" (Firefox),
     but the engine underneath is the same.

‼️ THE EXCEPTIONS (so far mostly on paper)

   - EU: since iOS 17.4 (2024), under the Digital Markets Act, browsers
     may ship their own engine in the EU. Apple's requirements made this
     costly and, as of this writing, no mainstream browser ships a
     non-WebKit engine to real users.
   - Japan: similar rules under Japan's smartphone competition law from
     December 2025.
   - Treat "iOS = WebKit" as true for planning, and watch for changes.
```

**iOS-specific behaviour you will hit** (each covered in detail later):

- `100vh` is taller than the visible screen; use `dvh`/`svh` (§11).
- The on-screen keyboard does not resize the page; `position: fixed` bars float in odd places (§11).
- Inputs with `font-size` under 16px zoom the page on focus (§13).
- Video must be `muted` + `playsinline` to autoplay inline (§14).
- Script-writable storage can be wiped after 7 days without a visit (§15).
- Web Push only works for sites added to the Home Screen (§17).
- Tabs are suspended aggressively in the background and killed under memory pressure (§16).
- Low Power Mode throttles `requestAnimationFrame` to 30fps and can block autoplay.
- Large `<canvas>` elements fail silently past a memory limit — keep total canvas area modest.
- iPadOS Safari identifies as **desktop macOS Safari** by default. Detect touch with
  `navigator.maxTouchPoints > 1` or media queries, not the user agent.

---

## 6. Android — Chrome, Samsung, and WebView

```text
ANDROID IS MOSTLY CHROMIUM, BUT NOT ONE CHROMIUM

   Chrome for Android     Latest Chromium, updated via Play Store.
   Samsung Internet       Chromium, typically a few versions behind Chrome.
                          Own features: forced dark mode, ad-block plugins,
                          "Video Assistant" overlay on <video>.
   Android System WebView Chromium, updated via Play Store separately from
                          the OS since Android 5 — so mostly up to date,
                          except on devices without Google Play.
   Firefox for Android    Gecko. Supports add-ons.
   OEM browsers           Xiaomi, Huawei (no Google Play → often outdated
                          WebView), Oppo/Vivo — Chromium forks of varying age.

‼️ THE THINGS THAT DIFFER FROM iOS

   - Keyboard: since Chrome 108, the keyboard resizes only the VISUAL
     viewport (like iOS). Opt back into resizing the layout with
     <meta name="viewport" content="..., interactive-widget=resizes-content">
   - Back button: the hardware/gesture back navigates HISTORY. Modals and
     drawers that don't push a history entry get "closed" by leaving the
     page. Push a state when opening a full-screen modal on mobile.
   - Text autosizing ("font boosting"): Chrome on Android may enlarge text
     in wide text blocks. Prevent with text-size-adjust: 100% plus
     -webkit-text-size-adjust: 100%.
   - Fragmentation: screen sizes, pixel ratios and performance vary far
     more than on iOS. A cheap Android phone has a CPU several times slower
     than a flagship iPhone — test performance on a low-end device.
   - Real PWA install and full Web Push, unlike iOS (§17).
```

---

## 7. In-App Browsers and WebViews

```text
‼️ THE TRAFFIC NOBODY TESTS:

   When a user taps your link inside Instagram, Facebook, TikTok, LinkedIn,
   X, Snapchat, WeChat, Gmail or Slack, it often opens in an IN-APP browser,
   not the user's real browser. For social-driven products this can be
   20–40% of mobile visits.

   iOS:      WKWebView (full WebKit, but the host app controls it) or
             SFSafariViewController (Safari itself, sandboxed — mostly fine).
   Android:  Android System WebView or Chrome Custom Tabs (Custom Tabs is
             real Chrome — mostly fine).

WHAT BREAKS IN IN-APP BROWSERS

   - Separate cookie jar. The user is logged in in Safari/Chrome but NOT in
     Instagram's browser. Magic links and SSO redirects get confusing.
   - Google OAuth refuses to run inside embedded WebViews
     ("disallowed_useragent"). Detect and ask the user to open in the
     browser.
   - Popups (window.open), file downloads, and target="_blank" may be
     blocked or behave oddly.
   - Payment sheets (Apple Pay/Google Pay) and passkeys may be unavailable
     or limited.
   - Host apps can inject their own JavaScript (e.g. for tracking) and add
     their own toolbars, eating viewport height.
   - Storage is often wiped when the WebView closes.

HOW TO HANDLE IT

   - Detect via user agent tokens ("Instagram", "FBAN"/"FBAV", "Line",
     "MicroMessenger" for WeChat, "; wv)" for Android WebView) — this is
     one of the few legitimate uses of UA sniffing.
   - For auth and checkout, show "Open in browser" guidance.
   - Test your key funnels by actually sharing a link to yourself in
     Instagram/WeChat and opening it.

YOUR OWN HYBRID APP (Capacitor, Cordova, React Native WebView)
   - iOS WKWebView = Safari's engine at the device's iOS version.
   - Android WebView = Chromium at whatever version the device has.
   - Enable debugging explicitly (§24): isInspectable on iOS 16.4+,
     WebView.setWebContentsDebuggingEnabled(true) on Android.
```

---

## 8. Chrome and the Chromium Family

Chrome sets the de facto standard because it has the most users, so the quirks here are
mostly "Chrome does something the others don't", which trains developers into bad habits.

```text
CHROME BEHAVIOURS THAT CATCH PEOPLE OUT

   - Autofill ignores autocomplete="off" on login/address fields. Use the
     correct autocomplete tokens ("new-password", "one-time-code") instead
     of fighting it. Autofilled fields get a blue/yellow background —
     style with :autofill (and -webkit-autofill for older versions).

   - Third-party cookies still WORK in Chrome. Google abandoned its plan
     to remove them (2024–25) and retired most Privacy Sandbox APIs. Safari
     and Firefox block them by default (§15). ‼️ An embed or SSO flow that
     "works fine" in Chrome may be broken for every Safari user.

   - Background tab throttling: timers in hidden tabs run at most once per
     second, and after ~5 minutes hidden, chained timers are throttled to
     once per minute ("intensive throttling"). Polling and countdowns drift.

   - The unload event is being deprecated. Pages with unload handlers
     can't use the back/forward cache. Use pagehide / visibilitychange.

   - Memory Saver discards inactive tabs; the page reloads when the user
     returns. Persist form drafts.

   - Chrome ships APIs first (§20). If you build on one, you've built a
     Chrome-only feature — check other engines' positions first.

EDGE-SPECIFIC
   - Same engine as Chrome, a few days behind. Nearly identical behaviour.
   - IE mode: enterprise sites can be forced to render with the old IE11
     engine inside Edge. If a corporate customer says "it's broken in
     Edge", ask whether IE mode is on.
   - Enterprise IT sometimes pins Edge to an older version via policy.

SAMSUNG INTERNET
   - Lags Chrome by a few Chromium versions — the newest CSS/JS may be
     missing. Include it explicitly in your browserslist.
   - Forced dark mode can invert your colours even if your site has no
     dark theme. Declare <meta name="color-scheme" content="light dark">
     (or just "light") and provide proper dark styles.

BRAVE
   - Shields block trackers and ads, and randomise canvas/audio/WebGL
     fingerprinting output. Analytics drop, some third-party widgets fail,
     canvas readback may return slightly different pixels.
```

---

## 9. Safari (WebKit) Quirks

Safari has improved enormously since roughly 2022, and many "Safari is the new IE" complaints
are years out of date. But because of its release cycle (§4) and its privacy stance, it is
still where most cross-browser bugs turn up.

```text
BEHAVIOUR

   - Buttons don't get focus on click (macOS Safari, and Firefox on Mac).
     Code that relies on e.relatedTarget in a blur handler — "close the
     menu unless focus moved into it" — fails because relatedTarget is
     null. Use pointerdown handling or check with contains() on click.

   - Tab key skips links on macOS by default (Option+Tab reaches them),
     unless the user changes a setting. Don't be surprised in keyboard
     testing.

   - window.open is blocked if it happens after an await. The popup
     must open synchronously inside the user's click handler. Pattern:
       const win = window.open('', '_blank');   // open now, in the click
       const url = await getUrl();
       win.location = url;                      // navigate it later

   - Clipboard: navigator.clipboard.write needs a user gesture and, for
     async data, pass a Promise into ClipboardItem rather than awaiting
     the data first (the await "uses up" the gesture):
       new ClipboardItem({ 'text/plain': fetchTextAsBlobPromise })

   - Date parsing: only ISO 8601 is guaranteed. "2026-09-23 10:00"
     (space instead of T) or "09/23/2026" may be Invalid Date or parsed
     differently. Always use "2026-09-23T10:00:00Z" or a date library.

   - Customised built-in web components (<button is="my-button">) are
     NOT supported and WebKit has said it won't implement them. Use
     autonomous custom elements (<my-button>) only.

   - requestIdleCallback has historically been unavailable — feature-
     detect and fall back to setTimeout.

   - Private Browsing: storage works but is wiped when the tab closes.
     (Very old Safari threw on localStorage.setItem in private mode —
     still worth a try/catch around storage writes.)

CSS

   - Some properties still need -webkit- prefixes: -webkit-user-select,
     -webkit-text-size-adjust, -webkit-line-clamp (everyone uses this
     prefixed one), -webkit-tap-highlight-color, -webkit-touch-callout.
     Autoprefixer handles most of this automatically.
   - backdrop-filter needed -webkit- until Safari 18 — keep both if you
     support Safari 17 and below.
   - Custom scrollbar styling: Chrome and Firefox support the standard
     scrollbar-width / scrollbar-color; Safari has relied on the
     non-standard ::-webkit-scrollbar pseudo-elements. Provide both.
   - Font rendering on macOS looks bolder/lighter than Windows. Text
     measured on one OS may wrap differently on another — never design
     layouts that only fit to the pixel.

RENDERING / PERFORMANCE

   - Safari is stricter about GPU memory. Many large layers
     (will-change on hundreds of elements, huge blurred backgrounds)
     can crash the tab on older iPhones.
   - Position: sticky inside an element with overflow set behaves
     according to that scroll container — check your ancestors if
     sticky "does nothing". (This is spec behaviour in all browsers,
     but most often discovered in Safari.)
```

---

## 10. Firefox (Gecko) Quirks

Firefox is the one engine that is neither Chromium nor Apple's, and it is the best way to
catch code that accidentally depends on Chrome's behaviour.

```text
   - Missing Chromium-only hardware/file APIs: WebUSB, Web Bluetooth,
     Web Serial, WebHID, File System Access pickers (showOpenFilePicker),
     Web NFC. Mozilla considers several of these harmful. Feature-detect.

   - navigator.share (Web Share API): not available on Firefox desktop.
     Fall back to "copy link".

   - Enhanced Tracking Protection (on by default) + Total Cookie
     Protection: third-party cookies are partitioned per site, known
     trackers are blocked. Embedded logins and analytics break the same
     way they do in Safari.

   - Form controls look different: native <select>, date pickers and
     number inputs have Firefox's own styling and behaviour.

   - Firefox's devtools are genuinely better for some jobs: CSS Grid and
     Flexbox inspectors, font inspection, and the accessibility inspector.

   - Firefox ESR (Extended Support Release) lags up to a year behind —
     only relevant if your customers are enterprises or governments.

   - Historically late features (now shipped, but watch older versions
     in your support range): :has() arrived in Firefox 121 (Dec 2023),
     and several newer layout/animation features (anchor positioning,
     some View Transitions features) came to Firefox last.
```

---

## 11. Mobile Layout — Viewport, Keyboard, Safe Areas

```text
THE VIEWPORT META TAG — every mobile page needs it

   <meta name="viewport" content="width=device-width, initial-scale=1">

   Without it, mobile browsers render at a fake ~980px width and zoom
   out. With it, the old 300ms tap delay also disappears.

   ‼️ Don't add maximum-scale=1 or user-scalable=no to stop zoom — it's an
      accessibility failure (low-vision users need pinch-zoom), and iOS
      ignores it anyway. Fix the cause of unwanted zoom instead (§13).

‼️ THE 100vh PROBLEM

   On mobile, the address bar and toolbars show/hide as you scroll.
   100vh = the height with the toolbars HIDDEN (the largest viewport),
   so a "full-screen" element is taller than the screen and the bottom
   is cut off behind the browser UI.

   Use the newer viewport units (supported in all current browsers):
     svh  small viewport  — toolbars shown   (safe for "must be visible")
     lvh  large viewport  — toolbars hidden
     dvh  dynamic         — changes as toolbars move (can cause jank if
                            it triggers relayout while scrolling)

     .hero { height: 100vh; height: 100svh; }   /* fallback first */

THE ON-SCREEN KEYBOARD

   - iOS (and Chrome Android 108+) do NOT shrink the layout viewport when
     the keyboard opens; only the visual viewport shrinks. A bottom bar
     with position: fixed; bottom: 0 may sit behind the keyboard or jump.
   - Use the visualViewport API to know the real visible area:
       visualViewport.addEventListener('resize', () => {
         const keyboardHeight = window.innerHeight - visualViewport.height;
       });
   - On Chromium you can instead opt into layout resizing with
     interactive-widget=resizes-content (not supported by Safari).
   - Chat-style UIs (input pinned to the bottom) are the hardest case —
     test on a real iPhone.

SAFE AREAS (notch, Dynamic Island, home indicator, rounded corners)

   <meta name="viewport" content="width=device-width, initial-scale=1,
         viewport-fit=cover">

   .bottom-bar {
     padding-bottom: calc(12px + env(safe-area-inset-bottom));
   }

   Without viewport-fit=cover, iOS letterboxes your page in landscape.
   With it, you MUST pad fixed headers/footers using env(safe-area-inset-*)
   or content goes under the notch or home indicator.

SCROLLING

   - Overscroll "rubber band" on iOS and pull-to-refresh on Android can
     fight custom gestures. Control with overscroll-behavior: contain
     (on a scrollable modal) or none.
   - Scroll locking behind a modal: overflow: hidden on <body> historically
     didn't stop iOS scrolling. Modern iOS respects it better, but many
     libraries still use position: fixed on body + restore scroll position.
   - -webkit-overflow-scrolling: touch is obsolete — delete it.
```

---

## 12. Touch, Hover, and Input

```text
‼️ HOVER DOESN'T EXIST ON TOUCH SCREENS

   - Tapping an element with a :hover style often makes it "stick"
     hovered until you tap elsewhere.
   - A menu that only opens on hover is unusable on a phone.
   - Wrap hover-only styles:
       @media (hover: hover) and (pointer: fine) {
         .card:hover { transform: translateY(-2px); }
       }
   - Laptops with touch screens and iPads with trackpads exist — base
     behaviour on the INPUT (media queries, pointer events), not on
     "is this a mobile device".

USE POINTER EVENTS

   pointerdown / pointermove / pointerup unify mouse, touch and pen in
   every current browser. Prefer them over separate mouse* + touch*
   handlers. Add touch-action: none (or pan-y etc.) on elements where you
   handle gestures yourself, or the browser will scroll/zoom instead.

PASSIVE LISTENERS

   Chrome and others treat touchstart/touchmove/wheel listeners on
   window/document as passive by default: calling preventDefault() is
   ignored (with a console warning). Pass { passive: false } explicitly
   if you really need to block scrolling.

TAP TARGETS

   Minimum ~44×44 CSS px (Apple) / 48×48 dp (Google). Small targets are
   the most common mobile usability complaint.

OTHER iOS TOUCH DETAILS
   -webkit-tap-highlight-color: transparent;  /* grey flash on tap */
   -webkit-touch-callout: none;               /* long-press menu on links/images */
   Use sparingly — they exist for a reason.
```

---

## 13. Forms Across Browsers

```text
‼️ iOS ZOOMS INTO INPUTS WITH font-size < 16px

   Focusing an <input>, <select> or <textarea> whose computed font-size
   is below 16px makes iOS zoom the page in — and it often doesn't zoom
   back out. Fix: font-size: 16px (or 1rem) on form controls on mobile.
   Don't "fix" it by disabling zoom (§11).

GET THE RIGHT KEYBOARD — this matters more than styling

   <input type="email">                     @ and . keys
   <input type="tel">                       phone keypad
   <input inputmode="numeric" pattern="[0-9]*">  digits, e.g. OTP / card
   <input inputmode="decimal">              digits + decimal point
   <input enterkeyhint="search">            label on the return key
   <input autocomplete="one-time-code">     iOS/Android offer SMS codes
   <input autocapitalize="off" autocorrect="off">  for usernames/codes

   Avoid type="number" for things that aren't quantities (card numbers,
   postcodes, IDs): it strips leading zeros, allows "e", and scroll-wheel
   changes the value on desktop.

NATIVE CONTROLS LOOK AND BEHAVE DIFFERENTLY

   - <input type="date"> / "time": every browser shows a different picker
     (iOS wheel, Android calendar, Chrome/Firefox/Safari desktop popups).
     Value format is always yyyy-mm-dd, but DISPLAY follows the user's
     locale. Fine for most forms; use a custom picker only if you need
     ranges or custom disabled days.
   - <select>: fully native on mobile (wheel on iOS, sheet on Android).
     Customisable <select> (appearance: base-select) shipped in Chromium
     in 2025 — check other engines before depending on it.
   - <dialog> and the Popover API: supported in all current engines —
     prefer them to hand-rolled modals (focus trapping, Esc, top layer).
   - Validation bubbles (:invalid messages) differ by browser in wording,
     position and timing. Most apps render their own messages.
   - appearance: none resets native styling in all current browsers.

FILE INPUTS ON MOBILE

   - <input type="file" accept="image/*"> offers camera + library.
     capture="environment" opens the rear camera directly.
   - ‼️ iPhones shoot HEIC. Depending on accept and iOS settings you may
     receive .heic files, which Chrome and Firefox on desktop can't
     display in <img>. Convert on the server or restrict accept to
     image/jpeg,image/png so iOS converts for you.
   - Photos may carry EXIF orientation; modern browsers honour it in
     <img> (image-orientation: from-image is the default) but your
     server-side resizer may not.

PASSWORD MANAGERS AND PASSKEYS
   - Use real <form>, <label>, name and autocomplete attributes so
     Safari Keychain, Chrome and 1Password can fill fields.
   - Passkeys (WebAuthn) work in all current engines; conditional UI
     (autocomplete="username webauthn") is the smooth path.
```

---

## 14. Media — Autoplay, Audio, Images, Video

```text
AUTOPLAY RULES (all browsers, strictest on iOS)

   Autoplay is allowed only if muted — or after the user has interacted
   with the page. On iOS you ALSO need playsinline, or the video goes
   fullscreen:

     <video autoplay muted playsinline loop src="hero.mp4"></video>

   - iOS Low Power Mode may still block autoplay — show a poster image
     and a play button as a fallback.
   - video.play() returns a Promise that REJECTS when autoplay is blocked.
     Always .catch() it.

AUDIO

   - An AudioContext starts "suspended" until a user gesture. Call
     audioContext.resume() inside a click/tap handler.
   - On iOS, the hardware silent switch mutes Web Audio in some setups
     but not <audio> — test with the switch on.

IMAGE FORMATS

   JPEG, PNG, GIF, SVG, WebP, AVIF — safe in all current browsers
   (AVIF fully from Safari 16.4).
   HEIC — Safari only.
   JPEG XL — Safari 17+; Chromium removed it in 2022 and has since been
   reconsidering. Not safe to rely on.

   ✅ Serve AVIF/WebP with a fallback via <picture> or content negotiation
      (let your image CDN pick the format from the Accept header).

VIDEO FORMATS

   H.264 in MP4 plays everywhere — the safe default.
   VP9 / AV1 in WebM or MP4: good in Chrome/Firefox/Edge; Safari support
   depends on version and hardware decoders. Offer H.264 as a fallback
   <source>.
   HLS (.m3u8): native in Safari (and iOS). Other browsers need hls.js
   (Media Source Extensions). On iPhone, MSE only arrived as
   "Managed Media Source" in iOS 17.1 — so native HLS is still the
   simplest path on iOS.

CAMERA / MICROPHONE (getUserMedia, WebRTC)
   - HTTPS only (localhost is exempt).
   - Permission prompts differ; iOS asks again more often.
   - In-app WebViews may not have camera access at all (§7).
```

---

## 15. Storage, Cookies, and Privacy Rules

```text
‼️ PRIVACY IS NOW THE BIGGEST SOURCE OF BROWSER DIFFERENCES

┌─────────────────────────┬───────────────────┬────────────────┬─────────────┐
│                         │ Chrome / Edge     │ Safari         │ Firefox     │
├─────────────────────────┼───────────────────┼────────────────┼─────────────┤
│ Third-party cookies     │ Allowed (default) │ Blocked        │ Partitioned │
│                         │                   │                │ per site    │
│ Third-party storage     │ Partitioned       │ Partitioned    │ Partitioned │
│ (localStorage/IDB in    │                   │                │             │
│  an iframe)             │                   │                │             │
│ JS-set cookie lifetime  │ As set            │ Capped at 7    │ As set      │
│ (document.cookie)       │                   │ days (ITP)     │             │
│ Script-writable storage │ Kept              │ ‼️ Deleted after│ Kept        │
│ with no visits          │                   │ 7 days without │             │
│                         │                   │ interaction    │             │
│                         │                   │ (not Home      │             │
│                         │                   │ Screen apps)   │             │
└─────────────────────────┴───────────────────┴────────────────┴─────────────┘

WHAT THIS BREAKS

   - Auth in iframes / embedded widgets relying on third-party cookies —
     broken in Safari and Firefox. Use the Storage Access API
     (document.requestStorageAccess() from a user gesture), or move auth
     to a top-level redirect, or serve the embed from the same site.
   - Partitioned cookies (CHIPS, the "Partitioned" attribute) let an
     embed keep a cookie per top-level site. Support has varied by
     engine — check before relying on it.
   - "Remember me" implemented with a JS-set cookie on Safari silently
     expires after 7 days. ‼️ Set auth cookies from the SERVER with
     Set-Cookie; HttpOnly; Secure; SameSite=Lax.
   - Offline data in IndexedDB can disappear on iOS if the user doesn't
     open the site for a week. Treat client storage as a cache; the
     server is the source of truth. Ask for durable storage with
     navigator.storage.persist() where supported.
   - Analytics and A/B test IDs reset, inflating "unique users" from
     Safari.

QUOTAS
   Every engine limits storage by available disk space, and all can
   evict under pressure. Check with navigator.storage.estimate() and
   always handle QuotaExceededError on writes.

SameSite
   All current browsers treat cookies without a SameSite attribute as
   Lax. Cross-site POSTs (e.g. from a payment provider back to your site)
   won't send those cookies — set SameSite=None; Secure where genuinely
   needed.
```

---

## 16. Page Lifecycle — Background Tabs, bfcache, Suspension

```text
MOBILE BROWSERS FREEZE AND KILL PAGES — PLAN FOR IT

   - iOS suspends a tab's JavaScript almost immediately when it goes to
     the background or the screen locks. WebSockets drop, timers stop.
   - Both iOS and Android may kill the tab entirely under memory pressure.
     The page RELOADS when the user comes back — unsaved form data is lost.
   - Chrome desktop throttles background timers and may discard tabs
     (Memory Saver).

‼️ DON'T RELY ON unload / beforeunload

   - On mobile they often never fire (the app is just killed).
   - The unload event disqualifies the page from the bfcache and is being
     deprecated in Chrome.
   Use instead:
     document.addEventListener('visibilitychange', () => {
       if (document.visibilityState === 'hidden') {
         // Last reliable moment: save state, flush analytics
         navigator.sendBeacon('/analytics', payload);
       }
     });
   And pagehide / pageshow for navigations.

BACK/FORWARD CACHE (bfcache)

   Safari and Firefox (and Chrome) keep the whole page in memory when you
   navigate away, and restore it instantly on Back — JS state included.
   Consequences:
   - Your page can come back WITHOUT reloading. Stale data (e.g. a cart
     count) shows unless you refresh on pageshow:
       window.addEventListener('pageshow', (e) => {
         if (e.persisted) refreshCart();
       });
   - Things that block bfcache: unload handlers, open IndexedDB
     transactions, Cache-Control: no-store (in some browsers), open
     WebSocket connections in some browsers. Chrome DevTools →
     Application → Back/forward cache shows why a page isn't eligible.

REALTIME CONNECTIONS
   Reconnect WebSockets / SSE on visibilitychange to "visible" and on
   the "online" event. Assume the connection died while hidden.
```

---

## 17. PWAs and Installable Apps

```text
┌───────────────────────────┬──────────────────────┬────────────────────────┐
│                           │ Android (Chromium)   │ iOS / iPadOS           │
├───────────────────────────┼──────────────────────┼────────────────────────┤
│ Service workers / offline │ Yes                  │ Yes (all iOS browsers) │
│ Install prompt            │ Yes — you can show   │ ‼️ No programmatic     │
│                           │ your own button via  │ prompt. User must use  │
│                           │ beforeinstallprompt  │ Share → Add to Home    │
│                           │                      │ Screen. Explain it in  │
│                           │                      │ your UI.               │
│ Web Push notifications    │ Yes, in the browser  │ ‼️ Only for sites      │
│                           │ and installed        │ added to Home Screen   │
│                           │                      │ (iOS 16.4+), permission│
│                           │                      │ requested from a tap   │
│ App badge                 │ Yes                  │ Yes (Home Screen apps) │
│ Storage 7-day wipe (§15)  │ No                   │ Exempt once installed  │
│ Background sync           │ Yes                  │ No                     │
└───────────────────────────┴──────────────────────┴────────────────────────┘

Desktop: Chrome and Edge install PWAs natively. Safari on macOS has
"Add to Dock" (macOS Sonoma+). Firefox desktop has historically not
supported installing PWAs.

iOS 26 note: sites added to the Home Screen now open as web apps by
default even without a manifest — test your layout in standalone mode
(no Safari toolbar, safe areas matter more).

Detect standalone mode:
   window.matchMedia('(display-mode: standalone)').matches
   || navigator.standalone === true          // older iOS
```

---

## 18. JavaScript and Web API Differences

The language itself (ECMAScript) is extremely consistent across current engines. The
differences are in **which version** users have and in **browser APIs**.

```text
LANGUAGE FEATURES — a version problem, not an engine problem

   Newer syntax/built-ins may be missing on older Safari/iOS and older
   Samsung Internet in your support range. Recent examples people hit:
     Array.prototype.at, Object.hasOwn           (Safari 15.4)
     structuredClone                             (Safari 15.4)
     Regex lookbehind (?<=...)                   (Safari 16.4)
     Array.prototype.findLast, toSorted/toSpliced(Safari 15.4 / 16)
     Promise.withResolvers, Object.groupBy       (Safari 17.4)
     Set methods (union, intersection)           (Safari 17, Chrome 122,
                                                  Firefox 127)
   ‼️ A regex with lookbehind is a SYNTAX error on old Safari — it breaks
      the WHOLE bundle, not just one feature. Your transpiler won't fix
      regex syntax unless configured to.

   Your build tool (Vite/esbuild/Babel/SWC) transpiles SYNTAX down to your
   targets. It does NOT add missing BUILT-INS (structuredClone, .at())
   unless you configure polyfills (core-js / Babel preset-env
   useBuiltIns: 'usage') — §22.

APIs WITH REAL DIFFERENCES — always feature-detect

   navigator.share               Mobile + Safari + Edge; not Firefox desktop
   navigator.vibrate             Android only; not iOS
   Notification / Push           iOS only for Home Screen apps (§17)
   Clipboard write               Needs user gesture; Safari stricter (§9)
   requestIdleCallback           Not Safari (historically)
   scheduler.postTask            Chromium, Firefox; not Safari
   Web Speech (recognition)      Chrome (sends audio to Google), Safari
                                 (prefixed); not Firefox
   Screen Wake Lock              All current (Safari 16.4+)
   WebGPU                        Chrome/Edge desktop + Android, Safari 26;
                                 Firefox on some platforms
   Intl formatting               Same APIs everywhere, but output strings
                                 (spacing, currency symbols, month names)
                                 differ by browser version and ICU data —
                                 never assert on exact Intl output in
                                 cross-browser tests

FEATURE DETECTION, NOT BROWSER DETECTION

   ✅ if ('share' in navigator) { ... }
   ✅ if (CSS.supports('height', '100dvh')) { ... }
   ✅ @supports (display: grid) { ... }
   ❌ if (navigator.userAgent.includes('Safari')) — Chrome's UA also
      contains "Safari"; iPadOS pretends to be macOS; Chrome on iOS is
      WebKit. UA sniffing is wrong more often than right.

   Legit uses for the UA: in-app browser detection (§7), analytics, and
   working around a specific known engine bug — with a comment linking
   the bug and the version it was fixed in, so it can be deleted later.

   User-Agent Client Hints (navigator.userAgentData) give structured
   data but are Chromium-only; Chrome also freezes/reduces its UA string.
```

---

## 19. CSS Differences

```text
MOSTLY SOLVED — works everywhere current
   Flexbox (including gap), Grid, subgrid, custom properties, :is/:where,
   :has(), container queries (size), aspect-ratio, clamp/min/max,
   logical properties, cascade layers (@layer), native nesting,
   color-mix(), oklch(), dvh/svh/lvh, :focus-visible, accent-color,
   position: sticky, scroll-snap, the Popover API, <dialog>.

   ‼️ "Works everywhere current" ≠ works for your oldest supported iOS.
      Check each against your targets — :has() and nesting are the
      classic ones that break Safari 15 users.

NEWER — CHECK SUPPORT BEFORE RELYING ON IT
   Anchor positioning        Chromium first; Safari 26; Firefox later
   View Transitions          Same-document: all three now (Firefox last).
                             Cross-document (MPA): Chromium + Safari
   Scroll-driven animations  Chromium first; others catching up
   Customisable <select>     Chromium first (2025)
   Container style queries   Chromium + Safari; check Firefox
   text-wrap: balance/pretty balance widely; pretty patchier
   field-sizing: content     Chromium first

   ✅ Use these as progressive enhancement inside @supports, so browsers
      without them get a plain-but-working layout.

STILL-DIFFERENT DETAILS
   - Scrollbars take up width on Windows (classic scrollbars) but overlay
     on macOS/iOS/Android. Layouts measured on a Mac can overflow or shift
     on Windows. scrollbar-gutter: stable reserves the space.
   - Default form control and font rendering differs per OS (§9, §13).
   - System fonts: system-ui maps to San Francisco (Apple), Segoe UI
     (Windows), Roboto (Android). Metrics differ → text wraps differently.
     Emoji differ too (Apple / Noto / Segoe).
   - Subpixel rounding differs: 3 columns of 33.333% can leave a 1px gap
     in one engine and not another. Prefer Grid/Flex over percentage math.
   - Vendor prefixes: let Autoprefixer add them from your browserslist;
     don't hand-write -moz-/-ms-.
```

---

## 20. Chromium-Only APIs

Google ships many "Project Fugu" device capabilities that Apple and Mozilla have declined,
usually on privacy/security grounds. Build on them only as an enhancement, never for a core
flow.

```text
┌───────────────────────────────┬──────────┬────────┬─────────┬──────────────┐
│ API                           │ Chromium │ Safari │ Firefox │ Note         │
├───────────────────────────────┼──────────┼────────┼─────────┼──────────────┤
│ File System Access            │ Desktop  │ No*    │ No*     │ *OPFS (origin│
│ (showOpenFilePicker, save to  │          │        │         │ private FS)  │
│  the user's real files)       │          │        │         │ works in all │
│ WebUSB / WebHID / Web Serial  │ Desktop  │ No     │ No      │              │
│ Web Bluetooth                 │ Yes      │ No     │ No      │              │
│ Web NFC                       │ Android  │ No     │ No      │              │
│ Background Sync / Periodic    │ Yes      │ No     │ No      │              │
│ beforeinstallprompt           │ Yes      │ No     │ No      │ §17          │
│ User-Agent Client Hints       │ Yes      │ No     │ No      │ §18          │
│ EyeDropper                    │ Desktop  │ No     │ No      │              │
│ Window Management (multi-     │ Desktop  │ No     │ No      │              │
│  screen)                      │          │        │         │              │
└───────────────────────────────┴──────────┴────────┴─────────┴──────────────┘

Before building on a new API, check the other engines' official positions:
   Mozilla: mozilla.github.io/standards-positions
   WebKit:  github.com/WebKit/standards-positions
"Negative" means don't expect it — ever.
```

---

## 21. Deciding What to Support

```text
‼️ SUPPORT IS A PRODUCT DECISION, NOT A DEVELOPER ONE — BUT BRING DATA

1. Look at YOUR analytics: browser, version, OS, device, split by
   revenue-relevant segments (paying customers, signups).

2. Define TIERS rather than yes/no:

   Tier 1 — fully supported, tested in CI and manually before release
            e.g. latest 2 Chrome/Edge/Firefox/Safari, iOS Safari last 2
            majors, Chrome Android, Samsung Internet
   Tier 2 — should work, bugs fixed if cheap, not tested every release
            e.g. older iOS, Firefox ESR, Opera, in-app browsers
   Tier 3 — unsupported: show a graceful message, core content still
            readable (server-rendered HTML helps)

3. Write it down (README, help centre) so support, sales and QA agree.

4. Review it every 6–12 months. Dropping an old Safari version can
   remove polyfills and shrink the bundle.

COST SIGNALS
   - Each extra old browser version = more polyfills, bigger bundles,
     slower pages for EVERYONE (unless you ship differential bundles).
   - B2B/enterprise/government: expect older Edge, Firefox ESR, locked-
     down machines — ask customers early.
   - Consumer apps in the US/UK/Japan: iOS Safari is tier 1, full stop.

PROGRESSIVE ENHANCEMENT
   Core flow (read, sign in, pay) works on every tier-1 browser.
   Extras (animations, share sheet, WebGPU, file system access) layer on
   top with feature detection. This is how you use new features without
   waiting for the slowest browser.
```

---

## 22. Tooling — Baseline, Browserslist, Polyfills

```text
BASELINE (web.dev/baseline) — the modern shorthand for "can I use it?"

   Baseline Newly available — works in the latest version of all core
                              browsers: Chrome, Edge, Firefox, Safari
                              (desktop and mobile).
   Baseline Widely available — has been Newly available for 30 months,
                              so most users' browsers have it.

   MDN and caniuse show a Baseline badge on every feature. "Widely
   available" is a sensible default bar for core features.

BROWSERSLIST — one config drives Autoprefixer, Babel, SWC, Lightning
CSS, esbuild targets (via plugins), ESLint compat plugins

   // package.json
   "browserslist": [
     "baseline widely available",
     "iOS >= 17",
     "Samsung >= 25"
   ]

   Other common queries: "> 0.5%, last 2 versions, not dead",
   "defaults". Run  npx browserslist  to see exactly which versions your
   query expands to, and update the data with
   npx update-browserslist-db@latest.

   Vite: build.target (default targets "baseline widely available" in
   Vite 7). Set it deliberately — see BUILD-TOOLS-DEEP.md.

POLYFILLS
   - core-js via Babel preset-env with useBuiltIns: 'usage' adds only
     what your targets need.
   - Don't use blanket polyfill CDNs you don't control — the popular
     polyfill.io domain was sold and served malware in 2024.
   - Some things can't be polyfilled (CSS features, :has(), new syntax
     in regexes, hardware APIs). Those need @supports / feature detection
     and fallbacks.

LINTING
   eslint-plugin-compat warns when you use an API your browserslist
   doesn't support. Stylelint has a similar plugin for CSS.
```

---

## 23. Testing Across Browsers

```text
LAYERED STRATEGY

   1. Unit tests (Vitest/Jest in jsdom/happy-dom): logic only. ‼️ jsdom is
      not a browser — no layout, no real CSS, no engine quirks.

   2. E2E in three engines with Playwright:
        projects: [
          { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
          { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
          { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
          { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
        ]
      Run all engines in CI at least on main / nightly.

      ‼️ Playwright's "webkit" is a WebKit build, NOT Safari, and the
         "iPhone" device is desktop WebKit with a small viewport and
         touch emulation. It catches most engine bugs but NOT: real iOS
         keyboard/viewport behaviour, ITP storage rules, autoplay policy,
         performance on a real phone.

   3. Real devices for the things emulation can't catch:
      - Your own iPhone and a mid/low-end Android phone.
      - Cloud device farms: BrowserStack, Sauce Labs, LambdaTest — real
        iOS Safari, Samsung Internet, old versions, and Playwright/
        Selenium automation against them.
      - Xcode's iOS Simulator (macOS only) runs real Mobile Safari —
        free and good for layout, though not for performance.

   4. Visual regression (Playwright screenshots, Chromatic, Percy)
      per engine — catches font/scrollbar/rounding differences. Keep
      separate baselines per browser; they will never be pixel-identical.

   5. Accessibility: test VoiceOver on Safari (macOS/iOS) and TalkBack on
      Chrome Android — screen reader + browser pairs behave differently.

RELEASE CHECKLIST FOR RISKY UI CHANGES
   □ Chrome desktop  □ Safari macOS  □ Firefox  □ Edge (if enterprise)
   □ iPhone Safari (real device)  □ Chrome Android  □ Samsung Internet
   □ Open the link from Instagram / WeChat if social traffic matters
   □ Landscape + keyboard open on phones
```

---

## 24. Debugging on Real Devices

```text
iPHONE / iPAD (needs a Mac)
   1. iPhone: Settings → Apps → Safari → Advanced → Web Inspector: ON
   2. Connect by cable (or same network after pairing).
   3. Mac Safari: Settings → Advanced → "Show features for web
      developers", then the Develop menu → your device → the page.
   Full Web Inspector: console, elements, network, breakpoints.
   Works for Safari, Home Screen apps and, since iOS 16.4, for other iOS
   browsers and WKWebViews that set isInspectable = true.
   No Mac? The iOS Simulator is Mac-only too; use a cloud device farm or
   an in-page console like Eruda for quick checks.

ANDROID
   1. Phone: enable Developer options → USB debugging.
   2. Desktop Chrome: chrome://inspect → your device → inspect.
   Works for Chrome and for WebViews that call
   WebView.setWebContentsDebuggingEnabled(true).
   Samsung Internet can be inspected the same way when its debugging
   option is enabled. Firefox Android: about:debugging in desktop Firefox.

DESKTOP DEVTOOLS TRICKS
   - Chrome device mode: good for layout breakpoints; does NOT emulate
     Safari behaviour, only screen size + touch + UA.
   - Rendering tab: emulate prefers-color-scheme, prefers-reduced-motion,
     print media, vision deficiencies.
   - Network throttling + CPU 4–6× slowdown to approximate a mid-range
     Android phone.
   - Application → Back/forward cache to see why bfcache is blocked.

PRODUCTION
   Log browser + OS + version with every error (Sentry etc. do this
   automatically). "Crashes only on iOS 17.x Safari" is usually the
   fastest route to the cause.
```

---

## 25. "Works in Chrome, Broken in Safari" — A Checklist

```text
Go through these in order — they cover most real cases.

□ Is it actually an old version? Check the exact iOS/Safari version in
  your error logs. The feature may just be newer than their Safari.
□ Unsupported JS built-in or syntax (regex lookbehind, .at(),
  structuredClone) in your bundle? Check browserslist + polyfills.
□ Date parsing of a non-ISO string?
□ Third-party cookie / iframe / embedded auth? (Blocked in Safari.)
□ JS-set cookie or localStorage "disappearing" after days? (ITP.)
□ window.open or clipboard after an await? (User gesture consumed.)
□ Video not playing? (muted + playsinline + handle play() rejection.)
□ Layout cut off at the bottom on iPhone? (100vh → svh/dvh, safe areas.)
□ Page zooming on input focus? (font-size < 16px.)
□ Blur/focus logic using relatedTarget? (Buttons don't take focus.)
□ CSS feature without @supports fallback (:has, nesting, anchor
  positioning) on an older Safari?
□ Missing -webkit- prefix (user-select, backdrop-filter on ≤ 17)?
□ Customised built-in web component (is="…")?
□ Tab reloaded / state lost after switching apps? (Memory pressure —
  persist state, use visibilitychange.)
□ Only inside Instagram/Facebook/WeChat? (In-app WebView, §7.)
```

---

## 26. Common Pitfalls

```text
‼️ 1. Testing only in Chrome.
   Chromium is ~70% of users but only one of three engines. Run
   Playwright against WebKit and Firefox in CI.

‼️ 2. Believing "Chrome on iPhone" is Chrome.
   It's WebKit. Bugs there are Safari bugs (§5).

‼️ 3. Using Chrome DevTools device mode as "mobile testing".
   It's Chrome with a small screen. It won't show iOS keyboard, viewport,
   storage or autoplay behaviour. Use a real iPhone at least before
   release.

‼️ 4. User-agent sniffing to decide features.
   Feature-detect instead (§18). UA strings lie, and iPadOS claims to be
   a Mac.

5. Using 100vh for full-height mobile layouts.
   Use svh/dvh with a vh fallback (§11).

6. Disabling zoom to stop iOS input zoom.
   Accessibility failure. Use 16px form text (§13).

‼️ 7. Depending on third-party cookies because "it works in Chrome".
   Broken for Safari and Firefox users (§15).

8. Storing important data only in localStorage/IndexedDB.
   Safari may delete it after 7 days; mobile browsers may evict it.

9. Relying on unload/beforeunload for saving or analytics.
   Use visibilitychange + sendBeacon (§16).

10. Hover-only interactions.
    Unusable on touch (§12).

11. Assuming your transpiler polyfills built-ins.
    It transforms syntax; built-ins need core-js or equivalent (§22).

12. Forgetting in-app browsers.
    Separate cookies, blocked OAuth, odd viewports (§7).

13. Building core flows on Chromium-only APIs.
    Check standards positions first (§20).

14. Never reviewing the support policy.
    Old targets you no longer need cost bundle size and dev time (§21).

‼️ 15. Trusting old "Safari doesn't support X" blog posts.
    Safari has shipped a lot since 2022. Check caniuse/Baseline today
    before adding a workaround.
```

---

## 27. Interview Questions

**"What's the difference between a browser and a browser engine? Which engines matter?"**
The engine parses, lays out, paints and runs JavaScript; the browser is the engine plus the
UI around it. Three matter: Blink/V8 (Chromium — Chrome, Edge, Opera, Samsung, Brave),
WebKit/JavaScriptCore (Safari and every iOS browser) and Gecko/SpiderMonkey (Firefox). So you
test three engines, not ten browsers.

**"A bug is reported only on Chrome for iPhone. How do you debug it?"**
Chrome on iOS uses WebKit, so I'd reproduce it in iOS Safari, connect the phone to a Mac and
use Safari's Web Inspector. It's a WebKit issue, not a Chrome one — testing Chrome on Android
wouldn't reproduce it.

**"How do you decide which browsers to support?"**
Start from our own analytics, weighted by revenue-relevant users, not global charts. Define
tiers (fully tested / should work / unsupported), write them down, encode them in
browserslist so tooling follows the decision, and review every 6–12 months. Build core flows
for all tier-1 browsers and add newer features as progressive enhancement.

**"Why does `100vh` not fit the screen on mobile?"**
Mobile browsers show and hide toolbars. `100vh` is the height with toolbars hidden, so the
element overflows when they're visible. Use `svh` (always fits) or `dvh` (tracks the
toolbars), with `vh` as a fallback.

**"Feature detection vs browser detection?"**
Feature detection (`'share' in navigator`, `@supports`, `CSS.supports`) asks whether the thing
exists, so it keeps working as browsers change. User-agent sniffing guesses from a string that
lies — Chrome's UA contains "Safari", iPadOS pretends to be macOS — and it goes stale. I only use
the UA for in-app browser detection, analytics, or a documented workaround for a specific
engine bug.

**"Why might users get logged out on Safari but not Chrome?"**
Safari's Intelligent Tracking Prevention caps cookies set from JavaScript at 7 days and can
delete script-writable storage after 7 days without interaction; it also blocks third-party
cookies entirely. Fix by setting the session cookie from the server with `HttpOnly; Secure;
SameSite`, and by not relying on third-party cookies for embedded auth.

**"What's the difference between transpiling and polyfilling?"**
Transpiling rewrites syntax the target can't parse (optional chaining, classes) into older
syntax. Polyfilling adds missing runtime built-ins (`structuredClone`, `Array.prototype.at`) as
code. Build tools transpile automatically based on targets but only polyfill if you configure
it — and some things, like CSS features or regex syntax, can't be polyfilled at all.

**"How would you test cross-browser in CI?"**
Playwright projects for Chromium, Firefox and WebKit plus mobile viewports, running on every
merge to main. Then a cloud device farm or real devices for what emulation misses — iOS
keyboard and viewport, storage rules, autoplay, low-end Android performance — and a
pre-release manual checklist for risky UI changes.

---

## Related Files

- [BROWSER-INTERNALS-DEEP.md](BROWSER-INTERNALS-DEEP.md) — how one engine works inside: V8, GC, rendering pipeline, storage, workers
- [WEB-APIS-DEEP.md](WEB-APIS-DEEP.md) — the APIs whose support §18 and §20 compare
- [CSS-DEEP.md](CSS-DEEP.md) — layout fundamentals behind §11 and §19
- [BUILD-TOOLS-DEEP.md](BUILD-TOOLS-DEEP.md) — build targets, transpiling and bundle size (§22)
- [TESTING-STRATEGY-DEEP.md](TESTING-STRATEGY-DEEP.md) — Playwright setup and CI (§23)
- [PERFORMANCE-DEEP.md](PERFORMANCE-DEEP.md) — testing on slow devices and networks
- [WEB-SECURITY-FRONTEND-DEEP.md](WEB-SECURITY-FRONTEND-DEEP.md) — cookies, SameSite, third-party embeds (§15)
- [../3-low-priority/MOBILE-NATIVE-DEEP.md](../3-low-priority/MOBILE-NATIVE-DEEP.md) — when a native app is the better answer than the mobile web
