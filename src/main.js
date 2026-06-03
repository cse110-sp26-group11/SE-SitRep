/**
 * tatOS — main.js
 *
 * Responsibilities:
 *  1. GitHub OAuth authentication
 *  2. Theme switching (light / dark)
 *  3. Sidebar hamburger drawer and app views
 *  4. Feed rendering via <template> + backend data
 *  5. Standup form preview
 *  6. Shared availability planner
 *     (swap mockFetch for a real fetch('/api/standups') when your backend is ready)
 */

/* global localStorage */

/* ══════════════════════════════════════════════════════════
   1. GITHUB OAUTH AUTHENTICATION
   ══════════════════════════════════════════════════════════ */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8787/api'
  : '/api'
const CALLBACK_PATH = window.location.pathname.startsWith('/src/')
  ? '/src/callback.html'
  : '/callback.html'
const authToken = localStorage.getItem('github_token')
const loginView = document.getElementById('login-view')
const appShell = document.getElementById('app-shell')
const loginBtn = document.getElementById('github-login-btn')

if (!authToken) {
  if (loginView) {
    loginView.style.display = 'flex'
    loginView.style.flexDirection = 'column'
    loginView.style.alignItems = 'center'
    loginView.style.justifyContent = 'center'
    loginView.style.minHeight = '100vh'
    loginView.style.gap = '24px'
  }
  if (appShell) {
    appShell.style.display = 'none'
  }
} else {
  if (loginView) {
    loginView.style.display = 'none'
  }
  if (appShell) {
    appShell.style.display = 'block'
  }
}

/**
 * Fetches public app configuration from the Worker.
 * @returns {Promise<object>} Public configuration values.
 */
async function fetchAppConfig () {
  const response = await fetch(`${API_BASE}/config`)

  if (!response.ok) {
    throw new Error('Could not load app configuration')
  }

  return response.json()
}

loginBtn?.addEventListener('click', async e => {
  e.preventDefault()

  try {
    loginBtn.disabled = true
    const config = await fetchAppConfig()
    const redirectUri = `${window.location.origin}${CALLBACK_PATH}`
    const state = crypto.randomUUID()
    localStorage.setItem('github_oauth_state', state)
    const authUrl = 'https://github.com/login/oauth/authorize' +
      `?client_id=${config.githubClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`
    window.location.href = authUrl
  } catch (error) {
    console.error('GitHub login failed:', error)
    loginBtn.disabled = false
  }
})

