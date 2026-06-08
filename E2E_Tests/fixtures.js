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

import { test as base, expect } from '@playwright/test';

export const FIXED_APP_DATE = '2026-05-10T12:00:00Z';
export const FIXED_STANDUP_DATE = '2026-05-10';
export const FIXED_WEEK_START = '2026-05-04';
export const DEFAULT_TEAM_ID = 'team-demo';

export const AUTH_USERS = {
  maya: {
    id: 'user-maya',
    displayName: 'Maya Rodriguez',
    name: 'Maya Rodriguez',
    username: 'maya-rodriguez',
    githubUsername: 'maya-rodriguez',
    initials: 'MR',
  },
  arav: {
    id: 'user-arav',
    displayName: 'Arav Kumar',
    name: 'Arav Kumar',
    username: 'arav-kumar',
    githubUsername: 'arav-kumar',
    initials: 'AK',
  },
  jamie: {
    id: 'user-jamie',
    displayName: 'Jamie Lee',
    name: 'Jamie Lee',
    username: 'jamie-lee',
    githubUsername: 'jamie-lee',
    initials: 'JL',
  },
  ray: {
    id: 'user-ray',
    displayName: 'Ray Yang',
    name: 'Ray Yang',
    username: 'ray-yang',
    githubUsername: 'ray-yang',
    initials: 'RY',
  },
  sam: {
    id: 'user-sam',
    displayName: 'Sam He',
    name: 'Sam He',
    username: 'sam-he',
    githubUsername: 'sam-he',
    initials: 'SH',
  },
};

export const DEFAULT_AUTH_USER = AUTH_USERS.maya;

export function createSessionToken(userId = DEFAULT_AUTH_USER.id) {
  return Buffer.from(JSON.stringify({ userId })).toString('base64');
}

export async function authenticatePage(page, user = DEFAULT_AUTH_USER) {
  const token = createSessionToken(user.id);

  await page.addInitScript(({ authUser, sessionToken, teamId }) => {
    localStorage.setItem('github_token', sessionToken);
    localStorage.setItem('github_user', JSON.stringify(authUser));
    localStorage.setItem('tatosCurrentTeamId', teamId);
  }, {
    authUser: user,
    sessionToken: token,
    teamId: DEFAULT_TEAM_ID,
  });
}

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
    availability: 'available',
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
 * Freezes the browser clock so the app uses seeded standup and availability dates.
 * @param {import('@playwright/test').Page} page
 * @param {string} isoDate
 * @returns {Promise<void>}
 */
export async function freezeAppClock(page, isoDate = FIXED_APP_DATE) {
  await page.addInitScript((fixedIsoDate) => {
    const RealDate = Date;
    const fixedTime = new RealDate(fixedIsoDate).getTime();

    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedTime);
        } else {
          super(...args);
        }
      }

      static now() {
        return fixedTime;
      }
    }

    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;

    // @ts-ignore
    window.Date = MockDate;
  }, isoDate);
}

/**
 * Visits the app with a deterministic clock.
 * @param {import('@playwright/test').Page} page
 * @param {string} [path]
 * @returns {Promise<void>}
 */
export async function gotoApp(page, path = '/') {
  await freezeAppClock(page);
  await page.goto(path);
  await expectPageLoaded(page);
}

/**
 * Waits for the feed request/render cycle to finish.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
export async function waitForFeedLoaded(page) {
  const feedList = page.locator('#feed-list');
  await expect(feedList).toBeVisible();
  await expect(feedList).not.toContainText('Loading standup entries…');
}

/**
 * Waits for the meeting planner grid to render interactive cells.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
export async function waitForMeetingGrid(page) {
  await expect(page.locator('#meeting-grid .meeting-cell').first()).toBeVisible();
}

/**
 * Navigates using current sidebar view ids.
 * @param {import('@playwright/test').Page} page
 * @param {string} viewName
 * @returns {Promise<void>}
 */
export async function navigateToView(page, viewName) {
  const sidebarLink = page.locator(`.sidebar_link[data-view="${viewName}"]`);
  if (await sidebarLink.count()) {
    await sidebarLink.first().click();
  } else {
    const openViewButton = page.locator(`[data-open-view="${viewName}"]`);
    await openViewButton.first().click();
  }

  const panel = page.locator(`[data-view-panel="${viewName}"]`);
  await expect(panel).toHaveClass(/app-view--active/);
  await expect(panel).toBeVisible();
}

/**
 * Selects a seeded demo user in the standup form.
 * @param {import('@playwright/test').Page} page
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function selectCurrentUser(page, userId) {
  const select = page.locator('#current-user-select');
  await select.selectOption(userId);
}

function hashText(value) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function formatUtcDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Creates a unique standup date per test without colliding across projects.
 * @param {import('@playwright/test').TestInfo} testInfo
 * @returns {string}
 */
export function uniqueDateFor(testInfo) {
  const base = new Date(Date.UTC(2026, 5, 1));
  const offsetDays = hashText(`${testInfo.project.name}:${testInfo.title}`) % 40;
  base.setUTCDate(base.getUTCDate() + offsetDays + testInfo.retry);
  return formatUtcDate(base);
}

/**
 * Creates a unique Monday week-start per test for availability mutations.
 * @param {import('@playwright/test').TestInfo} testInfo
 * @returns {string}
 */
export function uniqueWeekStartFor(testInfo) {
  const base = new Date(Date.UTC(2026, 5, 1));
  const offsetWeeks = (hashText(`${testInfo.project.name}:${testInfo.title}:week`) % 12) + testInfo.retry;
  base.setUTCDate(base.getUTCDate() + (offsetWeeks * 7));

  const day = base.getUTCDay();
  const distanceToMonday = day === 0 ? -6 : 1 - day;
  base.setUTCDate(base.getUTCDate() + distanceToMonday);
  return formatUtcDate(base);
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
export async function apiCall(method, endpoint, body = null, baseUrl = 'http://localhost:8787', requestOptions = {}) {
  const url = `${baseUrl}${endpoint}`;
  const authUserId = requestOptions.userId || body?.userId || DEFAULT_AUTH_USER.id;
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${createSessionToken(authUserId)}`,
    },
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

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
  page: async ({ page }, use) => {
    await authenticatePage(page);
    await use(page);
  },
});

export { expect };
