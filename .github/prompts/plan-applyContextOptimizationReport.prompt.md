# Plan: Apply Context Optimization Report (Excluding Tool Removal)

Implement all findings from the context optimization report across 6 streams with 2 review gates. The only tool change is wildcarding MCP server prefixes — tool removal is excluded. Key correction from research: each infra agent lists **47** `azure-mcp/` entries (not 36), so the savings are even larger than originally estimated. The bicep-lint-subagent at `.github/agents/_subagents/bicep-lint-subagent.agent.md` (lines 10-16) proves the wildcard pattern with just 6 tool lines total.

**Execution tracking**:

- **Tracker**: `docs/exec-plans/active/context-optimization-execution.md`
- **Resume prompt**: `.github/prompts/context-optimization-resume.prompt.md`
  (run `/context-optimization-resume` at each session start)

---

## Stream 1 — MCP Wildcard Replacement (P0, all 9 infra agents)

**Scope**: `01-conductor`, `02-requirements`, `03-architect`, `04-design`, `05-bicep-planner`, `06-bicep-code-generator`, `07-deploy`, `08-as-built`, `09-diagnose` (all in `.github/agents/`)

1. **In all 9 agents**: Replace the **47** individually-listed `azure-mcp/{service}` entries with `"azure-mcp/*"` (1 line replaces 47)
2. **In all 9 agents**: Replace the **6** individually-listed `ms-azuretools.vscode-azure-github-copilot/{tool}` entries with `"ms-azuretools.vscode-azure-github-copilot/*"` (1 replaces 6). Keep the separate `ms-azuretools.vscode-azureresourcegroups/azureActivityLog` entry as-is (different prefix)
3. **In agents 05, 06, 07, 09**: Replace the **10** individually-listed `bicep/{tool}` entries with `"bicep/*"` (1 replaces 10)
4. **In agent 04**: Replace the **12** individually-listed `pylance-mcp-server/{tool}` entries with `"pylance-mcp-server/*"` (1 replaces 12)
5. **In agents 04 and 09**: Replace the **4** individually-listed `ms-python.python/{tool}` entries with `"ms-python.python/*"` (1 replaces 4)

**Net effect per agent**: ~53-65 frontmatter lines removed, replaced by 1-3 wildcard lines. Frontmatter shrinks significantly and becomes maintenance-free when new MCP tools are added.

**Preservation**: Keep all non-MCP tool entries unchanged (`vscode/*`, `execute/*`, `read/*`, `agent/*`, `edit/*`, `search/*`, `web/*`, `todo`, `vscode.mermaid-chat-features/renderMermaidDiagram`).

---

## Stream 2 — Instruction File Optimization (P1-P3)

6. **C3/P1**: `code-commenting.instructions.md` (180 lines) — Change `applyTo` from `'**'` to `'**/*.{js,mjs,cjs,ts,tsx,jsx,py,ps1,sh,bicep}'`. The 165 lines of JS code examples stop loading for `.md`, `.json`, and other non-code files. ~1,200 tokens saved per non-code turn.

7. **H6/P1**: `bicep-governance.instructions.md` (84 lines) — Remove `**/*.agent.md` from `applyTo`. New value: `"**/*.bicep, **/04-governance-constraints.*, **/04-governance-constraints.json"`. ~660 tokens saved when editing agent files.

8. **H5/P2**: `code-review.instructions.md` (314 lines) — Extract language-specific review rules into the corresponding instruction files:
   - JS/TS rules → `typescript.instructions.md` and `javascript.instructions.md`
   - Python rules → `python.instructions.md`
   - Shell rules → `shell.instructions.md`
   - Bicep rules → `bicep-code-best-practices.instructions.md`
   - Keep shared principles (priority tiers, security checks, comment format) ≤ 100 lines in the source file. ~1,700 tokens saved for single-language edits.

9. **M4/P3**: `azure-artifacts.instructions.md` (299 lines) — Trim to ~100 lines: enforcement trigger + quick reference card + fix commands. The detailed H2 heading lists (lines 40-250) already live in `azure-artifacts/SKILL.md`. ~1,600 tokens saved.

10. **M5/P3**: `markdown.instructions.md` (257 lines) — Trim to ≤ 100 lines by removing extended examples (good/bad pairs, table formatting demos). Core rules (headings, line length, code blocks, links, callouts, validation commands) stay. ~1,200 tokens saved.

11. **M8 (clarity fix)**: `context-optimization.instructions.md` — Fence the in-body `applyTo` examples (lines 33, 36, 39) in a YAML code block to prevent future parsing confusion. No token savings — syntax clarity only.

---

## Stream 3 — Skill Progressive Loading (P1-P2)

