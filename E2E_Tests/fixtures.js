/**
 * E2E Test Fixtures and Utilities
 *
 * This file provides:
 *   - Test data generators (realistic sample data)
 *   - Helper functions (common operations, assertions)
 *   - API utilities (HTTP requests to backend)
 *
 * Other test files import from here to keep tests DRY and readable.
 *
 * USAGE EXAMPLE in a test file:
 *   import { test, expect } from '@playwright/test';
 *   import { createMockStandup, expectStatusOk } from './fixtures.js';
 *
 *   test('submit standup', async ({ page }) => {
 *     const standup = createMockStandup();
 *     await page.goto('/standups');
 *     // ... interact with page
 *   });
 */

import { test as base } from '@playwright/test';

/* ────────────────────────────────────────────────────────────
   TEST DATA GENERATORS
   These create realistic sample data for testing.
   ──────────────────────────────────────────────────────────── */

/**
 * Generates a mock standup object.
 * Useful for submitting standup forms or API calls.
 *
 * @param {Object} overrides - Optional fields to override defaults
 * @returns {Object} Mock standup data
 *
 * EXAMPLE:
 *   const standup = createMockStandup({ yesterday: 'Fixed login bug' });
 */
export function createMockStandup(overrides = {}) {
  const today = new Date().toISOString().split('T')[0];
  return {
    standupDate: today,
    yesterday: 'Worked on database schema',
    today: 'Implementing authentication',
    blocker: null,
    availability: 'full-time',
    includeGithub: true,
    notifyLead: false,
    ...overrides,
  };
}

/**
 * Generates a mock availability slot.
 * @param {Object} overrides - Optional fields to override
 * @returns {Object} Mock availability data
 *
 * EXAMPLE:
 *   const slot = createMockAvailability({
 *     startTime: '09:00',
 *     endTime: '10:00'
 *   });
 */
export function createMockAvailability(overrides = {}) {
  const today = new Date().toISOString().split('T')[0];
  return {
    date: today,
    startTime: '09:00',
    endTime: '17:00',
    ...overrides,
  };
}

/**
 * Generates a mock team object.
 * @param {Object} overrides - Optional fields to override
 * @returns {Object} Mock team data
 */
export function createMockTeam(overrides = {}) {
  return {
    id: 'team-1',
    name: 'Engineering Team',
    repoOwner: 'myorg',
    repoName: 'myrepo',
    sprintName: 'Sprint 1',
    ...overrides,
  };
}

/**
 * Generates a mock team member.
 * @param {Object} overrides - Optional fields to override
 * @returns {Object} Mock member data
 */
export function createMockMember(overrides = {}) {
  const id = overrides.id || `user-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    displayName: 'Jane Developer',
    initials: 'JD',
    githubUsername: 'jdev',
    avatarColorKey: 'blue',
    role: 'developer',
    isLead: false,
    active: true,
    ...overrides,
  };
}

/* ────────────────────────────────────────────────────────────
   COMMON ASSERTIONS
   Reusable checks for test conditions.
   ──────────────────────────────────────────────────────────── */

/**
 * Verifies a page has basic structure (not blank or errored).
 * Good for smoke tests and initial page loads.
 *
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 *
 * EXAMPLE:
 *   await expectPageLoaded(page);
 */
export async function expectPageLoaded(page) {
  // Page should have a body with content
  const body = page.locator('body');
  await body.waitFor({ state: 'visible', timeout: 5000 });

  // Should have meaningful content (not blank)
  const content = await body.textContent();
  if (!content || content.trim().length === 0) {
    throw new Error('Page loaded but has no content');
  }
}

/**
 * Verifies navigation menu is visible and functional.
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function expectNavigationVisible(page) {
  const sidebar = page.locator('#sidebar');
  const topbar = page.locator('.topbar');

  // At least one should be visible
  const sidebarVisible = await sidebar.isVisible().catch(() => false);
  const topbarVisible = await topbar.isVisible().catch(() => false);

  if (!sidebarVisible && !topbarVisible) {
    throw new Error('No navigation elements found');
  }
}

/**
 * Waits for a specific API response status.
 * Useful for verifying backend calls.
 *
 * EXAMPLE:
 *   await expectApiStatus(page, '/api/standups', 200);
 */
export async function expectApiStatus(page, endpoint, expectedStatus) {
  // Listen for network responses
  let responseStatus = null;

  page.on('response', (response) => {
    if (response.url().includes(endpoint)) {
      responseStatus = response.status();
    }
  });

  // Give it a moment to capture the response
  await page.waitForTimeout(500);

  if (responseStatus && responseStatus !== expectedStatus) {
    throw new Error(
      `API ${endpoint} returned ${responseStatus}, expected ${expectedStatus}`
    );
  }
}

/* ────────────────────────────────────────────────────────────
   API HELPER FUNCTIONS
   Direct backend communication for test setup/teardown.
   ──────────────────────────────────────────────────────────── */

/**
 * Makes a direct API request to the backend.
 * Useful for setting up test data without UI.
 *
 * @param {string} method - HTTP method (GET, POST, PUT, etc.)
 * @param {string} endpoint - API endpoint path
 * @param {Object} body - Request body (for POST/PUT)
 * @param {string} baseUrl - Base URL (defaults to config baseURL)
 * @returns {Promise<Object>} Response data
 *
 * EXAMPLE:
 *   const team = await apiCall('GET', '/api/team?teamId=team-1');
 *   const standup = await apiCall('POST', '/api/standups', createMockStandup());
 */
export async function apiCall(method, endpoint, body = null, baseUrl = 'http://localhost:8787') {
  const url = `${baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API call failed: ${method} ${endpoint} returned ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    return null; // Some endpoints might return empty responses
  }
}

