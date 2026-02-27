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

### Cosmos DB Client

```typescript
vi.mock("@/lib/cosmos", () => ({
  getContainer: vi.fn().mockReturnValue({
    items: {
      query: vi.fn().mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: mockData }),
      }),
      create: vi.fn().mockResolvedValue({ resource: mockDoc }),
      upsert: vi.fn().mockResolvedValue({ resource: mockDoc }),
    },
    item: vi.fn().mockReturnValue({
      read: vi.fn().mockResolvedValue({ resource: mockDoc }),
      replace: vi.fn().mockResolvedValue({ resource: mockDoc }),
    }),
  }),
}));
```

### Environment Variables

```typescript
beforeEach(() => {
  vi.stubEnv("COSMOS_ENDPOINT", "https://localhost:8081");
  vi.stubEnv("COSMOS_KEY", "test-key");
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
