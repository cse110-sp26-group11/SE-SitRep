# Lighthouse Audit Report — SE SitRep

**URL:** https://se-sitrep.ars030.workers.dev/
**Tool:** Lighthouse 13.0.2 · Emulated Desktop · Chromium 148.0.0.0
**Captured:** June 5, 2026

## Prioritised Action List

| Priority | Issue | Effort | Impact |
|---|---|---|---|
| High | Dummy buttons (Synch Github and Notification Bell) | Low — remove notification bell, Medium - Reimplement the Sync Github Button | Right now those modules serve no purpose, so either remove them or implement them |
| High | `sync-github` 400 errors in console | Low — catch + suppress or fix trigger condition | Fixes Timespan Best Practices, cleaner UX |
| Medium | Low-contrast elements (4 elements) | Low-medium — tweak CSS color values | Accessibility for users with visual impairments |
| Medium | Reduce unused JavaScript (177 KiB) | Medium — bundler/code splitting | Biggest performance gain available |
| Low | Add meta description | Trivial — one line in index.html | SEO completeness |
| Low | Minify JavaScript (20 KiB) | Low — add build step | Small performance gain |
| Low | Render-blocking requests (130 ms) | Medium — restructure CSS/JS loading | Small load time improvement |


---

## Summary Scorecard

| Category | Navigational (Load) | Timespan (Interaction) |
|---|---|---|
| Performance | 96 / 100 | 21 / 22 |
| Accessibility | 100 / 100 | — |
| Best Practices | 91 / 100 | 7 / 8 |
| SEO | 100 / 100 | — |

Overall the site loads extremely fast and scores well across all categories. The issues below are improvements, not breakages.

---

## Navigational Audit (Initial Page Load)

*Captured Jun 5, 2026 at 4:02 PM PDT — single page session, initial load.*

### Core Web Vitals

| Metric | Value | Rating |
|---|---|---|
| First Contentful Paint (FCP) | 0.5 s | Good |
| Largest Contentful Paint (LCP) | 0.5 s | Good |
| Total Blocking Time (TBT) | 0 ms | Good |
| Cumulative Layout Shift (CLS) | 0.057 | Good |
| Speed Index (SI) | 0.6 s | Good |

All five Core Web Vitals pass. Load performance is excellent.

---

### Performance — Score: 96

Three diagnostics reduce the score from 100. None affect functionality.

#### 1. Render-blocking requests · Est. savings: 130 ms

One or more resources (likely a stylesheet or synchronous script) are loaded in a way that blocks the browser from rendering the page. Moving them to load asynchronously or deferring them would shave roughly 130 ms off the perceived load time.

**Fix:** Audit `<link rel="stylesheet">` and `<script>` tags in `src/index.html`. Add `defer` to scripts that don't need to run before render. For critical CSS, inline the above-the-fold rules and load the rest with `media="print" onload="this.media='all'"`.

#### 2. Reduce unused JavaScript · Est. savings: 177 KiB

A significant amount of JS is downloaded but not executed on the initial load. This is the largest single opportunity.

**Fix:** Audit what is actually needed on first render. If the codebase grows to use a bundler (e.g. esbuild, Vite), tree-shaking and code-splitting per route will handle this automatically. For now, identify any large third-party scripts loaded unconditionally and defer or lazy-load them.

#### 3. Minify JavaScript · Est. savings: 20 KiB

`src/main.js` is served unminified. 20 KiB of savings is available from whitespace and comment removal alone.

**Fix:** Add a minification step to the build/deploy pipeline (e.g. `esbuild --minify`). Cloudflare Pages can apply this automatically via a build command.

#### 4. Long main-thread task (1 found)

One task ran long enough to block the main thread, which can delay input responsiveness on slower devices even if TBT scored 0 ms on this emulated run.

**Fix:** Use the Chrome DevTools Performance panel to identify the specific task. Common causes in this codebase: large `renderMeetingGrid` calls when the availability grid re-renders, or synchronous data processing on load.

---

### Accessibility — Score: 100

No automated failures. Manual testing is still recommended for keyboard navigation, screen reader flow, and focus management.

#### Advisory: Low-contrast text (does not affect score on this run but flagged)

The following elements were noted as potentially low-contrast:

- `span` (likely status/badge labels)
- `button.topbar_pfp` (profile button in topbar)
- `button.btn.btn--primary` (primary action buttons)
- `button.filter-btn.filter-btn--active` (active filter buttons)

