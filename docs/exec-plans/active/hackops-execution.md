# Exec Plan: HackOps Execution

> Living session state tracker. Updated at the END of every session.
> Read this file FIRST at the start of any new session.

**Status**: Active
**Owner**: Human + Copilot agents
**Created**: 2026-02-24
**Blueprint**: `.github/prompts/plan-hackOpsExecution.prompt.md`
**Source plan**: `.github/prompts/plan-hackOps.prompt.md`
**Challenge findings**: `agent-output/hackops/challenge-findings.json`

---

## Current Session Target

<!-- Update this at the START of each session -->

**Phase**: Not started
**Step**: —
**Branch**: —
**Goal**: —

---

## Phase Progress

### Phase B0 — Bootstrap Issues

- [ ] Create `[Epic] Phase A: Product Documentation` issue
- [ ] Create `[Epic] Phase C: App-Dev Toolchain` issue
- [ ] Create individual Phase A tracking issues (PRD, API contract,
  data model, UI pages, env config)
- [ ] Create individual Phase C tracking issues (agents, skills,
  instructions, registration, subagents)

### Phase A — Product Documentation

**Branch**: `feature/product-docs`
**Merge gate**: `npm run lint:md` passes

- [ ] A0: Create `doc-prd-generator.prompt.md`
- [ ] A0: Create `doc-api-contract-generator.prompt.md`
- [ ] A0: Create `doc-data-model-generator.prompt.md`
- [ ] A1: Run PRD generator → `docs/prd.md`
- [ ] A2: Run API contract generator →
  `packages/shared/types/api-contract.ts` + `docs/api-contract.md`
- [ ] A3: Run data model generator → `docs/data-model.md`
- [ ] A4: Create `docs/ui-pages.md`
- [ ] A5: Create `docs/environment-config.md`
- [ ] Merge `feature/product-docs` → main

### Phase C — App-Dev Toolchain

**Branch**: `feature/app-dev-toolchain`
**Merge gate**: `npm run validate` passes

- [ ] C1: Create `11-app-scaffolder.agent.md`
- [ ] C1: Create `12-api-builder.agent.md`
- [ ] C1: Create `13-frontend-builder.agent.md`
- [ ] C1: Create `14-test-writer.agent.md`
- [ ] C1: Create `15-app-deployer.agent.md`
- [ ] C1: Create `16-app-conductor.agent.md`
- [ ] C1: Create `app-lint-subagent.agent.md`
- [ ] C1: Create `app-review-subagent.agent.md`
- [ ] C1: Create `app-test-subagent.agent.md`
- [ ] C2: Verify App Conductor workflow table matches blueprint
- [ ] C3: Run microsoft-skill-creator for `nextjs-patterns`
- [ ] C3: Run microsoft-skill-creator for `cosmos-db-sdk`
- [ ] C3: Run microsoft-skill-creator for `shadcn-ui-patterns`
- [ ] C3: Run microsoft-skill-creator for `zod-validation`
- [ ] C3: Hand-write `hackops-domain` skill
- [ ] C4: Create `typescript.instructions.md`
- [ ] C4: Create `nextjs.instructions.md`
- [ ] C4: Create `react-components.instructions.md`
- [ ] C4: Create `testing.instructions.md`
- [ ] C4: Create `api-routes.instructions.md`
- [ ] C4: Register instructions in devcontainer.json
- [ ] C4: Run `npm run lint:instruction-frontmatter`
- [ ] C4: Run `npm run validate:instruction-refs`
- [ ] C5: Create `app-feature.yml` issue template
- [ ] C5: Create `app-bug.yml` issue template
- [ ] C6: Create `scripts/validate-business-rules.mjs`
- [ ] C6: Register in `package.json` scripts
- [ ] Run `npm run validate` — full suite passes
- [ ] Merge `feature/app-dev-toolchain` → main

### Phase B — Backlog Scaffold

**Branch**: `feature/prompts`
**Merge gate**: `npm run lint:md` passes

- [ ] B1: Create label taxonomy
- [ ] B2: Create milestones
- [ ] B3: Create `generate-backlog.prompt.md`
- [ ] B4: Create `backlog-triage.prompt.md`
- [ ] B5: Document Projects board setup in
  `docs/exec-plans/backlog-setup.md`
- [ ] Run backlog generation prompt → verify issues created

### Phase D — Infrastructure Execution

**Branch**: `feature/prompts` (continued)
**Prerequisite**: `az login` completed for steps D4-D7

