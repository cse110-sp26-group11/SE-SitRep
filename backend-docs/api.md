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

## Unsupported Requests

Only `GET` requests are currently supported.

Example:

```sh
curl -X POST http://localhost:8787/api/standups
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
