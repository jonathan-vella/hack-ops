---
description: "Consolidate 6 app-dev agents (11-16) into 3 agents and cascade-update all documentation"
agent: agent
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "search/textSearch",
    "search/fileSearch",
    "search/listDirectory",
    "execute/runInTerminal",
  ]
---

# Consolidate App-Dev Agents: 6 → 3

Merge 6 app-dev agents into 3, update all 5 app-dev subagents, update
10 prompt files, and cascade changes through all documentation.

## Background & Rationale

The app-dev agents (11-16) were designed before Context7 MCP was
integrated. Each agent hardcoded library guidance requiring separate
agent contexts. Now that Context7 dynamically resolves library docs
(Next.js, Zod, Cosmos DB, shadcn/ui, Vitest), agents can cover broader
scope without context bloat.

Additionally:

- **Agent 11 (App Scaffolder)** is a one-shot task — it ran once during
  Phase E and will never scaffold again. Its residual guidance merges
  trivially into a builder agent.
- **Agent 15 (App Deployer)** has ~60 lines of CI/CD workflow patterns.
  This is an orchestration concern that belongs in the conductor.
- **Agents 12 + 13 (API Builder + Frontend Builder)** share 80% of
  their tool lists, skills, and orientation steps. The backend/frontend
  split makes less sense with Context7 handling library specifics.

## Consolidation Map

| New Agent         | Number | Absorbs                                                    | Steps              | Purpose                                                                                                |
| ----------------- | ------ | ---------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| **App Builder**   | 11     | 11 (Scaffolder) + 12 (API Builder) + 13 (Frontend Builder) | A1-A7              | Full-stack builder: scaffold, API routes, frontend pages. Uses Context7 for library patterns.          |
| **App Tester**    | 12     | 14 (Test Writer)                                           | A8                 | Tests in a clean context: fixtures, coverage, iterative fix cycles. Adversarial subagents report here. |
| **App Conductor** | 13     | 15 (App Deployer) + 16 (App Conductor)                     | A9 + orchestration | Orchestrator + CI/CD. Manages builder → tester → deploy lifecycle.                                     |

## Preconditions

- Read each file fully before editing — do NOT guess at content
- This is a refactoring task — no application code changes
- All validation scripts must pass after completion
- Zero information loss — all unique guidance must be preserved

## Phase 1 — Create New Agent Definitions (3 files)

### 1A. Create `11-app-builder.agent.md`

This agent merges content from the current agents 11, 12, and 13.

**Frontmatter rules:**

- `name: 11-App Builder`
- `description:` combine — "Full-stack application builder for the
  HackOps platform. Scaffolds monorepo, generates API route handlers
  with Zod validation and role guards, and builds frontend pages with
  shadcn/ui. Uses Context7 MCP for library pattern verification.
  Covers workflow steps A1-A7."
- `model: ["Claude Opus 4.6", "GPT-5.3-Codex"]` (keep dual model from
  old 12/13)
- `argument-hint: "Specify what to build: scaffold, API domain (auth,
hackathons, scoring, challenges, admin), or frontend pages"`
- `target: vscode`
- `user-invokable: true`
- `agents: ["*"]`
- `tools:` union of all tools from agents 11, 12, 13 (deduplicated).
  Additionally add Context7 MCP tools:
  - `mcp_context7_resolve-library-id`
  - `mcp_context7_query-docs`
- `handoffs:`
  - Lint & Type-check: `▶ Lint & Type-check` → self,
    prompt: "Run `tsc --noEmit` and `eslint src/`. Fix any errors."
  - Build Check: `▶ Build Check` → self,
    prompt: "Run `npm run build`. Fix build errors."
  - Step A8: `Step A8: Tests` → `12-App Tester`,
    prompt: "Code ready. Write unit and integration tests."
  - Return: `↩ Return to App Conductor` → `13-App Conductor`,
    prompt: "Returning from App Builder. Code implemented and type-checked.", send: false

**Body content — merge these sections from old agents:**

1. **MANDATORY: Orientation & Skills** — consolidated list (deduplicated):
   - `AGENTS.md` — lightweight map
   - `.github/skills/golden-principles/SKILL.md` — 10 operating principles
   - `.github/skills/azure-defaults/SKILL.md` — regions, tags, naming
   - `.github/skills/hackops-domain/SKILL.md` — business rules, roles
   - `.github/skills/nextjs-patterns/SKILL.md` — App Router conventions
   - `.github/skills/shadcn-ui-patterns/SKILL.md` — component catalog
   - `.github/skills/cosmos-db-sdk/SKILL.md` — Cosmos DB patterns
   - `.github/skills/zod-validation/SKILL.md` — validation schemas
   - `packages/shared/types/api-contract.ts` — SOURCE OF TRUTH for types
   - `docs/api-contract.md` — endpoint reference
   - `docs/data-model.md` — Cosmos DB containers
   - `docs/ui-pages.md` — page inventory
   - `docs/prd.md` — product requirements
   - `docs/environment-config.md` — env var contract

