# Interview Debrief Template

Fill this out within 30 minutes of finishing any practice session or real interview, while it's still fresh. The goal is to make your practice compound — not just accumulate hours, but actually improve each round.

Copy the template below for each session. Store entries in a folder or append to a file.

---

## Debrief Entry

**Date:** _______________
**Type:** Practice / Phone Screen / Technical Screen / System Design / Onsite / Take-Home Review
**Company / Mock Partner:** _______________
**Duration:** _______________

---

### 1. What happened (2–3 sentences)

What was the format? What did they ask? What topics came up?

> Example: 45-minute technical screen. Two JS questions — one on closures, one on implementing Promise.all. Followed by 10 minutes of system design (design a rate limiter).

_______________

---

### 2. What went well

Be specific. Not "the coding went okay" — what exactly worked?

- [ ] Explained my thinking clearly before writing code
- [ ] Caught my own bug and fixed it without being told
- [ ] Asked a good clarifying question that changed my approach
- [ ] Explained time/space complexity correctly
- [ ] Kept composure when I didn't know something immediately
- [ ] Other: _______________

What would the interviewer remember positively about this session?

_______________

---

### 3. What failed or felt weak

Be honest. This is the most valuable section.

| What happened | Root cause |
|---|---|
| | |
| | |

> Examples:
> - Blanked on event loop question → haven't drilled JS internals enough
> - System design went shallow → didn't use a framework, jumped to solutions
> - Took 8 minutes to start coding → too much silent thinking, not narrating

_______________

---

### 4. Specific topics that need more work

List the topics, not vague feelings. "Be better at system design" is not actionable. "Practice capacity estimation for 20 minutes before tomorrow's mock" is.

| Topic | Specific gap | File to study | Priority |
|---|---|---|---|
| | | | High / Med / Low |
| | | | |

---

### 5. Communication and delivery

This section matters more when speaking in a second language. English under pressure degrades in predictable ways — identifying the pattern helps you fix it.

- Did I use filler words excessively? (um, like, you know, basically) → ___
- Did I speak too fast when nervous? → ___
- Did I go quiet when stuck instead of narrating? → ___
- Did I say "I don't know" without following up with what I do know? → ___
- Any specific moment where communication felt off? → _______________

---

### 6. One thing to do before the next session

Not a list. One thing. The highest-leverage change.

> Example: "Practise narrating my thought process on every problem for the next 3 days, even when the answer is obvious."

_______________

---

### 7. Overall feeling (1–10)

Not how well you did objectively — how did it feel? Track this over time to see if nerves are improving.

Score: ___  
What drove this number? _______________

---

## Pattern Tracking (update monthly)

Look across your last 10+ debriefs and fill this in:

### Topics I keep struggling with
| Topic | Times appeared | Status |
|---|---|---|
| | | Improving / Stuck / Resolved |

### Communication patterns that keep appearing
_______________

### What has improved since I started tracking
_______________

### What hasn't improved despite practice
_______________

---

## Example Completed Debrief

**Date:** 2024-01-20
**Type:** Mock — technical screen
**Mock Partner:** Self (recorded)
**Duration:** 50 min

**What happened:**
Two problems: flatten nested array (easy), then implement debounce from scratch (medium). Ended with 10 mins of questions about React rendering.

**What went well:**
- Got debounce working correctly including the edge case where delay resets on each call
- Explained the closure in debounce clearly: "the timer variable lives in the outer scope and persists across calls"

**What failed:**
| What happened | Root cause |
|---|---|
| Forgot to handle the case where flatten gets a non-array input | Rushed to code, didn't think through edge cases first |
| Said "um" constantly during the React explanation | Nervous, topic felt less solid |

**Specific gaps:**
| Topic | Specific gap | File to study | Priority |
|---|---|---|---|
| Edge case thinking | Not pausing to think through invalid inputs | INTERVIEW-CODING-PATTERNS-DEEP.md | High |
| React rendering | Couldn't explain why useCallback prevents re-render clearly | REACT-HIGH-DEEP.md | Med |

**Communication:**
Went quiet for ~40 seconds when first reading the debounce problem. Need to narrate even when uncertain: "OK, debounce — I need a function that delays execution and resets the timer if called again within the window. Let me think about what state I need..."

**One thing to do next:**
For every problem in the next 3 sessions: spend 2 full minutes talking through edge cases out loud before writing a single line of code.

**Score:** 6/10 — functional but sloppy edges
