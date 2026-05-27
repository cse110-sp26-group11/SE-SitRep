GitHub Issue Tasks

Define Backend API Contract

* Document API routes, request/response schemas, error shapes, and auth expectations.  
* Include schemas for users, standups, availability, GitHub issues, workflows, repo metrics, sprint health, and AI summaries.  
* Acceptance: frontend developers can replace mock data with fetch() calls without guessing field names.  
* Set Up Backend Project Structure

Create backend app, routing, environment config, lint/test setup, and local dev instructions.

* Decide runtime/storage stack, for example Node/Express, serverless functions, Cloudflare Workers/KV, or another team-approved option.  
* Acceptance: backend runs locally and exposes a health check endpoint like GET /api/health.  
* Implement User and Team Model

Store team members with display name, initials, role/status, avatar metadata, and GitHub username.

* Support fetching the active team roster.  
* Acceptance: GET /api/team returns members needed by feed and meeting views.  
* Implement Standup Persistence

Add backend storage for daily standups.

* Support creating, updating, and fetching standups by date/team/user.  
* Fields needed by the frontend: id, name, initials, status, badgeLabel, badgeType, timeAgo or timestamp, today, yesterday, blocker, availability, isBlocker.  
* Acceptance: GET /api/standups replaces the mock MOCK\_PEOPLE feed data.  
* Implement Standup Submission Endpoint

Wire the “My standup” form to a real save endpoint.

* Persist yesterday, today, blocker text, availability, include-GitHub flag, and notify-lead flag.  
* Acceptance: submitting the form creates/updates the current user’s standup and the team feed reflects it after reload.  
* Implement No-Update and Blocker Status Logic

Compute who has not checked in today.

* Compute blocker counts from standup blocker fields.  
* Acceptance: feed filters for blocked and no-update can use real backend data instead of local placeholder logic.  
* Implement Shared Meeting Availability Storage

Persist each user’s weekly availability grid.

* Support statuses: available, maybe, busy.  
* Acceptance: GET /api/availability returns team availability, and PUT /api/availability/me saves the current user’s grid instead of localStorage.  
* Implement Meeting Overlap Calculation

Move overlap scoring to the backend or expose enough raw data for frontend calculation.

* Return best meeting slots sorted by team availability score.  
* Acceptance: “Best overlap” and “Current team” use live team data.  
* Set Up GitHub Authentication / Token Access

Add GitHub OAuth or repository access token handling.

* Store tokens securely if using per-user auth, or configure a repo-level token for MVP.  
* Acceptance: backend can call GitHub APIs for the target repository without exposing secrets to the frontend.  
* Implement GitHub Issue Sync

Fetch GitHub issues with id/number, title, labels, status, assignee/owner, deadline metadata, difficulty metadata, and risk.

* Decide where difficulty/deadline live, likely labels, issue body metadata, or project fields.  
* Acceptance: “Issues in focus,” “Deadline risks,” and “Issue distribution” use real issue data.  
* Implement GitHub Workflow/CI Sync  
* Fetch recent GitHub Actions workflow runs.  
* Return workflow name, branch, status, timestamp, duration, passed tests, and failed tests where available.  
* Acceptance: “Workflow health” and “CI trend” use live workflow data.

Implement Repo Pulse Aggregation

* Aggregate dashboard stats: open issues, blocked updates, failing workflows, due-soon issues, commits today, checked-in count.  
* Acceptance: top dashboard cards and repo pulse metrics are served by GET /api/dashboard.  
* Implement Recent GitHub Activity for Standups  
* When includeGithub is checked, attach recent commits, PRs, reviews, or issue activity for the submitting user.  
* Acceptance: saved standup can include a compact GitHub activity summary.

Implement Lead/Blocker Notifications

* If notifyLead is checked and a blocker exists, notify the team lead.  
* MVP could store notification records; later could integrate email/Slack/Discord.  
* Acceptance: blocker submission creates a notification visible through an API.

Implement AI Summary Endpoint

* Generate or assemble the AI summary view from standups, blockers, issues, workflows, and meeting availability.  
* Return synopsis text, highlights, blockers, recommended actions, and meeting brief rows.  
* Acceptance: AI summary page no longer uses hardcoded summary strings.  
* Implement Sprint Health Endpoint  
* Compute sprint completion, workflows passing, due-this-week count, standups filed, deadline risks, CI trend, and issue distribution.  
* Acceptance: sprint health page can render from one backend response.

Add Backend Validation and Error Handling

* Validate request bodies and return consistent errors.  
* Protect against missing required fields, invalid availability values, oversized standup text, and GitHub API failures.  
* Acceptance: frontend can show useful failure states for failed loads/saves.

Add Backend Tests

* Unit test data transformations and aggregation logic.  
* Integration test core endpoints: standups, availability, GitHub sync, dashboard, AI summary.  
* Acceptance: tests run in CI and cover the main backend flows.  
* Add Deployment and Environment Documentation  
* Document required env vars, local setup, GitHub token scopes, storage setup, and deployment steps.  
* Acceptance: another teammate can run the backend locally from the README.

Recommended order: start with API contract, backend setup, team/standup persistence, and availability. Then add GitHub sync, dashboard/sprint health, notifications, and AI summary.  
