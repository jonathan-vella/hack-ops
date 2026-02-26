---
name: cosmos-db-sdk
description: >-
  Azure Cosmos DB NoSQL SDK patterns using @azure/cosmos v4 for the HackOps
  platform. Covers client singleton, managed identity auth, CRUD operations,
  cross-partition queries, change feed, error handling, and connection string vs
  DefaultAzureCredential branching. Use when building or reviewing Cosmos DB
  data access code.
---

# Cosmos DB SDK Patterns

`@azure/cosmos` v4 patterns for HackOps data access layer.

## Client Singleton

Create one client instance shared across the application:

```typescript
// src/lib/cosmos.ts
import { CosmosClient, Database } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

let client: CosmosClient | undefined;
let database: Database | undefined;

function getClient(): CosmosClient {
  if (!client) {
    const endpoint = process.env.COSMOS_DB_ENDPOINT!;

    if (process.env.COSMOS_DB_KEY) {
      // Local dev or emulator — use connection key
      client = new CosmosClient({
        endpoint,
        key: process.env.COSMOS_DB_KEY,
      });
    } else {
      // Production — use managed identity
      const credential = new DefaultAzureCredential();
      client = new CosmosClient({
        endpoint,
        aadCredentials: credential,
      });
    }
  }
  return client;
}

export function getDatabase(): Database {
  if (!database) {
    database = getClient().database(process.env.COSMOS_DB_DATABASE ?? 'hackops');
  }
  return database;
}

export function getContainer(name: string) {
  return getDatabase().container(name);
}
```

## CRUD Operations

### Create

```typescript
import { getContainer } from '@/lib/cosmos';

const container = getContainer('hackathons');
const { resource } = await container.items.create({
  id: crypto.randomUUID(),
  hackathonId,
  name,
  state: 'draft',
  createdAt: new Date().toISOString(),
});
```

### Read by ID

```typescript
const { resource } = await container
  .item(id, partitionKeyValue)
  .read<Hackathon>();

if (!resource) {
  return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
}
```

### Query

```typescript
const { resources } = await container.items
  .query<Score>({
    query: 'SELECT * FROM c WHERE c.hackathonId = @hackathonId ORDER BY c.totalScore DESC',
    parameters: [{ name: '@hackathonId', value: hackathonId }],
  })
  .fetchAll();
```

### Update (Replace)

```typescript
const { resource: existing } = await container.item(id, partitionKey).read<Hackathon>();
if (!existing) throw new Error('Not found');

const updated = { ...existing, ...changes, updatedAt: new Date().toISOString() };
const { resource } = await container.item(id, partitionKey).replace(updated);
```

### Delete

```typescript
await container.item(id, partitionKey).delete();
```

## Cross-Partition Queries

Use `enableCrossPartitionQuery` when querying across partition keys:

```typescript
const { resources } = await container.items
  .query<Submission>(
    {
      query: 'SELECT * FROM c WHERE c.state = @state',
      parameters: [{ name: '@state', value: 'pending' }],
    },
    { enableCrossPartitionQuery: true }
  )
  .fetchAll();
```

**HackOps note**: Prefer partition-scoped queries for performance. Use
cross-partition only for admin views (audit trail, global leaderboard).

## Error Handling

```typescript
import { ErrorResponse } from '@azure/cosmos';

try {
  const { resource } = await container.items.create(item);
  return resource;
} catch (error) {
  if (error instanceof ErrorResponse) {
    switch (error.code) {
      case 409:
        // Conflict — item already exists
        return NextResponse.json(
          { error: 'Already exists', code: 'CONFLICT' },
          { status: 409 }
        );
      case 404:
        return NextResponse.json(
          { error: 'Not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      case 429:
        // Throttled — retry with backoff
        const retryAfterMs = error.retryAfterInMs ?? 1000;
        await new Promise((r) => setTimeout(r, retryAfterMs));
        return container.items.create(item);
      default:
        throw error;
    }
  }
  throw error;
}
```

## Cosmos DB Emulator (Local Dev)

```env
# .env.local for local development
COSMOS_DB_ENDPOINT=https://localhost:8081
COSMOS_DB_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
COSMOS_DB_DATABASE=hackops
NODE_TLS_REJECT_UNAUTHORIZED=0
```

The emulator key above is the well-known default Cosmos DB emulator key
(not a secret).

## HackOps Container Map

| Container     | Partition key    | Primary queries                   |
| ------------- | ---------------- | --------------------------------- |
| `hackathons`  | `/hackathonId`   | By ID, list all                   |
| `teams`       | `/hackathonId`   | By hackathon, by ID               |
| `hackers`     | `/hackathonId`   | By hackathon, by userId           |
| `scores`      | `/hackathonId`   | By hackathon (leaderboard)        |
| `submissions` | `/teamId`        | By team, by state (review queue)  |
| `rubrics`     | `/hackathonId`   | Pointer + version lookup          |
| `config`      | `/hackathonId`   | By hackathon                      |
| `roles`       | `/hackathonId`   | By hackathon + userId             |
| `challenges`  | `/hackathonId`   | By hackathon, ordered             |
| `progression` | `/teamId`        | By team, gate check               |

## Learn More

| Topic                 | How to find                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| SDK reference         | `microsoft_docs_search(query="azure cosmos db javascript sdk v4")`            |
| Managed identity auth | `microsoft_docs_search(query="cosmos db managed identity defaultazurecredential")` |
| Indexing policies     | `microsoft_docs_search(query="cosmos db indexing policy best practices")`     |
| Change feed           | `microsoft_docs_search(query="cosmos db change feed javascript")`             |
