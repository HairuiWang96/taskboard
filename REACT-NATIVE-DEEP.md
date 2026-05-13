# React Native — Senior Developer Deep Reference
**Priority: MEDIUM** — If you know React, this is your fastest path to mobile

> Covers: how React Native works, core components, styling, navigation, native modules, platform differences, and interview questions.

---

## Table of Contents

1. [How React Native Works](#1-how-react-native-works)
2. [Core Components](#2-core-components)
3. [Styling](#3-styling)
4. [Navigation (React Navigation)](#4-navigation-react-navigation)
5. [State Management](#5-state-management)
6. [Networking & Data Fetching](#6-networking--data-fetching)
7. [Platform Differences](#7-platform-differences)
8. [Native Modules & Expo](#8-native-modules--expo)
9. [Performance](#9-performance)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. How React Native Works

### Architecture

```text
OLD architecture (bridge):
  JS Thread → serializes to JSON → Bridge → Native Thread → deserialize
  Asynchronous, batched. Crossing the bridge is expensive.
  Major bottleneck for complex animations and frequent updates.

NEW architecture (JSI — JavaScript Interface, React Native 0.74+):
  JS → JSI (C++ interface) → native directly — synchronous calls possible
  No serialization overhead.
  Fabric:    new rendering system (synchronous, concurrent-mode ready)
  Turbo Modules: lazy-loaded native modules (faster startup)

Mental model:
  React code runs in JS thread.
  Output is NOT HTML — it's a tree of native view descriptions.
  React Native maps:
    <View>  → UIView (iOS) / android.view.View (Android)
    <Text>  → UILabel / TextView
    <Image> → UIImageView / ImageView

  Each platform renders its OWN native components from your JS description.
  This is why React Native feels more native than a WebView (Cordova/Ionic).
```

### React Native vs Expo

```text
React Native (bare):
  Full control, can use ANY native library, must manage Xcode/Android Studio.
  More complex setup, better for large apps.

Expo (recommended for most projects):
  SDK wraps common native APIs (camera, location, notifications, etc.)
  Managed workflow: no Xcode/Android Studio for most development.
  Expo Go: test on device without building.
  EAS Build: cloud build service.
  When you need something outside Expo SDK: "eject" to bare workflow.

Start with Expo unless you have a specific reason not to.
npx create-expo-app@latest MyApp
```

---

## 2. Core Components

```tsx
import {
  View, Text, Image, TextInput, TouchableOpacity,
  ScrollView, FlatList, Modal, ActivityIndicator,
  SafeAreaView, StyleSheet, Platform
} from 'react-native';

// View = <div> — the fundamental container
// Text = <p>/<span> — ALL text MUST be in <Text>
// Image = <img>
// TextInput = <input>
// ScrollView = <div style="overflow: scroll"> (loads all children)
// FlatList = virtualized list — only renders visible items (use for long lists)

function TaskListScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <SafeAreaView style={styles.container}>   {/* respects notch, status bar */}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}           // like onChange (not onChangeText)
          placeholder="New task..."
          returnKeyType="done"                  // keyboard return button label
          onSubmitEditing={() => addTask()}     // submit on return key
          autoCapitalize="sentences"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={() => addTask()}             // not onClick — onPress
          activeOpacity={0.7}                  // visual feedback on press
        >
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {loading && <ActivityIndicator size="large" color="#007AFF" />}

      {/* List — prefer FlatList over ScrollView for long data */}
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}          // like key prop
        renderItem={({ item }) => (
          <TaskRow task={item} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>No tasks yet</Text>}
        refreshControl={                         // pull-to-refresh
          <RefreshControl refreshing={loading} onRefresh={loadTasks} />
        }
      />

    </SafeAreaView>
  );
}
```

### Pressable (modern touch handling)

```tsx
import { Pressable } from 'react-native';

// Pressable is the modern replacement for TouchableOpacity
<Pressable
  onPress={handlePress}
  onLongPress={handleLongPress}
  style={({ pressed }) => [     // style as function — changes on press state
    styles.button,
    pressed && styles.buttonPressed,  // add pressed style when pressed
  ]}
>
  {({ pressed }) => (
    <Text style={pressed ? styles.textPressed : styles.text}>
      Press me
    </Text>
  )}
</Pressable>
```

---

## 3. Styling

### StyleSheet

```tsx
// React Native styles are JS objects — NOT CSS
// camelCase properties: backgroundColor (not background-color)
// No CSS cascade — styles don't inherit (except some Text properties within Text)
// Dimensions in density-independent pixels (dp / pt) — not px

const styles = StyleSheet.create({
  // StyleSheet.create is optional but:
  //   1. Validates style properties in development
  //   2. Sends styles once and caches IDs — minor performance benefit

  container: {
    flex: 1,                          // flex: 1 = fill available space
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',             // horizontal layout (column is default in RN)
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',                // string, not number
    color: '#1A1A1A',
    lineHeight: 24,
  },
  shadow: {
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android shadow
    elevation: 3,
  },
});

// Combining styles (like className with cn())
<View style={[styles.container, styles.shadow, active && styles.active]} />

// Inline styles (avoid for performance — creates new object every render)
<Text style={{ fontSize: 16, color: 'blue' }}>Hello</Text>
```

### Dimensions and responsive design

```tsx
import { Dimensions, useWindowDimensions } from 'react-native';

// Static (doesn't update on rotation — use useWindowDimensions instead)
const { width, height } = Dimensions.get('window');

// Reactive hook (updates on orientation change)
function ResponsiveComponent() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <View style={{ width: width * 0.9 }}>   {/* 90% of screen width */}
      {isLandscape ? <LandscapeLayout /> : <PortraitLayout />}
    </View>
  );
}

// Percentage widths (React Native Reanimated / Flex is usually better)
// Use flexbox — same as web but column is the default direction
```

---

## 4. Navigation (React Navigation)

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Type your params (like typed routes)
type RootStackParamList = {
  Home: undefined;
  TaskDetail: { taskId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator();

// Root navigation structure
function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Tasks"    component={TaskStack} />
        <Tab.Screen name="Profile"  component={ProfileScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Nested stack navigator inside a tab
function TaskStack() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home"       component={TaskListScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen}
        options={{ title: 'Task Detail' }}
      />
    </Stack.Navigator>
  );
}

// Using navigation in components
function TaskListScreen({ navigation }) {
  return (
    <FlatList
      data={tasks}
      renderItem={({ item }) => (
        <Pressable onPress={() =>
          navigation.navigate('TaskDetail', { taskId: item.id })  // typed!
        }>
          <Text>{item.title}</Text>
        </Pressable>
      )}
    />
  );
}

// Hooks (preferred over prop drilling)
import { useNavigation, useRoute } from '@react-navigation/native';

function TaskDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'TaskDetail'>>();
  const { taskId } = route.params;

  return (
    <View>
      <Text>Task ID: {taskId}</Text>
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}
```

---

## 5. State Management

```tsx
// Same options as web React — all work in React Native:
// useState, useReducer, Context, Zustand, TanStack Query

// TanStack Query works exactly the same (install the same package)
import { useQuery, useMutation } from '@tanstack/react-query';

function TaskListScreen() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetch('https://api.example.com/tasks').then(r => r.json()),
  });

  // Exactly the same API as web — knowledge transfers directly
}

// Zustand — also works identically
import { create } from 'zustand';
const useStore = create(set => ({
  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task }),
}));
```

---

## 6. Networking & Data Fetching

```tsx
// fetch() works in React Native (polyfilled)
// axios works too (install separately)
// TanStack Query is recommended (see above)

async function fetchTasks(): Promise<Task[]> {
  const response = await fetch('https://api.example.com/tasks', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Storing auth tokens securely
import * as SecureStore from 'expo-secure-store';  // Expo

await SecureStore.setItemAsync('token', jwtToken);   // encrypted on device
const token = await SecureStore.getItemAsync('token');
await SecureStore.deleteItemAsync('token');

// For bare React Native: react-native-keychain
```

---

## 7. Platform Differences

```tsx
import { Platform } from 'react-native';

// Check platform
Platform.OS           // 'ios' | 'android' | 'web'
Platform.Version      // iOS: '17.0', Android: 33 (API level)

// Platform-specific styles
const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
});

// Platform-specific code in JSX
<View style={[
  styles.container,
  Platform.OS === 'ios' && styles.iosOnly,
]}>

// Platform-specific files
// Button.ios.tsx   — used on iOS
// Button.android.tsx — used on Android
// Button.tsx       — fallback
// React Native picks the right one automatically

// Key platform differences:
// iOS:     status bar, notch/dynamic island, back gesture (swipe right)
// Android: hardware back button, different keyboard behavior
//          overdraw concerns, different default fonts
// Both:    SafeAreaView handles status bar + notch
//          Keyboard.dismiss() to dismiss keyboard
```

---

## 8. Native Modules & Expo

```tsx
// Expo SDK — pre-built access to native APIs
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

// Camera
const [permission, requestPermission] = Camera.useCameraPermissions();

if (!permission?.granted) {
  return (
    <View>
      <Text>Camera access needed</Text>
      <Button title="Grant Permission" onPress={requestPermission} />
    </View>
  );
}

return <Camera.CameraView style={{ flex: 1 }} />;

// Push Notifications (Expo)
const { status } = await Notifications.requestPermissionsAsync();
const token = await Notifications.getExpoPushTokenAsync();
// Send token to your server — use it to push to this device

// Location
const { status } = await Location.requestForegroundPermissionsAsync();
const location = await Location.getCurrentPositionAsync({});
// { coords: { latitude, longitude, accuracy, ... } }
```

---

## 9. Performance

```text
React Native performance rules:

1. Avoid unnecessary re-renders
   Same as web React: memo, useCallback, useMemo, stable references.

2. Use FlatList, not ScrollView, for long lists
   ScrollView renders ALL children. FlatList virtualizes (renders visible only).

3. Avoid fat JS thread
   Heavy computation blocks the JS thread → dropped frames.
   Use InteractionManager.runAfterInteractions for non-urgent work.
   Move heavy computation to native modules or web workers (Hermes supports some).

4. Use native driver for animations
   useNativeDriver: true — runs animation on native thread, not JS thread.
   Limitation: only transform and opacity can use native driver.

5. Hermes JavaScript engine
   Enabled by default in new React Native projects.
   Faster startup, lower memory footprint than V8/JSC.

6. Reduce bridge crossings (old architecture)
   Batch native calls, avoid rapid back-and-forth.
   New architecture (JSI/Fabric) eliminates bridge — less concern.
```

```tsx
import Animated, { useSharedValue, useAnimatedStyle,
  withSpring, withTiming } from 'react-native-reanimated';

// React Native Reanimated — animations that run on UI thread (not JS thread)
function AnimatedCard() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text>Press me</Text>
      </Animated.View>
    </Pressable>
  );
}
```

---

## 10. Common Interview Questions

### "How does React Native differ from a WebView-based approach?"

> WebView apps (Cordova, Ionic) run a web browser inside the app and display web content. React Native is different — it compiles your component tree into actual native views (UIView on iOS, android.view.View on Android). The JS logic runs in a JavaScript engine, but the UI you see is 100% native components — the same ones Apple and Google provide. This is why React Native apps feel native: native scrolling, native text rendering, native tap feedback.

### "What is the bridge and why does the new architecture replace it?"

> The bridge was the original communication mechanism between JavaScript and native code. Every call crossed the bridge as serialized JSON, making it asynchronous and causing bottlenecks for frequent updates (like animations). The new architecture (JSI — JavaScript Interface) allows JS to hold direct references to C++ host objects and call native methods synchronously without serialization. Fabric (new renderer) and Turbo Modules (lazy native modules) build on JSI, enabling concurrent-mode React and eliminating the bridge bottleneck.

### "When would you use FlatList over ScrollView?"

> ScrollView renders all its children immediately — fine for a handful of items. FlatList is virtualized — it renders only the items currently visible on screen plus a small buffer. For any list that could grow (tasks, messages, search results), always use FlatList. ScrollView with many items = slow render, high memory usage. FlatList = constant memory regardless of list length.

### "How do you store sensitive data in React Native?"

> Never use AsyncStorage for sensitive data — it's unencrypted plain text. Use Keychain (iOS) or Keystore (Android) via `expo-secure-store` or `react-native-keychain`. These store data in the OS-level secure enclave, encrypted and tied to the device. JWT tokens, passwords, and API keys should always go here. Regular preferences (theme, language) can use AsyncStorage or MMKV.

### "What are the main differences between iOS and Android in React Native?"

> Key differences: shadows work differently (iOS: shadowColor/shadowOffset/shadowOpacity, Android: elevation). Navigation back behavior (iOS: swipe right, Android: hardware back button — handle with `BackHandler`). Font rendering (iOS uses San Francisco, Android uses Roboto by default). Keyboard behavior (Android back button closes keyboard, iOS requires explicit Keyboard.dismiss()). Permission request flows differ. `SafeAreaView` handles the platform-specific notch/status bar areas. The `Platform.OS` check lets you apply platform-specific code or styles.

---

## Most Asked React Native Interview Questions

### "How does React Native differ from a WebView app?"

> React Native compiles to native components — `<View>` becomes `UIView` on iOS and `android.view.View` on Android. Not a WebView (not rendering HTML in a browser). The JavaScript runs in a separate thread and communicates with native via a bridge (or the new JSI — JavaScript Interface). Performance is close to fully native because the actual UI rendering uses native components. WebView apps (Cordova, Ionic) render HTML/CSS — more portable but worse performance and feel.

### "What is the difference between the Old Architecture (Bridge) and New Architecture (JSI/Fabric)?"

> **Old Architecture**: JS and native code run in separate threads and communicate asynchronously via a serialized JSON bridge — every JS↔native call is serialized/deserialized, async, and has overhead. **New Architecture**: JSI (JavaScript Interface) allows JS to hold direct references to native objects and call native methods synchronously — no bridge, no serialization. Fabric is the new rendering system (concurrent rendering). TurboModules are the new native modules (loaded lazily). Result: faster, synchronous native access, better performance.

### "What is the difference between `ScrollView` and `FlatList`?"

> `ScrollView` renders ALL children at once — bad for long lists (memory issues, slow initial render). Use for short content (settings screens, forms). `FlatList` renders only visible items (windowed/virtualized) — efficient for any length list. Also provides: `keyExtractor`, `onEndReached` for pagination, `refreshing`/`onRefresh` for pull-to-refresh, `getItemLayout` for performance optimization.

```jsx
// FlatList — always use for dynamic lists
<FlatList
    data={items}
    keyExtractor={item => item.id.toString()}
    renderItem={({ item }) => <ItemRow item={item} />}
    onEndReached={loadMore}
    onEndReachedThreshold={0.5}
    refreshing={isRefreshing}
    onRefresh={handleRefresh}
/>
```

### "How do you handle navigation in React Native?"

> React Navigation is the de-facto standard. Key navigators: **Stack** — push/pop screens (like iOS navigation controller). **Tab** — bottom tabs. **Drawer** — side menu. **Native Stack** — uses native navigation components for better performance and correct animations. Nest navigators for complex flows. Pass params with `navigation.navigate('Screen', { id: 123 })`, read with `route.params`.

```jsx
const Stack = createNativeStackNavigator();

function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Details" component={DetailsScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

// Navigate with params
navigation.navigate('Details', { itemId: 42 });
// Read params
const { itemId } = route.params;
```

### "What is Expo and when do you choose it over bare React Native?"

> Expo is a framework and platform on top of React Native. **Managed Expo**: no native code, build in the cloud with EAS Build, OTA updates with EAS Update, huge library of pre-built native modules. Great for most apps. **Expo bare workflow** or **pure React Native**: when you need a native module not in Expo's ecosystem, or specific native customizations. Rule: start with Expo managed; eject only if necessary. Expo has closed most of the gap with pure RN in recent years.

### "How do you optimize React Native performance?"

> Key techniques: `FlatList` with `getItemLayout` (skip dynamic measurement), `React.memo` to prevent re-renders, `useCallback`/`useMemo` for stable references, move animations off the JS thread with `Animated` using `useNativeDriver: true` (or use Reanimated 2 which runs fully on UI thread), avoid `StyleSheet` objects created inline, use `InteractionManager.runAfterInteractions` for heavy work after navigation. Profile with Flipper or the React Native DevTools.

```jsx
// Run animations on native thread
Animated.timing(value, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,  // runs on UI thread, no JS bridge
}).start();

// Or use Reanimated 2 — worklets run on UI thread
const style = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(offset.value) }],
}));
```

### "What is the difference between `AsyncStorage` and other storage options?"

> `AsyncStorage` — simple key-value store, async, unencrypted, no querying, 6MB limit on some platforms. Good for: preferences, non-sensitive settings. **MMKV** — faster synchronous storage (10x faster than AsyncStorage), good for high-frequency reads. **SQLite** (expo-sqlite or react-native-sqlite-storage) — relational, queryable, good for complex offline data. **Keychain/Keystore** (react-native-keychain) — encrypted, OS-level secure storage — use for tokens and passwords. **WatermelonDB/RxDB** — reactive databases for complex offline-first apps.

### "How do you handle platform-specific code?"

> Three approaches: 1) `Platform.OS` check inline. 2) Platform-specific file extensions (`.ios.tsx` / `.android.tsx`) — Metro bundler picks the right one automatically. 3) `Platform.select()` for selecting values.

```jsx
// Inline check
const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight;

// Platform.select
const styles = StyleSheet.create({
    container: {
        paddingTop: Platform.select({ ios: 44, android: 24, default: 0 }),
    }
});

// File extensions — automatically resolved by Metro
// Button.ios.tsx  → used on iOS
// Button.android.tsx → used on Android
import Button from './Button'; // Metro picks the right file
```
