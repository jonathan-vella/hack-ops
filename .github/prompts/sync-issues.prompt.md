---
description: "Sync GitHub Issues and Project board with session tracker — close completed issues, update labels, move project cards"
model: "Claude Haiku 4.5"
agent: agent
[vscode, execute, read, agent, edit, search, web, 'github/*', todo]
---

# Sync Issues and Project Board

Reconcile the session tracker with GitHub Issues and the
HackOps Project board. Close completed issues, update
in-progress items, and move project cards.

## Mission

Read the execution tracker, diff it against GitHub issue
states, and batch-update everything that's out of sync.
This is a lightweight sync — run it at end of session or
whenever the tracker advances.

## Scope & Preconditions

- **Repo**: `jonathan-vella/hack-ops`
- **Session tracker**:
  `docs/exec-plans/active/hackops-execution.md`
- **Project board**: `#6` (owner: `jonathan-vella`)
- **Auth**: MCP GitHub tools preferred. Falls back to
  `gh` CLI if MCP write tools unavailable.

## Workflow

### Step 1 — Read tracker state

1. Read `docs/exec-plans/active/hackops-execution.md`
2. Extract the **Issue-to-Step Mapping** table — note which
   issues are marked `Closed` in the tracker but may still
   be open on GitHub
3. Extract the **Phase Progress** section — identify all
   checked `[x]` items and their corresponding phases
4. Note the **Current Session Target** — this is the
   active work item

### Step 2 — Fetch GitHub issue states

1. List all issues in `jonathan-vella/hack-ops` (open and
   recently closed) using MCP `mcp_github_list_issues` or
   `gh issue list --state all --limit 200`
2. Build a map: `issue number → { state, labels, title }`

### Step 3 — Close completed issues

For each issue in the mapping table marked `Closed` in the
tracker but still open on GitHub:

1. Close the issue with a comment:
   ```markdown
   Completed in session — step checked off in tracker.
   See `docs/exec-plans/active/hackops-execution.md`.
   ```
2. Use MCP `mcp_github_issue_write` or
   `gh issue close <N> --comment "..."`

### Step 4 — Update in-progress labels

For the issue corresponding to the current session target:

1. Add label `in-progress` if not already present
2. Remove `in-progress` from any other issue that has it
   (only one item should be actively worked on)

### Step 5 — Update project board

Attempt to move cards on Project #6 to match their status:

| Tracker state        | Project status |
| -------------------- | -------------- |
| `[x]` checked        | Done           |
| Current target       | In Progress    |
| Unchecked, unblocked | Ready          |
| Unchecked, blocked   | Backlog        |

Use `gh` CLI with GraphQL for project item updates:

```bash
# List project items
gh project item-list 6 --owner jonathan-vella --limit 200

# Move item to a status column (requires item ID + field ID)
gh project item-edit \
  --project-id <PROJECT_ID> \
  --id <ITEM_ID> \
  --field-id <STATUS_FIELD_ID> \
  --single-select-option-id <OPTION_ID>
```

If project update fails (missing IDs, auth), log the
failure and continue — issue sync is the priority.

### Step 6 — Sync backlog issues

Scan open backlog issues (those from `/generate-backlog`
with milestone labels like `Phase 5` through `Phase 12`):

1. If the issue's milestone phase matches the current
   tracker phase, ensure it has status `Ready` on the board
2. If the issue's milestone phase is a future phase, leave
   as `Backlog`
3. If the issue references work already merged to `main`,
   close it with a PR reference

### Step 7 — Print sync report

Output a concise markdown summary:

```markdown
## Issue Sync Report — {date}

### Actions taken

| Issue | Action | Detail |
| ----- | ------ | ------ |

### Project board updates

| Issue | Old status | New status |
| ----- | ---------- | ---------- |

### Summary

- Issues closed: N
- Issues updated: N
- Project cards moved: N
- Failures: N (list if any)
```

## Output Expectations

- All completed tracker items have their issues closed
- In-progress label is on exactly one issue (current target)
- Project board reflects tracker state where possible
- Sync report printed to chat

## Failure Handling

- If MCP tools are unavailable, fall back to `gh` CLI
- If `gh` auth fails, print the list of required manual
  actions (issue numbers, desired state) so the user can
  run them when auth is restored
- Never skip the sync report — even if all operations
  fail, print what needs to happen

## Quality Assurance

- [ ] Tracker was read before any GitHub operations
- [ ] No issue closed without verifying step is checked
- [ ] In-progress label on exactly one issue
- [ ] Project board updates attempted
- [ ] Sync report printed with action summary
