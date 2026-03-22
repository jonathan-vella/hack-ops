#!/usr/bin/env bash
# -----------------------------------------------------------------------
# setup-github-environments.sh — Bootstrap GitHub environment secrets
# and variables for the HackOps deploy pipeline.
#
# Auto-detects almost everything from Azure CLI context:
#   - tenant-id, subscription-id from `az account show`
#   - OIDC client-id from app registration named "hackops-cicd-deployer"
#   - resource group from `rg-hackops-*` naming convention
#   - owner, technical-contact from resource group tags
#   - ACR name/server, App Service name from Bicep deployment outputs
#   - admin GitHub user ID from `gh api user`
#
# Only OAuth secrets must be provided (Key Vault is network-locked).
#
# Prerequisites:
#   - gh CLI authenticated with repo admin access
#   - az CLI authenticated (Reader on RG, Directory.Read for app reg)
#   - Bicep deployment already completed (Step 1 of first-deploy-runbook)
#
# Usage:
#   ./scripts/setup-github-environments.sh dev \
#     --oauth-client-id <id> --oauth-client-secret <secret>
#
#   # Override any auto-detected value:
#   ./scripts/setup-github-environments.sh dev \
#     --oauth-client-id <id> --oauth-client-secret <secret> \
#     --resource-group rg-hackops-custom --admin-github-ids "123,456"
# -----------------------------------------------------------------------
set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly REPO="jonathan-vella/hack-ops"

usage() {
  cat <<USAGE
Usage: $SCRIPT_NAME <dev|production> --oauth-client-id <id> --oauth-client-secret <secret> [overrides]

Positional:
  <env>                  GitHub environment name (dev or production)

Required (cannot be auto-detected — Key Vault is network-locked):
  --oauth-client-id      GitHub OAuth App client ID
  --oauth-client-secret  GitHub OAuth App client secret

Optional overrides (auto-detected if omitted):
  --resource-group       Azure resource group (auto: rg-hackops-*-<env>)
  --client-id            OIDC app registration client ID (auto: hackops-cicd-deployer)
  --tenant-id            Azure AD tenant ID (auto: az account show)
  --subscription-id      Azure subscription ID (auto: az account show)
  --owner                Resource owner tag (auto: RG tag 'owner')
  --technical-contact    Technical contact email (auto: RG tag 'technical-contact')
  --admin-github-ids     GitHub user IDs (auto: current gh user)
  --deployment-name      Bicep deployment name (auto: latest successful)
  --dry-run              Show what would be set without writing
  -h, --help             Show this help message
USAGE
  exit 1
}

ENV_NAME=""
RESOURCE_GROUP=""
CLIENT_ID=""
TENANT_ID=""
SUBSCRIPTION_ID=""
OAUTH_CLIENT_ID=""
OAUTH_CLIENT_SECRET=""
OWNER=""
TECHNICAL_CONTACT=""
ADMIN_GITHUB_IDS=""
DEPLOYMENT_NAME=""
DRY_RUN=false

# First positional arg is environment name
if [[ $# -gt 0 && ! "$1" =~ ^-- ]]; then
  ENV_NAME="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV_NAME="$2"; shift 2 ;;
    --resource-group) RESOURCE_GROUP="$2"; shift 2 ;;
    --client-id) CLIENT_ID="$2"; shift 2 ;;
    --tenant-id) TENANT_ID="$2"; shift 2 ;;
    --subscription-id) SUBSCRIPTION_ID="$2"; shift 2 ;;
    --oauth-client-id) OAUTH_CLIENT_ID="$2"; shift 2 ;;
    --oauth-client-secret) OAUTH_CLIENT_SECRET="$2"; shift 2 ;;
    --owner) OWNER="$2"; shift 2 ;;
    --technical-contact) TECHNICAL_CONTACT="$2"; shift 2 ;;
    --admin-github-ids) ADMIN_GITHUB_IDS="$2"; shift 2 ;;
    --deployment-name) DEPLOYMENT_NAME="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$ENV_NAME" ]]; then
  echo "Error: environment name required as first argument"
  usage
fi

if [[ "$ENV_NAME" != "dev" && "$ENV_NAME" != "production" ]]; then
  echo "Error: environment must be 'dev' or 'production'"
  exit 1
fi

# Verify CLI tools
for cmd in gh az jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not found on PATH"
    exit 1
  fi
done

echo "=== Bootstrapping GitHub environment: $ENV_NAME ==="
echo ""

# ── Auto-detect from Azure CLI context ──────────────────────────────
echo "[1/7] Azure account..."
if [[ -z "$TENANT_ID" ]]; then
  TENANT_ID=$(az account show --query tenantId -o tsv)
  echo "  tenant-id:       $TENANT_ID (from az account)"
else
  echo "  tenant-id:       $TENANT_ID (override)"
fi

if [[ -z "$SUBSCRIPTION_ID" ]]; then
  SUBSCRIPTION_ID=$(az account show --query id -o tsv)
  echo "  subscription-id: $SUBSCRIPTION_ID (from az account)"
else
  echo "  subscription-id: $SUBSCRIPTION_ID (override)"
fi

