// -----------------------------------------------------------------------
// HackOps — Monitoring Module
// Log Analytics workspace + Application Insights.
// -----------------------------------------------------------------------

@description('Deployment environment.')
param environment string

@description('Project identifier.')
param projectName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

// ── Variables ───────────────────────────────────────────────────────────

var logAnalyticsName = 'log-${projectName}-${environment}'
var appInsightsName = 'appi-${projectName}-${environment}'

// ── Log Analytics Workspace ─────────────────────────────────────────────

module logAnalytics 'br/public:avm/res/operational-insights/workspace:0.9.0' = {
  name: 'log-analytics-${uniqueString(deployment().name)}'
  params: {
    name: logAnalyticsName
    location: location
    tags: tags
    skuName: 'PerGB2018'
    dataRetention: 30
    dailyQuotaGb: 1
  }
}

// ── Application Insights ────────────────────────────────────────────────

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

// ── Outputs ─────────────────────────────────────────────────────────────

@description('Log Analytics workspace resource ID.')
output logAnalyticsWorkspaceId string = logAnalytics.outputs.resourceId

@description('Log Analytics workspace name.')
output logAnalyticsWorkspaceName string = logAnalytics.outputs.name

@description('Application Insights connection string.')
output appInsightsConnectionString string = appInsights.outputs.connectionString

@description('Application Insights instrumentation key.')
output appInsightsInstrumentationKey string = appInsights.outputs.instrumentationKey

@description('Application Insights resource ID.')
output appInsightsResourceId string = appInsights.outputs.resourceId
