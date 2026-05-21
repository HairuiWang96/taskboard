# Open Source & Self-Hosted LLMs

Many companies — especially in finance, healthcare, legal, and enterprise — cannot send data to OpenAI or Anthropic due to privacy, compliance, or cost reasons. They run open source models locally or in their own cloud. Knowing both the API side and the self-hosted side is a clear differentiator in AI engineering interviews.

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
  - Generally lower quality than frontier models (Claude, GPT-4o)
  - Engineering cost to set up and maintain
  - Keeping up with fast-moving open source releases
```

---

## Key Open Source Models

```text
Meta Llama 3.x (most popular family):
  Llama 3.1 8B   — fast, cheap, good for simple tasks
  Llama 3.1 70B  — strong general model, competes with GPT-3.5/Claude Haiku
  Llama 3.1 405B — frontier-class, needs serious GPU infrastructure
  Llama 3.2 11B/90B — multimodal (vision support)
  License: Meta Community License (mostly permissive for commercial use)

Mistral / Mixtral:
  Mistral 7B     — excellent for its size, very fast
  Mixtral 8x7B   — Mixture of Experts architecture, 2 of 8 experts active per token
  Mistral Large  — closed API but strong performance
  License: Apache 2.0 (fully open, commercial use allowed)

Google Gemma:
  Gemma 2B / 7B / 27B — lightweight models designed for edge/mobile
  License: Gemma license (permissive)

Microsoft Phi-3 / Phi-4:
  Small models (3.8B, 14B) with strong reasoning per parameter
  Good for constrained environments
  License: MIT

Qwen (Alibaba):
  Strong multilingual performance — especially for Chinese + English tasks
  Qwen 2.5: 0.5B to 72B range
  Good choice if you need non-English language support

Code models:
  CodeLlama — Meta, based on Llama, fine-tuned on code
  DeepSeek Coder — strong coding performance, open weights
  Starcoder2 — BigCode collaboration, trained on permissive-licensed code
```

---

## Ollama — Running Models Locally

Ollama is the easiest way to run models on your laptop or dev machine.

```bash
# Install (Mac)
brew install ollama

# Pull and run a model
ollama pull llama3.1
ollama run llama3.1

# Pull smaller/faster model
ollama pull llama3.2:3b
ollama pull mistral

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
  model: 'llama3.1',
  messages: [{ role: 'user', content: 'Explain closures in JavaScript' }],
  temperature: 0.7,
});

console.log(response.choices[0].message.content);
```

### Using Ollama with LangChain

```typescript
import { Ollama } from '@langchain/ollama';

