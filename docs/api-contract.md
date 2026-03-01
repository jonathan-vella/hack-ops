# HackOps — API Contract Reference

> Human-readable reference for all HackOps API endpoints.
> The TypeScript source of truth is
> `packages/shared/types/api-contract.ts` — this document
> mirrors those types for quick reference.

---

## TypeScript-First Contract

HackOps uses a **TypeScript-first API contract**. All
request/response shapes are defined as TypeScript interfaces in
`packages/shared/types/api-contract.ts`. Route handlers and
frontend components import types from the same file — the
compiler catches contract drift at build time.

**Import pattern:**

```typescript
import {
  type ApiResponse,
  SubmissionsAPI,
} from "@hackops/shared/types/api-contract";
```

---

## Authentication

All endpoints except `GET /api/health` require GitHub OAuth
authentication via Azure App Service Easy Auth.

### Easy Auth Header Parsing

App Service injects the `X-MS-CLIENT-PRINCIPAL` header on
authenticated requests. The header value is a base64-encoded
JSON object:

```typescript
interface EasyAuthPrincipal {
  userId: string;
  githubLogin: string;
  email: string;
  avatarUrl: string;
}
```

**Role resolution:** After decoding the principal, the
middleware looks up the user in the `roles` container by
`githubUserId` + `hackathonId` to determine their role
(`admin`, `coach`, or `hacker`). Users with no role record
are treated as unauthenticated for role-gated endpoints.

**Local development:** Easy Auth is unavailable locally.
A dev-only auth bypass reads `DEV_USER_ROLE` and
`DEV_USER_ID` from environment variables when
`NODE_ENV=development`.

---

## Response Wrapper

All endpoints return a consistent `ApiResponse<T>` wrapper:

```typescript
// Success
{ "data": T, "ok": true }

// Error
{ "error": "description", "ok": false }
```

---

## Pagination

List endpoints support cursor-based pagination via Cosmos DB
continuation tokens:

```typescript
// Request query parameters
{ "continuationToken"?: string, "pageSize"?: number }

// Response
{ "items": T[], "continuationToken"?: string | null }
```

---

## Endpoint Reference

### Health

#### GET /api/health

| Field | Value                  |
| ----- | ---------------------- |
| Auth  | None (unauthenticated) |
| Role  | —                      |

**Response 200:** `ApiResponse<HealthAPI.HealthCheckResponse>`

```json
{ "data": { "status": "ok", "timestamp": "2026-02-25T10:00:00Z" }, "ok": true }
```

---

### Hackathons

#### POST /api/hackathons

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `HackathonsAPI.CreateRequest`

```json
{ "name": "MicroHack 2026", "description": "Spring event", "teamSize": 5 }
```

**Response 201:** `ApiResponse<HackathonsAPI.HackathonRecord>`

**Error responses:**

- `401` — Missing or invalid authentication
- `403` — Caller is not an Admin

---

#### GET /api/hackathons

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin, Coach                          |

**Query parameters:** `HackathonsAPI.ListRequest`
(`status?`, `continuationToken?`, `pageSize?`)

**Response 200:** `ApiResponse<PageResponse<HackathonsAPI.HackathonSummary>>`

---

#### PATCH /api/hackathons/:id

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `HackathonsAPI.UpdateRequest`

**Response 200:** `ApiResponse<HackathonsAPI.HackathonRecord>`

**Error responses:**

- `403` — Caller is not an Admin
- `404` — Hackathon not found
- `409` — Invalid state transition (e.g. `archived` → `draft`)

---

#### POST /api/hackathons/:id/assign-teams

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `HackathonsAPI.AssignTeamsRequest`
(`teamSize?` — overrides hackathon default)

**Response 200:** `ApiResponse<HackathonsAPI.AssignTeamsResponse>`

Uses Fisher-Yates shuffle for unbiased random assignment.
Teams are balanced so no team has fewer than
`ceil(teamSize / 2)` members.

**Error responses:**

- `403` — Caller is not an Admin
- `404` — Hackathon not found
- `409` — Hackathon is not in `active` state

---

### Join (Hacker Onboarding)

#### POST /api/join

