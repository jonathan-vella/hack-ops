# Security Baseline

> Extracted from `azure-defaults/SKILL.md` for progressive loading.
> Load when applying security settings to Bicep templates or reviewing security compliance.

## Security Settings

| Setting                    | Value               | Applies To                        |
| -------------------------- | ------------------- | --------------------------------- |
| `supportsHttpsTrafficOnly` | `true`              | Storage accounts                  |
| `minimumTlsVersion`        | `'TLS1_2'`          | All services                      |
| `allowBlobPublicAccess`    | `false`             | Storage accounts                  |
| `publicNetworkAccess`      | `'Disabled'` (prod) | Data services                     |
| Authentication             | Managed Identity    | Prefer over keys/strings          |
| SQL Auth                   | Azure AD-only       | `azureADOnlyAuthentication: true` |

## Common Policy Constraints

> [!NOTE]
> The governance constraints JSON output schema must include `bicepPropertyPath` and
> `requiredValue` fields for each Deny policy to enable downstream programmatic consumption
> by the Code Generator and review subagent.

| Policy             | Impact                          | Solution                              |
| ------------------ | ------------------------------- | ------------------------------------- |
| Required tags      | Deployment fails without tags   | Include all 4 required tags           |
| Allowed locations  | Resources rejected outside list | Use `swedencentral` default           |
| SQL AAD-only auth  | SQL password auth blocked       | Use `azureADOnlyAuthentication: true` |
| Storage shared key | Shared key access denied        | Use managed identity RBAC             |
| Zone redundancy    | Non-zonal SKUs rejected         | Use P1v4+ for App Service Plans       |

## Industry Compliance Pre-Selection

| Industry   | Auto-Select                       |
| ---------- | --------------------------------- |
| Healthcare | HIPAA checkbox, private endpoints |
| Finance    | PCI-DSS + SOC 2, WAF required     |
| Government | Data residency, enhanced audit    |
| Retail     | PCI-DSS if payments, DDoS         |

## Business Domain Signals

| Industry          | Common Compliance | Default Security                      |
| ----------------- | ----------------- | ------------------------------------- |
| Healthcare        | HIPAA             | Private endpoints, encryption at rest |
| Financial         | PCI-DSS, SOC 2    | WAF, private endpoints, audit logging |
| Government        | FedRAMP, IL4/5    | Azure Gov, private endpoints          |
| Retail/E-commerce | PCI-DSS           | WAF, DDoS protection                  |
| Education         | FERPA             | Data residency, access controls       |
