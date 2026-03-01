# HackOps — Tech Stack & Phased Build Plan

> Azure hackathon management platform for structured MicroHack events.
> Solo-dev, local-first, enterprise-policy-compliant.

---

## Non-Negotiable Constraints

- **Cloud: Microsoft Azure only** — all compute, storage, networking, and identity runs in Azure
- **Authentication: GitHub OAuth only** — via Azure App Service Easy Auth
- **Database connectivity: Private Endpoint only** — database never exposed to the public internet
- **Azure Policy guardrails** — assume locked-down enterprise landing zone; respect allowed SKUs, mandatory tags, no public endpoints, approved regions only
- **Zero hardcoded values** — all config externalised (Key Vault, environment variables); nothing baked into code or IaC
- **Deployment must be fully repeatable** — IaC-driven, idempotent, pipeline-friendly
- **Unique resource naming** — every deployed resource includes a 6-character deterministic suffix from `uniqueString(resourceGroup().id)`

---

## Application Summary

HackOps manages the complete lifecycle of a MicroHack event:

- Team registration and self-service hacker onboarding via an auto-generated 4-digit event code
- Configurable, Markdown-driven scoring rubric that drives all scoring UI, validation, and grading
- Hacker evidence submission and Coach score entry (form-based and JSON file upload), held in a staging/approval queue
- Admin and Coach submission review, approval, rejection, and score override
- Live leaderboard (auto-refresh, expandable rows, grade badges, award badges) showing only approved scores
- Hackathon lifecycle management (create, launch, archive), team assignment (Fisher-Yates shuffle), manual reassignment
- Gated challenge progression (teams unlock challenges sequentially on approval)
- Role management UI for inviting coaches and secondary admins
- Full audit trail on all reviewer actions

**Roles:** Admin (full control), Coach (validate/score), Hacker (team-scoped submission), Anonymous (blocked entirely)

**Data:** 10 Azure SQL Database tables (teams, hackers, scores, submissions, rubrics, config, hackathons, roles, challenges, progression)

**API surface:** ~16 REST endpoints, all authenticated except `/api/health`

**Scale:** 2–3 parallel events, 4–5 teams of 5 per event (~75 max concurrent users)

### Key Invariants

- Scores are immutable until approved (staging pattern)
- One active rubric at a time (atomic swap via pointer document + versioned rubric docs)
- Score entry and grading are fully rubric-driven — nothing hardcoded
- Hackers are team-scoped; cross-team submission attempts return 403
- Event codes are convenience shortcodes stored as plaintext; join endpoint rate-limited (5/min/IP)
- Challenge N+1 is gated until challenge N is approved
- All reviewer actions are audited (reviewedBy, reviewedAt, reviewReason)
- Primary admin cannot be demoted

---

## Tech Stack Recommendation

### Hosting / Compute

| Layer       | Choice                                 | Justification                                                                                                                                                                   |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compute** | Azure App Service (Linux, Node 22 LTS) | Mature PaaS with built-in Easy Auth for GitHub OAuth, VNet integration for Azure SQL private connectivity, always-on for consistent latency. P1v3 minimum for all environments. |
| **Plan**    | `asp-hackops-{env}-{suffix}`           | Single plan hosts the Next.js app (SSR + API routes in one deployment unit).                                                                                                    |

_Alternatives considered_: **Container Apps** — more modern but adds Docker build complexity for a solo dev with no container requirement. **Azure Functions** — cold-start latency unacceptable for a live leaderboard. App Service is the simplest path that meets all constraints.

### Frontend

| Choice                      | Justification                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 15** (App Router) | Hybrid SSR/SPA. Server components for leaderboard SEO and initial load; client components for interactive forms, real-time refresh. |
| **Tailwind CSS 4**          | Utility-first, zero-runtime, excellent DX for solo dev.                                                                             |
| **shadcn/ui**               | Copy-paste accessible components (tables, forms, badges, dialogs). No heavy dependency — components live in the repo.               |
| **Rendering**: Hybrid       | SSR for leaderboard (fast first paint, no layout shift), client-side for admin dashboards and score submission forms.               |

_Alternatives considered_: **Fluent UI** — natural Azure branding fit but heavier bundle and steeper learning curve for rapid prototyping. **SvelteKit** — excellent DX but smaller ecosystem and fewer App Service deployment examples.

### Backend / API

