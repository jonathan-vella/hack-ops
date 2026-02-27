import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ScoresAPI, ApiResponse, CategoryScore } from "@hackops/shared";
import { requireRole } from "@/lib/guards";
import { getContainer } from "@/lib/cosmos";
import { auditLog } from "@/lib/audit";
import { overrideScoreSchema } from "@/lib/validation/score";

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
  const container = getContainer("scores");

  // Cross-partition query to find the score record
  const { resources: scores } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c._type = 'score'",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll();

  if (scores.length === 0) {
    return NextResponse.json(
      {
        error: "Score record not found",
        ok: false,
      } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const score = scores[0];

  // Validate scores against the active rubric
  const rubricsContainer = getContainer("rubrics");
  const pointerId = `rubric-ptr-${score.hackathonId}`;
  const { resource: pointer } = await rubricsContainer
    .item(pointerId, pointerId)
    .read();

  if (pointer) {
    const { resource: rubric } = await rubricsContainer
      .item(pointer.activeRubricId, pointer.activeRubricId)
      .read();

    if (rubric) {
      const categories = rubric.categories as Array<{
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
  const originalScores = score.categoryScores as CategoryScore[];
  const originalTotal = score.total as number;

  const newTotal = body.categoryScores.reduce(
    (sum: number, s: CategoryScore) => sum + s.score,
    0,
  );

  const updatedScore = {
    ...score,
    categoryScores: body.categoryScores,
    total: newTotal,
    overriddenBy: auth.principal.userId,
    overriddenAt: now,
    overrideReason: body.reason,
  };

  await container.item(id, score.teamId).replace(updatedScore);

  await auditLog({
    hackathonId: score.hackathonId,
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
    id: updatedScore.id,
    teamId: updatedScore.teamId,
    hackathonId: updatedScore.hackathonId,
    challengeId: updatedScore.challengeId,
    submissionId: updatedScore.submissionId,
    categoryScores: body.categoryScores,
    total: newTotal,
    approvedBy: updatedScore.approvedBy,
    approvedAt: updatedScore.approvedAt,
  };

  const response: ApiResponse<ScoresAPI.ScoreRecord> = {
    data: record,
    ok: true,
  };
  return NextResponse.json(response);
});