- [ ] D1: Create `infra-01-requirements.prompt.md`
- [ ] D1: Create `infra-02-architecture.prompt.md`
- [ ] D1: Create `infra-03-design.prompt.md`
- [ ] D1: Create `infra-04-governance.prompt.md`
- [ ] D1: Create `infra-05-bicep-generate.prompt.md`
- [ ] D1: Create `infra-06-deploy.prompt.md`
- [ ] D1: Create `infra-07-as-built.prompt.md`
- [ ] D1: Create `infra-challenge.prompt.md`
- [ ] Run infra-01 (offline) → `01-requirements.md`
- [ ] Run infra-02 (offline) → `02-architecture-assessment.md`
- [ ] Run infra-03 (offline) → `03-des-*.md/.py/.png`
- [ ] Run infra-challenge → review findings
- [ ] Verify Azure connectivity (`az account show`)
- [ ] Run infra-04 → `04-*.md/.json`
- [ ] Run infra-05 → `infra/bicep/hackops/`
- [ ] Run `bicep build infra/bicep/hackops/main.bicep`
- [ ] Run infra-06 → deployment to `rg-hackops-dev`
- [ ] Run infra-07 → `07-*.md` documentation suite

### Phase E — Application Build

**Branch**: `feature/prompts` (continued)
**Orchestrator**: 16-App Conductor

- [ ] E1: Create all 10 app prompts (`app-01` through `app-10`)
- [ ] Run app-01-scaffold → Turborepo + Next.js scaffold
  - Gate: `npm run build` succeeds
- [ ] Run app-02-auth → auth middleware + role guards
  - Gate: role guard unit tests pass
- [ ] Run app-03-api-hackathons → hackathon/team/join routes
  - Gate: `tsc --noEmit` + endpoint tests pass
- [ ] Run app-04-api-scoring → rubric/submission/review routes
  - Gate: `tsc --noEmit` + endpoint tests pass
- [ ] Run app-05-api-challenges → challenge/progression routes
  - Gate: `tsc --noEmit` + endpoint tests pass
- [ ] Run app-06-api-admin → admin/audit/config routes
  - Gate: all API tests pass, app-review-subagent APPROVED
- [ ] Run app-07-leaderboard → SSR leaderboard page
  - Gate: `npm run build` succeeds, no type errors
- [ ] Run app-08-dashboard → admin/hacker/coach dashboards
  - Gate: `npm run build` succeeds, app-review APPROVED
- [ ] Run app-09-tests → full test suite
  - Gate: coverage >80%, all tests pass
- [ ] Run app-10-ci-cd → CI/CD workflows
  - Gate: workflows pass dry-run validation

### Phase F — Supporting Artifacts

- [ ] F1: Create `scripts/seed-cosmos.ts` + test fixtures
- [ ] F2: Create `docs/openapi.yaml` (optional)
- [ ] F3: Create `docs/testing-strategy.md`
- [ ] F4: Create `docs/security-checklist.md`
- [ ] F5: Create `docs/local-dev-guide.md`
- [ ] F6: Update `AGENTS.md` (add agents 11-16 + subagents)
- [ ] F6: Update `docs/README.md`
- [ ] F6: Update `QUALITY_SCORE.md`
- [ ] F6: Update `copilot-instructions.md`

---

## Session Log

<!-- Append one entry per session. Keep entries concise. -->

| #   | Date       | Phase/Step | What was done      | What's next        | Blockers |
| --- | ---------- | ---------- | ------------------ | ------------------ | -------- |
| 0   | 2026-02-24 | Planning   | Created blueprint, | B0: Bootstrap      | None     |
|     |            |            | challenged, and    | issues, then start |          |
|     |            |            | resolved 14        | Phase A            |          |
|     |            |            | findings           |                    |          |

---

## Key Files (context loading reference)

Agents starting a new session should read these files to
establish context. Listed in priority order — stop when you
have enough context for the current step.

### Always read (every session)

1. **This file** — `docs/exec-plans/active/hackops-execution.md`
2. **Blueprint** —
   `.github/prompts/plan-hackOpsExecution.prompt.md`
   (read only the phase you're working on)

### Read when working on specific phases

| Phase   | Additional context files                          |
| ------- | ------------------------------------------------- |
| A (docs) | `plan-hackOps.prompt.md` (Phases 5-10)           |
| B (backlog) | `docs/prd.md`, `docs/api-contract.md`         |
| C (toolchain) | `agent-definitions.instructions.md`,         |
|         | `agent-skills.instructions.md`,                  |
|         | `microsoft-skill-creator` skill                  |
| D (infra) | `azure-defaults` skill, existing agent defs     |
| E (app) | All Phase A docs, `hackops-domain` skill,         |
|         | `api-contract.ts` types                           |
| F (supporting) | `AGENTS.md`, `docs/README.md`              |

---

## Decisions Made During Execution

<!-- Record any runtime decisions that deviate from the blueprint -->

| Date | Decision | Rationale |
| ---- | -------- | --------- |
| —    | —        | —         |
