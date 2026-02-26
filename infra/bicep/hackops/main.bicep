// -----------------------------------------------------------------------
// HackOps Infrastructure — Orchestrator
// Calls all modules in dependency order.
// -----------------------------------------------------------------------

targetScope = 'resourceGroup'

// ── Parameters ──────────────────────────────────────────────────────────

@description('Deployment environment.')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Project identifier used in resource naming.')
param projectName string = 'hackops'

@description('Azure region for all resources.')
@allowed(['swedencentral', 'germanywestcentral', 'northeurope', 'centralus'])
param location string = 'swedencentral'

@description('Resource owner (maps to governance "owner" tag).')
param owner string

@description('Cost center for billing (governance tag).')
param costCenter string = 'hackops-dev'

@description('Technical contact email (governance tag).')
param technicalContact string

// ── Variables ───────────────────────────────────────────────────────────

var uniqueSuffix = take(uniqueString(resourceGroup().id), 6)

// 9 mandatory tags — Deny policy: JV-Enforce RG Tags v3
var tags = {
  environment: environment
  owner: owner
  costcenter: costCenter
  application: projectName
  workload: 'hackathon-management'
  sla: environment == 'prod' ? 'production' : 'non-production'
  'backup-policy': 'cosmos-periodic'
  'maint-window': environment == 'prod' ? 'weekends-only' : 'anytime'
  'technical-contact': technicalContact
}

// ── Module 1: Networking ────────────────────────────────────────────────

module networking 'modules/networking.bicep' = {
  name: 'networking-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
  }
}

// ── Module 2: Monitoring ────────────────────────────────────────────────

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
  }
}

// ── Module 3: Key Vault ─────────────────────────────────────────────────

module keyVault 'modules/key-vault.bicep' = {
  name: 'key-vault-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
    peSubnetId: networking.outputs.peSubnetId
    vnetId: networking.outputs.vnetId
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
  }
}

// ── Module 4: Cosmos DB ─────────────────────────────────────────────────

module cosmosDb 'modules/cosmos-db.bicep' = {
  name: 'cosmos-db-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
    peSubnetId: networking.outputs.peSubnetId
    vnetId: networking.outputs.vnetId
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    keyVaultName: keyVault.outputs.keyVaultName
  }
}

// ── Module 5: App Service ───────────────────────────────────────────────

module appService 'modules/app-service.bicep' = {
  name: 'app-service-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
    appSubnetId: networking.outputs.appSubnetId
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    keyVaultUri: keyVault.outputs.keyVaultUri
    cosmosEndpoint: cosmosDb.outputs.cosmosEndpoint
    cosmosDatabaseName: cosmosDb.outputs.cosmosDatabaseName
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────

@description('Virtual network resource ID.')
output vnetId string = networking.outputs.vnetId

@description('Log Analytics workspace resource ID.')
output logAnalyticsWorkspaceId string = monitoring.outputs.logAnalyticsWorkspaceId

@description('Application Insights connection string.')
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString

@description('Key Vault URI.')
output keyVaultUri string = keyVault.outputs.keyVaultUri

@description('Cosmos DB account endpoint.')
output cosmosEndpoint string = cosmosDb.outputs.cosmosEndpoint

@description('App Service default hostname.')
output appServiceDefaultHostname string = appService.outputs.appServiceDefaultHostname

@description('App Service managed identity principal ID.')
output appServicePrincipalId string = appService.outputs.appServicePrincipalId
