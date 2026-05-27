/**
 * tatOS — main.js
 *
 * Three responsibilities:
 *  1. Theme switching (light / dark)
 *  2. Sidebar hamburger drawer and app views
 *  3. Feed rendering via <template> + backend data
 *  4. Standup form preview
 *  5. Shared availability planner
 *     (swap mockFetch for a real fetch('/api/standups') when your backend is ready)
 */

/* global localStorage */

/* ══════════════════════════════════════════════════════════
   1. THEME SWITCHER
   ══════════════════════════════════════════════════════════ */

const THEMES = ['light', 'dark']
const themeBtn = document.getElementById('theme-toggle')

// Labels describe the theme you'll switch TO (not the current one)
const NEXT_LABEL = {
  light: 'Switch to dark theme',
  dark: 'Switch to light theme'
}

/**
 * Reads the active page theme.
 * @returns {string} Current theme name.
 */
function currentTheme () {
  return document.documentElement.getAttribute('data-theme') || 'light'
}

/**
 * Applies a theme and updates the theme toggle label.
 * @param {string} theme Theme name to apply.
 * @returns {void}
 */
function applyTheme (theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
  if (themeBtn) {
    themeBtn.setAttribute('aria-label', NEXT_LABEL[theme])
  }
}

themeBtn?.addEventListener('click', () => {
  const next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]
  applyTheme(next)
})

// Sync button label on load (theme itself is set by the inline <script> in <head>)
if (themeBtn) themeBtn.setAttribute('aria-label', NEXT_LABEL[currentTheme()])

/* ══════════════════════════════════════════════════════════
   2. SIDEBAR / HAMBURGER DRAWER
   ══════════════════════════════════════════════════════════ */

const toggleBtn = document.getElementById('sidebar-toggle')
const sidebar = document.getElementById('sidebar')
const overlay = document.getElementById('sidebar-overlay')
const sidebarLinks = document.querySelectorAll('.sidebar_link')
const viewPanels = document.querySelectorAll('[data-view-panel]')
const openViewButtons = document.querySelectorAll('[data-open-view]')
const repoPulseGrid = document.getElementById('repo-pulse-grid')
const issueList = document.getElementById('issue-list')
const workflowList = document.getElementById('workflow-list')
const summaryBody = document.getElementById('summary-body')
const summaryHighlights = document.getElementById('summary-highlights')
const summaryBlockers = document.getElementById('summary-blockers')
const summaryActions = document.getElementById('summary-actions')
const meetingBrief = document.getElementById('meeting-brief')
const healthMetrics = document.getElementById('health-metrics')
const deadlineRiskList = document.getElementById('deadline-risk-list')
const workflowTrend = document.getElementById('workflow-trend')
const issueDistribution = document.getElementById('issue-distribution')
const teamFeedMeta = document.getElementById('team-feed-meta')
const currentUserSelect = document.getElementById('current-user-select')
const meetingUserSelect = document.getElementById('meeting-user-select')
const topbarProfileInitial = document.querySelector('.topbar_pfp span')
const statCheckinsValue = document.getElementById('stat-checkins-value')
const statBlockersValue = document.getElementById('stat-blockers-value')
const statAvailabilityValue = document.getElementById('stat-availability-value')
const meetingStatus = document.getElementById('meeting-status')

const API_BASE = '/api'
const DEFAULT_TEAM_ID = 'team-demo'
const APP_STORAGE_CURRENT_USER_KEY = 'tatosCurrentUserId'

const appState = {
  teamId: DEFAULT_TEAM_ID,
  team: null,
  members: [],
  currentUserId: '',
  standups: [],
  selectedFeedDate: '',
  availabilityWeekStart: '',
  availabilityRows: [],
  overlapSlots: [],
  dashboard: {
    repoPulse: null,
    issues: [],
    workflows: [],
    summary: null,
    sprintHealth: null
  }
}

let filtersWired = false

/**
 * Opens the mobile sidebar drawer.
 * @returns {void}
 */
function openSidebar () {
  sidebar.classList.add('is-open')
  overlay.classList.add('is-visible')
  overlay.setAttribute('aria-hidden', 'false')
  toggleBtn.setAttribute('aria-expanded', 'true')
  toggleBtn.setAttribute('aria-label', 'Close navigation menu')
}

/**
 * Closes the mobile sidebar drawer.
 * @returns {void}
 */
function closeSidebar () {
  sidebar.classList.remove('is-open')
  overlay.classList.remove('is-visible')
  overlay.setAttribute('aria-hidden', 'true')
  toggleBtn.setAttribute('aria-expanded', 'false')
  toggleBtn.setAttribute('aria-label', 'Open navigation menu')
}

toggleBtn?.addEventListener('click', () => {
  sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar()
})
overlay?.addEventListener('click', closeSidebar)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
    closeSidebar()
    toggleBtn.focus()
  }
})

/**
 * Activates a sidebar view and hides the other view panels.
 * @param {string} viewName View identifier from the sidebar link.
 * @returns {void}
 */
function setActiveView (viewName) {
  sidebarLinks.forEach(link => {
    const isActive = link.dataset.view === viewName
    link.classList.toggle('sidebar_link--active', isActive)

    if (isActive) {
      link.setAttribute('aria-current', 'page')
    } else {
      link.removeAttribute('aria-current')
    }
  })

  viewPanels.forEach(panel => {
    const isActive = panel.dataset.viewPanel === viewName
    panel.classList.toggle('app-view--active', isActive)
    panel.setAttribute('aria-hidden', String(!isActive))
  })

  if (window.innerWidth <= 680 && sidebar.classList.contains('is-open')) {
    closeSidebar()
  }
}

sidebarLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault()
    setActiveView(link.dataset.view)
  })
})

openViewButtons.forEach(button => {
  button.addEventListener('click', () => {
    setActiveView(button.dataset.openView)
  })
})

/* ══════════════════════════════════════════════════════════
   3. FEED — TEMPLATE RENDERING + BACKEND DATA
   ══════════════════════════════════════════════════════════ */

/**
 * Calls the Worker JSON API and surfaces backend error messages.
 * @param {string} path API path beginning with a slash.
 * @param {RequestInit} [options] Fetch options.
 * @returns {Promise<object>} Parsed JSON response.
 */
async function apiRequest (path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with HTTP ${response.status}`)
  }

  return payload
}

/**
 * Formats a date as YYYY-MM-DD in local time.
 * @param {Date} date Date to format.
 * @returns {string} Local date string.
 */
function formatDateYmd (date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns today's local date as YYYY-MM-DD.
 * @returns {string} Today's local date.
 */
function getTodayYmd () {
  return formatDateYmd(new Date())
}

/**
 * Returns the Monday for the week that contains the supplied date.
 * @param {Date} date Reference date.
 * @returns {string} Week start date in YYYY-MM-DD.
 */
function getWeekStartYmd (date) {
  const copy = new Date(date)
  const day = copy.getDay()
  const delta = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + delta)
  return formatDateYmd(copy)
}

/**
 * Formats a YYYY-MM-DD date for UI display.
 * @param {string} ymd Date string.
 * @returns {string} Human-readable date label.
 */
function formatLongDate (ymd) {
  if (!ymd) return 'No date selected'

  return new Date(`${ymd}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Formats a backend timestamp as a relative label.
 * @param {string} timestamp Backend timestamp string.
 * @returns {{label: string, longLabel: string, datetime: string}} Relative display metadata.
 */
function formatRelativeTime (timestamp) {
  if (!timestamp) {
    return {
      label: 'just now',
      longLabel: 'just now',
      datetime: new Date().toISOString()
    }
  }

  const normalizedTimestamp = timestamp.includes('T') ? timestamp : `${timestamp.replace(' ', 'T')}Z`
  const then = new Date(normalizedTimestamp)
  const diffMs = Date.now() - then.getTime()
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000))

  if (diffMinutes < 1) {
    return {
      label: 'just now',
      longLabel: 'just now',
      datetime: then.toISOString()
    }
  }

  if (diffMinutes < 60) {
    return {
      label: `${diffMinutes}m ago`,
      longLabel: `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`,
      datetime: then.toISOString()
    }
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return {
      label: `${diffHours}h ago`,
      longLabel: `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`,
      datetime: then.toISOString()
    }
  }

  const diffDays = Math.round(diffHours / 24)
  return {
    label: `${diffDays}d ago`,
    longLabel: `${diffDays} day${diffDays === 1 ? '' : 's'} ago`,
    datetime: then.toISOString()
  }
}

/**
 * Converts API availability values into UI labels.
 * @param {string} availability Availability value.
 * @returns {string} Human-readable label.
 */
function humanizeAvailability (availability) {
  if (!availability) return 'Available'
  return availability.charAt(0).toUpperCase() + availability.slice(1)
}

/**
 * Persists the current team member selection.
 * @param {string} userId Team member id.
 * @returns {void}
 */
function persistCurrentUserId (userId) {
  localStorage.setItem(APP_STORAGE_CURRENT_USER_KEY, userId)
}

/**
 * Restores the previously selected team member id.
 * @returns {string} Stored user id, if any.
 */
function restoreCurrentUserId () {
  return localStorage.getItem(APP_STORAGE_CURRENT_USER_KEY) || ''
}

/**
 * Returns only active members from the loaded team response.
 * @returns {object[]} Active team members.
 */
function getActiveMembers () {
  return appState.members.filter(member => member.isActive !== false)
}

/**
 * Looks up a team member by id.
 * @param {string} userId Team member id.
 * @returns {object|undefined} Matching member, if found.
 */
function getMemberById (userId) {
  return getActiveMembers().find(member => member.id === userId)
}

/**
 * Keeps the standup and meeting selectors in sync.
 * @returns {void}
 */
function syncUserSelects () {
  if (currentUserSelect) currentUserSelect.value = appState.currentUserId
  if (meetingUserSelect) meetingUserSelect.value = appState.currentUserId
}

/**
 * Populates the current-user selectors from team data.
 * @returns {void}
 */
function renderCurrentUserOptions () {
  const activeMembers = getActiveMembers()
  const optionMarkup = activeMembers.map(member => {
    return `<option value="${member.id}">${member.displayName}</option>`
  }).join('')

  if (currentUserSelect) currentUserSelect.innerHTML = optionMarkup
  if (meetingUserSelect) meetingUserSelect.innerHTML = optionMarkup
  syncUserSelects()
}

/**
 * Updates profile chrome tied to the selected member.
 * @returns {void}
 */
function updateCurrentUserUI () {
  const member = getMemberById(appState.currentUserId)
  if (!member) return

  if (topbarProfileInitial) {
    topbarProfileInitial.textContent = member.initials || member.displayName.slice(0, 1).toUpperCase()
  }

  syncUserSelects()
}

/**
 * Finds a standup for one user on one date.
 * @param {string} userId Team member id.
 * @param {string} standupDate YYYY-MM-DD standup date.
 * @returns {object|undefined} Matching standup, if any.
 */
function findStandupForUserDate (userId, standupDate) {
  return appState.standups.find(standup => standup.userId === userId && standup.standupDate === standupDate)
}

