# Exec Plan: End-to-End Code Review

> Living session state tracker. Updated at the END of every session.
> Read this file FIRST at the start of any new session.

**Status**: Active
**Owner**: Human + Copilot agents
**Created**: 2026-03-08
**Blueprint**: `.github/prompts/plan-endToEndCodeReview.prompt.md`
**Report output**: `agent-output/hackops/code-review-report.md`

---

## Issue-to-Step Mapping

<!-- When a step completes, close the corresponding issue with a comment. -->

| Step                       | Issue | Status      |
| -------------------------- | ----- | ----------- |
| Epic: Code Review          | —     | Not started |
| R1: Foundation setup       | —     | Complete    |
| R2: Context7 library audit | —     | Complete    |
| R3: E2E admin journey      | —     | Not started |
| R4: E2E coach journey      | —     | Not started |
| R5: E2E hacker journey     | —     | Not started |
| R6: E2E cross-cutting      | —     | Not started |
| R7: Component tests        | —     | Not started |
| R8: Adversarial Sonnet 4.6 | —     | Not started |
| R9: Adversarial GPT 5.4    | —     | Not started |
| R10: Report + gap analysis | —     | Not started |

---

## Current Session Target

<!-- Update this at the START of each session -->

**Phase**: R3 (E2E Tests: Admin Journey)
**Step**: R3.1 — Create hackathon (draft) test
**Branch**: `feature/code-review`
**Goal**: Write E2E tests for admin journey (create hackathon, challenges, rubrics, activation, teams, audit, scores, archive).
**Blockers**: None

---

## Phase Progress

### Phase R1 — Foundation Setup

**Branch**: `feature/code-review`
**Prompt**: `review-01-foundation.prompt.md`
**Blocks**: All other phases (R2-R10)

- [x] R1.1: Install `@playwright/test` + create `playwright.config.ts`
      (Chromium, Firefox, Mobile Chrome projects)
- [x] R1.2: Create `docker-compose.test.yml` with SQL Server 2022
      container, mount `schema.sql` as init script
- [x] R1.3: Create E2E seed scripts in `apps/web/tests/fixtures/`
      for all 11 tables (hackathons, teams, hackers, challenges,
      submissions, scores, roles, rubrics, config, progressions, audit_log)
- [x] R1.4: Create Playwright auth helper
      (`apps/web/tests/helpers/auth-helper.ts`) — injects
      `x-ms-client-principal` headers for admin/coach/hacker personas
- [x] R1.5: Create Playwright global setup
      (`apps/web/tests/global-setup.ts`) — starts SQL container,
      runs seed, starts Next.js dev server
- [x] R1.6: Add npm scripts: `test:e2e`, `test:e2e:headed`,
      `test:components`, `test:review`
- [x] R1.7: Verify: `npx playwright test --list` shows 0 tests,
      no config errors

Gate: `npx playwright test --list` exits 0 (config valid).

### Phase R2 — Context7 Library Audit

**Branch**: `feature/code-review`
**Prompt**: `review-02-context7-audit.prompt.md`
**Parallel with**: R3-R7 (once R1 complete)

- [x] R2.1: Next.js 15 — resolve library, verify route handler
      patterns, `NextResponse.json()`, async `cookies()`/`headers()`,
      `"use client"` boundaries across ~30 route files
- [x] R2.2: Zod 4 — verify `safeParse`, `z.coerce`, error formatting,
      schema composition across 12 validation files
- [x] R2.3: mssql — verify pool config, parameterized query syntax,
      Entra ID token refresh in `lib/sql.ts`
- [x] R2.4: React 19 + Testing Library — verify hooks, client
      component patterns, query/assertion APIs
- [x] R2.5: Tailwind CSS v4 + shadcn/ui — verify imports,
      composition, theming in 20+ components
- [x] R2.6: Vitest 4 — verify mock patterns (`vi.mock`, `vi.stubEnv`,
      `vi.importActual`), config, coverage provider
