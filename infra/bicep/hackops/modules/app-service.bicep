// -----------------------------------------------------------------------
// HackOps — App Service Module
// Linux App Service Plan + Web App with VNet integration, Easy Auth,
// managed identity, and Key Vault references.
// -----------------------------------------------------------------------

@description('Deployment environment.')
param environment string

@description('Project identifier.')
param projectName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('App subnet resource ID for VNet integration.')
param appSubnetId string

@description('Application Insights connection string.')
param appInsightsConnectionString string

@description('Key Vault URI for secret references.')
param keyVaultUri string

@description('Cosmos DB account endpoint.')
param cosmosEndpoint string

@description('Cosmos DB database name.')
param cosmosDatabaseName string

@description('Log Analytics workspace resource ID for diagnostics.')
param logAnalyticsWorkspaceId string

// ── Variables ───────────────────────────────────────────────────────────

var aspName = 'asp-${projectName}-${environment}'
var appName = 'app-${projectName}-${environment}'
var skuName = environment == 'prod' ? 'S1' : 'B1'

// ── App Service Plan (AVM) ──────────────────────────────────────────────

module appServicePlan 'br/public:avm/res/web/serverfarm:0.4.0' = {
  name: 'asp-${uniqueString(deployment().name)}'
  params: {
    name: aspName
    location: location
    tags: tags
    kind: 'linux'
    skuName: skuName
    reserved: true
  }
}

// ── App Service (AVM) ───────────────────────────────────────────────────

module appService 'br/public:avm/res/web/site:0.12.0' = {
  name: 'app-${uniqueString(deployment().name)}'
  params: {
    name: appName
    location: location
    tags: tags
    kind: 'app,linux'
    serverFarmResourceId: appServicePlan.outputs.resourceId
    managedIdentities: {
      systemAssigned: true
    }
    httpsOnly: true
    virtualNetworkSubnetId: appSubnetId
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      vnetRouteAllEnabled: true
      appSettings: [
        {
          name: 'COSMOS_ENDPOINT'
          value: cosmosEndpoint
        }
        {
          name: 'COSMOS_DATABASE_NAME'
          value: cosmosDatabaseName
        }
        {
          name: 'KEY_VAULT_URI'
          value: keyVaultUri
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'WEBSITE_VNET_ROUTE_ALL'
          value: '1'
        }
        {
          name: 'WEBSITE_DNS_SERVER'
          value: '168.63.129.16'
        }
      ]
    }
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

@description('App Service resource ID.')
output appServiceId string = appService.outputs.resourceId

@description('App Service name.')
output appServiceName string = appService.outputs.name

@description('App Service default hostname.')
output appServiceDefaultHostname string = appService.outputs.defaultHostname

@description('App Service managed identity principal ID.')
output appServicePrincipalId string = appService.outputs.systemAssignedMIPrincipalId
