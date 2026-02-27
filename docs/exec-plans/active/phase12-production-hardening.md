# Exec Plan: Phase 12 — Production Hardening

> Living session state tracker for Phase 12. Updated at the END of every session.
> Read this file FIRST at the start of any new session.

**Status**: Active
**Owner**: Human + Copilot agents
**Created**: 2026-02-27
**Source plan**: `.github/prompts/plan-hackOps.prompt.md` (Phase 12 section)
**Parent tracker**: `docs/exec-plans/active/hackops-execution.md`
**Epic**: #27 — [Epic] Production Hardening

---

## Issue-to-Step Mapping

| Step                  | Issue | Status |
| --------------------- | ----- | ------ |
| Epic: Phase 12        | #27   | Open   |
| H1: Governance re-run | #154  | Open   |
| H2: Bicep cross-ref   | #154  | Open   |
| H3: What-if validate  | #153  | Open   |
| H4: Security baseline | #153  | Open   |
| H5: Bicep remediation | —     | —      |
| H6: Final deployment  | —     | —      |
| H7: Artifacts update  | #152  | Closed |

---

## Current Session Target

**Phase**: H (Hardening)
**Step**: H1 — Re-run governance discovery
**Branch**: `feature/phase-12-hardening`
**Goal**: Re-discover Azure policies, cross-reference Bicep, validate what-if, verify security baseline.

---

## Prerequisites

- [ ] `az login` — authenticated to target subscription
- [ ] `az account show` — confirms subscription `noalz` / `rg-hackops-us-dev`
- [ ] Branch `feature/phase-12-hardening` created from `main`

---

## Phase Progress

### H1 — Re-run Governance Discovery

**Issue**: #154 (Steps 1-2)
**Prerequisite**: `az login` active

- [ ] Run `az policy assignment list --resource-group rg-hackops-us-dev -o json > /tmp/policies-latest.json`
- [ ] Diff against `agent-output/hackops/04-governance-constraints.json` — identify new/changed/removed policies
- [ ] Document any new Deny policies or tag requirements
- [ ] Update `04-governance-constraints.json` if policies changed
- [ ] Update `04-governance-constraints.md` narrative if needed

### H2 — Cross-reference Bicep Templates

**Issue**: #154 (Steps 1-2)

- [ ] Verify tags in `main.bicep` match all required tags from governance constraints
- [ ] Verify SKUs in all modules are in the allowed-SKU lists
- [ ] Verify `networking.bicep` — public access flags, NSG rules, TLS settings
- [ ] Verify `cosmos-db.bicep` — `publicNetworkAccess: 'Disabled'`, local auth disabled, RBAC-only
- [ ] Verify `key-vault.bicep` — `publicNetworkAccess: 'Disabled'`, purge protection, soft delete
- [ ] Verify `app-service.bicep` — TLS 1.2, HTTPS-only, managed identity, FTPS disabled
- [ ] Verify `monitoring.bicep` — diagnostic settings, log retention
- [ ] Create compliance matrix: each Deny policy → Bicep setting → status (pass/fail)
- [ ] Close #154 with summary comment

### H3 — Validate with What-If

**Issue**: #153 (Steps 3-4)
**Prerequisite**: H2 remediation complete (if any)

- [ ] Run `az deployment group what-if -g rg-hackops-us-dev -f infra/bicep/hackops/main.bicep -p infra/bicep/hackops/main.bicepparam`
- [ ] Confirm zero Deny-policy violations in output
- [ ] Confirm no unexpected resource deletions
- [ ] Document what-if output summary

### H4 — Verify Security Baseline

**Issue**: #153 (Steps 3-4)

- [ ] TLS 1.2 enforced — `az webapp show` confirms `minTlsVersion: '1.2'`
- [ ] HTTPS-only — `az webapp show` confirms `httpsOnly: true`
- [ ] Managed identity — `az webapp identity show` returns system-assigned identity
- [ ] No connection strings — `az webapp config appsettings list` has no Cosmos connection strings
- [ ] Cosmos `publicNetworkAccess` — `az cosmosdb show` confirms `Disabled`
- [ ] Key Vault `publicNetworkAccess` — `az keyvault show` confirms `Disabled`
- [ ] FTPS disabled — `az webapp config show` confirms `ftpsState: 'Disabled'`
- [ ] Update `docs/security-checklist.md` with verification timestamps
- [ ] Close #153 with summary comment

### H5 — Remediate Findings (if any)

- [ ] Fix any Bicep template non-compliance found in H2
- [ ] Fix any security baseline gaps found in H4
- [ ] Re-run `bicep build infra/bicep/hackops/main.bicep` — clean
- [ ] Re-run `bicep lint infra/bicep/hackops/main.bicep` — clean
- [ ] Re-run what-if if Bicep changed — zero violations
- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run validate` — all validators pass

### H6 — Final Deployment Validation

**Prerequisite**: H3 + H4 + H5 all pass

- [ ] Deploy to `rg-hackops-us-dev` with staging slot
- [ ] Swap staging → production
- [ ] Run health check: `curl https://app-hackops-dev.azurewebsites.net/api/health`
- [ ] Verify auth flow: navigate to app → GitHub OAuth redirect works
- [ ] Smoke test: create hackathon, join, submit — end-to-end flow

### H7 — Update Artifacts and Close

- [ ] Update `agent-output/hackops/07-compliance-matrix.md` with final status
- [ ] Update `agent-output/hackops/07-resource-inventory.md` if resources changed
- [ ] Update `QUALITY_SCORE.md` with Phase 12 completion
- [ ] Remove `blocked` label from Epic #27
- [ ] Close Epic #27 with completion summary
- [ ] Merge `feature/phase-12-hardening` → `main` via PR
- [ ] Move this exec plan to `docs/exec-plans/completed/`

---

## Session Log

| #   | Date | Phase/Step | What was done | What's next | Blockers |
| --- | ---- | ---------- | ------------- | ----------- | -------- |
| 0   | 2026-02-27 | Planning | Created Phase 12 exec plan, reviewed open issues #27/#153/#154 | H1: az login + governance re-run | az login required |

---

## Key Files (context loading reference)

### Always read (every session)

1. **This file** — `docs/exec-plans/active/phase12-production-hardening.md`
2. **Parent tracker** — `docs/exec-plans/active/hackops-execution.md` (Phase 12 section only)

### Read when working on specific steps

| Step        | Additional context files                                                  |
| ----------- | ------------------------------------------------------------------------- |
| H1 (gov)    | `agent-output/hackops/04-governance-constraints.json`                     |
| H2 (bicep)  | `infra/bicep/hackops/main.bicep`, all module files                        |
| H3 (whatif)  | `infra/bicep/hackops/main.bicepparam`                                     |
| H4 (sec)    | `docs/security-checklist.md`                                              |
| H5 (fix)    | Whatever failed in H2-H4                                                  |
| H6 (deploy) | `agent-output/hackops/06-deployment-summary.md`                           |
| H7 (close)  | `agent-output/hackops/07-compliance-matrix.md`, `QUALITY_SCORE.md`        |

---

## Decisions Made During Execution

| Date | Decision | Rationale |
| ---- | -------- | --------- |
| — | — | — |
