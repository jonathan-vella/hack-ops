# Plan: Align Project with Harness Engineering Principles

**TL;DR** — Restructure the agent/instruction/skill layer to follow OpenAI's Harness Engineering philosophy: give agents a map not a manual, enforce invariants mechanically, add progressive disclosure, codify golden principles, introduce execution plans and quality scoring, and set up recurring entropy/garbage collection. Instructions get moderate consolidation (28 → ~20 by deduplicating + merging obvious overlaps). Skills get a new `golden-principles` skill. A lightweight `AGENTS.md` replaces the current monolithic `copilot-instructions.md` as the primary context entry point. Agents are updated (not renamed) to reference the new structure.

---

## Step 1 — Create `AGENTS.md` as the Lightweight Map (~100 lines)

Create a top-level `AGENTS.md` that serves as the "table of contents" entry point. Per the Harness article: _"instead of treating AGENTS.md as the encyclopedia, we treat it as the table of contents."_

- Content: project purpose (2-3 lines), 7-step workflow table (compact), agent roster (name → one-line purpose), pointer to `.github/skills/` for domain knowledge, pointer to `.github/instructions/` for file-type rules, pointer to `docs/` for deep documentation, pointer to `docs/exec-plans/` for active/completed plans.
- Keep under 100 lines — no rules, no detailed conventions, just pointers.
- Reference from `.vscode/settings.json` or agent frontmatter so it's auto-injected.
- Existing `.github/copilot-instructions.md` stays but is trimmed to reference `AGENTS.md` and remove content that's duplicated elsewhere.

## Step 2 — Deduplicate & Consolidate Instructions (28 → ~20)

### Phase 2a: Remove exact duplicates (28 → 25)

- Delete `.github/instructions/agents-definitions.instructions.md` — duplicate of `agent-definitions.instructions.md`
- Delete `.github/instructions/self-explanatory-code-commenting.instructions.md` — duplicate of `code-commenting.instructions.md`
- Delete `.github/instructions/update-docs-on-code-change.instructions.md` — duplicate of `docs-trigger.instructions.md`

### Phase 2b: Merge overlapping instructions (25 → ~20)

- Merge `artifact-h2-reference.instructions.md` INTO `azure-artifacts.instructions.md` — both enforce artifact H2 headings. The merged file becomes a compact enforcement trigger that points to the `azure-artifacts` skill as the authoritative source.
- Merge `cost-estimate.instructions.md` INTO `azure-artifacts.instructions.md` — cost estimate formatting is a subset of artifact standards.
- Merge `governance-discovery.instructions.md` INTO `bicep-policy-compliance.instructions.md` — governance discovery is the prerequisite step for policy compliance; rename the merged file to `bicep-governance.instructions.md` (applyTo: `**/*.bicep, **/*.agent.md, **/04-governance-constraints.*`).
- Merge `docs-trigger.instructions.md` INTO `docs.instructions.md` — trigger conditions belong with doc standards.
- Merge `copilot-thought-logging.instructions.md` INTO `agent-research-first.instructions.md` — thought logging is part of the research-first methodology.

**Result: ~20 instruction files**, each with a clear single responsibility and no content duplication.

## Step 3 — Create Golden Principles Skill + Instruction

### New Skill: `.github/skills/golden-principles/SKILL.md`

Content: agent-first operating principles distilled from Harness Engineering, adapted to this project:

1. _Repository is the system of record_ — all context must live in-repo, not in external docs/chat.
2. _Map, not manual_ — instructions point to deeper sources; never dump everything into context.
3. _Enforce invariants, not implementations_ — strict boundaries, autonomous expression within them.
4. _Parse at boundaries_ — validate inputs/outputs at module edges.
5. _AVM-first, security baseline always_ — existing project conventions elevated to principles.
6. _Golden path pattern_ — prefer shared utilities over hand-rolled helpers.
7. _Human taste gets encoded_ — review feedback becomes documentation/linter rules, not ad-hoc fixes.
8. _Context is scarce_ — every token in the agent's context window must earn its keep.
9. _Progressive disclosure_ — start small, point to deeper docs when needed.
10. _Mechanical enforcement over documentation_ — if a rule can be a linter/CI check, make it one.

### New Instruction: `.github/instructions/golden-principles.instructions.md`

- `applyTo: **` (universal)
- Compact (~30 lines) — states the 10 principles as imperatives with one-line rationale each.
- Points to the full skill for detailed guidance.

## Step 4 — Add Execution Plans Structure

Create `docs/exec-plans/` directory:

- `docs/exec-plans/README.md` — explains the exec-plans system (what they are, format, lifecycle).
- `docs/exec-plans/active/` — currently in-progress plans.
- `docs/exec-plans/completed/` — finished plans (kept for agent context and decision history).
- `docs/exec-plans/tech-debt-tracker.md` — running inventory of known debt, quality gaps, and planned remediation.

Exec plan format (lightweight):

