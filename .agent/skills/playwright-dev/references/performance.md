# Performance Optimization

Comprehensive guide to optimizing Playwright test performance through parallel execution, sharding, workers, and resource management.

## Table of Contents

- [Parallel Execution](#parallel-execution)
  - [Worker Configuration](#worker-configuration)
  - [Worker Strategies](#worker-strategies)
  - [Fully Parallel Mode](#fully-parallel-mode)
- [Sharding Strategies](#sharding-strategies)
  - [Local Sharding](#local-sharding)
  - [CI Sharding](#ci-sharding)
  - [Merging Sharded Reports](#merging-sharded-reports)
- [Test Isolation](#test-isolation)
  - [Browser Contexts](#browser-contexts)
  - [Storage State](#storage-state)
  - [Test Fixtures](#test-fixtures)
- [Resource Optimization](#resource-optimization)
  - [Browser Reuse](#browser-reuse)
  - [Network Optimization](#network-optimization)
  - [Video and Screenshot Management](#video-and-screenshot-management)
- [Performance Monitoring](#performance-monitoring)
- [Best Practices](#best-practices)

---

## Parallel Execution

Playwright runs tests in parallel by default using worker processes.

### Worker Configuration

**In playwright.config.ts:**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Number of parallel workers
  workers: 4,

  // Or use percentage of CPU cores
  // workers: '50%',

  // Or use all available cores
  // workers: undefined,

  // Maximum concurrent workers per project
  fullyParallel: true,
});
```

**Command line:**

```bash
# Specify number of workers
npx playwright test --workers=4

# Use all CPU cores
npx playwright test --workers=100%

# Run serially (1 worker)
npx playwright test --workers=1

# Disable parallelization
npx playwright test --workers=1 --fully-parallel=false
```

### Worker Strategies

**By CPU cores:**

```typescript
import os from 'os';

export default defineConfig({
  // Use half of available cores
  workers: Math.ceil(os.cpus().length / 2),

  // Use all cores minus one
  workers: Math.max(os.cpus().length - 1, 1),

  // CI vs local
  workers: process.env.CI ? 2 : undefined,
});
```

**By environment:**

```typescript
export default defineConfig({
  workers: process.env.CI
    ? 2                          // Limited workers in CI
    : process.env.WORKERS        // Custom from env
    ? parseInt(process.env.WORKERS)
    : undefined,                 // Use default locally
});
```

**By test file:**

```typescript
// tests/slow.spec.ts
import { test } from '@playwright/test';

// Mark entire file to run serially
test.describe.configure({ mode: 'serial' });

test('test 1', async ({ page }) => {
  // Runs first
});

test('test 2', async ({ page }) => {
  // Runs after test 1
});
```

### Fully Parallel Mode

```typescript
export default defineConfig({
  // Run all tests in all files in parallel
  fullyParallel: true,
});
```

**Per test file:**

```typescript
import { test } from '@playwright/test';

// All tests in this file run in parallel
test.describe.configure({ mode: 'parallel' });

test('test 1', async ({ page }) => {});
test('test 2', async ({ page }) => {});
test('test 3', async ({ page }) => {});
```

**Serial mode:**

```typescript
import { test } from '@playwright/test';

// Tests run one after another
test.describe.configure({ mode: 'serial' });

test('login', async ({ page }) => {
  // Must complete before next test
});

test('view profile', async ({ page }) => {
  // Runs after login
});
```

---

## Sharding Strategies

Sharding splits tests across multiple machines or processes.

### Local Sharding

```bash
# Split tests into 4 shards, run shard 1
npx playwright test --shard=1/4

# Run shard 2
npx playwright test --shard=2/4

# Run all shards in parallel (manual)
npx playwright test --shard=1/4 & \
npx playwright test --shard=2/4 & \
npx playwright test --shard=3/4 & \
npx playwright test --shard=4/4 & \
wait
```

**Script for local sharding:**

```javascript
// run-sharded.js
const { spawn } = require('child_process');

const TOTAL_SHARDS = 4;
const processes = [];

for (let i = 1; i <= TOTAL_SHARDS; i++) {
  const proc = spawn('npx', [
    'playwright',
    'test',
    `--shard=${i}/${TOTAL_SHARDS}`,
    '--reporter=blob',
  ], {
    stdio: 'inherit',
  });

  processes.push(proc);
}

Promise.all(processes.map(p => new Promise(resolve => p.on('close', resolve))))
  .then(() => {
    console.log('All shards completed');
  });
```

### CI Sharding

**GitHub Actions:**

```yaml
name: Playwright Tests
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4, 5, 6, 7, 8]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run tests
        run: npx playwright test --shard=${{ matrix.shard }}/8
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report
          retention-days: 1
```

**GitLab CI:**

```yaml
playwright-tests:
  parallel: 8
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    paths:
      - blob-report/
```

**CircleCI:**

```yaml
jobs:
  test:
    parallelism: 8
    steps:
      - checkout
      - run: npm ci
      - run: |
          SHARD="$((${CIRCLE_NODE_INDEX}+1))"
          npx playwright test --shard=${SHARD}/${CIRCLE_NODE_TOTAL}
```

### Merging Sharded Reports

**Configure blob reporter:**

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: process.env.CI ? 'blob' : 'html',
});
```

**Merge reports in CI:**

```yaml
# GitHub Actions
merge-reports:
  if: always()
  needs: [test]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - name: Install dependencies
      run: npm ci
    - name: Download blob reports
      uses: actions/download-artifact@v4
      with:
        path: all-blob-reports
        pattern: blob-report-*
        merge-multiple: true
    - name: Merge into HTML Report
      run: npx playwright merge-reports --reporter html ./all-blob-reports
    - name: Upload HTML report
      uses: actions/upload-artifact@v4
      with:
        name: html-report
        path: playwright-report
```

**Local merge:**

```bash
# Run sharded tests with blob reporter
npx playwright test --shard=1/4 --reporter=blob
npx playwright test --shard=2/4 --reporter=blob
npx playwright test --shard=3/4 --reporter=blob
npx playwright test --shard=4/4 --reporter=blob

# Merge all blob reports
npx playwright merge-reports --reporter=html ./blob-report
```

---

## Test Isolation

### Browser Contexts

Each test gets a fresh browser context by default, providing isolation.

```typescript
import { test } from '@playwright/test';

// Each test gets isolated context
test('test 1', async ({ page }) => {
  await page.goto('https://example.com');
  // Fresh, isolated browser context
});

test('test 2', async ({ page }) => {
  await page.goto('https://example.com');
  // Different context, no state from test 1
});
```

**Reuse context (discouraged):**

```typescript
import { test } from '@playwright/test';

// Serial mode to reuse state (not recommended)
test.describe.configure({ mode: 'serial' });

let context;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
});

test('test 1', async () => {
  const page = await context.newPage();
  await page.goto('https://example.com');
});

test('test 2', async () => {
  const page = await context.newPage();
  // Reuses same context
});

test.afterAll(async () => {
  await context.close();
});
```

### Storage State

Reuse authentication state across tests for performance.

```typescript
// global-setup.ts
import { chromium } from '@playwright/test';

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Perform authentication
  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('https://example.com/dashboard');

  // Save storage state
  await page.context().storageState({ path: 'auth.json' });
  await browser.close();
}

export default globalSetup;
```

**Configure in playwright.config.ts:**

```typescript
export default defineConfig({
  globalSetup: require.resolve('./global-setup'),

  use: {
    // Use saved storage state
    storageState: 'auth.json',
  },
});
```

**Or per project:**

```typescript
export default defineConfig({
  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Authenticated tests
    {
      name: 'authenticated',
      dependencies: ['setup'],
      use: {
        storageState: 'auth.json',
      },
    },

    // Unauthenticated tests
    {
      name: 'guest',
      testIgnore: /.*\.setup\.ts/,
    },
  ],
});
```

**Setup test:**

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('https://example.com/dashboard');

  await page.context().storageState({ path: 'auth.json' });
});
```

### Test Fixtures

Create reusable fixtures for common setup.

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';

type MyFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    // Setup
    const context = await browser.newContext({
      storageState: 'auth.json',
    });
    const page = await context.newPage();

    // Use fixture
    await use(page);

    // Teardown
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

**Use fixture:**

```typescript
import { test, expect } from './fixtures';

test('test with auth', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('https://example.com/dashboard');
  await expect(authenticatedPage).toHaveURL(/dashboard/);
});
```

---

## Resource Optimization

### Browser Reuse

**Don't launch browser per test:**

```typescript
// ❌ Bad: Launches browser for each test
test('test 1', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await browser.close();
});

// ✅ Good: Use provided fixtures
test('test 1', async ({ page }) => {
  await page.goto('https://example.com');
  // Browser managed by Playwright
});
```

**Browser context reuse:**

```typescript
// Playwright automatically manages browser instances
export default defineConfig({
  workers: 4, // 4 workers = 4 browser instances max
});
```

### Network Optimization

**Block unnecessary resources:**

```typescript
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Block images, fonts, and media
  await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,mp4,webm}', route => route.abort());

  // Or block third-party scripts
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.includes('analytics') || url.includes('ads')) {
      return route.abort();
    }
    return route.continue();
  });
});

test('fast test', async ({ page }) => {
  await page.goto('https://example.com');
});
```

**Disable JavaScript when not needed:**

```typescript
test('content test', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false, // Faster page loads
  });

  const page = await context.newPage();
  await page.goto('https://example.com');
  // Test static content
});
```

**Configure network in config:**

```typescript
export default defineConfig({
  use: {
    // Faster page loads
    offline: false,
    serviceWorkers: 'block',

    // Ignore HTTPS errors (if testing localhost)
    ignoreHTTPSErrors: true,
  },
});
```

### Video and Screenshot Management

```typescript
export default defineConfig({
  use: {
    // Only record video on failure
    video: 'retain-on-failure',

    // Or never record (fastest)
    // video: 'off',

    // Screenshot only on failure
    screenshot: 'only-on-failure',

    // Or never take screenshots
    // screenshot: 'off',

    // Trace only on first retry
    trace: 'on-first-retry',

    // Or retain only on failure
    // trace: 'retain-on-failure',
  },
});
```

**Disable artifacts for fast tests:**

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'fast',
      use: {
        video: 'off',
        screenshot: 'off',
        trace: 'off',
      },
    },
    {
      name: 'full',
      use: {
        video: 'on',
        screenshot: 'on',
        trace: 'on',
      },
    },
  ],
});
```

**Run fast tests:**

```bash
npx playwright test --project=fast
```

---

## Performance Monitoring

### Measure Test Duration

```typescript
import { test } from '@playwright/test';

test('performance test', async ({ page }) => {
  const start = Date.now();

  await page.goto('https://example.com');
  await page.getByRole('button').click();

  const duration = Date.now() - start;
  console.log(`Test took ${duration}ms`);
});
```

### Report with duration

```typescript
export default defineConfig({
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
  ],
});
```

**Analyze JSON report:**

```javascript
// analyze-performance.js
const results = require('./test-results.json');

const tests = results.suites
  .flatMap(suite => suite.specs)
  .map(spec => ({
    title: spec.title,
    duration: spec.tests[0]?.results[0]?.duration || 0,
  }))
  .sort((a, b) => b.duration - a.duration);

console.log('Slowest tests:');
tests.slice(0, 10).forEach(test => {
  console.log(`${test.duration}ms - ${test.title}`);
});
```

### Test timeout configuration

```typescript
export default defineConfig({
  // Global timeout
  timeout: 30000, // 30 seconds

  // Per test timeout
  expect: {
    timeout: 5000, // 5 seconds for assertions
  },
});
```

**Per test timeout:**

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds for this test

  await page.goto('https://slow-site.com');
});
```

### Monitoring in CI

```yaml
# GitHub Actions
- name: Run tests with timing
  run: npx playwright test --reporter=json
