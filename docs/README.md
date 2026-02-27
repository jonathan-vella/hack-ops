# Agentic InfraOps Documentation

> Azure infrastructure engineered by AI agents and skills | [Current Version](../VERSION.md)

Transform Azure infrastructure requirements into deploy-ready Bicep code using coordinated
AI agents and reusable skills, aligned with Azure Well-Architected Framework (WAF) and
Azure Verified Modules (AVM).

## What's New: VS Code 1.109 Agent Orchestration

This project now implements the **Conductor pattern** from VS Code 1.109:

- **InfraOps Conductor**: Master orchestrator with mandatory human approval gates
- **Validation Subagents**: TDD-style Bicep validation (lint → what-if → review)
- **New Frontmatter**: `user-invokable`, `agents` list, model fallbacks
- **Skills GA**: Skills are now generally available with enhanced discovery

See the [conductor agent](../.github/agents/01-conductor.agent.md) for orchestration details.

## Quick Links

| Resource                                     | Description                   |
| -------------------------------------------- | ----------------------------- |
| [Project Overview](project-overview.md)      | End-to-end project explainer  |
| [HackOps User Guide](hackops-user-guide.md)  | Step-by-step runbook          |
| [PRD](prd.md)                                | Product Requirements Document |
| [API Contract](api-contract.md)              | 26-endpoint REST API spec     |
| [Data Model](data-model.md)                  | Cosmos DB containers & schema |
| [UI Pages](ui-pages.md)                      | Page inventory & route map    |
| [Environment Config](environment-config.md)  | Env vars & Key Vault refs     |
| [Dev Containers](dev-containers.md)          | Docker setup and alternatives |
| [Backlog Setup](exec-plans/backlog-setup.md) | GitHub Project board config   |

---

## Agents (15 + 11 Subagents)

Agents are interactive AI assistants for specific workflow phases. Invoke via `Ctrl+Shift+A`.
See `AGENTS.md` at the repo root for the lightweight map.

### Conductor (Master Orchestrator)

| Agent                | Persona    | Purpose                                                |
| -------------------- | ---------- | ------------------------------------------------------ |
| `InfraOps Conductor` | 🎼 Maestro | Orchestrates all 7 steps with mandatory approval gates |

### Primary Agents (User-Invokable)

| Agent                  | Persona       | Phase | Purpose                            |
| ---------------------- | ------------- | ----- | ---------------------------------- |
| `requirements`         | 📜 Scribe     | 1     | Gather infrastructure requirements |
| `architect`            | 🏛️ Oracle     | 2     | WAF assessment and design          |
| `design`               | 🎨 Artisan    | 3     | Diagrams and ADRs                  |
| `bicep-planner`        | 📐 Strategist | 4     | Implementation planning            |
| `bicep-code-generator` | ⚒️ Forge      | 5     | Bicep template generation          |
| `deploy`               | 🚀 Envoy      | 6     | Azure deployment                   |
| `as-built`             | 📝 Chronicler | 7     | Post-deployment documentation      |
| `diagnose`             | 🔍 Sentinel   | —     | Post-deployment diagnostics        |

### App-Dev Agents (User-Invokable)

| Agent              | Persona       | Step | Purpose                             |
| ------------------ | ------------- | ---- | ----------------------------------- |
| `app-scaffolder`   | 🏗️ Builder    | A1   | Turborepo + Next.js 15 scaffold     |
| `api-builder`      | 🔌 Connector  | A2-6 | API routes, Zod, role guards        |
| `frontend-builder` | 🎨 Painter    | A7   | Pages, layouts, shadcn/ui           |
| `test-writer`      | 🧪 Tester     | A8   | Vitest unit + integration tests     |
| `app-deployer`     | 🚢 Shipper    | A9   | CI/CD workflows, App Service deploy |
| `app-conductor`    | 🎼 Maestro II | —    | Orchestrates app-dev workflow       |

### Adversarial Subagents

| Subagent                           | Parent Agents                 | Purpose                                               |
| ---------------------------------- | ----------------------------- | ----------------------------------------------------- |
| `infra-challenger-subagent`        | Requirements, Architect, Plan | Challenges infra plans for governance/WAF/feasibility |
| `app-security-challenger-subagent` | API Builder, Test Writer      | Challenges app code for auth bypass, IDOR, injection  |
| `app-logic-challenger-subagent`    | Test Writer, App Conductor    | Challenges business rules, contract drift, edge cases |

### Validation Subagents (Conductor-Invoked)