/* ══════════════════════════════════════════════════════════
   2. THEME SWITCHER
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
   3. SIDEBAR / HAMBURGER DRAWER
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
const meetingDaysInput = document.getElementById('meeting-days-input')
const meetingStartTimeSelect = document.getElementById('meeting-start-time-select')
const meetingEndTimeSelect = document.getElementById('meeting-end-time-select')
const meetingTimeError = document.getElementById('meeting-time-error')
const teamList = document.getElementById('team-list')
const createTeamForm = document.getElementById('create-team-form')
const joinTeamForm = document.getElementById('join-team-form')
const teamStatus = document.getElementById('team-status')
const topbarProfileButton = document.getElementById('profile-menu-button')
const topbarProfileInitial = document.querySelector('.topbar_pfp span')
const profileMenu = document.getElementById('profile-menu')
const profileMenuName = document.getElementById('profile-menu-name')
const profileMenuMeta = document.getElementById('profile-menu-meta')
const profileLogoutButton = document.getElementById('profile-logout-btn')
const statCheckinsValue = document.getElementById('stat-checkins-value')
const statBlockersValue = document.getElementById('stat-blockers-value')
const statAvailabilityValue = document.getElementById('stat-availability-value')
const meetingStatus = document.getElementById('meeting-status')

const APP_STORAGE_CURRENT_USER_KEY = 'tatosCurrentUserId'
const APP_STORAGE_CURRENT_TEAM_KEY = 'tatosCurrentTeamId'
const APP_STORAGE_MEETING_DAYS_KEY = 'tatosMeetingDays'
const APP_STORAGE_MEETING_START_KEY = 'tatosMeetingStart'
const APP_STORAGE_MEETING_END_KEY = 'tatosMeetingEnd'

const appState = {
  teamId: localStorage.getItem(APP_STORAGE_CURRENT_TEAM_KEY) || '',
  team: null,
  teams: [],
  members: [],
  currentUserId: '',
  meetingViewerUserId: '',
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

function getSessionToken () {
  return localStorage.getItem('github_token') || ''
}

function clearAuthenticatedSession () {
  localStorage.removeItem('github_token')
  localStorage.removeItem('github_user')
  localStorage.removeItem('github_oauth_state')
  localStorage.removeItem(APP_STORAGE_CURRENT_USER_KEY)
  localStorage.removeItem(APP_STORAGE_CURRENT_TEAM_KEY)
}

function getAuthenticatedDisplayProfile () {
  const githubUser = getAuthenticatedGithubUser()
  const teamMember = getAuthenticatedTeamMember() || getMemberById(appState.currentUserId)
  const displayName = teamMember?.displayName || githubUser?.displayName || githubUser?.name || githubUser?.username || 'Signed-in user'
  const username = teamMember?.githubUsername || githubUser?.githubUsername || githubUser?.username || ''

  return {
    displayName,
    username,
    initials: teamMember?.initials || githubUser?.initials || displayName.slice(0, 1).toUpperCase()
  }
}

function updateProfileMenuUI () {
  const profile = getAuthenticatedDisplayProfile()

  if (topbarProfileInitial) {
    topbarProfileInitial.textContent = profile.initials
  }

  if (topbarProfileButton) {
    topbarProfileButton.setAttribute('aria-label', `Open settings menu for ${profile.displayName}`)
  }

  if (profileMenuName) {
    profileMenuName.textContent = profile.displayName
  }

  if (profileMenuMeta) {
    profileMenuMeta.textContent = profile.username ? `@${profile.username}` : 'GitHub account'
  }
}

function closeProfileMenu ({ returnFocus = false } = {}) {
  if (!profileMenu) return
  profileMenu.hidden = true
  topbarProfileButton?.setAttribute('aria-expanded', 'false')
  if (returnFocus) {
    topbarProfileButton?.focus()
  }
}

function toggleProfileMenu () {
  if (!profileMenu) return
  if (!profileMenu.hidden) {
    closeProfileMenu()
    return
  }

  updateProfileMenuUI()
  profileMenu.hidden = false
  topbarProfileButton?.setAttribute('aria-expanded', 'true')
}

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

  if (e.key === 'Escape' && profileMenu && !profileMenu.hidden) {
    closeProfileMenu({ returnFocus: true })
  }
})

topbarProfileButton?.addEventListener('click', event => {
  event.stopPropagation()
  toggleProfileMenu()
})

profileMenu?.addEventListener('click', event => {
  event.stopPropagation()
})

document.addEventListener('click', event => {
  if (!profileMenu || profileMenu.hidden) return

  if (!profileMenu.contains(event.target) && !topbarProfileButton?.contains(event.target)) {
    closeProfileMenu()
  }
})

profileLogoutButton?.addEventListener('click', () => {
  clearAuthenticatedSession()
  window.location.reload()
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
   4. FEED — TEMPLATE RENDERING + BACKEND DATA
   ══════════════════════════════════════════════════════════ */

/**
 * Calls the Worker JSON API and surfaces backend error messages.
 * @param {string} path API path beginning with a slash.
 * @param {object} [options] Fetch options.
 * @returns {Promise<object>} Parsed JSON response.
 */
