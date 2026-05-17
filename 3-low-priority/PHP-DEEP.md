# PHP — Senior Developer Deep Reference

> Covers PHP internals, OOP, type system, generators, fibers, and Laravel for web backends.

---

## Table of Contents

1. [PHP Internals & Runtime](#1-php-internals--runtime)
2. [Type System & Type Safety](#2-type-system--type-safety)
3. [OOP — Deep Dive](#3-oop--deep-dive)
4. [Closures & First-Class Functions](#4-closures--first-class-functions)
5. [Generators & Fibers](#5-generators--fibers)
6. [Error Handling](#6-error-handling)
7. [Laravel — Web Backend](#7-laravel--web-backend)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. PHP Internals & Runtime

### Zend Engine & Request Lifecycle

```text
PHP request lifecycle (traditional FPM mode):
  1. Web server (Nginx/Apache) receives HTTP request
  2. Passes to PHP-FPM worker (a pool of pre-forked processes)
  3. PHP bootstraps: parses .php file → opcodes → executes
  4. Returns response → worker process resets state for next request
  ‼️ Each request starts with a clean state — no shared memory between requests by default
  ‼️ This is why PHP is "share nothing" — stateless per request

OPcache:
  - Caches compiled opcodes in shared memory across requests
  - First request: parse → compile → cache; subsequent: read from cache
  - ‼️ Always enable OPcache in production — 2–10× performance improvement
  - php.ini: opcache.enable=1, opcache.memory_consumption=256, opcache.validate_timestamps=0

PHP-FPM process pools:
  pm = dynamic               ; spawn workers dynamically
  pm.max_children = 50       ; max worker processes
  pm.start_servers = 5
  pm.min_spare_servers = 5
  pm.max_spare_servers = 35
  ‼️ Each worker = one PHP process; max_children limits concurrency
  ‼️ For high concurrency: use ReactPHP/Swoole (async event loop) or RoadRunner (persistent workers)
```

### Memory Model

```php
// PHP is copy-on-write — variables share storage until one is modified
$a = [1, 2, 3, 4, 5]; // one array in memory
$b = $a;               // no copy yet — both reference same zval
$b[] = 6;              // NOW the array is copied — $a unchanged ‼️

// Reference variables — explicit aliasing
$a = 10;
$b = &$a;   // $b is an alias for $a, same zval
$b = 20;
echo $a;    // 20 — both changed ‼️

// ‼️ References can cause subtle bugs — avoid unless necessary (array manipulation)
// unset($b) removes the alias but doesn't affect $a
```

---

## 2. Type System & Type Safety

### Strict Types & Type Declarations

```php
<?php
declare(strict_types=1); // ‼️ enables strict type checking for this file only

// Parameter types, return types, property types
function divide(int $a, int $b): float {
    if ($b === 0) throw new DivisionByZeroError("Division by zero");
    return $a / $b;
}

divide(10, 3);      // ✓ 3.333...
// divide("10", 3); // ✗ TypeError in strict mode; would coerce without strict_types

// Nullable types
function findUser(int $id): ?User {  // ‼️ ? means can return User or null
    return $this->repo->find($id);   // null if not found
}

// Union types (PHP 8.0+)
function process(int|string $value): int|string {
    return is_int($value) ? $value * 2 : strtoupper($value);
}

// Intersection types (PHP 8.1+) — value must satisfy ALL types
function serialize(Stringable&JsonSerializable $obj): string { ... }

// never return type (PHP 8.1+) — function always throws or exits
function fail(string $msg): never {
    throw new RuntimeException($msg); // must always throw or die()
}

// Enum (PHP 8.1+) — backed or pure
enum Status: string {
    case Active   = 'active';
    case Inactive = 'inactive';
    case Pending  = 'pending';

    public function label(): string {
        return match($this) {
            Status::Active   => 'Active User',
            Status::Inactive => 'Inactive User',
            Status::Pending  => 'Pending Approval',
        };
    }
}
$status = Status::Active;
$status->value;   // 'active'
$status->label(); // 'Active User'
Status::from('active'); // Status::Active — throws ValueError if invalid
Status::tryFrom('bad');  // null — safe version ‼️
```

### Type Juggling Pitfalls

```php
// ‼️ Without strict_types, PHP coerces types aggressively
var_dump(0 == "foo");    // true in PHP 7 (!!), false in PHP 8 ‼️ (breaking change)
var_dump(0 == "");       // true in PHP 7, false in PHP 8 ‼️
var_dump("1" == "01");   // true — both cast to int
var_dump("10" == "1e1"); // true — scientific notation

// ‼️ Always use === for type-safe comparison
var_dump(0 === "foo");   // false — correct
var_dump(1 === true);    // false — int vs bool

// JSON decode gotchas
$data = json_decode('{"id": 0}');
if ($data->id) { ... }   // ✗ 0 is falsy — won't enter block
if ($data->id !== null) { ... } // ✓ explicit check

// ‼️ switch uses loose comparison — use match (PHP 8.0+) for strict
$val = "0";
switch ($val) {
    case false: echo "false branch"; break; // ‼️ "0" == false → enters this! Bad!
}

$result = match($val) {
    "0"  => "string zero",  // ✓ strict — won't match false
    false => "bool false",
};
```

---

## 3. OOP — Deep Dive

### Interfaces, Abstract Classes & Traits

```php
// Interface — contract, no implementation
interface PaymentGateway {
    public function charge(int $amountCents, string $currency): ChargeResult;
    public function refund(string $chargeId): bool;
}

// Abstract class — partial implementation, can't instantiate
abstract class BaseRepository {
    abstract protected function getTableName(): string;

    public function findById(int $id): ?array {
        return $this->db->query(
            "SELECT * FROM {$this->getTableName()} WHERE id = ?", [$id]
        )->fetch();
    }
}

// Trait — horizontal code reuse (mixin)
// ‼️ Traits are copy-pasted into the class by the compiler
trait Timestampable {
    private ?DateTime $createdAt = null;
    private ?DateTime $updatedAt = null;

    public function touch(): void {
        $this->updatedAt = new DateTime();
        if ($this->createdAt === null) {
            $this->createdAt = new DateTime();
        }
    }

    public function getCreatedAt(): ?DateTime { return $this->createdAt; }
}

class User extends BaseRepository {
    use Timestampable;               // inject trait methods ‼️
    use SoftDeletable;               // multiple traits
    implements Auditable;            // interfaces separate

    protected function getTableName(): string { return 'users'; }
}

// ‼️ Trait conflict resolution
class C {
    use A, B {
        A::hello insteadof B;  // use A's hello, not B's
        B::hello as helloFromB; // still available via alias
    }
}
```

### Late Static Binding

```php
class ParentModel {
    public static function create(): static {
        return new static(); // ‼️ late static binding — creates the actual called class
    }

    public static function className(): string {
        return static::class; // ‼️ static:: resolves to called class at runtime
        // self::class would always return 'ParentModel'
    }
}

class ChildModel extends ParentModel {}

$child = ChildModel::create();     // returns ChildModel instance ‼️
echo ChildModel::className();      // 'ChildModel' ‼️
// With self::, create() would return ParentModel, className() would return 'ParentModel'
```

### Magic Methods

```php
class MagicClass {
    private array $data = [];

    public function __get(string $name): mixed {
        return $this->data[$name] ?? null; // called on accessing undefined property
    }

    public function __set(string $name, mixed $value): void {
        $this->data[$name] = $value; // called on setting undefined property
    }

    public function __isset(string $name): bool {
        return isset($this->data[$name]); // called by isset() / empty()
    }

    public function __toString(): string {
        return json_encode($this->data); // called when cast to string
    }

    public function __invoke(mixed ...$args): mixed {
        return call_user_func($this->data['handler'], ...$args); // makes object callable
    }

    public function __clone(): void {
        // called after clone — deep clone nested objects
        $this->data = array_map(fn($v) => is_object($v) ? clone $v : $v, $this->data);
    }

    // ‼️ __call / __callStatic — intercept method calls for proxies, decorators
    public function __call(string $name, array $args): mixed {
        if (str_starts_with($name, 'findBy')) {
            $field = lcfirst(substr($name, 6));
            return $this->where($field, $args[0])->get();
        }
        throw new BadMethodCallException("Method $name does not exist");
    }
}
```

---

## 4. Closures & First-Class Functions

```php
// Closure — anonymous function, can capture from outer scope
$multiplier = 3;
$multiply = function(int $n) use ($multiplier): int {
    return $n * $multiplier; // ‼️ use captures by VALUE — $multiplier is copied
};

// Capture by reference
$count = 0;
$increment = function() use (&$count): void {
    $count++; // ‼️ modifies the outer $count
};
$increment();
$increment();
echo $count; // 2

// Arrow functions (PHP 7.4+) — automatically capture outer scope by value
$factor = 5;
$fn = fn(int $x): int => $x * $factor; // ‼️ no use() needed, captures by value implicitly

// First-class callable syntax (PHP 8.1+)
$arr = [3, 1, 2];
usort($arr, strcmp(...));   // pass strlen as Closure
array_map(strtoupper(...), $arr);

// Higher-order functions
$pipeline = array_reduce(
    [$validate, $sanitize, $transform],
    fn($carry, $fn) => fn($data) => $fn($carry($data)),
    fn($x) => $x  // identity — starting accumulator
);
$result = $pipeline($input);

// Bind Closure to different object
class Logger {
    private string $prefix = "[LOG]";
}
$formatter = Closure::bind(
    function(string $msg): string { return "$this->prefix $msg"; },
    new Logger(),
    Logger::class
);
echo $formatter("Hello"); // "[LOG] Hello"
```

---

## 5. Generators & Fibers

### Generators

```php
// Generator — lazy sequence, doesn't compute all values upfront
// ‼️ Yields one value at a time — memory efficient for large datasets

function fibonacci(): Generator {
    [$a, $b] = [0, 1];
    while (true) {
        yield $a;          // suspend, return value, resume on next()
        [$a, $b] = [$b, $a + $b];
    }
}

$fib = fibonacci();
for ($i = 0; $i < 10; $i++) {
    echo $fib->current() . " ";
    $fib->next();
}
// 0 1 1 2 3 5 8 13 21 34

// yield with keys
function indexedItems(): Generator {
    yield 'first'  => 'apple';
    yield 'second' => 'banana';
}

// yield from — delegate to another generator (PHP 7+)
function combined(): Generator {
    yield from [1, 2, 3];           // yield from array
    yield from inner();             // yield from another generator
    return 'done';                  // return value of generator (from getReturn())
}

// ‼️ Generators are used by: large CSV parsing, paginated DB queries, lazy pipelines
function readCsv(string $file): Generator {
    $handle = fopen($file, 'r');
    while (($row = fgetcsv($handle)) !== false) {
        yield $row; // one row at a time — not the whole file in memory ‼️
    }
    fclose($handle);
}
```

### Fibers (PHP 8.1+)

```php
// Fiber — cooperative concurrency primitive (like goroutine or green thread)
// ‼️ Fibers can pause execution mid-function and resume later
// Used to implement async/await style code without threads

$fiber = new Fiber(function(): void {
    echo "Start fiber\n";
    $value = Fiber::suspend("hello"); // ‼️ suspend and pass value to caller
    echo "Resumed with: $value\n";
    Fiber::suspend("world");
    echo "Fiber done\n";
});

$result1 = $fiber->start();        // "Start fiber", returns "hello"
$result2 = $fiber->resume("back"); // "Resumed with: back", returns "world"
$fiber->resume("end");             // "Fiber done"

// ‼️ Fibers are used by async frameworks (ReactPHP, Amp, Revolt) for cooperative multitasking
// Unlike coroutines in other languages, PHP Fibers don't have a built-in scheduler — use a library

// ReactPHP (event loop based, uses Fibers under the hood in v3+)
use React\EventLoop\Loop;
use React\Http\Browser;

$browser = new Browser();
$response = React\Async\await($browser->get('https://example.com'));
echo $response->getBody();
```

---

## 6. Error Handling

### Exceptions & Error Hierarchy

```php
// PHP 7+ exception hierarchy:
// Throwable
//   ├── Error (engine errors)
//   │   ├── TypeError
//   │   ├── ValueError
//   │   ├── ArithmeticError
//   │   │   └── DivisionByZeroError
//   │   └── ParseError
//   └── Exception (application errors)
//       ├── RuntimeException
//       ├── InvalidArgumentException
//       ├── LogicException
//       └── ... (custom)

// ‼️ Catch Throwable to catch both Error and Exception
try {
    riskyOperation();
} catch (SpecificException $e) {
    // handle specific case
} catch (Exception $e) {
    // handle other application exceptions
} catch (Error $e) {
    // handle engine errors (type errors, etc.)
} finally {
    // ‼️ always runs — clean up resources, close connections
    $conn->close();
}

// Custom exception hierarchy
class AppException extends RuntimeException {}
class ValidationException extends AppException {
    public function __construct(
        private readonly array $errors,
        string $message = "Validation failed"
    ) {
        parent::__construct($message);
    }

    public function getErrors(): array { return $this->errors; }
}

// set_exception_handler — global unhandled exception handler
set_exception_handler(function(Throwable $e): void {
    error_log($e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
});
```

---

## 7. Laravel — Web Backend

### Service Container & Dependency Injection

```php
// ‼️ Laravel's IoC container automatically resolves dependencies via reflection
// Type-hint a class in constructor → container instantiates and injects it

class OrderController extends Controller {
    public function __construct(
        private readonly OrderService $orderService,    // ‼️ auto-resolved
        private readonly PaymentGateway $gateway,      // ‼️ auto-resolved
    ) {}
}

// Binding interfaces to implementations in a ServiceProvider
class AppServiceProvider extends ServiceProvider {
    public function register(): void {
        // Bind interface → concrete class
        $this->app->bind(PaymentGateway::class, StripeGateway::class);

        // Singleton — same instance for all resolutions
        $this->app->singleton(CacheService::class, fn() => new RedisCache(config('cache')));

        // Contextual binding — different impl depending on who's requesting
        $this->app->when(InvoiceMailer::class)
                  ->needs(PaymentGateway::class)
                  ->give(InvoiceGateway::class);
    }
}
```

### Eloquent ORM

```php
// Model definition
class Order extends Model {
    protected $fillable = ['user_id', 'status', 'total'];
    protected $casts = [
        'total'      => 'decimal:2',
        'status'     => OrderStatus::class,   // cast to enum ‼️
        'metadata'   => 'array',              // auto JSON encode/decode
        'created_at' => 'datetime:Y-m-d',
    ];

    // Relationships
    public function user(): BelongsTo {
        return $this->belongsTo(User::class);
    }
    public function items(): HasMany {
        return $this->hasMany(OrderItem::class);
    }
    public function tags(): BelongsToMany {
        return $this->belongsToMany(Tag::class)->withTimestamps();
    }
    public function invoice(): HasOne {
        return $this->hasOne(Invoice::class);
    }
}

// Querying
$orders = Order::query()
    ->where('status', OrderStatus::Active)
    ->whereHas('items', fn($q) => $q->where('qty', '>', 5))
    ->with(['user', 'items'])        // ‼️ eager load — prevent N+1
    ->withCount('items')             // adds items_count attribute
    ->latest()                       // order by created_at desc
    ->paginate(20);

// ‼️ N+1 problem
$orders = Order::all();
foreach ($orders as $order) {
    echo $order->user->name; // ✗ 1 query per order — N+1!
}

$orders = Order::with('user')->get(); // ✓ 2 queries total — eager load

// Scopes — reusable query constraints
class Order extends Model {
    public function scopeActive(Builder $query): Builder {
        return $query->where('status', OrderStatus::Active);
    }
    public function scopeHighValue(Builder $query, int $min = 1000): Builder {
        return $query->where('total', '>=', $min);
    }
}

Order::active()->highValue(500)->get();

// Mass assignment safety
// ‼️ $fillable — whitelist of assignable columns
// ‼️ $guarded = [] — allow all (dangerous in user-input contexts)
Order::create($request->validated()); // validated() returns only validated fields
```

### Routing & Controllers

```php
// routes/api.php
Route::prefix('api')->middleware('api')->group(function () {

    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('orders', OrderController::class);
        // generates: GET /orders, POST /orders, GET /orders/{order},
        //            PUT /orders/{order}, DELETE /orders/{order}

        Route::get('/orders/{order}/invoice', [OrderController::class, 'invoice'])
             ->can('view', 'order'); // ‼️ inline authorization via policy
    });
});

// Controller with Form Request validation
class OrderController extends Controller {
    public function store(StoreOrderRequest $request): JsonResponse {
        // ‼️ $request->validated() only if StoreOrderRequest passes — else 422 auto-returned
        $order = $this->orderService->create($request->validated());
        return response()->json(new OrderResource($order), 201);
    }

    public function show(Order $order): JsonResponse {
        // ‼️ Route model binding — automatically finds Order by ID or returns 404
        $this->authorize('view', $order); // policy check
        return response()->json(new OrderResource($order->load('items')));
    }
}

// Form Request
class StoreOrderRequest extends FormRequest {
    public function rules(): array {
        return [
            'items'            => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.qty'      => ['required', 'integer', 'min:1'],
            'shipping_address' => ['required', 'string'],
        ];
    }
    public function authorize(): bool {
        return $this->user()->can('create', Order::class);
    }
}
```

### Queues, Events & Jobs

```php
// Job — unit of background work
class SendWelcomeEmail implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly User $user // ‼️ SerializesModels: stored by ID, re-fetched on execution
    ) {}

    public function handle(Mailer $mailer): void {
        $mailer->to($this->user->email)->send(new WelcomeMail($this->user));
    }

    public function failed(Throwable $e): void {
        // handle failure — notify admin, etc.
    }
}

// Dispatch
SendWelcomeEmail::dispatch($user);               // to default queue
SendWelcomeEmail::dispatch($user)->onQueue('emails')->delay(now()->addMinutes(5));

// Event + Listener pattern
class OrderPlaced {
    public function __construct(public readonly Order $order) {}
}

class SendOrderConfirmation {
    public function handle(OrderPlaced $event): void {
        // send email for $event->order
    }
}

// EventServiceProvider
protected $listen = [
    OrderPlaced::class => [
        SendOrderConfirmation::class,
        UpdateInventory::class,
        NotifyWarehouse::class,
    ],
];

// Firing event
event(new OrderPlaced($order));
// ‼️ All listeners called — or queued if they implement ShouldQueue
```

### Middleware

```php
// Custom middleware
class EnsureApiVersion {
    public function handle(Request $request, Closure $next, string $minVersion = '1.0'): Response {
        $version = $request->header('Api-Version', '1.0');
        if (version_compare($version, $minVersion, '<')) {
            return response()->json(['error' => 'API version too old'], 400);
        }
        return $next($request); // ‼️ pass to next middleware in chain
    }
}

// Register in bootstrap/app.php (Laravel 11+) or Kernel.php
$middleware->alias(['api.version' => EnsureApiVersion::class]);

// Apply to routes
Route::middleware(['auth:sanctum', 'api.version:2.0'])->group(function () { ... });
```

---

## 8. Common Interview Questions

```text
Q: What is the difference between == and === in PHP?
A: == — loose comparison with type coercion. "0" == false is true.
   === — strict comparison, same type AND value. "0" === false is false.
   ‼️ Always use === for comparisons. PHP 8 fixed some == gotchas but === is still safer.

Q: What are PHP Traits and when should you use them?
A: Traits are a code reuse mechanism for single-inheritance languages.
   They are copy-pasted into the class at compile time.
   Use for: cross-cutting concerns (timestamps, soft delete, audit logging).
   ✗ Avoid: overusing traits creates hidden dependencies. Prefer composition (injected services).

Q: What is the N+1 problem and how does Laravel solve it?
A: N+1: fetch N models, then run 1 query per model to load a relation = N+1 queries total.
   Solution: eager loading with ->with('relation') — fetches all relations in 2 queries.
   Detection: Laravel Debugbar, Clockwork, or DB::listen() in development.

Q: What is the difference between interface and abstract class?
A: Interface: pure contract, no implementation, multiple interface implementation allowed.
   Abstract class: partial implementation, single inheritance, can have constructor.
   ‼️ Use interface when defining a contract for unrelated classes.
   Use abstract class when sharing implementation among related classes.

Q: What is late static binding (LSB)?
A: static:: resolves to the class on which the method was called at runtime.
   self:: always refers to the class where the method is defined.
   Enables inherited static methods to work correctly with the child class.

Q: What are PHP Fibers and how do they differ from generators?
A: Generator: unidirectional — caller pulls values via yield, can send values in.
   Fiber: bidirectional, full stack — can suspend at any depth in the call stack, not just the top level.
   Fibers enable cooperative multitasking. Used by ReactPHP, Amp for async without threads.

Q: How does Laravel's service container work?
A: IoC container with reflection-based auto-wiring. Type-hint classes in constructors → container
   resolves the dependency graph automatically. bind() for interfaces, singleton() for single instances.
   Route model binding, controller injection, job constructor injection all use the container.

Q: What is the difference between ShouldQueue and dispatch()?
A: ShouldQueue on a Job/Listener/Notification pushes it to a queue (Redis, DB, SQS).
   Without ShouldQueue, dispatch() runs synchronously in the same request.
   ‼️ Always queue: emails, notifications, report generation, external API calls.
```