- name: Analyze performance
  run: node analyze-performance.js
```

---

## Best Practices

### 1. Optimize Test Structure

```typescript
// ❌ Bad: Slow, redundant navigation
test('test 1', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('button', { name: 'A' }).click();
});

test('test 2', async ({ page }) => {
  await page.goto('https://example.com'); // Duplicate navigation
  await page.getByRole('button', { name: 'B' }).click();
});

// ✅ Good: Shared setup
test.beforeEach(async ({ page }) => {
  await page.goto('https://example.com');
});

test('test 1', async ({ page }) => {
  await page.getByRole('button', { name: 'A' }).click();
});

test('test 2', async ({ page }) => {
  await page.getByRole('button', { name: 'B' }).click();
});
```

### 2. Use Page Object Model

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('https://example.com/login');
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}

// Reuse across tests
test('test 1', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login('user@example.com', 'password');
});
```

### 3. Minimize Waits

```typescript
// ❌ Bad: Fixed waits
await page.waitForTimeout(3000); // Wastes time
await page.getByRole('button').click();

// ✅ Good: Auto-waiting
await page.getByRole('button').click(); // Waits only as needed

// ✅ Good: Specific condition
await page.waitForLoadState('networkidle');
```

### 4. Parallelize Effectively

```typescript
// playwright.config.ts
export default defineConfig({
  // CI: Limited resources
  workers: process.env.CI ? 2 : undefined,

  // Use fully parallel mode
  fullyParallel: true,

  // Retry flaky tests
  retries: process.env.CI ? 2 : 0,
});
```

