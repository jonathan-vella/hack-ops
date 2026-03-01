---
description: "API route handler conventions enforcing Zod validation, role guards, error format, and audit logging"
applyTo: "**/app/api/**"
---

# API Route Conventions

> Library-specific patterns (Next.js route handlers, Zod validation, SQL
> operations) are maintained in dedicated skills: `nextjs-patterns`
> and `zod-validation`. This instruction defines the
> **orchestration invariants** that combine them.

## Canonical Type Source

All request/response types and Zod schemas MUST be imported from
`packages/shared/types/api-contract.ts` via `@hackops/shared`.

```typescript
// Good
import { CreateHackathonSchema, type Hackathon } from "@hackops/shared";

// Bad — duplicating types locally
const CreateHackathonSchema = z.object({ ... });
```

Never define domain types or Zod schemas inside route files.

## Route Handler Skeleton

```typescript
export async function POST(request: Request) {
  // 1. Auth guard — requireAuth + requireRole
  // 2. Validate input — Zod safeParse (see zod-validation skill)
  // 3. Business logic — delegate to service layer (uses @/lib/sql)
  // 4. Audit log — auditLog() call
  // 5. Response — NextResponse.json (see nextjs-patterns skill)
}
```

## Auth Guard Pattern

```typescript
// Protected route — any authenticated user
const user = await requireAuth(request);

// Role-restricted route
const user = await requireAuth(request);
requireRole(user, "admin");

// Multi-role route
requireRole(user, ["admin", "judge"]);
```

- Every non-public route calls `requireAuth` first
- Role check follows immediately after auth
- Return 401 for unauthenticated, 403 for unauthorized

## Error Response Format

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: unknown;
  ok: boolean;
}
```

| Status | Use case                          |
| ------ | --------------------------------- |
| 400    | Validation failure                |
| 401    | Not authenticated                 |
| 403    | Insufficient role                 |
| 404    | Resource not found                |
| 409    | Conflict (duplicate, state error) |
| 500    | Unexpected server error           |

## Audit Logging

Every mutation (POST, PUT, PATCH, DELETE) writes an audit entry:

```typescript
await auditLog({
  action: "hackathon.created", // domain.verb
  actorId: user.id,
  resourceId: resource.id,
  hackathonId: hackathonId,
  metadata: {}, // optional extra context
});
```

## Route File Organization

- One route file per resource endpoint
- No business logic in route files — delegate to service modules in `src/lib/`
- Route files handle: auth → validate → delegate → audit → respond
- Keep route handlers under 50 lines

## State Machine Enforcement

State transitions (hackathon status, submission state) are validated
by service-layer functions, not in route handlers directly.

```typescript
// In src/lib/hackathon-service.ts
export function validateTransition(
  current: HackathonStatus,
  target: HackathonStatus,
): boolean {
  return VALID_TRANSITIONS[current]?.includes(target) ?? false;
}
```

Return 409 Conflict if a transition is invalid.

## Context7 Dynamic Verification

Agents MUST cross-check this instruction's patterns against live documentation at
**both code generation and review time**.

### When to Verify

- Before generating code that uses patterns from this instruction
- During code review passes (app-review-subagent, app-lint-subagent)

### Verification Steps

1. Call `resolve-library-id` for `next.js` and `zod` to get their current library IDs
2. Call `query-docs` with the Next.js ID and topic `"NextResponse json route handler API"` (set tokens to 3000)
3. Call `query-docs` with the Zod ID and topic `"safeParse error issues validation"` (set tokens to 3000)
4. Compare the returned documentation against this instruction's hardcoded patterns
5. If any pattern has changed (different API signature, renamed method, new
   required parameter), flag the discrepancy to the user before proceeding

### What to Cross-Check

- `NextResponse.json()` generic type parameter support
- `safeParse` result shape (`success`, `data`, `error.issues`)
- `requireAuth` / `requireRole` patterns (these are project-specific — skip
  Context7 for auth, just verify the library APIs they depend on)

### Fallback

If Context7 is unavailable (network error, rate limit, timeout):

1. **Warn the user** that live verification was not possible
2. **Ask for confirmation** before proceeding with the instruction's hardcoded patterns
3. Do NOT silently fall back — the user must acknowledge the risk
