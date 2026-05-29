function getBadgeForMember(member) {
  if (member.is_lead) {
    return { badgeLabel: 'lead', badgeType: 'lead' }
  }

  return { badgeLabel: null, badgeType: null }
}

export function mapStandupRow(row) {
  const hasBlocker = Boolean(row.blocker)
  const leadBadge = getBadgeForMember(row)

  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    name: row.display_name,
    initials: row.initials,
    githubUsername: row.github_username,
    avatarColorKey: row.avatar_color_key,
    status: hasBlocker ? 'blocked' : row.is_lead ? 'lead' : row.availability,
    badgeLabel: hasBlocker ? 'blocked' : leadBadge.badgeLabel,
    badgeType: hasBlocker ? 'blocked' : leadBadge.badgeType,
    standupDate: row.standup_date,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    today: row.today,
    yesterday: row.yesterday,
    blocker: row.blocker,
    availability: row.availability,
    includeGithub: Boolean(row.include_github),
    notifyLead: Boolean(row.notify_lead),
    githubActivitySummary: row.github_activity_summary,
    isBlocker: hasBlocker
  }
}
