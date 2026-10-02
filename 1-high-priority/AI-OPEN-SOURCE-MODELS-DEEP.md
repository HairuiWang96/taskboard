# Open Source & Self-Hosted LLMs

Many companies — especially in finance, healthcare, legal, and enterprise — cannot send data to OpenAI or Anthropic due to privacy, compliance, or cost reasons. They run open source models locally or in their own cloud. Knowing both the API side and the self-hosted side is a clear differentiator in AI engineering interviews.

> Model line-up reviewed October 2026. Open-weight releases arrive every few weeks — treat
> the model names below as examples of each category and check the current leaderboards
> (e.g. LMArena, Artificial Analysis) and model cards before choosing one.

---

## Why Self-Hosted Models

```text
Reasons companies go self-hosted:
  - Data privacy: no customer data leaves their infrastructure
  - Compliance: HIPAA, GDPR, SOC2 — sending PII to a third-party API is often not allowed
  - Cost at scale: API pricing becomes expensive at high volume
  - Latency: no round-trip to an external API, especially with on-premise hardware
  - Customisation: fine-tune on proprietary data without sharing it
  - No vendor lock-in: not dependent on OpenAI/Anthropic uptime or pricing changes

Tradeoffs:
  - Infrastructure overhead (GPU provisioning, scaling, monitoring)
  - Still behind the best closed models (Claude, GPT, Gemini) on the hardest
    reasoning, coding and agentic tasks — but the gap is now months, not years.
    The best open models (DeepSeek, Qwen, Kimi, GLM, gpt-oss) are good enough
    for most product features.
  - The strongest open models are huge Mixture-of-Experts models that need a
    multi-GPU server — "open" does not mean "runs on a laptop"
  - Engineering cost to set up and maintain
  - Keeping up with fast-moving open source releases
```

```text
‼️ "OPEN SOURCE" vs "OPEN WEIGHTS" — a distinction interviewers like

  Most "open source" LLMs are really OPEN WEIGHTS: you can download and run
  the model, but the training data and code are not released, and the
  licence may restrict use.

  Permissive (use commercially, few strings):  Apache 2.0 (Qwen, Mistral's
                                               open models, gpt-oss), MIT
                                               (DeepSeek, Phi)
  Custom licences with conditions:             Llama (extra terms above 700M
                                               monthly users, acceptable-use
                                               policy), Gemma (Google's terms)

  ‼️ Always have legal read the licence before shipping a model in a product.
```

---

## Key Open-Weight Models

```text
Snapshot, October 2026 — names change every few months; the FAMILIES and
the trade-offs between them are what's worth remembering.

Qwen (Alibaba) — the most widely used open family:
  Qwen 3.5 — full size range from 0.8B to 122B, multimodal
  Qwen 3.6 / 3.8 — 27B–35B models aimed at agentic coding
  Strong multilingual, especially Chinese + English
  License: Apache 2.0 for most sizes (check each model card)

DeepSeek (V4, V4.1):
  Very large Mixture-of-Experts models with long context and selectable
  reasoning modes — among the strongest open models
  Earlier R1 (Jan 2025) popularised open "reasoning" models
  Needs a multi-GPU server — most people use it via a hosting provider
  License: MIT for recent releases (check the model card)

Z.ai GLM-5.x, Moonshot Kimi K3, MiniMax M3:
  Frontier-scale open-weight models, strongest on coding and long agentic
  tasks; huge MoE, so usually consumed through hosted APIs

OpenAI gpt-oss (Aug 2025):
  gpt-oss-120b — runs on a single 80GB GPU
  gpt-oss-20b  — runs on a 16GB machine (laptop / consumer GPU)
  Reasoning models with adjustable effort, good at tool use
  License: Apache 2.0

Google Gemma 4:
  e2b / e4b (phones and laptops), 12B, 26B, 31B — multimodal,
  good at reasoning and agentic work for their size
  License: Gemma terms of use

Mistral:
  Mistral Medium 3.5 — 128B flagship merging chat, reasoning and coding
  Smaller Mistral Small / Devstral models for one GPU
  License: varies by model — check each one

NVIDIA Nemotron 3 (e.g. Super: 120B total, 12B active),
IBM Granite 4.x (3B–30B, Apache 2.0, enterprise focus):
  Popular in enterprises that want a US vendor and clear licensing

Meta Llama 4 (Scout / Maverick, Apr 2025):
  Still Meta's latest open release; MoE, natively multimodal, long context.
  Llama 3.x 8B/70B remain common in older production systems.
  License: Llama Community License (conditions above)

Microsoft Phi-4: small models with strong reasoning per parameter (MIT)

Code models:
  Today's general models (Qwen 3.6/3.8, GLM, Kimi, DeepSeek, gpt-oss) are
  strong at code. (CodeLlama and StarCoder2 are outdated.)
```

