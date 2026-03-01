// -----------------------------------------------------------------------
// HackOps — Azure Container Registry Module
// ACR Standard via AVM with UAMI AcrPull RBAC for deploy-by-digest.
// -----------------------------------------------------------------------

@description('Deployment environment.')
param environment string

@description('Project identifier.')
@minLength(3)
param projectName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Unique suffix for globally unique naming.')
@minLength(1)
param uniqueSuffix string

@description('Log Analytics workspace resource ID for diagnostics.')
param logAnalyticsWorkspaceId string

@description('UAMI principal ID — granted AcrPull for image pull.')
param uamiPrincipalId string

@description('Azure Container Registry SKU.')
param acrSku string

// ── Variables ───────────────────────────────────────────────────────────

// ACR names: alphanumeric, 5-50 chars, globally unique
var acrName = 'cr${projectName}${environment}${uniqueSuffix}'

// AcrPull built-in role ID
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

// ── ACR (AVM) ───────────────────────────────────────────────────────────

module containerRegistry 'br/public:avm/res/container-registry/registry:0.6.0' = {
  name: 'acr-${uniqueString(deployment().name)}'
  params: {
    name: acrName
    location: location
    tags: tags
    acrSku: acrSku
    acrAdminUserEnabled: false
    anonymousPullEnabled: false
    publicNetworkAccess: 'Enabled'
    retentionPolicyDays: 7
    retentionPolicyStatus: 'enabled'
    diagnosticSettings: [
      {
        workspaceResourceId: logAnalyticsWorkspaceId
        logCategoriesAndGroups: [
          {
            categoryGroup: 'allLogs'
          }
        ]
        metricCategories: [
          {
            category: 'AllMetrics'
          }
        ]
      }
    ]
  }
}

// ── UAMI AcrPull RBAC ──────────────────────────────────────────────────

resource acrRef 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
  dependsOn: [containerRegistry]
}

resource acrPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acrRef.id, uamiPrincipalId, acrPullRoleId)
  scope: acrRef
  properties: {
    principalId: uamiPrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalType: 'ServicePrincipal'
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────

@description('ACR resource name.')
output acrName string = containerRegistry.outputs.name

@description('ACR login server (e.g. crhackopsdev123abc.azurecr.io).')
output acrLoginServer string = containerRegistry.outputs.loginServer

@description('ACR resource ID.')
output acrResourceId string = containerRegistry.outputs.resourceId
