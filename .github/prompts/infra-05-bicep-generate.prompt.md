---
description: "Generate HackOps Bicep templates from the implementation plan. Output: infra/bicep/hackops/"
agent: 06-Bicep Code Generator
tools:
  [
    "read/readFile",
    "edit/editFiles",
    "edit/createFile",
    "search/textSearch",
    "search/fileSearch",
    "execute/runInTerminal",
  ]
---

# Generate HackOps Bicep Templates

Generate near-production-ready Bicep templates for the HackOps
infrastructure using AVM modules.

## Mission

Read the implementation plan and governance constraints, then
generate all Bicep templates in `infra/bicep/hackops/` with AVM
modules for every planned resource.

## Scope & Preconditions

- **Implementation plan**:
  `agent-output/hackops/04-implementation-plan.md` (must exist)
- **Governance constraints**:
  `agent-output/hackops/04-governance-constraints.json` (must exist)
- **Source plan**: `.github/prompts/plan-hackOps.prompt.md` — read
  Phases 2, 3, and 4 for detailed resource specifications
- **Bicep instructions**: Read
  `.github/instructions/bicep-code-best-practices.instructions.md`
- **Bicep governance**: Read
  `.github/instructions/bicep-governance.instructions.md`
- **Bicep patterns**: Read
  `.github/skills/azure-bicep-patterns/SKILL.md` for module
  composition patterns
- **Output directory**: `infra/bicep/hackops/`

## Workflow

### Step 1 — Read inputs

1. Read `agent-output/hackops/04-implementation-plan.md` — module
   structure, resource inventory, naming conventions
2. Read `agent-output/hackops/04-governance-constraints.json` —
   policy constraints to comply with
3. Read `.github/prompts/plan-hackOps.prompt.md` — Phases 2-4 for
   exact resource configurations
4. Read `.github/instructions/bicep-code-best-practices.instructions.md`
5. Read `.github/skills/azure-bicep-patterns/SKILL.md`

### Step 2 — Generate main.bicep

Create `infra/bicep/hackops/main.bicep`:

1. Parameters: `environment`, `projectName`, `location`, `owner`
2. `var uniqueSuffix = take(uniqueString(resourceGroup().id), 6)`
3. Tags variable with all baseline + governance-discovered tags
4. Module calls in dependency order:
   - `networking` → VNet, subnets, NSGs
   - `monitoring` → Log Analytics, App Insights
   - `keyVault` → Key Vault with PE on `snet-pe`
   - `sqlDatabase` → Azure SQL Database with 10 tables, PE, role assignment
   - `appService` → ASP, App Service, VNet integration, Easy Auth
5. Outputs: resource IDs, endpoints, App Service default hostname

### Step 3 — Generate parameter file

Create `infra/bicep/hackops/main.bicepparam`:

- `environment = 'dev'`
- `projectName = 'hackops'`
- `location = 'swedencentral'`
- `owner = '{deployer}'`

### Step 4 — Generate module files

Create each module in `infra/bicep/hackops/modules/`:

#### networking.bicep

- AVM module: `network/virtual-network` (0.5.0+)
- VNet: `10.0.0.0/24`
- Subnets: `snet-app` (/26, delegation), `snet-pe` (/27),
  `snet-spare` (/27)
- NSGs per subnet with appropriate rules
- AVM module: `network/network-security-group` (0.5.0+)

#### monitoring.bicep

- AVM module: `operational-insights/workspace` (0.9.0+)
- AVM module: `insights/component` (0.4.0+)
- Log Analytics workspace connected to App Insights

#### key-vault.bicep

- AVM module: `key-vault/vault` (0.11.0+)
- RBAC authorization (no access policies)
- Purge protection enabled
- Private endpoint on `snet-pe`
- `publicNetworkAccess: 'Disabled'` (prod)

#### sql-database.bicep

- AVM module: `sql/server` (0.12.0+)
- Serverless tier, Azure AD authentication
- 10 tables with primary keys and indexes from the plan
- Private endpoint on `snet-pe` with configurable DNS zone
- SQL role assignment for App Service managed identity
- Connection string stored in Key Vault
- Periodic backup (default free tier)

#### app-service.bicep

- AVM modules: `web/serverfarm` (0.4.0+) + `web/site` (0.12.0+)
- Linux, Node 22 LTS, P1v3 (all environments)
- System-assigned managed identity
- VNet integration on `snet-app`
- Easy Auth GitHub OAuth configuration
- App Settings via Key Vault references
- APPLICATIONINSIGHTS_CONNECTION_STRING
- WEBSITE_VNET_ROUTE_ALL=1
- WEBSITE_DNS_SERVER=168.63.129.16
- Staging deployment slot

### Step 5 — Generate deployment script

Create `infra/bicep/hackops/deploy.ps1`:

- Deployment stacks support (`az stack group create`)
- Parameters: Environment, Location, WhatIf switch
- Resource group creation if needed
- What-if analysis option

### Step 6 — Validate

Run `bicep build infra/bicep/hackops/main.bicep` to verify
syntax. Fix any errors before completing.

## Output Expectations

- `infra/bicep/hackops/main.bicep`
- `infra/bicep/hackops/main.bicepparam`
- `infra/bicep/hackops/modules/networking.bicep`
- `infra/bicep/hackops/modules/monitoring.bicep`
- `infra/bicep/hackops/modules/key-vault.bicep`
- `infra/bicep/hackops/modules/sql-database.bicep`
- `infra/bicep/hackops/modules/app-service.bicep`
- `infra/bicep/hackops/deploy.ps1`
- Also create `agent-output/hackops/05-implementation-reference.md`
  linking to the generated templates

## Quality Assurance

- [ ] `bicep build main.bicep` succeeds with no errors
- [ ] All 9 AVM modules used with version constraints
- [ ] Naming matches the plan's convention table
- [ ] Governance constraints are respected (tags, SKUs, TLS)
- [ ] Security baseline enforced (managed identity, HTTPS-only,
      private endpoints, no public data-plane access)
- [ ] `uniqueSuffix` generated once and passed to all modules
- [ ] SQL Database role assignment (db_datareader + db_datawriter) for data plane
