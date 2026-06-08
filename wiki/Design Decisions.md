# Design Decisions

This page summarizes the key architectural decisions for SE SitRep.

## Cloudflare Workers for backend compute

The backend runs as a Cloudflare Worker because:

- the course deployment target includes Cloudflare
- Workers support vanilla JavaScript without a server framework
- Workers integrate directly with Cloudflare D1
- the free tier is sufficient for the project

## Cloudflare D1 for data persistence

The backend stores relational data in Cloudflare D1 because:

- D1 binds directly to Workers via `env.DB`
- it supports SQL and joins for users, teams, standups, and availability
- migrations can be managed with `.sql` files in the repo
- it avoids an external database provider

## Vitest for unit testing

The team plans to use Vitest because:

- it supports ES modules natively
- it has a Jest-compatible test API
- it runs fast for CI feedback
- it requires minimal setup for vanilla JavaScript

## Other decisions

Other relevant project decisions include:

- Cloudflare Pages for frontend hosting
- GitHub OAuth for authentication (planned)
- `eslint-config-standard` and `eslint-plugin-jsdoc` for linting

## Where to find the full decisions

The detailed decision records live in `docs/decisions/`.

Key files:

- `docs/decisions/cloudflare-workers-for-backend-compute.md`
- `docs/decisions/cloudflare-d1-for-data-persistence.md`
- `docs/decisions/cloudflare-pages-for-frontend-hosting.md`
- `docs/decisions/github-oauth-for-authentication.md`
- `docs/decisions/neostandard-eslint-jsdoc-for-linting.md`
- `docs/decisions/vitest-for-unit-testing.md`
