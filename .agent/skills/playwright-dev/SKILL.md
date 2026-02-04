---
name: playwright-dev
description: >
  Comprehensive Playwright development support covering CLI commands, API patterns,
  MCP integration, E2E testing strategies, debugging, CI/CD integration, and best practices.
  Use when: (1) Creating or running Playwright tests, (2) Browser automation tasks,
  (3) Setting up CI/CD pipelines for testing, (4) Debugging test failures,
  (5) Integrating with MCP servers for AI-driven automation, (6) Optimizing test performance,
  (7) Implementing Page Object Model patterns
---

# Playwright Development Skill

Comprehensive support for Playwright-based testing and browser automation, from initial setup to production deployment.

## Quick Start

### Initialize New Project

Use the bundled script to create a new Playwright project:

```bash
bash scripts/init_project.sh my-project typescript
```

This creates a complete project structure with:
- Playwright configuration with best practices
- Test directory structure
- Example tests
- TypeScript/JavaScript setup

### Generate Tests

Create tests from templates:

```bash
# Basic test
python3 scripts/generate_test.py login-test --type basic --lang ts

# Form testing
python3 scripts/generate_test.py checkout-form --type form --page-object

# API testing
python3 scripts/generate_test.py api-endpoints --type api

# Visual regression
python3 scripts/generate_test.py homepage-visual --type visual
```

### Run Tests

```bash
# Run all tests
npx playwright test

# Run with debug helper
bash scripts/debug_helper.sh debug tests/login.spec.ts

# Run in headed mode
bash scripts/debug_helper.sh headed tests/checkout.spec.ts

# Launch codegen
bash scripts/debug_helper.sh codegen https://example.com
```

### CI/CD Execution

```bash
# Optimized for CI environments
bash scripts/run_ci.sh --shard 1/3

# With specific settings
BROWSER=firefox WORKERS=4 bash scripts/run_ci.sh
```

## Core Workflows

### 1. Writing Tests

**Basic Test Pattern:**

```typescript
import { test, expect } from '@playwright/test';

test('should complete user flow', async ({ page }) => {
  // Navigate
  await page.goto('/');

  // Interact - use user-facing selectors
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('secure123');

  // Assert
  await expect(page.getByRole('heading')).toHaveText('Welcome');
  await expect(page).toHaveURL(/dashboard/);
});
```

**Selector Priority (Best Practice):**

1. `getByRole()` - Accessible roles
2. `getByLabel()` - Form labels
3. `getByTestId()` - Test IDs
4. `getByText()` - Text content
5. CSS/XPath - Last resort

See [references/selectors-best-practices.md](references/selectors-best-practices.md) for comprehensive guidance.

### 2. Page Object Model

Use the provided base classes:

```typescript
// Extend BasePage from assets
import { BasePage } from './page-objects/BasePage';
import { Page, Locator } from '@playwright/test';

export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.getByRole('heading', { level: 1 });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  async getWelcomeText(): Promise<string> {
    return await this.getText(this.welcomeMessage);
  }
}
```

See [assets/page-objects/](assets/page-objects/) for complete examples including `BasePage.ts` and `LoginPage.ts`.

### 3. Custom Fixtures

Reuse authentication and setup across tests:

```typescript
// Use provided auth fixture
import { test, expect } from './fixtures/auth.fixture';

test('dashboard test', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.getByText('Welcome back')).toBeVisible();
});

test('admin test', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading')).toHaveText('Admin Panel');
});
```

See [assets/fixtures/](assets/fixtures/) for `auth.fixture.ts` and `api.fixture.ts` examples.

### 4. API Testing

```typescript
test('should create and fetch user', async ({ request }) => {
  // Create user
  const createResponse = await request.post('/api/users', {
    data: { name: 'Test User', email: 'test@example.com' }
  });
  expect(createResponse.ok()).toBeTruthy();
  const user = await createResponse.json();

  // Fetch user
  const getResponse = await request.get(`/api/users/${user.id}`);
  expect(getResponse.ok()).toBeTruthy();
  const fetchedUser = await getResponse.json();
  expect(fetchedUser.name).toBe('Test User');
});
```

