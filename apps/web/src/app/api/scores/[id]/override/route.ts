import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ScoresAPI, ApiResponse, CategoryScore } from "@hackops/shared";
import { requireAuth, checkRole } from "@/lib/guards";
import { queryOne, execute } from "@/lib/sql";
import { auditLog } from "@/lib/audit";
import { overrideScoreSchema } from "@/lib/validation/score";

export const PATCH = requireAuth(async (
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

  const result = overrideScoreSchema.safeParse(raw);
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

  // Look up resource first — params.id is a score ID, not a hackathonId
  const score = await queryOne<Record<string, unknown>>(
    "SELECT * FROM scores WHERE id = @id",
    { id },
  );

  if (!score) {
    return NextResponse.json(
      {
        error: "Score record not found",
        ok: false,
      } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  // Role check using the score's hackathonId
  const roleCheck = await checkRole(
    auth.principal,
    score.hackathonId as string,
    "admin",
  );
  if (roleCheck instanceof NextResponse) return roleCheck;

  // Validate scores against the active rubric
  const pointerId = `rubric-ptr-${score.hackathonId as string}`;
  const pointer = await queryOne<{ activeRubricId: string }>(
    "SELECT activeRubricId FROM rubric_pointers WHERE id = @id",
    { id: pointerId },
  );

  if (pointer) {
    const rubric = await queryOne<{ categories: string }>(
      "SELECT categories FROM rubric_versions WHERE id = @id",
      { id: pointer.activeRubricId },
    );

    if (rubric) {
      const categories = JSON.parse(rubric.categories) as Array<{
        id: string;
        maxScore: number;
      }>;
      for (const scoreEntry of body.categoryScores) {
        const category = categories.find((c) => c.id === scoreEntry.categoryId);
        if (!category) {
          return NextResponse.json(
            {
              error: `Unknown rubric category: ${scoreEntry.categoryId}`,
              ok: false,
            },
            { status: 400 },
          );
        }
        if (scoreEntry.score > category.maxScore) {
          return NextResponse.json(
            {
              error: `Score ${scoreEntry.score} exceeds max ${category.maxScore} for category ${scoreEntry.categoryId}`,
              ok: false,
            },
            { status: 400 },
          );
        }
      }
    }
  }

  const now = new Date().toISOString();

  // Preserve original scores in audit trail before overriding
  const originalScores = JSON.parse(
    score.categoryScores as string,
  ) as CategoryScore[];
  const originalTotal = score.total as number;

  const newTotal = body.categoryScores.reduce(
    (sum: number, s: CategoryScore) => sum + s.score,
    0,
  );

  await execute(
    `UPDATE scores
     SET categoryScores = @categoryScores, total = @total, overriddenBy = @overriddenBy, overriddenAt = @overriddenAt, overrideReason = @overrideReason
     WHERE id = @id`,
    {
      categoryScores: JSON.stringify(body.categoryScores),
      total: newTotal,
      overriddenBy: auth.principal.userId,
      overriddenAt: now,
      overrideReason: body.reason,
      id,
    },
  );

  await auditLog({
    hackathonId: score.hackathonId as string,
    action: "score.override",
    targetType: "score",
    targetId: id,
    performedBy: auth.principal.userId,
    reason: body.reason,
    details: {
      originalScores,
      originalTotal,
      newScores: body.categoryScores,
      newTotal,
      teamId: score.teamId,
    },
  });

  const record: ScoresAPI.ScoreRecord = {
    id: score.id as string,
    teamId: score.teamId as string,
    hackathonId: score.hackathonId as string,
    challengeId: score.challengeId as string,
    submissionId: score.submissionId as string,
    categoryScores: body.categoryScores,
    total: newTotal,
    approvedBy: score.approvedBy as string,
    approvedAt: score.approvedAt as string,
  };

  const response: ApiResponse<ScoresAPI.ScoreRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
