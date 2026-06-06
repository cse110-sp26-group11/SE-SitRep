import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authenticatedJsonRequest,
  createIntegrationEnv,
  readJson
} from './lib/integration-test-utils.js'
import { routeRequest } from './router.js'

describe('api integration', () => {
  let integration

  beforeEach(async () => {
    integration = await createIntegrationEnv()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await integration?.dispose()
    integration = undefined
  })

  it('reads seeded team data through the router', async () => {
    const response = await routeRequest(
      new Request('http://localhost/api/team?teamId=team-demo'),
      integration.env
    )
    const payload = await readJson(response)

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(payload.team).toMatchObject({
      id: 'team-demo',
      name: 'SE SitRep Demo Team',
      repoOwner: 'cse110-sp26-group11',
      repoName: 'SE-SitRep'
    })
    expect(payload.members).toHaveLength(5)
    expect(payload.members[0]).toMatchObject({
      id: 'user-arav',
      displayName: 'Arav Kumar',
      isLead: true,
      active: true
    })
  })

  it('creates a standup, persists it, and returns it from the listing route', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('standup-integration-maya')

    const createResponse = await routeRequest(authenticatedJsonRequest(
      'http://localhost/api/standups',
      {
        teamId: 'team-demo',
        userId: 'user-maya',
        standupDate: '2026-06-05',
        yesterday: 'Finished dashboard polish',
        today: 'Writing integration tests',
        blocker: null,
        availability: 'available',
        includeGithub: false,
        notifyLead: true,
        githubActivitySummary: null
      },
      'user-maya'
    ), integration.env)
    const createPayload = await readJson(createResponse)

    expect(createResponse.status).toBe(201)
    expect(createPayload.standup).toMatchObject({
      id: 'standup-integration-maya',
      userId: 'user-maya',
      teamId: 'team-demo',
      today: 'Writing integration tests',
      includeGithub: false,
      notifyLead: true
    })

    const listResponse = await routeRequest(
      new Request('http://localhost/api/standups?teamId=team-demo&date=2026-06-05'),
      integration.env
    )
    const listPayload = await readJson(listResponse)

    expect(listResponse.status).toBe(200)
    expect(listPayload.standups).toEqual([
      expect.objectContaining({
        id: 'standup-integration-maya',
        userId: 'user-maya',
        today: 'Writing integration tests'
      })
    ])
  })

  it('updates availability with real D1 conflict handling and recomputes overlap', async () => {
    const updateResponse = await routeRequest(authenticatedJsonRequest(
      'http://localhost/api/availability/me',
      {
        teamId: 'team-demo',
        userId: 'user-maya',
        weekStart: '2026-06-08',
        slots: [
          {
            dayIndex: 1,
            slotIndex: 4,
            slotLabel: '1 PM',
            status: 'available'
          },
          {
            dayIndex: 2,
            slotIndex: 4,
            slotLabel: '1 PM',
            status: 'busy'
          }
        ]
      },
      'user-maya',
      'PUT'
    ), integration.env)
    const updatePayload = await readJson(updateResponse)

    expect(updateResponse.status).toBe(200)
    expect(updatePayload.slots).toHaveLength(2)
    expect(updatePayload.slots[0]).toMatchObject({
      teamId: 'team-demo',
      userId: 'user-maya',
      weekStart: '2026-06-08',
      dayIndex: 1,
      slotIndex: 4,
      status: 'available'
    })

    const overlapResponse = await routeRequest(
      new Request('http://localhost/api/availability/overlap?teamId=team-demo&weekStart=2026-06-08'),
      integration.env
    )
    const overlapPayload = await readJson(overlapResponse)

    expect(overlapResponse.status).toBe(200)
    expect(overlapPayload.overlap[0]).toMatchObject({
      teamId: 'team-demo',
      weekStart: '2026-06-08',
      dayIndex: 1,
      slotIndex: 4,
      score: 1,
      availableCount: 1,
      busyCount: 4,
      totalMembers: 5
    })
  })

  it('returns validation and auth errors without mutating data', async () => {
    const invalidResponse = await routeRequest(authenticatedJsonRequest(
      'http://localhost/api/standups',
      {
        teamId: 'team-demo',
        userId: 'user-arav',
        standupDate: '2026-06-05',
        today: '',
        availability: 'available'
      },
      'user-arav'
    ), integration.env)
    const invalidPayload = await readJson(invalidResponse)

    expect(invalidResponse.status).toBe(400)
    expect(invalidPayload.error).toBe('today is required')

    const forbiddenResponse = await routeRequest(authenticatedJsonRequest(
      'http://localhost/api/standups',
      {
        teamId: 'team-demo',
        userId: 'user-arav',
        standupDate: '2026-06-05',
        today: 'Trying to impersonate another member',
        availability: 'available'
      },
      'user-maya'
    ), integration.env)
    const forbiddenPayload = await readJson(forbiddenResponse)

    expect(forbiddenResponse.status).toBe(403)
    expect(forbiddenPayload.error).toBe('You can only create your own standup')

    const listResponse = await routeRequest(
      new Request('http://localhost/api/standups?teamId=team-demo&date=2026-06-05'),
      integration.env
    )
    const listPayload = await readJson(listResponse)

    expect(listPayload.standups).toEqual([])
  })
})
