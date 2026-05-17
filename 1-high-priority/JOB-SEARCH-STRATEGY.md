# Job Search Strategy

Getting interviews is a separate skill from passing interviews. Most engineers spend 95% of their prep time on technical skills and almost none on the pipeline that generates opportunities. This file covers the pipeline.

---

## The Hierarchy of Application Methods

Not all applications are equal. Roughly:

| Method | Interview rate |
|---|---|
| Employee referral | 20–40% |
| Direct recruiter outreach to you | 15–25% |
| Applying to a warm intro from your network | 10–20% |
| Applying via company website (cold) | 1–3% |
| Applying via job board (cold) | <1% |

Optimise for the top of this list. Cold applications are a numbers game you will lose to candidates with referrals.

---

## Referrals — The Most Important Thing

### How referrals work
An internal employee submits your application through an internal portal, flagging you as someone they know. Your resume goes to the top of the queue and often bypasses initial screening entirely. At some companies, a referral from a senior engineer guarantees a first-round call.

### Finding people to refer you

**Step 1: Map your network**
List everyone you know who works at a company you're targeting:
- Former colleagues
- University classmates
- People you've collaborated with on open source
- Conference / meetup connections
- People you've helped online (answered questions, reviewed PRs)

**Step 2: LinkedIn second-degree connections**
Search the target company on LinkedIn → click "employees" → filter by "2nd connections" → look for shared connections who could introduce you.

**Step 3: Alumni networks**
Search `[Target Company] [Your University] LinkedIn` — alumni are far more likely to help than strangers.

**Step 4: Cold outreach for referrals**
If you have no connection, you can cold message an employee. Success rate is low but not zero.

Template:
```
Subject: Quick question about [Company] engineering

Hi [Name],

I'm a senior frontend/fullstack engineer with X years of experience in 
[React, Node, TypeScript]. I've been following [company]'s work on 
[specific thing you genuinely admire — product, open source, engineering blog].

I'm actively exploring new opportunities and [company] is at the top of 
my list. Would you be open to a 15-minute chat? I'd love to hear about 
your experience on the engineering team — and if you think I'd be a 
good fit, a referral would mean a lot.

[Link to your GitHub or portfolio]

Thanks for your time,
[Name]
```

Rules for cold outreach:
- Personalise every message — no copy-paste templates (they are obvious)
- Reference something real and specific about the company
- Ask for a conversation first, not directly for a referral
- Keep it short — they owe you nothing
- Don't follow up more than once

---

## LinkedIn Profile Optimisation

Recruiters search LinkedIn every day. This is passive inbound that compounds over time.

### Headline
Not your job title. Write what you do and who you do it for.

Bad: `Senior Frontend Engineer at Acme Corp`

Good: `Senior Frontend Engineer | React, TypeScript, Node.js | Building scalable UIs for fintech and SaaS`

Good (if open to work): `Frontend Engineer (Open to Work) | React · TypeScript · Node · 6 YOE`

### About section
3–5 sentences. What you build, what you're good at, what kind of role you want next. Do not paste your resume here.

Example:
```
I'm a senior frontend engineer with 6 years building product at 
startup and scale-up stage companies. I specialise in React and TypeScript, 
and I care about performance, accessibility, and teams that ship fast 
without accumulating debt.

Currently open to senior or staff frontend/fullstack roles at product 
companies. Particularly interested in fintech, developer tools, and 
mission-driven startups.

GitHub: [link] | Portfolio: [link]
```

### Experience section
- Each role: 3–5 bullet points
- Lead with impact, not tasks: "Reduced page load time by 40% by migrating to server-side rendering" not "Worked on performance improvements"
- Include tech stack at the end of each role
- Quantify wherever possible: users, latency, uptime, revenue impact

### Skills and endorsements
List the specific technologies you want to be found for. Recruiters filter by skill. Include: React, TypeScript, Node.js, JavaScript, GraphQL, etc.

### "Open to Work" settings
Set this to visible to recruiters only (not public) to avoid alerting your current employer. Go to: Profile → Open to Work → Recruiters only.

Specify:
- Job titles you want (be specific: "Senior Frontend Engineer", "Staff Engineer", not just "Engineer")
- Location: remote, specific cities
- Start date: immediately / 1 month / 3 months

---

## Talking to Recruiters

### Inbound recruiter (they messaged you)

