#!/usr/bin/env bash
# -----------------------------------------------------------------------
# setup-github-environments.sh — Bootstrap GitHub environment secrets
# and variables for the HackOps deploy pipeline.
#
# Reads deployment outputs from an existing Azure resource group to
# auto-populate ACR and App Service values. OIDC credentials and
# OAuth secrets must be supplied as arguments or environment variables.
#
# Prerequisites:
#   - gh CLI authenticated with repo admin access
#   - az CLI authenticated with Reader on the target resource group
#   - Bicep deployment already completed (Step 1 of first-deploy-runbook)
#
# Usage:
#   ./scripts/setup-github-environments.sh --env dev \
#     --resource-group rg-hackops-us-dev \
#     --client-id <OIDC-client-id> \
#     --tenant-id <Azure-AD-tenant-id> \
#     --subscription-id <subscription-id> \
#     --oauth-client-id <GitHub-OAuth-client-id> \
#     --oauth-client-secret <GitHub-OAuth-client-secret> \
#     --owner "Jonathan Vella" \
#     --technical-contact "jv@example.com" \
#     --admin-github-ids "12345,67890"
# -----------------------------------------------------------------------
set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly REPO="jonathan-vella/hack-ops"

usage() {
  cat <<USAGE
Usage: $SCRIPT_NAME --env <dev|production> --resource-group <rg> [options]

Required:
  --env                  GitHub environment name (dev or production)
  --resource-group       Azure resource group (e.g. rg-hackops-us-dev)
  --client-id            Azure AD app registration client ID (OIDC)
  --tenant-id            Azure AD tenant ID
  --subscription-id      Azure subscription ID
  --oauth-client-id      GitHub OAuth App client ID
  --oauth-client-secret  GitHub OAuth App client secret
  --owner                Resource owner tag value
  --technical-contact    Technical contact email tag value
  --admin-github-ids     Comma-separated GitHub user IDs for admin auto-assign

Optional:
  --deployment-name      Bicep deployment name (default: auto-detect latest)
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
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

# Validate required parameters
missing=()
[[ -z "$ENV_NAME" ]] && missing+=("--env")
[[ -z "$RESOURCE_GROUP" ]] && missing+=("--resource-group")
[[ -z "$CLIENT_ID" ]] && missing+=("--client-id")
[[ -z "$TENANT_ID" ]] && missing+=("--tenant-id")
[[ -z "$SUBSCRIPTION_ID" ]] && missing+=("--subscription-id")
[[ -z "$OAUTH_CLIENT_ID" ]] && missing+=("--oauth-client-id")
[[ -z "$OAUTH_CLIENT_SECRET" ]] && missing+=("--oauth-client-secret")
[[ -z "$OWNER" ]] && missing+=("--owner")
[[ -z "$TECHNICAL_CONTACT" ]] && missing+=("--technical-contact")
[[ -z "$ADMIN_GITHUB_IDS" ]] && missing+=("--admin-github-ids")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Error: Missing required parameters: ${missing[*]}"
  echo ""
  usage
fi

if [[ "$ENV_NAME" != "dev" && "$ENV_NAME" != "production" ]]; then
  echo "Error: --env must be 'dev' or 'production'"
  exit 1
fi

# Verify CLI tools are available
for cmd in gh az jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not found on PATH"
    exit 1
  fi
done

echo "=== Setting up GitHub environment: $ENV_NAME ==="
echo "    Resource group: $RESOURCE_GROUP"
echo ""

# Auto-detect latest deployment if not specified
if [[ -z "$DEPLOYMENT_NAME" ]]; then
  echo "Auto-detecting latest Bicep deployment..."
  DEPLOYMENT_NAME=$(az deployment group list \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?properties.provisioningState=='Succeeded'] | sort_by(@, &properties.timestamp) | [-1].name" \
    -o tsv 2>/dev/null)

  if [[ -z "$DEPLOYMENT_NAME" || "$DEPLOYMENT_NAME" == "None" ]]; then
    echo "Error: No successful deployment found in $RESOURCE_GROUP"
    echo "Run the Bicep deployment first (see docs/first-deploy-runbook.md Step 1)"
    exit 1
  fi
  echo "  Found deployment: $DEPLOYMENT_NAME"
fi

# Read Bicep deployment outputs
echo "Reading deployment outputs..."
OUTPUTS=$(az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DEPLOYMENT_NAME" \
  --query properties.outputs \
  -o json)

ACR_NAME=$(echo "$OUTPUTS" | jq -r '.acrName.value // empty')
ACR_LOGIN_SERVER=$(echo "$OUTPUTS" | jq -r '.acrLoginServer.value // empty')
WEBAPP_NAME=$(echo "$OUTPUTS" | jq -r '.appServiceName.value // empty')

if [[ -z "$ACR_NAME" || -z "$ACR_LOGIN_SERVER" ]]; then
  echo "Error: Could not read ACR outputs from deployment $DEPLOYMENT_NAME"
  echo "Outputs found: $(echo "$OUTPUTS" | jq -r 'keys[]')"
  exit 1
fi

if [[ -z "$WEBAPP_NAME" ]]; then
  echo "Warning: appServiceName not in deployment outputs — inferring from convention"
  if [[ "$ENV_NAME" == "dev" ]]; then
    WEBAPP_NAME="app-hackops-dev"
  else
    WEBAPP_NAME="app-hackops-prod"
  fi
  echo "  Using: $WEBAPP_NAME"
fi

echo "  ACR Name:         $ACR_NAME"
echo "  ACR Login Server: $ACR_LOGIN_SERVER"
echo "  Web App Name:     $WEBAPP_NAME"
echo "  Resource Group:   $RESOURCE_GROUP"
echo ""

# Set GitHub environment secrets (OIDC + OAuth)
echo "Setting GitHub environment secrets..."
gh secret set AZURE_CLIENT_ID --repo "$REPO" --env "$ENV_NAME" --body "$CLIENT_ID"
echo "  AZURE_CLIENT_ID"

gh secret set AZURE_TENANT_ID --repo "$REPO" --env "$ENV_NAME" --body "$TENANT_ID"
echo "  AZURE_TENANT_ID"

gh secret set AZURE_SUBSCRIPTION_ID --repo "$REPO" --env "$ENV_NAME" --body "$SUBSCRIPTION_ID"
echo "  AZURE_SUBSCRIPTION_ID"

gh secret set GITHUB_OAUTH_CLIENT_ID --repo "$REPO" --env "$ENV_NAME" --body "$OAUTH_CLIENT_ID"
echo "  GITHUB_OAUTH_CLIENT_ID"

gh secret set GITHUB_OAUTH_CLIENT_SECRET --repo "$REPO" --env "$ENV_NAME" --body "$OAUTH_CLIENT_SECRET"
echo "  GITHUB_OAUTH_CLIENT_SECRET"

echo ""

# Set GitHub environment variables (from Bicep outputs + user input)
echo "Setting GitHub environment variables..."
gh variable set AZURE_ACR_NAME --repo "$REPO" --env "$ENV_NAME" --body "$ACR_NAME"
echo "  AZURE_ACR_NAME=$ACR_NAME"

gh variable set AZURE_ACR_LOGIN_SERVER --repo "$REPO" --env "$ENV_NAME" --body "$ACR_LOGIN_SERVER"
echo "  AZURE_ACR_LOGIN_SERVER=$ACR_LOGIN_SERVER"

gh variable set AZURE_RESOURCE_GROUP --repo "$REPO" --env "$ENV_NAME" --body "$RESOURCE_GROUP"
echo "  AZURE_RESOURCE_GROUP=$RESOURCE_GROUP"

gh variable set AZURE_WEBAPP_NAME --repo "$REPO" --env "$ENV_NAME" --body "$WEBAPP_NAME"
echo "  AZURE_WEBAPP_NAME=$WEBAPP_NAME"

gh variable set AZURE_OWNER --repo "$REPO" --env "$ENV_NAME" --body "$OWNER"
echo "  AZURE_OWNER=$OWNER"

gh variable set AZURE_TECHNICAL_CONTACT --repo "$REPO" --env "$ENV_NAME" --body "$TECHNICAL_CONTACT"
echo "  AZURE_TECHNICAL_CONTACT=$TECHNICAL_CONTACT"

gh variable set ADMIN_GITHUB_IDS --repo "$REPO" --env "$ENV_NAME" --body "$ADMIN_GITHUB_IDS"
echo "  ADMIN_GITHUB_IDS=$ADMIN_GITHUB_IDS"

echo ""
echo "=== Done ==="
echo ""
echo "Verify with:"
echo "  gh secret list --repo $REPO --env $ENV_NAME"
echo "  gh variable list --repo $REPO --env $ENV_NAME"