### 5. Clean Up Resources

```typescript
test.afterEach(async ({ page }) => {
  // Clear storage after each test
  await page.context().clearCookies();
  await page.context().clearPermissions();
});
```

### 6. Profile and Optimize

```bash
# Run with reporter that shows duration
npx playwright test --reporter=list

# Find slow tests
npx playwright test --reporter=json | grep -A 5 '"duration"'

# Test specific slow files
npx playwright test slow.spec.ts --reporter=list
```

### 7. Use Sharding for Large Suites

```typescript
// For 100+ tests, use sharding
export default defineConfig({
  // Local sharding
  shard: process.env.SHARD ? {
    current: parseInt(process.env.SHARD.split('/')[0]),
    total: parseInt(process.env.SHARD.split('/')[1]),
  } : undefined,
});
```

### 8. Optimize CI Pipeline

```yaml
# GitHub Actions optimized
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4, 5, 6, 7, 8]
    steps:
      - uses: actions/cache@v3
        with:
          path: |
            ~/.cache/ms-playwright
            node_modules
          key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=${{ matrix.shard }}/8 --project=chromium
```

---

## Performance Checklist

- [ ] Configure appropriate number of workers
- [ ] Use fully parallel mode when possible
- [ ] Implement sharding for large test suites
- [ ] Reuse authentication state
- [ ] Block unnecessary network resources
- [ ] Disable videos/screenshots for fast tests
- [ ] Use trace only on failure
- [ ] Minimize fixed waits
- [ ] Share setup in beforeEach hooks
- [ ] Use page object model for reusability
- [ ] Cache dependencies in CI
- [ ] Profile and identify slow tests
- [ ] Optimize test structure
- [ ] Clean up resources after tests

---

## Quick Reference

| Optimization | Configuration | Impact |
|--------------|---------------|--------|
| Workers | `workers: 4` | High - More parallelization |
| Sharding | `--shard=1/4` | High - Distribute across machines |
| Storage State | `storageState: 'auth.json'` | Medium - Skip login |
| Block Resources | `page.route()` | Medium - Faster page loads |
| Disable Video | `video: 'off'` | Medium - Reduce overhead |
| Fully Parallel | `fullyParallel: true` | High - Max parallelization |
| Timeouts | `timeout: 30000` | Low - Fail fast |

---

## Summary

- **Use parallel execution** with appropriate worker count
- **Implement sharding** for large test suites and CI
- **Reuse authentication** with storage state
- **Optimize resources** by blocking unnecessary requests
- **Minimize artifacts** (videos, screenshots) for fast tests
- **Profile regularly** to identify bottlenecks
- **Structure tests efficiently** with shared setup
- **Use caching** in CI pipelines
