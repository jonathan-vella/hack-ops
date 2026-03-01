# Documentation Styling Standards

> Extracted from `azure-artifacts/SKILL.md` for progressive loading.
> Load when formatting artifact content (callouts, emoji, icons, references).

## Callout Styles

```markdown
> [!NOTE]
> Informational — background context, tips, FYI

> [!TIP]
> Best practice recommendation or optimization

> [!IMPORTANT]
> Critical configuration that must not be overlooked

> [!WARNING]
> Security concern, reliability risk, potential issue

> [!CAUTION]
> Data loss risk, breaking change, irreversible action
```

## Status Emoji

| Purpose           | Emoji | Example                      |
| ----------------- | ----- | ---------------------------- |
| Success/Complete  | ✅    | `✅ Health check passed`     |
| Warning/Attention | ⚠️    | `⚠️ Requires manual config`  |
| Error/Critical    | ❌    | `❌ Validation failed`       |
| Info/Tip          | 💡    | `💡 Consider Premium tier`   |
| Security          | 🔐    | `🔐 Requires Key Vault`      |
| Cost              | 💰    | `💰 Estimated: $50/month`    |
| Reference         | 📚    | `📚 See: Microsoft Learn`    |
| Time              | ⏰    | `⏰ Runs daily at 02:00 UTC` |
| Pending           | ⏳    | `⏳ Awaiting approval`       |

## Category Icons

| Category   | Icon | Usage                         |
| ---------- | ---- | ----------------------------- |
| Compute    | 💻   | `### 💻 Compute Resources`    |
| Data       | 💾   | `### 💾 Data Services`        |
| Networking | 🌐   | `### 🌐 Networking Resources` |
| Messaging  | 📨   | `### 📨 Messaging Resources`  |
| Security   | 🔐   | `### 🔐 Security Resources`   |
| Monitoring | 📊   | `### 📊 Monitoring Resources` |
| Identity   | 👤   | `### 👤 Identity & Access`    |
| Storage    | 📦   | `### 📦 Storage Resources`    |

## WAF Pillar Icons

| Pillar      | Icon |
| ----------- | ---- |
| Security    | 🔒   |
| Reliability | 🔄   |
| Performance | ⚡   |
| Cost        | 💰   |
| Operations  | 🔧   |

## Collapsible Sections

Use for lengthy content (>10 rows, reference material, code examples):

```markdown
<details>
<summary>📋 Detailed Configuration</summary>

| Setting | Value |
| ------- | ----- |
| ...     | ...   |

</details>
```

## References Section (Required on Most Artifacts)

```markdown
---

## References

> [!NOTE]
> 📚 The following Microsoft Learn resources provide additional guidance.

| Topic      | Link                                            |
| ---------- | ----------------------------------------------- |
| Topic Name | [Display Text](https://learn.microsoft.com/...) |
```

## Common Reference Links

| Topic                    | URL                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| WAF Overview             | `https://learn.microsoft.com/azure/well-architected/`                                    |
| Security Checklist       | `https://learn.microsoft.com/azure/well-architected/security/checklist`                  |
| Reliability Checklist    | `https://learn.microsoft.com/azure/well-architected/reliability/checklist`               |
| Cost Optimization        | `https://learn.microsoft.com/azure/well-architected/cost-optimization/checklist`         |
| Azure Backup             | `https://learn.microsoft.com/azure/backup/backup-best-practices`                         |
| Azure Monitor            | `https://learn.microsoft.com/azure/azure-monitor/overview`                               |
| Managed Identities       | `https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview` |
| Key Vault Practices      | `https://learn.microsoft.com/azure/key-vault/general/best-practices`                     |
| Azure Pricing Calculator | `https://azure.microsoft.com/pricing/calculator/`                                        |
