# Playwright MCP Integration

Guide for integrating Playwright with Model Context Protocol (MCP) servers.

## Table of Contents

- [Overview](#overview)
- [MCP Server Setup](#mcp-server-setup)
- [Browser Automation via MCP](#browser-automation-via-mcp)
- [Common Use Cases](#common-use-cases)
- [Best Practices](#best-practices)

## Overview

Playwright can be integrated with MCP servers to enable AI-driven browser automation. This allows LLMs to control browsers through structured tool interfaces.

### Key Benefits

- **Structured automation**: Well-defined tools for browser control
- **AI-friendly**: Natural language → browser actions
- **Debugging**: Built-in screenshot and trace capabilities
- **Context preservation**: Maintain browser state across interactions

## MCP Server Setup

### Basic Playwright MCP Server

```typescript
// server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chromium, Browser, Page } from 'playwright';

const server = new Server(
  {
    name: 'playwright-automation',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let browser: Browser | null = null;
let page: Page | null = null;

// Tool: Launch browser
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'launch_browser') {
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    return {
      content: [
        {
          type: 'text',
          text: 'Browser launched successfully',
        },
      ],
    };
  }

  if (request.params.name === 'navigate') {
    const { url } = request.params.arguments as { url: string };
    await page?.goto(url);
    return {
      content: [
        {
          type: 'text',
          text: `Navigated to ${url}`,
        },
      ],
    };
  }

  if (request.params.name === 'screenshot') {
    const screenshot = await page?.screenshot({ type: 'png' });
    return {
      content: [
        {
          type: 'image',
          data: screenshot?.toString('base64') || '',
          mimeType: 'image/png',
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Tool definitions
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'launch_browser',
        description: 'Launch a new browser instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'navigate',
        description: 'Navigate to a URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to' },
          },
          required: ['url'],
        },
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Advanced Tool Set

```typescript
// Additional tools for comprehensive automation

const tools = [
  {
    name: 'click_element',
    description: 'Click an element on the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector or text to click' },
        role: { type: 'string', description: 'ARIA role (button, link, etc.)' },
      },
    },
  },
  {
    name: 'fill_input',
    description: 'Fill an input field',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Input selector or label' },
        value: { type: 'string', description: 'Value to fill' },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'wait_for_element',
    description: 'Wait for an element to appear',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        timeout: { type: 'number', default: 30000 },
      },
      required: ['selector'],
    },
  },
  {
    name: 'get_page_content',
    description: 'Get text content from the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Optional selector to extract specific content' },
      },
    },
  },
  {
    name: 'evaluate_js',
    description: 'Execute JavaScript in the page context',
    inputSchema: {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'JavaScript code to execute' },
      },
      required: ['script'],
    },
  },
];
```

## Browser Automation via MCP

### Implementing Tool Handlers

```typescript
// Handle click_element
if (request.params.name === 'click_element') {
  const { selector, role } = request.params.arguments as {
    selector?: string;
    role?: string;
  };

  if (role) {
    await page?.getByRole(role as any).click();
  } else if (selector) {
    await page?.locator(selector).click();
  }

  return {
    content: [{ type: 'text', text: 'Element clicked' }],
  };
}

// Handle fill_input
if (request.params.name === 'fill_input') {
  const { selector, value } = request.params.arguments as {
    selector: string;
    value: string;
  };

  await page?.locator(selector).fill(value);

  return {
    content: [{ type: 'text', text: `Filled input: ${selector}` }],
  };
}

// Handle get_page_content
if (request.params.name === 'get_page_content') {
  const { selector } = request.params.arguments as { selector?: string };

  let content: string;
  if (selector) {
    content = await page?.locator(selector).textContent() || '';
  } else {
    content = await page?.content() || '';
  }

  return {
    content: [{ type: 'text', text: content }],
  };
}

