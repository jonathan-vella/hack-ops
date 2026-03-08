---
description: "Resume the code review from where you left off — loads tracker state and continues the next incomplete step"
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "edit/createDirectory",
    "search/textSearch",
    "search/fileSearch",
    "execute/runInTerminal",
    "execute/runTests",
    "mcp/context7",
  ]
---

# Resume Code Review Session

## Mission

Load the current code review execution state, identify the
next incomplete step, load only the context needed for that
step, and continue execution.

## Workflow

### Step 1 — Load session state

Read `docs/exec-plans/active/code-review-execution.md` completely.
This is the single source of truth for what has been done and
what remains.

Identify:

- The current phase (R1 through R10)
- The specific next unchecked item
- Any blockers noted in the session log
- The active branch

### Step 2 — Load phase-specific context

Based on the current phase, read ONLY the context files listed
in the "Key Files" table of the execution tracker. Do NOT load
the full blueprint — read only what the active phase needs.

Context loading budget:

| Phase | Max files to read                                                                  |
| ----- | ---------------------------------------------------------------------------------- |
| R1    | 3 (tracker + `package.json` + `lib/schema.sql`)                                    |
| R2    | 4 (tracker + `src/lib/` manifest + `src/lib/validation/` manifest + review prompt) |
| R3    | 4 (tracker + `hackops-domain` skill + `api-contract.md` + R1 helpers)              |
| R4    | 4 (tracker + `hackops-domain` skill + R3 test files + review prompt)               |
| R5    | 4 (tracker + `hackops-domain` skill + R3 test files + review prompt)               |
| R6    | 4 (tracker + `security-checklist.md` + `api-contract.md` + review prompt)          |
| R7    | 3 (tracker + `src/components/` manifest + review prompt)                           |
| R8    | 5 (tracker + 2 subagent defs + `api-contract.md` + `hackops-domain` skill)         |
| R9    | 5 (tracker + 2 subagent defs + `api-contract.md` + `hackops-domain` skill)         |
| R10   | 5 (tracker + R2 findings + R8 findings + R9 findings + coverage report)            |

### Step 3 — Verify branch state

Check the current Git branch is `feature/code-review`.

If on the wrong branch:

- `git checkout feature/code-review` (if exists)
- `git checkout -b feature/code-review` (if first session)

### Step 4 — Load the phase prompt

Read the corresponding prompt file for the active phase:

| Phase | Prompt file                              |
| ----- | ---------------------------------------- |
| R1    | `review-01-foundation.prompt.md`         |
| R2    | `review-02-context7-audit.prompt.md`     |
| R3    | `review-03-e2e-admin.prompt.md`          |
| R4    | `review-04-e2e-coach.prompt.md`          |
| R5    | `review-05-e2e-hacker.prompt.md`         |
| R6    | `review-06-e2e-crosscutting.prompt.md`   |
| R7    | `review-07-component-tests.prompt.md`    |
| R8    | `review-08-adversarial-sonnet.prompt.md` |
| R9    | `review-09-adversarial-gpt.prompt.md`    |
| R10   | `review-10-report.prompt.md`             |

Follow the prompt's workflow starting from the specific
unchecked step within that phase.

### Step 5 — Execute the next step

Perform the work for the next unchecked item. Follow the
phase prompt's specifications exactly.

After completing each item:

1. Check off the item in the execution tracker
2. If the item produces a file, verify it exists
3. If a gate command is specified, run it

### Step 6 — Update session state (MANDATORY before ending)

Before the session ends, update the execution tracker:

1. Check off all completed items
2. Update the "Current Session Target" section with next step
3. Append a row to the "Session Log" table
4. Record any decisions in the "Decisions Made" table
5. Note any blockers discovered

## Output Expectations

- Execution tracker is always up-to-date when the session ends
- Each session makes measurable forward progress (at least
  one checkbox completed)
- Context loading is minimal — only what's needed for the
  current step

## Quality Assurance

- [ ] Execution tracker was read before any work began
- [ ] Only phase-relevant context was loaded
- [ ] Correct branch is checked out
- [ ] All completed items are checked off in the tracker
- [ ] Session log has a new entry for this session
- [ ] No work was done outside the current phase's scope
