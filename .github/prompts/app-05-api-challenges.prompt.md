---
description: 'Implement challenge CRUD, progression tracking, gate middleware, and auto-unlock trigger'
agent: 12-API Builder
tools:
  [
    'read/readFile',
    'edit/editFiles',
    'edit/createFile',
    'edit/createDirectory',
    'search/textSearch',
    'search/fileSearch',
    'search/usages',
    'execute/runInTerminal',
    'execute/runTests',
  ]
---

# Build Challenge Progression & Gating API

Implement challenge definitions, sequential progression
tracking, gate middleware that prevents skipping challenges,
and the auto-unlock trigger on submission approval.

## Mission

Create all Phase 9 API endpoints so that challenges unlock
sequentially per team, submissions for locked challenges are
rejected, and approving Challenge N automatically unlocks
Challenge N+1.

## Scope & Preconditions

- **Prerequisite**: app-04-api-scoring completed — submissions
  and scoring pipeline work end-to-end
- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — read `Phase 9: Challenge Progression & Gating`
- **API contract**: `packages/shared/types/api-contract.ts`
  — `ChallengesAPI`, `ProgressionAPI` namespaces
- **Data model**: `docs/data-model.md` — `challenges` and
  `progression` containers
- **Skills**: Read `hackops-domain` (gating rules, auto-unlock),
  `cosmos-db-sdk` (conditional writes)

## Workflow

### Step 1 — Read context

1. `packages/shared/types/api-contract.ts` — challenge and
   progression types
2. `docs/data-model.md` — `challenges` (partition: `hackathonId`)
   and `progression` (partition: `teamId`) containers
3. `docs/api-contract.md` — Phase 9 endpoints
4. `.github/skills/hackops-domain/SKILL.md` — gating invariants

### Step 2 — Challenge CRUD

Create API route handlers:

- `POST /api/challenges` (Admin) — create ordered challenges
  for a hackathon. Each has `order`, `title`, `description`
  (Markdown), `maxScore`. Order must be sequential (1, 2, 3…).
- `GET /api/challenges` (any authenticated) — list challenges
  for a hackathon, sorted by order. Include lock/unlock state
  per calling team.
- `GET /api/challenges/:id` (any authenticated) — single
  challenge detail.
- `PATCH /api/challenges/:id` (Admin) — update challenge
  properties (not order — that requires delete+recreate).

File structure:

```text
apps/web/src/app/api/challenges/route.ts         # POST, GET
apps/web/src/app/api/challenges/[id]/route.ts    # GET, PATCH
```

### Step 3 — Progression tracking

- `GET /api/progression` (any authenticated) — return the
  team's current progression state: `currentChallenge`,
  `unlockedAt[]` timestamps for each unlocked challenge.
  Query by `teamId` and `hackathonId`.

File: `apps/web/src/app/api/progression/route.ts`

**Initialization**: When a hackathon transitions to `active`,
create progression records for each team with
`currentChallenge: 1` and Challenge 1 auto-unlocked.

### Step 4 — Gate middleware

Create `apps/web/src/lib/challenge-gate.ts`:

1. On submission, check the team's `progression` record
2. If the submission's challenge `order` > `currentChallenge`,
   return 403: "Challenge is locked"
3. This integrates with the submission endpoint from app-04

Update `POST /api/submissions` to call the gate check
before accepting.

### Step 5 — Auto-unlock trigger

Update the submission approval flow (from app-04):

1. On `approved` status for a submission:
   - Read the team's progression
   - If the approved challenge matches `currentChallenge`,
     increment `currentChallenge` by 1
   - Write the unlock timestamp to `unlockedAt` array
2. Use conditional writes (ETag) to prevent race conditions

### Step 6 — Zod schemas

Create Zod schemas for:

- Challenge create: `order` (positive int), `title`, `description`
- Progression query: `teamId`, `hackathonId`
- Gate check: validate challenge order against progression

### Step 7 — Validate

1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. Write endpoint tests for:
   - Challenge create (ordered, duplicates rejected)
   - Progression initialization on hackathon launch
   - Submit for unlocked challenge (allowed)
   - Submit for locked challenge (403)
   - Approval triggers auto-unlock of next challenge
   - Concurrent approval race condition handling

## Output Expectations

- Route handlers under `apps/web/src/app/api/`
- Gate middleware at `apps/web/src/lib/challenge-gate.ts`
- Updated submission route with gate check
- Zod schemas in `apps/web/src/lib/validation/`

## Exit Criteria

- `tsc --noEmit` passes
- Endpoint tests pass
- `app-logic-challenger-subagent` (focus: `business-rules`)
  — gating correctness verified, zero false unlocks

## Quality Assurance

- [ ] Challenge order is sequential and enforced
- [ ] Challenge 1 auto-unlocked on hackathon launch
- [ ] Locked challenges return 403 on submission
- [ ] Approval of Challenge N unlocks Challenge N+1
- [ ] Progression uses conditional writes (ETag) for concurrency
- [ ] No false unlocks possible (zero tolerance)
- [ ] Tiebreaker: earliest last-approval timestamp wins
- [ ] Response shapes match `ApiResponse<T>` wrapper