2. **Context7 Dynamic Verification** — NEW section:

   ```markdown
   ## Context7 Dynamic Verification

   Before generating code that uses library-specific patterns, verify
   against live documentation:

   1. Call `resolve-library-id` for the relevant library
   2. Call `query-docs` with the resolved ID and a targeted topic
   3. Compare results against the skill's hardcoded patterns
   4. If patterns differ, flag the discrepancy before proceeding

   Libraries to verify: `next.js`, `zod`, `@azure/cosmos`, `shadcn/ui`
   ```

3. **Scaffold Structure** — from old agent 11 (the full directory tree)

4. **API Route Pattern** — from old agent 12:
   - The 5-step route handler skeleton (auth → validate → delegate →
     audit → respond)
   - The API Domains table (A2-A6 build order)
   - Exit Criteria Per Domain section

5. **Component Architecture** — from old agent 13:
   - Server vs Client Components table
   - Page Structure tree
   - shadcn/ui Components table
   - Exit Criteria section

6. **Adversarial Review Gates** — from old agent 12:
   - After completing each domain, App Conductor invokes challengers
   - Fix all CRITICAL and HIGH findings before proceeding

### 1B. Create `12-app-tester.agent.md`

This agent is a streamlined rename of old agent 14 with updated references.

**Frontmatter rules:**

- `name: 12-App Tester`
- `description:` "Writes unit tests (Vitest), integration tests (API
  routes against Cosmos DB emulator), and E2E test stubs for the HackOps
  platform. Reads acceptance criteria from the PRD. Uses Context7 MCP
  for Vitest API verification."
- `model: "GPT-5.3-Codex"`
- `argument-hint: "Specify which test domain to target (auth, api,
components, e2e) or run the app-09 prompt"`
- `target: vscode`
- `user-invokable: true`
- `agents: ["*"]`
- `tools:` same as old agent 14, plus Context7 MCP tools:
  - `mcp_context7_resolve-library-id`
  - `mcp_context7_query-docs`
- `handoffs:`
  - Self-run: `▶ Run Test Suite` → self,
    prompt: "Run `npm test`. Fix any failing tests."
  - Step A9: `Step A9: Deploy` → `13-App Conductor`,
    prompt: "Test suite complete. Proceed to CI/CD."
  - Return: `↩ Return to App Conductor` → `13-App Conductor`,
    prompt: "Returning from test writing. Results available.", send: false

**Body content** — copy from old agent 14 (Test Writer) with these edits:

- Update the step reference: "Step A8" (unchanged)
- Update all old agent references (replace `16-App Conductor` with
  `13-App Conductor`)
- MANDATORY Orientation: read same skills as 14, adding Context7 note

### 1C. Create `13-app-conductor.agent.md`

This agent merges old 16 (App Conductor) with old 15 (App Deployer).

**Frontmatter rules:**

- `name: 13-App Conductor`
- `description:` "Orchestrates app-dev workflow with approval gates.
  Manages full lifecycle from scaffold through deployment."
- `model: ["Claude Opus 4.6"]`
- `argument-hint: 'Start with "Begin app build" or resume'`
- `target: vscode`
- `user-invokable: true`
- `agents: ["*"]`
- `tools:` union of tools from old agents 15 and 16 (deduplicated),
  plus Context7 MCP tools:
  - `mcp_context7_resolve-library-id`
  - `mcp_context7_query-docs`
    Also include Azure tools from old 15:
  - `azure-mcp/appservice`
  - `azure-mcp/deploy`
  - `azure-mcp/get_bestpractices`
  - `ms-azuretools.vscode-azure-github-copilot/azure_get_auth_context`
  - `ms-azuretools.vscode-azure-github-copilot/azure_set_auth_context`
- `handoffs:`
  - Step A1-A7: `Steps A1-A7: Build` → `11-App Builder`,
    prompt: "Build application. Scaffold, API routes, frontend."
  - Step A8: `Step A8: Tests` → `12-App Tester`,
    prompt: "Write test suite. Use acceptance criteria."
  - Step A9: `Step A9: CI/CD` → self,
    prompt: "Generate CI/CD workflows for App Service."
  - Validate: `▶ Validate Workflows` → self,
    prompt: "Validate CI/CD YAML syntax and versions."
  - Return: `↩ Return to Infra Conductor` → `01-Conductor`,
    prompt: "App build complete. Returning to infra.", send: false

