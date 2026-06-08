# User Guide

## What SE SitRep is

SE SitRep is a lightweight team status and availability reporting app. It helps teams track daily standups, share blockers, and find the best meeting times based on member availability.

## Who this guide is for

- Team members using the app or API
- QA testers validating endpoints
- Anyone exploring the demo data and workflows

## Main user workflows

### View your team and members

Use the team API to fetch the demo team, its members, and profile metadata.

### Read and manage standups

You can fetch standup updates for a team and date, add a new standup, or update an existing one.

### Share your availability

The app stores weekly availability in calendar-style slots. Each team member can update their own availability and the service can compute overlap for the full team.

### Find meeting overlap

The overlap endpoint ranks meeting slots by how many members are available or maybe available. This helps choose a time that works for the most people.

## API quick start

Base URL for local development:

```txt
http://localhost:8787
```

### Common endpoints

- `GET /api/health` — confirm the service is running
- `GET /api/team` — fetch team details and member roster
- `GET /api/dashboard` — fetch dashboard summary data
- `GET /api/standups` — list standups for a team
- `POST /api/standups` — create a standup entry
- `PUT /api/standups/:id` — update a standup entry
- `GET /api/availability` — list availability slots for a week
- `PUT /api/availability/me` — update your own availability
- `GET /api/availability/overlap` — compute best meeting slots

## Typical user flow

1. Fetch the team metadata.
2. Load standups for a date or the current week.
3. Submit a new standup if you are reporting status.
4. Update your weekly availability.
5. Request meeting overlap to choose a good team slot.

## Example: fetch the team

```sh
curl http://localhost:8787/api/team
```

## Example: create a standup

```sh
curl -X POST http://localhost:8787/api/standups \
  -H 'Content-Type: application/json' \
  --data '{
    "teamId": "team-demo",
    "userId": "user-maya",
    "standupDate": "2026-05-11",
    "today": "Working on the report.",
    "availability": "available",
    "blocker": null,
    "includeGithub": true,
    "notifyLead": false
  }'
```

## Example: update availability

```sh
curl -X PUT http://localhost:8787/api/availability/me \
  -H 'Content-Type: application/json' \
  --data '{
    "teamId": "team-demo",
    "userId": "user-maya",
    "weekStart": "2026-05-04",
    "slots": [
      {
        "dayIndex": 1,
        "slotIndex": 3,
        "slotLabel": "11 AM",
        "status": "available"
      }
    ]
  }'
```

## Response format

The API returns JSON for all endpoints.

### Error responses

Errors use this shape:

```json
{
  "error": "Message"
}
```

## Important notes

- The default team is `team-demo` when `teamId` is not supplied.
- API responses use camelCase field names.
- There is no authentication in the current backend; this service is intended for demo and local development.
- The app relies on seeded demo data in the `team-demo` workspace.
