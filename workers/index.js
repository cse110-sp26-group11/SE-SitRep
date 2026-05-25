const DEFAULT_TEAM_ID = 'team-demo';

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

function getQueryParam(url, name, fallback) {
  const value = url.searchParams.get(name);
  return value && value.trim() ? value.trim() : fallback;
}

function getBadgeForMember(member) {
  if (member.is_lead) {
    return { badgeLabel: 'lead', badgeType: 'lead' };
  }

  return { badgeLabel: null, badgeType: null };
}

function mapStandupRow(row) {
  const hasBlocker = Boolean(row.blocker);
  const leadBadge = getBadgeForMember(row);

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
    isBlocker: hasBlocker,
  };
}

async function handleHealth(env) {
  await env.DB.prepare('SELECT 1 AS ok').first();

  return jsonResponse({
    status: 'ok',
    service: 'se-sitrep-api',
    database: 'reachable',
  });
}

async function handleTeam(env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID);

  const team = await env.DB.prepare(
    `
      SELECT id, name, repo_owner, repo_name, sprint_name, created_at, updated_at
      FROM teams
      WHERE id = ?
    `
  ).bind(teamId).first();

  if (!team) {
    return errorResponse('Team not found', 404);
  }

  const { results: members } = await env.DB.prepare(
    `
      SELECT
        users.id,
        users.display_name,
        users.initials,
        users.github_username,
        users.avatar_color_key,
        team_members.role,
        team_members.is_lead,
        team_members.active,
        team_members.joined_at
      FROM team_members
      JOIN users ON users.id = team_members.user_id
      WHERE team_members.team_id = ?
      ORDER BY team_members.is_lead DESC, users.display_name ASC
    `
  ).bind(teamId).all();

  return jsonResponse({
    team: {
      id: team.id,
      name: team.name,
      repoOwner: team.repo_owner,
      repoName: team.repo_name,
      sprintName: team.sprint_name,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
    },
    members: members.map(member => ({
      id: member.id,
      displayName: member.display_name,
      initials: member.initials,
      githubUsername: member.github_username,
      avatarColorKey: member.avatar_color_key,
      role: member.role,
      isLead: Boolean(member.is_lead),
      active: Boolean(member.active),
      joinedAt: member.joined_at,
    })),
  });
}

async function handleStandups(env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID);
  const date = url.searchParams.get('date');

  const filters = ['standups.team_id = ?'];
  const bindings = [teamId];

  if (date && date.trim()) {
    filters.push('standups.standup_date = ?');
    bindings.push(date.trim());
  }

  const { results } = await env.DB.prepare(
    `
      SELECT
        standups.id,
        standups.team_id,
        standups.user_id,
        standups.standup_date,
        standups.yesterday,
        standups.today,
        standups.blocker,
        standups.availability,
        standups.include_github,
        standups.notify_lead,
        standups.github_activity_summary,
        standups.submitted_at,
        standups.updated_at,
        users.display_name,
        users.initials,
        users.github_username,
        users.avatar_color_key,
        team_members.is_lead
      FROM standups
      JOIN users ON users.id = standups.user_id
      JOIN team_members
        ON team_members.team_id = standups.team_id
        AND team_members.user_id = standups.user_id
      WHERE ${filters.join(' AND ')}
      ORDER BY standups.submitted_at DESC
    `
  ).bind(...bindings).all();

  return jsonResponse({
    teamId,
    date: date && date.trim() ? date.trim() : null,
    standups: results.map(mapStandupRow),
  });
}

async function routeRequest(request, env) {
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  if (url.pathname === '/api/health') {
    return handleHealth(env);
  }

  if (url.pathname === '/api/team') {
    return handleTeam(env, url);
  }

  if (url.pathname === '/api/standups') {
    return handleStandups(env, url);
  }

  return errorResponse('Not found', 404);
}

export default {
  async fetch(request, env) {
    try {
      if (!env.DB) {
        return errorResponse('D1 binding DB is not configured', 500);
      }

      return await routeRequest(request, env);
    } catch (error) {
      console.error(error);
      return errorResponse('Internal server error', 500);
    }
  },
};
