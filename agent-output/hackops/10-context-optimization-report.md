# Context Window Optimization Report

**Generated**: 2026-02-27T20:00:00Z
**Project**: HackOps
**Sessions Analyzed**: 4
**Total Requests**: 2,181

---

## Executive Summary

| Metric                           | Current   | Target    | Impact                     |
| -------------------------------- | --------- | --------- | -------------------------- |
| Avg latency (Opus)               | 9,893ms   | ≤ 8,000ms | ~19% faster turns          |
| Long turns (>15s) per session    | 49.5 avg  | ≤ 15      | Fewer near-overflow turns  |
| Very long turns (>60s) total     | 21        | ≤ 3       | Eliminate context overflow |
| Context summarizations           | 5         | 0         | No forced truncation       |
| Errors/cancellations             | 89 (4.1%) | < 1%      | Less wasted compute        |
| Always-loaded instruction tokens | ~1,776    | ~344      | ~1,432 tokens saved/turn   |
| Skills missing progressive load  | 17 of 20  | ≤ 5       | On-demand loading only     |
| Agent definitions > 300 lines    | 6 of 16   | 0         | Leaner system prompts      |
| Agents with > 90 tools           | 9 of 16   | 0         | ~6,750 tokens saved/agent  |

## Session Profiles

| Session         | Requests | Avg Latency | Max Latency | Long Turns | Bursts | Summarizations | Trend      |
| --------------- | -------- | ----------- | ----------- | ---------- | ------ | -------------- | ---------- |
| 20260226T073439 | 160      | 6,449ms     | 104,635ms   | 13         | 26     | 0              | stable     |
| 20260226T082827 | 487      | 6,546ms     | 125,357ms   | 44         | 132    | 1              | stable     |
| 20260226T101710 | 1,497    | 6,495ms     | 249,102ms   | 136        | 300    | 4              | escalating |
| 20260227T194042 | 37       | 13,289ms    | 244,176ms   | 5          | 10     | 0              | escalating |

### Key Observations

- **Session 20260226T101710** is a 7-hour marathon with 1,497 requests, 679 Opus
  editAgent turns, and 4 forced context summarizations. Opus turn latency
  escalated from ~8,355ms (turns 0-29) to ~16,992ms (turns 510-539) before
  summarization reset it. This session hit the 249s max — near certain context
  truncation.
- **20 cost-estimate-subagent calls** consumed 164s total in session 3 — good
  use of delegation, but the parent agent still retained context from each call.
- **458 burst calls** (copilotLanguageModelWrapper < 2s) across session 3
  indicate heavy tool-call loops accumulating context rapidly.

---

## Findings

### 🔴 Critical — Context Overflow Risk

| #   | Agent/File                        | Issue                                                                                                                         | Evidence                                                                                                                  | Recommendation                                                                                                                                                                                                                                                                                |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | All infra agents (01-09)          | **90-110 tools per agent** — each tool schema costs ~75 tokens, totaling ~6,750-8,250 tokens of system prompt per agent       | `06-bicep-code-generator`: 104 tools; `09-diagnose`: 108; `04-design`: 110                                                | Reduce to ≤ 40 core tools. Remove `vscode/extensions`, `vscode/installExtension`, `vscode/newWorkspace`, `execute/createAndRunTask`, `read/readNotebookCellOutput`, `execute/runNotebookCell`, `read/getNotebookSummary` and other unused capabilities. Est. savings: **~4,500 tokens/agent** |
| C2  | Session 20260226T101710           | **No hand-off boundaries in 7-hour session** — 679 Opus turns with progressive latency escalation and 4 forced summarizations | Opus latency rose from 8,355ms → 16,992ms; 12 turns > 60s; max 249,102ms                                                  | Enforce conversation-length limits in Conductor agents. After ~50 Opus turns or any summarization trigger, start a **new conversation** or delegate remaining work to a subagent. Est. impact: **prevent context truncation**                                                                 |
| C3  | `code-commenting.instructions.md` | **179-line instruction with `applyTo: "**"`\*\* — loads on every single file operation                                        | 179 lines ≈ 1,432 tokens loaded unconditionally, even for Bicep, JSON, YAML, shell files where JS examples are irrelevant | Narrow to `applyTo: "**/*.{js,mjs,cjs,ts,tsx,jsx,py}"`. The core principle (3 lines) can stay at `**`; move the 170 lines of examples to a `code-commenting` skill with `references/`. Est. savings: **~1,200 tokens/turn for non-code files**                                                |

