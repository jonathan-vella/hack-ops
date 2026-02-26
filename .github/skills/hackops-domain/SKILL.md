---
name: hackops-domain
description: >-
  HackOps business domain knowledge: roles and permissions matrix, hackathon
  lifecycle state machine, submission workflow, rubric pointer pattern, challenge
  gating logic, tiebreaker rule, team balance, and audit trail contract. Keystone
  skill paired with validate-business-rules.mjs for mechanical enforcement. Use
  when building or reviewing any HackOps business logic, API routes, or tests.
---

# HackOps Domain Knowledge

Business rules and invariants for the HackOps hackathon management platform.
This skill is the **single source of truth** for domain logic — code must
conform to these rules, and `validate-business-rules.mjs` mechanically
enforces key invariants.

## Roles & Permissions Matrix

| Action                        | Admin | Coach | Hacker | Anonymous |
| ----------------------------- | ----- | ----- | ------ | --------- |
| Create hackathon              | ✅    | ❌    | ❌     | ❌        |
| Edit hackathon                | ✅    | ❌    | ❌     | ❌        |
| Archive hackathon             | ✅    | ❌    | ❌     | ❌        |
| Assign teams (shuffle)        | ✅    | ❌    | ❌     | ❌        |
| Reassign hacker               | ✅    | ❌    | ❌     | ❌        |
| Create/edit rubric            | ✅    | ❌    | ❌     | ❌        |
| Create/edit challenges        | ✅    | ❌    | ❌     | ❌        |
| Invite Coach                  | ✅    | ❌    | ❌     | ❌        |
| Invite secondary Admin        | ✅    | ❌    | ❌     | ❌        |
| Demote/remove user            | ✅    | ❌    | ❌     | ❌        |
| View audit trail              | ✅    | ❌    | ❌     | ❌        |
| Review submission (approve)   | ✅    | ✅    | ❌     | ❌        |
| Review submission (reject)    | ✅    | ✅    | ❌     | ❌        |
| Override score                | ✅    | ✅    | ❌     | ❌        |
| Submit evidence               | ❌    | ❌    | ✅     | ❌        |
| Join hackathon by event code  | ❌    | ❌    | ✅     | ❌        |
| View own team progress        | ✅    | ✅    | ✅     | ❌        |
| View leaderboard              | ✅    | ✅    | ✅     | ❌        |
| View health endpoint          | ✅    | ✅    | ✅     | ✅        |

### Role Resolution

1. Parse `x-ms-client-principal` header (Easy Auth)
2. Extract `userId` from decoded claims
3. Query `roles` container: `WHERE c.userId = @userId AND c.hackathonId = @hackathonId`
4. If no record → role is `Anonymous` → block all data routes
5. `isPrimaryAdmin` flag prevents demotion of the creating admin

## Hackathon Lifecycle State Machine

```text
draft → registration → active → scoring → archived
  │                                           │
  └──────────── (delete, draft only) ─────────┘
```

| State          | Who can transition | What's allowed                              |
| -------------- | ------------------ | ------------------------------------------- |
| `draft`        | Admin              | Edit settings, create rubric, add challenges |
| `registration` | Admin              | Hackers can join via event code              |
| `active`       | Admin              | Submissions accepted, challenge progression  |
| `scoring`      | Admin              | Final reviews, no new submissions            |
| `archived`     | Admin              | Read-only, leaderboard frozen                |

**Invariant**: State transitions are forward-only (no going back to `draft`
from `active`). The only exception is deleting a hackathon in `draft` state.

## Submission Workflow

```text
Hacker submits evidence → state: "pending"
  ↓
Coach/Admin reviews
  ├── approve → state: "approved" → score copied to scores container
  │                               → check challenge gating (auto-unlock next)
  └── reject  → state: "rejected" → hacker may resubmit
```

### Invariants

