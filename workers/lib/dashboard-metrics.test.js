import { describe, expect, it } from 'vitest'
import {
  buildMetrics,
  getDueSoonCount,
  getFailingWorkflowCount,
  getOpenIssueCount
} from './dashboard-metrics.js'

describe('dashboard metric calculations', () => {
  it('counts issues due within 48 hours and ignores past or later deadlines', () => {
    const issues = [
      { deadline: '2026-05-10' },
      { deadline: '2026-05-11' },
      { deadline: '2026-05-12' },
      { deadline: '2026-05-13' },
      { deadline: '2026-05-09' },
      { deadline: null }
    ]

    expect(getDueSoonCount(issues, '2026-05-10')).toBe(3)
  })

  it('counts open issues while treating closed and done as not open', () => {
    const issues = [
      { status: 'Todo' },
      { status: 'In progress' },
      { status: 'Review' },
      { status: 'Closed' },
      { status: 'done' }
    ]

    expect(getOpenIssueCount(issues)).toBe(3)
  })

  it('counts failing workflows only', () => {
    const workflows = [
      { status: 'passing' },
      { status: 'failing' },
      { status: 'running' },
      { status: 'failing' }
    ]

    expect(getFailingWorkflowCount(workflows)).toBe(2)
  })

  it('builds dashboard metric objects with expected tones and completion rate', () => {
    expect(buildMetrics({
      activeMemberCount: 5,
      checkedInCount: 4,
      blockerCount: 1,
      openIssueCount: 3,
      failingWorkflowCount: 1,
      dueSoonCount: 2
    })).toMatchObject({
      checkedIn: {
        value: 4,
        total: 5,
        completionRate: 0.8,
        tone: 'warning'
      },
      blockers: {
        value: 1,
        tone: 'warning'
      },
      openIssues: {
        value: 3,
        tone: 'neutral'
      },
      failingWorkflows: {
        value: 1,
        tone: 'danger'
      },
      dueSoon: {
        value: 2,
        tone: 'warning'
      }
    })
  })

  it('handles zero active members without dividing by zero', () => {
    expect(buildMetrics({
      activeMemberCount: 0,
      checkedInCount: 0,
      blockerCount: 0,
      openIssueCount: 0,
      failingWorkflowCount: 0,
      dueSoonCount: 0
    })).toMatchObject({
      checkedIn: {
        completionRate: 0,
        tone: 'success'
      },
      blockers: { tone: 'success' },
      openIssues: { tone: 'success' },
      failingWorkflows: { tone: 'success' },
      dueSoon: { tone: 'success' }
    })
  })
})
