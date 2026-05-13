# Interview Coding Patterns — Deep Reference

## How to Use This File

> 80% of coding interview problems map to ~10 patterns. When you see a problem, identify the pattern first — then apply the template. This file is about pattern RECOGNITION, not theory.

```
Clue in problem → Pattern to reach for
────────────────────────────────────────────────────────────────────────
Sorted array, find pair/triplet           → Two Pointers
Subarray/substring with constraint        → Sliding Window
Linked list cycle / middle / merge        → Fast & Slow Pointers
Overlapping intervals                     → Merge Intervals
Top K elements, K closest                 → Heap (Priority Queue)
Find something in sorted array            → Binary Search (on answer too)
All combinations/permutations/subsets     → Backtracking
Prefix/word search, autocomplete          → Trie
Next greater/smaller element              → Monotonic Stack
Shortest path in graph, level-order tree  → BFS
All paths, connected components, DFS tree → DFS
Optimal substructure, overlapping subprob → Dynamic Programming
```

---

## Pattern 1: Two Pointers

**Use when**: sorted array, finding pairs that satisfy a condition, in-place manipulation.

```ts
// Template — left and right moving toward each other
function twoSum(arr: number[], target: number): [number, number] | null {
    let left = 0, right = arr.length - 1;
    while (left < right) {
        const sum = arr[left] + arr[right];
        if (sum === target) return [left, right];
        if (sum < target) left++;
        else right--;
    }
    return null;
}

// Template — same direction (remove duplicates, merge)
function removeDuplicates(nums: number[]): number {
    let slow = 0;
    for (let fast = 1; fast < nums.length; fast++) {
        if (nums[fast] !== nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
    }
    return slow + 1;
}

// Classic problems:
// - Two Sum II (sorted) → two pointers from ends
// - 3Sum → fix one, two pointers for the rest
// - Container With Most Water → two pointers from ends
// - Remove nth from end → two pointers with gap of n
```

---

## Pattern 2: Sliding Window

**Use when**: subarray/substring of fixed or variable size, "longest/shortest/maximum" with a constraint.

```ts
// Fixed window — maximum sum of size k
function maxSumWindow(arr: number[], k: number): number {
    let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);
    let max = windowSum;
    for (let i = k; i < arr.length; i++) {
        windowSum += arr[i] - arr[i - k]; // slide: add right, remove left
        max = Math.max(max, windowSum);
    }
    return max;
}

// Variable window — longest substring with at most k distinct chars
function longestSubstringKDistinct(s: string, k: number): number {
    const freq = new Map<string, number>();
    let left = 0, maxLen = 0;
    for (let right = 0; right < s.length; right++) {
        freq.set(s[right], (freq.get(s[right]) ?? 0) + 1); // expand right
        while (freq.size > k) {                              // shrink left
            const c = s[left++];
            if (freq.get(c) === 1) freq.delete(c);
            else freq.set(c, freq.get(c)! - 1);
        }
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}

// Classic problems:
// - Longest substring without repeating characters
// - Minimum window substring
// - Maximum sum subarray of size k
// - Fruit into baskets (at most 2 types)
```

---

## Pattern 3: Fast & Slow Pointers

**Use when**: linked list problems — cycle detection, finding middle, palindrome check.

```ts
// Detect cycle
function hasCycle(head: ListNode | null): boolean {
    let slow = head, fast = head;
    while (fast && fast.next) {
        slow = slow!.next;
        fast = fast.next.next;
        if (slow === fast) return true;
    }
    return false;
}

// Find middle of linked list
function findMiddle(head: ListNode): ListNode {
    let slow = head, fast = head;
    while (fast.next && fast.next.next) {
        slow = slow.next!;
        fast = fast.next.next;
    }
    return slow; // slow is at the middle
}

// Find cycle start
function detectCycleStart(head: ListNode | null): ListNode | null {
    let slow = head, fast = head;
    while (fast && fast.next) {
        slow = slow!.next;
        fast = fast.next.next;
        if (slow === fast) {
            // Move one pointer to head; both move at speed 1 — meet at cycle start
            let start = head;
            while (start !== slow) {
                start = start!.next;
                slow = slow!.next;
            }
            return start;
        }
    }
    return null;
}

// Classic problems:
// - Linked list cycle I and II
// - Happy number (cycle in number sequence)
// - Middle of the linked list
// - Palindrome linked list (find middle, reverse second half, compare)
```

