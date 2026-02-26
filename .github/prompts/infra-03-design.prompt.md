---
description: "Generate HackOps architecture diagram and ADRs for key infrastructure decisions. Output: agent-output/hackops/03-des-*.py/.png/.md"
agent: 04-Design
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

# Design HackOps Infrastructure

Generate architecture diagrams and Architecture Decision Records
(ADRs) for the HackOps infrastructure.

## Mission

Read the architecture assessment and technical plan, then produce
visual diagrams (VNet topology, private endpoints, App Service to
Cosmos DB flow) and ADRs for key decisions.

## Scope & Preconditions

- **Architecture assessment**:
  `agent-output/hackops/02-architecture-assessment.md` (must exist)
- **Requirements**: `agent-output/hackops/01-requirements.md`
- **Source plan**: `.github/prompts/plan-hackOps.prompt.md` — read
  `Tech Stack Recommendation` for resource topology and
  `Trade-offs Summary` for decision rationale
- **Diagram skill**: Read `.github/skills/azure-diagrams/SKILL.md`
  for diagram conventions and Python `diagrams` library patterns
- **ADR skill**: Read `.github/skills/azure-adr/SKILL.md` for ADR
  template and conventions
- **Output directory**: `agent-output/hackops/`

## Workflow

### Step 1 — Read inputs

1. Read `agent-output/hackops/02-architecture-assessment.md`
2. Read `agent-output/hackops/01-requirements.md`
3. Read `.github/prompts/plan-hackOps.prompt.md` — `Tech Stack
   Recommendation` and Phases 2-4 for resource topology
4. Read `.github/skills/azure-diagrams/SKILL.md` for diagram
   conventions
5. Read `.github/skills/azure-adr/SKILL.md` for ADR template

### Step 2 — Generate architecture diagram

Create `agent-output/hackops/03-des-diagram.py` using the Python
`diagrams` library. The diagram must show:

1. **VNet topology**: `vnet-hackops-{env}` with 3 subnets
   - `snet-app` (10.0.0.0/26) — App Service integration
   - `snet-pe` (10.0.0.64/27) — Private Endpoints
   - `snet-spare` (10.0.0.96/27) — Reserved
2. **Compute**: App Service on `snet-app` with Easy Auth
3. **Data**: Cosmos DB connected via Private Endpoint on `snet-pe`
4. **Security**: Key Vault on `snet-pe`, NSGs on each subnet
5. **Monitoring**: Log Analytics + App Insights receiving diagnostics
6. **DNS**: Private DNS Zone resolving Cosmos DB FQDN
7. **Data flow**: User → App Service → (VNet) → Private Endpoint →
   Cosmos DB; App Service → Key Vault (secrets)

Run the Python script to generate `03-des-diagram.png`.

### Step 3 — Generate ADRs

Create ADRs for key infrastructure decisions:

1. **ADR-001: Serverless Cosmos DB over Provisioned**
   - Context: ~75 concurrent users, bursty event-driven usage
   - Decision: Serverless capacity mode
   - Consequences: No guaranteed throughput, 1K RU/s burst limit

2. **ADR-002: App Service over Container Apps**
   - Context: Solo dev, no container requirement, Easy Auth needed
   - Decision: App Service (Linux, Node 22)
   - Consequences: No scale-to-zero, but simpler deployment

3. **ADR-003: Easy Auth (GitHub OAuth) over Custom Auth**
   - Context: GitHub-centric hackathon platform
   - Decision: App Service Easy Auth with GitHub provider
   - Consequences: Must verify enterprise allows GitHub OAuth;
     fallback to Entra ID with external identities if blocked

Save as:
- `agent-output/hackops/03-des-adr-001-serverless-cosmos.md`
- `agent-output/hackops/03-des-adr-002-app-service-compute.md`
- `agent-output/hackops/03-des-adr-003-easy-auth-github.md`

### Step 4 — Validate outputs

1. Verify all output files exist
2. Run `python3 agent-output/hackops/03-des-diagram.py` to confirm
   PNG generation (if `diagrams` library is installed)
3. Verify ADRs follow the template structure

## Output Expectations

- `agent-output/hackops/03-des-diagram.py` — diagram source
- `agent-output/hackops/03-des-diagram.png` — rendered diagram
- `agent-output/hackops/03-des-adr-001-serverless-cosmos.md`
- `agent-output/hackops/03-des-adr-002-app-service-compute.md`
- `agent-output/hackops/03-des-adr-003-easy-auth-github.md`

## Quality Assurance

- [ ] Diagram shows all resources from the architecture assessment
- [ ] VNet topology matches Phase 2 subnet plan
- [ ] Data flow arrows are directional and labeled
- [ ] Each ADR has Context, Decision, Status, Consequences sections
- [ ] ADRs reference WAF pillar impacts
