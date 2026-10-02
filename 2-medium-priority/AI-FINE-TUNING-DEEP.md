# Fine-Tuning LLMs for Engineers

Fine-tuning adapts a pre-trained model to a specific task or style by continuing to train it on your own data. This is different from prompt engineering (no training) and RAG (no training, just retrieval). As an AI engineer, you rarely train from scratch — you fine-tune existing open source models.

> Libraries and APIs reviewed October 2026. Frontier models have become good enough at
> following instructions that fine-tuning is needed less often than in 2023–24 — but it's
> still the tool for making a small, cheap model excellent at one narrow task.

---

## When to Fine-Tune (and When Not To)

```text
DO fine-tune when:
  - You need a specific output format the base model doesn't consistently follow
  - You have a specialised domain with terminology the model handles poorly
  - You need the model to adopt a specific style or persona consistently
  - You want to make a smaller model perform like a larger one on your specific task
  - Prompt engineering has hit its ceiling and you have enough labelled data (500+)
  - Cost at scale: a fine-tuned small model (4-14B) can match a prompted frontier
    model on ONE narrow task at a fraction of the cost and latency

DO NOT fine-tune when:
  - Prompt engineering can achieve the goal (try this first — always)
  - You have fewer than 100-500 examples (overfitting risk)
  - The knowledge changes frequently (use RAG instead)
  - You need factual accuracy about the world (fine-tuning doesn't reliably add facts)
  - You're still iterating on the task definition (fine-tuning locks in assumptions)

The common mistake:
  Engineers jump to fine-tuning too early.
  Spend 1 week on prompt engineering before considering fine-tuning.
  Fine-tuning is powerful but adds infrastructure complexity and maintenance cost.
```

---

## Types of Fine-Tuning

```text
Full fine-tuning:
  Update all model weights on your dataset.
  Best quality, but requires significant GPU memory (same as training).
  A 7B model at bf16 needs ~14GB VRAM just to load, and 100GB+ for full training
  (gradients + Adam optimizer states add ~12-16 bytes per parameter).
  Not practical for most teams without serious infrastructure.

LoRA (Low-Rank Adaptation) — the standard approach:
  Instead of updating all weights, add small "adapter" layers alongside the original.
  These adapters have far fewer parameters (0.1-1% of total).
  Train only the adapters — freeze the original model weights.
  Result: 70-90% of full fine-tuning quality at 10-30% of the VRAM cost.
  Merge adapters back into base model for deployment (or use separately).

QLoRA (Quantised LoRA) — the practical approach:
  Load the base model in 4-bit quantisation (saves 75% VRAM) + LoRA adapters.
  Fine-tune a 7-14B model on a single consumer GPU (24GB VRAM).
  Fine-tune a ~70B model on a single 80GB GPU (A100/H100).
  Very slight quality reduction vs full LoRA — usually acceptable.
  This is what most teams use in practice.

PEFT (Parameter-Efficient Fine-Tuning):
  Umbrella term for LoRA, QLoRA, and similar methods.
  HuggingFace PEFT library implements them all.

Tooling most teams actually use:
  Hugging Face TRL + PEFT — the reference stack (example below)
  Unsloth — faster, lower-memory LoRA/QLoRA training; popular on one GPU
  Axolotl / LLaMA-Factory — config-file driven training, many models
  Managed: Together, Fireworks, OpenAI, Google Vertex, AWS Bedrock/SageMaker
```

### Beyond supervised fine-tuning (SFT)

```text
SFT (everything above): show the model input → ideal output pairs.

Preference tuning (DPO and variants):
  Show the model PAIRS of responses — chosen vs rejected — and train it to
  prefer the better one. Good for tone, helpfulness, "don't do X" behaviour
  that's hard to express as a single ideal answer.

Reinforcement fine-tuning (GRPO, OpenAI RFT):
  The model generates answers, a GRADER scores them (unit tests, exact
  match, a rubric, an LLM judge), and training pushes toward higher scores.
  This is how 2025-era "reasoning" models were trained. Works when you can
  check answers automatically but can't easily write ideal ones.

Distillation:
  Generate outputs from a big model, fine-tune a small model to imitate
  them. The most common real-world use of fine-tuning today: frontier-model
  quality on one task at small-model cost. (Check the big model's terms of
  service — some forbid training competing models on their outputs.)
```

---

## Fine-Tuning with QLoRA (Practical Example)

