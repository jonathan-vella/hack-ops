# HackOps — Azure SQL Database Data Model

> Canonical reference for every SQL table, its schema, indexes, foreign keys,
> JSON columns, and cross-table query patterns.
>
> **Database**: Azure SQL Database, Serverless General Purpose (GP_S_Gen5_2)
> **Region**: centralus
> **Auth**: Entra-only authentication via managed identity (no SQL passwords)
> **DDL source**: `apps/web/src/lib/schema.sql`
> **Migration ADR**: `agent-output/hackops/03-des-adr-0004-sql-database-over-cosmos.md`

---

## Overview

HackOps stores all application state in a single Azure SQL Database containing
**11 tables** with full referential integrity via foreign keys. Embedded arrays
(team members, rubric categories, category scores) are stored as JSON columns
(`NVARCHAR(MAX)`) and parsed at the application boundary.

### Design Principles

- **FK-enforced integrity** — all parent-child relationships use `REFERENCES`
- **JSON for embedded arrays** — `NVARCHAR(MAX)` with `JSON.parse()`/`JSON.stringify()` at the app layer
- **Optimistic concurrency** — `progressions.rowVersion ROWVERSION` replaces Cosmos `_etag`
- **OFFSET/FETCH pagination** — replaces Cosmos continuation tokens
- **Entra-only auth** — `DefaultAzureCredential` with `azure-active-directory-access-token` type

---

## Table Summary

| Table             | Primary Key | Key FKs                          | JSON Columns            | Purpose               |
| ----------------- | ----------- | -------------------------------- | ----------------------- | --------------------- |
| `hackathons`      | `id`        | —                                | —                       | Event lifecycle       |
| `teams`           | `id`        | `hackathonId → hackathons`       | `members`               | Team roster           |
| `hackers`         | `id`        | `hackathonId → hackathons`       | —                       | Hacker profiles       |
| `challenges`      | `id`        | `hackathonId → hackathons`       | —                       | Challenge definitions |
| `submissions`     | `id`        | `teamId → teams`, `challengeId`  | `attachments`, `scores` | Staging queue         |
| `scores`          | `id`        | `teamId → teams`, `submissionId` | `categoryScores`        | Approved scores       |
| `rubric_pointers` | `id`        | `hackathonId → hackathons`       | —                       | Active rubric pointer |
| `rubric_versions` | `id`        | `hackathonId → hackathons`       | `categories`            | Versioned rubrics     |
| `config`          | `id`        | —                                | —                       | App configuration     |
| `roles`           | `id`        | —                                | —                       | Role assignments      |
| `progressions`    | `id`        | `teamId → teams`                 | `unlockedChallenges`    | Unlock state          |
| `audit_log`       | `id`        | —                                | `details`               | Audit trail           |

---

## Table Definitions

### hackathons

Stores hackathon event records. Each hackathon has a unique auto-generated
4-digit event code used for hacker self-service onboarding.

**Key index**: Filtered index on `eventCode` excludes archived hackathons,
ensuring fast event-code lookups during hacker onboarding.

```sql
CREATE TABLE hackathons (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  name            NVARCHAR(200)   NOT NULL,
  description     NVARCHAR(MAX)   NOT NULL DEFAULT '',
  status          NVARCHAR(20)    NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'archived')),
  eventCode       NVARCHAR(4)     NOT NULL,
  teamSize        INT             NOT NULL DEFAULT 5,
  createdBy       NVARCHAR(128)   NOT NULL,
  createdAt       DATETIME2       NOT NULL,
  launchedAt      DATETIME2       NULL,
  archivedAt      DATETIME2       NULL,

  INDEX IX_hackathons_eventCode (eventCode) WHERE status != 'archived'
);
```

**TypeScript interface**:

```typescript
interface Hackathon {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "archived";
  eventCode: string;
  teamSize: number;
  createdBy: string;
  createdAt: string;
  launchedAt: string | null;
  archivedAt: string | null;
}
```

---

### teams

Stores team records created via Fisher-Yates shuffle assignment.
Members are stored as a JSON array column.

**FK**: `hackathonId → hackathons(id)`

```sql
CREATE TABLE teams (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  name            NVARCHAR(200)   NOT NULL,
  members         NVARCHAR(MAX)   NOT NULL DEFAULT '[]',

  INDEX IX_teams_hackathonId (hackathonId)
);
```

**JSON column — `members`**:

