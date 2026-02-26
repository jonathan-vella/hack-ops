# Tech Debt Tracker

> [Current Version](../../VERSION.md) | Running inventory of known debt and quality gaps

Updated by the doc-gardening workflow and referenced by `QUALITY_SCORE.md`.

## Active Debt Items

| ID  | Category      | Description                                                                                                             | Severity | Owner | Target Date |
| --- | ------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | ----- | ----------- |
| 4   | Validation    | entropy-check.yml CI workflow not yet wired up                                                                          | Medium   | —     | —           |
| 5   | Agents        | 01-conductor.agent.md 'agents' frontmatter format warning                                                               | Low      | —     | —           |
| 6   | Documentation | docs/README.md links to quickstart.md, workflow.md, troubleshooting.md, GLOSSARY.md, prompt-guide/ — verify these exist | Medium   | —     | —           |

## Resolved Items

| ID  | Category      | Description                                                               | Resolved Date | Resolution                                                        |
| --- | ------------- | ------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| 3   | Documentation | docs.instructions.md prohibited-refs false-positives in freshness checker | 2026-02-26    | Added ❌ markers; checker now skips documentation-of-prohibitions |
| 1   | Documentation | docs/README.md agent/skill counts were stale                              | 2026-02-26    | Fixed counts: 9+8 agents, added 5 missing skills                  |
| 2   | Instructions  | Instruction consolidation just completed                                  | 2025-07-15    | Consolidated 28→20; verified no duplicates remain                 |

## Categories

- **Documentation**: Stale docs, broken links, incorrect counts
- **Instructions**: Overlapping rules, orphaned references
- **Skills**: Outdated guidance, missing coverage
- **Validation**: Missing CI checks, untested rules
- **Infrastructure**: Bicep patterns, module gaps
