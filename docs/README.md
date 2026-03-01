# HackOps Documentation

> Azure hackathon management platform | [Current Version](../VERSION.md)

Transform the HackOps platform requirements into deployable code using coordinated
AI agents and reusable skills, aligned with Azure Well-Architected Framework (WAF) and
Azure Verified Modules (AVM).

## What's New: VS Code 1.109 Agent Orchestration

This project now implements the **Conductor pattern** from VS Code 1.109:

- **01-Conductor**: Master orchestrator with mandatory human approval gates
- **Validation Subagents**: TDD-style Bicep validation (lint → what-if → review)
- **New Frontmatter**: `user-invokable`, `agents` list, model fallbacks
- **Skills GA**: Skills are now generally available with enhanced discovery

See the [conductor agent](../.github/agents/01-conductor.agent.md) for orchestration details.

## Quick Links

| Resource                                        | Description                   |
| ----------------------------------------------- | ----------------------------- |
| [Project Overview](project-overview.md)         | End-to-end project explainer  |
| [HackOps User Guide](hackops-user-guide.md)     | Step-by-step runbook          |
| [PRD](prd.md)                                   | Product Requirements Document |
| [API Contract](api-contract.md)                 | 26-endpoint REST API spec     |
| [Data Model](data-model.md)                     | SQL Database tables & schema  |
| [UI Pages](ui-pages.md)                         | Page inventory & route map    |
| [Environment Config](environment-config.md)     | Env vars & Key Vault refs     |
| [Dev Containers](dev-containers.md)             | Docker setup and alternatives |
| [Testing Strategy](testing-strategy.md)         | Test pyramid & coverage       |
| [Security Checklist](security-checklist.md)     | Security invariants           |
| [Local Dev Guide](local-dev-guide.md)           | Local setup step-by-step      |
| [First-Deploy Runbook](first-deploy-runbook.md) | Container migration runbook   |
| [Backlog Setup](exec-plans/backlog-setup.md)    | GitHub Project board config   |

---

## Agents (13 + 11 Subagents)

Agents are interactive AI assistants for specific workflow phases. Invoke via `Ctrl+Shift+A`.
See `AGENTS.md` at the repo root for the lightweight map.

### Conductor (Master Orchestrator)

| Agent          | Persona    | Purpose                                                |
| -------------- | ---------- | ------------------------------------------------------ |
| `01-Conductor` | 🎼 Maestro | Orchestrates all 7 steps with mandatory approval gates |

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

### Utility Agents (User-Invokable)

| Agent               | Persona    | Phase | Purpose                                             |
| ------------------- | ---------- | ----- | --------------------------------------------------- |
| `context-optimizer` | 🔎 Auditor | —     | Audit context window usage, recommend optimizations |

### App-Dev Agents (User-Invokable)

| Agent           | Persona       | Step | Purpose                             |
| --------------- | ------------- | ---- | ----------------------------------- |
| `app-builder`   | 🏗️ Builder    | A1-7 | Full-stack build with Context7      |
| `app-tester`    | 🧪 Tester     | A8   | Vitest unit + integration tests     |
| `app-conductor` | 🎼 Maestro II | A9+  | Orchestrates app-dev + CI/CD deploy |

### Adversarial Subagents

| Subagent                           | Parent Agents                 | Purpose                                               |
| ---------------------------------- | ----------------------------- | ----------------------------------------------------- |
| `infra-challenger-subagent`        | Requirements, Architect, Plan | Challenges infra plans for governance/WAF/feasibility |
| `app-security-challenger-subagent` | App Builder, App Tester       | Challenges app code for auth bypass, IDOR, injection  |
| `app-logic-challenger-subagent`    | App Tester, App Conductor     | Challenges business rules, contract drift, edge cases |

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

## Skills (19)

Skills are reusable capabilities that agents invoke or that activate automatically based on prompts.

### Operating Principles

| Skill               | Purpose                                | Triggers                           |
| ------------------- | -------------------------------------- | ---------------------------------- |
| `golden-principles` | 10 operating principles for all agents | Always loaded first by every agent |

### Context & Optimization

| Skill               | Purpose                                     | Triggers                                           |
| ------------------- | ------------------------------------------- | -------------------------------------------------- |
| `context-optimizer` | Context window auditing and token profiling | "optimize context", "audit tokens", "reduce waste" |

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

### App-Dev / HackOps (Category 4)

| Skill                | Purpose                                         | Triggers                                 |
| -------------------- | ----------------------------------------------- | ---------------------------------------- |
| `hackops-domain`     | HackOps business rules, roles, lifecycle states | "hackops", "hackathon rules", "scoring"  |
| `nextjs-patterns`    | Next.js 15+ App Router patterns and conventions | "next.js", "app router", "route handler" |
| ~~`cosmos-db-sdk`~~  | ~~Cosmos DB SDK~~ — archived (SQL migration)    | Moved to `archive/skills/cosmos-db-sdk/` |
| `shadcn-ui-patterns` | shadcn/ui components + Tailwind CSS v4 patterns | "shadcn", "ui component", "tailwind"     |
| `zod-validation`     | Zod 4 schema patterns for API + form validation | "zod", "schema", "validate request"      |

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
hack-ops/
├── AGENTS.md             # Lightweight map (start here)
├── QUALITY_SCORE.md      # Project health grades
├── .github/
│   ├── agents/           # 13 agent definitions + 11 subagents
│   ├── skills/           # 20 skill definitions (incl. golden-principles)
│   └── instructions/     # 26 file-type rules (consolidated)
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
