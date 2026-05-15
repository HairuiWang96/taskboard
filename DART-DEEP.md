# Dart — Senior Developer Deep Reference

> Covers null safety, async/await, streams, isolates, generics, and Flutter for cross-platform UI.

---

## Table of Contents

1. [Type System & Null Safety](#1-type-system--null-safety)
2. [Async / Await & Futures](#2-async--await--futures)
3. [Streams](#3-streams)
4. [Isolates](#4-isolates)
5. [Generics & Collections](#5-generics--collections)
6. [Flutter — Widget System](#6-flutter--widget-system)
7. [State Management in Flutter](#7-state-management-in-flutter)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Type System & Null Safety

### Sound Null Safety

```dart
// ‼️ Dart's null safety is sound — the type system guarantees non-null types are non-null
// No NullPointerExceptions in sound null-safe code (only where you explicitly allow null)

String name = "Alice";   // non-nullable — can NEVER be null
String? nullable = null; // nullable — the ? suffix allows null

// Accessing nullable values
print(nullable?.length);          // null-aware access — returns null if nullable is null
print(nullable ?? "default");     // null coalescing — "default" if null
print(nullable!.length);          // null assertion — throws if null ‼️ avoid in production

// Late initialization — non-nullable, but initialized after declaration
late String config;               // not initialized yet — must be set before use
config = loadConfig();            // initialized later
print(config);                    // safe — throws LateInitializationError if accessed before set

// Late final — initialized once, then immutable
late final String id = generateId();

// Required named parameters
void createUser({required String name, required String email, int age = 0}) { }
createUser(name: "Alice", email: "a@a.com"); // age defaults to 0

// Promotion — flow analysis
String? maybeNull = getValue();
if (maybeNull != null) {
    print(maybeNull.length); // ‼️ promoted to String — no ? needed inside the if
}

// Pattern-based promotion (Dart 3)
if (maybeNull case final String s) {
    print(s.length);
}
```

### Type System Features

```dart
// typedef — alias for function types
typedef Transformer<T> = T Function(T input);
typedef JsonMap = Map<String, dynamic>;

Transformer<int> doubler = (n) => n * 2;

// Extension methods — add methods to existing types
extension StringExtensions on String {
    bool get isEmail => contains('@') && contains('.');
    String truncate(int max) => length <= max ? this : '${substring(0, max)}...';
}

"alice@example.com".isEmail  // true
"Hello World".truncate(5)    // "Hello..."

// Extension on nullable
extension NullableString on String? {
    String get orEmpty => this ?? '';
}

// Sealed classes (Dart 3)
sealed class Shape {}
class Circle extends Shape { final double radius; Circle(this.radius); }
class Rectangle extends Shape { final double w, h; Rectangle(this.w, this.h); }

// Exhaustive switch (Dart 3)
double area(Shape shape) => switch (shape) {
    Circle(radius: var r)     => 3.14 * r * r,
    Rectangle(w: var w, h: var h) => w * h,
};
// ‼️ Compiler enforces all cases — no default needed with sealed class
```

---

## 2. Async / Await & Futures

### Futures

```dart
// Future<T> — represents a value available in the future (like Promise in JS)
Future<String> fetchUser(int id) async {
    final response = await http.get(Uri.parse('https://api.example.com/users/$id'));
    if (response.statusCode != 200) throw Exception('Failed: ${response.statusCode}');
    return jsonDecode(response.body)['name'] as String;
}

// ‼️ async/await — syntactic sugar over Future chaining
// await suspends the current async function, not the isolate thread

// Parallel execution — run multiple futures concurrently
Future<void> loadDashboard() async {
    // ✗ Sequential — slow
    final user   = await fetchUser(1);
    final orders = await fetchOrders(1);

    // ✓ Concurrent — fast
    final results = await Future.wait([
        fetchUser(1),
        fetchOrders(1),
        fetchPrefs(1),
    ]);
    final user2   = results[0] as String;
    final orders2 = results[1] as List;
}

// Error handling
Future<String> safeGet(String url) async {
    try {
        final res = await http.get(Uri.parse(url));
        return res.body;
    } on SocketException {
        throw NetworkException('No internet');
    } catch (e) {
        throw AppException('Unexpected: $e');
    }
}

// Future.any — first to complete wins (race)
final fastest = await Future.any([
    fetchFromServer1(),
    fetchFromServer2(),
]);

// Future with timeout
final data = await fetchData().timeout(
    const Duration(seconds: 5),
    onTimeout: () => throw TimeoutException('Request timed out'),
);

// Completer — create a Future you resolve manually
Completer<String> completer = Completer();
// ...later...
completer.complete("result");       // resolve
completer.completeError(exception); // reject
Future<String> future = completer.future;
```

---

## 3. Streams

### Stream Basics

```dart
// Stream<T> — sequence of async events over time (like Observable in RxJS)
// ‼️ Single-subscription streams: only one listener (HTTP body, file read)
// ‼️ Broadcast streams: multiple listeners (user events, WebSocket)

// Creating streams
Stream<int> countUp(int n) async* {  // async* generator
    for (int i = 0; i < n; i++) {
        await Future.delayed(Duration(milliseconds: 100));
        yield i;  // ‼️ yield emits a value to the stream
    }
}

// Consuming streams
await for (final value in countUp(5)) {
    print(value);  // 0, 1, 2, 3, 4
}

// Stream.listen (lower-level, subscription-based)
final subscription = countUp(5).listen(
    (data)  => print('Value: $data'),
    onError: (e) => print('Error: $e'),
    onDone:  () => print('Complete'),
    cancelOnError: false,
);

// Cancel subscription — ‼️ important to prevent memory leaks
subscription.cancel();

// Stream transformations (lazy, composable)
countUp(20)
    .where((n) => n.isEven)
    .map((n) => n * n)
    .take(5)
    .listen(print);  // 0, 4, 16, 36, 64

// StreamController — manually emit events
final controller = StreamController<String>.broadcast();
controller.sink.add('hello');
controller.stream.listen(print);
controller.close();  // ‼️ always close to free resources

// StreamTransformer — reusable transformations
final deduplicate = StreamTransformer<String, String>.fromHandlers(
    handleData: (data, sink) {
        if (data != _last) { _last = data; sink.add(data); }
    },
);
```

---

## 4. Isolates

### Dart's Concurrency Model

```dart
// ‼️ Dart is single-threaded within an isolate — event loop drives async
// No shared memory between isolates — communication via message passing only
// This makes Dart inherently thread-safe (no race conditions between isolates)

// Single isolate: event loop processes microtasks then events
// Microtask queue: scheduled via scheduleMicrotask() — runs BEFORE next event
// Event queue: I/O callbacks, Timer, then() completions

// Spawn an isolate for CPU-intensive work
import 'dart:isolate';

Future<int> computeHeavy(int n) async {
    final receivePort = ReceivePort();
    await Isolate.spawn(_heavyWork, [receivePort.sendPort, n]);
    return await receivePort.first as int;
}

void _heavyWork(List<dynamic> args) {
    final sendPort = args[0] as SendPort;
    final n        = args[1] as int;
    // runs in a separate isolate — true parallelism ‼️
    int result = 0;
    for (int i = 0; i < n; i++) result += i;
    sendPort.send(result);
}

// Isolate.run (Dart 2.19+) — simpler API for one-off computation
final result = await Isolate.run(() {
    // This runs in a new isolate — automatically spawned and destroyed
    return heavyComputation();
});

// ‼️ Only primitive types and simple objects can be sent between isolates
// Classes must be simple (no closures over isolate state)
// Use: int, double, String, bool, List, Map, SendPort, Uint8List (zero-copy) ‼️

// Flutter's compute() — simplified Isolate.run for Flutter
final sorted = await compute(sortList, myLargeList);
```

---

## 5. Generics & Collections

```dart
// Generic class
class Stack<T> {
    final List<T> _items = [];
    void push(T item) => _items.add(item);
    T pop() => _items.removeLast();
    T get top => _items.last;
    bool get isEmpty => _items.isEmpty;
}

final stack = Stack<int>();
stack.push(1);
stack.push(2);
stack.pop();   // 2

// Bounded generics
T findLargest<T extends Comparable<T>>(List<T> items) {
    return items.reduce((a, b) => a.compareTo(b) > 0 ? a : b);
}

// ‼️ Reified generics — Dart retains type info at runtime (unlike Java)
List<String> strings = ["hello"];
print(strings is List<String>); // true ‼️ — works at runtime
print(strings is List<int>);    // false

// Collections
// List — ordered, indexed, O(1) random access
final list = <int>[1, 2, 3];
list.add(4);
list.addAll([5, 6]);
list.where((n) => n > 3).toList();  // [4, 5, 6]
list.map((n) => n * 2).toList();    // [2, 4, 6, 8, 10, 12]
list.fold(0, (sum, n) => sum + n);  // 21

// Set — unordered, unique elements, O(1) lookup
final set = <String>{"a", "b", "c"};
set.add("a");  // no-op — already exists
set.contains("b");  // true

// Map — key-value pairs
final map = <String, int>{"alice": 30, "bob": 25};
map["charlie"] = 35;
map.putIfAbsent("alice", () => 0);  // no-op — alice exists
map.update("bob", (age) => age + 1); // 26
map.entries.map((e) => "${e.key}: ${e.value}").join(", ");

// Spread and collection-if/for (Dart 2.3+)
final extras = [4, 5];
final combined = [1, 2, 3, ...extras, ...?nullableList];  // spread ‼️

final items = [
    "always",
    if (isAdmin) "admin-only",
    for (final i in range) "item_$i",  // collection-for ‼️
];
```

---

## 6. Flutter — Widget System

### Widget Tree & Rendering

```text
‼️ Flutter rendering pipeline:
  1. Widget tree  — immutable descriptions of UI (rebuilt on setState)
  2. Element tree — manages widget lifecycle, ties widgets to render objects
  3. Render tree  — handles layout, painting (comparable to DOM + CSS)

‼️ Widgets are cheap to create — they're just descriptions
  Flutter compares old and new widget trees (reconciliation) to update elements
  Only changed render objects get repainted

Three types of widgets:
  StatelessWidget — immutable, no internal state, pure function of inputs
  StatefulWidget  — has mutable state (State object), can call setState()
  InheritedWidget — propagates data down the tree efficiently
```

### Stateless & Stateful Widgets

```dart
// StatelessWidget — rebuilt whenever parent rebuilds with new data
class UserCard extends StatelessWidget {
    final User user;
    const UserCard({super.key, required this.user});  // ‼️ const constructor + key

    @override
    Widget build(BuildContext context) {
        return Card(
            child: ListTile(
                leading: CircleAvatar(child: Text(user.name[0])),
                title: Text(user.name),
                subtitle: Text(user.email),
            ),
        );
    }
}

// StatefulWidget — internal mutable state
class Counter extends StatefulWidget {
    const Counter({super.key});
    @override State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
    int _count = 0;

    @override
    void initState() {
        super.initState();
        // ‼️ initState: called once when widget is inserted. Don't call setState here.
    }

    @override
    void didUpdateWidget(Counter oldWidget) {
        super.didUpdateWidget(oldWidget);
        // ‼️ Called when parent rebuilds with new widget. Compare oldWidget vs widget.
    }

    @override
    void dispose() {
        // ‼️ Clean up: cancel subscriptions, dispose controllers, close streams
        super.dispose();
    }

    @override
    Widget build(BuildContext context) {
        return Column(children: [
            Text('$_count'),
            ElevatedButton(
                onPressed: () => setState(() => _count++),
                // ‼️ setState: marks widget dirty → triggers rebuild of this State's build()
                child: const Text('Increment'),
            ),
        ]);
    }
}
```

### Keys

```dart
// ‼️ Keys help Flutter identify widgets across rebuilds — same as React's key prop
// Without key: Flutter matches by position. With key: matches by key value.

// ValueKey — identity via a value
ListView.builder(
    itemBuilder: (ctx, i) => ListTile(
        key: ValueKey(items[i].id), // ‼️ stable key — enables correct reorder/insert
        title: Text(items[i].name),
    ),
);

// GlobalKey — access State/RenderBox from outside the widget tree ‼️ use sparingly
final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
Form(key: _formKey, child: ...);
_formKey.currentState!.validate(); // access form state externally

// UniqueKey — force full rebuild (new key = new element = fresh State)
// Useful for resetting state, like React's key trick
Image(key: UniqueKey(), image: NetworkImage(url)); // force fresh load
```

### Layout Widgets

```dart
// ‼️ Flutter layout: parent gives child constraints (min/max width/height)
// Child picks its size within those constraints
// Parent positions child

// Column/Row — linear layout
Column(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,  // vertical spacing
    crossAxisAlignment: CrossAxisAlignment.start,       // horizontal alignment
    children: [widget1, widget2],
);

// Expanded — takes remaining space in Flex (Column/Row)
Row(children: [
    const Text("Label"),
    Expanded(child: TextField()),  // TextField takes all remaining width ‼️
]);

// Flexible — like Expanded but can be smaller
Flexible(flex: 2, child: widgetA),  // takes 2/3 of space
Flexible(flex: 1, child: widgetB),  // takes 1/3 of space

// Stack — absolute positioning (like position: absolute in CSS)
Stack(children: [
    Image.network(url),
    Positioned(bottom: 8, right: 8, child: FloatingActionButton(...)),
]);

// LayoutBuilder — build based on available constraints
LayoutBuilder(builder: (context, constraints) {
    if (constraints.maxWidth > 600) return TabletLayout();
    return MobileLayout();
});
```

---

## 7. State Management in Flutter

### Provider (simple, built-in DI)

```dart
// ChangeNotifier — observable model
class CartModel extends ChangeNotifier {
    final List<Item> _items = [];
    List<Item> get items => List.unmodifiable(_items);
    double get total => _items.fold(0, (sum, i) => sum + i.price);

    void addItem(Item item) {
        _items.add(item);
        notifyListeners(); // ‼️ triggers rebuild of all listening widgets
    }
}

// Provide at the top of the tree
ChangeNotifierProvider(
    create: (_) => CartModel(),
    child: MyApp(),
);

// Consume
// context.watch — rebuilds when model changes
final cart = context.watch<CartModel>();

// context.read — no rebuild (use in callbacks)
context.read<CartModel>().addItem(item);

// Consumer — rebuild only the subtree that needs the data
Consumer<CartModel>(
    builder: (ctx, cart, child) => Text('${cart.items.length} items'),
);
```

### Riverpod (recommended)

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Provider definition — outside widgets
final userProvider = FutureProvider.family<User, int>((ref, id) async {
    return ref.watch(userRepositoryProvider).getUser(id);
});

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
    return CartNotifier();
});

class CartNotifier extends StateNotifier<CartState> {
    CartNotifier() : super(CartState.empty());

    void addItem(Item item) {
        state = state.copyWith(items: [...state.items, item]);
    }
}

// In widget — extend ConsumerWidget
class CartPage extends ConsumerWidget {
    @override
    Widget build(BuildContext context, WidgetRef ref) {
        final cart = ref.watch(cartProvider);    // reactive
        final user = ref.watch(userProvider(1)); // family provider

        return user.when(
            loading: () => CircularProgressIndicator(),
            error:   (e, st) => Text('Error: $e'),
            data:    (u) => Text('${u.name}: ${cart.items.length} items'),
        );
    }
}

// ‼️ ref.watch — subscribe (rebuild on change)
// ‼️ ref.read  — one-time read (callbacks, initState)
// ‼️ ref.listen — run side effect on change without rebuilding
```

---

## 8. Common Interview Questions

```text
Q: What is sound null safety and how does it differ from nullable types in other languages?
A: Dart's null safety is sound — the type system is proven correct at compile time.
   Non-nullable types (String) can NEVER be null anywhere in the program.
   Nullable types (String?) must be explicitly handled before use.
   Unlike Kotlin's !! or Java's Optional, no NullPointerException is possible in sound null-safe code
   (only where you explicitly use !, which opts back out of the guarantee).

Q: What is the difference between Future and Stream?
A: Future — single async value, either completes with a value or an error.
   Stream — sequence of async events over time, multiple values.
   Future is like a single async function call; Stream is like an async iterator.
   Stream can be single-subscription or broadcast.

Q: How does Dart achieve true parallelism?
A: Via Isolates — each isolate has its own heap and event loop. No shared memory.
   Communication via SendPort/ReceivePort (message passing). Isolate.run() for simple CPU work.
   ‼️ Within a single isolate, Dart is single-threaded — async/await does NOT create threads.

Q: What is the difference between const and final in Dart?
A: final — set once at runtime, value need not be known at compile time.
   const — compile-time constant, deeply immutable, canonicalized (same const == same object).
   const widgets are cached and reused — no rebuild, no allocation cost. ‼️ use const liberally.
   const MyWidget() — always returns the same object if called with same args.

Q: What is the difference between StatelessWidget and StatefulWidget?
A: StatelessWidget — immutable, rebuilt by parent, no internal state.
   StatefulWidget — has a mutable State object that persists across rebuilds.
   ‼️ State survives parent rebuilds; the StatefulWidget config object may be recreated.
   Use StatelessWidget when possible — simpler and faster.

Q: What does setState() do and when should you NOT call it?
A: setState() marks the State as dirty and schedules a rebuild of the build() method.
   Don't call setState() in: initState (use after addPostFrameCallback), dispose, build itself.
   ‼️ setState() on a disposed widget (after navigating away) → error. Check mounted first.
   if (mounted) setState(() { ... });

Q: Explain the Flutter widget/element/render object tree.
A: Widget tree — immutable configuration, rebuilt frequently. Cheap to create.
   Element tree — mutable, manages lifecycle, ties widget to render object. Persists.
   Render object tree — handles layout and painting. Expensive to create.
   Flutter reconciles the new widget tree against existing elements — reuses elements/render objects
   when possible (same widget type + key), creating new ones only when necessary.
```
