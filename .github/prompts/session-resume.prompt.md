---
description: Resume a HackOps execution session. Loads progress state, identifies next step, and continues work from where the last session left off.
agent: "agent"
tools:
  - search/changes
  - search/codebase
  - edit/editFiles
  - web/fetch
  - web/githubRepo
  - read/problems
  - read/readFile
  - execute/getTerminalOutput
  - execute/runInTerminal
  - read/terminalLastCommand
  - read/terminalSelection
  - azure-mcp/search
  - search/usages
  - todo
---

# Resume HackOps Execution Session

## Mission

Load the current execution state from the session tracker,
identify the next incomplete step, load only the context
needed for that step, and continue execution.

## Workflow

### Step 1 — Load session state

Read `docs/exec-plans/active/hackops-execution.md` completely.
This is the single source of truth for what has been done and
what remains.

Identify:

- The current phase (A through F)
- The specific next unchecked item
- Any blockers noted in the session log
- The active branch

### Step 2 — Load phase-specific context

Based on the current phase, read ONLY the context files listed
in the "Key Files" section of the session tracker. Do NOT load
the entire blueprint — read only the section for the active
phase.

Context loading budget (minimize token usage):

| Phase            | Max files to read                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------- |
| B0 (bootstrap)   | 2 (tracker + blueprint §B0)                                                                 |
| A (product docs) | 3 (tracker + blueprint §A + plan-hackOps.prompt.md)                                         |
| B (backlog)      | 4 (tracker + blueprint §B + PRD + API contract)                                             |
| C (toolchain)    | 4 (tracker + blueprint §C + agent-definitions instructions + skills instructions)           |
| D (infra)        | 3 (tracker + blueprint §D + azure-defaults skill)                                           |
| E (app build)    | 5 (tracker + blueprint §E + relevant Phase A docs + hackops-domain skill + api-contract.ts) |
| F (supporting)   | 3 (tracker + blueprint §F + AGENTS.md)                                                      |

### Step 3 — Verify branch state

Check the current Git branch matches the expected branch for
the active phase:

- Phase A: `feature/product-docs`
- Phase C: `feature/app-dev-toolchain`
- Phases B/D/E: `feature/prompts`
- Phase F: `main` (via PR)

If on the wrong branch, switch or create it before proceeding.

### Step 4 — Execute the next step

Perform the work for the next unchecked item in the session
tracker. Follow the blueprint's specifications for that item
exactly.

After completing each item:

1. Check off the item in the session tracker
2. If the item produces a file, verify it exists
3. If a validation command is specified, run it

### Step 5 — Update session state (MANDATORY before ending)

Before the session ends, update the session tracker:

1. Check off all completed items
2. Update the "Current Session Target" section with next step
3. Append a row to the "Session Log" table
4. Record any decisions made in the "Decisions Made" table
5. Note any blockers discovered

## Output Expectations

- Session tracker is always up-to-date when the session ends
- Each session makes measurable forward progress (at least
  one checkbox completed)
- Context loading is minimal — only what's needed for the
  current step

## Quality Assurance

- [ ] Session tracker was read before any work began
- [ ] Only phase-relevant context was loaded
- [ ] Correct branch is checked out
- [ ] All completed items are checked off in the tracker
- [ ] Session log has a new entry for this session
- [ ] No work was done outside the current phase's scope
