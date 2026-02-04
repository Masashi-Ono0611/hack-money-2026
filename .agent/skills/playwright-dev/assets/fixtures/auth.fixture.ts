import { test as base, Page } from "@playwright/test";

/**
 * Custom fixture for authenticated tests
 * Automatically logs in before each test
 */

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  /**
   * Regular authenticated user fixture
   */
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login as regular user
    if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
      throw new Error(
        "TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required",
      );
    }

    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.TEST_USER_EMAIL);
    await page.getByLabel("Password").fill(process.env.TEST_USER_PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();

    // Wait for login to complete
    await page.waitForURL("/dashboard");

    // Use the authenticated page
    await use(page);

    // Teardown: Logout (optional)
    // await page.getByRole('button', { name: 'Logout' }).click();
  },

  /**
   * Admin user fixture
   */
  adminPage: async ({ page }, use) => {
    // Setup: Login as admin
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required",
      );
    }

    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL);
    await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();

    // Wait for admin dashboard
    await page.waitForURL("/admin");

    // Use the admin page
    await use(page);

    // Teardown
    // await page.getByRole('button', { name: 'Logout' }).click();
  },
});

export { expect } from "@playwright/test";
