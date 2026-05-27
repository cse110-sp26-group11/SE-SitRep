# Operations

## Remote Database

The configured remote D1 database is:

```txt
database_name: se-sitrep
binding:       DB
```

The current `database_id` is stored in `wrangler.toml`.

## Create a D1 Database

This only needs to be done when creating a new database:

```sh
npm run db:create
```

After creation, copy the returned `database_id` into `wrangler.toml`.

## Apply Remote Migrations

```sh
npm run db:migrate:remote
```

This applies SQL files from:

```txt
d1/migrations
```

## Seed Remote Data

```sh
npm run db:seed:remote
```

This executes:

```txt
d1/seeds/demo.sql
```

The seed file uses upserts where possible so it can be rerun during development.

## Verify Remote Data

Check users:

```sh
npx wrangler d1 execute se-sitrep --remote --command="SELECT COUNT(*) AS user_count FROM users;"
```

Check tables:

```sh
npx wrangler d1 execute se-sitrep --remote --command="SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
```

Check seeded standups:

```sh
npx wrangler d1 execute se-sitrep --remote --command="SELECT standup_date, today FROM standups;"
```

## Deploy Worker

Dry run first:

```sh
npx wrangler deploy --dry-run --outdir /private/tmp/se-sitrep-worker-dry-run
```

Deploy when ready:

```sh
npx wrangler deploy
```

## Free-Plan Guardrails

This project is intended to stay compatible with Cloudflare's free plan.

Backend design guidelines:

- Use one D1 database for the app.
- Store only fields needed by the UI.
- Do not store raw GitHub API responses.
- Avoid high-frequency polling.
- Prefer cached GitHub snapshots over live GitHub API calls on every page load.
- Keep dashboard endpoints aggregated and indexed.
- Avoid large text blobs unless they are user-authored standup content.

## Future Operational Needs

Before production use, add:

- Authentication and authorization.
- Environment-specific config notes.
- Remote API smoke tests after deploy.
- Migration rollback guidance.
- GitHub token storage policy.
- Monitoring and error logging expectations.
