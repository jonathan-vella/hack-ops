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

| Step                      | Issue | Status |
| ------------------------- | ----- | ------ |
| Epic: Phase A             | #1    | Closed |
| Epic: Phase C             | #2    | Closed |
| A1: PRD                   | #3    | Closed |
| A2: API contract          | #4    | Closed |
| A3: Data model            | #5    | Closed |
| A4: UI pages              | #6    | Closed |
| A5: Env config            | #7    | Closed |
| C1: App-dev agents        | #8    | Closed |
| C3: App-dev skills        | #9    | Closed |
| C4: App-dev instructions  | #10   | Closed |
| C4: Register instructions | #11   | Closed |
| C1: App-dev subagents     | #12   | Closed |
| Epic: Phase B             | #21   | Closed |
| B1: Label taxonomy        | #26   | Closed |
| B2: Milestones            | #22   | Closed |
| B3: generate-backlog      | #23   | Closed |
| B4: backlog-triage        | #24   | Closed |
| B5: Projects board docs   | #25   | Closed |

---

## Current Session Target

<!-- Update this at the START of each session -->

**Phase**: I (Region Migration & Redeploy)
**Step**: I7 — Seed data via ACI
**Branch**: `main`
**Goal**: Seed SQL database via ACI, then update docs (I8).
**Detailed plan**: See Phase I checklist below
**Blockers**: None

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
- [x] C3: Run microsoft-skill-creator for `nextjs-patterns`
- [x] C3: Run microsoft-skill-creator for `cosmos-db-sdk` (now archived — replaced by SQL patterns)
- [x] C3: Run microsoft-skill-creator for `shadcn-ui-patterns`
- [x] C3: Run microsoft-skill-creator for `zod-validation`
- [x] C3: Hand-write `hackops-domain` skill
- [x] C4: Create `typescript.instructions.md`
- [x] C4: Create `nextjs.instructions.md` (merged into `nextjs-patterns` skill)
- [x] C4: Create `react-components.instructions.md` (merged into `shadcn-ui-patterns` skill)
- [x] C4: Create `testing.instructions.md`
- [x] C4: Create `api-routes.instructions.md`
- [x] C4: Register instructions in devcontainer.json
- [x] C4: Run `npm run lint:instruction-frontmatter`
- [x] C4: Run `npm run validate:instruction-refs`
- [x] C5: Create `app-feature.yml` issue template
- [x] C5: Create `app-bug.yml` issue template
- [x] C6: Create `scripts/validate-business-rules.mjs`
- [x] C6: Register in `package.json` scripts
- [x] Run `npm run validate` — full suite passes
- [x] Merge `feature/app-dev-toolchain` → main (PR #20)

### Phase B — Backlog Scaffold

**Branch**: `feature/prompts`
**Merge gate**: `npm run lint:md` passes
**Epic**: #21

- [x] B1: Create label taxonomy — `scripts/setup-labels.sh` (#26)
- [x] B2: Create milestones — `scripts/setup-milestones.sh` (#22)
- [x] B3: Create `generate-backlog.prompt.md` (#23)
- [x] B4: Create `backlog-triage.prompt.md` (#24)
- [x] B5: Document Projects board setup in
      `docs/exec-plans/backlog-setup.md` (#25)
- [x] Run `scripts/setup-labels.sh` (requires GH_TOKEN)
- [x] Run `scripts/setup-milestones.sh` (requires GH_TOKEN)
- [x] Create GitHub Projects board ("HackOps Backlog", [#6](https://github.com/jonathan-vella/hack-ops/projects))
- [x] Configure board custom fields (Phase, Domain, Complexity) and views
- [x] Run backlog generation prompt → verify issues created
- [x] Add generated issues to the GitHub Project

### Phase D — Infrastructure Execution

**Branch**: `feature/prompts` (continued)
**Prerequisite**: `az login` completed for steps D4-D7

- [x] D1: Create `infra-01-requirements.prompt.md`
- [x] D1: Create `infra-02-architecture.prompt.md`
- [x] D1: Create `infra-03-design.prompt.md`
- [x] D1: Create `infra-04-governance.prompt.md`
- [x] D1: Create `infra-05-bicep-generate.prompt.md`
- [x] D1: Create `infra-06-deploy.prompt.md`
- [x] D1: Create `infra-07-as-built.prompt.md`
- [x] D1: Create `infra-challenge.prompt.md`
- [x] Run infra-01 (offline) → `01-requirements.md`
- [x] Run infra-02 (offline) → `02-architecture-assessment.md`
- [x] Run infra-03 (offline) → `03-des-*.md/.py/.png`
- [x] Run infra-challenge → review findings
- [x] Verify Azure connectivity (`az account show`)
- [x] Run infra-04 → `04-*.md/.json`
- [x] Run infra-05 → `infra/bicep/hackops/`
- [x] Run `bicep build infra/bicep/hackops/main.bicep`
- [x] Run infra-06 → deployment to `rg-hackops-dev`
- [x] Run infra-07 → `07-*.md` documentation suite

### Phase E — Application Build

**Branch**: `feature/prompts` (continued)
**Orchestrator**: 13-App Conductor

> **Agent consolidation (2026-02-28)**: Agents 11-16 consolidated
> into 11-App Builder, 12-App Tester, 13-App Conductor. Old agent
> numbers in completed checkboxes below reflect the original names.

- [x] E1: Create all 10 app prompts (`app-01` through `app-10`)
- [x] Run app-01-scaffold → Turborepo + Next.js scaffold
  - Gate: `npm run build` succeeds ✅
- [x] Run app-02-auth → auth middleware + role guards
  - Gate: role guard unit tests pass
  - Gate: `app-security-challenger-subagent` (focus: `auth`) — no critical/high findings
- [x] Run app-03-api-hackathons → hackathon/team/join routes
  - Gate: `tsc --noEmit` + endpoint tests pass ✅
  - Gate: `app-logic-challenger-subagent` (focus: `api-contract`) — contract conformance

#### Phase C-fix — Remediate Phantom Completions (debt #15–#20)

Doc-gardening discovered that Phase C sessions 8–9 marked items complete
but artifacts were never committed. Recreate before continuing app builds
so agents 12–15 have the skills/instructions they were designed to use.

- [x] C-fix 1: Recreate 5 app-dev skills (debt #15)
  - `hackops-domain`, `nextjs-patterns`, `cosmos-db-sdk` (archived),
    `shadcn-ui-patterns`, `zod-validation`
  - Gate: `npm run validate` passes ✅
- [x] C-fix 2: Recreate 5 app-dev instructions (debt #16)
  - `typescript`, `nextjs`, `react-components`, `testing`, `api-routes`
  - Gate: `npm run lint:instruction-frontmatter` passes ✅
- [x] C-fix 3: Fix `next lint` — ESLint 10 circular ref (debt #17)
  - Pin ESLint to v9, or switch to native flat config
  - Gate: `npx next lint` exits 0 ✅
- [x] C-fix 4: Recreate app issue templates (debt #18)
  - `app-feature.yml`, `app-bug.yml`
- [x] C-fix 5: Recreate `validate-business-rules.mjs` + register in package.json (debt #19)
  - Gate: `npm run validate:business-rules` exits 0 ✅
- [x] C-fix 6: Correct tracker phantom checkboxes (debt #20)
  - Uncheck C3–C6 items that were never committed, re-check after recreation ✅

- [x] Run app-04-api-scoring → rubric/submission/review routes
  - Gate: `tsc --noEmit` + endpoint tests pass ✅
  - Gate: `app-logic-challenger-subagent` (focus: `business-rules`) — scoring correctness
- [x] Run app-05-api-challenges → challenge/progression routes
  - Gate: `tsc --noEmit` + endpoint tests pass ✅
  - Gate: `app-logic-challenger-subagent` (focus: `business-rules`) — gating correctness
- [x] Run app-06-api-admin → admin/audit/config routes
  - Gate: all API tests pass ✅ (131/131)
  - Gate: tsc + eslint clean, business rules 28/28 pass
- [x] Run app-07-leaderboard → SSR leaderboard page
  - Gate: `npm run build` succeeds, no type errors ✅
  - Gate: `app-security-challenger-subagent` (focus: `data-handling`) — data exposure check
- [x] Run app-08-dashboard → admin/hacker/coach dashboards
  - Gate: `npm run build` succeeds ✅, tsc clean, 131/131 tests pass
- [x] Run app-09-tests → full test suite
  - Gate: coverage >80%, all tests pass ✅ (178/178, lines 93%, branches 86%)
  - Gate: `app-logic-challenger-subagent` (focus: `test-coverage`) — test gap analysis
- [x] Run app-10-ci-cd → CI/CD workflows
  - Gate: actionlint passes on all 5 workflows, 178 tests pass ✅

### Phase G — Containerization (ACR + Container Deploy)

**Branch**: `main`
**Plan**: `archive/prompts/plan-containerizeHackOps.prompt.md`

- [x] G1.1: Create `apps/web/Dockerfile` (multi-stage, node:24-alpine, non-root UID 1001)
- [x] G1.2: Create `.dockerignore` at repo root
- [x] G1.3: Create `infra/bicep/hackops/modules/container-registry.bicep` (ACR Standard via AVM)
- [x] G1.4: Update `main.bicep`
  (ACR module, imageTag param, AcrPull RBAC prod+staging, staging SQL+KV RBAC)
- [x] G1.5: Update `app-service.bicep`
  (DOCKER linuxFxVersion, acrUseManagedIdentityCreds, staging slot,
  container app settings, tokenStore disabled)
- [x] G1.6: Update `hackops-deploy.yml`
  (container build → Trivy scan → ACR push → Bicep deploy → slot swap → auto-rollback)
- [x] G1.7: Update `hackops-ci.yml` (add docker-build job)
- [x] G1.8: Update health endpoint (60s warmup mode, eager SQL pre-warm)
- [x] G1.9: Create `scripts/setup-acr-purge.sh` (weekly purge of old SHA-tagged images)
- [x] G1.10: Create `docs/first-deploy-runbook.md` (supervised migration process)
- [x] G1.11: Verify `bicep build` passes (exit 0, 1 cosmetic BCP334 warning only)
- [x] G1.12: Create `apps/web/public/.gitkeep` (Dockerfile COPY dependency)
- [x] G2.1: Post-implementation security review
  (Dockerfile, ACR Bicep, CI — passes: auth, container-supply-chain, infra-permissions)
- [x] G2.2: Post-implementation logic review
  (pipeline, runtime, failures — passes: deploy-pipeline, container-runtime, failure-modes)
- [ ] G3: Local Docker build test — blocked: Docker not available in devcontainer
  (`docker build -t hackops:test -f apps/web/Dockerfile .`)
- [x] G4: Commit and push all containerization changes (commit 8885d14)
- [x] G5: Replaced by Phase H (delete/recreate approach — not in prod, safe to destroy)
- [ ] G6: Set GitHub environment variables (AZURE_ACR_NAME, AZURE_ACR_LOGIN_SERVER) → moved to H7
- [ ] G7: Run `scripts/setup-acr-purge.sh` → moved to H8

### Phase H — Container First-Deploy (Delete & Recreate)

**Branch**: `main`
**Prerequisite**: `az login` completed
**Runbook**: `docs/first-deploy-runbook.md`

> Decision: Since we are not in production, delete the existing
> App Service (zip-deploy, NODE|22-lts) and redeploy from
> scratch as container-based. SQL Database, Key Vault, VNet, and
> monitoring resources are preserved.

#### H0: Code changes (prep)

- [x] H0.1: Update `deploy.ps1` — drop Deployment Stacks,
  use `az deployment group create`, add `imageTag` + `adminGithubIds` params
- [x] H0.2: Update `first-deploy-runbook.md` — add Step 0 (delete existing resources)
- [x] H0.3: Update session tracker with Phase H plan
- [x] H0.4: Verify `bicep build` passes (1 cosmetic BCP334 warning only)
- [x] H0.5: Commit and push code changes (already clean — session 36 committed)

#### H1: Delete existing resources (Azure CLI)

- [x] H1.1: Delete Deployment Stack (`az stack group delete --name stack-hackops-dev ...`)
- [x] H1.2: Delete staging slot (`az webapp deployment slot delete ...`)
- [x] H1.3: Delete App Service (`az webapp delete ...`)
- [x] H1.4: Delete App Service Plan (`az appservice plan delete ...`)
- [x] H1.5: Verify `az resource list --resource-group rg-hackops-us-dev`
  shows no App Service / ASP

#### H2: Azure AD setup (OIDC for CI/CD)

- [x] H2.1: Create app registration `hackops-github-oidc` (appId: `6507ac72-518a-4974-b834-3479efc93f4c`)
- [x] H2.2: Add federated credential for `repo:jonathan-vella/hack-ops:environment:dev`
- [x] H2.3: Grant `Contributor` + `User Access Administrator`
  on `rg-hackops-us-dev` to OIDC SP `3c413e61...`

#### H3: Deploy fresh Bicep (bootstrap)

- [ ] H3.1: Run Bicep deploy with `imageTag=latest` (bootstrap)
  — first attempt failed: P1v3 quota=0; switched to S1; retry pending
- [ ] H3.2: Capture ACR name + login server from deployment outputs
- [ ] H3.3: Wait 2 min for RBAC propagation

#### H4: Build and push first Docker image

- [ ] H4.1: Run `az acr build --registry $ACR_NAME --image hackops:first-deploy --file apps/web/Dockerfile .`
- [ ] H4.2: Verify image in ACR: `az acr repository show-tags --name $ACR_NAME --repository hackops`

#### H5: Redeploy Bicep with real image tag

- [ ] H5.1: Redeploy Bicep with `imageTag=first-deploy`
- [ ] H5.2: Verify health endpoint returns 200 (`/api/health`)
- [ ] H5.3: Verify SQL Database connectivity (health check `sql-database: ok`)

#### H6: Verify full stack

- [ ] H6.1: Test GitHub OAuth login flow
- [ ] H6.2: Test API routes (hackathons, teams, submissions)
- [ ] H6.3: Verify staging slot health (`app-hackops-dev-staging.azurewebsites.net`)

#### H7: Configure GitHub environment vars

- [ ] H7.1: Set `AZURE_ACR_NAME` and `AZURE_ACR_LOGIN_SERVER` in "dev" environment
- [ ] H7.2: Set all OIDC secrets (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`)
- [ ] H7.3: Set `AZURE_RESOURCE_GROUP`, `AZURE_WEBAPP_NAME`, `AZURE_OWNER`, `AZURE_TECHNICAL_CONTACT`
- [ ] H7.4: Set `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` secrets
- [ ] H7.5: Set `ADMIN_GITHUB_IDS`
- [ ] H7.6: Grant `AcrPush` to the OIDC identity on ACR (for CI/CD image push)

#### H8: Validate CI/CD pipeline

- [ ] H8.1: Run `scripts/setup-acr-purge.sh`
- [ ] H8.2: Trigger `hackops-deploy.yml` via workflow_dispatch (env=dev)
- [ ] H8.3: Verify: build → Trivy → ACR push → Bicep → staging health → swap → prod health

### Phase I — Region Migration & Redeploy

**Branch**: `main`
**Prerequisite**: `az login` completed
**Goal**: Migrate from centralus to swedencentral with updated SKUs and network.

#### Updated Defaults (decided 2026-03-01)

| Resource        | Old Value         | New Value             | Notes                                     |
| --------------- | ----------------- | --------------------- | ----------------------------------------- |
| Region          | centralus         | **swedencentral**     | germanywestcentral as alternative         |
| App Service SKU | S1 (dev) / P1v3   | **P1v4** (all envs)   | Replaces both S1 and P1v3                 |
| Azure SQL DB    | GP_S_Gen5_2       | **S2** (50 DTU)       | DTU-based, simpler for hackathon workload |
| ACR             | Standard          | Standard (no change)  | Already correct                           |
| VNet CIDR       | 10.0.0.0/16       | **10.0.0.0/23**       | Tighter range, 512 addresses plenty       |
| Resource Group  | rg-hackops-us-dev | **rg-hackops-se-dev** | Region prefix follows naming convention   |
| DB seeding      | Direct connection | **ACI in VNet**       | DB behind PE — must seed from inside VNet |

> **Important**: SQL DB is behind a private endpoint. Any data seeding,
> migrations, or ad-hoc queries must run from within the VNet — use
> Azure Container Instances (1 vCPU, 1.5 GiB, VNet-integrated, ephemeral).

#### I1: Delete existing deployment

- [x] I1.1: Delete all resources in `rg-hackops-us-dev` (deleted by user)
- [x] I1.2: Do NOT wait — proceed immediately to I2

#### I2: Update Bicep code (new defaults)

- [x] I2.1: Update `main.bicep` — default region `swedencentral`, remove `centralus` from allowed
- [x] I2.2: Update `app-service.bicep` — SKU to `P1v4` (all envs)
- [x] I2.3: Update `sql-database.bicep` — SKU to `S2` (DTU tier)
- [x] I2.4: Update `networking.bicep` — VNet CIDR `10.0.0.0/23`, refit subnet ranges
- [x] I2.5: Update `main.bicepparam` — new region + resource group name
- [x] I2.6: Run `bicep build` — verify clean (0 errors, 1 cosmetic BCP334 warning)

#### I3: Adversarial review (pre-deploy, round 1)

- [x] I3.1: Run `infra-challenger-subagent` (security, waf, governance)
  — 2 rounds done 2026-03-01; 2 must_fix + 23 should_fix;
  must_fix items addressed in current Bicep code
- [x] I3.2: Run `app-security-challenger-subagent` (auth, api-routes,
  data-handling) — 1 critical, 1 high, 2 medium, 2 low;
  findings in `agent-output/hackops/challenges/app-security-challenge.json`
- [x] I3.3: Fix critical/high findings — fixed `extractHackathonId`
  ordering (CRITICAL: 7 routes broken in prod), converted 7 handlers
  to `requireAuth`+`checkRole`, stripped eventCode (HIGH),
  added security headers (MEDIUM)

#### I4: Context7 code check

- [x] I4.1: Verify Bicep patterns against latest AVM docs
  — 12 AVM modules pinned, `bicep build` clean, no updates needed
- [x] I4.2: Verify Next.js / SDK patterns against latest docs
  — Next.js 16.1.6, mssql 11, Zod 4.3.6 all current
- [x] I4.3: Fix any outdated patterns — none found

#### I5: Adversarial review (pre-deploy, round 2 — final gate)

- [x] I5.1: Run `infra-challenger-subagent` (should pass clean)
  — 0 critical, 0 high (3 passes: security, WAF, governance)
- [x] I5.2: Run `app-security-challenger-subagent` (should pass clean)
  — 0 critical, 0 high (3 passes: auth, api-routes, data-handling);
  fixed 13 test failures from I3.3
- [x] I5.3: Confirm 0 critical / 0 high findings
  — PASSED; bicep build 0 errors, tsc clean, 159/159 tests pass

#### I6: Deploy to swedencentral

- [x] I6.1: Create resource group `rg-hackops-se-dev` (swedencentral) — 9 governance tags applied
- [x] I6.2: Run Bicep deploy with `imageTag=latest` (bootstrap)
  — first attempt failed (slot kind mismatch),
  fixed kind to `app,linux,container`, retry succeeded
- [x] I6.3: Build + push Docker image to ACR (`az acr build`)
  — first attempt failed (packages/shared/node_modules),
  fixed Dockerfile, image pushed as `hackops:first-deploy`
- [x] I6.4: Redeploy Bicep with real image digest
  — added `AZURE_CLIENT_ID` app setting for UAMI SQL auth
- [x] I6.5: Verify health endpoint returns 200
  — both prod and staging healthy, SQL 5ms/65ms

#### I7: Seed data via ACI

- [ ] I7.1: Deploy ephemeral ACI (VNet-integrated) running seed script
- [ ] I7.2: Verify seed data in SQL DB
- [ ] I7.3: Delete ACI after seeding

#### I8: Update all documentation in scope

- [ ] I8.1: Update `06-deployment-summary.md`
- [ ] I8.2: Update `07-*` as-built docs (new region, SKUs, network)
- [ ] I8.3: Update `docs/first-deploy-runbook.md`
- [ ] I8.4: Update `docs/environment-config.md`
- [ ] I8.5: Update `docs/local-dev-guide.md` (connection strings, region refs)
- [ ] I8.6: Update `QUALITY_SCORE.md`
- [ ] I8.7: Update session tracker with completion status

### Phase F — Supporting Artifacts

- [x] F1: Create `scripts/seed-cosmos.ts` + test fixtures (archived — replaced by SQL seeder)
- [x] F2: Create `docs/openapi.yaml` (optional — skipped, not needed)
- [x] F3: Create `docs/testing-strategy.md`
- [x] F4: Create `docs/security-checklist.md`
- [x] F5: Create `docs/local-dev-guide.md`
- [x] F6: Update `AGENTS.md` (add agents 11-16 + subagents) — already current
- [x] F6: Update `docs/README.md`
- [x] F6: Update `QUALITY_SCORE.md`
- [x] F6: Update `copilot-instructions.md`

---

## Session Log

<!-- Append one entry per session. Keep entries concise. -->

| #   | Date       | Phase/Step | What was done            | What's next         | Blockers  |
| --- | ---------- | ---------- | ------------------------ | ------------------- | --------- |
| 0   | 2026-02-24 | Planning   | Created blueprint,       | B0: Bootstrap       | None      |
|     |            |            | challenged, and          | issues, then start  |           |
|     |            |            | resolved 14              | Phase A             |           |
|     |            |            | findings                 |                     |           |
| 1   | 2026-02-25 | A / A0     | Created 3 A0             | B0: Bootstrap       | B0 needs  |
|     |            |            | doc-gen prompts          | issues              | GH_TOKEN  |
| 2   | 2026-02-25 | B0         | Created 12 GitHub        | A1: Run PRD         | None      |
|     |            |            | issues (#1-#12),         | generator prompt    |           |
|     |            |            | epic label               |                     |           |
| 3   | 2026-02-25 | A / A1     | Generated PRD with       | Adversarial review  | None      |
|     |            |            | 64 user stories,         | of PRD + add        |           |
|     |            |            | 8 domains, NFRs          | challenger agents   |           |
| 3b  | 2026-02-25 | Cross      | Created 3 adversarial    | Fix 6 PRD design    | None      |
|     |            |            | subagents (infra,        | decisions from      |           |
|     |            |            | app-security,            | adversarial review  |           |
|     |            |            | app-logic); moved        |                     |           |
|     |            |            | 10-Challenger to         |                     |           |
|     |            |            | subagent; merged         |                     |           |
|     |            |            | PR #14                   |                     |           |
| 3c  | 2026-02-25 | A / A1     | Fixed 6 PRD design       | A2: Run API         | None      |
|     |            |            | decisions; aligned       | contract generator  |           |
|     |            |            | 7 files (15 edits)       |                     |           |
| 4   | 2026-02-25 | A / A2     | Generated API            | A3: Run data model  | None      |
|     |            |            | contract: 26             | generator           |           |
|     |            |            | endpoints, TS            |                     |           |
|     |            |            | types + MD ref           |                     |           |
| 5   | 2026-02-25 | A / A3     | Generated data model:    | A4: UI pages        | None      |
|     |            |            | 10 containers, TS        | inventory           |           |
|     |            |            | interfaces, samples,     |                     |           |
|     |            |            | query patterns           |                     |           |
| 6   | 2026-02-26 | A / A4-A5  | Created ui-pages.md      | Merge branch,       | GH_TOKEN  |
|     |            |            | (10 pages, 11 shared     | close issues #6 #7  | not set   |
|     |            |            | components) and          |                     |           |
|     |            |            | environment-config.md    |                     |           |
|     |            |            | (Easy Auth contract,     |                     |           |
|     |            |            | Key Vault refs,          |                     |           |
|     |            |            | .env template)           |                     |           |
| 7   | 2026-02-26 | A / merge  | Merged                   | Phase C: C1 agent   | GH_TOKEN  |
|     |            | + C / C1   | feature/product-docs     | definitions         | not set   |
|     |            |            | to main; created 6       |                     | (issues   |
|     |            |            | top-level agents +       |                     | #1,#5,#6  |
|     |            |            | 3 subagents; added       |                     | #7 need   |
|     |            |            | App Conductor handoff    |                     | closing)  |
|     |            |            | to 01-Conductor          |                     |           |
| 8   | 2026-02-26 | C / C3-C6  | Created 5 skills         | Merge branch →      | GH_TOKEN  |
|     |            |            | (nextjs-patterns,        | main, then start    | not set   |
|     |            |            | cosmos-db-sdk,           | Phase B             | (issues   |
|     |            |            | shadcn-ui-patterns,      |                     | #8-#12    |
|     |            |            | zod-validation,          |                     | need      |
|     |            |            | hackops-domain);         |                     | closing)  |
|     |            |            | 5 instructions;          |                     |           |
|     |            |            | 2 issue templates;       |                     |           |
|     |            |            | business rules           |                     |           |
|     |            |            | validator;               |                     |           |
|     |            |            | validate:all passes      |                     |           |
| 9   | 2026-02-26 | C / merge  | PR #20 created and       | Phase B: B1 label   | None      |
|     |            | + B / init | merged to main;          | taxonomy, B2        |           |
|     |            |            | closed issues #1, #2,    | milestones, B3-B4   |           |
|     |            |            | #6-#12 via MCP;          | prompt files        |           |
|     |            |            | created branch           |                     |           |
|     |            |            | feature/prompts;         |                     |           |
|     |            |            | created Epic #21 +       |                     |           |
|     |            |            | issues #22-#26 for       |                     |           |
|     |            |            | Phase B                  |                     |           |
| 10  | 2026-02-26 | B / B1-B5  | Created label script     | Run setup scripts   | GH_TOKEN  |
|     |            |            | (setup-labels.sh),       | + backlog prompt    | not set   |
|     |            |            | milestone script         | (needs GH auth),    | (issues   |
|     |            |            | (setup-milestones.sh),   | then Phase D        | #22-#26   |
|     |            |            | generate-backlog         | prompts             | need      |
|     |            |            | prompt, backlog-triage   |                     | closing)  |
|     |            |            | prompt, and backlog      |                     |           |
|     |            |            | setup docs; lint:md      |                     |           |
|     |            |            | passes                   |                     |           |
| 11  | 2026-02-26 | D / D1     | Created all 8 infra      | Run infra-01        | GH_TOKEN  |
|     |            |            | prompt files:            | (offline), then     | not set   |
|     |            |            | infra-01 through         | infra-02, infra-03  | (Phase B  |
|     |            |            | infra-07 + infra-        | offline; verify     | scripts   |
|     |            |            | challenge; lint:md       | Azure for D4-D7     | blocked)  |
|     |            |            | passes; Phase B          |                     |           |
|     |            |            | scripts still blocked    |                     |           |
|     |            |            | (no GH auth)             |                     |           |
| 12  | 2026-02-26 | B / run    | GH auth restored; ran    | Run /generate-      | None      |
|     |            |            | setup-labels.sh (23      | backlog to create   |           |
|     |            |            | labels) and setup-       | ~80 issues; then    |           |
|     |            |            | milestones.sh (13        | run infra-01        |           |
|     |            |            | milestones); closed      | through infra-03    |           |
|     |            |            | issues #22-#26 via       | (offline)           |           |
|     |            |            | gh CLI                   |                     |           |
| 13  | 2026-02-26 | B / final  | Confirmed backlog        | Run infra-          | None      |
|     |            | + D /      | already generated        | challenge, then     |           |
|     |            | D2-D4      | (105 issues on board);   | verify Azure        |           |
|     |            |            | added Domain +           | connectivity for    |           |
|     |            |            | Complexity fields;       | infra-04 through    |           |
|     |            |            | closed Epic #21;         | infra-07            |           |
|     |            |            | generated infra-01       |                     |           |
|     |            |            | (requirements), 02       |                     |           |
|     |            |            | (architecture), 03       |                     |           |
|     |            |            | (diagram + 3 ADRs);      |                     |           |
|     |            |            | commit 8fa0c7b           |                     |           |
| 14  | 2026-02-26 | D /        | Infra-challenge review   | Run infra-04        | None      |
|     |            | challenge  | of steps 01-03: 9        | governance          |           |
|     |            |            | findings (0 critical,    | discovery against   |           |
|     |            |            | 1 high, 5 medium,        | target sub, then    |           |
|     |            |            | 3 low); verified Azure   | infra-05 Bicep      |           |
|     |            |            | connectivity (sub:       | generation          |           |
|     |            |            | noalz); challenge-       |                     |           |
|     |            |            | findings.json updated    |                     |           |
| 15  | 2026-02-26 | D / D4     | Governance discovery     | Run infra-05        | None      |
|     |            |            | via REST API: 21         | Bicep code gen      |           |
|     |            |            | policies, 9 mandatory    |                     |           |
|     |            |            | tags (RG Deny), Cosmos   |                     |           |
|     |            |            | RBAC-only (Modify),      |                     |           |
|     |            |            | 0 blocking Deny          |                     |           |
|     |            |            | policies; generated      |                     |           |
|     |            |            | impl plan + 2 diagrams   |                     |           |
| 16  | 2026-02-26 | D / D5     | Generated 8 Bicep        | Run infra-06        | None      |
|     |            |            | files: main.bicep,       | deploy to           |           |
|     |            |            | main.bicepparam, 5       | rg-hackops-dev      |           |
|     |            |            | modules (networking,     |                     |           |
|     |            |            | monitoring, key-vault,   |                     |           |
|     |            |            | cosmos-db, app-svc),     |                     |           |
|     |            |            | deploy.ps1; 8 AVM        |                     |           |
|     |            |            | modules; bicep build     |                     |           |
|     |            |            | + lint clean; created    |                     |           |
|     |            |            | 05-implementation-       |                     |           |
|     |            |            | reference.md             |                     |           |
| 17  | 2026-02-26 | D / D6-D7  | Infra deployed to        | Phase E: create     | None      |
|     |            |            | rg-hackops-us-dev        | app prompts, then   |           |
|     |            |            | (centralus); 37          | run app-01-scaffold |           |
|     |            |            | resources created;       |                     |           |
|     |            |            | 06-deployment-summary    |                     |           |
|     |            |            | + 7 as-built docs        |                     |           |
|     |            |            | generated; Phase D       |                     |           |
|     |            |            | complete                 |                     |           |
| 18  | 2026-02-26 | E / E1     | Created all 10 app       | Run app-01-scaffold | None      |
|     |            |            | prompts: app-01          | to set up Turborepo |           |
|     |            |            | through app-10;          | + Next.js 15        |           |
|     |            |            | lint:md passes (0        | monorepo            |           |
|     |            |            | errors)                  |                     |           |
| 19  | 2026-02-27 | E / app-01 | Scaffolded Turborepo     | Run app-02-auth     | None      |
|     |            |            | + Next.js 15 monorepo;   | (auth middleware +  |           |
|     |            |            | 10 shared types, 10      | role guards)        |           |
|     |            |            | shadcn/ui components,    |                     |           |
|     |            |            | Cosmos client, health    |                     |           |
|     |            |            | endpoint, seed script;   |                     |           |
|     |            |            | npm build + tsc pass;    |                     |           |
|     |            |            | commit 63dd892           |                     |           |
| 20  | 2026-02-27 | E / app-02 | Auth middleware: Easy    | Run app-03-api-     | None      |
|     |            |            | Auth parsing, role       | hackathons          |           |
|     |            |            | resolution, guards,      | (hackathon/team/    |           |
|     |            |            | rate limiter (100/5      | join routes)        |           |
|     |            |            | per min), Zod            |                     |           |
|     |            |            | validation, audit        |                     |           |
|     |            |            | logger, CORS, Next.js    |                     |           |
|     |            |            | middleware; 35 tests     |                     |           |
|     |            |            | pass; commit 9476766     |                     |           |
| 21  | 2026-02-27 | E / app-03 | Hackathon CRUD (POST,    | Run app-04-api-     | None      |
|     |            |            | GET, PATCH), join        | scoring (rubric/    |           |
|     |            |            | endpoint (event code     | submission/review   |           |
|     |            |            | + rate limit), team      | routes)             |           |
|     |            |            | assign (Fisher-Yates),   |                     |           |
|     |            |            | team list + reassign;    |                     |           |
|     |            |            | added requireAuth        |                     |           |
|     |            |            | guard; 3 Zod schemas;    |                     |           |
|     |            |            | 60 tests pass;           |                     |           |
|     |            |            | commit 5e90170           |                     |           |
| 22  | 2026-02-28 | E / C-fix  | Remediated debt #15-     | Continue app-04-    | None      |
|     |            |            | #20: created 5 skills    | api-scoring         |           |
|     |            |            | (hackops-domain etc),    |                     |           |
|     |            |            | 5 instructions (TS,      |                     |           |
|     |            |            | Next.js, React, test,    |                     |           |
|     |            |            | API routes), 2 issue     |                     |           |
|     |            |            | templates, business      |                     |           |
|     |            |            | rules validator (28      |                     |           |
|     |            |            | checks), fixed ESLint    |                     |           |
|     |            |            | 10 native flat config;   |                     |           |
|     |            |            | all validators pass      |                     |           |
| 23  | 2026-02-27 | E / app-04 | Completed app-04:        | Merge PR, start     | None      |
|     |            |            | 3 Zod schemas, 6         | app-05-api-         |           |
|     |            |            | route handlers           | challenges          |           |
|     |            |            | (rubrics CRUD +          |                     |           |
|     |            |            | pointer swap,            |                     |           |
|     |            |            | submissions POST/GET/    |                     |           |
|     |            |            | review, score            |                     |           |
|     |            |            | override), 28 tests;     |                     |           |
|     |            |            | tsc + eslint clean;      |                     |           |
|     |            |            | 88/88 tests pass;        |                     |           |
|     |            |            | commit 8f7954b           |                     |           |
| 24  | 2026-02-27 | E / app-05 | Challenge progression    | Merge PR, start     | None      |
|     |            |            | & gating: 4 CRUD         | app-06-api-admin    |           |
|     |            |            | routes (challenges),     |                     |           |
|     |            |            | 1 progression route,     |                     |           |
|     |            |            | gate middleware,         |                     |           |
|     |            |            | auto-unlock trigger,     |                     |           |
|     |            |            | progression init on      |                     |           |
|     |            |            | launch, ETag writes;     |                     |           |
|     |            |            | 19 new tests, 107        |                     |           |
|     |            |            | total pass; commit       |                     |           |
|     |            |            | d5a6ef9                  |                     |           |
| 25  | 2026-02-27 | E / app-06 | Admin/roles/audit/       | Run app-07-         | None      |
|     |            |            | config routes: POST      | leaderboard (SSR    |           |
|     |            |            | invite, GET list,        | aggregation page)   |           |
|     |            |            | DELETE (primary admin    |                     |           |
|     |            |            | protected), GET audit    |                     |           |
|     |            |            | trail with filters,      |                     |           |
|     |            |            | GET/PATCH config         |                     |           |
|     |            |            | (read-only keys          |                     |           |
|     |            |            | protected); 3 Zod        |                     |           |
|     |            |            | schemas, isGlobalAdmin   |                     |           |
|     |            |            | helper; 24 new tests,    |                     |           |
|     |            |            | 131 total pass;          |                     |           |
|     |            |            | commit a12c149           |                     |           |
| 26  | 2026-02-27 | E / app-07 | SSR leaderboard page:    | Run app-08-         | None      |
|     |            |            | API route (score agg,    | dashboard (admin/   |           |
|     |            |            | grade + award badges,    | hacker/coach)       |           |
|     |            |            | tiebreaker), SSR page    |                     |           |
|     |            |            | with generateMetadata,   |                     |           |
|     |            |            | client component with    |                     |           |
|     |            |            | 30s auto-refresh +       |                     |           |
|     |            |            | expandable rows;         |                     |           |
|     |            |            | shared buildLeaderboard  |                     |           |
|     |            |            | lib; tsc + build clean;  |                     |           |
|     |            |            | 131 tests pass;          |                     |           |
|     |            |            | commit 6463b1a           |                     |           |
| 27  | 2026-02-27 | E / app-08 | Dashboard pages: 10      | Run app-09-         | None      |
|     |            |            | routes (landing, join,   | tests (full suite   |           |
|     |            |            | dashboard, 6 admin),     | + coverage >80%)    |           |
|     |            |            | admin layout w/ sidebar  |                     |           |
|     |            |            | + role guard, 14 shared  |                     |           |
|     |            |            | components (navbar,      |                     |           |
|     |            |            | admin-sidebar, status-   |                     |           |
|     |            |            | badge, confirm-dialog,   |                     |           |
|     |            |            | etc), /api/me endpoint,  |                     |           |
|     |            |            | useAuth + useFetch       |                     |           |
|     |            |            | hooks; build + tsc       |                     |           |
|     |            |            | clean; 131 tests pass;   |                     |           |
|     |            |            | commit ea65645           |                     |           |
| 28  | 2026-02-27 | E / app-09 | Full test suite: 7 new   | Run app-10-ci-cd    | None      |
|     |            |            | test files + 1 extended  |                     |           |
|     |            |            | (leaderboard 17 tests,   |                     |           |
|     |            |            | challenge-gate 9, me 7,  |                     |           |
|     |            |            | audit 2, utils 4,        |                     |           |
|     |            |            | health 1, leaderboard    |                     |           |
|     |            |            | API 3, isGlobalAdmin     |                     |           |
|     |            |            | 4); @vitest/coverage-v8  |                     |           |
|     |            |            | configured; 178 tests    |                     |           |
|     |            |            | pass; lines 93%,         |                     |           |
|     |            |            | branches 86%;            |                     |           |
|     |            |            | commit 1a92ad3           |                     |           |
| 29  | 2026-02-27 | E / app-10 | CI/CD workflows: CI      | Phase F: F1 seed    | None      |
|     |            |            | (5 jobs: lint, type-     | script, F2 OpenAPI, |           |
|     |            |            | check, test+coverage,    | F3-F6 docs + repo   |           |
|     |            |            | bicep-validate, build),  | metadata updates    |           |
|     |            |            | deploy (dev+prod envs,   |                     |           |
|     |            |            | OIDC, staging slot       |                     |           |
|     |            |            | swap, health check);     |                     |           |
|     |            |            | actionlint 0 errors;     |                     |           |
|     |            |            | Phase E complete;        |                     |           |
|     |            |            | commit 4b0447b           |                     |           |
| 30  | 2026-02-27 | F / all    | F1: Enhanced seed-       | All phases complete | None      |
|     |            |            | cosmos.ts (11 containers |                     |           |
|     |            |            | + sample docs) + test    |                     |           |
|     |            |            | fixtures; F3: testing-   |                     |           |
|     |            |            | strategy.md; F4:         |                     |           |
|     |            |            | security-checklist.md;   |                     |           |
|     |            |            | F5: local-dev-guide.md;  |                     |           |
|     |            |            | F6: meta-doc updates     |                     |           |
|     |            |            | (QUALITY_SCORE, README,  |                     |           |
|     |            |            | copilot-instructions);   |                     |           |
|     |            |            | Phase F complete         |                     |           |
| 31  | 2026-02-27 | Wrap-up    | PR #177 merged to main   | Phase 12:           | None      |
|     |            |            | (feat: Phase E+F);       | Production          |           |
|     |            |            | dependabot PR #175       | Hardening           |           |
|     |            |            | (upload-artifact v4→v7)  | (future session)    |           |
|     |            |            | merged; deleted all      |                     |           |
|     |            |            | feature branches;        |                     |           |
|     |            |            | only main remains.       |                     |           |
|     |            |            | Open: #27/#153/#154      |                     |           |
|     |            |            | (Phase 12, blocked)      |                     |           |
| 32  | 2026-02-27 | Phase 12   | Created Phase 12 exec    | H1: az login +      | az login  |
|     |            | planning   | plan with 7 steps        | governance re-run   | required  |
|     |            |            | (H1-H7); reviewed        |                     |           |
|     |            |            | issues #27/#153/#154;    |                     |           |
|     |            |            | reverted upload-         |                     |           |
|     |            |            | artifact to v4           |                     |           |
| 33  | 2026-02-27 | H1         | Re-ran governance        | H2: Cross-ref       | None      |
|     |            |            | discovery; policies      | Bicep templates     |           |
|     |            |            | unchanged (21 policies,  |                     |           |
|     |            |            | 9 tags, Cosmos RBAC-     |                     |           |
|     |            |            | only); no file updates   |                     |           |
|     |            |            | needed                   |                     |           |
| 35  | 2026-02-28 | G / G2+G4  | Post-impl adversarial    | G3: Docker build    | Docker    |
|     |            |            | reviews: security (0     | test (blocked: no   | not in    |
|     |            |            | crit, 0 high, 2 med)     | Docker in           | dev-      |
|     |            |            | + logic (0 crit, 0       | devcontainer),      | container |
|     |            |            | high, 2 med); fixed      | then G5 supervised  |           |
|     |            |            | Trivy pin, missing       | first deploy        |           |
|     |            |            | Bicep params, CI         |                     |           |
|     |            |            | NODE_VERSION; commit     |                     |           |
|     |            |            | 8885d14 pushed           |                     |           |
| 34  | 2026-02-28 | G / G1     | Containerization:        | G2: Post-impl       | None      |
|     |            |            | Dockerfile (3-stage,     | adversarial reviews |           |
|     |            |            | node:24-alpine),         | (security + logic), |           |
|     |            |            | .dockerignore, ACR       | then local Docker   |           |
|     |            |            | Bicep module (Standard   | build test, commit, |           |
|     |            |            | via AVM), main.bicep     | and supervised      |           |
|     |            |            | (ACR + imageTag +        | first deploy        |           |
|     |            |            | AcrPull RBAC for both    |                     |           |
|     |            |            | slots + staging KV/      |                     |           |
|     |            |            | Cosmos RBAC), app-svc    |                     |           |
|     |            |            | (DOCKER linuxFxVersion,  |                     |           |
|     |            |            | staging slot w/ MI),     |                     |           |
|     |            |            | deploy workflow (ACR     |                     |           |
|     |            |            | push + Trivy + auto-     |                     |           |
|     |            |            | rollback), CI docker-    |                     |           |
|     |            |            | build job, health        |                     |           |
|     |            |            | warmup, ACR purge,       |                     |           |
|     |            |            | first-deploy-runbook;    |                     |           |
|     |            |            | bicep build clean;       |                     |           |
|     |            |            | 12 files created/        |                     |           |
|     |            |            | updated; doc-gardening   |                     |           |
|     |            |            | run (Infra B+→A-)        |                     |           |
| 36  | 2026-02-28 | H / H0     | Phase H plan: delete &   | H0.4: bicep build,  | None      |
|     |            |            | recreate App Service     | H0.5: commit, then  |           |
|     |            |            | (not in prod, safe);     | H1: delete old      |           |
|     |            |            | updated deploy.ps1       | resources via CLI   |           |
|     |            |            | (drop stacks, add        |                     |           |
|     |            |            | imageTag + adminGH       |                     |           |
|     |            |            | params); updated         |                     |           |
|     |            |            | runbook with Step 0;     |                     |           |
|     |            |            | session tracker with     |                     |           |
|     |            |            | Phase H checklist        |                     |           |
| 37  | 2026-02-28 | H / H0-H2  | H0.4 bicep build pass;   | H3.1: Bicep deploy  | P1v3      |
|     |            |            | H1 deleted: stack,       | with S1 SKU (retry) | quota = 0 |
|     |            |            | staging slot, App Svc,   |                     | in sub;   |
|     |            |            | ASP; verified clean      |                     | switched  |
|     |            |            | RG; H2 created OIDC      |                     | to S1 for |
|     |            |            | app reg + federated      |                     | dev       |
|     |            |            | cred + RBAC (Contrib     |                     |           |
|     |            |            | + UAA); admin code       |                     |           |
|     |            |            | updated to accept        |                     |           |
|     |            |            | usernames; first         |                     |           |
|     |            |            | deploy attempt failed    |                     |           |
|     |            |            | (P1v3 quota); fixed      |                     |           |
|     |            |            | SKU to S1; commits       |                     |           |
|     |            |            | 5a41294, 848ddb1         |                     |           |
| 38  | 2026-03-01 | Planning   | Defined Phase I defaults | I1: Delete existing | None      |
|     |            |            | (swedencentral, P1v4,    | centralus deploy,   |           |
|     |            |            | SQL S2, /23 network);    | then update Bicep   |           |
|     |            |            | created ADR-0004 (SQL    | + adversarial       |           |
|     |            |            | over Cosmos); planned    | reviews + deploy    |           |
|     |            |            | 8-step Phase I with      | to swedencentral    |           |
|     |            |            | 2x adversarial gates     |                     |           |
|     |            |            | + Context7 check;        |                     |           |
|     |            |            | ACI for VNet seeding     |                     |           |
| 39  | 2026-03-02 | I / I1-I3  | I1: centralus RG deleted | I3.2: Run           | None      |
|     |            |            | by user; I2: all Bicep   | app-security-       |           |
|     |            |            | updates verified clean   | challenger-subagent |           |
|     |            |            | (swedencentral, P1v4,    | (Phase I, first     |           |
|     |            |            | SQL S2, /23 VNet,        | pass), then I3.3    |           |
|     |            |            | param file); bicep       | fix findings, I4    |           |
|     |            |            | build 0 errors; I3.1     | Context7 check,     |           |
|     |            |            | infra-challenger done    | I5 final gate,      |           |
|     |            |            | (2026-03-01, 2 rounds,   | then I6 deploy      |           |
|     |            |            | must_fix addressed in    |                     |           |
|     |            |            | current code); az login  |                     |           |
|     |            |            | confirmed active         |                     |           |
| 40  | 2026-03-02 | I / I3-I4  | I3.2: 3-pass app-security| I5: Adversarial     | None      |
|     |            |            | review (1 crit, 1 high,  | review round 2      |           |
|     |            |            | 2 med, 2 low); I3.3:     | (final gate), then  |           |
|     |            |            | fixed CRITICAL            | I6 deploy to        |           |
|     |            |            | extractHackathonId bug   | swedencentral       |           |
|     |            |            | (7 routes broken in      |                     |           |
|     |            |            | prod), converted to      |                     |           |
|     |            |            | requireAuth+checkRole,   |                     |           |
|     |            |            | stripped eventCode from   |                     |           |
|     |            |            | listing, added security  |                     |           |
|     |            |            | headers; I4: all current |                     |           |
|     |            |            | (next 16.1.6, mssql 11,  |                     |           |
|     |            |            | zod 4.3.6, AVM pinned);  |                     |           |
|     |            |            | tsc + bicep build clean  |                     |           |
| 41  | 2026-03-02 | I / I5-I6  | I5 final gate: 0         | I7: Seed data via   | None      |
|     |            |            | crit, 0 high across      | ACI (VNet), then    |           |
|     |            |            | infra + app security     | I8: Update docs     |           |
|     |            |            | reviews; fixed 13 test   |                     |           |
|     |            |            | failures (join event     |                     |           |
|     |            |            | codes + rubric desc);    |                     |           |
|     |            |            | I6: deployed to          |                     |           |
|     |            |            | swedencentral (rg-       |                     |           |
|     |            |            | hackops-se-dev); fixed   |                     |           |
|     |            |            | slot kind, Dockerfile,   |                     |           |
|     |            |            | AZURE_CLIENT_ID for      |                     |           |
|     |            |            | UAMI; health OK (prod    |                     |           |
|     |            |            | 5ms, staging 65ms SQL)   |                     |           |

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

| Phase          | Additional context files                     |
| -------------- | -------------------------------------------- |
| A (docs)       | `plan-hackOps.prompt.md` (Phases 5-10)       |
| B (backlog)    | `docs/prd.md`, `docs/api-contract.md`        |
| C (toolchain)  | `agent-definitions.instructions.md`,         |
|                | `agent-skills.instructions.md`,              |
|                | `microsoft-skill-creator` skill              |
| D (infra)      | `azure-defaults` skill, existing agent defs  |
| E (app)        | All Phase A docs, `hackops-domain` skill,    |
|                | `api-contract.ts` types                      |
| F (supporting) | `AGENTS.md`, `docs/README.md`                |
| G (container)  | `archive/prompts/plan-containerizeHackOps`,  |
|                | `docs/first-deploy-runbook.md`,              |
|                | `infra/bicep/hackops/main.bicep`,            |
|                | `apps/web/Dockerfile`,                       |
|                | `.github/workflows/hackops-deploy.yml`       |
| H (first-dep)  | `docs/first-deploy-runbook.md`,              |
|                | `infra/bicep/hackops/deploy.ps1`,            |
|                | `infra/bicep/hackops/main.bicep`,            |
|                | `.github/workflows/hackops-deploy.yml`       |
| I (migration)  | All Bicep modules in `infra/bicep/hackops/`, |
|                | `03-des-adr-0004-sql-database-over-cosmos`,  |
|                | `docs/first-deploy-runbook.md`,              |
|                | `docs/environment-config.md`                 |

---

## Decisions Made During Execution

<!-- Record any runtime decisions that deviate from the blueprint -->

| Date       | Decision                                        | Rationale                                          |
| ---------- | ----------------------------------------------- | -------------------------------------------------- |
| 2026-02-25 | Hackers submit evidence; Coaches score          | Scoring authority belongs with Coaches             |
| 2026-02-25 | Event codes plaintext + rate limit (5/min/IP)   | Hashing adds complexity without real gain          |
| 2026-02-25 | Tiebreaker: earliest last-approval timestamp    | Rewards faster completion on equal scores          |
| 2026-02-25 | Unlimited evidence resubmissions allowed        | Scores only entered by Coach; no reason to limit   |
| 2026-02-25 | Team balance: `ceil(teamSize/2)` min per team   | Prevents runt teams of 1                           |
| 2026-02-25 | Coach review queue is hackathon-scoped          | Coaches see only their assigned events             |
| 2026-02-26 | 10-Challenger to infra-challenger-subagent      | Adversarial review invoked by parent agents        |
| 2026-02-26 | C3 skills created manually (no Learn MCP)       | Skills include MCP queries for future freshness    |
| 2026-02-26 | Instructions auto-discovered (no devcontainer)  | `.github/instructions/` files auto-apply by glob   |
| 2026-02-26 | 9 tags required on RG, lowercase keys           | Deny policy JV-Enforce RG Tags v3 requires 9 tags |
| 2026-02-26 | Cosmos DB Entra ID RBAC only (no conn strings)  | Modify policy auto-disables local auth             |
| 2026-02-26 | Tag keys lowercase (not PascalCase)             | Policy checks `tags['environment']`                |
| 2026-02-27 | Next.js 16 middleware convention still used      | "proxy" rename is cosmetic; migration can wait     |
| 2026-02-28 | Delete and recreate App Service                 | NODE 22-lts to DOCKER needs fresh resource         |
| 2026-02-28 | Drop Deployment Stacks for `az deployment`      | Incremental deploy aligns CI/CD and deploy.ps1     |
| 2026-02-28 | ADMIN_GITHUB_IDS accepts usernames              | `jonathan-vella` not just numeric ID               |
| 2026-02-28 | S1 SKU for dev/staging, P1v3 for prod only      | PremiumV3 quota=0; S1 supports slots+containers   |
| 2026-03-01 | Region: swedencentral, alt germanywestcentral   | EU regions preferred for hackathon audience        |
| 2026-03-01 | App Service SKU: P1v4 (all environments)        | Replaces S1 (dev) + P1v3 (prod)                   |
| 2026-03-01 | Azure SQL DB: S2 (50 DTU) not GP_S_Gen5_2       | DTU tier simpler/cheaper for bursty workload       |
| 2026-03-01 | VNet CIDR: 10.0.0.0/23 (512 addresses)          | /16 was over-provisioned for single workload       |
| 2026-03-01 | Data seeding via ACI (VNet-integrated)          | SQL DB behind PE; ACI seeds from inside VNet       |
| 2026-03-01 | Replace Cosmos DB with Azure SQL (ADR-0004)     | Relational workload; joins, ref integrity          |
| 2026-03-02 | requireAuth+checkRole for non-hackathon routes  | extractHackathonId broke 7 routes                  |
| 2026-03-02 | Strip eventCode from GET /api/hackathons        | eventCode is invite secret                         |
| 2026-03-02 | App Service kind: `app,linux,container`         | DOCKER linuxFxVersion needs container in kind      |
| 2026-03-02 | `AZURE_CLIENT_ID` app setting for UAMI SQL      | DefaultAzureCredential needs client ID for UAMI    |
| 2026-03-02 | Dockerfile: skip shared/node_modules COPY       | npm workspaces hoists deps; dir absent at build    |
