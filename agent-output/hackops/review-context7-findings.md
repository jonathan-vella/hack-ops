# Context7 Library Audit Findings

> Phase R2 of the end-to-end code review.
> Generated: 2026-03-08

## Summary

| Library                | Version | Files Checked                  | Issues Found        | Fixed | Status     |
| ---------------------- | ------- | ------------------------------ | ------------------- | ----- | ---------- |
| Next.js                | ^16.1.6 | 24 routes, 10 pages, 1 layout  | 0                   | 0     | Clean      |
| Zod                    | ^4.3.6  | 13 validation files, 24 routes | 0                   | 0     | Clean      |
| mssql                  | ^12.2.0 | 1 (sql.ts)                     | 0 breaking, 1 style | 0     | Acceptable |
| React                  | ^19.1.0 | 20+ components, 2 hooks        | 0                   | 0     | Clean      |
| @testing-library/react | ^16.2.0 | 0 component tests (planned R7) | N/A                 | N/A   | Deferred   |
| Tailwind CSS           | ^4.1.0  | globals.css, 20+ components    | 0                   | 0     | Clean      |
| shadcn/ui + radix-ui   | ^1.4.3  | 10 UI primitives               | 0                   | 0     | Clean      |
| Vitest                 | ^4.0.18 | vitest.config.ts, 6 test files | 0                   | 0     | Clean      |

**Total breaking issues: 0**
**Total deprecated issues: 0**
**Total style observations: 1**

---

## Next.js 15 (App Router)

### Findings

**Route handler exports**: All 24 route files use the `export const METHOD = requireAuth(...)` or `export const METHOD = requireRole(...)(...)` higher-order function pattern. This produces valid named exports of the correct HTTP method names (GET, POST, PATCH, DELETE) and is fully compatible with Next.js 15+ App Router conventions.

**`params` as Promise**: The `RouteContext` type in `guards.ts` correctly defines `params: Promise<Record<string, string>>`. All route handlers that access params do so via `await context.params` — the correct Next.js 15+ pattern where params became async.

**`NextResponse.json()`**: All 105 response calls consistently use `NextResponse.json()` from `next/server`. No route uses the bare `Response.json()` pattern. Both are valid in Next.js 15, but the codebase is consistent.

**`cookies()` / `headers()`**: No route uses the `cookies()` or `headers()` functions from `next/headers`. Instead, all auth checks read `request.headers.get("x-ms-client-principal")` directly from the `NextRequest` object, which is correct and avoids the async migration concern (in Next.js 15, `cookies()` and `headers()` became async).

**`"use client"` boundaries**: 10 pages + 18 components correctly use `"use client"`. No API route files have it. No metadata exports exist in client components. Server-only pages (root layout, leaderboard pages) correctly export metadata without `"use client"`.

**`generateMetadata`**: The `leaderboard/[id]/page.tsx` correctly types params as `Promise<{ id: string }>` and awaits it — proper Next.js 15+ pattern.

**Middleware**: No `middleware.ts` file exists. Auth is handled at the route handler level via guards. This is a valid architectural choice.

### Fixes Applied

None needed.

---

## Zod 4

### Findings

**No deprecated patterns**: The codebase does not use any Zod 3 patterns that were deprecated in Zod 4:

- No `.strict()` (would need `z.strictObject()`)
- No `.passthrough()` (would need `z.looseObject()`)
- No `.format()` or `.flatten()` on ZodError (would need `z.treeifyError()`)
- No `invalid_type_error` / `required_error` params (would need `error` function)

**`safeParse` error extraction**: All route handlers use `result.error.issues.map(i => ({ path: i.path, message: i.message }))` which is Zod 4 compatible — the `$ZodIssueBase` interface retains `path` and `message` properties.

**`z.coerce`**: 6 usages of `z.coerce.number()` and `z.coerce.boolean()` for query parameter parsing. In Zod 4, the input type changed to `unknown` (from the target type in Zod 3), but this is correct for query param coercion where inputs are strings.

**Schema composition**: Standard `z.object()`, `z.enum()`, `z.array()` patterns with `.optional()` and `.min()/.max()` chains. All compatible with Zod 4.

### Fixes Applied

None needed.

---

## mssql (node-mssql)

### Findings

**Pool configuration**: Standard pattern with `max: 10, min: 0, idleTimeoutMillis: 30_000`. Matches Context7 recommended config from node-mssql docs.

**Parameterized queries**: Uses `request.input(key, value)` without explicit SQL type declarations (e.g., `sql.NVarChar`). The mssql library auto-detects types from JavaScript values, which works correctly but is less strict than explicit typing. This is a style observation, not a breaking issue.

