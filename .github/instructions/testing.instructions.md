---
description: 'Vitest testing conventions: describe/it naming, mock patterns for Cosmos DB, test fixtures, and coverage thresholds for HackOps test files'
applyTo: '**/*.test.ts, **/*.spec.ts'
---

# Testing Conventions

## Framework

- **Vitest** for all unit and integration tests
- **React Testing Library** for component tests
- **Playwright** for E2E tests (stubs only initially)

## Test Naming

```typescript
describe('HackathonService', () => {
  describe('createHackathon', () => {
    it('should create a hackathon in draft state', async () => {});
    it('should reject if name is empty', async () => {});
    it('should require Admin role', async () => {});
  });
});
```

- `describe` blocks: component/module name → method/feature name
- `it` blocks: start with "should" + expected behavior
- Group related tests under nested `describe` blocks

## File Location

- Co-locate tests with source: `auth.test.ts` next to `auth.ts`
- Or use `__tests__/` directory for groups: `__tests__/auth.test.ts`
- API route tests: `route.test.ts` alongside `route.ts`
- Shared fixtures: `packages/shared/test-fixtures/`

## Mock Patterns

### Cosmos DB Client

```typescript
import { vi } from 'vitest';

vi.mock('@/lib/cosmos', () => ({
  getContainer: vi.fn(() => ({
    items: {
      create: vi.fn(),
      query: vi.fn(() => ({
        fetchAll: vi.fn(() => ({ resources: [] })),
      })),
    },
    item: vi.fn(() => ({
      read: vi.fn(),
      replace: vi.fn(),
      delete: vi.fn(),
    })),
  })),
}));
```

### Easy Auth Headers

```typescript
function createAuthenticatedRequest(
  role: 'Admin' | 'Coach' | 'Hacker',
  userId = 'test-user-id'
): NextRequest {
  const principal = Buffer.from(
    JSON.stringify({ userId, userRoles: [role] })
  ).toString('base64');

  return new NextRequest('http://localhost:3000/api/test', {
    headers: { 'x-ms-client-principal': principal },
  });
}
```

## Test Fixtures

- Store in `packages/shared/test-fixtures/`
- Use factory functions: `createTestHackathon()`, `createTestTeam()`
- Realistic but anonymized data
- Each fixture is self-contained (no cross-fixture dependencies)

## Coverage Thresholds

| Metric     | Minimum |
| ---------- | ------- |
| Statements | 80%     |
| Branches   | 70%     |
| Functions  | 80%     |
| Lines      | 80%     |

## Rules

- No tests should depend on external services — mock everything
- Each test must be independent — no shared mutable state
- Prefer `toEqual` over `toBe` for objects
- Use `beforeEach` for setup, `afterEach` for cleanup
- Test business rule invariants from `hackops-domain` skill explicitly
- Avoid snapshot tests for dynamic content
