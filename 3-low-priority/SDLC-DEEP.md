# SDLC — Software Development Life Cycle — Deep Reference

## What is SDLC?

> The Software Development Life Cycle is a structured process for planning, creating, testing, and delivering software. It defines phases, roles, and activities. Different methodologies implement these phases differently — some sequentially (Waterfall), some iteratively (Agile).

---

## Methodologies

### Waterfall

> Linear, sequential — each phase must be completed before the next begins. Phases: **Requirements → Design → Implementation → Testing → Deployment → Maintenance**. No going back. Works for: fixed-scope projects with stable requirements (construction, regulated industries). Fails when: requirements change, which they always do in software. By the time you ship, the requirements are wrong.

```
Requirements → Design → Build → Test → Deploy → Maintain
     ↓              ↓        ↓       ↓       ↓
  (locked in)                           (6-12 months later)
```

---

### Agile

> An iterative, incremental approach based on the **Agile Manifesto** (2001). Core values:
> - **Individuals and interactions** over processes and tools
> - **Working software** over comprehensive documentation
> - **Customer collaboration** over contract negotiation
> - **Responding to change** over following a plan

> The right side has value — but the left side is valued more. Agile is not a methodology — it's a set of values and principles. Scrum and Kanban are frameworks that implement Agile.

**12 Agile Principles (the most important ones):**
1. Deliver working software frequently (weeks, not months)
2. Welcome changing requirements, even late in development
3. Business people and developers work together daily
4. Build projects around motivated individuals
5. Working software is the primary measure of progress
6. Simplicity — maximizing work not done — is essential

---

### Scrum

> The most widely used Agile framework. Empirical process control: inspect and adapt. Work is organized in **Sprints** (1-4 weeks, fixed). Three pillars: **Transparency** (visible work), **Inspection** (regular reviews), **Adaptation** (change based on feedback).

#### Roles
```
Product Owner (PO)     — owns the product backlog, prioritizes, represents business value
Scrum Master (SM)      — facilitates the process, removes blockers, not a manager
Development Team       — self-organizing, cross-functional, delivers the increment
```

#### Artifacts
```
Product Backlog        — ordered list of everything to be done (PO owns this)
Sprint Backlog         — subset of product backlog selected for the current sprint
Increment             — the sum of all completed backlog items; must be "Done" (potentially shippable)
Definition of Done (DoD) — shared understanding of what "complete" means (tests pass, reviewed, deployed to staging, etc.)
```

#### Ceremonies (Events)
```
Sprint Planning        — team selects items from backlog and plans the sprint (timebox: 8h for 4-week sprint)
Daily Scrum (Standup)  — 15-min sync: what did I do yesterday? what will I do today? any blockers?
Sprint Review          — demonstrate the increment to stakeholders; gather feedback (timebox: 4h)
Sprint Retrospective   — inspect the process: what went well? what to improve? (timebox: 3h)
Backlog Refinement     — ongoing grooming of upcoming items (not an official Scrum event)
```

#### Story Points and Velocity
> **Story points** — relative effort estimate (not hours). Teams use Fibonacci sequence (1, 2, 3, 5, 8, 13) — the gap between numbers reflects increasing uncertainty. **Velocity** — average story points completed per sprint. Used for forecasting, not performance comparison between teams. Never compare velocities across teams — points are team-specific.

```
Planning Poker:
- Everyone estimates independently
- Reveal simultaneously (prevents anchoring)
- Discuss outliers
- Re-estimate until consensus
```

---

### Kanban

> A flow-based system — work items flow through stages continuously, no sprints. Visualize work on a board. **Key principles**: visualize workflow, limit WIP (Work in Progress), manage flow, make policies explicit, implement feedback loops, improve collaboratively. No fixed roles or ceremonies — adapt to your context. Better than Scrum for: operations, support, maintenance work with unpredictable interruptions.

```
Kanban Board:
┌──────────┬────────────┬──────────────┬────────────┬──────────┐
│  Backlog │   To Do    │  In Progress │  In Review │   Done   │
│          │            │   (WIP: 3)   │  (WIP: 2)  │          │
├──────────┼────────────┼──────────────┼────────────┼──────────┤
│ Task D   │ Task C     │ Task B       │ Task A     │ Task Z   │
│ Task E   │            │ Task F       │            │          │
│ Task G   │            │              │            │          │
└──────────┴────────────┴──────────────┴────────────┴──────────┘

WIP Limits: prevents bottlenecks, forces finishing before starting
```

#### Key Kanban Metrics
```
Lead Time      — time from item created to delivered (customer perspective)
Cycle Time     — time from work started to delivered (team perspective)
Throughput     — items completed per time period
CFD (Cumulative Flow Diagram) — visualize flow and spot bottlenecks
```

---

### Scrum vs Kanban — When to Use Each

```
Scrum                                    Kanban
────────────────────────────────────────────────────────────
Fixed-length sprints (1-4 weeks)         Continuous flow, no sprints
Good for feature development             Good for ops/support/maintenance
Predictable velocity after ramp-up       Better for unpredictable work
Changes wait for next sprint             Changes can enter anytime
Sprint goal provides focus               WIP limits provide focus
Roles: PO, SM, Dev Team                  No prescribed roles
Regular cadence of ceremonies            Ceremonies as needed
```

