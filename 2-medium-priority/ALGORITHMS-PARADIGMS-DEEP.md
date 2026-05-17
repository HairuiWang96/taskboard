# Algorithm Paradigms — Senior Deep Reference

Complements ALGORITHMS-DEEP.md (which covers patterns + data structure usage).
This file covers: DP, Greedy, Divide & Conquer, Backtracking, String algorithms.

---

## Paradigm Decision Tree

```
Can I break it into independent subproblems?
  → Divide & Conquer (merge sort, binary search, quick select)

Do subproblems overlap? Is there optimal substructure?
  → Dynamic Programming (memoisation or tabulation)

Does a locally greedy choice always lead to global optimum?
  → Greedy (activity selection, Huffman, Dijkstra, Kruskal)

Need all solutions / explore all possibilities?
  → Backtracking (permutations, N-queens, sudoku)

Graph traversal / shortest path?
  → BFS (shortest unweighted), Dijkstra (weighted +), Bellman-Ford (negative edges)
```

---

## Dynamic Programming

The key insight: **optimal substructure + overlapping subproblems**.

```
Framework:
  1. Define subproblem: dp[i] or dp[i][j] — what does it represent?
  2. Recurrence: how does dp[i] depend on smaller subproblems?
  3. Base cases
  4. Iteration order (which subproblems must be computed first)
  5. Space optimisation (can I use rolling array?)
```

### Top-down (Memoisation) vs Bottom-up (Tabulation)

```ts
// Top-down: natural recursion + cache
function fib(n: number, memo = new Map<number, number>()): number {
  if (n <= 1) return n
  if (memo.has(n)) return memo.get(n)!
  const result = fib(n - 1, memo) + fib(n - 2, memo)
  memo.set(n, result)
  return result
}

// Bottom-up: fill table iteratively (O(1) space with rolling vars)
function fib(n: number): number {
  if (n <= 1) return n
  let prev = 0, cur = 1
  for (let i = 2; i <= n; i++) [prev, cur] = [cur, prev + cur]
  return cur
}
```

---

### 0/1 Knapsack

```ts
// n items, weight[i] and value[i], max capacity W
// dp[w] = max value achievable with capacity w
// Iterate items outer, capacity inner (backwards to prevent reuse)
// Time: O(n*W), Space: O(W)

function knapsack(weights: number[], values: number[], W: number): number {
  const dp = new Array(W + 1).fill(0)
  for (let i = 0; i < weights.length; i++) {
    for (let w = W; w >= weights[i]; w--) {  // backwards = each item used at most once
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i])
    }
  }
  return dp[W]
}

// Unbounded knapsack (item can be used multiple times): iterate w forwards
function unboundedKnapsack(weights: number[], values: number[], W: number): number {
  const dp = new Array(W + 1).fill(0)
  for (let w = 1; w <= W; w++) {
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] <= w) dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i])
    }
  }
  return dp[W]
}
```

---

### Longest Common Subsequence (LCS)

```ts
// dp[i][j] = LCS of s1[0..i-1] and s2[0..j-1]
// Match: dp[i][j] = dp[i-1][j-1] + 1
// No match: dp[i][j] = max(dp[i-1][j], dp[i][j-1])
// Time: O(m*n), Space: O(m*n) → O(n) with rolling row

function lcs(s1: string, s2: string): number {
  const m = s1.length, n = s2.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = s1[i - 1] === s2[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

// Related: Longest Common Substring (contiguous)
// Match: dp[i][j] = dp[i-1][j-1] + 1
// No match: dp[i][j] = 0  (reset — must be contiguous)
// Answer: max dp[i][j] seen
```

---

### Coin Change

```ts
// Min coins to make amount. dp[a] = min coins for amount a.
// dp[0] = 0, dp[a] = min(dp[a - coin] + 1) for each coin ≤ a
// Time: O(n * amount), Space: O(amount)

function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity)
  dp[0] = 0
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1)
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount]
}

// Count number of ways (combination sum IV):
// dp[0] = 1, dp[a] += dp[a - coin]
// Outer loop = amounts, inner = coins → counts ordered permutations
// Outer = coins, inner = amounts → counts unordered combinations
function countWays(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(0)
  dp[0] = 1
  for (const coin of coins) {        // outer = coins → combinations (no repeats in result)
    for (let a = coin; a <= amount; a++) dp[a] += dp[a - coin]
  }
  return dp[amount]
}
```

