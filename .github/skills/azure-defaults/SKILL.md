---
name: azure-defaults
description: Provides Azure defaults for naming, regions, tags, AVM-first modules, security baselines, WAF criteria, governance discovery, and pricing guidance across all agents.
compatibility: Works with Claude Code, GitHub Copilot, VS Code, and any Agent Skills compatible tool.
license: MIT
metadata:
  author: jonathan-vella
  version: "2.0"
  category: azure-infrastructure
---

# Azure Defaults Skill

Single source of truth for all Azure infrastructure configuration used across agents.
Load this SKILL.md first — then load `references/` files on demand for the current task.

## Progressive Loading Order

Agents load context in layers — not all at once. This skill is step 3:

1. **`AGENTS.md`** — lightweight map for orientation (~75 lines)
2. **`golden-principles`** — 10 operating principles that govern all agents
3. **This skill (`azure-defaults`)** — Azure conventions, naming, AVM, security
4. **Task-specific skills** — loaded only when needed (e.g., `azure-diagrams`, `azure-bicep-patterns`)
5. **Instructions** — applied automatically by glob pattern

Only read deeper skills when your current task requires them.

## Reference Files (Load on Demand)

| File                                  | When to Load                                              |
| ------------------------------------- | --------------------------------------------------------- |
| `references/naming-conventions.md`    | Generating resource names, validating naming compliance   |
| `references/avm-catalog.md`           | Planning/coding Bicep with AVM modules, checking pitfalls |
| `references/security-baseline.md`     | Applying security settings, compliance checks             |
| `references/waf-criteria.md`          | Performing WAF assessments, scoring architecture pillars  |
| `references/pricing-service-names.md` | Generating cost estimates, recommending service tiers     |
| `references/governance-discovery.md`  | Discovering Azure Policy assignments, governance gates    |

---

## Quick Reference (Load First)

### Default Regions

| Service             | Default Region  | Reason                               |
| ------------------- | --------------- | ------------------------------------ |
| **All resources**   | `swedencentral` | Default for HackOps platform         |
| **Static Web Apps** | `westeurope`    | Not available in swedencentral       |
| **Azure OpenAI**    | `swedencentral` | Primary region — verify availability |
| **Failover**        | `northeurope`   | Alternative region                   |

### Required Tags (Azure Policy Enforced)

> [!IMPORTANT]
> These 4 tags are the MINIMUM baseline. Azure Policy in your subscription may enforce
> additional tags. Always defer to `04-governance-constraints.md` for the actual required tag list.

| Tag           | Required | Example Values           |
| ------------- | -------- | ------------------------ |
| `Environment` | Yes      | `dev`, `staging`, `prod` |
| `ManagedBy`   | Yes      | `Bicep`                  |
| `Project`     | Yes      | Project identifier       |
| `Owner`       | Yes      | Team or individual name  |

Bicep pattern:

```bicep
tags: {
  Environment: environment
  ManagedBy: 'Bicep'
  Project: projectName
  Owner: owner
}
```

### Unique Suffix Pattern

Generate ONCE in `main.bicep`, pass to ALL modules:

```bicep
var uniqueSuffix = uniqueString(resourceGroup().id)
```

### Security Baseline (Summary)

| Setting                    | Value               | Applies To               |
| -------------------------- | ------------------- | ------------------------ |
| `supportsHttpsTrafficOnly` | `true`              | Storage accounts         |
| `minimumTlsVersion`        | `'TLS1_2'`          | All services             |
| `allowBlobPublicAccess`    | `false`             | Storage accounts         |
| `publicNetworkAccess`      | `'Disabled'` (prod) | Data services            |
| Authentication             | Managed Identity    | Prefer over keys/strings |

Read `references/security-baseline.md` for compliance details and industry signals.

---

## Research Workflow (All Agents)

### Standard 4-Step Pattern

1. **Validate Prerequisites** — Confirm previous artifact exists. If missing, STOP.
2. **Read Agent Context** — Read previous artifact for context. Read template for H2 structure.
3. **Domain-Specific Research** — Query ONLY for NEW information not in artifacts.
4. **Confidence Gate (80% Rule)** — Proceed at 80%+ confidence. Below 80%, ASK user.

### Confidence Levels

| Level           | Indicators                  | Action                                      |
| --------------- | --------------------------- | ------------------------------------------- |
| High (80-100%)  | All critical info available | Proceed                                     |
| Medium (60-79%) | Some assumptions needed     | Document assumptions, ask for critical gaps |
| Low (0-59%)     | Major gaps                  | STOP — request clarification                |

### Context Reuse Rules

- **DO**: Read previous agent's artifact for context
- **DO**: Cache shared defaults (read once per session)
- **DO**: Query external sources only for NEW information
- **DON'T**: Re-query Azure docs for resources already in artifacts
- **DON'T**: Search workspace repeatedly (context flows via artifacts)
- **DON'T**: Re-validate previous agent's work (trust artifact chain)

### Agent-Specific Research Focus

| Agent        | Primary Research                      | Skip (Already in Artifacts)                                 |
| ------------ | ------------------------------------- | ----------------------------------------------------------- |
| Requirements | User needs, business context          | —                                                           |
| Architect    | WAF gaps, SKU comparisons, pricing    | Service list (from 01)                                      |
| Bicep Plan   | AVM availability, governance policies | Architecture decisions (from 02)                            |
| Bicep Code   | AVM schemas, parameter types          | Resource list (from 04) — still read governance constraints |
| Deploy       | Azure state (what-if), credentials    | Template structure (from 05)                                |

---

## Template-First Output Rules

### Mandatory Compliance

| Rule         | Requirement                                            |
| ------------ | ------------------------------------------------------ |
| Exact text   | Use template H2 text verbatim                          |
| Exact order  | Required H2s appear in template-defined order          |
| Anchor rule  | Extra sections allowed only AFTER last required H2     |
| No omissions | All template H2s must appear in output                 |
| Attribution  | Include `> Generated by {agent} agent \| {YYYY-MM-DD}` |

### Output Location

All agent outputs go to `agent-output/{project}/`:

| Step | Output File                      | Agent                   |
| ---- | -------------------------------- | ----------------------- |
| 1    | `01-requirements.md`             | Requirements            |
| 2    | `02-architecture-assessment.md`  | Architect               |
| 3    | `03-des-*.{py,md}`               | Design                  |
| 4    | `04-implementation-plan.md`      | Bicep Plan              |
| 4    | `04-governance-constraints.md`   | Bicep Plan              |
| 4    | `04-preflight-check.md`          | Bicep Code (pre-flight) |
| 5    | `05-implementation-reference.md` | Bicep Code              |
| 6    | `06-deployment-summary.md`       | Deploy                  |
| 7    | `07-*.md` (7 documents)          | azure-artifacts skill   |

### Header Format

```markdown
# Step {N}: {Title} - {project-name}

> Generated by {agent} agent | {YYYY-MM-DD}
```

---

## Validation Checklist

Before completing any agent task, verify:

- [ ] Output file saved to `agent-output/{project}/`
- [ ] All required H2 headings from template are present
- [ ] H2 headings match template text exactly
- [ ] All 4 required tags included in resource definitions
- [ ] Unique suffix used for globally unique names
- [ ] Security baseline settings applied
- [ ] Region defaults correct (swedencentral, or exception documented)
- [ ] Attribution header included with agent name and date
