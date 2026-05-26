export async function fetchIssueRows(env, teamId) {
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

export async function fetchWorkflowRows(env, teamId) {
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
