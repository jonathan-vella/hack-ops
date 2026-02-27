# Local Development Guide

> [Current Version](../VERSION.md) | Step-by-step setup for running HackOps locally

## Prerequisites

| Tool    | Version | Purpose                      |
| ------- | ------- | ---------------------------- |
| Node.js | ≥20 LTS | Runtime                      |
| npm     | ≥10     | Package manager (workspaces) |
| Docker  | Latest  | Cosmos DB emulator           |

## 1. Clone and Install

```bash
git clone https://github.com/jonathan-vella/hack-ops.git
cd hack-ops
npm install
```

## 2. Start the Cosmos DB Emulator

```bash
docker run -d --name cosmos-emulator \
  -p 8081:8081 -p 10250-10255:10250-10255 \
  -e AZURE_COSMOS_EMULATOR_PARTITION_COUNT=5 \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest
```

Wait for the emulator to be ready (check https://localhost:8081/\_explorer/index.html).

> The emulator uses a well-known key for local development. Never use this
> key in production.

## 3. Configure Environment

Create `apps/web/.env.local`:

```env
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
COSMOS_DATABASE=hackops
```

The key above is the well-known emulator key (safe to commit in local configs).

## 4. Seed the Database

```bash
npx tsx scripts/seed-cosmos.ts
```

This creates all 11 containers and inserts sample documents for
hackathons, teams, hackers, roles, challenges, scores, submissions,
rubrics, progression, config, and audit entries.

## 5. Run the Dev Server

```bash
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000).

## 6. Test Auth Bypass

In local development, Easy Auth is not active. The app reads auth
from `x-ms-client-principal` headers. To simulate a logged-in user,
add the header manually:

```bash
# Admin user
curl http://localhost:3000/api/hackathons \
  -H "x-ms-client-principal: eyJ1c2VySWQiOiJhZG1pbi0wMDEiLCJ1c2VyRGV0YWlscyI6ImFkbWluQGhhY2tvcHMuZGV2IiwiaWRlbnRpdHlQcm92aWRlciI6ImFhZCIsInVzZXJSb2xlcyI6WyJhdXRoZW50aWNhdGVkIl19"
```

Test fixture headers for admin, coach, and hacker roles are exported
from `apps/web/tests/fixtures/index.ts`.

## 7. Run Tests

```bash
npm test                            # All tests
cd apps/web && npx vitest --watch   # Watch mode
npm run test -- --coverage          # Coverage report
```

## 8. Verify API Routes

Key routes to verify after setup:

| Method | Route                             | Expected     |
| ------ | --------------------------------- | ------------ |
| GET    | `/api/hackathons`                 | 200 + array  |
| POST   | `/api/hackathons`                 | 201 (admin)  |
| GET    | `/api/hackathons/:id`             | 200 + object |
| POST   | `/api/hackathons/:id/join`        | 200 (hacker) |
| GET    | `/api/hackathons/:id/teams`       | 200 + array  |
| GET    | `/api/hackathons/:id/leaderboard` | 200 + array  |

## Troubleshooting

| Problem                       | Solution                                             |
| ----------------------------- | ---------------------------------------------------- |
| Cosmos emulator not reachable | Check Docker container is running: `docker ps`       |
| Certificate errors            | Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env.local` |
| Port 3000 in use              | Kill existing process: `lsof -ti:3000 \| xargs kill` |
| Seed script fails             | Ensure emulator is fully started (takes ~30s)        |
