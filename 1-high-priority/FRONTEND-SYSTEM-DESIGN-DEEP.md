# Frontend System Design

Frontend system design interviews test whether you can design a complex UI feature from scratch — not just "how would you build this component" but "walk me through the full architecture, trade-offs, and implementation decisions." This is one of the most common senior interview formats and the least prepared for.

---

## How Frontend System Design Differs from Backend

```text
Backend system design:
  - Focus: scalability, distributed systems, databases, APIs
  - Questions: design Twitter, design a URL shortener

Frontend system design:
  - Focus: component architecture, state management, performance, UX
  - Questions: design an autocomplete, design a file uploader, design a real-time feed
  - Also covers: API contracts, rendering strategy, accessibility, browser constraints

Both overlap on:
  - API design (what endpoints does the frontend need?)
  - Caching strategy
  - Real-time (WebSocket vs polling vs SSE)
  - Performance and scalability
```

## Framework for Answering

```text
1. Clarify requirements (3-5 min)
   - What are the core features? What is out of scope?
   - Desktop only or mobile too?
   - What are the performance constraints? (page load, interaction latency)
   - Accessibility requirements?
   - Offline support needed?
   - Scale: how many concurrent users, how much data?

2. Component architecture (5 min)
   - Break the UI into components
   - What is the component hierarchy?
   - What are the props/interfaces?

3. State and data (5-10 min)
   - What state exists and where does it live?
   - What API calls are needed?
   - How is data cached?
   - Real-time updates?

4. Performance (5 min)
   - What are the bottlenecks?
   - Virtualisation, lazy loading, debouncing, caching

5. Edge cases and accessibility (3 min)
   - Error states, empty states, loading states
   - Keyboard navigation, screen readers
   - Network failure, slow connections
```

---

## Question 1: Design an Autocomplete / Typeahead

Used by: search bars, address inputs, user mention (@username), tag inputs.

### Requirements clarification
```text
- Trigger: after N characters (2-3)
- Source: server API (large dataset) or client-side (small dataset)
- Max suggestions: 5-10
- Keyboard navigation: ↑↓ to select, Enter to confirm, Esc to close
- Accessibility: screen reader compatible
- Debounce: don't fire on every keystroke
- Highlight matching text in suggestions
```

### Component architecture
```typescript
<Autocomplete value={value} onChange={onChange} placeholder="Search...">
  <AutocompleteInput />           // the text input
  <AutocompleteDropdown>          // the suggestions list
    <AutocompleteOption />        // individual suggestion
  </AutocompleteDropdown>
</Autocomplete>

// State lives in the Autocomplete parent:
// - inputValue: string          (what's typed)
// - suggestions: Suggestion[]   (results from API)
// - selectedIndex: number       (keyboard cursor)
// - isOpen: boolean             (dropdown visibility)
// - status: 'idle' | 'loading' | 'error'
```

### Implementation
```typescript
function Autocomplete({ onSelect }: AutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  // Debounce API calls — don't fire on every keystroke
  const debouncedFetch = useMemo(
    () => debounce(async (query: string) => {
      if (query.length < 2) { setSuggestions([]); return; }
      setStatus('loading');
      try {
        const results = await api.search(query);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    }, 300),
    []
  );

  // Cancel pending request on unmount
  useEffect(() => () => debouncedFetch.cancel(), [debouncedFetch]);

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          onSelect(suggestions[selectedIndex]);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }

  return (
    <div role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
      <input
        value={inputValue}
        onChange={e => { setInputValue(e.target.value); debouncedFetch(e.target.value); }}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-controls="suggestions-list"
        aria-activedescendant={selectedIndex >= 0 ? `option-${selectedIndex}` : undefined}
      />
      {isOpen && (
        <ul id="suggestions-list" role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`option-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => { onSelect(s); setIsOpen(false); }}
            >
              <HighlightMatch text={s.label} query={inputValue} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Cache results so the same query doesn't re-fetch
const cache = new Map<string, Suggestion[]>();
async function fetchWithCache(query: string) {
  if (cache.has(query)) return cache.get(query)!;
  const results = await api.search(query);
  cache.set(query, results);
  return results;
}
```

### Key design decisions
```text
Debounce: 200-300ms — prevents firing on every keystroke
Min chars: 2 — avoid fetching for single characters
Cancellation: cancel in-flight requests when a new one starts (AbortController)
Caching: cache results per query string — avoids re-fetching the same query
Highlight: bold the matching portion in suggestions
Accessibility: ARIA combobox pattern (role, aria-expanded, aria-activedescendant)
Keyboard: full ↑↓ Enter Esc support
Click outside: close dropdown when clicking outside (useClickOutside hook)
```

---

## Question 2: Design an Infinite Scroll Feed

Used by: social feeds, search results, news, product listings.

### Requirements
```text
- Load items as user scrolls down
- Smooth, no full-page reload
- Handle: initial load, loading more, end of list, error
- Performance: don't render all items in DOM (virtualisation for very long lists)
- Accessible: keyboard users can trigger "load more" too
```

### Two approaches
```text
Scroll detection:     watch scroll position, load when near bottom
Intersection Observer: watch a sentinel element, load when it enters the viewport

