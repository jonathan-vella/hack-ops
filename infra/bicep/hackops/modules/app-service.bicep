// -----------------------------------------------------------------------
// HackOps — App Service Module
// ASP (P1v4) + Web App (DOCKER@digest) + staging slot + autoscale.
// UAMI identity, Key Vault references, Easy Auth (GitHub), VNet integration.
// deploy.ps1 sets keyVaultReferenceIdentity post-deploy for KV ref resolution.
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

@description('Key Vault URI (trailing /). Used to construct KV reference URIs.')
param keyVaultUri string

@description('SQL Server FQDN.')
param sqlServerFqdn string

@description('SQL Database name.')
param sqlDatabaseName string

@description('Log Analytics workspace resource ID for diagnostics.')
param logAnalyticsWorkspaceId string

@description('UAMI resource ID assigned to App Service for identity.')
param uamiId string

@description('UAMI client ID for ACR image pull credential.')
param uamiClientId string

@description('ACR login server (e.g. crhackopsdev123abc.azurecr.io).')
param acrLoginServer string

@description('Container image digest (sha256:...). Empty uses :latest tag for bootstrap.')
param imageDigest string = ''

@description('GitHub OAuth App client ID.')
param githubOAuthClientId string

@description('Admin GitHub user IDs (comma-separated).')
param adminGithubIds string = ''

@description('Unique suffix for resource naming.')
param uniqueSuffix string

@description('App Service Plan SKU name.')
param aspSkuName string

@description('Autoscale minimum instance count.')
param autoscaleMinInstances int

@description('Autoscale maximum instance count.')
param autoscaleMaxInstances int

@description('Autoscale CPU scale-out threshold (percentage).')
param autoscaleCpuScaleOutThreshold int

@description('Autoscale CPU scale-in threshold (percentage).')
param autoscaleCpuScaleInThreshold int

@description('Autoscale memory scale-out threshold (percentage).')
param autoscaleMemoryScaleOutThreshold int

// ── Variables ───────────────────────────────────────────────────────────

var aspName = 'asp-${projectName}-${environment}-${uniqueSuffix}'
var appName = 'app-${projectName}-${environment}-${uniqueSuffix}'

var linuxFxVersion = empty(imageDigest)
  ? 'DOCKER|${acrLoginServer}/hackops:latest'
  : 'DOCKER|${acrLoginServer}/hackops@${imageDigest}'

// Key Vault reference URIs for sensitive app settings
var kvSecretsBase = '${keyVaultUri}secrets'
var aiConnStrRef = '@Microsoft.KeyVault(SecretUri=${kvSecretsBase}/appinsights-connection-string/)'
var ghClientIdRef = '@Microsoft.KeyVault(SecretUri=${kvSecretsBase}/github-oauth-client-id/)'
var ghClientSecretRef = '@Microsoft.KeyVault(SecretUri=${kvSecretsBase}/github-oauth-client-secret/)'

// Shared settings — production and staging parity
var sharedAppSettings = [
  { name: 'SQL_SERVER', value: sqlServerFqdn }
  { name: 'SQL_DATABASE', value: sqlDatabaseName }
  { name: 'KEY_VAULT_URI', value: keyVaultUri }
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: aiConnStrRef }
  { name: 'ApplicationInsightsAgent_EXTENSION_VERSION', value: '~3' }
  { name: 'NODE_ENV', value: 'production' }
  { name: 'ADMIN_GITHUB_IDS', value: adminGithubIds }
  { name: 'GITHUB_OAUTH_CLIENT_ID', value: ghClientIdRef }
  { name: 'GITHUB_OAUTH_CLIENT_SECRET', value: ghClientSecretRef }
  { name: 'WEBSITE_HEALTHCHECK_MAXPINGFAILURES', value: '3' }
  { name: 'WEBSITE_VNET_ROUTE_ALL', value: '1' }
  { name: 'WEBSITE_DNS_SERVER', value: '168.63.129.16' }
  { name: 'WEBSITES_PORT', value: '8080' }
  { name: 'PORT', value: '8080' }
  { name: 'HOSTNAME', value: '0.0.0.0' }
  { name: 'DOCKER_ENABLE_CI', value: 'false' }
  { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
  { name: 'WEBSITES_CONTAINER_START_TIME_LIMIT', value: '300' }
]

