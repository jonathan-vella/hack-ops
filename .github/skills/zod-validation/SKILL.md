---
name: zod-validation
description: >-
  Zod schema patterns for API boundary validation in the HackOps platform.
  Covers discriminated unions for submission types, rubric schema validation,
  error message formatting, and shared schemas in packages/shared. Use when
  building or reviewing Zod schemas, API input validation, or form validation.
---

# Zod Validation Patterns

Schema-first validation for HackOps API boundaries and forms.

## Core Principle

Validate at the boundary, trust internally. Every API route handler validates
input with Zod as its first operation. Validated data flows through the service
layer without re-checking.

## Shared Schemas Location

All reusable schemas live in `packages/shared/schemas/`:

```text
packages/shared/
├── types/
│   └── api-contract.ts    # TypeScript types (source of truth)
└── schemas/
    ├── hackathon.ts       # Hackathon create/update schemas
    ├── submission.ts      # Submission schemas with discriminated unions
    ├── rubric.ts          # Rubric category and scoring schemas
    ├── team.ts            # Team assignment schemas
    ├── challenge.ts       # Challenge CRUD schemas
    └── common.ts          # Shared primitives (id, pagination, etc.)
```

## Common Primitives

```typescript
// packages/shared/schemas/common.ts
import { z } from 'zod';

export const cosmosIdSchema = z.string().uuid();

export const hackathonIdSchema = z.string().uuid();

export const paginationSchema = z.object({
  continuationToken: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('desc'),
});
```

## API Boundary Validation Pattern

```typescript
// app/api/hackathons/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHackathonSchema } from '@hackops/shared/schemas/hackathon';

export async function POST(request: NextRequest) {
  // 1. Parse and validate — FIRST operation in every handler
  const body = await request.json();
  const result = createHackathonSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodErrors(result.error),
      },
      { status: 400 }
    );
  }

  // 2. result.data is now fully typed — pass to service layer
  const hackathon = await createHackathon(result.data);
  return NextResponse.json(hackathon, { status: 201 });
}
```

## Error Formatting

```typescript
// packages/shared/schemas/common.ts
import type { ZodError } from 'zod';

export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) formatted[path] = [];
    formatted[path].push(issue.message);
  }
  return formatted;
}
```

Error response shape:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "name": ["String must contain at least 3 character(s)"],
    "teamSize": ["Number must be greater than or equal to 2"]
  }
}
```

## Hackathon Schemas

```typescript
// packages/shared/schemas/hackathon.ts
import { z } from 'zod';

export const createHackathonSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  teamSize: z.number().int().min(2).max(10),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const updateHackathonSchema = createHackathonSchema.partial();

export const hackathonStateSchema = z.enum([
  'draft', 'registration', 'active', 'scoring', 'archived',
]);
```

## Discriminated Unions (Submission Types)

```typescript
// packages/shared/schemas/submission.ts
import { z } from 'zod';

const baseSubmission = {
  teamId: z.string().uuid(),
  challengeId: z.string().uuid(),
  hackathonId: z.string().uuid(),
  submittedBy: z.string(),
};

export const submissionSchema = z.discriminatedUnion('evidenceType', [
  z.object({
    ...baseSubmission,
    evidenceType: z.literal('url'),
    evidenceUrl: z.string().url(),
  }),
  z.object({
    ...baseSubmission,
    evidenceType: z.literal('text'),
    evidenceText: z.string().min(10).max(5000),
  }),
  z.object({
    ...baseSubmission,
    evidenceType: z.literal('json'),
    evidencePayload: z.record(z.unknown()),
  }),
]);

export type SubmissionInput = z.infer<typeof submissionSchema>;
```

## Rubric Validation

```typescript
// packages/shared/schemas/rubric.ts
import { z } from 'zod';

export const rubricCategorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200),
  maxScore: z.number().int().min(1).max(100),
  weight: z.number().min(0).max(1),
});

export const createRubricSchema = z.object({
  hackathonId: z.string().uuid(),
  categories: z.array(rubricCategorySchema).min(1).max(20),
}).refine(
  (data) => {
    const totalWeight = data.categories.reduce((sum, c) => sum + c.weight, 0);
    return Math.abs(totalWeight - 1) < 0.01;
  },
  { message: 'Category weights must sum to 1.0' }
);

export const scoreEntrySchema = z.object({
  categoryName: z.string(),
  score: z.number().int().min(0),
}).refine(
  // maxScore validated against the rubric at runtime
  (data) => data.score >= 0,
  { message: 'Score must be non-negative' }
);
```

## Form Validation (Client-Side)

Use the same schemas in React Hook Form with `@hookform/resolvers/zod`:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createHackathonSchema } from '@hackops/shared/schemas/hackathon';

const form = useForm({
  resolver: zodResolver(createHackathonSchema),
});
```

## Rules

1. **Validate at the boundary** — first operation in every route handler
2. **Use `safeParse`** — never use `parse` in API routes (throws on invalid input)
3. **Share schemas** — import from `packages/shared/schemas/`, never duplicate
4. **Derive types** — use `z.infer<typeof schema>` instead of manual type definitions
5. **Consistent errors** — always use `formatZodErrors` for error response shape

## Learn More

| Topic                | Reference                                              |
| -------------------- | ------------------------------------------------------ |
| Zod documentation    | https://zod.dev                                        |
| Discriminated unions | https://zod.dev/?id=discriminated-unions                |
| React Hook Form      | https://react-hook-form.com/get-started                |
| `@hookform/resolvers`| https://github.com/react-hook-form/resolvers           |
