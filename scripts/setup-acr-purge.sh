#!/usr/bin/env bash
# -----------------------------------------------------------------------
# setup-acr-purge.sh — Create a weekly ACR purge task
# Removes SHA-tagged images older than 30 days, keeps last 10.
# -----------------------------------------------------------------------
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <acr-name>"
  echo "  e.g. $0 crhackopsdev123abc"
  exit 1
fi

ACR_NAME="$1"

echo "Creating weekly purge task on ACR: ${ACR_NAME}"

az acr task create \
  --name purge-old-images \
  --registry "${ACR_NAME}" \
  --cmd "acr purge --filter 'hackops:.*' --ago 30d --keep 10 --untagged" \
  --schedule "0 0 * * 0" \
  --context /dev/null

echo "ACR purge task created. Runs every Sunday at midnight UTC."
echo "Verify with: az acr task list --registry ${ACR_NAME} -o table"
