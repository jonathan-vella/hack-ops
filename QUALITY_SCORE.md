# Quality Score

> Project health at a glance. Updated by the doc-gardening workflow and manual review.

| Domain              | Grade | Gap Summary                                            | Next Action                                |
| ------------------- | ----- | ------------------------------------------------------ | ------------------------------------------ |
| **Agents**          | B+    | 9 agents + 8 subagents functional; 1 frontmatter warn  | Fix conductor 'agents' array format warn   |
| **Skills**          | B+    | All 14 skills pass GA format validation                | Add progressive-loading to azure-defaults  |
| **Instructions**    | A-    | 20 instructions; 0 errors, 7 info-level warnings       | Monitor for drift after next feature add   |
| **Infrastructure**  | B-    | Bicep patterns cover common cases; no Terraform        | Expand hub-spoke pattern coverage          |
| **Documentation**   | B+    | Freshness checker clean (0 issues); agent table fixed  | Verify lingering quickstart/glossary links |
| **CI / Validation** | B+    | 14 validators; freshness checker false-positives fixed | Wire up entropy-check.yml                  |

## Grading Scale

| Grade | Meaning                                                |
| ----- | ------------------------------------------------------ |
| A     | Excellent — mechanically enforced, minimal manual gaps |
| B     | Good — conventions documented, some manual enforcement |
| C     | Fair — known gaps, improvement plan exists             |
| D     | Poor — significant gaps, no active remediation         |
| F     | Critical — domain is broken or unmaintained            |

## Change Log

| Date       | Domain        | Change                                                                                  |
| ---------- | ------------- | --------------------------------------------------------------------------------------- |
| 2026-02-26 | Docs          | Fixed agent table: bicep-plan→bicep-planner, bicep-code→bicep-code-generator            |
| 2026-02-26 | Instructions  | Added ❌ markers to prohibited-refs list (fixed 3 false-positives in freshness checker) |
| 2026-02-26 | CI/Validation | Fixed check-docs-freshness.mjs agent table lookup to handle numbered-prefix filenames   |
| 2026-02-26 | Docs          | Fixed agent count 10→9, subagent count 5→8                                              |
| 2026-02-26 | Docs          | Added 5 missing skills to docs/README.md                                                |
| 2026-02-26 | Docs          | Added as-built agent + adversarial subagents                                            |
| 2026-02-26 | Skills        | Grade B→B+ (all 14 pass GA format validation)                                           |
| 2025-07-15 | Instructions  | Consolidated 28→20 (dedup + merge)                                                      |
| 2025-07-15 | Skills        | Added golden-principles skill + instruction                                             |
| 2025-07-15 | Agents        | Added golden-principles + AGENTS.md references                                          |
| 2025-07-15 | Docs          | Created exec-plans structure and QUALITY_SCORE                                          |

## How to Update

1. Run the doc-gardening prompt: `.github/prompts/doc-gardening.prompt.md`
2. Review findings and update grades above
3. Log changes in the Change Log table
4. Update `docs/exec-plans/tech-debt-tracker.md` for tracked debt items
