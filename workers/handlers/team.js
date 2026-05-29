import { DEFAULT_TEAM_ID } from '../lib/config.js';
import { getQueryParam } from '../lib/request.js';
import { errorResponse, jsonResponse } from '../lib/responses.js';

export async function handleTeam(env, url) {
  const teamId = getQueryParam(url, 'teamId', DEFAULT_TEAM_ID);

  const team = await env.DB.prepare(
    `
      SELECT id, name, repo_owner, repo_name, sprint_name, created_at, updated_at
      FROM teams
      WHERE id = ?
    `
  )
    .bind(teamId)
    .first();

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
  )
    .bind(teamId)
    .all();

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
    members: members.map((member) => ({
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
