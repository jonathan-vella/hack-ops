# First-Deploy Migration Runbook

> Supervised first-deploy process for containerizing HackOps with ACR.
> This is a one-time migration from zip deploy to container deploy.

## Prerequisites

- Azure CLI authenticated with sufficient permissions
- GitHub environments configured with OIDC secrets
- Resource group already exists (e.g., `rg-hackops-us-dev`)

## Steps

### 0. Delete existing App Service and Deployment Stack

The existing App Service runs on `NODE|22-lts` (zip deploy).
Redeploying Bicep alone cannot change it to container mode
because the AVM module detects the existing runtime kind.
Delete the old resources so Bicep creates a fresh container-based
App Service.

```bash
# 0a. Delete the Deployment Stack (detaches resources, does not delete them)
az stack group delete \
  --name "stack-hackops-dev" \
  --resource-group "rg-hackops-us-dev" \
  --action-on-unmanage detachAll \
  --yes

# 0b. Delete the staging slot first
az webapp deployment slot delete \
  --resource-group "rg-hackops-us-dev" \
  --name "app-hackops-dev" \
  --slot staging

# 0c. Delete the App Service
az webapp delete \
  --resource-group "rg-hackops-us-dev" \
  --name "app-hackops-dev"

# 0d. Delete the App Service Plan
az appservice plan delete \
  --resource-group "rg-hackops-us-dev" \
  --name "asp-hackops-dev" \
  --yes
```

> **Note**: Azure SQL Database, Key Vault, VNet, and monitoring resources
> are kept — only compute is recreated. Orphaned RBAC assignments
> referencing old managed identity principal IDs are harmless and
> will be overwritten by the new deployment.

### 1. Deploy Bicep with bootstrap image tag

The first deployment creates all infrastructure including ACR, App Service
(with container config), role assignments, and networking. The default
`imageTag` parameter (`latest`) is used as a placeholder — there is no
image in ACR yet, so App Service will fail to pull initially. This is expected.

The deployment also writes the GitHub OAuth client ID and client secret into
Key Vault through the ARM management plane. Do not temporarily open Key Vault
network access just to create these secrets.

```bash
az deployment group create \
  --resource-group "rg-hackops-us-dev" \
  --template-file infra/bicep/hackops/main.bicep \
  --parameters environment=dev projectName=hackops \
    owner="<owner>" technicalContact="<email>" alertEmail="<email>" \
    githubOAuthClientId="<client-id>" githubOAuthClientSecret="<secret>" \
  --mode Incremental
```

Capture outputs:

```bash
ACR_NAME=$(az deployment group show \
  --resource-group "rg-hackops-us-dev" \
  --name "<deployment-name>" \
  --query properties.outputs.acrName.value -o tsv)

ACR_LOGIN_SERVER=$(az deployment group show \
  --resource-group "rg-hackops-us-dev" \
  --name "<deployment-name>" \
  --query properties.outputs.acrLoginServer.value -o tsv)

echo "ACR: $ACR_NAME ($ACR_LOGIN_SERVER)"
```

### 2. Wait for role assignments to propagate

Azure RBAC assignments (AcrPull for App Service MI, SQL DB Contributor,
Key Vault Secrets User) take approximately 1–2 minutes to propagate.

```bash
echo "Waiting 2 minutes for RBAC propagation..."
sleep 120
```

### 3. Build and push the first image via ACR Build

Use `az acr build` to build the image server-side on ACR's
infrastructure. No Docker installation needed — runs directly
from the devcontainer or any machine with Azure CLI.

```bash
az acr build \
  --registry "$ACR_NAME" \
  --image "hackops:first-deploy" \
  --file apps/web/Dockerfile \
  .
```

This uploads the build context, builds the image on ACR, and
stores it in the registry. Verify the image exists:

```bash
az acr repository show-tags --name "$ACR_NAME" --repository hackops -o table
```

### 4. Redeploy Bicep with the real image tag

```bash
az deployment group create \
  --resource-group "rg-hackops-us-dev" \
  --template-file infra/bicep/hackops/main.bicep \
  --parameters environment=dev projectName=hackops \
    imageTag=first-deploy \
    owner="<owner>" technicalContact="<email>" alertEmail="<email>" \
    githubOAuthClientId="<client-id>" githubOAuthClientSecret="<secret>" \
  --mode Incremental
```

### 5. Verify container pulls and starts

```bash
# Check App Service logs for container start
az webapp log tail \
  --resource-group "rg-hackops-us-dev" \
  --name "app-hackops-dev" \
  --provider docker

# Health check
curl -s "https://app-hackops-dev.azurewebsites.net/api/health" | jq .
```

Expected: `200 OK` with `status: "ok"` (or `"warming"` within first 60s).

### 6. Configure GitHub environment variables

Add these to each GitHub environment (dev, prod):

| Variable                 | Example Value                   |
| ------------------------ | ------------------------------- |
| `AZURE_ACR_NAME`         | `crhackopsdev123abc`            |
| `AZURE_ACR_LOGIN_SERVER` | `crhackopsdev123abc.azurecr.io` |

Also grant `AcrPush` to the GitHub OIDC identity so CI/CD can
push images:

```bash
OIDC_CLIENT_ID="<github-oidc-app-registration-client-id>"
OIDC_SP_OBJECT_ID=$(az ad sp show --id "$OIDC_CLIENT_ID" --query id -o tsv)

az role assignment create \
  --assignee-object-id "$OIDC_SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "AcrPush" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-hackops-us-dev/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME"
```

### 7. Enable automated CI/CD

After the first successful deploy, subsequent pushes to `main` will
automatically:

1. Build container image in CI
2. Scan with Trivy (fail on CRITICAL/HIGH)
3. Push to ACR with SHA tag
4. Deploy Bicep with `imageTag=<sha>`
5. Swap staging → production
6. Verify health (auto-rollback on failure)

### 8. Set up ACR purge (optional)

```bash
./scripts/setup-acr-purge.sh "$ACR_NAME"
```

## Rollback

If the first deploy fails after the swap, manually swap back:

```bash
az webapp deployment slot swap \
  --resource-group "rg-hackops-us-dev" \
  --name "app-hackops-dev" \
  --slot staging \
  --target-slot production
```

## Troubleshooting

| Symptom                          | Cause                               | Fix                                           |
| -------------------------------- | ----------------------------------- | --------------------------------------------- |
| `401 Unauthorized` pulling image | AcrPull role not yet propagated     | Wait 2 min, restart App Service               |
| Container starts but 503         | SQL Database connection failing     | Check VNet integration, SQL Database RBAC     |
| `ImagePullBackOff`               | Wrong ACR login server or image tag | Verify `linuxFxVersion` in App Service config |
| Health check returns warming     | Normal — first 60s after start      | Wait and retry                                |
