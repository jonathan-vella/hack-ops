---
description: "Triage open backlog issues — update status, flag blockers, suggest next actions"
agent: agent
tools:
  [
    "read/readFile",
    "search/textSearch",
    "github",
  ]
---

# Triage HackOps Backlog

Review all open GitHub Issues, reconcile them against
completed work, and produce a triage report with next actions.

## Mission

Read open issues, check for completed work (closed PRs,
merged code, checked-off tracker items), update issue status,
add progress comments, flag blocked items, and suggest the
next actionable issues.

## Scope & Preconditions

- **Session tracker**:
  `docs/exec-plans/active/hackops-execution.md` — source of
  truth for completed steps
- **Repository**: `jonathan-vella/hack-ops`
- **Authentication**: `gh auth login` or `GH_TOKEN` must be set

## Workflow

### Step 1 — Gather current state

1. Read `docs/exec-plans/active/hackops-execution.md` — note
   all checked items and their corresponding issue numbers
   from the Issue-to-Step Mapping table
2. List all open issues: query GitHub for open issues in the
   repository, grouped by milestone
3. List recently closed PRs (last 7 days) to identify
   completed work

### Step 2 — Reconcile completed work

For each open issue, check:

1. Is the corresponding step marked complete in the tracker?
   → Close the issue with a comment noting the commit or PR
2. Is there a merged PR that addresses the issue?
   → Close with a reference to the PR
3. Is the issue's milestone phase currently active?
   → Leave open, add progress comment if partial work exists

### Step 3 — Flag blockers

For each remaining open issue:

1. Check if predecessor issues (from dependency comments)
   are still open → add `blocked` label if not already present
2. Check if the issue's milestone phase has prerequisites
   that are incomplete → add a warning comment
3. Remove `blocked` label from issues whose predecessors
   have been resolved

### Step 4 — Suggest next actions

Produce a prioritized list of the next 5-10 actionable issues
based on:

1. Current phase in the session tracker
2. Dependency ordering (unblocked issues first)
3. Milestone sequence (lower phase numbers first)

### Step 5 — Print triage report

Output a markdown summary:

```markdown
## Backlog Triage Report — {date}

### Closed this session
| Issue | Title | Reason |
| ----- | ----- | ------ |

### Blocked issues
| Issue | Title | Blocked by |
| ----- | ----- | ---------- |

### Suggested next actions
| Priority | Issue | Title | Milestone |
| -------- | ----- | ----- | --------- |

### Statistics
- Open issues: N
- Closed this session: N
- Blocked: N
- Ready to start: N
```

## Output Expectations

- All stale issues (completed work) are closed with comments
- Blocked issues have the `blocked` label
- Unblocked issues have `blocked` removed
- A clear next-actions list is provided

## Quality Assurance

- [ ] Session tracker was read before modifying any issues
- [ ] Every closed issue has a comment explaining why
- [ ] No issue was closed without verifying the work is done
- [ ] Blocked/unblocked labels are accurate
- [ ] Triage report printed to chat output
