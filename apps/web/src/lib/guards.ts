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

export interface AuthOnlyContext {
  principal: EasyAuthPrincipal;
}

type RouteContext = { params: Promise<Record<string, string>> };

type AuthenticatedHandler = (
  request: NextRequest,
  context: RouteContext,
  auth: AuthContext,
) => Promise<NextResponse>;

type AuthOnlyHandler = (
  request: NextRequest,
  context: RouteContext,
  auth: AuthOnlyContext,
) => Promise<NextResponse>;

type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

/**
 * Wraps a route handler to require authentication only (no role check).
 * Use for endpoints where hackathonId is not available (e.g. create hackathon, join).
 *
 * Usage: `export const POST = requireAuth(handler);`
 */
export function requireAuth(handler: AuthOnlyHandler): RouteHandler {
  return async (request, context) => {
    const principal = getAuthPrincipal(request.headers);
    if (!principal) {
      return NextResponse.json(
        { error: "Authentication required", ok: false },
        { status: 401 },
      );
    }
    return handler(request, context, { principal });
  };
}

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

/**
 * Performs an inline role check for handlers that resolve hackathonId
 * after resource lookup (when params.id is not a hackathon ID).
 * Returns the resolved role on success, or a 403 NextResponse on failure.
 */
export async function checkRole(
  principal: EasyAuthPrincipal,
  hackathonId: string,
  ...allowedRoles: UserRole[]
): Promise<{ role: UserRole } | NextResponse> {
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
  return { role };
}

async function extractHackathonId(
  request: NextRequest,
  context: RouteContext,
): Promise<string | null> {
  const params = await context.params;

  // Explicit [hackathonId] segment (e.g. /api/audit/[hackathonId])
  if (params.hackathonId) return params.hackathonId;

  // Query string — checked before params.id so routes with non-hackathon
  // [id] segments (submissions, roles, rubrics, etc.) can pass hackathonId
  const queryId = request.nextUrl.searchParams.get("hackathonId");
  if (queryId) return queryId;

  // Request body — for POST/PUT/PATCH
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    try {
      const body = await request.clone().json();
      if (typeof body.hackathonId === "string") return body.hackathonId;
    } catch {
      // Body is not JSON — hackathonId unavailable from body
    }
  }

  // Fallback: params.id — only correct for /api/hackathons/[id] routes
  if (params.id) return params.id;

  return null;
}
