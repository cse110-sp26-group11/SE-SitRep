import { describe, expect, it } from 'vitest'
import { createMockD1 } from './lib/test-utils.js'
import { routeRequest } from './router.js'

describe('api router', () => {
  it('handles CORS preflight requests', async () => {
    const response = await routeRequest(new Request('http://localhost/api/team', {
      method: 'OPTIONS'
    }), {})

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })

  it('routes health requests and adds CORS headers', async () => {
    const { DB } = createMockD1([
      {
        match: /SELECT 1 AS ok/,
        method: 'first',
        result: { ok: 1 }
      }
    ])

    const response = await routeRequest(new Request('http://localhost/api/health'), { DB })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(payload.status).toBe('ok')
  })

  it('returns not found for unknown API routes', async () => {
    const response = await routeRequest(new Request('http://localhost/api/missing'), {})
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toEqual({ error: 'Not found' })
  })
})
