import { CosmosClient, type Container, type Database } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const CONTAINER_NAMES = [
  "hackathons",
  "teams",
  "hackers",
  "scores",
  "submissions",
  "rubrics",
  "config",
  "roles",
  "challenges",
  "progression",
  "audit",
] as const;

type ContainerName = (typeof CONTAINER_NAMES)[number];

let clientInstance: CosmosClient | null = null;
let databaseInstance: Database | null = null;

function isEmulator(): boolean {
  return (
    process.env.COSMOS_ENDPOINT?.includes("localhost") ??
    process.env.COSMOS_ENDPOINT?.includes("127.0.0.1") ??
    false
  );
}

function getClient(): CosmosClient {
  if (clientInstance) return clientInstance;

  const endpoint = process.env.COSMOS_ENDPOINT;

  if (isEmulator()) {
    const key = process.env.COSMOS_KEY;
    clientInstance = new CosmosClient({ endpoint, key });
  } else {
    // Production: use managed identity via DefaultAzureCredential
    clientInstance = new CosmosClient({
      endpoint,
      aadCredentials: new DefaultAzureCredential(),
    });
  }

  return clientInstance;
}

function getDatabase(): Database {
  if (databaseInstance) return databaseInstance;
  const dbName = process.env.COSMOS_DATABASE_NAME ?? "hackops";
  databaseInstance = getClient().database(dbName);
  return databaseInstance;
}

export function getContainer(name: ContainerName): Container {
  return getDatabase().container(name);
}

export { CONTAINER_NAMES, type ContainerName };