| Choice                                  | Justification                                                                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js API Routes** (Route Handlers) | ~16 endpoints co-located with the frontend in a single deployment. No separate server process. Middleware for auth, role checks, and audit logging. |
| **TypeScript**                          | Type safety across the full stack. Shared types for SQL table records, API request/response shapes, and rubric schemas.                             |
| **`mssql`**                             | SQL Server client for Node.js. Supports Azure SQL Database with managed identity auth via `@azure/identity`.                                        |
| **Zod**                                 | Runtime validation at API boundaries (parse at boundaries principle). Validates submissions, rubric schemas, event codes.                           |

_Alternatives considered_: **Separate Express/Fastify API** — cleaner separation but doubles deployment complexity for a solo dev. Next.js Route Handlers provide the same middleware chain capability with simpler infra. If the API surface grows beyond ~25 endpoints, consider extracting to a standalone service.

### Database

| Choice                 | Justification                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Azure SQL Database** | Managed relational database with built-in security, Private Endpoint support, and native T-SQL query capabilities.                                                     |
| **Serverless tier**    | 2–3 parallel events × 4–5 teams × 5 hackers = ~75 concurrent users max. Serverless pricing (auto-pause, pay-per-use) is cost-effective for bursty, event-driven usage. |
| **10 tables**          | `teams`, `hackers`, `scores`, `submissions`, `rubrics`, `config`, `hackathons`, `roles`, `challenges`, `progression` — each with a defined primary key and indexes.    |

**Primary keys and indexes:**

| Table         | Primary Key                 | Purpose               |
| ------------- | --------------------------- | --------------------- |
| `hackathons`  | `id`                        | Event lifecycle       |
| `teams`       | `id` (index: `hackathonId`) | Team roster           |
| `hackers`     | `id` (index: `hackathonId`) | Hacker profiles       |
| `scores`      | `id` (index: `teamId`)      | Approved scores       |
| `submissions` | `id` (index: `teamId`)      | Staging queue         |
| `rubrics`     | `id`                        | Scoring rubrics       |
| `config`      | `id`                        | App config            |
| `roles`       | `id` (index: `hackathonId`) | Role assignments      |
| `challenges`  | `id` (index: `hackathonId`) | Challenge definitions |
| `progression` | `id` (index: `teamId`)      | Unlock state          |

_Alternatives considered_: **Provisioned DTU model** — predictable cost but overkill at this scale. **Cosmos DB** — flexible NoSQL but relational model better fits the structured hackathon data with cross-entity joins.

### Infrastructure as Code

| Choice                         | Justification                                                |
| ------------------------------ | ------------------------------------------------------------ |
| **Bicep** with **AVM modules** | Repo standard. Modules available for all required resources. |
| **Project path**               | `infra/bicep/hackops/` following existing convention         |

**AVM modules used:**

| Resource         | Module                                             | Min Version |
| ---------------- | -------------------------------------------------- | ----------- |
| SQL Database     | `br/public:avm/res/sql/server`                     | `0.12.0`    |
| App Service Plan | `br/public:avm/res/web/serverfarm`                 | `0.4.0`     |
| App Service      | `br/public:avm/res/web/site`                       | `0.12.0`    |
| Key Vault        | `br/public:avm/res/key-vault/vault`                | `0.11.0`    |
| Virtual Network  | `br/public:avm/res/network/virtual-network`        | `0.5.0`     |
| NSG              | `br/public:avm/res/network/network-security-group` | `0.5.0`     |
| Log Analytics    | `br/public:avm/res/operational-insights/workspace` | `0.9.0`     |
| App Insights     | `br/public:avm/res/insights/component`             | `0.4.0`     |
| Private DNS Zone | `br/public:avm/res/network/private-dns-zone`       | `0.7.0`     |

### CI/CD

| Choice             | Justification                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| **GitHub Actions** | Existing workflows for lint/validation. New workflows for build, test, Bicep what-if, and deploy. |
| **Environments**   | `dev` (auto-deploy on push to `main`), `prod` (manual approval gate).                             |

### Key Azure Services

