<#
.SYNOPSIS
    Deploys HackOps infrastructure to Azure with phased deployment support.
.DESCRIPTION
    Creates/updates the resource group with governance tags, validates Bicep,
    runs what-if, deploys in phases, and configures Key Vault reference identity
    for UAMI-based secret resolution.
.PARAMETER Phase
    Deployment phase: all (default), foundation, data, compute.
    Cumulative — each phase includes all previous phases.
.PARAMETER Environment
    Target environment (dev, staging, prod). Default: dev.
.PARAMETER Location
    Azure region. Default: swedencentral.
.PARAMETER ResourceGroupName
    Optional resource group name override. Defaults to rg-{project}-{regionCode}-{environment}.
.PARAMETER Owner
    Resource owner tag value. Required.
.PARAMETER TechnicalContact
    Technical contact email. Required.
.PARAMETER AlertEmail
    Alert notification email for Action Group. Required.
.PARAMETER GitHubOAuthClientId
    GitHub OAuth App client ID (from https://github.com/settings/developers).
.PARAMETER GitHubOAuthClientSecret
    GitHub OAuth App client secret. Stored in Key Vault during deployment.
.PARAMETER ImageDigest
    Container image digest (sha256:...). Empty for bootstrap deploy.
.PARAMETER AdminGithubIds
    Comma-separated GitHub user IDs auto-assigned admin on first login.
.PARAMETER AutoApprove
    Skip confirmation prompts for fully automated deployment.
.PARAMETER WhatIf
    Run what-if analysis only — do not deploy.
.EXAMPLE
    ./deploy.ps1 -Owner "jonathan-vella" -TechnicalContact "admin@example.com" -AlertEmail "admin@example.com" -GitHubOAuthClientId "Iv1.abc123"
.EXAMPLE
    ./deploy.ps1 -Phase foundation -Owner "jonathan-vella" -TechnicalContact "admin@example.com" -AlertEmail "admin@example.com" -GitHubOAuthClientId "Iv1.abc123"
.EXAMPLE
    ./deploy.ps1 -ImageDigest "sha256:abc123def456..." -Owner "jonathan-vella" -TechnicalContact "admin@example.com" -AlertEmail "admin@example.com" -GitHubOAuthClientId "Iv1.abc123"
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('all', 'foundation', 'data', 'compute')]
    [string]$Phase = 'all',

    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'dev',

    [string]$Location = 'swedencentral',

    [string]$ResourceGroupName = '',

    [Parameter(Mandatory)]
    [string]$Owner,

    [Parameter(Mandatory)]
    [string]$TechnicalContact,

    [Parameter(Mandatory)]
    [string]$AlertEmail,

    [string]$CostCenter = 'hackops-dev',

    [string]$ProjectName = 'hackops',

    [Parameter(Mandatory)]
    [string]$GitHubOAuthClientId,

    [string]$GitHubOAuthClientSecret = '',

    [string]$ImageDigest = '',

    [string]$AdminGithubIds = '',

    [switch]$AutoApprove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function ConvertTo-PlainText {
    param(
        [Parameter(Mandatory)]
        [Security.SecureString]$SecureValue
    )

    return ([pscredential]::new('ignored', $SecureValue)).GetNetworkCredential().Password
}

function Get-RegionCode {
    param(
        [Parameter(Mandatory)]
        [string]$AzureRegion
    )

    $regionCodes = @{
        'swedencentral' = 'se'
        'germanywestcentral' = 'gwc'
        'northeurope' = 'ne'
    }

    if ($regionCodes.ContainsKey($AzureRegion)) {
        return $regionCodes[$AzureRegion]
    }

    throw "Unsupported Location '$AzureRegion' for resource group naming. Pass -ResourceGroupName explicitly."
}

# When AutoApprove is set, override ShouldProcess to always proceed
if ($AutoApprove) {
    $ConfirmPreference = 'None'
}

# ── Banner ───────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '╔════════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║   HackOps Platform - Azure Deployment          ║' -ForegroundColor Cyan
Write-Host '╚════════════════════════════════════════════════╝' -ForegroundColor Cyan
Write-Host "  Phase:       $Phase"
Write-Host "  Environment: $Environment"
Write-Host "  Location:    $Location"
Write-Host ''

$regionCode = Get-RegionCode -AzureRegion $Location
$rgName = if ($ResourceGroupName) { $ResourceGroupName } else { "rg-$ProjectName-$regionCode-$Environment" }
$deploymentName = "deploy-$ProjectName-$Phase-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$templateFile = Join-Path $PSScriptRoot 'main.bicep'

# ── Pre-flight Checks ───────────────────────────────────────────────────

Write-Host '=== Pre-flight Checks ===' -ForegroundColor Cyan

if (-not (Get-Command 'az' -ErrorAction SilentlyContinue)) {
    throw 'Azure CLI (az) is not installed or not on PATH.'
}

if (-not (Get-Command 'bicep' -ErrorAction SilentlyContinue)) {
    throw 'Bicep CLI is not installed or not on PATH.'
}

$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    throw 'Not logged in to Azure. Run "az login" first.'
}
Write-Host "  Subscription: $($account.name) ($($account.id))" -ForegroundColor Green

# Validate image digest format
if ($ImageDigest -and -not $ImageDigest.StartsWith('sha256:')) {
    throw "ImageDigest must start with 'sha256:'. Got: $ImageDigest"
}

if (-not $GitHubOAuthClientSecret) {
    $secureGitHubOAuthClientSecret = Read-Host -Prompt 'GitHub OAuth client secret' -AsSecureString
    $GitHubOAuthClientSecret = ConvertTo-PlainText -SecureValue $secureGitHubOAuthClientSecret
}

