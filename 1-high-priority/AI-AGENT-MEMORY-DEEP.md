# AI Agent Memory Systems

Without memory, every agent conversation starts from zero. The user has to re-explain context every time. Memory systems let agents remember past interactions, user preferences, and learned facts — making them genuinely useful over time.

This is a common gap in AI engineering interviews: candidates know how to build a single agent loop but haven't thought through how agents maintain state across sessions.

---

## Types of Memory

```text
Short-term memory (in-context):
  The conversation history in the current context window.
  Everything the model can "see" right now.
  Lost when the context window ends or the session closes.

Long-term memory (persistent):
  Information stored externally and retrieved when relevant.
  Survives across sessions and conversations.
  Must be explicitly written to and read from storage.

Episodic memory:
  Memory of specific past events/conversations.
  "Last time we talked, you mentioned you prefer TypeScript over JavaScript."
  Retrieved by recency or relevance.

Semantic memory:
  Distilled facts and knowledge about the user, world, or domain.
  "The user is a senior frontend engineer."
  More stable than episodic — facts, not events.

Procedural memory:
  Learned skills, workflows, preferences for how to do things.
  "This user prefers concise responses without preamble."
  Often baked into the system prompt dynamically.
```

---

## Short-Term Memory — Managing Context

The simplest form. The conversation history is the memory.

```typescript
// Basic in-context memory — just maintain the message array
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class ConversationMemory {
  private messages: Message[] = [];

  add(role: Message['role'], content: string) {
    this.messages.push({ role, content });
  }

  getMessages(): Message[] {
    return this.messages;
  }

  // Token count grows unboundedly — must manage
  async trim(maxTokens = 100_000) {
    while (estimateTokens(this.messages) > maxTokens) {
      // Remove oldest non-system messages
      const firstNonSystem = this.messages.findIndex(m => m.role !== 'system');
      if (firstNonSystem === -1) break;
      this.messages.splice(firstNonSystem, 1);
    }
  }
}
```

### Summarisation — compressing long context

```typescript
// When context gets too long, summarise the old part and keep the recent part
async function compressContext(
  messages: Message[],
  keepLast: number,
  llm: LLMClient
): Promise<Message[]> {
  if (messages.length <= keepLast) return messages;

  const toSummarise = messages.slice(0, -keepLast);
  const toKeep = messages.slice(-keepLast);

  const summary = await llm.chat({
    messages: [
      ...toSummarise,
      {
        role: 'user',
        content: 'Summarise this conversation in 3-5 bullet points, preserving all important facts, decisions, and context.',
      },
    ],
  });

  return [
    { role: 'system', content: `Previous conversation summary:\n${summary}` },
    ...toKeep,
  ];
}
```

---

## Long-Term Memory — Persistent Storage

### Pattern 1: Key-value memory store

Simple facts stored as key-value pairs. Fast lookup, no semantic search needed.

```typescript
// Redis-based key-value memory
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

// One Redis HASH per user: memory:{userId} → { field: value, ... }
// ‼️ Don't use redis.keys('memory:user:*') to list a user's facts — KEYS scans
//    the WHOLE database and blocks Redis while it runs. A hash gives you every
//    field for one user in a single O(fields) HGETALL.
class KeyValueMemory {
  constructor(private userId: string) {}

  private get key() {
    return `memory:${this.userId}`;
  }

  async set(field: string, value: string) {
    await redis.hSet(this.key, field, value);
  }

  async get(field: string): Promise<string | null> {
    return (await redis.hGet(this.key, field)) ?? null;
  }

  async getAll(): Promise<Record<string, string>> {
    return redis.hGetAll(this.key);
  }

  async delete(field: string) {
    await redis.hDel(this.key, field);
  }

  // TTL applies to the whole hash — e.g. expire a user's memory after a year
  // of inactivity. (Redis 7.4+ also supports per-field expiry with HEXPIRE.)
  async touch(ttlSeconds: number) {
    await redis.expire(this.key, ttlSeconds);
  }
}

// Agent tool to write memory
const rememberTool = tool({
  name: 'remember',
  description: 'Save important information about the user for future conversations',
  schema: z.object({
    key: z.string().describe('What this fact is about, e.g. "preferred_language", "timezone"'),
    value: z.string().describe('The information to remember'),
  }),
  execute: async ({ key, value }) => {
    await memory.set(key, value);
    return `Remembered: ${key} = ${value}`;
  },
});

// Inject known facts into system prompt
async function buildSystemPrompt(userId: string): Promise<string> {
  const memory = new KeyValueMemory(userId);
  const facts = await memory.getAll();

  const factsSection = Object.entries(facts)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return `You are a helpful assistant.

${factsSection ? `What you know about this user:\n${factsSection}` : ''}

If you learn new important facts about the user, use the remember tool to save them.`;
}
```

### Pattern 2: Vector memory (semantic search)

For episodic memory — retrieve past conversations by semantic similarity, not exact key lookup.

