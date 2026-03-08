---
description: "Run adversarial security + logic review using Claude Sonnet 4.6 — 3 security passes + 4 logic passes"
tools:
  ["read/readFile", "search/textSearch", "search/fileSearch", "search/usages"]
---

# Review Phase R8: Adversarial Review — Sonnet 4.6

Run the two adversarial subagent frameworks (security + logic)
using Claude Sonnet 4.6. This is pass 1-2 of the 4-pass
cross-model review.

## Mission

Execute both the `app-security-challenger-subagent` and
`app-logic-challenger-subagent` review frameworks against
the full application codebase. Output structured JSON findings.

**MODEL REQUIREMENT**: This prompt MUST be executed with
Claude Sonnet 4.6 selected in the Copilot model picker.
The companion prompt `review-09-adversarial-gpt.prompt.md`
runs the same review with GPT 5.4 for cross-validation.

## Scope & Preconditions

- **Tracker**: `docs/exec-plans/active/code-review-execution.md`
- **Branch**: `feature/code-review`
- **Prerequisite**: R2 complete (Context7 fixes applied — review
  the fixed codebase, not the original)
- **Model**: Claude Sonnet 4.6

## Context to load

1. `.github/agents/_subagents/app-security-challenger-subagent.agent.md`
   — security review framework (3 passes)
2. `.github/agents/_subagents/app-logic-challenger-subagent.agent.md`
   — logic review framework (4 passes)
3. `docs/api-contract.md` — endpoint reference
4. `docs/data-model.md` — data model reference
5. `docs/security-checklist.md` — security requirements
6. `.github/skills/hackops-domain/SKILL.md` — business rules

## Workflow

### Step 1 — Security challenge (R8.1)

Run 3 security passes per the `app-security-challenger` framework:

**Pass 1 — Auth**:

- Read all files in `apps/web/src/lib/` (auth, guards, roles)
- Check: Easy Auth header spoofing defense
- Check: Dev bypass (`DEV_USER_*`) cannot leak to production
- Check: Session validation, token expiry
- Check: RBAC enforced server-side, not client-side
- Check: `requireRole()` on every non-public route

**Pass 2 — API Routes**:

- Read all files in `apps/web/src/app/api/`
- Check: Every `[id]` param validated + ownership verified (IDOR)
- Check: Zod validation before any business logic
- Check: Error responses don't leak internals (stack traces, SQL errors)
- Check: Rate limiting on abuse-prone endpoints
- Check: CORS configuration

**Pass 3 — Data Handling**:

- Read `apps/web/src/lib/sql.ts` + all query calls
- Check: ALL SQL queries use parameterized inputs (no string interpolation)
- Check: No `dangerouslySetInnerHTML` without sanitization
- Check: Leaderboard doesn't expose submission details
- Check: Score data doesn't leak across hackathon boundaries
- Check: Audit log entries include all required fields

### Step 2 — Logic challenge (R8.2)

Run 4 logic passes per the `app-logic-challenger` framework:

**Pass 1 — API Contract**:

- Cross-check every route handler against `docs/api-contract.md`
- Check: Response shapes match `@hackops/shared` type definitions
- Check: Status codes correct per contract (400, 401, 403, 404, 409)
- Check: Error response format matches `{ ok, error, data }` pattern

**Pass 2 — Business Rules**:

- Cross-check against `.github/skills/hackops-domain/SKILL.md`
- Check: Challenge gating (N+1 locked until N approved)
- Check: Rubric scores cannot exceed `maxScore`
- Check: Fisher-Yates shuffle produces balanced teams
- Check: Runt-team merge rule (teams < ceil(teamSize/2))
- Check: Tiebreaker logic (earliest `lastApprovalAt`)
- Check: Grade badges (A/B/C/D) per quartile
- Check: Primary admin cannot be removed/demoted
- Check: Event codes unique across active hackathons

**Pass 3 — Data Model**:

- Cross-check against `docs/data-model.md`
- Check: FK integrity enforced (no orphaned records)
- Check: Cascade rules correct (delete hackathon → what happens to teams?)
- Check: Unique constraints match expected (eventCode, role assignments)
- Check: JSON columns parsed correctly (members, categories, scores)
- Check: Pagination implementation (OFFSET/FETCH) correct

**Pass 4 — Edge Cases**:

- Check: Empty arrays handled (0 teams, 0 submissions, 0 scores)
- Check: Concurrent operations (two coaches scoring same submission)
- Check: Archived hackathon blocks all write operations
- Check: Boundary values (max team size, max score, max challenges)
- Check: Server-side UTC timestamps (no client clock dependency)

### Step 3 — Write findings (R8.3)

Create `agent-output/hackops/review-adversarial-sonnet.json`:

```json
{
  "model": "claude-sonnet-4.6",
  "timestamp": "2026-03-08T...",
  "summary": {
    "security": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "logic": { "must_fix": 0, "should_fix": 0, "suggestion": 0 }
  },
  "passes": [
    {
      "type": "security",
      "pass": "auth",
      "issues": [
        {
          "severity": "...",
          "category": "...",
          "file": "...",
          "line_range": "...",
          "description": "...",
          "attack_scenario": "...",
          "fix": "..."
        }
      ]
    }
  ]
}
```

## Gate

- Findings JSON created at expected path
- All issues have severity + category + fix recommendation
- Summary counts match detailed issue counts

## After completing

Update tracker: check off R8.1-R8.3, update Session Log.
Do NOT fix findings yet — fixes happen during R10 after
cross-model deduplication.