**Body content — merge these sections:**

1. **MANDATORY: Orientation & Skills** — from old 16, adding
   `docs/environment-config.md` from old 15

2. **App-Dev Workflow** — updated table:

   | Step | Agent            | Output                                        | Gate     | Exit criteria                     |
   | ---- | ---------------- | --------------------------------------------- | -------- | --------------------------------- |
   | A1   | 11-App Builder   | `apps/web/`, `packages/shared/`, `turbo.json` | Approval | `npm run build` succeeds          |
   | A2   | 11-App Builder   | Auth middleware, role guards                  | Approval | Role guard unit tests pass        |
   | A3   | 11-App Builder   | Hackathon, team, join API routes              | Validate | `tsc --noEmit` + tests pass       |
   | A4   | 11-App Builder   | Scoring, rubric, submission routes            | Validate | `tsc --noEmit` + tests pass       |
   | A5   | 11-App Builder   | Challenge, progression routes                 | Validate | `tsc --noEmit` + tests pass       |
   | A6   | 11-App Builder   | Admin, audit, config routes                   | Validate | All API tests + review APPROVED   |
   | A7   | 11-App Builder   | Pages, layouts, components                    | Validate | `npm run build` succeeds          |
   | A8   | 12-App Tester    | Unit + integration test suite                 | Validate | Coverage >80%, all tests pass     |
   | A9   | 13-App Conductor | CI/CD workflows                               | Approval | Workflows pass dry-run validation |

3. **Adversarial Review Schedule** — from old 16, with parent agent
   name updates:
   - Replace "API Builder" → "App Builder"
   - Replace "Test Writer" → "App Tester"
   - Replace "Frontend Builder" → "App Builder"

4. **CI/CD Workflows** — from old agent 15 (full section):
   - PR Validation workflow spec
   - Deployment workflow spec
   - Environment Configuration table

5. **Orchestration Rules** — from old 16 (full section)

## Phase 2 — Delete Old Agent Files (4 files)

After creating the 3 new agents, delete the old files:

```bash
rm .github/agents/11-app-scaffolder.agent.md
rm .github/agents/12-api-builder.agent.md
rm .github/agents/13-frontend-builder.agent.md
rm .github/agents/14-test-writer.agent.md
rm .github/agents/15-app-deployer.agent.md
rm .github/agents/16-app-conductor.agent.md
```

Verify 3 new files exist:

- `.github/agents/11-app-builder.agent.md`
- `.github/agents/12-app-tester.agent.md`
- `.github/agents/13-app-conductor.agent.md`

## Phase 3 — Update Subagents (5 files)

Update parent agent references in all 5 app-dev subagents.

### 3A. `app-lint-subagent.agent.md`

- Current `description` says: "Called by API Builder and Frontend Builder"
- Change to: "Called by App Builder and App Tester"

### 3B. `app-review-subagent.agent.md`

- Current `description` says: "Reviews against api-routes, typescript,
  and react-components instruction standards"
- Change to: "Reviews against api-routes and typescript instruction
  standards and shadcn-ui-patterns skill"
  (react-components was merged into the shadcn-ui-patterns skill)
- In the body, the "Load review standards" step lists
  "React component conventions" — change to
  "shadcn/ui patterns (from `shadcn-ui-patterns` skill)"

### 3C. `app-test-subagent.agent.md`

- Current `description` says: "Called by the Test Writer agent"
- Change to: "Called by the App Tester agent"

### 3D. `app-security-challenger-subagent.agent.md`

- In the body, line referencing parent agents says:
  "(typically 12-API Builder, 14-Test Writer, or 16-App Conductor)"
- Change to: "(typically 11-App Builder, 12-App Tester, or
  13-App Conductor)"

### 3E. `app-logic-challenger-subagent.agent.md`

- In the body, line referencing parent agents says:
  "(typically 14-Test Writer or 16-App Conductor)"
- Change to: "(typically 12-App Tester or 13-App Conductor)"

## Phase 4 — Update Prompt Files (10 files)

Update the `agent:` frontmatter in all app prompt files.

