# HackOps Execution Blueprint — From Plan to Product

> Azure hackathon management platform for structured MicroHack events.
> Sequences ~42 artifacts across 6 phases to go from "plan on paper" to "deployed product."
> Infra-first execution order. Full PRD and backlog established before any code generation.

---

## Context

You have a battle-tested agent framework (10 agents, 5 subagents, 14 skills, 21 instructions, 14 validators, 3 CI workflows, Azure Pricing MCP v4.1.0) and a detailed 539-line technical plan (`plan-hackOps.prompt.md`) — but zero application code, zero Bicep templates, and no product requirements document. This blueprint sequences what you need to create to go from plan to deployed product.

### Current State

| Category                                      | Status      |
| --------------------------------------------- | ----------- |
| Agent framework (10 agents, 5 subagents)      | Complete    |
| Skills (14)                                   | Complete    |
| Instructions (21)                             | Complete    |
| MCP Server (Azure Pricing, v4.1.0)            | Complete    |
| CI/CD (lint, agent-validation, entropy-check) | Complete    |
| Validation scripts (14)                       | Complete    |
| Dev container (Ubuntu 24.04, full toolchain)  | Complete    |
| Challenger review (13/13 findings resolved)   | Complete    |
| Application code (Next.js, TypeScript)        | Not started |
| Bicep templates (9 AVM modules planned)       | Not started |
| Agent-output artifacts (7-step workflow docs) | Not started |
| App CI/CD workflows                           | Not started |
| Product requirements document                 | Not started |

### Decisions Made

- **Backlog**: GitHub Issues + GitHub Projects board (MCP-managed by Copilot)
- **App-dev approach**: New dedicated agents + skills (mirrors the infra agent pattern)
- **PRD depth**: Full PRD with user stories + acceptance criteria
- **Execution order**: Infra first, then app (app prompts reference real Azure endpoints)

### Effort Estimates (T-shirt sizing, solo dev with agent assistance)

| Phase                  | Effort         | Notes                                  |
| ---------------------- | -------------- | -------------------------------------- |
| Phase A (product docs) | ~3-5 days      | Agent-assisted via doc-gen prompts     |
| Phase B (backlog)      | ~1 day         | Automated via generation prompt        |
| Phase C (toolchain)    | ~3-5 days      | Includes Learn MCP research for skills |
| Phase D (infra)        | ~2-3 days      | Full 7-step workflow run               |
| Phase E (app build)    | ~2-3 weeks     | ~1-2 days per prompt, 10 prompts       |
| Phase F (supporting)   | Ongoing        | Fill in alongside other phases         |
| **Total**              | **~6-8 weeks** | Calendar time, not continuous effort   |

### Branch Strategy

All new artifacts are created on feature branches, not directly on main:

| Branch                      | Contents                                                           | Merge gate                                                                            |
| --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `feature/product-docs`      | Phase A docs (PRD, API contract, data model, UI pages, env config) | `npm run lint:md` passes                                                              |
| `feature/app-dev-toolchain` | Phase C agents, skills, instructions, issue templates              | `npm run validate` passes (agent-frontmatter, skills-format, instruction-frontmatter) |
| `feature/prompts`           | Phase B + D + E prompts                                            | `npm run lint:md` passes, all referenced agents/skills exist on main                  |
| Main-direct                 | Phase F supporting docs, meta-doc updates                          | Standard PR review                                                                    |

Merge order: product-docs → app-dev-toolchain → prompts. Each branch must pass CI before merging to main.

---

## Phase A — Product Documentation (create before anything else)

These documents become the source of truth that feeds both the backlog and the agent prompts. Each doc has a **dedicated generation prompt** — Phase A is agent-assisted, not manual.

### A0. Doc-generation prompts (create FIRST)

Create in `.github/prompts/` — these drive the creation of all Phase A documents:

| Prompt file                            | Output                                                           | What it does                                                                                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `doc-prd-generator.prompt.md`          | `docs/prd.md`                                                    | Reads `plan-hackOps.prompt.md` (Phases 5-10, Application Summary, Key Invariants) and generates the full PRD with user stories and acceptance criteria. References the `hackops-domain` skill for business rule accuracy. |
| `doc-api-contract-generator.prompt.md` | `packages/shared/types/api-contract.ts` + `docs/api-contract.md` | Reads the plan's ~16 endpoints across Phases 6-10 and generates both TypeScript type definitions (source of truth) and a human-readable markdown reference.                                                               |
| `doc-data-model-generator.prompt.md`   | `docs/data-model.md`                                             | Reads the 10 container definitions and partition keys, generates TypeScript interfaces with sample documents.                                                                                                             |

