# Backend Documentation

This folder documents the SE SitRep backend as it exists today: a Cloudflare
Worker API backed by Cloudflare D1.

The backend currently supports read APIs plus standup create/update endpoints.
Frontend integration, GitHub sync, availability writes, notifications, and AI
summary generation are future backend work.

## Documents

- [Architecture](./architecture.md): backend components and request flow
- [Local Development](./local-development.md): setup, migrations, seeding, and local API testing
- [API Reference](./api.md): current endpoints, query params, and response shapes
- [Database Schema](./database-schema.md): D1 tables, relationships, and indexes
- [Operations](./operations.md): remote D1 commands, deployment notes, and free-plan guardrails

## Current Stack

- Runtime: Cloudflare Workers
- Database: Cloudflare D1
- CLI/tooling: Wrangler
- Worker entrypoint: `workers/index.js`
- Wrangler config: `wrangler.toml`
- Migrations: `d1/migrations`
- Seed data: `d1/seeds`

## Current API Surface

```txt
GET /api/health
GET /api/team
GET /api/standups
POST /api/standups
PUT /api/standups/:id
GET /api/availability
PUT /api/availability/me
GET /api/availability/overlap
```

Team-scoped endpoints default to the seeded `team-demo` team unless a `teamId`
query parameter or request body field is provided.
