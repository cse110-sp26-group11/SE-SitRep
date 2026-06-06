---
status: accepted
date: 2026-06-05
decision-makers: SE SitRep team
---

# Use Vitest and Miniflare for Backend Integration Testing

## Context and Problem Statement

Our unit tests isolate handlers and utility functions by replacing Cloudflare D1 with mock objects. These tests provide fast feedback for validation, response formatting, authorization branches, and mapping logic, but they do not execute SQL or enforce real database constraints. A production failure in the When to Meet feature demonstrated this gap: the API request and handler logic appeared valid, while D1 rejected an availability insert because two rows generated the same primary key.

We need a backend integration-testing approach that exercises the real Worker router, handlers, migrations, SQL statements, D1 constraints, and persisted results without reading from or modifying the deployed database.

## Decision Drivers

* Tests must execute real SQL, including primary keys, foreign keys, unique indexes, and `ON CONFLICT` behavior
* Tests must remain isolated from the remote Cloudflare D1 database and production data
* Each test must start from a predictable database state
* The approach must work with the existing Vitest test suite and GitHub Actions pipeline
* Integration tests should exercise API routes rather than duplicating handler implementation details
* Test fixtures should be minimal and should not depend on hardcoded mock query responses

## Considered Options

1. Vitest with an isolated Miniflare D1 database
2. Vitest with mocked D1 query results
3. Tests against the deployed Cloudflare D1 database
4. Manual testing through Wrangler and browser developer tools

## Decision Outcome

Chosen option: "Vitest with an isolated Miniflare D1 database", because Miniflare provides a local implementation of Cloudflare D1 that executes the application's real migrations and SQL. Each test environment receives a unique temporary database, can optionally load the demo seed, and is disposed after the test. Requests pass through the real Worker router and handlers while remaining independent of remote Cloudflare resources.

The shared `workers/lib/integration-test-utils.js` module creates the Miniflare environment, applies all files in `d1/migrations`, optionally loads `d1/seeds/demo.sql`, creates authenticated JSON requests, and disposes the temporary environment.

### Initial Integration Coverage

The first integration suite confirms that:

* Seeded team data can be read through the Worker router
* A standup can be created, persisted in D1, and returned by the listing route
* Availability can be saved with real D1 conflict handling and used to recompute team overlap
* Invalid and unauthorized standup requests do not mutate persisted data
* The same user, week, day, and slot can be stored for two teams without a primary-key collision
* Updating an existing availability slot changes its status without inserting a duplicate row
* Joining an existing team creates a membership in D1
* Joining the same team again does not create a duplicate membership
* Joining a missing team returns `404` without creating a membership

### Consequences

* Good, because integration tests can detect SQL and schema failures that mocked unit tests cannot reproduce
* Good, because tests use temporary local databases and cannot modify production data
* Good, because migrations are exercised as part of the test setup, keeping tests aligned with the deployed schema
* Good, because API requests pass through the real router and handlers
* Good, because `npm run test:integration` provides focused local feedback while `npm run test:backend` and the pull-request workflow run both unit and integration tests
* Neutral, because integration tests are slower than unit tests due to Miniflare startup and database setup
* Neutral, because the backend test workflow must use Node.js 22 or newer to satisfy the current Miniflare runtime requirement
* Bad, because Miniflare remains an emulator and cannot guarantee that every Cloudflare production behavior is identical
* Bad, because broad demo seed fixtures can make tests fragile, so focused regression tests should prefer minimal fixtures with `seed: false`

### Confirmation

Confirmation occurs when `npm run test:integration`, `npm run test:backend`, and `npm run lint` pass locally, and the complete backend suite passes in GitHub Actions. Availability regression tests must demonstrate distinct persisted IDs across teams and one persisted row after an update to the same team slot.

## Pros and Cons of the Options

### Vitest with an isolated Miniflare D1 database

* Good, because it executes real SQLite-compatible D1 queries and constraints
* Good, because each test can use an isolated database with deterministic fixtures
* Good, because it integrates with the project's existing Vitest syntax and CI command
* Good, because it requires no Cloudflare credentials or network access
* Bad, because starting Miniflare and applying migrations increases test execution time
* Bad, because tests must explicitly dispose Miniflare environments to avoid resource leaks

### Vitest with mocked D1 query results

* Good, because mocked unit tests run quickly and isolate handler branches
* Good, because failures are usually easy to diagnose
* Bad, because SQL is never executed and database constraints cannot fail
* Bad, because hardcoded successful query results can allow broken inserts to pass
* Neutral, because mocked D1 remains useful for unit tests but does not replace integration coverage

### Tests against the deployed Cloudflare D1 database

* Good, because tests would run against the production database implementation
* Bad, because tests could corrupt or delete real team data
* Bad, because results would depend on network access, credentials, and existing remote state
* Bad, because parallel test runs could interfere with one another
* Bad, because CI would require access to production Cloudflare secrets

### Manual testing through Wrangler and browser developer tools

* Good, because developers can inspect complete requests, responses, and Worker logs
* Good, because it remains useful for exploratory debugging
* Bad, because it is not repeatable or automatically enforced before merging
* Bad, because regressions can return after a manual check has passed

## More Information

* `workers/integration.test.js`
* `workers/handlers/availability.integration.test.js`
* `workers/handlers/teams.integration.test.js`
* `workers/lib/integration-test-utils.js`
* `d1/migrations/`
* Related: Use Vitest for Unit Testing
* Related: Use Cloudflare D1 for Data Persistence