12. **H1/P1**: `azure-defaults/SKILL.md` (618 lines, **no** existing `references/`) — Create `references/` and split:
    - `references/naming-conventions.md` ← § CAF Naming Conventions
    - `references/avm-catalog.md` ← § Azure Verified Modules + § AVM Known Pitfalls
    - `references/security-baseline.md` ← extracted security items
    - `references/waf-criteria.md` ← § WAF Assessment Criteria
    - `references/pricing-service-names.md` ← § Azure Pricing MCP Service Names + § Service Recommendation Matrix
    - `references/governance-discovery.md` ← § Governance Discovery
    - Keep SKILL.md ≤ 200 lines: frontmatter + Progressive Loading Order + Quick Reference (regions, tags) + pointers to each file + Validation Checklist. ~3,300 tokens saved per partial load.

13. **H2/P1**: `azure-artifacts/SKILL.md` (614 lines, has `templates/` but **no** `references/`) — Create `references/` and split:
    - `references/h2-templates.md` ← § Template H2 Structures (15+ artifact heading lists)
    - `references/standard-components.md` ← § Standard Components
    - `references/styling-standards.md` ← § Styling Standards + emoji tables
    - Keep SKILL.md ≤ 200 lines: Artifact Generation Rules + Mandatory Compliance + DO/DON'T + pointers. ~3,000 tokens saved per partial load.

14. **M1/P2**: `azure-diagrams/SKILL.md` (551 lines, **has** `references/` with 13 files) — Move remaining inline content to existing/new references:
    - Azure Service Categories table → merge into existing `references/azure-components.md`
    - Connection Syntax + Diagram Attributes + Clusters → merge into existing `references/common-patterns.md`
    - Professional Output Standards → new `references/output-standards.md`
    - Data Visualization Charts → merge into existing `references/waf-cost-charts.md`
    - Keep SKILL.md ≤ 200 lines. ~2,800 tokens saved.

15. **M2/P2**: `azure-bicep-patterns/SKILL.md` (305 lines, **no** existing `references/`) — Create `references/` and split each pattern: `hub-spoke.md`, `private-endpoint.md`, `diagnostic-settings.md`, `conditional-deployment.md`, `module-composition.md`, `managed-identity.md`, `whatif-interpretation.md`. SKILL.md keeps pattern index + when-to-use table. ~800 tokens per partial load.

16. **M3/P2**: `github-operations/SKILL.md` (305 lines, **no** existing `references/`) — Create `references/` and split: `references/mcp-tools.md` (MCP tool catalog), `references/gh-cli.md` (CLI fallback patterns). SKILL.md keeps decision matrix + priority rules. ~800 tokens saved.

17. **P2**: `azure-troubleshooting/SKILL.md` (271 lines, **no** existing `references/`) — Create `references/` and split: `references/kql-templates.md`, `references/health-checks.md`, `references/remediation-playbooks.md`. ~800 tokens saved.

---

## ── REVIEW GATE 1 ── (After Streams 1-3)

**Why here**: Skill splits reshape how agents discover knowledge. A broken pointer or missing `references/` file silently degrades every agent that reads that skill. Instruction `applyTo` changes alter context loading per file type. Catching errors before Streams 4-6 prevents compounding — agent body edits will add `Read references/{file}` pointers that must resolve.

**GPT 5.3 reviews structural integrity**:

- All `references/` files exist at the declared paths
- SKILL.md pointers match actual filenames
- Instruction `applyTo` globs are syntactically valid
- No content was lost in the splits (diff against originals)
- Wildcard syntax is correct per agent frontmatter schema

**Sonnet 4.6 reviews semantic preservation**:

- Trimmed SKILL.md files still give agents enough context to decide which reference file to load
- Progressive loading instructions are clear and unambiguous
- Reference file granularity is appropriate (not too coarse, not too fine)

**Automated verification**:

- `npm run validate` (includes `lint:agent-frontmatter`, `lint:skills-format`)
- `npm run lint:md`
- `npm run lint:artifact-templates`

---

## Stream 4 — Agent Body Trimming (P2)

For each oversized agent, extract inline content to skills or skill `references/` directories, replacing with `Read {skill} § {section}` pointers. Target: ≤ 200 lines body (excluding frontmatter).

18. **`06-bicep-code-generator.agent.md`** (~257 body lines after Stream 1, largest body) — Move:
    - Phase 2 progressive implementation workflow → `azure-bicep-patterns` skill references
    - `main.bicep` structure template → same
    - Security baseline duplicates → remove (already in `azure-defaults` skill)
    - Policy Effect table → remove (already in `bicep-governance.instructions.md`)
    - ~1,600 token reduction.

19. **`07-deploy.agent.md`** (~254 body lines after Stream 1, 10 bash/PowerShell code blocks totaling ~51 lines) — Move all 10 bash/PowerShell deployment script blocks to a **new `references/deployment-scripts.md`** under a **new `azure-deploy` skill** (`.github/skills/azure-deploy/SKILL.md` + `references/deployment-scripts.md`). Agent body references by path, reads on demand. ~1,500 token reduction.

20. **`05-bicep-planner.agent.md`** (~233 body lines after Stream 1) — Remove duplicated Policy Effect Decision Tree (already in `bicep-governance.instructions.md`), move YAML resource structure example to `azure-bicep-patterns` references, trim approval gate template. ~1,200 token reduction.