| Prompt file                       | Old agent             | New agent          |
| --------------------------------- | --------------------- | ------------------ |
| `app-01-scaffold.prompt.md`       | `11-App Scaffolder`   | `11-App Builder`   |
| `app-02-auth.prompt.md`           | `12-API Builder`      | `11-App Builder`   |
| `app-03-api-hackathons.prompt.md` | `12-API Builder`      | `11-App Builder`   |
| `app-04-api-scoring.prompt.md`    | `12-API Builder`      | `11-App Builder`   |
| `app-05-api-challenges.prompt.md` | `12-API Builder`      | `11-App Builder`   |
| `app-06-api-admin.prompt.md`      | `12-API Builder`      | `11-App Builder`   |
| `app-07-leaderboard.prompt.md`    | `13-Frontend Builder` | `11-App Builder`   |
| `app-08-dashboard.prompt.md`      | `13-Frontend Builder` | `11-App Builder`   |
| `app-09-tests.prompt.md`          | `14-Test Writer`      | `12-App Tester`    |
| `app-10-ci-cd.prompt.md`          | `15-App Deployer`     | `13-App Conductor` |

For each file:

1. Read it fully
2. Change only the `agent:` value in the YAML frontmatter
3. Do NOT change the description, tools, or body content

## Phase 5 — Update 01-Conductor Agent

In `.github/agents/01-conductor.agent.md`:

1. In the `agents:` list, replace `"16-App Conductor"` with
   `"13-App Conductor"`
2. In the handoffs section, update the "App Build Workflow" handoff:
   - Change `agent: 16-App Conductor` → `agent: 13-App Conductor`
   - Update prompt text: replace "agents 11-15" with "agents 11-13"

## Phase 6 — Update Core Documentation (5 files)

### 6A. `AGENTS.md`

1. **App-Dev Workflow** table — update to:

   | Step | Agent         | Output                       | Gate     |
   | ---- | ------------- | ---------------------------- | -------- |
   | A1-7 | App Builder   | Monorepo, API routes, pages  | Validate |
   | A8   | App Tester    | Vitest unit + integration    | PASS     |
   | A9   | App Conductor | CI/CD workflows, App Service | Approval |

   Change "App Conductor orchestrates steps A1–A9." to remain the same.

2. **App-Dev Agents** table — replace with:

   | Agent            | Purpose                                                        |
   | ---------------- | -------------------------------------------------------------- |
   | 11-App Builder   | Full-stack: scaffold, API routes, frontend (Context7-verified) |
   | 12-App Tester    | Unit tests (Vitest), integration tests, E2E stubs              |
   | 13-App Conductor | Orchestrates app-dev workflow + CI/CD deployment               |

3. **Adversarial Subagents** table — update parent agents:
   - "API Builder, Test Writer, App Conductor" → "App Builder, App Tester, App Conductor"
   - "Test Writer, App Conductor" → "App Tester, App Conductor"

4. **App-Dev Subagents** table — update parent agents:
   - "API Builder, Frontend Builder" → "App Builder"
   - "Test Writer" → "App Tester"

### 6B. `docs/README.md`

1. Section header: change `## Agents (16 + 11 Subagents)` →
   `## Agents (13 + 11 Subagents)`

2. **App-Dev Agents** table — replace with:

   | Agent           | Persona       | Step | Purpose                             |
   | --------------- | ------------- | ---- | ----------------------------------- |
   | `app-builder`   | 🏗️ Builder    | A1-7 | Full-stack build with Context7      |
   | `app-tester`    | 🧪 Tester     | A8   | Vitest unit + integration tests     |
   | `app-conductor` | 🎼 Maestro II | A9+  | Orchestrates app-dev + CI/CD deploy |

3. **Adversarial Subagents** table — update parent agents:
   - "API Builder, Test Writer" → "App Builder, App Tester"
   - "Test Writer, App Conductor" → "App Tester, App Conductor"

4. **App-Dev Subagents** table — update parent agents:
   - "API Builder, Frontend Builder" → "App Builder"
   - "Test Writer" → "App Tester"

5. Directory tree: change `│   ├── agents/           # 16 agent definitions + 11 subagents` →
   `│   ├── agents/           # 13 agent definitions + 11 subagents`

### 6C. `docs/project-overview.md`

1. Replace the Application Pipeline section. Change:
   - "Orchestrated by the **16-App Conductor**" →
     "Orchestrated by the **13-App Conductor**"
   - Update the step listing to reflect 3 agents:
     ```text
     A1-A7: App Builder   → Scaffold, API routes, frontend pages
     A8:    App Tester     → Unit + integration tests
     A9:    App Conductor  → CI/CD workflows + deployment
     ```

### 6D. `docs/exec-plans/active/hackops-execution.md`

1. Change `**Orchestrator**: 16-App Conductor` →
   `**Orchestrator**: 13-App Conductor`
