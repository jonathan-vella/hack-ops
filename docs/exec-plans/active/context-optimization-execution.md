# Exec Plan: Context Optimization

> Living session state tracker. Updated at the END of every session.
> Read this file FIRST at the start of any new session.

**Status**: Active
**Owner**: Human + Copilot agents
**Created**: 2026-02-28
**Blueprint**: `.github/prompts/plan-applyContextOptimizationReport.prompt.md`
**Source report**: `agent-output/hackops/10-context-optimization-report.md`

---

## Current Session Target

<!-- Update this at the START of each session -->

**Stream**: 3 — Skill Progressive Loading
**Step**: S3.1 — `azure-defaults/SKILL.md` split
**Branch**: `feature/context-optimization`
**Goal**: Complete Stream 3 (skill progressive loading splits)

---

## Stream Progress

### Stream 1 — MCP Wildcard Replacement (P0)

**Scope**: `.github/agents/` — 9 infra agents
**Branch**: `feature/context-optimization`

- [x] S1.1: Replace 47 `azure-mcp/{service}` → `"azure-mcp/*"` in all 9 agents
- [ ] ~~S1.2~~: `ms-azuretools.vscode-azure-github-copilot/*` wildcard does not work — kept 6 individual entries
- [x] S1.3: Replace 10 `bicep/{tool}` → `"bicep/*"` in agents 05, 06, 07, 09
- [x] S1.4: Replace 12 `pylance-mcp-server/{tool}` → `"pylance-mcp-server/*"` in agent 04
- [ ] ~~S1.5~~: `ms-python.python/*` wildcard does not work — kept 4 individual entries
- [x] S1.V: Run `npm run validate` — frontmatter validators pass

### Stream 2 — Instruction File Optimization (P1-P3)

**Scope**: `.github/instructions/` — 6 files
**Branch**: `feature/context-optimization`

- [x] S2.1: `code-commenting.instructions.md` — narrow `applyTo` to code files only
- [x] S2.2: `bicep-governance.instructions.md` — remove `**/*.agent.md` from `applyTo`
- [x] S2.3: `code-review.instructions.md` — extract language-specific rules to 5 target files
- [x] S2.4: `azure-artifacts.instructions.md` — trim to ~100 lines (H2 lists → skill)
- [x] S2.5: `markdown.instructions.md` — trim to ≤ 100 lines (remove extended examples)
- [x] S2.6: `context-optimization.instructions.md` — already fenced (no change needed)
- [x] S2.V: Run `npm run validate` — all validators pass (with validator updates)

### Stream 3 — Skill Progressive Loading (P1-P2)

**Scope**: `.github/skills/` — 6 skills
**Branch**: `feature/context-optimization`

- [ ] S3.1: `azure-defaults/SKILL.md` → split into 6 `references/` files, SKILL.md ≤ 200 lines
- [ ] S3.2: `azure-artifacts/SKILL.md` → split into 3 `references/` files, SKILL.md ≤ 200 lines
- [ ] S3.3: `azure-diagrams/SKILL.md` → merge inline content into existing `references/`, SKILL.md ≤ 200 lines
- [ ] S3.4: `azure-bicep-patterns/SKILL.md` → split into 7 `references/` files
- [ ] S3.5: `github-operations/SKILL.md` → split into 2 `references/` files
- [ ] S3.6: `azure-troubleshooting/SKILL.md` → split into 3 `references/` files
- [ ] S3.V: Run `npm run validate` — skills format validators pass

### ── REVIEW GATE 1 ── (After Streams 1-3)

- [ ] RG1.1: GPT 5.3 — structural integrity review (references exist, pointers match, globs valid)
- [ ] RG1.2: Sonnet 4.6 — semantic preservation review (SKILL.md still guides loading decisions)
- [ ] RG1.3: `npm run validate` — full suite passes
- [ ] RG1.4: `npm run lint:md` — all modified files pass
- [ ] RG1.5: `npm run lint:artifact-templates` — no regressions
- [ ] RG1.6: Human approval to proceed to Streams 4-6

