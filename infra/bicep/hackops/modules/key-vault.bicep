// -----------------------------------------------------------------------
// HackOps — Key Vault Module
// Key Vault with Private Endpoint and DNS zone.
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

// ── Variables ───────────────────────────────────────────────────────────

// Key Vault has 24-char limit: kv-hackops-dev-{6} = 21 chars
var kvName = 'kv-${take(projectName, 10)}-${environment}-${take(uniqueSuffix, 6)}'

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

// ── Outputs ─────────────────────────────────────────────────────────────

@description('Key Vault resource ID.')
output keyVaultId string = keyVault.outputs.resourceId

@description('Key Vault name.')
output keyVaultName string = keyVault.outputs.name

@description('Key Vault URI.')
output keyVaultUri string = keyVault.outputs.uri
