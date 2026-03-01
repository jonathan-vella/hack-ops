---
description: "Vitest testing conventions for unit and integration tests"
applyTo: "**/*.test.ts, **/*.spec.ts"
---

# Testing Conventions

## Framework

- **Vitest 4** — test runner and assertion library
- Run: `npm test` (root) or `npm run --workspace @hackops/web test`
- Config: `apps/web/vitest.config.ts`

## File Naming

| Type        | Pattern                 | Location                   |
| ----------- | ----------------------- | -------------------------- |
| Unit        | `*.test.ts`             | Colocated with source file |
| Integration | `*.integration.test.ts` | `__tests__/` directory     |
| E2E stub    | `*.e2e.test.ts`         | `e2e/` directory           |

## Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("calculateScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns weighted average across categories", () => {
    const scores = [
      { category: "innovation", score: 8 },
      { category: "execution", score: 7 },
    ];
    expect(calculateScore(scores)).toBe(7.5);
  });

  it("throws on empty scores array", () => {
    expect(() => calculateScore([])).toThrow("No scores");
  });
});
```

### Rules

- Use `describe` for the unit under test, `it` for individual cases
- Test names read as sentences: `it("returns weighted average...")`
- One assertion per test when possible — multiple only for related checks
- Use `beforeEach` for setup, `afterEach` for cleanup

## Mocking

### SQL Client

```typescript
vi.mock("@/lib/sql", () => ({
  query: vi.fn().mockResolvedValue(mockRows),
  queryOne: vi.fn().mockResolvedValue(mockRow),
  execute: vi.fn().mockResolvedValue(1),
  transaction: vi.fn(async (fn) =>
    fn({
      query: vi.fn().mockResolvedValue(mockRows),
      queryOne: vi.fn().mockResolvedValue(mockRow),
      execute: vi.fn().mockResolvedValue(1),
    }),
  ),
}));
```

### Environment Variables

```typescript
beforeEach(() => {
  vi.stubEnv("SQL_SERVER", "localhost");
  vi.stubEnv("SQL_DATABASE", "hackops");
});
```

### Fetch / NextResponse

```typescript
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return { ...actual };
});
```

## Fixtures

- Place test fixtures in `__fixtures__/` next to test files
- Use factory functions for complex test data
- Never use production data in tests

```typescript
// __fixtures__/hackathon.ts
export function createMockHackathon(
  overrides: Partial<Hackathon> = {},
): Hackathon {
  return {
    id: "hack-001",
    name: "Test Hackathon",
    status: "draft",
    ...overrides,
  };
}
```

## Coverage Thresholds

| Metric     | Minimum |
| ---------- | ------- |
| Statements | 80%     |
| Branches   | 75%     |
| Functions  | 80%     |
| Lines      | 80%     |

## What to Test

| Always test                             | Skip                          |
| --------------------------------------- | ----------------------------- |
| Business logic and calculations         | shadcn/ui primitives          |
| API route handlers (request → response) | Third-party library internals |
| Zod schema validation                   | Tailwind class application    |
| State machine transitions               | Next.js framework internals   |
| Error handling paths                    | Environment-specific setup    |
| Role-based access control               | —                             |

## Context7 Dynamic Verification

Agents MUST cross-check this skill's patterns against live documentation at
**both code generation and review time**.

### When to Verify

- Before generating code that uses patterns from this skill
- During code review passes (app-review-subagent, app-lint-subagent)

### Verification Steps

1. Call `resolve-library-id` for `vitest` to get the current library ID
2. Call `query-docs` with the resolved ID and topic `"vitest mock vi.fn vi.mock vi.spyOn API"` (set tokens to 5000)
3. Call `query-docs` with the resolved ID and topic `"vitest configuration coverage setup beforeEach"` (set tokens to 5000)
4. Compare the returned documentation against this skill's hardcoded patterns
5. If any pattern has changed (different API signature, renamed method, new
   required parameter), flag the discrepancy to the user before proceeding

### What to Cross-Check

- `vi.mock()` signature and auto-mock behavior
- `vi.stubEnv()` availability and API
- `vi.importActual()` usage for partial mocks
- Config file structure (`vitest.config.ts` shape)

### Fallback

If Context7 is unavailable (network error, rate limit, timeout):

1. **Warn the user** that live verification was not possible
2. **Ask for confirmation** before proceeding with the skill's hardcoded patterns
3. Do NOT silently fall back — the user must acknowledge the risk