---

### Longest Increasing Subsequence (LIS)

```ts
// O(n²) DP
function lis(nums: number[]): number {
  const dp = new Array(nums.length).fill(1)
  let max = 1
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1)
    }
    max = Math.max(max, dp[i])
  }
  return max
}

// O(n log n) — patience sorting with binary search on tails array
function lisFast(nums: number[]): number {
  const tails: number[] = []
  for (const n of nums) {
    let lo = 0, hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tails[mid] < n) lo = mid + 1
      else hi = mid
    }
    tails[lo] = n   // replace or extend
  }
  return tails.length
}
```

---

### Edit Distance (Levenshtein)

```ts
// Min ops (insert, delete, replace) to convert s1 → s2
// dp[i][j] = edit distance of s1[0..i-1] and s2[0..j-1]
// Base: dp[i][0] = i (delete all), dp[0][j] = j (insert all)

function editDistance(s1: string, s2: string): number {
  const m = s1.length, n = s2.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1]
      else dp[i][j] = 1 + Math.min(
        dp[i - 1][j],      // delete from s1
        dp[i][j - 1],      // insert into s1
        dp[i - 1][j - 1]   // replace
      )
    }
  }
  return dp[m][n]
}
```

---

### House Robber variants

```ts
// I — linear, no adjacent
function rob(nums: number[]): number {
  let prev2 = 0, prev1 = 0
  for (const n of nums) {
    const cur = Math.max(prev1, prev2 + n)
    prev2 = prev1; prev1 = cur
  }
  return prev1
}

// II — circular (first and last are adjacent): run rob on [0..n-2] and [1..n-1], take max
function robCircular(nums: number[]): number {
  const robRange = (lo: number, hi: number) => {
    let prev2 = 0, prev1 = 0
    for (let i = lo; i <= hi; i++) {
      const cur = Math.max(prev1, prev2 + nums[i])
      prev2 = prev1; prev1 = cur
    }
    return prev1
  }
  return Math.max(robRange(0, nums.length - 2), robRange(1, nums.length - 1))
}
```

---

### Interval DP

```ts
// dp[i][j] = optimal cost for subproblem on range [i, j]
// Try all split points k between i and j
// Fill by increasing interval length (bottom-up)

// Burst Balloons — max coins: nums[left] * nums[i] * nums[right]
function maxCoins(nums: number[]): number {
  const arr = [1, ...nums, 1]  // add boundary 1s
  const n = arr.length
  const dp = Array.from({ length: n }, () => new Array(n).fill(0))

  for (let len = 2; len < n; len++) {
    for (let left = 0; left < n - len; left++) {
      const right = left + len
      for (let k = left + 1; k < right; k++) {  // k = last balloon to burst in (left, right)
        dp[left][right] = Math.max(
          dp[left][right],
          dp[left][k] + arr[left] * arr[k] * arr[right] + dp[k][right]
        )
      }
    }
  }
  return dp[0][n - 1]
}
```

---

### Word Break

```ts
// dp[i] = can s[0..i-1] be segmented into dict words?
function wordBreak(s: string, wordDict: string[]): boolean {
  const words = new Set(wordDict)
  const dp = new Array(s.length + 1).fill(false)
  dp[0] = true
  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && words.has(s.slice(j, i))) { dp[i] = true; break }
    }
  }
  return dp[s.length]
}
```

---

## Greedy Algorithms

```
Key: prove a locally optimal choice leads to global optimum.
Common pattern: sort → iterate → pick greedily (earliest end, largest, etc.)
```

