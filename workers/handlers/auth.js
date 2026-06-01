import { jsonResponse, errorResponse } from '../lib/responses.js'
import { DEFAULT_TEAM_ID } from '../lib/config.js'

/**
 * Builds two-letter initials for avatar/profile UI.
 * @param {string} displayName - User display name.
 * @param {string} username - GitHub username.
 * @returns {string} Uppercase initials.
 */
function buildInitials (displayName, username) {
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
 * Creates or updates the app user tied to a GitHub identity.
 * @param {object} env - Worker environment bindings.
 * @param {object} githubUser - GitHub user API response.
 * @returns {Promise<object>} Saved app user profile.
 */
async function saveGithubUser (env, githubUser) {
  const username = githubUser.login
  const displayName = githubUser.name || username
  const initials = buildInitials(displayName, username)
  const userId = `user-github-${githubUser.id}`
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

  const team = await env.DB.prepare(`
    SELECT id
    FROM teams
    WHERE id = ?
  `).bind(DEFAULT_TEAM_ID).first()

  if (team) {
    await env.DB.prepare(`
      INSERT INTO team_members (team_id, user_id, role, is_lead, active)
      VALUES (?, ?, 'member', 0, 1)
      ON CONFLICT(team_id, user_id) DO UPDATE SET
        active = 1
    `).bind(DEFAULT_TEAM_ID, savedUser.id).run()
  }

  return {
    id: savedUser.id,
    displayName: savedUser.display_name,
    initials: savedUser.initials,
    githubUsername: savedUser.github_username,
    avatarColorKey: savedUser.avatar_color_key
  }
}

/**
 * Exchange authorization code for GitHub access token
 * @param {string} code - GitHub OAuth authorization code
 * @param {object} env - Environment variables
 * @returns {Promise<object>} GitHub access token response
 */
async function exchangeCodeForToken (code, env) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code
    })
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch GitHub user information
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<object>} GitHub user data
 */
async function fetchGitHubUser (accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'SE-SitRep/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`GitHub user fetch failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Create a session token (you can implement JWT or simple session)
 * @param {object} user - GitHub user data
 * @param {object} appUser - Saved app user profile.
 * @returns {string} Session token
 */
function createSessionToken (user, appUser) {
  // Simple session creation - in production, use proper JWT signing
  const sessionData = {
    userId: appUser.id,
    githubId: user.id,
    username: user.login,
    email: user.email,
    createdAt: Date.now()
  }

  // For now, return base64 encoded data
  // TODO: Replace with proper JWT signing
  return btoa(JSON.stringify(sessionData))
}

/**
 * Handle GitHub OAuth authentication
 * @param {Request} request - HTTP request
 * @param {object} env - Environment variables
 * @returns {Promise<Response>} OAuth result response.
 */
export async function handleGithubAuth (request, env) {
  try {
    // Parse request body
    const body = await request.json()
    const { code } = body

    // Validate required fields
    if (!code) {
      return errorResponse('Missing authorization code', 400)
    }

    // Validate environment variables
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.DB) {
      console.error('GitHub OAuth credentials not configured')
      return errorResponse('OAuth configuration error', 500)
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code, env)

    if (tokenData.error) {
      return errorResponse(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`, 400)
    }

    // Fetch user info from GitHub
    const userData = await fetchGitHubUser(tokenData.access_token)

    // Link this GitHub identity to an app user before issuing the session.
    const appUser = await saveGithubUser(env, userData)

    // Create session token
    const sessionToken = createSessionToken(userData, appUser)

    // Return success response with user data and session token
    return jsonResponse({
      success: true,
      user: {
        id: appUser.id,
        githubId: userData.id,
        username: userData.login,
        name: userData.name || userData.login,
        email: userData.email,
        avatarUrl: userData.avatar_url,
        displayName: appUser.displayName,
        initials: appUser.initials,
        githubUsername: appUser.githubUsername,
        avatarColorKey: appUser.avatarColorKey
      },
      token: sessionToken,
      sessionToken
    })
  } catch (error) {
    console.error('GitHub auth error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
