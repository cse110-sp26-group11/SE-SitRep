/**
 * SE SitRep — main.js
 *
 * Three responsibilities:
 *  1. Theme switching (light / dark)
 *  2. Sidebar hamburger drawer and app views
 *  3. Feed rendering via <template> + mock data
 *  4. Standup form preview
 *  5. Shared availability planner
 *     (swap mockFetch for a real fetch('/api/standups') when your backend is ready)
 */

/* ══════════════════════════════════════════════════════════
   1. THEME SWITCHER
   ══════════════════════════════════════════════════════════ */

const THEMES = ['light', 'dark'];
const themeBtn = document.getElementById('theme-toggle');

// Labels describe the theme you'll switch TO (not the current one)
const NEXT_LABEL = {
  light: 'Switch to dark theme',
  dark: 'Switch to light theme',
};

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (themeBtn) {
    themeBtn.setAttribute('aria-label', NEXT_LABEL[theme]);
  }
}

themeBtn?.addEventListener('click', () => {
  const next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
  applyTheme(next);
});

// Sync button label on load (theme itself is set by the inline <script> in <head>)
if (themeBtn) themeBtn.setAttribute('aria-label', NEXT_LABEL[currentTheme()]);


/* ══════════════════════════════════════════════════════════
   2. SIDEBAR / HAMBURGER DRAWER
   ══════════════════════════════════════════════════════════ */

const toggleBtn = document.getElementById('sidebar-toggle');
const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('sidebar-overlay');
const sidebarLinks = document.querySelectorAll('.sidebar_link');
const viewPanels = document.querySelectorAll('[data-view-panel]');
const openViewButtons = document.querySelectorAll('[data-open-view]');

function openSidebar() {
  sidebar.classList.add('is-open');
  overlay.classList.add('is-visible');
  overlay.setAttribute('aria-hidden', 'false');
  toggleBtn.setAttribute('aria-expanded', 'true');
  toggleBtn.setAttribute('aria-label', 'Close navigation menu');
}

function closeSidebar() {
  sidebar.classList.remove('is-open');
  overlay.classList.remove('is-visible');
  overlay.setAttribute('aria-hidden', 'true');
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.setAttribute('aria-label', 'Open navigation menu');
}

toggleBtn?.addEventListener('click', () => {
  sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
});
overlay?.addEventListener('click', closeSidebar);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
    closeSidebar();
    toggleBtn.focus();
  }
});

function setActiveView(viewName) {
  sidebarLinks.forEach(link => {
    const isActive = link.dataset.view === viewName;
    link.classList.toggle('sidebar_link--active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  viewPanels.forEach(panel => {
    const isActive = panel.dataset.viewPanel === viewName;
    panel.classList.toggle('app-view--active', isActive);
    panel.setAttribute('aria-hidden', String(!isActive));
  });

  if (window.innerWidth <= 680 && sidebar.classList.contains('is-open')) {
    closeSidebar();
  }
}

sidebarLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    setActiveView(link.dataset.view);
  });
});

openViewButtons.forEach(button => {
  button.addEventListener('click', () => {
    setActiveView(button.dataset.openView);
  });
});


/* ══════════════════════════════════════════════════════════
   3. FEED — TEMPLATE RENDERING + MOCK DATA
   ══════════════════════════════════════════════════════════ */

/**
 * Mock data — shaped exactly like what your real API will return.
 * When your backend is ready, delete this and uncomment the real fetch below.
 *
 * Fields:
 *   id         — short unique key; drives avatar CSS class + element IDs
 *   name       — full display name
 *   initials   — shown in avatar circle
 *   status     — 'available' | 'lead' | 'blocked' | null
 *   badgeLabel — text inside the badge (can differ from status, e.g. "Role: lead")
 *   badgeType  — CSS modifier: 'available' | 'lead' | 'blocked' | null (no badge)
 *   timeAgo    — display string, e.g. "2h ago"
 *   timeAgoLong— spoken string for aria-label, e.g. "2 hours ago"
 *   datetime   — ISO 8601 duration for <time datetime="…">
 *   today      — today's standup text (plain string; BLOCKER prefix included if needed)
 *   yesterday  — yesterday's text, or null if absent
 *   isBlocker  — true applies the red blocker style to the today entry
 */
