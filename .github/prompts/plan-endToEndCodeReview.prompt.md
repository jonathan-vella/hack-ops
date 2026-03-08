# Plan: End-to-End Code Review + E2E Testing

**TL;DR**: A 6-phase code review of the HackOps Next.js app covering static analysis, Context7-verified library usage, Playwright E2E tests against a local SQL container, React component tests, and 4 independent adversarial passes (Sonnet 4.6 + GPT 5.4, each running security AND logic challenges). Excludes Bicep/infra. All findings go to a consolidated markdown report in `agent-output/hackops/`.

---

## Phase 1: Foundation Setup (blocks all other phases)

1. **Install Playwright** — Add `@playwright/test` to devDependencies, create `playwright.config.ts` with projects for Chromium + Firefox + Mobile Chrome
2. **Add Docker Compose for local SQL** — Create `docker-compose.test.yml` with `mcr.microsoft.com/mssql/server:2022-latest`, mount `apps/web/src/lib/schema.sql` as init script, expose `localhost:1433`
3. **Create E2E test fixtures** — Extend existing `apps/web/tests/fixtures/index.ts` with SQL seed scripts for all 11 tables (hackathons, teams, hackers, challenges, submissions, scores, roles, rubrics, config, progressions, audit_log)
4. **Create test helper for auth simulation** — Playwright helper that injects `x-ms-client-principal` headers for admin/coach/hacker personas (mirrors the dev bypass in `apps/web/src/lib/auth.ts`)
5. **Add npm scripts** — `test:e2e`, `test:components`, `test:e2e:headed` (debug mode), `test:review` (runs full review suite)

## Phase 2: Context7-Verified Library Audit (parallel with Phase 3)

6. **Next.js 15 App Router patterns** — Use Context7 MCP to resolve the Next.js library ID and verify: `NextResponse.json()` signatures, route handler export conventions, `cookies()`/`headers()` async APIs, middleware patterns, `"use client"` boundaries, `layout.tsx`/`page.tsx` conventions across all ~30 route files in `apps/web/src/app/`
7. **Zod 4 schema validation** — Use Context7 to verify all Zod usage in `apps/web/src/lib/validation/` — `safeParse` result shapes, `z.coerce` patterns, error formatting, schema composition (`z.object`, `z.enum`, `z.array`)
8. **mssql package patterns** — Verify connection pool config, parameterized query syntax (`sql.NVarChar`, `sql.Int`), transaction handling, and Entra ID token refresh in `apps/web/src/lib/sql.ts`
9. **React 19 + Testing Library** — Verify hook patterns (`use-auth.ts`, `use-fetch.ts`), client component patterns, and Testing Library query/assertion APIs
10. **Tailwind CSS v4 + shadcn/ui** — Verify import patterns, component composition, and theming in `apps/web/src/components/`
11. **Vitest 4 APIs** — Verify mock patterns (`vi.mock`, `vi.stubEnv`, `vi.importActual`), config schema, and coverage provider setup

## Phase 3: Playwright E2E Tests — All User Flows (parallel with Phase 2)

### Admin Journey

12. Create hackathon (draft) → verify event code generated
13. Add challenges with rubrics → verify ordering
14. Activate hackathon → verify state transition, `launchedAt` set
15. Assign teams via Fisher-Yates → verify balanced distribution + runt-team merge
16. View audit log → verify immutable trail
17. Override score → verify audit entry with reason
18. Manage roles (assign coach, verify primary admin protection)
19. Archive hackathon → verify leaderboard frozen, operations rejected

### Coach Journey

20. View assigned team submissions
21. Review submission → approve with rubric scores → verify score calculation
22. Review submission → reject with reason → verify state change
23. Verify challenge gating (N+1 locked until N approved)
24. View leaderboard → verify ranking + tiebreaker logic

### Hacker Journey

25. Join via event code → verify rate limiting (5/min/IP)
26. View dashboard → verify challenge list + progression bar
27. Submit evidence for Challenge 1 → verify pending state
28. Attempt Challenge 2 before 1 approved → verify gating (403)
29. After approval, submit Challenge 2 → verify progression unlocked
30. View leaderboard position → verify grade badge (A/B/C/D)

### Cross-Cutting

31. Unauthenticated access → verify 401 on protected routes, public access to `/`, `/api/health`
32. Wrong role access → verify 403 (hacker hitting admin endpoints)
33. Expired/archived hackathon → verify operations rejected (409)
34. Invalid event code join → verify error + rate limit enforcement
35. Concurrent coach reviews on same submission → verify no data corruption

## Phase 4: React Component Tests (parallel with Phase 3)

36. `SubmissionForm` — file attachment, validation, submit flow
37. `RubricForm` — add/remove categories, max score enforcement
38. `LeaderboardTable` — sorting, grade badges, empty state
39. `HackathonPicker` — selection, filtering, role-based visibility
40. `ChallengeCard` — locked/unlocked states, progression display
41. `ReviewCard` — approve/reject actions, score input validation
42. `Navbar` — role-based menu items, auth state handling
43. `AdminSidebar` — active route highlighting, navigation
44. `ConfirmDialog` — confirmation flow, cancel behavior
45. `PaginationBar` — page navigation, boundary conditions

## Phase 5: Adversarial Reviews — 4 Independent Passes

Each pass runs independently. Pass outputs are consolidated into one report per model.

### Sonnet 4.6 — Security Challenge (Pass 1 of 4)