| Field      | Value                                   |
| ---------- | --------------------------------------- |
| Auth       | Required (GitHub OAuth via Easy Auth)   |
| Role       | Any authenticated user (no role needed) |
| Rate limit | 5 req/min per IP                        |

**Request body:** `JoinAPI.JoinRequest`

```json
{ "eventCode": "4829" }
```

**Response 201:** `ApiResponse<JoinAPI.JoinResponse>`

**Error responses:**

- `401` — Invalid event code (does not reveal whether the
  hackathon exists)
- `409` — User already joined this hackathon
- `429` — Rate limit exceeded (5 attempts/min/IP)

> Event codes are convenience shortcodes stored as plaintext.
> Security relies on GitHub OAuth + rate limiting, not code
> obscurity.

---

### Teams

#### GET /api/teams

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin, Coach                          |

**Query parameters:** `TeamsAPI.ListRequest`
(`hackathonId` required, `continuationToken?`, `pageSize?`)

**Response 200:** `ApiResponse<PageResponse<TeamsAPI.TeamRecord>>`

---

#### PATCH /api/teams/:id/reassign

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `TeamsAPI.ReassignRequest`

```json
{ "hackerId": "hk-abc123", "targetTeamId": "tm-xyz789" }
```

**Response 200:** `ApiResponse<TeamsAPI.TeamRecord>`

**Error responses:**

- `403` — Caller is not an Admin
- `404` — Team or hacker not found
- `409` — Hacker already on target team

---

### Rubrics

#### POST /api/rubrics

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `RubricsAPI.CreateRequest`

```json
{
  "categories": [
    {
      "id": "quality",
      "name": "Code Quality",
      "description": "Clean, readable code",
      "maxScore": 10
    },
    {
      "id": "creativity",
      "name": "Creativity",
      "description": "Novel approach",
      "maxScore": 20
    }
  ]
}
```

**Response 201:** `ApiResponse<RubricsAPI.RubricRecord>`

New rubrics are created as inactive. Uses the pointer +
versioned docs pattern — activate via PATCH.

---

#### GET /api/rubrics

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin, Coach, Hacker                  |

**Query parameters:** `RubricsAPI.ListRequest`
(`activeOnly?`, `continuationToken?`, `pageSize?`)

**Response 200:** `ApiResponse<PageResponse<RubricsAPI.RubricSummary>>`

---

#### GET /api/rubrics/:id

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin, Coach, Hacker                  |

**Response 200:** `ApiResponse<RubricsAPI.RubricRecord>`

---

#### PATCH /api/rubrics/:id

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `RubricsAPI.UpdateRequest`

Setting `isActive: true` performs an atomic pointer swap —
the previously active rubric is deactivated.

**Response 200:** `ApiResponse<RubricsAPI.RubricRecord>`

**Error responses:**

- `403` — Caller is not an Admin
- `404` — Rubric not found

---

### Submissions

#### POST /api/submissions

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| Auth       | Required (GitHub OAuth via Easy Auth) |
| Role       | Hacker                                |
| Rate limit | 10 req/min per team                   |

**Request body:** `SubmissionsAPI.CreateRequest`

Hackers submit evidence (description + optional attachments).
Scores are NOT included — Coaches enter scores during review.

```json
{
  "challengeId": "ch-001",
  "description": "We implemented the API using...",
  "attachments": ["https://github.com/team/repo/pull/42"]
}
```

**Response 201:** `ApiResponse<SubmissionsAPI.SubmissionRecord>`

Submission is created in `pending` state with `scores: null`.

**Error responses:**

- `400` — Missing required fields or invalid challenge reference
- `403` — Cross-team submission attempt or challenge is locked
- `409` — Duplicate submission for same challenge

---

#### GET /api/submissions

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin, Coach (all); Hacker (own team) |

**Query parameters:** `SubmissionsAPI.ListRequest`
(`hackathonId` required, `status?`, `teamId?`,
`continuationToken?`, `pageSize?`)

The review queue is **hackathon-scoped** — Coaches see only
submissions for hackathons they are assigned to. Hackers see
only their own team's submissions.

**Response 200:**
`ApiResponse<PageResponse<SubmissionsAPI.SubmissionRecord>>`

---

#### PATCH /api/submissions/:id

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin, Coach                          |