const MOCK_PEOPLE = [
  {
    id: 'mr', name: 'Maya Rodriguez', initials: 'MR',
    status: 'available', badgeLabel: 'available', badgeType: 'available',
    timeAgo: '2h ago', timeAgoLong: '2 hours ago', datetime: 'PT2H',
    today: 'Working on commit summary widget and sprint dashboard UI',
    yesterday: 'Finished GitHub OAuth flow, reviewed PR #12',
    isBlocker: false,
  },
  {
    id: 'ak', name: 'Arav Kumar', initials: 'AK',
    status: 'lead', badgeLabel: 'lead', badgeType: 'lead',
    timeAgo: '1h ago', timeAgoLong: '1 hour ago', datetime: 'PT1H',
    today: 'Sprint planning prep, coordinating TA meeting notes',
    yesterday: 'Set up CI/CD pipeline on GitHub Actions',
    isBlocker: false,
  },
  {
    id: 'jl', name: 'Jamie Lee', initials: 'JL',
    status: 'blocked', badgeLabel: 'blocked', badgeType: 'blocked',
    timeAgo: '3h ago', timeAgoLong: '3 hours ago', datetime: 'PT3H',
    today: "BLOCKER — Waiting on Cloudflare KV access, can't proceed with persistence layer",
    yesterday: null,
    isBlocker: true,
  },
  {
    id: 'ry', name: 'Ray Yang', initials: 'RY',
    status: 'available', badgeLabel: null, badgeType: null,
    timeAgo: '30m ago', timeAgoLong: '30 minutes ago', datetime: 'PT30M',
    today: 'Sprint 1 research doc, wireframes for all 4 screens',
    yesterday: null,
    isBlocker: false,
  },
  {
    id: 'sh', name: 'Sam He', initials: 'SH',
    status: 'available', badgeLabel: null, badgeType: null,
    timeAgo: '4h ago', timeAgoLong: '4 hours ago', datetime: 'PT4H',
    today: 'User personas and user story refinement',
    yesterday: null,
    isBlocker: false,
  },
];

/**
 * Simulates a network request. Replace the body with a real fetch:
 *
 *   async function fetchStandups() {
 *     const res = await fetch('/api/standups');
 *     if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *     return res.json();
 *   }
 */
async function fetchStandups() {
  // Simulate ~400ms network latency so the loading state is visible
  await new Promise(r => setTimeout(r, 400));
  return MOCK_PEOPLE;
}

/**
 * Clones the <template>, fills in one person's data, returns the <article>.
 * This function never touches the HTML — all structure lives in the template.
 */
function renderFeedItem(person, index, total) {
  const template = document.getElementById('feed-item-template');
  const clone    = template.content.cloneNode(true);
  const article  = clone.querySelector('article');

  // ARIA position attributes
  article.dataset.status = person.status || 'available';
  article.setAttribute('aria-labelledby', `entry-name-${person.id}`);
  article.setAttribute('aria-posinset',   index + 1);
  article.setAttribute('aria-setsize',    total);

  // Avatar
  const avatar = article.querySelector('.feed-item_avatar');
  avatar.textContent = person.initials;
  avatar.classList.add(`feed-item_avatar--${person.id}`);

  // Name
  const nameEl = article.querySelector('.feed-item_name');
  nameEl.id          = `entry-name-${person.id}`;
  nameEl.textContent = person.name;

  // Badge — remove the element entirely if this person has no badge
  const badge = article.querySelector('.badge');
  if (person.badgeType) {
    badge.textContent = person.badgeLabel;
    badge.classList.add(`badge--${person.badgeType}`);
    badge.setAttribute('aria-label', `Status: ${person.badgeLabel}`);
  } else {
    badge.remove();
  }

  // Timestamp
  const timeEl = article.querySelector('.feed-item_time');
  timeEl.textContent              = person.timeAgo;
  timeEl.setAttribute('datetime', person.datetime);
  timeEl.setAttribute('aria-label', person.timeAgoLong);

  // Today entry
  const todayEl = article.querySelector('.entry-today');
  if (person.isBlocker) {
    todayEl.classList.add('feed-item_entry--blocker');
    todayEl.innerHTML = `<strong>BLOCKER</strong> — ${person.today.replace(/^BLOCKER\s*—\s*/i, '')}`;
  } else {
    todayEl.innerHTML = `<strong>TODAY</strong> — ${person.today}`;
  }

  // Yesterday entry — remove if null
  const yestEl = article.querySelector('.entry-yesterday');
  if (person.yesterday) {
    yestEl.innerHTML = `<strong>YESTERDAY</strong> — ${person.yesterday}`;
  } else {
    yestEl.remove();
  }

  return article;
}