46. Auth bypass analysis — Easy Auth header spoofing, dev bypass leaking to production, session validation gaps
47. IDOR hunting — All `[id]` route params checked for ownership/scope enforcement
48. Injection surface — SQL parameterization audit across all `query()`/`execute()` calls, XSS in React components
49. Data exposure — Error messages leaking internals, leaderboard exposing submission details, role info in client bundles

### Sonnet 4.6 — Logic Challenge (Pass 2 of 4)

50. API contract drift — Response shapes vs `@hackops/shared` types, status codes vs `docs/api-contract.md`
51. Business rule violations — Challenge gating, scoring invariants, team assignment, tiebreaker logic
52. Data model integrity — FK enforcement, orphan prevention, cascade rules vs `docs/data-model.md`
53. Edge cases — Empty arrays, concurrent operations, archived state enforcement, boundary values

### GPT 5.4 — Security Challenge (Pass 3 of 4)

54. Same scope as Pass 1 (independent findings for cross-validation)

### GPT 5.4 — Logic Challenge (Pass 4 of 4)

55. Same scope as Pass 2 (independent findings for cross-validation)

### Cross-Model Deduplication

56. Merge findings from all 4 passes — deduplicate, reconcile severity disagreements, flag findings only one model caught

## Phase 6: Report Generation + Gap Analysis

57. **Generate consolidated review report** — `agent-output/hackops/code-review-report.md` with sections: Executive Summary, Context7 Findings, E2E Test Results, Component Test Coverage, Adversarial Findings (by severity), Coverage Gap Analysis, Recommendations
58. **Coverage gap analysis** — Compare existing 18 unit tests + new E2E/component tests against `docs/testing-strategy.md` targets; identify untested paths
59. **Dead code scan** — Identify unused exports, unreachable branches, orphaned components
60. **Dependency security audit** — `npm audit` + check for deprecated packages against `package.json` and `apps/web/package.json`

---

## Relevant Files

- `apps/web/src/app/api/` — All 20+ API route handlers (review target)
- `apps/web/src/lib/` — Core business logic: auth, guards, roles, audit, leaderboard, challenge-gate, rate-limiter, sql
- `apps/web/src/lib/validation/` — 12 Zod schemas + middleware (Context7 verification target)
- `apps/web/src/lib/sql.ts` — SQL connection pool with Entra ID (security-critical)
- `apps/web/src/lib/schema.sql` — DDL for all 11 tables (E2E seed source)
- `apps/web/src/components/` — 20+ React components (component test targets)
- `apps/web/vitest.config.ts` — Existing test configuration (extend for components)
- `apps/web/tests/fixtures/index.ts` — Existing test fixtures (extend for E2E)
- `packages/shared/` — Shared types (`@hackops/shared`) for contract validation
- `.github/agents/_subagents/app-security-challenger-subagent.agent.md` — Security adversarial definition
- `.github/agents/_subagents/app-logic-challenger-subagent.agent.md` — Logic adversarial definition
- `docs/api-contract.md` — API contract (adversarial reference)
- `docs/data-model.md` — Data model (adversarial reference)
- `docs/security-checklist.md` — Security requirements (adversarial reference)
- `.github/skills/hackops-domain/SKILL.md` — Business rules (adversarial reference)

## Verification

1. `npx playwright test --reporter=html` — All E2E tests pass across Chromium + Firefox + Mobile Chrome
2. `npm test -- --coverage` — Unit + component tests pass with lines >= 80%, branches >= 80%
3. `npx tsc --noEmit` — Zero TypeScript errors after any code changes
4. `npm run lint` — Zero ESLint errors
5. `npm run validate` — All repo validators pass
6. `npm audit --audit-level=moderate` — No moderate+ vulnerabilities
7. Manual review of `agent-output/hackops/code-review-report.md` — all `critical` and `must_fix` findings have resolution notes
8. Cross-model finding comparison — any finding flagged by only one model gets manual triage

## Decisions

- **Playwright over Cypress** — Playwright has native multi-browser support, better Next.js integration, built-in auto-waiting, and faster parallel execution. Microsoft-maintained, aligns with the Azure stack.
- **Local SQL container over deployed DB** — Repeatable, isolated, no network dependency, safe to seed/wipe. Uses the same `schema.sql` as production.
- **4 adversarial passes (not 2)** — Each model runs both security AND logic independently. Cross-validation catches model blind spots — a finding caught by only one model gets elevated for manual review.
- **Consolidated report over GitHub Issues** — Single document for review session, avoids premature issue noise. Issues can be created post-review for accepted findings.
- **Bicep excluded** — Infrastructure is deployed; only app code (`apps/web/`, `packages/shared/`) in scope.
- **Context7 integrated into review** — Not a separate phase but embedded in Phase 2; every library pattern is verified against live docs before the review proceeds.

## Additional Items (beyond original request)

1. **React component tests** — 10 key interactive components with Testing Library
2. **Dead code scan** — Unused exports, unreachable branches
3. **Dependency security audit** — `npm audit` + deprecated package check
4. **Coverage gap analysis** — Map tested vs untested paths against the testing strategy doc
5. **Cross-model deduplication** — Reconcile findings across Sonnet 4.6 and GPT 5.4, flag model-specific blind spots
6. **Concurrent operation testing** — E2E tests for race conditions (concurrent coach reviews, simultaneous joins)
