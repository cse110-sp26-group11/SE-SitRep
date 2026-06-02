import { describe, expect, it } from 'vitest'
import { createMockD1, readJsonResponse } from '../lib/test-utils.js'
import { handleHealth } from './health.js'

describe('health handler', () => {
  it('checks database reachability and returns service status', async () => {
    const { DB, queries } = createMockD1([
      {
        match: /SELECT 1 AS ok/,
        method: 'first',
        result: { ok: 1 }
      }
    ])

    const response = await handleHealth({ DB })
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      status: 'ok',
      service: 'se-sitrep-api',
      database: 'reachable'
    })
    expect(queries).toHaveLength(1)
    expect(queries[0].method).toBe('first')
  })
})
