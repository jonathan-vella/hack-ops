---
description: "Auto-invoke Context7 MCP for library documentation and code generation assistance"
applyTo: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx"
---

# Context7 MCP Auto-Invoke Rules

Use Context7 MCP tools automatically when working with library APIs,
code generation, or framework patterns — no explicit user request required.

## When to Invoke

| Trigger                          | Action                                    |
| -------------------------------- | ----------------------------------------- |
| Need library API docs            | `resolve-library-id` → `query-docs`       |
| Generating code with a framework | Query latest patterns before writing code |
| Setup or configuration guidance  | Fetch current docs for the target library |
| Unsure about API signatures      | Verify with Context7 before hallucinating |

## Configuration

Context7 MCP server is configured in `.vscode/mcp.json` as an HTTP transport.

## Rules

- Prefer Context7 over memorized knowledge for library-specific APIs
- Always resolve the library ID first, then query docs
- Use the `topic` parameter to narrow results to relevant sections
- Do NOT invoke for general programming concepts — only library-specific APIs
