import { handleGithubAuth } from './handlers/auth.js'
import { handleConfig } from './handlers/config.js'
import {
  handleGetAvailability,
  handleGetAvailabilityOverlap,
  handleUpdateMyAvailability
} from './handlers/availability.js'
import { handleHealth } from './handlers/health.js'
import { handleGetIssues } from './handlers/issues.js'
import { handleGetSprintHealth } from './handlers/sprint-health.js'
import {
  handleCreateStandup,
  handleGetStandups,
  handleUpdateStandup
} from './handlers/standups.js'
import { handleDashboard } from './handlers/dashboard.js'
import { handleTeam } from './handlers/team.js'
import {
  handleCreateTeam,
  handleGetTeams,
  handleJoinTeam,
  handleSyncGithubTeam,
  handleUpdateTeamMember
} from './handlers/teams.js'
import { handleGetWorkflows } from './handlers/workflows.js'
import { getPathParts } from './lib/request.js'
import { errorResponse } from './lib/responses.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

/**
 * Adds CORS headers to a response.
 * @param {Response} response - Response from a route handler.
 * @returns {Response} Response with CORS headers.
 */
function addCorsHeaders (response) {
  const headers = new Headers(response.headers)
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
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
  } else if (request.method === 'GET' && url.pathname === '/api/teams') {
    response = await handleGetTeams(env, url)
  } else if (request.method === 'POST' && url.pathname === '/api/teams') {
    response = await handleCreateTeam(request, env)
  } else if (request.method === 'GET' && url.pathname === '/api/team') {
    response = await handleTeam(env, url)
  } else if (request.method === 'GET' && url.pathname === '/api/dashboard') {
    response = await handleDashboard(env, url)
  } else if (request.method === 'GET' && url.pathname === '/api/issues') {
    response = await handleGetIssues(env, url)
  } else if (request.method === 'GET' && url.pathname === '/api/workflows') {
    response = await handleGetWorkflows(env, url)
  } else if (request.method === 'GET' && url.pathname === '/api/sprint-health') {
    response = await handleGetSprintHealth(env, url)
  } else if (request.method === 'POST' && url.pathname === '/api/auth/github') {
    response = await handleGithubAuth(request, env)
  } else if (pathParts[0] === 'api' && pathParts[1] === 'teams') {
    if (request.method === 'POST' && pathParts.length === 4 && pathParts[3] === 'join') {
      response = await handleJoinTeam(request, env, pathParts[2])
    } else if (
      request.method === 'PUT' &&
      pathParts.length === 5 &&
      pathParts[3] === 'members'
    ) {
      response = await handleUpdateTeamMember(request, env, pathParts[2], pathParts[4])
    } else if (request.method === 'POST' && pathParts.length === 4 && pathParts[3] === 'sync-github') {
      response = await handleSyncGithubTeam(request, env, pathParts[2])
    } else {
      response = errorResponse('Method not allowed', 405)
    }
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

  return addCorsHeaders(response)
}
