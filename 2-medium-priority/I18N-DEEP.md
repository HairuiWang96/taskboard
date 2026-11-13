# Internationalization (i18n) — Translating and Localizing React Apps

**Priority: MEDIUM**

> What it takes to ship an app in more than one language: locales and how to pick one,
> message keys vs inline text, plurals and ICU MessageFormat, react-i18next and
> react-intl (FormatJS), next-intl for Next.js, formatting dates/numbers/currency with
> `Intl`, right-to-left layouts with CSS logical properties, fonts and text expansion,
> lazy-loading translations, type-safe keys, the translation workflow (extraction, TMS,
> pseudo-localization), SEO for multilingual sites, testing, and interview questions.
>
> The `Intl` APIs themselves (DateTimeFormat, NumberFormat, PluralRules, Collator,
> Segmenter...) are covered in
> [../1-high-priority/JS-DATES-TIME-INTL-DEEP.md](../1-high-priority/JS-DATES-TIME-INTL-DEEP.md).

---

## Table of Contents

- [1. The Mental Model — i18n vs l10n, Locales](#1-the-mental-model--i18n-vs-l10n-locales)
- [2. Choosing the User's Locale](#2-choosing-the-users-locale)
- [3. Messages — Keys, Interpolation, and Why Concatenation Breaks](#3-messages--keys-interpolation-and-why-concatenation-breaks)
- [4. Plurals, Gender, and ICU MessageFormat](#4-plurals-gender-and-icu-messageformat)
- [5. Choosing a Library](#5-choosing-a-library)
- [6. react-i18next in Depth](#6-react-i18next-in-depth)
- [7. react-intl (FormatJS) in Depth](#7-react-intl-formatjs-in-depth)
- [8. Next.js — next-intl and Locale Routing](#8-nextjs--next-intl-and-locale-routing)
- [9. Formatting Dates, Numbers, and Currency in an i18n Setup](#9-formatting-dates-numbers-and-currency-in-an-i18n-setup)
- [10. Rich Text — Links and Bold Inside Translations](#10-rich-text--links-and-bold-inside-translations)
- [11. Right-to-Left Languages](#11-right-to-left-languages)
- [12. Layout, Fonts, and Text Expansion](#12-layout-fonts-and-text-expansion)
- [13. Loading Translations — Bundles, Namespaces, Lazy Loading](#13-loading-translations--bundles-namespaces-lazy-loading)
- [14. Type-Safe Translation Keys](#14-type-safe-translation-keys)
- [15. The Translation Workflow — Extraction, TMS, Pseudo-Localization](#15-the-translation-workflow--extraction-tms-pseudo-localization)
- [16. Backend and API Concerns](#16-backend-and-api-concerns)
- [17. SEO for Multilingual Sites](#17-seo-for-multilingual-sites)
- [18. Accessibility and Language](#18-accessibility-and-language)
- [19. Testing Internationalized UIs](#19-testing-internationalized-uis)
- [20. Common Pitfalls](#20-common-pitfalls)
- [21. Interview Questions](#21-interview-questions)
- [Related Files](#related-files)

---

## 1. The Mental Model — i18n vs l10n, Locales

```text
‼️ TWO DIFFERENT JOBS

  i18n — INTERNATIONALIZATION (engineering, done once)
    Make the app CAPABLE of supporting any language and region:
    no hard-coded text, locale-aware formatting, layouts that survive longer text and RTL,
    Unicode everywhere, translations loaded by locale.
    ("i18n" = i + 18 letters + n)

  l10n — LOCALIZATION (content, done per locale)
    Actually adapt it for one market: translating text, local formats, currency,
    images, legal text, culturally appropriate examples.

  Rule of thumb: i18n is cheap at the start and expensive to retrofit. Even if you launch
  in one language, put user-facing strings behind t() / formatters from day one if a
  second language is at all likely.
```

```text
LOCALE = language + (optional) script + (optional) region — a BCP 47 tag

  en           English
  en-US        English as used in the United States   (dates 11/12/2026, $)
  en-GB        English in the UK                       (12/11/2026, £, "colour")
  zh-CN        Chinese, mainland China   → Simplified characters
  zh-TW        Chinese, Taiwan           → Traditional characters
  zh-Hans      Chinese in Simplified script (any region)
  zh-Hant-HK   Chinese, Traditional script, Hong Kong
  pt-BR / pt-PT  Brazilian vs European Portuguese — different vocabulary
  es-419       Spanish for Latin America
  ar-EG        Arabic, Egypt (right-to-left)

  ‼️ LANGUAGE ≠ COUNTRY. Switzerland has 4 languages; Spanish is spoken in 20+ countries.
     Don't use flags for a language picker — show each language's name in itself
     ("English", "Español", "中文（简体）", "日本語").

  ‼️ The UI language and the formatting region can differ: an English-speaking user living
     in Germany may want English text with euro prices and 24-hour time.

  FALLBACK CHAIN: zh-Hant-HK → zh-Hant → zh → default (en)
  Translations are looked up along the chain, so a regional variant only needs to override
  the strings that differ.
```

---

## 2. Choosing the User's Locale

```text
‼️ ORDER OF PRECEDENCE (first one that exists wins)

  1. Explicit choice     the user picked a language → saved in their profile / a cookie
  2. The URL             /fr/pricing, fr.example.com — shareable, SEO-friendly
  3. Browser preference  navigator.languages (client) / Accept-Language header (server)
  4. Default locale      e.g. "en"

  Then NEGOTIATE against the locales you actually support:
    user wants ["pt-BR", "en"]; you support ["en", "pt-PT", "es"]
    → best match "pt-PT" (same language) — or "en" if you prefer exact-language matches
    Libraries: @formatjs/intl-localematcher, negotiator (server), next-intl middleware.

  ❌ Don't pick language from IP geolocation. Travellers, VPNs, multilingual countries.
     Use geo at most to SUGGEST a region (currency, shipping), never to force the language.
```

```js
// Client-side negotiation, minimal version
const SUPPORTED = ['en', 'zh-CN', 'es', 'ar'];
function pickLocale() {
  const saved = localStorage.getItem('locale');
  if (saved && SUPPORTED.includes(saved)) return saved;
  for (const wanted of navigator.languages) {
    if (SUPPORTED.includes(wanted)) return wanted;                     // exact: zh-CN
    const lang = wanted.split('-')[0];
    const match = SUPPORTED.find(s => s.split('-')[0] === lang);       // language only: zh-TW → zh-CN?
    if (match) return match;   // ‼️ think about whether that's acceptable (zh-TW users read Traditional)
  }
  return 'en';
}

// Keep <html lang> and dir in sync with the active locale
const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];
document.documentElement.lang = locale;
document.documentElement.dir = RTL_LANGS.includes(locale.split('-')[0]) ? 'rtl' : 'ltr';
// (Intl.Locale's getTextInfo().direction gives this too, but isn't in every browser yet.)
```

---

## 3. Messages — Keys, Interpolation, and Why Concatenation Breaks

```text
‼️ NEVER BUILD SENTENCES BY CONCATENATION

   ❌ t('Hello') + ', ' + name + '! ' + t('You have') + ' ' + count + ' ' + t('messages')

   Word order differs between languages. Translators need the WHOLE sentence with
   placeholders:
     en  "Hello, {name}! You have {count} messages."
     ja  "{name}さん、こんにちは！メッセージが{count}件あります。"
     de  "Hallo {name}! Sie haben {count} Nachrichten."
   In Japanese the name and the count move to different positions — impossible with
   concatenated fragments.

   Also never reuse a fragment because the English happens to match:
     "Open" (verb: open the file) vs "Open" (adjective: the store is open) are different
     words in most languages → two keys.
```

```text
KEY STYLES

  1. Semantic keys:   t('cart.checkoutButton')
       ✅ stable when English copy changes; easy to namespace
       ❌ need a lookup to know what the text is; translators need context
  2. Source text as key:  t('Proceed to checkout')   (gettext / Lingui style)
       ✅ readable code; fallback is the English text itself
       ❌ changing the English changes the key → re-translation
  Most React teams use semantic keys with namespaces per feature:
     common.save, auth.login.title, cart.items_one / cart.items_other

  GIVE TRANSLATORS CONTEXT: descriptions in the message catalog
  ("Button label, max ~15 chars", "{count} is a number of tasks"), screenshots in the TMS.
```

---

## 4. Plurals, Gender, and ICU MessageFormat

```text
‼️ PLURAL RULES DIFFER BY LANGUAGE (Intl.PluralRules categories)

  English     one, other                 1 file / 2 files / 0 files
  French      one, many, other           0 and 1 are "one" (0 fichier, 1 fichier)
  Russian     one, few, many, other      1 файл, 2 файла, 5 файлов, 21 файл
  Arabic      zero, one, two, few, many, other
  Chinese / Japanese / Korean   other only (no grammatical plural)

  ‼️ count === 1 ? 'file' : 'files' is English logic. Let the library pick the category.
```

```text
ICU MESSAGEFORMAT — the standard syntax for plurals, select, and formatting
(used by react-intl/FormatJS, next-intl, and i18next with the ICU plugin)

  Plural:
    "{count, plural,
       =0 {No tasks}
       one {# task}
       other {# tasks}}"
    #  = the number, formatted for the locale
    =0 = an exact match (checked before categories)

  Select (gender, roles, any enum):
    "{gender, select,
       female {She replied}
       male {He replied}
       other {They replied}}"
    ‼️ always include `other`

  Nested:
    "{count, plural, one {{name} added # photo} other {{name} added # photos}}"

  Formatted arguments:
    "Due {date, date, medium}"     "Total: {amount, number, ::currency/USD}"

  Ordinal:
    "{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} place"
```

```text
i18next's DEFAULT plural format (without ICU) — suffixed keys:
  "tasks_zero":  "No tasks",          ← optional, only used if count === 0 and present
  "tasks_one":   "{{count}} task",
  "tasks_other": "{{count}} tasks"
  t('tasks', { count: 5 })  → picks the suffix with Intl.PluralRules for the active language.
  Russian translators add tasks_few / tasks_many; Chinese only need tasks_other.
```

---

## 5. Choosing a Library

```text
  LIBRARY                  BEST FOR                                   MESSAGE FORMAT
  ───────────────────────  ─────────────────────────────────────────  ──────────────────────
  react-i18next            ‼️ most popular; huge plugin ecosystem      i18next JSON
  (i18next)                (backends, detectors); works outside       ({{var}}, _one/_other);
                           React too (Node, vanilla)                  ICU via plugin
  react-intl (FormatJS)    ICU-first, strong formatting components,   ICU MessageFormat
                           message extraction + compile tooling
  next-intl                Next.js App Router: Server Components,     ICU MessageFormat
                           locale routing middleware, typed keys
  Lingui                   source-text-as-key with macros, compile-   ICU (PO / JSON
                           time extraction, very small runtime        catalogs)
  Paraglide JS (inlang)    compile-time: each message becomes a       inlang format
                           tree-shakeable function — tiny bundles,
                           fully typed

  Whatever you pick: one library across the app, ICU-compatible plurals, extraction
  tooling, and lazy loading per locale.
```

---

## 6. react-i18next in Depth

```ts
// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)            // load /locales/{{lng}}/{{ns}}.json on demand
  .use(LanguageDetector)       // querystring → cookie → localStorage → navigator → htmlTag
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'zh-CN', 'es', 'ar'],
    fallbackLng: 'en',         // ‼️ missing key in zh-CN → show English, not the raw key
    ns: ['common'],            // namespaces loaded at start; others lazy
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,      // ‼️ React already escapes output — avoid double escaping
    },
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: { order: ['querystring', 'localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
// main.tsx: import './i18n'; before rendering <App />
```

```json
// public/locales/en/common.json
{
  "nav": { "home": "Home", "tasks": "Tasks" },
  "greeting": "Hello, {{name}}!",
  "tasks_zero": "No tasks yet",
  "tasks_one": "{{count}} task",
  "tasks_other": "{{count}} tasks",
  "lastSeen": "Last seen {{date, datetime}}",
  "price": "Price: {{amount, currency(USD)}}"
}
```

```tsx
import { useTranslation, Trans } from 'react-i18next';

function Header({ user, taskCount }) {
  const { t, i18n } = useTranslation();               // default namespace
  // const { t } = useTranslation('settings');         // another namespace (lazy-loaded)
  return (
    <header>
      <h1>{t('greeting', { name: user.name })}</h1>
      <p>{t('tasks', { count: taskCount })}</p>      {/* ‼️ pass count → plural picked */}
      <p>{t('lastSeen', { date: new Date(user.lastSeen) })}</p>
      <select value={i18n.resolvedLanguage}
              onChange={e => i18n.changeLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="zh-CN">中文（简体）</option>
        <option value="es">Español</option>
        <option value="ar">العربية</option>
      </select>
    </header>
  );
}
// i18n.changeLanguage re-renders every component using useTranslation.
// i18n.on('languageChanged', lng => { document.documentElement.lang = lng; document.documentElement.dir = i18n.dir(lng); })
```

```tsx
// Suspense: useTranslation suspends while a namespace loads (default react.useSuspense: true)
<Suspense fallback={<PageSpinner />}>
  <SettingsPage />      {/* uses useTranslation('settings') → loads settings.json first */}
</Suspense>

// Outside components (utilities, toasts, validation messages):
import i18n from './i18n';
i18n.t('errors.network');
// ‼️ Don't translate at MODULE load time (const LABEL = i18n.t('x')) — it runs once, before
// translations load and never updates on language change. Translate at render/call time.

// Zod error messages: store KEYS in the schema, translate when displaying:
//   z.string().min(1, 'errors.required')  →  {t(errors.name.message)}
```

---

## 7. react-intl (FormatJS) in Depth

```tsx
import { IntlProvider, FormattedMessage, FormattedNumber, FormattedDate, useIntl } from 'react-intl';

const messages = {
  en: {
    'cart.items': '{count, plural, =0 {Your cart is empty} one {# item in your cart} other {# items in your cart}}',
    'cart.total': 'Total: {total, number, ::currency/USD}',
  },
  'zh-CN': {
    'cart.items': '{count, plural, =0 {购物车是空的} other {购物车里有 # 件商品}}',
    'cart.total': '合计：{total, number, ::currency/USD}',
  },
};

function App({ locale }) {
  return (
    <IntlProvider locale={locale} messages={messages[locale]} defaultLocale="en"
                  onError={(err) => { if (err.code !== 'MISSING_TRANSLATION') console.error(err); }}>
      <Cart />
    </IntlProvider>
  );
}

function Cart({ items, total }) {
  const intl = useIntl();
  return (
    <section aria-label={intl.formatMessage({ id: 'cart.label', defaultMessage: 'Shopping cart' })}>
      <FormattedMessage
        id="cart.items"
        defaultMessage="{count, plural, =0 {Your cart is empty} one {# item} other {# items}}"
        description="Cart summary, count is the number of items"   // ‼️ context for translators
        values={{ count: items.length }}
      />
      <FormattedNumber value={total} style="currency" currency="USD" />
      <FormattedDate value={new Date()} dateStyle="medium" />
    </section>
  );
}
// intl.formatMessage / formatNumber / formatDate / formatRelativeTime / formatList for strings
// (attributes like aria-label, placeholder, document.title).
// defaultMessage in code + `formatjs extract` → the source catalog is generated from code (§15).
```

---

## 8. Next.js — next-intl and Locale Routing

```text
‼️ LOCALE IN THE URL is the norm for public sites: /en/pricing, /zh-CN/pricing
   - each language gets its own indexable URL (SEO)
   - links are shareable in a specific language
   - the server knows the locale on every request (Server Components can translate)

   Patterns:
     /[locale]/...            prefix every route (prefix "as-needed" can omit the default)
     zh.example.com           subdomains / separate domains per market
     cookie only              apps behind login where SEO doesn't matter
```

```ts
// next-intl setup (App Router), simplified
// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';
export const routing = defineRouting({
  locales: ['en', 'zh-CN', 'es'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',     // /pricing for en, /zh-CN/pricing for others
});

// middleware.ts — negotiates the locale (cookie, Accept-Language) and redirects/rewrites
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
export default createMiddleware(routing);
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };

// i18n/request.ts — loads messages for the request's locale (server side)
import { getRequestConfig } from 'next-intl/server';
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
```

```tsx
// app/[locale]/page.tsx — Server Component: translations never ship to the client
import { getTranslations } from 'next-intl/server';
export default async function Page() {
  const t = await getTranslations('Home');
  return <h1>{t('title')}</h1>;
}

// Client Component
'use client';
import { useTranslations, useFormatter } from 'next-intl';
export function TaskCount({ count, due }) {
  const t = useTranslations('Tasks');
  const format = useFormatter();
  return <p>{t('count', { count })} · {format.dateTime(due, { dateStyle: 'medium' })}</p>;
}
// Locale-aware navigation: createNavigation(routing) gives Link / redirect / useRouter that
// keep the current locale prefix.
// ‼️ Pass a fixed timeZone in the next-intl config so server and client format dates the
// same way — otherwise hydration mismatches (see the dates guide §17).
```

---

## 9. Formatting Dates, Numbers, and Currency in an i18n Setup

```text
‼️ TRANSLATED TEXT + UNLOCALIZED NUMBERS IS A HALF-DONE JOB

   Use the ACTIVE LOCALE from your i18n library for every Intl call — not navigator.language
   and not a hard-coded 'en-US' — so a user who switched the app to German gets
   "12.11.2026" and "1.234,50 €".

     const { i18n } = useTranslation();
     new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(d)

   Or the library's helpers:
     i18next:     "{{date, datetime}}", "{{n, number}}", "{{amount, currency(EUR)}}"
     react-intl:  <FormattedDate/>, intl.formatNumber(), "{n, number, ::percent}"
     next-intl:   useFormatter().dateTime / number / relativeTime / list

   ‼️ Currency comes from the DATA (what the price is in), locale from the USER. Changing the
      UI language must not turn $10 into €10.
   Time zone comes from the user's settings or device — separate from the locale.
   Units: metric vs imperial is a regional preference (en-US → miles, en-GB → mixed!) —
   often a user setting rather than derived from locale.
```

---

## 10. Rich Text — Links and Bold Inside Translations

```text
‼️ DON'T SPLIT A SENTENCE TO INSERT A LINK

   ❌ {t('agree1')} <a href="/terms">{t('terms')}</a> {t('agree2')}
      → translators get three fragments with no idea how they connect.

   ✅ Keep one message with TAGS the library maps to components:
      "By signing up you agree to our <terms>Terms of Service</terms>."
```

```tsx
// react-i18next: <Trans> with named components
// "agree": "By signing up you agree to our <terms>Terms</terms> and <privacy>Privacy Policy</privacy>."
<Trans
  i18nKey="agree"
  components={{
    terms: <a href="/terms" />,
    privacy: <a href="/privacy" />,
  }}
/>

// react-intl / next-intl: rich text with functions
// "agree": "By signing up you agree to our <terms>Terms</terms>."
<FormattedMessage id="agree" values={{ terms: (chunks) => <a href="/terms">{chunks}</a> }} />
t.rich('agree', { terms: (chunks) => <Link href="/terms">{chunks}</Link> });   // next-intl

// ‼️ Never put raw HTML in translations and render with dangerouslySetInnerHTML —
// translation files come from external vendors/tools; that's an XSS path.
```

---

## 11. Right-to-Left Languages

```text
RTL LANGUAGES: Arabic (ar), Hebrew (he), Persian (fa), Urdu (ur) — hundreds of millions of users.

‼️ WHAT CHANGES IN RTL
   - text runs right to left; the whole layout MIRRORS: sidebar on the right, "back"
     arrows point right, progress bars fill from the right, the close button moves left
   - numbers, Latin brand names and code stay LTR inside RTL text (bidirectional text)
   - NOT mirrored: media playback controls, clocks, graphs' time axis (usually), logos,
     icons of real objects (a camera), checkmarks

   STEP 1: set direction on <html>
     <html lang="ar" dir="rtl">     (i18next: i18n.dir(lng) → 'rtl' | 'ltr')
   STEP 2: write CSS with LOGICAL properties so it flips automatically
```

```css
/* ❌ physical — wrong in RTL */
.card { margin-left: 16px; padding-right: 8px; text-align: left; border-left: 3px solid; }

/* ✅ logical — "start" = left in LTR, right in RTL */
.card {
  margin-inline-start: 16px;
  padding-inline-end: 8px;
  text-align: start;
  border-inline-start: 3px solid var(--accent);
}
/* inset-inline-start replaces left/right for positioned elements */
.badge { position: absolute; inset-inline-end: 8px; inset-block-start: 8px; }

/* Flexbox and grid already follow the writing direction — row order flips by itself. */

/* Mirror directional icons only */
[dir='rtl'] .icon-arrow { transform: scaleX(-1); }

/* Tailwind: ms-4 / me-4 / ps-2 / pe-2 / start-0 / end-0 (logical utilities), rtl: variant */
```

```text
BIDIRECTIONAL TEXT TIPS
  - User-generated content of unknown direction: <bdi>{username}</bdi> or dir="auto" on
    inputs/paragraphs, so "Ahmad commented" doesn't scramble around an Arabic name.
  - Phone numbers, codes, emails inside RTL text: wrap in <span dir="ltr">.
  - Test with real Arabic/Hebrew strings, not reversed English.
```

---

## 12. Layout, Fonts, and Text Expansion

```text
‼️ TRANSLATED TEXT IS USUALLY LONGER

   English → German/Finnish/French: often +30–40%; short labels can double
   ("Save" → "Speichern", "Settings" → "Einstellungen").
   Chinese/Japanese are usually SHORTER in characters but need more height (bigger glyphs).

   - Never give text containers fixed widths; let buttons and tabs grow; allow wrapping.
   - Test the longest language (and pseudo-localization, §15) for truncation and overlap.
   - Truncate with CSS (text-overflow: ellipsis + title/tooltip) only where unavoidable.
   - Avoid text in images; avoid icons that rely on English puns.
   - German has very long compound words: overflow-wrap: anywhere / hyphens: auto with lang set.
```

```text
FONTS
  - Your Latin web font probably has no Chinese/Japanese/Arabic glyphs → the browser falls
    back to a system font. Define a per-language font stack:
      :lang(zh-CN) { font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif; }
      :lang(ja)    { font-family: 'Inter', 'Hiragino Sans', 'Noto Sans JP', sans-serif; }
      :lang(ar)    { font-family: 'Noto Sans Arabic', 'Tahoma', sans-serif; }
  - CJK web fonts are huge (several MB). Prefer system fonts, or subset with unicode-range.
  - Don't letter-space or uppercase (text-transform) non-Latin scripts; CJK has no case,
    Arabic letters must connect.
  - Set lang correctly: the same Unicode character (e.g. 直) is drawn differently in
    Chinese vs Japanese fonts — lang picks the right glyph variant.
  - Line breaking: CJK text breaks between characters; word-break: keep-all for Korean;
    Intl.Segmenter when you split text in JS (see the dates/Intl guide §12).
```

---

## 13. Loading Translations — Bundles, Namespaces, Lazy Loading

```text
OPTIONS
  1. Bundle every locale into the JS        simplest; ‼️ every user downloads every language
  2. Load the active locale on demand       /locales/zh-CN/common.json via fetch or dynamic
                                            import(`./locales/${lng}.json`) — Vite/webpack
                                            split each into its own chunk
  3. Split by NAMESPACE (feature) too       common.json at startup, settings.json when the
                                            settings route loads → pairs with route lazy loading
  4. Server-render with translations        Next.js Server Components: messages used only on
                                            the server never reach the client bundle

  - Cache translation files with content hashes in file names (long cache, safe updates).
  - Avoid a flash of untranslated text: render a loader until the first namespace is ready
    (Suspense with react-i18next), or inline the initial locale's messages in the HTML (SSR).
  - Preload the next likely namespace on hover/route prefetch.
```

```ts
// Vite: lazy-load per locale with dynamic import (each JSON becomes its own chunk)
import resourcesToBackend from 'i18next-resources-to-backend';
i18n.use(resourcesToBackend((lng: string, ns: string) => import(`./locales/${lng}/${ns}.json`)));
```

---

## 14. Type-Safe Translation Keys

```ts
// react-i18next: declare your resources once → t('typo') is a TypeScript error
// src/@types/i18next.d.ts
import 'i18next';
import type common from '../../public/locales/en/common.json';
import type settings from '../../public/locales/en/settings.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: { common: typeof common; settings: typeof settings };
  }
}
// t('nav.home') ✅    t('nav.hom') ❌ compile error    t('tasks', { count }) ✅

// next-intl: declare the messages type (AppConfig / IntlMessages, depending on version)
// so useTranslations('Home') and t('title') are checked against messages/en.json.
// Paraglide / TanStack-style compile-time libraries generate typed functions directly: m.greeting({ name })
```

```text
‼️ Use the SOURCE language file (en) as the type. Then CI also checks the other locales:
   - a script that diffs keys between en.json and each locale (missing / extra keys)
   - i18next-parser / formatjs extract to find keys used in code but missing in catalogs
   - unused keys cleanup
```

---

## 15. The Translation Workflow — Extraction, TMS, Pseudo-Localization

```text
THE PIPELINE IN A REAL TEAM

  developer writes t('checkout.title') + adds English to en.json (or defaultMessage in code)
        ↓
  EXTRACTION in CI: i18next-parser / formatjs extract / lingui extract
        → updates the source catalog, fails the build on missing keys
        ↓
  sync to a TMS (Translation Management System): Crowdin, Lokalise, Phrase, Transifex, Tolgee
        - translators see context, screenshots, max length, glossary, translation memory
        - machine translation (DeepL / LLMs) as a first draft, humans review
        ↓
  translations come back as a PR (or downloaded at build / fetched at runtime via CDN/OTA)
        ↓
  QA in staging per locale → release

  ‼️ Don't block every release on translations: ship with fallback to English for brand-new
  strings, and track "untranslated" counts per locale.
```

```text
‼️ PSEUDO-LOCALIZATION — find i18n bugs without any translator

   A fake locale that transforms every English string:
     "Save changes"  →  "[Šåvé çĥåñĝéš one two]"
       accents      → proves Unicode rendering + fonts work
       brackets     → shows clipped/truncated text and string concatenation
                      (a missing bracket = text was split or hard-coded)
       padding      → simulates +30–40% expansion
   Anything that still appears in plain English is a HARD-CODED string.
   Also try a pseudo-RTL locale to check mirroring.
   Tools: FormatJS pseudo-locales (en-XA / en-XB), i18next post-processors, TMS built-ins.
```

---

## 16. Backend and API Concerns

```text
  - Send the active locale with requests: Accept-Language header (and/or a user profile
    setting) so the server localizes emails, PDFs, push notifications, error messages.
  - ‼️ Prefer error CODES from the API ({ code: 'EMAIL_TAKEN', field: 'email' }) and translate
    on the client. English messages from the server can't be localized and break when copy changes.
  - Store user content in UTF-8 everywhere (MySQL: utf8mb4, not utf8 — which can't store
    emoji). Normalize when comparing (str.normalize('NFC')) — "é" can be one or two code points.
  - Search and sorting: database collations per language (PostgreSQL ICU collations),
    full-text search configs per language.
  - Translatable DATA (product names, categories): a translations table
    (entity_id, locale, field, value) or JSON columns { "en": "...", "zh-CN": "..." },
    with fallback to the default locale.
  - Don't store formatted dates/numbers — store raw values, format at display.
  - Emails and notifications are sent when the user isn't looking: use the user's saved
    locale + time zone, not the server's.
```

---

## 17. SEO for Multilingual Sites

```html
<!-- Each language version links to all others, plus a default for everyone else -->
<link rel="alternate" hreflang="en" href="https://example.com/pricing" />
<link rel="alternate" hreflang="zh-CN" href="https://example.com/zh-CN/pricing" />
<link rel="alternate" hreflang="es" href="https://example.com/es/pricing" />
<link rel="alternate" hreflang="x-default" href="https://example.com/pricing" />
<html lang="zh-CN">   <!-- matches the page's actual language -->
```

```text
  - One URL per language (path prefix or subdomain), server-rendered in that language.
    ‼️ Content that only changes language client-side after JS runs is invisible to most crawlers.
  - Don't auto-redirect crawlers/users by Accept-Language on every request — suggest a switch
    with a banner, and remember the choice. (Redirecting only from "/" is common and OK.)
  - Translate <title>, meta description, Open Graph tags, URL slugs (optional), sitemap per locale.
  - Canonical URL points to the same-language page, not to the English one.
```

---

## 18. Accessibility and Language

```text
  - <html lang="..."> must match the page language → screen readers pick the right voice and
    pronunciation. Wrong lang = English synthesizer reading Chinese, unintelligible.
  - Mark inline language changes: <span lang="fr">déjà vu</span>
  - Translate ALL non-visible text too: aria-label, alt, title, placeholder, visually-hidden
    text, live-region announcements, document <title>.
  - Language picker: each option's name in its own language AND marked with lang:
      <option lang="zh-CN" value="zh-CN">中文（简体）</option>
  - Don't convey meaning only with culturally specific colors/icons (red = danger in the West,
    red = luck/positive in China; up arrows in stock tickers are red in China).
```

---

## 19. Testing Internationalized UIs

```tsx
// ── Unit tests: render with a real i18n instance and the source language ─────
// test-utils.tsx
import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import en from '../public/locales/en/common.json';

const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en', fallbackLng: 'en', resources: { en: { common: en } },
  defaultNS: 'common', interpolation: { escapeValue: false },
});
export const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);

// Assert on real English text (what users see), not keys.
test('pluralizes task count', () => {
  renderWithI18n(<Header user={user} taskCount={1} />);
  expect(screen.getByText('1 task')).toBeInTheDocument();
});

// ── Test another locale explicitly for plural/format logic ──────────────────
await testI18n.changeLanguage('ru');   // with ru resources loaded → "5 задач", "2 задачи"
```

```text
WHAT ELSE TO TEST
  - CI key check: every locale has every key used in code (§14)
  - Visual regression screenshots in the longest language + an RTL language (Playwright)
  - Pseudo-locale smoke test: no hard-coded strings left (§15)
  - Formatting assertions with explicit locales; normalize narrow no-break spaces (U+202F)
    that Intl inserts (e.g. before AM/PM, in French numbers)
  - Switching language at runtime updates everything (including <html lang>, dir, title)
```

---

## 20. Common Pitfalls

```text
  Each entry:  ✗ symptom
                 why  → the cause
                 fix  → what to do

  ✗ ‼️ Sentences come out in the wrong word order
      why  → concatenating translated fragments
      fix  → one message with placeholders (§3)

  ✗ "1 files", or wrong plurals in Russian/Arabic
      why  → hand-written count === 1 logic
      fix  → plural support in the library (ICU / _one/_other + count) (§4)

  ✗ Some text stays English after switching language
      why  → hard-coded strings, or translated once at module load
      fix  → t() at render time; pseudo-localization to find leftovers (§6, §15)

  ✗ Raw keys like "checkout.title" visible to users
      why  → missing translation, no fallback
      fix  → fallbackLng; CI check for missing keys (§6, §14)

  ✗ Labels overflow / buttons cut off in German
      why  → fixed widths sized for English
      fix  → flexible layouts; test long locales (§12)

  ✗ RTL layout half-mirrored
      why  → physical CSS (margin-left, left: 0, text-align: left)
      fix  → logical properties; dir on <html> (§11)

  ✗ Prices change currency when switching language
      why  → currency derived from locale
      fix  → currency from data, locale only for formatting (§9)

  ✗ Dates in English format inside a translated UI
      why  → Intl called with hard-coded 'en-US' or no locale
      fix  → pass the active i18n locale to every formatter (§9)

  ✗ Hydration mismatch in a translated Next.js page
      why  → server and client use different locale/time zone
      fix  → locale from the URL/cookie on both sides; fixed timeZone in config (§8)

  ✗ Language picker uses flags
      why  → language ≠ country
      fix  → language names in their own language (§1)

  ✗ Chinese / Arabic text shows in a fallback font or as boxes (tofu)
      why  → web font lacks those glyphs
      fix  → per-language font stacks with system fonts (§12)

  ✗ Screen reader mispronounces everything
      why  → <html lang> not updated with the locale
      fix  → set lang (and dir) on every language change (§18)

  ✗ Server error messages always English
      why  → API returns human-readable English text
      fix  → return error codes, translate on the client (§16)

  ✗ Translated HTML in messages causes XSS risk
      why  → dangerouslySetInnerHTML on translation strings
      fix  → <Trans> / rich text with component mapping (§10)

  ✗ Every user downloads all languages
      why  → all locales bundled
      fix  → lazy-load per locale and namespace (§13)
```

---

## 21. Interview Questions

### "What's the difference between i18n and l10n?"

Internationalization is the engineering work that makes the app able to support any locale — externalized strings, locale-aware formatting, flexible and RTL-ready layouts, Unicode. Localization is adapting it to a specific locale — translations, formats, currency, content. You do i18n once; l10n per market.

### "How do you handle plurals?"

Never `count === 1`. Languages have different plural categories (English 2, Russian 4, Arabic 6, Chinese 1). Use ICU MessageFormat (`{count, plural, one {...} other {...}}`) or i18next's `_one/_other` keys with `count`, which use `Intl.PluralRules` to pick the right form.

### "How do you decide which language to show?"

Explicit user choice (profile/cookie) first, then the locale in the URL, then `Accept-Language`/`navigator.languages`, then a default — negotiated against the supported locales with a fallback chain. Not IP geolocation. Keep `<html lang>` and `dir` in sync.

### "How do you support right-to-left languages?"

Set `dir="rtl"` on `<html>`, write CSS with logical properties (`margin-inline-start`, `inset-inline-end`, `text-align: start`) so layouts mirror automatically, mirror only directional icons, isolate unknown-direction user content with `<bdi>` or `dir="auto"`, and test with real RTL text.

### "How do you keep translation bundles small?"

Load only the active locale, split by namespace per feature or route, lazy-load with dynamic imports or an HTTP backend, cache hashed files, and in SSR frameworks keep server-only translations out of the client bundle.

### "How do you make sure nothing is left untranslated?"

Extraction tools in CI that compare keys used in code with every locale's catalog, typed keys so typos fail compilation, fallback to the source language at runtime, and pseudo-localization to reveal hard-coded strings, concatenation and truncation.

### "Why shouldn't the server return error messages in English?"

They can't be translated or reworded on the client. Return stable error codes (and field names); the client maps them to localized messages.

---

## Related Files

- [../1-high-priority/JS-DATES-TIME-INTL-DEEP.md](../1-high-priority/JS-DATES-TIME-INTL-DEEP.md) — every Intl API, time zones, currency handling
- [../1-high-priority/REACT-FORMS-DEEP.md](../1-high-priority/REACT-FORMS-DEEP.md) — translating validation messages
- [../1-high-priority/REACT-ROUTING-DEEP.md](../1-high-priority/REACT-ROUTING-DEEP.md) — locale prefixes in routes
- [NEXTJS-DEEP.md](NEXTJS-DEEP.md) — App Router, middleware, Server Components
- [CSS-DEEP.md](CSS-DEEP.md) — logical properties, layout
- [../3-low-priority/ACCESSIBILITY-MED-DEEP.md](../3-low-priority/ACCESSIBILITY-MED-DEEP.md) — lang attributes, screen readers
