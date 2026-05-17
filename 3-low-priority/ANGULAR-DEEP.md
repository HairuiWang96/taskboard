# Angular — Senior Developer Deep Reference

> Covers change detection, DI, components, directives, RxJS, Signals, routing, and performance.

---

## Table of Contents

1. [Change Detection](#1-change-detection)
2. [Dependency Injection — Deep Dive](#2-dependency-injection--deep-dive)
3. [Components & Templates](#3-components--templates)
4. [Directives & Pipes](#4-directives--pipes)
5. [RxJS & Observables](#5-rxjs--observables)
6. [Signals (Angular 17+)](#6-signals-angular-17)
7. [Routing — Deep Dive](#7-routing--deep-dive)
8. [HTTP & State Management](#8-http--state-management)
9. [Performance Optimization](#9-performance-optimization)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. Change Detection

### Zone.js & Default Change Detection

```text
‼️ Angular's default change detection uses Zone.js (NgZone) to monkey-patch
   async APIs (setTimeout, Promise, XHR, addEventListener) and notify Angular
   when something might have changed.

Default (CheckAlways) strategy:
  1. Any async event fires (click, timer, HTTP response, etc.)
  2. Zone.js intercepts → notifies Angular
  3. Angular runs change detection from ROOT to LEAF for the ENTIRE component tree
  4. For every component: compare template bindings to current data
  5. If changed → update the DOM

‼️ This is correct but can be slow for large trees.

ChangeDetectionStrategy.OnPush:
  Angular SKIPS a component (and its subtree) UNLESS:
    1. An @Input() reference changes (not mutation — must be a new reference)
    2. An event originates from the component or its children
    3. An Observable linked via async pipe emits
    4. Change detection is manually triggered (ChangeDetectorRef.markForCheck())

  ‼️ With OnPush: immutable data + Observable streams = minimal DOM checks
```

### OnPush in Practice

```typescript
// ‼️ Always use OnPush — it's a performance best practice in Angular
@Component({
    selector: 'app-user-card',
    template: `
        <div>{{ user.name }}</div>
        <div>{{ lastUpdated | date }}</div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush, // ‼️
})
export class UserCardComponent {
    @Input() user!: User;
    lastUpdated = new Date();
}

// ✓ Pass a new object reference to trigger change detection
// this.user = { ...this.user, name: 'Alice' }; // new reference → OnPush detects

// ✗ Mutating the input doesn't trigger OnPush
// this.user.name = 'Alice'; // same reference → OnPush skips → stale view ‼️

// Manual trigger — when you mutate state inside the component
import { ChangeDetectorRef } from '@angular/core';

constructor(private cdr: ChangeDetectorRef) {}

updateFromOutside() {
    this.data = mutate(this.data);
    this.cdr.markForCheck();   // ‼️ mark for check on next CD cycle
    // OR
    this.cdr.detectChanges();  // ‼️ run CD immediately (synchronous)
}
```

### Zoneless Angular (Angular 18+)

```typescript
// ‼️ Angular 18+ supports running without Zone.js — purely Signal-driven CD
// bootstrapApplication(AppComponent, {
//     providers: [provideExperimentalZonelessChangeDetection()]
// });

// Without Zone.js:
//   - No monkey-patching — manual notification required
//   - Signals automatically schedule change detection when they change
//   - More predictable, better performance, smaller bundle (no zone.js)
//   - Required: use Signals for state, async pipe for Observables
```

---

## 2. Dependency Injection — Deep Dive

### Angular's DI Hierarchy

```text
‼️ Angular's DI is hierarchical — 3 injector trees:

  1. Platform Injector — singleton for the whole browser tab
  2. Root (Application) Injector — singleton for the whole app
     provided via: providedIn: 'root', or providers[] in bootstrapApplication
  3. Component Injector — one per component instance
     provided via: providers[] in @Component({ providers: [...] })
     ‼️ Creates a NEW instance per component — not shared with siblings

Lookup order: component injector → parent component → ... → root → platform

  @Component({ providers: [UserService] }) — scoped to this component tree
  providedIn: 'root'                       — global singleton
  providedIn: 'any'                        — one instance per lazy-loaded module
```

### Providing & Injecting

```typescript
// Service — provided in root (singleton for app lifetime)
@Injectable({ providedIn: 'root' })
export class AuthService {
    private user = signal<User | null>(null);
    readonly isLoggedIn = computed(() => this.user() !== null);

    login(credentials: Credentials) { ... }
    logout() { this.user.set(null); }
}

// Inject in a component (Angular 14+ inject() function — preferred in standalone)
import { inject } from '@angular/core';

@Component({ ... })
export class HeaderComponent {
    private auth = inject(AuthService); // ‼️ inject() works anywhere in injection context
    protected isLoggedIn = this.auth.isLoggedIn;
}

// Constructor injection (classic)
@Component({ ... })
export class HeaderComponent {
    constructor(private auth: AuthService) {}
}

// ‼️ inject() is more flexible — works in composable functions (factory pattern)
// Constructor injection only works in class constructors
function withAuth() {
    const auth = inject(AuthService); // ✓ works in function called during injection context
    return auth;
}

// Provide a value / factory
providers: [
    { provide: API_URL, useValue: 'https://api.example.com' },
    { provide: Logger, useClass: ConsoleLogger },
    { provide: Logger, useExisting: ConsoleLogger }, // alias to existing token
    {
        provide: DATABASE,
        useFactory: (config: Config) => new Database(config.dbUrl),
        deps: [Config]
    },
]

// InjectionToken — for non-class providers (primitives, configs)
export const API_URL = new InjectionToken<string>('API_URL', {
    providedIn: 'root',
    factory: () => 'https://default.api.com',
});
const url = inject(API_URL); // type-safe string
```

---

## 3. Components & Templates

### Standalone Components (Angular 14+)

```typescript
// ‼️ Standalone components — no NgModule needed (preferred in Angular 17+)
@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, RouterLink, AsyncPipe, UserCardComponent],
    template: `
        <app-user-card *ngFor="let user of users" [user]="user" />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent {
    users = input<User[]>([]);  // ‼️ Signal input (Angular 17.1+)
}

// Bootstrapping without AppModule
bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideAnimations(),
    ],
});
```

### Inputs, Outputs & Two-Way Binding

```typescript
// Modern Signal-based inputs/outputs (Angular 17.1+)
@Component({ selector: 'app-counter', standalone: true, template: `
    <button (click)="decrement()">-</button>
    {{ count() }}
    <button (click)="increment()">+</button>
` })
export class CounterComponent {
    // Signal input — reactive, computed-friendly
    count = input(0);                          // optional with default
    label = input.required<string>();          // required input

    // Output — event emitter
    countChange = output<number>();

    // Two-way binding (model() — Angular 17.2+)
    value = model(0); // replaces @Input() + @Output() valueChange pattern

    increment() {
        this.value.update(v => v + 1);
        this.countChange.emit(this.value());
    }
    decrement() { this.value.update(v => v - 1); }
}

// Parent
// <app-counter [(value)]="myValue" />  — two-way binding with model()

// Classic @Input/@Output (still valid)
@Component({ ... })
export class ClassicComponent {
    @Input() title = '';
    @Input({ required: true }) user!: User;  // required (Angular 16+)
    @Input({ transform: booleanAttribute }) disabled = false; // transform input ‼️

    @Output() userSelected = new EventEmitter<User>();
}
```

### Template Syntax

```html
<!-- Interpolation -->
{{ user.name | uppercase }}

<!-- Property binding -->
<img [src]="imageUrl" [alt]="imageAlt">

<!-- Event binding -->
<button (click)="onClick($event)">Click</button>

<!-- Two-way binding -->
<input [(ngModel)]="username">
<!-- Expands to: [ngModel]="username" (ngModelChange)="username = $event" -->

<!-- Structural directives (old syntax) -->
<div *ngIf="isLoggedIn; else loginTmpl">Welcome!</div>
<ng-template #loginTmpl>Please log in</ng-template>

<li *ngFor="let item of items; let i = index; trackBy: trackById">
    {{ i }}. {{ item.name }}
</li>

<!-- ‼️ New control flow (Angular 17+) — no CommonModule needed, better tree-shaking -->
@if (isLoggedIn) {
    <div>Welcome!</div>
} @else {
    <div>Please log in</div>
}

@for (item of items; track item.id) {
    <li>{{ item.name }}</li>
} @empty {
    <li>No items</li>
}

@switch (status) {
    @case ('active') { <span class="green">Active</span> }
    @case ('inactive') { <span class="red">Inactive</span> }
    @default { <span>Unknown</span> }
}

@defer (on viewport) {
    <heavy-component /> <!-- lazy loaded when enters viewport -->
} @placeholder {
    <div>Loading...</div>
}
```

---

## 4. Directives & Pipes

### Structural Directives

```typescript
// Custom structural directive — *appRepeat="3"
@Directive({ selector: '[appRepeat]', standalone: true })
export class RepeatDirective {
    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
    ) {}

    @Input() set appRepeat(count: number) {
        this.viewContainer.clear();
        for (let i = 0; i < count; i++) {
            this.viewContainer.createEmbeddedView(this.templateRef, { $implicit: i });
        }
    }
}

// Usage: <p *appRepeat="3; let i">Item {{ i }}</p>
// Renders 3 <p> elements with i = 0, 1, 2
```

### Custom Pipes

```typescript
// Pure pipe (default) — only re-runs when input reference changes
// ‼️ Pure pipes are cached — same input = same output, computed once
@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
    transform(value: string, limit = 50, suffix = '...'): string {
        return value.length <= limit ? value : value.slice(0, limit) + suffix;
    }
}

// Impure pipe — runs on every change detection cycle (expensive!)
// ‼️ Use only when: output depends on mutable state not captured in args
// Example: async pipe is impure (subscribes to Observable)
@Pipe({ name: 'myFilter', pure: false, standalone: true })
export class FilterPipe implements PipeTransform {
    transform(items: any[], filter: string): any[] {
        return items.filter(i => i.name.includes(filter));
    }
}
// ‼️ Avoid impure pipes with large lists — runs on EVERY CD cycle
// Better: filter in the component with computed() or a Subject
```

---

## 5. RxJS & Observables

### Core Concepts

```typescript
import { Observable, Subject, BehaviorSubject, combineLatest, merge } from 'rxjs';
import { map, filter, switchMap, mergeMap, concatMap, exhaustMap,
         debounceTime, distinctUntilChanged, takeUntilDestroyed,
         catchError, retry, shareReplay } from 'rxjs/operators';

// Observable — lazy push stream
const obs$ = new Observable<number>(subscriber => {
    subscriber.next(1);
    subscriber.next(2);
    setTimeout(() => { subscriber.next(3); subscriber.complete(); }, 1000);

    return () => console.log('Cleaned up'); // teardown logic — runs on unsubscribe
});

// ‼️ Cold vs Hot:
//   Cold: each subscriber gets its own execution (HTTP requests, timers — default)
//   Hot: shared execution (Subject, fromEvent, WebSocket)

// Subject — both Observable and Observer (multicast)
const subject$ = new Subject<string>();
subject$.subscribe(v => console.log('A:', v));
subject$.subscribe(v => console.log('B:', v));
subject$.next('hello'); // both A and B receive it

// BehaviorSubject — stores last value, emits it immediately to new subscribers ‼️
const state$ = new BehaviorSubject<User | null>(null);
state$.getValue(); // synchronous access to current value
state$.next(newUser);
state$.subscribe(user => updateUI(user)); // immediately gets current value

// ReplaySubject — buffers N last values for new subscribers
const replay$ = new ReplaySubject<number>(3); // replay last 3
```

### Higher-Order Mapping Operators

```typescript
// ‼️ This is one of the most important things to understand in RxJS

// switchMap — cancel previous inner observable when new value arrives
// ‼️ Use for: search autocomplete, latest value wins
searchQuery$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(query => this.http.get(`/api/search?q=${query}`))
    // ‼️ If user types again before response arrives → CANCELS previous request
).subscribe(results => ...);

// mergeMap (flatMap) — subscribe to all inner observables, don't cancel
// ‼️ Use for: parallel independent tasks (upload multiple files)
uploads$.pipe(
    mergeMap(file => this.upload(file)) // all uploads run concurrently
).subscribe(result => ...);

// concatMap — queue inner observables, execute one at a time, in order
// ‼️ Use for: sequential tasks where order matters
actions$.pipe(
    concatMap(action => this.process(action)) // one at a time, preserves order
).subscribe();

// exhaustMap — ignore new values while inner observable is running
// ‼️ Use for: preventing duplicate form submissions, ignoring rapid clicks
submitClick$.pipe(
    exhaustMap(() => this.submit(form.value))
    // ‼️ While submit is in progress, click events are ignored
).subscribe();

// ‼️ Summary:
//   switchMap   → latest wins, cancel old (search, route data)
//   mergeMap    → all concurrent (uploads, parallel requests)
//   concatMap   → sequential queue (ordered operations)
//   exhaustMap  → ignore while busy (form submit, login button)
```

### Subscription Management

```typescript
// ‼️ Always unsubscribe to prevent memory leaks

// 1. takeUntilDestroyed — Angular 16+ (simplest, preferred)
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({ ... })
export class MyComponent {
    private destroyRef = inject(DestroyRef);

    ngOnInit() {
        this.data$.pipe(
            takeUntilDestroyed(this.destroyRef) // ‼️ auto-unsubscribes on destroy
        ).subscribe(d => this.data = d);
    }
}

// 2. async pipe — auto-subscribes and auto-unsubscribes ‼️ preferred for templates
// No manual subscription, no memory leak risk
<div *ngIf="user$ | async as user">{{ user.name }}</div>
@if (user$ | async; as user) { <div>{{ user.name }}</div> }

// 3. Manual unsubscribe (classic, error-prone)
private sub = new Subscription();
ngOnInit() { this.sub.add(obs$.subscribe(...)); }
ngOnDestroy() { this.sub.unsubscribe(); }

// shareReplay — multicast + replay for expensive observables
// ‼️ Share HTTP request result among multiple subscribers (don't make N requests)
readonly user$ = this.http.get<User>('/api/me').pipe(
    shareReplay(1) // ‼️ replay 1 — all subscribers get the cached result
);
// Both template bindings below share ONE HTTP request:
// {{ (user$ | async)?.name }}
// {{ (user$ | async)?.email }}
```

---

## 6. Signals (Angular 17+)

### Signal Primitives

```typescript
import { signal, computed, effect, toSignal, toObservable } from '@angular/core';

// signal() — writable reactive primitive
const count = signal(0);
count();          // read — 0
count.set(5);     // set new value
count.update(v => v + 1); // update based on previous value
count.mutate(arr => arr.push(1)); // ‼️ mutate in place (for arrays/objects) — deprecated in v18
                                   // use update() with spread instead

// computed() — derived signal, lazy, cached
const doubled = computed(() => count() * 2);
const isEven  = computed(() => count() % 2 === 0);
// ‼️ computed is lazy — only recomputes when read AND a dependency has changed

// effect() — side effect when signals change
const cleanup = effect(() => {
    // Any signal read inside is automatically tracked as dependency
    console.log(`Count changed to: ${count()}`);
    // ‼️ Runs once immediately on creation, then when deps change
});
cleanup.destroy(); // stop the effect

// Interop with RxJS
const count$ = toObservable(count); // Signal → Observable
const searchSignal = toSignal(search$, { initialValue: '' }); // Observable → Signal
// ‼️ toSignal subscribes in injection context and auto-unsubscribes on destroy
```

### Signal-Based Components

```typescript
// ‼️ Signal inputs make components fully Signal-compatible (no Zone.js needed)
@Component({
    selector: 'app-product',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <h2>{{ product().name }}</h2>
        <p>{{ discountedPrice() | currency }}</p>
        @if (product().inStock) {
            <button (click)="addToCart()">Add to Cart</button>
        }
    `,
})
export class ProductComponent {
    product = input.required<Product>();  // Signal input
    discount = input(0);                  // Signal input with default

    // Computed from Signal inputs — auto-updates when inputs change
    discountedPrice = computed(() =>
        this.product().price * (1 - this.discount() / 100)
    );

    cartService = inject(CartService);

    addToCart() {
        this.cartService.add(this.product());
    }
}
```

---

## 7. Routing — Deep Dive

### Configuration & Lazy Loading

```typescript
export const routes: Routes = [
    { path: '', component: HomeComponent },
    {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component')
                              .then(m => m.DashboardComponent),
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
            {
                path: 'overview',
                loadComponent: () => import('./dashboard/overview.component')
                                      .then(m => m.OverviewComponent),
            },
        ],
    },
    // Lazy load a group of routes (standalone routes array)
    {
        path: 'admin',
        loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
        canMatch: [adminGuard], // ‼️ canMatch — prevent even loading the chunk
    },
    { path: '**', component: NotFoundComponent },
];

// admin.routes.ts
export const ADMIN_ROUTES: Routes = [
    { path: '', component: AdminDashboardComponent },
    { path: 'users', component: AdminUsersComponent },
];
```

### Guards (Functional)

```typescript
// ‼️ Functional guards (Angular 15+) — preferred over class-based guards
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (auth.isLoggedIn()) return true;
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
    // ‼️ Return: true, false, UrlTree (redirect), Observable<boolean|UrlTree>
};

// canDeactivate — prevent navigation away from unsaved changes
export const unsavedChangesGuard: CanDeactivateFn<EditComponent> = (component) => {
    if (component.hasUnsavedChanges()) {
        return confirm('Leave without saving?');
    }
    return true;
};

// canMatch — prevent loading the chunk entirely
export const adminGuard: CanMatchFn = () => {
    return inject(AuthService).hasRole('admin');
};
// ‼️ canMatch fires BEFORE the lazy chunk is downloaded — saves bandwidth
// canActivate fires AFTER the chunk loads

// Route resolvers — pre-fetch data before navigation completes
export const userResolver: ResolveFn<User> = (route) => {
    return inject(UserService).getUser(route.params['id']);
    // ‼️ Navigation halts until the Observable/Promise completes
};

{ path: 'users/:id', component: UserDetailComponent, resolve: { user: userResolver } }

// Access in component
const user = inject(ActivatedRoute).snapshot.data['user'] as User;
```

### Router Signals & Observables

```typescript
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

@Component({ ... })
export class NavComponent {
    private router = inject(Router);
    private route  = inject(ActivatedRoute);

    // Route params as Signal (Angular 16+)
    readonly userId = toSignal(
        this.route.params.pipe(map(p => p['id'])),
        { initialValue: null }
    );

    // Navigate imperatively
    goToUser(id: string) {
        this.router.navigate(['/users', id], { queryParams: { tab: 'profile' } });
    }

    // Listen to navigation events
    navEnd$ = this.router.events.pipe(
        filter(e => e instanceof NavigationEnd)
    );
}
```

---

## 8. HTTP & State Management

### HttpClient & Interceptors

```typescript
// HTTP request
@Injectable({ providedIn: 'root' })
export class UserService {
    private http = inject(HttpClient);

    getUsers(): Observable<User[]> {
        return this.http.get<User[]>('/api/users');
    }

    createUser(data: CreateUserDto): Observable<User> {
        return this.http.post<User>('/api/users', data);
    }

    // Error handling
    getUser(id: string): Observable<User> {
        return this.http.get<User>(`/api/users/${id}`).pipe(
            retry({ count: 2, delay: 1000 }),
            catchError(err => {
                if (err.status === 404) throw new UserNotFoundError(id);
                throw err;
            })
        );
    }
}

// Functional interceptor (Angular 15+) — preferred
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth  = inject(AuthService);
    const token = auth.getToken();

    const authReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next(authReq); // ‼️ must call next() to pass request down the chain
};

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
    const start = Date.now();
    return next(req).pipe(
        tap(event => {
            if (event instanceof HttpResponse) {
                console.log(`${req.url} — ${Date.now() - start}ms`);
            }
        })
    );
};

