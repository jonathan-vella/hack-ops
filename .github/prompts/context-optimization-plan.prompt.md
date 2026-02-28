---
description: Build an execution plan from a context optimization report. Groups findings into streams, sizes them for single-session execution, generates a tracker and resume prompt. Stage 2 of the audit → plan → execute pipeline.  execution, generates a tracker and resume prompt.
agent: "agent"
model: Claude Opus 4.6
tools:
  - search/codebase
  - search/fileSearch
  - search/listDirectory
  - search/textSearch
  - read/readFile
  - read/problems
  - edit/createFile
  - edit/editFiles
  - execute/runInTerminal
  - execute/getTerminalOutput
  - read/terminalLastCommand
  - todo
  - vscode/askQuestions
---

# Build Context Optimization Execution Plan

## Mission

Read the context optimization report, group findings into
execution streams, size each stream to fit one context window
session, and produce two output files: a populated execution
tracker and a tailored resume prompt. This is Stage 2 of the
three-stage pipeline (audit → **plan** → execute).

## Prerequisites

The optimization report must already exist. It is typically
produced by the `/context-optimize` prompt (Stage 1) and saved
to `agent-output/{project}/10-context-optimization-report.md`.

## Inputs

| Input                  | Location                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| Optimization report    | `agent-output/{project}/10-context-optimization-report.md`        |
| Tracker template       | `.github/skills/context-optimizer/templates/execution-tracker.md` |
| Resume prompt template | `.github/skills/context-optimizer/templates/resume-prompt.md`     |
| Agent roster           | `AGENTS.md`                                                       |

## Workflow

### Phase 1 — Locate and Load Report

1. Find the optimization report. Check `agent-output/` subdirectories for
   `10-context-optimization-report.md`. If multiple projects exist, ask
   which one to plan for.
2. Read the report fully — especially the **Findings**, **Implementation
   Priority**, and **Agent-Specific Recommendations** sections.
3. Read `AGENTS.md` for the agent roster (needed for stream grouping).

### Phase 2 — Classify Findings into Streams

Group the report's findings into coherent execution streams. Each stream
should be completable within a single context window session (~60 edits
max, ideally 15-30).

**Recommended stream categories** (adapt to the actual report):

| Category                  | Typical Findings                                              |
| ------------------------- | ------------------------------------------------------------- |
| MCP/Tool optimization     | Tool list wildcards, removing unused tools                    |
| Instruction file tuning   | Narrowing `applyTo` globs, splitting large files              |
| Skill progressive loading | Moving inline content to `references/`, adding pointers       |
| Agent body trimming       | Extracting templates/scripts from agent bodies                |
| Conductor boundaries      | Adding conversation resets, section-based loading             |
| Deduplication             | Removing content duplicated across agents/skills/instructions |

Each stream should:

- Target a single category of changes
- Affect a bounded set of files
- Have a clear validation command
- Be executable independently of other streams (unless noted)

### Phase 3 — Size Streams for Sessions

For each stream, estimate the number of file edits and context required.

**Sizing heuristics:**

- Reading a file: ~1 token per 4 characters
- Each agent definition: ~500-2000 tokens
- Batch edits to similar files are fast (e.g., all agents' tool sections)
- Skill restructuring is slower (read → create references → trim → validate)

If a stream exceeds ~60 edits, split it into sub-streams (e.g., S3a, S3b).

### Phase 4 — Present Plan to User

Display the proposed streams in a summary table:

```text
| Stream | Name        | Files | Edits | Depends on | Gate |
|--------|-------------|-------|-------|------------|------|
| S1     | ...         | ...   | ...   | None       | No   |
| S2     | ...         | ...   | ...   | None       | No   |
| RG1    | Review Gate | —     | —     | S1, S2     | Yes  |
| ...    | ...         | ...   | ...   | ...        | ...  |
```

Ask the user:

1. **Include/exclude**: Any streams to skip or defer?
2. **Ordering**: Proposed order acceptable?
3. **Review gates**: Where should mandatory review checkpoints go?
4. **Branch strategy**: Single branch or per-stream branches?

Wait for confirmation before proceeding.

### Phase 5 — Generate Execution Tracker

Read the tracker template from
`.github/skills/context-optimizer/templates/execution-tracker.md`.

Fill in all `{placeholder}` values:

- `{project}` — from the report's project name
- `{date}` — today's date
- `{stream_number}`, `{stream_name}`, `{step_id}`, `{step_description}` — from Phase 2
- Blueprint reference — point to the plan prompt or a generated plan file
- Source report — path to the optimization report

For each stream, generate:

- A concrete step list as checkboxes (`- [ ] S1.1: description`)
- A validation step at the end (`- [ ] S1.V: npm run validate`)
- Review gates between stream groups
- Final verification section

Populate the session-to-stream mapping table with estimated session
allocations.

Populate the "Key Files" table with the specific files each stream
needs to read.

Save the tracker to:
`docs/exec-plans/active/context-optimization-execution.md`

### Phase 6 — Generate Resume Prompt

Read the resume prompt template from
`.github/skills/context-optimizer/templates/resume-prompt.md`.

Customize it for this specific project:

- Update the tracker path in "Key Files"
- If the project has specific validation commands beyond `npm run validate`,
  add them to the validation steps
- Adjust stream-type execution rules based on the actual streams generated

Save the resume prompt to:
`.github/prompts/context-optimization-resume.prompt.md`

### Phase 7 — Validate Outputs

Run validation to ensure generated files are well-formed:

```bash
npm run lint:md 2>&1 | head -30
```

Verify:

- [ ] Tracker has all streams with checkboxes
- [ ] Tracker session-to-stream table is populated
- [ ] Tracker key-files table has entries for each stream
- [ ] Resume prompt references the correct tracker path
- [ ] Both files render as valid Markdown

## Output Files

| File                                                       | Purpose                                         |
| ---------------------------------------------------------- | ----------------------------------------------- |
| `docs/exec-plans/active/context-optimization-execution.md` | Session tracker with checkboxes for all steps   |
| `.github/prompts/context-optimization-resume.prompt.md`    | Resume prompt tailored to this optimization run |

## Quality Assurance

- [ ] All P0 and P1 findings from the report are included in streams
- [ ] Each stream fits within one context window session
- [ ] Review gates are placed after high-risk streams
- [ ] Tracker references the correct report path
- [ ] User approved the stream plan before files were generated
- [ ] Generated files pass `npm run lint:md`
