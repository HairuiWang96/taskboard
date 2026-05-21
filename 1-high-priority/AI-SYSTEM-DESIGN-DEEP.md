# AI System Design Interview Questions

System design for AI products is increasingly appearing in senior interviews. These questions test whether you can design complete, production-ready AI systems — not just wire up an API call. The pattern is the same as regular system design: clarify requirements, design architecture, discuss trade-offs.

---

## How AI System Design Differs from Regular System Design

```text
Regular system design:
  - Deterministic outputs
  - Clear pass/fail testing
  - Performance = latency + throughput + availability

AI system design adds:
  - Non-deterministic outputs (same input can give different output)
  - Evaluation strategy is part of the design
  - Prompt engineering as a design decision
  - Model selection trade-offs (quality vs cost vs speed)
  - Hallucination and safety as system properties
  - Feedback loops (how the system improves over time)
```

---

## Framework for Answering AI System Design Questions

```text
1. Clarify requirements (3-5 minutes)
   - What is the user trying to accomplish?
   - What is the expected query volume?
   - What are the latency requirements? (real-time chat vs async batch)
   - What accuracy level is acceptable? (medical = high, casual = lower)
   - Any privacy or compliance constraints?
   - What data do we have available?

2. High-level architecture (5 minutes)
   - Which AI technique fits? (RAG, agent, classifier, fine-tuned model)
   - What are the main components?
   - Draw the data flow

3. Component deep dives (10-15 minutes)
   - Data ingestion and preprocessing
   - Model selection and serving
   - Retrieval / context building
   - Output validation and safety

4. Evaluation strategy (3-5 minutes)
   - How do you measure success?
   - Offline evals, online metrics, A/B testing

5. Scale, cost, and failure modes (5 minutes)
   - How does it handle 10x traffic?
   - What is the cost per query?
   - What happens when the model fails?
```

---

## Question 1: Design a Customer Support Chatbot

### Clarify

```text
- Volume: 10K conversations/day
- Latency: < 3 seconds for first token
- Data: product documentation, past tickets, order database
- Compliance: no PII sent to third-party LLMs (enterprise customers)
- Goal: resolve 70% of tickets without human escalation
```

### Architecture

```
User message
     ↓
[Input validation & PII detection]
     ↓
[Intent classifier] ← "order status?" → [Database tool]
     ↓                                        ↓
[RAG retrieval]                         [Order lookup API]
     ↓
[Context builder] ← user profile, past tickets, retrieved docs
     ↓
[LLM (Claude/Llama)] ← system prompt + context + tools
     ↓
[Output validation] ← hallucination check, content filter
     ↓
[Response] → [Feedback capture] → [Analytics]
     ↓
[Confidence < threshold?] → [Human escalation queue]
```

### Key decisions

```text
1. RAG over the knowledge base
   Index: product docs, FAQ, past resolved tickets (anonymised)
   Chunk: by paragraph, 300-500 tokens, with title context
   Embed: text-embedding-3-small
   Store: pgvector (already have Postgres) or Pinecone
   Retrieve: top 5 by cosine similarity + BM25 hybrid search

2. Tool use for live data
   get_order_status(order_id) → calls order management API
   get_account_info(account_id) → customer database
   create_ticket(category, description) → ticketing system
   
3. Self-hosted model (for enterprise compliance)
   Llama 3.1 70B on vLLM — no data leaves our infrastructure
   Fallback: Claude via Anthropic for non-PII queries if needed

4. Confidence and escalation
   Score confidence based on: retrieval quality (cosine similarity),
   output uncertainty, intent classification confidence
   If confidence < 0.7: offer to connect to human agent

5. Evaluation
   Offline: 500 golden Q&A pairs rated by support agents
   Online: resolution rate (ticket closed without human), CSAT score
   Regression: run golden set on every prompt/model change
```

### Scaling

```text
RAG indexing: async pipeline, re-index docs on change
Caching: semantic cache for identical/similar queries (Redis + embeddings)
Model serving: vLLM with horizontal scaling behind a load balancer
Cost optimisation: route simple FAQ queries to Haiku/8B, complex to 70B
```

---

## Question 2: Design a RAG System for a Large Document Corpus

### Clarify

```text
- 500K documents, updating weekly
- Documents: PDFs, Word, web pages, Confluence pages
- 50K queries/day
- Users want citations with every answer
- Latency: <5 seconds acceptable
```

### Architecture

```
[Document ingestion pipeline]
  Source connectors (S3, Confluence, website crawler)
       ↓
  [Parser] — PDF → text, HTML → markdown, DOCX → text
       ↓
  [Chunker] — semantic chunking, 400-800 tokens, 10% overlap
       ↓
  [Metadata extractor] — title, source, date, section, author
       ↓
  [Embedding model] — text-embedding-3-small (batch API)
       ↓
  [Vector store] — Pinecone / Weaviate
       ↓
  [Keyword index] — Elasticsearch (for BM25 hybrid search)

[Query pipeline]
  User query
       ↓
  [Query transformation] — rewrite for better retrieval
       ↓
  [Hybrid search] — vector similarity + BM25 keyword
       ↓
  [Reranker] — cross-encoder reranking (Cohere Rerank)
       ↓
  [Context builder] — top 5 chunks + metadata + citation info
       ↓
  [LLM] — generates answer with inline citations
       ↓
  [Citation validator] — verify each claim traces to a source chunk
       ↓
  [Response + cited sources]
```

