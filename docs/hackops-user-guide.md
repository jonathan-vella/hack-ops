# HackOps Execution — User Guide

> [Current Version](../VERSION.md) | Step-by-step guide to build
> HackOps from plan to deployed product using Copilot agents

This guide walks you through the complete HackOps build
process. It tells you exactly what to do, which prompt or agent
to use, and what to verify — in order. This is the companion to
the [execution blueprint] and the [session tracker].

[execution blueprint]: ../.github/prompts/plan-hackOpsExecution.prompt.md
[session tracker]: exec-plans/active/hackops-execution.md

---

## Before You Start

### Prerequisites

| Requirement                      | How to verify                                                |
| -------------------------------- | ------------------------------------------------------------ |
| VS Code with GitHub Copilot Chat | Copilot icon visible in sidebar                              |
| Dev container running            | Terminal shows Ubuntu prompt, `node --version` returns v22+  |
| Git configured                   | `git config user.name` returns your name                     |
| GitHub CLI authenticated         | `gh auth status` shows logged in                             |
| Azure CLI installed              | `az version` returns output (login not needed until Phase D) |
| Repo cloned and on `main`        | `git branch --show-current` returns `main`                   |

### Key Files You Should Know About

| File                              | What it is                                                | When to read it                                        |
| --------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| [plan-hackOps.prompt.md]          | The 539-line technical plan — the original vision         | When you need detail on a specific feature or phase    |
| [plan-hackOpsExecution.prompt.md] | The execution blueprint — what to build and in what order | When you need specs for what you're currently building |
| [hackops-execution.md]            | Session tracker — living checklist of progress            | Every session start and end                            |
| [session-resume.prompt.md]        | Auto-resume prompt — loads state and continues            | Every session start                                    |
| [challenge-findings.json]         | Adversarial review findings (all 14 resolved)             | If you want to understand why a decision was made      |

[plan-hackOps.prompt.md]: ../.github/prompts/plan-hackOps.prompt.md
[plan-hackOpsExecution.prompt.md]: ../.github/prompts/plan-hackOpsExecution.prompt.md
[hackops-execution.md]: exec-plans/active/hackops-execution.md
[session-resume.prompt.md]: ../.github/prompts/session-resume.prompt.md
[challenge-findings.json]: ../agent-output/hackops/challenge-findings.json

### How Sessions Work

This project takes ~6-8 weeks. You will work across many
Copilot Chat sessions. Context is preserved automatically:

1. **Start a session**: Type `/session-resume` in Copilot Chat.
   The agent reads the session tracker, figures out where you
   left off, loads the right context, and picks up the work.
2. **Work**: Follow the steps below. The agent checks off
   items in the session tracker as they complete.
3. **End a session**: The agent updates the session tracker
   with what was done, what's next, and any blockers. This
   gets committed so the next session can pick up seamlessly.

> You can also work manually without `/session-resume` — just
> read the session tracker yourself and follow this guide.

---

## The Complete Walkthrough

### Overview

```text
B0 Bootstrap issues  ──→  Phase A Product docs  ──→  Phase C Toolchain
        │                       │                          │
        │                       ▼                          ▼
        │                  (merge to main)           (merge to main)
        │                       │                          │
        ▼                       ▼                          ▼
Phase B Backlog  ──→  Phase D Infrastructure  ──→  Phase E App Build
                                                        │
                                                        ▼
                                                   Phase F Supporting
```

---

### Step 0 — Bootstrap Issues (~10 minutes, manual)

**What**: Create tracking issues in GitHub so you have
visibility into progress from day one.

**How**:

1. Go to your repo's Issues tab on GitHub
2. Create these issues manually:
   - `[Epic] Phase A: Product Documentation`
   - `[Epic] Phase C: App-Dev Toolchain`
   - `Create PRD`
   - `Create API contract types`
   - `Create data model`
   - `Create UI pages inventory`
   - `Create environment config`
   - `Create app-dev agents (11-16)`
   - `Create app-dev skills`
   - `Create app-dev instructions`
   - `Register instructions in devcontainer`
   - `Create app-dev subagents`
3. Label epics with `epic`, others with the relevant phase

**Verify**: Issues visible in GitHub Issues tab.

