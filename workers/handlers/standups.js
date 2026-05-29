import { DEFAULT_TEAM_ID } from '../lib/config.js'
import { getQueryParam, readJson } from '../lib/request.js'
import { errorResponse, jsonResponse, validationError } from '../lib/responses.js'
import { mapStandupRow } from '../lib/standup-mappers.js'
import { normalizeCreateStandupPayload, normalizeUpdateStandupPayload } from '../lib/validation.js'

async function ensureActiveTeamMember(env, teamId, userId) {
  const member = await env.DB.prepare(
    `
      SELECT team_id, user_id
      FROM team_members
      WHERE team_id = ? AND user_id = ? AND active = 1
    `
  )
    .bind(teamId, userId)
    .first()

  return Boolean(member)
}

async function fetchStandupById(env, standupId) {
  return env.DB.prepare(
    `
      SELECT
        standups.id,
        standups.team_id,
        standups.user_id,
        standups.standup_date,
        standups.yesterday,
        standups.today,
        standups.blocker,
        standups.availability,
        standups.include_github,
        standups.notify_lead,
        standups.github_activity_summary,
        standups.submitted_at,
        standups.updated_at,
        users.display_name,
        users.initials,
        users.github_username,
        users.avatar_color_key,
        team_members.is_lead
      FROM standups
      JOIN users ON users.id = standups.user_id
      JOIN team_members
        ON team_members.team_id = standups.team_id
        AND team_members.user_id = standups.user_id
      WHERE standups.id = ?
    `
  )
    .bind(standupId)
    .first()
}

export async function handleGetStandups(env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID)
  const date = url.searchParams.get('date')

  const filters = ['standups.team_id = ?']
  const bindings = [teamId]

  if (date && date.trim()) {
    filters.push('standups.standup_date = ?')
    bindings.push(date.trim())
  }

  const { results } = await env.DB.prepare(
    `
      SELECT
        standups.id,
        standups.team_id,
        standups.user_id,
        standups.standup_date,
        standups.yesterday,
        standups.today,
        standups.blocker,
        standups.availability,
        standups.include_github,
        standups.notify_lead,
        standups.github_activity_summary,
        standups.submitted_at,
        standups.updated_at,
        users.display_name,
        users.initials,
        users.github_username,
        users.avatar_color_key,
        team_members.is_lead
      FROM standups
      JOIN users ON users.id = standups.user_id
      JOIN team_members
        ON team_members.team_id = standups.team_id
        AND team_members.user_id = standups.user_id
      WHERE ${filters.join(' AND ')}
      ORDER BY standups.submitted_at DESC
    `
  )
    .bind(...bindings)
    .all()

  return jsonResponse({
    teamId,
    date: date && date.trim() ? date.trim() : null,
    standups: results.map(mapStandupRow)
  })
}

export async function handleCreateStandup(request, env) {
  let payload

  try {
    payload = normalizeCreateStandupPayload(await readJson(request))
  } catch (error) {
    return validationError(error.message)
  }

  const isMember = await ensureActiveTeamMember(env, payload.teamId, payload.userId)
  if (!isMember) {
    return errorResponse('Active team member not found', 404)
  }

  const existing = await env.DB.prepare(
    `
      SELECT id
      FROM standups
      WHERE team_id = ? AND user_id = ? AND standup_date = ?
    `
  )
    .bind(payload.teamId, payload.userId, payload.standupDate)
    .first()

  if (existing) {
    return errorResponse('Standup already exists for this user and date', 409)
  }

  const id = crypto.randomUUID()

  await env.DB.prepare(
    `
      INSERT INTO standups (
        id,
        team_id,
        user_id,
        standup_date,
        yesterday,
        today,
        blocker,
        availability,
        include_github,
        notify_lead,
        github_activity_summary
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      id,
      payload.teamId,
      payload.userId,
      payload.standupDate,
      payload.yesterday,
      payload.today,
      payload.blocker,
      payload.availability,
      payload.includeGithub ? 1 : 0,
      payload.notifyLead ? 1 : 0,
      payload.githubActivitySummary
    )
    .run()

  const standup = await fetchStandupById(env, id)

  return jsonResponse({ standup: mapStandupRow(standup) }, 201)
}

export async function handleUpdateStandup(request, env, standupId) {
  if (!standupId) {
    return errorResponse('Not found', 404)
  }

  const existing = await fetchStandupById(env, standupId)
  if (!existing) {
    return errorResponse('Standup not found', 404)
  }

  let payload

  try {
    payload = normalizeUpdateStandupPayload(await readJson(request))
  } catch (error) {
    return validationError(error.message)
  }

  const fields = []
  const bindings = []

  const columnMap = {
    yesterday: 'yesterday',
    today: 'today',
    blocker: 'blocker',
    availability: 'availability',
    includeGithub: 'include_github',
    notifyLead: 'notify_lead',
    githubActivitySummary: 'github_activity_summary'
  }

  Object.entries(payload).forEach(([key, value]) => {
    fields.push(`${columnMap[key]} = ?`)
    bindings.push(typeof value === 'boolean' ? (value ? 1 : 0) : value)
  })

  fields.push('updated_at = CURRENT_TIMESTAMP')
  bindings.push(standupId)

  await env.DB.prepare(
    `
      UPDATE standups
      SET ${fields.join(', ')}
      WHERE id = ?
    `
  )
    .bind(...bindings)
    .run()

  const standup = await fetchStandupById(env, standupId)

  return jsonResponse({ standup: mapStandupRow(standup) })
}