```typescript
import { OpenAIEmbeddings } from '@langchain/openai';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';

class VectorMemory {
  private vectorStore: PGVectorStore;
  private embeddings: OpenAIEmbeddings;

  constructor(private userId: string) {
    this.embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-small' });
    // (create this.vectorStore once at startup with PGVectorStore.initialize(...)
    //  and share it — omitted here for brevity)
  }

  // Store a memory (conversation excerpt, fact, event)
  async store(content: string, metadata: Record<string, unknown> = {}) {
    await this.vectorStore.addDocuments([{
      pageContent: content,
      metadata: {
        userId: this.userId,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    }]);
  }

  // Retrieve memories relevant to a query
  async retrieve(query: string, topK = 5): Promise<string[]> {
    const results = await this.vectorStore.similaritySearch(query, topK, {
      userId: this.userId, // filter to this user's memories only
    });
    return results.map(r => r.pageContent);
  }
}

// In the agent loop: retrieve relevant memories before each response
async function chatWithMemory(userMessage: string, userId: string) {
  const memory = new VectorMemory(userId);

  // Retrieve memories relevant to the current message
  const relevantMemories = await memory.retrieve(userMessage);

  const systemPrompt = `You are a helpful assistant.

Relevant context from past conversations:
${relevantMemories.join('\n\n')}

Use this context to provide personalised, contextual responses.`;

  const response = await llm.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  // Store this exchange as a memory for future conversations
  await memory.store(`User asked: ${userMessage}\nYou responded: ${response}`, {
    type: 'conversation',
  });

  return response;
}
```

---

## Pattern 3: LangChain / LangGraph Memory

LangChain v1 (late 2025) handles conversation memory through LangGraph **checkpointers**: the
agent's full state is saved after every step, keyed by a `thread_id`.

```typescript
// ‼️ The old classes — BufferMemory, ConversationSummaryMemory,
//    ConversationChain — were removed from the main package in LangChain v1.
//    Most tutorials online still use them. This is the current pattern:
import { createAgent, summarizationMiddleware } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';

const agent = createAgent({
  model: 'anthropic:claude-opus-5',
  tools: [],
  // Short-term memory: saves the conversation state after every step.
  // MemorySaver is in-process — use a Postgres/Redis checkpointer in production.
  checkpointer: new MemorySaver(),
  middleware: [
    // Summarise older messages once the history gets long, keep recent ones verbatim
    summarizationMiddleware({
      model: 'anthropic:claude-haiku-4-5', // cheap model for summarisation
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
  ],
});

// Same thread_id = same conversation. A new thread_id starts fresh.
const config = { configurable: { thread_id: 'user-123-session-1' } };
await agent.invoke({ messages: [{ role: 'user', content: 'My name is Harry and I prefer TypeScript.' }] }, config);
const r2 = await agent.invoke({ messages: [{ role: 'user', content: 'What language did I say I prefer?' }] }, config);
// knows it's TypeScript

// Long-term memory across threads uses a separate LangGraph "store"
// (key-value + optional semantic search), namespaced per user.
```

---

## Pattern 4: Mem0 — Dedicated Memory Layer

