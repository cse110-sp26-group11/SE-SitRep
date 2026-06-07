PRAGMA foreign_keys = ON;

INSERT INTO teams (id, name, repo_owner, repo_name, sprint_name)
VALUES ('team-demo', 'SE SitRep Demo Team', 'cse110-sp26-group11', 'SE-SitRep', 'Sprint 2')
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  repo_owner = excluded.repo_owner,
  repo_name = excluded.repo_name,
  sprint_name = excluded.sprint_name,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO users (id, display_name, initials, github_username, avatar_color_key) VALUES
  ('user-maya', 'Maya Rodriguez', 'MR', 'maya-rodriguez', 'mr'),
  ('user-arav', 'Arav Kumar', 'AK', 'arav-kumar', 'ak'),
  ('user-jamie', 'Jamie Lee', 'JL', 'jamie-lee', 'jl'),
  ('user-ray', 'Ray Yang', 'RY', 'ray-yang', 'ry'),
  ('user-sam', 'Sam He', 'SH', 'sam-he', 'sh')
ON CONFLICT(id) DO UPDATE SET
  display_name = excluded.display_name,
  initials = excluded.initials,
  github_username = excluded.github_username,
  avatar_color_key = excluded.avatar_color_key,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO team_members (team_id, user_id, role, is_lead, active) VALUES
  ('team-demo', 'user-maya', 'member', 0, 1),
  ('team-demo', 'user-arav', 'lead', 1, 1),
  ('team-demo', 'user-jamie', 'member', 0, 1),
  ('team-demo', 'user-ray', 'member', 0, 1),
  ('team-demo', 'user-sam', 'member', 0, 1)
ON CONFLICT(team_id, user_id) DO UPDATE SET
  role = excluded.role,
  is_lead = excluded.is_lead,
  active = excluded.active;

INSERT INTO standups (
  id, team_id, user_id, standup_date, yesterday, today, blocker,
  availability, include_github, notify_lead, github_activity_summary
) VALUES
  (
    'standup-demo-maya-2026-05-10',
    'team-demo',
    'user-maya',
    '2026-05-10',
    'Finished GitHub OAuth flow, reviewed PR #12',
    'Working on commit summary widget and sprint dashboard UI',
    NULL,
    'available',
    1,
    0,
    'Reviewed PR #12 and pushed frontend dashboard updates.'
  ),
  (
    'standup-demo-arav-2026-05-10',
    'team-demo',
    'user-arav',
    '2026-05-10',
    'Set up CI/CD pipeline on GitHub Actions',
    'Sprint planning prep, coordinating TA meeting notes',
    NULL,
    'available',
    1,
    0,
    'Configured GitHub Actions workflow checks.'
  ),
  (
    'standup-demo-jamie-2026-05-10',
    'team-demo',
    'user-jamie',
    '2026-05-10',
    NULL,
    'Waiting on Cloudflare KV access, cannot proceed with persistence layer',
    'Waiting on Cloudflare KV access',
    'partial',
    1,
    1,
    NULL
  ),
  (
    'standup-demo-ray-2026-05-10',
    'team-demo',
    'user-ray',
    '2026-05-10',
    NULL,
    'Sprint 1 research doc, wireframes for all 4 screens',
    NULL,
    'available',
    0,
    0,
    NULL
  ),
  (
    'standup-demo-sam-2026-05-10',
    'team-demo',
    'user-sam',
    '2026-05-10',
    NULL,
    'User personas and user story refinement',
    NULL,
    'available',
    0,
    0,
    NULL
  )
