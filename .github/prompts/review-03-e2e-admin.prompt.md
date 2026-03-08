---
description: "Write Playwright E2E tests for the full admin journey: create hackathon, challenges, teams, roles, audit, archive"
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "edit/createDirectory",
    "search/textSearch",
    "search/fileSearch",
    "execute/runInTerminal",
    "execute/runTests",
  ]
---

# Review Phase R3: E2E Tests — Admin Journey

Write Playwright E2E tests covering the complete admin user
flow from hackathon creation through archival.

## Mission

Create E2E tests that exercise every admin-accessible API
endpoint and page through a realistic hackathon lifecycle.
Tests run against the local SQL Server container from R1.

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Blueprint**: `.github/prompts/plan-endToEndCodeReview.prompt.md`
- **Branch**: `feature/code-review`
- **Prerequisite**: R1 complete (Playwright + SQL container + fixtures)
- **Test directory**: `apps/web/tests/e2e/admin/`

## Context to load

1. `.github/skills/hackops-domain/SKILL.md` — business rules
   for hackathon lifecycle, team assignment, scoring, roles
2. `docs/api-contract.md` — endpoint reference for admin routes
3. `apps/web/tests/helpers/auth-helper.ts` — auth simulation
4. `apps/web/tests/fixtures/index.ts` — seed data constants

## Workflow

### Step 1 — Create test structure

Create `apps/web/tests/e2e/admin/` with:

- `hackathon-lifecycle.spec.ts` — R3.1 + R3.3 + R3.8
- `challenges-rubrics.spec.ts` — R3.2
- `team-assignment.spec.ts` — R3.4
- `audit-log.spec.ts` — R3.5
- `score-override.spec.ts` — R3.6
- `role-management.spec.ts` — R3.7

### Step 2 — Hackathon lifecycle (R3.1 + R3.3 + R3.8)

Test the full state machine: `draft → active → archived`.

1. `POST /api/hackathons` as admin → assert 201, response
   contains `eventCode` (4-digit string), status is `draft`
2. `PATCH /api/hackathons/[id]` with `status: "active"` →
   assert `launchedAt` is populated
3. Verify `GET /api/hackathons/[id]` returns `status: "active"`
4. `PATCH /api/hackathons/[id]` with `status: "archived"` →
   assert `archivedAt` is populated
5. Attempt `PATCH /api/hackathons/[id]` on archived hackathon →
   assert 409 Conflict

### Step 3 — Challenges + rubrics (R3.2)

1. Create 3 challenges with sequential `order` values
2. Create rubric for each challenge with categories
3. Verify `GET /api/challenges/[id]` returns correct order
4. Verify rubric categories sum to `maxScore`

### Step 4 — Team assignment (R3.4)

1. Seed 10+ hackers into the active hackathon
2. `POST /api/hackathons/[id]/assign-teams` with `teamSize: 3`
3. Assert teams are balanced (±1 member)
4. Assert runt-team rule: no team < ceil(3/2) = 2 members
5. Assert all hackers assigned (none orphaned)

### Step 5 — Audit log (R3.5)

1. Perform several admin actions (create hackathon, assign teams)
2. `GET /api/audit/[hackathonId]` as admin → assert entries
   exist with correct `action`, `performedBy`, timestamps
3. Verify audit entries are immutable (no update/delete endpoints)

### Step 6 — Score override (R3.6)

1. Create a submission and have it scored by a coach
2. `PATCH /api/scores/[id]` as admin with new score + reason
3. Verify audit entry created with `action: "score.overridden"`
4. Verify leaderboard reflects the override

### Step 7 — Role management (R3.7)

1. `POST /api/roles` — assign coach role to a user
2. `GET /api/roles` — verify role exists
3. Attempt to remove primary admin role → assert 403/409
4. `POST /api/roles/[id]/invite` — verify invitation flow

### Step 8 — Archive enforcement (R3.8)

1. Archive the hackathon (from Step 2)
2. Attempt `POST /api/submissions` → assert 409
3. Attempt `POST /api/scores` → assert 409
4. `GET /api/leaderboard/[hackathonId]` → assert still readable
5. Verify leaderboard is frozen (scores don't change)

## Gate

```bash
npx playwright test tests/e2e/admin/ --reporter=list
```

All tests pass. Update tracker R3.1-R3.8.

## After completing

Update tracker, set next target to R4.1 (Coach Journey).