/**
 * Applies a saved standup to the standup form.
 * @param {object|undefined} standup Existing standup entry.
 * @returns {void}
 */
function applyStandupToForm (standup) {
  if (!standupForm) return

  standupForm.elements.yesterday.value = standup?.yesterday || ''
  standupForm.elements.today.value = standup?.today || ''
  standupForm.elements.blocker.value = standup?.blocker || ''
  standupForm.elements.availability.value = standup?.availability || 'available'
  standupForm.elements.includeGithub.checked = standup?.includeGithub ?? true
  standupForm.elements.notifyLead.checked = standup?.notifyLead ?? false
  renderStandupPreview()
}

/**
 * Updates the team feed header with live team/date information.
 * @returns {void}
 */
function updateTeamFeedMeta () {
  if (!teamFeedMeta) return

  const sprintName = appState.team?.sprintName || 'Current sprint'
  const teamName = appState.team?.name || 'Team'
  const formattedDate = formatLongDate(appState.selectedFeedDate)
  teamFeedMeta.innerHTML = `${sprintName} · ${teamName} · <time datetime="${appState.selectedFeedDate}">${formattedDate}</time>`
}

/**
 * Maps a backend standup row into the existing feed renderer shape.
 * @param {object} standup Backend standup object.
 * @returns {object} Feed view model.
 */
function mapStandupToFeedPerson (standup) {
  const relative = formatRelativeTime(standup.submittedAt || standup.updatedAt)

  return {
    id: standup.avatarColorKey || standup.initials?.toLowerCase() || standup.userId,
    name: standup.name || 'Unknown teammate',
    initials: standup.initials || '??',
    status: standup.status || 'available',
    badgeLabel: standup.badgeLabel,
    badgeType: standup.badgeType,
    timeAgo: relative.label,
    timeAgoLong: relative.longLabel,
    datetime: relative.datetime,
    today: standup.today || 'No update provided.',
    yesterday: standup.yesterday,
    isBlocker: Boolean(standup.isBlocker)
  }
}

/**
 * Fetches standups for the current team.
 * @returns {Promise<object[]>} Standup rows from the backend.
 */
async function fetchStandups () {
  const params = new URLSearchParams({ teamId: appState.teamId })
  const payload = await apiRequest(`/standups?${params.toString()}`)
  return payload.standups || []
}

/**
 * Fetches aggregated dashboard data for the current team and feed date.
 * @param {string} date YYYY-MM-DD feed date.
 * @returns {Promise<object>} Dashboard payload.
 */
async function fetchDashboardData (date) {
  const params = new URLSearchParams({ teamId: appState.teamId, date })
  return apiRequest(`/dashboard?${params.toString()}`)
}

/**
 * Loads dashboard state used by repo pulse, issues, workflows, AI summary, and sprint health.
 * @param {string} date YYYY-MM-DD feed date.
 * @returns {Promise<void>} Resolves after dashboard state is updated.
 */
async function loadDashboardData (date) {
  const payload = await fetchDashboardData(date)
  appState.dashboard = {
    repoPulse: payload.repoPulse || null,
    issues: payload.issues || [],
    workflows: payload.workflows || [],
    summary: payload.summary || null,
    sprintHealth: payload.sprintHealth || null
  }
}

/**
 * Clones the <template>, fills in one person's data, returns the <article>.
 * This function never touches the HTML — all structure lives in the template.
 * @param {object} person Standup entry to render.
 * @param {number} index Zero-based position in the feed.
 * @param {number} total Total number of feed entries.
 * @returns {object} Rendered feed item article.
 */
function renderFeedItem (person, index, total) {
  const template = document.getElementById('feed-item-template')
  const clone = template.content.cloneNode(true)
  const article = clone.querySelector('article')

  // ARIA position attributes
  article.dataset.status = person.status || 'available'
  article.dataset.hasYesterday = String(Boolean(person.yesterday))
  article.setAttribute('aria-labelledby', `entry-name-${person.id}`)
  article.setAttribute('aria-posinset', index + 1)
  article.setAttribute('aria-setsize', total)

  // Avatar
  const avatar = article.querySelector('.feed-item_avatar')
  avatar.textContent = person.initials
  avatar.classList.add(`feed-item_avatar--${person.id}`)

  // Name
  const nameEl = article.querySelector('.feed-item_name')
  nameEl.id = `entry-name-${person.id}`
  nameEl.textContent = person.name

  // Badge — remove the element entirely if this person has no badge
  const badge = article.querySelector('.badge')
  if (person.badgeType) {
    badge.textContent = person.badgeLabel
    badge.classList.add(`badge--${person.badgeType}`)
    badge.setAttribute('aria-label', `Status: ${person.badgeLabel}`)
  } else {
    badge.remove()
  }

  // Timestamp
  const timeEl = article.querySelector('.feed-item_time')
  timeEl.textContent = person.timeAgo
  timeEl.setAttribute('datetime', person.datetime)
  timeEl.setAttribute('aria-label', person.timeAgoLong)

  // Today entry
  const todayEl = article.querySelector('.entry-today')
  if (person.isBlocker) {
    todayEl.classList.add('feed-item_entry--blocker')
    todayEl.innerHTML = `<strong>BLOCKER</strong> — ${person.today.replace(/^BLOCKER\s*—\s*/i, '')}`
  } else {
    todayEl.innerHTML = `<strong>TODAY</strong> — ${person.today}`
  }

  // Yesterday entry — remove if null
  const yestEl = article.querySelector('.entry-yesterday')
  if (person.yesterday) {
    yestEl.innerHTML = `<strong>YESTERDAY</strong> — ${person.yesterday}`
  } else {
    yestEl.remove()
  }

  return article
}

