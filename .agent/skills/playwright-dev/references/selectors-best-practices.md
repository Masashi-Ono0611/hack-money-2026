# Selectors Best Practices

Comprehensive guide to writing robust, maintainable selectors in Playwright tests.

## Table of Contents

- [Priority Order](#priority-order)
- [Locator Strategies](#locator-strategies)
  - [Role-Based Locators](#role-based-locators)
  - [Test ID Locators](#test-id-locators)
  - [Text-Based Locators](#text-based-locators)
  - [CSS Selectors](#css-selectors)
  - [XPath Selectors](#xpath-selectors)
- [Avoiding Fragile Selectors](#avoiding-fragile-selectors)
- [Good vs Bad Examples](#good-vs-bad-examples)
- [Chaining and Filtering](#chaining-and-filtering)
- [Advanced Techniques](#advanced-techniques)
- [Testing Selectors](#testing-selectors)

---

## Priority Order

Follow this priority order when choosing selectors:

1. **Role-based locators** (`getByRole`)
2. **Test ID locators** (`getByTestId`)
3. **Label/Placeholder locators** (`getByLabel`, `getByPlaceholder`)
4. **Text locators** (`getByText`)
5. **CSS selectors** (as a last resort)
6. **XPath** (avoid if possible)

### Why This Order?

- **Accessibility-first**: Role-based locators align with how users interact with your app
- **Resilient**: These selectors survive styling changes and refactoring
- **Maintainable**: Explicit test IDs are self-documenting
- **Future-proof**: Less likely to break with UI updates

---

## Locator Strategies

### Role-Based Locators

Role-based locators use ARIA roles and accessible names.

```typescript
// Best: Use getByRole with accessible name
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
await page.getByRole('heading', { name: 'Welcome' }).isVisible();

// With level for headings
await page.getByRole('heading', { name: 'Title', level: 1 });

// For links
await page.getByRole('link', { name: 'Learn more' }).click();

// For checkboxes and radio buttons
await page.getByRole('checkbox', { name: 'Accept terms' }).check();
await page.getByRole('radio', { name: 'Option A' }).check();

// For select elements
await page.getByRole('combobox', { name: 'Country' }).selectOption('USA');

// For navigation
await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click();
```

**Advantages:**
- Encourages accessible markup
- Resilient to styling changes
- Readable and self-documenting
- Aligns with user perspective

**When to use:**
- Interactive elements (buttons, inputs, links)
- Form controls
- Structural elements (headings, navigation)

### Test ID Locators

Use `data-testid` attributes for elements without clear roles or when role-based locators are insufficient.

```typescript
// Add data-testid to your HTML
// <div data-testid="user-profile">...</div>

// Then use in tests
await page.getByTestId('user-profile').click();
await page.getByTestId('submit-button').click();
await page.getByTestId('product-card').first().click();

// Combining with other locators
const userProfile = page.getByTestId('user-profile');
await userProfile.getByRole('button', { name: 'Edit' }).click();
```

**Advantages:**
- Explicit intent for testing
- Not affected by text changes
- Easy to maintain
- Works for any element

**Best practices:**
- Use kebab-case: `user-profile`, not `userProfile` or `user_profile`
- Be descriptive: `primary-nav-button`, not `btn1`
- Add to component code, not just for tests
- Document purpose in component

**When to use:**
- Complex components without clear roles
- Dynamic content
- When role-based locators would be ambiguous
- Container elements

### Text-Based Locators

Find elements by their visible text content.

```typescript
// Exact match (default)
await page.getByText('Welcome back').click();

// Substring match
await page.getByText('Welcome', { exact: false }).click();

// Regular expression
await page.getByText(/welcome/i).click();

// For labels
await page.getByLabel('Email address').fill('test@example.com');
await page.getByLabel(/password/i).fill('secret');

// For placeholders
await page.getByPlaceholder('Search...').fill('playwright');
await page.getByPlaceholder(/enter your/i).fill('value');

// Alt text for images
await page.getByAltText('Company logo').isVisible();
```

**Advantages:**
- Natural and readable
- Good for stable text content
- Works well for static content

**Disadvantages:**
- Breaks with text changes
- Problematic for i18n
- Case-sensitive by default

**When to use:**
- Static content that won't change
- Non-internationalized apps
- Unique text on the page
- Quick prototyping

### CSS Selectors

Use CSS selectors as a fallback when semantic locators aren't suitable.

```typescript
// Class selectors
await page.locator('.btn-primary').click();
await page.locator('.user-card.active').click();

// Attribute selectors
await page.locator('[name="email"]').fill('test@example.com');
await page.locator('[type="submit"]').click();
await page.locator('[aria-label="Close"]').click();

// Combining selectors
await page.locator('button.btn-primary[type="submit"]').click();

// Pseudo-selectors
await page.locator('li:first-child').click();
await page.locator('tr:nth-child(2)').click();

// Descendant combinators
await page.locator('.modal .btn-primary').click();
await page.locator('form input[type="email"]').fill('test@example.com');
```

**Advantages:**
- Familiar to web developers
- Flexible and powerful
- Can target any element

**Disadvantages:**
- Fragile (breaks with styling changes)
- Less readable
- Not user-centric
- Harder to maintain

**When to use:**
- No suitable semantic locator exists
- Need to select by specific attributes
- Working with legacy code
- Complex selector requirements

### XPath Selectors

Avoid XPath when possible, but it can be useful for complex traversal.

```typescript
// Basic XPath
await page.locator('xpath=//button[@type="submit"]').click();

// Text-based XPath
await page.locator('xpath=//button[contains(text(), "Submit")]').click();

// Traversal
await page.locator('xpath=//div[@class="parent"]//button').click();
await page.locator('xpath=//button/following-sibling::div').isVisible();

// Complex conditions
await page.locator('xpath=//input[@type="text" and @name="email"]').fill('test@example.com');
```

**Disadvantages:**
- Less readable
- Performance overhead
- Not Playwright's strength
- Harder to debug

**When to use:**
- Complex tree navigation required
- Working with XML documents
- Absolutely no other option

---

## Avoiding Fragile Selectors

### Don't Use

```typescript
// ❌ Generic class names
await page.locator('.btn').click();
await page.locator('.text-blue-500').click();

// ❌ Position-based selectors
await page.locator('div > div > button').click();
await page.locator('body > div:nth-child(3) > button').click();

// ❌ Auto-generated classes
await page.locator('.MuiButton-root-xyz123').click();
await page.locator('[class*="css-"]').click();

// ❌ IDs for non-unique elements
await page.locator('#item-1').click(); // If generated dynamically

// ❌ Overly specific selectors
await page.locator('div.container div.row div.col-md-6 button.btn-primary').click();

// ❌ Implementation details
await page.locator('[data-v-abc123]').click(); // Vue-specific
await page.locator('[_ngcontent-c1]').click(); // Angular-specific
```

### Do Use

```typescript
// ✅ Semantic locators
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');

// ✅ Test IDs
await page.getByTestId('submit-button').click();
await page.getByTestId('email-input').fill('test@example.com');

// ✅ Stable attributes
await page.locator('[name="email"]').fill('test@example.com');
await page.locator('[aria-label="Search"]').fill('query');

// ✅ Meaningful classes
await page.locator('.product-card').first().click();

// ✅ Scoped selectors
const modal = page.getByRole('dialog');
await modal.getByRole('button', { name: 'Confirm' }).click();
```

---

## Good vs Bad Examples

### Example 1: Login Form

```typescript
// ❌ Bad
await page.locator('#root > div > div > form > input:nth-child(1)').fill('user@example.com');
await page.locator('#root > div > div > form > input:nth-child(2)').fill('password');
await page.locator('.btn.btn-primary.submit-btn').click();

// ✅ Good
await page.getByLabel('Email').fill('user@example.com');
await page.getByLabel('Password').fill('password');
await page.getByRole('button', { name: 'Sign in' }).click();

// ✅ Better with test IDs (if labels aren't stable)
await page.getByTestId('email-input').fill('user@example.com');
await page.getByTestId('password-input').fill('password');
await page.getByTestId('submit-button').click();
```

### Example 2: Navigation

```typescript
// ❌ Bad
await page.locator('div.header ul li:nth-child(2) a').click();
await page.locator('.nav-item').nth(1).click();

// ✅ Good
await page.getByRole('navigation').getByRole('link', { name: 'Products' }).click();

// ✅ Also good
await page.getByRole('link', { name: 'Products' }).click();
```

### Example 3: Product Cards

```typescript
// ❌ Bad
await page.locator('.grid > div:nth-child(1) > div > button').click();
await page.locator('[class*="product-"]').first().locator('button').click();

// ✅ Good
await page.getByTestId('product-card').first().getByRole('button', { name: 'Add to cart' }).click();

// ✅ Or with filters
await page.getByRole('article').filter({ hasText: 'iPhone 15' }).getByRole('button', { name: 'Add to cart' }).click();
```

### Example 4: Tables

```typescript
// ❌ Bad
await page.locator('table tbody tr:nth-child(2) td:nth-child(3)').click();
await page.locator('tr').nth(1).locator('td').nth(2).click();

// ✅ Good
await page.getByRole('row', { name: /john doe/i }).getByRole('cell', { name: 'Edit' }).click();

// ✅ With test IDs
await page.getByTestId('user-table').getByRole('row', { name: /john doe/i }).getByTestId('edit-button').click();
```

### Example 5: Modals/Dialogs

```typescript
// ❌ Bad
await page.locator('.modal.show .modal-footer button:last-child').click();
await page.locator('[class*="Modal"] button').last().click();

// ✅ Good
const dialog = page.getByRole('dialog');
await dialog.getByRole('button', { name: 'Confirm' }).click();

// ✅ With test IDs
await page.getByTestId('confirmation-modal').getByRole('button', { name: 'Confirm' }).click();
```

---

## Chaining and Filtering

### Scoping Locators

```typescript
// Scope to a specific container
const sidebar = page.getByTestId('sidebar');
await sidebar.getByRole('link', { name: 'Settings' }).click();

// Nested scoping
const modal = page.getByRole('dialog');
const form = modal.getByRole('form');
await form.getByLabel('Name').fill('John Doe');
await form.getByRole('button', { name: 'Save' }).click();
```

### Filtering

```typescript
// Filter by text
await page.getByRole('listitem').filter({ hasText: 'Active' }).click();
await page.getByRole('button').filter({ hasText: /submit/i }).click();

// Filter by another locator
await page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Delete' }) }).click();

// Filter by test ID
await page.getByRole('article').filter({ hasTestId: 'featured-post' }).click();

// Negative filter
await page.getByRole('button').filter({ hasNotText: 'Disabled' }).first().click();
```

### Multiple Matches

```typescript
// First, last, nth
await page.getByRole('button').first().click();
await page.getByRole('button').last().click();
await page.getByRole('button').nth(2).click(); // 0-indexed

// Count
const count = await page.getByRole('button').count();

// Loop through all
for (const button of await page.getByRole('button').all()) {
  await button.click();
}
```

---

## Advanced Techniques

### Layout-Based Locators

```typescript
// Elements near another element
await page.getByRole('button', { name: 'Submit' }).locator('..').getByText('Required').isVisible();

// Using locator relations (Playwright 1.30+)
await page.getByLabel('Email').locator('..').getByText('Invalid email').isVisible();
```

### Frame Locators

```typescript
// For iframes
const frame = page.frameLocator('iframe[name="payment"]');
await frame.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
```

### Shadow DOM

```typescript
// Playwright handles shadow DOM automatically
await page.locator('custom-element').getByRole('button').click();

// Or explicitly
await page.locator('custom-element >>> button').click();
```

### Dynamic Content

```typescript
// Wait for element to be stable
await page.getByRole('button', { name: 'Submit' }).waitFor({ state: 'visible' });

// Handle dynamic IDs
await page.getByTestId(/user-\d+/).click();

// Handle lists that change
await page.getByRole('listitem').filter({ hasText: 'Active' }).first().click();
```

---

## Testing Selectors

### Playwright Inspector

```bash
# Launch with inspector
npx playwright test --debug

# Or use pause in code
await page.pause();
```

### Codegen

```bash
# Generate selectors automatically
npx playwright codegen https://example.com
```

### VS Code Extension

Use the Playwright Test for VS Code extension to:
- Pick locators visually
- Test selectors in real-time
- See highlighted elements

### Manual Testing

```typescript
// Test selector before using
test('verify selector', async ({ page }) => {
  await page.goto('https://example.com');

  // Check if selector exists
  const button = page.getByRole('button', { name: 'Submit' });
  await expect(button).toBeVisible();

  // Check count
  const buttons = page.getByRole('button');
  console.log(`Found ${await buttons.count()} buttons`);

  // Check all matches
  for (const btn of await buttons.all()) {
    console.log(await btn.textContent());
  }
});
```

---

## Selector Maintenance

### Guidelines

1. **Use Page Objects**: Centralize selectors in page object files
2. **Constants**: Store selectors as constants for reusability
3. **Documentation**: Document why specific selectors were chosen
4. **Regular Review**: Audit selectors during refactoring
5. **Consistency**: Use the same strategy across the team

### Page Object Example

```typescript
export class LoginPage {
  constructor(private page: Page) {}

  // Centralize all selectors
  readonly emailInput = this.page.getByLabel('Email');
  readonly passwordInput = this.page.getByLabel('Password');
  readonly submitButton = this.page.getByRole('button', { name: 'Sign in' });
  readonly errorMessage = this.page.getByTestId('error-message');

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }
}
```

---

## Quick Reference

| Locator Type | When to Use | Example |
|--------------|-------------|---------|
| `getByRole` | Interactive elements, semantic HTML | `getByRole('button', { name: 'Submit' })` |
| `getByTestId` | Unique elements, containers | `getByTestId('user-profile')` |
| `getByLabel` | Form inputs | `getByLabel('Email')` |
| `getByPlaceholder` | Inputs with placeholders | `getByPlaceholder('Search...')` |
| `getByText` | Static text content | `getByText('Welcome')` |
| `getByAltText` | Images | `getByAltText('Logo')` |
| `locator` | CSS/XPath as fallback | `locator('[name="email"]')` |

---

## Common Pitfalls

1. **Using auto-generated classes**: These change with every build
2. **Relying on position**: `nth-child` breaks when order changes
3. **Overly specific selectors**: More fragile and harder to maintain
4. **Not using test IDs**: When semantic locators aren't enough
5. **Ignoring accessibility**: Role-based locators improve both tests and UX
6. **Testing implementation**: Focus on user behavior, not internal structure

---

## Summary

- **Prefer semantic locators**: They're resilient and accessibility-friendly
- **Use test IDs for stability**: When role-based locators aren't suitable
- **Avoid brittle selectors**: Position, auto-generated classes, deep nesting
- **Scope your selectors**: Use chaining and filtering for precision
- **Keep selectors maintainable**: Centralize in page objects
- **Test your selectors**: Use inspector and codegen tools
