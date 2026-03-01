---
description: "Generate the HackOps Azure SQL data model reference with TypeScript interfaces and sample documents. Output: docs/data-model.md"
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

# Generate HackOps Data Model

Generate the Azure SQL data model reference document, including TypeScript interfaces,
primary key rationale, and sample documents for all 10 tables.

## Mission

Read the technical plan and produce `docs/data-model.md` — the canonical reference
for every Azure SQL table, its schema, and its query patterns.

## Scope & Preconditions

- Source: `.github/prompts/plan-hackOps.prompt.md` — read sections:
  - `Database` (tech stack table, 10 tables, primary keys table)
  - `Phase 3` — Database IaC & Schema (table creation, seed script)
  - `Phase 6` through `Phase 10` — field-level details from task descriptions
  - `Key Invariants` — staging pattern, atomic swap, progression gating
- Output file: `docs/data-model.md`

## Workflow

### Step 1 — Read source material

Read `.github/prompts/plan-hackOps.prompt.md` fully. Extract the 10 tables and
their primary keys from the `Database` section:

| Table         | Primary Key    | Purpose               |
| ------------- | -------------- | --------------------- |
| `hackathons`  | `/id`          | Event lifecycle       |
| `teams`       | `/hackathonId` | Team roster           |
| `hackers`     | `/hackathonId` | Hacker profiles       |
| `scores`      | `/teamId`      | Approved scores       |
| `submissions` | `/teamId`      | Staging queue         |
| `rubrics`     | `/id`          | Scoring rubrics       |
| `config`      | `/id`          | App config            |
| `roles`       | `/hackathonId` | Role assignments      |
| `challenges`  | `/hackathonId` | Challenge definitions |
| `progression` | `/teamId`      | Unlock state          |

Also extract field-level details from Phases 6-10 task descriptions.

### Step 2 — Design TypeScript interfaces

For each table, write a TypeScript interface that:

1. Includes `id: string` and the primary key field
2. Includes a `_type` discriminant field (e.g., `_type: 'hackathon'`)
3. Uses strict union types for status/state fields
4. Reflects all Key Invariants:
   - `submissions`: include `state: 'pending' | 'approved' | 'rejected'` and
     `reviewedBy`, `reviewedAt`, `reviewReason` (nullable until reviewed)
   - `rubrics`: include `version: number` and a `pointer` document pattern
     (pointer document has `activeRubricId` — the atomic swap field)
   - `challenges`: include `order: number` for sequential gating
   - `progression`: include `unlockedChallenges: string[]` mirroring the
     gating invariant
   - `hackers`: event code field is `eventCode: string`
     (stored as plaintext; security via rate limiting, not hashing)

### Step 3 — Write sample documents

For each table, provide one realistic sample document as a JSON code block.
The sample must:

- Use plausible example data (avoid `"string"` or `"value"` placeholders)
- Show all required fields
- Demonstrate nullable/optional fields with `null` or omitted values

### Step 4 — Document indexing recommendations

For each table, note indexing recommendations:

- Default indexes are acceptable for most tables
- Call out any field that should be excluded for cost savings
  (large Markdown fields in `rubrics`, JSON blobs in `submissions`)
- Note composite indexes required for sorted queries
  (e.g., `leaderboard` sorted by `totalScore DESC`)

### Step 5 — Document cross-table query patterns

Document the key multi-table patterns the app uses:

| Pattern                     | Tables involved              | Description                                              |
| --------------------------- | ---------------------------- | -------------------------------------------------------- |
| Leaderboard assembly        | `scores`, `teams`, `hackers` | Join approved scores with team and member display names  |
| Submission review queue     | `submissions`, `rubrics`     | Load pending submissions with active rubric for grading  |
| Challenge progression check | `progression`, `challenges`  | Determine next unlockable challenge for a team           |
| Rubric atomic swap          | `rubrics`                    | Update pointer document then insert new versioned rubric |

### Step 6 — Write docs/data-model.md

Write the complete data model to `docs/data-model.md` with these sections:

```markdown
# HackOps — Azure SQL Data Model

## Overview

## Table Summary Table

## Table Definitions

### hackathons

### teams

### hackers

### scores

### submissions

### rubrics

### config

### roles

### challenges

### progression

## Cross-Table Query Patterns

## Indexing Recommendations

## Key Invariants Encoded in the Schema
```

Each table definition section must include:

1. TypeScript interface (fenced code block, `typescript` syntax)
2. Primary key rationale (one paragraph)
3. Sample document (fenced code block, `json` syntax)
4. Notes on any special patterns (pointer doc, staging queue, etc.)

## Output Expectations

- File: `docs/data-model.md`
- All 10 tables defined
- TypeScript interfaces use strict types (no `any`)
- Sample documents use plausible values
- All Key Invariants from the plan are reflected in field types

## Quality Assurance

- [ ] `docs/data-model.md` exists
- [ ] All 10 tables have a TypeScript interface
- [ ] All 10 tables have a sample document
- [ ] `submissions` interface includes `state`, `reviewedBy`, `reviewedAt`, `reviewReason`
- [ ] `rubrics` documents the pointer/versioned pattern
- [ ] `hackers` uses `eventCode` (plaintext; join endpoint rate-limited)
- [ ] `npm run lint:md` passes
