---
description: >-
  Resume a context optimization session. Loads progress state from the
  execution tracker, identifies the next incomplete step, loads only the
  context needed for that stream, and continues execution.
  Generic — works for any project with a populated tracker.
agent: "agent"
model: Claude Opus 4.6
tools:
  - search/changes
  - search/codebase
  - edit/editFiles
  - read/problems
  - read/readFile
  - execute/getTerminalOutput
  - execute/runInTerminal
  - read/terminalLastCommand
  - search/usages
  - search/textSearch
  - search/fileSearch
  - search/listDirectory
  - todo
---

# Resume Context Optimization Session

## Mission

Load the current execution state from the context optimization
tracker, identify the next incomplete step, load only the
context needed for that stream, and continue execution.

## Key Files

- **Tracker**: `docs/exec-plans/active/context-optimization-execution.md`
- **Blueprint**: the plan file referenced in the tracker's header

## Workflow

### Step 1 — Load session state

Read the tracker file completely. This is the single source of
truth for what has been done and what remains.

Identify:

- The current stream (number and name)
- The specific next unchecked item (e.g., S1.3, S3.2)
- Any blockers noted in the session log
- The active branch

### Step 2 — Load stream-specific context

Based on the current stream, read ONLY the files listed in the
tracker's "Key Files" section for that stream. Do NOT load the
full blueprint — read only the section for the active stream.

Budget: maximum 3-4 files per stream. Stop loading when you
have enough context to execute the next step.

### Step 3 — Verify branch state

Check the current Git branch matches the one in the tracker
(typically `feature/context-optimization`). Create it from
`main` if it doesn't exist.

```bash
git branch --show-current
```

### Step 4 — Execute the next step

Perform the work for the next unchecked item in the tracker.
Follow the plan's specifications for that step exactly.

**Stream-type execution rules**:

- **Wildcard replacement**: Edit agents in batches. Verify
  YAML syntax with `npm run lint:agent-frontmatter` after.
- **Instruction optimization**: Edit one file at a time. Run
  `npm run lint:instruction-frontmatter` after each.
- **Skill splits**: For each skill: (a) read the full
  SKILL.md, (b) create all `references/` files, (c) trim
  SKILL.md to ≤ 200 lines with pointers, (d) verify with
  `npm run lint:skills-format`. One skill per step.
- **Agent body trimming**: For each agent: (a) read the full
  body, (b) identify extractable content, (c) move to skill
  `references/`, (d) replace with `Read {skill} § {section}`
  pointers, (e) verify line count.
- **Dedup removal**: Execute alongside or after body trimming.
  Verify no content is lost that served a unique purpose.

After completing each item:

1. Check off the item in the tracker
2. If the item produces a file, verify it exists
3. Run the stream's validation command

### Step 5 — Validate after stream completion

When all items in a stream are checked off, run:

```bash
npm run validate
npm run lint:md
```

### Step 6 — Handle Review Gates

When reaching a Review Gate:

1. Run `npm run validate` (full suite)
2. Run `npm run lint:md`
3. Run `git diff main --stat` to show all changes
4. Present the diff summary to the user for review
5. Wait for human approval before proceeding

### Step 7 — Update tracker (MANDATORY before ending)

Before the session ends, update the tracker:

1. Check off all completed items
2. Update "Current Session Target" with the next step
3. Append a row to the "Session Log" table
4. Record any decisions in the "Decisions Made" table
5. Note any blockers discovered

## Output Expectations

- Tracker is always up-to-date when the session ends
- Each session completes at least one full stream
- Context loading is minimal — only current stream
- Validation passes after every stream

## Quality Assurance

- [ ] Tracker was read before any work began
- [ ] Only stream-relevant context was loaded
- [ ] Correct branch is checked out
- [ ] All completed items are checked off
- [ ] Session log has a new entry
- [ ] No work outside the current stream's scope
- [ ] `npm run validate` passes before session end