```ts
// Activity Selection — max non-overlapping intervals
// Greedy: always pick earliest end time
function eraseOverlapIntervals(intervals: number[][]): number {
  intervals.sort((a, b) => a[1] - b[1])
  let removed = 0, end = -Infinity
  for (const [s, e] of intervals) {
    if (s >= end) end = e           // compatible — take it
    else removed++                   // overlap — skip it
  }
  return removed
}

// Jump Game II — min jumps
function jump(nums: number[]): number {
  let jumps = 0, curEnd = 0, farthest = 0
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i])
    if (i === curEnd) { jumps++; curEnd = farthest }
  }
  return jumps
}

// Task Scheduler — min intervals with cooldown n
function leastInterval(tasks: string[], n: number): number {
  const freq = new Array(26).fill(0)
  for (const t of tasks) freq[t.charCodeAt(0) - 65]++
  const maxFreq = Math.max(...freq)
  const maxCount = freq.filter(f => f === maxFreq).length
  return Math.max(tasks.length, (maxFreq - 1) * (n + 1) + maxCount)
}

// Merge Intervals
function merge(intervals: number[][]): number[][] {
  intervals.sort((a, b) => a[0] - b[0])
  const result: number[][] = [intervals[0]]
  for (const [s, e] of intervals.slice(1)) {
    const last = result[result.length - 1]
    if (s <= last[1]) last[1] = Math.max(last[1], e)
    else result.push([s, e])
  }
  return result
}
```

---

## Divide & Conquer

```ts
// MergeSort — O(n log n) stable
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr
  const mid = arr.length >> 1
  return merge(mergeSort(arr.slice(0, mid)), mergeSort(arr.slice(mid)))
}
function merge(l: number[], r: number[]): number[] {
  const result: number[] = []
  let i = 0, j = 0
  while (i < l.length && j < r.length) result.push(l[i] <= r[j] ? l[i++] : r[j++])
  return result.concat(l.slice(i)).concat(r.slice(j))
}

// QuickSelect — O(n) avg, find k-th smallest
function quickSelect(arr: number[], k: number): number {
  const pivot = arr[Math.floor(Math.random() * arr.length)]
  const less = arr.filter(x => x < pivot)
  const equal = arr.filter(x => x === pivot)
  const greater = arr.filter(x => x > pivot)
  if (k <= less.length) return quickSelect(less, k)
  if (k <= less.length + equal.length) return pivot
  return quickSelect(greater, k - less.length - equal.length)
}

// Binary search on answer — "find minimum X such that condition(X) is true"
function binarySearchAnswer(lo: number, hi: number, condition: (x: number) => boolean): number {
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (condition(mid)) hi = mid    // works, try smaller
    else lo = mid + 1               // too small, go higher
  }
  return lo
}

// Example: ship packages in D days — minimum capacity
function shipWithinDays(weights: number[], days: number): number {
  const canShip = (cap: number) => {
    let d = 1, load = 0
    for (const w of weights) {
      if (load + w > cap) { d++; load = 0 }
      load += w
    }
    return d <= days
  }
  return binarySearchAnswer(Math.max(...weights), weights.reduce((a, b) => a + b), canShip)
}
```

---

## Backtracking

