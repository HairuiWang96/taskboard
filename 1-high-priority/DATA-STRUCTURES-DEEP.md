# Data Structures — Senior Deep Reference (Implement from Scratch)

All implementations in TypeScript. Each includes time/space complexity.

---

## Complexity Cheat Sheet

| Structure | Access | Search | Insert | Delete | Space |
|---|---|---|---|---|---|
| Array | O(1) | O(n) | O(n) | O(n) | O(n) |
| Singly Linked List | O(n) | O(n) | O(1) head | O(1) head | O(n) |
| Doubly Linked List | O(n) | O(n) | O(1) head/tail | O(1) with ref | O(n) |
| Stack | O(1) top | O(n) | O(1) | O(1) | O(n) |
| Queue | O(1) front | O(n) | O(1) | O(1) | O(n) |
| Hash Map | O(1) avg | O(1) avg | O(1) avg | O(1) avg | O(n) |
| BST (balanced) | O(log n) | O(log n) | O(log n) | O(log n) | O(n) |
| Heap | O(1) min/max | O(n) | O(log n) | O(log n) | O(n) |
| Trie | — | O(m) | O(m) | O(m) | O(n·m) |
| Graph BFS/DFS | — | O(V+E) | O(1) | O(V+E) | O(V+E) |

m = key length, V = vertices, E = edges

---

## 1. Singly Linked List

```ts
class ListNode<T> {
  constructor(public val: T, public next: ListNode<T> | null = null) {}
}

class LinkedList<T> {
  private head: ListNode<T> | null = null
  private size = 0

  // O(1)
  prepend(val: T): void {
    this.head = new ListNode(val, this.head)
    this.size++
  }

  // O(n)
  append(val: T): void {
    const node = new ListNode(val)
    if (!this.head) { this.head = node; this.size++; return }
    let cur = this.head
    while (cur.next) cur = cur.next
    cur.next = node
    this.size++
  }

  // O(n)
  delete(val: T): boolean {
    if (!this.head) return false
    if (this.head.val === val) { this.head = this.head.next; this.size--; return true }
    let cur = this.head
    while (cur.next) {
      if (cur.next.val === val) { cur.next = cur.next.next; this.size--; return true }
      cur = cur.next
    }
    return false
  }

  // O(n) — reverse in-place
  reverse(): void {
    let prev: ListNode<T> | null = null
    let cur = this.head
    while (cur) {
      const next = cur.next
      cur.next = prev
      prev = cur
      cur = next
    }
    this.head = prev
  }

  // O(n) — Floyd's cycle detection
  hasCycle(): boolean {
    let slow = this.head
    let fast = this.head
    while (fast && fast.next) {
      slow = slow!.next
      fast = fast.next.next
      if (slow === fast) return true
    }
    return false
  }

  toArray(): T[] {
    const result: T[] = []
    let cur = this.head
    while (cur) { result.push(cur.val); cur = cur.next }
    return result
  }
}
```

---

## 2. Doubly Linked List

```ts
class DNode<T> {
  constructor(
    public val: T,
    public prev: DNode<T> | null = null,
    public next: DNode<T> | null = null,
  ) {}
}

class DoublyLinkedList<T> {
  private head: DNode<T> | null = null
  private tail: DNode<T> | null = null
  private size = 0

  // O(1)
  prepend(val: T): void {
    const node = new DNode(val, null, this.head)
    if (this.head) this.head.prev = node
    this.head = node
    if (!this.tail) this.tail = node
    this.size++
  }

  // O(1)
  append(val: T): void {
    const node = new DNode(val, this.tail, null)
    if (this.tail) this.tail.next = node
    this.tail = node
    if (!this.head) this.head = node
    this.size++
  }

  // O(1) given the node reference (used in LRU cache)
  deleteNode(node: DNode<T>): void {
    if (node.prev) node.prev.next = node.next
    else this.head = node.next
    if (node.next) node.next.prev = node.prev
    else this.tail = node.prev
    this.size--
  }
}
```

**Classic use case — LRU Cache (DLL + HashMap)**

