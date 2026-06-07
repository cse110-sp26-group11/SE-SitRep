/**
 * SMOKE TESTS — Basic health checks for the application
 *
 * These tests verify that:
 *  • The frontend loads without errors
 *  • Core UI elements are present
 *  • Navigation works
 *  • Backend API is reachable
 *
 * Run these frequently to catch regressions early.
 *
 * USAGE:
 *   npm run test:smoke
 */

import {
  test,
  expect,
  apiCall,
  DEFAULT_TEAM_ID,
  expectBackendReady,
  gotoApp,
  navigateToView,
  waitForFeedLoaded,
  waitForMeetingGrid,
} from './fixtures.js';

test.describe('Smoke Tests', () => {
  test.beforeAll(async () => {
    await expectBackendReady();
  });

  test('homepage boots into the seeded team feed', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await waitForFeedLoaded(page);
    const selectedDate = await page.locator('#team-feed-meta time').getAttribute('datetime');
    const standupPayload = await apiCall('GET', `/api/standups?teamId=${DEFAULT_TEAM_ID}&date=${selectedDate}`);

    await expect(page).toHaveTitle(/tatOS/i);
    await expect(page.locator('[data-view-panel="team-feed"]')).toHaveClass(/app-view--active/);
    await expect(page.locator('#feed-list article')).toHaveCount(standupPayload.standups.length);
    await expect(page.locator('#team-feed-meta time')).toHaveAttribute('datetime', selectedDate || '');
  });

  test('top-level application chrome renders', async ({ page }) => {
    await gotoApp(page);
    await waitForFeedLoaded(page);

    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('#theme-toggle')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: /User menu for/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'More options' })).toBeVisible();
    await expect(page.locator('.skip-link')).toHaveCount(1);
    await expect(page.locator('#main-content')).toHaveCount(1);
  });

  test('sidebar navigation reaches every main view', async ({ page }) => {
    await gotoApp(page);
    await waitForFeedLoaded(page);

    await navigateToView(page, 'my-standup');
    await expect(page.getByRole('heading', { name: 'My standup' })).toBeVisible();

    await navigateToView(page, 'when-to-meet');
    await expect(page.getByRole('heading', { name: 'When to meet' })).toBeVisible();

    await navigateToView(page, 'ai-summary');
    await expect(page.getByRole('heading', { name: 'AI summary' })).toBeVisible();

    await navigateToView(page, 'sprint-health');
    await expect(page.getByRole('heading', { name: 'Sprint health' })).toBeVisible();

    await navigateToView(page, 'team-feed');
    await expect(page.getByRole('heading', { name: 'Team feed' })).toBeVisible();
  });

  test('when-to-meet loads an interactive seeded schedule', async ({ page }) => {
    await gotoApp(page);
    await waitForFeedLoaded(page);
    await navigateToView(page, 'when-to-meet');
    await waitForMeetingGrid(page);

    await expect(page.locator('#meeting-grid .meeting-cell')).toHaveCount(85);
    await expect(page.locator('#meeting-overlap-list .meeting-overlap-item').first()).toBeVisible();
    await expect(page.locator('#meeting-roster .meeting-roster-item')).toHaveCount(5);
  });
});