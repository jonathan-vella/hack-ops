# KQL Templates

Reusable KQL queries for Azure resource diagnostics via Log Analytics and Resource Graph.

## Resource Discovery via Resource Graph

Find resources before diagnosing them:

```kql
// List all resources in a resource group with their health status
resources
| where resourceGroup == '{resourceGroupName}'
| project name, type, location, properties.provisioningState
| order by type asc, name asc
```

```kql
// Find resources with non-Succeeded provisioning state
resources
| where resourceGroup == '{resourceGroupName}'
| where properties.provisioningState != 'Succeeded'
| project name, type, properties.provisioningState
```

```kql
// Inventory resources by type
resources
| where resourceGroup == '{resourceGroupName}'
| summarize count() by type
| order by count_ desc
```

---

## Diagnostic Settings Check

Verify every resource has diagnostic settings configured:

```bash
# List resources missing diagnostic settings
az monitor diagnostic-settings list \
  --resource "$resourceId" \
  --query "[].{name:name, workspace:workspaceId}" \
  --output table
```

If no diagnostic settings exist, create them using the pattern from the
`azure-bicep-patterns` skill (Diagnostic Settings section).

---

## Generic Error Search

```kql
// Generic error search — last 24h
AzureDiagnostics
| where ResourceId contains '{resourceName}'
| where TimeGenerated > ago(24h)
| where Level == 'Error' or Level == 'Warning'
| summarize Count = count() by Level, OperationName
| order by Count desc
```

---

## App Service Error Rate

```kql
// App Service error rate over last 24h
AzureMetrics
| where ResourceId contains '{appName}'
| where MetricName == 'Http5xx'
| where TimeGenerated > ago(24h)
| summarize Total5xx = sum(Total) by bin(TimeGenerated, 1h)
| order by TimeGenerated desc
```

---

## VM CPU Spikes

```kql
// VM CPU spikes in last 6h
Perf
| where Computer == '{vmName}'
| where ObjectName == 'Processor' and CounterName == '% Processor Time'
| where TimeGenerated > ago(6h)
| summarize AvgCPU = avg(CounterValue), MaxCPU = max(CounterValue) by bin(TimeGenerated, 5m)
| where MaxCPU > 85
| order by TimeGenerated desc
```

---

## Activity Log Review

```bash
# Recent operations that may have caused issues
az monitor activity-log list \
  --resource-id "$resourceId" \
  --start-time "$(date -d '24 hours ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
  --query "[?status.value=='Failed'].{op:operationName.localizedValue, time:eventTimestamp, status:status.value, caller:caller}" \
  --output table
```
