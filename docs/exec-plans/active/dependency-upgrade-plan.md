# Dependency Upgrade & Guardrails Plan

**Created:** 2026-02-27
**Status:** Phase 1 + Phase 2 complete — Phase 3 deferred
**Tracking:** [hackops-execution.md](hackops-execution.md)

## Problem Statement

During app scaffolding (`npx shadcn@latest add ...`), two warnings surfaced:

1. **`npm warn deprecated node-domexception@1.0.0`** — transitive dep pulled by
   `shadcn` CLI at install-time (not in our lockfile); the package tells users to
   use the platform-native `DOMException` instead.
2. **`NODE_TLS_REJECT_UNAUTHORIZED=0`** — set by the shadcn CLI's internal
   `node-fetch` usage, not by our code. No project file sets this variable.

These are **not bugs in our code** but they reveal a gap: we have zero automated
guardrails for dependency freshness, security vulnerabilities, or deprecated
transitive packages.

---

## Current State

### Runtime & Toolchain

| Component    | Current     | Latest Stable  | Action      |
| ------------ | ----------- | -------------- | ----------- |
| Node.js      | 24.13.1     | 24.x (current) | None — fine |
| npm          | 11.8.0      | 11.x           | None — fine |
| Python       | 3.13        | 3.13           | None — fine |
| devcontainer | `node: lts` | —              | Pin to `22` |

> **Note:** Node 24 is the _Current_ release line (not LTS). The devcontainer
> requests `lts` but gets 24 because of the base image. For production stability,
> pin to Node 22 LTS explicitly.

### Root `package.json` — dev dependencies

| Package                           | Pinned Range | Installed | Latest | Breaking?        |
| --------------------------------- | ------------ | --------- | ------ | ---------------- |
| `@commitlint/cli`                 | `^20.4.1`    | 20.4.1    | 20.4.2 | No               |
| `@commitlint/config-conventional` | `^20.4.1`    | 20.4.1    | 20.4.2 | No               |
| `fast-xml-parser`                 | `^5.3.6`     | 5.3.6     | 5.4.1  | No (vuln fix)    |
| `lefthook`                        | `^2.1.0`     | 2.1.0     | 2.1.1  | No               |
| `markdown-link-check`             | `^3.12.0`    | 3.12.0    | 3.12.0 | No               |
| `markdownlint-cli2`               | `^0.20.0`    | 0.20.0    | 0.21.0 | Minor (vuln fix) |
| `turbo`                           | `^2.5.0`     | 2.5.x     | 2.5.x  | No               |
| `typescript`                      | `^5.7.0`     | 5.7.x     | 5.7.x  | No               |

### `apps/web/package.json` — dependencies

| Package               | Pinned Range | Installed | Latest     | Breaking?       |
| --------------------- | ------------ | --------- | ---------- | --------------- |
| `mssql`               | `^11.0.1`    | 11.0.x    | 11.0.x     | No              |
| `@azure/identity`     | `^4.7.0`     | 4.7.x     | 4.7.x      | No              |
| `next`                | `^15.3.0`    | 15.5.12   | **16.1.6** | **Yes — major** |
| `react` / `react-dom` | `^19.1.0`    | 19.1.x    | 19.1.x     | No              |
| `radix-ui`            | `^1.4.3`     | 1.4.x     | 1.4.x      | No              |
| `lucide-react`        | `^0.475.0`   | 0.475.0   | 0.575.0    | Minor           |
| `zod`                 | `^3.24.0`    | 3.25.x    | **4.3.6**  | **Yes — major** |

### `apps/web/package.json` — dev dependencies

| Package                | Pinned Range | Installed | Latest     | Breaking?       |
| ---------------------- | ------------ | --------- | ---------- | --------------- |
| `@types/node`          | `^22.13.0`   | 22.19.13  | **25.3.2** | **Yes — major** |
| `@vitejs/plugin-react` | `^4.3.0`     | 4.7.0     | **5.1.4**  | **Yes — major** |
| `eslint`               | `^9.0.0`     | 9.39.3    | **10.0.2** | **Yes — major** |
| `eslint-config-next`   | `^15.3.0`    | 15.5.12   | **16.1.6** | **Yes — major** |
| `jsdom`                | `^26.0.0`    | 26.1.0    | **28.1.0** | **Yes — major** |
| `vitest`               | `^3.0.0`     | 3.2.4     | **4.0.18** | **Yes — major** |

### Security Vulnerabilities (`npm audit`)

| Package                  | Severity | Issue                        | Fix                                  |
| ------------------------ | -------- | ---------------------------- | ------------------------------------ |
| `ajv` 7–8.17.1           | Moderate | ReDoS with `$data` option    | `npm audit fix`                      |
| `fast-xml-parser` <5.3.8 | Moderate | Stack overflow in XMLBuilder | `npm audit fix`                      |
| `markdown-it` 13–14.1.0  | Moderate | ReDoS vulnerability          | Upgrade `markdownlint-cli2` to 0.21+ |

### Missing Guardrails

