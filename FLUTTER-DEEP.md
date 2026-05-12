# Flutter — Senior Developer Deep Reference
**Priority: LOW**

> Covers: Dart language, Flutter widget system, state management, navigation, async, native channels, and interview questions.

---

## Table of Contents

1. [Flutter Architecture](#1-flutter-architecture)
2. [Dart — The Language](#2-dart--the-language)
3. [Widgets — Everything is a Widget](#3-widgets--everything-is-a-widget)
4. [State Management](#4-state-management)
5. [Navigation (Go Router)](#5-navigation-go-router)
6. [Async in Dart](#6-async-in-dart)
7. [Networking & Data](#7-networking--data)
8. [Platform Channels](#8-platform-channels)
9. [Performance](#9-performance)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. Flutter Architecture

### How Flutter works

```text
Unlike React Native (which maps to native components),
Flutter renders its OWN widgets using the Skia/Impeller graphics engine.
It doesn't use native UI components — it draws everything pixel by pixel.

Architecture layers:
  Flutter Framework (Dart):  widgets, rendering, animation, gestures
  Flutter Engine (C++):      Skia/Impeller rendering, Dart runtime, platform channels
  Embedder:                  platform-specific code (iOS/Android/Web/Desktop)

Key consequence:
  ✓ Pixel-perfect consistency across platforms
  ✓ Custom UI is easy — Flutter renders the same way everywhere
  ✗ Doesn't look "native" by default — uses Material (Android) or Cupertino (iOS) design systems
  ✗ Large initial app size (~5MB overhead from the engine)

Dart compiles to:
  Native ARM code (iOS/Android) — AOT compilation → fast performance
  JavaScript (Web) — via dart2js
  Native x64 (Desktop) — direct compilation

Three trees:
  Widget tree:  what you write — immutable descriptions (blueprints)
  Element tree: mutable instances that track widget state + lifecycle
  Render tree:  actual layout and painting objects
  
  This is similar to React's fiber tree but with explicit separation.
```

---

## 2. Dart — The Language

### Dart for JavaScript developers

```dart
// Variables
var name = 'Alice';          // type inferred (String)
String email = 'a@b.com';   // explicit type
final pi = 3.14159;          // immutable (like const — set once at runtime)
const maxItems = 100;        // compile-time constant (true constant)

// Null safety (like TypeScript strict null checks)
String name = 'Alice';       // non-nullable — can NEVER be null
String? email = null;        // nullable — may be null

// Null operators
email?.length                // null if email is null (like JS ?.)
email ?? 'no email'          // fallback if null (like JS ??)
email!.length                // force non-null — throws if null (avoid)

// String interpolation
final message = 'Hello, $name!';            // variable
final result  = 'Result: ${2 + 2}';        // expression
final multiline = '''
  This is a
  multiline string
''';

// Functions
int add(int a, int b) => a + b;              // arrow function (single expression)
int multiply(int a, int b) { return a * b; } // block body

// Named and optional parameters
void greet({required String name, String greeting = 'Hello'}) {
  print('$greeting, $name!');
}
greet(name: 'Alice');                        // named parameter
greet(name: 'Alice', greeting: 'Hi');

// Positional optional parameters
String repeat(String s, [int times = 2]) => s * times;
repeat('ab');        // 'abab'
repeat('ab', 3);     // 'ababab'
```

### Dart types

```dart
// Lists
List<String> tasks = ['Buy milk', 'Walk dog'];
tasks.add('Read book');
tasks.remove('Buy milk');
tasks.length;              // 2
tasks.first;               // 'Walk dog'
tasks.last;

// Maps (like JS objects / Map)
Map<String, dynamic> user = {'name': 'Alice', 'age': 30};
user['email'] = 'alice@example.com';
user.containsKey('name');  // true

// Sets
Set<String> tags = {'flutter', 'dart', 'mobile'};
tags.add('web');
tags.contains('dart');     // true

// Spread operator (like JS)
final combined = [...list1, ...list2];
final merged   = {...map1, ...map2};

// Collection if/for
final items = [
  'Base item',
  if (isLoggedIn) 'Premium item',  // conditional inclusion
  for (final tag in tags) '#$tag', // spread from for loop
];

// Classes
class Task {
  final String id;
  final String title;
  bool isCompleted;

  Task({required this.id, required this.title, this.isCompleted = false});

  // Factory constructor (like a static factory method)
  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(id: json['id'], title: json['title'],
                isCompleted: json['is_completed'] ?? false);
  }

  // copyWith pattern (immutable update — like object spread)
  Task copyWith({String? title, bool? isCompleted}) {
    return Task(id: id, title: title ?? this.title,
                isCompleted: isCompleted ?? this.isCompleted);
  }

  Map<String, dynamic> toJson() => {
    'id': id, 'title': title, 'is_completed': isCompleted,
  };
}

// Mixins (add behavior without inheritance)
mixin Timestamped {
  DateTime get createdAt => DateTime.now();
}

class Task with Timestamped { ... }

// Extensions (add methods to existing types — like JS prototype, but safe)
extension StringExtensions on String {
  String capitalize() => '${this[0].toUpperCase()}${substring(1)}';
  bool get isEmail => contains('@') && contains('.');
}

'hello'.capitalize();  // 'Hello'
'user@example.com'.isEmail;  // true
```

---

## 3. Widgets — Everything is a Widget

### StatelessWidget vs StatefulWidget

```dart
// StatelessWidget: no mutable state — like a pure React component
class TaskRow extends StatelessWidget {
  final Task task;
  final VoidCallback onTap;

  const TaskRow({super.key, required this.task, required this.onTap});

  @override
  Widget build(BuildContext context) {      // build = render
    return ListTile(
      leading: Icon(
        task.isCompleted ? Icons.check_circle : Icons.circle_outlined,
        color: task.isCompleted ? Colors.green : Colors.grey,
      ),
      title: Text(
        task.title,
        style: task.isCompleted
          ? const TextStyle(decoration: TextDecoration.lineThrough)
          : null,
      ),
      onTap: onTap,
    );
  }
}

// StatefulWidget: has mutable state — like a class component (or useState)
class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  List<Task> _tasks = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadTasks();          // like componentDidMount / useEffect([])
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);   // setState triggers rebuild (like React setState)
    final tasks = await TaskService.fetchTasks();
    setState(() {
      _tasks = tasks;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tasks')),
      body: _isLoading
        ? const Center(child: CircularProgressIndicator())
        : ListView.builder(
            itemCount: _tasks.length,
            itemBuilder: (context, index) => TaskRow(
              task: _tasks[index],
              onTap: () => _completeTask(_tasks[index]),
            ),
          ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addTask,
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

### Layout widgets

```dart
// Column: vertical stack (like flexDirection: column)
Column(
  mainAxisAlignment: MainAxisAlignment.center,     // like justifyContent
  crossAxisAlignment: CrossAxisAlignment.start,    // like alignItems
  children: [
    const Text('Title'),
    const SizedBox(height: 8),                     // fixed spacer
    const Text('Subtitle'),
  ],
)

// Row: horizontal stack (like flexDirection: row)
Row(
  mainAxisAlignment: MainAxisAlignment.spaceBetween,
  children: [
    const Icon(Icons.task),
    Expanded(child: Text(task.title)),             // like flex: 1
    const Text('Done'),
  ],
)

// Stack: overlapping (like position: absolute)
Stack(
  children: [
    Image.network(url),                            // base layer
    Positioned(
      bottom: 8, right: 8,
      child: const Icon(Icons.play_arrow),         // overlay
    ),
  ],
)

// Container: like <div> with styling
Container(
  width: double.infinity,
  padding: const EdgeInsets.all(16),
  margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(12),
    boxShadow: [
      BoxShadow(color: Colors.black12, blurRadius: 8, offset: const Offset(0, 2)),
    ],
  ),
  child: const Text('Content'),
)

// GridView
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 2,         // 2 columns
    crossAxisSpacing: 8,
    mainAxisSpacing: 8,
    childAspectRatio: 1.5,
  ),
  itemCount: items.length,
  itemBuilder: (context, index) => ItemCard(item: items[index]),
)
```

---

## 4. State Management

### Provider (simple, official recommendation for most apps)

```dart
// pubspec.yaml: provider: ^6.1.2

// 1. Create a ChangeNotifier (like an observable Zustand store)
class TaskNotifier extends ChangeNotifier {
  List<Task> _tasks = [];
  bool _isLoading = false;

  List<Task> get tasks => _tasks;
  bool get isLoading => _isLoading;

  Future<void> loadTasks() async {
    _isLoading = true;
    notifyListeners();               // like setState — triggers rebuild

    _tasks = await TaskService.fetchTasks();
    _isLoading = false;
    notifyListeners();
  }

  void completeTask(String id) {
    _tasks = _tasks.map((t) =>
      t.id == id ? t.copyWith(isCompleted: true) : t
    ).toList();
    notifyListeners();
  }
}

// 2. Provide at root (like Context Provider)
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => TaskNotifier(),
      child: const MyApp(),
    ),
  );
}

// 3. Consume in widgets
class TaskListScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<TaskNotifier>(
      builder: (context, notifier, child) {
        if (notifier.isLoading) return const CircularProgressIndicator();
        return ListView.builder(
          itemCount: notifier.tasks.length,
          itemBuilder: (_, i) => TaskRow(
            task: notifier.tasks[i],
            onTap: () => notifier.completeTask(notifier.tasks[i].id),
          ),
        );
      },
    );
  }
}

// Or with context.watch / context.read (more concise)
class TaskListScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<TaskNotifier>(); // subscribe (rebuild on change)
    // context.read<TaskNotifier>() — access without subscribing (for callbacks)

    return ListView.builder(
      itemCount: notifier.tasks.length,
      itemBuilder: (_, i) => Text(notifier.tasks[i].title),
    );
  }
}
```

### Riverpod (modern, recommended for complex apps)

```dart
// pubspec.yaml: flutter_riverpod: ^2.5.1

