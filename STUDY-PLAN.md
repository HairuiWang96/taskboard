# Study Plan — JS/Fullstack Senior Engineer Interview

Assumes 8 weeks of preparation with ~2–3 hours/day on weekdays, 4–5 hours on weekends.
Adjust the pace based on your timeline — compress to 4 weeks by doubling up weeks.

---

## Before You Start

- [ ] Set your target interview date
- [ ] List your target companies (changes what to prioritise)
- [ ] Create a LeetCode account — do problems daily alongside theory
- [ ] Set up Anki or Notion for spaced repetition on key concepts
- [ ] Read `INTERVIEW-PREP.md` and `INTERVIEW-DAY-CHECKLIST.md` first

---

## Week 1 — JavaScript Core + TypeScript

**Goal:** Be able to explain any JS concept from first principles and write clean TS.

| Day | Study | LeetCode |
|-----|-------|----------|
| Mon | `JAVASCRIPT-DEEP.md` — closures, hoisting, prototype chain | Two Sum, Valid Parentheses |
| Tue | `JAVASCRIPT-DEEP.md` — this, call/apply/bind, event loop | Reverse Linked List |
| Wed | `JS-ASYNC-DEEP.md` — Promises, async/await edge cases, generators | Climbing Stairs |
| Thu | `TYPESCRIPT-DEEP.md` — types, interfaces, generics basics | Best Time to Buy/Sell Stock |
| Fri | `TYPESCRIPT-ADVANCED-DEEP.md` — conditional types, mapped types, infer | Contains Duplicate |
| Sat | `JS-INTERVIEW-LIVE-CODING.md` — implement: debounce, throttle, curry, memoize, deepClone | LeetCode Easy ×3 |
| Sun | Review week 1 + self-quiz without notes | LeetCode Easy ×2 |

**Week 1 self-test (no notes):**
- Explain the event loop and microtask queue
- Implement `Promise.all` from scratch
- Write a generic `DeepReadonly<T>` type
- What's the difference between `==` and `===`? Give 3 surprising examples.

---

## Week 2 — React + State Management

**Goal:** Understand React deeply, not just "how to use hooks" but why they work.

| Day | Study | LeetCode |
|-----|-------|----------|
| Mon | `REACT-DEEP.md` — reconciliation, virtual DOM, Fiber, keys | Maximum Subarray |
| Tue | `REACT-DEEP.md` — hooks deep dive (useState, useEffect, useRef, useCallback, useMemo) | Merge Intervals |
| Wed | `REACT-HIGH-DEEP.md` — patterns: compound components, render props, HOCs, portals | Product of Array Except Self |
| Thu | `STATE-MANAGEMENT-DEEP.md` — Redux Toolkit (slices, thunk, saga, RTK Query) | Valid Sudoku |
| Fri | `STATE-MANAGEMENT-DEEP.md` — Zustand, Jotai, TanStack Query, when to use each | Group Anagrams |
| Sat | `REACT-INTERVIEW-LIVE-CODING-TS.md` — implement: useDebounce, useFetch, virtualized list, modal | LeetCode Medium ×3 |
| Sun | Review + build a small app from memory (custom hook + RTL test) | LeetCode Medium ×2 |

**Week 2 self-test:**
- What happens during a React re-render? What triggers it?
- Explain `useEffect` cleanup and when it runs
- When would you choose Zustand over Redux?
- Implement `useLocalStorage` hook from scratch

---

## Week 3 — Node.js + Databases

**Goal:** Own the full stack — understand how JS runs on the server and how to design data.

| Day | Study | LeetCode |
|-----|-------|----------|
| Mon | `NODEJS-INTERNALS-DEEP.md` — event loop phases, libuv, microtasks quiz | Number of Islands |
| Tue | `NODEJS-INTERNALS-DEEP.md` — streams, backpressure, worker threads, cluster | Clone Graph |
| Wed | `NODEJS-REST-DEEP.md` — REST design, middleware, error handling, validation | Course Schedule |
| Thu | `DATABASE-DESIGN-DEEP.md` — normalisation, indexing, B-tree, query optimisation | Longest Consecutive Sequence |
| Fri | `SQL-HIGH-DEEP.md` — joins, subqueries, window functions, CTEs | LeetCode SQL problems ×5 |
| Sat | `AUTH-DEEP.md` — JWT, OAuth2, PKCE, refresh tokens, RBAC | LeetCode Medium ×3 |
| Sun | Design and implement a REST API with auth from scratch (no frameworks) | LeetCode Medium ×2 |

**Week 3 self-test:**
- Draw the Node.js event loop and explain each phase
- What's the output order of: setTimeout, Promise, nextTick, setImmediate?
- Design a DB schema for a Twitter-like app (tables, indexes, constraints)
- Explain JWT vs session — when to use each?

---

## Week 4 — Algorithms & Data Structures

**Goal:** Recognise patterns instantly. Solve medium LeetCode in <20 minutes.

| Day | Study | LeetCode |
|-----|-------|----------|
| Mon | `DATA-STRUCTURES-DEEP.md` — implement linked list, stack, queue | Reverse Linked List, LRU Cache |
| Tue | `DATA-STRUCTURES-DEEP.md` — implement BST, heap, hash map | Kth Largest Element, Min Heap |
| Wed | `DATA-STRUCTURES-DEEP.md` — trie, graph, BFS/DFS, Union-Find | Word Search, Number of Islands |
| Thu | `ALGORITHMS-DEEP.md` — sliding window, two pointers, binary search | Longest Substring, 3Sum |
| Fri | `ALGORITHMS-PARADIGMS-DEEP.md` — DP: knapsack, LCS, coin change | Climbing Stairs, Coin Change |
| Sat | `ALGORITHMS-PARADIGMS-DEEP.md` — DP: LIS, edit distance + Greedy + Backtracking | House Robber, Word Break, Permutations |
| Sun | `INTERVIEW-CODING-PATTERNS-DEEP.md` — full pattern review + speed drills | LeetCode Medium ×5 timed |

