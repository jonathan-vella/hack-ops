# Context Optimization Workflow Guide

> **Audit → Plan → Execute** — a three-stage pipeline for reducing context
> window waste in GitHub Copilot agent systems.

This guide describes a reusable, multi-session workflow for optimizing how
Copilot custom agents, skills, and instruction files consume tokens. It is
designed to be portable across repositories.

---

## Overview

```text
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Stage 1: Audit │────▶│  Stage 2: Plan   │────▶│  Stage 3: Execute    │
│  /context-      │     │  /context-       │     │  /context-           │
│   optimize      │     │   optimization-  │     │   optimization-      │
│                 │     │   plan           │     │   resume             │
│  Produces the   │     │  Groups findings │     │  Works through the   │
│  optimization   │     │  into streams,   │     │  plan across         │
│  report         │     │  generates       │     │  multiple sessions   │
│                 │     │  tracker + resume│     │                      │
│  ~1 session     │     │  ~1 session      │     │  ~3-9 sessions       │
└─────────────────┘     └──────────────────┘     └──────────────────────┘
```

### Files at Each Stage

| Stage       | Prompt                         | Output                                                                                                                                           |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — Audit   | `/context-optimize`            | `agent-output/{project}/10-context-optimization-report.md`                                                                                       |
| 2 — Plan    | `/context-optimization-plan`   | Tracker at `docs/exec-plans/active/context-optimization-execution.md` + Resume prompt at `.github/prompts/context-optimization-resume.prompt.md` |
| 3 — Execute | `/context-optimization-resume` | Edited agent/skill/instruction files across multiple sessions                                                                                    |

---

## Prerequisites

- A repository with Copilot custom agents (`.github/agents/*.agent.md`)
- The context optimizer skill installed at `.github/skills/context-optimizer/`
- The context optimizer agent at `.github/agents/10-context-optimizer.agent.md`
- Python 3.10+ (for the log parser script)
- VS Code with Copilot Chat (for debug log access)
- Validation commands (`npm run validate`, `npm run lint:md`, or equivalents)

---

## Stage 1 — Audit

**Goal**: Produce a comprehensive optimization report with prioritized findings.

**Duration**: 1 session.

### How to Run

1. Open Copilot Chat (`Ctrl+Shift+I`)
2. Type `/context-optimize` and press Enter
3. The agent will:
   - Parse Copilot debug logs for performance data
   - Audit every agent definition, instruction file, and skill
   - Calculate context costs and identify waste patterns
   - Generate a structured report with severity-coded findings

### Output

The report is saved to `agent-output/{project}/10-context-optimization-report.md`.
Review it before proceeding to Stage 2. Key sections to examine:

- **Executive Summary** — current vs target metrics
- **Findings** — categorized by severity (Critical → Low)
- **Implementation Priority** — effort vs impact matrix
- **Agent-Specific Recommendations** — per-agent action items

### Decision Point

After reviewing the report, decide:

- Which findings to act on (P0 and P1 are strongly recommended)
- Which findings to defer or skip
- Whether any findings need further investigation

---

## Stage 2 — Plan

**Goal**: Convert the report's findings into an executable, multi-session plan.

**Duration**: 1 session.

### How to Run

1. Open a **new** Copilot Chat session
2. Type `/context-optimization-plan` and press Enter
3. The agent will:
   - Read the optimization report
   - Group findings into execution streams
   - Size each stream to fit one context window
   - Present the proposed plan for your approval
   - Generate the execution tracker and resume prompt

### Interaction

The plan-builder will ask you to confirm:

- Stream ordering and grouping
- Which findings to include or exclude
- Where to place review gates
- Branch strategy (single branch recommended)

### Output

Two files are generated:

| File                                                       | Purpose                                   |
| ---------------------------------------------------------- | ----------------------------------------- |
| `docs/exec-plans/active/context-optimization-execution.md` | Persistent tracker with checkboxes        |
| `.github/prompts/context-optimization-resume.prompt.md`    | Resume prompt for multi-session execution |

---

## Stage 3 — Execute

**Goal**: Work through the plan over multiple sessions, one stream at a time.

**Duration**: 3-9 sessions depending on plan size.

### How to Run Each Session

1. Open a **new** Copilot Chat session
2. Type `/context-optimization-resume` and press Enter
3. The agent will:
   - Read the tracker to find the next incomplete step
   - Load only the context needed for that stream
   - Execute the changes
   - Run validation
   - Update the tracker before ending

### Session Discipline

Each session should:

- Complete at least one full stream
- Start by reading the tracker (automatic via the resume prompt)
- End by updating the tracker (enforced by the resume prompt)
- Never work on more than one stream at a time
- Run `npm run validate` before finishing

### Review Gates

At designated review gates, the agent will:

