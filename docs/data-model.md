# HackOps — Cosmos DB Data Model

> Canonical reference for every Cosmos DB container, its schema, partition key
> rationale, indexing policy, and cross-container query patterns.
>
> **Database**: Cosmos DB NoSQL (Core API), Serverless capacity mode
> **Region**: swedencentral
> **Auth**: Managed identity with Cosmos DB SQL role assignment (Built-in Data Contributor)

---

## Overview

HackOps stores all application state in a single Cosmos DB NoSQL account
containing **10 containers**. Each container has a well-defined partition key
chosen to co-locate related documents and minimize cross-partition queries.

All document interfaces include:

- `id: string` — Cosmos DB document ID (unique within the partition)
- The partition key field — duplicated at the top level per Cosmos DB requirements
- `_type: string` — discriminant field for polymorphic containers and change feed consumers

Cosmos DB system properties (`_rid`, `_self`, `_etag`, `_ts`) are managed
automatically and NOT included in the TypeScript interfaces.

---

## Container Summary Table

| Container      | Partition Key    | Purpose                 | Avg Doc Size | Query Pattern           |
| -------------- | ---------------- | ----------------------- | ------------ | ----------------------- |
| `hackathons`   | `/id`            | Event lifecycle         | ~0.5 KB      | Point read by ID        |
| `teams`        | `/hackathonId`   | Team roster             | ~1 KB        | Fan-out by hackathon    |
| `hackers`      | `/hackathonId`   | Hacker profiles         | ~0.3 KB      | Fan-out by hackathon    |
| `scores`       | `/teamId`        | Approved scores         | ~0.5 KB      | Fan-out by team         |
| `submissions`  | `/teamId`        | Staging queue           | ~2 KB        | Filter by state         |
| `rubrics`      | `/id`            | Scoring rubrics         | ~3 KB        | Point read (pointer)    |
| `config`       | `/id`            | App configuration       | ~0.2 KB      | Point read by key       |
| `roles`        | `/hackathonId`   | Role assignments        | ~0.3 KB      | Fan-out by hackathon    |
| `challenges`   | `/hackathonId`   | Challenge definitions   | ~1 KB        | Fan-out + sort by order |
| `progression`  | `/teamId`        | Unlock state            | ~0.5 KB      | Point read by team      |

---

## Container Definitions

### hackathons

Stores hackathon event records. Each hackathon has a unique auto-generated
4-digit event code used for hacker self-service onboarding.

**Partition key**: `/id` — each hackathon is its own partition. Point reads by
ID are the primary access pattern; list queries are Admin-only and infrequent.

```typescript
interface Hackathon {
  id: string;
  _type: "hackathon";
  name: string;
  description: string;
  status: "draft" | "active" | "archived";
  /** Auto-generated 4-digit numeric code (1000–9999), unique across active hackathons */
  eventCode: string;
  teamSize: number;
  createdBy: string;
  createdAt: string;
  launchedAt: string | null;
  archivedAt: string | null;
}
```

```json
{
  "id": "hack-2026-swedenai",
  "_type": "hackathon",
  "name": "Sweden AI MicroHack 2026",
  "description": "Build AI-powered solutions using Azure OpenAI and Cosmos DB",
  "status": "active",
  "eventCode": "4821",
  "teamSize": 5,
  "createdBy": "github|12345678",
  "createdAt": "2026-02-15T09:00:00Z",
  "launchedAt": "2026-02-20T08:00:00Z",
  "archivedAt": null
}
```

---

### teams

Stores team records created via Fisher-Yates shuffle assignment.
Each team belongs to a single hackathon and contains an embedded members array.

**Partition key**: `/hackathonId` — all teams for a hackathon are co-located,
enabling efficient fan-out queries for admin dashboards and leaderboard assembly.

```typescript
interface TeamMember {
  hackerId: string;
  githubLogin: string;
  displayName: string;
}

interface Team {
  id: string;
  _type: "team";
  hackathonId: string;
  name: string;
  members: TeamMember[];
}
```

