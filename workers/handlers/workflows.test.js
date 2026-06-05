import { describe, it, expect, vi } from 'vitest'
import { handleGetWorkflows } from './workflows.js'
import * as githubSnapshots from '../lib/github-snapshots.js'
import * as mappers from '../lib/dashboard-mappers.js'
import { readJsonResponse } from '../lib/test-utils.js'
import { DEFAULT_TEAM_ID } from '../lib/config.js'

vi.mock('../lib/github-snapshots.js')
vi.mock('../lib/dashboard-mappers.js')

describe('handleGetWorkflows', () => {
    it('returns workflows for provided teamId', async () => {
        githubSnapshots.fetchWorkflowRows.mockResolvedValue([
            { id: 1, raw: 'a' },
            { id: 2, raw: 'b' }
        ])

        mappers.mapWorkflowRow.mockImplementation(row => ({
            workflowId: row.id,
            mapped: true
        }))

        const env = {}
        const url = new URL('http://localhost/api/workflows?teamId=5')

        const res = await handleGetWorkflows(env, url)
        const body = await readJsonResponse(res)

        expect(body.teamId).toBe('5')
        expect(body.workflows.length).toBe(2)

        expect(body.workflows[0]).toEqual({
            workflowId: 1,
            mapped: true
        })
    })

    it('uses DEFAULT_TEAM_ID when teamId is missing', async () => {
        githubSnapshots.fetchWorkflowRows.mockResolvedValue([
            { id: 99 }
        ])

        mappers.mapWorkflowRow.mockReturnValue({
            workflowId: 99
        })

        const env = {}
        const url = new URL('http://localhost/api/workflows')

        const res = await handleGetWorkflows(env, url)
        const body = await readJsonResponse(res)

        expect(body.teamId).toBe(DEFAULT_TEAM_ID)
        expect(body.workflows.length).toBe(1)
    })
})