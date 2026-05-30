---
status: accepted
date: 2026-05-22
decision-makers: SE SitRep team
---

# Use Cloudflare D1 for Data Persistence

## Context and Problem Statement

Our application needs to persist structured data including user accounts, team memberships, standup entries, blockers, and meeting schedules. We have already decided to use Cloudflare Workers for backend compute (see ADR-0001). Which database should we use for persistent storage that integrates well with Workers and stays within our course constraints?

## Decision Drivers

* Must integrate natively with Cloudflare Workers without requiring external network calls to third-party database providers
* Must support relational data with structured queries (users belong to teams, standups reference users, etc.)
* Free tier must be sufficient for a course project
* Should not require managing database infrastructure (no provisioning, patching, or scaling)
* Must be deployable and configurable through the Wrangler CLI or Cloudflare dashboard

## Considered Options

1. Cloudflare D1 (serverless SQLite)
2. Cloudflare Workers KV (key-value store)
3. Supabase (hosted PostgreSQL)
4. Firebase Realtime Database / Firestore

## Decision Outcome

Chosen option: "Cloudflare D1", because it provides a relational database with full SQL support that runs natively within the Cloudflare ecosystem, requires no external accounts or services, and has a free tier that exceeds our project needs. Its SQLite foundation makes the data model straightforward to reason about for a team with SQL familiarity.

### Consequences

* Good, because D1 binds directly to Workers with zero-latency access — no external API calls or connection strings to manage
* Good, because the team can use standard SQL for schema design, migrations, and queries
* Good, because the free tier includes 5 million rows read and 100,000 rows written per day
* Good, because schema and migrations can be version-controlled alongside application code
* Bad, because D1 is SQLite-based, so some PostgreSQL/MySQL features (e.g., advanced JSON operators, stored procedures) are unavailable
* Bad, because D1 is still a relatively new Cloudflare product and documentation/community resources are less extensive than mature alternatives
* Bad, because local development requires Wrangler's local D1 emulation, which may have subtle differences from production behavior

### Confirmation

Confirmation will occur when a D1 database with the application schema is created, seeded with test data, and successfully queried from a Worker in both local development and a deployed staging environment.

## Pros and Cons of the Options

### Cloudflare D1

Serverless SQLite database native to the Cloudflare platform.

* Good, because it is a first-party Cloudflare service — no external accounts, keys, or network egress needed
* Good, because it supports full SQL (DDL, DML, joins, indexes, transactions)
* Good, because the data model maps naturally to our domain (users, teams, standups are relational)
* Good, because migrations can be managed as `.sql` files in the repository
* Neutral, because SQLite is single-writer, but our project's write volume is very low and this is not a concern at our scale
* Bad, because it is a newer service with less community troubleshooting material than established databases

### Cloudflare Workers KV

A globally distributed key-value store on Cloudflare's network.

* Good, because it is fast for reads and simple to use for flat data
* Good, because it is a mature, well-documented Cloudflare service
* Bad, because it is eventually consistent — writes may not be immediately visible, which is problematic for auth flows and real-time standup updates
* Bad, because it has no relational query capability; modeling relationships (user → team → standups) would require manual indexing and denormalization
* Bad, because complex queries (e.g., "all standups for team X in the last 7 days") would require reading and filtering large amounts of data client-side

### Supabase

Hosted PostgreSQL with a REST API and client libraries.

* Good, because PostgreSQL is a full-featured relational database with excellent tooling
* Good, because Supabase provides built-in authentication that could simplify our auth implementation
* Good, because it has a generous free tier
* Bad, because it introduces an external third-party dependency outside the Cloudflare ecosystem, which adds a point of failure
* Bad, because requests from Workers to Supabase would traverse the public internet, adding latency
* Bad, because adding Supabase as a dependency requires TA approval per course constraints, and the justification is weaker given D1 is available natively

### Firebase Realtime Database / Firestore

Google's NoSQL cloud database with real-time sync capabilities.

* Good, because it has excellent documentation and a large community
* Good, because real-time sync could be useful for live standup dashboards
* Bad, because it is a NoSQL document store, which is a less natural fit for our relational domain model
* Bad, because it requires a Google Cloud account and Firebase SDK, introducing an external dependency
* Bad, because the Firebase client SDK is a significant JavaScript library that conflicts with our vanilla JS, minimal-dependency approach
* Bad, because it requires TA approval as an external dependency

## More Information

* [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)
* [D1 SQL reference (SQLite dialect)](https://developers.cloudflare.com/d1/reference/query-json-results/)
* Related: ADR-0001 (Use Cloudflare Workers for Backend Compute)
