# Agentic InfraOps - Copilot Instructions

> Azure infrastructure engineered by agents. Verified. Well-Architected. Deployable.

## Map

**Read `AGENTS.md` first** — it is the lightweight table of contents for the entire project.
It covers the 7-step workflow, agent roster, skill/instruction locations, and key conventions.

## HackOps Project

HackOps is the active project being built in this repo — an Azure hackathon
management platform (Next.js 15 + Cosmos DB + App Service).

| Resource                                          | Purpose                                       |
| ------------------------------------------------- | --------------------------------------------- |
| `docs/hackops-user-guide.md`                      | Step-by-step runbook — start here             |
| `.github/prompts/plan-hackOpsExecution.prompt.md` | Execution blueprint (6 phases, ~44 artifacts) |
| `docs/exec-plans/active/hackops-execution.md`     | Session tracker — living progress checklist   |
| `.github/prompts/session-resume.prompt.md`        | Run `/session-resume` at each session start   |
| `.github/prompts/plan-hackOps.prompt.md`          | Original technical plan (feature specs)       |
| [GitHub Project #6][hackops-board]                | Backlog board — HackOps Backlog               |

[hackops-board]: https://github.com/users/jonathan-vella/projects/6

### Session Continuity

Work spans many sessions. To resume:

1. Run `/session-resume` in Copilot Chat
2. The agent reads the session tracker, loads context, and continues

### Execution Order

B0 Bootstrap issues → A Product docs → C Toolchain → B Backlog →
D Infrastructure → E App build → F Supporting artifacts

See `docs/hackops-user-guide.md` for the full walkthrough.

## Quick Start (Infrastructure)

1. Enable subagents: `"github.copilot.chat": { "customAgentInSubagent": { "enabled": true } }`
2. Open Chat (`Ctrl+Shift+I`) → Select **InfraOps Conductor** → Describe your project
3. The Conductor guides you through all 7 steps with approval gates

## Chat Triggers

- If a user message starts with `gh`, treat it as a GitHub operation.
  Examples: `gh pr create ...`, `gh workflow run ...`, `gh api ...`.
- Automatically follow the `github-operations` skill guidance (MCP-first, `gh` CLI fallback) from `.github/skills/github-operations/SKILL.md`.

### GitHub MCP Priority (Mandatory)

- For issues and pull requests, always prefer GitHub MCP tools over `gh` CLI.
- Only use `gh` for operations that have no equivalent MCP write tool in the current environment.
- In devcontainers, do not run `gh auth` commands unless the user explicitly asks for CLI authentication troubleshooting.

## Validation

```bash
npm run validate
npm run lint:md
bicep build infra/bicep/{project}/main.bicep
```
