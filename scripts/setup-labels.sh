#!/usr/bin/env bash
# Create the HackOps label taxonomy on the GitHub repository.
# Idempotent — existing labels are updated, not duplicated.
#
# Prerequisites: gh auth login (or GH_TOKEN set)
# Usage: ./scripts/setup-labels.sh

set -euo pipefail

REPO="jonathan-vella/hack-ops"

create_label() {
  local name="$1" color="$2" description="$3"
  if gh label list --repo "$REPO" --search "$name" --json name \
       | grep -q "\"$name\""; then
    gh label edit "$name" --repo "$REPO" \
      --color "$color" --description "$description" 2>/dev/null || true
    echo "  updated: $name"
  else
    gh label create "$name" --repo "$REPO" \
      --color "$color" --description "$description"
    echo "  created: $name"
  fi
}

echo "=== HackOps Label Taxonomy ==="

echo ""
echo "--- Domain labels ---"
create_label "app"        "0075ca" "Application code (Next.js / TypeScript)"
create_label "frontend"   "7057ff" "UI pages, components, and styling"
create_label "backend"    "006b75" "API routes and server-side logic"
create_label "api"        "1d76db" "REST API endpoints and contracts"
create_label "database"   "fbca04" "Azure SQL tables, queries, data model"
create_label "auth"       "b60205" "Authentication, authorization, and roles"
create_label "testing"    "0e8a16" "Unit, integration, and E2E tests"

echo ""
echo "--- Phase labels (plan-hackOps phases 1-12) ---"
create_label "phase-1"    "c2e0c6" "Phase 1: Monorepo Scaffold"
create_label "phase-1.5"  "c2e0c6" "Phase 1.5: Governance Discovery"
create_label "phase-2"    "c2e0c6" "Phase 2: IaC Foundation"
create_label "phase-3"    "c2e0c6" "Phase 3: Database IaC & Schema"
create_label "phase-4"    "c2e0c6" "Phase 4: Compute IaC & Deployment"
create_label "phase-5"    "c2e0c6" "Phase 5: Auth & Authorization"
create_label "phase-6"    "c2e0c6" "Phase 6: Core API — Hackathon & Teams"
create_label "phase-7"    "c2e0c6" "Phase 7: Scoring Engine & Submissions"
create_label "phase-8"    "c2e0c6" "Phase 8: Leaderboard & Live Updates"
create_label "phase-9"    "c2e0c6" "Phase 9: Challenge Progression & Gating"
create_label "phase-10"   "c2e0c6" "Phase 10: Admin & Operational Features"
create_label "phase-11"   "c2e0c6" "Phase 11: CI/CD Pipeline"
create_label "phase-12"   "c2e0c6" "Phase 12: Production Hardening"

echo ""
echo "--- Workflow labels ---"
create_label "epic"       "3e4b9e" "Epic grouping issue"
create_label "prd"        "d4c5f9" "Linked to Product Requirements Document"
create_label "blocked"    "e11d48" "Blocked by another issue or external dependency"

echo ""
echo "=== Done. Existing labels (bug, enhancement, etc.) are preserved. ==="