```text
‼️ MIXTURE OF EXPERTS (MoE) — why parameter counts are confusing now

  Total parameters  — what you must fit in GPU memory
  Active parameters — what each token actually computes (sets the speed)

  Nemotron 3 Super: needs memory for 120B, computes only ~12B per token.
  DeepSeek-V3:      needs memory for ~671B, computes ~37B per token.
  Qwen3-30B-A3B:    needs memory for 30B, runs about as fast as a 3B model.

  So: MoE models are FAST for their quality, but NOT small.
```

---

## Ollama — Running Models Locally

Ollama is the easiest way to run models on your laptop or dev machine.

```bash
# Install (Mac) — or download the desktop app from ollama.com
brew install ollama

# Pull and run a model
ollama pull qwen3.5:9b
ollama run qwen3.5:9b

# Other good local choices
ollama pull gpt-oss:20b      # reasoning + tool use, needs ~16GB memory
ollama pull gemma4:e4b       # small, multimodal, laptop-friendly
ollama pull qwen3.6:35b      # agentic coding, needs a big GPU or Mac

# Very large models (DeepSeek V4, GLM-5, Kimi K3) are offered as ":cloud"
# tags — Ollama runs them on its servers, so data leaves your machine.

# List downloaded models
ollama list

# Ollama exposes a local REST API (compatible with OpenAI API format)
# Default: http://localhost:11434
```

### Using Ollama with the OpenAI SDK

```typescript
import OpenAI from 'openai';

// Point OpenAI SDK at local Ollama — no API key needed
const client = new OpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama', // Required by SDK but ignored by Ollama
});

const response = await client.chat.completions.create({
  model: 'qwen3.5:9b',
  messages: [{ role: 'user', content: 'Explain closures in JavaScript' }],
  temperature: 0.7,
});

console.log(response.choices[0].message.content);
```

### Using Ollama with LangChain

```typescript
import { ChatOllama } from '@langchain/ollama';

const model = new ChatOllama({
  model: 'qwen3.5:9b',
  baseUrl: 'http://localhost:11434',
  temperature: 0.7,
});

const response = await model.invoke('What is the event loop in Node.js?');
```

---

## vLLM — Production Model Serving

vLLM is the standard for serving open source models in production. It provides:
- **PagedAttention**: efficient GPU memory management — 2-4x more throughput than naive serving
- **Continuous batching**: serve multiple requests simultaneously without waiting for one to finish
- **OpenAI-compatible API**: drop-in replacement for the OpenAI API
- **Tensor parallelism**: split a large model across multiple GPUs

Alternatives worth knowing: **SGLang** (similar, very fast for structured/agent workloads),
**TensorRT-LLM** / NVIDIA NIM (maximum performance on NVIDIA), **Hugging Face TGI** (now in
maintenance mode — prefer vLLM or SGLang for new deployments), **llama.cpp** (CPU and
Apple Silicon, small scale).

```bash
# Install
pip install vllm

# Serve a model (starts an OpenAI-compatible HTTP server on port 8000)
# Examples use Qwen3-8B because its Hugging Face ID is stable — swap in the
# current release from the model's Hugging Face page.
vllm serve Qwen/Qwen3-8B \
  --dtype auto \
  --api-key token-abc123

# Multi-GPU (for large models) — split across 4 GPUs
vllm serve Qwen/Qwen3-235B-A22B-Instruct-2507 \
  --tensor-parallel-size 4
```

### Calling vLLM from TypeScript

```typescript
// vLLM exposes an OpenAI-compatible API
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://your-vllm-server:8000/v1',
  apiKey: 'token-abc123',
});

const response = await client.chat.completions.create({
  model: 'Qwen/Qwen3-8B',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 512,
  temperature: 0.7,
});
```

### vLLM in Docker (production deployment)

```dockerfile
FROM vllm/vllm-openai:latest   # pin a specific version tag in production

# ‼️ Don't bake HF_TOKEN into the image — pass it at runtime:
#    docker run --gpus all -e HF_TOKEN=... -p 8000:8000 my-vllm

# The image's entrypoint is the vLLM server; CMD supplies its arguments.
# ‼️ Exec-form CMD (JSON array) does NOT expand ${VARIABLES} — write the model
#    name literally, or use shell form if you need env var substitution.
CMD ["--model", "Qwen/Qwen3-8B", "--dtype", "auto", "--max-model-len", "32768"]
```

