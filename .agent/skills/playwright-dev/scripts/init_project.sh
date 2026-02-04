#!/bin/bash
# Initialize a new Playwright project with best practices

set -e

PROJECT_NAME="${1:-playwright-tests}"
LANGUAGE="${2:-typescript}"  # typescript or javascript

echo "🎭 Initializing Playwright project: $PROJECT_NAME"

# Create project directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Initialize npm project if not exists
if [ ! -f "package.json" ]; then
    npm init -y
fi

# Install Playwright
echo "📦 Installing Playwright..."
npm install -D @playwright/test

# Install TypeScript types if needed
if [ "$LANGUAGE" = "typescript" ]; then
    npm install -D @types/node
fi

# Install browsers
echo "🌐 Installing browsers..."
npx playwright install

# Create recommended directory structure
mkdir -p tests
mkdir -p tests/fixtures
mkdir -p tests/page-objects
mkdir -p tests/utils

# Create playwright.config.ts
if [ "$LANGUAGE" = "typescript" ]; then
    cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
EOF

    # Create tsconfig.json
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node", "@playwright/test"]
  },
  "include": ["tests/**/*"]
}
EOF

    # Create example test
    cat > tests/example.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('Example Test Suite', () => {
  test('basic navigation test', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Home/);
  });
});
EOF

else
    # JavaScript config
    cat > playwright.config.js << 'EOF'
// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
EOF

    # Create example test
    cat > tests/example.spec.js << 'EOF'
const { test, expect } = require('@playwright/test');

test.describe('Example Test Suite', () => {
  test('basic navigation test', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Home/);
  });
});
EOF
fi

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
/test-results/
/playwright-report/
/playwright/.cache/
/.env
EOF

# Create README
README_EXT="md"
cat > README.$README_EXT << 'EOF'
# Playwright Tests

## Setup

```bash
npm install
npx playwright install
```

## Run Tests

```bash
# Run all tests
npx playwright test

# Run in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test tests/example.spec.ts

# Run in debug mode
npx playwright test --debug
```

## View Report

```bash
npx playwright show-report
```
EOF

echo "✅ Playwright project initialized successfully!"
echo ""
echo "📂 Project structure:"
echo "   $PROJECT_NAME/"
echo "   ├── playwright.config.$([[ "$LANGUAGE" = "typescript" ]] && echo "ts" || echo "js")"
echo "   ├── tests/"
echo "   │   ├── example.spec.$([[ "$LANGUAGE" = "typescript" ]] && echo "ts" || echo "js")"
echo "   │   ├── fixtures/"
echo "   │   ├── page-objects/"
echo "   │   └── utils/"
echo "   └── README.md"
echo ""
echo "🚀 Next steps:"
echo "   cd $PROJECT_NAME"
echo "   npx playwright test"
