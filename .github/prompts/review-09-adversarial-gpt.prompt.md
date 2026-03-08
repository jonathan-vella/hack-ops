---
description: "Run adversarial security + logic review using GPT 5.4 — 3 security passes + 4 logic passes (independent cross-validation)"
tools:
  ["read/readFile", "search/textSearch", "search/fileSearch", "search/usages"]
---

# Review Phase R9: Adversarial Review — GPT 5.4

Run the two adversarial subagent frameworks (security + logic)
using GPT 5.4. This is pass 3-4 of the 4-pass cross-model
review, independent from the Sonnet 4.6 review in R8.

## Mission

Execute the same security + logic review frameworks as R8,
but with GPT 5.4 for independent cross-validation. Different
models catch different issues — findings unique to one model
get elevated for manual review in R10.

**MODEL REQUIREMENT**: This prompt MUST be executed with
GPT 5.4 selected in the Copilot model picker.

**DO NOT READ R8 FINDINGS**: This review must be independent.
Do not read `review-adversarial-sonnet.json` before completing
this phase. Cross-comparison happens in R10.

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Branch**: `feature/code-review`
- **Prerequisite**: R2 complete (Context7 fixes applied)
- **Model**: GPT 5.4
- **Independence**: Do NOT read R8 findings

## Context to load

1. `.github/agents/_subagents/app-security-challenger-subagent.agent.md`
2. `.github/agents/_subagents/app-logic-challenger-subagent.agent.md`
3. `docs/api-contract.md`
4. `docs/data-model.md`
5. `docs/security-checklist.md`
6. `.github/skills/hackops-domain/SKILL.md`

## Workflow

### Step 1 — Security challenge (R9.1)

Run 3 security passes (IDENTICAL scope to R8.1):

**Pass 1 — Auth**:

- Easy Auth header spoofing, dev bypass production leak,
  session validation, RBAC enforcement, requireRole coverage

**Pass 2 — API Routes**:

- IDOR on all `[id]` params, Zod-first validation, error
  message sanitization, rate limiting, CORS

**Pass 3 — Data Handling**:

- SQL parameterization audit, XSS prevention, data leakage,
  cross-hackathon isolation, audit completeness

### Step 2 — Logic challenge (R9.2)

Run 4 logic passes (IDENTICAL scope to R8.2):

**Pass 1 — API Contract**:

- Response shapes vs types, status codes, error format

**Pass 2 — Business Rules**:

- Challenge gating, scoring limits, team assignment,
  tiebreaker, grade badges, primary admin protection,
  event code uniqueness

**Pass 3 — Data Model**:

- FK integrity, cascades, unique constraints, JSON parsing,
  pagination correctness

**Pass 4 — Edge Cases**:

- Empty arrays, concurrency, archived state, boundary values,
  timestamp handling

### Step 3 — Write findings (R9.3)

Create `agent-output/hackops/review-adversarial-gpt.json`:

Same JSON structure as R8.3 but with `"model": "gpt-5.4"`.

```json
{
  "model": "gpt-5.4",
  "timestamp": "2026-03-08T...",
  "summary": {
    "security": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "logic": { "must_fix": 0, "should_fix": 0, "suggestion": 0 }
  },
  "passes": [...]
}
```

## Gate

- Findings JSON created at expected path
- All issues have severity + category + fix recommendation
- Summary counts match detailed issue counts
- File does NOT reference Sonnet findings (independence maintained)

## After completing

Update tracker: check off R9.1-R9.3, update Session Log.
Set next target to R10.1 (Cross-Model Deduplication).
