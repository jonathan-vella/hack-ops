import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ChallengesAPI, ApiResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";
import { updateChallengeSchema } from "@/lib/validation/challenge";

export const GET = requireRole(
  "admin",
  "coach",
  "hacker",
)(async (_request, context, _auth) => {
  const { id } = await context.params;
  const container = getContainer("challenges");

  // Cross-partition query since we don't have hackathonId in the URL
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c._type = 'challenge'",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll();

  if (resources.length === 0) {
    return NextResponse.json(
      { error: "Challenge not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const r = resources[0] as Record<string, unknown>;
  const record: ChallengesAPI.ChallengeRecord = {
    id: r.id as string,
    hackathonId: r.hackathonId as string,
    order: r.order as number,
    title: r.title as string,
    description: r.description as string,
    maxScore: r.maxScore as number,
    createdBy: r.createdBy as string,
    createdAt: r.createdAt as string,
  };

  const response: ApiResponse<ChallengesAPI.ChallengeRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});

export const PATCH = requireRole("admin")(async (
  request: NextRequest,
  context,
  auth,
) => {
  const { id } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", ok: false },
      { status: 400 },
    );
  }

  const result = updateChallengeSchema.safeParse(raw);
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

  const body = result.data;
  const container = getContainer("challenges");

  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c._type = 'challenge'",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll();

  if (resources.length === 0) {
    return NextResponse.json(
      { error: "Challenge not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const existing = resources[0];
  const hackathonId = existing.hackathonId as string;

  const updated = {
    ...existing,
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.maxScore !== undefined && { maxScore: body.maxScore }),
  };

  await container.item(id, hackathonId).replace(updated);

  await auditLog({
    hackathonId,
    action: "challenge.update",
    targetType: "challenge",
    targetId: id,
    performedBy: auth.principal.userId,
    details: body as Record<string, unknown>,
  });

  const record: ChallengesAPI.ChallengeRecord = {
    id: updated.id as string,
    hackathonId: updated.hackathonId as string,
    order: updated.order as number,
    title: updated.title as string,
    description: updated.description as string,
    maxScore: updated.maxScore as number,
    createdBy: updated.createdBy as string,
    createdAt: updated.createdAt as string,
  };

  const response: ApiResponse<ChallengesAPI.ChallengeRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