/**
 * Main load function — fetches data, renders items, wires up filters.
 * When no preferred date is supplied, the newest standup date becomes the feed date.
 * @param {string} [preferredDate] Preferred YYYY-MM-DD date to keep selected.
 * @returns {Promise<void>} Resolves after the feed finishes rendering.
 */
async function loadFeed (preferredDate) {
  const feedList = document.getElementById('feed-list')

  try {
    appState.standups = await fetchStandups()

    const dates = [...new Set(appState.standups.map(standup => standup.standupDate).filter(Boolean))].sort((left, right) => {
      return right.localeCompare(left)
    })

    appState.selectedFeedDate = preferredDate || dates[0] || getTodayYmd()
    try {
      await loadDashboardData(appState.selectedFeedDate)
    } catch (dashboardError) {
      appState.dashboard = {
        repoPulse: null,
        issues: [],
        workflows: [],
        summary: null,
        sprintHealth: null
      }
      console.error('Dashboard load failed:', dashboardError)
    }

    const filteredStandups = appState.standups
      .filter(standup => standup.standupDate === appState.selectedFeedDate)
      .map(mapStandupToFeedPerson)

    feedList.innerHTML = '' // clear loading message

    if (!filteredStandups.length) {
      feedList.innerHTML = '<p class="feed-loading">No standups have been submitted for this day yet.</p>'
    }

    filteredStandups.forEach((person, i) => {
      feedList.appendChild(renderFeedItem(person, i, filteredStandups.length))
    })

    updateTeamFeedMeta()
  renderFrontendSurfaces()

    feedList.setAttribute('aria-busy', 'false')
    if (!filtersWired) {
      wireUpFilters()
      filtersWired = true
    }
  } catch (err) {
    feedList.innerHTML = '<p class="feed-error" role="alert">Could not load standup entries. Please refresh.</p>'
    feedList.setAttribute('aria-busy', 'false')
    console.error('Feed load failed:', err)
  }
}

/**
 * Loads the current team and initializes the selected member.
 * @returns {Promise<void>} Resolves after team state is ready.
 */
async function loadTeamData () {
  const payload = await apiRequest(`/team?teamId=${appState.teamId}`)
  appState.team = payload.team || null
  appState.members = payload.members || []

  const storedUserId = restoreCurrentUserId()
  const activeMembers = getActiveMembers()
  appState.currentUserId = activeMembers.some(member => member.id === storedUserId)
    ? storedUserId
    : activeMembers[0]?.id || ''

  renderCurrentUserOptions()
  updateCurrentUserUI()
}

/**
 * Applies current-user dependent UI after member selection changes.
 * @returns {Promise<void>} Resolves after dependent views are refreshed.
 */
async function syncSelectedUserData () {
  updateCurrentUserUI()
  persistCurrentUserId(appState.currentUserId)
  applyStandupToForm(findStandupForUserDate(appState.currentUserId, getTodayYmd()))
  await loadAvailabilityData()
}

/* ══════════════════════════════════════════════════════════
   4. STANDUP FORM — LOCAL PREVIEW + SAVE FEEDBACK
   ══════════════════════════════════════════════════════════ */

const standupForm = document.getElementById('standup-form')
const standupPreview = document.getElementById('standup-preview')
const standupStatus = document.getElementById('standup-status')
const meetingGrid = document.getElementById('meeting-grid')
const meetingRoster = document.getElementById('meeting-roster')
const meetingOverlapList = document.getElementById('meeting-overlap-list')

const MEETING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MEETING_DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const MEETING_SLOTS = Array.from({ length: 17 }, (_, index) => {
  const hour = index + 6
  const normalizedHour = ((hour + 11) % 12) + 1
  const period = hour < 12 ? 'AM' : 'PM'
  return `${normalizedHour} ${period}`
})
let myMeetingAvailability = {}

/**
 * Reads a form field with a fallback value.
 * @param {FormData} formData Submitted form data.
 * @param {string} fieldName Field name to read.
 * @param {string} fallback Value to use when the field is empty.
 * @returns {string} Trimmed field value or fallback.
 */
