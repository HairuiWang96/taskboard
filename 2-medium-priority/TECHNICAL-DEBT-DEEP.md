# Technical Debt

**Priority: MEDIUM**

> What technical debt actually is (and what the metaphor originally meant), the four kinds,
> how to measure it, how to make the business case for paying it down, which strategies
> work, and when not to pay it at all.
>
> Being able to argue for debt work in business terms is a genuinely senior skill.

---

## Table of Contents

1. [What the Metaphor Actually Meant](#1-what-the-metaphor-actually-meant)
2. [The Four Quadrants](#2-the-four-quadrants)
3. [The Types of Debt](#3-the-types-of-debt)
4. [How to Measure It](#4-how-to-measure-it)
5. [Making the Business Case](#5-making-the-business-case)
6. [Strategies for Paying It Down](#6-strategies-for-paying-it-down)
7. [When NOT to Pay It](#7-when-not-to-pay-it)
8. [Preventing Accumulation](#8-preventing-accumulation)
9. [Common Mistakes](#9-common-mistakes)
10. [Interview Answers](#10-interview-answers)

---

## 1. What the Metaphor Actually Meant

```text
‼️ WARD CUNNINGHAM COINED IT IN 1992, AND ALMOST EVERYONE USES IT WRONG.

  THE ORIGINAL MEANING:
    You ship code based on your CURRENT understanding of the problem. You then
    learn more about the domain. The gap between what the code assumes and what
    you now know is the DEBT. You pay INTEREST on it every time you work in
    that code with an outdated model. You REPAY it by refactoring the code to
    match your improved understanding.

  ‼️ CUNNINGHAM'S KEY POINT, which is usually lost:
     "Debt" was never a licence to write bad code. He was explicit about this.
     The metaphor was about SHIPPING TO LEARN — you write clean code that
     reflects what you currently understand, discover you were wrong about the
     domain, and then update it. The debt is the gap in UNDERSTANDING, not
     the mess.

  WHAT IT HAS COME TO MEAN IN PRACTICE:
    "Anything about the codebase that slows us down." Sloppy code, missing
    tests, outdated dependencies, bad architecture, no documentation.

  ‼️ THE BROADER USAGE IS FINE — language moves, and the loose meaning is
     genuinely useful. But knowing the original sharpens your thinking,
     because it points at the thing that actually matters:

WHY THE FINANCIAL METAPHOR IS STILL THE RIGHT ONE

  ‼️ THE INTEREST IS THE POINT, NOT THE PRINCIPAL.

  Debt that you never touch costs nothing. A gnarly module nobody has opened
  in three years is not hurting you — it is principal with no interest
  payments. Meanwhile a small piece of mess in code you touch daily costs you
  every single day.

  ‼️ THE PRACTICAL CONSEQUENCE, AND THE MOST USEFUL IDEA IN THIS FILE:
     PAY DOWN THE DEBT YOU ARE PAYING INTEREST ON. Not the ugliest code — the
     code that is BOTH messy AND frequently changed. See §4 for how to find it.

  AND: SOME DEBT IS CORRECT TO TAKE ON. A startup that ships a rough version
  and learns the market beats one that builds beautifully and runs out of
  money. Taking on debt to reach a deadline, deliberately, with a plan, is
  sound engineering. The failure is taking it on ACCIDENTALLY, or never
  acknowledging it.
```

---

## 2. The Four Quadrants

```text
‼️ MARTIN FOWLER'S TECHNICAL DEBT QUADRANT — the most useful framework here,
   because it separates debt you should feel fine about from debt you should
   worry about.

                      RECKLESS                    PRUDENT
                ┌──────────────────────┬──────────────────────────┐
                │                      │                          │
    DELIBERATE  │ "We don't have time  │ "We must ship now and    │
                │  for design."        │  deal with the           │
                │                      │  consequences."          │
                │ ‼️ The bad one.       │                          │
                │ Knowingly cutting    │ ‼️ THE LEGITIMATE ONE.    │
                │ corners with no plan │ A conscious trade-off,    │
                │ and no acknowledgement│ recorded, with a plan.   │
                ├──────────────────────┼──────────────────────────┤
                │                      │                          │
  INADVERTENT   │ "What's layering?"   │ "Now we know how we      │
                │                      │  should have done it."   │
                │ ‼️ Ignorance. Fixed   │                          │
                │ by training and      │ ‼️ UNAVOIDABLE, and       │
                │ review, not by       │ exactly Cunningham's      │
                │ process.             │ original meaning.        │
                └──────────────────────┴──────────────────────────┘

‼️ HOW TO USE IT

  DELIBERATE + PRUDENT is a normal engineering decision. ‼️ The requirement is
    that you RECORD it — a ticket, a comment, an ADR — so it is visible later.
    Undocumented deliberate debt becomes indistinguishable from accident
    within six months, and then nobody knows whether the weirdness is
    intentional.

  INADVERTENT + PRUDENT is the healthy kind and it is unavoidable. You cannot
    know the right design before you have built the wrong one. ‼️ The response
    is to refactor when you learn, not to feel bad about it.

  INADVERTENT + RECKLESS is a skills and review problem.

  DELIBERATE + RECKLESS is the one to push back on — and the framing that
    works is not "this is bad practice" but "we're taking on debt with no plan
    to repay it, so let's at least write down what we're deferring".

‼️ THE PHRASE WORTH BORROWING FOR A PLANNING MEETING:
   "I'm fine taking the shortcut — can we write down what we're deferring and
    what it will cost to fix, so it's a decision rather than an accident?"
   That sentence converts recklessness into prudence, which is usually all
   that is needed.
```

---

## 3. The Types of Debt

```text
‼️ "Technical debt" covers several very different things with different costs
   and different fixes. Naming the specific type is most of the work.

CODE DEBT
  Duplication, long functions, poor naming, dead code, inconsistent patterns.
  COST: slower comprehension, more bugs per change.
  ‼️ THE MOST VISIBLE AND USUALLY THE LEAST EXPENSIVE. Engineers over-focus on
     it because it is what you see in a pull request. Ugly code that works and
     is rarely touched is nearly free.

ARCHITECTURAL DEBT
  Wrong boundaries, circular dependencies, a distributed monolith, tight
  coupling to a vendor, the wrong storage engine.
  COST: ‼️ THE MOST EXPENSIVE BY FAR. It constrains everything built on top,
  and fixing it is a project rather than a refactor.

DATA DEBT
  ‼️ THE MOST UNDER-RATED. A bad schema, missing constraints, inconsistent
  historical data, no clear source of truth.
  COST: compounds with volume and time, and is the hardest to fix because you
  cannot simply change it — every consumer depends on its shape and you have
  five years of production data in it. See LEGACY-MIGRATION-DEEP §6-7.

TEST DEBT
  Missing tests, flaky tests, slow suites, tests that assert implementation.
  COST: every change is risky, so every change is slow. ‼️ Flaky tests are
  worse than no tests — they train the team to ignore failures.

DEPENDENCY DEBT
  Out-of-date libraries, unsupported runtimes, abandoned packages.
  COST: ‼️ Accumulates silently and then becomes urgent all at once — a
  security advisory, or an upgrade that is now five major versions wide.
  Small and regular beats large and forced.

INFRASTRUCTURE DEBT
  Manual deploys, snowflake servers, no IaC, undocumented configuration.
  COST: slow and risky releases, and nobody can reproduce the environment.

DOCUMENTATION DEBT
  Out of date, or missing. ‼️ WRONG documentation is worse than none.
  COST: onboarding time, repeated questions, incorrect assumptions.

PROCESS DEBT
  No code review, no CI, manual QA, no staging environment.
  COST: everything else on this list accumulates faster.

‼️ PEOPLE DEBT — the one nobody lists
  Knowledge concentrated in one person. One engineer who understands billing.
  A bus factor of one.
  COST: an invisible operational risk that becomes an emergency the day they
  take a holiday or resign. ‼️ Fix with pairing, documentation and deliberate
  rotation — and treat it with the same seriousness as a single point of
  failure in infrastructure, because that is exactly what it is.
```

---

## 4. How to Measure It

```text
‼️ THE CORE PROBLEM: "the code is bad" is an opinion, and opinions lose to
   roadmap items. You need evidence. These are the measurements that actually
   persuade people.

OUTCOME METRICS — the strongest, because they are about the business

  LEAD TIME FOR CHANGES
    Commit to production. Rising lead time is debt showing up as delay.
  CHANGE FAILURE RATE
    Percentage of deploys causing an incident or rollback.
  DEPLOYMENT FREQUENCY
    Falling frequency usually means releases have become frightening.
  TIME TO RESTORE SERVICE
    ‼️ These four are the DORA metrics. They are widely recognised, which
       matters — you are speaking a language leadership may already know.

  BUG RATE BY AREA
    Which modules generate the most incidents? ‼️ That is where the debt costs
    you real money, and it is a far better prioritisation signal than code
    ugliness.

  ESTIMATE ACCURACY BY AREA
    "Changes to billing consistently take 3x the estimate" is compelling
    evidence and easy to gather from your own tracker.

CODE-LEVEL SIGNALS — useful for targeting, weak for persuading

  ‼️ HOTSPOT ANALYSIS — THE SINGLE MOST USEFUL TECHNIQUE HERE.
     Plot CHURN (how often a file changes) against COMPLEXITY (how hard it is
     to understand). The files high on BOTH axes are where your money goes.

                     high │  ‼️ FIX THESE      │  rewrite carefully
                  CHURN   │  (changed often    │  (complex, but
                          │   AND complex)     │   rarely touched —
                          │                    │   low interest)
                     low  │  fine              │  ‼️ LEAVE ALONE
                          └────────────────────┴──────────────────
                            low            COMPLEXITY         high

     ‼️ WHY THIS BEATS INTUITION: engineers want to fix the ugliest code. The
        data usually points somewhere else — at a moderately messy file that
        everyone touches every week. That is where the interest payments are.

     Get churn from git for free:
       git log --format=format: --name-only --since=12.months
         | sort | uniq -c | sort -rn | head -30

  Also useful: test coverage on critical paths, dependency age, build time,
  static analysis counts.
  ‼️ But do not present these to a business audience. "Cyclomatic complexity
     is 34" means nothing to them; "billing changes take three weeks" does.

‼️ THE TECHNIQUE THAT COSTS NOTHING: ASK THE TEAM.
   "Where does work take longer than it should? What are you afraid to
    change? What would you fix if given a week?"
   ‼️ Engineers know exactly where the debt is. The value of the metrics above
      is mostly in PROVING what the team already told you — which is precisely
      what you need to convince someone outside the team.
```

---

## 5. Making the Business Case

```text
‼️ THE SKILL THAT DISTINGUISHES SENIOR FROM STAFF ON THIS TOPIC.

   Nobody outside engineering will ever approve work described as "paying down
   technical debt". It sounds like engineers wanting to tidy up. You must
   translate.

THE TRANSLATION

  ✗ "The payments module has a lot of technical debt."
  ✓ "Payment changes take 3 weeks instead of 3 days. We've had 6 payment
     incidents this year, each costing about 4 hours of engineering time plus
     support load. Two engineers for 5 weeks would get changes back to about
     3 days and remove the most common incident source. It pays for itself in
     roughly two quarters."

  ‼️ THE FOUR CURRENCIES — pick whichever is strongest for your audience:

  TIME/MONEY   "We spend 30% of every sprint on rework in this area. That's
                roughly 1.5 engineers' salary a year."
  RISK         "We're on a runtime that stops receiving security patches in
                November." ‼️ Often the strongest argument, and the one
                engineers most often forget to make.
  OPPORTUNITY  "The Q3 roadmap has three features in this area. Each will take
                twice as long until this is fixed."
  ‼️ RETENTION  "Two engineers have cited this codebase in exit interviews."
                Uncomfortable but genuinely persuasive — replacing an engineer
                is expensive and slow.

THE TACTICS THAT WORK

  1. ‼️ ATTACH IT TO SOMETHING THEY ALREADY WANT.
     Far and away the most effective move. "The new payment provider
     integration needs this refactor anyway — we'll do it as part of that."
     Debt work bundled into a funded feature is approved; standalone debt work
     competes with features and loses.

  2. OFFER TIERS, NOT AN ULTIMATUM.
     "Minimal: 1 week, stops the incidents. Recommended: 4 weeks, also gets
      change time down. Full: 3 months, also unblocks the Q3 roadmap."
     ‼️ This makes it a business decision with a recommendation, rather than
        engineering demanding a pause.

  3. SHOW THE TREND, NOT THE SNAPSHOT.
     ‼️ "Deploys to this service took 2 days a year ago and take 9 now" is much
        more alarming than any absolute number, because it implies where it
        goes next.

  4. QUANTIFY EVEN ROUGHLY, AND SAY IT IS ROUGH.
     A clearly-labelled estimate beats an adjective every time.

  5. MAKE THE COST OF INACTION CONCRETE.
     "If we do nothing, by Q4 this is a 3-month project instead of a 3-week
      one." Deferring is also a decision — make its price visible.

‼️ AND ACCEPT NO GRACEFULLY. If you make the case well with evidence and the
   answer is still no, that may be a legitimate business call with information
   you do not have. ‼️ RECORD THE DECISION AND THE RISK — an ADR is ideal — and
   move on. Re-litigating it monthly costs you the credibility you will need
   next time. And when the predicted cost materialises, the record is there.
```

---

## 6. Strategies for Paying It Down

```text
‼️ RANKED BY HOW WELL THEY WORK IN PRACTICE.

── 1. THE BOY SCOUT RULE — "leave it cleaner than you found it" ────────────
  Improve the code you are already touching, as part of normal work.
  ✓ Needs no approval, no planning, no separate budget.
  ✓ ‼️ SELF-TARGETING: you only improve code that is actually being changed,
     which is by definition the code paying interest (§1).
  ✓ Compounds quietly.
  ✗ Cannot fix architectural or data debt.
  ✗ Requires a team culture that tolerates slightly larger PRs.
  ‼️ THE DEFAULT AND THE BEST STARTING POINT.

── 2. BUNDLE IT WITH FEATURE WORK ─────────────────────────────────────────
  "This feature needs the module refactored first; that's part of the
   estimate."
  ✓ ‼️ It gets funded, because the feature is funded.
  ✓ Genuinely honest — the refactor IS required to build it well.
  ✗ Tempting to over-claim, which erodes trust. Be proportionate.
  ‼️ THE MOST RELIABLE WAY TO GET SIGNIFICANT DEBT WORK DONE.

── 3. A STANDING PERCENTAGE ───────────────────────────────────────────────
  Agree that ~20% of every sprint goes to debt, maintenance and reliability.
  ✓ Predictable and sustainable; no negotiation each time.
  ✓ Stops the slow accumulation that leads to a crisis.
  ✗ ‼️ The first thing cut under deadline pressure, unless leadership has
     genuinely committed to it. A percentage that is suspended every quarter
     is worse than none, because it creates false comfort.

── 4. TIE IT TO AN ERROR BUDGET ───────────────────────────────────────────
  When the reliability budget is exhausted, feature work stops and reliability
  work starts. See INCIDENT-RESPONSE-DEEP §8.
  ✓ ‼️ The most robust mechanism, because the trigger is a NUMBER agreed in
     advance rather than an argument in the moment.
  ✗ Requires SLOs and the organisational maturity to honour them.

── 5. A DEDICATED PROJECT ─────────────────────────────────────────────────
  A funded piece of work with a scope and an end.
  ✓ The only way to fix architectural or data debt.
  ✗ Needs a real business case (§5), and competes directly with features.
  ‼️ Reserve it for the debt that genuinely cannot be fixed incrementally, and
     structure it to deliver value in stages (see LEGACY-MIGRATION-DEEP).

── 6. "DEBT SPRINTS" / FIX-IT WEEKS ───────────────────────────────────────
  A whole sprint or week on cleanup, periodically.
  ✓ Good morale, clears a lot of small annoyances, easy to approve.
  ✗ ‼️ THE HONEST WEAKNESS: a week does not fix structural problems, and it
     can become an excuse to defer real debt work ("we'll get it in fix-it
     week"). Also, without focus, people fix what irritates them rather than
     what costs the most.
  ‼️ Use it for the long tail of small things, and target it with hotspot data
     rather than preference.

‼️ WHATEVER YOU CHOOSE — THE RULES THAT MAKE IT WORK
  □ ‼️ TESTS FIRST. You cannot safely refactor code you cannot verify. If
    there are no tests, characterisation tests come before any change.
  □ SMALL, INDEPENDENTLY SHIPPABLE STEPS. A three-week refactor branch will
    conflict with everything and may never merge.
  □ NEVER MIX REFACTORING AND BEHAVIOUR CHANGE IN ONE COMMIT. ‼️ When
    something breaks, you need to know which it was. Separate commits, ideally
    separate PRs.
  □ MEASURE BEFORE AND AFTER, so you can show it worked and justify the next one.
```

---

## 7. When NOT to Pay It

```text
‼️ AN UNDER-DISCUSSED SKILL. Not all debt is worth fixing, and a team that
   tries to fix all of it ships nothing.

DO NOT PAY IT WHEN:

  1. ‼️ THE CODE IS STABLE AND RARELY TOUCHED.
     No interest payments. Ugly code that works, that nobody opens, costs you
     nothing but aesthetic discomfort. ‼️ This is the biggest single source of
     wasted refactoring effort.

  2. IT IS BEING DELETED SOON.
     Refactoring something you are decommissioning next quarter is pure waste.
     ‼️ Always check the roadmap before proposing cleanup.

  3. THE PRODUCT DIRECTION IS UNCERTAIN.
     Perfecting a feature that may be cut in two months. ‼️ Early-stage code
     for an unvalidated idea SHOULD be rough — you are buying learning speed,
     and that is the right trade.

  4. THE FIX RISKS MORE THAN THE DEBT COSTS.
     Untested legacy code that processes payments correctly. ‼️ The refactor
     could break something subtle that currently works. Sometimes the right
     move is to wrap it, test around it, and leave the inside alone.

  5. THERE IS A GENUINE DEADLINE THAT MATTERS.
     A regulatory date, a contractual launch, a funding milestone. ‼️ Taking on
     debt deliberately is legitimate — record it (§2) and schedule the repayment.

  6. YOU CANNOT ARTICULATE THE COST.
     ‼️ If you cannot say what the debt costs in time, money or risk, you may
        be responding to taste rather than impact. That is worth checking
        honestly before spending a month on it.

‼️ THE QUESTION THAT SETTLES IT:
   "HOW MUCH INTEREST ARE WE PAYING ON THIS, AND TO WHOM?"
   If the answer is "not much" or "nobody", leave it. Aesthetics are not a
   business case, and the effort has a better home.

‼️ AND THE OPPOSITE FAILURE, which is just as real: never paying any debt
   because there is always something more urgent. That is how you arrive at a
   system where every change is a three-week risk. The standing-percentage or
   error-budget mechanisms (§6) exist precisely to stop that drift.
```

---

## 8. Preventing Accumulation

```text
‼️ CHEAPER THAN REPAYING. The practices that stop debt building up:

  CODE REVIEW that actually reviews design, not just syntax. ‼️ The highest-
  leverage prevention there is — it catches architectural mistakes when they
  cost an hour rather than a quarter.

  TESTS AS A DEFAULT, not an afterthought. Untested code becomes legacy
  immediately (see LEGACY-MIGRATION-DEEP §1).

  ‼️ AUTOMATED DEPENDENCY UPDATES (Renovate, Dependabot). Small and continuous
  beats a forced five-major-version jump under security pressure. This one is
  nearly free and prevents an entire debt category.

  DEFINITION OF DONE that includes tests, docs and monitoring — so "done"
  cannot quietly mean "works on my machine".

  ‼️ ADRs FOR SIGNIFICANT DECISIONS. Much debt is really lost context: the
  design is fine but nobody remembers why, so the next person works around it
  instead of with it.

  ROTATION AND PAIRING, to prevent people debt.

  ‼️ MAKE DEBT VISIBLE WHEN YOU TAKE IT ON. A ticket, a TODO with a ticket
  number, an ADR. ‼️ Deliberate debt that is not recorded becomes inadvertent
  debt within six months — nobody can tell whether the oddity was a decision
  or a mistake, so nobody dares touch it.

  LINTING AND FORMATTING automated, so review time goes on design instead of
  style.

  ‼️ A "LEAVE IT BETTER" NORM, stated explicitly. Culture does more here than
  process — but it needs to be said out loud and modelled by senior people,
  or PRs stay minimal and the code only ever degrades.
```

---

## 9. Common Mistakes

```text
‼️ 1. CALLING IT "TECHNICAL DEBT" TO NON-ENGINEERS.
   It sounds like tidying. Translate to time, money, risk or opportunity (§5).

‼️ 2. FIXING THE UGLIEST CODE INSTEAD OF THE COSTLIEST.
   Use churn × complexity (§4), not aesthetic offence.

‼️ 3. THE BIG REFACTOR BRANCH.
   Three weeks, thousands of lines, conflicts with everything, never merges.
   Small and incremental, always.

‼️ 4. REFACTORING WITHOUT TESTS.
   You cannot know you preserved behaviour. Characterisation tests first.

‼️ 5. MIXING REFACTORING WITH BEHAVIOUR CHANGES.
   When it breaks, you cannot tell which change did it.

‼️ 6. TREATING ALL DEBT AS EQUALLY BAD.
   Deliberate prudent debt is a legitimate engineering decision (§2).

‼️ 7. NEVER RECORDING DELIBERATE DEBT.
   Six months later nobody knows the weirdness was intentional.

‼️ 8. ASKING FOR A "REFACTORING SPRINT" WITH NO EVIDENCE.
   Loses to any feature with a business case.

‼️ 9. USING DEBT AS AN EXCUSE FOR A REWRITE.
   See ENGINEERING-FAILURES-DEEP §5. Usually the wrong answer.

‼️ 10. IGNORING DEPENDENCY DEBT UNTIL IT IS URGENT.
   Silent, then suddenly a security emergency spanning five major versions.

‼️ 11. IGNORING DATA AND PEOPLE DEBT.
   The two most expensive categories and the two least discussed.

‼️ 12. PERFECTIONISM ON CODE THAT DOES NOT MATTER.
   See §7. Effort has an opportunity cost too.
```

---

## 10. Interview Answers

```text
"HOW DO YOU HANDLE TECHNICAL DEBT?"

  ‼️ A strong answer shows prioritisation and business awareness, not
     enthusiasm for cleanliness:

  "I start by separating debt that's costing us from debt that isn't. Messy
   code nobody touches is basically free — the debt that matters is code
   that's both complex AND frequently changed, so I look at churn against
   complexity to find it, and I ask the team where work takes longer than it
   should.

   For paying it down, most of it should happen inside normal work — the boy
   scout rule, and bundling refactors into features that need them anyway.
   That gets funded, because the feature is funded.

   For anything bigger I need a business case: how long changes take now
   versus what they should, incident counts, what it blocks on the roadmap.
   'The code is bad' never wins against a feature. 'Billing changes take three
   weeks instead of three days and caused six incidents' does."

"HOW DO YOU CONVINCE A PRODUCT MANAGER TO PRIORITISE IT?"
  Translate to their currency (§5). Attach it to something they already want.
  Offer tiers rather than an ultimatum. Show the trend. ‼️ And mention that
  you accept no gracefully and record the risk — that shows maturity and
  makes the rest credible.

"TELL ME ABOUT A TIME YOU DEALT WITH A LEGACY CODEBASE."
  ‼️ What they want: that you were systematic rather than destructive.
  Understand it first, characterisation tests, incremental improvement, and
  ideally a measurable outcome. ‼️ Mentioning that you considered leaving it
  alone and explain why you did not is a strong signal of judgement.

"WHEN IS IT OKAY TO WRITE BAD CODE?"
  ‼️ A trap question, and the honest answer is the good one: "when the
   trade-off is deliberate and recorded. Shipping a rough version to validate
   an idea is good engineering — you're buying learning speed. The problem
   isn't the shortcut, it's taking it without acknowledging it, so six months
   later nobody knows whether the oddity was a decision or a mistake. I'd
   write the ticket or the ADR at the same time as the shortcut."
```

---

## Related Files

- [TECHNICAL-DECISION-MAKING-DEEP.md](../1-high-priority/TECHNICAL-DECISION-MAKING-DEEP.md) — §7 rewrite vs refactor, §10 making the case
- [LEGACY-MIGRATION-DEEP.md](../1-high-priority/LEGACY-MIGRATION-DEEP.md) — fixing architectural and data debt
- [ENGINEERING-FAILURES-DEEP.md](../1-high-priority/ENGINEERING-FAILURES-DEEP.md) — §5 what unpaid debt eventually costs
- [INCIDENT-RESPONSE-DEEP.md](../1-high-priority/INCIDENT-RESPONSE-DEEP.md) — §8 error budgets as a funding mechanism
- [STAFF-PLUS-ENGINEER-DEEP.md](../1-high-priority/STAFF-PLUS-ENGINEER-DEEP.md) — influence and prioritisation
- [TESTING-BASICS.md](TESTING-BASICS.md) — the tests that make refactoring safe
- [PRINCIPLES-DEEP.md](PRINCIPLES-DEEP.md) — SOLID, DRY, clean code
