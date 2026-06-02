---
status: accepted
date: 2026-05-22
decision-makers: SE SitRep team
---

# Use Cloudflare Pages for Frontend Hosting

## Context and Problem Statement

Our application consists of a static frontend (vanilla HTML, CSS, and JavaScript) and a backend powered by Cloudflare Workers (see ADR-0001). The frontend needs to be hosted on a platform that serves static files, supports custom domains, and can be deployed automatically from our GitHub repository. Both GitHub Pages and Cloudflare Pages are permitted by the course constraints. Which static hosting platform should we use for the frontend?

## Decision Drivers

* Backend already runs on Cloudflare Workers — colocating the frontend on Cloudflare simplifies the architecture
* Deployment must be automatable from the GitHub repository via CI/CD
* Must support HTTPS and custom domains
* Must be free for our project's scale
* Minimizing the number of separate deployment targets reduces operational complexity for the team

## Considered Options

1. Cloudflare Pages
2. GitHub Pages
3. Separate documentation site on GitHub Pages + frontend on Cloudflare Pages (hybrid)

## Decision Outcome

Chosen option: "Cloudflare Pages", because it colocates the frontend with our Cloudflare Workers backend in a single platform, simplifies deployment and routing, supports Pages Functions for lightweight API routes, and avoids CORS configuration issues that would arise from hosting the frontend and backend on separate domains.

### Consequences

* Good, because the frontend and backend share the same domain — API calls from the frontend to Workers do not require CORS headers
* Good, because Cloudflare Pages connects directly to our GitHub repository and can auto-deploy on push
* Good, because Pages Functions allow us to define API routes as files in the repository alongside the frontend, reducing deployment complexity
* Good, because we manage one platform (Cloudflare) instead of two (Cloudflare + GitHub Pages)
* Bad, because our end-user documentation site and technical wiki may still need to live on GitHub Pages or a GitHub Wiki, meaning we have not fully eliminated multi-platform deployment
* Bad, because the team must learn Cloudflare's dashboard and Pages configuration in addition to GitHub

### Confirmation

Confirmation will occur when the static frontend is deployed to Cloudflare Pages from the GitHub repository and successfully communicates with Workers API endpoints on the same domain without CORS errors.

## Pros and Cons of the Options

### Cloudflare Pages

Cloudflare's static site hosting platform with integrated Workers support.

* Good, because it shares a domain with Cloudflare Workers, eliminating CORS complexity
* Good, because Pages Functions (file-based Workers routing) let us define API endpoints alongside frontend code in one repository
* Good, because it auto-deploys from GitHub on push with zero configuration
* Good, because it provides preview deployments for every pull request, which supports our code review workflow
* Good, because the free tier includes unlimited requests and bandwidth
* Bad, because the team needs to manage configuration in the Cloudflare dashboard, which is an additional interface to learn
* Neutral, because the build step is trivial for vanilla HTML/CSS/JS (just serve the directory), so Pages' build pipeline features are mostly unused

### GitHub Pages

GitHub's built-in static site hosting, served from a repository branch or directory.

* Good, because it requires zero additional accounts — the team already uses GitHub
* Good, because it is the simplest possible deployment path: push to a branch and the site is live
* Good, because it is well-documented and familiar to most developers
* Bad, because it is static-only with no server-side execution — all API calls would need to go to Cloudflare Workers on a different domain, requiring CORS configuration
* Bad, because CORS introduces security surface area (configuring allowed origins) and debugging complexity (preflight requests, credential handling)
* Bad, because managing two deployment platforms (GitHub Pages for frontend, Cloudflare for backend) doubles the CI/CD pipeline complexity
* Neutral, because GitHub Pages could still be used for the project's end-user documentation site or technical wiki, even if the main app frontend is on Cloudflare

### Hybrid: GitHub Pages for docs + Cloudflare Pages for app

Use both platforms, each for what it does best.

* Good, because it uses GitHub Pages for documentation (where it excels with Jekyll/Markdown support) and Cloudflare Pages for the application frontend
* Good, because it separates concerns — documentation deploys independently of the application
* Bad, because it requires maintaining two deployment pipelines in GitHub Actions
* Bad, because it increases onboarding complexity for team members who need to understand both platforms
* Neutral, because this may become the eventual approach if we need a GitHub Wiki or Pages site for the required technical documentation site, regardless of where the app frontend lives

## More Information

* [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/)
* [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
* [GitHub Pages documentation](https://docs.github.com/en/pages)
* Related: ADR-0001 (Use Cloudflare Workers for Backend Compute)
* Related: ADR-0002 (Use Cloudflare D1 for Data Persistence)
