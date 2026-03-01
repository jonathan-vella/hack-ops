---
name: zod-validation
description: Zod 4 schema patterns for the HackOps platform. Covers schema definition, API request/response validation, form integration, and shared type extraction. Use when writing API route handlers or form schemas. Keywords: Zod, validation, schema, parse, safeParse, z.object, z.enum, z.string, z.infer.
---

# Zod Validation Patterns

Zod 4 (`zod/v4`) schema patterns for request validation, response
typing, and form integration in the HackOps platform.

## When to Use This Skill

- Defining request body or query parameter schemas for API routes
- Generating TypeScript types from schemas
- Integrating validation with React Hook Form
- Validating environment variables at startup

## Import Convention

```typescript
// Always import from zod/v4 (Zod 4 mini by default)
import { z } from "zod/v4";
```

## Schema Catalog (from api-contract.ts)

### Core Enums

```typescript
export const HackathonStatus = z.enum([
  "draft",
  "registration",
  "active",
  "judging",
  "completed",
  "archived",
]);

export const SubmissionState = z.enum([
  "draft",
  "submitted",
  "under_review",
  "scored",
]);

export const UserRole = z.enum(["admin", "judge", "participant"]);
```

### Document Schemas

```typescript
export const CreateHackathonSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime(),
  maxTeamSize: z.number().int().min(1).max(10).default(5),
  categories: z.array(z.string().min(1)).min(1),
});

export type CreateHackathon = z.infer<typeof CreateHackathonSchema>;
```

## API Route Validation Pattern

```typescript
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { CreateHackathonSchema } from "@hackops/shared";

export async function POST(request: Request) {
  const body = await request.json();
  const result = CreateHackathonSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.issues, ok: false },
      { status: 400 },
    );
  }

  const data = result.data;
  // ... proceed with validated data
}
```

### Rules

- **Always use `safeParse`** in API routes — never `parse` (throws)
- Return `400` with `error.issues` on validation failure
- Extract `result.data` only after checking `result.success`

## Type Extraction

```typescript
// Extract input type (before transforms)
type CreateHackathonInput = z.input<typeof CreateHackathonSchema>;

// Extract output type (after transforms/defaults)
type CreateHackathon = z.output<typeof CreateHackathonSchema>;

// Shorthand (same as z.output)
type CreateHackathon = z.infer<typeof CreateHackathonSchema>;
```

## Composition Patterns

### Extend

```typescript
const UpdateHackathonSchema = CreateHackathonSchema.partial().extend({
  id: z.string().uuid(),
});
```

### Pick / Omit

```typescript
const HackathonSummary = HackathonSchema.pick({
  id: true,
  name: true,
  status: true,
});
```

### Discriminated Union

```typescript
const ScoreAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("submit"), scores: z.array(CategoryScoreSchema) }),
  z.object({ type: z.literal("override"), reason: z.string().min(1) }),
]);
```

## Query Parameter Validation

```typescript
const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: HackathonStatus.optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  const result = ListQuerySchema.safeParse(query);
  // ...
}
```

- Use `z.coerce.number()` for query strings (always strings from URL)

## Form Integration

```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const form = useForm<CreateHackathon>({
  resolver: zodResolver(CreateHackathonSchema),
  defaultValues: { name: "", maxTeamSize: 5, categories: [] },
});
```

## Environment Validation

```typescript
const EnvSchema = z.object({
  SQL_SERVER: z.string().min(1),
  SQL_PASSWORD: z.string().min(1),
  SQL_DATABASE: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
});

// Validate at module load — fail fast
export const env = EnvSchema.parse(process.env);
```

## Common Mistakes

| Mistake                                | Fix                                            |
| -------------------------------------- | ---------------------------------------------- |
| Using `parse` in route handler         | Use `safeParse` — never throw in APIs          |
| String interpolation in error messages | Return `result.error.issues` directly          |
| Forgetting `z.coerce` for query params | Query params are always strings                |
| Using `z.date()` for JSON bodies       | Use `z.iso.datetime()` — JSON has no Date type |

## Context7 Dynamic Verification

Agents MUST cross-check this skill's patterns against live documentation at
**both code generation and review time**.

### When to Verify

- Before generating code that uses patterns from this skill
- During code review passes (app-review-subagent, app-lint-subagent)

### Verification Steps

1. Call `resolve-library-id` for `zod` to get the current library ID
2. Call `query-docs` with the resolved ID and topic `"zod v4 import path safeParse parse validation"` (set tokens to 5000)
3. Call `query-docs` with the resolved ID and topic `"zod iso datetime coerce string number schema"` (set tokens to 5000)
4. Compare the returned documentation against this skill's hardcoded patterns
5. If any pattern has changed (different API signature, renamed method, new
   required parameter), flag the discrepancy to the user before proceeding

### What to Cross-Check

- Import path (`zod/v4` vs `zod`)
- `safeParse` return type shape (`{ success, data, error }`)
- `z.iso.datetime()` availability and syntax
- `z.coerce.number()` behavior

### Fallback

If Context7 is unavailable (network error, rate limit, timeout):

1. **Warn the user** that live verification was not possible
2. **Ask for confirmation** before proceeding with the skill's hardcoded patterns
3. Do NOT silently fall back — the user must acknowledge the risk

## References

- `packages/shared/types/api-contract.ts` — canonical schema definitions
- `apps/web/src/lib/validation.ts` — shared validation utilities
- `apps/web/src/app/api/*/route.ts` — route handler usage examples
