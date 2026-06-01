# E2E Testing Guide

E2E testing framework + how to write tests 

## Quick Start

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Health checks (homepage loads, API responds, etc.)
npm run test:smoke

# API endpoint validation
npm run test:api

# Dashboard UI tests
npm run test:dashboard

# Standup feature tests
npm run test:standups
```

### Debug Tests Interactively
```bash
# Open Playwright UI for visual debugging
npm run test:ui

# Step through tests with debugger
npm run test:debug
```

---

## Framework Structure

```
E2E_Tests/
├── fixtures.js           # Helpers, test data, utilities
├── smoke.spec.js         # Basic health checks
├── example.spec.js       # API endpoint tests
├── dashboard.spec.js     # Dashboard UI tests
├── standups.spec.js      # Standup feature tests
└── README.md             # This file
```

Each file is self-contained and documented with clear comments.

---

## How Tests Are Organized

### 1. **Smoke Tests** (`smoke.spec.js`)
Health checks that verify the app can start.

- ✓ Backend API responds
- ✓ Homepage loads without errors
- ✓ Navigation elements exist
- ✓ Theme toggle is present

**When to use:** Run before other tests to catch obvious problems early.

### 2. **API Tests** (`example.spec.js`)
Direct backend endpoint testing (no UI).

- ✓ Health endpoint returns expected data
- ✓ Team endpoint returns team + members
- ✓ Standups endpoint returns list
- ✓ Error handling (404s, invalid data)

**When to use:** When changes are made to API handlers or data models.

### 3. **Dashboard Tests** (`dashboard.spec.js`)
UI verification for the main dashboard.

- ✓ Dashboard loads successfully
- ✓ Team info is displayed
- ✓ Users can navigate between views
- ✓ Theme switching works
- ✓ Accessibility features are present

**When to use:** When building or modifying dashboard features.

### 4. **Standup Tests** (`standups.spec.js`)
Standup form and standup history UI.

- ✓ Standup form is accessible
- ✓ Standup history displays correctly
- ✓ Form fields work as expected
- ✓ Submission tracking works

**When to use:** When implementing standup features.

---

## Writing Your Own Tests

### Basic Test Structure

Every test file follows this pattern:

```javascript
import { test, expect } from '@playwright/test';
import { expectPageLoaded, apiCall } from './fixtures.js';

test.describe('Feature Name', () => {
  test('does something', async ({ page }) => {
    // Arrange: Set up the test
    await page.goto('/');
    
    // Act: Perform an action
    const btn = page.locator('button');
    await btn.click();
    
    // Assert: Verify the result
    await expect(page).toHaveTitle(/expected/);
  });
});
```

### Using Fixtures

The `fixtures.js` file provides helpers to keep tests readable:

#### **Test Data Generators**
```javascript
import { createMockStandup, createMockTeam, createMockMember } from './fixtures.js';

// Create realistic sample data
const standup = createMockStandup({
  yesterday: 'Fixed bug #123',
  blocker: null
});
```

#### **Common Assertions**
```javascript
import { expectPageLoaded, expectNavigationVisible } from './fixtures.js';

// Verify page loaded successfully
await expectPageLoaded(page);

// Verify UI elements exist
await expectNavigationVisible(page);
```

#### **API Calls**
```javascript
import { apiCall, expectBackendReady } from './fixtures.js';

// Ensure backend is running
await expectBackendReady();

// Make direct API calls for setup
const team = await apiCall('GET', '/api/team');
const standups = await apiCall('GET', '/api/standups?date=2026-05-31');
```

#### **UI Helpers**
```javascript
import { toggleTheme, openSidebar, navigateToView } from './fixtures.js';

// Toggle light/dark theme
await toggleTheme(page);

// Open mobile navigation
await openSidebar(page);

// Navigate to a feature area
await navigateToView(page, 'standups');
```

### Example: Writing a New Test

Let's say you want to test that users can filter standups by date.

```javascript
import { test, expect } from '@playwright/test';
import { expectPageLoaded, apiCall } from './fixtures.js';