21. **`01-conductor.agent.md`** (~190 body lines after Stream 1) — Move 5 approval gate text templates, Subagent Integration table, Model Selection table, and Artifact Tracking table to a new `references/` under a lightweight conductor skill or as `.github/agents/references/conductor-tables.md`. ~1,000 token reduction.

22. **`03-architect.agent.md`** (~188 body lines after Stream 1) — Remove inline WAF pillar descriptions (use `azure-defaults` skill pointer), remove pricing tools table (use `azure-defaults` skill pointer), trim cost estimation workflow section. ~600 token reduction.

23. **`09-diagnose.agent.md`** (~176 body lines after Stream 1) — Move KQL diagnostic query templates and remediation steps to `azure-troubleshooting` skill `references/` (created in step 17). ~900 token reduction.

---

## Stream 5 — Conductor Conversation Boundaries (P0)

24. Add a `## Conversation Health` section to `01-conductor.agent.md` and `16-app-conductor.agent.md` with rules:
    - After ~50 Opus `editAgent` turns OR any context summarization trigger, recommend starting a new conversation
    - Between infra phase (Steps 1-7) and app phase (Steps A1-A9), hand off to a new chat session or delegate to App Conductor
    - Save progress to the session tracker (`docs/exec-plans/active/hackops-execution.md`) before hand-off
    - For sessions > 2 hours, proactively checkpoint via `/session-resume` pattern

**Note**: Neither conductor currently has any conversation health/boundary guidance — this is entirely new content.

---

## Stream 6 — Duplicate Content Removal (M7)

25. Across all agent bodies, remove content that duplicates what's already in skills/instructions:
    - **Policy Effect tables** — remove from agents 05 (lines ~225-235) and 06 (lines ~250-260) (~17 lines of near-identical content), rely on `bicep-governance.instructions.md` (this overlaps with steps 18/20 — execute together)
    - **Security baseline keywords** — research shows these are concentrated in agent 06 with minor mentions in 02/05. Only 06's inline security policy text is redundant with `azure-defaults` skill; brief mentions in 02/05 are appropriate context and should stay
    - **Cost estimation workflow** — deduplicate between `03-architect` (~50 lines) and `08-as-built` (~25 lines). Extract shared cost estimation workflow to `azure-defaults` skill or a shared reference; both agents point to it. Conductor's policy note (~8 lines) is brief enough to keep inline
    - ~200-400 tokens saved per affected agent

---

## ── REVIEW GATE 2 ── (After Streams 4-6)

**Why here**: Removing inline content from agent bodies changes runtime behavior. Duplicate removal could accidentally strip content that served a contextual purpose in a specific agent's workflow.

**GPT 5.3 reviews completeness**:

- Each trimmed agent still has enough workflow guidance to operate independently
- All `Read {skill} § {section}` pointers are accurate and resolve to real content
- Conductor boundary rules make sense operationally
- New `azure-deploy` skill exists with correct `references/deployment-scripts.md`

**Sonnet 4.6 adversarial stress-test**:

- Find scenarios where a trimmed agent would fail (e.g., "agent 06 no longer knows its security baseline if `azure-defaults` skill isn't loaded — is that handled?")
- Check for orphaned references
- Validate no circular dependencies between skills
- Verify cost estimation dedup doesn't break either agent's workflow with the shared reference

**Automated verification**:

- `npm run validate` (full suite)
- `npm run lint:md`
- `npm run lint:artifact-templates`
- Manually invoke each modified agent in Copilot Chat to spot-check functionality
- Verify `references/` files are reachable: agents should `read_file` them on demand

---

## Verification (Final)

- `npm run validate` — all 16 validators pass
- `npm run lint:md` — markdown formatting clean on all modified files
- `npm run lint:artifact-templates` — no artifact template regressions
- Spot-check each modified agent functions correctly in Copilot Chat
- Confirm skill `references/` files load on demand
- Verify no regressions in existing subagents (they already use wildcards)

## Decisions

- Wildcard replacement for **all** MCP server prefixes: `azure-mcp/*`, `bicep/*`, `pylance-mcp-server/*`, `ms-python.python/*`, `ms-azuretools.vscode-azure-github-copilot/*` — matching the pattern proven in `bicep-lint-subagent.agent.md` (lines 10-16)
- **Excluded** tool removal (dropping unused vscode/extension, notebook, task tools) per user request
- **Excluded** trimming of near-threshold agents 02-Requirements and 08-As-Built per user preference
- 07-deploy deployment scripts go to **new `references/deployment-scripts.md` under a new `azure-deploy` skill** (not `.github/scripts/`)
- Conversation boundary guidance added to Conductors as agent body text (not external enforcement)
- Skill splits create `references/` directories with focused files; SKILL.md retains an index ≤ 200 lines with `Read references/{file}` pointers
- Two review gates: after Streams 1-3 (structural integrity) and after Streams 4-6 (behavioral correctness)
- Corrected azure-mcp count: **47** entries per agent (not 36 as originally noted), making per-agent savings even larger (~47 lines → 1 wildcard line)
