# Debugging Techniques

Comprehensive guide to debugging Playwright tests using various tools and strategies.

## Table of Contents

- [Playwright Inspector](#playwright-inspector)
  - [Basic Usage](#basic-usage)
  - [Inspector Features](#inspector-features)
  - [Stepping Through Tests](#stepping-through-tests)
- [Trace Viewer](#trace-viewer)
  - [Recording Traces](#recording-traces)
  - [Viewing Traces](#viewing-traces)
  - [Trace Features](#trace-features)
- [Debug Mode](#debug-mode)
  - [Using page.pause()](#using-pagepause)
  - [PWDEBUG Environment Variable](#pwdebug-environment-variable)
  - [Headed Mode](#headed-mode)
- [UI Mode](#ui-mode)
  - [Launching UI Mode](#launching-ui-mode)
  - [UI Mode Features](#ui-mode-features)
  - [Time Travel Debugging](#time-travel-debugging)
- [VS Code Integration](#vs-code-integration)
- [Browser Developer Tools](#browser-developer-tools)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Debugging Strategies](#debugging-strategies)

---

## Playwright Inspector

The Playwright Inspector is a GUI tool for debugging Playwright scripts.

### Basic Usage

```bash
# Run tests with inspector
npx playwright test --debug

# Debug specific test file
npx playwright test tests/example.spec.ts --debug

# Debug specific test by line number
npx playwright test tests/example.spec.ts:12 --debug
```

**In code:**

```typescript
import { test } from '@playwright/test';

test('debugging test', async ({ page }) => {
  await page.goto('https://example.com');

  // Pause execution and open inspector
  await page.pause();

  await page.getByRole('button', { name: 'Submit' }).click();
});
```

### Inspector Features

1. **Step Over**: Execute one step at a time
2. **Play/Pause**: Continue or pause execution
3. **Pick Locator**: Visually select elements and generate locators
4. **Action Log**: View all actions performed
5. **Console**: Execute Playwright commands interactively
6. **Source**: View test source code

### Stepping Through Tests

```typescript
test('step by step debugging', async ({ page }) => {
  // Opens inspector at this point
  await page.pause();

  await page.goto('https://example.com');

  // Inspector remains open, click "Step Over" to proceed
  await page.getByRole('link', { name: 'Products' }).click();

  await page.pause(); // Pause again at a specific point

  await page.getByRole('button', { name: 'Add to cart' }).click();
});
```

### Pick Locator Tool

```typescript
test('using pick locator', async ({ page }) => {
  await page.goto('https://example.com');
  await page.pause();

  // In inspector:
  // 1. Click "Pick Locator" button
  // 2. Hover over element in browser
  // 3. Click to select
  // 4. Copy generated locator code

  // Example generated locator:
  await page.getByRole('button', { name: 'Submit' }).click();
});
```

---

## Trace Viewer

Traces record detailed information about test execution for post-mortem debugging.

### Recording Traces

**In playwright.config.ts:**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Record trace on first retry of a failed test
    trace: 'on-first-retry',

    // Or always record traces
    // trace: 'on',

    // Or only on failure
    // trace: 'retain-on-failure',

    // Or never
    // trace: 'off',
  },
});
```

**Per test:**

```typescript
import { test } from '@playwright/test';

test('with trace', async ({ page, context }) => {
  // Start tracing before navigating
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });

  await page.goto('https://example.com');
  await page.getByRole('button', { name: 'Submit' }).click();

  // Stop tracing and save to file
  await context.tracing.stop({
    path: 'trace.zip',
  });
});
```

### Viewing Traces

```bash
# View trace file
npx playwright show-trace trace.zip

# View trace from test results
npx playwright show-trace test-results/example-test/trace.zip
```

**From UI Mode:**

Traces are automatically available when running tests in UI Mode.

### Trace Features

1. **Timeline**: See all actions and their timing
2. **Screenshots**: Visual snapshots at each step
3. **DOM Snapshots**: Inspect DOM state at any point
4. **Network**: View all network requests
5. **Console**: Browser console messages
6. **Source**: Test source code with current line highlighted
7. **Call**: Function call stack
8. **Metadata**: Test metadata and environment

**Trace Viewer Navigation:**

```
- Click on timeline to jump to that moment
- Hover over actions to see details
- Use keyboard: ← → to navigate steps
- Click "Before" and "After" to see DOM changes
- Use "Pick Locator" to test selectors on snapshot
```

### Trace Example

```typescript
test('detailed trace example', async ({ page, context }) => {
  await context.tracing.start({
    screenshots: true,    // Capture screenshots
    snapshots: true,      // Capture DOM snapshots
    sources: true,        // Include source code
    title: 'My Test',     // Custom title
    name: 'trace-name',   // Custom name
  });

  try {
    await page.goto('https://example.com');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page).toHaveURL(/success/);
  } finally {
    // Always stop tracing, even if test fails
    await context.tracing.stop({
      path: 'test-results/trace.zip',
    });
  }
});
```

---

## Debug Mode

### Using page.pause()

```typescript
test('pause execution', async ({ page }) => {
  await page.goto('https://example.com');

  // Pause here - inspector will open
  await page.pause();

  // Test continues after you click "Resume" in inspector
  await page.getByRole('button', { name: 'Submit' }).click();

  // Can pause multiple times
  await page.pause();

  await expect(page).toHaveURL(/success/);
});
```

### PWDEBUG Environment Variable

```bash
# Run with debug mode enabled
PWDEBUG=1 npx playwright test

# On Windows (PowerShell)
$env:PWDEBUG=1
npx playwright test

# On Windows (CMD)
set PWDEBUG=1
npx playwright test
```

**Automatically pauses before each action:**

```typescript
// With PWDEBUG=1, test pauses before each line
test('debug mode test', async ({ page }) => {
  await page.goto('https://example.com');      // Pauses here
  await page.getByRole('button').click();      // Pauses here
  await expect(page).toHaveTitle(/Example/);   // Pauses here
});
```

### Headed Mode

```bash
# Run tests in headed mode (visible browser)
npx playwright test --headed

# Slower execution for debugging
npx playwright test --headed --slow-mo=1000

# Combine with debug
npx playwright test --headed --debug
```

**In code:**

```typescript
// In playwright.config.ts
export default defineConfig({
  use: {
    headless: false,
    slowMo: 1000, // Delay each action by 1 second
  },
});
```

---

## UI Mode

UI Mode provides a visual interface for running and debugging tests.

### Launching UI Mode

```bash
# Start UI Mode
npx playwright test --ui

# With specific test file
npx playwright test tests/example.spec.ts --ui

# With specific project
npx playwright test --ui --project=chromium
```

### UI Mode Features

1. **Test Explorer**: Navigate and run tests
2. **Watch Mode**: Auto-rerun on file changes
3. **Time Travel**: Step through test execution
4. **Pick Locator**: Generate selectors visually
5. **Trace Viewer**: Built-in trace viewing
6. **Actions Panel**: See all test actions
7. **Source Panel**: View test source with highlights

### Time Travel Debugging

```typescript
test('time travel example', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('textbox').fill('search query');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('heading')).toBeVisible();
});
```

**In UI Mode:**
- Run the test
- Use the timeline to jump to any action
- Inspect DOM state at that moment
- Test different locators on snapshots
- See network requests at each step

### Watch Mode in UI Mode

```typescript
// Edit this test while UI Mode is running
test('watch mode test', async ({ page }) => {
  await page.goto('https://example.com');

  // Save the file - test automatically reruns
  await page.getByRole('button').click();
});
```

---

## VS Code Integration

### Playwright Test for VS Code Extension

**Install:** Search for "Playwright Test for VS Code" in extensions.

**Features:**
- Run tests from the editor
- Set breakpoints
- Pick locators visually
- View test results inline
- Debug with VS Code debugger

### Running Tests

```typescript
// Click the green arrow next to test to run
test('VS Code test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('button', { name: 'Submit' }).click();
});
```

### Setting Breakpoints

```typescript
test('breakpoint example', async ({ page }) => {
  await page.goto('https://example.com');

  // Set breakpoint here by clicking left margin
  await page.getByRole('button').click();

  // Execution pauses at breakpoint when debugging
  await expect(page).toHaveURL(/success/);
});
```

### Pick Locator in VS Code

1. Run test in VS Code
2. Click "Pick Locator" in testing panel
3. Browser opens with locator picker
4. Click element
5. Locator code is copied to clipboard

### Debug Configuration

**.vscode/launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Playwright Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/playwright",
      "args": ["test", "--debug"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## Browser Developer Tools

### Opening DevTools

```typescript
import { chromium } from '@playwright/test';

test('with devtools', async () => {
  // Launch browser with devtools open
  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });

  const page = await browser.newPage();
  await page.goto('https://example.com');

  // DevTools is open - you can inspect, debug, etc.
  await page.pause();

  await browser.close();
});
```

**In config:**

```typescript
export default defineConfig({
  use: {
    launchOptions: {
      devtools: true,
    },
  },
});
```

### Console Logging

```typescript
test('console logging', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });

  // Evaluate JavaScript and log
  await page.evaluate(() => {
    console.log('From browser:', window.location.href);
  });

  await page.goto('https://example.com');
});
```

---

## Common Issues and Solutions

### Issue: Element Not Found

```typescript
// ❌ Problem: Element not found
test('element not found', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('button', { name: 'Submit' }).click(); // Fails
});

// ✅ Solution 1: Wait for element
test('wait for element', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('button', { name: 'Submit' }).waitFor();
  await page.getByRole('button', { name: 'Submit' }).click();
});

// ✅ Solution 2: Check if element exists
test('check existence', async ({ page }) => {
  await page.goto('https://example.com');

  const button = page.getByRole('button', { name: 'Submit' });

  // Debug: check if element exists
  const count = await button.count();
  console.log(`Found ${count} buttons`);

  if (count > 0) {
    await button.click();
  }
});

// ✅ Solution 3: Use inspector to verify selector
test('verify selector', async ({ page }) => {
  await page.goto('https://example.com');
  await page.pause(); // Use pick locator to verify
  await page.getByRole('button', { name: 'Submit' }).click();
});
```

### Issue: Timeout

```typescript
// ❌ Problem: Action times out
test('timeout issue', async ({ page }) => {
  await page.goto('https://slow-site.com');
  await page.getByRole('button').click(); // Times out
});

// ✅ Solution 1: Increase timeout
test('increase timeout', async ({ page }) => {
  await page.goto('https://slow-site.com', {
    timeout: 60000, // 60 seconds
  });
  await page.getByRole('button').click({
    timeout: 30000, // 30 seconds
  });
});

// ✅ Solution 2: Wait for specific condition
test('wait for condition', async ({ page }) => {
  await page.goto('https://slow-site.com');

  // Wait for network idle
  await page.waitForLoadState('networkidle');

  await page.getByRole('button').click();
});

// ✅ Solution 3: Set global timeout in config
// playwright.config.ts
export default defineConfig({
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds per assertion
  },
});
```

### Issue: Flaky Test

```typescript
// ❌ Problem: Test passes sometimes, fails others
test('flaky test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('button').click();
  await expect(page.getByText('Success')).toBeVisible(); // Sometimes fails
});

