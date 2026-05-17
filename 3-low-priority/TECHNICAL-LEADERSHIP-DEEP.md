# Technical Leadership — Deep Reference

## What Senior Engineers Do Differently

> Junior: given a task, implements it.
> Mid: given a problem, breaks it into tasks and implements them.
> Senior: given a vague goal, clarifies the problem, proposes solutions with trade-offs, drives to a decision, unblocks others, and thinks about system-wide impact.

```
Senior engineer responsibilities:
✓ Write ADRs and RFCs to drive technical decisions
✓ Give high-quality code reviews that teach, not just gate
✓ Identify and address technical debt proactively
✓ Mentor junior/mid engineers
✓ Break down ambiguous problems into clear tasks
✓ Communicate technical concepts to non-technical stakeholders
✓ Think about the long-term maintainability of every decision
✓ Set and uphold quality standards for the team
```

---

## Architecture Decision Records (ADRs)

> ADRs document significant technical decisions — what was decided, why, and what alternatives were rejected. Invaluable for: onboarding new engineers (why is the codebase this way?), preventing re-litigating solved debates, postmortem analysis.

### ADR Template

```markdown
# ADR-001: Use PostgreSQL as primary database

**Date**: 2026-05-13
**Status**: Accepted  (Proposed | Accepted | Deprecated | Superseded by ADR-XXX)
**Deciders**: [names or roles]

## Context
We need to choose a primary database for the taskboard application.
The team has SQL expertise. We need ACID transactions for task operations.
Expected scale: 100k users, 1M tasks in year one.

## Decision
Use PostgreSQL as the primary database.

## Alternatives Considered

| Option        | Pros                          | Cons                              |
|---------------|-------------------------------|-----------------------------------|
| PostgreSQL    | ACID, full SQL, great tooling | Horizontal scaling harder         |
| MongoDB       | Flexible schema, easy start   | No ACID across docs, less SQL     |
| DynamoDB      | Infinite scale, managed       | Limited query patterns, no JOINs  |

## Rationale
PostgreSQL fits our access patterns (relational data with JOINs), the team knows SQL,
and we don't have the scale that would require NoSQL. We can reach millions of users
with Postgres + read replicas before needing to reconsider.

## Consequences
+ Strong consistency, ACID transactions
+ Familiar to team — fast development
+ Rich query capabilities
- Will need read replicas at ~500k users
- Schema migrations require care (zero-downtime migration approach needed)
```

---

## RFCs — Request for Comments

> Longer-form technical proposal for significant changes. More detailed than an ADR — explains the problem, proposed solution, implementation plan, and open questions. Used when a decision affects multiple teams or requires input before committing.

### RFC Structure

```markdown
# RFC: Migrate task storage to event sourcing

**Author**: Harry Wang
**Created**: 2026-05-13
**Status**: Draft | In Review | Accepted | Rejected

## Summary
One paragraph explanation of the proposal.

## Motivation
Why are we doing this? What problem does it solve?
What does "done" look like?

## Detailed Design
How exactly would this work? Include code examples, diagrams.
Walk through the most important scenarios.

## Drawbacks
What are the downsides? Be honest — build trust.

## Alternatives
What else was considered? Why was this approach chosen?

## Unresolved Questions
What needs to be figured out before/during implementation?

## Implementation Plan
Phased rollout, migration strategy, timeline.
```

---

## Code Review

### As a Reviewer

```
What to look for (priority order):
1. Correctness — does it do what it's supposed to?
2. Security — SQL injection, XSS, auth bypasses, secrets in code
3. Tests — are the important paths tested? Are tests testing behavior, not implementation?
4. Design — is this the right abstraction? Does it fit the codebase?
5. Performance — any obvious N+1, missing indexes, large allocations in loops?
6. Error handling — unhappy paths covered?
7. Style/readability — last priority; automate with linters where possible

Tone rules:
✓ Ask questions instead of making demands: "What do you think about..." vs "Change this to..."
✓ Explain the why: "This could cause X because Y" vs "This is wrong"
✓ Distinguish blocking vs non-blocking: "nit:", "optional:", "blocking:"
✓ Praise good solutions — positive reinforcement matters
✗ Don't nitpick style if there's a linter
✗ Don't rewrite the PR in comments — talk to the author instead
✗ Don't leave a PR unreviewed for > 1 business day — it blocks your teammate
```

### As an Author

```
Before requesting review:
✓ Self-review your diff — you'll catch 30% of issues yourself
✓ PR description: what changed, why, how to test, screenshots for UI
✓ Break large PRs into smaller ones — < 400 lines is reviewable; 2000 lines is not
✓ Add context for reviewers: "This is a tricky area because..."
✓ Respond to every comment — even if just "done" or "disagree, here's why"
✓ Don't push new commits silently after requesting review — comment what changed
```

---

## Mentoring Junior Engineers

