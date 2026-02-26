# ADR-0003: Easy Auth with GitHub OAuth over Custom Authentication

![Step](https://img.shields.io/badge/Step-3-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Proposed-orange?style=for-the-badge)
![Type](https://img.shields.io/badge/Type-ADR-purple?style=for-the-badge)

<details open>
<summary><strong>📑 Decision Contents</strong></summary>

- [🔍 Context](#-context)
- [✅ Decision](#-decision)
- [🔄 Alternatives Considered](#-alternatives-considered)
- [⚖️ Consequences](#%EF%B8%8F-consequences)
- [🏛️ WAF Pillar Analysis](#%EF%B8%8F-waf-pillar-analysis)
- [🔒 Compliance Considerations](#-compliance-considerations)
- [📝 Implementation Notes](#-implementation-notes)

</details>

> Status: Proposed
> Date: 2026-02-26
> Deciders: HackOps architecture team

## 🔍 Context

HackOps is a hackathon management platform where all users have
GitHub accounts. The platform requires:

- GitHub identity as the authentication source
- Role-based access (Admin, Coach, Hacker) resolved per hackathon
- No anonymous data access (all endpoints except `/api/health`)
- Minimal custom authentication code (solo developer)
- Local development auth bypass (Easy Auth unavailable locally)

Azure App Service provides a built-in authentication feature
("Easy Auth") that can handle OAuth flows with GitHub, Entra ID,
and other providers — with no application code changes.

## ✅ Decision

Use **Azure App Service Easy Auth** with the **GitHub OAuth
provider** for authentication. The application code only needs
to parse the `X-MS-CLIENT-PRINCIPAL` header injected by Easy
Auth — no OAuth flow implementation, token refresh, or session
management code.

Role resolution is handled in application code after
authentication, using the `roles` Cosmos DB container.

## 🔄 Alternatives Considered

| Option                          | Pros                                  | Cons                                             | WAF Impact                  |
| ------------------------------- | ------------------------------------- | ------------------------------------------------ | --------------------------- |
| **Easy Auth + GitHub** (chosen) | Zero auth code, built-in, secure      | App Service lock-in, enterprise may block GitHub | Security: ↑, Operations: ↑  |
| NextAuth.js                     | Platform-agnostic, flexible providers | Custom code, session management, token storage   | Security: ↓, Operations: ↓  |
| Entra ID with external IDs      | Enterprise-approved, SAML/OIDC        | Complex setup, overkill for GitHub-centric tool  | Security: ↑, Operations: ↓  |
| MSAL + custom middleware        | Full control, Entra ID native         | Heavy implementation burden for solo dev         | Security: →, Operations: ↓↓ |

**Rejection rationale**:

- **NextAuth.js**: Adds 500+ lines of auth code (session store,
  token refresh, CSRF protection) that Easy Auth provides for free.
  Also introduces a maintenance burden for security patches.
- **Entra ID with external identities**: The right choice if
  GitHub OAuth is blocked by enterprise policy, but adds
  significant configuration complexity (B2C/B2B, claims mapping).
  Reserved as a fallback.
- **MSAL + custom middleware**: Maximum flexibility but maximum
  implementation effort. Not justified when Easy Auth satisfies
  all requirements.

## ⚖️ Consequences

### Positive

- Zero authentication code in the application
- App Service handles OAuth flow, token refresh, and session
  management automatically
- `X-MS-CLIENT-PRINCIPAL` header provides a clean, typed
  identity contract for the application
- Reduced attack surface — no custom token handling code to audit
- Free — no additional Azure service costs

### Negative

- **Enterprise policy risk**: Some organisations enforce
  Entra ID-only authentication via conditional access policies
  or App Service auth policies. If GitHub OAuth is blocked, the
  entire auth strategy must pivot to Entra ID with external
  identities.
- **App Service lock-in**: Easy Auth is only available on App
  Service and Static Web Apps. Migration to Container Apps would
  require implementing custom auth.
- **Local development gap**: Easy Auth does not work locally.
  A dev auth bypass is required for local testing, which must be
  carefully disabled in production.

### Neutral

- Easy Auth sets cookies automatically; the application does not
  manage session state
- The `X-MS-CLIENT-PRINCIPAL` header format is stable and
  well-documented

## 🏛️ WAF Pillar Analysis

| Pillar      | Impact | Notes                                                |
| ----------- | ------ | ---------------------------------------------------- |
| Security    | ↑↑     | No custom auth code = smaller attack surface         |
| Reliability | →      | Depends on App Service + GitHub availability         |
| Performance | →      | Negligible overhead — auth handled at platform level |
| Cost        | ↑      | Free feature, no additional service needed           |
| Operations  | ↑↑     | Zero auth code to maintain, patch, or audit          |

## 🔒 Compliance Considerations

- **CRITICAL**: Test GitHub OAuth immediately after first
  deployment. Enterprise subscriptions may block non-Entra ID
  providers via:
  - Conditional Access policies requiring Entra ID authentication
  - App Service built-in auth policies restricting identity providers
  - Network policies blocking GitHub OAuth endpoints
- If blocked, the fallback path is Entra ID with external
  identities (B2C or B2B collaboration) — this requires a
  new ADR and implementation work
- GitHub OAuth App must be registered in GitHub Developer
  Settings (not Azure) — ensure the GitHub organisation permits
  OAuth app creation

## 📝 Implementation Notes

- Register GitHub OAuth App at
  `https://github.com/settings/developers`
  - Homepage URL: `https://app-hackops-{env}-{suffix}.azurewebsites.net`
  - Callback URL: `https://app-hackops-{env}-{suffix}.azurewebsites.net/.auth/login/github/callback`
- Store Client ID and Client Secret in Key Vault
- Configure Easy Auth in Bicep via `authsettingsV2` resource:
  ```
  identityProviders.gitHub.registration.clientId
  identityProviders.gitHub.registration.clientSecretSettingName
  ```
- Application code parses `X-MS-CLIENT-PRINCIPAL` header:
  base64-decode → JSON → extract `userId`, `login`, `email`, `avatar`
- Dev auth bypass: Read `DEV_USER_ROLE` and `DEV_USER_ID` when
  `NODE_ENV=development` — enforce `NODE_ENV=production` in
  App Service app settings
