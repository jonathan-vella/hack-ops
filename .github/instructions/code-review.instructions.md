---
description: "Code review guidelines with priority tiers, security checks, and structured comment formats"
applyTo: "**/*.{js,mjs,cjs,ts,tsx,jsx,py,ps1,sh,bicep,tf}"
---

# Code Review Instructions

Shared review guidelines for all code in this repository.
Language-specific examples and checklists live in each language's
instruction file (see `## Code Review` section in each):

- **TypeScript**: `typescript.instructions.md`
- **JavaScript**: `javascript.instructions.md`
- **Python**: `python.instructions.md`
- **Shell**: `shell.instructions.md`
- **Bicep**: `bicep-code-best-practices.instructions.md`
- **PowerShell**: `powershell.instructions.md`
- **Markdown**: `markdown.instructions.md`

Language-specific instructions take precedence on any conflicting point.

## Review Language

Respond in **English**.

## Review Priorities

### 🔴 CRITICAL (Block merge)

- **Security**: Vulnerabilities, exposed secrets, auth issues
- **Correctness**: Logic errors, data corruption, race conditions
- **Breaking Changes**: API contract changes without versioning
- **Data Loss**: Risk of data loss or corruption

### 🟡 IMPORTANT (Requires discussion)

- **Code Quality**: Severe SOLID violations, excessive duplication
- **Test Coverage**: Missing tests for critical paths
- **Performance**: N+1 queries, memory leaks
- **Architecture**: Significant deviations from established patterns

### 🟢 SUGGESTION (Non-blocking)

- **Readability**: Poor naming, over-complex logic
- **Optimization**: Performance improvements without functional impact
- **Best Practices**: Minor convention deviations
- **Documentation**: Missing or incomplete docs

## General Principles

1. **Be specific**: Reference exact lines and provide concrete fixes
2. **Explain WHY**: State the impact, not just the violation
3. **Suggest solutions**: Show corrected code when applicable
4. **Be constructive**: Improve the code, don't criticize the author
5. **Recognize good work**: Acknowledge well-written code
6. **Be pragmatic**: Not every suggestion needs immediate action
7. **Group related comments**: Avoid duplicate comments on the same issue

## Security Review

- No passwords, API keys, tokens, or PII in code or logs
- All user inputs validated and sanitized
- Parameterized queries only — never string concatenation
- Authentication checks before resource access
- Authorization verified for each action
- Established crypto libraries — never roll your own
- Dependencies checked for known vulnerabilities

## Comment Format

```markdown
**[PRIORITY] Category: Brief title**

Description. **Why this matters:** impact. **Suggested fix:** code.
```

## Review Checklist

- [ ] Code follows style conventions; descriptive naming
- [ ] Functions are small, focused; no duplication
- [ ] Error handling appropriate; no silent failures
- [ ] No sensitive data in code or logs
- [ ] Input validation on all user inputs
- [ ] New code has test coverage; edge cases covered
- [ ] No obvious performance issues (N+1, memory leaks)
- [ ] Follows established architecture patterns
- [ ] Public APIs documented; README updated if needed

## Project Context

- **IaC**: Azure Bicep (AVM-first)
- **Scripting**: PowerShell 7+, Node.js `.mjs`, bash
- **Diagrams**: Python 3.10+ (diagrams library)
- **Architecture**: Multi-agent orchestration
- **Code Style**: Conventional Commits, 120-char lines
- **Security**: TLS 1.2+, HTTPS-only, managed identity, Azure AD-only auth