```json
[
  {
    "hackerId": "hkr-a1b2c3d4",
    "githubLogin": "alice-dev",
    "displayName": "Alice Andersson"
  },
  {
    "hackerId": "hkr-e5f6g7h8",
    "githubLogin": "bob-coder",
    "displayName": "Bob Bergström"
  }
]
```

---

### hackers

Individual hacker profiles. A hacker joins a hackathon by providing the 4-digit
event code. Security is enforced via rate limiting (5 attempts/min/IP).

**FKs**: `hackathonId → hackathons(id)`, `teamId → teams(id)`

```sql
CREATE TABLE hackers (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  githubUserId    NVARCHAR(128)   NOT NULL,
  githubLogin     NVARCHAR(100)   NOT NULL,
  displayName     NVARCHAR(200)   NOT NULL,
  email           NVARCHAR(200)   NOT NULL,
  avatarUrl       NVARCHAR(500)   NOT NULL,
  eventCode       NVARCHAR(4)     NOT NULL,
  teamId          NVARCHAR(128)   NULL REFERENCES teams(id),
  joinedAt        DATETIME2       NOT NULL,

  INDEX IX_hackers_hackathonId (hackathonId),
  INDEX IX_hackers_githubUserId (githubUserId)
);
```

---

### challenges

Ordered challenge definitions. Challenge order determines sequential gating —
teams must complete Challenge N before unlocking Challenge N+1.

**FK**: `hackathonId → hackathons(id)`

> **Note**: `order` is a SQL reserved word and must be quoted as `[order]` in queries.

```sql
CREATE TABLE challenges (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  [order]         INT             NOT NULL,
  title           NVARCHAR(200)   NOT NULL,
  description     NVARCHAR(MAX)   NOT NULL DEFAULT '',
  maxScore        INT             NOT NULL,
  createdBy       NVARCHAR(128)   NOT NULL,
  createdAt       DATETIME2       NOT NULL,

  INDEX IX_challenges_hackathonId_order (hackathonId, [order])
);
```

---

### submissions

Evidence submissions in a staging queue. Submissions enter as `pending` and
move to `approved` or `rejected` after Coach/Admin review. On approval,
scores are copied to the `scores` table.

**FKs**: `teamId → teams(id)`, `hackathonId → hackathons(id)`, `challengeId → challenges(id)`

```sql
CREATE TABLE submissions (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  teamId          NVARCHAR(128)   NOT NULL REFERENCES teams(id),
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  challengeId     NVARCHAR(128)   NOT NULL REFERENCES challenges(id),
  state           NVARCHAR(20)    NOT NULL DEFAULT 'pending'
                    CHECK (state IN ('pending', 'approved', 'rejected')),
  description     NVARCHAR(MAX)   NOT NULL DEFAULT '',
  attachments     NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
  submittedBy     NVARCHAR(128)   NOT NULL,
  submittedAt     DATETIME2       NOT NULL,
  scores          NVARCHAR(MAX)   NULL,
  reviewedBy      NVARCHAR(128)   NULL,
  reviewedAt      DATETIME2       NULL,
  reviewReason    NVARCHAR(MAX)   NULL,

  INDEX IX_submissions_hackathonId_state (hackathonId, state, submittedAt DESC),
  INDEX IX_submissions_teamId (teamId)
);
```

**JSON columns**:

- `attachments`: `["evidence/team-alpha/ch-001/screenshot.png"]`
- `scores`: `[{"categoryId": "code-quality", "score": 8}]` (null until reviewed)

---

### scores

Immutable approved score records. Created when a Coach approves a submission.
Score overrides by Admin update the row with audit fields.

**FKs**: `teamId → teams(id)`, `hackathonId → hackathons(id)`,
`challengeId → challenges(id)`, `submissionId → submissions(id)`

```sql
CREATE TABLE scores (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  teamId          NVARCHAR(128)   NOT NULL REFERENCES teams(id),
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  challengeId     NVARCHAR(128)   NOT NULL REFERENCES challenges(id),
  submissionId    NVARCHAR(128)   NOT NULL REFERENCES submissions(id),
  categoryScores  NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
  total           INT             NOT NULL,
  approvedBy      NVARCHAR(128)   NOT NULL,
  approvedAt      DATETIME2       NOT NULL,
  overriddenBy    NVARCHAR(128)   NULL,
  overriddenAt    DATETIME2       NULL,
  overrideReason  NVARCHAR(MAX)   NULL,

  INDEX IX_scores_hackathonId_total (hackathonId, total DESC),
  INDEX IX_scores_teamId (teamId)
);
```

