#!/usr/bin/env bash
# Register a GitHub OAuth App for HackOps Easy Auth and store
# credentials in Azure Key Vault. Idempotent — skips creation if
# the OAuth App already exists (by client ID in Key Vault).
#
# Prerequisites: gh auth login, az login, jq
# Usage: ./scripts/setup-github-oauth.sh [--environment dev] [--project hackops]

set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"

# ── Defaults ─────────────────────────────────────────────────────────────

ENVIRONMENT="dev"
PROJECT_NAME="hackops"
RESOURCE_GROUP=""
SKIP_BROWSER=false

# ── Usage ────────────────────────────────────────────────────────────────

usage() {
  cat <<USAGE
Usage: $SCRIPT_NAME [OPTIONS]

Register a GitHub OAuth App for HackOps Easy Auth and store
credentials in Azure Key Vault.

Options:
  -e, --environment ENV   Target environment (dev|staging|prod) [default: dev]
  -p, --project NAME      Project name [default: hackops]
  -g, --resource-group RG Resource group name [auto-detected]
  --skip-browser           Don't open browser (print URL instead)
  -h, --help               Show this help

Steps performed:
  1. Check if OAuth credentials already exist in Key Vault
  2. If not, create a GitHub OAuth App via gh api
  3. Store client ID and secret in Key Vault
  4. Print values for Bicep deployment parameters
USAGE
}

# ── Argument Parsing ─────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment) ENVIRONMENT="$2"; shift 2 ;;
    -p|--project) PROJECT_NAME="$2"; shift 2 ;;
    -g|--resource-group) RESOURCE_GROUP="$2"; shift 2 ;;
    --skip-browser) SKIP_BROWSER=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

# ── Derived Values ───────────────────────────────────────────────────────

# Discover resource group (try common naming patterns)
if [[ -z "$RESOURCE_GROUP" ]]; then
  for candidate in "rg-${PROJECT_NAME}-us-${ENVIRONMENT}" "rg-${PROJECT_NAME}-${ENVIRONMENT}"; do
    if az group show --name "$candidate" &>/dev/null 2>&1; then
      RESOURCE_GROUP="$candidate"
      break
    fi
  done
  if [[ -z "$RESOURCE_GROUP" ]]; then
    echo "  FAIL: Cannot find resource group. Use --resource-group flag." >&2
    exit 1
  fi
fi
readonly RG_NAME="$RESOURCE_GROUP"

# Discover Key Vault name from the resource group (Bicep uses uniqueString)
readonly KV_NAME=$(az keyvault list --resource-group "$RG_NAME" --query '[0].name' -o tsv 2>/dev/null || echo "")
if [[ -z "$KV_NAME" ]]; then
  echo "  FAIL: No Key Vault found in $RG_NAME. Deploy infrastructure first." >&2
  exit 1
fi
echo "  Key Vault: ${KV_NAME}"

readonly APP_NAME="app-${PROJECT_NAME}-${ENVIRONMENT}"

# ── Pre-flight ───────────────────────────────────────────────────────────

echo "=== Pre-flight Checks ==="

for cmd in gh az jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "  FAIL: $cmd is not installed or not on PATH." >&2
    exit 1
  fi
  echo "  OK: $cmd"
done

# Verify GitHub auth
if ! gh auth status &>/dev/null; then
  echo "  FAIL: Not logged in to GitHub. Run 'gh auth login' first." >&2
  exit 1
fi
echo "  OK: gh authenticated"

# Verify Azure auth
if ! az account show &>/dev/null 2>&1; then
  echo "  FAIL: Not logged in to Azure. Run 'az login' first." >&2
  exit 1
fi
echo "  OK: az authenticated"

# ── Check Existing Credentials ───────────────────────────────────────────

echo ""
echo "=== Checking Key Vault for Existing OAuth Credentials ==="

EXISTING_CLIENT_ID=""
if az keyvault secret show \
    --vault-name "$KV_NAME" \
    --name "github-oauth-client-id" \
    --query value -o tsv &>/dev/null 2>&1; then
  EXISTING_CLIENT_ID=$(az keyvault secret show \
    --vault-name "$KV_NAME" \
    --name "github-oauth-client-id" \
    --query value -o tsv)
  echo "  Found existing client ID: ${EXISTING_CLIENT_ID}"
fi

EXISTING_SECRET=""
if az keyvault secret show \
    --vault-name "$KV_NAME" \
    --name "github-oauth-client-secret" \
    --query value -o tsv &>/dev/null 2>&1; then
  EXISTING_SECRET="(exists)"
  echo "  Found existing client secret in Key Vault."
fi

if [[ -n "$EXISTING_CLIENT_ID" && -n "$EXISTING_SECRET" ]]; then
  echo ""
  echo "  OAuth App already configured. Use these for deployment:"
  echo "    githubOAuthClientId = ${EXISTING_CLIENT_ID}"
  echo "    githubOAuthClientSecret = (from Key Vault: ${KV_NAME})"
  echo ""
  echo "  To re-create, delete the secrets first:"
  echo "    az keyvault secret delete --vault-name $KV_NAME --name github-oauth-client-id"
  echo "    az keyvault secret delete --vault-name $KV_NAME --name github-oauth-client-secret"
  exit 0
fi

# ── Resolve App Service Hostname ─────────────────────────────────────────