import 'package:flutter_riverpod/flutter_riverpod.dart';

// Provider (like a Zustand store or TanStack Query)
final taskListProvider = AsyncNotifierProvider<TaskListNotifier, List<Task>>(
  TaskListNotifier.new,
);

class TaskListNotifier extends AsyncNotifier<List<Task>> {
  @override
  Future<List<Task>> build() async {
    return TaskService.fetchTasks();      // initial fetch
  }

  Future<void> completeTask(String id) async {
    await TaskService.completeTask(id);
    ref.invalidateSelf();                 // refetch (like queryClient.invalidateQueries)
  }
}

// ConsumerWidget (like a component that uses hooks)
class TaskListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(taskListProvider);

    return tasksAsync.when(
      loading: () => const CircularProgressIndicator(),
      error: (err, stack) => Text('Error: $err'),
      data: (tasks) => ListView.builder(
        itemCount: tasks.length,
        itemBuilder: (_, i) => TaskRow(
          task: tasks[i],
          onTap: () => ref.read(taskListProvider.notifier).completeTask(tasks[i].id),
        ),
      ),
    );
  }
}
```

---

## 5. Navigation (Go Router)

```dart
// pubspec.yaml: go_router: ^14.0.0

import 'package:go_router/go_router.dart';

final router = GoRouter(
  initialLocation: '/tasks',
  routes: [
    GoRoute(
      path: '/tasks',
      builder: (context, state) => const TaskListScreen(),
      routes: [
        GoRoute(
          path: ':id',                                    // /tasks/123
          builder: (context, state) => TaskDetailScreen(
            taskId: state.pathParameters['id']!,
          ),
        ),
      ],
    ),
    GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
    ShellRoute(                                           // shared layout (tab bar)
      builder: (context, state, child) => ShellScaffold(child: child),
      routes: [ ... ],
    ),
  ],
  redirect: (context, state) {
    final isLoggedIn = AuthService.isLoggedIn;
    if (!isLoggedIn && state.matchedLocation != '/login') return '/login';
    return null;
  },
);

