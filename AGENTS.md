# Agentic InfraOps — Agent Map

> Azure infrastructure engineered by agents. Verified. Well-Architected. Deployable.
> This file is the **table of contents** — not the encyclopedia.
> Read deeper sources only when needed.

## 7-Step Workflow

| Step | Agent        | Output                          | Gate     |
| ---- | ------------ | ------------------------------- | -------- |
| 1    | Requirements | `01-requirements.md`            | Approval |
| 2    | Architect    | `02-architecture-assessment.md` | Approval |
| 3    | Design (opt) | `03-des-*.{py,png,md}`          | —        |
| 4    | Bicep Plan   | `04-implementation-plan.md`     | Approval |
| 5    | Bicep Code   | `infra/bicep/{project}/`        | Validate |
| 6    | Deploy       | `06-deployment-summary.md`      | Approval |
| 7    | As-Built     | `07-*.md` documentation suite   | —        |

All outputs → `agent-output/{project}/`.

## App-Dev Workflow

| Step | Agent         | Output                       | Gate     |
| ---- | ------------- | ---------------------------- | -------- |
| A1-7 | App Builder   | Monorepo, API routes, pages  | Validate |
| A8   | App Tester    | Vitest unit + integration    | PASS     |
| A9   | App Conductor | CI/CD workflows, App Service | Approval |

App Conductor orchestrates steps A1–A9.
All app code → `apps/web/`.

## Agent Roster

| Agent            | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| 01-Conductor     | Master orchestrator with human approval gates       |
| 02-Requirements  | Business-first requirements discovery               |
| 03-Architect     | WAF assessment, cost estimates, architecture design |
| 04-Design        | Architecture diagrams and ADRs (optional)           |
| 05-Bicep Planner | Implementation planning and governance discovery    |
| 06-Bicep Code    | Bicep template generation with AVM modules          |
| 07-Deploy        | Azure deployment with what-if analysis              |
| 08-As-Built      | Post-deployment documentation suite                 |
| 09-Diagnose      | Resource health assessment and troubleshooting      |

### Utility Agents

| Agent                | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| 10-Context Optimizer | Audits agent context window usage, recommends hand-off points |

### App-Dev Agents

| Agent            | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| 11-App Builder   | Full-stack: scaffold, API routes, frontend (Context7-verified) |
| 12-App Tester    | Unit tests (Vitest), integration tests, E2E stubs              |
| 13-App Conductor | Orchestrates app-dev workflow + CI/CD deployment               |

Agent definitions: `.github/agents/*.agent.md`

### Adversarial Subagents

Each adversarial subagent runs **3 focused review passes** per invocation.
Parent agents make a single call; the subagent returns aggregated findings across all passes.
Findings are written to `agent-output/{project}/challenges/`.

| Subagent                         | Parent Agents                          | Passes                                   | Purpose                                               |
| -------------------------------- | -------------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| infra-challenger-subagent        | Requirements, Architect, Bicep Plan    | security, waf, governance                | Challenges infra plans for governance/WAF/feasibility |
| app-security-challenger-subagent | App Builder, App Tester, App Conductor | auth, api-routes, data-handling          | Challenges app code for auth bypass, IDOR, injection  |
| app-logic-challenger-subagent    | App Tester, App Conductor              | api-contract, business-rules, data-model | Challenges business rules, contract drift, edge cases |

### Other Subagents

| Subagent                      | Parent Agent | Purpose                         |
| ----------------------------- | ------------ | ------------------------------- |
| cost-estimate-subagent        | Architect    | Pricing MCP queries             |
| governance-discovery-subagent | Bicep Plan   | Azure Policy REST API discovery |
| bicep-lint-subagent           | Bicep Code   | `bicep build` + `bicep lint`    |
| bicep-review-subagent         | Bicep Code   | AVM/security/naming code review |
| bicep-whatif-subagent         | Deploy       | `az deployment group what-if`   |

### App-Dev Subagents

| Subagent            | Parent Agent | Purpose                            |
| ------------------- | ------------ | ---------------------------------- |
| app-lint-subagent   | App Builder  | `tsc --noEmit` + ESLint validation |
| app-review-subagent | App Builder  | Code review against instructions   |
| app-test-subagent   | App Tester   | `npm test` + coverage reporting    |

Subagent definitions: `.github/agents/_subagents/`

## Where to Find Things

| What                      | Where                                    |
| ------------------------- | ---------------------------------------- |
| Golden principles         | `.github/skills/golden-principles/`      |
| Context optimization      | `.github/skills/context-optimizer/`      |
| Context opt. workflow     | `docs/context-optimization/`             |
| Domain knowledge (skills) | `.github/skills/*/SKILL.md`              |
| File-type rules           | `.github/instructions/*.instructions.md` |
| Azure conventions         | `.github/skills/azure-defaults/`         |
| Artifact templates        | `.github/skills/azure-artifacts/`        |
| Deep documentation        | `docs/`                                  |
| Execution plans           | `docs/exec-plans/`                       |
| Project health            | `QUALITY_SCORE.md`                       |
| Tech debt tracking        | `docs/exec-plans/tech-debt-tracker.md`   |

## Key Conventions (Pointers Only)

- **Default region**: `centralus` → details in `azure-defaults` skill
- **Required tags**: Minimum 4, governance may require more → details in `azure-defaults` skill
- **AVM-first**: Always prefer Azure Verified Modules → details in `azure-defaults` skill
- **Security baseline**: TLS 1.2, HTTPS-only, managed identity → details in `azure-defaults` skill

## Operating Principles

Read `.github/skills/golden-principles/SKILL.md` for the 10 golden principles
that govern how agents operate in this repository.

## Validation

```bash
npm run validate        # All frontmatter and template validators
npm run lint:md         # Markdown linting
bicep build main.bicep  # Bicep syntax check
```
