# Kotlin — Senior Developer Deep Reference

> Covers null safety, coroutines, extension functions, sealed classes, generics, and Ktor/Spring Boot for web backends.

---

## Table of Contents

1. [Null Safety & Type System](#1-null-safety--type-system)
2. [Coroutines — Deep Dive](#2-coroutines--deep-dive)
3. [Extension Functions & DSLs](#3-extension-functions--dsls)
4. [Data Classes, Sealed Classes & Enums](#4-data-classes-sealed-classes--enums)
5. [Generics — Variance](#5-generics--variance)
6. [Delegation & Properties](#6-delegation--properties)
7. [Ktor — Web Backend](#7-ktor--web-backend)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Null Safety & Type System

### Nullable Types

```kotlin
// ‼️ Every type is non-nullable by default — null is not allowed without ?
var name: String = "Alice"
// name = null // ✗ compile error

var nullable: String? = "Alice"
nullable = null // ✓

// Safe call operator — returns null instead of NPE
val length: Int? = nullable?.length

// Elvis operator — provide default when null
val len: Int = nullable?.length ?: 0

// Not-null assertion — throws NullPointerException if null ‼️
val forced: Int = nullable!!.length // ✗ avoid in production

// Let scope function — execute block only when non-null
nullable?.let { value ->
    println("Value is: $value") // value is non-nullable String here
}

// Smart casts — compiler tracks null checks
if (nullable != null) {
    println(nullable.length) // smart cast to String — no ?.needed here
}
```

### Smart Casts & Type Checks

```kotlin
// is — type check with smart cast
fun describe(obj: Any): String {
    return when (obj) {
        is Int    -> "Integer: $obj"          // obj is Int inside branch
        is String -> "String of length ${obj.length}"  // obj is String here
        is List<*>-> "List with ${obj.size} elements"
        else      -> "Unknown"
    }
}

// as — unsafe cast (ClassCastException if wrong type)
val str = obj as String   // ✗ throws if obj isn't String

// as? — safe cast (returns null if wrong type)
val str: String? = obj as? String  // ✓ null if not a String
```

---

## 2. Coroutines — Deep Dive

### Coroutine Basics

```kotlin
import kotlinx.coroutines.*

// ‼️ Coroutines are lightweight threads — millions possible on a few OS threads
// Suspended at suspension points, OS thread freed for other coroutines

// launch — fire and forget, returns Job
val job: Job = CoroutineScope(Dispatchers.IO).launch {
    val data = fetchData()  // suspends here, doesn't block thread
    println(data)
}

// async — returns Deferred<T>, produces a result
val deferred: Deferred<String> = CoroutineScope(Dispatchers.IO).async {
    fetchData()
}
val result: String = deferred.await()  // suspends until result ready

// runBlocking — bridges blocking and coroutine code (testing, main functions)
fun main() = runBlocking {
    val data = fetchData()  // suspends, not blocking the thread conceptually
    println(data)
}
```

### Dispatchers

```kotlin
// ‼️ Dispatcher — determines which thread(s) a coroutine runs on

// Dispatchers.Main — main/UI thread (Android, JavaFX, Swing)
withContext(Dispatchers.Main) {
    textView.text = result
}

// Dispatchers.IO — optimized for blocking I/O (disk, network, DB)
// Backed by large thread pool (up to 64 threads or number of CPUs, whichever larger)
withContext(Dispatchers.IO) {
    val data = readFromDisk()
    val response = apiCall()
}

// Dispatchers.Default — CPU-intensive work
// Backed by thread pool = number of CPU cores
withContext(Dispatchers.Default) {
    val sorted = largeList.sortedWith(complexComparator)
}

// Dispatchers.Unconfined — runs in calling thread until first suspension ‼️ use rarely

// withContext — switch dispatcher within a coroutine
suspend fun loadUser(id: Long): User = withContext(Dispatchers.IO) {
    database.findUser(id)  // runs on IO thread
}                          // returns to original dispatcher after
```

### Structured Concurrency

```kotlin
// ‼️ Structured concurrency: child coroutines are bound to their parent scope
// Parent waits for all children. If parent cancelled → all children cancelled.

suspend fun loadDashboard() = coroutineScope {  // creates child scope
    val user   = async { fetchUser() }
    val orders = async { fetchOrders() }
    val prefs  = async { fetchPrefs() }

    DashboardData(
        user   = user.await(),
        orders = orders.await(),
        prefs  = prefs.await()
    )
}
// If any async throws → all other asyncs are cancelled ‼️

// supervisorScope — children fail independently
supervisorScope {
    val a = async { riskyOp1() }
    val b = async { riskyOp2() }
    // a failing doesn't cancel b
    a.await()  // may throw, but b still runs
    b.await()
}

// Job cancellation
val job = launch { longRunningWork() }
job.cancel()    // requests cancellation
job.join()      // wait for cancellation to complete

// ‼️ Suspension points are cancellation checkpoints — non-suspending code ignores cancel
// Cooperative cancellation: check isActive or use yield()
launch {
    while (isActive) {  // ‼️ check cancellation flag
        doWork()
    }
}
```

### Flow — Cold Streams

```kotlin
import kotlinx.coroutines.flow.*

// Flow — cold, lazy asynchronous stream (like Rx Observable, cold)
// Only executes when collected

fun numberFlow(): Flow<Int> = flow {
    for (i in 1..10) {
        delay(100)    // suspend — non-blocking
        emit(i)       // emit value downstream
    }
}

// Collecting
numberFlow()
    .filter { it % 2 == 0 }
    .map { it * it }
    .collect { value -> println(value) }  // 4, 16, 36, 64, 100

// ‼️ Terminal operators (collect, toList, first, single, reduce, fold) trigger collection
// Intermediate operators (map, filter, take, flatMap) are lazy

// StateFlow — hot, always has a value, replays last to new collectors (replaces LiveData)
val _uiState = MutableStateFlow(UiState.Loading)
val uiState: StateFlow<UiState> = _uiState.asStateFlow()

_uiState.value = UiState.Success(data) // emit new value

// SharedFlow — hot, configurable replay and buffer (for events)
val _events = MutableSharedFlow<Event>(extraBufferCapacity = 64)
val events: SharedFlow<Event> = _events.asSharedFlow()

_events.emit(Event.NavigateTo("/home"))

// ‼️ StateFlow vs SharedFlow:
//   StateFlow — holds current state, replays 1 to new collectors — use for UI state
//   SharedFlow — no initial value, configurable replay — use for one-shot events
```

---

## 3. Extension Functions & DSLs

### Extension Functions

```kotlin
// Add methods to existing types without subclassing
fun String.isPalindrome(): Boolean = this == this.reversed()

fun List<Int>.average(): Double = if (isEmpty()) 0.0 else sum().toDouble() / size

"racecar".isPalindrome() // true

// Extension on nullable types
fun String?.orEmpty(): String = this ?: ""

// Extension properties
val String.firstChar: Char? get() = if (isEmpty()) null else this[0]

// ‼️ Extensions are resolved statically — they're NOT virtual
open class Animal
class Dog : Animal()

fun Animal.sound() = "Some sound"
fun Dog.sound() = "Woof"

val animal: Animal = Dog()
println(animal.sound()) // "Some sound" — dispatch on declared type, not runtime type
// ‼️ This is different from overriding — extension functions don't participate in OOP dispatch
```

### DSL Building

```kotlin
// DSLs use lambdas with receivers — lambda runs with a specific object as `this`

// Lambda with receiver: () -> Unit becomes Receiver.() -> Unit
class HtmlBuilder {
    private val children = mutableListOf<String>()
    fun div(block: HtmlBuilder.() -> Unit) {
        val builder = HtmlBuilder()
        builder.block()          // block runs with HtmlBuilder as `this`
        children.add("<div>${builder.build()}</div>")
    }
    fun p(text: String) { children.add("<p>$text</p>") }
    fun build() = children.joinToString("")
}

fun html(block: HtmlBuilder.() -> Unit): String {
    val builder = HtmlBuilder()
    builder.block()
    return builder.build()
}

val page = html {
    div {
        p("Hello")
        p("World")
    }
}

// ‼️ Real-world DSLs: Gradle Kotlin DSL, Ktor routing, Jetpack Compose, kotlinx.html
```

---

## 4. Data Classes, Sealed Classes & Enums

### Data Classes

```kotlin
// Auto-generates: equals, hashCode, toString, copy, componentN functions
data class User(val id: Long, val name: String, val email: String)

val alice = User(1, "Alice", "alice@a.com")
val alice2 = alice.copy(email = "newemail@a.com") // new instance, name/id unchanged

// Destructuring via componentN
val (id, name, email) = alice
// id=1, name="Alice", email="alice@a.com"

// ‼️ data class in collections — equality by value, not reference
val set = setOf(User(1, "Alice", "a@a.com"), User(1, "Alice", "a@a.com"))
println(set.size) // 1 — equal by content ‼️
```

### Sealed Classes

```kotlin
// ‼️ Sealed class — restricted hierarchy, all subclasses in same file/package
// when expression is exhaustive — compiler enforces all cases handled

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val code: Int) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

// Exhaustive when — no else needed ‼️
fun handleResult(result: Result<User>) = when (result) {
    is Result.Success -> render(result.data)
    is Result.Error   -> showError(result.message)
    Result.Loading    -> showSpinner()
}

// vs enum: sealed classes can hold different data per variant, be generic, have methods

// Sealed interface (Kotlin 1.5+) — allows subclasses in different files in same package
sealed interface ApiResponse
data class OkResponse(val body: String) : ApiResponse
data class ErrorResponse(val error: String, val status: Int) : ApiResponse
```

---

## 5. Generics — Variance

### Covariance & Contravariance

```kotlin
// ‼️ Kotlin uses declaration-site variance (unlike Java's use-site wildcards)

// out (covariance) — can only produce T, not consume it
// Producer: safe to assign List<Dog> where List<Animal> expected
interface Producer<out T> {
    fun produce(): T  // T only in out position ✓
    // fun consume(t: T) // ✗ compile error — T in in position
}
val dogProducer: Producer<Dog> = DogFactory()
val animalProducer: Producer<Animal> = dogProducer // ✓ covariant

// in (contravariance) — can only consume T, not produce it
interface Consumer<in T> {
    fun consume(t: T) // T only in in position ✓
    // fun produce(): T // ✗
}
val animalConsumer: Consumer<Animal> = AnimalFeeder()
val dogConsumer: Consumer<Dog> = animalConsumer // ✓ contravariant

// Use-site variance — wildcards at call site (like Java)
fun processProducer(p: Producer<out Animal>) { ... } // accepts Producer<Dog> etc.
fun processConsumer(c: Consumer<in Dog>) { ... }       // accepts Consumer<Animal> etc.

// Star projection — unknown type (like Java's ?)
fun printFirst(list: List<*>) { println(list.first()) }
```

### Reified Type Parameters

```kotlin
// ‼️ Normal generics are erased at runtime — can't check T at runtime
// reified — inline function with reified T preserves type at runtime

inline fun <reified T> parseJson(json: String): T {
    return gson.fromJson(json, T::class.java) // T::class.java available! ‼️
}

val user: User = parseJson(jsonString) // no manual Class<T> parameter needed

// Without reified: parseJson(jsonString, User::class.java) — verbose

// Also useful for type checks:
inline fun <reified T> List<*>.filterIsInstance(): List<T> =
    filter { it is T }.map { it as T }
```

---

## 6. Delegation & Properties

### Class Delegation

```kotlin
// Delegation — implement interface by delegating to another object
interface Repository<T> {
    fun findById(id: Long): T?
    fun save(item: T): T
    fun delete(id: Long)
}

// by keyword — auto-delegate all interface methods to the delegate
class CachedRepository<T>(
    private val delegate: Repository<T>,
    private val cache: Cache<Long, T>
) : Repository<T> by delegate {  // ‼️ delegate all to `delegate`
    // Override only what you need to customize
    override fun findById(id: Long): T? {
        return cache.getOrPut(id) { delegate.findById(id) }
    }
}
```

### Property Delegation

```kotlin
import kotlin.properties.Delegates

// lazy — compute on first access, cache result (thread-safe by default)
val expensiveData: List<String> by lazy {
    println("Computing...")
    readLargeFile() // only runs once
}

// observable — callback on every change
var name: String by Delegates.observable("Initial") { prop, old, new ->
    println("${prop.name}: $old → $new")
}

// vetoable — callback that can reject changes
var age: Int by Delegates.vetoable(0) { _, _, new ->
    new >= 0  // return false to reject change
}

// Custom delegate
class LowerCaseDelegate {
    private var value: String = ""
    operator fun getValue(thisRef: Any?, property: KProperty<*>): String = value
    operator fun setValue(thisRef: Any?, property: KProperty<*>, newValue: String) {
        value = newValue.lowercase()
    }
}

var email: String by LowerCaseDelegate() // always stored lowercase
email = "Alice@EXAMPLE.COM"
println(email) // "alice@example.com"
```

---

## 7. Ktor — Web Backend

### Setup & Routing

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.ktor:ktor-server-netty:2.3.0")
    implementation("io.ktor:ktor-server-content-negotiation:2.3.0")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.0")
    implementation("io.ktor:ktor-server-auth-jwt:2.3.0")
}

// Application.kt
fun main() {
    embeddedServer(Netty, port = 8080, module = Application::module).start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) {
        json(Json { prettyPrint = true; isLenient = true })
    }
    install(StatusPages) {
        exception<IllegalArgumentException> { call, e ->
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to e.message))
        }
        exception<NotFoundException> { call, e ->
            call.respond(HttpStatusCode.NotFound, mapOf("error" to e.message))
        }
    }
    configureRouting()
}

fun Application.configureRouting() {
    routing {
        route("/api") {
            route("/users") {
                get {
                    val users = userService.findAll()
                    call.respond(users)
                }
                get("/{id}") {
                    val id = call.parameters["id"]?.toLongOrNull()
                        ?: throw IllegalArgumentException("Invalid ID")
                    val user = userService.findById(id)
                        ?: throw NotFoundException("User $id not found")
                    call.respond(user)
                }
                post {
                    val request = call.receive<CreateUserRequest>()
                    val user = userService.create(request)
                    call.respond(HttpStatusCode.Created, user)
                }
                put("/{id}") {
                    val id = call.parameters["id"]!!.toLong()
                    val request = call.receive<UpdateUserRequest>()
                    val user = userService.update(id, request)
                    call.respond(user)
                }
                delete("/{id}") {
                    val id = call.parameters["id"]!!.toLong()
                    userService.delete(id)
                    call.respond(HttpStatusCode.NoContent)
                }
            }
        }
    }
}
```

### Authentication & Middleware

```kotlin
// JWT Authentication
install(Authentication) {
    jwt("auth-jwt") {
        realm = "my-app"
        verifier(
            JWT.require(Algorithm.HMAC256(secret))
               .withAudience(audience)
               .withIssuer(issuer)
               .build()
        )
        validate { credential ->
            if (credential.payload.getClaim("userId").asString() != null)
                JWTPrincipal(credential.payload)
            else null
        }
        challenge { _, _ ->
            call.respond(HttpStatusCode.Unauthorized, "Token invalid or expired")
        }
    }
}

// Protect routes
authenticate("auth-jwt") {
    get("/api/me") {
        val principal = call.principal<JWTPrincipal>()!!
        val userId = principal.payload.getClaim("userId").asString()
        call.respond(userService.findById(userId.toLong())!!)
    }
}

// Logging middleware
install(CallLogging) {
    level = Level.INFO
    filter { call -> call.request.path().startsWith("/api") }
}

// CORS
install(CORS) {
    allowMethod(HttpMethod.Options)
    allowMethod(HttpMethod.Put)
    allowMethod(HttpMethod.Delete)
    allowHeader(HttpHeaders.Authorization)
    allowHeader(HttpHeaders.ContentType)
    anyHost() // ‼️ restrict in production
}
```

### Database with Exposed ORM

```kotlin
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.dao.*
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

// Table definition
object Users : LongIdTable("users") {
    val name  = varchar("name", 255)
    val email = varchar("email", 255).uniqueIndex()
    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
}

// DAO Entity
class User(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<User>(Users)
    var name  by Users.name
    var email by Users.email
}

// Suspend transaction — non-blocking Exposed query in Ktor coroutine context
suspend fun <T> dbQuery(block: suspend () -> T): T =
    newSuspendedTransaction(Dispatchers.IO) { block() }

// Usage in route handler
get("/api/users") {
    val users = dbQuery {
        User.all().map { UserDto(it.id.value, it.name, it.email) }
    }
    call.respond(users)
}

post("/api/users") {
    val req = call.receive<CreateUserRequest>()
    val user = dbQuery {
        User.new {
            name  = req.name
            email = req.email
        }
    }
    call.respond(HttpStatusCode.Created, UserDto(user.id.value, user.name, user.email))
}
```

---

## 8. Common Interview Questions

```text
Q: What is the difference between val and var in Kotlin?
A: val — read-only reference (like final in Java). The object it points to can be mutable.
   var — mutable reference, can be reassigned.
   ‼️ Prefer val. Under the hood: val in class → generates getter only; var → getter + setter.

Q: What are coroutines vs threads?
A: Threads — OS-level, ~1MB stack, context switch ~µs, limited by OS (thousands max).
   Coroutines — JVM-level, cooperative multitasking, share threads, millions possible.
   Coroutines suspend (not block) at suspension points — OS thread is freed.
   ‼️ 1 Dispatcher.IO thread can service many coroutines doing I/O simultaneously.

Q: Explain the difference between launch and async.
A: launch — fire and forget, returns Job (no result), exception propagates to parent scope.
   async — returns Deferred<T>, result retrieved via .await(), exception thrown at await point.
   ‼️ async exceptions are deferred until await() — easy to miss if you don't await.

Q: What is the difference between Flow, StateFlow, and SharedFlow?
A: Flow — cold, starts only when collected, sequence of values.
   StateFlow — hot, always has current value, replays last to new collectors. Use for UI state.
   SharedFlow — hot, configurable replay buffer, no initial value. Use for events/commands.

Q: What is the difference between == and === in Kotlin?
A: == — structural equality (calls equals()), null-safe.
   === — referential equality (same object in memory).
   ‼️ data classes override equals() for value equality. Regular classes use reference equality.

Q: Explain out and in variance keywords.
A: out — covariant: Producer<Dog> is subtype of Producer<Animal>. T only returned, not consumed.
   in — contravariant: Consumer<Animal> is subtype of Consumer<Dog>. T only consumed, not returned.
   Invariant (no keyword): List<Dog> is NOT subtype of List<Animal>.
   ‼️ Kotlin uses declaration-site variance; Java uses use-site (wildcards).

Q: What does inline do for functions and why does it matter for lambdas?
A: inline — copies the function body AND the lambda body to call sites at compile time.
   Eliminates the Function object allocation for the lambda, enables reified type params.
   ‼️ Use inline for higher-order functions called frequently with lambdas (like filter, map).
   ✗ Don't inline large functions — code bloat. Don't inline if lambda is stored/returned.
```
