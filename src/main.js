/**
 * SE SitRep — main.js
 * Placeholder for JavaScript implementation.
 *
 * Suggested hooks (already wired up in the HTML):
 *
 *  - Filter bar:  [data-filter] buttons → show/hide .feed-item[data-status]
 *  - Sidebar nav: [data-view] links → swap active panel / page
 *  - "Add standup" button → open modal or navigate to form
 */

// ── Filter bar ────────────────────────────────────────────────────────
const filterBtns = document.querySelectorAll('.filter-btn');
const feedItems  = document.querySelectorAll('.feed-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
    btn.classList.add('filter-btn--active');

    const filter = btn.dataset.filter;

    feedItems.forEach(item => {
      if (filter === 'all') {
        item.hidden = false;
      } else if (filter === 'blocked') {
        item.hidden = item.dataset.status !== 'blocked';
      } else if (filter === 'no-update') {
        // TODO: wire up when data model is ready
        item.hidden = false;
      }
    });
  });
});

// ── Sidebar active state ──────────────────────────────────────────────
const sidebarLinks = document.querySelectorAll('.sidebar__link');

sidebarLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    sidebarLinks.forEach(l => l.classList.remove('sidebar__link--active'));
    link.classList.add('sidebar__link--active');
    // TODO: swap main content based on link.dataset.view
  });
});
