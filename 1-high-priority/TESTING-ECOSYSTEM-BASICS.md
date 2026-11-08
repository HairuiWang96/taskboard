# Testing Ecosystem — Beginner's Guide

**Priority: HIGH**

> A plain-language map of how testing works on a real team: who tests what, when, where, and
> with which tools. It covers QA roles, bugs, environments, CI, the special kinds of testing,
> and releasing safely.
>
> This guide is about the PROCESS around tests, not about writing them. For writing your first
> tests, read [TESTING-BASICS.md](../2-medium-priority/TESTING-BASICS.md) (backend + E2E) and
> [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) (components). This is the beginner on-ramp to
> [TESTING-ECOSYSTEM-DEEP.md](TESTING-ECOSYSTEM-DEEP.md).

---

## Table of Contents

- [Testing Ecosystem — Beginner's Guide](#testing-ecosystem--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. What "the Testing Ecosystem" Means](#1-what-the-testing-ecosystem-means)
  - [2. The Big Picture — One Feature's Journey](#2-the-big-picture--one-features-journey)
  - [3. Who Tests What](#3-who-tests-what)
  - [4. Testing Inside a Sprint](#4-testing-inside-a-sprint)
  - [5. Manual Testing — The Words You'll Hear](#5-manual-testing--the-words-youll-hear)
  - [6. Bugs — Reporting and Tracking](#6-bugs--reporting-and-tracking)
  - [7. Test Environments](#7-test-environments)
  - [8. Test Data](#8-test-data)
  - [9. The CI Pipeline](#9-the-ci-pipeline)
  - [10. The Specialist Kinds of Testing](#10-the-specialist-kinds-of-testing)
  - [11. Releasing and Testing in Production](#11-releasing-and-testing-in-production)
  - [12. Metrics — What's Worth Measuring](#12-metrics--whats-worth-measuring)
  - [13. Common Beginner Misconceptions](#13-common-beginner-misconceptions)
  - [14. Cheat Sheet — Glossary](#14-cheat-sheet--glossary)
  - [15. Interview Answer](#15-interview-answer)
  - [Related Files](#related-files)

---

## 1. What "the Testing Ecosystem" Means

```text
When you start, "testing" means: write a test file, run `npm test`, see green.

On a real team, that's only one piece. Around it there's a whole system:

  WHO      developers, QA engineers, product managers, sometimes users
  WHEN     while coding, in code review, before release, after release
  WHERE    your laptop, CI, staging, production
  WHAT     logic, UI, speed, security, accessibility, "does it match what we asked for?"
  HOW      automated tests, manual checks, bug reports, release checklists, monitoring

‼️ THE ECOSYSTEM IN ONE SENTENCE
   Testing is a set of safety nets at different stages, run by different people,
   each catching the kinds of problems the earlier nets miss.‼️
```

```text
WHY BOTHER LEARNING THIS AS A DEVELOPER?
  ✓ You'll work with QA every sprint — knowing their vocabulary saves a lot of confusion
  ✓ Interviewers ask "how do you make sure your code works?" — the good answer is
    the whole system, not just "I write unit tests"
  ✓ Senior engineers are expected to design this system, not just add tests to it
```

---

## 2. The Big Picture — One Feature's Journey

```text
Follow one feature — "users can delete a task" — from idea to production.
Every arrow is a place where something gets tested.

  1. PLANNING         PM, dev and QA agree what "done" means
                        → acceptance criteria written in the ticket
            │
  2. CODING           Developer writes the code AND the automated tests
                        → unit, integration, component tests on their laptop
            │
  3. PULL REQUEST     CI runs every automated test + lint + type-check
                        → teammate reviews code AND tests
                        → maybe a preview environment for this PR
            │
  4. STAGING          Merged code deploys to a production-like environment
                        → E2E tests run
                        → QA does exploratory + regression testing
                        → PM checks it does what was asked (UAT)
            │
  5. RELEASE          Go / no-go decision, release checklist
                        → often a canary: release to 5% of users first
            │
  6. PRODUCTION       Smoke tests right after deploy
                        → monitoring and alerts keep "testing" forever

‼️ Bugs get MORE expensive at every step to the right. A bug found while coding costs
   minutes. The same bug found by a customer costs a support ticket, a hotfix, and trust.
   That's why most testing is pushed as far LEFT (early) as possible — "shift left".‼️
```

---

## 3. Who Tests What

```text
  ROLE                       WHAT THEY TEST                         MAIN TOOLS
  ─────────────────────────  ─────────────────────────────────────  ─────────────────────────
  Developer                  Their own code: logic, API, components  Vitest/Jest, RTL, supertest
  QA engineer (manual)       The product as a user would use it:     The app itself, Jira,
                             edge cases, flows, "what if I…?"        test case tools (TestRail)
  QA automation / SDET       Builds and maintains the E2E suite      Playwright, Cypress, CI
  Product manager            "Is this what we asked for?" (UAT)      The app, the ticket
  Designer                   Looks right, matches the design         The app, Figma, Storybook
  Security / SRE teams       Security scans, load, reliability       Snyk, k6, monitoring

SDET = Software Development Engineer in Test — a developer whose product is the test suite.
```

```text
‼️ THE MODERN DEFAULT: "QUALITY IS EVERYONE'S JOB"
   Developers own the automated tests for their code. QA is not a safety net you throw
   code over the wall to — they focus on what automation is bad at (exploring, judging
   UX, thinking like a confused user) and on the big-picture test strategy.

   Some teams have no dedicated QA at all; developers do everything. Others (banks,
   government, healthcare) have large QA departments and formal sign-offs. Same ideas,
   different amounts of process.‼️
```

---

## 4. Testing Inside a Sprint

```text
TESTING STARTS BEFORE CODING — "THREE AMIGOS"
  Before a ticket is picked up, three viewpoints look at it together:
    Product  — what do we want?
    Dev      — how will we build it?
    QA       — how could it break? how will we know it works?
  Output: clear acceptance criteria. Many bugs are prevented here, never written.
```

```text
ACCEPTANCE CRITERIA — the checklist of "this ticket is done when…"
Often written in Given / When / Then form:

  Given  I am logged in and have a task
  When   I click "Delete" and confirm
  Then   the task disappears from the list
  And    it is still gone after I refresh the page

‼️ Each line is something a test (automated or manual) can check. Vague criteria
   ("delete should work well") = arguments at the end of the sprint.‼️
```

```text
DEFINITION OF DONE (DoD) — the team-wide checklist for EVERY ticket, e.g.:
  ☐ Code reviewed and merged
  ☐ Unit / integration tests written and passing
  ☐ CI green
  ☐ Tested on staging by QA (or by another dev)
  ☐ Acceptance criteria all met
  ☐ No open critical bugs

If testing isn't in the DoD, it gets skipped when the sprint is tight.
```

```text
THE CLASSIC SPRINT PROBLEM
  Devs finish features on the last two days → QA has no time → testing squeezed or
  pushed to the next sprint.
  FIXES: smaller tickets, finish (and hand over) work earlier, devs help test, and
  more automation so QA isn't re-checking the same things by hand every sprint.
```

---

## 5. Manual Testing — The Words You'll Hear

```text
These sound similar and get mixed up constantly. The difference is SCOPE and PURPOSE.

  SMOKE TEST        "Is it on fire?" A quick check that the basics work at all
                    (app loads, can log in, main page shows). Run after every deploy.
                    If it fails, stop — nothing else is worth testing.‼️

  SANITY TEST       A quick, narrow check of ONE area after a small change or fix.
                    "They fixed the delete bug — does delete work now?"

  REGRESSION TEST   "Did we break anything that USED to work?" Re-checking existing
                    features after changes. Big and repetitive → the best thing to
                    automate.‼️

  EXPLORATORY       No script. A tester uses the feature like a curious, impatient,
                    or confused user and tries to break it: double-click, back
                    button, emoji in the title, slow network. Finds bugs no one
                    thought to write a test for.

  UAT               User Acceptance Testing. The business (PM, client, real users)
                    confirms it does what they asked. Not "does it work?" but
                    "is it right?"
```

```text
TEST CASE vs TEST SCENARIO vs TEST PLAN

  Test scenario   WHAT to test, one line         "User deletes a task"
  Test case       HOW, step by step + expected   1. Log in  2. Click Delete on "Buy milk"
                  result                         3. Confirm  → Expected: task gone, toast shown
  Test plan       The whole strategy for a       scope, who tests, environments, schedule,
                  release or project             what's out of scope, exit criteria

Teams that track test cases use tools like TestRail, Xray or Zephyr (often inside Jira).
```

---

## 6. Bugs — Reporting and Tracking

```text
A GOOD BUG REPORT — someone else can reproduce it without asking you anything

  Title:        Deleted task reappears after page refresh
  Environment:  staging, Chrome 130, macOS
  Steps:        1. Log in as test-user-1
                2. Delete the task "Buy milk"
                3. Refresh the page
  Expected:     "Buy milk" is gone
  Actual:       "Buy milk" is back in the list
  Evidence:     screenshot / video, console error, network request ID
  Severity:     Major      Priority: High

‼️ "Delete is broken" is not a bug report. Steps + expected + actual is the minimum.‼️
```

```text
‼️ SEVERITY vs PRIORITY — the classic interview question

  SEVERITY  = how BAD is the impact?         (set by QA / the reporter)
  PRIORITY  = how SOON must we fix it?       (set by product / the team)

  They're usually linked, but not always:
    High severity, low priority    App crashes on a page only 3 internal users ever open
    Low severity, high priority    Company name misspelled on the homepage before launch‼️

  Typical severity levels:  Critical (data loss, outage, security) → Major → Minor → Trivial
```

```text
BUG LIFECYCLE (usually a Jira workflow)

  New → Triaged → In Progress → Fixed → Ready for QA → Verified → Closed
                      │                                  │
                      └── Won't Fix / Duplicate          └── Reopened (still broken)

  TRIAGE   a regular meeting/step where new bugs get a priority and an owner
  VERIFY   the reporter (or QA) re-tests the fix — the developer doesn't close their own bug

Two terms worth knowing:
  REGRESSION BUG    something that used to work and now doesn't — usually high priority,
                    and a sign a regression test is missing
  ESCAPED DEFECT    a bug found in production that testing should have caught —
                    teams track these to see where their safety nets have holes
```

---

## 7. Test Environments

```text
An "environment" is a full running copy of the app: frontend, backend, database, config.

  LOCAL      your laptop                    you, while coding
  DEV        shared, unstable, deploys      devs checking integration
             on every merge
  PREVIEW    a temporary copy PER PULL      reviewers, QA, designers — test the PR
             REQUEST, deleted after merge   before it's merged (Vercel, Netlify do this)
  STAGING    as close to production as      E2E tests, QA, UAT, final checks
             possible
  PRODUCTION the real thing, real users     smoke tests + monitoring only

Code is PROMOTED left to right: the same build moves from dev → staging → production.
```

```text
‼️ ENVIRONMENT PARITY — staging must look like production
   Same database type and version, same config shape, similar data volume, same
   third-party integrations (in sandbox mode).
   "Works on staging, broke in production" almost always means the two were different
   — a different Node version, a missing env variable, 10 rows vs 10 million rows.‼️
```

```text
FEATURE FLAGS
  Ship the code to production turned OFF, then turn it on for testers only, then 5% of
  users, then everyone. Lets you test in the real environment with almost no risk —
  and if it misbehaves, turn the flag off instead of redeploying.
  Tools: LaunchDarkly, Unleash, GrowthBook, or a simple config table.
```

---

## 8. Test Data

```text
Tests need data: users, tasks, orders. Where it comes from matters a lot.

  FACTORIES     A function that builds a valid object with sensible defaults,
                and lets each test override what it cares about:
                  makeTask({ completed: true })
                Keeps tests short and stops them breaking when a field is added.

  SEEDING       A script that fills a database with a known starting set of data
                (test users, sample tasks) — used for local dev, staging, E2E runs.

  ISOLATION     Each test creates its own data and doesn't depend on, or leave
                behind, data for other tests. ‼️ Shared data is the #1 cause of tests
                that pass alone and fail together.‼️

  SHARED TEST ACCOUNTS   e.g. qa-admin@company.com on staging. Handy, but if two
                people change the same account at once, they break each other's tests.
```

```text
‼️ NEVER COPY REAL PRODUCTION DATA INTO TEST ENVIRONMENTS AS-IS.
   It contains real people's personal data (names, emails, payment info). Leaking it
   from a less-protected staging server is a privacy breach — and illegal under laws
   like GDPR. If you need realistic data, anonymize it first (replace names, emails,
   addresses) or generate fake data (e.g. the Faker library).‼️
```

---

## 9. The CI Pipeline

```text
CI (Continuous Integration) = a server that runs your checks automatically on every
push / pull request. GitHub Actions, GitLab CI, CircleCI, Jenkins are common.

A TYPICAL PIPELINE — fast checks first, so you get feedback quickly

  On every pull request:
    1. Install dependencies
    2. Lint + type-check                      seconds
    3. Unit + component tests                 seconds–minutes
    4. Integration / API tests (real DB)      minutes
    5. Security scan of dependencies          seconds
    6. Build
       ── merge allowed only if ALL green ──  ← a "pipeline gate"

  After merge / before release:
    7. Deploy to staging
    8. E2E tests against staging              minutes–longer
    9. (sometimes) performance, visual, accessibility checks

  After deploy to production:
   10. Smoke tests
```

```yaml
# .github/workflows/ci.yml — a minimal version of steps 1–6
name: CI
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci                # clean install from package-lock.json
      - run: npm run lint
      - run: npx tsc --noEmit      # type-check
      - run: npm test              # unit + integration tests
      - run: npm audit --audit-level=high   # fail on known high-severity vulnerabilities
      - run: npm run build
```

```text
‼️ FLAKY TESTS — tests that sometimes pass and sometimes fail with no code change.
   Usual causes: timing (waiting a fixed 500ms instead of for the element), shared
   data between tests, tests depending on run order, real network calls.
   Why they're dangerous: once people learn "just re-run it", they start ignoring
   real failures too. Fix them, or quarantine them (skip + ticket) quickly — never
   leave a flaky test in the main suite.‼️
```

---

## 10. The Specialist Kinds of Testing

```text
Beyond "does the feature work?", there are other questions. You don't need to master
these as a beginner — you need to know each one EXISTS, what question it answers,
and roughly which tool does it.

  KIND              THE QUESTION                           COMMON TOOLS
  ────────────────  ─────────────────────────────────────  ──────────────────────────────
  Visual regression "Did any pixel change that shouldn't?"  Chromatic (Storybook), Percy,
                    Screenshots compared to a baseline.     Playwright screenshots
  Cross-browser     "Does it work in Safari, Firefox,       Playwright (3 engines),
  / device          mobile, small screens?"                 BrowserStack, Sauce Labs
  Accessibility     "Can people using a keyboard or a       axe-core, Lighthouse,
  (a11y)            screen reader use it?" (WCAG rules)     manual screen-reader testing
  Performance /     "Is it fast? Does it survive 10x        k6, JMeter, Artillery;
  load              the normal traffic?"                    Lighthouse for page speed
  Security          "Can someone break in or steal data?"   see below
  Contract          "Do the frontend and backend (or two    Pact
                    services) still agree on the API?"
  Chaos             "What happens when a server or          Chaos Monkey, Gremlin,
                    dependency suddenly dies?"              LitmusChaos
```

```text
SECURITY TESTING — three acronyms you'll hear

  SAST   Static — scans your SOURCE CODE for risky patterns    Semgrep, CodeQL, SonarQube
  DAST   Dynamic — attacks the RUNNING app from outside        OWASP ZAP, Burp Suite
  SCA    Software Composition — checks your DEPENDENCIES       npm audit, Dependabot, Snyk
         for known vulnerabilities

  Plus PENETRATION TESTING: security experts try to break in by hand, usually yearly
  or before a big launch, and often required for compliance (banks, government).

‼️ Accessibility and dependency scanning are the two cheapest to add to CI today —
   one line each. Automated a11y tools only catch around a third to half of issues,
   though, so manual keyboard/screen-reader checks still matter.‼️
```

---

## 11. Releasing and Testing in Production

```text
RELEASE CHECKLIST / GO–NO-GO
  Before a release, the team checks:
    ☐ All tests green on staging
    ☐ No open Critical/Major bugs for this release
    ☐ QA sign-off (and UAT sign-off, if required)
    ☐ Database migrations tested
    ☐ Rollback plan ready
  If anything fails → "no-go", release waits.
```

```text
RELEASING SAFELY — don't flip it on for everyone at once

  CANARY RELEASE    Send a small % of traffic (say 5%) to the new version. Watch error
                    rates and speed. Fine → increase to 25%, 50%, 100%. Bad → roll back.
  FEATURE FLAGS     Code is live but hidden; turn it on gradually (section 7).
  BLUE-GREEN        Two identical production environments; switch traffic from old to
                    new in one go, and switch back instantly if needed.

  ROLLBACK          Go back to the previous version. Decide BEFORE releasing what
                    triggers it (e.g. error rate doubles) so nobody debates it at 2am.
  HOTFIX            An urgent fix for a production bug that skips the normal release
                    schedule — but ideally not the tests.
```

```text
‼️ TESTING DOESN'T STOP AT RELEASE

  SMOKE TESTS AFTER DEPLOY   A few automated checks the moment the release goes out:
                             homepage loads, login works, health endpoint returns 200.
  SYNTHETIC MONITORING       A robot runs a key flow (log in → create task) every few
                             minutes, forever, and alerts if it fails. Checkly, Datadog.
  REAL USER MONITORING       Measures what actual users experience: errors, page speed.
  ERROR TRACKING             Every crash in users' browsers/servers is reported (Sentry).

  Production is the only environment that's 100% real. Monitoring is how you "test"
  it continuously without bothering users.‼️
```

---

## 12. Metrics — What's Worth Measuring

```text
  USEFUL                                     WHY
  ─────────────────────────────────────────  ────────────────────────────────────────────
  Escaped defects (bugs found in prod)       The real measure of whether testing works
  Time to detect / time to fix               How fast the safety nets and the team react
  Flaky test rate                            Trust in the suite
  CI duration                                Slow CI = people avoid running it
  Change failure rate (% of deploys that     One of the four DORA metrics — how risky
  cause a problem)                           releasing is

  MISLEADING ON ITS OWN                      WHY
  ─────────────────────────────────────────  ────────────────────────────────────────────
  Code coverage %                            ‼️ 90% coverage can still test nothing useful
                                             — it measures lines RUN, not lines CHECKED.
                                             Good for finding untested areas, bad as a
                                             target.‼️
  Number of tests / test cases               More tests ≠ better tests
  Number of bugs found by QA                 Rewards finding bugs late, not preventing them
```

---

## 13. Common Beginner Misconceptions

```text
‼️ 1. "Testing is QA's job."
   Developers own the automated tests for their code. QA adds what automation can't.

‼️ 2. "Green CI means the feature is correct."
   It means the tests you WROTE pass. It says nothing about the cases you didn't think
   of, or whether it's what the user wanted. That's why exploratory testing and UAT exist.

‼️ 3. "Automate everything."
   Automate what's repeated and stable (regression, smoke). Keep humans for exploring,
   judging UX, and features still changing every week.

‼️ 4. "100% coverage = well tested."
   Coverage shows what's NOT tested. It can't tell you what IS tested well.

‼️ 5. "Staging passed, so production is safe."
   Only if staging truly matches production. That's why canaries, flags and
   monitoring exist.

‼️ 6. Mixing up smoke, sanity and regression.
   Smoke = is it alive? Sanity = is this one fix OK? Regression = did we break old stuff?

‼️ 7. Mixing up severity and priority.
   Severity = how bad. Priority = how soon.

‼️ 8. Re-running flaky tests until they pass.
   Teaches the team to ignore red. Fix or quarantine.

‼️ 9. Using real customer data in test environments.
   A privacy breach waiting to happen. Anonymize or generate fake data.
```

---

## 14. Cheat Sheet — Glossary

```text
── PEOPLE & PROCESS ─────────────────────────────────────────────────────────────
QA                    Quality Assurance — people focused on product quality
SDET                  Developer who builds test automation
Three amigos          Product + dev + QA review a ticket before work starts
Acceptance criteria   "Done when…" checklist for one ticket (Given/When/Then)
Definition of Done    Checklist every ticket must meet
UAT                   Business confirms it's what they asked for
Shift left            Test earlier, where bugs are cheaper

── KINDS OF TESTING ─────────────────────────────────────────────────────────────
Unit / integration / E2E     Code-level layers (see TESTING-BASICS.md)
Smoke                 Is it alive at all?
Sanity                Is this one change OK?
Regression            Did we break what used to work?
Exploratory           Unscripted "try to break it"
Visual regression     Screenshot diffs
Accessibility (a11y)  Usable with keyboard / screen reader
Performance / load    Fast? Survives heavy traffic?
SAST / DAST / SCA     Scan code / attack running app / check dependencies
Contract              Do two services still agree on the API?
Chaos                 What if something dies?

── BUGS ─────────────────────────────────────────────────────────────────────────
Severity              How bad
Priority              How soon
Triage                Assigning priority + owner to new bugs
Regression bug        Used to work, now broken
Escaped defect        Bug that reached production

── ENVIRONMENTS & RELEASE ───────────────────────────────────────────────────────
Local → Dev → Staging → Production     (+ Preview per PR)
Parity                Staging matches production
Feature flag          Turn code on/off without deploying
Canary                Release to a small % first
Blue-green            Two prod environments, switch traffic
Rollback / Hotfix     Go back / urgent fix
Synthetic monitoring  A robot repeats key flows in production

── CI ───────────────────────────────────────────────────────────────────────────
Pipeline gate         Must be green to merge / deploy
Flaky test            Passes and fails randomly — fix or quarantine
```

---

## 15. Interview Answer

```text
Q: "How do you make sure your code works?" / "How does testing work on your team?"

"I think of it as layers of safety nets, each catching what the previous one misses.

 It starts before coding — clear acceptance criteria, ideally agreed between product,
 dev and QA. While building, I write unit and integration tests for the logic and API,
 and component tests for interactive UI. Every pull request runs lint, type-check,
 tests and a dependency scan in CI, and can't merge unless it's green.

 After merge it goes to a staging environment that mirrors production, where E2E tests
 run and QA does exploratory and regression testing. We release behind feature flags
 or as a canary, run smoke tests right after deploy, and rely on error tracking and
 monitoring to catch anything that slipped through.

 When a bug does escape, I write a failing test that reproduces it before fixing it,
 so that hole in the net is closed for good."
```

---

## Related Files

- [TESTING-ECOSYSTEM-DEEP.md](TESTING-ECOSYSTEM-DEEP.md) — the full reference behind every section here: QA workflows, pipelines, k6, Pact, chaos, release management
- [TESTING-BASICS.md](../2-medium-priority/TESTING-BASICS.md) — writing your first unit, API, database and E2E tests
- [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) — Vitest + React Testing Library for components
- [STORYBOOK-BASICS.md](STORYBOOK-BASICS.md) — stories as the base for visual regression and interaction tests
- [JIRA-CONFLUENCE-AGILE-DEEP.md](JIRA-CONFLUENCE-AGILE-DEEP.md) — sprints, tickets and the Jira workflows bugs move through
- [DEVOPS-INFRASTRUCTURE-DEEP.md](DEVOPS-INFRASTRUCTURE-DEEP.md) — CI/CD, deployments and environments
