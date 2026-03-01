---
description: "TypeScript strict-mode conventions for all .ts and .tsx source files"
applyTo: "**/*.ts, **/*.tsx"
---

# TypeScript Conventions

## Compiler Settings

- `strict: true` — never disable individual strict flags
- `noUncheckedIndexedAccess: true` — array/record access returns `T | undefined`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports

## Type-Only Imports

```typescript
// Good — explicit type import
import type { Hackathon } from "@hackops/shared";
import { HackathonStatus } from "@hackops/shared";

// Bad — mixing runtime and type imports
import { Hackathon, HackathonStatus } from "@hackops/shared";
```

Separate `import type` from runtime imports. This enables tree-shaking
and makes dependency boundaries clear.

## No `any`

| Pattern           | Use Instead                            |
| ----------------- | -------------------------------------- |
| `any`             | `unknown` + type narrowing             |
| `as any`          | Type assertion to specific type        |
| `// @ts-ignore`   | `// @ts-expect-error` with explanation |
| Untyped 3rd-party | Write a `.d.ts` declaration file       |

## Shared Types

All domain types live in `packages/shared/types/api-contract.ts`.

- Import via `@hackops/shared` path alias
- Never duplicate type definitions in `apps/web/`
- If a type is needed by multiple packages, add it to shared

## Naming

| Construct        | Convention        | Example             |
| ---------------- | ----------------- | ------------------- |
| Type / Interface | PascalCase        | `HackathonResponse` |
| Variable         | camelCase         | `hackathonId`       |
| Constant         | UPPER_SNAKE_CASE  | `MAX_TEAM_SIZE`     |
| Enum member      | snake_case string | `"under_review"`    |
| File             | kebab-case        | `assign-teams.ts`   |
| Component file   | PascalCase        | `HackathonCard.tsx` |

## Interfaces vs Types

- Prefer `interface` for object shapes (extendable, better error messages)
- Use `type` for unions, intersections, mapped types, and Zod inference

## Null Handling

- Prefer `undefined` over `null` for optional values
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Never use non-null assertion (`!`) unless the value is provably non-null

## Function Signatures

```typescript
// Good — explicit return type on exported functions
export function calculateScore(submissions: Submission[]): number {
  // ...
}

// Good — inferred return OK for internal/private functions
function normalize(value: string) {
  return value.trim().toLowerCase();
}
```

Exported functions must have explicit return types.

## Code Review

When reviewing TypeScript code, additionally check:

- Descriptive naming; constants for magic numbers/strings
- Functions < 30 lines; max 3-4 nesting levels
- No `any` — use `unknown` + narrowing
- Explicit return types on exported functions
- Specific test assertions (`toBe`, `toEqual`)
- Descriptive test names: "should [action] when [condition]"
- No secrets in code — use environment variables
