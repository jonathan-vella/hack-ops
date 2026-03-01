// -----------------------------------------------------------------------
// HackOps — Key Vault Module
// Key Vault with Private Endpoint, DNS zone, UAMI RBAC, and secrets.
// GitHub OAuth secrets are populated externally (setup-github-oauth.sh).
// -----------------------------------------------------------------------

@description('Deployment environment.')
param environment string

@description('Project identifier.')
param projectName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Unique suffix for globally unique names.')
@minLength(5)
param uniqueSuffix string

@description('Private endpoint subnet resource ID.')
param peSubnetId string

@description('Virtual network resource ID for DNS zone link.')
param vnetId string

@description('Log Analytics workspace resource ID for diagnostics.')
param logAnalyticsWorkspaceId string

@description('UAMI principal ID — granted Key Vault Secrets User role.')
param uamiPrincipalId string

@description('Application Insights connection string to store as KV secret.')
param appInsightsConnectionString string

// ── Variables ───────────────────────────────────────────────────────────

var kvName = 'kv-${take(projectName, 10)}-${environment}-${take(uniqueSuffix, 6)}'
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

// ── Private DNS Zone ────────────────────────────────────────────────────

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
  tags: tags
}

resource dnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: privateDnsZone
  name: 'link-kv-${projectName}'
  location: 'global'
  tags: tags
  properties: {
    virtualNetwork: {
      id: vnetId
    }
    registrationEnabled: false
  }
}

// ── Key Vault (AVM) ─────────────────────────────────────────────────────

module keyVault 'br/public:avm/res/key-vault/vault:0.11.0' = {
  name: 'kv-${uniqueString(deployment().name)}'
  params: {
    name: kvName
    location: location
    tags: tags
    enableRbacAuthorization: true
    enablePurgeProtection: true
    softDeleteRetentionInDays: 90
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
    privateEndpoints: [
      {
        name: 'pe-kv-${projectName}-${environment}'
        subnetResourceId: peSubnetId
        privateDnsZoneGroup: {
          privateDnsZoneGroupConfigs: [
            {
              privateDnsZoneResourceId: privateDnsZone.id
            }
          ]
        }
      }
    ]
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

// ── UAMI RBAC — Key Vault Secrets User ──────────────────────────────────

resource kvRef 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: kvName
  dependsOn: [keyVault]
}

resource kvSecretsRbac 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kvRef.id, uamiPrincipalId, kvSecretsUserRoleId)
  scope: kvRef
  properties: {
    principalId: uamiPrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
}

// ── Secrets (Bicep-managed) ─────────────────────────────────────────────
// GitHub OAuth secrets are populated externally via setup-github-oauth.sh.
// Only the App Insights connection string is stored here at deploy time.

resource appInsightsSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kvRef
  name: 'appinsights-connection-string'
  properties: {
    value: appInsightsConnectionString
    contentType: 'text/plain'
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────

@description('Key Vault resource ID.')
output keyVaultId string = keyVault.outputs.resourceId

@description('Key Vault name.')
output keyVaultName string = keyVault.outputs.name

@description('Key Vault URI (e.g. https://kv-hackops-dev-abc123.vault.azure.net/).')
output keyVaultUri string = keyVault.outputs.uri
