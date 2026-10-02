# Computer Use & Browser Automation Agents

Computer use agents control a computer like a human — clicking, typing, reading the screen, navigating web pages. This is a rapidly growing area, currently niche but increasingly appearing in job descriptions for companies building AI automation products.

---

## What Computer Use Agents Can Do

```text
Web browsing:
  - Navigate to URLs, click links, fill forms
  - Log in to websites, extract data
  - Monitor pages for changes

Desktop automation:
  - Control any desktop application
  - Open files, copy/paste, run programs
  - Screenshot-based feedback loop

Document interaction:
  - Open PDFs, Word docs, spreadsheets
  - Read and edit content
  - Export data to different formats

Real-world use cases:
  - Data extraction from legacy systems (no API)
  - Automated testing of web UIs
  - Business process automation (expense reports, form filling)
  - Competitive intelligence (monitoring competitor sites)
  - Customer support agents that can navigate portals
```

---

## The Landscape (October 2026)

```text
Model-provider computer use:
  Anthropic — computer toolset + browser toolset (Claude API), and Claude in
              Chrome as an end-user product
  OpenAI    — computer-use model behind ChatGPT's agent mode; API access
  Google    — Gemini computer-use models

Open-source frameworks:
  browser-use (Python), Stagehand (TypeScript, Browserbase), Skyvern

MCP route: the Playwright MCP server (Microsoft) and Chrome DevTools MCP
  let any MCP-capable agent drive a real browser through structured tools —
  often the quickest way to give a coding agent browser access.

AI browsers: Perplexity Comet, ChatGPT Atlas and others build the agent
  into the browser itself.

Hosted browser infrastructure: Browserbase, Steel, Hyperbrowser — remote
  headless browsers with sessions, proxies and CAPTCHA handling.

‼️ Prompt injection is the defining risk: any page the agent reads can
   contain instructions aimed at it. See Safety Considerations below.
```

---

## Claude Computer Use (Anthropic)

Anthropic's computer use feature lets Claude control a computer via screenshot → action → screenshot feedback loop.

```python
# Computer toolset (current shape, GA on the Claude API — no beta header).
# ‼️ The tool-version strings change: older code uses computer_20241022 /
#    computer_20251124 with a `computer-use-*` beta header. Check the
#    computer-use docs for the version your model supports.
import anthropic, base64, io
import pyautogui                     # executes clicks/keys on THIS machine —
from PIL import ImageGrab            # ‼️ run agents in a VM/container, never your laptop

client = anthropic.Anthropic()

tools = [
    {"type": "computer_toolset_20260801"},  # screenshot, clicks, typing, scroll, zoom... (17 members)
    {"type": "bash_20250124", "name": "bash"},                                     # optional
    {"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"},       # optional
]

def screenshot_block() -> dict:
    # Screenshots must already fit the model's image limits — resize large
    # screens (1080p is a good balance of accuracy and token cost)
    buf = io.BytesIO()
    ImageGrab.grab().save(buf, format="PNG")
    return {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                        "data": base64.b64encode(buf.getvalue()).decode()}}

def execute(action: str, args: dict) -> list | str:
    # With the toolset, the ACTION is the tool_use block's name (not input["action"])
    if action in ("screenshot", "zoom"):
        return [screenshot_block()]
    if action == "left_click":
        pyautogui.click(*args["coordinate"])
    elif action == "type":
        pyautogui.typewrite(args["text"], interval=0.05)
    elif action == "key":
        pyautogui.hotkey(*args["text"].split("+"))
    return "OK"   # non-image actions just need a short acknowledgement

def run_computer_agent(task: str, max_steps: int = 50):
    messages = [{"role": "user", "content": task}]

    for _ in range(max_steps):
        response = client.messages.create(
            model="claude-opus-5",
            max_tokens=16000,
            tools=tools,
            messages=messages,
        )
        if response.stop_reason != "tool_use":
            return next((b.text for b in response.content if b.type == "text"), "")

        # Claude may request SEVERAL actions in one turn (a batch) — answer each
        tool_results = []
        for block in response.content:
            if block.type == "tool_use" and getattr(block, "toolset_name", None) == "computer":
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "toolset_name": "computer",   # ‼️ every result must echo this
                    "content": execute(block.name, block.input),
                })
            # (bash / text-editor tool calls would be handled here too)

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})   # all results in ONE message

    return "Stopped: step limit reached"

# Usage
result = run_computer_agent("Go to github.com and find the trending TypeScript repositories")
```