```python
# Environment setup
# pip install transformers peft bitsandbytes trl datasets accelerate

from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset
import torch

# Step 1: Load base model in 4-bit (QLoRA)
# (Qwen3-8B used as a stable example ID — pick a current model for real work)
model_name = "Qwen/Qwen3-8B"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Step 2: Configure LoRA adapters
lora_config = LoraConfig(
    r=16,           # rank — higher = more parameters = better quality but more memory
    lora_alpha=32,  # scaling factor — typically 2x rank
    target_modules="all-linear",  # adapt every linear layer — the usual default now
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# Output: trainable params: 41,943,040 || all params: 8,072,212,480 || trainable%: 0.52

# Step 3: Prepare dataset
# Use the conversational "messages" format — TRL applies the model's own chat
# template for you. ‼️ Hand-writing template strings (<|start_header_id|>...)
# is the classic bug: one wrong token and quality quietly drops.
#   train.jsonl lines: {"messages": [{"role": "system", ...}, {"role": "user", ...},
#                                    {"role": "assistant", ...}]}
dataset = load_dataset("json", data_files="train.jsonl", split="train")
split = dataset.train_test_split(test_size=0.1, seed=42)  # keep a validation set

# Step 4: Train
trainer = SFTTrainer(
    model=model,
    processing_class=tokenizer,
    train_dataset=split["train"],
    eval_dataset=split["test"],
    args=SFTConfig(
        output_dir="./fine-tuned-model",
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,   # effective batch size = 4 * 4 = 16
        learning_rate=2e-4,
        bf16=True,                       # match bnb_4bit_compute_dtype
        logging_steps=50,
        eval_strategy="epoch",           # watch validation loss for overfitting
        save_strategy="epoch",
        warmup_ratio=0.05,
        lr_scheduler_type="cosine",
        max_length=2048,                 # was max_seq_length in older TRL versions
        # assistant_only_loss=True trains only on assistant turns — needs a chat
        # template that marks them; check your model before enabling it
    ),
)

trainer.train()
trainer.save_model("./fine-tuned-model")
```

---

## Data Preparation — The Most Important Part

Fine-tuning quality is almost entirely determined by data quality, not hyperparameters.

```text
How much data do you need?
  Minimum: 100-500 examples for style/format adaptation
  Good:    1,000-5,000 examples for task fine-tuning
  Strong:  10,000+ examples for domain adaptation
  
  Quality >> quantity. 500 great examples beats 5,000 mediocre ones.

Data quality checklist:
  [ ] Every example is a good model response you'd be happy to ship
  [ ] Examples cover the full range of inputs the model will see in production
  [ ] No duplicates or near-duplicates
  [ ] Consistent format and style across all examples
  [ ] Edge cases and hard examples are represented
  [ ] Verified by domain experts for accuracy (not just grammatically OK)

Generating training data with a stronger model (synthetic data):
  Use a frontier model (Claude Opus, GPT) to generate training examples for a smaller model.
  "Here are 5 examples of ideal customer support responses.
   Generate 50 more examples in the same style for these customer questions: ..."
  
  Always review synthetic data — models repeat biases and errors.
  Use synthetic data to augment, not replace, human-curated examples.
```

```python
# Training data format examples

# Format 1: Simple instruction-response (for text completion models)
{"text": "Classify this as spam or not spam: 'You won $1M!' -> Spam"}
{"text": "Classify this as spam or not spam: 'Meeting at 3pm tomorrow' -> Not spam"}

# Format 2: Chat format (for instruction-tuned models)
{"messages": [
    {"role": "system", "content": "You are a concise code reviewer."},
    {"role": "user", "content": "Review this function: def add(a, b): return a + b + 1"},
    {"role": "assistant", "content": "Bug: off-by-one error. Should be `return a + b`."}
]}

# Format 3: Alpaca format (common open source format)
{
    "instruction": "Summarise this support ticket in one sentence.",
    "input": "I can't log in. I've tried resetting my password three times...",
    "output": "User is locked out despite multiple password reset attempts."
}
```

---

## Fine-Tuning via Cloud APIs (No GPU Needed)

### OpenAI fine-tuning

```typescript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI();

// Step 1: Upload training file
const file = await openai.files.create({
  file: fs.createReadStream('./train.jsonl'),
  purpose: 'fine-tune',
});

// Step 2: Create fine-tuning job
// ‼️ Only some models can be fine-tuned, and the list changes — check OpenAI's
//    fine-tuning docs for the current ones (older gpt-3.5 / gpt-4o-mini jobs
//    are what most tutorials show).
const job = await openai.fineTuning.jobs.create({
  training_file: file.id,
  model: FINE_TUNABLE_MODEL,
  method: {
    type: 'supervised',   // also 'dpo' (preference pairs) and 'reinforcement' (graders)
    supervised: {
      hyperparameters: { n_epochs: 3, batch_size: 'auto', learning_rate_multiplier: 'auto' },
    },
  },
});

console.log(`Fine-tune job: ${job.id}, status: ${job.status}`);

// Step 3: Monitor
const status = await openai.fineTuning.jobs.retrieve(job.id);

// Step 4: Use the fine-tuned model
const response = await openai.chat.completions.create({
  model: status.fine_tuned_model!, // e.g. 'ft:<base-model>:my-org:custom-model:abc123'
  messages: [{ role: 'user', content: 'Classify this support ticket...' }],
});
```

