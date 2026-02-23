---
description: "Standards for user-facing documentation in the docs/ folder, including trigger conditions for updates"
applyTo: "docs/**/*.md, **/*.{js,mjs,cjs,ts,tsx,jsx,py,ps1,sh,bicep,tf}"
---

# Documentation Standards

Instructions for creating and maintaining user-facing documentation in the `docs/` folder.
Also defines WHEN documentation updates are triggered by code changes.

## Structure Requirements

### File Header

Every doc file must start with:

```markdown
# {Title}

> [Current Version](../../VERSION.md) | {One-line description}
```

### Single H1 Rule

Each file has exactly ONE H1 heading (the title). Use H2+ for all other sections.

### Link Style

- Use relative links for internal docs
- For root file references, increase `../` depth based on folder nesting
- Use reference-style links for external URLs
- No broken links (validated in CI)

## Content Principles

| Principle           | Application                               |
| ------------------- | ----------------------------------------- |
| **DRY**             | Single source of truth per topic          |
| **Current state**   | No historical context in main docs        |
| **Action-oriented** | Every section answers "how do I...?"      |
| **Minimal**         | If it doesn't help users today, remove it |
| **Progressive**     | Point to deeper docs when needed          |

## Documentation Update Triggers

Check if documentation updates are needed when any of these occur:

### Always Trigger

- New features or capabilities are added
- Breaking changes are introduced
- Installation or setup procedures change
- CLI commands or scripts are added/modified
- Dependencies or requirements change

### Check and Update If Applicable

- API endpoints, methods, or interfaces change
- Configuration options or environment variables are modified
- Code examples in documentation become outdated
- Agent or skill definitions are added, renamed, or removed
- Bicep module structure changes (new modules, renamed parameters)

### What to Update

- `README.md` (root): when agents, skills, or project structure changes
- `docs/README.md`: when agent/skill inventory changes
- `docs/prompt-guide/README.md`: when agents/skills are added or renamed
- `CHANGELOG.md`: any user-facing change (follow Keep a Changelog format)
- docs-writer references: when instruction files or agent/skill inventory changes

## Prohibited References

Do NOT reference these removed agents/skills:

- `diagram.agent.md`, `adr.agent.md`, `docs.agent.md`
- `azure-workload-docs`, `azure-deployment-preflight`, `orchestration-helper` skills
- `github-issues`, `github-pull-requests`, `gh-cli` skills
- `_shared/` directory

## Validation

Documentation is validated in CI (warn-only):

- No references to removed agents
- Version numbers match `VERSION.md`
- No broken internal links
- Markdown lint passes

After updating documentation:

1. Run `npm run lint:md` — zero errors required
2. Run `npm run lint:docs-freshness` — zero findings required
3. Verify all relative links resolve to existing files
