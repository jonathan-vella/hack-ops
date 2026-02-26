---
description: 'Scaffold Turborepo + Next.js 15 monorepo with shared packages, Cosmos DB emulator config, and seed script'
agent: 11-App Scaffolder
tools:
  [
    'read/readFile',
    'edit/editFiles',
    'edit/createFile',
    'edit/createDirectory',
    'search/textSearch',
    'search/fileSearch',
    'search/listDirectory',
    'execute/runInTerminal',
    'execute/runTests',
  ]
---

# Scaffold HackOps Monorepo

Set up the Turborepo + Next.js 15 monorepo, shared type
packages, Cosmos DB emulator config, and dev environment.

## Mission

Create the entire project scaffold so that `npm run build`
succeeds, the dev server starts, and the health endpoint
returns `{ status: "ok" }`. This prompt does NOT implement
business logic — only project structure and plumbing.

## Scope & Preconditions

- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — read `Phase 1: Monorepo Scaffold & Dev Environment`
- **Data model**: `docs/data-model.md` — 10 container
  interfaces to create in `packages/shared/types/`
- **API contract**: `packages/shared/types/api-contract.ts`
  — already exists; do NOT overwrite
- **Env config**: `docs/environment-config.md` — variable
  reference for `.env.example`
- **Skills**: Read `nextjs-patterns`, `cosmos-db-sdk`,
  `zod-validation`, and `hackops-domain` skills before starting

## Workflow

### Step 1 — Read context

Read these files (in order):

1. `.github/prompts/plan-hackOps.prompt.md` — Phase 1 section
2. `docs/data-model.md` — all 10 container schemas
3. `docs/environment-config.md` — env var reference
4. `packages/shared/types/api-contract.ts` — existing types
5. `.github/skills/nextjs-patterns/SKILL.md`
6. `.github/skills/cosmos-db-sdk/SKILL.md`

### Step 2 — Create monorepo structure

1. Initialize Turborepo at project root with `turbo.json`
   defining pipelines: `build`, `lint`, `type-check`, `test`
2. Create `apps/web/` with Next.js 15 (App Router), TypeScript,
   Tailwind CSS 4, ESLint
3. Create `packages/shared/` with `package.json` (`@hackops/shared`)
   exporting types from `types/`
4. Configure workspace references so `apps/web` can import
   from `@hackops/shared`

### Step 3 — Install dependencies

In `apps/web/`:

- `@azure/cosmos`, `@azure/identity` — Cosmos DB SDK + auth
- `zod` — runtime validation
- `next-themes` — dark mode support
- Dev: `vitest`, `@testing-library/react`, `@types/node`

Install and configure shadcn/ui — init + base components:
`Button`, `Card`, `Table`, `Badge`, `Dialog`, `Input`,
`Select`, `Tabs`, `DropdownMenu`, `Sheet`

### Step 4 — Create shared types

In `packages/shared/types/`, create one file per container
matching `docs/data-model.md` interfaces:

- `hackathon.ts`, `team.ts`, `hacker.ts`, `score.ts`,
  `submission.ts`, `rubric.ts`, `config.ts`, `role.ts`,
  `challenge.ts`, `progression.ts`
- `index.ts` — re-exports all interfaces

Do NOT duplicate types already in `api-contract.ts`. Import
and re-export where appropriate.

### Step 5 — Create core lib files

In `apps/web/src/lib/`:

- `cosmos.ts` — Cosmos DB client singleton with factory
  function: connection string auth for emulator, managed
  identity (`DefaultAzureCredential`) for production.
  Export typed container accessors for all 10 containers.
- `auth.ts` — stub with Easy Auth header parsing signature
  (implementation in app-02)
- `validation/index.ts` — stub for Zod middleware
  (implementation in app-02)

### Step 6 — Create initial pages

- `apps/web/src/app/layout.tsx` — root layout with Tailwind,
  font setup, metadata
- `apps/web/src/app/page.tsx` — landing page (hello world
  or login redirect stub)
- `apps/web/src/app/api/health/route.ts` — returns
  `{ status: "ok", timestamp: ISO string }`

### Step 7 — Environment configuration

- Create `apps/web/.env.example` from
  `docs/environment-config.md`
- Create `apps/web/.env.local` (gitignored) with Cosmos DB
  emulator defaults
- Add `NODE_TLS_REJECT_UNAUTHORIZED=0` for emulator
  self-signed cert

### Step 8 — Seed script

Create `scripts/seed-cosmos.ts`:

- Creates all 10 containers with correct partition keys
- Inserts sample documents from `docs/data-model.md` examples
- Idempotent — safe to run multiple times

### Step 9 — Validate

Run these commands and fix any errors:

1. `npm install` — all dependencies resolve
2. `npm run build` — TypeScript compiles, Next.js builds
3. `npm run type-check` — zero type errors
4. `npm run lint` — zero lint errors

## Output Expectations

- Monorepo at project root with `turbo.json`
- Next.js 15 app in `apps/web/`
- Shared types in `packages/shared/`
- Health endpoint at `/api/health`
- Seed script at `scripts/seed-cosmos.ts`
- `.env.example` with all required variables

## Exit Criteria

- `npm run build` succeeds with zero errors
- `npm run type-check` passes
- Health route returns `{ status: "ok" }`

## Quality Assurance

- [ ] Turborepo pipelines configured (`build`, `lint`, `type-check`, `test`)
- [ ] All 10 container interfaces created in `packages/shared/types/`
- [ ] `@hackops/shared` importable from `apps/web`
- [ ] Cosmos DB client singleton with emulator/production factory
- [ ] `.env.example` matches `docs/environment-config.md`
- [ ] shadcn/ui initialized with base components
- [ ] No hardcoded secrets in committed files
