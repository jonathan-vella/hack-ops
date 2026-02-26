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

## Issue-to-Step Mapping

<!-- When a step completes, close the corresponding issue with a comment. -->
<!-- When an epic's subtasks all complete, close the epic. -->

| Step                      | Issue | Status                               |
| ------------------------- | ----- | ------------------------------------ |
| Epic: Phase A             | #1    | Done (merge complete, need GH_TOKEN) |
| Epic: Phase C             | #2    | Open                                 |
| A1: PRD                   | #3    | Closed                               |
| A2: API contract          | #4    | Closed                               |
| A3: Data model            | #5    | Closed                               |
| A4: UI pages              | #6    | Done (need GH_TOKEN to close)        |
| A5: Env config            | #7    | Done (need GH_TOKEN to close)        |
| C1: App-dev agents        | #8    | Open                                 |
| C3: App-dev skills        | #9    | Open                                 |
| C4: App-dev instructions  | #10   | Open                                 |
| C4: Register instructions | #11   | Open                                 |
| C1: App-dev subagents     | #12   | Open                                 |

---

## Current Session Target

<!-- Update this at the START of each session -->

**Phase**: C — App-Dev Toolchain
**Step**: C2 — Verify App Conductor workflow + C3 skills
**Branch**: `feature/app-dev-toolchain`
**Goal**: Verify C2 workflow table, then create C3 skills

---

## Phase Progress

### Phase B0 — Bootstrap Issues

