export function mapDeadlineRisk (issue) {
  return {
    id: issue.id,
    issueNumber: issue.issueNumber,
    title: issue.title,
    owner: issue.owner,
    ownerUserId: issue.ownerUserId,
    status: issue.status,
    difficulty: issue.difficulty,
    deadline: issue.deadline,
    risk: issue.risk,
    labels: issue.labels,
    url: issue.url
  }
}

export function mapWorkflowTrend (workflow) {
  return {
    id: workflow.id,
    name: workflow.name,
    branch: workflow.branch,
    status: workflow.status,
    durationSeconds: workflow.durationSeconds,
    passedTests: workflow.passedTests,
    failedTests: workflow.failedTests,
    url: workflow.url,
    createdAt: workflow.createdAt
  }
}

export function mapIssueDistribution (distribution) {
  return [
    { label: 'Hard issues', value: distribution.hardIssues },
    { label: 'In progress', value: distribution.inProgress },
    { label: 'Blocked', value: distribution.blocked },
    { label: 'In review', value: distribution.inReview }
  ]
}
