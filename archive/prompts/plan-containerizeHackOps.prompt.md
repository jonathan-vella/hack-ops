# Plan: Containerize HackOps with ACR + MI + CI/CD (v2)

Incorporates all 22 action items from both adversarial reviews.

Single Next.js container deployed to App Service via ACR Standard (public). Images built on GitHub-hosted runners, pushed via OIDC. App Service pulls via system-assigned managed identity. Blue/green slot swap preserved.

## Steps

### 1. Create `apps/web/Dockerfile`

Multi-stage build using `node:24-alpine`:

- **Stage 1 (deps)**: Copy only `package.json`, `package-lock.json`, `turbo.json`, workspace `package.json`s → `npm ci --ignore-scripts`. Maximizes layer cache (P22)
- **Stage 2 (build)**: Copy source → `npm run build --workspace @hackops/web` with `NEXT_TELEMETRY_DISABLED=1`
- **Stage 3 (runtime)**: `node:24-alpine`, non-root user (UID 1001, `nextjs:nodejs`) (P18). Copy `.next/standalone/`, `.next/static/` to correct nested path, conditional `public/` (P3). `ENV PORT=8080 HOSTNAME=0.0.0.0` (P2). No `CMD` override from Bicep (P9). `EXPOSE 8080`. CMD: `node apps/web/server.js`

### 2. Create `.dockerignore` at repo root (P4)

Exclude `.git`, `.github`, `.env*`, `agent-output/`, `docs/`, `infra/`, `mcp/`, `scripts/`, `node_modules/`, `apps/web/.next/`, `coverage/`, `*.md`, test files.

### 3. Create `infra/bicep/hackops/modules/container-registry.bicep`

ACR Standard via AVM module `br/public:avm/res/container-registry/registry`:

- Name: `cr${projectName}${environment}${uniqueSuffix}` (alphanumeric, globally unique)
- SKU: `Standard`
- Admin user: disabled
- `anonymousPullEnabled: false` (P15)
- Public network access: enabled
- Retention policy: 7 days for untagged manifests
- Diagnostics: Log Analytics workspace — `allLogs` + `AllMetrics` (P17)
- Tags: inherited
- Outputs: `acrName`, `acrLoginServer`, `acrResourceId`

### 4. Update `main.bicep`

- Wire ACR module between Cosmos DB and App Service
- Params: `environment`, `projectName`, `location`, `tags`, `uniqueSuffix`, `logAnalyticsWorkspaceId`
- `AcrPull` role (built-in `7f951dda-4ed3-4680-a7ca-43fe172d538d`) scoped to ACR resource (P16) for:
  - App Service production slot MI
  - App Service staging slot MI (P7)
- KV Secrets User + Cosmos Data Contributor role assignments for staging slot MI
- Pass `acrLoginServer` + `imageTag` param to app-service module (P10)
- New outputs: `acrLoginServer`, `acrName`

### 5. Update `app-service.bicep`

- Add params: `acrLoginServer` (string), `imageTag` (string, default `'latest'` for bootstrap)
- `linuxFxVersion: 'DOCKER|${acrLoginServer}/hackops:${imageTag}'` — Bicep is sole source of truth (P10)
- Remove `appCommandLine` (P9)
- Add `acrUseManagedIdentityCreds: true`
- Add app settings:
  - `WEBSITES_PORT` = `8080`
  - `PORT` = `8080` (P2 — belt and suspenders)
  - `HOSTNAME` = `0.0.0.0` (P2)
  - `DOCKER_ENABLE_CI` = `false`
  - `WEBSITES_ENABLE_APP_SERVICE_STORAGE` = `false`
  - `WEBSITES_CONTAINER_START_TIME_LIMIT` = `300`
- Define **staging slot** using AVM `slots` parameter with:
  - System-assigned MI
  - `acrUseManagedIdentityCreds: true`
  - Same VNet integration, app settings (P7)
- Set `tokenStore.enabled: false` (P19 — container ephemeral storage, only `x-ms-client-principal` headers used)

### 6. Update `.github/workflows/hackops-deploy.yml`

Major rework — zip deploy → container deploy:

**Build job:**

- Use `github.event.workflow_run.head_sha || github.sha` for checkout ref and image tag (P11)
- `docker/setup-buildx-action` for build layer caching
- `docker/build-push-action` with `type=gha` GitHub Actions cache
- Trivy scan (`aquasecurity/trivy-action`) → fail on CRITICAL/HIGH before push
- `azure/login@v2` (OIDC) → `az acr login`
- Push SHA tag only — no `latest` (P12)
- Remove `upload-artifact` step

**Deploy jobs (dev + prod):**

- Remove `download-artifact`
- Remove `--no-wait` from Bicep deploy (P10)
- Pass `imageTag=$SHA` as Bicep parameter — `linuxFxVersion` set by IaC, no separate `az webapp config container set`
- Add pre-swap check: verify staging slot container is running and healthy
- Add VNet + ACR pull validation step (P6)
- Slot swap (same as before)
- Health check with auto-rollback: if health fails, execute reverse swap to restore previous version, then `exit 1`

**New GitHub environment vars (per environment):**