Training data format for OpenAI:
```jsonl
{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```

### Together AI fine-tuning (open source models)

```typescript
// Together AI lets you fine-tune open models (Llama, Qwen, Mistral, and others)
// via API — no GPU infrastructure needed. Check their list for supported IDs.

import Together from 'together-ai';

const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

// Upload file
const file = await together.files.upload({
  file: fs.createReadStream('./train.jsonl'),
  purpose: 'fine-tune',
});

// Create fine-tune job
const job = await together.fineTuning.create({
  training_file: file.id,
  model: 'Qwen/Qwen3-8B',
  n_epochs: 3,
  lora: true,
  suffix: 'my-custom-model',
});

// Use the fine-tuned model via Together's inference API
const response = await together.chat.completions.create({
  model: job.output_name,
  messages: [{ role: 'user', content: 'Hello' }],
});
```

---

## Evaluating Fine-Tuned Models

```text
Before fine-tuning:
  Establish a baseline — run your eval set on the base model + current best prompt.
  Record: accuracy, format compliance, quality score.

After fine-tuning:
  Run the same eval set. Compare to baseline.
  Check:
  - Task accuracy improved?
  - Format compliance improved?
  - Did general capability regress? (catastrophic forgetting)

Watch for catastrophic forgetting:
  Fine-tuning on a narrow dataset can degrade performance on general tasks.
  Include general examples in your training set to mitigate.
  Evaluate on general tasks (commonsense, instruction following) alongside your task.

Overfitting signals:
  Training loss decreases but validation loss increases after epoch 2-3.
  Model starts reproducing training examples verbatim.
  Fix: reduce epochs, add data diversity, increase dropout.
```

---

## LoRA Hyperparameters Reference

```text
r (rank): 4–64
  Low (4-8):   fewer parameters, faster training, less expressive
  High (16-64): more parameters, slower, can adapt more complex behaviours
  Start with r=16, increase if quality is insufficient

lora_alpha: typically 2x rank (alpha=32 for r=16)
  Controls the scaling of the LoRA updates.
  Keep alpha/r ratio consistent when changing r.

target_modules: which layers to apply LoRA to
  Minimal: ["q_proj", "v_proj"] — attention query and value
  Comprehensive: "all-linear" — all attention + MLP layers (better quality;
  the common default today)

lora_dropout: 0.05–0.1
  Regularisation. Higher for small datasets.

Learning rate: 1e-4 to 3e-4 for QLoRA (lower than full fine-tuning)

Epochs: 1-5
  More epochs = more overfitting risk on small datasets
  Watch validation loss — stop when it starts increasing
```

---

## Common Interview Questions

### "When would you fine-tune a model vs use RAG vs prompt engineering?"

> Prompt engineering first — always. It's fastest to iterate and costs nothing to change. If the model has the knowledge but isn't using it correctly (wrong format, wrong tone, not following specific rules), prompt engineering can usually fix it. RAG when the model lacks specific knowledge that changes over time or is too large for context (documentation, proprietary data, recent events). Fine-tuning when you need the model to behave differently — specific output format it can't consistently follow with prompting, domain-specific reasoning, or style adaptation. Fine-tuning doesn't reliably add facts; it teaches behaviour patterns. In practice: most production AI features use RAG + prompting. Fine-tuning is for when you've exhausted the other approaches and have 500+ quality training examples.

### "What is LoRA and why is it preferred over full fine-tuning?"

> LoRA (Low-Rank Adaptation) adds small trainable "adapter" matrices alongside the frozen original model weights. Instead of updating all 7 billion parameters of a 7B model, you only train a small fraction (~0.5%) in these adapter layers. The insight: the weight updates needed for task adaptation have low intrinsic rank — they can be well approximated by low-rank matrices. Benefits: 10-30% of the VRAM of full fine-tuning, fast to train, easy to swap (the base model stays fixed, you just swap adapters), and avoids catastrophic forgetting of general capabilities. QLoRA adds 4-bit quantisation to the base model, making it possible to fine-tune a 7–14B model on a single consumer GPU (24GB VRAM), or a 70B model on one 80GB GPU.

### "How do you prepare training data for fine-tuning?"

> Data quality is the dominant factor — better data beats more data. The process: start by collecting real examples from your production logs (user queries + ideal responses). If you don't have enough, use a strong model (Claude Opus, GPT) to generate synthetic examples, but always review them. Clean the data: remove duplicates, fix inconsistencies, ensure every example is something you'd be happy to ship. Format to the model's expected chat template. Split 80/10/10 into train/validation/test — never evaluate on training data. Aim for 1000+ diverse examples covering the full input distribution. Common mistake: generating lots of similar examples. Diversity across topics, difficulty levels, and edge cases matters more than volume.
