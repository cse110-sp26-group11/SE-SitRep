# Database Schema

The database is Cloudflare D1, which is SQLite-compatible. The initial schema is
defined in:

```txt
d1/migrations/0001_initial_schema.sql
```

Seed data is defined in:

```txt
d1/seeds/demo.sql
```

## Entity Overview

```txt
teams
  -> team_members
       -> users
  -> standups
       -> users
  -> availability_slots
       -> users
  -> github_issue_snapshots
       -> users through owner_user_id
  -> github_workflow_snapshots
  -> notifications
       -> users through user_id
```

## Tables

### teams

Stores each team/workspace.

Important columns:

```txt
id            primary key
name          display name
repo_owner    GitHub repository owner
repo_name     GitHub repository name
sprint_name   current sprint label
created_at
updated_at
```

Seeded row:

```txt
team-demo
```

### users

Stores user profile data that can be reused across teams.

Important columns:

```txt
id                 primary key
display_name       full name for UI
initials           avatar initials
github_username    unique GitHub username
avatar_color_key   frontend avatar color key
created_at
updated_at
```

Seeded users:

```txt
user-maya
user-arav
user-jamie
user-ray
user-sam
```

### team_members

Join table between teams and users.

Important columns:

```txt
team_id    foreign key to teams.id
user_id    foreign key to users.id
role       member role
is_lead    integer boolean, 0 or 1
active     integer boolean, 0 or 1
joined_at
```

Primary key:

```txt
(team_id, user_id)
```

### standups

Stores daily standup submissions.

Important columns:

```txt
id
team_id
user_id
standup_date
yesterday
today
blocker
availability
include_github
notify_lead
github_activity_summary
submitted_at
updated_at
```

Availability values:

```txt
available
partial
unavailable
```

Unique constraint:

```txt
(team_id, user_id, standup_date)
```

This allows one standup per user per team per day.

### availability_slots

Stores weekly meeting availability.

Important columns:

```txt
id
team_id
user_id
week_start
day_index
slot_label
status
updated_at
```

Status values:

```txt
available
maybe
busy
```

Unique constraint:

```txt
(team_id, user_id, week_start, day_index, slot_label)
```

### github_issue_snapshots

Stores normalized GitHub issue data needed by dashboard views. It intentionally
does not store raw GitHub API payloads.

Important columns:

```txt
id
team_id
repo
issue_number
title
status
owner_user_id
difficulty
deadline
risk
labels_json
html_url
synced_at
```

Risk values:

```txt
low
medium
high
```

Unique constraint:

```txt
(repo, issue_number)
```

### github_workflow_snapshots

Stores normalized GitHub Actions workflow data.

Important columns:

```txt
id
team_id
repo
workflow_name
branch
status
duration_seconds
passed_tests
failed_tests
run_url
created_at
synced_at
```

Status values:

```txt
passing
failing
running
cancelled
unknown
```

### notifications

Stores future notification records, such as blocker notifications for leads.

Important columns:

```txt
id
team_id
user_id
type
title
body
read_at
created_at
```

This table is not used by current API routes yet.

## Indexes

Standup queries:

```sql
CREATE INDEX idx_standups_team_date ON standups(team_id, standup_date);
CREATE INDEX idx_standups_user_date ON standups(user_id, standup_date);
```

Availability queries:

```sql
CREATE INDEX idx_availability_team_week ON availability_slots(team_id, week_start);
CREATE INDEX idx_availability_user_week ON availability_slots(user_id, week_start);
```

GitHub issue queries:

```sql
CREATE INDEX idx_github_issues_repo_status_deadline
ON github_issue_snapshots(repo, status, deadline);

CREATE INDEX idx_github_issues_team_risk
ON github_issue_snapshots(team_id, risk);
```

Workflow queries:

```sql
CREATE INDEX idx_github_workflows_repo_branch_created
ON github_workflow_snapshots(repo, branch, created_at);

CREATE INDEX idx_github_workflows_team_status
ON github_workflow_snapshots(team_id, status);
```

Notification queries:

```sql
CREATE INDEX idx_notifications_team_created
ON notifications(team_id, created_at);
```

## Migration Rules

- Do not edit an already-applied migration after it is merged.
- Add a new migration file for schema changes.
- Keep migrations deterministic and SQL-only.
- Prefer compact normalized rows over storing large JSON blobs.
- Use indexes for dashboard queries that will run frequently.
