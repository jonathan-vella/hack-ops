# Managed Identity Binding

> Extracted from `azure-bicep-patterns/SKILL.md` for progressive loading.

Standard pattern for granting service-to-service access:

```bicep
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, appService.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      keyVaultSecretsUserRoleId
    )
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
```

Common role definition IDs:

| Role                      | ID                                     |
| ------------------------- | -------------------------------------- |
| Key Vault Secrets User    | `4633458b-17de-408a-b874-0445c86b69e6` |
| Storage Blob Data Reader  | `2a2b9908-6ea1-4ae2-8e65-a410df84e7d1` |
| Storage Blob Data Contrib | `ba92f5b4-2d11-453d-a403-e96b0029c9fe` |
| Cosmos DB Account Reader  | `fbdf93bf-df7d-467e-a4d2-9458aa1360c8` |
| SQL DB Contributor        | `9b7fa17d-e63e-47b0-bb0a-15c516ac86ec` |

- Always use `guid()` for deterministic, idempotent assignment names
- Set `principalType: 'ServicePrincipal'` for managed identities
- Scope to the narrowest resource possible