| Service          | Purpose                                                                                               | Naming                             |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Key Vault        | GitHub OAuth secret, SQL Database connection string (fallback), app secrets                           | `kv-hackops-{env}-{suffix}`        |
| Managed Identity | App Service → Azure SQL (data plane), App Service → Key Vault (secrets)                               | System-assigned on App Service     |
| VNet + Subnets   | Private connectivity: `snet-app-{env}` (App Service integration), `snet-pe-{env}` (private endpoints) | `vnet-hackops-{env}-{suffix}`      |
| Private Endpoint | Azure SQL `sqlServer` group ID → `privatelink.database.windows.net`                                   | `pe-sql-hackops-{env}-{suffix}`    |
| Private DNS Zone | Resolve Azure SQL FQDN to private IP within VNet                                                      | `privatelink.database.windows.net` |
| Log Analytics    | Central log sink for all diagnostics                                                                  | `log-hackops-{env}-{suffix}`       |
| App Insights     | APM, distributed tracing, custom events for audit trail                                               | `appi-hackops-{env}-{suffix}`      |

### Unique Resource Naming

Every deployed resource includes a **6-character deterministic suffix** from `uniqueString(resourceGroup().id)`:

```bicep
// main.bicep — single source of suffix
var uniqueSuffix = take(uniqueString(resourceGroup().id), 6)
```

The suffix is generated **once** in `main.bicep` and passed to **all** modules as a required parameter.

| Resource         | Name Pattern                    | Example                                       |
| ---------------- | ------------------------------- | --------------------------------------------- |
| Resource Group   | `rg-hackops-{env}`              | `rg-hackops-dev` (no suffix — RG is the seed) |
| App Service Plan | `asp-hackops-{env}-{suffix}`    | `asp-hackops-dev-x7k2m9`                      |
| App Service      | `app-hackops-{env}-{suffix}`    | `app-hackops-dev-x7k2m9`                      |
| SQL Database     | `sql-hackops-{env}-{suffix}`    | `sql-hackops-dev-x7k2m9`                      |
| Key Vault        | `kv-hackops-{env}-{suffix}`     | `kv-hackops-dev-x7k2m9` (24-char limit)       |
| Log Analytics    | `log-hackops-{env}-{suffix}`    | `log-hackops-dev-x7k2m9`                      |
| App Insights     | `appi-hackops-{env}-{suffix}`   | `appi-hackops-dev-x7k2m9`                     |
| VNet             | `vnet-hackops-{env}-{suffix}`   | `vnet-hackops-dev-x7k2m9`                     |
| Private Endpoint | `pe-sql-hackops-{env}-{suffix}` | `pe-sql-hackops-dev-x7k2m9`                   |

**Length-constrained resources** (Key Vault = 24 chars, Storage = 24 chars) use truncation:

```
kv-{take(projectName, 7)}-{take(env, 3)}-{suffix}  →  kv-hackops-dev-x7k2m9 (21 chars)
```

**Key invariant**: The suffix is deterministic per resource group — redeploying to the same RG produces the same suffix (idempotent). Deploying to a different RG produces a different suffix (unique).

### Trade-offs Summary

| Decision                            | Trade-off                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Next.js API routes vs. separate API | Simpler infra, but tighter coupling. Acceptable at current scale.               |
| Serverless Azure SQL                | Auto-pause after idle period, but resumes within ~1 minute on first connection. |
| App Service vs. Container Apps      | Misses scale-to-zero, but avoids Docker complexity for solo dev.                |
| Single App Service                  | All eggs in one basket. Mitigated by deployment slots for zero-downtime deploy. |
| shadcn/ui vs. Fluent UI             | Less "Azure-branded" but faster to build, lighter bundle, more flexible.        |

> **Cost estimates in this plan are parametric approximations.** Verify all prices against the Azure Pricing Calculator or Azure Pricing MCP tools before committing to a budget. SKU pricing varies by region and is subject to change.

---

## Phased Implementation Plan

### Phase 1: Monorepo Scaffold & Dev Environment

**Goal**: Working Next.js app running locally with TypeScript, Tailwind, shadcn/ui, and local SQL Server (Docker) connected.

**Exit criteria**: `npm run dev` shows a hello-world page; API route returns `{ status: "ok" }` from local SQL Server (Docker).

**Steps**:

1. Create monorepo root at project level using **Turborepo** with `apps/web/` for the Next.js app and `packages/shared/` for shared TypeScript types. Install `turbo` as a dev dependency and configure `turbo.json` with pipelines for `build`, `lint`, `type-check`, and `test`
2. Initialize Next.js 15 (App Router) in `apps/web/` with TypeScript, Tailwind CSS 4, ESLint
3. Install and configure shadcn/ui (init + first components: `Button`, `Card`, `Table`, `Badge`, `Dialog`)
4. Install `mssql`, `@azure/identity`, `zod`, and dev dependencies
5. Create shared types package at `packages/shared/types/` — SQL table record interfaces for all 10 tables
6. Add local SQL Server (Docker) connection to local dev config (environment variables via `.env.local`)
7. Add Azurite configuration for any blob storage needs (JSON file uploads)
8. Create a seed script (`scripts/seed-sql.ts`) that creates all 10 tables with primary keys/indexes and inserts sample data
9. Update `.devcontainer/devcontainer.json` to include SQL Server container and Azurite containers
10. **SQL Server smoke test**: verify `mssql` client connects to local SQL Server (Docker), CRUD operations succeed on all 10 tables. This gates Phase 1 exit — if the local SQL Server doesn't work with the chosen client, surface the issue before writing any data layer code

**Folder structure**:

```
turbo.json                      # Turborepo pipeline config
apps/
  web/                        # Next.js 15 app
    src/
      app/                    # App Router pages
        layout.tsx
        page.tsx
        api/                  # Route Handlers (~16 endpoints)
          health/route.ts
      lib/                    # Shared utilities
        sql.ts                # SQL Database client singleton
        auth.ts               # Auth helpers
        validation/           # Zod schemas
      components/             # shadcn/ui + custom components
      types/                  # Re-exports from shared package
    public/
    tailwind.config.ts
    next.config.ts
    .env.local                # Local dev config (SQL Server endpoints)
    .env.example              # Template for required env vars
packages/
  shared/
    types/
      index.ts                # All document interfaces
      hackathon.ts
      team.ts
      hacker.ts
      score.ts
      submission.ts
      rubric.ts
      config.ts
      role.ts
      challenge.ts
      progression.ts
infra/
  bicep/
    hackops/                  # IaC for the project
scripts/
  seed-sql.ts                  # Dev data seeder
```

**Gotchas**:

- Local SQL Server (Docker) may need `trustServerCertificate: true` in dev only
- Use `mssql` connection string auth for local SQL Server, managed identity for deployed environments — abstract behind a factory function in `sql.ts`

---

### Phase 1.5: Governance Discovery

**Goal**: Discover Azure Policy constraints in the target subscription before writing any IaC. This is a hard gate — policy-violating Bicep will fail at deployment.

**Exit criteria**: `agent-output/hackops/04-governance-constraints.json` populated with all discovered policies; constraints mapped to resource types planned in Phases 2-4.

**Steps**:

1. Run governance discovery REST API against the target subscription and all inherited management group policies
2. Classify discovered policies by effect (`Deny`, `Audit`, `Modify`, `DeployIfNotExists`) and map to planned resources (VNet, Azure SQL Database, App Service, Key Vault)
3. Document all constraints in `agent-output/hackops/04-governance-constraints.json` (machine-readable) and `agent-output/hackops/04-governance-constraints.md` (human-readable)
4. Identify any `Deny` policies that would block planned SKUs (Serverless Azure SQL, P1v3 App Service) or configurations (public access settings, TLS versions)
5. Determine required tags beyond the 4-tag baseline (`Environment`, `Project`, `Owner`, `CostCenter`) — enterprise policies often enforce additional tags
6. Document allowed regions and verify `swedencentral` is permitted for all planned resource types
7. If Azure connectivity is unavailable, create a placeholder constraints file documenting that governance discovery is pending and must complete before any `az deployment` command

**Output**: `agent-output/hackops/04-governance-constraints.json` — consumed by all subsequent IaC phases as the single source of truth for policy compliance.

**Hard gate**: No Bicep deployment (`az deployment group create` or `what-if`) may proceed until this phase completes. Local `bicep build` and `bicep lint` are permitted.

---

### Phase 2: IaC Foundation

**Goal**: Bicep templates that deploy networking, monitoring, and Key Vault — the foundational layer all other resources depend on.

**Exit criteria**: `bicep build main.bicep` succeeds; `az deployment group what-if` shows expected resources.

**Steps**:

