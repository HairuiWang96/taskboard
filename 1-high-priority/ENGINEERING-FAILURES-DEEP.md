# Engineering Failures — What Goes Wrong and Why

**Priority: HIGH**

> Famous outages and what actually caused them, the architectural decisions that sink
> projects, the organisational failure modes behind both, and how to run a blameless
> post-mortem.
>
> Studying failure is the fastest way to develop judgement. You cannot personally make
> enough mistakes in one career to learn all of these.

---

## Table of Contents

1. [Why Study Failure](#1-why-study-failure)
2. [The Anatomy of a Failure](#2-the-anatomy-of-a-failure)
3. [Famous Outages, and the Real Cause](#3-famous-outages-and-the-real-cause)
4. [Catastrophic Software Failures](#4-catastrophic-software-failures)
5. [Architectural Decisions That Kill Projects](#5-architectural-decisions-that-kill-projects)
6. [Organisational Failure Modes](#6-organisational-failure-modes)
7. [The Blameless Post-Mortem](#7-the-blameless-post-mortem)
8. [Patterns Across Every Failure](#8-patterns-across-every-failure)
9. [Talking About Failure in Interviews](#9-talking-about-failure-in-interviews)

---

## 1. Why Study Failure

```text
‼️ THE ARGUMENT, BRIEFLY:

  Engineering judgement is mostly PATTERN RECOGNITION for danger. Senior
  engineers have it because they have been burned. You cannot make enough
  mistakes personally to acquire it all — a career is only so long, and most
  of these failures happen once per company per decade.

  So you borrow other people's. Every famous outage below is a pattern you can
  now recognise in a design review, years before it would have bitten you.

WHY THIS MATTERS MORE AS YOU GET SENIOR

  A junior engineer's mistakes are caught in code review. A staff engineer's
  mistakes are ARCHITECTURAL — they are not visible for eighteen months, and
  by then they are extremely expensive to undo.

  ‼️ The distinguishing skill of a staff+ engineer is not writing better code.
     It is anticipating how a design will fail, and how the ORGANISATION will
     fail around it.

OTHER INDUSTRIES DO THIS DELIBERATELY

  Aviation is the model. Every crash is investigated publicly, the findings are
  published, and every pilot studies them. Aviation got extraordinarily safe
  precisely because it treats failure as shared learning rather than individual
  shame.

  ‼️ Software is slowly adopting this: public post-mortems from Cloudflare,
     GitLab, AWS and Stripe are genuinely excellent reading, and the best ones
     name systemic causes rather than people.
```

---

## 2. The Anatomy of a Failure

```text
‼️ THE SINGLE MOST IMPORTANT IDEA IN THIS FILE:

   THERE IS ALMOST NEVER A "ROOT CAUSE". There is a CHAIN.

   Every significant outage is multiple small problems lining up. Any one of
   them alone would have been harmless. Asking "what was the root cause?"
   pushes you to stop at the first plausible answer — usually a person — and
   miss the five other things that had to be true.

THE SWISS CHEESE MODEL (from aviation safety)

   Think of each safeguard as a slice of Swiss cheese. Each has holes — gaps
   in coverage. Normally the holes do not line up, so a problem is stopped by
   the next slice.

     code review    testing      staging     monitoring    rollback
        │ ○ │        │  ○ │       │ ○  │       │ ○  │       │  ○ │
        │   │  ──►   │    │ ──►   │    │ ──►   │    │ ──►   │    │
        │   │        │    │       │    │       │    │       │    │

   An incident is when the holes line up and something passes through all of
   them.

   ‼️ THE PRACTICAL CONSEQUENCE: after an incident, do not ask "whose fault?"
      Ask "how many layers did this pass through, and why was each one open?"
      Fixing ONE layer is usually enough to prevent recurrence — and it is
      almost always cheaper than trying to make humans perfect.

THE THREE QUESTIONS THAT ACTUALLY MATTER

   1. Why did it HAPPEN?        (the technical chain)
   2. Why was it not CAUGHT?    (the detection gap — often the bigger problem)
   3. Why did it take so long to FIX?  (the recovery gap)

   ‼️ Most teams only answer #1. The biggest wins usually live in #2 and #3:
      an outage you detect in 60 seconds and roll back in 5 minutes is a
      non-event, whatever caused it.
```

---

## 3. Famous Outages, and the Real Cause

### Knight Capital — $440M in 45 minutes (2012)

```text
WHAT HAPPENED
  A trading firm deployed new code to 8 production servers. It reached 7.
  The 8th kept running old code.

  The deploy also REPURPOSED an old feature flag that, in the old code, still
  activated long-dead test software called "Power Peg". On that one server,
  the flag switched on a program designed to buy high and sell low — deliberately,
  because it was written to test the system.

  In 45 minutes it executed millions of trades. Knight lost $440 million,
  roughly four times its annual profit, and was acquired within days.

‼️ THE REAL CAUSES — note how many there are
  - No automated deployment. A human copied files to servers by hand.
  - No verification that the deploy reached all servers.
  - A feature flag was REUSED for a new purpose while old code still read it.
  - Dead code was left in production for eight years.
  - No kill switch. Engineers watched it trade for 45 minutes.
  - Alerts fired but were sent to an email address nobody was watching.

‼️ THE LESSONS THAT TRANSFER
  1. Deployment must be automated and VERIFIED. "It probably worked" is not
     a deployment strategy.
  2. NEVER reuse a flag name. Retire flags, and delete the code behind them.
  3. Dead code is not free. It is a loaded weapon with no safety catch.
  4. ‼️ You need a way to STOP. For anything that touches money or sends
     things to users, "how do we turn this off in 10 seconds?" is a design
     requirement, not an afterthought.
```

### AWS S3 — half the internet, 4 hours (Feb 2017)

```text
WHAT HAPPENED
  An engineer was debugging a billing system slowdown. They ran a documented
  runbook command to remove a small number of servers from a subsystem.

  A typo in one parameter removed far more capacity than intended — including
  servers running the index subsystem that S3 needs to serve ANY request in
  that region.

  Restarting required a full safety check of the system, which had not been
  restarted in years. It took hours. Huge parts of the internet went down.

‼️ THE PART EVERYONE REMEMBERS
  The AWS STATUS PAGE could not be updated to report the outage — because the
  status page's icons were hosted on S3.

‼️ THE REAL CAUSES
  - A powerful, irreversible command with no confirmation and no guard rails.
  - No limit on how much capacity a single command could remove.
  - Subsystems had grown large enough that restart time was untested.
  - The status page had an undeclared dependency on the thing it monitors.

‼️ THE LESSONS
  1. Dangerous tools need guard rails: confirmations, blast-radius caps,
     "you are about to affect 400 servers, type the count to confirm".
  2. ‼️ If you have not restarted it recently, you do not know that it starts.
     This is why chaos engineering exists.
  3. YOUR MONITORING MUST NOT DEPEND ON WHAT IT MONITORS. Status pages,
     alerting and logging need a separate failure domain. This mistake is
     repeated constantly.
```

### GitLab — deleted the production database (2017)

```text
WHAT HAPPENED
  During an incident caused by spam load, a tired engineer working late tried
  to remove a corrupted replica directory so replication could be re-set-up.

  They ran the deletion on the WRONG SERVER — the primary. By the time they
  noticed and hit Ctrl+C, 300GB was gone. Roughly 6 hours of data was lost.

‼️ THEN THE TRULY INSTRUCTIVE PART. They had FIVE backup mechanisms:
  1. Regular pg_dump backups — silently failing for months (a version
     mismatch made them produce tiny useless files, and the failure email
     went to an address that rejected it)
  2. Disk snapshots — not enabled for the database server
  3. S3 backups — the bucket was empty
  4. Replication — the thing they were fixing
  5. A manual LVM snapshot — taken 6 hours earlier by luck, for unrelated
     testing. ‼️ THIS IS THE ONLY REASON THE DATA EXISTS AT ALL.

‼️ THE LESSONS
  1. ‼️ AN UNTESTED BACKUP IS NOT A BACKUP. It is a belief. Restore from your
     backups on a schedule, to a real environment, and time it.
  2. Backup failures must alert loudly. Silent failure is the worst kind.
  3. Production shells should look different — colour the prompt red, put the
     hostname in it. Make "which server am I on?" impossible to get wrong.
  4. Tired engineers make mistakes. An incident that has run for hours needs
     a handoff, not heroics.

‼️ GitLab live-streamed the recovery and published a full, unflinching
   post-mortem naming no individual. It is one of the best public examples of
   blameless culture in the industry.
```

### Cloudflare — a regex took down the web (July 2019)

```text
WHAT HAPPENED
  A new firewall rule contained a regular expression with a nested quantifier:
      .*.*=.*
  This causes CATASTROPHIC BACKTRACKING — the regex engine tries an
  exponential number of ways to match certain inputs.

  It was deployed globally, all at once, to every machine. CPU hit 100%
  everywhere. Cloudflare's network — then fronting a large share of the web —
  stopped serving traffic for about 30 minutes.

‼️ THE REAL CAUSES
  - The rule was deployed GLOBALLY AND INSTANTLY, with no staged rollout.
  - The test suite checked correctness, not CPU cost.
  - No CPU guard on the regex engine to abort a pathological match.

‼️ THE LESSONS
  1. ‼️ NEVER DEPLOY GLOBALLY AT ONCE. Stage it: one machine, one datacentre,
     one region, then everywhere. This single practice would have turned a
     global outage into an alert.
  2. Config changes are DEPLOYMENTS. They deserve the same review, staging,
     and rollback as code — they are the most common cause of large outages
     precisely because they are treated as less risky.
  3. Regex on untrusted input needs a timeout or a linear-time engine (RE2).
     ‼️ This is also a denial-of-service vector: "ReDoS".
```

### Meta/Facebook — locked out of their own buildings (Oct 2021)

```text
WHAT HAPPENED
  A routine maintenance command intended to assess backbone capacity
  accidentally withdrew Facebook's BGP routes — effectively removing Facebook,
  Instagram and WhatsApp from the internet's map. For six hours.

‼️ THE CASCADE, which is the interesting part
  - Because DNS servers withdrew their routes too, the domains stopped
    resolving entirely.
  - Engineers could not fix it remotely, because the remote access tools
    depended on the same network.
  - They went to the datacentre physically — but the BADGE READERS
    authenticated over the same network. They could not get in the door.
  - The internal communication tools were also down, so they could not
    coordinate.

‼️ THE LESSONS
  1. ‼️ YOUR RECOVERY PATH MUST NOT DEPEND ON THE THING THAT IS BROKEN. This is
     the same lesson as the AWS status page, at a larger scale.
  2. Map your circular dependencies deliberately. "If X is down, can we still
     fix X?" is a question worth asking about every critical system.
  3. Have an out-of-band communication channel that does not run on your own
     infrastructure.
```

### Fastly — one customer's config, global outage (June 2021)

```text
WHAT HAPPENED
  A software update in May introduced a latent bug. In June, a single customer
  pushed a valid configuration change that happened to trigger it — taking
  down 85% of Fastly's network, and with it the BBC, Reddit, Amazon, the UK
  government, and much of the web. For about an hour.

‼️ THE LESSON
  Latent bugs wait. The trigger was a legitimate, valid customer action — so
  no amount of input validation would have caught it.
  ‼️ This is the argument for blast-radius design: multi-tenant systems need
  isolation so that one tenant's configuration cannot affect everyone else.
  And it is another argument for staged rollouts of the code that carried the
  latent bug in the first place.
```

---

## 4. Catastrophic Software Failures

```text
‼️ These are older and more severe. They are worth knowing because they are
   the canonical teaching examples, and because the causes are still current.

THERAC-25 (1985-87) — a radiation therapy machine that killed patients
  A race condition: if an operator edited the treatment settings quickly
  enough, a concurrency bug left the machine in a state that delivered
  radiation doses roughly 100x the intended amount. At least six patients
  received massive overdoses; several died.

  ‼️ THE CAUSES WORTH CARRYING:
    - HARDWARE INTERLOCKS WERE REMOVED because "the software handles it".
      The previous model had physical safeguards; the new one trusted code.
    - Error messages were cryptic numeric codes operators learned to dismiss.
    - The software was written by one person, never independently reviewed.
    - Early reports were dismissed because "the software cannot do that".

  THE LESSON: defence in depth, and ‼️ believe your users when they report
  something impossible. "That can't happen" is what people say right before
  discovering it happened.

ARIANE 5 FLIGHT 501 (1996) — $370M, 37 seconds
  Code reused from Ariane 4 converted a 64-bit float to a 16-bit integer.
  Ariane 5 flew faster, the value overflowed, the exception was unhandled, the
  guidance computer shut down, the backup ran the SAME code and failed the
  same way, and the rocket self-destructed.

  ‼️ THE LESSONS:
    - Reused code carries its ORIGINAL ASSUMPTIONS. Ariane 4's flight profile
      was an unwritten precondition.
    - A redundant backup running IDENTICAL software is not redundancy. It is
      the same failure, twice.
    - The failing calculation was not even needed after launch.

MARS CLIMATE ORBITER (1999) — $327M
  One team used imperial units, another metric. The spacecraft entered the
  atmosphere at the wrong altitude and was destroyed.
  ‼️ THE LESSON: interface assumptions must be explicit and checked. This is
  the strongest possible argument for typed units in code — a "Newton-seconds"
  type would have made this a compile error.

HEALTHCARE.GOV (2013)
  Launched to national attention and collapsed immediately — 6 people
  completed enrolment on day one.
  ‼️ CAUSES: 55 contractors with no single technical owner, integration left
  until the end, essentially no load testing, and a fixed political launch
  date that could not move.
  THE LESSON: this was an ORGANISATIONAL failure that presented as a technical
  one. No architecture survives having no owner.
```

---

## 5. Architectural Decisions That Kill Projects

```text
‼️ Outages are dramatic but recoverable. THESE are the failures that quietly
   consume years, and they are the ones a staff engineer is paid to prevent.

── THE BIG-BANG REWRITE ────────────────────────────────────────────────────
  "This codebase is a mess. Let's rewrite it properly."

  WHY IT FAILS:
    - The old system encodes years of bug fixes and edge cases nobody
      remembers. ‼️ That "ugly" code is usually ugly BECAUSE it handles real
      cases you have not thought of yet.
    - The business does not stop. You must hit a MOVING TARGET — every feature
      added to the old system must be added to the new one.
    - You ship nothing for a year, so the rewrite has no political support
      when it slips. And it will slip.
    - The team that built the mess is often the team building the replacement.

  THE CANONICAL EXAMPLE: Netscape rewrote their browser from scratch. It took
  roughly three years, during which Internet Explorer took the market. The
  company never recovered. Joel Spolsky's essay on it ("Things You Should
  Never Do") is worth reading once.

  ‼️ WHAT TO DO INSTEAD: strangle it incrementally. See LEGACY-MIGRATION-DEEP.
     Rewrites CAN work — but only with a hard scope limit, incremental
     delivery, and an honest answer to "what happens if we stop halfway?"

── PREMATURE MICROSERVICES ────────────────────────────────────────────────
  Splitting into services before you understand the domain boundaries.

  WHAT YOU GET: a DISTRIBUTED MONOLITH — services so coupled they must be
  deployed together, but now with network calls, partial failures, distributed
  transactions, and eventual consistency between them.
  ‼️ You have taken on every cost of microservices and gained none of the
     benefits.

  WHY IT HAPPENS: it is what large successful companies do, and it looks like
  the professional choice. But Amazon and Netflix moved to microservices to
  solve an ORGANISATIONAL problem — hundreds of engineers blocking each other
  on one deploy. If you have 12 engineers, you do not have that problem.

  ‼️ THE HONEST RULE: a well-structured modular monolith with clear internal
     boundaries takes you remarkably far, and it is far easier to split later
     along boundaries you have LEARNED than boundaries you GUESSED.

── RESUME-DRIVEN DEVELOPMENT ──────────────────────────────────────────────
  Choosing technology because it is interesting or career-enhancing, rather
  than because it fits.
  ‼️ The tell: the justification is about the technology's properties, not
     about a problem you actually have. Kubernetes for a single app with
     steady traffic. Kafka for 100 events a day. GraphQL for one consumer.
  The person who chose it usually leaves within two years. The team maintains
  it for a decade.

── NOT-INVENTED-HERE ──────────────────────────────────────────────────────
  Building your own auth, your own ORM, your own job queue.
  ‼️ The cost is never the initial build — it is the decade of maintenance,
     the security holes nobody is looking for, and the fact that no new hire
     has experience with it. Build what is your competitive advantage. Buy or
     adopt everything else.

── SPECULATIVE GENERALITY / OVER-ABSTRACTION ──────────────────────────────
  Building a plugin architecture for the one plugin you have. Abstracting the
  database behind an interface "in case we switch" (you will not).
  ‼️ Every abstraction has a cost in comprehension. An abstraction built for a
     future that does not arrive is pure cost — and it is usually WRONG for
     the future that does arrive, because it was designed without the
     information that future would have provided.

── IGNORING THE DATA MODEL ────────────────────────────────────────────────
  ‼️ THE MOST UNDER-RATED ITEM ON THIS LIST. Code is cheap to change. Data is
     not. A bad schema with five years of production data in it may be
     effectively permanent — you cannot change it without a migration project,
     and every downstream consumer depends on its shape.
  Spend disproportionate care on the data model early. It outlives every
  framework decision you make around it.

── COUPLING TO A VENDOR OR FRAMEWORK ──────────────────────────────────────
  Not "never use a framework" — but know which decisions are ONE-WAY DOORS.
  Your business logic should not be so entangled with a vendor's SDK that
  leaving requires rewriting the product.
```

---

## 6. Organisational Failure Modes

```text
‼️ Technical failures usually have organisational causes upstream. Recognising
   these is much of what separates staff from senior.

CONWAY'S LAW
  "Organisations design systems that mirror their own communication structure."
  Four teams building a compiler produce a four-pass compiler. A frontend team
  and a backend team produce an API shaped by that split, not by the domain.
  ‼️ THE USEFUL VERSION ("inverse Conway manoeuvre"): if you want a particular
     architecture, ORGANISE THE TEAMS THAT WAY FIRST. Fighting Conway's law
     with documentation never works.

BROOKS'S LAW
  "Adding people to a late software project makes it later."
  New people need onboarding from the people already busy, and communication
  paths grow quadratically.
  ‼️ The practical consequence: a deadline you are going to miss cannot be
     rescued by hiring. Cut scope instead — it is the only lever that reliably
     works late in a project.

THE SECOND-SYSTEM EFFECT
  The second system a person designs is the most dangerous: they finally get
  to add everything they wished they could add to the first. Over-engineered,
  over-general, over-scoped.
  ‼️ Relevant to every "let's do it properly this time" rewrite.

DIFFUSED OWNERSHIP
  ‼️ If everyone owns it, nobody does. Systems with no named owner degrade
     silently — nobody upgrades the dependencies, nobody watches the alerts,
     nobody knows how it works. Healthcare.gov at scale; a neglected internal
     service at small scale.

THE DEATH MARCH
  A fixed date, fixed scope, and fixed team, where the maths never worked.
  ‼️ Quality is the only variable left, so quality is what gets spent. The
     result is a late project AND a bad one.

GOODHART'S LAW
  "When a measure becomes a target, it ceases to be a good measure."
  Measure lines of code, get verbose code. Measure ticket counts, get tickets
  split into fragments. Measure test coverage, get tests with no assertions.
  ‼️ Directly relevant to how you choose engineering metrics.

NORMALISATION OF DEVIANCE
  From the Challenger investigation: a small deviation from safe practice has
  no consequence, so it becomes the new normal, and the baseline drifts.
  ‼️ In software: "the test suite is always a bit flaky", "we always deploy on
     Friday", "that alert always fires, ignore it". Each is fine until the day
     it is not, and by then nobody remembers it was a deviation.

ALERT FATIGUE
  Too many alerts, most of them noise, so humans learn to ignore all of them —
  including the real one. ‼️ This is Therac-25's cryptic error codes, and
  Knight Capital's unwatched alert email. An alert nobody acts on is worse
  than no alert, because it creates the illusion of monitoring.
```

---

## 7. The Blameless Post-Mortem

```text
‼️ THE PREMISE: people do not come to work intending to cause an outage. If a
   person could break production with one command, the SYSTEM allowed it.
   The engineer who ran the command is the last link in a chain, not the cause.

WHY BLAME IS COUNTERPRODUCTIVE — this is a practical argument, not a kind one:
  - If people are punished, they HIDE incidents and near-misses. You lose the
    data you most need.
  - "Human error" is a conclusion that prevents further investigation. It
    feels like an answer and teaches nothing.
  - The next person in the same situation will make the same mistake, because
    nothing about the situation changed.

‼️ BLAMELESS DOES NOT MEAN NO ACCOUNTABILITY. The team is accountable for
   fixing the system. It means you separate "what happened" from "who to
   blame", because the first question cannot be answered honestly while the
   second is in the room.
```

```text
── THE POST-MORTEM TEMPLATE ────────────────────────────────────────────────

  TITLE + DATE + SEVERITY + AUTHORS

  SUMMARY  (3-4 sentences a non-engineer can follow)
    What broke, who was affected, for how long, and what fixed it.

  IMPACT  (quantified — this is what justifies the follow-up work)
    - Duration: 14:32-15:47 UTC (75 minutes)
    - Users affected: ~40,000 (18% of active users)
    - Failed requests: 2.1M
    - Revenue impact: approximately £45,000 in abandoned checkouts
    - Support tickets: 340

  TIMELINE  (timestamped, factual, including detection and false starts)
    14:32  Deploy of v2.14 begins
    14:35  Error rate rises from 0.1% to 4%  ← ‼️ note when it BEGAN
    14:48  First customer report                ‼️ vs when it was NOTICED
    14:51  Alert fires (threshold was 5%)       ‼️ the detection gap
    15:02  On-call engineer acknowledges
    15:20  Team incorrectly suspects the database
    15:38  Root cause identified in the deploy
    15:47  Rollback complete, errors return to baseline

  ‼️ THE GAPS IN THAT TIMELINE ARE THE REAL FINDINGS:
     13 minutes before anyone knew. 11 minutes to acknowledge. 18 minutes
     spent investigating the wrong subsystem. The deploy itself is almost
     incidental — you will never stop shipping bugs, but you can absolutely
     shorten those three gaps.

  CONTRIBUTING FACTORS  (‼️ plural, deliberately — not "root cause")
    1. The change altered connection pooling in a way not covered by tests
    2. Staging has 1/100th of production traffic, so it did not surface
    3. The alert threshold (5%) was too high to catch a 4% error rate
    4. The deploy went to 100% of traffic at once
    5. The runbook for this service was 8 months out of date

  WHAT WENT WELL  (‼️ include this — it identifies what to protect)
    - Rollback worked first time and took under 2 minutes
    - The correlation id let us trace a failing request quickly once we looked

  ACTION ITEMS  (‼️ each with an OWNER and a DATE, or it will not happen)
    | Action                                      | Owner | Due   | Type       |
    | Lower error-rate alert to 1%                | Ana   | 12/03 | Detection  |
    | Add canary stage to deploy pipeline          | Ben   | 26/03 | Prevention |
    | Load-test connection pool changes in CI      | Ana   | 09/04 | Prevention |
    | Update the runbook                           | Cara  | 12/03 | Recovery   |

    ‼️ Categorise by PREVENTION / DETECTION / RECOVERY. A post-mortem with
       only prevention items is incomplete — you cannot prevent everything,
       so improving detection and recovery pays off across ALL future
       incidents, including the ones you have not imagined.
```

```text
‼️ RUNNING THE MEETING — the practical rules:

  1. Within a few days, while memory is fresh.
  2. Everyone involved attends. No managers assigning blame.
  3. Establish the timeline FIRST, factually, before any analysis.
  4. Language discipline: "the deploy script did not verify all hosts", NOT
     "Ben forgot to check". Describe the SYSTEM, not the person.
  5. ‼️ THE COUNTERFACTUAL TRAP: ban sentences of the form "if only they had
     ...". They describe a world that did not happen and teach nothing. Ask
     instead: "what made that the reasonable thing to do at the time?"
     People act sensibly given the information they have. Find out what
     information they had.
  6. Ask "why was this possible?" repeatedly — but ‼️ beware "5 Whys" as a
     ritual. It produces a single linear chain, which is exactly the wrong
     shape. Real incidents branch. Ask why about each contributing factor
     separately.
  7. Publish it internally. A post-mortem nobody reads is a diary.

‼️ THE REAL TEST OF THE CULTURE: does anyone volunteer "I did that, and here
   is what made it easy to do"? If yes, you have a blameless culture. If
   people go quiet, you do not — whatever the policy says.
```

---

## 8. Patterns Across Every Failure

```text
‼️ Read the incidents above together and the same shapes keep appearing.
   These are the questions to bring to a design review.

  1. NO STAGED ROLLOUT
     Cloudflare, Knight Capital. Change everything at once and a bug becomes
     an outage instead of an alert.
     → ASK: "how does this reach production, and can we do 1% first?"

  2. THE RECOVERY PATH DEPENDS ON THE BROKEN THING
     AWS status page, Meta badge readers.
     → ASK: "if this is down, what else is down — including our tools?"

  3. NO KILL SWITCH
     Knight Capital traded for 45 minutes while people watched.
     → ASK: "how do we stop this in under a minute?"

  4. UNTESTED RECOVERY
     GitLab's five broken backups. AWS's untested restart.
     → ASK: "when did we last actually restore/restart/fail over, and how
       long did it take?"

  5. DETECTION GAP
     Almost every incident. Customers notice before monitoring does.
     → ASK: "what alert fires, how fast, and who sees it?"

  6. DEAD CODE AND STALE CONFIG
     Knight Capital's eight-year-old test program.
     → ASK: "what is still in here that nobody uses?"

  7. CONFIG TREATED AS LESS RISKY THAN CODE
     Cloudflare, Fastly, Meta. ‼️ A large share of major outages are config
     or operational commands, not code deploys — precisely because they skip
     the safeguards code goes through.
     → ASK: "does this change get reviewed, staged, and rolled back like code?"

  8. SUCCESS DEPENDS ON A HUMAN NOT MAKING A MISTAKE
     GitLab's wrong server, AWS's typo.
     → ASK: "what is the worst thing one tired person can do with one command
       here, and can we make that impossible?"

  9. A SINGLE SHARED FAILURE DOMAIN
     Fastly's one customer, Ariane's identical backup.
     → ASK: "what is the blast radius, and what isolates tenants/regions?"

 10. ASSUMPTIONS THAT ARE TRUE UNTIL THEY ARE NOT
     Ariane 5's flight profile, Mars Orbiter's units.
     → ASK: "what is this code assuming about its inputs, and is that written
       down anywhere?"
```

---

## 9. Talking About Failure in Interviews

```text
‼️ "Tell me about a time you failed" is asked at every level, and the answer
   is weighted far more heavily at staff+ than people expect. The interviewer
   is testing whether you can be honest, whether you learn systematically, and
   whether you understand systemic causes.

WHAT A WEAK ANSWER LOOKS LIKE
  - A humblebrag: "I worked too hard and burned out."
  - Blaming others: "The requirements kept changing."
  - A trivial failure with no consequence.
  - A failure with no learning attached, or a learning that is a platitude
    ("I learned to communicate more").

WHAT A STRONG ANSWER LOOKS LIKE — the structure:
  1. REAL STAKES. Something that actually mattered and actually went wrong.
  2. YOUR PART, OWNED PLAINLY. No hedging, no distributing blame.
  3. SYSTEMIC ANALYSIS. Not "I made a mistake" but "here is why the system
     made that mistake easy, and here is what we changed".
  4. WHAT YOU DO DIFFERENTLY NOW, concretely.

  ‼️ The systemic step is what signals seniority. A senior engineer says "I
     should have been more careful". A staff engineer says "I should have been
     more careful, and separately, the fact that one person's carelessness
     could cause that was the real problem — so we added X".

AN EXAMPLE SHAPE

  "I designed a data model for a multi-tenant feature and made tenant
   isolation a query-level concern rather than a schema-level one. It worked,
   and it passed review.

   Eight months later a new engineer wrote a query that missed the tenant
   filter, and one customer briefly saw another customer's records. We caught
   it within the hour and no data was taken, but we had to disclose it.

   My mistake was not the missing filter — it was designing something where
   forgetting one WHERE clause was possible at all. We moved to row-level
   security in the database, so the isolation is enforced where it cannot be
   forgotten.

   What I do differently now: for anything involving isolation or permissions,
   I ask 'what happens when someone forgets?' during design, not review. If
   the answer is 'a breach', it belongs in a layer that cannot be skipped."

  ‼️ Note what that does: real stakes, clear ownership, a systemic insight, and
     a transferable rule. It is also a story about JUDGEMENT, which is what
     they are actually buying at staff level.

‼️ HAVE TWO OR THREE OF THESE READY. One technical/architectural, one about a
   decision that turned out wrong, one about people or process. Write them out
   in advance — see BEHAVIORAL-STAR-STORIES.md.
```

---

## Related Files

- [TECHNICAL-DECISION-MAKING-DEEP.md](TECHNICAL-DECISION-MAKING-DEEP.md) — how to avoid the decisions in §5
- [LEGACY-MIGRATION-DEEP.md](LEGACY-MIGRATION-DEEP.md) — the alternative to the big-bang rewrite
- [INCIDENT-RESPONSE-DEEP.md](INCIDENT-RESPONSE-DEEP.md) — handling the outage before the post-mortem
- [STAFF-PLUS-ENGINEER-DEEP.md](STAFF-PLUS-ENGINEER-DEEP.md) — the role that prevents these
- [BEHAVIORAL-STAR-STORIES.md](BEHAVIORAL-STAR-STORIES.md) — writing up your own failure stories
- [NON-FUNCTIONAL-REQUIREMENTS.md](../2-medium-priority/NON-FUNCTIONAL-REQUIREMENTS.md) — the requirements these violate
