---
name: azure-bicep-patterns
description: Common Azure Bicep infrastructure patterns including hub-spoke networking, private endpoints, diagnostic settings, conditional deployments, and AVM module composition. Use when designing or generating Bicep templates that combine multiple Azure resources into repeatable patterns.
compatibility: Requires Azure CLI with Bicep extension
---

# Azure Bicep Patterns Skill

Reusable infrastructure patterns for Azure Bicep templates. These patterns complement
the `bicep-code-best-practices.instructions.md` (style rules) and `azure-defaults`
skill (naming, tags, regions) with composable architecture building blocks.

Load the specific pattern reference file when you need the full Bicep code.

## Reference Files (Load on Demand)

| File | When to Load |
| ---- | ------------ |
| `references/hub-spoke.md` | Multi-workload environments with shared networking |
| `references/private-endpoint.md` | PaaS service requiring private connectivity |
| `references/diagnostic-settings.md` | Adding log/metric collection to any resource |
| `references/conditional-deployment.md` | Optional resources controlled by parameters |
| `references/module-composition.md` | Breaking main.bicep into reusable modules |
| `references/managed-identity.md` | Service-to-service authentication via RBAC |
| `references/whatif-interpretation.md` | Pre-deployment validation and change review |

---

## Quick Reference

| Pattern                  | When to Use                                      | Key Rule |
| ------------------------ | ------------------------------------------------ | -------- |
| Hub-Spoke Networking     | Multi-workload environments with shared services | Spokes peer to hub only, never to each other |
| Private Endpoint Wiring  | Any PaaS service requiring private connectivity  | Always include DNS zone group |
| Diagnostic Settings      | Every deployed resource (mandatory)              | Use `categoryGroup: 'allLogs'` + `AllMetrics` |
| Conditional Deployment   | Optional resources controlled by parameters      | Guard outputs with ternary expressions |
| Module Composition       | Breaking main.bicep into reusable modules        | Every module outputs `resourceId`, `resourceName`, `principalId` |
| Managed Identity Binding | Any service-to-service authentication            | Use `guid()` for deterministic assignment names |
| What-If Interpretation   | Pre-deployment validation                        | Watch for unexpected deletes and SKU downgrades |

---

## Pattern Selection Guide

### By Architecture Layer

| Layer | Patterns to Apply |
| ----- | ----------------- |
| Networking | Hub-Spoke + Private Endpoint |
| Compute | Module Composition + Managed Identity |
| Data | Private Endpoint + Diagnostic Settings |
| Security | Managed Identity + Conditional Deployment |
| Operations | Diagnostic Settings + What-If |

### By Deployment Phase

| Phase | Patterns |
| ----- | -------- |
| Planning (Step 4) | All patterns for architecture review |
| Coding (Step 5) | Module Composition, then layer-specific patterns |
| Validation (Step 5) | What-If Interpretation |
| Deployment (Step 6) | What-If first, then deploy |

---

## Common Combinations

### Secure PaaS Deployment

Combine Private Endpoint + Diagnostic Settings + Managed Identity:

1. Deploy PaaS resource with `publicNetworkAccess: 'Disabled'`
2. Wire Private Endpoint (read `references/private-endpoint.md`)
3. Add Diagnostic Settings (read `references/diagnostic-settings.md`)
4. Bind Managed Identity for access (read `references/managed-identity.md`)

### Modular Infrastructure

Combine Module Composition + Conditional Deployment:

1. Define module interface contract (read `references/module-composition.md`)
2. Add conditional flags for optional resources (read `references/conditional-deployment.md`)
3. Wire outputs between modules via `main.bicep`

---

## Learn More

For patterns not covered here, query official documentation:

| Topic                    | How to Find                                                                |
| ------------------------ | -------------------------------------------------------------------------- |
| AVM module catalog       | `microsoft_docs_search(query="Azure Verified Modules registry Bicep")`     |
| Resource type schema     | `microsoft_docs_search(query="{resource-type} Bicep template reference")` |
| Networking patterns      | `microsoft_docs_search(query="Azure hub-spoke network topology Bicep")`   |
| Security baseline        | `microsoft_docs_search(query="{service} security baseline")`              |
