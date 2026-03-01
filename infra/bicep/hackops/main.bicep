// -----------------------------------------------------------------------
// HackOps Infrastructure — Orchestrator
// Phased deployment with UAMI identity model.
// Phase gates: foundation (always) → data → compute
// -----------------------------------------------------------------------

targetScope = 'resourceGroup'

// ── Parameters ──────────────────────────────────────────────────────────

@description('Deployment phase. Cumulative: data includes foundation, compute includes all.')
@allowed(['all', 'foundation', 'data', 'compute'])
param phase string = 'all'

@description('Deployment environment.')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Project identifier used in resource naming.')
param projectName string = 'hackops'

@description('Azure region for all resources.')
@allowed(['swedencentral', 'germanywestcentral', 'northeurope'])
param location string = 'swedencentral'

@description('Resource owner (governance tag).')
param owner string

@description('Cost center for billing (governance tag).')
param costCenter string = 'hackops-dev'

@description('Technical contact email (governance tag).')
param technicalContact string

@description('Alert notification email (Action Group receiver).')
param alertEmail string

@description('GitHub OAuth App client ID (register at https://github.com/settings/developers).')
param githubOAuthClientId string

@description('Comma-separated GitHub user IDs auto-assigned admin on first login.')
param adminGithubIds string = ''

@description('Container image digest (sha256:...). Empty uses :latest for bootstrap.')
param imageDigest string = ''

// ── Configurable Infrastructure Settings ────────────────────────────────

@description('Virtual network address space CIDR.')
param vnetAddressPrefix string = '10.0.0.0/23'

@description('App subnet CIDR (delegated to Microsoft.Web/serverFarms).')
param appSubnetPrefix string = '10.0.0.0/25'

@description('Private endpoint subnet CIDR.')
param peSubnetPrefix string = '10.0.0.128/26'

@description('Default subnet CIDR (ACI, general purpose).')
param defaultSubnetPrefix string = '10.0.0.192/26'

@description('App Service Plan SKU name.')
param aspSkuName string = 'P1v4'

@description('Azure SQL Database SKU name.')
param sqlSkuName string = 'S2'

@description('Azure SQL Database SKU tier.')
param sqlSkuTier string = 'Standard'

@description('Azure SQL Database max size in bytes (default 250 GB).')
param sqlMaxSizeBytes int = 268435456000

@description('Azure Container Registry SKU.')
@allowed(['Basic', 'Standard', 'Premium'])
param acrSku string = 'Standard'

@description('Log Analytics workspace retention in days.')
@minValue(7)
@maxValue(730)
param logRetentionDays int = 30

@description('Log Analytics workspace daily ingestion quota in GB.')
@minValue(-1)
param logDailyQuotaGb int = 1

@description('Autoscale minimum instance count.')
@minValue(1)
param autoscaleMinInstances int = 1

@description('Autoscale maximum instance count.')
@minValue(1)
param autoscaleMaxInstances int = 3

@description('Autoscale CPU scale-out threshold (percentage).')
@minValue(1)
@maxValue(100)
param autoscaleCpuScaleOutThreshold int = 70

@description('Autoscale CPU scale-in threshold (percentage).')
@minValue(1)
@maxValue(100)
param autoscaleCpuScaleInThreshold int = 30

@description('Autoscale memory scale-out threshold (percentage).')
@minValue(1)
@maxValue(100)
param autoscaleMemoryScaleOutThreshold int = 80

// ── Phase Gates ─────────────────────────────────────────────────────────
// Cumulative: each phase includes all previous phases.
// foundation: identity, networking, monitoring, key-vault
// data:       + sql-database, container-registry
// compute:    + app-service, alerts

var deployData = phase == 'all' || phase == 'data' || phase == 'compute'
var deployCompute = phase == 'all' || phase == 'compute'

// ── Variables ───────────────────────────────────────────────────────────

var uniqueSuffix = take(uniqueString(resourceGroup().id), 6)

// 9 mandatory tags — governance Deny policy: JV-Enforce RG Tags v3
var tags = {
  environment: environment
  owner: owner
  costcenter: costCenter
  application: projectName
  workload: 'hackathon-management'
  sla: environment == 'prod' ? 'production' : 'non-production'
  'backup-policy': 'sql-dtu-backup'
  'maint-window': environment == 'prod' ? 'weekends-only' : 'anytime'
  'technical-contact': technicalContact
}