Each prompt includes `agent: agent` and `tools:` for file creation and workspace search. They read `plan-hackOps.prompt.md` as their primary input.

### A1. Product Requirements Document (PRD)

- **Create via**: `doc-prd-generator.prompt.md`
- **Output**: `docs/prd.md`
- **Sections**: Product vision, success metrics, user personas (Admin/Coach/Hacker/Anonymous with goals and pain points), feature breakdown by domain (Hackathon lifecycle, Team management, Scoring engine, Leaderboard, Challenge progression, Admin ops, Audit trail), user stories with acceptance criteria per feature (format: `As a [role], I want [action], so that [outcome]` + Given/When/Then acceptance criteria), non-functional requirements (performance, security, accessibility, compliance), out-of-scope items
- **Source material**: `.github/prompts/plan-hackOps.prompt.md` Phases 5-10, plus the Application Summary and Key Invariants sections
- **Estimated**: ~60-80 user stories across 7 feature domains

### A2. API Contract (TypeScript types + reference doc)

- **Create via**: `doc-api-contract-generator.prompt.md`
- **Primary output**: `packages/shared/types/api-contract.ts` — TypeScript interfaces for all request/response shapes, imported by BOTH route handlers and frontend code. Type errors catch contract drift at compile time (Golden Principle 10: mechanical enforcement).
- **Secondary output**: `docs/api-contract.md` — human-readable reference with method, path, auth requirement, role requirement, error responses, rate limiting behavior
- **Groups**: Health, Hackathons, Teams, Submissions, Scores, Rubrics, Challenges, Progression, Roles, Audit, Leaderboard
- **Sync mechanism**: Route handlers and frontend components MUST import types from `packages/shared/types/api-contract.ts`. The `api-routes.instructions.md` instruction enforces this. Type-check CI catches any drift.

### A3. Data Model Reference

- **Create via**: `doc-data-model-generator.prompt.md`
- **Output**: `docs/data-model.md`
- **Content**: All 10 Cosmos DB containers: TypeScript interface definitions, partition key rationale, indexing policy recommendations, cross-container query patterns, sample documents
- **Patterns**: Pointer + versioned docs for rubrics, staging → approved flow for submissions, progression unlock model

### A4. UI Page Inventory

- **Create**: `docs/ui-pages.md` (manual or Copilot-assisted from plan Phases 6-10)
- **Content**: Every page/route in the app: path, role requirement, layout description, key components, data dependencies, interaction flows
- **Pages**: `/` (landing), `/join` (hacker onboarding), `/dashboard` (role-scoped), `/leaderboard/:id`, `/admin/hackathons`, `/admin/teams`, `/admin/rubrics`, `/admin/audit`, `/admin/roles`, `/admin/config`
- **Reference**: shadcn/ui components to use for each page

### A5. Environment Configuration Reference

- **Create**: `docs/environment-config.md` (manual or Copilot-assisted)
- **Content**: Every environment variable the app needs: name, description, source (Key Vault / App Settings / local .env), dev vs prod values, the Easy Auth header parsing contract

---

## Phase B — Backlog Scaffold (GitHub Issues + Projects Board)

### B0. Bootstrap issues (create BEFORE Phase A work begins)

Manually create 10-12 tracking issues before starting any Phase A work. These provide progress visibility during the bootstrap period when the automated backlog doesn't exist yet:

- `[Epic] Phase A: Product Documentation` — tracks PRD, API contract, data model, UI pages, env config
- `[Epic] Phase C: App-Dev Toolchain` — tracks agents, skills, instructions, templates
- `Create PRD`, `Create API contract types`, `Create data model`, `Create UI pages`, `Create env config`
- `Create app-dev agents (11-16)`, `Create app-dev skills`, `Create app-dev instructions`, `Register instructions in devcontainer`, `Create app-dev subagents`

Label all with `epic` or appropriate phase labels. This is ~10 minutes of manual work that prevents losing track of progress during the multi-day bootstrap.

### B1. Create label taxonomy

- **Add labels**: `app`, `frontend`, `backend`, `api`, `database`, `auth`, `testing`, `phase-1` through `phase-12`, `epic`, `prd`, `blocked`
- **Keep existing**: `bug`, `enhancement`, `infrastructure`, `bicep`, `copilot-agent`, `documentation`, `scenario`

