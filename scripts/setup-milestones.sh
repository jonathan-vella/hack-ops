#!/usr/bin/env bash
# Create the 12 HackOps milestones matching plan-hackOps.prompt.md phases.
# Idempotent — skips milestones that already exist.
#
# Prerequisites: gh auth login (or GH_TOKEN set)
# Usage: ./scripts/setup-milestones.sh

set -euo pipefail

REPO="jonathan-vella/hack-ops"

create_milestone() {
  local title="$1" description="$2"
  if gh api "repos/$REPO/milestones" --paginate --jq '.[].title' \
       | grep -qF "$title"; then
    echo "  exists: $title"
  else
    gh api "repos/$REPO/milestones" \
      -f title="$title" \
      -f description="$description" \
      -f state="open" > /dev/null
    echo "  created: $title"
  fi
}

echo "=== HackOps Milestones ==="

create_milestone \
  "Phase 1: Monorepo Scaffold" \
  "Goal: Working Next.js app running locally with TypeScript, Tailwind, shadcn/ui, and Cosmos DB emulator.
Exit: npm run dev shows hello-world page; API route returns { status: ok } from emulator."

create_milestone \
  "Phase 1.5: Governance Discovery" \
  "Goal: Discover Azure Policy constraints before writing IaC.
Exit: 04-governance-constraints.json populated; constraints mapped to planned resources."

create_milestone \
  "Phase 2: IaC Foundation" \
  "Goal: Bicep templates for networking, monitoring, and Key Vault.
Exit: bicep build succeeds; az deployment group what-if shows expected resources."

create_milestone \
  "Phase 3: Database IaC & Schema" \
  "Goal: Cosmos DB deployed with all 10 containers via Private Endpoint.
Exit: Cosmos DB accessible from VNet; all containers created; publicNetworkAccess disabled."

create_milestone \
  "Phase 4: Compute IaC & Deployment" \
  "Goal: App Service with VNet integration, Easy Auth, Cosmos DB connectivity.
Exit: App Service reachable via HTTPS; GitHub OAuth works; API routes query Cosmos DB."

create_milestone \
  "Phase 5: Auth & Authorization" \
  "Goal: GitHub OAuth end-to-end. Role-based middleware on all routes.
Exit: Login redirects to GitHub; API routes enforce 401/403 by role."

create_milestone \
  "Phase 6: Core API — Hackathon & Teams" \
  "Goal: CRUD for hackathons, team shuffle, hacker onboarding via event code.
Exit: Create hackathon → generate code → hackers join → auto-assigned to teams."

create_milestone \
  "Phase 7: Scoring Engine & Submissions" \
  "Goal: Rubric system, submission workflow, approval queue with audit trail.
Exit: Activate rubric → submit → appears in queue → approve → score recorded."

create_milestone \
  "Phase 8: Leaderboard & Live Updates" \
  "Goal: SSR leaderboard with auto-refresh, grade badges, award badges.
Exit: Leaderboard shows ranked teams; auto-refreshes; expandable rows work."

create_milestone \
  "Phase 9: Challenge Progression & Gating" \
  "Goal: Sequential challenge unlocking on approval.
Exit: Locked challenges return 403; approval of N auto-unlocks N+1."

create_milestone \
  "Phase 10: Admin & Operational Features" \
  "Goal: Role management UI, audit trail viewer, lifecycle management.
Exit: Admin can invite coaches, view audit log, manage hackathon states."

create_milestone \
  "Phase 11: CI/CD Pipeline" \
  "Goal: GitHub Actions for build, test, Bicep what-if, and deploy.
Exit: Push to main triggers build+test+deploy to dev; manual approval for prod."

create_milestone \
  "Phase 12: Production Hardening" \
  "Goal: Final compliance sweep and security hardening.
Exit: All Bicep cross-referenced against governance constraints; what-if passes clean."

echo ""
echo "=== Done. ==="
