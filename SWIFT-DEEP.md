# Swift — Senior Developer Deep Reference

> Covers value types, ARC, protocols, concurrency, generics, and Vapor for web backends.

---

## Table of Contents

1. [Value Types vs Reference Types](#1-value-types-vs-reference-types)
2. [Optionals & Error Handling](#2-optionals--error-handling)
3. [Memory Management — ARC](#3-memory-management--arc)
4. [Protocols & Extensions](#4-protocols--extensions)
5. [Generics & Associated Types](#5-generics--associated-types)
6. [Concurrency — async/await & Actors](#6-concurrency--asyncawait--actors)
7. [Vapor — Web Backend](#7-vapor--web-backend)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Value Types vs Reference Types

### Structs, Enums, Classes

```swift
// Value types: struct, enum, tuple
// ‼️ Copied on assignment — each variable holds its own data
struct Point {
    var x: Double
    var y: Double
}

var p1 = Point(x: 1, y: 2)
var p2 = p1     // copy
p2.x = 99
print(p1.x)     // 1.0 — p1 unchanged ‼️

// Reference types: class, actor
// ‼️ Assignment copies the reference — shared mutable state
class Counter {
    var count = 0
}

let c1 = Counter()
let c2 = c1     // same instance
c2.count = 99
print(c1.count) // 99 — shared ‼️

// ‼️ let with class: the reference is constant, but the object is still mutable
let counter = Counter()
counter.count = 5  // ✓ mutating the object is fine
// counter = Counter() // ✗ compile error: can't rebind the reference

// When to use struct vs class:
//   struct: data models, value semantics, no inheritance needed, Codable types
//   class:  identity matters, shared state, inheritance needed, UIKit/AppKit views
```

### Copy-on-Write (CoW)

```swift
// Swift's standard library types (Array, Dictionary, String) use CoW:
// Copying is cheap — they share storage until one is mutated
var a = [1, 2, 3]
var b = a          // no copy yet — share the buffer
b.append(4)        // mutation → copy happens now ‼️
// a = [1, 2, 3], b = [1, 2, 3, 4]

// Custom CoW struct
struct CowBuffer {
    private var storage: Storage

    mutating func append(_ value: Int) {
        if !isKnownUniquelyReferenced(&storage) {
            storage = Storage(copying: storage) // copy-on-write ‼️
        }
        storage.append(value)
    }
}
```

---

## 2. Optionals & Error Handling

### Optionals Internals

```swift
// Optional<T> is an enum under the hood:
// enum Optional<T> { case none; case some(T) }

var name: String? = "Alice"
var empty: String? = nil

// Safe unwrapping patterns:
// 1. if let — scope-limited binding
if let n = name {
    print(n) // n is String, not String?
}

// 2. guard let — early exit, binding available after guard
func greet(_ name: String?) {
    guard let name = name else {
        print("No name"); return
    }
    print("Hello, \(name)") // name available here
}

// 3. Nil coalescing — provide default
let display = name ?? "Anonymous"

// 4. Optional chaining — propagates nil
let count = name?.lowercased().count // Int? — nil if name is nil

// ‼️ Force unwrap (!) — crash if nil. Use only when nil is programmer error.
let definitelyExists: String = name! // ✗ avoid in production code

// Optional map / flatMap — transform without unwrapping
let upper: String? = name.map { $0.uppercased() }
let parsed: Int? = "42".flatMap { Int($0) } // flatMap for failable transforms
```

### Error Handling

```swift
// Swift uses throw/catch with typed errors (any Error protocol)
enum NetworkError: Error {
    case invalidURL
    case noData
    case decodingFailed(underlying: Error)
    case httpError(statusCode: Int)
}

func fetchData(from urlString: String) throws -> Data {
    guard let url = URL(string: urlString) else {
        throw NetworkError.invalidURL
    }
    // ...
    throw NetworkError.httpError(statusCode: 404)
}

// try / catch
do {
    let data = try fetchData(from: "https://example.com/api")
    // use data
} catch NetworkError.invalidURL {
    print("Bad URL")
} catch NetworkError.httpError(let code) where code == 404 {
    print("Not found")
} catch {
    print("Unexpected: \(error)") // catch-all — error is implicitly bound
}

// try? — convert error to nil
let data: Data? = try? fetchData(from: url) // nil on error, no propagation

// try! — crash on error (use only when truly impossible to fail)
let data2 = try! loadBundleResource("config.json")

// Result type — defer error handling
func fetch(completion: (Result<Data, NetworkError>) -> Void) {
    do {
        let data = try fetchData(from: "https://api.example.com")
        completion(.success(data))
    } catch let e as NetworkError {
        completion(.failure(e))
    } catch {
        completion(.failure(.noData))
    }
}
```

---

## 3. Memory Management — ARC

### Automatic Reference Counting

```swift
// ‼️ ARC — compile-time reference counting, no GC, deterministic deallocation
// Every class instance has a reference count
// When count reaches 0 → deinitializer called → memory freed

class Person {
    let name: String
    init(name: String) { self.name = name; print("\(name) initialized") }
    deinit { print("\(name) deinitialized") }
}

var ref1: Person? = Person(name: "Alice") // count = 1
var ref2 = ref1                           // count = 2
ref1 = nil                                // count = 1 — NOT deallocated
ref2 = nil                                // count = 0 → "Alice deinitialized"
```

### Retain Cycles & Weak References

```swift
// ‼️ Retain cycle — two objects hold strong references to each other → never deallocated
class Parent {
    var child: Child?
}
class Child {
    var parent: Parent? // ✗ strong → cycle if parent also holds child
}

// Fix 1: weak — optional reference, set to nil when target deallocates
class Child {
    weak var parent: Parent? // ‼️ must be Optional — will become nil on dealloc
}

// Fix 2: unowned — non-optional reference, assumes target lives as long or longer
// ‼️ Crash if accessed after target deallocates — use only when lifetime is guaranteed
class CreditCard {
    unowned let customer: Customer // customer always outlives card
    init(customer: Customer) { self.customer = customer }
}

// ‼️ Closure retain cycles — closures capture self strongly
class ViewModel {
    var data = "Hello"
    lazy var printData: () -> Void = { [weak self] in // ‼️ capture list
        guard let self = self else { return }
        print(self.data)
    }
}
// ‼️ [weak self] — self becomes optional inside closure
// ‼️ [unowned self] — self is non-optional, crashes if VM is deallocated first
```

---

## 4. Protocols & Extensions

### Protocol-Oriented Programming

```swift
// Protocol — defines interface (like interface in Java, trait in Rust)
protocol Drawable {
    func draw()
    var boundingBox: CGRect { get }
}

// Protocol with default implementation via extension
protocol Describable {
    var name: String { get }
}
extension Describable {
    var description: String { "I am \(name)" } // default implementation
}

// Protocol composition
func render(_ item: Drawable & Describable) {
    item.draw()
    print(item.description)
}

// ‼️ Protocol as type — existential (any keyword, Swift 5.7+)
var drawables: [any Drawable] = [] // heterogeneous collection
// ‼️ Using existentials loses type information — some (opaque type) is preferred

// Opaque type — return some Protocol
func makeCircle() -> some Drawable { Circle(radius: 5) }
// Caller gets concrete type erased behind Drawable, but type is fixed per call ‼️
```

### Extensions

```swift
// Add methods, computed properties, conformances — even to types you don't own
extension String {
    var isValidEmail: Bool {
        contains("@") && contains(".")
    }
    func truncated(to length: Int) -> String {
        count <= length ? self : String(prefix(length)) + "..."
    }
}

"alice@example.com".isValidEmail // true

// Conditional conformance — conform when type param meets condition
extension Array: Encodable where Element: Encodable { ... }

// Retroactive conformance — add protocol to third-party type ‼️ use carefully
extension CLLocationCoordinate2D: Equatable {
    public static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.latitude == rhs.latitude && lhs.longitude == rhs.longitude
    }
}
```

---

## 5. Generics & Associated Types

### Generic Functions & Types

```swift
// Generic function — works for any type satisfying constraints
func swap<T>(_ a: inout T, _ b: inout T) {
    let temp = a; a = b; b = temp
}

var x = 1, y = 2
swap(&x, &y) // x=2, y=1

// Generic struct
struct Stack<Element> {
    private var storage: [Element] = []
    mutating func push(_ element: Element) { storage.append(element) }
    mutating func pop() -> Element? { storage.popLast() }
    var top: Element? { storage.last }
}

var stack = Stack<Int>()
stack.push(1); stack.push(2)
stack.pop() // 2
```

### Associated Types

```swift
// Associated types — type placeholder in a protocol
protocol Container {
    associatedtype Item      // ‼️ concrete type determined by conforming type
    var count: Int { get }
    subscript(i: Int) -> Item { get }
    mutating func append(_ item: Item)
}

// Conforming type provides the concrete type
struct IntStack: Container {
    typealias Item = Int     // explicit (often inferred)
    private var items: [Int] = []
    var count: Int { items.count }
    subscript(i: Int) -> Int { items[i] }
    mutating func append(_ item: Int) { items.append(item) }
}

// Constrained generic with associated type
func allEqual<C: Container>(_ container: C) -> Bool where C.Item: Equatable {
    guard container.count > 1 else { return true }
    let first = container[0]
    return (1..<container.count).allSatisfy { container[$0] == first }
}
```

---

## 6. Concurrency — async/await & Actors

### async/await

```swift
// async function — can be suspended at await points
func fetchUser(id: Int) async throws -> User {
    let url = URL(string: "https://api.example.com/users/\(id)")!
    let (data, response) = try await URLSession.shared.data(from: url)
    guard (response as? HTTPURLResponse)?.statusCode == 200 else {
        throw NetworkError.httpError(statusCode: 0)
    }
    return try JSONDecoder().decode(User.self, from: data)
}

// Calling from async context
func loadProfile(userId: Int) async {
    do {
        let user = try await fetchUser(id: userId)
        print(user.name)
    } catch {
        print("Error: \(error)")
    }
}

// ‼️ await suspends the current task, not the thread
// The thread is freed to run other work while waiting

// Structured concurrency — async let (parallel tasks)
async let user    = fetchUser(id: 1)     // starts immediately
async let orders  = fetchOrders(for: 1)  // starts immediately, in parallel
let (u, o) = try await (user, orders)    // await both — waits for both

// Task — unstructured concurrency
Task {
    let result = try await fetchUser(id: 2)
    print(result.name)
}

// Task.detached — not part of current structured scope (no implicit cancellation)
Task.detached(priority: .background) {
    await backgroundWork()
}
```

### Actors

```swift
// ‼️ Actor — reference type with automatic mutual exclusion
// Only one piece of code can run inside an actor at a time
// Prevents data races on the actor's state

actor BankAccount {
    private var balance: Double

    init(balance: Double) { self.balance = balance }

    func deposit(_ amount: Double) {
        balance += amount
    }

    func withdraw(_ amount: Double) throws {
        guard balance >= amount else { throw BankError.insufficientFunds }
        balance -= amount
    }

    var currentBalance: Double { balance }
}

// Accessing actor from outside requires await ‼️
let account = BankAccount(balance: 1000)
await account.deposit(500)         // await because crossing actor boundary
let bal = await account.currentBalance

// MainActor — special actor representing the main thread
// ‼️ UI updates must happen on the MainActor
@MainActor
class ViewModel: ObservableObject {
    @Published var users: [User] = []

    func loadUsers() async {
        let fetched = try? await fetchAllUsers()
        users = fetched ?? [] // ‼️ runs on MainActor — safe to update @Published
    }
}

// Sendable — types that are safe to transfer across actor boundaries
// Structs with Sendable properties are implicitly Sendable
// Classes need @unchecked Sendable or conformance via actor isolation
```

---

## 7. Vapor — Web Backend

### Setup & Routes

```swift
// Package.swift dependency:
// .package(url: "https://github.com/vapor/vapor.git", from: "4.0.0")

import Vapor

// configure.swift
public func configure(_ app: Application) throws {
    app.databases.use(.postgres(
        hostname: "localhost",
        username: "vapor",
        password: "password",
        database: "mydb"
    ), as: .psql)

    app.migrations.add(CreateUser())
    try app.autoMigrate().wait()

    try routes(app)
}

// routes.swift
func routes(_ app: Application) throws {
    let userController = UserController()

    app.get("health") { req in
        return ["status": "ok"]
    }

    let api = app.grouped("api")
    let users = api.grouped("users")
    users.get(use: userController.index)
    users.post(use: userController.create)
    users.group(":userID") { user in
        user.get(use: userController.show)
        user.put(use: userController.update)
        user.delete(use: userController.delete)
    }
}
```

### Controllers & Fluent ORM

```swift
import Vapor
import Fluent

// Model — Fluent ORM
final class User: Model, Content {
    static let schema = "users"

    @ID(key: .id) var id: UUID?
    @Field(key: "name") var name: String
    @Field(key: "email") var email: String
    @Timestamp(key: "created_at", on: .create) var createdAt: Date?

    init() {}

    init(id: UUID? = nil, name: String, email: String) {
        self.id = id
        self.name = name
        self.email = email
    }
}

// Migration
struct CreateUser: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("users")
            .id()
            .field("name", .string, .required)
            .field("email", .string, .required)
            .unique(on: "email")
            .field("created_at", .datetime)
            .create()
    }
    func revert(on database: Database) async throws {
        try await database.schema("users").delete()
    }
}

// Controller
struct UserController: RouteCollection {
    func boot(routes: RoutesBuilder) throws { }

    // GET /api/users
    func index(req: Request) async throws -> [User] {
        try await User.query(on: req.db).all()
    }

    // GET /api/users/:userID
    func show(req: Request) async throws -> User {
        guard let user = try await User.find(req.parameters.get("userID"), on: req.db) else {
            throw Abort(.notFound)
        }
        return user
    }

    // POST /api/users
    func create(req: Request) async throws -> Response {
        let user = try req.content.decode(User.self)
        try await user.save(on: req.db)
        return try await user.encodeResponse(status: .created, for: req)
    }

    // PUT /api/users/:userID
    func update(req: Request) async throws -> User {
        guard let user = try await User.find(req.parameters.get("userID"), on: req.db) else {
            throw Abort(.notFound)
        }
        let updated = try req.content.decode(User.self)
        user.name = updated.name
        user.email = updated.email
        try await user.save(on: req.db)
        return user
    }

    // DELETE /api/users/:userID
    func delete(req: Request) async throws -> HTTPStatus {
        guard let user = try await User.find(req.parameters.get("userID"), on: req.db) else {
            throw Abort(.notFound)
        }
        try await user.delete(on: req.db)
        return .noContent
    }
}
```

### Middleware & Authentication

```swift
// Custom middleware
struct LogMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        let start = Date()
        let response = try await next.respond(to: request)
        let ms = Date().timeIntervalSince(start) * 1000
        request.logger.info("\(request.method) \(request.url.path) — \(Int(ms))ms")
        return response
    }
}
app.middleware.use(LogMiddleware())

// JWT Authentication with vapor/jwt
import JWT

struct UserPayload: JWTPayload {
    var subject: SubjectClaim
    var expiration: ExpirationClaim
    var userId: UUID

    func verify(using signer: JWTSigner) throws {
        try expiration.verifyNotExpired()
    }
}

// Protected routes
let protected = api.grouped(UserAuthenticator(), User.guardMiddleware())
protected.get("me") { req -> User in
    try req.auth.require(User.self) // throws if not authenticated
}

// Generating JWT
let payload = UserPayload(
    subject: .init(value: "user"),
    expiration: .init(value: Date().addingTimeInterval(3600)),
    userId: user.id!
)
let token = try req.jwt.sign(payload)
```

---

## 8. Common Interview Questions

```text
Q: What is the difference between struct and class in Swift?
A: struct — value type, copied on assignment, no inheritance, stored on stack or inline.
   class — reference type, shared, heap allocated, supports inheritance, ARC managed.
   ‼️ Swift standard library (Array, String, Dictionary) are structs with CoW.
   Prefer struct unless you need identity, inheritance, or Objective-C interop.

Q: What is ARC and what causes retain cycles?
A: Automatic Reference Counting — compiler inserts retain/release calls. No GC overhead.
   Retain cycles: object A strongly references B, B strongly references A → count never 0.
   Fix: make one reference weak (optional, nil on dealloc) or unowned (non-optional, assumed live).

Q: What is the difference between weak and unowned?
A: weak — optional, set to nil when referenced object deallocates. Safe, always check.
   unowned — non-optional, crashes if accessed after deallocation. Use only when lifetime is guaranteed.

Q: What is protocol-oriented programming?
A: Favor protocols + extensions + composition over class inheritance.
   Protocols define behavior, extensions add default implementations.
   Allows value types (structs) to participate in polymorphism.
   ‼️ "Start with a protocol" — Apple's WWDC 2015 keynote concept.

Q: What is the difference between some and any in Swift 5.7+?
A: some Protocol — opaque type, compiler knows the concrete type, static dispatch, no box overhead.
   any Protocol — existential, type-erased at runtime, dynamic dispatch, heap-boxed for large types.
   ‼️ Prefer some for return types (performance). Use any for heterogeneous collections.

Q: What is Sendable?
A: A marker protocol that promises a type is safe to transfer across concurrency domains (actors, tasks).
   Value types with Sendable fields are implicitly Sendable.
   Classes need @unchecked Sendable (you assert thread safety) or actor isolation.
   The compiler enforces Sendable at actor boundaries to prevent data races.

Q: How does structured concurrency differ from unstructured (Task)?
A: Structured (async let, TaskGroup): child tasks are scoped to parent, automatically cancelled
   if parent is cancelled, parent waits for all children.
   Unstructured (Task {}): independent lifetime, not automatically cancelled with parent.
   ‼️ Prefer structured — clearer lifecycle, automatic cleanup, propagated cancellation.
```