var sharedSiteConfig = {
  linuxFxVersion: linuxFxVersion
  alwaysOn: true
  ftpsState: 'Disabled'
  minTlsVersion: '1.2'
  vnetRouteAllEnabled: true
  healthCheckPath: '/api/health'
  acrUseManagedIdentityCreds: true
  acrUserManagedIdentityID: uamiClientId
  appSettings: sharedAppSettings
}

// ── App Service Plan (AVM) ──────────────────────────────────────────────

module appServicePlan 'br/public:avm/res/web/serverfarm:0.4.0' = {
  name: 'asp-${uniqueString(deployment().name)}'
  params: {
    name: aspName
    location: location
    tags: tags
    kind: 'linux'
    skuName: aspSkuName
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
      userAssignedResourceIds: [uamiId]
    }
    httpsOnly: true
    virtualNetworkSubnetId: appSubnetId
    siteConfig: sharedSiteConfig
    authSettingV2Configuration: {
      platform: {
        enabled: true
        runtimeVersion: '~1'
      }
      globalValidation: {
        unauthenticatedClientAction: 'AllowAnonymous'
        redirectToProvider: 'github'
      }
      identityProviders: {
        gitHub: {
          enabled: true
          registration: {
            clientId: githubOAuthClientId
            clientSecretSettingName: 'GITHUB_OAUTH_CLIENT_SECRET'
          }
        }
      }
      login: {
        tokenStore: {
          enabled: false
        }
      }
    }
    slots: [
      {
        name: 'staging'
        managedIdentities: {
          userAssignedResourceIds: [uamiId]
        }
        siteConfig: sharedSiteConfig
        httpsOnly: true
        virtualNetworkSubnetId: appSubnetId
      }
    ]
    diagnosticSettings: [
      {
        workspaceResourceId: logAnalyticsWorkspaceId
        logCategoriesAndGroups: [
          { categoryGroup: 'allLogs' }
        ]
        metricCategories: [
          { category: 'AllMetrics' }
        ]
      }
    ]
  }
}

// ── Autoscale ───────────────────────────────────────────────────────────
// CPU 70%/30% and Memory 80% thresholds — 1-3 instances for dev/staging.

resource autoscale 'Microsoft.Insights/autoscaleSettings@2022-10-01' = {
  name: 'autoscale-${appName}'
  location: location
  tags: tags
  properties: {
    enabled: true
    targetResourceUri: appServicePlan.outputs.resourceId
    profiles: [
      {
        name: 'CPU and Memory Scale'
        capacity: {
          minimum: string(autoscaleMinInstances)
          maximum: string(autoscaleMaxInstances)
          default: string(autoscaleMinInstances)
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.outputs.resourceId
              operator: 'GreaterThan'
              threshold: autoscaleCpuScaleOutThreshold
              timeAggregation: 'Average'
              timeGrain: 'PT1M'
              timeWindow: 'PT5M'
              statistic: 'Average'
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.outputs.resourceId
              operator: 'LessThan'
              threshold: autoscaleCpuScaleInThreshold
              timeAggregation: 'Average'
              timeGrain: 'PT1M'
              timeWindow: 'PT5M'
              statistic: 'Average'
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
          {
            metricTrigger: {
              metricName: 'MemoryPercentage'
              metricResourceUri: appServicePlan.outputs.resourceId
              operator: 'GreaterThan'
              threshold: autoscaleMemoryScaleOutThreshold
              timeAggregation: 'Average'
              timeGrain: 'PT1M'
              timeWindow: 'PT5M'
              statistic: 'Average'
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
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

@description('App Service Plan resource ID (for alert scopes).')
output aspResourceId string = appServicePlan.outputs.resourceId
