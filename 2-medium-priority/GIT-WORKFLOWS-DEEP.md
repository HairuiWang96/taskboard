# Git & Workflows — Senior Developer Deep Reference

> Covers Git internals, branching strategies, pull request culture, and daily senior engineer practices.

---

## Table of Contents

1. [Git Internals](#1-git-internals)
2. [Branching Strategies](#2-branching-strategies)
3. [Commit Best Practices](#3-commit-best-practices)
4. [Pull Requests & Code Review](#4-pull-requests--code-review)
5. [Advanced Git Commands](#5-advanced-git-commands)
6. [Git Hooks](#6-git-hooks)
7. [Monorepos](#7-monorepos)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Git Internals

### How Git stores data

```text
Git is a content-addressable filesystem.‼️
Everything stored as objects, identified by SHA-1 hash of their content.‼️

Object types:
  blob:   file contents (no filename — just content)
  tree:   directory listing (maps names → blobs and other trees)
  commit: snapshot + parent + author + message → points to a tree‼️
  tag:    named pointer to a commit

.git/
  objects/    all blobs, trees, commits, tags
  refs/       branches (refs/heads/main), tags (refs/tags/v1.0), remotes
  HEAD        pointer to current branch (or commit in detached HEAD)
  index       staging area (what will be in next commit)
  config      repo-level config
```

```bash
# Inspect Git objects
git cat-file -t <sha>          # type of object (blob, tree, commit)
git cat-file -p <sha>          # pretty-print object contents
git log --graph --oneline      # visualize commit history
git ls-tree HEAD               # list files in current commit's tree
git rev-parse HEAD             # get full SHA of current commit
git rev-parse --abbrev-ref HEAD # get current branch name
```

### The three areas

```text
Working directory:  files on disk — what you see and edit
Staging area (index): what will go into next commit (git add)
Repository:         committed history

git add file.ts        # working directory → staging
git commit             # staging → repository
git checkout file.ts   # repository → working directory (discard changes)
git reset HEAD file.ts # staging → working directory (unstage)
```

### Merging vs Rebasing

```text
Merge: create a merge commit joining two branches
  History is preserved — shows exactly what happened
  Non-destructive — doesn't rewrite commits

  A---B---C  (main)
       \   \
        D---E  (feature)
             ↓ merge
  A---B---C---M  (main, M = merge commit)
       \     /
        D---E

Rebase: move/replay commits on top of another branch
  Linear history — cleaner, easier to read
  REWRITES commit history (new SHAs) — dangerous for shared branches
  "Golden rule": never rebase a branch others are working on

  A---B---C  (main)
       \
        D---E  (feature)
             ↓ rebase feature onto main
  A---B---C---D'---E'  (feature, D' and E' are NEW commits)

Interactive rebase:
  git rebase -i HEAD~3  # rewrite last 3 commits
  pick, squash, fixup, reword, drop, edit
  Use to: clean up WIP commits before merging, split commits
```

### Git Internals — Plain English Breakdown

```text
Git is basically a file system with version tracking.‼️

At its core, Git is a "content-addressable filesystem" — a fancy way of saying
it stores everything by a unique fingerprint (SHA hash) of the content.


THE 4 OBJECT TYPES — think of Git's storage like a filing cabinet with 4 types:

  1. blob — just the raw file contents. No filename, no path. Just the bytes.
     If two files have identical content, Git stores only ONE blob.

  2. tree — like a directory listing. It maps filenames → blobs (and subdirectories → other trees).
     A tree says: "file app.ts → blob abc123, folder utils/ → tree def456."

  3. commit — a snapshot in time.‼️
     Points to a tree (the entire project at that moment)
     + records the parent commit, author, date, and message.
     This is what gives you history.

  4. tag — a named label pointing to a specific commit (like v1.0.0).


HOW THEY CONNECT:‼️

  commit (abc789)
    ├── points to → tree (root directory)
    │                 ├── app.ts → blob (file contents)
    │                 ├── utils/ → tree
    │                 │            └── helper.ts → blob
    │                 └── package.json → blob
    └── parent → previous commit (def456)

  Every commit is a FULL SNAPSHOT of your entire project — not a diff.‼️
  Git is efficient about this because identical files reuse the same blob.


THE .git/ FOLDER — this IS your repository:‼️

  When you run "git init", it creates a .git/ directory.

  objects/   — all the blobs, trees, commits, and tags live here,
               named by their SHA hash

  refs/      — branches and tags are just tiny text files containing a SHA.
               refs/heads/main is a file that contains the SHA of the
               latest commit on main. That's it.
               A BRANCH IS JUST A POINTER TO A COMMIT.‼️

  HEAD       — tells Git which branch you're on right now.
               Usually just the text: ref: refs/heads/main

  index      — the staging area. When you "git add", the file goes here.
               When you "git commit", Git takes whatever is in the index
               and makes a commit from it.‼️


THE THREE AREAS (this is key):‼️

  Working Directory  →  Staging Area (index)  →  Repository (.git)
     (your files)         (git add)               (git commit)

  Working directory — the actual files you see and edit on disk
  Staging area      — a "loading dock" where you prepare what goes into the
                      next commit. This is WHY you can commit PART of your
                      changes — "git add" specific files only‼️
  Repository        — the committed history stored in .git/objects/


SHA HASHES — why they matter:

  Every object gets a SHA-1 hash (40 hex characters like a1b2c3d4e5...).
  This hash is computed from the content itself. So:

    Same content → always the same hash (deterministic)‼️
    Change even 1 byte → completely different hash
    This is why rebase creates NEW commits — the parent changed,
      so the hash changes, even if the code changes are identical‼️

  When you see: git cherry-pick abc1234
  That "abc1234" is just the first 7 characters of the full 40-char SHA.
  Git only needs enough characters to be unique in your repo.


INSPECTING INTERNALS YOURSELF:

  git cat-file -t abc1234    # tells you: "commit", "blob", "tree", etc.
  git cat-file -p abc1234    # shows the actual contents of that object
  git ls-tree HEAD           # shows the tree (directory listing) of current commit
  git rev-parse HEAD         # shows the full 40-char SHA of current commit
```

---

## 2. Branching Strategies

### GitHub Flow (simple, recommended for most teams)

```text
One long-lived branch: main
Everything else is a short-lived feature branch

Workflow:
  1. Create branch from main: git checkout -b feature/add-advocate-matching
  2. Make commits on branch
  3. Open pull request against main
  4. Review + CI passes
  5. Merge to main (squash or merge commit)
  6. Delete branch
  7. Deploy immediately (main = always deployable)

Rules:
  - main is always deployable
  - Feature branches are short-lived (days, not weeks)
  - Use feature flags for incomplete work (not long branches)

Good for: small teams, web apps, continuous deployment

 Squash = combine multiple commits into a single commit.
     The code is identical — only the history changes.

     BEFORE squash (5 messy commits on your feature branch):
       a1b2c3  fix typo
       d4e5f6  WIP saving progress
       g7h8i9  actually fix the bug
       j0k1l2  oops forgot a file
       m3n4o5  add login feature
     AFTER squash (1 clean commit):
       x9y8z7  add login feature

     Why squash? Nobody reviewing main wants to see "WIP" or "oops."
     Squashing keeps history clean — each PR = one meaningful commit on main.

     How to squash:
       git rebase -i HEAD~5          → interactive rebase, mark commits as "squash"
       git merge --squash feature    → squash when merging locally
       GitHub "Squash and merge"     → most common, one-click on PR page

     GitHub PR merge options:
       "Create a merge commit"  → keeps all commits + adds a merge commit
       "Squash and merge"       → combines all PR commits into one on main (most teams use this)
       "Rebase and merge"       → replays commits individually, no merge commit
```

### Git Flow (complex, for release-based software)

```text
Two permanent branches: main and develop

Supporting branches:
  feature/*: branch from develop, merge back to develop
  release/*: branch from develop, merge to main AND develop
  hotfix/*:  branch from main, merge to main AND develop

Workflow:
  develop → feature branches → back to develop
  When ready to release: develop → release/1.2.0 → main + develop + tag

Good for: mobile apps, desktop software, versioned libraries
Overkill for: web apps deployed continuously

Most teams use GitHub Flow today — Git Flow is unnecessarily complex
for services that deploy multiple times per day.
```

### Trunk-Based Development

```text
Everyone commits directly to main (or very short-lived branches < 1 day)
Feature flags hide incomplete work

Benefits:
  - No merge conflicts (integrate continuously)
  - Forces small, deployable changes
  - Fastest feedback loop

Requires:
  - Good test coverage (CI must catch regressions)
  - Feature flags (for incomplete features)
  - Experienced team culture

Used by: Google, Facebook, Netflix (at large scale)
```

---

## 3. Commit Best Practices

### Conventional Commits

```text
Format: <type>(<scope>): <description>

Types:
  feat:     new feature
  fix:      bug fix
  docs:     documentation only
  style:    formatting, no code change (whitespace, commas)
  refactor: code change that doesn't add feature or fix bug
  test:     adding or fixing tests
  chore:    build process, dependency updates
  perf:     performance improvement
  ci:       CI/CD changes

Examples:
  feat(matching): add skill-based advocate matching algorithm
  fix(auth): handle expired JWT on concurrent requests
  feat(tasks)!: remove legacy task endpoint (! = breaking change)‼️
  docs(api): add OpenAPI spec for patient endpoints
  chore(deps): upgrade drizzle-orm to 0.30.0

Benefits:
  - Automated changelog generation (standard-version, semantic-release)
  - Automatic semantic versioning (feat = minor, fix = patch, ! = major)
  - Readable git log
  - Enforced by commitlint in CI
```

### What makes a good commit

```text
Atomic: one logical change per commit
  ✗ "fix bug and add feature and update deps" — three things
  ✓ Three separate commits

Body explains WHY, not WHAT (the diff shows what):
  ✗ "Change database query to use LEFT JOIN"
  ✓ "Fix N+1 query on patient list

     The patient list was making one query per patient to fetch
     their advocate details. With 200 patients this caused 201
     queries and 3s load times. Replaced with a single LEFT JOIN."

Present tense, imperative:‼️
  ✓ "Add email validation" (not "Added" or "Adding")
  This matches how Git itself writes: "Merge branch 'feature'"

Small, frequent commits during development:
  WIP commits are fine on feature branch
  Clean up before merging: git rebase -i (squash, fixup)
```

---

## 4. Pull Requests & Code Review

### Writing a good PR

```text
Title: short, imperative (< 70 chars)
  ✓ "Add patient-advocate matching algorithm"
  ✗ "This PR adds a new feature for matching patients with advocates"

Body should include:
  What: what changed (brief)
  Why: motivation / ticket link
  How: key technical decisions, trade-offs
  Test: how to verify it works
  Screenshots: for UI changes
  Breaking changes: what callers need to know
  Checklist: migration needed? feature flag? docs updated?

Size:
  Ideal: < 400 lines changed
  Small PRs: faster review, more focused feedback, easier to reason about
  If feature is large: break into multiple PRs (data model, API, frontend)
  "Draft PR" for early feedback on direction before implementation complete
```

### Code review — what to look for

```text
As REVIEWER:

Must block:‼️
  - Security vulnerabilities (SQL injection, XSS, exposed secrets)
  - Correctness bugs (logic errors, off-by-one, null handling)
  - Missing error handling for failure cases
  - Performance problems that will hurt in production (N+1, unbounded queries)
  - Breaking public API contracts without versioning

Should flag:
  - Confusing logic that needs a comment
  - Duplication that could be shared
  - Missing tests for critical paths
  - Inconsistency with existing patterns

Leave alone:
  - Style preferences (if there's no linter rule, it's a preference)
  - Naming bikeshedding
  - "I would have done it differently" (if author's way is also correct)

Comment prefixes (signal priority):
  "nit:" — trivial suggestion, don't block on it
  "question:" — I don't understand, please explain
  "suggestion:" — optional improvement idea
  "blocking:" — must fix before merge
```

### Code review — receiving feedback

```text
Assume good intent — reviewer wants the code to succeed

Don't take it personally:
  They're reviewing the CODE, not you as a person

Respond to every comment:
  ✓ Fixed — pushed new commit
  ✓ Good point — done. Also refactored the related function
  ✓ I disagree because X — can we discuss?

If you disagree:
  State your reasoning clearly
  Ask for a third opinion if stuck
  Accept that reviewer may have context you don't

"It's already approved" ≠ done:
  If CI fails after approval, fix it before merging
  Don't merge just because you have approvals
```

---

## 5. Advanced Git Commands

### Everyday power commands

```bash
# Stash — save work without committing‼️
git stash                          # stash all changes
git stash push -m "WIP: add matching" # with message
git stash list                     # see all stashes
git stash pop                      # apply and remove latest
git stash apply stash@{2}          # apply specific stash, keep it

# Cherry-pick — apply specific commits to current branch
git cherry-pick abc1234            # apply commit abc1234
git cherry-pick abc1234..def5678   # apply range of commits
# Use for: backport a bug fix to a release branch

# Bisect — find which commit introduced a bug‼️
git bisect start
git bisect bad                     # current commit is bad
git bisect good v1.2.0             # this release was good
# Git checks out middle commit — test it
git bisect good                    # or: git bisect bad
# Repeat until git identifies the offending commit
git bisect reset                   # done

# Reflog — recover "lost" commits (your safety net)‼️
git reflog                         # all recent HEAD positions
git checkout abc1234               # recover any commit
# Even after git reset --hard, commits are in reflog for 90 days‼️

# Worktree — check out multiple branches simultaneously‼️
git worktree add ../hotfix hotfix/issue-123
# ../hotfix has the hotfix branch checked out
# Current directory still has your feature branch
# No stashing needed

# Interactive staging (stage parts of a file)‼️
git add -p file.ts                 # interactively stage hunks
git reset -p HEAD file.ts          # interactively unstage

# Show changes‼️
git diff HEAD~3..HEAD -- src/      # diff last 3 commits, specific directory
git log -p -- src/db/schema.ts     # history of changes to a file
git blame src/db/schema.ts         # who changed each line, when
git log --author="Alice" --since="2 weeks ago"  # filter commits
```

### Undoing mistakes

```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes in working directory
git reset HEAD~1                   # (or --mixed)

# Undo last commit, discard changes (destructive!)
git reset --hard HEAD~1

# Revert a commit (creates new "undo" commit — safe for shared branches)
git revert abc1234                 # creates commit that undoes abc1234
git revert abc1234..def5678        # revert a range

# Fix last commit message or add a forgotten file
git add forgotten-file.ts
git commit --amend --no-edit       # add to last commit
git commit --amend -m "Better message"  # change message

# NEVER amend commits already pushed to shared branches‼️
# Use revert instead — it's safe and auditable‼️
```

### Cleaning up before merge

```bash
# Squash 4 WIP commits into one clean commit
git rebase -i HEAD~4

# In the editor:
# pick abc1234 Initial implementation
# squash def5678 fix tests
# squash ghi9012 address review feedback
# squash jkl3456 nit: rename variable

# Result: one clean commit with a new message

# Rebase onto latest main (incorporate changes before merging)
git fetch origin
git rebase origin/main             # replay your commits on top of latest main
# If conflicts: resolve, git add, git rebase --continue

# Keep feature branch up to date (merge vs rebase)
git merge origin/main              # merge commit — preserves exact history
git rebase origin/main             # linear — cleaner, rewrites your commits
# Team convention decides which to use
```

### Rebase vs Squash — they solve DIFFERENT problems‼️

```text
Squash = combine multiple commits into one. Changes history LENGTH.
Rebase = move your branch to the tip of another branch. Changes history POSITION.

SQUASH — "I have too many commits, combine them into one"
─────────────────────────────────────────────────────────
  BEFORE:
    main:    A --- B
    feature:       B --- C --- D --- E  (3 messy commits)

  AFTER squash:
    main:    A --- B
    feature:       B --- CDE  (1 clean commit containing C+D+E)

  How: git rebase -i HEAD~3  → mark commits as "squash"


REBASE — "main moved forward, I need to catch up"
──────────────────────────────────────────────────
  BEFORE:
    main:    A --- B --- F --- G         (main moved forward while you worked)
    feature:       B --- C --- D --- E   (your branch is based on old B)

  AFTER rebase onto main:
    main:    A --- B --- F --- G
    feature:                   G --- C' --- D' --- E'  (replayed on top of G)

  How: git fetch origin && git rebase origin/main


IN PRACTICE — use BOTH before merging a PR:‼️
───────────────────────────────────────────
  Step 1: rebase onto latest main (catch up)
    git rebase main

  Step 2: squash your commits into one (clean up)
    git rebase -i HEAD~4    → mark commits as "squash"

  Result: one clean commit sitting on top of latest main.
          PR merges cleanly with no conflicts and clean history.

  OR — let GitHub do both at once:
    GitHub "Squash and merge" button = rebase + squash in one click.
    Takes all your PR commits, squashes into one, places on top of main.
    Most teams use this.‼️
```

---

## 6. Git Hooks

### Client-side hooks

```bash
# .git/hooks/ — scripts that run on git events‼️
# Make executable: chmod +x .git/hooks/pre-commit

# pre-commit: runs before commit — stop bad commits‼️
#!/bin/sh
npm run lint --silent || exit 1    # block commit if lint fails
npm run type-check --silent || exit 1

# commit-msg: validate commit message format
#!/bin/sh
msg=$(cat "$1")
if ! echo "$msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci)(\(.+\))?: .+"; then
  echo "Error: Commit message must follow Conventional Commits format"
  echo "Example: feat(auth): add JWT refresh token"
  exit 1
fi

# pre-push: runs before push — catch problems before CI
#!/bin/sh
npm test -- --run || exit 1        # run tests before pushing
```

### Husky (team-wide hooks)

```bash
npm install -D husky lint-staged commitlint @commitlint/config-conventional
npx husky init
```

```json
// package.json
{
    "lint-staged": {
        "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
        "*.{css,json,md}": ["prettier --write"]
    }
}
```

```js
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"
npx lint-staged  # only lint files being committed — fast!

// .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"
npx --no-install commitlint --edit "$1"

// commitlint.config.js
module.exports = { extends: ['@commitlint/config-conventional'] };
```

---

## 7. Monorepos

### Why monorepos?

```text
Polyrepo: each service in its own repository
  ✓ Independent versioning and deployments
  ✓ Simple — each team owns their repo
  ✗ Code sharing is painful (npm packages for everything)
  ✗ Cross-repo changes need multiple PRs
  ✗ Hard to enforce consistent tooling

Monorepo: all services in one repository
  ✓ Code sharing without packages (import directly)
  ✓ Atomic cross-service changes in one PR
  ✓ Consistent tooling (one ESLint, one TypeScript config)
  ✓ Single source of truth
  ✗ Slower CI (must figure out what changed)
  ✗ Git history gets large
  ✗ Harder to give fine-grained access control

Companies using monorepos: Google, Meta, Twitter, Airbnb
```

### Turborepo setup

```
taskboard/               # root
├── apps/
│   ├── api/             # Fastify server
│   ├── web/             # React frontend
│   └── admin/           # Admin dashboard
├── packages/
│   ├── db/              # Drizzle schema + client (shared)
│   ├── ui/              # shadcn components (shared)
│   ├── types/           # shared TypeScript types
│   └── config/          # ESLint, TypeScript, Tailwind configs
├── package.json
└── turbo.json
```

```json
// turbo.json
{
    "$schema": "https://turbo.build/schema.json",
    "pipeline": {
        "build": {
            "dependsOn": ["^build"], // build deps first
            "outputs": ["dist/**", ".next/**"]
        },
        "test": {
            "dependsOn": ["^build"],
            "cache": true // cache test results
        },
        "lint": {
            "outputs": []
        },
        "dev": {
            "cache": false,
            "persistent": true // keeps running
        }
    }
}
```

```bash
# Run commands in all workspaces
turbo build                        # build all apps (parallel, cached)
turbo test --filter=api            # only api package
turbo build --filter=web...        # web and its deps
turbo build --affected             # only packages changed since last commit

# Workspace management (npm/pnpm/yarn workspaces)
npm install lodash -w packages/ui  # install in specific workspace
```

---

## 8. Common Interview Questions

### "Explain the difference between merge and rebase."‼️

> Both integrate changes from one branch into another. Merge creates a new merge commit that ties two branch histories together — it's non-destructive and preserves exactly what happened and when. Rebase replays your commits on top of the target branch one by one, creating new commits with new SHAs — it produces a linear history that's easier to read but rewrites history. The rule: never rebase branches others are working on (their commits reference the old SHAs and diverge). On solo feature branches that haven't been pushed, rebase is fine and keeps history clean.

```text
"Rebase replays your commits" — what does this actually mean?‼️

Rebase doesn't MOVE your commits — it COPIES them. The originals are abandoned.

BEFORE rebase (your branch is based on B, but main moved to G):

  main:    A --- B --- F --- G
  feature:       B --- C --- D

  Commit C has:  parent = B,  SHA = abc111
  Commit D has:  parent = C,  SHA = abc222

WHAT REBASE DOES — step by step:

  Step 1: Git finds the common ancestor (B)
  Step 2: Git saves your commits as patches (diffs): C and D
  Step 3: Git moves your branch pointer to the tip of main (G)
  Step 4: Git REPLAYS each patch one by one on top of G:

    Replay C on top of G → creates C' (NEW commit, NEW SHA)
      C' has:  parent = G,  SHA = def333  ← different from original!
      The CODE CHANGES are the same as C, but the parent changed (B → G),
      so the SHA changes too.

    Replay D on top of C' → creates D' (NEW commit, NEW SHA)
      D' has:  parent = C',  SHA = def444  ← different from original!

  Result:
    main:    A --- B --- F --- G
    feature:                   G --- C' --- D'

    C and D still exist in git's object store (recoverable via git reflog)‼️
    but no branch points to them anymore — they're abandoned.‼️


WHY new SHAs? Because a commit's SHA is a hash of EVERYTHING:

  SHA = Secure Hash Algorithm
  Git uses SHA-1 (160-bit) → produces a 40-character hex string like abc1234def5678...
  (Git is transitioning to SHA-256)

  Every object in Git (commits, files, trees) gets a SHA:
    Same content → always the same SHA (deterministic)‼️
    Change ONE byte → completely different SHA
  It's a fingerprint — a unique ID for every commit, file, and directory.

  When you see:  git cherry-pick abc1234
                 git revert abc1234
                 git checkout abc1234
  That "abc1234" is the first 7 chars of the full 40-char SHA.
  Git only needs enough characters to be unique within your repo.

  SHA = hash(
    parent commit SHA    ← this changed (B → G), so SHA changes
    + tree (your code changes)
    + author + date
    + commit message
  )

  Even if your code changes and message are identical,
  a different parent = different SHA. Always.


WHY "replays one by one" matters — conflicts:

  If you have 5 commits and rebase onto main:

    Replaying commit 1... ✓ clean
    Replaying commit 2... ✓ clean
    Replaying commit 3... ✗ CONFLICT!
      → Git stops here. You fix the conflict, then:
        git add .
        git rebase --continue
    Replaying commit 4... ✓ clean
    Replaying commit 5... ✓ clean

  You might get conflicts at EACH commit — not just once like merge.
  Trade-off: rebase = cleaner history, but potentially more conflict steps.‼️


WHY "rewrites history" is dangerous for shared branches:

  You and Alice both work off the same branch:

    shared:  A --- B --- C --- D
    You have: C and D in your local copy
    Alice has: C and D in her local copy

  If you rebase, C and D become C' and D' (new SHAs).
  You force-push to replace C,D with C',D'.

  Alice still has the OLD C and D. When she pulls:
    Git sees C and C' as DIFFERENT commits (different SHAs)
    even though the code is the same.
    → merge conflicts, duplicate commits, chaos.

  This is why: NEVER rebase commits that others are working on.
  Only rebase YOUR OWN unpushed feature branch.
```

### "How do you handle merge conflicts?"

```bash
# 1. Understand what conflicted
git status                         # see which files conflict
git log --merge --left-right       # see commits from both sides causing conflict

# 2. Open conflicted file — look for conflict markers
<<<<<<< HEAD (your changes)
const timeout = 5000;
=======
const timeout = 30000;
>>>>>>> feature/auth (incoming changes)

# 3. Resolve: keep one, other, or combine
const timeout = 30000; # (chose incoming — they increased it for auth flow)

# 4. Stage and continue
git add src/config.ts
git merge --continue               # or: git rebase --continue

# Prevention:
# - Merge main into your branch frequently (small conflicts easier than big ones)‼️
# - Communicate with teammates when touching shared files‼️
# - Keep branches short-lived‼️
```

### "What is git bisect and when would you use it?"‼️

> Git bisect is a binary search through your commit history to find which commit introduced a bug. You tell it which commit is known-good and which is known-bad, then it checks out the midpoint. You test and say `git bisect good` or `git bisect bad`. It keeps halving the range until it finds the exact commit. This turns a search through 1,000 commits into ~10 checks. I'd use it when a bug appeared recently but I don't know when, and I can write a script that reliably reproduces it (you can automate bisect with `git bisect run ./test-script.sh`).

### "What is the difference between git reset and git revert?"

```text
git reset: moves the HEAD pointer backwards, rewrites history
  --soft:  commits undone, changes stay STAGED
  --mixed: commits undone, changes stay in WORKING DIRECTORY (default)
  --hard:  commits undone, changes DISCARDED (destructive!)

  Safe for: local commits not yet pushed
  Dangerous for: shared branches — teammates' history diverges

git revert: creates a NEW commit that undoes the specified commit‼️
  History is preserved — revert commit is visible in log
  Safe for shared branches — no history rewriting

Rule: use revert to undo commits on shared/remote branches‼️
      use reset to undo commits only you have locally‼️
```

### "How would you recover a lost commit after git reset --hard?"

```bash
# reflog is your safety net — records every HEAD position
git reflog                         # find the SHA before the reset
git checkout abc1234               # or: git reset --hard abc1234

# reflog entries are kept for 90 days by default
# After 90 days or git gc, truly lost
```

---

## Most Asked Git Interview Questions

### "What is the difference between `merge` and `rebase`?"

> Both integrate changes from one branch to another. `merge` creates a new merge commit that ties together both histories — history is preserved exactly as it happened, non-destructive. `rebase` rewrites commits from your branch on top of the target branch — linear history, no merge commit, cleaner log. Rule: **never rebase shared/public branches** (rewrites history, breaks teammates' repos). Rebase local feature branches before merging for clean history; merge to integrate into main.

```bash
# Merge — preserves all history, adds merge commit
git checkout main && git merge feature-branch

# Rebase — replays feature commits on top of main (linear history)
git checkout feature-branch && git rebase main
# then fast-forward merge:
git checkout main && git merge feature-branch
```

### "What is the difference between `git reset`, `git revert`, and `git restore`?"‼️

> `git reset` moves the branch pointer — can unstage, undo commits, or discard changes (destructive, rewrites history — don't use on pushed commits). `git revert` creates a NEW commit that undoes a previous commit — safe for shared branches, history preserved. `git restore` discards working directory changes for specific files (doesn't touch commits).

```bash
# reset modes:
git reset --soft HEAD~1   # undo last commit, keep changes staged
git reset --mixed HEAD~1  # undo last commit, keep changes unstaged (default)
git reset --hard HEAD~1   # undo last commit, DISCARD all changes — destructive!

# Safe undo for shared branches:
git revert abc1234        # creates new "Revert" commit — history intact

# Discard file changes (not commits):
git restore src/file.ts
```

### "What is `git stash`?"

> `git stash` saves your uncommitted changes (staged and unstaged) onto a stack and reverts the working directory to HEAD — lets you switch branches with a clean state. ‼️`git stash pop` reapplies the most recent stash and removes it. ‼️`git stash apply` reapplies without removing. Useful for: quick context switches, pulling latest without committing WIP.

```bash
git stash                          # stash current changes
git stash push -m "WIP: auth form" # with description
git stash list                     # see all stashes
git stash pop                      # apply latest and drop it
git stash apply stash@{2}          # apply a specific stash
git stash drop stash@{0}           # delete a stash
```

### "What is a detached HEAD state?"

> ‼️Normally HEAD points to a branch name (which points to a commit). ‼️Detached HEAD means HEAD points directly to a commit hash — not a branch. This happens when you `git checkout <commit-hash>` or a tag. Any commits you make won't belong to a branch and will be lost when you switch away (garbage collected). Fix: create a branch from the detached state with `git checkout -b new-branch`.

### "How does `git cherry-pick` work?"

> Cherry-pick applies the changes from a specific commit onto the current branch — ‼️without merging the whole branch. Creates a new commit with the same changes but a different hash. Useful for: backporting a bug fix to an older release branch, taking one specific commit from a feature branch.

```bash
# Apply commit abc1234 to current branch
git cherry-pick abc1234

# Cherry-pick a range (exclusive start, inclusive end)
git cherry-pick abc1234..def5678

# Cherry-pick without committing (stage only)
git cherry-pick --no-commit abc1234
```

### "What is `git bisect` and when do you use it?"

> `git bisect` performs a binary search through commit history to find which commit introduced a bug. You tell it a good commit and a bad commit; it checks out the midpoint; you test and mark it good/bad; it halves the range — O(log n) commits to test. Invaluable for finding regressions in large histories.

```bash
git bisect start
git bisect bad              # current commit is broken
git bisect good v1.0.0      # this version was working
# Git checks out midpoint — test it, then:
git bisect good             # or: git bisect bad
# Repeat until Git identifies the culprit commit
git bisect reset            # return to HEAD when done
```

### "What is the difference between `git fetch` and `git pull`?"

> ‼️`git fetch` downloads changes from remote but doesn't update your working branch — safe, non-destructive. `git pull` = `git fetch` + `git merge` (or `git rebase` with `--rebase` flag) — immediately integrates changes. Best practice: `fetch` then review (`git log origin/main`), then merge/rebase manually — more control. `git pull --rebase` is a good default to keep linear history.

### "What is a Git hook?"

> Git hooks are scripts that run automatically at specific Git events: `pre-commit` (runs before commit — lint, format, tests), `commit-msg` (validate commit message format), `pre-push` (run tests before push), `post-merge` (run npm install after pull). Stored in `.git/hooks/`. Share via tools like Husky (npm) which sets up hooks from package.json.

```bash
# .husky/pre-commit
npm run lint && npm run type-check

# .husky/commit-msg
npx commitlint --edit $1  # enforce conventional commits format
```

### "What are conventional commits?"

> A standardized commit message format that makes history readable and enables automation (changelogs, semantic versioning, release notes). Format: `type(scope): description`. Types: `feat` (new feature → minor version bump), `fix` (bug fix → patch bump), `BREAKING CHANGE` (→ major bump), `docs`, `chore`, `refactor`, `test`, `ci`.

```
feat(auth): add OAuth2 Google login
fix(tasks): prevent duplicate creation on double-click
feat!: remove deprecated v1 API endpoints

BREAKING CHANGE: v1 endpoints removed, migrate to v2
```

### "How do you resolve a merge conflict?"

> 1. `git status` to see conflicting files. 2) Open each file — conflict markers show `<<<<<<< HEAD` (your changes), `=======` (separator), `>>>>>>> branch` (incoming). 3) Edit to desired result, remove all markers. 4) `git add` the resolved files. 5) `git commit` (or `git rebase --continue` if rebasing). Use `git mergetool` for a visual diff. Prevention: pull frequently, keep branches short-lived.