**Week 4 self-test:**
- Implement a min-heap from scratch with insert and extractMin
- Solve Two Sum, Three Sum, Maximum Subarray without notes
- What is the time complexity of topological sort?
- Write Dijkstra's algorithm

---

## Week 5 — System Design

**Goal:** Confidently lead a 45-minute system design interview.

| Day | Study | Practice |
|-----|-------|----------|
| Mon | `SYSTEM-DESIGN-DEEP.md` — framework, capacity estimation, core building blocks | Practice estimating: Twitter, Uber, Dropbox |
| Tue | `SYSTEM-DESIGN-DEEP.md` — URL shortener deep dive | Design it from scratch, time yourself 35min |
| Wed | `SYSTEM-DESIGN-DEEP.md` — Twitter/X design | Design it from scratch |
| Thu | `SYSTEM-DESIGN-DEEP.md` — WhatsApp + rate limiter | Design WhatsApp |
| Fri | `SYSTEM-DESIGN-DEEP.md` — YouTube/Netflix | Design YouTube |
| Sat | Design: ride-sharing (Uber), notification service, search autocomplete | Each in 35min |
| Sun | Mock with a friend or record yourself — get feedback on clarity | Review trade-offs |

**Week 5 self-test:**
- How many requests/sec from 10M DAU, 5 req/day?
- Design a URL shortener — all components, no notes, 35 minutes
- What is consistent hashing? Why use virtual nodes?
- Kafka vs RabbitMQ — when to use each?

---

## Week 6 — Medium Priority Topics

**Goal:** Round out knowledge for breadth questions interviewers often ask.

| Day | Study | Practice |
|-----|-------|----------|
| Mon | `BROWSER-INTERNALS-DEEP.md` + `PERFORMANCE-DEEP.md` | Audit a real page with Lighthouse |
| Tue | `NEXTJS-DEEP.md` — App Router, server components, SSR/SSG/ISR | Build a Next.js page with RSC |
| Wed | `TESTING-STRATEGY-DEEP.md` — RTL, MSW, Playwright, TDD | Write tests for a React component |
| Thu | `GRAPHQL-DEEP.md` — schema, resolvers, N+1, DataLoader | Design a GraphQL schema |
| Fri | `MICROSERVICES-DEEP.md` + `PRINCIPLES-DEEP.md` + `DESIGN-PATTERNS-LOW-DEEP.md` | Review patterns |
| Sat | `CSS-DEEP.md` — Flexbox, Grid, specificity, animations | CSS challenges on CodePen |
| Sun | LeetCode medium blitz ×5 timed | Pattern recognition speed drills |

---

## Week 7 — Behavioural + Mock Interviews

**Goal:** Lock in STAR stories, practice speaking answers aloud, not just reading them.

| Day | Activity |
|-----|----------|
| Mon | `BEHAVIORAL-DEEP.md` — write out all your STAR stories (one per prompt) |
| Tue | `MOCK-INTERVIEW-QA.md` — drill all 50 Q&As aloud, record yourself |
| Wed | Full mock interview #1 (find a friend, use Pramp, or Interviewing.io) |
| Thu | `NEGOTIATION-OFFER-DEEP.md` — research target salaries, prepare your number |
| Fri | Full mock interview #2 — system design focus |
| Sat | Full mock interview #3 — coding focus (2 LeetCode mediums, timed) |
| Sun | `INTERVIEW-DAY-CHECKLIST.md` — company research template, prep questions to ask |

---

## Week 8 — Final Polish

**Goal:** Sharpen, don't learn new things. Rest, confidence, logistics.

| Day | Activity |
|-----|----------|
| Mon | Re-read `MOCK-INTERVIEW-QA.md` — focus on any weak answers |
| Tue | Weak area deep dive (whichever topic felt shakiest in mocks) |
| Wed | Light LeetCode (2–3 easy/medium) — stay warm, don't burn out |
| Thu | Company-specific research: products, tech stack, recent eng blog posts |
| Fri | Review your STAR stories one more time. Prepare your questions to ask. |
| Sat | FULL REST — no studying. Sleep 8+ hours. |
| Sun | `INTERVIEW-DAY-CHECKLIST.md` — day before checklist |

---

## Daily LeetCode Habit (throughout all 8 weeks)

```
Week 1–2:  1 Easy/day             → build fluency
Week 3–4:  1 Medium/day           → pattern recognition
Week 5–6:  1–2 Mediums/day        → speed + accuracy
Week 7–8:  1 Medium/day (timed)   → stay sharp
```

**Recommended problem sets by pattern:**
- Sliding window: 3, 76, 209, 424, 567
- Two pointers: 11, 15, 42, 167
- Binary search: 33, 34, 153, 875
- BFS/DFS: 102, 200, 207, 417, 695
- DP (1D): 70, 198, 300, 322, 139
- DP (2D): 62, 64, 72, 1143
- Heap: 23, 215, 295, 347
- Backtracking: 46, 78, 51, 37

---

## 4-Week Compressed Version

If you have 4 weeks instead of 8, combine as follows:

| Week | Cover |
|------|-------|
| 1 | JS + TS + React + State Management |
| 2 | Node.js + Databases + Auth |
| 3 | Algorithms + Data Structures (daily LeetCode ×2) |
| 4 | System Design + Behavioural + Mock Interviews |

Skip medium-priority files unless specific to the role. Focus on `MOCK-INTERVIEW-QA.md` heavily in week 4.
