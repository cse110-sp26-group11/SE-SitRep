/**
 * Builds a stable app user id from a GitHub numeric id.
 * @param {number|string} githubId GitHub user id.
 * @returns {string} App user id.
 */
export function buildGithubUserId (githubId) {
  return `user-github-${githubId}`
}

/**
 * Builds two-letter initials for avatar/profile UI.
 * @param {string} displayName User display name.
 * @param {string} username GitHub username.
 * @returns {string} Uppercase initials.
 */
export function buildInitials (displayName, username) {
  const nameParts = displayName
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean)

  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
  }

  return (displayName || username).slice(0, 2).toUpperCase()
}

/**
 * Creates or updates a user row from a GitHub user object.
 * @param {object} env Worker environment bindings.
 * @param {object} githubUser GitHub user API response.
 * @returns {Promise<object>} Saved app user profile.
 */
export async function upsertGithubUser (env, githubUser) {
  const username = githubUser.login
  const displayName = githubUser.name || username
  const initials = buildInitials(displayName, username)
  const userId = buildGithubUserId(githubUser.id)
  const avatarColorKey = initials.toLowerCase()

  await env.DB.prepare(`
    INSERT INTO users (id, display_name, initials, github_username, avatar_color_key)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(github_username) DO UPDATE SET
      display_name = excluded.display_name,
      initials = excluded.initials,
      avatar_color_key = excluded.avatar_color_key,
      updated_at = CURRENT_TIMESTAMP
  `).bind(userId, displayName, initials, username, avatarColorKey).run()

  const savedUser = await env.DB.prepare(`
    SELECT id, display_name, initials, github_username, avatar_color_key
    FROM users
    WHERE github_username = ?
  `).bind(username).first()

  return mapUserRow(savedUser)
}

/**
 * Adds a user to a team or reactivates the existing membership.
 * @param {object} env Worker environment bindings.
 * @param {string} teamId Team id.
 * @param {string} userId User id.
 * @param {string} role Membership role.
 * @param {boolean} isLead Whether the user is a team lead.
 * @returns {Promise<void>}
 */
export async function upsertTeamMember (env, teamId, userId, role = 'member', isLead = false) {
  await env.DB.prepare(`
    INSERT INTO team_members (team_id, user_id, role, is_lead, active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(team_id, user_id) DO UPDATE SET
      role = excluded.role,
      is_lead = excluded.is_lead,
      active = 1
  `).bind(teamId, userId, role, isLead ? 1 : 0).run()
}

/**
 * Checks whether a user can administer team membership/repo sync.
 * @param {object} env Worker environment bindings.
 * @param {string} teamId Team id.
 * @param {string} userId Acting user id.
 * @returns {Promise<boolean>} Whether the user has admin permission.
 */
export async function canManageTeam (env, teamId, userId) {
  if (!userId) return false

  const membership = await env.DB.prepare(`
    SELECT role, is_lead, active
    FROM team_members
    WHERE team_id = ? AND user_id = ?
  `).bind(teamId, userId).first()

  return Boolean(
    membership?.active &&
    (membership.is_lead || membership.role === 'owner' || membership.role === 'lead')
  )
}

/**
 * Maps a user table row into API shape.
 * @param {object} row User table row.
 * @returns {object} API user profile.
 */
export function mapUserRow (row) {
  return {
    id: row.id,
    displayName: row.display_name,
    initials: row.initials,
    githubUsername: row.github_username,
    avatarColorKey: row.avatar_color_key
  }
}
