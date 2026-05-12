# Algorithms & Data Structures — Senior Developer Interview Reference

> The patterns and problems that appear most in full stack engineering interviews. Not competitive programming — practical interview prep.

---

## Table of Contents

1. [Big O Notation](#1-big-o-notation)
2. [Arrays & Strings](#2-arrays--strings)
3. [Hash Maps & Sets](#3-hash-maps--sets)
4. [Two Pointers & Sliding Window](#4-two-pointers--sliding-window)
5. [Linked Lists](#5-linked-lists)
6. [Stacks & Queues](#6-stacks--queues)
7. [Binary Search](#7-binary-search)
8. [Trees & Graphs](#8-trees--graphs)
9. [Dynamic Programming](#9-dynamic-programming)
10. [Sorting](#10-sorting)
11. [Interview Strategy](#11-interview-strategy)

---

## 1. Big O Notation

### Common complexities (fastest → slowest)

```text
O(1)      Constant     HashMap lookup, array index access
O(log n)  Logarithmic  Binary search, balanced BST operations
O(n)      Linear       Single loop through array
O(n log n) Linearithmic Merge sort, quick sort average case
O(n²)    Quadratic    Nested loops — selection/insertion sort
O(2ⁿ)    Exponential  Recursive fibonacci (naive)
O(n!)    Factorial    Generating all permutations

Rule of thumb for interviews:
  n ≤ 20:        O(2ⁿ) or O(n!) okay
  n ≤ 1,000:     O(n²) okay
  n ≤ 1,000,000: O(n log n) or better required
  n > 1,000,000: O(n) or O(log n) required
```

### Space complexity

```text
O(1):    no extra space (in-place)
O(n):    storing a copy of the input (extra array, hash map of n items)
O(n²):  2D matrix

Recursion stack:
  Each recursive call uses stack space
  O(n) for linear recursion
  O(log n) for binary recursion (binary search, balanced tree traversal)
  O(n) for unbalanced tree traversal
```

---

## 2. Arrays & Strings

### Core operations to know

```ts
// Reverse in-place — O(n) time, O(1) space
function reverse<T>(arr: T[]): T[] {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]]; // swap
    left++;
    right--;
  }
  return arr;
}

// Rotate array right by k positions
function rotate(nums: number[], k: number): void {
  k = k % nums.length; // handle k > length
  reverse(nums, 0, nums.length - 1); // reverse all
  reverse(nums, 0, k - 1);           // reverse first k
  reverse(nums, k, nums.length - 1); // reverse rest

  function reverse(arr: number[], l: number, r: number) {
    while (l < r) {
      [arr[l], arr[r]] = [arr[r], arr[l]];
      l++; r--;
    }
  }
}

// Find max subarray sum (Kadane's algorithm) — O(n)
function maxSubArray(nums: number[]): number {
  let maxSum = nums[0];
  let currentSum = nums[0];

  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }

  return maxSum;
}
// [-2, 1, -3, 4, -1, 2, 1, -5, 4] → 6 ([4,-1,2,1])
```

### String manipulation

```ts
// Check palindrome — O(n)
function isPalindrome(s: string): boolean {
  s = s.toLowerCase().replace(/[^a-z0-9]/g, ''); // alphanumeric only
  let left = 0, right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++; right--;
  }
  return true;
}

// Anagram check — O(n)
function isAnagram(s: string, t: string): boolean {
  if (s.length !== t.length) return false;
  const count = new Map<string, number>();

  for (const c of s) count.set(c, (count.get(c) ?? 0) + 1);
  for (const c of t) {
    if (!count.has(c)) return false;
    const n = count.get(c)! - 1;
    if (n === 0) count.delete(c);
    else count.set(c, n);
  }

  return count.size === 0;
}

// Group anagrams — O(n * k log k) where k = max string length
function groupAnagrams(strs: string[]): string[][] {
  const map = new Map<string, string[]>();

  for (const str of strs) {
    const key = str.split('').sort().join(''); // sorted = canonical form
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(str);
  }

  return [...map.values()];
}
// ["eat","tea","tan","ate","nat","bat"] → [["eat","tea","ate"],["tan","nat"],["bat"]]
```

---

## 3. Hash Maps & Sets

### The pattern: use a Map/Set to get O(1) lookup

```ts
// Two Sum — O(n) with HashMap, O(n²) with naive nested loops
function twoSum(nums: number[], target: number): [number, number] {
  const seen = new Map<number, number>(); // value → index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement)!, i];
    }
    seen.set(nums[i], i);
  }

  throw new Error('No solution');
}

// Subarray sum equals k — O(n)
// Key insight: prefix sum[i] - prefix sum[j] = subarray sum
function subarraySum(nums: number[], k: number): number {
  const prefixCounts = new Map<number, number>([[0, 1]]); // sum 0 seen once
  let count = 0, sum = 0;

  for (const num of nums) {
    sum += num;
    count += prefixCounts.get(sum - k) ?? 0;
    prefixCounts.set(sum, (prefixCounts.get(sum) ?? 0) + 1);
  }

  return count;
}

// Longest consecutive sequence — O(n)
function longestConsecutive(nums: number[]): number {
  const set = new Set(nums);
  let longest = 0;

  for (const num of set) {
    // Only start counting from the beginning of a sequence
    if (!set.has(num - 1)) {
      let length = 1;
      while (set.has(num + length)) length++;
      longest = Math.max(longest, length);
    }
  }

  return longest;
}
// [100, 4, 200, 1, 3, 2] → 4 (sequence: [1, 2, 3, 4])
```

---

## 4. Two Pointers & Sliding Window

### Two pointers — for sorted arrays or pairs

```ts
// Three sum — O(n²)
function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b); // sort first
  const result: number[][] = [];

  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue; // skip duplicates

    let left = i + 1, right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left + 1]) left++;   // skip dups
        while (left < right && nums[right] === nums[right - 1]) right--; // skip dups
        left++; right--;
      } else if (sum < 0) {
        left++;
      } else {
        right--;
      }
    }
  }

  return result;
}

// Container with most water — O(n)
function maxArea(height: number[]): number {
  let left = 0, right = height.length - 1;
  let max = 0;

  while (left < right) {
    const area = Math.min(height[left], height[right]) * (right - left);
    max = Math.max(max, area);
    // Move the shorter side — it can only get worse keeping it
    if (height[left] < height[right]) left++;
    else right--;
  }

  return max;
}
```

### Sliding window — for subarrays/substrings

```ts
// Longest substring without repeating characters — O(n)
function lengthOfLongestSubstring(s: string): number {
  const lastSeen = new Map<string, number>(); // char → last index
  let start = 0, maxLen = 0;

  for (let end = 0; end < s.length; end++) {
    const char = s[end];
    // If char seen and within current window, move start
    if (lastSeen.has(char) && lastSeen.get(char)! >= start) {
      start = lastSeen.get(char)! + 1;
    }
    lastSeen.set(char, end);
    maxLen = Math.max(maxLen, end - start + 1);
  }

  return maxLen;
}

// Minimum window substring — O(n + m)
function minWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);

  let formed = 0;
  const window = new Map<string, number>();
  let left = 0, min = Infinity, start = 0;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) ?? 0) + 1);

    if (need.has(c) && window.get(c) === need.get(c)) formed++;

    while (formed === need.size) {
      if (right - left + 1 < min) {
        min = right - left + 1;
        start = left;
      }
      const lc = s[left];
      window.set(lc, window.get(lc)! - 1);
      if (need.has(lc) && window.get(lc)! < need.get(lc)!) formed--;
      left++;
    }
  }

  return min === Infinity ? '' : s.slice(start, start + min);
}
```

---

## 5. Linked Lists

```ts
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

// Reverse linked list — O(n) iterative
function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;

  while (curr) {
    const next = curr.next; // save next
    curr.next = prev;       // reverse link
    prev = curr;            // advance prev
    curr = next;            // advance curr
  }

  return prev; // new head
}

// Detect cycle (Floyd's tortoise and hare) — O(n), O(1) space
function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head;

  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true; // met → cycle
  }

  return false;
}

// Merge two sorted lists — O(n + m)
function mergeTwoLists(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const dummy = new ListNode(0);
  let curr = dummy;

  while (l1 && l2) {
    if (l1.val <= l2.val) {
      curr.next = l1;
      l1 = l1.next;
    } else {
      curr.next = l2;
      l2 = l2.next;
    }
    curr = curr.next;
  }

  curr.next = l1 ?? l2; // attach remaining
  return dummy.next;
}

// Find middle node — O(n) (slow/fast pointer)
function findMiddle(head: ListNode): ListNode {
  let slow = head, fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next!;
    fast = fast.next.next;
  }
  return slow; // slow is at middle when fast reaches end
}
```

---

## 6. Stacks & Queues

```ts
// Valid parentheses — O(n)
function isValid(s: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  for (const c of s) {
    if ('([{'.includes(c)) {
      stack.push(c);
    } else {
      if (stack.pop() !== pairs[c]) return false;
    }
  }

  return stack.length === 0;
}

// Monotonic stack — next greater element — O(n)
function nextGreaterElement(nums: number[]): number[] {
  const result = new Array(nums.length).fill(-1);
  const stack: number[] = []; // stores INDICES

  for (let i = 0; i < nums.length; i++) {
    // Pop elements smaller than current — current is their next greater
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      result[stack.pop()!] = nums[i];
    }
    stack.push(i);
  }

  return result;
}
// [2, 1, 2, 4, 3] → [4, 2, 4, -1, -1]

// BFS uses a queue — O(n + e)
function bfs(graph: Map<number, number[]>, start: number): number[] {
  const visited = new Set<number>();
  const queue = [start];
  const order: number[] = [];
  visited.add(start);

  while (queue.length) {
    const node = queue.shift()!; // dequeue from front
    order.push(node);

    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor); // enqueue
      }
    }
  }

  return order;
}
```

---

## 7. Binary Search

```ts
// Classic binary search — O(log n)
function binarySearch(nums: number[], target: number): number {
  let left = 0, right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2); // avoids integer overflow
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}

// Find leftmost position of target
function searchLeft(nums: number[], target: number): number {
  let left = 0, right = nums.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] < target) left = mid + 1;
    else right = mid;
  }

  return left; // index of first occurrence (or insertion point)
}

// Search in rotated sorted array — O(log n)
function searchRotated(nums: number[], target: number): number {
  let left = 0, right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) return mid;

    // One half is always sorted
    if (nums[left] <= nums[mid]) { // left half sorted
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else { // right half sorted
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }

  return -1;
}

// Binary search on ANSWER (not array) — very powerful pattern
// "Find minimum capacity such that X is achievable"
function shipPackages(weights: number[], days: number): number {
  // Min capacity: heaviest package. Max: sum of all.
  let left = Math.max(...weights), right = weights.reduce((a, b) => a + b, 0);

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (canShip(weights, days, mid)) right = mid; // can do better
    else left = mid + 1; // need more capacity
  }

  return left;
}

function canShip(weights: number[], days: number, capacity: number): boolean {
  let dayCount = 1, load = 0;
  for (const w of weights) {
    if (load + w > capacity) { dayCount++; load = 0; }
    load += w;
  }
  return dayCount <= days;
}
```

---

## 8. Trees & Graphs

### Binary tree traversals

```ts
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val: number) { this.val = val; this.left = this.right = null; }
}

// DFS — recursive
function inorder(root: TreeNode | null): number[] {
  if (!root) return [];
  return [...inorder(root.left), root.val, ...inorder(root.right)];
}
// inorder:   left, root, right — gives sorted order in BST
// preorder:  root, left, right — useful for tree serialization
// postorder: left, right, root — useful for deletion, calculating heights

// BFS — level order
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const result: number[][] = [];
  const queue = [root];

  while (queue.length) {
    const levelSize = queue.length;
    const level: number[] = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(level);
  }

  return result;
}

// Max depth — O(n)
function maxDepth(root: TreeNode | null): number {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// Validate BST — O(n)
function isValidBST(root: TreeNode | null, min = -Infinity, max = Infinity): boolean {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false;
  return isValidBST(root.left, min, root.val) && isValidBST(root.right, root.val, max);
}

// Lowest Common Ancestor — O(n)
function lowestCommonAncestor(root: TreeNode, p: TreeNode, q: TreeNode): TreeNode {
  if (!root || root === p || root === q) return root;

  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  if (left && right) return root; // p and q on different sides
  return left ?? right;           // both on same side
}
```

### Graph algorithms

```ts
// DFS — O(V + E)
function dfs(graph: Map<string, string[]>, node: string, visited = new Set<string>()): void {
  if (visited.has(node)) return;
  visited.add(node);
  console.log(node);
  for (const neighbor of graph.get(node) ?? []) {
    dfs(graph, neighbor, visited);
  }
}

// Number of islands — O(n * m)
function numIslands(grid: string[][]): number {
  let count = 0;

  function sink(r: number, c: number) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return;
    if (grid[r][c] !== '1') return;
    grid[r][c] = '0'; // mark visited by sinking
    sink(r + 1, c); sink(r - 1, c);
    sink(r, c + 1); sink(r, c - 1);
  }

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '1') {
        count++;
        sink(r, c);
      }
    }
  }

  return count;
}

// Topological sort (for dependency ordering) — O(V + E)
function topoSort(n: number, prerequisites: [number, number][]): number[] {
  const inDegree = new Array(n).fill(0);
  const adj = new Map<number, number[]>();

  for (const [course, prereq] of prerequisites) {
    adj.set(prereq, [...(adj.get(prereq) ?? []), course]);
    inDegree[course]++;
  }

  const queue = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const order: number[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    order.push(node);
    for (const next of adj.get(node) ?? []) {
      if (--inDegree[next] === 0) queue.push(next);
    }
  }

  return order.length === n ? order : []; // empty = cycle exists
}
```

---

## 9. Dynamic Programming

### The DP framework

```text
1. Identify if problem has optimal substructure and overlapping subproblems
2. Define the state: dp[i] means "answer for subproblem i"
3. Find the recurrence: how does dp[i] relate to smaller subproblems?
4. Set base cases
5. Determine order to fill the table (top-down memoization or bottom-up tabulation)
```

```ts
// Fibonacci — classic DP example
// Naive: O(2ⁿ)
function fibNaive(n: number): number {
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

// Memoization (top-down): O(n)
function fibMemo(n: number, memo: Map<number, number> = new Map()): number {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n)!;
  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}

// Tabulation (bottom-up): O(n), O(1) space
function fib(n: number): number {
  if (n <= 1) return n;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}

// Climbing stairs — how many ways to reach step n taking 1 or 2 steps
// Same as fibonacci: dp[n] = dp[n-1] + dp[n-2]
function climbStairs(n: number): number {
  if (n <= 2) return n;
  let prev = 1, curr = 2;
  for (let i = 3; i <= n; i++) [prev, curr] = [curr, prev + curr];
  return curr;
}

// 0/1 Knapsack — O(n * W)
function knapsack(weights: number[], values: number[], capacity: number): number {
  const n = weights.length;
  // dp[i][w] = max value using first i items with capacity w
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w]; // don't take item i
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
      }
    }
  }

  return dp[n][capacity];
}

// Longest common subsequence — O(n * m)
function lcs(s1: string, s2: string): number {
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Coin change — minimum coins to make amount — O(n * amount)
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a) {
        dp[a] = Math.min(dp[a], dp[a - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

---

## 10. Sorting

### Know the algorithms and when to use each

```text
Comparison sorts:
  Merge sort:    O(n log n) always, O(n) space — stable, good for linked lists
  Quick sort:    O(n log n) average, O(n²) worst, O(log n) space — fast in practice
  Heap sort:     O(n log n) always, O(1) space — not stable, rarely used
  Insertion sort: O(n²), O(1) — great for small n or nearly sorted data

Non-comparison sorts (can beat O(n log n) with constraints):
  Counting sort: O(n + k) — when values in small range [0, k]
  Radix sort:    O(n * d) — when sorting integers by digits
  Bucket sort:   O(n) average — uniformly distributed data

JavaScript sort: TimSort (merge + insertion) — O(n log n), stable
  Always provide comparator: arr.sort((a, b) => a - b) for numbers!
  Without comparator: sorts as strings! [10, 9, 100].sort() → [10, 100, 9]
```

```ts
// Merge sort implementation
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let l = 0, r = 0;

  while (l < left.length && r < right.length) {
    if (left[l] <= right[r]) result.push(left[l++]);
    else result.push(right[r++]);
  }

  return [...result, ...left.slice(l), ...right.slice(r)];
}

// Quick select — find kth smallest — O(n) average
function quickSelect(nums: number[], k: number): number {
  return select(nums, 0, nums.length - 1, k - 1);
}

function select(arr: number[], left: number, right: number, k: number): number {
  if (left === right) return arr[left];

  const pivotIdx = partition(arr, left, right);
  if (pivotIdx === k) return arr[pivotIdx];
  if (pivotIdx > k) return select(arr, left, pivotIdx - 1, k);
  return select(arr, pivotIdx + 1, right, k);
}

function partition(arr: number[], left: number, right: number): number {
  const pivot = arr[right];
  let i = left;

  for (let j = left; j < right; j++) {
    if (arr[j] <= pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }

  [arr[i], arr[right]] = [arr[right], arr[i]];
  return i;
}
```

---

## 11. Interview Strategy

### The 5-step framework (say these out loud)

```text
1. Understand (2-3 min)
   - Restate the problem in your own words
   - Ask about constraints: input size, data types, edge cases
   - "Can there be duplicates?" "Can the array be empty?" "Is it sorted?"

2. Examples (1-2 min)
   - Walk through the given example
   - Create your own example (especially edge cases)
   - "What should happen if the input is empty?"

3. Approach (3-5 min)
   - Think out loud: "My first instinct is brute force..."
   - Identify the pattern: sorted → binary search? Need O(1) lookup → HashMap?
   - State time and space complexity before coding
   - Get agreement from interviewer before coding

4. Code (10-15 min)
   - Write clean, readable code
   - Name variables clearly (not i1, i2 but leftPtr, rightPtr)
   - Talk through what you're doing
   - Leave TODO comments for things you'll add later

5. Test (3-5 min)
   - Trace through your example step by step
   - Test edge cases: empty input, single element, all same, min/max values
   - Talk through your test like: "If input is [], we return early here..."
```

### Pattern recognition

```text
Array/String + "find subarray/substring" → Sliding Window
Sorted array + "find pair/target" → Two Pointers
"Find kth largest" → Heap or QuickSelect
"Find path in tree/graph" → DFS
"Shortest path in graph" → BFS
"Is there a cycle" → Floyd's slow/fast pointer
"Combinations/permutations" → Backtracking (DFS with undo)
"Minimum/maximum of something" → DP or Greedy
"Parentheses/brackets" → Stack
"Search in sorted array" → Binary Search
"Repeated computation in recursion" → Memoization
"Count/find combinations" → DP
"Linked list middle" → Slow/fast pointer
"Overlapping intervals" → Sort by start, then greedy
```

### Time complexity targets

```text
For 1 point in the interview: O(n²) brute force
For 2 points: O(n log n) with sorting or heap
For full credit: O(n) with HashMap/two pointers/sliding window/DP

Typical interview progression:
  1. State brute force solution (even if O(n²)) — shows you understand the problem
  2. Identify bottleneck (the inner loop?)
  3. Replace bottleneck with better data structure (HashMap for O(1) lookup)
  4. Get to optimal
```

### Common mistakes in interviews

```text
Off-by-one errors:
  Array index: use nums.length - 1 for last element
  Loop bounds: check if condition is < or <=
  Sliding window: right - left + 1 (not right - left) for window size

Integer overflow (JavaScript: not usually an issue — uses 64-bit floats)
  Midpoint: use left + Math.floor((right - left) / 2)
  (not (left + right) / 2 — can overflow in other languages)

Not handling edge cases:
  Empty array → return early
  Single element → return it
  All same elements → don't infinite loop

Forgetting to handle null in trees:
  Always check if (!root) return ... first

Mutating input when you shouldn't:
  If algorithm modifies the array, mention it and offer to work on a copy
  Make a copy if needed: const nums = [...input]
```
