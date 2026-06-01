import { jsonResponse, errorResponse } from '../lib/responses.js'
import { DEFAULT_TEAM_ID } from '../lib/config.js'
import { upsertGithubUser, upsertTeamMember } from '../lib/team-membership.js'

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
    const appUser = await upsertGithubUser(env, userData)

    const team = await env.DB.prepare(`
      SELECT id
      FROM teams
      WHERE id = ?
    `).bind(DEFAULT_TEAM_ID).first()

    if (team) {
      await upsertTeamMember(env, DEFAULT_TEAM_ID, appUser.id)
    }

    const { results: teams } = await env.DB.prepare(`
      SELECT
        teams.id,
        teams.name,
        teams.repo_owner,
        teams.repo_name,
        teams.sprint_name,
        team_members.role,
        team_members.is_lead
      FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.user_id = ? AND team_members.active = 1
      ORDER BY teams.name ASC
    `).bind(appUser.id).all()

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
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        repoOwner: team.repo_owner,
        repoName: team.repo_name,
        sprintName: team.sprint_name,
        role: team.role,
        isLead: Boolean(team.is_lead)
      })),
      token: sessionToken,
      sessionToken
    })
  } catch (error) {
    console.error('GitHub auth error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
