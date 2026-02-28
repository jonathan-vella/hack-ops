# Exec Plan: Context Optimization — {project}

> Living session state tracker. Updated at the END of every session.
> Read this file FIRST at the start of any new session.

**Status**: Active
**Owner**: Human + Copilot agents
**Created**: {date}
**Blueprint**: `.github/prompts/plan-context-optimization.prompt.md`
**Source report**: `agent-output/{project}/10-context-optimization-report.md`

---

## Current Session Target

<!-- Update this at the START of each session -->

**Stream**: {stream_number} — {stream_name}
**Step**: {step_id} — {step_description}
**Branch**: `feature/context-optimization`
**Goal**: {session_goal}

---

## Stream Progress

<!-- Plan-builder populates this section from report findings.   -->
<!-- Each stream groups related changes; each step is one edit.  -->
<!-- Check off items as they are completed during execution.     -->

### Stream 1 — {stream_1_name}

**Scope**: {files_affected}
**Branch**: `feature/context-optimization`

- [ ] S1.1: {step_description}
- [ ] S1.V: Run `npm run validate` — validators pass

<!-- Repeat for each stream... -->

### ── REVIEW GATE ── (After Streams {n})

- [ ] RG.1: Structural integrity review (files exist, pointers resolve)
- [ ] RG.2: Semantic preservation review (agents still function correctly)
- [ ] RG.3: `npm run validate` — full suite passes
- [ ] RG.4: `npm run lint:md` — all modified files pass
- [ ] RG.5: Human approval to proceed

### Final Verification

- [ ] FV.1: `npm run validate` — all validators pass (clean run)
- [ ] FV.2: `npm run lint:md` — zero warnings
- [ ] FV.3: Commit + PR to main

---

## Session-to-Stream Mapping

<!-- Streams are sized to fit within a single context window.   -->
<!-- Adjust based on actual context consumption.                 -->

| Session | Streams | Est. edits | Key risk |
| ------- | ------- | ---------- | -------- |
|         |         |            |          |

---

## Session Log

<!-- Append one entry per session. Keep entries concise. -->

| #   | Date | Stream/Step | What was done | What's next | Blockers |
| --- | ---- | ----------- | ------------- | ----------- | -------- |
|     |      |             |               |             |          |

---

## Key Files (context loading reference)

### Always read (every session)

1. **This file** — the tracker
2. **Blueprint** — `.github/prompts/plan-context-optimization.prompt.md`
   (read only the stream you're working on)

### Read when working on specific streams

<!-- Plan-builder populates this table from the streams it creates. -->

| Stream | Additional context files |
| ------ | ------------------------ |
|        |                          |

---

## Decisions Made During Execution

<!-- Record any runtime decisions that deviate from the plan -->

| Date | Decision | Rationale |
| ---- | -------- | --------- |
|      |          |           |