if (-not $GitHubOAuthClientSecret) {
    throw 'GitHubOAuthClientSecret is required.'
}

# ── Validate Bicep ──────────────────────────────────────────────────────

Write-Host "`n=== Bicep Validation ===" -ForegroundColor Cyan

bicep build $templateFile
if ($LASTEXITCODE -ne 0) { throw 'bicep build failed.' }
Write-Host '  bicep build: PASSED' -ForegroundColor Green

bicep lint $templateFile
if ($LASTEXITCODE -ne 0) { Write-Warning 'bicep lint reported warnings.' }

# ── Resource Group ──────────────────────────────────────────────────────

Write-Host "`n=== Resource Group ===" -ForegroundColor Cyan

$rgTags = @(
    "environment=$Environment",
    "owner=$Owner",
    "costcenter=$CostCenter",
    "application=$ProjectName",
    "workload=hackathon-management",
    "sla=$(if ($Environment -eq 'prod') { 'production' } else { 'non-production' })",
    "backup-policy=sql-dtu-backup",
    "maint-window=$(if ($Environment -eq 'prod') { 'weekends-only' } else { 'anytime' })",
    "technical-contact=$TechnicalContact"
)

if ($PSCmdlet.ShouldProcess($rgName, 'Create/update resource group')) {
    az group create `
        --name $rgName `
        --location $Location `
        --tags @rgTags `
        --output none

    Write-Host "  Resource group '$rgName' ready." -ForegroundColor Green
}

# ── What-If Analysis ────────────────────────────────────────────────────

Write-Host "`n=== What-If Analysis (Phase: $Phase) ===" -ForegroundColor Cyan

az deployment group what-if `
    --resource-group $rgName `
    --template-file $templateFile `
    --parameters phase=$Phase `
                 environment=$Environment `
                 projectName=$ProjectName `
                 location=$Location `
                 owner=$Owner `
                 costCenter=$CostCenter `
                 technicalContact=$TechnicalContact `
                 alertEmail=$AlertEmail `
                 githubOAuthClientId=$GitHubOAuthClientId `
                 githubOAuthClientSecret=$GitHubOAuthClientSecret `
                 imageDigest=$ImageDigest `
                 adminGithubIds=$AdminGithubIds

if ($WhatIfPreference -or (-not $AutoApprove -and -not $PSCmdlet.ShouldProcess($rgName, "Deploy Bicep phase '$Phase' (Incremental)"))) {
    Write-Host "`nWhat-if complete. Exiting without deployment." -ForegroundColor Yellow
    return
}

# ── Deploy ──────────────────────────────────────────────────────────────

Write-Host "`n=== Deploying Phase: $Phase (Incremental) ===" -ForegroundColor Cyan

az deployment group create `
    --name $deploymentName `
    --resource-group $rgName `
    --template-file $templateFile `
    --parameters phase=$Phase `
                 environment=$Environment `
                 projectName=$ProjectName `
                 location=$Location `
                 owner=$Owner `
                 costCenter=$CostCenter `
                 technicalContact=$TechnicalContact `
                 alertEmail=$AlertEmail `
                 githubOAuthClientId=$GitHubOAuthClientId `
                 githubOAuthClientSecret=$GitHubOAuthClientSecret `
                 imageDigest=$ImageDigest `
                 adminGithubIds=$AdminGithubIds `
    --mode Incremental

if ($LASTEXITCODE -ne 0) { throw "Deployment failed for phase '$Phase'." }

Write-Host '  Deployment succeeded.' -ForegroundColor Green

# ── Post-Deploy: Set Key Vault Reference Identity ───────────────────────
# UAMI must be configured as the KV reference identity so App Service
# can resolve @Microsoft.KeyVault(...) app setting references.

if ($Phase -eq 'all' -or $Phase -eq 'compute') {
    Write-Host "`n=== Post-Deploy: Key Vault Reference Identity ===" -ForegroundColor Cyan

    $uamiId = (az deployment group show `
        --name $deploymentName `
        --resource-group $rgName `
        --query properties.outputs.uamiId.value `
        --output tsv)

    $appName = (az deployment group show `
        --name $deploymentName `
        --resource-group $rgName `
        --query properties.outputs.appServiceName.value `
        --output tsv)

    if ($uamiId -and $appName) {
        Write-Host "  Setting keyVaultReferenceIdentity on $appName..."
        az webapp update `
            --resource-group $rgName `
            --name $appName `
            --set "keyVaultReferenceIdentity=$uamiId" `
            --output none

        # Staging slot
        az webapp update `
            --resource-group $rgName `
            --name $appName `
            --slot staging `
            --set "keyVaultReferenceIdentity=$uamiId" `
            --output none

        Write-Host '  Key Vault reference identity configured for production + staging.' -ForegroundColor Green
    }
    else {
        Write-Warning 'Could not retrieve UAMI ID or App Service name from deployment outputs. Set keyVaultReferenceIdentity manually.'
    }
}

# ── Display Outputs ─────────────────────────────────────────────────────

Write-Host "`n=== Deployment Outputs ===" -ForegroundColor Green

az deployment group show `
    --name $deploymentName `
    --resource-group $rgName `
    --query properties.outputs `
    --output table

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host '║   Deployment Complete                          ║' -ForegroundColor Green
Write-Host '╚════════════════════════════════════════════════╝' -ForegroundColor Green

if (-not $ImageDigest) {
    Write-Host ''
    Write-Warning 'No image digest provided — App Service is using :latest tag (bootstrap mode).'
    Write-Host '  Build and push a container image, then redeploy with -ImageDigest "sha256:..."' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Cyan
Write-Host '  1. Push a container image to ACR and redeploy with -ImageDigest'
Write-Host '  2. Verify GitHub Easy Auth against the deployed site'
Write-Host ''
