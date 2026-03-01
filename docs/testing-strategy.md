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
      ╯ Integration╲      ← Vitest + local SQL Server
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
Excluded: test files, `db.ts` (infra), hooks (client-only), validation barrel.

## What to Mock

| Dependency      | Mock Strategy                                     |
| --------------- | ------------------------------------------------- |
| SQL Database    | `vi.mock("@/lib/db")` — return mock query results |
| Auth principal  | `vi.mock("@/lib/auth")` — return test principal   |
| Role resolution | `vi.mock("@/lib/roles")` — return desired role    |
| Audit logger    | `vi.mock("@/lib/audit")` — spy on calls           |
| `NextRequest`   | Construct with test URL and headers               |

## What to Test Against Local SQL Server

Integration tests that validate real SQL Database behavior
(joins, foreign keys, transactions, optimistic concurrency)
should use a local SQL Server container:

```bash
# Start SQL Server (Docker)
docker run -d -p 1433:1433 \
  -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='HackOps@Dev123' \
  mcr.microsoft.com/mssql/server:2022-latest

# Seed test data (TODO: replace with SQL seeder — see Phase I)
# npx tsx scripts/seed-sql.ts  # TODO: create SQL seeder (see Phase I)
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