# ── Auto-detect OIDC app registration ───────────────────────────────
echo "[2/7] OIDC app registration..."
if [[ -z "$CLIENT_ID" ]]; then
  CLIENT_ID=$(az ad app list --display-name hackops-cicd-deployer \
    --query "[0].appId" -o tsv 2>/dev/null || true)
  if [[ -z "$CLIENT_ID" || "$CLIENT_ID" == "None" ]]; then
    echo "  Error: Could not find app registration 'hackops-cicd-deployer'"
    echo "  Provide --client-id manually"
    exit 1
  fi
  echo "  client-id:       $CLIENT_ID (from app registration)"
else
  echo "  client-id:       $CLIENT_ID (override)"
fi

# ── Auto-detect resource group ──────────────────────────────────────
echo "[3/7] Resource group..."
if [[ -z "$RESOURCE_GROUP" ]]; then
  ENV_SHORT="dev"
  [[ "$ENV_NAME" == "production" ]] && ENV_SHORT="prod"
  RESOURCE_GROUP=$(az group list \
    --query "[?starts_with(name, 'rg-hackops') && tags.environment=='${ENV_SHORT}'].name | [0]" \
    -o tsv 2>/dev/null || true)
  if [[ -z "$RESOURCE_GROUP" || "$RESOURCE_GROUP" == "None" ]]; then
    echo "  Error: No resource group found with tag environment=$ENV_SHORT"
    echo "  Provide --resource-group manually"
    exit 1
  fi
  echo "  resource-group:  $RESOURCE_GROUP (auto-detected)"
else
  echo "  resource-group:  $RESOURCE_GROUP (override)"
fi

# ── Auto-detect owner and technical-contact from RG tags ────────────
echo "[4/7] Resource group tags..."
RG_TAGS=$(az group show --name "$RESOURCE_GROUP" --query tags -o json 2>/dev/null || echo "{}")

if [[ -z "$OWNER" ]]; then
  OWNER=$(echo "$RG_TAGS" | jq -r '.owner // empty')
  if [[ -n "$OWNER" ]]; then
    echo "  owner:           $OWNER (from RG tag)"
  else
    echo "  Warning: No 'owner' tag on $RESOURCE_GROUP — provide --owner"
    exit 1
  fi
else
  echo "  owner:           $OWNER (override)"
fi

if [[ -z "$TECHNICAL_CONTACT" ]]; then
  TECHNICAL_CONTACT=$(echo "$RG_TAGS" | jq -r '."technical-contact" // empty')
  if [[ -n "$TECHNICAL_CONTACT" ]]; then
    echo "  technical-contact: $TECHNICAL_CONTACT (from RG tag)"
  else
    echo "  Warning: No 'technical-contact' tag — provide --technical-contact"
    exit 1
  fi
else
  echo "  technical-contact: $TECHNICAL_CONTACT (override)"
fi

# ── Auto-detect admin GitHub user ID ────────────────────────────────
echo "[5/7] GitHub user..."
if [[ -z "$ADMIN_GITHUB_IDS" ]]; then
  ADMIN_GITHUB_IDS=$(gh api user --jq '.id' 2>/dev/null || true)
  if [[ -n "$ADMIN_GITHUB_IDS" ]]; then
    GH_LOGIN=$(gh api user --jq '.login' 2>/dev/null || echo "unknown")
    echo "  admin-github-ids: $ADMIN_GITHUB_IDS ($GH_LOGIN, from gh auth)"
  else
    echo "  Error: Could not detect GitHub user ID — provide --admin-github-ids"
    exit 1
  fi
else
  echo "  admin-github-ids: $ADMIN_GITHUB_IDS (override)"
fi

# ── Auto-detect Bicep deployment outputs ────────────────────────────
echo "[6/7] Bicep deployment outputs..."
if [[ -z "$DEPLOYMENT_NAME" ]]; then
  DEPLOYMENT_NAME=$(az deployment group list \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?properties.provisioningState=='Succeeded'] | sort_by(@, &properties.timestamp) | [-1].name" \
    -o tsv 2>/dev/null)
  if [[ -z "$DEPLOYMENT_NAME" || "$DEPLOYMENT_NAME" == "None" ]]; then
    echo "  Error: No successful deployment in $RESOURCE_GROUP"
    echo "  Run Bicep deployment first (docs/first-deploy-runbook.md Step 1)"
    exit 1
  fi
  echo "  deployment:      $DEPLOYMENT_NAME (latest successful)"
else
  echo "  deployment:      $DEPLOYMENT_NAME (override)"
fi

