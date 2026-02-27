---
description: "Dependency management rules: always use latest stable, never use deprecated packages, enforce security and freshness"
applyTo: "**/package.json, **/*.{js,mjs,cjs,ts,tsx}"
---

# Dependency Management

Rules for selecting, installing, and maintaining npm packages in this repository.

## Core Rules

1. **Always use latest stable** — when adding a new dependency, install the
   current stable release, not an older version
2. **Never use deprecated packages** — if `npm warn deprecated` fires for a
   direct dependency, replace it immediately
3. **Prefer platform-native APIs** — use Node.js built-ins over npm packages
   (e.g., native `DOMException` over `node-domexception`, native `fetch` over
   `node-fetch`)
4. **Minimize dependencies** — every added package increases attack surface;
   justify each addition
5. **Pin major, float minor** — use caret ranges (`^`) to get patches
   automatically while preventing surprise major bumps

## Security

- `npm audit` must pass with zero moderate+ vulnerabilities before merge
- CI enforces this via the lint workflow's "Security audit" step
- If a transitive dependency has a vulnerability, upgrade the parent package
  or add an override in `package.json`

## Version Ranges

```text
# Correct — caret range, latest stable major
"next": "^15.3.0"

# Wrong — pinned to old version
"next": "14.0.0"

# Wrong — wildcard allows breaking changes
"next": "*"
```

## Adding Dependencies

Before adding any package:

1. Check if a Node.js built-in or existing dependency already covers the need
2. Verify the package is actively maintained (last publish < 6 months)
3. Check `npm audit` output — do not add packages with known vulnerabilities
4. Prefer packages with TypeScript types included (not separate `@types/` when
   the package ships its own)

## Deprecated Package Handling

When encountering a deprecated package warning:

- **Direct dependency:** replace with the recommended alternative immediately
- **Transitive dependency:** upgrade the parent package that pulls it in; if
  the parent has no fix, open an issue or add an `overrides` entry
- **Common replacements:**
  - `node-domexception` → use native `DOMException` (available since Node 18)
  - `node-fetch` → use native `fetch` (available since Node 18)
  - `querystring` → use `URLSearchParams`
  - `uuid` → use `crypto.randomUUID()`

## Node.js Version

- Target: Node.js 22 LTS (pinned in `.nvmrc` and `engines` field)
- The `engines` field in root `package.json` enforces `>=22.0.0`
- `.npmrc` has `engine-strict=true` to block installs on wrong versions

## Automated Guardrails

| Guardrail                | Where                         | Enforcement |
| ------------------------ | ----------------------------- | ----------- |
| `npm audit`              | CI lint workflow               | Blocks PR   |
| `npm outdated`           | CI lint workflow               | Advisory    |
| Dependabot               | `.github/dependabot.yml`      | Weekly PRs  |
| Engine constraints       | `package.json` + `.npmrc`     | Blocks install |
| Node version pin         | `.nvmrc`, devcontainer config | Dev + CI    |
