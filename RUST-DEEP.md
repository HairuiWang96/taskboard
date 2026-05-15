# Rust — Senior Developer Deep Reference

> Covers ownership, borrowing, lifetimes, traits, async/await, concurrency, and Axum/Actix-web for web backends.

---

## Table of Contents

1. [Ownership & Move Semantics](#1-ownership--move-semantics)
2. [Borrowing & References](#2-borrowing--references)
3. [Lifetimes](#3-lifetimes)
4. [Traits & Generics](#4-traits--generics)
5. [Error Handling](#5-error-handling)
6. [Async / Await & Tokio](#6-async--await--tokio)
7. [Concurrency](#7-concurrency)
8. [Axum — Web Backend](#8-axum--web-backend)
9. [Common Interview Questions](#9-common-interview-questions)

---

## 1. Ownership & Move Semantics

### The Ownership Rules

```rust
// ‼️ Three rules — enforced at compile time:
//   1. Each value has exactly one owner
//   2. When the owner goes out of scope, the value is dropped (memory freed)
//   3. There can only be one owner at a time

{
    let s = String::from("hello"); // s owns the heap-allocated string
    // ... use s ...
}                                  // s dropped here — memory freed automatically

// Move — transfer ownership
let s1 = String::from("hello");
let s2 = s1;           // s1 is moved into s2
// println!("{}", s1); // ✗ compile error: s1 is no longer valid

// Clone — explicit deep copy
let s3 = s2.clone();   // heap data copied
println!("{} {}", s2, s3); // both valid

// Copy types — stack-only types implement Copy, don't move
let x: i32 = 5;
let y = x;             // x is copied, not moved
println!("{} {}", x, y); // both valid

// ‼️ Copy types: all integers, booleans, floats, char, tuples of Copy types
// ‼️ If a type implements Drop, it cannot implement Copy
```

### Drop & RAII

```rust
// When a value goes out of scope, Rust calls drop() — automatic resource cleanup
// No GC, no manual free, no finalizers — compile-time guaranteed

struct DatabaseConnection {
    // ... connection details
}

impl Drop for DatabaseConnection {
    fn drop(&mut self) {
        println!("Closing connection"); // runs automatically when owner exits scope
    }
}

// std::mem::drop(value) — explicitly drop before end of scope
let conn = DatabaseConnection::new();
drop(conn); // frees immediately — useful for releasing locks early
```

---

## 2. Borrowing & References

### The Borrowing Rules

```rust
// ‼️ At any given time, you can have EITHER:
//   - Any number of immutable references (&T)
//   - OR exactly one mutable reference (&mut T)
// Never both at the same time.

let mut s = String::from("hello");

let r1 = &s;     // immutable borrow
let r2 = &s;     // another immutable borrow — OK
// let r3 = &mut s; // ✗ compile error: can't borrow as mutable while immutable refs exist
println!("{} {}", r1, r2); // r1 and r2 last used here

let r3 = &mut s; // ✓ OK now — r1 and r2 no longer used (NLL: Non-Lexical Lifetimes)
r3.push_str(" world");

// ‼️ Non-Lexical Lifetimes (NLL): borrow ends at last use, not end of block
// This allows the above pattern without error

// Dangling references — prevented at compile time
// fn dangle() -> &String {
//     let s = String::from("hello");
//     &s   // ✗ s will be dropped, reference would be dangling
// }         // compile error: returns reference to local value
```

### Slices

```rust
// Slices — references to a contiguous sequence, no ownership
let s = String::from("hello world");
let hello: &str = &s[0..5]; // string slice — reference into the string
let world: &str = &s[6..11];

// &str vs String:
//   &str — borrowed string slice, immutable view, can point to literal or String data
//   String — owned, heap-allocated, mutable

fn first_word(s: &str) -> &str { // takes &str — accepts both &String and &str
    let bytes = s.as_bytes();
    for (i, &b) in bytes.iter().enumerate() {
        if b == b' ' { return &s[0..i]; }
    }
    &s[..]
}

// Array slices
let arr = [1, 2, 3, 4, 5];
let slice: &[i32] = &arr[1..4]; // [2, 3, 4] — reference, no copy
```

---

## 3. Lifetimes

### Lifetime Annotations

```rust
// Lifetimes prevent dangling references.
// ‼️ They don't change how long values live — they describe relationships between lifetimes.

// Without annotation — compiler can't determine which input the output borrows from
// fn longest(x: &str, y: &str) -> &str { ... } // ✗ needs lifetime annotation

// 'a annotation: output lives at least as long as the shorter of x and y
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

let s1 = String::from("long string");
let result;
{
    let s2 = String::from("xyz");
    result = longest(s1.as_str(), s2.as_str());
    println!("{}", result); // ✓ valid here — result used within s2's scope
}
// println!("{}", result); // ✗ s2 dropped, result might point to it
```

### Lifetime Elision Rules

```rust
// The compiler applies elision rules to avoid writing lifetimes explicitly
// Three rules (in order):

// Rule 1: Each &param gets its own lifetime
// fn foo(x: &i32, y: &i32) → fn foo<'a, 'b>(x: &'a i32, y: &'b i32)

// Rule 2: If exactly one input lifetime → assigned to all output lifetimes
// fn foo(x: &i32) -> &i32 → fn foo<'a>(x: &'a i32) -> &'a i32

// Rule 3: If one of the inputs is &self or &mut self → output gets self's lifetime
// impl Foo { fn bar(&self, x: &i32) -> &str } → output borrows from self

// When elision fails → compiler asks you to annotate
// Most common case requiring annotation: two reference inputs, different potential sources
```

### Static Lifetime & Struct Lifetimes

```rust
// 'static — lives for the entire program duration
let s: &'static str = "hello"; // string literal — embedded in binary

// Structs holding references need lifetime annotations
struct ImportantExcerpt<'a> {
    part: &'a str, // the struct cannot outlive the string it references
}

let novel = String::from("Call me Ishmael. Some years ago...");
let first_sentence = novel.split('.').next().unwrap();
let excerpt = ImportantExcerpt { part: first_sentence }; // part borrows from novel
// ‼️ excerpt cannot outlive novel
```

---

## 4. Traits & Generics

### Traits

```rust
// Trait — shared interface (like interface in Java/Go)
trait Drawable {
    fn draw(&self);
    fn bounding_box(&self) -> (f64, f64, f64, f64);
    fn description(&self) -> String { // default implementation
        format!("Drawable at {:?}", self.bounding_box())
    }
}

struct Circle { x: f64, y: f64, radius: f64 }

impl Drawable for Circle {
    fn draw(&self) { /* ... */ }
    fn bounding_box(&self) -> (f64, f64, f64, f64) {
        (self.x - self.radius, self.y - self.radius,
         self.x + self.radius, self.y + self.radius)
    }
}
```

### Generics & Trait Bounds

```rust
// Monomorphization — compiler generates concrete types for each instantiation
// ‼️ Zero-cost abstraction: no runtime dispatch overhead (unlike virtual functions)
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list { if item > largest { largest = item; } }
    largest
}

// Multiple bounds
fn process<T: Clone + std::fmt::Display>(item: T) { println!("{}", item.clone()); }

// Where clause — cleaner for complex bounds
fn complex<T, U>(t: &T, u: &U) -> String
where
    T: Clone + std::fmt::Display,
    U: std::fmt::Debug,
{
    format!("{} {:?}", t.clone(), u)
}

// impl Trait in return position — static dispatch, type is inferred
fn make_adder(x: i32) -> impl Fn(i32) -> i32 {
    move |y| x + y // closure captures x
}

// dyn Trait — dynamic dispatch (vtable), object-safe traits
fn draw_all(shapes: &[Box<dyn Drawable>]) {
    for shape in shapes { shape.draw(); } // virtual dispatch per call
}
// ‼️ Use dyn when: heterogeneous collection, runtime polymorphism needed
// ‼️ Use impl Trait / generics when: homogeneous, compile-time monomorphization ok
```

### Derive Macros & Common Traits

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
struct User {
    id: u64,
    name: String,
    email: String,
}

// ‼️ Common derivable traits:
//   Debug     — println!("{:?}", val)
//   Clone     — val.clone()
//   Copy      — implicit copy (only for stack types)
//   PartialEq — == operator
//   Eq        — == is total (no NaN), required for HashMap keys
//   Hash      — required for HashMap/HashSet keys (with Eq)
//   Default   — User::default() with sensible defaults
//   Serialize/Deserialize — serde JSON/binary serialization
```

---

## 5. Error Handling

### Result & Option

```rust
// Result<T, E> — either Ok(T) or Err(E) — for recoverable errors
// Option<T>   — either Some(T) or None — for absence of value

fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 { return Err("Division by zero".to_string()); }
    Ok(a / b)
}

// ? operator — propagate error if Err, unwrap if Ok
fn compute() -> Result<f64, String> {
    let x = divide(10.0, 2.0)?; // returns Err early if divide fails
    let y = divide(x, 0.0)?;    // returns Err here
    Ok(y)
}

// Combinators
let result = divide(10.0, 2.0)
    .map(|x| x * 2.0)              // transform Ok value
    .map_err(|e| format!("Error: {e}")) // transform Err
    .unwrap_or(0.0);               // default on Err

// ‼️ Never use unwrap() in production — it panics on None/Err
// Use: ?, unwrap_or(), unwrap_or_else(), expect("descriptive message"), match
```

### Custom Error Types

```rust
use std::fmt;
use thiserror::Error; // popular crate for ergonomic error types

#[derive(Debug, Error)]
enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),  // auto From conversion

    #[error("Not found: {id}")]
    NotFound { id: u64 },

    #[error("Validation failed: {message}")]
    Validation { message: String },
}

// anyhow — ergonomic error handling for applications (not libraries)
use anyhow::{Context, Result};

fn load_config(path: &str) -> Result<Config> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config: {path}"))?;
    let config: Config = toml::from_str(&content)
        .context("Failed to parse config TOML")?;
    Ok(config)
}
// ‼️ Use thiserror for libraries (preserves error types)
// ‼️ Use anyhow for applications (ergonomic, adds context)
```

---

## 6. Async / Await & Tokio

### How async/await works

```rust
// async fn — returns a Future, a state machine that can be suspended and resumed
// ‼️ Futures are lazy — nothing runs until you await or spawn them

async fn fetch_user(id: u64) -> Result<User, reqwest::Error> {
    let url = format!("https://api.example.com/users/{id}");
    let user: User = reqwest::get(&url).await?.json().await?;
    Ok(user)
}

// await — suspend current task, let the executor run other tasks
// The OS thread is NOT blocked — the Tokio executor schedules other futures

// ‼️ Future is a state machine:
// Each await point becomes a state. The Future impl polls itself forward.
// When a resource is not ready, the future returns Poll::Pending and registers a waker.
// When ready, the executor calls poll() again via the waker.
```

### Tokio Runtime

```rust
use tokio;

// #[tokio::main] — sets up multi-threaded Tokio runtime
#[tokio::main]
async fn main() {
    // Concurrent tasks — spawn runs on thread pool, doesn't block
    let handle1 = tokio::spawn(fetch_user(1));
    let handle2 = tokio::spawn(fetch_user(2));

    let (user1, user2) = tokio::join!(handle1, handle2); // ‼️ run both concurrently

    // join! vs spawn:
    //   join! — runs futures concurrently on current task, no extra allocation
    //   spawn — creates a new task, runs independently, can be on different thread
}

// tokio::select! — race multiple futures, take first to complete
tokio::select! {
    result = fetch_user(1)      => handle_result(result),
    _ = tokio::time::sleep(Duration::from_secs(5)) => eprintln!("Timeout!"),
}

// ‼️ Don't block in async context — blocks the executor thread
// ✗ std::thread::sleep(Duration::from_secs(1)) — blocks thread
// ✓ tokio::time::sleep(Duration::from_secs(1)).await — suspends task only

// Spawn blocking work to separate thread pool
let result = tokio::task::spawn_blocking(|| {
    expensive_cpu_bound_work() // won't block async executor
}).await?;
```

### Channels in Tokio

```rust
use tokio::sync::{mpsc, oneshot, broadcast, watch};

// mpsc — multi-producer, single-consumer (most common)
let (tx, mut rx) = mpsc::channel::<Message>(100); // bounded — backpressure

// Producer
tx.send(Message::new()).await?; // async — waits if buffer full

// Consumer
while let Some(msg) = rx.recv().await {
    process(msg).await;
}

// oneshot — single message (request/response pattern)
let (tx, rx) = oneshot::channel::<Response>();
// Send response from one task, await from another
tx.send(Response::Ok).unwrap();
let response = rx.await?;

// broadcast — multiple consumers each see every message (pub-sub)
let (tx, _) = broadcast::channel::<Event>(16);
let mut rx1 = tx.subscribe();
let mut rx2 = tx.subscribe();

// watch — always holds latest value (config updates, state changes)
let (tx, rx) = watch::channel(initial_config);
// Receivers can see only the latest value — not history
let config = rx.borrow().clone();
```

---

## 7. Concurrency

### Send & Sync

```rust
// ‼️ Send — safe to transfer ownership to another thread
// ‼️ Sync — safe to share references across threads (&T: Send if T: Sync)
// Both are auto-implemented for most types. Compiler enforces correct usage.

// Rc<T> — NOT Send, NOT Sync (non-atomic reference count)
// Arc<T> — Send + Sync (atomic reference count)
// RefCell<T> — NOT Sync (runtime borrow checking, not thread-safe)
// Mutex<T> — Sync (wraps T to allow safe interior mutation)

// Thread-safe shared state pattern
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0u64));

let handles: Vec<_> = (0..10).map(|_| {
    let counter = Arc::clone(&counter); // clone the Arc (inc ref count), not the data
    std::thread::spawn(move || {
        let mut num = counter.lock().unwrap(); // acquires lock, returns MutexGuard
        *num += 1;
    }) // MutexGuard dropped here → lock released ‼️ RAII
}).collect();

for h in handles { h.join().unwrap(); }
println!("{}", *counter.lock().unwrap()); // 10
```

### Channels (std)

```rust
use std::sync::mpsc;

let (tx, rx) = mpsc::channel::<String>();
let tx2 = tx.clone(); // multiple senders OK — single consumer

std::thread::spawn(move || tx.send("hello".to_string()).unwrap());
std::thread::spawn(move || tx2.send("world".to_string()).unwrap());

for received in rx { // iterator blocks until all senders dropped
    println!("{}", received);
}
```

---

## 8. Axum — Web Backend

### Setup & Routing

```rust
use axum::{
    routing::{get, post, put, delete},
    extract::{Path, Query, State, Json},
    response::{IntoResponse, Response},
    http::StatusCode,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    db: sqlx::PgPool,
}

#[tokio::main]
async fn main() {
    let pool = sqlx::PgPool::connect("postgres://localhost/mydb").await.unwrap();
    let state = Arc::new(AppState { db: pool });

    let app = Router::new()
        .route("/api/users",       get(list_users).post(create_user))
        .route("/api/users/:id",   get(get_user).put(update_user).delete(delete_user))
        .route("/api/orders",      get(list_orders))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### Handlers & Extractors

```rust
#[derive(Serialize, Deserialize)]
struct User {
    id: i64,
    name: String,
    email: String,
}

#[derive(Deserialize)]
struct CreateUserRequest {
    name: String,
    email: String,
}

#[derive(Deserialize)]
struct ListQuery {
    page: Option<u32>,
    limit: Option<u32>,
}

// GET /api/users?page=1&limit=20
async fn list_users(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQuery>,
) -> Result<Json<Vec<User>>, AppError> {
    let limit = params.limit.unwrap_or(20) as i64;
    let offset = (params.page.unwrap_or(0) * params.limit.unwrap_or(20)) as i64;

    let users = sqlx::query_as!(User,
        "SELECT id, name, email FROM users LIMIT $1 OFFSET $2",
        limit, offset
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(users))
}

// GET /api/users/:id
async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as!(User,
        "SELECT id, name, email FROM users WHERE id = $1", id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(user))
}

// POST /api/users
async fn create_user(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), AppError> {
    let user = sqlx::query_as!(User,
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email",
        req.name, req.email
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(user)))
}
```

### Error Handling & Middleware

```rust
// Custom error type that implements IntoResponse
#[derive(Debug)]
enum AppError {
    NotFound,
    Database(sqlx::Error),
    Validation(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound      => (StatusCode::NOT_FOUND, "Not found".to_string()),
            AppError::Database(e)   => {
                tracing::error!("DB error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            },
            AppError::Validation(m) => (StatusCode::BAD_REQUEST, m),
        };
        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self { AppError::Database(e) }
}

// Middleware — tower layers
use tower_http::{cors::CorsLayer, trace::TraceLayer, compression::CompressionLayer};

let app = Router::new()
    .route("/api/users", get(list_users))
    .layer(TraceLayer::new_for_http())     // request tracing
    .layer(CompressionLayer::new())        // gzip responses
    .layer(CorsLayer::permissive())        // CORS headers
    .with_state(state);

// Authentication middleware
async fn auth_middleware(
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let token = req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;

    validate_token(token).map_err(|_| StatusCode::UNAUTHORIZED)?;
    Ok(next.run(req).await)
}

let protected = Router::new()
    .route("/api/admin", get(admin_handler))
    .layer(axum::middleware::from_fn(auth_middleware));
```

---

## 9. Common Interview Questions

```text
Q: What is the difference between Box<T>, Rc<T>, and Arc<T>?
A: Box<T>  — single owner, heap allocated, zero overhead, no runtime cost.
   Rc<T>   — multiple owners, reference counted, NOT thread-safe (no atomic ops).
   Arc<T>  — multiple owners, atomically reference counted, thread-safe.
   Use Box for simple heap allocation, Rc for single-threaded shared ownership,
   Arc for multi-threaded shared ownership (usually with Mutex<T>).

Q: What is the difference between String and &str?
A: String — owned, heap-allocated, growable, mutable.
   &str   — borrowed string slice, immutable view, can point to String data or a literal.
   ‼️ Function params should generally take &str (accepts both String and &str).
   Return String when you need to return owned data.

Q: How does Rust prevent data races at compile time?
A: Through the ownership + borrowing rules: you can't have a mutable reference while
   any other reference (mutable or immutable) exists. Combined with Send/Sync traits,
   the compiler proves at compile time that data races can't occur.

Q: What is a lifetime and why does Rust need them?
A: Lifetimes are compile-time annotations describing how long references are valid.
   They prevent dangling references — the compiler verifies that no reference outlives
   its data. Most lifetimes are inferred (elided); you annotate only when the compiler
   can't determine the relationship automatically.

Q: Explain the difference between panic! and Result.
A: panic! — unrecoverable error, unwinds the stack (or aborts), terminates the thread.
   Result — recoverable error, propagated via ? operator, caller decides how to handle.
   Use panic! for programmer bugs (invariant violations), Result for expected failures.
   ‼️ In libraries: never panic for expected conditions — return Result.

Q: What are Rust's zero-cost abstractions?
A: Iterators, closures, generics, trait objects (static dispatch) compile down to the
   same code as hand-written loops/conditionals. The abstraction has no runtime cost.
   Monomorphization: generics are stamped out into concrete types at compile time.

Q: What is the async executor and why can't you use async in trait methods easily?
A: The executor (Tokio, async-std) polls Futures to completion. Futures are state machines.
   async in traits is complex because the return type Future<Output=T> has an unknown size
   and often captures self — requiring boxing: -> Box<dyn Future<Output=T>>.
   The async-trait crate or Rust 1.75+ Return Position Impl Trait in Traits makes this ergonomic.
```
