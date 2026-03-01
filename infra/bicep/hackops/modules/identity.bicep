// ╔════════════════════════════════════════════════════════════════════════════╗
// ║  HackOps — User-Assigned Managed Identity                                ║
// ║  Shared UAMI for SQL Entra admin, App Service, ACR pull, ACI seeding     ║
// ╚════════════════════════════════════════════════════════════════════════════╝

@description('UAMI resource name (e.g. id-hackops-dev).')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

// ── UAMI (AVM) ──────────────────────────────────────────────────────────

module uami 'br/public:avm/res/managed-identity/user-assigned-identity:0.4.0' = {
  name: '${name}-deploy'
  params: {
    name: name
    location: location
    tags: tags
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────

@description('UAMI resource ID.')
output uamiId string = uami.outputs.resourceId

@description('UAMI principal (object) ID for RBAC assignments.')
output uamiPrincipalId string = uami.outputs.principalId

@description('UAMI client ID for application configuration.')
output uamiClientId string = uami.outputs.clientId

@description('UAMI resource name.')
output uamiName string = uami.outputs.name
