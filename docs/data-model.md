# HackOps — Cosmos DB Data Model

> Canonical reference for every Cosmos DB container, its schema, partition
> key rationale, and query patterns. Generated from
> `.github/prompts/plan-hackOps.prompt.md`.

---

## Overview

HackOps uses **Azure Cosmos DB NoSQL** (Serverless capacity mode) with
**10 containers** in a single database (`hackops`). All documents include
an `id` field, a `_type` discriminant, and the container's partition key.

Data-plane access uses **managed identity** (Cosmos DB SQL role assignment
with Built-in Data Contributor). Private Endpoint ensures the database is
never exposed to the public internet.

---

## Container Summary Table

| Container      | Partition Key    | Doc Type         | Purpose                            |
| -------------- | ---------------- | ---------------- | ---------------------------------- |
| `hackathons`   | `/id`            | `hackathon`      | Event lifecycle                    |
| `teams`        | `/hackathonId`   | `team`           | Team roster                        |
| `hackers`      | `/hackathonId`   | `hacker`         | Hacker profiles                    |
| `scores`       | `/teamId`        | `score`          | Approved (immutable) scores        |
| `submissions`  | `/teamId`        | `submission`     | Staging queue (pending/approved)   |
| `rubrics`      | `/id`            | `rubric`/pointer | Scoring rubrics (versioned)        |
| `config`       | `/id`            | `config`         | App-wide settings                  |
| `roles`        | `/hackathonId`   | `role`           | Role assignments per event         |
| `challenges`   | `/hackathonId`   | `challenge`      | Challenge definitions              |
| `progression`  | `/teamId`        | `progression`    | Sequential unlock state            |

---

## Container Definitions

### hackathons

Stores hackathon lifecycle data. Each document represents one MicroHack
event with its auto-generated 4-digit event code and lifecycle state.

```typescript
interface HackathonDocument {
  id: string;
  _type: "hackathon";
  name: string;
  description: string;
  status: "draft" | "active" | "archived";
  /** 4-digit numeric code (1000–9999), unique across active hackathons. */
  eventCode: string;
  teamSize: number;
  createdBy: string;
  createdAt: string;
  launchedAt: string | null;
  archivedAt: string | null;
}
```

**Partition key**: `/id` — each hackathon is its own logical partition.
At the expected scale (2–3 parallel events), a single-document partition
is fine. Point reads by `id` are O(1).

```json
{
  "id": "hack-2026-stockholm",
  "_type": "hackathon",
  "name": "MicroHack Stockholm 2026",
  "description": "Azure infrastructure challenge for Nordic teams.",
  "status": "active",
  "eventCode": "4821",
  "teamSize": 5,
  "createdBy": "github|12345678",
  "createdAt": "2026-02-20T09:00:00Z",
  "launchedAt": "2026-02-25T08:00:00Z",
  "archivedAt": null
}
```

---

### teams

Stores team rosters created by the Fisher-Yates shuffle assignment.

```typescript
interface TeamMember {
  hackerId: string;
  githubLogin: string;
  displayName: string;
}

interface TeamDocument {
  id: string;
  _type: "team";
  hackathonId: string;
  name: string;
  members: TeamMember[];
  createdAt: string;
}
```

**Partition key**: `/hackathonId` — all teams for a hackathon share one
logical partition, enabling efficient fan-out queries for "list all teams
in this event." At 4–5 teams per event the partition stays small.

```json
{
  "id": "team-alpha-4821",
  "_type": "team",
  "hackathonId": "hack-2026-stockholm",
  "name": "Team Alpha",
  "members": [
    {
      "hackerId": "hkr-a1b2c3",
      "githubLogin": "octocat",
      "displayName": "Octocat"
    },
    {
      "hackerId": "hkr-d4e5f6",
      "githubLogin": "mona",
      "displayName": "Mona Lisa"
    }
  ],
  "createdAt": "2026-02-25T08:30:00Z"
}
```

---

### hackers

