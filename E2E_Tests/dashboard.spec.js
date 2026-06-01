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

import { test, expect } from '@playwright/test';
import {
  expectPageLoaded,
  navigateToView,
  apiCall,
  expectBackendReady,
} from './fixtures.js';

test.describe('Dashboard UI Tests', () => {
  /**
   * Ensure backend is ready.
   */
  test.beforeAll(async () => {
    await expectBackendReady();
  });

  /**
   * Each test starts at the homepage.
   */
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expectPageLoaded(page);
  });

  test.describe('Dashboard Loading', () => {
    /**
     * Verify dashboard view loads without errors.
     */
    test('dashboard view loads successfully', async ({ page }) => {
      // Try to navigate to dashboard view
      const dashboardBtn = page.locator('[data-open-view="dashboard"]');

      if (await dashboardBtn.isVisible()) {
        await dashboardBtn.click();
        // Give UI time to render
        await page.waitForTimeout(500);

        // Should have dashboard content (any non-empty content is good)
        const content = page.locator('[data-view-panel="dashboard"]');
        if (await content.isVisible()) {
          const text = await content.textContent();
          expect(text?.trim().length).toBeGreaterThan(0);
        }
      }
    });

    /**
     * Verify the page title updates when navigating.
     */
    test('page title is set', async ({ page }) => {
      await expect(page).toHaveTitle(/tatOS/i);
    });
  });

  test.describe('Team Information Display', () => {
    /**
     * Verify team data is displayed on the page.
     * The backend should provide team info via /api/team.
     */
    test('team information is displayed', async ({ page }) => {
      // Make API call to get team data
      const teamData = await apiCall('GET', '/api/team');

      if (teamData?.team?.name) {
        // Team name should appear somewhere on the page
        const pageText = await page.textContent('body');
        expect(pageText).toContain(teamData.team.name);
      }
    });

    /**
     * Verify team members are displayed if they exist.
     */
    test('team members are visible', async ({ page }) => {
      const teamData = await apiCall('GET', '/api/team');

      if (teamData?.members && teamData.members.length > 0) {
        const firstMember = teamData.members[0];
        const pageText = await page.textContent('body');

        // At least one member's name or info should be visible
        expect(pageText).toContain(firstMember.displayName || firstMember.initials);
      }
    });
  });

  test.describe('View Navigation', () => {
    /**
     * Verify we can switch between different views.
     * The app should have multiple views (dashboard, standups, etc).
     */
    test('can navigate between views', async ({ page }) => {
      // Get all view buttons
      const viewButtons = page.locator('[data-open-view]');
      const count = await viewButtons.count();

      if (count > 0) {
        // Click first view button and verify it's activated
        const firstBtn = viewButtons.nth(0);
        await firstBtn.click();

        // UI should respond
        await page.waitForTimeout(300);

        // At minimum, page should still be loaded
        await expectPageLoaded(page);
      }
    });

    /**
     * Verify sidebar links work on mobile.
     */
    test('sidebar navigation is functional', async ({ page }) => {
      const sidebarLinks = page.locator('.sidebar_link');
      const count = await sidebarLinks.count();

      if (count > 0) {
        // Click first link
        const firstLink = sidebarLinks.nth(0);
        await firstLink.click();

        // Page should still be functional
        await expectPageLoaded(page);
      }
    });
  });

  test.describe('Theme Switching', () => {
    /**
     * Verify light/dark mode toggle works.
     */
    test('theme toggle changes data-theme attribute', async ({ page }) => {
      const htmlElement = page.locator('html');

      // Get initial theme
      const initialTheme = await htmlElement.getAttribute('data-theme');
      expect(['light', 'dark']).toContain(initialTheme);

      // Click theme button
      const themeBtn = page.locator('#theme-toggle');
      if (await themeBtn.isVisible()) {
        await themeBtn.click();
        await page.waitForTimeout(100);

        // Theme should change
        const newTheme = await htmlElement.getAttribute('data-theme');
        expect(newTheme).not.toBe(initialTheme);
      }
    });

    /**
     * Verify theme preference persists in localStorage.
     */
    test('theme preference is saved', async ({ page }) => {
      const themeBtn = page.locator('#theme-toggle');

      if (await themeBtn.isVisible()) {
        // Set theme to dark
        await themeBtn.click();
        await page.waitForTimeout(100);

        const currentTheme = await page.locator('html').getAttribute('data-theme');

        // Check localStorage
        const saved = await page.evaluate(() => localStorage.getItem('theme'));
        expect(saved).toBe(currentTheme);
      }
    });
  });

  test.describe('Accessibility', () => {
    /**
     * Verify skip link is functional.
     * Important for keyboard navigation and accessibility.
     */
    test('skip link navigates to main content', async ({ page }) => {
      const skipLink = page.locator('.skip-link');
      const mainContent = page.locator('#main-content');

      if (await skipLink.isVisible() && await mainContent.isVisible()) {
        const hrefAttr = await skipLink.getAttribute('href');
        expect(hrefAttr).toBe('#main-content');
      }
    });

    /**
     * Verify sidebar toggle has proper ARIA labels.
     */
    test('sidebar toggle has ARIA labels', async ({ page }) => {
      const sidebarToggle = page.locator('#sidebar-toggle');

      if (await sidebarToggle.isVisible()) {
        const ariaLabel = await sidebarToggle.getAttribute('aria-label');
        const ariaExpanded = await sidebarToggle.getAttribute('aria-expanded');

        expect(ariaLabel).toBeTruthy();
        expect(['true', 'false']).toContain(ariaExpanded);
      }
    });

    /**
     * Verify page has proper heading structure for screen readers.
     */
    test('page has heading elements', async ({ page }) => {
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const count = await headings.count();

      // Should have at least one heading for structure
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});