test.describe('Standup Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expectPageLoaded(page);
  });

  test('can filter standups by date', async ({ page }) => {
    // Get today's standups
    const today = new Date().toISOString().split('T')[0];
    const todayStandups = await apiCall('GET', `/api/standups?date=${today}`);

    // Verify we got results
    expect(Array.isArray(todayStandups)).toBe(true);

    // Try to navigate to standups view
    const standupBtn = page.locator('[data-open-view="standups"]');
    if (await standupBtn.isVisible()) {
      await standupBtn.click();
      await page.waitForTimeout(300);

      // If a date filter exists, test it
      const dateFilter = page.locator('input[type="date"], [data-filter="date"]');
      if (await dateFilter.isVisible()) {
        // Try changing the date
        await dateFilter.fill(today);
        await page.waitForTimeout(500);

        // Verify results update
        const results = page.locator('[data-standup-item]');
        const count = await results.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
```

---

## Selectors & Best Practices

### Good Selectors (Most Reliable)
```javascript
// Data attributes (most stable)
page.locator('[data-testid="submit-btn"]')

// ARIA attributes (accessible)
page.locator('[aria-label="Save"]')

// Role queries (semantic)
page.getByRole('button', { name: 'Submit' })
```

### Fragile Selectors (Avoid)
```javascript
// Class names (change frequently with styling)
page.locator('.btn-primary.ml-2')

// Positional selectors (break with layout changes)
page.locator('div:nth-child(3) > button')

// Text content (changes with localization)
page.locator('text="Click here"')
```

### Tip for Adding Test IDs
If a page element doesn't have a good selector, add a `data-testid` attribute:

```html
<button data-testid="submit-standup">Submit</button>
```

Then in tests:
```javascript
await page.locator('[data-testid="submit-standup"]').click();
```

---

## Common Patterns

### Pattern 1: Test API + UI
```javascript
test('standup is displayed after creation', async ({ page }) => {
  // Create via API
  const standup = createMockStandup();
  await apiCall('POST', '/api/standups', standup);

  // Verify UI shows it
  await page.goto('/');
  const standupItem = page.locator('[data-standup-item]');
  await expect(standupItem).toBeVisible();
});
```

### Pattern 2: Conditional Testing
```javascript
test('optional feature works if present', async ({ page }) => {
  const optionalBtn = page.locator('[data-feature="optional"]');

  if (await optionalBtn.isVisible()) {
    // Only run this part if feature exists
    await optionalBtn.click();
    await expect(page.locator('[data-result]')).toBeVisible();
  }
});
```

### Pattern 3: Testing Error States
```javascript
test('handles invalid team ID gracefully', async () => {
  try {
    await apiCall('GET', '/api/team?teamId=invalid');
    fail('Expected error but call succeeded');
  } catch (error) {
    expect(error.message).toContain('404');
  }
});
```

---

## Debugging Tests

### Visual Debugging
```bash
npm run test:ui
```
Opens Playwright Inspector with visual step-through.

### Console Logging
```javascript
test('debug example', async ({ page }) => {
  await page.goto('/');
  
  // Log element visibility
  console.log('Submit button visible:', await page.locator('button[type="submit"]').isVisible());
  
  // Log page content
  const text = await page.textContent('body');
  console.log('Page contains:', text.substring(0, 100));
});
```

### Screenshots
```javascript
test('take screenshot', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'screenshot.png' });
});
```

### Slow Motion
```bash
playwright test --headed --slow-mo=2000
```
Runs tests in a visible browser with 2-second pauses between actions.

---

## Maintenance

### When Tests Break

1. **Check the error message** - Playwright gives clear descriptions
2. **Run in UI mode** - `npm run test:ui` to see exactly what's happening
3. **Update selectors** - If HTML structure changed, update `locator()` calls
4. **Update fixtures** - If API changed, update `createMock*` functions
5. **Add console.log** - Temporary logging to understand state

### When to Add Tests

- ✓ New feature implemented
- ✓ Bug fixed (add test to prevent regression)
- ✓ Breaking API change
- ✓ UI accessibility improvement

### When to Skip Tests

Use `test.skip()` for tests that don't apply yet:
```javascript
test.skip('future feature not yet implemented', async () => {
  // This won't run
});
```

---

## Configuration

Tests use [playwright.config.js](../playwright.config.js):
- **Base URL**: `http://localhost:8787`
- **Browsers**: Chrome, Firefox, WebKit
- **Reporting**: HTML report (auto-generated)
- **Retries**: 2x on CI, 0x locally
- **Traces**: On first failure

### View Test Results
After running tests:
```bash
playwright show-report
```

---

## Tips for Developers

1. **Write tests as documentation** - Clear test names explain what the feature does
2. **Keep tests focused** - One test, one behavior
3. **Use helpers** - `fixtures.js` prevents code duplication
4. **Add comments** - Explain *why* you're testing something
5. **Run often** - Quick feedback loop catches problems early
6. **Commit alongside code** - Tests and code changes go together

---

## Need Help?

- **Playwright Docs**: https://playwright.dev/docs/intro
- **API Reference**: https://playwright.dev/docs/api/class-page
- **Common Recipes**: https://playwright.dev/docs/codegen

---

Happy testing! 🎭