// Register
provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor]))
```

---

## 9. Performance Optimization

### trackBy in *ngFor

```typescript
// ‼️ Without trackBy: Angular destroys and recreates ALL DOM elements on array change
// With trackBy: Angular reuses existing DOM elements for unchanged items

// Template
// @for (item of items; track item.id) { ... }  ← new syntax (always tracks by identity)
// <li *ngFor="let item of items; trackBy: trackById">  ← old syntax

// Component
trackById(index: number, item: Item): string {
    return item.id; // ‼️ return unique, stable identifier
}
```

### OnPush + Signals + async pipe

```typescript
// ‼️ Optimal Angular component pattern
@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [AsyncPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @for (user of users(); track user.id) {
            <app-user-row [user]="user" />
        }
        @if (loading()) {
            <app-spinner />
        }
    `,
})
export class UserListComponent {
    private userService = inject(UserService);

    users   = toSignal(this.userService.users$, { initialValue: [] });
    loading = toSignal(this.userService.loading$, { initialValue: false });
    // ‼️ toSignal auto-unsubscribes, works perfectly with OnPush
}
```

### Deferrable Views (@defer)

```html
<!-- ‼️ @defer — lazy load template block (Angular 17+) -->

<!-- Load when element enters viewport -->
@defer (on viewport) {
    <app-heavy-chart [data]="chartData" />
} @placeholder {
    <div class="chart-skeleton"></div>
} @loading (minimum 200ms) {
    <app-spinner />
} @error {
    <p>Failed to load chart</p>
}

<!-- Load on interaction -->
@defer (on interaction(triggerEl)) {
    <app-comments />
}
<button #triggerEl>Show Comments</button>

<!-- Load after idle -->
@defer (on idle) {
    <app-analytics-widget />
}

<!-- Prefetch separately from rendering -->
@defer (on viewport; prefetch on idle) {
    <app-comments />
}
<!-- Prefetch the bundle on idle, but render only when in viewport -->
```

---

## 10. Common Interview Questions

```text
Q: What is Zone.js and why might you want to go zoneless?
A: Zone.js monkey-patches async APIs to notify Angular when something might have changed,
   triggering change detection from root. It's magic but has overhead and can cause
   performance issues with third-party libraries that trigger many async events.
   Zoneless (Angular 18+): Angular only runs CD when Signals change — more predictable,
   smaller bundle, better performance for complex apps.

Q: What is the difference between ChangeDetectionStrategy.Default and OnPush?
A: Default (CheckAlways): CD runs for this component on every CD cycle (any async event anywhere).
   OnPush: CD skips this component unless: an @Input reference changes, a child event fires,
   an async pipe emits, or markForCheck() is called manually.
   ‼️ OnPush requires immutable data patterns — mutating inputs won't trigger updates.

Q: Explain switchMap, mergeMap, concatMap, and exhaustMap.
A: switchMap  — cancel previous inner observable (search, latest wins).
   mergeMap   — concurrent inner observables, no cancellation (parallel uploads).
   concatMap  — sequential, one at a time, preserves order (ordered operations).
   exhaustMap — ignore new outer values while inner is active (prevent double submit).

Q: What are Signals and how do they improve Angular?
A: Signals are reactive primitives (like Vue's ref). signal(), computed(), effect().
   They enable fine-grained reactivity without Zone.js — Angular knows exactly which
   component to update. Computed signals are lazy and cached. Enables zoneless Angular.
   ‼️ Signal inputs (input(), model()) and toSignal() bridge the Observable/Signal worlds.

Q: What is the difference between Subject, BehaviorSubject, and ReplaySubject?
A: Subject       — no initial value, only future emissions to current subscribers.
   BehaviorSubject — stores last value, emits to new subscribers immediately. Use for state.
   ReplaySubject   — buffers N values, replays them to new subscribers.
   ‼️ BehaviorSubject is the most common for component state shared via service.

Q: What is the difference between canActivate and canMatch?
A: canActivate — fires after the lazy chunk is loaded. If false, chunk was downloaded for nothing.
   canMatch    — fires BEFORE the lazy chunk loads. If false, chunk is not downloaded.
   ‼️ Use canMatch for role/permission checks on lazy routes — saves bandwidth.

Q: How do you prevent memory leaks with Observables in Angular?
A: 1. async pipe — auto-unsubscribes when component destroys.
   2. takeUntilDestroyed(destroyRef) — Angular 16+, cleanest manual approach.
   3. toSignal() — auto-unsubscribes on destroy.
   4. Manual: Subscription.add() + unsubscribe in ngOnDestroy (error-prone).
   ‼️ Subscribing in ngOnInit without unsubscribing is a classic Angular memory leak.

Q: What are standalone components and how do they differ from NgModule-based components?
A: Standalone components (Angular 14+) don't belong to an NgModule — they declare their
   own imports directly. No need to add to declarations[] in a module.
   Benefits: simpler mental model, tree-shakable, easier lazy loading, no NgModule overhead.
   ‼️ Angular 17+ defaults to standalone — NgModule is legacy but still fully supported.
```