// ════════════════════════════════════════════════════════════════════════
// Phase 1 — Foundation (always deployed)
// ════════════════════════════════════════════════════════════════════════

// ── Module 1: User-Assigned Managed Identity ────────────────────────────

module identity 'modules/identity.bicep' = {
  name: 'identity-${uniqueString(deployment().name)}'
  params: {
    name: 'id-${projectName}-${environment}-${uniqueSuffix}'
    location: location
    tags: tags
  }
}

// ── Module 2: Networking ────────────────────────────────────────────────

module networking 'modules/networking.bicep' = {
  name: 'networking-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
    vnetAddressPrefix: vnetAddressPrefix
    appSubnetPrefix: appSubnetPrefix
    peSubnetPrefix: peSubnetPrefix
    defaultSubnetPrefix: defaultSubnetPrefix
  }
}

// ── Module 3: Monitoring ────────────────────────────────────────────────

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
    alertEmail: alertEmail
    uniqueSuffix: uniqueSuffix
    dataRetention: logRetentionDays
    dailyQuotaGb: logDailyQuotaGb
  }
}

// ── Module 4: Key Vault ─────────────────────────────────────────────────

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
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsId
    uamiPrincipalId: identity.outputs.uamiPrincipalId
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
  }
}

// ════════════════════════════════════════════════════════════════════════
// Phase 2 — Data (conditional on deployData)
// ════════════════════════════════════════════════════════════════════════

// ── Module 5: Azure SQL Database ────────────────────────────────────────

module sqlDatabase 'modules/sql-database.bicep' = if (deployData) {
  name: 'sql-database-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
    peSubnetId: networking.outputs.peSubnetId
    vnetId: networking.outputs.vnetId
    uamiPrincipalId: identity.outputs.uamiPrincipalId
    uamiName: identity.outputs.uamiName
    sqlSkuName: sqlSkuName
    sqlSkuTier: sqlSkuTier
    sqlMaxSizeBytes: sqlMaxSizeBytes
  }
}

// ── Module 6: Container Registry ────────────────────────────────────────

module containerRegistry 'modules/container-registry.bicep' = if (deployData) {
  name: 'container-registry-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsId
    uamiPrincipalId: identity.outputs.uamiPrincipalId
    acrSku: acrSku
  }
}

// ════════════════════════════════════════════════════════════════════════
// Phase 3 — Compute (conditional on deployCompute)
// ════════════════════════════════════════════════════════════════════════

// ── Module 7: App Service ───────────────────────────────────────────────

module appService 'modules/app-service.bicep' = if (deployCompute) {
  name: 'app-service-${uniqueString(deployment().name)}'
  params: {
    environment: environment
    projectName: projectName
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
    appSubnetId: networking.outputs.appSubnetId
    keyVaultUri: keyVault.outputs.keyVaultUri
    #disable-next-line BCP318
    sqlServerFqdn: deployData ? sqlDatabase.outputs.sqlServerFqdn : ''
    #disable-next-line BCP318
    sqlDatabaseName: deployData ? sqlDatabase.outputs.sqlDatabaseName : ''
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsId
    uamiId: identity.outputs.uamiId
    uamiClientId: identity.outputs.uamiClientId
    #disable-next-line BCP318
    acrLoginServer: deployData ? containerRegistry.outputs.acrLoginServer : ''
    imageDigest: imageDigest
    githubOAuthClientId: githubOAuthClientId
    adminGithubIds: adminGithubIds
    aspSkuName: aspSkuName
    autoscaleMinInstances: autoscaleMinInstances
    autoscaleMaxInstances: autoscaleMaxInstances
    autoscaleCpuScaleOutThreshold: autoscaleCpuScaleOutThreshold
    autoscaleCpuScaleInThreshold: autoscaleCpuScaleInThreshold
    autoscaleMemoryScaleOutThreshold: autoscaleMemoryScaleOutThreshold
  }
}

// ════════════════════════════════════════════════════════════════════════
// Alert Rules — conditional on deployCompute (need target resource IDs)
// ════════════════════════════════════════════════════════════════════════

// HTTP Server Errors (5xx) > 10 in 5 minutes
resource alertHttp5xx 'Microsoft.Insights/metricAlerts@2018-03-01' = if (deployCompute) {
  name: 'alert-http5xx-${projectName}-${environment}-${uniqueSuffix}'
  location: 'global'
  tags: tags
  properties: {
    severity: 2
    enabled: true
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    scopes: [
      #disable-next-line BCP318
      deployCompute ? appService.outputs.appServiceId : ''
    ]
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Http5xx'
          metricName: 'Http5xx'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: monitoring.outputs.actionGroupId
      }
    ]
  }
}