### B2. Create milestones mapping to plan phases

- 12 milestones matching `plan-hackOps.prompt.md` phases:
  - `Phase 1: Monorepo Scaffold`
  - `Phase 1.5: Governance Discovery`
  - `Phase 2: IaC Foundation`
  - `Phase 3: Database IaC & Schema`
  - `Phase 4: Compute IaC & Deployment`
  - `Phase 5: Auth & Authorization`
  - `Phase 6: Core API — Hackathon & Teams`
  - `Phase 7: Scoring Engine & Submissions`
  - `Phase 8: Leaderboard & Live Updates`
  - `Phase 9: Challenge Progression & Gating`
  - `Phase 10: Admin & Operational Features`
  - `Phase 11: CI/CD Pipeline`
  - `Phase 12: Production Hardening`
- Each milestone has a description sourced from the plan's "Goal" and "Exit criteria" for that phase

### B3. Create a backlog generation prompt

- **Create**: `.github/prompts/generate-backlog.prompt.md`
- **Purpose**: Instructs Copilot to read the PRD (`docs/prd.md`), the plan (`plan-hackOps.prompt.md`), and the API contract (`docs/api-contract.md`) — then create GitHub Issues using MCP tools
- **Behavior**: Each user story from the PRD becomes an issue, grouped under epic issues per feature domain, assigned to the correct milestone and labels
- **Tools**: `mcp_github_issue_write`, `mcp_github_add_issue_comment`
- **Include**: Dependency map section that tags blocked/blocking relationships via issue references

### B4. Create a backlog triage prompt

- **Create**: `.github/prompts/backlog-triage.prompt.md`
- **Purpose**: Recurring prompt for Copilot to read open issues, check for completed work (closed PRs, merged code), update issue status, add progress comments, flag blocked items, and suggest next actions
- **Tools**: `mcp_github_list_issues`, `mcp_github_search_issues`, `mcp_github_issue_read`, `mcp_github_add_issue_comment`

### B5. GitHub Projects board setup

- **Document**: `docs/exec-plans/backlog-setup.md`
- **Structure**: Columns (Backlog, Ready, In Progress, Review, Done), custom fields (Phase, Domain, Complexity), views (by phase, by domain, by role)
- **Note**: Projects board creation requires manual setup or `gh` CLI — document the exact commands

---

## Phase C — App-Dev Agent Toolchain

The existing 10 agents handle infra. Create a parallel set for application code generation, with a dedicated App Conductor and validation subagents — mirroring the infra agent pattern.

### C1. New agents

Create in `.github/agents/`:

**Top-level agents:**

| #   | File                           | Name                  | Purpose                                                                                                                    | Model                           |
| --- | ------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 11  | `11-app-scaffolder.agent.md`   | `11-App Scaffolder`   | Turborepo + Next.js 15 + packages/shared scaffold, dev environment setup, Cosmos DB emulator config                        | Claude Opus 4.6                 |
| 12  | `12-api-builder.agent.md`      | `12-API Builder`      | Generates API route handlers with Zod validation, role guards, audit logging — reads API contract types as source of truth | Claude Opus 4.6 / GPT-5.3-Codex |
| 13  | `13-frontend-builder.agent.md` | `13-Frontend Builder` | Pages, layouts, shadcn/ui components, Tailwind styling — reads UI page inventory as source of truth                        | Claude Opus 4.6 / GPT-5.3-Codex |
| 14  | `14-test-writer.agent.md`      | `14-Test Writer`      | Unit tests (Vitest), integration tests (API routes against emulator), E2E stubs — reads acceptance criteria from PRD       | GPT-5.3-Codex                   |
| 15  | `15-app-deployer.agent.md`     | `15-App Deployer`     | GitHub Actions workflows for app CI/CD, App Service zip deploy, slot swaps                                                 | Claude Opus 4.6                 |
| 16  | `16-app-conductor.agent.md`    | `16-App Conductor`    | Orchestrates app-dev workflow (agents 11-15 + subagents) with approval gates. Separate from infra Conductor (01).          | Claude Opus 4.6                 |

**Subagents** (in `.github/agents/_subagents/`):

