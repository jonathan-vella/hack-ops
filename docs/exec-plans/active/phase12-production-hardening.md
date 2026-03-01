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

| Step                  | Issue | Status    |
| --------------------- | ----- | --------- |
| Epic: Phase 12        | #27   | Open      |
| H1: Governance re-run | #154  | Completed |
| H2: Bicep cross-ref   | #154  | Completed |
| H3: What-if validate  | #153  | Completed |
| H4: Security baseline | #153  | Completed |
| H5: Bicep remediation | —     | Completed |
| H6: Final deployment  | —     | Open      |
| H7: Artifacts update  | #152  | Closed    |

---

## Current Session Target

**Phase**: H (Hardening)
**Step**: H6 — Final Deployment Validation
**Branch**: `feature/phase-12-hardening`
**Goal**: Deploy to rg-hackops-us-dev with staging slot, swap, health check, and smoke test.

---

## Prerequisites

- [x] `az login` — authenticated to target subscription
- [x] `az account show` — confirms subscription `noalz` / `rg-hackops-us-dev`
- [x] Branch `feature/phase-12-hardening` created from `main`

---

## Phase Progress

### H1 — Re-run Governance Discovery

**Issue**: #154 (Steps 1-2)
**Prerequisite**: `az login` active

- [x] Run `az policy assignment list --resource-group rg-hackops-us-dev -o json > /tmp/policies-latest.json`
- [x] Diff against `agent-output/hackops/04-governance-constraints.json` — identify new/changed/removed policies
- [x] Document any new Deny policies or tag requirements — none found
- [x] Update `04-governance-constraints.json` if policies changed — no changes needed
- [x] Update `04-governance-constraints.md` narrative if needed — no changes needed

### H2 — Cross-reference Bicep Templates

**Issue**: #154 (Steps 1-2)

- [x] Verify tags in `main.bicep` match all required tags from governance constraints
- [x] Verify SKUs in all modules are in the allowed-SKU lists
- [x] Verify `networking.bicep` — public access flags, NSG rules, TLS settings
- [x] Verify `sql-database.bicep` — `publicNetworkAccess: 'Disabled'`, local auth disabled, Entra-only
- [x] Verify `key-vault.bicep` — `publicNetworkAccess: 'Disabled'`, purge protection, soft delete
- [x] Verify `app-service.bicep` — TLS 1.2, HTTPS-only, managed identity, FTPS disabled
- [x] Verify `monitoring.bicep` — diagnostic settings, log retention
- [x] Create compliance matrix: each Deny policy → Bicep setting → status (pass/fail)
- [x] Close #154 with summary comment

### H3 — Validate with What-If

**Issue**: #153 (Steps 3-4)
**Prerequisite**: H2 remediation complete (if any)

- [x] Run `az deployment group what-if -g rg-hackops-us-dev -f infra/bicep/hackops/main.bicep -p infra/bicep/hackops/main.bicepparam`
- [x] Confirm zero Deny-policy violations in output
- [x] Confirm no unexpected resource deletions
- [x] Document what-if output summary

### H4 — Verify Security Baseline

**Issue**: #153 (Steps 3-4)

- [x] TLS 1.2 enforced — `az webapp show` confirms `minTlsVersion: '1.2'`
- [x] HTTPS-only — `az webapp show` confirms `httpsOnly: true`
- [x] Managed identity — `az webapp identity show` returns system-assigned identity
- [x] No connection strings — `az webapp config appsettings list` has no SQL connection strings
- [x] SQL Database `publicNetworkAccess` — `az sql server show` confirms restricted access
- [x] Key Vault `publicNetworkAccess` — `az keyvault show` confirms `Disabled`
- [x] FTPS disabled — `az webapp config show` confirms `ftpsState: 'Disabled'`
- [x] Update `docs/security-checklist.md` with verification timestamps
- [x] Close #153 with summary comment

### H5 — Remediate Findings (if any)

- [x] Fix any Bicep template non-compliance found in H2 — no issues found
- [x] Fix any security baseline gaps found in H4 — no gaps found
- [x] Re-run `bicep build infra/bicep/hackops/main.bicep` — clean
- [x] Re-run `bicep lint infra/bicep/hackops/main.bicep` — clean
- [x] Re-run what-if if Bicep changed — zero violations
- [x] Run `npm test` — all tests pass
- [x] Run `npm run validate` — all validators pass

### H6 — Final Deployment Validation

**Prerequisite**: H3 + H4 + H5 all pass

- [x] Deploy to `rg-hackops-us-dev` with staging slot
- [x] Swap staging → production
- [x] Run health check: `curl https://app-hackops-dev.azurewebsites.net/api/health` — **200 OK**
- [ ] Verify auth flow: navigate to app → GitHub OAuth redirect works
- [ ] Smoke test: create hackathon, join, submit — end-to-end flow

**Deployment details (2026-02-28)**:

- Created staging slot, zip-deployed 24MB standalone bundle
- Startup command: `node apps/web/server.js`
- Staging health check passed (HTTP 200), swapped to production
- Production smoke test: `/api/health` 200, `/dashboard` 200, `/join` 200, `/api/hackathons` 401 (auth guard working)

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

| #   | Date       | Phase/Step | What was done                                                                                                                                                                            | What's next                                               | Blockers                     |
| --- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| 0   | 2026-02-27 | Planning   | Created Phase 12 exec plan, reviewed open issues #27/#153/#154                                                                                                                           | H1: az login + governance re-run                          | az login required            |
| 1   | 2026-02-27 | H1         | Re-ran governance discovery; policies unchanged from session 15 (21 policies, 9 tags, Cosmos RBAC-only); no updates to 04-governance-constraints files needed                            | H2: Cross-reference Bicep templates                       | None                         |
| 2   | 2026-02-28 | H2-H6      | H2-H5 completed (prior session); H6: created staging slot, zip-deployed standalone bundle, swapped to production; health check 200 OK; API auth guards working (401); pages render (200) | H6: Easy Auth flow + E2E smoke test; H7: artifact updates | Easy Auth not yet configured |

---

## Key Files (context loading reference)

### Always read (every session)

1. **This file** — `docs/exec-plans/active/phase12-production-hardening.md`
2. **Parent tracker** — `docs/exec-plans/active/hackops-execution.md` (Phase 12 section only)

### Read when working on specific steps

| Step        | Additional context files                                           |
| ----------- | ------------------------------------------------------------------ |
| H1 (gov)    | `agent-output/hackops/04-governance-constraints.json`              |
| H2 (bicep)  | `infra/bicep/hackops/main.bicep`, all module files                 |
| H3 (whatif) | `infra/bicep/hackops/main.bicepparam`                              |
| H4 (sec)    | `docs/security-checklist.md`                                       |
| H5 (fix)    | Whatever failed in H2-H4                                           |
| H6 (deploy) | `agent-output/hackops/06-deployment-summary.md`                    |
| H7 (close)  | `agent-output/hackops/07-compliance-matrix.md`, `QUALITY_SCORE.md` |

---

## Decisions Made During Execution

| Date       | Decision                                             | Rationale                                                                                                 |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 2026-02-27 | H1 policies unchanged — skip governance file updates | Same 21 policies, 9 mandatory tags, Cosmos RBAC-only Modify policy; no new Deny policies since session 15 |
