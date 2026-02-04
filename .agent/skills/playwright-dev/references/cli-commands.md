# Playwright CLI Commands Reference

Complete reference for all Playwright CLI commands.

## Table of Contents

- [Installation Commands](#installation-commands)
- [Test Execution](#test-execution)
- [Code Generation](#code-generation)
- [Debugging](#debugging)
- [Reporting](#reporting)
- [Browser Management](#browser-management)
- [Configuration](#configuration)

## Installation Commands

### Install Playwright

```bash
npm init playwright@latest
```

Options:

- `--yes` - Use default values
- `--gha` - Add GitHub Actions workflow

### Install Browsers

```bash
# Install all browsers
npx playwright install

# Install specific browser
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit

# Install with system dependencies
npx playwright install --with-deps

# Install specific browser with deps
npx playwright install chromium --with-deps
```

## Test Execution

### Basic Test Running

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/login.spec.ts

# Run tests in specific directory
npx playwright test tests/auth/

# Run tests matching pattern
npx playwright test --grep "login"

# Run tests NOT matching pattern
npx playwright test --grep-invert "slow"
```

### Browser Selection

```bash
# Run on specific project (browser)
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run on multiple projects
npx playwright test --project=chromium --project=firefox
```

### Execution Control

```bash
# Run in headed mode (visible browser)
npx playwright test --headed

# Run specific number of workers
npx playwright test --workers=4

# Run fully parallel
npx playwright test --fully-parallel

# Run tests sequentially
npx playwright test --workers=1

# Run with specific timeout
npx playwright test --timeout=60000

# Retry failed tests
npx playwright test --retries=2

# Run only failed tests from last run
npx playwright test --last-failed
```

### Test Filtering

```bash
# Run tests by title
npx playwright test -g "should login"

# Run tests in specific file and line
npx playwright test tests/login.spec.ts:42

# List all tests without running
npx playwright test --list

# Run tests with specific tag
npx playwright test --grep @smoke
```

### Sharding (Parallel CI)

```bash
# Split tests into 3 shards, run first shard
npx playwright test --shard=1/3

# Run second shard
npx playwright test --shard=2/3

# Run third shard
npx playwright test --shard=3/3
```

## Code Generation

### Codegen - Record Interactions

```bash
# Start recording
npx playwright codegen

# Record against specific URL
npx playwright codegen https://example.com

# Record with specific browser
npx playwright codegen --browser chromium https://example.com

# Record with device emulation
npx playwright codegen --device="iPhone 12" https://example.com

# Record with specific viewport
npx playwright codegen --viewport-size=800,600 https://example.com

# Save output to file
npx playwright codegen --output tests/new-test.spec.ts https://example.com

# Record with custom user agent
npx playwright codegen --user-agent="Custom Agent" https://example.com

# Record with geolocation
npx playwright codegen --geolocation="37.7749,-122.4194" https://example.com

# Record with timezone
npx playwright codegen --timezone="America/New_York" https://example.com
```

## Debugging

### Debug Mode

```bash
# Run test in debug mode
npx playwright test --debug

# Debug specific test
npx playwright test tests/login.spec.ts --debug

# Debug from specific line
npx playwright test tests/login.spec.ts:42 --debug
```

### UI Mode (Interactive)

```bash
# Open UI mode
npx playwright test --ui

# UI mode with specific test
npx playwright test tests/login.spec.ts --ui
```

### Trace Viewer

```bash
# Show trace for last run
npx playwright show-trace

# Show specific trace file
npx playwright show-trace trace.zip

# Show trace from URL
npx playwright show-trace https://example.com/trace.zip
```

## Reporting

### Generate Reports

```bash
# Show HTML report
npx playwright show-report

# Show report from specific directory
npx playwright show-report playwright-report/

# Run tests with specific reporter
npx playwright test --reporter=html
npx playwright test --reporter=json
npx playwright test --reporter=junit
npx playwright test --reporter=list
npx playwright test --reporter=dot
npx playwright test --reporter=line

# Use multiple reporters
npx playwright test --reporter=html --reporter=json
```

### Screenshot Comparison

```bash
# Update snapshots
npx playwright test --update-snapshots

# Update snapshots for specific test
npx playwright test tests/visual.spec.ts --update-snapshots

# Ignore snapshots (skip visual comparisons)
npx playwright test --ignore-snapshots
```

## Browser Management

### Install/Uninstall Browsers

```bash
# Show installed browsers
npx playwright install --dry-run

# Uninstall browsers (not officially supported, manual cleanup)
# Browsers are typically stored in:
# - macOS: ~/Library/Caches/ms-playwright
# - Linux: ~/.cache/ms-playwright
# - Windows: %USERPROFILE%\AppData\Local\ms-playwright
```

### Browser Channels

```bash
# Install Chrome instead of Chromium
npx playwright install chrome

# Install Edge
npx playwright install msedge

# Run tests on specific channel
npx playwright test --browser=chrome
npx playwright test --browser=msedge
```

## Configuration

### Configuration File

```bash
# Use specific config file
npx playwright test --config=playwright.config.ts

# Show effective configuration
npx playwright show-config
```

### Environment Variables

```bash
# Set base URL
BASE_URL=https://staging.example.com npx playwright test

# Set headed mode
HEADED=1 npx playwright test

# Enable debug logging
DEBUG=pw:api npx playwright test

# Disable browser downloads
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install

# Use specific browser binary
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npx playwright test
```

### Global Options

```bash
# Set global timeout
npx playwright test --global-timeout=3600000

# Forbid .only (for CI)
npx playwright test --forbid-only

# Pass through for tests
npx playwright test --pass-with-no-tests

# Set max failures
npx playwright test --max-failures=5

# Quiet mode (less output)
npx playwright test --quiet

# Set output directory
npx playwright test --output=./test-output
```

## Advanced Commands

### Test Server

```bash
# Start test server (from playwright.config.ts webServer option)
# Automatically started when running tests, but can be useful for debugging

# The test server configuration in playwright.config.ts:
# webServer: {
#   command: 'npm run start',
#   port: 3000,
# }
```

### Inspector

```bash
# Launch Playwright Inspector
PWDEBUG=1 npx playwright test

# Inspector with console enabled
PWDEBUG=console npx playwright test
```

### Performance Profiling

```bash
# Generate trace for all tests
npx playwright test --trace on

# Generate trace only on first retry
npx playwright test --trace on-first-retry

# Generate trace on failure
npx playwright test --trace retain-on-failure
```

### Video Recording

```bash
# Record video for all tests
npx playwright test --video on

# Record video on failure
npx playwright test --video retain-on-failure

# Record video on first retry
npx playwright test --video on-first-retry
```

### Screenshots

```bash
# Take screenshot on failure
npx playwright test --screenshot only-on-failure

# Take screenshot for all tests
npx playwright test --screenshot on
```

## Combining Options

Common combinations for different scenarios:

### Local Development

```bash
npx playwright test --headed --workers=1 --debug tests/login.spec.ts
```

### CI/CD

```bash
npx playwright test \
  --project=chromium \
  --workers=2 \
  --retries=2 \
  --reporter=html \
  --reporter=json \
  --shard=1/3
```

### Visual Testing

```bash
npx playwright test \
  --project=chromium \
  --update-snapshots \
  tests/visual/
```

### Quick Smoke Test

```bash
npx playwright test \
  --grep @smoke \
  --project=chromium \
  --workers=4
```

### Full Regression

```bash
npx playwright test \
  --project=chromium \
  --project=firefox \
  --project=webkit \
  --workers=4 \
  --retries=2 \
  --reporter=html
```