async function apiRequest (path, options) {
  const sessionToken = getSessionToken()
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
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
 * Updates the Teams view status message.
 * @param {string} message Status text.
 * @returns {void}
 */
function setTeamStatus (message) {
  if (teamStatus) {
    teamStatus.textContent = message
  }
}

/**
 * Finds the signed-in GitHub user's app id.
 * @returns {string} App user id if available.
 */
function getAuthenticatedUserId () {
  return getAuthenticatedGithubUser()?.id || ''
}

/**
 * Loads teams for the signed-in user and selects an active team.
 * @returns {Promise<void>} Resolves after team memberships are loaded.
 */
async function loadUserTeams () {
  const userId = getAuthenticatedUserId()
  if (!userId) {
    appState.teams = []
    appState.teamId = ''
    renderTeamList()
    return
  }

  const payload = await apiRequest(`/teams?userId=${encodeURIComponent(userId)}`)
  appState.teams = payload.teams || []

  const storedTeamId = localStorage.getItem(APP_STORAGE_CURRENT_TEAM_KEY)
  const selectedTeam = appState.teams.find(team => team.id === storedTeamId) ||
    appState.teams.find(team => team.id === appState.teamId) ||
    appState.teams[0]

  appState.teamId = selectedTeam?.id || ''
  if (appState.teamId) {
    localStorage.setItem(APP_STORAGE_CURRENT_TEAM_KEY, appState.teamId)
  }

  renderTeamList()
}

/**
 * Renders the signed-in user's teams.
 * @returns {void}
 */
function renderTeamList () {
  if (!teamList) return

  teamList.innerHTML = ''

  if (!appState.teams.length) {
    const empty = document.createElement('p')
    empty.className = 'standup-status'
    empty.textContent = 'No teams yet. Create a team or join one with a team id.'
    teamList.appendChild(empty)
    return
  }

  appState.teams.forEach(team => {
    const row = document.createElement('article')
    row.className = `team-row${team.id === appState.teamId ? ' team-row--active' : ''}`

    const copy = document.createElement('div')
    const title = document.createElement('h3')
    title.className = 'team-row_title'
    title.textContent = team.name
    const meta = document.createElement('p')
    meta.className = 'team-row_meta'
    const repo = team.repoOwner && team.repoName ? `${team.repoOwner}/${team.repoName}` : 'No repo connected'
    meta.textContent = `${team.id} · ${team.role || 'member'} · ${repo}`
    copy.append(title, meta)

    const actions = document.createElement('div')
    actions.className = 'team-row_actions'

    const selectButton = document.createElement('button')
    selectButton.className = team.id === appState.teamId ? 'btn btn--primary' : 'btn'
    selectButton.type = 'button'
    selectButton.textContent = team.id === appState.teamId ? 'Active' : 'Use team'
    selectButton.addEventListener('click', async () => {
      await switchActiveTeam(team.id)
    })
    actions.appendChild(selectButton)

    const syncButton = document.createElement('button')
    syncButton.className = 'btn'
    syncButton.type = 'button'
    syncButton.textContent = 'Sync GitHub'
    syncButton.addEventListener('click', async () => {
      await syncGithubTeam(team.id)
    })
    actions.appendChild(syncButton)

    row.append(copy, actions)
    teamList.appendChild(row)
  })
}

/**
 * Switches the active dashboard team.
 * @param {string} teamId Team id.
 * @returns {Promise<void>} Resolves after dashboard data reloads.
 */
async function switchActiveTeam (teamId) {
  appState.teamId = teamId
  localStorage.setItem(APP_STORAGE_CURRENT_TEAM_KEY, teamId)
  renderTeamList()
  setTeamStatus('Loading team workspace...')

  await loadTeamData()
  await loadFeed()
  await syncSelectedUserData()
  setTeamStatus('Team workspace loaded.')
}

/**
 * Syncs GitHub contributors and issues for a team.
 * @param {string} teamId Team id.
 * @returns {Promise<void>} Resolves after sync and reload.
 */
async function syncGithubTeam (teamId) {
  const actingUserId = getAuthenticatedUserId()
  if (!actingUserId) return

  setTeamStatus('Syncing GitHub repository...')
  try {
    const result = await apiRequest(`/teams/${encodeURIComponent(teamId)}/sync-github`, {
      method: 'POST',
      body: JSON.stringify({ actingUserId })
    })
    await loadUserTeams()
    if (teamId === appState.teamId) {
      await loadTeamData()
      await loadFeed(appState.selectedFeedDate)
    }
    setTeamStatus(`Synced ${result.usersSynced} users and ${result.issuesSynced} issues from ${result.repo}.`)
  } catch (error) {
    setTeamStatus(`Could not sync GitHub: ${error.message}`)
  }
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
 * Reads the authenticated GitHub user saved by the OAuth callback.
 * @returns {object|null} Stored GitHub user profile, if valid.
 */
function getAuthenticatedGithubUser () {
  try {
    const storedUser = localStorage.getItem('github_user')
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

/**
 * Finds the team member linked to the authenticated GitHub account.
 * @returns {object|undefined} Matching active member, if present.
 */
function getAuthenticatedTeamMember () {
  const githubUser = getAuthenticatedGithubUser()
  if (!githubUser) return undefined

  const githubUsername = githubUser.githubUsername || githubUser.username
  return getActiveMembers().find(member => {
    return member.id === githubUser.id || member.githubUsername === githubUsername
  })
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
}

/**
 * Populates the current-user selectors from team data.
 * @returns {void}
 */
function renderCurrentUserOptions () {
  const activeMembers = getActiveMembers()
  const authenticatedMember = getAuthenticatedTeamMember()

  if (currentUserSelect) {
    if (authenticatedMember && activeMembers.some(member => member.id === authenticatedMember.id)) {
      currentUserSelect.innerHTML = `<option value="${authenticatedMember.id}">${authenticatedMember.displayName} (You)</option>`
    } else {
      currentUserSelect.innerHTML = '<option value="">Join this team to submit your own updates</option>'
    }
    currentUserSelect.disabled = true
  }

  syncUserSelects()
}

function syncStandupEditingState () {
  if (!standupForm) return

  const canEdit = Boolean(appState.currentUserId)
  ;[...standupForm.elements].forEach(element => {
    if (!element || !('disabled' in element)) return
    if (element === currentUserSelect) {
      element.disabled = true
      return
    }

    element.disabled = !canEdit
  })

  if (standupStatus && !canEdit) {
    standupStatus.textContent = 'Your GitHub account is not an active member of this team yet, so you can view updates but not submit one here.'
  }
}

function getMeetingViewerMember () {
  return getMemberById(appState.meetingViewerUserId)
}

/**
 * Updates profile chrome tied to the selected member.
 * @returns {void}
 */
function updateCurrentUserUI () {
  updateProfileMenuUI()
  syncUserSelects()
  syncStandupEditingState()
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

  const activeMembers = getActiveMembers()
  const authenticatedMember = getAuthenticatedTeamMember()
  appState.currentUserId = activeMembers.some(member => member.id === authenticatedMember?.id)
    ? authenticatedMember.id
    : ''
  appState.meetingViewerUserId = appState.currentUserId

  renderCurrentUserOptions()
  updateCurrentUserUI()
}

/**
 * Applies current-user dependent UI after member selection changes.
 * @returns {Promise<void>} Resolves after dependent views are refreshed.
 */
async function syncSelectedUserData () {
  appState.meetingViewerUserId = appState.currentUserId

  updateCurrentUserUI()
  persistCurrentUserId(appState.currentUserId)
  applyStandupToForm(findStandupForUserDate(appState.currentUserId, getTodayYmd()))
  await loadAvailabilityData()
}

/* ══════════════════════════════════════════════════════════
   5. STANDUP FORM — LOCAL PREVIEW + SAVE FEEDBACK
   ══════════════════════════════════════════════════════════ */

const standupForm = document.getElementById('standup-form')
const standupPreview = document.getElementById('standup-preview')
const standupStatus = document.getElementById('standup-status')
const meetingGrid = document.getElementById('meeting-grid')
const meetingRoster = document.getElementById('meeting-roster')
const meetingOverlapList = document.getElementById('meeting-overlap-list')

const ALL_MEETING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
let MEETING_DAYS = JSON.parse(localStorage.getItem(APP_STORAGE_MEETING_DAYS_KEY) || 'null') || ALL_MEETING_DAYS.slice(0, 5)
const MEETING_DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DEFAULT_MEETING_SLOTS = Array.from({ length: 17 }, (_, index) => {
  const hour = index + 6
  const normalizedHour = ((hour + 11) % 12) + 1
  const period = hour < 12 ? 'AM' : 'PM'
  return `${normalizedHour} ${period}`
})
let meetingStartIndex = Number(localStorage.getItem(APP_STORAGE_MEETING_START_KEY) || 0)
let meetingEndIndex = Number(localStorage.getItem(APP_STORAGE_MEETING_END_KEY) || DEFAULT_MEETING_SLOTS.length - 1)
let MEETING_SLOTS = DEFAULT_MEETING_SLOTS.slice(meetingStartIndex, meetingEndIndex + 1)
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

function setMeetingOptionsFromInput () {
  const days = [...meetingDaysInput.querySelectorAll('input:checked')].map(input => input.value)
  const selectedStartIndex = Number(meetingStartTimeSelect.value)
  const selectedEndIndex = Number(meetingEndTimeSelect.value)
  if (selectedStartIndex > selectedEndIndex) {
    meetingTimeError.hidden = false
    meetingGrid.closest('.meeting-grid-shell').hidden = true
    return
  }
  meetingTimeError.hidden = true
  meetingGrid.closest('.meeting-grid-shell').hidden = false
  meetingStartIndex = selectedStartIndex
  meetingEndIndex = selectedEndIndex
  MEETING_DAYS = days.length ? days : ALL_MEETING_DAYS.slice(0, 5)
  MEETING_SLOTS = DEFAULT_MEETING_SLOTS.slice(meetingStartIndex, meetingEndIndex + 1)
  localStorage.setItem(APP_STORAGE_MEETING_DAYS_KEY, JSON.stringify(MEETING_DAYS))
  localStorage.setItem(APP_STORAGE_MEETING_START_KEY, String(meetingStartIndex))
  localStorage.setItem(APP_STORAGE_MEETING_END_KEY, String(meetingEndIndex))
  renderMeetingPlanner()
}

function getMeetingDayIndex (day) {
  return ALL_MEETING_DAYS.indexOf(day)
}

function getMeetingSlotIndex (slot) {
  return DEFAULT_MEETING_SLOTS.indexOf(slot)
}

/**
 * Groups availability rows for the selected user into a grid lookup.
 * @param {object[]} rows Backend availability rows.
 * @param {string} userId Team member id.
 * @returns {object} Availability keyed by day-slot.
 */
function buildAvailabilityLookup (rows, userId) {
  const dayIndexes = MEETING_DAYS.map(getMeetingDayIndex)
  const slotIndexes = MEETING_SLOTS.map(getMeetingSlotIndex)
  return Object.fromEntries(
    rows
      .filter(row => row.userId === userId && dayIndexes.includes(row.dayIndex) && slotIndexes.includes(row.slotIndex))
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
      slotLabel: DEFAULT_MEETING_SLOTS[slotIndex],
      status
    }
  })
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
 * Loads weekly availability and overlap from the backend.
 * @returns {Promise<void>} Resolves after state and UI refresh.
 */
async function loadAvailabilityData () {
  if (!appState.teamId) return

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
  myMeetingAvailability = appState.currentUserId
    ? buildAvailabilityLookup(appState.availabilityRows, appState.currentUserId)
    : {}

  if (meetingStatus) {
    if (!appState.currentUserId) {
      meetingStatus.textContent = `Join this team to save availability for the week of ${formatLongDate(appState.availabilityWeekStart)}.`
    } else {
      meetingStatus.textContent = `Editing your availability for the week of ${formatLongDate(appState.availabilityWeekStart)}.`
    }
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
 * @returns {string} Next cell status.
 */
function getNextMeetingStatus (currentStatus) {
  if (currentStatus === 'available') return 'maybe'
  if (currentStatus === 'maybe') return 'busy'
  return 'available'
}

function getMeetingViewerAvailability () {
  if (!appState.meetingViewerUserId) return {}
  return buildAvailabilityLookup(appState.availabilityRows, appState.meetingViewerUserId)
}

function buildMeetingMemberStatusSummary (overlap) {
  const activeMembers = getActiveMembers()
  const membersById = new Map((overlap?.members || []).map(member => [member.id, member]))
  const yes = []
  const maybe = []
  const no = []

  activeMembers.forEach(member => {
    const status = membersById.get(member.id)?.status || 'busy'
    if (status === 'available') {
      yes.push(member.displayName)
    } else if (status === 'maybe') {
      maybe.push(member.displayName)
    } else {
      no.push(member.displayName)
    }
  })

  return [
    `Yes: ${yes.length ? yes.join(', ') : 'Nobody yet'}`,
    `Maybe: ${maybe.length ? maybe.join(', ') : 'Nobody yet'}`,
    `No: ${no.length ? no.join(', ') : 'Nobody yet'}`
  ].join('\n')
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
    item.title = buildMeetingMemberStatusSummary(slot)
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
    item.className = `meeting-roster-item${isCurrentUser ? ' meeting-roster-item--editor' : ''}`
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
  const viewerAvailability = getMeetingViewerAvailability()
  const viewerMember = getMeetingViewerMember()

  meetingGrid.innerHTML = ''
  meetingGrid.style.gridTemplateColumns = `minmax(72px, 90px) repeat(${MEETING_DAYS.length}, minmax(92px, 1fr))`

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

  MEETING_SLOTS.forEach(slotLabel => {
    const slotIndex = getMeetingSlotIndex(slotLabel)
    const timeLabel = document.createElement('div')
    timeLabel.className = 'meeting-grid_time'
    timeLabel.textContent = slotLabel
    meetingGrid.appendChild(timeLabel)

    MEETING_DAYS.forEach(day => {
      const dayIndex = getMeetingDayIndex(day)
      const key = slotKey(dayIndex, slotIndex)
      const myStatus = myMeetingAvailability[key] || 'busy'
      const viewerStatus = viewerAvailability[key] || 'busy'
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
      button.disabled = !appState.currentUserId
      button.title = buildMeetingMemberStatusSummary(overlap)
      button.setAttribute(
        'aria-label',
        `${MEETING_DAY_LABELS[dayIndex] || day} ${slotLabel}. ${viewerMember ? `${viewerMember.displayName}'s status` : 'Your status'}: ${viewerStatus}. Team score: ${score.toFixed(score % 1 === 0 ? 0 : 1)}. ${overlap?.availableCount || 0} teammates available.`
      )
      button.innerHTML = `
        <span class="meeting-cell_status">${viewerStatus === 'busy' ? 'Busy' : viewerStatus === 'maybe' ? 'Maybe' : 'Free'}</span>
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

function paintMeetingCell (cell, status) {
  const key = slotKey(Number(cell.dataset.dayIndex), Number(cell.dataset.slotIndex))
  myMeetingAvailability[key] = status
}

async function savePaintedMeetingAvailability () {
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
}

meetingGrid?.addEventListener('click', async event => {
  const cell = event.target.closest('.meeting-cell')
  if (!cell) return

  if (!appState.currentUserId) {
    if (meetingStatus) {
      meetingStatus.textContent = 'Join this team with your GitHub account before saving your own availability.'
    }
    return
  }

  const key = slotKey(Number(cell.dataset.dayIndex), Number(cell.dataset.slotIndex))
  paintMeetingCell(cell, getNextMeetingStatus(myMeetingAvailability[key] || 'busy'))
  await savePaintedMeetingAvailability()
})

meetingDaysInput.innerHTML = ALL_MEETING_DAYS.map(day => `
  <label class="meeting-day-option">
    <input type="checkbox" value="${day}" />
    <span>${day}</span>
  </label>
`).join('')
DEFAULT_MEETING_SLOTS.forEach((slot, index) => {
  const startOption = document.createElement('option')
  const endOption = document.createElement('option')
  startOption.value = endOption.value = String(index)
  startOption.textContent = endOption.textContent = slot
  startOption.selected = index === meetingStartIndex
  endOption.selected = index === meetingEndIndex
  meetingStartTimeSelect.add(startOption)
  meetingEndTimeSelect.add(endOption)
})
MEETING_DAYS.forEach(day => {
  const input = meetingDaysInput.querySelector(`input[value="${day}"]`)
  if (input) input.checked = true
})
meetingDaysInput?.addEventListener('change', setMeetingOptionsFromInput)
meetingStartTimeSelect?.addEventListener('change', setMeetingOptionsFromInput)
meetingEndTimeSelect?.addEventListener('change', setMeetingOptionsFromInput)

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
        standupStatus.textContent = 'Your GitHub account must be an active team member before you can save your own standup.'
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

createTeamForm?.addEventListener('submit', async event => {
  event.preventDefault()

  const currentUserId = getAuthenticatedUserId()
  if (!currentUserId) {
    setTeamStatus('Sign in with GitHub before creating a team.')
    return
  }

  const formData = new FormData(createTeamForm)
  const name = readField(formData, 'name', '')
  if (!name) {
    setTeamStatus('Add a team name before creating a team.')
    return
  }

  setTeamStatus('Creating team...')
  try {
    const payload = await apiRequest('/teams', {
      method: 'POST',
      body: JSON.stringify({
        name,
        repoOwner: readField(formData, 'repoOwner', ''),
        repoName: readField(formData, 'repoName', ''),
        sprintName: readField(formData, 'sprintName', ''),
        currentUserId
      })
    })

    createTeamForm.reset()
    await loadUserTeams()
    await switchActiveTeam(payload.team.id)
    setActiveView('teams')
    setTeamStatus(`Created ${payload.team.name}.`)
  } catch (error) {
    setTeamStatus(`Could not create team: ${error.message}`)
  }
})

joinTeamForm?.addEventListener('submit', async event => {
  event.preventDefault()

  const currentUserId = getAuthenticatedUserId()
  if (!currentUserId) {
    setTeamStatus('Sign in with GitHub before joining a team.')
    return
  }

  const formData = new FormData(joinTeamForm)
  const teamId = readField(formData, 'teamId', '')
  if (!teamId) {
    setTeamStatus('Paste a team id before joining.')
    return
  }

  setTeamStatus('Joining team...')
  try {
    await apiRequest(`/teams/${encodeURIComponent(teamId)}/join`, {
      method: 'POST',
      body: JSON.stringify({ userId: currentUserId })
    })

    joinTeamForm.reset()
    await loadUserTeams()
    await switchActiveTeam(teamId)
    setActiveView('teams')
    setTeamStatus('Joined team.')
  } catch (error) {
    setTeamStatus(`Could not join team: ${error.message}`)
  }
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
    updateProfileMenuUI()
    closeProfileMenu()
    appState.availabilityWeekStart = getWeekStartYmd(new Date())
    await loadUserTeams()

    if (!appState.teamId) {
      setActiveView('teams')
      setTeamStatus('Create a team or join one to start using the dashboard.')
      return
    }

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
