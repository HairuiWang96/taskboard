# Multimodal & Vision AI

Modern LLMs can process images, audio, and video alongside text. Vision capabilities are increasingly required in AI engineering roles — document processing, UI analysis, screenshot understanding, and image-based Q&A are common features.

---

## What Multimodal Means

```text
Modalities:
  Text (all LLMs)
  Images (Claude, GPT-4o, Gemini, Llama 3.2)
  Audio (GPT-4o Audio, Gemini)
  Video (Gemini 1.5 Pro, GPT-4o)
  Documents/PDFs (Claude, GPT-4o with vision)

"Multimodal" in most job postings means: images + text.
Audio and video are less common in application-layer engineering.
```

---

## Sending Images to Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const client = new Anthropic();

// Method 1: Base64 encoded image (from file)
const imageData = fs.readFileSync('./screenshot.png');
const base64Image = imageData.toString('base64');

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
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

// Method 2: Image URL (Claude fetches it)
const responseFromUrl = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
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

// Multiple images in one request
const comparisonResponse = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: beforeImage } },
      { type: 'text', text: 'Before:' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: afterImage } },
      { type: 'text', text: 'After: What changed between these two screenshots?' },
    ],
  }],
});
```

---

## Sending Images to OpenAI

```typescript
import OpenAI from 'openai';

const openai = new OpenAI();

// URL
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: 'https://example.com/chart.png' } },
      { type: 'text', text: 'Summarise the trends shown in this chart.' },
    ],
  }],
  max_tokens: 1024,
});

// Base64
const base64 = Buffer.from(fs.readFileSync('./invoice.jpg')).toString('base64');
const responseBase64 = await openai.chat.completions.create({
  model: 'gpt-4o',
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
// Claude can process PDFs natively — treat each page as an image
// Or use a dedicated document AI service for better OCR on scanned docs

// Claude — PDF via base64
const pdfData = fs.readFileSync('./contract.pdf');
const base64PDF = pdfData.toString('base64');

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
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
      },
      { type: 'text', text: 'Summarise the key terms and obligations in this contract.' },
    ],
  }],
});

// For scanned PDFs / images of documents: use AWS Textract or Google Document AI first
// Then send the extracted text to Claude for understanding
import Textract from '@aws-sdk/client-textract';

const textract = new Textract.TextractClient({ region: 'us-east-1' });