- [x] R2.7: Write Context7 findings to
      `agent-output/hackops/review-context7-findings.md`

Gate: Findings doc created with per-library summary + actionable items.

### Phase R3 — E2E Tests: Admin Journey

**Branch**: `feature/code-review`
**Prompt**: `review-03-e2e-admin.prompt.md`
**Prerequisite**: R1 complete

- [ ] R3.1: Create hackathon (draft) → verify event code generated
      (`POST /api/hackathons`, assert 4-digit code)
- [ ] R3.2: Add challenges with rubrics → verify ordering
      (`POST /api/challenges`, `POST /api/rubrics`)
- [ ] R3.3: Activate hackathon → verify state transition,
      `launchedAt` timestamp set (`PATCH /api/hackathons/[id]`)
- [ ] R3.4: Assign teams via Fisher-Yates → verify balanced
      distribution + runt-team merge rule
      (`POST /api/hackathons/[id]/assign-teams`)
- [ ] R3.5: View audit log → verify immutable trail
      (`GET /api/audit/[hackathonId]`)
- [ ] R3.6: Override score → verify audit entry with reason
      (`PATCH /api/scores/[id]`)
- [ ] R3.7: Manage roles → assign coach, verify primary admin
      cannot be demoted (`POST /api/roles`, `GET /api/roles`)
- [ ] R3.8: Archive hackathon → verify leaderboard frozen,
      write operations rejected (`PATCH /api/hackathons/[id]`)

Gate: `npx playwright test tests/e2e/admin/` — all pass.

### Phase R4 — E2E Tests: Coach Journey

**Branch**: `feature/code-review`
**Prompt**: `review-04-e2e-coach.prompt.md`
**Prerequisite**: R3 complete (admin creates data for coach tests)

- [ ] R4.1: View assigned team submissions
      (`GET /api/submissions?hackathonId=...`)
- [ ] R4.2: Approve submission with rubric scores → verify score
      calculation (`PATCH /api/submissions/[id]`)
- [ ] R4.3: Reject submission with reason → verify state change
      to `rejected` (`PATCH /api/submissions/[id]`)
- [ ] R4.4: Verify challenge gating — N+1 locked until N approved
      (`GET /api/progression/[challengeId]`)
- [ ] R4.5: View leaderboard → verify ranking + tiebreaker logic
      (earliest `lastApprovalAt` wins)
      (`GET /api/leaderboard/[hackathonId]`)

Gate: `npx playwright test tests/e2e/coach/` — all pass.

### Phase R5 — E2E Tests: Hacker Journey

**Branch**: `feature/code-review`
**Prompt**: `review-05-e2e-hacker.prompt.md`
**Prerequisite**: R3 complete (hackathon must be active)

- [ ] R5.1: Join via event code → verify 200 response, hacker
      record created (`POST /api/join`)
- [ ] R5.2: Verify rate limiting — 6th join attempt within 60s
      returns 429 (`POST /api/join` x6)
- [ ] R5.3: View dashboard → verify challenge list + progression
      bar (dashboard page renders)
- [ ] R5.4: Submit evidence for Challenge 1 → verify pending state
      (`POST /api/submissions`)
- [ ] R5.5: Attempt Challenge 2 before 1 approved → verify gating
      returns 403 (`GET /api/progression/[challengeId]`)
- [ ] R5.6: After coach approval, submit Challenge 2 → verify
      progression unlocked
- [ ] R5.7: View leaderboard position → verify grade badge
      (A/B/C/D per quartile)

Gate: `npx playwright test tests/e2e/hacker/` — all pass.

### Phase R6 — E2E Tests: Cross-Cutting

**Branch**: `feature/code-review`
**Prompt**: `review-06-e2e-crosscutting.prompt.md`
**Prerequisite**: R1 complete

- [ ] R6.1: Unauthenticated access → verify 401 on all protected
      routes, 200 on `/` and `/api/health`
