import type { EasyAuthPrincipal } from "@hackops/shared";

/**
 * Parse Easy Auth headers injected by Azure App Service.
 * In development, falls back to DEV_USER_* environment variables.
 */
export function getAuthPrincipal(
  headers: Headers,
): EasyAuthPrincipal | null {
  const principal = headers.get("x-ms-client-principal");

  if (principal) {
    try {
      const decoded = JSON.parse(
        Buffer.from(principal, "base64").toString("utf-8"),
      );
      const claims = decoded.claims as Array<{ typ: string; val: string }>;
      if (!Array.isArray(claims)) return null;

      const getClaim = (typ: string) =>
        claims.find((c) => c.typ.endsWith(typ))?.val ?? "";

      return {
        userId: getClaim("nameidentifier"),
        githubLogin: getClaim("/name"),
        email: getClaim("emailaddress"),
        avatarUrl: getClaim("avatar_url"),
      };
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV === "development" && process.env.DEV_USER_ID) {
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
