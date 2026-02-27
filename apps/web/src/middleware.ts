import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "./lib/rate-limiter";

const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL ?? "",
  "http://localhost:3000",
]);

function addCorsHeaders(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-MS-CLIENT-PRINCIPAL",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // CORS preflight
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
  }

  // Skip non-API routes and the public health endpoint
  if (!pathname.startsWith("/api/") || pathname === "/api/health") {
    return NextResponse.next();
  }

  // Rate limiting: 5/min for /api/join, 100/min for everything else
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const isJoin = pathname === "/api/join";
  const key = isJoin ? `${ip}:join` : `${ip}:api`;
  const limit = isJoin ? 5 : 100;
  const rateResult = checkRateLimit(key, limit);

  if (!rateResult.allowed) {
    const res = NextResponse.json(
      { error: "Too many requests", ok: false },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(rateResult.retryAfterSeconds));
    return addCorsHeaders(res, origin);
  }

  // Auth check — reject unauthenticated callers
  const hasPrincipal = !!request.headers.get("x-ms-client-principal");
  const isDev = process.env.NODE_ENV === "development";
  const hasDevUser = !!process.env.DEV_USER_ID;

  if (!hasPrincipal && !(isDev && hasDevUser)) {
    const res = NextResponse.json(
      { error: "Authentication required", ok: false },
      { status: 401 },
    );
    return addCorsHeaders(res, origin);
  }

  const response = NextResponse.next();
  return addCorsHeaders(response, origin);
}

export const config = {
  matcher: "/api/:path*",
};
