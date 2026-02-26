# Backlog Setup Guide

> Steps to configure the HackOps GitHub Projects board, labels,
> and milestones. Run these once during Phase B bootstrap.

---

## Prerequisites

- GitHub CLI authenticated: `gh auth login` or `GH_TOKEN` set
- Repository: `jonathan-vella/hack-ops`

---

## Step 1 — Create Labels

Run the label taxonomy script to add domain, phase, and
workflow labels:

```bash
./scripts/setup-labels.sh
```

**Labels created:**

| Category | Labels                                                   |
| -------- | -------------------------------------------------------- |
| Domain   | `app`, `frontend`, `backend`, `api`, `database`, `auth`, |
|          | `testing`                                                |
| Phase    | `phase-1` through `phase-12` (includes `phase-1.5`)      |
| Workflow | `epic`, `prd`, `blocked`                                 |
| Existing | `bug`, `enhancement`, `infrastructure`, `bicep`,         |
|          | `copilot-agent`, `documentation`, `scenario` (preserved) |

---

## Step 2 — Create Milestones

Run the milestones script to create 12 milestones matching
`plan-hackOps.prompt.md` phases:

```bash
./scripts/setup-milestones.sh
```

Each milestone has a description sourced from the plan's Goal
and Exit criteria for that phase.

---

## Step 3 — Generate Backlog Issues

Run the backlog generation prompt in Copilot Chat:

```text
/generate-backlog
```

This reads the PRD, API contract, and technical plan to create
~80 issues: 14 epics + ~64 user story issues + infrastructure
steps.

---

## Step 4 — Create GitHub Projects Board

GitHub Projects (V2) requires manual creation or `gh` CLI
commands. The board provides a Kanban view of the backlog.

### Create the project

```bash
gh project create \
  --owner jonathan-vella \
  --title "HackOps Backlog" \
  --body "Kanban board for HackOps hackathon management platform"
```

The project was created as **number 6**:
`https://github.com/users/jonathan-vella/projects/6`

### Configure columns (status field)

Projects V2 uses a built-in "Status" field with configurable
options. The default options are "Todo", "In Progress", "Done".
Update them to match the HackOps workflow:

| Status      | Description                  |
| ----------- | ---------------------------- |
| Backlog     | Not yet scheduled for work   |
| Ready       | Dependencies met, can start  |
| In Progress | Actively being worked on     |
| Review      | PR open or awaiting approval |
| Done        | Merged and verified          |

To configure via `gh`:

```bash
PROJECT_NUM=6

# Status field updates require GraphQL — use the web UI
# or the gh project field-list / field-edit commands:
gh project field-list "$PROJECT_NUM" --owner jonathan-vella
```

> **Note**: Custom status options are best configured via the
> GitHub web UI at
> `https://github.com/users/jonathan-vella/projects/6/settings`.

### Add custom fields

| Field      | Type          | Options                              |
| ---------- | ------------- | ------------------------------------ |
| Phase      | Single select | Phase 1 through Phase 12             |
| Domain     | Single select | Auth, Hackathon, Team, Scoring,      |
|            |               | Leaderboard, Challenge, Admin, Infra |
| Complexity | Single select | S, M, L, XL                          |

```bash
# Custom fields are created via the web UI or GraphQL API.
# The gh CLI supports field creation:
gh project field-create 6 \
  --owner jonathan-vella \
  --name "Phase" \
  --data-type "SINGLE_SELECT"

gh project field-create 6 \
  --owner jonathan-vella \
  --name "Domain" \
  --data-type "SINGLE_SELECT"

gh project field-create 6 \
  --owner jonathan-vella \
  --name "Complexity" \
  --data-type "SINGLE_SELECT"
```

### Add issues to the project

Bulk-add all open issues to the project:

```bash
gh issue list --repo jonathan-vella/hack-ops \
  --state open --limit 200 --json number \
  --jq '.[].number' | while read -r num; do
    gh project item-add 6 \
      --owner jonathan-vella \
      --url "https://github.com/jonathan-vella/hack-ops/issues/$num"
done
```

### Create project views

Create filtered views for different perspectives:

| View name      | Filter                                  |
| -------------- | --------------------------------------- |
| By Phase       | Group by Phase field                    |
| By Domain      | Group by Domain field                   |
| Current Sprint | Filter: Status != Done, Phase = current |
| Blocked        | Filter: label:blocked                   |

Views are configured in the project web UI under "Views".

---

## Step 5 — Ongoing Triage

Run the backlog triage prompt periodically to keep issues
in sync with progress:

```text
/backlog-triage
```

This closes completed issues, flags blockers, and suggests
the next actionable items.

---

## Automation Notes

- **Auto-close on PR merge**: GitHub auto-closes issues
  referenced with `Closes #N` or `Fixes #N` in PR
  descriptions
- **Auto-move on status**: Configure project automation
  rules to move items to "Done" when the linked issue closes
- **Label sync**: The triage prompt manages `blocked` labels
  based on dependency resolution