- `AZURE_ACR_NAME` — e.g., `crhackopsdevABC123`
- `AZURE_ACR_LOGIN_SERVER` — e.g., `crhackopsdevabc123.azurecr.io`

### 7. Update `.github/workflows/hackops-ci.yml`

Add `docker-build` job (parallel with existing lint/type-check/test):

- Checkout + `docker/setup-buildx-action`
- `docker build --target build -f apps/web/Dockerfile .` (build only, no push)
- Catches Dockerfile regressions on every PR

### 8. Update health endpoint (`apps/web/src/app/api/health/route.ts`) (P20)

- Add startup timestamp tracking (module-level `const startedAt = Date.now()`)
- During first 60s after startup: return 200 with `status: "warming"` (skip Cosmos check)
- After warmup period: full Cosmos dependency check
- Pre-warm Cosmos connection eagerly in module init (import and call `getContainer` at module load)

### 9. ACR purge — create `scripts/setup-acr-purge.sh` (P13)

Weekly purge of SHA-tagged images older than 30 days, keep last 10:

```bash
az acr task create --name purge-old-images \
  --cmd "acr purge --filter 'hackops:.*' --ago 30d --keep 10 --untagged" \
  --schedule "0 0 * * 0" --registry <acr>
```

### 10. First-deploy migration runbook (P14)

Document the supervised first-deploy process:

1. Deploy Bicep with `imageTag` default (`latest` placeholder) — creates App Service + ACR + role assignments
2. Wait for role assignments to propagate (~2 min)
3. Build and push first image from local or CI
4. Run `az deployment group create` again with `imageTag=<sha>` — Bicep updates `linuxFxVersion`
5. Verify container pulls and starts
6. Enable automated CI/CD pipeline for subsequent deploys

### 11. Post-implementation adversarial reviews

Two review passes after code is written:

- **Security review (Sonnet 4.6)**: Dockerfile, ACR Bicep, role assignments, CI workflow — 3 passes: `auth`, `container-supply-chain`, `infra-permissions`
- **Logic review (GPT 5.3)**: deploy pipeline, container runtime, failure modes — 3 passes: `deploy-pipeline`, `container-runtime`, `failure-modes`

Findings → `agent-output/hackops/challenges/`

## File Summary

| File | Action |
|------|--------|
| `apps/web/Dockerfile` | **Create** |
| `.dockerignore` | **Create** |
| `infra/bicep/hackops/modules/container-registry.bicep` | **Create** |
| `scripts/setup-acr-purge.sh` | **Create** |
| `infra/bicep/hackops/main.bicep` | **Update** |
| `infra/bicep/hackops/modules/app-service.bicep` | **Update** |
| `.github/workflows/hackops-deploy.yml` | **Update** |
| `.github/workflows/hackops-ci.yml` | **Update** |
| `apps/web/src/app/api/health/route.ts` | **Update** |

## Verification

1. `bicep build infra/bicep/hackops/main.bicep` — Bicep compiles
2. `docker build -t hackops:test -f apps/web/Dockerfile .` — local build succeeds
3. `docker run -p 8080:8080 -e COSMOS_ENDPOINT='' hackops:test` — verify port 8080 responds, `HOSTNAME=0.0.0.0`
4. `trivy image hackops:test` → no CRITICAL/HIGH
5. PR → CI validates Docker build (new `docker-build` job)
6. First deploy: supervised migration per runbook (step 10)
7. Subsequent deploys: automated pipeline with health gate + rollback
8. Post-implementation adversarial reviews produce findings

## Decisions

- `node:24-alpine` (matching `engines >= 24.0.0` in `package.json`)
- ACR public with explicit `anonymousPullEnabled: false`
- System MI for both production + staging slots, `AcrPull` scoped to ACR resource
- SHA tag only — no `latest` pushed
- `HOSTNAME=0.0.0.0` + `PORT=8080` in Dockerfile AND app settings (belt and suspenders)
- `tokenStore.enabled: false` (container ephemeral storage, only `x-ms-client-principal` headers used)
- Health check warmup mode during first 60s after container start
- Bicep is sole source of truth for `linuxFxVersion` — image tag passed as parameter, no separate `az webapp config container set`
- Remove `--no-wait` from Bicep deploy to avoid race conditions
- Remove `appCommandLine` from Bicep — Dockerfile CMD is source of truth
- First deploy is a supervised, documented migration
- `NEXT_PUBLIC_APP_URL` confirmed server-side only — single image serves all environments
- OIDC identity needs `AcrPush` on ACR (manual initially, document exact command in runbook)

## Adversarial Review Tracker

### Pre-implementation (completed)

| Review | Agent | Findings | Critical | High |
|--------|-------|----------|----------|------|
| Security/Infra | Sonnet 4.6 | 18 | 4 | 5 |
| Logic/Operational | GPT 5.3 | 16 | 3 | 5 |
| **Deduplicated** | — | **22 unique** | **5** | **7** |

All findings incorporated into plan v2.

### Post-implementation (pending)

| Review | Agent | Status |
|--------|-------|--------|
| Security (Dockerfile, Bicep, CI) | Sonnet 4.6 | Pending |
| Logic (pipeline, runtime, failures) | GPT 5.3 | Pending |
