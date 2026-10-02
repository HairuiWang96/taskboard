# Multimodal & Vision AI

Modern LLMs can process images, audio, and video alongside text. Vision capabilities are increasingly required in AI engineering roles — document processing, UI analysis, screenshot understanding, and image-based Q&A are common features.

> Model names, limits and prices reviewed October 2026 — check the provider docs before
> quoting numbers; they change often.

---

## What Multimodal Means

```text
Modalities:
  Text (all LLMs)
  Images (Claude, GPT, Gemini, and open models like Qwen-VL, Gemma, Llama 4)
  Documents/PDFs (Claude and Gemini natively — text layer + page images;
                  OpenAI via file inputs)
  Audio (OpenAI realtime/audio models, Gemini)
  Video (Gemini natively; others via sampled frames)

"Multimodal" in most job postings means: images + documents + text.
Audio and video are less common in application-layer engineering.
```

---

## Sending Images to Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const client = new Anthropic();

// Helper — with thinking on (the default on current models) the first content
// block can be a thinking block, so never read response.content[0].text blindly
function textOf(response: Anthropic.Message): string {
  return response.content.find(b => b.type === 'text')?.text ?? '';
}

// Method 1: Base64 encoded image (from file)
const imageData = fs.readFileSync('./screenshot.png');
const base64Image = imageData.toString('base64');

const response = await client.messages.create({
  model: 'claude-opus-5',
  max_tokens: 16000,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',  // image/png | image/jpeg | image/gif | image/webp
          data: base64Image,
        },
      },
      {
        type: 'text',
        text: 'What UI issues do you see in this screenshot?',
      },
    ],
  }],
});
console.log(textOf(response));

// Method 2: Image URL (Claude fetches it)
const responseFromUrl = await client.messages.create({
  model: 'claude-opus-5',
  max_tokens: 16000,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'url',
          url: 'https://example.com/diagram.png',
        },
      },
      { type: 'text', text: 'Explain this architecture diagram.' },
    ],
  }],
});

// Method 3: Files API — upload once, reference by file_id in many requests
// (avoids re-sending large images/PDFs every time)
//   const file = await client.files.upload({ file: fs.createReadStream('./diagram.png') });
//   { type: 'image', source: { type: 'file', file_id: file.id } }

// Multiple images in one request
const comparisonResponse = await client.messages.create({
  model: 'claude-opus-5',
  max_tokens: 16000,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Before:' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: beforeImage } },
      { type: 'text', text: 'After:' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: afterImage } },
      { type: 'text', text: 'What changed between these two screenshots?' },
    ],
  }],
});
```

---

## Sending Images to OpenAI

```typescript
import OpenAI from 'openai';

const openai = new OpenAI();

// URL (Chat Completions shown; the newer Responses API takes the same inputs
// as { type: 'input_image', image_url: ... })
const response = await openai.chat.completions.create({
  model: 'gpt-6.1-sol',
  messages: [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: 'https://example.com/chart.png' } },
      { type: 'text', text: 'Summarise the trends shown in this chart.' },
    ],
  }],
});

