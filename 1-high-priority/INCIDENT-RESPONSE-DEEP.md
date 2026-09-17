# Incident Response & On-Call

**Priority: HIGH**

> What to do when production is broken: severity levels, the incident command structure,
> the first five minutes, communication, runbooks, SLOs and error budgets, alerting that
> works, and running a humane on-call rotation.
>
> Being calm and effective during an outage is one of the most visible senior signals there is.

---

## Table of Contents

1. [The Goal Is Recovery, Not Diagnosis](#1-the-goal-is-recovery-not-diagnosis)
2. [Severity Levels](#2-severity-levels)
3. [The Incident Command Structure](#3-the-incident-command-structure)
4. [The First Five Minutes](#4-the-first-five-minutes)
5. [Diagnosis Under Pressure](#5-diagnosis-under-pressure)
6. [Communication](#6-communication)
7. [Runbooks](#7-runbooks)
8. [SLOs and Error Budgets](#8-slos-and-error-budgets)
9. [Alerting That Works](#9-alerting-that-works)
10. [Running a Humane On-Call](#10-running-a-humane-on-call)
11. [Common Mistakes](#11-common-mistakes)
12. [Interview Answers](#12-interview-answers)

---

## 1. The Goal Is Recovery, Not Diagnosis

```text
‼️ THE SINGLE MOST IMPORTANT RULE OF INCIDENT RESPONSE:

   MITIGATE FIRST. UNDERSTAND LATER.

   Your job during an incident is to STOP THE BLEEDING. Not to find the root
   cause, not to write a proper fix, not to understand what happened. Those
   come after, when the pressure is off and you can think clearly.

WHY ENGINEERS GET THIS WRONG
  Curiosity is the trait that makes you good at this job, and during an
  incident it works against you. Finding out WHY is intrinsically compelling,
  and rolling back without knowing feels unsatisfying and slightly
  unprofessional.

  ‼️ It is the opposite. Every minute spent understanding is a minute of
     customer impact. You can investigate the failed deploy all afternoon once
     it is no longer in production.

THE MITIGATIONS TO REACH FOR FIRST — in rough order of preference

  1. ROLL BACK. ‼️ If a deploy went out in the last hour, this is almost
     certainly your answer. Roll back first and check afterwards. The cost of
     an unnecessary rollback is nearly zero; the cost of not rolling back for
     twenty minutes while you investigate is real.
  2. TURN OFF THE FEATURE. Flip the flag.
  3. SCALE UP. Throw capacity at it. Expensive and crude, and entirely
     appropriate during an outage.
  4. FAIL OVER. To the replica, the other region, the backup provider.
  5. SHED LOAD. Rate limit, disable the expensive endpoint, put up a
     maintenance page for one feature. ‼️ Degrading deliberately beats
     collapsing accidentally.
  6. RESTART IT. Unsatisfying, frequently effective, and legitimate.

‼️ THE THREE NUMBERS THAT MEASURE YOUR RESPONSE
   MTTD  mean time to DETECT   — how long until you knew
   MTTA  mean time to ACKNOWLEDGE — how long until a human engaged
   MTTR  mean time to RECOVER  — how long until customers were fine

   ‼️ MTTR IS THE ONE THAT MATTERS MOST, and it is more improvable than
      preventing incidents. You will never stop shipping bugs. You can
      absolutely get from "90 minutes to recover" to "5 minutes to recover",
      and that changes an outage into a blip.
```

---

## 2. Severity Levels

```text
‼️ WHY THEY EXIST: so that everyone instantly agrees how much to panic and who
   to wake. Without them, every issue is argued about, and the argument costs
   more than the incident.

  Exact definitions vary by company. This is a typical scheme:

  SEV1 — CRITICAL
    Complete outage, or data loss, or a security breach.
    Nobody can use the product. Money is being lost right now.
    → Wake people up. All hands. Executive notification. Status page.
    EXAMPLES: site down, checkout failing for everyone, customer data exposed,
              database corrupted.

  SEV2 — MAJOR
    A core feature is broken, or a large subset of users is affected, or
    severe degradation.
    → Immediate response during and outside hours. Status page likely.
    EXAMPLES: search down, one region failing, 20% error rate, logins failing
              for one auth provider.

  SEV3 — MINOR
    A non-core feature broken, or a small number of users affected, or there
    is a workaround.
    → Response during business hours. Ticket, not a page.
    EXAMPLES: exports failing, a broken admin screen, one integration down.

  SEV4 — LOW
    Cosmetic, or nearly no impact.
    → Normal backlog.

‼️ THE PRACTICAL RULES THAT MAKE SEVERITY WORK

  1. ‼️ DECLARE EARLY AND HIGH. It is far cheaper to downgrade a SEV2 to a SEV3
     ten minutes in than to spend forty minutes deciding whether to declare.
     "We can always downgrade" should be said explicitly in your process, or
     people will hesitate — nobody wants to be the person who over-reacted.

  2. ANYONE CAN DECLARE. ‼️ If a junior engineer needs permission to raise an
     incident, your incidents start late, every time.

  3. SEVERITY IS ABOUT CUSTOMER IMPACT, NOT TECHNICAL EXCITEMENT. A dramatic
     failure in a system nobody uses is a SEV4. A boring null-pointer in
     checkout is a SEV1.

  4. WRITE DOWN WHO GETS NOTIFIED AT EACH LEVEL, in advance. Deciding who to
     wake at 3am, at 3am, is how people get missed.
```

---

## 3. The Incident Command Structure

```text
‼️ ADAPTED FROM EMERGENCY SERVICES, and it works for the same reason: under
   stress, humans need explicit roles or everyone does the same thing and
   nobody does the rest.

THE PROBLEM IT SOLVES
  Without roles, an incident looks like: five engineers all debugging the same
  service, nobody talking to customers, nobody tracking what has been tried,
  the CEO asking for updates in the same channel people are trying to work in,
  and two people making conflicting changes to production simultaneously.

THE ROLES

  INCIDENT COMMANDER (IC)
    ‼️ COORDINATES. DOES NOT DEBUG. This is the rule people break, and
       breaking it is why incidents go sideways — the moment the IC gets
       absorbed in a stack trace, nobody is running the incident.
    - Decides what is tried next and who does it
    - Keeps the timeline
    - Decides on mitigations and, crucially, on rolling back
    - Decides when to escalate and when the incident is over
    ‼️ THE IC DOES NOT HAVE TO BE THE MOST SENIOR OR THE MOST KNOWLEDGEABLE
       PERSON. It is a coordination role. Often the best IC is the person who
       knows the system least — they cannot be tempted to debug.

  OPERATIONS / SUBJECT EXPERT
    The people actually investigating and making changes.
    ‼️ ANNOUNCE EVERY ACTION BEFORE TAKING IT: "I'm restarting the API pods in
       eu-west-1." Two people silently changing production during an incident
       is how a bad situation becomes a much worse one.

  COMMUNICATIONS LEAD
    Updates the status page, internal stakeholders, support, and customers.
    ‼️ EXISTS SPECIFICALLY TO PROTECT THE RESPONDERS from being interrupted for
       status updates. Without this role, the IC spends the incident answering
       "any update?" instead of running it.

  SCRIBE
    Timestamps everything in the incident channel: what was observed, what was
    tried, what happened.
    ‼️ Invaluable later — this IS your post-mortem timeline, and nobody can
       reconstruct it afterwards from memory.

‼️ SCALING THE STRUCTURE
   SEV3: one person is all four roles. That is fine.
   SEV2: IC + responders, maybe comms.
   SEV1: all roles separate, and the IC does nothing but command.

‼️ HANDOVER: for anything running past a couple of hours, hand over
   explicitly — "you are now IC" — and do it out loud in the channel. Tired
   people make the GitLab mistake (see ENGINEERING-FAILURES-DEEP §3).
```

---

## 4. The First Five Minutes

```text
‼️ A SCRIPT, because under stress you will not invent one.

  0:00  ACKNOWLEDGE THE PAGE
        Stops escalation and tells everyone a human is engaged.

  0:30  ASSESS IMPACT — three questions only
        - What is broken, in customer terms?
        - How many users? All, some, one region, one plan tier?
        - Is it getting worse?
        ‼️ NOT "why". Not yet.

  1:00  DECLARE, AND OPEN A CHANNEL
        Say the severity out loud. Create the incident channel or bridge.
        ‼️ ONE CHANNEL. Not a DM thread, not three channels. Everything in
           one place, or the timeline is lost and people miss decisions.

  1:30  ASSIGN IC
        Explicitly, by name. ‼️ "I'm IC" or "Sam, can you take IC?" Implicit
        command is no command — this is the most commonly skipped step and it
        is the one that makes everything else work.

  2:00  ASK THE HIGHEST-YIELD QUESTION:
        ‼️ "WHAT CHANGED?"
        A large majority of incidents are caused by a change — a deploy, a
        config change, a feature flag, a migration, an infrastructure change,
        or a third party's change.
        - What deployed in the last few hours?
        - Any flags flipped? Any config pushed?
        - Any scheduled job that just ran?
        - Is a dependency having an incident? (Check their status page.)
        ‼️ If something changed recently — REVERT IT. Do not debug it first.

  3:00  MITIGATE
        See §1. Roll back, flag off, scale, fail over, shed load.

  5:00  FIRST COMMUNICATION
        Internal stakeholders and, if customer-visible, the status page.
        ‼️ Even with nothing to say: "We are aware of errors affecting checkout
           and are investigating. Next update in 30 minutes." Silence is worse
           than an unhelpful update — silence makes people assume nobody knows.

‼️ THE MINDSET
  - Slow down. Read the error. ‼️ Most incident-made-worse moments come from
    someone acting fast on a wrong assumption.
  - Say what you are doing before you do it.
  - ‼️ Change ONE thing at a time. Changing three things and seeing recovery
    tells you nothing about what worked — and you will need to know later.
  - If you do not know, say so. "I don't know why" is useful information.
```

---

## 5. Diagnosis Under Pressure

```text
‼️ ONCE MITIGATED — or if there is nothing obvious to mitigate — a systematic
   approach beats intuition, because intuition under stress fixates.

THE ORDER TO LOOK

  1. WHAT CHANGED? (again — it is still the answer most of the time)
     Deploys, config, flags, migrations, infrastructure, certificates,
     dependencies, DNS.

  2. WHAT DO THE SYMPTOMS ACTUALLY SAY?
     - Which endpoints? All, or a subset?
     - Which users? All, one region, one tenant, one plan?
     - Started suddenly, or degraded gradually?
       ‼️ SUDDEN suggests a change or a hard limit hit. GRADUAL suggests a
          leak, growth, saturation, or something filling up.
     - ‼️ WHAT IS THE ACTUAL ERROR? Read it. Read the whole stack trace. An
        astonishing share of incident time is spent theorising while the
        answer is in a log line nobody opened.

  3. WHERE IN THE STACK?
     Work outward from the user: CDN → load balancer → app → database →
     dependencies. Each layer's own metrics tell you whether to keep going.

  4. THE USUAL SUSPECTS — check these early, they are extremely common:
     □ ‼️ A deploy
     □ Database: connection pool exhausted, a lock, a slow query, disk full
     □ ‼️ Disk full (logs are the usual culprit) — check it early, it is
       trivial to check and embarrassing to miss for an hour
     □ Memory: a leak, or an OOM kill
     □ ‼️ AN EXPIRED CERTIFICATE. Sudden, total, and affects everything at once.
     □ A dependency's outage
     □ Rate limit or quota hit on a third party
     □ A cron job that just ran
     □ Traffic spike — legitimate, or an attack
     □ DNS

  5. CORRELATE BY TIME. ‼️ Line up the error-rate graph with your deploy
     markers, then with every other graph you have. "What else changed shape
     at 14:32?" is frequently the whole diagnosis.

‼️ IF YOU ARE STUCK AFTER 15-20 MINUTES: get more people, and say out loud
   what you have ruled out. ‼️ Explaining it to someone else is the single most
   reliable debugging technique there is, and under pressure people
   consistently wait too long to ask.

‼️ AND BEWARE FIXATION. If you have been certain it is the database for twenty
   minutes with no progress, deliberately consider that you are wrong. The IC
   should watch for this specifically — it is one of their main jobs.
```

---

## 6. Communication

```text
‼️ HOW YOU COMMUNICATE DURING AN INCIDENT AFFECTS CUSTOMER TRUST MORE THAN THE
   OUTAGE ITSELF. People forgive downtime. They do not forgive being ignored
   or misled.

THE PRINCIPLES

  1. ‼️ EARLY, EVEN WITH NOTHING TO SAY. "We're investigating" within minutes
     beats a detailed explanation an hour later. Your customers already know
     it is broken; the question they have is whether YOU know.

  2. ‼️ COMMIT TO A NEXT UPDATE TIME, AND HIT IT. "Next update by 15:30." Then
     update at 15:30 even if the update is "still investigating, next update
     16:00". This single habit removes most of the anxiety on the other side.

  3. PLAIN LANGUAGE, CUSTOMER IMPACT FIRST.
     ✗ "We are experiencing elevated 5xx rates from the ingestion tier due to
        connection pool saturation."
     ✓ "Some customers can't upload files. We've identified the cause and are
        working on a fix."

  4. ‼️ NEVER SPECULATE ON CAUSE PUBLICLY, AND NEVER GUESS AT A FIX TIME. You
     will be wrong, and a missed ETA costs more trust than no ETA. Say "next
     update at X", not "fixed by X".

  5. DO NOT BLAME A THIRD PARTY, even when it is their fault. ‼️ You chose
     them. From the customer's perspective, your dependency is your problem.

  6. ‼️ SEPARATE THE WORKING CHANNEL FROM THE UPDATE CHANNEL. Responders work
     in one place; stakeholders watch another. Otherwise the incident channel
     fills with "any news?" and the responders cannot think.

THE TEMPLATE

  INITIAL
    "We are investigating reports of [customer-visible symptom] affecting
     [who]. We will update by [time]."

  UPDATE
    "We have identified the cause and are applying a fix. [Symptom] is still
     affecting [who]. Next update by [time]."

  RESOLVED
    "This is resolved as of [time]. [Symptom] affected [who] between [start]
     and [end]. We will publish a full post-mortem within [timeframe]."

‼️ INTERNALLY, TELL LEADERSHIP EARLY AND DIRECTLY. An executive who hears about
   an outage from a customer or from Twitter will not trust your team's
   reporting again quickly. Bad news travels up fast — that is a feature.
```

---

## 7. Runbooks

```text
‼️ A RUNBOOK IS A DOCUMENT THAT TELLS A TIRED PERSON AT 3AM EXACTLY WHAT TO DO.
   It is written for someone with no context, under stress, who did not build
   the system.

WHAT MAKES A GOOD ONE

  - ‼️ EXACT COMMANDS, COPY-PASTEABLE. Not "check the queue depth" but the
    literal command, with the expected output shown.
  - ‼️ ORGANISED BY SYMPTOM, NOT BY SYSTEM. At 3am you know "checkout is
    failing", not "the payment reconciliation worker is backed up". Index it
    the way the problem presents.
  - Decision points made explicit: "if X, do A; if Y, do B."
  - Links to the relevant dashboards, with the time range pre-set if possible.
  - Escalation: who to call, and when to stop trying alone.
  - ‼️ WHEN NOT TO ACT. "Do not restart the primary — failover is automatic
    and manual restarts cause split-brain." Knowing what not to touch matters
    as much as knowing what to do.

THE SHAPE

  SYMPTOM: Checkout returning 500s
    IMPACT: customers cannot pay. SEV1 if widespread.
    DASHBOARD: [link]
    FIRST CHECKS:
      1. Has anything deployed in the last hour? `<command>`
      2. Is the payment provider up? [their status page]
      3. Check DB connections: `<exact query>` — expect < 80 of 100
    IF CONNECTION POOL IS EXHAUSTED:
      `<exact command to see and kill long-running queries>`
      ‼️ Do not restart the database. Kill the queries.
    IF THE PROVIDER IS DOWN:
      Enable the queue-and-retry flag: `<command>`
      This queues payments for later rather than failing them.
    ESCALATE TO: #payments-oncall, then [name] if no response in 15 min.

‼️ KEEPING THEM ALIVE — the hard part, because runbooks rot silently:
  - ‼️ UPDATE THE RUNBOOK AS PART OF EVERY INCIDENT. Make it an action item in
    the post-mortem, every time. A runbook that was wrong at 3am is worse than
    none, because it costs you time AND confidence.
  - Review them when the system changes.
  - ‼️ TEST THEM: have someone who did not write it follow it during a game
    day. You will find the missing steps immediately.
  - Link them directly from the alert. ‼️ An alert should carry a link to its
    runbook — if it does not, the responder is starting from zero.
```

---

## 8. SLOs and Error Budgets

```text
‼️ THE VOCABULARY, which is used loosely and is worth getting right:

  SLI  Service Level INDICATOR — the MEASUREMENT.
       "Percentage of requests returning < 500 in under 300ms."

  SLO  Service Level OBJECTIVE — your INTERNAL TARGET.
       "99.9% of requests succeed, measured over 30 days."

  SLA  Service Level AGREEMENT — the CONTRACTUAL promise, with penalties.
       ‼️ Always looser than your SLO. You want to breach your internal target
          long before you breach a customer contract.

‼️ THE ERROR BUDGET — THE IDEA WORTH TAKING AWAY FROM ALL OF THIS

   If your SLO is 99.9%, then 0.1% of requests are ALLOWED to fail. Over 30
   days that is roughly 43 minutes of downtime. That is your ERROR BUDGET.

   ‼️ THE REFRAME: 100% RELIABILITY IS THE WRONG TARGET. It is impossible, and
      pursuing it means shipping nothing — every change is risk. The error
      budget makes the trade-off explicit and, crucially, turns an argument
      into arithmetic.

   HOW IT IS USED:
     BUDGET REMAINING → ship freely. Take risks, deploy often, launch things.
     BUDGET EXHAUSTED → ‼️ feature work stops; reliability work starts, until
                        the budget recovers.

   ‼️ WHY THIS IS SO VALUABLE ORGANISATIONALLY: it ends the permanent argument
      between "ship faster" and "stop breaking things". Both sides agreed the
      number in advance. It is no longer a matter of opinion or seniority —
      it is a measurement, agreed when everyone was calm.

CHOOSING SLOs WELL

  ‼️ MEASURE WHAT THE USER EXPERIENCES, not what is easy to measure. CPU
     utilisation is not an SLI. "Checkout completes successfully" is.

  ‼️ DO NOT SET THEM TOO HIGH. An SLO you breach constantly is noise, and the
     team learns to ignore it. Start from your CURRENT measured performance,
     not from ambition. If you are at 99.5%, set 99.5% and improve it
     deliberately.

  ‼️ FEWER IS BETTER. Two or three SLOs on the things that actually matter
     beat thirty nobody looks at.

  AND REMEMBER the dependency ceiling from NON-FUNCTIONAL-REQUIREMENTS §5: you
  cannot promise more availability than the services you depend on provide.
```

---

## 9. Alerting That Works

```text
‼️ THE GOVERNING RULE:

   EVERY ALERT MUST BE ACTIONABLE, URGENT, AND REAL.

   If a human is woken up, there must be something for them to DO, it must
   need doing NOW, and it must not be a false alarm. An alert that fails any
   of those three trains people to ignore alerts — and that is how the real
   one gets missed. See ENGINEERING-FAILURES-DEEP §6 on alert fatigue.

‼️ ALERT ON SYMPTOMS, NOT CAUSES

  ✗ "CPU is above 80%"
     So what? If users are fine, this is not an incident. High CPU might be
     entirely normal under load.
  ✓ "Error rate above 1% for 5 minutes"
  ✓ "p95 latency above 2s for 5 minutes"
  ✓ "Checkout success rate below 95%"

  ‼️ WHY: there are unlimited ways for a system to break, and you cannot
     enumerate the causes. But the SYMPTOMS the user experiences are few —
     it is slow, it is erroring, it is wrong, it is gone. Alert on those and
     you catch failures you never predicted.

  Cause-based metrics are still worth GRAPHING — they are how you diagnose.
  They just should not page anyone.

THE PRACTICAL RULES

  □ ‼️ EVERY PAGE MUST LINK TO A RUNBOOK. No runbook, no page.
  □ Use a DURATION, not an instant. "Above 1% for 5 minutes" — otherwise a
    momentary blip wakes someone for a problem that fixed itself.
  □ SEPARATE PAGES FROM TICKETS. Page = wake someone. Ticket = look at it
    tomorrow. ‼️ Most alerts should be tickets. Be ruthless about which
    genuinely need a human immediately.
  □ ‼️ ALERT ON THE THINGS THAT FAILED SILENTLY LAST TIME. GitLab's backups
    (FAILURES §3) failed for months with nobody alerted. Alert on the ABSENCE
    of expected things: the nightly job that did not run, the queue that
    stopped being consumed, the backup that did not complete.
  □ Review alerts regularly. ‼️ Delete any that fired and required no action.
    An alert nobody acts on is worse than no alert — it creates the illusion
    of monitoring.
  □ Track the false-positive rate as a real metric. Above roughly 20% and your
    team has stopped trusting the system.
```

---

## 10. Running a Humane On-Call

```text
‼️ ON-CALL IS A MAJOR CAUSE OF BURNOUT AND ATTRITION, and it is almost always
   fixable. The fix is treating the load as a problem to solve rather than a
   cost of doing business.

THE STANDARDS TO AIM FOR

  □ ‼️ FEWER THAN ~2 PAGES PER SHIFT. More than that and it is not
    sustainable — and the pages are telling you something about the system
    that you should be fixing.
  □ Rotation of at least 6 people, so the rota comes round no more than every
    six weeks.
  □ ‼️ A SECONDARY who is paged if the primary does not respond. Nobody should
    be the single point of failure, and it removes the anxiety of "what if I
    don't hear it".
  □ Compensation — extra pay, time off in lieu, or both.
  □ ‼️ EXPLICIT PERMISSION TO SLEEP THE NEXT DAY. If someone is up at 3am,
    they do not work a normal day. Say this in the policy, or people will not
    take it.
  □ Nobody on call who has not been onboarded to the systems.
  □ ‼️ A FORMAL HANDOVER between shifts: what is ongoing, what is fragile,
    what changed.

THE VIRTUOUS CYCLE — ‼️ THE MOST IMPORTANT STRUCTURAL POINT HERE

  ‼️ THE PEOPLE WHO BUILD IT SHOULD CARRY THE PAGER FOR IT.

  When the team that writes the code gets woken by it, reliability stops being
  somebody else's problem and becomes an immediate, personal priority. Noisy
  alerts get fixed. Flaky systems get attention. Runbooks get written.

  When on-call is handed to a separate ops team, the incentive breaks
  completely: the people who can fix the root cause never feel the pain, and
  the people who feel the pain cannot fix it.

MAKING IT BETTER OVER TIME

  - ‼️ EVERY PAGE SHOULD PRODUCE EITHER A FIX OR AN ALERT DELETION. If the same
    page recurs and nothing changes, the system is not improving.
  - Track pages per week as a real metric, reviewed by the team.
  - ‼️ BUDGET TIME FOR RELIABILITY WORK EXPLICITLY. If the roadmap is 100%
    features, on-call load only ever increases. The error budget (§8) is the
    cleanest mechanism for this.
  - Run GAME DAYS: break something in staging deliberately and practise. ‼️
    You find out that the runbook is wrong, the dashboard does not exist, and
    nobody knows how to fail over — on a Tuesday afternoon instead of at 3am.
  - Rotate the ONBOARDING: a new engineer shadows a shift before carrying it.
```

---

## 11. Common Mistakes

```text
‼️ 1. DEBUGGING INSTEAD OF MITIGATING.
   See §1. Roll back first; understand afterwards.

‼️ 2. NOT DECLARING AN INCIDENT.
   "It's probably fine" for forty minutes. Declare early, downgrade freely.

‼️ 3. NO NAMED INCIDENT COMMANDER.
   Five people debugging, nobody coordinating, nobody talking to customers.

‼️ 4. THE IC DEBUGGING.
   The single most common structural failure. The moment the IC opens a stack
   trace, the incident is uncommanded.

‼️ 5. CHANGING SEVERAL THINGS AT ONCE.
   It recovers and you have no idea why — so you cannot prevent it, and you
   cannot be sure it will not return in an hour.

‼️ 6. NOT SAYING WHAT YOU ARE DOING.
   Two people acting on production simultaneously. Announce every action.

‼️ 7. SILENCE TOWARDS CUSTOMERS.
   The outage is forgivable. Being ignored is not.

‼️ 8. GIVING AN ETA.
   You will be wrong. Commit to the next UPDATE time instead.

‼️ 9. HEROICS INSTEAD OF ESCALATION.
   One person struggling alone for two hours at 4am. ‼️ Escalating is not
   failure; it is the system working.

‼️ 10. NO HANDOVER ON LONG INCIDENTS.
   Tired people make things worse. See GitLab.

‼️ 11. SKIPPING THE POST-MORTEM once it is fixed.
   The incident's value is in what you learn. See ENGINEERING-FAILURES-DEEP §7.

‼️ 12. ACTION ITEMS WITH NO OWNER OR DATE.
   They do not happen, and the same incident recurs.

‼️ 13. BLAMING A PERSON.
   Guarantees the next incident is hidden or reported late.

‼️ 14. ALERTS THAT PAGE FOR NON-URGENT THINGS.
   Teaches everyone to ignore pages.
```

---

## 12. Interview Answers

```text
"WALK ME THROUGH HOW YOU'D HANDLE A PRODUCTION OUTAGE."

  ‼️ The structure they want:
  "First, assess impact and declare a severity so everyone knows how serious
   it is — I'd rather over-declare and downgrade. Name an incident commander
   explicitly; if it's just me, I say so.

   Then MITIGATE BEFORE DIAGNOSING. The first question is 'what changed?' —
   most incidents trace to a recent deploy, config change or flag. If
   something changed recently I revert it before investigating why.

   Communicate early, even with nothing to say, and commit to a next update
   time rather than an ETA for the fix.

   Once we're stable, then diagnose properly — and afterwards run a blameless
   post-mortem focused on why it wasn't caught faster and why recovery took as
   long as it did, not just on the immediate cause."

  ‼️ What that demonstrates: you prioritise customers over curiosity, you know
     incidents are coordination problems, and you think in systems.

"TELL ME ABOUT AN INCIDENT YOU HANDLED."
  Use: impact → what you did → the mitigation → what you changed afterwards.
  ‼️ Emphasise the SYSTEMIC fix, not the heroic debugging. "I found the bug in
     twenty minutes" is senior. "I found it, and then noticed we had no alert
     for that failure mode and added one, so the next occurrence was caught in
     60 seconds" is staff.

"HOW DO YOU DECIDE WHAT TO ALERT ON?"
  Symptoms not causes; actionable, urgent and real; every page links to a
  runbook; most things should be tickets, not pages.

"WHAT'S AN SLO, AND WHY WOULD YOU WANT AN ERROR BUDGET?"
  ‼️ The answer that lands: "100% reliability is the wrong target — it's
   impossible and pursuing it means shipping nothing. An error budget makes
   the trade-off explicit: while there's budget left we ship fast, and when
   it's exhausted we stop feature work and fix reliability. It converts a
   recurring argument between product and engineering into arithmetic that
   both sides agreed to in advance."

"HOW WOULD YOU IMPROVE AN UNHEALTHY ON-CALL ROTATION?"
  Measure pages per shift. Delete alerts that never required action. Make
  every page produce either a fix or a deletion. ‼️ Ensure the team that
  builds it carries it. Budget reliability time explicitly.
```

---

## Related Files

- [ENGINEERING-FAILURES-DEEP.md](ENGINEERING-FAILURES-DEEP.md) — §7 the blameless post-mortem, and what real outages look like
- [NON-FUNCTIONAL-REQUIREMENTS.md](../2-medium-priority/NON-FUNCTIONAL-REQUIREMENTS.md) — §5 availability, RPO and RTO
- [OBSERVABILITY-DEEP.md](../3-low-priority/OBSERVABILITY-DEEP.md) — logs, metrics and traces in depth
- [DEVOPS-INFRASTRUCTURE-DEEP.md](DEVOPS-INFRASTRUCTURE-DEEP.md) — deployment, rollback and infrastructure
- [STAFF-PLUS-ENGINEER-DEEP.md](STAFF-PLUS-ENGINEER-DEEP.md) — leading during and after incidents
- [LEGACY-MIGRATION-DEEP.md](LEGACY-MIGRATION-DEEP.md) — §9 cutover runbooks and abort criteria