```json
{
  "id": "team-alpha-4821",
  "_type": "team",
  "hackathonId": "hack-2026-swedenai",
  "name": "Team Alpha",
  "members": [
    {
      "hackerId": "hkr-a1b2c3d4",
      "githubLogin": "alice-dev",
      "displayName": "Alice Andersson"
    },
    {
      "hackerId": "hkr-e5f6g7h8",
      "githubLogin": "bob-coder",
      "displayName": "Bob Bergström"
    },
    {
      "hackerId": "hkr-i9j0k1l2",
      "githubLogin": "carol-hacks",
      "displayName": "Carol Chen"
    }
  ]
}
```

---

### hackers

Stores individual hacker profiles. A hacker joins a hackathon by providing the
4-digit event code. The `eventCode` field is stored as plaintext; security is
enforced via rate limiting on the join endpoint (5 attempts/min/IP).

**Partition key**: `/hackathonId` — all hackers in a hackathon are co-located
for efficient listing and team assignment shuffle.

```typescript
interface Hacker {
  id: string;
  _type: "hacker";
  hackathonId: string;
  githubUserId: string;
  githubLogin: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  /** Plaintext event code used at join time; security via rate limiting, not hashing */
  eventCode: string;
  teamId: string | null;
  joinedAt: string;
}
```

```json
{
  "id": "hkr-a1b2c3d4",
  "_type": "hacker",
  "hackathonId": "hack-2026-swedenai",
  "githubUserId": "github|87654321",
  "githubLogin": "alice-dev",
  "displayName": "Alice Andersson",
  "email": "alice@example.com",
  "avatarUrl": "https://avatars.githubusercontent.com/u/87654321",
  "eventCode": "4821",
  "teamId": "team-alpha-4821",
  "joinedAt": "2026-02-20T10:15:00Z"
}
```

---

### scores

Stores immutable approved score records. Created when a Coach approves a
submission — the validated category scores are copied from the submission into
this container. Score overrides by Admin create a new document version with
an audit trail.

**Partition key**: `/teamId` — all scores for a team are co-located, enabling
efficient aggregation for leaderboard computation.

```typescript
interface CategoryScore {
  categoryId: string;
  score: number;
}

interface Score {
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
  /** Present only when an Admin overrides a score */
  overriddenBy: string | null;
  overriddenAt: string | null;
  overrideReason: string | null;
}
```

```json
{
  "id": "score-a1b2c3d4-ch1",
  "_type": "score",
  "teamId": "team-alpha-4821",
  "hackathonId": "hack-2026-swedenai",
  "challengeId": "ch-001-setup",
  "submissionId": "sub-x7y8z9",
  "categoryScores": [
    { "categoryId": "code-quality", "score": 8 },
    { "categoryId": "creativity", "score": 9 },
    { "categoryId": "completeness", "score": 7 }
  ],
  "total": 24,
  "approvedBy": "github|11111111",
  "approvedAt": "2026-02-21T14:30:00Z",
  "overriddenBy": null,
  "overriddenAt": null,
  "overrideReason": null
}
```

---

### submissions

Holds evidence submissions in a staging queue. Submissions enter as `pending`
and move to `approved` or `rejected` after Coach/Admin review. On approval,
validated scores are copied to the `scores` container.

Unlimited resubmissions are allowed — scores are only entered by Coaches on
review, so there is no reason to limit evidence uploads.

**Partition key**: `/teamId` — submissions are team-scoped. Hackers can only
submit for their own team (cross-team attempts return 403). The review queue
query filters by `state` within a hackathon, which requires a cross-partition
query — acceptable given the low volume (~75 concurrent users).

```typescript
interface Submission {
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
  /** Coach-entered scores; null until reviewed */
  scores: CategoryScore[] | null;
  /** Populated on review */
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
}
```

