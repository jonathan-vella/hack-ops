---
description: "Dependency management rules: always use latest stable, never use deprecated packages, enforce security and freshness"
applyTo: "**/package.json, **/*.{js,mjs,cjs,ts,tsx}"
---

# Dependency Management

Rules for selecting, installing, and maintaining npm and Python packages in this repository.

## Version Manifest (Single Source of Truth)

`.github/version-manifest.json` records the **approved minimum version** for
every dependency. No agent, PR, or script may propose a version below these
floors without explicit user authorization.

- Run `npm run validate:versions` to check all files against the manifest
- The manifest also records the approved Node.js, npm, and Python runtime versions

## Anti-Downgrade Policy

**Downgrading any dependency below the manifest floor is forbidden.**

- If a build breaks, fix the consuming code — do not lower the version
- If a dependency has a confirmed regression, the user must explicitly approve
  a temporary floor override in the manifest before any downgrade
- Agents must never silently propose older versions "for compatibility"

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
5. **Pin major, float minor** — use caret ranges (`^`) for npm and `>=` for
   Python to get patches automatically while preventing surprise major bumps
6. **Update the manifest** — when adding a new dependency or upgrading an
   existing one, update `.github/version-manifest.json` to match

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

- Target: Node.js 24 LTS (pinned in `.nvmrc` and `engines` field)
- The `engines` field in root `package.json` enforces `>=24.0.0`
- `.npmrc` has `engine-strict=true` to block installs on wrong versions

## Python Version

- Target: Python 3.13+ (pinned in `pyproject.toml` and devcontainer config)
- `requires-python = ">=3.13"` in both root and MCP `pyproject.toml`
- Ruff and mypy target `py313`

## Automated Guardrails

| Guardrail           | Where                                   | Enforcement    |
| ------------------- | --------------------------------------- | -------------- |
| Version manifest    | `.github/version-manifest.json`         | Anti-downgrade |
| `validate:versions` | `scripts/validate-version-manifest.mjs` | Blocks PR      |
| `npm audit`         | CI lint workflow                        | Blocks PR      |
| `npm outdated`      | CI lint workflow                        | Advisory       |
| Dependabot (npm)    | `.github/dependabot.yml`                | Weekly PRs     |
| Dependabot (pip)    | `.github/dependabot.yml`                | Weekly PRs     |
| Engine constraints  | `package.json` + `.npmrc`               | Blocks install |
| Node version pin    | `.nvmrc`, devcontainer config           | Dev + CI       |
| Python version pin  | `pyproject.toml`, devcontainer          | Dev + CI       |

## Upgrade Workflow

1. Run `npm outdated` and/or `pip list --outdated` to find upgrades
2. Update the dependency file(s) with the new range
3. Update `.github/version-manifest.json` with the new floor
4. Run `npm run validate:versions` to confirm compliance
5. Run full test suite to verify nothing broke
