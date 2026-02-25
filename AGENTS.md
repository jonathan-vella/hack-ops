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

Agent definitions: `.github/agents/*.agent.md`

### Adversarial Subagents

| Subagent                         | Parent Agents                           | Purpose                                               |
| -------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| infra-challenger-subagent        | Requirements, Architect, Bicep Plan     | Challenges infra plans for governance/WAF/feasibility |
| app-security-challenger-subagent | API Builder, Test Writer, App Conductor | Challenges app code for auth bypass, IDOR, injection  |
| app-logic-challenger-subagent    | Test Writer, App Conductor              | Challenges business rules, contract drift, edge cases |

### Other Subagents

| Subagent                      | Parent Agent | Purpose                         |
| ----------------------------- | ------------ | ------------------------------- |
| cost-estimate-subagent        | Architect    | Pricing MCP queries             |
| governance-discovery-subagent | Bicep Plan   | Azure Policy REST API discovery |
| bicep-lint-subagent           | Bicep Code   | `bicep build` + `bicep lint`    |
| bicep-review-subagent         | Bicep Code   | AVM/security/naming code review |
| bicep-whatif-subagent         | Deploy       | `az deployment group what-if`   |

Subagent definitions: `.github/agents/_subagents/`

## Where to Find Things

| What                      | Where                                    |
| ------------------------- | ---------------------------------------- |
| Golden principles         | `.github/skills/golden-principles/`      |
| Domain knowledge (skills) | `.github/skills/*/SKILL.md`              |
| File-type rules           | `.github/instructions/*.instructions.md` |
| Azure conventions         | `.github/skills/azure-defaults/`         |
| Artifact templates        | `.github/skills/azure-artifacts/`        |
| Deep documentation        | `docs/`                                  |
| Execution plans           | `docs/exec-plans/`                       |
| Project health            | `QUALITY_SCORE.md`                       |
| Tech debt tracking        | `docs/exec-plans/tech-debt-tracker.md`   |

## Key Conventions (Pointers Only)

- **Default region**: `swedencentral` → details in `azure-defaults` skill
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