```json
{
  "id": "sub-x7y8z9",
  "_type": "submission",
  "teamId": "team-alpha-4821",
  "hackathonId": "hack-2026-swedenai",
  "challengeId": "ch-001-setup",
  "state": "pending",
  "description": "## Environment Setup\n\nWe configured the Azure OpenAI endpoint and verified connectivity from our Next.js app.\n\n**Evidence**: Screenshot of successful API call and response time metrics.",
  "attachments": [
    "evidence/team-alpha-4821/ch-001/screenshot-api-call.png"
  ],
  "submittedBy": "github|87654321",
  "submittedAt": "2026-02-21T11:45:00Z",
  "scores": null,
  "reviewedBy": null,
  "reviewedAt": null,
  "reviewReason": null
}
```

---

### rubrics

Stores versioned scoring rubrics using a **pointer + versioned document**
pattern. Rubric versions are stored as separate documents (`rubric-v1`,
`rubric-v2`, etc.) alongside a small pointer document that indicates the
active version.

**Atomic swap**: To activate a new rubric version, insert the new versioned
document, then update the pointer document's `activeRubricId` field. Consumers
always read the pointer first, then fetch the referenced version — preventing
partial reads during updates.

**Partition key**: `/id` — each rubric (pointer or version) is its own
partition. Point reads are the dominant access pattern.

```typescript
interface RubricCategory {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

/** Pointer document — one per hackathon, indicates which rubric version is active */
interface RubricPointer {
  id: string;
  _type: "rubric-pointer";
  hackathonId: string;
  activeRubricId: string;
  updatedAt: string;
  updatedBy: string;
}

/** Versioned rubric document — immutable once created */
interface RubricVersion {
  id: string;
  _type: "rubric-version";
  hackathonId: string;
  version: number;
  categories: RubricCategory[];
  createdBy: string;
  createdAt: string;
}
```

**Pointer document sample:**

```json
{
  "id": "rubric-ptr-hack-2026-swedenai",
  "_type": "rubric-pointer",
  "hackathonId": "hack-2026-swedenai",
  "activeRubricId": "rubric-hack-2026-swedenai-v2",
  "updatedAt": "2026-02-19T16:00:00Z",
  "updatedBy": "github|12345678"
}
```

**Versioned rubric document sample:**

```json
{
  "id": "rubric-hack-2026-swedenai-v2",
  "_type": "rubric-version",
  "hackathonId": "hack-2026-swedenai",
  "version": 2,
  "categories": [
    {
      "id": "code-quality",
      "name": "Code Quality",
      "description": "Clean, well-structured, and documented code with proper error handling",
      "maxScore": 10
    },
    {
      "id": "creativity",
      "name": "Creativity & Innovation",
      "description": "Novel approach to the problem, creative use of Azure services",
      "maxScore": 10
    },
    {
      "id": "completeness",
      "name": "Completeness",
      "description": "All requirements addressed, working end-to-end demo",
      "maxScore": 10
    }
  ],
  "createdBy": "github|12345678",
  "createdAt": "2026-02-19T16:00:00Z"
}
```

---

### config

Stores application-wide configuration key-value pairs. Each document
represents a single configuration setting (leaderboard refresh interval,
max team size, feature flags, etc.).

**Partition key**: `/id` — each config entry is its own partition. All
access is by point read on the key name.

```typescript
interface Config {
  id: string;
  _type: "config";
  key: string;
  value: string | number | boolean;
  updatedBy: string;
  updatedAt: string;
}
```

```json
{
  "id": "cfg-leaderboard-refresh-interval",
  "_type": "config",
  "key": "leaderboard-refresh-interval",
  "value": 30000,
  "updatedBy": "github|12345678",
  "updatedAt": "2026-02-15T09:30:00Z"
}
```

---

### roles

Stores per-hackathon role assignments mapping GitHub users to Admin, Coach,
or Hacker roles. The primary admin is flagged and cannot be demoted.

**Partition key**: `/hackathonId` — all roles for a hackathon are co-located
for efficient role resolution and admin listing.