### Key decisions and trade-offs

```text
Chunking strategy:
  Fixed-size (simple, consistent) vs semantic (better context, harder to implement)
  → Use recursive character text splitting with semantic awareness
  → Keep chunk size consistent with retrieval performance (benchmark 256/512/1024)

Embedding model:
  text-embedding-3-small: cheap, fast, good quality ($0.02/1M tokens)
  text-embedding-3-large: better quality, 5x more expensive
  voyage-3 (Anthropic): best for technical/code content
  → Start with text-embedding-3-small, upgrade if retrieval quality is insufficient

Hybrid search:
  Vector alone misses exact keyword matches ("version 2.3.1", proper nouns)
  BM25 alone misses semantic similarity
  → Reciprocal Rank Fusion (RRF) to merge both result lists

Reranking:
  First-pass retrieval gets top 20-50 candidates
  Cross-encoder reranker picks top 5 (more accurate, slower)
  → Cohere Rerank or sentence-transformers/cross-encoder

Citation tracking:
  Each chunk gets a unique ID
  LLM instructed: "cite source IDs inline as [src:uuid]"
  Post-process: resolve IDs to full citation metadata

Update strategy:
  Weekly batch re-index for large document sets
  Real-time indexing for high-priority sources (webhooks)
  Versioning: keep old chunks with version metadata, filter by recency
```

### Evaluation

```text
Retrieval quality:
  Recall@K — of relevant docs, how many are in top K?
  MRR (Mean Reciprocal Rank) — how high does the first relevant result appear?
  Use a golden set: 200 questions with known relevant document IDs

Answer quality:
  Faithfulness: does the answer only use information from retrieved chunks?
  Relevance: does the answer address the question?
  LLM-as-judge: automated scoring on both dimensions

Online metrics:
  Thumbs up/down on answers
  Citation click rate (did users check the sources?)
  Follow-up question rate (proxy for answer completeness)
```

---

## Question 3: Design a Coding Assistant (Like GitHub Copilot)

### Clarify

```text
- IDE integration (VS Code extension)
- Two features: inline completion + chat
- Inline: trigger on pause, complete current line/block
- Chat: answer questions about the current file/codebase
- Latency: inline < 200ms, chat < 5 seconds
- Codebase: private, cannot send to external APIs
```

### Architecture

```
[VS Code Extension]
  ├── Inline completion provider
  │     ↓
  │   [Context builder]
  │     - Current file (prefix + suffix around cursor)
  │     - Language, file path
  │     - Related files (imports, types)
  │     ↓
  │   [LLM — FIM model] ← Fill In the Middle
  │     (CodeLlama/DeepSeek Coder served via vLLM on private infra)
  │     ↓
  │   [Completion displayed inline]
  │
  └── Chat panel
        ↓
      [Workspace indexer] (runs locally)
        - Embeds all code files
        - Stores in local vector DB (LanceDB / ChromaDB)
        ↓
      [Context retrieval]
        - Current file content
        - Relevant code files (by semantic search)
        - Open tabs
        ↓
      [LLM with code context]
        ↓
      [Streaming response with code blocks]
```

### Key decisions

```text
Inline completion — latency is critical:
  Use FIM (Fill In the Middle) models trained specifically for code completion
  These take prefix + suffix and fill in the middle — better than left-to-right
  Models: CodeLlama-7B-Instruct (fast), DeepSeek Coder 1.3B (fastest)
  Cache completions for the same prefix (common patterns repeat)
  Debounce: only trigger after 150ms of no typing

Chat — accuracy over speed:
  Larger model (34B+) for the chat feature
  Use the entire current file as context
  RAG over the codebase for "how does X work?" questions
  Tree-sitter for syntax-aware chunking (chunk by function/class, not line count)

Privacy (self-hosted):
  All models run on company infrastructure (vLLM on GPU servers)
  The extension sends code to internal API only, never external
  Option: local model running entirely on developer machine (Ollama)

Workspace indexing:
  Run locally in the extension (no data leaves the machine)
  Incremental updates on file save events
  LanceDB or ChromaDB — embedded databases, no server required
```

---

## Question 4: Design an AI Data Analyst

User asks questions in natural language, agent queries a database and returns analysis.

### Architecture

```
User: "What were our top 5 products by revenue last quarter?"
     ↓
[Schema loader] — load DB schema, table names, column descriptions
     ↓
[Text-to-SQL agent]
  System prompt: schema + SQL dialect + safety rules
  Tools: run_sql(query) → results
  The model generates SQL, executes it, interprets results
     ↓
[SQL validator] — parse query, check for dangerous operations
     ↓
[DB execution] — read-only connection, row limit enforced
     ↓
[Result interpreter] — LLM explains results in plain English
     ↓
[Chart generator] — create visualisation if appropriate
     ↓
[Response with table + chart + explanation]
```