| Subagent                        | Purpose                               | Returns                        |
| ------------------------------- | ------------------------------------- | ------------------------------ |
| `bicep-lint-subagent`           | Bicep syntax validation               | PASS/FAIL with diagnostics     |
| `bicep-whatif-subagent`         | Deployment preview (what-if analysis) | Change summary, violations     |
| `bicep-review-subagent`         | Code review against AVM standards     | APPROVED/NEEDS_REVISION/FAILED |
| `cost-estimate-subagent`        | Pricing MCP queries                   | Cost breakdown                 |
| `governance-discovery-subagent` | Azure Policy REST API discovery       | Policy constraints             |

### App-Dev Subagents (Agent-Invoked)

| Subagent              | Purpose                          | Returns                   |
| --------------------- | -------------------------------- | ------------------------- |
| `app-lint-subagent`   | TypeScript + ESLint validation   | PASS/FAIL with error list |
| `app-review-subagent` | Code review against instructions | APPROVED/NEEDS_REVISION   |
| `app-test-subagent`   | Test execution + coverage report | PASS/FAIL with coverage % |

---

## Skills (14)

Skills are reusable capabilities that agents invoke or that activate automatically based on prompts.

### Operating Principles

| Skill               | Purpose                                | Triggers                           |
| ------------------- | -------------------------------------- | ---------------------------------- |
| `golden-principles` | 10 operating principles for all agents | Always loaded first by every agent |

### Azure Conventions (Category 1)

| Skill                   | Purpose                                       | Triggers                                         |
| ----------------------- | --------------------------------------------- | ------------------------------------------------ |
| `azure-defaults`        | Azure conventions, naming, AVM, WAF, pricing  | "azure defaults", "naming", "AVM"                |
| `azure-artifacts`       | Template H2 structures, styling, generation   | "generate documentation", "create runbook"       |
| `azure-bicep-patterns`  | Common Bicep infra patterns (hub-spoke, etc.) | "bicep pattern", "hub-spoke", "private endpoint" |
| `azure-troubleshooting` | Azure resource troubleshooting and KQL        | "troubleshoot", "diagnose resource"              |

### Document Creation (Category 2)

| Skill            | Purpose                       | Triggers                                   |
| ---------------- | ----------------------------- | ------------------------------------------ |
| `azure-diagrams` | Python architecture diagrams  | "create diagram", "visualize architecture" |
| `azure-adr`      | Architecture Decision Records | "create ADR", "document decision"          |

### Workflow & Tool Integration (Category 3)

| Skill                      | Purpose                                    | Triggers                                       |
| -------------------------- | ------------------------------------------ | ---------------------------------------------- |
| `github-operations`        | GitHub issues, PRs, CLI, Actions, releases | "create issue", "create PR", "gh command"      |
| `git-commit`               | Commit message conventions                 | "commit", "conventional commit"                |
| `docs-writer`              | Repo-aware docs maintenance                | "audit docs", "fix counts", "freshness check"  |
| `make-skill-template`      | Create new skills                          | "create skill", "scaffold skill"               |
| `microsoft-code-reference` | Look up Microsoft API refs and samples     | "API reference", "SDK sample", "verify method" |
| `microsoft-docs`           | Query official Microsoft documentation     | "microsoft docs", "learn.microsoft.com"        |
| `microsoft-skill-creator`  | Create agent skills for Microsoft tech     | "create microsoft skill", "foundry skill"      |

---

## 7-Step Workflow (with Conductor)

```text
Requirements → Architecture → Design → Planning → Implementation → Deploy → Documentation
     ↓             ↓           ↓          ↓             ↓           ↓           ↓
   Agent        Agent       Skills     Agent         Agent       Agent       Skills
```

See [AGENTS.md](../AGENTS.md) for the detailed agent workflow map.

---

## Prompt Guide

Learn how to interact with every agent and skill through ready-to-use
prompt examples in `docs/prompt-guide/`:

| Section                 | Content                              |
| ----------------------- | ------------------------------------ |
| 7-Step Workflow Prompts | Step-by-step examples for each agent |
| Standalone Agents       | Conductor and Diagnose usage         |
| Skill Reference         | Independent skill invocation         |
| Tips & Patterns         | Advanced prompting techniques        |

<!-- Prompt guide planned for Phase F -->

---

## Project Structure

```text
azure-agentic-infraops/
├── AGENTS.md             # Lightweight map (start here)
├── QUALITY_SCORE.md      # Project health grades
├── .github/
│   ├── agents/           # 15 agent definitions + 11 subagents
│   ├── skills/           # 14 skill definitions (incl. golden-principles)
│   └── instructions/     # 21 file-type rules (consolidated)
├── agent-output/         # Generated artifacts
├── infra/bicep/          # Bicep templates
├── docs/
│   ├── exec-plans/       # Active and completed execution plans
│   ├── prompt-guide/     # Prompt examples for agents & skills
│   └── *.md              # Reference documentation
```

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/jonathan-vella/hack-ops/issues)
- **Troubleshooting**: Check [GitHub Issues](https://github.com/jonathan-vella/hack-ops/issues)