```typescript
interface Role {
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

```json
{
  "id": "role-12345678-hack-2026-swedenai",
  "_type": "role",
  "hackathonId": "hack-2026-swedenai",
  "githubUserId": "github|12345678",
  "githubLogin": "jonathan-admin",
  "role": "admin",
  "isPrimaryAdmin": true,
  "assignedBy": "system",
  "assignedAt": "2026-02-15T09:00:00Z"
}
```

---

### challenges

Stores ordered challenge definitions for a hackathon. Challenge order
determines the sequential gating — teams must complete Challenge N before
unlocking Challenge N+1.

**Partition key**: `/hackathonId` — all challenges for a hackathon are
co-located, enabling efficient sorted retrieval by `order` field.

```typescript
interface Challenge {
  id: string;
  _type: "challenge";
  hackathonId: string;
  order: number;
  title: string;
  /** Markdown-formatted challenge description */
  description: string;
  maxScore: number;
  createdBy: string;
  createdAt: string;
}
```

```json
{
  "id": "ch-001-setup",
  "_type": "challenge",
  "hackathonId": "hack-2026-swedenai",
  "order": 1,
  "title": "Environment Setup",
  "description": "## Challenge 1: Environment Setup\n\nConfigure your development environment with Azure OpenAI access.\n\n### Requirements\n\n1. Deploy an Azure OpenAI resource\n2. Configure API keys in your application\n3. Demonstrate a successful API call\n\n### Deliverables\n\n- Screenshot of successful API response\n- Code snippet showing SDK integration",
  "maxScore": 30,
  "createdBy": "github|12345678",
  "createdAt": "2026-02-18T10:00:00Z"
}
```

---

### progression

Tracks per-team challenge unlock state. Challenge 1 is auto-unlocked when
a hackathon launches. Subsequent challenges unlock when the preceding
challenge's submission is approved.

**Partition key**: `/teamId` — each team has exactly one progression
document per hackathon, accessed via point read.

```typescript
interface UnlockedChallenge {
  challengeId: string;
  unlockedAt: string;
}

interface Progression {
  id: string;
  _type: "progression";
  teamId: string;
  hackathonId: string;
  /** 1-based index of the current (highest unlocked) challenge */
  currentChallenge: number;
  unlockedChallenges: UnlockedChallenge[];
}
```

```json
{
  "id": "prog-team-alpha-4821",
  "_type": "progression",
  "teamId": "team-alpha-4821",
  "hackathonId": "hack-2026-swedenai",
  "currentChallenge": 2,
  "unlockedChallenges": [
    {
      "challengeId": "ch-001-setup",
      "unlockedAt": "2026-02-20T08:00:00Z"
    },
    {
      "challengeId": "ch-002-ingestion",
      "unlockedAt": "2026-02-21T14:30:00Z"
    }
  ]
}
```

---

## Cross-Container Query Patterns

### Leaderboard Assembly

**Containers**: `scores` + `teams` + `hackers`

Aggregate approved scores per team, join with team display names and member
info for the expandable row view. Tiebreaker: earliest `lastApprovalAt`
timestamp wins when total scores are equal.

```text
1. Query scores WHERE hackathonId = {id}          → cross-partition on scores
2. Group by teamId, SUM(total) as totalScore
3. Query teams WHERE hackathonId = {id}            → single partition on teams
4. Join team names + member display names
5. Sort by totalScore DESC, lastApprovalAt ASC
6. Compute grade badges from rubric thresholds
```

**RU estimate**: ~10–15 RUs per leaderboard refresh (small dataset at scale).

---

### Submission Review Queue

**Containers**: `submissions` + `rubrics`

Load pending submissions for a hackathon alongside the active rubric
so Coaches can score against the correct criteria.

```text
1. Read rubric pointer WHERE id = "rubric-ptr-{hackathonId}"  → point read (1 RU)
2. Read active rubric WHERE id = pointer.activeRubricId       → point read (1 RU)
3. Query submissions WHERE hackathonId = {id}
   AND state = "pending"                                      → cross-partition (~5 RUs)
4. Return submissions + rubric categories for scoring form
```

---

### Challenge Progression Check

**Containers**: `progression` + `challenges`

Determine the next unlockable challenge for a team. Used on submission
create (gate check) and on submission approval (auto-unlock trigger).

```text
1. Read progression WHERE teamId = {teamId}
   AND hackathonId = {hackathonId}                    → point read (1 RU)