---

## Pattern 4: Merge Intervals

**Use when**: array of intervals, overlapping, merging, scheduling.

```ts
// Merge overlapping intervals
function merge(intervals: number[][]): number[][] {
    intervals.sort((a, b) => a[0] - b[0]); // sort by start
    const result: number[][] = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const last = result[result.length - 1];
        if (intervals[i][0] <= last[1]) {
            last[1] = Math.max(last[1], intervals[i][1]); // merge
        } else {
            result.push(intervals[i]); // no overlap
        }
    }
    return result;
}

// Insert interval into sorted list
function insert(intervals: number[][], newInterval: number[]): number[][] {
    const result: number[][] = [];
    let i = 0;
    // Add all intervals that end before newInterval starts
    while (i < intervals.length && intervals[i][1] < newInterval[0])
        result.push(intervals[i++]);
    // Merge overlapping intervals with newInterval
    while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.push(newInterval);
    // Add remaining
    while (i < intervals.length) result.push(intervals[i++]);
    return result;
}

// Classic problems:
// - Merge intervals
// - Insert interval
// - Meeting rooms I & II (can one person attend all? / min rooms needed)
// - Non-overlapping intervals
```

---

## Pattern 5: Top K Elements (Heap)

**Use when**: "find K largest/smallest/most frequent", K closest points.

```ts
// JavaScript doesn't have a built-in heap — use a sorted structure or implement one
// In interviews, describe the algorithm and note you'd use a library

// Top K frequent elements — O(n log k)
function topKFrequent(nums: number[], k: number): number[] {
    const freq = new Map<number, number>();
    for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1);

    // Min-heap of size k (by frequency)
    // Keep only k elements — always pop the minimum frequency
    // At the end, heap contains the k most frequent
    const entries = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    return entries.slice(0, k).map(([num]) => num);
    // In a real interview: implement MinHeap or use a priority queue library
}

// Kth largest element — QuickSelect O(n) average
function findKthLargest(nums: number[], k: number): number {
    const target = nums.length - k;
    function quickSelect(left: number, right: number): number {
        const pivot = nums[right];
        let store = left;
        for (let i = left; i < right; i++) {
            if (nums[i] <= pivot) [nums[i], nums[store++]] = [nums[store], nums[i]];
        }
        [nums[store], nums[right]] = [nums[right], nums[store]];
        if (store === target) return nums[store];
        return store < target
            ? quickSelect(store + 1, right)
            : quickSelect(left, store - 1);
    }
    return quickSelect(0, nums.length - 1);
}

// Classic problems:
// - Kth largest element in array
// - K closest points to origin
// - Top K frequent elements
// - Sort characters by frequency
// - Find median from data stream (two heaps)
```

---

## Pattern 6: Binary Search

**Use when**: sorted array, finding target, "minimum/maximum possible value" problems.

```ts
// Standard binary search
function binarySearch(arr: number[], target: number): number {
    let left = 0, right = arr.length - 1;
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

// Find leftmost position (first occurrence)
function searchFirst(arr: number[], target: number): number {
    let left = 0, right = arr.length - 1, result = -1;
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (arr[mid] === target) { result = mid; right = mid - 1; } // keep searching left
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return result;
}

// Binary search on ANSWER — key senior insight
// "What is the minimum/maximum X such that condition(X) is true?"
// Condition must be monotonic: false...false...true...true (or reverse)
function minCapacityToShip(weights: number[], days: number): number {
    let left = Math.max(...weights); // min possible: must carry heaviest
    let right = weights.reduce((a, b) => a + b); // max: carry all in one day

    function canShip(capacity: number): boolean {
        let daysNeeded = 1, current = 0;
        for (const w of weights) {
            if (current + w > capacity) { daysNeeded++; current = 0; }
            current += w;
        }
        return daysNeeded <= days;
    }

    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        if (canShip(mid)) right = mid; // mid works, try smaller
        else left = mid + 1;           // too small, need more
    }
    return left;
}

// Classic problems:
// - Binary search, search in rotated sorted array
// - Find minimum in rotated sorted array
// - Capacity to ship packages (binary search on answer)
// - Koko eating bananas (binary search on answer)
// - Median of two sorted arrays
```

---

## Pattern 7: Backtracking

