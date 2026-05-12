# Go (Golang) — Senior Developer Deep Reference
**Priority: LOW**

> Covers: Go syntax, types, goroutines, channels, interfaces, error handling, HTTP servers, and interview questions. Mental model built for developers coming from JavaScript/TypeScript.

---

## Table of Contents

1. [Go vs JavaScript — Mental Model](#1-go-vs-javascript--mental-model)
2. [Types, Variables & Control Flow](#2-types-variables--control-flow)
3. [Functions & Methods](#3-functions--methods)
4. [Structs & Interfaces](#4-structs--interfaces)
5. [Error Handling](#5-error-handling)
6. [Goroutines & Channels](#6-goroutines--channels)
7. [Packages & Modules](#7-packages--modules)
8. [HTTP Servers](#8-http-servers)
9. [Testing](#9-testing)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. Go vs JavaScript — Mental Model

```text
Concept             JavaScript              Go
──────────────────────────────────────────────────────────
Typing              Dynamic (TS = static)   Statically typed, compiled
Null                null/undefined          nil
Variable            let/const               var / :=
String template     `Hello ${name}`         fmt.Sprintf("Hello %s", name)
Array               []                      []int{} (typed, fixed size)
Dynamic array       Array push/pop          slice — append(slice, item)
Map/Object          {}                      map[string]int{}
Function            (x) => x * 2           func(x int) int { return x * 2 }
Multiple returns    [a, b] destructuring    func() (int, error)  — first class
Error handling      try/catch               if err != nil { return err }
Classes             class Foo               struct + methods + interfaces
Async               async/await, Promise    goroutine + channel (or sync primitives)
Concurrency         single-threaded (+workers) true parallelism (goroutines on threads)
Package manager     npm                     go mod (built in)
Build               bundled                 compiled to single binary
Null safety         optional chaining       all pointers can be nil — check explicitly
Generics            TypeScript generics     Go 1.18+ generics
```

### Why Go exists / why people choose it

```text
Go was designed at Google for large-scale server software.
Design goals: simple syntax, fast compilation, excellent concurrency, single binary output.

Where Go shines:
  - High-performance APIs and microservices (Docker, Kubernetes, Prometheus are all Go)
  - CLI tools (single binary, no runtime needed)
  - Network services — excellent concurrency model
  - Cloud infrastructure tooling

Where Go is not ideal:
  - Heavy computation (Python + NumPy beats it for ML)
  - GUIs
  - Rapid prototyping (Go is verbose compared to Python)
```

---

## 2. Types, Variables & Control Flow

### Variables

```go
// Declare and assign separately
var name string
name = "Alice"

// Declare with value (type inferred)
var age int = 30
var isActive = true  // type inferred as bool

// Short variable declaration (most common inside functions)
name := "Alice"     // := means "declare and assign"
age  := 30
x, y := 10, 20      // multiple assignment

// Constants
const Pi = 3.14159
const (
    StatusOpen      = "open"
    StatusCompleted = "completed"
)

// Zero values (Go initializes all variables to zero value — no undefined)
var i int     // 0
var f float64 // 0.0
var s string  // ""
var b bool    // false
var p *int    // nil
```

### Basic types

```go
// Integer types
int, int8, int16, int32, int64
uint, uint8, uint16, uint32, uint64
byte   // alias for uint8
rune   // alias for int32 (Unicode code point)

// Float
float32, float64

// String — immutable, UTF-8 encoded
s := "Hello, 世界"
len(s)               // bytes, not characters
[]rune(s)            // convert to rune slice for character operations
fmt.Println(s[0])    // 72 (byte value) — not character
s[0:5]               // "Hello" (byte slice)

// Multiline
s := `This is a
raw string literal
no escape sequences needed`

// String formatting
fmt.Sprintf("Name: %s, Age: %d, Float: %.2f", name, age, price)
// %s=string, %d=int, %f=float, %v=any, %+v=struct with field names, %T=type, %p=pointer

// Type conversion (explicit — no implicit coercion)
var i int = 42
var f float64 = float64(i)   // explicit cast
var u uint = uint(f)

// Arrays (fixed size — rarely used directly)
var arr [5]int             // [0, 0, 0, 0, 0]
arr2 := [3]string{"a", "b", "c"}

// Slices (dynamic — use these)
s := []int{1, 2, 3, 4, 5}
s = append(s, 6)           // add element — may reallocate
s[1:3]                     // [2, 3] — slice of slice (shares memory!)
s[1:3:4]                   // full slice expression — cap=4-1=3
make([]int, 5, 10)         // len=5, cap=10

// Maps
m := map[string]int{"alice": 30, "bob": 25}
m["charlie"] = 35          // add or update
delete(m, "alice")         // delete
val, ok := m["alice"]      // ok = false if key doesn't exist — always check!
// if ok { use val }

// make for maps (preferred)
m := make(map[string]int)
```

### Control flow

```go
// if — no parentheses, braces required
if age > 18 {
    fmt.Println("adult")
} else if age > 13 {
    fmt.Println("teen")
} else {
    fmt.Println("child")
}

// if with initialization statement
if user, err := getUser(id); err != nil {
    return err
} else {
    fmt.Println(user.Name)  // user is scoped to the if block
}

// for — the ONLY loop in Go (replaces while, do-while, for)
for i := 0; i < 10; i++ { }          // classic for
for i < 10 { i++ }                    // while equivalent
for { break }                          // infinite loop (use break to exit)
for i, v := range slice { }           // range over slice
for k, v := range m { }               // range over map (random order)
for i := range slice { }              // index only
for _, v := range slice { }           // value only (discard index with _)

// switch — no fallthrough by default (unlike C/JS)
switch status {
case "open":
    handleOpen()
case "closed", "cancelled":           // multiple values per case
    handleDone()
default:
    handleUnknown()
}

// switch with no expression (replaces if-else chain)
switch {
case age < 13:
    fmt.Println("child")
case age < 18:
    fmt.Println("teen")
default:
    fmt.Println("adult")
}
```

---

## 3. Functions & Methods

```go
// Basic function
func add(a, b int) int {
    return a + b
}

// Multiple return values — idiomatic Go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

result, err := divide(10, 3)
if err != nil {
    log.Fatal(err)
}

// Named return values (use sparingly — can reduce clarity)
func minMax(nums []int) (min, max int) {
    min, max = nums[0], nums[0]
    for _, n := range nums[1:] {
        if n < min { min = n }
        if n > max { max = n }
    }
    return  // "naked return" — returns named values
}

// Variadic functions
func sum(nums ...int) int {
    total := 0
    for _, n := range nums { total += n }
    return total
}
sum(1, 2, 3)              // 6
sum([]int{1, 2, 3}...)   // unpack slice

// First-class functions
apply := func(f func(int) int, x int) int {
    return f(x)
}
apply(func(x int) int { return x * 2 }, 5)  // 10

// Closure
func makeCounter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}
counter := makeCounter()
counter()  // 1
counter()  // 2

// defer — runs when the surrounding function returns (LIFO order)
func readFile(name string) error {
    f, err := os.Open(name)
    if err != nil { return err }
    defer f.Close()  // guaranteed to run when readFile returns
    // ... read file
    return nil
}
```

---

## 4. Structs & Interfaces

### Structs

```go
// Struct definition
type User struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
    internal  string    // unexported (lowercase) — package-private
}

// Creating structs
u := User{ID: "1", Name: "Alice", Email: "alice@example.com"}
u := User{"1", "Alice", "alice@example.com", time.Now(), ""}  // positional (fragile — avoid)

// Methods — functions with a receiver
func (u User) Greet() string {           // value receiver (copy)
    return "Hello, " + u.Name
}

func (u *User) UpdateEmail(email string) { // pointer receiver (modify the original)
    u.Email = email
}

u.Greet()
u.UpdateEmail("new@example.com")  // Go automatically takes the address

// Constructor function (convention — no built-in constructors)
func NewUser(name, email string) (*User, error) {
    if name == "" {
        return nil, errors.New("name is required")
    }
    return &User{
        ID:        uuid.New().String(),
        Name:      name,
        Email:     email,
        CreatedAt: time.Now(),
    }, nil
}

// Embedding (composition over inheritance)
type Employee struct {
    User                     // embed User — promotes User's fields and methods
    Department string
    Salary     float64
}

emp := Employee{User: User{Name: "Bob"}, Department: "Engineering"}
emp.Name    // promoted from User
emp.Greet() // promoted from User
```

### Interfaces

```go
// Interface: a set of method signatures — implicitly implemented (no "implements" keyword)
type Notifier interface {
    Send(message string) error
}

type Logger interface {
    Log(level, message string)
}

// Any type that has a Send method automatically implements Notifier
type EmailNotifier struct {
    recipient string
}
func (e EmailNotifier) Send(message string) error {
    // send email
    return nil
}

type SMSNotifier struct {
    phone string
}
func (s SMSNotifier) Send(message string) error {
    // send SMS
    return nil
}

// Function that accepts any Notifier
func notifyUser(n Notifier, message string) {
    if err := n.Send(message); err != nil {
        log.Printf("notification failed: %v", err)
    }
}

notifyUser(EmailNotifier{recipient: "a@b.com"}, "Hello")
notifyUser(SMSNotifier{phone: "+1234567890"}, "Hello")

// Empty interface (accepts any type)
var anything interface{} = 42
anything = "hello"
anything = []int{1, 2, 3}

// Type assertion
val, ok := anything.(string)  // check and extract
if !ok { /* not a string */ }

// Type switch
switch v := anything.(type) {
case string:  fmt.Println("string:", v)
case int:     fmt.Println("int:", v)
default:      fmt.Println("unknown:", v)
}

// Common interfaces in stdlib
// io.Reader:  Read(p []byte) (n int, err error)
// io.Writer:  Write(p []byte) (n int, err error)
// fmt.Stringer: String() string     (like toString())
// error:      Error() string
```

---

## 5. Error Handling

```go
// Go errors are values — not exceptions
// Every operation that can fail returns (result, error)
// The caller decides how to handle it — no hidden control flow

// Creating errors
err := errors.New("something went wrong")
err  = fmt.Errorf("user %s not found", userID)   // formatted

// Wrapping errors (add context, preserve the original)
if err := db.Query(sql); err != nil {
    return fmt.Errorf("getUser: %w", err)  // %w = wraps the error
}

// Unwrapping errors
if errors.Is(err, sql.ErrNoRows) { ... }  // check wrapped chain
var pathErr *os.PathError
if errors.As(err, &pathErr) { ... }        // extract specific type from chain

// Custom error types
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on '%s': %s", e.Field, e.Message)
}

// Sentinel errors (package-level errors to check with errors.Is)
var (
    ErrNotFound     = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
)

func getUser(id string) (*User, error) {
    user, ok := store[id]
    if !ok {
        return nil, fmt.Errorf("getUser %s: %w", id, ErrNotFound)
    }
    return user, nil
}

// Caller checks:
user, err := getUser(id)
if errors.Is(err, ErrNotFound) {
    http.NotFound(w, r)
    return
}
if err != nil {
    http.Error(w, "internal error", 500)
    return
}

// panic and recover (like throw/catch — for truly unexpected errors)
// Don't use panic for normal error handling
func safeDiv(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("recovered from panic: %v", r)
        }
    }()
    return a / b, nil  // panics if b == 0
}
```

---

## 6. Goroutines & Channels

### Goroutines

```go
// Goroutine: lightweight thread managed by Go runtime (not OS threads)
// Starting one: just add 'go' keyword
// Cost: ~2KB stack (vs ~1MB for OS thread) — can run millions

func sendEmail(to string) {
    // slow operation
    time.Sleep(time.Second)
    fmt.Println("email sent to", to)
}

// Run in background — doesn't block
go sendEmail("alice@example.com")
go sendEmail("bob@example.com")

// Main goroutine continues immediately
// If main exits, all goroutines are killed

// WaitGroup — wait for goroutines to finish
var wg sync.WaitGroup

for _, email := range emails {
    wg.Add(1)
    go func(e string) {
        defer wg.Done()   // decrements when goroutine finishes
        sendEmail(e)
    }(email)  // capture loop variable — pass as argument!
}
wg.Wait()  // blocks until counter reaches 0
```

### Channels

```go
// Channel: typed conduit for sending values between goroutines
// Like a typed, concurrent-safe queue

ch := make(chan int)        // unbuffered — sender blocks until receiver reads
ch := make(chan int, 10)    // buffered — sender blocks only when buffer is full

// Send and receive
ch <- 42        // send (blocks if unbuffered and no receiver)
val := <-ch     // receive (blocks until value available)

// Goroutine communicating via channel
func producer(ch chan<- int) {    // send-only channel
    for i := 0; i < 5; i++ {
        ch <- i
    }
    close(ch)  // signal no more values
}

func consumer(ch <-chan int) {    // receive-only channel
    for val := range ch {        // range over channel — stops when closed
        fmt.Println(val)
    }
}

ch := make(chan int, 5)
go producer(ch)
consumer(ch)

// select — receive from multiple channels (like switch for channels)
func fanIn(ch1, ch2 <-chan string) <-chan string {
    merged := make(chan string)
    go func() {
        defer close(merged)
        for {
            select {
            case v, ok := <-ch1:
                if !ok { ch1 = nil; continue }
                merged <- v
            case v, ok := <-ch2:
                if !ok { ch2 = nil; continue }
                merged <- v
            }
            if ch1 == nil && ch2 == nil { return }
        }
    }()
    return merged
}

// Timeout pattern
select {
case result := <-ch:
    fmt.Println(result)
case <-time.After(5 * time.Second):
    fmt.Println("timed out")
}

// Done channel — cancel goroutines gracefully
done := make(chan struct{})

go func() {
    for {
        select {
        case <-done:
            return  // exit goroutine
        default:
            doWork()
        }
    }
}()

close(done)  // signal all goroutines to stop
```

### Sync primitives

```go
import "sync"

// Mutex — protect shared state
var mu sync.Mutex
var count int

func increment() {
    mu.Lock()
    defer mu.Unlock()
    count++
}

// RWMutex — multiple readers OR one writer
var rwmu sync.RWMutex

func read() int {
    rwmu.RLock()
    defer rwmu.RUnlock()
    return count
}

func write(n int) {
    rwmu.Lock()
    defer rwmu.Unlock()
    count = n
}

// sync.Once — run something exactly once (singleton initialization)
var once sync.Once
var instance *Database

func GetDB() *Database {
    once.Do(func() {
        instance = connectToDB()
    })
    return instance
}

// atomic — lock-free operations for simple values
import "sync/atomic"
var counter int64
atomic.AddInt64(&counter, 1)
atomic.LoadInt64(&counter)
```

---

## 7. Packages & Modules

```go
// Package declaration — every .go file starts with this
package main    // main package = executable
package utils   // library package

// Exported names start with capital letter
// Unexported names start with lowercase — package-private
type User struct { ... }          // exported
type internalCache struct { ... } // unexported

func ProcessTask() { }   // exported
func cleanup() { }       // unexported

// go.mod — module definition (like package.json)
// module github.com/yourname/myapp
// go 1.22
// require (
//   github.com/gin-gonic/gin v1.9.1
//   github.com/lib/pq v1.10.9
// )

// go commands
// go mod init github.com/yourname/myapp   — initialize module
// go get github.com/gin-gonic/gin         — add dependency
// go mod tidy                             — clean up unused deps
// go build ./...                          — build
// go test ./...                           — test all packages
// go run main.go                          — run

// Import
import (
    "fmt"
    "net/http"
    "time"

    "github.com/lib/pq"                       // third-party
    "github.com/yourname/myapp/internal/db"   // internal package
)
```

---

## 8. HTTP Servers

### Standard library (net/http)

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

type Task struct {
    ID    string `json:"id"`
    Title string `json:"title"`
}

func getTasks(w http.ResponseWriter, r *http.Request) {
    tasks := []Task{{ID: "1", Title: "Buy milk"}}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(tasks)
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /tasks", getTasks)       // Go 1.22+ method pattern
    mux.HandleFunc("POST /tasks", createTask)
    mux.HandleFunc("DELETE /tasks/{id}", deleteTask)

    log.Println("Starting server on :8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}

// Route parameters (Go 1.22+)
func deleteTask(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")  // extract {id}
    // ...
    w.WriteHeader(http.StatusNoContent)
}
```

### With Gin (popular web framework)

```go
import "github.com/gin-gonic/gin"

func main() {
    r := gin.Default()  // includes Logger and Recovery middleware

    r.GET("/tasks", func(c *gin.Context) {
        tasks := getTasks()
        c.JSON(http.StatusOK, tasks)
    })

    r.POST("/tasks", func(c *gin.Context) {
        var input CreateTaskInput
        if err := c.ShouldBindJSON(&input); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        task, err := createTask(input)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusCreated, task)
    })

    r.DELETE("/tasks/:id", func(c *gin.Context) {
        id := c.Param("id")
        if err := deleteTask(id); err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
            return
        }
        c.Status(http.StatusNoContent)
    })

    r.Run(":8080")  // listen on :8080
}
```

---

## 9. Testing

```go
// Go has built-in testing — no external library needed
// File: task_test.go (must end in _test.go)
// Function: TestXxx(t *testing.T)

package task

import (
    "testing"
    "errors"
)

func TestCreateTask(t *testing.T) {
    task, err := CreateTask("Buy milk")

    if err != nil {
        t.Fatalf("expected no error, got %v", err)   // Fatal = stop test
    }
    if task.Title != "Buy milk" {
        t.Errorf("expected title 'Buy milk', got %q", task.Title)  // Error = continue test
    }
}

// Table-driven tests (idiomatic Go)
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -1, -1, -2},
        {"zero", 0, 5, 5},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.expected)
            }
        })
    }
}

// Running tests
// go test ./...              — run all tests
// go test -v ./...           — verbose
// go test -run TestAdd       — run specific test
// go test -cover ./...       — coverage report
// go test -bench ./...       — run benchmarks
```

---

## 10. Common Interview Questions

### "What is a goroutine and how is it different from a thread?"

> A goroutine is a lightweight, concurrent function managed by the Go runtime. Unlike OS threads (~1MB stack, expensive to create), goroutines start with ~2KB of stack (which grows as needed) and are multiplexed onto a small number of OS threads by the Go scheduler. You can run millions of goroutines simultaneously. Communication between goroutines is done via channels, following Go's philosophy: "don't communicate by sharing memory; share memory by communicating."

### "What is a channel and when would you use it?"

> A channel is a typed conduit for sending values between goroutines — a concurrent-safe queue. Unbuffered channels synchronize goroutines (sender blocks until receiver is ready). Buffered channels allow N items before blocking. Use channels for: passing data between goroutines, signaling completion (done channel), fan-out/fan-in patterns. Use a Mutex instead when you're protecting shared state that's read and written from multiple goroutines.

### "How does Go handle errors?"

> Go treats errors as values — functions return (result, error) and callers check `if err != nil`. This makes error handling explicit — you can't accidentally ignore an error (though `_` can discard it). Errors can be wrapped with `fmt.Errorf("context: %w", err)` to add context while preserving the original, then checked with `errors.Is()` and `errors.As()`. This is intentionally different from try/catch — no hidden control flow.

### "What is an interface in Go?"

> An interface defines a set of method signatures. Any type that implements all those methods satisfies the interface — there's no explicit `implements` keyword (implicit/structural satisfaction, like TypeScript's structural typing). This allows polymorphism and decoupling — code depends on behavior (interface), not concrete types. The empty interface `interface{}` (or `any` in Go 1.18+) accepts any type. Small, focused interfaces are idiomatic: `io.Reader` (one method), `io.Writer` (one method).

### "Explain Go's concurrency model."

> Go uses CSP (Communicating Sequential Processes). Goroutines are the execution units; channels are the communication mechanism. The runtime schedules goroutines using an M:N model — M goroutines on N OS threads (N = number of CPU cores by default, set by GOMAXPROCS). Go's `select` statement lets a goroutine wait on multiple channel operations — whichever is ready first proceeds. This model makes concurrent code compositional and avoids shared-state bugs by design.