ON CONFLICT(team_id, user_id, standup_date) DO UPDATE SET
  yesterday = excluded.yesterday,
  today = excluded.today,
  blocker = excluded.blocker,
  availability = excluded.availability,
  include_github = excluded.include_github,
  notify_lead = excluded.notify_lead,
  github_activity_summary = excluded.github_activity_summary,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO availability_slots (id, team_id, user_id, week_start, day_index, slot_index, slot_label, status) VALUES
  ('avail-maya-2026-05-04-0-0', 'team-demo', 'user-maya', '2026-05-04', 0, 0, '9 AM', 'available'),
  ('avail-maya-2026-05-04-0-1', 'team-demo', 'user-maya', '2026-05-04', 0, 1, '10 AM', 'available'),
  ('avail-maya-2026-05-04-1-2', 'team-demo', 'user-maya', '2026-05-04', 1, 2, '11 AM', 'available'),
  ('avail-arav-2026-05-04-0-1', 'team-demo', 'user-arav', '2026-05-04', 0, 1, '10 AM', 'available'),
  ('avail-arav-2026-05-04-1-2', 'team-demo', 'user-arav', '2026-05-04', 1, 2, '11 AM', 'available'),
  ('avail-jamie-2026-05-04-3-0', 'team-demo', 'user-jamie', '2026-05-04', 3, 0, '9 AM', 'available'),
  ('avail-ray-2026-05-04-0-0', 'team-demo', 'user-ray', '2026-05-04', 0, 0, '9 AM', 'available'),
  ('avail-ray-2026-05-04-1-1', 'team-demo', 'user-ray', '2026-05-04', 1, 1, '10 AM', 'maybe'),
  ('avail-sam-2026-05-04-0-2', 'team-demo', 'user-sam', '2026-05-04', 0, 2, '11 AM', 'available'),
  ('avail-sam-2026-05-04-4-2', 'team-demo', 'user-sam', '2026-05-04', 4, 2, '11 AM', 'available')
ON CONFLICT(team_id, user_id, week_start, day_index, slot_index) DO UPDATE SET
  slot_label = excluded.slot_label,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO github_issue_snapshots (
  id, team_id, repo, issue_number, title, status, owner_user_id,
  difficulty, deadline, risk, labels_json, html_url
) VALUES
  ('issue-demo-42', 'team-demo', 'cse110-sp26-group11/SE-SitRep', 42, 'Standup page should save draft state on refresh', 'In progress', 'user-maya', 'Medium', '2026-05-24', 'medium', '["frontend","ux"]', NULL),
  ('issue-demo-51', 'team-demo', 'cse110-sp26-group11/SE-SitRep', 51, 'Workflow failures need a CI health card in sprint health', 'Blocked', 'user-arav', 'Hard', '2026-05-23', 'high', '["github-actions","ci"]', NULL),
  ('issue-demo-56', 'team-demo', 'cse110-sp26-group11/SE-SitRep', 56, 'When-to-meet should highlight best team overlap slots', 'Review', 'user-ray', 'Medium', '2026-05-25', 'low', '["scheduling","frontend"]', NULL),
  ('issue-demo-63', 'team-demo', 'cse110-sp26-group11/SE-SitRep', 63, 'Surface issue deadlines and difficulty tags on dashboard', 'Todo', 'user-sam', 'Easy', '2026-05-26', 'medium', '["issues","dashboard"]', NULL)
ON CONFLICT(repo, issue_number) DO UPDATE SET
  title = excluded.title,
  status = excluded.status,
  owner_user_id = excluded.owner_user_id,
  difficulty = excluded.difficulty,
  deadline = excluded.deadline,
  risk = excluded.risk,
  labels_json = excluded.labels_json,
  synced_at = CURRENT_TIMESTAMP;

INSERT INTO github_workflow_snapshots (
  id, team_id, repo, workflow_name, branch, status,
  duration_seconds, passed_tests, failed_tests, run_url, created_at
) VALUES
  ('workflow-demo-frontend', 'team-demo', 'cse110-sp26-group11/SE-SitRep', 'Frontend checks', 'frontend', 'passing', 108, 38, 0, NULL, '2026-05-10T11:48:00Z'),
  ('workflow-demo-pr', 'team-demo', 'cse110-sp26-group11/SE-SitRep', 'Pull request validation', 'main', 'failing', 192, 41, 2, NULL, '2026-05-10T11:17:00Z'),
  ('workflow-demo-deploy', 'team-demo', 'cse110-sp26-group11/SE-SitRep', 'Deploy preview', 'frontend', 'passing', 129, 12, 0, NULL, '2026-05-10T10:58:00Z')
ON CONFLICT(id) DO UPDATE SET
  workflow_name = excluded.workflow_name,
  branch = excluded.branch,
  status = excluded.status,
  duration_seconds = excluded.duration_seconds,
  passed_tests = excluded.passed_tests,
  failed_tests = excluded.failed_tests,
  run_url = excluded.run_url,
  created_at = excluded.created_at,
  synced_at = CURRENT_TIMESTAMP;