Stores individual hacker profiles, linked to a hackathon via the event
code they used to join.

```typescript
interface HackerDocument {
  id: string;
  _type: "hacker";
  hackathonId: string;
  githubUserId: string;
  githubLogin: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  /** Plaintext event code used at join time. Security via rate limiting, not hashing. */
  eventCode: string;
  teamId: string | null;
  joinedAt: string;
}
```

**Partition key**: `/hackathonId` — queries for "all hackers in this
event" (used during team assignment and admin views) are single-partition.
Each event has ~25 hackers so the partition is compact.

```json
{
  "id": "hkr-a1b2c3",
  "_type": "hacker",
  "hackathonId": "hack-2026-stockholm",
  "githubUserId": "github|12345678",
  "githubLogin": "octocat",
  "displayName": "Octocat",
  "email": "octocat@github.com",
  "avatarUrl": "https://avatars.githubusercontent.com/u/583231",
  "eventCode": "4821",
  "teamId": "team-alpha-4821",
  "joinedAt": "2026-02-25T08:15:00Z"
}
```

---

### scores

Stores **approved, immutable** score records. A score is created when a
submission is approved; it is never modified except via an admin override
(which creates an audit entry).

```typescript
interface CategoryScore {
  categoryId: string;
  score: number;
}

interface ScoreDocument {
  id: string;
  _type: "score";
  teamId: string;
  hackathonId: string;
  challengeId: string;
  submissionId: string;
  categoryScores: CategoryScore[];
  total: number;
  approvedBy: string;
  approvedAt: string;
  /** Populated only if an admin override occurred. */
  overriddenBy: string | null;
  overriddenAt: string | null;
  overrideReason: string | null;
}
```

**Partition key**: `/teamId` — leaderboard queries aggregate scores per
team, making team-scoped reads efficient. Each team has one score per
challenge, so partition size stays bounded.

```json
{
  "id": "score-alpha-ch1",
  "_type": "score",
  "teamId": "team-alpha-4821",
  "hackathonId": "hack-2026-stockholm",
  "challengeId": "ch-networking-101",
  "submissionId": "sub-a1-ch1-001",
  "categoryScores": [
    { "categoryId": "code-quality", "score": 8 },
    { "categoryId": "creativity", "score": 7 },
    { "categoryId": "documentation", "score": 9 }
  ],
  "total": 24,
  "approvedBy": "github|99887766",
  "approvedAt": "2026-02-25T14:30:00Z",
  "overriddenBy": null,
  "overriddenAt": null,
  "overrideReason": null
}
```

---

### submissions

Staging queue for hacker evidence submissions. Submissions start as
`pending` and move to `approved` or `rejected` after coach/admin review.
On approval, validated scores are copied to the `scores` container.

```typescript
interface SubmissionDocument {
  id: string;
  _type: "submission";
  teamId: string;
  hackathonId: string;
  challengeId: string;
  state: "pending" | "approved" | "rejected";
  description: string;
  attachments: string[];
  submittedBy: string;
  submittedAt: string;
  /** Coach-entered rubric scores — populated during review. */
  scores: CategoryScore[] | null;
  /** Null until reviewed. */
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
}
```

**Partition key**: `/teamId` — review queries filter by team. Hackers
can only submit for their own team (403 otherwise), so team-scoped
partitioning aligns with the access pattern. The staging queue query
(`state = 'pending'`) operates within the hackathon scope via a
cross-partition query filtered on `hackathonId`.

```json
{
  "id": "sub-a1-ch1-001",
  "_type": "submission",
  "teamId": "team-alpha-4821",
  "hackathonId": "hack-2026-stockholm",
  "challengeId": "ch-networking-101",
  "state": "pending",
  "description": "Completed the VNet peering challenge. See screenshot of successful ping test.",
  "attachments": ["evidence/team-alpha/ch1-ping-test.png"],
  "submittedBy": "github|12345678",
  "submittedAt": "2026-02-25T13:45:00Z",
  "scores": null,
  "reviewedBy": null,
  "reviewedAt": null,
  "reviewReason": null
}
```

