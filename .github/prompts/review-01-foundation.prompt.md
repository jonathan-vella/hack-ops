---
description: "Install Playwright, create Docker Compose for local SQL, build E2E fixtures and auth helpers"
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "edit/createDirectory",
    "search/textSearch",
    "search/fileSearch",
    "execute/runInTerminal",
  ]
---

# Review Phase R1: Foundation Setup

Set up the E2E testing infrastructure: Playwright, local SQL
Server container, seed fixtures, auth simulation, and npm scripts.

## Mission

Create the complete E2E test foundation so that subsequent
phases (R3-R7) can write and run tests immediately. After this
phase, `npx playwright test --list` must exit 0 with a valid
config, and the Docker Compose file must define a working SQL
Server container.

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Blueprint**: `.github/prompts/plan-endToEndCodeReview.prompt.md`
- **Branch**: `feature/code-review`
- **Blocks**: All other review phases (R2-R10)
- **Schema source**: `apps/web/src/lib/schema.sql`
- **Auth reference**: `apps/web/src/lib/auth.ts`
- **Existing fixtures**: `apps/web/tests/fixtures/index.ts`

## Workflow

### Step 1 — Read context

1. `apps/web/package.json` — current dependencies and scripts
2. `apps/web/src/lib/schema.sql` — all 11 table DDLs
3. `apps/web/src/lib/auth.ts` — Easy Auth header parsing + dev bypass
4. `apps/web/tests/fixtures/index.ts` — existing test data
5. `apps/web/vitest.config.ts` — existing test config

### Step 2 — Install Playwright (R1.1)

1. `npm install -D @playwright/test --workspace @hackops/web`
2. `npx playwright install --with-deps chromium firefox`
3. Create `apps/web/playwright.config.ts`:
   - Projects: `chromium`, `firefox`, `mobile-chrome`
   - Base URL: `http://localhost:3000`
   - Test dir: `tests/e2e/`
   - Timeout: 30s per test, 5min global
   - Retries: 1 on CI, 0 locally
   - Reporter: `html` + `json`
   - Web server: `npm run dev` with reuseExistingServer

### Step 3 — Docker Compose for local SQL (R1.2)

Create `docker-compose.test.yml` at repo root:

```yaml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "Test@12345678"
    ports:
      - "1433:1433"
    volumes:
      - ./apps/web/src/lib/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Test@12345678" -C -Q "SELECT 1"
      interval: 10s
      retries: 10
```

Note: MSSQL doesn't auto-run init scripts — the global-setup
will execute schema.sql via sqlcmd after the container is healthy.

### Step 4 — E2E seed scripts (R1.3)

Extend `apps/web/tests/fixtures/` with:

1. `seed-db.ts` — function that connects to local SQL and
   inserts seed data for all 11 tables using the existing
   fixture constants. Must be idempotent (TRUNCATE + INSERT).
2. `teardown-db.ts` — function that truncates all tables
   in reverse FK order.
3. Update `index.ts` to export additional fixtures needed
   for E2E: a complete hackathon lifecycle dataset (draft →
   active → with challenges + rubrics + teams + submissions).

### Step 5 — Auth simulation helper (R1.4)

Create `apps/web/tests/helpers/auth-helper.ts`:

1. Export `createAuthHeader(role, userId?)` — generates a
   base64-encoded `x-ms-client-principal` header matching
   the Easy Auth format parsed by `lib/auth.ts`.
2. Export `withAuth(page, role)` — Playwright helper that
   adds the auth header to all requests via `page.route()`.
3. Export pre-built personas: `ADMIN_PRINCIPAL`,
   `COACH_PRINCIPAL`, `HACKER_PRINCIPAL` matching existing
   fixture user IDs.

### Step 6 — Global setup (R1.5)

Create `apps/web/tests/global-setup.ts`:

1. Start Docker Compose if not running
2. Wait for SQL Server health check
3. Execute `schema.sql` against the container
4. Run seed scripts
5. Export teardown function for global-teardown

Create `apps/web/tests/global-teardown.ts`:

1. Run teardown-db
2. Optionally stop Docker Compose (configurable via env var)

### Step 7 — npm scripts (R1.6)

Add to `apps/web/package.json` scripts:

```json
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed",
"test:e2e:ui": "playwright test --ui",
"test:components": "vitest run --testPathPattern=components",
"test:review": "npm run test && npm run test:e2e"
```

### Step 8 — Verify (R1.7)

1. `npx playwright test --list` — exits 0, no config errors
2. `npm run type-check` — no TypeScript errors from new files
3. Verify docker-compose.test.yml is valid YAML

## Gate

- `npx playwright test --list` exits 0
- `npx tsc --noEmit` clean (new files compile)
- All R1 checkboxes checked in tracker

## After completing

Update tracker: check off R1.1-R1.7, update Session Log,
set Current Session Target to R2.1 (or R3.1 if parallelizing).
