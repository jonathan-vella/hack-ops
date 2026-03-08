---
description: "Use Context7 MCP to verify all library usage patterns against live docs — Next.js 15, Zod 4, mssql, React 19, shadcn/ui, Vitest 4"
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "search/textSearch",
    "search/fileSearch",
    "mcp/context7",
  ]
---

# Review Phase R2: Context7 Library Audit

Verify every library used in the HackOps app against live
documentation using Context7 MCP. Fix outdated, incorrect,
or deprecated patterns before adversarial review.

## Mission

Resolve each library's Context7 ID, query current docs for
the patterns used in this codebase, and produce a findings
document listing any deviations. Fix fixable issues inline.
This phase runs in parallel with E2E test writing (R3-R7)
but must complete before adversarial review (R8-R9).

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Blueprint**: `.github/prompts/plan-endToEndCodeReview.prompt.md`
- **Branch**: `feature/code-review`
- **Prerequisite**: R1 complete
- **Parallel with**: R3-R7

## Workflow

### Step 1 — Read source files

Scan the codebase to build a manifest of library usage:

1. `apps/web/src/app/api/` — all route handler files (~20)
2. `apps/web/src/lib/` — all library files (sql, auth, guards,
   roles, audit, leaderboard, challenge-gate, rate-limiter, utils)
3. `apps/web/src/lib/validation/` — all 12 Zod schema files
4. `apps/web/src/components/` — all React components (20+)
5. `apps/web/src/lib/hooks/` — custom hooks (use-auth, use-fetch)
6. `apps/web/vitest.config.ts` — test config
7. `apps/web/src/app/api/__tests__/` — existing test files

### Step 2 — Next.js 15 audit (R2.1)

Use Context7 MCP:

1. Resolve Next.js library ID
2. Query: route handler export conventions (GET, POST, PATCH, DELETE)
3. Query: `NextResponse.json()` signature + status codes
4. Query: `cookies()` and `headers()` — are they async in v15?
5. Query: `"use client"` directive requirements
6. Query: `layout.tsx` / `page.tsx` conventions, metadata exports
7. Query: middleware pattern (`middleware.ts` at app root)

Cross-check every route handler against findings. Flag:

- Wrong export signatures
- Sync calls to async APIs
- Missing `"use client"` on interactive components
- Deprecated patterns from Next.js 14

### Step 3 — Zod 4 audit (R2.2)

Use Context7 MCP:

1. Resolve Zod library ID (ensure Zod 4, not Zod 3)
2. Query: `safeParse` return type and error shape
3. Query: `z.coerce` patterns for query params
4. Query: `z.object`, `z.enum`, `z.array` composition
5. Query: `.transform()` and `.refine()` patterns
6. Query: error formatting for API responses

Cross-check all 12 validation files. Flag:

- Zod 3 patterns that changed in Zod 4
- Incorrect error message extraction
- Missing `.strip()` or `.strict()` on input schemas

### Step 4 — mssql audit (R2.3)

Use Context7 MCP:

1. Resolve `mssql` (tedious) library ID
2. Query: connection pool configuration
3. Query: parameterized query syntax (`sql.NVarChar`, `sql.Int`)
4. Query: `@azure/identity` integration for Entra ID tokens
5. Query: transaction patterns

Cross-check `lib/sql.ts`. Flag:

- Incorrect parameter types
- Missing pool drain on shutdown
- Token refresh edge cases

### Step 5 — React 19 + Testing Library audit (R2.4)

Use Context7 MCP:

1. Resolve React library ID (version 19)
2. Query: `use` hook (new in React 19)
3. Query: server component vs client component rules
4. Resolve `@testing-library/react` library ID
5. Query: `render`, `screen`, `fireEvent`, `waitFor` patterns
6. Query: `userEvent` vs `fireEvent` recommendations

Cross-check hooks and components. Flag:

- Deprecated lifecycle patterns
- Wrong Testing Library query priorities

### Step 6 — Tailwind CSS v4 + shadcn/ui audit (R2.5)

Use Context7 MCP:

1. Resolve Tailwind CSS library ID (version 4)
2. Query: v4 breaking changes from v3 (config format, directives)
3. Resolve shadcn/ui library ID
4. Query: component import patterns, composition rules
5. Query: theming and dark mode patterns

Cross-check `src/components/`. Flag:

- Tailwind v3 syntax that changed in v4
- Incorrect shadcn/ui import paths
- Missing accessibility attributes

### Step 7 — Vitest 4 audit (R2.6)

Use Context7 MCP:

1. Resolve Vitest library ID (version 4)
2. Query: `vi.mock()` auto-hoisting behavior
3. Query: `vi.stubEnv()` API
4. Query: `vi.importActual()` partial mock pattern
5. Query: coverage provider config (v8 vs istanbul)
6. Query: `vitest.config.ts` schema

Cross-check test files and config. Flag:

- Deprecated mock patterns
- Incorrect coverage config
- Missing test isolation

### Step 8 — Write findings (R2.7)

Create `agent-output/hackops/review-context7-findings.md`:

```markdown
# Context7 Library Audit Findings

## Summary

| Library | Version | Files Checked | Issues Found | Fixed |
...

## Next.js 15

### Findings

...

### Fixes Applied

...

## Zod 4

...
(repeat for each library)
```

For each finding, include:

- File path + line range
- Current pattern (what the code does)
- Expected pattern (what Context7 docs say)
- Severity: `breaking` / `deprecated` / `style`
- Fix status: `fixed` / `needs-manual` / `acceptable`

## Gate

- Findings document created at
  `agent-output/hackops/review-context7-findings.md`
- All `breaking` findings fixed
- All `deprecated` findings fixed or documented with rationale
- `npx tsc --noEmit` clean after fixes
- `npm test` still passes after fixes

## After completing

Update tracker: check off R2.1-R2.7, update Session Log,
set Current Session Target to R8.1 (or continue E2E phases).
