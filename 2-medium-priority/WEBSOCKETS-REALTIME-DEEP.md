# WebSockets & Real-Time — Deep Reference

## WebSocket Fundamentals

### How WebSocket Works

```
HTTP:       Client → Request → Server → Response → Connection closed
            (one request, one response)

WebSocket:  Client → HTTP Upgrade Request → Server → 101 Switching Protocols
            ← → ← → ← → (full-duplex, persistent connection)
            Both sides can send messages at any time
            Connection stays open until explicitly closed
```

### WebSocket vs Polling vs SSE

```
Short Polling:
- Client requests every N seconds — simple but wasteful
- Most requests return no new data
- High server load, not real-time (up to N seconds delay)

Long Polling:
- Client sends request, server holds it until there's new data, then responds
- Client immediately sends another request
- Lower latency than polling, still creates new connections frequently
- Good fallback for environments where WebSocket is unavailable

Server-Sent Events (SSE):
- Server → Client only (one-directional)
- Standard HTTP, auto-reconnects, works through proxies
- Great for: live feeds, notifications, progress updates (no client data needed)
- Limited browser connections (6 per domain)

WebSocket:
- Full duplex — both sides send anytime
- Single persistent TCP connection (after upgrade)
- Lower overhead per message (no HTTP headers repeated)
- Use for: chat, collaborative editing, live gaming, trading dashboards
```

---

## Server Implementation (Node.js + ws)

```ts
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Track connected clients (with metadata)
const clients = new Map<WebSocket, { userId: string; rooms: Set<string> }>();

wss.on('connection', (ws, req) => {
    // Authenticate on connect
    const token = new URL(req.url!, 'http://localhost').searchParams.get('token');
    const user = verifyToken(token);
    if (!user) return ws.close(4001, 'Unauthorized');

    clients.set(ws, { userId: user.id, rooms: new Set() });
    console.log(`Client connected: ${user.id}. Total: ${wss.clients.size}`);

    ws.on('message', (rawData) => {
        try {
            const message = JSON.parse(rawData.toString());
            handleMessage(ws, message);
        } catch {
            ws.send(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });

    ws.on('close', (code, reason) => {
        const client = clients.get(ws);
        console.log(`Disconnected: ${client?.userId}, code: ${code}`);
        clients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        clients.delete(ws);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected', userId: user.id }));
});
```

---

## Message Protocol

```ts
// Always define a typed message protocol — avoids chaos
type ClientMessage =
    | { type: 'join_room'; roomId: string }
    | { type: 'leave_room'; roomId: string }
    | { type: 'send_message'; roomId: string; text: string }
    | { type: 'typing'; roomId: string }
    | { type: 'ping' };

type ServerMessage =
    | { type: 'pong' }
    | { type: 'message'; roomId: string; userId: string; text: string; timestamp: string }
    | { type: 'user_joined'; roomId: string; userId: string }
    | { type: 'user_left'; roomId: string; userId: string }
    | { type: 'typing'; roomId: string; userId: string }
    | { type: 'error'; message: string };

function handleMessage(ws: WebSocket, message: ClientMessage) {
    const client = clients.get(ws)!;

    switch (message.type) {
        case 'join_room':
            client.rooms.add(message.roomId);
            broadcast(message.roomId, {
                type: 'user_joined',
                roomId: message.roomId,
                userId: client.userId
            }, ws); // exclude sender
            break;

        case 'send_message':
            if (!client.rooms.has(message.roomId)) {
                return send(ws, { type: 'error', message: 'Not in this room' });
            }
            broadcast(message.roomId, {
                type: 'message',
                roomId: message.roomId,
                userId: client.userId,
                text: message.text,
                timestamp: new Date().toISOString()
            });
            break;

        case 'ping':
            send(ws, { type: 'pong' });
            break;
    }
}

// Send to one client
function send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// Broadcast to all clients in a room
function broadcast(roomId: string, message: ServerMessage, exclude?: WebSocket) {
    clients.forEach((client, ws) => {
        if (ws !== exclude && client.rooms.has(roomId)) {
            send(ws, message);
        }
    });
}
```

---

## Client Implementation