**Note**: The `state` field implements the staging pattern invariant.
Submissions are never directly written to `scores` — they must pass
through the review workflow.

---

### rubrics

Uses a **pointer + versioned documents** pattern for atomic rubric
activation. Two document types live in this container:

1. **Pointer document** (`id: "active-rubric"`) — contains
   `activeRubricId` pointing to the current version.
2. **Versioned rubric documents** — immutable snapshots
   (`rubric-v1`, `rubric-v2`, etc.) with full category definitions.

Atomic swap: update the pointer document only. Consumers read the
pointer first, then fetch the referenced version — no partial reads
during updates.

```typescript
interface RubricPointerDocument {
  id: "active-rubric";
  _type: "rubric-pointer";
  activeRubricId: string;
  updatedBy: string;
  updatedAt: string;
}

interface RubricCategory {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

interface RubricVersionDocument {
  id: string;
  _type: "rubric";
  version: number;
  categories: RubricCategory[];
  createdBy: string;
  createdAt: string;
}
```

**Partition key**: `/id` — each rubric version and the pointer are
separate logical partitions. Point reads by `id` are optimal. The total
number of rubric versions is small (typically < 10 per hackathon).

**Pointer document sample:**

```json
{
  "id": "active-rubric",
  "_type": "rubric-pointer",
  "activeRubricId": "rubric-v2",
  "updatedBy": "github|99887766",
  "updatedAt": "2026-02-24T16:00:00Z"
}
```

**Versioned rubric sample:**

```json
{
  "id": "rubric-v2",
  "_type": "rubric",
  "version": 2,
  "categories": [
    {
      "id": "code-quality",
      "name": "Code Quality",
      "description": "Clean, readable, well-structured code with proper error handling.",
      "maxScore": 10
    },
    {
      "id": "creativity",
      "name": "Creativity",
      "description": "Novel approach to solving the challenge beyond the baseline requirements.",
      "maxScore": 10
    },
    {
      "id": "documentation",
      "name": "Documentation",
      "description": "Clear README, architecture notes, and inline comments where needed.",
      "maxScore": 10
    }
  ],
  "createdBy": "github|99887766",
  "createdAt": "2026-02-24T16:00:00Z"
}
```

---

### config

Stores app-wide configuration key-value pairs (leaderboard refresh
interval, max team size, etc.). Also stores the primary admin identity.

```typescript
interface ConfigDocument {
  id: string;
  _type: "config";
  key: string;
  value: string | number | boolean;
  updatedBy: string;
  updatedAt: string;
}
```

**Partition key**: `/id` — configuration entries are few (< 20) and
individually accessed by key. Point reads are ideal.

```json
{
  "id": "config-leaderboard-refresh",
  "_type": "config",
  "key": "leaderboardRefreshInterval",
  "value": 30,
  "updatedBy": "github|99887766",
  "updatedAt": "2026-02-20T10:00:00Z"
}
```

**Note**: The primary admin record (`id: "config-primary-admin"`) is
stored here. The demotion guard checks this document before allowing
admin role removal.

---

### roles

Stores per-hackathon role assignments (Admin, Coach, Hacker).

```typescript
interface RoleDocument {
  id: string;
  _type: "role";
  hackathonId: string;
  githubUserId: string;
  githubLogin: string;
  role: "admin" | "coach" | "hacker";
  isPrimaryAdmin: boolean;
  assignedBy: string;
  assignedAt: string;
}
```

