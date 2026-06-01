import { DEFAULT_TEAM_ID } from '../lib/config.js'
import { getQueryParam, readJson } from '../lib/request.js'
import { errorResponse, jsonResponse, validationError } from '../lib/responses.js'
import {
  getAvailabilityWeight,
  mapAvailabilityRow,
  mapOverlapSlot
} from '../lib/availability-mappers.js'
import { normalizeDate, normalizeUpdateAvailabilityPayload } from '../lib/validation.js'

async function ensureActiveTeamMember (env, teamId, userId) {
  const member = await env.DB.prepare(
    `
      SELECT team_id, user_id
      FROM team_members
      WHERE team_id = ? AND user_id = ? AND active = 1
    `
  ).bind(teamId, userId).first()

  return Boolean(member)
}

async function fetchAvailabilityRows (env, teamId, weekStart) {
  const { results } = await env.DB.prepare(
    `
      SELECT
        availability_slots.id,
        availability_slots.team_id,
        availability_slots.user_id,
        availability_slots.week_start,
        availability_slots.day_index,
        availability_slots.slot_index,
        availability_slots.slot_label,
        availability_slots.status,
        availability_slots.updated_at,
        users.display_name,
        users.initials,
        users.github_username,
        users.avatar_color_key
      FROM availability_slots
      JOIN users ON users.id = availability_slots.user_id
      JOIN team_members
        ON team_members.team_id = availability_slots.team_id
        AND team_members.user_id = availability_slots.user_id
      WHERE availability_slots.team_id = ?
        AND availability_slots.week_start = ?
        AND team_members.active = 1
      ORDER BY availability_slots.day_index ASC, availability_slots.slot_index ASC, users.display_name ASC
    `
  ).bind(teamId, weekStart).all()

  return results
}

async function fetchActiveMemberCount (env, teamId) {
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS count
      FROM team_members
      WHERE team_id = ? AND active = 1
    `
  ).bind(teamId).first()

  return row?.count || 0
}

function normalizeWeekStartFromUrl (url) {
  try {
    return normalizeDate(url.searchParams.get('weekStart'), 'weekStart')
  } catch (error) {
    return { error }
  }
}

export async function handleGetAvailability (env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID)
  const weekStart = normalizeWeekStartFromUrl(url)

  if (weekStart.error) {
    return validationError(weekStart.error.message)
  }

  const rows = await fetchAvailabilityRows(env, teamId, weekStart)

  return jsonResponse({
    teamId,
    weekStart,
    slots: rows.map(mapAvailabilityRow)
  })
}

export async function handleUpdateMyAvailability (request, env) {
  let payload

  try {
    payload = normalizeUpdateAvailabilityPayload(await readJson(request))
  } catch (error) {
    return validationError(error.message)
  }

  const isMember = await ensureActiveTeamMember(env, payload.teamId, payload.userId)
  if (!isMember) {
    return errorResponse('Active team member not found', 404)
  }

  const statements = payload.slots.map(slot => {
    const userKey = payload.userId.replace(/^user-/, '')
    const id = [
      'avail',
      userKey,
      payload.weekStart,
      slot.dayIndex,
      slot.slotIndex
    ].join('-')

    return env.DB.prepare(
      `
        INSERT INTO availability_slots (
          id,
          team_id,
          user_id,
          week_start,
          day_index,
          slot_index,
          slot_label,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(team_id, user_id, week_start, day_index, slot_index) DO UPDATE SET
          slot_label = excluded.slot_label,
          status = excluded.status,
          updated_at = CURRENT_TIMESTAMP
      `
    ).bind(
      id,
      payload.teamId,
      payload.userId,
      payload.weekStart,
      slot.dayIndex,
      slot.slotIndex,
      slot.slotLabel,
      slot.status
    )
  })

  await env.DB.batch(statements)

  const rows = await fetchAvailabilityRows(env, payload.teamId, payload.weekStart)
  const userSlots = rows.filter(row => row.user_id === payload.userId)

  return jsonResponse({
    teamId: payload.teamId,
    userId: payload.userId,
    weekStart: payload.weekStart,
    slots: userSlots.map(mapAvailabilityRow)
  })
}

export async function handleGetAvailabilityOverlap (env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID)
  const weekStart = normalizeWeekStartFromUrl(url)

  if (weekStart.error) {
    return validationError(weekStart.error.message)
  }

  const [rows, totalMembers] = await Promise.all([
    fetchAvailabilityRows(env, teamId, weekStart),
    fetchActiveMemberCount(env, teamId)
  ])

  const slotsByTime = new Map()

  rows.forEach(row => {
    const key = `${row.day_index}-${row.slot_index}`
    const current = slotsByTime.get(key) || {
      teamId,
      weekStart,
      dayIndex: row.day_index,
      slotIndex: row.slot_index,
      slotLabel: row.slot_label,
      score: 0,
      availableCount: 0,
      maybeCount: 0,
      busyCount: 0,
      totalMembers,
      members: []
    }

    current.score += getAvailabilityWeight(row.status)
    if (row.status === 'available') current.availableCount += 1
    else if (row.status === 'maybe') current.maybeCount += 1
    else current.busyCount += 1

    current.members.push({
      id: row.user_id,
      displayName: row.display_name,
      initials: row.initials,
      status: row.status
    })

    slotsByTime.set(key, current)
  })

  const overlap = [...slotsByTime.values()]
    .map(slot => ({
      ...slot,
      busyCount: slot.busyCount + Math.max(totalMembers - slot.members.length, 0)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if (left.dayIndex !== right.dayIndex) return left.dayIndex - right.dayIndex
      return left.slotIndex - right.slotIndex
    })
    .map(mapOverlapSlot)

  return jsonResponse({
    teamId,
    weekStart,
    overlap
  })
}