// Base64
const base64 = Buffer.from(fs.readFileSync('./invoice.jpg')).toString('base64');
const responseBase64 = await openai.chat.completions.create({
  model: 'gpt-6.1-sol',
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64}`,
          detail: 'high',  // 'low' | 'high' | 'auto' — high = more tokens, better for text/detail
        },
      },
      { type: 'text', text: 'Extract all line items from this invoice as JSON.' },
    ],
  }],
});
```

---

## PDF and Document Processing

```typescript
// Claude processes PDFs natively: it reads the text layer AND sees each page
// as an image, so tables, charts and layout are understood too.
// Limits: 32MB per request, up to 600 pages (100 on 200K-context models).

const pdfData = fs.readFileSync('./contract.pdf');
const base64PDF = pdfData.toString('base64');

const response = await client.messages.create({
  model: 'claude-opus-5',
  max_tokens: 16000,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64PDF,
        },
        citations: { enabled: true }, // ‼️ answers cite the exact page/passage
      },
      { type: 'text', text: 'Summarise the key terms and obligations in this contract.' },
    ],
  }],
});

// For high-volume scanned documents, a dedicated OCR service can still be
// cheaper: AWS Textract or Google Document AI first, then send the extracted
// text to the LLM for understanding.
import Textract from '@aws-sdk/client-textract';

const textract = new Textract.TextractClient({ region: 'us-east-1' });

async function extractTextFromPDF(s3Bucket: string, s3Key: string): Promise<string> {
  const command = new Textract.StartDocumentTextDetectionCommand({
    DocumentLocation: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
  });
  const { JobId } = await textract.send(command);

  // Poll for completion (production: use the SNS completion notification instead)
  let result;
  do {
    await new Promise(r => setTimeout(r, 2000));
    result = await textract.send(new Textract.GetDocumentTextDetectionCommand({ JobId }));
  } while (result.JobStatus === 'IN_PROGRESS');

  return result.Blocks
    ?.filter(b => b.BlockType === 'LINE')
    .map(b => b.Text)
    .join('\n') ?? '';
}
```

---

## Common Use Cases and Prompting Patterns

### Structured data extraction from images

```typescript
// Extract invoice data as structured JSON — structured outputs GUARANTEE the
// response matches the schema (constrained decoding).
// (The older trick — one tool + a forced tool_choice — is obsolete, and the
//  newest Claude models reject forced tool_choice.)
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const Invoice = z.object({
  vendor_name: z.string(),
  invoice_number: z.string(),
  invoice_date: z.string(),
  total_amount: z.number(),
  line_items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
    total: z.number(),
  })),
});

async function extractInvoiceData(imageBase64: string) {
  const response = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    output_config: { format: zodOutputFormat(Invoice) },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: 'Extract all invoice data from this image.' },
      ],
    }],
  });

  return response.parsed_output; // typed as z.infer<typeof Invoice>; null if parsing failed
}

// ‼️ The schema guarantees SHAPE, not CORRECTNESS. Still validate business
//    rules: do the line items sum to the total? Is the date real?
```

### UI and screenshot analysis

```typescript
// Accessibility review
async function reviewAccessibility(screenshotBase64: string) {
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 } },
        {
          type: 'text',
          text: `Review this UI screenshot for accessibility issues. Check:
1. Colour contrast (WCAG AA requires 4.5:1 for normal text)
2. Missing alt text indicators
3. Focus indicators
4. Touch target sizes (WCAG 2.2: minimum 24x24 CSS px; 44x44 recommended)
5. Text legibility

List each issue with: element, issue, severity (critical/major/minor), fix.`,
        },
      ],
    }],
  });
  return textOf(response);
}

// ‼️ A screenshot review complements, never replaces, real accessibility
//    testing (axe, keyboard and screen-reader checks) — a model can't see
//    the DOM, ARIA attributes or focus order from pixels.

// Visual regression testing
async function compareScreenshots(before: string, after: string) {
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Before:' },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: before } },
        { type: 'text', text: 'After:' },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: after } },
        { type: 'text', text: 'List every visual difference between these screenshots. Be specific about location and what changed.' },
      ],
    }],
  });
  return textOf(response);
}
```

### Chart and data visualisation understanding

```typescript
async function analyseChart(chartImageBase64: string, question: string) {
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: chartImageBase64 } },
        { type: 'text', text: question },
      ],
    }],
  });
  return textOf(response);
}

// Example: "What is the trend in Q3? What are the top 3 categories by value?"
// ‼️ Models read approximate values off charts — if exact numbers matter,
//    get the underlying data instead of OCR'ing the picture.
```

---

## Image Limits and Cost

```text
Claude (check current docs — limits change):
  Max image size: 8000 x 8000 px (smaller limit when sending many images)
  Max 5MB per image via the API; many images per request (up to 100)
  Images larger than ~1568px on the long edge are downscaled first —
    sending bigger images just adds latency
  Token cost ≈ (width × height) / 750 → a ~1000x800 screenshot ≈ 1,000-1,600
    tokens. At Claude Opus 5 input pricing ($5 / 1M) that's under a cent.

OpenAI:
  detail: 'low'  — small fixed token cost, fast, good for simple images
  detail: 'high' — tiles the image; cost grows with resolution
  (Exact per-tile token counts differ by model — see OpenAI's vision docs)

Best practices:
  - Resize images before sending — you rarely need full resolution
  - 800-1000px wide is usually sufficient for UI/document analysis
  - Use 'low' detail (OpenAI) when you only need general understanding
  - Upload once with the Files API and cache the prompt prefix when the same
    image/document is used in many requests
  - If a PDF has a text layer and you only need the text, extract it locally
    — free, and no vision tokens
```

---

## Image Embeddings and Visual Search

```typescript
// For visual search / image similarity — not the same as vision LLMs.
// You need a MULTIMODAL EMBEDDING model: images and text mapped into the same
// vector space, so "a photo of a dog" lands near pictures of dogs.

// Hosted options: Voyage multimodal embeddings, Cohere Embed (v4+),
// Google's Gemini/Vertex multimodal embeddings. (OpenAI's embedding API is
// text-only.)
// Open models: SigLIP 2 / OpenCLIP (CLIP's successors — CLIP itself is the
// classic baseline, now outperformed).

// TypeScript via Hugging Face Inference Providers
// (the class was renamed from HfInference to InferenceClient in v3)
import { InferenceClient } from '@huggingface/inference';

const hf = new InferenceClient(process.env.HF_TOKEN);

// Text embedding in the shared image-text space
const textEmbedding = await hf.featureExtraction({
  model: 'google/siglip2-base-patch16-224',
  inputs: 'a photo of a dog',
});

// Image embeddings are usually computed server-side in Python
// (transformers AutoModel + AutoProcessor for the same model), stored in a
// vector database, and searched with cosine similarity.
// This is how text-to-image search (Google Images, Pinterest) works.
```

---

## Common Interview Questions

### "How would you build an invoice processing system using vision AI?"

> I'd design a pipeline with three stages. **Stage 1: document ingestion** — accept PDF, PNG, or JPEG. Digital PDFs and clear images go straight to a vision model, which reads PDFs natively (text layer plus page images). For very high volumes of scanned forms, a dedicated OCR service like Textract can be cheaper as a first pass. **Stage 2: extraction** — use Claude or GPT with structured outputs, so the response is guaranteed to match the invoice schema: vendor, invoice number, date, line items, totals. Turn on citations or ask for the source location of each field so reviewers can check it quickly. **Stage 3: validation and review** — validate extracted data against business rules (line items sum to the total, required fields present, date is valid). Anything that fails validation goes to a human review queue, and corrections become test cases for an eval set. Cost optimisation: if a PDF has a selectable text layer and a simple layout, extract the text locally and skip vision entirely.

### "When would you use vision AI vs traditional OCR?"

> Traditional OCR (Tesseract, AWS Textract) is better when: the document has a consistent, known structure (forms, standard invoices), you need very high throughput at the lowest cost, or you need exact character recognition for serial numbers or codes. Vision LLMs are better when: the structure varies widely, you need semantic understanding rather than just text, the layout is complex (mixed tables and prose), you need to understand charts or diagrams, or you need to answer questions about the content. The gap has narrowed — current vision models read documents very well and are cheap per page — so many teams now start with a vision LLM and add OCR only where volume or exactness demands it.

### "What are the token cost implications of using vision?"

> Images consume tokens roughly in proportion to their pixel count. A typical screenshot (~1000x800px) is around 1,000–1,600 tokens with Claude — about the same as a page of text — so under a cent each at current prices. For a system processing 10,000 images per day that adds up to tens of dollars a day in input tokens before any output. Optimisations: resize to the minimum resolution needed (images beyond ~1,568px get downscaled anyway), use low-detail mode on OpenAI for simple tasks, upload once with a files API and use prompt caching when the same document is queried repeatedly, cache extracted results so you never reprocess the same document, and skip vision entirely when the PDF already has a text layer.