| File                           | Parent agents                 | Purpose                                                                                                        | Model         |
| ------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------- |
| `app-lint-subagent.agent.md`   | API Builder, Frontend Builder | Runs `tsc --noEmit` + ESLint, returns PASS/FAIL with error list                                                | GPT-5.3-Codex |
| `app-review-subagent.agent.md` | API Builder, Frontend Builder | Code review against api-routes, typescript, and react-components instructions, returns APPROVED/NEEDS_REVISION | GPT-5.3-Codex |
| `app-test-subagent.agent.md`   | Test Writer                   | Runs `npm test`, returns PASS/FAIL with coverage report                                                        | GPT-5.3-Codex |

Each agent follows the existing frontmatter schema, references skills via **Read** `.github/skills/{name}/SKILL.md` FIRST, and lists appropriate tools.

**Skill references for new agents** (include in agent body alongside azure-defaults):

| Agent               | Additional skill references                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| 11-App Scaffolder   | `microsoft-docs` (verify Next.js on App Service patterns)                                                   |
| 12-API Builder      | `microsoft-code-reference` (verify @azure/cosmos SDK), `hackops-domain`, `cosmos-db-sdk`, `zod-validation`  |
| 13-Frontend Builder | `microsoft-code-reference` (verify Next.js APIs), `hackops-domain`, `nextjs-patterns`, `shadcn-ui-patterns` |
| 14-Test Writer      | `hackops-domain` (business rule acceptance criteria)                                                        |
| 15-App Deployer     | `microsoft-docs` (verify App Service deployment)                                                            |

### C2. Create App Conductor (16-App Conductor)

Create a **separate** `16-app-conductor.agent.md` that orchestrates only the app-dev workflow. Do NOT expand the infra Conductor (01) beyond its current 7-step scope.

**App-dev workflow** (orchestrated by 16-App Conductor):

| Step | Agent               | Output                                              | Gate     | Exit Criteria                                         |
| ---- | ------------------- | --------------------------------------------------- | -------- | ----------------------------------------------------- |
| A1   | 11-App Scaffolder   | `apps/web/`, `packages/shared/`, `turbo.json`       | Approval | `npm run build` succeeds, Cosmos DB emulator connects |
| A2   | 12-API Builder      | `src/lib/auth.ts`, `src/middleware.ts`, role guards | Approval | Role guard unit tests pass                            |
| A3   | 12-API Builder      | Hackathon, team, join API routes                    | Validate | `tsc --noEmit` passes, endpoint tests pass            |
| A4   | 12-API Builder      | Scoring, rubric, submission API routes              | Validate | `tsc --noEmit` passes, endpoint tests pass            |
| A5   | 12-API Builder      | Challenge, progression API routes                   | Validate | `tsc --noEmit` passes, endpoint tests pass            |
| A6   | 12-API Builder      | Admin, audit, config API routes                     | Validate | `tsc --noEmit` passes, all API tests pass             |
| A7   | 13-Frontend Builder | Leaderboard page (SSR), dashboard pages             | Validate | `npm run build` succeeds, no type errors              |
| A8   | 14-Test Writer      | Unit + integration test suite                       | Validate | Coverage threshold met                                |
| A9   | 15-App Deployer     | CI/CD workflows, deployment config                  | Approval | Workflows pass dry-run validation                     |

The infra Conductor (01) hands off to App Conductor (16) after infrastructure deployment completes. Add a single handoff entry in 01's agents list: `"16-App Conductor"`.

### C3. New skills

Create in `.github/skills/`. **For the 4 technology skills**, use the existing `microsoft-skill-creator` skill workflow to ensure accuracy:

1. Run `microsoft-skill-creator` creation process for each technology skill
2. Use Learn MCP tools (`microsoft_docs_search`, `microsoft_docs_fetch`, `microsoft_code_sample_search`) to verify SDK versions, API signatures, and current best practices
3. Include Learn doc URLs as references in each skill for freshness auditing

