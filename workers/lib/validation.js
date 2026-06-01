/* eslint-disable jsdoc/require-jsdoc, jsdoc/require-description, jsdoc/require-param-type, jsdoc/require-param-description, jsdoc/require-returns */

import {
  DEFAULT_TEAM_ID,
  MAX_TEXT_LENGTH,
  VALID_AVAILABILITY,
  VALID_MEETING_STATUS,
  VALID_TEAM_ROLES
} from './config.js'

/**
 *
 * @param value
 * @param fieldName
 * @param maxLength
 */
export function normalizeRequiredString (value, fieldName, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required`)
  }

  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer`)
  }

  return normalized
}

/**
 *
 * @param value
 * @param fieldName
 * @param maxLength
 */
export function normalizeOptionalString (value, fieldName, maxLength = MAX_TEXT_LENGTH) {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer`)
  }

  return normalized
}

/**
 *
 * @param value
 * @param fieldName
 * @param fallback
 */
export function normalizeBoolean (value, fieldName, fallback) {
  if (value === undefined || value === null) {
    return fallback
  }

  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`)
  }

  return value
}

/**
 *
 * @param value
 */
export function normalizeAvailability (value) {
  const normalized = normalizeRequiredString(value, 'availability', 32).toLowerCase()

  if (!VALID_AVAILABILITY.has(normalized)) {
    throw new Error('availability must be available, partial, or unavailable')
  }

  return normalized
}

/**
 *
 * @param value
 * @param fieldName
 */
export function normalizeDate (value, fieldName) {
  const normalized = normalizeRequiredString(value, fieldName, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`)
  }

  return normalized
}

/**
 *
 * @param value
 * @param fieldName
 * @param min
 * @param max
 */
export function normalizeInteger (value, fieldName, min, max) {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`)
  }

  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`)
  }

  return value
}

/**
 *
 * @param value
 */
export function normalizeMeetingStatus (value) {
  const normalized = normalizeRequiredString(value, 'status', 32).toLowerCase()

  if (!VALID_MEETING_STATUS.has(normalized)) {
    throw new Error('status must be available, maybe, or busy')
  }

  return normalized
}

/**
 *
 * @param value
 * @param fallback
 */
export function normalizeTeamRole (value, fallback = 'member') {
  const normalized = normalizeOptionalString(value, 'role', 32) || fallback

  if (!VALID_TEAM_ROLES.has(normalized)) {
    throw new Error('role must be owner, lead, or member')
  }

  return normalized
}

/**
 *
 * @param payload
 */
export function normalizeCreateTeamPayload (payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object')
  }

  return {
    name: normalizeRequiredString(payload.name, 'name', 120),
    repoOwner: normalizeOptionalString(payload.repoOwner, 'repoOwner', 100),
    repoName: normalizeOptionalString(payload.repoName, 'repoName', 100),
    sprintName: normalizeOptionalString(payload.sprintName, 'sprintName', 120),
    currentUserId: normalizeOptionalString(payload.currentUserId, 'currentUserId', 128)
  }
}

/**
 *
 * @param payload
 */
export function normalizeJoinTeamPayload (payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object')
  }

  return {
    userId: normalizeRequiredString(payload.userId, 'userId', 128),
    role: 'member'
  }
}

/**
 *
 * @param payload
 */
export function normalizeUpdateTeamMemberPayload (payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object')
  }

  const update = {
    actingUserId: normalizeRequiredString(payload.actingUserId, 'actingUserId', 128)
  }

  if ('role' in payload) {
    update.role = normalizeTeamRole(payload.role)
  }

  if ('isLead' in payload) {
    update.isLead = normalizeBoolean(payload.isLead, 'isLead', false)
  }

  if ('active' in payload) {
    update.active = normalizeBoolean(payload.active, 'active', true)
  }

  if (!('role' in update) && !('isLead' in update) && !('active' in update)) {
    throw new Error('At least one editable team member field is required')
  }

  return update
}

/**
 *
 * @param payload
 */
export function normalizeSyncGithubPayload (payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object')
  }

  return {
    actingUserId: normalizeRequiredString(payload.actingUserId, 'actingUserId', 128)
  }
}

/**
 *
 * @param payload
 */
export function normalizeCreateStandupPayload (payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object')
  }

  return {
    teamId: normalizeOptionalString(payload.teamId, 'teamId', 128) || DEFAULT_TEAM_ID,
    userId: normalizeRequiredString(payload.userId, 'userId', 128),
    standupDate: normalizeDate(payload.standupDate, 'standupDate'),
    yesterday: normalizeOptionalString(payload.yesterday, 'yesterday'),
    today: normalizeRequiredString(payload.today, 'today'),
    blocker: normalizeOptionalString(payload.blocker, 'blocker'),
    availability: normalizeAvailability(payload.availability ?? 'available'),
    includeGithub: normalizeBoolean(payload.includeGithub, 'includeGithub', true),
    notifyLead: normalizeBoolean(payload.notifyLead, 'notifyLead', false),
    githubActivitySummary: normalizeOptionalString(payload.githubActivitySummary, 'githubActivitySummary')
  }
}

/**
 *
 * @param payload
 */
export function normalizeUpdateStandupPayload (payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object')
  }

  const update = {}

  if ('yesterday' in payload) {
    update.yesterday = normalizeOptionalString(payload.yesterday, 'yesterday')
  }

  if ('today' in payload) {
    update.today = normalizeRequiredString(payload.today, 'today')
  }

  if ('blocker' in payload) {
    update.blocker = normalizeOptionalString(payload.blocker, 'blocker')
  }

  if ('availability' in payload) {
    update.availability = normalizeAvailability(payload.availability)
  }

  if ('includeGithub' in payload) {
    update.includeGithub = normalizeBoolean(payload.includeGithub, 'includeGithub', true)
  }

  if ('notifyLead' in payload) {
    update.notifyLead = normalizeBoolean(payload.notifyLead, 'notifyLead', false)
  }

  if ('githubActivitySummary' in payload) {
    update.githubActivitySummary = normalizeOptionalString(
      payload.githubActivitySummary,
      'githubActivitySummary'
    )
  }

  if (!Object.keys(update).length) {
    throw new Error('At least one editable standup field is required')
  }

  return update
}

/**
 *
 * @param payload
 */
export function normalizeUpdateAvailabilityPayload (payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object')
  }

  if (!Array.isArray(payload.slots) || !payload.slots.length) {
    throw new Error('slots must be a non-empty array')
  }

  return {
    teamId: normalizeOptionalString(payload.teamId, 'teamId', 128) || DEFAULT_TEAM_ID,
    userId: normalizeRequiredString(payload.userId, 'userId', 128),
    weekStart: normalizeDate(payload.weekStart, 'weekStart'),
    slots: payload.slots.map((slot, index) => {
      if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
        throw new Error(`slots[${index}] must be an object`)
      }

      return {
        dayIndex: normalizeInteger(slot.dayIndex, `slots[${index}].dayIndex`, 0, 6),
        slotIndex: normalizeInteger(slot.slotIndex, `slots[${index}].slotIndex`, 0, 47),
        slotLabel: normalizeRequiredString(slot.slotLabel, `slots[${index}].slotLabel`, 32),
        status: normalizeMeetingStatus(slot.status)
      }
    })
  }
}
