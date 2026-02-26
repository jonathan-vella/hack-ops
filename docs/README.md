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

| Resource                              | Description                   |
| ------------------------------------- | ----------------------------- |
| [Quickstart](hackops-user-guide.md)           | Get running in 10 minutes     |
| [Workflow](hackops-user-guide.md)               | 7-step agent + skill workflow |
| [Dev Containers](dev-containers.md)   | Docker setup and alternatives |
| [Prompt Guide](hackops-user-guide.md)         | Agent & skill prompt examples |
| [Troubleshooting](hackops-user-guide.md) | Common issues and solutions   |
| [Glossary](hackops-user-guide.md#glossary)               | Terms and definitions         |

---

## Agents (9 + 8 Subagents)

Agents are interactive AI assistants for specific workflow phases. Invoke via `Ctrl+Shift+A`.
See `AGENTS.md` at the repo root for the lightweight map.

### Conductor (Master Orchestrator)

| Agent                | Persona    | Purpose                                                |
| -------------------- | ---------- | ------------------------------------------------------ |
| `InfraOps Conductor` | 🎼 Maestro | Orchestrates all 7 steps with mandatory approval gates |

### Primary Agents (User-Invokable)

| Agent          | Persona       | Phase | Purpose                            |
| -------------- | ------------- | ----- | ---------------------------------- |
| `requirements` | 📜 Scribe     | 1     | Gather infrastructure requirements |
| `architect`    | 🏛️ Oracle     | 2     | WAF assessment and design          |
| `design`       | 🎨 Artisan    | 3     | Diagrams and ADRs                  |
| `bicep-plan`   | 📐 Strategist | 4     | Implementation planning            |
| `bicep-code`   | ⚒️ Forge      | 5     | Bicep template generation          |
| `deploy`       | 🚀 Envoy      | 6     | Azure deployment                   |
| `as-built`     | 📋 Archivist  | 7     | Post-deployment documentation      |
| `diagnose`     | 🔍 Sentinel   | —     | Post-deployment diagnostics        |

### Adversarial Subagents (Conductor-Invoked)

| Subagent                           | Purpose                                               | Passes                                   |
| ---------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| `infra-challenger-subagent`        | Challenges infra plans for governance/WAF/feasibility | security, waf, governance                |
| `app-security-challenger-subagent` | Challenges app code for auth bypass, IDOR, injection  | auth, api-routes, data-handling          |
| `app-logic-challenger-subagent`    | Challenges business rules, contract drift, edge cases | api-contract, business-rules, data-model |

### Validation Subagents (Conductor-Invoked)

| Subagent                        | Purpose                               | Returns                        |
| ------------------------------- | ------------------------------------- | ------------------------------ |
| `bicep-lint-subagent`           | Bicep syntax validation               | PASS/FAIL with diagnostics     |
| `bicep-whatif-subagent`         | Deployment preview (what-if analysis) | Change summary, violations     |
| `bicep-review-subagent`         | Code review against AVM standards     | APPROVED/NEEDS_REVISION/FAILED |
| `cost-estimate-subagent`        | Pricing MCP queries                   | Cost estimates                 |
| `governance-discovery-subagent` | Azure Policy REST API discovery       | Policy constraints             |

---

## Skills (14)

Skills are reusable capabilities that agents invoke or that activate automatically based on prompts.

### Operating Principles

| Skill               | Purpose                                | Triggers                           |
| ------------------- | -------------------------------------- | ---------------------------------- |
| `golden-principles` | 10 operating principles for all agents | Always loaded first by every agent |

### Azure Conventions (Category 1)

| Skill             | Purpose                                      | Triggers                                   |
| ----------------- | -------------------------------------------- | ------------------------------------------ |
| `azure-defaults`  | Azure conventions, naming, AVM, WAF, pricing | "azure defaults", "naming", "AVM"          |
| `azure-artifacts` | Template H2 structures, styling, generation  | "generate documentation", "create runbook" |

### Document Creation (Category 2)

| Skill            | Purpose                       | Triggers                                   |
| ---------------- | ----------------------------- | ------------------------------------------ |
| `azure-diagrams` | Python architecture diagrams  | "create diagram", "visualize architecture" |
| `azure-adr`      | Architecture Decision Records | "create ADR", "document decision"          |

### Workflow & Tool Integration (Category 3)

| Skill                 | Purpose                                    | Triggers                                      |
| --------------------- | ------------------------------------------ | --------------------------------------------- |
| `github-operations`   | GitHub issues, PRs, CLI, Actions, releases | "create issue", "create PR", "gh command"     |
| `git-commit`          | Commit message conventions                 | "commit", "conventional commit"               |
| `docs-writer`         | Repo-aware docs maintenance                | "audit docs", "fix counts", "freshness check" |
| `make-skill-template` | Create new skills                          | "create skill", "scaffold skill"              |

### Infrastructure Patterns (Category 4)

| Skill                   | Purpose                                  | Triggers                                         |
| ----------------------- | ---------------------------------------- | ------------------------------------------------ |
| `azure-bicep-patterns`  | Common Bicep infrastructure patterns     | "bicep pattern", "hub-spoke", "private endpoint" |
| `azure-troubleshooting` | Azure resource troubleshooting playbooks | "troubleshoot", "diagnose", "health check"       |

### Microsoft Reference (Category 5)

| Skill                      | Purpose                                     | Triggers                                       |
| -------------------------- | ------------------------------------------- | ---------------------------------------------- |
| `microsoft-code-reference` | Look up Microsoft API refs and code samples | "API reference", "SDK sample", "verify method" |
| `microsoft-docs`           | Query official Microsoft documentation      | "Microsoft docs", "learn.microsoft.com"        |
| `microsoft-skill-creator`  | Create skills for Microsoft technologies    | "create Microsoft skill", "investigate topic"  |

---

## 7-Step Workflow (with Conductor)

```text
Requirements → Architecture → Design → Planning → Implementation → Deploy → Documentation
     ↓             ↓           ↓          ↓             ↓           ↓           ↓
   Agent        Agent       Skills     Agent         Agent       Agent       Skills
```

See [workflow](hackops-user-guide.md) for detailed step-by-step guide.

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

See [prompt-guide](hackops-user-guide.md) for the full guide.

---

## Project Structure

```text
azure-agentic-infraops/
├── AGENTS.md             # Lightweight map (start here)
├── QUALITY_SCORE.md      # Project health grades
├── .github/
│   ├── agents/           # 9 agent definitions + 8 subagents
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

- **Issues**: [GitHub Issues](https://github.com/jonathan-vella/azure-agentic-infraops/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jonathan-vella/azure-agentic-infraops/discussions)
- **Troubleshooting**: [troubleshooting](hackops-user-guide.md)