**Partition key**: `/hackathonId` — role lookups always happen in the
context of a specific hackathon ("what role does this user have in this
event?"). All roles for an event share one partition, keeping the
auth middleware query single-partition.

```json
{
  "id": "role-admin-4821",
  "_type": "role",
  "hackathonId": "hack-2026-stockholm",
  "githubUserId": "github|99887766",
  "githubLogin": "coach-sarah",
  "role": "coach",
  "isPrimaryAdmin": false,
  "assignedBy": "github|12345678",
  "assignedAt": "2026-02-22T11:00:00Z"
}
```

---

### challenges

Stores ordered challenge definitions for a hackathon. The `order` field
drives sequential gating in the progression system.

```typescript
interface ChallengeDocument {
  id: string;
  _type: "challenge";
  hackathonId: string;
  order: number;
  title: string;
  /** Markdown-formatted challenge description. */
  description: string;
  maxScore: number;
  createdBy: string;
  createdAt: string;
}
```

**Partition key**: `/hackathonId` — challenges are always listed per
event. The `order` field determines sequence; queries sort by `order ASC`
within the partition.

```json
{
  "id": "ch-networking-101",
  "_type": "challenge",
  "hackathonId": "hack-2026-stockholm",
  "order": 1,
  "title": "Networking Fundamentals",
  "description": "Deploy a VNet with two subnets and demonstrate connectivity between VMs using ping and traceroute.",
  "maxScore": 30,
  "createdBy": "github|12345678",
  "createdAt": "2026-02-20T12:00:00Z"
}
```

---

### progression

Tracks sequential challenge unlock state per team. Challenge 1 is
auto-unlocked when the hackathon starts. Each subsequent challenge
unlocks when the previous one is approved.

```typescript
interface UnlockedChallenge {
  challengeId: string;
  unlockedAt: string;
}

interface ProgressionDocument {
  id: string;
  _type: "progression";
  teamId: string;
  hackathonId: string;
  /** 1-based index of the highest unlocked challenge. */
  currentChallenge: number;
  unlockedChallenges: UnlockedChallenge[];
}
```

**Partition key**: `/teamId` — progression is always queried per team.
Each team has exactly one progression document per hackathon, so
partitions contain a single document (efficient point reads).

```json
{
  "id": "prog-alpha-4821",
  "_type": "progression",
  "teamId": "team-alpha-4821",
  "hackathonId": "hack-2026-stockholm",
  "currentChallenge": 2,
  "unlockedChallenges": [
    {
      "challengeId": "ch-networking-101",
      "unlockedAt": "2026-02-25T08:00:00Z"
    },
    {
      "challengeId": "ch-identity-201",
      "unlockedAt": "2026-02-25T15:00:00Z"
    }
  ]
}
```

---

## Cross-Container Query Patterns

### Leaderboard Assembly

| Containers | `scores` + `teams` + `hackers`                        |
| ---------- | ----------------------------------------------------- |
| Flow       | 1. Query `scores` by `hackathonId` (cross-partition). |
|            | 2. Group by `teamId`, sum `total` per team.           |
|            | 3. Fetch `teams` for display names.                   |
|            | 4. Rank, compute grade badges, identify awards.       |
| Notes      | Only approved scores exist in `scores` container.     |
|            | Tiebreaker: earliest `approvedAt` on last challenge.  |

### Submission Review Queue

| Containers | `submissions` + `rubrics`                                       |
| ---------- | --------------------------------------------------------------- |
| Flow       | 1. Read pointer doc (`active-rubric`) from `rubrics`.           |
|            | 2. Fetch the referenced versioned rubric.                       |
|            | 3. Query `submissions` where `state = 'pending'`, scoped       |
|            |    to `hackathonId`.                                            |
|            | 4. Present submissions with rubric categories for Coach grading.|
| Notes      | Coaches only see submissions for their assigned hackathons.     |

### Challenge Progression Check

| Containers | `progression` + `challenges`                                  |
| ---------- | ------------------------------------------------------------- |
| Flow       | 1. Read team's `progression` document (point read by          |
|            |    `teamId`).                                                 |
|            | 2. Query `challenges` for the hackathon, ordered by `order`.  |
|            | 3. Compare `currentChallenge` against challenge `order` to    |
|            |    determine which challenges are locked/unlocked.            |
| Notes      | On submission approval, if `challengeId` matches the current  |
|            | challenge, auto-increment `currentChallenge` and append to    |
|            | `unlockedChallenges`.                                         |

