# Quality Score

> Project health at a glance. Updated by the doc-gardening workflow and manual review.

| Domain              | Grade | Gap Summary                                        | Next Action                               |
| ------------------- | ----- | -------------------------------------------------- | ----------------------------------------- |
| **Agents**          | B+    | All 10 agents functional; golden-principles added  | Verify context-loading ≤5 instructions    |
| **Skills**          | B     | 14 skills; golden-principles is new and untested   | Add progressive-loading to azure-defaults |
| **Instructions**    | A-    | Consolidated 28→20; no duplicates remain           | Monitor for drift after next feature add  |
| **Infrastructure**  | B-    | Bicep patterns cover common cases; no Terraform    | Expand hub-spoke pattern coverage         |
| **Documentation**   | B     | Exec-plans structure added; some docs may be stale | Run doc-gardening pass                    |
| **CI / Validation** | B+    | 14 validators; entropy-check workflow pending      | Wire up entropy-check.yml                 |

## Grading Scale

| Grade | Meaning                                                |
| ----- | ------------------------------------------------------ |
| A     | Excellent — mechanically enforced, minimal manual gaps |
| B     | Good — conventions documented, some manual enforcement |
| C     | Fair — known gaps, improvement plan exists             |
| D     | Poor — significant gaps, no active remediation         |
| F     | Critical — domain is broken or unmaintained            |

## Change Log

| Date       | Domain       | Change                                         |
| ---------- | ------------ | ---------------------------------------------- |
| 2025-07-15 | Instructions | Consolidated 28→20 (dedup + merge)             |
| 2025-07-15 | Skills       | Added golden-principles skill + instruction    |
| 2025-07-15 | Agents       | Added golden-principles + AGENTS.md references |
| 2025-07-15 | Docs         | Created exec-plans structure and QUALITY_SCORE |

## How to Update

1. Run the doc-gardening prompt: `.github/prompts/doc-gardening.prompt.md`
2. Review findings and update grades above
3. Log changes in the Change Log table
4. Update `docs/exec-plans/tech-debt-tracker.md` for tracked debt items