**Fix:** Check each element's foreground/background color pair against WCAG AA (4.5:1 for normal text, 3:1 for large text). Use the Chrome DevTools accessibility inspector or the [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/) to verify. Pay particular attention to active/hover states which often use lighter colors.

---

### Best Practices — Score: 91

All failures are in the security hardening category. The site works correctly; these are missing HTTP headers.

| Check | Status | Impact |
|---|---|---|
| CSP effective against XSS | Failing | High |
| Strong HSTS policy | Failing | Medium |
| Proper origin isolation (COOP) | Failing | Medium |
| Clickjacking mitigation (XFO or CSP) | Failing | Medium |
| DOM-based XSS via Trusted Types | Failing | Low |

**Fix:** Add the following response headers in `workers/index.js` (or via a Cloudflare Transform Rule):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.github.com
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Cross-Origin-Opener-Policy: same-origin
X-Frame-Options: DENY
```

Tune the CSP `connect-src` and `script-src` directives to match the actual origins the app fetches from. Start with Report-Only mode to catch violations before enforcing.

---

### SEO — Score: 100

One advisory noted (does not affect the score on this run):

#### Missing meta description

The page has no `<meta name="description">` tag. Search engines may generate their own snippet, which is often less accurate.

**Fix:** Add to `<head>` in `src/index.html`:

```html
<meta name="description" content="SE SitRep — team standup tracker and availability planner for software engineering teams.">
```

---

## Timespan Audit (User Interactions)

*Captured Jun 5, 2026 at 12:46 PM PDT — single page session, user interactions recorded.*

> **Note:** Chrome extensions were active during this run. Lighthouse flagged that extensions may have inflated some metrics. Re-run in an incognito window without extensions for a clean baseline.

### Interaction Metrics

| Metric | Value | Rating |
|---|---|---|
| Total Blocking Time (TBT) | 0 ms | Good |
| Cumulative Layout Shift (CLS) | 0.001 | Excellent |
| Interaction to Next Paint (INP) | 40 ms | Good |

INP of 40 ms is well within the Good threshold (< 200 ms). The UI responds quickly to user input.

---

### Performance — Score: 21/22

#### 1. Minimize main-thread work · 10.8 s total

Over the course of the interaction session, the main thread was occupied for 10.8 seconds. This is spread across the full session, not a single block, but it indicates that rendering or JS work is significant during active use.

**Likely cause:** The availability grid re-renders on every cell click (`renderMeetingPlanner` calls `renderMeetingGrid`, `renderMeetingOverlap`, and `renderMeetingRoster` in full on each interaction). For small teams this is fine; for larger teams it could become noticeable.

**Fix:** Profile with DevTools to confirm the source. If `renderMeetingGrid` dominates, consider partial re-renders (only update the changed cell's DOM attributes rather than rebuilding the full grid innerHTML).

#### 2. Non-composited animations · 3 elements found

Three animated elements are using CSS properties that require the browser to repaint rather than compositing on the GPU. This causes jank on lower-end devices.

**Fix:** In `src/styles/whentomeet.css` and `src/styles/styles.css`, check all `transition` and `animation` declarations. Replace transitions on `background`, `border-color`, `height`, `width`, or `top/left` with transitions on `transform` and `opacity` only — these are the only two properties that compose on the GPU. For example, the `.meeting-cell:hover` `transform: translateY(-1px)` is already good; check that no sibling transitions are triggering repaints alongside it.

---

### Best Practices — Score: 7/8

#### Console errors from `sync-github` endpoints

Multiple `400 Bad Request` errors were logged from the `/sync-github` workflow endpoint across three teams:

| Team | Endpoint |
|---|---|
| `potatoes-2257c837` | `.../sync-github` (×2) |
| `team-demo` | `.../sync-github` (×3) |
| `test-fb2d3a11` | `.../sync-github` (×3) |

These errors fire during normal app usage and are visible in the browser console. Lighthouse deducted one point for this.

**Likely cause:** The `sync-github` workflow is being triggered for teams that are not properly configured with a valid GitHub token or repository. The worker returns 400 rather than silently skipping.

**Fix (short term):** Suppress the console error in the frontend by catching these failures explicitly rather than letting them propagate as unhandled rejected fetch calls. In the relevant handler in `src/main.js`, wrap the sync call in a try/catch and only log a warning if the response is not 400.

**Fix (long term):** In `workers/handlers/workflows.js`, return a more descriptive error (e.g. `{ error: "GitHub integration not configured" }`) and have the frontend surface it as a UI status rather than a console error. Alternatively, only trigger the sync workflow for teams that have a GitHub token configured.

---