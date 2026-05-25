function parseLabels(labelsJson) {
  try {
    const labels = JSON.parse(labelsJson || '[]');
    return Array.isArray(labels) ? labels : [];
  } catch {
    return [];
  }
}

export function mapIssueRow(row) {
  return {
    id: row.id,
    issueNumber: row.issue_number,
    title: row.title,
    status: row.status,
    owner: row.owner_display_name,
    ownerUserId: row.owner_user_id,
    difficulty: row.difficulty,
    deadline: row.deadline,
    risk: row.risk,
    labels: parseLabels(row.labels_json),
    url: row.html_url,
    syncedAt: row.synced_at,
  };
}

export function mapWorkflowRow(row) {
  return {
    id: row.id,
    name: row.workflow_name,
    branch: row.branch,
    status: row.status,
    durationSeconds: row.duration_seconds,
    passedTests: row.passed_tests,
    failedTests: row.failed_tests,
    url: row.run_url,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
  };
}

export function getMetricTone(value, warningThreshold = 1) {
  return value >= warningThreshold ? 'warning' : 'success';
}
