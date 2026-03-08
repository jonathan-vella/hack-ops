---
description: "Merge adversarial findings, run gap analysis + dead code + dependency audit, generate consolidated code review report"
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "search/textSearch",
    "search/fileSearch",
    "execute/runInTerminal",
    "execute/runTests",
  ]
---

# Review Phase R10: Report + Gap Analysis

Merge all review findings, run coverage and dependency analysis,
and produce the consolidated code review report.

## Mission

This is the final phase. Combine Context7 findings, adversarial
findings from both models, E2E test results, component test
coverage, and static analysis into a single comprehensive report.

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Branch**: `feature/code-review`
- **Prerequisite**: ALL phases R2-R9 complete
- **Output**: `agent-output/hackops/code-review-report.md`

## Context to load

1. `agent-output/hackops/review-context7-findings.md` — R2 output
2. `agent-output/hackops/review-adversarial-sonnet.json` — R8 output
3. `agent-output/hackops/review-adversarial-gpt.json` — R9 output
4. E2E test results (Playwright HTML report)
5. Coverage report (`apps/web/coverage/`)
6. `docs/testing-strategy.md` — coverage targets

## Workflow

### Step 1 — Cross-model deduplication (R10.1)

Read both adversarial JSON files and merge:

1. Match issues by `file` + `line_range` + `category` across
   Sonnet and GPT findings
2. For matched issues (both models found it):
   - Take the higher severity
   - Combine descriptions for richer context
   - Mark as `confidence: high`
3. For single-model issues (only one model found it):
   - Mark as `confidence: medium`
   - Flag for manual triage
4. Reconcile severity disagreements (e.g., Sonnet says "high",
   GPT says "medium") — document both assessments

Output: merged findings list with confidence ratings.

### Step 2 — Coverage gap analysis (R10.2)

1. Run `npm test -- --coverage` and capture report
2. Compare against `docs/testing-strategy.md` targets:
   - Lines >= 80% (target), current: ?
   - Branches >= 80% (target), current: ?
3. Identify specific files with coverage < 80%
4. Map tested vs untested API routes
5. Map tested vs untested business logic paths
   (from `hackops-domain` skill invariants)
6. List any routes with 0% test coverage

### Step 3 — Dead code + dependency audit (R10.3 + R10.4)

**Dead code scan**:

1. Check for unused exports: `npx ts-prune` or manual grep
   for exported symbols not imported elsewhere
2. Identify unreachable code branches
3. Find orphaned components (defined but never rendered)

**Dependency audit**:

1. `npm audit --audit-level=moderate`
2. `npm outdated --workspace @hackops/web`
3. Check for deprecated packages
4. Flag any packages with known CVEs

### Step 4 — Generate consolidated report (R10.5)

Create `agent-output/hackops/code-review-report.md`:

```markdown
# HackOps End-to-End Code Review Report

**Date**: 2026-03-XX
**Scope**: Application code (apps/web/, packages/shared/)
**Excludes**: Bicep/infrastructure code
**Models**: Claude Sonnet 4.6 + GPT 5.4

## Executive Summary

[2-3 paragraph overview: overall health, critical findings
count, test coverage status, key recommendations]

## 1. Context7 Library Audit

### Summary

| Library | Issues | Breaking | Deprecated | Fixed |
...

### Key Findings

[Top findings from R2]

## 2. E2E Test Results

### Test Suites

| Suite | Tests | Pass | Fail | Skip |
| Admin Journey | X | X | 0 | 0 |
| Coach Journey | X | X | 0 | 0 |
| Hacker Journey | X | X | 0 | 0 |
| Cross-Cutting | X | X | 0 | 0 |

### Coverage Impact

[How E2E tests expanded coverage]

## 3. Component Test Results

| Component | Tests | Coverage |
...

## 4. Adversarial Review Findings

### By Severity

| Severity | Sonnet | GPT | Both | Total |
| Critical | X | X | X | X |
| High | X | X | X | X |
| Medium | X | X | X | X |
| Low | X | X | X | X |

### Cross-Model Agreement

- **High confidence** (both models): X findings
- **Medium confidence** (single model): X findings
- **Manual triage needed**: X findings

### Critical + Must-Fix Findings

[Detailed table with file, line, description, fix status]

### High + Should-Fix Findings

[Detailed table]

### Medium + Suggestions

[Summary only]

## 5. Coverage Gap Analysis

### Current Coverage

| Metric | Before Review | After Review | Target |
...

### Untested Paths

[List of files/routes with < 80% coverage]

### Business Rule Coverage

[Which hackops-domain invariants have test coverage]

## 6. Dead Code + Dependencies

### Dead Code

[Unused exports, unreachable branches]

### Dependency Audit

| Issue | Package | Severity | Action |
...

## 7. Recommendations

### Must-Fix (before next deploy)

1. ...

### Should-Fix (next sprint)

1. ...

### Suggestions (backlog)

1. ...

## Appendix

- [Context7 Findings](review-context7-findings.md)
- [Sonnet Findings](review-adversarial-sonnet.json)
- [GPT Findings](review-adversarial-gpt.json)
```

## Gate

- Report exists at `agent-output/hackops/code-review-report.md`
- All critical/must_fix findings have resolution notes
- Coverage numbers populated from actual test runs
- Cross-model deduplication complete (counts match)

## After completing

Update tracker: check off R10.1-R10.5, update Session Log.
Mark review as complete. Consider creating GitHub Issues
for accepted must-fix findings.
