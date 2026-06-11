# SE SitRep / tatOS 

User Facing Site: https://se-sitrep.ars030.workers.dev/

Project Wiki: https://github.com/cse110-sp26-group11/SE-SitRep/wiki/

JSDoc Reference, separate from Project Wiki: https://cse110-sp26-group11.github.io/SE-SitRep/

## Quick Local Setup

Install dependencies:

```sh
npm install
```

Create and seed the local D1 database:

```sh
npm run db:migrate:local
npm run db:seed:local
```

Start the local Worker and static frontend:

```sh
npx wrangler dev --local --port 8787
```

Open the app:

```txt
http://localhost:8787
```

The local API is available under:

```txt
http://localhost:8787/api
```

## Local Sign-In

The app shell is hidden until a GitHub session token exists in browser
`localStorage`.

For local demo to work without GitHub OAuth, open DevTools on
`http://localhost:8787`, run this in the browser console, and reload:

```js
localStorage.setItem('github_token', 'eyJ1c2VySWQiOiJ1c2VyLW1heWEifQ==')
localStorage.setItem('github_user', JSON.stringify({
  id: 'user-maya',
  displayName: 'Maya Rodriguez',
  name: 'Maya Rodriguez',
  username: 'maya-rodriguez',
  githubUsername: 'maya-rodriguez',
  initials: 'MR'
}))
localStorage.setItem('tatosCurrentTeamId', 'team-demo')
```

This signs you in as the seeded demo user `Maya Rodriguez` on the seeded
`team-demo` team.

## Project Repo Layout

```txt
src/                 Static frontend assets
workers/             Cloudflare Worker API, handlers, and tests
d1/migrations/       D1 database schemas
d1/seeds/            Demo seed data
docs/                Backend docs, ADR's, frontend wireframes
meeting-minutes/     Meeting minutes
E2E_Tests/           Playwright E2E tests and fixtures
```