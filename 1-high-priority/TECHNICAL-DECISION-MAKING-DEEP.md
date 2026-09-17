# Technical Decision-Making

**Priority: HIGH**

> How to make, justify, record and defend technical decisions: reversibility, build vs buy,
> choosing boring technology, rewrite vs refactor, evaluating a tool, ADRs and RFCs, and the
> anti-patterns that produce bad decisions.
>
> Deciding well is the core of the staff+ job. Code is the easy part.

---

## Table of Contents

1. [Why Decisions Are the Job](#1-why-decisions-are-the-job)
2. [Reversibility — One-Way and Two-Way Doors](#2-reversibility--one-way-and-two-way-doors)
3. [The Decision Framework](#3-the-decision-framework)
4. [Build vs Buy vs Adopt](#4-build-vs-buy-vs-adopt)
5. [Choose Boring Technology](#5-choose-boring-technology)
6. [Evaluating a Technology](#6-evaluating-a-technology)
7. [Rewrite, Refactor, or Leave It](#7-rewrite-refactor-or-leave-it)
8. [Architecture Decision Records](#8-architecture-decision-records)
9. [The RFC Process](#9-the-rfc-process)
10. [Making the Case to Non-Engineers](#10-making-the-case-to-non-engineers)
11. [Decision Anti-Patterns](#11-decision-anti-patterns)
12. [Disagree and Commit](#12-disagree-and-commit)
13. [Worked Examples](#13-worked-examples)

---

## 1. Why Decisions Are the Job

```text
‼️ THE SHIFT THAT DEFINES SENIORITY:

  JUNIOR     is given a task, and does it well.
  MID        is given a problem, and finds a solution.
  SENIOR     is given an ambiguous problem, and decides what to build.
  STAFF+     decides which problems are worth solving, and makes the
             decisions that other people's work depends on for years.

  At the top of that ladder, your typing speed is irrelevant. What matters is
  the QUALITY AND SPEED OF YOUR DECISIONS, and your ability to get other
  people to act on them.

WHY TECHNICAL DECISIONS ARE HARD

  1. ‼️ YOU DECIDE WITH THE LEAST INFORMATION YOU WILL EVER HAVE. The moment
     you know enough to be confident, the decision has usually already been
     made for you by circumstance.

  2. THE COSTS ARE DELAYED AND DIFFUSE. A bad choice does not fail
     immediately. It shows up as a slow tax on every future change, which is
     very hard to attribute back to the decision.

  3. THERE IS NO CONTROL GROUP. You never find out what the other option
     would have cost. This makes it nearly impossible to learn from outcomes
     alone — which is why you must evaluate the DECISION PROCESS, not just
     the result.

  4. ‼️ GOOD DECISIONS CAN HAVE BAD OUTCOMES, and vice versa. Judge a decision
     by whether it was reasonable GIVEN WHAT WAS KNOWN AT THE TIME. Judging
     by outcome ("resulting") teaches your team to be lucky rather than wise.

THE TWO FAILURE MODES, both common

  DECIDING TOO SLOWLY   Analysis paralysis. Three weeks comparing databases
                        for a service that will have 10,000 rows.
  DECIDING TOO FAST     Picking the first thing that comes to mind, or what
                        you used last time, without checking the fit.

  ‼️ The cure for both is the same: SIZE THE DECISION FIRST. How expensive is
     it to be wrong? That single question tells you how much analysis to do.
```

---

## 2. Reversibility — One-Way and Two-Way Doors

```text
‼️ THE MOST USEFUL DECISION-MAKING CONCEPT THERE IS. From Jeff Bezos, but the
   idea is general.

  TWO-WAY DOOR    Easy to reverse. Walk through, look around, walk back out
                  if you do not like it.
                  → DECIDE FAST. Use judgement, do not build consensus, do
                    not write a document. The cost of being wrong is one
                    afternoon.

  ONE-WAY DOOR    Hard or impossible to reverse. Once through, you live there.
                  → SLOW DOWN. Gather information, write it up, get
                    disagreement in the room before committing.

‼️ THE FAILURE MODE IS USUALLY MISCLASSIFICATION, in both directions:
   - Treating a two-way door as one-way: three weeks of debate over a linting
     config. Enormously common, and it makes teams slow and miserable.
   - Treating a one-way door as two-way: "we can always change the database
     later". You can, technically, the way you can technically move house.

EXAMPLES, SORTED

  VERY REVERSIBLE (decide in minutes, alone)
    Code formatting and lint rules
    A utility library choice used in one module
    A variable naming convention
    Internal folder structure
    Which chart library the admin dashboard uses

  MODERATELY REVERSIBLE (decide in hours, with your team)
    Your frontend state management library
    Your test runner
    CI provider
    Which cloud region to start in

  HARD TO REVERSE (decide in days, write it down, get review)
    Your primary database engine
    Your programming language
    Monolith vs services
    Authentication provider
    Cloud provider

  EFFECTIVELY PERMANENT (decide very deliberately)
    ‼️ YOUR DATA MODEL. Code is cheap to change; five years of production data
       in a bad schema is close to permanent, and every consumer depends on
       its shape.
    ‼️ YOUR PUBLIC API CONTRACT. Once external customers depend on it, you
       support it approximately forever.
    Your event schema, if you are storing events long-term.
    Anything encoded in customer-visible URLs.
    Choices with legal or compliance consequences (where data lives).

‼️ THE MOVE THAT MAKES YOU LOOK SENIOR IN A MEETING:
   "Is this a one-way door? If not, let's just pick one and move on — we can
    change it in a week if we're wrong."
   Half the time this ends a debate that was about to consume an afternoon.

‼️ AND THE ADVANCED VERSION: you can often CONVERT a one-way door into a
   two-way one. A pilot, a feature flag, a small reversible first phase, an
   abstraction at exactly the one point of coupling. Buying reversibility is
   frequently cheaper than buying certainty.
```

---

## 3. The Decision Framework

```text
‼️ A REPEATABLE SEQUENCE. Scale the effort to the reversibility (§2).

  1. STATE THE PROBLEM, NOT THE SOLUTION
     ✗ "Should we adopt Kafka?"
     ✓ "Order processing blocks the checkout response for up to 4 seconds,
        and we lose events when the service restarts."
     ‼️ Starting from a named technology is how you end up justifying a
        conclusion rather than reaching one. If you cannot state the problem
        without naming a product, you have not analysed it yet.

  2. WRITE DOWN THE CONSTRAINTS
     Budget, deadline, team size and skills, existing stack, compliance,
     expected scale, what you must not break.
     ‼️ Constraints eliminate more options than analysis does, and far faster.
        "Nobody here writes Go" removes half the shortlist in one line.

  3. LIST GENUINE ALTERNATIVES — at least three
     ‼️ ALWAYS INCLUDE "DO NOTHING" AND "THE SIMPLEST POSSIBLE THING".
        Do nothing is a real option with real merits; it is the only option
        with no implementation risk. If it is not on the list, you are not
        comparing fairly.
     Beware the fake shortlist: your preferred option plus two obviously bad
     ones. Reviewers notice.

  4. DEFINE THE CRITERIA BEFORE YOU EVALUATE
     ‼️ ORDER MATTERS ENORMOUSLY. Criteria chosen after you have a favourite
        will be the criteria your favourite wins on. Write them first.
     Weight them — not everything matters equally.

  5. EVALUATE HONESTLY, INCLUDING AGAINST YOUR PREFERENCE
     For each option: what does this cost us in a year? What does it make
     hard? ‼️ What would have to be true for this to be the WRONG choice?

  6. DECIDE, AND SAY WHY
     Name the decision, the reasoning, and what you are giving up.
     ‼️ An unstated trade-off reads as an unnoticed one.

  7. WRITE IT DOWN (§8) AND SET A REVIEW POINT
     "We'll revisit if write volume exceeds X, or in 12 months."
     ‼️ This converts a permanent-feeling decision into a provisional one, and
        it makes changing your mind later a planned event rather than an
        admission of failure.
```

```text
A SIMPLE SCORING TABLE — useful for shared decisions, but read the warning:

  CRITERION           WEIGHT   OPTION A   OPTION B   OPTION C
  Fits team's skills    ×3         5          2          4
  Operational burden    ×3         4          2          5
  Time to first ship    ×2         5          3          4
  Scales to 10x         ×2         3          5          3
  Cost at our volume    ×1         4          3          5
                              ──────────────────────────────
  WEIGHTED TOTAL                   45         30         46

‼️ DO NOT LET THE SPREADSHEET DECIDE. The numbers are a way to EXPOSE YOUR
   REASONING, not to replace it. If the table says B and your gut says A,
   that gap is information — usually it means a criterion is missing or
   badly weighted. Find it. A table that merely ratifies a conclusion you
   already held is theatre.
```

---

## 4. Build vs Buy vs Adopt

```text
‼️ ONE OF THE MOST CONSEQUENTIAL RECURRING DECISIONS, and one engineers are
   systematically bad at — because building is more fun, and because we
   estimate the build and forget the decade of ownership.

THE THREE OPTIONS

  BUILD    Write it yourself.
  BUY      Pay a vendor (Stripe, Auth0, Algolia, Datadog).
  ADOPT    Use open source and host it yourself.

THE QUESTION THAT DECIDES IT

  ‼️ "IS THIS OUR COMPETITIVE ADVANTAGE?"

  If a customer would choose you over a competitor because of this thing,
  BUILD it — it is your product.
  If not, it is undifferentiated work. BUY or ADOPT, and spend the engineering
  time on the thing customers actually pay for.

  Nobody chooses your product because you wrote your own authentication. They
  might leave because you wrote it badly.

‼️ THE HIDDEN COST OF BUILDING — engineers estimate the first column and
   forget the second:

  WHAT YOU ESTIMATE            WHAT IT ACTUALLY COSTS
  The initial build            The initial build
                             + every edge case you did not think of
                             + security patches, forever
                             + documentation and onboarding for every new hire
                             + the on-call burden when it breaks
                             + feature requests from your own team
                             + a rewrite when the person who wrote it leaves
                             + the opportunity cost of everything not built

  ‼️ A rule of thumb from experience: the ten-year cost of maintaining an
     in-house component is several times its build cost. Budget accordingly.

THINGS YOU ALMOST CERTAINLY SHOULD NOT BUILD
  Authentication and identity      Payments (‼️ and PCI scope)
  Email/SMS delivery               Search infrastructure at scale
  Your own database                Video encoding
  Observability tooling            Feature-flag infrastructure (at first)
  Your own frontend framework      A CMS, usually

THE REAL COSTS OF BUYING
  Recurring cost that grows with your usage — check what it looks like at 10x
  Vendor lock-in, and the migration cost if they fail or change pricing
  Data leaves your control — compliance implications
  ‼️ You inherit their outages AND their availability ceiling (see NFRs §5)
  Feature requests go into their backlog, not yours

THE REAL COSTS OF ADOPTING OPEN SOURCE
  You are the operator: upgrades, scaling, backups, security patches, on-call
  ‼️ "Free" software has a salary attached. Self-hosting a database or a
     Kafka cluster is a part-time job for somebody.
  Check the project's health: recent commits, number of maintainers, release
  cadence, whether one company controls it and could relicense.

‼️ THE HONEST DEFAULT FOR A SMALL TEAM: buy the boring things, adopt the
   mature things, build only the thing you are actually selling. Engineering
   time is the scarcest resource you have.

‼️ AND THE STRONGEST ARGUMENT FOR BUYING, which is rarely made explicitly:
   buying converts an unbounded, ongoing engineering liability into a
   predictable line item. That is usually a good trade even when the line
   item looks expensive.
```

---

## 5. Choose Boring Technology

```text
‼️ THE IDEA (Dan McKinley): you have a limited number of "innovation tokens" —
   roughly three. Spend them on the things that make your product different.
   Everything else should be boring, proven technology.

WHY BORING WINS

  A boring technology's failure modes are KNOWN. Postgres has been in
  production for decades, so:
    - Every problem you hit, someone has hit and written about.
    - You can hire people who know it.
    - The tooling, monitoring and operational practices exist.
    - You know roughly what it costs to run and where it breaks.

  A new technology's failure modes are UNKNOWN — and you will find them in
  production, alone, at 3am, with no Stack Overflow answer.

  ‼️ THE ASYMMETRY: the upside of new technology is usually a modest
     improvement. The downside is an unbounded, unpredictable time sink. That
     is a bad bet to take repeatedly.

HOW TO SPEND YOUR TOKENS

  If your product's whole value is real-time collaborative editing, spend a
  token on CRDTs. That IS your product.
  Then use Postgres, a normal web framework, and a normal deployment
  pipeline for everything around it.

  ‼️ THE FAILURE MODE: spending tokens on infrastructure nobody sees. A new
     database, a new language, a new orchestration system, AND a new frontend
     framework, all at once, for a CRUD application. Now every problem is
     novel and nothing compounds.

‼️ THE COUNTER-ARGUMENT, because this principle is sometimes over-applied:
   "Boring" means PROVEN, not OLD. Postgres, Go, React and Kubernetes were all
   new once and are now boring. And technology that is boring but genuinely
   wrong for the job is still wrong — do not use MySQL for a graph problem
   because it is familiar. The principle is about not paying novelty costs
   WITHOUT A REASON, not about never adopting anything.

THE QUESTION TO ASK

  "What problem are we having that this solves? And is that problem worth the
   cost of being early?"

  ‼️ If the honest answer is "we don't have that problem yet, but we might",
     you are buying insurance at an unknown premium against an unknown risk.
     Usually a bad deal.
```

---

## 6. Evaluating a Technology

```text
‼️ A CHECKLIST FOR "SHOULD WE USE X?" — run through it before, not after.

FIT
  □ What specific problem does it solve for us? Name it.
  □ What do we do today, and what exactly is wrong with that?
  □ ‼️ What does it make HARDER? (Every tool has a cost. If you cannot name
    one, you have not read enough about it.)
  □ Does it fit our existing stack, or does it drag in a parallel ecosystem?

MATURITY AND HEALTH
  □ How old is it? Has it survived a major version migration?
  □ Commit frequency and recency. How many active maintainers?
  □ ‼️ BUS FACTOR: is it one person? Is it one company that could relicense
    it or abandon it? (This has happened repeatedly and painfully.)
  □ Who else runs it in production at our scale or larger?
  □ Read the GitHub issues — not the README. ‼️ The open issues tell you what
    it is actually like to live with. Look specifically at how long serious
    bugs stay open.

OPERATIONS
  □ How do we deploy, monitor, back up, and upgrade it?
  □ What happens when it fails? What does the failure look like?
  □ Who on the team can debug it at 3am? ‼️ If the answer is "one person",
    that is a real risk, not a detail.
  □ What is the upgrade path likely to cost, twice a year, for five years?

PEOPLE
  □ Can we hire people who know it? Can we teach it quickly?
  □ How long until a new engineer is productive in it?
  □ ‼️ Is anyone advocating for it mainly because they want to learn it?
    (A legitimate desire — but it should be named, not disguised as
    technical argument.)

EXIT
  □ ‼️ HOW DO WE GET OFF IT? If the answer is "rewrite the product", this is
    a one-way door and deserves one-way-door rigour.
  □ How coupled will our code become to its specific API?

PROVE IT
  □ Build a SPIKE: a small, timeboxed, throwaway prototype of the hardest
    part. ‼️ Not the tutorial — the hard part. The tutorial always works.
  □ Test it against realistic data volumes, not 100 rows.
  □ Timebox it (say a week) and write down what you learned either way.
```

---

## 7. Rewrite, Refactor, or Leave It

```text
‼️ "This code is terrible, we should rewrite it" is one of the most dangerous
   sentences in engineering. See ENGINEERING-FAILURES-DEEP §5 for why
   rewrites fail. Here is how to decide instead.

FIRST, DIAGNOSE THE ACTUAL PROBLEM
  ‼️ "The code is bad" is not a business problem. Translate it:
    - Are changes taking longer than they should? (measure it)
    - Is it causing incidents? (count them)
    - Can it not meet a requirement we now have? (name the requirement)
    - Can nobody understand it? (how long does onboarding take?)
  If none of these is true, ‼️ the correct answer may genuinely be LEAVE IT
  ALONE. Ugly code that works, that nobody needs to change, costs nothing.
  Rewriting it to feel better is a real cost for no return.

THE OPTIONS, IN ORDER OF PREFERENCE

  1. LEAVE IT
     When: it works, it is stable, and it is rarely touched.
     ‼️ Undervalued. Stability has real worth.

  2. INCREMENTAL REFACTOR
     When: the structure is salvageable and you touch it regularly.
     How: improve it as you pass through, behind tests. The boy-scout rule.
     ‼️ THE DEFAULT ANSWER for most bad code.

  3. STRANGLE IT
     When: it needs to be replaced but cannot stop working.
     How: route new functionality to a new implementation, migrate piece by
     piece, delete the old one when nothing points at it.
     ‼️ THE DEFAULT ANSWER for most "we need to rewrite this" situations.
     See LEGACY-MIGRATION-DEEP.

  4. REWRITE
     When: genuinely justified — and it sometimes is.
     ‼️ The honest preconditions:
       □ The platform/language is dead or unsupportable
       □ The requirements have changed so fundamentally that the design is
         wrong, not just untidy
       □ It is SMALL, or can be carved into small independently shippable
         pieces
       □ You can ship incrementally — something valuable in weeks, not a
         year-long dark project
       □ You have written down what the old system does, including the
         edge cases (‼️ if you cannot, you are not ready)
       □ The business has explicitly accepted the cost and the risk

     ‼️ THE QUESTION THAT KILLS MOST REWRITE PROPOSALS:
        "What happens if we're only 70% done when priorities change?"
        If the answer is "we've wasted a year and have nothing", it is not a
        plan — it is a gamble. Restructure it so partial completion still
        delivers value.

‼️ THE SECOND-SYSTEM WARNING (see FAILURES §6): the rewrite will be
   over-scoped, because everyone will add the things they wished were in the
   original. Fix the scope in writing at the start and defend it.
```

---

## 8. Architecture Decision Records

```text
‼️ WHAT AN ADR IS: a short document capturing ONE significant decision, the
   context it was made in, and its consequences. Stored in the repo, in git,
   numbered, and NEVER EDITED after acceptance — superseded instead.

WHY THEY ARE WORTH THE EFFORT
  1. ‼️ THE REAL VALUE IS FOR THE FUTURE READER. In two years someone asks
     "why on earth is it done this way?" Without an ADR, the answer is lost
     and they assume it was stupidity. With one, they can see the constraints
     — and judge whether those constraints still hold.
  2. Writing forces clarity. Half-formed reasoning does not survive being
     written down; you will discover holes in your own argument.
  3. It makes the decision reviewable BEFORE it is expensive.
  4. It prevents re-litigating the same debate every six months.

WHEN TO WRITE ONE
  Anything hard to reverse, anything expensive, anything a future engineer
  would find surprising, anything that was genuinely contested.
  ‼️ NOT for everything. An ADR for your lint config devalues the practice.
```

```markdown
# ADR-014: Use Postgres row-level security for tenant isolation

Date: 2026-03-14
Status: Accepted
Deciders: A. Okafor, B. Lindqvist, C. Mehta

## Context

We are multi-tenant with ~400 organisations sharing one database. Isolation is
currently enforced by a `WHERE org_id = ?` clause in application queries.

In February a missing clause in one new endpoint exposed 12 records across two
organisations for 40 minutes (see incident INC-231). Review caught two further
near-misses in the following month.

We expect to triple the number of endpoints this year and are hiring four
engineers, so reliance on every developer remembering a convention is
increasingly risky. A SOC 2 audit is scheduled for Q4.

## Decision

Enforce tenant isolation with Postgres row-level security policies on all
tenant-scoped tables. The application sets a session variable containing the
current org id; policies filter every query automatically.

## Alternatives considered

1. **Status quo plus lint rules.** Cheapest. Rejected: static analysis cannot
   reliably detect a missing filter in dynamically constructed queries, and it
   still fails open.
2. **A repository layer that always injects the filter.** Rejected: it fails
   open if someone bypasses the layer, which is exactly what happened in
   INC-231. It also does not protect ad-hoc queries or migrations.
3. **A database per tenant.** Strongest isolation. Rejected: 400 databases is
   an operational burden we cannot staff, and migrations become unmanageable.
   ‼️ Reconsider if we win enterprise customers with contractual isolation
   requirements.

## Consequences

Positive:
- Isolation fails CLOSED. A forgotten filter returns nothing, rather than
  everything.
- Enforced for migrations, scripts and ad-hoc queries, not just app code.
- Materially simplifies the SOC 2 story.

Negative:
- Every connection must set the session variable; connection pooling needs
  care (we will use `SET LOCAL` inside a transaction).
- Measured 3-6% query overhead in our benchmark. Accepted.
- Superuser and table owner bypass RLS by default — our migration role must be
  configured accordingly.
- The team must learn RLS. One person currently knows it well. ‼️ Mitigation:
  a brown-bag session and a written runbook before rollout.

## Review

Revisit if p95 query latency regresses by more than 10%, or if we take on a
customer requiring physical data separation.
```

```text
‼️ ADR STATUSES, and the discipline that makes them work:

  PROPOSED    under discussion
  ACCEPTED    decided and in effect
  DEPRECATED  no longer applies, not replaced
  SUPERSEDED  replaced — ‼️ link forward to the ADR that replaced it

  THE RULE: once accepted, do not edit an ADR. Write a new one that supersedes
  it. The historical record is the point — you want to be able to see that the
  team believed X in 2024 and Y in 2026, and why it changed.
```

---

## 9. The RFC Process

```text
‼️ ADR vs RFC — they are often confused:

  RFC   is a PROPOSAL, written BEFORE the decision, to gather input and build
        alignment. It is a conversation.
  ADR   is a RECORD, written when the decision is made. It is a conclusion.

  Many teams write an RFC, discuss it, then distil the outcome into an ADR.

WHEN AN RFC IS WORTH IT
  - The change affects multiple teams
  - It is expensive or hard to reverse
  - There is genuine disagreement, or you expect there to be
  - You need buy-in from people who do not report to you
  ‼️ THIS IS THE PRIMARY TOOL OF INFLUENCE WITHOUT AUTHORITY. A staff engineer
     cannot order other teams to do anything. A well-argued written proposal
     that survives public scrutiny is how the work actually gets aligned.

THE STRUCTURE
  Summary            one paragraph — what and why
  Motivation         the problem, with evidence and numbers
  Proposal           what you want to do, in enough detail to critique
  Alternatives       ‼️ including doing nothing, and why each was rejected
  Drawbacks          ‼️ what is bad about YOUR proposal. Be honest — reviewers
                     will find these anyway, and naming them yourself buys
                     enormous credibility
  Migration          how we get from here to there, and how we roll back
  Open questions     what you genuinely have not resolved
  Timeline           when comments close and the decision gets made

‼️ HOW TO RUN IT WELL
  1. Socialise it with one or two sceptics BEFORE publishing widely. Their
     objections make the document stronger, and you convert potential
     opponents into contributors.
  2. Set a comment deadline. An RFC with no deadline drifts forever.
  3. Reply to every substantive comment in the document, including the ones
     you disagree with. Silence reads as dismissal.
  4. Name who decides. ‼️ An RFC is not a vote. Input is gathered widely; the
     decision is made by a named person or group. Say who, up front.
  5. Close it explicitly with a decision, and record it.
```

---

## 10. Making the Case to Non-Engineers

```text
‼️ THE SKILL THAT UNLOCKS STAFF+ WORK. Most significant technical decisions
   require money, time, or permission from someone who does not care about
   the technology.

THE TRANSLATION RULE
  ‼️ Never lead with the technical fact. Lead with the business consequence,
     and keep the technical detail in reserve for anyone who asks.

  ✗ "We have significant technical debt in the payments module."
  ✓ "Payment changes take three weeks instead of three days, and we've had
     four payment incidents this quarter. Two engineers for six weeks would
     get us back to a few days and remove the most common incident cause."

  ✗ "We should migrate to Postgres 16."
  ✓ "We're on a version that stops receiving security patches in November.
     After that, any vulnerability found is ours to live with, and it would
     show up in the next customer security review."

  ✗ "The architecture doesn't scale."
  ✓ "We handle 500 orders an hour today. At the growth rate in the plan we
     hit that ceiling in about five months, and the work to raise it takes
     about three. So we need to start within eight weeks."

THE FOUR THINGS THEY ACTUALLY WEIGH
  MONEY    What does it cost, and what does it save or earn?
  TIME     How long, and what does it delay?
  RISK     What happens if we do nothing? ‼️ Usually your strongest argument —
           and the one engineers forget to make.
  CUSTOMER What do users experience differently?

‼️ QUANTIFY OR IT DOES NOT COUNT. "It's slow" loses to a roadmap item every
   time. "Checkout takes 4 seconds; industry data suggests each extra second
   costs conversion, and our own funnel shows a 12% drop at that step" is a
   business case. Even a rough, clearly-labelled estimate beats an adjective.

‼️ ALWAYS OFFER OPTIONS, NOT AN ULTIMATUM. Three tiers with costs:
     "Minimal: 2 weeks, fixes the incidents, leaves it slow.
      Recommended: 6 weeks, fixes both.
      Full: 4 months, also enables the Q3 roadmap item."
   This turns "engineering wants to stop feature work" into a business
   decision with a recommendation — which is a conversation you can win.

AND KNOW WHEN TO STOP
  ‼️ If you make the case well, with evidence, and the answer is still no —
     that may be a legitimate business call with information you do not have.
     Record the decision and the risk (an ADR is good for this), and move on.
     Re-litigating a decided question repeatedly costs you the credibility you
     will need for the next one.
```

---

## 11. Decision Anti-Patterns

```text
‼️ 1. HiPPO — THE HIGHEST PAID PERSON'S OPINION
   The most senior person speaks first, and the discussion is over.
   ‼️ FIX: if you are senior, SPEAK LAST. Ask others for their view before
      giving yours. You will get information you would otherwise never hear.

‼️ 2. ANALYSIS PARALYSIS
   Endless comparison, no decision. Usually fear of being wrong.
   ‼️ FIX: size the decision (§2). Set a deadline. For a two-way door,
      deciding badly and fast beats deciding well and slowly.

‼️ 3. THE CONSENSUS TRAP
   Trying to make everyone agree. Produces the blandest option, very slowly,
   and gives any one person a veto.
   ‼️ FIX: seek INPUT from everyone, but name a single decider. Consensus is
      not required; being heard is.

‼️ 4. BIKESHEDDING (Parkinson's law of triviality)
   The team spends 10 minutes on the database and an hour on the button
   colour — because everyone has an opinion on the button.
   ‼️ FIX: notice it out loud. "We've spent 40 minutes on naming and 5 on the
      data model. Let's come back to naming."

‼️ 5. RESULTING — judging the decision by the outcome
   It worked, so it was a good call. It failed, so it was a bad one.
   ‼️ FIX: review the process and the information available at the time. Good
      decisions can have bad outcomes. Punishing bad outcomes teaches your
      team to avoid risk rather than to think clearly.

‼️ 6. SUNK COST
   "We've already spent six months on this." Money already spent is gone
   whatever you choose next; only future cost and value are decision-relevant.
   ‼️ THE QUESTION: "if we were starting today, knowing what we know, would we
      choose this?" If no, the six months is not an argument for continuing.

‼️ 7. SOLUTION-FIRST THINKING
   Starting from a technology and finding a problem for it. See §3 step 1.

‼️ 8. THE FAKE SHORTLIST
   Your preferred option plus two straw men. ‼️ Reviewers can tell, and it
   costs you their trust for every future proposal.

‼️ 9. DECIDING IN A VACUUM
   Not asking the people who will operate it, support it, or live with it.
   The team who gets paged at 3am has information you do not.

‼️ 10. NOT DECIDING
   ‼️ THE MOST EXPENSIVE ANTI-PATTERN, and the least visible. While a decision
      is open, work stalls, people build on assumptions, and two teams quietly
      go in different directions. An explicit "not now, revisit in Q3" is a
      decision. Drift is not.
```

---

## 12. Disagree and Commit

```text
‼️ ONE OF THE MOST VALUABLE PROFESSIONAL BEHAVIOURS, and one of the rarest.

  THE PRINCIPLE: argue your position fully while the decision is open. Once it
  is made — even against you — commit to it completely and help it succeed.

WHY IT MATTERS
  The alternative is a team where every decision is permanently provisional,
  people quietly undermine work they disagreed with, and the same argument
  resurfaces every month. That is more corrosive than any individual wrong
  decision.

  ‼️ AND A HALF-EXECUTED GOOD PLAN LOSES TO A FULLY-EXECUTED DECENT ONE. Most
     decisions matter less than the commitment behind them.

WHAT IT LOOKS LIKE IN PRACTICE

  BEFORE: state your case clearly, with evidence. Make sure you are
  understood, not just heard. Ask directly: "have I made the risk clear?"

  AT THE DECISION: if it goes against you, say so cleanly and move on.
    ✓ "I still think B is the better trade-off, and I want that on record.
       But it's decided, and I'll make A work. What do you need from me?"

  AFTER: commit genuinely. No "I told you so" when problems appear — help fix
  them. ‼️ Undermining a decision you lost is the fastest way to lose
  influence over the next one.

‼️ WHAT IT IS NOT: it is not agreeing, and it is not silence. Record your
   dissent — in the ADR's alternatives section, in the RFC comments. That is
   professional, it is useful to future readers, and it is completely
   compatible with committing.

‼️ THE EXCEPTION, and it is narrow: if a decision is genuinely unsafe, illegal,
   or unethical, "disagree and commit" does not apply. Escalate. Make sure
   the person making the call understands the specific risk in writing. This
   is rare — do not confuse "I think this is wrong" with "this is dangerous".
```

---

## 13. Worked Examples

```text
── "SHOULD WE MOVE TO MICROSERVICES?" ──────────────────────────────────────

  REFRAME (§3.1): what problem are we having?
    - Are deploys blocked by other teams' work?
    - Does one component need to scale differently from the rest?
    - Are teams stepping on each other in the same code?
    - ‼️ Or does it just feel messy? That is not a reason.

  If the answer is "our 12 engineers all deploy fine and nothing needs
  separate scaling" → NO. You would take on distributed transactions, network
  failure modes, and a much harder local development story, to solve a problem
  you do not have.

  If the answer is "the video encoder needs 20x the CPU of everything else and
  blocks deploys for six hours" → extract THAT ONE THING. ‼️ Not a migration
  to microservices; one service, for a named reason.

  REVERSIBILITY: splitting is far easier than merging back. Treat as one-way.

── "SHOULD WE ADOPT KUBERNETES?" ───────────────────────────────────────────

  THE HONEST QUESTIONS:
    - How many services do we run? (Under ~5: almost certainly no.)
    - Do we have someone who can operate it, and a backup for them?
    - What are we doing now, and what specifically hurts about it?
    - Would managed containers (ECS, Cloud Run, Fly, Render) solve it at a
      fraction of the operational cost?

  ‼️ Kubernetes solves real problems — heterogeneous workloads, many teams,
     complex scheduling, multi-cloud portability. It is a poor trade for a
     small team running three services with steady traffic, where it mostly
     adds a large operational surface and a new category of outage.

  This is an INNOVATION TOKEN question (§5). Is container orchestration where
  you want to spend one?

── "SHOULD WE USE A NEW FRONTEND FRAMEWORK FOR THIS PROJECT?" ──────────────

  CONSTRAINTS FIRST (§3.2): who maintains it after launch? Can we hire for
  it? Does it share components with our existing products?

  ‼️ THE QUESTION PEOPLE SKIP: what happens in three years when this framework
     is no longer fashionable and the person who chose it has moved on?

  REVERSIBILITY: rewriting a frontend is expensive but bounded, and does not
  touch your data. Less permanent than it feels — this is closer to a
  two-way door than a database choice.

── "SHOULD WE BUILD OUR OWN FEATURE FLAG SYSTEM?" ──────────────────────────

  IS IT OUR COMPETITIVE ADVANTAGE (§4)? No.

  BUILD looks cheap: a table, a cache, a helper function. Two days.
  ‼️ THE PART YOU FORGOT: a UI so non-engineers can toggle without a deploy.
     Percentage rollouts. Targeting rules. An audit log of who changed what.
     Sub-millisecond evaluation. Consistent bucketing so a user does not flip
     between variants. SDKs for every language you use. Handling the flag
     service being down.

  That is not two days; it is a product. BUY IT, until your requirements are
  genuinely unusual.

  ‼️ THE GENERAL LESSON: when the build estimate feels surprisingly small,
     you have almost certainly scoped only the happy path. Ask what the
     vendor's feature list contains and why.
```

---

## Related Files

- [ENGINEERING-FAILURES-DEEP.md](ENGINEERING-FAILURES-DEEP.md) — what bad decisions actually cost
- [LEGACY-MIGRATION-DEEP.md](LEGACY-MIGRATION-DEEP.md) — executing the rewrite/strangle decision
- [STAFF-PLUS-ENGINEER-DEEP.md](STAFF-PLUS-ENGINEER-DEEP.md) — influence, and how decisions get made
- [TECHNICAL-DEBT-DEEP.md](../2-medium-priority/TECHNICAL-DEBT-DEEP.md) — making the case to pay it down
- [NON-FUNCTIONAL-REQUIREMENTS.md](../2-medium-priority/NON-FUNCTIONAL-REQUIREMENTS.md) — the criteria you decide against
- [TECHNICAL-LEADERSHIP-DEEP.md](../3-low-priority/TECHNICAL-LEADERSHIP-DEEP.md) — ADR and RFC templates
