# HackOps — Copilot Instructions

**HackOps** — Azure hackathon management platform.
Stack: Next.js 15 · TypeScript 5 · Azure SQL · App Service P1v3 · swedencentral.
App code lives in `apps/web/`. Read `AGENTS.md` for the full project map.
Be concise. Implement, don't suggest. No emojis.

## Session Continuity

Work spans many sessions. To resume:

1. Run `/session-resume` in Copilot Chat
2. Copilot reads `docs/exec-plans/active/hackops-execution.md` and continues

Backlog board: [GitHub Project #6](https://github.com/users/jonathan-vella/projects/6)

## Chat Triggers

- `gh` prefix → GitHub operation per `.github/skills/github-operations/SKILL.md`.
  Prefer GitHub MCP tools; fall back to `gh` CLI only when no MCP equivalent exists.
  Never run `gh auth` in devcontainers unless explicitly requested.
- Library/API docs → Context7 MCP auto-invokes per
  `.github/instructions/context7-mcp.instructions.md`.

## Verification

```bash
npm run validate          # repo validators
npm test                  # Vitest (target: ≥ 90% coverage)
npx tsc --noEmit          # TypeScript strict-mode
npm run lint:md           # Markdown lint
bicep build infra/bicep/{project}/main.bicep  # when editing IaC
```

## Guardrails

**Never:** commit secrets (use Key Vault/env vars) · B1/B2 SKUs or
`centralus` (use P1v3 + swedencentral) · raw Bicep without AVM ·
skip `npm run validate` · `console.log` in `src/` · modify `agent-output/`
without explicit user instruction

**Always:** run validators after editing agents/skills/instructions ·
managed identity for Azure service-to-service auth

## Where to Start

| Need                   | Go to                                    |
| ---------------------- | ---------------------------------------- |
| Project map & agents   | `AGENTS.md`                              |
| HackOps user guide     | `docs/hackops-user-guide.md`             |
| Domain rules & scoring | `.github/skills/hackops-domain/SKILL.md` |
| Local dev setup        | `docs/local-dev-guide.md`                |