Intersection Observer is better:
  - No scroll event listeners (expensive)
  - Works for non-window scrollers
  - Fires at the right threshold automatically
```

### Implementation
```typescript
// TanStack Query infinite scroll
function InfiniteFeed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 0 }) => api.getFeed({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Sentinel element at the bottom — triggers load when visible
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchNextPage(); },
      { rootMargin: '200px' }  // load 200px before the sentinel is visible
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const allItems = data?.pages.flatMap(page => page.items) ?? [];

  if (status === 'pending') return <FeedSkeleton />;
  if (status === 'error') return <ErrorMessage />;

  return (
    <div>
      {allItems.map(item => <FeedItem key={item.id} item={item} />)}
      
      {/* Sentinel — IntersectionObserver watches this */}
      <div ref={sentinelRef} />
      
      {isFetchingNextPage && <LoadingSpinner />}
      {!hasNextPage && <p>You've reached the end</p>}
      
      {/* Accessibility fallback for keyboard users */}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} className="sr-only">
          Load more items
        </button>
      )}
    </div>
  );
}
```

### Virtualisation (for very long lists)
```typescript
// When the DOM has 10,000+ items, rendering all is too slow
// Virtualisation only renders what's visible in the viewport

import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,   // estimated item height in px
    overscan: 5,               // render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {/* Total height — makes scrollbar correct */}
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualItem.start}px)`,
              width: '100%',
            }}
          >
            <FeedItem item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Question 3: Design a Real-Time Collaborative Editor

Used by: Google Docs, Notion, Figma comments, code editors.

### Requirements
```text
- Multiple users editing the same document simultaneously
- Changes appear in near real-time for all users
- No conflicts — two users editing the same word shouldn't destroy each other's changes
- Show presence: who else is in the document, where their cursor is
- Offline: user can keep editing offline, sync when reconnected
```

### Conflict resolution strategies
```text
Last-Write-Wins (LWW):
  Simplest. Whoever saves last wins.
  Problem: concurrent edits to the same location overwrite each other.
  Use for: non-conflicting fields (title, status), not text editing.

Operational Transformation (OT):
  Transform operations to account for concurrent changes.
  "Insert at position 5" + "Delete at position 3" → transform insert to position 4.
  Used by: Google Docs.
  Complex to implement correctly.

CRDTs (Conflict-free Replicated Data Types):
  Mathematical data structures that merge automatically without conflicts.
  Each character has a unique position — no index collisions.
  Used by: Figma, Linear, many modern tools.
  Libraries: Yjs, Automerge.
  Easier to use than OT, similar results.
```

### Architecture with Yjs
```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';

// Yjs document — the shared state
const ydoc = new Y.Doc();

// WebSocket connection to sync server
const provider = new WebsocketProvider(
  'wss://your-sync-server.com',
  'document-room-id',
  ydoc
);

// Awareness — presence (cursors, user info)
const awareness = provider.awareness;
awareness.setLocalState({
  user: { name: currentUser.name, color: '#3b82f6' },
  cursor: null,
});

// Subscribe to other users' presence
awareness.on('change', () => {
  const states = Array.from(awareness.getStates().entries())
    .filter(([clientId]) => clientId !== ydoc.clientID);
  renderCursors(states);
});

// Bind to your editor (Quill, TipTap, ProseMirror, etc.)
const ytext = ydoc.getText('content');
const binding = new QuillBinding(ytext, quill, provider.awareness);

// Offline support: Yjs buffers changes locally and syncs when reconnected
provider.on('status', ({ status }) => {
  setConnectionStatus(status); // 'connected' | 'disconnected'
});
```

### Sync server
```typescript
// Simple y-websocket server — syncs Yjs documents between clients
// npm install y-websocket

import { createServer } from 'http';
import { setupWSConnection } from 'y-websocket/bin/utils';

const server = createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  // roomName from URL: ws://server/document-id
  setupWSConnection(ws, req);
});