This is a warm lead. Respond even if you're not actively looking — at minimum, it's intel on the market.

Response template (interested):
```
Hi [Name], thanks for reaching out. [Company] is interesting to me — 
I've been following [specific thing]. I'm open to exploring. 

Could you share a bit more about the role — team size, stack, and 
the kind of problems the team is focused on? Happy to jump on a 
call if there's a good fit.
```

Response template (not interested but want to stay on radar):
```
Hi [Name], thanks for the message. I'm not actively looking right now 
but [Company] is on my radar for the future. Happy to connect and 
stay in touch.
```

### Screening call with recruiter
The recruiter's job is to qualify you before spending engineering time on you. Their questions:

**"Walk me through your background"**
2-minute summary. Current role → key accomplishments → why you're looking → what you want next. Practise this until it's smooth.

**"What are your compensation expectations?"**
Do not anchor low. Research market rates first (Levels.fyi, Glassdoor, Blind, Glassdoor).

Tactical responses:
- "I'm flexible depending on the full package. What's the band for this role?"
- "Based on my research and current compensation, I'm targeting [X–Y range]. Is that aligned with the budget?"

Never say "I'm open to anything" — it anchors to the bottom of their range.

**"Why are you leaving / why are you looking?"**
Keep it positive and forward-looking. Avoid criticising current employer.

Good: "I've learned a lot at [current company] and I'm ready for a role with more scope / a larger user base / more technical challenge in [specific area]."

---

## Which Job Boards Actually Work

### High signal
- **LinkedIn Jobs** — most recruiter traffic, referral network, easy to apply
- **Greenhouse / Lever / Workday** — company-direct applications (linked from company sites)
- **Y Combinator Work at a Startup** — startups only, high quality, often fast-moving
- **Wellfound (formerly AngelList Talent)** — startup-focused, salary transparency
- **Levels.fyi Jobs** — tech-focused, salary data included

### Situational
- **Indeed** — high volume but low signal, good for finding companies then applying direct
- **Glassdoor Jobs** — useful for company research alongside applying
- **Remote.co / We Work Remotely** — if targeting remote-only roles
- **HN Who's Hiring** — first of every month thread, often direct from founders/eng leads

### Not worth much
- Generic job boards with no tech focus
- Sites that re-aggregate listings (you end up applying to duplicates)

---

## Cold Outreach to Engineering Leaders

If you want to work at a specific company and have no referral path, reaching out directly to an engineering manager or VP Eng can work — especially at smaller companies.

This is a longer shot but occasionally pays off. Only do this if you have something specific to say.

Template:
```
Subject: Senior frontend engineer — interested in [Company]

Hi [Name],

I've been following [Company]'s [specific product/engineering blog post/open source work]. 
[One sentence on what specifically interested you — show you actually looked.]

I'm a senior frontend engineer with [X years] experience in [React / TypeScript / Node].
Most recently I've been at [Company type], where I [one specific accomplishment].

I know you may not have an open role right now, but I'd love to stay on your radar 
for when you do. I'm also happy to chat informally — I'm curious about [specific 
challenge the company is solving].

[GitHub link]

Thanks,
[Name]
```

---

## Tracking Your Pipeline

You need a system. Without one, you forget follow-up dates, confuse similar roles, and can't identify what's working.

Simple spreadsheet columns:
| Company | Role | Source | Date Applied | Status | Next Step | Notes |
|---|---|---|---|---|---|---|
| Stripe | Senior FE | Referral (Jane) | 2024-01-15 | Phone screen scheduled | Jan 22 call | React focus, fintech exp helpful |

Review and update this every day you're actively searching.

---

## Timeline Expectations

Realistic timelines from application to offer:

- **Referral at a fast company**: 2–4 weeks
- **Cold application, standard process**: 4–8 weeks
- **Large company (FAANG-tier)**: 6–12 weeks, sometimes longer

Plan accordingly. Start applying before you're desperate. The best time to look is when you don't need to.

---

## Quick Action Plan for Week 1

1. Update LinkedIn profile (headline, about, experience bullets)
2. Set "Open to Recruiters" on LinkedIn
3. List 10–15 target companies
4. For each company: find one person you know or one second-degree connection
5. Send 3–5 referral ask messages
6. Apply cold to 5 companies via their website (not job boards)
7. Set up a pipeline tracker spreadsheet
