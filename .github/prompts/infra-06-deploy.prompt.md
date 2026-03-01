---
description: "Deploy HackOps infrastructure to Azure with what-if analysis. Output: agent-output/hackops/06-deployment-summary.md"
agent: 07-Deploy
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

# Deploy HackOps Infrastructure

Run what-if analysis then deploy the HackOps Bicep templates to
the `rg-hackops-dev` resource group.

## Mission

Execute the deployment script with what-if analysis first, then
proceed with actual deployment after review. Produce a deployment
summary documenting all created resources.

## Scope & Preconditions

- **Bicep templates**: `infra/bicep/hackops/` (must exist with
  `main.bicep` that passes `bicep build`)
- **Governance constraints**:
  `agent-output/hackops/04-governance-constraints.json` — verify
  status is not `"pending"`. Governance discovery must be complete
  before any deployment
- **Azure connectivity**: Required. Verify with `az account show`
- **Target**: Resource group `rg-hackops-dev` in `centralus`
- **Deployment method**: Azure Deployment Stacks
  (`az stack group create`)
- **Output**: `agent-output/hackops/06-deployment-summary.md`

## Workflow

### Step 1 — Preflight checks

1. Run `az account show` — confirm correct subscription
2. Run `bicep build infra/bicep/hackops/main.bicep` — confirm
   templates compile
3. Read `agent-output/hackops/04-governance-constraints.json` —
   confirm governance discovery is complete (not `"pending"`)
4. Check resource group exists:
   `az group show -n rg-hackops-dev` or create it

### Step 2 — What-if analysis

Run what-if to preview changes:

```bash
az deployment group what-if \
  --resource-group rg-hackops-dev \
  --template-file infra/bicep/hackops/main.bicep \
  --parameters infra/bicep/hackops/main.bicepparam
```

Review the output for:

1. Expected resource creation (all planned resources)
2. No unexpected deletions
3. No policy violations
4. Resource naming matches conventions

**Gate**: Do not proceed to deployment if what-if shows policy
violations or unexpected changes. Document issues and stop.

### Step 3 — Deploy via Deployment Stacks

Deploy using deployment stacks for resource protection:

```bash
az stack group create \
  --name hackops-dev \
  --resource-group rg-hackops-dev \
  --template-file infra/bicep/hackops/main.bicep \
  --parameters infra/bicep/hackops/main.bicepparam \
  --deny-settings-mode denyWriteAndDelete \
  --action-on-unmanage detachAll \
  --yes
```

Monitor deployment status and capture outputs.

### Step 4 — Post-deployment verification

1. Verify all resources created:
   `az resource list -g rg-hackops-dev -o table`
2. Verify Cosmos DB private endpoint connectivity
3. Verify Key Vault accessibility
4. Verify App Service is running and reachable via HTTPS
5. Verify App Insights is receiving telemetry

### Step 5 — Generate deployment summary

Create `agent-output/hackops/06-deployment-summary.md` following
the artifact template. Include:

1. Preflight validation results
2. Deployment details (timestamp, method, duration)
3. All deployed resources with IDs and endpoints
4. Deployment outputs
5. Post-deployment task checklist (Easy Auth OAuth app setup,
   DNS configuration, etc.)

## Output Expectations

- `agent-output/hackops/06-deployment-summary.md`
- All resources deployed to `rg-hackops-dev`
- Deployment stack `hackops-dev` protecting resources

## Quality Assurance

- [ ] `az account show` confirms correct subscription
- [ ] What-if shows no policy violations
- [ ] All planned resources created successfully
- [ ] Deployment stack is active with deny settings
- [ ] Deployment summary follows template structure
- [ ] Post-deployment tasks are documented
