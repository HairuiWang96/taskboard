# C++ — Senior Developer Deep Reference

> Covers memory model, RAII, move semantics, templates, concurrency, and Crow/Drogon for web backends.

---

## Table of Contents

1. [Memory Model & RAII](#1-memory-model--raii)
2. [Smart Pointers](#2-smart-pointers)
3. [Move Semantics & Perfect Forwarding](#3-move-semantics--perfect-forwarding)
4. [Templates & Metaprogramming](#4-templates--metaprogramming)
5. [Concurrency](#5-concurrency)
6. [STL Deep Dive](#6-stl-deep-dive)
7. [Modern C++ (11/14/17/20)](#7-modern-c-11141720)
8. [Crow / Drogon — Web Backends](#8-crow--drogon--web-backends)
9. [Common Interview Questions](#9-common-interview-questions)

---

## 1. Memory Model & RAII

### Stack vs Heap

```cpp
// Stack — automatic storage duration, LIFO, fast, limited size (~1–8 MB)
void foo() {
    int x = 42;           // stack allocated, destroyed when foo() returns
    int arr[100];         // 400 bytes on stack
}

// Heap — dynamic storage duration, manual control, unlimited (RAM), slower
void bar() {
    int* p = new int(42); // heap allocated
    // ... use p ...
    delete p;             // ‼️ must free or leak
    p = nullptr;          // ‼️ null after delete to avoid dangling pointer
}

// ‼️ Common heap bugs:
//   Memory leak:    new without delete
//   Dangling ptr:   delete then dereference
//   Double free:    delete twice → undefined behavior
//   Buffer overflow: write past allocated bounds → UB
```

### RAII — Resource Acquisition Is Initialization

```cpp
// RAII: tie resource lifetime to object lifetime.
// Acquire in constructor, release in destructor.
// ‼️ This is the fundamental C++ idiom — used by all smart pointers, file handles, locks

class FileHandle {
public:
    explicit FileHandle(const std::string& path)
        : file_(fopen(path.c_str(), "r"))
    {
        if (!file_) throw std::runtime_error("Cannot open: " + path);
    }
    ~FileHandle() {
        if (file_) fclose(file_); // ‼️ guaranteed to run when scope exits
    }
    // ‼️ Rule of Five — if you define destructor, define all of these:
    FileHandle(const FileHandle&) = delete;            // no copy
    FileHandle& operator=(const FileHandle&) = delete; // no copy-assign
    FileHandle(FileHandle&& other) noexcept            // move
        : file_(std::exchange(other.file_, nullptr)) {}
    FileHandle& operator=(FileHandle&& other) noexcept { // move-assign
        if (this != &other) {
            if (file_) fclose(file_);
            file_ = std::exchange(other.file_, nullptr);
        }
        return *this;
    }
private:
    FILE* file_;
};

// RAII for locks
std::mutex mtx;
{
    std::lock_guard<std::mutex> lock(mtx); // acquires on construct
    // critical section
}                                          // ‼️ releases on destruct — exception safe
```

---

## 2. Smart Pointers

### unique_ptr

```cpp
#include <memory>

// unique_ptr — sole owner, zero overhead, non-copyable, movable
auto up = std::make_unique<Widget>(42); // ‼️ prefer make_unique over new
up->doWork();

// Transfer ownership
std::unique_ptr<Widget> up2 = std::move(up); // up is now null
// up is nullptr after move — access is UB

// Factory functions commonly return unique_ptr
std::unique_ptr<Shape> makeShape(ShapeType type) {
    switch (type) {
        case ShapeType::Circle:    return std::make_unique<Circle>();
        case ShapeType::Rectangle: return std::make_unique<Rectangle>();
    }
}

// Custom deleter
auto deleter = [](FILE* f) { fclose(f); };
std::unique_ptr<FILE, decltype(deleter)> file(fopen("data.txt", "r"), deleter);
```

### shared_ptr & weak_ptr

```cpp
// shared_ptr — shared ownership via reference counting
// ‼️ Control block: heap allocated, holds strong_count + weak_count + deleter
auto sp1 = std::make_shared<Widget>(); // one allocation: object + control block
auto sp2 = sp1; // strong_count = 2
sp1.reset();    // strong_count = 1
// sp2 goes out of scope → strong_count = 0 → Widget destroyed

// ‼️ Cyclic references → memory leak!
// A holds shared_ptr to B, B holds shared_ptr to A → neither ever destroyed
struct Node {
    std::shared_ptr<Node> next; // ✗ if next points back → cycle
    std::weak_ptr<Node> prev;   // ✓ weak_ptr breaks cycle
};

// weak_ptr — observe without ownership
std::weak_ptr<Widget> wp = sp1;
if (auto sp = wp.lock()) { // ‼️ lock() returns shared_ptr or null if expired
    sp->use();
}
// ‼️ Never dereference weak_ptr directly — it might be expired

// ‼️ Performance: shared_ptr ref-count uses atomic ops — overhead vs unique_ptr
// Prefer unique_ptr unless shared ownership is genuinely needed
```

---

## 3. Move Semantics & Perfect Forwarding

### Lvalues, Rvalues, References

```cpp
int x = 42;          // x is lvalue (has address, persists)
int&& r = 42;        // r is rvalue reference binding a temporary
int& lr = x;         // lr is lvalue reference

// ‼️ Named rvalue references ARE lvalues inside the function!
void process(Widget&& w) {
    Widget other = w;            // ✗ copies! — w is named, so it's an lvalue here
    Widget other2 = std::move(w); // ✓ explicitly cast to rvalue
}
```

### Move Semantics

```cpp
// Move constructor — "steal" resources instead of copying
class Buffer {
    size_t size_;
    int*   data_;
public:
    Buffer(size_t n) : size_(n), data_(new int[n]) {}

    // Copy — expensive O(n)
    Buffer(const Buffer& other) : size_(other.size_), data_(new int[other.size_]) {
        std::copy(other.data_, other.data_ + size_, data_);
    }

    // Move — cheap O(1), steal the pointer
    Buffer(Buffer&& other) noexcept
        : size_(other.size_), data_(other.data_) {
        other.data_ = nullptr; // ‼️ leave source in valid but unspecified state
        other.size_ = 0;
    }

    ~Buffer() { delete[] data_; }
};

// ‼️ std::move does NOT move — it just casts to rvalue reference
// The actual move happens in the move constructor / move assignment
Buffer b1(1000);
Buffer b2 = std::move(b1); // calls move constructor — O(1), no copy
```

### Perfect Forwarding

```cpp
// std::forward — preserve the value category of the argument
template<typename T, typename... Args>
std::unique_ptr<T> make(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}
// If args were lvalues → forward as lvalues (copy into T's constructor)
// If args were rvalues → forward as rvalues (move into T's constructor)
// ‼️ Without forward: rvalues become lvalues (named params are lvalues) → copies

// Reference collapsing rules (T&& with T deduced):
//   T = int   → int&&  (rvalue ref)
//   T = int&  → int&   (lvalue ref — & && collapses to &)
//   T = int&& → int&&  (rvalue ref)
// This is what makes universal references (T&&) work
```

---

## 4. Templates & Metaprogramming

### Function & Class Templates

```cpp
// Function template
template<typename T>
T max(T a, T b) { return a > b ? a : b; }

auto m = max(3, 5);        // T deduced as int
auto m2 = max(3.0, 5.0);   // T deduced as double
// max(3, 5.0);            // ✗ ambiguous deduction — be explicit: max<double>(3, 5.0)

// Class template with default
template<typename T, size_t N = 10>
class FixedArray {
    T data_[N];
public:
    T& operator[](size_t i) { return data_[i]; }
    size_t size() const { return N; }
};

FixedArray<int, 5> arr;
```

### Concepts (C++20)

```cpp
// Concepts — constrain template parameters, readable errors instead of page-long errors
template<typename T>
concept Numeric = std::is_arithmetic_v<T>;

template<Numeric T>
T square(T x) { return x * x; }

// square("hello"); // ✓ clear compile error: "hello" doesn't satisfy Numeric

// Standard concepts: std::integral, std::floating_point, std::same_as, std::derived_from
template<std::ranges::range Container>
void printAll(const Container& c) {
    for (const auto& elem : c) std::cout << elem << " ";
}
```

### SFINAE & type_traits

```cpp
// SFINAE (Substitution Failure Is Not An Error)
// Enable/disable overloads based on type properties

// Pre-C++20 — enable_if
template<typename T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
T double_val(T x) { return x * 2; }

// C++20 — if constexpr (cleaner)
template<typename T>
auto serialize(T val) {
    if constexpr (std::is_integral_v<T>) {
        return std::to_string(val);
    } else if constexpr (std::is_floating_point_v<T>) {
        return std::to_string(val);
    } else {
        return val.serialize(); // must have serialize() method
    }
}
// ‼️ if constexpr — branches compiled conditionally, not at runtime
// Only the taken branch needs to compile → can use type-specific operations
```

---

## 5. Concurrency

### Threads & Mutexes

```cpp
#include <thread>
#include <mutex>
#include <shared_mutex>

std::mutex mtx;

void worker(int id) {
    std::lock_guard<std::mutex> lock(mtx); // RAII lock
    std::cout << "Thread " << id << "\n";
}

std::thread t1(worker, 1);
std::thread t2(worker, 2);
t1.join(); // ‼️ must join or detach — else std::terminate on destruction
t2.join();

// shared_mutex — multiple readers OR one writer
std::shared_mutex rwMtx;

// Reader
std::shared_lock<std::shared_mutex> rlock(rwMtx); // shared (multiple OK)

// Writer
std::unique_lock<std::shared_mutex> wlock(rwMtx); // exclusive (one at a time)

// ‼️ Deadlock prevention: always lock multiple mutexes in same order
// Or use std::scoped_lock (C++17) — acquires multiple locks atomically
std::scoped_lock lock(mtx1, mtx2); // deadlock-safe multi-lock
```

### std::atomic

```cpp
#include <atomic>

// ‼️ atomic<T> — lock-free for fundamental types on most platforms
std::atomic<int> counter{0};
counter.fetch_add(1, std::memory_order_relaxed); // no ordering guarantee
counter++;                                        // seq_cst (default, safest, slowest)

// Memory orders (weakest to strongest):
//   relaxed    — no ordering, just atomicity
//   acquire    — reads: prevents reordering of subsequent reads past this load
//   release    — writes: prevents reordering of prior writes past this store
//   acq_rel    — acquire + release (for RMW like compare_exchange)
//   seq_cst    — sequential consistency — global order across all threads (default)

// ‼️ Use relaxed only for statistics (counters with no dependent data reads)
// Use acquire/release for lock-free data structures

// Compare-and-swap — foundation of lock-free programming
bool expected = false;
bool swapped = flag.compare_exchange_strong(expected, true);
// if flag == expected → set to true, return true
// else → load actual into expected, return false
```

### std::future & std::promise

```cpp
#include <future>

// async — run function asynchronously
std::future<int> fut = std::async(std::launch::async, []() {
    return expensiveCompute();
});

// ... do other work ...

int result = fut.get(); // blocks until ready ‼️

// promise + future — manually set value across threads
std::promise<int> prom;
std::future<int> fut2 = prom.get_future();

std::thread t([&prom]() {
    try {
        int val = compute();
        prom.set_value(val);
    } catch (...) {
        prom.set_exception(std::current_exception()); // propagate exception ‼️
    }
});

int result2 = fut2.get(); // may rethrow the exception
t.join();
```

---

## 6. STL Deep Dive

### Container Complexity

```cpp
// std::vector — contiguous memory, random access O(1), push_back amortized O(1)
// ‼️ reserve() before bulk insert to avoid repeated reallocations
std::vector<int> v;
v.reserve(1000);
for (int i = 0; i < 1000; i++) v.push_back(i);

// ‼️ Iteration invalidation: any insertion that causes reallocation invalidates ALL iterators
// Erase in middle → invalidates all iterators at or after erase point

// std::deque — O(1) push/pop front AND back, non-contiguous memory chunks
// std::list — doubly linked, O(1) insert/erase anywhere (if you have iterator), no random access

// std::unordered_map — hash table, O(1) avg, O(n) worst (all collisions)
// std::map — red-black tree, O(log n), sorted by key, stable iterators on insert/erase

// When to choose:
//   vector  → default sequential container
//   deque   → need fast front insertion (BFS queue)
//   list    → frequent mid-list insert/erase with iterators
//   map     → sorted iteration needed, range queries
//   unordered_map → only need O(1) lookups, no ordering

// std::string_view (C++17) — non-owning view, avoid copies
void process(std::string_view sv) { ... } // accepts string, string_view, const char*
// ‼️ Don't store string_view longer than the underlying string lives
```

---

## 7. Modern C++ (11/14/17/20)

### Key Features

```cpp
// Lambda expressions
auto square = [](int x) { return x * x; };
auto adder  = [offset](int x) { return x + offset; }; // capture by value
auto mutate = [&vec]() { vec.push_back(1); };          // capture by reference ‼️ lifetime care

// Generic lambda (C++14) — auto parameters
auto print = [](const auto& val) { std::cout << val << "\n"; };

// Structured bindings (C++17)
auto [min, max] = std::minmax_element(v.begin(), v.end());
auto [it, inserted] = myMap.insert({"key", 42});
for (auto& [key, value] : myMap) { ... }

// std::optional (C++17) — nullable value without heap allocation
std::optional<User> findUser(int id) {
    if (auto it = db.find(id); it != db.end())
        return it->second;
    return std::nullopt;
}
if (auto user = findUser(42)) {
    user->greet(); // safe — we know it has a value
}

// std::variant (C++17) — type-safe union
std::variant<int, std::string, double> val = 42;
std::visit([](auto&& v) { std::cout << v; }, val); // applies lambda to current type

// Ranges (C++20)
#include <ranges>
auto result = std::ranges::views::iota(1, 10)
    | std::ranges::views::filter([](int n) { return n % 2 == 0; })
    | std::ranges::views::transform([](int n) { return n * n; });
// Lazy pipeline — no intermediate containers
for (int n : result) std::cout << n; // 4 16 36 64

// Coroutines (C++20) — co_await, co_yield, co_return
// Used by networking libraries (Asio, cppcoro)
```

---

## 8. Crow / Drogon — Web Backends

### Crow (Lightweight HTTP Framework)

```cpp
#include "crow.h"

int main() {
    crow::SimpleApp app;

    // Route with path parameter
    CROW_ROUTE(app, "/api/users/<int>")
    ([](int id) {
        crow::json::wvalue result;
        result["id"] = id;
        result["name"] = "Alice";
        return crow::response(200, result);
    });

    // POST with JSON body
    CROW_ROUTE(app, "/api/orders").methods(crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body) return crow::response(400, "Invalid JSON");

        std::string product = body["product"].s();
        int qty = body["quantity"].i();

        crow::json::wvalue response;
        response["status"] = "created";
        response["product"] = product;
        response["quantity"] = qty;
        return crow::response(201, response);
    });

    // Middleware — before/after action
    CROW_ROUTE(app, "/api/admin")
    .before_handle([](crow::request& req, crow::response& res, auto& ctx) {
        if (req.get_header_value("Authorization").empty()) {
            res.code = 401;
            res.end();
        }
    })
    ([](const crow::request& req) {
        return crow::response("Admin area");
    });

    app.port(8080)
       .multithreaded()   // uses thread pool
       .run();
}
```

### Drogon (High-Performance C++ Framework)

```cpp
// Drogon — async, coroutine-native, PostgreSQL/MySQL/Redis built-in

// main.cc
#include <drogon/drogon.h>

int main() {
    drogon::app()
        .setLogLevel(trantor::Logger::kWarn)
        .addListener("0.0.0.0", 8080)
        .setThreadNum(4)         // I/O threads
        .run();
}

// Controller — UserController.h
class UserController : public drogon::HttpController<UserController> {
public:
    METHOD_LIST_BEGIN
        ADD_METHOD_TO(UserController::getUser,  "/api/users/{id}", drogon::Get);
        ADD_METHOD_TO(UserController::createUser, "/api/users",    drogon::Post);
    METHOD_LIST_END

    // Async handler using coroutine (C++20)
    drogon::Task<> getUser(drogon::HttpRequestPtr req,
                            std::function<void(const drogon::HttpResponsePtr&)> callback,
                            int id)
    {
        auto dbClient = drogon::app().getDbClient();
        auto result = co_await dbClient->execSqlCoro(
            "SELECT * FROM users WHERE id = $1", id);

        if (result.empty()) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            co_return;
        }

        Json::Value json;
        json["id"]   = result[0]["id"].as<int>();
        json["name"] = result[0]["name"].as<std::string>();
        auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
        callback(resp);
    }
};

// ‼️ Drogon performance: benchmarks often top framework comparisons
// async I/O + coroutines + minimal overhead → millions of req/s possible
// ‼️ Steeper learning curve than Crow; better for production services
```

---

## 9. Common Interview Questions

```text
Q: What is undefined behavior (UB)?
A: Code that the C++ standard places no requirements on. The compiler assumes UB never happens
   and may optimize accordingly — producing seemingly random results, crashes, security holes.
   Common UB: signed integer overflow, null/dangling pointer deref, out-of-bounds access,
   uninitialized read, data race. Use sanitizers (ASan, UBSan) to detect UB.

Q: What is the Rule of Three / Five / Zero?
A: Rule of Three (pre-C++11): if you define destructor, copy constructor, OR copy assignment,
   define all three.
   Rule of Five (C++11+): add move constructor and move assignment.
   Rule of Zero: design classes so they don't need any — use smart pointers and containers,
   let compiler-generated defaults work. ‼️ Rule of Zero is the modern preferred approach.

Q: What is the difference between new/delete and malloc/free?
A: malloc/free — C-style, allocate raw memory, no constructors/destructors.
   new/delete — C++, allocate + call constructor/destructor, throw on failure (malloc returns null).
   ‼️ Never mix: new with free, or malloc with delete — UB.
   ‼️ Prefer make_unique/make_shared in modern C++ — avoid raw new.

Q: Explain virtual functions and vtable.
A: Virtual function call is dispatched at runtime via vtable (virtual dispatch table).
   Each class with virtual functions has a vtable — array of function pointers.
   Each object stores a vptr (hidden pointer) to its class's vtable.
   virtual call: obj.foo() → *vptr[foo_index]() — one extra pointer dereference vs non-virtual.
   Pure virtual: = 0 → abstract class, cannot instantiate.
   ‼️ Destructor should be virtual in polymorphic base classes — else undefined behavior on delete.

Q: What is copy elision / RVO?
A: Return Value Optimization — compiler eliminates the copy/move when returning a local object.
   C++17: NRVO (Named RVO) is guaranteed for many cases.
   function returns Local → constructed directly in caller's storage — no copy, no move.
   ‼️ Don't std::move() a return value — it can PREVENT RVO (moves instead of elides).

Q: What is a memory fence / barrier?
A: An instruction that prevents the CPU/compiler from reordering memory operations across it.
   std::atomic operations with acquire/release semantics include implicit fences.
   std::atomic_thread_fence() for explicit fencing.
   Needed in lock-free algorithms to ensure visibility of writes across threads.
```