```ts
class LRUCache {
  private capacity: number
  private map: Map<number, DNode<{ key: number; val: number }>>
  private list: DoublyLinkedList<{ key: number; val: number }>

  constructor(capacity: number) {
    this.capacity = capacity
    this.map = new Map()
    this.list = new DoublyLinkedList()
  }

  get(key: number): number {
    const node = this.map.get(key)
    if (!node) return -1
    this.list.deleteNode(node)
    this.list.prepend(node.val)  // move to front = most recent
    this.map.set(key, this.list.head!)
    return node.val.val
  }

  put(key: number, val: number): void {
    if (this.map.has(key)) this.list.deleteNode(this.map.get(key)!)
    else if (this.map.size === this.capacity) {
      // evict LRU (tail)
      const lru = this.list.tail!
      this.list.deleteNode(lru)
      this.map.delete(lru.val.key)
    }
    this.list.prepend({ key, val })
    this.map.set(key, this.list.head!)
  }
}
```

---

## 3. Stack

```ts
// Backed by array — O(1) push/pop
class Stack<T> {
  private items: T[] = []

  push(val: T): void { this.items.push(val) }
  pop(): T | undefined { return this.items.pop() }
  peek(): T | undefined { return this.items[this.items.length - 1] }
  isEmpty(): boolean { return this.items.length === 0 }
  size(): number { return this.items.length }
}

// Classic problems using stack:
// - Balanced parentheses: push open, pop+match on close
// - Monotonic stack: next greater element, largest rectangle in histogram
// - Undo/redo
```

---

## 4. Queue

```ts
// Naive array queue has O(n) dequeue (shift). Use linked list for O(1).
class Queue<T> {
  private head: ListNode<T> | null = null
  private tail: ListNode<T> | null = null
  private _size = 0

  enqueue(val: T): void {
    const node = new ListNode(val)
    if (this.tail) this.tail.next = node
    this.tail = node
    if (!this.head) this.head = node
    this._size++
  }

  dequeue(): T | undefined {
    if (!this.head) return undefined
    const val = this.head.val
    this.head = this.head.next
    if (!this.head) this.tail = null
    this._size--
    return val
  }

  peek(): T | undefined { return this.head?.val }
  isEmpty(): boolean { return this._size === 0 }
  size(): number { return this._size }
}

// Deque (double-ended queue) — use DoublyLinkedList above
// Priority Queue — use Heap below
```

---

## 5. Binary Tree & BST

```ts
class TreeNode<T> {
  constructor(
    public val: T,
    public left: TreeNode<T> | null = null,
    public right: TreeNode<T> | null = null,
  ) {}
}

// ── Traversals ──────────────────────────────────────────

// Inorder: Left → Root → Right (BST gives sorted order)
function inorder<T>(root: TreeNode<T> | null): T[] {
  const result: T[] = []
  function dfs(node: TreeNode<T> | null) {
    if (!node) return
    dfs(node.left)
    result.push(node.val)
    dfs(node.right)
  }
  dfs(root)
  return result
}

// Iterative inorder (common interview follow-up)
function inorderIterative<T>(root: TreeNode<T> | null): T[] {
  const result: T[] = []
  const stack: TreeNode<T>[] = []
  let cur: TreeNode<T> | null = root
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left }
    cur = stack.pop()!
    result.push(cur.val)
    cur = cur.right
  }
  return result
}

// Level-order (BFS)
function levelOrder<T>(root: TreeNode<T> | null): T[][] {
  if (!root) return []
  const result: T[][] = []
  const queue: TreeNode<T>[] = [root]
  while (queue.length) {
    const level: T[] = []
    const size = queue.length               // snapshot current level size
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!
      level.push(node.val)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
    result.push(level)
  }
  return result
}
```

### BST Operations