**Use when**: generate all possibilities — combinations, permutations, subsets, valid configurations.

```ts
// Template — the same structure works for all backtracking problems
function backtrack(
    result: number[][],
    current: number[],
    start: number,
    nums: number[]
) {
    result.push([...current]); // add current state (for subsets — add always)

    for (let i = start; i < nums.length; i++) {
        current.push(nums[i]);      // choose
        backtrack(result, current, i + 1, nums); // explore
        current.pop();              // unchoose (backtrack)
    }
}

// All subsets
function subsets(nums: number[]): number[][] {
    const result: number[][] = [];
    backtrack(result, [], 0, nums);
    return result;
}

// All combinations of size k
function combine(n: number, k: number): number[][] {
    const result: number[][] = [];
    function bt(start: number, current: number[]) {
        if (current.length === k) { result.push([...current]); return; }
        for (let i = start; i <= n; i++) {
            current.push(i);
            bt(i + 1, current);
            current.pop();
        }
    }
    bt(1, []);
    return result;
}

// Classic problems:
// - Subsets, Subsets II (with duplicates)
// - Permutations, Permutations II
// - Combination Sum I, II
// - Word search (2D backtracking)
// - N-Queens, Sudoku solver
// - Palindrome partitioning
```

---

## Pattern 8: Trie (Prefix Tree)

**Use when**: prefix search, autocomplete, "count words with prefix", word search in grid.

```ts
class TrieNode {
    children = new Map<string, TrieNode>();
    isEnd = false;
    count = 0; // optional: count words passing through
}

class Trie {
    root = new TrieNode();

    insert(word: string) {
        let node = this.root;
        for (const ch of word) {
            if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
            node = node.children.get(ch)!;
            node.count++;
        }
        node.isEnd = true;
    }

    search(word: string): boolean {
        const node = this.traverse(word);
        return node?.isEnd === true;
    }

    startsWith(prefix: string): boolean {
        return this.traverse(prefix) !== null;
    }

    private traverse(s: string): TrieNode | null {
        let node = this.root;
        for (const ch of s) {
            if (!node.children.has(ch)) return null;
            node = node.children.get(ch)!;
        }
        return node;
    }
}

// Classic problems:
// - Implement Trie
// - Search suggestions system (autocomplete)
// - Replace words (dictionary)
// - Word search II (Trie + DFS on grid)
// - Count words with given prefix
```

---

## Pattern 9: Monotonic Stack

**Use when**: "next greater/smaller element", temperatures, buildings with ocean view, rectangle in histogram.

```ts
// Next greater element (to the right)
function nextGreater(nums: number[]): number[] {
    const result = new Array(nums.length).fill(-1);
    const stack: number[] = []; // stores INDICES

    for (let i = 0; i < nums.length; i++) {
        // Pop elements smaller than current — current is their "next greater"
        while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
            result[stack.pop()!] = nums[i];
        }
        stack.push(i);
    }
    return result; // remaining in stack have no greater element → -1
}

// Daily temperatures (days until warmer)
function dailyTemperatures(temps: number[]): number[] {
    const result = new Array(temps.length).fill(0);
    const stack: number[] = [];
    for (let i = 0; i < temps.length; i++) {
        while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
            const idx = stack.pop()!;
            result[idx] = i - idx;
        }
        stack.push(i);
    }
    return result;
}

// Classic problems:
// - Daily temperatures
// - Next greater element I, II (circular)
// - Largest rectangle in histogram
// - Trapping rain water
// - Buildings with ocean view
// - Asteroid collision
```

---

## Pattern 10: BFS (Graph/Tree)

**Use when**: shortest path in unweighted graph, level-order traversal, "minimum steps/moves".

```ts
// BFS template
function bfs(graph: Map<string, string[]>, start: string, target: string): number {
    const queue: [string, number][] = [[start, 0]];
    const visited = new Set([start]);
    while (queue.length) {
        const [node, dist] = queue.shift()!;
        if (node === target) return dist;
        for (const neighbor of (graph.get(node) ?? [])) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([neighbor, dist + 1]);
            }
        }
    }
    return -1;
}

// Level-order tree traversal
function levelOrder(root: TreeNode | null): number[][] {
    if (!root) return [];
    const result: number[][] = [];
    const queue: TreeNode[] = [root];
    while (queue.length) {
        const level: number[] = [];
        const size = queue.length; // process this level only
        for (let i = 0; i < size; i++) {
            const node = queue.shift()!;
            level.push(node.val);
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        result.push(level);
    }
    return result;
}

// Classic problems:
// - Binary tree level order traversal
// - Word ladder (shortest transformation)
// - Rotting oranges (multi-source BFS)
// - Number of islands (also DFS)
// - Shortest path in binary matrix
// - Course schedule (topological sort with BFS — Kahn's algorithm)
```

