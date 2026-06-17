# Steno — Engineering Leaders Interview Prep (60 min)

> Round 2: Meet with Engineering Management over Zoom.
> They want to learn about YOUR background, discuss Steno, and ask technical questions
> tailored to their tech ecosystem + your resume. Time for questions at the end.

---

## About Steno — Know This Before the Interview

<!-- Steno was founded in 2018 by CEO Greg Hong to revolutionize the court reporting industry. ‼️ They're a hybrid service + technology company in the legal tech space.

**What they do:**
- Court reporting services (stenographic reporters, videography, interpreters)
- Remote depositions via **Steno Connect** (built on Zoom with seamless exhibit handling)
- **Transcript Genius** — AI-powered transcript analysis tool that lets attorneys "interrogate transcripts like witnesses" using conversational generative AI. Attorneys can search, summarize, track citations, and find inconsistencies across their entire transcript library.
- **Digital Firm Dashboard** — centralized hub for managing litigation support (booking, files, scheduling)
- **DelayPay** — deferred litigation financing so attorneys don't pay upfront
- Integrations with legal platforms: **Clio** and **Litify**

**Recent news:**
- Raised $49M Series C (March 2026) led by Savano Capital Partners, with First Round Capital and The Legal Tech Fund
- Funding is for: next-gen Transcript Genius features, court reporter marketplace, remote deposition infrastructure
- 44% of legal professionals expect increased remote litigation through 2026

**Tech stack:** Node.js + TypeScript, React.js, PostgreSQL, cloud infrastructure, CI/CD
**Team:** Fully remote, grew from 9 to 400+ employees in 6 years
**Compliance:** SOC 2 Type II and HIPAA compliant‼️
**CTO:** Dan Anderson — known as a strong tech leader trusted by eng, product, and design

**Core values:** Highly reliable, constantly innovating, hospitality mindset

**Why this matters for the interview:**
Engineering leaders will want to see that you understand their BUSINESS, not just their tech stack. Connect your answers to their products — "I built microservices handling delivery operations, which maps to how Steno's platform handles scheduling, transcripts, and real-time deposition workflows." -->

---

## Section 1: Resume Deep Dive — Expect These Questions

> They will tailor questions to your resume. Here's how to frame each experience
> to resonate with what Steno cares about.

---

### Q1. Tell me about yourself / Walk me through your background.

<!-- **2-minute version — tailored to Steno:**

"I'm a senior full-stack engineer with 6 years of experience, most recently at Gophr, a logistics and delivery startup where I was one of the early engineers. I built and maintained 3 of our 4 core microservices — Shipments, Users, and Inventories — using Node.js and PostgreSQL, handling thousands of daily requests across multiple client apps.

What I think maps well to Steno is that I've been building for a platform with many user types — at Gophr we had consumers, drivers, merchants, and dispatchers, each with different dashboards and workflows. I imagine Steno has a similar dynamic with attorneys, court reporters, and internal operations all interacting with the platform differently.

I also led the frontend admin dashboard that streamlined operations and reduced manual work by about 60%, and more recently I integrated OpenAI to automate delivery vehicle recommendations and quote generation. I'm excited about Steno because you're applying technology and AI to modernize an industry that really needs it — similar to what we did in the logistics space."

**Key principles:**
- Keep it under 2 minutes
- Connect your experience to THEIR business
- End with why you want THIS role at THIS company
- Don't just list technologies — tell the story of impact -->

---

### Q2. You built 3 of 4 core microservices at Gophr. Walk me through the architecture.

<!-- **How to answer — map it to their world:**

"Gophr's platform has four core microservices: Shipments, Users, Inventories, and a fourth for payments/billing. I built and maintained the first three.

**Architecture overview:**
- Each service is a Node.js API with its own PostgreSQL database
- Services communicate via REST APIs for synchronous calls and message queues for async events
- Each service is independently deployable with its own CI/CD pipeline
- A shared API gateway handles routing, authentication, and rate limiting

**Shipments service** (the most complex):
- Handles the full delivery lifecycle: order creation → driver assignment → pickup → transit → delivery
- Real-time status updates consumed by 4 different client apps (consumer, driver, merchant, dispatch)
- Manages geolocation data, route optimization, and delivery scheduling
- This is probably analogous to Steno's proceedings/scheduling service — managing the lifecycle of a deposition from booking through completion

**Users service:**
- Multi-role auth system: consumers, drivers, merchants, admins — each with different permissions
- JWT-based authentication with role-based access control
- Similar to how Steno manages attorneys, court reporters, and internal staff with different platform access

**Inventories service:**
- Product catalog management for merchants
- Stock tracking, pricing, and availability
- Powers the consumer app's browsing and ordering experience

**Key decisions I'd discuss:**
- Why we split into microservices (team autonomy, independent scaling — ‼️ Shipments needed more resources than Users)
- How we handled cross-service data (e.g., Shipments needs user info — we used data replication for read-heavy data, API calls for real-time data)
- Database-per-service pattern — each service owns its data, no shared databases" -->

---

### Q3. How did you reduce manual work by 60% with the Admin Dashboard?

<!-- **STAR format:**

**Situation:** Gophr's operations team was manually managing orders, users, and inventory through spreadsheets and phone calls. When issues arose (wrong address, driver no-show, inventory mismatch), the ops team had to call drivers and merchants directly.

**Task:** Build an admin dashboard that gives the ops team visibility and control over the entire platform without needing to contact anyone.

**Action:**
- Built a React frontend with real-time data from our microservices APIs
- Implemented order management: view all active/past orders, filter by status, reassign drivers, cancel/refund
- User management: verify merchants, activate/deactivate accounts, manage roles
- Inventory oversight: view merchant stock levels, flag discrepancies
- Added real-time notifications for issues that need attention (stuck orders, driver delays)
- Built bulk operations (e.g., reassign all orders from an unavailable driver)

