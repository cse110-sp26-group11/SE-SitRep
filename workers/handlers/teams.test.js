import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createMockD1,
  jsonRequest,
  mockRandomUUID,
  readJsonResponse
} from '../lib/test-utils.js'
import {
  handleCreateTeam,
  handleGetTeams,
  handleJoinTeam,
  handleSyncGithubTeam,
  handleUpdateTeamMember
} from './teams.js'

describe('teams handlers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists teams for a specific user membership', async () => {
    const { DB, queries } = createMockD1([
      {
        match: /FROM team_members\s+JOIN teams/,
        method: 'all',
        result: {
          results: [
            {
              id: 'team-demo',
              name: 'Demo Team',
              repo_owner: 'owner',
              repo_name: 'repo',
              sprint_name: 'Sprint 1',
              role: 'member',
              is_lead: 0,
              active: 1,
              created_at: '2026-06-01',
              updated_at: '2026-06-01'
            }
          ]
        }
      }
    ])

    const response = await handleGetTeams({ DB }, new URL('http://localhost/api/teams?userId=user-1'))
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(200)
    expect(payload.teams).toEqual([
      {
        id: 'team-demo',
        name: 'Demo Team',
        repoOwner: 'owner',
        repoName: 'repo',
        sprintName: 'Sprint 1',
        role: 'member',
        isLead: false,
        active: true,
        createdAt: '2026-06-01',
        updatedAt: '2026-06-01'
      }
    ])
    expect(queries[0].bindings).toEqual(['user-1'])
  })

  it('creates a team and assigns the creator as owner', async () => {
    mockRandomUUID('abcdef12-0000-4000-8000-000000000000')
    const { DB, queries } = createMockD1([
      {
        match: /INSERT INTO teams/,
        method: 'run',
        result: { success: true }
      },
      {
        match: /INSERT INTO team_members/,
        method: 'run',
        result: { success: true }
      }
    ])
    const request = jsonRequest('http://localhost/api/teams', {
      name: 'Team Eleven',
      repoOwner: 'cse110-sp26-group11',
      repoName: 'SE-SitRep',
      sprintName: 'Sprint 4',
      currentUserId: 'user-github-1'
    })

    const response = await handleCreateTeam(request, { DB })
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(201)
    expect(payload.team).toEqual({
      id: 'team-eleven-abcdef12',
      name: 'Team Eleven',
      repoOwner: 'cse110-sp26-group11',
      repoName: 'SE-SitRep',
      sprintName: 'Sprint 4'
    })
    expect(queries.find(query => /INSERT INTO team_members/.test(query.sql)).bindings).toEqual([
      'team-eleven-abcdef12',
      'user-github-1',
      'owner',
      1
    ])
  })

  it('joins an existing team as a member', async () => {
    const { DB, queries } = createMockD1([
      {
        match: /SELECT id FROM teams/,
        method: 'first',
        result: { id: 'team-demo' }
      },
      {
        match: /INSERT INTO team_members/,
        method: 'run',
        result: { success: true }
      }
    ])
    const request = jsonRequest('http://localhost/api/teams/team-demo/join', {
      userId: 'user-github-1',
      role: 'owner'
    })

    const response = await handleJoinTeam(request, { DB }, 'team-demo')
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      teamId: 'team-demo',
      userId: 'user-github-1',
      role: 'member'
    })
    expect(queries.find(query => /INSERT INTO team_members/.test(query.sql)).bindings).toEqual([
      'team-demo',
      'user-github-1',
      'member',
      0
    ])
  })

  it('rejects member updates from non-lead members', async () => {
    const { DB } = createMockD1([
      {
        match: /FROM team_members\s+WHERE team_id = \? AND user_id = \?/,
        method: 'first',
        result: {
          role: 'member',
          is_lead: 0,
          active: 1
        }
      }
    ])
    const request = jsonRequest('http://localhost/api/teams/team-demo/members/user-2', {
      actingUserId: 'user-1',
      role: 'lead'
    }, 'PUT')

    const response = await handleUpdateTeamMember(request, { DB }, 'team-demo', 'user-2')
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'You do not have permission to manage this team' })
  })

  it('validates sync requests before calling GitHub sync', async () => {
    const response = await handleSyncGithubTeam(jsonRequest(
      'http://localhost/api/teams/team-demo/sync-github',
      {}
    ), {}, 'team-demo')
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'actingUserId is required' })
  })
})
