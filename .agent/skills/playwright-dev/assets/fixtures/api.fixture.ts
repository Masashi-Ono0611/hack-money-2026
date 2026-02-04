import { APIRequestContext, test as base } from "@playwright/test";

/**
 * Custom fixture for API testing with authentication
 */

type APIFixtures = {
  authenticatedRequest: APIRequestContext;
  adminRequest: APIRequestContext;
};

export const test = base.extend<APIFixtures>({
  /**
   * Authenticated API request context
   */
  authenticatedRequest: async ({ playwright }, use) => {
    const requestContext = await playwright.request.newContext({
      baseURL: process.env.API_URL || "http://localhost:3000",
      extraHTTPHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Get auth token
    const loginResponse = await requestContext.post("/api/auth/login", {
      data: {
        email: process.env.TEST_USER_EMAIL || "user@example.com",
        password: process.env.TEST_USER_PASSWORD || "password",
      },
    });

    if (!loginResponse.ok()) {
      await requestContext.dispose();
      throw new Error(
        `Login failed: ${loginResponse.status()} ${loginResponse.statusText()}`,
      );
    }

    const { token } = await loginResponse.json();

    // Create new context with auth token
    const authenticatedContext = await playwright.request.newContext({
      baseURL: process.env.API_URL || "http://localhost:3000",
      extraHTTPHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    await use(authenticatedContext);

    // Cleanup
    await requestContext.dispose();
    await authenticatedContext.dispose();
  },

  /**
   * Admin API request context
   */
  adminRequest: async ({ playwright }, use) => {
    const requestContext = await playwright.request.newContext({
      baseURL: process.env.API_URL || "http://localhost:3000",
      extraHTTPHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Get admin token
    const loginResponse = await requestContext.post("/api/auth/login", {
      data: {
        email: process.env.ADMIN_EMAIL || "admin@example.com",
        password: process.env.ADMIN_PASSWORD || "admin123",
      },
    });

    if (!loginResponse.ok()) {
      await requestContext.dispose();
      throw new Error(
        `Admin login failed: ${loginResponse.status()} ${loginResponse.statusText()}`,
      );
    }

    const { token } = await loginResponse.json();

    // Create admin context
    const adminContext = await playwright.request.newContext({
      baseURL: process.env.API_URL || "http://localhost:3000",
      extraHTTPHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    await use(adminContext);

    // Cleanup
    await requestContext.dispose();
    await adminContext.dispose();
  },
});

export { expect } from "@playwright/test";
