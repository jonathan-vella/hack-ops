---
description: "Run governance discovery and create the implementation plan for HackOps infrastructure. Output: agent-output/hackops/04-*.md/.json"
agent: 05-Bicep Planner
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

# Plan HackOps Infrastructure

Run governance discovery against the target subscription, then
create a comprehensive implementation plan for the HackOps Bicep
templates.

## Mission

Discover Azure Policy constraints, then produce an implementation
plan that maps all resources to AVM modules with governance
compliance. This is the Phase 1.5 + Phase 2-4 planning gate.

## Scope & Preconditions

- **Architecture assessment**:
  `agent-output/hackops/02-architecture-assessment.md` (must exist)
- **Requirements**: `agent-output/hackops/01-requirements.md`
- **Source plan**: `.github/prompts/plan-hackOps.prompt.md` — read
  Phases 1.5, 2, 3, and 4 for resource specifications
- **Azure connectivity**: Required. Verify with `az account show`
  before proceeding. If offline, create placeholder governance
  constraints documenting that discovery is pending
- **Governance skill**: Read
  `.github/instructions/bicep-governance.instructions.md` for
  governance discovery procedures
- **Defaults**: Read `.github/skills/azure-defaults/SKILL.md`
- **Output directory**: `agent-output/hackops/`

## Workflow

### Step 1 — Verify Azure connectivity

Run `az account show` to confirm:

1. Logged in to the correct subscription
2. Target resource group `rg-hackops-dev` exists or can be created

If offline, skip to Step 2b (placeholder mode).

### Step 2a — Run governance discovery (online)

Query the target subscription for Azure Policies:

1. Discover all policy assignments at subscription and management
   group scope
2. Classify policies by effect: `Deny`, `Audit`, `Modify`,
   `DeployIfNotExists`
3. Map policies to planned resources:
   - VNet, NSG, Subnets
   - Cosmos DB (Serverless)
   - App Service Plan + App Service
   - Key Vault
   - Log Analytics + App Insights
   - Private Endpoint + Private DNS Zone
4. Identify `Deny` policies that could block:
   - Serverless Cosmos DB SKU
   - B1/S1 App Service tiers
   - `publicNetworkAccess` settings
   - Allowed regions (verify `swedencentral`)
5. Discover required tags beyond the 4-tag baseline
6. Check allowed resource types and SKU restrictions

### Step 2b — Placeholder mode (offline)

If Azure connectivity is unavailable:

1. Create `agent-output/hackops/04-governance-constraints.json`
   with a `"status": "pending"` field and all planned resources
   listed
2. Create `agent-output/hackops/04-governance-constraints.md`
   noting that governance discovery must complete before any
   `az deployment` command
3. Proceed with the implementation plan using assumed defaults

### Step 3 — Generate governance constraints

Create two files:

1. `agent-output/hackops/04-governance-constraints.json` —
   machine-readable policy constraints
2. `agent-output/hackops/04-governance-constraints.md` —
   human-readable summary following the artifact template

### Step 4 — Generate implementation plan

Create `agent-output/hackops/04-implementation-plan.md` with:

1. **Resource inventory**: All 9+ resources with AVM module
   references and version constraints
2. **Module structure**: File layout for `infra/bicep/hackops/`
   - `main.bicep` — orchestrator
   - `main.bicepparam` — dev parameters
   - `modules/networking.bicep` — VNet, subnets, NSGs
   - `modules/monitoring.bicep` — Log Analytics, App Insights
   - `modules/key-vault.bicep` — Key Vault with private endpoint
   - `modules/cosmos-db.bicep` — Cosmos DB with containers, PE
   - `modules/app-service.bicep` — ASP, App Service, Easy Auth
   - `deploy.ps1` — deployment script
3. **Deployment phases**: Foundation → Database → Compute
4. **Dependency graph**: Resource creation order
5. **Naming conventions**: Table from the plan
6. **Security configuration**: Managed identity, RBAC, TLS

### Step 5 — Generate diagrams

Create dependency and runtime flow diagrams:

1. `agent-output/hackops/04-dependency-diagram.py` + `.png`
2. `agent-output/hackops/04-runtime-diagram.py` + `.png`

### Step 6 — Validate

1. Verify all output files exist
2. Ensure the implementation plan references all governance
   constraints
3. Confirm no `Deny` policies are unaddressed

## Output Expectations

- `agent-output/hackops/04-governance-constraints.json`
- `agent-output/hackops/04-governance-constraints.md`
- `agent-output/hackops/04-implementation-plan.md`
- `agent-output/hackops/04-dependency-diagram.py` + `.png`
- `agent-output/hackops/04-runtime-diagram.py` + `.png`

## Quality Assurance

- [ ] Governance constraints cover all planned resource types
- [ ] Implementation plan references every AVM module with version
- [ ] Deployment phases respect dependency order
- [ ] Naming table matches the technical plan
- [ ] Security configuration includes all baseline requirements
- [ ] No `Deny` policies left unaddressed or unacknowledged
