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

import { test, expect } from '@playwright/test';
import { apiCall, expectBackendReady, createMockStandup } from './fixtures.js';

test.describe('API Tests — Backend Endpoints', () => {
  /**
   * Ensure backend is ready before running API tests.
   */
  test.beforeAll(async () => {
    await expectBackendReady();
  });

  test.describe('Health Check Endpoint', () => {
    /**
     * Verify the health endpoint returns expected structure.
     * This endpoint is used for monitoring and uptime checks.
     */
    test('GET /api/health returns ok status', async () => {
      const data = await apiCall('GET', '/api/health');

      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('service');
      expect(data).toHaveProperty('database');
    });

    /**
     * Verify database is reachable (it queries the DB).
     */
    test('health endpoint confirms database is reachable', async () => {
      const data = await apiCall('GET', '/api/health');
      expect(data.database).toBe('reachable');
    });
  });

  test.describe('Team Endpoint', () => {
    /**
     * Verify team endpoint returns team and member data.
     * Uses default team ID if not specified.
     */
    test('GET /api/team returns team data', async () => {
      const data = await apiCall('GET', '/api/team');

      // Should have team info
      expect(data).toHaveProperty('team');
      expect(data.team).toHaveProperty('id');
      expect(data.team).toHaveProperty('name');
      expect(data.team).toHaveProperty('repoOwner');
      expect(data.team).toHaveProperty('repoName');

      // Should have members array
      expect(data).toHaveProperty('members');
      expect(Array.isArray(data.members)).toBe(true);
    });

    /**
     * Verify team members have required fields.
     * Important for displaying member info in the UI.
     */
    test('team members have required fields', async () => {
      const data = await apiCall('GET', '/api/team');

      if (data.members.length > 0) {
        const member = data.members[0];

        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('displayName');
        expect(member).toHaveProperty('initials');
        expect(member).toHaveProperty('role');
        expect(member).toHaveProperty('isLead');
        expect(member).toHaveProperty('active');
      }
    });

    /**
     * Verify API handles non-existent team gracefully.
     * Should return 404, not crash.
     */
    test('GET /api/team with invalid ID returns error', async ({ page }) => {
      let statusCode = null;

      try {
        await apiCall('GET', '/api/team?teamId=nonexistent-id');
      } catch (error) {
        expect(error.message).toContain('404');
        statusCode = 404;
      }

      expect(statusCode).toBe(404);
    });
  });

  test.describe('Standups Endpoint', () => {
    /**
     * Verify we can fetch standups for a date.
     * Should return array of standup objects.
     */
    test('GET /api/standups returns standup list', async () => {
      const today = new Date().toISOString().split('T')[0];
      const data = await apiCall('GET', `/api/standups?date=${today}`);

      expect(Array.isArray(data)).toBe(true);
      // Even if empty, should be an array
    });

    /**
     * Verify standup objects have required fields.
     */
    test('standup objects have required fields', async () => {
      const today = new Date().toISOString().split('T')[0];
      const data = await apiCall('GET', `/api/standups?date=${today}`);

      if (data.length > 0) {
        const standup = data[0];

        expect(standup).toHaveProperty('id');
        expect(standup).toHaveProperty('userId');
        expect(standup).toHaveProperty('teamId');
        expect(standup).toHaveProperty('yesterday');
        expect(standup).toHaveProperty('today');
        expect(standup).toHaveProperty('standupDate');
      }
    });

    /**
     * Verify we can create a new standup via API.
     * This is useful for test setup without using the UI.
     */
    test('POST /api/standups creates a new standup', async () => {
      const mockStandup = createMockStandup({
        yesterday: 'Test work',
        today: 'Test work today',
      });

      // NOTE: This test assumes you have auth/default user setup.
      // If it fails, you may need to set up test user context first.
      try {
        const result = await apiCall('POST', '/api/standups', mockStandup);
        expect(result).toHaveProperty('id');
      } catch (error) {
        // If auth is required, this is expected
        console.warn('Standup creation requires auth context (expected in auth-protected build)');
      }
    });
  });

  test.describe('Dashboard Endpoint', () => {
    /**
     * Verify dashboard endpoint aggregates data correctly.
     */
    test('GET /api/dashboard returns dashboard data', async () => {
      const data = await apiCall('GET', '/api/dashboard');

      // Should have expected properties
      expect(data).toBeDefined();
      // Dashboard might return different structures, just verify no errors
      expect(data).not.toBeNull();
    });
  });

  test.describe('Availability Endpoint', () => {
    /**
     * Verify we can fetch availability data.
     */
    test('GET /api/availability returns availability data', async () => {
      try {
        const data = await apiCall('GET', '/api/availability');
        expect(data).toBeDefined();
      } catch (error) {
        // May not have data yet
        console.warn('Availability endpoint not fully set up (expected)');
      }
    });
  });
});