### Key decisions

```text
Safety — prevent destructive SQL:
  Parse the query before executing — reject any non-SELECT statements
  Read-only database connection (SELECT only at DB level)
  Row limit: always add LIMIT 1000 if not specified
  Query timeout: 30 seconds max

Schema grounding:
  Include table names, column names, types, and descriptions in the system prompt
  For large schemas: use RAG to retrieve only relevant tables based on the question
  Include sample values for categorical columns (helps the model use correct values)

Hallucination in SQL:
  Model may generate SQL that is syntactically valid but semantically wrong
  Always show the generated SQL to the user before executing (or alongside results)
  Let users edit/rerun the query

Iterative refinement:
  If the query fails or returns empty results, the agent should try alternative queries
  Allow multi-turn: "break that down by region" → agent refines the previous query

Caching:
  Cache results for identical queries (same SQL, same DB state)
  Semantic cache: similar natural language questions may map to the same SQL
```

---

## Question 5: Design an AI Document Processing Pipeline

Extract structured data from unstructured documents (invoices, contracts, forms).

### Architecture

```
[Document input] — PDF, image, Word
     ↓
[OCR layer] — for scanned PDFs/images (AWS Textract, Google Document AI)
     ↓
[Document classifier] — invoice / contract / form / other
     ↓
[Extraction agent]
  System prompt tailored to document type
  Tools: get_page(n), search_text(query)
  Output: structured JSON matching predefined schema
     ↓
[Output validator] — validate against JSON schema, flag missing fields
     ↓
[Confidence scoring] — per-field confidence
     ↓
[Human review queue] — low-confidence fields flagged for review
     ↓
[Structured output stored]
```

### Key decisions

```text
Multimodal vs text-only:
  Vision models (Claude claude-sonnet-4-6/GPT-4o) can process PDF pages as images
  Better for complex layouts (tables, forms) than text extraction
  More expensive — use for complex documents, text-only for simple ones

Schema-first extraction:
  Define the target schema first
  Prompt: "Extract fields matching this JSON schema: {...}"
  Use structured output / tool use to enforce the schema

Confidence and validation:
  Ask the model to provide confidence (0-1) for each extracted field
  Post-process: flag fields below 0.8 for human review
  Validate: required fields present, types correct, values in expected range

Batch processing:
  Documents arrive async — use a queue (SQS, BullMQ)
  Process in parallel with concurrency limits
  Track status: queued → processing → complete / failed

Human-in-the-loop:
  Route low-confidence extractions to a review UI
  Human corrects → feed corrections back to improve future prompts
  Track which document types need most human review → prioritise improvement
```

---

## Common Interview Questions

### "Walk me through how you would design a RAG system."

> Start with the indexing pipeline: ingest documents, parse them to text, chunk into 400-800 token segments with metadata, embed with a text embedding model, and store in a vector database. At query time: embed the user's query, retrieve the top-K most similar chunks using cosine similarity (and optionally BM25 for hybrid search), rerank the results with a cross-encoder for better precision, build a prompt with the top chunks as context, and send to the LLM. The critical design decisions are: chunk size and overlap (affects recall and context quality), embedding model (quality vs cost), how many chunks to retrieve (too few misses content, too many degrades LLM performance), and whether to use a reranker. Evaluate with retrieval metrics (Recall@K, MRR) and answer quality metrics (faithfulness, relevance).

### "How would you prevent an AI system from hallucinating?"

> No technique eliminates hallucination, but several reduce it. **RAG** — ground the model in retrieved source documents rather than relying on its training knowledge. **Prompt engineering** — instruct the model: "Only use information from the provided context. If unsure, say 'I don't know'." **Structured output with citations** — force the model to cite the specific chunk that supports each claim, then verify the claim appears in that chunk. **Temperature 0** — deterministic sampling for factual tasks. **Model selection** — larger, more capable models hallucinate less. **Post-processing** — verify factual claims programmatically where possible (dates, numbers, URLs). **Confidence thresholds** — if the model expresses uncertainty, route to a human or flag the response.

### "How do you evaluate an AI feature in production?"

> Three levels. **Offline evals**: before deploying, run the system against a golden dataset of representative inputs with known-good outputs. Use exact match for structured tasks, LLM-as-judge for open-ended ones. **Online metrics**: after deploying, track user engagement signals — thumbs up/down, regeneration rate, conversation continuation rate. For specific tasks: resolution rate, task completion, user satisfaction scores. **Regression testing**: every time you change the prompt, model, or retrieval system, re-run the offline eval suite and compare against the previous baseline. A change that improves one dimension (e.g. answer length) may degrade another (e.g. accuracy) — catch this before it reaches users. The eval suite should be treated like a test suite: maintained, versioned, and run in CI.
