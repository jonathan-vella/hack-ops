// -----------------------------------------------------------------------
// HackOps — Networking Module
// VNet with 3 subnets and NSGs.
// -----------------------------------------------------------------------

@description('Deployment environment.')
param environment string

@description('Project identifier.')
param projectName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Unique suffix for resource naming.')
param uniqueSuffix string

@description('Virtual network address space CIDR.')
param vnetAddressPrefix string

@description('App subnet CIDR (delegated to Microsoft.Web/serverFarms).')
param appSubnetPrefix string

@description('Private endpoint subnet CIDR.')
param peSubnetPrefix string

@description('Default subnet CIDR (ACI, general purpose).')
param defaultSubnetPrefix string

// ── Variables ───────────────────────────────────────────────────────────

var vnetName = 'vnet-${projectName}-${environment}-${uniqueSuffix}'

var subnets = [
  {
    name: 'snet-app-${environment}-${uniqueSuffix}'
    addressPrefix: appSubnetPrefix
    delegation: 'Microsoft.Web/serverFarms'
    nsgName: 'nsg-app-${environment}-${uniqueSuffix}'
  }
  {
    name: 'snet-pe-${environment}-${uniqueSuffix}'
    addressPrefix: peSubnetPrefix
    delegation: ''
    nsgName: 'nsg-pe-${environment}-${uniqueSuffix}'
  }
  {
    name: 'snet-default-${environment}-${uniqueSuffix}'
    addressPrefix: defaultSubnetPrefix
    delegation: ''
    nsgName: 'nsg-default-${environment}-${uniqueSuffix}'
  }
]

// ── NSGs ────────────────────────────────────────────────────────────────

module nsgApp 'br/public:avm/res/network/network-security-group:0.5.0' = {
  name: 'nsg-app-${uniqueString(deployment().name)}'
  params: {
    name: subnets[0].nsgName
    location: location
    tags: tags
    securityRules: [
      {
        name: 'AllowHTTPS'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '443'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

module nsgPe 'br/public:avm/res/network/network-security-group:0.5.0' = {
  name: 'nsg-pe-${uniqueString(deployment().name)}'
  params: {
    name: subnets[1].nsgName
    location: location
    tags: tags
    securityRules: [
      {
        name: 'DenyAllInbound'
        properties: {
          priority: 4096
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourcePortRange: '*'
          destinationPortRange: '*'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

module nsgDefault 'br/public:avm/res/network/network-security-group:0.5.0' = {
  name: 'nsg-default-${uniqueString(deployment().name)}'
  params: {
    name: subnets[2].nsgName
    location: location
    tags: tags
    securityRules: [
      {
        name: 'DenyAllInbound'
        properties: {
          priority: 4096
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourcePortRange: '*'
          destinationPortRange: '*'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

// ── Virtual Network ─────────────────────────────────────────────────────

module vnet 'br/public:avm/res/network/virtual-network:0.5.0' = {
  name: 'vnet-${uniqueString(deployment().name)}'
  params: {
    name: vnetName
    location: location
    tags: tags
    addressPrefixes: [vnetAddressPrefix]
    subnets: [
      {
        name: subnets[0].name
        addressPrefix: subnets[0].addressPrefix
        networkSecurityGroupResourceId: nsgApp.outputs.resourceId
        delegation: 'Microsoft.Web/serverFarms'
      }
      {
        name: subnets[1].name
        addressPrefix: subnets[1].addressPrefix
        networkSecurityGroupResourceId: nsgPe.outputs.resourceId
      }
      {
        name: subnets[2].name
        addressPrefix: subnets[2].addressPrefix
        networkSecurityGroupResourceId: nsgDefault.outputs.resourceId
      }
    ]
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────

@description('Virtual network resource ID.')
output vnetId string = vnet.outputs.resourceId

@description('Virtual network name.')
output vnetName string = vnet.outputs.name

@description('App subnet resource ID (delegated to Microsoft.Web/serverFarms).')
output appSubnetId string = vnet.outputs.subnetResourceIds[0]

@description('Private endpoint subnet resource ID.')
output peSubnetId string = vnet.outputs.subnetResourceIds[1]

@description('Default subnet resource ID (ACI, general purpose).')
output defaultSubnetId string = vnet.outputs.subnetResourceIds[2]
