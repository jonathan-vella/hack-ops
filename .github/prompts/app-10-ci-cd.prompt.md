---
description: "Create CI/CD workflows for build, test, Bicep validation, and App Service deployment with OIDC and slot swaps"
agent: 13-App Conductor
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "edit/createDirectory",
    "search/textSearch",
    "search/fileSearch",
    "execute/runInTerminal",
  ]
---

# Create CI/CD Workflows

Create GitHub Actions CI and deployment workflows for the
HackOps Next.js application — including build, test, Bicep
validation, and Azure App Service deployment with staging
slot swaps.

## Mission

Create two GitHub Actions workflows: a CI workflow for pull
requests (lint, type-check, test, Bicep build) and a
deployment workflow for pushes to main (build, test, deploy
to dev, manual gate for prod). Configure OIDC federation for
passwordless Azure authentication.

## Scope & Preconditions

- **Prerequisite**: app-09-tests completed — test suite passes
  with >80% coverage
- **Plan reference**: `.github/prompts/plan-hackOps.prompt.md`
  — read `Phase 11: CI/CD Pipeline`
- **Infra context**: `agent-output/hackops/06-deployment-summary.md`
  — deployed resource names and resource group
- **Existing workflows**: Check `.github/workflows/` for
  existing patterns and conventions
- **Skills**: Read `hackops-domain` (deployment target info)

## Workflow

### Step 1 — Read context

1. `.github/prompts/plan-hackOps.prompt.md` — Phase 11
2. `agent-output/hackops/06-deployment-summary.md` — resource
   names, resource group, subscription
3. `.github/workflows/` — existing workflow patterns
4. `.github/instructions/github-actions.instructions.md`
5. `apps/web/package.json` — scripts available

### Step 2 — CI workflow

Create `.github/workflows/hackops-ci.yml`:

**Trigger**: Pull requests targeting `main`

**Jobs**:

1. **lint** — run ESLint on the codebase
2. **type-check** — run `tsc --noEmit`
3. **test** — run `npm test` with coverage report
4. **bicep-validate** — run `bicep build` and `bicep lint`
   on `infra/bicep/hackops/main.bicep`

**Configuration**:

- Node 22, Ubuntu latest
- Cache npm dependencies
- Upload test coverage as artifact
- Fail fast on any job failure
- Use `actions/checkout@v4`, `actions/setup-node@v4`

### Step 3 — Deploy workflow

Create `.github/workflows/hackops-deploy.yml`:

**Trigger**: Push to `main` branch

**Jobs**:

1. **build-and-test** — build Next.js, run tests
2. **deploy-dev** — deploy to dev App Service
   - Use `azure/login@v2` with OIDC (workload identity
     federation)
   - Deploy IaC: `az deployment group create` with Bicep
   - Deploy app: `azure/webapps-deploy@v3` with zip deploy
     to staging slot → swap to production slot
3. **deploy-prod** (manual dispatch) — same as dev but
   targeting prod environment with approval gate

**Configuration**:

- GitHub environments: `dev` (auto), `prod` (manual approval)
- OIDC federation: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
  `AZURE_SUBSCRIPTION_ID` as environment secrets
- No stored credentials (passwordless)

### Step 4 — OIDC federation setup documentation

Create a section in the workflow file (or a separate doc) with
instructions for setting up OIDC:

1. Create Azure AD app registration
2. Configure federated credential for GitHub Actions
3. Assign `Contributor` role on resource group
4. Add secrets to GitHub repository environments

### Step 5 — Environment configuration

Document required GitHub environment variables and secrets:

**dev environment**:

- `AZURE_CLIENT_ID` — OIDC app registration client ID
- `AZURE_TENANT_ID` — Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID` — target subscription
- `AZURE_RESOURCE_GROUP` — `rg-hackops-dev` (or actual name)
- `AZURE_WEBAPP_NAME` — App Service name from deployment

**prod environment**:

- Same secrets, different values
- Protection rule: require manual approval

### Step 6 — Validate

1. Validate YAML syntax: `yamllint` or `actionlint`
2. Verify action versions are current (`@v4` for checkout,
   `@v2` for azure/login, `@v3` for webapps-deploy)
3. Verify Node version matches project (22)
4. Dry-run: ensure workflow files parse without errors

## Output Expectations

- `.github/workflows/hackops-ci.yml` — PR validation
- `.github/workflows/hackops-deploy.yml` — deployment pipeline
- Both workflows follow repository conventions

## Exit Criteria

- Workflow YAML files are valid
- Action versions are current
- OIDC setup documented
- Workflows pass dry-run validation

## Quality Assurance

- [ ] CI runs on PRs targeting main
- [ ] Deploy runs on pushes to main
- [ ] OIDC federation (no stored credentials)
- [ ] Staging slot swap pattern for zero-downtime
- [ ] Prod requires manual approval
- [ ] Node 22 used throughout
- [ ] npm cache enabled for faster builds
- [ ] Test coverage uploaded as artifact
- [ ] Bicep validation included in CI
- [ ] Action versions pinned and current
- [ ] No secrets hardcoded in workflow files
