---
description: "Generate the HackOps Product Requirements Document (PRD) from the technical plan. Output: docs/prd.md"
agent: agent
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "search/textSearch",
    "search/fileSearch",
  ]
---

# Generate HackOps PRD

Generate the full Product Requirements Document for HackOps from the existing technical plan.

## Mission

Read the technical plan and produce `docs/prd.md` — the single source of truth for
product requirements that feeds the backlog, agent prompts, and acceptance testing.

## Scope & Preconditions

- Source: `.github/prompts/plan-hackOps.prompt.md` — read sections:
  - `Application Summary`
  - `Key Invariants`
  - `Phase 5` through `Phase 10` (authentication through admin ops)
- Skill reference: `.github/skills/hackops-domain/SKILL.md` — load if it exists
  for business rule accuracy; skip gracefully if absent
- Output file: `docs/prd.md`

## Workflow

### Step 1 — Read source material

Read `.github/prompts/plan-hackOps.prompt.md` fully. Extract:

1. Product vision from `Application Summary`
2. Non-negotiable invariants from `Key Invariants`
3. Feature behaviour from Phases 5-10 (goals, exit criteria, task lists)

### Step 2 — Derive personas

From the plan's `Roles` statement, define four personas:

| Persona   | Role                   | Goals                               | Pain points                          |
| --------- | ---------------------- | ----------------------------------- | ------------------------------------ |
| Admin     | Full control           | Manage events, teams, roles, config | Manual reassignments are error-prone |
| Coach     | Validate/score         | Review and grade submissions        | No audit trail on overrides          |
| Hacker    | Team-scoped submission | Submit work, track progress         | Unclear challenge gating rules       |
| Anonymous | Blocked                | —                                   | Cannot access the platform           |

Expand each persona with specific goals and pain points derived from the plan.

### Step 3 — Define feature domains

Map each Phase 5-10 to a feature domain:

| Domain                 | Plan Phase | Description                              |
| ---------------------- | ---------- | ---------------------------------------- |
| Authentication & Roles | Phase 5    | GitHub OAuth, role guards, Easy Auth     |
| Hackathon Lifecycle    | Phase 6    | Create, launch, archive events           |
| Team Management        | Phase 6    | Shuffle, register, reassign teams        |
| Hacker Onboarding      | Phase 6    | Event code join, profile creation        |
| Scoring Engine         | Phase 7    | Rubric-driven submission + review queue  |
| Leaderboard            | Phase 8    | SSR live leaderboard, grade/award badges |
| Challenge Progression  | Phase 9    | Sequential gating, unlock on approval    |
| Admin Operations       | Phase 10   | Audit trail, config, role management     |

### Step 4 — Write user stories

For each domain, generate user stories using this format:

```markdown
**US-{NNN}**: As a {role}, I want {action}, so that {outcome}.

**Acceptance criteria**:

- Given {context}, when {trigger}, then {expected result}.
```

Target ~60-80 stories total across all domains. Each story must:

- Map to exactly one feature domain
- Reference the invariant it enforces (if applicable)
- Include at least two Given/When/Then acceptance criteria
- Note the role permission required

### Step 5 — Write non-functional requirements

Derive NFRs from the plan's constraints and scale data (`~75 max concurrent users`):

- **Performance**: Leaderboard SSR response < 2 s at 75 concurrent users
- **Security**: All endpoints authenticated except `/api/health`; event codes stored as plaintext, join endpoint rate-limited (5/min/IP)
- **Accessibility**: WCAG 2.1 AA for all public-facing pages
- **Compliance**: Azure Policy guardrails respected; no public endpoints for database
- **Observability**: All reviewer actions audited with `reviewedBy`, `reviewedAt`, `reviewReason`

### Step 6 — Write out-of-scope section

Explicitly note items NOT in scope based on the plan:

- Mobile native app
- Email or SMS notifications
- Multi-tenant SaaS (single-organisation deployment)
- Self-hosted GitHub Enterprise integration
- Real-time collaboration (WebSockets) — leaderboard uses polling

### Step 7 — Write success metrics

Derive measurable success criteria from the plan's exit criteria per phase.

### Step 8 — Create docs/prd.md

Write the complete PRD to `docs/prd.md` with these top-level sections:

```markdown
# HackOps — Product Requirements Document

## Product Vision

## Success Metrics

## User Personas

## Feature Domains

## User Stories

### Authentication & Roles

### Hackathon Lifecycle

### Team Management

### Hacker Onboarding

### Scoring Engine

### Leaderboard

### Challenge Progression

### Admin Operations

## Non-Functional Requirements

## Out of Scope

## Glossary
```

## Output Expectations

- File: `docs/prd.md`
- Stories: 60-80 across 8 domains
- Format: Every story has `US-{NNN}` identifier and ≥ 2 acceptance criteria
- No content from the plan is silently dropped — if a feature is small,
  create a brief story for it

## Quality Assurance

- [ ] `docs/prd.md` exists
- [ ] All 8 feature domains have at least 5 user stories
- [ ] Every Key Invariant from the plan maps to at least one acceptance criterion
- [ ] Non-functional requirements section is populated
- [ ] `npm run lint:md` passes with no errors
