---
description: 'Implement role management, audit trail query, and config management admin API routes'
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

# Build Admin & Operational API Routes

Implement role management (invite/remove), audit trail query,
and config management endpoints — the final set of API routes
completing the backend.

## Mission

Create all Phase 10 API endpoints and trigger a full security
review and business logic review of the complete API surface.

## Scope & Preconditions

- **Prerequisite**: app-05-api-challenges completed — all
  domain API routes work (hackathons, scoring, challenges)
- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — read `Phase 10: Admin & Operational Features`
- **API contract**: `packages/shared/types/api-contract.ts`
  — `RolesAPI`, `AuditAPI`, `ConfigAPI` namespaces
- **Data model**: `docs/data-model.md` — `roles` and `config`
  containers
- **Skills**: Read `hackops-domain` (primary admin protection,
  role lifecycle), `cosmos-db-sdk`

## Workflow

### Step 1 — Read context

1. `packages/shared/types/api-contract.ts` — roles, audit,
   config types
2. `docs/data-model.md` — `roles` and `config` containers
3. `docs/api-contract.md` — Phase 10 endpoints
4. `.github/skills/hackops-domain/SKILL.md` — primary admin
   rules, role assignment rules

### Step 2 — Role management

Create API route handlers:

- `POST /api/roles/invite` (Admin) — invite a user by GitHub
  username, assign `coach` or `admin` role for a specific
  hackathon. Create record in `roles` container.
- `GET /api/roles` (Admin) — list role assignments for a
  hackathon. Include user details.
- `DELETE /api/roles/:id` (Admin) — remove a role assignment.
  **Cannot demote the primary admin** — look up primary admin
  in `config` container and reject if target matches.

File structure:

```text
apps/web/src/app/api/roles/route.ts          # POST (invite), GET
apps/web/src/app/api/roles/[id]/route.ts     # DELETE
```

### Step 3 — Audit trail query

- `GET /api/audit/:hackathonId` (Admin) — paginated, filterable
  log of all reviewer actions for a hackathon. Support filters:
  `action`, `userId`, date range. Return with continuation token
  pagination.

File: `apps/web/src/app/api/audit/[hackathonId]/route.ts`

### Step 4 — Config management

- `GET /api/config` (Admin) — return app-wide configuration
  from `config` container (leaderboard refresh interval,
  max team size, primary admin ID, etc.)
- `PATCH /api/config/:key` (Admin) — update a config value.
  Some keys are read-only (e.g. primary admin cannot be
  changed via this endpoint).

File structure:

```text
apps/web/src/app/api/config/route.ts         # GET
apps/web/src/app/api/config/[key]/route.ts   # PATCH
```

### Step 5 — Zod schemas

Create Zod schemas for:

- Role invite: GitHub username, role enum, hackathonId
- Audit query: filters (optional), pagination
- Config update: key-value with type coercion

### Step 6 — Full API validation

Run across the entire API surface:

1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. `npm run test` — all existing tests still pass
4. Write endpoint tests for:
   - Role invite (valid, duplicate, self-invite)
   - Primary admin deletion blocked (403)
   - Audit trail pagination
   - Config read/update (allowed keys, read-only rejection)

### Step 7 — Trigger adversarial reviews

After all tests pass, the following gates apply:

1. `app-review-subagent` — full code review of all API routes
2. `app-security-challenger-subagent` (focus: `full`) — full
   security review: auth bypass, IDOR, injection, role
   escalation across all endpoints
3. `app-logic-challenger-subagent` (focus: `full`) — full
   business logic review: contract drift, edge cases,
   invariant violations

## Output Expectations

- Route handlers under `apps/web/src/app/api/`
- Zod schemas in `apps/web/src/lib/validation/`
- All endpoints match `api-contract.ts` type signatures
- Complete API surface: ~16 route files total

## Exit Criteria

- All API tests pass
- `app-review-subagent` APPROVED
- `app-security-challenger-subagent` (focus: `full`) — no
  critical or high findings
- `app-logic-challenger-subagent` (focus: `full`) — no
  critical findings

## Quality Assurance

- [ ] Primary admin cannot be demoted or removed
- [ ] Role invites are hackathon-scoped
- [ ] Audit trail is complete (every reviewer action logged)
- [ ] Config read-only keys protected
- [ ] All endpoints have role guards matching api-contract.md
- [ ] All response shapes use `ApiResponse<T>` wrapper
- [ ] Pagination uses continuation tokens
- [ ] No IDOR vulnerabilities (users cannot access other
      hackathons' data)
