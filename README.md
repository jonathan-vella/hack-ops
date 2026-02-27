<!-- markdownlint-disable MD013 MD033 MD041 -->

<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![Azure][azure-shield]][azure-url]

<div align="center">
  <h1 align="center">HackOps</h1>
  <p align="center">
    <strong>Hackathon management platform for structured Microsoft Azure learning events</strong>
    <br />
    <em>Register · Score · Approve · Leaderboard · Ship</em>
    <br /><br />
    <a href="#-quick-start"><strong>Quick Start »</strong></a>
    ·
    <a href="docs/quickstart.md">Docs</a>
    ·
    <a href="https://github.com/jonathan-vella/hack-ops/issues/new?labels=bug">Report Bug</a>
  </p>
</div>

---

HackOps manages the complete lifecycle of a **MicroHack** event — from team registration and
hacker onboarding through rubric-driven scoring, coach review, and a live leaderboard. Built on
Azure App Service + Cosmos DB NoSQL with GitHub OAuth authentication.

---

## What It Does

| Feature                      | Description                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Team & Hacker Management** | Self-service onboarding via 4-digit event code; Fisher-Yates team shuffle; manual reassignment          |
| **Rubric-Driven Scoring**    | Markdown-defined rubric drives all forms, validation, and grade computation — nothing hardcoded         |
| **Submission Workflow**      | Form or JSON file upload → staging queue → coach/admin approve/reject → immutable score record          |
| **Live Leaderboard**         | Auto-refresh every 30s; expandable rows; grade badges (A/B/C/D); award badges; SSR for fast first paint |
| **Challenge Gating**         | Challenge N+1 unlocks only after Challenge N is approved                                                |
| **Role Management**          | Admin, Coach, Hacker, Anonymous — invite by GitHub username; primary admin protected from demotion      |
| **Audit Trail**              | Every reviewer action logged with `reviewedBy`, `reviewedAt`, `reviewReason`                            |

---

## Tech Stack

| Layer             | Technology                                           |
| ----------------- | ---------------------------------------------------- |
| **Frontend**      | Next.js 15 (App Router), Tailwind CSS 4, shadcn/ui   |
| **Backend**       | Next.js Route Handlers, TypeScript, Zod              |
| **Database**      | Cosmos DB NoSQL (Serverless), 10 containers          |
| **Auth**          | Azure App Service Easy Auth — GitHub OAuth only      |
| **Compute**       | Azure App Service (Linux, Node 22 LTS)               |
| **IaC**           | Bicep + Azure Verified Modules (AVM), GitHub Actions |
| **Observability** | Application Insights, Log Analytics                  |
| **Secrets**       | Azure Key Vault — zero hardcoded values              |

All database traffic flows over a **Private Endpoint** — Cosmos DB is never exposed to the
public internet.

---

## Architecture

```text
GitHub OAuth
     │
     ▼
Azure App Service (Linux / Node 22)
  ├── Next.js SSR + API Route Handlers
  ├── Easy Auth middleware
  └── VNet Integration
          │
          ▼  (private endpoint — snet-pe)
     Cosmos DB NoSQL (serverless)
     10 containers, swedencentral
          │
     Key Vault  ·  App Insights  ·  Log Analytics
```

---

## Quick Start

**Prerequisites:** Docker Desktop, VS Code with Dev Containers extension, GitHub Copilot.

```bash
git clone https://github.com/jonathan-vella/hack-ops.git
cd hack-ops
code .
```

1. Press `F1` → **Dev Containers: Reopen in Container**
2. Copy the environment template and configure:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Start the Cosmos DB emulator and dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

> For local dev, set `DEV_USER_ROLE=Admin` and `DEV_USER_ID=your-github-id` in `.env.local`
> to bypass Easy Auth (Easy Auth does not work on localhost).

---

## Infrastructure Deployment

All infrastructure is managed via Bicep AVM modules. Every resource includes a 6-character
deterministic suffix (`take(uniqueString(resourceGroup().id), 6)`) for guaranteed uniqueness.

```bash
# Deploy dev environment
cd infra/bicep/hackops
./deploy.ps1 -Environment dev -Location swedencentral
```

See [infra/bicep/README.md](infra/bicep/README.md) for full deployment instructions and
governance discovery requirements.

---

## Roles

| Role          | Capabilities                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Admin**     | Full control — create/launch/archive hackathons, manage roles, override scores, view audit log |
| **Coach**     | Review and approve/reject submissions, view all teams                                          |
| **Hacker**    | Submit evidence for own team, view leaderboard                                                 |
| **Anonymous** | Blocked entirely — login required                                                              |

---

## Azure Constraints

Designed for enterprise Azure landing zones:

- Zero hardcoded values — all config in Key Vault or environment variables
- Private Endpoint only — `publicNetworkAccess: 'Disabled'` on Cosmos DB
- Managed Identity for all service-to-service authentication
- Azure Policy compliant — governance discovery required before production deployment
- Minimum 4 tags enforced: `Environment`, `ManagedBy`, `Project`, `Owner`
- Default region: `swedencentral` (EU GDPR-compliant)

---

## Project Structure

```text
apps/
  web/                  # Next.js 15 application
packages/
  shared/               # Shared TypeScript types
infra/
  bicep/hackops/        # Bicep AVM templates
.github/
  agents/               # Copilot agent definitions
  skills/               # Domain knowledge skills
  instructions/         # File-type coding rules
agent-output/           # Generated infrastructure artifacts
docs/                   # Documentation
```

See [AGENTS.md](AGENTS.md) for the agent workflow map and
[docs/project-overview.md](docs/project-overview.md) for a full end-to-end explanation of the project.

---

## Contributing & License

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/jonathan-vella">Jonathan Vella</a></p>
</div>

<!-- MARKDOWN LINKS & IMAGES -->

[contributors-shield]: https://img.shields.io/github/contributors/jonathan-vella/hack-ops.svg?style=for-the-badge
[contributors-url]: https://github.com/jonathan-vella/hack-ops/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/jonathan-vella/hack-ops.svg?style=for-the-badge
[forks-url]: https://github.com/jonathan-vella/hack-ops/network/members
[stars-shield]: https://img.shields.io/github/stars/jonathan-vella/hack-ops.svg?style=for-the-badge
[stars-url]: https://github.com/jonathan-vella/hack-ops/stargazers
[issues-shield]: https://img.shields.io/github/issues/jonathan-vella/hack-ops.svg?style=for-the-badge
[issues-url]: https://github.com/jonathan-vella/hack-ops/issues
[license-shield]: https://img.shields.io/github/license/jonathan-vella/hack-ops.svg?style=for-the-badge
[license-url]: https://github.com/jonathan-vella/hack-ops/blob/main/LICENSE
[azure-shield]: https://img.shields.io/badge/Azure-Ready-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white
[azure-url]: https://azure.microsoft.com
