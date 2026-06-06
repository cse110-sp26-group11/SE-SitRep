/**
 * API TESTS — Backend endpoint validation
 *
 * These tests verify that the API returns correct data and handles requests properly.
 * They bypass the UI and directly test backend logic.
 *
 * This is useful for:
 *  • Catching data format issues early
 *  • Testing error handling (wrong parameters, auth, etc.)
 *  • Verifying database connectivity
 *
 * USAGE:
 *   npm run test:api
 */

import {
  test,
  expect,
  apiCall,
  createMockStandup,
  DEFAULT_TEAM_ID,
  expectBackendReady,
  FIXED_STANDUP_DATE,
  FIXED_WEEK_START,
  uniqueDateFor,
  uniqueWeekStartFor,
} from './fixtures.js';

test.describe('API Tests', () => {
  test.beforeAll(async () => {
    await expectBackendReady();
  });

  test('GET /api/health reports a reachable backend', async () => {
    const data = await apiCall('GET', '/api/health');

    expect(data.status).toBe('ok');
    expect(data.service).toBeTruthy();
    expect(data.database).toBe('reachable');
  });

  test('GET /api/team returns the seeded demo team and members', async () => {
    const data = await apiCall('GET', `/api/team?teamId=${DEFAULT_TEAM_ID}`);

    expect(data.team.id).toBe(DEFAULT_TEAM_ID);
    expect(data.members).toHaveLength(5);
    expect(data.members.map(member => member.displayName)).toEqual(expect.arrayContaining([
      'Maya Rodriguez',
      'Arav Kumar',
      'Jamie Lee',
      'Ray Yang',
      'Sam He',
    ]));
  });

  test('GET /api/standups returns the current object payload shape for the seeded day', async () => {
    const data = await apiCall('GET', `/api/standups?teamId=${DEFAULT_TEAM_ID}&date=${FIXED_STANDUP_DATE}`);

    expect(data.teamId).toBe(DEFAULT_TEAM_ID);
    expect(data.date).toBe(FIXED_STANDUP_DATE);
    expect(data.standups).toHaveLength(5);
    expect(data.standups[0]).toEqual(expect.objectContaining({
      id: expect.any(String),
      teamId: DEFAULT_TEAM_ID,
      userId: expect.any(String),
      standupDate: FIXED_STANDUP_DATE,
      today: expect.any(String),
    }));
  });

  test('GET /api/dashboard returns repo pulse, issues, workflows, summary, and sprint health', async () => {
    const data = await apiCall('GET', `/api/dashboard?teamId=${DEFAULT_TEAM_ID}&date=${FIXED_STANDUP_DATE}`);

    expect(data.repoPulse).toBeTruthy();
    expect(data.issues.length).toBeGreaterThan(0);
    expect(data.workflows.length).toBeGreaterThan(0);
    expect(data.summary).toBeTruthy();
    expect(data.sprintHealth).toBeTruthy();
  });

  test('standup create and update round-trip through the backend', async ({}, testInfo) => {
    const standupDate = uniqueDateFor(testInfo);
    const payload = createMockStandup({
      teamId: DEFAULT_TEAM_ID,
      userId: 'user-maya',
      standupDate,
      yesterday: 'Closed out the seeded API assertions.',
      today: 'Exercising the create standup path in Playwright.',
      blocker: '',
    });

    const created = await apiCall('POST', '/api/standups', payload);
    expect(created.standup).toEqual(expect.objectContaining({
      userId: 'user-maya',
      standupDate,
      today: 'Exercising the create standup path in Playwright.',
    }));

    const updated = await apiCall('PUT', `/api/standups/${created.standup.id}`, {
      today: 'Updated standup content from the API suite.',
      blocker: 'Waiting on a deterministic test fixture.',
      availability: 'partial',
      includeGithub: true,
      notifyLead: true,
    });

    expect(updated.standup.today).toBe('Updated standup content from the API suite.');
    expect(updated.standup.blocker).toBe('Waiting on a deterministic test fixture.');

    const list = await apiCall('GET', `/api/standups?teamId=${DEFAULT_TEAM_ID}&date=${standupDate}`);
    expect(list.standups.map(standup => standup.id)).toContain(created.standup.id);
  });

  test('seeded availability and overlap endpoints return structured weekly data', async () => {
    const availability = await apiCall('GET', `/api/availability?teamId=${DEFAULT_TEAM_ID}&weekStart=${FIXED_WEEK_START}`);
    const overlap = await apiCall('GET', `/api/availability/overlap?teamId=${DEFAULT_TEAM_ID}&weekStart=${FIXED_WEEK_START}`);

    expect(availability.teamId).toBe(DEFAULT_TEAM_ID);
    expect(availability.weekStart).toBe(FIXED_WEEK_START);
    expect(availability.slots.length).toBeGreaterThan(0);
    expect(availability.slots[0]).toEqual(expect.objectContaining({
      userId: expect.any(String),
      dayIndex: expect.any(Number),
      slotIndex: expect.any(Number),
      status: expect.any(String),
    }));

    expect(overlap.overlap.length).toBeGreaterThan(0);
    expect(overlap.overlap[0]).toEqual(expect.objectContaining({
      dayIndex: expect.any(Number),
      slotIndex: expect.any(Number),
      score: expect.any(Number),
      totalMembers: 5,
    }));
  });

  test('availability updates persist for a unique test week', async ({}, testInfo) => {
    const weekStart = uniqueWeekStartFor(testInfo);
    const result = await apiCall('PUT', '/api/availability/me', {
      teamId: DEFAULT_TEAM_ID,
      userId: 'user-ray',
      weekStart,
      slots: [
        { dayIndex: 0, slotIndex: 0, slotLabel: '6 AM', status: 'available' },
        { dayIndex: 0, slotIndex: 1, slotLabel: '7 AM', status: 'maybe' },
      ],
    });

    expect(result.userId).toBe('user-ray');
    expect(result.slots).toHaveLength(2);

    const availability = await apiCall('GET', `/api/availability?teamId=${DEFAULT_TEAM_ID}&weekStart=${weekStart}`);
    const raySlots = availability.slots.filter(slot => slot.userId === 'user-ray');
    expect(raySlots).toHaveLength(2);

    const overlap = await apiCall('GET', `/api/availability/overlap?teamId=${DEFAULT_TEAM_ID}&weekStart=${weekStart}`);
    expect(overlap.overlap[0].weekStart).toBe(weekStart);
  });
});