```ts
class BST {
  root: TreeNode<number> | null = null

  // O(log n) average, O(n) worst (unbalanced)
  insert(val: number): void {
    const node = new TreeNode(val)
    if (!this.root) { this.root = node; return }
    let cur = this.root
    while (true) {
      if (val < cur.val) {
        if (!cur.left) { cur.left = node; return }
        cur = cur.left
      } else {
        if (!cur.right) { cur.right = node; return }
        cur = cur.right
      }
    }
  }

  // O(log n) average
  search(val: number): TreeNode<number> | null {
    let cur = this.root
    while (cur) {
      if (val === cur.val) return cur
      cur = val < cur.val ? cur.left : cur.right
    }
    return null
  }

  // Delete: 3 cases
  // 1. Leaf — just remove
  // 2. One child — replace with child
  // 3. Two children — replace val with inorder successor (smallest in right subtree), delete successor
  delete(val: number): void {
    this.root = this._delete(this.root, val)
  }
  private _delete(node: TreeNode<number> | null, val: number): TreeNode<number> | null {
    if (!node) return null
    if (val < node.val) { node.left = this._delete(node.left, val) }
    else if (val > node.val) { node.right = this._delete(node.right, val) }
    else {
      if (!node.left) return node.right
      if (!node.right) return node.left
      // Find inorder successor
      let successor = node.right
      while (successor.left) successor = successor.left
      node.val = successor.val
      node.right = this._delete(node.right, successor.val)
    }
    return node
  }

  // Check if valid BST — O(n)
  isValid(): boolean {
    function check(node: TreeNode<number> | null, min: number, max: number): boolean {
      if (!node) return true
      if (node.val <= min || node.val >= max) return false
      return check(node.left, min, node.val) && check(node.right, node.val, max)
    }
    return check(this.root, -Infinity, Infinity)
  }
}
```

---

## 6. Min-Heap (Priority Queue)

Heap property: parent ≤ children (min-heap). Stored as array: parent at i, children at 2i+1 and 2i+2.

```ts
class MinHeap {
  private heap: number[] = []

  private parent(i: number) { return Math.floor((i - 1) / 2) }
  private left(i: number) { return 2 * i + 1 }
  private right(i: number) { return 2 * i + 2 }
  private swap(i: number, j: number) {
    ;[this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]]
  }

  // O(log n)
  insert(val: number): void {
    this.heap.push(val)
    this.bubbleUp(this.heap.length - 1)
  }

  private bubbleUp(i: number): void {
    while (i > 0 && this.heap[this.parent(i)] > this.heap[i]) {
      this.swap(i, this.parent(i))
      i = this.parent(i)
    }
  }

  // O(1)
  peek(): number | undefined { return this.heap[0] }

  // O(log n)
  extractMin(): number | undefined {
    if (!this.heap.length) return undefined
    const min = this.heap[0]
    const last = this.heap.pop()!
    if (this.heap.length) {
      this.heap[0] = last
      this.siftDown(0)
    }
    return min
  }

  private siftDown(i: number): void {
    const n = this.heap.length
    while (true) {
      let smallest = i
      const l = this.left(i)
      const r = this.right(i)
      if (l < n && this.heap[l] < this.heap[smallest]) smallest = l
      if (r < n && this.heap[r] < this.heap[smallest]) smallest = r
      if (smallest === i) break
      this.swap(i, smallest)
      i = smallest
    }
  }

  // Build heap from array — O(n) (not O(n log n)!)
  static buildHeap(arr: number[]): MinHeap {
    const h = new MinHeap()
    h.heap = [...arr]
    // Start from last non-leaf node and sift down
    for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
      h.siftDown(i)
    }
    return h
  }

  size(): number { return this.heap.length }
}

// Max-heap: flip comparisons (< to >)
// Generic heap with comparator:
class Heap<T> {
  private heap: T[] = []
  constructor(private compare: (a: T, b: T) => number) {}
  // same structure, use compare(a, b) < 0 instead of a < b
}

// Use cases:
// - K largest elements: min-heap of size k
// - Merge k sorted lists: min-heap of (val, listIndex, nodeIndex)
// - Dijkstra's shortest path: min-heap of (distance, vertex)
// - Top k frequent: bucket sort or min-heap
```

---

## 7. Hash Map

```ts
// Simple separate-chaining hash map
class HashMap<K, V> {
  private buckets: Array<Array<[K, V]>>
  private _size = 0
  private readonly LOAD_FACTOR = 0.75

  constructor(private capacity = 16) {
    this.buckets = Array.from({ length: capacity }, () => [])
  }

  private hash(key: K): number {
    const str = String(key)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % this.capacity
    }
    return hash
  }

  set(key: K, val: V): void {
    const idx = this.hash(key)
    const bucket = this.buckets[idx]
    const existing = bucket.find(([k]) => k === key)
    if (existing) { existing[1] = val; return }
    bucket.push([key, val])
    this._size++
    if (this._size / this.capacity > this.LOAD_FACTOR) this.resize()
  }

  get(key: K): V | undefined {
    const bucket = this.buckets[this.hash(key)]
    return bucket.find(([k]) => k === key)?.[1]
  }

  delete(key: K): boolean {
    const bucket = this.buckets[this.hash(key)]
    const idx = bucket.findIndex(([k]) => k === key)
    if (idx === -1) return false
    bucket.splice(idx, 1)
    this._size--
    return true
  }

  private resize(): void {
    const old = this.buckets
    this.capacity *= 2
    this.buckets = Array.from({ length: this.capacity }, () => [])
    this._size = 0
    for (const bucket of old) for (const [k, v] of bucket) this.set(k, v)
  }
}

// Collision resolution strategies:
// 1. Separate chaining (above) — each bucket is a list
// 2. Open addressing / linear probing — probe next slot on collision
// 3. Double hashing — second hash function for probe step
```

