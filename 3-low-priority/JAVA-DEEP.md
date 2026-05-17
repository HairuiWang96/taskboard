# Java — Senior Developer Deep Reference

> Covers JVM internals, concurrency, generics, collections, design patterns, and Spring Boot for web backends.

---

## Table of Contents

1. [JVM & Memory Model](#1-jvm--memory-model)
2. [Generics & Type System](#2-generics--type-system)
3. [Concurrency](#3-concurrency)
4. [Streams & Functional Programming](#4-streams--functional-programming)
5. [Collections Deep Dive](#5-collections-deep-dive)
6. [Object-Oriented Design](#6-object-oriented-design)
7. [Modern Java (11–21)](#7-modern-java-1121)
8. [Spring Boot — Web Backend](#8-spring-boot--web-backend)
9. [Common Interview Questions](#9-common-interview-questions)

---

## 1. JVM & Memory Model

### JVM Memory Areas

```text
JVM runtime memory areas:
  ┌─────────────────────────────────┐
  │  Heap                           │  shared across threads
  │    Young Gen (Eden, S0, S1)     │  new objects → minor GC
  │    Old Gen (Tenured)            │  long-lived objects → major GC
  ├─────────────────────────────────┤
  │  Metaspace (≥ Java 8)          │  class metadata (off-heap)
  ├─────────────────────────────────┤
  │  Stack (per thread)             │  frames, local vars, operand stack
  │  PC Register (per thread)       │  current instruction pointer
  │  Native Method Stack            │  native (JNI) calls
  └─────────────────────────────────┘

‼️ String literals → String Pool (Heap, since Java 7)
‼️ Metaspace replaced PermGen — it grows automatically, no PermGen OOM
```

### Garbage Collection

```text
Generational hypothesis: most objects die young.

Minor GC (Young Gen):
  Eden fills → survivors copied to S0/S1 → after N cycles → promoted to Old Gen
  ‼️ Stop-the-world but very fast

Major / Full GC (Old Gen):
  ‼️ Stop-the-world, longer pause — avoid by reducing long-lived object creation

GC algorithms:
  Serial GC        → single thread, small apps
  Parallel GC      → multi-thread, throughput focus (Java 8 default)
  G1 GC            → low-pause, large heaps (Java 9+ default)
  ZGC / Shenandoah → sub-millisecond pause (Java 15+)

Key flags:
  -Xms512m -Xmx2g       // initial / max heap
  -XX:+UseG1GC          // use G1
  -XX:MaxGCPauseMillis=200  // target pause goal
```

### Java Memory Model (JMM)

```java
// JMM defines visibility and ordering guarantees across threads.

// Problem: without synchronization, writes in one thread may not be visible to another.
// CPU caches, instruction reordering can cause stale reads.

// volatile — ensures visibility, prevents reordering around the write/read
// ‼️ Does NOT guarantee atomicity for compound actions (check-then-act, i++)
volatile boolean running = true;

// ‼️ happens-before rule: if A happens-before B, A's writes are visible to B
// Sources of happens-before:
//   - Thread.start() happens-before any code in that thread
//   - synchronized block exit happens-before next thread's entry on same monitor
//   - volatile write happens-before subsequent volatile read of the same variable
//   - Thread.join() happens-before code after the join

// Double-checked locking — requires volatile ‼️
class Singleton {
    private static volatile Singleton instance; // ‼️ volatile required

    public static Singleton getInstance() {
        if (instance == null) {             // first check (no lock)
            synchronized (Singleton.class) {
                if (instance == null) {     // second check (with lock)
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
// Without volatile: instance assignment has 3 steps (alloc, init, assign ref).
// Compiler may publish reference before object is fully initialized → another thread
// sees non-null but partially constructed object.
```

---

## 2. Generics & Type System

### Erasure

```java
// ‼️ Java generics are erased at runtime — List<String> becomes List at bytecode level.
// No List<String>.class, no instanceof List<String>, no new T[]

// What IS preserved: method signatures in bytecode (for reflection)
// What is NOT preserved: runtime type info

List<String> strings = new ArrayList<>();
List<Integer> ints = new ArrayList<>();
System.out.println(strings.getClass() == ints.getClass()); // true — both ArrayList
```

### Bounded Wildcards — PECS

```java
// PECS: Producer Extends, Consumer Super ‼️
// If you READ from a structure → use extends (upper bounded)
// If you WRITE into a structure → use super (lower bounded)

// Producer (reading out) — upper bounded wildcard
void printAll(List<? extends Number> list) {
    for (Number n : list) System.out.println(n); // safe to read as Number
}
// Accepts List<Integer>, List<Double>, List<Number>

// Consumer (writing in) — lower bounded wildcard
void addNumbers(List<? super Integer> list) {
    list.add(1); list.add(2); // safe to add Integer or subtype
}
// Accepts List<Integer>, List<Number>, List<Object>

// ✗ Can't add to extends wildcard — compiler doesn't know exact type
void bad(List<? extends Number> list) {
    // list.add(1); // compile error — could be List<Double>
}
```

### Generic Methods & Type Inference

```java
// Generic method — type parameter on method
public static <T extends Comparable<T>> T max(T a, T b) {
    return a.compareTo(b) >= 0 ? a : b;
}

String result = max("apple", "banana"); // inferred T = String

// Bounded type parameter with multiple bounds
<T extends Serializable & Comparable<T>> void process(T item) { ... }
// ‼️ Class bound must come first, interfaces after
```

---

## 3. Concurrency

### synchronized & Locks

```java
// synchronized — intrinsic lock (monitor) on an object
// ‼️ Every Java object has a monitor — synchronized(obj) acquires it

// Method-level: locks on `this` (instance) or Class object (static)
synchronized void increment() { count++; }          // lock on this
static synchronized void staticMethod() { ... }    // lock on MyClass.class

// Block-level: more granular, prefer over whole-method
synchronized (lock) {
    // critical section
}

// ReentrantLock — explicit lock with more features
ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    // critical section
} finally {
    lock.unlock(); // ‼️ always in finally
}
// Advantages over synchronized:
//   - tryLock() — non-blocking attempt
//   - lockInterruptibly() — can be interrupted
//   - fairness parameter — FIFO ordering
//   - Condition variables for precise wait/signal
```

### volatile vs Atomic vs synchronized

```java
// volatile — visibility only, no atomicity
volatile int count = 0;
count++; // ‼️ NOT atomic — read-modify-write is 3 ops

// AtomicInteger — lock-free atomic via CAS (Compare-And-Swap)
AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet(); // atomic, no lock

// CAS — optimistic: read current value, compute new, swap only if unchanged
// ‼️ ABA problem: value changed A→B→A — CAS sees A and swaps, unaware of change
// Solution: AtomicStampedReference — includes version stamp

// synchronized — mutual exclusion + visibility, most overhead
// Choose:
//   Single variable updates → AtomicXxx
//   Visibility across threads → volatile
//   Multi-step critical sections → synchronized or ReentrantLock
```

### java.util.concurrent

```java
// ExecutorService — manage thread pools
ExecutorService pool = Executors.newFixedThreadPool(4);
Future<String> future = pool.submit(() -> expensiveCompute());
String result = future.get(); // blocks until done
pool.shutdown();

// ‼️ Prefer newFixedThreadPool for CPU-bound, newCachedThreadPool for short-lived I/O

// CompletableFuture — async pipelines (Java 8+)
CompletableFuture
    .supplyAsync(() -> fetchUser(id))         // runs in ForkJoinPool
    .thenApply(user -> enrich(user))          // transform result
    .thenCompose(user -> fetchOrders(user))   // flat-map another async
    .exceptionally(ex -> fallback())          // handle error
    .thenAccept(System.out::println);         // terminal consumer

// ‼️ thenApply = map (sync transform)
// ‼️ thenCompose = flatMap (avoids CompletableFuture<CompletableFuture<T>>)

// CountDownLatch — wait for N events
CountDownLatch latch = new CountDownLatch(3);
// In each worker: latch.countDown();
latch.await(); // blocks until count reaches 0

// CyclicBarrier — N threads meet at a barrier, then all proceed together
// Semaphore — control access to a pool of resources (N permits)

// BlockingQueue — producer-consumer
BlockingQueue<Task> queue = new LinkedBlockingQueue<>(100);
queue.put(task);    // blocks if full
Task t = queue.take(); // blocks if empty
```

### Virtual Threads (Java 21 — Project Loom)

```java
// ‼️ Virtual threads are lightweight JVM-managed threads
// OS threads: ~1MB stack, expensive context switch (~1µs)
// Virtual threads: ~few KB stack, JVM-managed (~ns scheduling), millions possible

// Platform thread
Thread t = new Thread(() -> doWork());

// Virtual thread
Thread vt = Thread.ofVirtual().start(() -> doWork());

// With ExecutorService
try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
    ex.submit(() -> handleRequest(req)); // each request gets its own virtual thread
}

// ‼️ Key insight: blocking I/O in a virtual thread does NOT block an OS thread.
// JVM unmounts the virtual thread from the carrier thread while blocked,
// freeing the OS thread to run other virtual threads.
// This makes thread-per-request as scalable as reactive/async code.

// ‼️ Don't pool virtual threads — creating them is cheap, pooling defeats the purpose
// ‼️ Avoid synchronized blocks that hold virtual threads — use ReentrantLock instead
//    (synchronized pins virtual thread to carrier thread, blocking it)
```

---

## 4. Streams & Functional Programming

### Stream Internals

```java
// Streams are lazy — intermediate operations build a pipeline, nothing runs until terminal

List<String> names = people.stream()       // source
    .filter(p -> p.age() > 18)             // intermediate — lazy
    .map(Person::name)                     // intermediate — lazy
    .sorted()                              // intermediate — lazy (stateful, must see all)
    .limit(10)                             // intermediate — short-circuits sorted
    .collect(Collectors.toList());         // terminal — triggers execution

// ‼️ Intermediate operations: filter, map, flatMap, distinct, sorted, peek, limit, skip
// ‼️ Terminal operations: collect, forEach, reduce, count, findFirst, anyMatch, toList (Java 16+)

// flatMap — flatten nested streams (like thenCompose for futures)
List<String> words = sentences.stream()
    .flatMap(s -> Arrays.stream(s.split(" "))) // each sentence → stream of words
    .collect(Collectors.toList());

// reduce — fold to single value
int sum = IntStream.rangeClosed(1, 100).reduce(0, Integer::sum);

// Collectors
Map<String, List<Person>> byCity = people.stream()
    .collect(Collectors.groupingBy(Person::city));

Map<Boolean, List<Person>> adultSplit = people.stream()
    .collect(Collectors.partitioningBy(p -> p.age() >= 18));
```

### Parallel Streams

```java
// .parallel() splits data across ForkJoinPool.commonPool() threads
List<Long> result = LongStream.rangeClosed(1, 1_000_000)
    .parallel()
    .filter(n -> isPrime(n))
    .boxed()
    .collect(Collectors.toList());

// ‼️ Use parallel only when:
//   - Source is splittable (ArrayList, arrays ✓  LinkedList, IO ✗)
//   - Operation is CPU-bound with no shared mutable state
//   - Dataset is large enough to offset fork/join overhead
//   - No ordering requirements (or ordered() explicitly set)

// ‼️ Avoid: parallel streams + synchronized, DB calls, thread-unsafe collectors
```

---

## 5. Collections Deep Dive

### HashMap Internals

```java
// HashMap = array of buckets (Node[]), each bucket is a linked list → tree if > 8 nodes

// put(key, value):
//   1. key.hashCode() → spread via hash(key) (XOR upper bits to reduce collisions)
//   2. index = hash & (capacity - 1)  [capacity is always power of 2]
//   3. If bucket empty → insert node
//   4. If collision → chain (linked list) or treeify (red-black tree if > 8)

// ‼️ Load factor default = 0.75 — resize (double) when 75% full
// Resize: rehash all entries into new array — expensive, avoid by pre-sizing:
Map<String, Integer> map = new HashMap<>(expectedSize * 4 / 3 + 1);

// ‼️ equals() and hashCode() contract:
//   - If a.equals(b) → a.hashCode() == b.hashCode()  MUST hold
//   - Reverse not required (hash collision allowed)
//   - ✗ Mutable fields in hashCode → key "disappears" after mutation

// TreeMap — sorted by key (NavigableMap), O(log n) all ops, uses red-black tree
// LinkedHashMap — insertion-order (or access-order for LRU cache)

// LRU Cache using LinkedHashMap ‼️ classic interview pattern
class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int maxSize;
    LRUCache(int maxSize) {
        super(maxSize, 0.75f, true); // accessOrder = true
        this.maxSize = maxSize;
    }
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > maxSize;
    }
}
```

### ConcurrentHashMap

```java
// ‼️ ConcurrentHashMap — thread-safe, no full-map locking
// Java 8+: locks at bucket level (128 segments → per-node synchronized)
// Reads: completely lock-free (volatile node references)
// Writes: synchronized on the head node of the affected bucket only

ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();

// Atomic compound operations
map.putIfAbsent("key", 1);
map.computeIfAbsent("key", k -> expensiveCompute(k));
map.merge("key", 1, Integer::sum); // atomic increment pattern

// ‼️ size() is approximate under concurrency — use mappingCount() for large maps
// ‼️ Iteration is weakly consistent — won't throw ConcurrentModificationException
//    but may or may not reflect updates during iteration
```

---

## 6. Object-Oriented Design

### SOLID in Java

```java
// S — Single Responsibility: one reason to change per class
// O — Open/Closed: open for extension (via interface/abstract), closed for modification
// L — Liskov Substitution: subtype must be usable where parent is expected
//     ✗ Square extends Rectangle breaks LSK: setWidth also changes height
// I — Interface Segregation: many small interfaces over one fat interface
// D — Dependency Inversion: depend on abstractions, not concretions

// DI example — inject interface, not implementation
class OrderService {
    private final PaymentGateway gateway; // interface
    OrderService(PaymentGateway gateway) { this.gateway = gateway; }
}
// Test: inject MockPaymentGateway
// Prod: inject StripePaymentGateway
```

### Common Patterns

```java
// Builder — for objects with many optional fields
Person person = new Person.Builder("Alice")
    .age(30).city("NYC").email("a@a.com")
    .build();

// Factory Method — delegate instantiation to subclass
abstract class Notification {
    abstract Channel createChannel(); // factory method
    void send(String msg) { createChannel().deliver(msg); }
}

// Strategy — swap algorithm at runtime
interface SortStrategy { void sort(int[] arr); }
class Context {
    private SortStrategy strategy;
    void setStrategy(SortStrategy s) { this.strategy = s; }
    void execute(int[] arr) { strategy.sort(arr); }
}

// Observer — event driven
interface Observer { void update(Event e); }
class EventBus {
    private List<Observer> observers = new ArrayList<>();
    void subscribe(Observer o) { observers.add(o); }
    void publish(Event e) { observers.forEach(o -> o.update(e)); }
}
```

---

## 7. Modern Java (11–21)

### Key Features

```java
// Records (Java 16) — immutable data carriers, auto-generates constructor, getters, equals, hashCode, toString
record Point(int x, int y) {}
Point p = new Point(1, 2);
p.x(); // getter
// ‼️ Records are implicitly final, extend Record, cannot extend other classes

// Sealed Classes (Java 17) — restrict which classes can extend/implement
sealed interface Shape permits Circle, Rectangle, Triangle {}
final class Circle implements Shape { double radius; }
final class Rectangle implements Shape { double w, h; }

// Pattern Matching for switch (Java 21)
double area = switch (shape) {
    case Circle c    -> Math.PI * c.radius() * c.radius();
    case Rectangle r -> r.w() * r.h();
    case Triangle t  -> 0.5 * t.base() * t.height();
};
// ‼️ Exhaustiveness checked at compile time — sealed types make this work

// Text Blocks (Java 15)
String json = """
        {
            "name": "Alice",
            "age": 30
        }
        """;

// Pattern Matching instanceof (Java 16)
if (obj instanceof String s && s.length() > 5) {
    System.out.println(s.toUpperCase()); // s already cast
}

// var (Java 10) — local variable type inference
var list = new ArrayList<String>(); // inferred as ArrayList<String>
// ‼️ Only for local variables, not fields, parameters, or return types
```

---

## 8. Spring Boot — Web Backend

### Dependency Injection & IoC

```java
// Spring IoC container manages beans (objects) and their dependencies.
// You declare what you need; Spring wires it.

@Service // stereotype → Spring creates and manages a singleton bean
public class OrderService {

    private final OrderRepository repo;
    private final EmailService emailService;

    // ‼️ Constructor injection preferred — dependencies explicit, immutable, testable
    public OrderService(OrderRepository repo, EmailService emailService) {
        this.repo = repo;
        this.emailService = emailService;
    }
}

// @Autowired on constructor is optional if only one constructor (Spring 4.3+)
// ✗ Field injection — hides dependencies, can't be used with immutability, hard to test

// Bean scopes:
//   @Scope("singleton") — default, one instance per Spring context
//   @Scope("prototype") — new instance per injection/request
//   @RequestScope       — one per HTTP request (web apps)
//   @SessionScope       — one per HTTP session
```

### REST Controllers

```java
@RestController   // = @Controller + @ResponseBody on all methods
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDto> getOrder(@PathVariable Long id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDto createOrder(@RequestBody @Valid CreateOrderRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public OrderDto updateOrder(@PathVariable Long id,
                                @RequestBody @Valid UpdateOrderRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrder(@PathVariable Long id) {
        service.delete(id);
    }
}

// ‼️ @Valid triggers Bean Validation (JSR-380) on request body
// ‼️ ResponseEntity gives full control over status, headers, body
```

### Spring Data JPA

```java
// Repository abstraction — Spring generates implementation at runtime
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Method name query derivation
    List<Order> findByStatusAndCustomerId(OrderStatus status, Long customerId);

    // JPQL — object-level query language
    @Query("SELECT o FROM Order o WHERE o.total > :min ORDER BY o.createdAt DESC")
    List<Order> findHighValueOrders(@Param("min") BigDecimal min);

    // Native SQL when needed
    @Query(value = "SELECT * FROM orders WHERE YEAR(created_at) = :year",
           nativeQuery = true)
    List<Order> findByYear(@Param("year") int year);

    // Pagination — return Page<T> or Slice<T>
    Page<Order> findByCustomerId(Long id, Pageable pageable);
}

// Usage with pagination
Pageable page = PageRequest.of(0, 20, Sort.by("createdAt").descending());
Page<Order> orders = repo.findByCustomerId(customerId, page);

// ‼️ N+1 problem — fetching a list then accessing lazy associations
// Fix 1: JOIN FETCH in JPQL
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id = :id")
Optional<Order> findWithItems(@Param("id") Long id);

// Fix 2: @EntityGraph
@EntityGraph(attributePaths = {"items", "customer"})
List<Order> findAll();

// ‼️ @Transactional — defines transaction boundaries
@Service
public class OrderService {
    @Transactional          // REQUIRED propagation (default) — joins existing or creates new
    public Order create(CreateOrderRequest req) { ... }

    @Transactional(readOnly = true) // optimizes: no dirty checking, read-only connection hint
    public List<Order> listAll() { ... }
}
```

### Spring Security

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())               // disable for stateless APIs
            .sessionManagement(sm -> sm
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}

// JWT filter pattern
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain) throws ... {
        String token = extractToken(req);
        if (token != null && jwtUtil.validate(token)) {
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                    jwtUtil.getUsername(token), null,
                    jwtUtil.getAuthorities(token));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        chain.doFilter(req, res);
    }
}
```

### Exception Handling

```java
// Global exception handler
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(EntityNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult().getFieldErrors()
            .stream().map(e -> e.getField() + ": " + e.getDefaultMessage())
            .toList();
        return new ErrorResponse("VALIDATION_FAILED", errors.toString());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleAll(Exception ex) {
        log.error("Unhandled exception", ex);
        return new ErrorResponse("INTERNAL_ERROR", "Something went wrong");
    }
}
```

---

## 9. Common Interview Questions

```text
Q: What is the difference between == and equals()?
A: == compares references (or primitives). equals() compares logical equality (overridden in String, Integer, etc.)
   ‼️ Autoboxing trap: Integer a = 127; Integer b = 127; a == b is true (cached).
      Integer a = 128; Integer b = 128; a == b is false (not cached). Always use equals().

Q: String, StringBuilder, StringBuffer?
A: String — immutable, thread-safe, cached in pool.
   StringBuilder — mutable, NOT thread-safe, fastest for single-threaded concatenation.
   StringBuffer — mutable, thread-safe (synchronized), use only when needed across threads.

Q: What is the difference between Comparable and Comparator?
A: Comparable — natural ordering, implemented by the class itself (compareTo).
   Comparator — external ordering, passed to sort() or TreeMap.
   Use Comparator when you don't control the class or need multiple orderings.

Q: Checked vs unchecked exceptions?
A: Checked (IOException, SQLException) — must be declared or caught, for recoverable conditions.
   Unchecked (RuntimeException, NullPointerException) — programmer errors, no forced handling.
   ‼️ Modern practice: use unchecked exceptions; checked exceptions add boilerplate and leak abstraction.

Q: What does final mean in Java?
A: On variable: reference cannot be reassigned (object is still mutable).
   On method: cannot be overridden.
   On class: cannot be extended.
   ‼️ final field + immutable object = truly immutable.

Q: What is the contract between equals() and hashCode()?
A: If a.equals(b) then a.hashCode() == b.hashCode(). Must override both together.
   Violating this breaks HashMap/HashSet lookups.

Q: @Transactional — what is the default propagation and why does self-invocation break it?
A: Default is REQUIRED (join existing or create new).
   Self-invocation bypasses the Spring proxy, so @Transactional on the called method is ignored.
   Fix: inject the bean into itself, or use AspectJ weaving, or restructure.

Q: How does Spring Boot auto-configuration work?
A: @SpringBootApplication includes @EnableAutoConfiguration.
   Spring scans META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
   for @Configuration classes annotated with @ConditionalOnClass, @ConditionalOnMissingBean, etc.
   These fire only when conditions are met — e.g., DataSource auto-config only if a JDBC driver is on classpath.
```
