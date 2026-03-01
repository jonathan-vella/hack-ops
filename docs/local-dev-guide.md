# Local Development Guide

> [Current Version](../VERSION.md) | Step-by-step setup for running HackOps locally

## Prerequisites

| Tool    | Version | Purpose                      |
| ------- | ------- | ---------------------------- |
| Node.js | ≥20 LTS | Runtime                      |
| npm     | ≥10     | Package manager (workspaces) |
| Docker  | Latest  | SQL Server container         |

## 1. Clone and Install

```bash
git clone https://github.com/jonathan-vella/hack-ops.git
cd hack-ops
npm install
```

## 2. Start the Local SQL Server

```bash
docker run -d --name sql-server \
  -p 1433:1433 \
  -e ACCEPT_EULA=Y \
  -e MSSQL_SA_PASSWORD='HackOps@Dev123' \
  mcr.microsoft.com/mssql/server:2022-latest
```

Wait for SQL Server to be ready (check with `sqlcmd -S localhost -U sa -P 'HackOps@Dev123' -Q "SELECT 1"`).

> The SA password above is for local development only. Never use this
> password in production.

## 3. Configure Environment

Create `apps/web/.env.local`:

```env
SQL_SERVER=localhost
SQL_DATABASE=hackops
SQL_USER=sa
SQL_PASSWORD=HackOps@Dev123
```

The SA password above is for local development only (safe to commit in local configs).

## 4. Seed the Database

> **Note**: The original Cosmos DB seeder has been archived.
> A new SQL seeder will be created as part of Phase I.
> In production, the DB is behind a private endpoint — seeding
> must run from inside the VNet (e.g., via ACI).

<!-- TODO: Replace with SQL seed script once created -->

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

| Problem                    | Solution                                                         |
| -------------------------- | ---------------------------------------------------------------- |
| SQL Server not reachable   | Check Docker container is running: `docker ps`                   |
| Connection refused on 1433 | Ensure SQL Server container is healthy: `docker logs sql-server` |
| Port 3000 in use           | Kill existing process: `lsof -ti:3000 \| xargs kill`             |
| Seed script fails          | Ensure SQL Server is fully started (takes ~15s)                  |
