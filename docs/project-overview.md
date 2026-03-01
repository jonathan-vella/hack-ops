# Project Overview

> [Current Version](../VERSION.md) | End-to-end explanation of HackOps for newcomers

---

## What HackOps Is

HackOps is an Azure-hosted hackathon management platform for running
structured "MicroHack" learning events. It manages the complete
lifecycle of a hackathon:

- An **Admin** creates a hackathon, defines challenges with scoring
  rubrics, and invites coaches
- **Hackers** join via a 4-digit event code, form teams, and submit
  evidence per challenge
- **Coaches** review and approve/reject submissions against the rubric
- A **live leaderboard** auto-refreshes with grade badges (A/B/C/D)
  and shows team standings
- Challenges are **gated** — Challenge N+1 unlocks only after
  Challenge N is approved

The target scale is small: 2–3 parallel events, 4–5 teams of 5 per
event, ~75 max concurrent users. The emphasis is on structured scoring,
transparent progression, and a full audit trail — not massive scale.

---

## Tech Stack

| Layer             | Technology                                           |
| ----------------- | ---------------------------------------------------- |
| **Frontend**      | Next.js 15 (App Router), Tailwind CSS 4, shadcn/ui   |
| **Backend**       | Next.js Route Handlers, TypeScript, Zod              |
| **Database**      | Cosmos DB NoSQL (Serverless), 10 containers          |
| **Auth**          | Azure App Service Easy Auth — GitHub OAuth only      |
| **Compute**       | Azure App Service (Linux, Node 22 LTS)               |
| **IaC**           | Bicep + Azure Verified Modules (AVM), GitHub Actions |
| **Observability** | Application Insights, Log Analytics                  |
| **Secrets**       | Azure Key Vault — zero hardcoded values              |

All database traffic flows over a **Private Endpoint** — Cosmos DB is
never exposed to the public internet.

---

## How the Project Gets Built — The Agent System

This is what makes the repo unusual. The entire project — infrastructure
AND application code — is engineered by a team of **AI agents** running
inside VS Code Copilot Chat. The agents follow structured workflows
with human approval gates.

### Infrastructure Pipeline (7 Steps)

Defined in [AGENTS.md](../AGENTS.md) and orchestrated by the
**01-Conductor** agent:

```text
Step 1: Requirements Agent    → captures business needs         → 01-requirements.md
Step 2: Architect Agent       → WAF assessment + cost estimate  → 02-architecture-assessment.md
Step 3: Design Agent (opt)    → diagrams + ADRs                 → 03-des-*.md/py/png
Step 4: Bicep Planner Agent   → implementation plan             → 04-implementation-plan.md
Step 5: Bicep Code Agent      → generates Bicep templates       → infra/bicep/hackops/
Step 6: Deploy Agent          → what-if + actual deployment     → 06-deployment-summary.md
Step 7: As-Built Agent        → post-deploy documentation       → 07-*.md (7 doc types)
```

Human approval is required between Steps 1→2, 2→4, 4→5, and 5→6.
All generated artifacts land in
[agent-output/hackops/](../agent-output/hackops/).

### Application Pipeline (9 Steps)

Orchestrated by the **13-App Conductor**, separate from infrastructure:

```text
A1-A7: App Builder   → Scaffold, API routes, frontend pages
A8:    App Tester     → Unit + integration tests
A9:    App Conductor  → CI/CD workflows + deployment
```

### Adversarial Review

Three **challenger subagents** act as adversarial reviewers at specific
gates in the workflow:

| Subagent                           | Focus                                | Blocks on     |
| ---------------------------------- | ------------------------------------ | ------------- |
| `infra-challenger-subagent`        | Governance gaps, WAF blind spots     | Critical/High |
| `app-security-challenger-subagent` | Auth bypass, IDOR, injection         | Critical/High |
| `app-logic-challenger-subagent`    | Business rule errors, contract drift | Critical/High |

Progress is **blocked** until Critical/High findings are resolved.

---

## How the Agent System Is Organized

| Layer        | Location                                    | Purpose                                                    |
| ------------ | ------------------------------------------- | ---------------------------------------------------------- |
| Agents       | `.github/agents/*.agent.md`                 | Declares each agent's role, model, tools, and handoffs     |
| Skills       | `.github/skills/*/SKILL.md`                 | Reusable domain knowledge (Azure defaults, diagrams, etc.) |
| Instructions | `.github/instructions/*.instructions.md`    | File-type coding rules (auto-loaded by glob pattern)       |
| Templates    | `.github/skills/azure-artifacts/templates/` | Canonical structure for each artifact type                 |
| Principles   | `.github/skills/golden-principles/`         | 10 operating rules all agents follow                       |

Agents don't share one massive context. The Conductor delegates to
specialized subagents, each loading only the skills it needs. This
keeps the token budget tight — Golden Principle #8: "Context is scarce."

---

## Key Design Documents

| Document                                    | Purpose                                  |
| ------------------------------------------- | ---------------------------------------- |
| [PRD](prd.md)                               | Product requirements — source of truth   |
| [API Contract](api-contract.md)             | 26-endpoint REST API specification       |
| [Data Model](data-model.md)                 | Cosmos DB container and partition design |
| [UI Pages](ui-pages.md)                     | Frontend page specifications             |
| [Environment Config](environment-config.md) | Environment variables and Key Vault      |
| [HackOps User Guide](hackops-user-guide.md) | Step-by-step runbook                     |

---

## Session Continuity

Work spans many Copilot sessions. The pattern:

1. Run `/session-resume` at the start of each session
2. The agent reads the execution tracker, loads context, and picks
   up where it left off

The tracker lives at
[docs/exec-plans/active/hackops-execution.md](exec-plans/active/hackops-execution.md).

---

## Repository Layout

```text
apps/
  web/                     # Next.js 15 application
packages/
  shared/                  # Shared TypeScript types
infra/
  bicep/hackops/           # Bicep AVM templates
agent-output/
  hackops/                 # Generated infrastructure + as-built artifacts
.github/
  agents/                  # 15 agent definitions + 11 subagents
  skills/                  # 14 skill definitions
  instructions/            # 21 file-type coding rules
docs/                      # Documentation (you are here)
scripts/                   # Validation and automation scripts
mcp/
  azure-pricing-mcp/       # Azure Pricing MCP server
```

---

## Where to Go Next

- **Build something**: [HackOps User Guide](hackops-user-guide.md)
- **Understand the agents**: [AGENTS.md](../AGENTS.md)
- **Read the product spec**: [PRD](prd.md)
- **Check project health**: [QUALITY_SCORE.md](../QUALITY_SCORE.md)
