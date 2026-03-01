---
description: "Implement auth middleware, role resolution, role guards, CORS, rate limiting, Zod validation middleware, and audit logger"
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

# Build Auth & Authorization Middleware

Implement the full authentication and authorization stack for
HackOps: Easy Auth header parsing, role resolution, role
guards, CORS, rate limiting, Zod validation middleware, and
audit logging.

## Mission

Create the security middleware layer that protects every API
route. After this step, all routes can use `requireRole()` to
enforce access and `auditLog()` to record reviewer actions.

## Scope & Preconditions

- **Prerequisite**: app-01-scaffold completed — monorepo
  builds, `packages/shared/types/` exists
- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — read `Phase 5: Authentication & Authorization Middleware`
- **API contract**: `packages/shared/types/api-contract.ts`
  — `EasyAuthPrincipal`, `UserRole` types
- **Data model**: `docs/data-model.md` — `roles` container
  schema, `config` container (primary admin)
- **Env config**: `docs/environment-config.md` — dev auth
  bypass variables (`DEV_USER_*`)
- **Skills**: Read `hackops-domain` (roles matrix),
  `zod-validation` (boundary parsing), `cosmos-db-sdk`
  (container queries)

## Workflow

### Step 1 — Read context

1. `packages/shared/types/api-contract.ts` — auth types
2. `docs/data-model.md` — `roles` and `config` containers
3. `docs/environment-config.md` — Easy Auth header contract
4. `docs/prd.md` — roles matrix and primary admin rules
5. `.github/skills/hackops-domain/SKILL.md` — business rules
6. `.github/skills/zod-validation/SKILL.md`

### Step 2 — Easy Auth header parsing

Create/update `apps/web/src/lib/auth.ts`:

1. Parse `X-MS-CLIENT-PRINCIPAL` header (base64 → JSON)
2. Extract `userId`, `githubLogin`, `email`, `avatarUrl`
   from claims array
3. Return typed `EasyAuthPrincipal` or `null`
4. **Dev bypass**: When `NODE_ENV=development`, read
   `DEV_USER_ID`, `DEV_USER_ROLE`, `DEV_USER_LOGIN`,
   `DEV_USER_EMAIL` from env and return a synthetic principal

### Step 3 — Role resolution

Create `apps/web/src/lib/roles.ts`:

1. Look up user in `roles` container by `githubUserId` +
   `hackathonId`
2. Return `UserRole` (`admin` | `coach` | `hacker`) or `null`
3. Cache role within the request lifecycle (not globally)

### Step 4 — Next.js middleware

Create/update `apps/web/src/proxy.ts`:

1. Intercept all `/api/*` routes except `/api/health`
2. Parse auth headers → resolve role → attach to request
   context (headers or custom property)
3. Return 401 for unauthenticated requests

### Step 5 — Role guard helper

Create `apps/web/src/lib/guards.ts`:

1. `requireRole(...roles: UserRole[])` — wraps a route
   handler; returns 403 if the caller's role is not in the
   allowed list
2. Composable: `requireRole('admin', 'coach')` allows both
3. Import pattern: route handlers wrap with guard

### Step 6 — CORS configuration

In `apps/web/next.config.ts` or middleware:

1. Whitelist App Service origin and `localhost:3000`
2. Block all other origins
3. Set `Access-Control-Allow-Methods`,
   `Access-Control-Allow-Headers`

### Step 7 — Rate limiting

Create `apps/web/src/lib/rate-limiter.ts`:

1. In-memory `Map<IP, { count, resetAt }>` implementation
2. Default: 100 requests/min/IP for API routes
3. Special: 5 requests/min/IP for `/api/join` (event code)
4. Return 429 with `Retry-After` header on abuse

### Step 8 — Zod validation middleware

Create `apps/web/src/lib/validation/middleware.ts`:

1. Wraps route handlers with automatic Zod parsing
2. Reads request body → validates against provided schema
3. Returns 400 with structured error on validation failure
4. Parse at boundaries — business logic receives typed data

### Step 9 — Audit logger

Create `apps/web/src/lib/audit.ts`:

1. Writes audit records with `reviewedBy`, `reviewedAt`,
   `reviewReason` to the relevant container
2. Used by submission approve/reject and score override
3. Accept `action`, `userId`, `resourceId`, `reason` params

### Step 10 — Primary admin protection

In role management logic (or a guard helper):

1. Look up primary admin in `config` container
2. Reject any attempt to demote or remove the primary admin
3. Return 403 with clear error message

### Step 11 — Validate

1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. Write unit tests for:
   - Easy Auth header parsing (valid, malformed, missing)
   - Role resolution (found, not found, dev bypass)
   - Role guard (allowed, denied)
   - Rate limiter (under limit, over limit)
   - Zod validation middleware (valid, invalid payload)

## Output Expectations

- `apps/web/src/lib/auth.ts` — Easy Auth + dev bypass
- `apps/web/src/lib/roles.ts` — role resolution
- `apps/web/src/lib/guards.ts` — `requireRole()` helper
- `apps/web/src/lib/rate-limiter.ts` — in-memory rate limiter
- `apps/web/src/lib/validation/middleware.ts` — Zod wrapper
- `apps/web/src/lib/audit.ts` — audit logger
- `apps/web/src/proxy.ts` — Next.js request interceptor (proxy)

## Exit Criteria

- Role guard unit tests pass
- `tsc --noEmit` clean
- `app-security-challenger-subagent` (focus: `auth`) — no
  critical or high findings

## Quality Assurance

- [ ] Easy Auth header parsing handles malformed/missing headers
- [ ] Dev bypass only active when `NODE_ENV=development`
- [ ] Role guard returns 403 with descriptive error
- [ ] Rate limiter configured: 100/min general, 5/min for `/api/join`
- [ ] Zod middleware returns structured 400 errors
- [ ] Primary admin cannot be demoted
- [ ] Audit logger captures who, when, and why
- [ ] No secrets in source code
