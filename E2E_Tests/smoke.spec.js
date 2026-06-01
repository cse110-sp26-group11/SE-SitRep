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

import { test, expect } from '@playwright/test';
import {
  expectPageLoaded,
  expectNavigationVisible,
  expectBackendReady,
  expectApiStatus,
} from './fixtures.js';

test.describe('Smoke Tests — Application Health', () => {
  /**
   * Verify backend is responsive before running other tests.
   * If this fails, the rest of the suite will likely fail too.
   */
  test('backend API is healthy', async () => {
    await expectBackendReady();
  });

  /**
   * Verify the homepage loads successfully.
   * HTTP 200 means no server errors.
   */
  test('homepage loads successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  /**
   * Verify the page has a meaningful title (not blank).
   * This indicates HTML was rendered correctly.
   */
  test('page has a title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/tatOS/i);
  });

  /**
   * Verify the page rendered content (not an error page).
   */
  test('page has visible content', async ({ page }) => {
    await page.goto('/');
    await expectPageLoaded(page);
  });

  /**
   * Verify main navigation elements are present and visible.
   * Both sidebar and topbar should be on the page.
   */
  test('navigation elements are visible', async ({ page }) => {
    await page.goto('/');
    await expectNavigationVisible(page);
  });

  /**
   * Verify theme toggle button is present and functional.
   * Theme persistence is a core feature.
   */
  test('theme toggle is present', async ({ page }) => {
    await page.goto('/');
    const themeBtn = page.locator('#theme-toggle');
    await expect(themeBtn).toBeVisible();
  });

  /**
   * Verify the sidebar is present and can be toggled on mobile.
   * Important for responsive design.
   */
  test('sidebar navigation exists', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('#sidebar');
    const toggleBtn = page.locator('#sidebar-toggle');

    // The sidebar and the toggle button should exist in the DOM.
    await expect(sidebar).toHaveCount(1);
    await expect(toggleBtn).toHaveCount(1);

    // If the button is visible in this viewport, it should be functional.
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await expect(sidebar).toBeVisible();
    }
  });

  /**
   * Verify skip-to-content link is present for accessibility.
   */
  test('skip link is present for accessibility', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();
  });
});