```ts
class RealtimeClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private listeners = new Map<string, ((data: unknown) => void)[]>();
    private pingInterval: ReturnType<typeof setInterval> | null = null;

    connect(token: string) {
        const url = `${process.env.WS_URL}?token=${token}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('Connected');
            this.reconnectAttempts = 0;
            this.startPing();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.emit(message.type, message);
            } catch {
                console.error('Failed to parse message');
            }
        };

        this.ws.onclose = (event) => {
            this.stopPing();
            if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                // Exponential backoff: 1s, 2s, 4s, 8s... up to 30s
                const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
                this.reconnectAttempts++;
                console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
                setTimeout(() => this.connect(token), delay);
            }
        };

        this.ws.onerror = (error) => console.error('WebSocket error:', error);
    }

    send(message: ClientMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected — message dropped');
        }
    }

    on(type: string, handler: (data: unknown) => void) {
        (this.listeners.get(type) ?? this.listeners.set(type, []).get(type)!).push(handler);
        return () => this.off(type, handler); // return unsubscribe function
    }

    private emit(type: string, data: unknown) {
        this.listeners.get(type)?.forEach(h => h(data));
    }

    private startPing() {
        this.pingInterval = setInterval(() => this.send({ type: 'ping' }), 30_000);
    }

    private stopPing() {
        if (this.pingInterval) clearInterval(this.pingInterval);
    }
}
```

---

## React Integration

```tsx
// Custom hook for WebSocket state
function useWebSocket(roomId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [connected, setConnected] = useState(false);
    const clientRef = useRef<RealtimeClient | null>(null);

    useEffect(() => {
        const client = new RealtimeClient();
        clientRef.current = client;

        const unsubscribers = [
            client.on('connected', () => setConnected(true)),
            client.on('message', (data: any) => {
                if (data.roomId === roomId) {
                    setMessages(prev => [...prev, data]);
                }
            }),
            client.on('typing', (data: any) => {
                setTypingUsers(prev => new Set([...prev, data.userId]));
                setTimeout(() => {
                    setTypingUsers(prev => { prev.delete(data.userId); return new Set(prev); });
                }, 3000);
            }),
        ];

        client.connect(getToken());
        client.send({ type: 'join_room', roomId });

        return () => {
            unsubscribers.forEach(unsub => unsub());
            client.send({ type: 'leave_room', roomId });
        };
    }, [roomId]);

    const sendMessage = useCallback((text: string) => {
        clientRef.current?.send({ type: 'send_message', roomId, text });
    }, [roomId]);

    return { messages, typingUsers, connected, sendMessage };
}
```

---

## Scaling WebSockets

```
Single server: works up to ~10k concurrent connections
(each connection = file descriptor + memory overhead)

Multiple servers problem:
- User A connects to Server 1
- User B connects to Server 2
- A sends message — Server 1 has no idea B exists

Solution: Pub/Sub with Redis
- When server receives a message, it publishes to Redis channel
- All servers subscribe to that channel
- All servers broadcast to their connected clients

Redis Pub/Sub architecture:
Server 1 → Redis (PUBLISH room:123 message)
Server 2 ← Redis (SUBSCRIBE room:123) → broadcasts to B
```

```ts
// Redis Pub/Sub for multi-server WebSocket
const redisPub = createRedisClient();
const redisSub = createRedisClient();

// When client sends a message, publish to Redis
async function onClientMessage(roomId: string, message: object) {
    await redisPub.publish(`room:${roomId}`, JSON.stringify(message));
}

// All servers subscribe — broadcast to their local clients
redisSub.subscribe('room:*', (message, channel) => {
    const roomId = channel.replace('room:', '');
    const parsed = JSON.parse(message);
    // Broadcast to all local clients in this room
    clients.forEach((client, ws) => {
        if (client.rooms.has(roomId)) send(ws, parsed);
    });
});
```

---

## Server-Sent Events (SSE)

```ts
// SSE — simpler than WebSocket for server → client only
app.get('/api/notifications/stream', (req, res) => {
    const userId = req.user.id;

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send a comment every 30s to keep connection alive (prevent proxy timeouts)
    const keepAlive = setInterval(() => res.write(': ping\n\n'), 30_000);

    // Register this client
    const unsubscribe = notificationService.subscribe(userId, (notification) => {
        res.write(`event: notification\n`);
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
    });

    req.on('close', () => {
        clearInterval(keepAlive);
        unsubscribe();
    });
});

// Client usage — SSE auto-reconnects natively
const eventSource = new EventSource('/api/notifications/stream');
eventSource.addEventListener('notification', (e) => {
    const notification = JSON.parse(e.data);
    showNotification(notification);
});
eventSource.onerror = () => console.log('SSE error — browser will auto-reconnect');
```

---

## Most Asked Real-Time Interview Questions

### "How would you build a real-time chat application?"

> Architecture: WebSocket server (ws/Socket.io) connected to Redis Pub/Sub for multi-server broadcasting. Persist messages to PostgreSQL (for history). On connection: authenticate via token, join rooms. On message: validate, save to DB, publish to Redis, all servers broadcast to local clients. Client: reconnect with exponential backoff, optimistic UI (show message immediately, confirm on echo). At scale: separate message storage service, WebSocket gateway service, use Kafka instead of Redis Pub/Sub for durability.

### "When would you use SSE over WebSocket?"

> Use SSE when data flows server → client only (notifications, live feeds, progress bars, stock prices, deployment logs). SSE advantages: simpler (plain HTTP, no special server setup), auto-reconnects natively, works through HTTP/2 multiplexing, no extra protocol. Use WebSocket when you need bidirectional communication (chat, collaborative editing, live gaming, cursor sharing).

### "How do you handle WebSocket reconnection?"

> Exponential backoff with jitter: first retry after 1s, then 2s, 4s, 8s... up to a maximum (30s). Add jitter (randomize by ±20%) so all clients don't reconnect simultaneously after a server restart. Track reconnect attempts and give up after N retries (or let the user manually retry). On reconnect, rejoin all rooms and request missed messages since last disconnect (using a sequence number or timestamp).

### "How do you scale WebSockets horizontally?"

> Sticky sessions (session affinity) so a client always hits the same server — works but limits scaling. Better: stateless WebSocket servers + shared state in Redis. On message received: publish to Redis Pub/Sub. All servers subscribe and broadcast to their local clients. At very large scale: use a dedicated WebSocket gateway (Pusher, Ably, AWS API Gateway WebSocket) rather than building your own — the operational complexity of large-scale WebSocket infrastructure is significant.
