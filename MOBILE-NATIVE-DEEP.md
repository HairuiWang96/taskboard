# Native Mobile Development — Senior Developer Deep Reference
**Priority: LOW** — Swift (iOS) + Kotlin (Android)

> Covers both platforms side by side: app structure, UI, state, navigation, networking, and concurrency. Mental model for web developers.

---

## Table of Contents

1. [Native vs Cross-Platform — The Decision](#1-native-vs-cross-platform--the-decision)
2. [Swift — iOS/macOS](#2-swift--iosmacOS)
3. [SwiftUI — Modern iOS UI](#3-swiftui--modern-ios-ui)
4. [Kotlin — Android](#4-kotlin--android)
5. [Jetpack Compose — Modern Android UI](#5-jetpack-compose--modern-android-ui)
6. [Networking (Both Platforms)](#6-networking-both-platforms)
7. [Data Persistence (Both Platforms)](#7-data-persistence-both-platforms)
8. [App Lifecycle & Navigation](#8-app-lifecycle--navigation)
9. [Common Interview Questions](#9-common-interview-questions)

---

## 1. Native vs Cross-Platform — The Decision

```text
Native (Swift/Kotlin):
  ✓ Best performance, best platform integration
  ✓ Access to ALL platform APIs immediately on release
  ✓ Native look and feel — platform design language
  ✓ Best tooling (Xcode / Android Studio)
  ✗ Two separate codebases — double the work
  ✗ Requires platform expertise for each

React Native (JS + native bridge):
  ✓ Shared business logic between iOS and Android
  ✓ Web developers can get started quickly
  ✗ Bridge overhead, not truly native performance
  ✗ Some platform features require writing native modules

Flutter (Dart + custom rendering):
  ✓ Single codebase for both platforms + web
  ✓ Pixel-perfect UI (renders its own widgets)
  ✓ Excellent performance (compiled to ARM)
  ✗ Custom UI — doesn't look like native platform components
  ✗ Smaller ecosystem than native

Choose native when: performance is critical, deep platform integration needed, complex animations
Choose React Native when: team has strong JS skills, shared code with web is valuable
Choose Flutter when: want one codebase, pixel-perfect custom UI, good performance
```

---

## 2. Swift — iOS/macOS

### Swift basics for JS developers

```swift
// Variables and constants
var name = "Alice"         // var = mutable (like let in JS)
let pi   = 3.14159        // let = immutable (like const in JS)

// Type annotations
var age: Int = 30
var price: Double = 9.99
var isActive: Bool = true
var greeting: String = "Hello"

// String interpolation (like JS template literals)
let message = "Hello, \(name)! You are \(age) years old."

// Optionals — the MOST important Swift concept
// A variable that might have a value or might be nil
var email: String?          // Optional<String> — can be nil
var phone: String? = nil    // explicitly nil

// Unwrapping optionals
if let unwrapped = email {
    print(unwrapped)        // safe — only runs if email is not nil
}

// Guard (early return pattern — idiomatic Swift)
func processEmail(_ email: String?) {
    guard let email = email else {
        print("No email provided")
        return               // must exit scope in else
    }
    print("Email: \(email)") // email is unwrapped here
}

// Optional chaining (like JS ?.)
let city = user?.address?.city  // nil if any part is nil

// Nil coalescing (like JS ??)
let displayName = name ?? "Anonymous"

// Force unwrap — only when you KNOW it's not nil (crashes if nil)
let count = items!.count    // ✗ avoid — use if let or guard instead
```

### Collections

```swift
// Array
var tasks: [String] = ["Buy milk", "Walk dog"]
tasks.append("Read book")
tasks.remove(at: 0)
tasks.count              // 2
tasks.first              // Optional — might be nil if empty
tasks.last

// Dictionary (like JS object/Map)
var user: [String: Any] = ["name": "Alice", "age": 30]
var settings: [String: Bool] = ["notifications": true, "darkMode": false]
settings["haptics"] = true
settings["notifications"]   // Optional<Bool> — always optional for dictionaries

// Struct (value type — copied on assignment, unlike JS objects which are reference)
struct Task {
    var id: UUID
    var title: String
    var isCompleted: Bool = false

    mutating func complete() {    // must mark as mutating to change properties
        isCompleted = true
    }
}

var task = Task(id: UUID(), title: "Buy milk")
var taskCopy = task             // copies all values — modifying one doesn't affect the other
taskCopy.complete()
print(task.isCompleted)         // false — original unchanged

// Enum with associated values
enum Priority {
    case low
    case medium
    case high(reason: String)   // associated value
}

let p: Priority = .high(reason: "Deadline today")
switch p {
case .low:    print("low")
case .medium: print("medium")
case .high(let reason): print("high: \(reason)")
}

// Closures (like JS arrow functions)
let square = { (x: Int) -> Int in return x * x }
let double: (Int) -> Int = { $0 * 2 }    // $0 = first argument shorthand
[1,2,3].map { $0 * 2 }                   // [2, 4, 6]
[1,2,3,4].filter { $0 % 2 == 0 }        // [2, 4]
[1,2,3].reduce(0) { $0 + $1 }           // 6
```

### Protocols (like TypeScript interfaces)

```swift
protocol Notifiable {
    var id: String { get }
    func notify(message: String)
}

struct User: Notifiable {
    let id: String
    var name: String

    func notify(message: String) {
        print("Notifying \(name): \(message)")
    }
}

// Protocol extension — default implementation
extension Notifiable {
    func notifyWithPrefix(_ message: String) {
        notify(message: "📬 \(message)")
    }
}

// Codable — JSON encoding/decoding (like Zod schema inference)
struct TaskResponse: Codable {
    let id: String
    let title: String
    let isCompleted: Bool

    // CodingKeys — map JSON snake_case to Swift camelCase
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case isCompleted = "is_completed"
    }
}

let json = """{"id":"1","title":"Buy milk","is_completed":false}""".data(using: .utf8)!
let task = try! JSONDecoder().decode(TaskResponse.self, from: json)
let encoded = try! JSONEncoder().encode(task)
```

---

## 3. SwiftUI — Modern iOS UI

### Declarative UI (like React)

```swift
import SwiftUI

// View = protocol — like a React component
struct TaskRow: View {
    let task: Task

    var body: some View {           // body = render function
        HStack {                    // horizontal stack (like flex row)
            Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundColor(task.isCompleted ? .green : .gray)
            Text(task.title)
                .strikethrough(task.isCompleted)
            Spacer()               // fills remaining space (like flex: 1)
        }
        .padding()
    }
}

// State management
struct TaskListView: View {
    @State private var tasks: [Task] = []        // like useState (local)
    @State private var newTaskTitle: String = ""
    @State private var isLoading: Bool = false

    var body: some View {
        NavigationStack {
            List(tasks, id: \.id) { task in      // like .map() — id = key
                TaskRow(task: task)
            }
            .navigationTitle("Tasks")
            .toolbar {
                Button("Add") { addTask() }
            }
            .task {                              // runs on appear (like useEffect)
                await loadTasks()
            }
        }
    }

    func addTask() {
        tasks.append(Task(id: UUID(), title: newTaskTitle))
        newTaskTitle = ""
    }

    func loadTasks() async {
        isLoading = true
        tasks = await TaskService.shared.fetchTasks()
        isLoading = false
    }
}
```

### State management patterns

```swift
// @State       — local component state (like useState)
// @Binding     — two-way binding passed from parent (like value + onChange prop)
// @StateObject — local ObservableObject (view model owns it)
// @ObservedObject — ObservableObject passed from outside
// @EnvironmentObject — shared state passed via environment (like React Context)

// ObservableObject (like a Zustand store)
class TaskViewModel: ObservableObject {
    @Published var tasks: [Task] = []    // @Published = triggers view update
    @Published var isLoading = false

    func fetchTasks() async {
        isLoading = true
        do {
            tasks = try await TaskService.shared.fetchTasks()
        } catch {
            print("Error: \(error)")
        }
        isLoading = false
    }
}

struct TaskListView: View {
    @StateObject private var viewModel = TaskViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else {
                List(viewModel.tasks, id: \.id) { task in
                    TaskRow(task: task)
                }
            }
        }
        .task { await viewModel.fetchTasks() }
    }
}
```

---

## 4. Kotlin — Android

### Kotlin basics for JS developers

```kotlin
// Variables
var name = "Alice"         // mutable
val pi   = 3.14159        // immutable (like const)

// Null safety (like TypeScript's strict null checks)
var email: String? = null  // nullable type
var name: String  = "Alice" // non-nullable — can never be null

// Safe call (like JS ?.)
val length = email?.length  // null if email is null

// Elvis operator (like JS ??)
val displayName = name ?: "Anonymous"

// Non-null assertion (crashes if null — avoid)
val length = email!!.length

// String templates
val message = "Hello, $name! Age: ${age + 1}"

// Data class (like TypeScript interface + auto-generated methods)
data class Task(
    val id: String,
    val title: String,
    val isCompleted: Boolean = false,
)
// Auto-generates: equals(), hashCode(), toString(), copy()
val updated = task.copy(isCompleted = true)  // immutable update (like spread)

// Extension functions (add methods to existing classes)
fun String.capitalize(): String = this[0].uppercaseChar() + this.substring(1)
"hello".capitalize()   // "Hello"

// Scope functions (idiomatic Kotlin)
val result = someObject.let { it.doSomething() }   // transform, return result
someObject.also { it.setup() }                      // side effect, return original
val user = User().apply { name = "Alice"; age = 30 } // configure, return receiver
someObject.run { doWork(); getResult() }            // execute block, return result
```

### Collections and lambdas

```kotlin
// Collections
val tasks = listOf("Buy milk", "Walk dog")        // immutable
val mutable = mutableListOf("Buy milk")           // mutable
mutable.add("Walk dog")

val map = mapOf("alice" to 30, "bob" to 25)       // immutable
val mutableMap = mutableMapOf("alice" to 30)

// Functional operations (like JS array methods)
tasks.map { it.length }                             // [8, 8]
tasks.filter { it.startsWith("Buy") }              // ["Buy milk"]
tasks.first { it.contains("dog") }                 // "Walk dog"
tasks.any { it.startsWith("Walk") }                // true
tasks.all { it.isNotEmpty() }                      // true
tasks.reduce { acc, s -> "$acc, $s" }              // "Buy milk, Walk dog"
tasks.sortedBy { it.length }                       // sorted by length

// Coroutines (Kotlin's async/await — more powerful than JS promises)
import kotlinx.coroutines.*

suspend fun fetchUser(id: String): User {           // suspend = async function
    return withContext(Dispatchers.IO) {            // switch to IO thread
        apiService.getUser(id)
    }
}

// Call suspend functions
CoroutineScope(Dispatchers.Main).launch {
    val user = fetchUser("123")                     // await (no explicit keyword)
    updateUI(user)
}

// Parallel (like Promise.all)
coroutineScope {
    val userDeferred  = async { fetchUser(id) }
    val tasksDeferred = async { fetchTasks(id) }
    val user  = userDeferred.await()
    val tasks = tasksDeferred.await()
}
```

---

## 5. Jetpack Compose — Modern Android UI

```kotlin
import androidx.compose.runtime.*
import androidx.compose.material3.*
import androidx.compose.foundation.layout.*

// Composable function = React component
@Composable
fun TaskRow(task: Task, onComplete: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = task.isCompleted,
            onCheckedChange = { onComplete(task.id) }
        )
        Text(
            text = task.title,
            style = if (task.isCompleted)
                MaterialTheme.typography.bodyMedium.copy(
                    textDecoration = TextDecoration.LineThrough
                )
            else MaterialTheme.typography.bodyMedium
        )
    }
}

// ViewModel — survives configuration changes (screen rotation)
class TaskViewModel : ViewModel() {
    private val _tasks = MutableStateFlow<List<Task>>(emptyList()) // like useState
    val tasks: StateFlow<List<Task>> = _tasks.asStateFlow()        // read-only exposed

    fun loadTasks() {
        viewModelScope.launch {          // coroutine scoped to ViewModel lifecycle
            _tasks.value = repository.getTasks()
        }
    }

    fun completeTask(id: String) {
        _tasks.update { tasks ->
            tasks.map { if (it.id == id) it.copy(isCompleted = true) else it }
        }
    }
}

@Composable
fun TaskListScreen(viewModel: TaskViewModel = viewModel()) {
    val tasks by viewModel.tasks.collectAsState()  // observe StateFlow

    LazyColumn {                                    // like RecyclerView / FlatList
        items(tasks, key = { it.id }) { task ->
            TaskRow(task = task, onComplete = viewModel::completeTask)
        }
    }

    LaunchedEffect(Unit) {               // like useEffect — runs on first composition
        viewModel.loadTasks()
    }
}
```

---

## 6. Networking (Both Platforms)

### Swift — async/await with URLSession

```swift
struct APIClient {
    let baseURL = URL(string: "https://api.example.com")!

    func fetchTasks() async throws -> [TaskResponse] {
        let url = baseURL.appendingPathComponent("/tasks")
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse
        }

        return try JSONDecoder().decode([TaskResponse].self, from: data)
    }

    func createTask(title: String) async throws -> TaskResponse {
        var request = URLRequest(url: baseURL.appendingPathComponent("/tasks"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["title": title])

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(TaskResponse.self, from: data)
    }
}

// Usage
Task {
    do {
        let tasks = try await APIClient().fetchTasks()
    } catch {
        print("Error: \(error)")
    }
}
```

### Kotlin — Retrofit (most popular Android HTTP library)

```kotlin
// Define the API interface
interface TaskApi {
    @GET("/tasks")
    suspend fun getTasks(): List<Task>

    @POST("/tasks")
    suspend fun createTask(@Body request: CreateTaskRequest): Task

    @DELETE("/tasks/{id}")
    suspend fun deleteTask(@Path("id") id: String)
}

// Build Retrofit client
val retrofit = Retrofit.Builder()
    .baseUrl("https://api.example.com")
    .addConverterFactory(GsonConverterFactory.create())  // or Moshi
    .build()

val api = retrofit.create(TaskApi::class.java)

// Use in ViewModel (suspend = async)
viewModelScope.launch {
    try {
        val tasks = api.getTasks()    // awaits automatically (suspend function)
        _tasks.value = tasks
    } catch (e: Exception) {
        // handle error
    }
}
```

---

## 7. Data Persistence (Both Platforms)

```text
iOS options:
  UserDefaults     — small key/value data (settings, preferences) — like localStorage
  Keychain         — secure storage (passwords, tokens) — encrypted
  Core Data        — Apple's ORM — complex, powerful, but verbose
  SwiftData        — modern Core Data (Swift-first, macros) — iOS 17+
  SQLite via GRDB  — lightweight SQL — good for complex data

Android options:
  SharedPreferences — small key/value data — like localStorage
  EncryptedSharedPreferences — secure version (tokens)
  Room             — SQLite ORM (official, well-supported)
  DataStore        — modern replacement for SharedPreferences (Kotlin Flow integration)
  SQLite direct    — low-level
```

```swift
// SwiftData (iOS 17+) — like Drizzle for iOS
import SwiftData

@Model
class Task {
    var id: UUID
    var title: String
    var isCompleted: Bool

    init(title: String) {
        self.id = UUID()
        self.title = title
        self.isCompleted = false
    }
}

// Query (like db.select().from(tasks))
@Query var tasks: [Task]

// Insert
modelContext.insert(Task(title: "Buy milk"))
try? modelContext.save()
```

```kotlin
// Room (Android) — like Drizzle for Android
@Entity(tableName = "tasks")
data class Task(
    @PrimaryKey val id: String,
    val title: String,
    val isCompleted: Boolean = false,
)

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks")
    fun getTasks(): Flow<List<Task>>   // Flow = reactive stream

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(task: Task)

    @Delete
    suspend fun delete(task: Task)
}

@Database(entities = [Task::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
}
```

---

## 8. App Lifecycle & Navigation

### iOS App Lifecycle

```text
Not Running → Active (app launches)
Active → Inactive → Background (user presses home)
Background → Suspended (OS may kill if memory needed)

SwiftUI: use .onAppear / .onDisappear on views (like useEffect)
UIKit: AppDelegate/SceneDelegate lifecycle methods
```

### iOS Navigation (SwiftUI)

```swift
NavigationStack {
    List(tasks, id: \.id) { task in
        NavigationLink(destination: TaskDetailView(task: task)) {
            TaskRow(task: task)
        }
    }
    .navigationTitle("Tasks")
    .navigationBarItems(trailing: Button("Add") { ... })
}

// Programmatic navigation (like useNavigate)
@State private var path = NavigationPath()

NavigationStack(path: $path) {
    ContentView()
        .navigationDestination(for: Task.self) { task in
            TaskDetailView(task: task)
        }
}

path.append(selectedTask)   // navigate to task detail
path.removeLast()           // go back
```

### Android Navigation (Jetpack Navigation Compose)

```kotlin
val navController = rememberNavController()

NavHost(navController = navController, startDestination = "tasks") {
    composable("tasks") {
        TaskListScreen(navController = navController)
    }
    composable("tasks/{id}") { backStackEntry ->
        val id = backStackEntry.arguments?.getString("id")
        TaskDetailScreen(taskId = id)
    }
}

// Navigate
navController.navigate("tasks/$taskId")
navController.popBackStack()    // go back
```

---

## 9. Common Interview Questions

### "What is the difference between a struct and a class in Swift?"

> Structs are value types — copying a struct creates an independent copy (like primitive values in JS). Classes are reference types — copying creates a reference to the same object (like objects in JS). Structs are preferred in Swift for model data (Tasks, Users) because they avoid shared mutable state bugs. Classes are used when you need identity (same instance across references), inheritance, or `deinit`. SwiftUI views are structs.

### "What are Swift optionals and why do they exist?"

> An optional represents a value that may or may not be present. Swift has no implicit null — variables are non-optional by default (can never be nil), unless declared with `?`. This forces you to explicitly handle the nil case, preventing null reference crashes. Unwrap with `if let`, `guard let`, optional chaining (`?.`), or nil coalescing (`??`). Force unwrap (`!`) is a code smell — it crashes on nil.

### "What are Kotlin coroutines?"

> Coroutines are Kotlin's concurrency mechanism — like JavaScript's async/await but more powerful. A `suspend` function can be paused without blocking a thread, freeing it for other work. Coroutines run in scopes (ViewModelScope, LifecycleScope) which cancel them automatically when the scope is destroyed. `Dispatchers.IO` runs work on a background thread; `Dispatchers.Main` runs on the UI thread. `async/await` enables parallel execution; `Flow` provides reactive streams like RxJS Observables.

### "What is the Android Activity lifecycle?"

> Activities (screens) go through states: Created → Started → Resumed (visible and interactive) → Paused → Stopped → Destroyed. Common pitfalls: starting network requests in `onCreate` that complete after `onStop` (update destroyed UI). In modern Jetpack Compose with ViewModel: the ViewModel survives configuration changes (rotation), so keep data there. Observe with `collectAsState()` — the UI reacts when data changes.

### "How is SwiftUI similar to React?"

> Both are declarative UI frameworks where you describe what the UI should look like based on state, and the framework handles updates. `@State` in SwiftUI = `useState` in React. `@ObservedObject` / `@StateObject` = external state (like Zustand). `@EnvironmentObject` = React Context. Views (structs with a `body` property) = components. The rendering engine diffs the view tree and applies minimal updates. `task { }` modifier = `useEffect`. The key difference: SwiftUI is compiled and runs on-device with no virtual DOM.