**Request body:** `SubmissionsAPI.ReviewRequest`

On **approval**, the Coach must provide rubric `scores` per
category. The scores are validated against the active rubric
(each category score ≤ `maxScore`). Validated scores are
copied to the `scores` container as immutable records.

On **rejection**, `scores` is omitted. A `reason` is always
required.

```json
{
  "status": "approved",
  "reason": "Excellent implementation",
  "scores": [
    { "categoryId": "quality", "score": 9 },
    { "categoryId": "creativity", "score": 18 }
  ]
}
```

**Response 200:** `ApiResponse<SubmissionsAPI.SubmissionRecord>`

**Error responses:**

- `400` — Missing scores on approval, or score exceeds rubric
  max for a category
- `403` — Caller lacks Coach/Admin role for this hackathon
- `404` — Submission not found
- `409` — Submission already reviewed (not in `pending` state)

---

### Scores

#### PATCH /api/scores/:id/override

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `ScoresAPI.OverrideRequest`

Overrides an approved score. Mandatory `reason` is audit
logged.

```json
{
  "categoryScores": [
    { "categoryId": "quality", "score": 7 },
    { "categoryId": "creativity", "score": 15 }
  ],
  "reason": "Recalculated after rubric clarification"
}
```

**Response 200:** `ApiResponse<ScoresAPI.ScoreRecord>`

**Error responses:**

- `400` — Score exceeds rubric max for a category
- `403` — Caller is not an Admin
- `404` — Score record not found

---

### Leaderboard

#### GET /api/leaderboard/:hackathonId

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin, Coach, Hacker                  |

**Response 200:** `ApiResponse<LeaderboardAPI.LeaderboardResponse>`

Returns teams ranked by total approved scores (highest first).

**Tiebreaker:** When two teams have the same total score, the
team whose last approval timestamp is earlier ranks higher
(earliest completion wins).

