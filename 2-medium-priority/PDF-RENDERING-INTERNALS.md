# PDF Rendering & Generation — Internals, Architecture, Libraries

**Priority: MEDIUM**

> What a PDF actually is at the byte level, the version and conformance standards, how
> browsers render one, how to generate one on a backend, where PDF work belongs in your
> architecture, and which libraries are actually maintained.
>
> Covers both halves of the problem: displaying PDFs (frontend) and producing them (backend).
> Library status checked September 2026 — see §18, and re-check before adopting.

---

## Table of Contents

- [PDF Rendering \& Generation — Internals, Architecture, Libraries](#pdf-rendering--generation--internals-architecture-libraries)
  - [Table of Contents](#table-of-contents)
  - [1. What a PDF Actually Is](#1-what-a-pdf-actually-is)
  - [2. Inside the File Format](#2-inside-the-file-format)
  - [3. PDF Versions \& Standards](#3-pdf-versions--standards)
  - [4. Why PDFs Are Harder Than They Look](#4-why-pdfs-are-harder-than-they-look)
  - [5. The Two Problems: Rendering vs Generating](#5-the-two-problems-rendering-vs-generating)
  - [6. Frontend — How PDF.js Renders a PDF](#6-frontend--how-pdfjs-renders-a-pdf)
  - [7. Frontend — Displaying PDFs in Practice](#7-frontend--displaying-pdfs-in-practice)
    - [First: your users are not using Acrobat](#first-your-users-are-not-using-acrobat)
    - [Choosing how to display them](#choosing-how-to-display-them)
  - [8. Backend — The Three Generation Strategies](#8-backend--the-three-generation-strategies)
  - [9. Backend — HTML to PDF with Headless Chrome](#9-backend--html-to-pdf-with-headless-chrome)
  - [10. Backend — Programmatic Drawing](#10-backend--programmatic-drawing)
  - [11. Architecture — Where PDF Work Belongs](#11-architecture--where-pdf-work-belongs)
  - [12. Manipulating Existing PDFs](#12-manipulating-existing-pdfs)
  - [13. Embedded Files, Data \& Media](#13-embedded-files-data--media)
    - [Embedded files (attachments)](#embedded-files-attachments)
    - [The big use case — hybrid documents and e-invoicing](#the-big-use-case--hybrid-documents-and-e-invoicing)
    - [Structured metadata](#structured-metadata)
    - [Audio and video — the honest position](#audio-and-video--the-honest-position)
    - [Security of embedded content](#security-of-embedded-content)
  - [14. Extracting Text \& Data](#14-extracting-text--data)
  - [15. Fonts — The Usual Source of Pain](#15-fonts--the-usual-source-of-pain)
  - [16. Security](#16-security)
  - [17. Performance \& Scaling](#17-performance--scaling)
  - [18. Library Landscape \& Maintenance Status](#18-library-landscape--maintenance-status)
  - [19. Common Pitfalls](#19-common-pitfalls)
  - [Related Files](#related-files)

---

## 1. What a PDF Actually Is

```text
‼️ THE MENTAL MODEL THAT EXPLAINS EVERYTHING ELSE:

   A PDF is not a document. ‼️It is a PROGRAM that draws a document.‼️

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
  │               offset.‼️Read from LAST, not first — which is why │
  │               a PDF viewer needs the END of the file before │
  │               it can show the beginning. ‼️                 │
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
‼️ HOW THE FILE ACTUALLY FINDS PAGE 200 — the two-step lookup.

   This is the question the structure above raises and does not answer, and
   getting it straight explains why the whole format is shaped this way.

   ‼️ THE XREF TABLE KNOWS NOTHING ABOUT PAGES. It only maps
      ‼️OBJECT NUMBER → BYTE OFFSET. It is an ADDRESS BOOK, not an index.

   What maps a PAGE NUMBER to an object number is a separate structure: the
   PAGE TREE.‼️

     Catalog (obj 1)
       └─ /Pages → obj 2
            ├─ /Count 1000            ← how many pages live under this node
            └─ /Kids [obj 3, obj 4, ...]
                 ├─ obj 3: /Count 500    ← a subtree holding pages 1-500
                 └─ obj 4: /Count 500    ← a subtree holding pages 501-1000

   SO OPENING PAGE 200 IS TWO LOOKUPS:

     1. WALK THE PAGE TREE.
        Read /Count at each node and skip whole subtrees. Page 200 is under
        obj 3, so obj 4 and everything beneath it is never touched. You arrive
        at "page 200 is object 417" without reading 199 pages.
        ‼️ /Count is what makes this a fast DESCENT rather than a scan — it is
           the reason page access is roughly logarithmic, not linear.

     2. LOOK UP OBJECT 417 IN THE XREF TABLE.
        → byte 2,847,392. Seek there. Read it.

   ‼️AND THE IMAGE ON THAT PAGE IS THE SAME PATTERN, ONE LEVEL DEEPER.
   The page object says:

       /Resources << /XObject << /Im1 892 0 R >> >>

   "892 0 R" is a reference to object 892 — so back to the xref table, get its
   byte offset, seek, and read the image stream.

   ‼️ THE GENERAL PRINCIPLE, WHICH IS THE WHOLE FORMAT IN ONE LINE:
      EVERYTHING IS AN OBJECT NUMBER, AND XREF TURNS ANY OBJECT NUMBER INTO A
      FILE POSITION.‼️
      The page tree, resources, fonts, annotations and content streams are all
      just objects pointing at other objects by number. That indirection, plus
      the offset table, is what makes a PDF RANDOMLY ACCESSIBLE instead of
      something you must read from front to back.
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

  Content streams and images are almost always compressed ‼️— /Filter /FlateDecode
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
     no quality loss, and very fast.‼️

OBJECT STREAMS AND INCREMENTAL UPDATES

  PDF 1.5+ can pack many small objects into one compressed "object stream",
  which is why a modern PDF is mostly opaque.

  ‼️ INCREMENTAL UPDATE is worth knowing for security reasons: editing a PDF can
     APPEND a new body + xref to the end rather than rewriting the file. The old
     content is still in there. "Redacting" a PDF by drawing a black box and
     saving does NOT remove the text underneath — it is still in the file and
     trivially extractable. This has caused repeated real-world leaks of
     redacted court and government documents.‼️
```

---

## 3. PDF Versions & Standards

```text
‼️ THE GOOD NEWS FIRST: PDF IS REMARKABLY BACKWARDS COMPATIBLE.

   PDF 2.0 (ISO 32000-2) was expressly designed to remain compatible with
   ISO 32000-1 (PDF 1.7) and the earlier Adobe specifications. No change in
   PDF 2.0 broke software built against previous editions.

   ‼️ WHAT THIS MEANS IN PRACTICE: a PDF 1.4 file from 2001 opens fine in any
      modern viewer, and a viewer that understands 1.7 will open a 2.0 file —
      ‼️it just ignores the features it does not know about. ‼️Unknown keys are
      skipped rather than treated as errors, which is the design decision that
      makes the whole format durable.

      So "which PDF version should I target?" is rarely a real problem. You
      only care when you need a SPECIFIC feature (see the table) or a
      SPECIFIC CONFORMANCE STANDARD (see below) — and the latter is where the
      real requirements live.
```

```text
THE VERSION HISTORY — what each one actually added

  PDF 1.0  1993   The original. Adobe proprietary.
  PDF 1.2  1996   Interactive form fields (AcroForms), compression filters
  PDF 1.3  2000   Digital signatures, JavaScript, embedded files
  PDF 1.4  2001   ‼️ TRANSPARENCY, 128-bit RC4. The baseline most older tools
                  target, and where PDF/A-1 sits.
  PDF 1.5  2003   ‼️ OBJECT STREAMS and cross-reference streams — the reason
                  modern PDFs look like binary noise. Also optional content
                  (layers) and JPEG 2000.
  PDF 1.6  2004   AES-128 encryption, 3D content, OpenType embedding
  PDF 1.7  2006   ‼️ Became ISO 32000-1:2008 — the first ISO version, and
                  still the most widely targeted. If in doubt, target 1.7.
  PDF 2.0  2017   ‼️ ISO 32000-2. First ISO-led revision, developed
       (rev 2020)  INDEPENDENTLY OF ADOBE. Adds AES-256, DEPRECATES the
                  insecure RC4 encryption, adds unencrypted wrappers and
                  better digital signature support, and — underrated —
                  clarifies a large number of ambiguities in clauses shared
                  with 1.7. Those clarifications help even if you only ever
                  target 1.7.

‼️ THE PRACTICAL POSITION IN 2026
   - Most tooling writes PDF 1.4 to 1.7. That is fine, and interoperable.
   - PDF 2.0 support in libraries is still uneven. Do not require it unless
     you have a reason.
   - ‼️ THE ONE VERSION FACT WORTH ACTING ON: if you are encrypting PDFs, you
     want AES-256, which means PDF 2.0 (or the AES-256 revision introduced in
     Adobe's 1.7 Extension Level 3). RC4 is broken and should never be used.
```

```text
‼️ THE CONFORMANCE STANDARDS — THESE MATTER MORE THAN THE VERSION NUMBER.

   These are SUBSETS of PDF with extra rules, each designed for a purpose.
   When a client or a regulator says "we need PDF/A", they are asking for one
   of these, and it constrains your tool choice significantly.

  PDF/A  — ARCHIVING (ISO 19005)
    The most commonly demanded. Rules that make a file readable in 50 years:
      ‼️ ALL FONTS MUST BE EMBEDDED (no substitution, ever)
      No JavaScript, no executable content, no external references
      No encryption
      Device-independent colour (embedded colour profiles)
      XMP metadata required
    VARIANTS: PDF/A-1 (based on 1.4), A-2 (1.7, adds JPEG2000 and
    transparency), A-3 (allows arbitrary embedded attachments — used for
    e-invoicing), A-4 (based on PDF 2.0).
    CONFORMANCE LEVELS: -b (basic, visual fidelity only), -a (accessible,
    requires full tagging), -u (Unicode mapping required).
    ‼️ WHO ASKS FOR IT: governments, courts, regulated industries, long-term
       records. Frequently non-negotiable.

  PDF/UA — ACCESSIBILITY (ISO 14289)
    Requires a proper TAGGED STRUCTURE TREE: real headings, reading order,
    table structure, alt text on images, language declaration.
    ‼️ THE HARD TRUTH: almost nothing generates this by default. Headless
       Chrome does not produce properly tagged PDFs, and neither do most
       programmatic libraries. If PDF/UA is a requirement, it changes your
       tool choice and it is a substantial piece of work — budget for it
       rather than discovering it late.

  PDF/X  — PRINT PRODUCTION (ISO 15930)
    Commercial printing. Embedded fonts, CMYK/spot colour, defined bleed and
    trim boxes, no transparency in some variants.
    ‼️ WHO ASKS FOR IT: print vendors. If you are generating artwork for
       physical printing, ask which PDF/X variant they require BEFORE you build.

  PDF/E  — ENGINEERING (ISO 24517). CAD and technical documents, 3D.
  PDF/VT — VARIABLE DATA printing (ISO 16612-2). Personalised mail at volume.

‼️ THE QUESTION TO ASK AT THE START OF ANY PDF PROJECT:‼️
   "Does this need to meet PDF/A, PDF/UA, or PDF/X?"
   Retrofitting conformance is far more expensive than building for it, and
   it can invalidate your entire tool choice. Ask before you write code.
```

## 4. Why PDFs Are Harder Than They Look

```text
‼️ The things that surprise people building PDF features. Read this before
   estimating any PDF ticket.‼️

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

  4. FONTS MAY OR MAY NOT BE EMBEDDED.‼️
     ‼️A non-embedded font is substituted by the viewer, so the document looks
     different on different machines — defeating the point of PDF. And
     subsetted fonts (only the glyphs actually used) break text extraction if
     the mapping table is missing or wrong.

  5. THERE IS NO "PAGE 1 OF A DOCUMENT" IN THE HTML SENSE.
     Page breaks are decided at generation time. Getting a table header to
     repeat across pages, or avoiding an orphaned row, is genuinely fiddly in
     every tool.

  6. FILE SIZE EXPLODES EASILY.‼️
     Embedding a full Unicode font is megabytes. Unsubsetted fonts, uncompressed
     images, and duplicated resources routinely turn a 3-page invoice into 20MB.

  7. ACCESSIBILITY IS OPT-IN AND USUALLY ABSENT.
     A screen-reader-friendly PDF needs a tagged structure tree (PDF/UA). Almost
     nothing generates this by default. If accessibility is a requirement, it
     changes your tool choice — most HTML-to-PDF pipelines produce untagged
     output.
```

---

## 5. The Two Problems: Rendering vs Generating

```text
‼️ These are completely different engineering problems with different tools,
   and conflating them is the first mistake.

  RENDERING (you have a PDF, show it to a user)
    Happens: usually in the BROWSER
    Core question: how do I turn drawing instructions into pixels?
    Main tools: PDF.js (pdfjs-dist), react-pdf, @embedpdf/core
    Difficulties: performance on large files, text selection, search,
                  annotations, mobile

  GENERATING (you have data, produce a PDF)
    Happens: usually on the BACKEND
    Core question: how do I lay out content and emit drawing instructions?
    Main tools: headless Chrome, PDFKit, @react-pdf/renderer‼️
    Difficulties: layout control, page breaks, fonts, performance, cost

  ‼️ WATCH THE TWO SIMILARLY-NAMED PACKAGES — they are in DIFFERENT categories
     and mixing them up is the single most common naming confusion here:
       react-pdf             (wojtekmaj)  → a VIEWER. Wraps PDF.js. RENDERING.
       @react-pdf/renderer                → a GENERATOR. JSX → PDF. GENERATING.
     Same words, opposite jobs.

  MANIPULATING (you have a PDF, change it)
    Happens: backend
    Examples: merge, split, stamp a watermark, fill a form, add a signature
    Main tools: a maintained pdf-lib fork (§17), qpdf, pdftk

  EXTRACTING (you have a PDF, get data out)
    Happens: backend
    Main tools: unpdf, pdf.js, pdfplumber (Python), Tesseract for scans,
                or a vision LLM for messy real-world documents
```

---

## 6. Frontend — How PDF.js Renders a PDF

```text
‼️ PDF.js is Mozilla's PDF renderer, written in JavaScript. It is what Firefox
   uses as its built-in viewer, and ‼️it is what essentially every "PDF in a web
   app" feature is built on. Understanding its pipeline explains both its
   performance characteristics and its quirks.

THE PIPELINE

  1. FETCH
     The file is downloaded — or, better, RANGE-REQUESTED. PDF.js can fetch
     just the trailer and xref,‼️ then pull individual pages on demand, so a
     200MB file can open in under a second.
     ‼️ This requires the server to support HTTP Range requests
     (Accept-Ranges: bytes). Without it, the whole file downloads before
     anything appears. This is the #1 "why is our viewer so slow" cause.‼️

  2. PARSE
     Read the trailer → xref → catalogue → page tree. Now it knows the page
     count and can locate any page's objects by byte offset.

  3. BUILD AN OPERATOR LIST
     The page's content stream is decompressed and parsed into an intermediate
     representation — ‼️ an array of drawing operations with their arguments.
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
     ‼️ THE PART THAT SURPRISES PEOPLE: the canvas is just pixels,‼️ so you cannot
     select or search it. PDF.js separately renders an INVISIBLE HTML layer of
     absolutely-positioned, transparent <span> elements aligned over the
     canvas glyphs.‼️‼️
     Selecting text selects those spans. Ctrl+F searches them. Screen readers
     read them.
     This is also why PDF text selection in browsers feels slightly wrong —
     you are selecting a best-effort HTML approximation overlaid on a picture.‼️

  6. OVERLAY THE ANNOTATION LAYER
     Links, form fields, and comments become real HTML elements on top, so
     they are clickable and focusable.‼️

  ‼️ WORKER ARCHITECTURE: steps 2-3 run in a WEB WORKER (pdf.worker.js), ‼️ off
     the main thread. Parsing a complex page is CPU-heavy and would otherwise
     freeze the UI. This is why every PDF.js setup requires you to configure a
     worker path — and why forgetting to is the most common setup error.‼️
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
  // getDocument returns a task with a promise.‼️ It also exposes onProgress,
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
  // CSS. Skipping this is why so many in-app PDF viewers look fuzzy.‼️
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
  // This is the main performance mistake in hand-rolled viewers.‼️
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

## 7. Frontend — Displaying PDFs in Practice

### First: your users are not using Acrobat

```text
‼️ BEFORE CHOOSING A VIEWER, UNDERSTAND THAT THE SAME PDF IS RENDERED BY
   COMPLETELY DIFFERENT SOFTWARE DEPENDING ON WHERE IT IS OPENED.

── 1. FOUR DIFFERENT ENGINES, NOT ONE ──────────────────────────────────────

  Acrobat / Reader   Adobe's own — the REFERENCE IMPLEMENTATION of a
                     specification Adobe wrote.
  Firefox            PDF.js — an independent JAVASCRIPT REIMPLEMENTATION.
  Chrome / Edge      PDFium — C++, Google's, originally derived from Foxit.
  Safari / iOS       Apple's own renderer.

  ‼️ Four separate codebases, four sets of bugs, all reading the same file.
     There is no single "PDF renderer" to test against.‼️‼️

── 2. FEATURE SUPPORT IS WILDLY ASYMMETRIC ─────────────────────────────────

  Acrobat implements essentially the whole specification. Browsers implement
  the subset needed to put a page on screen.

                                    ACROBAT      BROWSERS
    Embedded audio / video            ✅            ❌
    XFA forms (Adobe's XML forms)     ✅            ❌
    PDF JavaScript                    ✅ full       ⚠️ limited to none
    Digital signature validation      ✅ shows      ❌ mostly ignored
                                         trust chain
    Attachments panel                 ✅            ⚠️ patchy
    Layers, 3D content, redaction     ✅            ❌

── 3. COLOUR AND FIDELITY ──────────────────────────────────────────────────

  Acrobat does real COLOUR MANAGEMENT — ICC profiles, CMYK, overprint
  simulation. Browsers generally convert everything to sRGB and move on.‼️
  ‼️ For a print-destined PDF that difference is the whole ballgame. For a web
     invoice it does not matter at all. Know which you are producing.

  Font substitution also differs when fonts are not embedded, so the same file
  can paginate DIFFERENTLY in different viewers — which is precisely the
  failure PDF exists to prevent. See §15.

── 4. SECURITY POSTURE ─────────────────────────────────────────────────────

  Browsers sandbox aggressively: no JavaScript execution, no external resource
  loading, no launch actions.
  ‼️ Acrobat historically allowed all of that, which is exactly why PDFs became
     a malware delivery vector. See §16.

‼️ THE PRACTICAL CONSEQUENCE, AND THE POINT OF THIS WHOLE BLOCK:

   "IT LOOKS RIGHT IN ACROBAT" IS NOT A TEST.

   Most people now open PDFs in whatever their browser or phone does by
   default, and that is a strictly LESS CAPABLE renderer than Acrobat. Acrobat
   will flatter your file by supporting things your users' viewers will not.

   ‼️ SO: TEST YOUR GENERATED PDFs IN CHROME AND ON A PHONE, not only in
      Acrobat. If a feature only works in Acrobat, treat it as unavailable
      unless you know your audience uses it.
```

### Choosing how to display them

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
import 'react-pdf/dist/Page/TextLayer.css'; // ‼️ required, or text
import 'react-pdf/dist/Page/AnnotationLayer.css'; // selection is misaligned

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  // ‼️ MEMOISE THE FILE PROP. react-pdf reloads the entire document whenever
  // this prop changes by reference. An inline object literal
  // ({ url, httpHeaders: {...} }) is a NEW object every render, so the PDF
  // reloads on every render — an infinite fetch loop. This is the single most
  // common react-pdf bug.‼️
  const file = useMemo(() => ({ url }), [url]);

  return (
    <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)} onLoadError={error => console.error(error)} loading={<Skeleton />}>
      <Page
        pageNumber={pageNumber}
        // ‼️ Render at the container's width rather than a fixed scale, or the
        // document overflows on mobile.‼️‼️
        width={containerWidth}
        renderTextLayer={true} // selection + search; disable for pure
        // display to save significant CPU
        renderAnnotationLayer={true} // clickable links and form fields
      />
    </Document>
  );
}
```

```text
‼️ PERFORMANCE RULES FOR A WEB PDF VIEWER — in order of impact:

  1. ENABLE HTTP RANGE REQUESTS on whatever serves the file. S3 and CloudFront
     do by default; a naive Express res.sendFile with the wrong headers does
     not. This alone is often the difference between 0.5s and 30s to first page.‼️

  2. NEVER RENDER ALL PAGES AT ONCE. A 500-page document rendered eagerly will
     exhaust memory and crash the tab. Virtualise: render the visible pages
     plus one or two either side.

  3. CANCEL IN-FLIGHT RENDERS on scroll and zoom.‼️

  4. DISABLE THE TEXT LAYER if you do not need selection or search. It is a
     meaningful share of the rendering cost.‼️

  5. CALL page.cleanup() on pages that scroll out of view.‼️

  6. USE THUMBNAILS for page navigation, rendered at a tiny scale (0.2) and
     cached — do not render full pages for a sidebar.‼️
```

---

## 8. Backend — The Three Generation Strategies

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

## 9. Backend — HTML to PDF with Headless Chrome

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
  break-inside: avoid; /* don't split this block across pages */
}
.chapter {
  break-before: page; /* always start on a new page */
}
h2 {
  break-after: avoid; /* ‼️ never leave a heading alone at the bottom
                               of a page with its content overleaf */
}
p {
  orphans: 3; /* min lines left at the bottom of a page */
  widows: 3; /* min lines carried to the top of the next */
}

/* ‼️ REPEATING TABLE HEADERS across page breaks. This works in Chrome and is
   one of the genuine advantages of the HTML approach — doing it by hand in
   PDFKit is real work. */
thead {
  display: table-header-group;
}
tfoot {
  display: table-footer-group;
}

/* Hide interactive chrome that makes no sense on paper */
@media print {
  .no-print,
  nav,
  button {
    display: none !important;
  }

  /* Show link destinations, since you cannot click paper */
  a[href^='http']::after {
    content: ' (' attr(href) ')';
    font-size: 0.8em;
  }
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

## 10. Backend — Programmatic Drawing

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

## 11. Architecture — Where PDF Work Belongs

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

## 12. Manipulating Existing PDFs

```javascript
// ‼️ pdf-lib is the standard Node library for EDITING PDFs. It can create them
// too, but its real strength is reading an existing file and changing it. Pure
// JavaScript, works in the browser as well as Node, and needs no binaries.
//
// ‼️ IMPORTANT — USE A MAINTAINED FORK, NOT THE ORIGINAL PACKAGE.
// The original `pdf-lib` (Hopding/pdf-lib) is ARCHIVED and unmaintained. See
// §17. The forks keep the identical API, so switching is a one-line change:
//
//     npm uninstall pdf-lib
//     npm install @cantoo/pdf-lib          # or @pdfme/pdf-lib
//
// ...and then change only the import. Everything below is unchanged.
import { PDFDocument, rgb, degrees, StandardFonts } from '@cantoo/pdf-lib';
// was:  from 'pdf-lib'  ← unmaintained, still works, no security patches

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
// ‼️ pdf-lib (and its forks) do NOT support encryption. Use qpdf (a CLI):
//   qpdf --encrypt <userpw> <ownerpw> 256 -- in.pdf out.pdf
// And note that PDF "permissions" (no printing, no copying) are advisory —
// the viewer chooses to honour them. They are not a security control; any
// determined user can strip them in seconds.
```

## 13. Embedded Files, Data & Media

```text
‼️ "EMBEDDING THINGS IN A PDF" MEANS THREE VERY DIFFERENT THINGS, with wildly
   different levels of real-world support. Separate them before you plan
   anything.

  1. EMBEDDED FILES / ATTACHMENTS       ✅ WORKS WELL, WIDELY SUPPORTED
     Arbitrary files carried inside the PDF — XML, CSV, images, other PDFs.
     Shown in the viewer's attachments panel.
     ‼️ This is the one that matters commercially. See e-invoicing below.

  2. STRUCTURED METADATA                ✅ WORKS WELL
     XMP metadata, custom document properties, form field data.
     Machine-readable, no UI.

  3. AUDIO AND VIDEO                    ❌ LARGELY BROKEN IN PRACTICE
     Technically in the specification. ‼️ Does not play in browsers, does not
     play in PDF.js, does not play in most mobile viewers. See below before
     promising anyone this works.
```

### Embedded files (attachments)

```text
HOW IT WORKS IN THE FORMAT

  Attachments live in the document catalogue under /Names → /EmbeddedFiles,
  as a name tree of file specification dictionaries. Each holds the file's
  bytes (usually Flate-compressed), its name, MIME type, size and dates.

  ‼️ PDF 2.0 AND PDF/A-3 ADD THE /AF KEY — "ASSOCIATED FILES".
     This is the important modern mechanism. /AF declares a RELATIONSHIP
     between the attachment and the document, which is what lets a machine
     know the attachment is not just a random extra file:

       /Source       the attachment is the source this PDF was made from
       /Data         the attachment is data used to generate the visual
       /Alternative  ‼️ the attachment is an ALTERNATIVE REPRESENTATION of the
                     same content — the key used by e-invoicing
       /Supplement   supplementary material
       /Unspecified  no declared relationship

  ‼️ WHY THE RELATIONSHIP MATTERS: it turns "a PDF with a file stapled to it"
     into "a document that is simultaneously human-readable and
     machine-readable". That distinction is the whole basis of the hybrid
     document formats below.
```

```javascript
// ── ATTACHING A FILE ─────────────────────────────────────────────────────
// Using a maintained pdf-lib fork (see §18).
import { PDFDocument, AFRelationship } from '@cantoo/pdf-lib';

const pdfDoc = await PDFDocument.load(existingPdfBytes);

await pdfDoc.attach(xmlBytes, 'factur-x.xml', {
  mimeType: 'application/xml',
  description: 'Factur-X EN 16931 invoice data',
  creationDate: new Date(),
  modificationDate: new Date(),

  // ‼️ THE CRITICAL FIELD for any machine-readable use. Without the right
  // relationship the attachment is just a file — validators and automated
  // processors will not recognise it as the document's data representation.
  afRelationship: AFRelationship.Alternative,
});

const bytes = await pdfDoc.save();
```

```javascript
// ── EXTRACTING ATTACHMENTS ───────────────────────────────────────────────
// ‼️ Less convenient than attaching — you walk the catalogue yourself.
// (Some forks expose a helper; check yours before writing this by hand.)
const namesDict = pdfDoc.catalog.lookup(PDFName.of('Names'), PDFDict);
const embedded = namesDict?.lookup(PDFName.of('EmbeddedFiles'), PDFDict);
const names = embedded?.lookup(PDFName.of('Names'), PDFArray);

// The name tree alternates [name, fileSpec, name, fileSpec, ...]
for (let i = 0; i < (names?.size() ?? 0); i += 2) {
  const fileName = names.lookup(i, PDFString).asString();
  const fileSpec = names.lookup(i + 1, PDFDict);
  const stream = fileSpec.lookup(PDFName.of('EF'), PDFDict).lookup(PDFName.of('F'), PDFStream);
  const contents = decodePDFRawStream(stream).decode(); // the file bytes
}

// ‼️ FOR A ONE-OFF OR A PIPELINE, THE CLI IS FAR EASIER:
//   pdfdetach -list invoice.pdf          # what's in there
//   pdfdetach -saveall invoice.pdf       # pull them all out
// (pdfdetach ships with poppler-utils.)
```

### The big use case — hybrid documents and e-invoicing

```text
‼️ THE MOST COMMERCIALLY IMPORTANT APPLICATION OF EMBEDDED FILES, and the
   reason this section exists at all.

THE PROBLEM IT SOLVES
  An invoice needs to be readable by a HUMAN (a PDF that looks like an
  invoice) and by a MACHINE (structured data a system can post automatically,
  with no OCR and no parsing guesswork). Historically you sent both — a PDF
  and an XML file — and they drifted apart or one got lost.

THE SOLUTION: A HYBRID DOCUMENT
  ‼️ One PDF/A-3 file containing BOTH: the visual invoice, plus the structured
     XML embedded as an Associated File with relationship /Alternative.
     One file, one source of truth, impossible to separate.

THE STANDARDS
  FACTUR-X (France) and ZUGFeRD (Germany) are ‼️ TECHNICALLY IDENTICAL since
  ZUGFeRD 2.1 (2020) — the same XML schema, the same PDF/A-3 container, the
  same profile hierarchy. One Franco-German specification with two names.

  - The XML uses UN/CEFACT CII (Cross Industry Invoice) syntax, one of the two
    syntaxes permitted by EN 16931. ‼️ Factur-X is CII only — it does not use
    UBL, which is the other EN 16931 syntax.
  - ‼️ THE FILENAME IS FIXED AND MATTERS: `factur-x.xml` for the French
    flavour, `zugferd-invoice.xml` for the German one. Validators check it.
  - Relationship must be /Alternative.
  - The container must be valid PDF/A-3 (see §3).
  - Profiles run from MINIMUM up through BASIC, EN 16931 (COMFORT) and
    EXTENDED, with increasing data requirements.

‼️ WHY THIS IS URGENT RIGHT NOW: e-invoicing mandates are live. France's B2B
   mandate takes effect in September 2026, and for it only the EN 16931 and
   EXTENDED profiles are legal — MINIMUM and BASIC are not sufficient. Germany
   and other EU states have their own timelines. ‼️ If you build invoicing
   software for European customers, this is a requirement, not a nice-to-have.

THE TWO THINGS THAT CATCH PEOPLE OUT
  1. ‼️ PDF/A-3 CONFORMANCE IS THE HARD PART, not the attachment. Your PDF must
     embed every font, carry correct XMP metadata, use device-independent
     colour, and contain no JavaScript. A PDF from headless Chrome is NOT
     PDF/A-3 out of the box — you need a post-processing step (Ghostscript
     with a PDF/A definition, or a dedicated library) and then you must
     actually validate it.
  2. ‼️ VALIDATE WITH REAL TOOLS: veraPDF for PDF/A conformance, and Mustang
     (or your buyer's own portal) for the invoice XML. "It opens in Acrobat"
     is not validation, and a rejected invoice is a payment delayed by weeks.

OTHER HYBRID USES OF THE SAME MECHANISM
  - CAD drawings with the source model attached
  - Lab reports with the raw measurement CSV
  - Contracts with the machine-readable terms
  - Scientific papers with the dataset
  ‼️ Note that PDF/A-3 was specifically loosened from PDF/A-2 to permit
     arbitrary attachments precisely for this pattern — A-2 does not allow it.
```

### Structured metadata

```text
XMP METADATA — the standard place for machine-readable document properties.
  An RDF/XML block embedded in the PDF. Title, author, creation tool,
  copyright, plus any custom schema you define.
  ‼️ REQUIRED for PDF/A conformance, and it must AGREE with the document info
     dictionary — a mismatch fails validation, and it is a common reason a
     PDF/A validator rejects an otherwise-fine file.

DOCUMENT INFO DICTIONARY — the older, simpler /Info entries (Title, Author,
  Subject, Keywords, Producer, CreationDate). Still widely read.
  ‼️ Set both, consistently.

FORM DATA — AcroForm field values live in the PDF itself. They can be
  exported as FDF or XFDF (an XML form of the same thing) for exchange.
  ‼️ Remember §12: flatten the form if the values must not be editable.

‼️ AND THE PRIVACY WARNING: metadata leaks. Author names, the software that
   made it, sometimes local file paths, and in scanned documents the device
   identity. Strip metadata before distributing documents externally —
   `exiftool -all= file.pdf`, or your library's equivalent.
```

### Audio and video — the honest position

```text
‼️ READ THIS BEFORE PROMISING ANYONE AN "INTERACTIVE PDF WITH VIDEO".

THE THREE MECHANISMS THE SPECIFICATION OFFERS

  1. /Sound AND /Movie ANNOTATIONS — PDF 1.2-era. Legacy, deprecated in
     practice, poor support. Do not build on these.

  2. /Screen ANNOTATIONS + rendition actions — PDF 1.5. Plays media via a
     media player. Better, still patchy.

  3. /RichMedia ANNOTATIONS — PDF 1.7 Extension Level 3, the modern one.
     ‼️ ORIGINALLY BUILT AROUND FLASH/SWF. Flash reached end of life at the
     end of 2020 and is gone from every browser and operating system, which
     killed a large share of existing rich-media PDFs outright.
     RichMedia can also carry H.264 video and MP3 audio directly, which is
     what current tooling produces.

‼️ WHAT ACTUALLY PLAYS, WHERE — the practical table:

  Adobe Acrobat / Reader (desktop)   ✅ Yes, this is the reference implementation
  Chrome / Edge / Firefox built-in   ❌ NO. Browsers show a placeholder or
                                        nothing at all.
  PDF.js                             ❌ NO. It does not implement media
                                        playback, and there is no sign of it
                                        being added.
  Apple Preview / macOS Quick Look   ⚠️ Partial and unreliable
  Mobile viewers (iOS/Android built-in) ❌ Generally no
  Commercial SDKs (Nutrient/PSPDFKit, Apryse)  ✅ Yes — they implement media
                                        annotations themselves and hand the
                                        stream to the browser's own player

‼️ THE CONCLUSION, STATED PLAINLY:
   EMBEDDED AUDIO AND VIDEO IN PDF IS EFFECTIVELY AN ADOBE ACROBAT FEATURE.
   If your users are on the web, on mobile, or using anything other than
   Acrobat, it will not play. Any requirement of the form "the PDF should
   contain a product video" needs this said out loud before work starts.

   It also bloats the file enormously — a few minutes of video turns a 200KB
   document into 50MB, which breaks email attachment limits and makes the PDF
   slow to open.

‼️ WHAT TO DO INSTEAD — in order of preference:
   1. A LINK to hosted media, with a poster image in the PDF. Works
      everywhere, keeps the file small, lets you change the video later, and
      gives you analytics. ‼️ Almost always the right answer.
   2. Attach the media file as a plain ATTACHMENT (above). It will not play
      inline, but the user can save and open it, and it works in every viewer.
   3. Use a commercial SDK, if inline playback in a browser is genuinely a
      hard requirement and you control the viewer.
   4. ‼️ Question whether it should be a PDF at all. "Rich interactive
      document" is what HTML is for. PDF's value is fixed, portable,
      archivable layout — the moment you want video, you are fighting the
      format's entire purpose.
```

### Security of embedded content

```text
‼️ ATTACHMENTS ARE A MALWARE DELIVERY MECHANISM, and a long-standing one.
   A PDF can carry an executable, a macro-enabled document, or a script.
   Email gateways scan attachments; many do not recursively scan files
   embedded INSIDE a PDF attachment. That gap is actively exploited.

  IF YOU ACCEPT PDF UPLOADS:
    □ Enumerate and inspect embedded files — do not assume there are none
      (`pdfdetach -list`)
    □ Scan extracted attachments with the same rules you apply to direct
      uploads
    □ ‼️ Consider stripping attachments entirely if your use case does not
      need them: qpdf and similar can rewrite the file without them
    □ Never auto-open or auto-execute anything extracted
    □ Remember PDFs can also contain JavaScript and launch actions — strip
      those too (see §16)

  IF YOU PRODUCE PDFs WITH ATTACHMENTS:
    □ Only attach what you generated yourself
    □ ‼️ Never pass a user-uploaded file straight through into a PDF you then
      send to someone else — you become the delivery vehicle
    □ Set the MIME type and relationship honestly
```

---

## 14. Extracting Text & Data

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
// ‼️ USE unpdf, NOT pdf-parse. `pdf-parse` is the package every tutorial
// recommends and it is UNMAINTAINED (see §18). `unpdf` is the maintained
// successor: same job, modern API, and it runs in Node, Deno, Bun, edge
// runtimes and the browser because it ships a serverless build of PDF.js.
import { extractText, getDocumentProxy, getMeta } from 'unpdf';

const pdf = await getDocumentProxy(new Uint8Array(buffer));

// mergePages: true returns one string; false returns an array, one per page.
// ‼️ Per-page is usually more useful — it lets you cite a page number, and it
// keeps a bad page from polluting the whole extraction.
const { totalPages, text } = await extractText(pdf, { mergePages: false });

const { info, metadata } = await getMeta(pdf); // Title, Author, Producer...

// ‼️ Good enough for search indexing and keyword matching. NOT good enough
// for anything positional — the reading order of multi-column documents is
// frequently wrong.

// THE OLD WAY, for reference, since you will meet it in existing code:
//   import pdfParse from 'pdf-parse';
//   const data = await pdfParse(buffer);
//   data.text; data.numpages; data.info;

// ── POSITIONAL EXTRACTION (when layout matters) ─────────────────────────
// PDF.js gives each text item with its transform matrix, so you can cluster
// by coordinates and reconstruct columns or tables yourself.
const page = await pdf.getPage(1);
const content = await page.getTextContent();
for (const item of content.items) {
  const [, , , , x, y] = item.transform; // position from the matrix
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

## 15. Fonts — The Usual Source of Pain

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
// ‼️ Match the fontkit package to your fork: @cantoo/pdf-lib ships its own,
// while the original pairs with @pdf-lib/fontkit. Check your fork's README.
import fontkit from '@pdf-lib/fontkit';
doc.registerFontkit(fontkit); // ‼️ required, easily forgotten
const font = await doc.embedFont(fontBytes, { subset: true });
```

---

## 16. Security

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

## 17. Performance & Scaling

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

## 18. Library Landscape & Maintenance Status

```text
‼️ READ THIS FIRST — THE MOST IMPORTANT THING IN THIS SECTION.

   THE PDF ECOSYSTEM HAS AN UNUSUALLY HIGH ABANDONMENT RATE. PDF is a large,
   tedious specification, most of these libraries are one-maintainer projects,
   and maintainers burn out. Several of the most-downloaded PDF packages on
   npm are no longer maintained — and downloads keep rising anyway, because
   tutorials and AI-generated code keep recommending them.

   ‼️ SO: DOWNLOAD COUNT IS NOT A HEALTH SIGNAL FOR PDF LIBRARIES. Check the
      last commit and the last release date yourself, before you adopt.

   HOW TO CHECK, IN THIRTY SECONDS:
     npm view <package> time.modified    # last publish
     npm view <package> versions --json  # release cadence
     Then open the GitHub repo: is it archived? When was the last commit?
     How many open issues, and how old is the newest one with a response?

   Status below is as of September 2026 and WILL drift. ‼️ Re-check before
   you commit to anything here — that is the point of this section.
```

```text
── CREATING PDFs PROGRAMMATICALLY ──────────────────────────────────────────

  PDFKit                                          ✅ HEALTHY
    ~5.3M weekly downloads. Releases within the last few months.
    Streaming API, good font support, mature.
    ‼️ THE SAFE DEFAULT for generating PDFs from scratch in Node.

  pdfmake                                         ✅ ACTIVE
    ~12k stars, 1M+ weekly downloads. Declarative document definitions
    built on top of PDFKit — easier than PDFKit for structured documents
    like invoices and reports.
    ‼️ Inherits PDFKit's limitations, since it sits on top of it.

  jsPDF                                           ✅ ACTIVE
    The highest-starred JS PDF library, stable and well maintained.
    Browser-first. Weaker text layout than PDFKit — good for simple output
    and client-side generation.

  @react-pdf/renderer                             ✅ ACTIVE
    JSX with a flexbox-like subset. Works in Node and the browser.

── EDITING EXISTING PDFs ───────────────────────────────────────────────────

  ‼️ pdf-lib (Hopding/pdf-lib)                    ❌ UNMAINTAINED — ARCHIVED
    THE MOST IMPORTANT ENTRY IN THIS TABLE.
    The original repository is ARCHIVED. No meaningful development for
    roughly two years before that. It still receives millions of downloads
    and is still what most tutorials and AI assistants recommend.

    ‼️ IT STILL WORKS. PDF is a stable format, so an unmaintained library does
       not stop functioning. The risk is not breakage — it is:
         - no security patches (‼️ and PDF parsers are a classic
           memory-safety and DoS target; see §16)
         - no fixes for malformed real-world PDFs, which is most of the
           library's actual difficulty
         - no support for newer runtimes or PDF 2.0 features
         - open bugs stay open permanently

    USE ONE OF THE MAINTAINED FORKS INSTEAD. Both keep the same API, so
    migration is a package name change:

      @cantoo/pdf-lib      ✅ Actively maintained. Keeps the original API and
                              docs, and adds features upstream never shipped
                              (full SVG drawing, content extraction).
      @pdfme/pdf-lib       ✅ The continuation the archived repo points at,
                              maintained under the pdfme project. Bug fixes
                              and additional features merged.

    ‼️ MIGRATION IS ONE LINE — see the code below.

  qpdf / pdftk (CLI)                              ✅ HEALTHY
    Structural repair, encryption, linearisation, merging. ‼️ Still the answer
    for anything pdf-lib cannot do — notably ENCRYPTION, which no maintained
    pure-JS library handles well.

── RENDERING / DISPLAY ─────────────────────────────────────────────────────

  pdfjs-dist (Mozilla)                            ✅ VERY HEALTHY
    v6.x, published within the last month. Used by thousands of packages.
    ‼️ The foundation of essentially everything in this category. Mozilla
       backing means it is one of the safest dependencies in the ecosystem.

  react-pdf (wojtekmaj)                           ✅ VERY HEALTHY
    v11.x, published within weeks. Actively tracks pdfjs-dist releases.
    ‼️ Note v11 supports only current major browsers — check that against
       your support matrix before upgrading.

  @embedpdf/core (EmbedPDF)                       ✅ ACTIVE, NEWER
    ‼️ THE INTERESTING ALTERNATIVE, because it is NOT built on PDF.js.
    It uses PDFIUM — Chrome's own PDF engine — compiled to WebAssembly.
    Framework-agnostic and HEADLESS: it gives you the engine and state, you
    build the UI. Wrappers for React, Vue, Svelte, Preact and vanilla JS.
    `@embedpdf/pdfium` is published standalone if you want PDFium-in-WASM
    without the viewer layer.
      ✓ Chrome-identical rendering fidelity; WASM rather than JS on the hot path
      ✓ Headless by design, rather than fighting a built-in UI
      ✗ ‼️ Much newer and much smaller than pdfjs-dist. By the rule at the
        bottom of this section, that makes it the riskier dependency however
        good the design is — Mozilla has maintained PDF.js for over a decade.
      ✗ Inherits PDFium's quirks instead of PDF.js's
      ‼️ Verify the licence before adopting — it is stated inconsistently
        across the project's site and npm (MIT in one place, Apache-2.0 in
        another). Both permissive; just know which applies.

  PSPDFKit / Nutrient, Apryse                     ✅ COMMERCIAL
    For annotation editing, forms, signatures, redaction — and ‼️ the only
    realistic route to inline audio/video playback on the web (see §13).
    Expensive, and worth it precisely when the alternative is building those
    yourself.

── EXTRACTING TEXT ─────────────────────────────────────────────────────────

  ‼️ pdf-parse                                    ⚠️ UNMAINTAINED
    Still extremely widely used and still recommended everywhere. Works, but
    no longer maintained.

  unpdf (unjs)                                    ✅ THE MODERN REPLACEMENT
    ~200k weekly downloads and growing. Explicitly positioned as the
    maintained successor to pdf-parse.
    ‼️ WHY IT IS BETTER: ships a serverless-optimised build of PDF.js, so it
       works in Node, Deno, Bun, edge runtimes AND the browser. Async/await
       API, TypeScript-native, extracts text, images and metadata.
    ‼️ THE DEFAULT CHOICE for new work, and especially for anything
       serverless or edge-deployed.

  pdfjs-dist                                      ✅ For POSITIONAL extraction
    When you need coordinates, not just a text blob. See §14.

── HTML → PDF ──────────────────────────────────────────────────────────────

  Playwright                                      ✅ VERY HEALTHY
    ‼️ PREFER OVER PUPPETEER for new work: better API, first-class Docker
       images, same Chromium engine, much better maintained tooling around it.

  Puppeteer                                       ✅ ACTIVE
    Still fine, still maintained. No reason to migrate an existing
    integration, but no reason to choose it fresh either.

  @sparticuz/chromium                             ✅ ACTIVE
    Chromium packaged for AWS Lambda. ‼️ The community successor to the long-
    dead chrome-aws-lambda — if you find chrome-aws-lambda in a codebase or a
    tutorial, it is abandoned; replace it.

  WeasyPrint (Python)                             ✅ ACTIVE
    HTML/CSS → PDF with no browser. Much lighter than Chromium and supports a
    good deal of paged-media CSS. ‼️ Worth knowing even in a JS shop — it is a
    genuinely different cost profile, and you can run it behind a small
    service.

  wkhtmltopdf                                     ❌ DEAD
    ‼️ ARCHIVED AND UNMAINTAINED. Built on an ancient WebKit fork, so it fails
       on modern CSS (no flexbox or grid support worth the name) and carries
       unpatched security issues. Still all over the internet in tutorials.
       DO NOT START ANYTHING NEW WITH IT. Migrate to Playwright or WeasyPrint.

── PYTHON (often better for extraction) ────────────────────────────────────

  pypdf                ✅ Active. Merge, split, rotate, encrypt. (‼️ PyPDF2 is
                          deprecated and merged back into pypdf — if you see
                          PyPDF2, update it.)
  pdfplumber           ✅ Active. ‼️ Still the best open-source TABLE
                          extraction available in any language.
  PyMuPDF              ✅ Very active. Fast C-backed rendering and extraction.
                          ‼️ Check the licence — AGPL, with a commercial
                          option. This catches teams out.
  ReportLab            ✅ Active. The mature programmatic library.
  WeasyPrint           ✅ Active. See above.
```

```text
‼️ THE STANDING RULE FOR THIS ECOSYSTEM

  BEFORE ADOPTING ANY PDF LIBRARY:
    1. Check the last release date and whether the repo is archived.
    2. Check whether a maintained FORK has become the de facto successor —
       ‼️ this is unusually common in PDF specifically (pdf-lib, PyPDF2,
       chrome-aws-lambda all follow this pattern).
    3. Prefer libraries with institutional backing (Mozilla's pdfjs-dist) or
       genuine multi-maintainer projects over single-author packages.
    4. Assume you may need to fork or replace it within three years, and keep
       your own code loosely coupled to it.
```

---

## 19. Common Pitfalls

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

‼️ 17. Adopting an unmaintained library because it has millions of downloads.
   ‼️ THE PDF-SPECIFIC PITFALL. pdf-lib, pdf-parse and wkhtmltopdf are all
   heavily used, heavily recommended, and no longer maintained — and AI
   assistants confidently suggest all three, because they dominate the
   training data. Check the last release date and whether the repo is
   archived BEFORE you install. See §17 for the current successors.

‼️ 18. Promising embedded video or audio in a PDF.
   ‼️ It plays in Adobe Acrobat and essentially nowhere else — not in
   browsers, not in PDF.js, not on mobile. Link to hosted media instead.
   See §13.

‼️ 19. Shipping a "PDF/A-3 e-invoice" that is not valid PDF/A-3.
   The attachment is the easy part; the conformance is not. A PDF from
   headless Chrome is not PDF/A-3. Validate with veraPDF before you send
   anything to a customer's portal. See §13.

‼️ 20. Discovering a conformance requirement late.
   PDF/A, PDF/UA or PDF/X is a constraint on your whole tool choice, not a
   flag you set at the end. Ask at the start of the project (§3).
```

---

## Related Files

- [AI-MULTIMODAL-VISION-DEEP.md](AI-MULTIMODAL-VISION-DEEP.md) — extracting data from PDFs with vision models
- [NESTJS-DEEP.md](NESTJS-DEEP.md) — §22 queues and background jobs, the pattern §10 relies on
- [MICROSERVICES-DEEP.md](MICROSERVICES-DEEP.md) — separating a heavy worker from your API
- [WEB-SECURITY-FRONTEND-DEEP.md](WEB-SECURITY-FRONTEND-DEEP.md) — SSRF, XSS, file upload handling
- [PERFORMANCE-DEEP.md](PERFORMANCE-DEEP.md) — streaming, caching, asset optimisation