/**
 * Main load function — fetches data, renders items, wires up filters.
 */
async function loadFeed() {
  const feedList = document.getElementById('feed-list');

  try {
    const people = await fetchStandups();

    feedList.innerHTML = ''; // clear loading message

    people.forEach((person, i) => {
      feedList.appendChild(renderFeedItem(person, i, people.length));
    });

    feedList.setAttribute('aria-busy', 'false');
    wireUpFilters(); // attach filter logic now that items exist in the DOM

  } catch (err) {
    feedList.innerHTML = '<p class="feed-error" role="alert">Could not load standup entries. Please refresh.</p>';
    feedList.setAttribute('aria-busy', 'false');
    console.error('Feed load failed:', err);
  }
}

/* ══════════════════════════════════════════════════════════
   4. STANDUP FORM — LOCAL PREVIEW + SAVE FEEDBACK
   ══════════════════════════════════════════════════════════ */

const standupForm = document.getElementById('standup-form');
const standupPreview = document.getElementById('standup-preview');
const standupStatus = document.getElementById('standup-status');
const meetingGrid = document.getElementById('meeting-grid');
const meetingRoster = document.getElementById('meeting-roster');
const meetingOverlapList = document.getElementById('meeting-overlap-list');
const meetingModeButtons = document.querySelectorAll('[data-meeting-mode]');

const MEETING_STORAGE_KEY = 'meetingAvailability';
const MEETING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MEETING_DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MEETING_SLOTS = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];

const TEAM_MEETING_DATA = [
  {
    id: 'mr',
    name: 'Maya Rodriguez',
    initials: 'MR',
    availability: {
      '0-0': 'available', '0-1': 'available', '0-2': 'maybe', '1-2': 'available', '1-3': 'available', '1-4': 'available',
      '2-1': 'available', '2-2': 'available', '2-3': 'maybe', '3-4': 'available', '3-5': 'available', '4-1': 'available',
      '4-2': 'available', '4-3': 'available'
    }
  },
  {
    id: 'ak',
    name: 'Arav Kumar',
    initials: 'AK',
    availability: {
      '0-1': 'available', '0-2': 'available', '0-3': 'available', '1-1': 'maybe', '1-2': 'available', '2-3': 'available',
      '2-4': 'available', '2-5': 'maybe', '3-2': 'available', '3-3': 'available', '3-4': 'available', '4-2': 'available',
      '4-3': 'maybe', '4-4': 'available'
    }
  },
  {
    id: 'jl',
    name: 'Jamie Lee',
    initials: 'JL',
    availability: {
      '0-4': 'maybe', '0-5': 'available', '1-4': 'available', '1-5': 'available', '2-0': 'available', '2-1': 'maybe',
      '2-5': 'available', '3-0': 'available', '3-1': 'available', '3-5': 'maybe', '4-4': 'available', '4-5': 'available'
    }
  },
  {
    id: 'ry',
    name: 'Ray Yang',
    initials: 'RY',
    availability: {
      '0-0': 'available', '0-1': 'maybe', '1-0': 'available', '1-1': 'available', '1-2': 'maybe', '2-2': 'available',
      '2-3': 'available', '2-4': 'available', '3-3': 'maybe', '3-4': 'available', '4-0': 'available', '4-1': 'available',
      '4-2': 'maybe'
    }
  },
  {
    id: 'sh',
    name: 'Sam He',
    initials: 'SH',
    availability: {
      '0-2': 'available', '0-3': 'available', '1-3': 'available', '1-4': 'maybe', '2-2': 'maybe', '2-3': 'available',
      '3-1': 'available', '3-2': 'available', '3-3': 'maybe', '4-1': 'available', '4-2': 'available', '4-3': 'available'
    }
  }
];

let currentMeetingMode = 'available';
let myMeetingAvailability = loadMeetingAvailability();