// Response Time > 5 seconds average over 5 minutes
resource alertResponseTime 'Microsoft.Insights/metricAlerts@2018-03-01' = if (deployCompute) {
  name: 'alert-response-time-${projectName}-${environment}-${uniqueSuffix}'
  location: 'global'
  tags: tags
  properties: {
    severity: 3
    enabled: true
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    scopes: [
      #disable-next-line BCP318
      deployCompute ? appService.outputs.appServiceId : ''
    ]
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HttpResponseTime'
          metricName: 'HttpResponseTime'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: monitoring.outputs.actionGroupId
      }
    ]
  }
}

// CPU > 85% average over 5 minutes (App Service Plan)
resource alertCpu 'Microsoft.Insights/metricAlerts@2018-03-01' = if (deployCompute) {
  name: 'alert-cpu-${projectName}-${environment}-${uniqueSuffix}'
  location: 'global'
  tags: tags
  properties: {
    severity: 2
    enabled: true
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    scopes: [
      #disable-next-line BCP318
      deployCompute ? appService.outputs.aspResourceId : ''
    ]
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'CpuPercentage'
          metricName: 'CpuPercentage'
          operator: 'GreaterThan'
          threshold: 85
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: monitoring.outputs.actionGroupId
      }
    ]
  }
}

// SQL DTU > 90% average over 5 minutes
resource alertDtu 'Microsoft.Insights/metricAlerts@2018-03-01' = if (deployCompute) {
  name: 'alert-dtu-${projectName}-${environment}-${uniqueSuffix}'
  location: 'global'
  tags: tags
  properties: {
    severity: 2
    enabled: true
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    scopes: [
      #disable-next-line BCP318
      deployData ? sqlDatabase.outputs.sqlServerId : ''
    ]
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'DtuConsumptionPercent'
          metricName: 'dtu_consumption_percent'
          operator: 'GreaterThan'
          threshold: 90
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: monitoring.outputs.actionGroupId
      }
    ]
  }
}

// Health Check Failures > 3 in 5 minutes
resource alertHealth 'Microsoft.Insights/metricAlerts@2018-03-01' = if (deployCompute) {
  name: 'alert-health-${projectName}-${environment}-${uniqueSuffix}'
  location: 'global'
  tags: tags
  properties: {
    severity: 1
    enabled: true
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    scopes: [
      #disable-next-line BCP318
      deployCompute ? appService.outputs.appServiceId : ''
    ]
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HealthCheckStatus'
          metricName: 'HealthCheckStatus'
          operator: 'LessThan'
          threshold: 100
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: monitoring.outputs.actionGroupId
      }
    ]
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────

@description('Virtual network resource ID.')
output vnetId string = networking.outputs.vnetId

@description('Log Analytics workspace resource ID.')
output logAnalyticsWorkspaceId string = monitoring.outputs.logAnalyticsId

@description('Key Vault URI.')
output keyVaultUri string = keyVault.outputs.keyVaultUri

@description('Key Vault name.')
output keyVaultName string = keyVault.outputs.keyVaultName

@description('UAMI resource ID.')
output uamiId string = identity.outputs.uamiId

@description('UAMI client ID.')
output uamiClientId string = identity.outputs.uamiClientId

@description('Azure SQL Server FQDN.')
#disable-next-line BCP318
output sqlServerFqdn string = deployData ? sqlDatabase.outputs.sqlServerFqdn : ''

@description('Azure SQL Database name.')
#disable-next-line BCP318
output sqlDatabaseName string = deployData ? sqlDatabase.outputs.sqlDatabaseName : ''

@description('ACR login server.')
#disable-next-line BCP318
output acrLoginServer string = deployData ? containerRegistry.outputs.acrLoginServer : ''

@description('ACR resource name.')
#disable-next-line BCP318
output acrName string = deployData ? containerRegistry.outputs.acrName : ''

@description('App Service default hostname.')
#disable-next-line BCP318
output appServiceDefaultHostname string = deployCompute ? appService.outputs.appServiceDefaultHostname : ''

@description('App Service name.')
#disable-next-line BCP318
output appServiceName string = deployCompute ? appService.outputs.appServiceName : ''
