function normalizeStatus(status) {
  return String(status || '').toLowerCase();
}

export function getDueThisWeekCount(issues, date) {
  const today = new Date(`${date}T00:00:00Z`);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  return issues.filter(issue => {
    if (!issue.deadline) return false;

    const deadline = new Date(`${issue.deadline}T00:00:00Z`);
    const diff = deadline.getTime() - today.getTime();

    return diff >= 0 && diff <= sevenDaysMs;
  }).length;
}

export function getDeadlineRisks(issues) {
  return issues.filter(issue => issue.risk && issue.risk !== 'low');
}

export function getIssueDistribution(issues) {
  return {
    hardIssues: issues.filter(issue => issue.difficulty === 'Hard').length,
    inProgress: issues.filter(issue => normalizeStatus(issue.status) === 'in progress').length,
    blocked: issues.filter(issue => normalizeStatus(issue.status) === 'blocked').length,
    inReview: issues.filter(issue => normalizeStatus(issue.status) === 'review').length,
  };
}

export function getWorkflowPassingRatio(workflows) {
  const total = workflows.length;
  const passing = workflows.filter(workflow => workflow.status === 'passing').length;

  return {
    passing,
    total,
    ratio: total ? passing / total : 0,
  };
}

export function getStandupFiledRatio(checkedInCount, activeMemberCount) {
  return {
    filed: checkedInCount,
    total: activeMemberCount,
    ratio: activeMemberCount ? checkedInCount / activeMemberCount : 0,
  };
}

export function buildHealthMetrics({
  activeMemberCount,
  checkedInCount,
  dueThisWeekCount,
  workflows,
}) {
  const standupsFiled = getStandupFiledRatio(checkedInCount, activeMemberCount);
  const workflowsPassing = getWorkflowPassingRatio(workflows);

  return [
    {
      label: 'Sprint completion',
      value: `${Math.round(standupsFiled.ratio * 100)}%`,
      numericValue: standupsFiled.ratio,
    },
    {
      label: 'Workflows passing',
      value: `${workflowsPassing.passing}/${workflowsPassing.total}`,
      numericValue: workflowsPassing.ratio,
    },
    {
      label: 'Due this week',
      value: `${dueThisWeekCount} issues`,
      numericValue: dueThisWeekCount,
    },
    {
      label: 'Standups filed',
      value: `${standupsFiled.filed}/${standupsFiled.total}`,
      numericValue: standupsFiled.ratio,
    },
  ];
}