| Skill folder                  | Creation method             | Content                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nextjs-patterns/SKILL.md`    | **microsoft-skill-creator** | Next.js 15 App Router conventions: route handlers, middleware, server vs client components, `use server`/`use client`, SSR patterns, error boundaries, loading states. Verified against official Next.js docs via Learn MCP.                                                                                                   |
| `cosmos-db-sdk/SKILL.md`      | **microsoft-skill-creator** | `@azure/cosmos` v4 SDK patterns: client singleton, managed identity auth factory, CRUD operations, cross-partition queries, change feed, error handling, connection string vs DefaultAzureCredential branching. Verified against official Azure SDK docs via Learn MCP.                                                        |
| `shadcn-ui-patterns/SKILL.md` | **microsoft-skill-creator** | shadcn/ui component catalog for HackOps: Table (leaderboard), Form (submissions), Badge (grades/awards), Dialog (confirmations), Card (dashboard), Tabs (admin) — with Tailwind 4 styling conventions                                                                                                                          |
| `zod-validation/SKILL.md`     | **microsoft-skill-creator** | Zod schema patterns: API boundary validation, discriminated unions for submission types, rubric schema validation, error message formatting, shared schemas in `packages/shared`                                                                                                                                               |
| `hackops-domain/SKILL.md`     | **Hand-written** from plan  | HackOps business domain knowledge: roles and permissions matrix, hackathon lifecycle state machine, submission workflow (pending→approved/rejected), rubric pointer pattern, challenge gating logic, audit trail contract. **Keystone skill** — paired with `validate-business-rules.mjs` for mechanical enforcement (see C6). |

### C4. New instructions

Create in `.github/instructions/`:

| File                               | `applyTo`                    | Purpose                                                                                                                                                                                                                                                        |
| ---------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript.instructions.md`       | `**/*.ts, **/*.tsx`          | TypeScript strict mode, type-only imports, no `any`, shared types from `packages/shared`, naming conventions                                                                                                                                                   |
| `nextjs.instructions.md`           | `**/apps/web/**`             | App Router file conventions (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`), `use client` / `use server` boundaries, middleware chain                                                                                                       |
| `react-components.instructions.md` | `**/components/**/*.tsx`     | Component conventions: functional components only, props interfaces, composition over inheritance, shadcn/ui usage patterns, accessibility requirements. Note: scoped to `components/` to avoid overlap with `typescript.instructions.md` on all `.tsx` files. |
| `testing.instructions.md`          | `**/*.test.ts, **/*.spec.ts` | Vitest conventions, test naming (`describe`/`it`), mock patterns for Cosmos DB client, test fixtures location, coverage thresholds                                                                                                                             |
| `api-routes.instructions.md`       | `**/app/api/**`              | Route handler conventions: Zod validation at entry, role guard pattern, error response format, audit logging pattern, **MUST import types from `packages/shared/types/api-contract.ts`**, no business logic in route files (delegate to service layer)         |

**Registration steps** (MANDATORY — instructions won't auto-apply without these):

1. Update `.devcontainer/devcontainer.json` — add new instruction file paths to the Copilot instruction settings
2. Verify `applyTo` patterns don't create conflicting overlap (e.g., `react-components` scoped to `**/components/**/*.tsx` not `**/*.tsx` to avoid conflict with `typescript` instruction)
3. Run `npm run lint:instruction-frontmatter` to verify frontmatter compliance
4. Run `npm run validate:instruction-refs` to verify new instructions are discoverable and not flagged as orphans
5. Update `copilot-instructions.md` instruction reference list if it maintains an index

### C5. New issue templates

| File                                     | Purpose                                             |
| ---------------------------------------- | --------------------------------------------------- |
| `.github/ISSUE_TEMPLATE/app-feature.yml` | For app feature work — labels: `app`, `enhancement` |
| `.github/ISSUE_TEMPLATE/app-bug.yml`     | For app bugs — labels: `app`, `bug`                 |

### C6. Business rules validator

- **Create**: `scripts/validate-business-rules.mjs`
- **Purpose**: Mechanically enforce `hackops-domain` skill invariants in application code (Golden Principle 10: if a rule can be a linter/CI check, make it one)
- **Checks**:
  - All API route files import types from `packages/shared/types/api-contract.ts`
  - Role guard middleware is applied to every protected route
  - Audit logging calls exist in every mutation endpoint
  - Zod validation occurs at API boundary (first lines of route handler)
  - Score fields are never directly mutated (must go through scoring service)
- **Integration**: Add to `package.json` scripts as `validate:business-rules`, include in CI pipeline
- **Register**: Add to `npm run validate` composite command

---

## Phase D — Infrastructure Execution (using existing agents)

Run the 7-step workflow with targeted prompts. The existing agents (01-08) + Challenger (10) handle this.

> **Azure connectivity prerequisite**: `infra-01` through `infra-03` can run offline (requirements, architecture, design). `infra-04` through `infra-07` require Azure connectivity (`az login` completed, target subscription selected, `rg-hackops-dev` resource group exists or create permission granted). Verify with `az account show` before starting `infra-04`.

### D1. Infrastructure prompt sequence

Create in `.github/prompts/`:

| Prompt file                         | Feeds agent             | What it does                                                                                                                                                                                                                                      |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `infra-01-requirements.prompt.md`   | 02-Requirements         | Seeds the requirements phase with the tech stack from plan-hackOps.prompt.md — networking, Cosmos DB, App Service, Key Vault, monitoring. Outputs `agent-output/hackops/01-requirements.md`                                                       |
| `infra-02-architecture.prompt.md`   | 03-Architect            | Feeds the requirements doc. Requests WAF assessment, cost estimate (uses Pricing MCP), and architecture decisions. Outputs `agent-output/hackops/02-architecture-assessment.md`                                                                   |
| `infra-03-design.prompt.md`         | 04-Design               | Requests architecture diagram (VNet topology, private endpoints, App Service → Cosmos DB flow) and ADRs for key decisions (serverless Cosmos DB, App Service over Container Apps, Easy Auth). Outputs `agent-output/hackops/03-des-*.py/.png/.md` |
| `infra-04-governance.prompt.md`     | 05-Bicep Planner        | Triggers governance discovery against target subscription, then implementation plan. This is the Phase 1.5 + Phase 2-4 planning gate. Outputs `agent-output/hackops/04-*.md/.json`                                                                |
| `infra-05-bicep-generate.prompt.md` | 06-Bicep Code Generator | Provides the implementation plan and governance constraints. Requests Bicep code for all 9 AVM modules in the plan. Outputs `infra/bicep/hackops/` with `main.bicep`, modules, `.bicepparam`, `deploy.ps1`                                        |
| `infra-06-deploy.prompt.md`         | 07-Deploy               | Triggers what-if analysis then actual deployment to `rg-hackops-dev`. Outputs `agent-output/hackops/06-deployment-summary.md`                                                                                                                     |
| `infra-07-as-built.prompt.md`       | 08-As-Built             | Generates post-deployment documentation suite. Outputs `agent-output/hackops/07-*.md` (design doc, runbook, cost estimate, compliance matrix, DR plan, resource inventory)                                                                        |
| `infra-challenge.prompt.md`         | 10-Challenger           | Adversarial review of the architecture assessment and implementation plan before deployment proceeds                                                                                                                                              |

Each prompt includes: `agent:` pointing to the correct custom agent, `tools:` appropriate for that step, and explicit instructions to read the plan-hackOps.prompt.md sections relevant to that phase.

---

## Phase E — Application Build Execution (using new agents)

Create prompts that drive the new app-dev agents through the plan's Phases 1, 5-10.

### E1. App-build prompt sequence

Create in `.github/prompts/`:

| Prompt file                       | Feeds agent         | Plan phase    | What it does                                                                                                                                                             |
| --------------------------------- | ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app-01-scaffold.prompt.md`       | 11-App Scaffolder   | Phase 1       | Turborepo setup, Next.js 15 init, `packages/shared/types/` for all 10 container interfaces, Cosmos DB emulator config, `.env.example`, seed script                       |
| `app-02-auth.prompt.md`           | 12-API Builder      | Phase 5       | Auth middleware (Easy Auth header parsing), role resolution, role guards, dev auth bypass, CORS config, rate limiter, audit logger                                       |
| `app-03-api-hackathons.prompt.md` | 12-API Builder      | Phase 6       | Hackathon CRUD, event code generation (SHA-256), hacker onboarding (join), team assignment (Fisher-Yates), manual reassignment                                           |
| `app-04-api-scoring.prompt.md`    | 12-API Builder      | Phase 7       | Rubric CRUD (pointer + versioned pattern), submission endpoint (form + JSON upload), review queue, approve/reject, score override                                        |
| `app-05-api-challenges.prompt.md` | 12-API Builder      | Phase 9       | Challenge CRUD, progression tracking, gate middleware, auto-unlock trigger                                                                                               |
| `app-06-api-admin.prompt.md`      | 12-API Builder      | Phase 10      | Role management (invite/remove), audit trail query, config management endpoints                                                                                          |
| `app-07-leaderboard.prompt.md`    | 13-Frontend Builder | Phase 8       | SSR leaderboard page, auto-refresh (SWR/30s polling), expandable rows, grade badges, award badges                                                                        |
| `app-08-dashboard.prompt.md`      | 13-Frontend Builder | Phases 6,9,10 | Admin dashboard (hackathon lifecycle, team management, config), hacker dashboard (challenge progress, submission form), coach dashboard (review queue)                   |
| `app-09-tests.prompt.md`          | 14-Test Writer      | Cross-cutting | Unit tests for all API routes, Zod schema validation tests, role guard tests, business logic tests (Fisher-Yates, scoring aggregation, challenge gating)                 |
| `app-10-ci-cd.prompt.md`          | 15-App Deployer     | Phase 11      | `hackops-ci.yml` (PR: lint, type-check, test, bicep build), `hackops-deploy.yml` (push to main: build, test, deploy to dev; manual gate for prod), OIDC federation setup |

---

## Phase F — Supporting Artifacts (fill in as you go)

### F1. Seed data and test fixtures

- Create `scripts/seed-cosmos.ts` — referenced in the plan but needs a companion: `apps/web/tests/fixtures/` with sample hackathon, teams, hackers, rubric, submissions, and progression data for testing

### F2. OpenAPI spec (optional but high-value)

- Create `docs/openapi.yaml` — generated from the API contract doc, enables automated API testing and client generation

### F3. Testing strategy doc

- **Create**: `docs/testing-strategy.md`
- **Content**: Test pyramid (unit → integration → E2E), tools (Vitest for unit, Playwright for E2E), coverage targets, what to mock (Cosmos DB client), what to test against emulator

### F4. Security checklist

- **Create**: `docs/security-checklist.md`
- **Content**: Consolidate security invariants scattered across phases: TLS 1.2, HTTPS-only, managed identity, no public endpoints, SHA-256 event codes, input validation, CORS, rate limiting, audit trail, primary admin protection

### F5. Local development runbook

- **Create**: `docs/local-dev-guide.md`
- **Content**: Step-by-step: start Cosmos DB emulator, seed data, configure `.env.local`, run `npm run dev`, test auth bypass, verify API routes

### F6. Update existing meta-docs

- Update `AGENTS.md` to include agents 11-16 and 3 subagents in the roster table
- Update `docs/README.md` to link new documentation
- Update `QUALITY_SCORE.md` to track app-dev progress
- Update `.github/copilot-instructions.md` to reference new
  instructions in the instruction index

---

## Artifact Inventory (~44 new files)

| Category                 | Count | Files                                                                                                                                                   |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doc-generation prompts   | 3     | `doc-prd-generator`, `doc-api-contract-generator`, `doc-data-model-generator`                                                                           |
| Product docs             | 5     | `docs/prd.md`, `packages/shared/types/api-contract.ts` + `docs/api-contract.md`, `docs/data-model.md`, `docs/ui-pages.md`, `docs/environment-config.md` |
| Backlog prompts          | 2     | `generate-backlog.prompt.md`, `backlog-triage.prompt.md`                                                                                                |
| Backlog setup doc        | 1     | `docs/exec-plans/backlog-setup.md`                                                                                                                      |
| New agents (top-level)   | 6     | `11-app-scaffolder`, `12-api-builder`, `13-frontend-builder`, `14-test-writer`, `15-app-deployer`, `16-app-conductor`                                   |
| New subagents            | 3     | `app-lint-subagent`, `app-review-subagent`, `app-test-subagent`                                                                                         |
| New skills               | 5     | `nextjs-patterns`, `cosmos-db-sdk`, `shadcn-ui-patterns`, `zod-validation`, `hackops-domain`                                                            |
| New instructions         | 5     | `typescript`, `nextjs`, `react-components`, `testing`, `api-routes`                                                                                     |
| Business rules validator | 1     | `scripts/validate-business-rules.mjs`                                                                                                                   |
| Session management       | 2     | `session-resume.prompt.md`, `docs/exec-plans/active/hackops-execution.md`                                                                               |
| Infra prompts            | 8     | `infra-01` through `infra-07` + `infra-challenge`                                                                                                       |
| App prompts              | 10    | `app-01` through `app-10`                                                                                                                               |
| Supporting docs          | 4     | `testing-strategy.md`, `security-checklist.md`, `local-dev-guide.md`, `openapi.yaml`                                                                    |
| Issue templates          | 2     | `app-feature.yml`, `app-bug.yml`                                                                                                                        |
| Conductor handoff        | 1     | Add `16-App Conductor` to `01-conductor.agent.md` agents list                                                                                           |
| Meta-doc updates         | 4     | `AGENTS.md`, `docs/README.md`, `QUALITY_SCORE.md`, `copilot-instructions.md`                                                                            |

---

## Recommended Execution Sequence

1. **B0** (bootstrap) — create ~10 tracking issues manually for progress visibility
2. **Phase A** (docs) — branch `feature/product-docs`: run doc-gen prompts to create PRD, API contract types, data model, UI pages, env config. Merge to main.
3. **Phase C** (toolchain) — branch `feature/app-dev-toolchain`: create agents 11-16 + 3 subagents, run microsoft-skill-creator for 4 tech skills, hand-write hackops-domain skill, create 5 instructions + register them, create issue templates + validator. Run `npm run validate`. Merge to main.
4. **Phase B** (backlog) — branch `feature/prompts`: generate issues from PRD using the backlog prompt
5. **Phase D** (infra) — same branch: run infra-01 through infra-03 offline, verify Azure connectivity, run infra-04 through infra-07
6. **Phase E** (app build) — same branch: run app prompts via App Conductor (16): scaffold → auth → hackathons → scoring → challenges → admin → leaderboard → dashboard → tests → CI/CD. Each step passes its exit criteria before the next begins.
7. **Phase F** (supporting) — fill in as you go; meta-doc updates committed directly to main via PR

---

## Verification

| Check                    | Command / Method                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| New agents valid         | `npm run lint:agent-frontmatter`                                                                                         |
| New skills valid         | `npm run lint:skills-format`                                                                                             |
| New instructions valid   | `npm run lint:instruction-frontmatter`                                                                                   |
| Instruction registration | `npm run validate:instruction-refs`                                                                                      |
| Business rules validator | `npm run validate:business-rules`                                                                                        |
| All markdown valid       | `npm run lint:md`                                                                                                        |
| Full validation suite    | `npm run validate`                                                                                                       |
| Backlog generation       | Run `generate-backlog.prompt.md` → verify issues appear in GitHub with correct labels/milestones                         |
| Infra workflow           | Run `infra-01-requirements.prompt.md` through Conductor → verify `agent-output/hackops/01-requirements.md` generated     |
| Bicep syntax             | `bicep build infra/bicep/hackops/main.bicep`                                                                             |
| Next.js build            | `cd apps/web && npm run build`                                                                                           |
| Type checking            | `npm run type-check`                                                                                                     |
| Unit tests               | `npm test`                                                                                                               |
| What-if                  | `az deployment group what-if -g rg-hackops-dev -f infra/bicep/hackops/main.bicep -p infra/bicep/hackops/main.bicepparam` |
| Local dev                | `npm run dev` → Cosmos DB emulator + Next.js dev server                                                                  |
| Auth flow                | Deploy to dev → navigate to app → GitHub OAuth redirect → role assigned                                                  |

---

## Key Design Decisions

| Decision                                            | Rationale                                                                                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infra-first execution order                         | Infrastructure deployed before app code, so app prompts can reference real Azure endpoints                                                                |
| 6 top-level agents + 3 subagents (not prompts-only) | Mirrors the infra agent pattern for consistency; dedicated App Conductor (16) keeps infra and app workflows cleanly separated                             |
| Separate App Conductor (16)                         | Infra Conductor (01) stays scoped to its 7-step workflow; app workflow has different steps, gates, and exit criteria. Single handoff entry connects them. |
| `hackops-domain` skill + mechanical validator       | Business rules centralized in skill; `validate-business-rules.mjs` enforces them at CI time (Golden Principle 10)                                         |
| API contract as TypeScript types                    | `packages/shared/types/api-contract.ts` is the source of truth; `tsc` catches contract drift at compile time; markdown reference is secondary             |
| Skills via microsoft-skill-creator                  | 4 of 5 skills use Learn MCP research workflow for SDK version accuracy; only `hackops-domain` is hand-written (project-specific domain knowledge)         |
| PRD before backlog                                  | The PRD provides the user stories that become GitHub Issues — can't generate the backlog without it                                                       |
| Frontend Builder uses Opus-primary                  | Complex React component generation requires stronger reasoning; Codex available as fallback for simpler components                                        |
| Session state in-repo                               | Context preserved via exec-plan tracker + `/session-resume` prompt. Follows Principle 1: repo is the record. Each prompt is self-contained.               |
