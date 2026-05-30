import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  const response = await page.goto('/');
  expect(response.status()).toBe(200);
});

test('page has a title', async ({ page }) => {
  await page.goto('/');

  // Check the tab title isn't empty
  await expect(page).toHaveTitle(/.+/);
});

test('page has visible content', async ({ page }) => {
  await page.goto('/');

  // Check something is actually rendered on the page
  await expect(page.locator('body')).not.toBeEmpty();
});