using './main.bicep'

// ── Deployment Identity (set per deployer) ──────────────────────────────
// These values MUST be provided via deploy.ps1 parameters or overridden
// on the command line. Placeholders below will cause deployment to fail
// unless overridden — this is intentional for multi-deployer safety.

param phase = 'all'
param environment = 'dev'
param projectName = 'hackops'
param location = 'swedencentral'

// ── Governance Tags (per deployer) ──────────────────────────────────────

param owner = readEnvironmentVariable('HACKOPS_OWNER', 'not-set')
param costCenter = 'hackops-dev'
param technicalContact = readEnvironmentVariable('HACKOPS_CONTACT', 'not-set')
param alertEmail = readEnvironmentVariable('HACKOPS_ALERT_EMAIL', 'not-set')

// ── Application Settings ────────────────────────────────────────────────

param githubOAuthClientId = readEnvironmentVariable('HACKOPS_GITHUB_OAUTH_CLIENT_ID', 'not-set')
param adminGithubIds = ''
param imageDigest = ''

// ── Infrastructure Configuration (override per environment) ─────────────
// Defaults below match dev environment. Override for staging/prod.

param vnetAddressPrefix = '10.0.0.0/23'
param appSubnetPrefix = '10.0.0.0/25'
param peSubnetPrefix = '10.0.0.128/26'
param defaultSubnetPrefix = '10.0.0.192/26'

param aspSkuName = 'P1v4'
param sqlSkuName = 'S2'
param sqlSkuTier = 'Standard'
param sqlMaxSizeBytes = 268435456000

param acrSku = 'Standard'

param logRetentionDays = 30
param logDailyQuotaGb = 1

param autoscaleMinInstances = 1
param autoscaleMaxInstances = 3
param autoscaleCpuScaleOutThreshold = 70
param autoscaleCpuScaleInThreshold = 30
param autoscaleMemoryScaleOutThreshold = 80
