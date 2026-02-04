#!/usr/bin/env python3
"""
Generate Playwright test files from templates.

Usage:
    python generate_test.py <test-name> [options]

Options:
    --type <type>       Test type: basic, form, api, visual (default: basic)
    --lang <lang>       Language: ts or js (default: ts)
    --page-object       Generate with Page Object pattern
    --output <path>     Output directory (default: ./tests)
"""

import os
import sys
from pathlib import Path

TEMPLATES = {
    "basic": {
        "ts": '''import {{ test, expect }} from '@playwright/test';

test.describe('{testName}', () => {{
  test('should load page successfully', async ({{ page }}) => {{
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);
  }});

  test('should display main content', async ({{ page }}) => {{
    await page.goto('/');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  }});
}});
''',
        "js": '''const {{ test, expect }} = require('@playwright/test');

test.describe('{testName}', () => {{
  test('should load page successfully', async ({{ page }}) => {{
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);
  }});

  test('should display main content', async ({{ page }}) => {{
    await page.goto('/');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  }});
}});
'''
    },
    "form": {
        "ts": '''import {{ test, expect }} from '@playwright/test';

test.describe('{testName}', () => {{
  test('should submit form successfully', async ({{ page }}) => {{
    await page.goto('/form');

    // Fill form fields
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'Test message');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('.success-message')).toBeVisible();
  }});

  test('should validate required fields', async ({{ page }}) => {{
    await page.goto('/form');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.locator('.error-message')).toBeVisible();
  }});
}});
''',
        "js": '''const {{ test, expect }} = require('@playwright/test');

test.describe('{testName}', () => {{
  test('should submit form successfully', async ({{ page }}) => {{
    await page.goto('/form');

    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'Test message');

    await page.click('button[type="submit"]');

    await expect(page.locator('.success-message')).toBeVisible();
  }});
}});
'''
    },
    "api": {
        "ts": '''import {{ test, expect }} from '@playwright/test';

test.describe('{testName} - API Tests', () => {{
  test('should fetch data from API', async ({{ request }}) => {{
    const response = await request.get('/api/data');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('results');
  }});

  test('should post data to API', async ({{ request }}) => {{
    const response = await request.post('/api/data', {{
      data: {{
        name: 'Test Item',
        value: 123
      }}
    }});

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result).toHaveProperty('id');
  }});

  test('should handle API errors gracefully', async ({{ request }}) => {{
    const response = await request.get('/api/nonexistent');
    expect(response.status()).toBe(404);
  }});
}});
''',
        "js": '''const {{ test, expect }} = require('@playwright/test');

test.describe('{testName} - API Tests', () => {{
  test('should fetch data from API', async ({{ request }}) => {{
    const response = await request.get('/api/data');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('results');
  }});
}});
'''
    },
    "visual": {
        "ts": '''import {{ test, expect }} from '@playwright/test';

test.describe('{testName} - Visual Tests', () => {{
  test('should match homepage screenshot', async ({{ page }}) => {{
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png');
  }});

  test('should match component screenshot', async ({{ page }}) => {{
    await page.goto('/components');
    const component = page.locator('.target-component');
    await expect(component).toHaveScreenshot('component.png');
  }});

  test('should match screenshot in different viewport', async ({{ page }}) => {{
    await page.setViewportSize({{ width: 375, height: 667 }});
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-mobile.png');
  }});
}});
''',
        "js": '''const {{ test, expect }} = require('@playwright/test');

test.describe('{testName} - Visual Tests', () => {{
  test('should match homepage screenshot', async ({{ page }}) => {{
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png');
  }});
}});
'''
    }
}

PAGE_OBJECT_TEMPLATE = {
    "ts": '''import {{ Page, Locator }} from '@playwright/test';

export class {className} {{
  readonly page: Page;
  readonly heading: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {{
    this.page = page;
    this.heading = page.locator('h1');
    this.submitButton = page.locator('button[type="submit"]');
  }}

  async goto() {{
    await this.page.goto('/');
  }}

  async getTitle() {{
    return await this.heading.textContent();
  }}
}}
''',
    "js": '''class {className} {{
  constructor(page) {{
    this.page = page;
    this.heading = page.locator('h1');
    this.submitButton = page.locator('button[type="submit"]');
  }}

  async goto() {{
    await this.page.goto('/');
  }}

  async getTitle() {{
    return await this.heading.textContent();
  }}
}}

module.exports = {{ {className} }};
'''
}

def to_pascal_case(s):
    """Convert kebab-case or snake_case to PascalCase"""
    return ''.join(word.capitalize() for word in s.replace('-', '_').split('_'))

def generate_test(test_name, test_type='basic', lang='ts', page_object=False, output_dir='./tests'):
    """Generate a test file from template"""

    if test_type not in TEMPLATES:
        print(f"❌ Unknown test type: {test_type}")
        print(f"   Available types: {', '.join(TEMPLATES.keys())}")
        return False

    if lang not in ['ts', 'js']:
        print(f"❌ Unknown language: {lang}")
        print(f"   Available languages: ts, js")
        return False

    # Prepare paths
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    ext = 'ts' if lang == 'ts' else 'js'
    test_file = output_path / f"{test_name}.spec.{ext}"

    # Generate test content
    template = TEMPLATES[test_type][lang]
    content = template.format(testName=test_name.replace('-', ' ').title())

    # Write test file
    with open(test_file, 'w') as f:
        f.write(content)

    print(f"✅ Created test: {test_file}")

    # Generate Page Object if requested
    if page_object:
        po_dir = output_path / 'page-objects'
        po_dir.mkdir(exist_ok=True)

        class_name = to_pascal_case(test_name) + 'Page'
        po_file = po_dir / f"{test_name}.page.{ext}"

        po_content = PAGE_OBJECT_TEMPLATE[lang].format(className=class_name)

        with open(po_file, 'w') as f:
            f.write(po_content)

        print(f"✅ Created Page Object: {po_file}")

    return True

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    test_name = sys.argv[1]

    # Parse options
    test_type = 'basic'
    lang = 'ts'
    page_object = False
    output_dir = './tests'

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--type' and i + 1 < len(sys.argv):
            test_type = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--lang' and i + 1 < len(sys.argv):
            lang = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--page-object':
            page_object = True
            i += 1
        elif sys.argv[i] == '--output' and i + 1 < len(sys.argv):
            output_dir = sys.argv[i + 1]
            i += 2
        else:
            print(f"⚠️  Unknown option: {sys.argv[i]}")
            i += 1

    # Generate test
    success = generate_test(test_name, test_type, lang, page_object, output_dir)

    if success:
        print("")
        print("🚀 Next steps:")
        print(f"   1. Edit the generated test: {output_dir}/{test_name}.spec.{lang}")
        print(f"   2. Run the test: npx playwright test {test_name}")
        print(f"   3. Debug if needed: npx playwright test {test_name} --debug")
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
