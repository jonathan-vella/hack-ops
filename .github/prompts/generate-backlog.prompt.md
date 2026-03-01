---
description: "Generate GitHub Issues backlog from PRD user stories, grouped by epic and phase milestone"
agent: agent
tools:
  [
    "read/readFile",
    "search/textSearch",
    "search/fileSearch",
    "github",
  ]
---

# Generate HackOps Backlog

Read the PRD, API contract, and technical plan — then create
GitHub Issues organized by feature domain epics, milestones,
and labels.

## Mission

Transform the user stories in `docs/prd.md` into a structured
GitHub Issues backlog. Each user story becomes an issue. Issues
are grouped under epic issues per feature domain and assigned
to the correct milestone and labels from the label taxonomy.

## Scope & Preconditions

- **PRD**: `docs/prd.md` — read `User Stories` and
  `Feature Domains` sections
- **API contract**: `docs/api-contract.md` — cross-reference
  endpoint definitions for acceptance criteria
- **Technical plan**: `.github/prompts/plan-hackOps.prompt.md`
  — read `Phased Implementation Plan` for phase-to-milestone
  mapping
- **Label taxonomy**: Labels created by `scripts/setup-labels.sh`
  must exist on the repo before running this prompt
- **Milestones**: Created by `scripts/setup-milestones.sh`
  must exist before running this prompt
- **Authentication**: `gh auth login` or `GH_TOKEN` must be set

## Workflow

### Step 1 — Read sources

1. Read `docs/prd.md` — extract the Feature Domains table and
   all User Stories sections
2. Read `docs/api-contract.md` — note endpoint-to-domain mapping
3. Read `.github/prompts/plan-hackOps.prompt.md` — extract the
   phase-to-milestone mapping from the Phased Implementation Plan

### Step 2 — Create epic issues

For each feature domain in the PRD, create one epic issue:

| Domain                 | Phase      | Epic title                                    |
| ---------------------- | ---------- | --------------------------------------------- |
| Authentication & Roles | Phase 5    | `[Epic] Authentication & Authorization`       |
| Hackathon Lifecycle    | Phase 6    | `[Epic] Hackathon Lifecycle Management`       |
| Team Management        | Phase 6    | `[Epic] Team Management`                      |
| Hacker Onboarding      | Phase 6    | `[Epic] Hacker Onboarding`                    |
| Scoring Engine         | Phase 7    | `[Epic] Scoring Engine & Submissions`         |
| Leaderboard            | Phase 8    | `[Epic] Leaderboard & Live Updates`           |
| Challenge Progression  | Phase 9    | `[Epic] Challenge Progression & Gating`       |
| Admin Operations       | Phase 10   | `[Epic] Admin & Operational Features`         |

Also create infrastructure epics for Phases 1-4 and 11-12:

| Phase       | Epic title                                       |
| ----------- | ------------------------------------------------ |
| Phase 1     | `[Epic] Monorepo Scaffold & Dev Environment`     |
| Phase 1.5   | `[Epic] Governance Discovery`                    |
| Phase 2     | `[Epic] IaC Foundation`                          |
| Phase 3     | `[Epic] Database IaC & Schema`                   |
| Phase 4     | `[Epic] Compute IaC & Deployment`                |
| Phase 11    | `[Epic] CI/CD Pipeline`                          |
| Phase 12    | `[Epic] Production Hardening`                    |

Each epic issue body includes:

- A brief description from the plan's Goal for that phase
- A task list (`- [ ]`) of dependent child issues (populated
  in Step 4 after child issues are created)
- Labels: `epic` + the matching `phase-N` label

### Step 3 — Create user story issues

For each user story in the PRD (format: `US-XXX`):

1. **Title**: The user story sentence
   (e.g., "As an Admin, I can create a hackathon event")
2. **Body**:
   - Role, action, and benefit parsed from the story
   - Acceptance criteria from the PRD (verbatim)
   - Related API endpoints from the API contract
   - A "Dependencies" section listing blocking issues
     (by `#number` reference)
3. **Labels**: domain label (`auth`, `api`, `frontend`, etc.),
   phase label (`phase-5`, `phase-6`, etc.), and `prd`
4. **Milestone**: The matching phase milestone
   (e.g., "Phase 5: Auth & Authorization")

### Step 4 — Update epic task lists

After all child issues are created, edit each epic issue body
to include a `- [ ] #N — title` task list referencing the
child issues in that domain.

### Step 5 — Create dependency map

Create infrastructure stories for plan steps that are not
user stories (Phases 1-4, 11-12). These follow the same
pattern but use the plan's Steps as the source.

For cross-phase dependencies, add a comment on the blocked
issue: `Blocked by #N (phase X must complete first)`.
Also add the `blocked` label to issues that cannot start
until a predecessor completes.

### Step 6 — Summary

Print a summary table:

| Domain | Epic # | Child issues | Milestone |
| ------ | ------ | ------------ | --------- |

## Output Expectations

- One epic issue per feature domain (8) + per infra phase (6)
  = 14 epics
- One issue per PRD user story (~64 stories) + infra steps
- All issues labeled and milestoned
- Epic task lists populated with `- [ ] #N` references
- Dependency relationships documented via comments and
  `blocked` label

## Quality Assurance

- [ ] Every PRD user story has a corresponding issue
- [ ] Every issue has at least one domain label and one
      phase label
- [ ] Every issue is assigned to a milestone
- [ ] Epic task lists reference all child issues
- [ ] No orphaned issues (every issue belongs to an epic)
- [ ] Dependency comments use `#N` issue references