// Usage
context.go('/tasks');              // replace current route
context.push('/tasks/123');        // push (can go back)
context.pop();                     // go back
context.go('/tasks', extra: task); // pass extra data
```

---

## 6. Async in Dart

```dart
// Future = Promise
Future<User> fetchUser(String id) async {
  final response = await http.get(Uri.parse('/api/users/$id'));
  if (response.statusCode != 200) throw Exception('Failed to load user');
  return User.fromJson(jsonDecode(response.body));
}

// Parallel (like Promise.all)
final results = await Future.wait([
  fetchUser('1'),
  fetchTasks('1'),
]);

// Try/catch — same as JS
try {
  final user = await fetchUser(id);
} catch (e) {
  print('Error: $e');
} finally {
  setState(() => isLoading = false);
}

// Stream = Observable / AsyncGenerator
// Produces multiple values over time
Stream<List<Task>> watchTasks() async* {  // async* = stream generator
  while (true) {
    yield await fetchTasks();
    await Future.delayed(const Duration(seconds: 30));
  }
}

// Listen to a stream
StreamBuilder<List<Task>>(
  stream: watchTasks(),
  builder: (context, snapshot) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return const CircularProgressIndicator();
    }
    if (snapshot.hasError) return Text('Error: ${snapshot.error}');
    final tasks = snapshot.data ?? [];
    return ListView.builder(
      itemCount: tasks.length,
      itemBuilder: (_, i) => Text(tasks[i].title),
    );
  },
)

