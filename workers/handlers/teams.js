import { syncGithubRepo } from '../lib/github-sync.js'
import { getQueryParam } from '../lib/request.js'
import { errorResponse, jsonResponse, validationError } from '../lib/responses.js'
import { canManageTeam, upsertTeamMember } from '../lib/team-membership.js'
import {
  normalizeCreateTeamPayload,
  normalizeJoinTeamPayload,
  normalizeSyncGithubPayload,
  normalizeUpdateTeamMemberPayload
} from '../lib/validation.js'

/**
 * Builds a readable id for a new team.
 * @param {string} name Team name.
 * @returns {string} Team id.
 */
function buildTeamId (name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'team'

  return `${slug}-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * Lists teams, optionally filtered to one user.
 * @param {object} env Worker environment bindings.
 * @param {URL} url Request URL.
 * @returns {Promise<Response>} Teams response.
 */
export async function handleGetTeams (env, url) {
  const userId = getQueryParam(url, 'userId', '')

  const query = userId
    ? `
      SELECT
        teams.id,
        teams.name,
        teams.repo_owner,
        teams.repo_name,
        teams.sprint_name,
        teams.created_at,
        teams.updated_at,
        team_members.role,
        team_members.is_lead,
        team_members.active
      FROM team_members
      JOIN teams ON teams.id = team_members.team_id
      WHERE team_members.user_id = ?
      ORDER BY teams.name ASC
    `
    : `
      SELECT
        id,
        name,
        repo_owner,
        repo_name,
        sprint_name,
        created_at,
        updated_at,
        NULL AS role,
        0 AS is_lead,
        1 AS active
      FROM teams
      ORDER BY name ASC
    `

  const result = userId
    ? await env.DB.prepare(query).bind(userId).all()
    : await env.DB.prepare(query).all()

  return jsonResponse({
    teams: result.results.map(team => ({
      id: team.id,
      name: team.name,
      repoOwner: team.repo_owner,
      repoName: team.repo_name,
      sprintName: team.sprint_name,
      role: team.role,
      isLead: Boolean(team.is_lead),
      active: Boolean(team.active),
      createdAt: team.created_at,
      updatedAt: team.updated_at
    }))
  })
}

/**
 * Creates a team and optionally assigns the current user as owner.
 * @param {Request} request HTTP request.
 * @param {object} env Worker environment bindings.
 * @returns {Promise<Response>} Created team response.
 */
export async function handleCreateTeam (request, env) {
  try {
    const payload = normalizeCreateTeamPayload(await request.json())
    const teamId = buildTeamId(payload.name)

    await env.DB.prepare(`
      INSERT INTO teams (id, name, repo_owner, repo_name, sprint_name)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      teamId,
      payload.name,
      payload.repoOwner,
      payload.repoName,
      payload.sprintName
    ).run()

    if (payload.currentUserId) {
      await upsertTeamMember(env, teamId, payload.currentUserId, 'owner', true)
    }

    return jsonResponse({
      team: {
        id: teamId,
        name: payload.name,
        repoOwner: payload.repoOwner,
        repoName: payload.repoName,
        sprintName: payload.sprintName
      }
    }, 201)
  } catch (error) {
    return validationError(error.message)
  }
}

/**
 * Adds the current user to an existing team.
 * @param {Request} request HTTP request.
 * @param {object} env Worker environment bindings.
 * @param {string} teamId Team id.
 * @returns {Promise<Response>} Join response.
 */
export async function handleJoinTeam (request, env, teamId) {
  try {
    const team = await env.DB.prepare('SELECT id FROM teams WHERE id = ?').bind(teamId).first()
    if (!team) {
      return errorResponse('Team not found', 404)
    }

    const payload = normalizeJoinTeamPayload(await request.json())
    await upsertTeamMember(env, teamId, payload.userId, payload.role, payload.role === 'lead')

    return jsonResponse({
      teamId,
      userId: payload.userId,
      role: payload.role
    })
  } catch (error) {
    return validationError(error.message)
  }
}

/**
 * Updates role/active state for a team member.
 * @param {Request} request HTTP request.
 * @param {object} env Worker environment bindings.
 * @param {string} teamId Team id.
 * @param {string} userId User id being updated.
 * @returns {Promise<Response>} Updated member response.
 */
export async function handleUpdateTeamMember (request, env, teamId, userId) {
  try {
    const payload = normalizeUpdateTeamMemberPayload(await request.json())

    if (!(await canManageTeam(env, teamId, payload.actingUserId))) {
      return errorResponse('You do not have permission to manage this team', 403)
    }

    const current = await env.DB.prepare(`
      SELECT role, is_lead, active
      FROM team_members
      WHERE team_id = ? AND user_id = ?
    `).bind(teamId, userId).first()

    if (!current) {
      return errorResponse('Team member not found', 404)
    }

    const nextRole = payload.role || current.role
    const nextIsLead = 'isLead' in payload ? payload.isLead : Boolean(current.is_lead)
    const nextActive = 'active' in payload ? payload.active : Boolean(current.active)

    await env.DB.prepare(`
      UPDATE team_members
      SET role = ?, is_lead = ?, active = ?
      WHERE team_id = ? AND user_id = ?
    `).bind(
      nextRole,
      nextIsLead ? 1 : 0,
      nextActive ? 1 : 0,
      teamId,
      userId
    ).run()

    return jsonResponse({
      teamId,
      userId,
      role: nextRole,
      isLead: nextIsLead,
      active: nextActive
    })
  } catch (error) {
    return validationError(error.message)
  }
}

/**
 * Imports GitHub repo contributors and issues for a team.
 * @param {Request} request HTTP request.
 * @param {object} env Worker environment bindings.
 * @param {string} teamId Team id.
 * @returns {Promise<Response>} Sync summary.
 */
export async function handleSyncGithubTeam (request, env, teamId) {
  try {
    const body = await request.json()
    normalizeSyncGithubPayload(body)

    const summary = await syncGithubRepo(env, teamId)
    return jsonResponse(summary)
  } catch (error) {
    if (error.message === 'Team not found') {
      return errorResponse(error.message, 404)
    }

    return validationError(error.message)
  }
}
