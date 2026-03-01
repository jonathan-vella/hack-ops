# Module Composition

> Extracted from `azure-bicep-patterns/SKILL.md` for progressive loading.

Standard module interface pattern — every module follows this contract:

```bicep
// modules/storage.bicep
@description('Storage account name (max 24 chars)')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Log Analytics workspace name for diagnostics')
param logAnalyticsWorkspaceName string

// ... resource definition ...

// MANDATORY outputs
@description('Resource ID of the storage account')
output resourceId string = storageAccount.id

@description('Name of the storage account')
output resourceName string = storageAccount.name

@description('Principal ID of the managed identity (empty if none)')
output principalId string = storageAccount.identity.?principalId ?? ''
```

Module conventions:

- Every module accepts `name`, `location`, `tags`, `logAnalyticsWorkspaceName`
- Every module outputs `resourceId`, `resourceName`, `principalId`
- Use `@description` on all parameters and outputs
- Use AVM modules when available — wrap with project-specific defaults if needed
