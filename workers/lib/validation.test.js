import { describe, expect, it } from 'vitest';
import {
  normalizeAvailability,
  normalizeBoolean,
  normalizeCreateStandupPayload,
  normalizeDate,
  normalizeInteger,
  normalizeOptionalString,
  normalizeRequiredString,
  normalizeUpdateAvailabilityPayload,
  normalizeUpdateStandupPayload,
} from './validation.js';

describe('validation helpers', () => {
  it('trims required strings and rejects empty values', () => {
    expect(normalizeRequiredString('  hello  ', 'name')).toBe('hello');
    expect(() => normalizeRequiredString('   ', 'name')).toThrow('name is required');
  });

  it('normalizes optional strings to null when absent or empty', () => {
    expect(normalizeOptionalString(undefined, 'blocker')).toBeNull();
    expect(normalizeOptionalString('   ', 'blocker')).toBeNull();
    expect(normalizeOptionalString(' blocked ', 'blocker')).toBe('blocked');
  });

  it('validates booleans without coercing strings', () => {
    expect(normalizeBoolean(undefined, 'includeGithub', true)).toBe(true);
    expect(normalizeBoolean(false, 'includeGithub', true)).toBe(false);
    expect(() => normalizeBoolean('false', 'includeGithub', true)).toThrow('includeGithub must be a boolean');
  });

  it('validates date strings by YYYY-MM-DD shape', () => {
    expect(normalizeDate('2026-05-10', 'date')).toBe('2026-05-10');
    expect(() => normalizeDate('05/10/2026', 'date')).toThrow('date must use YYYY-MM-DD format');
  });

  it('validates bounded integers', () => {
    expect(normalizeInteger(3, 'dayIndex', 0, 6)).toBe(3);
    expect(() => normalizeInteger(7, 'dayIndex', 0, 6)).toThrow('dayIndex must be between 0 and 6');
    expect(() => normalizeInteger(1.5, 'dayIndex', 0, 6)).toThrow('dayIndex must be an integer');
  });

  it('validates standup availability values', () => {
    expect(normalizeAvailability('Available')).toBe('available');
    expect(() => normalizeAvailability('busy')).toThrow('availability must be available, partial, or unavailable');
  });
});

describe('standup payload normalization', () => {
  it('normalizes create payloads with defaults', () => {
    expect(normalizeCreateStandupPayload({
      userId: ' user-maya ',
      standupDate: '2026-05-10',
      today: ' Build API ',
    })).toEqual({
      teamId: 'team-demo',
      userId: 'user-maya',
      standupDate: '2026-05-10',
      yesterday: null,
      today: 'Build API',
      blocker: null,
      availability: 'available',
      includeGithub: true,
      notifyLead: false,
      githubActivitySummary: null,
    });
  });

  it('rejects invalid create payloads', () => {
    expect(() => normalizeCreateStandupPayload(null)).toThrow('Request body must be a JSON object');
    expect(() => normalizeCreateStandupPayload({ userId: 'user-maya' })).toThrow('standupDate is required');
    expect(() => normalizeCreateStandupPayload({
      userId: 'user-maya',
      standupDate: '2026-05-10',
      today: 'Today',
      includeGithub: 'yes',
    })).toThrow('includeGithub must be a boolean');
  });

  it('normalizes update payloads and requires at least one editable field', () => {
    expect(normalizeUpdateStandupPayload({
      today: ' Updated ',
      blocker: '',
      notifyLead: true,
    })).toEqual({
      today: 'Updated',
      blocker: null,
      notifyLead: true,
    });

    expect(() => normalizeUpdateStandupPayload({})).toThrow('At least one editable standup field is required');
  });
});

describe('availability payload normalization', () => {
  it('normalizes availability updates with slot index identity', () => {
    expect(normalizeUpdateAvailabilityPayload({
      userId: 'user-maya',
      weekStart: '2026-05-04',
      slots: [
        { dayIndex: 2, slotIndex: 5, slotLabel: ' 2 PM ', status: 'Available' },
        { dayIndex: 2, slotIndex: 6, slotLabel: '3 PM', status: 'maybe' },
      ],
    })).toEqual({
      teamId: 'team-demo',
      userId: 'user-maya',
      weekStart: '2026-05-04',
      slots: [
        { dayIndex: 2, slotIndex: 5, slotLabel: '2 PM', status: 'available' },
        { dayIndex: 2, slotIndex: 6, slotLabel: '3 PM', status: 'maybe' },
      ],
    });
  });

  it('rejects invalid availability updates', () => {
    expect(() => normalizeUpdateAvailabilityPayload({
      userId: 'user-maya',
      weekStart: '2026-05-04',
      slots: [],
    })).toThrow('slots must be a non-empty array');

    expect(() => normalizeUpdateAvailabilityPayload({
      userId: 'user-maya',
      weekStart: '2026-05-04',
      slots: [{ dayIndex: 2, slotLabel: '2 PM', status: 'available' }],
    })).toThrow('slots[0].slotIndex must be an integer');

    expect(() => normalizeUpdateAvailabilityPayload({
      userId: 'user-maya',
      weekStart: '2026-05-04',
      slots: [{ dayIndex: 2, slotIndex: 5, slotLabel: '2 PM', status: 'partial' }],
    })).toThrow('status must be available, maybe, or busy');
  });
});
