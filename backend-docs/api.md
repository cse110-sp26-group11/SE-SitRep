# API Reference

Base URL in local development:

```txt
http://localhost:8787
```

Current API responses are JSON and include:

```txt
cache-control: no-store
```

## Error Shape

All current error responses use this shape:

```json
{
  "error": "Message"
}
```

## GET /api/health

Checks that the Worker is running and can query D1.

### Request

```sh
curl http://localhost:8787/api/health
```

### Response

```json
{
  "status": "ok",
  "service": "se-sitrep-api",
  "database": "reachable"
}
```

### Notes

The handler executes:

```sql
SELECT 1 AS ok
```

If this endpoint fails, the Worker cannot reach the configured D1 binding.

## GET /api/team

Returns one team and its members.

### Query Params

```txt
teamId optional, defaults to team-demo
```

### Request

```sh
curl http://localhost:8787/api/team
curl 'http://localhost:8787/api/team?teamId=team-demo'
```

### Response Shape

```json
{
  "team": {
    "id": "team-demo",
    "name": "SE SitRep Demo Team",
    "repoOwner": "cse110-sp26-group11",
    "repoName": "SE-SitRep",
    "sprintName": "Sprint 2",
    "createdAt": "2026-05-25 02:27:11",
    "updatedAt": "2026-05-25 02:27:11"
  },
  "members": [
    {
      "id": "user-arav",
      "displayName": "Arav Kumar",
      "initials": "AK",
      "githubUsername": "arav-kumar",
      "avatarColorKey": "ak",
      "role": "lead",
      "isLead": true,
      "active": true,
      "joinedAt": "2026-05-25 02:27:11"
    }
  ]
}
```

### Status Codes

```txt
200 team found
404 teamId does not exist
500 unexpected backend error
```

## GET /api/standups

Returns standup entries joined with user/member metadata.

### Query Params

```txt
teamId optional, defaults to team-demo
date   optional, filters by standup_date when provided
```

### Request

```sh
curl http://localhost:8787/api/standups
curl 'http://localhost:8787/api/standups?teamId=team-demo&date=2026-05-10'
```

### Response Shape

```json
{
  "teamId": "team-demo",
  "date": "2026-05-10",
  "standups": [
    {
      "id": "standup-demo-jamie-2026-05-10",
      "userId": "user-jamie",
      "teamId": "team-demo",
      "name": "Jamie Lee",
      "initials": "JL",
      "githubUsername": "jamie-lee",
      "avatarColorKey": "jl",
      "status": "blocked",
      "badgeLabel": "blocked",
      "badgeType": "blocked",
      "standupDate": "2026-05-10",
      "submittedAt": "2026-05-25 02:27:11",
      "updatedAt": "2026-05-25 02:27:11",
      "today": "Waiting on Cloudflare KV access, cannot proceed with persistence layer",
      "yesterday": null,
      "blocker": "Waiting on Cloudflare KV access",
      "availability": "partial",
      "includeGithub": true,
      "notifyLead": true,
      "githubActivitySummary": null,
      "isBlocker": true
    }
  ]
}
```

### Field Notes

`status` is derived for the current frontend feed:

```txt
blocked if blocker text exists
lead    if the team member is lead and not blocked
else    availability value from the standup row
```

`badgeLabel` and `badgeType` are also derived:

```txt
blocked standup -> blocked badge
lead member     -> lead badge
other member    -> null badge
```

### Status Codes

```txt
200 query succeeded, even if standups is empty
500 unexpected backend error
```

## GET /api/dashboard

Returns aggregate dashboard data for the Team Feed dashboard and repo context
cards.

### Query Params

```txt
teamId optional, defaults to team-demo
date   required, YYYY-MM-DD
```

### Request

```sh
curl 'http://localhost:8787/api/dashboard?teamId=team-demo&date=2026-05-10'
```

### Response Shape