2. Add a note after the Phase E header:
   ```markdown
   > **Agent consolidation (2026-02-28)**: Agents 11-16 consolidated
   > into 11-App Builder, 12-App Tester, 13-App Conductor. Old agent
   > numbers in completed checkboxes below reflect the original names.
   ```

### 6E. `docs/exec-plans/tech-debt-tracker.md`

No new active debt from this change. The consolidation itself is the
resolution. No changes needed unless new issues are found during
validation.

## Phase 7 — Update Historical/Planning Docs (1 file)

### 7A. `plan-hackOpsExecution.prompt.md`

This is a historical planning document. Add a consolidation note to
the agent table rather than rewriting history.

1. Find the agent table (lines ~188-193) with entries for agents 11-16
2. Add a note above the table:
   ```markdown
   > **Consolidation note (2026-02-28)**: Agents 11-16 were consolidated
   > into 3: 11-App Builder (scaffold + API + frontend), 12-App Tester,
   > 13-App Conductor (orchestration + CI/CD). Original plan below for
   > historical reference.
   ```

### 7B. `agent-output/hackops/10-context-optimization-report.md`

This references `16-App Conductor`. Since this is a generated report,
add a note but don't rewrite the analysis:

1. Find the reference to `16-App Conductor`
2. Change it to `13-App Conductor` (the recommendation still applies)

## Phase 8 — Update Quality Score & Validate

### 8A. Update `QUALITY_SCORE.md`

1. **Agents row**: change "16 agents + 11 subagents" →
   "13 agents + 11 subagents"
2. Add change log entry:
   ```markdown
   | 2026-02-28 | Agents | Consolidated 6 app-dev agents (11-16) into 3 (11-App Builder, 12-App Tester, 13-App Conductor); Context7 enables broader scope per agent |
   ```

### 8B. Run All Validators

```bash
node scripts/validate-agent-frontmatter.mjs
node scripts/validate-skills-format.mjs
node scripts/validate-instruction-frontmatter.mjs
node scripts/validate-instruction-references.mjs
node scripts/check-docs-freshness.mjs
```

All must pass (0 errors). Fix any issues found.

### 8C. Verify No Dangling References

Search the entire repo for old agent names that were NOT updated:

```bash
grep -r "11-App Scaffolder" .github/ docs/ AGENTS.md QUALITY_SCORE.md
grep -r "12-API Builder" .github/ docs/ AGENTS.md QUALITY_SCORE.md
grep -r "13-Frontend Builder" .github/ docs/ AGENTS.md QUALITY_SCORE.md
grep -r "14-Test Writer" .github/ docs/ AGENTS.md QUALITY_SCORE.md
grep -r "15-App Deployer" .github/ docs/ AGENTS.md QUALITY_SCORE.md
grep -r "16-App Conductor" .github/ docs/ AGENTS.md QUALITY_SCORE.md
```

**Expected**: Only matches in `plan-hackOpsExecution.prompt.md` (marked
as historical) and `10-context-optimization-report.md` (already
updated). Zero matches elsewhere.

If any unexpected matches are found, fix them.

## Execution Order

Follow strictly in this order:

1. Phase 1A — create `11-app-builder.agent.md`
2. Phase 1B — create `12-app-tester.agent.md`
3. Phase 1C — create `13-app-conductor.agent.md`
4. Phase 2 — delete 6 old agent files
5. Phase 3 — update 5 subagents
6. Phase 4 — update 10 prompt files
7. Phase 5 — update 01-conductor
8. Phase 6A — update AGENTS.md
9. Phase 6B — update docs/README.md
10. Phase 6C — update docs/project-overview.md
11. Phase 6D — update docs/exec-plans/active/hackops-execution.md
12. Phase 7A — update plan-hackOpsExecution.prompt.md
13. Phase 7B — update 10-context-optimization-report.md
14. Phase 8A — update QUALITY_SCORE.md
15. Phase 8B — run validators
16. Phase 8C — dangling reference check

## Output Expectations

After all phases:

- **3 new agent files** created (11, 12, 13)
- **6 old agent files** deleted (11-16)
- **5 subagent files** updated (parent references)
- **10 prompt files** updated (agent: frontmatter)
- **1 infra agent** updated (01-conductor handoff)
- **5 documentation files** updated (AGENTS.md, docs/README.md,
  project-overview.md, hackops-execution.md, QUALITY_SCORE.md)
- **2 historical files** annotated (plan-hackOpsExecution, context-opt report)
- **Net reduction**: 16 → 13 agents (11 subagents unchanged)
- **All 5 validators** pass with 0 errors
- **Zero dangling references** to old agent names in active files
