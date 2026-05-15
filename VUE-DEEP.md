# Vue — Senior Developer Deep Reference

> Covers reactivity internals, Composition API, component patterns, state management, Vue Router, and performance.

---

## Table of Contents

1. [Reactivity System Internals](#1-reactivity-system-internals)
2. [Composition API — Deep Dive](#2-composition-api--deep-dive)
3. [Component System](#3-component-system)
4. [Directives & Render Functions](#4-directives--render-functions)
5. [Pinia — State Management](#5-pinia--state-management)
6. [Vue Router — Deep Dive](#6-vue-router--deep-dive)
7. [Performance Optimization](#7-performance-optimization)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Reactivity System Internals

### How Vue 3 Reactivity Works

```js
// ‼️ Vue 3 reactivity is built on ES6 Proxy — intercepts get/set at object level
// Vue 2 used Object.defineProperty — property-by-property, could not detect additions

// Conceptually, Vue does this:
function reactive(target) {
    return new Proxy(target, {
        get(target, key, receiver) {
            track(target, key);          // ‼️ record that this effect depends on this key
            return Reflect.get(target, key, receiver);
        },
        set(target, key, value, receiver) {
            const result = Reflect.set(target, key, value, receiver);
            trigger(target, key);        // ‼️ notify all effects that depend on this key
            return result;
        }
    });
}

// When a component renders, Vue runs it inside a reactive effect.
// Any reactive state accessed during render → tracked as a dependency.
// When that state changes → trigger re-render (only that component).

// ‼️ reactive() — deep reactive object (nested objects are also proxied)
const state = reactive({ user: { name: 'Alice', age: 30 } });
state.user.name = 'Bob'; // ✓ triggers reactivity — deep proxy

// ‼️ ref() — wraps a value in a reactive container (.value accessor)
// Use for primitives (strings, numbers, booleans)
const count = ref(0);
count.value++;           // ✓ triggers reactivity
// In templates, .value is auto-unwrapped: {{ count }} (not count.value)

// Why ref() for primitives?
// Primitives can't be proxied directly — they're not objects.
// ref() wraps them in { value: <primitive> } so Proxy can intercept .value access.
```

### ref vs reactive

```js
import { ref, reactive, toRefs } from 'vue';

// ref — any type, access via .value in JS, auto-unwrapped in template
const name  = ref('Alice');
const users = ref([]);         // array as ref
name.value = 'Bob';

// reactive — plain objects/arrays, no .value needed
const form = reactive({ email: '', password: '' });
form.email = 'alice@a.com';    // direct access

// ‼️ reactive() limitations:
//   1. Cannot replace the whole object (loses reactivity)
//      form = { email: 'new' }; // ✗ breaks reactivity — reference changed
//   2. Cannot destructure without toRefs (loses reactivity)
//      const { email } = form; // ✗ email is now a plain string, not reactive
//      const { email } = toRefs(form); // ✓ email is a Ref, stays reactive

// ‼️ ref() in reactive() — auto-unwrapped
const state = reactive({ count: ref(0) });
state.count; // 0 — no .value needed! Auto-unwrapped inside reactive()

// shallowRef / shallowReactive — top-level only (skip deep tracking)
const shallowState = shallowReactive({ nested: { value: 1 } });
shallowState.nested.value = 99; // ✗ not tracked — only top-level keys are reactive
shallowState.nested = { value: 99 }; // ✓ tracked — top-level key replaced
```

### Computed & Watch

```js
import { computed, watch, watchEffect } from 'vue';

// computed — derived reactive value, cached (only recomputed when deps change)
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
// ‼️ Accessing fullName.value multiple times → runs getter ONCE (cached)
// ‼️ Never mutate state inside computed — use for reads only

// Writable computed
const fullName = computed({
    get: () => `${first.value} ${last.value}`,
    set: (val) => {
        [first.value, last.value] = val.split(' ');
    }
});

// watch — respond to specific reactive source changes
const count = ref(0);

// Watch a single ref
watch(count, (newVal, oldVal) => {
    console.log(`${oldVal} → ${newVal}`);
});

// Watch multiple sources
watch([firstName, lastName], ([newFirst, newLast], [oldFirst, oldLast]) => {
    console.log('Name changed');
});

// Watch a reactive object property (getter form)
watch(() => user.name, (newName) => console.log(newName));
// ‼️ watch(user.name, ...) would NOT work — you'd be watching a string snapshot

// Options
watch(source, callback, {
    immediate: true, // ‼️ run callback immediately on creation (like created() hook)
    deep: true,      // ‼️ deep watch — track nested changes (expensive!)
    once: true,      // stop after first trigger (Vue 3.4+)
});

// watchEffect — automatically tracks dependencies, runs immediately
watchEffect(() => {
    // ‼️ Any reactive value read inside here is automatically tracked
    console.log(`User: ${user.name}, Count: ${count.value}`);
});
// Runs immediately, then re-runs whenever user.name or count changes
// ‼️ No access to oldVal — use watch if you need comparison

// Stopping a watcher
const stop = watchEffect(() => { ... });
stop(); // call to stop watching
```

---

## 2. Composition API — Deep Dive

### setup() & Script Setup

```vue
<!-- Options API (Vue 2 style) — still valid in Vue 3 -->
<script>
export default {
    data() { return { count: 0 }; },
    computed: { doubled() { return this.count * 2; } },
    methods: { increment() { this.count++; } },
    mounted() { console.log('mounted'); },
};
</script>

<!-- Composition API with <script setup> — ‼️ preferred in Vue 3 -->
<script setup>
import { ref, computed, onMounted } from 'vue';

const count = ref(0);
const doubled = computed(() => count.value * 2);
const increment = () => count.value++;

onMounted(() => console.log('mounted'));

// ‼️ Everything declared in <script setup> is automatically available in template
// No return statement needed — compiler handles it
</script>

<template>
  <button @click="increment">{{ count }} ({{ doubled }})</button>
</template>
```

### Composables — Reusable Logic

```js
// ‼️ Composables replace mixins — explicit, no naming conflicts, tree-shakable

// composables/useCounter.js
import { ref, computed } from 'vue';

export function useCounter(initialValue = 0) {
    const count = ref(initialValue);
    const doubled = computed(() => count.value * 2);

    function increment(by = 1) { count.value += by; }
    function reset() { count.value = initialValue; }

    return { count, doubled, increment, reset };
}

// Usage
<script setup>
import { useCounter } from '@/composables/useCounter';

const { count, doubled, increment, reset } = useCounter(10);
</script>

// Async composable with lifecycle cleanup
// composables/useFetch.js
import { ref, watchEffect, toValue } from 'vue';

export function useFetch(url) {
    const data    = ref(null);
    const error   = ref(null);
    const loading = ref(false);

    watchEffect(async () => {
        // toValue() — resolves ref, computed, or plain value ‼️
        const resolvedUrl = toValue(url); // url can be a ref or a plain string
        if (!resolvedUrl) return;

        data.value    = null;
        error.value   = null;
        loading.value = true;

        try {
            const res = await fetch(resolvedUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            data.value = await res.json();
        } catch (e) {
            error.value = e;
        } finally {
            loading.value = false;
        }
    });

    return { data, error, loading };
}

// Reactive URL — re-fetches when userId changes ‼️
const userId = ref(1);
const { data: user, loading } = useFetch(computed(() => `/api/users/${userId.value}`));
```

### Lifecycle Hooks in Composition API

```js
import {
    onBeforeMount, onMounted,
    onBeforeUpdate, onUpdated,
    onBeforeUnmount, onUnmounted,
    onErrorCaptured,
    onActivated, onDeactivated,   // <KeepAlive>
} from 'vue';

// ‼️ All lifecycle hooks can be called multiple times — they stack
// This enables composables to register their own lifecycle logic

onMounted(() => {
    console.log('DOM ready');
    // ‼️ DOM is accessible here
});

onUnmounted(() => {
    // ‼️ Clean up: remove event listeners, clear intervals, abort fetch
    clearInterval(timer);
    controller.abort();
});

// ‼️ Comparison with Options API:
//   beforeCreate / created → setup() itself (runs before mount)
//   beforeMount  → onBeforeMount
//   mounted      → onMounted
//   beforeUpdate → onBeforeUpdate
//   updated      → onUpdated
//   beforeUnmount → onBeforeUnmount
//   unmounted    → onUnmounted
```

---

## 3. Component System

### Props & Emits

```vue
<script setup>
// defineProps — compile-time macro, no import needed
const props = defineProps({
    title: { type: String, required: true },
    count: { type: Number, default: 0 },
    items: { type: Array, default: () => [] }, // ‼️ factory function for objects/arrays
    user:  { type: Object, validator: (u) => !!u.id },
});

// TypeScript-style props (preferred with TypeScript)
const props = defineProps<{
    title: string;
    count?: number;
    items?: string[];
}>();

// withDefaults — TypeScript props with defaults
const props = withDefaults(defineProps<{
    title: string;
    count?: number;
}>(), {
    count: 0,
});

// defineEmits — type the events this component can emit
const emit = defineEmits(['update:modelValue', 'close', 'submit']);

// TypeScript-style emits
const emit = defineEmits<{
    'update:modelValue': [value: string];  // named tuple for type safety
    'close': [];
    'submit': [data: FormData];
}>();

// Emit usage
emit('update:modelValue', newValue);
</script>

<!-- v-model on a component = :modelValue + @update:modelValue -->
<!-- Parent: <MyInput v-model="name" /> -->
<!-- Expands to: <MyInput :modelValue="name" @update:modelValue="name = $event" /> -->
```

### Slots

```vue
<!-- Default slot -->
<template>
  <div class="card">
    <slot /> <!-- parent content goes here -->
  </div>
</template>

<!-- Named slots -->
<template>
  <div class="layout">
    <header><slot name="header" /></header>
    <main><slot /></main>           <!-- default slot -->
    <footer><slot name="footer" /></footer>
  </div>
</template>

<!-- Scoped slots — expose data to parent's slot content ‼️ -->
<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot :item="item" :index="index" /> <!-- expose item to parent -->
    </li>
  </ul>
</template>

<!-- Parent using scoped slot -->
<MyList :items="users">
  <template #default="{ item, index }">
    <span>{{ index + 1 }}. {{ item.name }}</span>
  </template>
</MyList>

<!-- ‼️ Scoped slots = renderless component pattern (logic without UI) -->
<MouseTracker>
  <template #default="{ x, y }">
    <p>Mouse: {{ x }}, {{ y }}</p> <!-- parent controls how to render -->
  </template>
</MouseTracker>
```

### provide / inject

```js
// Parent — provide data to all descendants (any depth)
import { provide, ref } from 'vue';

const theme = ref('light');
provide('theme', theme);           // ‼️ provide a ref to keep reactivity
provide('setTheme', (t) => theme.value = t);

// Descendant — inject without prop drilling
import { inject } from 'vue';

const theme = inject('theme');              // returns the ref
const setTheme = inject('setTheme');

// With default value (if no provider above)
const theme = inject('theme', 'light');     // fallback value

// ‼️ Use Symbol keys in real apps to avoid naming collisions
// keys.js
export const ThemeKey = Symbol('theme');
provide(ThemeKey, theme);
const theme = inject(ThemeKey);
```

---

## 4. Directives & Render Functions

### Built-in Directives

```html
<!-- v-if / v-else-if / v-else — conditional rendering (DOM removed/added) -->
<div v-if="user">{{ user.name }}</div>
<div v-else>Not logged in</div>

<!-- v-show — toggles display: none (DOM stays) -->
<!-- ‼️ v-if: higher toggle cost (unmount/mount), v-show: higher initial cost -->
<!-- Use v-show for frequently toggled, v-if for rarely toggled -->
<div v-show="isVisible">Content</div>

<!-- v-for — list rendering -->
<!-- ‼️ Always add :key with stable unique ID — NOT array index -->
<li v-for="item in items" :key="item.id">{{ item.name }}</li>
<!-- ‼️ v-if and v-for on same element: v-if takes priority in Vue 3 -->
<!-- (v-for had priority in Vue 2 — breaking change) -->

<!-- v-bind — bind attribute or prop -->
<img :src="imageUrl" :alt="imageAlt" />
<MyComp v-bind="{ title: 'Hello', count: 5 }" />  <!-- spread object ‼️ -->

<!-- v-on — event listener -->
<button @click="handleClick">Click</button>
<input @keyup.enter="submit" @keyup.esc="cancel" />

<!-- Modifiers -->
<form @submit.prevent="onSubmit">     <!-- e.preventDefault() -->
<div @click.stop="onClick">           <!-- e.stopPropagation() -->
<input v-model.trim="name" />         <!-- auto-trim whitespace -->
<input v-model.number="age" />        <!-- auto-cast to number -->
<input v-model.lazy="bio" />          <!-- sync on change, not input -->
```

### Custom Directives

```js
// Custom directive — for direct DOM manipulation
// ‼️ Use components first; directives for low-level DOM access

// v-focus: auto-focus element on mount
const vFocus = {
    mounted(el) { el.focus(); }
};

// v-tooltip
const vTooltip = {
    mounted(el, binding) {
        // binding.value — the directive's value (v-tooltip="'Hello'")
        // binding.arg   — the argument  (v-tooltip:top="'Hello'")
        // binding.modifiers — { top: true, dark: true } for v-tooltip.top.dark
        el._tippy = tippy(el, { content: binding.value });
    },
    updated(el, binding) {
        el._tippy.setContent(binding.value);
    },
    unmounted(el) {
        el._tippy.destroy();
    },
};

// Register globally
app.directive('tooltip', vTooltip);

// Register locally (script setup)
// just define as `vTooltip` — the `v` prefix makes it a directive
<div v-tooltip="'Click me'">Hover</div>
```

---

## 5. Pinia — State Management

### Store Definition & Usage

```js
// stores/useUserStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Composition API style store (preferred)
export const useUserStore = defineStore('user', () => {
    // State
    const currentUser = ref(null);
    const users = ref([]);
    const loading = ref(false);

    // Getters (computed)
    const isLoggedIn = computed(() => currentUser.value !== null);
    const activeUsers = computed(() => users.value.filter(u => u.active));

    // Actions
    async function login(credentials) {
        loading.value = true;
        try {
            const user = await authService.login(credentials);
            currentUser.value = user;
        } finally {
            loading.value = false;
        }
    }

    function logout() {
        currentUser.value = null;
    }

    return { currentUser, users, loading, isLoggedIn, activeUsers, login, logout };
});

// Usage in component
<script setup>
import { useUserStore } from '@/stores/useUserStore';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();

// ‼️ storeToRefs — destructure reactive refs without losing reactivity
// Direct destructuring loses reactivity: const { isLoggedIn } = userStore; ✗
const { currentUser, isLoggedIn, loading } = storeToRefs(userStore);

// Actions can be destructured directly (they're plain functions, not refs)
const { login, logout } = userStore;

// Call action
await login({ email, password });
</script>
```

### Pinia Plugins & Persistence

```js
// Plugin — extend all stores
const piniaPlugin = ({ store }) => {
    // Restore state from localStorage
    const saved = localStorage.getItem(store.$id);
    if (saved) store.$patch(JSON.parse(saved));

    // Persist on every change
    store.$subscribe((mutation, state) => {
        localStorage.setItem(store.$id, JSON.stringify(state));
    });
};
pinia.use(piniaPlugin);

// store.$patch — batch state updates
userStore.$patch({ name: 'Bob', email: 'bob@b.com' }); // object form
userStore.$patch(state => { state.name = 'Bob'; state.items.push(newItem); }); // function form

// store.$reset() — reset to initial state (Options API stores only)
// store.$subscribe() — watch state changes
// store.$onAction() — intercept actions (before/after/error)
userStore.$onAction(({ name, args, after, onError }) => {
    console.log(`Action: ${name}`);
    after(result => console.log('Result:', result));
    onError(error => console.error('Error:', error));
});
```

---

## 6. Vue Router — Deep Dive

### Route Configuration

```js
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(), // HTML5 mode (no hash)
    // createWebHashHistory()    // hash mode (/path → /#/path)

    routes: [
        {
            path: '/',
            component: () => import('@/views/HomeView.vue'), // ‼️ lazy load (code split)
        },
        {
            path: '/users/:id',
            component: UserDetail,
            props: true, // ‼️ pass :id as prop instead of using $route.params
        },
        {
            path: '/dashboard',
            component: DashboardLayout,
            meta: { requiresAuth: true },
            children: [
                { path: '', component: DashboardHome },       // /dashboard
                { path: 'analytics', component: Analytics },  // /dashboard/analytics
            ],
        },
        {
            path: '/:pathMatch(.*)*', // catch-all
            component: NotFound,
        },
    ],
});
```

### Navigation Guards

```js
// Global before guard — runs before every navigation
router.beforeEach(async (to, from) => {
    const authStore = useAuthStore();

    // ‼️ Return false to cancel navigation
    // ‼️ Return a route location to redirect
    // ‼️ Return nothing / true to confirm navigation

    if (to.meta.requiresAuth && !authStore.isLoggedIn) {
        return { path: '/login', query: { redirect: to.fullPath } };
    }
});

// Route-level guard (inside route config)
{
    path: '/admin',
    component: AdminPanel,
    beforeEnter: (to, from) => {
        if (!userIsAdmin()) return '/forbidden';
    },
}

// In-component guard (Composition API)
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';

onBeforeRouteLeave((to, from) => {
    if (hasUnsavedChanges.value) {
        return window.confirm('Leave without saving?');
    }
});

// onBeforeRouteUpdate — same component, different params (e.g. /users/1 → /users/2)
onBeforeRouteUpdate(async (to) => {
    user.value = await fetchUser(to.params.id);
});
```

### Composables

```js
import { useRouter, useRoute } from 'vue-router';

const router = useRouter(); // for navigation
const route  = useRoute();  // for current route info (reactive)

// Read params, query, meta
const userId = route.params.id;           // '/users/:id'
const page   = route.query.page;          // '?page=2'
const requiresAuth = route.meta.requiresAuth;

// Navigate
router.push('/users');
router.push({ name: 'UserDetail', params: { id: 123 } });
router.push({ path: '/search', query: { q: 'vue' } });
router.replace('/login');  // replace history entry
router.back();
router.go(-2);

// ‼️ route is reactive — watch it to respond to URL changes
watch(() => route.params.id, async (newId) => {
    user.value = await fetchUser(newId);
}, { immediate: true });
```

---

## 7. Performance Optimization

### v-memo & v-once

```html
<!-- v-once — render once, never re-render (for truly static content) -->
<p v-once>{{ expensiveStaticValue }}</p>

<!-- v-memo — skip re-render unless these values change (Vue 3.2+) -->
<!-- ‼️ Use for expensive list items with many bindings -->
<div v-for="item in list" :key="item.id" v-memo="[item.selected, item.updatedAt]">
  {{ item.name }} — {{ item.description }} — {{ heavyComputed(item) }}
</div>
<!-- Re-renders this item ONLY when item.selected or item.updatedAt changes -->
```

### KeepAlive & defineAsyncComponent

```vue
<!-- <KeepAlive> — cache inactive component instances (don't destroy them) -->
<KeepAlive :include="['UserList']" :max="10">
    <component :is="currentTab" />
</KeepAlive>
<!-- ‼️ Cached components: onActivated / onDeactivated hooks fire instead of mounted/unmounted -->

<!-- Lazy load heavy components -->
<script setup>
import { defineAsyncComponent } from 'vue';

const HeavyEditor = defineAsyncComponent({
    loader: () => import('./HeavyEditor.vue'),
    loadingComponent: LoadingSpinner,
    errorComponent: ErrorDisplay,
    delay: 200,     // show loading after 200ms (avoid flash for fast loads)
    timeout: 5000,  // error if not loaded in 5s
});
</script>
```

### Reactivity Performance

```js
// ‼️ markRaw — exclude object from reactivity system (no proxy overhead)
import { markRaw, reactive } from 'vue';

const state = reactive({
    config: markRaw(hugeConfigObject),  // not tracked — reading it won't trigger effects
    map: markRaw(new Map()),            // ‼️ Map/Set with markRaw = large non-tracked store
});

// shallowRef / shallowReactive — track only top-level keys
import { shallowRef, triggerRef } from 'vue';

const bigList = shallowRef([]);
bigList.value.push(newItem);  // ✗ not tracked — nested mutation
triggerRef(bigList);           // ‼️ manually trigger update after mutation

// ‼️ Avoid reactive() on large objects that aren't meant to change deeply
// Use computed with getters for derived arrays rather than watchers that rebuild arrays
```

### Component Optimization

```text
Optimization checklist:
  ✓ Lazy load routes — () => import('./View.vue') in router
  ✓ defineAsyncComponent for heavy components
  ✓ v-once for completely static subtrees
  ✓ v-memo for expensive list items (conditional re-render)
  ✓ KeepAlive for tab components you switch between frequently
  ✓ markRaw for large non-reactive objects (map data, config)
  ✓ shallowRef/shallowReactive for large collections (control tracking depth)
  ✓ Avoid large reactive() objects — destructure to smaller refs
  ✓ Use key to force component re-creation instead of complex watch logic

  ‼️ Avoid:
    - watch with deep: true on large objects — use targeted watchers
    - Computed that builds large arrays — may recompute too often
    - Inline objects/functions in templates — new reference each render
      ✗ <Comp :style="{ color: 'red' }" />  — new object every render
      ✓ const style = { color: 'red' };      — stable reference
```

---

## 8. Common Interview Questions

```text
Q: How does Vue 3 reactivity differ from Vue 2?
A: Vue 2 used Object.defineProperty — property-by-property, couldn't detect:
     - Adding new properties (Vue.set() required)
     - Array mutations via index (arr[0] = val)
     - Array length changes
   Vue 3 uses Proxy — intercepts the whole object. Detects property addition,
   deletion, array index assignment, length changes. Works with Map and Set.

Q: What is the difference between ref() and reactive()?
A: ref() wraps a value (any type) in a reactive container accessed via .value.
   reactive() makes a plain object deeply reactive — no .value, direct property access.
   ‼️ ref() is preferred: avoids the reactive() destructuring pitfall, works with primitives,
   easier to pass around (it's a ref, not a plain object that loses reactivity on destructure).

Q: What is the difference between watch() and watchEffect()?
A: watch — explicit sources, access to old and new values, lazy by default (won't run on creation).
   watchEffect — auto-tracks anything read inside it, no old value, runs immediately on creation.
   Use watchEffect for side effects that mirror the reactive state.
   Use watch when you need the previous value or to run only on specific changes.

Q: Why use Pinia over Vuex?
A: Pinia has no mutations (actions can directly set state), better TypeScript support,
   works with Composition API natively, modular by default (no namespacing needed),
   smaller bundle, DevTools support. Vuex 5 was abandoned in favor of Pinia.
   ‼️ Pinia is the official Vue state management library since Vue 3.

Q: What are composables and how do they differ from mixins?
A: Composables are functions that use the Composition API to encapsulate and share logic.
   Mixins (Vue 2) had problems: unclear source of properties, naming conflicts, implicit coupling.
   Composables: explicit imports, no naming conflicts, tree-shakable, TypeScript-friendly.

Q: What does the key attribute do in v-for?
A: Keys help Vue's diffing algorithm identify which items changed, added, or removed.
   Stable keys (item IDs) allow efficient reordering (moves existing DOM nodes).
   ✗ Array index keys break on reorder/insert — Vue may update wrong elements.
   ✗ Keys that change unnecessarily force full remount of the component.

Q: When should you use v-if vs v-show?
A: v-if — component is unmounted/mounted on toggle. Higher toggle cost, but no initial render cost.
   v-show — toggles display:none. Always rendered initially, but toggle is instant (CSS only).
   Use v-show for: frequently toggled UI (tabs, dropdowns, tooltips).
   Use v-if for: rarely shown content, conditional rendering of expensive subtrees.
```