For API patterns and mocking, see [references/api-patterns.md](references/api-patterns.md).

## Advanced Features

### MCP Server Integration

For AI-driven browser automation:

```typescript
// Implement Playwright MCP server for LLM control
// See references/mcp-integration.md for complete implementation
```

**Key MCP Tools:**
- `launch_browser` - Initialize browser
- `navigate` - Go to URL
- `click_element` - Interact with elements
- `screenshot` - Capture visuals
- `extract_data` - Structured data extraction

Full guide: [references/mcp-integration.md](references/mcp-integration.md)

### CI/CD Integration

Copy ready-to-use workflows from [assets/ci-workflows/](assets/ci-workflows/):

- **GitHub Actions**: `github-actions.yml` - Includes sharding, blob reports, artifact upload
- **GitLab CI**: `gitlab-ci.yml` - Docker-based parallel execution
- **Azure Pipelines**: `azure-pipelines.yml` - Multi-stage with JUnit integration

Configuration guide: [references/ci-cd-configs.md](references/ci-cd-configs.md)

### Debugging

**Interactive Debugging:**

```bash
# Playwright Inspector (step-through debugging)
npx playwright test --debug

# UI Mode (time-travel debugging)
npx playwright test --ui

# Trace Viewer
npx playwright show-trace
```

**Using Debug Helper:**

```bash
bash scripts/debug_helper.sh inspector
bash scripts/debug_helper.sh trace tests/checkout.spec.ts
bash scripts/debug_helper.sh doctor  # Run diagnostics
```

Complete debugging guide: [references/debugging.md](references/debugging.md)

### Performance Optimization

**Parallel Execution:**

```typescript
// playwright.config.ts
export default defineConfig({
  workers: 4,              // Run 4 tests in parallel
  fullyParallel: true,     // Parallel within files
});
```

**Test Sharding:**

```bash
# Split tests across 3 CI machines
npx playwright test --shard=1/3
npx playwright test --shard=2/3
npx playwright test --shard=3/3
```

**Resource Optimization:**

```typescript
// Block unnecessary resources
await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());

// Reuse authentication
use: {
  storageState: 'auth.json',  // Skip login for every test
}
```

Full optimization guide: [references/performance.md](references/performance.md)

## Configuration

### Recommended Config

Use the comprehensive config template:

```bash
cp assets/playwright.config.ts ./playwright.config.ts
```

This includes:
- Multi-browser setup (Chromium, Firefox, WebKit)
- Mobile viewports
- Trace/screenshot on failure
- HTML/JSON reporters
- Web server integration
- Best practice defaults

### Environment Variables

```bash
# Base URL for tests
export BASE_URL=https://staging.example.com

# CI mode
export CI=true

# Debug mode
export PWDEBUG=1

# Headed mode
export HEADED=1
```

## CLI Commands Reference

**Essential Commands:**

```bash
# Run tests
npx playwright test
npx playwright test tests/login.spec.ts
npx playwright test --grep @smoke
npx playwright test --project=chromium

# Debug
npx playwright test --debug
npx playwright test --ui
npx playwright test --trace on

# Code generation
npx playwright codegen
npx playwright codegen https://example.com

# Reports
npx playwright show-report
npx playwright show-trace trace.zip

# Browsers
npx playwright install
npx playwright install --with-deps chromium
```

For complete CLI reference: [references/cli-commands.md](references/cli-commands.md)

## Bundled Resources

### Scripts

Located in `scripts/`:

- **`init_project.sh`** - Initialize new Playwright project with structure
- **`generate_test.py`** - Generate tests from templates (basic, form, API, visual)
- **`debug_helper.sh`** - Debug utilities (inspector, trace, codegen, doctor)
- **`run_ci.sh`** - CI-optimized test runner with sharding support

### References

Located in `references/`:

- **`cli-commands.md`** - Complete CLI command reference with examples
- **`api-patterns.md`** - Common patterns: locators, actions, assertions, Page Objects, fixtures, API testing, mocking
- **`mcp-integration.md`** - MCP server implementation for AI-driven automation
- **`ci-cd-configs.md`** - CI/CD setup for GitHub Actions, GitLab, CircleCI, Azure
- **`selectors-best-practices.md`** - Selector strategies and anti-patterns
- **`debugging.md`** - Debugging techniques with Inspector, Trace Viewer, UI Mode
- **`performance.md`** - Performance optimization, parallelization, sharding

### Assets

Located in `assets/`:

- **`playwright.config.ts`** - Comprehensive configuration template
- **`ci-workflows/`** - Production-ready CI/CD workflows
  - `github-actions.yml`
  - `gitlab-ci.yml`
  - `azure-pipelines.yml`
- **`page-objects/`** - Page Object Model templates
  - `BasePage.ts` - Base class with common methods
  - `LoginPage.ts` - Example implementation
- **`fixtures/`** - Custom fixture examples
  - `auth.fixture.ts` - Authentication fixtures
  - `api.fixture.ts` - API request fixtures

## Best Practices

1. **Selector Strategy**: Use role-based selectors first, avoid CSS/XPath
2. **Test Isolation**: Each test should be independent
3. **Page Objects**: Encapsulate page interactions
4. **Fixtures**: Reuse common setup (auth, data)
5. **Assertions**: Use auto-waiting assertions (`expect`)
6. **Parallel Execution**: Enable for faster feedback
7. **CI Integration**: Use sharding for scalability
8. **Debugging**: Leverage traces and screenshots
9. **Performance**: Block unnecessary resources, reuse auth

## Common Patterns

### Authentication Flow

```typescript
// Reusable auth with storage state
// In global-setup.ts
await page.goto('/login');
await page.getByLabel('Email').fill('user@example.com');
await page.getByLabel('Password').fill('password');
await page.getByRole('button', { name: 'Login' }).click();
await page.context().storageState({ path: 'auth.json' });

// In playwright.config.ts
use: {
  storageState: 'auth.json',
}
```

### Mocking API Responses

```typescript
await page.route('/api/users', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify([{ id: 1, name: 'Mock User' }])
  });
});
```

### Waiting for Network

```typescript
const responsePromise = page.waitForResponse('/api/data');
await page.getByRole('button', { name: 'Load Data' }).click();
const response = await responsePromise;
expect(response.status()).toBe(200);
```

### Visual Regression

```typescript
await expect(page).toHaveScreenshot('homepage.png');
await expect(page.locator('.card')).toHaveScreenshot('card.png');
```

## Troubleshooting

### Tests are flaky

- Use auto-waiting assertions (`expect`)
- Avoid `page.waitForTimeout()`
- Enable retries in CI: `retries: 2`
- Check [references/debugging.md](references/debugging.md) for diagnosis

### Slow test execution

- Enable parallel execution
- Use test sharding
- Block unnecessary resources
- See [references/performance.md](references/performance.md)

### Element not found

- Verify selector with Inspector: `npx playwright test --debug`
- Use more specific locators
- Check [references/selectors-best-practices.md](references/selectors-best-practices.md)

### CI failures

- Check browser installation: `npx playwright install --with-deps`
- Review CI configuration: [references/ci-cd-configs.md](references/ci-cd-configs.md)
- Analyze traces from artifacts

## Next Steps

1. **Initialize project**: `bash scripts/init_project.sh my-tests typescript`
2. **Generate first test**: `python3 scripts/generate_test.py login-flow --type form --page-object`
3. **Run tests**: `npx playwright test`
4. **Debug failures**: `bash scripts/debug_helper.sh debug tests/login-flow.spec.ts`
5. **Set up CI**: Copy workflow from `assets/ci-workflows/`
6. **Optimize**: Review [references/performance.md](references/performance.md)

For detailed guidance on any topic, consult the appropriate reference file in `references/`.
