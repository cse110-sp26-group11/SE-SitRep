import { DEFAULT_TEAM_ID } from '../lib/config.js'
import { getQueryParam } from '../lib/request.js'
import { errorResponse, jsonResponse } from '../lib/responses.js'
import { mapStandupRow } from '../lib/standup-mappers.js'

function formatDateYmd(date) {
  return date.toISOString().slice(0, 10)
}

function getTodayYmd() {
  return formatDateYmd(new Date())
}

function addDaysYmd(ymd, days) {
  const date = new Date(`${ymd}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDateYmd(date)
}

function formatDisplayDate(ymd) {
  if (!ymd) {
    return 'No date'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${ymd}T00:00:00Z`))
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return 'just now'
  }

  const then = new Date(timestamp.includes('T') ? timestamp : `${timestamp.replace(' ', 'T')}Z`)
  const diffMinutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000))

  if (diffMinutes < 1) {
    return 'just now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays}d ago`
}

function formatDuration(durationSeconds) {
  if (!durationSeconds && durationSeconds !== 0) {
    return 'Unknown'
  }

  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function parseLabels(labelsJson) {
  try {
    const parsed = JSON.parse(labelsJson || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function clampPercent(numerator, denominator) {
  if (!denominator) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)))
}

function buildSummary(team, standups, activeMemberCount, issues, workflows) {
  const standupCount = standups.length
  const blockers = standups.filter((standup) => standup.isBlocker)
  const failingWorkflows = workflows.filter((workflow) => workflow.status === 'failing')
  const deadlineRisks = issues.filter((issue) => issue.risk !== 'low')
  const completionRate = clampPercent(standupCount, activeMemberCount)

  const body = `${standupCount} of ${activeMemberCount} teammates checked in for ${team.sprint_name}, ${blockers.length} blocker${blockers.length === 1 ? '' : 's'} need follow-up, and ${failingWorkflows.length} workflow${failingWorkflows.length === 1 ? '' : 's'} are currently failing.`

  const blockerItems = [
    ...blockers
      .slice(0, 2)
      .map((standup) => `${standup.name || 'A teammate'} is blocked on ${standup.blocker}.`),
    ...failingWorkflows
      .slice(0, 1)
      .map((workflow) => `${workflow.name} is ${workflow.status}, which is increasing merge risk.`),
    ...deadlineRisks
      .slice(0, 1)
      .map(
        (issue) => `Issue #${issue.id} is carrying ${issue.risk} risk ahead of ${issue.deadline}.`
      )
  ].slice(0, 3)

  const actions = []
  if (blockers.length) {
    actions.push(
      `Resolve ${blockers[0].name || 'the current'} blocker first so the feed is no longer carrying a blocked status.`
    )
  }
  if (failingWorkflows.length) {
    actions.push(
      `Address ${failingWorkflows[0].name} before merging more work into ${failingWorkflows[0].branch}.`
    )
  }
  if (deadlineRisks.length) {
    actions.push(
      `Review issue #${deadlineRisks[0].id} because it is both due soon and marked ${deadlineRisks[0].risk} risk.`
    )
  }
  if (!actions.length) {
    actions.push('No urgent follow-up surfaced from the current sprint data.')
  }

  return {
    body,
    highlights: [
      { value: `${completionRate}%`, label: 'Check-in completion' },
      { value: String(blockers.length), label: 'Urgent blockers' },
      { value: String(failingWorkflows.length), label: 'Failing pipelines' }
    ],
    blockers: blockerItems.length
      ? blockerItems
      : ['No blockers are currently flagged in standups or workflows.'],
    actions,
    brief: [
      { label: 'Frontend scope', value: 'Standups, feed, and availability are live' },
      {
        label: 'Biggest risk',
        value: failingWorkflows[0]
          ? `${failingWorkflows[0].name} still failing`
          : 'No failing workflows'
      },
      { label: 'Needs lead help', value: blockers[0]?.blocker || 'No blocker currently escalated' },
      {
        label: 'Next handoff',
        value: deadlineRisks[0]
          ? `Review issue #${deadlineRisks[0].id}`
          : 'Continue sprint execution'
      }
    ]
  }
}

export async function handleDashboard(env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID)

  const team = await env.DB.prepare(
    `
      SELECT id, name, sprint_name
      FROM teams
      WHERE id = ?
    `
  )
    .bind(teamId)
    .first()

  if (!team) {
    return errorResponse('Team not found', 404)
  }

  const activeMembersResult = await env.DB.prepare(
    `
      SELECT COUNT(*) AS active_count
      FROM team_members
      WHERE team_id = ? AND active = 1
    `
  )
    .bind(teamId)
    .first()

  const latestStandup = await env.DB.prepare(
    `
      SELECT standup_date
      FROM standups
      WHERE team_id = ?
      ORDER BY standup_date DESC
      LIMIT 1
    `
  )
    .bind(teamId)
    .first()

  const selectedDate = getQueryParam(url, 'date', latestStandup?.standup_date || getTodayYmd())
  const dueSoonEndDate = addDaysYmd(selectedDate, 2)

  const { results: standupRows } = await env.DB.prepare(
    `
      SELECT
        standups.id,
        standups.team_id,
        standups.user_id,
        standups.standup_date,
        standups.yesterday,
        standups.today,
        standups.blocker,
        standups.availability,
        standups.include_github,
        standups.notify_lead,
        standups.github_activity_summary,
        standups.submitted_at,
        standups.updated_at,
        users.display_name,
        users.initials,
        users.github_username,
        users.avatar_color_key,
        team_members.is_lead
      FROM standups
      JOIN users ON users.id = standups.user_id
      JOIN team_members
        ON team_members.team_id = standups.team_id
        AND team_members.user_id = standups.user_id
      WHERE standups.team_id = ? AND standups.standup_date = ?
      ORDER BY standups.submitted_at DESC
    `
  )
    .bind(teamId, selectedDate)
    .all()

  const standups = standupRows.map(mapStandupRow)

  const { results: issueRows } = await env.DB.prepare(
    `
      SELECT
        github_issue_snapshots.issue_number,
        github_issue_snapshots.title,
        github_issue_snapshots.status,
        github_issue_snapshots.difficulty,
        github_issue_snapshots.deadline,
        github_issue_snapshots.risk,
        github_issue_snapshots.labels_json,
        users.display_name AS owner_display_name
      FROM github_issue_snapshots
      LEFT JOIN users ON users.id = github_issue_snapshots.owner_user_id
      WHERE github_issue_snapshots.team_id = ?
      ORDER BY
        CASE github_issue_snapshots.risk
          WHEN 'high' THEN 0
          WHEN 'medium' THEN 1
          ELSE 2
        END,
        github_issue_snapshots.deadline ASC,
        github_issue_snapshots.issue_number ASC
    `
  )
    .bind(teamId)
    .all()

  const issues = issueRows.map((issue) => ({
    id: issue.issue_number,
    title: issue.title,
    status: issue.status,
    owner: issue.owner_display_name || 'Unassigned',
    difficulty: issue.difficulty || 'Unknown',
    deadline: formatDisplayDate(issue.deadline),
    deadlineDate: issue.deadline,
    labels: parseLabels(issue.labels_json),
    risk: issue.risk || 'low'
  }))

  const { results: workflowRows } = await env.DB.prepare(
    `
      SELECT
        workflow_name,
        branch,
        status,
        duration_seconds,
        passed_tests,
        failed_tests,
        created_at
      FROM github_workflow_snapshots
      WHERE team_id = ?
      ORDER BY datetime(created_at) DESC
    `
  )
    .bind(teamId)
    .all()

  const workflows = workflowRows.map((workflow) => ({
    name: workflow.workflow_name,
    status: workflow.status,
    branch: workflow.branch,
    timeAgo: formatRelativeTime(workflow.created_at),
    duration: formatDuration(workflow.duration_seconds),
    passedTests: workflow.passed_tests,
    failedTests: workflow.failed_tests
  }))

  const activeMemberCount = Number(activeMembersResult?.active_count || 0)
  const blockedCount = standups.filter((standup) => standup.isBlocker).length
  const failingWorkflowCount = workflows.filter((workflow) => workflow.status === 'failing').length
  const dueSoonCount = issues.filter((issue) => {
    return (
      Boolean(issue.deadlineDate) &&
      issue.deadlineDate >= selectedDate &&
      issue.deadlineDate <= dueSoonEndDate
    )
  }).length
  const availableToday = standups.filter((standup) => standup.availability === 'available').length

  const sprintCompletion = clampPercent(
    issues.filter((issue) => ['Review', 'Done'].includes(issue.status)).length,
    issues.length || 1
  )

  return jsonResponse({
    teamId,
    date: selectedDate,
    repoPulse: {
      openIssues: issues.length,
      blockedUpdates: blockedCount,
      failingWorkflows: failingWorkflowCount,
      dueSoon: dueSoonCount,
      availableToday,
      standupsFiled: standups.length,
      activeMembers: activeMemberCount
    },
    issues,
    workflows,
    summary: buildSummary(team, standups, activeMemberCount, issues, workflows),
    sprintHealth: {
      metrics: [
        { label: 'Sprint completion', value: `${sprintCompletion}%` },
        {
          label: 'Workflows passing',
          value: `${workflows.filter((workflow) => workflow.status === 'passing').length}/${workflows.length || 0}`
        },
        {
          label: 'Due this week',
          value: `${issues.filter((issue) => issue.deadlineDate && issue.deadlineDate >= selectedDate && issue.deadlineDate <= addDaysYmd(selectedDate, 7)).length} issues`
        },
        { label: 'Standups filed', value: `${standups.length}/${activeMemberCount || 0}` }
      ],
      deadlineRisks: issues.filter((issue) => issue.risk !== 'low'),
      workflowTrend: workflows,
      issueDistribution: [
        {
          label: 'Hard issues',
          value: issues.filter((issue) => issue.difficulty === 'Hard').length
        },
        {
          label: 'In progress',
          value: issues.filter((issue) => issue.status === 'In progress').length
        },
        { label: 'Blocked', value: issues.filter((issue) => issue.status === 'Blocked').length },
        { label: 'In review', value: issues.filter((issue) => issue.status === 'Review').length }
      ]
    }
  })
}