**JSON column — `categoryScores`**:

```json
[
  { "categoryId": "code-quality", "score": 8 },
  { "categoryId": "creativity", "score": 9 }
]
```

---

### rubric_pointers

Pointer to the active rubric version for each hackathon. Readers always
fetch the pointer first, then read the referenced version.

**FK**: `hackathonId → hackathons(id)`
**Unique constraint**: One pointer per hackathon.

```sql
CREATE TABLE rubric_pointers (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  activeRubricId  NVARCHAR(128)   NOT NULL,
  updatedAt       DATETIME2       NOT NULL,
  updatedBy       NVARCHAR(128)   NOT NULL,

  CONSTRAINT UQ_rubric_pointers_hackathonId UNIQUE (hackathonId)
);
```

---

### rubric_versions

Immutable versioned rubric documents. Categories are stored as a JSON array.

**FK**: `hackathonId → hackathons(id)`

```sql
CREATE TABLE rubric_versions (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  version         INT             NOT NULL,
  categories      NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
  createdBy       NVARCHAR(128)   NOT NULL,
  createdAt       DATETIME2       NOT NULL,

  INDEX IX_rubric_versions_hackathonId (hackathonId, version DESC)
);
```

**JSON column — `categories`**:

```json
[
  {
    "id": "code-quality",
    "name": "Code Quality",
    "description": "Clean code",
    "maxScore": 10
  },
  {
    "id": "creativity",
    "name": "Creativity",
    "description": "Novel approach",
    "maxScore": 10
  }
]
```

---

### config

Application-wide key-value configuration settings.

> **Note**: `key` is a SQL reserved word and must be quoted as `[key]` in queries.

```sql
CREATE TABLE config (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  [key]           NVARCHAR(200)   NOT NULL,
  value           NVARCHAR(MAX)   NOT NULL,
  updatedBy       NVARCHAR(128)   NOT NULL,
  updatedAt       DATETIME2       NOT NULL,

  CONSTRAINT UQ_config_key UNIQUE ([key])
);
```

---

### roles

Per-hackathon role assignments mapping GitHub users to Admin, Coach, or
Hacker roles. The primary admin is flagged via `isPrimaryAdmin BIT`.

```sql
CREATE TABLE roles (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL,
  githubUserId    NVARCHAR(128)   NOT NULL,
  githubLogin     NVARCHAR(100)   NOT NULL,
  role            NVARCHAR(20)    NOT NULL
                    CHECK (role IN ('admin', 'coach', 'hacker')),
  isPrimaryAdmin  BIT             NOT NULL DEFAULT 0,
  assignedBy      NVARCHAR(128)   NOT NULL,
  assignedAt      DATETIME2       NOT NULL,

  INDEX IX_roles_hackathonId (hackathonId, assignedAt DESC),
  INDEX IX_roles_githubUserId (githubUserId)
);
```

**Type mapping**: `isPrimaryAdmin` is `BIT` (0/1) in SQL. The app layer converts
to `boolean` via `Boolean(row.isPrimaryAdmin)` on read and `role.isPrimaryAdmin ? 1 : 0` on write.

---

### progressions

Per-team challenge unlock state. Challenge 1 auto-unlocks when hackathon
launches. Subsequent challenges unlock on submission approval.

**FKs**: `teamId → teams(id)`, `hackathonId → hackathons(id)`

```sql
CREATE TABLE progressions (
  id                  NVARCHAR(128)   NOT NULL PRIMARY KEY,
  teamId              NVARCHAR(128)   NOT NULL REFERENCES teams(id),
  hackathonId         NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  currentChallenge    INT             NOT NULL DEFAULT 1,
  unlockedChallenges  NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
  rowVersion          ROWVERSION      NOT NULL,

  INDEX IX_progressions_teamId_hackathonId (teamId, hackathonId)
);
```

**Optimistic concurrency**: `ROWVERSION` auto-increments on every update.
The app layer checks `WHERE rowVersion = @expectedVersion` on progression
updates to prevent concurrent unlock race conditions.

**JSON column — `unlockedChallenges`**:

```json
[
  { "challengeId": "ch-001-setup", "unlockedAt": "2026-02-20T08:00:00Z" },
  { "challengeId": "ch-002-ingestion", "unlockedAt": "2026-02-21T14:30:00Z" }
]
```

---

### audit_log

Immutable audit trail for all significant actions.

