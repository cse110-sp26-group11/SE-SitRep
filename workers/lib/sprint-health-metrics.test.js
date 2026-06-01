import { describe, expect, it } from 'vitest'
import {
  buildHealthMetrics,
  getDeadlineRisks,
  getDueThisWeekCount,
  getIssueDistribution,
  getStandupFiledRatio,
  getWorkflowPassingRatio
} from './sprint-health-metrics.js'

describe('sprint health metrics', () => {
  it('counts issues due within seven days', () => {
    const issues = [
      { deadline: '2026-05-10' },
      { deadline: '2026-05-13' },
      { deadline: '2026-05-17' },
      { deadline: '2026-05-18' },
      { deadline: '2026-05-09' },
      { deadline: null }
    ]

    expect(getDueThisWeekCount(issues, '2026-05-10')).toBe(3)
  })

  it('returns non-low deadline risks', () => {
    expect(getDeadlineRisks([
      { risk: 'high' },
      { risk: 'medium' },
      { risk: 'low' },
      { risk: null }
    ])).toHaveLength(2)
  })

  it('calculates issue distribution buckets', () => {
    expect(getIssueDistribution([
      { difficulty: 'Hard', status: 'Blocked' },
      { difficulty: 'Medium', status: 'In progress' },
      { difficulty: 'Hard', status: 'Review' },
      { difficulty: 'Easy', status: 'Todo' }
    ])).toEqual({
      hardIssues: 2,
      inProgress: 1,
      blocked: 1,
      inReview: 1
    })
  })

  it('calculates workflow passing ratio', () => {
    expect(getWorkflowPassingRatio([
      { status: 'passing' },
      { status: 'failing' },
      { status: 'passing' }
    ])).toEqual({
      passing: 2,
      total: 3,
      ratio: 2 / 3
    })
  })

  it('calculates standup filed ratio', () => {
    expect(getStandupFiledRatio(3, 5)).toEqual({
      filed: 3,
      total: 5,
      ratio: 0.6
    })
  })

  it('builds health metric display values', () => {
    expect(buildHealthMetrics({
      activeMemberCount: 5,
      checkedInCount: 4,
      dueThisWeekCount: 2,
      workflows: [{ status: 'passing' }, { status: 'failing' }]
    })).toEqual([
      { label: 'Sprint completion', value: '80%', numericValue: 0.8 },
      { label: 'Workflows passing', value: '1/2', numericValue: 0.5 },
      { label: 'Due this week', value: '2 issues', numericValue: 2 },
      { label: 'Standups filed', value: '4/5', numericValue: 0.8 }
    ])
  })
})