```json
{
  "team": {
    "id": "team-demo",
    "name": "SE SitRep Demo Team",
    "repoOwner": "cse110-sp26-group11",
    "repoName": "SE-SitRep",
    "sprintName": "Sprint 2"
  },
  "teamId": "team-demo",
  "date": "2026-05-10",
  "metrics": {
    "checkedIn": {
      "label": "Checked in today",
      "value": 5,
      "total": 5,
      "completionRate": 1,
      "tone": "success"
    },
    "blockers": {
      "label": "Active blockers",
      "value": 1,
      "tone": "warning"
    },
    "openIssues": {
      "label": "Open issues",
      "value": 4,
      "tone": "neutral"
    },
    "failingWorkflows": {
      "label": "Failing workflows",
      "value": 1,
      "tone": "danger"
    },
    "dueSoon": {
      "label": "Due in 48h",
      "value": 2,
      "tone": "warning"
    }
  },
  "repoPulse": [
    { "label": "Open issues", "value": 4, "tone": "neutral" }
  ],
  "issues": [],
  "workflows": []
}
```

`issues` contains normalized GitHub issue snapshot rows. `workflows` contains
normalized GitHub workflow snapshot rows.

### Status Codes

```txt
200 query succeeded
400 missing or invalid date
500 unexpected backend error
```

## GET /api/issues

Returns normalized GitHub issue snapshots for a team.

### Query Params

```txt
teamId optional, defaults to team-demo
```

### Request

```sh
curl 'http://localhost:8787/api/issues?teamId=team-demo'
```

### Response Shape

```json
{
  "teamId": "team-demo",
  "issues": [
    {
      "id": "issue-demo-51",
      "issueNumber": 51,
      "title": "Workflow failures need a CI health card in sprint health",
      "status": "Blocked",
      "owner": "Arav Kumar",
      "ownerUserId": "user-arav",
      "difficulty": "Hard",
      "deadline": "2026-05-23",
      "risk": "high",
      "labels": ["github-actions", "ci"],
      "url": null,
      "syncedAt": "2026-05-25 21:57:59"
    }
  ]
}
```

### Status Codes

```txt
200 query succeeded, even if issues is empty
500 unexpected backend error
```

## GET /api/sprint-health

Returns aggregate data for the Sprint Health view.

### Query Params

```txt
teamId optional, defaults to team-demo
date   required, YYYY-MM-DD
```

### Request

```sh
curl 'http://localhost:8787/api/sprint-health?teamId=team-demo&date=2026-05-10'
```

### Response Shape

```json
{
  "teamId": "team-demo",
  "date": "2026-05-10",
  "healthMetrics": [
    {
      "label": "Sprint completion",
      "value": "100%",
      "numericValue": 1
    },
    {
      "label": "Workflows passing",
      "value": "2/3",
      "numericValue": 0.6666666666666666
    }
  ],
  "deadlineRisks": [
    {
      "id": "issue-demo-51",
      "issueNumber": 51,
      "title": "Workflow failures need a CI health card in sprint health",
      "owner": "Arav Kumar",
      "ownerUserId": "user-arav",
      "status": "Blocked",
      "difficulty": "Hard",
      "deadline": "2026-05-23",
      "risk": "high",
      "labels": ["github-actions", "ci"],
      "url": null
    }
  ],
  "workflowTrend": [],
  "issueDistribution": [
    { "label": "Hard issues", "value": 1 },
    { "label": "In progress", "value": 1 },
    { "label": "Blocked", "value": 1 },
    { "label": "In review", "value": 1 }
  ]
}
```

### Status Codes

```txt
200 query succeeded
400 missing or invalid date
500 unexpected backend error
```

## GET /api/workflows

Returns normalized GitHub workflow snapshots for a team.

### Query Params

```txt
teamId optional, defaults to team-demo
```

### Request

```sh
curl 'http://localhost:8787/api/workflows?teamId=team-demo'
```

### Response Shape