// ✅ Solution 1: Wait for stability
test('wait for stability', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('button').click();

  // Wait for element to be stable
  await page.getByText('Success').waitFor({ state: 'visible' });
  await expect(page.getByText('Success')).toBeVisible();
});

// ✅ Solution 2: Use auto-waiting assertions
test('auto waiting', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('button').click();

  // Playwright automatically waits for element
  await expect(page.getByText('Success')).toBeVisible({ timeout: 10000 });
});

// ✅ Solution 3: Record trace to investigate
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'retain-on-failure', // Only keep trace on failure
  },
  retries: 2, // Retry flaky tests
});
```

### Issue: Wrong Element Selected

```typescript
// ❌ Problem: Multiple elements match, wrong one selected
test('wrong element', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('button').click(); // Clicks first button, not the right one
});

// ✅ Solution 1: Be more specific
test('specific selector', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('button', { name: 'Submit' }).click();
});

// ✅ Solution 2: Filter by parent
test('filter by parent', async ({ page }) => {
  await page.goto('https://example.com');
  const form = page.getByRole('form');
  await form.getByRole('button', { name: 'Submit' }).click();
});

// ✅ Solution 3: Use test ID
test('use test id', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByTestId('submit-button').click();
});

// ✅ Solution 4: Debug with inspector
test('debug selector', async ({ page }) => {
  await page.goto('https://example.com');
  await page.pause();

  // Use pick locator to verify which element is selected
  // Check count: await page.getByRole('button').count()
  const count = await page.getByRole('button').count();
  console.log(`Found ${count} buttons`);

  await page.getByRole('button').nth(1).click(); // Click specific button
});
```

---

## Debugging Strategies

### 1. Start Simple

```typescript
// Break down complex tests into smaller steps
test('debugging strategy - simple', async ({ page }) => {
  // Step 1: Navigate
  await page.goto('https://example.com');
  await page.pause(); // Verify page loaded correctly

  // Step 2: Interact
  await page.getByRole('button').click();
  await page.pause(); // Verify button click worked

  // Step 3: Assert
  await expect(page).toHaveURL(/success/);
});
```

### 2. Add Logging

```typescript
test('debugging strategy - logging', async ({ page }) => {
  console.log('Step 1: Navigating...');
  await page.goto('https://example.com');

  console.log('Step 2: Clicking button...');
  const button = page.getByRole('button', { name: 'Submit' });
  console.log(`Button count: ${await button.count()}`);
  await button.click();

  console.log('Step 3: Checking URL...');
  console.log(`Current URL: ${page.url()}`);
  await expect(page).toHaveURL(/success/);
});
```

### 3. Take Screenshots

```typescript
test('debugging strategy - screenshots', async ({ page }) => {
  await page.goto('https://example.com');

  // Take screenshot at specific points
  await page.screenshot({ path: 'screenshots/step1.png' });

  await page.getByRole('button').click();
  await page.screenshot({ path: 'screenshots/step2.png' });

  // Full page screenshot
  await page.screenshot({
    path: 'screenshots/full-page.png',
    fullPage: true,
  });
});
```

### 4. Inspect State

```typescript
test('debugging strategy - inspect state', async ({ page }) => {
  await page.goto('https://example.com');

  // Check element state
  const button = page.getByRole('button', { name: 'Submit' });

  console.log('Is visible:', await button.isVisible());
  console.log('Is enabled:', await button.isEnabled());
  console.log('Text content:', await button.textContent());

  // Check page state
  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  // Evaluate JavaScript
  const hasClass = await button.evaluate((el) =>
    el.classList.contains('active')
  );
  console.log('Has active class:', hasClass);
});
```

### 5. Use Conditional Breakpoints

```typescript
test('debugging strategy - conditional', async ({ page }) => {
  await page.goto('https://example.com');

  const buttons = await page.getByRole('button').all();

  for (const button of buttons) {
    const text = await button.textContent();

    // Pause only for specific button
    if (text?.includes('Submit')) {
      await page.pause();
    }

    await button.click();
  }
});
```

---

## Quick Reference

| Tool | When to Use | Command |
|------|-------------|---------|
| Inspector | Step-by-step debugging | `npx playwright test --debug` |
| Trace Viewer | Post-mortem analysis | `npx playwright show-trace trace.zip` |
| UI Mode | Interactive development | `npx playwright test --ui` |
| page.pause() | Specific breakpoints | Add in test code |
| Headed Mode | Visual debugging | `npx playwright test --headed` |
| VS Code | IDE integration | Use extension |
| DevTools | Browser debugging | `launchOptions: { devtools: true }` |

---

## Summary

- **Use Inspector** for live debugging and locator generation
- **Record Traces** for detailed post-mortem analysis
- **Use UI Mode** for interactive test development
- **Add page.pause()** for specific breakpoints
- **Run in headed mode** to see what's happening
- **Take screenshots** at critical points
- **Add logging** to understand test flow
- **Check element state** when things go wrong
- **Use VS Code extension** for IDE integration