async function extractTextFromPDF(s3Bucket: string, s3Key: string): Promise<string> {
  const command = new Textract.StartDocumentTextDetectionCommand({
    DocumentLocation: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
  });
  const { JobId } = await textract.send(command);

  // Poll for completion
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
// Extract invoice data as structured JSON
async function extractInvoiceData(imageBase64: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [{
      name: 'extract_invoice',
      description: 'Extract structured invoice data',
      input_schema: {
        type: 'object',
        properties: {
          vendor_name: { type: 'string' },
          invoice_number: { type: 'string' },
          invoice_date: { type: 'string' },
          total_amount: { type: 'number' },
          line_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unit_price: { type: 'number' },
                total: { type: 'number' },
              },
            },
          },
        },
        required: ['vendor_name', 'invoice_number', 'total_amount'],
      },
    }],
    tool_choice: { type: 'tool', name: 'extract_invoice' },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: 'Extract all invoice data from this image.' },
      ],
    }],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  return toolUse?.input;
}
```

### UI and screenshot analysis

```typescript
// Accessibility review
async function reviewAccessibility(screenshotBase64: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
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
4. Touch target sizes (minimum 44x44px)
5. Text legibility

Return a JSON array of issues with: element, issue, severity (critical/major/minor), fix.`,
        },
      ],
    }],
  });
  return response.content[0].text;
}

// Visual regression testing
async function compareScreenshots(before: string, after: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
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
  return response.content[0].text;
}
```

### Chart and data visualisation understanding

```typescript
async function analyseChart(chartImageBase64: string, question: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: chartImageBase64 } },
        { type: 'text', text: question },
      ],
    }],
  });
  return response.content[0].text;
}

// Example: "What is the trend in Q3? What are the top 3 categories by value?"
```

---

## Image Limits and Cost

```text
Claude:
  Max image size: 8000 x 8000 pixels, 5MB per image
  Max images per request: 20
  Token cost: 1568 tokens for a typical screenshot (~1000x800px)
  At Claude Sonnet pricing: ~$0.005 per image
  
  Detail levels: Claude automatically determines detail level

OpenAI (GPT-4o):
  detail: 'low'  — 85 tokens fixed, fast, good for simple images
  detail: 'high' — tiles the image into 512x512 chunks, ~170 tokens per tile
  512x512 image at high detail: ~255 tokens
  1024x1024 image at high detail: ~765 tokens

Best practices:
  - Resize images before sending — you rarely need full resolution
  - 800-1000px wide is usually sufficient for UI/document analysis
  - Use 'low' detail when you only need general understanding
  - Batch multiple small images into one request if possible
```

---

## Image Embeddings and Visual Search

```typescript
// For visual search / image similarity — not the same as vision LLMs
// Use CLIP-based models for embedding images into vector space

// OpenAI doesn't offer image embeddings via API
// Use Hugging Face CLIP models or OpenCLIP

// Python (usually done server-side)
// from transformers import CLIPModel, CLIPProcessor
// model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")

// TypeScript via Hugging Face Inference API
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);

// Get image embedding (for similarity search)
const embedding = await hf.featureExtraction({
  model: 'openai/clip-vit-base-patch32',
  inputs: imageBase64,
});

// Get text embedding with CLIP (same space as image embeddings)
const textEmbedding = await hf.featureExtraction({
  model: 'openai/clip-vit-base-patch32',
  inputs: 'a photo of a dog',
});

// Use cosine similarity to find images matching a text description
// This is how image search (Google Images, Pinterest) works
```

---

## Common Interview Questions

### "How would you build an invoice processing system using vision AI?"

> I'd design a pipeline with three stages. **Stage 1: document ingestion** — accept PDF, PNG, or JPEG. For scanned documents with poor quality, run through AWS Textract first to get OCR'd text. For digital PDFs and clear images, send directly to a vision LLM. **Stage 2: extraction** — use Claude or GPT-4o with structured output (tool use / JSON schema) to extract fields: vendor, invoice number, date, line items, totals. The schema enforces the output format. Confidence scoring — ask the model to rate each field's confidence. **Stage 3: validation and review** — validate extracted data against business rules (amounts sum correctly, required fields present, date is valid). Low-confidence fields go to a human review queue. Corrections flow back to improve future extractions. Cost optimisation: route simple machine-generated PDFs to a text extraction path (no vision needed, much cheaper), only use vision for scanned/complex documents.

### "When would you use vision AI vs traditional OCR?"

> Traditional OCR (Tesseract, AWS Textract) is better when: the document has a consistent, known structure (forms, standard invoices), you need high throughput at low cost, or you need very precise character recognition for serial numbers or codes. Vision AI is better when: the document structure varies widely, you need semantic understanding (not just text extraction), the document has complex layouts (mixed tables and prose), you need to understand charts or diagrams, or you need to answer questions about the content. In practice: use Textract for volume processing of structured documents, and vision LLMs for edge cases, unstructured documents, and semantic understanding tasks. The cost difference is significant — Textract costs ~$0.0015 per page vs ~$0.005+ for a vision LLM call.

### "What are the token cost implications of using vision?"

> Images consume significant tokens. A typical screenshot (~1000x800px) costs around 1500-1600 tokens with Claude — equivalent to about 1200 words of text. At Claude Sonnet pricing, that's roughly $0.005 per image in input costs. For a system processing 10,000 images per day, that's $50/day just in input image tokens, before any output. Optimisations: resize images to the minimum resolution needed (800px wide is usually enough for documents), use 'low' detail mode in GPT-4o for simple tasks (85 tokens vs 500+), cache extracted results so you don't reprocess the same document, and consider whether the task actually needs vision — if the PDF has selectable text, extracting the text layer is free.
