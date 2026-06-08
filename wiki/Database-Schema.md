# Database Schema

The backend stores relational data in Cloudflare D1, a SQLite-compatible database.

## Schema source

- `d1/migrations/0001_initial_schema.sql`
- `d1/migrations/0002_add_availability_slot_index.sql`
- `d1/seeds/demo.sql`

## Entity overview

- `teams`
  - `team_members`
    - `users`
  - `standups`
  - `availability_slots`
  - `github_issue_snapshots`
  - `github_workflow_snapshots`
  - `notifications`

## Tables

### `teams`

Stores team workspace metadata.

- `id` — primary key
- `name`
- `repo_owner`
- `repo_name`
- `sprint_name`
- `created_at`
- `updated_at`

Seeded example:

- `team-demo`

### `users`

Stores user profile data.

- `id` — primary key
- `display_name`
- `initials`
- `github_username`
- `avatar_color_key`
- `created_at`
- `updated_at`

Seeded users include:

- `user-maya`
- `user-arav`
- `user-jamie`
- `user-ray`
- `user-sam`

### `team_members`

Join table linking users to teams.

- `team_id` — foreign key to `teams.id`
- `user_id` — foreign key to `users.id`
- `role`
- `is_lead` — boolean integer
- `active` — boolean integer
- `joined_at`

Primary key:

- `(team_id, user_id)`

### `standups`

Stores daily standup updates.

- `id`
- `team_id`
- `user_id`
- `standup_date`
- `yesterday`
- `today`
- `blocker`
- `availability`
- `include_github`
- `notify_lead`
- `github_activity_summary`
- `submitted_at`
- `updated_at`

Availability values:

- `available`
- `partial`
- `unavailable`

Unique constraint:

- `(team_id, user_id, standup_date)`

### `availability_slots`

Stores weekly availability data for users.

- `id`
- `team_id`
- `user_id`
- `week_start`
- `day_index`
- `slot_index`
- `slot_label`
- `status`
- `updated_at`

Status values:

- `available`
- `maybe`
- `busy`

Unique identity enforced by migration 0002:

- `(team_id, user_id, week_start, day_index, slot_index)`

### `github_issue_snapshots`

Stores normalized GitHub issue data for dashboard features.

- `id`
- `team_id`
- `repo`
- `issue_number`
- `title`
- `status`
- `owner_user_id`
- `difficulty`
- `deadline`
- `risk`
- `labels_json`
- `html_url`
- `synced_at`

Risk values:

- `low`
- `medium`
- `high`

Unique constraint:

- `(repo, issue_number)`

### `github_workflow_snapshots`

Stores normalized GitHub Actions workflow data.

- `id`
- `team_id`
- `repo`
- `workflow_name`
- `branch`
- `status`
- `duration_seconds`
- `passed_tests`
- `failed_tests`
- `run_url`
- `created_at`
- `synced_at`

Status values:

- `passing`
- `failing`
- `running`
- `cancelled`
- `unknown`

### `notifications`

Stores notification records for future operational work.

- `id`
- `team_id`
- `user_id`
- `type`
- `title`
- `body`
- `read_at`
- `created_at`

## Inspecting the schema

Use the local D1 console:

```sh
npm run db:console:local
```

This command lists tables and lets you execute SQL queries against the local database.