---

## 8. Trie

```ts
class TrieNode {
  children: Map<string, TrieNode> = new Map()
  isEnd = false
  // Optional: count (words through this node), value (for autocomplete rankings)
}

class Trie {
  private root = new TrieNode()

  // O(m) where m = word length
  insert(word: string): void {
    let cur = this.root
    for (const ch of word) {
      if (!cur.children.has(ch)) cur.children.set(ch, new TrieNode())
      cur = cur.children.get(ch)!
    }
    cur.isEnd = true
  }

  // O(m)
  search(word: string): boolean {
    let cur = this.root
    for (const ch of word) {
      if (!cur.children.has(ch)) return false
      cur = cur.children.get(ch)!
    }
    return cur.isEnd
  }

  // O(m)
  startsWith(prefix: string): boolean {
    let cur = this.root
    for (const ch of prefix) {
      if (!cur.children.has(ch)) return false
      cur = cur.children.get(ch)!
    }
    return true
  }

  // Autocomplete — O(m + k) where k = matching words
  suggest(prefix: string): string[] {
    let cur = this.root
    for (const ch of prefix) {
      if (!cur.children.has(ch)) return []
      cur = cur.children.get(ch)!
    }
    const results: string[] = []
    this.dfs(cur, prefix, results)
    return results
  }

  private dfs(node: TrieNode, current: string, results: string[]): void {
    if (node.isEnd) results.push(current)
    for (const [ch, child] of node.children) {
      this.dfs(child, current + ch, results)
    }
  }

  // Delete — O(m)
  delete(word: string): void {
    this._delete(this.root, word, 0)
  }
  private _delete(node: TrieNode, word: string, depth: number): boolean {
    if (depth === word.length) {
      node.isEnd = false
      return node.children.size === 0  // can delete this node
    }
    const ch = word[depth]
    const child = node.children.get(ch)
    if (!child) return false
    const shouldDelete = this._delete(child, word, depth + 1)
    if (shouldDelete) node.children.delete(ch)
    return !node.isEnd && node.children.size === 0
  }
}

// Space: O(n * m * 26) worst case (n words, m avg length)
// Real world: compress with Patricia/Radix trie
```

---

## 9. Graph + BFS + DFS

