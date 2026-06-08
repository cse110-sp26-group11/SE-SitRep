/**
 * UI TESTS — Dashboard Feature
 *
 * These tests verify the dashboard UI works correctly:
 *  • Page loads and displays data
 *  • Team info is visible
 *  • User can navigate between views
 *  • Data updates are reflected
 *
 * USAGE:
 *   npm run test:dashboard
 */

import {
  test,
  expect,
  AUTH_USERS,
  apiCall,
  authenticatePage,
  expectBackendReady,
  gotoApp,
  navigateToView,
  toggleTheme,
  waitForFeedLoaded
} from './fixtures.js'

test.describe('Dashboard and Navigation UI', () => {
  test.beforeAll(async () => {
    await expectBackendReady()
  })

  test.beforeEach(async ({ page }) => {
    await gotoApp(page)
    await waitForFeedLoaded(page)
  })

  test('team feed shows seeded standups and filter states', async ({ page }) => {
    const standupPayload = await apiCall('GET', '/api/standups')
    const currentFeedDate = await page.locator('#team-feed-meta time').getAttribute('datetime')
    const expectedCount = standupPayload.standups.filter(
      standup => standup.standupDate === currentFeedDate
    ).length
    const blockedEntries = standupPayload.standups.filter(
      standup => standup.standupDate === currentFeedDate && standup.blocker
    )
    const noYesterdayEntries = standupPayload.standups.filter(
      standup => standup.standupDate === currentFeedDate && !standup.yesterday
    )

    await expect(page.locator('#feed-list article:not([hidden])')).toHaveCount(expectedCount)
    await expect(page.locator('#feed-list')).toContainText('Maya Rodriguez')
    await expect(page.locator('#repo-pulse-grid .pulse-card')).toHaveCount(4)
    await expect(page.locator('#issue-list .issue-card').first()).toBeVisible()
    await expect(page.locator('#workflow-list .workflow-card').first()).toBeVisible()

    if (blockedEntries.length) {
      await page.getByRole('button', { name: 'Blocked' }).click()
      await expect(page.locator('#feed-list article:not([hidden])')).toHaveCount(blockedEntries.length)
      await expect(page.locator('#feed-list')).toContainText(blockedEntries[0].name)
    }

    if (noYesterdayEntries.length) {
      await page.getByRole('button', { name: 'No update' }).click()
      await expect(page.locator('#feed-list article:not([hidden])')).toHaveCount(noYesterdayEntries.length)
      await expect(page.locator('#feed-list')).toContainText(noYesterdayEntries[0].name)
    }

    await page.getByRole('button', { name: 'All' }).click()
    await expect(page.locator('#feed-list article:not([hidden])')).toHaveCount(expectedCount)
  })

  test('theme toggle updates the document theme and persists across reload', async ({ page }) => {
    const initialTheme = await page.locator('html').getAttribute('data-theme')
    await toggleTheme(page)

    const updatedTheme = await page.locator('html').getAttribute('data-theme')
    expect(updatedTheme).not.toBe(initialTheme)
    await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', updatedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')

    await page.reload()
    await waitForFeedLoaded(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', updatedTheme || 'light')
  })

  test('AI summary and sprint health surfaces render populated seeded data', async ({ page }) => {
    await navigateToView(page, 'ai-summary')
    await expect(page.locator('#summary-body')).not.toHaveText('')
    await expect(page.locator('#summary-highlights > *').first()).toBeVisible()
    await expect(page.locator('#summary-blockers > *').first()).toBeVisible()
    await expect(page.locator('#summary-actions > *').first()).toBeVisible()
    await expect(page.locator('#meeting-brief')).not.toHaveText('')

    await navigateToView(page, 'sprint-health')
    await expect(page.locator('#health-metrics .health-metric').first()).toBeVisible()
    await expect(page.locator('#deadline-risk-list > *').first()).toBeVisible()
    await expect(page.locator('#workflow-trend')).not.toHaveText('')
    await expect(page.locator('#issue-distribution > *').first()).toBeVisible()
  })

  test('authenticated teammate updates the standup and profile chrome', async ({ page }) => {
    await authenticatePage(page, AUTH_USERS.sam)
    await gotoApp(page)
    await waitForFeedLoaded(page)
    await navigateToView(page, 'my-standup')

    await expect(page.locator('#current-user-select')).toHaveValue('user-sam')
    await expect(page.locator('.topbar_pfp span')).toHaveText('SH')

    await navigateToView(page, 'when-to-meet')
    await expect(page.locator('#meeting-roster')).toContainText('Sam He (You)')
  })
})
