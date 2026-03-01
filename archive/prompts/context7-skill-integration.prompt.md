````prompt
---
description: 'Merge duplicate instructions into skills, slim api-routes, and add Context7 Dynamic Verification sections to 6 skills/instructions'
agent: agent
tools:
  [
    'read/readFile',
    'edit/editFiles',
    'edit/createFile',
    'search/textSearch',
    'search/fileSearch',
    'search/listDirectory',
    'execute/runInTerminal',
    'mcp_context7_resolve-library-id',
    'mcp_context7_query-docs',
  ]
---

# Context7 Skill Integration

Integrate Context7 MCP dynamic verification into 6 skills/instructions and
consolidate 2 duplicate instruction files.

## Background

Context7 MCP (`mcp_context7_resolve-library-id` and `mcp_context7_query-docs`)
is configured in `.vscode/mcp.json` and provides real-time library documentation
lookups. Several skills and instruction files in this repo hardcode
version-specific API patterns for Next.js, Zod, Cosmos DB SDK, shadcn/ui, and
Vitest. These patterns can silently go stale. This prompt updates those files so
agents auto-verify patterns against the latest docs at both code generation and
review time.

Additionally, two instruction files are near-complete duplicates of their
corresponding skills. Now that Context7 handles dynamic verification, the
duplication is pure context-window waste.

## Scope & Preconditions

- This is a self-contained refactoring task — no application code changes
- All files live under `.github/skills/` and `.github/instructions/`
- Context7 MCP must be available (check `.vscode/mcp.json` has the `context7`
  server entry)
- Read each file fully before editing — do NOT guess at content

## Phase 1 — Merges & Slimming (3 operations)

### 1A. Merge `nextjs.instructions.md` into `nextjs-patterns/SKILL.md`

**What to do:**

1. Open `.github/instructions/nextjs.instructions.md` fully (DELETED — merged)
2. Open `.github/skills/nextjs-patterns/SKILL.md` fully
3. Identify content in the instruction that is NOT already in the skill:
   - The "Configuration" section with these 3 rules:
     - `output: "standalone"` in `next.config.ts` for container deployment
     - Environment variables: use `NEXT_PUBLIC_` prefix only for client-side values
     - Server-only secrets: access via `process.env` in route handlers and Server Components
   - The explicit rule: "Pages go under `src/app/(dashboard)/` or similar route groups"
4. Add a new `## Configuration` section to the skill (before `## References`)
   containing those rules
5. Delete `.github/instructions/nextjs.instructions.md`

**Verification:** The skill must contain ALL content that was in the instruction.
Nothing should be lost.

### 1B. Merge `react-components.instructions.md` into `shadcn-ui-patterns/SKILL.md`

**What to do:**

1. Open `.github/instructions/react-components.instructions.md` fully (DELETED — merged)
2. Open `.github/skills/shadcn-ui-patterns/SKILL.md` fully
3. Identify content in the instruction that is NOT already in the skill:
   - **Component Rules** section: functional components only, one per file,
     props as `interface`, destructure props in signature
   - **Styling** section: Tailwind classes (no inline style), `cn()` utility,
     semantic tokens, responsive mobile-first breakpoints
   - **State Management** section: local state, server state, URL state,
     no global state library
   - **Event Handlers** section: handler in component body, no complex inline arrows
   - **Client Components** rule: "Never import server-only modules in client components"
   - **Accessibility** additions: keyboard navigation uses `tabIndex`,
     screen readers use semantic HTML (`<nav>`, `<main>`)
4. Add these as new sections in the skill. Suggested placement:
   - Add `## Component Rules` after the existing `## Component Location` section
   - Add `## Styling` after `## Composition Example` (merge with/expand existing Theming)
   - Add `## State Management` after `## Form Pattern`
   - Add `## Event Handlers` after `## State Management`
   - Expand the existing `## Accessibility` section with the missing items
5. Delete `.github/instructions/react-components.instructions.md`

**Verification:** The skill must contain ALL content that was in the instruction.
Nothing should be lost.

