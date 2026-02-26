# Tech Debt Tracker

> [Current Version](../../VERSION.md) | Running inventory of known debt and quality gaps

Updated by the doc-gardening workflow and referenced by `QUALITY_SCORE.md`.

## Active Debt Items

| ID  | Category      | Description                                                        | Severity | Owner | Target  |
| --- | ------------- | ------------------------------------------------------------------ | -------- | ----- | ------- |
| 5   | Agents        | 01-conductor.agent.md 'agents' frontmatter format warning          | Low      | —     | —       |
| 7   | Documentation | AGENTS.md missing app-dev workflow table (only infra 7-step shown) | Low      | —     | Phase F |
| 9   | Instructions  | 7 applyTo warnings (wildcards) — cosmetic, not blocking            | Low      | —     | —       |
| 12  | Artifact      | Template drift: 01-req, 02-arch, 04-gov (14 warn)                  | Low      | —     | Phase E |

## Resolved Items

| ID  | Category      | Description                                          | Resolved   | Resolution                                |
| --- | ------------- | ---------------------------------------------------- | ---------- | ----------------------------------------- |
| 11  | CI/Validation | `npm run validate` script missing from package.json  | 2026-02-26 | Added `validate` alias → `validate:all`   |
| 8   | Documentation | docs/README.md GitHub URLs point to old repo name    | 2026-02-26 | Fixed URLs to `hack-ops`                  |
| 10  | Validation    | 06-deployment-summary template missing attribution   | 2026-02-26 | Added attribution header to template      |
| 4   | Validation    | entropy-check.yml CI workflow not yet wired up       | 2026-02-27 | Workflow has schedule + dispatch triggers |
| 6   | Documentation | Dead links in docs/README.md                         | 2026-02-26 | Replaced with Phase A doc links           |
| 3   | Documentation | docs.instructions.md prohibited-refs false-positives | 2026-02-26 | Added markers; checker skips prohibitions |
| 1   | Documentation | docs/README.md agent/skill counts were stale         | 2026-02-26 | Fixed counts: 15+11 agents, 14 skills     |
| 2   | Instructions  | Instruction consolidation just completed             | 2025-07-15 | Consolidated 28→20; no duplicates remain  |

## Categories

- **Documentation**: Stale docs, broken links, incorrect counts
- **Instructions**: Overlapping rules, orphaned references
- **Skills**: Outdated guidance, missing coverage
- **Validation**: Missing CI checks, untested rules
- **Infrastructure**: Bicep patterns, module gaps
