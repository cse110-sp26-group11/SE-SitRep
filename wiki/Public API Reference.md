# Public API Reference

## Base URL

For local development:

```txt
http://localhost:8787
```

All endpoints return JSON. Error responses use the shape:

```json
{
  "error": "Message"
}
```

## GET /api/health

Checks whether the Worker is running and can query D1.

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

### Status codes

- `200` — success
- `500` — unexpected backend error

## GET /api/team

Returns team metadata and active member information.

### Query parameters

- `teamId` (optional) — defaults to `team-demo`

### Request

```sh
curl http://localhost:8787/api/team
curl 'http://localhost:8787/api/team?teamId=team-demo'
```

### Response shape

```json
{
  "team": { ... },
  "members": [ ... ]
}
```

### Status codes

- `200` — success
- `404` — team not found
- `500` — unexpected backend error

## GET /api/dashboard

Returns aggregated dashboard information for a team.

### Query parameters

- `teamId` (optional) — defaults to `team-demo`
- `date` (optional) — `YYYY-MM-DD`

### Request

```sh
curl http://localhost:8787/api/dashboard
curl 'http://localhost:8787/api/dashboard?teamId=team-demo&date=2026-05-10'
```

### Response shape

The response includes repo pulse data, issue and workflow summaries, and sprint health metrics.

### Status codes

- `200` — success
- `404` — team not found
- `500` — unexpected backend error

## GET /api/standups

Returns standup entries for a team, optionally filtered by date.

### Query parameters

- `teamId` (optional) — defaults to `team-demo`
- `date` (optional) — filters by `standup_date`

### Request

```sh
curl http://localhost:8787/api/standups
curl 'http://localhost:8787/api/standups?teamId=team-demo&date=2026-05-10'
```

### Response shape

```json
{
  "teamId": "team-demo",
  "date": "2026-05-10",
  "standups": [ ... ]
}
```

### Status codes

- `200` — success
- `500` — unexpected backend error

## POST /api/standups

Creates a new standup entry for a team member.

### Request body

```json
{
  "teamId": "team-demo",
  "userId": "user-maya",
  "standupDate": "2026-05-11",
  "yesterday": "Worked on UI.",
  "today": "Building the new status view.",
  "blocker": null,
  "availability": "available",
  "includeGithub": true,
  "notifyLead": false,
  "githubActivitySummary": null
}
```

### Status codes

- `201` — created
- `400` — invalid payload
- `404` — active member not found
- `409` — standup already exists for the user and date
- `500` — unexpected backend error

## PUT /api/standups/:id

Updates an existing standup.

### Request body

Only changed fields are required. Supported fields include:

- `yesterday`
- `today`
- `blocker`
- `availability`
- `includeGithub`
- `notifyLead`
- `githubActivitySummary`

### Status codes

- `200` — success
- `400` — invalid payload
- `404` — standup not found
- `500` — unexpected backend error

## GET /api/availability

Returns weekly availability slots for a team.

### Query parameters

- `teamId` (optional) — defaults to `team-demo`
- `weekStart` (required) — `YYYY-MM-DD`

### Request

```sh
curl 'http://localhost:8787/api/availability?teamId=team-demo&weekStart=2026-05-04'
```

### Status codes

- `200` — success
- `400` — invalid `weekStart`
- `500` — unexpected backend error

## PUT /api/availability/me

Creates or updates availability records for the current user.

### Request body

```json
{
  "teamId": "team-demo",
  "userId": "user-maya",
  "weekStart": "2026-05-04",
  "slots": [
    {
      "dayIndex": 2,
      "slotIndex": 5,
      "slotLabel": "2 PM",
      "status": "available"
    }
  ]
}
```

### Status codes

- `200` — success
- `400` — invalid payload
- `404` — active team member not found
- `500` — unexpected backend error

## GET /api/availability/overlap

Returns ranked meeting overlap slots for a team week.

### Query parameters

- `teamId` (optional) — defaults to `team-demo`
- `weekStart` (required) — `YYYY-MM-DD`

### Request

```sh
curl 'http://localhost:8787/api/availability/overlap?teamId=team-demo&weekStart=2026-05-04'
```

### Status codes

- `200` — success
- `400` — invalid `weekStart`
- `500` — unexpected backend error

## Notes

- All responses use camelCase field names.
- Unknown paths return `404 Not found`.
- Unsupported methods return `405 Method not allowed`.
