import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ChallengesAPI, ApiResponse } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { queryOne, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { updateChallengeSchema } from "@/lib/validation/challenge";

export const GET = requireRole(
  "admin",
  "coach",
  "hacker",
)(async (_request, context, _auth) => {
  const { id } = await context.params;

  const r = await queryOne<Record<string, unknown>>(
    "SELECT * FROM challenges WHERE id = @id",
    { id },
  );

  if (!r) {
    return NextResponse.json(
      { error: "Challenge not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

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

  const existing = await queryOne<Record<string, unknown>>(
    "SELECT * FROM challenges WHERE id = @id",
    { id },
  );

  if (!existing) {
    return NextResponse.json(
      { error: "Challenge not found", ok: false } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const hackathonId = existing.hackathonId as string;

  const setClauses: string[] = [];
  const params: Record<string, unknown> = { id };
  if (body.title !== undefined) {
    setClauses.push("title = @title");
    params.title = body.title;
  }
  if (body.description !== undefined) {
    setClauses.push("description = @description");
    params.description = body.description;
  }
  if (body.maxScore !== undefined) {
    setClauses.push("maxScore = @maxScore");
    params.maxScore = body.maxScore;
  }

  if (setClauses.length > 0) {
    await execute(
      `UPDATE challenges SET ${setClauses.join(", ")} WHERE id = @id`,
      params,
    );
  }

  await auditLog({
    hackathonId,
    action: "challenge.update",
    targetType: "challenge",
    targetId: id,
    performedBy: auth.principal.userId,
    details: body as Record<string, unknown>,
  });

  const updated = await queryOne<Record<string, unknown>>(
    "SELECT * FROM challenges WHERE id = @id",
    { id },
  );

  const record: ChallengesAPI.ChallengeRecord = {
    id: updated!.id as string,
    hackathonId: updated!.hackathonId as string,
    order: updated!.order as number,
    title: updated!.title as string,
    description: updated!.description as string,
    maxScore: updated!.maxScore as number,
    createdBy: updated!.createdBy as string,
    createdAt: updated!.createdAt as string,
  };

  const response: ApiResponse<ChallengesAPI.ChallengeRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