‼️ For web-only tasks, Anthropic also offers a **browser toolset** (`browser_toolset_20260801`)
that drives a browser directly — usually more reliable and cheaper than pixel-level desktop
control. Use full computer use for desktop apps and legacy systems with no web UI.

---

## Browser Agents with Playwright

Playwright gives programmatic browser control — better than screenshot-based for web tasks because you get structured access to the DOM.

### Basic Playwright + LLM agent

```typescript
import { chromium, Browser, Page } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

class BrowserAgent {
  private browser: Browser;
  private page: Page;

  async init() {
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
  }

  // Tools the agent can use
  private tools = [
    {
      name: 'navigate',
      description: 'Navigate to a URL',
      input_schema: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
    },
    {
      name: 'click',
      description: 'Click an element by CSS selector or text content',
      input_schema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector' },
          text: { type: 'string', description: 'Click element containing this text' },
        },
      },
    },
    {
      name: 'type_text',
      description: 'Type text into a focused or selected input field',
      input_schema: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['text'],
      },
    },
    {
      name: 'get_page_content',
      description: 'Get the visible text content and structure of the current page',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'screenshot',
      description: 'Take a screenshot of the current page',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'extract_data',
      description: 'Extract structured data from the page using a CSS selector',
      input_schema: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          attribute: { type: 'string', description: 'HTML attribute to extract (default: text)' },
        },
        required: ['selector'],
      },
    },
  ];

  async executeTool(name: string, input: Record<string, string>) {
    switch (name) {
      case 'navigate':
        await this.page.goto(input.url, { waitUntil: 'domcontentloaded' });
        return `Navigated to ${input.url}`;

      case 'click':
        if (input.text) {
          await this.page.getByText(input.text).first().click();
        } else {
          await this.page.click(input.selector);
        }
        await this.page.waitForLoadState('domcontentloaded');
        return 'Clicked';

      case 'type_text':
        if (input.selector) await this.page.click(input.selector);
        await this.page.keyboard.type(input.text);
        return `Typed: ${input.text}`;

      case 'get_page_content':
        return await this.page.evaluate(() => {
          // Extract readable text content
          return document.body.innerText.slice(0, 10000); // limit to 10K chars
        });

      case 'screenshot':
        const screenshot = await this.page.screenshot({ type: 'png' });
        return `data:image/png;base64,${screenshot.toString('base64')}`;

      case 'extract_data':
        return JSON.stringify(
          await this.page.$$eval(
            input.selector,
            (elements, attr) => elements.map(el =>
              attr ? el.getAttribute(attr) : el.textContent?.trim()
            ),
            input.attribute
          )
        );

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async run(task: string): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: task },
    ];

    for (let step = 0; step < 20; step++) {
      const response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 16000,
        system: `You are a browser automation agent. Use your tools to complete tasks.
        Always check the page content before clicking or typing.
        Extract the exact information requested — don't summarise unless asked.`,
        tools: this.tools,
        messages,
      });

      if (response.stop_reason !== 'tool_use') {
        const text = response.content.find(b => b.type === 'text');
        return text?.text ?? 'Task completed';
      }

      const toolUses = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUses) {
        try {
          const result = await this.executeTool(toolUse.name, toolUse.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        } catch (error) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Error: ${(error as Error).message}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    return 'Max steps reached';
  }

  async close() {
    await this.browser.close();
  }
}

// Usage
const agent = new BrowserAgent();
await agent.init();

const result = await agent.run(
  'Go to news.ycombinator.com and extract the titles and URLs of the top 10 stories'
);
console.log(result);
await agent.close();
```

---

## Stagehand — Higher-Level Browser Agent Framework

```typescript
// Stagehand (by Browserbase) — purpose-built for LLM browser automation
// Abstracts away low-level Playwright details

