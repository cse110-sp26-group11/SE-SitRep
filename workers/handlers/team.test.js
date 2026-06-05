import { describe, it, expect, vi } from 'vitest'
import { handleTeam } from './team.js'
import { readJsonResponse } from '../lib/test-utils.js'

describe('handleTeam', () => {
    it('returns 404 when team is not found', async () => {
        const env = {
            DB: {
                prepare: vi.fn(() => ({
                    bind: vi.fn(() => ({
                        first: vi.fn().mockResolvedValue(null)
                    }))
                }))
            }
        }

        const url = new URL('http://localhost/api/team?teamId=999')

        const res = await handleTeam(env, url)

        expect(res.status).toBe(404)

        const body = await readJsonResponse(res)
        expect(body.error).toBe('Team not found')
    })

    it('returns formatted team and members', async () => {
        const mockTeam = {
            id: 1,
            name: 'Team Alpha',
            repo_owner: 'org',
            repo_name: 'repo',
            sprint_name: 'Sprint 1',
            created_at: '2026-01-01',
            updated_at: '2026-01-02'
        }

        const mockMembers = [
            {
                id: 10,
                display_name: 'Alice',
                initials: 'AL',
                github_username: 'aliceGH',
                avatar_color_key: 'blue',
                role: 'dev',
                is_lead: 1,
                active: 1,
                joined_at: '2026-01-01'
            },
            {
                id: 11,
                display_name: 'Bob',
                initials: 'BO',
                github_username: 'bobGH',
                avatar_color_key: 'red',
                role: 'qa',
                is_lead: 0,
                active: 0,
                joined_at: '2026-01-03'
            }
        ]

        const dbMock = {
            prepare: vi.fn()
                .mockReturnValueOnce({
                    bind: vi.fn(() => ({
                        first: vi.fn().mockResolvedValue(mockTeam)
                    }))
                })
                .mockReturnValueOnce({
                    bind: vi.fn(() => ({
                        all: vi.fn().mockResolvedValue({ results: mockMembers })
                    }))
                })
        }

        const env = { DB: dbMock }
        const url = new URL('http://localhost/api/team?teamId=1')

        const res = await handleTeam(env, url)
        const body = await readJsonResponse(res)

        expect(res.status).toBe(200)

        expect(body.team.name).toBe('Team Alpha')
        expect(body.team.repoOwner).toBe('org')
        expect(body.team.sprintName).toBe('Sprint 1')

        expect(body.members.length).toBe(2)

        expect(body.members[0]).toEqual(
            expect.objectContaining({
                displayName: 'Alice',
                isLead: true,
                active: true
            })
        )

        expect(body.members[1]).toEqual(
            expect.objectContaining({
                displayName: 'Bob',
                isLead: false,
                active: false
            })
        )
    })
})