### Stream 4 — Agent Body Trimming (P2)

**Scope**: `.github/agents/` — 6 agents
**Branch**: `feature/context-optimization`
**Depends on**: Streams 1 + 3 completed (agents reference new `references/` paths)

- [ ] S4.1: `06-bicep-code-generator.agent.md` → extract to `azure-bicep-patterns` refs, ≤ 200 body lines
- [ ] S4.2: `07-deploy.agent.md` → create `azure-deploy` skill + `references/deployment-scripts.md`
- [ ] S4.3: `05-bicep-planner.agent.md` → remove Policy Effect dupe, move YAML example
- [ ] S4.4: `01-conductor.agent.md` → extract tables to `references/conductor-tables.md`
- [ ] S4.5: `03-architect.agent.md` → remove inline WAF/pricing dupes, trim cost workflow
- [ ] S4.6: `09-diagnose.agent.md` → move KQL/remediation to `azure-troubleshooting` refs
- [ ] S4.V: Run `npm run validate` — agent frontmatter validators pass

### Stream 5 — Conductor Conversation Boundaries (P0)

**Scope**: `.github/agents/` — 2 conductor agents
**Branch**: `feature/context-optimization`

- [ ] S5.1: Add `## Conversation Health` to `01-conductor.agent.md`
- [ ] S5.2: Add `## Conversation Health` to `16-app-conductor.agent.md`

### Stream 6 — Duplicate Content Removal (M7)

**Scope**: `.github/agents/` — overlaps with Stream 4
**Branch**: `feature/context-optimization`
**Depends on**: Stream 4 (dedup is done alongside body trimming)

- [ ] S6.1: Remove Policy Effect tables from agents 05 + 06 (done with S4.1/S4.3)
- [ ] S6.2: Remove redundant security baseline text from agent 06 (done with S4.1)
- [ ] S6.3: Deduplicate cost estimation workflow between agents 03 + 08

### ── REVIEW GATE 2 ── (After Streams 4-6)

- [ ] RG2.1: GPT 5.3 — completeness review (agents still self-sufficient, pointers resolve)
- [ ] RG2.2: Sonnet 4.6 — adversarial stress-test (find failure scenarios in trimmed agents)
- [ ] RG2.3: `npm run validate` — full suite passes
- [ ] RG2.4: `npm run lint:md` — all modified files pass
- [ ] RG2.5: Manually invoke 3+ agents in Copilot Chat — functional spot-check
- [ ] RG2.6: Human approval — plan complete

### Final Verification

- [ ] FV.1: `npm run validate` — all 16 validators pass (clean run)
- [ ] FV.2: `npm run lint:md` — zero warnings
- [ ] FV.3: Commit + PR to main

---

## Session-to-Stream Mapping (Recommended)

Streams are sized to fit within a single context window each.
Adjust based on actual context consumption.

| Session | Streams       | Est. edits | Key risk                   |
| ------- | ------------- | ---------- | -------------------------- |
| 1       | Stream 1      | 9 agents   | Frontmatter YAML syntax    |
| 2       | Stream 2      | 6 files    | applyTo glob correctness   |
| 3       | Stream 3.1-2  | 2 skills   | Content loss in splits     |
| 4       | Stream 3.3-6  | 4 skills   | Content loss in splits     |
| 5       | Review Gate 1 | 0 edits    | Review + validation only   |
| 6       | Stream 4.1-3  | 3 agents   | Agent behavior regression  |
| 7       | Stream 4.4-6  | 3 agents   | Agent behavior regression  |
|         | + Stream 5    | + 2 agents |                            |
| 8       | Stream 6      | 2-3 agents | Accidental content removal |
| 9       | Review Gate 2 | 0 edits    | Review + validation only   |
|         | + Final       |            |                            |

---

## Session Log

