# Governance Discovery

> Extracted from `azure-defaults/SKILL.md` for progressive loading.
> Load when discovering Azure Policy assignments or building governance constraints.

## MANDATORY Gate

Governance discovery is a **hard gate**. If Azure connectivity is unavailable or policies cannot
be fully retrieved (including management group-inherited), STOP and inform the user.
Do NOT proceed to implementation planning with incomplete policy data.

## Discovery Commands (Ordered by Completeness)

**1. REST API (MANDATORY — includes management group-inherited policies)**:

```bash
SUB_ID=$(az account show --query id -o tsv)
az rest --method GET \
  --url "https://management.azure.com/subscriptions/\
${SUB_ID}/providers/Microsoft.Authorization/\
policyAssignments?api-version=2022-06-01" \
  --query "value[].{name:name, \
displayName:properties.displayName, \
scope:properties.scope, \
enforcementMode:properties.enforcementMode, \
policyDefinitionId:properties.policyDefinitionId}" \
  -o json
```

> [!CAUTION]
> `az policy assignment list` only returns subscription-scoped assignments.
> Management group policies (often Deny/tag enforcement) are invisible to it.
> **ALWAYS use the REST API above as the primary discovery method.**

**2. Policy Definition Drill-Down (for each Deny/DeployIfNotExists)**:

```bash
# For built-in or subscription-scoped policies
az policy definition show --name "{guid}" \
  --query "{displayName:displayName, \
effect:policyRule.then.effect, \
conditions:policyRule.if}" -o json

# For management-group-scoped custom policies
az policy definition show --name "{guid}" \
  --management-group "{mgId}" \
  --query "{displayName:displayName, \
effect:policyRule.then.effect}" -o json

# For policy set definitions (initiatives)
az policy set-definition show --name "{guid}" \
  --query "{displayName:displayName, \
policyCount:policyDefinitions | length(@)}" -o json
```

**3. ARG KQL (supplemental — subscription-scoped only)**:

```kusto
PolicyResources
| where type == 'microsoft.authorization/policyassignments'
| where properties.enforcementMode == 'Default'
| project name, displayName=properties.displayName,
  effect=properties.parameters.effect.value,
  scope=properties.scope
| order by name asc
```

## Azure Policy Discovery Workflow

Before creating implementation plans, discover active policies:

```text
1. Verify Azure connectivity: az account show
2. REST API: Get ALL effective policy assignments (subscription + MG inherited)
3. Compare count with Azure Portal (Policy > Assignments) — must match
4. For each Deny/DeployIfNotExists: drill into policy definition JSON
5. Check tag enforcement policies (names containing 'tag' or 'Tag')
6. Check allowed resource types and locations
7. Document ALL findings in 04-governance-constraints.md
```