// Handle evaluate_js
if (request.params.name === 'evaluate_js') {
  const { script } = request.params.arguments as { script: string };

  const result = await page?.evaluate(script);

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
```

### Context Management

```typescript
// Maintain browser context across requests
class PlaywrightMCPServer {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initBrowser() {
    this.browser = await chromium.launch({ headless: false });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    this.page = await this.context.newPage();
  }

  async saveState(path: string) {
    await this.context?.storageState({ path });
  }

  async loadState(path: string) {
    await this.context?.storageState({ path });
  }

  async close() {
    await this.browser?.close();
  }
}
```

## Common Use Cases

### Web Scraping

```typescript
// Tool: Extract structured data
{
  name: 'extract_data',
  description: 'Extract structured data from the page',
  inputSchema: {
    type: 'object',
    properties: {
      schema: {
        type: 'object',
        description: 'JSON schema of data to extract'
      }
    }
  }
}

// Handler
if (request.params.name === 'extract_data') {
  const { schema } = request.params.arguments;

  // Use LLM to extract data matching schema
  const pageContent = await page?.content();
  // ... extraction logic ...

  return {
    content: [{ type: 'text', text: JSON.stringify(extractedData) }]
  };
}
```

### Form Automation

```typescript
// Tool: Fill form
{
  name: 'fill_form',
  description: 'Fill and submit a form',
  inputSchema: {
    type: 'object',
    properties: {
      fields: {
        type: 'object',
        description: 'Field labels/names and their values'
      },
      submit: {
        type: 'boolean',
        description: 'Whether to submit the form'
      }
    }
  }
}

// Handler
if (request.params.name === 'fill_form') {
  const { fields, submit } = request.params.arguments;

  for (const [label, value] of Object.entries(fields)) {
    await page?.getByLabel(label).fill(value as string);
  }

  if (submit) {
    await page?.getByRole('button', { name: /submit|send|login/i }).click();
  }

  return {
    content: [{ type: 'text', text: 'Form filled successfully' }]
  };
}
```

### Testing Workflows

```typescript
// Tool: Run test scenario
{
  name: 'run_test_scenario',
  description: 'Execute a test scenario and capture results',
  inputSchema: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            selector: { type: 'string' },
            value: { type: 'string' },
            assertion: { type: 'string' }
          }
        }
      }
    }
  }
}
```

## Best Practices

### Error Handling

```typescript
async function safeExecute(fn: () => Promise<any>) {
  try {
    return await fn();
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

// Usage
if (request.params.name === 'navigate') {
  return safeExecute(async () => {
    const { url } = request.params.arguments as { url: string };
    await page?.goto(url, { waitUntil: 'networkidle' });
    return {
      content: [{ type: 'text', text: `Navigated to ${url}` }],
    };
  });
}
```

### Resource Management

```typescript
// Cleanup on exit
process.on('SIGINT', async () => {
  await browser?.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await browser?.close();
  process.exit(0);
});
```

### Debugging Support

```typescript
// Tool: Enable tracing
{
  name: 'start_trace',
  description: 'Start recording trace for debugging',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Trace name' }
    }
  }
}

// Handler
if (request.params.name === 'start_trace') {
  const { name } = request.params.arguments;
  await context?.tracing.start({
    screenshots: true,
    snapshots: true
  });

  return {
    content: [{ type: 'text', text: 'Tracing started' }]
  };
}

// Tool: Stop tracing
if (request.params.name === 'stop_trace') {
  const { name } = request.params.arguments;
  await context?.tracing.stop({
    path: `traces/${name}.zip`
  });

  return {
    content: [{ type: 'text', text: `Trace saved: traces/${name}.zip` }]
  };
}
```

### State Persistence

```typescript
// Tool: Save browser state
{
  name: 'save_session',
  description: 'Save browser session (cookies, storage)',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' }
    }
  }
}

// Handler
if (request.params.name === 'save_session') {
  const { name } = request.params.arguments;
  await context?.storageState({ path: `sessions/${name}.json` });

  return {
    content: [{ type: 'text', text: 'Session saved' }]
  };
}

// Tool: Load browser state
{
  name: 'load_session',
  description: 'Load browser session',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' }
    }
  }
}
```

### Timeout Configuration

```typescript
// Configure default timeouts
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);

// Per-action timeouts in tools
await page?.locator(selector).click({ timeout: 5000 });
await page?.waitForLoadState('networkidle', { timeout: 10000 });
```
