// -----------------------------------------------------------------------
// HackOps — Cosmos DB Module
// Serverless NoSQL account with 10 containers, PE, DNS, and SQL RBAC.
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

@description('Key Vault name to store Cosmos DB endpoint as secret.')
param keyVaultName string

// ── Variables ───────────────────────────────────────────────────────────

var cosmosAccountName = 'cosmos-${projectName}-${environment}-${take(uniqueSuffix, 6)}'
var databaseName = '${projectName}-db'

// Cosmos DB Built-in Data Contributor role (read/write all data)
var cosmosDataContributorRoleId = '00000000-0000-0000-0000-000000000002'

// 10 containers with partition keys from the data model
var containers = [
  { name: 'hackathons', partitionKeyPath: '/id' }
  { name: 'teams', partitionKeyPath: '/hackathonId' }
  { name: 'hackers', partitionKeyPath: '/hackathonId' }
  { name: 'rubrics', partitionKeyPath: '/hackathonId' }
  { name: 'rubric-active', partitionKeyPath: '/hackathonId' }
  { name: 'submissions', partitionKeyPath: '/teamId' }
  { name: 'scores', partitionKeyPath: '/teamId' }
  { name: 'challenges', partitionKeyPath: '/hackathonId' }
  { name: 'progression', partitionKeyPath: '/teamId' }
  { name: 'roles', partitionKeyPath: '/odataId' }
]

// ── Private DNS Zone ────────────────────────────────────────────────────

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.documents.azure.com'
  location: 'global'
  tags: tags
}

resource dnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: privateDnsZone
  name: 'link-cosmos-${projectName}'
  location: 'global'
  tags: tags
  properties: {
    virtualNetwork: {
      id: vnetId
    }
    registrationEnabled: false
  }
}

// ── Cosmos DB Account (AVM) ─────────────────────────────────────────────

module cosmosAccount 'br/public:avm/res/document-db/database-account:0.10.0' = {
  name: 'cosmos-${uniqueString(deployment().name)}'
  params: {
    name: cosmosAccountName
    location: location
    tags: tags
    capabilitiesToAdd: ['EnableServerless']
    disableLocalAuth: true
    networkRestrictions: {
      publicNetworkAccess: 'Disabled'
    }
    sqlDatabases: [
      {
        name: databaseName
        containers: [for container in containers: {
          name: container.name
          paths: [container.partitionKeyPath]
        }]
      }
    ]
    privateEndpoints: [
      {
        name: 'pe-cosmos-${projectName}-${environment}'
        subnetResourceId: peSubnetId
        service: 'Sql'
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

// ── Store Cosmos DB endpoint in Key Vault ───────────────────────────────

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource cosmosEndpointSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'cosmos-endpoint'
  properties: {
    value: cosmosAccount.outputs.endpoint
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────

@description('Cosmos DB account resource ID.')
output cosmosAccountId string = cosmosAccount.outputs.resourceId

@description('Cosmos DB account name.')
output cosmosAccountName string = cosmosAccount.outputs.name

@description('Cosmos DB account endpoint.')
output cosmosEndpoint string = cosmosAccount.outputs.endpoint

@description('Cosmos DB database name.')
output cosmosDatabaseName string = databaseName

@description('Cosmos DB SQL Data Contributor role definition ID for RBAC assignment.')
output cosmosDataContributorRoleId string = cosmosDataContributorRoleId
