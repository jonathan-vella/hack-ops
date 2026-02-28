# CAF Naming Conventions

> Extracted from `azure-defaults/SKILL.md` for progressive loading.
> Load only when generating resource names or validating naming compliance.

## Standard Abbreviations

| Resource         | Abbreviation | Name Pattern                | Max Length |
| ---------------- | ------------ | --------------------------- | ---------- |
| Resource Group   | `rg`         | `rg-{project}-{env}`        | 90         |
| Virtual Network  | `vnet`       | `vnet-{project}-{env}`      | 64         |
| Subnet           | `snet`       | `snet-{purpose}-{env}`      | 80         |
| NSG              | `nsg`        | `nsg-{purpose}-{env}`       | 80         |
| Key Vault        | `kv`         | `kv-{short}-{env}-{suffix}` | **24**     |
| Storage Account  | `st`         | `st{short}{env}{suffix}`    | **24**     |
| App Service Plan | `asp`        | `asp-{project}-{env}`       | 40         |
| App Service      | `app`        | `app-{project}-{env}`       | 60         |
| SQL Server       | `sql`        | `sql-{project}-{env}`       | 63         |
| SQL Database     | `sqldb`      | `sqldb-{project}-{env}`     | 128        |
| Static Web App   | `stapp`      | `stapp-{project}-{env}`     | 40         |
| CDN / Front Door | `fd`         | `fd-{project}-{env}`        | 64         |
| Log Analytics    | `log`        | `log-{project}-{env}`       | 63         |
| App Insights     | `appi`       | `appi-{project}-{env}`      | 255        |
| Container App    | `ca`         | `ca-{project}-{env}`        | 32         |
| Container Env    | `cae`        | `cae-{project}-{env}`       | 60         |
| Cosmos DB        | `cosmos`     | `cosmos-{project}-{env}`    | 44         |
| Service Bus      | `sb`         | `sb-{project}-{env}`        | 50         |

## Length-Constrained Resources

Key Vault and Storage Account have 24-char limits. Always include `uniqueSuffix`:

```bicep
// Key Vault: kv-{8chars}-{3chars}-{6chars} = 21 chars max
var kvName = 'kv-${take(projectName, 8)}-${take(environment, 3)}-${take(uniqueSuffix, 6)}'

// Storage: st{8chars}{3chars}{6chars} = 19 chars max (no hyphens!)
var stName = 'st${take(replace(projectName, '-', ''), 8)}${take(environment, 3)}${take(uniqueSuffix, 6)}'
```

## Naming Rules

- **DO**: Use lowercase with hyphens (`kv-myapp-dev-abc123`)
- **DO**: Include `uniqueSuffix` in globally unique names (Key Vault, Storage, SQL Server)
- **DO**: Use `take()` to truncate long names within limits
- **DON'T**: Use hyphens in Storage Account names (only lowercase + numbers)
- **DON'T**: Hardcode unique values — always derive from `uniqueString(resourceGroup().id)`
- **DON'T**: Exceed max length — Bicep won't warn, deployment will fail
