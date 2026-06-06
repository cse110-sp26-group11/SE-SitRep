import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  authenticatedJsonRequest,
  createIntegrationEnv
} from '../lib/integration-test-utils.js'
import { routeRequest } from '../router.js'

const USER_ID = 'user-availability-test'
const WEEK_START = '2026-06-08'

function availabilityRequest (teamId, status) {
  return authenticatedJsonRequest(
    'http://localhost/api/availability/me',
    {
      teamId,
      userId: USER_ID,
      weekStart: WEEK_START,
      slots: [
        {
          dayIndex: 1,
          slotIndex: 4,
          slotLabel: '1 PM',
          status
        }
      ]
    },
    USER_ID,
    'PUT'
  )
}

describe('availability D1 integration', () => {
  let integration

  beforeEach(async () => {
    integration = await createIntegrationEnv({ seed: false })

    await integration.DB.batch([
      integration.DB.prepare(
        'INSERT INTO teams (id, name) VALUES (?, ?)'
      ).bind('team-alpha', 'Team Alpha'),
      integration.DB.prepare(
        'INSERT INTO teams (id, name) VALUES (?, ?)'
      ).bind('team-beta', 'Team Beta'),
      integration.DB.prepare(
        'INSERT INTO users (id, display_name, initials) VALUES (?, ?, ?)'
      ).bind(USER_ID, 'Availability Tester', 'AT'),
      integration.DB.prepare(
        'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)'
      ).bind('team-alpha', USER_ID),
      integration.DB.prepare(
        'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)'
      ).bind('team-beta', USER_ID)
    ])
  })

  afterEach(async () => {
    await integration?.dispose()
    integration = undefined
  })

  it('stores the same user and slot in different teams without an id collision', async () => {
    const firstResponse = await routeRequest(
      availabilityRequest('team-alpha', 'available'),
      integration.env
    )
    const secondResponse = await routeRequest(
      availabilityRequest('team-beta', 'available'),
      integration.env
    )

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)

    const { results } = await integration.DB.prepare(`
      SELECT id, team_id
      FROM availability_slots
      WHERE user_id = ?
        AND week_start = ?
        AND day_index = ?
        AND slot_index = ?
      ORDER BY team_id ASC
    `).bind(USER_ID, WEEK_START, 1, 4).all()

    expect(results).toHaveLength(2)
    expect(results.map(row => row.team_id)).toEqual([
      'team-alpha',
      'team-beta'
    ])
    expect(new Set(results.map(row => row.id)).size).toBe(2)
  })

  it('updates one existing team slot instead of inserting a duplicate row', async () => {
    const createResponse = await routeRequest(
      availabilityRequest('team-alpha', 'available'),
      integration.env
    )
    expect(createResponse.status).toBe(200)

    const original = await integration.DB.prepare(`
      SELECT id, status
      FROM availability_slots
      WHERE team_id = ?
        AND user_id = ?
        AND week_start = ?
        AND day_index = ?
        AND slot_index = ?
    `).bind('team-alpha', USER_ID, WEEK_START, 1, 4).first()

    const updateResponse = await routeRequest(
      availabilityRequest('team-alpha', 'maybe'),
      integration.env
    )
    expect(updateResponse.status).toBe(200)

    const { results } = await integration.DB.prepare(`
      SELECT id, status
      FROM availability_slots
      WHERE team_id = ?
        AND user_id = ?
        AND week_start = ?
        AND day_index = ?
        AND slot_index = ?
    `).bind('team-alpha', USER_ID, WEEK_START, 1, 4).all()

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: original.id,
      status: 'maybe'
    })
  })
})