### 1C. Slim `api-routes.instructions.md`

**What to do:**

1. Read `.github/instructions/api-routes.instructions.md` fully
2. Identify content that duplicates the 3 skills (nextjs-patterns, zod-validation,
   cosmos-db-sdk):
   - The full 40-line route handler template — this composites code from all 3 skills
   - The `safeParse` validation rules table — duplicates `zod-validation` skill
   - The `getContainer` + `container.items.create` code — duplicates `cosmos-db-sdk` skill
3. Replace the full route handler template with a **structural skeleton** that shows
   the 5-step sequence without duplicating library syntax:

   ```typescript
   export async function POST(request: Request) {
     // 1. Auth guard — requireAuth + requireRole
     // 2. Validate input — Zod safeParse (see zod-validation skill)
     // 3. Business logic — delegate to service layer (see cosmos-db-sdk skill)
     // 4. Audit log — auditLog() call
     // 5. Response — NextResponse.json (see nextjs-patterns skill)
   }
   ```

4. Remove the duplicated validation rules table
5. Keep ALL unique content:
   - Canonical Type Source rule
   - Auth Guard Pattern section
   - Error Response Format section
   - Audit Logging section
   - Route File Organization section
   - State Machine Enforcement section
6. Add orientation note referencing the 3 skills:

   > Library patterns (Next.js, Zod, Cosmos DB) are in dedicated
   > skills. This instruction defines application-specific rules.
   > **orchestration invariants** that combine them.

**Verification:** The file should be ~60% shorter. All unique invariants must remain.

## Phase 2 — Context7 Dynamic Verification Sections (6 files)

Add a `## Context7 Dynamic Verification` section to each of the following files.
Insert it **immediately before** the `## References` section (or at the end if no
References section exists).

### Rules for ALL verification sections

Each section MUST follow this exact structure:

```markdown
## Context7 Dynamic Verification

Agents MUST cross-check this skill's patterns against live documentation at
**both code generation and review time**.

### When to Verify

- Before generating code that uses patterns from this skill
- During code review passes (app-review-subagent, app-lint-subagent)

### Verification Steps

1. Call `resolve-library-id` for `<LIBRARY_NAME>` to get the current library ID
2. Call `query-docs` with the resolved ID and topic `"<QUERY_1>"` (set tokens to 5000)
3. Call `query-docs` with the resolved ID and topic `"<QUERY_2>"` (set tokens to 5000)
4. Compare returned docs against skill patterns
5. If patterns changed, flag discrepancy before proceeding

### What to Cross-Check

- <BULLET_1>
- <BULLET_2>
- <BULLET_3>

### Fallback

If Context7 is unavailable (network error, rate limit, timeout):

1. **Warn the user** that live verification was not possible
2. **Ask for confirmation** before proceeding with the skill's hardcoded patterns
3. Do NOT silently fall back — the user must acknowledge the risk
```

### 2A. `nextjs-patterns/SKILL.md`

- Library: `next.js`
- Query 1: `"route handler params searchParams async API"` — verifies the
  `params` as Promise pattern and route handler signatures
- Query 2: `"server components client components use client directive"` — verifies
  server/client boundary rules
- Cross-check bullets:
  - `params` type signature in route handlers (currently `Promise<{...}>`)
  - `searchParams` type signature in page components (currently `Promise<{...}>`)
  - Server Action directive (`'use server'`)
  - Middleware API and config shape

### 2B. `zod-validation/SKILL.md`

- Library: `zod`
- Query 1: `"zod v4 import path safeParse parse validation"` — verifies the
  `zod/v4` import convention and core validation API
- Query 2: `"zod iso datetime coerce string number schema"` — verifies
  `z.iso.datetime()`, `z.coerce`, and other methods used in schemas
- Cross-check bullets:
  - Import path (`zod/v4` vs `zod`)
  - `safeParse` return type shape (`{ success, data, error }`)
  - `z.iso.datetime()` availability and syntax
  - `z.coerce.number()` behavior

