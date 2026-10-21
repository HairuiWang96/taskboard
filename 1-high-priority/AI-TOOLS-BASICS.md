# AI Tools for Developers — Beginner's Guide

**Priority: HIGH**

> A plain-language map of the AI tools developers actually use in 2026: coding agents, chat
> assistants, UI generators, code review bots, research tools, and the SDKs for building AI
> into your own app — what each is for, how to work well with coding agents, what not to
> trust them with, and how to talk about all of it in interviews.
>
> Assumes you write code day to day. No AI/ML knowledge needed.
>
> ‼️ This space changes every few months. Product names here are a starting point, not a
> final list — the CATEGORIES and HABITS are what stay true.

---

## Table of Contents

- [AI Tools for Developers — Beginner's Guide](#ai-tools-for-developers--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. The Map](#1-the-map)
  - [2. Coding Agents](#2-coding-agents)
  - [3. Working Well with Coding Agents](#3-working-well-with-coding-agents)
  - [4. Chat Assistants](#4-chat-assistants)
  - [5. UI \& App Generators](#5-ui--app-generators)
  - [6. AI Code Review](#6-ai-code-review)
  - [7. Research Tools](#7-research-tools)
  - [8. Building AI Into Your App](#8-building-ai-into-your-app)
  - [9. MCP — Connecting AI to Your Stuff](#9-mcp--connecting-ai-to-your-stuff)
  - [10. What NOT to Trust AI With](#10-what-not-to-trust-ai-with)
  - [11. Talking About AI Tools in Interviews](#11-talking-about-ai-tools-in-interviews)
  - [12. Common Beginner Mistakes](#12-common-beginner-mistakes)
  - [13. Cheat Sheet](#13-cheat-sheet)
  - [Related Files](#related-files)

---

## 1. The Map

```text
‼️ AI TOOLS IN ONE SENTENCE
   An LLM (Claude, GPT, Gemini…) wrapped in a product that gives it a JOB
   and the TOOLS for that job — your files, your terminal, your browser,
   your pull requests.‼️

  CATEGORY             WHAT IT DOES                        EXAMPLES
  ───────────────────────────────────────────────────────────────────────────────
  Coding agents        Read your repo, edit files, run     Claude Code, Cursor,
                       tests and commands                  GitHub Copilot, OpenAI Codex
  Chat assistants      Explain, debug, plan, write         Claude, ChatGPT, Gemini
  UI/app generators    Prompt → working UI or prototype    v0, Lovable, Bolt
  Code review bots     Comment on pull requests            CodeRabbit, Copilot review
  Research tools       Search with sources / your docs     Perplexity, NotebookLM
  SDKs (for building)  Put AI features in YOUR app         Vercel AI SDK, Claude Agent
                                                           SDK, OpenAI Agents SDK
  Local models         Run a model on your own machine     Ollama

‼️ The underlying MODELS are shared. Many of these tools let you choose
   which model they use — the product is the wrapper, not the brain.
```

---

## 2. Coding Agents

```text
‼️ THE BIGGEST CATEGORY, and the one interviewers ask about.

AUTOCOMPLETE (2021-era Copilot)     AGENT (2026)
  Suggests the next few lines       Takes a TASK: "add pagination to /users"
  You accept or reject              Reads the relevant files itself
  Sees only the open file           Edits several files
                                    Runs tests, reads the errors, fixes them
                                    Shows you a diff to review

  In short: autocomplete finishes your sentence;
            an agent does the task and you review it.‼️
```

```text
WHERE THEY LIVE
  In the terminal     Claude Code, OpenAI Codex CLI, Gemini CLI
                      Work in any editor. Good for multi-step tasks.
  In the editor       Cursor, Windsurf, GitHub Copilot in VS Code / JetBrains
                      Inline edits + a chat/agent panel next to your code.
  In the cloud        Copilot coding agent, Codex cloud, Claude Code on the web
                      Assign an issue → get a pull request back later.

‼️ They all do roughly the same core thing. Pick ONE, learn it well,
   and the skills transfer.
```

---

## 3. Working Well with Coding Agents

```text
‼️ THE AGENT IS ONLY AS GOOD AS THE CONTEXT YOU GIVE IT.‼️

1. GIVE IT A PROJECT INSTRUCTIONS FILE
   A markdown file in the repo the agent reads every session:
   how to run tests, code style, folder structure, "never do X".

     Claude Code          CLAUDE.md
     Codex, Cursor, …     AGENTS.md  (a shared convention many tools read)
     Copilot              .github/copilot-instructions.md
     Cursor               .cursor/rules/

2. BE SPECIFIC
   ✗ "fix the bug"
   ✓ "GET /users/:id returns 500 when the user doesn't exist — it should
      return 404. The handler is in users.controller.ts. Add a test."

3. SMALL TASKS, ONE AT A TIME
   One feature or fix per request. Huge vague tasks → huge vague diffs.

4. PLAN FIRST FOR ANYTHING BIG
   "Before changing code, explain your plan." Fix a wrong plan in one
   message instead of untangling 20 wrong file edits.‼️

5. LET IT RUN THE TESTS
   An agent that can run tests and see failures fixes its own mistakes.
   No tests → it can't check itself, and neither can you.

6. COMMIT OFTEN
   Git is your undo button. Commit working states so a bad agent run is
   one `git checkout` away from gone.

7. ‼️ REVIEW EVERY DIFF.
   You are responsible for the code, not the AI. Read it like a pull request
   from a fast, confident junior developer.‼️
```

---

## 4. Chat Assistants

```text
Claude, ChatGPT, Gemini — in the browser, desktop app or phone.

GOOD FOR
  - "Explain this concept simply"            (like this guide's style)
  - Pasting an error message → likely causes
  - Talking through a design before coding
  - Writing: emails, docs, PR descriptions, cover letters
  - Interview practice: "ask me React questions and grade my answers"

‼️ Chat vs coding agent: chat only sees what you PASTE. A coding agent
   reads your actual repo. For real code changes, use the agent.
```

---

## 5. UI & App Generators

```text
v0 (by Vercel), Lovable, Bolt — describe a screen, get working React code.

GOOD FOR
  - Prototypes and demos in minutes
  - A first draft of a component to copy into your project
  - Non-developers building simple internal tools

‼️ WATCH OUT
  - Output often ignores YOUR design system, folder structure and patterns
  - Fine for a prototype; review hard before it goes anywhere real
```

---

## 6. AI Code Review

```text
Bots that comment on pull requests automatically:
CodeRabbit, GitHub Copilot code review, Claude Code's review command, and others.

GOOD FOR
  - Catching obvious bugs, missing null checks, typos, forgotten cleanup
  - A first pass before a human reviewer spends time on it

‼️ WATCH OUT
  - They SUPPORT human review, they don't replace it
  - They miss business context ("this breaks the refund flow") — they only
    see the code, not what the feature is supposed to do
  - They flag non-issues too. Too many comments → people start ignoring
    ALL of them, including the real ones
  - "The bot approved it" is not a reason to merge
```

---

## 7. Research Tools

```text
  Perplexity    Web search with an AI answer AND links to sources.
                Good for "what's the current way to do X in library Y?" ‼️

  NotebookLM    Upload YOUR documents (PDFs, notes, docs) and ask questions
                about them. Answers cite the exact passage.

‼️ Always click through to the source for anything important.
   A confident summary can still be wrong.
```

---

## 8. Building AI Into Your App

```text
Different question: not "AI helps me code" but "my app has an AI feature"
(a chatbot, a summariser, a support agent).

  Vercel AI SDK          TypeScript, works with many model providers,
                         great React/Next.js streaming UI helpers
  Claude Agent SDK       The agent engine behind Claude Code, as a library
  OpenAI Agents SDK      OpenAI's framework for multi-step agents
  LangChain / LangGraph  Popular framework, many integrations
  Direct API calls       Anthropic / OpenAI / Google SDKs — simplest for
                         one-off "send prompt, get answer" features‼️

‼️ Start with a direct API call. Reach for a framework only when you need
   multi-step agents, tools, or memory.
   → Deep dive: AI-ENGINEERING-AGENTS-DEEP.md
```

```typescript
// The simplest possible AI feature — summarise a support ticket
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env‼️

const msg = await client.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 300,
  messages: [{ role: 'user', content: `Summarise this ticket in 2 lines:\n\n${ticket}` }],
});

console.log(msg.content[0].type === 'text' ? msg.content[0].text : '');

// ‼️ Call AI APIs from your BACKEND. An API key in frontend code is public.
```

---

## 9. MCP — Connecting AI to Your Stuff

```text
MCP = Model Context Protocol. An open standard for plugging tools and data
into AI apps.

‼️ THINK OF IT AS USB-C FOR AI.
   Before: every AI tool needed its own custom integration for GitHub,
           Slack, your database, Jira…
   With MCP: write ONE "MCP server" for a system, and any MCP-capable
             tool (Claude, ChatGPT, Cursor, Copilot, …) can use it.‼️

EXAMPLES
  - GitHub MCP server   → the agent can read issues and open PRs
  - Postgres MCP server → the agent can query your dev database
  - Your own server     → expose your company's internal API to AI tools

‼️ An MCP server can do whatever its tools allow. Only install ones you
   trust, and give them the least access they need (read-only where possible).
```

---

## 10. What NOT to Trust AI With

```text
‼️ 1. MADE-UP APIs AND PACKAGES
   Models sometimes invent functions, options or whole npm packages that
   don't exist. Attackers even publish malware under commonly-invented
   package names. Check that a package is real and popular before installing.

‼️ 2. OUT-OF-DATE KNOWLEDGE
   A model's knowledge stops at its training date. New library versions,
   renamed APIs and deprecations may be missing. Check the official docs.

‼️ 3. SECURITY-SENSITIVE CODE
   Auth, permissions, payments, encryption, SQL built from user input.
   AI code here can look right and be exploitable. Review extra carefully.

‼️ 4. SECRETS AND PRIVATE DATA‼️
   Don't paste API keys, passwords, customer data or company code into
   tools your company hasn't approved. Check your company's AI policy.

‼️ 5. "THE TESTS PASS"
   An agent can make tests pass by weakening the test. Check WHAT changed
   in the tests, not just that they're green.

‼️ 6. CODE YOU DON'T UNDERSTAND
   If you can't explain it in review, you can't debug it at 2am.
   Ask the AI to explain it — or rewrite it simpler.
```

---

## 11. Talking About AI Tools in Interviews

```text
Common questions in 2026:
  "How do you use AI in your workflow?"
  "How do you make sure AI-written code is correct?"
  "When do you NOT use AI?"

‼️ WHAT INTERVIEWERS WANT TO HEAR: you use AI to go FASTER, and you stay
   RESPONSIBLE for quality. Not "I don't use it", not "it writes everything".‼️

A good answer has three parts:
  1. WHAT you use it for
     "Claude Code for boilerplate, tests and refactors; chat for talking
      through designs and unfamiliar errors."
  2. HOW you keep quality
     "I give it context through a CLAUDE.md, keep tasks small, review every
      diff like a PR, and rely on tests to catch mistakes."
  3. WHERE you're careful
     "Auth and payments I review line by line. I verify new packages and
      APIs against the docs."

‼️ Have ONE concrete story ready: a task where AI saved real time, and one
   where it got something wrong and you caught it.

Live coding: ask whether AI tools are allowed. Many companies now say yes
for some rounds — and then they're watching HOW you use it.
```

---

## 12. Common Beginner Mistakes

```text
‼️ 1. Accepting diffs without reading them.
   You own the code. Review it like a teammate's PR.

‼️ 2. Vague prompts.
   "Make it better" → random changes. Say what, where, and how to check it.

‼️ 3. Giant tasks in one go.
   Break them up. Plan first.

‼️ 4. No instructions file.‼️
   The agent re-learns your project every session and guesses your conventions.

‼️ 5. Working without git commits.
   No easy way back from a bad run.

‼️ 6. Installing packages the AI suggests without checking they exist.‼️

‼️ 7. Trusting the AI on the latest library versions.
   Check the official docs for anything recent.

‼️ 8. Pasting secrets or company code into unapproved tools.

‼️ 9. Using AI for everything, including learning the basics.‼️
   For things you're LEARNING, ask it to explain — then write it yourself.

‼️ 10. Arguing with a stuck agent for 20 messages.
   If it's going in circles, stop, `git checkout`, and restart with a
   clearer, smaller prompt.
```

---

## 13. Cheat Sheet

```text
WHICH TOOL FOR WHAT
  Change code in my repo            → coding agent (Claude Code, Cursor, Copilot, Codex)
  Understand a concept / an error   → chat assistant (Claude, ChatGPT, Gemini)
  Quick UI prototype                → v0, Lovable, Bolt
  First-pass PR review              → CodeRabbit, Copilot review, Claude Code review
  Research with sources             → Perplexity‼️
  Questions about my own documents  → NotebookLM
  AI feature in my app              → direct API call → AI SDK / Agent SDK if needed
  Connect AI to GitHub/DB/etc.      → MCP server
  Run a model offline               → Ollama

INSTRUCTIONS FILES
  CLAUDE.md                          Claude Code
  AGENTS.md                          Codex, Cursor and others
  .github/copilot-instructions.md    GitHub Copilot
  .cursor/rules/                     Cursor

THE WORKFLOW
  context file → specific small task → plan first → let it run tests
  → review the diff → commit → next task

THE RULES
  1. You own the code — review every diff
  2. Verify packages and APIs exist
  3. Extra care on auth, payments, security‼️
  4. No secrets or private data in unapproved tools
  5. API keys stay on the backend
```

---

## Related Files

- [AI-ENGINEERING-AGENTS-DEEP.md](AI-ENGINEERING-AGENTS-DEEP.md) — how agents, tool use, RAG and MCP actually work
- [AI-SYSTEM-DESIGN-DEEP.md](AI-SYSTEM-DESIGN-DEEP.md) — designing a coding assistant, chatbot, RAG system
- [AI-OPEN-SOURCE-MODELS-DEEP.md](AI-OPEN-SOURCE-MODELS-DEEP.md) — Ollama and running models yourself
- [AI-OBSERVABILITY-DEEP.md](../2-medium-priority/AI-OBSERVABILITY-DEEP.md) — monitoring AI features in production
- [INTERVIEW-PREP.md](INTERVIEW-PREP.md) — general interview preparation
