import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  authenticatedJsonRequest,
  createIntegrationEnv,
  readJson
} from '../lib/integration-test-utils.js'
import { routeRequest } from '../router.js'

const TEAM_ID = 'team-join-test'
const USER_ID = 'user-join-test'

function joinTeamRequest (teamId = TEAM_ID) {
  return authenticatedJsonRequest(
    `http://localhost/api/teams/${teamId}/join`,
    { userId: USER_ID },
    USER_ID
  )
}

describe('join team D1 integration', () => {
  let integration

  beforeEach(async () => {
    integration = await createIntegrationEnv({ seed: false })

    await integration.DB.batch([
      integration.DB.prepare(
        'INSERT INTO teams (id, name) VALUES (?, ?)'
      ).bind(TEAM_ID, 'Join Test Team'),
      integration.DB.prepare(
        'INSERT INTO users (id, display_name, initials) VALUES (?, ?, ?)'
      ).bind(USER_ID, 'Join Tester', 'JT')
    ])
  })

  afterEach(async () => {
    await integration?.dispose()
    integration = undefined
  })

  it('persists a membership when a user joins an existing team', async () => {
    const response = await routeRequest(joinTeamRequest(), integration.env)
    const payload = await readJson(response)

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      teamId: TEAM_ID,
      userId: USER_ID,
      role: 'member'
    })

    const membership = await integration.DB.prepare(`
      SELECT team_id, user_id, role, is_lead, active
      FROM team_members
      WHERE team_id = ? AND user_id = ?
    `).bind(TEAM_ID, USER_ID).first()

    expect(membership).toEqual({
      team_id: TEAM_ID,
      user_id: USER_ID,
      role: 'member',
      is_lead: 0,
      active: 1
    })
  })

  it('does not create a duplicate membership when the user joins again', async () => {
    const firstResponse = await routeRequest(joinTeamRequest(), integration.env)
    const secondResponse = await routeRequest(joinTeamRequest(), integration.env)

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)

    const row = await integration.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM team_members
      WHERE team_id = ? AND user_id = ?
    `).bind(TEAM_ID, USER_ID).first()

    expect(row.count).toBe(1)
  })

  it('returns 404 without creating a membership when the team is missing', async () => {
    const response = await routeRequest(
      joinTeamRequest('team-missing'),
      integration.env
    )
    const payload = await readJson(response)

    expect(response.status).toBe(404)
    expect(payload).toEqual({ error: 'Team not found' })

    const row = await integration.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM team_members
      WHERE user_id = ?
    `).bind(USER_ID).first()

    expect(row.count).toBe(0)
  })
})
