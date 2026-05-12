# Sprint 1 Research

## Domain Research: Agile Team Status Tracking

### Problem Space

Software teams — especially small, intern, or remote Agile teams — struggle with a set of recurring coordination challenges:

- **Async visibility gaps**: Teammates don't know what others are working on between meetings, leading to duplicated effort or missed dependencies.
- **Blocker blindness**: Blockers often go unmentioned until a standup, costing hours or days of blocked progress.
- **Meeting fatigue**: Daily synchronous standups can feel repetitive and low-value, especially when teams span time zones or have irregular schedules.
- **Availability ambiguity**: Teams can't easily see who is free, who is heads-down, or who might need coverage.
- **GitHub activity disconnects**: Code changes happen constantly, but team members often aren't aware of pushes, PRs, or merge conflicts until they collide with them.
- **AI agent participation**: As AI agents begin contributing to codebases (e.g., via GitHub Copilot Workspace, Claude Code), teams have no standard way to "check in" or track what the agents are doing — raising the question: do AI contributors need standups too?

Traditional standup tools weren't designed for small intern teams or AI-assisted workflows. There's a gap worth filling.

---

## Competitor Research

### Steady (formerly Status Hero) — [runsteady.com](https://runsteady.com/)
- Async standup check-ins via Slack, web, or mobile
- Tracks "yesterday / today / blockers" format
- Team status feed and goal tracking
- Basic analytics on response rates

**Gaps/Weaknesses:**
- No GitHub integration for code-level activity awareness
- No AI summarization or insights
- Paid product — not accessible for intern teams
- No consideration of AI agents as team participants

### Geekbot
- Slack-native standup bot
- Scheduled async check-ins
- Simple reporting dashboard

**Gaps:** No GitHub integration, no AI features, limited to Slack.

### Linear / GitHub Projects
- Issue tracking with status boards
- Not standup-focused; no daily check-in flow

**Gaps:** Not async standup tools; require active manual updates with no prompting.

### Key Differentiators for SE SitRep
Based on the above, SE SitRep can stand out by:
1. Integrating GitHub activity (commits, PRs, open issues) into daily standup context
2. AI-generated summaries of team status
3. Lightweight, free, and usable by small intern Agile teams
4. Addressing AI agent participation in standup workflows

---

## User Personas

### Persona 1 — Maya, Software Engineering Intern (Team Member)
- **Context**: Junior CS intern on a 7-person capstone team, mostly working remotely
- **Pain points**: Forgets to post standups, doesn't always know if her PR is blocking someone, struggles to remember what she did yesterday
- **Goals**: Quick, low-friction daily check-in; see if anyone is stuck because of her; feel connected to teammates without constant Slack noise
- **Tech comfort**: High; uses GitHub daily

### Persona 2 — Jordan, Team Lead
- **Context**: Senior intern acting as Scrum Master/lead; coordinates with TA and manages sprint planning
- **Pain points**: Chasing teammates for updates, not knowing the "real" team status before TA meetings, can't easily see who's blocked
- **Goals**: Single dashboard view of team health; AI summary before TA meetings; blocker detection; sprint progress visibility
- **Tech comfort**: Very high; sets up CI/CD, manages GitHub

### Persona 3 — Raymond, Product Owner
- **Context**: Evaluates team progress weekly; wants evidence of process, not just product
- **Pain points**: Teams that don't communicate consistently; opaque development histories
- **Goals**: Quickly assess team communication health; confirm standups are happening; see sprint trajectory
- **Tech comfort**: High; familiar with GitHub, Agile tools

---

## User Stories

### Core Standup Flow
- As a **team member**, I want to submit a quick daily standup (what I did, what I'm doing, any blockers) so that my team stays informed without needing a synchronous meeting.
- As a **team member**, I want to see my teammates' latest status updates in one feed so I know who's working on what.
- As a **team lead**, I want to receive a daily AI-generated summary of team status so I can quickly assess team health before TA meetings.

### Blocker & Availability
- As a **team member**, I want to flag a blocker and optionally tag a teammate so the right person gets notified.
- As a **team member**, I want to mark myself as unavailable or request coverage so the team can adjust.
- As a **team lead**, I want to see who has unresolved blockers at a glance so I can intervene early.

### GitHub Integration
- As a **team member**, I want my recent GitHub commits to be optionally included in my standup so I don't have to repeat myself.
- As a **team lead**, I want to see a GitHub activity summary alongside standup data so I can correlate code progress with reported status.

### Meeting Coordination
- As a **team**, I want to indicate availability windows so we can find the best time for sync meetings without a back-and-forth.

### AI Agent Tracking (Stretch)
- As a **team lead**, I want AI agents contributing to the repo to log their actions (e.g., files modified, PRs opened) in a structured way so the team can track AI contributions alongside human ones.

---

## Wireframe Ideas

### Screen 1 — Daily Standup Submission Form
- Three prompts: "What did you do yesterday?", "What are you doing today?", "Any blockers?"
- Optional GitHub activity pull-in toggle
- Availability toggle: "Available / Partially available / Unavailable"
- Submit button → confirmation screen

### Screen 2 — Team Status Feed (Dashboard)
- Card per team member showing latest standup entry
- Blocker badge if applicable
- GitHub commit count for the day (if integrated)
- Timestamp of last update
- Overall sprint progress bar

### Screen 3 — AI Summary Panel
- Auto-generated paragraph summarizing team status
- Highlights blockers, notable completions, and upcoming work
- "Refresh" button to regenerate
- Export to clipboard or Markdown

### Screen 4 — Sprint Health View (Team Lead)
- Sprint timeline with completion percentage
- Checklist of who has checked in today
- Link to open GitHub issues
- TA meeting prep export

---

## Technical Considerations (Early Thinking)

- **Tech stack**: Vanilla HTML/CSS/JS per project constraints (no frameworks unless approved)
- **Deployment target**: GitHub Pages or Cloudflare Pages
- **GitHub integration**: GitHub REST API for commit/PR data; OAuth for auth
- **AI features**: Anthropic Claude API (or similar) for standup summarization
- **Storage**: localStorage for prototyping; JSON-based or Cloudflare KV for persistence
- **Progressive Web App (PWA)**: Likely a good fit given mobile and async use cases

---

## Open Questions for Sprint Planning

1. Does the team want to build as a PWA or a traditional web app?
2. How will auth work — GitHub OAuth, or something lighter for MVP?
3. Will GitHub integration be in scope for Sprint 2, or pushed to later?
4. How do we define "AI agent participation" in a standup — is this a stretch goal or core?
5. Should standup data persist across sessions (needs backend/KV) or just session-scoped (localStorage)?