**Result:**
- Ops team could resolve most issues directly from the dashboard instead of making phone calls
- Reduced manual coordination work by ~60%
- Onboarding new ops team members went from days to hours (dashboard is self-explanatory vs. tribal knowledge)

**Connect to Steno:**
"I imagine Steno's Firm Dashboard has similar goals — giving law firms the tools to manage bookings, files, and scheduling without needing to call or email. Building tools that eliminate manual workflows is something I'm really passionate about." -->

---

### Q4. Tell me about the OpenAI integration. How did you reduce estimation time by 70%?

<!-- **This is highly relevant to Steno — they're building Transcript Genius with AI.**

**Situation:** At Gophr, customers would call or submit a form describing what they need shipped (dimensions, weight, distance, urgency). An operations person would manually estimate which vehicle type to use (sedan, SUV, van, box truck) and generate a price quote. This took 15-20 minutes per request.

**Task:** Automate the recommendation and quoting process using AI.

**Action:**
- Integrated OpenAI's Assistant API into our backend
- Fed it structured data: item dimensions, weight, distance, delivery type, historical pricing
- The assistant recommends the optimal vehicle type and generates a quote with reasoning
- Built a review interface so ops can approve/adjust before sending to the customer
- Included a feedback loop — when ops adjusted recommendations, that feedback improved future suggestions

**Technical details:**
- Used OpenAI Assistants API with function calling for structured output
- Prompts were engineered to return JSON with vehicle type, price breakdown, and reasoning
- Implemented rate limiting and fallback (if API fails, queue for manual processing)‼️
- Response time: ~3-5 seconds vs. 15-20 minutes manual

**Result:**
- Reduced manual estimation time by ~70%
- Consistent pricing (removed human variance in quoting)
- Ops team now reviews 80% of quotes instead of building them from scratch

**Connect to Steno:**
"This experience directly relates to what Steno is doing with Transcript Genius — using AI to process and analyze documents that would take humans hours to review manually. I'm really interested in how you're applying generative AI to transcript analysis, and I'd love to bring my experience building production AI integrations to that product." -->

---

### Q5. You designed and built the School Lunch System in 1.5 months. How?

<!-- **This demonstrates speed, full SDLC ownership, and independent delivery.**

**How to frame it:**

"This was a fast-turnaround project where I owned the entire stack. The goal was to let parents order school lunches for their kids, with the school managing menus and Gophr handling delivery.

**What I built in 6 weeks:**
- Database schema: schools, menus (weekly rotating), students, orders, delivery schedules
- Backend API: CRUD for menus, order placement, payment processing, delivery assignment
- Parent-facing UI: browse weekly menus, select meals per child per day, checkout
- School admin UI: manage menus, view orders, track deliveries

**How I moved fast:**
- Started with the database schema and API contracts before writing any UI code
- Used existing Gophr infrastructure (auth, payments, delivery assignment) instead of rebuilding
- Shipped an MVP with core flows first, then iterated based on feedback
- Daily standups with the product owner to prioritize ruthlessly

**Connect to Steno:**
"Steno is a fast-growing startup that probably needs engineers who can own a feature end-to-end and ship quickly. I thrive in that environment — give me the problem, the constraints, and the timeline, and I'll figure out the best way to deliver." -->

---

### Q6. Tell me about the Web Tracking app and how you handle real-time GPS tracking.

<!-- **Relevant to Steno's real-time remote deposition features.**

"Gophr Web Tracking is a mobile-first web app for delivery drivers. It handles:
- Route management (optimized multi-stop delivery routes)
- Real-time GPS tracking (driver location updates sent to consumers and dispatchers)
- Delivery confirmation (signature capture and photo proof of delivery)

**Technical implementation:**
- GPS updates sent from the driver's browser via Geolocation API every 10-30 seconds
- Updates pushed to consumers via WebSockets (real-time map updates)
- Photos/signatures uploaded to S3, URLs stored in the database linked to the delivery
- Offline-resilient: queues GPS updates and photos locally if the driver loses connectivity, syncs when back online

**Connect to Steno:**
"Real-time features are critical for Steno too — during remote depositions, you need reliable real-time communication, exhibit handling, and status tracking. Building Web Tracking taught me a lot about handling real-time data, unreliable networks, and making sure nothing gets lost." -->

---

## Section 2: Technical Questions — Deeper Than the Screen

> Engineering leaders will go deeper than the 30-min screen. Expect scenario-based
> questions about architecture decisions, tradeoffs, and how you'd solve problems
> in Steno's tech ecosystem.

---

### Q7. How do you decide between a monolith and microservices for a new feature?

<!-- **They care about JUDGMENT, not just knowing the definitions.**

"My default is to start with a monolith unless there's a compelling reason not to. At Gophr, we actually started as a monolith and extracted microservices as the team and product grew.

**When I'd choose a monolith:**
- Small team (< 5-8 engineers)
- Single product with shared data models
- Speed of development matters more than independent deployment
- You're still figuring out domain boundaries‼️

**When I'd extract a microservice:**
- A component has fundamentally different scaling needs ‼️ (e.g., our Shipments service needed to handle 10x more traffic than Users)
- Different teams need to deploy independently
- A feature has a clear bounded context with minimal cross-service dependencies

**The Steno context:**
If I were at Steno, I'd expect some natural service boundaries:‼️
- Scheduling/booking service (proceedings, court reporter assignment)
- Transcript service (upload, processing, storage, AI analysis)
- User/auth service (attorneys, reporters, admins)
- Billing/DelayPay service (payments, deferred financing)

But I'd only split when the complexity of the monolith is actually causing problems — premature extraction creates more overhead than it solves." -->

---

### Q8. How would you design a real-time remote deposition system like Steno Connect?‼️

<!-- **This shows you understand their product and can think architecturally.**