- [ ] R6.2: Wrong role access → verify 403 (hacker on admin
      endpoints, coach on admin-only endpoints)
- [ ] R6.3: Expired/archived hackathon → verify write operations
      return 409 Conflict
- [ ] R6.4: Invalid event code → verify 404 + rate limit enforcement
      on join endpoint
- [ ] R6.5: Concurrent coach reviews on same submission → verify
      no data corruption (parallel requests)

Gate: `npx playwright test tests/e2e/cross-cutting/` — all pass.

### Phase R7 — React Component Tests

**Branch**: `feature/code-review`
**Prompt**: `review-07-component-tests.prompt.md`
**Prerequisite**: R1 complete

- [ ] R7.1: Form components — `SubmissionForm` (attachments,
      validation, submit), `RubricForm` (add/remove categories,
      max score enforcement)
- [ ] R7.2: Data display — `LeaderboardTable` (sorting, grade
      badges, empty state), `ChallengeCard` (locked/unlocked,
      progression), `ReviewCard` (approve/reject, score input)
- [ ] R7.3: Navigation — `Navbar` (role-based menus, auth state),
      `AdminSidebar` (active route, navigation),
      `HackathonPicker` (selection, role visibility)
- [ ] R7.4: UX patterns — `ConfirmDialog` (confirmation flow,
      cancel), `PaginationBar` (page nav, boundaries)

Gate: `npm test -- --coverage` includes component coverage, lines >= 80%.

### Phase R8 — Adversarial Review: Sonnet 4.6

**Branch**: `feature/code-review`
**Prompt**: `review-08-adversarial-sonnet.prompt.md`
**Prerequisite**: R2 complete (Context7 fixes applied first)
**Model requirement**: Claude Sonnet 4.6 (select in Copilot model picker)

- [ ] R8.1: Security challenge — 3 passes (auth bypass, IDOR,
      injection/XSS, data exposure). Uses existing
      `app-security-challenger-subagent` framework.
- [ ] R8.2: Logic challenge — 4 passes (API contract drift,
      business rules, data model integrity, edge cases). Uses
      existing `app-logic-challenger-subagent` framework.
- [ ] R8.3: Write findings to
      `agent-output/hackops/review-adversarial-sonnet.json`

Gate: Findings JSON created with severity counts, 0 unreviewed items.

### Phase R9 — Adversarial Review: GPT 5.4

**Branch**: `feature/code-review`
**Prompt**: `review-09-adversarial-gpt.prompt.md`
**Prerequisite**: R2 complete (Context7 fixes applied first)
**Model requirement**: GPT 5.4 (select in Copilot model picker)

- [ ] R9.1: Security challenge — same scope as R8.1, independent
      findings for cross-validation
- [ ] R9.2: Logic challenge — same scope as R8.2, independent
      findings for cross-validation
- [ ] R9.3: Write findings to
      `agent-output/hackops/review-adversarial-gpt.json`

Gate: Findings JSON created with severity counts, 0 unreviewed items.

### Phase R10 — Report + Gap Analysis

**Branch**: `feature/code-review`
**Prompt**: `review-10-report.prompt.md`
**Prerequisite**: R2-R9 all complete

- [ ] R10.1: Cross-model deduplication — merge Sonnet + GPT
      findings, reconcile severity disagreements, flag
      single-model-only findings for manual triage
- [ ] R10.2: Coverage gap analysis — compare existing 18 unit
      tests + new E2E/component tests against
      `docs/testing-strategy.md` targets
- [ ] R10.3: Dead code scan — unused exports, unreachable
      branches, orphaned components
- [ ] R10.4: Dependency security audit — `npm audit` + deprecated
      package detection
- [ ] R10.5: Generate consolidated report →
      `agent-output/hackops/code-review-report.md`

Gate: Report created. All critical/must_fix findings have resolution notes.

---

