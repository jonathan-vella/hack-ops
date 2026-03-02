# ADR-0002: App Service over Container Apps for Compute

![Step](https://img.shields.io/badge/Step-3-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Superseded-red?style=for-the-badge)
![Type](https://img.shields.io/badge/Type-ADR-purple?style=for-the-badge)

<details open>
<summary><strong>📑 Decision Contents</strong></summary>

- [🔍 Context](#-context)
- [✅ Decision](#-decision)
- [🔄 Alternatives Considered](#-alternatives-considered)
- [⚖️ Consequences](#%EF%B8%8F-consequences)
- [🏛️ WAF Pillar Analysis](#%EF%B8%8F-waf-pillar-analysis)
- [🔒 Compliance Considerations](#-compliance-considerations)
- [📝 Implementation Notes](#-implementation-notes)

</details>

> Status: Superseded (2026-03-01)
> Date: 2026-02-26
> Deciders: HackOps architecture team
>
> **Superseded by runtime decisions**: B1/S1 zip-deploy replaced
> with P1v4 container deploy (ACR + Dockerfile). See execution
> plan Phase G and decisions log.

## 🔍 Context

HackOps is a Next.js 15 application (SSR + API Routes) built by
a solo developer. The compute platform must support:

- Node.js 22 LTS runtime
- GitHub OAuth authentication (built-in preferred)
- VNet integration for Private Endpoint access to Azure SQL Database
- Deployment slots for zero-downtime deployments
- Always-on for consistent leaderboard SSR latency

The project has no container requirement — the application is
a standard Node.js app deployable via zip deploy.

## ✅ Decision

Use **Azure App Service** (Linux, P1v4) with container deploy
from Azure Container Registry.

App Service hosts the Next.js application as a containerized
deployment via ACR. GitHub OAuth is handled by the built-in
Easy Auth feature. Staging slot enables zero-downtime swaps.

> **Original decision** (2026-02-26): B1 tier for dev, S1 for
> production with zip deploy. Superseded in Phase G when the
> project moved to container-based deployment requiring P1v4.

## 🔄 Alternatives Considered

| Option                      | Pros                                  | Cons                                            | WAF Impact                  |
| --------------------------- | ------------------------------------- | ----------------------------------------------- | --------------------------- |
| **App Service** (chosen)    | Easy Auth built-in, staging slots, ACR | P1v4 cost (~$85/mo); no scale-to-zero           | Cost: →, Operations: ↑      |
| Azure Container Apps        | Scale-to-zero, modern platform        | Requires Dockerfile, no Easy Auth, more complex | Cost: ↑, Operations: ↓      |
| Azure Functions             | Event-driven, auto-scale              | Cold start latency, no SSR support              | Performance: ↓, Cost: ↑     |
| Azure Static Web Apps + API | Free tier, global CDN                 | Limited API routes, no SSR, no VNet integration | Performance: ↓, Security: ↓ |

**Rejection rationale**:

- **Container Apps**: Adds Docker build complexity for zero
  benefit — the app is a standard Node.js project. Easy Auth
  is not available on Container Apps, requiring custom OAuth
  implementation.
- **Azure Functions**: Cold-start latency on the consumption
  plan is unacceptable for a live leaderboard requiring < 2s
  SSR response. Function-based architecture also fragments the
  Next.js app into discrete functions.
- **Static Web Apps**: Cannot serve SSR pages, limited to
  serverless API backends, and does not support VNet integration
  needed for Private Endpoint access to Azure SQL Database.

## ⚖️ Consequences

### Positive

- Built-in Easy Auth handles GitHub OAuth with zero custom code
- Zip deploy from GitHub Actions — no Docker build step
- Deployment slots for zero-downtime production deployments
- VNet integration with `WEBSITE_VNET_ROUTE_ALL=1` routes all
  outbound through the VNet
- Mature platform with extensive documentation and community

### Negative

- No scale-to-zero — P1v4 costs ~$85/mo even with no traffic
- Container build adds CI pipeline complexity (Trivy scan,
  ACR push, image digest pinning)
- Locked to App Service — cannot easily migrate to Container
  Apps later without adding Docker
- Easy Auth dependency means auth strategy is tied to App Service

### Neutral

- App Service supports both Linux and Windows; Linux chosen
  for Node.js ecosystem alignment
- Staging slot used for zero-downtime container deployments
  with auto-rollback on health check failure

## 🏛️ WAF Pillar Analysis

| Pillar      | Impact | Notes                                               |
| ----------- | ------ | --------------------------------------------------- |
| Security    | ↑      | Easy Auth reduces attack surface (no custom auth)   |
| Reliability | ↑      | P1v4 provides 99.95% SLA; staging slot swap          |
| Performance | ↑      | Always-on + P1v4 (4 GB RAM) handles peak hackathons  |
| Cost        | →      | ~$85/mo (P1v4); acceptable for hackathon workload   |
| Operations  | ↑      | Simplest deployment model; no container management  |

## 🔒 Compliance Considerations

- App Service VNet integration uses subnet delegation
  (`Microsoft.Web/serverFarms`) — verify no policy blocks this
- Easy Auth GitHub OAuth requires a GitHub OAuth App registration;
  enterprise policies may enforce Entra ID-only authentication
- TLS 1.2 enforced via `minTlsVersion: '1.2'` configuration
- HTTPS-only via `httpsOnly: true`

## 📝 Implementation Notes

- AVM modules: `br/public:avm/res/web/serverfarm:0.4.0` +
  `br/public:avm/res/web/site:0.12.0`
- Configure `linuxFxVersion: 'NODE|22-lts'` for Node 22
- Set `WEBSITE_VNET_ROUTE_ALL=1` to force VNet routing
- Set `WEBSITE_DNS_SERVER=168.63.129.16` for private DNS resolution
- Use `APPLICATIONINSIGHTS_CONNECTION_STRING` (not the deprecated
  instrumentation key)
- Create GitHub OAuth App with callback URL:
  `https://app-hackops-{env}-{suffix}.azurewebsites.net/.auth/login/github/callback`
- Test Easy Auth GitHub login immediately after first deployment
  to verify enterprise policy compatibility
