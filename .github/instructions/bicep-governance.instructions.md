---
description: "MANDATORY Azure Policy compliance and governance discovery rules for Bicep code generation"
applyTo: "**/*.bicep, **/*.agent.md, **/04-governance-constraints.*, **/04-governance-constraints.json"
---

# Bicep Governance Instructions

Merged from `bicep-policy-compliance` and `governance-discovery` instructions.

## First Principle

**Azure Policy always wins.** Code MUST adapt to policy, never the reverse.

## Governance Discovery (MANDATORY GATE)

Governance constraints MUST be discovered from the live Azure environment,
NOT assumed from best practices. If Azure connectivity fails or policies
cannot be retrieved, STOP and inform the user.

### Why This Matters

- **Assumed**: 4 tags required → **Actual**: 9 tags via Azure Policy → **Result**: Deployment denied
- **`az policy assignment list`** misses management group-inherited policies
- Discovery is delegated to `governance-discovery-subagent` (see subagent definition)

### Required Documentation

The `04-governance-constraints.md` file MUST include a Discovery Source section
with REST API totals, subscription/MG-inherited counts, timestamps, and portal
validation match confirmation.

### Fail-Safe

If discovery returns PARTIAL or FAILED status: STOP, document the failure,
mark all constraints as "UNVERIFIED", and do NOT proceed to planning.

## Policy Compliance Mandate

ALL Bicep code generation MUST cross-reference `04-governance-constraints.md`
and `04-governance-constraints.json` before writing templates.

### Dynamic Tag List

Tags MUST come from governance constraints, not hardcoded defaults.
The 4 baseline defaults (`Environment`, `ManagedBy`, `Project`, `Owner`)
are a MINIMUM — discovered policies always win.

### Policy Effect Decision Tree

| Effect              | Action                                                |
| ------------------- | ----------------------------------------------------- |
| `Deny`              | MUST set property to compliant value — hard blocker   |
| `Modify`            | Document expected modification — avoid conflicts      |
| `DeployIfNotExists` | Document auto-deployed resource in implementation ref |
| `Audit`             | Set compliant value where feasible (best effort)      |
| `Disabled`          | No action required                                    |

### Misleading Policy Names

NEVER trust policy display names alone. Always verify the `policyRule` definition
to understand actual enforcement behavior.

## Downstream Enforcement

A governance compliance failure is a HARD GATE — the Bicep Code Generator
MUST NOT proceed past Phase 1.5 with unresolved policy violations.

## Anti-Patterns

| Anti-Pattern                            | Correct Approach                                        |
| --------------------------------------- | ------------------------------------------------------- |
| Assume 4 tags are sufficient            | Read `04-governance-constraints.md` for actual tag list |
| Ignore `publicNetworkAccess`            | Check network policies in governance constraints        |
| Skip governance reading                 | Always read and enforce governance constraints          |
| Hardcode security settings              | Cross-reference `04-governance-constraints.json`        |
| Generate assumed/best-practice policies | All constraints must come from live discovery           |

## Cross-References

- Governance constraints artifact: `agent-output/{project}/04-governance-constraints.md`
- Governance constraints JSON: `agent-output/{project}/04-governance-constraints.json`
- Azure defaults (baseline tags): `.github/skills/azure-defaults/SKILL.md`
- Bicep best practices: `.github/instructions/bicep-code-best-practices.instructions.md`
