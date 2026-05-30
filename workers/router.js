import { handleGithubAuth } from './handlers/auth.js'
import { handleConfig } from './handlers/config.js'
import {
  handleGetAvailability,
  handleGetAvailabilityOverlap,
  handleUpdateMyAvailability
} from './handlers/availability.js'
import { handleHealth } from './handlers/health.js'
import {
  handleCreateStandup,
  handleGetStandups,
  handleUpdateStandup
} from './handlers/standups.js'
import { handleTeam } from './handlers/team.js'
import { getPathParts } from './lib/request.js'
import { errorResponse } from './lib/responses.js'

// CORS headers to add to all responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

/**
 * Adds CORS headers to a response
 * @param {Response} response - The response object
 * @returns {Response} Response with CORS headers added
 */
function addCorsHeaders (response) {
  const newHeaders = new Headers(response.headers)
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    newHeaders.set(key, value)
  })
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}

/**
 * Routes API requests to the matching Worker handler.
 * @param {Request} request - Incoming Worker request.
 * @param {object} env - Worker environment bindings.
 * @returns {Promise<Response>} Routed response with CORS headers.
 */
export async function routeRequest (request, env) {
  const url = new URL(request.url)
  const pathParts = getPathParts(url)

  // Handle CORS preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS
    })
  }

  let response

  if (request.method === 'GET' && url.pathname === '/api/health') {
    response = await handleHealth(env)
  } else if (request.method === 'GET' && url.pathname === '/api/config') {
    response = handleConfig(env)
  } else if (request.method === 'GET' && url.pathname === '/api/team') {
    response = await handleTeam(env, url)
  } else if (request.method === 'POST' && url.pathname === '/api/auth/github') {
    response = await handleGithubAuth(request, env)
  } else if (pathParts[0] === 'api' && pathParts[1] === 'standups') {
    if (request.method === 'GET' && pathParts.length === 2) {
      response = await handleGetStandups(env, url)
    } else if (request.method === 'POST' && pathParts.length === 2) {
      response = await handleCreateStandup(request, env)
    } else if (request.method === 'PUT' && pathParts.length === 3) {
      response = await handleUpdateStandup(request, env, pathParts[2])
    } else {
      response = errorResponse('Method not allowed', 405)
    }
  } else if (pathParts[0] === 'api' && pathParts[1] === 'availability') {
    if (request.method === 'GET' && pathParts.length === 2) {
      response = await handleGetAvailability(env, url)
    } else if (request.method === 'PUT' && pathParts.length === 3 && pathParts[2] === 'me') {
      response = await handleUpdateMyAvailability(request, env)
    } else if (request.method === 'GET' && pathParts.length === 3 && pathParts[2] === 'overlap') {
      response = await handleGetAvailabilityOverlap(env, url)
    } else {
      response = errorResponse('Method not allowed', 405)
    }
  } else {
    response = errorResponse('Not found', 404)
  }

  // Add CORS headers to every response
  return addCorsHeaders(response)
}
