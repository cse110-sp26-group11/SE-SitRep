import { DEFAULT_TEAM_ID } from '../lib/config.js'
import { mapIssueRow } from '../lib/dashboard-mappers.js'
import { fetchIssueRows } from '../lib/github-snapshots.js'
import { getQueryParam } from '../lib/request.js'
import { jsonResponse } from '../lib/responses.js'

export async function handleGetIssues (env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID)
  const issueRows = await fetchIssueRows(env, teamId)

  return jsonResponse({
    teamId,
    issues: issueRows.map(mapIssueRow)
  })
}
