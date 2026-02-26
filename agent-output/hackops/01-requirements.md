# HackOps — Infrastructure Requirements

> **Project**: HackOps — Azure hackathon management platform
> **Date**: 2026-02-26
> **Author**: 02-Requirements Agent
> **Status**: Draft — feeds architecture assessment

---

## 🎯 Project Overview

HackOps is an Azure hackathon management platform for structured
MicroHack events. It manages the complete lifecycle of a hackathon:
team registration, hacker onboarding via 4-digit event codes,
configurable Markdown-driven scoring rubrics, gated challenge
progression, live leaderboards, and a full audit trail — all behind
role-based access control.

### Target Workload Profile

| Attribute              | Value                                               |
| ---------------------- | --------------------------------------------------- |
| Concurrent events      | 2–3 parallel hackathons                             |
| Teams per event        | 4–5 teams of ~5 members                             |
| Max concurrent users   | ~75                                                 |
| Roles                  | Admin, Coach, Hacker, Anonymous                     |
| API surface            | ~16 REST endpoints (all authenticated except health) |
| Deployment model       | Solo-dev, enterprise-policy-compliant               |
| Infrastructure as Code | Bicep with Azure Verified Modules (AVM)             |

### Application Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | Next.js 15 (App Router), Tailwind CSS 4, shadcn/ui |
| Backend  | Next.js API Routes (Route Handlers), TypeScript     |
| Database | Azure Cosmos DB NoSQL (Serverless)                  |
| Auth     | GitHub OAuth via Azure App Service Easy Auth        |
| Runtime  | Node.js 22 LTS on Linux                            |

---

## 🚀 Functional Requirements

### Hackathon Lifecycle Management

- Create, launch (draft → active), and archive hackathon events
- Auto-generate unique 4-digit event codes (1000–9999) per hackathon
- State machine: `draft → active → archived` (no reverse transitions)
- Freeze leaderboard and disable submissions on archive

### Hacker Onboarding

- Self-service join via event code (rate-limited: 5/min/IP)
- GitHub identity as profile (no registration forms)
- Duplicate join prevention (409 on re-join)
- Only active hackathons accept joins

### Team Management

- Fisher-Yates shuffle for unbiased random team assignment
- Configurable team size with balanced distribution
  (`ceil(teamSize/2)` minimum per team)
- Manual reassignment capability (Admin only)
- Team-scoped data access for Hackers

### Scoring Engine

- Markdown-driven rubric CRUD with version management
- Pointer + versioned document pattern for atomic rubric swap
- Hacker evidence submission → Coach score entry (form + JSON)
- Staging queue: pending → approved/rejected workflow
- Score override (Admin only) with mandatory audit reason
- Rubric-driven validation at API boundary (Zod)

### Leaderboard

- Server-side rendered ranked display (< 2s at 75 users)
- Auto-refresh every 30 seconds (client-side polling)
- Expandable rows with per-challenge score breakdown
- Grade badges (A/B/C/D) and award badges
- Only approved scores displayed
- Frozen on hackathon archive

### Challenge Progression

- Sequential gating: Challenge N+1 locked until N approved
- Auto-unlock trigger on submission approval
- Challenge 1 auto-unlocked on hackathon start
- Progress tracking per team

### Admin Operations

- Role management: invite Coach/Admin by GitHub username
- Primary admin protection (cannot be demoted)
- Hackathon-scoped role assignments
- Paginated audit trail of all reviewer actions
- Config management (refresh intervals, team size defaults)

### Authentication & Authorization

- GitHub OAuth via App Service Easy Auth
- Role resolution from `roles` container (userId + hackathonId)
- Role guards on all API routes
- Dev auth bypass for local development
- CORS restricted to App Service origin + localhost:3000
- Rate limiting: 100 req/min/IP on all API routes
- Zod validation on all request bodies

---

## ⚡ Non-Functional Requirements (NFRs)

### Performance

| Metric                     | Target          |
| -------------------------- | --------------- |
| Leaderboard SSR response   | < 2 seconds     |
| API CRUD response time     | < 500 ms        |
| Auto-refresh interval      | 30 seconds      |
| Hackathon creation to join | < 15 minutes    |

