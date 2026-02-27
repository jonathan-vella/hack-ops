# Testing Strategy

> [Current Version](../VERSION.md) | Test pyramid, tools, coverage targets, and mocking approach for HackOps

## Overview

HackOps uses a **test pyramid** approach: many fast unit tests at the base,
a thinner layer of integration tests, and targeted E2E tests at the top.
All automated tests run in CI on every pull request.

## Test Pyramid

```text
        ╱  E2E  ╲         ← Playwright (planned)
       ╱─────────╲
      ╱ Integration╲      ← Vitest + Cosmos emulator
     ╱───────────────╲
    ╱    Unit Tests    ╲   ← Vitest + jsdom
   ╱─────────────────────╲
```

| Layer       | Tool                | Count | Target Coverage |
| ----------- | ------------------- | ----- | --------------- |
| Unit        | Vitest + jsdom      | ~170  | >90% lines      |
| Integration | Vitest + emulator   | ~10   | Key API flows   |
| E2E         | Playwright (future) | —     | Critical paths  |

## Tools

| Tool                       | Purpose                              |
| -------------------------- | ------------------------------------ |
| **Vitest**                 | Test runner (v4, ES modules native)  |
| **jsdom**                  | DOM environment for React components |
| **@testing-library/react** | Component testing utilities          |
| **@vitest/coverage-v8**    | Coverage reporting (V8 engine)       |
| **Playwright** (planned)   | Browser-based E2E tests              |

## Coverage Targets

Configured in [apps/web/vitest.config.ts](../apps/web/vitest.config.ts):

| Metric   | Threshold | Current |
| -------- | --------- | ------- |
| Lines    | 80%       | 93%     |
| Branches | 80%       | 86%     |

Coverage includes `src/lib/**/*.ts` and `src/app/api/**/*.ts`.
Excluded: test files, `cosmos.ts` (infra), hooks (client-only), validation barrel.

## What to Mock

| Dependency      | Mock Strategy                                     |
| --------------- | ------------------------------------------------- |
| Cosmos DB       | `vi.mock("@/lib/cosmos")` — return mock container |
| Auth principal  | `vi.mock("@/lib/auth")` — return test principal   |
| Role resolution | `vi.mock("@/lib/roles")` — return desired role    |
| Audit logger    | `vi.mock("@/lib/audit")` — spy on calls           |
| `NextRequest`   | Construct with test URL and headers               |

## What to Test Against Emulator

Integration tests that validate real Cosmos DB behavior
(partition key routing, cross-partition queries, upsert
semantics) should use the Cosmos DB emulator:

```bash
# Start emulator (Docker)
docker run -p 8081:8081 -p 10250-10255:10250-10255 \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest

# Seed test data
npx tsx scripts/seed-cosmos.ts
```

## Test Organization

```text
apps/web/
├── src/
│   ├── app/api/__tests__/     ← API route handler tests
│   └── lib/__tests__/         ← Library/utility tests
└── tests/
    └── fixtures/              ← Shared test data
        └── index.ts
```

## Running Tests

```bash
npm test                    # All tests via Turborepo
npm run test -- --coverage  # With coverage report
cd apps/web && npx vitest   # Watch mode (development)
```

## CI Integration

Tests run in the [hackops-ci.yml](../.github/workflows/hackops-ci.yml)
workflow on every PR. Coverage reports are uploaded as artifacts
with 14-day retention.
