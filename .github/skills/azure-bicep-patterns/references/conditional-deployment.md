# Conditional Deployment

> Extracted from `azure-bicep-patterns/SKILL.md` for progressive loading.

Use parameters to control optional resource deployment:

```bicep
@description('Deploy a Redis cache for session state')
param deployRedis bool = false

module redis 'modules/redis.bicep' = if (deployRedis) {
  name: 'redis-cache'
  params: {
    name: 'redis-${projectName}-${environment}-${uniqueSuffix}'
    location: location
    tags: tags
  }
}

// Conditional output — empty string when not deployed
output redisHostName string = deployRedis ? redis.outputs.hostName : ''
```

- Use `bool` parameters with sensible defaults
- Guard outputs with ternary expressions
- Group related optional resources (e.g., `deployMonitoring` enables workspace + alerts + dashboard)