Includes grade badges (A/B/C/D based on rubric thresholds),
award badges ("Fastest Completion", "Highest Score per
Challenge", "Perfect Score"), and per-challenge score
breakdown in expandable rows.

The page is server-side rendered for fast first paint.
Client-side auto-refresh polls every 30 seconds.

---

### Challenges

#### POST /api/challenges

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `ChallengesAPI.CreateRequest`

```json
{
  "hackathonId": "hk-2026-spring",
  "order": 1,
  "title": "Build the API",
  "description": "Implement the REST endpoints...",
  "maxScore": 30
}
```

**Response 201:** `ApiResponse<ChallengesAPI.ChallengeRecord>`

---

#### GET /api/challenges

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin, Coach, Hacker                  |

**Query parameters:** `ChallengesAPI.ListRequest`
(`hackathonId` required, `continuationToken?`, `pageSize?`)

**Response 200:**
`ApiResponse<PageResponse<ChallengesAPI.ChallengeRecord>>`

---

### Progression

#### GET /api/progression

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin, Coach, Hacker                  |

**Query parameters:** `ProgressionAPI.GetRequest`
(`hackathonId` required, `teamId` required)

**Response 200:**
`ApiResponse<ProgressionAPI.ProgressionRecord>`

Challenge 1 is auto-unlocked on hackathon start. Challenge
N+1 unlocks when Challenge N's submission is approved.

---

### Roles

#### POST /api/roles/invite

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `RolesAPI.InviteRequest`

```json
{
  "hackathonId": "hk-2026-spring",
  "githubLogin": "coach-jane",
  "role": "coach"
}
```

**Response 201:** `ApiResponse<RolesAPI.RoleRecord>`

**Error responses:**

- `403` — Caller is not an Admin
- `409` — User already has a role in this hackathon

---

#### DELETE /api/roles/:id

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Response 204:** No content

**Error responses:**

- `403` — Caller is not an Admin, or target is the primary
  admin (cannot be demoted)
- `404` — Role record not found

---

#### GET /api/roles

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Query parameters:** `RolesAPI.ListRequest`
(`hackathonId` required, `continuationToken?`, `pageSize?`)

**Response 200:** `ApiResponse<PageResponse<RolesAPI.RoleRecord>>`

---

### Audit

#### GET /api/audit/:hackathonId

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Query parameters:** `AuditAPI.ListRequest`
(`hackathonId` in path, `action?`, `continuationToken?`,
`pageSize?`)

**Response 200:**
`ApiResponse<PageResponse<AuditAPI.AuditEntry>>`

Paginated, filterable log of all reviewer actions.

---

### Config

#### GET /api/config

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Response 200:** `ApiResponse<ConfigAPI.ConfigRecord[]>`

Returns all app-wide configuration values (leaderboard
refresh interval, max team size, etc.).

---

#### PATCH /api/config/:key

| Field | Value                                 |
| ----- | ------------------------------------- |
| Auth  | Required (GitHub OAuth via Easy Auth) |
| Role  | Admin                                 |

**Request body:** `ConfigAPI.UpdateRequest`

```json
{ "value": 30 }
```

**Response 200:** `ApiResponse<ConfigAPI.ConfigRecord>`

**Error responses:**

- `403` — Caller is not an Admin
- `404` — Config key not found

---

## Error Code Catalogue

| Code  | Meaning               | Common Causes                                              |
| ----- | --------------------- | ---------------------------------------------------------- |
| `400` | Bad Request           | Zod validation failure, missing required field,            |
|       |                       | score exceeds rubric max                                   |
| `401` | Unauthorized          | Missing/invalid Easy Auth header, invalid event code       |
| `403` | Forbidden             | Insufficient role, cross-team access, primary admin        |
|       |                       | demotion attempt, locked challenge submission              |
| `404` | Not Found             | Resource ID does not exist                                 |
| `409` | Conflict              | Duplicate submission, invalid state transition,            |
|       |                       | already reviewed, user already has role                    |
| `429` | Too Many Requests     | Rate limit exceeded (5/min/IP on join, 100/min/IP general) |
| `500` | Internal Server Error | Unexpected server error, Cosmos DB connectivity failure    |

---

## Endpoint Summary

| #   | Method   | Path                               | Role(s)      | Phase |
| --- | -------- | ---------------------------------- | ------------ | ----- |
| 1   | `GET`    | `/api/health`                      | —            | —     |
| 2   | `POST`   | `/api/hackathons`                  | Admin        | 6     |
| 3   | `GET`    | `/api/hackathons`                  | Admin, Coach | 6     |
| 4   | `PATCH`  | `/api/hackathons/:id`              | Admin        | 6     |
| 5   | `POST`   | `/api/hackathons/:id/assign-teams` | Admin        | 6     |
| 6   | `POST`   | `/api/join`                        | Any authed   | 6     |
| 7   | `GET`    | `/api/teams`                       | Admin, Coach | 6     |
| 8   | `PATCH`  | `/api/teams/:id/reassign`          | Admin        | 6     |
| 9   | `POST`   | `/api/rubrics`                     | Admin        | 7     |
| 10  | `GET`    | `/api/rubrics`                     | All roles    | 7     |
| 11  | `GET`    | `/api/rubrics/:id`                 | All roles    | 7     |
| 12  | `PATCH`  | `/api/rubrics/:id`                 | Admin        | 7     |
| 13  | `POST`   | `/api/submissions`                 | Hacker       | 7     |
| 14  | `GET`    | `/api/submissions`                 | All roles    | 7     |
| 15  | `PATCH`  | `/api/submissions/:id`             | Admin, Coach | 7     |
| 16  | `PATCH`  | `/api/scores/:id/override`         | Admin        | 7     |
| 17  | `GET`    | `/api/leaderboard/:hackathonId`    | All roles    | 8     |
| 18  | `POST`   | `/api/challenges`                  | Admin        | 9     |
| 19  | `GET`    | `/api/challenges`                  | All roles    | 9     |
| 20  | `GET`    | `/api/progression`                 | All roles    | 9     |
| 21  | `POST`   | `/api/roles/invite`                | Admin        | 10    |
| 22  | `GET`    | `/api/roles`                       | Admin        | 10    |
| 23  | `DELETE` | `/api/roles/:id`                   | Admin        | 10    |
| 24  | `GET`    | `/api/audit/:hackathonId`          | Admin        | 10    |
| 25  | `GET`    | `/api/config`                      | Admin        | 10    |
| 26  | `PATCH`  | `/api/config/:key`                 | Admin        | 10    |