---

## Hugging Face Hub — Model Repository

Hugging Face is the GitHub of ML models. Most open source models are published here.

```typescript
// Hugging Face Inference Providers — hosted inference, no GPU needed.
// Requests are routed to partner providers (Together, Fireworks, Groq, ...).
// (The class used to be called HfInference; it is InferenceClient since v3.)
import { InferenceClient } from '@huggingface/inference';

const hf = new InferenceClient(process.env.HF_TOKEN);

// Chat completion — the server applies the model's chat template for you
const chatResponse = await hf.chatCompletion({
  model: 'Qwen/Qwen3-8B',
  messages: [{ role: 'user', content: 'What is TypeScript?' }],
  max_tokens: 512,
});
```

### Prompt formats (critical — different models need different formats)

```typescript
// Each model family has its own chat template
// Using the wrong format degrades quality significantly

// Llama 3.x format
const llama3Prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a helpful assistant.<|eot_id|>
<|start_header_id|>user<|end_header_id|>
${userMessage}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>`;

// Mistral (older instruct models) format
const mistralPrompt = `<s>[INST] ${systemPrompt}\n\n${userMessage} [/INST]`;

// ChatML format (used by Qwen and many others)
const chatmlPrompt = `<|im_start|>system
${systemPrompt}<|im_end|>
<|im_start|>user
${userMessage}<|im_end|>
<|im_start|>assistant`;

// (gpt-oss uses OpenAI's own "harmony" format.)

// Best practice: use the model's tokenizer apply_chat_template (Python)
// or find the template in the model card and use it exactly
// When using OpenAI-compatible APIs (vLLM/Ollama/HF), the server handles this
// automatically — in practice you rarely hand-write these templates any more.
```

---

## Quantisation — Running Large Models on Less GPU

Quantisation reduces model precision (16-bit → 8-bit or 4-bit), shrinking VRAM requirements dramatically with modest quality loss.

```text
Rule of thumb: memory for weights ≈ parameters × bytes per parameter
(then add 10-30% for the KV cache and runtime overhead)

A 70B model:
  float32 (4 bytes):    ~280GB   — nobody serves at this precision
  bf16/fp16 (2 bytes):  ~140GB   — 2x 80GB GPUs (H100/A100)
  int8/FP8 (1 byte):    ~70GB    — 1x 80GB GPU
  4-bit (0.5 byte):     ~35-40GB — 1x 48GB GPU, 2x 24GB consumer GPUs,
                                   or a 64GB Mac

An 8B model at 4-bit: ~5GB — runs on a laptop.

For most tasks: 8-bit is near-lossless; 4-bit keeps most of the quality,
with bigger losses on maths, code and long reasoning.

Common formats:
  GGUF:  used by llama.cpp and Ollama — runs on CPU+GPU, even on Mac
  AWQ / GPTQ: GPU 4-bit formats, widely supported by vLLM
  FP8:   8-bit floating point, natively fast on H100-class GPUs —
         the common production choice
  MXFP4: 4-bit format some new models ship in natively (e.g. gpt-oss)
  BitsAndBytes: on-the-fly quantisation in Python/Hugging Face
```

```python
# Python — load a 4-bit quantised model with bitsandbytes
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
import torch

quantisation_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",          # NormalFloat4 — better quality than int4
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,     # nested quantisation for extra savings
)

model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen3-8B",
    quantization_config=quantisation_config,
    device_map="auto",                  # auto-distributes across available GPUs
)
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen3-8B")
```

---

## Cloud Hosting for Open Source Models

If you need GPU inference but don't have hardware:

```text
Together AI:
  Hosted inference for Llama, Qwen, DeepSeek, gpt-oss and many others
  OpenAI-compatible API
  Pay per token, much cheaper than closed frontier models

Groq / Cerebras:
  Custom inference hardware — extremely fast (hundreds to 1,000+ tokens/second)
  Good for latency-sensitive features; smaller model catalogue

Fireworks AI:
  Fast inference, function calling support, fine-tuning
  Good option for production traffic

Replicate:
  Run any model with an API — wide model selection
  Pay per second of compute

AWS Bedrock / Google Vertex AI / Azure AI Foundry:
  Managed access to open models (Llama, Mistral, DeepSeek, Qwen, gpt-oss —
  catalogue varies) inside your cloud account — good for existing customers
  and for compliance

Modal / Runpod / Baseten:
  Rent GPU time and deploy your own serving stack (vLLM, SGLang)
  Most control, most setup work
