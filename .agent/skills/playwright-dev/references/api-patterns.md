# Playwright API Patterns

Common patterns and best practices for Playwright API usage.

## Table of Contents

- [Locator Strategies](#locator-strategies)
- [Actions](#actions)
- [Assertions](#assertions)
- [Page Object Model](#page-object-model)
- [Fixtures](#fixtures)
- [API Testing](#api-testing)
- [Mocking](#mocking)
- [Authentication](#authentication)
- [File Upload/Download](#file-uploaddownload)
- [Network Interception](#network-interception)

## Locator Strategies

### Priority Order (Best Practices)

1. **User-facing attributes** (role, text, label)
2. **Test IDs** (data-testid)
3. **CSS selectors** (as last resort)

```typescript
// ✅ GOOD: User-facing selectors
await page.getByRole("button", { name: "Submit" }).click();
await page.getByLabel("Email").fill("test@example.com");
await page.getByText("Welcome back").waitFor();
await page.getByPlaceholder("Enter password").fill("secret");

// ✅ GOOD: Test IDs
await page.getByTestId("submit-button").click();

// ⚠️  ACCEPTABLE: CSS selectors (when necessary)
await page.locator('.login-form button[type="submit"]').click();

// ❌ BAD: Fragile selectors
await page.locator("body > div:nth-child(3) > button").click();
```

### Locator Methods

```typescript
// By role (ARIA role)
page.getByRole("button");
page.getByRole("link");
page.getByRole("textbox");
page.getByRole("checkbox");

// By text
page.getByText("Exact text");
page.getByText(/regex pattern/i);

// By label
page.getByLabel("Email address");

// By placeholder
page.getByPlaceholder("username");

// By alt text (images)
page.getByAltText("Company logo");

// By title
page.getByTitle("Close dialog");

// By test ID
page.getByTestId("login-button");

// CSS/XPath selectors
page.locator(".class-name");
page.locator("xpath=//button");

// Filtering
page.getByRole("button").filter({ hasText: "Submit" });
page.locator(".item").filter({ has: page.getByRole("button") });
```

### Locator Chaining

```typescript
// Navigate through DOM hierarchy
const form = page.locator("form.login");
await form.getByLabel("Email").fill("test@example.com");
await form.getByLabel("Password").fill("secret");
await form.getByRole("button", { name: "Login" }).click();

// Filter and refine
await page.getByRole("listitem").filter({ hasText: "Active" }).first().click();

// Multiple filters
await page
  .locator(".product")
  .filter({ hasText: "iPhone" })
  .filter({ has: page.getByRole("button", { name: "Buy" }) })
  .click();
```

## Actions

### Click Actions

```typescript
// Simple click
await page.getByRole("button").click();

// Click with options
await page.getByRole("button").click({
  button: "right", // Right click
  clickCount: 2, // Double click
  delay: 100, // Delay between mousedown and mouseup
  force: true, // Skip actionability checks
  modifiers: ["Control"], // Hold modifier keys
  position: { x: 10, y: 20 }, // Click at specific position
  timeout: 5000, // Custom timeout
});

// Double click
await page.getByRole("button").dblclick();

// Hover
await page.getByRole("button").hover();
```

### Input Actions

```typescript
// Fill input (clears first)
await page.getByLabel("Email").fill("test@example.com");

// Type (character by character)
await page.getByLabel("Search").type("query", { delay: 100 });

// Press keys
await page.keyboard.press("Enter");
await page.keyboard.press("Control+A");
await page.keyboard.press("Meta+C"); // Cmd+C on Mac

// Upload files
await page.getByLabel("Upload").setInputFiles("path/to/file.pdf");
await page.getByLabel("Upload").setInputFiles(["file1.pdf", "file2.pdf"]);

// Clear file input
await page.getByLabel("Upload").setInputFiles([]);

// Select options
await page.getByLabel("Country").selectOption("US");
await page.getByLabel("Country").selectOption({ label: "United States" });
await page.getByLabel("Colors").selectOption(["red", "green", "blue"]); // Multi-select
```

### Checkbox and Radio

```typescript
// Check/uncheck
await page.getByRole("checkbox", { name: "I agree" }).check();
await page.getByRole("checkbox", { name: "Newsletter" }).uncheck();

// Set checked state
await page.getByRole("checkbox").setChecked(true);

// Select radio button
await page.getByRole("radio", { name: "Option 1" }).check();
```

## Assertions

### Element State

```typescript
// Visibility
await expect(page.getByText("Welcome")).toBeVisible();
await expect(page.getByText("Loading")).toBeHidden();

// Enabled/Disabled
await expect(page.getByRole("button")).toBeEnabled();
await expect(page.getByRole("button")).toBeDisabled();

// Checked
await expect(page.getByRole("checkbox")).toBeChecked();
await expect(page.getByRole("checkbox")).not.toBeChecked();

// Focused
await expect(page.getByLabel("Email")).toBeFocused();

// Editable
await expect(page.getByRole("textbox")).toBeEditable();
await expect(page.getByRole("textbox")).toBeReadOnly();
```

### Content Assertions

```typescript
// Text content
await expect(page.getByRole("heading")).toHaveText("Welcome");
await expect(page.getByRole("heading")).toContainText("Wel");
await expect(page.locator("li")).toHaveText(["Item 1", "Item 2", "Item 3"]);

// Value
await expect(page.getByLabel("Email")).toHaveValue("test@example.com");
await expect(page.getByLabel("Email")).toHaveValue(/test@/);

// Attribute
await expect(page.locator("button")).toHaveAttribute("type", "submit");
await expect(page.locator("a")).toHaveAttribute("href", /example\.com/);

// CSS Class
await expect(page.locator("button")).toHaveClass("btn-primary");
await expect(page.locator("button")).toHaveClass(/btn-/);

// CSS Property
await expect(page.locator("button")).toHaveCSS("color", "rgb(255, 0, 0)");
```

### Count Assertions

```typescript
// Element count
await expect(page.getByRole("listitem")).toHaveCount(5);
await expect(page.locator(".product")).toHaveCount(10, { timeout: 10000 });
```

### Page Assertions

```typescript
// URL
await expect(page).toHaveURL("https://example.com/dashboard");
await expect(page).toHaveURL(/dashboard/);

// Title
await expect(page).toHaveTitle("Dashboard");
await expect(page).toHaveTitle(/Dashboard/);

// Screenshot comparison
await expect(page).toHaveScreenshot("homepage.png");
await expect(page.locator(".card")).toHaveScreenshot("card.png");
```

## Page Object Model

### Basic Page Object

```typescript
// pages/LoginPage.ts
import { Page, Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Login" });
    this.errorMessage = page.locator(".error-message");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toHaveText(message);
  }
}
```

### Using Page Objects

```typescript
// tests/login.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test("should login successfully", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("user@example.com", "password123");
  await expect(page).toHaveURL("/dashboard");
});
```

## Fixtures

### Custom Fixtures

```typescript
// fixtures/auth.ts
import { test as base, Page } from "@playwright/test";

type AuthFixture = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login
    await page.goto("/login");
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Login" }).click();
    await page.waitForURL("/dashboard");

    // Use the authenticated page
    await use(page);

    // Teardown: Logout
    await page.getByRole("button", { name: "Logout" }).click();
  },
});

export { expect } from "@playwright/test";
```

### Using Custom Fixtures

```typescript
import { test, expect } from "./fixtures/auth";

test("dashboard test with auth", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/dashboard");
  await expect(authenticatedPage.getByText("Welcome back")).toBeVisible();
});
```

## API Testing

### Making API Requests

```typescript
test("should fetch user data", async ({ request }) => {
  const response = await request.get("/api/users/123");
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data).toHaveProperty("id", 123);
  expect(data).toHaveProperty("email");
});

test("should create user", async ({ request }) => {
  const response = await request.post("/api/users", {
    data: {
      name: "Test User",
      email: "test@example.com",
    },
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token123",
    },
  });

  expect(response.status()).toBe(201);
  const user = await response.json();
  expect(user).toHaveProperty("id");
});
```

### Combining API and UI

```typescript
test("should display user created via API", async ({ page, request }) => {
  // Create user via API
  const response = await request.post("/api/users", {
    data: { name: "Test User", email: "test@example.com" },
  });
  const user = await response.json();

  // Verify in UI
  await page.goto("/users");
  await expect(page.getByText(user.name)).toBeVisible();
});
```

## Mocking

### Mock API Responses

```typescript
test("should handle API error", async ({ page }) => {
  // Mock API to return error
  await page.route("/api/users", (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });

  await page.goto("/users");
  await expect(page.getByText("Failed to load users")).toBeVisible();
});

test("should mock successful response", async ({ page }) => {
  await page.route("/api/users", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, name: "User 1" },
        { id: 2, name: "User 2" },
      ]),
    });
  });

  await page.goto("/users");
  await expect(page.getByText("User 1")).toBeVisible();
  await expect(page.getByText("User 2")).toBeVisible();
});
```

### Modify Requests

```typescript
test("should add auth header", async ({ page }) => {
  await page.route("/api/**", (route) => {
    route.continue({
      headers: {
        ...route.request().headers(),
        Authorization: "Bearer test-token",
      },
    });
  });

  await page.goto("/dashboard");
});
```

## Authentication

### Storage State (Reusable Auth)

```typescript
// global-setup.ts
import { chromium } from "@playwright/test";

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL("/dashboard");

  // Save storage state
  await page.context().storageState({ path: "auth.json" });
  await browser.close();
}

export default globalSetup;
```

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  use: {
    storageState: "auth.json",
  },
});
```

## File Upload/Download

### Upload Files

```typescript
test("should upload file", async ({ page }) => {
  await page.goto("/upload");
  await page.getByLabel("Upload").setInputFiles("path/to/file.pdf");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Upload successful")).toBeVisible();
});
```

### Download Files

```typescript
test("should download file", async ({ page }) => {
  await page.goto("/downloads");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Report" }).click();
  const download = await downloadPromise;

  // Verify filename
  expect(download.suggestedFilename()).toBe("report.pdf");

  // Save file
  await download.saveAs("path/to/save/report.pdf");
});
```

## Network Interception

### Wait for Network

```typescript
test("should wait for API call", async ({ page }) => {
  const responsePromise = page.waitForResponse("/api/users");
  await page.goto("/users");
  const response = await responsePromise;

  expect(response.status()).toBe(200);
});

test("should wait for specific request", async ({ page }) => {
  const requestPromise = page.waitForRequest((request) => request.url().includes("/api/users") && request.method() === "POST");

  await page.goto("/users");
  await page.getByRole("button", { name: "Add User" }).click();
  const request = await requestPromise;

  const postData = request.postDataJSON();
  expect(postData).toHaveProperty("name");
});
```

### Abort Requests

```typescript
test("should block images", async ({ page }) => {
  await page.route("**/*.{png,jpg,jpeg}", (route) => route.abort());
  await page.goto("/");
});

test("should block analytics", async ({ page }) => {
  await page.route(/google-analytics|mixpanel/, (route) => route.abort());
  await page.goto("/");
});
```
