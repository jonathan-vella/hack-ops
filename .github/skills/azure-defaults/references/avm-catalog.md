# Azure Verified Modules (AVM) Catalog

> Extracted from `azure-defaults/SKILL.md` for progressive loading.
> Load when planning or coding Bicep templates that use AVM modules.

## AVM-First Policy

1. **ALWAYS** check AVM availability first via `mcp_bicep_list_avm_metadata`
2. Use AVM module defaults for SKUs when available
3. If custom SKU needed, require live deprecation research
4. **NEVER** hardcode SKUs without validation
5. **NEVER** write raw Bicep for a resource that has an AVM module

## Common AVM Modules

| Resource           | Module Path                                        | Min Version |
| ------------------ | -------------------------------------------------- | ----------- |
| Key Vault          | `br/public:avm/res/key-vault/vault`                | `0.11.0`    |
| Virtual Network    | `br/public:avm/res/network/virtual-network`        | `0.5.0`     |
| Storage Account    | `br/public:avm/res/storage/storage-account`        | `0.14.0`    |
| App Service Plan   | `br/public:avm/res/web/serverfarm`                 | `0.4.0`     |
| App Service        | `br/public:avm/res/web/site`                       | `0.12.0`    |
| SQL Server         | `br/public:avm/res/sql/server`                     | `0.10.0`    |
| Log Analytics      | `br/public:avm/res/operational-insights/workspace` | `0.9.0`     |
| App Insights       | `br/public:avm/res/insights/component`             | `0.4.0`     |
| NSG                | `br/public:avm/res/network/network-security-group` | `0.5.0`     |
| Static Web App     | `br/public:avm/res/web/static-site`                | `0.4.0`     |
| Container App      | `br/public:avm/res/app/container-app`              | `0.11.0`    |
| Container Env      | `br/public:avm/res/app/managed-environment`        | `0.8.0`     |
| Cosmos DB          | `br/public:avm/res/document-db/database-account`   | `0.10.0`    |
| Front Door         | `br/public:avm/res/cdn/profile`                    | `0.7.0`     |
| Service Bus        | `br/public:avm/res/service-bus/namespace`          | `0.10.0`    |
| Container Registry | `br/public:avm/res/container-registry/registry`    | `0.6.0`     |

## Finding Latest AVM Version

```text
// Use Bicep MCP tool:
mcp_bicep_list_avm_metadata → filter by resource type → use latest version

// Or check: https://aka.ms/avm/index
```

## AVM Usage Pattern

```bicep
module keyVault 'br/public:avm/res/key-vault/vault:0.11.0' = {
  name: '${kvName}-deploy'
  params: {
    name: kvName
    location: location
    tags: tags
    enableRbacAuthorization: true
    enablePurgeProtection: true
  }
}
```

## AVM Known Pitfalls

### Region Limitations

| Service         | Limitation                                                                  | Workaround                                |
| --------------- | --------------------------------------------------------------------------- | ----------------------------------------- |
| Static Web Apps | Only 5 regions: `westus2`, `centralus`, `eastus2`, `westeurope`, `eastasia` | Use `westeurope` for EU                   |
| Azure OpenAI    | Limited regions per model                                                   | Check availability before planning        |
| Container Apps  | Most regions but not all                                                    | Verify `cae` environment in target region |

### Parameter Type Mismatches

Known issues when using AVM modules — verify before coding:

**Log Analytics Workspace** (`operational-insights/workspace`):

- `dailyQuotaGb` is `int` in AVM, not `string`
- **DO**: `dailyQuotaGb: 5`
- **DON'T**: `dailyQuotaGb: '5'`

**Container Apps Managed Environment** (`app/managed-environment`):

- `appLogsConfiguration` deprecated in newer versions
- **DO**: Use `logsConfiguration` with destination object
- **DON'T**: Use `appLogsConfiguration.destination: 'log-analytics'`

**Container Apps** (`app/container-app`):

- `scaleSettings` is an object, not array of rules
- **DO**: Check AVM schema for exact object shape
- **DON'T**: Assume `scaleRules: [...]` array format

**SQL Server** (`sql/server`):

- `sku` parameter is a typed object `{name, tier, capacity}`
- **DO**: Pass full SKU object matching schema
- **DON'T**: Pass just string `'S0'`
- `availabilityZone` requires specific format per region

**App Service** (`web/site`):

- `APPINSIGHTS_INSTRUMENTATIONKEY` deprecated
- **DO**: Use `APPLICATIONINSIGHTS_CONNECTION_STRING` instead
- **DON'T**: Set instrumentation key directly

**Key Vault** (`key-vault/vault`):

- `softDeleteRetentionInDays` is immutable after creation
- **DO**: Set correctly on first deploy (default: 90)
- **DON'T**: Try to change after vault exists

**Static Web App** (`web/static-site`):

- Free SKU may not be deployable via ARM in all regions
- **DO**: Use `Standard` SKU for reliable ARM deployment
- **DON'T**: Assume Free tier works everywhere via Bicep

## Service Lifecycle Validation

### AVM Default Trust

When using AVM modules with default SKU parameters:

- Trust the AVM default — Microsoft maintains these
- No additional deprecation research needed for defaults
- If overriding SKU parameter, run deprecation research

### Deprecation Research (For Non-AVM or Custom SKUs)

| Source            | Query Pattern                                              | Reliability |
| ----------------- | ---------------------------------------------------------- | ----------- |
| Azure Updates     | `azure.microsoft.com/updates/?query={service}+deprecated`  | High        |
| Microsoft Learn   | Check "Important" / "Note" callouts on service pages       | High        |
| Azure CLI         | `az provider show --namespace {provider}` for API versions | Medium      |
| Resource Provider | Check available SKUs in target region                      | High        |

### Known Deprecation Patterns

| Pattern                    | Status            | Replacement           |
| -------------------------- | ----------------- | --------------------- |
| "Classic" anything         | DEPRECATED        | ARM equivalents       |
| CDN `Standard_Microsoft`   | DEPRECATED 2027   | Azure Front Door      |
| App Gateway v1             | DEPRECATED        | App Gateway v2        |
| "v1" suffix services       | Likely deprecated | Check for v2          |
| Old API versions (2020-xx) | Outdated          | Use latest stable API |

### What-If Deprecation Signals

Deploy agent should scan what-if output for:
`deprecated|sunset|end.of.life|no.longer.supported|classic.*not.*supported|retiring`

If detected, STOP and report before deployment.
