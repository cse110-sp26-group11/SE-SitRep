# Local Development

## Prerequisites

- Node.js and npm
- A Cloudflare account
- Wrangler installed through project dependencies

Install dependencies:

```sh
npm install
```

Log in to Cloudflare if you need remote D1 or deployment access:

```sh
npx wrangler login
```

## Local D1 Setup

Apply migrations to the local D1 database:

```sh
npm run db:migrate:local
```

Seed demo data:

```sh
npm run db:seed:local
```

Inspect local tables:

```sh
npm run db:console:local
```

Expected tables include:

```txt
availability_slots
github_issue_snapshots
github_workflow_snapshots
notifications
standups
team_members
teams
users
```

## Run the Worker Locally

Start the local Worker:

```sh
npx wrangler dev --local --port 8787
```

Then test endpoints:

```sh
curl http://localhost:8787/api/health
curl http://localhost:8787/api/team
curl 'http://localhost:8787/api/dashboard?date=2026-05-10'
curl 'http://localhost:8787/api/standups?date=2026-05-10'
curl 'http://localhost:8787/api/availability?weekStart=2026-05-04'
curl 'http://localhost:8787/api/availability/overlap?weekStart=2026-05-04'
curl -X POST http://localhost:8787/api/standups \
  -H 'content-type: application/json' \
  --data '{"teamId":"team-demo","userId":"user-maya","standupDate":"2026-05-11","today":"Testing the standup API.","availability":"available"}'
curl -X PUT http://localhost:8787/api/availability/me \
  -H 'content-type: application/json' \
  --data '{"teamId":"team-demo","userId":"user-maya","weekStart":"2026-05-04","slots":[{"dayIndex":2,"slotIndex":5,"slotLabel":"2 PM","status":"available"}]}'
```

## Expected Smoke Test Results

Health should return:

```json
{
  "status": "ok",
  "service": "se-sitrep-api",
  "database": "reachable"
}
```

Team should return one team and five seeded members.

Standups for `2026-05-10` should return five seeded standups.

## Common Local Issues

### Missing Tables

If `/api/team` or `/api/standups` returns `Internal server error`, check the
Wrangler logs. If the error mentions a missing table, run:

```sh
npm run db:migrate:local
npm run db:seed:local
```

This can happen after changing the `database_id` in `wrangler.toml`, because
Wrangler keeps local D1 state per database id.

### Empty Results

If the tables exist but endpoint arrays are empty, seed the database:

```sh
npm run db:seed:local
```

### Port Already In Use

Use another port:

```sh
npx wrangler dev --local --port 8788
```

## Build Check

Run a dry-run deploy check without publishing:

```sh
npx wrangler deploy --dry-run --outdir /private/tmp/se-sitrep-worker-dry-run
```

This confirms the Worker bundles and that Wrangler can see the D1 binding.