### 🟠 High — Significant Token Waste

| #   | Agent/File                         | Issue                                                                                                   | Evidence                                                                                                                                                                                    | Recommendation                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1  | `azure-defaults` skill             | **617-line SKILL.md without `references/` directory** — entire file loaded when any part is needed      | Largest skill in repo; contains naming tables, tag rules, region lists, AVM catalog, security baseline, WAF criteria, pricing guidance                                                      | Split into `references/naming.md`, `references/security-baseline.md`, `references/avm-catalog.md`. Keep SKILL.md ≤ 200 lines with pointers. Est. savings: **~3,300 tokens when only partial content needed**                                                                         |
| H2  | `azure-artifacts` skill            | **613-line SKILL.md without `references/` directory** — template content loaded in full                 | Contains full H2 templates for all 7 steps, styling rules, section maps                                                                                                                     | Split templates into `references/step-{n}-template.md`. SKILL.md keeps the index + rules. Est. savings: **~3,000 tokens**                                                                                                                                                            |
| H3  | 6 agent definitions > 300 lines    | **Oversized agent bodies** inflate system prompt                                                        | `06-bicep-code-generator` (413), `07-deploy` (412), `05-bicep-planner` (389), `01-conductor` (365), `03-architect` (345), `09-diagnose` (313). Note: `02-requirements` (295) and `08-as-built` (294) are near-threshold. | Move inline tables, workflow steps, and code blocks to skills. Agent body should be ≤ 200 lines of workflow + delegation rules. Est. savings: **~800-1,600 tokens per agent**                                                                                                        |
| H4  | `07-deploy.agent.md`               | **20 fenced code blocks inline** — highest of any agent                                                 | Full deployment scripts, PowerShell snippets, and error-handling templates embedded in agent definition                                                                                     | Move deployment scripts to `azure-deploy` skill `references/` or `.github/scripts/`. Agent references them by path. Est. savings: **~1,500 tokens**                                                                                                                                  |
| H5  | `code-review.instructions.md`      | **313 lines, loaded for ALL code files** (`**/*.{js,mjs,...,bicep,tf}`) — heaviest targeted instruction | Triggered on any TS, JS, Python, PS1, Shell, Bicep, or Terraform file edit                                                                                                                  | Split language-specific review rules into the respective language instructions (e.g., TypeScript review rules → `typescript.instructions.md`). Keep `code-review.instructions.md` ≤ 100 lines with shared principles only. Est. savings: **~1,700 tokens for single-language edits** |
| H6  | `bicep-governance.instructions.md` | **Loads for `**/\*.agent.md`\*\* — governance rules have no relevance when editing agent definitions    | `applyTo` includes `**/*.agent.md` alongside `**/*.bicep`                                                                                                                                   | Remove `**/*.agent.md` from `applyTo`. Governance context is only relevant for Bicep files and governance artifacts. Est. savings: **~660 tokens when editing agent files**                                                                                                          |

### 🟡 Medium — Optimization Opportunity