## Dependency Graph

```text
R1 (Foundation) ──┬──→ R2 (Context7) ──┬──→ R8 (Sonnet) ──┐
                  │                     ├──→ R9 (GPT)    ──┤
                  ├──→ R3 (Admin E2E)   │                   │
                  ├──→ R4 (Coach E2E) ──┘                   ├──→ R10 (Report)
                  ├──→ R5 (Hacker E2E)                      │
                  ├──→ R6 (Cross-Cutting)                   │
                  └──→ R7 (Components) ─────────────────────┘
```

R3-R7 can run in parallel after R1. R8-R9 require R2 (Context7 fixes
applied first). R10 requires all previous phases.

---

## Decisions Made

<!-- Record major decisions during the review -->

| #   | Date       | Decision                        | Rationale                                             |
| --- | ---------- | ------------------------------- | ----------------------------------------------------- |
| 1   | 2026-03-08 | Playwright over Cypress         | Multi-browser, Next.js integration, MS-maintained     |
| 2   | 2026-03-08 | Local SQL container for E2E     | Repeatable, isolated, same schema.sql as prod         |
| 3   | 2026-03-08 | 4 adversarial passes (not 2)    | Cross-validation catches model blind spots            |
| 4   | 2026-03-08 | Consolidated report, not Issues | Single doc avoids premature noise; issues post-review |
| 5   | 2026-03-08 | Bicep excluded                  | Infra already deployed; app code only in scope        |

---

## Key Files

<!-- Phase-specific context loading. Only read what you need. -->

| Phase | Files to read                                                       |
| ----- | ------------------------------------------------------------------- |
| R1    | Tracker + blueprint + `apps/web/package.json` + `lib/schema.sql`    |
| R2    | Tracker + blueprint + all `src/lib/` + `src/lib/validation/`        |
| R3    | Tracker + `hackops-domain` skill + `api-contract.md` + R1 helpers   |
| R4    | Tracker + `hackops-domain` skill + R3 test files (shared setup)     |
| R5    | Tracker + `hackops-domain` skill + R3 test files (shared setup)     |
| R6    | Tracker + `security-checklist.md` + `api-contract.md`               |
| R7    | Tracker + `src/components/` full directory                          |
| R8    | Tracker + `app-security-challenger` + `app-logic-challenger`        |
| R9    | Tracker + `app-security-challenger` + `app-logic-challenger`        |
| R10   | Tracker + R2 findings + R8 findings + R9 findings + all E2E results |

---

## Session Log

<!-- Append one entry per session. Keep entries concise. -->

| #   | Date       | Phase/Step | What was done           | What's next   | Blockers |
| --- | ---------- | ---------- | ----------------------- | ------------- | -------- |
| 0   | 2026-03-08 | Planning   | Created plan, tracker,  | R1.1: Install | None     |
|     |            |            | 10 phase prompts, and   | Playwright    |          |
|     |            |            | session-resume prompt   |               |          |
| 1   | 2026-03-08 | R1.1-R1.7  | Installed Playwright    | R2.1: Next.js | None     |
|     |            |            | 1.58.2, config (3       | 15 route      |          |
|     |            |            | projects), Docker       | handler audit |          |
|     |            |            | Compose, seed/teardown, |               |          |
|     |            |            | auth helper, global     |               |          |
|     |            |            | setup, npm scripts.     |               |          |
|     |            |            | tsc clean, config valid |               |          |
| 2   | 2026-03-08 | R2.1-R2.7  | Context7 audit of all 6 | R3.1: Admin   | None     |
|     |            |            | libraries. 0 breaking,  | E2E journey   |          |
|     |            |            | 0 deprecated, 1 style   |               |          |
|     |            |            | (SQL auto-types). All   |               |          |
|     |            |            | patterns match latest   |               |          |
|     |            |            | docs. Findings written. |               |          |
|     |            |            | tsc clean, 178 tests OK |               |          |
