---
applyTo: "**/agent-output/**/*.md, **/03-des-cost-estimate.md, **/07-ab-cost-estimate.md, **/docs/*-cost-estimate.md"
description: "MANDATORY template compliance rules for artifact generation"
---

# Artifact Generation Rules - MANDATORY

> **CRITICAL**: This file is the ENFORCEMENT TRIGGER for artifact H2 headings.
> All agents MUST use EXACT headings when generating artifacts.
> Violations block commits (pre-commit) and PRs (CI validation).

## H2 Heading Reference

The complete H2 heading lists for all 15 artifact types are maintained in
the `azure-artifacts` skill:

> Read `.github/skills/azure-artifacts/SKILL.md` § Template H2 Structures

Do NOT paraphrase or abbreviate headings. Copy-paste from the skill.

## Cost Estimate Standards

Cost estimates (`03-des-cost-estimate.md`, `07-ab-cost-estimate.md`) must:

- Start from the canonical template in `.github/skills/azure-artifacts/templates/`
- Include the required header (Generated date, Region, Environment, MCP Tools,
  Architecture Reference)
- Use emoji visual standards (status indicators, category icons, trend indicators)
- Source ALL prices from `cost-estimate-subagent` — never hardcode dollar amounts

For full cost estimate section guidance, read the `azure-artifacts` skill.

## Enforcement Layers

| Layer           | Mechanism                                      | When                 |
| --------------- | ---------------------------------------------- | -------------------- |
| 1. Instructions | This file auto-applies to all agent-output     | Generation time      |
| 2. Pre-commit   | `npm run lint:artifact-templates` via Lefthook | Before commit        |
| 3. CI/CD        | Same validation in GitHub Actions              | Before merge         |
| 4. Auto-fix     | `npm run fix:artifact-h2`                      | On-demand correction |

## Quick Fix Command

```bash
# Analyze what's wrong
npm run fix:artifact-h2 agent-output/{project}/{file}.md

# Auto-fix where possible
npm run fix:artifact-h2 agent-output/{project}/{file}.md --apply
```

## Common Errors and Fixes

If you see:

```text
missing required H2 headings: ## Outputs (Expected)
```

**Fix**: You used `## Outputs` instead of `## Outputs (Expected)`. Use the EXACT text.

If you see:

```text
contains extra H2 headings: ## Cost Summary
```

**Fix**: `## Cost Summary` is not in the template. Either:

1. Remove it
2. Change to H3: `### Cost Summary` (under a valid H2)
3. Move after `## References` as optional section

## Quick Reference Card

| Artifact               | First H2                             | Last Required H2                            |
| ---------------------- | ------------------------------------ | ------------------------------------------- |
| 01-requirements        | `## 🎯 Project Overview`             | `## 📋 Summary for Architecture Assessment` |
| 02-architecture        | `## ✅ Requirements Validation`      | `## 🔒 Approval Gate`                       |
| 04-implementation-plan | `## 📋 Overview`                     | `## 🔒 Approval Gate`                       |
| 04-governance          | `## 🔍 Discovery Source`             | `## 🌐 Network Policies`                    |
| 04-preflight           | `## 🎯 Purpose`                      | `## 🚀 Ready for Implementation`            |
| 05-implementation-ref  | `## 📁 Bicep Templates Location`     | `## 📝 Key Implementation Notes`            |
| 06-deployment          | `## ✅ Preflight Validation`         | `## 📝 Post-Deployment Tasks`               |
| 07-doc-index           | `## 📦 1. Document Package Contents` | `## ⚡ 5. Quick Links`                      |
| 07-design              | `## 📝 1. Introduction`              | `## 📎 10. Appendix`                        |
| 07-runbook             | `## ⚡ Quick Reference`              | `## 📝 6. Change Log`                       |
| 07-inventory           | `## 📊 Summary`                      | `## 📦 Resource Listing`                    |
| 07-backup-dr           | `## 📋 Executive Summary`            | `## 📎 9. Appendix`                         |
| 07-compliance          | `## 📋 Executive Summary`            | `## 📎 6. Appendix`                         |
| 07-cost                | `## 💵 Cost At-a-Glance`             | `## 🧾 Detailed Cost Breakdown`             |
