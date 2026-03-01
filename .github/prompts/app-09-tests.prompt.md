---
description: "Write comprehensive unit tests, Zod schema tests, role guard tests, and business logic tests with >80% coverage"
agent: 12-App Tester
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "edit/createDirectory",
    "search/textSearch",
    "search/fileSearch",
    "search/usages",
    "execute/runInTerminal",
    "execute/runTests",
  ]
---

# Write Full Test Suite

Write comprehensive tests covering all API routes, Zod schema
validation, role guards, and business logic — achieving >80%
code coverage.

## Mission

Create a complete test suite using Vitest that covers unit
tests for all API routes, Zod schema validation, role guard
enforcement, and critical business logic (Fisher-Yates shuffle,
scoring aggregation, challenge gating). The test suite must
pass with >80% coverage before CI/CD setup.

## Scope & Preconditions

- **Prerequisite**: app-08-dashboard completed — all API routes
  and frontend pages exist
- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — `Phase 9` in the context of app testing
- **PRD**: `docs/prd.md` — acceptance criteria and success
  metrics to verify
- **API contract**: `packages/shared/types/api-contract.ts`
  — response shapes to assert against
- **Data model**: `docs/data-model.md` — sample documents
  for test fixtures
- **Skills**: Read `hackops-domain` (business rules to test),
  `zod-validation` (schema patterns)

## Workflow

### Step 1 — Read context

1. `docs/prd.md` — success metrics and acceptance criteria
2. `packages/shared/types/api-contract.ts` — all API types
3. `docs/data-model.md` — sample documents for fixtures
4. `docs/api-contract.md` — endpoint reference
5. `.github/skills/hackops-domain/SKILL.md` — business rules
6. Existing test files (if any) — avoid duplication

### Step 2 — Test infrastructure

Set up test infrastructure (if not already present):

1. Vitest config in `apps/web/vitest.config.ts`
2. Test setup file with SQL client mock
3. Test utility helpers in `apps/web/tests/helpers/`:
   - `mock-auth.ts` — simulate Easy Auth headers for each role
   - `mock-sql.ts` — mock SQL client query/execute operations
   - `fixtures.ts` — sample documents for all 10 tables
4. Configure coverage reporter (istanbul or v8)

### Step 3 — Auth tests

Create `apps/web/tests/lib/auth.test.ts`:

1. Easy Auth header parsing: valid header, malformed base64,
   missing header, empty claims
2. Dev bypass: reads `DEV_USER_*` env vars when
   `NODE_ENV=development`
3. Dev bypass disabled in production

### Step 4 — Role guard tests

Create `apps/web/tests/lib/guards.test.ts`:

1. `requireRole('admin')` — allows admin, blocks coach/hacker
2. `requireRole('admin', 'coach')` — allows both, blocks hacker
3. Missing role → 403
4. Missing auth → 401

### Step 5 — Rate limiter tests

Create `apps/web/tests/lib/rate-limiter.test.ts`:

1. Under limit → requests pass
2. At limit → next request returns 429
3. After reset window → requests pass again
4. Different IPs tracked independently
5. Join endpoint: 5/min limit

### Step 6 — Zod schema tests

Create `apps/web/tests/lib/validation/`:

1. Test each Zod schema with valid and invalid inputs
2. Verify error messages are structured and helpful
3. Test boundary cases: empty strings, negative numbers,
   missing required fields, extra fields stripped

### Step 7 — API route tests

Create test files for each domain:

**Hackathons** (`apps/web/tests/api/hackathons.test.ts`):

- Create hackathon (valid, missing fields, duplicate name)
- Event code generation (4 digits, unique)
- List with pagination
- State transitions (valid, invalid)
- Role enforcement (admin only for create/update)

**Join** (`apps/web/tests/api/join.test.ts`):

- Valid event code → hacker created
- Invalid event code → 404
- Rate limiting → 429 after 5 attempts

**Teams** (`apps/web/tests/api/teams.test.ts`):

- Fisher-Yates assignment (all hackers assigned)
- Team balance (`ceil(teamSize/2)` minimum)
- Manual reassignment (same hackathon required)

**Rubrics** (`apps/web/tests/api/rubrics.test.ts`):

- Create rubric version
- Activate (pointer swap)
- Only one active at a time

**Submissions** (`apps/web/tests/api/submissions.test.ts`):

- Submit for own team (allowed)
- Submit for other team (403)
- Submit for locked challenge (403)
- Approve → scores written
- Reject → audit logged

**Scores** (`apps/web/tests/api/scores.test.ts`):

- Score override (admin only, with reason)
- Override preserves original in audit

**Challenges** (`apps/web/tests/api/challenges.test.ts`):

- Create ordered challenges
- Progression initialization
- Auto-unlock on approval

**Admin** (`apps/web/tests/api/admin.test.ts`):

- Role invite and removal
- Primary admin protection
- Audit trail query with filters
- Config read/update

### Step 8 — Business logic tests

Create `apps/web/tests/business-logic/`:

**Fisher-Yates** (`shuffle.test.ts`):

- All elements present after shuffle
- Distribution is not always the same (randomness)
- Team sizing with remainder handling

**Scoring aggregation** (`scoring.test.ts`):

- Total score computation from category scores
- Grade badge assignment at thresholds
- Award badge computation
- Tiebreaker: earliest last-approval timestamp

**Challenge gating** (`gating.test.ts`):

- Challenge N+1 locked until N approved
- Auto-unlock increments correctly
- Concurrent approval handling

### Step 9 — Validate

1. `npm run test` — all tests pass
2. `npm run test -- --coverage` — verify >80% coverage
3. Review coverage report: identify uncovered critical paths
4. Fix any coverage gaps in auth, scoring, or gating logic

## Output Expectations

- Test files under `apps/web/tests/`
- Test helpers under `apps/web/tests/helpers/`
- Vitest config at `apps/web/vitest.config.ts`
- Coverage report generated

## Exit Criteria

- All tests pass
- Coverage >80% (lines and branches)
- `app-logic-challenger-subagent` (focus: `test-coverage`)
  — no critical test gaps identified

## Quality Assurance

- [ ] Vitest configured with coverage reporter
- [ ] Mock helpers created for auth and SQL client
- [ ] Test fixtures match `docs/data-model.md` samples
- [ ] All API routes have at least happy-path + error tests
- [ ] Role guards tested for each role combination
- [ ] Business logic edge cases covered
- [ ] Fisher-Yates shuffle correctness verified
- [ ] Scoring aggregation matches PRD thresholds
- [ ] Challenge gating has zero false-unlock tests
- [ ] Coverage >80% for lines and branches
