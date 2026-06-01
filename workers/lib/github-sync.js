import { upsertGithubUser, upsertTeamMember } from './team-membership.js'

const GITHUB_API_BASE = 'https://api.github.com'

/**
 * Builds headers for GitHub API requests.
 * @param {object} env Worker environment bindings.
 * @returns {Headers} GitHub request headers.
 */
function buildGithubHeaders (env) {
  const headers = new Headers({
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SE-SitRep/1.0',
    'X-GitHub-Api-Version': '2022-11-28'
  })

  if (env.GITHUB_ACCESS_TOKEN) {
    headers.set('Authorization', `Bearer ${env.GITHUB_ACCESS_TOKEN}`)
  }

  return headers
}

/**
 * Fetches one JSON page from GitHub.
 * @param {object} env Worker environment bindings.
 * @param {string} path GitHub API path.
 * @returns {Promise<object[]>} Parsed JSON array.
 */
async function fetchGithubPage (env, path) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers: buildGithubHeaders(env)
  })

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetches open repo issues, excluding pull requests.
 * @param {object} env Worker environment bindings.
 * @param {string} owner Repo owner.
 * @param {string} repo Repo name.
 * @returns {Promise<object[]>} Open GitHub issues.
 */
async function fetchOpenIssues (env, owner, repo) {
  const issues = await fetchGithubPage(
    env,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=100`
  )

  return issues.filter(issue => !issue.pull_request)
}

/**
 * Fetches public repo contributors.
 * @param {object} env Worker environment bindings.
 * @param {string} owner Repo owner.
 * @param {string} repo Repo name.
 * @returns {Promise<object[]>} GitHub contributors.
 */
async function fetchContributors (env, owner, repo) {
  return fetchGithubPage(
    env,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=100`
  )
}

/**
 * Fetches a GitHub user's public profile so display names are available.
 * @param {object} env Worker environment bindings.
 * @param {string} login GitHub username.
 * @returns {Promise<object>} GitHub user profile.
 */
async function fetchGithubUser (env, login) {
  return fetchGithubPage(env, `/users/${encodeURIComponent(login)}`)
}

/**
 * Saves a GitHub user after hydrating profile fields not present in repo lists.
 * @param {object} env Worker environment bindings.
 * @param {Map<string, object>} syncedUsersByLogin User cache by GitHub login.
 * @param {object} githubUser Partial GitHub user object.
 * @param {string} teamId Team id.
 * @returns {Promise<object>} Saved app user profile.
 */
async function syncGithubUser (env, syncedUsersByLogin, githubUser, teamId) {
  if (syncedUsersByLogin.has(githubUser.login)) {
    return syncedUsersByLogin.get(githubUser.login)
  }

  const detailedUser = githubUser.name === undefined
    ? await fetchGithubUser(env, githubUser.login)
    : githubUser
  const user = await upsertGithubUser(env, detailedUser)
  await upsertTeamMember(env, teamId, user.id)
  syncedUsersByLogin.set(user.githubUsername, user)
  return user
}

/**
 * Maps issue labels into dashboard risk.
 * @param {object[]} labels GitHub issue labels.
 * @returns {string} Risk label.
 */
function inferIssueRisk (labels) {
  const labelNames = labels.map(label => label.name.toLowerCase())

  if (labelNames.some(label => ['blocked', 'blocker', 'high-risk', 'high'].includes(label))) {
    return 'high'
  }

  if (labelNames.some(label => ['medium-risk', 'medium', 'needs-review'].includes(label))) {
    return 'medium'
  }

  return 'low'
}

/**
 * Maps issue labels into dashboard status.
 * @param {object} issue GitHub issue.
 * @returns {string} Dashboard status.
 */
function inferIssueStatus (issue) {
  const labelNames = issue.labels.map(label => label.name.toLowerCase())

  if (labelNames.some(label => ['blocked', 'blocker'].includes(label))) {
    return 'Blocked'
  }

  if (labelNames.some(label => ['in-progress', 'doing', 'wip'].includes(label))) {
    return 'In Progress'
  }

  return issue.state === 'open' ? 'Todo' : 'Done'
}

/**
 * Imports repo contributors and open issues into team tables.
 * @param {object} env Worker environment bindings.
 * @param {string} teamId Team id.
 * @returns {Promise<object>} Sync summary.
 */
export async function syncGithubRepo (env, teamId) {
  const team = await env.DB.prepare(`
    SELECT id, repo_owner, repo_name
    FROM teams
    WHERE id = ?
  `).bind(teamId).first()

  if (!team) {
    throw new Error('Team not found')
  }

  if (!team.repo_owner || !team.repo_name) {
    throw new Error('Team does not have a GitHub repo configured')
  }

  const [contributors, issues] = await Promise.all([
    fetchContributors(env, team.repo_owner, team.repo_name),
    fetchOpenIssues(env, team.repo_owner, team.repo_name)
  ])
  const syncedUsersByLogin = new Map()

  for (const contributor of contributors) {
    await syncGithubUser(env, syncedUsersByLogin, contributor, teamId)
  }

  for (const issue of issues) {
    for (const assignee of issue.assignees || []) {
      await syncGithubUser(env, syncedUsersByLogin, assignee, teamId)
    }

    const primaryAssignee = issue.assignees?.[0]
    const ownerUser = primaryAssignee ? syncedUsersByLogin.get(primaryAssignee.login) : null
    const labelsJson = JSON.stringify(issue.labels.map(label => label.name))

    await env.DB.prepare(`
      INSERT INTO github_issue_snapshots (
        id,
        team_id,
        repo,
        issue_number,
        title,
        status,
        owner_user_id,
        difficulty,
        deadline,
        risk,
        labels_json,
        html_url,
        synced_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(repo, issue_number) DO UPDATE SET
        team_id = excluded.team_id,
        title = excluded.title,
        status = excluded.status,
        owner_user_id = excluded.owner_user_id,
        risk = excluded.risk,
        labels_json = excluded.labels_json,
        html_url = excluded.html_url,
        synced_at = CURRENT_TIMESTAMP
    `).bind(
      `issue-${teamId}-${issue.number}`,
      teamId,
      `${team.repo_owner}/${team.repo_name}`,
      issue.number,
      issue.title,
      inferIssueStatus(issue),
      ownerUser?.id || null,
      null,
      null,
      inferIssueRisk(issue.labels),
      labelsJson,
      issue.html_url
    ).run()
  }

  return {
    teamId,
    repo: `${team.repo_owner}/${team.repo_name}`,
    usersSynced: syncedUsersByLogin.size,
    issuesSynced: issues.length
  }
}
