# Tech Debt Tracker

> [Current Version](../../VERSION.md) | Running inventory of known debt and quality gaps

Updated by the doc-gardening workflow and referenced by `QUALITY_SCORE.md`.

## Active Debt Items

| ID  | Category     | Description                                                    | Severity | Added      |
| --- | ------------ | -------------------------------------------------------------- | -------- | ---------- |
| 15  | Skills       | 5 app-dev skills never committed: hackops-domain,              | High     | 2026-02-27 |
|     |              | nextjs-patterns, cosmos-db-sdk, shadcn-ui-patterns,            |          |            |
|     |              | zod-validation. Referenced by 3 agents + 10 prompts.           |          |            |
| 16  | Instructions | 5 app-dev instructions never committed: typescript,            | High     | 2026-02-27 |
|     |              | nextjs, react-components, testing, api-routes.                 |          |            |
|     |              | Session 8 tracker says created but git log empty.              |          |            |
| 17  | CI/Lint      | `next lint` broken: ESLint 10 + eslint-config-next             | Medium   | 2026-02-27 |
|     |              | circular structure error. `npx next lint` exits 1.             |          |            |
|     |              | Root cause: FlatCompat + ESLint 10 incompatibility.            |          |            |
| 18  | Templates    | Phase C5 app issue templates missing: `app-feature.yml`        | Low      | 2026-02-27 |
|     |              | and `app-bug.yml` never committed. Only infra templates exist. |          |            |
| 19  | Validation   | `scripts/validate-business-rules.mjs` never committed.         | Medium   | 2026-02-27 |
|     |              | Phase C6 tracker says created + registered in package.json     |          |            |
|     |              | but neither file nor script entry exists.                      |          |            |
| 20  | Tracker      | Session tracker Phase C checkboxes marked done for artifacts   | Medium   | 2026-02-27 |
|     |              | that were never committed. Phantom completions for C3-C6       |          |            |
|     |              | items need correction after recreation.                        |          |            |

## Resolved Items

| ID  | Category      | Description                                                         | Resolved   | Resolution                                           |
| --- | ------------- | ------------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| 13  | CI/CD         | Phase 11 workflows missing (`hackops-ci.yml`, `hackops-deploy.yml`) | 2026-02-27 | Created both workflows with OIDC + path triggers     |
| 9   | Instructions  | 5 applyTo warnings (wildcards) — cosmetic, not blocking             | 2026-02-27 | Fixed globHasMatch to expand braces and strip `**/`  |
| 7   | Documentation | AGENTS.md missing app-dev workflow table (only infra 7-step shown)  | 2026-02-27 | Added App-Dev Workflow table to AGENTS.md            |
| 5   | Agents        | 01-conductor.agent.md 'agents' frontmatter format warning           | 2026-02-27 | Validator passes clean; warning no longer reproduces |
| 14  | Documentation | docs/README.md agent count 15→16, skill count 14→15                 | 2026-02-27 | Added context-optimizer agent + skill to docs        |
| 11  | CI/Validation | `npm run validate` script missing from package.json                 | 2026-02-26 | Added `validate` alias → `validate:all`              |
| 8   | Documentation | docs/README.md GitHub URLs point to old repo name                   | 2026-02-26 | Fixed URLs to `hack-ops`                             |
| 10  | Validation    | 06-deployment-summary template missing attribution                  | 2026-02-26 | Added attribution header to template                 |
| 4   | Validation    | entropy-check.yml CI workflow not yet wired up                      | 2026-02-27 | Workflow has schedule + dispatch triggers            |
| 6   | Documentation | Dead links in docs/README.md                                        | 2026-02-26 | Replaced with Phase A doc links                      |
| 3   | Documentation | docs.instructions.md prohibited-refs false-positives                | 2026-02-26 | Added markers; checker skips prohibitions            |
| 1   | Documentation | docs/README.md agent/skill counts were stale                        | 2026-02-26 | Fixed counts: 15+11 agents, 14 skills                |
| 2   | Instructions  | Instruction consolidation just completed                            | 2025-07-15 | Consolidated 28→20; no duplicates remain             |

## Categories

- **Documentation**: Stale docs, broken links, incorrect counts
- **Instructions**: Overlapping rules, orphaned references
- **Skills**: Outdated guidance, missing coverage
- **Validation**: Missing CI checks, untested rules
- **Infrastructure**: Bicep patterns, module gaps
