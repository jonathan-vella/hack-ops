<#
.SYNOPSIS
    Deploys HackOps infrastructure to Azure using Deployment Stacks.
.DESCRIPTION
    Creates or updates the resource group with required tags, validates
    the Bicep templates, runs what-if analysis, and deploys using
    az stack group create for lifecycle management.
.PARAMETER Environment
    Target environment (dev, staging, prod). Default: dev.
.PARAMETER Location
    Azure region. Default: swedencentral.
.PARAMETER Owner
    Resource owner tag value. Required.
.PARAMETER TechnicalContact
    Technical contact email. Required.
.PARAMETER WhatIf
    Run what-if analysis only — do not deploy.
.EXAMPLE
    ./deploy.ps1 -Owner "jonathan-vella" -TechnicalContact "admin@example.com"
.EXAMPLE
    ./deploy.ps1 -Owner "jonathan-vella" -TechnicalContact "admin@example.com" -WhatIf
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'dev',

    [string]$Location = 'swedencentral',

    [Parameter(Mandatory)]
    [string]$Owner,

    [Parameter(Mandatory)]
    [string]$TechnicalContact,

    [string]$CostCenter = 'hackops-dev',

    [string]$ProjectName = 'hackops'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$rgName = "rg-$ProjectName-$Environment"
$stackName = "stack-$ProjectName-$Environment"
$templateFile = Join-Path $PSScriptRoot 'main.bicep'

# ── Pre-flight checks ───────────────────────────────────────────────────

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
    "backup-policy=cosmos-periodic",
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

Write-Host "`n=== What-If Analysis ===" -ForegroundColor Cyan

az deployment group what-if `
    --resource-group $rgName `
    --template-file $templateFile `
    --parameters environment=$Environment `
                 projectName=$ProjectName `
                 location=$Location `
                 owner=$Owner `
                 costCenter=$CostCenter `
                 technicalContact=$TechnicalContact

if ($WhatIfPreference -or -not $PSCmdlet.ShouldProcess($rgName, 'Deploy via Deployment Stack')) {
    Write-Host "`nWhat-if complete. Exiting without deployment." -ForegroundColor Yellow
    return
}

# ── Deploy via Deployment Stacks ────────────────────────────────────────

Write-Host "`n=== Deploying via Deployment Stack ===" -ForegroundColor Cyan

az stack group create `
    --name $stackName `
    --resource-group $rgName `
    --template-file $templateFile `
    --parameters environment=$Environment `
                 projectName=$ProjectName `
                 location=$Location `
                 owner=$Owner `
                 costCenter=$CostCenter `
                 technicalContact=$TechnicalContact `
    --action-on-unmanage detachAll `
    --deny-settings-mode none `
    --yes

if ($LASTEXITCODE -ne 0) { throw 'Deployment Stack creation failed.' }

# ── Display Outputs ─────────────────────────────────────────────────────

Write-Host "`n=== Deployment Outputs ===" -ForegroundColor Green

az stack group show `
    --name $stackName `
    --resource-group $rgName `
    --query outputs `
    --output table

Write-Host "`nDeployment complete." -ForegroundColor Green
