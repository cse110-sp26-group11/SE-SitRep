import { errorResponse, jsonResponse } from '../lib/responses.js'

/**
 * Returns public frontend configuration.
 * @param {object} env - Worker environment bindings.
 * @returns {Response} Public configuration response.
 */
export function handleConfig (env) {
  if (!env.GITHUB_CLIENT_ID) {
    return errorResponse('GitHub client ID is not configured', 500)
  }

  return jsonResponse({
    githubClientId: env.GITHUB_CLIENT_ID
  })
}
