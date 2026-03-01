---
description: "Documentation and content creation standards for markdown files"
applyTo: "**/*.md"
---

# Markdown Documentation Standards

Standards for consistent, accessible markdown. These are the canonical style
reference for all markdown in this repository.

## General Rules

- ATX-style headings (`##`, `###`) — never use H1 (`#`) in content (reserved for title)
- **Line length limit: 120 characters** — enforced by CI and pre-commit hooks
- Break long lines after punctuation or before conjunctions
- LF line endings (enforced by `.gitattributes`)
- Meaningful alt text for all images
- Validate with `markdownlint` before committing

## Content Structure

| Element     | Rule                                 | Example                     |
| ----------- | ------------------------------------ | --------------------------- |
| Headings    | `##` for H2, `###` for H3, avoid H4+ | `## Section Title`          |
| Lists       | `-` for unordered, `1.` for ordered  | `- Item one`                |
| Code blocks | Fenced with language specifier       | ` ```bicep `                |
| Links       | Descriptive text, valid URLs         | `[Azure docs](https://...)` |
| Images      | Include alt text                     | `![Diagram](./diagram.png)` |
| Tables      | Align columns, include header row    | See below                   |

## Line Length

Break lines at 120 characters at natural points:

1. **Sentences**: Break after punctuation (period, comma, em-dash)
2. **Links**: Break before `[` or use reference-style for long URLs
3. **Code spans**: Use a code block if inline span exceeds limit

## Code Blocks

Always specify language for syntax highlighting:

```markdown
` ` `bicep
param location string = 'centralus'
` ` `
```

## Lists and Formatting

- Use `-` for bullets (not `*` or `+`)
- Use `1.` for numbered lists (auto-increment)
- Indent nested lists with 2 spaces
- Add blank lines before and after lists

## Links

- Descriptive text — never "click here"
- Verify all links are valid
- Prefer relative paths for internal links

## Callout Types

Supported: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`.

## Diagram Embeds

Prefer Python diagrams (`.png`/`.svg`) over Mermaid. Embed with:

```markdown
![Design Architecture](./03-des-diagram.png)

Source: `03-des-diagram.py`
```

## Template-First for Workflow Artifacts

Agents MUST follow canonical templates in `.github/skills/azure-artifacts/templates/`.
See `azure-artifacts.instructions.md` for heading reference and enforcement rules.

## Patterns to Avoid

| Anti-Pattern            | Solution                   |
| ----------------------- | -------------------------- |
| H1 in content           | Use H2 (`##`) as top level |
| Deep nesting (H4+)      | Restructure content        |
| Long lines (>120 chars) | Break at natural clauses   |
| Missing code language   | Specify language           |
| "Click here" links      | Use descriptive text       |

## Validation

```bash
markdownlint '**/*.md' --ignore node_modules --config .markdownlint.json
```