**Entra ID token**: Uses `azure-active-directory-access-token` authentication type with `@azure/identity` DefaultAzureCredential — correct and documented approach.

**Token refresh**: Pool reconnects when token is within 60s of expiry (`now < tokenExpiresAt - 60_000`). Properly closes the old pool before creating a new one. Good pattern.

**Pool drain**: `pool.close()` called before reconnection — correct cleanup.

**Transactions**: Proper `begin()` / `commit()` / `rollback()` pattern with try/catch. Each statement within the transaction creates a `new sql.Request(txn)` — correct per node-mssql docs.

### Style Observations

| File             | Lines              | Pattern                                                | Note                                                                                                                                                                                  | Severity |
| ---------------- | ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `src/lib/sql.ts` | query(), execute() | `request.input(key, value)` without explicit SQL types | Auto-detection works but explicit types (`sql.NVarChar`, `sql.Int`) are more defensive. Acceptable for this codebase since all SQL uses `@param` placeholders with auto-typed values. | `style`  |

### Fixes Applied

None needed.

---

## React 19

### Findings

**Hook usage**: Standard `useState`, `useEffect`, `useCallback`, `useRef`, `useMemo` patterns. No deprecated lifecycle methods or legacy context API usage.

**Custom hooks**: `use-auth.ts` and `use-fetch.ts` follow standard patterns. `use-auth.ts` correctly uses `"use client"` directive.

**Server/client boundary**: Clean separation — interactive components use `"use client"`, server components handle data fetching and metadata exports.

**No React 19 `use()` hook**: The codebase doesn't use the new React 19 `use()` hook for reading promises/context in render. This is not required — the existing hook patterns are fully valid.

### Fixes Applied

None needed.

---

## @testing-library/react

### Findings

**No component test files exist yet**: The existing 6 test files are all API route handler tests that call exports directly with mock dependencies. No React component rendering tests exist. Component testing is planned for Phase R7.

**Library installed correctly**: `@testing-library/react: ^16.2.0` is in devDependencies. Vitest config includes `jsdom` environment which is required for Testing Library.

### Fixes Applied

None needed. Full audit deferred to R7 when component tests are written.

---

## Tailwind CSS v4

### Findings

**CSS-first config**: The project uses `@import "tailwindcss"` + `@theme inline` in `globals.css` — the correct Tailwind v4 configuration approach. No `tailwind.config.js` or `tailwind.config.ts` file exists (correct — Tailwind v4 moved to CSS-based config).

**PostCSS**: `postcss.config.mjs` exists with `@tailwindcss/postcss` plugin — correct v4 setup.

**Custom theme tokens**: Custom colors (`neon-cyan`, `neon-blue`, `surface`, etc.) and sidebar colors defined via CSS custom properties in `@theme inline` — proper v4 pattern.

### Fixes Applied

None needed.

---

## shadcn/ui + Radix UI

### Findings

**Unified radix-ui package**: All 10 UI primitive components import from `"radix-ui"` (unified package v1.4.3), not the deprecated `@radix-ui/*` scoped packages. This is the correct modern pattern.

**Component structure**: Standard shadcn/ui composition with `cn()` utility, `cva()` variants, `Slot` for polymorphic components, `forwardRef` for forwarding refs. All patterns are current.

**Accessibility**: Radix primitives provide built-in accessibility (ARIA attributes, keyboard navigation). No obvious accessibility gaps in the wrapper components.

### Fixes Applied

None needed.

---

## Vitest 4

### Findings

**Config**: `vitest.config.ts` uses `defineConfig` from `vitest/config`, coverage provider `v8`, `jsdom` environment, `globals: true` — all standard Vitest 4 patterns.

**`vi.mock()` hoisting**: All 6 test files use top-level `vi.mock()` factory calls which are auto-hoisted by Vitest. No issues with hoisting behavior.

**`vi.mocked()`**: Used correctly for typed mock access (e.g., `vi.mocked(query)`) — standard Vitest pattern.

**No `vi.stubEnv` or `vi.importActual`**: Not used in current tests. Will be verified when new tests are added in later phases.

**Coverage thresholds**: `lines: 90, branches: 80` — configured and enforced.

### Fixes Applied

None needed.

---

## Conclusion

The HackOps codebase demonstrates strong alignment with current library documentation. All libraries are used according to their latest documented patterns:

- **Next.js 15+ async params** correctly implemented
- **Zod 4** with no v3 deprecation remnants
- **mssql** with proper Entra ID token management
- **Tailwind CSS v4** CSS-first configuration
- **Radix UI** unified package imports

No breaking or deprecated patterns were found. The single style observation (auto-typed SQL parameters) is acceptable and documented.
