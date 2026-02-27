---
name: cosmos-db-sdk
description: >-
  Azure Cosmos DB for NoSQL SDK patterns for the HackOps platform.
  Covers container operations, parameterized queries, bulk ops, and
  error handling with @azure/cosmos v4. Use when building API route
  handlers that read/write Cosmos DB data. Keywords: Cosmos DB,
  @azure/cosmos, container, query, upsert, bulk, partition key.
---

# Cosmos DB SDK Patterns

`@azure/cosmos` v4 patterns for the HackOps platform's NoSQL database.

## When to Use This Skill

- Writing API route handlers that query or mutate Cosmos DB documents
- Designing partition keys or modeling document schemas
- Handling transactional batch or bulk operations
- Troubleshooting 429 throttling or query performance

## Client Initialization

```typescript
// src/lib/cosmos.ts
import { CosmosClient, type Database, type Container } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const database: Database = client.database(process.env.COSMOS_DATABASE!);

export function getContainer(name: string): Container {
  return database.container(name);
}
```

### Key Rules

- Client is a singleton — reuse across requests
- For production, prefer `DefaultAzureCredential` over key-based auth
- Emulator endpoint: `https://localhost:8081` (dev only)

## Container Layout

| Container     | Partition Key  | Purpose                       |
| ------------- | -------------- | ----------------------------- |
| `hackathons`  | `/id`          | Hackathon lifecycle documents |
| `teams`       | `/hackathonId` | Team registrations, members   |
| `submissions` | `/hackathonId` | Challenge submissions         |
| `scores`      | `/hackathonId` | Scoring records, grades       |
| `users`       | `/id`          | User profiles, roles          |
| `audit`       | `/hackathonId` | Audit trail entries           |

## Query Patterns

### Parameterized Query (MANDATORY)

```typescript
const { resources } = await container.items
  .query<Team>({
    query: "SELECT * FROM c WHERE c.hackathonId = @hid AND c.status = @status",
    parameters: [
      { name: "@hid", value: hackathonId },
      { name: "@status", value: "active" },
    ],
  })
  .fetchAll();
```

**Never** use string interpolation in queries — always use parameters.

### Point Read (Preferred for Single Documents)

```typescript
const { resource } = await container.item(id, partitionKey).read<Hackathon>();
if (!resource) {
  return NextResponse.json({ error: "Not found", ok: false }, { status: 404 });
}
```

Point reads cost 1 RU — always prefer over queries when you have the id.

### Upsert

```typescript
const { resource } = await container.items.upsert<Hackathon>(document);
```

### Replace with Optimistic Concurrency

```typescript
const { resource } = await container
  .item(id, pk)
  .replace<Hackathon>(updated, {
    accessCondition: { type: "IfMatch", condition: etag },
  });
```

## Bulk Operations

```typescript
const operations = items.map((item) => ({
  operationType: "Create" as const,
  resourceBody: item,
}));

const response = await container.items.bulk(operations);
```

- Bulk operations auto-partition and retry on 429s
- Max 100 operations per batch recommended

## Error Handling

```typescript
import { ErrorResponse } from "@azure/cosmos";

try {
  await container.items.create(doc);
} catch (error) {
  if (error instanceof ErrorResponse) {
    if (error.code === 409) {
      // Conflict — document already exists
    }
    if (error.code === 429) {
      // Throttled — retry after error.retryAfterInMs
    }
    if (error.code === 404) {
      // Not found
    }
  }
  throw error;
}
```

## Cross-Partition Queries

- Avoid when possible — use partition key filters
- `enableCrossPartitionQuery: true` is required if no partition key filter
- Cost scales linearly with partition count

## Session Consistency

The emulator and production both default to Session consistency.
Pass `x-ms-session-token` header for read-your-writes within a session.

## References

- `apps/web/src/lib/cosmos.ts` — client singleton
- `packages/shared/types/api-contract.ts` — document type definitions
- `docs/exec-plans/active/hackops-execution.md` — container layout notes
