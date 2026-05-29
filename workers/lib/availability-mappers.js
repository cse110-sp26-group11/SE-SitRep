export function mapAvailabilityRow(row) {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    weekStart: row.week_start,
    dayIndex: row.day_index,
    slotIndex: row.slot_index,
    slotLabel: row.slot_label,
    status: row.status,
    updatedAt: row.updated_at,
    member: {
      id: row.user_id,
      displayName: row.display_name,
      initials: row.initials,
      githubUsername: row.github_username,
      avatarColorKey: row.avatar_color_key
    }
  }
}

export function getAvailabilityWeight(status) {
  if (status === 'available') return 1
  if (status === 'maybe') return 0.5
  return 0
}

export function mapOverlapSlot(slot) {
  return {
    teamId: slot.teamId,
    weekStart: slot.weekStart,
    dayIndex: slot.dayIndex,
    slotIndex: slot.slotIndex,
    slotLabel: slot.slotLabel,
    score: slot.score,
    availableCount: slot.availableCount,
    maybeCount: slot.maybeCount,
    busyCount: slot.busyCount,
    totalMembers: slot.totalMembers,
    members: slot.members
  }
}
