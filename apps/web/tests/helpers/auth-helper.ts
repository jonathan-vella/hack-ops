/**
 * Auth simulation helpers for Playwright E2E tests.
 * Generates x-ms-client-principal headers matching Easy Auth format.
 */
import type { Page, APIRequestContext } from "@playwright/test";
import { ADMIN_USER_ID, COACH_USER_ID, HACKER_USER_ID } from "../fixtures";

export type TestRole = "admin" | "coach" | "hacker";

interface PrincipalPayload {
  userId: string;
  identityProvider: string;
  userDetails: string;
  userRoles: string[];
  claims: Array<{ typ: string; val: string }>;
}

const PERSONAS: Record<TestRole, PrincipalPayload> = {
  admin: {
    userId: ADMIN_USER_ID,
    identityProvider: "github",
    userDetails: "jonathan-admin",
    userRoles: ["authenticated"],
    claims: [
      {
        typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
        val: ADMIN_USER_ID,
      },
      {
        typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        val: "jonathan-admin",
      },
      {
        typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        val: "admin@example.com",
      },
      {
        typ: "avatar_url",
        val: "https://avatars.githubusercontent.com/u/12345678",
      },
    ],
  },
  coach: {
    userId: COACH_USER_ID,
    identityProvider: "github",
    userDetails: "coach-sarah",
    userRoles: ["authenticated"],
    claims: [
      {
        typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
        val: COACH_USER_ID,
      },
      {
        typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        val: "coach-sarah",
      },
      {
        typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        val: "coach@example.com",
      },
      {
        typ: "avatar_url",
        val: "https://avatars.githubusercontent.com/u/11111111",
      },
    ],
  },
  hacker: {
    userId: HACKER_USER_ID,
    identityProvider: "github",
    userDetails: "alice-dev",
    userRoles: ["authenticated"],
    claims: [
      {
        typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
        val: HACKER_USER_ID,
      },
      {
        typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        val: "alice-dev",
      },
      {
        typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        val: "alice@example.com",
      },
      {
        typ: "avatar_url",
        val: "https://avatars.githubusercontent.com/u/87654321",
      },
    ],
  },
};

/** Encode a principal payload to base64 for the x-ms-client-principal header. */
export function createAuthHeader(
  role: TestRole,
  overrides?: Partial<PrincipalPayload>,
): string {
  const persona = { ...PERSONAS[role], ...overrides };
  return Buffer.from(JSON.stringify(persona)).toString("base64");
}

/** Pre-built principal header values per role. */
export const ADMIN_PRINCIPAL = createAuthHeader("admin");
export const COACH_PRINCIPAL = createAuthHeader("coach");
export const HACKER_PRINCIPAL = createAuthHeader("hacker");

/**
 * Intercept all requests from a Playwright Page and inject the
 * Easy Auth header for the specified role.
 */
export async function withAuth(page: Page, role: TestRole): Promise<void> {
  const headerValue = createAuthHeader(role);
  await page.route("**/*", async (route) => {
    const headers = {
      ...route.request().headers(),
      "x-ms-client-principal": headerValue,
    };
    await route.continue({ headers });
  });
}

/** Extra headers object for use with page.request or APIRequestContext. */
export function authHeaders(role: TestRole): Record<string, string> {
  return { "x-ms-client-principal": createAuthHeader(role) };
}
