---
description: 'Generate the HackOps API contract — TypeScript types and Markdown reference — from the technical plan. Output: packages/shared/types/api-contract.ts + docs/api-contract.md'
agent: agent
tools:
  [
    'read/readFile',
    'edit/editFiles',
    'edit/createFile',
    'search/textSearch',
    'search/fileSearch',
    'execute/runInTerminal',
  ]
---

# Generate HackOps API Contract

Generate the TypeScript API contract types and a human-readable reference document
from the HackOps technical plan.

## Mission

Read the technical plan and produce two outputs:

1. `packages/shared/types/api-contract.ts` — TypeScript interfaces (source of truth)
2. `docs/api-contract.md` — human-readable endpoint reference

The TypeScript types are imported by BOTH route handlers and frontend code.
Type errors at compile time catch contract drift (Golden Principle 10).

## Scope & Preconditions

- Source: `.github/prompts/plan-hackOps.prompt.md` — read sections:
  - `Application Summary` (API surface: ~16 REST endpoints)
  - `Key Invariants` (auth and role rules)
  - `Phase 6` — Hackathon & Team Management endpoints
  - `Phase 7` — Scoring Engine & Submission endpoints
  - `Phase 8` — Leaderboard endpoint
  - `Phase 9` — Challenge Progression endpoints
  - `Phase 10` — Admin & Operational endpoints
  - `Phase 5` — authentication middleware (Easy Auth header contract)
- Non-negotiable: `/api/health` is unauthenticated; all others require GitHub OAuth

## Workflow

### Step 1 — Read source material

Read `.github/prompts/plan-hackOps.prompt.md` in full. Extract every endpoint
mentioned across Phases 5-10 with:
- HTTP method and path
- Required role (Admin / Coach / Hacker / none)
- Request body shape
- Response shape
- Possible error codes

Group endpoints into these API groups:

| Group        | Prefix               | Phase |
| ------------ | -------------------- | ----- |
| Health       | `/api/health`        | —     |
| Hackathons   | `/api/hackathons`    | 6     |
| Teams        | `/api/teams`         | 6     |
| Hackers      | `/api/hackers`       | 6     |
| Submissions  | `/api/submissions`   | 7     |
| Scores       | `/api/scores`        | 7     |
| Rubrics      | `/api/rubrics`       | 7     |
| Leaderboard  | `/api/leaderboard`   | 8     |
| Challenges   | `/api/challenges`    | 9     |
| Progression  | `/api/progression`   | 9     |
| Roles        | `/api/roles`         | 10    |
| Audit        | `/api/audit`         | 10    |
| Config       | `/api/config`        | 10    |

### Step 2 — Define shared types

Before endpoint-specific types, define the shared building blocks:

```typescript
// Common response wrapper
type ApiResponse<T> = { data: T; ok: true } | { error: string; ok: false };

// Role enum matching Easy Auth claims
type UserRole = 'admin' | 'coach' | 'hacker';

// Pagination
type PageRequest = { continuationToken?: string; pageSize?: number };
type PageResponse<T> = { items: T[]; continuationToken?: string | null };
```

Derive all other shared types (e.g., `HackathonStatus`, `SubmissionState`) from
the plan's invariants and phase descriptions.

### Step 3 — Write TypeScript contract

For each API group, write a TypeScript namespace containing:
- Request type(s)
- Response type(s)
- Path constants

Example structure:

```typescript
export namespace HackathonsAPI {
  export interface CreateRequest { name: string; eventCode: string; }
  export interface HackathonSummary { id: string; name: string; status: HackathonStatus; teamCount: number; }
  export const PATHS = { base: '/api/hackathons', byId: (id: string) => `/api/hackathons/${id}` } as const;
}
```

Ensure:
- All types are `export`ed
- Event codes are `string` only (never expose the hash mechanism in types)
- Submission states reflect the staging/approval invariant: `'pending' | 'approved' | 'rejected'`
- Score types enforce rubric-driven structure (no free-form numeric fields)

### Step 4 — Create the TypeScript file

1. Create directory `packages/shared/types/` if it does not exist.
2. Write `packages/shared/types/api-contract.ts` with the following JSDoc header:

```typescript
/**
 * HackOps API Contract
 *
 * Source of truth for all API request/response shapes.
 * Import from this file in route handlers and frontend components.
 * Do NOT duplicate these types elsewhere — let the compiler enforce the contract.
 *
 * Generated from: .github/prompts/plan-hackOps.prompt.md
 */
```

Run the type check below and fix any errors before proceeding:

```bash
npx tsc --noEmit --strict packages/shared/types/api-contract.ts 2>&1 || true
```

### Step 5 — Write Markdown reference

For each endpoint, write a reference block in `docs/api-contract.md`:

```markdown
### POST /api/submissions

| Field        | Value                                      |
| ------------ | ------------------------------------------ |
| Auth         | Required (GitHub OAuth via Easy Auth)      |
| Role         | Hacker                                     |
| Rate limit   | 10 req/min per team                        |

**Request body**: `SubmissionsAPI.CreateRequest`

**Response 201**: `ApiResponse<SubmissionsAPI.SubmissionRecord>`

**Error responses**:
- `400` — Invalid rubric field or missing required answer
- `403` — Cross-team submission attempt
- `409` — Duplicate submission for same challenge
```

### Step 6 — Create docs/api-contract.md

Write the complete reference to `docs/api-contract.md` with:
- Intro section explaining the TypeScript-first contract approach
- Easy Auth header parsing section (how role is determined from headers)
- All endpoint reference blocks grouped by API group
- Error code catalogue at the end

## Output Expectations

- `packages/shared/types/api-contract.ts` — valid TypeScript, no type errors
- `docs/api-contract.md` — every endpoint documented
- All ~16 plan endpoints accounted for (plus `/api/health`)
- TypeScript file has a JSDoc header linking back to the plan

## Quality Assurance

- [ ] `packages/shared/types/api-contract.ts` exists and is valid TypeScript
- [ ] `docs/api-contract.md` exists
- [ ] Every API group from Step 1 has at least one endpoint documented
- [ ] `ApiResponse<T>` wrapper used consistently
- [ ] `SubmissionState` type enforces `'pending' | 'approved' | 'rejected'`
- [ ] `/api/health` documented as unauthenticated
- [ ] `npm run lint:md` passes
