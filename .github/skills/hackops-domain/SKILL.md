---
name: hackops-domain
description: >-
  HackOps platform business rules, role matrix, lifecycle states, and
  scoring invariants. Use when building API routes, writing tests,
  or validating business logic for the HackOps hackathon management
  platform. Keywords: hackathon, team, coach, hacker, admin, rubric,
  scoring, leaderboard, event code, progression.
---

# HackOps Domain Knowledge

Business rules and invariants for the HackOps hackathon management platform.
Source of truth: `packages/shared/types/api-contract.ts` + `docs/prd.md`.

## When to Use This Skill

- Building or reviewing API route handlers
- Writing test cases for business logic
- Implementing scoring, progression, or team management
- Validating state machine transitions

## Role Matrix

| Role      | Scope          | Can create hackathons | Can score | Can submit evidence | Can manage teams |
| --------- | -------------- | --------------------- | --------- | ------------------- | ---------------- |
| `admin`   | Per-hackathon  | Yes                   | No        | No                  | Yes              |
| `coach`   | Per-hackathon  | No                    | Yes       | No                  | No               |
| `hacker`  | Per-hackathon  | No                    | No        | Yes                 | No               |

- Roles are **hackathon-scoped** — a user can be admin in one event and hacker in another
- The hackathon creator is automatically the **primary admin** (`isPrimaryAdmin: true`)
- Primary admin cannot be demoted or removed
- Coaches and admins are invited by an admin via `/api/roles/invite`

## Hackathon Lifecycle

```text
draft → active → archived
```

| Transition        | Who can trigger | Side effects                                   |
| ----------------- | --------------- | ---------------------------------------------- |
| draft → active    | admin           | Sets `launchedAt`; enables join via event code  |
| active → archived | admin           | Sets `archivedAt`; freezes leaderboard          |
| (no other)        | —               | Return 422 for invalid transitions              |

- Event codes are **4-digit numeric strings** (`/^\d{4}$/`)
- Event codes must be **unique across all active hackathons**
- Hackers join via POST `/api/join` with the event code

## Team Assignment

- Admin triggers POST `/api/hackathons/{id}/assign-teams`
- Fisher-Yates shuffle distributes unassigned hackers into balanced teams
- Default team size: `hackathon.teamSize` (configurable, default 4)
- Runt team rule: if last team has fewer than `ceil(teamSize/2)` members,
  merge into the previous team
- Team names use NATO alphabet: Alpha, Bravo, Charlie, ...

## Scoring Rules

- **Rubrics** define scoring categories (e.g., Code Quality, Creativity)
- Each category has a `maxScore` ceiling
- **Hackers** submit evidence for challenges
- **Coaches** review submissions and enter rubric scores
- On approval, an immutable `ScoreRecord` is created
- Score overrides require admin role + mandatory reason

### Tiebreaker

When total scores are equal, the team with the **earliest `lastApprovalAt`**
timestamp wins. This rewards faster completion.

### Grade Badges

| Badge | Criteria                     |
| ----- | ---------------------------- |
| A     | Top 25% of total scores      |
| B     | 50th–75th percentile         |
| C     | 25th–50th percentile         |
| D     | Bottom 25%                   |

## Challenge Progression

- Challenges are ordered (`order` field, 1-based)
- A team must have an approved submission for challenge N before
  unlocking challenge N+1
- Progression is tracked per-team in the `progression` container
- Skipping challenges is not allowed

## Key Invariants (Test These)

1. A hacker cannot join the same hackathon twice (409 Conflict)
2. Only active hackathons accept joins (event code lookup filters by status)
3. State transitions are strictly `draft→active→archived` (422 otherwise)
4. Primary admin cannot be removed or demoted
5. Rubric category scores must not exceed `maxScore`
6. Score records are immutable once created (overrides create new records)
7. Tiebreaker uses earliest `lastApprovalAt`, not alphabetical
8. Team reassignment cannot cross hackathon boundaries (422)
9. Rate limiting on join endpoint: 5 requests per minute per IP

## References

- `packages/shared/types/api-contract.ts` — type-level contract
- `docs/prd.md` — user stories and acceptance criteria
- `docs/data-model.md` — Cosmos DB container design
- `docs/api-contract.md` — endpoint documentation
