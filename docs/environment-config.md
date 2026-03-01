# HackOps — Environment Configuration Reference

> Every environment variable the HackOps application needs.
> Lists the name, description, source, and values for local
> development vs. production deployment.

---

## Variable Reference

### Application Core

| Variable              | Description           | Source (Dev)                           | Source (Prod)                                                        |
| --------------------- | --------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| `NODE_ENV`            | Runtime environment   | `.env.local` → `development`           | App Setting → `production`                                           |
| `NEXT_PUBLIC_APP_URL` | Public-facing app URL | `.env.local` → `http://localhost:3000` | App Setting → `https://app-hackops-{env}-{suffix}.azurewebsites.net` |
| `PORT`                | HTTP listen port      | Default `3000`                         | App Service managed (port `8080`)                                    |

### Azure Cosmos DB

| Variable                   | Description                           | Source (Dev)                | Source (Prod)                       |
| -------------------------- | ------------------------------------- | --------------------------- | ----------------------------------- |
| `COSMOS_ENDPOINT`          | Cosmos DB account endpoint URL        | `.env.local` → emulator URL | Key Vault reference                 |
| `COSMOS_KEY`               | Cosmos DB account key (emulator only) | `.env.local` → emulator key | **Not used** — managed identity     |
| `COSMOS_DATABASE_NAME`     | Database name                         | `.env.local` → `hackops`    | App Setting → `hackops`             |
| `COSMOS_CONNECTION_STRING` | Full connection string (fallback)     | `.env.local` → emulator     | Key Vault reference (fallback only) |

> In production, the app uses `@azure/identity`
> `DefaultAzureCredential` with the App Service
> system-assigned managed identity. Connection strings
> are a fallback only — prefer managed identity auth.

### Authentication (Easy Auth)

| Variable                     | Description                           | Source (Dev)       | Source (Prod)                 |
| ---------------------------- | ------------------------------------- | ------------------ | ----------------------------- |
| `DEV_USER_ID`                | Simulated GitHub userId for local dev | `.env.local`       | **Not set** (ignored in prod) |
| `DEV_USER_ROLE`              | Simulated role for local dev          | `.env.local`       | **Not set** (ignored in prod) |
| `DEV_USER_LOGIN`             | Simulated GitHub login for local dev  | `.env.local`       | **Not set** (ignored in prod) |
| `DEV_USER_EMAIL`             | Simulated email for local dev         | `.env.local`       | **Not set** (ignored in prod) |
| `GITHUB_OAUTH_CLIENT_ID`     | GitHub OAuth App client ID            | `.env.local`       | Key Vault reference           |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth App client secret        | Not needed locally | Key Vault reference           |

> Easy Auth does not work locally. The dev auth bypass
> in `src/lib/auth.ts` reads `DEV_USER_*` variables
> when `NODE_ENV=development` to simulate any role.

### Azure Monitoring

| Variable                                | Description                    | Source (Dev)            | Source (Prod)                   |
| --------------------------------------- | ------------------------------ | ----------------------- | ------------------------------- |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection string | `.env.local` (optional) | App Setting (from Bicep output) |

### Networking & DNS

| Variable                 | Description                           | Source (Dev) | Source (Prod)                 |
| ------------------------ | ------------------------------------- | ------------ | ----------------------------- |
| `WEBSITE_VNET_ROUTE_ALL` | Force all outbound through VNet       | Not set      | App Setting → `1`             |
| `WEBSITE_DNS_SERVER`     | DNS server for private DNS resolution | Not set      | App Setting → `168.63.129.16` |

### TLS & Security

| Variable                       | Description                            | Source (Dev)       | Source (Prod)                    |
| ------------------------------ | -------------------------------------- | ------------------ | -------------------------------- |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Disable TLS cert validation (emulator) | `.env.local` → `0` | **Not set** (must remain strict) |

> `NODE_TLS_REJECT_UNAUTHORIZED=0` is required only
> for the Cosmos DB emulator's self-signed certificate.
> Never set this in production.

---

## Easy Auth Header Parsing Contract

Azure App Service Easy Auth injects identity headers on
every authenticated request. The app parses these in
`src/lib/auth.ts`.