- **Scoring authority**: Only Coaches and Admins enter rubric scores
- **Hackers submit evidence** — they do not score themselves
- **Unlimited resubmissions**: Hackers may resubmit after rejection
- **Review fields**: Every approve/reject MUST set `reviewedBy`, `reviewedAt`,
  `reviewReason`
- **Team-scoped**: Hackers can only submit for their own team (enforced via
  partition key `teamId`)

## Rubric Pointer Pattern

The rubric uses a pointer + versioned document pattern for atomic swaps:

```text
rubrics container:
  ├── { _type: "rubric-pointer", activeVersion: 3 }     # Pointer document
  ├── { _type: "rubric-version", version: 1, ... }      # Version 1
  ├── { _type: "rubric-version", version: 2, ... }      # Version 2
  └── { _type: "rubric-version", version: 3, ... }      # Version 3 (active)
```

- **Read path**: Read pointer → fetch version document by `activeVersion`
- **Update path**: Create new version N+1 → update pointer to N+1 (atomic)
- **No partial reads**: Readers always see a complete rubric version

## Challenge Gating Logic

Challenges are sequential. Challenge N+1 is locked until Challenge N is approved.

```text
progression container (per team):
{
  teamId: "T1",
  hackathonId: "H1",
  unlockedChallenges: ["C1", "C2"],  // C3 is locked
  completedChallenges: ["C1"],        // C1 fully approved
}
```

### Gate Check Algorithm

```text
function canAccessChallenge(teamId, challengeOrder):
  progression = getProgression(teamId)
  if challengeOrder == 1: return true  // First challenge always unlocked
  previousChallenge = getChallengeByOrder(challengeOrder - 1)
  return previousChallenge.id in progression.completedChallenges
```

### Auto-Unlock Trigger

When a submission is approved:

1. Check if all submissions for that challenge are approved
2. If yes → add next challenge to `unlockedChallenges`
3. Update progression document

## Tiebreaker Rule

When two teams have equal total scores:

**Winner**: Team with the earliest `approvedAt` timestamp on their last approved
submission.

Rationale: rewards faster completion.

## Team Assignment (Fisher-Yates Shuffle)

When Admin triggers team assignment:

1. Get all hackers for the hackathon
2. Shuffle using Fisher-Yates algorithm
3. Distribute into teams of `hackathon.teamSize`
4. Enforce minimum: `ceil(teamSize / 2)` per team
5. If last team would be below minimum → redistribute into existing teams

```text
function assignTeams(hackers, teamSize):
  shuffle(hackers)  // Fisher-Yates
  teams = chunk(hackers, teamSize)
  minSize = ceil(teamSize / 2)
  if last team size < minSize:
    redistribute last team's members into other teams
  return teams
```

## Event Code Join Flow

1. Hacker enters 4-digit event code
2. Server validates code against `hackathons` container
3. **Rate limiting**: 5 attempts per minute per IP address
4. Event code stored as **plaintext** (not hashed)
5. On valid code → create hacker record → auto-assign to team (if teams exist)

## Audit Trail Contract

Every mutation endpoint MUST log:

```typescript
interface AuditEntry {
  action: string;        // e.g., "submission.approved", "hackathon.created"
  performedBy: string;   // userId of the actor
  performedAt: string;   // ISO 8601 timestamp
  targetType: string;    // e.g., "submission", "hackathon", "team"
  targetId: string;      // ID of the affected resource
  hackathonId: string;   // Scoping for audit queries
  details?: unknown;     // Additional context (old/new values)
}
```

Audit entries are appended to the relevant container (not a separate audit
container) as a field on the mutated document or as a separate item in the
same partition.

## Mechanical Enforcement

The `validate-business-rules.mjs` script (C6) enforces:

1. All API routes import types from `packages/shared/types/api-contract.ts`
2. Role guard middleware on every protected route
3. Audit logging calls in every mutation endpoint
4. Zod validation at API boundary
5. Score fields never directly mutated (must go through scoring service)

Run with: `npm run validate:business-rules`
