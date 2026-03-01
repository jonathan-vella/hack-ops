# Security Checklist

> [Current Version](../VERSION.md) | Consolidated security invariants for the HackOps platform

## Transport and Encryption

- [x] **TLS 1.2 minimum** — enforced at App Service and Cosmos DB
- [x] **HTTPS-only** — HTTP redirects to HTTPS, no plain-text endpoints
- [x] **Cosmos DB connection** — uses HTTPS endpoint with key or managed identity

## Identity and Access

- [x] **Managed Identity** — App Service uses system-assigned managed identity for Cosmos DB access
- [x] **Easy Auth** — Azure AD / Entra ID authentication via App Service Authentication
- [x] **Role-based access** — 4 roles enforced at API layer: `admin`, `coach`, `hacker`, `viewer`
- [x] **Primary admin protection** — built-in admin cannot be deleted or demoted
- [x] **No public Cosmos DB endpoint** — accessible only via managed identity from App Service

## Input Validation

- [x] **Zod on every route** — all API request bodies and query params validated with Zod schemas
- [x] **Boundary validation** — parse at module edges, not deep inside business logic
- [x] **Event code format** — alphanumeric, 6-20 chars, validated on input
- [x] **ID format** — UUIDs validated before database operations

## Rate Limiting and Abuse Prevention

- [x] **Event code rate limiting** — 5 attempts per minute per IP address
- [x] **API rate limiting** — configurable per-route limits via middleware
- [x] **Input length limits** — string fields have max-length constraints in Zod schemas

## CORS and Headers

- [x] **CORS policy** — restricted to known origins in production
- [x] **Security headers** — CSP, X-Content-Type-Options, X-Frame-Options set via Next.js config
- [x] **No credentials in URLs** — connection strings and keys via environment variables only

## Audit Trail

- [x] **Audit logging** — all write operations logged to `audit` container
- [x] **Principal tracking** — audit entries include actor identity from Easy Auth headers
- [x] **Immutable records** — audit entries are append-only, no delete/update API exposed

## Data Protection

- [x] **Cosmos DB encryption at rest** — enabled by default (service-managed keys)
- [x] **No PII in logs** — structured logging excludes sensitive fields
- [x] **Partition isolation** — hackathon data partitioned by hackathonId, preventing cross-tenant leakage

## Deployment Security

- [x] **OIDC for CI/CD** — GitHub Actions uses federated credentials, no long-lived secrets
- [x] **Staging slot validation** — deployments go to staging slot before production swap
- [x] **Environment separation** — dev and prod use separate App Service instances and Cosmos accounts
