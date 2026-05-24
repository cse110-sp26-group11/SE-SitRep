# SE-SitRep

## Cloudflare D1 database setup

This project uses Cloudflare D1 for backend SQL persistence. The first backend
PR only adds database configuration, migrations, and seed data; it does not wire
the frontend to live API routes yet.

### Prerequisites

- Node.js and npm
- A Cloudflare account on the free plan
- Wrangler authenticated locally:

```sh
npx wrangler login
```

### Install dependencies

```sh
npm install
```

### Create the remote D1 database

```sh
npm run db:create
```

Copy the `database_id` from the command output into `wrangler.toml`, replacing
`REPLACE_WITH_D1_DATABASE_ID`.

### Apply migrations

Local development database:

```sh
npm run db:migrate:local
```

Remote Cloudflare D1 database:

```sh
npm run db:migrate:remote
```

### Seed demo data

Local development database:

```sh
npm run db:seed:local
```

Remote Cloudflare D1 database:

```sh
npm run db:seed:remote
```

### Inspect the local database

```sh
npm run db:console:local
```

### Free-plan notes

Keep D1 usage compact because this project is intended to stay on Cloudflare's
free plan. Store normalized fields needed by the UI instead of raw GitHub API
payloads, keep one D1 database for the app, and index dashboard queries that run
often.

Current Cloudflare D1 free-plan constraints to design around:

- 10 databases per account
- 500 MB maximum storage per database
- 5 GB total account storage
- 5 million rows read per day
- 100,000 rows written per day

If the daily read/write limits are exceeded, D1 can reject queries until the
limits reset. Avoid polling GitHub too frequently and prefer cached snapshots for
dashboard data.