server.listen(1234);
// That's it — y-websocket handles all the CRDT syncing
```

---

## Question 4: Design a File Uploader

Used by: image uploads, document uploads, avatar pickers, bulk import.

### Requirements
```text
- Single and multi-file upload
- Progress indication per file
- Drag and drop + click to browse
- File validation: type, size limits
- Resumable uploads for large files
- Preview before upload (images)
- Cancel in-progress upload
```

### Component architecture
```
<FileUploader>
  <DropZone />               // drag/drop target + click to browse
  <FileList>
    <FileItem>               // each file: name, size, status, progress bar
      <ProgressBar />
      <CancelButton />
      <ErrorMessage />
    </FileItem>
  </FileList>
</FileUploader>
```

### Implementation
```typescript
type FileWithStatus = {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'done' | 'error' | 'cancelled';
  progress: number;  // 0-100
  previewUrl?: string;
  error?: string;
  abortController?: AbortController;
};

function FileUploader({ onUploadComplete, accept, maxSizeMb = 10 }: FileUploaderProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);

  function addFiles(newFiles: File[]) {
    const validated = newFiles.filter(file => {
      if (!accept.includes(file.type)) {
        toast.error(`${file.name}: unsupported file type`);
        return false;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast.error(`${file.name}: exceeds ${maxSizeMb}MB limit`);
        return false;
      }
      return true;
    });

    const entries: FileWithStatus[] = validated.map(file => ({
      file,
      id: crypto.randomUUID(),
      status: 'pending',
      progress: 0,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setFiles(prev => [...prev, ...entries]);
    entries.forEach(uploadFile);
  }

  async function uploadFile(entry: FileWithStatus) {
    const abortController = new AbortController();
    setFiles(prev => prev.map(f =>
      f.id === entry.id ? { ...f, status: 'uploading', abortController } : f
    ));

    try {
      // Get presigned URL from your backend
      const { uploadUrl, fileKey } = await api.getUploadUrl({
        filename: entry.file.name,
        contentType: entry.file.type,
      });

      // Upload directly to S3/GCS — backend never receives the file bytes
      await uploadWithProgress(entry.file, uploadUrl, abortController.signal, (progress) => {
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress } : f));
      });

      setFiles(prev => prev.map(f =>
        f.id === entry.id ? { ...f, status: 'done', progress: 100 } : f
      ));
      onUploadComplete({ fileKey, filename: entry.file.name });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'cancelled' } : f));
      } else {
        setFiles(prev => prev.map(f =>
          f.id === entry.id ? { ...f, status: 'error', error: 'Upload failed' } : f
        ));
      }
    }
  }

  function cancelUpload(id: string) {
    const file = files.find(f => f.id === id);
    file?.abortController?.abort();
  }

  // Upload with progress tracking using XMLHttpRequest
  // (fetch doesn't support upload progress natively)
  function uploadWithProgress(
    file: File,
    url: string,
    signal: AbortSignal,
    onProgress: (pct: number) => void
  ) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => xhr.status < 400 ? resolve() : reject(new Error('Upload failed'));
      xhr.onerror = () => reject(new Error('Network error'));
      signal.addEventListener('abort', () => { xhr.abort(); reject(new Error('AbortError')); });

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  // Drag and drop handlers
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
    >
      <DropZone onBrowse={files => addFiles(Array.from(files))} />
      <FileList files={files} onCancel={cancelUpload} />
    </div>
  );
}
```

### Large file uploads — chunked / resumable
```typescript
// For files > 100MB: use multipart upload (S3) or TUS protocol
// TUS is an open resumable upload protocol

import { Upload } from 'tus-js-client';