// FutureBuilder — for one-time async operations
FutureBuilder<User>(
  future: fetchUser(id),
  builder: (context, snapshot) {
    return switch (snapshot.connectionState) {
      ConnectionState.waiting => const CircularProgressIndicator(),
      _ => snapshot.hasData
        ? Text(snapshot.data!.name)
        : Text('Error: ${snapshot.error}'),
    };
  },
)
```

---

## 7. Networking & Data

```dart
// pubspec.yaml: http: ^1.2.0   OR   dio: ^5.4.0 (more powerful)
import 'package:http/http.dart' as http;
import 'dart:convert';

class TaskService {
  static const baseUrl = 'https://api.example.com';

  static Future<List<Task>> fetchTasks() async {
    final response = await http.get(
      Uri.parse('$baseUrl/tasks'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode != 200) {
      throw Exception('Failed: ${response.statusCode}');
    }
    final List<dynamic> json = jsonDecode(response.body);
    return json.map((j) => Task.fromJson(j)).toList();
  }

  static Future<Task> createTask(String title) async {
    final response = await http.post(
      Uri.parse('$baseUrl/tasks'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'title': title}),
    );
    return Task.fromJson(jsonDecode(response.body));
  }
}

// Local storage
import 'package:shared_preferences/shared_preferences.dart';  // like AsyncStorage

final prefs = await SharedPreferences.getInstance();
prefs.setString('token', jwtToken);
prefs.getString('token');
prefs.remove('token');

// SQLite via sqflite
import 'package:sqflite/sqflite.dart';

final db = await openDatabase('tasks.db', version: 1,
  onCreate: (db, version) async {
    await db.execute('''
      CREATE TABLE tasks(
        id TEXT PRIMARY KEY, title TEXT, is_completed INTEGER
      )
    ''');
  },
);

await db.insert('tasks', task.toMap());
final rows = await db.query('tasks', where: 'is_completed = ?', whereArgs: [0]);
```

---

## 8. Platform Channels

```dart
// Call native code from Dart (when Dart package doesn't exist)
import 'package:flutter/services.dart';

class BiometricService {
  static const _channel = MethodChannel('com.yourapp/biometric');

  static Future<bool> authenticate() async {
    try {
      return await _channel.invokeMethod<bool>('authenticate') ?? false;
    } on PlatformException catch (e) {
      print('Biometric error: ${e.message}');
      return false;
    }
  }
}

// iOS implementation (Swift)
// In AppDelegate.swift or dedicated FlutterPlugin
let channel = FlutterMethodChannel(name: "com.yourapp/biometric",
                                   binaryMessenger: controller.binaryMessenger)
channel.setMethodCallHandler { call, result in
  if call.method == "authenticate" {
    // Use LocalAuthentication framework
    result(true)
  }
}

// Android implementation (Kotlin)
MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.yourapp/biometric")
  .setMethodCallHandler { call, result ->
    if (call.method == "authenticate") {
      // Use BiometricPrompt
      result.success(true)
    }
  }
