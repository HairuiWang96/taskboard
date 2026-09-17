# The Staff+ Engineer — Senior, Staff, Principal

**Priority: HIGH**

> What actually changes above senior, the four staff archetypes, influence without
> authority, sponsorship, writing that moves an organisation, glue work, and how promotion
> to staff and principal really happens.
>
> The hardest part of this transition is that the thing that made you a great senior
> engineer is no longer the thing being measured.

---

## Table of Contents

1. [The Levels, Honestly](#1-the-levels-honestly)
2. [What Actually Changes](#2-what-actually-changes)
3. [The Four Archetypes](#3-the-four-archetypes)
4. [Influence Without Authority](#4-influence-without-authority)
5. [Writing as the Primary Tool](#5-writing-as-the-primary-tool)
6. [Sponsorship, Mentorship, Coaching](#6-sponsorship-mentorship-coaching)
7. [Glue Work](#7-glue-work)
8. [Technical Judgement at Scale](#8-technical-judgement-at-scale)
9. [Saying No and Choosing What Matters](#9-saying-no-and-choosing-what-matters)
10. [Working With Executives](#10-working-with-executives)
11. [How Promotion Actually Works](#11-how-promotion-actually-works)
12. [Failure Modes of New Staff Engineers](#12-failure-modes-of-new-staff-engineers)
13. [Staff+ Interviews](#13-staff-interviews)

---

## 1. The Levels, Honestly

```text
‼️ TITLES VARY WILDLY BETWEEN COMPANIES. A "staff engineer" at a 40-person
   startup and at Google are different jobs. What follows is the common shape,
   not a standard.

  SENIOR (L5-ish)
    SCOPE: a team, or a significant component.
    You take an ambiguous problem and deliver a solution without supervision.
    You make your team better. You are trusted to own things.
    ‼️ THE DEFINING TRAIT: you are reliable. Work given to you gets done well.

  STAFF (L6-ish)
    SCOPE: multiple teams, or a critical system the company depends on.
    You work on problems that span team boundaries — the ones that fall
    between owners, or that no single team can fix.
    ‼️ THE DEFINING TRAIT: you IDENTIFY the important problems, not just solve
       assigned ones. You change what the organisation works on.

  PRINCIPAL (L7-ish)
    SCOPE: an organisation or a business line.
    You set technical direction that holds for years. You are consulted on
    decisions before they are made. Your judgement is a company asset.
    ‼️ THE DEFINING TRAIT: you operate on the TECHNICAL STRATEGY — what we
       should build, in what order, and what we should stop doing.

  DISTINGUISHED / FELLOW (L8+)
    SCOPE: the company, and often the industry.
    Rare. Frequently tied to a specific, unusual, deep expertise.

‼️ THE PATTERN: EACH LEVEL IS A STEP UP IN SCOPE AND AMBIGUITY, NOT IN
   TECHNICAL SKILL. A principal engineer is not four times better at coding
   than a senior. They operate on larger, vaguer, more consequential problems
   with less direction — and they take responsibility for outcomes they
   cannot personally deliver.

‼️ AND THE THING NOBODY TELLS YOU: STAFF IS NOT "SENIOR BUT MORE". It is a
   DIFFERENT JOB. Many excellent senior engineers are unhappy at staff,
   because the work they loved — deep focus, building things, the satisfaction
   of shipping something you made — is much less of the day. That is a
   legitimate reason to stay senior. Staff is not a promotion you owe anyone.
```

---

## 2. What Actually Changes

```text
                    SENIOR                    STAFF+
  ─────────────────────────────────────────────────────────────────────
  MEASURED BY       What you deliver          What your ORGANISATION
                                              delivers because of you

  TIME ON CODE      60-80%                    ‼️ 10-40%, and often the
                                              lower end

  PROBLEMS          Given to you              You find them

  HARDEST PART      Technical complexity      ‼️ Ambiguity, politics, and
                                              getting people to agree

  FAILURE LOOKS     A bug, a missed date      A team building the wrong
  LIKE                                        thing for six months

  SUCCESS IS        Visible — you shipped it  ‼️ Often INVISIBLE — the
                                              outage that did not happen,
                                              the project that was
                                              cancelled early

  FEEDBACK LOOP     Days                      Months to years

  MAIN TOOL         Code                      Writing and conversation

‼️ THE THREE HARDEST ADJUSTMENTS, in the order people hit them:

  1. YOUR OUTPUT STOPS BEING YOURS.
     You will have weeks where you wrote no code and feel you did nothing.
     But you unblocked three teams, killed a doomed project, and made a design
     decision that saves a year of work. ‼️ Learning to recognise that as real
     work — and to explain it to yourself on a bad day — is genuinely hard,
     and it is where most new staff engineers struggle.

  2. YOU HAVE TO LET THINGS BE DONE WORSE THAN YOU WOULD DO THEM.
     You could write it better. You must not. ‼️ If you are the bottleneck for
     quality, the organisation's quality is capped at your throughput. Teach,
     set standards, review — but let other people own their work, including
     their mistakes.

  3. YOUR CALENDAR STOPS BEING YOURS.
     Meetings, reviews, unblocking, questions. ‼️ Defend deliberate blocks for
     deep work or you will do none — but accept that "interruptions" ARE the
     job now, not an obstacle to it.
```

---

## 3. The Four Archetypes

```text
‼️ From Will Larson's "Staff Engineer" — the most useful map of what staff
   engineers actually DO, because the title covers several quite different jobs.

── TECH LEAD ───────────────────────────────────────────────────────────────
  Leads one team's technical direction, usually paired with a manager who
  handles people. The most common archetype, and the usual entry point.
  DAY LOOKS LIKE: breaking down work, design reviews, unblocking, some coding,
  planning with the manager.
  ‼️ RISK: becoming a manager without the title or the support. Watch that you
     are not absorbing people-management work you are not equipped or
     compensated for.

── ARCHITECT ───────────────────────────────────────────────────────────────
  Owns the direction of a critical area across teams — the data platform, the
  API surface, the frontend architecture.
  DAY LOOKS LIKE: design documents, reviewing other teams' designs, long-range
  planning, prototyping the hard parts.
  ‼️ RISK: the IVORY TOWER. An architect who does not write code or carry a
     pager loses touch with reality, and their designs stop being credible to
     the people implementing them. ‼️ Stay close to production.

── SOLVER ──────────────────────────────────────────────────────────────────
  Deployed onto the hardest current problem, wherever it is. The performance
  crisis, the migration nobody can finish, the bug that has resisted three
  teams.
  DAY LOOKS LIKE: deep technical work, high focus, changing context every
  few months.
  ‼️ RISK: no compounding. You solve and move on, so you build little lasting
     leverage and may not develop the organisational skills that principal
     requires. Also the archetype most at risk of burnout.

── RIGHT HAND ──────────────────────────────────────────────────────────────
  Works alongside a senior leader (VP, CTO) with borrowed scope, on whatever
  the organisation's most important problem is.
  DAY LOOKS LIKE: strategy, cross-org programmes, representing the leader in
  technical discussions, a lot of meetings.
  ‼️ RISK: your authority is borrowed, not owned — and it evaporates if your
     sponsor leaves. The least technical of the four.

‼️ HOW TO USE THIS
  1. Know which one you ARE. Much frustration comes from being evaluated as
     one archetype while working as another.
  2. Know which one you WANT. They lead to different careers.
  3. ‼️ ASK IN INTERVIEWS: "what does a staff engineer here actually do day to
     day?" The answer tells you which archetype the role really is, and
     whether the company has thought about it at all.
  4. They are not permanent. Most people move between them.
```

---

## 4. Influence Without Authority

```text
‼️ THE CENTRAL SKILL, and the one most engineers are least prepared for.

   You have no reports. You cannot assign work, approve budgets, or overrule
   anyone. Yet you are expected to change what several teams do.

   The only lever you have is that people CHOOSE to follow you. Everything
   below is about earning that.

THE FOUR SOURCES OF INFLUENCE

  1. ‼️ CREDIBILITY — the foundation, and the slowest to build.
     You have been right before, visibly. You have shipped hard things. You
     understand the system deeply enough to be worth listening to.
     BUILD IT BY: solving a real problem people care about, early. Nothing
     substitutes for a track record. ‼️ In a new company, spend your first
     months delivering something concrete before trying to change direction —
     influence spent before it is earned simply does not land.

  2. TRUST — people believe you are acting in good faith.
     You give credit away. You admit when you are wrong. You do not have a
     hidden agenda. You are consistent.
     ‼️ Trust is the multiplier on everything else. Without it, correct
        arguments get resisted anyway.

  3. RELATIONSHIPS — you know people before you need them.
     ‼️ THE PRACTICAL POINT: the time to build a relationship with a team is
        NOT the week you need them to change their roadmap. Have coffee, read
        their design docs, help with something small, understand their
        pressures. Then when you need something, you are a colleague, not a
        stranger with an opinion.

  4. CLARITY — you make confusing things simple.
     People follow those who reduce their uncertainty. ‼️ Being the person who
     can explain the tangled thing clearly is itself a form of authority.

THE TACTICS THAT ACTUALLY WORK

  ‼️ START WITH THEIR PROBLEM, NOT YOUR SOLUTION.
    ✗ "You should migrate to the new event system."
    ✓ "I noticed you're spending a lot of time on replay bugs. We've got a
       thing that might remove that category — want me to walk you through it?"
    Framing your proposal as their win is not manipulation; it is the only
    version that will survive their priorities.

  ‼️ MAKE THE RIGHT THING THE EASY THING.
    Arguments are expensive; defaults are free. A good library, a template, a
    generator, a lint rule, a paved road. ‼️ Far more durable than persuasion —
    it works on people you never meet, including future hires.

  DO THE FIRST PART YOURSELF.
    A working prototype beats a proposal. "Here's a branch showing it works
    and it took two days" moves a conversation that a document could not.

  GIVE THE CREDIT AWAY.
    ‼️ Reliably counterintuitive and reliably effective. People who feel
       ownership of an idea will carry it further than you could push it. You
       do not need the credit; you need the outcome.

  FIND THE REAL OBJECTION.
    The stated objection is often not the real one. "It's technically risky"
    may mean "my team is already behind and I cannot absorb more work."
    ‼️ You cannot address an objection nobody has said out loud. Ask privately:
       "what would make this hard for you?"

  USE WRITING (§5), because it scales and persists.

  ESCALATE WELL, AND RARELY.
    ‼️ Going to a manager to overrule a peer wins the battle and costs the
       relationship. Reserve it for genuine impasses on things that matter,
       and when you do, frame it as "we disagree and need a decision", not as
       a complaint.
```

---

## 5. Writing as the Primary Tool

```text
‼️ THE SINGLE HIGHEST-LEVERAGE SKILL AT STAFF+, and the one most
   underestimated by engineers.

WHY WRITING IS THE TOOL
  - It SCALES. A conversation reaches 3 people. A good document reaches 300,
    including people who join next year.
  - It PERSISTS. Decisions made in meetings are forgotten and re-litigated.
  - It is ASYNCHRONOUS. Across time zones and calendars, writing is the only
    thing that works.
  - ‼️ IT FORCES CLARITY. Vague thinking survives conversation easily; it does
    not survive being written down. You will discover holes in your own
    argument in the act of writing. This alone justifies the effort.
  - It is REVIEWABLE. People can disagree with a document precisely, in a way
    they cannot disagree with a vibe.

THE DOCUMENTS THAT MATTER

  DESIGN DOC        how we will build this specific thing
  RFC               a proposal, to gather input and align (see
                    TECHNICAL-DECISION-MAKING-DEEP §9)
  ADR               a record of a decision and its context
  TECH STRATEGY     ‼️ the principal-level one. Where we are going technically
                    over 1-3 years and WHY — and what we will not do
  POST-MORTEM       what went wrong and what changes
  VISION            what good looks like in three years, to align people who
                    will never talk to each other

‼️ HOW TO WRITE SO ENGINEERS AND EXECUTIVES BOTH READ IT

  1. PUT THE ANSWER FIRST. ‼️ Not a mystery novel. First paragraph: what you
     are proposing and why it matters. Busy readers may read only that — make
     sure that is enough.
  2. ONE IDEA PER DOCUMENT. Two proposals in one doc get half-decided.
  3. USE NUMBERS. "Slow" is an opinion; "p95 of 4.2 seconds" is a fact.
  4. ‼️ STATE THE DOWNSIDES YOURSELF. Reviewers will find them. Naming them
     first buys enormous credibility and removes the sport of finding them.
  5. MAKE THE ASK EXPLICIT. What do you want the reader to DO?
  6. SHORT. Ruthlessly. A 2-page document that gets read beats a 20-page one
     that does not. Put detail in an appendix.
  7. ‼️ WRITE THE SUMMARY LAST, then reread it as if you know nothing about
     the project.

‼️ THE HABIT WORTH BUILDING: write the document BEFORE the work, not after.
   A design doc written before implementation changes the implementation. One
   written after is archaeology.
```

---

## 6. Sponsorship, Mentorship, Coaching

```text
‼️ THESE ARE THREE DIFFERENT THINGS AND THE DISTINCTION MATTERS ENORMOUSLY,
   because the most valuable one is the one most people never do.

  MENTORSHIP — "here is what I know"
    You share expertise and experience. Answering questions, reviewing code,
    explaining how things work. Low cost, valuable, and what most people mean
    by helping someone.

  COACHING — "what do you think?"
    You help someone find their OWN answer rather than giving yours. Asking
    questions instead of prescribing. ‼️ Harder and often more valuable — it
    builds capability rather than dependency.

  SPONSORSHIP — "I will spend my credibility on you"
    ‼️ THE ONE THAT ACTUALLY CHANGES CAREERS. You put someone's name forward
    for the visible project. You recommend them in the promotion meeting they
    are not in. You give them the presentation to the VP instead of doing it
    yourself. You say "she should lead this" in a room she is not in.

    THE ASYMMETRY: mentorship costs you an hour. Sponsorship costs you RISK —
    if they do badly, your judgement is questioned. That is exactly why it is
    worth so much more.

‼️ THE RESEARCH-BACKED POINT: people from under-represented groups tend to be
   over-mentored and under-sponsored — given lots of advice and few
   opportunities. If you want to affect who gets ahead, sponsorship is the
   lever that moves.

HOW TO SPONSOR, CONCRETELY
  - Give away the work that makes people visible: the demo, the design doc,
    the incident write-up, the conference talk. ‼️ Especially the ones you
    would enjoy doing yourself.
  - Say names in rooms they are not in. "Priya did that work, not me."
  - In promotion discussions, bring specific evidence rather than impressions.
  - ‼️ Then GET OUT OF THE WAY. Sponsoring someone and then correcting them
    publicly undoes it entirely.

‼️ WHY THIS IS PART OF THE JOB, not charity: at staff+ you are measured by
   what the organisation produces. Growing three senior engineers into people
   who can do what you do multiplies your impact far beyond anything you can
   personally deliver. It is the highest-leverage thing on this page.
```

---

## 7. Glue Work

```text
‼️ THE CONCEPT (Tanya Reilly): the work that holds a project together and is
   not any one person's job.

  Noticing that two teams are building the same thing. Writing the doc nobody
  wrote. Onboarding the new person. Chasing the decision that is blocking
  three teams. Running the meeting. Keeping the plan current. Noticing the
  risk nobody owns.

‼️ THE PARADOX: glue work is ESSENTIAL — projects fail without it — and it is
   SYSTEMATICALLY UNDER-REWARDED, because it is invisible in a promotion packet
   that asks "what did you build?"

THE TRAP
  It is easy to become the person who does all the glue and none of the
  technical work. You are enormously useful, everyone likes you, and you do
  not get promoted — because you have no visible technical achievement to
  point at. ‼️ This happens disproportionately to women and to people who are
  good at organising, and it is a genuine career risk, not a hypothetical one.

HOW TO HANDLE IT WELL

  1. DO IT DELIBERATELY, NOT BY DEFAULT.
     ‼️ Ask: "is this the highest-leverage thing I could do right now?"
     Sometimes clearly yes. Often it is just the most obviously undone thing.

  2. MAKE IT VISIBLE.
     Write the doc with your name on it. Report on the cross-team risk you
     surfaced. ‼️ Name it in your review explicitly: "I identified that teams A
     and B were duplicating X, and the consolidation saved roughly two
     engineer-months." That is an ACHIEVEMENT, not a chore — but only if you
     say so.

  3. DELEGATE AND SYSTEMATISE.
     ‼️ The staff-level move is not doing the glue — it is making it
     unnecessary. Automate the status update. Write the template. Fix the
     process so the gap stops appearing. Then the impact compounds and is
     legible.

  4. KEEP A TECHNICAL SPINE.
     ‼️ Protect at least one substantial technical contribution per cycle.
     It keeps your judgement sharp, keeps your credibility (§4) intact, and
     gives your promotion case something concrete.

  5. IF YOU MANAGE PEOPLE DOING GLUE WORK: name it and reward it explicitly,
     or you will lose them.
```

---

## 8. Technical Judgement at Scale

```text
‼️ What "good technical judgement" means changes as scope grows.

  SENIOR JUDGEMENT     Is this the right design for this problem?
  STAFF JUDGEMENT      Is this the right problem? What will this design cost
                       the organisation in two years?
  PRINCIPAL JUDGEMENT  Where should the whole system be going, and what are we
                       going to stop doing to get there?

THE QUESTIONS THAT MARK THE DIFFERENCE

  ‼️ "WHAT HAPPENS IN TWO YEARS?"
     Not can it work, but what does it cost to live with. Who maintains it?
     What does it make hard to change later? This is the single question that
     most separates staff from senior thinking.

  ‼️ "WHAT ARE WE NOT BUILDING BECAUSE OF THIS?"
     Everything has an opportunity cost, and it is invisible unless someone
     says it out loud.

  ‼️ "WHO ELSE IS AFFECTED?"
     Senior optimises for their team. Staff notices the three other teams who
     will inherit this, and the support burden, and the on-call rotation.

  ‼️ "WHAT IS THE SIMPLEST THING THAT COULD WORK?"
     Seniority correlates with proposing SIMPLER solutions, not cleverer ones.
     Anyone can add complexity. Removing it while keeping the capability is
     the harder skill — and it is what experience buys you.

  ‼️ "WHAT WOULD HAVE TO BE TRUE FOR THIS TO BE WRONG?"
     Actively looking for the disconfirming case, rather than defending your
     proposal.

  ‼️ "HOW DOES THIS FAIL?"
     See ENGINEERING-FAILURES-DEEP §8. Bringing failure patterns to a design
     review is one of the most concretely valuable things a staff engineer
     does in a meeting.

CALIBRATING RISK — the thing that takes years

  Not everything needs the same rigour. A staff engineer knows when to say
  "just ship it, we'll fix it if it breaks" and when to say "stop, this one
  is a one-way door".
  ‼️ Applying maximum rigour to everything is not caution; it is a failure of
     judgement that makes the whole organisation slow. Being able to say
     "this doesn't matter, move fast" is as much a senior signal as catching
     the thing that does.
```

---

## 9. Saying No and Choosing What Matters

```text
‼️ AT STAFF+, DEMAND EXCEEDS CAPACITY PERMANENTLY. Everyone wants your review,
   your opinion, your help. You cannot do it all, and trying produces a person
   who is busy, exhausted, and not actually changing anything.

   ‼️ WHAT YOU CHOOSE NOT TO DO IS AS IMPORTANT AS WHAT YOU DO. This is
      genuinely the hardest habit to build, because everything you decline is
      something real that someone needed.

THE FILTER

  Ask of any request:
    - Is this IMPORTANT, or just urgent?
    - ‼️ Can someone else do it? (If yes, that is usually better — it develops
      them and it scales.)
    - Does this need MY specific context, or just A senior person?
    - What does it displace?
    - ‼️ Is this a one-off, or is it the same thing recurring? If recurring,
      fix the system instead of handling the instance.

HOW TO SAY NO WELL
  ✗ "I don't have time."
  ✓ "I can't take this on this month — I'm on the migration. Two options:
     Dana knows this area well and I can brief her, or I can look at it in
     April. Which is better for you?"
  ‼️ A no with a path is collaborative. A bare no is a wall, and people stop
     bringing you things — including the things you needed to hear about.

THE HIGHEST-LEVERAGE "NO" IS TO A PROJECT
  ‼️ Killing a doomed project early is one of the most valuable things a staff
     engineer ever does — and it is completely invisible. Nobody thanks you
     for the eight engineer-months that were never wasted.

     Do it with evidence, not instinct, and give the team an alternative. And
     accept that this kind of impact needs to be narrated by you in review
     season, because nothing else will surface it.

‼️ PROTECT YOUR ATTENTION DELIBERATELY. Batch interruptions. Hold office
   hours instead of answering ad hoc. Block deep work time and defend it.
   ‼️ And beware the trap of being permanently reactive: if your whole week is
   other people's agendas, you are a very expensive support function, not a
   staff engineer.
```

---

## 10. Working With Executives

```text
‼️ Executives are a different audience with different constraints. Getting
   this wrong is the most common reason technically-excellent staff engineers
   fail to have impact.

WHAT THEY ARE ACTUALLY OPTIMISING FOR
  Revenue, cost, risk, speed, and their own credibility with their peers and
  the board. Not elegance, not correctness, not your architecture.
  ‼️ This is not cynicism — it is their job, the same way yours is the system.

THE RULES

  1. ‼️ LEAD WITH THE CONCLUSION AND THE ASK. They will give you 90 seconds
     before deciding whether to keep listening. Do not build to a climax.
       ✗ "So, the way the ingestion pipeline currently works is..."
       ✓ "I need two engineers for six weeks. Without it, we can't support
          the enterprise launch in Q3. Here's why."

  2. TRANSLATE TO MONEY, TIME, RISK, CUSTOMER. Every time. See
     TECHNICAL-DECISION-MAKING-DEEP §10.

  3. BRING OPTIONS, NOT PROBLEMS. Three tiers with costs and a recommendation.
     ‼️ Arriving with a problem and no options makes it their problem to solve,
        which is the opposite of what you want.

  4. BE HONEST ABOUT UNCERTAINTY, WITH RANGES.
     "Six to ten weeks, and here is what would push it to the top of that"
     is far more credible than a false single number — and it protects you
     when the number moves.

  5. ‼️ NEVER SURPRISE THEM. An executive who learns about a problem from
     someone else, or from a customer, will not trust you again quickly. Bad
     news travels UP fast and early, with a plan attached.

  6. KNOW WHEN THE DECISION IS MADE. Continuing to argue past a decision reads
     as not understanding the room. See "disagree and commit".

  7. UNDERSTAND THE CONSTRAINTS YOU CANNOT SEE. A decision that seems
     irrational often reflects a contract, a board commitment, or a hiring
     freeze you do not know about. ‼️ Ask "what constraints am I not seeing?"
     rather than assuming incompetence.

‼️ THE MOST VALUABLE THING YOU OFFER AN EXECUTIVE: being the engineer whose
   estimates are reliable and who tells them bad news early. That reputation
   converts directly into being consulted before decisions rather than after —
   which is the entire game.
```

---

## 11. How Promotion Actually Works

```text
‼️ THE UNCOMFORTABLE TRUTHS, stated plainly:

  1. YOU ARE PROMOTED FOR WORK YOU ARE ALREADY DOING.
     Companies do not promote you to staff so you can start operating at
     staff level. They promote you because you HAVE BEEN, visibly, for some
     months. ‼️ So the path is: find staff-level work and do it, then ask.
     Waiting to be given the scope first is the most common way people stall.

  2. SCOPE IS THE CURRENCY, NOT SKILL.
     "I'm technically strong enough" is not the argument. "I led a change that
     affected four teams and saved X" is. ‼️ If your role has no staff-level
     scope available, no amount of excellence will produce a promotion — and
     the honest answer may be that you need a different team or company.

  3. IT IS A COMMITTEE DECISION MADE BY PEOPLE WHO HAVE NOT SEEN YOUR WORK.
     Your manager presents a case to people who know you by reputation, if at
     all. ‼️ WHICH MEANS: evidence beats impressions, your work needs to be
     visible outside your team, and you need at least one senior advocate
     besides your manager.

  4. IT IS PARTLY POLITICAL AND PARTLY BUDGETARY. There may be a quota, a
     freeze, or a cycle. This is not always about you, and taking it
     personally helps nobody.

WHAT TO ACTUALLY DO

  □ ‼️ ASK YOUR MANAGER DIRECTLY: "what specifically would I need to
    demonstrate for staff, and what's an example of someone who did it here?"
    Vague answers are themselves information — either they do not know, or
    the path does not exist.

  □ KEEP A BRAG DOCUMENT. ‼️ Update it monthly, not at review time. Record
    what you did, who was affected, and the measurable outcome. You WILL
    forget — six months of work compresses into "I don't know, stuff?" by
    review season. This is the single highest-return career habit.

  □ MAKE IMPACT LEGIBLE. Write the design doc. Present at the review. Publish
    the post-mortem. ‼️ Not self-promotion — if nobody outside your team knows
    what you did, it did not happen as far as the committee is concerned.

  □ FIND CROSS-TEAM WORK. Staff scope by definition crosses boundaries. If
    your work is entirely inside one team, you cannot demonstrate it.

  □ GET A SPONSOR (§6) who is not your manager.

  □ ‼️ QUANTIFY. "Reduced p95 checkout latency from 4.2s to 900ms, which
    correlated with a 7% improvement in completion" beats "improved
    performance" by an enormous margin.

‼️ AND THE STRATEGIC NOTE: at many companies, particularly smaller ones, there
   simply is no staff level, or one seat, already occupied. Changing companies
   is sometimes the faster path — not disloyalty, just arithmetic. Know which
   situation you are in before spending two years on it.
```

---

## 12. Failure Modes of New Staff Engineers

```text
‼️ 1. STILL DOING SENIOR WORK
   Taking the hardest ticket and heads-down shipping it. It feels productive
   and it is what you are good at. ‼️ But you are now an expensive senior
   engineer, and the cross-team problems nobody owns are going unaddressed.

‼️ 2. THE ARCHITECTURE ASTRONAUT
   Designing elaborate systems, far from implementation, that the teams cannot
   or will not build. ‼️ Designs from someone who does not carry a pager are
   discounted heavily, and correctly.

‼️ 3. BECOMING THE BOTTLENECK
   Every decision routes through you. Every PR needs your approval. It feels
   like influence; it is a single point of failure that caps the organisation
   at your throughput. ‼️ FIX: write the principles down so people can decide
   without you. Your goal is to be unnecessary for routine decisions.

‼️ 4. THE HERO
   Personally saving every incident and every deadline. Rewarded in the short
   term, corrosive over time — it prevents the system from being fixed, hides
   the real staffing problem, and burns you out.

‼️ 5. LOSING TOUCH WITH THE CODE
   No code for a year, and now your technical opinions are stale and your
   credibility is quietly eroding. ‼️ Stay in the codebase somehow: a real
   project per quarter, code review, an on-call rotation. It does not have to
   be much, but it cannot be nothing.

‼️ 6. ALL GLUE, NO SUBSTANCE
   See §7.

‼️ 7. TRYING TO WIN EVERY ARGUMENT
   ‼️ You have finite political capital. Spending it on a linting convention
   means it is unavailable for the database decision. Pick the battles that
   actually matter and visibly concede the ones that do not — conceding
   gracefully is itself a source of influence.

‼️ 8. NOT MANAGING UP
   Doing excellent work that your leadership does not know about, in a
   direction they were not planning to go. ‼️ Alignment is your job, not theirs.

‼️ 9. IMPOSTER SYNDROME, SPECIFICALLY THE STAFF FLAVOUR
   The feedback loop is months long and much of your impact is invisible, so
   it is genuinely hard to tell if you are doing well. ‼️ This is close to
   universal at this level. Keep the brag document; it is evidence against
   your own bad days.

‼️ 10. FORGETTING IT IS A CHOICE
   If you are miserable, staying senior is a completely legitimate and
   respectable option. The industry's assumption that everyone should climb
   is not a law.
```

---

## 13. Staff+ Interviews

```text
‼️ WHAT CHANGES FROM A SENIOR LOOP

  - System design gets much heavier, and much more open-ended.
  - ‼️ They probe for JUDGEMENT and TRADE-OFFS, not correct answers. There is
    no right answer; there is the quality of your reasoning.
  - New rounds appear: technical leadership, cross-team influence, sometimes
    a written exercise or a presentation to a panel.
  - Behavioural questions carry far more weight than at senior. Often they
    decide the level.
  - ‼️ Coding rounds usually still exist and you still have to pass them. Do
    not neglect them because you think you are past that.

THE QUESTIONS THAT DETERMINE YOUR LEVEL

  "Tell me about a technical decision you made that turned out wrong."
    → Testing intellectual honesty and systemic thinking.
      See ENGINEERING-FAILURES-DEEP §9.

  "How did you influence a team you had no authority over?"
    → ‼️ THE DEFINING STAFF QUESTION. A strong answer names a specific
      objection you uncovered, how you addressed it, and how you made the
      right thing easy. A weak one is "I explained why it was better".

  "Tell me about a time you disagreed with a decision."
    → Looking for: argued well, lost, committed anyway, no bitterness. See
      TECHNICAL-DECISION-MAKING-DEEP §12.

  "How do you decide what to work on?"
    → Testing whether you have a prioritisation framework or just take what
      you are given. Impact, leverage, what only you can do.

  "Tell me about someone whose career you changed."
    → Sponsorship (§6). Most candidates answer with mentorship. Answering
      with real sponsorship stands out sharply.

  "What's a technical strategy you set, and how did you get buy-in?"
    → Principal-level. Vision, writing, alignment, and a measurable outcome.

‼️ HOW TO ANSWER AT THE RIGHT LEVEL — the same story can read as senior or
   staff depending on where you put the emphasis:

   SENIOR FRAMING:  "I noticed the API was slow, profiled it, found an N+1,
                     fixed it, and p95 dropped from 2s to 300ms."

   STAFF FRAMING:   "Checkout latency was hurting conversion, so I looked at
                     why performance problems kept recurring rather than just
                     fixing this one. The pattern was that nobody owned
                     end-to-end latency. I fixed the immediate N+1 — p95 went
                     from 2s to 300ms — and then set up per-endpoint latency
                     budgets with alerting, and got the three teams that touch
                     checkout to adopt them. Two quarters on, we catch
                     regressions in CI rather than in production."

   ‼️ Same work. The difference is SYSTEM over INSTANCE, and ORGANISATION over
      individual. Prepare your stories in the second shape.

‼️ AND ASK THEM: "what does a staff engineer here actually do?", "what's the
   scope of this role?", "can you give an example of someone promoted to staff
   recently and what they did?" ‼️ Vague answers are a genuine warning sign —
   a company that cannot describe the role will not evaluate you fairly
   against it, and you may end up as an expensive senior engineer with a title.
```

---

## Related Files

- [TECHNICAL-DECISION-MAKING-DEEP.md](TECHNICAL-DECISION-MAKING-DEEP.md) — the decisions you will own
- [ENGINEERING-FAILURES-DEEP.md](ENGINEERING-FAILURES-DEEP.md) — the failure patterns to bring to design reviews
- [LEGACY-MIGRATION-DEEP.md](LEGACY-MIGRATION-DEEP.md) — the archetypal staff-level project
- [BEHAVIORAL-DEEP.md](BEHAVIORAL-DEEP.md) — behavioural rounds in depth
- [BEHAVIORAL-STAR-STORIES.md](BEHAVIORAL-STAR-STORIES.md) — preparing stories in the staff framing
- [SYSTEM-DESIGN-DEEP.md](SYSTEM-DESIGN-DEEP.md) — the heaviest round at this level
- [NEGOTIATION-OFFER-DEEP.md](NEGOTIATION-OFFER-DEEP.md) — levelling and compensation
- [TECHNICAL-LEADERSHIP-DEEP.md](../3-low-priority/TECHNICAL-LEADERSHIP-DEEP.md) — ADR and RFC templates