"Steno Connect is built on Zoom with added exhibit handling. If I were designing it:

**Core components:**
1. **Video/Audio** — use Zoom's SDK (they already do this) rather than building WebRTC from scratch
2. **Exhibit Management** — the differentiator‼️
   - Upload exhibits before or during the deposition
   - Real-time sharing: when an attorney shares an exhibit, all participants see it simultaneously
   - Auto-numbering and annotation (collaborative, not just presenter)
   - Private file viewing (only the sharing party sees it until they share)
3. **Session State** — track who's in the room, what exhibit is being discussed, timestamps for the record
4. **Transcript sync** — if a court reporter is producing a live transcript, it could be synced to the session

**Technical approach:**
- WebSocket server for real-time state sync (exhibit changes, annotations)‼️
- S3 for exhibit storage with pre-signed URLs for secure access
- PostgreSQL for session metadata, exhibit ordering, and audit trail
- Redis for ephemeral session state (who's connected, current exhibit)‼️
- Queue (SQS/RabbitMQ) for async processing (thumbnail generation, OCR on uploaded docs)‼️

**Key concerns for legal tech:**
- Everything must be recorded for the legal record — audit trail is non-negotiable‼️
- SOC 2 / HIPAA compliance — encrypted at rest and in transit, access controls‼️
- Reliability — a dropped connection during a deposition is a serious problem
- Low latency — exhibit sharing must feel instant" -->

---

### Q9. How would you approach building an AI-powered transcript analysis feature?

<!-- **Directly relevant to Transcript Genius — their flagship AI product.**

"Based on what I know about Transcript Genius, it lets attorneys search, summarize, and interrogate transcripts using AI. Here's how I'd approach building something like that:

**Data pipeline:**
1. Court reporter uploads transcript (PDF, ASCII, or structured text)
2. Parse and chunk the transcript — split by speaker, by page, by topic
3. Generate embeddings for each chunk (OpenAI embeddings or similar)
4. Store embeddings in a vector database (pgvector in PostgreSQL, or Pinecone)

**Search and analysis features:**
- **Semantic search** — "find all mentions of the accident on Highway 101" using vector similarity
- **Citation tracking** — link specific transcript passages to case arguments
- **Summarization** — generate per-deposition or per-witness summaries using an LLM
- **Cross-transcript analysis** — compare testimony across multiple depositions to find inconsistencies

**Architecture:**
```
Upload → Parse → Chunk → Embed → Store (PostgreSQL + pgvector)
                                       ↓
Attorney asks question → Embed query → Vector search → Retrieve relevant chunks‼️
                                                                ↓
                                                    LLM generates answer with citations
```

**From my experience at Gophr:**
I built the OpenAI integration for vehicle recommendations, so I understand:
- Prompt engineering for structured, reliable output
- Function calling for consistent JSON responses
- Rate limiting and error handling for LLM APIs
- The importance of human-in-the-loop (ops reviewed AI recommendations before sending)

For a legal product, accuracy is even more critical — hallucinated citations could be a liability. ‼️ I'd implement confidence scoring and always surface the source chunks so attorneys can verify." -->

---

### Q10. How do you handle database migrations in a production environment with zero downtime?

<!-- **Practical question for their PostgreSQL stack.**

"The key principle is backward compatibility — the old code must still work while the migration is running.

**Safe migration pattern:**
1. **Add new column** (nullable or with default) — safe, no lock
2. **Deploy new code** that writes to both old and new columns
3. **Backfill** existing data into the new column
4. **Deploy code** that reads from the new column
5. **Remove old column** in a separate migration (after verifying everything works)

**Example — renaming a column:**
```sql
-- Step 1: Add new column (safe)
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Step 2: Backfill (run in batches to avoid locking)‼️
UPDATE users SET full_name = name WHERE full_name IS NULL LIMIT 1000;

-- Step 3: Deploy code that reads full_name, writes both full_name and name

-- Step 4: Drop old column (after all code uses full_name)
ALTER TABLE users DROP COLUMN name;
```

**What to NEVER do in production:**
- `ALTER TABLE ... ADD COLUMN ... NOT NULL` without a default (locks the entire table on large tables)
- `CREATE INDEX` without `CONCURRENTLY` (locks the table for writes)‼️
- Drop a column that the running code still reads (deploy code first, then migrate)

**At Gophr:**
We ran migrations as part of our CI/CD pipeline. The migration ran before the new code deployed, so we always ensured backward compatibility. ‼️ For large backfills, I'd run them in batches during off-peak hours with monitoring on database CPU and connection count." -->

---

### Q11. How do you handle scaling challenges with PostgreSQL?

<!-- **They use PostgreSQL — expect depth here.**

"At Gophr, our Shipments database grew to millions of rows and we hit performance walls. Here's what I did:

**1. Query optimization (first line of defense):**
- Used EXPLAIN ANALYZE to identify full table scans
- Added composite indexes for our most common queries
- Replaced `SELECT *` with specific columns
- Fixed N+1 queries by using JOINs and batch loading

**2. Connection pooling:**
- Used pg Pool with max: 20 connections
- Added PgBouncer when we scaled beyond a single API instance‼️
- Monitored pool utilization to catch connection leaks‼️

**3. Read replicas:**
- Offloaded read-heavy queries (dashboard analytics, reporting) to a read replica
- Write operations still go to the primary
- This is straightforward with AWS RDS

**4. Partitioning:**
- Partitioned our shipments table by month (time-range partitioning)
- Queries that filter by date only scan relevant partitions
- Old partitions can be archived or dropped

**5. Caching:**
- Redis cache for frequently-read, rarely-changed data (user profiles, merchant settings)
- Cache-aside pattern with TTL-based invalidation
- Reduced database load by ~40% for our most common endpoints

**What I'd do at Steno:**
Transcripts are likely the heaviest data — potentially thousands of pages per case, with full-text search requirements. I'd consider:
- Full-text search with PostgreSQL's tsvector/GIN indexes (or Elasticsearch for scale)‼️
- pgvector for the AI embedding similarity search
- S3 for raw file storage, database for metadata and searchable content‼️
- Materialized views for common dashboard aggregations" -->

---

### Q12. How do you ensure code quality in a fully remote team?

<!-- **Steno is fully remote — this is a culture question disguised as a technical one.**

"At Gophr we're also remote, so I've developed strong practices around async collaboration:

**Code quality:**
- PR reviews are required before merge — at least one approval from another engineer
- We use ESLint + Prettier with pre-commit hooks so style is never a debate
- TypeScript strict mode — catches bugs at compile time
- Automated tests run in CI on every PR (unit + integration)

**Communication:**
- PRs have detailed descriptions: what changed, why, how to test, any risks‼️
- For complex features, I write a brief design doc before coding (even just a few paragraphs in a GitHub issue)
- Async-first communication (written over verbal), with Zoom for complex discussions
- I document architecture decisions in ADRs (Architecture Decision Records) so future engineers understand WHY we built things a certain way

**Process:**
- Trunk-based development with short-lived feature branches
- Small, focused PRs (< 400 lines when possible) — easier to review, faster to merge
- Feature flags for gradual rollouts
- Monitoring and alerting so we catch issues in production quickly

**Connect to Steno:**
"I saw that Steno values being 'highly reliable' and 'constantly innovative.' I think strong code quality practices are what let you innovate fast without breaking things — you can move quickly because you trust your test suite and review process." -->

---

### Q13. What is the difference between REST and GraphQL? When would you use each?

<!-- **Common senior-level question — sourced from multiple interview guides.**

**REST:**
- One endpoint per resource: `GET /users`, `GET /users/123/orders`
- Server decides what data to return
- Simple, well-understood, great caching (HTTP caching built-in)‼️
- Problem: over-fetching (get 20 fields when you need 3) and ‼️ under-fetching (need 3 requests to build one page)

**GraphQL:**
- One endpoint: `POST /graphql`‼️
- Client decides exactly what data to return in the query‼️
- No over-fetching or under-fetching
- Problem: more complex server setup, caching is harder, query complexity attacks‼️

```graphql
# GraphQL — client asks for exactly what it needs:
query {
  user(id: 123) {
    name
    email
    orders(last: 5) {
      id
      total
      status
    }
  }
}
```

**When to use which:**
- **REST**: simpler APIs, public APIs, when you have few clients with similar needs, strong caching requirements
- **GraphQL**: multiple clients (web, mobile, admin) that need different data shapes from the same entities, complex nested relationships‼️

**At Gophr:**
We used REST because it was simpler and our team had more experience with it. But with 4 different client apps (consumer, driver, merchant, dispatch) all needing different views of the same data, GraphQL would have reduced a lot of our custom endpoint proliferation.

**At Steno:**
With a firm dashboard, Steno Connect, mobile apps, and integrations (Clio, Litify) — all consuming the same data differently — GraphQL could be a strong fit for reducing API complexity." -->

---

### Q14. How do you implement real-time features using WebSockets?

<!-- **Relevant to Steno Connect (remote depositions) and real-time tracking.**

**What WebSockets solve:**
HTTP is request-response — the client must ask for updates. WebSockets open a persistent, bidirectional connection so the server can PUSH data to the client instantly.

**When to use WebSockets vs alternatives:**
- **WebSockets**: bidirectional, real-time (chat, live collaboration, gaming, remote depositions)
- **Server-Sent Events (SSE)**: server-to-client only, simpler (live feeds, notifications, dashboards)‼️
- **Polling**: simplest but wasteful (check every N seconds — most responses are "nothing changed")

**Implementation with Socket.IO in Node.js:**
```ts
* Server:
import { Server } from 'socket.io';
const io = new Server(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  * Join a room (e.g., a deposition session)
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
  });

  * Broadcast exhibit change to all participants in the session
  socket.on('share-exhibit', ({ sessionId, exhibitId }) => {
    io.to(sessionId).emit('exhibit-shared', { exhibitId, sharedBy: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

* Client (React):
import { io } from 'socket.io-client';
const socket = io('https://api.steno.com');

socket.emit('join-session', depositionId);
socket.on('exhibit-shared', ({ exhibitId }) => {
  * Update UI to show the shared exhibit
});
```

**Scaling WebSockets:**
- WebSockets are stateful — the connection is tied to a specific server‼️
- With multiple servers, ‼️ use Redis adapter (socket.io-redis) so messages are broadcast across all instances
- Use sticky sessions on the load balancer, or use Redis pub/sub for cross-server communication‼️

**At Gophr:**
I used WebSockets for real-time GPS tracking — driver location updates pushed to consumers and dispatchers in real-time. Same pattern: join a room (delivery ID), broadcast updates to all participants." -->

---

### Q15. How do you design a scalable file upload system?

<!-- **Directly relevant to Steno — transcripts, exhibits, videos are all file uploads.**

"For a legal platform handling transcripts, exhibits, and deposition videos:

**Architecture:**
```
Client → Pre-signed URL from API → Direct upload to S3 → S3 event triggers processing‼️
```

**Why NOT upload through your API server:**
- Large files (videos can be GBs) would block your Node.js server
- S3 handles the upload directly — your API server stays free for other requests

**Implementation:**
```ts
* 1. Client requests a pre-signed upload URL:
app.post('/api/uploads/request', authenticate, async (req, res) => {
  const { fileName, fileType, caseId } = req.body;
  const key = `cases/${caseId}/exhibits/${uuidv4()}-${fileName}`;

  const presignedUrl = await s3.getSignedUrl('putObject', {
    Bucket: 'steno-uploads',
    Key: key,
    ContentType: fileType,
    Expires: 300,  // URL valid for 5 minutes
  });

  * Record the upload in the database (status: 'pending')
  await db.query(
    'INSERT INTO uploads (key, case_id, uploaded_by, status) VALUES ($1, $2, $3, $4)',
    [key, caseId, req.user.id, 'pending']
  );

  res.json({ uploadUrl: presignedUrl, key });
});

* 2. Client uploads directly to S3 using the pre-signed URL

* 3. S3 event (via SQS/Lambda) triggers post-processing:‼️
*    - Generate thumbnail for images/PDFs
*    - Run OCR on scanned documents
*    - Extract text from transcripts for search indexing
*    - Generate embeddings for AI analysis
*    - Update database status to 'ready'
```

**Key considerations for legal tech:**
- **Encryption**: S3 server-side encryption (SSE-S3 or SSE-KMS) for compliance‼️
- **Access control**: pre-signed URLs expire; only authorized users can generate them
- **Audit trail**: log every upload, download, and access‼️
- **Virus scanning**: scan uploads before making them available
- **Versioning**: S3 versioning to prevent accidental overwrites (legal docs must be immutable)" -->‼️

---

### Q16. What are Node.js Worker Threads and Clustering? When do you use each?

<!-- **Senior-level Node.js question — sourced from GeeksforGeeks, InterviewBit, and Second Talent.**

Node.js is single-threaded. For CPU-intensive work, you have two options:

**Clustering — ‼️ multiple processes:**
- Spawns multiple Node.js processes (one per CPU core)
- Each process has its OWN event loop and memory
- A master process distributes incoming connections via round-robin‼️
- Use for: scaling your HTTP server across CPU cores‼️

```ts
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();  // spawn a worker process‼️
  }
  cluster.on('exit', (worker) => {
    cluster.fork();  // restart if a worker dies
  });
} else {
  * Each worker runs the Express server
  app.listen(3000);
}
```

**Worker Threads — ‼️ multiple threads in one process:**
- Runs JavaScript in parallel threads WITHIN a single process‼️
- Threads can share memory (SharedArrayBuffer)
- Use for: CPU-intensive tasks (parsing large files, encryption, image processing) without blocking the event loop

```ts
import { Worker } from 'worker_threads';

* Main thread:
app.post('/api/transcripts/process', async (req, res) => {
  const worker = new Worker('./processTranscript.js', {
    workerData: { transcriptId: req.body.id }
  });

  worker.on('message', (result) => res.json(result));
  worker.on('error', (err) => res.status(500).json({ error: err.message }));
});

* processTranscript.js (worker thread):
import { parentPort, workerData } from 'worker_threads';
* ... heavy CPU work: parse, chunk, generate embeddings
parentPort.postMessage({ status: 'processed', chunks: 150 });
```

**When to use which:**‼️
|              | Clustering | Worker Threads |
|---|---|---|
| **Purpose** | Scale HTTP server across cores | Offload CPU-heavy tasks |‼️
| **Memory** | Separate memory per process | Shared memory possible |
| **Use case** | Handle more concurrent requests | Parse large transcripts, generate AI embeddings |‼️
| **Overhead** | Higher (full process per worker) | Lower (threads within one process) |

**At Steno:** ‼️ Worker threads would be ideal for processing large transcripts — parsing, chunking, and generating embeddings without blocking the API server's event loop." -->

---

### Q17. What is the difference between process.nextTick() and setImmediate()?

<!-- **Classic senior Node.js question — appears in almost every advanced interview guide.**

Both schedule callbacks to run asynchronously, but at different points in the event loop:

**process.nextTick():**
- Runs BEFORE the event loop continues to the next phase
- Executes after the current operation completes, before any I/O
- Higher priority than Promises, setTimeout, setImmediate
- Can starve the event loop if used recursively (keeps running nextTick callbacks before moving on)

**setImmediate():**
- Runs in the CHECK phase of the event loop (after the I/O poll phase)
- Lower priority than process.nextTick()
- Safer for recursive patterns because it doesn't starve the event loop‼️

```js
console.log('1 - start');

setImmediate(() => console.log('2 - setImmediate'));

process.nextTick(() => console.log('3 - nextTick'));

Promise.resolve().then(() => console.log('4 - promise'));

console.log('5 - end');

* Output: 1 - start, 5 - end, 3 - nextTick, 4 - promise, 2 - setImmediate
```

**Execution priority (highest to lowest):**
1. Synchronous code (call stack)
2. `process.nextTick()` (microtask queue — highest priority)
3. `Promise.then()` (microtask queue — after nextTick)
4. `setTimeout(fn, 0)` (timer phase)
5. `setImmediate()` (check phase)

**When to use which:**
- `process.nextTick()`: when you need something to run immediately after the current operation (e.g., emit an event after a constructor finishes)‼️
- `setImmediate()`: when you want to yield to the event loop and let I/O callbacks run first (safer for most use cases)‼️
- In practice: most application code should use `setImmediate()` or just `setTimeout(fn, 0)`. `process.nextTick()` is mainly for library authors." -->

---

### Q18. How do you handle data consistency across microservices?

<!-- **Critical architecture question — sourced from multiple senior interview guides.**

"In a monolith, you have database transactions. In microservices, each service has its own database — you can't do a cross-service transaction. So how do you keep data consistent?

**Pattern 1: Saga Pattern (most common)**‼️
A sequence of local transactions, ‼️ each publishing an event that triggers the next step. If one step fails, compensating transactions undo the previous steps.

```
Order Service          Payment Service         Inventory Service
     │                      │                       │
     ├── Create Order ──────►                       │
     │                      ├── Charge Payment ────►│
     │                      │                       ├── Reserve Stock
     │                      │                       │
     │   If payment fails:  │                       │
     │                      ├── Refund Payment      │
     ├── Cancel Order ◄─────┤                       │
```

**Pattern 2: Event-Driven with Message Queue**‼️
Services publish events when their state changes. ‼️ Other services subscribe and update their own data accordingly.

```ts
* Order Service publishes:
await messageQueue.publish('order.created', {
  orderId: '123',
  userId: 'abc',
  items: [{ productId: 'xyz', qty: 2 }]
});

* Inventory Service subscribes:
messageQueue.subscribe('order.created', async (event) => {
  await reserveStock(event.items);
  await messageQueue.publish('stock.reserved', { orderId: event.orderId });
});
```

**Pattern 3: Outbox Pattern (prevent lost events)**‼️
Write the event to an 'outbox' table in the SAME transaction as the data change. A separate process reads the outbox and publishes to the message queue. This guarantees the event is published if and only if the data change committed.

**At Gophr:**
When a shipment is created, the Shipments service needs to verify the user (Users service) and check inventory (Inventories service). We used a mix:
- Synchronous API calls for validation (check user exists, check stock available)
- Async events for state changes (shipment.created → trigger driver assignment, send notifications)
- Compensating actions for failures (if driver assignment fails → cancel the shipment, restore inventory)

**Key principle:** Design for eventual consistency, not immediate consistency. The system might be briefly inconsistent, but it WILL converge to a correct state." -->

---

### Q19. How do you implement rate limiting for APIs?

<!-- **Security and scalability question — from daily.dev and InterviewBit guides.**

"Rate limiting prevents abuse and protects your API from being overwhelmed.

**Common algorithms:**

1. **Fixed Window** — count requests per time window (e.g., 100 req/min). Simple but bursty at window boundaries.
2. **Sliding Window** — smoother; considers a rolling time window. More accurate but slightly more complex.
3. **Token Bucket** — tokens added at a fixed rate; each request consumes a token. Allows short bursts. Most commonly used.‼️

**Implementation with Redis (production-grade):**
```ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis();

* Global rate limit: 100 requests per 15 minutes per IP
app.use(rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  message: { error: 'Too many requests, please try again later.' },
}));

* Stricter limit for login (prevent brute force):
app.use('/api/login', rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 15 * 60 * 1000,
  max: 5,  // 5 login attempts per 15 minutes
  message: { error: 'Too many login attempts.' },
}));
```

**Why Redis?** ‼️ In a multi-server deployment, you need a shared store. In-memory rate limiting only works for a single server instance — each server would have its own count. Redis makes the count shared across all API instances.

**What Steno would care about:**
- Rate limit public API endpoints and integrations (Clio, Litify)
- Stricter limits on auth endpoints
- Per-user rate limiting (not just per-IP) for authenticated endpoints
- Graceful 429 responses with Retry-After header" -->

---

### Q20. How do you implement full-text search in PostgreSQL?

<!-- **Directly relevant — Steno needs to search through transcripts.**

"PostgreSQL has built-in full-text search that's surprisingly powerful before you need Elasticsearch.‼️

**What is tsvector?**
tsvector is PostgreSQL's way of turning text into a searchable format.
It breaks text into words, removes filler words (the, is, a), and stems words to their root form:
```sql
SELECT to_tsvector('english', 'The cats are running quickly');
-- Result: 'cat':2 'quick':5 'run':4
-- "The"/"are" → removed (stop words)
-- "cats" → "cat", "running" → "run", "quickly" → "quick" (stemmed)
-- Numbers (:2, :4, :5) = word positions in original text
-- Think of it like a book index — pre-built so searches are fast
```

**Basic setup:**
```sql
-- Add a tsvector column for search:
ALTER TABLE transcripts ADD COLUMN search_vector tsvector;

-- Populate it from the transcript text:
UPDATE transcripts
SET search_vector = to_tsvector('english', content);

-- Create a GIN index for fast searches:
CREATE INDEX idx_transcripts_search ON transcripts USING GIN(search_vector);

-- Keep it updated automatically:
CREATE TRIGGER transcripts_search_update
BEFORE INSERT OR UPDATE ON transcripts
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', content);
```

**Querying:**
```sql
-- Basic search:
SELECT id, ts_headline('english', content, query) as highlight
FROM transcripts, to_tsquery('english', 'witness & accident') as query
WHERE search_vector @@ query
ORDER BY ts_rank(search_vector, query) DESC;

-- Search with phrase matching:
SELECT * FROM transcripts
WHERE search_vector @@ phraseto_tsquery('english', 'objection sustained');

-- Fuzzy search (handles typos):
SELECT * FROM transcripts
WHERE search_vector @@ to_tsquery('english', 'depo:*');  -- prefix matching
```

**When to use PostgreSQL FTS vs Elasticsearch:**‼️
- **PostgreSQL FTS**: simpler stack, good for moderate data, integrated with your existing DB, handles most use cases
- **Elasticsearch**: needed for very large datasets (millions of documents), complex faceted search, real-time indexing at scale, fuzzy matching

**For Steno's transcript search:**
Start with PostgreSQL FTS — it's already in the stack and handles legal transcript search well. Consider Elasticsearch if you need to search across millions of transcript pages with complex queries and facets (by case, by witness, by date range).

**Combine with pgvector for AI search:**
```sql
-- Traditional FTS for keyword search:
WHERE search_vector @@ to_tsquery('accident on highway 101')

-- pgvector for semantic search (AI embeddings):‼️
ORDER BY embedding <=> query_embedding LIMIT 10

-- Best of both: hybrid search combining keyword + semantic‼️
```" -->

---

### Q21. How do you design a multi-tenant database schema?

<!-- **Relevant — Steno serves multiple law firms, each with their own data.**

"Multi-tenancy means one application serves multiple customers (tenants) — each law firm using Steno sees only their own data.

**Three approaches:**

**1. Shared database, shared schema (row-level isolation):**
```sql
-- Every table has a tenant_id column:
CREATE TABLE cases (
    id UUID PRIMARY KEY,
    firm_id UUID NOT NULL REFERENCES firms(id),  -- tenant‼️
    case_number VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    UNIQUE(firm_id, case_number)  -- unique per firm, not globally‼️
);

CREATE INDEX idx_cases_firm_id ON cases(firm_id);

-- EVERY query must filter by firm_id:
SELECT * FROM cases WHERE firm_id = $1 AND status = 'active';
```
- Pros: simplest, cheapest, easy to maintain
- Cons: risk of data leaks if you forget the WHERE clause; noisy neighbor (one firm's heavy queries affect others)‼️
- Mitigation: use PostgreSQL Row Level Security (RLS) to enforce tenant isolation at the DB level‼️

**PostgreSQL Row Level Security:**
```sql
-- Enable RLS:
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;‼️

-- Create policy:
CREATE POLICY firm_isolation ON cases
    USING (firm_id = current_setting('app.current_firm_id')::uuid);

-- Set tenant context per request (in middleware):
await db.query("SET app.current_firm_id = $1", [req.user.firmId]);
-- Now ALL queries on `cases` are automatically filtered
```

**2. Shared database, separate schemas:**
- Each firm gets their own PostgreSQL schema: `firm_abc.cases`, `firm_xyz.cases`
- Better isolation, but more complex migrations (run on every schema)

**3. Separate databases per tenant:**
- Maximum isolation, best for compliance (legal/financial)
- Most expensive, hardest to manage

**For Steno:**
Row-level isolation with RLS is likely the best fit — it's the simplest to manage at scale, and PostgreSQL RLS provides strong guarantees that one firm can't see another's data. ‼️ For the highest-value enterprise clients, you could offer dedicated schemas or databases as a premium feature." -->

---

### Q22. How do you handle logging and monitoring in production?

<!-- **Operational maturity question — important for senior roles.**

"You can't fix what you can't see. My approach to observability:

**Three pillars:**

**1. Logging (what happened):**
```ts
import pino from 'pino';  // fastest Node.js logger‼️

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  * Structured JSON logs — easy to query in CloudWatch/Datadog
});

* Include context with every log:
app.use((req, res, next) => {
  req.log = logger.child({
    requestId: req.headers['x-request-id'] || uuidv4(),‼️
    userId: req.user?.id,
    method: req.method,
    path: req.path,
  });
  next();
});

* Usage in handlers:
req.log.info({ orderId }, 'Order created successfully');
req.log.error({ err, orderId }, 'Failed to create order');
```

**2. Metrics (how is the system performing):**‼️
- Request rate, latency (p50, p95, p99), error rate
- Database connection pool utilization
- Queue depth and consumer lag
- Memory and CPU usage
- Business metrics: orders per hour, transcripts processed

**3. Distributed tracing (where is time being spent):**
- Trace a request across multiple microservices
- See exactly which service/query is the bottleneck
- Tools: OpenTelemetry, Datadog APM, Jaeger

**Alerting:**
- Alert on symptoms, not causes (alert on 'error rate > 5%', not 'database CPU high')‼️
- Use escalation tiers: Slack notification → PagerDuty → phone call‼️
- Include runbook links in alerts so the on-call engineer knows what to do

**At Gophr:**
We used structured JSON logging with request IDs, which made it possible to trace a single delivery request across Shipments, Users, and Inventories services. When response times spiked, I could filter by request ID and see exactly which service and query was slow." -->

---

### Q23. What are database indexes? Explain clustered vs non-clustered indexes.

<!-- **Common DB depth question from multiple interview guides.**

"An index is a data structure that speeds up queries by avoiding full table scans.‼️

**Non-clustered index (default in PostgreSQL):**‼️
- A separate B-tree structure that points to the actual table rows
- The table data itself is stored in heap order (insertion order)
- You can have many non-clustered indexes on one table‼️
- A lookup = search the index → follow the pointer to the table row

**Clustered index:**
- The table data itself is physically reordered to match the index‼️
- In PostgreSQL, `CLUSTER` reorders the table once (not maintained automatically)
- In MySQL InnoDB, the primary key IS the clustered index (always maintained)
- Only one clustered index per table (data can only be sorted one way on disk)‼️

**PostgreSQL specifics:**
```sql
-- Regular index (non-clustered):
CREATE INDEX idx_users_email ON users(email);

-- Composite index (column order matters!):
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);
-- This index helps: WHERE user_id = $1 ORDER BY created_at DESC
-- Does NOT help: WHERE created_at > '2024-01-01' (user_id is first in the index)

-- Partial index (index only a subset of rows):
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';
-- Smaller index, faster for the common query pattern

-- Expression index:‼️
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
-- Helps: WHERE LOWER(email) = 'alice@example.com'

-- CONCURRENTLY (don't lock the table during creation):‼️
CREATE INDEX CONCURRENTLY idx_large_table ON large_table(column);
```

**How to know which indexes to add:**
```sql
-- Find slow queries:‼️
SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC;

-- Analyze a specific query:
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123 AND status = 'active';
-- Look for: Seq Scan → needs an index
-- Look for: Index Scan → already using an index efficiently
```

**Trade-offs:**
- More indexes = faster reads, slower writes (every INSERT/UPDATE must update all indexes)
- Index columns in WHERE, JOIN ON, ORDER BY clauses
- Don't index low-cardinality columns (e.g., boolean 'active' alone — not selective enough)" -->

---

## Section 3: Steno-Specific & Behavioral Questions

---

### Q24. Why Steno? Why this role?

<!-- **Be specific — they can tell when you've done your homework.**

"Three reasons:

1. **The problem space is exciting.** Court reporting is a $3 billion industry that hasn't been modernized. I've spent 6 years at a logistics startup applying technology to a traditional industry, and I saw firsthand how much impact that can have. Steno is doing the same thing for legal — I find that really compelling.

2. **Transcript Genius and AI.** I just integrated OpenAI into Gophr's workflow and saw how transformative it is when you apply AI to a domain with lots of unstructured data. Transcripts are exactly that — thousands of pages that attorneys currently have to read manually. Building tools that let them interrogate transcripts in seconds instead of hours? That's a huge force multiplier.

3. **The engineering culture.** I've read about the team and talked to [recruiter name]. Small, reliable, innovative team — that's where I do my best work. I've been at a startup where I own features end-to-end, from database schema to deployed product, and it sounds like Steno operates the same way.

Also, I noticed you just raised $49M to accelerate Transcript Genius and remote deposition infrastructure. That tells me this is a team that's investing heavily in engineering, and I want to be part of building what comes next." -->

---

### Q25. How do you handle disagreements about technical decisions with other engineers?

<!-- "I approach disagreements as learning opportunities. If two smart people disagree, one of them has context the other doesn't.

**My process:**
1. **Listen first** — understand their position fully before arguing mine. Usually there's a concern I hadn't considered.
2. **Focus on tradeoffs, not opinions** ‼️— 'I prefer X' is weak. 'X is better here because of Y tradeoff' is productive.
3. **Use data** — can we prototype both approaches? Can we benchmark? Can we look at how other teams solved this?
4. **Decide and commit** — once we've discussed, make a decision and move forward. Document the reasoning (ADR). Don't relitigate.
5. **Revisit if needed** — if the chosen approach isn't working, it's okay to pivot. Changing course is a sign of good engineering, not failure.

**Example from Gophr:**
We disagreed about whether to use GraphQL or REST for our new API. I preferred REST (simpler, team had more experience), another engineer wanted GraphQL (flexible queries for our multiple client apps). We spent 30 minutes listing tradeoffs on a whiteboard, agreed GraphQL was better for our multi-client scenario but REST was faster to ship. We went with REST for the MVP with a clear migration path to GraphQL later — pragmatic middle ground." -->

---

### Q26. Tell me about a time you had to deliver a project under a tight deadline.

<!-- **Use the School Lunch System — 1.5 months is impressive.**

"The School Lunch System had a hard deadline — the school year was starting, and if we didn't launch in 6 weeks, we'd miss the window and have to wait until next semester.

**How I managed it:**
1. **Scoped aggressively** — cut nice-to-haves immediately. MVP = parents can browse menus, order, pay. Everything else is v2.
2. **Parallelized** — designed the API contract first so another developer could start the mobile integration while I built the backend
3. **Reused infrastructure** — used our existing auth, payments, and delivery systems instead of building new ones
4. **Daily check-ins** with product — surfaced blockers immediately, didn't wait for sprint reviews
5. **Shipped incrementally** — backend was deployable and testable by week 2, frontend by week 4, integration testing weeks 5-6

We launched on time. It wasn't perfect — there were UX improvements we shipped in the weeks after — but the core system worked and parents were placing orders day one.

**The lesson:** Perfect is the enemy of shipped. Especially at a startup, getting something working in users' hands and iterating is better than polishing in isolation." -->

---

### Q27. How do you handle working with non-technical stakeholders?

<!-- **Relevant for Steno — they serve attorneys who aren't technical.**

"At Gophr, my stakeholders were the operations team — dispatchers and managers who aren't engineers but know the business deeply.

**My approach:**
1. **Speak their language** — I don't say 'we need to refactor the ORM queries.' I say 'the order page is slow because of how we're loading the data, and I can make it 5x faster this week.'
2. **Show, don't tell**‼️ — demos beat specifications. I'd share a 30-second Loom video of the feature instead of writing a long spec doc.
3. **Translate impact** — they care about 'how does this save time' or 'how does this reduce errors,' not the technology behind it.
4. **Involve them early** — show wireframes and prototypes before building the full thing. Getting feedback at the wireframe stage is cheap; getting it after 3 weeks of coding is expensive.

**Connect to Steno:**
Steno's users are attorneys and court reporters — they care about getting transcripts fast, managing their cases, and not dealing with technology friction. The best product engineers build WITH the user, not just FOR them." -->

---

## Section 4: Questions to Ask THEM

> You'll have time at the end. Asking good questions shows you've done your homework
> and are evaluating the role seriously.

---

### Technical questions:

<!-- 1. "How is the engineering team structured? Do engineers own features end-to-end, or is it more frontend/backend specialized?"

2. "What does the development workflow look like? How do features go from idea to production?"

3. "What's the biggest technical challenge the team is working on right now?"

4. "How are you approaching the AI/ML side of Transcript Genius? Is there a dedicated ML team, or do full-stack engineers work on it?"

5. "What does your testing strategy look like? What's the balance between unit, integration, and E2E tests?" -->

### Product & culture questions:

<!-- 6. "What part of the product are you most excited about for the next 6-12 months?"

7. "How does the engineering team collaborate with the court reporters and attorneys who use the product? How do you get user feedback?"

8. "You recently raised $49M — how is that changing the team's priorities and roadmap?"

9. "What does success look like for someone in this role in the first 90 days?"

10. "What's something you wish candidates knew about working at Steno that isn't obvious from the outside?" -->

---

## Quick Reference — Key Numbers From Your Resume

<!-- Use these to keep your answers concrete and impactful:

| Metric | Detail |
|---|---|
| Experience | 6 years full-stack |
| Microservices | Built 3 of 4 core services at Gophr |
| Admin dashboard | Reduced manual work by ~60% |
| OpenAI integration | Reduced estimation time by ~70% |
| School Lunch System | Designed and shipped in 1.5 months |
| Consumer App | Improved order placement efficiency by ~15% |
| Stack overlap with Steno | Node.js, TypeScript, React, PostgreSQL, microservices, AWS, AI/LLM |
| Team experience | Led small teams, full SDLC ownership |
-->
