import { DEFAULT_TEAM_ID } from '../lib/config.js'
import { mapWorkflowRow } from '../lib/dashboard-mappers.js'
import { fetchWorkflowRows } from '../lib/github-snapshots.js'
import { getQueryParam } from '../lib/request.js'
import { jsonResponse } from '../lib/responses.js'

export async function handleGetWorkflows (env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID)
  const workflowRows = await fetchWorkflowRows(env, teamId)

  return jsonResponse({
    teamId,
    workflows: workflowRows.map(mapWorkflowRow)
  })
}
