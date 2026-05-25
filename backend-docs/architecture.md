# Backend Architecture

## Overview

The backend is a Cloudflare Worker that reads from a Cloudflare D1 SQL database.
The Worker receives HTTP requests, routes them by pathname, queries D1 through
the `env.DB` binding, maps database rows into frontend-friendly JSON, and
returns uncached JSON responses.

```txt
Browser or curl
  -> Cloudflare Worker: workers/index.js
  -> D1 binding: env.DB
  -> Cloudflare D1 database: se-sitrep
```

## Source Files

```txt
workers/index.js
  Worker entrypoint, request router, JSON helpers, and read-only handlers.

wrangler.toml
  Cloudflare Worker config and D1 binding.

d1/migrations/0001_initial_schema.sql
  Initial database schema.

d1/seeds/demo.sql
  Demo data used by local development and remote smoke testing.
```

## D1 Binding

The Worker accesses D1 through the binding named `DB`.

```toml
[[d1_databases]]
binding = "DB"
database_name = "se-sitrep"
database_id = "0ebe709d-150f-4d06-8e6c-a4e2913ce3b7"
migrations_dir = "d1/migrations"
```

In Worker code, this is available as:

```js
env.DB
```

## Request Flow

1. `fetch(request, env)` receives the request.
2. The Worker verifies `env.DB` exists.
3. `routeRequest(request, env)` checks the HTTP method and URL pathname.
4. A route handler runs a D1 query using prepared statements.
5. The handler maps database rows into camelCase JSON.
6. `jsonResponse()` returns a `Response.json()` payload with `cache-control: no-store`.

## Current Routing Rules

Only `GET` requests are allowed right now.

```txt
GET /api/health    -> handleHealth()
GET /api/team      -> handleTeam()
GET /api/standups  -> handleStandups()
```

Unsupported methods return:

```json
{
  "error": "Method not allowed"
}
```

Unknown paths return:

```json
{
  "error": "Not found"
}
```

Unexpected backend failures return:

```json
{
  "error": "Internal server error"
}
```

## Data Mapping

Database columns use snake_case because the schema is SQL-first.

API responses use camelCase because the frontend JavaScript consumes object
properties directly.

Example:

```txt
github_username -> githubUsername
standup_date    -> standupDate
submitted_at    -> submittedAt
```

## Current Limitations

- No authentication or user identity yet.
- No create/update/delete endpoints yet.
- `team-demo` is the default team.
- Standup responses come from seeded/demo data unless the database has been
  manually populated.
- No frontend code is wired to these endpoints yet.
- No GitHub API calls happen yet; GitHub issue/workflow tables contain snapshots
  only.
