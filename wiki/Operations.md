# Operations

This page explains how to manage the Cloudflare D1 database and deploy the Worker.

## Remote D1 configuration

The remote D1 database is configured in `wrangler.toml` and bound as `DB`.

```toml
[[d1_databases]]
binding = "DB"
database_name = "se-sitrep"
database_id = "0ebe709d-150f-4d06-8e6c-a4e2913ce3b7"
migrations_dir = "d1/migrations"
```

## Create a remote D1 database

Run this when creating a new remote database:

```sh
npm run db:create
```

After creation, copy the returned `database_id` into `wrangler.toml`.

## Apply migrations

### Local migrations

```sh
npm run db:migrate:local
```

### Remote migrations

```sh
npm run db:migrate:remote
```

Migrations are defined under `d1/migrations`.

## Seed data

### Local seed

```sh
npm run db:seed:local
```

### Remote seed

```sh
npm run db:seed:remote
```

Seed data comes from `d1/seeds/demo.sql` and can be rerun safely.

## Verify remote data

Check remote table names:

```sh
npx wrangler d1 execute se-sitrep --remote --command="SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
```

Check remote user count:

```sh
npx wrangler d1 execute se-sitrep --remote --command="SELECT COUNT(*) AS user_count FROM users;"
```

Check seeded standups:

```sh
npx wrangler d1 execute se-sitrep --remote --command="SELECT standup_date, today FROM standups;"
```

## Deploy the Worker

### Dry run

```sh
npx wrangler deploy --dry-run --outdir /private/tmp/se-sitrep-worker-dry-run
```

### Deploy

```sh
npx wrangler deploy
```

## Free-tier guardrails

This project is intended to remain compatible with Cloudflare free-tier limits.

- Use a single D1 database.
- Store only the fields required by the UI.
- Do not persist raw GitHub API payloads.
- Avoid polling GitHub on every request.
- Prefer cached snapshot tables for dashboard data.
- Keep dashboard queries efficient and indexed.
- Avoid storing large unnecessary text blobs.

## Future operational needs

Before wider use, add:

- authentication and authorization
- environment-specific configuration notes
- remote API smoke tests after deploy
- migration rollback guidance
- GitHub token storage policy
- monitoring and error logging