| Gap                                  | Impact                                  |
| ------------------------------------ | --------------------------------------- |
| No `engines` field in `package.json` | Anyone can run on wrong Node version    |
| No `.nvmrc` / `.node-version`        | No version pinning outside devcontainer |
| No `npm audit` in CI                 | Vulnerabilities merge silently          |
| No `npm outdated` reporting          | Drift accumulates unnoticed             |
| No Dependabot / Renovate             | No automated PR creation for updates    |
| No `--engine-strict` in `.npmrc`     | Engine constraints not enforced         |
| devcontainer uses `lts` not a pin    | Node version drifts between rebuilds    |

---

## Upgrade Plan

### Phase 1 — Immediate (no breaking changes)

**Goal:** Fix vulnerabilities and patch-level updates. Zero code changes needed.

**Priority: P0 — do first**

| #   | Action                               | Command / File                        |
| --- | ------------------------------------ | ------------------------------------- |
| 1   | Fix `npm audit` vulnerabilities      | `npm audit fix`                       |
| 2   | Upgrade `markdownlint-cli2` to 0.21+ | Bump range in root `package.json`     |
| 3   | Upgrade `fast-xml-parser` to ^5.4.1  | Bump range in root `package.json`     |
| 4   | Upgrade `@commitlint/*` to ^20.4.2   | Bump range in root `package.json`     |
| 5   | Upgrade `lefthook` to ^2.1.1         | Bump range in root `package.json`     |
| 6   | Upgrade `lucide-react` to ^0.575.0   | Bump range in `apps/web/package.json` |
| 7   | Run `npm install` and verify         | `npm install && npm run validate`     |

### Phase 2 — Guardrails (new files, no code changes)

**Goal:** Prevent future drift. Add mechanical enforcement.

| #   | Action                                              | Details                                                 |
| --- | --------------------------------------------------- | ------------------------------------------------------- |
| 1   | Add `engines` to root `package.json`                | `"engines": { "node": ">=22.0.0", "npm": ">=10.0.0" }`  |
| 2   | Create `.npmrc` with `engine-strict=true`           | Enforces engine constraints on `npm install`            |
| 3   | Create `.nvmrc` with `22`                           | Pins Node for nvm/fnm users                             |
| 4   | Add `npm audit` step to CI lint workflow            | Fail on moderate+ vulnerabilities                       |
| 5   | Add `npm outdated` reporting step to CI             | Advisory only (no fail), surfaces drift                 |
| 6   | Create Dependabot config (`.github/dependabot.yml`) | Weekly PR creation for npm + GitHub Actions             |
| 7   | Add `dependency-freshness` instruction file         | Agent-facing rules: use latest stable, never deprecated |
| 8   | Pin devcontainer Node to `22`                       | Change `"version": "lts"` → `"version": "22"`           |

### Phase 3 — Major Version Upgrades (breaking changes, separate PRs)

**Goal:** Upgrade to latest majors. Each gets its own branch/PR.

| #   | Package                           | From → To | Risk       | Notes                                              |
| --- | --------------------------------- | --------- | ---------- | -------------------------------------------------- |
| 1   | `next` + `eslint-config-next`     | 15 → 16   | **High**   | Major framework upgrade; review migration guide    |
| 2   | `zod`                             | 3 → 4     | **Medium** | API changes; audit all `.parse()` / `.safeParse()` |
| 3   | `vitest` + `@vitejs/plugin-react` | 3→4 / 4→5 | **Medium** | Test config may need updates                       |
| 4   | `eslint`                          | 9 → 10    | **Medium** | Flat config may need updates                       |
| 5   | `jsdom`                           | 26 → 28   | **Low**    | Test environment only                              |
| 6   | `@types/node`                     | 22 → 25   | **Low**    | Type-only; may surface new type errors             |

> **Recommendation:** Do NOT rush Phase 3. The current pinned ranges (`^15`, `^3`,
> etc.) are intentional for stability. Upgrade only after the app reaches a stable
> milestone and each upgrade gets a dedicated PR with full test validation.

---

## Proposed Guardrail Files

### `.npmrc`

```ini
engine-strict=true
save-exact=false
```

### `.nvmrc`

```text
22
```

### `engines` in `package.json`

```json
"engines": {
  "node": ">=22.0.0",
  "npm": ">=10.0.0"
}
```

### `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 10
    groups:
      minor-patch:
        update-types:
          - minor
          - patch
    labels:
      - dependencies
    commit-message:
      prefix: "build"
      include: scope

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    labels:
      - ci
    commit-message:
      prefix: "ci"
```

### CI lint workflow addition

```yaml
- name: Security audit
  run: npm audit --audit-level=moderate

- name: Check for outdated packages
  run: npm outdated || true
  continue-on-error: true
```

---

## Decision Log

| Decision                        | Rationale                                        |
| ------------------------------- | ------------------------------------------------ |
| Pin Node 22 LTS, not 24 Current | LTS is the production standard; 24 is pre-LTS    |
| Phase major upgrades separately | Reduces blast radius; each PR is testable        |
| Don't upgrade Next.js 15→16 yet | App is still being built; premature migration    |
| Dependabot weekly, not daily    | Reduces PR noise while maintaining freshness     |
| `npm audit` blocks CI           | Security is non-negotiable per golden principles |
| `npm outdated` is advisory only | Informational; Dependabot handles the PRs        |
