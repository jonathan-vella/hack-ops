# Quality Score

> Project health at a glance. Updated by the doc-gardening workflow and manual review.

| Domain              | Grade | Gap Summary                                              | Next Action                              |
| ------------------- | ----- | -------------------------------------------------------- | ---------------------------------------- |
| **Agents**          | A-    | 15 agents + 11 subagents; 1 conductor frontmatter warn   | Fix conductor 'agents' array format warn |
| **Skills**          | B+    | All 14 skills pass GA format; 5 more planned for Phase C | Create C3 skills (nextjs, cosmos, etc.)  |
| **Instructions**    | A-    | 21 instructions; 0 errors, 7 info-level warnings         | Create C4 instructions (5 planned)       |
| **Infrastructure**  | B     | Governance constraints + impl plan done; Bicep pending   | Phase D5-D6 Bicep code generation        |
| **Documentation**   | A     | All docs fresh; dead links resolved; URLs fixed          | Keep in sync after Phase D/E changes     |
| **CI / Validation** | A     | 14 validators; all pass; `validate` alias added          | Maintain as new validators are added     |
| **Backlog**         | A     | 105 issues, 15 epics, 13 milestones, GitHub Project #6   | Begin Phase D execution                  |

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
| 2026-02-26 | All           | Doc-gardening: 14 validators green, 0 errors; Infra B-→B (D4 done); debt #12 updated    |
| 2026-02-27 | All           | Doc-gardening: all 5 validators green; grades hold; resolved debt #4; added debt #12    |
| 2026-02-26 | CI/Validation | Added `validate` alias to package.json; resolved debt #11; grade A-→A                   |
| 2026-02-26 | Backlog       | Created 105 GitHub issues (15 epics + 64 PRD + 25 infra), GitHub Project #6             |
| 2026-02-26 | Docs          | Fixed docs/README.md GitHub URLs from old repo name; grade A-→A; resolved debt #8       |
| 2026-02-26 | CI/Validation | Found `validate` script alias missing from package.json; added debt #11                 |
| 2026-02-26 | CI/Validation | Fixed tech-debt-tracker line-length lint errors (7 MD013 violations)                    |
| 2026-02-26 | CI/Validation | Fixed 06-deployment-summary.template.md missing attribution header; grade B+→A-         |
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
