---
description: Resume a context optimization session. Loads progress state from the execution tracker, identifies the next incomplete step, loads only the context needed for that stream, and continues execution.
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
- **Blueprint**: `.github/prompts/plan-applyContextOptimizationReport.prompt.md`
- **Wildcard exemplar**: `.github/agents/_subagents/bicep-lint-subagent.agent.md`

## Workflow

### Step 1 — Load session state

Read `docs/exec-plans/active/context-optimization-execution.md`
completely. This is the single source of truth for what has
been done and what remains.

Identify:

- The current stream (1 through 6, or Review Gate 1/2)
- The specific next unchecked item (e.g., S1.3, S3.2)
- Any blockers noted in the session log
- The active branch

### Step 2 — Load stream-specific context

Based on the current stream, read ONLY the files listed in the
tracker's "Key Files" section for that stream. Do NOT load the
entire blueprint — read only the relevant stream section.

Context loading budget (minimize token usage):

| Stream             | Max files to read                                           |
| ------------------ | ----------------------------------------------------------- |
| 1 (wildcards)      | 3 (tracker + 1 agent sample + bicep-lint-subagent exemplar) |
| 2 (instructions)   | 3 (tracker + blueprint §S2 + target instruction file)       |
| 3 (skills)         | 3 (tracker + blueprint §S3 + target SKILL.md)               |
| 4 (agent trimming) | 4 (tracker + blueprint §S4 + target agent + target skill)   |
| 5 (conductors)     | 3 (tracker + 01-conductor + 16-app-conductor)               |
| 6 (dedup)          | 4 (tracker + target agents + shared skill/instruction)      |
| Review Gate 1      | 2 (tracker + `git diff` output)                             |
| Review Gate 2      | 2 (tracker + `git diff` output)                             |

### Step 3 — Verify branch state

Check the current Git branch is `feature/context-optimization`.
If it doesn't exist yet, create it from `main`.

```bash
git branch --show-current
# If not on feature/context-optimization:
git checkout -b feature/context-optimization main
```

### Step 4 — Execute the next step

Perform the work for the next unchecked item in the tracker.
Follow the blueprint's specifications for that step exactly.

**Stream-specific execution rules**:

- **Stream 1** (wildcards): Edit one agent at a time. After
  each agent, verify YAML syntax with `npm run lint:agent-frontmatter`.
  Batch agents if confident — all 9 follow the same pattern.
- **Stream 2** (instructions): Edit one file at a time. Run
  `npm run lint:instruction-frontmatter` after each.
- **Stream 3** (skill splits): For each skill: (a) read the
  full SKILL.md, (b) create all `references/` files, (c) trim
  SKILL.md to ≤ 200 lines with pointers, (d) verify with
  `npm run lint:skills-format`. Do one skill per step.
- **Stream 4** (agent trimming): For each agent: (a) read the
  full agent body, (b) identify extractable content, (c) move
  to target skill `references/`, (d) replace inline content
  with `Read {skill} § {section}` pointers, (e) verify ≤ 200
  body lines.
- **Stream 5** (conductors): Add `## Conversation Health`
  section to both conductors. Short — can do both in one step.
- **Stream 6** (dedup): Overlaps with Stream 4. Execute
  alongside or after body trimming.

After completing each item:

1. Check off the item in the tracker
2. If the item produces a file, verify it exists
3. Run the stream's validation command

### Step 5 — Validate after each stream completion

When all items in a stream are checked off, run the stream's
validation step (the `S{n}.V` item):

```bash
npm run validate
npm run lint:md
```

### Step 6 — Handle Review Gates

When reaching a Review Gate:

1. Run `npm run validate` (full suite)
2. Run `npm run lint:md`
3. Run `npm run lint:artifact-templates`
4. Run `git diff main --stat` to show all changes
5. Present the diff summary to the user for review
6. Wait for human approval before proceeding

### Step 7 — Update session state (MANDATORY before ending)

Before the session ends, update the tracker:

1. Check off all completed items
2. Update the "Current Session Target" section with next step
3. Append a row to the "Session Log" table
4. Record any decisions made in the "Decisions Made" table
5. Note any blockers discovered

## Output Expectations

- Tracker is always up-to-date when the session ends
- Each session completes at least one full stream (or one
  skill split if Stream 3)
- Context loading is minimal — only what's needed for the
  current stream
- Validation passes after every stream

## Quality Assurance

- [ ] Tracker was read before any work began
- [ ] Only stream-relevant context was loaded
- [ ] Correct branch is checked out
- [ ] All completed items are checked off in the tracker
- [ ] Session log has a new entry for this session
- [ ] No work was done outside the current stream's scope
- [ ] `npm run validate` passes before session end
