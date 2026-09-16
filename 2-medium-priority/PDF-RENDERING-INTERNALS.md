# PDF Rendering & Generation — Internals, Architecture, Libraries

**Priority: MEDIUM**

> What a PDF actually is at the byte level, how browsers render one, how to generate one on a
> backend, where PDF work belongs in your architecture, and which library to reach for.
>
> Covers both halves of the problem: displaying PDFs (frontend) and producing them (backend).

---

## Table of Contents

1. [What a PDF Actually Is](#1-what-a-pdf-actually-is)
2. [Inside the File Format](#2-inside-the-file-format)
3. [Why PDFs Are Harder Than They Look](#3-why-pdfs-are-harder-than-they-look)
4. [The Two Problems: Rendering vs Generating](#4-the-two-problems-rendering-vs-generating)
5. [Frontend — How PDF.js Renders a PDF](#5-frontend--how-pdfjs-renders-a-pdf)
6. [Frontend — Displaying PDFs in Practice](#6-frontend--displaying-pdfs-in-practice)
7. [Backend — The Three Generation Strategies](#7-backend--the-three-generation-strategies)
8. [Backend — HTML to PDF with Headless Chrome](#8-backend--html-to-pdf-with-headless-chrome)
9. [Backend — Programmatic Drawing](#9-backend--programmatic-drawing)
10. [Architecture — Where PDF Work Belongs](#10-architecture--where-pdf-work-belongs)
11. [Manipulating Existing PDFs](#11-manipulating-existing-pdfs)
12. [Extracting Text & Data](#12-extracting-text--data)
13. [Fonts — The Usual Source of Pain](#13-fonts--the-usual-source-of-pain)
14. [Security](#14-security)
15. [Performance & Scaling](#15-performance--scaling)
16. [Library Decision Table](#16-library-decision-table)
17. [Common Pitfalls](#17-common-pitfalls)

---

## 1. What a PDF Actually Is

```text
‼️ THE MENTAL MODEL THAT EXPLAINS EVERYTHING ELSE:

   A PDF is not a document. It is a PROGRAM that draws a document.

   An HTML page is a description of CONTENT and the browser decides where
   things land. A PDF is a list of DRAWING INSTRUCTIONS with absolute
   coordinates:

       "set font to Helvetica at 12pt"
       "move to x=72, y=720"
       "draw the glyphs for 'Invoice #1234'"
       "draw a line from (72,700) to (540,700)"

   That single difference is the source of almost every PDF difficulty:

   NO REFLOW       There is no concept of "this paragraph". There are glyphs at
                   coordinates. Resize the window and nothing moves, because
                   there is nothing to move — the layout was decided when the
                   file was created.

   NO SEMANTICS    A PDF does not know it has a "table". It has lines and text
                   positioned to LOOK like a table. This is why extracting a
                   table from a PDF is genuinely hard, and why accessibility
                   requires extra tagging that most PDFs do not have.

   NO TEXT ORDER   The drawing instructions can be in any order. Text extracted
                   from a two-column page often comes out interleaved, because
                   the file drew a line of column one, then a line of column two.

   FIXED OUTPUT    The upside, and the entire reason PDFs exist: the file looks
                   identical everywhere. Same fonts, same pagination, same
                   layout, on any device, forever. That is a guarantee HTML has
                   never been able to make.
```

```text
WHERE PDF CAME FROM — useful context, not trivia

  PDF descends from PostScript, which was a real programming language sent to
  printers. PDF removed the general-purpose programming (no loops, no
  branching) and added a document structure with random access to pages, but it
  kept the drawing model.

  This is why a PDF's content stream reads like assembly for a plotter, and why
  its coordinate system starts at the BOTTOM-LEFT — it is a printing convention
  inherited from PostScript, and the opposite of every screen graphics API.

  ‼️ The coordinate origin catches everyone: y=0 is the BOTTOM of the page and
     y increases UPWARD. In CSS and canvas, y=0 is the top and increases down.
     Most "my text is upside down / off the page" bugs are this.
```

---

## 2. Inside the File Format

```text
‼️ Open a PDF in a text editor and you can read a surprising amount of it.
   The structure has four parts:

  ┌─────────────────────────────────────────────────────────────┐
  │ HEADER        %PDF-1.7                                      │
  │               One line. The version.                        │
  ├─────────────────────────────────────────────────────────────┤
  │ BODY          A sequence of numbered OBJECTS.               │
  │               Pages, fonts, images, and the content streams │
  │               that do the actual drawing.                   │
  ├─────────────────────────────────────────────────────────────┤
  │ XREF TABLE    A byte-offset index: "object 12 starts at     │
  │               byte 45,678".                                 │
  │               ‼️ This is why a PDF viewer can open page 900  │
  │               of a 1000-page file instantly — it seeks       │
  │               directly rather than parsing from the start.  │
  ├─────────────────────────────────────────────────────────────┤
  │ TRAILER       Points at the document catalogue and the xref │
  │               offset. ‼️ Read LAST, not first — which is why │
  │               a PDF viewer needs the END of the file before │
  │               it can show the beginning.                    │
  └─────────────────────────────────────────────────────────────┘
```

```text
A MINIMAL PDF, annotated — this is genuinely the whole file:

  %PDF-1.7

  1 0 obj                          ← object 1, generation 0
    << /Type /Catalog              ← << >> is a DICTIONARY (like a JS object)
       /Pages 2 0 R >>             ← "2 0 R" is a REFERENCE to object 2
  endobj

  2 0 obj
    << /Type /Pages
       /Kids [3 0 R]               ← [ ] is an ARRAY
       /Count 1 >>
  endobj

  3 0 obj
    << /Type /Page
       /Parent 2 0 R
       /MediaBox [0 0 612 792]     ← page size in POINTS (1/72 inch)
                                   ←  612x792 = 8.5x11in = US Letter
                                   ←  595x842 = A4
       /Contents 4 0 R
       /Resources << /Font << /F1 5 0 R >> >> >>
  endobj

  4 0 obj                          ← THE CONTENT STREAM — the drawing program
    << /Length 44 >>
  stream
    BT                             ← Begin Text
    /F1 24 Tf                      ← use font F1 at 24pt  (Tf = "text font")
    72 700 Td                      ← move to x=72, y=700  (Td = "text displace")
    (Hello World) Tj               ← draw this string      (Tj = "text show")
    ET                             ← End Text
  endstream
  endobj

  5 0 obj
    << /Type /Font
       /Subtype /Type1
       /BaseFont /Helvetica >>     ← one of the 14 fonts every viewer has
  endobj

  xref                             ← the byte-offset index
  0 6
  0000000000 65535 f
  0000000009 00000 n
  ...

  trailer
    << /Size 6 /Root 1 0 R >>      ← Root points at the catalogue
  startxref
  512                              ← byte offset of the xref table
  %%EOF
```

```text
‼️ THE OPERATORS YOU WILL SEE MOST — the content stream "instruction set":

  TEXT                         GRAPHICS
    BT / ET    begin/end text    m    moveto
    Tf         set font+size     l    lineto
    Td / TD    move position     c    curveto (bézier)
    Tj / TJ    show text         re   rectangle
    TJ         show text with    S    stroke (draw the outline)
               per-glyph kerning f    fill
    Tm         set text matrix   W    clip
               (position+scale
                +rotation)     STATE
    Tc / Tw    char/word spacing  q    save graphics state
    TL         leading            Q    restore graphics state
    T*         next line          cm   concatenate transform matrix
                                  rg / RG   set fill / stroke colour (RGB)
                                  w    line width

  ‼️ q and Q are a STACK, exactly like canvas save()/restore(). Unbalanced
     q/Q is a classic corruption bug in hand-generated PDFs — everything after
     the imbalance inherits the wrong transform or colour.

  ‼️ Notice what is NOT here: no "paragraph", no "table", no "heading". Just
     glyphs, lines, and curves. That absence IS the format.
```

```text
STREAMS AND COMPRESSION

  Content streams and images are almost always compressed — /Filter /FlateDecode
  is zlib/deflate. That is why most of a real PDF looks like binary noise in a
  text editor even though the structure above is plain text.

  Common filters:
    FlateDecode    zlib — content streams, most things
    DCTDecode      JPEG — the image is stored as a literal JPEG file
    JPXDecode      JPEG 2000
    CCITTFaxDecode fax encoding — scanned black-and-white documents
    ASCIIHexDecode / ASCII85Decode  — text-safe encodings, rare now

  ‼️ DCTDecode matters practically: a JPEG inside a PDF is stored verbatim, so
     extracting images from a PDF can be a byte copy rather than a re-encode —
     no quality loss, and very fast.

OBJECT STREAMS AND INCREMENTAL UPDATES

  PDF 1.5+ can pack many small objects into one compressed "object stream",
  which is why a modern PDF is mostly opaque.

  ‼️ INCREMENTAL UPDATE is worth knowing for security reasons: editing a PDF can
     APPEND a new body + xref to the end rather than rewriting the file. The old
     content is still in there. "Redacting" a PDF by drawing a black box and
     saving does NOT remove the text underneath — it is still in the file and
     trivially extractable. This has caused repeated real-world leaks of
     redacted court and government documents.
```

---

## 3. Why PDFs Are Harder Than They Look

```text
‼️ The things that surprise people building PDF features. Read this before
   estimating any PDF ticket.

  1. TEXT EXTRACTION IS NOT RELIABLE.
     Glyphs have positions, not reading order. Multi-column layouts interleave.
     Ligatures ("ﬁ") may be one glyph. Hyphenated words break. Spaces are often
     not characters at all — just a positioning jump — so extractors have to
     INFER word boundaries from coordinate gaps.

  2. SCANNED PDFs CONTAIN NO TEXT AT ALL.
     They are images in a PDF wrapper. No amount of parsing will find text;
     you need OCR. ‼️ Always check whether a PDF has a text layer before
     building anything that reads from it — a huge proportion of real-world
     business PDFs are scans.

  3. TABLES ARE AN ILLUSION.
     No table structure exists. Extracting one means clustering text by
     coordinates and guessing at column boundaries. This is why commercial
     table-extraction products exist.

  4. FONTS MAY OR MAY NOT BE EMBEDDED.
     A non-embedded font is substituted by the viewer, so the document looks
     different on different machines — defeating the point of PDF. And
     subsetted fonts (only the glyphs actually used) break text extraction if
     the mapping table is missing or wrong.

  5. THERE IS NO "PAGE 1 OF A DOCUMENT" IN THE HTML SENSE.
     Page breaks are decided at generation time. Getting a table header to
     repeat across pages, or avoiding an orphaned row, is genuinely fiddly in
     every tool.

  6. FILE SIZE EXPLODES EASILY.
     Embedding a full Unicode font is megabytes. Unsubsetted fonts, uncompressed
     images, and duplicated resources routinely turn a 3-page invoice into 20MB.

  7. ACCESSIBILITY IS OPT-IN AND USUALLY ABSENT.
     A screen-reader-friendly PDF needs a tagged structure tree (PDF/UA). Almost
     nothing generates this by default. If accessibility is a requirement, it
     changes your tool choice — most HTML-to-PDF pipelines produce untagged
     output.
```

---

## 4. The Two Problems: Rendering vs Generating

```text
‼️ These are completely different engineering problems with different tools,
   and conflating them is the first mistake.

  RENDERING (you have a PDF, show it to a user)
    Happens: usually in the BROWSER
    Core question: how do I turn drawing instructions into pixels?
    Main tool: PDF.js
    Difficulties: performance on large files, text selection, search,
                  annotations, mobile

  GENERATING (you have data, produce a PDF)
    Happens: usually on the BACKEND
    Core question: how do I lay out content and emit drawing instructions?
    Main tools: headless Chrome, PDFKit, pdf-lib, React-PDF
    Difficulties: layout control, page breaks, fonts, performance, cost

  MANIPULATING (you have a PDF, change it)
    Happens: backend
    Examples: merge, split, stamp a watermark, fill a form, add a signature
    Main tools: pdf-lib, qpdf, pdftk

  EXTRACTING (you have a PDF, get data out)
    Happens: backend
    Main tools: pdf-parse, pdf.js, pdfplumber (Python), Tesseract for scans,
                or a vision LLM for messy real-world documents
```

---

## 5. Frontend — How PDF.js Renders a PDF

```text
‼️ PDF.js is Mozilla's PDF renderer, written in JavaScript. It is what Firefox
   uses as its built-in viewer, and it is what essentially every "PDF in a web
   app" feature is built on. Understanding its pipeline explains both its
   performance characteristics and its quirks.

THE PIPELINE

  1. FETCH
     The file is downloaded — or, better, RANGE-REQUESTED. PDF.js can fetch
     just the trailer and xref, then pull individual pages on demand, so a
     200MB file can open in under a second.
     ‼️ This requires the server to support HTTP Range requests
     (Accept-Ranges: bytes). Without it, the whole file downloads before
     anything appears. This is the #1 "why is our viewer so slow" cause.

  2. PARSE
     Read the trailer → xref → catalogue → page tree. Now it knows the page
     count and can locate any page's objects by byte offset.

  3. BUILD AN OPERATOR LIST
     The page's content stream is decompressed and parsed into an intermediate
     representation — an array of drawing operations with their arguments.
     ‼️ This is the key design decision: parsing happens ONCE per page and the
     result is cached, so re-rendering at a new zoom level replays the
     operator list rather than re-parsing the stream.

  4. RENDER TO CANVAS
     The operator list is executed against a 2D canvas context. PDF operators
     map closely onto canvas calls, which is why canvas was the right target:
       m/l/c  → moveTo/lineTo/bezierCurveTo
       re     → rect
       f/S    → fill/stroke
       cm     → transform
       q/Q    → save/restore
     Fonts are converted to browser-usable formats and loaded via FontFace.

  5. OVERLAY THE TEXT LAYER
     ‼️ THE PART THAT SURPRISES PEOPLE: the canvas is just pixels, so you cannot
     select or search it. PDF.js separately renders an INVISIBLE HTML layer of
     absolutely-positioned, transparent <span> elements aligned over the
     canvas glyphs.
     Selecting text selects those spans. Ctrl+F searches them. Screen readers
     read them.
     This is also why PDF text selection in browsers feels slightly wrong —
     you are selecting a best-effort HTML approximation overlaid on a picture.

  6. OVERLAY THE ANNOTATION LAYER
     Links, form fields, and comments become real HTML elements on top, so
     they are clickable and focusable.

  ‼️ WORKER ARCHITECTURE: steps 2-3 run in a WEB WORKER (pdf.worker.js), off
     the main thread. Parsing a complex page is CPU-heavy and would otherwise
     freeze the UI. This is why every PDF.js setup requires you to configure a
     worker path — and why forgetting to is the most common setup error.
```

```javascript
// ── PDF.js directly, with the details that matter ───────────────────────
import * as pdfjsLib from 'pdfjs-dist';

// ‼️ REQUIRED. Without this, PDF.js either fails outright or silently falls
// back to running on the main thread and freezes the tab on any real document.
// The worker file must be served by your app — bundlers need this wiring,
// which is why it is the #1 integration problem.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

async function renderPage(url: string, pageNumber: number, canvas: HTMLCanvasElement) {
  // getDocument returns a task with a promise. It also exposes onProgress,
  // which is what you hook a loading bar to.
  const loadingTask = pdfjsLib.getDocument({
    url,
    // Streams the file via HTTP Range requests instead of downloading it all.
    disableStream: false,
    disableAutoFetch: true,   // only fetch the pages actually viewed
  });

  const pdf = await loadingTask.promise;
  console.log(`${pdf.numPages} pages`);

  const page = await pdf.getPage(pageNumber);   // 1-indexed, not 0

  // ‼️ DEVICE PIXEL RATIO. A canvas rendered at CSS size looks blurry on a
  // retina screen. Render at devicePixelRatio scale and then shrink it with
  // CSS. Skipping this is why so many in-app PDF viewers look fuzzy.
  const dpr = window.devicePixelRatio || 1;
  const viewport = page.getViewport({ scale: 1.5 * dpr });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${viewport.width / dpr}px`;
  canvas.style.height = `${viewport.height / dpr}px`;

  const renderTask = page.render({
    canvasContext: canvas.getContext('2d')!,
    viewport,
  });

  // ‼️ Keep the task handle. If the user scrolls or zooms before this finishes,
  // cancel it — otherwise you queue dozens of renders and the UI locks up.
  // This is the main performance mistake in hand-rolled viewers.
  await renderTask.promise;

  // ── The text layer, for selection and search ──────────────────────────
  const textContent = await page.getTextContent();
  // Each item has a string and a transform matrix giving its position.
  // pdfjs-dist ships a TextLayer helper that builds the positioned spans.

  // ‼️ Free the page's resources when you are done with it. In a long
  // document, not doing this is a steady memory leak that ends in a tab crash.
  page.cleanup();
}
```

---

## 6. Frontend — Displaying PDFs in Practice

```text
‼️ THE DECISION, in the order you should consider it:

  1. <iframe> / <embed> — THE BROWSER'S OWN VIEWER
     <iframe src="/invoice.pdf" width="100%" height="800px" />

     Zero dependencies, zero bundle cost, full native performance, printing and
     download for free.
     COSTS: no control over the toolbar or appearance, inconsistent between
     browsers, and ‼️ many mobile browsers refuse to render it inline and
     download the file instead — which is usually the dealbreaker.

     → Use it for internal tools and desktop-only admin screens. It is
       genuinely the right answer more often than people assume.

  2. react-pdf (wraps PDF.js)
     Full control, consistent across browsers and mobile, custom UI.
     COSTS: ~300KB+ of JavaScript, worker setup, you build the toolbar.

     → Use it for anything user-facing, anything on mobile, or when the viewer
       needs to match your product's design.

  3. A COMMERCIAL SDK (PSPDFKit, Apryse/PDFTron, Nutrient)
     → Only when you need real annotation editing, form filling, digital
       signatures, or redaction. These are expensive and worth it precisely
       when you would otherwise spend six months rebuilding them.

  4. RENDER TO IMAGES ON THE SERVER
     Convert pages to PNG/WebP server-side and show <img> tags.
     → Good for previews and thumbnails, and for guaranteeing it works
       everywhere. No text selection, no search.
```

```tsx
// ── react-pdf, with the practical details ───────────────────────────────
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';        // ‼️ required, or text
import 'react-pdf/dist/Page/AnnotationLayer.css';  // selection is misaligned

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  // ‼️ MEMOISE THE FILE PROP. react-pdf reloads the entire document whenever
  // this prop changes by reference. An inline object literal
  // ({ url, httpHeaders: {...} }) is a NEW object every render, so the PDF
  // reloads on every render — an infinite fetch loop. This is the single most
  // common react-pdf bug.
  const file = useMemo(() => ({ url }), [url]);

  return (
    <Document
      file={file}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      onLoadError={(error) => console.error(error)}
      loading={<Skeleton />}
    >
      <Page
        pageNumber={pageNumber}
        // ‼️ Render at the container's width rather than a fixed scale, or the
        // document overflows on mobile.
        width={containerWidth}
        renderTextLayer={true}        // selection + search; disable for pure
                                      // display to save significant CPU
        renderAnnotationLayer={true}  // clickable links and form fields
      />
    </Document>
  );
}
```

```text
‼️ PERFORMANCE RULES FOR A WEB PDF VIEWER — in order of impact:

  1. ENABLE HTTP RANGE REQUESTS on whatever serves the file. S3 and CloudFront
     do by default; a naive Express res.sendFile with the wrong headers does
     not. This alone is often the difference between 0.5s and 30s to first page.

  2. NEVER RENDER ALL PAGES AT ONCE. A 500-page document rendered eagerly will
     exhaust memory and crash the tab. Virtualise: render the visible pages
     plus one or two either side.

  3. CANCEL IN-FLIGHT RENDERS on scroll and zoom.

  4. DISABLE THE TEXT LAYER if you do not need selection or search. It is a
     meaningful share of the rendering cost.

  5. CALL page.cleanup() on pages that scroll out of view.

  6. USE THUMBNAILS for page navigation, rendered at a tiny scale (0.2) and
     cached — do not render full pages for a sidebar.
```

---

## 7. Backend — The Three Generation Strategies

```text
‼️ THIS IS THE ARCHITECTURAL DECISION THAT MATTERS MOST. Get it right at the
   start; migrating later means rewriting every template.

┌──────────────────────────────────────────────────────────────────────────┐
│ STRATEGY A — HTML → PDF  (headless Chrome, WeasyPrint, wkhtmltopdf)      │
├──────────────────────────────────────────────────────────────────────────┤
│ You write HTML + CSS, a browser engine renders it and prints to PDF.     │
│                                                                          │
│ ✓ You already know HTML and CSS. Huge productivity win.                  │
│ ✓ Designers can work on it. Reuses your existing components and styles.  │
│ ✓ Complex layouts (flexbox, grid, web fonts, SVG charts) just work.      │
│ ✓ Preview in a browser during development — instant feedback.            │
│                                                                          │
│ ✗ HEAVY. Each render spawns a browser: ~50-150MB RAM, 0.5-3s.            │
│ ✗ Deployment pain: Chrome needs system libraries. Docker images are      │
│   ~500MB+. Serverless needs a special build (@sparticuz/chromium).       │
│ ✗ Page-break control is limited to what CSS paged media offers, which is │
│   patchily implemented.                                                  │
│ ✗ ‼️ SECURITY: you are running a browser on your server. See §14.         │
│                                                                          │
│ → ‼️ THE DEFAULT CHOICE for invoices, reports, statements, certificates — │
│   anything design-led and moderate in volume.                            │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ STRATEGY B — PROGRAMMATIC DRAWING  (PDFKit, pdf-lib, ReportLab)          │
├──────────────────────────────────────────────────────────────────────────┤
│ You call an API: doc.text(), doc.moveTo(), doc.image().                  │
│                                                                          │
│ ✓ FAST and LIGHT. Milliseconds, a few MB of memory, no browser.          │
│ ✓ Precise control over every coordinate, and over page breaks.           │
│ ✓ Trivial to deploy — it is just a library.                              │
│ ✓ Scales to very high volume cheaply.                                    │
│                                                                          │
│ ✗ You are writing layout code by hand. Anything resembling a flexible    │
│   design takes real effort; a multi-column table with wrapping cells is  │
│   a day's work rather than twenty minutes of CSS.                        │
│ ✗ Changing the design means changing code. Designers cannot touch it.    │
│                                                                          │
│ → Use for HIGH VOLUME and SIMPLE, STABLE layouts: shipping labels,       │
│   tickets, receipts, generated statements. Also when you need to modify  │
│   an existing PDF rather than create one (pdf-lib).                      │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ STRATEGY C — DECLARATIVE / TEMPLATE  (@react-pdf/renderer, Typst, LaTeX) │
├──────────────────────────────────────────────────────────────────────────┤
│ Describe the document declaratively; a layout engine handles the rest.   │
│ @react-pdf/renderer lets you write JSX with a flexbox-like subset.       │
│                                                                          │
│ ✓ No browser needed, so much lighter than Strategy A.                    │
│ ✓ Componentised and testable; familiar if you write React.               │
│ ✓ Can render in the browser too — client-side generation, no server.     │
│                                                                          │
│ ✗ A LIMITED subset of CSS. Not real flexbox, no grid, no arbitrary CSS.  │
│   You will hit its edges and have to work around them.                   │
│ ✗ Smaller ecosystem; some layout problems have no good answer.           │
│                                                                          │
│ → A strong middle ground when Chrome is too heavy but hand-drawing is    │
│   too tedious. Especially good when the PDF must be generated            │
│   client-side.                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

```text
‼️ THE DECISION IN ONE PARAGRAPH:

  Design-led document, moderate volume, and you want to iterate quickly?
    → HTML to PDF with headless Chrome.

  Thousands per hour, simple fixed layout, cost matters?
    → PDFKit or pdf-lib.

  Need it generated in the browser, or Chrome is too heavy for your platform?
    → @react-pdf/renderer.

  Modifying an existing PDF (stamp, merge, fill a form)?
    → pdf-lib, regardless of what generated it.
```

---

## 8. Backend — HTML to PDF with Headless Chrome

```javascript
// ── Playwright (preferred over Puppeteer for new work: better API, same
//    engine, first-class Docker images) ───────────────────────────────────
import { chromium } from 'playwright';

// ‼️ LAUNCH THE BROWSER ONCE AND REUSE IT. Launching per request costs
// 300-800ms and a lot of memory. A long-lived browser with a fresh CONTEXT
// per request is the standard pattern — a context is cheap and isolated.
let browser: Browser;
export async function getBrowser() {
  if (!browser?.isConnected()) {
    browser = await chromium.launch({
      args: [
        // Required in most Docker containers — Chrome's sandbox needs kernel
        // features containers often do not grant.
        // ‼️ Disabling the sandbox is a real security reduction. Only do it
        // when the container itself is the isolation boundary, and never
        // render untrusted HTML in that setup. See §14.
        '--no-sandbox',
        // Chrome's default /dev/shm is 64MB in Docker and it will crash on
        // larger pages. This makes it use /tmp instead.
        '--disable-dev-shm-usage',
      ],
    });
  }
  return browser;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();

  // A fresh context per job: isolated cookies, storage, and cache. Much
  // cheaper than a new browser, and prevents one job leaking into another.
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setContent(html, {
      // ‼️ WAIT FOR THE RIGHT THING. 'networkidle' waits until there have been
      // no network connections for 500ms — necessary when the page loads web
      // fonts, images, or charts. With the default, you get a PDF of a
      // half-loaded page, and the bug is intermittent because it depends on
      // network timing. This is the most common HTML-to-PDF defect.
      waitUntil: 'networkidle',
      timeout: 30_000,
    });

    // ‼️ Fonts deserve an explicit wait even after networkidle — a font can
    // still be swapping in. Without this you get fallback fonts sporadically.
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: 'A4',

      // ‼️ WITHOUT THIS, BACKGROUNDS AND COLOURS ARE DROPPED. Chrome's print
      // path strips backgrounds by default to save ink. Every "my PDF is
      // black and white / my coloured header vanished" question is this flag.
      printBackground: true,

      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },

      // Header and footer are SEPARATE mini-documents with their own styles.
      // ‼️ They inherit NO CSS from the page, and default to ~0 font size, so
      // you must set font-size inline or they render invisibly small.
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size:9px; width:100%; text-align:center; color:#666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,

      // Honours @media print rules. Set false to render the screen styles.
      preferCSSPageSize: false,
    });

    return pdf;
  } finally {
    // ‼️ ALWAYS close the context, in a finally. A leaked context is a leaked
    // renderer process; enough of them and the container is OOM-killed. This
    // is the classic "our PDF service dies every few hours" bug.
    await context.close();
  }
}
```

```css
/* ── THE CSS THAT ONLY MATTERS IN PRINT ──────────────────────────────── */

/* Set the physical page size and margins from CSS instead of the API. */
@page {
  size: A4;
  margin: 20mm 15mm;
}

/* ‼️ PAGE BREAK CONTROL — the part you will spend the most time on. */
.invoice-section {
  break-inside: avoid;      /* don't split this block across pages */
}
.chapter {
  break-before: page;       /* always start on a new page */
}
h2 {
  break-after: avoid;       /* ‼️ never leave a heading alone at the bottom
                               of a page with its content overleaf */
}
p {
  orphans: 3;               /* min lines left at the bottom of a page */
  widows: 3;                /* min lines carried to the top of the next */
}

/* ‼️ REPEATING TABLE HEADERS across page breaks. This works in Chrome and is
   one of the genuine advantages of the HTML approach — doing it by hand in
   PDFKit is real work. */
thead { display: table-header-group; }
tfoot { display: table-footer-group; }

/* Hide interactive chrome that makes no sense on paper */
@media print {
  .no-print, nav, button { display: none !important; }

  /* Show link destinations, since you cannot click paper */
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.8em; }
}

/* ‼️ Use mm/cm/pt for print, not px. Pixels have no fixed physical meaning
   and will not match a designer's measurements. */
```

```text
‼️ DEPLOYING HEADLESS CHROME — the part that surprises people:

  DOCKER    Use Playwright's official image (mcr.microsoft.com/playwright).
            Hand-installing Chrome's dependencies on alpine is a rite of
            passage nobody needs. Expect a 500MB-1.5GB image.

  MEMORY    Budget 150-300MB per concurrent render on top of Node. A 512MB
            container renders roughly one page at a time.

  SERVERLESS  Standard Chrome does not fit in a Lambda. Use
            @sparticuz/chromium, accept ~250MB of layer, and expect 2-5s cold
            starts. ‼️ Often the wrong platform for this; a small always-on
            container is usually cheaper and far simpler.

  CONCURRENCY  Cap it. Unbounded parallel renders will OOM the container. A
            queue with a concurrency limit of 2-5 per instance is the norm.
```

---

## 9. Backend — Programmatic Drawing

```javascript
// ── PDFKit — the standard Node library for creating PDFs from scratch ───
import PDFDocument from 'pdfkit';

export function buildInvoice(invoice: Invoice): NodeJS.ReadableStream {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,          // points — 50pt ≈ 17.6mm
    // Metadata shows in the viewer's document properties and in search results.
    info: {
      Title: `Invoice ${invoice.number}`,
      Author: 'Acme Ltd',
      CreationDate: new Date(),
    },
  });

  // ‼️ PDFKit is a STREAM. You can pipe it straight to an HTTP response and
  // the client starts receiving bytes before the document is finished — no
  // buffering the whole PDF in memory. For large documents this is the
  // difference between working and running out of heap.

  // ── Fonts ──────────────────────────────────────────────────────────────
  // The 14 built-in fonts need no embedding but are Latin-1 only.
  doc.font('Helvetica-Bold').fontSize(20).text('INVOICE', { align: 'right' });
  // ‼️ For any non-Latin text (accents beyond Latin-1, Chinese, Arabic,
  // emoji) you MUST register a TTF. Otherwise characters silently render as
  // garbage or blank.
  doc.registerFont('Body', './fonts/NotoSans-Regular.ttf');

  // ── Text with layout options ───────────────────────────────────────────
  doc.font('Body').fontSize(10)
     .text(invoice.customerName, 50, 120, {
       width: 250,           // wraps within this width
       align: 'left',
       lineGap: 2,
     });

  // ‼️ doc.y tracks the current vertical position and advances as you write.
  // Manual layout means tracking this yourself — the main cost of this approach.
  const tableTop = doc.y + 30;

  // ── Drawing primitives ─────────────────────────────────────────────────
  doc.moveTo(50, tableTop).lineTo(545, tableTop).lineWidth(0.5)
     .strokeColor('#cccccc').stroke();

  doc.rect(50, tableTop + 10, 495, 20).fillColor('#f5f5f5').fill();

  // ── Manual pagination ──────────────────────────────────────────────────
  let y = tableTop + 40;
  for (const line of invoice.lines) {
    // ‼️ YOU are responsible for page breaks. There is no automatic flow.
    // Check the remaining space before drawing each row and add a page when
    // it will not fit — including room for the footer.
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;
      drawTableHeader(doc, y);   // and re-draw the header yourself
      y += 30;
    }

    doc.fillColor('#000').text(line.description, 50, y, { width: 300 });
    doc.text(formatMoney(line.amount), 450, y, { width: 95, align: 'right' });
    y += 20;
  }

  // ‼️ Page numbers require a second pass, because you do not know the total
  // until the document is complete. Buffer the pages, then go back:
  //   const range = doc.bufferedPageRange();
  //   for (let i = 0; i < range.count; i++) {
  //     doc.switchToPage(i);
  //     doc.text(`Page ${i + 1} of ${range.count}`, ...);
  //   }
  // (Requires bufferPages: true in the constructor.)

  doc.end();
  return doc;
}
```

```javascript
// ── Express: stream it to the client ────────────────────────────────────
app.get('/invoices/:id/pdf', async (req, res) => {
  const invoice = await invoiceService.findOne(req.params.id);

  res.setHeader('Content-Type', 'application/pdf');
  // ‼️ 'inline' opens it in the browser's viewer; 'attachment' forces a
  // download. This one word is the entire difference, and it is the thing
  // people search for.
  res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.number}.pdf"`);

  buildInvoice(invoice).pipe(res);
});
```

---

## 10. Architecture — Where PDF Work Belongs

```text
‼️ THE MISTAKE ALMOST EVERYONE MAKES FIRST: generating the PDF inside the HTTP
   request handler and returning the bytes.

   It works perfectly in development with a one-page test document. Then:
     - A 60-page report takes 40 seconds and hits your load balancer's timeout.
     - Ten users click "export" at once and the container OOMs.
     - The user's connection drops at 90% and the whole thing is wasted.
     - A retry regenerates everything from scratch.

THE PROGRESSION, and when to move up:

  LEVEL 1 — SYNCHRONOUS  (fine, genuinely, for small documents)
    Request → generate → stream back.
    ‼️ Acceptable when generation is reliably under ~2 seconds and volume is
       low. Do not over-engineer past this prematurely.

    Request ──► [API: generate] ──► PDF bytes

  LEVEL 2 — ASYNCHRONOUS WITH A QUEUE  (the standard production pattern)

    ┌────────┐   1. POST /exports      ┌─────────┐
    │ Client │ ──────────────────────► │   API   │
    └────────┘   ◄── 202 { jobId }     └────┬────┘
        │                                   │ 2. enqueue
        │                                   ▼
        │                              ┌─────────┐
        │                              │  Queue  │ (BullMQ / SQS)
        │                              └────┬────┘
        │                                   │ 3. pick up
        │                                   ▼
        │                              ┌─────────┐
        │                              │ Worker  │ ← headless Chrome lives
        │                              └────┬────┘   HERE, not in the API
        │                                   │ 4. upload
        │                                   ▼
        │                              ┌─────────┐
        │                              │   S3    │
        │                              └────┬────┘
        │   6. signed URL                   │ 5. mark job complete
        │ ◄─────────────────────────────────┘
        │   (poll GET /exports/:id, or receive a websocket/email notification)

    ‼️ WHY EACH PIECE IS THERE:
      - The API returns in milliseconds. No timeouts, no blocked workers.
      - The worker is a SEPARATE deployment, so you can give it 2GB of memory
        and scale it independently of your API. Chrome's memory profile is
        completely different from a JSON API's.
      - S3 (or equivalent) means the PDF outlives the request, can be
        re-downloaded, and is served by a CDN rather than your app.
      - A SIGNED URL with a short expiry means the file is private but needs
        no auth-aware proxy in front of it.
      - The job row gives the user progress and a retry story.

  LEVEL 3 — ADD CACHING AND IDEMPOTENCY
    ‼️ PDFs are usually DETERMINISTIC: the same invoice produces the same file
    every time. So:
      - Key the stored object by a hash of the input data + template version.
      - On request, if that key exists in S3, return the signed URL
        immediately — no generation at all.
      - Use an idempotency key on the job so a double-click does not produce
        two identical renders.
    For a report that many users download, this turns almost all requests into
    a cheap S3 lookup.
```

```typescript
// ── The job handler, with the parts that matter ─────────────────────────
@Processor('pdf-exports', { concurrency: 3 })   // ‼️ cap it — Chrome is heavy
export class PdfExportProcessor extends WorkerHost {
  async process(job: Job<{ invoiceId: string; templateVersion: string }>) {
    const { invoiceId, templateVersion } = job.data;

    const invoice = await this.invoices.findOne(invoiceId);

    // ‼️ Deterministic key — the cache and the idempotency guarantee in one.
    const key = `invoices/${invoiceId}/${templateVersion}/${hashOf(invoice)}.pdf`;

    // Already generated? Skip everything.
    if (await this.storage.exists(key)) {
      return { key };
    }

    await job.updateProgress(20);
    const html = await this.templates.render('invoice', invoice);

    await job.updateProgress(50);
    const pdf = await this.renderer.renderPdf(html);

    await job.updateProgress(80);
    await this.storage.put(key, pdf, { contentType: 'application/pdf' });

    // ‼️ Return the KEY, not the bytes. Job results are stored in Redis;
    // putting a 5MB buffer in there will exhaust its memory quickly.
    return { key };
  }
}

// ── And the download endpoint ───────────────────────────────────────────
@Get('exports/:id/download')
async download(@Param('id') id: string, @CurrentUser() user: User) {
  const job = await this.exports.findOne(id);

  // ‼️ AUTHORISE HERE. A signed URL is a bearer token — anyone with the link
  // can fetch the file. Check ownership before you mint one.
  if (job.userId !== user.id) throw new ForbiddenException();
  if (job.status !== 'completed') throw new ConflictException('Not ready');

  // Short expiry: long enough to click, short enough that a leaked link in a
  // chat log or referrer header goes stale quickly.
  return { url: await this.storage.signedUrl(job.key, { expiresIn: 300 }) };
}
```

---

## 11. Manipulating Existing PDFs

```javascript
// ‼️ pdf-lib is the Node library for EDITING PDFs. It can create them too, but
// its real strength is reading an existing file and changing it. It is pure
// JavaScript, works in the browser as well as Node, and needs no binaries.
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

// ── MERGE ───────────────────────────────────────────────────────────────
async function merge(buffers: Buffer[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf);
    // copyPages brings the pages AND their resources (fonts, images) across.
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

// ── SPLIT ───────────────────────────────────────────────────────────────
async function extractPages(buf: Buffer, indices: number[]) {
  const src = await PDFDocument.load(buf);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

// ── WATERMARK / STAMP ───────────────────────────────────────────────────
async function watermark(buf: Buffer, text: string) {
  const doc = await PDFDocument.load(buf);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - 150,
      y: height / 2,
      size: 50,
      font,
      color: rgb(0.85, 0.85, 0.85),
      opacity: 0.4,
      rotate: degrees(45),
    });
    // ‼️ Remember the origin is BOTTOM-LEFT. y = height/2 is the middle;
    // y = 0 is the bottom edge, not the top.
  }
  return doc.save();
}

// ── FILL A FORM (AcroForm fields) ───────────────────────────────────────
async function fillForm(buf: Buffer, values: Record<string, string>) {
  const doc = await PDFDocument.load(buf);
  const form = doc.getForm();

  form.getTextField('full_name').setText(values.name);
  form.getCheckBox('agreed').check();
  form.getDropdown('country').select('United Kingdom');

  // ‼️ flatten() bakes the values into the page content and removes the
  // interactive fields. Without it the recipient can still edit them — which
  // matters a great deal for a signed agreement or a submitted application.
  form.flatten();

  return doc.save();
}

// ── ENCRYPT / PASSWORD-PROTECT ──────────────────────────────────────────
// ‼️ pdf-lib does NOT support encryption. Use qpdf (a CLI) for this:
//   qpdf --encrypt <userpw> <ownerpw> 256 -- in.pdf out.pdf
// And note that PDF "permissions" (no printing, no copying) are advisory —
// the viewer chooses to honour them. They are not a security control; any
// determined user can strip them in seconds.
```

---

## 12. Extracting Text & Data

```text
‼️ FIRST, ANSWER THIS QUESTION: does the PDF have a text layer, or is it a scan?

   Extract text with any library. If you get back an empty string or a handful
   of characters from a page that clearly has words on it, it is a SCANNED
   IMAGE and no parser will ever help. You need OCR.

   A huge share of real-world business PDFs — anything that has been printed
   and re-scanned, anything from a fax workflow, most older archives — are
   scans. Build the check in from the start rather than discovering it in
   production.
```

```javascript
// ── SIMPLE TEXT EXTRACTION ──────────────────────────────────────────────
import pdfParse from 'pdf-parse';

const data = await pdfParse(buffer);
console.log(data.text);        // all text, best-effort reading order
console.log(data.numpages);
console.log(data.info);        // Title, Author, Producer...

// ‼️ Good enough for search indexing and keyword matching. NOT good enough
// for anything positional — the reading order of multi-column documents is
// frequently wrong.

// ── POSITIONAL EXTRACTION (when layout matters) ─────────────────────────
// PDF.js gives each text item with its transform matrix, so you can cluster
// by coordinates and reconstruct columns or tables yourself.
const page = await pdf.getPage(1);
const content = await page.getTextContent();
for (const item of content.items) {
  const [, , , , x, y] = item.transform;   // position from the matrix
  console.log(item.str, x, y, item.width);
}
// ‼️ Note there are often no space characters — words are separated by a gap
// in x. You infer spaces from the distance between items relative to the
// font size. This is why naive extraction produces "InvoiceNumber1234".

// ── OCR for scans ───────────────────────────────────────────────────────
// Rasterise each page to an image, then run Tesseract over it.
// Accuracy depends heavily on scan quality; 300 DPI is the usual minimum.
// Cloud alternatives (AWS Textract, Google Document AI, Azure) are markedly
// better on real documents, and they understand tables and forms.
```

```text
‼️ THE MODERN PRAGMATIC ANSWER FOR MESSY DOCUMENTS: a vision LLM.

   For "extract the line items from these supplier invoices, which arrive in
   forty different layouts", traditional parsing means writing and maintaining
   forty parsers. Sending page images to a vision model with a schema is
   dramatically less work and handles layouts you have never seen.

   The trade-offs to be aware of:
     - Cost per page, at volume.
     - Non-determinism — the same input can produce slightly different output.
     - Hallucination risk: a model may produce a plausible number that is not
       on the page. ‼️ For financial data, validate what comes back (do the
       line items sum to the stated total?) rather than trusting it.
     - Latency, versus milliseconds for a native parser.

   → Deterministic layouts you control: parse them properly.
   → Varied third-party documents: a vision model is usually the right call.
   → See AI-MULTIMODAL-VISION-DEEP.md for how to wire this up.
```

---

## 13. Fonts — The Usual Source of Pain

```text
‼️ Fonts cause more PDF bugs than anything else. The rules:

  1. THE 14 STANDARD FONTS need no embedding — Helvetica, Times, Courier,
     Symbol, ZapfDingbats and their bold/italic variants. Every viewer has
     them. They are Latin-1 only: no Cyrillic, no CJK, no emoji, and even
     some Western European characters are marginal.

  2. ANYTHING ELSE MUST BE EMBEDDED, or the viewer substitutes a font and your
     careful layout reflows. A PDF with non-embedded fonts is not portable,
     which defeats the format's entire purpose.

  3. SUBSET YOUR FONTS. Embedding a full CJK font is 10-20MB. Subsetting keeps
     only the glyphs actually used, typically a few KB. Most libraries do this
     by default — but verify, because an unsubsetted font is usually the
     answer to "why is this 3-page PDF 18MB?"

  4. CHECK YOUR LICENCE. Many commercial fonts prohibit embedding, or require
     a specific licence tier for it. This is a real legal issue, not a
     formality.

  5. NON-LATIN SCRIPTS NEED MORE THAN A FONT. Arabic and Hebrew need
     right-to-left handling; Arabic and Indic scripts need contextual glyph
     shaping. Not every library does this. ‼️ If you need Arabic, verify your
     chosen library actually shapes it before committing — several popular
     ones render the letters in isolated, unjoined forms, which is unreadable
     to a native speaker even though it "renders".

  6. IN HTML-TO-PDF, WAIT FOR FONTS TO LOAD. See §8 — document.fonts.ready.
     Otherwise you intermittently get the fallback font.

  7. EMOJI ARE COLOUR FONTS and support is patchy. Expect them to render as
     black-and-white outlines, or as nothing at all.
```

```javascript
// PDFKit — registering and subsetting
doc.registerFont('Body', './fonts/NotoSans-Regular.ttf');
doc.registerFont('Body-Bold', './fonts/NotoSans-Bold.ttf');
doc.font('Body').text('Café — naïve — Ünicode ✓');
// ‼️ Noto is a good default choice: Google's family covers essentially every
// script, is open-licensed, and is designed for exactly this.

// pdf-lib — embedding requires fontkit for TTF support
import fontkit from '@pdf-lib/fontkit';
doc.registerFontkit(fontkit);              // ‼️ required, easily forgotten
const font = await doc.embedFont(fontBytes, { subset: true });
```

---

## 14. Security

```text
‼️ PDF GENERATION IS A COMMONLY OVERLOOKED ATTACK SURFACE. If you render HTML
   that contains anything a user supplied, you are running a browser on your
   server on behalf of an attacker.

  1. SSRF VIA HTML-TO-PDF — the big one.
     User-supplied HTML containing:
         <img src="http://169.254.169.254/latest/meta-data/iam/security-credentials/">
         <iframe src="file:///etc/passwd">
     The headless browser fetches it from INSIDE your network, and the content
     can end up rendered into a PDF the attacker then downloads. This has
     produced real cloud-credential compromises.

     MITIGATIONS:
       - Never render raw user HTML. Render your OWN template with user data
         inserted as ESCAPED text.
       - Block file:// and internal IP ranges at the network level; run the
         renderer in a sandboxed network namespace or a separate VPC subnet
         with no access to metadata endpoints or internal services.
       - Disable JavaScript in the render context when your template does not
         need it.
       - Set a strict CSP on the page being rendered.

  2. XSS INTO THE PDF.
     Unescaped user data in the template becomes markup, not text. Use a
     templating engine that escapes by default and never bypass it for
     user-controlled values.

  3. RESOURCE EXHAUSTION.
     A deliberately enormous or deeply nested document can hang the renderer
     and exhaust memory. Always set a timeout on the render, cap page count,
     cap input size, and run with a memory limit.

  4. MALICIOUS PDFs ON THE WAY IN.
     PDFs can embed JavaScript, launch actions, and embedded files. If you
     accept uploads:
       - Validate the magic bytes (%PDF-), not the file extension or the
         client-supplied Content-Type.
       - Cap the size.
       - Consider sanitising via qpdf, or rasterising to images if you only
         need to display it.
       - Run any parsing in a sandbox — PDF parsers have a long history of
         memory-safety bugs.
       - Serve user-uploaded files from a SEPARATE ORIGIN so a malicious file
         cannot reach your app's cookies.

  5. DATA LEAKAGE IN THE OUTPUT.
     ‼️ Drawing a black rectangle over text does NOT redact it — the text is
     still in the content stream. Real redaction removes the underlying
     content. Also strip metadata (author, creation software, and in some
     tools file paths) before distributing documents externally.

  6. SIGNED URLS ARE BEARER TOKENS.
     Anyone with the link can download. Keep expiries short, authorise before
     minting, and never put one in a query string that gets logged.
```

---

## 15. Performance & Scaling

```text
‼️ TYPICAL NUMBERS, so you can sanity-check your own:

  OPERATION                                     TIME        MEMORY
  ───────────────────────────────────────────────────────────────────
  PDFKit, simple 1-page invoice                 5-20ms      ~5MB
  PDFKit, 100-page report                       200-800ms   ~30MB
  @react-pdf/renderer, 1 page                   50-200ms    ~20MB
  Headless Chrome, 1 page (browser reused)      300ms-1.5s  ~150MB
  Headless Chrome, 1 page (cold launch)         1.5-4s      ~250MB
  PDF.js, render one page to canvas             20-200ms    varies
  OCR one page (Tesseract)                      1-5s        ~200MB

  ‼️ The headline: Chrome is 20-100x more expensive than programmatic drawing.
     That is the price of writing your layout in CSS. It is often worth paying
     — just do it knowingly, and do not put it in the request path.
```

```text
OPTIMISATION, in order of impact:

  1. CACHE THE OUTPUT. PDFs are usually deterministic. Hashing the input and
     checking object storage turns most requests into a lookup. Nothing else
     on this list comes close.

  2. REUSE THE BROWSER. One long-lived browser, a fresh context per job.
     Saves 0.5-3s per render.

  3. QUEUE AND CAP CONCURRENCY. Protects memory and gives you back-pressure
     instead of an OOM.

  4. STREAM RATHER THAN BUFFER. PDFKit streams; piping to the response or to
     S3 keeps memory flat regardless of document size.

  5. OPTIMISE IMAGES BEFORE EMBEDDING. A 4000px photo scaled to a 200px box
     still embeds at full size unless you resize it first. This is usually the
     largest single contributor to file size.

  6. SUBSET FONTS.

  7. SEPARATE THE DEPLOYMENT. Give the PDF worker its own service with its own
     memory limits and scaling rules. Its resource profile has nothing in
     common with your API's.

  8. PRE-GENERATE. If you know a monthly statement is needed, build it on a
     schedule rather than when the user clicks.
```

---

## 16. Library Decision Table

```text
NODE / JAVASCRIPT

  GENERATE FROM HTML
    playwright / puppeteer   Headless Chrome. ‼️ The default for design-led
                             documents. Heavy but productive.
    @sparticuz/chromium      Chrome packaged for AWS Lambda.

  GENERATE PROGRAMMATICALLY
    pdfkit                   Mature, streaming, good font support. ‼️ The
                             default for high-volume simple documents.
    pdf-lib                  Create AND edit. Pure JS, runs in the browser.
                             ‼️ The only real choice for MODIFYING PDFs.
    @react-pdf/renderer      JSX + flexbox subset. Good middle ground; works
                             client-side too.

  RENDER / DISPLAY
    pdfjs-dist               Mozilla's renderer. The foundation of everything.
    react-pdf                React wrapper around PDF.js. ‼️ The usual choice.
    PSPDFKit / Apryse        Commercial. For annotation editing, forms,
                             signatures, redaction.

  EXTRACT
    pdf-parse                Quick text extraction. Fine for search indexing.
    pdfjs-dist               Positional extraction when layout matters.
    tesseract.js             OCR in JS. Slow; prefer a cloud OCR at volume.

PYTHON  (worth knowing — often better tooling for extraction)
    WeasyPrint      HTML/CSS → PDF without a browser. Much lighter than
                    Chrome; supports a good chunk of paged-media CSS.
    ReportLab       The mature programmatic library. Very capable.
    pypdf           Merge, split, rotate, encrypt.
    pdfplumber      ‼️ The best open-source TABLE extraction available.
    PyMuPDF         Very fast rendering and extraction (C-backed).

COMMAND LINE  (useful in pipelines and Dockerfiles)
    qpdf            Structural repair, encryption, decryption, linearisation.
    pdftk           Merge, split, stamp, form filling.
    ghostscript     Convert, compress, rasterise. ‼️ Has a history of CVEs —
                    keep it patched and sandboxed if it touches user input.
    poppler-utils   pdftotext, pdftoppm, pdfimages. Fast and dependable.
```

---

## 17. Common Pitfalls

```text
‼️ 1. Generating PDFs inside the HTTP request.
   Works in development, times out in production. Queue it (§10).

‼️ 2. Launching a new browser per render.
   0.5-3 seconds and hundreds of MB, every time. Reuse one browser, new
   context per job.

‼️ 3. Not closing browser contexts.
   Leaked renderer processes, steady memory growth, OOM kill a few hours
   later. Close in a finally block.

‼️ 4. Forgetting printBackground: true.
   Backgrounds and colours silently vanish. The most-asked HTML-to-PDF
   question, every time.

‼️ 5. Not waiting for fonts and images.
   Intermittent PDFs of half-loaded pages. Use waitUntil: 'networkidle' AND
   document.fonts.ready.

‼️ 6. Forgetting the PDF.js worker configuration.
   Either an outright failure or the main thread freezes on every render.

‼️ 7. Passing an inline object to react-pdf's `file` prop.
   New reference every render → the document reloads forever.

‼️ 8. No HTTP Range support on the file server.
   The entire PDF downloads before the first page appears. Check
   Accept-Ranges.

‼️ 9. Rendering every page of a long document at once.
   Memory exhaustion and a crashed tab. Virtualise.

‼️ 10. Forgetting the bottom-left origin.
   Content drawn upside down or off the page. y increases UPWARD.

‼️ 11. Assuming extracted text is in reading order.
   Multi-column documents interleave. And scanned PDFs have no text at all —
   check before building on it.

‼️ 12. "Redacting" with a black rectangle.
   The text is still in the file. A genuine data-breach pattern that has
   embarrassed governments and law firms repeatedly.

‼️ 13. Rendering user-supplied HTML.
   SSRF straight into your cloud metadata endpoint. Render your own template
   with escaped data.

‼️ 14. Not embedding fonts.
   The document looks different on every machine, which defeats the point of
   using a PDF.

‼️ 15. Embedding full-size images.
   A 20MB invoice. Resize before embedding.

‼️ 16. Treating PDF permissions as security.
   "Printing not allowed" is a request the viewer may ignore. It is not a
   control.
```

---

## Related Files

- [AI-MULTIMODAL-VISION-DEEP.md](AI-MULTIMODAL-VISION-DEEP.md) — extracting data from PDFs with vision models
- [NESTJS-DEEP.md](NESTJS-DEEP.md) — §22 queues and background jobs, the pattern §10 relies on
- [MICROSERVICES-DEEP.md](MICROSERVICES-DEEP.md) — separating a heavy worker from your API
- [WEB-SECURITY-FRONTEND-DEEP.md](WEB-SECURITY-FRONTEND-DEEP.md) — SSRF, XSS, file upload handling
- [PERFORMANCE-DEEP.md](PERFORMANCE-DEEP.md) — streaming, caching, asset optimisation