```ts
// Template:
// function bt(state, choices):
//   if isSolution(state): record; return
//   for choice of choices:
//     if isValid(choice, state):
//       makeChoice(); bt(...); undoChoice()  ← undo is the key

// Permutations — O(n! * n)
function permutations(nums: number[]): number[][] {
  const result: number[][] = []
  const used = new Array(nums.length).fill(false)
  function bt(cur: number[]) {
    if (cur.length === nums.length) { result.push([...cur]); return }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue
      used[i] = true; cur.push(nums[i])
      bt(cur)
      cur.pop(); used[i] = false
    }
  }
  bt([])
  return result
}

// Subsets — O(2^n)
function subsets(nums: number[]): number[][] {
  const result: number[][] = []
  function bt(start: number, cur: number[]) {
    result.push([...cur])
    for (let i = start; i < nums.length; i++) {
      cur.push(nums[i]); bt(i + 1, cur); cur.pop()
    }
  }
  bt(0, [])
  return result
}

// Combination Sum (can reuse elements)
function combinationSum(candidates: number[], target: number): number[][] {
  const result: number[][] = []
  function bt(start: number, cur: number[], remaining: number) {
    if (remaining === 0) { result.push([...cur]); return }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break  // sort candidates first
      cur.push(candidates[i])
      bt(i, cur, remaining - candidates[i])  // i not i+1: can reuse
      cur.pop()
    }
  }
  candidates.sort((a, b) => a - b)
  bt(0, [], target)
  return result
}

// N-Queens
function solveNQueens(n: number): string[][] {
  const result: string[][] = []
  const cols = new Set<number>(), d1 = new Set<number>(), d2 = new Set<number>()
  const board = Array.from({ length: n }, () => '.'.repeat(n))

  function bt(row: number) {
    if (row === n) { result.push([...board]); return }
    for (let col = 0; col < n; col++) {
      if (cols.has(col) || d1.has(row - col) || d2.has(row + col)) continue
      cols.add(col); d1.add(row - col); d2.add(row + col)
      board[row] = '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1)
      bt(row + 1)
      cols.delete(col); d1.delete(row - col); d2.delete(row + col)
      board[row] = '.'.repeat(n)
    }
  }
  bt(0)
  return result
}

// Sudoku Solver
function solveSudoku(board: string[][]): void {
  function isValid(r: number, c: number, val: string): boolean {
    for (let i = 0; i < 9; i++) {
      if (board[r][i] === val || board[i][c] === val) return false
      const br = 3 * Math.floor(r / 3) + Math.floor(i / 3)
      const bc = 3 * Math.floor(c / 3) + (i % 3)
      if (board[br][bc] === val) return false
    }
    return true
  }
  function bt(): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== '.') continue
        for (let d = 1; d <= 9; d++) {
          const v = String(d)
          if (isValid(r, c, v)) {
            board[r][c] = v
            if (bt()) return true
            board[r][c] = '.'
          }
        }
        return false  // no valid digit → backtrack
      }
    }
    return true  // all filled
  }
  bt()
}
```

---

## String Algorithms

```ts
// KMP — O(n+m) pattern matching (naive is O(n*m))
function kmpSearch(text: string, pattern: string): number[] {
  const lps = buildLPS(pattern)
  const result: number[] = []
  let i = 0, j = 0
  while (i < text.length) {
    if (text[i] === pattern[j]) { i++; j++ }
    if (j === pattern.length) { result.push(i - j); j = lps[j - 1] }
    else if (i < text.length && text[i] !== pattern[j]) {
      j > 0 ? (j = lps[j - 1]) : i++
    }
  }
  return result
}
function buildLPS(p: string): number[] {
  const lps = new Array(p.length).fill(0)
  let len = 0, i = 1
  while (i < p.length) {
    if (p[i] === p[len]) lps[i++] = ++len
    else if (len > 0) len = lps[len - 1]
    else lps[i++] = 0
  }
  return lps
}

// Rabin-Karp rolling hash — O(n+m) avg
// Compute hash of pattern and sliding window; compare on hash match
// Useful for multiple pattern search (Aho-Corasick for many patterns)

// Trie-based autocomplete — see DATA-STRUCTURES-DEEP.md

// Manacher's algorithm — O(n) longest palindromic substring
// (transform s → #a#b#a# to handle even/odd uniformly)
```

---

## Complexity Quick Reference

```
Sorting:
  QuickSort:    O(n log n) avg, O(n²) worst, O(log n) space
  MergeSort:    O(n log n) all, O(n) space, stable
  HeapSort:     O(n log n) all, O(1) space
  TimSort:      O(n log n) worst, O(n) best — V8/Python default
  CountSort:    O(n + k), integers in range [0,k]

Graph:
  BFS/DFS:           O(V + E)
  Dijkstra (heap):   O((V + E) log V)
  Bellman-Ford:      O(VE) — handles negative edges
  Floyd-Warshall:    O(V³) — all pairs
  Kruskal MST:       O(E log E)

DP patterns:
  1D:        O(n)
  2D:        O(n*m)
  Interval:  O(n³)
  Tree:      O(n)

Backtracking:
  Permutations:  O(n! * n)
  Subsets:       O(2^n)
  Combination:   O(2^n) worst
```
