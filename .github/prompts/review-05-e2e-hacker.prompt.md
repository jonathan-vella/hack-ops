---
description: "Write Playwright E2E tests for the hacker journey: join via event code, submit challenges, verify progression and leaderboard"
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

# Review Phase R5: E2E Tests — Hacker Journey

Write Playwright E2E tests covering the hacker user flow:
joining via event code, submitting challenges, experiencing
progression gating, and viewing leaderboard position.

## Mission

Create E2E tests that exercise the complete hacker experience
from first join to leaderboard ranking. Includes rate limiting
verification for the join endpoint.

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Branch**: `feature/code-review`
- **Prerequisite**: R3 complete (active hackathon exists)
- **Test directory**: `apps/web/tests/e2e/hacker/`

## Context to load

1. `.github/skills/hackops-domain/SKILL.md` — join rules,
   progression, grade badges
2. `docs/api-contract.md` — join, submission, progression endpoints
3. `apps/web/tests/helpers/auth-helper.ts` — HACKER_PRINCIPAL
4. `apps/web/src/lib/rate-limiter.ts` — rate limit config

## Workflow

### Step 1 — Create test structure

Create `apps/web/tests/e2e/hacker/`:

- `join-event.spec.ts` — R5.1 + R5.2
- `submit-challenges.spec.ts` — R5.3 + R5.4 + R5.5 + R5.6
- `leaderboard-view.spec.ts` — R5.7

### Step 2 — Join via event code (R5.1)

1. `POST /api/join` with valid 4-digit event code → assert 200
2. Verify hacker record created with correct `hackathonId`
3. Verify hacker auto-assigned to a team (or pending assignment)
4. Attempt duplicate join → assert idempotent (200, not error)

### Step 3 — Rate limiting (R5.2)

1. Send 5 `POST /api/join` requests in rapid succession → all 200
2. Send 6th request → assert 429 Too Many Requests
3. Wait for rate limit window reset (60s or mock time)
4. Verify different IPs are tracked independently

### Step 4 — Dashboard view (R5.3)

1. Navigate to `/dashboard` as hacker
2. Verify challenge list renders
3. Verify progression bar shows 0% (no submissions yet)
4. Verify only Challenge 1 is unlocked

### Step 5 — Submit Challenge 1 (R5.4)

1. `POST /api/submissions` for Challenge 1 → assert 201
2. Verify submission state is `pending`
3. Verify dashboard shows submission as pending

### Step 6 — Challenge 2 gating (R5.5)

1. Challenge 1 still pending (not yet approved by coach)
2. `GET /api/progression/[challenge2Id]` → assert locked
3. Attempt `POST /api/submissions` for Challenge 2 → assert
   403 or appropriate gating error

### Step 7 — Progression after approval (R5.6)

1. Simulate coach approval of Challenge 1 (direct API call
   as coach, or use seed data)
2. `GET /api/progression/[challenge2Id]` → assert unlocked
3. `POST /api/submissions` for Challenge 2 → assert 201
4. Verify progression bar updated

### Step 8 — Leaderboard view (R5.7)

1. Navigate to `/leaderboard/[hackathonId]`
2. Verify team appears in leaderboard
3. Verify grade badge displayed (A/B/C/D based on quartile)
4. Verify public access (no auth required for leaderboard page)

## Gate

```bash
npx playwright test tests/e2e/hacker/ --reporter=list
```

All tests pass. Update tracker R5.1-R5.7.

## After completing

Update tracker, set next target to R6.1 (Cross-Cutting).
