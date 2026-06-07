/**
 * UI TESTS — Standups Feature
 *
 * These tests verify the standups functionality:
 *  • Standup form is visible and accessible
 *  • Form validation works
 *  • Standups are submitted correctly
 *  • Standup history is displayed
 *
 * USAGE:
 *   npm run test:standups
 */

import {
  test,
  expect,
  apiCall,
  expectBackendReady,
  freezeAppClock,
  gotoApp,
  navigateToView,
  selectCurrentUser,
  uniqueDateFor,
  waitForFeedLoaded,
} from './fixtures.js';

test.describe('Standups UI', () => {
  test.beforeAll(async () => {
    await expectBackendReady();
  });

  test('seeded standups load into the form for the selected teammate', async ({ page }) => {
    const standupPayload = await apiCall('GET', '/api/standups?date=2026-05-10');
    const jamie = standupPayload.standups.find(standup => standup.userId === 'user-jamie');

    await gotoApp(page);
    await waitForFeedLoaded(page);
    await navigateToView(page, 'my-standup');
    await selectCurrentUser(page, 'user-jamie');

    await expect(page.locator('textarea[name="yesterday"]')).toHaveValue(jamie.yesterday || '');
    await expect(page.locator('textarea[name="today"]')).toHaveValue(jamie.today);
    await expect(page.locator('textarea[name="blocker"]')).toHaveValue(jamie.blocker || '');
  });

  test('preview reflects in-progress standup edits immediately', async ({ page }) => {
    await gotoApp(page);
    await waitForFeedLoaded(page);
    await navigateToView(page, 'my-standup');

    await page.locator('textarea[name="yesterday"]').fill('Finished the more realistic Playwright coverage.');
    await page.locator('textarea[name="today"]').fill('Polishing UI assertions against real seeded data.');
    await page.locator('textarea[name="blocker"]').fill('Waiting on deterministic local database setup.');
    await page.locator('input[name="includeGithub"]').uncheck();

    await expect(page.locator('#standup-preview')).toContainText('Finished the more realistic Playwright coverage.');
    await expect(page.locator('#standup-preview')).toContainText('Polishing UI assertions against real seeded data.');
    await expect(page.locator('#standup-preview')).toContainText('Waiting on deterministic local database setup.');
    await expect(page.locator('#standup-preview')).toContainText('GitHub activity is not attached.');
  });

  test('validation blocks empty today updates', async ({ page }) => {
    await gotoApp(page);
    await waitForFeedLoaded(page);
    await navigateToView(page, 'my-standup');

    await page.locator('textarea[name="today"]').fill('');
    await page.getByRole('button', { name: 'Save standup' }).click();

    await expect(page.locator('#standup-status')).toHaveText('Add what you are doing today before saving your standup.');
  });

  test('a new standup can be created and then updated from the UI', async ({ page }, testInfo) => {
    const standupDate = uniqueDateFor(testInfo);

    await freezeAppClock(page, `${standupDate}T12:00:00Z`);
    await page.goto('/');
    await waitForFeedLoaded(page);
    await navigateToView(page, 'my-standup');

    await page.locator('textarea[name="yesterday"]').fill('Verified deterministic seeding for the Playwright suite.');
    await page.locator('textarea[name="today"]').fill('Creating a brand new standup through the UI.');
    await page.locator('textarea[name="blocker"]').fill('');
    await page.getByRole('button', { name: 'Save standup' }).click();

    await expect(page.locator('#standup-status')).toHaveText('Standup saved to the backend and added to the team feed.');

    await page.locator('textarea[name="today"]').fill('Updating the same standup entry after the first save.');
    await page.locator('textarea[name="blocker"]').fill('Need one final pass on the assertions.');
    await page.getByRole('button', { name: 'Save standup' }).click();

    await expect(page.locator('#standup-status')).toHaveText('Standup saved. Blocker is now visible in the team feed.');

    await navigateToView(page, 'team-feed');
    await expect(page.locator('#team-feed-meta time')).toHaveAttribute('datetime', standupDate);
    await expect(page.locator('#feed-list')).toContainText('Updating the same standup entry after the first save.');
    await expect(page.locator('#feed-list')).toContainText('BLOCKER');
  });
});