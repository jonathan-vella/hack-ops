---
description: 'API route handler conventions: Zod validation at entry, role guard pattern, error response format, audit logging, and mandatory shared type imports for HackOps API routes'
applyTo: '**/app/api/**'
---

# API Route Conventions

## Mandatory Imports

Every API route file MUST import types from the shared package:

```typescript
import type { ... } from '@hackops/shared/types/api-contract';
```

This is mechanically enforced by `validate-business-rules.mjs`.

## Route Handler Structure

Every route handler follows this exact order:

```typescript
export async function POST(request: NextRequest) {
  // 1. Parse and validate input with Zod (FIRST operation)
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: formatZodErrors(result.error) },
      { status: 400 }
    );
  }

  // 2. Check role authorization
  const { userId, role } = await getAuthContext(request);
  requireRole(role, ['Admin', 'Coach']);

  // 3. Execute business logic (delegate to service layer)
  const response = await serviceMethod(result.data);

  // 4. Audit log the mutation
  await auditLog({
    action: 'resource.created',
    performedBy: userId,
    targetType: 'resource',
    targetId: response.id,
    hackathonId: result.data.hackathonId,
  });

  // 5. Return typed response
  return NextResponse.json(response, { status: 201 });
}
```

## Error Response Format

All error responses use this consistent shape:

```typescript
interface ErrorResponse {
  error: string;    // Human-readable message
  code: string;     // Machine-readable code
  details?: unknown; // Validation errors, context
}
```

Standard error codes:

| Code               | HTTP Status | When                           |
| ------------------ | ----------- | ------------------------------ |
| `VALIDATION_ERROR` | 400         | Zod validation failed          |
| `UNAUTHORIZED`     | 401         | No valid session               |
| `FORBIDDEN`        | 403         | Role check failed              |
| `NOT_FOUND`        | 404         | Resource doesn't exist         |
| `CONFLICT`         | 409         | Duplicate resource             |
| `RATE_LIMITED`     | 429         | Too many requests              |
| `INTERNAL_ERROR`   | 500         | Unexpected server error        |

## Role Guard Pattern

```typescript
import { requireRole } from '@/lib/auth';

// Throws 403 if role is not in the allowed list
requireRole(role, ['Admin']);          // Admin only
requireRole(role, ['Admin', 'Coach']); // Admin or Coach
```

## Audit Logging

Every mutation endpoint (POST, PUT, PATCH, DELETE) MUST call `auditLog()`.
This is mechanically enforced by `validate-business-rules.mjs`.

## Rules

1. **Types from shared** — import from `@hackops/shared/types/api-contract`
2. **Zod first** — validate input as the first operation
3. **No business logic in routes** — delegate to service layer in `src/lib/services/`
4. **Audit every mutation** — POST, PUT, PATCH, DELETE
5. **Role guard every protected route** — use `requireRole()`
6. **Consistent errors** — use `ErrorResponse` shape with standard codes
