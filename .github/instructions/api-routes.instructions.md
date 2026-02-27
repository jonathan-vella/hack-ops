---
description: "API route handler conventions enforcing Zod validation, role guards, error format, and audit logging"
applyTo: "**/app/api/**"
---

# API Route Conventions

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

## Route Handler Template

```typescript
import { NextResponse } from "next/server";
import { CreateHackathonSchema, type ApiResponse, type Hackathon } from "@hackops/shared";
import { requireAuth, requireRole } from "@/lib/auth";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";

export async function POST(request: Request) {
  // 1. Auth guard
  const user = await requireAuth(request);
  requireRole(user, "admin");

  // 2. Validate input
  const body = await request.json();
  const result = CreateHackathonSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Validation failed", details: result.error.issues, ok: false },
      { status: 400 },
    );
  }

  // 3. Business logic (delegate to service layer)
  const container = getContainer("hackathons");
  const { resource } = await container.items.create<Hackathon>({
    ...result.data,
    id: crypto.randomUUID(),
    status: "draft",
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  });

  // 4. Audit log
  await auditLog({
    action: "hackathon.created",
    actorId: user.id,
    resourceId: resource!.id,
    hackathonId: resource!.id,
  });

  // 5. Response
  return NextResponse.json<ApiResponse<Hackathon>>(
    { data: resource!, ok: true },
    { status: 201 },
  );
}
```

## Validation Rules

| Rule                              | Enforcement                               |
| --------------------------------- | ----------------------------------------- |
| Always use `safeParse`            | Never `parse` — APIs must not throw       |
| Return 400 on validation failure  | Include `error.issues` in response        |
| Validate at route entry           | Before any business logic or DB calls     |
| Use `z.coerce` for query params   | URL search params are always strings      |

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
  action: "hackathon.created",  // domain.verb
  actorId: user.id,
  resourceId: resource.id,
  hackathonId: hackathonId,     // partition key for Cosmos DB
  metadata: {},                 // optional extra context
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