---

### SAFe — Scaled Agile Framework

> Agile at enterprise scale. Coordinates multiple teams working on the same product. Key levels: Team (Scrum/Kanban), Program (PI Planning — Program Increment), Portfolio. **PI Planning** is a 2-day event where all teams align on a quarter's worth of work. Used by large organizations (100+ engineers). Criticism: heavy process overhead can conflict with Agile's simplicity values.

---

### Shape Up (Basecamp)

> An alternative to Scrum used by Basecamp/37signals. 6-week cycles (long enough to build something meaningful). "Shaping" work upfront: define the problem and rough solution before scheduling. No backlogs — unfinished work is not carried forward. Two-week cooldown between cycles. Small teams (1 designer + 1-2 developers) given full ownership of a shaped project.

---

## Software Development Practices

### Definition of Ready (DoR) vs Definition of Done (DoD)

> **DoR** — criteria a backlog item must meet before the team can start working on it: clear acceptance criteria, small enough for one sprint, dependencies identified, designs available. Prevents starting work that can't be completed. **DoD** — criteria that must be met before an item is considered complete: code reviewed, tests written and passing, deployed to staging, product owner accepted, documentation updated. DoD is the team's quality contract.

---

### Sprint Velocity vs Capacity

> **Velocity** — how many story points the team actually completed in past sprints (historical, used for forecasting). **Capacity** — available hours this sprint (account for holidays, sick days, other commitments). Use capacity to check if sprint commitment is realistic; use velocity for longer-term forecasts (roadmap planning).

---

### User Stories and Acceptance Criteria

> A user story is a lightweight description of a feature from the user's perspective: **"As a [user type], I want [goal] so that [benefit]."** Acceptance criteria define when the story is done — specific, testable conditions. The **INVEST** acronym: stories should be Independent, Negotiable, Valuable, Estimable, Small, Testable.

```
Story: "As a logged-in user, I want to mark a task as done so that I can track my progress."

Acceptance Criteria:
✓ Clicking the checkbox marks the task as done
✓ Done tasks appear with a strikethrough
✓ The change persists after page refresh
✓ Can be undone by clicking again
✓ Done state is visible in the task list
```

---

### Retrospective Formats

```
Start/Stop/Continue:
  Start:    practices we should start doing
  Stop:     practices that aren't helping
  Continue: practices working well

4Ls:
  Liked:    what went well
  Learned:  what did we learn
  Lacked:   what was missing
  Longed For: what we wished we had

Mad/Sad/Glad:
  Emotional check-in on the sprint

Sailboat:
  Wind (helping us): what's pushing us forward
  Anchors (slowing us): what's holding us back
  Rocks (risks): upcoming dangers
  Island (goal): where we're headed
```

---

## Most Asked SDLC Interview Questions

### "What is the difference between Agile and Scrum?"

> Agile is a mindset and set of values (the Manifesto). Scrum is a specific framework that implements Agile principles. You can be Agile without using Scrum (Kanban is also Agile). Scrum is the most popular Agile framework. Many teams say "we do Agile" when they mean "we do Scrum with some modifications." Understanding the difference shows you know the principles, not just the rituals.

### "What happens when a Sprint can't be completed?"

> Incomplete sprint items are not carried over automatically — the team should assess: is the item partially done (return to backlog, re-estimate)? Was the scope too large (improve estimation)? Were there unexpected blockers (discuss in retro)? In Scrum, only fully done items count toward velocity — partial work doesn't. The Sprint Review still happens; the team demonstrates what was completed.

### "How do you handle changing requirements mid-sprint?"

> In Scrum: changes generally wait for the next sprint. If the requirement is urgent, the Product Owner can cancel the sprint (rare, costly). The team and PO negotiate: can the new item replace an existing sprint item of similar size? The goal is to protect the team's focus and commitment. This is a feature, not a bug — predictability requires stability of sprint goals.

### "What is the difference between a bug and a feature?"

> A bug is a deviation from specified, agreed-upon behavior. A feature is new functionality not previously specified. This distinction matters for: sprint planning (bugs may bypass normal estimation), prioritization, and SLA commitments. "It works as designed but users don't like it" — that's a feature request, not a bug. When in doubt, discuss with the product owner.

### "What does it mean for code to be 'done'?"

> Done means the Definition of Done is met — the team's shared quality criteria: code is written, reviewed, tested (unit + integration), the CI pipeline passes, it's deployed to the test/staging environment, acceptance criteria are verified, no known critical bugs, documentation updated if needed. "Done done" is sometimes used to distinguish truly complete from "code complete." The DoD should be explicit and posted visibly.

### "How do you estimate tasks as a developer?"

> Use story points for relative complexity (not hours). Break large items into smaller ones (nothing larger than can be completed in half a sprint). Consider: complexity, uncertainty, risk, amount of work. Use Planning Poker to surface different assumptions. When unsure, add a spike (time-boxed investigation task) before estimating the real work. Track your velocity over time — estimation accuracy improves with practice and historical data.