import { browserbase, Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
// (Stagehand v4 API — v1–v3 used new Stagehand({...}) + init() and
//  act({ action }) objects; most tutorials still show that)

// Remote headless browser on Browserbase (Stagehand can also drive a local browser)
const browser = await browserbase.launch({ apiKey: process.env.BROWSERBASE_API_KEY });

const stagehand = await Stagehand.create({
  browser,
  model: { modelName: 'anthropic/claude-opus-5', apiKey: process.env.ANTHROPIC_API_KEY },
});

const [page] = await browser.context.pages();
await page.goto('https://github.com/trending');

// act() — tell the agent what to do in natural language
await stagehand.act('click on the "TypeScript" language filter');
// ‼️ Never put real credentials in prompts — log in with a deterministic
//    Playwright step or a pre-authenticated browser profile instead.

// extract() — pull structured data from the page
const { data } = await stagehand.extract(
  'extract the trending repositories with their names, star counts, and descriptions',
  z.object({
    repos: z.array(z.object({
      name: z.string(),
      stars: z.number(),
      description: z.string(),
    })),
  }),
);

// observe() — identify interactive elements, then act deterministically
const { data: actions } = await stagehand.observe('find the first repository link');
await page.locator(actions[0].selector).click(); // cached selector — no LLM call

await stagehand.close();
```

---

## Safety Considerations

```text
Computer use agents are powerful and potentially dangerous:

Risks:
  - Agent clicks "Delete" or "Confirm purchase" by mistake
  - Agent submits forms with wrong data
  - Agent accesses sensitive files or credentials on screen
  - Agent gets stuck in a loop (infinite clicks, form resubmissions)
  - Prompt injection via website content (site tells agent to do something else)

Mitigations:
  1. Sandbox environment: run agent in a VM or container, not on your main machine
  2. Human confirmation for irreversible actions (purchase, delete, send)
  3. Rate limits: max N actions per task
  4. Allowlist: only allow navigation to specific domains
  5. Read-only mode: start with observe-only before enabling write actions
  6. Timeout: kill the agent if it doesn't complete within N minutes
  7. Audit log: record every action taken

Pattern for dangerous actions:
```

```typescript
// Require human approval before executing destructive actions
const DANGEROUS_ACTIONS = ['submit', 'delete', 'purchase', 'confirm', 'send'];

async function safeExecute(toolName: string, action: string, executor: () => Promise<string>) {
  const isDangerous = DANGEROUS_ACTIONS.some(a => action.toLowerCase().includes(a));

  if (isDangerous) {
    const approved = await promptHuman(
      `Agent wants to: ${action}\n\nApprove? (y/n)`
    );
    if (!approved) return 'Action cancelled by user';
  }

  return executor();
}
```

---

## When to Use vs When Not To

```text
Use computer use / browser agents when:
  - No API exists (legacy enterprise software, websites without APIs)
  - The task genuinely requires a browser (CAPTCHA-based login, JS-heavy SPAs)
  - You need to interact with arbitrary websites you don't control
  - Building a product where users want to automate their own browser workflows

Prefer alternatives when:
  - An API is available (use the API — faster, cheaper, more reliable)
  - The site is static or has a public API
  - You just need to scrape data (Puppeteer/Playwright without AI is simpler)
  - The task is well-defined (traditional Playwright test scripts are better for testing)

Reality: browser agents are slow (each action is a round trip to the LLM),
expensive (screenshot analysis uses many tokens), and fragile (UI changes break them).
They're best for tasks that are genuinely hard to automate any other way.
```

---

## Common Interview Questions

### "How would you build a browser automation agent?"

> The core loop: take a screenshot (or read the DOM), send it to the LLM with available browser tools, execute the tool the LLM specifies (click, type, navigate, scroll), observe the result, repeat. For structured web data, Playwright gives direct DOM access which is more reliable and cheaper than screenshot-based analysis — I'd extract visible text and structure from the page rather than sending raw screenshots. Key design decisions: sandboxing (run in a container or VM, never the main machine), human confirmation for irreversible actions, a max-steps limit to prevent infinite loops, and prompt injection mitigation (website content might try to hijack the agent). Stagehand or a similar framework handles a lot of this boilerplate. For production: Browserbase provides managed remote browsers that are isolated from your infrastructure.

### "What's the difference between Playwright scripts and AI browser agents?"

> Traditional Playwright scripts are deterministic — you specify exact selectors, exact sequences, exact assertions. They're fast, reliable, and cheap but brittle (a CSS class change breaks them) and require a developer to write and maintain them. AI browser agents are flexible — you describe what you want in natural language, and the agent figures out how to do it. They handle UI changes gracefully and can deal with dynamic content. But they're slow (every action involves an LLM call), expensive (screenshots = many tokens), and non-deterministic (same task may take different paths each run). The right tool depends on the task: for testing your own application where you control the UI, use Playwright scripts. For automating third-party websites you don't control, or for tasks with too many variations to script manually, AI agents make sense.