**Update tracker**: Check off B0 items in the
[session tracker].

---

### Step 1 — Product Documentation (~3-5 days)

**Branch**: `feature/product-docs`

```bash
git checkout -b feature/product-docs
```

This step creates the 5 product documents that everything else
depends on. The blueprint has dedicated generator prompts for
the 3 most complex docs.

#### 1a. Create the doc-generation prompts

These prompts don't exist yet — you need to create them first.
Each prompt is specified in the blueprint under Phase A, section
A0. Ask Copilot to create them:

> Open Copilot Chat and say:
> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase A section A0. Create the 3 doc-generation prompts
> exactly as specified: `doc-prd-generator.prompt.md`,
> `doc-api-contract-generator.prompt.md`, and
> `doc-data-model-generator.prompt.md`."

**Verify**: 3 new files exist in `.github/prompts/`.

#### 1b. Generate the PRD

> Run the prompt: `/doc-prd-generator`

This reads the technical plan and generates a full PRD with
60-80 user stories. Review the output at `docs/prd.md`.

**What to check**:

- All 4 user personas present (Admin, Coach, Hacker, Anonymous)
- All 7 feature domains covered
- User stories have Given/When/Then acceptance criteria
- Non-functional requirements section exists

#### 1c. Generate the API contract

> Run the prompt: `/doc-api-contract-generator`

This produces two files:

- `packages/shared/types/api-contract.ts` (TypeScript types —
  the source of truth)
- `docs/api-contract.md` (human-readable reference)

**What to check**:

- All ~16 API endpoints present
- Each endpoint has request/response types
- Auth and role requirements documented

#### 1d. Generate the data model

> Run the prompt: `/doc-data-model-generator`

Output: `docs/data-model.md`

**What to check**:

- All 10 Cosmos DB containers defined
- Partition keys documented with rationale
- Sample documents included

#### 1e. Create UI pages and environment config

These are simpler and don't need dedicated generator prompts.
Ask Copilot directly:

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase A sections A4 and A5. Create `docs/ui-pages.md` and
> `docs/environment-config.md` as specified."

#### 1f. Merge to main

```bash
npm run lint:md
git add docs/ packages/
git commit -m "docs: add product documentation (PRD, API contract, data model, UI pages, env config)"
git push origin feature/product-docs
```

Create a PR and merge after CI passes.

---

### Step 2 — App-Dev Toolchain (~3-5 days)

**Branch**: `feature/app-dev-toolchain`

```bash
git checkout main && git pull
git checkout -b feature/app-dev-toolchain
```

This step creates the agents, skills, instructions,
and validators that the app-build prompts will use.

#### 2a. Create the 6 new agents + 3 subagents

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase C section C1. Create all 6 top-level agents
> (11 through 16) and 3 subagents exactly as specified."

**Verify**: `npm run lint:agent-frontmatter` passes.

Each session can create 2-3 agents — you don't need to do all
9 in one session.

#### 2b. Create the 5 skills

4 of the 5 skills use the `microsoft-skill-creator` workflow.
Run it for each technology skill:

> "Read `.github/skills/microsoft-skill-creator/SKILL.md`.
> Use the skill creation workflow to create the
> `nextjs-patterns` skill. Verify against official Next.js
> docs using Learn MCP tools."

Repeat for `cosmos-db-sdk`, `shadcn-ui-patterns`, and
`zod-validation`.

For `hackops-domain` (the keystone skill):

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase C section C3, specifically the `hackops-domain` row.
> Read `.github/prompts/plan-hackOps.prompt.md` for the
> business rules. Create `hackops-domain/SKILL.md` with the
> roles matrix, lifecycle state machine, and all business
> invariants."

**Verify**: `npm run lint:skills-format` passes.

#### 2c. Create the 5 instructions + register them

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase C section C4. Create all 5 instruction files and
> follow the 5 registration steps."

**Critical**: Don't skip the registration steps. The
instructions won't apply without updating devcontainer.json.

**Verify**:

```bash
npm run lint:instruction-frontmatter
npm run validate:instruction-refs
```

#### 2d. Create issue templates and business rules validator

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase C sections C5 and C6. Create the issue templates
> and the `validate-business-rules.mjs` script."

**Verify**: `npm run validate` — full suite passes.

