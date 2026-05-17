# Interview Day Checklist

---

## 1 Week Before

- [ ] Research the company thoroughly (see Company Research section below)
- [ ] Look up your interviewers on LinkedIn — note their background and tenure
- [ ] Re-read the job description — identify 3 key skills they emphasise
- [ ] Prepare 5 strong questions to ask (see Questions to Ask section)
- [ ] Confirm interview format: how many rounds, what types (coding, system design, behavioural)
- [ ] Do a mock for each round type

---

## 2 Days Before

- [ ] Review `MOCK-INTERVIEW-QA.md` — all 50 Q&As
- [ ] Re-read your STAR stories from `BEHAVIORAL-DEEP.md`
- [ ] Do 2–3 LeetCode mediums to stay warm (don't grind, just stay sharp)
- [ ] Confirm interview time, format (video/onsite), and who you're meeting
- [ ] Test your setup if video: camera, mic, internet, Zoom/Meet
- [ ] Prepare your environment: second monitor for code if remote

---

## Night Before

- [ ] Light review only — no new material
- [ ] Prepare your workspace: water, notepad, pen, charger plugged in
- [ ] Set 2 alarms
- [ ] Sleep 7–8 hours minimum — this matters more than 1 more hour of studying

---

## Morning Of

- [ ] Eat a real meal — your brain needs glucose
- [ ] Brief review: scan `MOCK-INTERVIEW-QA.md` (don't study, just activate)
- [ ] 10 minutes of light exercise or walk — reduces anxiety, improves focus
- [ ] Log in 5–10 minutes early for remote; arrive 15 minutes early for onsite
- [ ] Have your resume open and ready to reference

---

## During the Interview

### Coding Round
```
1. Clarify before coding (2–3 min):
   - "Can the array be empty?"
   - "What should I return if there's no solution?"
   - "Are there constraints on time/space complexity?"

2. State your approach before writing:
   - "My first instinct is brute force — O(n²). I can optimise to O(n) with a hashmap."
   - Get a nod before coding

3. Talk while you code:
   - "I'm iterating left to right, tracking the complement in this map..."

4. Test with your own example:
   - "Let me trace through with [2,7,11,15], target=9..."

5. Edge cases at the end:
   - Empty array, single element, all negatives, duplicates, overflow

If stuck: state what you know, ask a clarifying question, or ask for a hint
         ("I'm thinking about using a sliding window here, does that seem right?")
```

### System Design Round
```
1. Clarify requirements (3–5 min):
   - Functional: "So we need to shorten URLs and redirect?"
   - Non-functional: "What scale are we targeting? DAU? Read-heavy or write-heavy?"
   - Out of scope: "Should I worry about analytics for now?"

2. Quick capacity estimate (2 min):
   - State numbers out loud so interviewer can correct you

3. High-level design first:
   - Draw boxes before going deep — let them redirect you

4. Dive deep on 2–3 components:
   - Ask: "Which part would you like me to go deeper on?"

5. Proactively mention trade-offs:
   - "I'm using Redis here for O(1) reads, the trade-off is eventual consistency..."
```

### Behavioural Round
```
Use STAR: Situation → Task → Action → Result

- Keep answers 2–3 minutes (not 30 seconds, not 10 minutes)
- Lead with impact: "I reduced deployment time by 60%..."
- Be specific: team size, dollar value, % improvement, timeframe
- Show ownership: "I decided to...", not "We kind of..."
- Don't badmouth previous employers or teammates — ever
```

---

## Company Research Template

Fill this out for every company before your interview.

### Business
- What does the company do? (one sentence)
- Who are their main customers?
- What is their main revenue model?
- Who are their main competitors?
- Recent news (last 3 months): funding, product launches, layoffs, acquisitions

### Engineering
- Tech stack (check StackShare, eng blog, job listings)
- Team size and structure (check LinkedIn)
- Engineering blog highlights — what problems are they solving?
- Open source contributions or notable projects
- Deployment cadence: startup pace vs enterprise?

### Role
- What does "senior" mean at this company? (check levels.fyi)
- Re-read JD: what's repeated? What's emphasised?
- What team would you join? (ask recruiter)
- What's the biggest challenge for this role? (ask in interview)

### Culture
- Glassdoor review themes (ignore outliers — look for patterns)
- Interview experience reports on Glassdoor/Blind
- Mission/values statement — can you speak to them genuinely?

---

## Questions to Ask the Interviewer

Pick 3–5 from this list. Tailor to your interviewer's role.

### About the role
- "What does success look like in this role in the first 90 days?"
- "What's the biggest challenge the team is currently facing?"
- "What does a typical sprint/week look like for this team?"
- "How does code review work here? What does the quality bar look like?"

### About the team & culture
- "How does the team make technical decisions? Is it top-down or collaborative?"
- "How do you handle technical debt — is there dedicated time for it?"
- "How do engineers grow into senior/staff here? What does that path look like?"
- "What's something you wish you'd known before joining?"

### About the company
- "What's the most exciting thing the engineering team is working on right now?"
- "How has the engineering team changed in the last year?"
- "How does the company think about remote work / in-office going forward?"

### Questions NOT to ask in the first interview
- Salary (let the recruiter bring it up, or wait until you have an offer)
- Vacation days, benefits (recruiter call or offer stage)
- "How many hours do people work?" (reads as not committed)
- Anything you could have googled

---

## After the Interview

- [ ] Send a thank-you email within 24 hours (short, genuine, 3–5 sentences)
- [ ] Note what questions you got — review your weak answers
- [ ] If you don't hear back in the stated timeframe, follow up once politely
- [ ] If rejected: ask for feedback (not always given, but worth asking)
- [ ] If you have multiple processes running, keep all of them moving in parallel

---

## Signs of a Good vs Bad Interview

```
Good signs:
  Interviewer goes into follow-up questions (means you answered well)
  They share details about the team / role unprompted
  Interview runs over time
  They ask about your timeline / other offers

Neutral (don't overthink):
  Long silence after you answer (they're thinking)
  They ask you to optimise (means your first answer was acceptable)
  Interviewer doesn't smile much (some just have a poker face)

Bad signs (but still finish strong):
  They cut you off and move on quickly
  Very short interview (but sometimes that's just their style)
```
