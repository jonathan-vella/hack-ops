# ADR-0004: Azure SQL Database over Cosmos DB (Capacity Constraints)

![Step](https://img.shields.io/badge/Step-3-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Proposed-orange?style=for-the-badge)
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

> Status: Proposed
> Date: 2026-03-01
> Deciders: HackOps architecture team
> Supersedes: ADR-0001 (Serverless Cosmos DB)

## 🔍 Context

HackOps currently uses Azure Cosmos DB NoSQL (Serverless) for all application
state across 10 containers. While the serverless model fit the bursty usage
pattern, we are hitting **capacity constraints** that make Cosmos DB
impractical for continued use:

- Serverless mode caps at 1 TB storage and 5,000 RU/s burst — no headroom
- Provisioned mode requires minimum 400 RU/s per container (10 containers
  = 4,000 RU/s minimum) at ~$292/month — expensive for a hackathon tool
- Cross-partition queries on `submissions`, `scores`, and `roles` are
  inefficient without careful partition key design
- No referential integrity — all relationship enforcement is in app code

The workload is fundamentally relational: hackathons contain teams, teams
contain hackers, teams submit for challenges, coaches score submissions.
The query patterns (joins, aggregations for leaderboard, filtered listings)
align better with SQL than NoSQL.

## ✅ Decision

Replace Cosmos DB NoSQL with **Azure SQL Database** (General Purpose,
Serverless compute tier) with:

- **Private endpoint** + **private DNS zone** (`privatelink.database.windows.net`)
- **Entra-only authentication** — SQL auth disabled entirely
- **Managed identity RBAC** — App Service system-assigned MI granted
  `db_datareader` + `db_datawriter` roles
- **TLS 1.2** minimum, public network access disabled

## 🔄 Alternatives Considered

| Option                                     | Pros                                                           | Cons                                                          | WAF Impact             |
| ------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| **Cosmos DB Provisioned**                  | Same SDK, no migration                                         | Min 4,000 RU/s (~$292/mo), still no RI                        | Cost: ⛔               |
| **Azure SQL Database** (chosen)            | Relational RI, SQL joins, ~$5-15/mo serverless, mature tooling | Schema migration needed, different SDK                        | Cost: ✅, Security: ✅ |
| **Azure Database for PostgreSQL Flexible** | Open source, JSON support                                      | Higher baseline cost (~$25/mo), less Azure-native integration | Cost: ➖, Ops: ➖      |
| **Cosmos DB for PostgreSQL**               | Distributed SQL                                                | Overkill for 75 concurrent users, higher cost                 | Cost: ⛔               |

## ⚖️ Consequences

### Positive

- **~80% cost reduction**: SQL Serverless auto-pause at $0/idle vs Cosmos min RU charges
- **Referential integrity**: FK constraints enforce data model invariants in the database
- **Transaction support**: Multi-table operations (team assignment, submission approval)
  can be wrapped in `BEGIN TRAN`
- **Mature tooling**: SSMS, Azure Data Studio, EF migrations, well-understood by all devs
- **Simpler queries**: Real JOINs replace multi-container fan-out + in-memory assembly

### Negative

- **Migration effort**: ~24 source files need updating (data layer + all API routes)
- **Schema rigidity**: Schema changes require DDL migrations (vs Cosmos schema-less)
- **No built-in change feed**: Would need triggers or polling for event-driven patterns
- **Connection pooling**: Must manage SQL connection pool with token refresh for Entra auth

### Risks

- Entra token refresh in long-running pools requires careful implementation
- SQL serverless auto-pause adds ~60s cold-start latency after idle periods

## 🏛️ WAF Pillar Analysis

| Pillar          | Impact      | Notes                                                                                  |
| --------------- | ----------- | -------------------------------------------------------------------------------------- |
| **Security**    | ✅ Improved | Entra-only auth eliminates key management; private endpoint enforces network isolation |
| **Reliability** | ➖ Neutral  | Both offer 99.99% SLA; SQL adds transaction consistency                                |
| **Performance** | ✅ Improved | Real indexes, JOINs, and query optimizer vs cross-partition scatter-gather             |
| **Cost**        | ✅ Improved | ~$5-15/mo (Serverless GP) vs ~$25-292/mo (Cosmos)                                      |
| **Operations**  | ➖ Neutral  | Trades Cosmos SDK patterns for standard SQL patterns; both well-understood             |

## 🔒 Compliance Considerations

- **Network**: Public access disabled; private endpoint on `snet-pe` subnet
- **Authentication**: `azureADOnlyAuthentication: true` — no SQL user/password
- **Encryption**: TDE enabled by default; TLS 1.2 minimum enforced
- **Audit**: SQL Auditing enabled to Log Analytics workspace
- **RBAC**: App Service MI gets minimal `db_datareader` + `db_datawriter` (not `db_owner`)

## 📝 Implementation Notes

### Infrastructure (Bicep)

- New module: `modules/sql-database.bicep` — SQL Server + Database + PE + DNS
- Uses AVM module `br/public:avm/res/sql/server` where possible
- Private DNS zone: `privatelink.database.windows.net` linked to VNet
- SQL Serverless: General Purpose, 0.5–2 vCores, auto-pause after 60 min

### App Layer

- Replace `@azure/cosmos` with `mssql` package
- New `sql.ts` module: connection pool with `DefaultAzureCredential` token auth
- DDL schema in `schema.sql` with proper tables, FKs, indexes
- JSON columns for embedded arrays (`members`, `categoryScores`, `unlockedChallenges`)

### Data Model Mapping

| Cosmos Container | SQL Table(s)                          | Notes                                                          |
| ---------------- | ------------------------------------- | -------------------------------------------------------------- |
| `hackathons`     | `hackathons`                          | Direct 1:1 mapping                                             |
| `teams`          | `teams`                               | `members` as JSON column                                       |
| `hackers`        | `hackers`                             | Direct mapping                                                 |
| `scores`         | `scores`                              | `categoryScores` as JSON column                                |
| `submissions`    | `submissions`                         | `scores`, `attachments` as JSON columns                        |
| `rubrics`        | `rubric_pointers` + `rubric_versions` | Split two `_type` values into two tables; `categories` as JSON |
| `config`         | `config`                              | Direct mapping                                                 |
| `roles`          | `roles`                               | Direct mapping                                                 |
| `challenges`     | `challenges`                          | Direct mapping                                                 |
| `progression`    | `progressions`                        | `unlockedChallenges` as JSON column                            |
| `audit`          | `audit_log`                           | Direct mapping                                                 |
