# Non-Functional Requirements — Beginner's Guide

**Priority: MEDIUM**

> What NFRs are, the categories worth knowing, how to write one that is actually useful,
> the trade-offs between them, and how to talk about them in a system design interview.
>
> No prior experience needed. Useful for interviews, and for the moment someone asks you
> "how fast does it need to be?" and you realise nobody has decided.

---

## Table of Contents

1. [Functional vs Non-Functional — The Core Idea](#1-functional-vs-non-functional--the-core-idea)
2. [Why NFRs Are What Actually Kill Projects](#2-why-nfrs-are-what-actually-kill-projects)
3. [Performance](#3-performance)
4. [Scalability](#4-scalability)
5. [Availability & Reliability](#5-availability--reliability)
6. [Security](#6-security)
7. [Maintainability](#7-maintainability)
8. [Usability & Accessibility](#8-usability--accessibility)
9. [Observability](#9-observability)
10. [Compatibility, Compliance & Cost](#10-compatibility-compliance--cost)
11. [How to Write a Good NFR](#11-how-to-write-a-good-nfr)
12. [The Trade-Offs](#12-the-trade-offs)
13. [Where NFRs Come From](#13-where-nfrs-come-from)
14. [How to Test Each One](#14-how-to-test-each-one)
15. [NFRs in a System Design Interview](#15-nfrs-in-a-system-design-interview)
16. [A Checklist You Can Reuse](#16-a-checklist-you-can-reuse)
17. [Common Mistakes](#17-common-mistakes)

---

## 1. Functional vs Non-Functional — The Core Idea

```text
‼️ THE WHOLE DISTINCTION IN ONE LINE:

   FUNCTIONAL requirement      = WHAT the system does.
   NON-FUNCTIONAL requirement  = HOW WELL it does it.

Same feature, two kinds of requirement:

  FUNCTIONAL      "A user can upload a profile photo."
                  Either it works or it does not. It is a yes/no question.

  NON-FUNCTIONAL  "The upload completes in under 3 seconds for a 5MB file."
                  "It works on a 3G connection."
                  "It rejects files that are not real images."
                  "It still works when 10,000 people upload at once."
                  "A blind user can complete it with a screen reader."

  ‼️ Notice that every non-functional requirement above is about the SAME
     feature. They do not add capability — they constrain QUALITY.

ANOTHER WAY TO SPOT THE DIFFERENCE

  Functional requirements are usually VERBS — the system DOES something.
      "sends an email", "calculates tax", "exports a report"

  Non-functional requirements are usually ADVERBS — it does it a certain way.
      "quickly", "securely", "reliably", "accessibly", "cheaply"

  This is why NFRs are also called "the -ilities":
      availability, scalability, reliability, maintainability, usability,
      observability, portability, security (the odd one out, name-wise)

  And why they are sometimes called QUALITY ATTRIBUTES — which is arguably
  the clearer name, because that is exactly what they are.
```

```text
‼️ THE TEST FOR "IS THIS AN NFR?"

   Ask: "if I removed this requirement, would the feature still DO its job?"

   YES, but worse  → non-functional
       Remove "loads in 2 seconds" and search still returns results.
       It is just slow. Still functional, worse quality.

   NO, it would not work at all  → functional
       Remove "returns matching results" and search is not search.
```

---

## 2. Why NFRs Are What Actually Kill Projects

```text
‼️ THE UNCOMFORTABLE TRUTH: features are rarely what fail. Quality attributes are.

  Almost nobody ships a product where the buttons do not work. What actually
  happens is:

    - The demo works beautifully. Launch day arrives, 5,000 users show up, and
      the site falls over.                                  → SCALABILITY

    - It works, but every page takes 6 seconds and users leave.  → PERFORMANCE

    - It goes down for four hours and nobody notices until a customer calls.
                                                            → OBSERVABILITY

    - A researcher finds that any user can read any other user's data.
                                                            → SECURITY

    - Two years in, every small change takes three weeks and breaks something
      else.                                                 → MAINTAINABILITY

    - It cannot be sold in Europe because it does not meet GDPR.
                                                            → COMPLIANCE

    - The cloud bill is £40,000/month for 200 users.        → COST

  ‼️ Every one of those systems met 100% of its functional requirements.

WHY THEY GET MISSED

  1. THEY ARE INVISIBLE WHEN THINGS ARE SMALL. Everything is fast with 50 rows
     in the database. Every architecture is maintainable in month one.

  2. NOBODY ASKS FOR THEM. A stakeholder says "users should be able to search
     orders". They will never say "and it should stay under 200ms at 1000
     requests per second" — because they assume it, and because it is your
     job to know to ask.

  3. THEY ARE EXPENSIVE TO RETROFIT. Adding a feature later is normal work.
     Making a system 10x more scalable later is often a rewrite. ‼️ This is
     the real reason NFRs belong in the design conversation rather than the
     bug backlog.

  4. THEY HAVE NO OBVIOUS "DONE". A feature is done when it works. "Fast
     enough" has no natural end, which is exactly why it needs a NUMBER.
```

---

## 3. Performance

```text
WHAT IT MEANS: how fast, and how much at once.

THE THREE NUMBERS THAT MATTER

  LATENCY      How long ONE request takes. "The search returns in 200ms."
  THROUGHPUT   How many requests you handle per unit time. "500 orders/second."
  RESOURCE USE How much CPU, memory, bandwidth it costs to do that.

‼️ LATENCY AND THROUGHPUT ARE NOT THE SAME THING, and confusing them is a
   classic interview slip. A motorway analogy:
     LATENCY    = how long YOUR car takes to drive the route
     THROUGHPUT = how many cars per hour the road carries
   Adding lanes raises throughput without making any single journey faster.
```

```text
‼️ PERCENTILES — THE MOST IMPORTANT IDEA IN THIS WHOLE FILE.

   Never state performance as an AVERAGE. Averages hide the users who are
   suffering.

   Imagine 100 requests: 99 take 100ms, one takes 10 seconds.
     Average = 199ms.  Looks great. Nobody is alarmed.
     But one user in a hundred waited TEN SECONDS.

   So use PERCENTILES instead:
     p50 (median)  half of requests are faster than this — the typical user
     p95           95% are faster — the "bad day" user
     p99           99% are faster — the worst 1%
     p99.9         the genuinely unlucky

   ‼️ Why the tail matters more than it sounds: at scale, the tail IS a lot of
      people. 1% of 1,000,000 daily requests is 10,000 slow experiences a day.
      And a single page often makes 20 backend calls — so a p99 of 2s means a
      meaningful share of PAGES contain at least one 2-second call.

   WRITE IT LIKE THIS:
     ✗ "The API should be fast."
     ✗ "Average response time under 500ms."
     ✓ "p95 latency under 300ms and p99 under 800ms for GET /orders,
        measured at the load balancer, at up to 500 requests per second."
```

```text
ROUGH NUMBERS WORTH KNOWING (orders of magnitude, not precise values)

  Memory access                      ~100 nanoseconds
  SSD read                           ~100 microseconds   (1,000x slower)
  Database query (simple, indexed)   ~1 millisecond
  Database query (unindexed scan)    ~100ms - 10s        ‼️ the usual culprit
  Network round trip, same region    ~0.5 - 1ms
  Network round trip, cross-ocean    ~100 - 150ms        ‼️ physics, unfixable
  Reading from Redis                 ~1ms

USER-FACING THRESHOLDS (from decades of UX research)

  < 100ms    feels INSTANT
  < 1s       feels responsive; user keeps their train of thought
  < 3s       noticeable wait; needs a loading indicator
  > 3s       users start abandoning
  > 10s      assume they have left

  ‼️ Under 100ms you get no credit for being faster. This is useful: it tells
     you where to STOP optimising.
```

---

## 4. Scalability

```text
WHAT IT MEANS: can it handle growth — and at what cost?

‼️ SCALABILITY IS NOT PERFORMANCE. A system can be fast AND unscalable:
   lightning quick with 10 users, collapses at 10,000. The question is not
   "how fast is it now" but "what happens when we multiply the load".

THE TWO WAYS TO SCALE

  VERTICAL ("scale up")     Buy a bigger machine. More CPU, more RAM.
    ✓ Simple. No code changes. No distributed-systems problems.
    ✗ There is a ceiling, it gets expensive fast, and it is a single point
      of failure.
    → ‼️ The right first answer more often than people admit. A single large
      server handles far more than beginners assume.

  HORIZONTAL ("scale out")  Add more machines.
    ✓ Effectively unlimited, and more resilient — one machine dying is fine.
    ✗ Requires your app to be STATELESS, plus a load balancer, plus all the
      complexity of coordinating many machines.
    → The answer for large systems, and what interviewers usually want to hear.

‼️ THE KEY REQUIREMENT FOR HORIZONTAL SCALING: STATELESSNESS.
   If a server stores something in its own memory — a session, an uploaded
   file, a cache you rely on — then a user's next request hitting a DIFFERENT
   server breaks. Push that state OUT to Redis, a database, or object storage,
   and any server can serve any request.
   This is the single most common architectural mistake that blocks scaling.
```

```text
HOW TO WRITE IT

  ✗ "The system should be scalable."           ← means nothing
  ✓ "Support 10,000 concurrent users and 2,000 requests/second at launch,
     with a path to 10x that without re-architecting."
  ✓ "Handle 5x normal traffic during a flash sale without manual intervention."
  ✓ "Scale to zero overnight to control cost."

‼️ ALWAYS ASK ABOUT THE SHAPE OF THE LOAD, not just the total:
   - Steady, or spiky? (A ticket site is 100x its baseline for 10 minutes.)
   - Read-heavy or write-heavy? (Read-heavy is much easier — add caching and
     read replicas. Write-heavy is the hard problem.)
   - Growth rate? 10% a year and 10% a week need completely different designs.
```

---

## 5. Availability & Reliability

```text
‼️ These two get used interchangeably and are genuinely different:

  AVAILABILITY  Is it UP right now? What percentage of the time can I use it?
  RELIABILITY   Does it work CORRECTLY when it is up? Does it lose my data?

  A system can be available and unreliable: always responds, sometimes with
  the wrong answer or silently dropping writes. That is often worse than being
  down, because nobody notices.

THE "NINES"

  AVAILABILITY    DOWNTIME PER YEAR      DOWNTIME PER MONTH
  99%    (two 9s)    3.65 days              7.2 hours
  99.9%  (three)     8.77 hours             43.8 minutes
  99.95%             4.38 hours             21.9 minutes
  99.99% (four)      52.6 minutes           4.4 minutes
  99.999% (five)     5.26 minutes           26 seconds

  ‼️ EACH EXTRA NINE ROUGHLY 10x's THE COST AND COMPLEXITY.
     99.9% = a well-run single-region app with good monitoring.
     99.99% = multi-AZ, automated failover, no single points of failure, a
              real on-call rotation.
     99.999% = multi-region active-active, and a serious engineering budget.

  ‼️ THE QUESTION TO ASK: "what does an hour of downtime actually cost us?"
     For an internal admin tool, 99.5% is fine and anything more is waste.
     For a payment processor, 99.99% may be contractual. Let the cost of
     downtime choose the target — not ambition.

  ‼️ ALSO: your availability is CAPPED BY YOUR DEPENDENCIES. If you depend on
     three services that are each 99.9%, your ceiling is roughly
     0.999³ ≈ 99.7% — worse than any one of them. Promising more than your
     dependencies can deliver is a promise you cannot keep.

THE OTHER TWO NUMBERS — for when things DO go wrong

  RPO (Recovery Point Objective)  How much DATA can we afford to lose?
       "At most 5 minutes." → this dictates backup/replication frequency.

  RTO (Recovery Time Objective)   How long can recovery TAKE?
       "Back within 1 hour." → this dictates whether you need a warm standby.

  ‼️ These two are what turn "we have backups" into an actual plan. A nightly
     backup means an RPO of up to 24 hours — is losing a day of orders
     acceptable? Usually the answer is no, and nobody had done the maths.
     And a backup you have never restored is not a backup; it is a hope.
```

---

## 6. Security

```text
WHAT IT MEANS: the system protects data and resists misuse.

THE CLASSIC FRAME — "CIA"

  CONFIDENTIALITY   Only the right people can READ it.
  INTEGRITY         Data cannot be changed without authorisation, or silently
                    corrupted.
  AVAILABILITY      It cannot be trivially knocked offline (yes, this overlaps
                    with §5 — denial of service is a security concern too).

THE PRACTICAL LIST FOR AN NFR DOCUMENT

  AUTHENTICATION    Proving WHO you are. Passwords, MFA, SSO, tokens.
  AUTHORISATION     What you are ALLOWED to do, once identified.
                    ‼️ The one most often under-specified — and the source of
                    the most common real vulnerability (a user reaching
                    another user's data by changing an id in a URL).
  ENCRYPTION        In transit (TLS everywhere) and at rest (disk/database).
  AUDIT             Who did what, when. Required for most compliance regimes.
  DATA RETENTION    How long is data kept, and how is it deleted?
  SECRETS           Credentials never in source control; rotated.
  DEPENDENCIES      Known-vulnerable packages found and patched.

HOW TO WRITE IT

  ✗ "The system should be secure."
  ✓ "All traffic over TLS 1.2+. Passwords hashed with argon2id.
     Users can only access records belonging to their own organisation,
     enforced server-side. All admin actions written to an audit log retained
     for 7 years. Dependency scanning runs on every build."

‼️ THE SINGLE MOST USEFUL SECURITY PRINCIPLE FOR A BEGINNER:
   ENFORCE IT ON THE SERVER. Hiding a button in the UI is not authorisation.
   Anyone can call your API directly. Every rule that matters must be checked
   on the backend, on every request.
```

---

## 7. Maintainability

```text
WHAT IT MEANS: how easily the system can be understood, changed, and fixed.

‼️ THE MOST NEGLECTED NFR, because the cost is invisible at first and
   enormous later. It is also the one YOU personally pay for, every day.

WHAT IT BREAKS DOWN INTO

  UNDERSTANDABILITY  Can a new developer find their way around? How long
                     until they ship their first change safely?
  MODIFIABILITY      Does a small change stay small, or ripple everywhere?
  TESTABILITY        Can you verify a change quickly and automatically?
  DEPLOYABILITY      How long from "merged" to "live"? How risky is it?

HOW TO MAKE IT MEASURABLE — this is the hard part, but these work:

  ✓ "A new engineer can set up the project locally and deploy a trivial change
     to production within their first two days."
  ✓ "The automated test suite runs in under 10 minutes and gates every merge."
  ✓ "Deployments are automated, take under 15 minutes, and can be rolled back
     in under 5."
  ✓ "No module exceeds X; test coverage on the payments module stays above 80%."
  ✓ "Dependencies are updated at least quarterly."

‼️ THE HONEST VERSION OF THIS TRADE-OFF: maintainability is what you sacrifice
   to hit a deadline, and the debt is real. That is sometimes the right call —
   a startup that ships slowly and cleanly can die before it matters. The
   mistake is doing it ACCIDENTALLY and never writing down what you took on.
```

---

## 8. Usability & Accessibility

```text
USABILITY — can people actually use it without help?

  Measurable versions:
    ✓ "A new user can complete checkout without documentation."
    ✓ "Task completion rate above 90% in usability testing."
    ✓ "Support tickets about the booking flow under 5 per week."
    ✓ "Every error message tells the user what to do next."

ACCESSIBILITY — can people with disabilities use it?

  ‼️ Not a nice-to-have. It is a LEGAL REQUIREMENT in many markets (the ADA in
     the US, the European Accessibility Act, the UK Equality Act), and public
     sector contracts usually mandate it outright. It is also around 15% of
     your potential users.

  The standard is WCAG (Web Content Accessibility Guidelines):
    Level A    the minimum
    Level AA   ‼️ THE USUAL TARGET, and what most laws reference
    Level AAA  rarely required in full

  Measurable version:
    ✓ "Meets WCAG 2.2 Level AA. All functionality reachable by keyboard alone.
       Automated axe checks pass in CI with zero violations. Screen reader
       tested on the signup and checkout flows."

  ‼️ THE FOUR PRINCIPLES (POUR), which make the standard easier to remember:
     PERCEIVABLE  Can they sense it? (contrast, alt text, captions)
     OPERABLE     Can they use it? (keyboard, no timing traps)
     UNDERSTANDABLE  Is it clear? (plain language, predictable, good errors)
     ROBUST       Does it work with assistive technology? (valid semantic HTML)

  ‼️ AND THE PRACTICAL SHORTCUT: use correct, semantic HTML — a real <button>,
     a real <label>, real headings — and you get most of this for free.
     Most accessibility failures come from rebuilding native elements out of
     <div>s.
```

---

## 9. Observability

```text
WHAT IT MEANS: can you tell what the system is doing, and why, from outside it?

‼️ THE DISTINCTION WORTH KNOWING:
   MONITORING    = watching for things you ALREADY KNOW to look for.
                   "Alert me if CPU goes above 80%."
   OBSERVABILITY = being able to answer questions you did NOT anticipate.
                   "Why are checkouts failing for Canadian users on Android,
                    but only since Tuesday?"

   You cannot pre-build a dashboard for every question. Observability is
   having enough signal to investigate a NEW problem without deploying code.

THE THREE PILLARS

  LOGS     Discrete events. "Order 123 failed: card declined."
           ‼️ Structured (JSON) and with a correlation id, or you cannot
           follow one request across services.
  METRICS  Numbers over time. Request rate, error rate, latency percentiles.
           Cheap to store, good for dashboards and alerts.
  TRACES   One request's journey across every service, with timing per hop.
           ‼️ The thing that answers "which of these 12 services is slow?"

MEASURABLE VERSIONS

  ✓ "p50/p95/p99 latency and error rate are graphed per endpoint."
  ✓ "Every request carries a correlation id through all services."
  ✓ "On-call is alerted within 2 minutes of the error rate exceeding 1%."
  ✓ "Logs are retained 30 days and searchable within 1 minute of being emitted."

‼️ THE POINT IS MTTR — mean time to recovery. Two teams both have an incident.
   One knows within 60 seconds and fixes it in 10 minutes. The other finds out
   from an angry customer three hours later. Same bug; wildly different
   outcome. Observability is what makes the difference.
```

---

## 10. Compatibility, Compliance & Cost

```text
COMPATIBILITY / PORTABILITY

  ✓ "Supports the latest two versions of Chrome, Safari, Firefox and Edge."
  ✓ "Works on iOS 16+ and Android 10+."
  ✓ "Usable at 320px width."
  ✓ "The v1 API remains supported for 12 months after v2 ships."
  ‼️ Browser and device support is a BUSINESS decision, not a technical one —
     check your actual analytics rather than guessing. Supporting one ancient
     browser can cost more than all your other browser work combined.

COMPLIANCE & LEGAL

  ‼️ These are non-negotiable and they change your ARCHITECTURE, so find out
     early. Discovering a data residency requirement after launch is brutal.

  GDPR (EU)       consent, right to access, right to deletion, breach
                  notification within 72 hours, data minimisation
  CCPA (Calif.)   similar rights for California residents
  HIPAA (US)      health data — encryption, audit trails, signed agreements
  PCI-DSS         card payments — ‼️ usually avoided entirely by never
                  touching card numbers (let Stripe hold them)
  SOC 2           an audited security posture; commonly demanded in B2B sales
  DATA RESIDENCY  "EU customer data must stay in the EU" — this dictates your
                  regions and sometimes your whole deployment topology
  ACCESSIBILITY   see §8

COST

  ‼️ The NFR nobody lists, and the one that shows up in every budget meeting.
  Cloud makes it easy to build something that works and is uneconomic.

  ✓ "Infrastructure cost stays under £0.02 per active user per month."
  ✓ "Non-production environments shut down outside working hours."
  ✓ "No single query costs more than X to run."

  ‼️ Cost is in direct tension with almost every other NFR on this list.
     Multi-region for availability multiplies your bill. That is the trade-off
     conversation, and it belongs with the business, not only with engineering.
```

---

## 11. How to Write a Good NFR

```text
‼️ THE RULE: IF YOU CANNOT MEASURE IT, IT IS NOT A REQUIREMENT — IT IS A WISH.

A usable NFR has four parts:

  1. WHAT       the quality being constrained
  2. NUMBER     a specific, measurable target
  3. CONDITION  under what load / circumstances
  4. HOW MEASURED   where and with what

BAD → GOOD

  ✗ "The site should be fast."
  ✓ "p95 page load under 2.5s on a 4G connection, measured by real user
     monitoring, for the 20 most visited pages."

  ✗ "It should handle a lot of users."
  ✓ "Sustain 5,000 concurrent users and 1,000 req/s with p95 under 300ms,
     verified by a load test before each major release."

  ✗ "The system must be highly available."
  ✓ "99.9% uptime measured monthly, excluding announced maintenance windows,
     with RPO of 5 minutes and RTO of 1 hour."

  ✗ "It should be secure."
  ✓ "All data encrypted in transit (TLS 1.2+) and at rest (AES-256).
     Authorisation enforced server-side on every request. Penetration test
     before launch with no unresolved high findings."

  ✗ "The code should be maintainable."
  ✓ "CI suite runs in under 10 minutes. A new engineer ships a change to
     production within their first week. Deployments roll back in under 5
     minutes."

‼️ A USEFUL SENTENCE TEMPLATE:

   "[The system] shall [do what] within [number + unit]
    under [conditions], measured by [method]."

   "The checkout API shall respond within 300ms at the 95th percentile
    under a sustained load of 500 requests per second,
    measured at the load balancer over any 5-minute window."

‼️ AND ALWAYS ASK: "how would we PROVE this is met?" If nobody can answer,
   the requirement is not finished. That question alone will improve most
   requirements documents more than anything else in this file.
```

---

## 12. The Trade-Offs

```text
‼️ YOU CANNOT MAXIMISE EVERYTHING. Every NFR is paid for in another NFR, or in
   money, or in time. Naming the trade-off explicitly is the senior move — in
   an interview and in real life.

  PERFORMANCE  ↔  COST
    Caching, CDNs, bigger instances, read replicas. All make it faster. All
    cost money.

  AVAILABILITY  ↔  COST & COMPLEXITY
    Each extra nine roughly 10x's both. Multi-region active-active is a
    different engineering organisation, not just a config change.

  SECURITY  ↔  USABILITY
    MFA on every action is very secure and nobody will use your product.
    Short session timeouts protect data and infuriate users.

  CONSISTENCY  ↔  AVAILABILITY  (the CAP theorem, in practice)
    ‼️ When a distributed system's network splits, you must choose:
       refuse to answer (stay CONSISTENT) or answer possibly-stale data
       (stay AVAILABLE). You cannot have both during a partition.
       A bank balance chooses consistency. A social media like count chooses
       availability. Knowing WHICH your feature needs is the real skill.

  SPEED OF DELIVERY  ↔  MAINTAINABILITY
    Shipping fast now often means moving slowly later. Sometimes correct —
    just make it a decision, not an accident.

  SCALABILITY  ↔  SIMPLICITY
    ‼️ Microservices, sharding, and event-driven architecture buy scale and
    charge you complexity. Most systems that adopt them do not need them yet.
    "A boring monolith on one big server" handles far more than people expect,
    and is dramatically easier to operate.

‼️ HOW TO HANDLE THIS WHEN ASKED:
   Do not claim you can have it all. Say which you are optimising for and WHY,
   name what you are giving up, and state what would change your mind.

   "I'd prioritise availability over strong consistency here, because a user
    seeing a slightly stale follower count is harmless, while an outage is
    not. If this were account balances I'd flip that."

   That sentence is worth more than any diagram.
```

---

## 13. Where NFRs Come From

```text
‼️ Nobody hands you these. You have to go and get them — the questions below
   are the job.

  FROM THE BUSINESS
    "How many users at launch? In a year?"
    "What does an hour of downtime cost us?"
    "Which markets are we selling in?"   (→ compliance, data residency)
    "Is there a contractual SLA?"
    "What is the infrastructure budget?"

  FROM USERS AND SUPPORT
    Where do people abandon the flow? What do they complain about?
    Support tickets are a free, honest list of your usability failures.

  FROM YOUR EXISTING DATA
    ‼️ THE BEST SOURCE IF YOU HAVE IT. Current traffic, current p95, current
    error rate, current cost. Requirements grounded in real numbers beat
    invented ones every time. "We're at 200 req/s peak, so let's design for
    1,000" is a defensible target.

  FROM LEGAL AND COMPLIANCE
    Find out EARLY. These are the requirements that can invalidate a design.

  FROM INDUSTRY NORMS
    Users compare you to the best product they have used, not to your
    competitors. Nobody grades a page load on a curve.

‼️ THE FOUR QUESTIONS TO ASK ABOUT ANY NEW FEATURE:
   1. How many people will use this, and how often?
   2. How fast does it need to feel?
   3. What happens if it is wrong, or unavailable?
   4. Who is allowed to see this data?

   Four questions, and you have covered scalability, performance,
   availability, reliability, and security well enough to start designing.
```

---

## 14. How to Test Each One

```text
‼️ An NFR nobody verifies is decoration. Each type has its own method:

  PERFORMANCE     Load testing (k6, Artillery, JMeter). Real user monitoring
                  in production. Lighthouse for frontend.
                  ‼️ Test with REALISTIC data volumes. Everything is fast
                  against 100 rows; the bugs appear at 10 million.

  SCALABILITY     Load test at 2x, 5x, 10x expected load and find where it
                  breaks. ‼️ The goal is to LEARN THE BREAKING POINT, not to
                  pass. A test that passes tells you nothing about the limit.

  AVAILABILITY    Uptime monitoring from outside your network. Chaos
                  engineering — deliberately kill things and watch.
                  ‼️ And actually RESTORE a backup, on a schedule. An untested
                  backup is not a backup.

  SECURITY        Automated dependency scanning in CI. Static analysis (SAST).
                  Penetration testing before launch. Bug bounty once mature.

  MAINTAINABILITY CI runtime. Lead time from commit to production. Change
                  failure rate. ‼️ The DORA metrics are the standard four and
                  worth knowing by name: deployment frequency, lead time for
                  changes, change failure rate, time to restore service.

  USABILITY       Watch five real people attempt the task without help. This
                  is unreasonably effective and almost nobody does it.

  ACCESSIBILITY   Automated axe checks in CI (catches ~30%). Keyboard-only
                  navigation. A real screen reader on your critical flows.

  OBSERVABILITY   ‼️ The test is a GAME DAY: break something in staging and
                  time how long it takes someone to work out what happened
                  using only your dashboards and logs.

  COST            Billing alerts. Cost per transaction tracked over time.
```

---

## 15. NFRs in a System Design Interview

```text
‼️ THIS IS WHERE NFRs EARN YOU THE MOST MARKS, and where most candidates go
   wrong — they start drawing boxes immediately.

   The expected opening is to spend the first 5 minutes ESTABLISHING
   REQUIREMENTS, and the non-functional ones are what determine the design.

THE OPENING SCRIPT

  "Before I design anything, let me clarify the requirements.

   Functionally, I'm assuming users can [X, Y, Z]. Is that the core scope?

   Non-functionally, the things that will drive the design:
     - Scale: how many users, and how many requests per second at peak?
     - Read/write ratio: is this read-heavy?
     - Latency: what does this need to feel like — under 100ms, or is a
       second acceptable?
     - Availability: what's the cost of downtime? Are we aiming for 99.9%
       or higher?
     - Consistency: if a user writes something, must everyone see it
       immediately, or is a few seconds of staleness fine?
     - Data: how much are we storing, and for how long?"

  ‼️ THE INTERVIEWER USUALLY MAKES THE NUMBERS UP ON THE SPOT. The point is
     not the numbers — it is that you knew to ask. Asking shows you understand
     that the same feature has completely different designs at 100 users and
     100 million.

THEN DO THE ARITHMETIC OUT LOUD

  "10 million daily active users, 10 requests each = 100M requests/day.
   That's about 1,200/second average. Peak is usually 2-3x average, so let's
   design for 3,000/second.
   If it's 100:1 read-to-write, that's 30 writes/second — very manageable —
   and 3,000 reads/second, which says caching and read replicas."

  ‼️ Notice how the NUMBERS PRODUCED THE ARCHITECTURE. That is the entire
     point of the exercise, and it is what separates a memorised answer from
     a reasoned one.

THE SENTENCES THAT SIGNAL SENIORITY

  "That depends on whether we need strong consistency here — for a like
   count I'd accept eventual consistency and take the availability."

  "I'm optimising for read latency and accepting more complex writes, because
   the read:write ratio is 100:1."

  "This is a single point of failure. If we need four nines, we'd need to
   address it — at 99.9% I'd accept it and save the complexity."

  "I'd start with a monolith and one database. At this scale it's plenty, and
   I'd rather split it later along real boundaries than guess now."
```

---

## 16. A Checklist You Can Reuse

```text
‼️ Run through this for any new project or significant feature. Most lines
   will be "not applicable" or "defaults are fine" — the value is in noticing
   the two or three that are NOT.

PERFORMANCE
  □ Target p95 / p99 latency for key operations?
  □ Expected requests per second — average and peak?
  □ Acceptable page load time, on what connection?

SCALABILITY
  □ Users at launch? In 12 months?
  □ Read-heavy or write-heavy?
  □ Traffic steady or spiky?
  □ Is the app stateless (can we add servers)?

AVAILABILITY & RELIABILITY
  □ Uptime target, and what downtime costs?
  □ RPO — how much data can we lose?
  □ RTO — how fast must we recover?
  □ What happens when each dependency fails?
  □ Have we restored from a backup and timed it?

SECURITY
  □ Who can see what — enforced server-side?
  □ Encryption in transit and at rest?
  □ How are secrets stored and rotated?
  □ Is an audit trail required?
  □ Dependency scanning in CI?

MAINTAINABILITY
  □ How long does CI take?
  □ Can we roll back, and how fast?
  □ How long until a new engineer ships something?

USABILITY & ACCESSIBILITY
  □ WCAG level required?
  □ Keyboard-only navigation works?
  □ Do error messages say what to do next?

OBSERVABILITY
  □ How do we know it broke, before a customer tells us?
  □ Can we trace one request end to end?
  □ Who gets alerted, and how fast?

COMPATIBILITY & COMPLIANCE
  □ Which browsers and devices?
  □ GDPR / HIPAA / PCI / SOC 2 in scope?
  □ Data residency constraints?
  □ API versioning and deprecation policy?

COST
  □ Budget, and cost per user?
  □ What is the most expensive part, and is it worth it?
```

---

## 17. Common Mistakes

```text
‼️ 1. Writing NFRs with no numbers.
   "Fast", "scalable", "secure", "reliable" are not requirements. Nobody can
   build to them, test them, or tell you when they are met.

‼️ 2. Using averages instead of percentiles.
   An average hides the users having the worst time. Use p95 and p99.

‼️ 3. Leaving NFRs until the end.
   They are architectural. Retrofitting scalability or security is often a
   rewrite, whereas designing for them costs comparatively little up front.

‼️ 4. Over-engineering for scale you do not have.
   ‼️ The opposite failure, and just as common. Building for a million users
   when you have fifty wastes months and adds complexity that slows you down.
   Design so you CAN scale; do not build it all now.

‼️ 5. Copying someone else's numbers.
   "Netflix does it this way" — Netflix has different constraints, different
   scale, and thousands of engineers. Derive your targets from YOUR situation.

‼️ 6. Treating every NFR as equally important.
   They conflict. Rank them. An internal admin tool and a payment system have
   almost opposite priorities.

‼️ 7. Not verifying them.
   An untested performance target is a guess. An untested backup is a hope.

‼️ 8. Forgetting your dependencies cap your availability.
   You cannot be more available than the services you rely on.

‼️ 9. Treating accessibility as optional.
   It is a legal requirement in most markets and roughly 15% of your users.

‼️ 10. Never revisiting them.
   Requirements written at launch are wrong two years later. Traffic grew,
   the business changed, users moved to mobile. Review them periodically.
```

---

## Related Files

- [SYSTEM-DESIGN-DEEP.md](../1-high-priority/SYSTEM-DESIGN-DEEP.md) — applying these in full design exercises
- [SYSTEM-DESIGN-SCENARIOS.md](../1-high-priority/SYSTEM-DESIGN-SCENARIOS.md) — worked examples with real numbers
- [TESTING-BASICS.md](TESTING-BASICS.md) — verifying requirements, including load testing
- [PERFORMANCE-DEEP.md](PERFORMANCE-DEEP.md) — meeting performance targets in practice
- [SECURITY-HIGH-DEEP.md](SECURITY-HIGH-DEEP.md) — the security attributes in depth
- [OBSERVABILITY-DEEP.md](../3-low-priority/OBSERVABILITY-DEEP.md) — logs, metrics, traces
- [ACCESSIBILITY-MED-DEEP.md](../3-low-priority/ACCESSIBILITY-MED-DEEP.md) — WCAG in practice
- [JIRA-CONFLUENCE-AGILE-DEEP.md](../1-high-priority/JIRA-CONFLUENCE-AGILE-DEEP.md) — where requirements live day to day