### 2C. `cosmos-db-sdk/SKILL.md`

- Library: `@azure/cosmos`
- Query 1: `"CosmosClient initialization database container"` — verifies client
  setup and container access patterns
- Query 2: `"query items parameterized bulk operations error handling"` — verifies
  query API, bulk ops, and `ErrorResponse` class
- Cross-check bullets:
  - `CosmosClient` constructor options
  - `container.items.query()` method signature and parameter format
  - `container.items.bulk()` operation type shape
  - `ErrorResponse` class and error code properties

### 2D. `shadcn-ui-patterns/SKILL.md`

- Library: `shadcn/ui`
- Query 1: `"shadcn ui components Card Dialog Form Button usage"` — verifies
  component import paths and prop interfaces
- Query 2: `"shadcn ui form react-hook-form zod resolver integration"` — verifies
  the Form + Zod integration pattern
- Cross-check bullets:
  - Component import paths (`@/components/ui/...`)
  - `Form` component composition with `FormField`, `FormItem`, `FormControl`
  - `zodResolver` integration with `useForm`
  - CLI command for adding components (`npx shadcn@latest add`)

### 2E. `testing.instructions.md`

- Library: `vitest`
- Query 1: `"vitest mock vi.fn vi.mock vi.spyOn API"` — verifies mock API
  function signatures
- Query 2: `"vitest configuration coverage setup beforeEach"` — verifies config
  patterns and lifecycle hooks
- Cross-check bullets:
  - `vi.mock()` signature and auto-mock behavior
  - `vi.stubEnv()` availability and API
  - `vi.importActual()` usage for partial mocks
  - Config file structure (`vitest.config.ts` shape)

### 2F. `api-routes.instructions.md`

This is the composite instruction that orchestrates patterns from 3 libraries.
Add a verification section that covers all three:

- Libraries: `next.js`, `zod`, `@azure/cosmos`
- Steps:
  1. Resolve library IDs for all three libraries
  2. Query `next.js` docs for `"NextResponse json route handler API"` (tokens: 3000)
  3. Query `zod` docs for `"safeParse error issues validation"` (tokens: 3000)
  4. Query `@azure/cosmos` docs for `"container items create upsert"` (tokens: 3000)
- Cross-check bullets:
  - `NextResponse.json()` generic type parameter support
  - `safeParse` result shape (`success`, `data`, `error.issues`)
  - `container.items.create()` return type and `resource` property
  - `requireAuth` / `requireRole` patterns (these are project-specific — skip
    Context7 for auth, just verify the library APIs they depend on)

## Execution Order

1. Phase 1A — merge nextjs instruction into skill
2. Phase 1B — merge react-components instruction into skill
3. Phase 1C — slim api-routes instruction
4. Phase 2A — add Context7 section to nextjs-patterns skill
5. Phase 2B — add Context7 section to zod-validation skill
6. Phase 2C — add Context7 section to cosmos-db-sdk skill
7. Phase 2D — add Context7 section to shadcn-ui-patterns skill
8. Phase 2E — add Context7 section to testing instruction
9. Phase 2F — add Context7 section to api-routes instruction

## Output Expectations

After all 9 steps:

- 2 instruction files deleted: `nextjs.instructions.md`, `react-components.instructions.md`
- 4 skill files updated: `nextjs-patterns`, `zod-validation`, `cosmos-db-sdk`,
  `shadcn-ui-patterns`
- 2 instruction files updated: `testing.instructions.md`, `api-routes.instructions.md`
- Zero information loss from the merges
- All Context7 verification sections follow the exact template above

## Quality Assurance

After completing all changes:

1. Run `node scripts/validate-skills-format.mjs` — must pass
2. Run `node scripts/validate-instruction-frontmatter.mjs` — must pass
3. Run `node scripts/validate-instruction-references.mjs` — must pass (after deletes)
4. Verify each modified file has valid YAML frontmatter
5. Verify no file references the deleted instruction files
6. Report a summary of all changes to the user
````