```json
{
  "teamId": "team-demo",
  "workflows": [
    {
      "id": "workflow-demo-pr",
      "name": "Pull request validation",
      "branch": "main",
      "status": "failing",
      "durationSeconds": 192,
      "passedTests": 41,
      "failedTests": 2,
      "url": null,
      "createdAt": "2026-05-10T11:17:00Z",
      "syncedAt": "2026-05-25 21:57:59"
    }
  ]
}
```

### Status Codes

```txt
200 query succeeded, even if workflows is empty
500 unexpected backend error
```

## POST /api/standups

Creates one standup for a team member on a specific date.

The database enforces one standup per `teamId`, `userId`, and `standupDate`.

### Request

```sh
curl -X POST http://localhost:8787/api/standups \
  -H 'content-type: application/json' \
  --data '{
    "teamId": "team-demo",
    "userId": "user-maya",
    "standupDate": "2026-05-11",
    "yesterday": "Reviewed pull request feedback.",
    "today": "Implementing standup API endpoints.",
    "blocker": null,
    "availability": "available",
    "includeGithub": true,
    "notifyLead": false,
    "githubActivitySummary": "Opened one backend PR."
  }'
```

### Body Fields

```txt
teamId                optional, defaults to team-demo
userId                required
standupDate           required, YYYY-MM-DD
yesterday             optional string or null
today                 required string
blocker               optional string or null
availability          optional, defaults to available
includeGithub         optional boolean, defaults to true
notifyLead            optional boolean, defaults to false
githubActivitySummary optional string or null
```

Availability must be one of:

```txt
available
partial
unavailable
```

### Response Shape

```json
{
  "standup": {
    "id": "generated-uuid",
    "userId": "user-maya",
    "teamId": "team-demo",
    "name": "Maya Rodriguez",
    "initials": "MR",
    "githubUsername": "maya-rodriguez",
    "avatarColorKey": "mr",
    "status": "available",
    "badgeLabel": null,
    "badgeType": null,
    "standupDate": "2026-05-11",
    "submittedAt": "2026-05-25 02:27:11",
    "updatedAt": "2026-05-25 02:27:11",
    "today": "Implementing standup API endpoints.",
    "yesterday": "Reviewed pull request feedback.",
    "blocker": null,
    "availability": "available",
    "includeGithub": true,
    "notifyLead": false,
    "githubActivitySummary": "Opened one backend PR.",
    "isBlocker": false
  }
}
```

### Status Codes

```txt
201 standup created
400 invalid JSON or invalid field value
404 active team member not found
409 standup already exists for this user/date/team
500 unexpected backend error
```

## PUT /api/standups/:id

Updates editable fields on an existing standup.

This endpoint does not change `teamId`, `userId`, or `standupDate`. Create a new
standup if the user/date needs to change.

### Request

```sh
curl -X PUT http://localhost:8787/api/standups/generated-uuid \
  -H 'content-type: application/json' \
  --data '{
    "today": "Finished standup API validation.",
    "blocker": "Waiting for review",
    "availability": "partial",
    "notifyLead": true
  }'
```

### Editable Fields

```txt
yesterday
today
blocker
availability
includeGithub
notifyLead
githubActivitySummary
```

At least one editable field is required.

### Response Shape

```json
{
  "standup": {
    "id": "generated-uuid",
    "status": "blocked",
    "badgeLabel": "blocked",
    "badgeType": "blocked",
    "today": "Finished standup API validation.",
    "blocker": "Waiting for review",
    "availability": "partial",
    "notifyLead": true,
    "isBlocker": true
  }
}
```

The real response includes the full standup object, matching the `POST
/api/standups` response shape.

### Status Codes

```txt
200 standup updated
400 invalid JSON, invalid field value, or no editable fields
404 standup not found
500 unexpected backend error
```

## GET /api/availability

Returns team availability slots for one week.

### Query Params

```txt
teamId    optional, defaults to team-demo
weekStart required, YYYY-MM-DD
```

