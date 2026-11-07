# Storybook — Beginner's Guide

**Priority: HIGH**

> A plain-language introduction to Storybook: what it is, why teams use it, how to add it to a
> project, how to write your first stories, and the few mistakes that trip up most beginners.
>
> Assumes you know React components and props. Examples use Storybook 10 with React + Vite + TypeScript,
> based on the components in this repo's `client/` app (Button, TaskList).

---

## Table of Contents

- [Storybook — Beginner's Guide](#storybook--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. What Storybook Is](#1-what-storybook-is)
  - [2. What You See When It Runs](#2-what-you-see-when-it-runs)
  - [3. Adding Storybook to a Project](#3-adding-storybook-to-a-project)
  - [4. The Two Config Files](#4-the-two-config-files)
  - [5. Your First Story File](#5-your-first-story-file)
  - [6. Args and Controls — Change Props Live](#6-args-and-controls--change-props-live)
  - [7. Actions — Fake Callback Props](#7-actions--fake-callback-props)
  - [8. A Real Example — TaskList](#8-a-real-example--tasklist)
  - [9. Decorators — Wrapping Stories](#9-decorators--wrapping-stories)
  - [10. Docs Pages and Interaction Tests](#10-docs-pages-and-interaction-tests)
  - [11. Building and Sharing](#11-building-and-sharing)
  - [12. Common Beginner Mistakes](#12-common-beginner-mistakes)
  - [13. Cheat Sheet](#13-cheat-sheet)
  - [14. Interview Answer](#14-interview-answer)
  - [Related Files](#related-files)

---

## 1. What Storybook Is

```text
Storybook is a separate little website that runs next to your app. It shows your
components ONE AT A TIME, outside the app, in every state you care about.

Without Storybook, to see what a "Delete" button looks like when it's disabled you have to:
  start the server → log in → create some data → click to the right page → make it disabled.

With Storybook you open http://localhost:6006, click "Button → Disabled", and there it is.

‼️ STORYBOOK IN ONE SENTENCE
   A "story" is one component rendered with one specific set of props.
   Storybook is a catalog of all your stories, with a panel to change props live.‼️
```

```text
WHAT A STORY IS — think of it as a saved screenshot that is still a live component

  Component:  Button
  Stories:    Default      → <Button>Button</Button>
              Destructive  → <Button variant="destructive">Delete</Button>
              Disabled     → <Button disabled>Button</Button>

WHAT TEAMS USE IT FOR
  ✓ Building a component in isolation, before the page/API around it exists
  ✓ Seeing hard-to-reach states: empty list, error, loading, very long text
  ✓ A living catalog of the design system — designers and PMs can browse it
  ✓ Docs: an auto-generated page per component with its props
  ✓ Tests: interaction tests, accessibility checks, and visual screenshot tests
    (Chromatic) all run against stories

WHAT IT IS NOT
  ✗ Not part of your app — users never see it, it isn't in your production bundle
  ✗ Not a replacement for unit tests (React Testing Library) — it complements them
```

---

## 2. What You See When It Runs

```bash
npm run storybook        # opens http://localhost:6006
```

```text
Say a project has stories for a Button and a TaskList. The left sidebar shows:

  UI
   └─ Button       Default · Destructive · Outline · Small · Disabled
  Tasks
   └─ TaskList     With Tasks · Empty

Click a story → it renders in the middle (the "canvas").
At the bottom is the addons panel:
  Controls   edit the props live (change variant, type new text, toggle disabled)
  Actions    a log of every callback the component called (click "Delete" and watch)

The files that make this work:
  .storybook/main.ts                        where stories are + which framework
  .storybook/preview.ts                     global CSS + defaults for every story
  src/components/ui/button.stories.tsx      Button stories
  src/components/TaskList.stories.tsx       TaskList stories
```

---

## 3. Adding Storybook to a Project

### Option A — the official generator (what you'll usually do)

```bash
# Run inside the folder that has your package.json (for this repo: client/)
npm create storybook@latest
# (older docs say `npx storybook@latest init` — same thing)
```

```text
WHAT THE GENERATOR DOES
  1. Detects your framework (React + Vite here) and installs the right packages
  2. Creates .storybook/main.ts and .storybook/preview.ts
  3. Adds two scripts to package.json: "storybook" and "build-storybook"
  4. Adds EXAMPLE stories in src/stories/ (Button, Header, Page) so you can see how it works
  5. Asks about optional extras — e.g. docs pages, accessibility checks, running stories as
     tests with Vitest. Saying yes to the recommended set is fine.
  6. Starts Storybook in the browser

‼️ The src/stories/ example files are just demos with their OWN Button/Header/Page
   components. Read them once, then delete the folder — they are not your components.‼️
```

### Option B — by hand (the minimal version)

```bash
npm install -D storybook @storybook/react-vite
```

```text
Then create the two config files from section 4, add the two scripts below, and write a
*.stories.tsx file. That's the whole setup — the generator just does these steps for you
and adds extras.
```

```json
// package.json
"scripts": {
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

```text
‼️ The two packages must have the SAME version (e.g. both 10.x). A mismatch causes
   confusing startup errors. `npx storybook upgrade` keeps them in sync.‼️
```

---

## 4. The Two Config Files

```typescript
// .storybook/main.ts — WHERE the stories are and HOW to build them
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // Glob pattern: every file ending in .stories.ts or .stories.tsx under src/
  stories: ['../src/**/*.stories.@(ts|tsx)'],

  // React + Vite. Storybook reuses your vite.config.ts, so Tailwind/PostCSS/aliases
  // work the same way they do in the app.
  framework: '@storybook/react-vite',

  // addons: ['@storybook/addon-docs'],   ← extras go here (see section 10)
};

export default config;
```

```typescript
// .storybook/preview.ts — what EVERY story gets
import type { Preview } from '@storybook/react-vite';

// ‼️ Import your global CSS here. Storybook does NOT run main.tsx, so without this
// line your components render with no styles at all.‼️
import '../src/index.css';

const preview: Preview = {
  parameters: {
    layout: 'centered', // 'centered' | 'padded' | 'fullscreen'
  },
};

export default preview;
```

```text
THE SPLIT, IN ONE LINE EACH
  main.ts      runs in Node, at build time   → finds files, picks framework, loads addons
  preview.ts   runs in the browser           → global CSS, decorators, default parameters
```

---

## 5. Your First Story File

```tsx
// src/components/ui/button.stories.tsx — put it NEXT TO the component
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

// ── 1. The default export ("meta") describes the component ───────────────────
const meta = {
  title: 'UI/Button',         // sidebar location — the slash makes a folder
  component: Button,          // which component these stories are for
  args: { children: 'Button' }, // default props shared by every story below
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── 2. Each NAMED export is one story ────────────────────────────────────────
export const Default: Story = {};   // uses only the default args

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete' },  // overrides the defaults
};

export const Disabled: Story = {
  args: { disabled: true },
};
```

```text
WHAT JUST HAPPENED
  export default meta   → one entry in the sidebar: "UI / Button"
  export const X        → one story under it, named from the export ("Destructive")
  args                  → the props passed to <Button />
                          final props = meta.args merged with the story's args

  So "Destructive" renders:  <Button variant="destructive">Delete</Button>

‼️ THE PATTERN TO REMEMBER
   default export = the component.  named exports = its states.  args = its props.‼️
```

```text
WHY `satisfies Meta<typeof Button>` AND NOT `: Meta<typeof Button>`?
  Both type-check the object. `satisfies` also lets TypeScript remember which args
  meta already provides, so stories aren't forced to repeat required props.
  Just copy this shape — it's what the official docs use.
```

---

## 6. Args and Controls — Change Props Live

```text
Because stories describe props as data (args), Storybook can build a form for them.

Open any story → "Controls" tab at the bottom:
  variant    [ default ▾ ]     ← a dropdown, because the type is a union of strings
  size       [ default ▾ ]
  disabled   [ ☐ ]             ← a checkbox, because it's a boolean
  children   [ Button      ]   ← a text box

Change one and the component re-renders instantly. Nothing is saved to the file —
it's a playground for trying states without writing code.

‼️ Controls are generated from your TypeScript prop types. Good prop types = good controls.‼️
```

```tsx
// Usually automatic. Override only when the guess is wrong:
const meta = {
  component: Button,
  argTypes: {
    variant: { control: 'radio' },        // radio buttons instead of a dropdown
    onClick: { control: false },          // hide from the Controls panel
  },
} satisfies Meta<typeof Button>;
```

---

## 7. Actions — Fake Callback Props

```text
Many components take callbacks: onClick, onDelete, onSubmit.
In Storybook there's no real app to handle them, so you pass a FAKE function that
just records each call.
```

```tsx
import { fn } from 'storybook/test';

const meta = {
  component: Button,
  args: { onClick: fn() },   // fake function
} satisfies Meta<typeof Button>;
```

```text
Now click the button in the canvas → the "Actions" tab shows:
   onClick  (SyntheticEvent)

‼️ Use fn() for every callback prop. It answers "did clicking this actually call
   the handler, and with what?" without wiring up any real logic.‼️
```

---

## 8. A Real Example — TaskList

```text
TaskList (client/src/components/TaskList.tsx) takes three props:
  tasks        the array to show
  onComplete   called with a task id
  onDelete     called with a task id

It's a "dumb" component — data comes in as props, events go out as callbacks.
‼️ That is exactly what makes it easy to put in Storybook: no API, no server, no
   hook to mock. Just pass fake props.‼️
```

```tsx
// src/components/TaskList.stories.tsx — next to TaskList.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TaskList } from './TaskList';

const meta = {
  title: 'Tasks/TaskList',
  component: TaskList,
  parameters: { layout: 'padded' }, // a list looks better full-width than centered
  args: {
    onComplete: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof TaskList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTasks: Story = {
  args: {
    tasks: [
      { id: '1', title: 'Write the README', completed: false, createdAt: '2026-11-01T09:00:00Z' },
      { id: '2', title: 'Set up Storybook', completed: true, createdAt: '2026-11-02T09:00:00Z' },
      { id: '3', title: 'Deploy to staging', completed: false, createdAt: '2026-11-03T09:00:00Z' },
    ],
  },
};

// The empty state — easy to forget about in the real app, one click away here
export const Empty: Story = {
  args: { tasks: [] },
};
```

```text
WHICH STORIES SHOULD A COMPONENT HAVE?
  One per state that LOOKS different or BEHAVES different:
    ✓ normal / with data
    ✓ empty
    ✓ loading, error (if the component shows them)
    ✓ edge cases: very long title, 100 items, disabled
  Not one per possible prop combination — that's what Controls are for.

WHAT ABOUT App.tsx, WHICH CALLS useTasks() AND FETCHES FROM THE SERVER?
  Components that fetch their own data are harder to story — you'd need to mock the
  network (the msw-storybook-addon library does this). As a beginner, story the
  presentational components (TaskList, TaskForm, Button) and leave data-fetching
  containers out.
```

---

## 9. Decorators — Wrapping Stories

```text
A decorator wraps a story in extra markup. Use it when the component needs something
around it to render properly: a fixed width, a background, or a Provider.
```

```tsx
// For one component's stories — in the meta
const meta = {
  component: TaskList,
  decorators: [
    Story => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskList>;
```

```tsx
// For EVERY story — in .storybook/preview.tsx (rename .ts → .tsx once it has JSX)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const preview: Preview = {
  decorators: [
    Story => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};
```

```text
‼️ If a component crashes in Storybook with "No QueryClient set" / "useX must be used
   within a Provider", it's missing a Provider your app normally gives it.
   Add that Provider as a decorator.‼️
```

---

## 10. Docs Pages and Interaction Tests

These are optional extras. The generator offers them; with the minimal setup you add them yourself.

### Auto-generated docs page

```bash
npm install -D @storybook/addon-docs
```

```typescript
// .storybook/main.ts
addons: ['@storybook/addon-docs'],
```

```tsx
// In a stories file — add the "autodocs" tag
const meta = {
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;
```

```text
Storybook adds a "Docs" page for Button: every story on one page plus a props table
built from your TypeScript types. This is the "living style guide" part.
```

### Interaction tests — the `play` function

```tsx
import { expect, fn } from 'storybook/test';

export const ClickDelete: Story = {
  args: {
    tasks: [{ id: '1', title: 'Write the README', completed: false, createdAt: '2026-11-01T09:00:00Z' }],
  },
  // play runs AFTER the story renders — like a tiny automated user
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
    await expect(args.onDelete).toHaveBeenCalledWith('1');
  },
};
```

```text
Open this story → the "Interactions" tab replays each step and shows pass/fail.

‼️ The API is the same as React Testing Library (getByRole, userEvent, expect).
   If you know REACT-TESTING-BASICS.md, you already know how to write these.‼️

With the Vitest addon (@storybook/addon-vitest, offered by the generator), every story —
with or without a play function — also runs as a test in CI. A story that throws while
rendering fails the test, so stories become cheap "does it render?" smoke tests.
```

---

## 11. Building and Sharing

```bash
npm run build-storybook     # outputs a static site to storybook-static/
npx serve storybook-static  # preview it locally
```

```text
storybook-static/ is plain HTML/JS — host it anywhere static (Netlify, Vercel, S3,
GitHub Pages) so designers and PMs can browse components without running code.

Chromatic (made by the Storybook team) hosts it AND takes a screenshot of every story
on each pull request, flagging any pixel that changed. That's "visual regression testing".

‼️ Add storybook-static/ to .gitignore — it's build output, like dist/.‼️
```

---

## 12. Common Beginner Mistakes

```text
‼️ 1. Forgetting to import global CSS in preview.ts.
   Components render as unstyled HTML. Storybook doesn't run main.tsx, so it never
   sees your `import './index.css'`. Add it to .storybook/preview.ts.

‼️ 2. Mismatched Storybook package versions.
   storybook@10 with @storybook/react-vite@8 → strange errors on startup.
   Keep every storybook / @storybook/* package on the same version.

‼️ 3. Using old (Storybook 7/8) imports from tutorials.
   Old: import { Meta } from '@storybook/react'; import { fn } from '@storybook/test';
   New: import type { Meta } from '@storybook/react-vite'; import { fn } from 'storybook/test';
   If a tutorial's imports don't resolve, check which version it was written for.

‼️ 4. Story file not showing up.
   The filename must match the `stories` glob in main.ts — e.g. Button.stories.tsx,
   not Button.story.tsx or Button.stories.jsx (if the glob only allows ts|tsx).

‼️ 5. Component crashes because it needs a Provider / router / API.
   Add the Provider as a decorator (section 9). If it fetches data itself, prefer
   writing stories for the presentational child components instead.

‼️ 6. Passing real functions (or nothing) for callbacks.
   Use fn() so clicks show up in the Actions panel and can be asserted in play tests.

‼️ 7. Keeping the generator's src/stories/ example folder.
   Those are demo components, not yours. Delete them once you've read them.

‼️ 8. One story per prop combination.
   Write a story per meaningful STATE (empty, error, long text). Use Controls to
   poke at the rest.
```

---

## 13. Cheat Sheet

```bash
# ── SETUP ─────────────────────────────────────────────────────────────────────
npm create storybook@latest          # generator (recommended)
npm install -D storybook @storybook/react-vite   # or by hand
npm run storybook                    # dev server → http://localhost:6006
npm run build-storybook              # static site → storybook-static/
npx storybook upgrade                # update all Storybook packages together
```

```tsx
// ── STORY FILE TEMPLATE ───────────────────────────────────────────────────────
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { MyComponent } from './MyComponent';

const meta = {
  title: 'Folder/MyComponent',        // sidebar path (optional — defaults to file path)
  component: MyComponent,
  args: { onClick: fn() },            // default props for all stories
  // tags: ['autodocs'],              // docs page (needs @storybook/addon-docs)
  // parameters: { layout: 'padded' },
  // decorators: [Story => <div style={{ width: 400 }}><Story /></div>],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Variant: Story = { args: { /* prop overrides */ } };
export const Clicked: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).toHaveBeenCalled();
  },
};

// ── RULES ─────────────────────────────────────────────────────────────────────
// 1. default export = component, named exports = states, args = props
// 2. Global CSS + Providers go in .storybook/preview
// 3. fn() for every callback prop
// 4. All Storybook packages on the same version
// 5. Story the presentational components; mock or skip data-fetching ones
```

---

## 14. Interview Answer

```text
Q: "Have you used Storybook? What's it for?"

"Storybook is a workshop for UI components. Each component gets a stories file
 that renders it in its important states — default, empty, loading, error, edge
 cases — outside the app, so you can build and review it without clicking through
 the real product.

 On a team it does three jobs: it's where we build components in isolation, it's
 the living documentation of the design system that designers and PMs can browse,
 and it's a test base — play functions for interactions, the a11y addon for
 accessibility, and Chromatic for visual regression on every PR.

 The thing that makes it work well is keeping components presentational — data in
 through props, events out through callbacks — so a story is just a set of args."
```

---

## Related Files

- [SENIOR-FRONTEND-DAILY-DEEP.md](SENIOR-FRONTEND-DAILY-DEEP.md) — Storybook section at senior depth, alongside the rest of the React tooling
- [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) — the same queries and userEvent API that play functions use
- [TESTING-ECOSYSTEM-DEEP.md](TESTING-ECOSYSTEM-DEEP.md) — visual regression testing and Chromatic
- [FRONTEND-ARCHITECTURE-DEEP.md](FRONTEND-ARCHITECTURE-DEEP.md) — design systems and component libraries
