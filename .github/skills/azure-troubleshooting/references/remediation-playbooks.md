# Remediation Playbooks

Step-by-step resolution guides for common Azure resource issues.

## High CPU on App Service

1. Check if autoscale is configured — if not, add scale-out rule at 70% CPU
2. Review Application Insights for slow dependencies
3. Check for synchronous blocking calls in application code
4. Consider scaling up the App Service Plan SKU

---

## Storage Account Throttling

1. Check current request rate against [storage scalability targets](https://learn.microsoft.com/azure/storage/common/scalability-targets-standard-account)
2. Enable CDN for read-heavy blob workloads
3. Distribute across multiple storage accounts if partition limits hit
4. Switch to Premium storage for high-IOPS requirements

---

## SQL Database DTU Exhaustion

1. Identify top resource-consuming queries via Query Performance Insight
2. Add missing indexes suggested by Azure SQL advisor
3. Scale up DTU tier or switch to vCore for more granular control
4. Review connection pooling settings in application

---

## Diagnostic Report Template

Structure diagnostic reports as:

```markdown
## Diagnostic Report: {resource-name}

**Assessment Date**: {date}
**Assessed By**: InfraOps Diagnose Agent
**Overall Health**: 🟢 Healthy | 🟡 Degraded | 🔴 Unhealthy

### Findings Summary

| #   | Finding | Severity | Status |
| --- | ------- | -------- | ------ |
| 1   | ...     | High     | Open   |

### Detailed Findings

#### Finding 1: {title}

...

### Recommended Actions

1. ...
```
