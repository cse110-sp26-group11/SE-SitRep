# E2E Testing Guide

This page explains how to use our Playwright-based E2E testing framework.

## Quick Start

Install dependencies and run all tests:

```sh
npx playwright install
npm run test:e2e
```

## Available Commands

- `npm run test:e2e:smoke` — Basic health checks (homepage, API reachability).
- `npm run test:e2e:api` — Direct backend endpoint validation.
- `npm run test:e2e:dashboard` — Dashboard UI verification.
- `npm run test:e2e:standups` — Standup form and history tests.
- `npm run test:e2e:ui` — Opens Playwright UI for visual debugging.

## Framework Structure

- `E2E_Tests/fixtures.js` — Shared helpers, test data generators, and API wrappers.
- `E2E_Tests/*.spec.js` — Individual test suites for different features.

## Writing New Tests

Every test file should follow this pattern:

```javascript
import { test, expect } from '@playwright/test';
import { expectPageLoaded } from './fixtures.js';

test.describe('Feature Name', () => {
  test('standard behavior', async ({ page }) => {
    await page.goto('/');
    await expectPageLoaded(page);
    // Perform actions and assert results
  });
});
```

Refer to `E2E_Tests/README.md` in the repository for more detailed selector best practices and debugging tips.
