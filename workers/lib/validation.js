import { DEFAULT_TEAM_ID, MAX_TEXT_LENGTH, VALID_AVAILABILITY } from './config.js';

export function normalizeRequiredString(value, fieldName, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer`);
  }

  return normalized;
}

export function normalizeOptionalString(value, fieldName, maxLength = MAX_TEXT_LENGTH) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer`);
  }

  return normalized;
}

export function normalizeBoolean(value, fieldName, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }

  return value;
}

export function normalizeAvailability(value) {
  const normalized = normalizeRequiredString(value, 'availability', 32).toLowerCase();

  if (!VALID_AVAILABILITY.has(normalized)) {
    throw new Error('availability must be available, partial, or unavailable');
  }

  return normalized;
}

export function normalizeDate(value, fieldName) {
  const normalized = normalizeRequiredString(value, fieldName, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`);
  }

  return normalized;
}

export function normalizeCreateStandupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object');
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
    githubActivitySummary: normalizeOptionalString(payload.githubActivitySummary, 'githubActivitySummary'),
  };
}

export function normalizeUpdateStandupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object');
  }

  const update = {};

  if ('yesterday' in payload) {
    update.yesterday = normalizeOptionalString(payload.yesterday, 'yesterday');
  }

  if ('today' in payload) {
    update.today = normalizeRequiredString(payload.today, 'today');
  }

  if ('blocker' in payload) {
    update.blocker = normalizeOptionalString(payload.blocker, 'blocker');
  }

  if ('availability' in payload) {
    update.availability = normalizeAvailability(payload.availability);
  }

  if ('includeGithub' in payload) {
    update.includeGithub = normalizeBoolean(payload.includeGithub, 'includeGithub', true);
  }

  if ('notifyLead' in payload) {
    update.notifyLead = normalizeBoolean(payload.notifyLead, 'notifyLead', false);
  }

  if ('githubActivitySummary' in payload) {
    update.githubActivitySummary = normalizeOptionalString(
      payload.githubActivitySummary,
      'githubActivitySummary'
    );
  }

  if (!Object.keys(update).length) {
    throw new Error('At least one editable standup field is required');
  }

  return update;
}
