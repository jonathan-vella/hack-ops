# Quality Score

> Project health at a glance. Updated by the doc-gardening workflow and manual review.

| Domain              | Grade | Gap Summary                                                  | Next Action                               |
| ------------------- | ----- | ------------------------------------------------------------ | ----------------------------------------- |
| **Agents**          | B+    | 9 agents + 8 subagents; conductor YAML fixed; 0 warnings     | Monitor for agent additions               |
| **Skills**          | B+    | 14 skills; all pass GA format validation                     | Add progressive-loading to azure-defaults |
| **Instructions**    | A-    | 21 instructions; 0 errors, 7 warnings in ref validation      | Monitor for drift after next feature add  |
| **Infrastructure**  | B-    | Bicep patterns cover common cases; no Terraform              | Expand hub-spoke pattern coverage         |
| **Documentation**   | B     | Counts fixed; 5 dead links in docs/README.md (missing pages) | Create quickstart.md, workflow.md, etc.   |
| **CI / Validation** | A-    | 14+ validators; entropy-check + validate alias wired         | Fix dead-link failures in validate:all    |

## Grading Scale

| Grade | Meaning                                                |
| ----- | ------------------------------------------------------ |
| A     | Excellent — mechanically enforced, minimal manual gaps |
| B     | Good — conventions documented, some manual enforcement |
| C     | Fair — known gaps, improvement plan exists             |
| D     | Poor — significant gaps, no active remediation         |
| F     | Critical — domain is broken or unmaintained            |

## Change Log

| Date       | Domain       | Change                                                   |
| ---------- | ------------ | -------------------------------------------------------- |
| 2026-02-26 | Agents       | Fixed conductor YAML + parser; 0 warnings now; B → B+    |
| 2026-02-26 | CI           | Added `validate` alias; fixed freshness-checker + parser |
| 2026-02-26 | Docs         | Fixed docs/README.md: 9+8 counts, added missing entries  |
| 2026-02-26 | CI           | entropy-check.yml confirmed wired; upgraded to A-        |
| 2026-02-26 | Skills       | All 14 pass GA validation; upgraded to B+                |
| 2026-02-26 | Agents       | Corrected count to 9 (not 10); downgraded to B           |
| 2025-07-15 | Instructions | Consolidated 28→20 (dedup + merge)                       |
| 2025-07-15 | Skills       | Added golden-principles skill + instruction              |
| 2025-07-15 | Agents       | Added golden-principles + AGENTS.md references           |
| 2025-07-15 | Docs         | Created exec-plans structure and QUALITY_SCORE           |

## How to Update

1. Run the doc-gardening prompt: `.github/prompts/doc-gardening.prompt.md`
2. Review findings and update grades above
3. Log changes in the Change Log table
4. Update `docs/exec-plans/tech-debt-tracker.md` for tracked debt items
