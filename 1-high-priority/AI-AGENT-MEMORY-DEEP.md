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

class KeyValueMemory {
  constructor(private userId: string) {}

  private key(field: string) {
    return `memory:${this.userId}:${field}`;
  }

  async set(field: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await redis.setEx(this.key(field), ttlSeconds, value);
    } else {
      await redis.set(this.key(field), value);
    }
  }

  async get(field: string): Promise<string | null> {
    return redis.get(this.key(field));
  }

  async getAll(): Promise<Record<string, string>> {
    const keys = await redis.keys(`memory:${this.userId}:*`);
    const values = await Promise.all(keys.map(k => redis.get(k)));
    return Object.fromEntries(
      keys.map((k, i) => [k.replace(`memory:${this.userId}:`, ''), values[i] ?? ''])
    );
  }

  async delete(field: string) {
    await redis.del(this.key(field));
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
    this.embeddings = new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });
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

## Pattern 3: LangChain Memory

LangChain provides built-in memory classes for common patterns.

```typescript
import { BufferMemory, ConversationSummaryMemory } from 'langchain/memory';
import { ChatAnthropic } from '@langchain/anthropic';
import { ConversationChain } from 'langchain/chains';

// In-context buffer memory (simple)
const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: 'history',
});

// Summary memory (compresses old messages automatically)
const summaryMemory = new ConversationSummaryMemory({
  llm: new ChatAnthropic({ modelName: 'claude-haiku-4-5-20251001' }), // cheap model for summarisation
  returnMessages: true,
  memoryKey: 'history',
});

const chain = new ConversationChain({
  llm: new ChatAnthropic({ modelName: 'claude-sonnet-4-6' }),
  memory: summaryMemory,
});

// Memory persists across chain calls
const r1 = await chain.call({ input: 'My name is Harry and I prefer TypeScript.' });
const r2 = await chain.call({ input: 'What language did I say I prefer?' }); // knows it's TypeScript
```

---

## Pattern 4: Mem0 — Dedicated Memory Layer

Mem0 is a purpose-built memory layer for AI agents. It automatically extracts and manages memories.

```typescript
import { Memory } from 'mem0ai';

const memory = new Memory({
  // Can use vector store (Qdrant, Pinecone) + LLM for extraction
  vector_store: { provider: 'qdrant', config: { url: process.env.QDRANT_URL } },
  llm: { provider: 'anthropic', config: { model: 'claude-haiku-4-5-20251001' } },
  embedder: { provider: 'openai', config: { model: 'text-embedding-3-small' } },
});

// Add messages — Mem0 automatically extracts memorable facts
await memory.add([
  { role: 'user', content: 'I am a senior frontend engineer working with React and TypeScript.' },
  { role: 'assistant', content: 'Great! I will keep that in mind.' },
], { user_id: 'user-123' });

// Search relevant memories
const memories = await memory.search('what do I work with?', { user_id: 'user-123' });
// Returns: [{ memory: 'Senior frontend engineer working with React and TypeScript', score: 0.92 }]

// Get all memories for a user
const allMemories = await memory.getAll({ user_id: 'user-123' });
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
      this.shortTerm = await this.compressShorTerm(this.shortTerm);
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

> Research (Liu et al., 2023) showed that LLMs perform significantly worse when relevant information is placed in the middle of a long context — they attend better to the beginning and end. This affects agent memory because naively appending all retrieved memories to the context can bury the most relevant information. Mitigations: put the most important context at the beginning or end of the system prompt, not the middle; limit retrieved memories to the 3-5 most relevant rather than dumping everything; use a reranker to put the highest-scored memories first; prefer concise summaries over raw conversation transcripts.

### "How would you handle memory for a multi-user application?"

> Each user gets a namespaced memory scope — all keys/vectors include the user ID as a filter. In Redis: `memory:{userId}:{key}`. In a vector store: filter by `userId` metadata field during search so users never see each other's memories. Additionally: encrypt sensitive memories at rest, give users a way to view and delete their stored memories (GDPR compliance), and set TTLs on episodic memories you don't need forever. Separate the memory store from the application database so it can be independently scaled and cleared.