<!-- Append one entry per session. Keep entries concise. -->

| #   | Date       | Stream/Step | What was done                                                                                                                                                                                                                                                                                                                        | What's next         | Blockers                                                                     |
| --- | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------- |
| 1   | 2026-02-28 | S1 complete | Replaced all MCP tool entries with wildcards in 9 infra agents (S1.1-S1.5). 537 lines removed, 25 added. All frontmatter validators pass.                                                                                                                                                                                            | S2.1 (instructions) | Pre-existing dead link in docs/hackops-user-guide.md (not caused by changes) |
| 1b  | 2026-02-28 | S1.2 revert | Reverted `ms-azuretools.vscode-azure-github-copilot/*` wildcard back to 6 individual entries in all 9 agents — wildcards only work for MCP server prefixes, not VS Code extension tool IDs.                                                                                                                                          | S2.1 (instructions) | None                                                                         |
| 2   | 2026-02-28 | S2 complete | Completed all S2 items. Narrowed applyTo globs (S2.1-S2.2), trimmed code-review 314→96 lines with rules extracted to 5 lang files (S2.3), trimmed azure-artifacts 299→91 lines (S2.4), trimmed markdown 257→95 lines (S2.5). Updated validate-h2-sync.mjs (2-source mode) and validate-governance-refs.mjs (removed agent.md check). | S3.1 (skill splits) | Pre-existing dead link in docs/hackops-user-guide.md (unchanged)             |

---

## Key Files (context loading reference)

Agents starting a new session should read these files to
establish context. Listed in priority order — stop when you
have enough context for the current step.

### Always read (every session)

1. **This file** — `docs/exec-plans/active/context-optimization-execution.md`
2. **Blueprint** — `.github/prompts/plan-applyContextOptimizationReport.prompt.md`
   (read only the stream you're working on)

### Read when working on specific streams

| Stream           | Additional context files                                      |
| ---------------- | ------------------------------------------------------------- |
| 1 (wildcards)    | Any one infra agent frontmatter (for pattern reference),      |
|                  | `_subagents/bicep-lint-subagent.agent.md` (wildcard exemplar) |
| 2 (instructions) | The specific instruction file being modified                  |
| 3 (skills)       | The specific SKILL.md being split                             |
| 4 (agent bodies) | The specific agent being trimmed + target skill `references/` |
| 5 (conductors)   | `01-conductor.agent.md`, `16-app-conductor.agent.md`          |
| 6 (dedup)        | `bicep-governance.instructions.md`, `azure-defaults` SKILL.md |
| Review Gates     | All files modified in the preceding streams (use `git diff`)  |

---

## Decisions Made During Execution

<!-- Record any runtime decisions that deviate from the blueprint -->

| Date       | Decision                                                                           | Rationale                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 2026-02-28 | Combined S1.1-S1.5 into single replacement per agent (9 ops vs 25)                 | All MCP tool blocks are contiguous in each agent, so one replacement per file covers all wildcard types at once |
| 2026-02-28 | S1.2 skipped — kept `ms-azuretools.vscode-azure-github-copilot` individual entries | Wildcards only work for MCP server prefixes (e.g. `azure-mcp/*`, `bicep/*`), not for VS Code extension tool IDs |
| 2026-02-28 | S1.5 skipped — kept `ms-python.python` individual entries                          | Same reason as S1.2: `ms-python.python/*` is not a valid wildcard target                                        |
| 2026-02-28 | S2.6 no-op — applyTo examples already fenced in YAML code block                    | Lines 33-42 of context-optimization.instructions.md already use ```yaml fence                                   |
| 2026-02-28 | Updated validate-h2-sync.mjs to support 2-source mode                              | Instruction file no longer has fenced heading blocks; validator gracefully skips H2-reference comparison        |
| 2026-02-28 | Updated validate-governance-refs.mjs to remove `**/*.agent.md` check               | Aligns with S2.2: governance instructions no longer auto-load for agent files                                   |