### Availability

| Metric                | Target                        |
| --------------------- | ----------------------------- |
| Uptime target         | 99.5% (single-region, no SLA) |
| Recovery strategy     | Redeploy from IaC             |
| Backup policy         | Cosmos DB periodic (default)  |
| Deployment slots      | Staging + production swap     |

### Scalability

| Metric           | Current   | Growth path                      |
| ---------------- | --------- | -------------------------------- |
| Concurrent users | ~75       | Serverless Cosmos DB auto-scales |
| Cosmos DB RUs    | Burst 1K  | Switch to provisioned if needed  |
| App Service SKU  | B1 (dev)  | Scale to S1/P1 for production    |

### Cost Targets

| Environment | Monthly estimate | Notes                              |
| ----------- | ---------------- | ---------------------------------- |
| Dev         | ~$30–50          | Serverless Cosmos + B1 App Service |
| Prod        | ~$80–120         | S1 App Service + steady-state RUs  |

---

## 🔒 Compliance & Security Requirements

### Authentication & Identity

- GitHub OAuth via App Service Easy Auth (mandatory)
- Managed identity for all service-to-service communication
- No connection string auth in production
- Dev auth bypass disabled in production (`NODE_ENV=production`)

### Network Security

- Cosmos DB accessible only via Private Endpoint
  (`publicNetworkAccess: Disabled`)
- Key Vault behind Private Endpoint with RBAC authorization
- VNet integration for App Service (all outbound via VNet)
- NSGs on all subnets with deny-all inbound on PE subnet
- TLS 1.2 enforced on all services
- HTTPS-only on all endpoints

### Data Protection

- Scores immutable until approved (staging pattern)
- Audit trail on all reviewer actions
- Event codes stored as plaintext (rate-limited, not secrets)
- No PII beyond GitHub profile data

### Azure Policy Compliance

- Respect enterprise landing zone policies
- Allowed SKUs, mandatory tags, approved regions
- No public endpoints on data-plane resources
- Governance constraints documented before deployment
  (Phase 1.5 hard gate)

---

## 💰 Budget

### Cost Drivers

| Resource         | SKU/Tier           | Est. monthly (dev) | Est. monthly (prod) |
| ---------------- | ------------------ | ------------------ | ------------------- |
| App Service Plan | B1 / S1            | ~$13               | ~$55                |
| Cosmos DB        | Serverless         | ~$1–5              | ~$5–15              |
| Key Vault        | Standard           | ~$0.50             | ~$0.50              |
| Log Analytics    | Pay-as-you-go      | ~$2–5              | ~$5–10              |
| App Insights     | Pay-as-you-go      | ~$0–2              | ~$2–5               |
| Private DNS Zone | —                  | ~$0.50             | ~$0.50              |
| VNet/NSG         | Free               | $0                 | $0                  |
| **Total**        |                    | **~$17–26**        | **~$68–86**         |

> Cost estimates are parametric approximations. Verify against
> Azure Pricing Calculator or Pricing MCP tools.

---

## 🔧 Operational Requirements

### Deployment

- All infrastructure deployed via Bicep (AVM-first)
- Azure Deployment Stacks for rollback protection
- Idempotent deployments (redeployable with same outcome)
- Deployment script: `infra/bicep/hackops/deploy.ps1`
- CI/CD via GitHub Actions with environment gates

### Monitoring & Observability

- Application Insights for APM and distributed tracing
- Log Analytics workspace as central log sink
- Custom events for audit trail entries
- Diagnostic settings on all resources

### Disaster Recovery

- Cosmos DB periodic backup (2 copies every 4 hours, 8-hour
  retention) — default free tier
- App Service redeployable from IaC + code repo
- Key Vault with purge protection and soft delete
- All state recoverable from Git + Cosmos DB backup

---

## 🌍 Regional Preferences

| Preference  | Region                 | Justification                 |
| ----------- | ---------------------- | ----------------------------- |
| Primary     | `swedencentral`        | EU GDPR-compliant, all services available |
| Failover    | `germanywestcentral`   | EU paired alternative         |

All resources deployed to `swedencentral` unless governance
constraints dictate otherwise.

