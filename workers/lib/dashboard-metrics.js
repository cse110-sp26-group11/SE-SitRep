import { getMetricTone } from './dashboard-mappers.js';

export function getDueSoonCount(issues, date) {
  const today = new Date(`${date}T00:00:00Z`);
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

  return issues.filter(issue => {
    if (!issue.deadline) return false;

    const deadline = new Date(`${issue.deadline}T00:00:00Z`);
    const diff = deadline.getTime() - today.getTime();

    return diff >= 0 && diff <= twoDaysMs;
  }).length;
}

export function getOpenIssueCount(issues) {
  return issues.filter(issue => !['closed', 'done'].includes(String(issue.status).toLowerCase())).length;
}

export function getFailingWorkflowCount(workflows) {
  return workflows.filter(workflow => workflow.status === 'failing').length;
}

export function buildMetrics({
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
