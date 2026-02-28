# Diagnostic Settings

> Extracted from `azure-bicep-patterns/SKILL.md` for progressive loading.

Every resource must send logs and metrics to a workspace:

```bicep
param logAnalyticsWorkspaceName string

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsWorkspaceName
}

resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-${parentResourceName}'
  scope: parentResource
  properties: {
    workspaceId: workspace.id
    logs: [
      {
        categoryGroup: 'allLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}
```

- Use `categoryGroup: 'allLogs'` instead of listing individual categories
- Always include `AllMetrics`
- Pass workspace **name** not ID — use `existing` keyword to resolve
