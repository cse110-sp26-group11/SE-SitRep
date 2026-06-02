---
status: accepted
date: 2026-05-18
decision-makers: SE SitRep team
---

# Use Cloudflare Workers for Backend Compute

## Context and Problem Statement

Our application requires server-side logic for authentication, session management, and CRUD operations against a database. The project constraints restrict us to vanilla HTML/CSS/JS with no frameworks, and deployment must target either GitHub Pages or Cloudflare. GitHub Pages is a static file host with no server-side execution capability, so we need a compute platform that can handle API requests. Which serverless compute platform should we use for backend logic?

## Decision Drivers

* Course constraints limit deployment to GitHub Pages or Cloudflare
* No traditional server infrastructure is available or permitted
* Must support vanilla JavaScript (no server-side frameworks like Express required)
* Must handle authentication, session management, and API routing
* Free tier must be sufficient for a team project with limited traffic
* Should be straightforward to integrate into a CI/CD pipeline via GitHub Actions

## Considered Options

1. Cloudflare Workers
2. GitHub Pages with client-side-only logic
3. AWS Lambda via API Gateway
4. Self-hosted server (e.g., a VPS running Node.js)

## Decision Outcome

Chosen option: "Cloudflare Workers", because it is the only considered option that satisfies both the course deployment constraints and the need for server-side compute. It runs standard JavaScript, has a generous free tier, and integrates natively with other Cloudflare services we plan to use for storage and static hosting.

### Consequences

* Good, because Workers run JavaScript natively — no new language or runtime for the team to learn
* Good, because the free tier includes 100,000 requests per day, which is more than sufficient for our project scale
* Good, because Workers deploy to Cloudflare's edge network, giving low-latency responses without managing infrastructure
* Good, because deployment can be automated via Wrangler CLI in our GitHub Actions pipeline
* Bad, because the Workers runtime is not a full Node.js environment — some Node APIs (e.g., `fs`, `net`) are unavailable
* Bad, because local development requires the Wrangler CLI or Miniflare, adding a tool the team must learn
* Bad, because debugging edge-deployed functions can be less intuitive than a local server

### Confirmation

Confirmation will occur when a Worker successfully handles an authenticated API request in a staging environment and is deployable via our CI/CD pipeline.

## Pros and Cons of the Options

### Cloudflare Workers

Serverless functions running on Cloudflare's edge network, written in JavaScript.

* Good, because it satisfies the course deployment constraint (Cloudflare)
* Good, because it has a generous free tier (100K requests/day)
* Good, because it integrates natively with Cloudflare D1, KV, and Pages
* Good, because no server provisioning or maintenance is required
* Bad, because Workers have a 10ms CPU time limit on the free plan, constraining compute-heavy operations
* Bad, because the team must learn the Wrangler CLI for development and deployment

### GitHub Pages with client-side-only logic

All logic runs in the browser; data is stored in localStorage or a third-party BaaS.

* Good, because no backend infrastructure is needed at all
* Good, because deployment is trivial — just push static files
* Bad, because authentication cannot be implemented securely without a server; secrets would be exposed in client-side code
* Bad, because there is no way to enforce access control or validate data server-side
* Bad, because this fundamentally limits the application to a single-user local tool, which does not meet the product requirements for team collaboration

### AWS Lambda via API Gateway

Serverless functions on AWS, triggered by HTTP requests through API Gateway.

* Good, because Lambda is a mature, well-documented serverless platform
* Good, because it supports full Node.js runtime with all APIs
* Bad, because AWS is not listed as a permitted deployment target in the course constraints
* Bad, because AWS Lambda + API Gateway configuration is significantly more complex than Workers
* Bad, because the free tier requires an AWS account with billing enabled, introducing cost risk

### Self-hosted server

A traditional server (e.g., a VPS running Node.js with Express).

* Good, because it provides full control over the runtime environment
* Good, because the team has more flexibility in tooling and middleware
* Bad, because it is explicitly outside the permitted deployment targets (GitHub Pages or Cloudflare)
* Bad, because it requires ongoing maintenance, monitoring, and security patching
* Bad, because it introduces cost and operational complexity inappropriate for a course project

## More Information

* [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
* [Wrangler CLI documentation](https://developers.cloudflare.com/workers/wrangler/)
* Course project spec restricts deployment to GitHub Pages, Cloudflare, or downloadable assets
