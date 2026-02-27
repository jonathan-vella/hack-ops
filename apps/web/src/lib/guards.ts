import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole, EasyAuthPrincipal } from "@hackops/shared";
import { getAuthPrincipal } from "./auth";
import { resolveRole, getDevRole, isPrimaryAdmin } from "./roles";

export interface AuthContext {
  principal: EasyAuthPrincipal;
  role: UserRole;
  hackathonId: string;
}

type RouteContext = { params: Promise<Record<string, string>> };

type AuthenticatedHandler = (
  request: NextRequest,
  context: RouteContext,
  auth: AuthContext,
) => Promise<NextResponse>;

type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

/**
 * Wraps a route handler to enforce role-based access.
 * Extracts hackathonId from route params, query string, or request body.
 *
 * Usage: `export const POST = requireRole("admin", "coach")(handler);`
 */
export function requireRole(
  ...allowedRoles: UserRole[]
): (handler: AuthenticatedHandler) => RouteHandler {
  return (handler) => async (request, context) => {
    const principal = getAuthPrincipal(request.headers);
    if (!principal) {
      return NextResponse.json(
        { error: "Authentication required", ok: false },
        { status: 401 },
      );
    }

    const hackathonId = await extractHackathonId(request, context);
    if (!hackathonId) {
      return NextResponse.json(
        { error: "hackathonId is required for role resolution", ok: false },
        { status: 400 },
      );
    }

    const role =
      getDevRole() ?? (await resolveRole(principal.userId, hackathonId));
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
          ok: false,
        },
        { status: 403 },
      );
    }

    return handler(request, context, { principal, role, hackathonId });
  };
}

/**
 * Rejects any attempt to demote or remove the primary admin.
 * Call before role changes or user removal. Returns a 403 response
 * if the target user is the primary admin; null otherwise.
 */
export async function protectPrimaryAdmin(
  targetUserId: string,
  hackathonId: string,
): Promise<NextResponse | null> {
  const isProtected = await isPrimaryAdmin(targetUserId, hackathonId);
  if (isProtected) {
    return NextResponse.json(
      { error: "Cannot modify the primary admin", ok: false },
      { status: 403 },
    );
  }
  return null;
}

async function extractHackathonId(
  request: NextRequest,
  context: RouteContext,
): Promise<string | null> {
  const params = await context.params;
  if (params.hackathonId) return params.hackathonId;
  if (params.id) return params.id;

  const queryId = request.nextUrl.searchParams.get("hackathonId");
  if (queryId) return queryId;

  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    try {
      const body = await request.clone().json();
      if (typeof body.hackathonId === "string") return body.hackathonId;
    } catch {
      // Body is not JSON — hackathonId unavailable from body
    }
  }

  return null;
}