```sql
CREATE TABLE audit_log (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL,
  action          NVARCHAR(100)   NOT NULL,
  targetType      NVARCHAR(100)   NOT NULL,
  targetId        NVARCHAR(128)   NOT NULL,
  performedBy     NVARCHAR(128)   NOT NULL,
  performedAt     DATETIME2       NOT NULL,
  reason          NVARCHAR(MAX)   NULL,
  details         NVARCHAR(MAX)   NULL,

  INDEX IX_audit_log_hackathonId (hackathonId, performedAt DESC),
  INDEX IX_audit_log_action (action)
);
```

**JSON column — `details`**: Freeform JSON object for action-specific metadata.

---

## Cross-Table Query Patterns

### Leaderboard Assembly

**Tables**: `scores` + `teams` + `challenges`

```sql
SELECT s.teamId, t.name AS teamName, SUM(s.total) AS totalScore,
       MAX(s.approvedAt) AS lastApprovalAt
FROM scores s
JOIN teams t ON t.id = s.teamId
WHERE s.hackathonId = @hackathonId
GROUP BY s.teamId, t.name
ORDER BY totalScore DESC, lastApprovalAt ASC
```

Tiebreaker: earliest `lastApprovalAt` wins when totals are equal.

---

### Submission Review Queue

**Tables**: `submissions` + `rubric_pointers` + `rubric_versions`

```sql
-- 1. Get active rubric
SELECT rv.* FROM rubric_pointers rp
JOIN rubric_versions rv ON rv.id = rp.activeRubricId
WHERE rp.hackathonId = @hackathonId;

-- 2. Get pending submissions
SELECT * FROM submissions
WHERE hackathonId = @hackathonId AND state = 'pending'
ORDER BY submittedAt DESC
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
```

---

### Challenge Progression Check

**Tables**: `progressions` + `challenges`

```sql
-- 1. Get team progression
SELECT * FROM progressions WHERE teamId = @teamId AND hackathonId = @hackathonId;

-- 2. Get ordered challenges
SELECT * FROM challenges WHERE hackathonId = @hackathonId ORDER BY [order] ASC;

-- 3. On approval: advance progression (with optimistic concurrency)
UPDATE progressions SET currentChallenge = @next, unlockedChallenges = @json
WHERE id = @id AND rowVersion = @expectedVersion;
```

---

### Rubric Atomic Swap

**Tables**: `rubric_versions` + `rubric_pointers`

```sql
BEGIN TRANSACTION;
  INSERT INTO rubric_versions (id, hackathonId, version, categories, createdBy, createdAt)
  VALUES (@id, @hackathonId, @version, @categories, @createdBy, @createdAt);

  UPDATE rubric_pointers SET activeRubricId = @id, updatedAt = @now, updatedBy = @user
  WHERE hackathonId = @hackathonId;
COMMIT;
```

Full transactional consistency — unlike Cosmos DB where pointer update was the
atomic boundary.

---

## Key Invariants

| Invariant                    | Enforcement               | Detail                                                     |
| ---------------------------- | ------------------------- | ---------------------------------------------------------- |
| **Staging pattern**          | `submissions.state`       | CHECK constraint: `'pending' \| 'approved' \| 'rejected'`  |
| **One active rubric**        | `rubric_pointers`         | UNIQUE constraint on `hackathonId`; transaction for swap   |
| **Rubric-driven scoring**    | `rubric_versions`         | All scoring UI derived from `categories` JSON              |
| **Team-scoped submissions**  | FK + app layer            | `teamId` FK + API route guard prevents cross-team access   |
| **Plaintext event codes**    | `hackers.eventCode`       | Security via rate limiting (5/min/IP), not hashing         |
| **Sequential gating**        | `challenges.[order]`      | `currentChallenge` in progressions gates access            |
| **Optimistic concurrency**   | `progressions.rowVersion` | `ROWVERSION` column checked on update                      |
| **Audit trail**              | `audit_log`               | All significant actions logged with actor + timestamp      |
| **Primary admin protection** | `roles.isPrimaryAdmin`    | BIT flag prevents demotion; checked in role management API |
| **Tiebreaker rule**          | `scores.approvedAt`       | Earliest last-approval timestamp wins on equal scores      |
| **Team balance**             | `hackathons.teamSize`     | `ceil(teamSize / 2)` minimum enforced at assignment time   |
| **Referential integrity**    | Foreign keys              | All parent-child relationships enforced at database level  |
