---
name: github-operations
description: Handles GitHub issues, pull requests, repositories, Actions, releases, and API tasks using MCP-first workflows with gh CLI fallback for advanced operations.
license: MIT
metadata:
  author: azure-agentic-infraops
  version: "3.0"
  category: github
---

# GitHub Operations

Manage all GitHub operations using MCP tools (preferred) and GitHub CLI (fallback).

> **MCP-first**: Use MCP tools for issues and PRs — no extra auth, works everywhere.
> **CLI fallback**: Use `gh` CLI for Actions, releases, repos, secrets, and API calls.

## Reference Files (Load on Demand)

| File | When to Load |
| ---- | ------------ |
| `references/mcp-tools.md` | Creating/managing issues and pull requests via MCP |
| `references/gh-cli.md` | Actions, releases, repos, secrets, API — CLI fallback |

---

## MCP Priority Protocol (Mandatory)

Follow this protocol for every GitHub task:

1. Identify required operation (issue, PR, search, Actions, release, repo admin, etc.)
2. Check whether an MCP tool exists for that exact operation
3. If MCP exists, use MCP only
4. Use `gh` CLI only when no equivalent MCP write tool is available

### Devcontainer Reliability Rule

- Do not run `gh auth login` or `gh auth status` in devcontainer workflows
  unless the user explicitly asks for CLI auth troubleshooting.
- For PR/issue creation, rely on MCP tool authentication by default.
- If MCP write tools are missing in the current environment,
  report the limitation explicitly and provide a no-auth fallback path
  (for example, PR compare URL).

---

## Decision Matrix

| Operation | Tool | Reference |
| --------- | ---- | --------- |
| Create/read/update issues | MCP (`mcp_github_issue_write`, `mcp_github_issue_read`) | `references/mcp-tools.md` |
| Search issues | MCP (`mcp_github_search_issues`) | `references/mcp-tools.md` |
| Create/merge/review PRs | MCP (`mcp_github_create_pull_request`, etc.) | `references/mcp-tools.md` |
| List/search PRs | MCP (`mcp_github_list_pull_requests`, etc.) | `references/mcp-tools.md` |
| Repo create/clone/fork | `gh repo` | `references/gh-cli.md` |
| Workflow run/list/watch | `gh workflow`, `gh run` | `references/gh-cli.md` |
| Releases | `gh release` | `references/gh-cli.md` |
| Secrets & variables | `gh secret`, `gh variable` | `references/gh-cli.md` |
| REST/GraphQL API | `gh api` | `references/gh-cli.md` |
| Labels | `gh label` | `references/gh-cli.md` |
| Search code/repos | `gh search` | `references/gh-cli.md` |

---

## DO / DON'T

- **DO**: Use MCP tools first for issues and PRs
- **DO**: Use `gh` CLI for Actions, releases, repos, secrets, API
- **DO**: Explain when MCP write tools are unavailable and why fallback is required
- **DO**: Confirm repository context before creating issues/PRs
- **DO**: Search for existing issues/PRs before creating duplicates
- **DO**: Check for PR templates before creating PRs
- **DO**: Ask for missing critical information rather than guessing
- **DON'T**: Create issues/PRs without confirming repo owner and name
- **DON'T**: Merge PRs without user confirmation
- **DON'T**: Use `gh` CLI for issues/PRs when MCP tools are available
- **DON'T**: Attempt `gh` auth flows in devcontainers unless explicitly requested

---

## References

- GitHub CLI Manual: https://cli.github.com/manual/
- REST API: https://docs.github.com/en/rest
- GraphQL API: https://docs.github.com/en/graphql