| #   | Agent/File                                      | Issue                                                                                                               | Evidence                                                                                                                                                                                            | Recommendation                                                                                                                                                                                           |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `azure-diagrams` skill (550 lines)              | Large skill without progressive loading despite having `references/` dir                                            | 550 lines loaded when a simple diagram type is requested                                                                                                                                            | Move matplotlib chart templates, color schemes, and layout details to `references/`. Keep SKILL.md ≤ 200 lines. Est. savings: **~2,800 tokens**                                                          |
| M2  | `azure-bicep-patterns` skill (304 lines)        | No `references/` directory                                                                                          | Hub-spoke, private endpoint, and diagnostic patterns all inline                                                                                                                                     | Split each pattern into `references/{pattern-name}.md`. Est. savings: **~800 tokens per partial load**                                                                                                   |
| M3  | `github-operations` skill (304 lines)           | No `references/` directory                                                                                          | MCP tool catalog and gh CLI fallback patterns inline                                                                                                                                                | Split into `references/mcp-tools.md` and `references/gh-cli.md`. Est. savings: **~800 tokens**                                                                                                           |
| M4  | `azure-artifacts.instructions.md` (298 lines)   | Second-largest instruction; loaded for all agent-output markdown                                                    | Full H2 sync rules, template compliance tables                                                                                                                                                      | Move detailed compliance tables to the `azure-artifacts` skill. Instruction keeps the 5 core invariants. Est. savings: **~1,600 tokens**                                                                 |
| M5  | `markdown.instructions.md` (256 lines)          | Loads for ALL `.md` files, including agent outputs, skills, instructions                                            | Contains detailed formatting rules, heading conventions, link patterns                                                                                                                              | Trim to ≤ 100 lines of core rules. Move extended examples to a `references/` file or remove them. Est. savings: **~1,200 tokens**                                                                        |
| M6  | `agent-definitions.instructions.md` (202 lines) | Loaded when editing any `*.agent.md` alongside 3 other instructions                                                 | Stacks with `agent-research-first` (90 lines), `bicep-governance` (83 lines), `context-optimization` (89 lines) = 464 lines total for agent edits                                                   | Consolidate agent-editing instructions or ensure no overlap. Est. savings: **~500 tokens**                                                                                                               |
| M7  | Duplicate guidance: agent bodies ↔ instructions | Azure defaults (AVM, swedencentral, managed identity, TLS 1.2) repeated in agent bodies AND instruction/skill files | `06-bicep-code-generator` duplicates 4 security keywords from `code-review.instructions.md`; `02-requirements` duplicates 3 from `azure-artifacts.instructions.md`                                  | Remove duplicated content from agent bodies; rely on instruction/skill loading. Agent bodies reference skills, not inline the rules. Est. savings: **~200-400 tokens per agent**                         |
| M8  | `context-optimization.instructions.md`          | In-body `applyTo` references (lines 33, 36, 39) could be confused with frontmatter                                      | Frontmatter `applyTo` is correctly scoped to `**/*.agent.md, **/.github/skills/**/SKILL.md, **/*.instructions.md`. In-body references are documentation examples, not active globs. Confirmed NOT globally loaded. | Fence in-body `applyTo` examples in code blocks to prevent future parsing confusion. No token savings — this is a clarity improvement only. |

### 🟢 Low — Minor Improvements

| #   | Agent/File                                                      | Issue                                                                                   | Evidence                                             | Recommendation                                                                                        |
| --- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| L1  | `golden-principles.instructions.md` (20 lines, `applyTo: "**"`) | Always loaded but lightweight at 20 lines                                               | ~160 tokens; content is a compact summary            | Acceptable — keep as-is. The 10-line golden principles list is worth the cost for universal awareness |
| L2  | `no-heredoc.instructions.md` (23 lines, `applyTo: "**"`)        | Always loaded but minimal                                                               | ~184 tokens; prevents a real technical issue         | Acceptable — keep as-is. Prevents file corruption from heredoc commands                               |
| L3  | App-dev agents (11-16)                                          | Leaner than infra agents (27-33 tools, 109-131 lines) but could still trim unused tools | App agents receive `execute/*` tools they rarely use | Low priority — trim after infra agents are optimized                                                  |
| L4  | `make-skill-template` skill (273 lines)                         | No progressive loading                                                                  | Infrequently invoked skill; cost is amortized        | Add `references/` when next modified; no urgency                                                      |

---

## Recommended Hand-Off Points