const model = new Ollama({
  model: 'llama3.1',
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

```bash
# Install
pip install vllm

# Serve a model (starts HTTP server on port 8000)
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --dtype auto \
  --api-key token-abc123

# Multi-GPU (for large models like 70B)
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.1-70B-Instruct \
  --tensor-parallel-size 4 \  # split across 4 GPUs
  --dtype auto
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
  model: 'meta-llama/Llama-3.1-8B-Instruct',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 512,
  temperature: 0.7,
});
```

### vLLM in Docker (production deployment)

```dockerfile
FROM vllm/vllm-openai:latest

ENV MODEL_NAME=meta-llama/Llama-3.1-8B-Instruct
ENV HF_TOKEN=your_huggingface_token

CMD ["--model", "${MODEL_NAME}", "--dtype", "auto", "--max-model-len", "8192"]
```

---

## Hugging Face Hub — Model Repository

Hugging Face is the GitHub of ML models. Most open source models are published here.

```typescript
// Using Hugging Face Inference API (hosted, no GPU needed)
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);

// Text generation
const response = await hf.textGeneration({
  model: 'mistralai/Mistral-7B-Instruct-v0.2',
  inputs: '<s>[INST] Explain React Server Components [/INST]',
  parameters: {
    max_new_tokens: 512,
    temperature: 0.7,
    return_full_text: false,
  },
});

// Chat completion (newer models)
const chatResponse = await hf.chatCompletion({
  model: 'meta-llama/Llama-3.1-8B-Instruct',
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

// Mistral format
const mistralPrompt = `<s>[INST] ${systemPrompt}\n\n${userMessage} [/INST]`;

// ChatML format (used by many models)
const chatmlPrompt = `<|im_start|>system
${systemPrompt}<|im_end|>
<|im_start|>user
${userMessage}<|im_end|>
<|im_start|>assistant`;

// Best practice: use the model's tokenizer apply_chat_template (Python)
// or find the template in the model card and use it exactly
// When using OpenAI-compatible APIs (vLLM/Ollama), the server handles this automatically
```

---

## Quantisation — Running Large Models on Less GPU

Quantisation reduces model precision (float32 → int4/int8), shrinking VRAM requirements dramatically with modest quality loss.

```text
Full precision (float32):  Llama 70B needs ~140GB VRAM (4x A100s)
Half precision (float16):  ~70GB VRAM (2x A100s)
8-bit quantisation (int8): ~35GB VRAM (1x A100)
4-bit quantisation (int4): ~18GB VRAM (1x A100 or RTX 4090)

For most tasks: 4-bit quality ≈ 95% of full precision quality

Common formats:
  GGUF:  used by llama.cpp and Ollama — runs on CPU+GPU, even on Mac
  GPTQ:  GPU-only, fast inference, good quality
  AWQ:   newer, often better quality than GPTQ at same size
  BitsAndBytes: dynamic quantisation in Python/HuggingFace
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
    "meta-llama/Llama-3.1-8B-Instruct",
    quantization_config=quantisation_config,
    device_map="auto",                  # auto-distributes across available GPUs
)
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
```

---

## Cloud Hosting for Open Source Models

If you need GPU inference but don't have hardware:

```text
Together AI:
  Hosted inference for Llama, Mistral, Qwen, and many others
  OpenAI-compatible API
  Pay per token, cheaper than OpenAI for equivalent quality tiers

Groq:
  Custom LPU (Language Processing Unit) hardware — extremely fast inference
  100-300 tokens/second (vs 30-60 for GPU-based services)
  Free tier available, supports Llama 3.1/3.3 and Mixtral

Fireworks AI:
  Fast inference, function calling support, good Llama support
  Good option for production traffic

Replicate:
  Run any model with an API — wide model selection
  Pay per second of compute

AWS Bedrock:
  Managed access to Llama, Mistral, and others on AWS infrastructure
  Stays within your AWS account — good for existing AWS customers

Modal / Runpod:
  Rent raw GPU time and deploy your own serving stack (vLLM)
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
  model: 'meta-llama/Llama-3.1-70B-Instruct-Turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Groq — also OpenAI-compatible, much faster
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const result = await groq.chat.completions.create({
  model: 'llama-3.1-70b-versatile',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

---

## Model Selection Guide

```text
Task: simple Q&A, classification, summarisation
  → Llama 3.2 3B (Ollama) or Mistral 7B
  → Fast, cheap, good enough

Task: complex reasoning, coding, agent tasks
  → Llama 3.1 70B or Mixtral 8x22B
  → Quality close to GPT-3.5/Claude Haiku

Task: frontier quality on self-hosted infrastructure
  → Llama 3.1 405B
  → Needs 4-8 high-end GPUs, significant infrastructure

Task: multilingual (non-English)
  → Qwen 2.5 72B
  → Strongest multilingual open model

Task: code generation
  → DeepSeek Coder V2, CodeLlama, Qwen2.5-Coder
  → Fine-tuned specifically for code

Task: on-device / edge (mobile, browser, laptop)
  → Phi-3 Mini (3.8B), Llama 3.2 1B/3B, Gemma 2B
  → Small enough to run in-browser with WASM (WebLLM)

Decision: open vs closed model
  Open: data privacy required, high volume (cost), want to fine-tune, offline use
  Closed: best quality needed, fast iteration, no ML infrastructure team
```

---

## Common Interview Questions

### "How would you choose between a closed API model and a self-hosted open model?"

> I'd consider four factors: **privacy** (does the data contain PII, PHI, or trade secrets?), **cost** (at what query volume does self-hosted become cheaper than API pricing?), **quality** (does the task require frontier-model reasoning, or is a 70B model sufficient?), and **engineering capacity** (do we have the infrastructure team to run and maintain GPU infrastructure?). For most startups starting out: use closed APIs — the iteration speed is worth the cost. As you scale to millions of queries or hit compliance requirements, evaluate the self-hosted path. The good news: the APIs are increasingly compatible (vLLM is OpenAI-compatible), so switching is more of an infrastructure change than a code change.

### "What is quantisation and why does it matter?"

> Quantisation reduces the numerical precision of model weights — for example from 16-bit floats to 4-bit integers. This shrinks the model's memory footprint by 4x with modest quality loss (typically 3-5% on benchmarks). A 70B parameter model at full precision needs ~140GB of GPU VRAM — impractical for most teams. At 4-bit, it fits in ~18GB — a single consumer GPU or one A100. Quantisation makes self-hosted large models practical. Common formats: GGUF (used by Ollama, runs on CPU+GPU), GPTQ, AWQ. The quality loss is acceptable for most production tasks; for the highest-stakes use cases, use full precision or a closed model.

### "What is vLLM and why use it over just calling the model directly?"

> vLLM is a high-throughput inference server for open source models. The key innovation is PagedAttention — it manages GPU memory the same way an OS manages RAM (paging), which eliminates the wasted memory of the KV cache in naive implementations. The result: 2-4x more requests served per second on the same hardware compared to vanilla HuggingFace. It also supports continuous batching (new requests slot in as old ones finish, rather than waiting for a full batch), tensor parallelism (spreading one model across multiple GPUs), and an OpenAI-compatible API so existing code works without changes. For production: always use vLLM or a similar serving framework — never call the HuggingFace model directly in a request handler.