```ts
// Adjacency list representation
class Graph {
  private adj: Map<number, number[]> = new Map()

  addVertex(v: number): void {
    if (!this.adj.has(v)) this.adj.set(v, [])
  }

  addEdge(u: number, v: number, directed = false): void {
    this.addVertex(u); this.addVertex(v)
    this.adj.get(u)!.push(v)
    if (!directed) this.adj.get(v)!.push(u)
  }

  // BFS — O(V + E)
  // Use: shortest path in unweighted graph, level-order, flood fill
  bfs(start: number): number[] {
    const visited = new Set<number>()
    const queue = [start]
    const result: number[] = []
    visited.add(start)
    while (queue.length) {
      const v = queue.shift()!
      result.push(v)
      for (const neighbor of this.adj.get(v) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }
    return result
  }

  // DFS — O(V + E)
  // Use: cycle detection, topological sort, connected components, path finding
  dfs(start: number): number[] {
    const visited = new Set<number>()
    const result: number[] = []
    const stack = [start]
    while (stack.length) {
      const v = stack.pop()!
      if (visited.has(v)) continue
      visited.add(v)
      result.push(v)
      for (const neighbor of this.adj.get(v) ?? []) {
        if (!visited.has(neighbor)) stack.push(neighbor)
      }
    }
    return result
  }

  // Recursive DFS
  dfsRecursive(start: number, visited = new Set<number>(), result: number[] = []): number[] {
    visited.add(start)
    result.push(start)
    for (const neighbor of this.adj.get(start) ?? []) {
      if (!visited.has(neighbor)) this.dfsRecursive(neighbor, visited, result)
    }
    return result
  }

  // Topological sort (Kahn's algorithm — BFS based) — O(V + E)
  // Only for DAGs. Use: build order, course schedule, dependency resolution
  topologicalSort(): number[] | null {
    const inDegree = new Map<number, number>()
    for (const [v] of this.adj) inDegree.set(v, 0)
    for (const [v, neighbors] of this.adj)
      for (const u of neighbors)
        inDegree.set(u, (inDegree.get(u) ?? 0) + 1)

    const queue = [...inDegree.entries()].filter(([, d]) => d === 0).map(([v]) => v)
    const result: number[] = []
    while (queue.length) {
      const v = queue.shift()!
      result.push(v)
      for (const neighbor of this.adj.get(v) ?? []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1)
        if (inDegree.get(neighbor) === 0) queue.push(neighbor)
      }
    }
    return result.length === this.adj.size ? result : null  // null = cycle detected
  }

  // Dijkstra's shortest path — O((V + E) log V) with min-heap
  dijkstra(src: number): Map<number, number> {
    const dist = new Map<number, number>()
    for (const [v] of this.adj) dist.set(v, Infinity)
    dist.set(src, 0)

    // [distance, vertex]
    const heap = new MinHeap()
    heap.insert(0)  // simplified — real: store pairs
    const pq: [number, number][] = [[0, src]]

    // Using sorted array as poor-man's priority queue for clarity:
    const visited = new Set<number>()
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0])
      const [d, v] = pq.shift()!
      if (visited.has(v)) continue
      visited.add(v)
      // neighbors with weights (this graph is unweighted; add weight to addEdge for real use)
      for (const neighbor of this.adj.get(v) ?? []) {
        const newDist = d + 1  // replace 1 with edge weight
        if (newDist < dist.get(neighbor)!) {
          dist.set(neighbor, newDist)
          pq.push([newDist, neighbor])
        }
      }
    }
    return dist
  }

  // Detect cycle (directed graph) — DFS with recursion stack
  hasCycle(): boolean {
    const visited = new Set<number>()
    const recStack = new Set<number>()
    const dfs = (v: number): boolean => {
      visited.add(v); recStack.add(v)
      for (const neighbor of this.adj.get(v) ?? []) {
        if (!visited.has(neighbor) && dfs(neighbor)) return true
        if (recStack.has(neighbor)) return true
      }
      recStack.delete(v)
      return false
    }
    for (const [v] of this.adj) if (!visited.has(v) && dfs(v)) return true
    return false
  }
}
```

### Union-Find (Disjoint Set)

```ts
// O(α(n)) ≈ O(1) amortised for find/union with path compression + rank
class UnionFind {
  private parent: number[]
  private rank: number[]

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)  // self-parent
    this.rank = new Array(n).fill(0)
  }

  find(x: number): number {
    if (this.parent[x] !== x)
      this.parent[x] = this.find(this.parent[x])  // path compression
    return this.parent[x]
  }

  union(x: number, y: number): boolean {
    const px = this.find(x)
    const py = this.find(y)
    if (px === py) return false  // already connected
    if (this.rank[px] < this.rank[py]) this.parent[px] = py
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px
    else { this.parent[py] = px; this.rank[px]++ }
    return true
  }

  connected(x: number, y: number): boolean { return this.find(x) === this.find(y) }
}

// Use cases: Kruskal's MST, number of islands, accounts merge
```

---

## Interview Pattern Map

```
Sliding window         → array/string subarray/substring problems
Two pointers           → sorted arrays, palindrome, container with most water
Fast/slow pointers     → linked list cycle, middle of list
Merge intervals        → overlapping intervals, meeting rooms
BFS                    → shortest path, word ladder, rotten oranges
DFS + backtracking     → permutations, subsets, N-queens, word search
Dynamic programming    → optimal substructure, overlapping subproblems
Monotonic stack        → next greater/smaller element, histogram
Heap/priority queue    → K-th largest, merge K sorted, task scheduler
Trie                   → prefix search, word dictionary, IP routing
Union-Find             → connected components, number of islands, redundant connection
Topological sort       → course schedule, build order, alien dictionary
```