async function resumableUpload(file: File, onProgress: (pct: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: 'https://your-server.com/uploads',
      retryDelays: [0, 3000, 5000, 10000, 20000],  // auto-retry on failure
      metadata: { filename: file.name, filetype: file.type },
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess: () => resolve(upload.url!),
      onError: reject,
    });

    // Resume if previous upload was interrupted
    upload.findPreviousUploads().then(previous => {
      if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}
```

---

## Question 5: Design a Drag and Drop Interface

Used by: kanban boards (Jira), file managers, sortable lists, form builders.

### Core concepts
```text
HTML5 Drag and Drop API:
  - Built-in, no library needed for simple cases
  - draggable="true" on the element
  - Events: dragstart, dragover, dragleave, drop, dragend
  - dataTransfer: pass data between drag source and drop target

Libraries:
  - dnd-kit: modern, accessible, composable (recommended)
  - react-beautiful-dnd: popular but less maintained
  - @dnd-kit/core: headless — bring your own UI

Key problems:
  - Performance: re-rendering the whole list on every drag event
  - Accessibility: drag and drop is not accessible by default (need keyboard alternative)
  - Touch: HTML5 D&D doesn't work on mobile (need pointer events)
```

### Kanban board with dnd-kit
```typescript
import {
  DndContext, DragOverlay, DragEndEvent, DragStartEvent,
  useSensor, useSensors, PointerSensor, KeyboardSensor,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';

// Each column is a droppable container
// Each card is a sortable (draggable + droppable) item

function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {                        // keyboard accessibility
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveCard(findCard(active.id as string));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null);
    if (!over || active.id === over.id) return;

    const activeColumnId = findColumnId(active.id as string);
    const overColumnId = findColumnId(over.id as string) ?? over.id as string;

    setColumns(prev => {
      if (activeColumnId === overColumnId) {
        // Same column — reorder
        const column = prev.find(c => c.id === activeColumnId)!;
        const oldIndex = column.cards.findIndex(c => c.id === active.id);
        const newIndex = column.cards.findIndex(c => c.id === over.id);
        return prev.map(c =>
          c.id === activeColumnId
            ? { ...c, cards: arrayMove(c.cards, oldIndex, newIndex) }
            : c
        );
      } else {
        // Different column — move card
        const card = findCard(active.id as string)!;
        return prev.map(c => {
          if (c.id === activeColumnId) return { ...c, cards: c.cards.filter(c => c.id !== active.id) };
          if (c.id === overColumnId) return { ...c, cards: [...c.cards, card] };
          return c;
        });
      }
    });

    // Persist to server
    api.moveCard({ cardId: active.id, targetColumnId: overColumnId });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="board">
        {columns.map(column => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>

      {/* Drag overlay — what you see while dragging */}
      <DragOverlay>
        {activeCard && <CardDragPreview card={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({ column }: { column: Column }) {
  return (
    <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
      <div className="column">
        <h3>{column.title}</h3>
        {column.cards.map(card => <SortableCard key={card.id} card={card} />)}
      </div>
    </SortableContext>
  );
}

function SortableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'card card--dragging' : 'card'}
      {...attributes}
      {...listeners}
    >
      {card.title}
    </div>
  );
}
```

---

## Question 6: Design a Notification System

Used by: real-time alerts, toast messages, in-app notifications, badge counts.

### Architecture
```text
Three parts:
  1. Toast / snackbar — ephemeral messages, auto-dismiss (3-5s)
  2. Notification centre — persistent inbox (bell icon with count)
  3. Real-time delivery — WebSocket or SSE to push new notifications
```

```typescript
// Toast system — singleton pattern with React context
const ToastContext = createContext<ToastAPI | null>(null);

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const api: ToastAPI = {
    success: (msg, opts) => add({ type: 'success', message: msg, ...opts }),
    error: (msg, opts) => add({ type: 'error', message: msg, duration: 6000, ...opts }),
    info: (msg, opts) => add({ type: 'info', message: msg, ...opts }),
  };

  function add(toast: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...toast, id }]);
    // Auto-dismiss
    setTimeout(() => remove(id), toast.duration ?? 4000);
  }

  function remove(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Portal: render outside main DOM hierarchy */}
      <ToastContainer toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext)!;

// Real-time notifications via SSE
function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const toast = useToast();

  useEffect(() => {
    const es = new EventSource('/api/notifications/stream');

    es.onmessage = (event) => {
      const notification = JSON.parse(event.data) as Notification;
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(c => c + 1);
      // Show toast for high-priority notifications
      if (notification.priority === 'high') {
        toast.info(notification.message);
      }
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  function markAllRead() {
    setUnreadCount(0);
    api.notifications.markAllRead();
  }

  return { notifications, unreadCount, markAllRead };
}
```

---

## Common Trade-off Discussions

```text
Polling vs WebSocket vs SSE:
  Polling:   simple, works everywhere, wasteful (requests even when no data)
  WebSocket: bidirectional, low latency, complex (connection mgmt, scaling)
  SSE:       server→client only, auto-reconnect, simpler than WebSocket
  → SSE for notifications (server pushes, client doesn't need to send)
  → WebSocket for chat, collaboration (bidirectional)
  → Polling for non-realtime status checks

Optimistic updates vs wait for server:
  Optimistic: update UI immediately, revert on error (better UX, more complex)
  Wait:       show loading, update only when server confirms (simpler, feels slow)
  → Use optimistic for: likes, reorders, simple state changes
  → Wait for: payments, destructive actions, anything with complex side effects

Virtualisation vs pagination:
  Virtualisation: all data loaded, only render visible rows (fast scroll, complex)
  Pagination: load data per page (simpler, works for non-scroll UIs)
  → Virtualise for: large tables, long lists where "page N" makes no sense
  → Paginate for: search results, admin tables, anything with explicit pages

Client-side search vs server search:
  Client: instant results, only works if all data is loaded
  Server: works for any dataset size, adds latency, needs debounce
  → Client for: < 1000 items already in memory
  → Server for: large datasets, need full-text search, fuzzy matching
```