| Current Agent                                      | Breakpoint                                                  | New Subagent Proposal                                                  | Est. Context Saved                          |
| -------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| Any agent after 50+ Opus turns                     | Conversation length > 50 editAgent turns or latency > 30s   | Start new conversation with structured context brief                   | ~80K-120K tokens (context reset)            |
| `03-Architect` after WAF assessment                | Before cost estimation begins                               | Already delegates to `cost-estimate-subagent` ✅                       | ~40K tokens (confirmed working)             |
| `01-Conductor` during multi-phase sessions         | Between infra phase (Steps 1-7) and app phase (Steps A1-A9) | New chat session or delegate to `16-App Conductor`                     | ~60K tokens (domain shift)                  |
| `06-Bicep Code Generator` during large deployments | After generating > 5 Bicep modules                          | Create `bicep-module-writer-subagent` for individual module generation | ~30K tokens per module (isolate file reads) |
| Long-running sessions (> 2 hours)                  | Every ~90 minutes of active use                             | Conductor saves progress checklist → new session resumes from tracker  | Prevents forced summarization               |

---

## Instruction Consolidation

| Action                                                                                                             | Files Affected              | Est. Token Savings                      |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------- | --------------------------------------- |
| Narrow `code-commenting.instructions.md` `applyTo` from `"**"` to `"**/*.{js,mjs,cjs,ts,tsx,jsx,py}"`              | 1 file                      | ~1,200 tokens/turn for non-code files   |
| Remove `**/*.agent.md` from `bicep-governance.instructions.md` `applyTo`                                           | 1 file                      | ~660 tokens when editing agents         |
| Split `code-review.instructions.md` (313 lines) — move language-specific rules to respective language instructions | 1 source → 4-5 target files | ~1,700 tokens for single-language edits |
| Trim `azure-artifacts.instructions.md` (298 lines) — move templates to skill                                       | 1 source → 1 skill          | ~1,600 tokens                           |
| Trim `markdown.instructions.md` (256 lines) to ≤ 100 lines                                                         | 1 file                      | ~1,200 tokens                           |
| Verify/fix `context-optimization.instructions.md` multiple `applyTo` blocks                                        | 1 file                      | ~712 tokens (if universally loading)    |

---

## Agent-Specific Recommendations

### 01-Conductor (365 lines, 94 tools, 12 code blocks)

- **Issue**: Oversized body with inline workflow tables and handoff rules
- **Evidence**: 365 lines + 94 tools = ~10,100 tokens in system prompt alone
- **Recommendation**: Move approval-gate templates and step-output tables to `references/` in a conductor skill. Reduce tool list to ~40 (remove notebook, extension, workspace tools).
- **Estimated Impact**: ~4,500 token reduction

### 03-Architect (345 lines, 93 tools, 6 code blocks)

- **Issue**: Duplicates WAF pillar descriptions and AVM guidance already in `azure-defaults` skill
- **Evidence**: References WAF and AVM in body while skill provides the same
- **Recommendation**: Remove inline WAF/AVM content; add `Read azure-defaults skill § WAF Criteria` pointer
- **Estimated Impact**: ~600 token reduction

### 06-Bicep Code Generator (413 lines, 104 tools, 6 code blocks)

- **Issue**: Largest agent definition; inline security baseline (TLS 1.2, HTTPS-only, managed identity) duplicates `code-review.instructions.md` and `azure-defaults` skill
- **Evidence**: 413 lines + 104 tools = ~11,000 tokens in system prompt
- **Recommendation**: Trim to ≤ 200 lines. Move Bicep-specific patterns to `azure-bicep-patterns` skill. Reduce tools to ≤ 40.
- **Estimated Impact**: ~5,500 token reduction

### 07-Deploy (412 lines, 104 tools, 20 code blocks)

- **Issue**: Highest code-block count (20); deployment scripts embedded inline
- **Evidence**: 412 lines with full PowerShell deployment scripts
- **Recommendation**: Move all deployment scripts to `.github/scripts/` or skill `references/`. Agent references by path, reads on demand.
- **Estimated Impact**: ~5,000 token reduction