### Primary Header

| Header                  | Format | Description                  |
| ----------------------- | ------ | ---------------------------- |
| `X-MS-CLIENT-PRINCIPAL` | Base64 | JWT-like payload with claims |

### Decoded Payload Structure

```json
{
  "auth_typ": "aad",
  "claims": [
    {
      "typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      "val": "<github-user-id>"
    },
    {
      "typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      "val": "<github-login>"
    },
    {
      "typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "val": "<email>"
    },
    {
      "typ": "urn:github:avatar_url",
      "val": "<avatar-url>"
    }
  ],
  "name_typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "role_typ": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
}
```

### Additional Headers

| Header                           | Value                               |
| -------------------------------- | ----------------------------------- |
| `X-MS-CLIENT-PRINCIPAL-NAME`     | GitHub login (display name)         |
| `X-MS-CLIENT-PRINCIPAL-ID`       | GitHub userId                       |
| `X-MS-CLIENT-PRINCIPAL-IDP`      | `github`                            |
| `X-MS-TOKEN-GITHUB-ACCESS-TOKEN` | GitHub access token (if configured) |

### Parsing Logic

1. Read `X-MS-CLIENT-PRINCIPAL` header
2. Base64-decode the value
3. Parse as JSON
4. Extract claims by `typ` to build `EasyAuthPrincipal`:
   - `userId` ← `nameidentifier` claim
   - `githubLogin` ← `name` claim
   - `email` ← `emailaddress` claim
   - `avatarUrl` ← `urn:github:avatar_url` claim
5. If header is missing and `NODE_ENV=development`,
   fall back to `DEV_USER_*` environment variables

---

## Key Vault References

Production App Settings use Key Vault references to
avoid storing secrets directly in App Service
configuration.

### Reference Format

```text
@Microsoft.KeyVault(SecretUri=https://kv-hackops-{env}-{suffix}.vault.azure.net/secrets/{secret-name}/)
```

### Secrets Stored in Key Vault

| Secret Name                  | Description                            |
| ---------------------------- | -------------------------------------- |
| `github-oauth-client-id`     | GitHub OAuth App client ID             |
| `github-oauth-client-secret` | GitHub OAuth App client secret         |
| `cosmos-connection-string`   | Cosmos DB connection string (fallback) |

> The App Service system-assigned managed identity is
> granted the **Key Vault Secrets User** role via ARM
> RBAC. No access policies are used.

---

## `.env.local` Template

This template should be copied to `.env.local` in
`apps/web/` for local development. Never commit
`.env.local` to version control.

```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cosmos DB Emulator
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
COSMOS_DATABASE_NAME=hackops
NODE_TLS_REJECT_UNAUTHORIZED=0

# Dev Auth Bypass (Easy Auth simulation)
DEV_USER_ID=dev-user-001
DEV_USER_LOGIN=dev-admin
DEV_USER_EMAIL=dev@example.com
DEV_USER_ROLE=admin

# GitHub OAuth (not needed locally — Easy Auth bypass)
# GITHUB_OAUTH_CLIENT_ID=
# GITHUB_OAUTH_CLIENT_SECRET=

# Azure Monitoring (optional for local dev)
# APPLICATIONINSIGHTS_CONNECTION_STRING=
```

---

## Environment Comparison

| Aspect          | Local Dev                    | Azure (Production)                                     |
| --------------- | ---------------------------- | ------------------------------------------------------ |
| **Auth**        | Dev bypass (`DEV_USER_*`)    | Easy Auth (GitHub OAuth)                               |
| **Cosmos DB**   | Emulator (connection string) | Managed identity + private endpoint                    |
| **Secrets**     | `.env.local` file            | Key Vault references                                   |
| **TLS**         | Self-signed cert (emulator)  | Platform-managed TLS 1.2                               |
| **Networking**  | `localhost`                  | VNet integration + private DNS                         |
| **Monitoring**  | Console logging              | App Insights + Log Analytics                           |
| **CORS origin** | `http://localhost:3000`      | `https://app-hackops-{env}-{suffix}.azurewebsites.net` |
