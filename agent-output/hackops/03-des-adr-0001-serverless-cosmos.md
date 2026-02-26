# ADR-0001: Serverless Cosmos DB over Provisioned Throughput

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
> Date: 2026-02-26
> Deciders: HackOps architecture team

## 🔍 Context

HackOps manages hackathon events with ~75 max concurrent users
across 2–3 parallel events. The usage pattern is highly bursty —
traffic spikes during hackathon events (scoring, submissions,
leaderboard refreshes) and drops to near-zero between events.
The platform stores data across 10 Cosmos DB containers using
the NoSQL (Core) API.

Azure Cosmos DB offers two capacity modes:

- **Provisioned throughput**: Fixed RU/s allocation (minimum 400
  RU/s per container or shared across database), billed per hour
- **Serverless**: Pay-per-request (~$0.25 per 100K RUs), no
  minimum, automatic scale to 5K RU/s burst

The monthly budget for the dev environment is ~$30-50.

## ✅ Decision

Use **Cosmos DB Serverless capacity mode** for all environments.

The Cosmos DB account is configured with `capacityMode: 'Serverless'`
and hosts all 10 containers within a single database. No throughput
provisioning is required.

## 🔄 Alternatives Considered

| Option                  | Pros                                | Cons                                        | WAF Impact               |
| ----------------------- | ----------------------------------- | ------------------------------------------- | ------------------------ |
| **Serverless** (chosen) | Pay-per-use, no minimum, auto-burst | No guaranteed throughput, 1K RU/s burst cap | Cost: ↑, Reliability: →  |
| Provisioned (400 RU/s)  | Guaranteed throughput, SLA covered  | ~$23/mo minimum even with zero traffic      | Cost: ↓, Reliability: ↑  |
| Provisioned autoscale   | Scales 10-100% of max RU/s          | Minimum 1000 RU/s max = ~$58/mo min         | Cost: ↓↓, Reliability: ↑ |

**Rejection rationale**:

- Provisioned 400 RU/s costs ~$23/mo per database — more than the
  entire Serverless bill at this workload. Wasted 95% of the time.
- Autoscale minimum (1000 RU/s max) costs even more and is designed
  for workloads with unpredictable but sustained traffic.

## ⚖️ Consequences

### Positive

- Monthly database cost under $5 for dev (vs. ~$23+ provisioned)
- No capacity planning or throughput tuning required
- Automatic scaling to 5K RU/s handles hackathon event spikes
- Simpler Bicep — no throughput parameters to manage

### Negative

- 1K RU/s burst limit on individual containers could throttle
  heavy leaderboard aggregation queries
- No SLA on serverless (99.99% SLA only on provisioned)
- Cannot use Cosmos DB change feed triggers (serverless limitation)
- Maximum 1 TB storage per container

### Neutral

- Serverless and provisioned Cosmos DB use the same SDK,
  connection patterns, and Private Endpoint configuration
- Migration from Serverless to provisioned is a
  configuration change (no data migration)

## 🏛️ WAF Pillar Analysis

| Pillar      | Impact | Notes                                               |
| ----------- | ------ | --------------------------------------------------- |
| Security    | →      | Same Private Endpoint, managed identity access      |
| Reliability | ↓      | No SLA on serverless; acceptable for hackathon tool |
| Performance | →      | 1K RU/s burst sufficient for ~75 users              |
| Cost        | ↑↑     | 80–90% savings vs. provisioned at this scale        |
| Operations  | ↑      | No throughput tuning; simpler configuration         |

## 🔒 Compliance Considerations

- Serverless Cosmos DB supports Private Endpoints and
  `publicNetworkAccess: Disabled` — meets network security policy
- Backup policy (periodic, 2 copies/4 hours) applies equally
  to serverless
- Governance policies for Cosmos DB SKUs may need to permit
  serverless capacity mode — verify in `04-governance-constraints`

## 📝 Implementation Notes

- Configure in Bicep: `capacityMode: 'Serverless'` on the
  database account resource
- AVM module: `br/public:avm/res/document-db/database-account:0.10.0`
- Do NOT set throughput on individual containers — serverless
  manages this automatically
- Monitor consumed RU/s via App Insights custom metrics to
  detect if burst limit is reached during events
- If the platform grows beyond ~200 concurrent users, re-evaluate
  and switch to provisioned autoscale
