# Quality Score

> Project health at a glance. Updated by the doc-gardening workflow and manual review.

| Domain              | Grade | Gap Summary                                              | Next Action                              |
| ------------------- | ----- | -------------------------------------------------------- | ---------------------------------------- |
| **Agents**          | A-    | 15 agents + 11 subagents; 1 conductor frontmatter warn   | Fix conductor 'agents' array format warn |
| **Skills**          | B+    | All 14 skills pass GA format; 5 more planned for Phase C | Create C3 skills (nextjs, cosmos, etc.)  |
| **Instructions**    | A-    | 21 instructions; 0 errors, 7 info-level warnings         | Create C4 instructions (5 planned)       |
| **Infrastructure**  | B-    | Bicep patterns cover common cases; no Terraform          | Phase D infra execution                  |
| **Documentation**   | A-    | All counts updated; dead links resolved                  | Keep in sync after Phase C/D changes     |
| **CI / Validation** | B+    | 14 validators; freshness checker functional              | Wire up entropy-check.yml                |

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
| 2026-02-26 | Agents        | Added 6 app-dev agents (11-16) + 3 subagents; grade B+→A-                               |
| 2026-02-26 | Docs          | Updated README + AGENTS.md: counts 15+11, added app-dev agent tables                    |
| 2026-02-26 | Docs          | Resolved dead links (quickstart, workflow, glossary, troubleshooting, prompt-guide)     |
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