OUTPUTS=$(az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DEPLOYMENT_NAME" \
  --query properties.outputs -o json)

ACR_NAME=$(echo "$OUTPUTS" | jq -r '.acrName.value // empty')
ACR_LOGIN_SERVER=$(echo "$OUTPUTS" | jq -r '.acrLoginServer.value // empty')
WEBAPP_NAME=$(echo "$OUTPUTS" | jq -r '.appServiceName.value // empty')

if [[ -z "$ACR_NAME" || -z "$ACR_LOGIN_SERVER" ]]; then
  echo "  Error: ACR outputs missing from deployment $DEPLOYMENT_NAME"
  exit 1
fi
echo "  acr-name:        $ACR_NAME"
echo "  acr-login:       $ACR_LOGIN_SERVER"

if [[ -z "$WEBAPP_NAME" ]]; then
  WEBAPP_NAME="app-hackops-${ENV_SHORT:-dev}"
  echo "  webapp-name:     $WEBAPP_NAME (inferred from convention)"
else
  echo "  webapp-name:     $WEBAPP_NAME"
fi

# ── Validate OAuth secrets (only truly manual values) ───────────────
echo "[7/7] OAuth secrets..."
if [[ -z "$OAUTH_CLIENT_ID" || -z "$OAUTH_CLIENT_SECRET" ]]; then
  echo ""
  echo "Error: OAuth secrets cannot be auto-detected (Key Vault is network-locked)."
  echo "Provide: --oauth-client-id <id> --oauth-client-secret <secret>"
  exit 1
fi
echo "  oauth-client-id: (provided)"
echo "  oauth-secret:    (provided)"

# ── Summary ─────────────────────────────────────────────────────────
echo ""
echo "--- Configuration Summary ---"
echo "  Environment:       $ENV_NAME"
echo "  Subscription:      $SUBSCRIPTION_ID"
echo "  Tenant:            $TENANT_ID"
echo "  Resource Group:    $RESOURCE_GROUP"
echo "  OIDC Client ID:    $CLIENT_ID"
echo "  ACR:               $ACR_LOGIN_SERVER"
echo "  Web App:           $WEBAPP_NAME"
echo "  Owner:             $OWNER"
echo "  Contact:           $TECHNICAL_CONTACT"
echo "  Admin GH IDs:      $ADMIN_GITHUB_IDS"
echo ""

if [[ "$DRY_RUN" == true ]]; then
  echo "[DRY RUN] No changes written. Remove --dry-run to apply."
  exit 0
fi

# ── Write secrets ───────────────────────────────────────────────────
echo "Writing secrets..."
gh secret set AZURE_CLIENT_ID --repo "$REPO" --env "$ENV_NAME" --body "$CLIENT_ID"
gh secret set AZURE_TENANT_ID --repo "$REPO" --env "$ENV_NAME" --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID --repo "$REPO" --env "$ENV_NAME" --body "$SUBSCRIPTION_ID"
gh secret set OAUTH_CLIENT_ID --repo "$REPO" --env "$ENV_NAME" --body "$OAUTH_CLIENT_ID"
gh secret set OAUTH_CLIENT_SECRET --repo "$REPO" --env "$ENV_NAME" --body "$OAUTH_CLIENT_SECRET"
echo "  5 secrets written"

# ── Write variables ─────────────────────────────────────────────────
echo "Writing variables..."
gh variable set AZURE_ACR_NAME --repo "$REPO" --env "$ENV_NAME" --body "$ACR_NAME"
gh variable set AZURE_ACR_LOGIN_SERVER --repo "$REPO" --env "$ENV_NAME" --body "$ACR_LOGIN_SERVER"
gh variable set AZURE_RESOURCE_GROUP --repo "$REPO" --env "$ENV_NAME" --body "$RESOURCE_GROUP"
gh variable set AZURE_WEBAPP_NAME --repo "$REPO" --env "$ENV_NAME" --body "$WEBAPP_NAME"
gh variable set AZURE_OWNER --repo "$REPO" --env "$ENV_NAME" --body "$OWNER"
gh variable set AZURE_TECHNICAL_CONTACT --repo "$REPO" --env "$ENV_NAME" --body "$TECHNICAL_CONTACT"
gh variable set AZURE_ALERT_EMAIL --repo "$REPO" --env "$ENV_NAME" --body "$TECHNICAL_CONTACT"
gh variable set ADMIN_GITHUB_IDS --repo "$REPO" --env "$ENV_NAME" --body "$ADMIN_GITHUB_IDS"
echo "  8 variables written"

# ── Assign Azure RBAC roles to deployer identity ───────────────────
echo "Assigning RBAC roles to deployer identity..."
RG_SCOPE="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}"

az role assignment create \
  --assignee "$CLIENT_ID" \
  --role "Contributor" \
  --scope "$RG_SCOPE" \
  --only-show-errors || echo "  Contributor: already assigned or insufficient permission"

az role assignment create \
  --assignee "$CLIENT_ID" \
  --role "User Access Administrator" \
  --scope "$RG_SCOPE" \
  --only-show-errors || echo "  User Access Administrator: already assigned or insufficient permission"

ACR_SCOPE="${RG_SCOPE}/providers/Microsoft.ContainerRegistry/registries/${ACR_NAME}"
az role assignment create \
  --assignee "$CLIENT_ID" \
  --role "AcrPush" \
  --scope "$ACR_SCOPE" \
  --only-show-errors || echo "  AcrPush: already assigned or insufficient permission"
echo "  3 RBAC roles assigned"

echo ""
echo "=== Done ==="
echo ""
echo "Verify:"
echo "  gh secret list --repo $REPO --env $ENV_NAME"
echo "  gh variable list --repo $REPO --env $ENV_NAME"
