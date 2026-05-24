PRAGMA foreign_keys = ON;

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repo_owner TEXT,
  repo_name TEXT,
  sprint_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  github_username TEXT UNIQUE,
  avatar_color_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_members (
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  is_lead INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE standups (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  standup_date TEXT NOT NULL,
  yesterday TEXT,
  today TEXT NOT NULL,
  blocker TEXT,
  availability TEXT NOT NULL CHECK (availability IN ('available', 'partial', 'unavailable')),
  include_github INTEGER NOT NULL DEFAULT 1,
  notify_lead INTEGER NOT NULL DEFAULT 0,
  github_activity_summary TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (team_id, user_id, standup_date),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE availability_slots (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  slot_label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'maybe', 'busy')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (team_id, user_id, week_start, day_index, slot_label),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE github_issue_snapshots (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  repo TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_user_id TEXT,
  difficulty TEXT,
  deadline TEXT,
  risk TEXT CHECK (risk IN ('low', 'medium', 'high')),
  labels_json TEXT NOT NULL DEFAULT '[]',
  html_url TEXT,
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (repo, issue_number),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE github_workflow_snapshots (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  repo TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  branch TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passing', 'failing', 'running', 'cancelled', 'unknown')),
  duration_seconds INTEGER,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  run_url TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_standups_team_date ON standups(team_id, standup_date);
CREATE INDEX idx_standups_user_date ON standups(user_id, standup_date);
CREATE INDEX idx_availability_team_week ON availability_slots(team_id, week_start);
CREATE INDEX idx_availability_user_week ON availability_slots(user_id, week_start);
CREATE INDEX idx_github_issues_repo_status_deadline ON github_issue_snapshots(repo, status, deadline);
CREATE INDEX idx_github_issues_team_risk ON github_issue_snapshots(team_id, risk);
CREATE INDEX idx_github_workflows_repo_branch_created ON github_workflow_snapshots(repo, branch, created_at);
CREATE INDEX idx_github_workflows_team_status ON github_workflow_snapshots(team_id, status);
CREATE INDEX idx_notifications_team_created ON notifications(team_id, created_at);
