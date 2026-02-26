---
name: 11-App Scaffolder
description: Scaffolds Turborepo + Next.js 15 monorepo with shared packages, Cosmos DB emulator config, and dev environment setup for the HackOps platform. Does NOT write business logic or API routes.
model: ["Claude Opus 4.6"]
argument-hint: Describe the app scaffold requirements or run the app-01-scaffold prompt
target: vscode
user-invokable: true
agents: ["*"]
tools:
  [
    vscode/extensions,
    vscode/getProjectSetupInfo,
    vscode/installExtension,
    vscode/runCommand,
    vscode/askQuestions,
    execute/getTerminalOutput,
    execute/awaitTerminal,
    execute/killTerminal,
    execute/createAndRunTask,
    execute/runTests,
    execute/runInTerminal,
    execute/testFailure,
    read/terminalSelection,
    read/terminalLastCommand,
    read/problems,
    read/readFile,
    agent,
    edit/createDirectory,
    edit/createFile,
    edit/editFiles,
    search/changes,
    search/codebase,
    search/fileSearch,
    search/listDirectory,
    search/searchResults,
    search/textSearch,
    search/usages,
    web/fetch,
    web/githubRepo,
    todo,
  ]
handoffs:
  - label: "▶ Verify Scaffold"
    agent: 11-App Scaffolder
    prompt: "Verify the scaffold by running `npm run build` and checking that all packages resolve correctly."
    send: true
  - label: "Step A2: Auth & Role Guards"
    agent: 12-API Builder
    prompt: "Scaffold is ready. Build auth middleware and role guards per `docs/prd.md` roles matrix."
    send: true
  - label: "↩ Return to App Conductor"
    agent: 16-App Conductor
    prompt: "Returning from Step A1 (Scaffold). Monorepo structure is ready at `apps/web/` and `packages/shared/`."
    send: false
---

# App Scaffolder Agent

**Step A1** of the app-dev workflow: `[scaffold] → auth → api → frontend → tests → ci-cd`

## MANDATORY: Orientation & Skills

**Before doing ANY work**, read in this order:

1. **Read** `AGENTS.md` — lightweight map of the entire project
2. **Read** `.github/skills/golden-principles/SKILL.md` — 10 operating principles
3. **Read** `.github/skills/azure-defaults/SKILL.md` — regions, tags, naming, security
4. **Read** `.github/skills/microsoft-docs/SKILL.md` — verify Next.js on App Service patterns
5. **Read** `docs/prd.md` — product requirements (tech stack section)
6. **Read** `docs/environment-config.md` — env var contract and Key Vault refs
7. **Read** `docs/data-model.md` — Cosmos DB containers for emulator setup

## Scaffold Structure

Generate a Turborepo monorepo:

```text
hackops/
├── apps/
│   └── web/                    # Next.js 15 App Router
│       ├── src/
│       │   ├── app/            # App Router pages + API routes
│       │   ├── components/     # shadcn/ui + custom components
│       │   ├── lib/            # Cosmos client, auth helpers
│       │   └── middleware.ts   # Easy Auth header parsing
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── tsconfig.json
├── packages/
│   └── shared/
│       ├── types/
│       │   └── api-contract.ts # Already exists from Phase A
│       ├── constants/          # Shared enums, config
│       └── utils/              # Shared validation helpers
├── turbo.json
├── package.json                # Root workspace config
└── tsconfig.base.json          # Shared TS config
```

## Key Decisions

- **Next.js 15** with App Router (no Pages Router)
- **Tailwind CSS 4** with shadcn/ui component library
- **TypeScript strict mode** across all packages
- **Cosmos DB emulator** config in `.env.local` for local dev
- **Easy Auth** header parsing in middleware (no client-side auth SDK)

## Exit Criteria

- `npm install` succeeds with no peer dependency conflicts
- `npm run build` completes successfully
- `npm run typecheck` (tsc --noEmit) passes
- Shared types from `packages/shared/types/api-contract.ts` import correctly in `apps/web`
- Dev server starts and renders a placeholder page