---

## 📋 Summary for Architecture Assessment

### Resource Inventory

| #  | Resource              | AVM Module                                           | Min Version | Naming Pattern                       |
| -- | --------------------- | ---------------------------------------------------- | ----------- | ------------------------------------ |
| 1  | Virtual Network       | `br/public:avm/res/network/virtual-network`          | `0.5.0`     | `vnet-hackops-{env}-{suffix}`        |
| 2  | NSG (× 3)            | `br/public:avm/res/network/network-security-group`   | `0.5.0`     | `nsg-{purpose}-{env}`               |
| 3  | App Service Plan      | `br/public:avm/res/web/serverfarm`                   | `0.4.0`     | `asp-hackops-{env}-{suffix}`         |
| 4  | App Service           | `br/public:avm/res/web/site`                         | `0.12.0`    | `app-hackops-{env}-{suffix}`         |
| 5  | Cosmos DB Account     | `br/public:avm/res/document-db/database-account`     | `0.10.0`    | `cosmos-hackops-{env}-{suffix}`      |
| 6  | Key Vault             | `br/public:avm/res/key-vault/vault`                  | `0.11.0`    | `kv-hackops-{env}-{suffix}`          |
| 7  | Log Analytics         | `br/public:avm/res/operational-insights/workspace`   | `0.9.0`     | `log-hackops-{env}-{suffix}`         |
| 8  | Application Insights  | `br/public:avm/res/insights/component`               | `0.4.0`     | `appi-hackops-{env}-{suffix}`        |
| 9  | Private DNS Zone      | `br/public:avm/res/network/private-dns-zone`         | `0.7.0`     | `privatelink.documents.azure.com`    |

### Networking Topology

| Subnet       | CIDR             | IPs | Purpose                          |
| ------------ | ---------------- | --- | -------------------------------- |
| `snet-app`   | `10.0.0.0/26`   | 64  | App Service VNet integration     |
| `snet-pe`    | `10.0.0.64/27`  | 32  | Private Endpoints (Cosmos, KV)   |
| `snet-spare` | `10.0.0.96/27`  | 32  | Reserved for future services     |
| **VNet**     | `10.0.0.0/24`   | 256 | Total address space              |

### Cosmos DB Containers

| Container     | Partition Key  | Purpose               |
| ------------- | -------------- | --------------------- |
| `hackathons`  | `/id`          | Event lifecycle       |
| `teams`       | `/hackathonId` | Team roster           |
| `hackers`     | `/hackathonId` | Hacker profiles       |
| `scores`      | `/teamId`      | Approved scores       |
| `submissions` | `/teamId`      | Staging queue         |
| `rubrics`     | `/id`          | Scoring rubrics       |
| `config`      | `/id`          | App config            |
| `roles`       | `/hackathonId` | Role assignments      |
| `challenges`  | `/hackathonId` | Challenge definitions |
| `progression` | `/teamId`      | Unlock state          |

### Key Invariants for Infrastructure

1. All resources in `swedencentral` (verify governance allows)
2. Cosmos DB `publicNetworkAccess: Disabled` — Private Endpoint only
3. Key Vault RBAC authorization, purge protection enabled
4. App Service VNet integration with `WEBSITE_VNET_ROUTE_ALL=1`
5. Managed identity for Cosmos DB (SQL role assignment) and Key Vault
6. Deployment Stacks with deny-settings for resource protection
7. Baseline tags: `Environment`, `ManagedBy`, `Project`, `Owner`
8. 6-character deterministic suffix from `uniqueString(resourceGroup().id)`

### Deployment Target

| Parameter       | Value              |
| --------------- | ------------------ |
| Resource Group  | `rg-hackops-dev`   |
| Environment     | `dev`              |
| Project Name    | `hackops`          |
| Deployment Mode | Deployment Stacks  |

---

## References

- Technical plan: `.github/prompts/plan-hackOps.prompt.md`
- PRD: `docs/prd.md`
- API contract: `docs/api-contract.md`
- Azure defaults: `.github/skills/azure-defaults/SKILL.md`
- AVM module index: <https://aka.ms/avm/index>
