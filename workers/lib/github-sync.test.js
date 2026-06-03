import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockD1 } from './test-utils.js'
import { syncGithubRepo } from './github-sync.js'

describe('github repo sync', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('syncs contributors, hydrates profile names, and imports open issues', async () => {
    const savedUsers = {
      alice: {
        id: 'user-github-1',
        display_name: 'Alice Anderson',
        initials: 'AA',
        github_username: 'alice',
        avatar_color_key: 'aa'
      },
      bob: {
        id: 'user-github-2',
        display_name: 'bob',
        initials: 'BO',
        github_username: 'bob',
        avatar_color_key: 'bo'
      }
    }
    const { DB, queries } = createMockD1([
      {
        match: /SELECT id, repo_owner, repo_name\s+FROM teams/,
        method: 'first',
        result: {
          id: 'team-demo',
          repo_owner: 'owner',
          repo_name: 'repo'
        }
      },
      {
        match: /INSERT INTO users/,
        method: 'run',
        result: { success: true }
      },
      {
        match: /SELECT id, display_name, initials, github_username, avatar_color_key\s+FROM users/,
        method: 'first',
        result: query => savedUsers[query.bindings[0]]
      },
      {
        match: /INSERT INTO team_members/,
        method: 'run',
        result: { success: true }
      },
      {
        match: /INSERT INTO github_issue_snapshots/,
        method: 'run',
        result: { success: true }
      }
    ])

    vi.stubGlobal('fetch', vi.fn(async url => {
      const parsedUrl = new URL(url)
      const path = parsedUrl.pathname

      if (path === '/repos/owner/repo/contributors') {
        return jsonFetchResponse([
          { id: 1, login: 'alice' },
          { id: 2, login: 'bob' }
        ])
      }

      if (path === '/repos/owner/repo/issues') {
        return jsonFetchResponse([
          {
            number: 5,
            title: 'Fix blocked workflow',
            state: 'open',
            labels: [{ name: 'blocked' }],
            assignees: [{ id: 1, login: 'alice' }],
            html_url: 'https://github.com/owner/repo/issues/5'
          },
          {
            number: 6,
            title: 'Pull request should be ignored',
            state: 'open',
            labels: [],
            assignees: [],
            pull_request: {},
            html_url: 'https://github.com/owner/repo/pull/6'
          }
        ])
      }

      if (path === '/users/alice') {
        return jsonFetchResponse({ id: 1, login: 'alice', name: 'Alice Anderson' })
      }

      if (path === '/users/bob') {
        return jsonFetchResponse({ id: 2, login: 'bob', name: null })
      }

      return jsonFetchResponse({ message: 'not found' }, 404)
    }))

    const summary = await syncGithubRepo({ DB, GITHUB_ACCESS_TOKEN: 'token-1' }, 'team-demo')

    expect(summary).toEqual({
      teamId: 'team-demo',
      repo: 'owner/repo',
      usersSynced: 2,
      issuesSynced: 1
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/users/alice',
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    )
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/users/bob',
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    )

    const userInsertQueries = queries.filter(query => /INSERT INTO users/.test(query.sql))
    expect(userInsertQueries[0].bindings).toEqual([
      'user-github-1',
      'Alice Anderson',
      'AA',
      'alice',
      'aa'
    ])
    expect(userInsertQueries[1].bindings).toEqual([
      'user-github-2',
      'bob',
      'BO',
      'bob',
      'bo'
    ])

    const issueInsert = queries.find(query => /INSERT INTO github_issue_snapshots/.test(query.sql))
    expect(issueInsert.bindings).toEqual([
      'issue-team-demo-5',
      'team-demo',
      'owner/repo',
      5,
      'Fix blocked workflow',
      'Blocked',
      'user-github-1',
      null,
      null,
      'high',
      '["blocked"]',
      'https://github.com/owner/repo/issues/5'
    ])
  })
})

/**
 * Builds a fetch Response with JSON body.
 * @param {object|object[]} body Response body.
 * @param {number} status HTTP status.
 * @returns {Response} Fetch response.
 */
function jsonFetchResponse (body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  })
}