### Principles

```
The goal: help them level up, not do their work for them.

1. Ask questions before giving answers
   "What have you tried?" "What does the error say?" "What would happen if..."
   This builds problem-solving skills, not dependency.

2. Explain the "why", not just the "what"
   Don't just fix their code — explain the principle behind the fix.
   "The reason we do X is because in a distributed system, Y can happen..."

3. Be available but not hovering
   Check in regularly, but let them struggle productively for a reasonable time.
   Struggling builds skill; being stuck for 2+ hours builds frustration.

4. Give specific, actionable feedback
   ✗ "This code is messy"
   ✓ "This function does 3 things — separating them would make it easier to test"

5. Involve them in decisions
   "What do you think we should do here?" — even if you know the answer.
   They learn by participating in technical discussions.
```

---

## Technical Communication

### Explaining Technical Concepts to Non-Technical Stakeholders

```
Principles:
1. Lead with impact, not implementation
   ✗ "We need to refactor the authentication middleware"
   ✓ "Our login is slow and occasionally broken — fixing it requires 2 weeks of work
       and will make login 3x faster and eliminate 95% of auth-related bugs"

2. Use analogies, not jargon
   Technical debt → "Like financial debt — we've been borrowing time by taking shortcuts;
                      now we're paying interest every time we touch that code"
   CI/CD → "Like an assembly line that automatically tests and ships every change"

3. Frame decisions as trade-offs, not opinions
   "We can ship in 2 weeks with X risk, or 4 weeks with much lower risk — your call"

4. Translate numbers into business terms
   "200ms slower" → "Studies show every 100ms of latency reduces conversions by 1%"
```

### Writing Good Technical Documentation

```markdown
# Component/System Name

## What it does (1-2 sentences — the "what", not the "how")

## Why it exists (the problem it solves)

## How to use it (with working examples — copy-pasteable)

## How it works (high-level, for contributors)

## Known limitations / gotchas

## Related systems / further reading
```

---

## Estimation and Planning

### Breaking Down Work

```
Good task breakdown:
- Each task is independently deployable (no "depends on X to be done first")
- Each task is testable in isolation
- Each task has a clear definition of done
- No task > 2 days of work (if it is, break it down further)

Estimation approach:
1. Break into small tasks first
2. Estimate each independently
3. Add 20-30% buffer for integration, review, and unknowns
4. Identify risks early: "X depends on an API I haven't used — add a spike"
5. Track velocity over time — improve estimates by comparing to actuals
```

### Managing Technical Debt

```
Strategies:
- Boy Scout Rule: leave the code better than you found it (small improvements with every PR)
- Tech debt backlog: track it explicitly, estimate cost, prioritize periodically
- Debt tax: allocate 20% of each sprint to debt reduction
- Refactor in the same PR as the feature that touches the code

When to push back on scope:
- "We can do X in 2 weeks, or the right way in 3 weeks — here's what the shortcut risks"
- Never just say no — always offer an alternative with the trade-off
```

---

## Most Asked Technical Leadership Interview Questions

### "Tell me about a technical decision you drove."

> Use STAR. Show: you identified the problem, researched options, documented trade-offs, built consensus, drove to a decision, and followed through. Include what you would do differently. Mention how you communicated the decision to the team and stakeholders.

### "How do you handle technical disagreements on the team?"

> 1) Make sure both sides understand each other — often "disagreements" are miscommunication. 2) Focus on data and trade-offs, not opinions. 3) Write it down — an ADR or short doc forces clarity. 4) Involve a third party (staff engineer, tech lead) if stuck. 5) Set a decision deadline — endless debate is worse than a suboptimal choice. 6) Once decided, everyone commits — disagree and commit.

### "How do you balance technical debt with feature delivery?"

> Frame it as a product risk, not an engineering preference. "This area has X incidents per month and takes Y hours to debug each time — that's Z hours of sprint capacity being consumed by debt." Make the cost visible. Advocate for regular debt reduction (20% sprint allocation, not big-bang rewrites). Pick debt that blocks velocity or reliability — not cosmetic refactors.

### "How do you onboard a new engineer to a complex codebase?"

> 1) Week 1: dev environment setup, deploy a small bug fix (builds confidence, shows the deploy process). 2) Pair on a medium-sized feature. 3) Provide an architectural overview — the big picture, not every detail. 4) Regular check-ins (not just "any questions?" — ask specific questions). 5) Good documentation helps more than any walkthrough. 6) Set clear 30/60/90-day expectations.

### "What makes a good pull request?"

> Small (< 400 lines), focused (one logical change), with a description that explains WHY (not just what — the diff shows what), includes tests, passes CI, and anticipates reviewer questions. Large PRs should be broken up — not because of a rule, but because large PRs get rubber-stamped, miss bugs, and are painful to review. A good PR respects the reviewer's time.