- [x] Create `[Epic] Phase A: Product Documentation` issue (#1)
- [x] Create `[Epic] Phase C: App-Dev Toolchain` issue (#2)
- [x] Create individual Phase A tracking issues (#3-#7)
- [x] Create individual Phase C tracking issues (#8-#12)

### Phase A — Product Documentation

**Branch**: `feature/product-docs`
**Merge gate**: `npm run lint:md` passes

- [x] A0: Create `doc-prd-generator.prompt.md`
- [x] A0: Create `doc-api-contract-generator.prompt.md`
- [x] A0: Create `doc-data-model-generator.prompt.md`
- [x] A1: Run PRD generator → `docs/prd.md`
- [x] A2: Run API contract generator →
      `packages/shared/types/api-contract.ts` + `docs/api-contract.md`
- [x] A3: Run data model generator → `docs/data-model.md`
- [x] A4: Create `docs/ui-pages.md`
- [x] A5: Create `docs/environment-config.md`
- [x] Merge `feature/product-docs` → main

### Phase C — App-Dev Toolchain

**Branch**: `feature/app-dev-toolchain`
**Merge gate**: `npm run validate` passes

- [x] C1: Create `11-app-scaffolder.agent.md`
- [x] C1: Create `12-api-builder.agent.md`
- [x] C1: Create `13-frontend-builder.agent.md`
- [x] C1: Create `14-test-writer.agent.md`
- [x] C1: Create `15-app-deployer.agent.md`
- [x] C1: Create `16-app-conductor.agent.md`
- [x] C1: Create `app-lint-subagent.agent.md`
- [x] C1: Create `app-review-subagent.agent.md`
- [x] C1: Create `app-test-subagent.agent.md`
- [x] C2: Verify App Conductor workflow table matches blueprint
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
  - Gate: `app-security-challenger-subagent` (focus: `auth`) — no critical/high findings
- [ ] Run app-03-api-hackathons → hackathon/team/join routes
  - Gate: `tsc --noEmit` + endpoint tests pass
  - Gate: `app-logic-challenger-subagent` (focus: `api-contract`) — contract conformance
- [ ] Run app-04-api-scoring → rubric/submission/review routes
  - Gate: `tsc --noEmit` + endpoint tests pass
  - Gate: `app-logic-challenger-subagent` (focus: `business-rules`) — scoring correctness
- [ ] Run app-05-api-challenges → challenge/progression routes
  - Gate: `tsc --noEmit` + endpoint tests pass
  - Gate: `app-logic-challenger-subagent` (focus: `business-rules`) — gating correctness
- [ ] Run app-06-api-admin → admin/audit/config routes
  - Gate: all API tests pass, app-review-subagent APPROVED
  - Gate: `app-security-challenger-subagent` (focus: `full`) — full security review of all API routes
  - Gate: `app-logic-challenger-subagent` (focus: `full`) — full business logic review
- [ ] Run app-07-leaderboard → SSR leaderboard page
  - Gate: `npm run build` succeeds, no type errors
  - Gate: `app-security-challenger-subagent` (focus: `data-handling`) — data exposure check
- [ ] Run app-08-dashboard → admin/hacker/coach dashboards
  - Gate: `npm run build` succeeds, app-review APPROVED
- [ ] Run app-09-tests → full test suite
  - Gate: coverage >80%, all tests pass
  - Gate: `app-logic-challenger-subagent` (focus: `test-coverage`) — test gap analysis
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

| #   | Date       | Phase/Step | What was done         | What's next        | Blockers |
| --- | ---------- | ---------- | --------------------- | ------------------ | -------- |
| 0   | 2026-02-24 | Planning   | Created blueprint,    | B0: Bootstrap      | None     |
|     |            |            | challenged, and       | issues, then start |          |
|     |            |            | resolved 14           | Phase A            |          |
|     |            |            | findings              |                    |          |
| 1   | 2026-02-25 | A / A0     | Created 3 A0          | B0: Bootstrap      | B0 needs |
|     |            |            | doc-gen prompts       | issues             | GH_TOKEN |
| 2   | 2026-02-25 | B0         | Created 12 GitHub     | A1: Run PRD        | None     |
|     |            |            | issues (#1-#12),      | generator prompt   |          |
|     |            |            | epic label            |                    |          |
| 3   | 2026-02-25 | A / A1     | Generated PRD with    | Adversarial review | None     |
|     |            |            | 64 user stories,      | of PRD + add       |          |
|     |            |            | 8 domains, NFRs       | challenger agents  |          |
| 3b  | 2026-02-25 | Cross      | Created 3 adversarial | Fix 6 PRD design   | None     |
|     |            |            | subagents (infra,     | decisions from     |          |
|     |            |            | app-security,         | adversarial review |          |
|     |            |            | app-logic); moved     |                    |          |
|     |            |            | 10-Challenger to      |                    |          |
|     |            |            | subagent; merged      |                    |          |
|     |            |            | PR #14                |                    |          |
| 3c  | 2026-02-25 | A / A1     | Fixed 6 PRD design    | A2: Run API        | None     |
|     |            |            | decisions; aligned    | contract generator |          |
|     |            |            | 7 files (15 edits)    |                    |          |
| 4   | 2026-02-25 | A / A2     | Generated API         | A3: Run data model | None     |
|     |            |            | contract: 26          | generator          |          |
|     |            |            | endpoints, TS         |                    |          |
|     |            |            | types + MD ref        |                    |          |
| 5   | 2026-02-25 | A / A3     | Generated data model: | A4: UI pages       | None     |
|     |            |            | 10 containers, TS     | inventory          |          |
|     |            |            | interfaces, samples,  |                    |          |
|     |            |            | query patterns        |                    |          |
| 6   | 2026-02-26 | A / A4-A5  | Created ui-pages.md   | Merge branch,      | GH_TOKEN |
|     |            |            | (10 pages, 11 shared  | close issues #6 #7 | not set  |
|     |            |            | components) and       |                    |          |
|     |            |            | environment-config.md |                    |          |
|     |            |            | (Easy Auth contract,  |                    |          |
|     |            |            | Key Vault refs,       |                    |          |
|     |            |            | .env template)        |                    |          |
| 7   | 2026-02-26 | A / merge  | Merged                | Phase C: C1 agent  | GH_TOKEN |
|     |            | + C / C1   | feature/product-docs  | definitions        | not set  |
|     |            |            | to main; created 6    |                    | (issues  |
|     |            |            | top-level agents +    |                    | #1,#5,#6 |
|     |            |            | 3 subagents; added    |                    | #7 need  |
|     |            |            | App Conductor handoff |                    | closing) |
|     |            |            | to 01-Conductor       |                    |          |

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

| Phase          | Additional context files                    |
| -------------- | ------------------------------------------- |
| A (docs)       | `plan-hackOps.prompt.md` (Phases 5-10)      |
| B (backlog)    | `docs/prd.md`, `docs/api-contract.md`       |
| C (toolchain)  | `agent-definitions.instructions.md`,        |
|                | `agent-skills.instructions.md`,             |
|                | `microsoft-skill-creator` skill             |
| D (infra)      | `azure-defaults` skill, existing agent defs |
| E (app)        | All Phase A docs, `hackops-domain` skill,   |
|                | `api-contract.ts` types                     |
| F (supporting) | `AGENTS.md`, `docs/README.md`               |

---

## Decisions Made During Execution

<!-- Record any runtime decisions that deviate from the blueprint -->

| Date       | Decision                                                   | Rationale                                                     |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| 2026-02-25 | Hackers submit evidence; Coaches enter rubric scores       | Scoring authority belongs with Coaches, not Hackers           |
| 2026-02-25 | Event codes stored as plaintext + rate limiting (5/min/IP) | SHA-256 hashing adds complexity without real security gain    |
| 2026-02-25 | Tiebreaker: earliest last-approval timestamp wins          | Rewards faster completion when total scores are equal         |
| 2026-02-25 | Unlimited evidence resubmissions allowed                   | Scores only entered by Coach on review; no reason to limit    |
| 2026-02-25 | Team balance: `ceil(teamSize/2)` minimum per team          | Prevents runt teams of 1; balanced distribution is fairer     |
| 2026-02-25 | Coach review queue is hackathon-scoped                     | Coaches should only see submissions for their assigned events |
| 2026-02-25 | Moved 10-Challenger to infra-challenger-subagent           | Adversarial review is invoked by parent agents, not directly  |
