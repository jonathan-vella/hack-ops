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

// ── Variables ───────────────────────────────────────────────────────────

var vnetName = 'vnet-${projectName}-${environment}'
var addressPrefix = '10.0.0.0/16'

var subnets = [
  {
    name: 'snet-app-${environment}'
    addressPrefix: '10.0.1.0/24'
    delegation: 'Microsoft.Web/serverFarms'
    nsgName: 'nsg-app-${environment}'
  }
  {
    name: 'snet-pe-${environment}'
    addressPrefix: '10.0.2.0/24'
    delegation: ''
    nsgName: 'nsg-pe-${environment}'
  }
  {
    name: 'snet-default-${environment}'
    addressPrefix: '10.0.0.0/24'
    delegation: ''
    nsgName: 'nsg-default-${environment}'
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
    addressPrefixes: [addressPrefix]
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
