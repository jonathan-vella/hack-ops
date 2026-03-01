---
description: "Gather HackOps Azure infrastructure requirements from the technical plan. Output: agent-output/hackops/01-requirements.md"
agent: 02-Requirements
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

# Gather HackOps Infrastructure Requirements

Seed the requirements phase with the HackOps tech stack from the
technical plan. Produce a structured requirements document that feeds
the architecture assessment.

## Mission

Read the technical plan and produce
`agent-output/hackops/01-requirements.md` — the infrastructure
requirements document covering networking, Azure SQL Database, App Service,
Key Vault, and monitoring components.

## Scope & Preconditions

- **Source**: `.github/prompts/plan-hackOps.prompt.md` — read these
  sections:
  - `Tech Stack Recommendation` (all subsections)
  - `Key Invariants`
  - `Phase 1` through `Phase 4` (infrastructure phases)
  - `Phase 12` (production hardening)
- **Template**: Read `.github/skills/azure-artifacts/SKILL.md` for
  the `01-requirements.md` template structure
- **Defaults**: Read `.github/skills/azure-defaults/SKILL.md` for
  naming, region, tag, and security baseline conventions
- **Output**: `agent-output/hackops/01-requirements.md`

## Workflow

### Step 1 — Read source material

Read `.github/prompts/plan-hackOps.prompt.md`. Extract:

1. All Azure resources from the `Tech Stack Recommendation` section
2. Non-negotiable constraints from `Key Invariants`
3. Infrastructure requirements from Phases 1-4 and Phase 12
4. AVM modules table and naming conventions

### Step 2 — Read conventions

Read `.github/skills/azure-defaults/SKILL.md`. Apply:

1. Default region: `swedencentral`
2. Required tags: `Environment`, `Project`, `Owner`, `CostCenter`
3. Security baseline: TLS 1.2, HTTPS-only, managed identity, no
   public endpoints on data-plane resources
4. Naming convention with 6-character deterministic suffix

### Step 3 — Generate requirements document

Create `agent-output/hackops/01-requirements.md` following the
template from the azure-artifacts skill. Include:

1. **Project overview**: HackOps hackathon management platform
2. **Business requirements**: Support 2-3 concurrent hackathons,
   ~75 concurrent users, role-based access (Admin, Coach, Hacker)
3. **Technical requirements**: Each Azure resource with SKU, region,
   networking, and security requirements
4. **Resource inventory**:
   - Virtual Network with 3 subnets
   - App Service Plan (P1v3) + App Service (Linux, Node 22)
   - Azure SQL Database (Serverless) with 10 tables
   - Key Vault with RBAC authorization
   - Log Analytics workspace + Application Insights
   - Private DNS Zone for Azure SQL
   - Private Endpoint for Azure SQL
   - NSGs for each subnet
5. **Non-functional requirements**: Performance, availability,
   security, cost targets
6. **Constraints**: AVM-first modules, Bicep IaC, deployment stacks

### Step 4 — Validate

Ensure the output file:

1. Exists at `agent-output/hackops/01-requirements.md`
2. Contains all required H2 sections per the artifact template
3. References every resource from the tech stack

## Output Expectations

- Single file: `agent-output/hackops/01-requirements.md`
- Follows the `01-requirements` artifact template structure
- All 9 AVM modules referenced with version constraints
- Naming table matches the plan's conventions

## Quality Assurance

- [ ] All resources from the tech stack are covered
- [ ] Security baseline requirements are explicit
- [ ] Naming conventions match the plan
- [ ] Region and tag defaults applied
- [ ] Template H2 structure is correct
