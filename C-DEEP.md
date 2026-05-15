# C — Senior Developer Deep Reference

> Covers memory model, pointers, dynamic allocation, structs, preprocessor, file I/O, and systems programming patterns.

---

## Table of Contents

1. [Memory Model & Pointers](#1-memory-model--pointers)
2. [Arrays & Strings](#2-arrays--strings)
3. [Structs, Unions & Bitfields](#3-structs-unions--bitfields)
4. [Dynamic Memory Management](#4-dynamic-memory-management)
5. [Functions, Scope & Linkage](#5-functions-scope--linkage)
6. [Preprocessor & Macros](#6-preprocessor--macros)
7. [File I/O & System Calls](#7-file-io--system-calls)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Memory Model & Pointers

### Memory Layout of a C Program

```text
High address
  ┌──────────────┐
  │  Stack       │  local vars, function frames — grows downward
  │  ↓           │  automatic storage duration
  ├──────────────┤
  │  (gap)       │
  ├──────────────┤
  │  ↑           │
  │  Heap        │  malloc/calloc/realloc — grows upward
  ├──────────────┤
  │  BSS         │  uninitialized global/static vars (zero-initialized)
  ├──────────────┤
  │  Data        │  initialized global/static vars
  ├──────────────┤
  │  Text        │  compiled machine code (read-only)
Low address

‼️ Stack overflow: unbounded recursion or large local arrays
‼️ Heap fragmentation: many small malloc/free cycles
```

### Pointer Fundamentals

```c
int x = 42;
int *p = &x;       // p holds the address of x
printf("%d\n", *p); // dereference: 42
*p = 99;           // modify x through pointer
printf("%d\n", x); // 99

// ‼️ Pointer arithmetic — adds in units of the pointed-to type
int arr[5] = {10, 20, 30, 40, 50};
int *q = arr;      // arr decays to pointer to first element
printf("%d\n", *(q + 2)); // 30 — q+2 advances by 2*sizeof(int) bytes
printf("%d\n", q[2]);     // same — indexing is syntactic sugar for *(q+2)

// NULL pointer — points to nothing, dereferencing is UB
int *null_ptr = NULL;
// *null_ptr = 5; // ✗ segfault

// Void pointer — generic pointer, can point to any type
void *vp = &x;
// *vp; // ✗ can't dereference void* — must cast first
int *ip = (int *)vp;
printf("%d\n", *ip); // 42

// ‼️ const correctness
const int *ptr_to_const = &x;  // can't modify *ptr_to_const
int * const const_ptr   = &x;  // can't modify ptr_to_const itself
const int * const both  = &x;  // can't modify either
```

### Pointer to Pointer & Function Pointers

```c
// Pointer to pointer — used for dynamic 2D arrays, out-parameters
int **pp;
int a = 5;
int *pa = &a;
pp = &pa;
printf("%d\n", **pp); // 5

// Out-parameter pattern — return value via pointer
void allocate_buffer(char **out, size_t size) {
    *out = malloc(size);
}
char *buf = NULL;
allocate_buffer(&buf, 256); // caller's pointer updated
free(buf);

// Function pointers — callbacks, dispatch tables
int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }

int (*op)(int, int) = add;   // function pointer declaration
printf("%d\n", op(3, 4));    // 7
op = sub;
printf("%d\n", op(3, 4));    // -1

// Typedef for readability
typedef int (*BinaryOp)(int, int);
BinaryOp ops[] = { add, sub };  // dispatch table
printf("%d\n", ops[0](10, 3));  // 13

// qsort uses function pointer for comparator
int cmp(const void *a, const void *b) {
    return (*(int *)a - *(int *)b);
}
int nums[] = {3, 1, 4, 1, 5};
qsort(nums, 5, sizeof(int), cmp);
```

---

## 2. Arrays & Strings

### Arrays

```c
// Array decays to pointer to first element in most contexts ‼️
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;          // OK — arr decays to &arr[0]
// sizeof(arr) = 20    // works — arr is the actual array here
// sizeof(p)   = 8     // pointer size — NOT the array size ‼️

// 2D arrays — row-major storage in memory
int matrix[3][4];
// matrix[i][j] is at offset i*4 + j from the start

// Variable-length arrays (VLA) — C99, size known at runtime
// ‼️ VLAs are on the stack — large sizes cause stack overflow
void process(int n) {
    int vla[n]; // stack-allocated, size determined at runtime
}

// Array of pointers vs 2D array
char *words[] = {"hello", "world"};  // array of char pointers (strings may be different lengths)
char grid[3][4];                     // true 2D: 12 chars, contiguous
```

### Strings

```c
// C strings — null-terminated char arrays
char s1[] = "hello";        // {'h','e','l','l','o','\0'} — 6 bytes, mutable
char *s2  = "hello";        // pointer to string literal — ‼️ IMMUTABLE (UB to modify)
// s2[0] = 'H';             // ✗ undefined behavior — literal is in read-only memory

// Safe string functions (prefer these over strcpy, strcat)
#include <string.h>
char dst[64];
strncpy(dst, src, sizeof(dst) - 1); dst[sizeof(dst)-1] = '\0'; // always null-terminate ‼️
strncat(dst, src, sizeof(dst) - strlen(dst) - 1);

// ‼️ Common vulnerabilities:
// Buffer overflow: strcpy(buf, input) — no bounds check → stack smash
// Off-by-one: strncpy(buf, src, sizeof(buf)) — may not null-terminate
// Format string: printf(user_input) — ✗ user controls format → arbitrary write

// Safe alternatives: snprintf, strlcpy (BSD), strncpy with explicit terminator
snprintf(dst, sizeof(dst), "Hello, %s!", name); // always null-terminates ‼️

// strlen — count bytes until '\0', O(n)
// strcmp — returns 0 if equal, <0 or >0 if not
// strstr — find substring

// Parsing strings
char line[] = "Alice:30:NYC";
char *token = strtok(line, ":"); // ‼️ modifies the string, not thread-safe
while (token) {
    printf("%s\n", token);
    token = strtok(NULL, ":"); // continue parsing same string
}
```

---

## 3. Structs, Unions & Bitfields

### Structs & Padding

```c
// ‼️ Compiler adds padding for alignment — struct size is NOT sum of member sizes
struct Padded {
    char  a;    // 1 byte
    // 3 bytes padding (to align int to 4-byte boundary)
    int   b;    // 4 bytes
    char  c;    // 1 byte
    // 3 bytes padding (to make total multiple of 4)
};
// sizeof(struct Padded) = 12 — not 6 ‼️

// Reorder to minimize padding
struct Optimized {
    int   b;    // 4 bytes
    char  a;    // 1 byte
    char  c;    // 1 byte
    // 2 bytes padding
};
// sizeof(struct Optimized) = 8

// Pack to eliminate padding (GCC extension)
struct __attribute__((packed)) NoPad {
    char a; int b; char c;
};
// sizeof = 6 — but unaligned access may be slow or UB on some architectures ‼️

// Designated initializers (C99)
struct Point { int x; int y; };
struct Point p = { .y = 10, .x = 5 }; // order doesn't matter
```

### Unions

```c
// Union — all members share the same memory location
// size = size of largest member
union Data {
    int   i;
    float f;
    char  bytes[4];
};

union Data d;
d.i = 0x41424344;
printf("%c%c%c%c\n", d.bytes[0], d.bytes[1], d.bytes[2], d.bytes[3]);
// ‼️ Reading a member other than the last written is UB in C++ (but defined in C99+)
// Common use: type-punning, protocol serialization, tagged unions

// Tagged union — safe discriminated union pattern
struct Value {
    enum { INT, FLOAT, STRING } type;
    union {
        int   i;
        float f;
        char *s;
    } data;
};

// Bitfields — pack flags into bits
struct Flags {
    unsigned int read    : 1; // 1 bit
    unsigned int write   : 1;
    unsigned int execute : 1;
    unsigned int padding : 29; // remaining bits
};
struct Flags perms = { .read = 1, .write = 1, .execute = 0 };
// ‼️ Bit layout is implementation-defined — don't use for serialization/network protocols
```

---

## 4. Dynamic Memory Management

### malloc, calloc, realloc, free

```c
#include <stdlib.h>

// malloc — allocate uninitialized memory
int *arr = malloc(10 * sizeof(int));
if (!arr) { perror("malloc"); exit(EXIT_FAILURE); } // ‼️ always check NULL

// calloc — allocate zero-initialized memory
int *zeroed = calloc(10, sizeof(int)); // 10 ints, all zero

// realloc — resize allocation
arr = realloc(arr, 20 * sizeof(int));
// ‼️ realloc may return NULL while old block still valid — use temp variable
int *tmp = realloc(arr, 20 * sizeof(int));
if (!tmp) { free(arr); exit(EXIT_FAILURE); } // don't leak original block ‼️
arr = tmp;

// free — release memory
free(arr);
arr = NULL; // ‼️ set to NULL to prevent double-free and use-after-free

// ‼️ Common bugs:
// Memory leak:    malloc without free
// Double free:    free same pointer twice → heap corruption → crash/exploit
// Use-after-free: dereference after free → UB, security vulnerability
// Buffer overflow: write past allocated end → heap corruption
```

### Dynamic Data Structures

```c
// Linked list node
typedef struct Node {
    int         data;
    struct Node *next; // ‼️ self-referential struct — must use struct tag before typedef complete
} Node;

Node *push(Node *head, int val) {
    Node *n = malloc(sizeof(Node));
    if (!n) return head;
    n->data = val;
    n->next = head;
    return n; // new head
}

void free_list(Node *head) {
    while (head) {
        Node *next = head->next;
        free(head);        // ‼️ save next BEFORE freeing current
        head = next;
    }
}

// Dynamic array (vector pattern)
typedef struct {
    int    *data;
    size_t  size;
    size_t  capacity;
} Vector;

void vec_push(Vector *v, int val) {
    if (v->size == v->capacity) {
        size_t new_cap = v->capacity ? v->capacity * 2 : 4;
        int *tmp = realloc(v->data, new_cap * sizeof(int));
        if (!tmp) return;
        v->data     = tmp;
        v->capacity = new_cap;
    }
    v->data[v->size++] = val;
}
```

---

## 5. Functions, Scope & Linkage

### Storage Classes & Linkage

```c
// auto (default for locals) — stack, automatic lifetime
// static (local) — persists across calls, initialized once ‼️
void counter(void) {
    static int count = 0; // initialized once, retained between calls
    printf("%d\n", ++count);
}
counter(); // 1
counter(); // 2

// static (global/function) — internal linkage — NOT visible outside translation unit ‼️
static int module_state = 0; // private to this .c file
static void helper(void) { } // private helper function

// extern — reference variable/function defined in another translation unit
extern int shared_counter; // declared here, defined in another .c file

// register — hint to compiler to use register (mostly ignored by modern compilers)

// ‼️ Linkage summary:
//   Global, no static → external linkage (visible across files)
//   Global, static    → internal linkage (private to .c file)
//   Local             → no linkage (local to block)
```

### Variadic Functions

```c
#include <stdarg.h>

int sum(int count, ...) {
    va_list args;
    va_start(args, count);  // initialize list after last named param
    int total = 0;
    for (int i = 0; i < count; i++) {
        total += va_arg(args, int); // retrieve next argument as int
    }
    va_end(args);           // ‼️ always call va_end
    return total;
}

sum(3, 10, 20, 30); // 60

// ‼️ No type safety — caller must pass correct types and count
// printf/scanf are variadic — format string encodes type info
```

---

## 6. Preprocessor & Macros

```c
// Object-like macros — text substitution
#define PI 3.14159265358979
#define MAX_SIZE 1024

// Function-like macros — ‼️ use parentheses around every parameter and the whole expression
#define MAX(a, b) ((a) > (b) ? (a) : (b))
// ✗ #define MAX(a, b) a > b ? a : b  — operator precedence bugs

// ‼️ Macro pitfalls
#define SQUARE(x) (x) * (x)
SQUARE(1 + 2); // (1+2)*(1+2) = 9 ✓
// ✗ #define SQUARE(x) x * x
// SQUARE(1+2) → 1+2*1+2 = 5 — wrong!

// ‼️ Side effects in macros — double evaluation
#define MAX(a, b) ((a) > (b) ? (a) : (b))
MAX(i++, j++); // i++ evaluated twice if i > j! ✗ — use inline function instead

// Prefer inline functions for type safety
static inline int max_int(int a, int b) { return a > b ? a : b; }

// Conditional compilation
#ifdef DEBUG
    #define LOG(fmt, ...) fprintf(stderr, "[DEBUG] " fmt "\n", ##__VA_ARGS__)
#else
    #define LOG(fmt, ...) ((void)0) // no-op
#endif

// Include guards — prevent double inclusion ‼️
#ifndef MY_HEADER_H
#define MY_HEADER_H
// ... header contents ...
#endif

// OR (non-standard but widely supported)
#pragma once

// Stringification and token pasting
#define STRINGIFY(x) #x
#define CONCAT(a, b) a##b

STRINGIFY(hello);  // "hello"
CONCAT(var, 123);  // var123 — creates identifier
```

---

## 7. File I/O & System Calls

### Standard I/O (stdio.h)

```c
#include <stdio.h>

// Open / close
FILE *f = fopen("data.txt", "r"); // modes: r, w, a, r+, w+, b (binary)
if (!f) { perror("fopen"); exit(EXIT_FAILURE); }
// ‼️ Always check fopen return value

// Reading
char line[256];
while (fgets(line, sizeof(line), f)) {
    // fgets includes '\n' — strip it:
    line[strcspn(line, "\n")] = '\0';
    printf("%s\n", line);
}

// Formatted read/write
int n;
fscanf(f, "%d", &n);
fprintf(f, "Value: %d\n", n);

// Binary I/O
size_t items_read = fread(buf, sizeof(Record), count, f);
fwrite(buf, sizeof(Record), count, f);

// Seek & Tell
fseek(f, 0, SEEK_END);      // seek to end
long size = ftell(f);        // current position = file size
fseek(f, 0, SEEK_SET);      // back to start
rewind(f);                   // same as fseek(f, 0, SEEK_SET)

fclose(f); // ‼️ always close — flushes buffers

// Error handling
if (ferror(f)) { perror("read error"); }
if (feof(f))   { printf("end of file\n"); }
```

### POSIX System Calls (Linux/Unix)

```c
#include <fcntl.h>
#include <unistd.h>

// Lower-level, no buffering — used in systems programming
int fd = open("data.txt", O_RDONLY);    // returns file descriptor
// O_WRONLY | O_CREAT | O_TRUNC, 0644  — create/truncate with permissions

ssize_t n = read(fd, buf, sizeof(buf)); // returns bytes read, 0=EOF, -1=error
write(fd, buf, n);
lseek(fd, offset, SEEK_SET);
close(fd);

// ‼️ Difference: FILE* (stdio) — buffered, portable
//               fd (POSIX)   — unbuffered, lower-level, needed for select/poll/epoll
```

---

## 8. Common Interview Questions

```text
Q: What is the difference between a pointer and an array?
A: Array — fixed-size, name decays to pointer in most contexts but is NOT a pointer.
   sizeof(arr) gives total array size; sizeof(ptr) gives pointer size (4 or 8 bytes).
   You can't assign to an array name: arr = other; // ✗ compile error.
   Pointer — variable holding an address, can be reassigned, can be NULL.

Q: What is undefined behavior in C?
A: Behavior not defined by the C standard — the compiler may assume it never happens
   and optimize accordingly. Common UB: signed integer overflow, null/dangling pointer
   deref, out-of-bounds access, data race, using uninitialized variable.
   ‼️ UB can manifest as: crash, silent wrong answer, security exploit, or "works by accident."

Q: What is the difference between malloc and calloc?
A: malloc(n) — allocates n bytes, uninitialized (garbage data).
   calloc(count, size) — allocates count*size bytes, zero-initialized.
   ‼️ Prefer calloc when zero-init is needed — avoids reading uninitialized memory.

Q: What is a dangling pointer?
A: Pointer that references memory that has been freed or gone out of scope.
   Dereferencing it is UB — may crash, corrupt data, or be exploited.
   Prevention: set to NULL after free, avoid returning address of local variables.

Q: Explain the difference between stack and heap allocation.
A: Stack — automatic, fast (just move SP), limited size (~1-8MB), freed automatically on scope exit.
   Heap — manual (malloc/free), large, fragmentation risk, programmer responsible for lifetime.
   Use stack for: small, short-lived objects. Heap for: large or variable-size, dynamic lifetime.

Q: What does static mean in C?
A: On a local variable: retains value across calls, initialized once.
   On a global/function: internal linkage — not visible outside the translation unit (file-private).
   ‼️ Different from C++ where static on a member means class-level.

Q: What is the difference between struct passing by value vs pointer?
A: By value: entire struct is copied on function call — expensive for large structs.
   By pointer: only the address is copied — efficient, but caller's struct may be modified.
   ‼️ Use const struct * to pass read-only efficiently: void draw(const struct Point *p);
```
