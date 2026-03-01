---
description: "Generate HackOps WAF assessment, cost estimate, and architecture decisions. Output: agent-output/hackops/02-architecture-assessment.md"
agent: 03-Architect
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "search/textSearch",
    "search/fileSearch",
    "execute/runInTerminal",
    "azure-mcp/*",
  ]
---

# Assess HackOps Architecture

Evaluate the HackOps infrastructure requirements against the Azure
Well-Architected Framework. Produce a WAF assessment with cost
estimates and architecture decisions.

## Mission

Read the requirements document and technical plan, then produce
`agent-output/hackops/02-architecture-assessment.md` — a WAF
assessment with pillar scores, cost estimates (using Azure Pricing
MCP if available), and architecture decision rationale.

## Scope & Preconditions

- **Requirements**: `agent-output/hackops/01-requirements.md` — the
  primary input (must exist before running this prompt)
- **Source plan**: `.github/prompts/plan-hackOps.prompt.md` — read
  `Tech Stack Recommendation` and `Trade-offs Summary` sections
- **Template**: Read `.github/skills/azure-artifacts/SKILL.md` for
  the `02-architecture-assessment.md` template structure
- **Cost skill**: Read `.github/skills/azure-defaults/SKILL.md` for
  pricing guidance and estimation approach
- **Output**: `agent-output/hackops/02-architecture-assessment.md`
- **Pricing MCP**: Use Azure Pricing MCP tools if available to get
  real pricing data; fall back to parametric estimates if unavailable

## Workflow

### Step 1 — Read inputs

1. Read `agent-output/hackops/01-requirements.md` — the
   requirements document
2. Read `.github/prompts/plan-hackOps.prompt.md` — extract the
   `Trade-offs Summary` table and `Tech Stack Recommendation`
3. Read `.github/skills/azure-defaults/SKILL.md` — WAF criteria
   and pricing guidance

### Step 2 — WAF pillar assessment

Evaluate each WAF pillar against the planned architecture:

| Pillar      | Key focus areas                                         |
| ----------- | ------------------------------------------------------- |
| Security    | Private endpoints, managed identity, Easy Auth, TLS 1.2 |
| Reliability | Serverless Cosmos DB, deployment slots, backup policy   |
| Performance | Serverless burst capacity, App Service tier, VNet       |
| Cost        | Serverless vs provisioned, B1/S1 tiers, free tier usage |
| Operations  | Log Analytics, App Insights, deployment stacks          |

Score each pillar 1-5 with justification.

### Step 3 — Cost estimation

Estimate monthly costs for the dev environment:

| Resource         | SKU/tier   | Estimated monthly cost |
| ---------------- | ---------- | ---------------------- |
| App Service Plan | P1v3       | ~$135/mo               |
| Cosmos DB        | Serverless | ~$1-5/mo (low usage)   |
| Key Vault        | Standard   | <$1/mo                 |
| Log Analytics    | Pay-as-go  | <$5/mo                 |
| App Insights     | Pay-as-go  | <$5/mo                 |
| VNet/NSG/PE      | Free       | $0                     |

Use Azure Pricing MCP tools to refine these estimates if the
tools are available. Otherwise, note that estimates are parametric
approximations requiring verification.

### Step 4 — Architecture decisions

Document key architecture decisions from the plan:

1. App Service over Container Apps — simpler, no Docker needed
2. Serverless Cosmos DB — cost-optimal for bursty workloads
3. Easy Auth with GitHub OAuth — built-in, no custom auth code
4. Private Endpoint for Cosmos DB — required security posture
5. Deployment stacks — resource protection and clean rollback

### Step 5 — Generate document

Create `agent-output/hackops/02-architecture-assessment.md`
following the template. Include WAF scores, cost estimates,
resource recommendations, and implementation handoff notes.

### Step 6 — Generate cost estimate

If the Architect agent convention includes a separate cost
estimate file, also create
`agent-output/hackops/03-des-cost-estimate.md`.

## Output Expectations

- Primary: `agent-output/hackops/02-architecture-assessment.md`
- Optional: `agent-output/hackops/03-des-cost-estimate.md`
- WAF pillar scores with justification
- Monthly cost estimate table (dev and prod)
- Architecture decisions with trade-off rationale

## Quality Assurance

- [ ] All 5 WAF pillars assessed with scores
- [ ] Cost estimates include all planned resources
- [ ] Trade-offs from the plan are acknowledged
- [ ] Template H2 structure followed
- [ ] Pricing sources noted (MCP or parametric)