Mem0 is a purpose-built memory layer for AI agents. It automatically extracts and manages memories.
(Alternatives: Zep, Letta — formerly MemGPT — and LangGraph's long-term store.)

```typescript
// Open-source (self-hosted) version; the hosted platform has its own client
import { Memory } from 'mem0ai/oss';

const memory = new Memory({
  // Vector store + embedder for search, plus an LLM that extracts facts
  vectorStore: { provider: 'qdrant', config: { url: process.env.QDRANT_URL, collectionName: 'memories' } },
  llm: { provider: 'anthropic', config: { model: 'claude-haiku-4-5' } },
  embedder: { provider: 'openai', config: { model: 'text-embedding-3-small' } },
});

// Add messages — Mem0 automatically extracts memorable facts
await memory.add([
  { role: 'user', content: 'I am a senior frontend engineer working with React and TypeScript.' },
  { role: 'assistant', content: 'Great! I will keep that in mind.' },
], { userId: 'user-123' });

// Search relevant memories
// ‼️ Note the inconsistent naming: add() takes userId, search filters take user_id
const memories = await memory.search('what do I work with?', { filters: { user_id: 'user-123' } });
// Returns e.g.: [{ memory: 'Senior frontend engineer working with React and TypeScript', score: 0.92 }]
```

---

## Pattern 5: Provider-Native Memory and Context Management

Model providers now ship some of this themselves. Know they exist before building your own.

```text
Anthropic (Claude API):
  Memory tool       — Claude reads/writes files in a /memories directory that
                      YOUR code stores (database, S3, disk). The model decides
                      what to save; you control where it lives.
  Compaction        — server-side: when the conversation nears a token
                      threshold, the API summarises older turns automatically
                      (beta). Replaces your own compressContext().
  Context editing   — automatically clears old tool results / thinking blocks
                      that are no longer needed (beta).
  Managed Agents    — hosted agents with persistent memory stores.

OpenAI:
  Conversations / Responses API state — the server keeps the conversation
  history so you send only the new message.

ChatGPT / Claude apps: have their own user-facing "memory" features — those
are product features, not something your API calls get automatically.

When to still build your own:
  - You need memory shared across models or providers
  - You need full control over retention, deletion (GDPR) and audit
  - You need structured facts queryable by your own app, not just the model
```

---

## Memory Architecture for Production

```typescript
// Complete memory system — combines all three types
class AgentMemorySystem {
  private shortTerm: Message[] = []; // current conversation
  private kv: KeyValueMemory;        // persistent facts
  private vector: VectorMemory;      // episodic memories

  constructor(private userId: string) {
    this.kv = new KeyValueMemory(userId);
    this.vector = new VectorMemory(userId);
  }

  // Build the full context for a new message
  async buildContext(userMessage: string): Promise<{
    systemPrompt: string;
    messages: Message[];
  }> {
    // 1. Retrieve persistent facts (always included)
    const facts = await this.kv.getAll();

    // 2. Retrieve semantically relevant past conversations
    const pastConversations = await this.vector.retrieve(userMessage, 3);

    // 3. Build system prompt with memory
    const systemPrompt = [
      'You are a helpful personal assistant.',
      '',
      Object.keys(facts).length > 0
        ? `Known facts about this user:\n${Object.entries(facts).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
        : '',
      '',
      pastConversations.length > 0
        ? `Relevant past conversations:\n${pastConversations.join('\n\n---\n\n')}`
        : '',
    ].filter(Boolean).join('\n');

    return { systemPrompt, messages: this.shortTerm };
  }

  // After a conversation: store what's worth keeping
  async consolidate(userMessage: string, assistantResponse: string) {
    // Add to short-term
    this.shortTerm.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantResponse }
    );

    // Trim short-term if too long
    if (estimateTokens(this.shortTerm) > 50_000) {
      this.shortTerm = await this.compressShortTerm(this.shortTerm);
    }

    // Store in episodic memory (vector)
    await this.vector.store(
      `User: ${userMessage}\nAssistant: ${assistantResponse}`,
      { type: 'conversation', timestamp: Date.now() }
    );
  }

  // Let the agent explicitly save facts
  async saveFact(key: string, value: string) {
    await this.kv.set(key, value);
  }
}
```

---

## Memory Tools for Agents

Give the agent explicit control over what to remember.

```typescript
const memoryTools = [
  tool({
    name: 'save_user_preference',
    description: 'Save a user preference or fact that should be remembered in future conversations. Use this when the user mentions something important about themselves, their preferences, or their context.',
    schema: z.object({
      key: z.string().describe('Short identifier, e.g. "coding_language", "timezone", "job_title"'),
      value: z.string().describe('The value to remember'),
    }),
    execute: async ({ key, value }) => {
      await memorySystem.saveFact(key, value);
      return `Saved: I will remember that your ${key} is ${value}.`;
    },
  }),

  tool({
    name: 'search_past_conversations',
    description: 'Search your memory for relevant past conversations or information',
    schema: z.object({
      query: z.string().describe('What to search for'),
    }),
    execute: async ({ query }) => {
      const results = await memorySystem.vector.retrieve(query);
      if (results.length === 0) return 'No relevant past conversations found.';
      return `Found relevant context:\n${results.join('\n\n')}`;
    },
  }),

  tool({
    name: 'forget',
    description: 'Delete a specific stored memory when the user asks you to forget something',
    schema: z.object({
      key: z.string(),
    }),
    execute: async ({ key }) => {
      await memorySystem.kv.delete(key);
      return `Deleted memory: ${key}`;
    },
  }),
];
```

---

## Common Interview Questions

### "How would you give an AI agent memory across sessions?"

> There are three layers. **Short-term**: the conversation history in the context window — this is just the message array. **Long-term key-value**: persistent facts about the user stored in Redis or a database (name, preferences, timezone). Injected into the system prompt at the start of each session. **Long-term episodic**: past conversation summaries stored in a vector database. At the start of each turn, embed the user's message, search for semantically similar past conversations, and inject the relevant ones as context. The agent also gets tools to explicitly save new facts and search past conversations. The challenge is knowing what's worth remembering — use the LLM to extract memorable facts from each conversation before storing.

### "What is the 'lost in the middle' problem and how does it affect agent memory?"

> Research (Liu et al., 2023) showed that LLMs perform significantly worse when relevant information is placed in the middle of a long context — they attend better to the beginning and end. This affects agent memory because naively appending all retrieved memories to the context can bury the most relevant information. Mitigations: put the most important context at the beginning or end of the system prompt, not the middle; limit retrieved memories to the 3-5 most relevant rather than dumping everything; use a reranker to put the highest-scored memories first; prefer concise summaries over raw conversation transcripts. Newer long-context models handle this much better than 2023-era models, but quality still drops as context fills up (often called "context rot") — so retrieving less, better context still wins.

### "How would you handle memory for a multi-user application?"

> Each user gets a namespaced memory scope — all keys/vectors include the user ID as a filter. In Redis: `memory:{userId}:{key}`. In a vector store: filter by `userId` metadata field during search so users never see each other's memories. Additionally: encrypt sensitive memories at rest, give users a way to view and delete their stored memories (GDPR compliance), and set TTLs on episodic memories you don't need forever. Separate the memory store from the application database so it can be independently scaled and cleared.
