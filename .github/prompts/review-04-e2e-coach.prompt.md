---
description: "Write Playwright E2E tests for the coach journey: review submissions, approve/reject, verify scoring and gating"
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

# Review Phase R4: E2E Tests — Coach Journey

Write Playwright E2E tests covering the coach user flow:
reviewing submissions, approving/rejecting with scores,
and verifying challenge gating and leaderboard logic.

## Mission

Create E2E tests that exercise every coach-accessible
operation through a realistic review workflow. Tests build
on the data created by R3 admin tests.

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Branch**: `feature/code-review`
- **Prerequisite**: R3 complete (admin has created hackathon,
  challenges, rubrics, teams, and submissions exist)
- **Test directory**: `apps/web/tests/e2e/coach/`

## Context to load

1. `.github/skills/hackops-domain/SKILL.md` — scoring rules,
   challenge gating, tiebreaker logic
2. `docs/api-contract.md` — submission/score/leaderboard endpoints
3. `apps/web/tests/helpers/auth-helper.ts` — COACH_PRINCIPAL
4. R3 test files — understand shared setup

## Workflow

### Step 1 — Create test structure

Create `apps/web/tests/e2e/coach/`:

- `submission-review.spec.ts` — R4.1 + R4.2 + R4.3
- `challenge-gating.spec.ts` — R4.4
- `leaderboard-ranking.spec.ts` — R4.5

### Step 2 — Submission list + approve (R4.1 + R4.2)

1. Auth as coach via `withAuth(page, 'coach')`
2. `GET /api/submissions?hackathonId=...` → assert returns
   pending submissions with correct fields
3. `PATCH /api/submissions/[id]` with `state: "approved"`,
   rubric scores per category → assert 200
4. Verify scores sum correctly against rubric `maxScore`
5. Verify score record created in `GET /api/scores`

### Step 3 — Reject submission (R4.3)

1. `PATCH /api/submissions/[id]` with `state: "rejected"`,
   `reason: "Incomplete evidence"` → assert 200
2. Verify submission state is `rejected`
3. Verify no score record created for rejected submission
4. Verify audit entry with rejection reason

### Step 4 — Challenge gating (R4.4)

1. Team has Challenge 1 approved
2. `GET /api/progression/[challenge2Id]` → assert unlocked
3. Team has Challenge 1 still pending
4. `GET /api/progression/[challenge2Id]` → assert locked
5. Verify partial approval (some categories scored, not all)
   does NOT unlock next challenge

### Step 5 — Leaderboard + tiebreaker (R4.5)

1. Set up 3+ teams with scores
2. `GET /api/leaderboard/[hackathonId]` → assert sorted by
   total score descending
3. Create a tie scenario (two teams, same total score)
4. Verify tiebreaker: team with earlier `lastApprovalAt` ranks
   higher
5. Verify grade badges: A (top 25%), B (50-75%), C (25-50%),
   D (bottom 25%)

## Gate

```bash
npx playwright test tests/e2e/coach/ --reporter=list
```

All tests pass. Update tracker R4.1-R4.5.

## After completing

Update tracker, set next target to R5.1 (Hacker Journey).