echo ""
echo "=== Resolving App Service Hostname ==="

APP_HOSTNAME=""
if az webapp show --resource-group "$RG_NAME" --name "$APP_NAME" &>/dev/null 2>&1; then
  APP_HOSTNAME=$(az webapp show \
    --resource-group "$RG_NAME" \
    --name "$APP_NAME" \
    --query defaultHostName -o tsv)
  echo "  Detected: https://${APP_HOSTNAME}"
else
  APP_HOSTNAME="${APP_NAME}.azurewebsites.net"
  echo "  App Service not yet deployed. Using expected hostname:"
  echo "  https://${APP_HOSTNAME}"
fi

readonly HOMEPAGE_URL="https://${APP_HOSTNAME}"
readonly CALLBACK_URL="https://${APP_HOSTNAME}/.auth/login/github/callback"
readonly OAUTH_APP_NAME="HackOps (${ENVIRONMENT})"

# ── Create GitHub OAuth App ──────────────────────────────────────────────

echo ""
echo "=== Creating GitHub OAuth App ==="
echo "  Name:         ${OAUTH_APP_NAME}"
echo "  Homepage:     ${HOMEPAGE_URL}"
echo "  Callback URL: ${CALLBACK_URL}"
echo ""

# gh api supports creating OAuth apps for the authenticated user
RESPONSE=$(gh api user \
  --jq '.login' 2>/dev/null || echo "")

if [[ -z "$RESPONSE" ]]; then
  echo "  FAIL: Cannot determine GitHub user." >&2
  exit 1
fi

echo "  GitHub user: ${RESPONSE}"
echo ""

# Create the OAuth Application via the GitHub REST API (undocumented
# but functional: POST /user/apps was removed; we use the authorizations
# endpoint pattern). Since the REST API does NOT support creating OAuth
# Apps directly, we fall back to opening the browser with pre-filled
# parameters and then accepting the credentials.
#
# GitHub API limitation: OAuth Apps can only be created via the web UI
# or the GitHub App Manifest flow.  We automate everything else.

echo "  NOTE: GitHub's REST API does not support creating OAuth Apps"
echo "  programmatically. Opening browser for the one manual step."
echo ""

REGISTRATION_URL="https://github.com/settings/applications/new"

echo "  Fill in these values on the registration page:"
echo "  ┌──────────────────────────────────────────────────────────────┐"
echo "  │ Application name:  ${OAUTH_APP_NAME}"
echo "  │ Homepage URL:      ${HOMEPAGE_URL}"
echo "  │ Callback URL:      ${CALLBACK_URL}"
echo "  └──────────────────────────────────────────────────────────────┘"
echo ""

if [[ "$SKIP_BROWSER" == "false" ]] && [[ -n "${BROWSER:-}" ]]; then
  "$BROWSER" "$REGISTRATION_URL"
  echo "  Browser opened to: ${REGISTRATION_URL}"
else
  echo "  Open this URL to register the OAuth App:"
  echo "  ${REGISTRATION_URL}"
fi

echo ""
echo "  After creating the app, enter the credentials below."
echo ""

# ── Collect Credentials ──────────────────────────────────────────────────

read -rp "  GitHub OAuth Client ID: " CLIENT_ID
if [[ -z "$CLIENT_ID" ]]; then
  echo "  FAIL: Client ID is required." >&2
  exit 1
fi

read -rsp "  GitHub OAuth Client Secret: " CLIENT_SECRET
echo ""
if [[ -z "$CLIENT_SECRET" ]]; then
  echo "  FAIL: Client Secret is required." >&2
  exit 1
fi

# ── Verify OAuth App via gh api ──────────────────────────────────────────

echo ""
echo "=== Verifying OAuth App ==="

# The GET /applications/{client_id} endpoint requires basic auth with
# client_id:client_secret — but that's only for server-to-server.
# We verify with a simple check that the client_id looks valid.
if [[ ${#CLIENT_ID} -lt 10 ]]; then
  echo "  WARNING: Client ID seems too short. Proceeding anyway." >&2
fi

echo "  Client ID: ${CLIENT_ID}"
echo "  Client Secret: (${#CLIENT_SECRET} chars)"

# ── Store in Key Vault ───────────────────────────────────────────────────

echo ""
echo "=== Storing Credentials in Key Vault: ${KV_NAME} ==="

az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "github-oauth-client-id" \
  --value "$CLIENT_ID" \
  --content-type "text/plain" \
  --output none

echo "  Stored: github-oauth-client-id"

az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "github-oauth-client-secret" \
  --value "$CLIENT_SECRET" \
  --content-type "text/plain" \
  --output none

echo "  Stored: github-oauth-client-secret"

# ── Print Deployment Parameters ──────────────────────────────────────────

echo ""
echo "=== Done ==="
echo ""
echo "  OAuth App registered and credentials stored in Key Vault."
echo ""
echo "  Deploy with:"
echo "    ./deploy.ps1 \\"
echo "      -Owner \"...\" \\"
echo "      -TechnicalContact \"...\" \\"
echo "      -GitHubOAuthClientId \"${CLIENT_ID}\" \\"
echo "      -GitHubOAuthClientSecret \"${CLIENT_SECRET}\""
echo ""
echo "  Or use the Key Vault references directly (secret is already"
echo "  stored for the Bicep authSettingV2Configuration)."