1. Create `infra/bicep/hackops/main.bicep` with parameters for `environment`, `projectName`, `location`, `owner`
2. Define `var uniqueSuffix = take(uniqueString(resourceGroup().id), 6)` — single source for the 6-character suffix passed to all modules
3. Create `infra/bicep/hackops/main.bicepparam` for dev environment
4. Create module `modules/networking.bicep` — VNet (`10.0.0.0/24`), three subnets: `snet-app` (`10.0.0.0/26`, 64 IPs, App Service delegation), `snet-pe` (`10.0.0.64/27`, 32 IPs, private endpoints), `snet-spare` (`10.0.0.96/27`, 32 IPs, reserved for future services), NSGs for each. A `/24` avoids over-claiming enterprise address space while leaving room to grow
5. Create module `modules/monitoring.bicep` — Log Analytics workspace + Application Insights (using AVM modules)
6. Create module `modules/key-vault.bicep` — Key Vault with RBAC authorization, purge protection, private endpoint on `snet-pe`
7. Wire all modules in `main.bicep` with `uniqueSuffix`, tags, and diagnostic settings
8. Create `infra/bicep/hackops/deploy.ps1` deployment script
9. Configure **Azure Deployment Stacks** (`az stack group create`) as the deployment mechanism. Deployment stacks protect deployed resources with deny-settings, track all resources as a unit, and allow clean rollback on partial failure. Failed deployments detach resources without deleting them — redeploy to reconcile

**AVM modules used**: `network/virtual-network`, `network/network-security-group`, `operational-insights/workspace`, `insights/component`, `key-vault/vault`

**Policy considerations** (sourced from Phase 1.5 governance discovery):

- VNet: Ensure address space doesn't conflict with enterprise VNet ranges (check `04-governance-constraints.json` for allowed ranges)
- Key Vault: `publicNetworkAccess: 'Disabled'` in prod; use Private Endpoint + VNet service endpoint for pipeline access
- NSG: Default deny-all inbound on `snet-pe`; App Service integration subnet requires specific delegation rules
- All resources: Include baseline tags + ALL policy-discovered additional tags from `04-governance-constraints.json`
- SKUs: Verify planned SKUs are in the allowed list per governance constraints

---

### Phase 3: Database IaC & Schema

**Goal**: Azure SQL Database deployed with all 10 tables, connected via Private Endpoint, accessible only from the VNet.

**Exit criteria**: Azure SQL Database accessible from VNet; all tables created with correct primary keys and indexes; `publicNetworkAccess: 'Disabled'`.

**Steps**:

1. Create module `modules/sql-database.bicep` using AVM module `br/public:avm/res/sql/server:0.12.0`
2. Configure: Serverless tier, `swedencentral`, system-assigned managed identity, Azure AD authentication
3. Configure **backup policy**: Azure SQL automated backups (default — point-in-time restore, 7-day retention). Sufficient for hackathon-scoped event data where RTO/RPO targets are relaxed
4. Define all 10 tables with primary keys and indexes (see table in Database section above)
5. Create Private Endpoint for Azure SQL on `snet-pe`. **Private DNS Zone is configurable**: accept an optional `existingPrivateDnsZoneId` parameter — if provided, link the PE to the existing zone; if omitted, create `privatelink.database.windows.net` in the project resource group. This supports both self-contained deployments and enterprise hub-spoke DNS architectures
6. Add SQL Database connection string as Key Vault secret (for fallback; prefer managed identity)
7. Add **SQL Database role assignment**: App Service managed identity → db_datareader + db_datawriter roles on the target database. Use `Microsoft.Sql/servers/databases` resource type for granting access

**Policy considerations** (sourced from Phase 1.5 governance discovery):

- `publicNetworkAccess: 'Disabled'` — mandatory by policy assumption; verify in `04-governance-constraints.json`
- Private Endpoint group ID: `sqlServer`
- Serverless SQL tier may need policy exemption if "allowed SKUs" policy is narrowly scoped — check governance constraints
- Verify `swedencentral` supports Azure SQL Serverless (it does as of 2025, but confirm against governance allowed-regions list)

---

### Phase 4: Compute IaC & Deployment

**Goal**: App Service deployed with VNet integration, Easy Auth configured for GitHub OAuth, connected to Azure SQL Database via private endpoint.

**Exit criteria**: App Service reachable via HTTPS; GitHub OAuth login works; API routes can query Azure SQL Database.

**Steps**:

1. Create module `modules/app-service.bicep` using AVM modules `web/serverfarm` + `web/site`
2. Configure: Linux, Node 22 LTS, P1v3 (all environments), system-assigned managed identity
3. Enable VNet integration on `snet-app` subnet
4. Configure App Settings via Key Vault references: `@Microsoft.KeyVault(SecretUri=...)`
5. Configure Easy Auth (GitHub OAuth provider): client ID + client secret stored in Key Vault
6. Set `APPLICATIONINSIGHTS_CONNECTION_STRING` from App Insights output
7. Add role assignments: App Service identity → Key Vault Secrets User (ARM RBAC), → SQL Database db_datareader + db_datawriter (see Phase 3 step 7)
8. Configure deployment slots: `staging` slot for zero-downtime deployments
9. Set `WEBSITE_VNET_ROUTE_ALL=1` to force all outbound traffic through VNet

