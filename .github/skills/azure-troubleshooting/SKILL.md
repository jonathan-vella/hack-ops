---
name: azure-troubleshooting
description: Azure resource troubleshooting patterns including KQL templates, metric thresholds, health checks, and remediation playbooks. Use when diagnosing unhealthy Azure resources or building diagnostic workflows.
compatibility: Requires Azure CLI with resource-graph extension
---

# Azure Troubleshooting Skill

Structured diagnostic patterns for Azure resource health assessment and
remediation. Load the specific reference file when you need detailed queries,
health-check tables, or playbook steps.

## Reference Files (Load on Demand)

| File | When to Load |
| ---- | ------------ |
| `references/kql-templates.md` | Need KQL queries for resource discovery, error search, or metrics |
| `references/health-checks.md` | Diagnosing a specific resource type (App Service, VM, Storage, SQL, Static Web Apps) |
| `references/remediation-playbooks.md` | Fixing a known issue (high CPU, throttling, DTU exhaustion) + report template |

---

## Quick Reference

| Capability              | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| Resource Discovery      | Azure Resource Graph queries to find and inventory resources     |
| Health Checks           | Per-resource-type diagnostic commands and metric thresholds      |
| KQL Templates           | Log Analytics queries for common failure scenarios               |
| Severity Classification | Standardised impact/urgency mapping for findings                 |
| Remediation Playbooks   | Step-by-step resolution for common issues                        |

---

## Severity Classification

Classify every finding with consistent severity:

| Severity | Criteria                                                                | Response Time    |
| -------- | ----------------------------------------------------------------------- | ---------------- |
| Critical | Service down, data loss risk, security breach                           | Immediate        |
| High     | Degraded performance, failing redundancy, auth issues                   | Within 4 hours   |
| Medium   | Suboptimal configuration, missing best practices, capacity warnings     | Within 24 hours  |
| Low      | Cosmetic issues, documentation gaps, minor optimisations                | Next sprint      |

---

## Diagnostic Workflow

Follow this six-phase sequence for any resource investigation:

| Phase | Action | Tool |
| ----- | ------ | ---- |
| 1. Discovery | Get resource details via `az resource show` | CLI |
| 2. Health Assessment | Run resource-type health checks | Load `references/health-checks.md` |
| 3. Log Analysis | Query Log Analytics for errors/warnings | Load `references/kql-templates.md` |
| 4. Activity Log | Review recent failed operations | Load `references/kql-templates.md` |
| 5. Classification | Rate each finding by severity table above | This file |
| 6. Report | Generate structured diagnostic report | Load `references/remediation-playbooks.md` |

### Phase 1 — Discovery (Always Start Here)

```bash
az resource show --ids "$resourceId" \
  --query "{name:name, type:type, location:location, sku:sku, tags:tags}"
```

Then load the appropriate reference file for phases 2-6.

---

## Supported Resource Types

| Resource Type | Health Check Reference | Common Issues |
| ------------- | ---------------------- | ------------- |
| App Service / Web Apps | `references/health-checks.md` | HTTP 5xx, high CPU/memory |
| Virtual Machines | `references/health-checks.md` | CPU spikes, disk latency |
| Storage Accounts | `references/health-checks.md` | Throttling, availability drops |
| SQL Database | `references/health-checks.md` | DTU exhaustion, deadlocks |
| Static Web Apps | `references/health-checks.md` | Deployment failures, SSL |

---

## Learn More

For issues not covered here, query official documentation:

| Topic                    | How to Find                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| Service-specific limits  | `microsoft_docs_search(query="{service} limits quotas")`                         |
| KQL reference            | `microsoft_docs_search(query="KQL quick reference Azure Monitor")`               |
| Metric definitions       | `microsoft_docs_search(query="{service} supported metrics Azure Monitor")`       |
| Troubleshooting guides   | `microsoft_docs_search(query="{service} troubleshoot common issues")`            |
