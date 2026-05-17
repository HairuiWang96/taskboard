# Take-Home Project Guide

Companies send a coding assignment (3 hours to 7 days) to filter before or after the phone screen. Most candidates treat it like a LeetCode problem — just make it work. That's how you lose to someone with the same skills but better presentation.

---

## The Real Evaluation Criteria

You're not being judged only on correctness. Interviewers read the code like a code review:

1. **Does it work?** — Basic bar, table stakes
2. **Is the code readable?** — Names, structure, no magic numbers
3. **Does the README tell me how to run it and why you made choices?** — Many candidates skip this entirely
4. **Did you test the right things?** — Not 100% coverage, but the important paths
5. **Does it look like production code or a script?** — Error handling, edge cases, separation of concerns

---

## Before You Start

### Read the spec twice
- Note every explicit requirement
- Note every implicit requirement (e.g. "users can log in" → auth, session management, password handling)
- Note what is NOT specified — you'll make choices here, document them

### Clarify before building
If you can contact the recruiter or hiring manager:
- Ask the one most important ambiguous question
- Do not ask questions you can resolve yourself
- Asking good questions signals seniority

### Time-box ruthlessly
| Assignment length | Time to spend |
|---|---|
| "A few hours" | 3–4 hours max |
| "Over a weekend" | 6–8 hours max |
| "Up to a week" | 10–15 hours, no more |

Spending 40 hours on a 7-day assignment signals poor time management, not dedication.

---

## What to Prioritise (in order)

### 1. A working core feature
The stated main requirement must work end-to-end. A polished README around broken functionality is worse than working code with no README.

### 2. A great README
This is the single highest-leverage thing most candidates skip. The interviewer opens your repo — they see the README first.

**README must include:**
- What the project does (one sentence)
- How to run it locally (exact commands, no assumed knowledge)
- How to run tests
- Technical decisions you made and why (the most important section)
- What you would do differently with more time
- Any known limitations or edge cases you chose not to handle

**Technical decisions section example:**
```
## Technical Decisions

- **SQLite over PostgreSQL**: Simpler local setup with no Docker dependency.
  In production I'd use PostgreSQL with connection pooling.

- **No authentication**: The spec didn't require it. I've added a TODO comment
  showing where I'd plug in JWT middleware.

- **No pagination on /items endpoint**: Dataset in the spec is small. For
  production I'd add cursor-based pagination.
```

This section shows you think in trade-offs, not just implementations.

### 3. Tests on the critical path
Do NOT aim for coverage percentage. Test:
- The happy path of each core feature
- At least one error case per feature
- Any business logic with branching (discounts, permissions, state machines)

Skip testing: trivial getters/setters, framework boilerplate, config files.

```typescript
// Good test — tests a real business rule
it('should reject order if item is out of stock', async () => {
  const item = await createItem({ stock: 0 });
  const result = await placeOrder({ itemId: item.id, quantity: 1 });
  expect(result.error).toBe('INSUFFICIENT_STOCK');
});

// Not worth testing — trivial
it('should return item name', () => {
  const item = new Item({ name: 'Widget' });
  expect(item.name).toBe('Widget');
});
```

### 4. Clean, readable code
- Functions do one thing
- Names describe intent, not implementation (`getUsersWithExpiredSubscriptions`, not `getExpUsers`)
- No magic numbers — use named constants
- No deeply nested callbacks or conditionals
- Consistent style (run a linter, ideally ESLint + Prettier)

### 5. Error handling at boundaries
Handle errors at system entry points (HTTP handlers, file reads, external API calls). Internal functions can throw — let the boundary catch.

```typescript
// HTTP handler — boundary, handle everything
app.post('/orders', async (req, res) => {
  try {
    const order = await orderService.create(req.body);
    res.json({ order });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    logger.error('Unexpected error creating order', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Common Mistakes That Kill Submissions

### Submitting without running it fresh
Always do this before submitting:
```bash
rm -rf node_modules
npm install
npm test
npm start
# Manually test the main feature
```

Many submissions fail to install or run. This is an instant rejection.

### Overengineering
A take-home for a mid-size startup does not need:
- Microservices
- Docker Compose with 5 containers
- CI/CD pipeline
- GraphQL when REST was implied
- Event sourcing

Build what was asked. Add one or two things that show senior thinking. Document everything else as "what I'd do with more time."

### Underengineering
The opposite mistake: a single `index.js` file with no structure, no error handling, no tests. Even for a simple spec, show structure.

Minimum expected structure:
```
src/
  routes/        HTTP handlers
  services/      Business logic (this is where tests go)
  models/        Data models / DB queries
  middleware/    Auth, validation, logging
tests/
  integration/   End-to-end route tests
  unit/          Service logic tests
README.md
package.json
.env.example    (not .env — never commit secrets)
```

### Committing secrets
Never commit `.env` files with real credentials. Always provide `.env.example` with placeholder values.

---

## The Follow-Up Presentation

Most companies do a 30–60 minute walkthrough after you submit. This is where many candidates lose points they earned in the code.

### Structure your walkthrough (15 minutes max)
1. **What it does** — demo the working feature (2 min)
2. **How it's structured** — high-level architecture, why you split things this way (3 min)
3. **One decision you're proud of** — a specific trade-off that shows senior thinking (3 min)
4. **What you'd change** — be honest, this shows self-awareness (2 min)
5. **Open to questions** — hand control to the interviewer (rest of time)

### How to talk about your code
Do not read the code aloud. Explain the thinking:
- "I put the business logic in a service layer separate from the HTTP handler so it's independently testable"
- "I used an in-memory cache here because the spec said reads are 10x more frequent than writes"
- "I chose not to add authentication — the spec didn't require it but here's where I'd add it"

### When they find a bug
This happens. The correct response:
1. Acknowledge it immediately — "Good catch, yes, that would break if..."
2. Explain what you'd do to fix it — "I'd add a guard here and a test for this case"
3. Do not make excuses

---

## Time Management During the Assignment

### Day 1 (if multi-day)
- Read spec thoroughly
- Set up project scaffold, git repo, basic structure
- Get the simplest version of the core feature working end-to-end
- Commit frequently (commit history is sometimes reviewed)

### Middle days
- Fill out features
- Write tests as you go, not at the end
- Keep a running notes doc of decisions and trade-offs

### Last day
- Write / polish README
- Clean up code (naming, dead code, console.logs)
- Run the clean install test
- Review as if you're the interviewer

---

## Quick Reference Checklist

Before submitting:
- [ ] Core feature works end-to-end
- [ ] README has: setup steps, test steps, technical decisions, known limitations
- [ ] Tests cover happy paths and at least one error case per feature
- [ ] No secrets committed (check `.gitignore`)
- [ ] Fresh `npm install && npm test && npm start` works
- [ ] Code is linted (no obvious style issues)
- [ ] Commit history is clean and tells a story
- [ ] `.env.example` exists with placeholder values