```

---

## 9. Performance

```text
Flutter performance principles:

1. const constructors everywhere possible
   const Text('Hello')  — Flutter reuses the same widget instance across rebuilds.
   Without const: new object created on every build() call.

2. Build methods must be fast and pure
   No async work, no heavy computation, no side effects in build().
   Use initState(), didUpdateWidget(), or providers for setup.

3. Use ListView.builder / GridView.builder for long lists
   .builder = lazy — creates only visible items.
   ListView(children: [...]) = creates all children immediately.

4. RepaintBoundary — isolate expensive widgets from repaints
   Wrap expensive widget that doesn't change often:
   RepaintBoundary(child: ExpensiveChart())

5. Avoid rebuilding large subtrees
   Move state as low in the tree as possible.
   Consumer<Provider> wrapping only what needs to rebuild.

6. Use Dart DevTools
   Flutter Inspector:  visualize widget tree
   Performance view:  identify jank (dropped frames — red = below 60fps)
   Memory view:       detect memory leaks
   CPU profiler:      find expensive code
```

```dart
// const widget (reused — no allocation on rebuild)
const SizedBox(height: 16)
const Divider()
const Icon(Icons.check)

// Builder pattern — limits rebuild scope
ListenableBuilder(
  listenable: myNotifier,
  builder: (context, child) {
    return Text(myNotifier.value);  // only this rebuilds on change
  },
  child: const ExpensiveStaticWidget(), // not rebuilt
)
```

---

## 10. Common Interview Questions

### "How is Flutter different from React Native?"

> Flutter renders its own widgets using the Skia/Impeller graphics engine — it doesn't use native platform components. React Native maps components to actual native views (UIView, android.view.View). Flutter's approach: pixel-perfect consistency across platforms, truly identical UI everywhere. React Native's approach: native look and feel automatically since it uses the OS's own widgets. Flutter = custom renderer; React Native = native renderer bridge.

### "What is the widget tree, element tree, and render tree?"

> Flutter maintains three parallel trees. The widget tree is what you write in Dart — immutable blueprints recreated on every build. The element tree is the persistent, mutable tree of instances that Flutter maintains between builds — elements hold the actual state and child references. The render tree handles actual layout and painting. When you call setState(), Flutter rebuilds the widget subtree, the element tree diffs it against the previous build, and the render tree updates only what changed.

### "What is the difference between StatelessWidget and StatefulWidget?"

> StatelessWidget has no mutable state — its build method is purely a function of its constructor arguments (like a pure React component). StatefulWidget has a companion State object that persists between rebuilds and can call setState() to trigger re-renders. Today, you can often avoid StatefulWidget by using state management solutions (Provider, Riverpod) — keep StatefulWidget for truly local UI state (animations, forms, local toggles).

### "Explain Dart's null safety."

> Dart has sound null safety — the type system statically guarantees no null reference exceptions. Non-nullable types (`String`) can never be null; nullable types (`String?`) might be null. The compiler enforces null checks before you access a nullable value. This eliminates an entire class of runtime crashes. The `?` (null-aware access), `??` (null coalescing), `!` (force unwrap — risky), and `late` keyword (non-null but initialized later) are the main tools.

### "What is a Future vs a Stream in Dart?"

> A `Future` represents a single asynchronous value — it completes once with either a value or an error (like a JavaScript Promise). A `Stream` is a sequence of asynchronous events over time — it can emit many values, then optionally complete or error (like an RxJS Observable or JavaScript async generator). Use `Future` for one-time operations (HTTP request, file read). Use `Stream` for ongoing data (WebSocket messages, database listeners, real-time updates).

### "What state management would you choose for a Flutter app?"

> For small-to-medium apps: `Provider` with `ChangeNotifier` is straightforward and officially recommended. For larger apps with complex async state: `Riverpod` — it's like TanStack Query + Zustand combined, type-safe, testable, with built-in caching and async state handling. Avoid `setState` for anything shared between screens — it doesn't scale. Bloc/Cubit is popular in enterprise teams (explicit events and states), but has more boilerplate than Riverpod.
