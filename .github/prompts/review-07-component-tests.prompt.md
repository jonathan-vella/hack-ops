---
description: "Write React component tests with Testing Library for 10 key interactive components: forms, data display, navigation, UX"
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
  ]
---

# Review Phase R7: React Component Tests

Write unit tests for 10 key interactive React components using
Vitest + React Testing Library. Focus on user interaction,
state management, accessibility, and edge cases.

## Mission

Add component-level tests that complement the E2E suite.
These tests are faster to run and catch rendering, interaction,
and accessibility issues at the component level.

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Branch**: `feature/code-review`
- **Prerequisite**: R1 complete
- **Test location**: Colocated with components in
  `apps/web/src/components/__tests__/`

## Context to load

1. `apps/web/src/components/` — all component source files
2. `.github/skills/shadcn-ui-patterns/SKILL.md` — component conventions
3. `apps/web/vitest.config.ts` — existing test config

## Workflow

### Step 1 — Read all components

Read every component file in `apps/web/src/components/` to
understand props, state, event handlers, and conditional
rendering logic.

### Step 2 — Form components (R7.1)

Create `apps/web/src/components/__tests__/`:

**SubmissionForm.test.tsx**:

1. Renders form fields (description, attachments)
2. Shows validation errors on empty submit
3. Calls onSubmit with correct payload
4. Disables submit button while loading
5. Handles file attachment add/remove

**RubricForm.test.tsx**:

1. Renders existing categories
2. Add category → new row appears
3. Remove category → row removed
4. Category score cannot exceed maxScore
5. Empty category name shows validation error

### Step 3 — Data display components (R7.2)

**LeaderboardTable.test.tsx**:

1. Renders team names, scores, ranks
2. Correct grade badges per quartile (A/B/C/D)
3. Empty state when no teams
4. Sorting by score descending
5. Handles tied scores display

**ChallengeCard.test.tsx**:

1. Renders challenge title, description, maxScore
2. Locked state shows lock icon, no submit button
3. Unlocked state shows submit button
4. Completed state shows checkmark + score

**ReviewCard.test.tsx**:

1. Renders submission details
2. Approve action triggers callback with scores
3. Reject action requires reason input
4. Score input validates against rubric maxScore

### Step 4 — Navigation components (R7.3)

**Navbar.test.tsx**:

1. Shows login link when unauthenticated
2. Shows user menu when authenticated
3. Admin sees admin nav items
4. Coach sees coach-specific items
5. Hacker sees limited items

**AdminSidebar.test.tsx**:

1. Renders all admin nav links
2. Active route highlighted
3. Mobile responsive (sheet on small screens)
4. Links navigate to correct paths

**HackathonPicker.test.tsx**:

1. Renders hackathon options from props
2. Selection triggers onChange callback
3. Filters by status (active only for coaches)
4. Shows empty state when no hackathons

### Step 5 — UX pattern components (R7.4)

**ConfirmDialog.test.tsx**:

1. Opens when triggered
2. Shows title + description
3. Confirm button calls onConfirm
4. Cancel button calls onCancel
5. Escape key closes dialog
6. Click outside closes dialog

**PaginationBar.test.tsx**:

1. Renders page numbers
2. Previous disabled on page 1
3. Next disabled on last page
4. Click page number triggers onChange
5. Shows correct range (e.g., "Showing 1-10 of 50")

## Gate

```bash
npm test -- --coverage
```

Coverage includes component test files. Lines >= 80%.
Update tracker R7.1-R7.4.

## After completing

Update tracker, set next target to R8.1 (Adversarial Sonnet).
