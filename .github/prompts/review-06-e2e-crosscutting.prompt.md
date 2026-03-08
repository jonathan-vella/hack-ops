---
description: "Write Playwright E2E tests for cross-cutting concerns: auth enforcement, role guards, archived state, rate limiting, concurrency"
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

# Review Phase R6: E2E Tests — Cross-Cutting

Write Playwright E2E tests for security and integrity concerns
that span all roles: auth enforcement, role guards, state
machine boundaries, rate limiting, and concurrency safety.

## Mission

Verify that the application correctly rejects unauthorized,
forbidden, and invalid requests across the full API surface.
These tests catch security gaps that role-specific tests miss.

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Branch**: `feature/code-review`
- **Prerequisite**: R1 complete
- **Test directory**: `apps/web/tests/e2e/cross-cutting/`

## Context to load

1. `docs/security-checklist.md` — security requirements
2. `docs/api-contract.md` — all endpoints with auth requirements
3. `apps/web/src/lib/guards.ts` — role enforcement logic
4. `apps/web/src/lib/rate-limiter.ts` — rate limit config

## Workflow

### Step 1 — Create test structure

Create `apps/web/tests/e2e/cross-cutting/`:

- `auth-enforcement.spec.ts` — R6.1
- `role-enforcement.spec.ts` — R6.2
- `archived-state.spec.ts` — R6.3
- `rate-limiting.spec.ts` — R6.4
- `concurrency.spec.ts` — R6.5

### Step 2 — Auth enforcement (R6.1)

Test every API endpoint WITHOUT auth headers:

1. `GET /` → assert 200 (public)
2. `GET /api/health` → assert 200 (public)
3. `GET /api/leaderboard/[id]` → assert 200 (public-readable)
4. `GET /api/hackathons` → assert 401
5. `POST /api/hackathons` → assert 401
6. `POST /api/submissions` → assert 401
7. `GET /api/me` → assert 401
8. (Cover all protected routes systematically)

### Step 3 — Role enforcement (R6.2)

Test endpoints with wrong role:

1. Hacker → `POST /api/hackathons` → assert 403
2. Hacker → `POST /api/roles` → assert 403
3. Hacker → `GET /api/audit/[id]` → assert 403
4. Hacker → `PATCH /api/scores/[id]` → assert 403
5. Coach → `POST /api/hackathons` → assert 403
6. Coach → `GET /api/config/[key]` → assert 403
7. Coach → `PATCH /api/hackathons/[id]` → assert 403

### Step 4 — Archived state (R6.3)

1. Create and archive a hackathon (via admin API)
2. Attempt write operations on archived hackathon:
   - `POST /api/submissions` → assert 409
   - `POST /api/scores` → assert 409
   - `POST /api/hackathons/[id]/assign-teams` → assert 409
   - `PATCH /api/challenges/[id]` → assert 409
3. Verify read operations still work:
   - `GET /api/hackathons/[id]` → assert 200
   - `GET /api/leaderboard/[id]` → assert 200

### Step 5 — Rate limiting edge cases (R6.4)

1. Join endpoint: verify 5/min/IP enforcement
2. Verify rate limit response includes `Retry-After` header
   (or appropriate 429 body)
3. Verify invalid event codes still count against rate limit
4. Verify rate limit is per-IP (different simulated IPs
   are independent)

### Step 6 — Concurrency safety (R6.5)

1. Two coaches submit reviews for the SAME submission
   simultaneously (parallel API requests)
2. Assert one succeeds and one gets a conflict (409) or
   both succeed without data corruption
3. Verify final score record is consistent (no partial writes)
4. Verify audit trail records both attempts

## Gate

```bash
npx playwright test tests/e2e/cross-cutting/ --reporter=list
```

All tests pass. Update tracker R6.1-R6.5.

## After completing

Update tracker, set next target to R7.1 (Component Tests).