#### 2e. Merge to main

```bash
npm run validate
git add .github/ scripts/
git commit -m "feat: add app-dev agent toolchain (6 agents, 3 subagents, 5 skills, 5 instructions, validator)"
git push origin feature/app-dev-toolchain
```

Create a PR and merge after CI passes.

---

### Step 3 — Backlog (~1 day)

**Branch**: `feature/prompts`

```bash
git checkout main && git pull
git checkout -b feature/prompts
```

#### 3a. Set up labels and milestones

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase B sections B1 and B2. Create the label taxonomy and
> 12 milestones in GitHub."

#### 3b. Create the backlog prompts

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase B sections B3 and B4. Create `generate-backlog.prompt.md`
> and `backlog-triage.prompt.md`."

#### 3c. Generate the backlog

> Run the prompt: `/generate-backlog`

This reads the PRD and creates GitHub Issues with correct
labels and milestones.

**Verify**: Issues visible in GitHub with milestones assigned.

#### 3d. Set up the GitHub Projects board

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase B section B5. Create `docs/exec-plans/backlog-setup.md`."

Then follow the documented steps to create the project, configure
custom fields/views, and add issues to the board.

The project is [HackOps Backlog (#6)](https://github.com/jonathan-vella/hack-ops/projects).

---

### Step 4 — Infrastructure (~2-3 days)

**Branch**: `feature/prompts` (continued)

#### 4a. Create all 8 infra prompts

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase D section D1. Create all 8 infrastructure prompts."

**Verify**: 8 new files in `.github/prompts/`.

#### 4b. Run the offline prompts (no Azure needed)

Run these in order. Each produces output in
`agent-output/hackops/`:

1. `/infra-01-requirements` → generates requirements doc
2. `/infra-02-architecture` → generates WAF assessment +
   cost estimate
3. `/infra-03-design` → generates architecture diagram + ADRs

Review each output before proceeding.

#### 4c. Run the challenger

> Run: `/infra-challenge`

Review the adversarial findings. Fix any must-fix issues before
proceeding to deployment steps.

#### 4d. Verify Azure connectivity

```bash
az login
az account show
```

Confirm you're on the correct subscription and have permissions
to create resources in `rg-hackops-dev`.

#### 4e. Run the Azure-connected prompts

1. `/infra-04-governance` → governance discovery +
   implementation plan
2. `/infra-05-bicep-generate` → Bicep templates in
   `infra/bicep/hackops/`
3. Validate: `bicep build infra/bicep/hackops/main.bicep`
4. `/infra-06-deploy` → what-if analysis, then deployment
5. `/infra-07-as-built` → post-deployment documentation

**Verify**: Resources visible in Azure Portal under
`rg-hackops-dev`.

---

### Step 5 — Application Build (~2-3 weeks)

**Branch**: `feature/prompts` (continued)

This is the longest phase. Each prompt takes ~1-2 days and has
an approval gate. You will likely spread this across many
sessions — `/session-resume` keeps you on track.

#### 5a. Create all 10 app prompts

> "Read `.github/prompts/plan-hackOpsExecution.prompt.md`
> Phase E section E1. Create all 10 app-build prompts."

#### 5b. Run the prompts in order

Run each prompt, then verify the exit criteria before moving to
the next. The App Conductor (agent 16) orchestrates this if you
prefer to use it directly.

| Order | Run this prompt          | Then verify                         | Gate     |
| ----- | ------------------------ | ----------------------------------- | -------- |
| 1     | `/app-01-scaffold`       | `npm run build` succeeds            | Approval |
| 2     | `/app-02-auth`           | Role guard unit tests pass          | Approval |
| 3     | `/app-03-api-hackathons` | `tsc --noEmit` + endpoint tests     | Validate |
| 4     | `/app-04-api-scoring`    | `tsc --noEmit` + endpoint tests     | Validate |
| 5     | `/app-05-api-challenges` | `tsc --noEmit` + endpoint tests     | Validate |
| 6     | `/app-06-api-admin`      | `tsc --noEmit` + all API tests pass | Validate |
| 7     | `/app-07-leaderboard`    | `npm run build` + no type errors    | Validate |
| 8     | `/app-08-dashboard`      | `npm run build` + no type errors    | Validate |
| 9     | `/app-09-tests`          | Coverage >80%, all tests pass       | Validate |
| 10    | `/app-10-ci-cd`          | Workflows pass dry-run              | Approval |

> **Approval gates** mean you review and confirm before the
> next step starts. **Validate gates** mean the automated
> check must pass.

#### 5c. Merge to main

Once all 10 steps pass:

```bash
npm run validate
npm test
npm run build
git add .
git commit -m "feat: complete HackOps application (API, frontend, tests, CI/CD)"
git push origin feature/prompts
```

Create a PR and merge after CI passes.

---

### Step 6 — Supporting Artifacts (ongoing)

**Branch**: individual PRs to `main`

These can be done at any point. Pick them up between other
phases or when you need a break from the main build.

| Task                 | What to do                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Seed data            | "Create `scripts/seed-cosmos.ts` and test fixtures as specified in blueprint Phase F section F1" |
| OpenAPI spec         | "Generate `docs/openapi.yaml` from `docs/api-contract.md`"                                       |
| Testing strategy     | "Create `docs/testing-strategy.md` as specified in blueprint Phase F section F3"                 |
| Security checklist   | "Create `docs/security-checklist.md` as specified in blueprint Phase F section F4"               |
| Local dev guide      | "Create `docs/local-dev-guide.md` as specified in blueprint Phase F section F5"                  |
| Update AGENTS.md     | "Update `AGENTS.md` to include agents 11-16 and 3 subagents"                                     |
| Update docs README   | "Update `docs/README.md` to link all new documentation"                                          |
| Update quality score | "Update `QUALITY_SCORE.md` to track app-dev progress"                                            |

---

## Quick Reference

### Session Commands

| When                   | Do this                                                        |
| ---------------------- | -------------------------------------------------------------- |
| Starting a new session | Type `/session-resume` in Copilot Chat                         |
| Resuming manually      | Read [hackops-execution.md] and follow the next unchecked item |
| Ending a session       | Ensure the agent updated the session tracker, then commit      |

### Branch Cheat Sheet

| Phase                       | Branch                      | Merge gate             |
| --------------------------- | --------------------------- | ---------------------- |
| A (docs)                    | `feature/product-docs`      | `npm run lint:md`      |
| C (toolchain)               | `feature/app-dev-toolchain` | `npm run validate`     |
| B + D + E (prompts + build) | `feature/prompts`           | `npm run lint:md` + CI |
| F (supporting)              | direct PRs to `main`        | Standard review        |

### Validation Commands

```bash
npm run validate          # Full validation suite
npm run lint:md           # Markdown linting
npm run lint:agent-frontmatter    # Agent definition check
npm run lint:skills-format        # Skills format check
npm run lint:instruction-frontmatter  # Instructions check
npm run validate:instruction-refs     # Instruction registration
npm run validate:business-rules       # Business rules enforcement
npm test                  # Unit tests
npm run build             # Next.js build
npm run type-check        # TypeScript type check
bicep build infra/bicep/hackops/main.bicep  # Bicep syntax
```

### What to Do When Things Go Wrong

| Problem                            | Solution                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Session tracker is out of sync     | Read git log for recent changes, manually update checkboxes                   |
| Prompt produces wrong output       | Re-read the blueprint section for that step, adjust the prompt, and re-run    |
| Validation fails after a step      | Fix the errors before moving to the next step — gates exist for a reason      |
| Azure deployment fails             | Check `az account show`, verify resource group exists, review what-if output  |
| Agent generates incorrect patterns | Check if the relevant skill needs updating via `microsoft-skill-creator`      |
| Context window exhausted mid-step  | Commit what you have, end the session, start a new one with `/session-resume` |
| Lost track of progress             | Read [hackops-execution.md] — the session log shows full history              |

---

## Estimated Timeline

```text
Week 1:    B0 + Phase A (product docs)
Week 2:    Phase C (agents, skills, instructions)
Week 3:    Phase B (backlog) + Phase D (infrastructure)
Week 4-6:  Phase E (application build — 10 prompts)
Ongoing:   Phase F (supporting artifacts)
```

This assumes ~2-3 hours per day with agent assistance. Adjust
based on your availability.