function readField(formData, fieldName, fallback) {
  const value = formData.get(fieldName);
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function slotKey(dayIndex, slotIndex) {
  return `${dayIndex}-${slotIndex}`;
}

function loadMeetingAvailability() {
  try {
    const saved = localStorage.getItem(MEETING_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveMeetingAvailability() {
  localStorage.setItem(MEETING_STORAGE_KEY, JSON.stringify(myMeetingAvailability));
}

function getAvailabilityWeight(status) {
  if (status === 'available') return 1;
  if (status === 'maybe') return 0.5;
  return 0;
}

function getOverlapScore(dayIndex, slotIndex) {
  const key = slotKey(dayIndex, slotIndex);
  const teammateScore = TEAM_MEETING_DATA.reduce((total, teammate) => {
    return total + getAvailabilityWeight(teammate.availability[key] || 'busy');
  }, 0);

  return teammateScore + getAvailabilityWeight(myMeetingAvailability[key] || 'busy');
}

function getOverlapBucket(score) {
  if (score >= 5) return 6;
  if (score >= 4) return 5;
  if (score >= 3) return 4;
  if (score >= 2) return 3;
  if (score >= 1) return 2;
  return 1;
}

function getMyAvailabilitySummary() {
  const counts = { available: 0, maybe: 0, busy: 0 };

  Object.values(myMeetingAvailability).forEach(status => {
    if (status === 'available') counts.available += 1;
    else if (status === 'maybe') counts.maybe += 1;
  });

  counts.busy = (MEETING_DAYS.length * MEETING_SLOTS.length) - counts.available - counts.maybe;
  return counts;
}

function renderMeetingOverlap() {
  if (!meetingOverlapList) return;

  const slots = [];

  MEETING_DAYS.forEach((day, dayIndex) => {
    MEETING_SLOTS.forEach((slotLabel, slotIndex) => {
      const score = getOverlapScore(dayIndex, slotIndex);
      slots.push({
        day,
        dayLabel: MEETING_DAY_LABELS[dayIndex],
        slotLabel,
        score,
      });
    });
  });

  slots.sort((left, right) => right.score - left.score);

  meetingOverlapList.innerHTML = '';

  slots.slice(0, 5).forEach(slot => {
    const item = document.createElement('li');
    item.className = 'meeting-overlap-item';
    item.innerHTML = `
      <div>
        <strong>${slot.dayLabel} · ${slot.slotLabel}</strong>
        <p>${slot.score.toFixed(slot.score % 1 === 0 ? 0 : 1)} team availability score</p>
      </div>
      <span class="meeting-overlap-score">${slot.score.toFixed(slot.score % 1 === 0 ? 0 : 1)}</span>
    `;
    meetingOverlapList.appendChild(item);
  });
}

function renderMeetingRoster() {
  if (!meetingRoster) return;

  const mySummary = getMyAvailabilitySummary();
  const team = [
    ...TEAM_MEETING_DATA.map(teammate => {
      const availableCount = Object.values(teammate.availability).filter(value => value === 'available').length;
      const maybeCount = Object.values(teammate.availability).filter(value => value === 'maybe').length;
      return {
        initials: teammate.initials,
        name: teammate.name,
        meta: `${availableCount} available · ${maybeCount} maybe`,
      };
    }),
    {
      initials: 'YO',
      name: 'You',
      meta: `${mySummary.available} available · ${mySummary.maybe} maybe`,
    }
  ];

  meetingRoster.innerHTML = '';

  team.forEach(member => {
    const item = document.createElement('div');
    item.className = 'meeting-roster-item';
    item.innerHTML = `
      <div class="meeting-roster-avatar">${member.initials}</div>
      <div>
        <strong>${member.name}</strong>
        <p>${member.meta}</p>
      </div>
    `;
    meetingRoster.appendChild(item);
  });
}

function renderMeetingGrid() {
  if (!meetingGrid) return;

  meetingGrid.innerHTML = '';

  const spacer = document.createElement('div');
  spacer.className = 'meeting-grid_corner';
  spacer.setAttribute('aria-hidden', 'true');
  meetingGrid.appendChild(spacer);

  MEETING_DAYS.forEach(day => {
    const header = document.createElement('div');
    header.className = 'meeting-grid_header';
    header.textContent = day;
    meetingGrid.appendChild(header);
  });

  MEETING_SLOTS.forEach((slotLabel, slotIndex) => {
    const timeLabel = document.createElement('div');
    timeLabel.className = 'meeting-grid_time';
    timeLabel.textContent = slotLabel;
    meetingGrid.appendChild(timeLabel);

    MEETING_DAYS.forEach((day, dayIndex) => {
      const key = slotKey(dayIndex, slotIndex);
      const myStatus = myMeetingAvailability[key] || 'busy';
      const score = getOverlapScore(dayIndex, slotIndex);
      const overlapBucket = getOverlapBucket(score);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'meeting-cell';
      button.dataset.dayIndex = String(dayIndex);
      button.dataset.slotIndex = String(slotIndex);
      button.dataset.selfStatus = myStatus;
      button.dataset.overlap = String(overlapBucket);
      button.setAttribute(
        'aria-label',
        `${MEETING_DAY_LABELS[dayIndex]} ${slotLabel}. Your status: ${myStatus}. Team score: ${score.toFixed(score % 1 === 0 ? 0 : 1)}`
      );
      button.innerHTML = `
        <span class="meeting-cell_status">${myStatus === 'busy' ? 'Busy' : myStatus === 'maybe' ? 'Maybe' : 'Free'}</span>
        <span class="meeting-cell_score">${score.toFixed(score % 1 === 0 ? 0 : 1)}</span>
      `;
      meetingGrid.appendChild(button);
    });
  });
}

function renderMeetingPlanner() {
  if (!meetingGrid) return;
  renderMeetingGrid();
  renderMeetingOverlap();
  renderMeetingRoster();
}

meetingModeButtons.forEach(button => {
  button.addEventListener('click', () => {
    currentMeetingMode = button.dataset.meetingMode;
    meetingModeButtons.forEach(modeButton => {
      const isActive = modeButton === button;
      modeButton.classList.toggle('meeting-mode--active', isActive);
      modeButton.setAttribute('aria-pressed', String(isActive));
    });
  });
});

meetingGrid?.addEventListener('click', event => {
  const cell = event.target.closest('.meeting-cell');
  if (!cell) return;

  const key = slotKey(Number(cell.dataset.dayIndex), Number(cell.dataset.slotIndex));
  myMeetingAvailability[key] = currentMeetingMode;
  saveMeetingAvailability();
  renderMeetingPlanner();
});

function renderStandupPreview() {
  if (!standupForm || !standupPreview) return;

  const formData = new FormData(standupForm);
  const githubText = formData.get('includeGithub')
    ? 'GitHub activity will be attached.'
    : 'GitHub activity is not attached.';

  standupPreview.innerHTML = `
    <p><strong>Yesterday:</strong> ${readField(formData, 'yesterday', 'No update yet.')}</p>
    <p><strong>Today:</strong> ${readField(formData, 'today', 'No update yet.')}</p>
    <p><strong>Blocker:</strong> ${readField(formData, 'blocker', 'None.')}</p>
    <p><strong>Availability:</strong> ${readField(formData, 'availability', 'Available')}</p>
    <p><strong>GitHub:</strong> ${githubText}</p>
  `;
}

if (standupForm) {
  standupForm.addEventListener('input', renderStandupPreview);
  standupForm.addEventListener('change', renderStandupPreview);

  standupForm.addEventListener('submit', event => {
    event.preventDefault();
    renderStandupPreview();

    const formData = new FormData(standupForm);
    const blockerText = readField(formData, 'blocker', '');

    if (standupStatus) {
      standupStatus.textContent = blockerText
        ? 'Standup saved locally. Blocker flagged for follow-up.'
        : 'Standup saved locally. Ready for feed integration.';
    }
  });

  renderStandupPreview();
}

renderMeetingPlanner();

/**
 * Filter bar — called after feed items are rendered.
 */
function wireUpFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const feedList   = document.getElementById('feed-list');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('filter-btn--active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('filter-btn--active');
      btn.setAttribute('aria-pressed', 'true');

      feedList.setAttribute('aria-busy', 'true');

      const filter = btn.dataset.filter;
      const items  = feedList.querySelectorAll('.feed-item');

      items.forEach(item => {
        if      (filter === 'all')       item.hidden = false;
        else if (filter === 'blocked')   item.hidden = item.dataset.status !== 'blocked';
        else if (filter === 'no-update') item.hidden = false; // TODO: wire to real data field
      });

      // Re-number aria-posinset / aria-setsize after filtering
      const visible = [...items].filter(i => !i.hidden);
      visible.forEach((item, idx) => {
        item.setAttribute('aria-posinset', idx + 1);
        item.setAttribute('aria-setsize',  visible.length);
      });

      feedList.setAttribute('aria-busy', 'false');
    });
  });
}

// Kick everything off
loadFeed();