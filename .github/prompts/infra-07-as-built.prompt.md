---
description: "Generate post-deployment documentation suite for HackOps infrastructure. Output: agent-output/hackops/07-*.md"
agent: 08-As-Built
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

# Document HackOps As-Built Infrastructure

Generate the complete post-deployment documentation suite for the
HackOps infrastructure.

## Mission

Read all prior artifacts (Steps 1-6) and query deployed resource
state, then produce the full Step 7 documentation suite: design
document, operations runbook, cost estimate, compliance matrix,
backup/DR plan, resource inventory, and documentation index.

## Scope & Preconditions

- **Prior artifacts**: All files in `agent-output/hackops/`
  (01 through 06 must exist)
- **Deployed resources**: `rg-hackops-dev` must have active
  deployment. Verify with `az resource list -g rg-hackops-dev`
- **Bicep templates**: `infra/bicep/hackops/` for implementation
  reference
- **Workload documentation instructions**: Read
  `.github/instructions/workload-documentation.instructions.md`
- **Artifact templates**: Read
  `.github/skills/azure-artifacts/SKILL.md` for all Step 7
  template structures
- **Output directory**: `agent-output/hackops/`

## Workflow

### Step 1 — Read all prior artifacts

Read all existing files in `agent-output/hackops/`:

1. `01-requirements.md` — original requirements
2. `02-architecture-assessment.md` — WAF assessment and decisions
3. `03-des-*.md` — ADRs and design decisions
4. `04-implementation-plan.md` — module structure and deployment
5. `04-governance-constraints.md` — policy compliance
6. `06-deployment-summary.md` — deployment details

### Step 2 — Query deployed state

If Azure is connected:

1. `az resource list -g rg-hackops-dev -o json` — full inventory
2. Query specific resources for configuration details
3. Capture actual SKUs, endpoints, IPs, and settings

If offline, use the deployment summary and implementation plan
as the source of truth.

### Step 3 — Generate documentation suite

Create each Step 7 document following the artifact templates:

#### 07-design-document.md
Comprehensive design document covering architecture overview,
networking, storage (Cosmos DB), compute (App Service), identity
and access, security, backup/DR, and monitoring.

#### 07-operations-runbook.md
Operational procedures: daily checks, incident response, common
procedures (scaling, key rotation, certificate renewal),
maintenance windows, contacts, and change log.

#### 07-ab-cost-estimate.md
As-built cost estimate based on actual deployed SKUs and
observed usage patterns. Dev and prod projections.

#### 07-compliance-matrix.md
Map deployed resources against security and governance
requirements. Control mapping, gap analysis, evidence
collection guidance.

#### 07-backup-dr-plan.md
Recovery objectives (RPO/RTO), backup strategy (Cosmos DB
periodic backup, App Service snapshots), disaster recovery
procedures, testing schedule.

#### 07-resource-inventory.md
Complete inventory of all deployed resources with IDs,
SKUs, regions, tags, networking details, and dependencies.

#### 07-documentation-index.md
Index linking all generated documentation with descriptions
and quick reference for each document.

### Step 4 — Validate

1. Verify all 7 output files exist
2. Confirm each file follows its template H2 structure
3. Cross-reference resource inventory against deployment summary

## Output Expectations

- `agent-output/hackops/07-design-document.md`
- `agent-output/hackops/07-operations-runbook.md`
- `agent-output/hackops/07-ab-cost-estimate.md`
- `agent-output/hackops/07-compliance-matrix.md`
- `agent-output/hackops/07-backup-dr-plan.md`
- `agent-output/hackops/07-resource-inventory.md`
- `agent-output/hackops/07-documentation-index.md`

## Quality Assurance

- [ ] All 7 documents created
- [ ] Each document follows its template H2 structure
- [ ] Resource inventory matches deployed resources
- [ ] Cost estimates reflect actual SKUs
- [ ] Security controls are documented and mapped
- [ ] DR plan includes testable recovery procedures
- [ ] Documentation index links all artifacts correctly
