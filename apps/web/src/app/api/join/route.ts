import { NextResponse } from "next/server";
import type { JoinAPI, ApiResponse } from "@hackops/shared";
import { requireAuth } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limiter";
import { joinSchema } from "@/lib/validation/join";

export const POST = requireAuth(async (request, _context, auth) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const rl = checkRateLimit(`${ip}:join`, 5);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many join attempts. Try again later.", ok: false },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", ok: false },
      { status: 400 },
    );
  }

  const result = joinSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: result.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
        ok: false,
      },
      { status: 400 },
    );
  }

  const { eventCode } = result.data;
  const hackathonsContainer = getContainer("hackathons");

  const { resources: hackathons } = await hackathonsContainer.items
    .query({
      query:
        "SELECT * FROM c WHERE c.eventCode = @code AND c.status = 'active'",
      parameters: [{ name: "@code", value: eventCode }],
    })
    .fetchAll();

  if (hackathons.length === 0) {
    return NextResponse.json(
      { error: "Invalid or expired event code", ok: false },
      { status: 404 },
    );
  }

  const hackathon = hackathons[0];
  const hackersContainer = getContainer("hackers");

  const { resources: existing } = await hackersContainer.items
    .query({
      query:
        "SELECT c.id FROM c WHERE c.githubUserId = @uid AND c.hackathonId = @hid",
      parameters: [
        { name: "@uid", value: auth.principal.userId },
        { name: "@hid", value: hackathon.id },
      ],
    })
    .fetchAll();

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Already joined this hackathon", ok: false },
      { status: 409 },
    );
  }

  const hackerId = `hkr-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  await hackersContainer.items.create({
    id: hackerId,
    _type: "hacker",
    hackathonId: hackathon.id,
    githubUserId: auth.principal.userId,
    githubLogin: auth.principal.githubLogin,
    displayName: auth.principal.githubLogin,
    email: auth.principal.email,
    avatarUrl: auth.principal.avatarUrl,
    eventCode,
    teamId: null,
    joinedAt: now,
  });

  const rolesContainer = getContainer("roles");
  await rolesContainer.items.create({
    id: `role-${auth.principal.userId}-${hackathon.id}`,
    _type: "role",
    hackathonId: hackathon.id,
    githubUserId: auth.principal.userId,
    githubLogin: auth.principal.githubLogin,
    role: "hacker",
    isPrimaryAdmin: false,
    assignedBy: "system",
    assignedAt: now,
  });

  await auditLog({
    hackathonId: hackathon.id,
    action: "hacker.join",
    targetType: "hacker",
    targetId: hackerId,
    performedBy: auth.principal.userId,
  });

  const responseData: JoinAPI.JoinResponse = {
    hackerId,
    hackathonId: hackathon.id,
    hackathonName: hackathon.name,
  };

  const response: ApiResponse<JoinAPI.JoinResponse> = {
    data: responseData,
    ok: true,
  };
  return NextResponse.json(response, { status: 201 });
});