```

```typescript
// Together AI — OpenAI-compatible
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
});

const response = await client.chat.completions.create({
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Groq — also OpenAI-compatible, much faster
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const result = await groq.chat.completions.create({
  model: 'openai/gpt-oss-120b',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// ‼️ Hosted model IDs change and old ones get retired (e.g. Groq's
//    llama-3.1-70b-versatile). Check the provider's model list.
```

---

## Model Selection Guide

```text
Task: simple Q&A, classification, summarisation
  → Qwen 3.5 (2B–9B), Gemma 4 e4b/12B, Granite 4.x 8B
  → Fast, cheap, runs on one small GPU or a laptop

Task: complex reasoning, coding, agent tasks — one GPU
  → gpt-oss-120b, Qwen 3.6/3.8 27B–35B, Gemma 4 31B
  → Solid tool use; still below frontier on hard multi-step tasks

Task: closest to frontier on your own infrastructure
  → DeepSeek V4, GLM-5.x, Kimi K3, Mistral Medium 3.5, Nemotron 3
  → Needs a multi-GPU server (8x H100-class for the largest); often
    cheaper to use them through a hosting provider

Task: multilingual (non-English)
  → Qwen (especially Chinese/Asian languages), Gemma 4

Task: code generation / coding agents
  → GLM-5.x, Kimi, Qwen 3.6/3.8, DeepSeek, gpt-oss

Task: on-device / edge (mobile, browser, laptop)
  → Gemma 4 e2b/e4b, Qwen 3.5 0.8B–4B, Granite 4.x 3B, Phi-4-mini
  → Small enough to run in-browser with WebGPU (WebLLM, Transformers.js)

Decision: open vs closed model
  Open: data privacy required, high volume (cost), want to fine-tune, offline use
  Closed: best quality needed, fast iteration, no ML infrastructure team
```

---

## Common Interview Questions

### "How would you choose between a closed API model and a self-hosted open model?"

> I'd consider four factors: **privacy** (does the data contain PII, PHI, or trade secrets?), **cost** (at what query volume does self-hosted become cheaper than API pricing?), **quality** (does the task need frontier-model reasoning, or is a strong open model like gpt-oss or Qwen enough?), and **engineering capacity** (do we have the team to run and maintain GPU infrastructure?). For most startups starting out: use closed APIs — the iteration speed is worth the cost. As you scale to millions of queries or hit compliance requirements, evaluate the self-hosted path — and note there's a middle ground: closed models through your own cloud account (Bedrock, Vertex, Foundry) often satisfy compliance without running GPUs. The good news: the APIs are increasingly compatible (vLLM is OpenAI-compatible), so switching is more of an infrastructure change than a code change.

### "What is quantisation and why does it matter?"

> Quantisation reduces the numerical precision of model weights — for example from 16-bit floats to 8-bit or 4-bit. Going from 16-bit to 4-bit shrinks memory about 4x with modest quality loss, usually larger on maths and code. A 70B model needs about 140GB in 16-bit — two 80GB GPUs. At 4-bit it needs about 35–40GB, so it fits on one 48GB GPU or a well-specced Mac. That's what makes self-hosting large models practical. Common formats: GGUF (Ollama/llama.cpp), AWQ and GPTQ (vLLM), and FP8, which is the usual production choice on modern NVIDIA GPUs. For the highest-stakes use cases, use 8-bit or full precision, or a closed model.

### "What is vLLM and why use it over just calling the model directly?"

> vLLM is a high-throughput inference server for open source models. The key innovation is PagedAttention — it manages GPU memory the same way an OS manages RAM (paging), which eliminates the wasted memory of the KV cache in naive implementations. The result: 2-4x more requests served per second on the same hardware compared to vanilla HuggingFace. It also supports continuous batching (new requests slot in as old ones finish, rather than waiting for a full batch), tensor parallelism (spreading one model across multiple GPUs), and an OpenAI-compatible API so existing code works without changes. For production: always use vLLM or a similar serving framework (SGLang, TensorRT-LLM) — never call the HuggingFace model directly in a request handler.

### "What's a Mixture-of-Experts model?"

> Instead of one big feed-forward block, each layer has many "expert" blocks and a router that sends each token to only a few of them. So the model can have hundreds of billions of parameters in total but only use a small fraction per token — DeepSeek-V3 has about 671B total and about 37B active. That gives you big-model quality at small-model speed. The catch is memory: every expert must still be loaded, so an MoE model is fast but not small. Most frontier open models in 2025–26 are MoE.
