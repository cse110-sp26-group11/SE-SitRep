import {
  test,
  expect,
  DEFAULT_TEAM_ID,
  apiCall,
  expectBackendReady,
  freezeAppClock,
  gotoApp,
  navigateToView,
  selectCurrentUser,
  uniqueWeekStartFor,
  waitForFeedLoaded,
  waitForMeetingGrid,
} from './fixtures.js';

test.describe('When To Meet UI', () => {
  test.beforeAll(async () => {
    await expectBackendReady();
  });

  test('seeded weekly availability renders grid, overlap, and roster data', async ({ page }) => {
    await gotoApp(page);
    await waitForFeedLoaded(page);
    await navigateToView(page, 'when-to-meet');
    await waitForMeetingGrid(page);

    await expect(page.locator('#meeting-grid .meeting-cell')).toHaveCount(85);
    await expect(page.locator('#meeting-overlap-list .meeting-overlap-item')).toHaveCount(5);
    await expect(page.locator('#meeting-roster .meeting-roster-item')).toHaveCount(5);
    await expect(page.locator('#meeting-status')).toContainText('week of');
  });

  test('meeting cells expose an accessibility summary for availability context', async ({ page }) => {
    await gotoApp(page);
    await waitForFeedLoaded(page);
    await navigateToView(page, 'when-to-meet');
    await waitForMeetingGrid(page);

    const cell = page.locator('#meeting-grid .meeting-cell').nth(4);
    await expect(cell).toHaveAttribute('aria-label', /Your status:/);
    await expect(cell).toHaveAttribute('aria-label', /Team score:/);
    await expect(cell).toHaveAttribute('aria-label', /teammates available/);
  });

  test('availability changes persist after a reload for a unique test week', async ({ page }, testInfo) => {
    const weekStart = uniqueWeekStartFor(testInfo);

    await freezeAppClock(page, `${weekStart}T12:00:00Z`);
    await page.goto('/');
    await waitForFeedLoaded(page);
    await navigateToView(page, 'when-to-meet');
    await waitForMeetingGrid(page);

    const busyCell = page.locator('#meeting-grid .meeting-cell[data-self-status="busy"]').first();
    await expect(busyCell).toBeVisible();

    const dayIndex = await busyCell.getAttribute('data-day-index');
    const slotIndex = await busyCell.getAttribute('data-slot-index');
    const targetCell = page.locator(
      `#meeting-grid .meeting-cell[data-day-index="${dayIndex}"][data-slot-index="${slotIndex}"]`
    );

    await targetCell.click();
    await expect(targetCell).toHaveAttribute('data-self-status', 'available');
    await expect(page.locator('#meeting-status')).toContainText('Availability synced for the week of');

    await page.reload();
    await waitForFeedLoaded(page);
    await navigateToView(page, 'when-to-meet');
    await waitForMeetingGrid(page);
    await expect(page.locator(
      `#meeting-grid .meeting-cell[data-day-index="${dayIndex}"][data-slot-index="${slotIndex}"]`
    )).toHaveAttribute('data-self-status', 'available');
  });

  test('saved availability cells cycle through available, busy, and maybe', async ({ page }, testInfo) => {
    const weekStart = uniqueWeekStartFor(testInfo);
    const savedSlot = { dayIndex: 0, slotIndex: 1, slotLabel: '7 AM', status: 'available' };

    await apiCall('PUT', '/api/availability/me', {
      teamId: DEFAULT_TEAM_ID,
      userId: 'user-arav',
      weekStart,
      slots: [savedSlot],
    });

    await freezeAppClock(page, `${weekStart}T12:00:00Z`);
    await page.goto('/');
    await waitForFeedLoaded(page);
    await navigateToView(page, 'when-to-meet');
    await waitForMeetingGrid(page);

    const targetCell = page.locator(
      `#meeting-grid .meeting-cell[data-day-index="${savedSlot.dayIndex}"][data-slot-index="${savedSlot.slotIndex}"]`
    );
    await expect(targetCell).toBeVisible();

    const statusCycle = {
      available: 'busy',
      busy: 'maybe',
      maybe: 'available',
    };

    const initialStatus = await targetCell.getAttribute('data-self-status');
    await targetCell.click();
    await expect(targetCell).toHaveAttribute('data-self-status', statusCycle[initialStatus]);

    await targetCell.click();
    await expect(targetCell).toHaveAttribute(
      'data-self-status',
      statusCycle[statusCycle[initialStatus]]
    );
  });

  test('switching the selected teammate updates the roster owner context', async ({ page }) => {
    await gotoApp(page);
    await waitForFeedLoaded(page);
    await navigateToView(page, 'my-standup');
    await selectCurrentUser(page, 'user-ray');
    await navigateToView(page, 'when-to-meet');
    await waitForMeetingGrid(page);

    await expect(page.locator('#meeting-user-select')).toHaveValue('user-ray');
    await expect(page.locator('#meeting-roster')).toContainText('Ray Yang (You)');
  });
});
