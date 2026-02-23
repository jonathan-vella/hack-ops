# Agentic InfraOps - Copilot Instructions

> Azure infrastructure engineered by agents. Verified. Well-Architected. Deployable.

## Map

**Read `AGENTS.md` first** — it is the lightweight table of contents for the entire project.
It covers the 7-step workflow, agent roster, skill/instruction locations, and key conventions.

## Quick Start

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