function readField (formData, fieldName, fallback) {
  const value = formData.get(fieldName)
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

/**
 * Builds the storage key for a meeting availability cell.
 * @param {number} dayIndex Zero-based meeting day index.
 * @param {number} slotIndex Zero-based meeting slot index.
 * @returns {string} Availability cell key.
 */
function slotKey (dayIndex, slotIndex) {
  return `${dayIndex}-${slotIndex}`
}

/**
 * Groups availability rows for the selected user into a grid lookup.
 * @param {object[]} rows Backend availability rows.
 * @param {string} userId Team member id.
 * @returns {object} Availability keyed by day-slot.
 */
function buildAvailabilityLookup (rows, userId) {
  return Object.fromEntries(
    rows
      .filter(row => row.userId === userId && row.dayIndex < MEETING_DAYS.length && row.slotIndex < MEETING_SLOTS.length)
      .map(row => [slotKey(row.dayIndex, row.slotIndex), row.status])
  )
}

/**
 * Builds a quick lookup for overlap rows.
 * @returns {Map<string, object>} Overlap rows keyed by day-slot.
 */
function getOverlapMap () {
  return new Map(appState.overlapSlots.map(slot => [slotKey(slot.dayIndex, slot.slotIndex), slot]))
}

/**
 * Converts current availability selections into the API payload format.
 * @returns {object[]} Availability rows to upsert.
 */
function getAvailabilityPayloadSlots () {
  return Object.entries(myMeetingAvailability).map(([key, status]) => {
    const [dayIndex, slotIndex] = key.split('-').map(Number)
    return {
      dayIndex,
      slotIndex,
      slotLabel: MEETING_SLOTS[slotIndex],
      status
    }
  })
}

/**
 * Converts an availability status into a numeric overlap weight.
 * @param {string} status Availability status.
 * @returns {number} Numeric weight for overlap scoring.
 */
function getAvailabilityWeight (status) {
  if (status === 'available') return 1
  if (status === 'maybe') return 0.5
  return 0
}

/**
 * Calculates the team overlap score for a meeting cell.
 * @param {number} dayIndex Zero-based meeting day index.
 * @param {number} slotIndex Zero-based meeting slot index.
 * @returns {number} Combined overlap score.
 */
function getOverlapScore (dayIndex, slotIndex) {
  const overlap = getOverlapMap().get(slotKey(dayIndex, slotIndex))
  return overlap?.score || 0
}

/**
 * Maps an overlap score to a visual bucket.
 * @param {number} score Combined overlap score.
 * @returns {number} Bucket number used by heat map styles.
 */
function getOverlapBucket (score) {
  if (score >= 5) return 6
  if (score >= 4) return 5
  if (score >= 3) return 4
  if (score >= 2) return 3
  if (score >= 1) return 2
  return 1
}

/**
 * Counts the current user's saved availability statuses.
 * @returns {object} Availability counts by status.
 */
function getMyAvailabilitySummary () {
  const counts = { available: 0, maybe: 0, busy: 0 }

  Object.values(myMeetingAvailability).forEach(status => {
    if (status === 'available') counts.available += 1
    else if (status === 'maybe') counts.maybe += 1
  })

  counts.busy = (MEETING_DAYS.length * MEETING_SLOTS.length) - counts.available - counts.maybe
  return counts
}

/**
 * Loads weekly availability and overlap from the backend.
 * @returns {Promise<void>} Resolves after state and UI refresh.
 */
async function loadAvailabilityData () {
  if (!appState.currentUserId) return

  if (meetingStatus) {
    meetingStatus.textContent = `Loading availability for ${formatLongDate(appState.availabilityWeekStart)} week…`
  }

  const params = new URLSearchParams({
    teamId: appState.teamId,
    weekStart: appState.availabilityWeekStart
  })

  const [availabilityPayload, overlapPayload] = await Promise.all([
    apiRequest(`/availability?${params.toString()}`),
    apiRequest(`/availability/overlap?${params.toString()}`)
  ])

  appState.availabilityRows = availabilityPayload.slots || []
  appState.overlapSlots = overlapPayload.overlap || []
  myMeetingAvailability = buildAvailabilityLookup(appState.availabilityRows, appState.currentUserId)

  if (meetingStatus) {
    meetingStatus.textContent = `Availability synced for the week of ${formatLongDate(appState.availabilityWeekStart)}.`
  }

  renderMeetingPlanner()
}

/**
 * Saves the selected member's availability back to the backend.
 * @returns {Promise<void>} Resolves after the save and reload complete.
 */
async function saveMeetingAvailability () {
  if (!appState.currentUserId) return

  if (meetingStatus) {
    meetingStatus.textContent = 'Saving availability…'
  }

  await apiRequest('/availability/me', {
    method: 'PUT',
    body: JSON.stringify({
      teamId: appState.teamId,
      userId: appState.currentUserId,
      weekStart: appState.availabilityWeekStart,
      slots: getAvailabilityPayloadSlots()
    })
  })

  await loadAvailabilityData()
}

/**
 * Finds the next status when a meeting cell is toggled.
 * @param {string} currentStatus Current cell status.
 * @param {boolean} hasSavedStatus Whether the cell has an explicit saved value.
 * @returns {string} Next cell status.
 */
function getNextMeetingStatus (currentStatus, hasSavedStatus) {
  if (!hasSavedStatus) return 'available'
  if (currentStatus === 'available') return 'busy'
  if (currentStatus === 'busy') return 'maybe'
  return 'available'
}

/**
 * Renders the highest-scoring meeting slots.
 * @returns {void}
 */
function renderMeetingOverlap () {
  if (!meetingOverlapList) return

  meetingOverlapList.innerHTML = ''

  appState.overlapSlots.slice(0, 5).forEach(slot => {
    const item = document.createElement('li')
    item.className = 'meeting-overlap-item'
    item.innerHTML = `
      <div>
        <strong>${MEETING_DAY_LABELS[slot.dayIndex]} · ${slot.slotLabel}</strong>
        <p>${slot.availableCount}/${slot.totalMembers} available · ${slot.maybeCount} maybe</p>
      </div>
      <span class="meeting-overlap-score">${slot.score.toFixed(slot.score % 1 === 0 ? 0 : 1)}</span>
    `
    meetingOverlapList.appendChild(item)
  })

  if (!appState.overlapSlots.length) {
    meetingOverlapList.innerHTML = '<li class="meeting-overlap-item">No saved availability yet for this week.</li>'
  }
}

/**
 * Renders teammate availability summaries.
 * @returns {void}
 */
function renderMeetingRoster () {
  if (!meetingRoster) return

  meetingRoster.innerHTML = ''

  getActiveMembers().forEach(member => {
    const memberRows = appState.availabilityRows.filter(row => row.userId === member.id)
    const availableCount = memberRows.filter(row => row.status === 'available').length
    const maybeCount = memberRows.filter(row => row.status === 'maybe').length
    const isCurrentUser = member.id === appState.currentUserId
    const item = document.createElement('div')
    item.className = 'meeting-roster-item'
    item.innerHTML = `
      <div class="meeting-roster-avatar">${member.initials}</div>
      <div>
        <strong>${member.displayName}${isCurrentUser ? ' (You)' : ''}</strong>
        <p>${availableCount} available · ${maybeCount} maybe</p>
      </div>
    `
    meetingRoster.appendChild(item)
  })
}

/**
 * Renders the interactive meeting availability grid.
 * @returns {void}
 */
function renderMeetingGrid () {
  if (!meetingGrid) return

  const overlapMap = getOverlapMap()

  meetingGrid.innerHTML = ''

  const spacer = document.createElement('div')
  spacer.className = 'meeting-grid_corner'
  spacer.setAttribute('aria-hidden', 'true')
  meetingGrid.appendChild(spacer)

  MEETING_DAYS.forEach(day => {
    const header = document.createElement('div')
    header.className = 'meeting-grid_header'
    header.textContent = day
    meetingGrid.appendChild(header)
  })

  MEETING_SLOTS.forEach((slotLabel, slotIndex) => {
    const timeLabel = document.createElement('div')
    timeLabel.className = 'meeting-grid_time'
    timeLabel.textContent = slotLabel
    meetingGrid.appendChild(timeLabel)

    MEETING_DAYS.forEach((day, dayIndex) => {
      const key = slotKey(dayIndex, slotIndex)
      const myStatus = myMeetingAvailability[key] || 'busy'
      const score = getOverlapScore(dayIndex, slotIndex)
      const overlapBucket = getOverlapBucket(score)
      const overlap = overlapMap.get(key)
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'meeting-cell'
      button.dataset.dayIndex = String(dayIndex)
      button.dataset.slotIndex = String(slotIndex)
      button.dataset.selfStatus = myStatus
      button.dataset.overlap = String(overlapBucket)
      button.setAttribute(
        'aria-label',
        `${MEETING_DAY_LABELS[dayIndex]} ${slotLabel}. Your status: ${myStatus}. Team score: ${score.toFixed(score % 1 === 0 ? 0 : 1)}. ${overlap?.availableCount || 0} teammates available.`
      )
      button.innerHTML = `
        <span class="meeting-cell_status">${myStatus === 'busy' ? 'Busy' : myStatus === 'maybe' ? 'Maybe' : 'Free'}</span>
        <span class="meeting-cell_score">${score.toFixed(score % 1 === 0 ? 0 : 1)}</span>
      `
      meetingGrid.appendChild(button)
    })
  })
}

/**
 * Renders all meeting planner surfaces.
 * @returns {void}
 */
function renderMeetingPlanner () {
  if (!meetingGrid) return
  renderMeetingGrid()
  renderMeetingOverlap()
  renderMeetingRoster()
}

meetingGrid?.addEventListener('click', async event => {
  const cell = event.target.closest('.meeting-cell')
  if (!cell) return

  const key = slotKey(Number(cell.dataset.dayIndex), Number(cell.dataset.slotIndex))
  const hasSavedStatus = Object.prototype.hasOwnProperty.call(myMeetingAvailability, key)
  const currentStatus = hasSavedStatus ? myMeetingAvailability[key] : 'busy'
  myMeetingAvailability[key] = getNextMeetingStatus(currentStatus, hasSavedStatus)
  renderMeetingPlanner()

  try {
    await saveMeetingAvailability()
  } catch (error) {
    console.error('Availability save failed:', error)
    if (meetingStatus) {
      meetingStatus.textContent = `Could not save availability: ${error.message}`
    }
    await loadAvailabilityData().catch(() => {})
  }
})

/**
 * Renders the local standup preview from the form values.
 * @returns {void}
 */
function renderStandupPreview () {
  if (!standupForm || !standupPreview) return

  const formData = new FormData(standupForm)
  const githubText = formData.get('includeGithub')
    ? 'GitHub activity will be attached.'
    : 'GitHub activity is not attached.'

  standupPreview.innerHTML = `
    <p><strong>Yesterday:</strong> ${readField(formData, 'yesterday', 'No update yet.')}</p>
    <p><strong>Today:</strong> ${readField(formData, 'today', 'No update yet.')}</p>
    <p><strong>Blocker:</strong> ${readField(formData, 'blocker', 'None.')}</p>
    <p><strong>Availability:</strong> ${humanizeAvailability(readField(formData, 'availability', 'available'))}</p>
    <p><strong>GitHub:</strong> ${githubText}</p>
  `
}

/**
 * Renders repository summary metric cards.
 * @returns {void}
 */
function renderRepoPulse () {
  if (!repoPulseGrid) return

  const repoPulse = appState.dashboard.repoPulse
  const activeMembers = repoPulse?.activeMembers || getActiveMembers().length

  const metrics = [
    { label: 'Open issues', value: repoPulse?.openIssues ?? 0, tone: 'neutral' },
    { label: 'Blocked updates', value: repoPulse?.blockedUpdates ?? 0, tone: 'warning' },
    { label: 'Failing workflows', value: repoPulse?.failingWorkflows ?? 0, tone: (repoPulse?.failingWorkflows ?? 0) ? 'danger' : 'success' },
    { label: 'Due in 48h', value: repoPulse?.dueSoon ?? 0, tone: (repoPulse?.dueSoon ?? 0) ? 'warning' : 'success' }
  ]

  repoPulseGrid.innerHTML = ''

  metrics.forEach(metric => {
    const card = document.createElement('article')
    card.className = `pulse-card pulse-card--${metric.tone}`
    card.innerHTML = `
      <span class="pulse-card_value">${metric.value}</span>
      <span class="pulse-card_label">${metric.label}</span>
    `
    repoPulseGrid.appendChild(card)
  })

  if (statCheckinsValue) {
    statCheckinsValue.innerHTML = `${repoPulse?.standupsFiled ?? 0}<span class="stat-card_denom">/${activeMembers || 0}</span>`
  }

  if (statBlockersValue) {
    statBlockersValue.textContent = String(repoPulse?.blockedUpdates ?? 0)
  }

  if (statAvailabilityValue) {
    statAvailabilityValue.textContent = String(repoPulse?.availableToday ?? 0)
  }
}

/**
 * Renders issue cards for the dashboard.
 * @returns {void}
 */
function renderIssueCards () {
  if (!issueList) return

  issueList.innerHTML = ''

  appState.dashboard.issues.forEach(issue => {
    const card = document.createElement('article')
    card.className = `issue-card issue-card--${issue.risk}`
    card.innerHTML = `
      <div class="issue-card_header">
        <div>
          <p class="issue-card_id">Issue #${issue.id}</p>
          <h3 class="issue-card_title">${issue.title}</h3>
        </div>
        <span class="issue-status issue-status--${issue.status.toLowerCase().replace(/\s+/g, '-')}">${issue.status}</span>
      </div>
      <div class="issue-meta-row">
        <span class="tag tag--difficulty">${issue.difficulty}</span>
        <span class="tag tag--deadline">Due ${issue.deadline}</span>
        <span class="tag tag--owner">${issue.owner}</span>
      </div>
      <div class="issue-label-row">
        ${issue.labels.map(label => `<span class="tag tag--ghost">${label}</span>`).join('')}
      </div>
    `
    issueList.appendChild(card)
  })

  if (!appState.dashboard.issues.length) {
    issueList.innerHTML = '<p class="feed-loading">No issue snapshots are available yet.</p>'
  }
}

/**
 * Renders workflow status cards for the dashboard.
 * @returns {void}
 */
function renderWorkflowCards () {
  if (!workflowList) return

  workflowList.innerHTML = ''

  appState.dashboard.workflows.forEach(workflow => {
    const card = document.createElement('article')
    card.className = `workflow-card workflow-card--${workflow.status}`
    card.innerHTML = `
      <div class="workflow-card_header">
        <div>
          <h3 class="workflow-card_title">${workflow.name}</h3>
          <p class="workflow-card_meta">${workflow.branch} · ${workflow.timeAgo}</p>
        </div>
        <span class="workflow-state workflow-state--${workflow.status}">${workflow.status}</span>
      </div>
      <div class="workflow-card_stats">
        <span>${workflow.duration}</span>
        <span>${workflow.passedTests} passing</span>
        <span>${workflow.failedTests} failing</span>
      </div>
    `
    workflowList.appendChild(card)
  })

  if (!appState.dashboard.workflows.length) {
    workflowList.innerHTML = '<p class="feed-loading">No workflow snapshots are available yet.</p>'
  }
}

/**
 * Renders the static AI summary dashboard section.
 * @returns {void}
 */
function renderAISummary () {
  const summary = appState.dashboard.summary

  if (summaryBody) {
    summaryBody.textContent = summary?.body || 'No AI summary is available yet.'
  }

  if (summaryHighlights) {
    const cards = summary?.highlights || []

    summaryHighlights.innerHTML = ''
    cards.forEach(cardData => {
      const card = document.createElement('div')
      card.className = 'summary-highlight'
      card.innerHTML = `
        <span class="summary-highlight_value">${cardData.value}</span>
        <span class="summary-highlight_label">${cardData.label}</span>
      `
      summaryHighlights.appendChild(card)
    })
  }

  if (summaryBlockers) {
    const blockers = summary?.blockers || ['No blockers are currently surfaced.']

    summaryBlockers.innerHTML = blockers.map(item => `<article class="priority-item priority-item--warning"><p>${item}</p></article>`).join('')
  }

  if (summaryActions) {
    const actions = summary?.actions || ['No recommended actions are available yet.']

    summaryActions.innerHTML = actions.map(item => `<article class="priority-item"><p>${item}</p></article>`).join('')
  }

  if (meetingBrief) {
    const brief = summary?.brief || []
    meetingBrief.innerHTML = brief.map(item => {
      return `<div class="brief-row"><span>${item.label}</span><strong>${item.value}</strong></div>`
    }).join('')
  }
}

/**
 * Renders sprint health metrics and risk lists.
 * @returns {void}
 */
function renderSprintHealth () {
  const sprintHealth = appState.dashboard.sprintHealth

  if (healthMetrics) {
    const metrics = sprintHealth?.metrics || []

    healthMetrics.innerHTML = ''
    metrics.forEach(metric => {
      const card = document.createElement('div')
      card.className = 'health-metric'
      card.innerHTML = `
        <span class="health-metric_value">${metric.value}</span>
        <span class="health-metric_label">${metric.label}</span>
      `
      healthMetrics.appendChild(card)
    })
  }

  if (deadlineRiskList) {
    const riskIssues = sprintHealth?.deadlineRisks || []
    deadlineRiskList.innerHTML = riskIssues.map(issue => `
      <article class="risk-item risk-item--${issue.risk}">
        <div>
          <strong>#${issue.id} ${issue.title}</strong>
          <p>${issue.owner} · ${issue.status} · Due ${issue.deadline}</p>
        </div>
        <span class="tag tag--deadline">${issue.difficulty}</span>
      </article>
    `).join('')

    if (!riskIssues.length) {
      deadlineRiskList.innerHTML = '<p class="feed-loading">No deadline risks are currently flagged.</p>'
    }
  }

  if (workflowTrend) {
    const workflows = sprintHealth?.workflowTrend || []
    workflowTrend.innerHTML = workflows.map(workflow => `
      <article class="trend-row trend-row--${workflow.status}">
        <div>
          <strong>${workflow.name}</strong>
          <p>${workflow.branch} · ${workflow.timeAgo} · ${workflow.duration}</p>
        </div>
        <div class="trend-stats">
          <span>${workflow.passedTests} pass</span>
          <span>${workflow.failedTests} fail</span>
        </div>
      </article>
    `).join('')

    if (!workflows.length) {
      workflowTrend.innerHTML = '<p class="feed-loading">No workflow trend data is available yet.</p>'
    }
  }

  if (issueDistribution) {
    const distribution = sprintHealth?.issueDistribution || []

    issueDistribution.innerHTML = distribution.map(item => `
      <div class="distribution-row">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </div>
    `).join('')

    if (!distribution.length) {
      issueDistribution.innerHTML = '<p class="feed-loading">No issue distribution data is available yet.</p>'
    }
  }
}

/**
 * Renders the dashboard support surfaces.
 * @returns {void}
 */
function renderFrontendSurfaces () {
  renderRepoPulse()
  renderIssueCards()
  renderWorkflowCards()
  renderAISummary()
  renderSprintHealth()
}

if (standupForm) {
  standupForm.addEventListener('input', renderStandupPreview)
  standupForm.addEventListener('change', renderStandupPreview)

  standupForm.addEventListener('submit', async event => {
    event.preventDefault()
    renderStandupPreview()

    const formData = new FormData(standupForm)
    const blockerText = readField(formData, 'blocker', '')

    if (!appState.currentUserId) {
      if (standupStatus) {
        standupStatus.textContent = 'Pick a team member before saving a standup.'
      }
      return
    }

    const standupDate = getTodayYmd()
    const existingStandup = findStandupForUserDate(appState.currentUserId, standupDate)
    const todayText = readField(formData, 'today', '')

    if (!todayText) {
      if (standupStatus) {
        standupStatus.textContent = 'Add what you are doing today before saving your standup.'
      }
      return
    }

    const payload = {
      teamId: appState.teamId,
      userId: appState.currentUserId,
      standupDate,
      yesterday: readField(formData, 'yesterday', ''),
      today: todayText,
      blocker: blockerText,
      availability: readField(formData, 'availability', 'available'),
      includeGithub: formData.get('includeGithub') === 'on',
      notifyLead: formData.get('notifyLead') === 'on'
    }

    if (standupStatus) {
      standupStatus.textContent = 'Saving standup…'
    }

    try {
      await apiRequest(existingStandup ? `/standups/${existingStandup.id}` : '/standups', {
        method: existingStandup ? 'PUT' : 'POST',
        body: JSON.stringify(existingStandup
          ? {
              yesterday: payload.yesterday,
              today: payload.today,
              blocker: payload.blocker,
              availability: payload.availability,
              includeGithub: payload.includeGithub,
              notifyLead: payload.notifyLead
            }
          : payload)
      })

      await loadFeed(standupDate)
      applyStandupToForm(findStandupForUserDate(appState.currentUserId, standupDate))

      if (standupStatus) {
        standupStatus.textContent = blockerText
          ? 'Standup saved. Blocker is now visible in the team feed.'
          : 'Standup saved to the backend and added to the team feed.'
      }
    } catch (error) {
      console.error('Standup save failed:', error)
      if (standupStatus) {
        standupStatus.textContent = `Could not save standup: ${error.message}`
      }
    }
  })

  renderStandupPreview()
}

renderFrontendSurfaces()

currentUserSelect?.addEventListener('change', async event => {
  appState.currentUserId = event.target.value
  await syncSelectedUserData()
})

meetingUserSelect?.addEventListener('change', async event => {
  appState.currentUserId = event.target.value
  await syncSelectedUserData()
})

/**
 * Filter bar — called after feed items are rendered.
 * @returns {void}
 */
function wireUpFilters () {
  const filterBtns = document.querySelectorAll('.filter-btn')
  const feedList = document.getElementById('feed-list')

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('filter-btn--active')
        b.setAttribute('aria-pressed', 'false')
      })
      btn.classList.add('filter-btn--active')
      btn.setAttribute('aria-pressed', 'true')

      feedList.setAttribute('aria-busy', 'true')

      const filter = btn.dataset.filter
      const items = feedList.querySelectorAll('.feed-item')

      items.forEach(item => {
        if (filter === 'all') item.hidden = false
        else if (filter === 'blocked') item.hidden = item.dataset.status !== 'blocked'
        else if (filter === 'no-update') item.hidden = item.dataset.hasYesterday !== 'false'
      })

      // Re-number aria-posinset / aria-setsize after filtering
      const visible = [...items].filter(i => !i.hidden)
      visible.forEach((item, idx) => {
        item.setAttribute('aria-posinset', idx + 1)
        item.setAttribute('aria-setsize', visible.length)
      })

      feedList.setAttribute('aria-busy', 'false')
    })
  })
}

/**
 * Initializes backend-backed frontend data.
 * @returns {Promise<void>} Resolves when the MVP surfaces are loaded.
 */
async function initializeApp () {
  try {
    appState.availabilityWeekStart = getWeekStartYmd(new Date())
    await loadTeamData()
    await loadFeed()
    await syncSelectedUserData()
  } catch (error) {
    console.error('App initialization failed:', error)

    if (standupStatus) {
      standupStatus.textContent = `Could not load backend data: ${error.message}`
    }

    if (meetingStatus) {
      meetingStatus.textContent = `Could not load availability: ${error.message}`
    }
  }
}

// Kick everything off
renderMeetingPlanner()
initializeApp()
