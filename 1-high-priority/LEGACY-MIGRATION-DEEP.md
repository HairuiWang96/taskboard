# Legacy Systems & Migration Strategy

**Priority: HIGH**

> How to change systems that cannot stop working: the strangler fig pattern, branch by
> abstraction, expand-contract schema changes, zero-downtime data migration, decomposing a
> monolith, and the organisational side that sinks most migration projects.
>
> Executing a large migration without an outage is the archetypal staff-level project.

---

## Table of Contents

1. [Legacy Is the Normal State](#1-legacy-is-the-normal-state)
2. [Before You Migrate — Understand It](#2-before-you-migrate--understand-it)
3. [Choosing the Strategy](#3-choosing-the-strategy)
4. [The Strangler Fig Pattern](#4-the-strangler-fig-pattern)
5. [Branch by Abstraction](#5-branch-by-abstraction)
6. [Expand-Contract Schema Changes](#6-expand-contract-schema-changes)
7. [Zero-Downtime Data Migration](#7-zero-downtime-data-migration)
8. [Decomposing a Monolith](#8-decomposing-a-monolith)
9. [Migration Hygiene](#9-migration-hygiene)
10. [The Organisational Half](#10-the-organisational-half)
11. [Why Migrations Fail](#11-why-migrations-fail)
12. [A Migration Checklist](#12-a-migration-checklist)

---

## 1. Legacy Is the Normal State

```text
‼️ REFRAME THE WORD. "Legacy" does not mean bad. It means:

   CODE THAT IS MAKING MONEY AND THAT YOU ARE AFRAID TO CHANGE.

   The second half is the problem, not the first. A ten-year-old system that
   is well-tested and well-understood is not legacy in any meaningful sense.
   A two-year-old system nobody dares touch is.

‼️ MICHAEL FEATHERS' DEFINITION, which is the sharpest one:
   "Legacy code is code without tests."
   Because without tests you cannot change it safely, and code you cannot
   change safely calcifies.

WHY THIS MATTERS FOR YOUR CAREER
  Greenfield projects are the minority of engineering work. Most value is
  created by changing systems that already exist, already have users, and
  cannot be switched off.
  ‼️ The ability to change a running system safely is one of the most valuable
     and least-taught skills in the industry. It is also the most common form
     of high-impact staff-level work, because it is hard, unglamorous, and
     requires exactly the judgement that seniority buys.

THE RESPECT PRINCIPLE

  ‼️ THE UGLY CODE IS USUALLY UGLY FOR A REASON. That weird conditional was a
     production incident. That duplicated logic handles a customer with a
     bespoke contract. The "obviously wrong" retry loop works around a
     supplier's flaky API.

     CHESTERTON'S FENCE: do not remove a fence until you know why it was put
     there. In legacy code, half the fences are load-bearing.

     ‼️ THE PRACTICAL RULE: when you find something baffling, assume there was
        a reason and go looking for it — git blame, the ticket, the person who
        wrote it. Sometimes there genuinely was no reason. But assuming that
        first is how migrations break production.
```

---

## 2. Before You Migrate — Understand It

```text
‼️ THE MOST COMMONLY SKIPPED STEP, AND THE MOST EXPENSIVE TO SKIP.
   You cannot replace behaviour you have not documented.

  1. WHAT DOES IT ACTUALLY DO?
     Not what the docs say. What it does.
     - Read the code, but do not only read the code.
     - ‼️ INSTRUMENT IT. Log which endpoints are actually called, which code
       paths execute, which config flags are actually set. You will find that
       40% of it is dead, and that two things you assumed were unused are
       called by a nightly job you did not know about.
     - Find the integrations. Who calls this? What does it call? ‼️ There is
       always at least one consumer nobody remembers — a spreadsheet macro, a
       partner's nightly pull, a report the finance team runs.

  2. WHAT IS ITS ACTUAL BEHAVIOUR AT THE EDGES?
     The edge cases ARE the system. Rounding rules, timezone handling, what
     happens with an empty list, which errors are swallowed.
     ‼️ CHARACTERISATION TESTS: write tests that capture what it does NOW,
        including behaviour that looks wrong. You are not testing correctness;
        you are pinning down current behaviour so you can detect change.
        This is the single most valuable preparatory activity.

  3. WHO DEPENDS ON THE CURRENT BEHAVIOUR, INCLUDING THE BUGS?
     ‼️ HYRUM'S LAW: "With a sufficient number of users, every observable
        behaviour of your system will be depended on by somebody."
        Someone is parsing your error message. Someone relies on the accidental
        ordering of an unordered list. Fixing a bug can break a customer.

  4. WHAT ARE THE ACTUAL NUMBERS?
     Request volume, data size, peak patterns, current latency, current error
     rate. ‼️ You need a baseline, or you cannot tell whether the new system
     is better, and you cannot tell when you have broken something.

  5. WHAT IS IT COSTING YOU NOW?
     Incidents per quarter, hours per change, cloud spend, support burden.
     ‼️ This is the business case (§10), and it must be gathered before you
        start, not invented later.
```

---

## 3. Choosing the Strategy

```text
‼️ FOUR OPTIONS. Most teams consider only the last one.

  1. LEAVE IT
     When: stable, rarely changed, not blocking anything.
     ‼️ Genuinely the right answer more often than engineers like. A system
        that works and is not touched costs nearly nothing. "It is old" is
        not a business problem.

  2. IMPROVE IN PLACE
     When: the structure is salvageable, and you touch it regularly.
     How: add characterisation tests, then refactor incrementally as you pass
     through. Boy-scout rule.
     ‼️ The default for most "this code is bad" complaints.

  3. STRANGLE IT (§4)
     When: it must be replaced but cannot stop working — which is almost
     always the case for anything important.
     ‼️ THE DEFAULT ANSWER for real replacement work. Incremental, reversible
        at every step, delivers value continuously.

  4. BIG-BANG REWRITE
     When: genuinely rarely. The system is small, or the platform is dead and
     unsupportable, and you can cut over in one step with a tested rollback.
     ‼️ See ENGINEERING-FAILURES-DEEP §5. The failure rate is high and the
        failure mode is severe: a year spent, nothing shipped, both systems
        now needing maintenance.

THE QUESTIONS THAT PICK THE STRATEGY

  □ Can the system be switched off, even briefly? (Usually no.)
  □ Can we run old and new side by side? (If yes → strangle.)
  □ Is there a clean seam to cut along — an API, a queue, a URL prefix?
  □ ‼️ How long until the FIRST piece of value ships? If the answer is more
    than a few weeks, restructure the plan. Long dark periods are where
    migrations die.
  □ ‼️ If we stop halfway, are we better off than when we started? A good
    migration plan answers YES at every stage. If the answer is "no, we'd be
    worse off", you have a gamble, not a plan.
```

---

## 4. The Strangler Fig Pattern

```text
‼️ NAMED AFTER THE TREE: a strangler fig grows around a host tree, gradually
   taking over, until eventually the host dies and rots away — and the fig
   stands on its own in the same shape.

   THE IDEA: put a routing layer in front of the old system. Move one piece of
   functionality at a time to the new implementation, redirecting traffic as
   you go. When nothing routes to the old system, delete it.

THE SHAPE

  STAGE 0 — everything goes to the old system
    Client ──► [ Old System ]

  STAGE 1 — insert the facade, still routing everything old
    ‼️ THIS IS THE CRITICAL FIRST STEP AND IT SHIPS NO FEATURES. Do it, verify
       nothing changed, and you have created the seam that makes everything
       else possible and reversible.
    Client ──► [ Facade ] ──► [ Old System ]

  STAGE 2 — route one endpoint to the new implementation
    Client ──► [ Facade ] ──┬──► [ Old System ]   (everything else)
                            └──► [ New: /users ]

  STAGE 3 — keep going, piece by piece
    Client ──► [ Facade ] ──┬──► [ Old System ]   (shrinking)
                            ├──► [ New: /users ]
                            ├──► [ New: /orders ]
                            └──► [ New: /billing ]

  STAGE 4 — nothing routes to old. DELETE IT.
    Client ──► [ Facade ] ──► [ New System ]

‼️ WHY IT WORKS
  - Value ships continuously. Each migrated piece is a real improvement.
  - ‼️ EVERY STEP IS REVERSIBLE. A routing change is a config flip. If the new
    /users endpoint misbehaves, you route back in seconds.
  - Risk is spread across many small changes instead of concentrated in one
    enormous one.
  - The project survives changing priorities: pause after any piece and you
    still have all the value delivered so far.

WHERE THE FACADE LIVES — pick the cheapest seam you have
  - A reverse proxy or API gateway (nginx, Envoy, your CDN) routing by path
  - A feature flag inside the application choosing implementation per request
  - A message consumer that decides which handler processes an event
  - For a frontend: a router serving some routes from the new app
    (or a micro-frontend shell)

‼️ THE HARD PARTS PEOPLE UNDERESTIMATE

  1. SHARED DATA. The old and new systems usually need the same data. ‼️ This
     is the real difficulty, not the routing. Options: both read the same
     database initially (simplest, and usually right), or dual-write, or
     sync via events. See §7.

  2. SHARED SESSION AND AUTH. A user must stay logged in across both. Plan
     this before stage 2, not during.

  3. ‼️ THE MIGRATION MUST FINISH. The dangerous outcome is stopping at 70%
     and living with TWO systems forever — double the maintenance, double the
     on-call, and every engineer must know both. This is extremely common.
     See §10.

  4. DELETING THE OLD SYSTEM IS PART OF THE PROJECT. ‼️ Put it in the plan
     explicitly with an owner and a date, or it will not happen. Verify with
     logging that nothing is calling it before you delete — then delete it
     properly, not just stop deploying it.
```

---

## 5. Branch by Abstraction

```text
‼️ THE TECHNIQUE FOR REPLACING SOMETHING DEEP INSIDE A SYSTEM, where there is
   no natural seam to route around — a data access layer, a payment
   integration, a core calculation.

   Strangler fig works at the edges. Branch by abstraction works in the middle.

THE STEPS

  1. CREATE AN ABSTRACTION over the thing you want to replace.
     An interface capturing what callers actually need.

  2. MIGRATE ALL CALLERS to use the abstraction, still backed by the old
     implementation.
     ‼️ Behaviour is unchanged. This ships safely and is valuable on its own —
        you now have a seam where there was none.

  3. BUILD THE NEW IMPLEMENTATION behind the same abstraction.

  4. SWITCH, gradually, behind a flag.

  5. DELETE the old implementation and, usually, the abstraction too.
```

```typescript
// Step 1-2: the abstraction, backed by the old implementation
interface PaymentGateway {
  charge(amountCents: number, token: string): Promise<ChargeResult>;
}

// Step 4: switch gradually — and verify before you trust it
class SwitchablePaymentGateway implements PaymentGateway {
  constructor(
    private readonly legacy: LegacyGateway,
    private readonly modern: ModernGateway,
    private readonly flags: FeatureFlags,
  ) {}

  async charge(amountCents: number, token: string): Promise<ChargeResult> {
    // ‼️ PERCENTAGE ROLLOUT, not a binary switch. 1% → 5% → 25% → 100%, with
    // time to observe at each step. The flag is your rollback: flipping it
    // back is instant and needs no deploy.
    if (this.flags.enabled('modern-payments', { percentage: 5 })) {
      return this.modern.charge(amountCents, token);
    }
    return this.legacy.charge(amountCents, token);
  }
}
```

```typescript
// ‼️ THE HIGH-CONFIDENCE VARIANT: run BOTH and compare. Essential for anything
// where being wrong is expensive — pricing, tax, permissions, payments.
class ComparingCalculator implements PriceCalculator {
  async calculate(order: Order): Promise<Price> {
    // The OLD implementation is still the source of truth. Its result is what
    // the customer gets. This is what makes the technique safe.
    const legacyResult = await this.legacy.calculate(order);

    // Run the new one in the background. ‼️ Never let it affect the response:
    // catch everything, and do not await it in the critical path if it is slow.
    this.runComparison(order, legacyResult).catch(() => {
      /* comparison must never break the request */
    });

    return legacyResult;
  }

  private async runComparison(order: Order, expected: Price) {
    const actual = await this.modern.calculate(order);
    if (!pricesEqual(expected, actual)) {
      // ‼️ Log the INPUT alongside both outputs, or you cannot reproduce the
      // discrepancy. These logs are the entire value of the exercise.
      this.logger.warn('price mismatch', {
        orderId: order.id, input: order, expected, actual,
      });
      this.metrics.increment('price_migration.mismatch');
    } else {
      this.metrics.increment('price_migration.match');
    }
  }
}
// ‼️ Run this in production for days or weeks. When the mismatch rate is zero
// across real traffic — including month-end, promotions, and whatever else
// your business does that is unusual — you can switch with real confidence.
// This is how you migrate something you cannot afford to get wrong.
```

---

## 6. Expand-Contract Schema Changes

```text
‼️ ALSO CALLED "PARALLEL CHANGE". THE CORE TECHNIQUE FOR CHANGING A DATABASE
   SCHEMA WITHOUT DOWNTIME, and the thing most engineers get wrong.

THE PROBLEM
  During a deploy, OLD CODE AND NEW CODE RUN AT THE SAME TIME. Rolling deploys,
  multiple replicas, canaries — for minutes or hours, both versions are live
  against the same database.

  ‼️ So any schema change must be compatible with BOTH the version before and
     the version after. Renaming a column in one migration breaks every
     instance still running the old code.

THE THREE PHASES

  EXPAND    Add the new thing. Do not remove anything.
            ‼️ Backwards compatible — old code is unaffected.
  MIGRATE   Write to both. Backfill existing rows. Move reads over.
  CONTRACT  Once nothing uses the old thing, remove it.

‼️ EACH PHASE IS A SEPARATE DEPLOY. Usually separated by days or weeks. The
   contract phase is frequently forgotten — track it.
```

```sql
-- ── WORKED EXAMPLE: rename `name` to `full_name` with zero downtime ──────

-- ✗ THE NAIVE VERSION — DO NOT DO THIS
ALTER TABLE users RENAME COLUMN name TO full_name;
-- Every running instance of the old code immediately errors: "column
-- users.name does not exist". You have an outage for the length of the deploy,
-- and you cannot roll back without another migration.

-- ── PHASE 1: EXPAND (deploy 1) ───────────────────────────────────────────
-- Add the new column, nullable. Old code ignores it entirely.
ALTER TABLE users ADD COLUMN full_name varchar(255);

-- ‼️ Nullable and no default: on Postgres this is a fast metadata-only change
-- that does not rewrite the table or hold a long lock. Adding NOT NULL with a
-- default can rewrite the whole table — on a large table that is a long
-- ACCESS EXCLUSIVE lock, which IS an outage.

-- ── PHASE 2a: DUAL WRITE (deploy 2) ──────────────────────────────────────
-- Application code now writes BOTH columns on every insert and update.
-- Reads still come from the old column. Nothing user-visible changes.

-- ── PHASE 2b: BACKFILL (a script, not a migration) ───────────────────────
-- ‼️ IN BATCHES. A single UPDATE over 50 million rows takes a huge lock, bloats
-- the WAL, and can take the database down. Batch it, commit each batch, and
-- sleep between them so replication can keep up.
UPDATE users SET full_name = name
WHERE full_name IS NULL AND id IN (
  SELECT id FROM users WHERE full_name IS NULL LIMIT 5000
);
-- Loop until zero rows affected. Monitor replication lag while it runs.

-- ── PHASE 2c: VERIFY ─────────────────────────────────────────────────────
-- ‼️ Do not skip this. Prove the data is right before you depend on it.
SELECT count(*) FROM users WHERE full_name IS DISTINCT FROM name;
-- Must be 0.

-- ── PHASE 2d: SWITCH READS (deploy 3) ────────────────────────────────────
-- Application reads full_name. Still writes both.
-- ‼️ Still fully reversible: roll back to deploy 2 and the old column is
--    current, because you never stopped writing it.

-- ── PHASE 3: CONTRACT (deploy 4, then a migration) ───────────────────────
-- Stop writing the old column. Wait — days, ideally. Confirm nothing reads it
-- (log any access, or check query statistics).
ALTER TABLE users DROP COLUMN name;
-- ‼️ Only now, and only once you are certain you will not roll back past
--    deploy 3.
```

```text
‼️ THE SAME PATTERN APPLIES TO EVERY BREAKING CHANGE:

  SPLITTING A COLUMN   add both new columns → dual write → backfill → switch
                       reads → drop old
  CHANGING A TYPE      add new column of new type → dual write with conversion
                       → backfill → switch → drop
  ADDING NOT NULL      add nullable → backfill → add constraint NOT VALID →
                       VALIDATE CONSTRAINT (‼️ the two-step avoids a long lock)
  ADDING AN INDEX      ‼️ CREATE INDEX CONCURRENTLY — a normal CREATE INDEX
                       locks writes for the duration. CONCURRENTLY cannot run
                       inside a transaction, so it needs its own migration
                       with transactions disabled.
  REMOVING A COLUMN    stop writing → wait → verify nothing reads → drop
  RENAMING AN API FIELD  return both fields → tell consumers → wait for the
                       deprecation window → remove the old one

‼️ THE GENERAL RULE: NEVER MAKE A CHANGE THAT IS INCOMPATIBLE WITH THE
   CURRENTLY-DEPLOYED CODE. Every migration should be safe to roll back.
```

---

## 7. Zero-Downtime Data Migration

```text
‼️ MOVING DATA BETWEEN STORES — a database upgrade, a new database engine, a
   new schema, a different vendor. The pattern is consistent.

THE SEVEN STAGES

  1. SET UP THE DESTINATION and replicate the schema.

  2. DUAL WRITE
     Write to both old and new on every change. ‼️ THE OLD STORE REMAINS THE
     SOURCE OF TRUTH. Reads still come from it.
     ‼️ THE HARD QUESTION: what if the new write fails? Options:
       - Log and continue (accept drift, fix in reconciliation) — usually right
         during migration, because a failing NEW store must not break
         production
       - Fail the request (safe but couples your availability to an unproven
         system — do not do this early)
     Whichever you choose, ‼️ you now need reconciliation (step 5).

  3. BACKFILL HISTORICAL DATA
     In batches, throttled, resumable. ‼️ It must be RESUMABLE — a multi-day
     backfill will be interrupted. Track progress durably (a cursor table),
     and make each batch idempotent so re-running is safe.

  4. VERIFY
     Compare row counts, then compare content — checksums, or sampled
     row-by-row comparison. ‼️ Automate it and run it repeatedly.

  5. RECONCILE CONTINUOUSLY
     A job that finds and fixes divergence between the stores while dual
     writing continues. ‼️ Divergence WILL happen — failed writes, race
     conditions, bugs in the mapping. Assume it and detect it rather than
     hoping.

  6. SHADOW READS
     Read from the new store in parallel, compare against the old, but SERVE
     the old result. Exactly the comparison technique from §5.
     ‼️ This is your real correctness evidence, and it costs you nothing but
        compute.

  7. CUT OVER, GRADUALLY
     1% of reads → 10% → 50% → 100%, with a flag and time to observe.
     Then stop dual writing. ‼️ Keep the old store READABLE for a while after —
     it is your rollback, and it is cheap insurance.

‼️ THE ROLLBACK PLAN AT EVERY STAGE
   Before cutover: flip the read flag back. Trivial.
   After cutover, still dual writing: flip back, old store is current.
   After dual writing stops: ‼️ THIS IS THE ONE-WAY DOOR. The old store is now
   stale and rolling back means losing writes. Be certain before this step,
   and make it a deliberate, announced moment — not something that happens in
   a routine deploy.
```

```text
‼️ THINGS THAT BITE DURING DATA MIGRATION

  - ‼️ IDs. If the new store generates its own, you need a mapping table, and
    every foreign key and every external reference must be translated.
    Preserving the original ids is almost always worth the effort.
  - TIMEZONES AND TIMESTAMPS. Naive timestamps migrated into a
    timezone-aware column will be subtly wrong, often by hours, and nobody
    notices for months.
  - ENCODING. Latin-1 to UTF-8 migrations mangle names with accents. Test with
    real, messy data.
  - NULL vs EMPTY STRING vs MISSING. Three different things that the old
    system may have used interchangeably.
  - ‼️ DATA THAT VIOLATES YOUR NEW CONSTRAINTS. The old table had no foreign
    key, so it has orphan rows. It had no NOT NULL, so it has nulls. You will
    discover this during backfill. Decide the policy in advance: fix, drop,
    or quarantine.
  - VOLUME. A backfill that takes 40 hours needs to run while the business
    operates. Throttle it, watch replication lag, and be able to pause it.
  - ‼️ THINGS THAT READ THE DATABASE DIRECTLY. The analytics job, the BI tool,
    the finance spreadsheet, the read replica someone connected to. They will
    not be migrated by your application deploy. Find them in step §2.1.
```

---

## 8. Decomposing a Monolith

```text
‼️ FIRST: BE SURE YOU SHOULD. See TECHNICAL-DECISION-MAKING-DEEP §13 and
   ENGINEERING-FAILURES-DEEP §5. A modular monolith is a legitimate
   destination, and often the better one.

   Extract a service when there is a SPECIFIC reason:
     - It needs to scale independently (very different resource profile)
     - A separate team needs to deploy independently
     - It has genuinely different availability or compliance requirements
     - It needs a different technology for a real reason
   ‼️ "It would be cleaner" is not on that list.

FINDING THE SEAM — the whole difficulty is here

  Look for BOUNDED CONTEXTS: places where the language changes. "Order" means
  something different to fulfilment than to billing. That boundary is real.

  ‼️ PRACTICAL SIGNALS OF A GOOD SEAM:
    - Few database tables shared with the rest of the system
    - Communication in one direction, not both
    - A team already owns it informally
    - It changes for different reasons and on a different cadence
    - You can describe its interface in a handful of operations

  ‼️ SIGNALS YOU ARE ABOUT TO CUT IN THE WRONG PLACE:
    - The two sides need the same transaction to stay correct
    - Every request to one requires several calls to the other (chatty)
    - They share a core table that both write to
    - You cannot explain the boundary without saying "and also"

THE EXTRACTION SEQUENCE — inside out, not outside in

  1. ‼️ MODULARISE IN PLACE FIRST. Move the code into a clear module inside the
     monolith with an explicit interface. Enforce the boundary — package
     structure, lint rules, whatever your language offers.
     ‼️ THIS IS THE HIGH-VALUE STEP AND IT IS OFTEN ENOUGH. You get most of the
        clarity benefit with none of the network. And if the boundary turns
        out to be wrong, moving it back is a refactor, not a project.

  2. SEPARATE THE DATA. Stop other modules reading these tables directly; make
     them go through the module's interface. ‼️ Usually the hardest part, and
     the step that reveals whether your boundary was real.

  3. MAKE THE INTERFACE REMOTE-READY. Async, coarse-grained, tolerant of
     failure — as if it were already a network call.

  4. EXTRACT THE SERVICE. Now it is mostly deployment work, because the
     boundary already exists.

  5. SPLIT THE DATABASE, if appropriate. ‼️ Often last, and sometimes never.
     Two services sharing one database is an anti-pattern in theory and a
     pragmatic intermediate state in practice.

‼️ WHAT YOU INHERIT THE MOMENT IT BECOMES A NETWORK CALL
   A function call that could not fail now can: timeouts, retries, partial
   failure, ordering, duplicate delivery. A transaction that spanned both
   sides no longer can — you need sagas or eventual consistency. Local
   debugging becomes distributed tracing.
   ‼️ THIS IS THE PRICE. It is worth paying for a real reason and a terrible
      trade for an aesthetic one.
```

---

## 9. Migration Hygiene

```text
‼️ THE PRACTICES THAT SEPARATE A MIGRATION THAT LANDS FROM ONE THAT DRIFTS.

  1. MEASURE BEFORE AND DURING
     ‼️ Dashboard the migration itself: percentage migrated, mismatch rate,
        error rate old vs new, latency old vs new. A migration you cannot see
        the progress of will stall invisibly and nobody will notice for a month.

  2. EVERY STEP REVERSIBLE, AND TESTED
     ‼️ Do not just have a rollback plan — EXERCISE it. Roll back in staging.
        Roll back once in production deliberately, early, while stakes are low.
        An untested rollback is not a rollback.

  3. FLAGS, NOT DEPLOYS, FOR THE SWITCH
     Flipping a flag is seconds and needs no pipeline. A rollback deploy is
     ten minutes on a good day and requires the pipeline to be working —
     which, during an incident, it may not be.

  4. GRADUAL ROLLOUT ALWAYS
     1% → 5% → 25% → 50% → 100%, with observation time between. See
     ENGINEERING-FAILURES-DEEP §3 (Cloudflare) for why this is not optional.
     ‼️ Roll out by a STABLE key (user id hash) so a given user gets consistent
        behaviour rather than flipping between implementations.

  5. NO DEPLOYS DURING A CUTOVER WINDOW
     Freeze unrelated changes during the risky step, so that if something
     breaks you know what caused it.

  6. ‼️ DELETE THE OLD THING, ON A DATE, WITH AN OWNER
     The most-skipped step. Verify nothing calls it — log access for a few
     weeks first — then remove the code, the config, the infrastructure, and
     the alerts. ‼️ A migration is not finished until the old system is gone.
     Until then you are paying for both.

  7. KEEP A DECISION LOG
     Migrations run for months and people forget why. An ADR for the big
     calls, and a running log for the small ones.

  8. WRITE THE RUNBOOK BEFORE THE CUTOVER
     Exact commands, in order, with expected output and the abort criteria.
     ‼️ Agree the ABORT CRITERIA IN ADVANCE, in writing: "if error rate exceeds
        0.5% we roll back". Deciding this mid-incident, under pressure, with
        sunk cost pulling at you, goes badly.
```

---

## 10. The Organisational Half

```text
‼️ MOST MIGRATIONS FAIL FOR NON-TECHNICAL REASONS. The techniques above are
   the easy part.

GETTING IT FUNDED

  ‼️ NOBODY WANTS TO PAY FOR A MIGRATION. From the business's view you are
     spending months to end up with a system that does exactly what the old
     one did. That is a genuinely unattractive proposition, and dismissing it
     as "they don't understand engineering" is how you lose the argument.

  SO TRANSLATE IT (see TECHNICAL-DECISION-MAKING-DEEP §10):
    ✗ "The architecture is a mess and we need to modernise."
    ✓ "Changes to billing take 3 weeks instead of 3 days, we've had 6
       billing incidents this year, and we can't support the enterprise
       contract terms sales is quoting. This gets us to 3 days and removes
       the top incident source."

  ‼️ AND THE STRONGEST FRAMING: ATTACH IT TO SOMETHING THEY ALREADY WANT.
     "The new payment provider integration needs this refactor anyway, so
     we'll do it as part of that." A migration that delivers a feature is far
     easier to fund than a migration that delivers a migration.

  ‼️ OFFER TIERS, NOT AN ULTIMATUM. Minimal / recommended / full, with costs.

KEEPING IT ALIVE

  ‼️ THE 70% PROBLEM — THE CHARACTERISTIC WAY MIGRATIONS DIE:
     The urgent, painful parts get migrated. The remaining 30% is awkward,
     low-value, and owned by nobody. Priorities shift. The migration is
     "basically done" for three years, and the organisation maintains TWO
     systems, trains every new hire on both, and pays for both.

  HOW TO AVOID IT:
    - ‼️ Plan the ENDING from the start, with the deletion as a scheduled,
      owned deliverable — not an implied cleanup.
    - Make the remaining work visible: a burn-down chart of endpoints or
      tables remaining, somewhere leadership sees it.
    - ‼️ Make the old system UNATTRACTIVE to use: block new features in it,
      make its deprecation warnings loud, remove it from the docs. If adding
      to the old system is easy, people will keep doing it and the finish line
      will keep receding.
    - Set a public date for shutdown and hold it.
    - Keep a named owner for the whole migration, not per-piece.

  ‼️ AND: DO NOT ALLOW NEW FEATURES IN THE OLD SYSTEM. This is the single most
     important policy. Every feature added to the system you are replacing is
     a feature you must also build in the new one — a moving target, which is
     exactly what killed the rewrites in ENGINEERING-FAILURES-DEEP §5.

MANAGING THE PEOPLE

  - Migration work is unglamorous. ‼️ Recognise it explicitly, or your best
    engineers will quietly rotate off it onto feature work.
  - Rotate people rather than assigning one person for a year.
  - Celebrate milestones publicly — "billing is fully migrated" deserves the
    same visibility as a feature launch.
  - ‼️ The people who built the old system may feel criticised. Involve them:
    they hold the knowledge you need in §2, and their support is worth more
    than their absence.
```

---

## 11. Why Migrations Fail

```text
‼️ 1. NO INCREMENTAL VALUE
   Twelve months of work before anything ships. Priorities change at month
   eight — they always do — and you have nothing. ‼️ Structure so every few
   weeks delivers something real.

‼️ 2. THE OLD SYSTEM KEEPS MOVING
   Features are still being added to what you are replacing. You are chasing
   a target that moves as fast as you do. Freeze it.

‼️ 3. FEATURE PARITY AS THE GOAL
   ‼️ "It must do everything the old one does" is usually wrong. Instrument it
   (§2) and you will find a large share is unused. Migrating dead
   functionality is pure waste — and the parity requirement is what makes
   migrations take three times the estimate.

‼️ 4. NOT UNDERSTANDING THE OLD SYSTEM
   Skipping §2. You discover the undocumented behaviour when a customer
   reports it broken.

‼️ 5. NO ROLLBACK
   A cutover with no way back means the decision to proceed is made under
   maximum pressure with no good options.

‼️ 6. BIG BANG
   All at once. See Cloudflare, see Netscape.

‼️ 7. UNDERESTIMATING THE DATA
   The code is the easy part. ‼️ The data — its volume, its messiness, its
   undocumented constraints, its hidden consumers — is where the time goes.

‼️ 8. STOPPING AT 70%
   See §10. The most common ending.

‼️ 9. NO OWNER
   A migration split across five teams with no single accountable person will
   proceed at the pace of the least motivated team.

‼️ 10. REBUILDING THE SAME MISTAKES
   Migrating faithfully, including the design flaws, because you never asked
   what was actually wrong with the original.

‼️ 11. SCOPE CREEP / SECOND SYSTEM
   "While we're in here, let's also..." ‼️ The migration is not the moment to
   redesign. Fix the scope and defend it.

‼️ 12. NO DEFINITION OF DONE
   Nobody wrote down what finished means, so it never is.
```

---

## 12. A Migration Checklist

```text
BEFORE
  □ What problem does this solve, in business terms and with numbers?
  □ Have we considered leaving it alone?
  □ Baseline metrics captured (traffic, latency, errors, cost, incidents)?
  □ Do we know what it actually does — instrumented, not assumed?
  □ Characterisation tests written for critical behaviour?
  □ All consumers identified, including scripts, reports and partners?
  □ ‼️ Is there a seam? Can old and new run side by side?
  □ ‼️ What ships in the first 4 weeks?
  □ ‼️ If we stop at 50%, are we better off than before?
  □ Named owner for the whole migration?
  □ Agreed policy: no new features in the old system?

DURING
  □ Every step independently deployable and reversible?
  □ Rollback exercised, not just documented?
  □ Behind a flag, rolled out by percentage on a stable key?
  □ Dashboard showing migration progress and old-vs-new comparison?
  □ Shadow reads / dual-run comparison for anything correctness-critical?
  □ Reconciliation job for data divergence?
  □ Runbook written, with abort criteria agreed in advance?
  □ Progress visible to leadership?

CUTOVER
  □ Deploy freeze on unrelated changes?
  □ Who is on the call, and who decides to abort?
  □ Communication plan — internal and, if needed, customers?
  □ Old store kept readable as a fallback?
  □ Gradual, with observation time at each step?

AFTER
  □ Metrics compared against the baseline — did it actually improve?
  □ ‼️ Verified nothing calls the old system (logged, not assumed)?
  □ ‼️ Old code, config, infrastructure and alerts DELETED?
  □ Documentation and runbooks updated?
  □ Retrospective — what did we learn for the next one?
  □ ‼️ Told the business what they got for the investment?
```

---

## Related Files

- [ENGINEERING-FAILURES-DEEP.md](ENGINEERING-FAILURES-DEEP.md) — §5 why big-bang rewrites fail
- [TECHNICAL-DECISION-MAKING-DEEP.md](TECHNICAL-DECISION-MAKING-DEEP.md) — §7 rewrite vs refactor, §2 reversibility
- [STAFF-PLUS-ENGINEER-DEEP.md](STAFF-PLUS-ENGINEER-DEEP.md) — funding and leading work like this
- [TECHNICAL-DEBT-DEEP.md](../2-medium-priority/TECHNICAL-DEBT-DEEP.md) — making the case
- [DATABASE-DESIGN-DEEP.md](DATABASE-DESIGN-DEEP.md) — schema design and indexing
- [TYPEORM-BASICS.md](../2-medium-priority/TYPEORM-BASICS.md) — §11 migrations in practice
- [MICROSERVICES-DEEP.md](../2-medium-priority/MICROSERVICES-DEEP.md) — what you take on by splitting