**Gotchas**:

- Easy Auth GitHub provider requires a GitHub OAuth App (created manually in GitHub Settings → Developer Settings → OAuth Apps); callback URL: `https://app-hackops-{env}-{suffix}.azurewebsites.net/.auth/login/github/callback`
- **Verify GitHub OAuth is permitted**: Enterprise subscriptions may enforce Entra ID-only authentication via conditional access or App Service auth policies. Test Easy Auth GitHub login immediately after first deployment — if blocked, the auth strategy must pivot to Entra ID with external identities
- `WEBSITE_DNS_SERVER=168.63.129.16` needed for private DNS resolution within VNet
- App Service VNet integration subnet must have delegation `Microsoft.Web/serverFarms` — already handled in Phase 2 networking module

---

### Phase 5: Authentication & Authorization Middleware

**Goal**: GitHub OAuth login working end-to-end. Role-based middleware enforcing Admin/Coach/Hacker/Anonymous access on all routes. CORS, rate limiting, and Zod validation middleware protecting all API endpoints.

**Exit criteria**: Login redirects to GitHub; session contains user profile; API routes return 401/403 correctly by role; CORS blocks non-whitelisted origins; rate limiter returns 429 on abuse.

**Steps**:

1. Create `src/lib/auth.ts` — parse Easy Auth headers (`X-MS-CLIENT-PRINCIPAL`), decode base64 JWT, extract GitHub identity (userId, login, email, avatar)
2. Create `src/lib/roles.ts` — role resolution: look up user in `roles` table by GitHub userId + hackathonId; return `Admin | Coach | Hacker | Anonymous`
3. Create `src/proxy.ts` — Next.js proxy that intercepts all `/api/*` routes (except `/api/health`): validate auth headers, resolve role, attach to request context
4. **Configure CORS** — whitelist the App Service origin (`https://app-hackops-{env}-{suffix}.azurewebsites.net`) and `localhost:3000` for dev. Block all other origins. Set in `next.config.ts` headers or via middleware
5. **Add rate limiting** — in-memory rate limiter (e.g., `Map<IP, {count, resetAt}>`) at 100 requests/min/IP for API routes. Returns `429 Too Many Requests` with `Retry-After` header. For production scale, consider Azure API Management or App Service IP restrictions
6. **Centralized Zod validation middleware** — create `src/lib/validation/middleware.ts` that wraps route handlers with automatic request body parsing via Zod schemas. Invalid payloads return 400 with structured error response. Parse at boundaries, not in business logic
7. Create role guard helper: `requireRole('Admin', 'Coach')` — returns 403 if insufficient permissions
8. Create `src/lib/audit.ts` — audit logger that writes `reviewedBy`, `reviewedAt`, `reviewReason` to submissions on any reviewer action
9. Implement primary admin protection — lookup in `config` table; reject demotion attempts

**Local dev**: Easy Auth doesn't work locally. Create a dev auth bypass in `src/lib/auth.ts` that reads `DEV_USER_ROLE` and `DEV_USER_ID` from environment variables when `NODE_ENV=development`.

---

### Phase 6: Core API — Hackathon & Team Management

**Goal**: CRUD for hackathons, team creation with Fisher-Yates shuffle, hacker self-service onboarding via 4-digit event code.

**Exit criteria**: Create hackathon → generate event code → hackers join via code → auto-assigned to teams → teams visible to admin.

**Steps**:

1. **Hackathon CRUD** — `POST/GET/PATCH /api/hackathons` — create, list, update lifecycle state (`draft → active → archived`)
2. **Event code** — on hackathon creation, **auto-generate** a 4-digit numeric code (`1000`–`9999`). Validate uniqueness against all active hackathons before persisting — reject and regenerate on collision. Store as plaintext in `hackathons` table.
3. **Hacker onboarding** — `POST /api/join` — accept event code + GitHub identity, verify code match, rate-limit to 5 attempts/min/IP, create hacker record in `hackers` table
4. **Team assignment** — `POST /api/hackathons/{id}/assign-teams` — Fisher-Yates shuffle all unassigned hackers, distribute into teams of `teamSize` (configurable). Store in `teams` table.
5. **Manual reassignment** — `PATCH /api/teams/{id}/reassign` — admin-only, move hacker between teams
6. **Zod schemas** for all request/response bodies in `src/lib/validation/`