1. Run the full validation suite
2. Show a diff summary of all changes
3. Wait for your approval before continuing

Review gates are mandatory safety checkpoints. Do not skip them.

### Completion

When all streams are checked off and final verification passes:

1. Create a PR from the feature branch to `main`
2. Review the full diff one more time
3. Merge

---

## Porting to Another Repository

The context optimization workflow is designed to be portable. All
project-specific content is generated dynamically during Stage 2 (Plan).

### What to Copy

Copy these directories and files to the target repository:

```text
.github/
  agents/
    10-context-optimizer.agent.md        # The audit agent
  instructions/
    context-optimization.instructions.md # ApplyTo rules for context files
  prompts/
    context-optimize.prompt.md           # Stage 1: Audit
    context-optimization-plan.prompt.md  # Stage 2: Plan
  skills/
    context-optimizer/
      SKILL.md                           # Analysis methodology
      scripts/
        parse-chat-logs.py               # Log parser
      templates/
        optimization-report.md           # Report template
        execution-tracker.md             # Tracker template (generic)
        resume-prompt.md                 # Resume prompt template (generic)
      references/
        token-estimation.md              # Token cost heuristics
```

### Adaptation Checklist

After copying:

| Step | Action                     | Details                                                                  |
| ---- | -------------------------- | ------------------------------------------------------------------------ |
| 1    | Adjust agent numbering     | If `10` conflicts with existing agents, renumber                         |
| 2    | Update validation commands | Replace `npm run validate` with the target repo's equivalent             |
| 3    | Verify Python availability | The log parser needs Python 3.10+                                        |
| 4    | Create output directory    | Ensure `agent-output/{project}/` exists                                  |
| 5    | Create tracker directory   | Ensure `docs/exec-plans/active/` exists (or change the path)             |
| 6    | Run Stage 1                | `/context-optimize` produces a project-specific report                   |
| 7    | Run Stage 2                | `/context-optimization-plan` generates project-specific tracker + resume |
| 8    | Execute                    | `/context-optimization-resume` across multiple sessions                  |

### What Agents Need to Know

When an agent reads this guide to set up the workflow in another repo, it
should:

1. Copy the files listed in "What to Copy" above
2. Walk through the adaptation checklist
3. Adjust file paths in the agent definition and prompts if the repo
   structure differs (e.g., agents live somewhere other than `.github/agents/`)
4. Keep the three-stage pipeline intact — the templates are designed to
   work together

---

## Troubleshooting

| Problem                              | Solution                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Log parser fails                     | Ensure Python 3.10+. Check log path: `find ~/.vscode-server/data/logs/ -name "GitHub Copilot Chat.log"`  |
| Tracker not found                    | Stage 2 creates it. Run `/context-optimization-plan` first.                                              |
| Resume prompt loads too much context | Edit the tracker's "Key Files" table to remove paths the agent doesn't need                              |
| Validation fails after edits         | Check the specific validator output. Common cause: broken YAML frontmatter after tool edits              |
| Review gate blocks progress          | Review gates require human approval. Check the diff, approve, then re-run `/context-optimization-resume` |

---

## File Index

All files related to the context optimization workflow:

| File                                                                                                 | Type      | Purpose                                       |
| ---------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------- |
| [10-context-optimizer.agent.md](../../.github/agents/10-context-optimizer.agent.md)                  | Agent     | Performs the audit                            |
| [context-optimize.prompt.md](../../.github/prompts/context-optimize.prompt.md)                       | Prompt    | Stage 1: triggers the audit                   |
| [context-optimization-plan.prompt.md](../../.github/prompts/context-optimization-plan.prompt.md)     | Prompt    | Stage 2: builds the execution plan            |
| [context-optimization-resume.prompt.md](../../.github/prompts/context-optimization-resume.prompt.md) | Prompt    | Stage 3: resumes execution sessions           |
| [SKILL.md](../../.github/skills/context-optimizer/SKILL.md)                                          | Skill     | Analysis methodology and patterns             |
| [parse-chat-logs.py](../../.github/skills/context-optimizer/scripts/parse-chat-logs.py)              | Script    | Extracts structured data from logs            |
| [optimization-report.md](../../.github/skills/context-optimizer/templates/optimization-report.md)    | Template  | Report output structure                       |
| [execution-tracker.md](../../.github/skills/context-optimizer/templates/execution-tracker.md)        | Template  | Generic tracker with placeholders             |
| [resume-prompt.md](../../.github/skills/context-optimizer/templates/resume-prompt.md)                | Template  | Generic resume prompt with placeholders       |
| [token-estimation.md](../../.github/skills/context-optimizer/references/token-estimation.md)         | Reference | Token cost estimation heuristics              |
| [context-optimization-guide.md](context-optimization-guide.md)                                       | Guide     | This file — end-to-end workflow documentation |