### Rubric Atomic Swap

| Containers | `rubrics` (single container, two doc types)                 |
| ---------- | ----------------------------------------------------------- |
| Flow       | 1. Insert new versioned rubric doc (`rubric-vN`).           |
|            | 2. Update pointer doc (`active-rubric`) to reference `vN`.  |
| Notes      | Two separate writes — not transactional. If step 2 fails,   |
|            | the old rubric stays active (safe failure mode). Consumers   |
|            | always read the pointer first.                              |

---

## Indexing Recommendations

| Container      | Policy                                                              |
| -------------- | ------------------------------------------------------------------- |
| `hackathons`   | Default (`/*`). Small volume — no optimisation needed.              |
| `teams`        | Default. Exclude `/members/*` from range indexes if member arrays   |
|                | grow large (currently ≤ 5 members, so default is fine).             |
| `teams`        | Composite index: `(hackathonId ASC)` for list queries.              |
| `hackers`      | Default. Composite index: `(hackathonId ASC, teamId ASC)` for      |
|                | assignment queries.                                                 |
| `scores`       | Composite index: `(hackathonId ASC, total DESC)` for leaderboard   |
|                | sorted queries.                                                     |
| `submissions`  | Default. Composite index: `(hackathonId ASC, state ASC)` for       |
|                | review queue queries.                                               |
| `rubrics`      | Default. Very few documents — no custom indexing needed.            |
| `config`       | Default. Very few documents.                                        |
| `roles`        | Default. Composite index: `(hackathonId ASC, githubUserId ASC)`    |
|                | for role-lookup queries.                                            |
| `challenges`   | Composite index: `(hackathonId ASC, order ASC)` for ordered        |
|                | listing.                                                            |
| `progression`  | Default. Single document per team — always point reads.             |

**Exclusions for cost savings:**

- `challenges./description` — Markdown content can be large. Exclude
  from range indexes; only queried by `hackathonId` + `order`.
- `rubrics./categories/*/description` — Markdown category descriptions.
  Exclude from range indexes; rubrics are fetched by `id` (point read).

---

## Key Invariants Encoded in the Schema

| Invariant                              | How the schema enforces it                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Staging pattern**                    | `submissions.state` is `"pending" \| "approved" \| "rejected"`. Approved submissions produce a separate `scores` document — never modified in place. |
| **Atomic rubric swap**                 | Pointer doc (`active-rubric`) + versioned rubrics. Writers update pointer only; readers follow the pointer to the active version.               |
| **Rubric-driven scoring**             | `RubricCategory` defines max scores. `CategoryScore` references `categoryId`. No hardcoded score fields anywhere.                              |
| **Team-scoped submissions**            | `submissions.teamId` + `submissions.submittedBy` validated at API boundary. Cross-team attempts rejected with 403.                             |
| **Sequential challenge gating**        | `progression.currentChallenge` (1-based) compared against `challenges.order`. Submission for a locked challenge returns 403.                    |
| **Event code as plaintext**            | `hackers.eventCode` stored as-is. Join endpoint is rate-limited (5/min/IP) — no SHA-256 hashing overhead.                                      |
| **Primary admin protection**           | `roles.isPrimaryAdmin` boolean. Demotion guard in `config` container (`config-primary-admin`). API rejects removal of the primary admin.       |
| **Immutable approved scores**          | `scores` documents are write-once on approval. Admin overrides are logged with `overriddenBy`, `overriddenAt`, `overrideReason`.                |
| **Audit trail on reviewer actions**    | `submissions.reviewedBy`, `reviewedAt`, `reviewReason` populated on every review action. Audit entries also written to the audit log.           |
| **Tiebreaker rule**                    | Leaderboard sorts by `total DESC`, then `approvedAt ASC` on the last challenge. Earliest completion wins ties.                                  |