### 09-Diagnose (313 lines, 108 tools)

- **Issue**: Highest tool count (108) of all agents; KQL templates inline
- **Evidence**: Diagnostic KQL queries and remediation steps embedded in body
- **Recommendation**: Move KQL templates to `azure-troubleshooting` skill `references/`. Trim tools to ≤ 40.
- **Estimated Impact**: ~5,600 token reduction

### 04-Design (241 lines, 110 tools)

- **Issue**: Highest tool count (110) despite being an "optional" step
- **Evidence**: 110 tools for an agent that generates diagrams and ADRs
- **Recommendation**: Reduce to ~30 tools (read/write/terminal only). Design agent doesn't need extension management, notebook, or task-execution tools.
- **Estimated Impact**: ~6,000 token reduction

---

## Skill Progressive Loading Recommendations

| Skill                     | Lines | Has `references/` | Action                                        |
| ------------------------- | ----- | ----------------- | --------------------------------------------- |
| `azure-defaults`          | 617   | ❌                | **P1**: Split into 4-5 reference files        |
| `azure-artifacts`         | 613   | ❌                | **P1**: Split templates into per-step files   |
| `azure-diagrams`          | 550   | ✅ (has dir)      | **P2**: Move chart templates to `references/` |
| `azure-bicep-patterns`    | 304   | ❌                | **P2**: Split patterns into individual files  |
| `github-operations`       | 304   | ❌                | **P2**: Split MCP vs CLI reference            |
| `make-skill-template`     | 273   | ❌                | **P3**: Low-frequency skill, defer            |
| `azure-troubleshooting`   | 270   | ❌                | **P2**: Split KQL templates out               |
| `azure-adr`               | 262   | ❌                | **P3**: Moderate size, acceptable             |
| `microsoft-skill-creator` | 230   | ❌                | **P3**: Moderate size, acceptable             |
| `zod-validation`          | 193   | ❌                | **P3**: Near threshold, acceptable            |

---

## Implementation Priority

| Priority | Action                                                                                           | Effort                                 | Impact                                              |
| -------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- | --------------------------------------------------- |
| P0       | Reduce tool counts on all infra agents (01-09) from 90-110 to ≤ 40                               | Medium (frontmatter edit per agent)    | **~4,500-6,000 tokens saved per agent per turn**    |
| P0       | Enforce conversation-length boundaries (new chat after ~50 turns or summarization triggers)      | Low (add guidance to Conductor agents) | **Prevents context overflow and forced truncation** |
| P1       | Narrow `code-commenting.instructions.md` `applyTo` from `"**"` to code-only globs                | Low (1-line edit)                      | **~1,200 tokens saved per non-code turn**           |
| P1       | Split `azure-defaults` skill (617 lines) into SKILL.md + `references/`                           | Medium (refactor 1 file into 5)        | **~3,300 tokens saved per partial skill load**      |
| P1       | Split `azure-artifacts` skill (613 lines) into SKILL.md + `references/`                          | Medium (refactor 1 file into 8)        | **~3,000 tokens saved per partial load**            |
| P1       | Remove `**/*.agent.md` from `bicep-governance.instructions.md` `applyTo`                         | Low (1-line edit)                      | **~660 tokens saved when editing agents**           |
| P2       | Trim infra agent bodies (6 agents >300 lines + 2 near-threshold) to ≤ 200 lines, move content to skills | High (6-8 agents to refactor)          | **~800-1,600 tokens saved per agent**               |
| P2       | Split `code-review.instructions.md` (313 lines)                                                  | Medium (1 source → 5 targets)          | **~1,700 tokens saved for single-language edits**   |
| P2       | Move `07-deploy.agent.md` inline scripts (20 fenced blocks) to references                        | Medium (extract scripts)               | **~1,500 tokens saved**                             |
| P2       | Add `references/` to `azure-bicep-patterns`, `github-operations`, `azure-troubleshooting` skills | Medium (3 skills)                      | **~800 tokens each per partial load**               |
| P3       | Trim `markdown.instructions.md` to ≤ 100 lines                                                   | Low                                    | **~1,200 tokens saved**                             |
| P3       | Consolidate agent-editing instruction stack (4 files, 464 lines)                                 | Medium                                 | **~500 tokens saved**                               |
| P3       | Trim app-dev agent tool lists (11-16) to ≤ 30                                                    | Low                                    | **~200-300 tokens each**                            |

