# Developer Guide

## What this guide covers

This page helps developers understand how SE SitRep is built, how its backend is organized, and how to contribute safely.

## Architecture overview

SE SitRep uses a Cloudflare Worker backend with Cloudflare D1 for persistence. The Worker exposes JSON APIs under `/api/*`, and the frontend assets are served from `src/`.

### Key architectural components

- `workers/index.js` — entrypoint for incoming HTTP requests
- `workers/router.js` — route matching and request delegation
- `workers/handlers/` — feature-specific endpoint logic
- `workers/lib/` — shared helpers for request parsing, validation, mapping, and response formatting
- `d1/migrations/` — SQL schema migrations
- `d1/seeds/` — initial and demo seed data
- `wrangler.toml` — Cloudflare Worker configuration and D1 database binding

## Request flow

1. The browser or CLI sends an HTTP request to the Worker.
2. `workers/index.js` validates environment bindings and forwards the request to the router.
3. `workers/router.js` matches the request path and method.
4. A handler under `workers/handlers/` executes the business logic.
5. The handler queries or mutates D1 using `env.DB`.
6. The handler returns a JSON response.

## Code structure

### `workers/router.js`

This file defines the available API endpoints by path and method. It currently supports:

- `GET /api/health`
- `GET /api/teams`
- `POST /api/teams`
- `GET /api/dashboard`
- `GET /api/standups`
- `POST /api/standups`
- `PUT /api/standups/:id`
- `GET /api/availability`
- `PUT /api/availability/me`
- `GET /api/availability/overlap`

### `workers/handlers/`

- `health.js` — health check and D1 reachability
- `teams.js` — team management and roster lookup
- `dashboard.js` — aggregated dashboard payload
- `standups.js` — standup listing, creation, and updates
- `availability.js` — availability and overlap calculations

## Testing Strategy

### Unit and Integration Tests
We use **Vitest** for server-side logic and API handler tests. 
- Unit tests: `workers/handlers/*.test.js`
- Integration tests: `workers/integration.test.js`

### End-to-End Tests
We use **Playwright** for full-stack E2E testing. See the [[E2E Testing Guide]] for details on running smoke tests, API validation, and UI flows.

### `workers/lib/`

- `request.js` — query parsing, path splitting, JSON body parsing
- `validation.js` — payload validation and normalization
- `responses.js` — successful JSON responses and error formatting
- `standup-mappers.js` — maps DB rows into API shapes
- `availability-mappers.js` — maps availability rows and overlap slots
- `config.js` — default team values and shared constants

## Local development workflow

### Prerequisites

- Node.js and npm
- Cloudflare account for remote D1 / deploy access (optional for local development)
- `wrangler` installed via project dev dependencies

### Install dependencies

```sh
npm install
```

### Local D1 setup

Apply migrations and seed test data locally:

```sh
npm run db:migrate:local
npm run db:seed:local
```

Confirm the local database tables:

```sh
npm run db:console:local
```

### Run the Worker locally

```sh
npx wrangler dev --local --port 8787
```

Then use the local API endpoints in your browser, API client, or frontend.

## Adding or changing an API endpoint

1. Add the route in `workers/router.js`.
2. Implement the handler in `workers/handlers/` or extend an existing handler.
3. Add input validation in `workers/lib/validation.js` where needed.
4. Add or update database schema migrations in `d1/migrations/` if persistence changes are required.
5. Seed or update demo data in `d1/seeds/demo.sql` if required for testing.
6. Test locally with `npx wrangler dev --local --port 8787`.

## Conventions and patterns

- Database columns: `snake_case`
- API request and response fields: `camelCase`
- IDs: use stable string identifiers like `team-demo`, `user-maya`, or generated UUIDs for created records
- Errors: return the `{ "error": "Message" }` shape
- Active team members are validated before standup creation or availability updates

### Validation expectations

Handlers use shared validation functions to ensure incoming JSON is normalized and required fields are present. This keeps API behavior consistent.

## Important implementation details

- Standups are unique by `(team_id, user_id, standup_date)`.
- Availability slots are unique by `(team_id, user_id, week_start, day_index, slot_index)`.
- Overlap scoring is computed by weighted availability values to rank the best team slots.
- Dashboard data is aggregated from seeded GitHub snapshot tables and standup data.

## Where to find deeper documentation

- `backend-docs/architecture.md`
- `backend-docs/api.md`
- `backend-docs/local-development.md`
- `backend-docs/database-schema.md`
- `backend-docs/operations.md`
- `docs/decisions/`