/**
 * Verifies the API health endpoint is working.
 * Run this in test setup to ensure backend is ready.
 *
 * @returns {Promise<void>}
 *
 * EXAMPLE:
 *   test.beforeAll(async () => {
 *     await expectBackendReady();
 *   });
 */
export async function expectBackendReady() {
  try {
    const response = await apiCall('GET', '/api/health');
    if (response?.status !== 'ok') {
      throw new Error('Backend health check failed');
    }
  } catch (error) {
    throw new Error(`Backend is not ready: ${error.message}`);
  }
}

/* ────────────────────────────────────────────────────────────
   UI INTERACTION HELPERS
   Common page actions and locators.
   ──────────────────────────────────────────────────────────── */

/**
 * Toggles the theme (light/dark mode).
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 *
 * EXAMPLE:
 *   await toggleTheme(page);
 *   await expect(page).toHaveAttribute('data-theme', 'dark');
 */
export async function toggleTheme(page) {
  const themeBtn = page.locator('#theme-toggle');
  if (await themeBtn.isVisible()) {
    await themeBtn.click();
    // Theme change is instant in localStorage
    await page.waitForTimeout(100);
  }
}

/**
 * Opens the sidebar navigation (mobile-friendly).
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function openSidebar(page) {
  const toggleBtn = page.locator('#sidebar-toggle');
  const sidebar = page.locator('#sidebar');

  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await sidebar.waitFor({ state: 'visible' });
  }
}

/**
 * Navigates to a specific view/tab in the app.
 * @param {Page} page - Playwright page object
 * @param {string} viewName - View identifier (e.g., 'standups', 'dashboard')
 * @returns {Promise<void>}
 *
 * EXAMPLE:
 *   await navigateToView(page, 'standups');
 */
export async function navigateToView(page, viewName) {
  const viewButton = page.locator(`[data-open-view="${viewName}"]`);
  if (await viewButton.isVisible()) {
    await viewButton.click();
    await page.waitForTimeout(300); // Wait for transition
  }
}

/* ────────────────────────────────────────────────────────────
   CUSTOM TEST FIXTURE (optional)
   Extend base Playwright test with pre-built fixtures.
   ──────────────────────────────────────────────────────────── */

/**
 * Extended test fixture with common setup.
 * Import and use this instead of @playwright/test for convenience.
 *
 * EXAMPLE:
 *   import { test, expect } from './fixtures.js';
 *
 *   test('do something', async ({ page, apiHelper }) => {
 *     const data = await apiHelper('GET', '/api/team');
 *   });
 */
export const test = base.extend({
  // Add custom fixtures here if needed
  // Example: apiHelper: () => (method, endpoint, body) => apiCall(method, endpoint, body),
});

export { expect } from '@playwright/test';
