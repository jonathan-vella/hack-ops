# Tech Debt Tracker

> [Current Version](../../VERSION.md) | Running inventory of known debt and quality gaps

Updated by the doc-gardening workflow and referenced by `QUALITY_SCORE.md`.

## Active Debt Items

| ID  | Category      | Description                                                                                                 | Severity | Owner | Target Date |
| --- | ------------- | ----------------------------------------------------------------------------------------------------------- | -------- | ----- | ----------- |
| 7   | Documentation | 5 dead links in docs/README.md (quickstart.md, workflow.md, prompt-guide/, troubleshooting.md, GLOSSARY.md) | Medium   | —     | —           |
| 8   | Documentation | docs/hackops-user-guide.md links to non-existent agent-output/hackops/challenge-findings.json               | Low      | —     | —           |
| 9   | Instructions  | 7 `applyTo` warnings in instruction-references validator (patterns match but with caveats)                  | Low      | —     | —           |

## Resolved Items

| ID  | Category      | Description                                                                             | Resolved Date | Resolution                                             |
| --- | ------------- | --------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------ |
| 1   | Documentation | docs/README.md agent/skill counts were stale                                            | 2026-02-26    | Fixed to 9+8 agents, added 5 missing skills + as-built |
| 2   | Instructions  | Instruction consolidation just completed                                                | 2026-02-26    | Stable at 21 instructions; 0 errors in validation      |
| 3   | Validation    | `npm run validate` missing — AGENTS.md references it but only `validate:all` exists     | 2026-02-26    | Added `validate` alias in package.json                 |
| 4   | Agents        | 01-conductor.agent.md `agents` YAML flow-sequence triggers style warning                | 2026-02-26    | Converted to block-sequence YAML + fixed parser        |
| 5   | Documentation | docs.instructions.md prohibited-refs section triggers freshness-checker false positives | 2026-02-26    | Fixed checker to skip "Prohibited References" section  |
| 6   | Instructions  | Freshness checker mismatched agent names without numbered prefixes                      | 2026-02-26    | Fixed checker to match numbered-prefix agent files     |

## Categories

- **Documentation**: Stale docs, broken links, incorrect counts
- **Instructions**: Overlapping rules, orphaned references
- **Skills**: Outdated guidance, missing coverage
- **Validation**: Missing CI checks, untested rules
- **Infrastructure**: Bicep patterns, module gaps