---

## Pattern 11: DFS (Graph/Tree)

**Use when**: explore all paths, connected components, tree height/diameter, cycle detection.

```ts
// DFS template — iterative (avoids stack overflow for deep graphs)
function dfs(graph: Map<string, string[]>, start: string): Set<string> {
    const visited = new Set<string>();
    const stack = [start];
    while (stack.length) {
        const node = stack.pop()!;
        if (visited.has(node)) continue;
        visited.add(node);
        for (const neighbor of (graph.get(node) ?? [])) {
            if (!visited.has(neighbor)) stack.push(neighbor);
        }
    }
    return visited;
}

// Number of islands — DFS flood fill
function numIslands(grid: string[][]): number {
    let count = 0;
    function sink(r: number, c: number) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] !== '1') return;
        grid[r][c] = '0'; // mark visited
        sink(r+1, c); sink(r-1, c); sink(r, c+1); sink(r, c-1);
    }
    for (let r = 0; r < grid.length; r++)
        for (let c = 0; c < grid[0].length; c++)
            if (grid[r][c] === '1') { count++; sink(r, c); }
    return count;
}

// Classic problems:
// - Number of islands
// - Clone graph
// - Course schedule (cycle detection)
// - Path sum in tree
// - All paths from source to target
// - Surrounded regions
```

---

## Pattern 12: Dynamic Programming

**Use when**: optimal value, count ways, overlapping subproblems, "maximum/minimum/count" with choices.

```ts
// 1D DP — climbing stairs (Fibonacci-style)
function climbStairs(n: number): number {
    if (n <= 2) return n;
    const dp = [0, 1, 2];
    for (let i = 3; i <= n; i++) dp[i] = dp[i-1] + dp[i-2];
    return dp[n];
}

// 1D DP — coin change (minimum coins)
function coinChange(coins: number[], amount: number): number {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (let i = 1; i <= amount; i++)
        for (const coin of coins)
            if (coin <= i) dp[i] = Math.min(dp[i], dp[i - coin] + 1);
    return dp[amount] === Infinity ? -1 : dp[amount];
}

// 2D DP — longest common subsequence
function longestCommonSubsequence(text1: string, text2: string): number {
    const m = text1.length, n = text2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = text1[i-1] === text2[j-1]
                ? dp[i-1][j-1] + 1
                : Math.max(dp[i-1][j], dp[i][j-1]);
    return dp[m][n];
}

// Classic problems:
// - House robber (and II, III)
// - Coin change, coin change II
// - Longest increasing subsequence
// - Edit distance
// - Unique paths
// - 0/1 Knapsack
// - Word break
// - Partition equal subset sum
```

---

## Interview Problem-Solving Framework

```
1. UNDERSTAND (2-3 min)
   - Repeat the problem back in your own words
   - Ask about: input size, edge cases (empty, single element, duplicates, negatives)
   - Clarify: what to return? sorted input? constraints?

2. EXAMPLES (2 min)
   - Walk through 2-3 examples manually
   - Include an edge case

3. PATTERN RECOGNITION (1 min)
   - Which of the ~12 patterns does this map to?
   - State your approach before coding

4. COMPLEXITY ANALYSIS (1 min)
   - What's the brute force? O(n²)?
   - Can we do better? State target complexity upfront

5. CODE (15-20 min)
   - Think out loud — narrate what you're doing
   - Start with the structure, then fill in details
   - Don't silent-code

6. TEST (3-5 min)
   - Walk through your solution with an example
   - Check edge cases manually
   - Fix bugs calmly — don't panic

Common gotchas:
□ Off-by-one in binary search (left <= right vs left < right)
□ Integer overflow (use left + Math.floor((right - left) / 2) not (left + right) / 2)
□ Empty array / single element
□ Duplicates handling
□ Forgetting to mark visited in graph problems
□ Modifying input without asking if that's allowed
```