**API endpoints (this phase)**:

- `GET /api/health` (unauthenticated)
- `POST /api/hackathons` (Admin)
- `GET /api/hackathons` (Admin, Coach)
- `PATCH /api/hackathons/:id` (Admin)
- `POST /api/join` (authenticated, no role required)
- `POST /api/hackathons/:id/assign-teams` (Admin)
- `PATCH /api/teams/:id/reassign` (Admin)
- `GET /api/teams` (Admin, Coach — scoped to hackathonId)

---

### Phase 7: Scoring Engine & Submission Workflow

**Goal**: Markdown-driven rubric system. Hackers submit evidence; Coaches enter scores (form + JSON upload). Submissions enter staging queue. Coaches/Admins approve/reject with audit trail.

**Exit criteria**: Activate rubric → submit score → appears in queue → approve → score recorded → audit logged.

**Steps**:

1. **Rubric CRUD** — `POST/GET/PATCH /api/rubrics` — create rubric with Markdown-driven criteria (categories, max points, descriptions). Only one can be `active` at a time. Uses a **pointer + versioned docs** pattern: rubric versions are stored as separate documents (`rubric-v1`, `rubric-v2`, etc.) and a small pointer document indicates the active version. Atomic swap = update the pointer document only. Consumers always read the pointer first, then fetch the referenced version — no partial reads during updates.
2. **Submission endpoint** — `POST /api/submissions` — accept form data OR JSON file upload. Validate against active rubric schema (Zod). Hackers can only submit for their own team (403 otherwise). Submission enters `pending` state.
3. **Review queue** — `GET /api/submissions?status=pending&hackathonId={id}` (Admin, Coach — hackathon-scoped). List pending submissions with team info, challenge info, and submitted evidence.
4. **Approve/Reject** — `PATCH /api/submissions/:id` — set status to `approved` or `rejected`. On approval: copy validated scores to `scores` table (immutable). Write audit fields (`reviewedBy`, `reviewedAt`, `reviewReason`).
5. **Score override** — `PATCH /api/scores/:id/override` (Admin only) — modify an approved score with mandatory reason. Audit logged.
6. **Rubric-driven UI components** — `<RubricForm>` renders scoring form dynamically from active rubric JSON. No hardcoded score fields.

---

### Phase 8: Leaderboard & Live Updates

**Goal**: Public-facing leaderboard showing only approved scores. Auto-refresh, expandable rows, grade badges, award badges.

**Exit criteria**: Leaderboard page shows ranked teams with scores; auto-refreshes every 30s; expandable rows show per-challenge breakdown.

**Steps**:

1. **Leaderboard API** — `GET /api/leaderboard/:hackathonId` — aggregate approved scores by team, rank, compute grade badges (A/B/C/D based on rubric thresholds), identify award badges (highest per category).
2. **Leaderboard page** — SSR page at `/leaderboard/:hackathonId` — server component for initial render (fast first paint, shareable URL).
3. **Auto-refresh** — client component wrapping the leaderboard table, polling `/api/leaderboard` every 30 seconds via `useSWR` or React Query with `refreshInterval`.
4. **Expandable rows** — click team row to expand and show per-challenge score breakdown, submission timestamps, reviewer info.
5. **Grade badges** — shadcn `Badge` component with color variants mapped to grade thresholds from the active rubric.
6. **Award badges** — special badges for "Fastest to Complete", "Highest Score per Challenge", "Perfect Score".

---

### Phase 9: Challenge Progression & Gating

**Goal**: Challenges unlock sequentially. Team can only access Challenge N+1 after Challenge N is approved.

**Exit criteria**: Teams see only unlocked challenges; submitting for a locked challenge returns 403; approval of Challenge N auto-unlocks N+1.

**Steps**:

1. **Challenge definition** — `POST /api/challenges` (Admin) — create ordered challenges for a hackathon. Each has `order`, `title`, `description` (Markdown), `maxScore`.
2. **Progression tracking** — `progression` table stores `{ teamId, hackathonId, currentChallenge, unlockedAt[] }`. Challenge 1 auto-unlocked on hackathon start.
3. **Gate middleware** — on submission, check `progression` — if challenge order > `currentChallenge`, return 403.
4. **Auto-unlock trigger** — on submission approval, if challenge matches `currentChallenge`, increment and write unlock timestamp to `progression`.
5. **Challenge UI** — team dashboard shows challenges with lock/unlock state, completed checkmark, progress bar.

---

### Phase 10: Admin & Operational Features

**Goal**: Role management UI, full audit trail viewer, hackathon lifecycle management.

**Exit criteria**: Admin can invite coaches, view audit log, manage hackathon state transitions.

**Steps**:

1. **Role management** — `POST /api/roles/invite` (Admin) — invite by GitHub username, assign Coach or Admin role. `DELETE /api/roles/:id` — remove role (cannot demote primary admin).
2. **Audit trail viewer** — `GET /api/audit/:hackathonId` — paginated, filterable log of all reviewer actions. Admin-only page at `/admin/audit`.
3. **Hackathon lifecycle UI** — Admin dashboard at `/admin/hackathons` — create, launch (sets state to `active`, enables event code), archive (freezes leaderboard, disables submissions).
4. **Team management UI** — `/admin/teams` — view teams, drag-and-drop reassignment, view per-team submission status.
5. **Config management** — `/admin/config` — app-wide settings (leaderboard refresh interval, max team size, etc.) stored in `config` table.

---

### Phase 11: CI/CD Pipeline

**Goal**: GitHub Actions workflows for build, test, Bicep what-if, and deploy with approval gates.

**Exit criteria**: Push to `main` triggers build + test + deploy to dev. Manual approval deploys to prod.

**Steps**:

1. Create `.github/workflows/hackops-ci.yml` — on PR: lint, type-check, unit tests, `bicep build`, `bicep lint`
2. Create `.github/workflows/hackops-deploy.yml` — on push to `main`: build Next.js, run tests, Bicep what-if (dev), deploy IaC (dev), deploy app (dev). Manual dispatch for prod with approval.
3. Configure GitHub environments (`dev`, `prod`) with protection rules (prod requires manual approval)
4. Use `azure/login@v2` with workload identity federation (OIDC) — no stored credentials
5. App deployment via `azure/webapps-deploy@v3` with zip deploy to staging slot → swap

**Pattern**: Follow existing workflow conventions — Node 22, `actions/checkout@v4`, conventional naming.

---

### Phase 12: Production Hardening & Compliance Validation

**Goal**: Final compliance sweep before production deployment. Governance discovery was completed in Phase 1.5 — this phase validates all templates against the discovered constraints and hardens configuration.

**Exit criteria**: All Bicep templates cross-referenced against `04-governance-constraints.json`; `az deployment group what-if` passes clean; security baseline verified.

**Steps**:

1. Re-run governance discovery to catch any policy changes since Phase 1.5
2. Cross-reference ALL Bicep templates against `04-governance-constraints.json` — verify tags, SKUs, network settings, TLS versions, and public access flags comply with every `Deny` policy
3. Validate: `az deployment group what-if` with all constraints applied — zero policy violations
4. Verify security baseline: TLS 1.2 enforced, HTTPS-only, managed identity everywhere, no connection string auth in production, `publicNetworkAccess: 'Disabled'` on all data-plane resources
5. Generate `agent-output/hackops/` artifacts per the 7-step workflow convention
6. Final deployment stack reconciliation — ensure all resources are tracked and deny-settings are applied

---

## Verification

| Check           | Command / Method                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Bicep syntax    | `bicep build infra/bicep/hackops/main.bicep`                                                                             |
| Bicep lint      | `bicep lint infra/bicep/hackops/main.bicep`                                                                              |
| Next.js build   | `cd apps/web && npm run build`                                                                                           |
| Type checking   | `npm run type-check`                                                                                                     |
| Unit tests      | `npm test`                                                                                                               |
| Repo validation | `npm run validate`                                                                                                       |
| Markdown lint   | `npm run lint:md`                                                                                                        |
| What-if         | `az deployment group what-if -g rg-hackops-dev -f infra/bicep/hackops/main.bicep -p infra/bicep/hackops/main.bicepparam` |
| Local dev       | `npm run dev` → local SQL Server (Docker) + Next.js dev server                                                           |
| Auth flow       | Deploy to dev → navigate to app → GitHub OAuth redirect → role assigned                                                  |
