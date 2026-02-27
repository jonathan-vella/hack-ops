/**
 * Cosmos DB Seed Script
 * Creates all 10 containers with correct partition keys
 * and inserts sample documents. Idempotent — safe to run multiple times.
 *
 * Usage: npx tsx scripts/seed-cosmos.ts
 */

import { CosmosClient } from "@azure/cosmos";

const endpoint = process.env.COSMOS_ENDPOINT ?? "https://localhost:8081";
const key =
  process.env.COSMOS_KEY ??
  "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";
const databaseName = process.env.COSMOS_DATABASE_NAME ?? "hackops";

interface ContainerDef {
  id: string;
  partitionKey: string;
}

const containers: ContainerDef[] = [
  { id: "hackathons", partitionKey: "/id" },
  { id: "teams", partitionKey: "/hackathonId" },
  { id: "hackers", partitionKey: "/hackathonId" },
  { id: "scores", partitionKey: "/teamId" },
  { id: "submissions", partitionKey: "/teamId" },
  { id: "rubrics", partitionKey: "/id" },
  { id: "config", partitionKey: "/id" },
  { id: "roles", partitionKey: "/hackathonId" },
  { id: "challenges", partitionKey: "/hackathonId" },
  { id: "progression", partitionKey: "/teamId" },
];

const sampleDocs: Record<string, object[]> = {
  hackathons: [
    {
      id: "hack-2026-swedenai",
      _type: "hackathon",
      name: "Sweden AI MicroHack 2026",
      description: "Build AI-powered solutions using Azure OpenAI and Cosmos DB",
      status: "active",
      eventCode: "4821",
      teamSize: 5,
      createdBy: "github|12345678",
      createdAt: "2026-02-15T09:00:00Z",
      launchedAt: "2026-02-20T08:00:00Z",
      archivedAt: null,
    },
  ],
  teams: [
    {
      id: "team-alpha-4821",
      _type: "team",
      hackathonId: "hack-2026-swedenai",
      name: "Team Alpha",
      members: [
        { hackerId: "hkr-a1b2c3d4", githubLogin: "alice-dev", displayName: "Alice Andersson" },
        { hackerId: "hkr-e5f6g7h8", githubLogin: "bob-coder", displayName: "Bob Bergström" },
        { hackerId: "hkr-i9j0k1l2", githubLogin: "carol-hacks", displayName: "Carol Chen" },
      ],
    },
  ],
  hackers: [
    {
      id: "hkr-a1b2c3d4",
      _type: "hacker",
      hackathonId: "hack-2026-swedenai",
      githubUserId: "github|87654321",
      githubLogin: "alice-dev",
      displayName: "Alice Andersson",
      email: "alice@example.com",
      avatarUrl: "https://avatars.githubusercontent.com/u/87654321",
      eventCode: "4821",
      teamId: "team-alpha-4821",
      joinedAt: "2026-02-20T10:15:00Z",
    },
  ],
  config: [
    {
      id: "cfg-leaderboard-refresh-interval",
      _type: "config",
      key: "leaderboard-refresh-interval",
      value: 30000,
      updatedBy: "github|12345678",
      updatedAt: "2026-02-15T09:30:00Z",
    },
  ],
  challenges: [
    {
      id: "ch-001-setup",
      _type: "challenge",
      hackathonId: "hack-2026-swedenai",
      order: 1,
      title: "Environment Setup",
      description: "Configure your development environment with Azure OpenAI access.",
      maxScore: 30,
      createdBy: "github|12345678",
      createdAt: "2026-02-18T10:00:00Z",
    },
  ],
  roles: [
    {
      id: "role-12345678-hack-2026-swedenai",
      _type: "role",
      hackathonId: "hack-2026-swedenai",
      githubUserId: "github|12345678",
      githubLogin: "jonathan-admin",
      role: "admin",
      isPrimaryAdmin: true,
      assignedBy: "system",
      assignedAt: "2026-02-15T09:00:00Z",
    },
  ],
};

async function seed() {
  const client = new CosmosClient({ endpoint, key });
  console.log("Connecting to Cosmos DB...");

  const { database } = await client.databases.createIfNotExists({ id: databaseName });
  console.log(`Database '${databaseName}' ready`);

  for (const def of containers) {
    const { container } = await database.containers.createIfNotExists({
      id: def.id,
      partitionKey: { paths: [def.partitionKey] },
    });
    console.log(`  Container '${def.id}' ready (partition: ${def.partitionKey})`);

    const docs = sampleDocs[def.id];
    if (docs) {
      for (const doc of docs) {
        await container.items.upsert(doc);
        console.log(`    Upserted: ${(doc as { id: string }).id}`);
      }
    }
  }

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
