import type { EasyAuthPrincipal } from "@hackops/shared";

/**
 * Parse Easy Auth headers injected by Azure App Service.
 * In development, falls back to DEV_USER_* environment variables.
 * Full implementation in app-02-auth.
 */
export function getAuthPrincipal(
  headers: Headers,
): EasyAuthPrincipal | null {
  const principal = headers.get("x-ms-client-principal");

  if (principal) {
    const decoded = JSON.parse(
      Buffer.from(principal, "base64").toString("utf-8"),
    );
    const claims = decoded.claims as Array<{ typ: string; val: string }>;
    const getClaim = (typ: string) =>
      claims.find((c) => c.typ.endsWith(typ))?.val ?? "";

    return {
      userId: getClaim("nameidentifier"),
      githubLogin: getClaim("/name"),
      email: getClaim("emailaddress"),
      avatarUrl: getClaim("avatar_url"),
    };
  }

  // Dev fallback
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
