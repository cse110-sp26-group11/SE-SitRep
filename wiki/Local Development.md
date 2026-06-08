# Local Development

This page explains how to run SE SitRep locally, including Cloudflare D1 setup and Worker execution.

## Prerequisites

- Node.js and npm
- A Cloudflare account (for remote deploy or D1 access)
- `wrangler` installed via dev dependencies

## Setup

Install project dependencies:

```sh
npm install
```

If you plan to use remote Cloudflare features, log in:

```sh
npx wrangler login
```

## Local D1 setup

Apply migrations to the local D1 database:

```sh
npm run db:migrate:local
```

Seed demo data:

```sh
npm run db:seed:local
```

Inspect the local database tables:

```sh
npm run db:console:local
```

Expected tables include:

- `availability_slots`
- `github_issue_snapshots`
- `github_workflow_snapshots`
- `notifications`
- `standups`
- `team_members`
- `teams`
- `users`

## Run the Worker locally

Start the local Worker on port 8787:

```sh
npx wrangler dev --local --port 8787
```

Then test the API endpoints using curl or your browser.

## Example local API requests

```sh
curl http://localhost:8787/api/health
curl http://localhost:8787/api/team
curl 'http://localhost:8787/api/standups?teamId=team-demo&date=2026-05-10'
curl 'http://localhost:8787/api/availability?teamId=team-demo&weekStart=2026-05-04'
curl 'http://localhost:8787/api/availability/overlap?teamId=team-demo&weekStart=2026-05-04'
```

## Smoke test expectations

A successful health response should look like:

```json
{
  "status": "ok",
  "service": "se-sitrep-api",
  "database": "reachable"
}
```

The seeded `team-demo` data should return roster, standups, and availability slots.

## Troubleshooting

### Missing tables

If endpoints fail due to missing tables, rerun migrations and seed data:

```sh
npm run db:migrate:local
npm run db:seed:local
```

### Empty results

If the database exists but returns empty arrays, reseed the demo data:

```sh
npm run db:seed:local
```

### Port already in use

Start the Worker on a different port:

```sh
npx wrangler dev --local --port 8788
```

## Build check

Verify the Worker bundle without deploying:

```sh
npx wrangler deploy --dry-run --outdir /private/tmp/se-sitrep-worker-dry-run
```
