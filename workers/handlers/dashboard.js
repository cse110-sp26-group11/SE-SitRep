import { DEFAULT_TEAM_ID } from '../lib/config.js';
import { getQueryParam } from '../lib/request.js';
import { jsonResponse, validationError } from '../lib/responses.js';
import { getMetricTone, mapIssueRow, mapWorkflowRow } from '../lib/dashboard-mappers.js';
import { normalizeDate } from '../lib/validation.js';

function normalizeDateFromUrl(url) {
  try {
    return normalizeDate(url.searchParams.get('date'), 'date');
  } catch (error) {
    return { error };
  }
}

async function fetchTeam(env, teamId) {
  return env.DB.prepare(
    `
      SELECT id, name, repo_owner, repo_name, sprint_name
      FROM teams
      WHERE id = ?
    `
  ).bind(teamId).first();
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

async function fetchStandupStats(env, teamId, date) {
  return env.DB.prepare(
    `
      SELECT
        COUNT(*) AS checked_in_count,
        SUM(CASE WHEN blocker IS NOT NULL AND blocker != '' THEN 1 ELSE 0 END) AS blocker_count,
        SUM(CASE WHEN include_github = 1 THEN 1 ELSE 0 END) AS github_attached_count
      FROM standups
      WHERE team_id = ? AND standup_date = ?
    `
  ).bind(teamId, date).first();
}

async function fetchIssueRows(env, teamId) {
  const { results } = await env.DB.prepare(
    `
      SELECT
        github_issue_snapshots.id,
        github_issue_snapshots.issue_number,
        github_issue_snapshots.title,
        github_issue_snapshots.status,
        github_issue_snapshots.owner_user_id,
        users.display_name AS owner_display_name,
        github_issue_snapshots.difficulty,
        github_issue_snapshots.deadline,
        github_issue_snapshots.risk,
        github_issue_snapshots.labels_json,
        github_issue_snapshots.html_url,
        github_issue_snapshots.synced_at
      FROM github_issue_snapshots
      LEFT JOIN users ON users.id = github_issue_snapshots.owner_user_id
      WHERE github_issue_snapshots.team_id = ?
      ORDER BY
        CASE github_issue_snapshots.risk
          WHEN 'high' THEN 0
          WHEN 'medium' THEN 1
          WHEN 'low' THEN 2
          ELSE 3
        END,
        github_issue_snapshots.deadline ASC,
        github_issue_snapshots.issue_number ASC
    `
  ).bind(teamId).all();

  return results;
}

async function fetchWorkflowRows(env, teamId) {
  const { results } = await env.DB.prepare(
    `
      SELECT
        id,
        workflow_name,
        branch,
        status,
        duration_seconds,
        passed_tests,
        failed_tests,
        run_url,
        created_at,
        synced_at
      FROM github_workflow_snapshots
      WHERE team_id = ?
      ORDER BY created_at DESC
    `
  ).bind(teamId).all();

  return results;
}

function getDueSoonCount(issues, date) {
  const today = new Date(`${date}T00:00:00Z`);
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

  return issues.filter(issue => {
    if (!issue.deadline) return false;

    const deadline = new Date(`${issue.deadline}T00:00:00Z`);
    const diff = deadline.getTime() - today.getTime();

    return diff >= 0 && diff <= twoDaysMs;
  }).length;
}

function getOpenIssueCount(issues) {
  return issues.filter(issue => !['closed', 'done'].includes(String(issue.status).toLowerCase())).length;
}

function getFailingWorkflowCount(workflows) {
  return workflows.filter(workflow => workflow.status === 'failing').length;
}

function buildMetrics({
  activeMemberCount,
  checkedInCount,
  blockerCount,
  openIssueCount,
  failingWorkflowCount,
  dueSoonCount,
}) {
  return {
    checkedIn: {
      label: 'Checked in today',
      value: checkedInCount,
      total: activeMemberCount,
      completionRate: activeMemberCount ? checkedInCount / activeMemberCount : 0,
      tone: checkedInCount === activeMemberCount ? 'success' : 'warning',
    },
    blockers: {
      label: 'Active blockers',
      value: blockerCount,
      tone: getMetricTone(blockerCount),
    },
    openIssues: {
      label: 'Open issues',
      value: openIssueCount,
      tone: openIssueCount ? 'neutral' : 'success',
    },
    failingWorkflows: {
      label: 'Failing workflows',
      value: failingWorkflowCount,
      tone: failingWorkflowCount ? 'danger' : 'success',
    },
    dueSoon: {
      label: 'Due in 48h',
      value: dueSoonCount,
      tone: dueSoonCount ? 'warning' : 'success',
    },
  };
}

export async function handleGetDashboard(env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID);
  const date = normalizeDateFromUrl(url);

  if (date.error) {
    return validationError(date.error.message);
  }

  const [team, activeMemberCount, standupStats, issueRows, workflowRows] = await Promise.all([
    fetchTeam(env, teamId),
    fetchActiveMemberCount(env, teamId),
    fetchStandupStats(env, teamId, date),
    fetchIssueRows(env, teamId),
    fetchWorkflowRows(env, teamId),
  ]);

  const issues = issueRows.map(mapIssueRow);
  const workflows = workflowRows.map(mapWorkflowRow);
  const checkedInCount = standupStats?.checked_in_count || 0;
  const blockerCount = standupStats?.blocker_count || 0;
  const openIssueCount = getOpenIssueCount(issues);
  const failingWorkflowCount = getFailingWorkflowCount(workflows);
  const dueSoonCount = getDueSoonCount(issues, date);

  return jsonResponse({
    team: team
      ? {
          id: team.id,
          name: team.name,
          repoOwner: team.repo_owner,
          repoName: team.repo_name,
          sprintName: team.sprint_name,
        }
      : null,
    teamId,
    date,
    metrics: buildMetrics({
      activeMemberCount,
      checkedInCount,
      blockerCount,
      openIssueCount,
      failingWorkflowCount,
      dueSoonCount,
    }),
    repoPulse: [
      { label: 'Open issues', value: openIssueCount, tone: openIssueCount ? 'neutral' : 'success' },
      { label: 'Blocked updates', value: blockerCount, tone: blockerCount ? 'warning' : 'success' },
      {
        label: 'Failing workflows',
        value: failingWorkflowCount,
        tone: failingWorkflowCount ? 'danger' : 'success',
      },
      { label: 'Due in 48h', value: dueSoonCount, tone: dueSoonCount ? 'warning' : 'success' },
    ],
    issues,
    workflows,
  });
}
