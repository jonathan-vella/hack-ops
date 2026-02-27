# Quality Score

> Project health at a glance. Updated by the doc-gardening workflow and manual review.

| Domain              | Grade | Gap Summary                                                     | Next Action                                                                                 |
| ------------------- | ----- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Agents**          | A     | 16 agents + 11 subagents; all pass validation                   | Maintain as agents are added                                                                |
| **Skills**          | C     | 15 committed pass GA; 5 app-dev skills never committed          | Recreate hackops-domain, nextjs-patterns, cosmos-db-sdk, shadcn-ui-patterns, zod-validation |
| **Instructions**    | B     | 23 on disk; 5 app-dev instructions never committed              | Recreate typescript, nextjs, react-components, testing, api-routes instructions             |
| **Infrastructure**  | B+    | Core Bicep modules + deployment artifacts complete              | Finish open Phase 4 items (#147, #148)                                                      |
| **Application**     | B     | Auth + hackathon/team/join API complete; 60 tests; lint broken  | Fix `next lint` (ESLint 10 + Next 16 compat); complete remaining 7 app prompts              |
| **Documentation**   | A-    | Docs mostly fresh; session tracker has phantom completions      | Correct Phase C checkmarks in session tracker                                               |
| **CI / Validation** | A-    | 14 validators pass; `next lint` broken (ESLint 10 circular ref) | Fix ESLint config or pin eslint-config-next                                                 |
| **Backlog**         | A     | Issue hygiene maintained; all tech debt resolved                | Continue closure cadence by milestone                                                       |

## Grading Scale

| Grade | Meaning                                                |
| ----- | ------------------------------------------------------ |
| A     | Excellent — mechanically enforced, minimal manual gaps |
| B     | Good — conventions documented, some manual enforcement |
| C     | Fair — known gaps, improvement plan exists             |
| D     | Poor — significant gaps, no active remediation         |
| F     | Critical — domain is broken or unmaintained            |

## Change Log

| Date       | Domain         | Change                                                                                  |
| ---------- | -------------- | --------------------------------------------------------------------------------------- |
| 2026-02-27 | Application    | New domain at B: auth + hackathon CRUD + join + teams; 60 tests; lint broken            |
| 2026-02-27 | Skills         | Grade A→C: 5 app-dev skills never committed (hackops-domain + 4 others); debt #15       |
| 2026-02-27 | Instructions   | Grade A→B: 5 app-dev instructions never committed; debt #16                             |
| 2026-02-27 | CI/Validation  | Grade A→A-: `next lint` broken (ESLint 10 circular ref with Next 16); debt #17          |
| 2026-02-27 | Documentation  | Grade A→A-: Phase C items marked complete in tracker but artifacts missing; debt #18    |
| 2026-02-27 | Agents         | Grade A-→A: conductor warning no longer reproduces; all 16 agents pass                  |
| 2026-02-27 | Instructions   | Grade A-→A: fixed globHasMatch brace expansion + `**/` stripping; 0 warnings            |
| 2026-02-27 | Documentation  | Grade A-→A: added app-dev workflow table to AGENTS.md; counts correct                   |
| 2026-02-27 | CI/Validation  | Created hackops-ci.yml + hackops-deploy.yml; resolved debt #13                          |
| 2026-02-27 | Documentation  | Doc-gardening: fixed agent count 15→16, skill count 14→15 in docs/README.md             |
| 2026-02-27 | Skills         | Grade A-→A after 15/15 GA skills valid                                                  |
| 2026-02-27 | Documentation  | Grade A→A- (count drift detected; context-optimizer agent+skill missing from docs)      |
| 2026-02-26 | All            | Doc-gardening: freshness clean; artifacts lint warning-free; debt #12 resolved          |
| 2026-02-26 | Skills         | Grade B+→A- after 14/14 GA skills valid and stable                                      |
| 2026-02-26 | Instructions   | Warning count updated from 7→5 (all non-blocking applyTo notices)                       |
| 2026-02-26 | Infrastructure | Grade B→B+ (HackOps Bicep modules + Step 6/7 artifacts completed)                       |
| 2026-02-26 | All            | Doc-gardening: 14 validators green, 0 errors; Infra B-→B (D4 done); debt #12 updated    |
| 2026-02-26 | CI/Validation  | Added `validate` alias to package.json; resolved debt #11; grade A-→A                   |
| 2026-02-26 | Backlog        | Created 105 GitHub issues (15 epics + 64 PRD + 25 infra), GitHub Project #6             |
| 2026-02-26 | Docs           | Fixed docs/README.md GitHub URLs from old repo name; grade A-→A; resolved debt #8       |
| 2026-02-26 | CI/Validation  | Found `validate` script alias missing from package.json; added debt #11                 |
| 2026-02-26 | CI/Validation  | Fixed tech-debt-tracker line-length lint errors (7 MD013 violations)                    |
| 2026-02-26 | CI/Validation  | Fixed 06-deployment-summary.template.md missing attribution header; grade B+→A-         |
| 2026-02-26 | Agents         | Added 6 app-dev agents (11-16) + 3 subagents; grade B+→A-                               |
| 2026-02-26 | Docs           | Updated README + AGENTS.md: counts 15+11, added app-dev agent tables                    |
| 2026-02-26 | Docs           | Resolved dead links (quickstart, workflow, glossary, troubleshooting, prompt-guide)     |
| 2026-02-26 | Docs           | Fixed agent table: bicep-plan→bicep-planner, bicep-code→bicep-code-generator            |
| 2026-02-26 | Instructions   | Added ❌ markers to prohibited-refs list (fixed 3 false-positives in freshness checker) |
| 2026-02-26 | CI/Validation  | Fixed check-docs-freshness.mjs agent table lookup to handle numbered-prefix filenames   |
| 2026-02-26 | Docs           | Fixed agent count 10→9, subagent count 5→8                                              |
| 2026-02-26 | Docs           | Added 5 missing skills to docs/README.md                                                |
| 2026-02-26 | Docs           | Added as-built agent + adversarial subagents                                            |
| 2026-02-26 | Skills         | Grade B→B+ (all 14 pass GA format validation)                                           |
| 2025-07-15 | Instructions   | Consolidated 28→20 (dedup + merge)                                                      |
| 2025-07-15 | Skills         | Added golden-principles skill + instruction                                             |
| 2025-07-15 | Agents         | Added golden-principles + AGENTS.md references                                          |
| 2025-07-15 | Docs           | Created exec-plans structure and QUALITY_SCORE                                          |

## How to Update

1. Run the doc-gardening prompt: `.github/prompts/doc-gardening.prompt.md`
2. Review findings and update grades above
3. Log changes in the Change Log table
4. Update `docs/exec-plans/tech-debt-tracker.md` for tracked debt items