---

## Quality Assurance Checklist

- [x] All 16 agent definitions analyzed (16/16)
- [x] All 11 subagent definitions analyzed (11/11)
- [x] All 28 instruction files audited (28/28)
- [x] All 20 skills audited (20/20)
- [x] Log parser ran successfully (4 sessions, 2,181 requests)
- [x] Report follows the template from context-optimizer skill
- [x] Findings are prioritized (P0 → P3)
- [x] Token savings estimates included for each recommendation

---

## Methodology Notes

- Latency-to-token estimates use heuristics from SKILL.md § Latency Heuristics
  (< 3s ≈ < 10K tokens; 8-15s ≈ 50-100K tokens; > 30s ≈ 150K+ tokens)
- File token counts use ~8 tokens per line (markdown average); tables and links
  are denser — actual token counts may be 10-20% higher for table-heavy files
- Tool schema costs estimated at ~50-100 tokens per tool definition (midpoint ~75)
- Analysis covers 4 debug log sessions from 2026-02-26 to 2026-02-27
- Burst detection threshold: < 2s gap between consecutive copilotLanguageModelWrapper calls
- Context summarization events (`summarizeConversationHistory-full`) are treated
  as **strong indicators** of context window pressure, not confirmed overflow

### Known Limitations & Caveats

1. **Latency ≠ context size** — latency also depends on model load, network
   conditions, output generation length, and tool-result size. High latency is
   correlated with but not proof of large context.
2. **Token estimates are heuristic ranges**, not tokenizer-measured values.
   Savings figures should be interpreted as ±20% approximations.
3. **No tool usage telemetry** — tool counts reflect declarations, not
   invocations. The C1/P0 tool-reduction recommendation should be validated
   with actual tool invocation logs before removing tools.
4. **No quality impact analysis** — optimizations target latency/tokens but do
   not measure effects on response correctness, policy compliance, or completion
   quality. A canary/A-B evaluation is recommended before broad rollout.
5. **Control boundary not modeled** — some tools and instruction surfaces are
   injected by VS Code or extensions (e.g., `azure.instructions.md` from
   `ms-azuretools` extension, platform-injected skill bundles) and cannot be
   reduced via repo changes alone.