2. Query challenges WHERE hackathonId = {hackathonId}
   ORDER BY order ASC                                 → single partition (~3 RUs)
3. Compare currentChallenge against submission's challengeId order
4. On approval: increment currentChallenge, append to unlockedChallenges
```

---

### Rubric Atomic Swap

**Container**: `rubrics` (single container, two document types)

Update the active rubric version without risk of partial reads by
consumers. The pointer and version documents are independent — readers
always start from the pointer.

```text
1. Insert new RubricVersion document (e.g., rubric-{hackathonId}-v3)   → 5 RUs
2. Update RubricPointer.activeRubricId to the new version ID           → 5 RUs
3. Consumers read pointer first, then fetch the referenced version
   — no transaction needed; pointer update is the atomic boundary
```

---

## Indexing Recommendations

### Default Policy

Most containers use the default indexing policy (`/*`) which indexes all
properties. This is appropriate for the small document sizes and low query
volume in HackOps.

### Per-Container Adjustments

| Container     | Adjustment                                                        | Rationale                                                                                    |
| ------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `submissions` | Exclude `/description` and `/attachments/*`                       | Large Markdown text and attachment URLs are never queried by value; saves ~30% index storage  |
| `rubrics`     | Exclude `/categories/*/description`                               | Markdown descriptions in rubric categories are read-only after creation; never filtered       |
| `challenges`  | Exclude `/description`                                            | Markdown challenge descriptions are never queried by value                                    |
| `scores`      | Composite index: `(hackathonId ASC, total DESC)`                  | Enables efficient sorted leaderboard query without in-memory sorting                         |
| `submissions` | Composite index: `(hackathonId ASC, state ASC, submittedAt DESC)` | Efficient review queue with state filter and chronological ordering                          |

### Example: Submissions Indexing Policy

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    { "path": "/*" }
  ],
  "excludedPaths": [
    { "path": "/description/?" },
    { "path": "/attachments/*" },
    { "path": "/\"_etag\"/?" }
  ],
  "compositeIndexes": [
    [
      { "path": "/hackathonId", "order": "ascending" },
      { "path": "/state", "order": "ascending" },
      { "path": "/submittedAt", "order": "descending" }
    ]
  ]
}
```

---

## Key Invariants Encoded in the Schema

| Invariant                    | Where Enforced                                   | Schema Detail                                                                                                     |
| ---------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Staging pattern**          | `submissions.state`                              | Union type `"pending" \| "approved" \| "rejected"` — scores only copied to `scores` container on `approved`       |
| **One active rubric**        | `rubrics` container                              | Pointer document (`_type: "rubric-pointer"`) + versioned documents (`_type: "rubric-version"`); atomic swap       |
| **Rubric-driven scoring**    | `rubrics.categories`                             | All scoring UI and validation derived from `RubricCategory[]` — nothing hardcoded                                 |
| **Team-scoped submissions**  | `submissions.teamId` (partition key)             | Hackers can only submit for their own team; cross-team attempts return 403                                        |
| **Plaintext event codes**    | `hackers.eventCode`                              | Stored as plaintext string; security via rate limiting (5/min/IP) on join endpoint                                |
| **Sequential gating**        | `challenges.order` + `progression`               | Challenge N+1 gated until N is approved; `unlockedChallenges[]` tracks unlock history                             |
| **Audit trail**              | `submissions.reviewedBy/At/Reason`               | All reviewer actions carry `reviewedBy`, `reviewedAt`, `reviewReason` fields                                      |
| **Primary admin protection** | `roles.isPrimaryAdmin`                           | Boolean flag prevents demotion; checked in role management API                                                    |
| **Tiebreaker rule**          | `scores.approvedAt`                              | Earliest last-approval timestamp wins when total scores are equal                                                 |
| **Team balance**             | `hackathons.teamSize`                            | `ceil(teamSize / 2)` minimum per team enforced at assignment time                                                 |