```markdown
## Plan: {Title}

**Status**: Active | Completed | Blocked
**Owner**: {agent or human}
**Created**: {date}
**Decisions**: {key choices made}
**Progress**: {checklist}
```

## Step 5 — Add Quality Scoring

Create `QUALITY_SCORE.md` at repo root:

- Grade each domain: Agents (A-F), Skills (A-F), Instructions (A-F), Infrastructure Patterns (A-F), Documentation (A-F), CI/Validation (A-F).
- Each grade has: current score, gap description, improvement action.
- Updated by the garbage collection agent (Step 7) on a recurring cadence.
- Referenced from `AGENTS.md` so agents can see project health at a glance.

## Step 6 — Update All 10 Top-Level Agents

Each agent's `.agent.md` body is updated (not renamed or consolidated) to:

1. **Add `golden-principles` skill reference** — all 10 agents read this skill first, before `azure-defaults`.
2. **Reference `AGENTS.md`** — add instruction to read the map file for orientation before starting work.
3. **Trim context loading** — where agents currently load multiple overlapping instructions, update to reference the consolidated set from Step 2.
4. **Add execution plan awareness** — agents that produce artifacts (Steps 1-7) should note their progress in `docs/exec-plans/active/` when working on multi-step tasks.
5. **Add entropy awareness** — agents should check `QUALITY_SCORE.md` and `docs/exec-plans/tech-debt-tracker.md` to avoid replicating known-bad patterns.

Specific per-agent changes:

- **01-Conductor**: Add exec-plan creation/tracking at workflow start. Reference `QUALITY_SCORE.md` in pre-flight checks.
- **02-Requirements through 08-As-Built**: Add golden-principles skill reference. Update instruction references to consolidated names.
- **09-Diagnose**: Add reference to store diagnostic findings as exec-plan artifacts when they reveal systemic issues.
- **10-Challenger**: Add golden-principles as a review lens (check if proposals violate core principles).

## Step 7 — Entropy/Garbage Collection (Dual-Mode)

### 7a: Agent-driven — "doc-gardening" prompt

Create `.github/prompts/doc-gardening.prompt.md` — a prompt file that agents can run to scan for:

- Stale documentation (content doesn't match code reality)
- Instruction/skill drift (rules that no longer reflect actual patterns)
- Quality score degradation
- Tech debt accumulation

Output: updated `QUALITY_SCORE.md`, new entries in `docs/exec-plans/tech-debt-tracker.md`, and fix-up tasks.

### 7b: CI-driven — GitHub Actions workflow

Create `.github/workflows/entropy-check.yml` — scheduled weekly workflow that:

- Runs existing `check-docs-freshness.mjs`
- Validates instruction/skill cross-references still resolve
- Checks for instruction files with no agent references (orphaned)
- Opens a GitHub issue if problems are found

Extends existing validation suite rather than replacing it.

## Step 8 — Update Supporting Documentation

- Update `docs/README.md` to reference exec-plans structure.
- Update `docs/workflow.md` to describe the new progressive-disclosure model.
- Update `CONTRIBUTING.md` with guidance on when to add an instruction vs. a skill vs. a golden principle.
- Add a section to `docs/quickstart.md` explaining the `AGENTS.md` → skills → instructions hierarchy.

## Step 9 — Skills Refinement

No skills are deleted or merged, but three updates:

- **`azure-defaults`**: Add a "Progressive Loading" section that explicitly tells agents: "Read `golden-principles` first, then this skill, then task-specific skills."
- **`docs-writer`**: Add garbage-collection workflow awareness — it should know about `QUALITY_SCORE.md` and `tech-debt-tracker.md`.
- **`make-skill-template`**: Update the scaffold to include a golden-principles alignment check (does the new skill follow the 10 principles?).

---

## Verification

- Run `npm run validate` — all frontmatter and template validators pass.
- Run `npm run lint:md` — all markdown files pass linting.
- Run `node scripts/validate-instruction-references.mjs` — no orphaned references from deleted/renamed instructions.
- Run `node scripts/validate-skills-format.mjs` — new `golden-principles` skill passes format checks.
- Run `node scripts/validate-agent-frontmatter.mjs` — all 15 agents pass with updated skill/instruction references.
- Manual: verify each agent loads ≤ 5 instruction files at context time (down from current 6-10+).
- Manual: confirm `AGENTS.md` stays under 100 lines.

## Decisions

- **Moderate consolidation** chosen over aggressive — keeps ~20 instruction files with clear single responsibilities. Avoids mega-files that themselves become "manuals."
- **Both layers retained** — instructions enforce (applied by glob, mechanical), skills educate (read on demand, deep knowledge). No skill-instruction merging even when content overlaps.
- **Golden principles as both skill + instruction** — skill provides the deep reasoning; instruction provides the imperatives. Both reference each other.
- **Exec plans under docs/** — follows Harness article layout and keeps agent-output/ reserved for per-project workflow artifacts.
- **QUALITY_SCORE.md at root** — maximum visibility, referenced from AGENTS.md map.
