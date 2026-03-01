---
description: "MANDATORY research-before-implementation requirements for all agents, including optional thought logging"
applyTo: "**/*.agent.md, **/agent-output/**/*.md, **/.github/skills/**/SKILL.md, Copilot-Processing.md"
---

# Agent Research Requirements

**MANDATORY: All agents MUST perform thorough research before implementation.**

This instruction enforces a "research-first" pattern to ensure complete, one-shot execution
without missing context or requiring multiple iterations.

## Pre-Implementation Research Checklist

Before creating ANY output files or making changes, agents MUST:

- [ ] **Search workspace** for existing patterns (`agent-output/`, similar projects, templates)
- [ ] **Read relevant templates** in `.github/skills/azure-artifacts/templates/` for output structure
- [ ] **Query documentation** via MCP tools (Azure docs, best practices)
- [ ] **Validate inputs** — confirm all required artifacts from previous steps exist
- [ ] **Check shared defaults** in `.github/skills/azure-defaults/SKILL.md`
- [ ] **Achieve 80% confidence** before proceeding to implementation

## Research Workflow Pattern

### Step 1: Context Gathering (REQUIRED)

Use read-only tools to gather context without making changes:

- Workspace context: semantic_search, grep_search, read_file, list_dir
- Azure context: Azure MCP tools, mcp_bicep_list_avm_metadata

### Step 2: Validation Gate (REQUIRED)

Before implementation, confirm:

1. Required inputs exist — previous step artifacts are present and complete
2. Templates loaded — output structure template has been read
3. Standards understood — shared defaults and naming conventions reviewed
4. Azure guidance obtained — relevant documentation queried

### Step 3: Confidence Assessment

Only proceed when you have **80% confidence** in your understanding.
If confidence is below 80%, delegate autonomous research or ask the user.

## Delegation Pattern for Deep Research

When extensive research is needed, delegate to a subagent for thorough
investigation without interrupting the workflow.

## Per-Agent Research Focus

| Agent            | Primary Research Focus                                            |
| ---------------- | ----------------------------------------------------------------- |
| **Requirements** | User needs, existing projects, compliance requirements            |
| **Architect**    | Azure services, WAF pillars, SKU recommendations, pricing         |
| **Design**       | Existing architecture, icon availability, layout patterns         |
| **Bicep Plan**   | AVM availability, governance constraints, implementation patterns |
| **Bicep Code**   | Module structure, naming conventions, security defaults           |
| **Deploy**       | Template validation, what-if results, resource dependencies       |
| **As-Built**     | Deployed resources, configuration details, operational procedures |

## Enforcement Rules

- Research BEFORE creating files
- Read templates BEFORE generating output
- Query Azure docs BEFORE recommending services
- Check existing patterns BEFORE creating new ones
- Validate inputs BEFORE proceeding to next step

## Thought Logging (Optional)

Use `Copilot-Processing.md` as an optional task ledger for complex or long-running work.

### When to Use

- When the user asks for process logging or progress persistence
- When multi-step work benefits from a durable checklist
- Do not create this file for short, single-step tasks

### Recommended Structure

- `## Request` — `## Constraints` — `## Plan` — `## Progress Log` — `## Final Summary`

### Rules

- Keep entries concise, factual, and task-focused
- Update progress in place; avoid duplicate sections
- `Copilot-Processing.md` is local working state and is gitignored
