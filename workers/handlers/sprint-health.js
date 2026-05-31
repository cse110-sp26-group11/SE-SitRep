import { DEFAULT_TEAM_ID } from '../lib/config.js';
import { mapIssueRow, mapWorkflowRow } from '../lib/dashboard-mappers.js';
import { fetchIssueRows, fetchWorkflowRows } from '../lib/github-snapshots.js';
import { getQueryParam } from '../lib/request.js';
import { jsonResponse, validationError } from '../lib/responses.js';
import {
  mapDeadlineRisk,
  mapIssueDistribution,
  mapWorkflowTrend,
} from '../lib/sprint-health-mappers.js';
import {
  buildHealthMetrics,
  getDeadlineRisks,
  getDueThisWeekCount,
  getIssueDistribution,
} from '../lib/sprint-health-metrics.js';
import { normalizeDate } from '../lib/validation.js';

function normalizeDateFromUrl(url) {
  try {
    return normalizeDate(url.searchParams.get('date'), 'date');
  } catch (error) {
    return { error };
  }
}

async function fetchActiveMemberCount(env, teamId) {
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS count
      FROM team_members
      WHERE team_id = ? AND active = 1
    `
  ).bind(teamId).first();

  return row?.count || 0;
}

async function fetchCheckedInCount(env, teamId, date) {
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS count
      FROM standups
      WHERE team_id = ? AND standup_date = ?
    `
  ).bind(teamId, date).first();

  return row?.count || 0;
}

export async function handleGetSprintHealth(env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID);
  const date = normalizeDateFromUrl(url);

  if (date.error) {
    return validationError(date.error.message);
  }

  const [activeMemberCount, checkedInCount, issueRows, workflowRows] = await Promise.all([
    fetchActiveMemberCount(env, teamId),
    fetchCheckedInCount(env, teamId, date),
    fetchIssueRows(env, teamId),
    fetchWorkflowRows(env, teamId),
  ]);

  const issues = issueRows.map(mapIssueRow);
  const workflows = workflowRows.map(mapWorkflowRow);
  const dueThisWeekCount = getDueThisWeekCount(issues, date);

  return jsonResponse({
    teamId,
    date,
    healthMetrics: buildHealthMetrics({
      activeMemberCount,
      checkedInCount,
      dueThisWeekCount,
      workflows,
    }),
    deadlineRisks: getDeadlineRisks(issues).map(mapDeadlineRisk),
    workflowTrend: workflows.map(mapWorkflowTrend),
    issueDistribution: mapIssueDistribution(getIssueDistribution(issues)),
  });
}
