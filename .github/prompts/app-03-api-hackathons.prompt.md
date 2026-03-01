---
description: "Implement hackathon CRUD, event code generation, hacker onboarding, and team assignment API routes"
agent: 11-App Builder
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

# Build Hackathon & Team Management API

Implement the core API routes for hackathon lifecycle, event
code generation, hacker self-service onboarding via event code,
and Fisher-Yates team assignment.

## Mission

Create all Phase 6 API endpoints so that an admin can create a
hackathon, hackers can join via event code, and teams are
assigned automatically using Fisher-Yates shuffle.

## Scope & Preconditions

- **Prerequisite**: app-02-auth completed — auth middleware,
  role guards, Zod validation, and rate limiter are working
- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — read `Phase 6: Core API — Hackathon & Team Management`
- **API contract**: `packages/shared/types/api-contract.ts`
  — `HackathonsAPI`, `TeamsAPI`, `JoinAPI` namespaces
- **Data model**: `docs/data-model.md` — `hackathons`, `teams`,
  `hackers` tables
- **Skills**: Read `hackops-domain` (Fisher-Yates, event codes),
  `zod-validation`

## Workflow

### Step 1 — Read context

1. `packages/shared/types/api-contract.ts` — hackathon,
   team, join types
2. `docs/data-model.md` — `hackathons`, `teams`, `hackers`
   table schemas and primary keys
3. `docs/api-contract.md` — endpoint reference for Phase 6
4. `.github/skills/hackops-domain/SKILL.md` — Fisher-Yates
   algorithm, event code rules, team balance rules

### Step 2 — Hackathon CRUD

Create API route handlers:

- `POST /api/hackathons` (Admin) — create hackathon with
  auto-generated 4-digit event code (1000–9999). Validate
  uniqueness against active hackathons; regenerate on
  collision. Store as plaintext.
- `GET /api/hackathons` (Admin, Coach) — list hackathons
  with pagination. Filter by status.
- `GET /api/hackathons/:id` (Admin, Coach) — single
  hackathon detail.
- `PATCH /api/hackathons/:id` (Admin) — update lifecycle
  state: `draft → active → archived`. Enforce valid
  transitions only.

File structure:

```text
apps/web/src/app/api/hackathons/route.ts        # POST, GET
apps/web/src/app/api/hackathons/[id]/route.ts   # GET, PATCH
```

### Step 3 — Hacker onboarding (Join)

- `POST /api/join` (authenticated, no role required) —
  accept `{ eventCode }` + caller's GitHub identity.
  Verify code matches an active hackathon. Rate-limit to
  5 attempts/min/IP. Create hacker record in `hackers`
  table. Auto-assign `hacker` role in `roles` table.

File: `apps/web/src/app/api/join/route.ts`

### Step 4 — Team assignment

- `POST /api/hackathons/:id/assign-teams` (Admin) —
  Fisher-Yates shuffle all unassigned hackers for this
  hackathon. Distribute into teams of `teamSize`
  (from hackathon record). Use `ceil(teamSize/2)` minimum
  per team to prevent runt teams. Store in `teams` table
  with embedded members array.

File: `apps/web/src/app/api/hackathons/[id]/assign-teams/route.ts`

### Step 5 — Manual reassignment

- `PATCH /api/teams/:id/reassign` (Admin) — move a hacker
  from one team to another. Validate both teams belong to
  the same hackathon.

File: `apps/web/src/app/api/teams/[id]/reassign/route.ts`

### Step 6 — Team listing

- `GET /api/teams` (Admin, Coach) — list teams scoped to
  `hackathonId` query parameter. Include member details.

File: `apps/web/src/app/api/teams/route.ts`

### Step 7 — Zod schemas

Create Zod schemas in `apps/web/src/lib/validation/` for all
request bodies in this phase. Use the `withValidation` wrapper
from app-02.

### Step 8 — Validate

1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. Write endpoint tests for:
   - Hackathon create (happy path, missing fields)
   - Event code uniqueness
   - Join with valid/invalid event code
   - Join rate limiting (6th request returns 429)
   - Team assignment (shuffle + balance)
   - Manual reassignment (same hackathon, cross-hackathon rejection)
   - Role guard enforcement on each endpoint

## Output Expectations

- Route handlers under `apps/web/src/app/api/`
- Zod schemas in `apps/web/src/lib/validation/`
- All endpoints match `api-contract.ts` type signatures

## Exit Criteria

- `tsc --noEmit` passes
- Endpoint tests pass
- `app-logic-challenger-subagent` (focus: `api-contract`)
  — contract conformance verified

## Quality Assurance

- [ ] Event code is plaintext, 4 digits, unique among active hackathons
- [ ] Join rate-limited to 5/min/IP
- [ ] Fisher-Yates shuffle is unbiased (Knuth variant)
- [ ] Team balance enforces `ceil(teamSize/2)` minimum
- [ ] All endpoints use role guards matching api-contract.md
- [ ] Zod schemas validate at boundaries
- [ ] Hackathon state transitions enforced (`draft → active → archived`)
- [ ] Response shapes match `ApiResponse<T>` wrapper
