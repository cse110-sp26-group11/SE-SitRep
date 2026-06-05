import { describe, expect, it } from 'vitest'
import { handleUpdateMyAvailability } from './availability.js'
import {
  createMockD1,
  readJsonResponse
} from '../lib/test-utils.js'

function createSessionToken (userId) {
  return btoa(JSON.stringify({ userId }))
}

function validPayload (overrides = {}) {
  return {
    teamId: 'team-1',
    userId: 'user-1',
    weekStart: '2026-06-08',
    slots: [
      {
        dayIndex: 1,
        slotIndex: 20,
        slotLabel: '10:00 AM',
        status: 'available'
      }
    ],
    ...overrides
  }
}

function availabilityRequest (body, userId = 'user-1') {
  return new Request('http://localhost/api/availability/me', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${createSessionToken(userId)}`
    },
    body: JSON.stringify(body)
  })
}

function addBatchSupport (DB) {
  DB.batch = async statements => {
    for (const statement of statements) {
      await statement.run()
    }

    return statements.map(() => ({ success: true }))
  }

  return DB
}

describe('availability handler', () => {
  it('updates my availability and returns saved slots', async () => {
    const { DB, queries } = createMockD1([
      {
        match: /FROM team_members\s+WHERE team_id = \? AND user_id = \? AND active = 1/,
        method: 'first',
        result: {
          team_id: 'team-1',
          user_id: 'user-1'
        }
      },
      {
        match: /INSERT INTO availability_slots/,
        method: 'run',
        result: { success: true }
      },
      {
        match: /FROM availability_slots/,
        method: 'all',
        result: {
          results: [
            {
              id: 'avail-1-1-2026-06-08-1-20',
              team_id: 'team-1',
              user_id: 'user-1',
              week_start: '2026-06-08',
              day_index: 1,
              slot_index: 20,
              slot_label: '10:00 AM',
              status: 'available',
              updated_at: '2026-06-08T10:00:00Z',
              display_name: 'Alice',
              initials: 'AL',
              github_username: 'alice',
              avatar_color_key: 'blue'
            }
          ]
        }
      }
    ])

    const request = availabilityRequest(validPayload())

    const response = await handleUpdateMyAvailability(request, {
      DB: addBatchSupport(DB)
    })
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(200)
    expect(payload.teamId).toBe('team-1')
    expect(payload.userId).toBe('user-1')
    expect(payload.weekStart).toBe('2026-06-08')
    expect(payload.slots).toHaveLength(1)

    expect(queries.some(query => /INSERT INTO availability_slots/.test(query.sql))).toBe(true)
  })

  it('rejects requests without authentication', async () => {
    const { DB } = createMockD1()
    const request = new Request('http://localhost/api/availability/me', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(validPayload())
    })

    const response = await handleUpdateMyAvailability(request, { DB })
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Authentication required' })
  })

  it('rejects updates for another user', async () => {
    const { DB } = createMockD1()
    const request = availabilityRequest(validPayload({
      userId: 'user-2'
    }), 'user-1')

    const response = await handleUpdateMyAvailability(request, { DB })
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'You can only update your own availability' })
  })
})