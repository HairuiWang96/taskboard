# Jira, Confluence & Agile — Complete Practical Reference

> Complete day-to-day reference for working with Jira and Confluence in agile development teams. Written from the perspective of a senior frontend engineer — practical workflows, real examples, and how to be effective immediately when joining a team using these tools.

---

## Table of Contents

### Part 1 — Agile Fundamentals (Practical)

1. [Agile Overview](#1-agile-overview)
2. [Scrum Framework](#2-scrum-framework)
3. [Kanban](#3-kanban)
4. [Scaled Agile](#4-scaled-agile)

### Part 2 — Jira Deep Dive

5. [Jira Concepts](#5-jira-concepts)
6. [Writing Good Tickets](#6-writing-good-tickets)
7. [Workflows & Statuses](#7-workflows--statuses)
8. [Sprint Management](#8-sprint-management)
9. [Backlog Management](#9-backlog-management)
10. [Jira Filters & JQL](#10-jira-filters--jql)
11. [Jira Workflows for Developers](#11-jira-workflows-for-developers)
12. [Jira Automation](#12-jira-automation)

### Part 3 — Confluence Deep Dive

13. [Confluence Basics](#13-confluence-basics)
14. [Essential Page Types](#14-essential-page-types)
15. [Writing Effective Technical Docs](#15-writing-effective-technical-docs)
16. [Confluence + Jira Integration](#16-confluence--jira-integration)
17. [Confluence Best Practices](#17-confluence-best-practices)

### Part 4 — Agile Ceremonies in Practice

18. [Sprint Planning](#18-sprint-planning)
19. [Daily Standup](#19-daily-standup)
20. [Sprint Review / Demo](#20-sprint-review--demo)
21. [Retrospective](#21-retrospective)
22. [Backlog Refinement / Grooming](#22-backlog-refinement--grooming)

### Part 5 — Agile Metrics & Reporting

23. [Key Metrics](#23-key-metrics)
24. [Jira Dashboards & Reports](#24-jira-dashboards--reports)
25. [Communicating Progress](#25-communicating-progress)

### Part 6 — Team Dynamics & Culture

26. [Developer's Role in Agile](#26-developers-role-in-agile)
27. [Working with Product Owners](#27-working-with-product-owners)
28. [Common Agile Anti-patterns](#28-common-agile-anti-patterns)

---

# Part 1 — Agile Fundamentals (Practical)

---

## 1. Agile Overview

### The Agile Manifesto — what it actually says

```text
‼️ The Agile Manifesto (2001) — four values:

  We value:                              Over:
  ─────────────────────────────────────────────────────
  Individuals and interactions           Processes and tools
  Working software                       Comprehensive documentation
  Customer collaboration                 Contract negotiation
  Responding to change                   Following a plan

  "While there is value in the items on the right,
   we value the items on the left MORE."

‼️ Key insight: The manifesto does NOT say "no documentation" or "no planning."
   It says when you have to choose, lean toward the left column.
   Teams that say "we're agile so we don't need docs" are WRONG.
```

### Principles that matter in practice

```text
The 12 Agile Principles — the ones that actually matter day-to-day:

1. Deliver working software frequently (weeks, not months)
   → Ship small, ship often. 2-week sprints, not 6-month releases.

2. Welcome changing requirements, even late in development
   → Don't fight scope changes — plan for them. That's why sprints are short.

3. Working software is the primary measure of progress‼️
   → Not story points completed, not lines of code, not tickets closed.
     Did the user get something useful? That's progress.

4. The best architectures emerge from self-organizing teams
   → Devs should have a say in technical decisions, not just PMs.

5. At regular intervals, the team reflects on how to become more effective
   → Retrospectives. The most important ceremony. Actually do them.

6. Simplicity — maximizing the amount of work NOT done — is essential
   → Build the simplest thing that works. YAGNI. MVP first.

7. Business people and developers must work together daily
   → PO is available to answer questions, not just throwing tickets over the wall.
```

### Agile vs Waterfall — when each applies

```text
Waterfall:
  Requirements → Design → Build → Test → Deploy → Maintain
  Each phase completes before the next begins.
  Changes are expensive because you go back to the beginning.

  When waterfall works:
  - Requirements are truly fixed (rare in software)
  - Regulatory environments requiring sign-off at each phase
  - Hardware projects where changes are physically expensive
  - Well-understood problems with proven solutions

Agile:
  Plan → Build → Test → Review → Repeat (every 2 weeks)
  Each sprint delivers a potentially shippable increment.
  Changes are cheap because you're always near the start of a cycle.

  When agile works:
  - Requirements will evolve (almost all software projects)
  - You need user feedback to know if you're building the right thing
  - The technology or domain is uncertain (exploration needed)
  - You want to deliver value early and continuously

‼️ Most real teams are somewhere in between.
   Even "waterfall" projects do iterative development within phases.
   Even "agile" projects have some upfront design and planning.
   The question isn't "which methodology" — it's "how much upfront vs iterative."‼️
```

### Common misconceptions

```text
Misconception: "Agile means no planning"
Reality:       Agile has MORE planning, just in smaller batches.
               Sprint planning every 2 weeks, backlog grooming, roadmap reviews.
               You plan just enough for the next sprint, not 6 months ahead.

Misconception: "Agile means no documentation"
Reality:       Agile says "working software over comprehensive documentation."
               You still write docs — design docs, ADRs, runbooks.
               You just don't write 200-page requirements specs nobody reads.

Misconception: "Agile means no deadlines"
Reality:       Agile teams ship every sprint. That IS a deadline.
               For larger milestones, you use velocity to forecast release dates.
               You just don't promise exact dates 6 months out.

Misconception: "Story points = hours"
Reality:       Story points measure COMPLEXITY, not time.‼️
               A 5-point story isn't 5 hours — it's 5x more complex than a 1-point story.
               Different devs might take different hours, but complexity is the same.

Misconception: "The Scrum Master is the team's boss"
Reality:       The Scrum Master is a servant-leader/facilitator.
               They remove blockers, facilitate ceremonies, coach the team.
               They do NOT assign work or manage performance.
```

---

## 2. Scrum Framework

### Scrum roles

```text
‼️ Three Scrum roles:

Product Owner (PO):
  - Owns the product backlog (what to build and in what order)
  - Represents the customer/business
  - Makes prioritization decisions (this feature before that one)
  - Writes or approves user stories and acceptance criteria
  - Available to the team for questions and clarifications
  - Says YES or NO to "is this story done" at sprint review
  - ONE person, not a committee (even if they consult stakeholders)

  In practice (frontend dev perspective):
  - PO is the person you ask "what exactly should this button do?"
  - PO prioritizes the backlog — you pull from the top
  - If PO isn't available to clarify requirements → that's a blocker
  - You should push back on PO when scope is too big or unclear

Scrum Master (SM):
  - Facilitates Scrum ceremonies (planning, standup, retro, review)
  - Removes impediments/blockers for the team
  - Shields the team from outside interruptions
  - Coaches the team on Scrum practices
  - Is NOT a project manager, NOT a tech lead, NOT a boss
  - Does NOT assign tasks

  In practice:
  - SM runs standup, makes sure it stays on track (15 min max)
  - SM notices when someone is blocked and helps resolve it
  - SM facilitates retros and tracks action items
  - Often this role is shared/rotated in mature teams

Development Team:
  - Cross-functional: devs, QA, designers, anyone building the product
  - Self-organizing: the TEAM decides who works on what
  - Typically 3-9 people (5-7 ideal)
  - Everyone is accountable for the sprint goal, not just "my tickets"‼️
  - Team estimates work, not management

  In practice (as a senior frontend dev):
  - You pick your own tickets from the sprint backlog
  - You help estimate stories during planning and refinement
  - You raise blockers and risks early
  - You review others' code, help juniors, and participate in all ceremonies
  - You own quality — "it works on my machine" is not done
```

### Scrum events / ceremonies

```text
‼️ Five Scrum Events:

1. Sprint Planning (start of sprint)
   Duration: 2-4 hours for a 2-week sprint
   Who: PO + Scrum Master + Dev Team
   What happens:
     - PO presents the top-priority stories from the backlog
     - Team discusses, asks questions, identifies unknowns
     - Team estimates stories (if not already estimated in refinement)
     - Team selects stories they can commit to for the sprint
     - Team agrees on a sprint goal ("This sprint we will deliver X")
     - Large stories are broken into tasks/sub-tasks

2. Daily Standup (every day, same time)
   Duration: 15 minutes MAX
   Who: Dev Team (SM facilitates, PO optional)
   What happens:
     Each person answers three questions:
     - What did I do yesterday?
     - What am I doing today?
     - Do I have any blockers?
   What does NOT happen:
     - Problem-solving (take it offline)
     - Status reporting to management
     - Going over 15 minutes
     - Deep technical discussions

3. Sprint Review / Demo (end of sprint)
   Duration: 1-2 hours for a 2-week sprint
   Who: Dev Team + PO + Stakeholders + anyone interested
   What happens:
     - Team demos COMPLETED stories (meets Definition of Done)
     - PO accepts or rejects stories
     - Stakeholders give feedback
     - PO updates backlog based on feedback
     - Celebrate what was accomplished

4. Sprint Retrospective (end of sprint, after review)
   Duration: 1-1.5 hours for a 2-week sprint
   Who: Dev Team + Scrum Master (PO optional)
   What happens:
     - What went well? (keep doing)
     - What didn't go well? (stop doing / improve)
     - What will we try next sprint? (action items with owners)
   ‼️ This is the most important ceremony.
      Without retros, you repeat the same mistakes every sprint.

5. Backlog Refinement / Grooming (mid-sprint)
   Duration: 1-2 hours
   Who: PO + Dev Team (some or all)
   What happens:
     - Review upcoming stories (1-2 sprints ahead)‼️
     - Clarify requirements, write acceptance criteria
     - Estimate stories (story points)
     - Split large stories into smaller ones
     - Identify dependencies and risks
```

### Scrum artifacts

```text
‼️ Three Scrum Artifacts:

1. Product Backlog:
   - Ordered list of EVERYTHING that might be needed in the product
   - PO owns it, but team contributes (adding tech debt, bugs, improvements)
   - Items at the top are refined, estimated, and ready to pull into a sprint
   - Items at the bottom are vague ideas ("we might need this someday")
   - A living document — constantly re-prioritized

2. Sprint Backlog:
   - The subset of product backlog items selected for THIS sprint
   - Plus the plan for delivering them (tasks, sub-tasks)
   - Owned by the dev team
   - Should NOT change mid-sprint (with rare exceptions)
   - Visible to everyone (the sprint board)

3. Increment:‼️
   - The sum of all completed backlog items at the end of a sprint
   - Must meet the Definition of Done
   - Must be potentially releasable (doesn't mean you MUST release)
   - Each sprint's increment builds on previous increments
```

### Sprint cadence

```text
Typical 2-week sprint calendar:

  Week 1:
    Monday:    Sprint Planning (morning, 2-4 hours)
    Mon-Fri:   Development work + daily standups (15 min)
    Wednesday: Backlog Refinement (1 hour, prepare for next sprint)

  Week 2:
    Mon-Wed:   Development work + daily standups
    Thursday:  Code freeze (finish PRs, QA, bug fixes)
    Friday:    Sprint Review / Demo (1 hour)
               Sprint Retrospective (1 hour)
               Sprint ends

  ‼️ 2-week sprints are the most common. Other options:
     1-week:  Too short for most teams. Little time for actual work.
     3-week:  Awkward. Doesn't align with months.
     4-week:  Too long. Feedback loop is slow. Feels like mini-waterfall.

  Some teams do sprint planning on Friday and start the sprint Monday.
  The exact schedule varies — what matters is consistency.
```

### Definition of Done (DoD) and Definition of Ready (DoR)

```text
‼️ Definition of Done (DoD) — when is a story DONE?‼️

  A story is done when ALL of these are true (example):
  ✓ Code is written and follows team coding standards
  ✓ Unit tests written and passing (>80% coverage for new code)
  ✓ Integration tests written for critical paths
  ✓ Code reviewed and approved by at least 1 team member
  ✓ PR merged to main branch
  ✓ Deployed to staging environment and verified
  ✓ No known bugs or regressions
  ✓ Acceptance criteria verified (by dev, QA, or PO)
  ✓ Documentation updated (if applicable)
  ✓ Accessibility requirements met (WCAG 2.1 AA)
  ✓ No console errors or warnings
  ✓ Works on supported browsers (Chrome, Firefox, Safari, Edge)

  ‼️ "Done" means shippable. If you need more work before it can go to
     production, it's NOT done. "Dev complete" is not "done."‼️

‼️ Definition of Ready (DoR) — when is a story READY to work on?

  A story is ready when:
  ✓ User story is clearly written (who, what, why)
  ✓ Acceptance criteria are defined and testable
  ✓ Story has been estimated by the team
  ✓ Dependencies identified (APIs, designs, other teams)
  ✓ Design mockups/wireframes available (if UI work)

     Wireframe vs Mockup vs Prototype — what's the difference:‼️

       Wireframe = a rough sketch/blueprint of a page layout.
         Just boxes, lines, and placeholder text. No colors, no images.
         Shows WHERE things go (navigation here, button there, form here).
         Think of it like a floor plan for a house.

       Mockup = a realistic, high-fidelity visual design.
         Includes actual colors, fonts, images, branding.
         Shows exactly what the final product will LOOK like.
         Think of it like a 3D rendered image of the finished house.

       Prototype = a clickable mockup where you can actually interact
         (click buttons, navigate between pages, see transitions).
         Looks and feels like the real thing, but no real code behind it.

       The workflow:
         Wireframe (rough layout) → Mockup (polished design) → Prototype (interactive) → Code

       Example — a login page:

         Wireframe:                    Mockup:
         ┌─────────────────┐          ┌─────────────────────┐
         │  [ Logo ]       │          │  🔵 MyApp           │
         │                 │          │                     │
         │  [___________]  │          │  Email              │
         │  [___________]  │          │  ┌─────────────┐   │
         │  [ Login btn ]  │          │  │ john@email  │   │
         │                 │          │  └─────────────┘   │
         │  forgot pass?   │          │  Password           │
         └─────────────────┘          │  ┌─────────────┐   │
                                      │  │ ••••••••    │   │
         Gray boxes, no style         │  └─────────────┘   │
         Just layout + placement      │  ┌─────────────┐   │
                                      │  │  Log In  🔵 │   │
                                      │  └─────────────┘   │
                                      │  Forgot password?   │
                                      └─────────────────────┘
                                      Real colors, fonts, spacing
                                      Looks like the final product

       Tools: Figma (all three), Balsamiq (wireframes), Sketch (mockups)
       As a developer, you usually receive mockups or prototypes from
       the design team and build the actual UI from those.

  ✓ Technical approach discussed (if complex)
  ✓ Story is small enough to complete in one sprint
  ✓ PO is available to answer questions

  If a story doesn't meet DoR, it should NOT be pulled into a sprint.
  This prevents the "I can't work on this because I don't know what to build" problem.
```

---

## 3. Kanban

### When to use Kanban vs Scrum

```text
Use Scrum when:
  - You have a defined team working on a product
  - Work can be planned in 2-week increments
  - You want structured ceremonies and cadence
  - The team is new to agile (Scrum's structure helps)
  - You need to commit to delivering specific things by specific dates

Use Kanban when:‼️
  - Work is unpredictable (support, ops, bug fixing)
  - Items vary wildly in size and priority
  - You want continuous flow, not sprints
  - The team is mature and self-organizing
  - You need to respond to incoming work quickly (interrupts)

Use Scrumban (hybrid) when:
  - You have sprint cadence but also reactive work
  - You want WIP limits with sprint structure
  - Many teams actually do this without realizing it

‼️ Most frontend teams doing feature development use Scrum.
   DevOps/SRE teams often use Kanban (reactive, interrupt-driven work).‼️
   Support teams almost always use Kanban.‼️
```

### WIP limits (Work In Progress)

```text
‼️ WIP Limits — the core Kanban concept.

  Limit the number of items that can be in each column at once.

  Example board with WIP limits:
  ┌──────────┬──────────────┬──────────────┬──────────┬──────────┐
  │ To Do    │ In Progress  │ In Review    │ QA       │ Done     │
  │ (no WIP) │ (WIP: 3)     │ (WIP: 2)     │ (WIP: 2) │ (no WIP) │
  ├──────────┼──────────────┼──────────────┼──────────┼──────────┤
  │ Story A  │ Story D      │ Story G      │ Story I  │ Story K  │
  │ Story B  │ Story E      │ Story H      │ Story J  │ Story L  │
  │ Story C  │ Story F      │              │          │ Story M  │
  │          │ ⚠️ AT LIMIT  │              │          │          │
  └──────────┴──────────────┴──────────────┴──────────┴──────────┘

  If In Progress has WIP limit of 3 and there are already 3 items:
  → You CANNOT start a new item until one moves to "In Review"
  → This forces you to FINISH work before starting new work
  → It exposes bottlenecks (if Review column is always full, you need more reviewers)

  ‼️ Without WIP limits, developers start 5 things and finish none.
     "Stop starting, start finishing."

  Typical WIP limits:
  - Per column: 2-3 items per team member assigned to that stage
  - Per person: 1-2 items at a time (single-tasking is more productive)
  - Start low, adjust based on what causes flow problems
```

### Pull system and continuous flow

```text
Pull System:
  Traditional (push): Manager assigns work TO people.
  Kanban (pull):      People PULL work when they have capacity.

  The process:
  1. Developer finishes an item → it moves to the next column
  2. Developer has capacity (under WIP limit)
  3. Developer pulls the TOP item from the previous column
  4. Always pull from the top (highest priority)

Continuous Flow:
  Unlike Scrum (which batches work into sprints), Kanban flows continuously.
  - No sprint boundaries
  - No sprint planning or sprint review (but you CAN have cadence meetings)
  - Items are done when they're done, released when they're ready
  - Prioritization happens continuously (PO/PM reorders the backlog)

  ‼️ This doesn't mean "no process." Kanban has strict rules:
     1. Visualize the workflow (the board)
     2. Limit WIP
     3. Manage flow (measure and optimize)
     4. Make process policies explicit
     5. Implement feedback loops
     6. Improve collaboratively
```

### Cycle time vs lead time

```text
‼️ Two key Kanban metrics:

Lead Time:
  Time from when a request is MADE to when it's DELIVERED.
  (Customer perspective — "how long until I get my feature?")

  Clock starts: Item added to backlog
  Clock stops:  Item deployed to production

Cycle Time:
  Time from when WORK BEGINS to when it's DELIVERED.
  (Team perspective — "how long does it take us to build something?")

  Clock starts: Item moved to "In Progress"
  Clock stops:  Item moved to "Done"

Example:
  Day 1:  PO creates ticket in backlog               ← Lead time starts
  Day 5:  Developer starts working on ticket          ← Cycle time starts
  Day 7:  Developer finishes, moves to "In Review"
  Day 8:  Reviewed, moves to "QA"
  Day 9:  QA passes, deployed, moved to "Done"       ← Both clocks stop

  Lead time = 9 days
  Cycle time = 4 days (day 5 → day 9)

  ‼️ Lead time includes waiting time in the backlog.
     Cycle time measures only active work time.
     Track BOTH. Large gap between them = items waiting too long in backlog.
```

### Cumulative flow diagram

```text
Cumulative Flow Diagram (CFD):
  Stacked area chart showing how many items are in each state over time.

  Items │
    30  │                              ████████ Done
        │                     ████████████████
    20  │            ████████████████████████████
        │      ██████████████████████████████████ QA
    10  │  ████████████████████████████████████████
        │████████████████████████████████████████████ In Progress
     0  └──────────────────────────────────────────
        Sprint 1    Sprint 2    Sprint 3    Sprint 4

  What to look for:
  - Bands should be roughly parallel (stable flow)
  - Widening band = bottleneck (work accumulating in that state)
  - "In Progress" band getting wider = WIP limits too high or not enforced
  - "Done" band growing steadily = healthy throughput

  ‼️ If the "In Review" band keeps widening, your bottleneck is code review.
     Fix: assign more reviewers, pair review, smaller PRs.
```

---

## 4. Scaled Agile

### SAFe (Scaled Agile Framework)

```text
‼️ SAFe — when one Scrum team isn't enough.

  SAFe is used when 50-150+ engineers need to coordinate.
  It's the most common scaling framework (also the most controversial).‼️

  Key SAFe concepts:

  Agile Release Train (ART):
  - A group of 5-12 teams that plan and deliver together
  - Aligned to a shared mission/value stream
  - Typically 50-125 people
  - Has a Release Train Engineer (RTE) who coordinates across teams

  Program Increment (PI):
  - A timebox of 8-12 weeks (typically 5 sprints of 2 weeks each)
  - All teams in the ART plan together at PI Planning
  - The 5th sprint is often an "Innovation and Planning" sprint‼️
    (hackathon, tech debt, planning for next PI)

  PI Planning:
  - Big-room planning event (2 days, all teams together)
  - Teams see dependencies across teams
  - Teams commit to PI Objectives (what they'll deliver in the PI)
  - Program Board shows features and dependencies visually

  Program Board (physical or digital):
  ┌──────────┬──────────┬──────────┬──────────┬──────────┐
  │          │ Sprint 1 │ Sprint 2 │ Sprint 3 │ Sprint 4 │
  ├──────────┼──────────┼──────────┼──────────┼──────────┤
  │ Team A   │ Feature1 │          │ Feature3 │          │
  │          │          │    ↓ dependency                 │
  │ Team B   │          │ Feature2 │→Feature4 │          │
  │          │          │          │          │          │
  │ Team C   │ Feature5 │ Feature5 │          │ Feature6 │
  └──────────┴──────────┴──────────┴──────────┴──────────┘
  Red strings/arrows = cross-team dependencies (risky!)

  ‼️ As a developer, you'll encounter SAFe if you work at a large company.
     Your daily work is still Scrum within your team.
     The difference: you also attend PI Planning (every 10-12 weeks)
     and need to coordinate with other teams on shared dependencies.
```

### LeSS (Large-Scale Scrum)

```text
LeSS — simpler alternative to SAFe:
  - Multiple teams working on ONE product with ONE product backlog
  - One Product Owner for all teams
  - Joint Sprint Planning, joint Sprint Review
  - Each team does their own standup and retro
  - Max 8 teams (LeSS) or 8+ teams (LeSS Huge)

  Key difference from SAFe:
  SAFe adds layers of process and roles (architects, RTEs, solution trains)
  LeSS tries to keep Scrum simple and just scale it

  ‼️ LeSS is less common than SAFe in industry but more faithful to Scrum values.
```

### When scaling is needed and common pitfalls

```text
When you need scaling:
  - More than one team working on the same product
  - Cross-team dependencies (Team A can't finish without Team B's API)
  - Coordinated releases (multiple teams ship together)
  - Shared codebase or platform

Common pitfalls of scaling:
  ‼️ "We need SAFe" is often a symptom, not a solution.‼️

  1. Scaling too early: One team of 8 doesn't need SAFe. Just do Scrum.
  2. Adding process instead of fixing architecture: If teams are blocked
     on each other, maybe the codebase needs better boundaries (microservices,
     module boundaries) instead of more coordination meetings.
  3. PI Planning becomes theater: Teams commit to objectives but nobody
     believes them. Objectives are too vague to be meaningful.
  4. "Agile in name only": SAFe at scale often becomes waterfall
     with agile terminology. ‼️ 10-week planning cycles with fixed scope
     IS waterfall, regardless of what you call it.
  5. Too many coordination roles: RTEs, Solution Train Engineers,
     System Architects — overhead grows, actual development shrinks.

  ‼️ Before scaling, ask: Can we reorganize teams to reduce dependencies?
     The best scaling strategy is often making teams more independent.
```

---

# Part 2 — Jira Deep Dive

---

## 5. Jira Concepts

### Projects and boards

```text
Project:
  A container for all issues related to a product or team.
  Has a unique key (e.g., "FE" for Frontend, "PLAT" for Platform).
  Every issue gets a key: FE-123, PLAT-456.

  Project types:
  - Team-managed (simplified, team controls their own config)
  - Company-managed (admin controls, shared schemes across projects)

  ‼️ Most enterprise teams use company-managed projects.
     Team-managed is for small teams who want quick setup.

Board:
  A visual representation of issues in a project.
  Two types:

  Scrum Board:
  - Has sprints (backlog → sprint → board → done)
  - Shows only the current sprint's issues
  - Has a backlog view for future sprints
  - Sprint reports, velocity charts, burndown

  Kanban Board:
  - No sprints, continuous flow
  - Shows all items on the board
  - WIP limits on columns
  - Cumulative flow diagram, control chart

  ‼️ One project can have multiple boards.‼️
     Example: "Frontend" project has:
     - Main Scrum board (for sprint work)
     - Bug triage Kanban board (for incoming bugs)
     - Tech debt Kanban board (for improvement work)
```

### Issue types and hierarchy

```text
‼️ Jira Issue Hierarchy:

  Initiative  (optional — strategic goals spanning quarters/years)
     │
     ├── Epic  (large body of work spanning multiple sprints)
     │    │
     │    ├── Story  (user-facing functionality, deliverable in one sprint)
     │    │    │
     │    │    ├── Sub-task  (breakdown of a story into work items)
     │    │    └── Sub-task
     │    │
     │    ├── Story
     │    ├── Task  (technical work not directly user-facing)
     │    ├── Bug   (defect in existing functionality)
     │    └── Spike (time-boxed research/investigation)
     │
     └── Epic
          └── ...

Issue Types Explained:

  Epic:
  - Large feature that takes multiple sprints to complete
  - Example: "User Authentication System"
  - Contains multiple stories, tasks, and bugs
  - Has start/end dates, tracks progress as child issues complete
  - Appears on the roadmap view

  Story (User Story):
  - A discrete piece of user-facing value
  - Completable in one sprint
  - Written from user's perspective: "As a [user], I want [goal]..."
  - Example: "As a user, I want to reset my password via email"
  - Has story points for estimation

  Task:
  - Technical work that isn't directly user-facing
  - Example: "Set up CI/CD pipeline for frontend repo"
  - Example: "Upgrade React from v17 to v18"
  - Still estimated, still tracked on the board

  Sub-task:
  - Breakdown of a story or task into smaller pieces
  - Example: Story "Password reset" has sub-tasks:
    - "Build password reset form UI"
    - "Create reset email template"
    - "Implement reset token API integration"
    - "Write unit tests for password reset flow"
  - Tracked within the parent issue

  Bug:
  - Defect in existing functionality
  - Example: "Login button doesn't respond on mobile Safari"
  - Has severity/priority fields
  - May or may not be tied to an epic

  Spike:
  - Time-boxed research or investigation
  - Example: "Spike: Evaluate chart libraries for dashboard (2 days max)"
  - Output is a DECISION or DOCUMENT, not working code
  - Always time-boxed: "Spend no more than X hours/days researching"‼️
  - ‼️ If the spike produces code, it was a task, not a spike
```

### Issue fields

```text
Key fields on every Jira issue:

  Summary:         Short title. "Implement password reset flow" (not "password")
  Description:     Detailed explanation, context, user story, links
  Issue Type:      Story, Task, Bug, Spike, Sub-task
  Status:          To Do, In Progress, In Review, QA, Done
  Priority:        Highest, High, Medium, Low, Lowest
  Assignee:        Who is working on it RIGHT NOW
  Reporter:        Who created it
  Epic Link:       Which epic this belongs to
  Sprint:          Which sprint (if Scrum)
  Story Points:    Complexity estimate (Fibonacci: 1, 2, 3, 5, 8, 13)
  Labels:          Free-form tags (e.g., "frontend", "tech-debt", "accessibility")
  Components:      Structural categories (e.g., "Auth", "Dashboard", "API")
  Fix Version:     Which release this is targeting (e.g., "v2.5.0")‼️
  Due Date:        When this needs to be done (if applicable)
  Linked Issues:   Related issues (blocks, is blocked by, duplicates)‼️
  Acceptance Criteria: What must be true for the story to be "done"

  ‼️ Fields you should ALWAYS fill in:
     - Summary (clear, descriptive)
     - Description (context, requirements)
     - Acceptance criteria (testable conditions)
     - Story points (estimated in refinement)
     - Epic link (so it's tracked against the larger feature)
     - Priority (so the team knows what matters most)

  Fields that are often abused:
  - Labels: Too many labels = nobody uses them. Keep it to 5-10 standard labels.
  - Components: Useful for filtering but only if consistently used.
  - Fix Version: Only matters if you do versioned releases.‼️
```

---

## 6. Writing Good Tickets

### User story format

```text
‼️ User Story Template:

  As a [type of user],
  I want [goal/desire],
  so that [benefit/reason].

  Examples:

  GOOD:
  "As a registered user,
   I want to reset my password via email,
   so that I can regain access to my account when I forget my password."

  "As a team admin,
   I want to invite members by email address,
   so that I can onboard new team members without them needing to self-register."

  BAD:
  "As a user, I want a button."
    → What button? What does it do? Why?

  "Implement password reset."
    → Not a user story. Who benefits? Why do they need it?

  "As a developer, I want to refactor the auth module."
    → This is a Task, not a user story. Users don't care about refactoring.
    → Better as a Task: "Refactor auth module to support OAuth2 providers"
```

### Acceptance criteria — Given/When/Then

```text
‼️ Acceptance Criteria — when is this story DONE?

  Use Given/When/Then format (Gherkin syntax):

  Story: "As a user, I want to reset my password via email"

  Acceptance Criteria:

  AC1: Happy path
    Given I am on the login page
    When I click "Forgot Password"
    Then I see a form asking for my email address

  AC2: Email sent
    Given I have entered a valid registered email
    When I click "Send Reset Link"
    Then I see a confirmation message "Reset link sent to your email"
    And I receive an email with a password reset link within 2 minutes

  AC3: Invalid email
    Given I have entered an email that is NOT registered
    When I click "Send Reset Link"
    Then I see the SAME confirmation message (don't reveal if email exists)

  AC4: Reset link
    Given I have received a reset email
    When I click the reset link within 24 hours
    Then I see a form to enter a new password

  AC5: Expired link
    Given I have received a reset email
    When I click the reset link AFTER 24 hours
    Then I see a message "This link has expired. Please request a new one."

  AC6: Password requirements
    Given I am on the password reset form
    When I enter a new password
    Then the password must be at least 8 characters
    And contain at least one uppercase letter, one number, and one special character

  ‼️ Good acceptance criteria are:
     - Testable (a QA engineer or automated test can verify each one)
     - Specific (no ambiguity — "appropriate message" is BAD, specify the message)
     - Complete (cover happy path, error cases, edge cases)‼️
     - Independent (each criterion can be verified on its own)
```

### Good vs bad ticket examples

```text
‼️ BAD Ticket:

  Summary: Fix the dashboard
  Description: The dashboard is broken. Please fix.
  Acceptance Criteria: (none)
  Story Points: (none)

  Problems:
  - What's broken? Which dashboard? What's the expected behavior?
  - No steps to reproduce
  - No acceptance criteria — how do we know it's fixed?
  - Not estimated — can't plan capacity
  - No screenshots, no environment info, no error messages

‼️ GOOD Bug Ticket:

  Summary: Dashboard chart fails to load when date range exceeds 90 days
  Type: Bug
  Priority: High
  Epic: FE-200 (Dashboard Improvements)
  Components: Dashboard, Charts
  Labels: regression, production

  Description:
  The revenue chart on the main dashboard shows a blank white area with
  a console error when the user selects a date range greater than 90 days.
  This was working in v2.3.0 and broke in v2.4.0 (likely related to FE-189
  chart library upgrade).

  Steps to Reproduce:
  1. Log in as any user with dashboard access
  2. Navigate to Dashboard → Revenue
  3. Set date range to "Last 6 months"
  4. Observe: chart area is blank, console shows "TypeError: Cannot read
     property 'map' of undefined" in ChartDataTransformer.ts:45

  Expected Behavior:
  Chart renders with data points for the selected date range.

  Actual Behavior:
  Blank chart area. Console error. No data displayed.

  Environment:
  - Chrome 120, macOS Sonoma
  - Also reproduced on Firefox 121
  - Production and Staging environments

  Acceptance Criteria:
  AC1: Given I select any date range (including > 90 days),
       When the chart loads, Then data is displayed correctly
  AC2: Given the API returns no data for the range,
       When the chart loads, Then an empty state message is shown
  AC3: No console errors for any valid date range

  Screenshots: [attached]

‼️ GOOD Story Ticket:

  Summary: Add bulk export of filtered search results as CSV
  Type: Story
  Priority: Medium
  Epic: FE-300 (Search Improvements)
  Story Points: 5

  Description:
  As a team admin,
  I want to export my filtered search results as a CSV file,
  so that I can analyze data in Excel and share it with stakeholders
  who don't have access to our platform.

  Context:
  Currently users can only view search results in the UI. Several enterprise
  customers have requested export functionality (see Slack thread #customer-feedback,
  Jan 15). Design mockups: [Figma link]

  Technical Notes:
  - API endpoint already exists: GET /api/search/export?format=csv
  - Need to pass current filters as query params
  - Max export size: 10,000 rows (API limit)
  - Show progress indicator for large exports (> 1000 rows)

  Acceptance Criteria:
  AC1: Given I have search results displayed with active filters,
       When I click "Export CSV",
       Then a CSV file downloads containing the same results I see on screen
  AC2: Given my results exceed 10,000 rows,
       When I click "Export CSV",
       Then I see a message "Export limited to 10,000 rows. Please narrow your filters."
  AC3: Given I click "Export CSV",
       When the export is processing,
       Then I see a progress indicator and can continue using the app
  AC4: CSV includes columns: Name, Email, Status, Created Date, Last Active
  AC5: CSV filename format: search-export-YYYY-MM-DD.csv

  Out of Scope:
  - PDF export (future story)
  - Scheduled/recurring exports (future epic)
  - Export of individual record details
```

### Technical stories vs user stories

```text
Technical stories:
  Work that doesn't directly deliver user value but is necessary.‼️

  These are typically Tasks, not User Stories:‼️

  "Upgrade React from v17 to v18"
  "Set up Datadog RUM for frontend monitoring"
  "Migrate from Webpack to Vite"
  "Add TypeScript strict mode to auth module"
  "Reduce bundle size by implementing code splitting"

  ‼️ How to write technical tasks so the PO understands:

  BAD:  "Refactor the auth module"
        (PO thinks: "Why? What value does this provide?")

  GOOD: "Refactor auth module to support multiple OAuth providers"
        Context: "Currently our auth only supports Google login. Adding
        GitHub and Microsoft login (see Epic FE-400) requires restructuring
        the auth flow. This refactor unblocks the next 3 login provider stories."
        Business value: "Without this, adding each new provider takes 2 sprints.
        After this, each new provider takes 2 days."

  ‼️ Always explain the WHY for technical work:
     - "This reduces page load time from 8s to 2s" (user impact)
     - "This unblocks Feature X" (dependency)
     - "This reduces production errors by ~40%" (reliability)
     - "This saves 2 hours/week of developer time on deploys" (efficiency)
```

### Spike tickets

```text
‼️ Spike = time-boxed research.

  Spike Template:

  Summary: Spike: Evaluate state management solutions for dashboard (3 days)
  Type: Spike (or Task with "spike" label)
  Story Points: 5 (or use time-box: "3 days max")
  Epic: FE-500 (Dashboard Rewrite)

  Description:
  We need to decide on a state management approach for the new dashboard.
  Current options under consideration:
  1. React Query + Context (minimal global state)
  2. Zustand (lightweight store)
  3. Redux Toolkit (existing team knowledge)

  Questions to Answer:‼️
  - Which solution handles our data fetching patterns best?
  - Which has the smallest bundle impact?
  - Which integrates best with our existing codebase?
  - What's the learning curve for the team?

  Time Box: 3 working days maximum.‼️

  Expected Output:
  - Confluence page with comparison matrix
  - Working proof-of-concept for the top 2 options
  - Recommendation with rationale
  - ADR (Architecture Decision Record) if decision is made

  Acceptance Criteria:
  AC1: Confluence page published with comparison of all three options
  AC2: At least one working proof-of-concept committed to spike/FE-501 branch
  AC3: Recommendation presented at team refinement session
  AC4: Time-box respected (stop after 3 days even if inconclusive)

  ‼️ Key spike rules:
     - Always time-boxed. If you don't know the answer in 3 days, you know
       enough to make a decision or scope a follow-up spike.
     - Output is knowledge/decision, not production code.
     - If the spike produces shippable code, it was a task, not a spike.
     - Don't spike something you could just prototype (if it's small, just try it).
```

---

## 7. Workflows & Statuses

### Default Jira workflow

```text
‼️ Typical Jira Workflow for Development Teams:

  To Do → In Progress → In Review → QA → Done

  Detailed:

  ┌─────────┐    ┌─────────────┐    ┌───────────┐    ┌─────┐    ┌──────┐
  │ To Do   │───→│ In Progress │───→│ In Review │───→│ QA  │───→│ Done │
  │         │    │             │    │           │    │     │    │      │
  │ Backlog │    │ Actively    │    │ PR open,  │    │ QA  │    │ DoD  │
  │ items   │    │ coding      │    │ awaiting  │    │ is  │    │ met  │
  │ ready   │    │             │    │ review    │    │test │    │      │
  │ to pick │    │             │    │           │    │ ing │    │      │
  └─────────┘    └─────────────┘    └───────────┘    └─────┘    └──────┘
                        │                 │               │
                        │                 │               │
                        ←─────────────────┘               │
                        (Changes requested)                │
                        ←─────────────────────────────────┘
                        (QA found bugs — back to In Progress)

  Some teams add more columns:
  - "Blocked" (waiting on external dependency)
  - "Ready for QA" (code merged, deployed to QA environment)
  - "UAT" (user acceptance testing by PO/stakeholders)‼️
  - "Ready to Deploy" (approved, waiting for release window)

  ‼️ Status Categories (Jira groups statuses into 3 categories):
     Blue  (To Do):       Backlog, To Do, Open
     Yellow (In Progress): In Progress, In Review, QA, Blocked
     Green (Done):        Done, Closed, Released

     These categories drive Jira's charts and reports.
     Even custom statuses must map to one of these three categories.
```

### Custom workflows — how they map to your process

```text
Example: Frontend team workflow mapped to reality:

  Status:          What's actually happening:
  ─────────────────────────────────────────────────────────
  Backlog          PO has written the story, not yet refined
  Ready            Refined, estimated, meets Definition of Ready
  To Do            In the current sprint, not yet started
  In Progress      Developer actively coding
  In Review        PR is open, assigned reviewers
  Changes Req'd    PR has feedback, developer is addressing comments
  QA               Deployed to staging, QA is testing
  QA Failed        QA found issues, back to developer
  UAT              PO/stakeholders are verifying the feature‼️
  Done             All AC met, merged, deployed, PO accepted

  ‼️ Your workflow should match how your team ACTUALLY works.
     If you never use "QA Failed" because bugs just go back to "In Progress,"
     then remove "QA Failed" from your workflow. Unused statuses confuse people.

Workflow transitions and rules:

  Transition: "To Do" → "In Progress"
  Condition:  Story must have an assignee
  Effect:     Assignee is set to current user (auto-assign)

  Transition: "In Progress" → "In Review"
  Condition:  Must have a linked pull request (if GitHub/GitLab integration)
  Effect:     Sends Slack notification to #dev-team channel

  Transition: "QA" → "Done"
  Condition:  Must be approved by someone with QA role
  Validator:  All sub-tasks must be in "Done" status
  Effect:     Resolution set to "Done"

  ‼️ Don't over-engineer workflows with too many rules.
     If a transition requires 5 conditions, developers will work around it.
     Make the workflow smooth, not bureaucratic.
```

---

## 8. Sprint Management

### Creating and running sprints

```text
Sprint lifecycle in Jira:

  1. Create Sprint:
     Backlog view → click "Create Sprint"
     A new sprint appears above the backlog
     Drag stories from backlog into the sprint

  2. Plan Sprint:
     During Sprint Planning ceremony:
     - PO presents prioritized stories
     - Team estimates (if not done in refinement)
     - Team selects stories they can commit to
     - Set sprint goal: "Deliver password reset and CSV export"
     - Set sprint dates: Aug 22 – Sep 4 (2 weeks)

  3. Start Sprint:
     Click "Start Sprint" → Board view shows sprint items
     Each item starts in "To Do" column

  4. During Sprint:
     - Team moves items across the board as work progresses
     - Daily standups review the board
     - Monitor burndown chart for progress
     - Handle blockers and scope questions

  5. Complete Sprint:
     Click "Complete Sprint" at end of sprint
     Jira asks what to do with incomplete items:
     - Move to next sprint (carry over)
     - Move back to backlog
     ‼️ Never leave incomplete items in a closed sprint.
        They'll haunt your velocity metrics.
```

### Sprint goal

```text
‼️ Sprint Goal — the most underrated part of sprint planning.

  What it is:
  A single sentence describing WHAT the sprint will achieve.
  Not a list of tickets — a coherent THEME or OBJECTIVE.‼️

  Good sprint goals:
  "Deliver the core password reset flow so users can recover their accounts"
  "Complete the dashboard chart redesign with new chart library"
  "Ship the bulk export feature for enterprise customers"

  Bad sprint goals:
  "Complete FE-123, FE-124, FE-125, FE-126" (that's just a ticket list)
  "Do frontend work" (meaningless)
  "Fix bugs and do stuff" (no commitment, no focus)

  Why it matters:
  - Gives the team focus and alignment
  - Helps make trade-off decisions: "Does this help the sprint goal?"
  - Allows PO to decide what to cut if the team is behind
  - Makes the sprint review meaningful: "Did we achieve the goal?"

  ‼️ If you can't articulate a sprint goal, the sprint doesn't have focus.
     This often means the backlog is a grab-bag of unrelated items.
```

### Velocity tracking

```text
‼️ Velocity = total story points completed per sprint.

  Sprint 1:  Committed 30 pts, Completed 25 pts  → Velocity: 25
  Sprint 2:  Committed 28 pts, Completed 28 pts  → Velocity: 28
  Sprint 3:  Committed 30 pts, Completed 22 pts  → Velocity: 22
  Sprint 4:  Committed 26 pts, Completed 26 pts  → Velocity: 26

  Average velocity: (25 + 28 + 22 + 26) / 4 = 25.25 pts/sprint

  How to use velocity:
  - Sprint planning: "Our average velocity is 25, so let's commit to ~25 points"
  - Release forecasting: "We have 100 points remaining, at 25/sprint = 4 sprints"
  - Trend analysis: "Velocity dropping? Are stories too big? Are there blockers?"

  ‼️ CRITICAL: Velocity is for the TEAM's planning, NOT for management reporting.‼️

  What velocity is NOT:
  - A performance metric ("Team A does 40 points, Team B does 20 → A is better")
    → WRONG. Points mean different things to different teams.‼️
  - A commitment to management ("You MUST complete 30 points this sprint")
    → WRONG. Velocity is a FORECAST, not a CONTRACT.‼️
  - Comparable across teams
    → WRONG. Team A's 1 point ≠ Team B's 1 point.
  - Something to gamify ("Let's increase velocity 10% each sprint")
    → WRONG. This leads to point inflation, not more output.
```

### Sprint burndown chart

```text
Sprint Burndown Chart:
  Shows remaining work (story points) over the sprint duration.

  Points │
    30   │●
         │  ╲  ideal burndown line (straight diagonal)
    20   │    ╲
         │  ●──●──●  actual (flat = no progress)
    15   │         ╲──●
         │              ╲
    10   │            ●───╲──●
         │                   ╲──●
     5   │                       ╲
         │                    ●───●  actual completed
     0   └──────────────────────────────
         Day1  Day3  Day5  Day7  Day9  Day10

  Reading the burndown:

  Ideal line:     Straight diagonal from total points to 0
  Above the line: Behind schedule (more work remaining than expected)
  Below the line: Ahead of schedule
  Flat sections:  Nobody completing stories (maybe all in progress, nothing done)
  Going UP:       Scope added mid-sprint (bad sign — scope creep)

  ‼️ Common burndown patterns:

  "Late spike" (flat then drops):‼️
  Stories were too big. All finished at the end. Break into smaller stories.

  "Scope creep" (line goes up):
  Items added mid-sprint. Shield the sprint from new work.

  "Healthy" (tracks close to ideal):
  Stories are right-sized, work is progressing steadily.

  "Nothing done until last day":
  Stories aren't being broken into sub-tasks. One big story moves to Done
  on the last day. This defeats the purpose of tracking progress.
```

### Handling unfinished work and mid-sprint changes

```text
Unfinished Work (carry-over):
  Some stories don't finish by sprint end. Options:

  1. Carry over to next sprint (most common):
     - Story keeps its estimate
     - Counts against NEXT sprint's velocity when completed
     - ‼️ Track carry-over rate. If > 20% of stories carry over,
       you're over-committing in sprint planning.

  2. Split the story:
     - Close what's done (e.g., frontend complete, backend pending)
     - Create new story for remaining work
     - Useful when you can demo partial progress

  3. Move back to backlog:
     - Priorities may have changed
     - PO may decide it's no longer important
     - Re-estimate if needed

Mid-Sprint Scope Changes:
  ‼️ Ideally: NO changes to sprint scope after planning.

  Reality: Sometimes things change. How to handle:

  1. Production bug (P1/Critical):
     - Yes, add it to the sprint. Production is on fire.
     - Remove an equal-sized story to maintain scope.
     - Track these interruptions — if frequent, allocate capacity for bugs.

  2. "Quick request" from PO:
     - Push back: "This can go in the next sprint."
     - If it MUST be this sprint: remove something else.
     - Never just "add" work without removing something.‼️

  3. Stakeholder adds "just one more thing":
     - Scrum Master should protect the team.
     - "The sprint is planned. Let's add this to the backlog and prioritize
       it for next sprint."

  ‼️ Every item added mid-sprint makes the sprint goal harder to achieve.
     Track mid-sprint additions as a metric. If it happens every sprint,
     your planning process needs work.
```

---

## 9. Backlog Management

### Backlog grooming / refinement

```text
‼️ Backlog Refinement (also called Grooming):

  When: Mid-sprint (e.g., Wednesday of week 1 in a 2-week sprint)
  Duration: 1-2 hours
  Who: PO + Dev Team (all or senior representatives)
  Facilitator: Scrum Master or PO

  What happens:
  1. PO presents stories planned for the NEXT 1-2 sprints
  2. Team asks clarifying questions
     "What happens if the user has no email on file?"
     "Does this need to work offline?"
     "Are there existing API endpoints for this, or do we need new ones?"
  3. Team identifies missing acceptance criteria
  4. Team estimates stories (story points)
  5. Large stories are split into smaller ones
  6. Dependencies are identified
     "We need the API team to finish their endpoint first"
     "Design hasn't delivered mockups for the settings page yet"
  7. Stories that aren't ready are sent back for more work

  ‼️ Refinement is where you PREVENT bad sprints.
     Stories that go into sprint planning already refined → smooth planning.
     Stories that arrive at planning unrefineed → chaos, arguments, over-commitment.
```

### Prioritization frameworks

```text
‼️ MoSCoW Method:

  Must Have:   Critical for this release. Without it, the release fails.
  Should Have: Important but not critical. Can delay to next release if needed.
  Could Have:  Nice to have. Include if time permits.
  Won't Have:  Explicitly out of scope for this release. (Not "never" — "not now.")

  Example for a Dashboard v2 release:
  Must Have:    Revenue chart, user activity chart, date range filter
  Should Have:  Export to CSV, custom date ranges
  Could Have:   Dark mode for dashboard, chart animations
  Won't Have:   Real-time streaming data, AI insights

‼️ RICE Framework (for comparing features):

  R = Reach:    How many users will this affect? (users/quarter)
  I = Impact:   How much will it impact each user? (3=massive, 2=high, 1=medium, 0.5=low, 0.25=minimal)
  C = Confidence: How sure are we about R, I, and E? (100%, 80%, 50%)
  E = Effort:   Person-months of work

  RICE Score = (Reach × Impact × Confidence) / Effort

  Example:
  Feature A: (1000 × 2 × 80%) / 3 = 533
  Feature B: (5000 × 0.5 × 100%) / 1 = 2500  ← higher priority
  Feature C: (200 × 3 × 50%) / 5 = 60

  ‼️ Value vs Effort Matrix (simplest):

                    High Value
                       │
           Quick Wins  │  Major Projects
           (DO FIRST)  │  (PLAN CAREFULLY)
    ───────────────────┼───────────────────
           Fill-ins    │  Money Pit
           (DO IF TIME)│  (AVOID / DEFER)
                       │
                    Low Value

  High value + Low effort  = Quick wins → do these first
  High value + High effort = Big bets → plan carefully, break into phases
  Low value  + Low effort  = Fill-ins → do when you have spare capacity
  Low value  + High effort = Money pit → usually not worth doing
```

### Story point estimation

```text
‼️ Story Points — measuring COMPLEXITY, not time.

  Fibonacci scale: 1, 2, 3, 5, 8, 13, 21

  What each level means (team must calibrate their own baseline):

  1 point:  Trivial. Copy change, config update, simple CSS fix.
            ~30 min to a few hours of work. Almost no risk.
            Example: "Change button text from 'Submit' to 'Save'"

  2 points: Small. Well-understood, minimal complexity.
            Example: "Add form validation for email field"

  3 points: Medium. Some complexity, well-understood patterns.
            Example: "Build a new form component with 5 fields and validation"

  5 points: Large. Multiple moving parts, some unknowns.
            Example: "Implement file upload with drag-and-drop, preview, and progress"

  8 points: Very large. Significant complexity, cross-cutting concerns.
            Example: "Build a data table with sorting, filtering, pagination, and column resize"
            ‼️ Consider splitting 8-point stories into two 3-5 point stories.

  13 points: Epic-sized. Too big for one sprint.
             ‼️ MUST be split. If a story is 13 points, it's not refined enough.
             "Build the entire user settings page" → split into individual settings sections.

  21 points: Way too big. This is an epic, not a story.
             ‼️ NEVER bring a 21-point story into a sprint.

  ‼️ Key principles:
     - Points are RELATIVE, not absolute. "This is about 2x as complex as that 3-pointer."
     - The team calibrates together. Everyone should roughly agree.
     - Include testing, code review, and deployment in the estimate.
     - Don't estimate in hours. A senior dev might finish in 2 hours what takes
       a junior dev 8 hours, but the COMPLEXITY is the same.
     - If the team can't agree, the story needs more clarity (not more arguing).
```

### Planning poker

```text
Planning Poker — how estimation actually works:

  1. PO presents a story (already refined with acceptance criteria)
  2. Team discusses briefly — clarifying questions only
  3. Each team member privately selects their estimate (1, 2, 3, 5, 8, 13)
     (Using cards, Jira's built-in tool, or apps like Planning Poker Online)
  4. Everyone reveals simultaneously
  5. If estimates differ significantly:
     - Highest and lowest estimators explain their reasoning
     - "I said 8 because I think we need to handle offline sync"
     - "I said 3 because I think we can reuse the existing sync module"
     - Team discusses, then re-estimates
  6. Converge on a number (usually 1-2 rounds)

  ‼️ Why simultaneous reveal?
     If a senior dev says "3" first, everyone else just agrees.
     Simultaneous reveal prevents anchoring bias.

  ‼️ Common patterns:
     - Everyone agrees: Easy, move on.
     - One outlier: That person often knows something others don't. Listen.
     - Split vote (half say 3, half say 8): The story is unclear. Discuss more.
     - Nobody knows: It's a spike. Don't estimate — time-box research first.

  T-Shirt Sizing (alternative for rough estimation):
  XS, S, M, L, XL → map to points later (XS=1, S=2, M=3, L=5, XL=8)
  Useful for initial backlog sizing when you have 50+ stories to estimate quickly.
```

### Backlog health

```text
‼️ Signs of a healthy vs unhealthy backlog:

  Healthy Backlog:
  ✓ Top of backlog is refined (clear stories, AC, estimates)
  ✓ Middle has partially refined items (some detail, rough estimates)
  ✓ Bottom has rough ideas (one-liners, no estimates — that's fine)
  ✓ 2-3 sprints worth of refined stories ready to go
  ✓ Total backlog size: 2-4 months of work at current velocity
  ✓ Regularly pruned — old irrelevant items removed
  ✓ Epics have clear boundaries (start, end, what's in scope)

  Unhealthy Backlog:
  ✗ 500+ items that nobody has looked at in months
  ✗ Top items are vague ("improve performance")
  ✗ No estimates on anything
  ✗ Duplicate stories
  ✗ Epics that have been "in progress" for 6 months
  ✗ Ancient items from 2 years ago that will never be done
  ✗ No clear priority order

  ‼️ Backlog pruning: Every quarter, delete or archive items that:
     - Haven't been touched in 3+ months
     - Are no longer relevant to the product direction
     - Will realistically never be prioritized
     "If we wouldn't start this in the next 3 months, remove it."
```

---

## 10. Jira Filters & JQL

### JQL basics (Jira Query Language)

```text
‼️ JQL — Jira Query Language. SQL-like queries for finding issues.

  Basic syntax: field operator value [AND/OR field operator value]

  Operators:
  =          equals
  !=         not equals
  >          greater than
  <          less than
  >=         greater or equal
  <=         less or equal
  ~          contains (text search)
  !~         does not contain
  IN         in a list
  NOT IN     not in a list
  IS         is (for EMPTY/NULL)
  IS NOT     is not
  WAS        was at some point (historical)
  CHANGED    field changed (historical)

  Special values:
  currentUser()       the logged-in user
  startOfDay()        midnight today
  endOfDay()          end of today
  startOfWeek()       Monday of current week
  startOfMonth()      1st of current month
  startOfSprint()     first day of current sprint
  endOfSprint()       last day of current sprint
  now()               current date/time

  Date math:
  startOfDay(-7d)     7 days ago
  endOfDay(+3d)       3 days from now
  startOfWeek(-1w)    start of last week
  startOfMonth(-2M)   2 months ago
```

### Useful JQL queries — copy-paste ready

```text
‼️ Everyday JQL queries for developers:

  MY WORK:
  ──────────────────────────────────────────────────────────────────
  My open issues:
    assignee = currentUser() AND resolution = Unresolved
    ORDER BY priority DESC, updated DESC

  My issues in current sprint:
    assignee = currentUser() AND sprint in openSprints()

  Issues I reported:
    reporter = currentUser() AND created >= startOfMonth()

  My recently updated issues:
    assignee = currentUser() AND updated >= startOfDay(-7d)
    ORDER BY updated DESC

  SPRINT & TEAM:
  ──────────────────────────────────────────────────────────────────
  All issues in current sprint:
    project = "FE" AND sprint in openSprints()

  Unfinished issues in current sprint:
    project = "FE" AND sprint in openSprints()
    AND status != Done
    ORDER BY status ASC

  Issues completed this sprint:
    project = "FE" AND sprint in openSprints() AND status = Done

  Issues without story points (need estimation):
    project = "FE" AND sprint in openSprints()
    AND "Story Points" is EMPTY AND issuetype in (Story, Task)

  BUGS & QUALITY:
  ──────────────────────────────────────────────────────────────────
  Open bugs by priority:
    project = "FE" AND issuetype = Bug AND resolution = Unresolved
    ORDER BY priority DESC

  Bugs created this week:
    project = "FE" AND issuetype = Bug
    AND created >= startOfWeek()

  Critical/blocker bugs:
    project = "FE" AND issuetype = Bug
    AND priority in (Highest, High) AND resolution = Unresolved

  Bugs older than 30 days:
    project = "FE" AND issuetype = Bug
    AND resolution = Unresolved AND created <= startOfDay(-30d)

  BACKLOG & PLANNING:
  ──────────────────────────────────────────────────────────────────
  Unestimated stories in backlog:
    project = "FE" AND issuetype = Story
    AND "Story Points" is EMPTY AND sprint is EMPTY

  Stories without acceptance criteria:
    project = "FE" AND issuetype = Story
    AND description !~ "acceptance criteria"
    AND description !~ "AC1"

  Epic progress (stories in an epic):
    "Epic Link" = FE-200

  All items in an epic by status:
    "Epic Link" = FE-200 ORDER BY status ASC

  Blocked issues:
    project = "FE" AND status = Blocked

  Issues with no assignee:
    project = "FE" AND sprint in openSprints()
    AND assignee is EMPTY

  HISTORICAL & REPORTING:
  ──────────────────────────────────────────────────────────────────
  Issues completed last sprint:
    project = "FE" AND sprint in closedSprints()
    AND sprint not in openSprints()
    AND status = Done
    ORDER BY resolved DESC

  Issues that changed status this week:
    project = "FE" AND status CHANGED
    AFTER startOfWeek()

  Issues that were reopened:
    project = "FE" AND status WAS Done
    AND status != Done

  Scope creep (added to sprint after it started):
    project = "FE" AND sprint in openSprints()
    AND (sprint CHANGED AFTER startOfSprint())

  CROSS-PROJECT:
  ──────────────────────────────────────────────────────────────────
  All my issues across all projects:
    assignee = currentUser() AND resolution = Unresolved

  All bugs across the org:
    issuetype = Bug AND resolution = Unresolved
    ORDER BY priority DESC, project ASC
```

### Dashboards and gadgets

```text
‼️ Jira Dashboard — your team's mission control.

  Useful dashboard gadgets:

  1. Filter Results:
     Shows a list of issues from a saved JQL filter.
     Use for: "My open items", "Sprint blockers", "Unassigned bugs"

  2. Sprint Burndown:
     Real-time burndown chart for the current sprint.
     Use for: Sprint progress at a glance.

  3. Velocity Chart:
     Bar chart showing committed vs completed story points per sprint.
     Use for: Planning capacity, spotting trends.

  4. Created vs Resolved:
     Line chart showing issues created vs resolved over time.
     Use for: "Are we creating bugs faster than we fix them?"

  5. Pie Chart:
     Breakdown by any field (status, priority, assignee, component).
     Use for: "What's the bug distribution by severity?"

  6. Two-Dimensional Filter Statistics:
     Heatmap of two fields (e.g., Priority × Component).
     Use for: "Which components have the most critical bugs?"

  7. Sprint Health:
     Shows completion % and risk indicators.
     Use for: Quick sprint status check.

  Dashboard setup tips:
  - Create a TEAM dashboard (sprint progress, bug counts, velocity)
  - Create a PERSONAL dashboard (my items, my PRs, recent activity)
  - Share team dashboard in Slack channel or on a wall monitor
  - Review dashboard at standup (walk the board digitally)
```

---

## 11. Jira Workflows for Developers

### Day-to-day developer workflow in Jira

```text
‼️ A developer's typical day with Jira:

  Morning:
  1. Check your dashboard or board for your assigned items
  2. Attend standup — update the team on your progress
  3. If you finished something, move it to the next status
  4. If you're starting something new, pick from the top of "To Do"
     (highest priority first)

  Starting work on a ticket:
  1. Open the ticket, read description and acceptance criteria
  2. Assign yourself (if not already assigned)
  3. Move status: "To Do" → "In Progress"
  4. Create a branch with the ticket key:
     git checkout -b feature/FE-123-password-reset
     ‼️ Branch naming convention: type/TICKET-KEY-short-description
        feature/FE-123-add-csv-export
        bugfix/FE-456-fix-chart-rendering
        spike/FE-789-evaluate-chart-libs

  During development:
  1. Add comments to the ticket as you make progress or discover things
     "Found that the existing API doesn't support pagination. Need to
      coordinate with backend team. Tagging @john.smith"
  2. Update sub-tasks as you complete them
  3. If blocked, move status to "Blocked" and add a comment explaining why
     Link to the blocking issue: "Blocked by PLAT-456"

  Submitting for review:
  1. Push your branch, create PR
     PR title: "FE-123: Implement password reset flow"
     ‼️ Include the ticket key in PR title for automatic linking
  2. Move status: "In Progress" → "In Review"
  3. Add PR link as a comment on the ticket (or let automation do it)
  4. Tag reviewers

  After review:
  - If changes requested: address feedback, push updates, stay in "In Review"
  - If approved: merge PR, move status to "QA" (or "Done" if no QA step)
  - Add a comment: "Merged and deployed to staging. Ready for QA."
```

### Linking issues

```text
Issue Links — connecting related work:

  Link Types:
  ──────────────────────────────────────────────
  "blocks" / "is blocked by"
    FE-123 blocks FE-456 → Can't start FE-456 until FE-123 is done
    Use when: There's a real technical dependency

  "relates to"
    FE-123 relates to FE-789 → They're related but independent
    Use when: Related feature areas, useful context

  "duplicates" / "is duplicated by"
    FE-123 duplicates FE-100 → Same bug reported twice
    Use when: Close the duplicate, link to the original

  "is cloned by" / "clones"
    FE-200 clones FE-100 → Story was copied (e.g., for another team)

  ‼️ When to link issues:
     - You discover a dependency during development
     - A bug is related to a story you're working on
     - Multiple people report the same issue
     - Frontend story depends on backend API story

  Example in practice:
  You're working on FE-123 (CSV export) and discover the API
  doesn't support the format you need:
  1. Create PLAT-500: "Add CSV format support to /api/export endpoint"
  2. Link: FE-123 "is blocked by" PLAT-500
  3. Comment on FE-123: "Blocked on PLAT-500 — API doesn't support CSV format.
     ETA from backend team: 3 days."
  4. Move FE-123 to "Blocked" status
  5. Pick up another story while waiting
```

---

## 12. Jira Automation

### Automation rules

```text
‼️ Jira Automation — reduce manual busywork.

  Common automation rules:

  1. Auto-assign on transition:
     WHEN: Issue moves to "In Progress"
     THEN: Set Assignee to the person who triggered the transition

  2. Auto-transition on PR merge:
     WHEN: Pull request merged (via GitHub/GitLab integration)
     THEN: Move issue to "QA" (or "Done" if no QA)

  3. Slack notification on blocker:
     WHEN: Issue priority changed to "Highest" OR status changed to "Blocked"
     THEN: Send Slack message to #team-alerts
     Message: "🚨 {{issue.key}} is blocked: {{issue.summary}}"

  4. Auto-close sub-tasks:
     WHEN: Parent issue moves to "Done"
     THEN: Move all sub-tasks to "Done"

  5. Stale ticket reminder:
     WHEN: Issue status is "In Progress" for more than 5 days
     THEN: Add comment "@{{issue.assignee}} this ticket has been In Progress
            for 5 days. Do you need help?"

  6. Sprint scope change alert:
     WHEN: Issue added to active sprint
     THEN: Send Slack message to #team-channel
     "⚠️ {{issue.key}} added to current sprint by {{user}}: {{issue.summary}}"

  7. Due date approaching:
     WHEN: Scheduled — daily at 9 AM
     IF:   Due date is within 2 days AND status != Done
     THEN: Send email/Slack to assignee
```

### Integrations

```text
‼️ Key Jira integrations:

  GitHub / GitLab Integration:
  - Link branches and PRs to Jira issues automatically
  - Branch name contains ticket key → auto-linked: feature/FE-123-description
  - PR title contains ticket key → shows in Jira's "Development" panel
  - See PR status (open, merged, declined) directly in Jira
  - Auto-transition issues when PRs are merged

  Slack Integration:
  - Get notifications in Slack when issues are updated
  - Create Jira issues from Slack messages (right-click → "Create Jira issue")
  - /jira command in Slack: /jira FE-123 shows issue details
  - Subscribe Slack channels to JQL filters (e.g., all new bugs → #bugs channel)

  Confluence Integration:
  - Link Confluence pages to Jira issues
  - Embed Jira issue lists in Confluence pages
  - Create Jira issues from Confluence action items
  - See linked Confluence docs in Jira's "Confluence" panel

  CI/CD Integration:
  - Deployment information in Jira (which environment, when)
  - Build status on issues (CI passed/failed)
  - Auto-add comment when deployed: "Deployed to staging at 2024-01-15 14:30"
  - Release management: mark Fix Version as released → all issues updated
```

### Smart commits

```text
‼️ Smart Commits — update Jira from git commit messages.

  Format: TICKET-KEY #command "optional message"

  Commands:
  #comment   Adds a comment to the ticket
  #time      Logs time on the ticket
  #done      Transitions to Done (or other status name)
  #in-progress  Transitions to In Progress

  Examples:

  git commit -m "FE-123 #comment 'Implemented form validation for all fields'"
  → Adds a comment to FE-123

  git commit -m "FE-123 #time 2h #comment 'Added unit tests for validation logic'"
  → Logs 2 hours and adds a comment to FE-123

  git commit -m "FE-123 #done 'All acceptance criteria met, tests passing'"
  → Transitions FE-123 to Done and adds a comment

  Multiple tickets:
  git commit -m "FE-123 FE-124 #comment 'Shared utility function for both features'"
  → Adds comment to both FE-123 and FE-124

  ‼️ Smart commits require the GitHub/GitLab integration to be set up.
     The email in your git config must match your Jira/Atlassian account email.
     If smart commits aren't working, check this first.
```

---

# Part 3 — Confluence Deep Dive

---

## 13. Confluence Basics

### Spaces and organization

```text
‼️ Confluence Space = a container for related pages.

  Space types:

  Team Space:
  - One per team (e.g., "Frontend Team", "Platform Team")
  - Team-specific pages: onboarding, team norms, meeting notes
  - Team members have edit access, others have view access

  Project Space:
  - One per major project or product
  - Design docs, RFCs, decision logs, roadmap
  - Cross-team — anyone working on the project contributes

  Knowledge Base Space:
  - Company-wide reference material
  - Runbooks, onboarding docs, architecture overview
  - Usually maintained by specific teams but read by everyone

  Personal Space:
  - Your own scratch pad
  - Draft documents, notes, personal checklists
  - ‼️ Don't put team documents in personal spaces — they become
    invisible when you leave or change teams.

  Space organization best practices:
  ┌─ Frontend Team Space
  │  ├── 📄 Home (team overview, quick links)
  │  ├── 📁 Meeting Notes
  │  │   ├── 📁 Sprint Reviews
  │  │   ├── 📁 Retrospectives
  │  │   └── 📁 Weekly Syncs
  │  ├── 📁 Technical Docs
  │  │   ├── 📁 Architecture Decision Records (ADRs)
  │  │   ├── 📁 Design Docs / RFCs
  │  │   └── 📁 Runbooks
  │  ├── 📁 Processes
  │  │   ├── 📄 Definition of Done
  │  │   ├── 📄 Code Review Guidelines
  │  │   └── 📄 On-Call Rotation
  │  └── 📁 Onboarding
  │      ├── 📄 New Dev Setup Guide
  │      ├── 📄 Codebase Overview
  │      └── 📄 Team Norms & Working Agreements
```

### Pages, labels, and restrictions

```text
Pages:
  - Rich text editor (similar to Google Docs / Notion)
  - Support tables, code blocks, images, macros, embedded content
  - Version history (see who changed what, when, roll back)
  - Comments (inline and page-level)
  - Page hierarchy (parent → child pages, up to many levels deep)

  ‼️ Keep the page tree shallow — 3-4 levels max.
     Deeply nested pages are hard to find and navigate.

Labels:
  Tags you attach to pages for cross-cutting categorization.

  Useful labels:
  - "adr" — Architecture Decision Record
  - "runbook" — Operational runbook
  - "rfc" — Request for Comments / Design Doc
  - "onboarding" — New team member reference
  - "meeting-notes" — Meeting notes
  - "deprecated" — Still exists but no longer current
  - "draft" — Work in progress, not finalized

  ‼️ Labels let you find pages across spaces.
     Search: label = "runbook" → shows all runbooks in all spaces.

Restrictions:
  Control who can view and edit pages.

  Page restrictions:
  - View: Only these users/groups can see the page
  - Edit: Only these users/groups can edit the page
  - Inherits from parent page by default

  ‼️ Use restrictions sparingly. Over-restricting kills discoverability.
     Default should be: everyone can view, team can edit.
     Restrict only for: sensitive info (salaries, HR), draft proposals
     you're not ready to share, confidential project information.
```

---

## 14. Essential Page Types

### Meeting notes

```text
Sprint Review Notes Template:

  ┌──────────────────────────────────────────────────┐
  │ Sprint Review — Sprint 14 (Aug 22 – Sep 4)      │
  │                                                  │
  │ Attendees: @alice, @bob, @charlie, @diana (PO)   │
  │ Sprint Goal: Deliver password reset and CSV export│
  │ Sprint Goal Met: ✅ Yes                           │
  │                                                  │
  │ ## Completed Stories                              │
  │ | Ticket  | Summary              | Points | Demo |
  │ |---------|----------------------|--------|------|
  │ | FE-123  | Password reset flow  | 5      | ✅   |
  │ | FE-124  | CSV export           | 5      | ✅   |
  │ | FE-125  | Fix chart rendering  | 3      | N/A  |
  │ | FE-126  | Update nav layout    | 2      | ✅   |
  │ | Total   |                      | 15/18  |      |
  │                                                  │
  │ ## Not Completed (Carry-over)                    │
  │ | FE-127  | Dark mode toggle     | 3      |      │
  │ | Reason: Design not finalized, blocked on UX    |
  │                                                  │
  │ ## Stakeholder Feedback                          │
  │ - Diana: "CSV export is great, but can we add    |
  │   PDF export in a future sprint?"                │
  │ - James: "Password reset email looks good"       │
  │                                                  │
  │ ## Action Items                                  │
  │ - [ ] @diana: Create story for PDF export        │
  │ - [ ] @bob: Follow up with UX on dark mode design│
  └──────────────────────────────────────────────────┘

Retrospective Notes Template:

  ┌──────────────────────────────────────────────────┐
  │ Sprint 14 Retrospective — Sep 4                  │
  │ Facilitator: @alice (SM)                         │
  │ Format: Start / Stop / Continue                  │
  │                                                  │
  │ ## Start (things we should begin doing)          │
  │ - Pair programming on complex stories (3 votes)  │
  │ - Writing AC before refinement (5 votes)         │
  │                                                  │
  │ ## Stop (things we should stop doing)            │
  │ - Adding stories mid-sprint without removing (4v)│
  │ - Skipping unit tests "to save time" (3 votes)   │
  │                                                  │
  │ ## Continue (things working well)                │
  │ - Morning standup format (quick, focused) (5v)   │
  │ - PR review within 4 hours (everyone agrees)     │
  │                                                  │
  │ ## Action Items from This Retro                  │
  │ | Action                    | Owner  | Due      │
  │ |---------------------------|--------|----------|│
  │ | Set up pair programming   | @alice | Sprint 15│
  │ |   schedule                |        |          │
  │ | PO to write AC before     | @diana | Sprint 15│
  │ |   refinement session      |        |          │
  │ | SM to enforce sprint scope| @alice | Ongoing  │
  │                                                  │
  │ ## Follow-up on Sprint 13 Retro Actions          │
  │ ✅ Code review turnaround improved (was 24h,     │
  │    now ~4h)                                      │
  │ ❌ Still haven't set up automated deploy to      │
  │    staging — carry over                          │
  └──────────────────────────────────────────────────┘
```

### Decision logs (ADR — Architecture Decision Records)

```text
‼️ ADR — Architecture Decision Record

  In simple terms: a short document that records a technical decision your team
  made, WHY you made it, and what alternatives you considered. So future engineers
  (or future you) can understand "why did we choose React over Vue?" or "why did
  we use PostgreSQL instead of MongoDB?" without having to ask around.

  Critical for teams — without ADRs, nobody remembers WHY things are the way they are.

  ADR Template:
  ┌──────────────────────────────────────────────────┐
  │ ADR-015: Use React Query for server state        │
  │                                                  │
  │ Status: ACCEPTED                                 │
  │ Date: 2024-08-22                                 │
  │ Deciders: @alice, @bob, @charlie                 │
  │ Related: Spike FE-789                            │
  │                                                  │
  │ ## Context                                       │
  │ Our dashboard fetches data from 12 API endpoints.│
  │ Currently using Redux for all state (local +     │
  │ server). This leads to:                          │
  │ - Boilerplate (actions, reducers, sagas per API) │
  │ - Manual cache invalidation (bugs)               │
  │ - No built-in refetching, retry, or optimistic   │
  │   updates                                        │
  │                                                  │
  │ ## Decision                                      │
  │ Use React Query (TanStack Query) for all server  │
  │ state. Keep Zustand for UI-only state (modals,   │
  │ sidebar open/closed, theme).                     │
  │                                                  │
  │ ## Options Considered                            │
  │ 1. React Query + Zustand (chosen)                │
  │    Pro: Purpose-built for server state, caching, │
  │         background refetch, devtools             │
  │    Con: Team needs to learn new library           │
  │                                                  │
  │ 2. Redux Toolkit + RTK Query                     │
  │    Pro: Team already knows Redux                 │
  │    Con: More boilerplate, larger bundle           │
  │                                                  │
  │ 3. Keep current Redux + Sagas                    │
  │    Pro: No migration effort                      │
  │    Con: Problems will keep getting worse          │
  │                                                  │
  │ ## Consequences                                  │
  │ - Migration plan: new features use React Query,  │
  │   migrate existing features incrementally        │
  │ - Team training: 2-hour workshop in Sprint 16    │
  │ - Bundle size: net decrease (remove Redux + Sagas│
  │   + custom cache code, add React Query)          │
  │ - Risk: Medium — team needs ramp-up time         │
  └──────────────────────────────────────────────────┘

  ‼️ ADR rules:
     - Keep them short (1-2 pages max)
     - Record the decision AND the alternatives you rejected (and why)
     - ADRs are immutable — if you reverse a decision, write a NEW ADR
       that supersedes the old one ("Supersedes: ADR-015")
     - Number them sequentially: ADR-001, ADR-002, ...
     - Status: PROPOSED → ACCEPTED → DEPRECATED/SUPERSEDED
```

### Technical design docs (RFC / Design Doc)

```text
‼️ RFC / Design Doc — for significant technical changes.

  When to write one:
  - New system or major feature (more than 1 sprint of work)
  - Changing core architecture (state management, routing, auth)
  - Introducing new technology (new library, new service)
  - Changes that affect multiple teams
  - Anything where the wrong decision is expensive to reverse

  RFC Template:
  ┌──────────────────────────────────────────────────┐
  │ RFC: Real-time Dashboard Updates                 │
  │                                                  │
  │ Author: @alice                                   │
  │ Status: 🟡 UNDER REVIEW                          │
  │ Reviewers: @bob, @charlie, @diana                │
  │ Created: 2024-08-20                              │
  │ Decision Deadline: 2024-09-03                    │
  │                                                  │
  │ ## Problem                                       │
  │ Dashboard data is currently fetched on page load │
  │ and refreshed every 60 seconds via polling.      │
  │ Users see stale data and the API handles 500+    │
  │ unnecessary polling requests per minute.          │
  │                                                  │
  │ ## Proposed Solution                             │
  │ Replace polling with WebSocket connections for   │
  │ real-time data push from the server.             │
  │                                                  │
  │ ## Technical Design                              │
  │ [Architecture diagram]                           │
  │ [Data flow description]                          │
  │ [API contract changes]                           │
  │ [Error handling & reconnection strategy]         │
  │ [Performance implications]                       │
  │                                                  │
  │ ## Alternatives Considered                       │
  │ 1. Server-Sent Events (SSE)                      │
  │ 2. Shorter polling interval (10s)                │
  │ 3. GraphQL Subscriptions                         │
  │                                                  │
  │ ## Migration Plan                                │
  │ Phase 1: WebSocket infrastructure (Sprint 16)    │
  │ Phase 2: Dashboard charts (Sprint 17)            │
  │ Phase 3: Notifications (Sprint 18)               │
  │ Rollback: Feature flag to revert to polling      │
  │                                                  │
  │ ## Open Questions                                │
  │ - [ ] What's the max WebSocket connections the   │
  │       load balancer supports?                    │
  │ - [ ] Do we need a dedicated WebSocket service?  │
  │                                                  │
  │ ## Decision                                      │
  │ (to be filled after review period)               │
  └──────────────────────────────────────────────────┘

  ‼️ RFC process:
     1. Author writes RFC and shares with reviewers
     2. Reviewers add inline comments in Confluence
     3. Discussion period (1-2 weeks, or shorter for urgent decisions)
     4. Team meeting to resolve disagreements
     5. Decision recorded, status updated to ACCEPTED or REJECTED
     6. Implementation begins, linked to Jira epic
```

### Runbooks and incident postmortems

```text
Runbook = step-by-step instructions for handling a specific operational
  task or incident. Like a recipe — when X happens, do step 1, step 2, step 3.
  Examples: "how to restart the production server," "what to do when the
  database is full," "how to roll back a bad deployment."
  Written so anyone on the team (even at 3am on-call) can follow it
  without guessing.‼️

Runbook Template:

  ┌──────────────────────────────────────────────────┐
  │ Runbook: Frontend Deployment Failure             │
  │ Last Updated: 2024-08-20 by @alice               │
  │ Labels: runbook, deployment, frontend            │
  │                                                  │
  │ ## Symptoms                                      │
  │ - Deployment pipeline fails at the "deploy" stage│
  │ - Users report seeing old version of the app     │
  │ - CloudFront cache shows stale assets            │
  │                                                  │
  │ ## Quick Fix (try these first)                   │
  │ 1. Check CI/CD pipeline logs for error message   │
  │ 2. Most common: AWS credentials expired          │
  │    → Rotate credentials in GitLab CI variables   │
  │ 3. Second most common: Build artifact too large  │
  │    → Check for accidentally committed node_modules│
  │                                                  │
  │ ## Detailed Steps                                │
  │ Step 1: Verify the failure                       │
  │   $ kubectl get pods -n frontend                 │
  │   Look for CrashLoopBackOff or ImagePullBackOff  │
  │                                                  │
  │ Step 2: Check logs                               │
  │   $ kubectl logs -n frontend deployment/web -f   │
  │   Look for startup errors                        │
  │                                                  │
  │ Step 3: Rollback if needed                       │
  │   $ kubectl rollout undo deployment/web -n frontend│
  │   This reverts to the previous version           │
  │                                                  │
  │ ## Escalation                                    │
  │ If the above doesn't resolve it:                 │
  │ 1. Page on-call platform engineer: @platform-oncall│
  │ 2. Slack: #incident-response                     │
  │ 3. Create incident in PagerDuty                  │
  └──────────────────────────────────────────────────┘

Incident Postmortem Template:

  ┌──────────────────────────────────────────────────┐
  │ Postmortem: Dashboard Outage — Aug 15, 2024      │
  │ Severity: SEV-2 (major feature unavailable)      │
  │ Duration: 45 minutes (14:15 – 15:00 UTC)         │
  │ Author: @bob                                     │
  │                                                  │
  │ ## Summary                                       │
  │ The dashboard page returned a blank white screen │
  │ for all users for 45 minutes due to a breaking   │
  │ change in the chart library upgrade.             │
  │                                                  │
  │ ## Impact                                        │
  │ - ~2,000 users affected                          │
  │ - Dashboard completely non-functional            │
  │ - No data loss                                   │
  │                                                  │
  │ ## Timeline                                      │
  │ 14:00 — Deploy v2.4.0 to production              │
  │ 14:15 — First alert: error rate spike on dashboard│
  │ 14:20 — On-call engineer begins investigation    │
  │ 14:35 — Root cause identified: chart lib breaking│
  │         change in D3 v7 → v8                     │
  │ 14:45 — Decision to rollback to v2.3.9           │
  │ 15:00 — Rollback complete, dashboard functional  │
  │                                                  │
  │ ## Root Cause                                    │
  │ Chart library (D3) was upgraded from v7 to v8 in │
  │ the same PR as a feature change. D3 v8 removed   │
  │ d3.event which our charts relied on. Unit tests  │
  │ passed because they mocked D3. E2E tests were    │
  │ skipped due to flakiness.                        │
  │                                                  │
  │ ## Action Items                                  │
  │ | Action                        | Owner  | Ticket │
  │ |-------------------------------|--------|--------|│
  │ | Fix D3 v8 breaking changes    | @bob   | FE-500│
  │ | Add E2E test for dashboard    | @alice | FE-501│
  │ |   chart rendering             |        |       │
  │ | Separate dependency upgrades  | @team  | process│
  │ |   from feature PRs            |        |       │
  │ | Fix flaky E2E tests so they   | @charlie|FE-502│
  │ |   aren't skipped              |        |       │
  │                                                  │
  │ ## Lessons Learned                               │
  │ - Never bundle dependency upgrades with features │
  │ - Mocked unit tests gave false confidence         │
  │ - Need canary deployments to catch issues before  │
  │   100% rollout                                   │
  │                                                  │
  │ ‼️ This is a BLAMELESS postmortem.                │
  │    We focus on WHAT happened and HOW to prevent   │
  │    it, not WHO did it.                           │
  └──────────────────────────────────────────────────┘
```

---

## 15. Writing Effective Technical Docs

### Structure for technical documents

```text
‼️ Technical Document Structure:

  Problem → Context → Options → Decision → Consequences

  This structure works for ADRs, RFCs, and most technical writing.

  1. Problem: What are we trying to solve? (1-2 paragraphs)
     Keep it crisp. If you can't state the problem clearly,
     you don't understand it well enough.

  2. Context: What constraints exist? What have we tried?
     - Current architecture
     - Performance requirements
     - Team skillset
     - Timeline constraints
     - Related decisions already made

  3. Options: What are the possible solutions?
     - At least 2-3 options (including "do nothing")
     - Pros and cons for each
     - Be honest about trade-offs

  4. Decision: What did we choose and WHY?
     - The "why" is more important than the "what"
     - Future readers need to understand the reasoning
     - Include dissenting opinions if there were any

  5. Consequences: What are the implications?
     - Migration plan
     - Training needed
     - Performance impact
     - What this makes easier/harder in the future
```

### Using diagrams and macros

```text
Confluence Macros (power features):

  Table of Contents Macro:
  - Auto-generates a clickable TOC from headings on the page
  - Essential for long pages — add it right after the page title
  - Updates automatically when you add/remove headings

  Code Block Macro:
  - Syntax-highlighted code with language selection
  - Supports: JavaScript, TypeScript, Python, SQL, Bash, JSON, etc.
  - Use for: API contracts, config examples, code snippets

  Expand Macro:
  - Collapsible section — click to expand/collapse
  - Use for: Detailed steps that most readers can skip,
    long code examples, verbose technical details
  - Keeps pages scannable without losing detail

  Status Macro:
  - Colored labels: 🟢 GREEN, 🟡 YELLOW, 🔴 RED, 🔵 BLUE, 🟣 PURPLE
  - Use for: Decision status, feature status, risk level
  - Example: Status: 🟢 APPROVED  or  Status: 🔴 BLOCKED

  Info / Warning / Note Panels:
  - Colored callout boxes for important information
  - Info (blue): General notes
  - Warning (yellow): Things to be careful about
  - Note (red): Critical warnings

  Draw.io / Diagrams Macro:
  - Built-in diagramming tool (architecture, flowcharts, sequence diagrams)
  - Saved in the page, editable inline
  - Use for: System architecture, data flow, component hierarchy

  Jira Issue/Filter Macro:
  - Embed a live Jira issue or filter results in the page
  - Updates in real-time as issues change
  - Use for: Sprint status, bug lists, epic progress

  ‼️ Tips for diagrams:
     - Keep them simple — if a diagram needs a 10-minute explanation, simplify it
     - Include a text description alongside diagrams (searchable, accessible)
     - Update diagrams when architecture changes (set a reminder)
     - Use consistent colors and shapes across all team diagrams
```

### Keeping docs up to date

```text
‼️ The #1 problem with documentation: it goes stale.

  Strategies to keep docs current:

  1. Assign a doc owner:
     Every important page has an owner (shown at the top).
     Owner is responsible for reviewing quarterly.
     "Owner: @alice | Last reviewed: 2024-Q3"

  2. Review dates:
     Add a review date to every technical doc.
     "Next review: 2024-11-01"
     Confluence can send reminders.

  3. Link docs to Jira:
     When a feature changes, the Jira story should include:
     "Update Confluence page: [Architecture Overview]"
     as an acceptance criterion.

  4. Automate what you can:
     - API docs generated from code (Swagger/OpenAPI)
     - Architecture diagrams generated from code (Structurizr, Mermaid)
     - Status pages that pull from monitoring tools

  5. Delete ruthlessly:
     A wrong doc is worse than no doc. If a page is hopelessly out of date
     and nobody will update it, DELETE IT (or archive it with a banner:
     "⚠️ This page is archived and may contain outdated information.
      See [New Page] for current documentation.")

  6. Docs-as-code vs Confluence — when to use which:
     Confluence: Process docs, decision logs, meeting notes, runbooks,
                 anything non-technical stakeholders need to read
     Docs-as-code (in repo): API docs, code architecture, setup guides,
                              anything that should change WITH the code
     ‼️ Rule of thumb: if the doc would go stale when code changes,
        it belongs in the repo. If it's about process or decisions,
        it belongs in Confluence.
```

---

## 16. Confluence + Jira Integration

### Embedding Jira in Confluence

```text
‼️ Confluence + Jira — better together.

  Embed single Jira issue:
  - Type the issue key (FE-123) and Confluence auto-links it
  - Or use the Jira Issue macro for a richer display
  - Shows: key, summary, status, assignee, priority
  - Updates in real-time

  Embed Jira filter/JQL:
  - Use the Jira Issues macro with a JQL query
  - Example: Show all open bugs for the current sprint
    JQL: project = FE AND issuetype = Bug AND sprint in openSprints()
  - Displays as a live table in Confluence
  - Useful for: sprint review pages, release notes, project status pages

  Jira Roadmap Macro:
  - Embeds the Jira roadmap view (timeline of epics)
  - Useful for: project overview pages, stakeholder updates
  - Shows epics with their start/end dates and progress bars

  Create Jira issues from Confluence:
  - Highlight text in Confluence → right-click → "Create Jira issue"
  - Action items from meeting notes → create stories/tasks
  - Maintains the link between Confluence page and Jira issue

  Link Confluence pages to Jira epics:
  - On the Jira epic page, add a Confluence link in the "Confluence Pages" section
  - Now the design doc, ADR, or RFC is accessible directly from the epic
  - Anyone working on the epic can find the relevant documentation

  ‼️ Best practice: Every epic should link to at least one Confluence page
     (design doc, technical spec, or product requirements).
     This is where the "why" and "how" live — Jira tickets have the "what."
```

---

## 17. Confluence Best Practices

### Page naming and organization

```text
‼️ Page Naming Conventions:

  Consistent naming helps people FIND things.

  Meeting notes:
  "Sprint Review — Sprint 14 (Aug 22 – Sep 4)"
  "Retrospective — Sprint 14 (Sep 4)"
  "Weekly Sync — 2024-08-22"

  Decision records:
  "ADR-015: Use React Query for server state"
  "ADR-016: Adopt Vite as build tool"

  Design docs:
  "RFC: Real-time Dashboard Updates"
  "Design: User Settings Page Redesign"

  Runbooks:
  "Runbook: Frontend Deployment Failure"
  "Runbook: Database Migration Process"

  ‼️ Include dates in meeting notes (ISO format: YYYY-MM-DD)
     Include numbers in ADRs (sequential)
     Include the subject in everything (not just "Meeting Notes")
```

### Avoiding "documentation graveyards"

```text
‼️ A documentation graveyard: pages nobody reads or maintains.

  Signs you're in a graveyard:
  - Pages last updated 2+ years ago
  - Nobody knows the page exists
  - Search returns 10 irrelevant pages before the one you need
  - New team members ignore Confluence and ask Slack instead
  - Pages contradict each other

  How to prevent it:

  1. Write for your audience (not for yourself)
     - Who will read this? What do they need to know?
     - Skip obvious things. Include non-obvious things.
     - Put the important stuff FIRST (inverted pyramid)

  2. Make pages findable
     - Use descriptive titles (not "Notes" or "Untitled")
     - Add labels consistently
     - Link related pages to each other
     - Pin important pages to the space sidebar

  3. Archive, don't hoard
     - Move completed project docs to an "Archive" section
     - Add "⚠️ ARCHIVED" banners to old pages
     - Delete pages that are clearly wrong and unused

  4. Keep it DRY (Don't Repeat Yourself)
     - If the same info exists in 3 pages, consolidate to 1
     - Link to the single source of truth, don't copy-paste

  5. Make contribution easy
     - Templates for common page types (meeting notes, ADRs, runbooks)
     - Low barriers (anyone on the team can edit)
     - Review docs in retros: "Is our Confluence useful?"

  ‼️ The best documentation is documentation people actually use.
     A short, accurate page beats a long, detailed one that nobody reads.
```

---

# Part 4 — Agile Ceremonies in Practice

---

## 18. Sprint Planning

### How to run sprint planning

```text
‼️ Sprint Planning — the ceremony that sets up your sprint.

  Who attends:
  - Product Owner (presents priorities, answers questions)
  - Scrum Master (facilitates, time-boxes)
  - Development Team (estimates, commits, breaks down work)
  - Optional: Designer, QA lead (if they have context to share)

  Duration: 2-4 hours for a 2-week sprint
  (Less if backlog is well-refined beforehand)

  Agenda:

  Part 1 — WHAT (PO leads) [~45 min]
  1. PO presents the sprint goal
     "This sprint we want to deliver the password reset feature
      and fix the top 3 customer-reported bugs."
  2. PO walks through the top-priority stories
     - Reads the story, acceptance criteria
     - Team asks clarifying questions
     - PO adjusts priority if needed

  Part 2 — HOW (Dev Team leads) [~1-2 hours]
  3. Team estimates stories (if not done in refinement)
  4. Team selects stories for the sprint
     - Use average velocity as a guide (e.g., "we do ~25 points")
     - Account for capacity: PTO, holidays, on-call, meetings
     - Don't commit to more than the team can deliver
  5. Break stories into sub-tasks
     - "Password reset" → UI form, API integration, email template,
       unit tests, E2E test, documentation update
  6. Team agrees on the sprint goal and committed stories

  Part 3 — CONFIRM [~15 min]
  7. Review: "Here's what we committed to. Sprint goal is X.
     Does everyone agree?"
  8. Scrum Master starts the sprint in Jira
```

### Capacity planning

```text
‼️ Capacity Planning — how much can the team actually do?

  Raw capacity calculation:

  Team: 5 developers, 2-week sprint = 10 working days

  Step 1: Total person-days
  5 devs × 10 days = 50 person-days

  Step 2: Subtract known absences
  - Alice: 2 days PTO → -2
  - Bob: 1 day on-call → -1
  - Company holiday: 1 day → -5 (all 5 devs)
  Available: 50 - 2 - 1 - 5 = 42 person-days

  Step 3: Account for overhead (meetings, reviews, support)
  Typically 20-30% of time is NOT coding:
  - Standup: 15 min × 10 days = 2.5 hours
  - Sprint ceremonies: ~6 hours total
  - Code reviews: ~1 hour/day
  - Slack/email/ad-hoc meetings: ~1 hour/day
  → ~30% overhead = 42 × 0.70 = ~29 productive person-days

  Step 4: Convert to story points
  If historical velocity = 25 points with full team:
  Adjusted: 25 × (42/50) = 21 points for this sprint
  (Or use the simpler approach: average of last 3 sprints' velocity)

  ‼️ Common mistake: Planning for 100% capacity.
     Reality: No one codes 8 hours a day, every day.
     Plan for 60-70% productivity. The rest is meetings, reviews, slack, context switching.
```

### Common sprint planning mistakes

```text
‼️ Sprint Planning Anti-patterns:

  1. Over-committing:
     "We can totally do 40 points this sprint!" (average velocity: 25)
     → Team fails to deliver, morale drops, velocity becomes meaningless.
     Fix: Use average velocity of last 3-5 sprints as a ceiling.

  2. No sprint goal:
     Sprint is just a grab-bag of unrelated tickets.
     → No focus, no way to make trade-off decisions.
     Fix: Always articulate a sprint goal. If you can't, the backlog needs work.

  3. Skipping estimation:
     "We know how much work we can do, we don't need points."
     → Velocity tracking breaks, can't forecast, can't detect problems.
     Fix: Estimate in refinement so planning is smooth.

  4. Stories not refined:
     "Let's figure out the details as we go."
     → Mid-sprint, developer discovers the story is unclear, gets blocked.
     Fix: Every story must meet Definition of Ready before entering a sprint.

  5. PO dictates scope:
     "These 15 stories MUST all be done this sprint."
     → Team has no agency, feels like waterfall with standups.
     Fix: PO sets PRIORITY. Team decides CAPACITY. Together they decide scope.

  6. No sub-task breakdown:
     One 8-point story stays "In Progress" for the entire sprint.
     → No visibility into progress. Burndown is flat, then drops on the last day.
     Fix: Break into 3-5 sub-tasks. Each completes independently.

  7. Ignoring carry-over:
     3 stories carried over from last sprint, but team plans as if starting fresh.
     → Sprint is overloaded before it even begins.
     Fix: Account for carry-over. If 8 points carry over, plan for 17 points (not 25).
```

---

## 19. Daily Standup

### Format and anti-patterns

```text
‼️ Daily Standup — 15 minutes, standing up (or on camera).

  Classic format (each person answers):
  1. What did I do yesterday?
  2. What am I doing today?
  3. Do I have any blockers?

  Example (good):
  "Yesterday I finished the form validation for password reset (FE-123)
   and opened a PR. Today I'm starting on the email template integration.
   No blockers."

  Example (too vague):
  "I worked on stuff. I'll keep working on stuff. No blockers."

  Example (too detailed):
  "So I was looking at the CSS and the flexbox wasn't aligning right
   because the parent container had overflow hidden and then I tried
   grid instead but that broke the mobile layout so I..." (5 minutes later)

  ‼️ Anti-patterns:

  1. Status report to the manager:
     Everyone faces the SM/manager and "reports."
     → Standup is for THE TEAM to sync, not for management.
     Fix: Team members talk to EACH OTHER.

  2. Going too long:
     30-minute "standup" with deep discussions.
     → People zone out, standup becomes dreaded.
     Fix: 15-minute hard stop. Anything that needs discussion: "parking lot."

  3. Problem-solving in standup:
     "I'm blocked on X." "Oh let me help, so what if we try Y..."
     (15-minute technical discussion follows)
     → Take it offline: "Let's chat after standup."

  4. Not everyone participates:
     Same 2-3 people talk, others stay silent.
     → Go around the room. Everyone speaks, even if it's brief.

  5. Standup happens but nothing changes:
     Person says "blocked" for 3 days in a row and nobody helps.
     → SM should follow up on blockers IMMEDIATELY after standup.
```

### Async standups and walking the board

```text
Async Standups (for remote/distributed teams):

  Instead of a synchronous meeting:
  - Post in Slack by 10 AM:
    "🟢 Yesterday: Finished FE-123 PR
     🔵 Today: Starting FE-124 (email template)
     🔴 Blockers: None"
  - Or use a bot (Geekbot, Standuply, DailyBot):
    Bot asks questions at 9:30 AM, posts summary to team channel

  ‼️ When async works:
     - Team across 3+ time zones
     - Team is mature and self-organizing
     - Written updates are read and acted on

  When async DOESN'T work:
  - Nobody reads the updates
  - Blockers go unaddressed
  - Team feels disconnected (no face-to-face)
  → If async isn't working, go back to synchronous.

Walking the Board (Kanban-style standup):

  Instead of person-by-person, walk the board RIGHT to LEFT:

  1. Start with "Done" — celebrate completed items
  2. "QA" — anything stuck? What needs QA attention?
  3. "In Review" — PRs waiting too long? Who can review?
  4. "In Progress" — updates, blockers?
  5. "To Do" — anyone need to pick up new work?

  ‼️ Walking the board focuses on FLOW, not people.
     It surfaces bottlenecks: "There are 5 PRs in Review — we need to stop
     starting and start reviewing."
```

---

## 20. Sprint Review / Demo

### What to demo and how

```text
‼️ Sprint Review — show what the team built.

  What to demo:
  ✅ Completed stories that meet Definition of Done
  ✅ Working software (live demo, not slides)
  ✅ User-facing features (new button, new page, new flow)
  ✅ Bug fixes (show the fix working, before/after)
  ✅ Performance improvements (show metrics, before/after)

  What NOT to demo:
  ❌ Incomplete stories ("it mostly works, just needs polish")
  ❌ Code or architecture (unless stakeholders are technical)
  ❌ Infrastructure work (unless you can show the user impact)
  ❌ Slides about what you plan to build (that's planning, not review)

  Demo tips:
  1. Prepare! Don't wing it. Walk through the demo beforehand.
  2. Use a demo environment (not localhost with dev data)
  3. Have a script: which stories, in what order, who presents
  4. Focus on USER VALUE: "Now users can reset their password in
     3 clicks instead of calling support"
  5. Keep it short: 2-3 minutes per story maximum
  6. Be honest about what didn't get done and why

  Who attends:
  - Dev Team (presents)
  - Product Owner (accepts/rejects, gives feedback)
  - Stakeholders (PM, leadership, other teams, customer reps)
  - Anyone interested (it's an open meeting)

  Gathering feedback:
  - "What questions do you have about this feature?"
  - "Is this what you expected? Anything missing?"
  - "How does this affect your workflow?"
  - Document feedback → PO creates new stories or adjusts backlog

  ‼️ Sprint Review ≠ Sprint Demo.
     The demo is part of the review, but the review is also about:
     - Did we meet the sprint goal?
     - What's the product status? (roadmap check)
     - What should we focus on next?
     - Adapting the plan based on what we learned
```

---

## 21. Retrospective

### Retro formats

```text
‼️ Retrospective Formats — rotate to keep it fresh.

  1. Start / Stop / Continue:
     - START doing: Things we should try
     - STOP doing: Things that aren't working
     - CONTINUE doing: Things that are working well

  2. Mad / Sad / Glad:
     - 😡 MAD: Things that frustrated me
     - 😢 SAD: Things I wish were better
     - 😊 GLAD: Things that made me happy

  3. 4Ls: Liked / Learned / Lacked / Longed For:
     - LIKED: What went well
     - LEARNED: What we discovered (new knowledge)
     - LACKED: What was missing
     - LONGED FOR: What we wish we had

  4. Sailboat:
     ⛵ (visualize a sailboat on an ocean)
     - Wind (what propels us forward): Things helping us go fast
     - Anchor (what holds us back): Things slowing us down
     - Rocks (risks/dangers): Things that could sink us
     - Island (destination/goal): Where we want to be

  5. Hot Air Balloon (variation of sailboat):
     - Hot air (what lifts us): Positive forces
     - Sandbags (what weighs us down): Negative forces
     - Storm clouds (risks): Upcoming threats

  ‼️ Rotate formats every 3-4 sprints.
     Using the same format every time leads to "retro fatigue."
```

### Running effective retros

```text
‼️ Effective Retro Agenda:

  Total time: 60-90 minutes for a 2-week sprint

  1. Set the stage [5 min]
     - "Vegas rule: what's said here stays here"
     - Quick check-in: "Rate the sprint 1-5" or one-word feeling

  2. Follow up on PREVIOUS retro action items [10 min]
     - Go through last retro's action items
     - ✅ Done? Celebrate.
     - ❌ Not done? Why not? Re-commit or drop.
     - ‼️ If action items from the last retro were ignored,
       the team will stop taking retros seriously.

  3. Gather data [15 min]
     - Everyone writes sticky notes (physical or virtual: Miro, FigJam, EasyRetro)
     - One idea per note
     - Silent brainstorming (no discussion yet)
     - Place notes in the appropriate category

  4. Group and vote [10 min]
     - Group similar notes into themes
     - Each person gets 3-5 votes (dot voting)
     - Top 3 themes become discussion topics

  5. Discuss top themes [30-40 min]
     - For each theme:
       "What happened? Why? What can we do about it?"
     - Create SPECIFIC action items:
       BAD:  "We should communicate better"
       GOOD: "We will post PR links in #dev-prs Slack channel within
              1 hour of opening. Owner: @alice. Start: Next sprint."

  6. Close [5 min]
     - Review action items (each has an owner and due date)
     - Quick feedback: "Was this retro useful?"

  ‼️ What makes a good retro vs a waste of time:

  Good retro:
  - Psychological safety (people speak honestly)
  - Specific action items with owners
  - Follow-up on previous action items
  - Focus on process, not people ("the deploy process is slow" not "Bob is slow")
  - The team actually changes behavior after the retro

  Waste of time:
  - Nobody speaks up (fear of judgment)
  - Vague action items ("be better")
  - No follow-up (same problems discussed every sprint)
  - Finger-pointing ("you did this wrong")
  - Management uses retro feedback punitively
```

### Remote retro tools

```text
Remote Retrospective Tools:

  Miro:
  - Infinite whiteboard, sticky notes, templates, voting
  - Best for: Visual teams, complex grouping, large teams
  - Built-in retro templates (Start/Stop/Continue, Sailboat, etc.)

  FigJam (by Figma):
  - Collaborative whiteboard, simpler than Miro
  - Best for: Teams already using Figma, quick setup
  - Voting, timers, sticky notes

  EasyRetro (RetroTool):
  - Purpose-built for retros, very simple
  - Best for: Quick setup, minimal features, focus on action items
  - Anonymous mode (helps with psychological safety)

  Confluence:
  - Use a retrospective page template
  - Best for: Teams that want retro notes in the same place as other docs
  - Less interactive (no voting, no sticky notes)

  ‼️ The tool doesn't matter. What matters:
     1. Everyone can participate (anonymous option helps)
     2. You can vote on themes
     3. Action items are tracked
     4. Notes are stored for future reference
```

---

## 22. Backlog Refinement / Grooming

### How to run refinement

```text
‼️ Backlog Refinement — the ceremony that makes sprint planning smooth.

  When: Mid-sprint (e.g., Wednesday of week 1)
  Duration: 1-2 hours (can split into two 1-hour sessions)
  Who: PO + Dev Team (all, or senior dev representatives)

  Agenda:

  1. PO presents upcoming stories [~10 min]
     - Focus on stories for the NEXT 1-2 sprints
     - Not urgent stories — those are already in the current sprint
     - Share the "why" and business context

  2. Clarify and discuss each story [~40 min, 10 min per story]
     For each story:
     a. PO reads the story and acceptance criteria
     b. Team asks questions:
        "What happens if the user has no email?"
        "Does this need to work on mobile?"
        "Is there a design for this?"
        "Which API endpoint do we use?"
     c. Identify unknowns:
        "We don't know if the API supports bulk operations — spike needed"
     d. Review/add acceptance criteria:
        "We should add an AC for error handling"
        "What about the empty state?"
     e. Identify dependencies:
        "We need the design by next Wednesday"
        "Backend API must be ready first"

  3. Estimate stories [~20 min]
     - Planning poker (or quick agreement if team is aligned)
     - If no agreement, discuss and re-estimate
     - If the story is too complex to estimate, it needs a spike or splitting

  4. Split large stories [~10 min]
     - Any story > 8 points should be split
     - Split by functionality (not by technical layer)
       GOOD split: "Password reset: email flow" + "Password reset: SMS flow"
       BAD split:  "Password reset: frontend" + "Password reset: backend"
       (BAD because neither half delivers user value independently)

  5. Reprioritize if needed [~10 min]
     - New information may change priorities
     - "The API team is delayed — should we do something else first?"
     - PO makes the final call on order

  ‼️ How far ahead to refine:
     1-2 sprints ahead is the sweet spot.
     Too far ahead: Requirements change, wasted effort.
     Not far enough: Sprint planning becomes a 4-hour marathon.
```

---

# Part 5 — Agile Metrics & Reporting

---

## 23. Key Metrics

### What to track

```text
‼️ Agile Metrics — what to measure and what to ignore.

  TRACK THESE:

  Velocity (Scrum):
  - Story points completed per sprint
  - Use for: Sprint planning, forecasting release dates
  - Track trend over 5+ sprints, not individual sprints
  - ‼️ NOT a performance metric. NOT for comparing teams.

  Cycle Time (Kanban/Scrum):
  - Time from "In Progress" to "Done" for each item
  - Use for: Identifying bottlenecks, improving flow
  - Goal: Reduce cycle time consistently
  - Track median, not average (outliers skew the average)

  Lead Time:
  - Time from "Created" to "Done"
  - Use for: Customer-facing SLA, measuring responsiveness
  - Includes wait time in backlog

  Throughput:
  - Number of items completed per time period
  - Use for: Capacity planning, forecasting
  - More stable than velocity (not affected by story point inflation)

  Sprint Goal Success Rate:
  - Percentage of sprints where the sprint goal was fully met
  - Use for: Measuring predictability and commitment
  - Target: > 80%

  Escaped Defects:
  - Bugs found in production (not caught by QA/testing)
  - Use for: Quality tracking
  - Trend should be decreasing over time

  Scope Creep:
  - Story points added to sprint after sprint planning
  - Use for: Protecting sprint integrity
  - Should be < 10% of committed work

  IGNORE THESE (or use carefully):

  ‼️ Velocity as performance metric:
     "Team A has velocity 40, Team B has velocity 20 — A is twice as productive!"
     → WRONG. Story points are team-specific. Teams estimate differently.
     → Using velocity for performance leads to point inflation (gaming the metric).

  Lines of code:
  - More code ≠ better. Sometimes the best change is deleting code.

  Tickets closed:
  - 20 one-point tickets ≠ 4 five-point tickets in complexity
  - Incentivizes splitting work into tiny tickets (gaming)

  Hours logged:
  - Measures presence, not productivity
  - Discourages automation and efficiency
```

### Burndown vs burn-up charts

```text
Burndown Chart (sprint level):
  Shows REMAINING work decreasing over time.
  Y-axis: story points remaining
  X-axis: sprint days

  Useful for: "Are we on track to finish this sprint?"

  Points │
    20   │╲
         │  ╲ ideal
    15   │    ╲
         │  ●───● actual (behind schedule)
    10   │        ╲
         │      ●───●
     5   │            ╲
         │          ●───●
     0   └──────────────────
         Day 1    Day 5    Day 10

Burn-up Chart (release/epic level):
  Shows COMPLETED work increasing over time, with a scope line.
  Y-axis: story points
  X-axis: sprints

  Useful for: "When will this epic/release be done?" and "Is scope growing?"

  Points │
    100  │─ ─ ─ ─ ─ ─ ─ ─ ─ scope line ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
         │                                      ╱ scope increased!
     80  │                                   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
         │                            ╱╱╱╱╱
     60  │                    ╱╱╱╱╱╱╱╱  work completed
         │            ╱╱╱╱╱╱╱
     40  │      ╱╱╱╱╱╱
         │  ╱╱╱╱
     20  │╱╱
         │
      0  └──────────────────────────────────────
         S1    S3    S5    S7    S9    S11

  ‼️ Burn-up is better than burndown for releases because:
     - It shows scope changes (scope line moving up = scope creep)
     - You can forecast when work meets scope line = release date
     - Burndown hides scope changes (the line just goes up, which looks like no progress)
```

---

## 24. Jira Dashboards & Reports

### Setting up useful dashboards

```text
‼️ Dashboard Setups — copy these for your team.

  TEAM DASHBOARD (shared, visible at standup):
  ┌─────────────────────────────────────────────────────┐
  │  Sprint 14 Dashboard                                │
  ├──────────────────────┬──────────────────────────────┤
  │ Sprint Burndown      │ Sprint Health               │
  │ (burndown gadget)    │ (sprint health gadget)      │
  │ Shows points         │ Shows: % complete,          │
  │ remaining vs ideal   │ days remaining, risk        │
  ├──────────────────────┼──────────────────────────────┤
  │ Open Items by Status │ Blockers                    │
  │ (pie chart)          │ (filter: status=Blocked)    │
  │ To Do: 4             │ FE-130: Waiting on API      │
  │ In Progress: 3       │ FE-135: Design not ready    │
  │ In Review: 2         │                             │
  │ QA: 1                │                             │
  ├──────────────────────┼──────────────────────────────┤
  │ Velocity Chart       │ Open Bugs by Priority       │
  │ (last 6 sprints)     │ Critical: 1                 │
  │                      │ High: 3                     │
  │                      │ Medium: 8                   │
  │                      │ Low: 12                     │
  └──────────────────────┴──────────────────────────────┘

  PERSONAL DASHBOARD:
  ┌─────────────────────────────────────────────────────┐
  │ My Dashboard                                       │
  ├──────────────────────┬──────────────────────────────┤
  │ My Open Issues       │ My Recent Activity          │
  │ (filter results)     │ (activity stream)           │
  │ FE-123 In Progress   │ Updated FE-123 2h ago       │
  │ FE-124 To Do         │ Commented on FE-120 4h ago  │
  │ FE-125 In Review     │ Resolved FE-119 yesterday   │
  ├──────────────────────┼──────────────────────────────┤
  │ Assigned to Me       │ Watching                    │
  │ (across all projects)│ (issues I'm watching)       │
  └──────────────────────┴──────────────────────────────┘

  STAKEHOLDER DASHBOARD:
  ┌─────────────────────────────────────────────────────┐
  │ Project Status — Q3 2024                           │
  ├──────────────────────┬──────────────────────────────┤
  │ Epic Progress        │ Release Burnup              │
  │ Auth System: 80%     │ (burn-up chart)             │
  │ Dashboard v2: 45%    │ Target: Sprint 18           │
  │ Search: 20%          │ Current: On track           │
  ├──────────────────────┼──────────────────────────────┤
  │ Created vs Resolved  │ Bug Trend                   │
  │ (line chart)         │ (created vs resolved bugs)  │
  │ Resolved > Created ✅ │ Bug rate decreasing ✅       │
  └──────────────────────┴──────────────────────────────┘
```

### Jira reports

```text
Built-in Jira Reports:

  Velocity Report:
  - Bar chart: committed vs completed points per sprint
  - Shows last 7 sprints by default
  - Use for: Setting sprint capacity, spotting trends
  - ‼️ If committed >> completed consistently, team is over-committing

  Sprint Report:
  - Summary of a completed sprint
  - Shows: completed issues, incomplete issues, issues removed
  - Includes burndown chart for that sprint
  - Use for: Sprint review, identifying patterns

  Cumulative Flow Diagram:
  - Stacked area chart of items in each status over time
  - Use for: Identifying bottlenecks in the workflow
  - ‼️ Widening bands = work accumulating in that state

  Control Chart:
  - Scatter plot of cycle time for completed issues
  - Shows average cycle time and standard deviation
  - Use for: Predictability — are we consistent?
  - Outliers indicate problems (very long cycle times)

  Created vs Resolved:
  - Line chart of issues created and resolved over time
  - Use for: "Are we keeping up with incoming work?"
  - If created > resolved trend continues, backlog is growing
  - ‼️ For bugs: if created > resolved, you're accumulating tech debt

  Epic Report:
  - Progress of stories within an epic
  - Shows: complete vs incomplete stories, estimated completion
  - Use for: Tracking epic/feature progress, release planning

  Release Burndown:
  - Points remaining in a fix version over time
  - Use for: "When will this release be ready?"
  - ‼️ Only useful if you use Fix Versions consistently
```

---

## 25. Communicating Progress

### Sprint status and release forecasting

```text
‼️ Communicating Progress — different audiences need different messages.

  To the TEAM (daily standup, sprint board):
  - Raw data: board, burndown, blockers
  - "We have 12 points remaining with 3 days left. We're on track."
  - "FE-130 is blocked on the API team. I'll escalate."

  To the PRODUCT OWNER (sprint review):
  - Stories completed vs committed
  - Sprint goal: achieved or not
  - Carry-over items and why
  - "We completed 4 of 5 stories. The CSV export is ready for release.
   Dark mode carries over because design wasn't finalized."

  To STAKEHOLDERS / LEADERSHIP (monthly or quarterly):
  - Feature/epic progress (not individual tickets)
  - Release timeline (forecast, not promise)
  - Risks and dependencies
  - "The Dashboard v2 epic is 60% complete. At current velocity,
   we expect to finish in Sprint 18 (mid-October). Risk: the data
   API team is behind, which could delay the analytics charts."

  ‼️ Release Forecasting with Velocity:

  Simple forecast:
  Remaining work: 50 story points
  Average velocity: 25 points/sprint
  Forecast: 50 / 25 = 2 sprints = 4 weeks

  Range forecast (more honest):
  Best velocity (last 5 sprints): 30 pts
  Worst velocity (last 5 sprints): 20 pts
  Average velocity: 25 pts

  Optimistic: 50 / 30 = 1.7 sprints ≈ 3.5 weeks
  Likely:     50 / 25 = 2.0 sprints = 4 weeks
  Pessimistic: 50 / 20 = 2.5 sprints = 5 weeks

  "We expect to deliver by mid-October, with a range of
   early October to late October depending on complexity."

  ‼️ NEVER give a single date. Always give a range.
     "We'll be done October 15th" → pressure, blame if missed
     "We expect October 8-22" → honest, sets proper expectations
```

---

# Part 6 — Team Dynamics & Culture

---

## 26. Developer's Role in Agile

### You're not just a "resource"

```text
‼️ A developer in agile is NOT a "ticket machine."

  You are expected to:

  ESTIMATE:
  - Participate in planning poker
  - Your estimate matters — push back if the team underestimates
  - "I think this is a 5, not a 3, because we'll need to handle
   the edge case where the user has no billing address."

  PUSH BACK:
  - On unclear requirements: "I can't start this until we know X"
  - On unrealistic deadlines: "This is 13 points of work in a 25-point sprint"
  - On scope creep: "Adding dark mode to this sprint means something else drops"
  - ‼️ Pushing back is not being difficult. It's being professional.

  CLARIFY REQUIREMENTS:
  - Ask questions during refinement, not during development
  - "What happens when a user has 100+ items? Do we paginate?"
  - "The mockup shows a dropdown, but with 500 options, should it be a search?"
  - Don't assume. Ask.

  RAISE RISKS:
  - "This API isn't stable yet. If it changes, we'll need to rework this."
  - "We've never used WebSockets in our stack. There's a learning curve risk."
  - "This story assumes the database can handle 10k writes/sec. Have we tested?"
  - Raise risks EARLY (refinement/planning), not late (day 8 of the sprint).

  SUGGEST ALTERNATIVES:
  - "Instead of building a custom date picker, we could use this library (saves 3 days)"
  - "The PO wants real-time updates, but polling every 5 seconds would be simpler
   and meet the requirement. WebSockets adds 2 sprints of complexity."
  - "Instead of building Feature A first, we could do Feature B (smaller, proves the concept)"

  OWN QUALITY:
  - Write tests. Review code thoroughly. Don't ship known bugs.
  - "Dev complete" is not "done." It's done when it meets Definition of Done.
  - If QA finds basic bugs, your process has gaps.

  PARTICIPATE IN ALL CEREMONIES:
  - Standup: Be concise, be present
  - Planning: Estimate, commit, break down work
  - Review: Demo your work, be proud of it
  - Retro: Speak up. Your voice matters. Suggest improvements.
  - Refinement: Ask questions, spot risks, improve stories

  COLLABORATE CROSS-FUNCTIONALLY:
  - Work with QA: "Here's how I tested it, here are the edge cases to check"
  - Work with Design: "This interaction will cause a performance issue on mobile.
    Can we simplify it?"
  - Work with PM/PO: "I see what you want. Here's a smaller version we could
    ship first to validate the idea."
  - Work with other devs: Code review, pair programming, knowledge sharing
```

---

## 27. Working with Product Owners

### The PO relationship

```text
‼️ The Developer ↔ Product Owner Relationship:

  The PO decides WHAT to build and in WHAT ORDER.
  The dev team decides HOW to build it and HOW LONG it will take.

  This creates a negotiation:

  PO: "I want Feature X by end of month."
  Dev: "Feature X as described is 40 points. We do 25/sprint. That's 2 sprints."
  PO: "Can we do a smaller version?"
  Dev: "If we cut the bulk import and do single import only, it's 15 points.
       We could ship that next sprint and do bulk in the following sprint."
  PO: "Deal. Ship single import first, we'll learn from user feedback."

  ‼️ This is healthy negotiation, not conflict.
     The PO pushes for scope. The dev pushes for quality and realism.
     The result is the right trade-off.

MVP Thinking:
  "What's the SMALLEST thing we can ship to get feedback?"

  PO wants: Full-featured search with filters, autocomplete, saved searches,
            search history, and AI suggestions.

  MVP conversation:
  Dev: "The full search is 6 sprints. What if we ship basic search with
       one filter (category) in Sprint 16? Users get search capability,
       we get feedback on what filters they actually need, and we iterate."
  PO: "I need at least autocomplete for the demo."
  Dev: "Autocomplete adds 1 sprint because we need the search index.
       We could do client-side autocomplete from cached data as a V1
       (3 days) and server-side autocomplete in V2."
  PO: "Let's do client-side V1."

  ‼️ MVP is not "ship garbage." It's "ship the smallest VALUABLE thing."
```

### Technical debt negotiations

```text
‼️ Negotiating Technical Debt with the PO:

  The problem:
  PO wants features. Devs want to fix tech debt.
  Both are right. You need to negotiate.

  BAD approach:
  Dev: "We need to refactor the auth module."
  PO: "Why? Users don't care about refactoring."
  Dev: "Because the code is messy."
  PO: "Not a priority. Build Feature X."

  GOOD approach:
  Dev: "We need to refactor the auth module BEFORE building the SSO feature
       because the current auth code can't support multiple identity providers.
       If we build SSO on the current code, it'll take 3 sprints and be
       fragile. If we refactor first (1 sprint), SSO takes 1 sprint.
       Total: 2 sprints vs 3 sprints, and the code will be maintainable."
  PO: "So refactoring actually saves time?"
  Dev: "Yes. And reduces the risk of auth bugs in production."
  PO: "Let's do the refactor in Sprint 16 and SSO in Sprint 17."

  ‼️ The formula:
     "We need to do X (tech debt) before Y (feature) because Z (impact).
      Without X, Y will take [longer/be risky/cause problems].
      With X, Y becomes [faster/safer/possible]."

  Tech debt strategies that work:
  1. The 20% rule: Reserve 20% of sprint capacity for tech debt
     (5 points out of 25). PO agrees upfront, not negotiated per sprint.

  2. Boy Scout Rule: Leave code better than you found it.
     When working on a feature, improve the surrounding code.
     No separate ticket needed — it's part of doing the work well.

  3. Tech Debt Epic: Create an epic for tech debt items.
     Makes tech debt visible. PO can see the backlog growing.
     "We have 80 points of tech debt. If we don't address it,
     feature velocity will decrease by ~15% per quarter."

  4. Tie debt to features: "We can't build Feature X until we fix Y."
     PO understands dependencies. Pure "refactoring for cleanliness"
     is harder to prioritize.
```

---

## 28. Common Agile Anti-patterns

### The full list of what goes wrong

```text
‼️ Agile Anti-patterns — things that look agile but aren't.

  1. Fake Agile (Waterfall with Standups):
     - 6-month plans with fixed scope, fixed dates
     - Requirements handed down from management, no negotiation
     - Standups are status reports to the boss
     - Retros happen but nothing changes
     - "We do agile" = "we have a Jira board"
     ‼️ If scope AND dates are both fixed, you're doing waterfall.
        Agile fixes one and flexes the other.

  2. No Retrospective Action Items:
     - Retro happens, problems discussed, nothing changes
     - Same complaints every sprint
     - Team stops taking retros seriously
     Fix: Every retro produces 2-3 ACTION ITEMS with OWNERS and DUE DATES.
          Follow up at the next retro.

  3. Estimation as Commitment:
     - "You estimated 5 points, so you MUST finish in 2.5 days"
     - Points are treated as contracts, not forecasts
     - Devs start inflating estimates to protect themselves
     Fix: Estimates are forecasts. Velocity is a planning tool, not a whip.

  4. Velocity as Performance Metric:
     - "Team A does 40 points, Team B does 20. Team B is underperforming."
     - Teams game the system: inflate points, split into tiny tickets
     - Trust erodes
     Fix: Velocity is for the TEAM's planning. Never compare across teams.
          Never use for performance reviews.

  5. Skipping Ceremonies:
     - "We're too busy to do retro/refinement/review"
     - Sprint planning is 10 minutes ("just grab tickets")
     - No demo, no feedback, no improvement
     Fix: Ceremonies are investments that pay off. Skipping them creates
          more problems than the time they "save."

  6. PO Writing Tickets Without Dev Input:
     - PO creates 30 stories alone, drops them in the backlog
     - Dev sees them for the first time at planning
     - Stories are unclear, missing AC, wrong estimates
     Fix: Devs participate in refinement. Stories are a conversation,
          not a spec document.

  7. No Definition of Done:
     - "Done" means different things to different people
     - "I'm done (but I didn't write tests / update docs / deploy)"
     - QA finds basic issues that should have been caught by dev
     Fix: Write a DoD. Post it on the wall. Enforce it.

  8. Hero Culture:
     - One person does everything important
     - Only Alice can deploy, only Bob knows the auth code
     - When the hero is sick, the team is stuck
     - Hero gets burned out, leaves, team is in crisis
     Fix: Knowledge sharing, pair programming, cross-training.
          No single points of failure.

  9. Dark Work (Work Not on the Board):
     - Dev spends 2 days on something not on any ticket
     - "Oh, I was just cleaning up some code / investigating a thing"
     - Work is invisible, can't be planned for or tracked
     - Team velocity is unpredictable because 20% of effort is dark work
     Fix: Everything should be on the board.
          If it's worth doing, it's worth tracking.
          Create a ticket, even if it's small.

  10. Endless Refinement (Analysis Paralysis):
      - Stories are refined for weeks before starting
      - Every edge case must be specified before coding
      - "We can't start until we know EVERYTHING"
      Fix: Refine enough to start. Learn the rest by building.
           "What's the smallest thing we can build to learn more?"

  11. Cherry-Picking Stories:
      - Dev picks the fun/easy stories, ignores the important ones
      - Boring but critical work sits untouched
      Fix: Team picks from the TOP of the prioritized backlog.
           PO sets priority. Team commits to the sprint goal, not to
           individual stories they enjoy.

  12. Sprint Scope as Negotiable:
      - Mid-sprint: "Can you also do this small thing?"
      - "Small things" accumulate, sprint goal at risk
      - Team never finishes what they planned
      Fix: Sprint is a commitment. New work goes to the backlog.
           If it MUST be this sprint, something else comes OUT.
           SM should enforce this.
```

---

## Quick Reference Card

```text
‼️ QUICK REFERENCE — Print this, pin it to your desk.

  SCRUM EVENTS:
  ┌──────────────────────────┬──────────┬──────────────────────┐
  │ Event                    │ Duration │ Frequency            │
  ├──────────────────────────┼──────────┼──────────────────────┤
  │ Sprint Planning          │ 2-4 hrs  │ Start of sprint      │
  │ Daily Standup            │ 15 min   │ Every day            │
  │ Sprint Review/Demo       │ 1-2 hrs  │ End of sprint        │
  │ Retrospective            │ 1-1.5 hrs│ End of sprint        │
  │ Backlog Refinement       │ 1-2 hrs  │ Mid-sprint           │
  └──────────────────────────┴──────────┴──────────────────────┘

  STORY POINT SCALE:
  1 = trivial  │ 2 = small  │ 3 = medium │ 5 = large
  8 = very large (consider splitting)
  13+ = MUST split

  ISSUE TYPES:
  Epic  → multiple sprints, many stories
  Story → user value, one sprint
  Task  → technical work, one sprint
  Bug   → defect in existing code
  Spike → time-boxed research

  BRANCH NAMING:
  feature/FE-123-short-description
  bugfix/FE-456-fix-thing
  spike/FE-789-research-topic

  JQL CHEAT SHEET:
  My stuff:      assignee = currentUser() AND resolution = Unresolved
  Sprint stuff:  project = FE AND sprint in openSprints()
  Open bugs:     project = FE AND issuetype = Bug AND resolution = Unresolved
  Unestimated:   "Story Points" is EMPTY AND sprint is EMPTY

  DOD CHECKLIST:
  □ Code written + standards met
  □ Tests written + passing
  □ PR reviewed + approved
  □ Merged to main
  □ Deployed to staging
  □ AC verified
  □ No known bugs
  □ Docs updated (if needed)
```
