import type { EasyAuthPrincipal } from "@hackops/shared";

function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_BYPASS_ENABLED === "true"
  );
}

/**
 * Parse Easy Auth headers injected by Azure App Service.
 * In development with DEV_AUTH_BYPASS_ENABLED=true, falls back to DEV_USER_* env vars.
 *
 * SEC-001: Validates the x-ms-client-principal-idp companion header to confirm
 * the identity was injected by App Service Easy Auth rather than forged.
 * SEC-008: Dev bypass requires explicit DEV_AUTH_BYPASS_ENABLED=true guard.
 */
export function getAuthPrincipal(headers: Headers): EasyAuthPrincipal | null {
  const principal = headers.get("x-ms-client-principal");

  if (principal) {
    // SEC-001: Verify provenance — App Service always sets the IDP header
    const idp = headers.get("x-ms-client-principal-idp");
    if (!idp && process.env.NODE_ENV === "production") {
      return null;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(principal, "base64").toString("utf-8"),
      );
      const claims = decoded.claims as Array<{ typ: string; val: string }>;
      if (!Array.isArray(claims)) return null;

      const getClaim = (typ: string) =>
        claims.find((c) => c.typ.endsWith(typ))?.val ?? "";

      const userId = getClaim("nameidentifier");
      if (!userId) return null;

      return {
        userId,
        githubLogin: getClaim("/name"),
        email: getClaim("emailaddress"),
        avatarUrl: getClaim("avatar_url"),
      };
    } catch {
      return null;
    }
  }

  // SEC-008: Dev bypass only when explicitly enabled
  if (isDevBypassEnabled() && process.env.DEV_USER_ID) {
    return {
      userId: process.env.DEV_USER_ID,
      githubLogin: process.env.DEV_USER_LOGIN ?? "dev-user",
      email: process.env.DEV_USER_EMAIL ?? "dev@example.com",
      avatarUrl: "",
    };
  }

  return null;
}

export type { EasyAuthPrincipal };
