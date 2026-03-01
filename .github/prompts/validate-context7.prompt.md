---
description: "Pre-deployment validation: cross-check all built code patterns against live library docs via Context7 MCP"
agent: "agent"
tools:
  [
    "read/readFile",
    "search/textSearch",
    "search/fileSearch",
    "search/listDirectory",
    "todo",
    "context7/*",
  ]
---

# Context7 Pre-Deployment Validation

Cross-check the HackOps application code against live library documentation for
all 4 core dependencies. Flag any stale patterns, deprecated APIs, or incorrect
type signatures before deployment.

## Mission

Validate that every key API pattern used in `apps/web/` matches the latest
official documentation. Produce a structured pass/fail report with actionable
findings for any drift.

## Scope & Preconditions

- Context7 MCP must be configured and authenticated (`.vscode/mcp.json`)
- Application code must exist in `apps/web/src/`
- No code modifications — this is a read-only audit

## Library Validation Matrix

| #   | Library          | Package         | Key files                                                        |
| --- | ---------------- | --------------- | ---------------------------------------------------------------- |
| 1   | Next.js 16       | `next`          | `src/app/api/**/route.ts`, `src/proxy.ts`, `src/app/**/page.tsx` |
| 2   | Zod 4            | `zod`           | `src/lib/validation/*.ts`                                        |
| 3   | Cosmos DB SDK v4 | `@azure/cosmos` | `src/lib/cosmos.ts`, all route handlers with queries             |
| 4   | shadcn/ui        | `shadcn/ui`     | `src/components/**/*.tsx`, `src/components/ui/**/*.tsx`          |

## Workflow

Execute the following steps sequentially. Stop and report if Context7 is
unreachable for any library.

### Step 1 — Resolve Library IDs

Call `resolve-library-id` for each library:

1. `next.js` — query: "Next.js App Router route handler"
2. `zod` — query: "Zod schema validation"
3. `@azure/cosmos` — query: "Azure Cosmos DB Node.js SDK"
4. `shadcn/ui` — query: "shadcn ui React components"

Record each resolved library ID for subsequent queries.

### Step 2 — Query Live Documentation

For each resolved library, call `query-docs` with 8000 tokens:

**Next.js (2 queries):**

- `"route handler params searchParams dynamic segments App Router"`
- `"server components client components use client directive middleware"`

**Zod (2 queries):**

- `"safeParse parse validation import path zod v4"`
- `"z.object z.enum z.string z.number coerce iso datetime"`

**Cosmos DB SDK (2 queries):**

- `"CosmosClient constructor database container init"`
- `"query items parameterized query bulk operations fetchAll"`

**shadcn/ui (2 queries):**

- `"components Card Dialog Form Table installation"`
- `"form react-hook-form zod resolver zodResolver useForm"`

### Step 3 — Scan Application Code

Read the following files to extract current patterns:

**Next.js patterns:**

- Any 2 route handlers from `src/app/api/` — check `params` type, response format
- `src/proxy.ts` — check proxy signature and config export
- Any 1 page component — check `searchParams` type

**Zod patterns:**

- `src/lib/validation/index.ts` — check import path
- Any 3 validation schema files — check `z.object`, `z.enum`, `safeParse` usage

**Cosmos DB patterns:**

- `src/lib/cosmos.ts` — check `CosmosClient` constructor, `getContainer`
- Any 2 route handlers with `.query()` calls — check query API shape

**shadcn/ui patterns:**

- Any 3 component files from `src/components/` — check import paths
- Check `src/components/ui/` directory structure matches expected primitives

### Step 4 — Compare and Report

For each library, compare the live documentation from Step 2 against the code
patterns from Step 3. Check these specific invariants:

**Next.js invariants:**

- [ ] `params` in route handlers is `Promise<{...}>` (awaited before use)
- [ ] `searchParams` in page components is `Promise<{...}>` (awaited before use)
- [ ] Middleware exports a named `middleware` function (not default)
- [ ] `NextResponse.json()` used for route handler responses
- [ ] `'use client'` directive placement is correct

**Zod invariants:**

- [ ] Import path matches current Zod version (`zod` vs `zod/v4`)
- [ ] `safeParse` return shape: `{ success, data, error }`
- [ ] `z.enum()` syntax is current
- [ ] `z.number().int()` chain is valid
- [ ] `z.string().min().max()` chain is valid

**Cosmos DB invariants:**

- [ ] `CosmosClient` constructor accepts `{ endpoint, key }` for emulator
- [ ] `DefaultAzureCredential` from `@azure/identity` for production
- [ ] `container.items.query({ query, parameters })` signature is current
- [ ] `.fetchAll()` returns `{ resources }` shape
- [ ] Parameterized queries use `@param` syntax

**shadcn/ui invariants:**

- [ ] Component imports from `@/components/ui/<name>`
- [ ] `cn()` utility uses `clsx` + `tailwind-merge`
- [ ] CLI command is `npx shadcn@latest add` (not `shadcn-ui`)

## Output Expectations

Produce a single structured report in this format:

```markdown
# Context7 Validation Report

**Date:** YYYY-MM-DD
**Libraries checked:** 4
**Overall status:** PASS | FAIL | PARTIAL

## Next.js 16

- **Status:** PASS | FAIL
- **Library ID:** (resolved ID)
- **Findings:**
  - (list any mismatches or confirmations)

## Zod 4

- **Status:** PASS | FAIL
- **Library ID:** (resolved ID)
- **Findings:**
  - (list any mismatches or confirmations)

## Cosmos DB SDK v4

- **Status:** PASS | FAIL
- **Library ID:** (resolved ID)
- **Findings:**
  - (list any mismatches or confirmations)

## shadcn/ui

- **Status:** PASS | FAIL
- **Library ID:** (resolved ID)
- **Findings:**
  - (list any mismatches or confirmations)

## Action Items

- [ ] (any required code changes, ordered by severity)
```

Display the report in chat. If any library has FAIL status, list the specific
files and line ranges that need updating.

## Fallback

If Context7 returns errors for any library:

1. Report which libraries could not be verified
2. Note the error type (auth, timeout, rate limit, not found)
3. Recommend running the mechanical checks as a fallback:
   ```bash
   cd apps/web && npm run type-check && npm run lint && npm run build
   ```
4. Do NOT silently skip failed libraries — report them prominently

## Quality Assurance

- All 4 libraries must be checked — partial runs are reported as PARTIAL
- Each invariant check must reference the specific Context7 doc snippet used
- No code modifications in this prompt — audit only
- Report must be actionable: file paths, line numbers, and fix descriptions
