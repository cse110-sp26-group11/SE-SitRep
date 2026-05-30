import {
  handleGetAvailability,
  handleGetAvailabilityOverlap,
  handleUpdateMyAvailability,
} from './handlers/availability.js';
import { handleGetDashboard } from './handlers/dashboard.js';
import { handleHealth } from './handlers/health.js';
import { handleGetIssues } from './handlers/issues.js';
import { handleGetSprintHealth } from './handlers/sprint-health.js';
import {
  handleCreateStandup,
  handleGetStandups,
  handleUpdateStandup,
} from './handlers/standups.js';
import { handleDashboard } from './handlers/dashboard.js';
import { handleTeam } from './handlers/team.js';
import { handleGetWorkflows } from './handlers/workflows.js';
import { getPathParts } from './lib/request.js';
import { errorResponse } from './lib/responses.js';

export async function routeRequest(request, env) {
  const url = new URL(request.url);
  const pathParts = getPathParts(url);

  if (request.method === 'GET' && url.pathname === '/api/health') {
    return handleHealth(env);
  }

  if (request.method === 'GET' && url.pathname === '/api/team') {
    return handleTeam(env, url);
  }

  if (request.method === 'GET' && url.pathname === '/api/dashboard') {
    return handleGetDashboard(env, url);
  }

  if (request.method === 'GET' && url.pathname === '/api/issues') {
    return handleGetIssues(env, url);
  }

  if (request.method === 'GET' && url.pathname === '/api/workflows') {
    return handleGetWorkflows(env, url);
  }

  if (request.method === 'GET' && url.pathname === '/api/sprint-health') {
    return handleGetSprintHealth(env, url);
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'standups') {
    if (request.method === 'GET' && pathParts.length === 2) {
      return handleGetStandups(env, url);
    }

    if (request.method === 'POST' && pathParts.length === 2) {
      return handleCreateStandup(request, env);
    }

    if (request.method === 'PUT' && pathParts.length === 3) {
      return handleUpdateStandup(request, env, pathParts[2]);
    }

    return errorResponse('Method not allowed', 405);
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'availability') {
    if (request.method === 'GET' && pathParts.length === 2) {
      return handleGetAvailability(env, url);
    }

    if (request.method === 'PUT' && pathParts.length === 3 && pathParts[2] === 'me') {
      return handleUpdateMyAvailability(request, env);
    }

    if (request.method === 'GET' && pathParts.length === 3 && pathParts[2] === 'overlap') {
      return handleGetAvailabilityOverlap(env, url);
    }

    return errorResponse('Method not allowed', 405);
  }

  return errorResponse('Not found', 404);
}
