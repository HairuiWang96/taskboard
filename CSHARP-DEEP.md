# C# — Senior Developer Deep Reference

> Covers CLR internals, async/await, LINQ, generics, pattern matching, and ASP.NET Core for web backends.

---

## Table of Contents

1. [CLR & Memory Model](#1-clr--memory-model)
2. [Type System — Value vs Reference](#2-type-system--value-vs-reference)
3. [async / await Internals](#3-async--await-internals)
4. [LINQ Internals](#4-linq-internals)
5. [Generics, Delegates & Events](#5-generics-delegates--events)
6. [Pattern Matching & Modern C#](#6-pattern-matching--modern-c)
7. [ASP.NET Core — Web Backend](#7-aspnet-core--web-backend)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. CLR & Memory Model

### Managed Heap & GC

```text
CLR Heap Generations:
  Gen 0 — new small objects, collected most frequently (< 85 KB)
  Gen 1 — survived Gen 0 → buffer between short and long-lived
  Gen 2 — long-lived objects, collected least often
  LOH   — Large Object Heap (≥ 85 KB by default), collected with Gen 2
           ‼️ LOH is NOT compacted by default → fragmentation risk

GC is triggered when:
  - Gen 0 budget exhausted
  - GC.Collect() called explicitly
  - System is low on memory

‼️ Stop-the-world for Gen 0/1 is very fast (< 1 ms)
‼️ Gen 2 / LOH collections are slow — minimize large or long-lived allocations

Finalization:
  Objects with finalizers (~Destructor) → placed in finalization queue before collection
  ‼️ Adds extra GC cycle — use IDisposable + Dispose() pattern instead
  ‼️ GC.SuppressFinalize(this) after Dispose to skip finalizer run
```

### IDisposable Pattern

```csharp
// Dispose pattern for unmanaged resources
public class FileProcessor : IDisposable
{
    private FileStream _stream;
    private bool _disposed = false;

    public FileProcessor(string path)
    {
        _stream = File.OpenRead(path);
    }

    // Public Dispose
    public void Dispose()
    {
        Dispose(disposing: true);
        GC.SuppressFinalize(this); // ‼️ prevent finalizer from running
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing)
        {
            _stream?.Dispose(); // managed resources
        }
        // release unmanaged resources here if any
        _disposed = true;
    }

    ~FileProcessor() // finalizer — safety net only
    {
        Dispose(disposing: false);
    }
}

// ‼️ using statement = try/finally calling Dispose automatically
using var fp = new FileProcessor("data.txt");
// fp.Dispose() called at end of scope even if exception thrown
```

---

## 2. Type System — Value vs Reference

### Value Types vs Reference Types

```csharp
// Value types: struct, int, bool, double, char, enum, record struct
// Stored on the stack (when local vars) or inline in the containing object
// Assignment copies the value

struct Point { public int X; public int Y; }
Point a = new Point { X = 1, Y = 2 };
Point b = a; // full copy
b.X = 99;
Console.WriteLine(a.X); // 1 — a is unchanged ‼️

// Reference types: class, interface, delegate, string, array, record class
// Stored on the heap; variable holds a reference (pointer)
// Assignment copies the reference

class PointRef { public int X; public int Y; }
PointRef a = new PointRef { X = 1, Y = 2 };
PointRef b = a; // copy reference
b.X = 99;
Console.WriteLine(a.X); // 99 — both point to same object ‼️

// ‼️ string is immutable reference type — behaves like value type logically
// Interning: string literals are pooled, string.Intern() for runtime strings
```

### ref, out, in

```csharp
// ref — pass by reference, must be initialized before call
void Swap(ref int a, ref int b) { int t = a; a = b; b = t; }
Swap(ref x, ref y);

// out — pass by reference, caller doesn't need to initialize
bool TryParse(string s, out int result) {
    // result must be assigned before return
    return int.TryParse(s, out result);
}
if (TryParse("42", out int val)) Console.WriteLine(val);

// in — pass by reference, read-only inside method (avoids copying large structs)
void Process(in LargeStruct data) {
    // data.Field = 1; // ✗ compile error — read-only
    Console.WriteLine(data.Field);
}
```

---

## 3. async / await Internals

### How async/await works

```csharp
// async/await is syntactic sugar — the compiler transforms the method into a state machine.
// The method is split at each await point into continuation callbacks.

// Original code:
async Task<string> FetchDataAsync(string url)
{
    var client = new HttpClient();
    string html = await client.GetStringAsync(url); // suspension point
    return html.ToUpper();
}

// What the compiler generates (conceptually):
// A state machine struct with:
//   - State field (which await we left off at)
//   - MoveNext() called on each resumption
//   - Continuation registered on the awaitable's completion

// ‼️ await does NOT block the thread
// When GetStringAsync completes → thread pool resumes MoveNext() from where it left off
// The calling thread is freed to do other work while awaiting

// ‼️ ConfigureAwait(false) — don't capture synchronization context on resume
// Use in library code to avoid deadlocks and improve performance
string html = await client.GetStringAsync(url).ConfigureAwait(false);
// Without it in ASP.NET (old), resumption would try to re-enter the HTTP request context → deadlock

// ‼️ Deadlock pattern (classic ASP.NET, WPF):
// Don't .Result or .Wait() on async methods in a sync context
// This blocks the thread while the continuation needs that same thread → deadlock
string bad = FetchDataAsync(url).Result; // ✗ potential deadlock
```

### Task vs ValueTask

```csharp
// Task<T> — heap-allocated, reference type, always new allocation
// ValueTask<T> — struct, avoids allocation when result is synchronous

// Use ValueTask when the method frequently returns synchronously (cache hit)
public ValueTask<User> GetUserAsync(int id)
{
    if (_cache.TryGetValue(id, out var user))
        return ValueTask.FromResult(user); // no allocation
    return new ValueTask<User>(FetchFromDbAsync(id)); // allocates Task
}

// ‼️ ValueTask can only be awaited once — don't store it and await multiple times
// ‼️ Don't .Result a ValueTask — use await

// Parallel async
var tasks = ids.Select(id => GetUserAsync(id));
User[] users = await Task.WhenAll(tasks);

// First to complete
Task<string> result = await Task.WhenAny(task1, task2, task3);

// Cancellation pattern
async Task DoWorkAsync(CancellationToken ct)
{
    ct.ThrowIfCancellationRequested();
    await Task.Delay(1000, ct); // respects cancellation
    var data = await FetchAsync(ct);
}
using var cts = new CancellationTokenSource(timeout: TimeSpan.FromSeconds(5));
await DoWorkAsync(cts.Token);
```

---

## 4. LINQ Internals

### Deferred Execution

```csharp
// LINQ query operators on IEnumerable<T> are lazy — they return IEnumerable wrappers
// Execution happens only when iterated (foreach, ToList, Count, First, etc.)

IEnumerable<int> query = numbers
    .Where(n => n > 10)       // lazy — no execution yet
    .Select(n => n * 2);      // lazy — no execution yet

// Each foreach call re-executes the entire pipeline from source ‼️
foreach (var n in query) { ... } // executes now
foreach (var n in query) { ... } // executes again — source re-iterated

// Materialize to avoid re-execution:
List<int> result = query.ToList(); // executes once, stores in list

// LINQ to SQL / EF Core — expression trees, not delegates
// IQueryable<T> — query translated to SQL at execution time
IQueryable<Order> orders = dbContext.Orders
    .Where(o => o.Status == "Active")   // builds SQL WHERE clause
    .OrderBy(o => o.CreatedAt);         // builds SQL ORDER BY
var list = await orders.ToListAsync();  // sends SQL, executes

// ‼️ IEnumerable<T> LINQ — executes in memory (after data is fetched)
// ‼️ IQueryable<T> LINQ — translates to DB query (EF Core uses expression trees)
// Mixing: calling .AsEnumerable() mid-query pulls data into memory, rest in C#
```

### Common LINQ Patterns

```csharp
// GroupBy
var grouped = orders
    .GroupBy(o => o.CustomerId)
    .Select(g => new { CustomerId = g.Key, Total = g.Sum(o => o.Amount) });

// Aggregate (custom reduce)
int product = numbers.Aggregate(1, (acc, n) => acc * n);

// Zip — pair up two sequences
var pairs = names.Zip(scores, (name, score) => $"{name}: {score}");

// SelectMany — flatten nested collections
var allItems = orders.SelectMany(o => o.Items);

// Distinct, Except, Intersect, Union — set operations
// ‼️ Use with IEqualityComparer<T> for custom types
var unique = orders.Distinct(new OrderEqualityComparer());

// Lookup — like GroupBy but indexed (one-to-many dictionary)
ILookup<string, Order> byStatus = orders.ToLookup(o => o.Status);
IEnumerable<Order> active = byStatus["Active"];
```

---

## 5. Generics, Delegates & Events

### Covariance and Contravariance

```csharp
// Covariance (out) — can use more derived type than specified
// IEnumerable<out T> — safe to return T, you only produce T
IEnumerable<Dog> dogs = new List<Dog>();
IEnumerable<Animal> animals = dogs; // ✓ covariant — Dog is Animal

// Contravariance (in) — can use less derived type than specified
// Action<in T> — safe to accept T, you only consume T
Action<Animal> feedAnimal = a => Console.WriteLine($"Feeding {a.Name}");
Action<Dog> feedDog = feedAnimal; // ✓ contravariant — feeding any Animal works for Dog

// ‼️ Arrays in C# are covariant but NOT safe — runtime ArrayTypeMismatchException
Animal[] animals2 = new Dog[5];
animals2[0] = new Cat(); // ✗ runtime exception! — why generics exist

// Custom covariant/contravariant interfaces
interface IProducer<out T> { T Produce(); }      // only returns T → covariant
interface IConsumer<in T> { void Consume(T item); } // only accepts T → contravariant
```

### Delegates & Events

```csharp
// Delegate — type-safe function pointer
delegate int Transformer(int x);
Transformer doubler = x => x * 2;
int result = doubler(5); // 10

// Built-in delegate types:
//   Func<T, TResult>    — takes T, returns TResult
//   Action<T>           — takes T, returns void
//   Predicate<T>        — takes T, returns bool
//   Comparison<T>       — for sorting

// Multicast delegate — invoke chain of methods
Action logger = () => Console.WriteLine("A");
logger += () => Console.WriteLine("B");
logger(); // prints A then B

// Event — controlled multicast delegate
// ‼️ Difference: events can only be += / -= externally; delegates can be reassigned
public class Button
{
    public event EventHandler<ClickEventArgs> Clicked; // event

    protected virtual void OnClicked(ClickEventArgs e) =>
        Clicked?.Invoke(this, e); // ‼️ ?. is thread-safer than null check + invoke

    public void Click() => OnClicked(new ClickEventArgs());
}

button.Clicked += (s, e) => Console.WriteLine("Clicked!");
// button.Clicked = null; // ✗ compile error — can't reassign event externally
```

---

## 6. Pattern Matching & Modern C#

### Pattern Matching

```csharp
// switch expression (C# 8+)
string Describe(object obj) => obj switch
{
    int n when n < 0     => "negative",
    int n                => $"positive int: {n}",
    string s             => $"string: {s}",
    null                 => "null",
    _                    => "other"        // discard pattern
};

// Property patterns (C# 8+)
string Classify(Order order) => order switch
{
    { Status: "Active", Amount: > 1000 } => "high-value active",
    { Status: "Active" }                 => "active",
    { Status: "Cancelled" }              => "cancelled",
    _                                    => "unknown"
};

// Positional patterns with records (C# 9+)
record Point(int X, int Y);
string Quadrant(Point p) => p switch
{
    (> 0, > 0) => "Q1",
    (< 0, > 0) => "Q2",
    (< 0, < 0) => "Q3",
    (> 0, < 0) => "Q4",
    _          => "Origin"
};

// List patterns (C# 11+)
bool StartsWithOne(int[] arr) => arr is [1, ..];
bool ExactlyTwo(int[] arr) => arr is [_, _];
```

### Records

```csharp
// record (class) — immutable reference type with value equality, C# 9+
record Person(string Name, int Age); // positional record — primary constructor

Person alice = new("Alice", 30);
Person alice2 = new("Alice", 30);
Console.WriteLine(alice == alice2); // true — value equality ‼️

// non-destructive mutation
Person olderAlice = alice with { Age = 31 }; // new record, alice unchanged

// record struct (C# 10) — value type with value equality
record struct Point(double X, double Y);

// ‼️ records vs classes:
//   records: immutable by convention, value equality, ToString, Deconstruct
//   classes: mutable, reference equality by default
```

### Span\<T\> and Memory

```csharp
// Span<T> — stack-allocated view over contiguous memory (no heap allocation)
// ‼️ Cannot be stored on heap (no fields, no async, no lambdas capturing it)
Span<int> slice = stackalloc int[10]; // stack allocated
Span<int> arr = new int[] { 1, 2, 3, 4 };
Span<int> mid = arr[1..3]; // slice — NO copy, just a view

// ReadOnlySpan<char> — powerful for string parsing without allocations
void ParseCsv(ReadOnlySpan<char> line)
{
    while (line.Length > 0)
    {
        int comma = line.IndexOf(',');
        ReadOnlySpan<char> field = comma >= 0 ? line[..comma] : line;
        ProcessField(field); // no string allocation
        line = comma >= 0 ? line[(comma + 1)..] : [];
    }
}

// Memory<T> — heap-allocated version, safe for async
Memory<byte> buffer = new byte[4096];
int bytesRead = await stream.ReadAsync(buffer);
```

---

## 7. ASP.NET Core — Web Backend

### Middleware Pipeline

```csharp
// ‼️ ASP.NET Core is middleware-based — each middleware can short-circuit or pass through
// Order matters: request flows down, response flows back up

var app = builder.Build();

app.UseExceptionHandler("/error");   // outermost — catches all exceptions
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();             // ‼️ must come before Authorization
app.UseAuthorization();
app.MapControllers();

// Custom middleware
app.Use(async (context, next) =>
{
    // Before: log incoming request
    var sw = Stopwatch.StartNew();
    await next(context);             // call next middleware
    // After: log response time
    Console.WriteLine($"{context.Request.Path} — {sw.ElapsedMilliseconds}ms");
});

// Terminal middleware (short-circuit)
app.Run(async context =>
{
    await context.Response.WriteAsync("Hello World"); // doesn't call next
});
```

### Dependency Injection

```csharp
// Three lifetimes:
builder.Services.AddTransient<IEmailService, SmtpEmailService>();
//   ‼️ Transient — new instance every time it's requested
//      Use for lightweight, stateless services

builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
//   ‼️ Scoped — one instance per HTTP request (shared within the request)
//      Use for DbContext, unit-of-work patterns

builder.Services.AddSingleton<ICache, RedisCache>();
//   ‼️ Singleton — one instance for the app lifetime
//      Use for thread-safe, expensive-to-create services (HTTP clients, caches)

// ‼️ Captive dependency anti-pattern: singleton depending on scoped service
// Singleton lives longer → scoped service is never disposed properly → bugs
// Fix: use IServiceScopeFactory to create scopes manually inside singleton

// Options pattern — strongly typed configuration
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));

public class EmailService
{
    private readonly SmtpOptions _options;
    public EmailService(IOptions<SmtpOptions> options) { _options = options.Value; }
}
```

### Minimal APIs vs Controllers

```csharp
// Minimal APIs (ASP.NET Core 6+) — concise, no controller class needed
var app = WebApplication.Create(args);

app.MapGet("/orders/{id}", async (int id, IOrderService svc) =>
{
    var order = await svc.GetByIdAsync(id);
    return order is null ? Results.NotFound() : Results.Ok(order);
});

app.MapPost("/orders", async (CreateOrderRequest req, IOrderService svc) =>
{
    var order = await svc.CreateAsync(req);
    return Results.Created($"/orders/{order.Id}", order);
});

// Controller-based (classic, more structured for large APIs)
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id, [FromServices] IOrderService svc)
    {
        var order = await svc.GetByIdAsync(id);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderRequest req,
                                            [FromServices] IOrderService svc)
    {
        var order = await svc.CreateAsync(req);
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order);
    }
}

// ‼️ [ApiController] enables: automatic model validation, binding source inference,
//    problem details for error responses
```

### Entity Framework Core

```csharp
// DbContext — unit of work + identity map
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<Order> Orders { get; set; }
    public DbSet<Customer> Customers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Amount).HasPrecision(18, 2);
            entity.HasOne(o => o.Customer)
                  .WithMany(c => c.Orders)
                  .HasForeignKey(o => o.CustomerId);
            entity.HasIndex(o => o.CustomerId);
        });
    }
}

// Registration
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// ‼️ Queries — IQueryable, translated to SQL
var orders = await context.Orders
    .Where(o => o.Status == OrderStatus.Active)
    .Include(o => o.Customer)    // JOIN — avoids N+1
    .AsNoTracking()              // ‼️ faster reads — no change tracking overhead
    .ToListAsync();

// ‼️ Change tracking — EF tracks fetched entities in memory
// Modified entity → SaveChangesAsync() generates UPDATE
// New entity added → INSERT
// Entity removed → DELETE
```

### Authentication & Authorization

```csharp
// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "https://myapp.com",
            ValidateAudience = true,
            ValidAudience = "api",
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(config["Jwt:Secret"]))
        };
    });

// Policy-based Authorization
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
    options.AddPolicy("MinAge18", p =>
        p.Requirements.Add(new MinimumAgeRequirement(18)));
});

// Applying policies
[Authorize(Policy = "AdminOnly")]
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(int id) { ... }

// Resource-based authorization
var authResult = await _authService.AuthorizeAsync(User, order, "CanEdit");
if (!authResult.Succeeded) return Forbid();
```

---

## 8. Common Interview Questions

```text
Q: What is the difference between Task and Thread?
A: Thread is an OS-managed execution unit (~1MB stack, expensive).
   Task is a unit of work, runs on a thread pool thread or inline.
   async/await uses Tasks — they may not create new threads at all for I/O.

Q: What does ConfigureAwait(false) do?
A: Tells the awaiter not to capture the synchronization context.
   On resume, the continuation runs on any thread pool thread.
   Use in library code to avoid deadlocks and improve performance.
   Not needed in ASP.NET Core (no SyncContext) but harmless.

Q: Struct vs Class — when to use struct?
A: Struct when: small (< 16 bytes), immutable, frequently created/discarded.
   Avoid struct when: needs inheritance, has reference semantics, frequently boxed.
   ‼️ Boxing: struct assigned to object/interface → heap allocation wrapping the value.

Q: What is the difference between IEnumerable and IQueryable?
A: IEnumerable — pull model, LINQ runs in memory after data is fetched.
   IQueryable — expression tree, LINQ translates to DB query (EF Core).
   Mixing them incorrectly loads all rows into memory before filtering.

Q: Explain the difference between == and .Equals() in C#?
A: For value types: both compare values.
   For reference types: == compares references (unless overloaded, e.g., string).
   .Equals() is virtual — override for value equality.
   Records override both for value equality automatically.

Q: What is the GC's Large Object Heap (LOH)?
A: Objects ≥ 85 KB go to LOH. LOH is not compacted by default (can be forced with GCSettings).
   LOH fragmentation causes OutOfMemoryException even with free heap space.
   Prefer Span<T>/ArrayPool<T> to avoid repeated large allocations.

Q: What are the three service lifetimes in ASP.NET Core DI?
A: Transient (new per injection), Scoped (new per request), Singleton (one for app lifetime).
   Never inject Scoped into Singleton — it becomes effectively a singleton but isn't managed as one.
```