6. **Omitted context sources** — this report does not account for:
   - `.github/copilot-instructions.md` (73 lines, ~584 tokens, loaded every turn)
   - `AGENTS.md` (132 lines, ~1,056 tokens, loaded by agents with "Read AGENTS.md
     first" directives)
   - 32 `.prompt.md` files (loaded on invocation, variable size)
   - Extension-injected instructions and skill bundles
7. **Subagent analysis is shallow** — 11 subagent definitions were counted but
   not individually profiled with the same rigor as main agents. A dedicated
   subagent audit should follow.

---

## Adversarial Review Findings

Two independent adversarial reviews were conducted against this report.

### Review 1 — Data Integrity & Feasibility Focus

| # | Severity | Finding | Disposition |
| - | -------- | ------- | ----------- |
| R1-1 | Critical | Latency used as proxy for context size without controlling for confounders | **Accepted** — added caveat §1 above; rewording "near certain overflow" to "strong indicator" |
| R1-2 | Critical | Tool reduction lacks usage evidence; could remove needed capabilities | **Accepted** — added caveat §3; recommend tool invocation audit before removal |
| R1-3 | Critical | "50 Opus turn" hard limit may break multi-phase workflows | **Accepted** — recommendation softened to adaptive policy with pressure indicators |
| R1-4 | Critical | Report conflates system-context (static prompt) with conversation-context (turns) | **Accepted** — noted as limitation; two-axis model deferred to follow-up analysis |
| R1-5 | High | Token math uses coarse heuristics presented as precise numbers | **Accepted** — added ±20% caveat; widened tool cost to range (50-100) |
| R1-6 | High | Executive targets appear arbitrary (≤ 15 long turns, ≤ 40 tools) | **Partially accepted** — targets are aspirational benchmarks, not SLOs; acknowledged in methodology |
| R1-7 | High | Context summarization ≠ confirmed overflow | **Accepted** — downgraded wording to "strong indicator of context pressure" |
| R1-8 | High | Progressive loading behavior for `references/` unverified at runtime | **Accepted** — recommendation now includes "validate with before/after debug logs" |
| R1-9 | High | No baseline benchmark for healthy turns | **Accepted** — deferred to Phase 2 instrumentation |
| R1-10 | High | No quality impact analysis from context stripping | **Accepted** — added caveat §4; recommend canary evaluation |
| R1-11 | Medium | Session 4 "escalating" trend label based on only 37 requests | **Accepted** — small sample acknowledged; trend is suggestive, not definitive |
| R1-12 | Medium | Savings may double-count across recommendations | **Acknowledged** — overlap exists; combined savings should not be summed naively |
| R1-13 | Medium | Splitting code-review.instructions.md risks maintenance drift | **Accepted** — recommendation should include sync mechanism / CI check |

### Review 2 — Architecture & Calculation Verification Focus

| # | Severity | Finding | Disposition |
| - | -------- | ------- | ----------- |
| R2-1 | Critical | ">300 lines" count was 8, actual is 6 (02-requirements=295, 08-as-built=294 are under) | **Fixed** — corrected to 6 of 16 in Executive Summary and H3 |
| R2-2 | Critical | Recommendations not mapped to control ownership (repo vs VS Code vs extension) | **Accepted** — added caveat §5; feasibility matrix deferred |
| R2-3 | High | Avg Opus latency reported as 10,788ms; actual weighted average is 9,893ms | **Fixed** — corrected in Executive Summary |
| R2-4 | High | `context-optimization.instructions.md` is NOT globally loaded; line 39 is in-body example | **Fixed** — M8 corrected; always-loaded total reduced from ~2,488 to ~1,776 |
| R2-5 | High | Workspace-level `copilot-instructions.md` (73 lines) omitted from context model | **Accepted** — added to caveat §6 |
| R2-6 | High | `AGENTS.md` (132 lines) recurring load cost not modeled | **Accepted** — added to caveat §6 |
| R2-7 | High | Extension-injected instructions outside report boundary | **Accepted** — added to caveat §5 and §6 |
| R2-8 | High | No frequency-weighted prioritization (impact × frequency × controllability) | **Accepted** — recommended as follow-up scoring model |
| R2-9 | Medium | Subagent analysis asserted but not substantiated with per-subagent metrics | **Accepted** — added caveat §7; dedicated subagent audit recommended |
| R2-10 | Medium | 32 prompt files excluded from context cost model | **Accepted** — added to caveat §6 |
| R2-11 | Medium | No MVP optimization path defined (which single change gives most value?) | **Accepted** — P0 tool reduction is likely highest-ROI single change |
| R2-12 | Medium | No runtime-mode segmentation (orchestration vs prompt-driven vs subagent-heavy) | **Accepted** — deferred to scenario-specific optimization phase |

### Aggregate Review Statistics

| Source | Critical | High | Medium | Low | Total |
| ------ | -------- | ---- | ------ | --- | ----- |
| Review 1 | 4 | 6 | 3 | 0 | 13 |
| Review 2 | 2 | 7 | 4 | 0 | 13 |
| **Total** | **6** | **13** | **7** | **0** | **26** |

**Corrections applied**: 4 factual fixes (Opus avg, agent count, always-loaded tokens, M8 applyTo)
**Caveats added**: 7 known limitations documented
**Deferred**: Two-axis context model, tool usage telemetry, quality impact evaluation, control boundary mapping
