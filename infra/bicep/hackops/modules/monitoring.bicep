// -----------------------------------------------------------------------
// HackOps — Monitoring Module
// Log Analytics, Application Insights, Action Group, and baseline alerts.
// -----------------------------------------------------------------------

@description('Deployment environment.')
param environment string

@description('Project identifier.')
param projectName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Email address for alert notifications.')
param alertEmail string

@description('Unique suffix for resource naming.')
param uniqueSuffix string

@description('Log Analytics workspace retention in days.')
param dataRetention int

@description('Log Analytics workspace daily ingestion quota in GB.')
param dailyQuotaGb int

// ── Variables ───────────────────────────────────────────────────────────

var logAnalyticsName = 'log-${projectName}-${environment}-${uniqueSuffix}'
var appInsightsName = 'appi-${projectName}-${environment}-${uniqueSuffix}'
var actionGroupName = 'ag-${projectName}-${environment}-${uniqueSuffix}'

// ── Log Analytics Workspace (AVM) ───────────────────────────────────────

module logAnalytics 'br/public:avm/res/operational-insights/workspace:0.9.0' = {
  name: 'log-analytics-${uniqueString(deployment().name)}'
  params: {
    name: logAnalyticsName
    location: location
    tags: tags
    skuName: 'PerGB2018'
    dataRetention: dataRetention
    dailyQuotaGb: dailyQuotaGb
  }
}

// ── Application Insights (AVM) ──────────────────────────────────────────

module appInsights 'br/public:avm/res/insights/component:0.4.0' = {
  name: 'app-insights-${uniqueString(deployment().name)}'
  params: {
    name: appInsightsName
    location: location
    tags: tags
    workspaceResourceId: logAnalytics.outputs.resourceId
    kind: 'web'
    applicationType: 'web'
  }
}

// ── Action Group ────────────────────────────────────────────────────────

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: actionGroupName
  location: 'global'
  tags: tags
  properties: {
    groupShortName: take('ag-${projectName}', 12)
    enabled: true
    emailReceivers: [
      {
        name: 'PrimaryAdmin'
        emailAddress: alertEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────

@description('Log Analytics workspace resource ID.')
output logAnalyticsId string = logAnalytics.outputs.resourceId

@description('Log Analytics workspace name.')
output logAnalyticsWorkspaceName string = logAnalytics.outputs.name

@description('Application Insights connection string.')
output appInsightsConnectionString string = appInsights.outputs.connectionString

@description('Application Insights instrumentation key.')
output appInsightsInstrumentationKey string = appInsights.outputs.instrumentationKey

@description('Application Insights resource ID.')
output appInsightsResourceId string = appInsights.outputs.resourceId

@description('Action group resource ID for alert rules.')
output actionGroupId string = actionGroup.id
