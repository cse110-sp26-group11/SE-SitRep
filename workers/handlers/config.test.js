import { describe, expect, it } from 'vitest'
import { handleConfig } from './config.js'
import { readJsonResponse } from '../lib/test-utils.js'

describe('config handler', () => {
  it('returns the public GitHub client id', async () => {
    const response = handleConfig({ GITHUB_CLIENT_ID: 'client-123' })
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(200)
    expect(payload).toEqual({ githubClientId: 'client-123' })
  })

  it('returns a server error when client id is missing', async () => {
    const response = handleConfig({})
    const payload = await readJsonResponse(response)

    expect(response.status).toBe(500)
    expect(payload).toEqual({ error: 'GitHub client ID is not configured' })
  })
})
