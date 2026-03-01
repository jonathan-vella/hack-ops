---
description: "Implement rubric CRUD, submission endpoint, review queue, approve/reject, and score override API routes"
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

# Build Scoring Engine & Submission Workflow API

Implement the rubric system, submission pipeline, review queue,
approve/reject flow, and score override — the scoring engine
that powers the entire hackathon evaluation workflow.

## Mission

Create all Phase 7 API endpoints so that admins can manage
rubrics, hackers submit evidence, coaches review and score
submissions, and approved scores feed the leaderboard.

## Scope & Preconditions

- **Prerequisite**: app-03-api-hackathons completed — hackathon
  and team routes work, hacker records exist
- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — read `Phase 7: Scoring Engine & Submission Workflow`
- **API contract**: `packages/shared/types/api-contract.ts`
  — `RubricsAPI`, `SubmissionsAPI`, `ScoresAPI` namespaces
- **Data model**: `docs/data-model.md` — `rubrics`, `submissions`,
  `scores` containers with partition keys
- **Skills**: Read `hackops-domain` (pointer+versioned rubric
  pattern, scoring authority), `cosmos-db-sdk` (atomic ops)

## Workflow

### Step 1 — Read context

1. `packages/shared/types/api-contract.ts` — rubric,
   submission, score types
2. `docs/data-model.md` — `rubrics`, `submissions`, `scores`
   containers
3. `docs/api-contract.md` — Phase 7 endpoints
4. `.github/skills/hackops-domain/SKILL.md` — pointer+version
   rubric pattern, scoring rules

### Step 2 — Rubric CRUD

Create API route handlers:

- `POST /api/rubrics` (Admin) — create rubric version with
  Markdown-driven categories (`RubricCategory[]`). Store as
  versioned document (e.g. `rubric-v1`, `rubric-v2`).
- `GET /api/rubrics` (Admin, Coach) — list rubric versions.
  Include which is currently active.
- `GET /api/rubrics/:id` (Admin, Coach) — single rubric detail.
- `PATCH /api/rubrics/:id/activate` (Admin) — activate a rubric
  version using the **pointer + versioned docs** pattern: update
  the pointer document to reference this version. Atomic swap —
  consumers read pointer first, then fetch the referenced version.

File structure:

```text
apps/web/src/app/api/rubrics/route.ts              # POST, GET
apps/web/src/app/api/rubrics/[id]/route.ts          # GET
apps/web/src/app/api/rubrics/[id]/activate/route.ts # PATCH
```

### Step 3 — Submission endpoint

- `POST /api/submissions` (Hacker) — accept form data OR JSON
  upload. Validate against active rubric schema via Zod. Hackers
  can only submit for their own team (403 otherwise).
  Submission enters `pending` state. Unlimited resubmissions
  allowed — scores only entered by Coach on review.

File: `apps/web/src/app/api/submissions/route.ts`

### Step 4 — Review queue

- `GET /api/submissions` (Admin, Coach) — list submissions
  filtered by `status` and `hackathonId`. Hackathon-scoped:
  coaches only see submissions for their assigned events.
  Include team info, challenge info, and submitted evidence.

### Step 5 — Approve/Reject

- `PATCH /api/submissions/:id` (Admin, Coach) — set status to
  `approved` or `rejected`. Coach enters rubric scores
  (`CategoryScore[]`) on approval.
  - On approval: copy validated scores to `scores` container
    (immutable record). Write audit fields (`reviewedBy`,
    `reviewedAt`, `reviewReason`).
  - On rejection: write `rejectedBy`, `rejectedAt`,
    `rejectedReason`.
  - Use the audit logger from app-02.

File: `apps/web/src/app/api/submissions/[id]/route.ts`

### Step 6 — Score override

- `PATCH /api/scores/:id/override` (Admin only) — modify an
  approved score with mandatory reason. Audit logged. Original
  score preserved in audit trail.

File: `apps/web/src/app/api/scores/[id]/override/route.ts`

### Step 7 — Zod schemas

Create Zod schemas for all request bodies. Key validations:

- Rubric categories: non-empty array, positive `maxScore`
- Submission: team ownership verification
- Score override: mandatory `reason` field
- Category scores: each `score` <= category `maxScore`

### Step 8 — Validate

1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. Write endpoint tests for:
   - Rubric create and activate (pointer swap)
   - Submission by correct team member (allowed)
   - Submission by wrong team (403)
   - Approve with scores → scores container write
   - Reject with reason → audit logged
   - Score override (admin only, with reason)
   - Concurrent rubric reads during pointer swap

## Output Expectations

- Route handlers under `apps/web/src/app/api/`
- Zod schemas in `apps/web/src/lib/validation/`
- All endpoints match `api-contract.ts` type signatures

## Exit Criteria

- `tsc --noEmit` passes
- Endpoint tests pass
- `app-logic-challenger-subagent` (focus: `business-rules`)
  — scoring correctness verified

## Quality Assurance

- [ ] Pointer + versioned docs pattern implemented for rubrics
- [ ] Only one rubric active at a time (atomic swap)
- [ ] Hackers can only submit for their own team
- [ ] Approved scores are immutable in `scores` container
- [ ] Score override preserves original score in audit trail
- [ ] Coach review queue is hackathon-scoped
- [ ] All reviewer actions audit-logged (who, when, why)
- [ ] Category scores validated against rubric `maxScore`