### Request

```sh
curl 'http://localhost:8787/api/availability?teamId=team-demo&weekStart=2026-05-04'
```

### Response Shape

```json
{
  "teamId": "team-demo",
  "weekStart": "2026-05-04",
  "slots": [
    {
      "id": "avail-maya-2026-05-04-0-0",
      "teamId": "team-demo",
      "userId": "user-maya",
      "weekStart": "2026-05-04",
      "dayIndex": 0,
      "slotIndex": 0,
      "slotLabel": "9 AM",
      "status": "available",
      "updatedAt": "2026-05-25 02:27:11",
      "member": {
        "id": "user-maya",
        "displayName": "Maya Rodriguez",
        "initials": "MR",
        "githubUsername": "maya-rodriguez",
        "avatarColorKey": "mr"
      }
    }
  ]
}
```

### Status Codes

```txt
200 query succeeded, even if slots is empty
400 missing or invalid weekStart
500 unexpected backend error
```

## PUT /api/availability/me

Upserts availability slots for one active team member.

There is no authentication yet, so the request body must include `userId`.
When auth is added, this endpoint should derive the user from the session/token
instead.

### Request

```sh
curl -X PUT http://localhost:8787/api/availability/me \
  -H 'content-type: application/json' \
  --data '{
    "teamId": "team-demo",
    "userId": "user-maya",
    "weekStart": "2026-05-04",
    "slots": [
      { "dayIndex": 2, "slotIndex": 5, "slotLabel": "2 PM", "status": "available" },
      { "dayIndex": 2, "slotIndex": 6, "slotLabel": "3 PM", "status": "maybe" }
    ]
  }'
```

### Body Fields

```txt
teamId              optional, defaults to team-demo
userId              required until auth exists
weekStart           required, YYYY-MM-DD
slots               required non-empty array
slots[].dayIndex    integer from 0 to 6
slots[].slotIndex   integer from 0 to 47
slots[].slotLabel   required string
slots[].status      available, maybe, or busy
```

### Response Shape

```json
{
  "teamId": "team-demo",
  "userId": "user-maya",
  "weekStart": "2026-05-04",
  "slots": []
}
```

The response returns that user's full availability rows for the requested week
after the upsert.

### Status Codes

```txt
200 availability updated
400 invalid JSON or invalid field value
404 active team member not found
500 unexpected backend error
```

## GET /api/availability/overlap

Returns availability slots grouped by time and sorted by strongest team overlap.

### Query Params

```txt
teamId    optional, defaults to team-demo
weekStart required, YYYY-MM-DD
```

### Request

```sh
curl 'http://localhost:8787/api/availability/overlap?teamId=team-demo&weekStart=2026-05-04'
```

### Scoring

```txt
available = 1
maybe     = 0.5
busy      = 0
missing   = counted as busy
```

### Response Shape

```json
{
  "teamId": "team-demo",
  "weekStart": "2026-05-04",
  "overlap": [
    {
      "teamId": "team-demo",
      "weekStart": "2026-05-04",
      "dayIndex": 0,
      "slotIndex": 1,
      "slotLabel": "10 AM",
      "score": 2,
      "availableCount": 2,
      "maybeCount": 0,
      "busyCount": 3,
      "totalMembers": 5,
      "members": [
        {
          "id": "user-arav",
          "displayName": "Arav Kumar",
          "initials": "AK",
          "status": "available"
        }
      ]
    }
  ]
}
```

### Status Codes

```txt
200 query succeeded, even if overlap is empty
400 missing or invalid weekStart
500 unexpected backend error
```

## Unsupported Requests

Unsupported method/path combinations return `405`.

Example:

```sh
curl -X DELETE http://localhost:8787/api/standups/generated-uuid
```

Response:

```json
{
  "error": "Method not allowed"
}
```

Unknown routes return:

```json
{
  "error": "Not found"
}
```
