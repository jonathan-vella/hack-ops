// -----------------------------------------------------------------------
// HackOps — Azure SQL Database Module
// SQL Server + DB (S2 50 DTU) with PE, Private DNS, Entra-only auth
// (UAMI as admin), and diagnostics.
// -----------------------------------------------------------------------

@description('Deployment environment.')
param environment string

@description('Project identifier.')
param projectName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Unique suffix for globally unique names.')
@minLength(5)
param uniqueSuffix string

@description('Private endpoint subnet resource ID.')
param peSubnetId string

@description('Virtual network resource ID for DNS zone link.')
param vnetId string

@description('UAMI principal ID — set as SQL Server Entra admin.')
param uamiPrincipalId string

@description('UAMI resource name — used as Entra admin login display name.')
param uamiName string

@description('SQL Database SKU name.')
param sqlSkuName string

@description('SQL Database SKU tier.')
param sqlSkuTier string

@description('SQL Database max size in bytes.')
param sqlMaxSizeBytes int

// ── Variables ───────────────────────────────────────────────────────────

var sqlServerName = 'sql-${projectName}-${environment}-${take(uniqueSuffix, 6)}'
var databaseName = 'sqldb-${projectName}-${environment}'

// ── Private DNS Zone ────────────────────────────────────────────────────

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  #disable-next-line no-hardcoded-env-urls
  name: 'privatelink.database.windows.net'
  location: 'global'
  tags: tags
}

resource dnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: privateDnsZone
  name: 'link-sql-${projectName}'
  location: 'global'
  tags: tags
  properties: {
    virtualNetwork: {
      id: vnetId
    }
    registrationEnabled: false
  }
}

// ── Azure SQL Server (AVM) — UAMI as Entra admin ───────────────────────

module sqlServer 'br/public:avm/res/sql/server:0.12.0' = {
  name: 'sql-${uniqueString(deployment().name)}'
  params: {
    name: sqlServerName
    location: location
    tags: tags

    // Entra-only auth — MCAPSGov Deny policy compliance
    administrators: {
      azureADOnlyAuthentication: true
      administratorType: 'ActiveDirectory'
      login: uamiName
      sid: uamiPrincipalId
      principalType: 'Application'
      tenantId: tenant().tenantId
    }

    publicNetworkAccess: 'Disabled'
    minimalTlsVersion: '1.2'
    restrictOutboundNetworkAccess: 'Disabled'

    databases: [
      {
        name: databaseName
        sku: {
          name: sqlSkuName
          tier: sqlSkuTier
        }
        maxSizeBytes: sqlMaxSizeBytes
        zoneRedundant: false
      }
    ]

    privateEndpoints: [
      {
        name: 'pe-sql-${projectName}-${environment}'
        subnetResourceId: peSubnetId
        service: 'sqlServer'
        privateDnsZoneGroup: {
          privateDnsZoneGroupConfigs: [
            {
              privateDnsZoneResourceId: privateDnsZone.id
            }
          ]
        }
      }
    ]


  }
}

// ── Outputs ─────────────────────────────────────────────────────────────

@description('SQL Server resource ID.')
output sqlServerId string = sqlServer.outputs.resourceId

@description('SQL Server name.')
output sqlServerName string = sqlServer.outputs.name

@description('SQL Server fully qualified domain name.')
output sqlServerFqdn string = sqlServer.outputs.fullyQualifiedDomainName

@description('SQL Database name.')
output sqlDatabaseName string = databaseName
